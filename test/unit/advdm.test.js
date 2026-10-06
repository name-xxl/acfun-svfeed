// advdm.js 纯函数单元测试（0.9.204）：缓动白名单/贝塞尔、多段帧插值、残包归一、锚点几何。
// 样本取自真机（ac17784502 / vid 14177057，docs/api-research.md §10.13）：399 条高级弹幕
// 全部 contentType=0、JSON.parse 成功率 100%、帧数 1/2/4/11/12 均出现、timingFunction 全 linear。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var { easeProgress, normTiming, parseAdvanced, interpolateModel, drawModel } = await import('../../src/advdm.js');

test('normTiming：CSS 关键字与 cubic-bezier 白名单；非法值一律回落 linear（不让弹幕冻结在 (0,0)）', () => {
  assert.equal(normTiming('linear'), 'linear');
  assert.equal(normTiming('ease-in-out'), 'ease-in-out');
  assert.equal(normTiming('cubic-bezier(0.25, 0.1, 0.25, 1)'), 'cubic-bezier(0.25, 0.1, 0.25, 1)');
  assert.equal(normTiming('cubic-bezier(1,0,0,1)'), 'cubic-bezier(1,0,0,1)');
  // 非法/未知：不回 null、不抛，回落 linear
  assert.equal(normTiming(''), 'linear');
  assert.equal(normTiming(undefined), 'linear');
  assert.equal(normTiming('steps(4, end)'), 'linear');
  assert.equal(normTiming('cubic-bezier(1,0,0)'), 'linear'); // 参数不足
  assert.equal(normTiming('cubic-bezier(a,b,c,d)'), 'linear');
});

test('easeProgress：关键字曲线端点与中点符合闭式；未知回落 linear', () => {
  assert.equal(easeProgress(0, 'linear'), 0);
  assert.equal(easeProgress(1, 'linear'), 1);
  assert.equal(easeProgress(0.5, 'linear'), 0.5);
  assert.equal(easeProgress(0.5, 'ease-in'), 0.25);
  assert.equal(easeProgress(0.5, 'ease-out'), 0.75);
  assert.equal(easeProgress(0.25, 'ease-in-out'), 2 * 0.0625);
  assert.equal(easeProgress(0.5, 'wat'), 0.5); // 未知 → linear
  // 贝塞尔：linear 等价曲线 (0,0,1,1) 在任意 t 上须与 linear 同值（数值解精度 1e-4）
  [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (t) {
    assert.ok(Math.abs(easeProgress(t, 'cubic-bezier(0,0,1,1)') - t) < 1e-4, 't=' + t);
  });
});

test('easeProgress：平缓区曲线 (1,0,0,1)（中点导数为 0，牛顿会发散）仍须收敛在 [0,1]', () => {
  var prev = -1;
  for (var i = 0; i <= 10; i++) {
    var v = easeProgress(i / 10, 'cubic-bezier(1,0,0,1)');
    assert.ok(v >= 0 && v <= 1, 'v=' + v);
    assert.ok(v >= prev - 1e-9, '单调性被破坏：' + prev + ' → ' + v);
    prev = v;
  }
});

test('parseAdvanced：真机样本形状（单帧位移）→ 归一模型；at/ext 语义由调用方给', () => {
  var raw = JSON.stringify({
    id: 'b7542709529e8b4820587dbc9b2da3e0aee6', content: '测试', contentType: 0, startTime: 685,
    durationTime: 3000, anchor: 0,
    wordStyle: { font: 'SimHei', size: 25, bold: true, stroke: true, color: '#ffffff' },
    scale: { x: 1, y: 1, z: 1 }, rotate: { x: 0, y: 0, z: 0 },
    animationFrames: [{ from: { pos: { x: 100, y: 53.48827232050741, z: 0 } },
      to: { pos: { x: 0, y: 53.48827232050741, z: 0 } }, timingFunction: 'linear', staticTime: 0, moveTime: 3000 }],
    zIndex: 50, startTimeNow: true, user: '75318463'
  });
  var m = parseAdvanced(raw);
  assert.equal(m.id, 'b7542709529e8b4820587dbc9b2da3e0aee6');
  assert.equal(m.content, '测试');
  assert.equal(m.anchor, 0);
  assert.equal(m.zIndex, 50);
  assert.equal(m.duration, 3000);
  assert.equal(m.startTimeNow, true);
  assert.equal(m.wordStyle.bold, true);
  assert.equal(m.wordStyle.font, 'SimHei');
  assert.equal(m.frames.length, 1);
  assert.equal(m.frames[0].timingFunction, 'linear');
  // 模型归一**不裁剪帧内字段**：from/to 的 pos 百分比原样保留（0–100 口径，别按直觉改成 0–1）
  assert.equal(m.frames[0].from.pos.x, 100);
  assert.ok(Math.abs(m.frames[0].to.pos.x - 0) < 1e-9);
});

