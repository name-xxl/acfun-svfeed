// historyapi.js 单元测试（0.9.279）：单条/清空写链 body 与 comboId 守卫。
// 端点参数取自 jadx（delete=form comboIds；deleteAll=form resourceTypes）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { CFG } = await import('../../src/cfg.js');
var { deleteHistory, clearHistory } = await import('../../src/historyapi.js');

// api-new 无 CORS 头，写链必须走 GM 通道（request）；这里钉 GM 请求体与 result 0 判据。
test('deleteHistory：GM POST form comboIds；缺 comboId 不发请求', async () => {
  var calls = [];
  globalThis.GM_xmlhttpRequest = function (opts) {
    calls.push(opts);
    opts.onload({ status: 200, responseText: '{"result":0}' });
  };
  assert.equal(await deleteHistory({ comboId: '9001' }), true);
  assert.equal(calls[0].url, CFG.api.historyDelete);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].data, 'comboIds=9001');
  assert.equal(await deleteHistory({}), false);
  assert.equal(calls.length, 1);
});

test('clearHistory：GM POST form resourceTypes=1&resourceTypes=2', async () => {
  var last = null;
  globalThis.GM_xmlhttpRequest = function (opts) {
    last = opts;
    opts.onload({ status: 200, responseText: '{"result":0}' });
  };
  assert.equal(await clearHistory(), true);
  assert.equal(last.url, CFG.api.historyDeleteAll);
  assert.equal(last.data, 'resourceTypes=1&resourceTypes=2');
});

test('非 0 result 失败（-401/1）', async () => {
  var reply = '{"result":-401}';
  globalThis.GM_xmlhttpRequest = function (opts) {
    opts.onload({ status: 200, responseText: reply });
  };
  assert.equal(await deleteHistory({ comboId: '1' }), false);
  reply = '{"result":1}';
  assert.equal(await clearHistory(), false);
});
