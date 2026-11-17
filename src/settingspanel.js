// ---------- 脚本页设置面板（0.9.89，路线图 1.2）：settings 共享层的第二张脸 ----------
// 结构（D4 双 UI 体系）：本模块只是**脚本页皮肤**——只依赖 settings.js（皮肤→共享层单向），
// 控件表驱动出自 settings.SCHEMA（原生页皮肤 Phase 6 是兄弟模块，同一份 schema）。
// 0.9.341 起同壳两层视图：一级平铺 + 二级「官方页面增强」（mode 换页，不新开 overlay 层——
// 零新 z 档，Esc 经 onPanelEsc 预处理先回一级；清单=settings.injectItems() 派生，确认稿
// docs/preview/native-inject-switch.html）。
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
import { el, closeOnOutsideClick, makeSwitch } from './ui.js';
import { SWITCH_CSS } from './styles.js'; // 开关控件单源（0.9.262）：影子根内注入同一串
import { SHEET_BG, BASE_FONT, SECT_LINE, CLOSE_BTN, SCROLL_TAIL, POP_SHADOW, FOOT_BAR }
  from './cssseg.js'; // 影子根/文档级共用段 token（0.9.309 缝化）：同值段与 cssraw 同源
import { root } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { panelItems, injectItems, findItem, getSetting, setSetting, flushSettings, onChange } from './settings.js';
import { INJECT_MASTER } from './injects.js'; // 总闸键单源（0.9.341）：置灰判定读它，不手写字符串
import { APP_VERSION } from './cfg.js'; // UI 版本号单源（0.9.253）：页脚左置展示

