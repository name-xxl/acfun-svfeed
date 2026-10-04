// pickpop.js 定位纯函数单元测试（0.9.144 实报「弹出浮层的位置不是很合理」修复的机器化）：
// 病灶=定位只在插入瞬间算一次（内容到达前），且没有"按可用空间压高"；修法=内容到达后重算 +
// 垂直翻上/压高 + 水平右缘对齐锚点。这里把**几何决策**钉死（不拉 DOM）。
// 真机形态对照：docs/preview/pickpop-position.html（已确认稿）+ 用户截图（锚点贴底 → 被裁）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { pickPlaceOf } = await import('../../src/pickpop.js');

// 宿主=整页（left/top 0、无滚动）时的常用夹具；锚点 38×38
function anchor(left, top) { return { left: left, top: top, right: left + 38, bottom: top + 38 }; }
var HOST = { left: 0, top: 0, sl: 0, st: 0 };

test('下方空间充足 → 向下展开，顶边=锚点下缘+6，高度上限不低于自然高', () => {
  var r = pickPlaceOf(anchor(1000, 200), HOST, { w: 1710, h: 953 }, 260, 320);
  assert.equal(r.up, false);
  assert.equal(r.top, 200 + 38 + 6);
  assert.ok(r.maxH >= 420, 'maxH=' + r.maxH); // 420/64vh 上限内，不应被下方空间压
  assert.equal(Math.round(r.left + 260), 1038); // 右缘对齐锚点右缘
});

test('锚点贴底（用户截图情形）→ 翻到锚点上方，底边贴锚点上缘-6', () => {
  // 锚点底≈900、视口 953：下方只剩 ~39 < 240 且上方更宽裕 ⇒ 必须翻上
  var r = pickPlaceOf(anchor(1610, 862), HOST, { w: 1710, h: 953 }, 260, 420);
  assert.equal(r.up, true);
  var bottomInView = 862 - 6; // 弹层底边（视口坐标）
  // top（宿主坐标，宿主贴合视口）→ 底边 = top + 实际高（=min(自然高, maxH)）
  var h = Math.min(420, r.maxH);
  assert.ok(Math.abs(r.top + h - bottomInView) <= 1, 'top=' + r.top + ' h=' + h);
  assert.equal(Math.round(r.left + 260), 1648);
});

test('上下都不够（矮视口）→ 压高到可用空间，列表内部滚动（返回值即生效上限）', () => {
  var r = pickPlaceOf(anchor(400, 120), HOST, { w: 800, h: 400 }, 260, 500);
  assert.equal(r.up, false);
  var below = 400 - (120 + 38) - 6 - 8; // 228
  assert.ok(r.maxH <= below, 'maxH=' + r.maxH + ' below=' + below);
  assert.ok(r.maxH <= 400 * 0.64 + 0.01);
});

test('上方不足时不许翻上（下方虽小仍是更优解）', () => {
  // 锚点在中上部：下方 < 240 但上方更小 → 保持向下
  var r = pickPlaceOf(anchor(400, 60), HOST, { w: 800, h: 500 }, 260, 200);
  assert.equal(r.up, false);
});

test('水平：右缘越界 → 收进视口保 8px；左缘越界同理', () => {
  var r = pickPlaceOf(anchor(1690, 200), HOST, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r.left + 260), 1710 - 8); // 右收边
  var r2 = pickPlaceOf(anchor(0, 200), HOST, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r2.left), 8); // 左收边
});

test('宿主带滚动/偏移：返回值落在宿主内容坐标系（滚动跟随靠它）', () => {
  var host = { left: 0, top: -300, sl: 0, st: 120 };
  var r = pickPlaceOf(anchor(600, 500), host, { w: 1200, h: 800 }, 260, 200);
  // 向下：top = a.bottom(538) + GAP(6) − host.top(−300) + host.st(120)
  assert.equal(r.top, 538 + 6 + 300 + 120);
});
