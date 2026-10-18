// feedland.js 生命周期单测（0.9.273）：探针定时器可撤 + settle 代际可作废。
// 纯 Node：拦截 setTimeout/clearTimeout/requestAnimationFrame，不依赖真实滚动引擎
//（harness 的滚动吸附会干扰造态，故这两条用假时钟/假 scroller 钉死）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = { hidden: false };
globalThis.__ACSV_DEBUG__ = false;

var timers = new Map(), nextTimer = 1, cleared = [];
var rafs = [];

var { createLandKit } = await import('../../src/feedland.js');

function fakeScroller() {
  return {
    scrollTop: 0,
    clientHeight: 100,
    children: [],
    scrollTo: function (o) { this.scrollTop = o.top; }
  };
}

function kitOf(scroller, store, slideAt) {
  return createLandKit({
    getScroller: function () { return scroller; },
    feedStore: store || { items: [{}], current: 0, ensureMore: function () { return Promise.resolve(); } },
    slideAt: slideAt || function () { return null; },
    stageVisible: function () { return true; },
    setActive: function () { },
    renderWindow: function () { },
    reportLeaveCurrent: function () { }
  });
}

test('stopSnapWatch：260ms 在途探针必须被 clearTimeout 撤掉', () => {
  var realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
  timers = new Map(); cleared = []; nextTimer = 1;
  globalThis.setTimeout = function (fn, _ms) { var id = nextTimer++; timers.set(id, fn); return id; };
  globalThis.clearTimeout = function (id) { cleared.push(id); timers.delete(id); };
  try {
    var kit = kitOf(fakeScroller());
    kit.tick(); // 只排 260ms 探针，不起 interval
    assert.equal(timers.size, 1, 'tick 应排一个探针');
    var id = Array.from(timers.keys())[0];
    kit.stopSnapWatch();
    assert.equal(timers.has(id), false, 'stop 后探针计时器不得存活');
    assert.ok(cleared.indexOf(id) > -1, 'stop 必须显式 clearTimeout');
  } finally {
    globalThis.setTimeout = realSet;
    globalThis.clearTimeout = realClear;
  }
});

test('scrollToIndex：新落点作废旧 settle，旧 rAF 不得改写 scrollTop', async () => {
  var realRaf = globalThis.requestAnimationFrame;
  rafs = [];
  globalThis.requestAnimationFrame = function (fn) { rafs.push(fn); return rafs.length; };
  try {
    var scroller = fakeScroller();
    var slides = [{ offsetTop: 100 }, { offsetTop: 200 }];
    var kit = kitOf(scroller, null, function (idx) { return slides[idx] || null; });

    kit.landAt(0, true);
    assert.equal(rafs.length, 1, '首次 landAt 应排 settle');
    var oldSettle = rafs[0];
    assert.equal(scroller.scrollTop, 100);

    await kit.scrollToIndex(1); // ensureMore 的 then 是微任务：await 后新落位已执行
    assert.equal(scroller.scrollTop, 200, '新落点应落在 slide 1');

    oldSettle(); // 旧 settle：代际已过期，必须直接返回
    assert.equal(scroller.scrollTop, 200, '旧 settle 不得把视口拉回 slide 0');
  } finally {
    globalThis.requestAnimationFrame = realRaf;
  }
});
