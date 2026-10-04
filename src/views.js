import { CFG } from './cfg.js';
import { testHook } from './dbg.js';
import { el } from './ui.js';
import { root, scroller } from './state.js';
import { parseRoute } from './route.js';
import { overlayOpen, overlayTeardown } from './overlay.js';
import { viewDef } from './viewreg.js';
import { FeedStore, listContext } from './feedstore.js';
import { syncDock } from './sidebar.js';
import { syncTopbar } from './topbar.js';

// ---------- 子视图框架（0.9.62：#svfeed/<view>/<arg>，左栏入口的多页面宿主） ----------
// 设计契约（接口依据 docs/api-research.md）：
//  - hash 语法扩展现有竖刷路由（route.js）：数字段=深链置顶、字母段=子视图，复用
//    hashchange 单一驱动与 player.toggle 编排，不引入 pathname/pushState 新机制
//  - 视图打开时竖刷保活：scroller 隐藏 + 全视频暂停（paused 时间轴不推进，看门狗天然
//    不判冻，无需 visibility 特判）；返回时恢复在播条目；FeedStore 不销毁，回来继续刷
//  - 视图作为 overlay 栈的非模态层（id:'view'）：Esc 关闭——普通视图=回竖刷，
//    深界面（def.deep：搜索/播放层）=回"打开它的那个界面"
//  - 深界面与来源链（0.9.74）：进深界面（def.deep：搜索/播放层）把来源压进来源链（origins
//    栈，可两级：我的→搜索→播放）；来源可保活（非 def.volatile 的视图）则同时**挂起其 DOM**
//    （类名换 acsv-view-held + visibility:hidden ⇒ 盒子存活、滚动位不丢、跳过 build 原位复原；
//    换类名是因为 .acsv-view 是全项目与 harness 的「当前视图」定位锚，留两个同构节点会污染
//    既有断言）。def.volatile（播放层：握播放会话/定时器）不入链也不挂起——离开即真拆；
//    同屏换参（搜索换词）=替换链顶那层，不叠层。普通视图（我的/榜单）之间与 dock 直跳维持
//    旧语义：收旧 + 来源链作废
//  - 条目点击：走播放层（playlayer.openPlayer），不再插入竖刷队尾（0.9.74 契约变更）
// player→本模块单向调用（syncRouteView）；本模块不再 import player（0.9.74 删 playAc 的
// scrollToIndex 依赖后循环消失）
// 视图清单与 dock 元数据在 viewreg.js（registerView 的唯一真源；本模块只读 viewDef）。
// 本模块只管编排：进出/保活/来源链；卡面 kit 已拆出（0.9.109 → cards.js，含点击出口注入缝）
var current = null;     // 当前视图 { id, arg, def, el }
var origins = [];       // 来源链：[{ view, arg, rec }]；rec 非空=被挂起的普通视图 DOM
var wasPlaying = false; // 切出时当前条是否在播（回来恢复播放，用户主动暂停态不打扰）

export function currentView() { return current ? current.id : null; }

