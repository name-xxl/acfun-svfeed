import { CFG } from './cfg.js';
import { el } from './ui.js';
import { parseRoute } from './route.js';

// ---------- 左栏 dock（0.9.62）：子视图入口，竖刷路由内常驻 ----------
// player.mount 建、unmount 拆；<CFG.view.narrow 视口宽下 CSS 隐藏（styles.js 媒体查询）。
// 入口点击 = hash 赋值进子视图（#svfeed/<id>），高亮由 syncDock 按 parseRoute 视图段更新
// （views.syncRouteView 在 hashchange 链上调用）。二期入口（关注/搜索）随对应视图一起上，
// 不做空挂按钮。
var dockEl = null;
var ENTRIES = [
  {
    id: 'my', label: '我的',
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  },
  {
    id: 'zone', label: '榜单',
    svg: '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"/></svg>'
  }
];

export function buildDock(parent) {
  if (dockEl) return;
  dockEl = el('div', 'acsv-dock');
  ENTRIES.forEach(function (e) {
    var b = el('button', 'acsv-dock-btn');
    b.dataset.view = e.id;
    b.title = e.label;
    b.innerHTML = e.svg + '<span>' + e.label + '</span>';
    b.addEventListener('click', function () {
      location.hash = CFG.hash + '/' + e.id;
    });
    dockEl.appendChild(b);
  });
  parent.appendChild(dockEl);
  syncDock(null);
}

export function syncDock(view) {
  if (!dockEl) return;
  var cur = view != null ? view : parseRoute().view;
  Array.prototype.forEach.call(dockEl.children, function (b) {
    b.classList.toggle('on', b.dataset.view === cur);
  });
}

export function teardownDock() {
  if (dockEl) { dockEl.remove(); dockEl = null; }
}
