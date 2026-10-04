import { CFG } from './cfg.js';
import { selfUid } from './ui.js';
import { stat } from './dbg.js';
import { FeedStore } from './feedstore.js';
import { scroller, slideAt, watchTarget } from './state.js';
import {
  buildHistoryEnvelope, buildHistoryParams, ledgerDelete, ledgerMax, ledgerReported,
  ledgerSnapshot, reconcileLedger
} from './watchledger.js';

// 观看历史上报：离开（划走/暂停/播完/关页）时把最终进度计入 A 站观看记录。触发点与
// 官方 video 页事件流对齐（0.9.86 实测：官方纯事件驱动——暂停报当前位/播完报整段/
// 离开时报，无心跳无定时器），页内走官方 weblog SDK 队列（线上字节形态与原生不可分），
// 关页走官方同款 sendBeacon 直发（0.9.87，同端点同信封）。
// playedSeconds 即停止位置，历史/续播按真实进度显示；进度低于 watchReportMin 的闪滑
// 误触不入历史。同一条目允许多次上报（进度更新语义）：watchSentAt 记最后上报秒位，
// 进度未推进的重复触发（播完后的连播 dispose、切标签往返）不重发。
// 单调性不对称（0.9.86 官方对齐实测）：live 路径镜像官方语义——暂停/离开即报当前位，
// 用户重看回退时历史同样回退（官方自己也这样）；单调守卫只用于持久账本补报（watchledger
// reconcile，那是无用户意图的死会话，补低值会把手前的历史改回去）。**不要把 live 路径
// "修"成单调的**
var watchSentAt = {};

function hostWeblog() {
  var w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  return w.weblog || null;
}

export function reportLeave(session, video, via, sec, retryN) {
  var item = session && session.item;
  // video 仅在秒位需现场读取时必需（账本补报带显式 sec，video 已随死会话消失）
  if (!item || !item.cap || !item.cap.watchReport || !item.videoId) return;
  if (!video && typeof sec !== 'number') return;
  if (typeof sec !== 'number') sec = Math.floor(video.currentTime || 0);
  if (sec < CFG.time.watchReportMin) return;
  var key = item.id + ':' + item.videoId;
  if (watchSentAt[key] === sec) return;
  try {
    var wl = hostWeblog();
    if (!wl || !wl.impr || !wl.sendImmediately) {
      // 官方脚本未就绪：页面存活路径隔 1s 短重试（上限 3 次）；关页路径重试无意义
      if (via !== 'pagehide' && (retryN || 0) < 3) {
        setTimeout(function () {
          reportLeave(session, video, via, sec, (retryN || 0) + 1);
        }, 1000);
      }
      return;
    }
    wl.sendImmediately('CLICK', {
      action: 'CLIENT_BROWSE_HISTORY',
      params: buildHistoryParams(item, sec,
        wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
        wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined)
    });
    // 乐观水位：sendImmediately 是 fire-and-forget，网络层失败不可感知。这里记"已报"
    // 只代表 SDK 队列收了——真丢了由下一次离开事件按推进后的秒位天然愈合（进度语义允许），
    // 不是 bug，别在这里加"确认送达"机制
    watchSentAt[key] = sec;
    ledgerReported(key, sec, Date.now());
    stat('report-watch');
  } catch (e) { stat('report-watch-err'); }
}

// 当前待报目标：播放层优先（0.9.86）——层内 slide 不在竖刷流里，slideAt(FeedStore.current)
// 永远查不到它（dataset.ovl='1'）。层内开着只取层内会话，**不回落竖刷**（背后是暂停的旧条，
// 报它=幽灵进度），与 videoTarget 同纪律；无层回落竖刷当前条
function pickTarget() {
  var tf = watchTarget();
  var wt = tf && tf(); // 钩子返回"取层内会话"的函数，须二次调用（playback.js videoTarget 同 idiom）
  if (wt && wt.session) return wt;
  if (!scroller || FeedStore.current < 0) return null;
  var s = slideAt(FeedStore.current);
  return s && s._session ? { session: s._session, video: s._session.video } : null;
}

// 切走标签（页面存活）：走 SDK 队列补报当前会话最终进度
export function reportLeaveCurrent(via) {
  try {
    var t = pickTarget();
    if (t) reportLeave(t.session, t.video, via);
  } catch (e) { }
}

