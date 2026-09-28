import { CFG } from './cfg.js';
import { root } from './state.js';
import { FeedStore } from './feedstore.js';

// ---------- 路由 ----------
var routeRe = new RegExp('^' + CFG.hash + '(?:\\/(\\d+))?'); // 预编译：keyHandler/hashchange 高频触达

export function parseRoute() {
  var h = location.hash.replace(/^#\/?/, '');
  var m = h.match(routeRe);
  return {
    active: !!m || location.pathname === '/' + CFG.hash,
    mid: m && m[1] ? m[1] : null
  };
}

export function isFeedRoute() {
  return parseRoute().active;
}

// 地址栏跟随当前视频：#svfeed/<meowId>，刷新/分享可回到同一条。
// 快速连续滑动会高频触发，150ms 尾节流收敛 replaceState 次数（结束后必然落到最后一条）
var hashTimer = null, hashPending = -1;
export function syncHash(idx) {
  if (!root) return;
  hashPending = idx;
  if (hashTimer) return;
  hashTimer = setTimeout(function () {
    hashTimer = null;
    if (!root) return;
    var it = FeedStore.items[hashPending];
    if (!it) return;
    try {
      history.replaceState(null, '',
        location.pathname + location.search + '#' + CFG.hash + '/' + it.id);
    } catch (e) { }
  }, 150);
}
