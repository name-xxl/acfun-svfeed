import { CFG } from './cfg.js';
import { stat, set, testHook } from './dbg.js';

// ---------- hls.js 懒加载 ----------
// 推荐模式的播放直链是 m3u8；Safari 原生支持，Chromium 系需要 hls.js。
// 0.9.14 起构建期内嵌进产物；0.9.164 起内嵌形态从「可执行代码」改为「字符串字面量」
// （window.__ACSV_HLS_SRC__，build.js 注入）——页面加载只解析一个字符串常量，首个 m3u8
// 挂载前 ensureHls 才 new Function 编译执行（不吃页面 CSP），非竖刷页不再白付这份编译。
// 串缺失（构建机没装 hls.js）/损坏时静默落下方 CDN 逐源兜底（GM_xhr 文本 + Function 执行）。
//
// 0.9.181 修「编译了却取不到类」双坑（真机读数实锤：hls.lazyEval=1 / evalMs=9（真实解析
// 耗时，非秒拒）却 window.Hls 无值、attach.cdnFail 增长——即 0.9.164 起 TM 实机 hls 装载
// 一直静默失败，旧版回落原生 HLS 管线（=冻结专项的问题管线）在「播放」，0.9.180 封印后
// 才暴露为「视频加载失败」）：
//   ① world 分裂：TM 隔离沙箱下 new Function 的全局落点与脚本 window 未必同一对象
//      （0.9.30「window.ImSdk 恒 undefined」同款），编译完再回头读 window 会落空；
//   ② UMD 逃逸：hls.js 的 rollup UMD 在页面存在 AMD define 或 CJS module/exports 时
//      走注册分支、不落全局。
// 修法=「返回式取数 + 分支遮罩」：取数尾拼进同一段被编译源码（同一 realm 内取回，绕开
// world 读）；wrapper 形参把 define/module/exports 遮成 undefined（UMD 必走 globalThis.Hls
// 分支）。取回后回填 window.Hls，脚本 world 的后续快路径才命中。
var loading = null;
var evalTried = false; // 内嵌串只试一次：缺失/语法损坏不会自愈，失败即定局交给 CDN
var forceFail = false; // 测试缝（仅 debug 经 testHook 置位）：模拟 hls.js 彻底不可得

// 取数尾：优先裸 Hls（UMD 赋值 globalThis.Hls 后，同 realm 的标识符解析必命中——属性
// 赋值即可被全局标识符解析到），globalThis/module/exports 三臂为保险（遮罩失效或源码
// 形态变化时不至全哑）。前置 \n; 防源码尾部行注释吞掉本段
var GRAB = '\n;return (typeof Hls === "function" && Hls)'
  + ' || (typeof globalThis !== "undefined" && globalThis.Hls)'
  + ' || (typeof module === "object" && module && typeof module.exports === "function" && module.exports)'
  + ' || (typeof exports === "object" && exports && typeof exports.Hls === "function" && exports.Hls)'
  + ' || null;';

// 编译执行 hls 源码并取回类；不可得返回 null（异常摘要进 debug 打点 hls.evalErr）。
// 形参遮罩 define/module/exports 是**有意**的（见头注②）：不是要那三个值，是要它们为 undefined
function evalHlsSource(src) {
  var Got = null;
  try {
    Got = (new Function('(function (define, module, exports) {\n' + src + GRAB + '\n})(void 0, void 0, void 0);'))();
  } catch (e) { set('hls.evalErr', String((e && e.message) || e).slice(0, 140)); }
  if (!Got && window.Hls && window.Hls.isSupported) Got = window.Hls; // 页面 world 直执行路径本就落 window
  if (Got && Got.isSupported) { try { window.Hls = Got; } catch (e) { } return Got; }
  return null;
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
    if (!evalTried) {
      evalTried = true;
      var src = window.__ACSV_HLS_SRC__;
      if (src) {
        var t0 = Date.now();
        var Got = evalHlsSource(src);
        stat('hls.lazyEval');
        set('hls.evalMs', Date.now() - t0);
        if (Got) return resolve(Got);
      }
    }
    var urls = CFG.api.hlsCdns;
    var i = 0;
    // 脚本标签分支（无 GM 环境）：页面 world 直执行，类落可读的 window——直读即可
    function ok() {
      if (window.Hls && window.Hls.isSupported) { set('hls.cdnIdx', i - 1); resolve(window.Hls); }
      else reject(new Error('hls-load-failed'));
    }
    // 逐源尝试：单源失败（网络封锁/超时/文本损坏）自动换下一个，全灭才 reject
    function next() {
      if (i >= urls.length) return reject(new Error('hls-network'));
      var url = urls[i++];
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          timeout: CFG.time.gm,
          onload: function (r) {
            var Got = evalHlsSource(r.responseText); // 同款取数：文本编译加载走同一条 world/UMD 修法
            if (Got) { set('hls.cdnIdx', i - 1); resolve(Got); }
            else next();
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
  }).catch(function (e) { loading = null; throw e; });
  return loading;
}

// debug 测试钩子：harness 断言「页面加载后 Hls 未定义 → ensureHls 触发内嵌串编译」（0.9.164）
testHook('hls', function () {
  return {
    ensure: ensureHls,
    ready: function () { return !!(window.Hls && window.Hls.isSupported); },
    // 0.9.180：置位后 ensureHls 一律拒绝——钉「hls.js 不可得时 session 不落原生回落」
    setFail: function (v) { forceFail = !!v; }
  };
});
