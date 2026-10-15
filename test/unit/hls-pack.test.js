// src/hls.js 内嵌串压缩往返单测（0.9.242）：build.js 以 deflateRaw+base64 压缩内嵌
// hls.light.min.js，unpackHls 须解回原文（len 语义=原文字节数，源自 __ACSV_HLS_LEN__）；
// 脏输入/长度不符一律 null（失败静默下沉 CDN 链，不抛）。
// 垫桩：hls.js → cfg/dbg 链需要最小 window/__ACSV_DEBUG__（同 purity.test.js 口径）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
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

var { unpackHls } = await import('../../src/hls.js');
var HLS_PATH = fileURLToPath(new URL('../../node_modules/hls.js/dist/hls.light.min.js', import.meta.url));

test('unpackHls：deflateRaw+base64 往返还原 hls.light.min.js 原文（build.js 同款压缩）', () => {
  var raw = fs.readFileSync(HLS_PATH);
  var packed = zlib.deflateRawSync(raw, { level: 9 }).toString('base64');
  var out = unpackHls(packed, raw.length);
  assert.equal(typeof out, 'string');
  assert.equal(Buffer.byteLength(out, 'utf8'), raw.length);
  assert.equal(out, raw.toString('utf8'));
});

test('unpackHls：脏输入/长度不符一律 null（失败下沉 CDN 链，不抛）', () => {
  var raw = fs.readFileSync(HLS_PATH);
  var packed = zlib.deflateRawSync(raw, { level: 9 }).toString('base64');
  assert.equal(unpackHls('', 0), null); // 串缺失
  assert.equal(unpackHls(null, 100), null);
  assert.equal(unpackHls(packed, raw.length + 1), null); // 长度不符（截断/版本漂移）
  assert.equal(unpackHls('@@@not-base64@@@', raw.length), null); // 非法 base64（atob 抛）
  assert.equal(unpackHls(packed.slice(0, packed.length >> 1), raw.length), null); // 半截串
});
