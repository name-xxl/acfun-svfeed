// nativeip.js（原生页评论 IP+设备，0.9.248）单元测试：Node 内置 test 运行器，零依赖。
// 覆盖：Web-IP 24 项等值迁移（parseUidFromHref 7 / extractCommentList 4 / isCommentUrl 7 /
// extractUidFromComment 6）——Phase 5 有意停靠、随 6.1 激活；新增：非数组回包容错。
// extractUidFromComment 的 DOM 用最小桩（querySelector 返指定键对象）——Web-IP 用 FakeDOM 同义。
// 垫桩：nativeip 的 import 链（iploc/devname/styles/cfg/dbg）需要最小 window/__ACSV_DEBUG__
//（iploc.test.js 同口径）
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

var { isCommentUrl, extractCommentList, parseUidFromHref, extractUidFromComment } =
  await import('../../src/nativeip.js');

// ---------- isCommentUrl（Web-IP 7 项等值迁移） ----------

test('isCommentUrl：匹配 /comment/list', () => {
  assert.equal(isCommentUrl('https://www.acfun.cn/rest/pc-direct/comment/list?postId=123'), true);
});
test('isCommentUrl：匹配 /comment/sublist', () => {
  assert.equal(isCommentUrl('/rest/pc-direct/comment/sublist?rootCommentId=1'), true);
});
test('isCommentUrl：匹配 /comment/subComment', () => {
  assert.equal(isCommentUrl('/comment/subComment?foo=bar'), true);
});
test('isCommentUrl：匹配 /comment/reply', () => {
  assert.equal(isCommentUrl('/comment/reply'), true);
});
test('isCommentUrl：不匹配无关 URL', () => {
  assert.equal(isCommentUrl('https://www.acfun.cn/v/ac12345'), false);
});
test('isCommentUrl：不匹配空字符串', () => {
  assert.equal(isCommentUrl(''), false);
});
test('isCommentUrl：不匹配部分关键字', () => {
  assert.equal(isCommentUrl('https://example.com/comment'), false);
});
test('isCommentUrl：null/undefined 容错', () => {
  assert.equal(isCommentUrl(null), false);
  assert.equal(isCommentUrl(undefined), false);
  assert.equal(isCommentUrl({ url: '/comment/list' }), false); // 非字符串只 String() 化，不炸
});

// ---------- extractCommentList（Web-IP 4 项等值迁移 + 容错） ----------

test('extractCommentList：rootComments + subComments', () => {
  assert.equal(extractCommentList({
    rootComments: [{ commentId: 1 }, { commentId: 2 }],
    subComments: [{ commentId: 3 }]
  }).length, 3);
});
test('extractCommentList：rootComments + comments', () => {
  assert.equal(extractCommentList({
    rootComments: [{ commentId: 1 }],
    comments: [{ commentId: 2 }, { commentId: 3 }]
  }).length, 3);
});
test('extractCommentList：空数据', () => {
  assert.equal(extractCommentList({}).length, 0);
});
test('extractCommentList：undefined 输入', () => {
  assert.equal(extractCommentList(undefined).length, 0);
});
test('extractCommentList：非数组字段容错（显式丢弃，不炸）', () => {
  assert.equal(extractCommentList({ rootComments: { a: 1 }, subComments: 'x' }).length, 0);
  assert.equal(extractCommentList({ rootComments: null, comments: [{ commentId: 9 }] }).length, 1);
  assert.equal(extractCommentList(null).length, 0);
});

// ---------- parseUidFromHref（Web-IP 7 项等值迁移） ----------

test('parseUidFromHref：普通用户链接', () => {
  assert.equal(parseUidFromHref('/u/12345'), 12345);
});
test('parseUidFromHref：直播链接', () => {
  assert.equal(parseUidFromHref('/live/67890'), 67890);
});
test('parseUidFromHref：完整 URL', () => {
  assert.equal(parseUidFromHref('https://www.acfun.cn/u/999'), 999);
});
test('parseUidFromHref：空字符串', () => {
  assert.equal(parseUidFromHref(''), null);
});
test('parseUidFromHref：null', () => {
  assert.equal(parseUidFromHref(null), null);
});
test('parseUidFromHref：无关链接', () => {
  assert.equal(parseUidFromHref('/v/ac12345'), null);
});
test('parseUidFromHref：带路径的用户链接', () => {
  assert.equal(parseUidFromHref('/u/100/follow'), 100);
});

// ---------- extractUidFromComment（Web-IP 6 项等值迁移，DOM 用最小桩） ----------

function fakeEl(map) {
  return {
    querySelector: function (s) {
      return Object.prototype.hasOwnProperty.call(map, s) ? map[s] : null;
    }
  };
}

test('extractUidFromComment：默认模式 data-userid', () => {
  var el = fakeEl({ 'a[data-userid]': { dataset: { userid: '42' } } });
  assert.equal(extractUidFromComment(el), 42);
});
test('extractUidFromComment：a.name data-uid（盖楼链保险档）', () => {
  var el = fakeEl({ 'a[data-userid]': null, 'a.name[data-uid]': { dataset: { uid: '88' } } });
  assert.equal(extractUidFromComment(el), 88);
});
test('extractUidFromComment：个人主页链接 /u/', () => {
  var el = fakeEl({ 'a[data-userid]': null, 'a.name[data-uid]': null, 'a[href*="/u/"]': { href: '/u/777' } });
  assert.equal(extractUidFromComment(el), 777);
});
test('extractUidFromComment：默认模式头像 src', () => {
  var el = fakeEl({
    'a[data-userid]': null, 'a.name[data-uid]': null, 'a[href*="/u/"]': null,
    'img.avatar': { src: 'https://cdn.acfun.cn/newUpload/567_avatar.jpg' }
  });
  assert.equal(extractUidFromComment(el), 567);
});
test('extractUidFromComment：盖楼头像 src', () => {
  var el = fakeEl({
    'a[data-userid]': null, 'a.name[data-uid]': null, 'a[href*="/u/"]': null, 'img.avatar': null,
    'img.fc-avatar': { src: 'https://cdn.acfun.cn/u/321' }
  });
  assert.equal(extractUidFromComment(el), 321);
});
test('extractUidFromComment：无法提取', () => {
  assert.equal(extractUidFromComment(fakeEl({})), null);
});
