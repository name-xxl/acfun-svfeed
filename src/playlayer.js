import { CFG } from './cfg.js';
import { spinner, toast } from './ui.js';
import { errBox } from './errbox.js';
import { bindLayerGestures } from './playgest.js'; // 层内滑动手势（0.9.184 自本模块拆出）
import { parseRoute } from './route.js';
import { API } from './api.js';
import { playItemOf } from './playitem.js';
import { setItemOpener } from './cards.js';
import { registerView } from './viewreg.js';
import { setVideoTarget, setWatchTarget, setPlayItem, setOvlNoNext, OVL_IDX } from './state.js';
import { buildSlide } from './slide.js';
import { attachVideo, detachSession } from './attach.js';
import { batch as relatedBatch, seed, setLayerHost, setLayerOpener } from './relatedapi.js';
import { followComments, isOpenComments, openComments } from './comments.js';
import {
  setLevelIO, applyCtx, enterLayer as enterLayerState, step as levelStep,
  escape as escapeCore, pushLevel, pickInLevel, isSingle, resetAll, debugState,
  curItemOf, setCurItem, canBack, currentSession
} from './levelstack.js'; // 级别栈/会话/步进核（0.9.209 自本模块拆出，环境触面经 setLevelIO 注入）
import { relDrawerShowList, relDrawerSyncList, relDrawerHideList, relDrawerListMode } from './reldrawer.js'; // 列表播放器抽屉（0.9.174/175）
import { testHook } from './dbg.js';

// ---------- 播放层（0.9.74）：列表条目就地播放，不再插队尾 + 跳回竖刷 ----------
// 契约与理由（详见 README 0.9.74）：
//  - 形态=子视图 play（复用 0.9.62 视图框架 + 0.9.74 深界面/来源保活）：不另开浮层宿主——
//    z 档（视图 55）、共享顶栏、dock、Esc 栈、抽屉避让全部免费；地址栏深链由
//    parseRoute().view 守卫天然免疫 syncHash 回写（0.9.62/0.9.72 同型坑）
//  - 条目真源=地址栏：#svfeed/play/<v|a>/<id>（复用 0.9.72 来源标记）。**不 setSource**：
//    播放解析链走 appapi（douga/playInfo），与竖刷内容源无关，不写源记忆
//  - 点击路径把面板条目暂存出"即时首帧"（标题/封面/作者来自面板契约的 up），解析回包由
//    既有 onHomeResolved 补计数；深链/刷新直达无暂存 → 先 API.deepLink 拿标题封面再建
//    （0.9.82：面板→播放的转换下沉为 playItemOf 纯函数——原来这层桥躺在本文件里，
//     要 DOM 依赖、不可单测，且只认榜单的 up，是搜索/收藏/历史入口显示'未知用户'的病灶）
//  - slide 不在竖刷流里：标记 slide.dataset.ovl='1' 是唯一判据，idx 用 state.OVL_IDX 哨兵
//    （0.9.78 起哨兵与读出函数 state.isOvlSlide/ownerIdxOf 同源）。触面守卫清单（改共享导出
//    形状必须 grep 全消费点，见 attach.js 契约表）：slide.js 点按判定、attach.syncFwdQuality、
//    controls.rebuildFwdNeighbor、rail 箭头（goTo 为空不建）、player.currentIdx（层开返回哨兵）；
//    renderWindow/幽灵扫描都是 scroller 域内，天然隔离
// 0.9.209 拆件（dependency-audit 在册候选收尾）：会话模型 → playstate.js、级别栈/步进核 →
// levelstack.js（均纯态可单测）；本文件只剩视图壳——DOM 挂载/抽屉联动/深链解析/生命周期。
var pending = null; // 点击路径暂存的面板条目（{ acId, title, cover, up }）
var pendingCtx = null; // 点击路径暂存的会话上下文（0.9.173，见 applyCtx）
var slideRef = null; // 当前层内 slide（teardown 拆会话用；DOM 由框架拆）
var bodyRef = null; // 层体（换条要往它挂新 slide）
var unbindGest = null; // 层内滑动手势解绑函数（0.9.184 自本模块拆至 playgest.js；随层拆）

export function openPlayer(pi, ctx) {
  if (!pi || !pi.acId) return;
  pending = pi;
  pendingCtx = ctx || null;
  location.hash = CFG.hash + '/play/a/' + pi.acId;
}

