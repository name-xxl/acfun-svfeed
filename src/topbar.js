import { el, toast, closeOnOutsideClick, a11y } from './ui.js';
import { histList, histClear } from './searchhist.js'; // 搜索历史=站方 searchCache（0.9.158 读写复用）
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
var spop = null, spopList = null; // 聚焦历史面板与其词表（0.9.158）

function submitSearch() {
  if (!searchInput) return;
  hideSearchPop();
  var kw = String(searchInput.value || '').trim();
  if (searchHandler) { searchHandler(kw); return; }
  if (hooks.onSearch) hooks.onSearch(kw);
}

// 历史面板（0.9.158）：渲染一次词表；无历史返回 false（不弹）
function renderSearchPop() {
  if (!spopList) return false;
  var words = histList();
  spopList.textContent = '';
  if (!words.length) return false;
  words.forEach(function (w) {
    var b = el('button', 'acsv-spop-item', w);
    b.type = 'button';
    b.addEventListener('click', function () {
      searchInput.value = w; // 回填后走既有提交链（与回车同路：会记历史/进视图/就地重跑）
      submitSearch();
    });
    spopList.appendChild(b);
  });
  return true;
}
export function openSearchPop() {
  if (!spop) return;
  if (!searchInput || String(searchInput.value || '').trim()) return; // 有词（深链回填等）：不弹历史
  if (!renderSearchPop()) { hideSearchPop(); return; }
  spop.style.display = '';
}
export function hideSearchPop() {
  if (spop) spop.style.display = 'none';
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
  a11y(backBtn, '返回');
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
    else if (ev.key === 'Escape') { hideSearchPop(); searchInput.blur(); }
  });
  // focus/输入联动（原生 onSearchInputFocus / 输入即切联想面板——我们没有联想，输入即收起历史）
  searchInput.addEventListener('focus', function () {
    if (!String(searchInput.value || '').trim()) openSearchPop();
  });
  searchInput.addEventListener('input', function () {
    if (String(searchInput.value || '').trim()) hideSearchPop();
    else openSearchPop();
  });
  // 空框点击=展开历史面板（0.9.158 复用原生「聚焦面板」逻辑，取代 0.9.156 的"跳搜索视图"）
  searchInput.addEventListener('click', function () { openSearchPop(); });

  var sBtn = el('button', 'acsv-sbtn');
  a11y(sBtn, '搜索');
  sBtn.appendChild(el('i', 'acsvg-glyph', GLYPHS.search));
  sBtn.addEventListener('click', function (ev) { ev.stopPropagation(); submitSearch(); });
  pill.appendChild(searchInput);
  pill.appendChild(sBtn);
  barEl.appendChild(pill);
  // ---- 聚焦面板（0.9.158「ui 也复用」）：结构/交互照站方 searchBox 组件（源码实证）----
  //   · focus 空框 → 展开；mouseleave 面板 → 收起（原生同款绑定）；
  //   · 词条点击 → 即搜（走既有提交链：搜索视图内=就地重跑，别处=进搜索视图）+ 收起；
  //   · 「清除历史」= histClear（站方语义=移除 searchCache 键）+ 收起；
  //   · 另加项目既有的外点收起（ui.closeOnOutsideClick，0.9.147 统一件）与 Esc 收起；
  //   · **无历史不弹**（原生无历史时不弹历史块、靠热搜兜底；我们没有热搜 → 整块不弹，不占位）。
  //   联想/热搜未做（联想端点通但服务端恒空、热搜来源未定位）——见 CHANGELOG 0.9.158。
  spop = el('div', 'acsv-searchpop'); // 赋模块级（勿加 var：会遮蔽模块变量）
  spop.style.display = 'none';
  var spopHead = el('div', 'acsv-spop-head');
  spopHead.appendChild(el('span', null, '历史记录'));
  var spopClr = el('a', 'acsv-spop-clr', '清除历史');
  spopClr.href = 'javascript:void(0)';
  spopClr.addEventListener('click', function (ev) {
    ev.stopPropagation();
    histClear();
    hideSearchPop();
    // 广播（0.9.158）：清空是共享键级动作，已挂载的空词搜索视图据此重画「最近搜索」chips——
    // 否则面板清空后，身后那份 chips 还是旧的（两个面同源不同步）。事件名见 searchview 订阅处
    try { document.dispatchEvent(new Event('acsv-searchhist')); } catch (e) { }
  });
  spopHead.appendChild(spopClr);
  spopList = el('div', 'acsv-spop-list'); // 同上
  spop.appendChild(spopHead);
  spop.appendChild(spopList);
  barEl.appendChild(spop);
  spop.addEventListener('mouseleave', function () { hideSearchPop(); }); // 原生 mouseleave 同款
  closeOnOutsideClick(spop, [pill], function () { hideSearchPop(); });   // 常驻外点收起（self-clean 语义同 0.9.147）
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
  a11y(imBtn, '私信');
  imBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span class="acsv-im-badge" style="display:none"></span>';
  imBtn.addEventListener('click', function (ev) { ev.stopPropagation(); if (hooks.onDrawer) hooks.onDrawer(); });
  tr.appendChild(imBtn);
  var updBtn = el('button', 'acsv-tbtn acsv-upd-btn');
  a11y(updBtn, '更新说明');
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
  var src = typeof hooks.getSource === 'function' ? hooks.getSource() : null;
  // related（0.9.167 游走态）不是 seg 的一极：两键全灭——顶栏 seg 是 sv↔home 开关，
  // 游走链的进出走抽屉「相关推荐」行，不经 seg
  segSv.classList.toggle('on', src !== 'home');
  segHome.classList.toggle('on', src === 'home');
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
  if (xBtn) a11y(xBtn, view ? '退出' : '退出（Esc）'); // title=aria-label 同源（0.9.186）
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
  hooks = {}; searchHandler = null; searchCtxPrev = false; spop = null; spopList = null;
}