test('parseAdvanced：残包兜底——坏 JSON/空内容/非对象 → null；无帧 → 模型在但帧空', () => {
  assert.equal(parseAdvanced('{oops'), null);
  assert.equal(parseAdvanced('[]'), null);
  assert.equal(parseAdvanced(null), null);
  assert.equal(parseAdvanced(JSON.stringify({ contentType: 0, durationTime: 100 })), null); // 无 content
  // **空白内容合法**：真机字符画样本（13k 字符）就是"大片空白 + 少量字符"，绝不能 trim 或当空丢弃
  assert.ok(parseAdvanced(JSON.stringify({ content: '   ' })));
  var bare = parseAdvanced(JSON.stringify({ content: 'x', durationTime: 900, animationFrames: [] }));
  assert.ok(bare);
  assert.equal(bare.frames.length, 0);
  // 缺 to：以 from 为起点（原地不动，比飞出去温和）
  var half = parseAdvanced(JSON.stringify({ content: 'x', animationFrames: [{ from: { pos: { x: 10, y: 20 } }, moveTime: 1000 }] }));
  assert.equal(half.frames[0].to.pos.x, 10);
  assert.equal(half.frames[0].to.pos.y, 20);
  // 锚点越界钳进 0–8；非法 timing 帧内即回落 linear
  var clamp = parseAdvanced(JSON.stringify({ content: 'x', anchor: 99,
    animationFrames: [{ from: { pos: { x: 0, y: 0 } }, to: { pos: { x: 1, y: 1 } }, timingFunction: 'bogus', moveTime: 10 }] }));
  assert.equal(clamp.anchor, 8);
  assert.equal(clamp.frames[0].timingFunction, 'linear');
});

test('interpolateModel：多段帧按 moveTime 累加定位当前段；段内线性插值；越界返回 null', () => {
  var m = { frames: [
    { from: { pos: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotate: { x: 0, y: 0, z: 0 } },
      to: { pos: { x: 50, y: 0 }, scale: { x: 2, y: 2 }, rotate: { x: 0, y: 0, z: 90 } }, timingFunction: 'linear', moveTime: 1000 },
    { from: { pos: { x: 50, y: 0 }, scale: { x: 2, y: 2 }, rotate: { x: 0, y: 0, z: 90 } },
      to: { pos: { x: 50, y: 100 }, scale: { x: 1, y: 1 }, rotate: { x: 0, y: 0, z: 0 } }, timingFunction: 'linear', moveTime: 500 }
  ] };
  assert.equal(interpolateModel(m, -1), null);          // 未出现
  var a = interpolateModel(m, 500);
  assert.equal(a.x, 25);
  assert.equal(a.scaleX, 1.5);
  assert.equal(a.rotateZ, 45);
  var b = interpolateModel(m, 1250);                     // 第二段中点
  assert.equal(b.x, 50);
  assert.equal(b.y, 50);
  assert.equal(b.scaleX, 1.5);
  assert.equal(interpolateModel(m, 1500), null);         // 超出所有段 → 不画
  assert.equal(interpolateModel({ frames: [] }, 10), null);
  assert.equal(interpolateModel(null, 10), null);
  // moveTime=0 的段：瞬时跳变 → 取该段**终值**（不除零、不停在起点）
  var z = interpolateModel({ frames: [
    { from: { pos: { x: 1, y: 1 }, scale: { x: 1, y: 1 }, rotate: { x: 0, y: 0, z: 0 } },
      to: { pos: { x: 9, y: 9 }, scale: { x: 1, y: 1 }, rotate: { x: 0, y: 0, z: 0 } }, timingFunction: 'linear', moveTime: 0 }
  ] }, 0);
  assert.equal(z.x, 9);
});

