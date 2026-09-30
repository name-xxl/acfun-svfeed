// ---------- 配图大图查看器（0.9.40 自 comments.js 迁出：评论/私信共用） ----------
// 逻辑零业务语义，依赖仅 root + el + .acsv-imgview 样式（styles.js，无作用域前缀本就通用）。
// 单例浮层挂在 root 上（盖过评论/私信抽屉）；打开期间 capture 键盘监听拦截按键（模态语义）。
// Escape 的关闭在 input.js 分支里显式先行（isImgviewOpen 判定）——不依赖监听器注册顺序
import { root } from './state.js';
import { el } from './ui.js';

var imgview = null;
function onImgviewKey(ev) {
  ev.stopPropagation();
  if (ev.key === 'Escape') closeImageViewer();
}
export function isImgviewOpen() {
  return !!imgview;
}
export function closeImageViewer() {
  if (!imgview) return;
  var v = imgview;
  imgview = null;
  window.removeEventListener('keydown', onImgviewKey, true);
  v.remove();
}
export function openImageViewer(src) {
  closeImageViewer();
  if (!root || !src) return;
  imgview = el('div', 'acsv-imgview');
  var img = el('img');
  img.src = src;
  img.referrerPolicy = 'no-referrer';
  imgview.appendChild(img);
  imgview.addEventListener('click', closeImageViewer);
  root.appendChild(imgview);
  window.addEventListener('keydown', onImgviewKey, true);
}
