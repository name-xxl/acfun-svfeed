// ---------- 私信发送基建（0.9.123 自 imshare.js 拆出：协议核心 ↔ 分享面板 UI 分居） ----------
// 本模块 = SDK 加载/注入/补丁（源码补丁 + Blob 执行 + tracer 手术 + 日志黑匣子/weblog 垫片）
// + 连接与重连 + 发送核心（doSend/sendKernel/withSendRecovery/sendQuote/sendImage/
// sendCmtShare/sendMomentShare）+ 图片字节管线（midground 令牌/blob LRU/下载队列/在飞去重）。
// 分享面板 UI 在 sharepanel.js（单向依赖本模块出口）；拆分动机：协议核心获得独立可测面、
// UI 改动不再碰发送可靠性。纯搬迁零逻辑改动（原 imshare.js 单文件 45.9K）。
// ---------- 私信分享（抖音式分享面板） ----------
// 网页端私信没有 REST 发送端点：官方自己走快手 ImSdk（klink WebSocket + protobuf），
// SDK CDN 与用法取自站点顶栏 newHeader 原版逻辑（$.getScript(globalConfig.imsdkcdn) 后
// new ImSdk({dev:false})）。构造是单例：若顶栏已建实例则复用同一条 WS 连接，不重复握手。
// 头像昵称用 getUserCardList（SDK 内部同款接口，网页 Cookie 鉴权）。
// 全链路失败均降级为「复制链接」，不阻断分享。

import { CFG } from './cfg.js';
import { gmRequest } from './net.js';
import { cookieVal } from './ui.js';
import { postForm } from './appapi.js';
import { quoteWireText, QUOTE_EXTRA_KEY, CMT_EXTRA_KEY, MOMENT_EXTRA_KEY } from './immsg.js';

// 脚本在 TM 隔离 world 运行，页面变量（globalConfig/ImSdk）必须经 unsafeWindow 读
function pageWin() {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}

// ---------- SDK 日志黑匣子 ----------
// SDK 的 @log 装饰器把每个 kernel API 的入参/resolve/reject 全部打到 window.localLog
// （官方钩子，缺省回落 console）。发送失败的真实原因（服务端拒绝码等）就在 reject: 行里。
// 跨 world 直写 unsafeWindow 属性在部分 TM 组合下不落页面（dbg.js 同款教训），所以先直写、
// 失败再借页面上下文内联脚本安装；收集进 window.__acsvImLog 供沙箱读回
// G = 目标 global（页面 world）：直写时传 unsafeWindow，内联兜底时由序列化调用传 window。
// 函数体不得引用外层闭包（会被 toString 后在页面上下文执行）。
// 除 localLog 外同时包装 console（widget 的失败日志走裸 console.log，不在 localLog 里）
function logInstaller(G) {
  if (G.__acsvImLog) return;
  G.__acsvImLog = [];
  G.__acsvImLogDrop = 0; // 累计驱逐数（0.9.121）：水位判据按"累计写入数"记，见 tracerCrashAfter
  G.__acsvImErr = '';
  var ser = function (a) {
    if (a == null) return String(a);
    var t = typeof a;
    if (t === 'string') return a;
    if (t === 'number' || t === 'boolean') return String(a);
    try {
      if (typeof a.toJSON === 'function') return JSON.stringify(a.toJSON());
    } catch (e) { }
    // Error 家族 JSON.stringify 恒为 {}（TypeError 假失败的教训），必须手动摘字段
    if (a instanceof Error || (a && a.message && a.stack)) {
      return JSON.stringify({ name: a.name, message: a.message, code: a.code });
    }
    try { return JSON.stringify(a); } catch (e2) { return String(a); }
  };
  var push = function () {
    try {
      var parts = [], errJson = '';
      for (var i = 0; i < arguments.length; i++) {
        var s = ser(arguments[i]);
        parts.push(s);
        if (s && s.charAt(0) === '{') errJson = s; // 末尾 JSON 载荷 = 拒绝原因
      }
      var line = parts.join(' ');
      if (line.indexOf('[im-sdk]') > -1 || line.indexOf('信息发送') > -1 || line.indexOf('reject:') > -1) {
        if (errJson) G.__acsvImErr = errJson;
        G.__acsvImLog.push(line.slice(0, 2000));
        if (G.__acsvImLog.length > 60) { G.__acsvImLog.shift(); G.__acsvImLogDrop++; }
      }
    } catch (e) { }
  };
  G.localLog = {
    log: function () { push.apply(null, arguments); console.log.apply(console, arguments); },
    info: function () { push.apply(null, arguments); console.info.apply(console, arguments); },
    error: function () { push.apply(null, arguments); console.error.apply(console, arguments); }
  };
  try {
    ['log', 'info', 'error'].forEach(function (lv) {
      var orig = G.console[lv].bind(G.console);
      G.console[lv] = function () {
        push.apply(null, arguments);
        orig.apply(null, arguments);
      };
    });
  } catch (e) { }
}
// 「直写 unsafeWindow → 失败再内联 script」统一出口：installer 是自包含函数（页面
// world 无闭包变量可引用），installed(w) 探测注入是否已生效。返回 true = 本次注入过
function injectPageFn(installer, installed) {
  var w = pageWin();
  if (installed(w)) return false;
  try { installer(w); } catch (e) { } // 直写 unsafeWindow：多数 TM 组合可用
  if (installed(w)) return false;
  try {
    var s = document.createElement('script');
    s.textContent = '(' + installer.toString() + ')(window);';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e2) { }
  return true;
}

