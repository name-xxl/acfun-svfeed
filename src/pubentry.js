import { el } from './ui.js';
import { openMomentEditor } from './momenteditor.js';

// ---------- 原生 /member/feeds「发动态」入口（0.9.222） ----------
// 形态沿用同页的 memberplaza 导航项注入（同一处导航、同族类名，贴合原生观感）：
// 找 `/member/feeds` 那个链，在它（或 memberplaza 注入的「动态广场」项）后面插一个自建项。
// 哨兵 `[data-acsv-pub]` + MutationObserver 自愈（站点是 Vue Router SPA，重渲染会冲掉注入项）。
//
// 与 memberplaza 的分工：那件管「动态广场」内嵌宿主与入口；本件只管发布入口。两者同页共存，
// 各自持哨兵、各自自愈（互不干扰）。**注意**：该页发布元素官方无留档（docs 里只有数据端点研究），
// 所以落点选「导航项」这一处最稳的既有先例，不做猜测性 DOM 选择。

var item = null;
var observer = null;
var timer = null;

function shell() {
  // 导航项找不到时退回「屏幕右下浮标」——与 nav.js 的 `#acsv-fab` 同族兜底（宁可见，也不静默消失）
  var fab = el('button', 'acsv-fab', '✎ 发动态');
  fab.id = 'acsv-pub-fab';
  fab.setAttribute('data-acsv-pub', '1');
  fab.addEventListener('click', function () { openMomentEditor({ onDone: noop }); });
  document.body.appendChild(fab);
  return fab;
}

function noop() { }

function attempt() {
  if (document.querySelector('[data-acsv-pub]')) return true;
  var feedsNav = document.querySelector('a[href="/member/feeds"]');
  if (!feedsNav) return false;
  var group = feedsNav.closest('.member-sub-nav') || feedsNav.parentNode;
  if (!group) return false;
  item = el('a', 'ac-member-navigation-item ac-member-navigation-sub-item acsv-mnav-item', '发动态');
  item.href = '#';
  item.setAttribute('data-acsv-pub', '1');
  item.addEventListener('click', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    openMomentEditor({ onDone: noop });
  });
  // 插在「动态广场」（memberplaza 注入项）之后；没有则紧随 feeds 项
  var plaza = group.querySelector('[data-acsv-mnav]');
  var anchor = plaza || feedsNav.closest('.ac-member-navigation-item') || feedsNav;
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(item, anchor.nextSibling);
  else group.appendChild(item);
  return true;
}

// 自愈（memberplaza.guardHeal 同款节拍）：body 级 childList + 300ms 去抖，单次同步尝试
export function watchPubEntry() {
  if (attempt()) return;
  if (!observer && typeof MutationObserver === 'function') {
    observer = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        if (attempt() && observer) { observer.disconnect(); observer = null; }
      }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  // 兜底浮标：8 秒仍没注入成功（导航结构变了）就给个能点的入口
  setTimeout(function () {
    if (!document.querySelector('[data-acsv-pub]')) shell();
  }, 8000);
}
