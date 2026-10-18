import { el, elHtml, esc, a11y, closeOnOutsideClick } from './ui.js';
import { GLYPHS } from './imicons.js';
import { emotImgOf, emotPlaceholderHtml, ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { testHook } from './dbg.js';

// ---------- 三宿主共用输入条（0.9.238 富文本重写：contenteditable + 出口序列化） ----------
// 演变：0.9.41 textarea 收敛三处（评论 / 私信 / 动态编辑器）→ 0.9.221 textarea + 镜像层
// （composermirror）+ 令牌原子化（tokenedit）→ 本版换成**富文本载体**：编辑期就是真实 DOM 节点
// （表情＝<img>、配图＝缩略块、格式＝<b>/<i>/…），提交时出口序列化回 UBB 文本。
//
// 依据＝官方实测（docs/api-research.md §11.7 / §11.8，2026-10-14 真机静态分析）：官方评论编辑器就是
// **主文档内的 contenteditable 元素**（UMEditor 精简版：DOM 即内容真源 + 出口序列化），表情插入走
// execCommand("insertimage") 即真实 <img> 节点，字数 getContentLength ＝纯文本 + 每个图节点计 1，
// 工具栏 = bold italic underline strikethrough | forecolor | emotion image。
// 形态＝docs/preview/composer-richtext.html（2026-10-14/15 用户裁决：上下分层 + 工具栏下分隔线 +
// 颜色键 + 原生字形图标 + 配图缩略块 + 编辑期表情 1em）。
//
// **为什么换载体**（textarea 时代要自建两件套补浏览器的课）：textarea 里表情只是一串文本令牌
// （`[emot=acfun,123/]` 17 字符），退格会把令牌劈成垃圾、拖选能选中半个、方向键穿过令牌内部——
// 于是有了镜像层（看得见）+ 令牌原子化（编得动）。换成 DOM 节点后这些全是**浏览器原生行为**：
//   · 退格/删除整块删（img / contenteditable=false 块都是原子的）；
//   · Ctrl+Z 撤销完整可用——前提是**程序化插入统一走 execCommand('insertHTML')**（预览稿 ⑤ 实测
//     定论：Range.insertNode 不进撤销栈，会致 Ctrl+Z 错乱：先把先前删掉的表情"捞"回来叠加重复）；
//   · 选区/方向键天然整块跳过。
// ⇒ composermirror.js / tokenedit.js 两件套随之退役（本批删除，勿再加回）。
//
// 分层（预览稿 ①）：上行＝工具栏（B I U S · A 颜色 · 细分隔线 · 表情 / 图片 · 最右字数），
// 下行＝编辑区 + 发送。理由：横向单行塞不下 7 键（380 宽私信抽屉只能另造一套排布），官方 UMEditor
// 也是工具条在上、编辑区在下。代价：输入条 56 → 84px（三宿主同增；空态亦然——聚焦不跳版）。
//
// 出口序列化口径（预览稿 ⑧ 表；逐条对齐官方 Fe 序列化器）：<b>/<strong>→[b]、<i>/<em>→[i]、
// <u>→[u]、<s>/<strike>/<del>→[s]、行内 text-decoration 的 span →[u]/[s]、color 的 span →
// [color=#hex]、<img src alt>→[img=alt]url[/img]、表情 img→[emot=pkg,id/]、<br>→\r\n、
// 三连以上空行压两行、纯文本原样。渲染侧对应四条 [b]/[i]/[u]/[s] 规则本批补进 src/ubb.js；
// [color] 渲染侧早已支持（限 hex 白名单）。
//
// 差异语义仍由 opts 注入（三宿主表的每一格）：
//   img       {title, onFile} 图片按钮 + 隐藏 file input（评论=上传后插配图块；私信=即选即发图片消息）
//   placeholder / maxLength / countMax（字数恒显示 n/max）/ sendEnabled(state)（发送键启用谓词）/
//   onSend / onState（宿主跟字数红态、超限提示用）
// 行为纪律不变：Enter 发送（Shift 换行）、Esc 失焦、栏内按键 stopPropagation、组合期豁免。
//
// 超字数（预览稿 ⑩ 第 10 项，按稿面实现＝**硬拒绝**）：超限时字数与输入框转红、发送键禁用
// （宿主可经 onState 另出提示行）；服务端上限仍是最终真相（如动态 140000），
// 客户端只做「不让发出去」这一层。
//
// 待真机抽验（本批只到 harness）：① 服务端对 [b]/[i]/[u]/[s]/[color] 的接受与回显；
// ② 粘贴清洗只做最保守的纯文本化（官方 filterRules 全集见 §11.8「仍未实测」，不照抄）；
// ③ 配图块在 XSS 过滤与移动端渲染下的形态。

// ================= 令牌节点：编辑期形态与出口序列化的单源 =================
// 三型：表情 <img class="ubb-emotion" data-pkg data-id>（回程信息挂在 data 上，不必像官方那样
// 按 src 反查）、配图块 <span class="acsv-cinput-imgblk" contenteditable="false">（缩略图 +
// 文件名，原子块）、占位 <span class="ubb-emot-ph" data-pkg data-id>（EmotionMap 晚到时的回填锚，
// 与渲染侧 emoticon.emotPlaceholderHtml 同名同款）。识别、计数、序列化三处共用 tokenInfo 单源。

var EMOT_CODE = /^\[emot=([^,]+),([^\/\]]+)\/\]$/;
var IMG_CODE = /^\[img=([^\]]*)\]([\s\S]+)\[\/img\]$/;