// 列表显示行（抽屉「列表」tab 用）：来源给了 rows 就用它（字段更全：dur/like），否则从
// 面板条目降级投影（cover/title/up 总有，其余缺省）——与 list 同序同长，索引即播放项
function displayRowsOf(sess) {
  if (sess.rows && sess.rows.length === sess.list.length) return sess.rows;
  return sess.list.map(function (pi) {
    return {
      id: pi.acId, title: pi.title || '', cover: pi.cover || '',
      dur: pi.dur || '', like: pi.like || 0,
      up: (pi.up && pi.up.name) || pi.upName || ''
    };
  });
}

// 右栏 ▲▼ 状态（列表中间=两枚都在；首条藏 ▲；不可续拉的末条藏 ▼——同竖刷首条语义）
function syncArrows() {
  if (!slideRef) return;
  var up = slideRef.querySelector('.acsv-arrow-up');
  var dn = slideRef.querySelector('.acsv-arrow-down');
  if (up) {
    var hasPrev = canBack();
    up.style.display = hasPrev ? 'grid' : 'none';
    up.disabled = !hasPrev;
  }
  if (dn) {
    var s = currentSession();
    var hasNext = s.kind === 'walk' ? true
      : s.kind === 'list' ? (s.idx + 1 < s.list.length || !!s.more)
        : false;
    dn.style.display = hasNext ? 'grid' : 'none';
    dn.disabled = !hasNext;
  }
}

// 抽屉「列表」tab 跟随（层内步进/跳转后调）：tab 未激活时不抢（relDrawerSyncList 内判）
function syncListTab() {
  var s = currentSession();
  if (s.kind === 'list' && s.list.length) relDrawerSyncList(s.idx);
}

// 当前播放位置（秒；<1s 不记——首帧误差不值得存）
function curTime() {
  var v = slideRef && slideRef.querySelector('video');
  return v && v.currentTime > 1 ? v.currentTime : 0;
}

// 环境触面注入（levelstack 的 swap/箭头/页签/toast/相关池全部经此；本模块不再持工作态）
setLevelIO({
  swap: swap,
  alive: function () { return !!slideRef; },
  curTime: curTime,
  toast: function (msg) { toast(msg); },
  syncArrows: syncArrows,
  syncListTab: syncListTab,
  listMode: relDrawerListMode,
  hideList: relDrawerHideList,
  openListDrawer: openListDrawer,
  relatedBatch: relatedBatch
});

// 「当前会话没有下一条」中介注册（0.9.183）：playback.applyLoop 的 loop 落点读它（single
// 恒循环）——判据是会话私有状态，经 state 注入（playItem 同型先例），消费方零新模块边
setOvlNoNext(isSingle);

function mountSlide(body, item, resumeAt) {
  // 箭头（0.9.173）：非单条会话才建——single（动态卡片）保持 0.9.74 的「层内无翻页箭头」
  //（深链/刷新无来源上下文 ⇒ 缺省 walk，箭头在，见 levelstack.applyCtx 注释）
  var goTo = isSingle() ? null : {
    up: function () { playStep(-1); },
    down: function () { playStep(1); }
  };
  var slide = buildSlide(item, OVL_IDX, goTo);
  // 进度续播槽（0.9.174 弹回上级）：attachVideo 会把 slide._resumeAt 转入 session.resumeAt，
  // playing 后 seek 回去——复用既有槽位，不自造第二套 seek（attach.js 契约表在册）
  if (resumeAt > 1) slide._resumeAt = resumeAt;
  slide.dataset.ovl = '1';
  body.appendChild(slide);
  slideRef = slide;
  // 层内当前条目镜像（0.9.111 下沉 state）：input 的 c 键读 state.playItem，不再反向 import
  // 本模块；级别栈侧的同名锚由 levelstack.setCurItem 持有（saveLevel 落档用）
  setPlayItem(item);
  setCurItem(item);
  // 键盘手势重定向（空格/静音/快进/全屏打层内那条；有钩子不回落竖刷，见 state.videoTarget）
  setVideoTarget(function () {
    var v = slideRef && slideRef.querySelector('video');
    return v || null;
  });
  // 关页/切标签兜底上报的重定向（0.9.86，见 state.watchTarget）：reportLeaveCurrent 必须能
  // 找到层内会话；会话未挂上（_session 还没建）返回 null=什么都不报
  setWatchTarget(function () {
    var s = slideRef && slideRef._session;
    return s ? { session: s, video: s.video } : null;
  });
  attachVideo(slide, item, OVL_IDX); // 懒解析/错误恢复/弹幕/互动栏/上报全走既有链路
}

