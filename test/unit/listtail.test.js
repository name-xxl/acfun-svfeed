// listtail.js：隐藏宿主不派发触底（0.9.236）——等价场景＝我的页四 tab 共用一个滚动体：
// 面板 display:none 时 offsetParent 为 null，滚动可见 tab 不得把隐藏 tab 的 onBottom 打出去。
// Node 直采（favapi.test 同款最小 DOM 垫桩）。摘修复反跑：还原 visible 判据 ⇒ 第一段断言即红。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.document = {
  addEventListener: function () { },
  removeEventListener: function () { },
  createElement: function () {
    return {
      className: '', textContent: '', innerHTML: '', title: '', style: {},
      appendChild: function () { },
      addEventListener: function () { },
      classList: { toggle: function () { }, add: function () { }, remove: function () { } }
    };
  }
};
var { createListTail } = await import('../../src/listtail.js');

function scrollHost() {
  return {
    scrollTop: 1000, clientHeight: 100, scrollHeight: 1000,
    _h: null,
    addEventListener: function (n, f) { if (n === 'scroll') this._h = f; },
    removeEventListener: function (n, f) { if (n === 'scroll' && this._h === f) this._h = null; }
  };
}

test('createListTail：隐藏宿主（offsetParent null）不派发 onBottom；可见时照发；stop 后不再发', () => {
  var calls = 0;
  var root = { isConnected: true, offsetParent: null, appendChild: function () { } }; // display:none 的面板
  var sc = scrollHost();
  var tail = createListTail({
    root: root, scrollEl: sc, pad: 10, backTopAt: 100,
    onBottom: function () { calls++; }
  });
  sc._h(); // 已触底（1000+100 >= 1000-10）但宿主隐藏
  assert.equal(calls, 0, '隐藏宿主不得触发触底');
  root.offsetParent = {}; // 切回该 tab（显示）
  sc._h();
  assert.equal(calls, 1, '可见宿主触底照发');
  tail.stop();
  assert.equal(sc._h, null, 'stop 必须解绑滚动监听');
  assert.equal(calls, 1, 'stop 后不再派发');
});

test('createListTail：root 已断开连接（视图已拆）不派发', () => {
  var calls = 0;
  var root = { isConnected: false, offsetParent: {}, appendChild: function () { } };
  var sc = scrollHost();
  var tail = createListTail({
    root: root, scrollEl: sc, pad: 10, backTopAt: 100,
    onBottom: function () { calls++; }
  });
  sc._h();
  assert.equal(calls, 0);
  tail.stop();
});

test('createListTail：只借回顶（无 onBottom/无状态行）不炸，未触底不回顶点亮', () => {
  var root = { isConnected: true, offsetParent: {}, appendChild: function () { } };
  var sc = scrollHost();
  sc.scrollTop = 0;
  var tail = createListTail({ root: root, scrollEl: sc, status: false, backTopHost: false, backTopAt: 100 });
  sc._h();
  tail.stop();
  assert.ok(true);
});