function firstOfHtml(html) {
  return elHtml('span', null, html).firstChild; // 包一层再取首子：图节点自带 outerHTML 骨架
}

function emotNode(pkg, id) {
  var hit = emotImgOf(pkg, id);
  if (!hit) return firstOfHtml(emotPlaceholderHtml(pkg, id));
  var img = firstOfHtml(hit.html);
  img.setAttribute('data-pkg', pkg);
  img.setAttribute('data-id', id);
  img.setAttribute('alt', '表情');
  return img;
}

function imgBlockNode(url, name) {
  var blk = el('span', 'acsv-cinput-imgblk');
  blk.contentEditable = 'false'; // 原子块：退格/删除整块走，光标不许落进文件名
  blk.setAttribute('data-url', url);
  blk.setAttribute('data-name', name || '图片');
  var im = el('img');
  im.src = url;
  im.alt = name || '图片';
  im.referrerPolicy = 'no-referrer';
  blk.appendChild(im);
  blk.appendChild(el('span', 't', name || '图片'));
  return blk;
}

// UBB 短代码 → 节点（未命中返回 null：调用方按字面文本处理）
function nodesOfCode(code) {
  var m = EMOT_CODE.exec(code);
  if (m) return [emotNode(m[1], m[2])];
  m = IMG_CODE.exec(code);
  if (m) return [imgBlockNode(m[2], m[1] || '图片')];
  return null;
}

// 令牌识别（**单源**：序列化与计数都从这里问"这是不是一个令牌块"）
function tokenInfo(node) {
  if (node.nodeType !== 1) return null;
  var tag = node.tagName.toLowerCase();
  if (tag === 'img') {
    var id = node.getAttribute('data-id');
    if (id) return { emot: true, pkg: node.getAttribute('data-pkg') || 'acfun', id: id };
    return { emot: false, url: node.getAttribute('data-url') || node.getAttribute('src') || '', name: node.getAttribute('alt') || '图片' };
  }
  if (tag !== 'span') return null;
  if (node.classList.contains('acsv-cinput-imgblk')) {
    var im = node.querySelector('img');
    return {
      emot: false,
      url: node.getAttribute('data-url') || (im && im.getAttribute('src')) || '',
      name: node.getAttribute('data-name') || (im && im.getAttribute('alt')) || '图片'
    };
  }
  if (node.classList.contains('ubb-emot-ph')) {
    var pid = node.getAttribute('data-id');
    if (!pid) return null;
    return { emot: true, pkg: node.getAttribute('data-pkg') || 'acfun', id: pid };
  }
  return null;
}

