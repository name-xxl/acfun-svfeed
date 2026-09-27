import { CFG } from './cfg.js';

// ---------- hls.js 懒加载 ----------
// 推荐模式的播放直链是 m3u8；Safari 原生支持，Chromium 系需要 hls.js。
// 不用 @require 常驻：GM_xhr 拉文本后 Function 执行（不吃页面 CSP），只在首个 m3u8 视频时加载一次。
var loading = null;

export function nativeHls(video) {
  try { return !!video.canPlayType('application/vnd.apple.mpegurl'); }
  catch (e) { return false; }
}

export function ensureHls() {
  if (window.Hls && window.Hls.isSupported) return Promise.resolve(window.Hls);
  if (loading) return loading;
  loading = new Promise(function (resolve, reject) {
    function ok() {
      if (window.Hls && window.Hls.isSupported) resolve(window.Hls);
      else reject(new Error('hls-load-failed'));
    }
    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: 'GET',
        url: CFG.api.hlsCdn,
        timeout: 20000,
        onload: function (r) {
          try { (new Function(r.responseText))(); ok(); }
          catch (e) { reject(e); }
        },
        onerror: function () { reject(new Error('hls-network')); },
        ontimeout: function () { reject(new Error('hls-timeout')); }
      });
    } else {
      var s = document.createElement('script');
      s.src = CFG.api.hlsCdn;
      s.onload = ok;
      s.onerror = function () { reject(new Error('hls-network')); };
      (document.head || document.documentElement).appendChild(s);
    }
  }).catch(function (e) { loading = null; throw e; });
  return loading;
}
