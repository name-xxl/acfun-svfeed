import { CFG } from './cfg.js';
import { CSS } from './styles.js';
import { root } from './state.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function fmt(n) {
  n = Number(n) || 0;
  return n <= CFG.fmt.wanMin ? String(n) : (n / 10000).toFixed(1) + '万';
}

export function fmtTime(s) {
  s = Math.max(0, Math.floor(Number(s) || 0));
  var m = Math.floor(s / 60), sec = s % 60;
  return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
}

var toastTimer = null;
export function toast(msg) {
  if (!root) return;
  var t = root.querySelector('.acsv-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, CFG.time.toast);
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
  }
  return new Promise(function (resolve) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { }
    ta.remove();
    resolve(ok);
  });
}

// 样式表挂在 head 上，保证悬浮按钮在信息流未打开时也有样式
export function ensureStyle() {
  if (document.getElementById('acsv-style')) return;
  var st = el('style', null, CSS);
  st.id = 'acsv-style';
  (document.head || document.documentElement).appendChild(st);
}
