// state.js 哨兵契约单测（0.9.78）：播放层 idx 哨兵与读出函数的边界。
// 立测背景：0.9.74 起「层内 slide 先问 isOvlSlide 再回查 FeedStore」只活在注释里，
// 0.9.77 评审实锤 player 连播判定靠"哨兵 -1 撞不上 current"的巧合正确——把判据函数化后，
// 边界在这里钉死。state.js 零 import、模块级零副作用（DOM 只在函数里用），可直接进 node 单测
import { test } from 'node:test';
import assert from 'node:assert/strict';
var { OVL_IDX, isOvlSlide, ownerIdxOf } = await import('../../src/state.js');

function slide(attrs) { return { dataset: attrs }; }

test('OVL_IDX 哨兵值：-1（竖刷 idx 从 0 起，负数天然不可能撞上）', () => {
  assert.equal(OVL_IDX, -1);
});

test('isOvlSlide：只认 dataset.ovl === "1"（字符串）；缺 dataset/其它值/空值一律 false', () => {
  assert.equal(isOvlSlide(slide({ ovl: '1' })), true);
  assert.equal(isOvlSlide(slide({ ovl: '1', idx: '5' })), true); // 带 idx 也是层内
  assert.equal(isOvlSlide(slide({ ovl: '0' })), false);
  assert.equal(isOvlSlide(slide({ ovl: 1 })), false); // 数字不算：dataset 恒字符串，防手造对象混入
  assert.equal(isOvlSlide(slide({ idx: '5' })), false);
  assert.equal(isOvlSlide({}), false); // 无 dataset
  assert.equal(isOvlSlide(null), false);
  assert.equal(isOvlSlide(undefined), false);
});

test('ownerIdxOf：层内优先（恒哨兵，不被 idx 覆盖）；普通 slide 归数；无 idx 归 NaN', () => {
  assert.equal(ownerIdxOf(slide({ ovl: '1', idx: '5' })), OVL_IDX); // 层内优先先于 idx
  assert.equal(ownerIdxOf(slide({ ovl: '1' })), OVL_IDX);
  assert.equal(ownerIdxOf(slide({ idx: '5' })), 5);
  assert.equal(ownerIdxOf(slide({ idx: '0' })), 0);
  assert.ok(Number.isNaN(ownerIdxOf(slide({})))); // 无 idx：调用方据 NaN 判空/放弃
  assert.ok(Number.isNaN(ownerIdxOf(null)));
});
