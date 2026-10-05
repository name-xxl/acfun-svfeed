// mypage.js 资料卡契约单元测试（0.9.160 meCardOf 自 data.js 就地收编，用例逐字保持）：
// meCardOf（0.9.69 我的页头部契约；docs/api-research.md §4.4 实测字段）——缺省不伪造。
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
var { meCardOf } = await import('../../src/mypage.js');

test('meCardOf：按 uid 取条目，字段逐个落位（含签名 <br> 折空格）', () => {
  var j = { result: 0, users: [
    { id: 7, name: '别人', headUrl: 'x' },
    { id: 42, name: '我', headUrl: 'https://img.example/a.jpg', signature: '第一行<br/>第二行',
      contentCount: 12, following: 34, followed: 56 }
  ] };
  var me = meCardOf(j, '42');
  assert.equal(me.uid, 42);
  assert.equal(me.name, '我');
  assert.equal(me.avatar, 'https://img.example/a.jpg');
  assert.equal(me.sign, '第一行 第二行');
  assert.equal(me.contrib, 12);
  assert.equal(me.follow, 34);
  assert.equal(me.fans, 56);
});

test('meCardOf：缺省字段一律 null（不伪造），uid 不在回包时退第一条', () => {
  var me = meCardOf({ result: 0, users: [{ id: 9, name: '只有名字' }] }, '42');
  assert.equal(me.uid, 9);
  assert.equal(me.contrib, null);
  assert.equal(me.follow, null);
  assert.equal(me.fans, null);
  assert.equal(me.sign, '');
  assert.equal(me.avatar, '');
});

test('meCardOf：失败/空回包/无 users 一律 null（调用方据此不渲染头部）', () => {
  assert.equal(meCardOf({ result: 1 }, '42'), null);
  assert.equal(meCardOf({ result: 0, users: [] }, '42'), null);
  assert.equal(meCardOf(null, '42'), null);
  assert.equal(meCardOf({ result: 0, users: [{ name: '无id' }] }, '42'), null);
});

// ---------- 图片字段归一（0.9.76）：http 老条目在 https 页面会被混合内容拦成裂图 ----------
test('meCardOf：头像 http:// 与协议相对 // 一律升 https（原 panelItem/meCardOf 混合用例的 meCardOf 半，0.9.160 拆分随迁）', () => {
  var card = meCardOf({ result: 0, users: [{ id: 7, name: 'U', headUrl: 'http://imgs.aixifan.com/h.jpg' }] }, '7');
  assert.equal(card.avatar, 'https://imgs.aixifan.com/h.jpg');
});
