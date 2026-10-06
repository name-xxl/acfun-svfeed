// dmcanvas.js mode 归一单元测试（0.9.194）：4=底部/5=顶部/**6=逆向滚动** 保留，其余兜底滚动 1。
// 6 的存在来自真机取样实证（ac17784502 等）；此前被错画成普通滚动（方向反）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { normMode } = await import('../../src/dmcanvas.js');

test('normMode：4/5/6 保留；其余（含 7/8 高级弹幕编码、undefined、字符串）兜底 1', () => {
  assert.equal(normMode(1), 1);
  assert.equal(normMode(4), 4);
  assert.equal(normMode(5), 5);
  assert.equal(normMode(6), 6); // 逆向滚动：0.9.194 前被错画成普通滚动
  assert.equal(normMode(7), 1); // 高级弹幕编码：画布未支持 → 兜底滚动（不是本批目标）
  assert.equal(normMode(8), 1);
  assert.equal(normMode(undefined), 1);
  assert.equal(normMode('5'), 1); // 不认字符串（映射层已 Number 归一）
});
