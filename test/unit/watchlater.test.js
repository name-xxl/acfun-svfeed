// watchlaterapi.js 单元测试（0.9.279）：列表回包规整 + add/cancel 写链 body。
// 端点/参数取自 jadx（waitingList query pcursor/count；addWaiting/cancelWaiting form
// resourceId/resourceType）。登录态样本未取到，故这里只钉形状与请求体，不钉真机字段值。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { CFG } = await import('../../src/cfg.js');
var { waitingPageOf, listWaiting, addWaiting, cancelWaiting } = await import('../../src/watchlaterapi.js');

test('waitingPageOf：list + pcursor → items/cursor/noMore', () => {
  var page = waitingPageOf({ result: 0, list: [{ dougaId: '1' }, { dougaId: '2' }], pcursor: '123' });
  assert.equal(page.items.length, 2);
  assert.equal(page.cursor, '123');
  assert.equal(page.noMore, false);
});

test('waitingPageOf：no_more / 空页 / 缺 list 一律到底且游标清空', () => {
  assert.deepEqual(waitingPageOf({ list: [{ dougaId: '1' }], pcursor: 'no_more' }),
    { items: [{ dougaId: '1' }], cursor: '', noMore: true });
  assert.deepEqual(waitingPageOf({ list: [], pcursor: '9' }),
    { items: [], cursor: '', noMore: true });
  assert.deepEqual(waitingPageOf({}),
    { items: [], cursor: '', noMore: true });
});

test('listWaiting：POST query pcursor/count，回包走 waitingPageOf', async () => {
  var lastGm = null;
  globalThis.GM_xmlhttpRequest = function (opts) {
    lastGm = opts;
    opts.onload({ status: 200, responseText: '{"result":0,"pcursor":"no_more","list":[]}' });
  };
  var page = await listWaiting('');
  assert.ok(/app\/waitingList\?pcursor=&count=\d+$/.test(lastGm.url), lastGm.url);
  assert.equal(page.noMore, true);
});

// 真机回包已用内置浏览器登录态表单 POST 确认：addWaiting（新增/已存在）均为
// {"result":0}；api-new 无 CORS 头，必须走 GM 通道（request），不能走页面 fetch。
test('addWaiting / cancelWaiting：GM POST form resourceId + resourceType=2，result 0 判成功', async () => {
  var calls = [];
  var reply = '{"result":0}';
  globalThis.GM_xmlhttpRequest = function (opts) {
    calls.push(opts);
    opts.onload({ status: 200, responseText: reply });
  };
  assert.equal(await addWaiting({ id: 123 }), true);
  assert.equal(calls[0].url, CFG.api.waitingAdd);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].data, 'resourceId=123&resourceType=2');
  assert.ok(/application\/x-www-form-urlencoded/.test(calls[0].headers['Content-Type'] || ''));

  assert.equal(await cancelWaiting({ id: 456 }), true);
  assert.equal(calls[1].url, CFG.api.waitingCancel);
  assert.equal(calls[1].data, 'resourceId=456&resourceType=2');

  reply = '{"result":-401}';
  assert.equal(await addWaiting({ id: 789 }), false);
});
