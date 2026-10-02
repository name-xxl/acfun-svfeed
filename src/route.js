import { CFG } from './cfg.js';
import { root } from './state.js';
import { FeedStore } from './feedstore.js';

// ---------- 路由 ----------
// 全锚定（$）：#svfeedother 之类前缀粘连串不算竖刷路由（旧版无锚定的语法松散，0.9.62 顺修）
var routeRe = new RegExp('^' + CFG.hash + '(?:/(\\d+))?$');           // 竖刷深链：svfeed / svfeed/<id>
var viewRe = new RegExp('^' + CFG.hash + '/([a-z]+)(?:/(\\d+))?$');   // 子视图：svfeed/my、svfeed/zone/59

// 纯解析（导出供单测）：hash 字符串 → { active, mid, view, viewArg }。
// 数字段=视频深链、字母段=子视图，语法天然互斥；脏输入一律降级为非竖刷路由
export function parseHash(h) {
  h = String(h == null ? '' : h).replace(/^#\/?/, '');
  var m = h.match(routeRe);
  var v = h.match(viewRe);
  return {
    active: !!(m || v),
    mid: m && m[1] ? m[1] : null,
    view: v ? v[1] : null,
    viewArg: v && v[2] ? v[2] : null
  };
}

export function parseRoute() {
  var r = parseHash(location.hash);
  r.active = r.active || location.pathname === '/' + CFG.hash;
  return r;
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
    // 子视图打开期间不回写深链：replaceState 不触发 hashchange，会把 #svfeed/<view>
    // 无声踩掉（视图 DOM/浮层栈还在而地址已变，Esc 回写判定随之失效——0.9.62 场景实测踩实）
    if (parseRoute().view) return;
    var it = FeedStore.items[hashPending];
    if (!it) return;
    try {
      history.replaceState(null, '',
        location.pathname + location.search + '#' + CFG.hash + '/' + it.id);
    } catch (e) { }
  }, 150);
}