var SET_CSS = ''
  + '.set{position:absolute;inset:0;z-index:62;background:rgba(0,0,0,.62);display:flex;'
  + 'align-items:center;justify-content:center;animation:set-in .18s ease}'
  + '@keyframes set-in{from{opacity:0}to{opacity:1}}'
  + '.set-panel{width:min(400px,92vw);max-height:min(76vh,640px);display:flex;flex-direction:column;'
  + SHEET_BG
  + 'border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden;color:#fff;'
  + BASE_FONT
  + '.set-head{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;'
  + SECT_LINE
  + '.set-title{font-size:15px;font-weight:600}'
  // ✕ 与 ‹ 同规格圆钮（0.9.341 二级换页；‹ 靠左故 margin-left 归零覆回）
  + '.set-x,.set-back{margin-left:auto;flex:none;border:none;background:rgba(255,255,255,.1);color:#fff;'
  + CLOSE_BTN
  + '.set-back{margin-left:0}'
  + '.set-x:hover,.set-back:hover{background:rgba(255,255,255,.22)}'
  + '.set-body{flex:1 1 auto;min-height:64px;overflow-y:auto;padding:20px;scrollbar-width:thin;'
  + SCROLL_TAIL
  + '.set-group{font-size:12px;color:#8b909a;margin:0 0 6px}'
  + '.set-group + .set-row:last-child{margin-bottom:0}'
  + '.set-row{display:flex;align-items:center;gap:20px;min-height:18px;margin:0 0 20px}'
  + '.set-row-main{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}'
  + '.set-label{font-size:14px;line-height:18px}'
  + '.set-hint{font-size:12px;line-height:16px;color:#8b909a}'
  // 开关：几何/状态/两皮 token 全走 SWITCH_CSS 单源（0.9.262；原 .set-sw 双皮已并）
  // 下拉：菜单表面与选项行取官方量取值（rgba(21,21,21,.8) / radius 4px / 行高 36px）
  + '.set-sel{flex:none;position:relative}'
  + '.set-sel-btn{min-width:88px;border:none;border-radius:8px;padding:7px 12px;cursor:pointer;'
  + 'background:rgba(255,255,255,.12);color:#fff;font-size:13px;line-height:1.4;font-family:inherit;text-align:center}'
  + '.set-sel-btn:hover{background:rgba(255,255,255,.2)}'
  + '.set-sel-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:120px;'
  + 'background:rgba(21,21,21,.92);border-radius:4px;padding:0;display:flex;flex-direction:column;'
  + POP_SHADOW
  // 上方空间不足时的翻转位（0.9.237：由打开时实测决定，防被 set-body 滚动容器裁切）
  + '.set-sel-menu.up{top:auto;bottom:calc(100% + 6px)}'
  + '.set-sel-item{border:none;background:none;color:#fff;font-size:14px;line-height:36px;font-family:inherit;'
  + 'cursor:pointer;padding:0 14px;text-align:left;white-space:nowrap}'
  + '.set-sel-item:hover{background:rgba(255,255,255,.12)}'
  + '.set-sel-item.on{color:var(--acsv-accent)}'
  // 步进器：按钮 26px 高取官方按钮量取值
  + '.set-num{flex:none;display:flex;align-items:center;gap:8px}'
  + '.set-num-btn{width:26px;height:26px;border:1px solid rgba(255,255,255,.2);border-radius:3px;'
  + 'background:none;color:#fff;font-size:14px;line-height:1;font-family:inherit;cursor:pointer}'
  + '.set-num-btn:hover:not(:disabled){background:rgba(255,255,255,.12)}'
  + '.set-num-btn:disabled{opacity:.35;cursor:default}'
  + '.set-num-val{min-width:56px;text-align:center;font-size:14px}'
  // ---- 注入管理（0.9.341，确认稿 docs/preview/native-inject-switch.html）----
  // 一级行双控件对（开关+管理钮）；二级说明条；总闸关时整行置灰（opacity 取 :disabled 同值，
  // 不新立档位——稿⑥钉的取值映射；置灰行开关不可点、值不回写）
  + '.set-pair{flex:none;display:flex;align-items:center;gap:12px}'
  + '.set-pair .set-act{padding:7px 14px}'
  + '.set-note{font-size:12px;line-height:16px;color:#8b909a;margin:0 0 16px}'
  + '.set-row.dim{opacity:.35}'
  + '.set-row.dim .acsv-sw{cursor:default;pointer-events:none}'
  + '.set-row.dim .set-label{cursor:default}'
  // 页脚（0.9.253）：版本号左置 + 「完成」右置（space-between）；与 IP 面板页脚同型（APP_VERSION 单源）
  + '.set-foot{flex:none;display:flex;align-items:center;gap:8px;justify-content:space-between;'
  + FOOT_BAR
  + '.set-ver{font-size:12px;color:#8b909a}'
  + '.set-act{border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-family:inherit;'
  + 'cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:background .15s}'
  + '.set-act:hover{background:rgba(255,255,255,.2)}'
  + '.set-act.primary{background:var(--acsv-accent)}';

var host = null, panel = null;
var offs = []; // 当前视图的 onChange 订阅：换页/关面板均先全退再重订（面板是短命对象，不留监听）
var menuCloser = null; // 当前打开的下拉菜单收起函数（0.9.237：overlay 的 Esc 先收菜单、不关整面板）
var headEl = null, bodyEl = null; // 换页重绘的两落点（0.9.341）
var mode = null; // null=一级；'inject'=二级官方页面增强（同壳换页，不新开 overlay 层）

function clearSubs() {
  for (var i = 0; i < offs.length; i++) { try { offs[i](); } catch (e) { /* best-effort: cleanup */ } }
  offs = [];
}

function dismissMenu() {
  if (!menuCloser) return false;
  menuCloser();
  return true;
}

// Esc 预处理单点（0.9.341 扩语义）：二级先回一级（消费、不关面板）；一级维持收下拉菜单在先
function onPanelEsc() {
  if (mode === 'inject') { showMain(); return true; }
  return dismissMenu();
}

export function closeSettings() {
  if (!panel) return;
  dismissMenu(); // 菜单随面板一起收（清 menuCloser）
  var p = panel;
  panel = null;
  var h = host;
  host = null;
  p.remove();
  if (h) h.remove();
  clearSubs();
  headEl = null; bodyEl = null; mode = null; // 视图态随面板清零（下次 open 恒回一级）
  flushSettings(); // 关面板即落盘：不等防抖窗（用户改完就关是最常见路径）
  overlayClose('settings'); // 已出栈（Esc 路径）时空转；显式关闭路径由此同步栈
}

