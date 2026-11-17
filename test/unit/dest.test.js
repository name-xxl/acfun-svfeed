// dest.js（落点策略注册表）单元测试：表穷举断言——ct × 宿主全格有出口、script×article 指向
// reader 类出口（0.9.326 行落点）、native 三源同一出站单出口（0.9.314 siteOnly）、
// 未知 ct 显式降级（null，不出静默外链——0.9.331「兜底跳原址掩盖漏分支」病灶的反面钉）。
// dest.js 静态 import 三出口件（cards/momentdetail/articleread），链上有 import 期环境触面
//——照 mypage.test.js 先垫全局桩再动态 import（node:test 零依赖，无 jsdom）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.__ACSV_VERSION__ = 'test';
globalThis.addEventListener = function () { };
globalThis.removeEventListener = function () { };
globalThis.localStorage = {
  getItem: function () { return null; },
  setItem: function () { },
  removeItem: function () { }
};
globalThis.document = {
  addEventListener: function () { },
  removeEventListener: function () { },
  hidden: false,
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { style: {}, setAttribute: function () { }, appendChild: function () { } };
  }
};

var { DEST, destOf, sourceUrlOf } = await import('../../src/dest.js');
var { openMomentDetail } = await import('../../src/momentdetail.js');
var { openArticleReader } = await import('../../src/articleread.js');
var { setItemOpener } = await import('../../src/cards.js');

test('dest 表穷举：契约三 ct × 两宿主全格有出口函数（新增 ct/宿主必须同步补格，缺格即红）', () => {
  assert.deepEqual(Object.keys(DEST).sort(), ['article', 'moment', 'video']); // panelitem 契约三型
  for (const ct of Object.keys(DEST)) {
    assert.equal(typeof DEST[ct].script, 'function', ct + '×script 缺出口');
    assert.equal(typeof DEST[ct].native, 'function', ct + '×native 缺出口');
  }
});

test('script 格语义：article 指向 reader 类出口（0.9.326）、moment 指向详情面板（0.9.218）', () => {
  assert.equal(DEST.article.script, openArticleReader);
  assert.equal(DEST.moment.script, openMomentDetail);
});

test('script×video 固定单条会话语境进播放层（0.9.173：动态语境视频不出右栏箭头）', () => {
  var opened = [];
  setItemOpener(function (pi, ctx) { opened.push([pi, ctx]); });
  DEST.video.script({ acId: 123, title: 't' });
  assert.equal(opened.length, 1);
  assert.equal(opened[0][0].acId, 123);
  assert.deepEqual(opened[0][1], { kind: 'single' }); // 会话语境逐字钉住——不许漂成列表/游走
});

test('native 三源同一出站单出口 siteOut（表内不许出现第二处外链出口，0.9.314）', () => {
  assert.equal(DEST.moment.native, DEST.video.native);
  assert.equal(DEST.video.native, DEST.article.native);
});

test('native 出站行为：href 优先；视频无 href 补 videoBase+acId（openRowSource 现状同款）', () => {
  var calls = [];
  globalThis.open = function (url, target) { calls.push([url, target]); return {}; };
  DEST.article.native({ ct: 'article', acId: 77, href: 'https://www.acfun.cn/a/ac77' });
  DEST.video.native({ ct: 'video', acId: 42 });
  assert.deepEqual(calls, [
    ['https://www.acfun.cn/a/ac77', '_blank'],
    ['https://www.acfun.cn/v/ac42', '_blank']
  ]);
});

test('未知 ct 无落点：destOf 返回 null（两宿主同），出站出口不出链（显式降级，不静默外链）', () => {
  assert.equal(destOf('live', false), null);
  assert.equal(destOf('live', true), null);
  assert.equal(destOf(undefined, false), null);
  assert.equal(destOf('', true), null);
  var calls = [];
  globalThis.open = function (url, target) { calls.push([url, target]); return {}; };
  DEST.video.native({ ct: 'live', id: 5 }); // 绕过 destOf 直调出口也要无链（sourceUrlOf 空串防线）
  assert.equal(calls.length, 0);
});

test('destOf：siteOnly 分派宿主；缺省＝脚本页宿主（opt 包不传逐字现状）', () => {
  assert.equal(destOf('article', false), openArticleReader);
  assert.equal(destOf('article', true), DEST.article.native);
  assert.equal(destOf('moment', undefined), openMomentDetail);
});

test('sourceUrlOf：id 三形状兼容（acId/momentId/id=repost 载荷）；未知 ct 或无 id 出空串', () => {
  assert.equal(sourceUrlOf(null), '');
  assert.equal(sourceUrlOf({ ct: 'video', href: 'https://x' }), 'https://x'); // href 优先
  assert.equal(sourceUrlOf({ ct: 'video', acId: 9 }), 'https://www.acfun.cn/v/ac9');
  assert.equal(sourceUrlOf({ ct: 'moment', momentId: 31 }), 'https://www.acfun.cn/moment/am31');
  assert.equal(sourceUrlOf({ ct: 'article', id: 55 }), 'https://www.acfun.cn/a/ac55');
  assert.equal(sourceUrlOf({ ct: 'live', id: 1 }), ''); // 未知 ct：无基址可拼，不猜测性出 URL
  assert.equal(sourceUrlOf({ ct: 'video' }), '');       // 无 id：不拼
});

test('防复制棘轮：dest.js 源里 window.open( 恰 1 处（siteOut）——注册表模块自身不许散布外链', () => {
  var txt = readFileSync(fileURLToPath(new URL('../../src/dest.js', import.meta.url)), 'utf8');
  assert.equal(txt.split('window.open(').length - 1, 1,
    '落点注册表只许 siteOut 一处外链；再添请扩 dest 表/复用出口（check-dest.mjs 同尺双向钉）');
});
