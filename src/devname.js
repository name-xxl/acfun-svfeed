// @ts-check
// ---------- 设备型号美化（0.9.246，Web-IP 吸收批次②） ----------
// 把评论「来自 x」里的厂商内部代号（RMX3619 / iPhone3,1）替换为友好名（真我 V30 / iPhone 4）。
// 四级匹配（精确 → 大小写 → 去尾字母 → 前缀包含）+ 查找缓存 + 导入文本解析——逐字移植
// Web-IP v5.8.5 56-device.js（单测 16 项等值迁移，见 test/unit/devname.test.js）。
//
// 吸收口径（每条差异有意为之）：
//  - 内置表 = `src/devicetab.js`（tools/gen-device-data.js 生成，「带生成器」入库；数据 CC BY-NC-SA，
//    与 MIT 分声明——README「设备型号数据许可」）
//  - 用户层读 Web-IP 同键 `acr_device_models`（**只读**兼容老用户导入；导入/导出 UI 属 Phase 6
//    原生面板 6c）
//  - **合并语义升级**：内置先、用户条覆盖——Web-IP 是「保存快照整体顶掉内置」（旧快照会把新内置
//    表整个盖住），反转为覆盖层后：老用户数据保留 + 新内置条目持续生效
//  - 未收录兜底原文（不瞎猜）；**只换锚文本**，href（官方 APP 落点）与结构不动（预览 ③ 定稿）
//  - 点击切换（友好名 ⇄ 代号）照抄 Web-IP：命中映射才挂监听、preventDefault 拦原生跳转、title
//    提示「原始型号 + 点击可切换显示」。Web-IP 的 manual 标记（防其 MutationObserver 重扫把用户
//    切换覆盖回去）在我们架构里不需要——条目由 commentkit 单次构建、不重扫，切换态天然留痕
import { DEVICE_TAB } from './devicetab.js';
import { CFG } from './cfg.js';
import { getSetting } from './settings.js';
import { isSafeKey } from './ui.js'; // 键守卫单源（0.9.250 迁 ui：设备导入与缓存导入共用）

var USER_KEY = 'acr_device_models'; // Web-IP 同键（只读合并其用户层）

// ---------- 纯函数（单测直采） ----------

// 用户层合并：内置先、用户条覆盖（快照→覆盖层，见文件头；危险键剔除）
export function mergeTab(builtin, user) {
  var out = {};
  var k;
  for (k in builtin) { if (isSafeKey(k)) out[k] = builtin[k]; }
  if (user && typeof user === 'object') {
    for (k in user) {
      if (!isSafeKey(k)) continue;
      if (typeof user[k] === 'string' && user[k]) out[k] = user[k];
    }
  }
  return out;
}

// 四级索引（Web-IP buildDeviceIndexes 同款）：精确 / 大写 / 去尾字母 / 前缀（4~6 位）
export function buildIndexes(tab) {
  var exact = new Map(), upper = new Map(), base = new Map(), prefix = new Map();
  for (var code in tab) {
    var name = tab[code];
    exact.set(code, name);
    var up = code.toUpperCase();
    if (!upper.has(up)) upper.set(up, name);
    // 去掉末尾单个字母：V1821A → V1821（覆盖 A/B 区分的市场变体）
    var b = code.replace(/[A-Za-z]$/, '');
    if (b.length >= 3 && b !== code && !base.has(b)) {
      base.set(b, name);
      var bUp = b.toUpperCase();
      if (!base.has(bUp)) base.set(bUp, name);
    }
    for (var len = 4; len <= Math.min(6, code.length); len++) {
      var pf = code.substring(0, len).toUpperCase();
      if (!prefix.has(pf)) prefix.set(pf, []);
      prefix.get(pf).push({ code: code, name: name });
    }
  }
  return { exact: exact, upper: upper, base: base, prefix: prefix };
}

// 查找（Web-IP findFriendlyName 同款，含缓存与淘汰）：cache 传 Map 则记入（含未命中 null）
export function lookupIn(indexes, code, cache) {
  if (!code || code.length < 3) return null;
  if (cache && cache.has(code)) return cache.get(code);
  var result = indexes.exact.get(code);
  if (!result) result = indexes.upper.get(code.toUpperCase());
  if (!result) {
    var b = code.replace(/[A-Za-z]$/, '');
    if (b.length >= 3 && b !== code) {
      result = indexes.base.get(b) || indexes.base.get(b.toUpperCase());
    }
  }
  if (!result) {
    for (var len = Math.min(6, code.length); len >= 4 && !result; len--) {
      var cands = indexes.prefix.get(code.substring(0, len).toUpperCase());
      if (!cands) continue;
      for (var i = 0; i < cands.length; i++) {
        var k = cands[i].code;
        if (k.indexOf(code) >= 0 || code.indexOf(k) >= 0) { result = cands[i].name; break; }
      }
    }
  }
  result = result || null;
  if (cache) {
    if (cache.size >= CFG.dev.cacheMax) {
      // 淘汰最早写入的 20%，避免每次全量清理（Web-IP 同款）
      var drop = Math.floor(CFG.dev.cacheMax * 0.2);
      var it = cache.keys();
      for (var j = 0; j < drop; j++) cache.delete(it.next().value);
    }
    cache.set(code, result);
  }
  return result;
}

