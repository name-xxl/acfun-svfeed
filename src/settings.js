// ---------- 设置共享层（0.9.89，路线图 1.1）：schema 契约 + 偏好存储 ----------
// 定位（D4/双 UI 体系）：本模块是**共享逻辑层、零 UI**——schema 是唯一契约，两套皮肤
// （脚本页 settingspanel / 原生页 Phase 6）表驱动出自同一份，新增设置项两边自动出现；
// 依赖方向单向：皮肤 → 本层。本层只许 import cfg.js（eslint 定向禁令守着，见 eslint.config.mjs），
// 想加 UI 依赖就是架构走错了地方。
//
// 存储（路线图 1.1「GM key 规划 acsv.s.*」）：**逐键** `acsv.s.<key>`，值为 JSON 标量。
// GM 优先 / localStorage 回落逐键独立（watchledger 同款 rawGet/rawSet 体例）；写时防抖
// （CFG.time.setFlush），flushSettings() 强制落盘，pagehide 兜一次。
// **TTL 不适用（知情设计，不是漏项）**：intake 清单要求「GM 存储带 TTL/负缓存语义」，但那是
// 缓存件的规矩——观看账本有 24h TTL 因为它存的是「差量缓存，过期即无补报价值」；偏好过期没有
// 语义（用户设的编码偏好不该三天后自己忘掉）。故本层无 TTL，只有默认值合并与类型校验。
//
// 老键收编（0.9.89 迁移式）：六项老偏好（详见各 item 的 legacy 字段）首读时若新键缺 → 收养
// 老键值并落新键；**老键不删**（回滚友好；也让 5.3「兼容老 key」条款提前成立）。真值快照见
// docs/api-research.md §7（四项本机未出现、形态按写入点原文构造，标注在册）。
// 不迁移：acsv-upd-v1（是状态机 seen/notified/ignored，不是设置）、acsv-stats（调试通道）、
// acsv_emot_recent_v1（最近项缓存）、GM 键（账本/表情包）。
//
// 纯逻辑抽纯（0.9.87 教训：环境触点留壳、逻辑必须可测）：coerceValue / fromLegacy / validateValue /
// defaultsSnapshot 等全是纯函数，单测直接喂字符串；GM/localStorage/定时器只在函数体内。
import { CFG } from './cfg.js';

// ---------- schema（唯一契约） ----------
// item: { key, type: bool|select|number|text, def, label?, group?, options?, min?/max?/step?,
//         panel, hint?, legacy? }
//   panel:true = 上脚本页面板（据此派生控件，label/group 是 UI 文案）；panel:false = 内部项：
//   有既有入口（控制栏/播放器手势）或纯记忆（清晰度 label），只收编存储、不上面板。
//   def 一律**引用 CFG**——默认值的单一来源仍是 cfg.js，本表不复制字面量。
//   legacy = 老键名（收编来源，只读一次；老键写在 localStorage，收养读侧只查 localStorage）。
export var SCHEMA = [
  { key: 'updCheck', type: 'bool', def: true, panel: true, group: '通用',
    label: '自动检查更新', hint: '关掉后不再自动拉取 release 说明（顶栏「更新」仍可手动看）' },
  { key: 'dmDefault', type: 'bool', def: true, panel: true, group: '播放',
    label: '弹幕默认开启', legacy: CFG.lsDm, hint: '立即生效' },
  // 音量真值（0.9.199）：0~1；0 即静音（与 soundOn 联动）。控制栏竖条滑杆是它的唯一入口，
  // 故不进设置面板（panel:false）——面板里做 0~1 的步进器没有意义
  { key: 'vol', type: 'number', def: 1, min: 0, max: 1, panel: false, group: '播放', label: '音量' },
  { key: 'codec', type: 'select', def: CFG.codec.def, panel: true, group: '播放',
    label: '编码偏好', legacy: CFG.lsCodec, hint: '下次播放生效',
    // 选项文案与控制栏「编码」菜单同源（controls.js 同表），不另抄一份
    options: [{ v: 'auto', t: '自动' }, { v: 'avc', t: 'H.264' }, { v: 'hevc', t: 'HEVC' }] },
  { key: 'buf', type: 'select', def: CFG.buf.def, panel: true, group: '播放',
    label: '缓冲档位', legacy: CFG.lsBuf, hint: '下次播放生效',
    options: Object.keys(CFG.buf.presets).map(function (k) {
      return { v: k, t: CFG.buf.presets[k].label + ' ' + CFG.buf.presets[k].maxBufferLength + 's' };
    }) },
  { key: 'seekStep', type: 'number', def: CFG.time.seekStep, panel: true, group: '播放',
    label: '快进步长（秒）', min: 5, max: 30, step: 5,
    hint: '左右方向键的进退秒数' },
  { key: 'relSequential', type: 'bool', def: false, panel: true, group: '播放',
    label: '相关推荐按列表顺序续播',
    hint: '关闭（默认）：下一条在当前视频的相关推荐里随机抽，逐级游走；开启：按列表顺序播，尽头自动接下一批' },
  // ---- 内部项（既有入口在控制栏/播放器，不上面板） ----
  { key: 'source', type: 'select', def: 'sv', legacy: CFG.lsSource,
    options: [{ v: 'sv' }, { v: 'home' }] },          // 源记忆（控制栏 seg 是入口）
  { key: 'quality', type: 'text', def: '', legacy: CFG.lsQuality }, // 清晰度 label（动态值，见 §7 实测）
  { key: 'sound', type: 'bool', def: false, legacy: CFG.lsSound }   // 静音记忆（播放器手势是入口）
];