// ---------- 出口序列化（DOM → UBB） ----------
// 空包装（<b></b> 这类）不出标记——官方序列化器收尾同样去空标记
function serNode(n) {
  if (n.nodeType === 3) return n.nodeValue;
  if (n.nodeType !== 1) return '';
  var tk = tokenInfo(n);
  if (tk) {
    return tk.emot
      ? (tk.id ? '[emot=' + tk.pkg + ',' + tk.id + '/]' : '')
      : (tk.url ? '[img=' + tk.name + ']' + tk.url + '[/img]' : '');
  }
  var tag = n.tagName.toLowerCase();
  if (tag === 'br') return '\r\n';
  var inner = '';
  for (var i = 0; i < n.childNodes.length; i++) inner += serNode(n.childNodes[i]);
  if (!inner) return '';
  var ubb;
  if (tag === 'b' || tag === 'strong') ubb = '[b]' + inner + '[/b]';
  else if (tag === 'i' || tag === 'em') ubb = '[i]' + inner + '[/i]';
  else if (tag === 'u') ubb = '[u]' + inner + '[/u]';
  else if (tag === 's' || tag === 'strike' || tag === 'del') ubb = '[s]' + inner + '[/s]';
  else if (tag === 'div' || tag === 'p') ubb = inner + '\r\n'; // 块级（原生粘贴/换行）折算成换行
  else ubb = inner;
  return styleWrap(n, ubb);
}

// 行内 style → UBB 包装。**任何标签**都可能带 style——2026-10-15 探针实测：execCommand
// foreColor（styleWithCSS=true）在选区落在 <b>/<u> 上时把 color 写进**那个标签自己的 style**，
// 而不是新包一个 span（预览稿 ⑪ 的样例行是 span 形态，只认 span 会整条丢色）。
// 颜色限 #hex（渲染侧白名单同限；rgb → hex 的归一在 normalizeColors，出口文本里不会出现 rgb）
function styleWrap(n, ubb) {
  var st = n.getAttribute('style') || '';
  if (!st) return ubb;
  var cm = /(?:^|;)\s*color:\s*(#[0-9a-f]{3,8})\s*(?:;|$)/i.exec(st);
  if (cm) return '[color=' + cm[1].toLowerCase() + ']' + ubb + '[/color]';
  if (/text-decoration[^;]*underline/i.test(st)) return '[u]' + ubb + '[/u]';
  if (/text-decoration[^;]*line-through/i.test(st)) return '[s]' + ubb + '[/s]';
  return ubb;
}

export function serializeUbb(root) {
  var out = '';
  for (var i = 0; i < root.childNodes.length; i++) out += serNode(root.childNodes[i]);
  // 收尾（官方口径）：行首尾空白不进正文、三连以上空行压两行、首尾空行去掉。
  // 正则用 (?:\r\n)+ 而不是 \r\n+——后者只吃一个 \n（0.9.238 harness 实测：`<br><br>` 壳只被
  // 吃掉一半，出口文本两头各多留一个空行）
  return out.replace(/[ \t]*\r\n[ \t]*/g, '\r\n')
    .replace(/(?:\r\n){3,}/g, '\r\n\r\n')
    .replace(/^(?:\r\n)+|(?:\r\n)+$/g, '');
}

// 字数（官方 getContentLength 口径）：纯文本去 \t\r\n 后的长度 + **每个令牌块计 1**（图/表情）。
// 配图块的文件名、占位 span 的文字都不计——块整体算一个字（这是"图名不许吃字数"的口径）
export function countUnits(root) {
  var n = 0;
  (function walk(elm) {
    for (var i = 0; i < elm.childNodes.length; i++) {
      var c = elm.childNodes[i];
      if (c.nodeType === 3) { n += c.nodeValue.replace(/[\t\r\n]/g, '').length; continue; }
      if (c.nodeType !== 1) continue;
      var tk = tokenInfo(c);
      if (tk) { if (tk.emot ? !!tk.id : !!tk.url) n += 1; continue; }
      var tag = c.tagName.toLowerCase();
      if (tag === 'br') continue; // 换行不占字
      walk(c);
    }
  })(root);
  return n;
}

// UBB 文本 → 节点（程序化回填单源：清空 / 切会话回填 / 发送失败恢复）。只认三件事：两种令牌
// 代码转节点、换行转换行、其余原样文本。**不做 UBB 富文本反向解析**——回填载荷都是纯文本
// （转发摘要 / 引用正文 / 失败恢复原文），出「富文本回填」需求时再谈（那才需要官方
// convertEmotionCodeToHtml 的全集）
function setUbbText(root, v) {
  var text = String(v == null ? '' : v);
  root.innerHTML = '';
  if (!text) return;
  function textPart(t) {
    var lines = t.split(/\r\n|\r|\n/);
    for (var k = 0; k < lines.length; k++) {
      if (k) root.appendChild(document.createElement('br'));
      if (lines[k]) root.appendChild(document.createTextNode(lines[k]));
    }
  }
  var re = /\[emot=[^,]+,[^\/\]]+\/\]|\[img=[^\]]*\][\s\S]*?\[\/img\]/g;
  var i = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > i) textPart(text.slice(i, m.index));
    var nodes = nodesOfCode(m[0]);
    if (nodes) nodes.forEach(function (x) { root.appendChild(x); });
    else textPart(m[0]);
    i = m.index + m[0].length;
  }
  if (i < text.length) textPart(text.slice(i));
}

