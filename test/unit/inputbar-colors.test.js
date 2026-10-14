// inputbar.js 色表单测（0.9.239）：官方 70 色表是**真机实测的抄录件**——顺序/数量/取值都对得上
// docs/api-research.md §11.10 与预览稿 ⑫ 的对照表；改一处必须同步本文件（否则出口颜色与官方漂移）。
// 纯常量直采，零网络零 DOM（inputbar 的 document 用法都在函数体内）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { THEME_COLORS, STD_COLORS } = await import('../../src/inputbar.js');

test('色表：结构 = 主题 6×10 + 标准 1×10（面板 10 列、共 70 格）', () => {
  assert.equal(THEME_COLORS.length, 6);
  THEME_COLORS.forEach((r) => assert.equal(r.length, 10));
  assert.equal(STD_COLORS.length, 1);
  assert.equal(STD_COLORS[0].length, 10);
});

test('色表：逐格取值与顺序＝官方 data-color 抄录（主题首行＝黑白+6 主色+2 强调）', () => {
  assert.deepEqual(THEME_COLORS, [
    ['#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
    ['#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada'],
    ['#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5'],
    ['#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f'],
    ['#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#31859b', '#e36c09'],
    ['#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#205867', '#974806']
  ]);
  assert.deepEqual(STD_COLORS, [
    ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0']
  ]);
});

test('色表：全部是可落库的 6 位 #hex（渲染侧 [color] 白名单只认 hex）', () => {
  [].concat(...THEME_COLORS, ...STD_COLORS).forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/));
});
