import { CFG } from './cfg.js';
import { el, ensureStyle } from './ui.js';
import { mountSpaceTab, watchSpaceTabs } from './spacetab.js';
import { createSquareFeed } from './squarefeed.js';
import { listProfile } from './momentapi.js';
import { addAmAnchor } from './memberplaza.js';

// ---------- 空间页「动态」标签（0.9.218） ----------
// 宿主＝UP 空间页 /u/<uid>（判据与 pagekind/uppage 同源）；数据＝feed/profile?userId=<uid>
// （**三合一混排**：图文动态 rt10 + 视频 rt2 + 文章 rt3；免登录、任意 uid 可读，docs §10.1
// 字段级核对在册）。列表机械/行卡/详情/互动/评论全线复用（squarefeed 工厂 + rowkit + momentbar
// + comments），差异只在四处注入：取数 / 空态文案 / 关发现态轮询 / 阈值组（CFG.view.moments，
// **无 24h 窗口**——个人主页是历史流）。
//
// 落点＝**原生页语义**（与 memberplaza 同款；用户 0.9.218 裁决确认）：点行不动作，行尾挂 am 锚
// 去官方动态页——浅色原生页上不弹深色详情浮层；行内互动（赞/蕉/评论/分享）照常可用。
//
// 皮肤＝**浅色第二皮肤**：面板内套 `.acsv-mp` 作用域（与 /member 内嵌广场同一个皮肤根，单源），
// 不另写一套颜色；深色浮层（详情面板/大图）不在射程，与内嵌广场同口径。
//
// 惰性：列表在标签**首次显形**时才建（onShow）——进空间页不点「动态」就不拉 profile 接口。
// 自愈：注册进 spacetab 的**共享**观察器（两个自建标签共用一条 MO），站点 SPA 重渲染后回补。
// 收窄：标签栏始终不出现时**不**退回底部区块（uppage 的兜底路径）——宁可不显示，也不多一条
// 并列 UI（本批「功能可为逻辑可控收窄」出口标准）。

var feed = null;
var builtFor = ''; // 已建列表对应的 uid（SPA 换人时重建，不把上一个人的流留在 DOM 里）

function uidOf() {
  var m = /^\/u\/(\d+)/.exec(location.pathname); // 与 pagekind/uppage 同源判据（单测在册）
  return m ? m[1] : '';
}

function noop() { }

function ensureList(panel, uid) {
  if (builtFor === uid && feed) return;
  if (feed) { feed.stop(); feed = null; } // 换人重建
  builtFor = uid;
  ensureStyle(); // 幂等（boot 在 member 分支已调亦无妨）
  var box = el('div', 'acsv-mp'); // 浅色第二皮肤根（.acsv-mp 单源）
  panel.appendChild(box);
  feed = createSquareFeed({
    root: box,
    scrollEl: window, // 原生页整页滚动（memberplaza 同款 window 方言）
    backTopHost: box,
    onOpen: noop,     // 原生页语义：不穿越深色详情面板
    onRow: addAmAnchor,
    fetchPage: function (pcursor) { return listProfile(uid, pcursor); },
    view: CFG.view.moments,
    emptyText: 'TA 还没有发布过动态',
    poll: false       // 看别人主页：不需要「发现 N 条新动态」的定时 diff
  });
}

// 单次同步尝试（spacetab 自愈契约：不得起定时器）
function inject() {
  var uid = uidOf();
  if (!uid) return false;
  var cl = document.querySelector('.ac-space-contribute-list');
  var tagsUl = cl && cl.querySelector('ul.tags');
  if (!cl || !tagsUl) return false;
  if (tagsUl.querySelector('li[data-index="moment"]')) return true; // 已注入
  mountSpaceTab({
    cl: cl, tagsUl: tagsUl, index: 'moment', order: 1, label: '动态',
    title: '该 UP 主的动态（图文 / 视频 / 文章）',
    onShow: function (panel) { ensureList(panel, uid); } // 首次显形才建列表（惰性）
  });
  return true;
}

// 自愈回调（spacetab.watchSpaceTabs 驱动）：单次同步尝试
export function healSpaceMoments() { inject(); }

export function tryInjectSpaceMoments() {
  if (!uidOf()) return;
  watchSpaceTabs(healSpaceMoments);
  if (inject()) return;
  // 标签栏渲染晚于空间页根（SPA）：轮询补注，节拍与 uppage 同档
  var tries = 0;
  (function attempt() {
    if (inject()) return;
    if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
  })();
}
