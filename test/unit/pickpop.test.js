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
// 宿主默认=整页（left/top 0、right=视口宽、无滚动）；宿主比锚宽时取宿主左缘当让位基准
var HOST = { left: 0, top: 0, right: 1710, sl: 0, st: 0 };

test('下方空间充足 → 向下展开，顶边=锚点下缘+6，高度上限不低于自然高', () => {
  var r = pickPlaceOf(anchor(1000, 200), HOST, { w: 1710, h: 953 }, 260, 320);
  assert.equal(r.up, false);
  assert.equal(r.top, 200 + 38 + 6);
  assert.ok(r.maxH >= 420, 'maxH=' + r.maxH); // 420/64vh 上限内，不应被下方空间压
  // 水平（0.9.146）：右缘 = min(宿主左缘=0, 锚左=1000) − 10 = -10 → 出视口左缘 ⇒ 翻宿主右侧（宿右=1710 +10）→ 再收边
  assert.equal(Math.round(r.left + 260), 1710 - 8);
});

test('锚点贴底（用户截图情形）→ 翻到锚点上方，底边贴锚点上缘-6', () => {
  // 锚点底≈900、视口 953：下方只剩 ~39 < 240 且上方更宽裕 ⇒ 必须翻上
  var HOSTR = { left: 0, top: 0, right: 1710, sl: 0, st: 0 }; // rail 形态：宿主右缘=视口右缘
  var r = pickPlaceOf(anchor(1610, 862), HOSTR, { w: 1710, h: 953 }, 260, 420);
  assert.equal(r.up, true);
  var bottomInView = 862 - 6; // 弹层底边（视口坐标）
  // top（宿主坐标，宿主贴合视口）→ 底边 = top + 实际高（=min(自然高, maxH)）
  var h = Math.min(420, r.maxH);
  assert.ok(Math.abs(r.top + h - bottomInView) <= 1, 'top=' + r.top + ' h=' + h);
  // 水平（0.9.146）：右缘 = 宿主左缘(0) − 10 ⇒ 负数 → 翻宿主右侧并收边（宿右=1710）
  assert.equal(Math.round(r.left + 260), 1710 - 8);
});

test('按头像/宿主列让位：宿主比锚宽（rail 头像块 48 vs 关注角标 20）时取宿主左缘', () => {
  // rail 实测几何：宿主（头像块）left=1622、关注角标 left=1652；两者都要让开 ⇒ 取 1622
  var host = { left: 1622, top: 300, right: 1670, sl: 0, st: 0 };
  var r = pickPlaceOf(anchor(1652, 340), host, { w: 1710, h: 953 }, 260, 240);
  assert.equal(Math.round(r.left + 260 + host.left), 1622 - 10); // 右缘（视口坐标）= 宿主左缘 − 10
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

test('水平：左侧放不下 → 翻宿主右侧；两侧都不行 → 视口收边', () => {
  // 宿主居左（left=0）、锚也靠左 ⇒ 左侧无空间 → 左缘 = 宿右(400) + 10
  var host = { left: 0, top: 0, right: 400, sl: 0, st: 0 };
  var r = pickPlaceOf(anchor(60, 200), host, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r.left), 400 + 10);
  // 宿主居中：左侧宽裕 → 右缘 = 宿主左缘(600) − 10
  var host2 = { left: 600, top: 0, right: 1000, sl: 0, st: 0 };
  var r2 = pickPlaceOf(anchor(900, 200), host2, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r2.left + 260 + 600), 600 - 10);
});

test('宿主带滚动/偏移：返回值落在宿主内容坐标系（滚动跟随靠它）', () => {
  var host = { left: 0, top: -300, sl: 0, st: 120 };
  var r = pickPlaceOf(anchor(600, 500), host, { w: 1200, h: 800 }, 260, 200);
  // 向下：top = a.bottom(538) + GAP(6) − host.top(−300) + host.st(120)
  assert.equal(r.top, 538 + 6 + 300 + 120);
});