var STORE_PREFIX = 'acsv.s.'; // 逐键命名空间（路线图 1.1）

export function storeKey(key) { return STORE_PREFIX + key; }

export function findItem(key) {
  for (var i = 0; i < SCHEMA.length; i++) if (SCHEMA[i].key === key) return SCHEMA[i];
  return null;
}

// 面板项（皮肤据此渲染；顺序即 schema 顺序，皮肤再按 group 分组）
export function panelItems() {
  return SCHEMA.filter(function (it) { return !!it.panel; });
}

// ---------- 纯函数（单测直采） ----------

// 值校验：类型/值域不符返回 false。number 越界不算假值——由上层的 clampNumber 收口
export function validateValue(item, v) {
  switch (item.type) {
    case 'bool': return typeof v === 'boolean';
    case 'select':
      return item.options.some(function (o) { return o.v === v; });
    case 'number': return typeof v === 'number' && isFinite(v);
    // text 允许空串：quality 这类「动态 label 记忆」的空态就是 ''（= 无记忆，消费点按默认走），
    // 与 def 自洽（本模块初稿把 '' 判非法，导致 quality 的 def 过不了自校验——单测第一条钉死）
    case 'text': return typeof v === 'string';
    default: return false;
  }
}

// number 钳位（步进器与越界存储值共用；越界钳到边界而非回默认——用户手滑到 99 期望的是 30 不是 5）
export function clampNumber(item, n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  if (item.min != null && n < item.min) return item.min;
  if (item.max != null && n > item.max) return item.max;
  return n;
}

// 新存储串（JSON 标量）→ 规范值；无法解析/非法一律 null（调用方落默认）
export function coerceValue(item, raw) {
  if (raw == null) return null;
  var v;
  try { v = JSON.parse(String(raw)); } catch (e) { return null; }
  if (item.type === 'number') {
    var n = clampNumber(item, v);
    return n == null ? null : n;
  }
  return validateValue(item, v) ? v : null;
}

// 老键串（非 JSON：各写入点自定的字面量）→ 规范值；非法 null。
// 形态全部来自写入点原文（docs §7 有真值表）：bool 老键是 '1'/'0'，sound 关态是**空串**
// （playback 写 '' 而非删键——空串不得当「非法」丢给默认，它就是 false）
export function fromLegacy(item, raw) {
  if (raw == null) return null;
  var s = String(raw);
  if (item.type === 'bool') {
    if (s === '1' || s === 'true') return true;
    if (s === '0' || s === '' || s === 'false') return false;
    return null;
  }
  if (item.type === 'number') return clampNumber(item, Number(s));
  if (item.type === 'text') return s;
  return validateValue(item, s) ? s : null;
}

