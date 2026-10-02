import { CFG } from './cfg.js';
import { testHook } from './dbg.js';
import { el, toast } from './ui.js';
import { root, scroller } from './state.js';
import { parseRoute } from './route.js';
import { overlayOpen, overlayClose, overlayTeardown } from './overlay.js';
import { FeedStore } from './feedstore.js';
import { scrollToIndex } from './player.js';
import { homeItemOf } from './data.js';
import { syncDock } from './sidebar.js';

// ---------- 子视图框架（0.9.62：#svfeed/<view>/<arg>，左栏入口的多页面宿主） ----------
// 设计契约（接口依据 docs/api-research.md）：
//  - hash 语法扩展现有竖刷路由（route.js）：数字段=深链置顶、字母段=子视图，复用
//    hashchange 单一驱动与 player.toggle 编排，不引入 pathname/pushState 新机制
//  - 视图打开时竖刷保活：scroller 隐藏 + 全视频暂停（paused 时间轴不推进，看门狗天然
//    不判冻，无需 visibility 特判）；返回时恢复在播条目；FeedStore 不销毁，回来继续刷
//  - 视图作为 overlay 栈的非模态层（id:'view'）：子视图内 Esc=返回竖刷；进视图先清全部
//    浮层（离开竖刷舞台语义），视图内新浮层照常叠栈
//  - 条目点击 playAc：gen 校验（切源丢弃）+ seen 查重（流内直接跳）+ resolve 失败回退 +
//    append 不 unshift（不打乱当前流，滑过新条目自然回到原 feed）
// 与 player 的循环依赖（views→player 取 scrollToIndex、player→views 调 syncRouteView）
// 同 feedstore 先例：绑定只在调用期解引用，求值期互不触碰。
var registry = {};
var container = null;  // root 内视图容器：首次进视图懒建，unmount 随 teardownViews 拆
var current = null;    // { id, arg, def }
var wasPlaying = false; // 切出时当前条是否在播（回来恢复播放，用户主动暂停态不打扰）

export function registerView(def) {
  if (def && def.id && typeof def.build === 'function') registry[def.id] = def;
}
export function currentView() { return current ? current.id : null; }

function ensureContainer() {
  if (container) return container;
  container = el('div', 'acsv-view');
  root.appendChild(container);
  return container;
}

function pauseAllVideos() {
  if (!scroller) return;
  var vs = scroller.querySelectorAll('video');
  Array.prototype.forEach.call(vs, function (v) { if (!v.paused) v.pause(); });
}

function resumeCurrentVideo() {
  if (!scroller) return;
  var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
  var v = slide && slide.querySelector('video');
  if (v && v.paused) {
    var p = v.play();
    if (p && p.catch) p.catch(function () { }); // 自动播放策略拒绝时静默（用户手动起播）
  }
}

function buildHead(def) {
  var head = el('div', 'acsv-view-head');
  head.appendChild(el('div', 'acsv-view-title', def.title || def.id));
  var x = el('button', 'acsv-view-x', '✕');
  x.title = '返回竖刷（Esc）';
  x.addEventListener('click', backToFeed);
  head.appendChild(x);
  return head;
}

function enterView(id, arg) {
  var def = registry[id];
  if (!def || !root) return false;
  if (current) exitView(false); // 视图间切换（my↔zone）：先收旧
  overlayTeardown(); // 离开竖刷舞台：抽屉/弹窗/大图全部收掉，视图从干净栈开始
  ensureContainer();
  container.innerHTML = '';
  if (scroller) {
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    var v = slide && slide.querySelector('video');
    wasPlaying = !!(v && !v.paused);
    scroller.style.display = 'none';
    pauseAllVideos();
  }
  root.classList.add('acsv-with-view');
  var body = el('div', 'acsv-view-body');
  container.appendChild(buildHead(def));
  container.appendChild(body);
  // 必须显式 'block'：CSS 里 .acsv-view 初始 display:none，'' 会回落到样式表值——
  // 0.9.62 黑屏 bug 根因（内容渲染了但容器不可见，harness 断言只查内联值被骗过）
  container.style.display = 'block';
  current = { id: id, arg: arg, def: def };
  overlayOpen({ id: 'view', close: backToFeed }); // 非模态层：Esc=返回竖刷
  def.build(body, arg);
  return true;
}

function exitView(restore) {
  if (!current) return;
  var def = current.def;
  var resume = restore && wasPlaying;
  wasPlaying = false;
  current = null;
  overlayClose('view'); // Esc 路径已出栈时空转；hash 变更路径由此同步栈
  if (def.teardown) { try { def.teardown(); } catch (e) { } }
  if (container) { container.innerHTML = ''; container.style.display = 'none'; }
  if (root) root.classList.remove('acsv-with-view');
  // 显式 'block' 同 enterView：'' 回落样式表值的坑不赌 scroller 的 CSS 现状
  if (scroller) scroller.style.display = 'block';
  if (resume) resumeCurrentVideo();
}

// Esc/✕ 回竖刷：hash 赋值（入一条历史），hashchange → toggle → syncRouteView →
// exitView(true)。无条件回写：若地址已被 syncHash 残留定时器踩成深链（replaceState
// 不触发 hashchange，视图态与地址会短暂脱钩），回写 #svfeed 正好把状态拉回一致。
// 仅 Esc/✕ 路径生效（current 非空）：exitView 已清 current 后才 overlayClose 的
// 切换/teardown 路径不得动 hash——否则我的→榜单直切会被改回 #svfeed 闪回竖刷
// （0.9.63 真机验证踩实）
function backToFeed() {
  if (!current) return;
  if (location.hash !== '#' + CFG.hash) location.hash = CFG.hash;
}

