// settings.js（设置共享层）单元测试：Node 内置 test 运行器，零依赖。
// 分两组：① 纯函数组（schema 不变量 / coerceValue / fromLegacy / clampNumber / defaultsSnapshot）
// ——按房子惯例喂字符串即可；② 存储编排组（读三态 / 收养 / 防抖落盘 / 订阅）——用 10 行
// localStorage 垫片直测。垫片值得存在：本模块初稿有过「mem 预填默认 → hasOwnProperty 恒真 →
// 存储永远读不到」的 bug（getSetting 首行注释在册），纯函数组抓不到这一类，编排组专治。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;         // cfg→dbg 依赖链模块级求值需要（data.test.js 同惯例）
globalThis.__ACSV_DEBUG__ = false;
// 存储垫片（必须在调用前装好；模块只在函数体内碰 localStorage）
var store = {};
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};

var {
  SCHEMA, storeKey, findItem, panelItems, validateValue, clampNumber,
  coerceValue, fromLegacy, defaultsSnapshot
} = await import('../../src/settings.js');

function reset() { store = {}; }

// ---------- ① 纯函数组 ----------

test('SCHEMA 不变量：key 唯一、类型合法、def 合规、默认值引用 CFG', () => {
  var seen = {};
  var TYPES = ['bool', 'select', 'number', 'text'];
  SCHEMA.forEach(function (it) {
    assert.ok(!seen[it.key], 'key 重复：' + it.key);
    seen[it.key] = 1;
    assert.ok(TYPES.indexOf(it.type) >= 0, it.key + ' 类型非法：' + it.type);
    if (it.type === 'select') {
      assert.ok(Array.isArray(it.options) && it.options.length > 1, it.key + ' select 缺 options');
      assert.ok(it.options.some(function (o) { return o.v === it.def; }), it.key + ' 的 def 不在 options 内');
    }
    if (it.type === 'number') {
      assert.equal(typeof it.def, 'number');
      assert.ok(it.def >= it.min && it.def <= it.max, it.key + ' 的 def 越界');
    }
    assert.ok(validateValue(it, it.def), it.key + ' 的 def 过不了自校验');
  });
});

test('SCHEMA 不变量：面板项必须有 label/group，且类型在皮肤实现集内（bool|select|number）', () => {
  // 皮肤只实现了这三种控件；塞一个 panel:true 的 text 项会静默无控件——此断言把它变成红灯
  var IMPL = ['bool', 'select', 'number'];
  panelItems().forEach(function (it) {
    assert.ok(it.label, it.key + ' 面板项缺 label');
    assert.ok(it.group, it.key + ' 面板项缺 group');
    assert.ok(IMPL.indexOf(it.type) >= 0, it.key + ' 面板类型未实现：' + it.type);
  });
  assert.ok(panelItems().length >= 5, '首批面板项不应少于 5');
});

test('SCHEMA 不变量：legacy 只对内部/收编项声明，且键名非空', () => {
  SCHEMA.forEach(function (it) {
    if (it.legacy == null) return;
    assert.equal(typeof it.legacy, 'string');
    assert.ok(it.legacy.length > 0);
  });
  // 收编清单（docs §7）：六项老偏好一个不少
  var legacyKeys = SCHEMA.filter(function (it) { return it.legacy; })
    .map(function (it) { return it.key; }).sort();
  assert.deepEqual(legacyKeys, ['buf', 'codec', 'dmDefault', 'quality', 'sound', 'source'].sort());
});

test('storeKey：命名空间逐键（路线图 1.1 的 acsv.s.*）', () => {
  assert.equal(storeKey('codec'), 'acsv.s.codec');
  assert.equal(storeKey('seekStep'), 'acsv.s.seekStep');
});

test('defaultsSnapshot：覆盖全 schema 且与 def 逐一相等', () => {
  var snap = defaultsSnapshot(SCHEMA);
  assert.equal(Object.keys(snap).length, SCHEMA.length);
  SCHEMA.forEach(function (it) { assert.deepEqual(snap[it.key], it.def); });
});

test('coerceValue：bool 只认 JSON 布尔（老字面量留给 fromLegacy）', () => {
  var item = findItem('dmDefault');
  assert.equal(coerceValue(item, 'true'), true);
  assert.equal(coerceValue(item, 'false'), false);
  assert.equal(coerceValue(item, '1'), null);   // 老形态不归它管
  assert.equal(coerceValue(item, 'yes'), null);
  assert.equal(coerceValue(item, null), null);
});

test('coerceValue：select 值域校验、number 越界钳位、text 空串=无记忆', () => {
  assert.equal(coerceValue(findItem('buf'), '"max"'), 'max');
  assert.equal(coerceValue(findItem('buf'), '"bogus"'), null);
  assert.equal(coerceValue(findItem('seekStep'), '15'), 15);
  assert.equal(coerceValue(findItem('seekStep'), '99'), 30);   // 钳到 max
  assert.equal(coerceValue(findItem('seekStep'), '"15"'), null); // 类型不符
  assert.equal(coerceValue(findItem('quality'), '"1080P"'), '1080P');
  assert.equal(coerceValue(findItem('quality'), '""'), '');     // 空串合法=无记忆（与 def 自洽）
  assert.equal(coerceValue(findItem('quality'), '{oops'), null); // 坏 JSON
});

