// ---------- 脚本页设置面板（0.9.89，路线图 1.2）：settings 共享层的第二张脸 ----------
// 结构（D4 双 UI 体系）：本模块只是**脚本页皮肤**——只依赖 settings.js（皮肤→共享层单向），
// 控件表驱动出自 settings.SCHEMA（原生页皮肤 Phase 6 是兄弟模块，同一份 schema）。
// 浮层语义照 imgview/release 骨架：单例、open 先 close、host 挂 root、背景点击关、✕ 关；
// Esc 与模态键语义交给 overlay 栈（modal:true），零改 input.js。
// Shadow DOM（intake 清单「el() 构建 + Shadow DOM」）：面板内容整体开影子根 + 作用域内 <style>
// ——与原生页皮肤同款理由（CSS 物理隔离，宿主规则的隔离对象在这里是本站自己的大表）；
// host 自身的定位留在 styles.js（光 DOM 侧），内里视觉全在影子内。主题变量穿影子边界继承，
// 直接用 var(--acsv-accent)。
//
// ---------- 样式量取（0.9.69 纪律：量取 computed style，注明日期，不手调像素） ----------
// 量取对象①：A 站官方播放器「弹幕设置」面板（www.acfun.cn/v/ac24325439，2026-10-03，内置浏览器登录态）
//   面板 400×360，bg rgba(21,21,21,.8)，radius 2px，无边框/阴影/模糊，基底字 14px/22.4px(1.6) 白字
//   分页头 41px，下边框 .667px rgba(255,255,255,.2)，页签 14px/40px，选中 rgb(253,76,92)
//   内容内边距 20px；行高 18px、行距 20px、标签 14px/18px（列宽 56 + 20px 栏距）
//   开关 34×18 药丸，radius 22px，关 rgb(158,158,158) / 开 rgb(253,76,92)
//   按钮 126×26，边框 .667px 白，radius 3px，字 14px/26px
// 量取对象②：官方清晰度下拉（同机同页）
//   菜单容器 bg rgba(21,21,21,.8)，radius 4px，无阴影无内边距；选项行 36px 高、字 14px/36px、选中同 accent
// 本方家族（.acsv-upd 弹窗，styles.js 0.9.60 段）：背板 rgba(0,0,0,.62)、面板 rgba(22,22,27,.97)
//   + blur(12px)、1px rgba(255,255,255,.1) 边、radius 14px、阴影 0 10px 34px rgba(0,0,0,.5)、
//   ✕ 28 圆钮、页脚按钮 radius 8px
// **差异裁决（有意，不是漏抄）**：几何与节奏（尺寸/行距/控件块/菜单行高）取官方量取值；
// 表面与圆角取本方家族——脚本页面板必须与自家模态同族，而官方面板是无模糊的扁平 2px 圆角
// （量取原文如上）。未量取项：开关内部旋钮的几何（只量到药丸本体），按药丸内切推导，注释在册。
import { el } from './ui.js';
import { root } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { panelItems, getSetting, setSetting, flushSettings, onChange } from './settings.js';