// 层内换条（0.9.170）：拆旧 slide 会话 → 挂新。抽屉开着就跟着换视频（followComments 同款
// 纪律：评论/相关推荐两个 tab 的宿主都要跟上新 id，重定向缝不重开浮层——重开会触发
// closeComments ⇒ 页签被打回评论，用户实报「点相关推荐往下刷，页签切回评论」，0.9.178）；
// hash 不跟写——层地址=入口那条，Esc/刷新仍回入口（游走是层内临时态，不污染分享链接）
function swap(item, resumeAt) {
  if (!bodyRef || !item) return false;
  detachSession(slideRef);
  if (slideRef && slideRef.parentNode) slideRef.parentNode.removeChild(slideRef);
  slideRef = null;
  mountSlide(bodyRef, item, resumeAt);
  followComments(item);
  return true;
}

// 键盘 ↓/↑ 入口（player 注入 input 的 api.playStep；ev.repeat 在 input 侧挡）。工作态在
// levelstack：在途互斥、会话分派与「已经是第一条」提示都在核里（0.9.214 收回核内——旧实现
// stepping 挡在 toast 前即 ↑ 在途静默，壳层判 `!ok` 会误弹），这里只守 DOM 侧前提
export function playStep(delta) {
  if (!slideRef || !curItemOf()) return false;
  return levelStep(delta);
}

// Esc 弹级（player 注入 input 的 api.playEscape）：级别 >1 才弹——弹回上级原视频并**恢复进度**
//（存档/弹出/还原在 levelstack.escape）；单级返回 false（交回视图层退出）。
// 「列表」页签一律收起（0.9.177；上级虽是列表会话也不顶它出来——页签是第三播放器专属 UI），
// 且不再自动展开抽屉（Esc 第一下已关抽屉，"关闭即回"靠它）
export function playEscape() {
  if (!slideRef) return false;
  var up = escapeCore();
  if (!up) return false;
  swap(up.item, up.at); // 进度经 slide._resumeAt 槽恢复（方案一过渡；后续接官方历史断点续播）
  syncArrows();
  relDrawerHideList();
  relDrawerListMode(false); // ②：相关推荐入口按 kind 判定还原
  return true;
}

// 列表播放器打开：自动展开抽屉（未开则开）并停在「列表」tab
function openListDrawer() {
  var ci = curItemOf();
  if (!ci) return;
  if (!isOpenComments()) {
    openComments(ci.id, ci.stype, ci.shareUrl, ci.kind, ci.title);
  }
  var s = currentSession();
  relDrawerShowList(displayRowsOf(s), s.idx, ci.title || '');
}

// 层开：挂首条并把它登记为历史第 0 条（↑ 要能回到**入口**那条——mountSlide 只管 DOM，
// 不碰历史；deep-link 冷进入与点击进入两条路都经这里）
function enterLayer(item) {
  mountSlide(bodyRef, item);
  enterLayerState(item); // 历史第 0 条 + 级别栈底（levelstack）
}

// 层宿主注册（relatedapi mediator）：抽屉「相关推荐」行在层内点 = **压新级别开列表播放器**
//（0.9.174；原「层内换条」语义已被用户裁决推翻——关闭要能回原视频）
setLayerHost({
  active: function () { return !!slideRef; },
  // 抽屉「相关推荐」行点击（层内）= **开列表播放器**（压新级别，0.9.174 用户裁决——关闭即回原视频）
  jump: function (item, ctx) {
    if (!bodyRef || !item) return false;
    return pushLevel(item, ctx || { kind: 'walk' });
  },
  // 抽屉「列表」tab 行点击 = 列表内跳转（同级别换条）
  pick: pickInLevel
});

// 开层注册（0.9.172）：层外（竖刷舞台）点相关推荐行 = 以该视频开播放层——舞台原地保活
// （stageHide 暂停当前条），Esc 回当前视频；不再走 startChain（拆视图/重置流，实报「窗口没了」）
setLayerOpener(function (item) {
  if (!item || !item.id) return false;
  openPlayer({ acId: item.id, title: item.title, cover: item.cover, up: item.up });
  return true;
});

// 错误盒（盒体单源见 errbox.js；0.9.77 教训「重试键在盒内且点击先整盒撤除」随盒体下沉）。
// 两条失败路径（深链解析空/网络）出口形态一致。

