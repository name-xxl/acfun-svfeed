// imgurl.js 纯逻辑单测（0.9.76）：封面 URL 归一 + 重试链决策。
// 立测背景：封面裂图三来源（http 混合内容被拦 / CDN 处理参数失败 / 瞬时网络抖动 + 失败
// 负缓存），修复的关键判定全在这两个纯函数里——纯函数化就是为了在这里钉死边界。
import { test } from 'node:test';
import assert from 'node:assert/strict';
var { coverUrl, coverAttempts, memoState, memoTrim } = await import('../../src/imgurl.js');

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
  // 第三跳也必须换 URL（0.9.77）：同一 URL 会吃浏览器失败负缓存、连请求都发不出去，
  // 与第二跳的换址理由同款——本跳在此基础上再挂一枚破缓存尾参
  assert.notEqual(a[2].url, a[1].url);
  assert.ok(/[?&]acsv_r3=\d+$/.test(a[2].url), a[2].url);
  // 原生页面同款 referer（host 白名单里必有 acfun.cn）：兜住宿主防盗链拒 no-referrer 的情况
  assert.equal(a[2].ref, 'strict-origin-when-cross-origin');
  assert.equal(a[2].delay, 1200);
  // 同一次决策内三跳 URL 两两互异（负缓存规避的硬要求）
  assert.equal(new Set([a[0].url, a[1].url, a[2].url]).size, 3);
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
  assert.equal(c[2].url, 'https://preview.ndcsk.com/ksc2/a.png?pkey=AA&imgId=BB&acsv_r=7&acsv_r3=7');
});

test('coverAttempts：重试抖动 ±20%（rnd 注入两端界；缺省恒 0.5=精确值，确定性不变）（0.9.166）', () => {
  var a0 = coverAttempts('https://x/a.png', 1000, () => 0);
  assert.equal(a0[1].delay, 540);
  assert.equal(a0[2].delay, 1080);
  var a1 = coverAttempts('https://x/a.png', 1000, () => 1);
  assert.equal(a1[1].delay, 660);
  assert.equal(a1[2].delay, 1320);
  var d = coverAttempts('https://x/a.png', 1000);
  assert.equal(d[1].delay, 600); // 缺省 roll=0.5 → ×1.0：既有断言与夹具节奏不受影响
  assert.equal(d[2].delay, 1200);
  assert.equal(d[0].delay, 0); // 首跳立即发，不抖
});

test('memoState：未记/命中/过期三分支；命中不续期、过期即清（0.9.77）', () => {
  var m = new Map();
  assert.equal(memoState(m, 'a.png', 1000, 60000), 'fresh');
  m.set('a.png', 1000);
  assert.equal(memoState(m, 'a.png', 1000 + 59999, 60000), 'dead');
  // 反复命中不得续期：时间戳原样（否则来回进出视图的死链永不过 TTL，复试机会消失）
  memoState(m, 'a.png', 1000 + 59999, 60000);
  memoState(m, 'a.png', 1000 + 59999, 60000);
  assert.equal(m.get('a.png'), 1000);
  // 过期：返回 expired 且旧记录即时清除 → 同一时刻再判已是 fresh（给一次复试机会）
  assert.equal(memoState(m, 'a.png', 1000 + 60000, 60000), 'expired');
  assert.equal(m.has('a.png'), false);
  assert.equal(memoState(m, 'a.png', 1000 + 60000, 60000), 'fresh');
});

test('memoTrim：超限按插入序淘汰最旧；未超限不动', () => {
  var m = new Map();
  ['a', 'b', 'c'].forEach(function (k) { m.set(k, 1); });
  memoTrim(m, 2);
  assert.equal(m.size, 2);
  assert.equal(m.has('a'), false);
  assert.equal(m.has('c'), true);
  memoTrim(m, 5);
  assert.equal(m.size, 2);
});
