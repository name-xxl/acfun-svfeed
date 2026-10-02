// release.js（更新提示）单元测试：Node 内置 test 运行器，零依赖。
// 纯函数区契约：任何脏输入（null/缺字段/畸形 XML）不许抛错，只许降级；
// 版本比较必须逐段数值比（字典序 0.10.0 < 0.9.59 是经典误判）；XML 实体解码
// &amp; 恒最后替（&amp;lt; 不得双重解码穿到 '<'）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 依赖链 release→net/ui→cfg→dbg 在模块顶层读 window（dbg.js），且 dbg 顶层读构建期
// define __ACSV_DEBUG__——Node 直采源码时两个都要先垫再动态 import（ubb.test.js 同款）
globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { normVer, cmpVersion, xmlDec, parseRelAtom, latestEntry, findEntry, decideUpd }
  = await import('../../src/release.js');

// ---------- normVer ----------
test('normVer：剥 v 前缀与 -debug 后缀，大小写与空白容忍', () => {
  assert.equal(normVer('v0.9.59'), '0.9.59');
  assert.equal(normVer('V0.9.60'), '0.9.60');
  assert.equal(normVer('0.9.59-debug'), '0.9.59');
  assert.equal(normVer(' 0.9.1 '), '0.9.1');
  assert.equal(normVer(null), '');
  assert.equal(normVer(undefined), '');
  assert.equal(normVer(''), '');
});

// ---------- cmpVersion ----------
test('cmpVersion：等值/大小/位数不齐', () => {
  assert.equal(cmpVersion('0.9.59', '0.9.59'), 0);
  assert.equal(cmpVersion('v0.9.59', '0.9.59'), 0);      // tag 前缀不参与
  assert.equal(cmpVersion('0.9.59', '0.9.59-debug'), 0); // debug 后缀不参与
  assert.equal(cmpVersion('0.9.60', '0.9.59'), 1);
  assert.equal(cmpVersion('0.9.59', '0.9.60'), -1);
  assert.equal(cmpVersion('1.0.0', '0.9.99'), 1);
  assert.equal(cmpVersion('0.9', '0.9.0'), 0);           // 缺段补 0
  assert.equal(cmpVersion('', ''), 0);
});

test('cmpVersion：0.10.0 与 0.9.59 必须逐段数值比（字典序经典误判）', () => {
  assert.equal(cmpVersion('0.10.0', '0.9.59'), 1);
  assert.equal(cmpVersion('0.9.59', '0.10.0'), -1);
  assert.equal(cmpVersion('0.10.0', '0.10.0'), 0);
});

// ---------- xmlDec ----------
test('xmlDec：&amp; 恒最后替——&amp;lt; 落回 &lt; 不双重解码', () => {
  assert.equal(xmlDec('&amp;lt;'), '&lt;');
  assert.equal(xmlDec('&amp;amp;'), '&amp;');
  assert.equal(xmlDec('&lt;p&gt;a&amp;b&lt;/p&gt;'), '<p>a&b</p>');
  assert.equal(xmlDec('&quot;x&quot;&apos;y&apos;'), '"x"\'y\'');
  assert.equal(xmlDec(null), '');
  // HTML 层自己的实体（&#39; 等）不在 XML 层解码——留给浏览器 innerHTML 消费
  assert.equal(xmlDec('&amp;#39;'), '&#39;');
});

// ---------- parseRelAtom ----------
// 官方格式样本（节选真实结构：entry 含 id/link/tag/title/content，content 为 XML 转义的 HTML）
var ATOM = '<?xml version="1.0" encoding="UTF-8"?>'
  + '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-US">'
  + '<id>tag:github.com,2008:https://github.com/name-xxl/acfun-svfeed/releases</id>'
  + '<title>Release notes from acfun-svfeed</title>'
  + '<entry>'
  + '<id>tag:github.com,2008:Repository/123456/v0.9.60</id>'
  + '<updated>2026-10-02T12:00:00Z</updated>'
  + '<link rel="alternate" type="text/html" href="https://github.com/name-xxl/acfun-svfeed/releases/tag/v0.9.60"/>'
  + '<title>0.9.60 更新提示</title>'
  + '<author><name>name-xxl</name></author>'
  + '<content type="html">&lt;h2&gt;更新内容&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;检查更新 &amp;amp; 弹窗提示&lt;/li&gt;&lt;/ul&gt;&lt;p&gt;元数据键 &amp;lt;code&amp;gt;@updateURL&amp;lt;/code&amp;gt; 反引号包裹&lt;/p&gt;</content>'
  + '</entry>'
  + '<entry>'
  + '<id>tag:github.com,2008:Repository/123456/v0.9.59</id>'
  + '<link rel="alternate" type="text/html" href="https://github.com/name-xxl/acfun-svfeed/releases/tag/v0.9.59"/>'
  + '<title type="html">0.9.59</title>'
  + '</entry>'
  + '</feed>';

