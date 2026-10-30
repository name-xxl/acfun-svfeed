// dmcanvas.js mode 归一单元测试（0.9.194）：4=底部/5=顶部/**6=逆向滚动** 保留，其余兜底滚动 1。
// 6 的存在来自真机取样实证（ac17784502 等）；此前被错画成普通滚动（方向反）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { normMode, isScrollMode, DM_BLOCK_TYPES, mergeDanmaku, filterDanmaku, fit169 } = await import('../../src/dmcanvas.js');

test('normMode：4/5/6 保留；其余（含 7/8 高级弹幕编码、undefined、字符串）兜底 1', () => {
  assert.equal(normMode(1), 1);
  assert.equal(normMode(4), 4);
  assert.equal(normMode(5), 5);
  assert.equal(normMode(6), 6); // 逆向滚动：0.9.194 前被错画成普通滚动
  assert.equal(normMode(7), 1); // 高级弹幕编码：画布未支持 → 兜底滚动（不是本批目标）
  assert.equal(normMode(8), 1);
  assert.equal(normMode(undefined), 1);
  assert.equal(normMode('5'), 1); // 不认字符串（映射层已 Number 归一）
});

// 滚动族判据单源（0.9.305 卫生批4⑤）：屏蔽/时长/轨道四处共用一条缝——**不**吃归一（调用点自决）
test('isScrollMode：仅 1/6（数字）；4/5/7/undefined/字符串都算假', () => {
  assert.ok(isScrollMode(1));
  assert.ok(isScrollMode(6));
  assert.ok(!isScrollMode(4));
  assert.ok(!isScrollMode(5));
  assert.ok(!isScrollMode(7));
  assert.ok(!isScrollMode(undefined));
  assert.ok(!isScrollMode('1'));
});

// 六类表与过滤编排（0.9.305 卫生批4⑤）：表=名单/文案/判据三面的单源；
// 摘修复反跑：把 filterDanmaku 改回自抄一份判据（删表驱动），下方「表与既有语义逐条对齐」转红
test('DM_BLOCK_TYPES：六类 k/label 序 + 表驱动过滤与既有语义逐条对齐', () => {
  assert.deepEqual(DM_BLOCK_TYPES.map(function (t) { return t.k; }),
    ['top', 'bottom', 'scroll', 'color', 'role', 'advanced']);
  assert.deepEqual(DM_BLOCK_TYPES.map(function (t) { return t.label; }),
    ['顶部弹幕', '底部弹幕', '滚动弹幕', '彩色弹幕', '角色弹幕', '高级弹幕']);
  var rows = [
    { text: '滚动', mode: 1, color: '#ffffff' },
    { text: '逆向', mode: 6, color: '#ffffff' },
    { text: '顶部', mode: 5, color: '#ffffff' },
    { text: '底部', mode: 4, color: '#ffffff' },
    { text: '白大写', mode: 1, color: '#FFFFFF' } // 判据 toLowerCase 口径：不算彩色
  ];
  var txt = function (l) { return l.map(function (x) { return x.text; }); };
  assert.deepEqual(txt(filterDanmaku(rows, { scroll: true }, null)), ['顶部', '底部']); // 白大写也是滚动族（mode 1）
  assert.deepEqual(txt(filterDanmaku(rows, { color: true }, null)),
    ['滚动', '逆向', '顶部', '底部', '白大写']); // '#FFFFFF' 大写白不算彩色（toLowerCase 口径）
  // 屏蔽判据吃**原始** mode（归一前）：mode 7 不在滚动族
  assert.deepEqual(txt(filterDanmaku([{ text: '七', mode: 7 }], { scroll: true }, null)), ['七']);
});

// 合并重复弹幕（0.9.201，照原生「合并重复弹幕」默认开）：同文本在窗口内只留第一条
test('mergeDanmaku：同文本窗口内去重、超窗保留、异文不受影响；脏输入安全', () => {
  var list = [
    { at: 0, text: 'a' },
    { at: 500, text: 'a' },    // 窗口内重复 → 丢
    { at: 600, text: 'b' },    // 异文 → 留
    { at: 2000, text: 'a' },   // 距上一条 a 已超 1500 → 留
    { at: 2100, text: 'a' }    // 又进窗口 → 丢
  ];
  assert.deepEqual(mergeDanmaku(list, 1500).map(function (x) { return x.at + ':' + x.text; }),
    ['0:a', '600:b', '2000:a']);
  assert.deepEqual(mergeDanmaku([], 1500), []);
  assert.deepEqual(mergeDanmaku(null, 1500), []);
  assert.deepEqual(mergeDanmaku([null, { at: 1, text: 'x' }], 1500).length, 1); // 空条目跳过
  assert.deepEqual(mergeDanmaku([{ at: 1, text: '' }], 1500).length, 1); // 空文本不参与去重（仍保留）
  // 0.9.234：原型键文本不再是"永不去重"的特例（`{}` 哈希读 __proto__ 命中 Object.prototype，
  // `it.at - prev` 变 NaN ⇒ 每条都留下；改用 Object.create(null) 后恢复正常窗口去重）
  var proto = [
    { at: 0, text: '__proto__' },
    { at: 100, text: '__proto__' },   // 窗口内重复 → 丢
    { at: 2000, text: '__proto__' },  // 超窗 → 留
    { at: 2100, text: 'constructor' },
    { at: 2200, text: 'constructor' } // 窗口内重复 → 丢
  ];
  assert.deepEqual(mergeDanmaku(proto, 1500).map(function (x) { return x.at + ':' + x.text; }),
    ['0:__proto__', '2000:__proto__', '2100:constructor']);
});

