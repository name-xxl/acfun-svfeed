import { CFG } from './cfg.js';
import { el } from './ui.js';
import { parseRoute } from './route.js';

// ---------- 左栏导航（0.9.63 抖音式重设计）：全高贴左、图标+文字横排、当前项 pill ----------
// player.mount 建、unmount 拆；<CFG.view.narrow 视口宽与全屏下 CSS 隐藏（styles.js）。
// 条目点击 = hash 赋值（推荐→#svfeed 回竖刷，其余→#svfeed/<id>），高亮由 syncDock 按
// parseRoute 更新（views.syncRouteView 在 hashchange 链上调用）。二期入口（关注/搜索）
// 随对应视图一起上，不做空挂按钮。
var dockEl = null;
var ENTRIES = [
  {
    id: 'feed', label: '推荐',
    svg: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 10.9-6.1 3.5c-.5.3-1.1-.1-1.1-.7V8.3c0-.6.6-1 1.1-.7l6.1 3.5c.5.3.5 1 0 1.3z"/></svg>'
  },
  {
    id: 'zone', label: '榜单',
    svg: '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"/></svg>'
  },
  {
    sep: true
  },
  {
    id: 'my', label: '我的',
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  }
];

export function buildDock(parent) {
  if (dockEl) return;
  dockEl = el('div', 'acsv-dock');
  // 顶栏 logo 迁此常驻（0.9.64）：AcFun 图标 + 分隔，其后才是导航条目
  var logo = el('div', 'acsv-dock-logo');
  var img = el('img');
  img.src = CFG.api.logoSvg;
  img.alt = 'AcFun';
  logo.appendChild(img);
  dockEl.appendChild(logo);
  dockEl.appendChild(el('div', 'acsv-dock-sep'));
  ENTRIES.forEach(function (e) {
    if (e.sep) {
      dockEl.appendChild(el('div', 'acsv-dock-sep'));
      return;
    }
    var b = el('button', 'acsv-dock-item');
    b.dataset.view = e.id;
    b.title = e.label;
    b.innerHTML = e.svg + '<span>' + e.label + '</span>';
    b.addEventListener('click', function () {
      location.hash = e.id === 'feed' ? CFG.hash : CFG.hash + '/' + e.id;
    });
    dockEl.appendChild(b);
  });
  parent.appendChild(dockEl);
  syncDock(null);
}

// view=null（竖刷）高亮「推荐」，其余按视图段；视图内嵌套参数不参与（一期单层）
export function syncDock(view) {
  if (!dockEl) return;
  var cur = view != null ? view : (parseRoute().view || 'feed');
  Array.prototype.forEach.call(dockEl.querySelectorAll('.acsv-dock-item'), function (b) {
    b.classList.toggle('on', b.dataset.view === cur);
  });
}

export function teardownDock() {
  if (dockEl) { dockEl.remove(); dockEl = null; }
}
