// ---------- 错误盒单源（0.9.184） ----------
// player.js 的 showLoadError 与 playlayer.js 的 buildErr 原各建一份 .acsv-errbox——同 class、
// 同「文案 + 可选重试键」形态、同「点击先撤盒再重跑」出口纪律，属第二份看着一样的实现，此处
// 收口盒体与重试键。宿主差异（player 重试前要 FeedStore.reset() + 重挂 spinner、层内重试直接
// 重跑 load）一律经 onRetry 回调注入——盒体不反向 import 任何宿主（依赖方向：宿主 → errbox）。
//
// 边界（有意不并入）：slide.js:27 另有一只 .acsv-errbox——那是**构建期常驻**、显隐由
// .acsv-slide[data-state="error"] 驱动、重试走 stopPropagation + 重挂 attachVideo（不撤盒）的
// **结构件**，与这两个「按需挂、点击即撤」的浮出盒生命周期不同。同 imgload 白名单的例外登记法。
import { el } from './ui.js';

// 构建错误盒并挂到 host：msg 文案 + （onRetry 存在才挂的）重试键。「视频加载失败」这类必须能重试，
// 「链接不完整」这类不可重试（不传 onRetry）。box.style.display='grid' —— 浮出盒与转圈不并存
// （宿主调用前应已撤 spinner）。返回盒元素（调用方一般不需要）。
export function errBox(host, msg, onRetry) {
  var box = el('div', 'acsv-errbox');
  box.style.display = 'grid';
  box.appendChild(el('p', null, msg));
  if (onRetry) {
    var b = el('button', 'acsv-retry', '重试');
    b.addEventListener('click', function () {
      box.remove(); // 先撤盒再重跑：盒在则遮罩在（playlayer 0.9.77 教训）
      onRetry();
    });
    box.appendChild(b);
  }
  host.appendChild(box);
  return box;
}