// 按类型/关键词屏蔽（0.9.202 起四类、0.9.204 补齐角色与高级两类）：判据全部落在回包字段上。
// **各维度分开断言**：mode 类判据与 color/role/adv 是正交的，混在一张表里会互相带走（写测试时踩过）
test('filterDanmaku：模式四类（滚动含逆向/顶部/底部）+ 关键词', () => {
  var rows = [
    { text: '滚动', mode: 1, color: '#ffffff' },
    { text: '逆向', mode: 6, color: '#ffffff' },
    { text: '顶部', mode: 5, color: '#ffffff' },
    { text: '底部', mode: 4, color: '#ffffff' }
  ];
  var txt = function (l) { return l.map(function (x) { return x.text; }); };
  assert.equal(filterDanmaku(rows, null, null).length, 4); // 空屏蔽集＝全留
  assert.deepEqual(txt(filterDanmaku(rows, { scroll: true }, null)), ['顶部', '底部']);
  assert.deepEqual(txt(filterDanmaku(rows, { top: true }, null)), ['滚动', '逆向', '底部']);
  assert.deepEqual(txt(filterDanmaku(rows, { bottom: true }, null)), ['滚动', '逆向', '顶部']);
  assert.deepEqual(txt(filterDanmaku(rows, { scroll: true, top: true, bottom: true }, null)), []);
  assert.deepEqual(txt(filterDanmaku(rows, null, ['顶部', '底部'])), ['滚动', '逆向']);
  assert.deepEqual(txt(filterDanmaku(rows, { top: true }, ['滚动'])), ['逆向', '底部']);
  assert.equal(filterDanmaku([null, { text: 'x', mode: 2 }], { scroll: true }, null).length, 1, '未知 mode 不算滚动族');
});

test('filterDanmaku：彩色/角色/高级三类各自独立（非白、roleId>0、有 adv）', () => {
  var txt = function (l) { return l.map(function (x) { return x.text; }); };
  var color = [{ text: '白', mode: 1, color: '#ffffff' }, { text: '彩', mode: 1, color: '#ff0000' }];
  assert.deepEqual(txt(filterDanmaku(color, { color: true }, null)), ['白']);
  assert.deepEqual(txt(filterDanmaku(color, { color: true }, ['彩'])), ['白'], '关键词与类型屏蔽叠加＝并集剔除');
  var role = [{ text: '普通', mode: 1, roleId: 0 }, { text: '角色', mode: 1, roleId: 42 }];
  assert.deepEqual(txt(filterDanmaku(role, { role: true }, null)), ['普通']);
  var adv = [{ text: '普通', mode: 1 }, { text: '高级', mode: 1, adv: { frames: [1] } }];
  assert.deepEqual(txt(filterDanmaku(adv, { advanced: true }, null)), ['普通']);
});
// 真机字段口径（§10.13）：list 条目同样带 roleId/danmakuStyle，故「角色弹幕」在经典条目上也可判
test('filterDanmaku：roleId 为字符串 "42" 也认（回包数字类型不保证）；roleId=0/undefined 不算角色', () => {
  var list = [{ text: 'a', mode: 1, roleId: '42' }, { text: 'b', mode: 1, roleId: '0' }, { text: 'c', mode: 1 }];
  assert.deepEqual(filterDanmaku(list, { role: true }, null).map(function (x) { return x.text; }), ['b', 'c']);
});

// 画布口径（0.9.205）：弹幕画布 = 播放器区域里居中的 16:9 区，与稿件比例无关（原生实证 §10.14）
test('fit169：16:9 区域取原框（对 16:9 稿逐像素等价）；更宽取高度、更高取宽度、都居中', () => {
  // 16:9 元素框 → 原样（这是「16:9 稿零视觉变化」的不变式）
  var a = fit169(1600, 900);
  assert.deepEqual([a.x, a.y, Math.round(a.w), Math.round(a.h)], [0, 0, 1600, 900]);
  var a2 = fit169(640, 360);
  assert.deepEqual([a2.x, a2.y, a2.w, a2.h], [0, 0, 640, 360]);
  // 更宽（21:9 超宽窗口）：按高度定，左右等分留边
  var b = fit169(2100, 900);
  assert.equal(b.h, 900);
  assert.ok(Math.abs(b.w - 1600) < 1e-9);
  assert.ok(Math.abs(b.x - 250) < 1e-9);
  assert.equal(b.y, 0);
  // 更高（竖屏窗口 9:16）：按宽度定，上下等分留边——原生在 1000×1400 竖窗口里也是 680×383 的 16:9 框
  var c = fit169(540, 960);
  assert.equal(c.w, 540);
  assert.ok(Math.abs(c.h - 303.75) < 1e-9);
  assert.ok(Math.abs(c.y - 328.125) < 1e-9);
  assert.equal(c.x, 0);
  // 退化输入不产 NaN（画布 NaN 尺寸会让整层消失）
  [fit169(0, 900), fit169(800, 0), fit169(-5, 9), fit169(NaN, 10)].forEach(function (r) {
    assert.deepEqual([r.x, r.y, r.w, r.h], [0, 0, 0, 0]);
  });
});
