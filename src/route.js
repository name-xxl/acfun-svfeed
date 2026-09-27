import { CFG } from './cfg.js';
import { root } from './state.js';
import { FeedStore } from './feedstore.js';

// ---------- 路由 ----------
export function parseRoute() {
  var h = location.hash.replace(/^#\/?/, '');
  var m = h.match(new RegExp('^' + CFG.hash + '(?:\\/(\\d+))?'));
  return {
    active: !!m || location.pathname === '/' + CFG.hash,
    mid: m && m[1] ? m[1] : null
  };
}

export function isFeedRoute() {
  return parseRoute().active;
}

// 地址栏跟随当前视频：#svfeed/<meowId>，刷新/分享可回到同一条
export function syncHash(idx) {
  if (!root) return;
  var it = FeedStore.items[idx];
  if (!it) return;
  try {
    history.replaceState(null, '',
      location.pathname + location.search + '#' + CFG.hash + '/' + it.id);
  } catch (e) { }
}
