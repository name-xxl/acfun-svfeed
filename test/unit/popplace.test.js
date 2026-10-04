// popplace.js 定位纯函数单元测试（0.9.149 统一收口：两套模型一份实现）。
//   A) anchorPlaceOf —— 按钮旁选择层（0.9.144 实报「弹出浮层的位置不是很合理」修复的机器化：
//      定位只在插入瞬间算一次 + 无按可用空间压高 ⇒ 内容到达后长出视口被裁；修法=内容到达后重算
//      + 垂直翻上/压高 + 水平**按头像/宿主列让位**（右缘 = min(宿主左缘,锚点左缘)−10；0.9.146））。
//   B) rowPlaceOf —— 行/面板贴靠（0.9.105 用户裁决几何：右缘贴行左缘、**底对齐**；原 sharepanel.placePop，
//      0.9.149 并入本件时顺带修了它把"视口坐标的 minL/maxL"与"内容坐标的 left"混比的老毛病）。
// 真机/形态对照：docs/preview/pickpop-position.html + pickpop-align.html（均已确认）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { anchorPlaceOf, rowPlaceOf } = await import('../../src/popplace.js');

// 宿主=整页（left/top 0、无滚动）时的常用夹具；锚点 38×38
function anchor(left, top) { return { left: left, top: top, right: left + 38, bottom: top + 38 }; }
// 宿主默认=整页（left/top 0、right=视口宽、无滚动）；宿主比锚宽时取宿主左缘当让位基准
var HOST = { left: 0, top: 0, right: 1710, sl: 0, st: 0 };

// ---------- A) 按钮旁选择层 ----------

test('A 下方空间充足 → 向下展开，顶边=锚点下缘+6，高度上限不低于自然高', () => {
  var r = anchorPlaceOf(anchor(1000, 200), HOST, { w: 1710, h: 953 }, 260, 320);
  assert.equal(r.up, false);
  assert.equal(r.top, 200 + 38 + 6);
  assert.ok(r.maxH >= 420, 'maxH=' + r.maxH); // 420/64vh 上限内，不应被下方空间压
  // 水平（0.9.146）：右缘 = min(宿主左缘=0, 锚左=1000) − 10 = -10 → 出视口左缘 ⇒ 翻宿主右侧（宿右=1710 +10）→ 再收边
  assert.equal(Math.round(r.left + 260), 1710 - 8);
});

test('A 锚点贴底（用户截图情形）→ 翻到锚点上方，底边贴锚点上缘-6', () => {
  // 锚点底≈900、视口 953：下方只剩 ~39 < 240 且上方更宽裕 ⇒ 必须翻上
  var HOSTR = { left: 0, top: 0, right: 1710, sl: 0, st: 0 }; // rail 形态：宿主右缘=视口右缘
  var r = anchorPlaceOf(anchor(1610, 862), HOSTR, { w: 1710, h: 953 }, 260, 420);
  assert.equal(r.up, true);
  var bottomInView = 862 - 6; // 弹层底边（视口坐标）
  // top（宿主坐标，宿主贴合视口）→ 底边 = top + 实际高（=min(自然高, maxH)）
  var h = Math.min(420, r.maxH);
  assert.ok(Math.abs(r.top + h - bottomInView) <= 1, 'top=' + r.top + ' h=' + h);
  // 水平（0.9.146）：右缘 = 宿主左缘(0) − 10 ⇒ 负数 → 翻宿主右侧并收边（宿右=1710）
  assert.equal(Math.round(r.left + 260), 1710 - 8);
});

test('A 按头像/宿主列让位：宿主比锚宽（rail 头像块 48 vs 关注角标 20）时取宿主左缘', () => {
  // rail 实测几何：宿主（头像块）left=1622、关注角标 left=1652；两者都要让开 ⇒ 取 1622
  var host = { left: 1622, top: 300, right: 1670, sl: 0, st: 0 };
  var r = anchorPlaceOf(anchor(1652, 340), host, { w: 1710, h: 953 }, 260, 240);
  assert.equal(Math.round(r.left + 260 + host.left), 1622 - 10); // 右缘（视口坐标）= 宿主左缘 − 10
});

test('A 上下都不够（矮视口）→ 压高到可用空间，列表内部滚动（返回值即生效上限）', () => {
  var r = anchorPlaceOf(anchor(400, 120), HOST, { w: 800, h: 400 }, 260, 500);
  assert.equal(r.up, false);
  var below = 400 - (120 + 38) - 6 - 8; // 228
  assert.ok(r.maxH <= below, 'maxH=' + r.maxH + ' below=' + below);
  assert.ok(r.maxH <= 400 * 0.64 + 0.01);
});