test('parseRelAtom：抽取 tag/title/html，HTML 层实体留给浏览器', () => {
  var list = parseRelAtom(ATOM);
  assert.equal(list.length, 2);
  assert.equal(list[0].tag, 'v0.9.60');
  assert.equal(list[0].title, '0.9.60 更新提示');
  // XML 层解码后是合法 HTML；content 里的字面 &lt;code&gt;（XML 层写成 &amp;lt;）保住不穿
  assert.equal(list[0].html, '<h2>更新内容</h2><ul><li>检查更新 &amp; 弹窗提示</li></ul>'
    + '<p>元数据键 &lt;code&gt;@updateURL&lt;/code&gt; 反引号包裹</p>');
  assert.equal(list[1].tag, 'v0.9.59');
  assert.equal(list[1].title, '0.9.59');
  assert.equal(list[1].html, ''); // 无 content 的条目降级为空正文
});

test('parseRelAtom：无 entry/脏输入一律空数组不抛错', () => {
  assert.deepEqual(parseRelAtom('<feed><title>x</title></feed>'), []);
  assert.deepEqual(parseRelAtom(''), []);
  assert.deepEqual(parseRelAtom(null), []);
  assert.deepEqual(parseRelAtom(undefined), []);
  assert.deepEqual(parseRelAtom(12345), []);
  assert.deepEqual(parseRelAtom('not xml at all <entry> <entry>'), []); // 无 tag 的条目被跳过
  // tag 抽取自 releases/tag/ 路径；缺 link/id 的条目整条跳过
  assert.deepEqual(parseRelAtom('<entry><title>只有标题</title></entry>'), []);
});

// ---------- latestEntry ----------
test('latestEntry：按版本号取最大，不信条目顺序（编辑旧 release 会被顶到首位）', () => {
  var edited = [{ tag: 'v0.9.50', html: '<p>old</p>' }, { tag: 'v0.9.59', html: '<p>new</p>' }];
  assert.equal(latestEntry(edited).tag, 'v0.9.59');
  assert.equal(latestEntry(parseRelAtom(ATOM)).tag, 'v0.9.60');
  assert.equal(latestEntry([]), null);
  assert.equal(latestEntry(null), null);
  assert.equal(latestEntry([{ tag: '' }, null]), null); // 全脏条目
});

// ---------- findEntry ----------
test('findEntry：tag 归一后匹配当前版本，未发布返回 undefined', () => {
  var list = parseRelAtom(ATOM);
  assert.equal(findEntry(list, '0.9.59').tag, 'v0.9.59');
  assert.equal(findEntry(list, 'v0.9.59').tag, 'v0.9.59');
  assert.equal(findEntry(list, '0.9.58'), undefined);
  assert.equal(findEntry(null, '0.9.59'), undefined);
});

// ---------- decideUpd ----------
var CUR = '0.9.59';
test('decideUpd：有新版本——未提醒弹窗/已提醒 toast/已忽略静默', () => {
  assert.equal(decideUpd({}, CUR, '0.9.60'), 'popup');
  assert.equal(decideUpd(null, CUR, '0.9.60'), 'popup'); // 状态缺失当空
  assert.equal(decideUpd({ notified: '0.9.60' }, CUR, '0.9.60'), 'toast');
  assert.equal(decideUpd({ ignored: '0.9.60' }, CUR, '0.9.60'), 'none');
  // 忽略的是旧版本、又来了新版本：恢复提醒
  assert.equal(decideUpd({ ignored: '0.9.60' }, CUR, '0.9.61'), 'popup');
  // v 前缀 tag 与状态里归一值等价
  assert.equal(decideUpd({ ignored: 'v0.9.60' }, CUR, '0.9.60'), 'none');
});

test('decideUpd：已是最新——seen 缺失/不同弹当前版本说明，相同则静默', () => {
  assert.equal(decideUpd({}, CUR, '0.9.59'), 'updated');
  assert.equal(decideUpd(null, CUR, undefined), 'updated'); // 拿不到 latest 也走已更新分支
  assert.equal(decideUpd({ seen: '0.9.58' }, CUR, '0.9.59'), 'updated');
  assert.equal(decideUpd({ seen: CUR }, CUR, '0.9.59'), 'none');
  assert.equal(decideUpd({ seen: CUR, ignored: '0.9.60' }, CUR, '0.9.60'), 'none');
});

test('decideUpd：latest 低于当前（回滚/怪发布）按已更新分支走，不报新版本', () => {
  assert.equal(decideUpd({ seen: CUR }, CUR, '0.9.50'), 'none');
  assert.equal(decideUpd({}, CUR, '0.9.50'), 'updated');
});
