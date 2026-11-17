// dynemot.js 纯函数单元测试（0.9.346；node:test）——只测 splitCodes 分段本体（DOM 手术与
// MO 重扫腿在 harness：dynemot/dynemot-off 场景）。垫片照 settings.test.js 惯例（dynemot
// 求值链 import emoticon/dbg，模块级需 window 与 localStorage 在场）。
// 方言口径钉死（api-research §22：唯一未映射族 `[emot=组,/]`，组=\w+ 号=\d+）：
// 不匹配形态必须**原样成 text 段**——「宁可不换不可换错」的解析面保证。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.localStorage = { getItem: function () { return null; }, setItem: function () { }, removeItem: function () { } };

var { splitCodes } = await import('../../src/dynemot.js');

function segTypes(r) { return r.segs.map(function (s) { return s.t; }).join(','); }

test('无码文本：codes=0，单 text 段原样', () => {
  var r = splitCodes('今天也要加油');
  assert.equal(r.codes, 0);
  assert.equal(r.segs.length, 1);
  assert.equal(r.segs[0].v, '今天也要加油');
});

test('单码居中：text/emot/text 三段，pkg/id/raw 齐', () => {
  var r = splitCodes('早啊[emot=acfun,1656/]收工');
  assert.equal(r.codes, 1);
  assert.equal(segTypes(r), 'text,emot,text');
  assert.deepEqual({ pkg: r.segs[1].pkg, id: r.segs[1].id, raw: r.segs[1].raw },
    { pkg: 'acfun', id: '1656', raw: '[emot=acfun,1656/]' });
});

test('紧邻双码无间隙：emot,emot 两段相邻产出，不吞不漏', () => {
  var r = splitCodes('[emot=acfun,1656/][emot=acfun,1673/]');
  assert.equal(r.codes, 2);
  assert.equal(segTypes(r), 'emot,emot');
});

test('表外形态不匹配原样 text（§22 方言边界）：id 非全数字 / 包名含非法字符', () => {
  var r = splitCodes('[emot=ac,27a/][emot=AC!X,1/]');
  assert.equal(r.codes, 0);
  assert.equal(r.segs[0].v, '[emot=ac,27a/][emot=AC!X,1/]');
  // 大写包名 \w 合法（acfun 主包名即小写，老包存在大小写形态）：AC,1 应匹配
  assert.equal(splitCodes('[emot=AC,1/]').codes, 1);
});

test('首尾贴码 + 中段混合：段序与内容逐字节核对', () => {
  var r = splitCodes('[emot=acfun,1656/]中间[emot=acfun,1673/]尾');
  assert.equal(r.codes, 2);
  assert.equal(segTypes(r), 'emot,text,emot,text');
  assert.equal(r.segs[1].v, '中间');
  assert.equal(r.segs[3].v, '尾');
});

test('空串：零段零码不抛错', () => {
  var r = splitCodes('');
  assert.equal(r.codes, 0);
  assert.equal(r.segs.length, 0);
});
