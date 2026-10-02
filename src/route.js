import { CFG } from './cfg.js';
import { root } from './state.js';
import { FeedStore } from './feedstore.js';

// ---------- 路由 ----------
// 全锚定（$）：#svfeedother 之类前缀粘连串不算竖刷路由（旧版无锚定的语法松散，0.9.62 顺修）
var routeRe = new RegExp('^' + CFG.hash + '(?:/(\\d+))?$');           // 裸深链（0.9.72 前的历史链接）：svfeed / svfeed/<id>
var markRe = new RegExp('^' + CFG.hash + '/([va])/(\\d+)$');          // 标记深链：svfeed/v/<meowId>、svfeed/a/<acId>
var viewRe = new RegExp('^' + CFG.hash + '/([a-z]+)(?:/([^/]+))?$');   // 子视图：svfeed/my、svfeed/zone/59、svfeed/search/<kw>

// 视图参数解码（0.9.72）：search 的关键词是 URL 编码中文（#svfeed/search/%E5%B0%8F%E8%AF%B4）；
// 坏编码不抛错原样返回；数字参数（zone/59）解码后不变，语义不受影响
function decodeArg(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

// 纯解析（导出供单测）：hash 字符串 → { active, mid, src, view, viewArg }。
// 数字段=视频深链、字母段=子视图，语法天然互斥；脏输入一律降级为非竖刷路由。
// src（0.9.72）是深链的 id 空间标记：地址栏 id 跨两张详情表——小视频是 meowId、推荐是 acId
// （normalize/normalizeHome 各自落 id），裸数字形态语法同形无法分辨，故 syncHash 一律写标记形态；
// src=null 的裸形态只剩历史链接，由调用方探测（player.loadDeepLink）。标记段必须优先于视图段
// （v/a 也是字母），但必须带数字段才成立：#svfeed/v 裸字母仍落视图分支（形状同 #svfeed/foo）
export function parseHash(h) {
  h = String(h == null ? '' : h).replace(/^#\/?/, '');
  var m = h.match(routeRe);
  var k = m ? null : h.match(markRe);
  var v = (m || k) ? null : h.match(viewRe);
  return {
    active: !!(m || k || v),
    mid: (m && m[1]) || (k && k[2]) || null,
    src: k ? (k[1] === 'a' ? 'home' : 'sv') : null,
    view: v ? v[1] : null,
    viewArg: v && v[2] ? decodeArg(v[2]) : null
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

// 地址栏跟随当前视频：#svfeed/v/<meowId>（小视频）| #svfeed/a/<acId>（推荐）——带来源标记，
// 复制粘贴出去的链接零探测零歧义（裸数字形态是 0.9.72 之前的历史链接，解析层仍兼容）。
// 快速连续滑动会高频触发，150ms 尾节流收敛 replaceState 次数（结束后必然落到最后一条）
var hashTimer = null, hashPending = -1;

// appliedMid：已由路由落地的那条（mount 深链 / syncRouteFeed 跳转 / syncHash 回写都刷新它）。
// 它就是 hash↔feed 的同步状态，故与 syncHash 同处本模块；player.syncRouteFeed 读它做幂等判断
var appliedMid = null;
export function getAppliedMid() { return appliedMid; }
export function setAppliedMid(m) { appliedMid = m == null ? null : String(m); }

// 撤掉在途的地址回写。切流/深链重置前必须调：残留定时器会拿旧 index 去读重置后的新 items，
// 把地址写错（0.9.62 已有同型实锤：残留定时器把视图地址无声踩成深链）
export function cancelHashSync() {
  if (hashTimer) { clearTimeout(hashTimer); hashTimer = null; }
  hashPending = -1;
}

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
    setAppliedMid(it.id); // 地址已指向它：路由意图与地址保持一致
    try {
      history.replaceState(null, '',
        location.pathname + location.search + '#' + CFG.hash
        + '/' + (it.kind === 'home' ? 'a' : 'v') + '/' + it.id);
    } catch (e) { }
  }, 150);
}
