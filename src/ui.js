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

// ms → 时长文案（h:mm:ss / m:ss；0 或非法值给空串）。0.9.179 收口：此前 reldrawer 与
// jingxuanview 各写一份 durText（单源收口违规），统一到这里
export function fmtDurMs(ms) {
  var s = Math.round((Number(ms) || 0) / 1000);
  if (!s) return '';
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return h ? h + ':' + p(m) + ':' + p(r) : m + ':' + p(r);
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

// 当前登录 uid = auth_key 前缀（私信自有会话排除 / 我的页头部同源，0.9.69 归一处）。
// auth_key 形如 <uid>_<hex>；未登录返回 ''
export function selfUid() {
  var m = /^(\d+)/.exec(cookieVal('auth_key'));
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

// 可访问性（0.9.186）：图标/无文字控件补 aria-label——与 title 同源一处设定，防两者漂移
// （本项目按钮普遍已有 title 作悬停提示；aria-label 让屏幕阅读器也能读同一个标签）。
// 只改无障碍属性、不改 DOM 形态与视觉（title 气泡是既有约定，本函数不新增可见提示）。
export function a11y(e, label) {
  e.title = label;
  e.setAttribute('aria-label', label);
  return e;
}

// 转圈（0.9.192 单源收口）：el('div','acsv-spinner') 曾在 7 处裸建（player×4/playlayer/slide/
// comments），语义统一（仅"挂/撤转圈"，无宿主差异）。inline=true → 静态内联变体：评论列表里的
// 居中转圈（.acsv-spinner 默认 position:absolute 靠 slide 的 data-state 显隐，列表内需复位）。
export function spinner(inline) {
  var s = el('div', 'acsv-spinner');
  if (inline) s.style.cssText = 'position:static;margin:40px auto;display:block';
  return s;
}

// ---------- 外点收起（0.9.147 收口） ----------
// 面板展开后点**面板外任意位置**即收起。两条硬规矩（都是实报病灶换来的）：
//   ① **捕获相监听**：页面里大量 stopPropagation（控件条/弹幕输入框/
//     评论操作键/rail 按键……都有），冒泡相会被吞 ⇒ 拿 capture 检。
//   ② **监听常驻到面板拆除**（旧实现是"一次性 + 先摘监听再判内点" ⇒ 点一下面板内部
//     就把监听吃掉，之后再点外面永远收不起来；且面板内点击不该算外点）。
//   面板从 DOM 拆掉后下一次点击自清理（无全局监听残留）；被隐藏而未拆（如表情面板
//   display:none）的面板保留单条监听，下次展开无需重装。
//   panel 面板节点；keep 另外算"内部"的节点（触发按钮等，它有自己的 toggle语义）；
//   onClose 收起动作，缺省 panel.remove()
export function closeOnOutsideClick(panel, keep, onClose) {
  var keeps = [];
  if (Array.isArray(keep)) keeps = keep;
  else if (keep) keeps = [keep];
  function isInside(n) {
    if (!n) return false;
    if (panel.contains(n)) return true;
    for (var i = 0; i < keeps.length; i++) {
      if (keeps[i] && keeps[i].contains(n)) return true;
    }
    return false;
  }
  function onDoc(ev) {
    if (!panel.isConnected) { document.removeEventListener('click', onDoc, true); return; } // 面板已拆：自清理
    if (isInside(ev.target)) return; // 面板内部点击：不算外点（toggle 按钮也在 keep 里）
    if (onClose) onClose();
    else panel.remove();
    // 监听不在此拆：被隐藏而未拆的面板（表情面板）要能反复生效；已拆面板在
    // 下一次点击的自清理分支里注销（最多多占一次点击，无残留）。每面板只装一次（调用方一次性装）
  }
  setTimeout(function () {
    if (!panel.isConnected) return;
    document.addEventListener('click', onDoc, true);
  }, 0);
}
