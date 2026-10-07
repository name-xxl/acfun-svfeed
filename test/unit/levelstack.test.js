// levelstack.js 单测（0.9.209 拆件）：级别栈 push/弹 + 层内步进分派 + 工作态落档。
// 环境触面全部经 setLevelIO 假桩注入（swap 落账/curTime 定值/relatedBatch 受控 Promise），
// 断言钉 ll-* harness 场景同款语义：压级封顶 2、Esc 弹回上级带进度、↑ 回退带会话快照、
// list 尾部问 more()、single 静默。
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 垫桩（与 playitem.test.js 同款最小集）：levelstack→playitem→cfg→dbg 的传递链在模块级
// 读 window（dbg.js W 取数）；本件业务断言不碰它们
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
  removeEventListener: function () { }
};

var LS = await import('../../src/levelstack.js');

// 假桩环境：每次测试重置（模块级工作态 ⇒ 用 resetAll 归零）
function makeIO() {
  var rec = { swaps: [], toasts: [], syncArrows: 0, syncList: 0, listMode: [], openList: 0, batchCalls: [] };
  var batchRes = null; // {resolve} 受控
  var io = {
    rec: rec,
    swap: function (item, resumeAt) { rec.swaps.push({ item: item, resumeAt: resumeAt || undefined }); return true; },
    alive: function () { return true; },
    curTime: function () { return 12.4; },
    toast: function (m) { rec.toasts.push(m); },
    syncArrows: function () { rec.syncArrows++; },
    syncListTab: function () { rec.syncList++; },
    listMode: function (b) { rec.listMode.push(b); },
    hideList: function () { },
    openListDrawer: function () { rec.openList++; },
    relatedBatch: function (id) {
      rec.batchCalls.push(id);
      return new Promise(function (resolve) { batchRes = resolve; });
    },
    resolveBatch: function (v) { batchRes(v); batchRes = null; }
  };
  return io;
}

function fresh() {
  var io = makeIO();
  LS.setLevelIO(io);
  LS.resetAll();
  return io;
}

var pi = function (n) { return { acId: n, title: 't' + n, cover: '', up: null }; };
// 真机流程里 enterLayer/层内 curItem 收的是 playItemOf 产物（.id）——walk 问池用它
var pj = function (n) { return { id: n, title: 't' + n, cover: '', up: null }; };

test('applyCtx/enterLayer：缺省 walk 建箭头语境，历史第 0 条=入口，栈底建立', () => {
  var io = fresh();
  LS.applyCtx(null); // 深链/刷新 ⇒ walk
  LS.enterLayer(pi(100));
  var ls = LS.debugState();
  assert.equal(ls.session, 'walk');
  assert.equal(ls.hist, 1);
  assert.equal(ls.hIdx, 0);
  assert.equal(ls.levels, 1);
  assert.ok(io.rec.syncArrows >= 1);
  assert.equal(LS.canBack(), false); // 首条藏 ▲ 的判据
});

test('jump（经 pickInLevel）：落点入历史 + canBack 翻真；↑ 回退还原会话与下标', () => {
  var io = fresh();
  LS.applyCtx({ kind: 'list', items: [pi(1), pi(2), pi(3)], idx: 0 });
  LS.enterLayer(pi(1));
  assert.ok(LS.pickInLevel(2)); // 列表内跳到第 3 行
  assert.equal(LS.currentSession().idx, 2);
  assert.equal(io.rec.swaps.length, 1);
  assert.equal(io.rec.swaps[0].item.id, 3); // 过 playItemOf 归一 → .id
  assert.ok(LS.canBack());
  assert.ok(io.rec.syncList >= 1); // 列表 tab 跟随被调
  // ↑ 回退：连列表下标一起还原（ll-zone-back 钉的语义）；hist[0].item=enterLayer 传入的
  // 原始条目（真机流程=playItemOf 产物，此处直传 pi 原形）
  assert.ok(LS.step(-1));
  assert.equal(LS.currentSession().idx, 0);
  assert.equal(io.rec.swaps[1].item.acId, 1);
  // ↑ 到入口再 ↑：核返回 false（toast 由 playlayer 出）
  assert.equal(LS.step(-1), false);
});

