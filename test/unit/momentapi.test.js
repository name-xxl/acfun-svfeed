// momentapi.js 回包规整单元测试（0.9.159 域归域自 data.test.js 迁入，用例逐字保持）：
// followVideoPageOf（0.9.99 §2.1.2 实测）/ squarePageOf（0.9.125–127）/ momentDetailStateOf
// （0.9.127）/ profilePageOf（0.9.218 个人主页动态流）——纯函数直采，Node 内置 test 运行器，零网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { followVideoPageOf, squarePageOf, momentDetailStateOf, profilePageOf } = await import('../../src/momentapi.js');

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

// ---------- profilePageOf（0.9.218 个人主页动态流） ----------
// 条目形状与 followFeedV2 同构（2026-10-09 字段级核对）⇒ 复用 follow 解析器；**无 24h 窗口**
// 是与 squarePageOf 的关键差异（个人主页是历史流）
function profileRaw() {
  var now = Date.now();
  return {
    result: 0, pcursor: '1788235590159',
    feedList: [
      { // rt=10 图文动态（momentId 取自 resourceId）
        resourceType: 10, resourceId: 5104362, createTime: now,
        moment: { momentId: '5104362', text: '动态正文', imgs: [{ url: 'u', expandedUrl: 'e', originUrl: 'o' }] },
        user: { userId: 11, userName: 'up1', userHead: 'h1' },
        likeCount: 1, commentCount: 2, bananaCount: 3
      },
      { // rt=2 视频
        resourceType: 2, resourceId: 48888718, createTime: now,
        caption: '视频标题', playDuration: '00:11', viewCount: 5,
        user: { userId: 12, userName: 'up2', userHead: 'h2' }
      },
      { // rt=3 文章
        resourceType: 3, resourceId: 48879687, createTime: now,
        articleTitle: '文章标题', beginParagraph: '摘要',
        user: { userId: 13, userName: 'up3', userHead: 'h3' }
      },
      { resourceType: 1, resourceId: 999 } // 三类之外（直播）：宁漏不错滤掉
    ]
  };
}

test('profilePageOf：三合一混排逐类派发；复用的 follow 解析器给的 ct/落点正确', () => {
  var page = profilePageOf(profileRaw());
  assert.equal(page.items.length, 3); // 直播条被契约层滤掉
  var m = page.items[0], v = page.items[1], a = page.items[2];
  assert.equal(m.ct, 'moment');
  assert.equal(m.momentId, 5104362);           // 取 raw.resourceId
  assert.equal(m.text, '动态正文');
  assert.equal(m.imgs.length, 1);              // moment.imgs → 契约配图
  assert.equal(m.href, 'https://www.acfun.cn/moment/am5104362');
  assert.equal(v.ct, 'video');
  assert.equal(v.acId, 48888718);
  assert.equal(v.title, '视频标题');
  assert.equal(v.dur, '00:11');                // 展示串直用
  assert.equal(a.ct, 'article');
  assert.equal(a.title, '文章标题');
  assert.equal(a.desc, '摘要');                 // beginParagraph
  assert.equal(page.nextCursor, '1788235590159');
  assert.equal(page.noMore, false);
  // freshIds：只收 ≤3h 的动态（视频/文章不进回填名单）
  assert.deepEqual(page.freshIds, [5104362]);
});

test('profilePageOf：**无 24h 窗口**——老动态照收且不判到底（与 squarePageOf 的关键差异）', () => {
  var now = Date.now();
  var page = profilePageOf({
    result: 0, pcursor: '1786000000000',
    feedList: [
      { resourceType: 10, resourceId: 5104362, createTime: now - 30 * 24 * 3600 * 1000,
        moment: { momentId: '5104362', text: '一个月前' }, user: { userId: 11, userName: 'up1' } },
      { resourceType: 10, resourceId: 5104361, createTime: now - 60 * 24 * 3600 * 1000,
        moment: { momentId: '5104361', text: '两个月前' }, user: { userId: 11, userName: 'up1' } }
    ]
  });
  assert.equal(page.items.length, 2);        // 老动态必须照收（摘掉"无窗口"即转红）
  assert.equal(page.noMore, false);          // 且不得因此判到底
  assert.equal(page.nextCursor, '1786000000000');
  assert.deepEqual(page.freshIds, []);       // 都不新鲜：不进回填名单
});

test('profilePageOf：失败可辨（result!==0/null 抛错）；no_more/空页/整页滤空判到底', () => {
  assert.throws(() => profilePageOf({ result: 1 }), /profile-fail/);
  assert.throws(() => profilePageOf(null), /profile-fail/);
  var end = profilePageOf({ result: 0, pcursor: 'no_more', feedList: profileRaw().feedList });
  assert.equal(end.noMore, true);
  assert.equal(end.nextCursor, '');
  assert.equal(profilePageOf({ result: 0, feedList: [] }).noMore, true);
  // 整页非三类 ⇒ 视作到底（由工厂的"整页 0 新增"安全阀同判）
  assert.equal(profilePageOf({ result: 0, pcursor: 'x', feedList: [{ resourceType: 1, resourceId: 1 }] }).noMore, true);
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
