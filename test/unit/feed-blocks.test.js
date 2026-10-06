// appapi.cardsOf 推荐流聚合块解析单测（0.9.189 换源随附）：单列精选 selection/feed/singleColumn
// 与旧 selection/feed **同形**（body[{schema,bodyContents[]}]）——本函数是换源后唯一真正"读回包"
// 的纯逻辑，钉住两条不变量：carousels 轮播块丢弃、只收 resourceType===2 且带 href 的视频卡。
// 样本形状取自 2026-10-06 真机复验（首屏 monkey_mountain 块 9 条/8 视频，pcursor="2"）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { cardsOf } = await import('../../src/appapi.js');

test('cardsOf：carousels 轮播块丢弃、非 resourceType=2 丢弃、无 href 丢弃（两源同形）', () => {
  var body = [
    { schema: 'carousels', bodyContents: [{ href: '999', resourceType: 2 }] }, // 轮播块整块丢
    {
      schema: 'monkey_mountain', bodyContents: [
        { href: '48375523', resourceType: 2, title: 'A' }, // 收
        { href: '48375524', resourceType: 3, title: '文章' }, // 非视频丢
        { resourceType: 2, title: '无 href' }, // 无 href 丢
        { href: '', resourceType: 2 }, // 空 href 丢
        { href: '48375525', resourceType: 2, title: 'B' } // 收
      ]
    }
  ];
  var ids = cardsOf(body).map(function (c) { return c.href; });
  assert.deepEqual(ids, ['48375523', '48375525']);
});

test('cardsOf：脏输入不抛——body 非数组 / 块空 / bodyContents 缺失一律安全', () => {
  assert.deepEqual(cardsOf(null), []);
  assert.deepEqual(cardsOf(undefined), []);
  assert.deepEqual(cardsOf({}), []); // 非数组
  assert.deepEqual(cardsOf([null, undefined, {}]), []); // 空块 / 无 schema
  assert.deepEqual(cardsOf([{ schema: 'monkey_mountain' }]), []); // bodyContents 缺失
});
