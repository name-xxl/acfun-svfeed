// feedctx.js（列表上下文工厂，0.9.106 架构收口）单元测试：Node 内置 test 运行器，零依赖。
// 契约：①createFeedContext 8 核心字段 + reset 归位（firstCursor 首游标可定制——空间页用
// null 作首拉判据）；②runChain 链状态机（推进/到底/失败/页数上限/chainCapped/busy 复位）；
// ③注册表**单活互斥**（activateContext 清其余——用户三问「关注页和推荐页抢组件」的真债务修复）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { createFeedContext, runChain, registerContext, activateContext, activeContext, deactivateContext } =
  await import('../../src/feedctx.js');

function tick(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function until(fn, ms) {
  var t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > (ms || 3000)) throw new Error('until timeout');
    await tick(10);
  }
}

test('createFeedContext：核心字段形状与 firstCursor 定制；reset 归位', () => {
  var a = createFeedContext({ dockView: 'follow', firstCursor: '0' });
  assert.equal(a.dockView, 'follow');
  assert.equal(a.pcursor, '0');
  assert.equal(a.feedActive, false);
  assert.deepEqual([a.feedCursor, a.done, a.failed, a.chainBusy, a.chainCapped], [0, false, false, false, false]);
  var b = createFeedContext({ firstCursor: null }); // 空间页：null 是首拉判据
  assert.equal(b.pcursor, null);
  assert.equal(b.dockView, '');
  // reset：状态归位但 dockView 不动
  a.items.push({ id: 1 }); a.feedCursor = 3; a.done = true; a.failed = true;
  a.reset();
  assert.deepEqual([a.items.length, a.feedCursor, a.pcursor, a.done, a.failed], [0, 0, '0', false, false]);
  assert.equal(a.dockView, 'follow');
});

test('runChain：逐页推进直到 noMore（loadPage 自置 done）；onStep/onDone 回调有序', async () => {
  var ctx = createFeedContext({ firstCursor: 'c0' });
  var pages = [[1, 2], [3]];
  var steps = 0, doneCalled = 0;
  runChain(ctx, {
    maxPages: 10,
    onStep: function () { steps++; },
    onDone: function () { doneCalled++; },
    loadPage: function (c, isFirst) {
      assert.equal(isFirst, steps === 0); // 首页判据：空 items 的首跳
      return Promise.resolve().then(function () {
        var p = pages.shift();
        if (p) { c.items = c.items.concat(p); c.pcursor = 'c' + c.items.length; }
        else { c.done = true; }
        return { loaded: !!p };
      });
    }
  });
  await until(function () { return !ctx.chainBusy; });
  assert.equal(ctx.items.length, 3);
  assert.equal(ctx.done, true);
  assert.equal(ctx.failed, false);
  assert.equal(ctx.chainCapped, false);
  assert.equal(steps, 3); // 两页 + 到底跳（loadPage 自置 done 的那跳）各触发一次 onStep
  assert.ok(doneCalled >= 1);
});

test('runChain：页数上限 → chainCapped（防超大列表无感轰炸）', async () => {
  var ctx = createFeedContext({});
  var calls = 0;
  runChain(ctx, {
    maxPages: 2,
    loadPage: function (c) {
      calls++;
      c.items = c.items.concat([{ id: calls }]);
      return Promise.resolve({ loaded: true }); // 永不到底，验证上限截断
    }
  });
  await until(function () { return !ctx.chainBusy; });
  assert.equal(calls, 2);
  assert.equal(ctx.chainCapped, true);
  assert.equal(ctx.done, false);
});

test('runChain：loadPage reject → failed 置位 + chainBusy 复位（不卡死）', async () => {
  var ctx = createFeedContext({});
  runChain(ctx, {
    maxPages: 3,
    loadPage: function () { return Promise.reject(new Error('boom')); }
  });
  await until(function () { return !ctx.chainBusy; });
  assert.equal(ctx.failed, true);
});

test('注册表单活互斥：activate 清其余（互踩修复）；deactivate 后无活动上下文', () => {
  var a = registerContext(createFeedContext({ dockView: 'follow' }));
  var b = registerContext(createFeedContext({}));
  activateContext(a);
  assert.equal(a.feedActive, true);
  assert.equal(b.feedActive, false);
  activateContext(b); // 进入另一上下文：旧的自动清
  assert.equal(a.feedActive, false);
  assert.equal(b.feedActive, true);
  assert.equal(activeContext(), b);
  deactivateContext(b);
  assert.equal(activeContext(), null);
});
