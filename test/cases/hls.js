// test/cases/hls.js —— harness 场景：hls.js 懒 eval（0.9.164）
// 机制：build.js 把 hls.min.js 内嵌为字符串常量 window.__ACSV_HLS_SRC__（banner 段），
// 页面加载不再编译整份 hls——ensureHls 首调才 new Function 编译执行。harness 全部 mock
// 播放走 cap.hls=false 直链（api.js 直挂缝），无人提前触发 ensureHls ⇒ 「加载后未定义」可断言。
//   hls-lazy：加载后内嵌串在场且 Hls 未定义 → 经测试钩子调 ensureHls → Hls.isSupported 为真
// 反跑：build.js 恢复 eager 拼代码 ⇒ hls-not-parsed-on-load 转红（脚本求值即定义 window.Hls）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['hls-lazy'] = async function (h) {
    var rec = h.rec;
    var srcLen = (window.__ACSV_HLS_SRC__ || '').length;
    rec('hls-src-embedded', srcLen > 300000, 'len=' + srcLen); // hls.min.js 实测 415,253 字节（转义后 ~421K）
    rec('hls-not-parsed-on-load', !(window.Hls && window.Hls.isSupported));
    var hook = window.__ACSV_TEST__.call('hls');
    rec('hls-hook-idle', !!hook && !hook.ready());
    await hook.ensure();
    rec('hls-loaded-after-ensure', !!(window.Hls && window.Hls.isSupported));
    rec('hls-eval-counted', (window.__ACSV_TEST__.getStats()['hls.lazyEval'] || 0) >= 1);
  };
})();
