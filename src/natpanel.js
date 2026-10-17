// @ts-check
// ---------- IP 面板（0.9.250 生 / 0.9.253 两主题+全站接通；Web-IP 吸收 6c；路线图 Phase 6 · 任务卡 6.2） ----------
// 触发：点击任意 IP 标签——**原生页 `.acsv-nip`（浅色主题）/ 脚本页 `.acsv-cip`（深色主题）**
//（0.9.253 全站接通；捕获阶段委托 + preventDefault + stopImmediatePropagation，Web-IP 同款，
// 避免触发站方点击逻辑）；Esc / 遮罩点击关闭。
// 视觉＝**结构单源、两主题只换 token**（NATIVE_PANEL_CSS 段）：浅色＝Web-IP 面板资产收敛版
//（原生页，仿 A 站弹窗语言）；深色＝token 对齐齿轮面板家族（脚本页，用户 2026-10-15 裁决
//「脚本页的 IP 弹出面板用深色」）。
// 0.9.253 精简（用户裁决「小字太多了，有点挤」）：设置行单行式（原 hint 文案转入 label 悬停
// title）、组标移除、页脚只留 `v{APP_VERSION}`（免责文案已在每个标签的 tooltip 里）。
// 结构（D4 表驱动 + Web-IP 面板资产）：
//  - 用户资料卡（带 uid 进入时）：用户名 / UID / IP属地 / 查询于（iploc.entryOf 直读，含负缓存）
//  - 设置区：**评论域 SCHEMA 表驱动**（`nativeItems()`——panel ∧ native 标记；0.9.252 裁决）
//  - 缓存管理（acr_uids）/ 设备数据（acr_device_models 用户层）两区块——只留本面板，齿轮面板不带
// 与 Web-IP 的有意差异：① 开关关语义分离（ipShow 关＝不查不渲染但不清数据）；② 剪贴板走
// ui.copyText；③ toast 走本面板自带（原生页无 #acsv-root）。
import { nativeItems, getSetting, setSetting, flushSettings } from './settings.js';
import { APP_VERSION } from './cfg.js';
import { overlayOpen, overlayClose } from './overlay.js'; // 浮层栈（modal）：Esc 单点裁决（0.9.254 复审修）
import { entryOf, exportUids, importUids, clearUids } from './iploc.js';
import { deviceCount, exportDevices, importDeviceText, resetUserDevices } from './devname.js';
import { el, copyText, makeSwitch } from './ui.js';
import { NATIVE_PANEL_CSS } from './styles.js';
import { stat, testHook } from './dbg.js';

var maskEl = null;
var curUid = null;
var curDark = false; // 本次打开的主题（switchOf 选 token 用；openNatPanel 每次赋值）
var wired = false;

function ensureCss() {
  if (document.getElementById('acsv-np-css')) return;
  var st = document.createElement('style');
  st.id = 'acsv-np-css';
  st.textContent = NATIVE_PANEL_CSS;
  (document.head || document.documentElement).appendChild(st);
}

// 面板自带 toast（原生页无 #acsv-root，ui.toast 依赖 root 不可用）
function toast(msg) {
  var box = document.getElementById('acsv-np-toastbox');
  if (!box) {
    box = el('div', 'acsv-np-toastbox');
    box.id = 'acsv-np-toastbox';
    document.body.appendChild(box);
  }
  var t = el('div', 'acsv-np-toast', msg);
  box.appendChild(t);
  setTimeout(function () {
    t.classList.add('out');
    setTimeout(function () { t.remove(); }, 300);
  }, 2000);
}

function closeNatPanel() {
  if (maskEl) { maskEl.remove(); maskEl = null; }
  flushSettings(); // 关面板即落盘（settingspanel 同款纪律）
  overlayClose('natpanel'); // 显式关闭路径同步栈（Esc 路径已出栈时空转；settingspanel 同款）
}

// ---------- 控件工厂（native 皮肤；与 settingspanel 同语义不同皮） ----------

