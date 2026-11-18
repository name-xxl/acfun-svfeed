// upload.js 两条路一张表（0.9.348）：路由决议纯函数直采 + GM mock 钉管线接线。
// 契约依据 docs/api-research.md §11.11（全链真机实测）：动态路必须走 APP 域端点 +
// android-moment-text（换 newUpload 长期地址）；评论路 pc-direct + web-comment-text 零扰动。
// 端点/bizFlag 字面在此**独立钉死**（不读 CFG 回环）——CFG 漂移即红，正是测试的意义。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.location = { href: 'https://www.acfun.cn/', pathname: '/' };

var { uploadImage, uploadRouteOf } = await import('../../src/upload.js');

// ---- 路由决议（纯函数） ----

test('uploadRouteOf：缺省＝评论路原形（pc-direct + web-comment-text，零扰动）', () => {
  var r = uploadRouteOf();
  assert.equal(r.tokenUrl, 'https://www.acfun.cn/rest/pc-direct/image/upload/getToken');
  assert.equal(r.urlAfterUpload, 'https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload');
  assert.equal(r.bizFlag, 'web-comment-text');
  assert.deepEqual(r.headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
  // opts.bizFlag 覆换缝仍在（0.9.220），且不误入动态路
  assert.equal(uploadRouteOf({ bizFlag: 'x-other' }).bizFlag, 'x-other');
  assert.equal(uploadRouteOf({ bizFlag: 'x-other' }).tokenUrl, r.tokenUrl);
});

test('uploadRouteOf：moment=true＝动态路（APP 域端点 + 官方 bizFlag + 设备头集 + 识别查询串）', () => {
  var r = uploadRouteOf({ moment: true });
  // 端点域才是决定因素（§11.11 探针①②：pc-direct 即使带 android-moment-text 仍回 ksc2 签名）
  assert.match(r.tokenUrl, /^https:\/\/api-new\.app\.acfun\.cn\/rest\/app\/image\/upload\/getToken\?product=ACFUN_APP&app_version=/);
  assert.match(r.urlAfterUpload, /^https:\/\/api-new\.app\.acfun\.cn\/rest\/app\/image\/upload\/getUrlAfterUpload\?product=ACFUN_APP&app_version=/);
  assert.equal(r.bizFlag, 'android-moment-text'); // 反编译 ACImageUploader$BizFlag.MomentImg 官方值
  // GM 通道无 Referer ⇒ 设备头集是过网关的通行证（§11.4c 同口径，探针④ no-referrer 全链验证）
  ['acPlatform', 'deviceType', 'net', 'productId', 'udid', 'resolution', 'market', 'requestTime']
    .forEach((k) => assert.ok(r.headers[k], '缺设备头 ' + k));
  assert.equal(r.headers['Content-Type'], 'application/x-www-form-urlencoded');
});

// ---- 管线接线（GM mock 抓请求序列） ----

var calls = [];
globalThis.GM_xmlhttpRequest = function (opts) {
  calls.push(opts);
  var u = opts.url;
  if (u.indexOf('getToken') !== -1) return opts.onload({ status: 200, responseText: '{"result":0,"info":{"token":"tok"}}' });
  if (u.indexOf('/api/upload/fragment') !== -1) return opts.onload({ status: 200, responseText: '{"result":1}' });
  if (u.indexOf('/api/upload/complete') !== -1) return opts.onload({ status: 200, responseText: '{"result":1}' });
  if (u.indexOf('getUrlAfterUpload') !== -1) {
    var moment = /bizFlag=android-moment-text/.test(String(opts.data));
    var url = moment ? 'https://imgs.aixifan.com/newUpload/42_abc' : 'https://preview.ndcsk.com/ksc2/x?pkey=p&imgId=i';
    return opts.onload({ status: 200, responseText: JSON.stringify({ result: 0, url: url }) });
  }
  opts.onload({ status: 200, responseText: '{"result":0}' });
};
var file = { name: 'probe.png', size: 100, slice: function () { return 'chunk'; } };

test('uploadImage：动态路全链接线——getToken/换URL 打 APP 域、bizFlag 官方值、头集随行', async () => {
  calls = [];
  var url = await uploadImage(file, { moment: true });
  assert.equal(url, 'https://imgs.aixifan.com/newUpload/42_abc'); // 长期地址原样回（管线不改写）
  assert.equal(calls.length, 4); // getToken → fragment → complete → getUrlAfterUpload
  assert.match(calls[0].url, /api-new\.app\.acfun\.cn\/rest\/app\/image\/upload\/getToken\?product=ACFUN_APP/);
  assert.ok(calls[0].headers.acPlatform, 'getToken 缺设备头');
  assert.match(calls[1].url, /^https:\/\/upload\.kuaishouzt\.com\/api\/upload\/fragment\?upload_token=tok&fragment_id=0$/);
  assert.match(calls[2].url, /\/api\/upload\/complete\?upload_token=tok&fragment_count=1$/);
  assert.match(calls[3].url, /api-new\.app\.acfun\.cn\/rest\/app\/image\/upload\/getUrlAfterUpload\?product=ACFUN_APP/);
  assert.match(calls[3].data, /bizFlag=android-moment-text/);
  assert.ok(calls[3].headers.acPlatform, '换 URL 缺设备头');
});

test('uploadImage：缺省评论路零扰动——pc-direct 端点、web-comment-text、无设备头', async () => {
  calls = [];
  var url = await uploadImage(file);
  assert.equal(url, 'https://preview.ndcsk.com/ksc2/x?pkey=p&imgId=i'); // 签名 URL 原样回（comment/add 服务端改写）
  assert.equal(calls[0].url, 'https://www.acfun.cn/rest/pc-direct/image/upload/getToken');
  assert.equal(calls[3].url, 'https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload');
  assert.match(calls[3].data, /bizFlag=web-comment-text/);
  assert.equal(calls[0].headers.acPlatform, undefined);
  assert.deepEqual(calls[0].headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
});

test('uploadImage：多分片顺序逐一 + complete 报数（两路共用图床段）', async () => {
  calls = [];
  var big = { name: 'big.png', size: (1 << 20) * 2 + 5, slice: function () { return 'chunk'; } };
  await uploadImage(big, { moment: true });
  var frags = calls.filter((c) => c.url.indexOf('/api/upload/fragment') !== -1);
  assert.deepEqual(frags.map((c) => /fragment_id=(\d+)/.exec(c.url)[1]), ['0', '1', '2']);
  assert.match(calls[calls.length - 2].url, /fragment_count=3$/);
});

test('uploadImage：任何一步失败统一落 null（getToken 拒 / 网络错）', async () => {
  var orig = globalThis.GM_xmlhttpRequest;
  globalThis.GM_xmlhttpRequest = function (opts) {
    if (opts.url.indexOf('getToken') !== -1) return opts.onload({ status: 200, responseText: '{"result":1}' });
    opts.onload({ status: 200, responseText: '{"result":1}' });
  };
  assert.equal(await uploadImage(file, { moment: true }), null);
  globalThis.GM_xmlhttpRequest = function (opts) { opts.onerror(); };
  assert.equal(await uploadImage(file, { moment: true }), null);
  globalThis.GM_xmlhttpRequest = orig;
});