// ---------- 共享 UI 单例状态 ----------
// root/scroller 由 player 挂载/卸载时赋值，commentDrawer 由 slide.js 建抽屉骨架时赋值
// （player 卸载时置空）；comments/ui 只读。0.9.57 起原生私信页 boot 也 setRoot(document.body)
// （imgview 挂载点，原生页无 player）。
// 单独成模块是为了让只读方不必反向 import player（避免无谓的循环依赖）。
export var root = null;
export var scroller = null;
export var commentDrawer = null;

export function setRoot(v) { root = v; }
export function setScroller(v) { scroller = v; }
export function setCommentDrawer(v) { commentDrawer = v; }

// ---------- 抽屉槽位协调 ----------
// 右侧抽屉（评论/私信）同一时刻只开一个：open 前 claim 占槽（自动收回已占槽的另一个），
// close 时 release。两抽屉的**槽位协调**只经本模块（业务链路上二者仍有 import 环，按调用期解引用约定处理，
// 见 comments.js 头注；0.9.17 循环依赖漏导出正是"评论抽屉打不开"回归的温床）；Esc 与视频避让根类统一读 currentDrawer。
var drawerSlot = null; // { id: 'comments' | 'im', close: Function }
export function claimDrawer(id, close) {
  if (drawerSlot && drawerSlot.id !== id) drawerSlot.close();
  drawerSlot = { id: id, close: close };
}
export function releaseDrawer(id) {
  if (drawerSlot && drawerSlot.id === id) drawerSlot = null;
}
export function currentDrawer() { return drawerSlot; }
export function resetDrawerSlot() { drawerSlot = null; } // 整流卸载时调用：防残留闭包吃掉 Esc

// 按索引取 slide 元素；无 scroller 或不存在时返回 null
export function slideAt(idx) {
  return scroller && scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
}

// 舞台可见性（0.9.74）：竖刷被视图盖住时 scroller 是 display:none——无布局盒 ⇒ `offsetTop`
// 恒 0（落点会静默滚回第一条）、`video.play()` ＝幽灵音频。落点测量与自动起播前的统一判据，
// 放本模块与 scroller 同处（消费方只读，不必反向 import player，沿用既定理）。
export function stageVisible() {
  return !!(scroller && scroller.offsetParent !== null);
}

// "当前可播视频"覆盖钩子（0.9.74）：播放层的 slide 不在竖刷流里，键盘手势（空格/静音/快进）
// 必须打到层内那条。播放层进出时设置/清除；有钩子时**不回落**竖刷——层内还没挂上 video 就
// 该什么都不播，绝不能打到背后隐藏的竖刷（幽灵音频）。与 root/scroller 同款中介，读方零反向依赖
var videoTargetFn = null;
export function setVideoTarget(fn) { videoTargetFn = typeof fn === 'function' ? fn : null; }
export function videoTarget() { return videoTargetFn; }

// "当前待报会话"覆盖钩子（0.9.86）：播放层的 slide 不在竖刷流里，关页/切标签的兜底上报
// （report.reportLeaveCurrent）按 FeedStore.current 查 slide 永远查不到层内那条——层内观看
// 关页时最终进度全丢。与 videoTarget 同款中介、同款"不回落"纪律：有钩子说明播放层开着，
// 层内还没挂上会话就什么都不报，绝不能打到背后暂停的竖刷旧条（幽灵进度）。值=函数，
// 返回 { session, video }（层内当前会话），无层/未挂上返回 null
var watchTargetFn = null;
export function setWatchTarget(fn) { watchTargetFn = typeof fn === 'function' ? fn : null; }
export function watchTarget() { return watchTargetFn; }

// ---------- 播放层哨兵（0.9.78 契约函数化） ----------
// 播放层（playlayer）的 slide 不在竖刷流里，而且它的 idx 是哨兵：唯一判据是 dataset.ovl==='1'
// （playlayer 写、判据函数在此读出）。0.9.74 起这条约束只活在注释里——0.9.77 评审实锤
// player 的连播判定就靠"哨兵 -1 撞不上 current"的巧合正确。哨兵定义放本模块（零 import）：
// playlayer/attach/controls/slide/player 都能读，不会引入 playlayer↔消费方的环。
// 凡按 slide 的 idx 回查 FeedStore 的地方，一律先问 isOvlSlide/ownerIdxOf。
export var OVL_IDX = -1;
export function isOvlSlide(el) {
  return !!(el && el.dataset && el.dataset.ovl === '1');
}
export function ownerIdxOf(el) {
  if (isOvlSlide(el)) return OVL_IDX;
  return Number(el && el.dataset ? el.dataset.idx : NaN);
}