function buildPlayView(body, arg) {
  body.classList.add('acsv-vbody-play');
  var id = Number(arg) || 0;
  if (!id) { errBox(body, '播放链接不完整（缺少视频 id）'); return; }
  bodyRef = body;
  resetAll(); // 工作态清零（会话/历史/级别栈/队列；0.9.209 原地清单收拢）
  unbindGest = bindLayerGestures(body, playStep); // 层内滑动手势（0.9.184 逻辑在 playgest.js）
  seed(id); // 游走泵播种：入口视频登记为已见（层内 ↓ 的链从这里开始，不回头）
  var st = pending;
  var ctx = pendingCtx;
  pending = null;
  pendingCtx = null;
  applyCtx(ctx); // 会话（0.9.173）：点击路径带来源上下文；深链/刷新无 ctx ⇒ 缺省 walk（相关池续命）
  if (st && String(st.acId) === String(id)) {
    enterLayer(playItemOf(st)); // 即时首帧：面板已有标题封面与作者（up 契约），直链交会话解析链补
    return;
  }
  // 深链/刷新直达：先解析（拿标题/封面/来源），失败出错误盒 + 重试（绝不静默）。
  // load() 自带转圈进出：每次重跑先挂 spinner、结束时撤（成功/失败都不留）
  var sp = spinner();
  function load() {
    body.appendChild(sp);
    API.deepLink(id, parseRoute().src).then(function (hit) {
      if (!body.isConnected) return; // 期间已离开播放层
      sp.remove();
      if (!hit) { errBox(body, '视频加载失败', load); return; }
      enterLayer(hit.item);
    }, function () {
      if (!body.isConnected) return;
      sp.remove();
      errBox(body, '视频加载失败（网络不可达）', load);
    });
  }
  load();
}

function teardownPlayView() {
  setVideoTarget(null); // 撤键盘重定向：此后"当前视频"回到竖刷当前条
  setWatchTarget(null); // 撤上报重定向（0.9.86）：兜底上报回到竖刷当前条
  if (unbindGest) { unbindGest(); unbindGest = null; } // 滑动手势随层拆（0.9.171；0.9.184 解绑函数化）
  detachSession(slideRef);
  slideRef = null;
  setPlayItem(null); // 镜像随层拆（0.9.111）
  pending = null;
  pendingCtx = null;
  bodyRef = null;
  // 抽屉「列表」页签随层拆：**必须先收页签再解 listOnly**（0.9.176 修实报「再次点分区视频，
  // 展开抽屉还挂着列表栏」——退出层只解了 listOnly，tabL 的 display 与 lcache 留着，
  // 下次进层开抽屉就是上次那份陈列表）
  relDrawerHideList();
  relDrawerListMode(false);
  resetAll(); // 会话/历史/级别栈/队列/在途步进随层拆（0.9.209 原地清单收拢）
}

registerView({
  id: 'play',
  build: buildPlayView,
  teardown: teardownPlayView,
  deep: true, // 深界面：关闭/返回=回来源链顶（打开它的那个列表/搜索页）
  volatile: true // 握播放会话/定时器：离开即真拆，绝不挂起（隐藏容器里继续出声绝不允许）
});

// debug 构建测试钩子：harness 断言读层态与游走账（release 死码消除；键名是 harness 契约，勿改）
testHook('playlayer', function () {
  var ls = debugState();
  var v = slideRef && slideRef.querySelector('video');
  return {
    active: !!slideRef,
    id: curItemOf() ? curItemOf().id : null,
    hist: ls.hist,
    hIdx: ls.hIdx,
    queue: ls.queue,
    session: ls.session,
    listLen: ls.listLen,
    listIdx: ls.listIdx,
    hasMore: ls.hasMore,
    levels: ls.levels,
    parentId: ls.parentId,
    curAt: ls.curAt,
    parentAt: ls.parentAt,
    at: v ? Math.round(v.currentTime) : 0,
    arrows: slideRef ? slideRef.querySelectorAll('.acsv-arrow').length : 0,
    upShown: !!(slideRef && (slideRef.querySelector('.acsv-arrow-up') || {}).style
      && slideRef.querySelector('.acsv-arrow-up').style.display !== 'none'),
    downShown: !!(slideRef && (slideRef.querySelector('.acsv-arrow-down') || {}).style
      && slideRef.querySelector('.acsv-arrow-down').style.display !== 'none')
  };
});

setItemOpener(openPlayer); // 视图条目点击出口（卡面 kit 不反向 import 本模块）
