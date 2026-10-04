// report.js 分享上报参数单元测试（0.9.145 真机抓包对齐的机器化）：
// 官方口径（2026-10-04 内置浏览器登录态实测，/v/ac26640967 复制链接 + 微博两采样）：
// weblog.sendImmediately('CLICK', {action:'CHOOSE_SHARE_PLATFORM', params:{…}})；
// 这里钉**参数映射**（不拉网络）：videoId→atom_id/content_id、item.id→ac_id/parent_content_id、
// 恒定件（album_id/resourceType/cont_type/content_type/content_episode/share_type）、
// share_id=登录 uid、to_platform 透传；非视频/未解析条目一律 null（宁可空白不可编造）。
// 环境垫桩按 followbadge.test.js 惯例（report.js 链上有 window/document/存储触点）。
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
  cookie: 'auth_key=42_deadbeef',
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { style: {}, setAttribute: function () { }, appendChild: function () { }, addEventListener: function () { } };
  }
};

var { buildShareParams } = await import('../../src/report.js');

var VIDEO = { id: 26640967, videoId: 22289387, title: '呵，谁说我不会跳提线木偶' };

test('视频条目：官方同形参数（两采样逐字对齐）', () => {
  var p = buildShareParams(VIDEO, 'COPY_LINK', 'req-1', 'grp-1');
  assert.deepEqual(p, {
    req_id: 'req-1',
    group_id: 'grp-1',
    atom_id: '22289387',
    ac_id: '26640967',
    album_id: '0',
    resourceType: 'video',
    cont_type: 'douga_atom',
    content_type: 'douga_atom',
    content_id: '22289387',
    parent_content_id: '26640967',
    content_episode: 1,
    title: '呵，谁说我不会跳提线木偶',
    share_id: '42', // selfUid：auth_key 前缀
    share_type: 'link',
    to_platform: 'COPY_LINK'
  });
});

test('to_platform 透传（WEIBO/IM 同形，只有该字段不同）', () => {
  var a = buildShareParams(VIDEO, 'COPY_LINK');
  var b = buildShareParams(VIDEO, 'WEIBO');
  var c = buildShareParams(VIDEO, 'IM'); // 自创枚举（私信分享）：形状不变
  ['COPY_LINK', 'WEIBO', 'IM'].forEach((k, i) => assert.equal([a, b, c][i].to_platform, k));
  assert.equal(a.content_type, b.content_type);
  assert.equal(b.share_type, 'link');
});

test('非视频/未解析条目一律 null（动态无官方通道、拿 acId 冒 atom_id 是假数据）', () => {
  assert.equal(buildShareParams({ id: 5104362, title: '动态' }, 'COPY_LINK'), null); // 无 videoId
  assert.equal(buildShareParams({ videoId: 22289387 }, 'COPY_LINK'), null);           // 无 acId
  assert.equal(buildShareParams(null, 'COPY_LINK'), null);
  assert.equal(buildShareParams(VIDEO, ''), null);                                    // 无平台
});

test('缺 req/group id 不伪造（undefined 原样带出，与 reportLeave 同纪律）', () => {
  var p = buildShareParams(VIDEO, 'COPY_LINK');
  assert.equal(p.req_id, undefined);
  assert.equal(p.group_id, undefined);
});
