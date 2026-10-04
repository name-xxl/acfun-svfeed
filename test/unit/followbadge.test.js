// followbadge.js（关注未读徽标）单元测试：退避纯函数序列钉死（roadmap 4.3 验收「轮询退避
// 单测」）。环境垫桩按 route.test.js 惯例（链上模块级事件监听/存储触点，Node 下垫 no-op）；
// 0.9.115 断 feedstore↔player 后本链不再经过 player——其顶层零副作用由 purity.test 显式钉住
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

var fb = await import('../../src/followbadge.js');
var START = 60000, MAX = 600000;

test('退避序列：60s 起步逐次翻倍封顶 10min（roadmap 4.3 措辞的机器化）', () => {
  var seq = [];
  var prev = 0;
  for (var i = 0; i < 6; i++) {
    prev = fb.nextBadgeInterval(prev, false, START, MAX);
    seq.push(prev);
  }
  assert.deepEqual(seq, [60000, 120000, 240000, 480000, 600000, 600000]);
});

test('发现新内容即刻回落基准（不沿用当前退避档）', () => {
  assert.equal(fb.nextBadgeInterval(480000, true, START, MAX), 60000);
  assert.equal(fb.nextBadgeInterval(0, true, START, MAX), 60000); // 首查即发现同样落基准
});

test('prev=0 首查（未发现）落基准，第二次才翻倍', () => {
  assert.equal(fb.nextBadgeInterval(0, false, START, MAX), 60000);
});

test('脏输入：start/max 非正数回 CFG 默认；事件参数语义不受影响', () => {
  assert.equal(fb.nextBadgeInterval(0, true, 0, 0), 60000);
  assert.equal(fb.nextBadgeInterval(0, false, -5, null), 60000);
  assert.equal(fb.nextBadgeInterval(60000, false, -5, null), 120000);
  assert.equal(fb.nextBadgeInterval(0, false, 30000, 90000), 30000); // 注入自定义档（harness 用）
  assert.equal(fb.nextBadgeInterval(90000, false, 30000, 90000), 90000); // 封顶在自定义 max
});