function ensureLocalLog() {
  injectPageFn(logInstaller, function (w) { return w.localLog && w.__acsvImLog; });
}
function imLogMark() {
  try { return (pageWin().__acsvImLog || []).length; } catch (e) { return 0; }
}
// 从 mark 起按顺序扫描：成功/失败谁先出现算谁（混入多条时保序）
function imLogVerdict(mark) {
  var buf = [];
  try { buf = pageWin().__acsvImLog || []; } catch (e) { }
  for (var i = mark; i < buf.length; i++) {
    var l = String(buf[i]);
    if (l.indexOf('信息发送成功') > -1) return { ok: true };
    if (l.indexOf('信息发送失败') > -1) return { ok: false, why: l };
  }
  return null;
}
// 日志状态读取（缓冲 + 累计驱逐数）：水位判据按"累计写入数"记——滚动缓冲 shift() 会让
// 数组下标整体漂移，纯下标水位在驱逐后错位（0.9.121）
function imLogState() {
  try {
    var w = pageWin();
    return { lines: w.__acsvImLog || [], drop: Number(w.__acsvImLogDrop) || 0 };
  } catch (e) { return { lines: [], drop: 0 }; }
}
function imLogTotal() { var s = imLogState(); return s.drop + s.lines.length; }

// 崩溃水位判据（纯函数，导出供单测）：仅认"绝对序号 ≥ fromTotal"的行的崩溃指纹。
// 绝对序号 = drop + 数组下标；fromTotal = 已修复水位（tracer 病治愈时推进的累计写入数）
export function tracerCrashAfter(lines, drop, fromTotal) {
  var d = Number(drop) || 0, from = Number(fromTotal) || 0;
  var arr = lines || [];
  for (var i = 0; i < arr.length; i++) {
    if (d + i < from) continue;
    if (String(arr[i]).indexOf("reading 'context'") > -1) return true;
  }
  return false;
}

// 已修复水位与判定（0.9.121 修）：此前从缓冲 0 号全量扫——已治愈的旧崩溃（滚动 60 行内
// 可滞留很久）会让之后每次普通发送失败都被误诊成"需要重建单例"（无谓重建=断链重连）。
// 现在只认水位之后的崩溃。**为什么不选"重建成功后清缓冲"**：清空会让同页在途 doSend 的
// imLogVerdict(mark) 水位失配（buf.length < mark 恒 null）→ 该发送超时终局 →
// withSendRecovery 重试 → 若原发送实际已成功 = 重复私信；水位+驱逐计数无此险
var tracerFixedTotal = 0;
function hadTracerCrash() {
  var s = imLogState();
  return tracerCrashAfter(s.lines, s.drop, tracerFixedTotal);
}

