// test/cases/hls.js —— harness 场景：hls.js 懒 eval（0.9.164）与封原生回落（0.9.180）
// 机制：build.js 把 hls.min.js 内嵌为字符串常量 window.__ACSV_HLS_SRC__（banner 段），
// 页面加载不再编译整份 hls——ensureHls 首调才 new Function 编译执行。harness 全部 mock
// 播放走 cap.hls=false 直链（api.js 直挂缝），无人提前触发 ensureHls ⇒ 「加载后未定义」可断言。
//   hls-lazy：加载后内嵌串在场且 Hls 未定义 → 经测试钩子调 ensureHls → Hls.isSupported 为真
//   hls-sealed（0.9.180）：playInfo 桩改吐 m3u8（appapi.resolve 的非 m3u8 守卫放行 ⇒ cap.hls
//   保持 true）→ setFail 缝令 ensureHls 拒绝 → 播放层 home 条目深链挂载 ⇒ 断言：落 error 态、
//   video 无 src（m3u8 未落原生管线）、错误盒可见、attach.cdnFail 计数在场
// 反跑：build.js 恢复 eager 拼代码 ⇒ hls-not-parsed-on-load 转红（脚本求值即定义 window.Hls）；
// session 还原旧回落（video.src = url）⇒ hls-sealed-no-native 转红（video 拿到 m3u8 直链）
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
  C['hls-sealed'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, TEST = h.TEST;
    // playInfo 桩改吐 m3u8（harness 同源 404 地址——封印生效则根本不会被取）：resolve 链
    // 守卫按 URL 判 hls ⇒ cap.hls 保持 true，挂载必走 ensureHls 管线
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'playInfo': function () {
        return { playInfo: { streams: [{ qualityLabel: '1080P', fps: 30, playUrls: [location.origin + '/nope-404.m3u8'] }] } };
      }
    });
    // play.js 顶层给 488900 留过直挂缝（webm → cap.hls=false，绕开 hls 管线）；本场景要真走
    // resolve，清掉它（否则深链条目被接到直挂缝上，测不到挂载分支）
    delete window.__ACSV_MOCK_DIRECT__;
    TEST.call('hls').setFail(true); // hls.js 彻底不可得（模拟内嵌串编译被拒/CDN 全灭）
    location.hash = 'svfeed/play/a/488900'; // 播放层深链（home 条目：懒解析 → m3u8）
    rec('hls-sealed-open', !!(await waitFor(function () {
      return !!q('.acsv-slide[data-ovl="1"]');
    }, 10000)), location.hash);
    var s = q('.acsv-slide[data-ovl="1"]');
    rec('hls-sealed-error', !!(await waitFor(function () {
      var el = q('.acsv-slide[data-ovl="1"]');
      return !!el && el.dataset.state === 'error';
    }, 8000)), s ? ('state=' + s.dataset.state) : 'no-slide');
    var v = s && s.querySelector('video');
    rec('hls-sealed-no-native', !!v && !v.getAttribute('src') && !v.src,
      v ? ('src=' + JSON.stringify(v.getAttribute('src'))) : 'no-video');
    rec('hls-sealed-errbox', (function () {
      var eb = q('.acsv-slide[data-ovl="1"] .acsv-errbox');
      return !!eb && eb.offsetParent !== null; // 可见性查 offsetParent（0.9.62 黑屏教训）
    })());
    rec('hls-sealed-stat', (TEST.getStats()['attach.cdnFail'] || 0) >= 1);
  };
})();