// 控件工厂：返回 { node, sync }。sync 幂等（自家 setSetting 触发的 onChange 也会回调到它）
function boolControl(item) {
  var sw = makeSwitch(getSetting(item.key) === true, function (next) {
    setSetting(item.key, next);
  }, 'dark'); // 齿轮面板恒为暗色主题
  sw.node.title = item.label || item.key;
  var sync = function () { sw.sync(getSetting(item.key) === true); }; // 幂等：onChange 回调也会打到它
  return { node: sw.node, sync: sync };
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
  var closeMenu = function () {
    if (menu) { menu.remove(); menu = null; }
    if (menuCloser === closeMenu) menuCloser = null;
  };
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
    menuCloser = closeMenu;
    // 空间不足上翻（0.9.237）：下方放不下整菜单就翻到按钮上方——不被 set-body 滚动容器裁掉半截
    var br = btn.getBoundingClientRect(), mh = menu.getBoundingClientRect().height;
    if (br.bottom + 6 + mh > window.innerHeight - 8) menu.classList.add('up');
    // 外点收起（0.9.147 规矩：capture + 常驻到拆除）。Shadow DOM 内点其它设置行时 target 被
    // 重定向到宿主、判为"外点"——正好是「点面板别处收菜单」的手感；点菜单内部被 item 的
    // stopPropagation 挡在影子边界内，不会误收
    closeOnOutsideClick(menu, [btn], closeMenu);
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

// manage 标记行（0.9.341）：bool 语义 + 右侧「管理」钮进二级——SCHEMA type 不扩词表，
// 变体走标记位（boolControl 的 sync/退订语义在此原样复用，只加钮与 pair 壳）
function manageControl(item) {
  var wrap = el('span', 'set-pair');
  var sw = makeSwitch(getSetting(item.key) === true, function (next) {
    setSetting(item.key, next);
  }, 'dark');
  sw.node.title = item.label || item.key;
  var btn = el('button', 'set-act', '管理');
  btn.title = '逐项管理官方页面功能';
  btn.addEventListener('click', function (ev) { ev.stopPropagation(); openInject(); });
  wrap.appendChild(sw.node);
  wrap.appendChild(btn);
  var sync = function () { sw.sync(getSetting(item.key) === true); };
  return { node: wrap, sync: sync };
}

// 表驱动出控件（settings.test.js 钉着「panel:true 的类型必须在实现集内」——漏控件会红）
function buildBody(body) {
  var group = null;
  panelItems().forEach(function (item) {
    var f = item.manage ? manageControl : FACTORY[item.type];
    if (!f) return;
    if (item.group !== group) {
      group = item.group;
      body.appendChild(el('div', 'set-group', group));
    }
    var row = el('div', 'set-row');
    var main = el('div', 'set-row-main');
    main.appendChild(el('div', 'set-label', item.label));
    var hintEl = null;
    if (item.hint) {
      hintEl = el('div', 'set-hint', item.hint);
      main.appendChild(hintEl);
    }
    row.appendChild(main);
    var c = f(item);
    row.appendChild(c.node);
    body.appendChild(row);
    // hintOff（0.9.341 总闸行）：开态讲范围、关态讲结果——文案随值切，键仍单源 SCHEMA
    if (item.hintOff && hintEl) {
      offs.push(onChange(item.key, function () {
        hintEl.textContent = getSetting(item.key) === true ? item.hint : item.hintOff;
      }));
    }
    // 外部入口改了同一个键（如控制栏「弹」按钮）时面板态跟着走
    offs.push(onChange(item.key, c.sync));
  });
}

// ---------- 二级 · 官方页面增强（0.9.341，同壳换页；清单=settings.injectItems() 派生，禁人工第二份） ----------
// 文案两态逐字照确认稿；置灰态=总闸短路的观感表达：开关画「关位灰态」但**不回写各项存储**
//（总闸开回后各子项还原各自状态——稿④钉）；置灰行开关靠 CSS pointer-events 停用，零 JS 判。
var INJ_NOTE_ON = '关闭后不再加载对应功能，重新加载页面后官方界面与未装脚本时一致；脚本竖刷世界不受影响。首页顶导航入口是脚本进门键，不入本清单、不受总闸管辖。';
var INJ_NOTE_OFF = '官方页面增强已整体关闭；先回一级打开总开关，再逐项管理。';

function buildInjectBody(body) {
  var masterOn = getSetting(INJECT_MASTER) === true;
  body.appendChild(el('div', 'set-note', masterOn ? INJ_NOTE_ON : INJ_NOTE_OFF));
  injectItems().forEach(function (item) {
    var row = el('div', 'set-row' + (masterOn ? '' : ' dim'));
    var main = el('div', 'set-row-main');
    main.appendChild(el('div', 'set-label', item.label));
    if (item.hint) main.appendChild(el('div', 'set-hint', item.hint));
    row.appendChild(main);
    var sw = makeSwitch(masterOn && getSetting(item.key) === true, function (next) {
      setSetting(item.key, next);
    }, 'dark');
    sw.node.title = item.label || item.key;
    if (masterOn) { // 置灰态无需订阅：总闸不能在二级翻，回一级重开时整视图重建
      offs.push(onChange(item.key, function () { sw.sync(getSetting(item.key) === true); }));
    }
    row.appendChild(sw.node);
    body.appendChild(row);
  });
}

// 头部随视图重绘（‹ 只在二级、✕ 只在一级——稿③钉：二级关面板由「完成」承担，不做两步退出）
function renderHead() {
  headEl.textContent = '';
  if (mode === 'inject') {
    var back = el('button', 'set-back', '‹');
    back.title = '返回';
    back.addEventListener('click', showMain);
    headEl.appendChild(back);
    // 二级标题=总闸 SCHEMA 项 label 派生（0.9.341 单源：改口语只改 SCHEMA 一处，两侧同动）
    var masterItem = findItem(INJECT_MASTER);
    headEl.appendChild(el('div', 'set-title', (masterItem && masterItem.label) || '设置'));
  } else {
    headEl.appendChild(el('div', 'set-title', '设置'));
    var x = el('button', 'set-x', '✕');
    x.title = '关闭';
    x.addEventListener('click', closeSettings);
    headEl.appendChild(x);
  }
}

function renderView() {
  clearSubs(); // 订阅随视图走：换页先退干净再重订，防重开累积
  renderHead();
  bodyEl.textContent = '';
  if (mode === 'inject') buildInjectBody(bodyEl);
  else buildBody(bodyEl);
}

function openInject() { mode = 'inject'; renderView(); }
function showMain() { mode = null; renderView(); }

export function openSettings() {
  closeSettings();
  if (!root || panel) return;
  host = el('div', 'acsv-set-host');
  var shadow = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = SWITCH_CSS + SET_CSS; // 开关控件单源前置（0.9.262）：影子根内拿不到全局样式，必须随皮肤注入
  shadow.appendChild(style);
  panel = el('div', 'set');
  var pnl = el('div', 'set-panel');
  headEl = el('div', 'set-head');
  bodyEl = el('div', 'set-body');
  pnl.appendChild(headEl);
  pnl.appendChild(bodyEl);
  mode = null;
  renderView(); // 头部/首屏视图统一走换页管线（0.9.341 后 open 与换页同一条渲染路）
  var foot = el('div', 'set-foot');
  foot.appendChild(el('span', 'set-ver', 'v' + APP_VERSION));
  var done = el('button', 'set-act primary', '完成');
  done.addEventListener('click', closeSettings);
  foot.appendChild(done);
  pnl.appendChild(foot);
  panel.appendChild(pnl);
  panel.addEventListener('click', function (ev) { if (ev.target === panel) closeSettings(); });
  shadow.appendChild(panel);
  root.appendChild(host);
  overlayOpen({ id: 'settings', modal: true, close: closeSettings, onEsc: onPanelEsc });
}
