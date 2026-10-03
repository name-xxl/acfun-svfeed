// overlay.js（浮层栈）单元测试：Node 内置 test 运行器，零依赖。
// 契约：栈内容就是状态（0.9.22「显式状态判定」的收拢）；先出栈再调 close、异常隔离；
// 同 id 重开先收旧；close 内再调 overlayClose(自身 id) 必须空转（显式关闭路径同步栈的
// 自举语义，imgview/closeComments/closeDrawer 都依赖它）；teardown 自顶向下。
// overlay 的懒注册监听与 testHook（dbg.js）在 Node 缺 API/常量，按 release.test.js 惯例垫桩
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.addEventListener = function () { };

var overlay = await import('../../src/overlay.js');

function reset() { overlay.overlayTeardown(); }

// ---------- 基础开/关/栈顶 ----------
test('open/close/top：入栈出栈与栈顶', () => {
  reset();
  var closed = [];
  overlay.overlayOpen({ id: 'a', close: () => closed.push('a') });
  overlay.overlayOpen({ id: 'b', close: () => closed.push('b') });
  assert.equal(overlay.overlayTop().id, 'b');
  overlay.overlayClose('b');
  assert.deepEqual(closed, ['b']);
  assert.equal(overlay.overlayTop().id, 'a');
  overlay.overlayClose('a');
  assert.equal(overlay.overlayTop(), null);
  assert.deepEqual(closed, ['b', 'a']);
});

test('close：栈中查不到时静默空转', () => {
  reset();
  overlay.overlayClose('nope');
  assert.equal(overlay.overlayTop(), null);
});

// ---------- 幂等与自举 ----------
test('同 id 重开：先收旧再入栈（open 先 close 惯例）', () => {
  reset();
  var n = 0;
  overlay.overlayOpen({ id: 'x', close: () => { n++; } });
  overlay.overlayOpen({ id: 'x', close: () => { n++; } });
  assert.equal(n, 1); // 旧的被收掉一次
  assert.equal(overlay.overlayTop().id, 'x');
  assert.equal(overlay.overlayIsOpen('x'), true);
  reset();
  assert.equal(n, 2); // teardown 收掉第二个
});

test('close 内再调 overlayClose(自身)：空转不递归（显式关闭路径同步栈）', () => {
  reset();
  var n = 0;
  var close = function () {
    n++;
    overlay.overlayClose('self'); // 模拟 closeComments/closeDrawer 的自举
  };
  overlay.overlayOpen({ id: 'self', close });
  overlay.overlayClose('self');
  assert.equal(n, 1); // overlayClose 先出栈再调 close，二次调用查不到已空转
  assert.equal(overlay.overlayTop(), null);
});

// ---------- 异常隔离 ----------
test('close 抛异常：不阻断栈，后续 Esc 仍可用', () => {
  reset();
  var closed = [];
  overlay.overlayOpen({ id: 'boom', close: () => { throw new Error('收尾炸了'); } });
  overlay.overlayOpen({ id: 'ok', close: () => closed.push('ok') });
  overlay.overlayClose('ok');
  assert.deepEqual(closed, ['ok']);       // 栈顶正常收
  overlay.overlayClose('boom');           // 异常被隔离，不向外抛
  assert.equal(overlay.overlayTop(), null);
});

// ---------- 顺序语义 ----------
test('teardown：自顶向下逐层收尾', () => {
  reset();
  var order = [];
  overlay.overlayOpen({ id: 'low', close: () => order.push('low') });
  overlay.overlayOpen({ id: 'mid', close: () => order.push('mid') });
  overlay.overlayOpen({ id: 'high', close: () => order.push('high') });
  overlay.overlayTeardown();
  assert.deepEqual(order, ['high', 'mid', 'low']);
  assert.equal(overlay.overlayTop(), null);
});

test('claim 序模拟：栈顶先行关闭后，下层（抽屉）成为新栈顶', () => {
  // 复刻大图盖抽屉场景：Esc 先关大图、再 Esc 关抽屉、最后退出——0.9.61 前显式链的顺序
  reset();
  var closed = [];
  overlay.overlayOpen({ id: 'comments', close: () => closed.push('comments') });
  overlay.overlayOpen({ id: 'imgview', modal: true, close: () => closed.push('imgview') });
  assert.equal(overlay.overlayTop().id, 'imgview');
  assert.equal(overlay.overlayTop().modal, true);
  overlay.overlayClose(overlay.overlayTop().id);
  assert.equal(overlay.overlayTop().id, 'comments');
  overlay.overlayClose(overlay.overlayTop().id);
  assert.equal(overlay.overlayTop(), null);
  assert.deepEqual(closed, ['imgview', 'comments']);
});

test('非法注册：缺 id / 缺 close 回调不入栈', () => {
  reset();
  overlay.overlayOpen(null);
  overlay.overlayOpen({ id: 'no-close' });
  overlay.overlayOpen({ close: () => { } });
  assert.equal(overlay.overlayTop(), null);
});

// ---------- 输入元素豁免分类器（0.9.96 动态详情面板） ----------
// 面板 modal 层内有评论输入框：分类器决定打字放行；Esc 永不豁免（关层语义）由调用侧保证，
// 这里钉的是分类本体（接线在 overlay.js capture 与 input.js 气泡各 2 行）
test('isInputTarget：input/textarea/select/contentEditable 为真，其余为假；脏输入不炸', () => {
  assert.equal(overlay.isInputTarget({ target: { tagName: 'INPUT' } }), true);
  assert.equal(overlay.isInputTarget({ target: { tagName: 'textarea' } }), true);
  assert.equal(overlay.isInputTarget({ target: { tagName: 'SELECT' } }), true);
  assert.equal(overlay.isInputTarget({ target: { isContentEditable: true } }), true);
  assert.equal(overlay.isInputTarget({ target: { tagName: 'DIV' } }), false);
  assert.equal(overlay.isInputTarget({ target: { tagName: 'BUTTON' } }), false);
  assert.equal(overlay.isInputTarget({ target: {} }), false);
  assert.equal(overlay.isInputTarget({ target: null }), false);
  assert.equal(overlay.isInputTarget({}), false);
});
