// ---------- 私信发送核心（0.9.123 自 imshare.js 拆出：协议核心 ↔ 分享面板 UI 分居） ----------
// 0.9.270：SDK 基建（加载/注入/补丁/tracer 手术/日志黑匣子/weblog 垫片/单例连接/崩溃水位）
// 拆至 imsdk.js——本模块只留「联系人/头像 + 发送核心」（doSend/withSendRecovery/sendKernel/
// sendQuote/sendImage/sendCmtShare/sendMomentShare）；恢复链经 imsdk 出口读状态，不持副本。
// 图片管线（字节：midground 令牌/blob LRU/下载队列/在飞去重；URL 换链：imageUrlOf ks://→官方
// 直链/imageUriFromRaw/officialize）已 0.9.266 拆至 imimage.js。分享面板 UI 在 sharepanel.js
// （单向依赖本模块出口）；拆分动机：协议核心获得独立可测面、UI 改动不再碰发送可靠性。
// ---------- 私信分享（抖音式分享面板） ----------
// 网页端私信没有 REST 发送端点：官方自己走快手 ImSdk（klink WebSocket + protobuf），
// SDK 加载/单例构造/日志读回在 imsdk.js。头像昵称用 getUserCardList（SDK 内部同款接口，
// 网页 Cookie 鉴权）。全链路失败均降级为「复制链接」，不阻断分享。

import { CFG } from './cfg.js';
import { swallow } from './dbg.js';
import { postForm } from './appapi.js';
import { quoteWireText, QUOTE_EXTRA_KEY, CMT_EXTRA_KEY, MOMENT_EXTRA_KEY } from './immsg.js';
import {
  ensureConnected, ensureTracer, linkOk, rebuildIm, hadTracerCrash, imLogMark, imLogVerdict
} from './imsdk.js';

// 会话列表（最近联系人）：连接后服务端 sync 需要 1~2 拍，轮询到非空即止。
// 空列表是合法状态（从没私聊过），区分「超时仍空」与「真的没有」意义不大，统一返回 []。
// 导出供 sharepanel 消费（0.9.123 拆分：面板装载联系人行需要它）
export function getContacts(inst) {
  return new Promise(function (resolve) {
    var n = 0;
    (function poll() {
      var ss = [];
      try { ss = inst.kernel.getSessions() || []; } catch (e) { swallow(e, 'imsend'); }
      if (ss.length) return resolve(mapSessions(ss));
      if (++n >= CFG.im.pollMax) return resolve([]);
      setTimeout(poll, CFG.im.pollGap);
    })();
  });
}

// 会话对象字段（kernel）：targetId/unreadCount/lastMessage.date/date，与官方 initChat 同款排序键
function mapSessions(ss) {
  return ss.map(function (s) {
    return {
      targetId: Number(s.targetId) || 0,
      unread: Number(s.unreadCount) || 0,
      t: new Date((s.lastMessage && s.lastMessage.date) || s.date || 0).getTime() || 0
    };
  }).filter(function (c) { return c.targetId > 0; })
    .sort(function (a, b) { return b.t - a.t; });
}

// 头像昵称批量补齐（SDK 内部 getUserInfosByPatch 同款接口；同源 fetch 免 CORS）
export function fetchCards(ids) {
  return postForm(CFG.api.userCard, 'ids=' + ids.join(',')).then(function (j) {
    var map = {};
    ((j && j.result === 0 && j.users) || []).forEach(function (u) {
      map[u.id] = { name: u.name || 'A站用户', headUrl: u.headUrl || '' };
    });
    return map;
  }, function () { return {}; });
}

