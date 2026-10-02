// imgurl.js 纯逻辑单测（0.9.76）：封面 URL 归一 + 重试链决策。
// 立测背景：封面裂图三来源（http 混合内容被拦 / CDN 处理参数失败 / 瞬时网络抖动 + 失败
// 负缓存），修复的关键判定全在这两个纯函数里——纯函数化就是为了在这里钉死边界。
import { test } from 'node:test';
import assert from 'node:assert/strict';
var { coverUrl, coverAttempts } = await import('../../src/imgurl.js');

test('coverUrl：http→https、协议相对→https、实体解码、trim；query 与其它 scheme 原样', () => {
  assert.equal(coverUrl('http://a.cn/x.png'), 'https://a.cn/x.png');
  assert.equal(coverUrl('HTTP://a.cn/x.png'), 'https://a.cn/x.png');
  assert.equal(coverUrl('//a.cn/x.png'), 'https://a.cn/x.png');
  assert.equal(coverUrl('https://a.cn/x.png?a=1&amp;b=2'), 'https://a.cn/x.png?a=1&b=2');
  assert.equal(coverUrl('  https://a.cn/x.png  '), 'https://a.cn/x.png');
  // 带处理参数的 URL 不剥参数（0.9.40 教训：剥参数可能把带签名的图整条清空）
  assert.equal(coverUrl('https://a.cn/x.jpg?imageMogr2/format/webp'), 'https://a.cn/x.jpg?imageMogr2/format/webp');
  // 非 http 一律原样（测试夹具 data:、本地 blob:、相对路径）
  assert.equal(coverUrl('data:image/gif;base64,AAA'), 'data:image/gif;base64,AAA');
  assert.equal(coverUrl('blob:https://x/y'), 'blob:https://x/y');
  assert.equal(coverUrl('c.png'), 'c.png');
  // 空/junk → ''（调用方据此不挂 img，与旧行为一致）
  assert.equal(coverUrl(''), '');
  assert.equal(coverUrl('   '), '');
  assert.equal(coverUrl(null), '');
  assert.equal(coverUrl(undefined), '');
});

test('coverAttempts：data:/blob: 只一跳不重试；空输入空数组', () => {
  assert.deepEqual(coverAttempts('data:image/gif;base64,AAA'),
    [{ url: 'data:image/gif;base64,AAA', ref: 'no-referrer', delay: 0 }]);
  assert.deepEqual(coverAttempts('blob:https://x/y'),
    [{ url: 'blob:https://x/y', ref: 'no-referrer', delay: 0 }]);
  assert.deepEqual(coverAttempts(''), []);
  assert.deepEqual(coverAttempts(null), []);
});

test('coverAttempts：CI 处理参数形态 → 第二跳去 query 回原图；第三跳换原生 referer', () => {
  var a = coverAttempts('http://tx-free-imgs.acfun.cn/newUpload/x.jpg?imageMogr2/auto-orient/format/webp');
  assert.equal(a.length, 3);
  assert.equal(a[0].url, 'https://tx-free-imgs.acfun.cn/newUpload/x.jpg?imageMogr2/auto-orient/format/webp');
  assert.equal(a[0].ref, 'no-referrer');
  assert.equal(a[0].delay, 0);
  assert.equal(a[1].url, 'https://tx-free-imgs.acfun.cn/newUpload/x.jpg'); // 去 query 回原图
  assert.equal(a[1].delay, 600);
  assert.equal(a[2].url, a[1].url);
  // 原生页面同款 referer（host 白名单里必有 acfun.cn）：兜住宿主防盗链拒 no-referrer 的情况
  assert.equal(a[2].ref, 'strict-origin-when-cross-origin');
  assert.equal(a[2].delay, 1200);
  // imageView2/x-oss-process 同为处理参数形态，判定同路
  assert.equal(coverAttempts('https://a.cn/x.png?imageView2/1/w/160/h/90')[1].url, 'https://a.cn/x.png');
  assert.equal(coverAttempts('https://a.cn/x.png?x-oss-process=image/resize')[1].url, 'https://a.cn/x.png');
});

test('coverAttempts：普通 URL 第二跳追加 acsv_r 破缓存；签名类 query 绝不剥', () => {
  var a = coverAttempts('https://a.cn/x.png', 12345);
  assert.equal(a[0].url, 'https://a.cn/x.png');
  assert.equal(a[1].url, 'https://a.cn/x.png?acsv_r=12345'); // 每次必须换 URL：绕浏览器失败负缓存
  assert.equal(a[1].ref, 'no-referrer');
  var b = coverAttempts('https://a.cn/x.png?a=1', 7);
  assert.equal(b[1].url, 'https://a.cn/x.png?a=1&acsv_r=7'); // 已有 query 用 & 追加
  // 签名类 query（pkey/imgId 等）不是处理参数形态：保留原参数只加破缓存（0.9.40 同源教训）
  var c = coverAttempts('https://preview.ndcsk.com/ksc2/a.png?pkey=AA&imgId=BB', 7);
  assert.equal(c[1].url, 'https://preview.ndcsk.com/ksc2/a.png?pkey=AA&imgId=BB&acsv_r=7');
});
