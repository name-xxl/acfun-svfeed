// searchhist.js（0.9.151 叶子；0.9.158 后端=**站方 searchCache**）单元测试：
// localStorage 桩=内存 map（走真实读取路径）；覆盖站方语义（去重提前 / 上限 8 / 清除=移除键）
// 与迁移（老 GM 键一次性并入、老键不删）、降级（无 localStorage）。
// 语义依据：站方 searchBox 组件源码 `parse||[] → filter 去重 → unshift → splice(8) → setItem`
// （docs/api-research.md §4.10；2026-10-05 反查实证）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var store = {};
function resetLS() {
  store = {};
  globalThis.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  delete globalThis.GM_getValue;
}
resetLS();

var n = 0;
async function fresh() { return await import('../../src/searchhist.js?f=' + (++n)); } // 新实例：模块内 merged 状态隔离

test('histAdd：新在前、去重提前、空词不记、写入前剥标签字符（站方把词拼进 HTML）', async () => {
  resetLS();
  var h = await fresh();
  h.histAdd('星际');
  h.histAdd('ac娘');
  h.histAdd('星际'); // 提前 + 去重
  assert.deepEqual(h.histList(), ['星际', 'ac娘']);
  h.histAdd('   ');
  h.histAdd('');
  h.histAdd(null);
  assert.deepEqual(h.histList(), ['星际', 'ac娘']);
  h.histAdd('<b>坏词</b>');
  assert.deepEqual(h.histList(), ['b坏词/b', '星际', 'ac娘']);
  // 落库在站方键上、且是 JSON 数组
  assert.equal(store.searchCache, JSON.stringify(['b坏词/b', '星际', 'ac娘']));
});

test('上限 8（站方 splice(8) 语义）：第 9 个词挤掉最旧', async () => {
  resetLS();
  var h = await fresh();
  for (var i = 0; i < 9; i++) h.histAdd('k' + i);
  var l = h.histList();
  assert.equal(l.length, 8);
  assert.equal(l[0], 'k8');
  assert.equal(l[7], 'k1'); // k0 被挤掉
});

test('histList：读到站方已有键（新在前原序）；坏 JSON/非数组/混入非串退安全值', async () => {
  resetLS();
  var h = await fresh();
  store.searchCache = JSON.stringify(['站方甲', '站方乙']);
  assert.deepEqual(h.histList(), ['站方甲', '站方乙']);
  store.searchCache = '{不是 JSON';
  assert.deepEqual(h.histList(), []);
  store.searchCache = '{"a":1}';
  assert.deepEqual(h.histList(), []);
  store.searchCache = JSON.stringify(['ok', 3, null, 'fine']);
  assert.deepEqual(h.histList(), ['ok', 'fine']);
});

test('histClear：移除站方键（原生「清除历史」实测同款）', async () => {
  resetLS();
  var h = await fresh();
  h.histAdd('a');
  assert.ok(store.searchCache);
  h.histClear();
  assert.equal(store.searchCache, undefined);
  assert.deepEqual(h.histList(), []);
});

test('迁移：老 GM 键 acsvSearchHist 首次读并入（去重/过滤/过上限），老键不删', async () => {
  resetLS();
  store.searchCache = JSON.stringify(['新词', '老重叠']);
  var legacy = JSON.stringify(['老重叠', '老甲', '<i>老乙</i>']);
  globalThis.GM_getValue = function (k) { return k === 'acsvSearchHist' ? legacy : ''; };
  var h = await fresh();
  var l = h.histList();
  // 合并序=站方词原序在前 + 老键词原序追加在后（不扰动原生面板历史序）；去重留站方那条；过滤标签字符
  assert.deepEqual(l, ['新词', '老重叠', '老甲', 'i老乙/i']);
  assert.equal(store.searchCache, JSON.stringify(l)); // 合并已落库
  assert.equal(globalThis.GM_getValue('acsvSearchHist'), legacy); // 老键不删（回滚友好）
  delete globalThis.GM_getValue;
});

test('histClear 后不再回头合老键（用户明确要清）', async () => {
  resetLS();
  globalThis.GM_getValue = function () { return JSON.stringify(['老词']); };
  var h = await fresh();
  h.histClear();
  assert.deepEqual(h.histList(), []);
  delete globalThis.GM_getValue;
});

test('无 localStorage：内存降级可读写（禁用/异常环境不抛）', async () => {
  resetLS();
  delete globalThis.localStorage;
  var h = await fresh();
  h.histAdd('降级词');
  assert.deepEqual(h.histList(), ['降级词']);
  h.histClear();
  assert.deepEqual(h.histList(), []);
  resetLS();
});
