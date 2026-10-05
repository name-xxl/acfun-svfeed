// channelapi.js 单元测试（0.9.169）：频道树规整 channelTreeOf（非视频域剔除）/
// 分区流页规整 channelPageOf（拆包、杂质本地复核滤、终页收口）——纯函数直采，零网络。
// 端点实测口径 docs/api-research.md §6.7（2026-10-05）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { channelTreeOf, channelPageOf } = await import('../../src/channelapi.js');

test('channelTreeOf：剔文章域（channelType=1）与 AC正义，保服务端树序', () => {
  var tree = channelTreeOf({
    result: 0,
    channels: [
      { channelId: '1', name: '动画', channelType: 2, children: [] },
      { channelId: '59', name: '游戏', channelType: 2, children: [] },
      { channelId: '63', name: '文章', channelType: 1, children: [] },
      { channelId: '177', name: 'AC正义', channelType: 2, children: [] },
      { channelId: '0', name: '坏数据', channelType: 2, children: [] },
      null
    ]
  });
  assert.deepEqual(tree, [{ id: 1, name: '动画' }, { id: 59, name: '游戏' }]);
  assert.deepEqual(channelTreeOf(null), []);
});

test('channelPageOf：拆包、缺 id 丢弃、杂质按 channel.parentId 本地复核滤', () => {
  var page = channelPageOf({
    result: 0,
    feed: [
      { dougaId: '900101', channel: { parentId: 1 } },
      { dougaId: '900130', channel: { parentId: 201 } }, // 跨区杂质：滤
      { caption: '无 id' },                               // 缺 id：滤
      { contentId: '900103', channel: null }              // 无 channel 字段：收（复核放行缺证据的）
    ],
    pcursor: '1,900100'
  }, 1);
  assert.deepEqual(page.items.map(function (d) { return d.dougaId || d.contentId; }), ['900101', '900103']);
  assert.equal(page.noMore, false);
  assert.equal(page.nextCursor, '1,900100');
  // channelId=null（不复核）：杂质也放行
  var loose = channelPageOf({ result: 0, feed: [{ dougaId: '1', channel: { parentId: 9 } }], pcursor: 'x' }, null);
  assert.equal(loose.items.length, 1);
});

test('channelPageOf：终页收口——空游标/no_more/整页空 ⇒ noMore；result!==0 抛错', () => {
  assert.equal(channelPageOf({ result: 0, feed: [{ dougaId: '1' }], pcursor: '' }, 1).noMore, true);
  assert.equal(channelPageOf({ result: 0, feed: [{ dougaId: '1' }], pcursor: 'no_more' }, 1).noMore, true);
  assert.equal(channelPageOf({ result: 0, feed: [{ dougaId: '1' }] }, 1).noMore, true); // pcursor 缺失
  assert.equal(channelPageOf({ result: 0, feed: [], pcursor: '1,900100' }, 1).noMore, true); // 整页空
  assert.throws(function () { channelPageOf({ result: 21 }, 1); }, /channel-21/);
});