// 发送：签名 sendMessage(targetId, text, 消息类型, 成功回调)，第 3 参 0=文本。
// ImSdk.eb6e95（2026-09 线上版）起第 3 参从「回调」改为「消息类型」：传回调会被当
// 图片消息处理（文本被当图片 URL），服务端拒绝且回调永不触发——超时假失败的根源。
// 失败官方只打日志无回调，仍靠超时兜底判定
export function doSend(inst, targetId, text) {
  var mark = imLogMark(); // 发送前的日志水位：之后首次出现的成功/失败即本次结果
  return new Promise(function (resolve, reject) {
    var done = false;
    var timer = setTimeout(function () { finish(new Error('send-timeout')); }, CFG.im.sendT);
    function settle() { finish(null); }
    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { inst.off('sendSucceed', onEvt); } catch (e) { swallow(e, 'imsend'); }
      clearInterval(logPoll);
      if (err) reject(err); else resolve();
    }
    // sendSucceed 事件/回调若能触发则最快确认（跨 world 不可靠，仅作快路径）
    function onEvt(tid) { if (String(tid) === String(targetId)) settle(); }
    try { inst.on('sendSucceed', onEvt); } catch (e) { swallow(e, 'imsend'); }
    // 主确认途径：SDK 成功打「信息发送成功」、失败打「信息发送失败」+ 原因（同 world 落地）
    var logPoll = setInterval(function () {
      var v = imLogVerdict(mark);
      if (!v) return;
      finish(v.ok ? null : new Error(v.why || 'send-fail'));
    }, 300);
    var r;
    try {
      // 两页两版：49d365 旧版 3 参 (targetId, text, 回调)；eb6e95 新版 4 参 (…, 类型0, 回调)。
      // 按形参个数自动适配，传错会把回调当消息类型（文本被当图片 URL）→ 服务端拒绝
      if (inst.sendMessage.length >= 4) r = inst.sendMessage(targetId, text, 0, settle);
      else r = inst.sendMessage(targetId, text, settle);
    }
    catch (e) { finish(e); return; }
    if (r === false && !done) { // 未连接 / 超 1000 字：官方同步返回 false
      finish(new Error('send-rejected'));
    }
  });
}

// 强制跑一轮 sync：服务端以 {syncOffset} 载荷拒绝发送 = 设备消息队列有未同步游标，
// 要求先同步再操作（SDK 对此无自动恢复，且 sync() 内部有 3s 节流闸 + 失败后 10s 才重试）。
// 清掉节流状态手动触发，等 isSyncing 落回 false（含失败回落）再继续
export function forceSync(inst) {
  try {
    var k = inst.kernel;
    k.syncStatus.isSyncing = false;
    k.syncStatus.lastSyncDate = 0;
    k.sync();
  } catch (e) { swallow(e, 'imsend'); }
  return new Promise(function (resolve) {
    var start = Date.now();
    (function poll() {
      var busy = false;
      try { busy = !!(inst.kernel && inst.kernel.syncStatus && inst.kernel.syncStatus.isSyncing); } catch (e) { swallow(e, 'imsend'); }
      if (!busy || Date.now() - start > 6000) return resolve();
      setTimeout(poll, 250);
    })();
  });
}

// 发送 + 失败自动恢复重试一次（文本 doSend 与引用 sendQuote 共用）。按失败指纹分派：
//   tracer 崩溃（weblog 缺失）→ 重建带病单例（只认已修复水位之后的崩溃，0.9.121——旧崩溃不再误诊）
//   链路坏 → 重连
//   sync-required（服务端 {syncOffset} 拒绝）→ 强制同步一轮
// 恢复后仍失败才是真问题，原因走黑匣子。send(inst) 由调用方闭包打包「建消息+发送」
function withSendRecovery(inst, send) {
  return send(inst).catch(function () {
    var p;
    if (hadTracerCrash()) {
      console.warn('[acsv-im] 检测到 tracer 崩溃（weblog 缺失），重建 IM 实例后重试');
      p = rebuildIm();
    } else if (linkOk(inst)) {
      p = Promise.resolve(inst);
    } else {
      p = ensureConnected(inst).then(function () { return inst; });
    }
    return p.then(function (useInst) {
      ensureTracer(useInst); // 每次发送前确保 tracer 就位（幂等）
      return forceSync(useInst).then(function () { return send(useInst); });
    });
  });
}

