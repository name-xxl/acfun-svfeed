// ---------- 配图大图查看器（0.9.41 自 comments.js 迁出：评论/私信共用） ----------
// 逻辑零业务语义，依赖仅 root + el + overlay 浮层栈 + .acsv-imgview 样式（styles.js，无作用域前缀本就通用）。
// 单例浮层挂在 root 上（盖过评论/私信抽屉）；模态键语义由 overlay.js 统一承载（0.9.61：
// 此前的 capture 自关在合成事件路径会与 input.js 连关两层，收口单点）。
import { root } from './state.js';
import { el } from './ui.js';
import { overlayOpen, overlayClose } from './overlay.js';

var imgview = null;
export function closeImageViewer() {
  if (!imgview) return;
  var v = imgview;
  imgview = null;
  v.remove();
  overlayClose('imgview'); // 已出栈（Esc 路径）时空转；显式关闭路径（点背景）由此同步栈
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
  overlayOpen({ id: 'imgview', modal: true, close: closeImageViewer });
}