// ---------- 程序化插入 ----------
// 一律走 execCommand('insertHTML')：**进浏览器原生撤销栈**（头注的 ⑤ 实测定论）；execCommand
// 不可用（老内核/被禁）才退回 Range.insertNode——该路径丢撤销，属降级路径
export function insertHtmlAtCaret(host, html) {
  host.focus();
  placeCaretEndIfOutside(host);
  try { if (document.execCommand('insertHTML', false, html)) return true; } catch (e) { /* best-effort: cleanup */ }
  return false;
}

function placeCaretEndIfOutside(host) {
  var sel = window.getSelection();
  if (sel && sel.rangeCount && host.contains(sel.anchorNode)) return;
  sel = window.getSelection();
  if (!sel) return;
  var r = document.createRange();
  r.selectNodeContents(host);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}

function insertNodeFallback(host, node) {
  var sel = window.getSelection();
  if (!sel) return;
  placeCaretEndIfOutside(host);
  sel = window.getSelection();
  if (!sel.rangeCount) return;
  var range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
}

// 颜色键产物归一：Chrome 的 foreColor 把颜色写成 rgb() 进 style（且可能落在 <b>/<u>/span 任一
// 标签上，见 styleWrap 注），而出口序列化与渲染侧白名单都只认 #hex ⇒ 落库前必须归一。
// 只碰形如 rgb/rgba 的 color 属性（`(^|;)` 前缀锚定：background-color 不误伤）
function normalizeColors(root) {
  [].forEach.call(root.querySelectorAll('[style*="color"]'), function (elm) {
    var st = elm.getAttribute('style') || '';
    var out = st.replace(/(^|;)(\s*)color:\s*rgba?\(([^)]+)\)/gi, function (whole, sep, sp, nums) {
      var p = String(nums).split(',');
      if (p.length < 3) return whole;
      var hexes = [];
      for (var i = 0; i < 3; i++) {
        var n = Math.round(Number(String(p[i]).trim()));
        if (isNaN(n)) return whole;
        n = Math.max(0, Math.min(255, n));
        hexes.push(('0' + n.toString(16)).slice(-2));
      }
      return sep + sp + 'color:#' + hexes.join('');
    });
    if (out !== st) elm.setAttribute('style', out);
  });
}

// 色板 = 官方全量 70 色（0.9.239；官方实测逐格抄录，见 docs/api-research.md §11.10）：
// 「主题颜色」6 行 × 10（Office 2007 主题表：首行 黑白+6 主色+2 强调，下面 5 行是同色系深浅阶）
// + 「标准颜色」1 行 × 10。官方实例里另有顶栏（128×20 预览 + 「无颜色」）在 CSS 里但**未渲染**，
// 故不搬。全部 #hex —— 渲染侧 [color] 限 hex 白名单（src/ubb.js）。
// 导出供单测直采（表本身就是官方实测的抄录件，改一处必须同步单测）
export var THEME_COLORS = [
  ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
  ['#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada'],
  ['#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5'],
  ['#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f'],
  ['#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09'],
  ['#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806']
];
export var STD_COLORS = [
  ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0']
];