var SET_CSS = ''
  + '.set{position:absolute;inset:0;z-index:62;background:rgba(0,0,0,.62);display:flex;'
  + 'align-items:center;justify-content:center;animation:set-in .18s ease}'
  + '@keyframes set-in{from{opacity:0}to{opacity:1}}'
  + '.set-panel{width:min(400px,92vw);max-height:min(76vh,640px);display:flex;flex-direction:column;'
  + 'background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);'
  + 'border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden;color:#fff;'
  + 'font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}'
  + '.set-head{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;'
  + 'border-bottom:1px solid rgba(255,255,255,.09)}'
  + '.set-title{font-size:15px;font-weight:600}'
  + '.set-x{margin-left:auto;flex:none;border:none;background:rgba(255,255,255,.1);color:#fff;'
  + 'width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}'
  + '.set-x:hover{background:rgba(255,255,255,.22)}'
  + '.set-body{flex:1 1 auto;min-height:64px;overflow-y:auto;padding:20px;scrollbar-width:thin;'
  + 'scrollbar-color:rgba(255,255,255,.2) transparent}'
  + '.set-group{font-size:12px;color:#8b909a;margin:0 0 6px}'
  + '.set-group + .set-row:last-child{margin-bottom:0}'
  + '.set-row{display:flex;align-items:center;gap:20px;min-height:18px;margin:0 0 20px}'
  + '.set-row-main{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}'
  + '.set-label{font-size:14px;line-height:18px}'
  + '.set-hint{font-size:12px;line-height:16px;color:#8b909a}'
  // 开关：34×18 药丸（官方量取值）；旋钮按药丸内切推导（2px 内衬）
  + '.set-sw{flex:none;width:34px;height:18px;border:none;border-radius:22px;padding:0;cursor:pointer;'
  + 'background:rgb(158,158,158);position:relative;transition:background .15s}'
  + '.set-sw.on{background:var(--acsv-accent)}'
  + '.set-sw i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;'
  + 'transition:transform .15s}'
  + '.set-sw.on i{transform:translateX(16px)}'
  // 下拉：菜单表面与选项行取官方量取值（rgba(21,21,21,.8) / radius 4px / 行高 36px）
  + '.set-sel{flex:none;position:relative}'
  + '.set-sel-btn{min-width:88px;border:none;border-radius:8px;padding:7px 12px;cursor:pointer;'
  + 'background:rgba(255,255,255,.12);color:#fff;font:13px/1.4 inherit;text-align:center}'
  + '.set-sel-btn:hover{background:rgba(255,255,255,.2)}'
  + '.set-sel-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:120px;'
  + 'background:rgba(21,21,21,.92);border-radius:4px;padding:0;display:flex;flex-direction:column;'
  + 'box-shadow:0 8px 28px rgba(0,0,0,.45)}'
  + '.set-sel-item{border:none;background:none;color:#fff;font:14px/36px inherit;cursor:pointer;'
  + 'padding:0 14px;text-align:left;white-space:nowrap}'
  + '.set-sel-item:hover{background:rgba(255,255,255,.12)}'
  + '.set-sel-item.on{color:var(--acsv-accent)}'
  // 步进器：按钮 26px 高取官方按钮量取值
  + '.set-num{flex:none;display:flex;align-items:center;gap:8px}'
  + '.set-num-btn{width:26px;height:26px;border:1px solid rgba(255,255,255,.2);border-radius:3px;'
  + 'background:none;color:#fff;font:14px/1 inherit;cursor:pointer}'
  + '.set-num-btn:hover:not(:disabled){background:rgba(255,255,255,.12)}'
  + '.set-num-btn:disabled{opacity:.35;cursor:default}'
  + '.set-num-val{min-width:56px;text-align:center;font-size:14px}'
  + '.set-foot{flex:none;display:flex;gap:8px;justify-content:flex-end;padding:10px 16px 14px;'
  + 'border-top:1px solid rgba(255,255,255,.09)}'
  + '.set-act{border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-family:inherit;'
  + 'cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:background .15s}'
  + '.set-act:hover{background:rgba(255,255,255,.2)}'
  + '.set-act.primary{background:var(--acsv-accent)}';

var host = null, panel = null;
var offs = []; // open 期间注册的 onChange 订阅：close 全部退订（面板是短命对象，不留监听）

export function closeSettings() {
  if (!panel) return;
  var p = panel;
  panel = null;
  var h = host;
  host = null;
  p.remove();
  if (h) h.remove();
  for (var i = 0; i < offs.length; i++) { try { offs[i](); } catch (e) { } }
  offs = [];
  flushSettings(); // 关面板即落盘：不等防抖窗（用户改完就关是最常见路径）
  overlayClose('settings'); // 已出栈（Esc 路径）时空转；显式关闭路径由此同步栈
}

// 控件工厂：返回 { node, sync }。sync 幂等（自家 setSetting 触发的 onChange 也会回调到它）
function boolControl(item) {
  var b = el('button', 'set-sw');
  b.title = item.label || item.key;
  b.appendChild(el('i'));
  var sync = function () { b.classList.toggle('on', getSetting(item.key) === true); };
  b.addEventListener('click', function () { setSetting(item.key, getSetting(item.key) !== true); });
  sync();
  return { node: b, sync: sync };
}

