import { el } from './ui.js';
import { ICONS } from './styles.js';
import { GLYPHS } from './imicons.js';

// ---------- 顶栏（0.9.72 抽离为共享组件，0.9.73 四界面复用） ----------
// 结构（左中右）：[搜索框·居中常驻（抖音同款位置）] [右侧按钮组：源切换 seg | 私信 | 更新 | 退出 ✕]。
// 一份组件、按界面同步（syncTopbar(view, arg)，与 syncDock 对位）：竖刷态显示源切换、✕=退出；
// 视图态隐源切换（CSS 规则）、✕=返回竖刷；搜索视图把关键词回填进同一个输入框（唯一输入框）。
// 行为全部经 hooks 注入（onSearch/onExit/onSource/onDrawer/onRelease/getSource），组件不 import
// player（避免循环依赖）；右侧四件套类名保持不变——抽屉避让（.acsv-top-right 的 translateX）
// 与 harness 既有断言（.acsv-upd-dot/.acsv-upd-btn）都挂在它们上面。
// 搜索提交可被挂载中的视图临时接管（setSearchHandler）：搜索视图接管后，「同词再回车」
// 走就地重跑而非死等 hashchange（hash 不变不触发）；视图 teardown 必须还原（null）——
// 否则离开搜索视图后默认提交被旧闭包劫持。
var barEl = null;
var imBtnEl = null;
var segSv = null;
var segHome = null;
var xBtn = null;
var searchInput = null;
var hooks = {};
var searchHandler = null;

function submitSearch() {
  if (!searchInput) return;
  var kw = String(searchInput.value || '').trim();
  if (searchHandler) { searchHandler(kw); return; }
  if (hooks.onSearch) hooks.onSearch(kw);
}

// 搜索视图挂载期接管提交（null 还原默认）；与 hooks 分离：hooks 是 mount 期注入的常驻配置，
// 这里表达的是「当前视图临时拥有这个输入框」的瞬态
export function setSearchHandler(fn) {
  searchHandler = typeof fn === 'function' ? fn : null;
}

// 供搜索视图空词进入时聚焦（视图 body 内已无自有输入框）
export function focusSearch() {
  if (!searchInput) return;
  try { searchInput.focus(); } catch (e) { }
}

export function buildTopbar(parent, h) {
  if (barEl) return topbarRefs();
  hooks = h || {};
  barEl = el('div', 'acsv-top');
  // 搜索框：居中常驻；Enter/按钮 = 提交（去哪由宿主决定）；聚焦态 Esc 先退聚焦
  // （input.js 对 input target 已豁免竖刷快捷键，这里只管浏览器的默认行为体验）
  var pill = el('div', 'acsv-sbox');
  searchInput = el('input');
  searchInput.type = 'search';
  searchInput.placeholder = '搜索 A 站视频';
  searchInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); submitSearch(); }
    else if (ev.key === 'Escape') searchInput.blur();
  });
  var sBtn = el('button', 'acsv-sbtn');
  sBtn.title = '搜索';
  sBtn.appendChild(el('i', 'acsvg-glyph', GLYPHS.search));
  sBtn.addEventListener('click', function (ev) { ev.stopPropagation(); submitSearch(); });
  pill.appendChild(searchInput);
  pill.appendChild(sBtn);
  barEl.appendChild(pill);
  // 右侧按钮组（自 player.mount 迁出，事件经 hooks 回调）
  var tr = el('div', 'acsv-top-right');
  segSv = el('button', 'acsv-seg-btn', '小视频');
  segHome = el('button', 'acsv-seg-btn', '推荐');
  segSv.title = '切换到小视频流';
  segHome.title = '切换到 APP 首页推荐流';
  segSv.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onSource) hooks.onSource('sv'); });
  segHome.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onSource) hooks.onSource('home'); });
  var seg = el('div', 'acsv-seg');
  seg.appendChild(segSv);
  seg.appendChild(segHome);
  tr.appendChild(seg);
  var imBtn = el('button', 'acsv-tbtn acsv-im-btn');
  imBtn.title = '私信';
  imBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span class="acsv-im-badge" style="display:none"></span>';
  imBtn.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onDrawer) hooks.onDrawer(); });
  tr.appendChild(imBtn);
  var updBtn = el('button', 'acsv-tbtn acsv-upd-btn');
  updBtn.title = '更新说明';
  updBtn.innerHTML = ICONS.upd + '<span class="acsv-upd-dot" style="display:none"></span>';
  updBtn.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onRelease) hooks.onRelease(); });
  tr.appendChild(updBtn);
  xBtn = el('button', 'acsv-tbtn', '✕');
  xBtn.addEventListener('click', function () { if (hooks.onExit) hooks.onExit(); });
  tr.appendChild(xBtn);
  barEl.appendChild(tr);
  parent.appendChild(barEl);
  imBtnEl = imBtn;
  syncTopbarSeg();
  syncTopbar(null);
  return topbarRefs();
}

function topbarRefs() {
  return { el: barEl, imBtn: imBtnEl, searchInput: searchInput, xBtn: xBtn };
}

// 源切换高亮（player.updateSegUI 调；自原 updateSegUI 迁入）
export function syncTopbarSeg() {
  if (!segSv) return;
  var home = typeof hooks.getSource === 'function' && hooks.getSource() === 'home';
  segSv.classList.toggle('on', !home);
  segHome.classList.toggle('on', home);
}

// 按当前界面同步（views.syncRouteView 调）：视图态隐源切换（CSS）+ ✕ 语义改「返回竖刷」；
// 搜索视图按地址栏 arg 回填关键词（深链/换词直达时顶栏输入框与地址一致）。只在 view==='search'
// 时写输入框：其余 hashchange（切视图/竖刷深链回写）不碰用户可能在拼的输入。
export function syncTopbar(view, arg) {
  if (!barEl) return;
  barEl.classList.toggle('acsv-top--view', !!view);
  if (xBtn) xBtn.title = view ? '返回竖刷（Esc）' : '退出（Esc）';
  if (view === 'search' && searchInput) searchInput.value = arg == null ? '' : String(arg);
}

export function teardownTopbar() {
  if (barEl) { barEl.remove(); barEl = null; }
  imBtnEl = null; segSv = null; segHome = null; xBtn = null; searchInput = null;
  hooks = {}; searchHandler = null;
}
