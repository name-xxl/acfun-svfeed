// watchHost 宿主等待原语单元测试（0.9.342 批B；node:test，真实短毫秒定时器——本件时序本体
// 就是定时器，桩掉反而测不到预算计数）。observe 分支需 document/MutationObserver，留给
// harness 场景腿（inject-home-nav/off-home 走 observe+deadline 全链），此处钉四条纯语义：
//   首拍同步 / 成即定居（后续拍与 onEnd 全不响）/ 轮询预算=「计划内补拍条数」/
//   预算尽 while 未成 → onEnd 恰一次 / deadline 独立于 tries 且成则不响。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis; // 房子惯例垫片（watchhost 本体零依赖，此两行纯保险不必需）
globalThis.__ACSV_DEBUG__ = false;

var { watchHost } = await import('../../src/watchhost.js');

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

test('watchHost：首拍同步成——apply 恰一次、onDone 恰一次、零定时器在途', () => {
  var shots = 0, done = 0;
  watchHost({
    apply: function () { shots++; return true; },
    tries: 9, stepMs: 5,
    onDone: function () { done++; }
  });
  assert.equal(shots, 1);
  assert.equal(done, 1);
});

test('watchHost：第 3 拍成即定居——其后预算拍全不跑、onEnd 不响（摘「成即摘」反跑红）', async () => {
  var shots = 0, done = 0, ended = 0;
  watchHost({
    apply: function () { shots++; return shots >= 3; },
    tries: 8, stepMs: 8,
    onDone: function () { done++; },
    onEnd: function () { ended++; }
  });
  await sleep(160); // 足够 8×8ms 全跑完的窗口——定居后应只停在 3
  assert.equal(shots, 3, 'shots=' + shots);
  assert.equal(done, 1);
  assert.equal(ended, 0, '定居成功不得走 onEnd');
});

test('watchHost：预算=计划内补拍条数——首拍+tries 次补拍后停，onEnd 恰一次（memberplaza 原 `++tries>=20` 语义）', async () => {
  var shots = 0, ended = 0;
  watchHost({
    apply: function () { shots++; return false; },
    tries: 3, stepMs: 8,
    onEnd: function () { ended++; }
  });
  await sleep(140);
  assert.equal(shots, 4, 'shots=' + shots); // 1 首拍 + 3 计划补拍
  assert.equal(ended, 1);
});

test('watchHost：deadline 独立腿——到点未成 onDeadline 恰一次且观察窗结束；settled 则永不再响', async () => {
  var fired = 0;
  watchHost({ apply: function () { return false; }, deadlineMs: 15, onDeadline: function () { fired++; } });
  await sleep(140);
  assert.equal(fired, 1, 'fired=' + fired);
  var fired2 = 0;
  watchHost({
    apply: function () { return true; }, deadlineMs: 15,
    onDeadline: function () { fired2++; }
  });
  await sleep(140);
  assert.equal(fired2, 0, '成则 deadline 不响（nav 胶囊不弹的原件语义）');
});