// 导出供 sharepanel 消费（0.9.123 拆分：普通分享的发送出口）
export function sendOnce(inst, targetId, text) {
  return withSendRecovery(inst, function (i) { return doSend(i, targetId, text); });
}

// kernel 直发通道：widget 的 sendMessage 只放行文本/图片（第 3 参按类型分发），引用/图片等
// 类型绕过它直接 kernel.sendMessage（内核对已注册消息类只做序列化+入缓存+下发，无白名单）。
// 确认途径与 doSend 不同——没有 widget 的「信息发送成功」日志，改为在会话消息缓存里按
// clientSeqId 对账：服务端接受后该消息落入 getMessages 缓存，对上即服务端已收。
// timeout 可配（图片消息含内核上传，用 imgSendT 而非 sendT）；clientSeqId 每拍现读——
// 图片消息走 beforeSend 上传时它可能晚赋，等出现即可，总闸兜底超时
export function sendKernel(inst, msg, targetId, timeout) {
  var limit = timeout || CFG.im.sendT;
  return new Promise(function (resolve, reject) {
    var done = false, start = Date.now();
    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err); else resolve();
    }
    var timer = setTimeout(function () { finish(new Error('send-timeout')); }, limit);
    var r;
    try { r = inst.kernel.sendMessage(msg); } catch (e) { finish(e); return; }
    // 内核若返回 promise：resolve 只代表内核侧收发完成，仍以缓存对账为准（服务端
    // sync-required 等拒绝不一定走 reject）；reject 则提前终局，不干等超时
    if (r && typeof r.then === 'function') {
      r.then(function () { }, function (e) { finish(e || new Error('send-fail')); });
    }
    (function poll() {
      if (done) return;
      var csid = '';
      try { csid = String((msg.rawMsg && msg.rawMsg.clientSeqId) || ''); } catch (e1) { /* best-effort: parse */ }
      if (csid) {
        var hit = false;
        try {
          var sess = null;
          (inst.kernel.getSessions() || []).some(function (s) {
            if (String(s.targetId) === String(targetId)) { sess = s; return true; }
            return false;
          });
          if (sess) {
            (inst.kernel.getMessages(sess) || []).some(function (m) {
              var raw = m.rawMsg || {};
              if (raw.clientSeqId !== undefined && String(raw.clientSeqId) === csid) { hit = true; return true; }
              return false;
            });
          }
        } catch (e) { swallow(e, 'imsend'); }
        if (hit) return finish(null);
      }
      if (Date.now() - start > limit) return finish(new Error('send-timeout'));
      setTimeout(poll, 300);
    })();
  });
}

// 图片消息发送（contentType 1，官方同路）：ImageMsg.create({image: File, width, height}) 走
// kernel.sendMessage 时 beforeSend 自动上传图床换 ks:// 资源串，APP/官方 web 原生渲染。
// 不能发 https 直链：官方端渲染非 ks:// 资源会 throw，打断整个会话渲染循环
export function sendImage(inst, targetId, file, w, h) {
  return withSendRecovery(inst, function (i) {
    return new Promise(function (resolve, reject) {
      try {
        var map = i.kernel && i.kernel.messageConstructorMap;
        var Img = map && map[1];
        if (!Img || !Img.create) throw new Error('image-msg-class-missing');
        resolve(sendKernel(i, Img.create({
          image: file, width: w || 300, height: h || 300, targetType: 0, targetId: Number(targetId)
        }), targetId, CFG.im.imgSendT));
      } catch (e) { reject(e); }
    });
  });
}