// ---------- weblog 兜底 ----------
// SDK 构造时捕获 window.weblog（快手日志器）当链路 tracer；竖刷页上站点脚本可能尚未
// 初始化它 → kernel 带病创建，send 一律崩 `TypeError: ... reading 'context'`（旧版
// 49d365 实测），且单例一旦带病终生带病。先等站点自己的 weblog（最多 3s），没有就装
// 最小 no-op tracer。函数体不引外层闭包（会被序列化后注入页面执行）
function weblogInstaller(G) {
  function makeSpan(opts) {
    var span = {
      context: (opts && opts.context) || { traceId: 'acsv' + Date.now() },
      setTags: function () { return span; },
      end: function () { },
      createSubSpan: function (sub, o1, o2, parent) {
        return makeSpan({ context: parent || span.context });
      }
    };
    return span;
  }
  function safeStart(name, opts) {
    var sp = null;
    try { sp = G.__acsvOrigStart ? G.__acsvOrigStart.apply(this, arguments) : null; } catch (e) { }
    if (sp && sp.context !== undefined) return sp; // 原生 span 可用就走原生
    return makeSpan(opts); // 缺失/残缺（startSpan 返回 undefined 一样崩 send）→ 兜底 span
  }
  if (!G.weblog) {
    G.weblog = { startSpan: safeStart };
    return;
  }
  // 已有 weblog 但可能残缺：只包 startSpan 一层，别整体替换（站点埋点还依赖其余方法）
  if (!G.__acsvOrigStart) {
    G.__acsvOrigStart = G.weblog.startSpan;
    G.weblog.startSpan = safeStart;
  }
}
// 同步补齐 weblog：缺了立刻装垫片（不等站点——站点可能加载得比单例构造还晚，
// 那正是带病单例的成因）。返回 true 表示本次装了垫片
function tracerOk() {
  try {
    var wl = pageWin().weblog;
    if (!wl || typeof wl.startSpan !== 'function') return false;
    var sp = wl.startSpan('__acsv_probe__', {});
    return !!(sp && sp.context !== undefined); // 存在但 startSpan 返回 undefined 的残缺实现也算坏
  } catch (e) { return false; }
}
function ensureWeblogSync() {
  if (tracerOk()) return false;
  return injectPageFn(weblogInstaller, function () { return tracerOk(); });
}

export function isLogined() {
  return /^\d/.test(cookieVal('auth_key'));
}

// 加载 ImSdk：拉源码文本 → 打补丁 → blob 执行（CSP script-src 含 blob: ✓）。
// 旧版 49d365 构建缺陷：SendMsg 打点裸读 f.context（tracer 未注入时必崩，见 ensureTracer
// 注释）。补丁把 Encode/Transfer 两个纯追踪 span 的创建禁掉（!1 短路），f 恒为 false，
// f.context 走既有 void 0 保护——零功能影响。补丁失配（官方换版）则回退未修补直载，
// 那时发送崩溃走 hadTracerCrash 既有兜底
function gmGetText(url) {
  return gmRequest({ url: url, timeout: CFG.im.loadT, responseType: 'text', okStatus: true });
}

function loadImSdk() {
  return new Promise(function (resolve, reject) {
    ensureLocalLog();
    ensureWeblogSync();
    var w = pageWin();
    var src = (w.globalConfig && w.globalConfig.imsdkcdn) || CFG.api.imsdk;
    if (src.indexOf('//') === 0) src = 'https:' + src;
    var settled = false;
    function done(fn, val) { if (!settled) { settled = true; fn(val); } }
    function injectScript(url, onok, onfail) {
      var s = document.createElement('script');
      var timer = setTimeout(function () {
        clearTimeout(timer);
        s.remove();
        if (url.indexOf('blob:') === 0) URL.revokeObjectURL(url);
        onfail();
      }, CFG.im.loadT);
      s.onload = function () {
        clearTimeout(timer);
        var Ctor = pageWin().ImSdk;
        if (Ctor) onok(Ctor);
        else onfail();
      };
      s.onerror = function () {
        clearTimeout(timer);
        s.remove();
        if (url.indexOf('blob:') === 0) URL.revokeObjectURL(url);
        onfail();
      };
      s.src = url;
      (document.head || document.documentElement).appendChild(s);
    }
    function directLoad() {
      injectScript(src, function (Ctor) { done(resolve, Ctor); },
        function () { done(reject, new Error('imsdk-load-fail')); });
    }
    gmGetText(src).then(function (text) {
      var n = 0;
      text = text
        .replace('p=be.includes(e)&&(null==d?void 0:d.createSubSpan("Encode"', function (m) { n++; return 'p=!1&&(null==d?void 0:d.createSubSpan("Encode"'; })
        .replace('f=be.includes(e)&&(null==d?void 0:d.createSubSpan("Transfer"', function (m) { n++; return 'f=!1&&(null==d?void 0:d.createSubSpan("Transfer"'; });
      if (n < 2) { console.warn('[acsv-im] SDK 补丁失配（官方可能换了版），回退未修补加载'); return directLoad(); }
      var url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      injectScript(url, function (Ctor) { done(resolve, Ctor); }, function () { directLoad(); });
    }, function () { directLoad(); });
  });
}

