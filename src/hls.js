import { CFG } from './cfg.js';
import { stat, set, testHook } from './dbg.js';

// ---------- hls.js 懒加载 ----------
// 推荐模式的播放直链是 m3u8；Safari 原生支持，Chromium 系需要 hls.js。
// 0.9.14 起构建期内嵌进产物；0.9.164 起内嵌形态从「可执行代码」改为「字符串字面量」
// （window.__ACSV_HLS_SRC__，build.js 注入）——页面加载只解析一个字符串常量，首个 m3u8
// 挂载前 ensureHls 才编译执行，非竖刷页不再白付这份编译。
// 装载三层（逐层下沉，任一层成功即止）：
//   ① eval 收编：new Function 编译执行 + 「同 realm 返回式取数 + UMD 分支遮罩」（0.9.181，
//      治「编译了取不回类」——TM 沙箱全局落点与脚本 window 未必同对象；页面有 CJS
//      module/exports 或 AMD define 时 rollup UMD 会走注册分支不落全局）；
//   ② Blob 脚本：内嵌串/CDN 文本做成 Blob URL 以 <script> 注入，脚本在**页面 world**执行，
//      绕开沙箱对 Function/全局语义的干扰（0.9.182，治「秒拒」——实机 evalMs 9→1，构造期
//      即抛）。与 IM SDK 装载同机制（0.9.41 起实机实证可用；依赖页面 script-src 含 blob:，
//      A 站满足）；onload 后经 pageWin()（unsafeWindow，0.9.30 同款跨 world 读法）读回类；
//   ③ CDN 逐源兜底：GM_xhr 拉文本（先 eval 后 blob）；无 GM 环境退回 <script> 直挂 CDN。
// 串缺失（构建机没装 hls.js）/全层失败 → 按 0.9.180 封印语义落 error 态（不回退原生 HLS
// ——v0.9.14 冻结专项定案 Chromium 原生管线最小化往返冻死）。
// 分层落点全部打点（hls.evalOk/evalNoClass/evalNoMse/blobOk/blobNoClass/blobErr/blobTimeout
// /blobNoUrl + hls.evalErr 异常摘要 + hls.cdnIdx），实机归因一轮读数即可定位。
var loading = null;
var evalTried = false; // 内嵌串只试一次：缺失/语法损坏不会自愈，失败即定局交给下沉层
var forceFail = false; // 测试缝（仅 debug 经 testHook 置位）：模拟 hls.js 彻底不可得
var evalOff = false; // 测试缝（仅 debug）：跳过 eval 层，专测 blob 层

// 取数尾：优先裸 Hls（UMD 赋值 globalThis.Hls 后，同 realm 的标识符解析必命中——属性
// 赋值即可被全局标识符解析到），globalThis/module/exports 三臂为保险（遮罩失效或源码
// 形态变化时不至全哑）。前置 \n; 防源码尾部行注释吞掉本段
var GRAB = '\n;return (typeof Hls === "function" && Hls)'
  + ' || (typeof globalThis !== "undefined" && globalThis.Hls)'
  + ' || (typeof module === "object" && module && typeof module.exports === "function" && module.exports)'
  + ' || (typeof exports === "object" && exports && typeof exports.Hls === "function" && exports.Hls)'
  + ' || null;';

// 跨 world 读页面变量（imsend.pageWin 同款）：TM 隔离沙箱下页面 world 的变量须经
// unsafeWindow 读；无 TM 环境退回 window
function pageWin() {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}

// 页面 world 的 Hls 探测（blob 层读回）：unsafeWindow 优先、window 兜底，两者都要过
// isSupported；拿不到返回 null
function probeHls() {
  var cands = [pageWin(), window];
  for (var i = 0; i < cands.length; i++) {
    var G = null;
    try { G = cands[i] && cands[i].Hls; } catch (e) { }
    if (G && typeof G.isSupported === 'function' && G.isSupported()) return G;
  }
  return null;
}

// ① eval 收编：编译执行并取回类；不可得返回 null（异常摘要进 hls.evalErr，结局进分层计数）。
// 形参遮罩 define/module/exports 是**有意**的（见头注①）：不是要那三个值，是要它们为 undefined
function evalHlsSource(src) {
  var Got = null;
  try {
    Got = (new Function('(function (define, module, exports) {\n' + src + GRAB + '\n})(void 0, void 0, void 0);'))();
  } catch (e) { set('hls.evalErr', String((e && e.message) || e).slice(0, 140)); }
  if (!Got && window.Hls && window.Hls.isSupported) Got = window.Hls; // 页面 world 直执行路径本就落 window
  if (Got && Got.isSupported) { try { window.Hls = Got; } catch (e) { } stat('hls.evalOk'); return Got; }
  stat(Got ? 'hls.evalNoMse' : 'hls.evalNoClass');
  return null;
}

