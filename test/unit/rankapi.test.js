// rankapi.js 三榜单测（0.9.279）：回包规整复用 panelitem.rank + 三端点传输形状。
// 样本字段取自真机 rank/hot|banana|youngStar 回包（contentType=2/dougaId/contentTitle/...）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
globalThis.localStorage = {
  getItem: function () { return null; },
  setItem: function () {},
  removeItem: function () {}
};
var { rankBoardPageOf, fetchRankBoard } = await import('../../src/rankapi.js');

var ROW = {
  contentType: 2, dougaId: '48920184', contentId: 48920184,
  contentTitle: '这节奏有毒，慎点！', videoCover: 'https://img.example/c.jpg',
  contentDesc: '', contributeTime: 1792247041052, channelName: '综合舞蹈',
  viewCount: 271, commentCount: 27, userName: '雨乃乃-', userId: 23537620,
  userImg: 'https://img.example/u.jpg', fansCount: 36316, contributionCount: 234,
  userSignature: '签名', duration: 18507
};

test('rankBoardPageOf：contentType=2 行映射为面板 pi，rank 从 1 起；非视频丢弃', () => {
  var rows = rankBoardPageOf({ rankList: [ROW, { contentType: 3, contentTitle: '文章' }, null] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].pi.acId, 48920184);
  assert.equal(rows[0].pi.title, '这节奏有毒，慎点！');
  assert.equal(rows[0].pi.kind, 'rank');
  assert.equal(rows[0].pi.up.name, '雨乃乃-');
});

test('rankBoardPageOf：空/坏回包安全', () => {
  assert.deepEqual(rankBoardPageOf(null), []);
  assert.deepEqual(rankBoardPageOf({}), []);
  assert.deepEqual(rankBoardPageOf({ rankList: 'bad' }), []);
});

test('fetchRankBoard：hot/banana GET、youngStar POST form，均走 rankList', async () => {
  var calls = [];
  globalThis.GM_xmlhttpRequest = function (opts) {
    calls.push({ url: opts.url, method: opts.method, data: opts.data, anonymous: opts.anonymous });
    opts.onload({ status: 200, responseText: JSON.stringify({ result: 0, rankList: [ROW] }) });
  };
  var hot = await fetchRankBoard('hot', 'DAY');
  assert.equal(hot.length, 1);
  assert.ok(/\/rank\/hot\?count=100&pcursor=&mkey=/.test(calls[0].url), calls[0].url);
  assert.equal(calls[0].method, 'GET');

  var banana = await fetchRankBoard('banana', 'DAY');
  assert.equal(banana.length, 1);
  assert.ok(/\/rank\/banana\?rankPeriod=DAY$/.test(calls[1].url), calls[1].url);
  assert.equal(calls[1].method, 'GET');

  var young = await fetchRankBoard('youngStar', 'DAY');
  assert.equal(young.length, 1);
  assert.equal(calls[2].url, 'https://api-new.app.acfun.cn/rest/app/rank/youngStar');
  assert.equal(calls[2].method, 'POST');
  assert.equal(calls[2].data, 'rankPeriod=DAY');
});