// 来源界面名（来源链顶，空链/null view = 竖刷）：深界面的 dock 高亮与「向左返回」定位用它
export function originView() {
  if (!origins.length) return null;
  return origins[origins.length - 1].view || 'feed';
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

// 舞台隐藏：只在「可见→隐藏」跃迁记账。0.9.74 修：进深界面会经"列表→播放"两级，
// 旧实现每次 enterView 都重记 wasPlaying——彼时舞台早已隐藏、当前条已被暂停 ⇒ 覆盖成
// false，列表关掉后竖刷不再恢复播放
function stageHide() {
  if (!scroller || scroller.style.display === 'none') return;
  var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
  var v = slide && slide.querySelector('video');
  wasPlaying = !!(v && !v.paused);
  scroller.style.display = 'none';
  pauseAllVideos();
}

function stageShow(restore) {
  if (!scroller) return;
  // 显式 'block' 同 stageHide：'' 回落样式表值的坑不赌 scroller 的 CSS 现状
  scroller.style.display = 'block';
  if (restore) resumeCurrentVideo();
  wasPlaying = false;
}

// 真销毁一个视图记录（拆 DOM；overlay 栈由调用方统一收）
function destroyRec(rec) {
  if (!rec) return;
  if (rec.def.teardown) { try { rec.def.teardown(); } catch (e) { } }
  if (rec.el) rec.el.remove();
}

// 来源链整清：挂起的普通视图 DOM 一并销毁
function clearOrigins() {
  while (origins.length) {
    var o = origins.pop();
    if (o.rec) destroyRec(o.rec);
  }
}

// 当前视图收尾：先摘 current（close 回调 closeView 靠它守卫早退——0.9.63 教训：切换/
// teardown 路径不得动 hash），再拆
function dropCurrent() {
  var rec = current;
  current = null;
  destroyRec(rec);
}

// 视图关闭（Esc）：普通视图回竖刷；深界面回来源链顶，空链回竖刷
function closeView() {
  if (!current) return;
  if (current.def.deep) return backFromOrigin();
  if (location.hash !== '#' + CFG.hash) location.hash = CFG.hash;
}

// 深界面的返回动作（Esc 与顶栏「向左返回」共用）：回"打开它的那个界面"
export function backFromOrigin() {
  var top = origins.length ? origins[origins.length - 1] : null;
  var to = top && top.view ? CFG.hash + '/' + top.view
    + (top.arg == null || top.arg === '' ? '' : '/' + encodeURIComponent(top.arg)) : CFG.hash;
  if (location.hash !== '#' + to) location.hash = to;
}

// 进深界面时把来源压链；来源可保活（非 volatile 的视图）则挂起其 DOM 并留 rec
// volatile（播放层：握播放会话/定时器）= 不入链也不挂起——隐藏容器里继续出声绝不允许，
// 它自己的来源本来就在链上，Esc 直接回那一层
function holdOrigin(prev) {
  if (prev.def.suspend) { try { prev.def.suspend(); } catch (e) { } }
  prev.el.className = 'acsv-view-held'; // 换类名：q('.acsv-view') 是全局定位锚
  origins.push({ view: prev.id, arg: prev.arg, rec: prev });
}

function enterView(id, arg) {
  var def = viewDef(id);
  if (!def || !root) return false;
  var top = origins.length ? origins[origins.length - 1] : null;
  // 回来路径：目标＝来源链顶（深界面的来源）→ pop；顶着挂了 DOM 就原位复原（跳过 build）
  var back = !!(top && String(top.view || '') === String(id)
    && String(top.arg || '') === String(arg || ''));
  var rec = null;
  var replaced = false;
  if (back) {
    rec = top.rec;
    origins.pop();
  } else if (top && String(top.view || '') === String(id)) {
    // 同屏换参（搜索换词/顶栏再搜）：替换链顶那层——不叠新的，也不把旧屏当来源
    destroyRec(top.rec);
    origins.pop();
    replaced = true;
  }
  var prev = current;
  current = null; // 先摘 current：overlayTeardown→closeView 不得动 hash（0.9.63 教训）
  var heldRec = null;
  // 同 id 的 prev（搜索换词那一拍）不保活：那是同一个屏换了参数，留着就是双份 DOM
  if (prev && !back && !replaced && def.deep && !prev.def.volatile && prev.id !== id) {
    holdOrigin(prev);
    heldRec = prev;
  }
  if (prev && prev !== heldRec) destroyRec(prev);
  if (!def.deep) clearOrigins(); // 普通视图/回竖刷：来源链作废（dock 直跳语义）
  overlayTeardown(); // 换舞台：抽屉/弹窗/大图全部收掉，新界面从干净栈开始
  if (rec) {
    rec.el.className = 'acsv-view';
    rec.el.style.display = 'block';
    if (rec.def.resume) { try { rec.def.resume(); } catch (e) { } }
    current = rec;
    overlayOpen({ id: 'view', close: closeView }); // 非模态层：Esc=关闭
    return true;
  }
  stageHide();
  var e = el('div', 'acsv-view');
  var body = el('div', 'acsv-view-body');
  e.appendChild(body);
  root.appendChild(e);
  // 必须显式 'block'：CSS 里 .acsv-view 初始 display:none，'' 会回落到样式表值——
  // 0.9.62 黑屏 bug 根因（内容渲染了但容器不可见，harness 断言只查内联值被骗过）
  e.style.display = 'block';
  current = { id: id, arg: arg, def: def, el: e };
  overlayOpen({ id: 'view', close: closeView }); // 非模态层：Esc=关闭
  def.build(body, arg);
  return true;
}

// 最后一个视图退出（回竖刷）：拆当前 + 来源链作废 + 恢复舞台
function exitView(restore) {
  dropCurrent();
  overlayTeardown(); // 0.9.73 对称收尾：视图内新开的浮层随视图一并收
  clearOrigins();
  stageShow(!!(restore && wasPlaying));
}

// hashchange 主钩子（player.toggle 调；boot 的 hashchange 链唯一入口）
export function syncRouteView() {
  if (!root) return;
  var r = parseRoute();
  var def = viewDef(r.view);
  if (def) {
    if (!current || current.id !== r.view
      || String(current.arg || '') !== String(r.viewArg || '')) {
      enterView(r.view, r.viewArg);
    }
  } else if (current) {
    exitView(true);
  }
  // dock 高亮：深界面（搜索/播放）不在 dock 里——指向来源界面（来源链顶），空链回「推荐」；
  // 舞台态（r.view=null）若列表上下文自带归属 dock（FollowVideos.dockView='follow'，0.9.105
  // 实报「点视频后高亮变推荐」）→ 指向它。走 FeedStore 边（已有）读上下文，零新依赖
  var dockView = def && def.deep ? originView() : r.view;
  if (dockView == null) {
    var ctx = listContext();
    dockView = (ctx && ctx.dockView) || (def && def.deep ? 'feed' : dockView);
  }
  syncDock(dockView);
  // 顶栏按界面同步（0.9.73 四处复用；0.9.74：✕ 恒=退出脚本，深界面另出「向左返回」）。
  // searchCtx（0.9.75 补）：搜索视图本身，或从搜索页打开、尚未回到别处的播放层——顶栏输入框
  // 靠它决定「保持关键词 / 离开即清空」（离开＝回列表/竖刷，或经播放层再跳到别的界面）
  var deep = !!(def && def.deep);
  syncTopbar(r.view, r.viewArg, {
    deep: deep,
    searchCtx: r.view === 'search' || (deep && originView() === 'search')
  });
}

// 整流卸载（player.unmount 调）：不恢复播放（视频随后统一拆除），清当前视图与来源链
export function teardownViews() {
  dropCurrent();
  clearOrigins();
  stageShow(false);
}

// debug 构建测试钩子：harness 钉舞台记账与来源链（release 死码消除）
testHook('stage', function () {
  return {
    visible: !!(scroller && scroller.style.display !== 'none'),
    wasPlaying: wasPlaying,
    current: currentView(),
    origin: originView(),
    held: document.querySelectorAll('.acsv-view-held').length
  };
});

// debug 构建测试钩子：harness 断言读当前视图（feedstore 快照同款惯例）
testHook('view', function () { return currentView(); });
