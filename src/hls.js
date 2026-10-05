import { CFG } from './cfg.js';
import { stat, set, testHook } from './dbg.js';

// ---------- hls.js 懒加载 ----------
// 推荐模式的播放直链是 m3u8；Safari 原生支持，Chromium 系需要 hls.js。
// 0.9.14 起构建期内嵌进产物；0.9.164 起内嵌形态从「可执行代码」改为「字符串字面量」
// （window.__ACSV_HLS_SRC__，build.js 注入）——页面加载只解析一个字符串常量，首个 m3u8
// 挂载前 ensureHls 才 new Function 编译执行（不吃页面 CSP），非竖刷页不再白付 ~1MB 编译。
// 串缺失（构建机没装 hls.js）/损坏时静默落下方 CDN 逐源兜底（GM_xhr 文本 + Function 执行）。
var loading = null;
var evalTried = false; // 内嵌串只试一次：缺失/语法损坏不会自愈，失败即定局交给 CDN

export function nativeHls(video) {
  try { return !!video.canPlayType('application/vnd.apple.mpegurl'); }
  catch (e) { return false; }
}

export function ensureHls() {
  if (window.Hls && window.Hls.isSupported) return Promise.resolve(window.Hls);
  if (loading) return loading;
  loading = new Promise(function (resolve, reject) {
    if (!evalTried) {
      evalTried = true;
      var src = window.__ACSV_HLS_SRC__;
      if (src) {
        var t0 = Date.now();
        try { (new Function(src))(); } catch (e) { }
        stat('hls.lazyEval');
        set('hls.evalMs', Date.now() - t0);
        if (window.Hls && window.Hls.isSupported) return resolve(window.Hls);
      }
    }
    var urls = CFG.api.hlsCdns;
    var i = 0;
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
            try { (new Function(r.responseText))(); ok(); }
            catch (e) { next(); }
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
    ready: function () { return !!(window.Hls && window.Hls.isSupported); }
  };
});