test('stepNext list：顺序步进过 playItemOf；尾部问 more()——有货续拉、无货停+提示', async () => {
  var io = fresh();
  var moreCalls = 0;
  LS.applyCtx({
    kind: 'list', items: [pi(1), pi(2)], idx: 0,
    more: function () {
      moreCalls++;
      return Promise.resolve(moreCalls === 1 ? [pi(3)] : []); // 第二次说没有
    }
  });
  LS.enterLayer(pi(1));
  assert.ok(LS.step(1));
  assert.equal(io.rec.swaps[0].item.id, 2); // 步进过 playItemOf 归一
  assert.ok(LS.step(1)); // 尾部→more() 有货
  await new Promise(function (r) { setTimeout(r, 0); });
  assert.equal(moreCalls, 1);
  assert.equal(io.rec.swaps[1].item.id, 3);
  assert.ok(LS.step(1)); // 再尾部→more() 空批
  await new Promise(function (r) { setTimeout(r, 0); });
  assert.deepEqual(io.rec.toasts, ['已经是最后一条']);
  assert.equal(LS.step(1), true); // more 在场恒 true（异步拒），再来一次空批同形
  await new Promise(function (r) { setTimeout(r, 0); });
  assert.equal(io.rec.toasts.length, 2);
});

test('stepNext single：静默 false（不出箭头、loop 兜底的判据）', () => {
  var io = fresh();
  LS.applyCtx({ kind: 'single' });
  LS.enterLayer(pi(9));
  assert.equal(LS.step(1), false);
  assert.deepEqual(io.rec.toasts, []);
  assert.equal(LS.isSingle(), true);
});

test('pushLevel/escape：压级存档带进度，弹级还原上级工作态与 {item,at}', () => {
  var io = fresh();
  LS.applyCtx(null); // walk
  LS.enterLayer(pi(1));
  io.rec.swaps.length = 0;
  // 压级：列表播放器（ctx 来自被点行的列表）
  assert.ok(LS.pushLevel(pi(10), { kind: 'list', items: [pi(10), pi(11)], idx: 0 }));
  assert.equal(LS.debugState().levels, 2);
  assert.deepEqual(io.rec.listMode, [true]); // 抽屉收相关推荐入口
  assert.equal(io.rec.openList, 1);
  assert.equal(io.rec.swaps[0].item.acId, 10);
  assert.equal(LS.canBack(), false); // 新级别自己的历史从 0 起
  // 弹级：返回上级锚条目+进度（curTime 假桩 12.4 → at>1 才落槽，playlayer 侧判）
  var up = LS.escape();
  assert.equal(up.item.acId, 1);
  assert.equal(up.at, 12.4);
  assert.equal(LS.debugState().levels, 1);
  assert.equal(LS.currentSession().kind, 'walk'); // 上级会话还原
  assert.equal(LS.canBack(), false); // 上级历史随之还原（压级前未步进，hIdx=0=入口）
  // 单级再弹：null=交回视图层退出
  assert.equal(LS.escape(), null);
});

test('pushLevel 封顶：第 2 级里再压静默吞（返回 true=按已处理看待）', () => {
  var io = fresh();
  LS.applyCtx(null);
  LS.enterLayer(pi(1));
  assert.ok(LS.pushLevel(pi(2), { kind: 'list', items: [pi(2)], idx: 0 }));
  assert.ok(LS.pushLevel(pi(3), { kind: 'list', items: [pi(3)], idx: 0 })); // 被吞
  assert.equal(LS.debugState().levels, 2);
  assert.equal(io.rec.swaps.length, 1); // 没有真换条
});

test('stepNext walk：先吃队列再向池要一批；首批切 1 条进历史、余下进队列', async () => {
  var io = fresh();
  LS.applyCtx(null);
  LS.enterLayer(pj(1)); // 真机流程：入口条目=playItemOf 产物（curItem.id=1）
  assert.ok(LS.step(1)); // walk：向池要
  assert.deepEqual(io.rec.batchCalls, [1]); // 池问的是层内当前条
  io.resolveBatch([pi(2), pi(3), pi(4)]);
  await new Promise(function (r) { setTimeout(r, 0); });
  assert.equal(io.rec.swaps[0].item.acId, 2); // 首批第 1 条直接播
  assert.equal(LS.debugState().queue, 2); // 余下入队
  assert.ok(LS.step(1));
  assert.equal(io.rec.swaps[1].item.acId, 3); // 再 ↓ 吃队列（不再问池）
  assert.deepEqual(io.rec.batchCalls, [1]);
});

test('resetAll：工作态全清（teardown/buildPlayView 共用出口）', () => {
  fresh(); // 只需装好假桩（resetAll 前后不触发环境触面断言）
  LS.applyCtx({ kind: 'list', items: [pi(1)], idx: 0 });
  LS.enterLayer(pi(1));
  LS.setCurItem(pi(1));
  LS.resetAll();
  var ls = LS.debugState();
  assert.equal(ls.session, 'single');
  assert.equal(ls.hist, 0);
  assert.equal(ls.hIdx, -1);
  assert.equal(ls.levels, 0);
  assert.equal(LS.curItemOf(), null);
  assert.equal(LS.canBack(), false);
});
