// searchhist.js（搜索历史，0.9.151 零依赖叶子）单元测试：GM 桩=内存 map（走真实 GM 路径），
// 另覆盖无 GM 内存降级与坏原文（坏 JSON/非数组）两态。
// 背景与抽件理由见 src/searchhist.js 头注（空词态「最近搜索」的数据源；读每次问 GM 不缓存）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var store = {};
globalThis.GM_getValue = function (k, d) { return k in store ? store[k] : d; };
globalThis.GM_setValue = function (k, v) { store[k] = v; };
var { histList, histAdd, histClear } = await import('../../src/searchhist.js');

function reset() {
  store = {};
  globalThis.GM_getValue = function (k, d) { return k in store ? store[k] : d; };
  globalThis.GM_setValue = function (k, v) { store[k] = v; };
}

test('histAdd：新词在前、同词去重提前、空词不记', () => {
  reset();
  histAdd('星际');
  histAdd('ac娘');
  histAdd('星际'); // 提前 + 去重
  assert.deepEqual(histList(), ['星际', 'ac娘']);
  histAdd('   ');
  histAdd('');
  histAdd(null);
  assert.deepEqual(histList(), ['星际', 'ac娘']);
});

test('histAdd：上限 10（新词挤掉最旧）', () => {
  reset();
  for (var i = 0; i < 12; i++) histAdd('k' + i);
  var l = histList();
  assert.equal(l.length, 10);
  assert.equal(l[0], 'k11');
  assert.equal(l[9], 'k2');
});

test('histClear：清空', () => {
  reset();
  histAdd('a');
  histClear();
  assert.deepEqual(histList(), []);
});

test('histList：坏原文（坏 JSON/非数组/混入非串）退安全值，不抛', () => {
  reset();
  store.acsvSearchHist = '{不是 JSON';
  assert.deepEqual(histList(), []);
  store.acsvSearchHist = '{"a":1}';
  assert.deepEqual(histList(), []);
  store.acsvSearchHist = '["ok", 3, null, "fine"]';
  assert.deepEqual(histList(), ['ok', 'fine']); // 非串项滤掉
});

test('无 GM 环境：内存降级可读写（harness/降级路径）', async () => {
  reset();
  delete globalThis.GM_getValue;
  delete globalThis.GM_setValue;
  var m = await import('../../src/searchhist.js?nogn=' + Date.now()); // 新实例：不共享上面用例的内存
  m.histAdd('降级词');
  assert.deepEqual(m.histList(), ['降级词']);
  m.histClear();
  assert.deepEqual(m.histList(), []);
  reset();
});
