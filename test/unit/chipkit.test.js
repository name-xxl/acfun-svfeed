// chipkit.js 单测（0.9.305 批⑤①）：点击协议「同项短路→摘 on→点亮→回调」node 直采。
// 垫桩与 listtail.test.js 同款最小集（chipkit→ui→cfg→…链在模块级读 window），
// document.createElement 升级为带 classList/children/监听派发的小型假元件事件壳——
// mountChipGroup 只用到 el()/classList/children/appendChild/addEventListener 这几个面。
// 反跑指引：临时把短路 `if (o.isOn(...)) return;` 摘掉 ⇒ 用例 2 红；把「先清后点」拆成
// 只点不清 ⇒ 用例 3 的旧项摘 on 红；cls 分支写死 'acsv-vchip' ⇒ 用例 4 红。
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
function fakeEl(tag) {
  var e = {
    tag: tag, className: '', textContent: '', attrs: {}, children: [], handlers: {},
    parentNode: null,
    appendChild: function (c) { e.children.push(c); c.parentNode = e; return c; },
    addEventListener: function (n, f) { (e.handlers[n] = e.handlers[n] || []).push(f); },
    setAttribute: function (k, v) { e.attrs[k] = String(v); },
    click: function () { (e.handlers.click || []).forEach(function (f) { f(); }); }
  };
  function tokens() { return e.className === '' ? [] : e.className.split(/\s+/); }
  Object.defineProperty(e, 'classList', { value: {
    add: function (t) { if (tokens().indexOf(t) < 0) e.className = (e.className + ' ' + t).trim(); },
    remove: function (t) { e.className = tokens().filter(function (x) { return x !== t; }).join(' '); },
    contains: function (t) { return tokens().indexOf(t) >= 0; }
  } });
  return e;
}
globalThis.document = {
  createElement: function (t) { return fakeEl(t); },
  addEventListener: function () { },
  removeEventListener: function () { },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};

var { mountChipGroup } = await import('../../src/chipkit.js');

function group(o) {
  var state = o.state;
  var picked = [];
  var nodes = mountChipGroup({
    host: o.host, cls: o.cls, items: o.items,
    isOn: function (d) { return state === d; },
    onPick: function (d, i, node) { state = d; picked.push({ d: d, i: i, node: node }); }
  });
  return { nodes: nodes, picked: picked, cur: function () { return state; } };
}

test('挂载：表项→按钮 DOM、isOn 决定初始 on、返回节点数组', () => {
  var host = fakeEl('div');
  var g = group({
    host: host, state: 'a',
    items: [{ label: '甲', data: 'a' }, { label: '乙', data: 'b' }]
  });
  assert.equal(host.children.length, 2);
  assert.equal(host.children[0], g.nodes[0]); // 返回值=本批节点（zone data-board 锚靠它）
  assert.equal(g.nodes[0].className, 'acsv-vchip on'); // 默认 cls + 选中类 'on'
  assert.equal(g.nodes[1].className, 'acsv-vchip');
  assert.equal(g.nodes[0].textContent, '甲');
});

test('同项短路：不摘不点不回话（含回调后再点同项）', () => {
  var host = fakeEl('div');
  var g = group({
    host: host, state: 'a',
    items: [{ label: '甲', data: 'a' }, { label: '乙', data: 'b' }]
  });
  g.nodes[0].click(); // 已选中项：短路
  assert.equal(g.picked.length, 0, '同项点击不得回调');
  assert.equal(g.nodes[1].className, 'acsv-vchip', '短路不得动其它钮的 on');
  g.nodes[1].click(); // 换项：回调进 state
  assert.equal(g.picked.length, 1);
  g.nodes[1].click(); // onPick 已把 state 推到 'b'——再点即同项，短路
  assert.equal(g.picked.length, 1, 'state 变更后同项仍短路');
});

test('换项协议：先全组摘 on、点亮被点项、回调实参 (data, i, node)', () => {
  var host = fakeEl('div');
  var up = { id: 3 }; // zoneChips 式对象 data：判据走引用/字段，回调拿回同一对象
  var g = group({
    host: host, state: null,
    items: [{ label: '甲', data: null }, { label: '丙', data: up }]
  });
  g.nodes[1].click();
  assert.equal(g.nodes[0].className, 'acsv-vchip', '旧选中项必须被摘 on');
  assert.equal(g.nodes[1].className, 'acsv-vchip on', '被点项点亮');
  assert.deepEqual(g.picked, [{ d: up, i: 1, node: g.nodes[1] }], '回调实参三件齐全');
  assert.equal(g.cur(), up);
});

test('皮肤与隔离：cls 覆写（natpanel 段钮 cls:""）；两组 host 互不清 on', () => {
  var h1 = fakeEl('div'); var h2 = fakeEl('div');
  var g1 = group({ host: h1, cls: '', state: 'x', items: [{ label: 'X', data: 'x' }, { label: 'Y', data: 'y' }] });
  var g2 = group({ host: h2, cls: 'acsv-vchip sm', state: 'y', items: [{ label: 'Y2', data: 'y' }] });
  assert.equal(g1.nodes[0].className, 'on'); // cls:'' → 非选中项 className 空（el 不写类）
  assert.equal(g1.nodes[1].className, '');
  assert.equal(g2.nodes[0].className, 'acsv-vchip sm on'); // 'acsv-vchip sm' 小档位皮（zone 子频道/榜期）
  g1.nodes[1].click(); // 组 1 换项——只许清组 1 的 children
  assert.equal(g2.nodes[0].className, 'acsv-vchip sm on', '另一组 on 不得被波及');
});
