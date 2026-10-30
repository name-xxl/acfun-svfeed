// pagekind.js（页面类型分类器）单元测试：Node 内置 test 运行器，零依赖。
// 纯函数叶子（收 {hostname,pathname}），无需 window 桩。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pageKind, SPACE_UID_RE, memberCenterPath } from '../../src/pagekind.js';

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

test('member 判据＝SPACE_UID_RE 单源：分类与注入共用同一枚正则（0.9.303，旧"哨兵"只比 pageKind 自己=假守卫）', () => {
  ['/u/1', '/u/12345', '/u/12345/tab', '/u/abc', '/up/1', '/user/1', '/'].forEach(function (p) {
    assert.equal(kind(p) === 'member', SPACE_UID_RE.test(p), p);
  });
  // 捕获组语义（消费点取 uid）：pageKind 归 member 的必须能抓到数字 uid
  assert.equal('/u/12345/tab'.match(SPACE_UID_RE)[1], '12345');
});

test('memberCenter：/member 及子路径归 memberCenter，memberPath 单源同判（0.9.303 收编 boot 裸正则）', () => {
  assert.equal(kind('/member'), 'memberCenter');
  assert.equal(kind('/member/feeds'), 'memberCenter');
  assert.equal(kind('/member/feeds/following'), 'memberCenter');
  assert.equal(kind('/moment/am123'), 'other'); // /member 前缀不等于 /member 段
  assert.equal(kind('/u/1'), 'member');         // 空间页与个人中心不同类
  assert.equal(memberCenterPath('/member/x'), true);
  assert.equal(memberCenterPath('/memberx'), false);
});

test('防复制回归：/u/(\\d+) 与 /member(\\/|$) 判据字面全 src 唯 pagekind.js（消费点只许 import）', () => {
  // 只钉「被收编的原字面形态」（棘轮=防同一枚正则再被抄走）；memberplaza.feedsPath 的
  // /^\/member\/feeds\/?$/ 是另一判据（feeds 主页面），不在射程
  var dir = new URL('../../src/', import.meta.url);
  var DUPE_U = '/^\\/u\\/(\\d+)/';          // 源文本里的正则字面（含捕获组，=注入判据全形）
  var DUPE_MC = '/^\\/member(\\/|$)/';      // 个人中心判据原形
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    if (f === 'pagekind.js') continue;
    var txt = readFileSync(fileURLToPath(new URL(f, dir)), 'utf8');
    if (txt.includes(DUPE_U)) {
      assert.fail('src/' + f + ' 再现裸 /u/(\\d+) 字面——走 pagekind.SPACE_UID_RE（0.9.303）');
    }
    if (txt.includes(DUPE_MC)) {
      assert.fail('src/' + f + ' 再现裸 /member 判据字面——走 pagekind.memberCenterPath（0.9.303）');
    }
  }
});

test('pageKind：脏输入容错（缺字段/非字符串不抛错）', () => {
  assert.equal(pageKind(null), 'other');
  assert.equal(pageKind({}), 'other');
  assert.equal(pageKind({ hostname: 'message.acfun.cn' }), 'native');
  assert.equal(pageKind({ pathname: 123 }), 'other');
});
