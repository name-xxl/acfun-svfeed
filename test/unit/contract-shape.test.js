// contract 形状守卫单元测试（0.9.264，P1）：只把 undefined/null 判缺，空值合法；非对象判缺。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;

var { hasShape, isArray } = await import('../../src/contract.js');

test('hasShape：必需字段齐全为真；空串/0/false 不算缺', () => {
  assert.equal(hasShape({ a: '', b: 0, c: false }, ['a', 'b', 'c'], 't'), true);
  assert.equal(hasShape({ a: 1 }, ['a'], 't'), true);
});

test('hasShape：缺字段 / null / 非对象为假且不抛', () => {
  assert.equal(hasShape({ a: 1 }, ['a', 'b'], 't'), false);
  assert.equal(hasShape({ a: null }, ['a'], 't'), false);
  assert.equal(hasShape(null, ['a'], 't'), false);
  assert.equal(hasShape('x', ['a'], 't'), false);
});

test('isArray：数组为真，其余为假且不抛', () => {
  assert.equal(isArray([], 't'), true);
  assert.equal(isArray({ length: 0 }, 't'), false);
  assert.equal(isArray(null, 't'), false);
});
