import { stat } from './dbg.js';
import { ensureResolved } from './api.js';
import { FeedStore } from './feedstore.js';
import { scroller } from './state.js';

// ---- 预热与预连接：把解析 RTT 移出划动路径 ----
// 渲染窗口只给 cur/cur+1 挂 video；快速连划时 cur+2 还没解析，挂载要等
// douga/info+playInfo 两连击。索引稳定 500ms 后预热 cur+1/cur+2 的懒解析
// （cur+1 通常已被窗口挂载触发，ensureResolved 在途复用天然去重）；
// 解析出的媒体 CDN 域名动态补 preconnect，首片免 DNS+TCP+TLS 握手。
var prewarmTimer = null;
export function prewarm(idx) {
  if (prewarmTimer) clearTimeout(prewarmTimer);
  prewarmTimer = setTimeout(function () {
    prewarmTimer = null;
    if (!scroller || FeedStore.current !== idx) return; // 期间又划走了
    for (var i = idx + 1; i <= idx + 2; i++) {
      (function (it) {
        if (!it || !it.cap.lazyResolve || it.urls.length || it._resolveP) return;
        stat('prewarm');
        ensureResolved(it).then(function (ok) {
          if (!ok || !it.urls.length) return;
          try { preconnect(new URL(it.urls[0]).origin); } catch (e) { }
        });
      })(FeedStore.items[i]);
    }
  }, 500);
}

// 动态 preconnect（官方页面 head 同款手段）。hls.js 分片走页面 XHR（CORS），
// 需 crossorigin 匿名连接才可复用；上限防 link 堆积。链接保留在 head（重进会话免重握手）
var preconnectSeen = {};
var preconnectLinks = [];
export function preconnect(origin) {
  if (!origin || preconnectSeen[origin]) return;
  preconnectSeen[origin] = 1;
  if (preconnectLinks.length >= 6) return;
  var link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  preconnectLinks.push(link);
  stat('preconnect');
}
// 官方页面的媒体域静态清单：首条 home 视频的首片也吃到预热
var PRECONNECT_SEED = ['https://tx-safety-video.acfun.cn', 'https://ali-safety-video.acfun.cn'];
export function preconnectSeed() { PRECONNECT_SEED.forEach(preconnect); }