// 解析导入文本（Web-IP 同款三格式）：
// ① MobileModels: `RMX3700`: 真我 GT Neo5 SE（可一行多个代码）
// ② Apple gist:   iPhone3,1 : iPhone 4
// ③ Apple 无冒号:  iPhone3,1 iPhone 4（仅 Apple 前缀行）
export function parseDeviceModelsText(text) {
  var models = {};
  var lines = String(text).split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.indexOf('#') === 0 || line.indexOf('//') === 0) continue;
    var m = line.match(/^((?:`[^`]+`\s*)+):\s*(.+?)\s*$/);
    if (m) {
      var name = m[2].trim();
      var codes = m[1].match(/`([^`]+)`/g) || [];
      for (var c = 0; c < codes.length; c++) {
        var code = codes[c].slice(1, -1);
        if (code && name) models[code] = name;
      }
      continue;
    }
    m = line.match(/^([A-Za-z0-9_,.\-]+(?:\s+[A-Za-z0-9_,.\-]+)*)\s*:\s*(.+?)\s*$/);
    if (m) {
      var c2 = m[1].trim(), n2 = m[2].trim();
      if (c2 && n2 && c2.length >= 2) models[c2] = n2;
      continue;
    }
    if (/^(iPhone|iPad|iPod|Watch|Mac|Apple)[\d,]/i.test(line)) {
      var sp = line.indexOf(' ');
      if (sp > 0) {
        var c3 = line.substring(0, sp).trim(), n3 = line.substring(sp + 1).trim();
        if (c3 && n3) models[c3] = n3;
      }
    }
  }
  return models;
}

// ---------- 运行态（惰性装载；用户层读 Web-IP 同键） ----------

var idx = null;
var searchCache = new Map();
var mergedTab = {};
var mergedCount = 0;

function readUserTab() {
  try {
    if (typeof GM_getValue === 'function') {
      var g = GM_getValue(USER_KEY, null);
      if (g) return typeof g === 'string' ? JSON.parse(g) : g;
    }
  } catch (e) { }
  try {
    var raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { }
  return null;
}

function writeUserTab(obj) {
  try { if (typeof GM_setValue === 'function') { GM_setValue(USER_KEY, obj); return; } } catch (e) { }
  try { localStorage.setItem(USER_KEY, JSON.stringify(obj)); } catch (e) { }
}

// 重置写空对象（无 GM_deleteValue 授权；Web-IP 侧读到空表会回落内置——互通安全）
function clearUserTab() {
  try { if (typeof GM_setValue === 'function') { GM_setValue(USER_KEY, {}); return; } } catch (e) { }
  try { localStorage.removeItem(USER_KEY); } catch (e) { }
}

function ensure() {
  if (!idx) {
    mergedTab = mergeTab(DEVICE_TAB, readUserTab());
    mergedCount = Object.keys(mergedTab).length;
    idx = buildIndexes(mergedTab);
  }
}

function rebuild() {
  idx = null;
  searchCache = new Map();
  ensure();
}

export function friendlyOf(code) {
  ensure();
  return lookupIn(idx, code, searchCache);
}

// ---------- 数据管理（0.9.250，面板 6c 消费） ----------

// 当前库条数（内置 ⊕ 用户层）
export function deviceCount() {
  ensure();
  return mergedCount;
}

// 导出（合并后全表；与 Web-IP 导出语义同款——下游可整体再导入）
export function exportDevices() {
  ensure();
  return JSON.parse(JSON.stringify(mergedTab));
}

// 文本导入 → 用户层：解析三格式 → 合并进 `acr_device_models` 用户层 → 重建索引。
// skipExisting=true 时对**合并后全表**已存在的代号跳过（Web-IP importDeviceModels 同款——
// 其 deviceDB 本就含内置）
export function importDeviceText(text, skipExisting) {
  var entries = parseDeviceModelsText(text);
  ensure();
  var user = readUserTab();
  if (!user || typeof user !== 'object') user = {};
  var added = 0, skipped = 0;
  for (var code in entries) {
    if (!isSafeKey(code)) continue;
    var name = entries[code];
    if (!name) continue;
    if (skipExisting && mergedTab[code]) { skipped++; continue; }
    user[code] = name;
    added++;
  }
  if (added) {
    writeUserTab(user);
    rebuild();
  }
  return { added: added, skipped: skipped, total: mergedCount };
}

// 重置为内置表（用户层清空；Web-IP resetDeviceDB 同义）
export function resetUserDevices() {
  clearUserTab();
  rebuild();
  return mergedCount;
}

// ---------- 渲染点接线口（commentkit 经管线 opts.devTag 调用） ----------

// 点击切换（Web-IP handleDeviceToggleClick 同款；title 语义逐字对齐）
function onToggle(e) {
  e.preventDefault();
  e.stopPropagation();
  var a = e.currentTarget;
  var showingFriendly = a.textContent === (a.dataset.acsvFriendly || '');
  a.textContent = showingFriendly ? (a.dataset.acsvOriginal || '') : (a.dataset.acsvFriendly || '');
  // 手动记忆：原生页重扫对「用户手动切过」的元素不再覆盖（Web-IP manualAttr 同义，0.9.248 增；
  // 抽屉无重扫，标记无害）
  a.setAttribute('data-acsv-dev-manual', '1');
  a.title = showingFriendly
    ? '原始型号: ' + (a.dataset.acsvOriginal || '') + '\n点击可切换显示'
    : (a.dataset.acsvFriendly || '') + '\n点击可切换显示';
}

// 挂美化（渲染点调用）：命中映射才动文字并挂切换；未收录保持原文与原生跳转
export function devTag(a, model) {
  if (!model || !getSetting('devName')) return;
  var text = String(model);
  // 设备标签形如 "realme RMX3619"，取最后一段作为代号（Web-IP 同款）
  var code = text.split(/\s+/).pop();
  var friendly = friendlyOf(code);
  if (!friendly) return;
  a.dataset.acsvOriginal = text;
  a.dataset.acsvFriendly = friendly;
  a.title = '原始型号: ' + text + '\n点击可切换显示';
  a.textContent = friendly;
  a.addEventListener('click', onToggle);
}
