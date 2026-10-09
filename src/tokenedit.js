import { esc } from './ui.js';

// ---------- 令牌原子编辑（0.9.221） ----------
// 背景：输入框是 textarea，表情/图片以 **UBB 令牌文本**存在（`[emot=acfun,123/]` 17 字符、
// `[img=图片]<长签名URL>[/img]` 400+ 字符）。纯 textarea 下：退格只删一个字符 ⇒ **令牌被劈成垃圾**
//（`[emot=acfun,123/` 这种残留），拖选是字符级 ⇒ 选中「半个表情」，方向键穿过令牌内部。
//
// 本件把令牌做成**原子**：删除整块 / 选区吸附 / 方向键整块跳过。三条实现纪律：
//   ① **走浏览器原生编辑路径**（先把范围选成整块，再让浏览器删）——撤回栈不破；`execCommand('delete')`
//      不可用时兜底 `setRangeText`（那一步会丢撤回，属降级路径）。
//   ② **组合期一律不拦**（isComposing / keyCode 229 / compositionstart-end 标记）——否则会吃掉中文
//      输入法的候选词。
//   ③ 令牌区间**每拍重算**（不做增量维护）：输入框内容规模很小，重算比维护增量状态更不容易错。
//
// 与「镜像层」的分工：镜像层（inputbar 叠一个同度量渲染层）负责**看得见**；本件负责**编得动**。
// 两者都由 inputbar 装配 ⇒ 评论 / 私信 / 动态编辑器三处共用同一份。

// 令牌形态（与写入侧一致）：表情＝emoticon.insertAtCursor 插的短码；图片＝评论图片上传后插的短码。
// 新增令牌形态（如 @提及）只在这里加一条正则。
var PATTERNS = [
  /\[emot=[^\/\]]+\/\]/g,
  /\[img=[^\]]*\][\s\S]*?\[\/img\]/g
];

// 令牌区间扫描（**纯函数**，单测直采）：返回按起点升序、互不重叠的 [start, end)
export function tokenRanges(text) {
  var v = String(text == null ? '' : text);
  var hits = [];
  PATTERNS.forEach(function (re) {
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(v))) hits.push([m.index, m.index + m[0].length]);
  });
  hits.sort(function (a, b) { return a[0] - b[0]; });
  var out = [];
  hits.forEach(function (h) {
    if (out.length && h[0] < out[out.length - 1][1]) return; // 与前一个重叠：丢弃（前面的已覆盖）
    out.push(h);
  });
  return out;
}

// 镜像层 HTML（**纯函数**，单测直采）：令牌交给 renderToken 出 HTML，其余文本 esc 后原样。
// renderToken(raw) 由调用方给（表情取图/占位策略在 emoticon 域，不塞进本件）
export function mirrorHtml(text, renderToken) {
  var v = String(text == null ? '' : text);
  var out = '', i = 0;
  tokenRanges(v).forEach(function (r) {
    out += esc(v.slice(i, r[0]));
    out += renderToken(v.slice(r[0], r[1]));
    i = r[1];
  });
  return out + esc(v.slice(i));
}

// 绑定原子编辑。opts.onEdit：一次原子编辑落地后回调（调用方据此重画镜像层）
// 返回 { snapSel, stop }
export function attachTokenEdit(ta, opts) {
  opts = opts || {};
  var composing = false;

  function after() { if (opts.onEdit) opts.onEdit(); }

  function rangeAt(pos) { // 光标落在哪个令牌内部（含紧贴右端）
    var r = tokenRanges(ta.value);
    for (var i = 0; i < r.length; i++) {
      if (pos > r[i][0] && pos <= r[i][1]) return r[i];
    }
    return null;
  }

  // 选区吸附：光标（collapsed）吸到令牌**右端**（不许停在令牌内部）；选区起点吸到**左端**
  //（这样从令牌中间往右拖，整块都会被选进来）
  function snapSel() {
    if (composing) return;
    var a = ta.selectionStart, b = ta.selectionEnd, na = a, nb = b, r;
    r = rangeAt(a);
    if (r) na = (a === b) ? r[1] : r[0];
    r = rangeAt(b);
    if (r) nb = r[1];
    if (na !== a || nb !== b) {
      try { ta.setSelectionRange(na, nb); } catch (e) { /* 焦点不在时可能抛：忽略 */ }
    }
  }

  function delRange(r) {
    ta.setSelectionRange(r[0], r[1]);
    var ok = false;
    try { ok = document.execCommand('delete'); } catch (e) { ok = false; }
    if (!ok) ta.setRangeText('', r[0], r[1], 'end'); // 降级：直接改值（这一步不进撤回栈）
    after();
  }

  function onKeydown(ev) {
    if (composing || ev.isComposing || ev.keyCode === 229) return; // 纪律②
    var a = ta.selectionStart, b = ta.selectionEnd;
    if (ev.key === 'Backspace' && a === b) {
      var r = rangeAt(a);
      if (r) { ev.preventDefault(); delRange(r); return; }
    } else if (ev.key === 'Delete' && a === b) {
      var r2 = rangeAt(a + 1);
      if (r2 && a >= r2[0] && a < r2[1]) { ev.preventDefault(); delRange(r2); return; }
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      var rr = rangeAt(ev.key === 'ArrowLeft' ? a : a + 1);
      if (rr) {
        ev.preventDefault();
        var to = ev.key === 'ArrowLeft' ? rr[0] : rr[1];
        ta.setSelectionRange(to, to);
      }
    }
  }

  function onSelChange() { if (document.activeElement === ta) snapSel(); }
  function onCompStart() { composing = true; }
  function onCompEnd() { composing = false; }

  ta.addEventListener('keydown', onKeydown);
  ta.addEventListener('compositionstart', onCompStart);
  ta.addEventListener('compositionend', onCompEnd);
  document.addEventListener('selectionchange', onSelChange);

  return {
    snapSel: snapSel,
    stop: function () {
      ta.removeEventListener('keydown', onKeydown);
      ta.removeEventListener('compositionstart', onCompStart);
      ta.removeEventListener('compositionend', onCompEnd);
      document.removeEventListener('selectionchange', onSelChange);
    }
  };
}
