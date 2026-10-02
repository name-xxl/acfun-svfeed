// route.js（路由解析）单元测试：Node 内置 test 运行器，零依赖。
// 契约：hash 语法扩展（0.9.62）——数字段=竖刷深链 #svfeed/<id>、字母段=子视图
// #svfeed/<view>/<arg>，两者语法互斥；脏输入一律降级为非竖刷路由，不许抛错。
// route.js 静态 import 链拉到 player（顶层零副作用是架构不变量），Node 直采需垫 window
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
// route 的 import 链经过 comments/report（模块级事件监听）——Node 无这些 API，垫 no-op
globalThis.addEventListener = function () { };
globalThis.removeEventListener = function () { };
globalThis.document = {
  addEventListener: function () { },
  removeEventListener: function () { },
  hidden: false,
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
var { parseHash } = await import('../../src/route.js');

test('深链形态：#svfeed 与 #svfeed/<数字> 激活且不产生视图段', () => {
  assert.deepEqual(parseHash('#svfeed'), { active: true, mid: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#svfeed/48820714'),
    { active: true, mid: '48820714', view: null, viewArg: null });
  // 全锚定语法（0.9.62 顺修）：#svfeed/ 空段与 #svfeedother 前缀粘连不算竖刷路由
  assert.equal(parseHash('#svfeed/').active, false);
  assert.equal(parseHash('#svfeedother').active, false);
});

test('子视图形态：字母段=视图、第二个数字段=参数', () => {
  assert.deepEqual(parseHash('#svfeed/my'), { active: true, mid: null, view: 'my', viewArg: null });
  assert.deepEqual(parseHash('#svfeed/zone/59'),
    { active: true, mid: null, view: 'zone', viewArg: '59' });
});

test('互斥：字母段不吞数字深链，数字段不产生视图', () => {
  var num = parseHash('#svfeed/123');
  assert.equal(num.view, null);
  assert.equal(num.mid, '123');
  var alpha = parseHash('#svfeed/my');
  assert.equal(alpha.mid, null);
});

test('非竖刷 hash：inactive 且各段为空', () => {
  assert.deepEqual(parseHash(''), { active: false, mid: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#otherroute'), { active: false, mid: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#svfeedother'), { active: false, mid: null, view: null, viewArg: null });
});

test('脏输入：null/undefined 不抛错', () => {
  assert.equal(parseHash(null).active, false);
  assert.equal(parseHash(undefined).active, false);
});

test('未知视图名也激活路由（视图存在性由 views 注册表把关）', () => {
  // hash 语法层只认形态不认名单：#svfeed/foo 激活，syncRouteView 查注册表决定渲染
  assert.deepEqual(parseHash('#svfeed/foo'),
    { active: true, mid: null, view: 'foo', viewArg: null });
});
