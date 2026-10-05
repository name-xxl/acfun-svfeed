// favapi.js 回包规整单元测试（0.9.159 域归域自 data.test.js 迁入，用例逐字保持）：
// folderListOf / folderIdOf（0.9.143，样本形状为 2026-10-04 真机抓包）——纯函数直采，
// Node 内置 test 运行器，零网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';

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
var { folderListOf, folderIdOf } = await import('../../src/favapi.js');

// ---------- 收藏夹契约（0.9.143；样本形状为 2026-10-04 真机抓包） ----------
test('folderListOf：夹表规整（id 字符串 / count / inFolder 勾选态）', () => {
  var fs = folderListOf({ result: 0, dataList: [
    { folderId: 25698647, name: '默认收藏夹', resourceCount: 7, inFolder: false },
    { folderId: '73414454', name: 'AC', resourceCount: 10, inFolder: true },
    { name: '无 id 丢弃' }
  ]});
  assert.equal(fs.length, 2);
  assert.deepEqual(fs[0], { id: '25698647', name: '默认收藏夹', count: 7, inFolder: false });
  assert.equal(fs[1].inFolder, true);
  assert.deepEqual(folderListOf(null), []);
});

test('folderIdOf：建夹响应 data.folderId（真机形状）/ 缺 data 回空', () => {
  assert.equal(folderIdOf({ result: 0, data: { folderId: '77466978', name: '临时验证夹', resourceCount: 0 } }), '77466978');
  assert.equal(folderIdOf({ result: 0 }), '');
  assert.equal(folderIdOf(null), '');
});
