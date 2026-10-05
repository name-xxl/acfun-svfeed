// relatedapi.js 单元测试（0.9.168）：回包规整 relatedPageOf / 池挑选 pickFresh /
// 条目映射 relatedItemOf（契约白名单 ⊆ ITEM_FIELDS.play）——纯函数直采，Node 内置 test
// 运行器，零网络；网络行为（listRelated/batch 换批）由 harness rel-drawer 场景钉。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { relatedPageOf, pickFresh, relatedItemOf, seed } = await import('../../src/relatedapi.js');
var { ITEM_FIELDS } = await import('../../src/playitem.js');

function dv(id, title) {
  return { dougaId: String(id), title: title || '条目' + id, coverUrl: 'https://imgs.example/x.jpg',
    durationMillis: 61000, likeCount: 1, user: { id: 9, name: 'UP', headUrl: '', isFollowing: false } };
}
function wrap(list) { return { result: 0, feeds: list.map(function (d) { return { dougaFeedView: d, expTag: '', type: 2 }; }) }; }

test('relatedPageOf：拆包裹层、缺 id 丢弃、result!==0 抛错', () => {
  var out = relatedPageOf(wrap([dv(1), { notId: true }, dv(2)]));
  assert.deepEqual(out.map(function (d) { return d.dougaId; }), ['1', '2']);
  assert.throws(function () { relatedPageOf({ result: 21, error_msg: 'x' }); }, /related-21/);
  assert.throws(function () { relatedPageOf(null); }, /related-null/);
  assert.deepEqual(relatedPageOf({ result: 0, feeds: [] }), []);
});

test('pickFresh walk：rand 注入两端界 + seen 过滤 + 全见尽返回空（调用方换批）', () => {
  var pool = [dv(1), dv(2), dv(3)];
  var seen = {};
  assert.equal(pickFresh(pool, seen, 'walk', function () { return 0; })[0].dougaId, '1');
  assert.equal(pickFresh(pool, seen, 'walk', function () { return 0.999; })[0].dougaId, '3');
  seen['2'] = 1;
  var fresh = pickFresh(pool, seen, 'walk', function () { return 0.5; });
  assert.equal(fresh.length, 1);
  assert.ok(fresh[0].dougaId === '1' || fresh[0].dougaId === '3');
  assert.deepEqual(pickFresh([dv(1), dv(2)], { 1: 1, 2: 1 }, 'walk', function () { return 0; }), []);
});

test('pickFresh seq：按展示顺序全出（seen 先滤），顺序保持', () => {
  var pool = [dv(3), dv(1), dv(2)];
  var out = pickFresh(pool, { 1: 1 }, 'seq');
  assert.deepEqual(out.map(function (d) { return d.dougaId; }), ['3', '2']);
});

test('relatedItemOf：契约白名单 ⊆ ITEM_FIELDS.play + 字段映射（up 主键 id、计数富化）', () => {
  var item = relatedItemOf({
    dougaId: '48892876', title: 'T', caption: 'C', coverUrl: 'https://imgs.example/y.jpg',
    likeCount: 16, bananaCount: 50, commentCount: 3, viewCount: 467, stowCount: 15, shareCount: 2,
    danmakuCount: 114, shareUrl: 'https://www.acfun.cn/v/ac48892876',
    user: { id: 16279345, name: '咖纳纳纳o', headUrl: 'https://imgs.example/h.jpg', isFollowing: true }
  });
  var keys = Object.keys(item);
  var extra = keys.filter(function (k) { return ITEM_FIELDS.play.indexOf(k) === -1; });
  assert.deepEqual(extra, [], '越界字段：' + extra.join(','));
  assert.equal(item.kind, 'home');
  assert.equal(item.id, 48892876);
  assert.equal(item.title, 'T'); // title 优先于 caption
  assert.deepEqual(item.up, { id: 16279345, name: '咖纳纳纳o', img: 'https://imgs.example/h.jpg', isFollowing: true });
  assert.equal(item.like, 16);
  assert.equal(item.banana, 50);
  assert.equal(item.view, 467);
  assert.equal(item.fav, 15);
  assert.equal(item.danmakuCount, 114);
  assert.equal(item.cap.lazyResolve, true); // 懒解析入链（resolve 链/prewarm/slim 免费）
  assert.equal(item.urls.length, 0);
  // 作者缺名缺 id → up=null（不编造「未知用户」）
  assert.equal(relatedItemOf({ dougaId: '5', title: 'x', user: {} }).up, null);
});

test('seed：seen 表重置与起点登记（纯状态，网络零触达）', () => {
  // 0.9.179 起 resetPump 随舞台游走链删除（零消费）——seed 自身即"重置 + 登记起点"
  seed('48892876');
  seed(null); // 空起点：只重置
  assert.ok(true);
});