// 全 schema 的默认值快照（皮肤初值 / 单测对账用）
export function defaultsSnapshot(schema) {
  var out = {};
  (schema || SCHEMA).forEach(function (it) { out[it.key] = it.def; });
  return out;
}

// ---------- 存储触点（GM 优先 / localStorage 回落，watchledger 体例） ----------
function rawGet(k) {
  try { if (typeof GM_getValue === 'function') { var g = GM_getValue(k); if (g != null) return String(g); } } catch (e) { }
  try { return localStorage.getItem(k); } catch (e) { }
  return null;
}
function rawSet(k, str) {
  try { if (typeof GM_setValue === 'function') { GM_setValue(k, str); return; } } catch (e) { }
  try { localStorage.setItem(k, str); } catch (e) { }
}

// ---------- 读：三态（新键 → 老键收养 → 默认） ----------
// mem 是「已解析键」表：**空对象起步**，解析过才落座（含默认）。不能预填默认值——
// 预填会让 hasOwnProperty 恒真、存储永远读不到（本模块初稿的真 bug，单测首条钉死）
var mem = {};
var pending = {};        // key → timer：防抖落盘
var subs = {};           // key → [fn]：变更订阅（读方零反向依赖，同 state.js 中介纪律）

// 收养只发生一次：真收养老键值时落盘（不因「读到默认」而写键——首启不该写满 8 个键）
function adoptIfNeeded(item, v) {
  if (v != null || !item.legacy) return v;
  var lraw = null;
  try { lraw = localStorage.getItem(item.legacy); } catch (e) { } // 老键只写在 localStorage（历史写入点）
  if (lraw == null) return null;
  var lv = fromLegacy(item, lraw);
  if (lv == null) return null;
  mem[item.key] = lv;
  scheduleFlush(item.key);
  return lv;
}

export function getSetting(key) {
  var item = findItem(key);
  if (!item) return undefined;
  if (Object.prototype.hasOwnProperty.call(mem, key)) return mem[key];
  var v = coerceValue(item, rawGet(storeKey(key)));
  if (v == null) v = adoptIfNeeded(item, v);
  if (v == null) v = item.def;
  mem[key] = v;
  return v;
}

// ---------- 写：内存即时 + 防抖落盘 ----------
export function setSetting(key, value) {
  var item = findItem(key);
  if (!item) return false;
  var v = item.type === 'number' ? clampNumber(item, value) : value;
  if (v == null || !validateValue(item, v)) return false;
  mem[key] = v;
  scheduleFlush(key);
  var list = subs[key];
  if (list) {
    for (var i = 0; i < list.length; i++) {
      try { list[i](v); } catch (e) { /* 订阅方异常不阻断写入链 */ }
    }
  }
  return true;
}

function scheduleFlush(key) {
  if (pending[key]) clearTimeout(pending[key]);
  pending[key] = setTimeout(function () { flushKey(key); }, CFG.time.setFlush);
}

function flushKey(key) {
  if (pending[key]) { clearTimeout(pending[key]); pending[key] = null; }
  if (!mem || !Object.prototype.hasOwnProperty.call(mem, key)) return;
  try { rawSet(storeKey(key), JSON.stringify(mem[key])); } catch (e) { }
}

// 强制落盘（面板关闭 / pagehide / 单测）：不依赖墙钟把在途防抖收掉
export function flushSettings() {
  for (var k in pending) if (pending[k]) flushKey(k);
}

// 变更订阅（消费模块用它在设置变化时同步运行态；返回退订函数）
export function onChange(key, fn) {
  if (typeof fn !== 'function') return function () { };
  (subs[key] = subs[key] || []).push(fn);
  return function () {
    var list = subs[key] || [];
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
}

// 关页兜底（模块求值期注册，一行为重）：防抖窗口内关页不丢最后一次改动
try {
  window.addEventListener('pagehide', flushSettings);
} catch (e) { /* 非浏览器环境（单测）无 window.addEventListener，忽略 */ }
