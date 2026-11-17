import { CFG } from './cfg.js';
import { el } from './ui.js';
import { watchHost } from './watchhost.js'; // 0.9.342 批B：等宿主环收口原语

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

export function watchNav() {
  // 页面白名单闸门：白名单外不注入、不起 MutationObserver、不挂 6 秒兜底定时器，整条链路直接短路。
  // 注意这是**显示闸门**（导航入口往哪张页面注入），不是运行门槛——boot 的运行分流
  // 由 pagekind.pageKind 总表决定（0.9.88），扩 @match 不改本表语义，防误删防误扩
  var ok = false;
  for (var i = 0; i < CFG.nav.pages.length; i++) {
    if (CFG.nav.pages[i].test(location.pathname)) { ok = true; break; }
  }
  if (!ok) return;
  // 0.9.342 批B（watchHost 收编）：等宿主（observe）+ 未 settles 到 navWait 摘观察器、
  // 出兜底胶囊——原三件各持句柄（navObserver 闭包 + 匿名 setTimeout 无句柄，优化批④在案），
  // 现统一由原语 stopAll 回收；胶囊内存在性双判保留（原件防御，语义零变化）
  watchHost({
    apply: tryInjectNav,
    observe: true,
    deadlineMs: CFG.time.navWait,
    onDeadline: function () {
      if (document.getElementById('acsv-fab') || document.querySelector('[data-acsv-nav]')) return;
      var fab = el('button', 'acsv-fab', '▶ AcFun 小视频');
      fab.id = 'acsv-fab';
      fab.addEventListener('click', function () { location.hash = CFG.hash; });
      document.body.appendChild(fab);
    }
  });
}