// ---------- 官方 klog 信封嗅探（0.9.87；时序实测 2026-10-03 入档 api-research §4.6） ----------
// 时序实测：官方 SDK 是页面静态脚本（原始 HTML 携带 script 标签，首页实测 243ms 开始
// 加载），且**启动批** flush 早于 document-end（首页实测首两批 411/507ms，DCL=1269ms）
// ——@run-at document-end 的本包装**必然漏掉启动批**，自 DCL 后首批（实测 ~2.3s）起才
// 进缓存。这不伤「关页时新鲜 common 必有」承诺：可上报进度下限是 watchReportMin=3s 的
// 观看，必然晚于缓存就绪；flush 节奏随后续活动每 2-8s 一批持续刷新（静置页首批可迟至
// ~35s，但上报场景必有活动）。此前关页无缓存 → 回落 SDK 队列路径（pagehide 处理器）。
// 要全捕启动批须 @run-at document-start（全局 boot 时序变更，实测在案、未采纳）。
// cacheEnvelope 解析完成才整体覆盖缓存——Blob body 是异步读，不用同步占位（防半个信封）
var beaconCache = null; // { url, common, tpl, inc }——官方 misc2 批的最新一份
(function sniffBeacon() {
  try {
    var nb = navigator.sendBeacon;
    if (typeof nb !== 'function') return;
    navigator.sendBeacon = function (url, body) {
      try {
        if (String(url).indexOf('/log/collect/misc2') >= 0) cacheEnvelope(url, body);
      } catch (e) { }
      return nb.apply(navigator, arguments);
    };
  } catch (e) { }
})();

function cacheEnvelope(url, body) {
  var parse = function (txt) {
    var env = JSON.parse(txt);
    var common = env && env.common;
    var logs = (env && env.logs) || [];
    if (!common || !logs.length) return;
    var tpl = null, inc = 0;
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var ep = l && l.event_package && l.event_package.task_event &&
        l.event_package.task_event.element_package;
      if (ep && ep.action) {
        if (!tpl) tpl = l;
        if (Number(l.client_increment_id) > inc) inc = Number(l.client_increment_id);
      }
    }
    if (!tpl) return;
    beaconCache = { url: String(url), common: common, tpl: tpl, inc: inc };
  };
  if (typeof body === 'string') {
    try { parse(body); } catch (e) { }
    return;
  }
  if (body && typeof body.text === 'function') {
    body.text().then(function (t) { try { parse(t); } catch (e) { } }, function () { });
  }
}

// ---------- 关页直发（官方同款卸载形态） ----------
// 实测官方 SDK 批量 flush 本就走 navigator.sendBeacon 到 misc2；SDK 队列在卸载期不 flush
// （0.9.2 真机实测「pagehide 送不出去」的根因），所以关页时绕开队列、用嗅探到的官方信封
// 骨架直发同端点同格式——线上形态与官方自己的卸载 flush 不可分。无嗅探缓存（<3s 关页
// 窄窗，官方还没 flush 过第一批）才回落 SDK 队列路径：极低频、损失一条，接受。
function sendHistoryBeacon(item, sec) {
  var wl = hostWeblog();
  var env = buildHistoryEnvelope(beaconCache, item, sec,
    wl && wl.impr && wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
    wl && wl.impr && wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined,
    Date.now());
  if (!env) return false;
  try {
    // 回环：这次直发会被嗅探包截获解析——inc 随之推进，续号连续性天然保持
    if (!navigator.sendBeacon(env.url, env.body)) return false;
  } catch (e) { return false; }
  return true;
}

window.addEventListener('pagehide', function () {
  try {
    var t = pickTarget();
    var item = t && t.session && t.session.item;
    if (!item || !item.cap || !item.cap.watchReport || !item.videoId) return;
    var sec = t.video ? Math.floor(t.video.currentTime || 0) : 0;
    if (sec < CFG.time.watchReportMin) return;
    var key = item.id + ':' + item.videoId;
    if (watchSentAt[key] === sec) return; // 已报同一秒位
    if (sendHistoryBeacon(item, sec)) {
      watchSentAt[key] = sec;
      ledgerReported(key, sec, Date.now());
      stat('report-watch-beacon');
    } else {
      reportLeave(t.session, t.video, 'pagehide', sec); // 回落：SDK 队列（卸载期可能丢失）
    }
  } catch (e) { }
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) reportLeaveCurrent('hidden');
});

// ---------- 播放中账本落盘（崩溃/断电/强杀出口的唯一补报依据） ----------
// onTime 高频驱动，节流到 CFG.time.watchLedgerFlush（误差上界=落盘间隔，纯本地写代价可忽略）。
// 只推 maxSec 水位、不动 reportedSec——重看回退不污染水位（补报单调守卫的输入）
var lastMarkAt = {};
export function markWatchProgress(session, video) {
  var item = session && session.item;
  if (!item || !item.cap || !item.cap.watchReport || !item.videoId || !video) return;
  var sec = Math.floor(video.currentTime || 0);
  if (sec < CFG.time.watchReportMin) return;
  var key = item.id + ':' + item.videoId;
  var now = Date.now();
  if (now - (lastMarkAt[key] || 0) < CFG.time.watchLedgerFlush) return;
  lastMarkAt[key] = now;
  ledgerMax(key, sec, now);
}

