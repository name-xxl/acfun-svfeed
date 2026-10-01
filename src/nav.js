import { CFG } from './cfg.js';
import { el } from './ui.js';

// ---------- 导航入口注入 ----------
var NAV_LABELS = CFG.nav.labels;

function tryInjectNav() {
  if (document.querySelector('[data-acsv-nav]')) return true;
  var links = document.querySelectorAll(
    '#pagelet_navigation a, #pagelet_header a, header a, .normal-nav a, .guide-list a, nav a');
  var target = null, label = '';
  for (var i = 0; i < links.length; i++) {
    var t = (links[i].textContent || '').trim();
    if (NAV_LABELS.indexOf(t) !== -1) { target = links[i]; label = t; break; }
  }
  if (!target) return false;
  var li = target.closest('li') || target.parentElement;
  if (!li || !li.parentNode) return false;
  var clone = li.cloneNode(true);
  // 替换克隆体里的文字与链接
  var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
  var node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim() === label) {
      node.nodeValue = '小视频';
      break;
    }
  }
  var anchors = clone.querySelectorAll('a');
  var a = anchors.length ? anchors[anchors.length - 1] : clone.querySelector('a');
  if (!a) a = clone;
  a.href = '#' + CFG.hash;
  a.removeAttribute('target');
  if (a.classList) a.classList.remove('active');
  a.title = 'AcFun 小视频 · 竖刷模式（油猴脚本）';
  clone.setAttribute('data-acsv-nav', '1');
  clone.querySelectorAll('*').forEach(function (n) { n.removeAttribute('id'); });
  li.parentNode.insertBefore(clone, li.nextSibling);
  return true;
}

var navObserver = null;
export function watchNav() {
  // 页面白名单闸门：白名单外不注入、不观察、不弹兜底胶囊（0.9.47 起仅首页）
  var ok = false;
  for (var i = 0; i < CFG.nav.pages.length; i++) {
    if (CFG.nav.pages[i].test(location.pathname)) { ok = true; break; }
  }
  if (!ok) return;
  if (tryInjectNav()) return;
  navObserver = new MutationObserver(function () {
    if (tryInjectNav()) {
      navObserver.disconnect();
      navObserver = null;
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
  // 兜底：导航一直没渲染出来（或结构变了），给个悬浮入口
  setTimeout(function () {
    if (navObserver) { navObserver.disconnect(); navObserver = null; }
    if (document.getElementById('acsv-fab') || document.querySelector('[data-acsv-nav]')) return;
    var fab = el('button', 'acsv-fab', '▶ AcFun 小视频');
    fab.id = 'acsv-fab';
    fab.addEventListener('click', function () { location.hash = CFG.hash; });
    document.body.appendChild(fab);
  }, CFG.time.navWait);
}
