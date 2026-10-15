// @ts-check
// ---------- 原生页设置面板（0.9.250，Web-IP 吸收 6c；路线图 Phase 6 · 任务卡 6.2） ----------
// 触发：点击任意原生页 IP 标签（`.acsv-nip`）——捕获阶段委托 + preventDefault +
// stopImmediatePropagation（Web-IP 同款，避免触发站方点击逻辑）；Esc / 遮罩点击关闭。
// 视觉＝原脚本面板资产照抄（浅色仿 A 站弹窗、主色 #fd4c5d、340px，NATIVE_PANEL_CSS 段），
// **不进 svfeed 暗色体系**（D4：共享层同源、皮肤各自生命周期）。
// 结构（D4 表驱动 + Web-IP 面板资产）：
//  - 用户资料卡（带 uid 进入时）：用户名 / UID / IP属地 / 查询于（iploc.entryOf 直读，含负缓存）
//  - 设置区：**评论域 SCHEMA 表驱动**（`nativeItems()`——panel ∧ native 标记；0.9.252，用户裁决：
//    点 IP 进来的语境就是 IP/设备功能，播放/通用项在原生页看不到效果、不进；加项时在 SCHEMA
//    同一行顺手打 native 标记，两侧都不漏）
//  - 缓存管理（acr_uids）：导出 / 导入（粘贴 JSON，跳过已存在）/ 清空（二次确认）
//  - 设备数据（acr_device_models 用户层）：N 条 + 导入（文件 .md/.txt + 粘贴，可跳过已存在）/
//    导出 / 重置（二次确认）
// 与 Web-IP 的有意差异：① 开关关语义分离——ipShow 关＝不查不渲染但**不清数据**（其「缓存开关
// 关闭即清空」是耦合设计，清空改由显式按钮承担）；② 剪贴板走 ui.copyText（本仓无 GM_setClipboard
// 授权）；③ toast 走本面板自带（原生页无 #acsv-root，ui.toast 依赖 root）。
import { nativeItems, getSetting, setSetting, flushSettings } from './settings.js';
import { entryOf, exportUids, importUids, clearUids } from './iploc.js';
import { deviceCount, exportDevices, importDeviceText, resetUserDevices } from './devname.js';
import { el, copyText } from './ui.js';
import { NATIVE_PANEL_CSS } from './styles.js';
import { stat, testHook } from './dbg.js';

var maskEl = null;
var curUid = null;
var wired = false;

function ver() {
  return typeof __ACSV_VERSION__ !== 'undefined' ? __ACSV_VERSION__ : '';
}

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
  var s = el('span', 'acsv-np-sw' + (on ? ' on' : ''));
  s.addEventListener('click', function () {
    var next = !s.classList.contains('on');
    s.classList.toggle('on', next);
    onToggle(next);
  });
  return s;
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

function renderSettings(body) {
  var items = nativeItems(); // 评论域项（0.9.252）；分组标签随 schema（当前仅「评论」一组）
  var lastGroup = null;
  items.forEach(function (it) {
    if (it.group && it.group !== lastGroup) {
      body.appendChild(el('div', 'acsv-np-group', it.group));
      lastGroup = it.group;
    }
    var row = el('div', 'acsv-np-row');
    row.appendChild(el('span', null, it.label || it.key));
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

export function openNatPanel(uid) {
  ensureCss();
  closeNatPanel();
  curUid = uid != null ? String(uid) : null;
  maskEl = el('div', 'acsv-np-mask');
  maskEl.addEventListener('click', closeNatPanel);
  var panel = el('div', 'acsv-np');
  panel.addEventListener('click', function (e) { e.stopPropagation(); }); // 面板内点击不冒泡到遮罩
  var head = el('div', 'acsv-np-head');
  head.appendChild(el('span', 'acsv-np-title', 'AcFun svfeed 设置'));
  var x = el('span', 'acsv-np-close', '×');
  x.addEventListener('click', closeNatPanel);
  head.appendChild(x);
  var body = el('div', 'acsv-np-body');
  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(el('div', 'acsv-np-foot', 'v' + ver() + ' · 属地基于用户主页实时资料，不代表发布时的IP'));
  maskEl.appendChild(panel);
  document.body.appendChild(maskEl);
  stat('np.open');
  renderMain(body);
}

// 事件接线（幂等；由 nativeip.mountNativeIp 调）
export function mountNatPanel() {
  if (wired) return;
  wired = true;
  // Esc 关闭：常驻监听，面板不存在时不操作（Web-IP v5.8.4 修正同款）。挂 **window**——真机
  // keydown 冒泡到 window 同样到达，且 harness 的 key()（window.dispatchEvent）也能触达
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && maskEl) closeNatPanel();
  });
  // 点击任意 IP 标签打开面板；捕获阶段拦截，避免触发站方评论点击逻辑
  document.addEventListener('click', function (e) {
    var t = /** @type {any} */ (e.target);
    var span = t && t.closest ? t.closest('.acsv-nip') : null;
    if (!span) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openNatPanel(span.dataset.acsvUid || null);
  }, true);
}

testHook('natpanel', function () {
  return { open: !!maskEl, uid: curUid };
});
