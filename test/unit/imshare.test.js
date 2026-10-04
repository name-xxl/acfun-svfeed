// imshare.js（私信基建）单元测试：只测与页面/内核无关的纯判据——tracer 崩溃水位扫描
//（0.9.121 修复的核心语义）。环境垫桩按 route/followbadge 惯例。
// 覆盖边界如实登记：单测钉的是水位语义（旧崩溃忽略/新崩溃命中/驱逐补偿）；live 侧
//「旧崩溃不再误诊重建」由该语义保证，发送路径本身需真 SDK，无自动化直测。
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
globalThis.document = {
  addEventListener: function () { },
  removeEventListener: function () { },
  hidden: false,
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { style: {}, setAttribute: function () { }, appendChild: function () { } };
  }
};
// imshare 链：cfg/net/ui/appapi/imgload/immsg/dbg（imdrawer 已于 0.9.114 断）——垫桩不足
// 时按"先怀疑链上新触点、再扩垫桩"纪律补齐，不放宽断言
var { tracerCrashAfter } = await import('../../src/imshare.js');

var CRASH = "TypeError: Cannot read properties of undefined (reading 'context')";
var OK = '信息发送成功';

test('水位前崩溃忽略（0.9.121 修：已治愈旧崩溃不再误诊重建）', () => {
  assert.equal(tracerCrashAfter([CRASH], 0, 1), false);
  assert.equal(tracerCrashAfter([OK, CRASH], 0, 2), false);
});

test('水位后崩溃命中（第一现场仍要能认出真病）', () => {
  assert.equal(tracerCrashAfter([OK, CRASH], 0, 1), true);
  assert.equal(tracerCrashAfter([CRASH], 0, 0), true);
});

test('驱逐补偿：按累计写入数比对（drop 参与绝对序号）', () => {
  // 缓冲已驱逐 3 行（累计写入 8、现存 5），水位=5 → 只看绝对 5/6/7 三行（下标 2/3/4）
  assert.equal(tracerCrashAfter([CRASH, OK, OK, OK, OK], 3, 5), false); // 绝对 3 < 水位：忽略
  assert.equal(tracerCrashAfter([OK, OK, CRASH, OK, OK], 3, 5), true);  // 绝对 5 ≥ 水位：命中
});

test('无崩溃/空缓冲 false；脏输入容错', () => {
  assert.equal(tracerCrashAfter([OK, OK], 0, 0), false);
  assert.equal(tracerCrashAfter([], 0, 0), false);
  assert.equal(tracerCrashAfter(null, 0, 0), false);
  assert.equal(tracerCrashAfter([OK], undefined, undefined), false);
});
