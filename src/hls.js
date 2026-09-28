import { CFG } from './cfg.js';
import { set } from './dbg.js';

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