test('A 上方不足时不许翻上（下方虽小仍是更优解）', () => {
  // 锚点在中上部：下方 < 240 但上方更小 → 保持向下
  var r = anchorPlaceOf(anchor(400, 60), HOST, { w: 800, h: 500 }, 260, 200);
  assert.equal(r.up, false);
});

test('A 水平：左侧放不下 → 翻宿主右侧；两侧都不行 → 视口收边', () => {
  // 宿主居左（left=0）、锚也靠左 ⇒ 左侧无空间 → 左缘 = 宿右(400) + 10
  var host = { left: 0, top: 0, right: 400, sl: 0, st: 0 };
  var r = anchorPlaceOf(anchor(60, 200), host, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r.left), 400 + 10);
  // 宿主居中：左侧宽裕 → 右缘 = 宿主左缘(600) − 10
  var host2 = { left: 600, top: 0, right: 1000, sl: 0, st: 0 };
  var r2 = anchorPlaceOf(anchor(900, 200), host2, { w: 1710, h: 953 }, 260, 200);
  assert.equal(Math.round(r2.left + 260 + 600), 600 - 10);
});

test('A 宿主带滚动/偏移：返回值落在宿主内容坐标系（滚动跟随靠它）', () => {
  var host = { left: 0, top: -300, right: 1200, sl: 0, st: 120 };
  var r = anchorPlaceOf(anchor(600, 500), host, { w: 1200, h: 800 }, 260, 200);
  // 向下：top = a.bottom(538) + GAP(6) − host.top(−300) + host.st(120)
  assert.equal(r.top, 538 + 6 + 300 + 120);
});

// ---------- B) 行/面板贴靠（sharepanel） ----------

test('B 行流 left-of：右缘贴行左缘 − gap，**底对齐**锚点底，高上限=锚上可用空间', () => {
  var row = { left: 1000, top: 560, right: 1400, bottom: 600 };
  var r = rowPlaceOf(row, HOST, { w: 1710, h: 953 }, 300, 200, 'left-of');
  assert.equal(Math.round(r.left + 300), 1000 - 12); // 右缘 = 行左缘 − ROW_GAP(12)
  assert.equal(r.top + 200, 600);                    // 底对齐：弹层底 = 锚点底
  assert.equal(r.maxH, 430);                         // 596 ∩ 430 ∩ 62vh → 430
  assert.equal(r.flipped, false);
});

test('B 面板 right-of：左缘贴面板右缘 + gap', () => {
  var panel = { left: 500, top: 400, right: 904, bottom: 700 };
  var r = rowPlaceOf(panel, HOST, { w: 1710, h: 953 }, 300, 260, 'right-of');
  assert.equal(Math.round(r.left), 904 + 12);
  assert.equal(r.top + 260, 700);
});

test('B 主位越界 → 先翻对侧（flipped=true），对侧也不行才收边', () => {
  // 锚贴视口左缘：left-of 会出界 ⇒ 翻到右侧
  var row = { left: 40, top: 500, right: 380, bottom: 540 };
  var r = rowPlaceOf(row, HOST, { w: 1710, h: 953 }, 300, 180, 'left-of');
  assert.equal(r.flipped, true);
  assert.equal(Math.round(r.left), 380 + 12);
  // 视口很窄、两侧都放不下（锚左=10 → left-of=-302 <4；flip=380+12=392 > 420-4-300=116）⇒ 收边到视口左缘（minL=4）
  var r2 = rowPlaceOf({ left: 10, top: 40, right: 380, bottom: 80 }, { left: 0, top: 0, right: 420, sl: 0, st: 0 }, { w: 420, h: 600 }, 300, 180, 'left-of');
  assert.equal(Math.round(r2.left), 4);
});

test('B 高度下限与顶部收边：锚点上方空间不足时压到 ROW_MIN_H(140) 并贴宿主上缘', () => {
  var r = rowPlaceOf({ left: 400, top: 20, right: 700, bottom: 40 }, HOST, { w: 1710, h: 953 }, 300, 400, 'left-of');
  assert.equal(r.maxH, 140);       // max(140, min(40-0+0-4, …))
  assert.equal(r.top, 4);          // a.bottom(40) − min(popH,140)=140 → 负 ⇒ 收边到 ROW_PAD
});

test('B 宿主带滚动：底部共用坐标随宿主内容系（滚动跟随）', () => {
  var host = { left: 0, top: -200, right: 1710, sl: 0, st: 300 };
  var r = rowPlaceOf({ left: 600, top: 700, right: 900, bottom: 740 }, host, { w: 1710, h: 953 }, 300, 200, 'left-of');
  assert.equal(r.top + 200, 740 + 200 + 300); // 底对齐（内容坐标 = 视口 − host.top + st）
});
