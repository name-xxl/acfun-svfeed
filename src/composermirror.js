import { el } from './ui.js';
import { mirrorHtml, attachTokenEdit } from './tokenedit.js';
import { emotImgOf, emotPlaceholderHtml, ensureEmotionMap } from './emoticon.js';

// ---------- 输入框镜像层（0.9.221） ----------
// 「写的时候就看得见表情」：textarea 文字透明、只留光标；下层叠一个**同度量**的 div，
// 把 UBB 令牌画成图（表情出真图、图片出「图片」小块）。配合 tokenedit 的令牌原子化，
// 三处输入框（评论 / 私信 / 动态编辑器）手感一致。
//
// **为什么单开一件、而不是塞进 inputbar**：inputbar 在 README 分层里属**基建层**（方向诊断的
// INFRA 集），让它 import 特性层的 emoticon 会新增「基建 → 特性」反向边（check-direction 口径 A
// 会红）。本件是**装饰器**——输入条仍由 inputbar 纯建 DOM，谁要表情渲染谁包一层：
//     var bar = buildInputBar(...); decorateInput(bar);
// 调一次拿齐：镜像层渲染 + 令牌原子编辑（删除整块/选区吸附/方向键跳过）。
//
// 表情取 **B 口径（height:1em）**：图矮于行框 ⇒ 不撑行高 ⇒ 两侧行数永远一致（不漂移）。
// 同度量是命门（字号/行高/内边距/断行逐项对齐），改 inputbar 的输入框度量时必须同步 styles 里
// `.acsv-cinput-mir` 那组值。

// 令牌 → 镜像层 HTML：表情出真图（map 未就绪先出 [表情] 占位，map 到位后重画），图片出小块
function tokenHtml(raw) {
  var m = /^\[emot=([^,]+),([^\/\]]+)\/\]$/.exec(raw);
  if (m) {
    var im = emotImgOf(m[1], m[2]);
    return im ? im.html : emotPlaceholderHtml(m[1], m[2]);
  }
  return '<span class="acsv-cinput-imgtok">图片</span>';
}

// 给 inputbar.buildInputBar 的句柄挂上镜像层（幂等：重复调用不重复包装）
export function decorateInput(bar) {
  if (!bar || !bar.input || bar.mirror) return bar; // 幂等：重复调用不重复包装
  var input = bar.input;
  var mirror = el('div', 'acsv-cinput-mir');
  var wrap = el('div', 'acsv-cinput-wrap');
  // 重挂：wrap 替下 textarea 在原位（保持它在 .acsv-cinput 行里的位置与弹性）
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(mirror);
  wrap.appendChild(input);

  function renderMirror() {
    var html = mirrorHtml(input.value, tokenHtml);
    if (/\n$/.test(input.value)) html += '<br>'; // 末尾换行要占位，否则镜像层比 textarea 少一行
    mirror.innerHTML = html;
    mirror.scrollTop = input.scrollTop;
  }
  bar.mirror = mirror;
  bar.renderMirror = renderMirror;
  // 令牌原子编辑（删除整块/选区吸附/方向键跳过）；编辑落地后重画镜像层
  bar.tk = attachTokenEdit(input, { onEdit: renderMirror });
  input.addEventListener('input', renderMirror);
  input.addEventListener('scroll', renderMirror);
  ensureEmotionMap().then(renderMirror, function () { }); // map 到位后把占位换成真图
  renderMirror();
  return bar;
}
