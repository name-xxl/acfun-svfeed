import { CFG } from './cfg.js';
import { CSS } from './styles.js';
import { root } from './state.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// el() 第三参一律 textContent（0.9.36）：把「不可信文本被当 HTML 传」这类错误结构性
// 排除——0.9.33 的 XSS 三坑根因就是本函数原语义是 innerHTML。确需注入 HTML
// （图标 SVG / linkify / UBB 产物）用 elHtml()。
export function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function elHtml(tag, cls, html) {
  var e = el(tag, cls);
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
export function toast(msg, ms) {
  if (!root) return;
  var t = root.querySelector('.acsv-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || CFG.time.toast);
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

// 全屏开关：root 容器整体进出（控制栏按钮与 F 键共用）
export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (root && root.requestFullscreen) root.requestFullscreen();
}

// 样式表挂在 head 上，保证悬浮按钮在信息流未打开时也有样式
export function ensureStyle() {
  if (document.getElementById('acsv-style')) return;
  var st = el('style', null, CSS);
  st.id = 'acsv-style';
  (document.head || document.documentElement).appendChild(st);
}

// ---------- 通用工具（0.9.35 收敛自各模块的重复样板） ----------

// 单飞 + 值缓存：并发调用共享同一次加载；失败弃缓存下次自动重试；reset() 供强制刷新
export function singleFlight(load) {
  var val, busy = null;
  return {
    get: function () {
      if (val !== undefined) return Promise.resolve(val);
      if (busy) return busy;
      busy = load().then(function (v) { busy = null; val = v; return v; },
        function (e) { busy = null; throw e; });
      return busy;
    },
    reset: function () { val = undefined; }
  };
}

// 读 cookie 值（无 URLDecode——调用方按原始值消费）
export function cookieVal(name) {
  var m = new RegExp('(?:^|;\\s*)' + name + '=([^;]*)').exec(document.cookie);
  return m ? m[1] : '';
}

// video 元素规范拆除：不能用 src=''——空 src 会异步触发一次 SRC_NOT_SUPPORTED error，
// 被移除元素的监听器闭包着活 slide 驱动恢复链（0.9.1 幽灵 video 根因）；
// removeAttribute('src') + load() 是规范拆除，不产生 error 事件
export function teardownVideo(v) {
  v.pause();
  v.removeAttribute('src');
  v.load();
  v.remove();
}

// slide 内防御性清扫一切残留 video（幽灵防护；正常应已被上一会话 dispose 拆除）
export function sweepSlideVideos(slide) {
  Array.prototype.forEach.call(slide.querySelectorAll('video'), teardownVideo);
}