test('fromLegacy：老键真实形态（docs §7 真值表）', () => {
  // bool：'1'/'0'，且 sound 的关态是**空串**（playback 写 '' 不是删键——空串就是 false）
  assert.equal(fromLegacy(findItem('dmDefault'), '1'), true);
  assert.equal(fromLegacy(findItem('dmDefault'), '0'), false);
  assert.equal(fromLegacy(findItem('sound'), ''), false);
  assert.equal(fromLegacy(findItem('sound'), '1'), true);
  assert.equal(fromLegacy(findItem('dmDefault'), 'garbage'), null);
  // select / number / text
  assert.equal(fromLegacy(findItem('codec'), 'hevc'), 'hevc');
  assert.equal(fromLegacy(findItem('codec'), 'nope'), null);
  assert.equal(fromLegacy(findItem('seekStep'), '15'), 15);
  assert.equal(fromLegacy(findItem('quality'), '1080P'), '1080P');
  assert.equal(fromLegacy(findItem('quality'), ''), '');
  assert.equal(fromLegacy(findItem('source'), 'home'), 'home');
  assert.equal(fromLegacy(findItem('buf'), null), null);
});

test('clampNumber：边界与脏输入', () => {
  var item = findItem('seekStep');
  assert.equal(clampNumber(item, 1), 5);
  assert.equal(clampNumber(item, 99), 30);
  assert.equal(clampNumber(item, 15), 15);
  assert.equal(clampNumber(item, NaN), null);
});

// ---------- ② 存储编排组（垫片直测） ----------
// 每个用例取一份**全新模块实例**：mem/pending 是模块级会话状态，跨用例复用会互相污染
// （首跑实证：前一个用例缓存的 mem 让后一个用例的收养路径整个不执行）。ESM 按 specifier
// 缓存，带 query 的同一路径是独立实例——这也正模拟了「每次页面加载从零解析」的真实语义。
var gen = 0;
async function fresh() {
  gen++;
  delete globalThis.window.__acsSettings_;
  return await import('../../src/settings.js?t=' + gen);
}

test('getSetting：无存储 → 默认值（且不因读默认而写键）', async () => {
  var S = await fresh();
  reset();
  assert.equal(S.getSetting('codec'), S.findItem('codec').def);
  assert.equal(S.getSetting('seekStep'), S.findItem('seekStep').def);
  assert.equal(S.getSetting('sound'), false);
  S.flushSettings();
  assert.equal(Object.keys(store).length, 0, '读默认不应落盘');
});

test('getSetting：老键收养一次（值不丢、新键落盘、老键不删）', async () => {
  var S = await fresh();
  reset();
  store['acsv-codec'] = 'hevc';                 // 老键（用户历史偏好）
  assert.equal(S.getSetting('codec'), 'hevc');  // 收养
  S.flushSettings();
  assert.equal(store['acsv.s.codec'], '"hevc"', '收养须落新键');
  assert.equal(store['acsv-codec'], 'hevc', '老键不删（回滚友好）');
});

test('getSetting：新键在场时老键不再是来源', async () => {
  var S = await fresh();
  reset();
  store['acsv.s.codec'] = '"auto"';
  store['acsv-codec'] = 'hevc';
  assert.equal(S.getSetting('codec'), 'auto');
  S.flushSettings();
  assert.equal(store['acsv.s.codec'], '"auto"', '不被老键改写');
});

test('getSetting：非法存储值落默认；老键非法同样落默认', async () => {
  var S = await fresh();
  reset();
  store['acsv.s.seekStep'] = '"abc"';
  assert.equal(S.getSetting('seekStep'), S.findItem('seekStep').def);
  var S2 = await fresh();
  reset();
  store['acsv-buf'] = 'bogus';
  assert.equal(S2.getSetting('buf'), S2.findItem('buf').def);
  assert.equal(store['acsv.s.buf'], undefined, '非法老键不收养、不落盘');
});

test('setSetting：校验不过拒绝写入；合法值走防抖、flushSettings 落盘', async () => {
  var S = await fresh();
  reset();
  assert.equal(S.setSetting('buf', 'nope'), false);
  assert.equal(S.setSetting('seekStep', 'x'), false);
  assert.equal(S.setSetting('buf', 'max'), true);
  assert.equal(store['acsv.s.buf'], undefined, '防抖窗内不落盘');
  S.flushSettings();
  assert.equal(store['acsv.s.buf'], '"max"');
  // number 越界：内存即时钳位（面板步进器同源），落盘即钳后值
  assert.equal(S.setSetting('seekStep', 99), true);
  assert.equal(S.getSetting('seekStep'), 30);
  S.flushSettings();
  assert.equal(store['acsv.s.seekStep'], '30');
});

test('onChange：变更即回调（含钳后值）；退订后不再触发；异常订阅方不阻断', async () => {
  var S = await fresh();
  reset();
  var seen = [];
  var off = S.onChange('seekStep', function (v) { seen.push(v); });
  S.onChange('seekStep', function () { throw new Error('boom'); }); // 坏订阅方
  assert.equal(S.setSetting('seekStep', 99), true);
  assert.deepEqual(seen, [30]);
  off();
  assert.equal(S.setSetting('seekStep', 10), true);
  assert.deepEqual(seen, [30], '退订后不应再收到');
});

test('getSetting：未登记 key 返回 undefined（调用方拼错不静默）', async () => {
  var S = await fresh();
  assert.equal(S.getSetting('nope'), undefined);
  assert.equal(S.findItem('nope'), null);
});
