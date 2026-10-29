// pubfab.js 右下角基准纯函数单元测试（0.9.295 真机实报「脚本页没对齐」的机器化）。
//
// 病灶：回顶在脚本视图内是 position:sticky，横向基准是滚动容器**内容盒**
// （.acsv-view-body padding-right 24 + .acsv-backtop margin 6 + 容器自己的经典滚动条宽）；
// 浮标是 position:fixed，基准是 ICB（不含滚动条）⇒ 两者恒差一条滚动条宽。
// 真机实测（用户截图，Windows Chromium scrollbar-width:thin）：图标中心横差 9.5px。
// **无头 Chromium 用覆盖式滚动条（宽 0）⇒ harness 里两钮严丝合缝**，这条缝只能靠运行时量
// （docs/api-research §10.15 同类盲区：滚动条宽度类缺陷只能在真机/补偿逻辑上验）。
//
// 本测试钉的是补偿算术：right = 基准(30) + max(0, offsetWidth − clientWidth)。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { cornerRightOf } = await import('../../src/pubfab.js');

test('cornerRightOf：覆盖式滚动条（无占位）→ 原值 30', () => {
  assert.equal(cornerRightOf(1000, 1000, 30), 30);
});

test('cornerRightOf：经典细滚动条 9px → 39（真机实测 9.5px 的整数近似）', () => {
  assert.equal(cornerRightOf(1000, 991, 30), 39);
});

test('cornerRightOf：经典滚动条 15px（Windows 默认）→ 45', () => {
  assert.equal(cornerRightOf(1200, 1185, 30), 45);
});

test('cornerRightOf：clientWidth 缺失/NaN → 归零不回退成负偏移', () => {
  assert.equal(cornerRightOf(1000, undefined, 30), 30);
  assert.equal(cornerRightOf(undefined, undefined, 30), 30);
  assert.equal(cornerRightOf(1000, 'abc', 30), 30);
});

test('cornerRightOf：clientW 反大于 offsetW（非滚动元素取整抖动）→ 不产生负补偿', () => {
  assert.equal(cornerRightOf(1000, 1001, 30), 30);
});

test('cornerRightOf：浅色基准 24 同款适用（函数不认皮肤，基准由调用方给）', () => {
  assert.equal(cornerRightOf(1000, 989, 24), 35);
});