function selectControl(item) {
  var wrap = el('span', 'set-sel');
  var btn = el('button', 'set-sel-btn');
  var menu = null;
  var labelOf = function (v) {
    for (var i = 0; i < item.options.length; i++) {
      if (item.options[i].v === v) return item.options[i].t || item.options[i].v;
    }
    return v;
  };
  var closeMenu = function () { if (menu) { menu.remove(); menu = null; } };
  var sync = function () { closeMenu(); btn.textContent = labelOf(getSetting(item.key)); };
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (menu) { closeMenu(); return; }
    menu = el('div', 'set-sel-menu');
    item.options.forEach(function (o) {
      var it = el('button', 'set-sel-item' + (o.v === getSetting(item.key) ? ' on' : ''), o.t || o.v);
      it.addEventListener('click', function (ev2) {
        ev2.stopPropagation();
        setSetting(item.key, o.v);
      });
      menu.appendChild(it);
    });
    wrap.appendChild(menu);
  });
  // 点面板别处收菜单（同控制栏 qmenu 的既有手感）
  wrap.addEventListener('click', function (ev) { ev.stopPropagation(); });
  wrap.appendChild(btn); // 首跑漏了这行：只有菜单没有按钮，面板上是一片空白（harness set-*-adopted 抓出）
  sync();
  return { node: wrap, sync: sync };
}

function numControl(item) {
  var wrap = el('span', 'set-num');
  var minus = el('button', 'set-num-btn', '−');
  var val = el('span', 'set-num-val');
  var plus = el('button', 'set-num-btn', '+');
  var sync = function () {
    var v = getSetting(item.key);
    val.textContent = v + ' 秒';
    minus.disabled = !(v > item.min);
    plus.disabled = !(v < item.max);
  };
  minus.addEventListener('click', function () { setSetting(item.key, getSetting(item.key) - item.step); });
  plus.addEventListener('click', function () { setSetting(item.key, getSetting(item.key) + item.step); });
  sync();
  wrap.appendChild(minus);
  wrap.appendChild(val);
  wrap.appendChild(plus);
  return { node: wrap, sync: sync };
}

var FACTORY = { bool: boolControl, select: selectControl, number: numControl };

// 表驱动出控件（settings.test.js 钉着「panel:true 的类型必须在实现集内」——漏控件会红）
function buildBody(body) {
  var group = null;
  panelItems().forEach(function (item) {
    var f = FACTORY[item.type];
    if (!f) return;
    if (item.group !== group) {
      group = item.group;
      body.appendChild(el('div', 'set-group', group));
    }
    var row = el('div', 'set-row');
    var main = el('div', 'set-row-main');
    main.appendChild(el('div', 'set-label', item.label));
    if (item.hint) main.appendChild(el('div', 'set-hint', item.hint));
    row.appendChild(main);
    var c = f(item);
    row.appendChild(c.node);
    body.appendChild(row);
    // 外部入口改了同一个键（如控制栏「弹」按钮）时面板态跟着走
    offs.push(onChange(item.key, c.sync));
  });
}

export function openSettings() {
  closeSettings();
  if (!root || panel) return;
  host = el('div', 'acsv-set-host');
  var shadow = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = SET_CSS;
  shadow.appendChild(style);
  panel = el('div', 'set');
  var pnl = el('div', 'set-panel');
  var head = el('div', 'set-head');
  head.appendChild(el('div', 'set-title', '设置'));
  var x = el('button', 'set-x', '✕');
  x.title = '关闭';
  x.addEventListener('click', closeSettings);
  head.appendChild(x);
  pnl.appendChild(head);
  var body = el('div', 'set-body');
  buildBody(body);
  pnl.appendChild(body);
  var foot = el('div', 'set-foot');
  var done = el('button', 'set-act primary', '完成');
  done.addEventListener('click', closeSettings);
  foot.appendChild(done);
  pnl.appendChild(foot);
  panel.appendChild(pnl);
  panel.addEventListener('click', function (ev) { if (ev.target === panel) closeSettings(); });
  shadow.appendChild(panel);
  root.appendChild(host);
  overlayOpen({ id: 'settings', modal: true, close: closeSettings });
}