// ② Blob 脚本层：脚本于页面 world 执行，类落页面 window——经 probeHls 跨 world 读回。
// 超时/onerror/读空按失败下沉（各记一档计数）。CFG.time.gm 当看门狗（同 IM SDK 装载）
function loadViaBlob(src) {
  return new Promise(function (resolve) {
    var url;
    try { url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); }
    catch (e) { stat('hls.blobNoUrl'); return resolve(null); }
    var s = document.createElement('script');
    var done = false;
    var timer = setTimeout(function () { fin(null, 'hls.blobTimeout'); }, CFG.time.gm);
    function fin(G, failKey) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { URL.revokeObjectURL(url); } catch (e) { }
      try { s.remove(); } catch (e) { }
      if (G) {
        try { window.Hls = G; } catch (e) { } // 脚本 world 回填，后续快路径命中
        stat('hls.blobOk');
        resolve(G);
      } else {
        stat(failKey || 'hls.blobErr');
        resolve(null);
      }
    }
    s.onload = function () {
      var G = probeHls();
      fin(G, G ? null : 'hls.blobNoClass');
    };
    s.onerror = function () { fin(null, 'hls.blobErr'); };
    s.src = url;
    (document.head || document.documentElement).appendChild(s);
  });
}

export function nativeHls(video) {
  try { return !!video.canPlayType('application/vnd.apple.mpegurl'); }
  catch (e) { return false; }
}

export function ensureHls() {
  if (forceFail) return Promise.reject(new Error('hls-test-fail'));
  if (window.Hls && window.Hls.isSupported) return Promise.resolve(window.Hls);
  if (loading) return loading;
  loading = new Promise(function (resolve, reject) {
    // ③ CDN 逐源兜底：单源失败（网络封锁/超时/文本损坏）自动换下一个，全灭才 reject
    function cdnChain() {
      var urls = CFG.api.hlsCdns;
      var i = 0;
      // 脚本标签分支（无 GM 环境）：页面 world 直执行，类落可读的 window——直读即可
      function ok() {
        if (window.Hls && window.Hls.isSupported) { set('hls.cdnIdx', i - 1); resolve(window.Hls); }
        else reject(new Error('hls-load-failed'));
      }
      function next() {
        if (i >= urls.length) return reject(new Error('hls-network'));
        var url = urls[i++];
        if (typeof GM_xmlhttpRequest === 'function') {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: CFG.time.gm,
            onload: function (r) {
              var Got = evalHlsSource(r.responseText); // 文本同样先试 eval 再试 blob
              if (Got) { set('hls.cdnIdx', i - 1); resolve(Got); return; }
              loadViaBlob(r.responseText).then(function (G2) {
                if (G2) { set('hls.cdnIdx', i - 1); resolve(G2); }
                else next();
              });
            },
            onerror: next,
            ontimeout: next
          });
        } else {
          var s = document.createElement('script');
          s.src = url;
          s.onload = ok;
          s.onerror = next;
          (document.head || document.documentElement).appendChild(s);
        }
      }
      next();
    }
    var src = null;
    if (!evalTried) { evalTried = true; src = window.__ACSV_HLS_SRC__; }
    if (!src) return cdnChain();
    var t0 = Date.now();
    var Got = evalOff ? null : evalHlsSource(src);
    stat('hls.lazyEval');
    set('hls.evalMs', Date.now() - t0);
    if (Got) return resolve(Got);
    loadViaBlob(src).then(function (G2) { if (G2) resolve(G2); else cdnChain(); });
  }).catch(function (e) { loading = null; throw e; });
  return loading;
}

// debug 测试钩子：harness 断言「页面加载后 Hls 未定义 → ensureHls 触发内嵌串编译」（0.9.164）
testHook('hls', function () {
  return {
    ensure: ensureHls,
    ready: function () { return !!(window.Hls && window.Hls.isSupported); },
    // 0.9.180：置位后 ensureHls 一律拒绝——钉「hls.js 不可得时 session 不落原生回落」
    setFail: function (v) { forceFail = !!v; },
    // 0.9.182：跳过 eval 层——钉「eval 拿不回类时 blob 层顶上」（实机秒拒形态的确定性复现）
    setEvalOff: function (v) { evalOff = !!v; }
  };
});