// 引用消息发送（双通道按 CFG.im.quoteWire 切换，都走 kernel 直发 + 恢复重试）。
// reference：ReferenceMsg.create({text, originMsg, targetType, targetId})，编解码内核全包；
// extra：TextMsg + extra 藏 {acsvQuote} JSON，wire 文本拼「[引用] 摘要\n正文」给对方
// 客户端兜底（脚本端收下后以 extra 结构化数据渲染，不读 wire 文本）
export function sendQuote(inst, targetId, quote, text) {
  return withSendRecovery(inst, function (i) {
    return new Promise(function (resolve, reject) {
      try {
        var map = i.kernel && i.kernel.messageConstructorMap;
        if (CFG.im.quoteWire === 'reference') {
          var Ref = map && map[12];
          if (!Ref || !Ref.create) throw new Error('reference-msg-class-missing');
          resolve(sendKernel(i, Ref.create({
            text: text, originMsg: quote.originMsg, targetType: 0, targetId: Number(targetId)
          }), targetId));
        } else {
          var Txt = map && map[0];
          if (!Txt || !Txt.create) throw new Error('text-msg-class-missing');
          var extra = null;
          try {
            var qExtra = {};
            qExtra[QUOTE_EXTRA_KEY] = { seqId: quote.seqId || '', preview: quote.preview || '', text: text };
            extra = new TextEncoder().encode(JSON.stringify(qExtra));
          } catch (e1) { /* best-effort: parse */ }
          resolve(sendKernel(i, Txt.create({
            targetType: 0, targetId: Number(targetId),
            text: quoteWireText(quote.preview, text), // 拼接格式唯一定义处（immsg，原生页去重同源）
            extra: extra
          }), targetId));
        }
      } catch (e) { reject(e); }
    });
  });
}

// 评论转发私信（0.9.52，extra 通道唯一）：明文 wire（@作者：纯文本\n链接#ncid=，官方
// APP 可读）+ proto extra 藏 {acsvCmt:{ncid, content:原始 UBB}}，接收端 extra 存活时
// 渲染真表情/[img]，被剥则按 wire 走 isCommentShare 启发式降级（[表情] 占位文本）。
// 不做 reference 通道：引用消息是「重建原消息」语义，装不下自构 payload
export function sendCmtShare(inst, targetId, payload, text) {
  return withSendRecovery(inst, function (i) {
    return new Promise(function (resolve, reject) {
      try {
        var map = i.kernel && i.kernel.messageConstructorMap;
        var Txt = map && map[0];
        if (!Txt || !Txt.create) throw new Error('text-msg-class-missing');
        var extra = null;
        try {
          var cExtra = {};
          cExtra[CMT_EXTRA_KEY] = payload;
          extra = new TextEncoder().encode(JSON.stringify(cExtra));
        } catch (e1) { /* best-effort: parse */ }
        resolve(sendKernel(i, Txt.create({
          targetType: 0, targetId: Number(targetId), text: text, extra: extra
        }), targetId));
      } catch (e) { reject(e); }
    });
  });
}

// 动态转发私信（0.9.122，extra 通道唯一；与评论转发同纪律）：明文 wire「@作者：明文\n动态链」
// 官方可读 + proto extra 藏 {acsvMoment:{momentId,text,imgs,up}}——接收端 extra 存活时渲染
// 真图动态卡，被剥则按 wire 降级为文本动态卡（仍可读可点）
export function sendMomentShare(inst, targetId, payload, text) {
  return withSendRecovery(inst, function (i) {
    return new Promise(function (resolve, reject) {
      try {
        var map = i.kernel && i.kernel.messageConstructorMap;
        var Txt = map && map[0];
        if (!Txt || !Txt.create) throw new Error('text-msg-class-missing');
        var extra = null;
        try {
          var mExtra = {};
          mExtra[MOMENT_EXTRA_KEY] = payload;
          extra = new TextEncoder().encode(JSON.stringify(mExtra));
        } catch (e1) { /* best-effort: parse */ }
        resolve(sendKernel(i, Txt.create({
          targetType: 0, targetId: Number(targetId), text: text, extra: extra
        }), targetId));
      } catch (e) { reject(e); }
    });
  });
}
