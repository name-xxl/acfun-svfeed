// route.js（路由解析）单元测试：Node 内置 test 运行器，零依赖。
// 契约：hash 语法扩展（0.9.62）——数字段=竖刷深链 #svfeed/<id>、字母段=子视图
// #svfeed/<view>/<arg>，两者语法互斥；脏输入一律降级为非竖刷路由，不许抛错。
// 0.9.72 再加一手标记深链 #svfeed/v/<meowId>、#svfeed/a/<acId>：id 跨两张详情表
// （小视频 meowId / 推荐 acId）语法同形无法分辨，故地址栏一律写标记形态；标记段
// 优先于视图段但必须带数字段（#svfeed/v 裸字母仍算视图名，形状同 #svfeed/foo）。
// route.js 静态 import 链（0.9.113 起）：route → cfg → dbg（模块级读 window）——不再经
// feedstore→player 的 comments/report 链，垫片只剩 dbg 所需两项。player 顶层零副作用的
// 检验已由 purity.test 显式钉住（0.9.115）——本链与 followbadge 链都不再经过 player
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { parseHash } = await import('../../src/route.js');

test('深链形态：#svfeed 与 #svfeed/<数字> 激活且不产生视图段', () => {
  assert.deepEqual(parseHash('#svfeed'), { active: true, mid: null, src: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#svfeed/48820714'),
    { active: true, mid: '48820714', src: null, view: null, viewArg: null });
  // 全锚定语法（0.9.62 顺修）：#svfeed/ 空段与 #svfeedother 前缀粘连不算竖刷路由
  assert.equal(parseHash('#svfeed/').active, false);
  assert.equal(parseHash('#svfeedother').active, false);
});

test('标记深链（0.9.72）：v=meowId→sv 源、a=acId→home 源，均不产生视图段', () => {
  assert.deepEqual(parseHash('#svfeed/v/48820714'),
    { active: true, mid: '48820714', src: 'sv', view: null, viewArg: null });
  assert.deepEqual(parseHash('#svfeed/a/42455525'),
    { active: true, mid: '42455525', src: 'home', view: null, viewArg: null });
  // 空数字段 = 脏输入，同 #svfeed/ 一律非竖刷
  assert.equal(parseHash('#svfeed/v/').active, false);
  assert.equal(parseHash('#svfeed/a/').active, false);
});

test('标记段不吞视图名：裸字母 v/a 仍是视图（必须带数字段才算深链）', () => {
  assert.deepEqual(parseHash('#svfeed/v'),
    { active: true, mid: null, src: null, view: 'v', viewArg: null });
  assert.deepEqual(parseHash('#svfeed/a'),
    { active: true, mid: null, src: null, view: 'a', viewArg: null });
});

test('子视图形态：字母段=视图、第二个数字段=参数', () => {
  assert.deepEqual(parseHash('#svfeed/my'), { active: true, mid: null, src: null, view: 'my', viewArg: null });
  assert.deepEqual(parseHash('#svfeed/zone/59'),
    { active: true, mid: null, src: null, view: 'zone', viewArg: '59' });
});

test('搜索视图关键词段（0.9.72）：非数字参数放行且 URL 解码；坏编码原样不抛', () => {
  assert.deepEqual(parseHash('#svfeed/search'),
    { active: true, mid: null, src: null, view: 'search', viewArg: null });
  assert.deepEqual(parseHash('#svfeed/search/' + encodeURIComponent('小说')),
    { active: true, mid: null, src: null, view: 'search', viewArg: '小说' });
  assert.equal(parseHash('#svfeed/search/a%20b').viewArg, 'a b');
  assert.equal(parseHash('#svfeed/search/%E4%B8').viewArg, '%E4%B8'); // 截断编码：原样返回不抛
  assert.equal(parseHash('#svfeed/my/anything').viewArg, 'anything'); // 其它视图同样放行（视图层自判）
});

test('互斥：字母段不吞数字深链，数字段不产生视图，注册视图名不被标记段吃掉', () => {
  var num = parseHash('#svfeed/123');
  assert.equal(num.view, null);
  assert.equal(num.mid, '123');
  var alpha = parseHash('#svfeed/my');
  assert.equal(alpha.mid, null);
  // my/zone 不是标记字母：绝不能因「标记优先」被降级
  assert.equal(alpha.src, null);
  var zone = parseHash('#svfeed/zone/59');
  assert.equal(zone.src, null);
  assert.equal(zone.view, 'zone');
  assert.equal(zone.viewArg, '59');
});

test('播放层形态（0.9.74）：#svfeed/play/<v|a>/<id> → view=play + viewArg=id + src 带空间标记，不填 mid', () => {
  // 不填 mid 是契约：播放层自解析（playlayer），不走 mount 的深链置顶路径，竖刷缓冲/源记忆都不动
  assert.deepEqual(parseHash('#svfeed/play/a/48820714'),
    { active: true, mid: null, src: 'home', view: 'play', viewArg: '48820714' });
  assert.deepEqual(parseHash('#svfeed/play/v/11053531'),
    { active: true, mid: null, src: 'sv', view: 'play', viewArg: '11053531' });
  // 裸 #svfeed/play（缺标记与 id）仍落视图分支：由 playlayer 出"链接不完整"错误态
  assert.deepEqual(parseHash('#svfeed/play'),
    { active: true, mid: null, src: null, view: 'play', viewArg: null });
  // 脏输入：缺 id / 非 v|a 标记 一律不激活
  assert.equal(parseHash('#svfeed/play/a/').active, false);
  assert.equal(parseHash('#svfeed/play/x/123').active, false);
});

test('非竖刷 hash：inactive 且各段为空', () => {
  assert.deepEqual(parseHash(''), { active: false, mid: null, src: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#otherroute'), { active: false, mid: null, src: null, view: null, viewArg: null });
  assert.deepEqual(parseHash('#svfeedother'), { active: false, mid: null, src: null, view: null, viewArg: null });
});

test('脏输入：null/undefined 不抛错', () => {
  assert.equal(parseHash(null).active, false);
  assert.equal(parseHash(undefined).active, false);
});

test('未知视图名也激活路由（视图存在性由 views 注册表把关）', () => {
  // hash 语法层只认形态不认名单：#svfeed/foo 激活，syncRouteView 查注册表决定渲染
  assert.deepEqual(parseHash('#svfeed/foo'),
    { active: true, mid: null, src: null, view: 'foo', viewArg: null });
});
