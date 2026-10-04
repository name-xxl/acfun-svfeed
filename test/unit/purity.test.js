// player.js 顶层零副作用（架构不变量）：0.9.113（断 route→feedstore）与 0.9.115（断
// feedstore→player）两次清边后，route.test / followbadge.test 的 import 链都不再经过 player
// ——原先由链顺带承担的「顶层零副作用」检验在此显式补回（0.9.115）。
// 检验口径：最小垫桩下 Node 直载 player.js（及其整条 import 子链）不得抛错。链上模块级
// 副作用只允许是「注册到浏览器 API 的监听/存储触点」（垫桩可吸收）；DOM 构造、网络、GM
// 调用等一律视为污染即红。
// **垫桩集为 0.9.115 实测得来，非推测**：六件套（window / __ACSV_DEBUG__ / addEventListener /
// removeEventListener / localStorage / document）系逐一实测确定的最小集。将来 player 图里
// 新增第七个顶层浏览器 API 使用 ⇒ **扩展垫桩**，不是放宽/删除断言（本测试的存在意义即钉住
// 该不变量）——先怀疑新增代码，再怀疑垫桩。
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

test('player.js 顶层零副作用：最小垫桩下 Node 直载不抛（0.9.115 显式补回）', async () => {
  await assert.doesNotReject(() => import('../../src/player.js'));
});
