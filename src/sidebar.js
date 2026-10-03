import { CFG } from './cfg.js';
import { el } from './ui.js';
import { parseRoute } from './route.js';
import { dockEntries } from './viewreg.js';
import { openSettings } from './settingspanel.js'; // 皮肤→皮肤（面板单例）：齿轮点击即开

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

// 设置齿轮（0.9.89）：与 FEED_ENTRY.svg 同体例的内联 24×24 图标（dock 条目 fill:currentColor）
var GEAR_SVG = '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.07.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';

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
  // 设置入口（0.9.89，D3：宿主=脚本页 dock 齿轮）：底部钉住（margin-top:auto，dock 是 flex 列）。
  // 复用 dock-item 样式但**不带 data-view**——syncDock 按 view 高亮，无 view 的条目天然不被选中
  var gear = el('button', 'acsv-dock-item acsv-dock-gear');
  gear.title = '设置';
  gear.innerHTML = GEAR_SVG + '<span>设置</span>';
  gear.addEventListener('click', function () { openSettings(); });
  dockEl.appendChild(gear);
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
