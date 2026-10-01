// ---------- 共享 UI 单例状态 ----------
// root/scroller 由 player 挂载/卸载时赋值，commentDrawer 由 slide.js 建抽屉骨架时赋值
// （player 卸载时置空）；comments/ui 只读。
// 单独成模块是为了让只读方不必反向 import player（避免无谓的循环依赖）。
export var root = null;
export var scroller = null;
export var commentDrawer = null;

export function setRoot(v) { root = v; }
export function setScroller(v) { scroller = v; }
export function setCommentDrawer(v) { commentDrawer = v; }

// ---------- 抽屉槽位协调 ----------
// 右侧抽屉（评论/私信）同一时刻只开一个：open 前 claim 占槽（自动收回已占槽的另一个），
// close 时 release。两抽屉模块各自只依赖本模块、互不 import（0.9.17 循环依赖漏导出
// 正是"评论抽屉打不开"回归的温床）；Esc 与视频避让根类统一读 currentDrawer。
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
