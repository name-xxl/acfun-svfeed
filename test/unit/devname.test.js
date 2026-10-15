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
globalThis.localStorage = {
  getItem: function () { return null; },
  setItem: function () { },
  removeItem: function () { }
};

var {
  isSafeKey, mergeTab, buildIndexes, lookupIn, parseDeviceModelsText
} = await import('../../src/devname.js');
var { DEVICE_TAB } = await import('../../src/devicetab.js');

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

// ---------- 真实内置表抽查（真机样本；防生成器走样） ----------

test('DEVICE_TAB：真机样本与 Apple 抽查命中、规模 ≥900', () => {
  assert.equal(DEVICE_TAB['iPhone3,1'], 'iPhone 4');
  assert.equal(DEVICE_TAB['24129PN74C'], 'Xiaomi 15');   // 2026-10-15 真机评论样本
  assert.equal(DEVICE_TAB['RMX3619'], '真我 V30');
  assert.ok(Object.keys(DEVICE_TAB).length >= 900, 'n=' + Object.keys(DEVICE_TAB).length);
});
