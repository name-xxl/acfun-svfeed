// ui.js singleFlight（单飞 + 值缓存 + reset 代际作废，0.9.256）单元测试：Node 内置 test，零依赖。
// 背景：postForm 无超时 + reset 只清 val ⇒ ensureApiSt(true) 强制刷新拿到手的仍是挂在 busy
// 上的僵尸 promise，全互动写链卡到刷新。契约：reset 后新 get 必须重新发起加载；旧等待者
// 不撕（已持有的 promise 照旧结算）；成功值缓存、失败弃缓存重试的既有语义不变。
// 垫桩：ui.js 的 import 链（styles/state/cfg）需要最小 window/__ACSV_DEBUG__（devname.test.js 同口径）
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.addEventListener = function () { };

var { singleFlight } = await import('../../src/ui.js');

test('singleFlight：并发共享一次加载，成功后值缓存', async () => {
  var calls = 0;
  var sf = singleFlight(function () { calls++; return Promise.resolve('v' + calls); });
  var r = await Promise.all([sf.get(), sf.get()]);
  assert.deepEqual(r, ['v1', 'v1']);
  assert.equal(calls, 1);
  assert.equal(await sf.get(), 'v1');
  assert.equal(calls, 1); // 命中值缓存，不再发
});

test('singleFlight：失败弃缓存，下次重试', async () => {
  var calls = 0;
  var sf = singleFlight(function () {
    calls++;
    return calls === 1 ? Promise.reject(new Error('boom')) : Promise.resolve('ok');
  });
  await assert.rejects(sf.get(), /boom/);
  assert.equal(await sf.get(), 'ok');
  assert.equal(calls, 2);
});

test('singleFlight：reset 清缓存值（下一次 get 重取）', async () => {
  var calls = 0;
  var sf = singleFlight(function () { return Promise.resolve(++calls); });
  assert.equal(await sf.get(), 1);
  sf.reset();
  assert.equal(await sf.get(), 2);
  assert.equal(calls, 2);
});

test('singleFlight：reset 作废在途 busy——新 get 重新发起，旧等待者仍收旧结果', async () => {
  var calls = 0, resolve1 = null;
  var sf = singleFlight(function () {
    calls++;
    var my = calls;
    return new Promise(function (res) {
      if (my === 1) resolve1 = res; else res('fresh');
    });
  });
  var p1 = sf.get();           // 在途
  sf.reset();                  // 强制刷新：僵尸 promise 作废
  var p2 = sf.get();
  assert.equal(calls, 2);      // reset 后必须重新发起
  resolve1('stale');
  assert.equal(await p1, 'stale'); // 旧等待者不被撕（行为与旧实现兼容）
  assert.equal(await p2, 'fresh');
});
