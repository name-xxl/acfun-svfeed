// nameval.js 单元测试（0.9.160 自 data.test.js 迁入，用例逐字保持）：
// groupNameError / folderNameError（0.9.142；站点 chunk 实锤正则）——零依赖纯函数。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var { groupNameError, folderNameError } = await import('../../src/nameval.js');

test('组名/夹名校验：字符集与长度（站点 chunk 正则）+ 保留名', () => {
  assert.equal(groupNameError('舞'), '');
  assert.equal(groupNameError('abc_123'), '');
  assert.equal(groupNameError('一二三四五六七八'), '');   // 8 字上限
  assert.notEqual(groupNameError('一二三四五六七八九'), ''); // 9 字
  assert.notEqual(groupNameError('bad name'), '');  // 空格不许
  assert.notEqual(groupNameError('bad-name'), ''); // 连字符不许
  assert.notEqual(groupNameError(''), '');          // 空
  assert.notEqual(groupNameError('未分组'), '');     // 保留名
  assert.notEqual(groupNameError('特别关注'), '');
  assert.equal(folderNameError('我的收藏夹'), '');
  assert.notEqual(folderNameError('a'.repeat(41)), ''); // 40 上限
  assert.equal(folderNameError('a'.repeat(40)), '');
});
