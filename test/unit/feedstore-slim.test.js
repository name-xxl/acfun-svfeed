// feedstore.js slim 水位单测（0.9.213 批⑨）：两级水位的带边界与不变式，node 直采。
// 垫桩与 purity.test.js 同款最小集（feedstore→api→…→cfg→dbg 链在模块级读 window）。
// slim 语义：一级带（cur−slimBehindAt=30 外）清媒体载荷（urls/qualities/_qualitiesAll/
// urlIdx + cap.lazyResolve 置真）；深带（cur−deepSlimAt=120 外）再清 desc 重字段——契约面
// 字段（id/title/up/计数）与 seen{} 有意不动，items 数组绝不删元素（data-idx/offsetTop
// 是滚动定位承重墙）。renderWindow 每拍调用，幂等性一并钉死。
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
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};

var { FeedStore } = await import('../../src/feedstore.js');

// 造 n 条已解析条目（home 形：urls/qualities/ desc 全挂）
function makeItems(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push({
      id: 1000 + i, kind: 'home', title: 't' + i, up: { id: i, name: 'u', img: '', isFollowing: false },
      cover: 'c', urls: ['u' + i], urlIdx: 0, refreshed: false,
      qualities: [{ label: '1080P', urls: ['u' + i] }], _qualitiesAll: { x: 1 }, qIdx: 0,
      cap: { lazyResolve: false }, like: i, comment: i, desc: '简介' + i
    });
  }
  return out;
}

test('slim 两级水位：三带边界（未及/一级/深带）与不变式', () => {
  FeedStore.reset();
  FeedStore.items = makeItems(130);
  FeedStore.seen = {};
  FeedStore.slim(130);
  // items 数组绝不删元素（滚动定位承重墙）
  assert.equal(FeedStore.items.length, 130);
  var deepLim = 130 - 120; // 10：深带 = idx 0..9
  var lim = 130 - 30;      // 100：一级带 = idx 0..99
  FeedStore.items.forEach(function (it, i) {
    if (i < deepLim) {
      // 深带：载荷+desc 全清；契约面字段保留
      assert.equal(it.desc, undefined, 'idx' + i + ' 深带 desc 应清');
      assert.equal(it.urls.length, 0, 'idx' + i + ' 深带 urls 应清');
      assert.equal(it.cap.lazyResolve, true, 'idx' + i + ' 应置懒解析');
      assert.ok(it.id && it.title && it.up, 'idx' + i + ' 契约面字段必须保留（回滚重建不残缺）');
    } else if (i < lim) {
      // 一级带：载荷清、**desc 有意保留**（未跨深带不误伤）
      assert.equal(it.desc, '简介' + i, 'idx' + i + ' 一级带 desc 不应被清');
      assert.equal(it.urls.length, 0, 'idx' + i + ' 一级带 urls 应清');
      assert.equal(it.cap.lazyResolve, true, 'idx' + i + ' 应置懒解析');
    } else {
      // 窗口带：原样不动
      assert.equal(it.desc, '简介' + i, 'idx' + i + ' 窗口带不应动');
      assert.equal(it.urls.length, 1, 'idx' + i + ' 窗口带 urls 不应动');
      assert.equal(it.cap.lazyResolve, false, 'idx' + i + ' 窗口带不应置懒解析');
    }
  });
  // seen{} 不在 slim 射程（本测试未塞值，防回归口径：slim 不得清它）
  FeedStore.seen['x'] = 1;
  FeedStore.slim(130);
  assert.equal(FeedStore.seen['x'], 1, 'slim 不得动 seen 去重表');
});

test('slim 幂等：重复调用不重清、不报错（renderWindow 每拍调用）', () => {
  FeedStore.reset();
  FeedStore.items = makeItems(40);
  FeedStore.slim(40);
  var snap = JSON.stringify(FeedStore.items.map(function (it) {
    return [it.urls.length, it.desc === undefined ? null : it.desc, it.cap.lazyResolve];
  }));
  FeedStore.slim(40);
  assert.equal(JSON.stringify(FeedStore.items.map(function (it) {
    return [it.urls.length, it.desc === undefined ? null : it.desc, it.cap.lazyResolve];
  })), snap);
  // cur 未过深带时 desc 全保留（深带不误伤）
  FeedStore.items.forEach(function (it) {
    assert.notEqual(it.desc, undefined);
  });
});

test('slim 边界：短列表/cur 很小不越界、_resolveP 在途跳过', () => {
  FeedStore.reset();
  FeedStore.items = makeItems(3);
  assert.doesNotThrow(function () { FeedStore.slim(0); });
  assert.equal(FeedStore.items[0].urls.length, 1); // cur=0：水位带为负，什么都不清
  assert.doesNotThrow(function () { FeedStore.slim(3); });
  assert.equal(FeedStore.items[0].urls.length, 1); // cur=3 仍未及 slimBehindAt=30
  // 在途解析条目跳过（不与 resolve 链争写）：cur=40 → 水位带=idx 0..9
  FeedStore.items = makeItems(40);
  FeedStore.items[0]._resolveP = Promise.resolve();
  FeedStore.slim(40);
  assert.equal(FeedStore.items[0].urls.length, 1, '在途条目应跳过');
  assert.equal(FeedStore.items[1].urls.length, 0, '非在途条目照常置瘦');
  delete FeedStore.items[0]._resolveP;
});
