import { el, toast } from './ui.js';
import { ICONS } from './styles.js';
import { GLYPHS } from './imicons.js';

// ---------- 顶栏（0.9.72 抽离为共享组件，0.9.73 四界面复用） ----------
// 结构（左中右）：[搜索框·居中常驻（抖音同款位置）] [右侧按钮组：源切换 seg | 关注 seg（0.9.99，仅关注语境可见）| 私信 | 更新 | 退出 ✕]。
// 一份组件、按界面同步（syncTopbar(view, arg)，与 syncDock 对位）：竖刷态显示源切换；✕ 单一意义=退出脚本（0.9.74 用户裁决，普通界面的 Esc 另义回竖刷）；
// 视图态隐源切换（CSS 规则）；搜索视图把关键词回填进同一个输入框（唯一输入框）。
// 行为全部经 hooks 注入（onSearch/onExit/onSource/onDrawer/onRelease/getSource +
// 0.9.110 关注 seg 三键 onFollowVideos/onFollowAll/getFollowActive——此前该 seg 直连
// followstream 的"省事例外"已撤，共享件不直连特性模块）；组件不 import player（避免循环依赖）。
// **单例语义（防御性怪癖，改前必读）**：buildTopbar 只在首建接收 hooks（barEl 已存在即早退、
// h 参数被忽略）——会话中途换 hooks 静默无效；要换行为走 setSearchHandler 式瞬态缝或 teardown 重建。
// 右侧四件套类名保持不变——抽屉避让（.acsv-top 的 right 收窄，右组随容器贴边）
// 与 harness 既有断言（.acsv-upd-dot/.acsv-upd-btn）都挂在它们上面。
// 搜索提交可被挂载中的视图临时接管（setSearchHandler）：搜索视图接管后，「同词再回车」
// 走就地重跑而非死等 hashchange（hash 不变不触发）；视图 teardown 必须还原（null）——
// 否则离开搜索视图后默认提交被旧闭包劫持。
var barEl = null;
var fsegEl = null, fsegVideos = null, fsegAll = null;
var segEl = null; // 源切换 seg 容器（关注流舞台态要隐，0.9.104）
var imBtnEl = null;
var segSv = null;
var segHome = null;
var xBtn = null;
var backBtn = null;
var searchInput = null;
var hooks = {};
var searchHandler = null;
var searchCtxPrev = false; // 上次同步是否处于搜索上下文（离开那一刻清空输入框）

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
  // 左缘「向左返回」（0.9.74）：仅深界面（搜索结果页/播放层）显示——它们的来源不在 dock 上，
  // 必须有返回出口；样式与右组同款（.acsv-tbtn），DOM 在首位（顶栏左缘=左栏右缘，紧贴侧栏）
  backBtn = el('button', 'acsv-tbtn acsv-back-btn');
  backBtn.title = '返回';
  backBtn.innerHTML = ICONS.chevLt;
  backBtn.style.display = 'none';
  backBtn.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onBack) hooks.onBack(); });
  barEl.appendChild(backBtn);
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
  segEl = el('div', 'acsv-seg');
  segEl.appendChild(segSv);
  segEl.appendChild(segHome);
  tr.appendChild(segEl);
  // 关注语境 seg（0.9.99）：「视频 | 全部」双面切换——视频=关注视频流接管舞台
  //（0.9.110 起经 onFollowVideos 注入出口，实现在 followstream.enterVideos），
  // 全部=关注视图（仿原生列表）。仅关注语境可见；类名与源
  // 切换 .acsv-seg 刻意不同：.acsv-top--view 的隐藏规则只打 .acsv-seg，关注视图里本 seg
  // 必须保持可见——它是「视频」侧的确定性回路口（深链进出不依赖 Esc 链）。
  // 三键由 player.mount 注入（0.9.110 撤"直连 followstream"例外——hooks 表本为防
  // topbar→player 环而生；共享件不直连特性模块，防悄悄长回特性知识）
  fsegVideos = el('button', 'acsv-seg-btn', '视频');
  fsegVideos.title = '关注视频竖刷';
  fsegVideos.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (!hooks.onFollowVideos) return;
    hooks.onFollowVideos().then(function (ok) {
      if (!ok) toast('关注视频加载失败');
      syncFollowSeg();
    });
  });
  fsegAll = el('button', 'acsv-seg-btn', '全部');
  fsegAll.title = '关注动态列表';
  fsegAll.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (!hooks.onFollowAll) return;
    hooks.onFollowAll();
    syncFollowSeg();
  });
  fsegEl = el('div', 'acsv-seg acsv-seg-follow');
  fsegEl.appendChild(fsegVideos);
  fsegEl.appendChild(fsegAll);
  fsegEl.style.display = 'none';
  tr.appendChild(fsegEl);
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

