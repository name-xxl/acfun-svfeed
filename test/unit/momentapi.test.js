// momentapi.js 回包规整单元测试（0.9.159 域归域自 data.test.js 迁入，用例逐字保持）：
// followVideoPageOf（0.9.99 §2.1.2 实测）/ squarePageOf（0.9.125–127）/ momentDetailStateOf
// （0.9.127）——纯函数直采，Node 内置 test 运行器，零网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { followVideoPageOf, squarePageOf, momentDetailStateOf } = await import('../../src/momentapi.js');

test('followVideoPageOf（0.9.99 §2.1.2）：单页规整——只收 type2、终判 no_more、空页兜底', () => {
  var page = followVideoPageOf({
    feedList: [
      { resourceType: 2, resourceId: 48888718 },
      { resourceType: 10, resourceId: 5104409 }, // 非视频：宁漏不错滤掉
      { resourceType: 2, resourceId: 0 },        // 缺 id：丢弃
      { resourceType: 2, resourceId: 48890001 }
    ],
    pcursor: '1790824871458'
  });
  assert.deepEqual(page.items, [{ id: 48888718 }, { id: 48890001 }]);
  assert.equal(page.nextCursor, '1790824871458');
  assert.equal(page.noMore, false);
  // 实测终值（极老游标回 1 条 + no_more）
  var end = followVideoPageOf({ feedList: [{ resourceType: 2, resourceId: 4424929 }], pcursor: 'no_more' });
  assert.equal(end.noMore, true);
  assert.equal(end.nextCursor, '');
  // 空壳/空页兜底同判
  assert.equal(followVideoPageOf({ feedList: [] }).noMore, true);
  assert.equal(followVideoPageOf(null).noMore, true);
});

test('squarePageOf：单页规整——result!==0 抛错（失败≠到底）；no_more/空页兜底；非动态滤掉', () => {
  var page = squarePageOf({
    result: 0, pcursor: '1790824871458:1790824871458',
    feedList: [
      { resourceType: 10, createTime: Date.now(), moment: { momentId: '1', text: 'a' }, user: {} },
      { resourceType: 2, resourceId: 9 }, // 非动态：宁漏不错滤掉
      { resourceType: 10, createTime: Date.now(), moment: { momentId: '2', text: 'b' }, user: {} }
    ]
  });
  assert.equal(page.items.length, 2);
  assert.equal(page.nextCursor, '1790824871458:1790824871458');
  assert.equal(page.noMore, false);
  assert.deepEqual(page.freshIds, [1, 2]); // ≤3h 新鲜（createTime=Date.now()）——回填名单
  var end = squarePageOf({
    result: 0, pcursor: 'no_more',
    feedList: [{ resourceType: 10, moment: { momentId: '3', text: 'c' }, user: {} }]
  });
  assert.equal(end.noMore, true);
  assert.equal(end.nextCursor, '');
  assert.throws(() => squarePageOf({ result: 1 }), /square-fail/); // 失败必须可辨（重试出口）
  assert.throws(() => squarePageOf(null), /square-fail/);
  assert.equal(squarePageOf({ result: 0, feedList: [] }).noMore, true);
  // 24h 窗口（0.9.126 收口）：超窗条目剔除且直接判到底（广场「翻到 >24h 即止」的契约面）
  var win = squarePageOf({
    result: 0, pcursor: 'a:b',
    feedList: [
      { resourceType: 10, createTime: Date.now() - 3600 * 1000, moment: { momentId: '11', text: '窗内' }, user: {} },
      { resourceType: 10, createTime: Date.now() - 25 * 3600 * 1000, moment: { momentId: '12', text: '超窗' }, user: {} }
    ]
  });
  assert.equal(win.items.length, 1);
  assert.equal(win.items[0].momentId, 11);
  assert.equal(win.noMore, true); // 超窗=边界即止（nextCursor 作废）
  assert.equal(win.nextCursor, '');
  assert.deepEqual(win.freshIds, [11]); // 窗内且 ≤3h 才进回填名单
});

// ---------- momentDetailStateOf（0.9.127 新鲜度回填） ----------
test('momentDetailStateOf：五件回填态；失败/形状不合→null（调用方静默保持快照）', () => {
  var st = momentDetailStateOf({
    result: 0,
    moment: { likeCount: 9, commentCount: 4, bananaCount: 2, isLike: true, isThrowBanana: true }
  });
  assert.deepEqual(st, { liked: true, thrown: true, like: 9, comment: 4, banana: 2 });
  assert.equal(momentDetailStateOf({ result: 1, moment: {} }), null); // 失败
  assert.equal(momentDetailStateOf({ result: 0 }), null);            // 缺 moment
  assert.equal(momentDetailStateOf(null), null);
});
