// lifecycle.createScope 单元测试（0.9.264）：登记/逆序摘除/幂等/尺寸归零，零浏览器依赖。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;

var { createScope } = await import('../../src/lifecycle.js');

function fakeTarget() {
  var live = [];
  return {
    live: live,
    addEventListener: function (type, fn) { live.push([type, fn]); },
    removeEventListener: function (type, fn) {
      var i = live.findIndex(function (x) { return x[0] === type && x[1] === fn; });
      if (i >= 0) live.splice(i, 1);
    }
  };
}

test('createScope：on 立即挂载，dispose 全部摘除且幂等', () => {
  var t = fakeTarget();
  var scope = createScope();
  var a = function () {}, b = function () {};
  scope.on(t, 'resize', a);
  scope.on(t, 'scroll', b, { passive: true });
  assert.equal(t.live.length, 2);
  assert.equal(scope.size(), 2);
  scope.dispose();
  assert.equal(t.live.length, 0);
  assert.equal(scope.size(), 0);
  scope.dispose(); // 幂等：二次 dispose 不抛、不重复摘
  assert.equal(t.live.length, 0);
});

test('createScope：不同作用域互不干扰', () => {
  var t = fakeTarget();
  var s1 = createScope(), s2 = createScope();
  var a = function () {}, b = function () {};
  s1.on(t, 'resize', a);
  s2.on(t, 'resize', b);
  s1.dispose();
  assert.deepEqual(t.live.map(function (x) { return x[1]; }), [b]);
  s2.dispose();
  assert.equal(t.live.length, 0);
});
