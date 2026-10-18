// ---------- 私信 SDK 基建（0.9.270 自 imsend.js 拆出，纯搬迁） ----------
// 本模块 = SDK 加载/注入/补丁（源码补丁 + Blob 执行 + tracer 手术 + 日志黑匣子/weblog 垫片）
// + 单例连接与重连 + 崩溃水位判据。发送核心（doSend/withSendRecovery/sendKernel/sendQuote/
// sendImage/sendCmtShare/sendMomentShare）与联系人/头像留在 imsend.js。
// 边界（拆件评估标记的高风险专项）：`imPromise`（单例槽）、`connGen`（在途轮询世代）、
// `tracerFixedTotal`（崩溃水位）三处跨切状态**整组随 SDK 走**——imsend 的 withSendRecovery
// 只经本模块出口 hadTracerCrash()/rebuildIm() 读，不另持副本。`rebuildIm` 的水位推进仍在
// `ensureConnected` 成功后执行；拆件为纯搬迁，0.9.274 另修了日志累计水位与构造失败弃槽。
// 网页端私信没有 REST 发送端点：官方自己走快手 ImSdk（klink WebSocket + protobuf），
// SDK CDN 与用法取自站点顶栏 newHeader 原版逻辑（$.getScript(globalConfig.imsdkcdn) 后
// new ImSdk({dev:false})）。构造是单例：若顶栏已建实例则复用同一条 WS 连接，不重复握手。
// 全链路失败均降级为「复制链接」，不阻断分享。

import { CFG } from './cfg.js';
import { stat, set, swallow } from './dbg.js';
import { gmRequest } from './net.js';
import { cookieVal } from './ui.js';

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
    } catch (e) { /* best-effort: parse */ }
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
    } catch (e) { swallow(e, 'imsend'); }
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
  } catch (e) { swallow(e, 'imsend'); }
}
// 「直写 unsafeWindow → 失败再内联 script」统一出口：installer 是自包含函数（页面
// world 无闭包变量可引用），installed(w) 探测注入是否已生效。返回 true = 本次注入过
function injectPageFn(installer, installed) {
  var w = pageWin();
  if (installed(w)) return false;
  try { installer(w); } catch (e) { swallow(e, 'imsend'); } // 直写 unsafeWindow：多数 TM 组合可用
  if (installed(w)) return false;
  try {
    var s = document.createElement('script');
    s.textContent = '(' + installer.toString() + ')(window);';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e2) { /* best-effort: sdk */ }
  return true;
}

function ensureLocalLog() {
  injectPageFn(logInstaller, function (w) { return w.localLog && w.__acsvImLog; });
}
// 发送前水位 = **累计写入数**（drop + 当前缓冲长度）。不能只取数组 length：滚动缓冲
// shift() 会让下标整体漂移；发送期间缓冲滚过一轮时，旧下标会越过新缓冲末尾 ⇒ 本次
// 成功/失败日志永远扫不到 ⇒ doSend 超时 ⇒ withSendRecovery 重试 ⇒ 可能重复私信。
// 与 tracerCrashAfter 的绝对序号口径同源（0.9.121）。
export function imLogMark() {
  try { return imLogTotal(); } catch (e) { return 0; }
}
// 从累计水位 mark 起按绝对序号扫描：成功/失败谁先出现算谁（混入多条时保序）
export function imLogVerdict(mark) {
  var s = { lines: [], drop: 0 };
  try { s = imLogState(); } catch (e) { swallow(e, 'imsend'); }
  var buf = s.lines || [], drop = Number(s.drop) || 0, from = Number(mark) || 0;
  for (var i = 0; i < buf.length; i++) {
    if (drop + i < from) continue;
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
// 累计水位（imLogMark = drop + length）失去连续性 → 该发送超时终局 → withSendRecovery
// 重试 → 若原发送实际已成功 = 重复私信；水位+驱逐计数无此险（0.9.274 起 imLogVerdict
// 也按绝对序号扫，与 tracerCrashAfter 同口径）。
var tracerFixedTotal = 0;
export function hadTracerCrash() {
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
    try { sp = G.__acsvOrigStart ? G.__acsvOrigStart.apply(this, arguments) : null; } catch (e) { swallow(e, 'imsend'); }
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
  var t0 = Date.now(); // 埋点（0.9.244，对标 hls.evalMs）：fetch+补丁+注入 → 拿到构造器的总耗时
  return new Promise(function (resolve, reject) {
    ensureLocalLog();
    ensureWeblogSync();
    var w = pageWin();
    var src = (w.globalConfig && w.globalConfig.imsdkcdn) || CFG.api.imsdk;
    if (src.indexOf('//') === 0) src = 'https:' + src;
    var settled = false;
    function done(fn, val) {
      if (settled) return;
      settled = true;
      if (fn === resolve) { stat('im.sdkLoad'); set('im.loadMs', Date.now() - t0); }
      fn(val);
    }
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
  var p = loadImSdk().then(function (Ctor) {
    // 单例直接复用：站点实例若已存在，其连接与同步缓存都是现成的（tracer 缺陷由
    // ensureTracer 注入修复，无需重造）。复用语义在 SDK 构造器内部（构造即单例）
    return new Ctor({ dev: false });
  });
  // 弃槽覆盖两层失败：加载失败与**构造器抛错**。旧写法的 rejection 回调只接住前者；
  // new Ctor 抛错时 imPromise 会永久停在 rejected，后续 ensureIm 永远不再重试。
  p.then(null, function () { if (imPromise === p) imPromise = null; });
  imPromise = p;
  return p;
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
  try { inst.connected = false; inst.retryNum = 0; inst.connect(); } catch (e) { swallow(e, 'imsend'); }
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
  } catch (e3) { /* best-effort: sdk */ }
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
      try { ok = !!inst.connected && linkOk(inst); } catch (e) { swallow(e, 'imsend'); }
      if (ok) return resolve();
      var t = Date.now() - start;
      if (t > CFG.im.connT2) return reject(new Error('im-connect-fail'));
      if (!forced && t > CFG.im.connT1) { forced = true; forceReconnect(inst); }
      ensureTracer(inst); // 注入时机无关紧要（send 时才读取），趁轮询顺手补上
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
  } catch (e) { swallow(e, 'imsend'); }
}

export function rebuildIm() {
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
  // 构造器抛错同样弃槽（同 ensureIm；0.9.274）
  p.then(null, function () { if (imPromise === p) imPromise = null; });
  return p;
}
