// devname.js（设备型号美化，0.9.246）单元测试：Node 内置 test 运行器，零依赖。
// 覆盖：Web-IP 两组等值迁移（parseDeviceModelsText 7 项 / findFriendlyName 9 项——以夹具表跑
// 语义，避免钉死上游数据）+ 新增（索引构建、用户层覆盖合并、危险键守卫、真实内置表抽查）。
// 垫桩：devname 的 import 链（devicetab/cfg/settings→cfg）需要最小 window/__ACSV_DEBUG__
//（iploc.test.js 同口径）
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.addEventListener = function () { };
globalThis.removeEventListener = function () { };
// 存储垫片（0.9.250：数据管理组要真读写——importDeviceText 写用户层、reset 清之）
var store = {};
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};

var {
  mergeTab, buildIndexes, lookupIn, parseDeviceModelsText, unpackDeviceTab,
  friendlyOf, deviceCount, exportDevices, importDeviceText, resetUserDevices
} = await import('../../src/devname.js');
var { isSafeKey } = await import('../../src/ui.js');
var { DEVICE_TAB_PACKED, DEVICE_TAB_LEN, DEVICE_TAB_COUNT } = await import('../../src/devicetab.js');
var DEVICE_TAB = unpackDeviceTab(DEVICE_TAB_PACKED, DEVICE_TAB_LEN);

// ---------- parseDeviceModelsText（Web-IP 7 项等值迁移） ----------

test('parseDeviceModelsText：MobileModels 格式', () => {
  assert.deepEqual(parseDeviceModelsText('`RMX3700`: 真我 GT Neo5 SE'), { RMX3700: '真我 GT Neo5 SE' });
});
test('parseDeviceModelsText：一行多个代码', () => {
  assert.deepEqual(parseDeviceModelsText('`ALN-AL00` `ALN-AL80`: HUAWEI Mate 60 Pro'),
    { 'ALN-AL00': 'HUAWEI Mate 60 Pro', 'ALN-AL80': 'HUAWEI Mate 60 Pro' });
});
test('parseDeviceModelsText：Apple gist 冒号格式', () => {
  assert.deepEqual(parseDeviceModelsText('iPhone3,1 : iPhone 4'), { 'iPhone3,1': 'iPhone 4' });
});
test('parseDeviceModelsText：Apple 空格格式', () => {
  assert.deepEqual(parseDeviceModelsText('iPhone3,1 iPhone 4'), { 'iPhone3,1': 'iPhone 4' });
});
test('parseDeviceModelsText：跳过注释与空行', () => {
  assert.deepEqual(parseDeviceModelsText('# 注释\n\n// 斜杠注释\n`RMX3700`: 真我 GT Neo5 SE'),
    { RMX3700: '真我 GT Neo5 SE' });
});
test('parseDeviceModelsText：空输入', () => {
  assert.deepEqual(parseDeviceModelsText(''), {});
});
test('parseDeviceModelsText：混合格式多行', () => {
  assert.deepEqual(parseDeviceModelsText('`V2324A`: vivo X100 Pro\niPhone3,1 : iPhone 4'),
    { V2324A: 'vivo X100 Pro', 'iPhone3,1': 'iPhone 4' });
});

// ---------- findFriendlyName（Web-IP 9 项等值迁移；夹具表跑语义） ----------

test('lookupIn：四级匹配 + 未收录/过短/空值守卫', () => {
  var fx = { 'iPhone3,1': 'iPhone 4', 'iPhone14,5': 'iPhone 13', 'RMX3700': '真我 GT Neo5 SE', 'V2324A': 'vivo X100 Pro' };
  var idx = buildIndexes(fx);
  assert.equal(lookupIn(idx, 'iPhone3,1'), 'iPhone 4');       // 精确
  assert.equal(lookupIn(idx, 'iPhone14,5'), 'iPhone 13');     // 精确
  assert.equal(lookupIn(idx, 'rmx3700'), '真我 GT Neo5 SE');  // 大小写不敏感
  assert.equal(lookupIn(idx, 'V2324B'), 'vivo X100 Pro');     // 去尾字母
  assert.equal(lookupIn(idx, 'V2324AX'), 'vivo X100 Pro');    // 前缀包含
  assert.equal(lookupIn(idx, 'ZZZZ9999X'), null);             // 未收录
  assert.equal(lookupIn(idx, 'ab'), null);                    // 过短
  assert.equal(lookupIn(idx, ''), null);                      // 空值
  assert.equal(lookupIn(idx, null), null);                    // null
});
test('lookupIn：查找缓存记录命中与未命中', () => {
  var idx = buildIndexes({ 'RMX3619': '真我 V30' });
  var cache = new Map();
  assert.equal(lookupIn(idx, 'RMX3619', cache), '真我 V30');
  assert.equal(lookupIn(idx, 'HONOR PGT-AN10', cache), null);
  assert.equal(cache.size, 2);
  assert.equal(cache.get('RMX3619'), '真我 V30');
});

// ---------- 合并与守卫（新增） ----------

