import { CFG } from './cfg.js';
import { el } from './ui.js';
import { parseRoute } from './route.js';
import { dockEntries } from './viewreg.js';

// ---------- 左栏导航（0.9.63 抖音式重设计）：全高贴左、图标+文字横排、当前项 pill ----------
// player.mount 建、unmount 拆；<CFG.view.narrow 视口宽与全屏下 CSS 隐藏（styles.js）。
// 条目点击 = hash 赋值（推荐→#svfeed 回竖刷，其余→#svfeed/<id>），高亮由 syncDock 按
// parseRoute 更新（views.syncRouteView 在 hashchange 链上调用）。
// 0.9.78 起条目**从视图注册表派生**：视图在 registerView 里声明 dock 元数据（label/svg/
// order/group），本文件只保留「推荐」（裸竖刷路由，不是视图）——此前 ENTRIES 是第二份人工
// 清单，加一个视图要改两处（漂移源）；order 升序、group 变化处插分隔线
var dockEl = null;
var FEED_ENTRY = {
  id: 'feed', label: '推荐', group: 0,
  svg: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 10.9-6.1 3.5c-.5.3-1.1-.1-1.1-.7V8.3c0-.6.6-1 1.1-.7l6.1 3.5c.5.3.5 1 0 1.3z"/></svg>'
};

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
  var prevGroup = null;
  [FEED_ENTRY].concat(dockEntries()).forEach(function (e) {
    if (prevGroup !== null && e.group !== prevGroup) dockEl.appendChild(el('div', 'acsv-dock-sep'));
    prevGroup = e.group;
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
