// pagekind.js（页面类型分类器）单元测试：Node 内置 test 运行器，零依赖。
// 纯函数叶子（收 {hostname,pathname}），无需 window 桩。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageKind } from '../../src/pagekind.js';

function kind(pathname, hostname) {
  return pageKind({ hostname: hostname || 'www.acfun.cn', pathname: pathname });
}

test('pageKind：native —— message.acfun.cn 全路径归 native（不论路径形态）', () => {
  assert.equal(kind('/', 'message.acfun.cn'), 'native');
  assert.equal(kind('/message', 'message.acfun.cn'), 'native');
  assert.equal(kind('/v/ac123', 'message.acfun.cn'), 'native');
});

test('pageKind：home —— 仅根路径（带 query 由 location.pathname 天然剥离）', () => {
  assert.equal(kind('/'), 'home');
  assert.equal(kind(''), 'other'); // 空路径不是首页
  assert.equal(kind('/index.html'), 'other');
});

test('pageKind：video / article —— /v/、/a/ 前缀', () => {
  assert.equal(kind('/v/ac123456'), 'video');
  assert.equal(kind('/v/ab123'), 'video');
  assert.equal(kind('/a/ac123456'), 'article');
  assert.equal(kind('/bangumi/aa123'), 'other');
});

test('pageKind：member —— /u/<数字> 前缀（含子路径），非数字不归 member', () => {
  assert.equal(kind('/u/12345'), 'member');
  assert.equal(kind('/u/12345/tab/video'), 'member');
  assert.equal(kind('/u/abc'), 'other');
  assert.equal(kind('/up/12345'), 'other');
});

test('pageKind：other —— 其余全归（搜索/榜单/工具页/路径别名）', () => {
  assert.equal(kind('/search'), 'other');
  assert.equal(kind('/list/1'), 'other');
  assert.equal(kind('/svfeed'), 'other'); // route.js 的路径别名，非页面分类
});

test('pageKind：member 判据与 uppage 的 /u/(\\d+) 逐字一致（两处漂移=静默丢功能）', () => {
  var RE = /^\/u\/(\d+)/; // uppage.tryInjectSpace 的判据（同源同改的哨兵）
  ['/u/1', '/u/12345', '/u/12345/tab', '/u/abc', '/up/1', '/user/1', '/'].forEach(function (p) {
    assert.equal(kind(p) === 'member', RE.test(p), p);
  });
});

test('pageKind：脏输入容错（缺字段/非字符串不抛错）', () => {
  assert.equal(pageKind(null), 'other');
  assert.equal(pageKind({}), 'other');
  assert.equal(pageKind({ hostname: 'message.acfun.cn' }), 'native');
  assert.equal(pageKind({ pathname: 123 }), 'other');
});
