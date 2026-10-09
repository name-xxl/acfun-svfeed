// momentpost.js 单测（0.9.220）：发布参数组装 / 字数口径 / 回包结果映射——纯函数直采，零网络
// （dimsOf 依赖 DOM Image，不在此列）。契约依据 docs/api-research.md §11（真机实测）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.location = { href: 'https://www.acfun.cn/', pathname: '/' };
var { momentParams, momentCharCount, MOMENT_MAX, postResultOf, publishRequest } = await import('../../src/momentpost.js');

test('momentParams：纯文字默认形态——四字段齐、shareResourceType 恒 0、imgs 空数组', () => {
  var p = JSON.parse(momentParams('你好'));
  assert.deepEqual(p, { content: '你好', imgs: [], shareResourceType: 0, visibleForFans: false });
  // 可见范围：仅粉丝
  assert.equal(JSON.parse(momentParams('x', { visibleForFans: true })).visibleForFans, true);
  // content 缺省/非串都归一成串（服务端 140000 负责拦空内容，不在客户端造第二套规则）
  assert.equal(JSON.parse(momentParams()).content, '');
  assert.equal(JSON.parse(momentParams(null)).content, '');
});

test('momentParams：imgs 只收 url/width/height 三字段且数值归一（服务端契约 imgs=[{url,width,height}]）', () => {
  var p = JSON.parse(momentParams('图文', { imgs: [{ url: 'https://i/a.jpg', width: '640', height: 480 }, { url: 'https://i/b.jpg' }] }));
  assert.deepEqual(p.imgs, [
    { url: 'https://i/a.jpg', width: 640, height: 480 },
    { url: 'https://i/b.jpg', width: 0, height: 0 }
  ]);
});

test('momentParams：转发按源类型填族内字段（动态=repostMomentId / 视频·文章=repostResourceType+Id）', () => {
  var m = JSON.parse(momentParams('转发语', { repost: { ct: 'moment', id: 5104362 } }));
  assert.equal(m.repostMomentId, 5104362);
  assert.equal(m.repostResourceType, undefined);
  var v = JSON.parse(momentParams('', { repost: { ct: 'video', id: 488900 } }));
  assert.deepEqual([v.repostResourceType, v.repostResourceId], [2, 488900]);
  assert.equal(v.repostMomentId, undefined);
  var a = JSON.parse(momentParams('', { repost: { ct: 'article', id: 48879687 } }));
  assert.deepEqual([a.repostResourceType, a.repostResourceId], [3, 48879687]);
  // 未知源类型：不填任何 repost 字段（宁缺勿猜——服务端 21 会拦下）
  var u = JSON.parse(momentParams('', { repost: { ct: 'live', id: 1 } }));
  assert.equal(u.repostMomentId, undefined);
  assert.equal(u.repostResourceType, undefined);
});

test('momentCharCount：口径＝原始长度（码元），233 边界与服务端线一致', () => {
  assert.equal(momentCharCount(''), 0);
  assert.equal(momentCharCount('一'), 1);
  assert.equal(momentCharCount('a'.repeat(MOMENT_MAX)), MOMENT_MAX);
  assert.equal(momentCharCount('a'.repeat(MOMENT_MAX + 1)), MOMENT_MAX + 1);
  // 表情令牌**整块计 1 字**（真机 2026-10-10 旁证：raw 240 含一个令牌被服务端接受 ⇒ 成本 ≤10 字）
  assert.equal(momentCharCount('[emot=acfun,123/]'), 1);
  assert.equal(momentCharCount('a[emot=acfun,123/]b'), 3);
  assert.equal(momentCharCount('[img=图片]https://i/x.jpg[/img]'), 1);
  assert.equal(momentCharCount('图[img=图片]https://i/x.jpg[/img]后'), 3);
  // 代理对（emoji）按码元计 2——与 String.length 同口径，服务端按什么计同样待真机
  assert.equal(momentCharCount('😀'), 2);
  assert.equal(momentCharCount(null), 0);
});

test('postResultOf：成功取 momentId；失败按码分档（notlogin/param/content/other）', () => {
  assert.deepEqual(postResultOf({ result: 0, moment: { momentId: '5104362' } }), { ok: true, momentId: 5104362 });
  assert.deepEqual(postResultOf({ result: 0, momentId: 7 }), { ok: true, momentId: 7 });
  assert.deepEqual(postResultOf({ result: 0 }), { ok: true, momentId: 0 });
  var nl = postResultOf({ result: -401, error_msg: 'token value error' });
  assert.equal(nl.kind, 'notlogin');
  assert.equal(nl.msg, 'token value error');
  assert.equal(postResultOf({ result: 21, error_msg: '参数格式错误，请仔细阅读API文档。' }).kind, 'param');
  assert.equal(postResultOf({ result: 140000, error_msg: '内容长度必须为1-233' }).kind, 'content');
  assert.equal(postResultOf({ result: 140002 }).kind, 'other');
  // 140011＝发帖频率限制（2026-10-10 真机实拍：首发成功、紧接着第二条被拒）
  assert.equal(postResultOf({ result: 140011, error_msg: '操作太频繁了，请稍后再试' }).kind, 'ratelimit');
  assert.equal(postResultOf(null).ok, false);
});

test('publishRequest：**必须带 APP 设备头集**（GM 通道无 Referer ⇒ 头集是过网关的通行证）', () => {
  var r = publishRequest('你好', { imgs: [], visibleForFans: false });
  assert.match(r.url, /\/rest\/app\/moment\/add\?product=ACFUN_APP&app_version=/);
  // 2026-10-10 真机：只发 Content-Type 会被网关拒成 result 708「无效的请求」
  ['acPlatform', 'deviceType', 'net', 'productId', 'udid', 'resolution', 'market', 'requestTime']
    .forEach((k) => assert.ok(r.headers[k], '缺设备头 ' + k));
  assert.equal(r.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(r.body.slice(0, 7), 'params=');
  assert.equal(JSON.parse(decodeURIComponent(r.body.slice(7))).content, '你好');
});