// 关注语境 seg 同步（syncTopbar 尾部调；enterVideos/enterAll 的点击出口也手动调一次——
// enterVideos 是异步接管，等 hashchange 的 syncTopbar 有一拍延迟，直接刷让高亮立即跟上）。
// **显隐收窄**（0.9.102 裁决）：仅「关注视图打开」或「舞台态（无视图）且关注流激活」——
// 与头注声明一致；此前用 isFollowContext()（只问流活动）会在我的/榜单等 dock 视图里常驻。
// 与徽标抑制的 isFollowContext() 是**两个用途**：那个问「会话内是否正在消费关注流」（宽松
// 合理），这个问「当前界面是否属关注语境」（严格）。高亮=全部侧按视图、视频侧按流活动
export function syncFollowSeg(view) {
  if (!fsegEl) return;
  var active = !!(hooks.getFollowActive && hooks.getFollowActive()); // 流活动态（0.9.110 起经注入读）
  var show = view === 'follow' || (view == null && active);
  fsegEl.style.display = show ? '' : 'none';
  fsegVideos.classList.toggle('on', !view && active);
  fsegAll.classList.toggle('on', view === 'follow');
  // 源切换 seg（小视频/推荐）与关注 seg 在**舞台态互斥**（0.9.104 用户实报「关注页切到视频时
  // 冒出小视频/推荐栏」）：舞台正放关注流时换源=退出关注流，语义冲突——隐源 seg；退出关注流
  // 后复位（视图态仍归 CSS 的 .acsv-top--view 管，此处只补 inline 的舞台态）
  if (segEl) segEl.style.display = (view == null && active) ? 'none' : '';
}

// 按当前界面同步（views.syncRouteView 调）：视图态隐源切换（CSS）+ 深界面出「向左返回」；
// 搜索视图按地址栏 arg 回填关键词（深链/换词直达时顶栏输入框与地址一致）。
// 输入框只在两处动（0.9.75 补）：① view==='search' 按地址回填；② **离开搜索上下文那一刻清空**
// （opts.searchCtx 由 views 判定：搜索视图本身，或从搜索页打开、尚未回到别处的播放层）。
// 其余 hashchange（切视图途中的竖刷深链回写等）不碰输入框——保留 0.9.73「不打断正在拼字」契约
// ✕ 单一意义（0.9.74 用户裁决）：永远=退出脚本回首页——普通界面 Esc 另义（回竖刷），
// 故 title 只在竖刷态带 Esc 提示；视图出口靠 dock（常驻）+ Esc，深界面靠「向左返回」
export function syncTopbar(view, arg, opts) {
  if (!barEl) return;
  barEl.classList.toggle('acsv-top--view', !!view);
  if (backBtn) backBtn.style.display = opts && opts.deep ? '' : 'none';
  if (xBtn) xBtn.title = view ? '退出' : '退出（Esc）';
  var ctx = !!(opts && opts.searchCtx);
  if (view === 'search' && searchInput) searchInput.value = arg == null ? '' : String(arg);
  else if (!ctx && searchCtxPrev && searchInput) searchInput.value = '';
  searchCtxPrev = ctx;
  syncFollowSeg(view);
}

export function teardownTopbar() {
  if (barEl) { barEl.remove(); barEl = null; }
  imBtnEl = null; segSv = null; segHome = null; xBtn = null; backBtn = null; searchInput = null;
  fsegEl = null; fsegVideos = null; fsegAll = null; segEl = null;
  hooks = {}; searchHandler = null; searchCtxPrev = false;
}