function actBtn(text, onClick, extra) {
  var b = el('button', extra || null, text);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

// 二次确认（Web-IP 同款：文案换成「确认 x?」，3 秒未点自还原）
function confirmBtn(btn, label, act) {
  btn.addEventListener('click', function () {
    if (btn._acsvNpArm) {
      btn._acsvNpArm = null;
      btn.textContent = label;
      act();
      return;
    }
    btn._acsvNpArm = true;
    btn.textContent = '确认' + label + '?';
    setTimeout(function () {
      if (btn._acsvNpArm) { btn._acsvNpArm = null; btn.textContent = label; }
    }, 3000);
  });
}

function switchOf(on, onToggle) {
  // 开关控件单源（0.9.262）：DOM/状态/可访问性在 ui.makeSwitch，几何与两皮 token 在
  // styles.SWITCH_CSS；本面板只按当前主题选皮肤（浅色=原生页入口，深色=脚本页入口）
  return makeSwitch(on, onToggle, curDark ? 'dark' : 'light').node;
}

function controlFor(it) {
  if (it.type === 'bool') {
    return switchOf(getSetting(it.key) === true, function (next) {
      setSetting(it.key, next);
      toast((it.label || it.key) + (next ? '已开启' : '已关闭'));
    });
  }
  if (it.type === 'select') {
    var seg = el('span', 'acsv-np-seg');
    (it.options || []).forEach(function (o) {
      var b = actBtn(o.t || o.v, null, getSetting(it.key) === o.v ? 'on' : null);
      b.addEventListener('click', function () {
        setSetting(it.key, o.v);
        Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
      seg.appendChild(b);
    });
    return seg;
  }
  if (it.type === 'number') {
    var wrap = el('span', 'acsv-np-step');
    var val = el('b', null, String(getSetting(it.key)));
    var step = it.step || 1;
    var minus = actBtn('−', function () { setSetting(it.key, getSetting(it.key) - step); val.textContent = String(getSetting(it.key)); });
    var plus = actBtn('+', function () { setSetting(it.key, getSetting(it.key) + step); val.textContent = String(getSetting(it.key)); });
    wrap.appendChild(minus);
    wrap.appendChild(val);
    wrap.appendChild(plus);
    return wrap;
  }
  return el('span');
}

// ---------- 主体渲染与两种导入视图（Web-IP：临时替换面板内容、取消即回主视图） ----------

function cardRow(card, label, value, cls) {
  var row = el('div');
  row.appendChild(el('span', null, label));
  row.appendChild(el('span', cls || null, value));
  card.appendChild(row);
}

// 设置区：评论域 SCHEMA 表驱动（0.9.252）。0.9.253 精简：单行式（label + 控件；原 hint 文案转入
// label 悬停 title）、不渲染组标（评论域独占，标题已交代语境）
function renderSettings(body) {
  nativeItems().forEach(function (it) {
    var row = el('div', 'acsv-np-row');
    var lab = el('span', 'acsv-np-label', it.label || it.key);
    if (it.hint) lab.title = it.hint;
    row.appendChild(lab);
    row.appendChild(controlFor(it));
    body.appendChild(row);
  });
}

function renderMain(body) {
  body.textContent = '';
  // 用户资料卡（带 uid 进入时）
  if (curUid != null) {
    var e = entryOf(curUid);
    var card = el('div', 'acsv-np-card');
    cardRow(card, '用户名', e && e.name ? e.name : '未知');
    cardRow(card, 'UID', String(curUid));
    cardRow(card, 'IP属地', e && e.ip ? e.ip : (e ? '无属地记录' : '暂无缓存'), 'acsv-np-ip');
    if (e && e.t) cardRow(card, '查询于', new Date(e.t).toLocaleString());
    body.appendChild(card);
  }
  // 设置区（全量 SCHEMA 表驱动——D4：新增设置项两边自动出现）
  renderSettings(body);
  // 缓存管理
  var cRow = el('div', 'acsv-np-row');
  cRow.appendChild(el('span', null, '缓存管理'));
  var cActs = el('span', 'acsv-np-acts');
  cActs.appendChild(actBtn('导出', function () {
    copyText(JSON.stringify(exportUids(), null, 2)).then(function (ok) {
      toast(ok ? '缓存已复制' : '复制失败');
    });
  }));
  cActs.appendChild(actBtn('导入', function () { renderCacheImport(body); }));
  var cClear = actBtn('清空', null, 'danger');
  confirmBtn(cClear, '清空', function () {
    clearUids();
    toast('缓存已清空');
  });
  cActs.appendChild(cClear);
  cRow.appendChild(cActs);
  body.appendChild(cRow);
  // 设备数据（acr_device_models 用户层）
  var dRow = el('div', 'acsv-np-row');
  dRow.appendChild(el('span', null, '设备数据 ' + deviceCount() + ' 条'));
  var dActs = el('span', 'acsv-np-acts');
  dActs.appendChild(actBtn('导入', function () { renderDeviceImport(body); }));
  dActs.appendChild(actBtn('导出', function () {
    copyText(JSON.stringify(exportDevices(), null, 2)).then(function (ok) {
      toast(ok ? '设备数据已复制' : '复制失败');
    });
  }));
  var dReset = actBtn('重置', null, 'danger');
  confirmBtn(dReset, '重置', function () {
    var n = resetUserDevices();
    toast('已重置为内置数据（' + n + ' 条）');
    renderMain(body); // 条数刷新
  });
  dActs.appendChild(dReset);
  dRow.appendChild(dActs);
  body.appendChild(dRow);
}

function renderCacheImport(body) {
  body.textContent = '';
  var f = el('div', 'acsv-np-field');
  f.appendChild(el('span', null, '粘贴缓存 JSON：'));
  var ta = /** @type {any} */ (el('textarea', 'acsv-np-ta'));
  ta.placeholder = '{"version":"...","uids":{}}';
  f.appendChild(ta);
  body.appendChild(f);
  var acts = el('div', 'acsv-np-acts right');
  acts.appendChild(actBtn('取消', function () { renderMain(body); }));
  acts.appendChild(actBtn('导入', function () {
    var input = String(ta.value || '').trim();
    if (!input) { toast('请输入 JSON'); return; }
    var data;
    try { data = JSON.parse(input); } catch (e) { toast('❌ ' + e.message); return; }
    var r = importUids(data);
    toast('导入 ' + r.added + ' 条 uid 缓存（现有 ' + r.total + ' 条）');
    renderMain(body);
  }, 'primary'));
  body.appendChild(acts);
}

function renderDeviceImport(body) {
  body.textContent = '';
  var f = el('div', 'acsv-np-field');
  f.appendChild(el('span', null, '选择文件（.md / .txt，可多选）或粘贴文本：'));
  var file = /** @type {any} */ (el('input', 'acsv-np-file'));
  file.type = 'file';
  file.accept = '.md,.txt';
  file.multiple = true;
  f.appendChild(file);
  var ta = /** @type {any} */ (el('textarea', 'acsv-np-ta'));
  ta.rows = 5;
  ta.placeholder = '支持格式：\n① `RMX3700`: 真我 GT Neo5 SE\n② iPhone3,1 : iPhone 4';
  f.appendChild(ta);
  var skipWrap = el('label', 'acsv-np-skip');
  var skip = /** @type {any} */ (el('input'));
  skip.type = 'checkbox';
  skip.checked = true;
  skipWrap.appendChild(skip);
  skipWrap.appendChild(el('span', null, '跳过已存在的型号（不覆盖）'));
  f.appendChild(skipWrap);
  body.appendChild(f);
  var acts = el('div', 'acsv-np-acts right');
  acts.appendChild(actBtn('取消', function () { renderMain(body); }));
  acts.appendChild(actBtn('导入', function () {
    var parts = [];
    var files = file.files || [];
    var readAll = Promise.resolve();
    for (var i = 0; i < files.length; i++) {
      (function (fn) {
        readAll = readAll.then(function () {
          return fn.text().then(function (t) { parts.push(t); }, function () { });
        });
      })(files[i]);
    }
    readAll.then(function () {
      var pasted = String(ta.value || '').trim();
      if (pasted) parts.push(pasted);
      var text = parts.join('\n');
      if (!text) { toast('请选择文件或粘贴文本'); return; }
      var r = importDeviceText(text, skip.checked);
      if (!r.added && !r.skipped) { toast('❌ 未解析出有效数据，请检查文件格式'); return; }
      toast('导入 ' + r.added + ' 条，跳过 ' + r.skipped + ' 条，共 ' + r.total + ' 条');
      renderMain(body);
    });
  }, 'primary'));
  body.appendChild(acts);
}

// ---------- 打开/挂载 ----------

// openNatPanel(uid, dark)：dark＝脚本页深色主题（`.acsv-cip` 入口）；缺省浅色（原生页 `.acsv-nip`）
export function openNatPanel(uid, dark) {
  ensureCss();
  closeNatPanel();
  curUid = uid != null ? String(uid) : null;
  curDark = !!dark; // 本面板的开关皮肤（switchOf 在 renderMain 期间读取）
  maskEl = el('div', 'acsv-np-mask');
  maskEl.addEventListener('click', closeNatPanel);
  var panel = el('div', 'acsv-np' + (dark ? ' dark' : ''));
  panel.addEventListener('click', function (e) { e.stopPropagation(); }); // 面板内点击不冒泡到遮罩
  var head = el('div', 'acsv-np-head');
  head.appendChild(el('span', 'acsv-np-title', 'IP 属地 · 设备'));
  var x = el('span', 'acsv-np-close', '×');
  x.addEventListener('click', closeNatPanel);
  head.appendChild(x);
  var body = el('div', 'acsv-np-body');
  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(el('div', 'acsv-np-foot', 'v' + APP_VERSION)); // 精简（0.9.253）：免责文案在标签 tooltip 里，页脚只留版本号
  maskEl.appendChild(panel);
  // 宿主：脚本页优先进 #acsv-root（momenteditor.js:136 先例），原生页回落 body
  (document.getElementById('acsv-root') || document.body).appendChild(maskEl);
  // 入浮层栈（modal）：真键盘 Esc 由 overlay capture 单点裁决——只关本面板、不再连关底层
  // 评论层（0.9.254 复审实证：此前不入栈时 Esc 会把行内评论框一起关掉）；脚本页合成事件
  // 由 input.js 栈判定兜底（overlay.js:64 合成事件早退），原生页合成事件走下文的 window 兜底
  overlayOpen({ id: 'natpanel', modal: true, close: closeNatPanel });
  stat('np.open');
  renderMain(body);
}

// 事件接线（幂等；boot 全站装配 + nativeip 调，双路安全）
export function mountNatPanel() {
  if (wired) return;
  wired = true;
  // Esc 关闭（**仅原生页合成事件兜底**）：真键盘 Esc 走 overlay.js capture 单点关栈顶（本面板
  // modal）；脚本页合成事件由 input.js 栈判定接管（overlay.js:64 同款分工：栈顶=本面板 modal
  // ⇒ 只关本层）。**脚本页禁用本监听**——监听序先于 input.js 时会把面板抢关出栈，input.js 随即
  // 视栈顶 'view' 层为普通层连关（0.9.254 实证：Esc 连带退出订阅视图回竖刷）。判据取「有无
  // #acsv-root 壳」：脚本页恒有（root 即它），原生页恒无——与 input.js:49 的 isFeedRoute()&&root
  // 同一事实的两处读取，不再复制判定逻辑
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !maskEl) return;
    if (document.getElementById('acsv-root')) return;
    closeNatPanel();
  });
  // 点击任意 IP 标签打开面板；捕获阶段拦截，避免触发站方评论点击逻辑。
  // 0.9.253：selector 扩 `.acsv-cip, .acsv-nip`（脚本页抽屉/原生页全站接通）；主题随入口——
  // `.acsv-cip`＝脚本页 ⇒ 深色主题，`.acsv-nip`＝原生页 ⇒ 浅色主题
  document.addEventListener('click', function (e) {
    var t = /** @type {any} */ (e.target);
    var span = t && t.closest ? t.closest('.acsv-cip, .acsv-nip') : null;
    if (!span) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openNatPanel(span.dataset.acsvUid || null, span.classList.contains('acsv-cip'));
  }, true);
}

testHook('natpanel', function () {
  return { open: !!maskEl, uid: curUid };
});
