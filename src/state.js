// ---------- 共享 UI 单例状态 ----------
// root/scroller/commentDrawer 由 player 在挂载/卸载时赋值，comments/ui 只读。
// 单独成模块是为了让只读方不必反向 import player（避免无谓的循环依赖）。
export var root = null;
export var scroller = null;
export var commentDrawer = null;

export function setRoot(v) { root = v; }
export function setScroller(v) { scroller = v; }
export function setCommentDrawer(v) { commentDrawer = v; }

// 按索引取 slide 元素；无 scroller 或不存在时返回 null
export function slideAt(idx) {
  return scroller && scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
}