// hashchange 主钩子（player.toggle 调；boot 的 hashchange 链唯一入口）
export function syncRouteView() {
  if (!root) return;
  var r = parseRoute();
  if (r.view && registry[r.view]) {
    if (!current || current.id !== r.view
      || String(current.arg || '') !== String(r.viewArg || '')) {
      enterView(r.view, r.viewArg);
    }
  } else if (current) {
    exitView(true);
  }
  syncDock(r.view);
}

// 整流卸载（player.unmount 调）：不恢复播放（视频随后统一拆除），清容器与栈成员
export function teardownViews() {
  if (current) exitView(false);
  if (container) { container.remove(); container = null; }
}

// 视图条目点击：回竖刷 + 插入队尾播放。已在流内（seen）直接跳不重复插入
export function playAc(pi) {
  if (!pi || !pi.acId) return;
  if (location.hash !== '#' + CFG.hash) location.hash = CFG.hash;
  var gen = FeedStore.gen;
  var i, j;
  for (i = 0; i < FeedStore.items.length; i++) {
    if (String(FeedStore.items[i].id) === String(pi.acId)) return scrollToIndex(i);
  }
  var item = homeItemOf(pi.acId, pi.title, pi.cover);
  FeedStore.refresh(item).then(function (ok) {
    if (gen !== FeedStore.gen) return; // 期间切源：这条属于旧源，丢弃
    if (!ok) return toast('视频加载失败，稍后再试');
    if (FeedStore.seen[item.id]) { // 竞态：等待期间已由别的路径插入
      for (j = 0; j < FeedStore.items.length; j++) {
        if (String(FeedStore.items[j].id) === String(item.id)) return scrollToIndex(j);
      }
      return;
    }
    FeedStore.seen[item.id] = 1;
    FeedStore.items.push(item);
    scrollToIndex(FeedStore.items.length - 1);
  });
}

// ---- 面板 kit：条目行（cover+标题+meta，点击回竖刷）与「加载更多」按钮 ----
// meta 行拼装规则：sub 优先（历史=「观看至xx:xx」、榜单=蕉数、收藏=UP 名），
// progress 仅在 sub 未表达时补显（收藏的续看秒数）
export function rowOf(pi, rank) {
  // 榜单条目走大卡+右侧 UP 卡（对齐原生 rlist 分栏）；历史/收藏维持小卡
  var row = el('div', 'acsv-vrow' + (pi.kind === 'rank' ? ' big' : ''));
  if (rank != null && pi.kind !== 'rank') {
    row.appendChild(el('div', 'acsv-vrow-rank' + (rank <= 3 ? ' top' : ''), String(rank)));
  }
  // 榜单排名=视频卡右下角大水印（原生视觉锚点）。定位宿主契约：必须挂在有
  // position:relative 的卡内（.acsv-vrow.big）——0.9.67 挂视图行上（行 static）
  // 致全部水印冒泡到 view-body 叠成一团，真机 dump offsetParent 实锤
  if (rank != null && pi.kind === 'rank') {
    row.appendChild(el('div', 'acsv-rlist-num', String(rank)));
  }
  var thumb = el('div', 'acsv-vrow-thumb');
  if (pi.cover) {
    var img = el('img');
    img.src = pi.cover;
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    thumb.appendChild(img);
  }
  row.appendChild(thumb);
  var main = el('div', 'acsv-vrow-main');
  main.appendChild(el('div', 'acsv-vrow-title', pi.title));
  if (pi.desc) main.appendChild(el('div', 'acsv-vrow-desc', pi.desc));
  // meta 行：契约层拼好（rank=原生 extra 构成；其余来源 sub+续看进度）
  var bits = [];
  if (pi.sub) bits.push(pi.sub);
  if (pi.progress != null && pi.kind !== 'history') bits.push('看到 ' + fmtDur(pi.progress));
  main.appendChild(el('div', 'acsv-vrow-meta', bits.join(' · ')));
  row.appendChild(main);
  row.addEventListener('click', function () { playAc(pi); });
  return row;
}

// 原生 up-card 等价物（rlist 右栏作者卡，横排）：大圆头像左+信息块右（名字 accent/签名/
// 粉丝·投稿）。签名可多行（原生 sign 不截）；收藏数 rankList 不带，双数据位=粉丝+投稿。
// 整卡为 UP 主页链接（原生同款 target=_blank）
export function upCardOf(pi) {
  var card = el('div', 'acsv-upcard');
  var up = pi.up || {};
  var a = el('a', 'acsv-upcard-link');
  a.href = CFG.api.userBase + (up.id || '');
  a.target = '_blank';
  a.rel = 'noopener';
  var avatar = el('img', 'acsv-upcard-avatar');
  avatar.src = up.img || CFG.api.defaultAvatar;
  avatar.referrerPolicy = 'no-referrer';
  avatar.loading = 'lazy';
  a.appendChild(avatar);
  var info = el('div', 'acsv-upcard-info');
  info.appendChild(el('div', 'acsv-upcard-name', up.name || ''));
  if (up.sign) info.appendChild(el('p', 'acsv-upcard-sign', up.sign));
  info.appendChild(el('div', 'acsv-upcard-extra',
    up.fans + ' 粉丝 · 投稿 ' + (up.contrib || 0)));
  a.appendChild(info);
  card.appendChild(a);
  return card;
}

export function moreBtn(onClick) {
  var b = el('button', 'acsv-vmore', '加载更多');
  b.addEventListener('click', function () {
    if (b.disabled) return;
    b.disabled = true;
    b.textContent = '加载中…';
    onClick(b);
  });
  return b;
}

function fmtDur(sec) {
  sec = Math.max(0, Number(sec) || 0);
  var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

// debug 构建测试钩子：harness 断言读当前视图（feedstore 快照同款惯例）
testHook('view', function () { return currentView(); });