var imPromise = null;
export function ensureIm() {
  if (imPromise) return imPromise;
  imPromise = loadImSdk().then(function (Ctor) {
    // 单例直接复用：站点实例若已存在，其连接与同步缓存都是现成的（tracer 缺陷由
    // ensureTracer 注入修复，无需重造）。复用语义在 SDK 构造器内部（构造即单例）
    return new Ctor({ dev: false });
  }, function (e) { imPromise = null; throw e; });
  return imPromise;
}

// 真实链路活性：不同版本暴露位置不同（新 kernel.isConnected / 内层 link 管理器的
// linkState，部分版本挂在 kernel.api 上），多探针兼容。会话列表 kernel.getSessions()
// 读本地缓存、widget.connected 断线后仍为 true——都不能作为连接依据
export function linkOk(inst) {
  try {
    var k = inst.kernel;
    if (!k) return false;
    // 多探针兼容（各版本暴露位置不同）；探针全缺失的版本信任 widget.connected——
    // 旧版 49d365 无任何探针，误判"断线"会让恢复流程反复重连自己捣乱
    var probes = [];
    if ('isConnected' in k) probes.push(k.isConnected === true);
    if ('linkState' in k) probes.push(k.linkState === 'connected');
    if (k.api && 'isConnected' in k.api) probes.push(k.api.isConnected === true);
    if (k.api && 'linkState' in k.api) probes.push(k.api.linkState === 'connected');
    if (!probes.length) return !!inst.connected;
    return probes.indexOf(true) > -1;
  } catch (e) { return false; }
}

// 强制重连：清掉 widget 的已连标记后走官方 connect()（重新取 token + 重建 WS）。
// 顶栏实例与面板共用，重连同时把顶栏红点也救活，无副作用
export function forceReconnect(inst) {
  try { inst.connected = false; inst.retryNum = 0; inst.connect(); } catch (e) { }
}

// 手术式修复旧版构建缺陷：initLink 不传 kTraceConfig → link.tracer 永远 undefined →
// SendMsg 打点裸读 f.context 必崩。注入独立的页面世界 tracer（不依赖站点 weblog 好坏），
// 幂等：建一次 tracer + 注入当前单例的链路对象。G=页面 window，函数体不引外层闭包
function tracerInstaller(G) {
  if (!G.__acsvTracer) {
    var span = function (opts, parent) {
      var s = {
        context: (opts && opts.context) || parent || { traceId: 'acsv' + Date.now() },
        setTags: function () { return s; },
        end: function () { },
        createSubSpan: function (n, parentCtx) { return span(opts, parentCtx || s.context); }
      };
      return s;
    };
    G.__acsvTracer = { startSpan: function (name, opts) { return span(opts); } };
  }
  try {
    var inst = G.ImSdk && G.ImSdk.instance;
    var zs = inst && inst.kernel && (inst.kernel.api || inst.kernel);
    var link = zs && zs.link;
    if (link && !link.tracer) link.tracer = G.__acsvTracer;
    // 旧版构建的 link 缺 log/logPerformance（站点 globalConfig 供给的 rc.1 实测，0.9.41）：
    // 图片上传成功后的性能打点走 kernel.log → this.link.log，只判 link 存在不判方法，
    // 直接 TypeError 把发送整体打断（实测上传都 200 了死在打点上；文本路径不经此打点故无恙）。
    // 补 no-op 与补 tracer 同性质：只丢性能埋点，零功能影响
    if (link) {
      if (typeof link.log !== 'function') link.log = function () { };
      if (typeof link.logPerformance !== 'function') link.logPerformance = function () { };
    }
    G.__acsvTracerOk = !!(link && link.tracer);
  } catch (e) { G.__acsvTracerOk = false; }
}
export function ensureTracer(inst) {
  injectPageFn(tracerInstaller, function (w) { return w.__acsvTracer && w.__acsvTracerOk; });
  var w = pageWin();
  // 沙箱侧再补一刀（页面内联若被 CSP 拦截时的尽力而为）
  try {
    var k = inst.kernel || {};
    var zs = k.api || k;
    if (zs && zs.link && !zs.link.tracer && w.__acsvTracer) zs.link.tracer = w.__acsvTracer;
    // 沙箱侧同款补桩：injectPageFn 装过一次后 installer 不再重跑，这里每次兜底
    if (zs && zs.link) {
      if (typeof zs.link.log !== 'function') zs.link.log = function () { };
      if (typeof zs.link.logPerformance !== 'function') zs.link.logPerformance = function () { };
    }
  } catch (e3) { }
}

