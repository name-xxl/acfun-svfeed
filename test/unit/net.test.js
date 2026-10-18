// net.js 游客传输决策 + 写链凭证不变（0.9.278）：
// transportPlan 纯函数直采；gmRequest 的 anonymous 透传；requestRead 跟随 guestRead；
// postForm 永远 credentials:'include'（互动/评论/转发/上报的写链不受游客开关影响）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var store = {};
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};

var { transportPlan, gmRequest, requestRead } = await import('../../src/net.js');
var { setSetting } = await import('../../src/settings.js');
var { postForm } = await import('../../src/appapi.js');

var lastGm = null;
globalThis.GM_xmlhttpRequest = function (opts) {
  lastGm = opts;
  opts.onload({ status: 200, responseText: '{"result":0}' });
};

test('transportPlan：登录态保持 GM/XHR 原行为', () => {
  assert.deepEqual(transportPlan('https://www.acfun.cn/rest/x', false, true, 'https://www.acfun.cn'),
    { kind: 'gm', anonymous: false });
  assert.deepEqual(transportPlan('https://www.acfun.cn/rest/x', false, false, 'https://www.acfun.cn'),
    { kind: 'xhr', withCredentials: true });
});

test('transportPlan：游客态 GM anonymous / 跨域 XHR 无凭证 / 同源无 GM fail closed', () => {
  assert.deepEqual(transportPlan('https://api-new.app.acfun.cn/rest/x', true, true, 'https://www.acfun.cn'),
    { kind: 'gm', anonymous: true });
  assert.deepEqual(transportPlan('https://api-new.app.acfun.cn/rest/x', true, false, 'https://www.acfun.cn'),
    { kind: 'xhr', withCredentials: false });
  assert.deepEqual(transportPlan('https://www.acfun.cn/rest/x', true, false, 'https://www.acfun.cn'),
    { kind: 'reject', reason: 'guest-no-gm' });
});

test('gmRequest：anonymous 透传', async () => {
  lastGm = null;
  await gmRequest({ url: 'https://api-new.app.acfun.cn/rest/x', anonymous: true });
  assert.equal(lastGm.anonymous, true);
  lastGm = null;
  await gmRequest({ url: 'https://api-new.app.acfun.cn/rest/x' });
  assert.equal(lastGm.anonymous, false);
});

test('requestRead：跟随 guestRead，开/关都走 GM anonymous 对应值', async () => {
  setSetting('guestRead', true);
  lastGm = null;
  await requestRead('https://api-new.app.acfun.cn/rest/app/x', 'GET');
  assert.equal(lastGm.anonymous, true);

  setSetting('guestRead', false);
  lastGm = null;
  await requestRead('https://api-new.app.acfun.cn/rest/app/x', 'GET');
  assert.equal(lastGm.anonymous, false);
});

test('postForm：写链永远 credentials:include，不受 guestRead 影响', async () => {
  var lastFetch = null;
  globalThis.fetch = function (url, opts) {
    lastFetch = { url: url, opts: opts };
    return Promise.resolve({
      status: 200,
      json: function () { return Promise.resolve({ result: 0 }); }
    });
  };
  setSetting('guestRead', true);
  await postForm('https://www.acfun.cn/rest/pc-direct/comment/like', 'sourceId=1');
  assert.equal(lastFetch.opts.credentials, 'include');
  assert.equal(lastFetch.opts.method, 'POST');
});
