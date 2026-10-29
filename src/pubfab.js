import { el } from './ui.js';
import { openMomentEditor } from './momenteditor.js';

// ---------- 发布常驻浮标（0.9.224；0.9.294 显示协调批 → 确认稿 docs/preview/pubfab-backtop.html 案 C2+） ----------
// 右下角一枚圆钮，**钉在「回到顶部」按钮之上**，在本页**常驻**（不随滚动出现/消失）。
// 消费方三处：我的页（0.9.294 起**仅动态档可见**，切档只切显隐——见 mypage select 回调）/
// 广场视图 / 原生 /member/feeds —— 三处旧入口（广场顶部工具条、我的页 tab 行按钮、原生导航项）
// 一并撤掉，统一成这一个机制（用户裁决 2026-10-10）。
//
// **位置**（与回顶错开 10px，两者**右缘同线**——0.9.294 矫正横向错位）：
//   · 暗色（脚本视图内）：`right:30 bottom:94`（回顶 sticky 基准=内容盒右缘 24+margin 6=30 同线；
//     回顶占 [48,84] ⇒ 浮标 bottom 94 错开 10）
//   · 浅色（原生页 .acsv-mp 语境）：`right:24 bottom:74`（回顶浅色是 fixed right:24 bottom:28，本就对齐）
// **形态（C2+，用户 2026-10-29 裁决）**：折叠=36 圆与回顶（.acsv-tbtn 36）等大；hover **右缘锚定**
// 向左展开椭形长条（36→88，「发动态」滑出；图标钉右零位移）。图标=内联 SVG 铅笔（chevUp 同族
// 「24 viewBox 单 path + fill」语言），退役文本字符 ✎（字形随系统字体漂移）。
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
  var btn = el('button', 'acsv-pubfab' + (opts.light ? ' acsv-pubfab-light' : ''));
  btn.type = 'button';
  btn.title = '发动态';
  btn.appendChild(el('span', 'acsv-pubfab-lb', '发动态'));
  // 铅笔 SVG 走 SVG 命名空间（el/elHtml 是 HTML 空间，innerHTML 拼不出真 svg——0.9.80 教训族）
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICON_PEN_D);
  svg.appendChild(path);
  btn.appendChild(svg);
  btn.setAttribute('data-acsv-pubfab', '1');
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    // 浅色宿主（原生页）里打开的编辑器也走浅色皮肤（0.9.226：用户实报"原生页的皮肤是暗色的"）
    openMomentEditor(Object.assign({ light: !!opts.light }, opts.editorOpts || {}));
  });
  host.appendChild(btn);
  return {
    el: btn,
    remove: function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }
  };
}

// 铅笔 path 数据（Material edit 实心）——与 chevUp 同族「24 viewBox + 单 path + fill:currentColor」
// 语言；图形样式全在 cssraw .acsv-pubfab 段（18px fill #fff flex none）
var ICON_PEN_D = 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';
