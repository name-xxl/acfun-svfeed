// tokenedit.js 单测（0.9.221）：令牌区间扫描 / 镜像层 HTML —— 纯函数直采，零网络。
// （attachTokenEdit 是事件绑定，行为断言在 harness：镜像层出图 + 退格整块删）
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { tokenRanges, mirrorHtml } = await import('../../src/tokenedit.js');

// 断言**按切片**写，不硬编码令牌长度——长度手数极易错（本文件初版就错了两次），
// 结构断言才是这里真正要钉的东西
test('tokenRanges：表情/图片两种令牌各成整块，起点升序且互不重叠', () => {
  var v = 'a[emot=acfun,123/]b[img=图片]https://i/x.jpg[/img]c';
  var r = tokenRanges(v);
  assert.equal(r.length, 2);
  assert.equal(v.slice(r[0][0], r[0][1]), '[emot=acfun,123/]');
  assert.equal(v.slice(r[1][0], r[1][1]), '[img=图片]https://i/x.jpg[/img]');
  assert.equal(r[0][0], 1);                    // 前面隔一个 'a'
  assert.equal(v[r[0][1]], 'b');               // 结束正好落在 'b' 上
  assert.ok(r[1][0] > r[0][1]);                // 升序不重叠
});

test('tokenRanges：无令牌/空串/非串入参都给空数组（调用方不必先判空）', () => {
  assert.deepEqual(tokenRanges('纯文本没有令牌'), []);
  assert.deepEqual(tokenRanges(''), []);
  assert.deepEqual(tokenRanges(null), []);
  assert.deepEqual(tokenRanges(undefined), []);
  // 半个令牌（被劈开的残留）**不算令牌**——正是要防的碎裂态
  assert.deepEqual(tokenRanges('[emot=acfun,123'), []);
  assert.deepEqual(tokenRanges('[img=图片]https://i/x.jpg'), []);
});

test('tokenRanges：紧邻/夹在文中都正确（不合并、不越界）', () => {
  var v = '[emot=acfun,1/][emot=acfun,2/]';
  var r = tokenRanges(v);
  assert.equal(r.length, 2);
  assert.equal(v.slice(r[0][0], r[0][1]), '[emot=acfun,1/]');
  assert.equal(v.slice(r[1][0], r[1][1]), '[emot=acfun,2/]');
  assert.equal(r[1][0], r[0][1]);              // 紧邻：第二块起点＝第一块终点
  assert.equal(r[1][1], v.length);             // 收尾正好到串尾
  var v2 = '前[emot=acfun,1/]后';
  var r2 = tokenRanges(v2);
  assert.equal(v2.slice(r2[0][0], r2[0][1]), '[emot=acfun,1/]');
  assert.equal(v2[r2[0][0] - 1], '前');
  assert.equal(v2[r2[0][1]], '后');
});

test('mirrorHtml：令牌交给 renderToken，其余文本 esc；拼接后位置与原文一致', () => {
  var seen = [];
  var html = mirrorHtml('a<b [emot=acfun,123/] c>d', function (raw) {
    seen.push(raw);
    return '<i>EM</i>';
  });
  assert.equal(html, 'a&lt;b <i>EM</i> c&gt;d');
  assert.deepEqual(seen, ['[emot=acfun,123/]']); // renderToken 收到的是**原文**
  // 无令牌：整段 esc
  assert.equal(mirrorHtml('<x>', function () { return 'X'; }), '&lt;x&gt;');
  assert.equal(mirrorHtml('', function () { return 'X'; }), '');
  assert.equal(mirrorHtml(null, function () { return 'X'; }), '');
});
