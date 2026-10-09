import { el } from './ui.js';
import { openMomentEditor } from './momenteditor.js';

// ---------- 发布常驻浮标（0.9.224） ----------
// 右下角一枚圆钮，**钉在「回到顶部」按钮之上**，在本页**常驻**（不随滚动出现/消失）。
// 消费方三处：我的页（四档共用）/ 广场视图 / 原生 /member/feeds —— 三处旧入口（广场顶部工具条、
// 我的页 tab 行按钮、原生导航项）一并撤掉，统一成这一个机制（用户裁决 2026-10-10）。
//
// **位置**（与回顶错开 10px，两者靠右下角对齐）：
//   · 暗色（脚本视图内）：`right:18 bottom:70`（回顶暗色下是流内 sticky `bottom:18`、高 36）
//   · 浅色（原生页 .acsv-mp 语境）：`right:24 bottom:80`（回顶浅色下是 fixed `bottom:28`）
// **层级 z:57**（本件头注最要紧的一条）：压住列表内容(55)/dock(56)/顶栏(57)，但**被抽屉(58)、
// 动态详情(61)、编辑器模态(62)、大图(63) 依次盖住**——浮标**绝不能**盖住它自己打开的编辑器。
// 现有全局浮标先例 `#acsv-fab` 用 z:2147482990（压一切）**不能照抄**：那样点开编辑器后右下角
// 还杵着一个钮，既难看又可误点。
//
// 误触代价可控：点开的是编辑器（不是直接发），且提交中编辑器不许关。

// host：挂载点（视图体或 body）。opts.light：原生页浅色语境。
// 返回 { el, remove }（视图 teardown 可显式摘；随宿主 DOM 一起销毁也成立）
export function mountPubFab(host, opts) {
  opts = opts || {};
  if (!host) return null;
  if (host.querySelector && host.querySelector('.acsv-pubfab')) return null; // 幂等
  var btn = el('button', 'acsv-pubfab' + (opts.light ? ' acsv-pubfab-light' : ''), '✎');
  btn.type = 'button';
  btn.title = '发动态';
  btn.setAttribute('data-acsv-pubfab', '1');
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    openMomentEditor(opts.editorOpts || {});
  });
  host.appendChild(btn);
  return {
    el: btn,
    remove: function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }
  };
}