// 等待链路就绪：健康则秒回。不挂任何事件——SDK 事件在页面 world 触发，跨 TM 沙箱
// 回调不可靠（WS 已连上、面板却超时的教训）；改为轮询可观察状态（跨 world 读已证实可靠）。
// connT1 后仍未连才主动重连（widget 自带 3 次重试，别抢它的活），connT2 总闸
var connGen = 0; // 递增使在途连接轮询失效：抽屉拆除后孤儿 poll 不再动共享单例（0.9.34）
export function imShutdown() { connGen++; }
export function ensureConnected(inst) {
  if (inst.connected && linkOk(inst)) return Promise.resolve();
  return new Promise(function (resolve, reject) {
    var start = Date.now(), forced = false, gen = connGen;
    (function poll() {
      if (gen !== connGen) return reject(new Error('im-cancelled'));
      var ok = false;
      try { ok = !!inst.connected && linkOk(inst); } catch (e) { }
      if (ok) return resolve();
      var t = Date.now() - start;
      if (t > CFG.im.connT2) return reject(new Error('im-connect-fail'));
      if (!forced && t > CFG.im.connT1) { forced = true; forceReconnect(inst); }
      ensureTracer(inst); // 注入时机无关紧要（send 时才读取），趁轮询顺手补上
      setTimeout(poll, 250);
    })();
  });
}