// ---------- 启动补报（崩溃路径对账） ----------
// 页面级新鲜加载=重启语义：读账本 → reconcile 出差量 → weblog 就绪后按官方事件形态补发
// （playedSeconds=maxSec）→ 清账。req_id 用当期 impression 而非观看当期——落库不受影响
// （服务器 browseTime 采信 client_timestamp，实测 0ms 误差），归因漂移可接受。放弃重试时
// 条目留账：期间同条目的新观看会推进水位，下个会话再对。
var replayTries = 0;
function replayWatchLedger() {
  try {
    var wl = hostWeblog();
    if (!wl || !wl.impr || !wl.sendImmediately) {
      if (++replayTries <= 5) setTimeout(replayWatchLedger, 1000);
      return;
    }
    var rec = reconcileLedger(ledgerSnapshot(), Date.now());
    for (var i = 0; i < rec.replay.length; i++) {
      var r = rec.replay[i];
      var item = { id: r.id, videoId: r.videoId, cap: { watchReport: true } };
      var key = r.id + ':' + r.videoId;
      wl.sendImmediately('CLICK', {
        action: 'CLIENT_BROWSE_HISTORY',
        params: buildHistoryParams(item, r.sec,
          wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
          wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined)
      });
      watchSentAt[key] = r.sec; // 页内去重同步：随后的 live 触发按推进后秒位正常发
      ledgerDelete(key); // 账平即清
      stat('report-watch-replay');
    }
  } catch (e) { stat('report-watch-err'); }
}
setTimeout(replayWatchLedger, 2000);

// ---------- 分享上报 CHOOSE_SHARE_PLATFORM（0.9.145；真机抓包对齐） ----------
// 用户实报「点击分享不会上报」。**官方口径实测**（2026-10-05 内置浏览器登录态 /v/ac26640967，
// 全网络间谍：fetch/XHR/sendBeacon/Image 全部留档）：
//   · 上报时机 = 分享面板里**选平台那一刻**（点开面板本身**不上报**，每个面板只发一条）；
//   · 通道 = 与观看历史**同一条**：`weblog.sendImmediately('CLICK', {action, params})`
//     → misc2 批量落 `log-sdk.ksapisrv.com/rest/wd/common/log/collect/misc2`（无专用分享端点）；
//   · 动态页 /moment/am* **压根不加载 weblog SDK**（实测 hasWeblog=false）⇒ 官方动态分享无上报通道。
// 参数实测全量（复制链接 / 微博 两次采样，除 to_platform 外逐字相同）：
//   req_id/group_id = impr.getCurrentReqID/getCurrentGroupID（页面 impr 会话 id，reportLeave 同源）
//   atom_id=videoId、content_id=videoId、ac_id=acId、parent_content_id=acId、album_id="0"、
//   resourceType="video"、cont_type/content_type="douga_atom"、content_episode=1、title、
//   share_id=当前登录 uid、share_type="link"（两采样恒定）、to_platform∈{COPY_LINK, WEIBO}（实测枚举）。
// 本脚本落点：面板「复制链接」→ 'COPY_LINK'（官方同形）；私信发送成功 → 'IM'
// **（'IM' 是自创枚举：官方无“私信分享”路径、实测枚举里没有它——登记在册，站方若给正式
// 标签只改此一处）**。**非视频条目（动态/文章）不上报**：官方动态页无此通道、动态的
// content_type 形状未实测 ⇒ 宁可空白不可编造（官方参数里 atom_id/ac_id 是两个不同 id，
// 拿 acId 冒充 atom_id 就是假数据）。
// 纯函数（单测直采）：非视频/未解析条目（无 videoId）回 null = 不上报
export function buildShareParams(item, toPlatform, reqId, groupId) {
  var acId = item && item.id;
  var vid = item && item.videoId;
  if (!acId || !vid || !toPlatform) return null;
  return {
    req_id: reqId,
    group_id: groupId,
    atom_id: String(vid),
    ac_id: String(acId),
    album_id: '0',
    resourceType: 'video',
    cont_type: 'douga_atom',
    content_type: 'douga_atom',
    content_id: String(vid),
    parent_content_id: String(acId),
    content_episode: 1,
    title: String(item.title || ''),
    share_id: selfUid(),
    share_type: 'link',
    to_platform: toPlatform
  };
}

// 分享上报入口（面板「复制链接」/私信发送成功）。SDK 未就绪同 reportLeave：
// 隔 1s 短重试（上限 3 次）；非视频条目直接返回 false（不重试，见上注）
export function reportShare(item, toPlatform, retryN) {
  try {
    var wl = hostWeblog();
    if (!wl || !wl.sendImmediately) {
      if ((retryN || 0) < 3) {
        setTimeout(function () { reportShare(item, toPlatform, (retryN || 0) + 1); }, 1000);
      }
      return false;
    }
    var params = buildShareParams(item, toPlatform,
      wl.impr && wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
      wl.impr && wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined);
    if (!params) return false;
    wl.sendImmediately('CLICK', { action: 'CHOOSE_SHARE_PLATFORM', params: params });
    stat('report-share');
    return true;
  } catch (e) { stat('report-share-err'); return false; }
}