test('mergeTab：内置先、用户条覆盖（快照→覆盖层语义）', () => {
  var merged = mergeTab({ A: '甲', B: '乙' }, { B: '乙改', C: '丙' });
  assert.equal(merged.A, '甲');
  assert.equal(merged.B, '乙改');
  assert.equal(merged.C, '丙');
});
test('mergeTab：危险键剔除、非字符串值不收', () => {
  var user = JSON.parse('{"__proto__": "x", "constructor": "y", "D": "丁", "E": 123, "F": ""}');
  var merged = mergeTab({ A: '甲' }, user);
  assert.equal(merged.D, '丁');
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'E'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'F'), false);
  assert.equal(isSafeKey('__proto__'), false);
  assert.equal(isSafeKey('G'), true);
});

// ---------- 内置表解包（0.9.255 数据优化专项） ----------

test('unpackDeviceTab：解包成功 + 全量表 + 压缩串预算', () => {
  assert.ok(DEVICE_TAB && typeof DEVICE_TAB === 'object');
  assert.equal(Object.keys(DEVICE_TAB).length, DEVICE_TAB_COUNT);
  assert.ok(DEVICE_TAB_COUNT >= 4000, 'n=' + DEVICE_TAB_COUNT);
  assert.ok(DEVICE_TAB_PACKED.length < 48 * 1024, 'packed=' + DEVICE_TAB_PACKED.length);
});
test('unpackDeviceTab：截断/长度不符/空值一律 null（不炸）', () => {
  assert.equal(unpackDeviceTab(DEVICE_TAB_PACKED.slice(0, 100), DEVICE_TAB_LEN), null);
  assert.equal(unpackDeviceTab(DEVICE_TAB_PACKED, DEVICE_TAB_LEN + 1), null);
  assert.equal(unpackDeviceTab('', DEVICE_TAB_LEN), null);
  assert.equal(unpackDeviceTab(null, DEVICE_TAB_LEN), null);
});

// ---------- 真实内置表抽查（真机样本；防生成器走样） ----------

test('DEVICE_TAB：真机样本与 Apple 抽查命中、规模 ≥4000', () => {
  assert.equal(DEVICE_TAB['iPhone3,1'], 'iPhone 4');
  assert.equal(DEVICE_TAB['iPhone14,5'], 'iPhone 13');   // harness dev 场景样本
  assert.equal(DEVICE_TAB['24129PN74C'], 'Xiaomi 15');   // 2026-10-15 真机评论样本
  assert.equal(DEVICE_TAB['RMX3619'], '真我 V30');
  assert.equal(DEVICE_TAB['PGT-AN10'], '荣耀 Magic5 Pro'); // 专项前窄表 miss（TAIL 截断），全量补回
  assert.equal(DEVICE_TAB['PHK110'], '一加 Ace 2');       // 机械归一样本（原「一加 Ace 2 国行版 / 原神定制礼盒」）
  assert.equal(DEVICE_TAB['SM-S9280'], 'Galaxy S24 Ultra');
  assert.equal(DEVICE_TAB['NOH-AN00'], 'HUAWEI Mate 40 Pro 5G');
  assert.ok(Object.keys(DEVICE_TAB).length >= 4000, 'n=' + Object.keys(DEVICE_TAB).length);
});
test('DEVICE_TAB：类别过滤不变式（无笔记本/电视泄漏）', () => {
  var names = Object.values(DEVICE_TAB);
  assert.ok(!names.some(function (n) { return /MateBook|MagicBook|MacBook|云电脑|智慧屏|电视/.test(n); }), '泄漏');
  assert.equal(DEVICE_TAB['Nbl-WAQ9HNRP'], undefined); // 荣耀 MagicBook 曾漏进窄表（DROP 按章节名猜的洞）
  assert.equal(DEVICE_TAB['W200DS'], undefined);        // 中兴云电脑（非手机/平板）
});

// ---------- 数据管理（0.9.250，面板 6c） ----------

test('importDeviceText：合并进用户层 + 跳过已存在 + 覆盖语义', () => {
  var r1 = importDeviceText('`ZZZT-99`: 测试机型', true);
  assert.equal(r1.added, 1);
  assert.equal(friendlyOf('ZZZT-99'), '测试机型');
  var r2 = importDeviceText('`ZZZT-99`: 另一名', true); // 已存在 → 跳过
  assert.equal(r2.added, 0);
  assert.equal(r2.skipped, 1);
  assert.equal(friendlyOf('ZZZT-99'), '测试机型');
  var r3 = importDeviceText('`RMX3619`: 覆盖名', true); // 内置已存在 → 跳过（Web-IP 同款：对全表判重）
  assert.equal(r3.skipped, 1);
  assert.equal(friendlyOf('RMX3619'), '真我 V30');
  var r4 = importDeviceText('`RMX3619`: 覆盖名', false); // 不跳过 → 用户层覆盖
  assert.equal(r4.added, 1);
  assert.equal(friendlyOf('RMX3619'), '覆盖名');
});
test('resetUserDevices：清用户层回内置表', () => {
  var n = resetUserDevices();
  assert.ok(n >= 4000, 'n=' + n);
  assert.equal(friendlyOf('RMX3619'), '真我 V30');
  assert.equal(friendlyOf('ZZZT-99'), null); // 用户条已清
});
test('deviceCount/exportDevices：数量与合并全表', () => {
  var c = deviceCount();
  assert.ok(c >= 4000);
  var t = exportDevices();
  assert.equal(t['iPhone3,1'], 'iPhone 4');
  assert.equal(Object.keys(t).length, c);
});