// 会话列表（最近联系人）：连接后服务端 sync 需要 1~2 拍，轮询到非空即止。
// 空列表是合法状态（从没私聊过），区分「超时仍空」与「真的没有」意义不大，统一返回 []。
// 导出供 sharepanel 消费（0.9.123 拆分：面板装载联系人行需要它）
export function getContacts(inst) {
  return new Promise(function (resolve) {
    var n = 0;
    (function poll() {
      var ss = [];
      try { ss = inst.kernel.getSessions() || []; } catch (e) { }
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
      try { inst.off('sendSucceed', onEvt); } catch (e) { }
      clearInterval(logPoll);
      if (err) reject(err); else resolve();
    }
    // sendSucceed 事件/回调若能触发则最快确认（跨 world 不可靠，仅作快路径）
    function onEvt(tid) { if (String(tid) === String(targetId)) settle(); }
    try { inst.on('sendSucceed', onEvt); } catch (e) { }
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
  } catch (e) { }
  return new Promise(function (resolve) {
    var start = Date.now();
    (function poll() {
      var busy = false;
      try { busy = !!(inst.kernel && inst.kernel.syncStatus && inst.kernel.syncStatus.isSyncing); } catch (e) { }
      if (!busy || Date.now() - start > 6000) return resolve();
      setTimeout(poll, 250);
    })();
  });
}

// 重建带病单例：weblog 缺失时站点（或我们）已创建的实例 tracer 永久损坏（send 必崩），
// 装好垫片后清掉 widget 类上的单例缓存强制重造。跨 world 直写可能失灵，失灵则自愈失败、
// 走正常失败提示（不恶化）
// 清掉 widget 类上的单例缓存：跨 world 直写可能静默失效（dbg.js 同款教训），
// 失效时退 delete 再试；仍不行就只能依赖 hadTracerCrash 时的可见报错
function resetSingleton(Ctor) {
  try {
    Ctor.instance = null;
    if (Ctor.instance) Ctor.instance = undefined;
    if (Ctor.instance) delete Ctor.instance;
  } catch (e) { }
}

function rebuildIm() {
  // 先同步占住单例槽再走异步衔接：重建期间（loadImSdk 在途）任何 ensureIm() 都会
  // 等到同一个 promise，而不是看到 null 又并行 new 一个（0.9.34 双单例窗口修复）
  var p = loadImSdk().then(function (Ctor) {
    ensureWeblogSync();
    resetSingleton(Ctor);
    var inst = new Ctor({ dev: false });
    imPromise = Promise.resolve(inst);
    return ensureConnected(inst).then(function () {
      // 水位推进（0.9.121）：tracer 已随 ensureWeblogSync 修复——此前历史崩溃不再计入误诊
      tracerFixedTotal = imLogTotal();
      return inst;
    });
  }, function (e) {
    if (imPromise === p) imPromise = null; // 加载失败弃槽，下次 ensureIm 可重试
    throw e;
  });
  imPromise = p;
  return p;
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
      try { csid = String((msg.rawMsg && msg.rawMsg.clientSeqId) || ''); } catch (e1) { }
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
        } catch (e) { }
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

// midground 服务令牌：IM 网关（message.acfun.cn）下载鉴权凭据。本页没有它的会话 Cookie
//（只有官方页访问过才有，浏览器重开即失——渲染 401 的根因），走 id.app.acfun.cn 的
// token/get 现换一枚（GM 带域 Cookie，未登录 -401）拼进下载 URL query（SDK 上传同款姿势）。
// 单飞 + 模块缓存；失败清缓存允许下次重取
var mgTokenP = null;
function midgroundToken(refresh) {
  if (!mgTokenP || refresh) {
    mgTokenP = gmRequest({
      method: 'POST',
      url: CFG.api.token, // 0.9.106 收口：此前内联硬编码与 cfg 重复一份（appapi 同端点）
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'sid=acfun.midground.api',
      timeout: CFG.time.gm
    }).then(function (j) {
      var t = j && j['acfun.midground.api_st'];
      if (!t) { mgTokenP = null; return ''; }
      return String(t);
    }, function () { mgTokenP = null; return ''; });
  }
  return mgTokenP;
}

// ---------- 图片字节：LRU 缓存 + 限流下载 ----------
// blob objectURL 的 LRU 缓存（key=资源本体：imgCacheKey 取 resourceId，缺则退整串 URL）：重开/来回切会话不再全量重下，命中直接秒显；
// 淘汰时 revoke，顺带修掉旧版 objectURL 永不回收的泄漏。查询在令牌之前——命中连 token/get
// 往返都省。已上屏的 blob 被 revoke 不影响显示（已解码位图仍在 img 里）
var imgBlobCache = new Map();
var IMG_BLOB_CACHE_MAX = 30;
function cacheBlobPut(url, blobUrl) {
  imgBlobCache.delete(url); // delete+set 搬队尾：命中即续命（LRU）
  imgBlobCache.set(url, blobUrl);
  while (imgBlobCache.size > IMG_BLOB_CACHE_MAX) {
    var k = imgBlobCache.keys().next().value;
    var u = imgBlobCache.get(k);
    imgBlobCache.delete(k);
    try { URL.revokeObjectURL(u); } catch (e0) { }
  }
}

// 下载并发上限：快滚长历史时也只保持 3 个在途 GM 请求，互不挤占带宽（FIFO 配对队列）
var imgQ = [], imgActive = 0, IMG_Q_LIMIT = 3;
function runQueuedImg(it) {
  it[0]().then(function (v) { imgActive--; pumpImgQ(); it[1](v); },
    function (e) { imgActive--; pumpImgQ(); it[2](e); });
}
function pumpImgQ() {
  while (imgActive < IMG_Q_LIMIT && imgQ.length) runQueuedImg(imgQ.shift());
}
function enqueueImg(job) {
  return new Promise(function (resolve, reject) {
    imgQ.push([job, resolve, reject]);
    pumpImgQ();
  });
}

// 在飞去重：同 URL 的并发调用（气泡加载中又点开大图）共享同一次下载
var imgInflight = new Map();

// 缓存 key 取资源本体（resourceId）而非完整 URL：重开会话内核换链可用性不定（0.9.41
// 「零会话依赖三级兜底」的同款前提），同一张图在「内核形态」与「本地拼装」两条路下
// URL 参数不同（userId/did/imsdkver 有无），按整串 URL 做 key 两条路互不命中——真机
// 首验「非秒出」的根因。两类形态产物都必带 resourceId 参数
function imgCacheKey(url) {
  var m = /[?&]resourceId=([^&]+)/.exec(url);
  return m ? m[1] : url;
}

// 只读窥缓存（不触发下载/令牌）：渲染路径同步命中直接上屏，免 IntersectionObserver
// 一拍延迟也不闪微光
export function peekImImageBlob(url) {
  var key = imgCacheKey(url);
  var hit = imgBlobCache.get(key);
  if (hit) cacheBlobPut(key, hit);
  return hit || null;
}

// 图片字节拉取：下载端按 Cookie 里的 midground 令牌鉴权（直链跨站没这张 Cookie 必 401，
// query 里带实测不认）。流程：查缓存/在飞 → id.app.acfun.cn token/get 现换令牌 → 写进
// .acfun.cn 父域 Cookie（message.acfun.cn 无自己的 host 级同名 Cookie 时即采用；本页可写
// 父域）→ GM 带 Cookie 拉字节换 blob。首拉不带 buster 让浏览器 HTTP 缓存跨刷新生效；
// 令牌被拒则强刷一枚、带 buster 重试一次（防命中可能已中毒的缓存响应）。
// 失败统一 null（降级 [图片] 文本）
export function fetchImImageBlob(url) {
  var key = imgCacheKey(url);
  var hit = imgBlobCache.get(key);
  if (hit) { cacheBlobPut(key, hit); return Promise.resolve(hit); }
  var flying = imgInflight.get(key);
  if (flying) return flying;
  function setMgCookie(tk) {
    if (!tk) return;
    try {
      document.cookie = 'acfun.midground.api_st=' + tk
        + '; domain=.acfun.cn; path=/; max-age=86400; SameSite=None; Secure';
    } catch (e0) { }
  }
  function once(bust) {
    var u = bust ? url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now() : url;
    return enqueueImg(function () {
      return gmRequest({ url: u, timeout: CFG.time.gm, responseType: 'arraybuffer', okStatus: true });
    });
  }
  function toBlob(buf) {
    try { return (buf && buf.byteLength) ? URL.createObjectURL(new Blob([buf])) : null; }
    catch (e) { return null; }
  }
  var p = midgroundToken(false).then(function (tk) {
    setMgCookie(tk);
    return once(false);
  }, function () { return once(false); }).then(toBlob, function () {
    // 401/网络错：令牌可能过期，强刷一枚重写 Cookie 再试一次
    return midgroundToken(true).then(function (tk) {
      setMgCookie(tk);
      return once(true);
    }, function () { return once(true); }).then(toBlob, function () { return null; });
  }).then(function (blobUrl) {
    imgInflight.delete(key); // 链路终态恒 resolve（失败也是 null），清在飞允许下次重试
    if (blobUrl) cacheBlobPut(key, blobUrl);
    return blobUrl;
  });
  imgInflight.set(key, p);
  return p;
}

// 令牌预热：开抽屉即单飞换好令牌写好 Cookie，进会话首图免去 token/get 串行往返。
// midgroundToken 单飞缓存本身幂等，缓存命中时此令牌用不上也无副作用
export function prewarmIm() {
  midgroundToken(false);
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
          } catch (e1) { }
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
        } catch (e1) { }
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
        } catch (e1) { }
        resolve(sendKernel(i, Txt.create({
          targetType: 0, targetId: Number(targetId), text: text, extra: extra
        }), targetId));
      } catch (e) { reject(e); }
    });
  });
}
