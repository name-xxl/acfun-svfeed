import { el } from './ui.js';
import { openMomentEditor } from './momenteditor.js';

// ---------- 发布常驻浮标（0.9.224；0.9.294 显示协调批 → 确认稿 docs/preview/pubfab-backtop.html 案 C2+） ----------
// 右下角一枚圆钮，**钉在「回到顶部」按钮之上**，在本页**常驻**（不随滚动出现/消失）。
// 消费方三处：我的页（0.9.294 起**仅动态档可见**，切档只切显隐——见 mypage select 回调）/
// 广场视图 / 原生 /member/feeds —— 三处旧入口（广场顶部工具条、我的页 tab 行按钮、原生导航项）
// 一并撤掉，统一成这一个机制（用户裁决 2026-10-10）。
//
// **位置**（与回顶错开 10px，两者**右缘同线**——0.9.294 矫正横向错位；0.9.295 补滚动条补偿）：
//   · 暗色（脚本视图内）：`right:30 + 滚动条宽 bottom:94`——回顶是 **sticky**，横向基准是滚动容器
//     **内容盒**（.acsv-view-body padding-right 24 + .acsv-backtop margin 6 + **容器自己的经典滚动条**）；
//     浮标是 **fixed**，基准是 ICB（不含滚动条）⇒ 两者恒差一条滚动条宽。真机实测差 9.5px
//     （Windows Chromium `scrollbar-width:thin`）。**无头 Chromium 用覆盖式滚动条（宽 0）⇒ harness
//     恒看不到这条缝**（docs/api-research §10.15 同款盲区）——故补偿在运行时量（见 syncCornerRight）。
//     回顶占 [48,84] ⇒ 浮标 bottom 94 错开 10。
//   · 浅色（原生页 .acsv-mp 语境）：`right:24 bottom:74`——浅色回顶是 **fixed** right:24，两钮基准
//     同为 ICB ⇒ 本就同线，**不做补偿**。
// **形态（C2+，用户 2026-10-29 裁决）**：折叠=36 圆与回顶（.acsv-tbtn 36）等大；hover **右缘锚定**
// 向左展开椭形长条（36→88，「发动态」滑出；图标钉右零位移）。图标=内联 SVG 铅笔（chevUp 同族
// 「24 viewBox 单 path + fill」语言），退役文本字符 ✎（字形随系统字体漂移）。
// **层级 z:57**（本件头注最要紧的一条）：压住列表内容(55)/dock(56)/顶栏(57)，但**被抽屉(58)、
// 动态详情(61)、编辑器模态(62)、大图(63) 依次盖住**——浮标**绝不能**盖住它自己打开的编辑器。
// 现有全局浮标先例 `#acsv-fab` 用 z:2147482990（压一切）**不能照抄**：那样点开编辑器后右下角
// 还杵着一个钮，既难看又可误点。
//
// 误触代价可控：点开的是编辑器（不是直接发），且提交中编辑器不许关。

// host：挂载点（视图体或 body，暗色宿主应＝滚动容器本身）。opts.light：原生页浅色语境。
// 返回 { el, remove, syncCornerRight }（视图 teardown 可显式摘；随宿主 DOM 一起销毁也成立）
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

  // 右缘补偿（0.9.295，真机实测差 9.5px）：见头注——fixed 对 ICB、sticky 对内容盒，差值＝滚动条宽。
  // 容器内容从空到满、切档换面板都会让滚动条出现/消失 ⇒ 用 ResizeObserver 跟着容器内容盒重算
  //（滚动条出现本身就是内容盒变窄，会触发一次）。浅色语境两钮同基准，不做补偿。
  function syncCornerRight() {
    if (opts.light) return;
    if (typeof host.offsetWidth !== 'number') return; // window 等非元素宿主：无滚动条可言
    btn.style.right = cornerRightOf(host.offsetWidth, host.clientWidth, FAB_BASE_R) + 'px';
  }
  syncCornerRight();
  var ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(syncCornerRight);
    ro.observe(host);
  }

  return {
    el: btn,
    syncCornerRight: syncCornerRight,
    remove: function () {
      if (ro) { ro.disconnect(); ro = null; }
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    }
  };
}

// 右下角基准（暗色）：回顶内容盒右缘 24+6
var FAB_BASE_R = 30;

// 与回顶同线所需的 right = 基准 + 滚动容器经典滚动条宽（覆盖式滚动条=0 ⇒ 原值）。
// offsetWidth−clientWidth 同时含 border；本项目滚动容器（.acsv-view-body）无 border，
// 故差值即滚动条宽。**两侧都须是可用的正数**才谈滚动条——任一侧缺值/非数一律不补偿
//（缺 clientWidth 若按 0 算会得出 +整宽 的荒谬值，单测钉死）；差值≤0 同样归零。纯函数，单测直采。
export function cornerRightOf(offsetW, clientW, base) {
  var b = Number(base) || 0;
  var ow = Number(offsetW), cw = Number(clientW);
  if (!isFinite(ow) || !isFinite(cw) || ow <= 0 || cw <= 0) return b;
  var d = ow - cw;
  return b + (d > 0 ? d : 0);
}

// 铅笔 path 数据（Material edit 实心）——与 chevUp 同族「24 viewBox + 单 path + fill:currentColor」
// 语言；图形样式全在 cssraw .acsv-pubfab 段（18px fill #fff flex none）
var ICON_PEN_D = 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';
