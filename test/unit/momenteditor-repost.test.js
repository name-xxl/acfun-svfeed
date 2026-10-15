// momenteditor.repostOf 单测（0.9.243）：源 pi → 引用块/转发 repost 形状。
// 病灶修复钉：moment 分支曾硬写 cover:''，与 panelitem 生产面（pi.repost.cover 透传）不对称——
// 断言「pi.cover 有值则透传」，摘修复（改回 ''）即红。
// 垫桩：momenteditor 的 import 链（ui/cards/overlay/inputbar…）需要最小 window/__ACSV_DEBUG__
//（同 purity.test.js 口径：链上模块级副作用只允许监听/存储触点，垫桩可吸收）
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

var { repostOf } = await import('../../src/momenteditor.js');

test('repostOf：moment 源——cover 透传（0.9.243 修复不对称）/ text+imgs 透传 / 缺省空串', () => {
  var r = repostOf({ ct: 'moment', momentId: 123, text: 'hi', imgs: [{ url: 'u' }], cover: 'https://x/cover.jpg', up: { id: 1 } });
  assert.equal(r.cover, 'https://x/cover.jpg');
  assert.equal(r.ct, 'moment');
  assert.equal(r.id, 123);
  assert.equal(r.text, 'hi');
  assert.deepEqual(r.imgs, [{ url: 'u' }]);
  var r2 = repostOf({ ct: 'moment', momentId: 7 });
  assert.equal(r2.cover, '');
  assert.equal(r2.text, '');
  assert.deepEqual(r2.imgs, []);
});

test('repostOf：video/article 分支形状不变；未知类型与空输入 null', () => {
  var v = repostOf({ ct: 'video', acId: 5, title: 't', cover: 'c', dur: '01:02', views: '3万', up: null });
  assert.equal(v.cover, 'c');
  assert.equal(v.dur, '01:02');
  assert.equal(v.views, '3万');
  assert.equal(v.id, 5);
  var a = repostOf({ ct: 'article', acId: 6, title: 'a', cover: '', views: '', up: null });
  assert.equal(a.ct, 'article');
  assert.equal(a.cover, '');
  assert.equal(repostOf({ ct: 'live' }), null);
  assert.equal(repostOf(null), null);
});