// drawModel 的几何：用假 ctx 记录调用（不引 canvas 依赖）。锚点九宫格决定对齐方式与文本块落点。
function fakeCtx() {
  var calls = [];
  var ctx = { font: '', textAlign: '', textBaseline: '', fillStyle: '', strokeStyle: '',
    lineWidth: 0, lineJoin: '', globalAlpha: 1, shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 };
  ['save', 'restore', 'translate', 'scale', 'rotate', 'fillText', 'strokeText'].forEach(function (k) {
    ctx[k] = function () { calls.push([k].concat(Array.prototype.slice.call(arguments))); };
  });
  ctx.calls = calls;
  return ctx;
}

test('drawModel：百分比坐标 → 像素；锚点决定 textAlign/文本块纵向落点；多行按字号逐行画', () => {
  var model = { content: 'ab\ncd', anchor: 8, // 右下：col=2 → right，row=2 → 块顶在 -blockH
    wordStyle: { font: 'SimHei', size: 20, bold: true, stroke: true, color: '#ff0000' } };
  var frame = { x: 50, y: 25, scaleX: 1, scaleY: 1, rotateX: 0, rotateY: 0, rotateZ: 0 };
  var ctx = fakeCtx();
  drawModel(ctx, model, frame, 800, 400, 1);
  var tr = ctx.calls.filter(function (c) { return c[0] === 'translate'; })[0];
  assert.deepEqual([tr[1], tr[2]], [400, 100]); // 800×400 画布上 (50%,25%) → (400,100)
  assert.equal(ctx.textAlign, 'right');
  assert.equal(ctx.textBaseline, 'middle');
  assert.ok(ctx.font.indexOf('bold ') === 0 && ctx.font.indexOf('20px') >= 0 && ctx.font.indexOf('SimHei') >= 0, ctx.font);
  var fills = ctx.calls.filter(function (c) { return c[0] === 'fillText'; });
  var strokes = ctx.calls.filter(function (c) { return c[0] === 'strokeText'; });
  assert.equal(fills.length, 2);   // 两行
  assert.equal(strokes.length, 2); // 描边同两行
  assert.equal(fills[0][1], 'ab');
  assert.equal(fills[1][1], 'cd');
  // 行高 = 字号：第 1 行 y = -blockH + 0.5*size = -40+10 = -30；第 2 行 -10
  assert.equal(fills[0][3], -30);
  assert.equal(fills[1][3], -10);
});

test('drawModel：字号倍率只放大字号（坐标不动）；stroke:false 不描边；无 rotateZ 不调用 rotate', () => {
  var model = { content: 'x', anchor: 4, wordStyle: { size: 20, font: 'SimHei', stroke: false, color: '#fff' } };
  var frame = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotateX: 0, rotateY: 0, rotateZ: 0 };
  var ctx = fakeCtx();
  drawModel(ctx, model, frame, 100, 100, 1.5);
  assert.ok(ctx.font.indexOf('30px') >= 0, 'ctx.font=' + ctx.font); // 20 × 1.5
  assert.equal(ctx.calls.filter(function (c) { return c[0] === 'strokeText'; }).length, 0);
  assert.equal(ctx.calls.filter(function (c) { return c[0] === 'strokeText'; }).length
    + ctx.calls.filter(function (c) { return c[0] === 'fillText'; }).length, 1);
  assert.equal(ctx.calls.filter(function (c) { return c[0] === 'rotate'; }).length, 0);
  var sc = ctx.calls.filter(function (c) { return c[0] === 'scale'; })[0];
  assert.deepEqual([sc[1], sc[2]], [1, 1]);
});
