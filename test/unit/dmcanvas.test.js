// dmcanvas.js mode 归一单元测试（0.9.194）：4=底部/5=顶部/**6=逆向滚动** 保留，其余兜底滚动 1。
// 6 的存在来自真机取样实证（ac17784502 等）；此前被错画成普通滚动（方向反）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { normMode, mergeDanmaku } = await import('../../src/dmcanvas.js');

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

// 合并重复弹幕（0.9.201，照原生「合并重复弹幕」默认开）：同文本在窗口内只留第一条
test('mergeDanmaku：同文本窗口内去重、超窗保留、异文不受影响；脏输入安全', () => {
  var list = [
    { at: 0, text: 'a' },
    { at: 500, text: 'a' },    // 窗口内重复 → 丢
    { at: 600, text: 'b' },    // 异文 → 留
    { at: 2000, text: 'a' },   // 距上一条 a 已超 1500 → 留
    { at: 2100, text: 'a' }    // 又进窗口 → 丢
  ];
  assert.deepEqual(mergeDanmaku(list, 1500).map(function (x) { return x.at + ':' + x.text; }),
    ['0:a', '600:b', '2000:a']);
  assert.deepEqual(mergeDanmaku([], 1500), []);
  assert.deepEqual(mergeDanmaku(null, 1500), []);
  assert.deepEqual(mergeDanmaku([null, { at: 1, text: 'x' }], 1500).length, 1); // 空条目跳过
  assert.deepEqual(mergeDanmaku([{ at: 1, text: '' }], 1500).length, 1); // 空文本不参与去重（仍保留）
});
