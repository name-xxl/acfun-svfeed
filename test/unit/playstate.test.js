// playstate.js 单测（0.9.209 拆件）：三态会话装配 + 快照/还原 + 层内历史。
// 拆件断言钉的是 0.9.170–175 用户裁决的会话语义：缺省=walk（深链/刷新无来源上下文仍给
// 相关池续命）、single 只由来源显式声明、list 的 idx 钳位、历史格随身带会话快照。
import { test } from 'node:test';
import assert from 'node:assert/strict';
var {
  freshSession, sessionFromCtx, snapSession, sessionFromSnap,
  createHist, histJump, histReset, histBack
} = await import('../../src/playstate.js');

test('freshSession：缺省壳=single 空会话（loop 落点靠它判）', () => {
  assert.deepEqual(freshSession(), { kind: 'single', list: [], rows: null, idx: -1, more: null });
});

test('sessionFromCtx：缺省/未知 ctx=walk；single 显式声明；list 切片+idx 钳位', () => {
  assert.equal(sessionFromCtx(null).kind, 'walk'); // 深链/刷新无上下文 ⇒ 缺省 walk
  assert.equal(sessionFromCtx(undefined).kind, 'walk');
  assert.equal(sessionFromCtx({}).kind, 'walk'); // 空对象不是合法声明，不给 single
  assert.equal(sessionFromCtx({ kind: 'single' }).kind, 'single');
  // list：条目切片（外部数组后续变更不回灌）+ idx 归一钳位
  var items = [{ acId: 1 }, { acId: 2 }];
  var s = sessionFromCtx({ kind: 'list', items: items, idx: 1 });
  assert.equal(s.kind, 'list');
  assert.equal(s.idx, 1);
  assert.deepEqual(s.list, items);
  assert.notEqual(s.list, items); // 切片非共享
  assert.equal(sessionFromCtx({ kind: 'list', items: items, idx: '0' }).idx, 0); // 字符串页码归一
  assert.equal(sessionFromCtx({ kind: 'list', items: items, idx: 99 }).idx, 0); // 越界钳回 0
  assert.equal(sessionFromCtx({ kind: 'list', items: items, idx: -3 }).idx, 0);
  assert.equal(sessionFromCtx({ kind: 'list', items: [], idx: 0 }).kind, 'walk'); // 空列表不算 list
  assert.equal(sessionFromCtx({ kind: 'list', idx: 0 }).kind, 'walk'); // 无条目不算
});

test('snapSession/sessionFromSnap：list 共享引用、idx/more 值拷贝（列表增长不需回滚）', () => {
  var list = [{ acId: 1 }];
  var s = { kind: 'list', list: list, rows: null, idx: 2, more: function () { } };
  var snap = snapSession(s);
  assert.equal(snap.list, list); // 共享引用
  snap.idx = 7;
  assert.equal(s.idx, 2); // idx 值拷贝
  var back = sessionFromSnap(snap);
  assert.equal(back.list, list);
  assert.equal(back.idx, 7);
  assert.equal(typeof back.more, 'function');
  assert.equal(back.rows, null); // rows||null 缺省
  assert.equal(sessionFromSnap({ kind: 'walk', list: [], rows: undefined, idx: -1, more: null }).rows, null);
});

test('histJump：落点=入历史，回退后再前进截断旧前向分支', () => {
  var h = createHist();
  assert.equal(h.hIdx, -1);
  histJump(h, { item: 'A' });
  assert.deepEqual(h.hist, [{ item: 'A' }]);
  assert.equal(h.hIdx, 0);
  histJump(h, { item: 'B' });
  histJump(h, { item: 'C' });
  assert.equal(h.hIdx, 2);
  // 回退两格再前进：旧前向分支截断
  assert.equal(histBack(h).item, 'B');
  assert.equal(histBack(h).item, 'A');
  histJump(h, { item: 'D' });
  assert.deepEqual(h.hist.map(function (e) { return e.item; }), ['A', 'D']);
  assert.equal(h.hIdx, 1);
});

test('histBack：入口返回 null（调用方出「已经是第一条」）', () => {
  var h = createHist();
  assert.equal(histBack(h), null); // 空
  histReset(h, { item: 'A' });
  assert.equal(histBack(h), null); // 第 0 条=入口
  histJump(h, { item: 'B' });
  assert.equal(histBack(h).item, 'A');
  assert.equal(h.hIdx, 0);
});

test('histReset：入口条目=历史第 0 条（↑ 要能回到入口那条）', () => {
  var h = createHist();
  histReset(h, null);
  assert.deepEqual(h.hist, []);
  assert.equal(h.hIdx, -1);
  histReset(h, { item: 'X', sess: { kind: 'walk' } });
  assert.equal(h.hIdx, 0);
  assert.equal(h.hist[0].item, 'X');
});