// ================= 输入条本体 =================
export function buildInputBar(opts) {
  opts = opts || {};
  // insertOnly：**纯文本宿主**（私信）——不摆格式键（B/I/U/S）与颜色键。理由＝私信 wire 方言是
  // 纯文本 + 表情令牌：收侧渲染就是 emotify(linkify())（imdrawer.imTextHtml），官方客户端同理；
  // 分享消息还要刻意用 ubbPlain 压平成明文"只求官方可读"（immsg.js:232）⇒ 发 [b]/[color] 给对方
  // 看到的是字面标签。表情/图片不受影响（[emot=acfun,id/] 是官方 IM 方言、图片走独立消息）。
  var plain = !!opts.insertOnly;
  var box = el('div', 'acsv-cinput');

  // ---- 上行：工具栏 ----
  var top = el('div', 'acsv-cinput-top');
  var fmtBtns = [];
  [['bold', GLYPHS.edBold, '加粗'], ['italic', GLYPHS.edItalic, '斜体'],
    ['underline', GLYPHS.edUnderline, '下划线'], ['strikeThrough', GLYPHS.edStrike, '删除线']]
    .forEach(function (f) {
      var b = elHtml('button', 'acsv-cinput-fmt', '<i class="acsv-ic">' + f[1] + '</i>');
      b.type = 'button';
      b._cmd = f[0];
      a11y(b, f[2]);
      // mousedown 阻止默认：**点击工具键不许抢走编辑区焦点/塌掉选区**——否则 B/I/U/S 无处可加
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        edit.focus();
        try {
          // styleWithCSS=false ⇒ 产标签（<b>/<i>/<u>/<strike>）而不是 style span——出口序列化认标签
          document.execCommand('styleWithCSS', false, false);
          document.execCommand(f[0]);
        } catch (e) { /* best-effort: cleanup */ }
        syncFmt();
        refresh();
      });
      fmtBtns.push(b); // 先建后落位：insertOnly 时整组不 append（键对象留着，syncFmt 遍历无副作用）
    });
  var sepAfterFmt = el('span', 'acsv-fmtsep'); // 竖分隔线两条（官方 S 后 / 颜色键后各一条）

  // 颜色键 = 官方 splitbutton 三件（0.9.239；实测官 DOM：主键 .edui-btn（图标 + 当前色条）
  // + 箭头键 .edui-dropdown-toggle（.edui-caret 字形 E166））：
  //   主键 18×18  点 = 把「当前色」刷到选中文字上（不弹面板）
  //   箭头键 14×18 点 = 开/收色板（官方 .edui-active 亮起）
  //   色条 16×2   挂在**主键内**（官方 label 就是主键的子元素 ⇒ left:50% 相对主键，
  //               居中于 A 字形；挂到 32 宽的包裹层上会右移 7px——2026-10-15 用户实拍后的定论）
  //   初值 = 编辑区当前字色（官方该条初值即编辑器文字色），选色后 = 所选色
  var colKey = el('span', 'acsv-cinput-colkey');
  var colBtn = elHtml('button', 'acsv-cinput-fmt', '<i class="acsv-ic">' + GLYPHS.edColor + '</i>');
  colBtn.type = 'button';
  a11y(colBtn, '字体颜色');
  colBtn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
  var colLabel = el('span', 'acsv-cinput-collabel');
  colBtn.appendChild(colLabel);
  var colCaret = elHtml('button', 'acsv-cinput-fmt acsv-cinput-colcaret', '<i class="acsv-ic">' + GLYPHS.edCaret + '</i>');
  colCaret.type = 'button';
  a11y(colCaret, '选择颜色');
  colCaret.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
  colKey.appendChild(colBtn);
  colKey.appendChild(colCaret);

  var colPop = el('div', 'acsv-colpop'); // 显隐走 .on 类（CSS 里 display:none → block）
  var lastColor = ''; // '' = 还没选过（色条显示编辑区当前字色）
  // 色板 = 官方全量 70 色（主题颜色 6×10 + 标准颜色 1×10，两个行标题；10 列 / 格 14×14 /
  // 列距 18；逐格 data-color 实测抄录，见 docs/api-research.md §11.10）
  [['主题颜色', THEME_COLORS], ['标准颜色', STD_COLORS]].forEach(function (grp) {
    colPop.appendChild(el('div', 'acsv-colpop-h', grp[0]));
    grp[1].forEach(function (row, ri) {
      var g = el('div', 'acsv-colpop-g' + (ri === 0 ? ' first' : ''));
      row.forEach(function (hex) {
        var sw = el('i');
        sw.style.background = hex;
        sw.setAttribute('data-color', hex);
        sw.addEventListener('mousedown', function (ev) { ev.preventDefault(); }); // 同格式键：不许塌选区
        sw.addEventListener('click', function (ev) {
          ev.stopPropagation();
          applyColor(hex);
          hideCol();
          syncFmt();
          refresh();
        });
        g.appendChild(sw);
      });
      colPop.appendChild(g);
    });
  });
  function applyColor(hex) {
    edit.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, hex);
    } catch (e) { /* best-effort: cleanup */ }
    normalizeColors(edit); // Chrome 写 rgb()，出口与渲染白名单只认 hex
    lastColor = hex;
    paintColorLabel();
  }
  // 色条：**选过色才写内联**，没选过就清空内联 ⇒ 露出 CSS 的 --acsv-edit-fg（由皮肤给：
  // 暗 #e8eaee / 浅 #333）——官方该条初值即编辑器文字色，用变量省掉"建条时机拿不到皮肤"的坑
  function paintColorLabel() { colLabel.style.background = lastColor || ''; }
  // 主键：应用当前色（还没选过 ⇒ 当前色就是编辑区字色，点了等于不动色——与官方同语义）
  colBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (!lastColor) return;
    applyColor(lastColor);
    refresh();
  });
  // 箭头键：开/收色板
  colCaret.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleCol(!colPop.classList.contains('on')); // 开/收：状态在 .on 类上（CSS 控 display）
  });
  function hideCol() { toggleCol(false); }
  function toggleCol(show) {
    colPop.classList.toggle('on', !!show);
    colCaret.classList.toggle('on', !!show); // 官方开面板时 splitbutton 亮起
    if (show && !colPop._outArmed) {
      colPop._outArmed = true;
      closeOnOutsideClick(colPop, [colCaret, colBtn], function () { toggleCol(false); });
    }
  }
  colKey.appendChild(colPop); // 弹层锚在 split 包裹层（position:relative）——输入条贴宿主底边，故向上开
  var sepAfterCol = el('span', 'acsv-fmtsep');
  // 格式组 + 颜色组按官方次序落位（insertOnly = 私信：两组都不摆，只剩插入键与字数）
  if (!plain) {
    fmtBtns.forEach(function (b) { top.appendChild(b); });
    top.appendChild(sepAfterFmt);
    top.appendChild(colKey);
    top.appendChild(sepAfterCol);
  }

  // ---- 表情键（面板由调用方 mountEmotButton 接管） ----
  var emotBtn = elHtml('button', 'acsv-cinput-emot', '<i class="acsv-ic">' + GLYPHS.edEmotion + '</i>');
  emotBtn.type = 'button';
  a11y(emotBtn, '表情');
  top.appendChild(emotBtn);

  // ---- 图片键（file input 随宿主语义：评论=上传后插配图块，私信=即选即发图片消息） ----
  var imgBtn = null, fileInp = null;
  if (opts.img) {
    imgBtn = elHtml('button', 'acsv-cinput-img', '<i class="acsv-ic">' + GLYPHS.edImage + '</i>');
    imgBtn.type = 'button';
    a11y(imgBtn, opts.img.title || '插入图片');
    fileInp = el('input');
    fileInp.type = 'file';
    fileInp.accept = 'image/*';
    fileInp.style.display = 'none';
    imgBtn.addEventListener('click', function (ev) { ev.stopPropagation(); fileInp.click(); });
    fileInp.addEventListener('change', function () {
      var f = fileInp.files && fileInp.files[0];
      fileInp.value = '';
      if (f) opts.img.onFile(f);
    });
    top.appendChild(imgBtn);
    top.appendChild(fileInp);
  }

  var countEl = el('span', 'acsv-cinput-count');
  top.appendChild(countEl);
  box.appendChild(top);

  // ---- 下行：编辑区 + 发送 ----
  var main = el('div', 'acsv-cinput-main');
  var wrap = el('div', 'acsv-cinput-wrap');
  var edit = el('div', 'acsv-cinput-edit');
  edit.contentEditable = 'true';
  if (opts.placeholder) edit.setAttribute('data-ph', opts.placeholder);
  wrap.appendChild(edit);
  main.appendChild(wrap);
  var send = el('button', 'acsv-cinput-send', opts.sendText || '发送');
  send.type = 'button';
  main.appendChild(send);
  box.appendChild(main);

  // ---- 行为 ----
  var busy = false, composing = false;

  function state() {
    var n = countUnits(edit);
    return { count: n, over: !!(opts.maxLength && n > opts.maxLength) };
  }
  function sendOk(st) {
    if (busy || st.over) return false;
    if (opts.sendEnabled) return !!opts.sendEnabled(st);
    return st.count > 0;
  }
  function refresh() {
    if (!composing) { normalizeEmpty(); normalizeColors(edit); }
    var st = state();
    // 字数文案：超限或 countMax 时出 n/max（宿主能看见"离上限多远"），否则出裸数、0 出空
    var txt = String(st.count);
    if (opts.maxLength && (st.over || opts.countMax)) txt = st.count + '/' + opts.maxLength;
    else if (!st.count) txt = '';
    if (countEl.textContent !== txt) countEl.textContent = txt;
    countEl.classList.toggle('over', st.over);
    wrap.classList.toggle('over', st.over);
    var ok = sendOk(st);
    send.classList.toggle('disabled', !ok);
    send.disabled = !ok;
    if (opts.onState) opts.onState(st);
    return st;
  }
  // 空壳归一：contenteditable 空了以后浏览器可能留一个**占位 <br>**（元素不再 :empty ⇒ 占位
  // 文案不出——0.9.238 harness 实测就撞上了）。只清"纯占位壳"（子节点全是 br，或单个
  // div/p 包一个 br）；**空包装（<b></b>）不清**——那是"下次输入仍加粗"的格式意图
  function normalizeEmpty() {
    var cn = edit.childNodes;
    if (!cn.length) return;
    var phantom = true;
    for (var i = 0; i < cn.length && phantom; i++) {
      var c = cn[i];
      if (c.nodeType !== 1) { phantom = false; break; }
      var t = c.tagName.toLowerCase();
      if (t === 'br') continue;
      if ((t === 'div' || t === 'p') && c.childNodes.length === 1 && c.firstChild.nodeName === 'BR') continue;
      phantom = false;
    }
    if (phantom) edit.innerHTML = '';
  }
  // 格式键点亮态：跟随光标处的当前格式（queryCommandState）。不在编辑区里就全灭——
  // 免得离开时留着上一次的点亮态骗人
  function syncFmt() {
    var focused = document.activeElement === edit;
    fmtBtns.forEach(function (b) {
      var on = false;
      if (focused) { try { on = document.queryCommandState(b._cmd); } catch (e) { /* best-effort: cleanup */ } }
      b.classList.toggle('on', !!on);
    });
  }
  function hideCol() { toggleCol(false); } // 收面板的唯一出口（旧实现直接写 inline display ⇒ 类名残留）

  edit.addEventListener('input', function () { syncFmt(); refresh(); });
  edit.addEventListener('keyup', syncFmt);
  edit.addEventListener('mouseup', syncFmt);
  edit.addEventListener('blur', syncFmt);
  edit.addEventListener('compositionstart', function () { composing = true; });
  edit.addEventListener('compositionend', function () { composing = false; refresh(); });
  edit.addEventListener('keydown', function (ev) {
    ev.stopPropagation(); // 栏内按键不出栏（宿主键盘手势/浮层栈都靠这条）
    if (ev.isComposing || ev.keyCode === 229) return; // 组合期只挡冒泡（0.9.234 纪律：组合 Enter 不许当发送）
    // 纯文本宿主：浏览器自带的加粗/斜体/下划线快捷键要拦掉（工具栏没这键也不该让 Ctrl+B 生效——
    // 编辑期看着是粗的、发出去对方看到的是 [b] 字面）
    if (plain && (ev.ctrlKey || ev.metaKey) && !ev.altKey && /^[biu]$/i.test(ev.key || '')) { ev.preventDefault(); return; }
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); opts.onSend(); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); hideCol(); edit.blur(); }
  });
  // 粘贴：**最保守的纯文本化**（预览稿 ⑤ 口径）。官方 filterRules 全集未实测（§11.8），
  // 不照抄——宁可丢掉源格式，也不把一整棵网页 DOM（含站点样式/脚本残留）塞进编辑区
  edit.addEventListener('paste', function (ev) {
    ev.preventDefault();
    var d = ev.clipboardData || window.clipboardData;
    var t = (d && d.getData('text/plain')) || '';
    if (!t) return;
    insertHtmlAtCaret(edit, t.split(/\r\n|\r|\n/).map(esc).join('<br>'));
    syncFmt();
    refresh();
  });

  box.addEventListener('click', function (ev) { ev.stopPropagation(); });
  send.addEventListener('click', function (ev) { ev.stopPropagation(); opts.onSend(); });

  // ---- 对外句柄 ----
  var bar = {
    box: box, edit: edit, send: send, emotBtn: emotBtn, imgBtn: imgBtn, fileInp: fileInp, colPop: colPop,
    plain: plain, // 纯文本宿主（无格式键/颜色键）——harness 断言用
    focus: function () { try { edit.focus(); } catch (e) { /* best-effort: cleanup */ } },
    // 出口文本（提交给服务端的 UBB）与字数：宿主拿它组参/预检
    text: function () { return serializeUbb(edit); },
    count: function () { return countUnits(edit); },
    state: state,
    refresh: refresh,
    // 程序化改值的唯一出口（清空/切会话回填/失败恢复）
    setText: function (v) { setUbbText(edit, v); refresh(); },
    setPlaceholder: function (s) { edit.setAttribute('data-ph', s == null ? '' : s); },
    // 提交锁：锁编辑区 + 发送键（label 随宿主语义，如「发送中…」）
    setBusy: function (on, label) {
      busy = !!on;
      edit.contentEditable = busy ? 'false' : 'true';
      send.textContent = busy ? (label || '发送中…') : (opts.sendText || '发送');
      refresh();
    },
    // 插入 UBB 短代码（表情面板 / 图片上传后）——程序化插入的统一入口
    insertCode: function (code) {
      var nodes = nodesOfCode(String(code || ''));
      if (!nodes) return false;
      var html = nodes.map(function (n) { return n.outerHTML; }).join('');
      if (!insertHtmlAtCaret(edit, html)) nodes.forEach(function (n) { insertNodeFallback(edit, n); });
      syncFmt();
      refresh();
      return true;
    },
    imgBusy: function (label) { if (imgBtn) imgBtn.textContent = label; },
    imgIdle: function () {
      if (imgBtn) imgBtn.innerHTML = '<i class="acsv-ic">' + GLYPHS.edImage + '</i>';
    }
  };
  // 表情图晚到（setText 回填的是令牌代码、EmotionMap 未就绪）：占位 → 真图。与行流同款回填
  // （emoticon.refillEmoticons 只认带 data 的占位，字面量 [表情] 不动）
  ensureEmotionMap().then(function () { refillEmoticons(edit); }, function () { });
  refresh();
  return bar;
}

// 引用/回复 chip（0.9.47 收敛：私信引用与评论回复共用，置于输入条上方独立一行，原
// 评论的栏内红药丸 .acsv-creply 废弃）。label 文案与显隐由调用方按态驱动；× 只管取消
export function buildQuoteChip(onCancel, xTitle) {
  var box = el('div', 'acsv-quotechip');
  box.style.display = 'none';
  var label = el('span', 'acsv-quotechip-label');
  var x = el('button', 'acsv-quotechip-x', '✕');
  x.title = xTitle || '取消';
  x.addEventListener('click', function (ev) { ev.stopPropagation(); onCancel(); });
  box.appendChild(label);
  box.appendChild(x);
  return { box: box, label: label };
}

// debug 测试钩子（harness 直采：⑧ 出口序列化对照表逐条钉在真 DOM 上；正式构建死码消除）。
// 采一个容器元素：返回 { text, count } —— 与编辑区同一套实现（同一函数，非平行副本）
testHook('composerUbb', function (el0) {
  if (!el0 || el0.nodeType !== 1) return null;
  return { text: serializeUbb(el0), count: countUnits(el0) };
});
