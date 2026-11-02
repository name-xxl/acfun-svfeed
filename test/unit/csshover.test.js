// 族表闸（0.9.317，AGENTS 规矩 7「收口必配闸 + 闸必能反跑」）——卡族交互态单源表的双向消费钉。
//
// 病灶：五族（分区/网格/榜单行/搜索行/行卡族）的 hover/press/transition 此前各写一套、散在
// cssraw 四段，改一档要动四处、四处必漂（0.9.314 只统一行卡族，本轮是它留下的「后批」）。
// 收口到 src/csshover.js 一张表之后，本闸钉住「表 ↔ 产物」这条缝两头都不许漏：
//   正向：每行必须把 trans / lift / img / title / press 各条落到 CSS 文本里（scope 拼装正确、
//         无 img 的行不得产 hover-transform 规则、press kind 与值形态一致）；
//   反向：产物模板里出现本表所辖族的交互规则，必须能在表产出的文本里找到出处——
//         「表里有却没拼进模板」（漏）与「模板里又手写了一份副本」（多）都判红。
// 纯函数直采（不拉 DOM、不读环境），摘任一条表行/scope/值 ⇒ 本文件对应用例转红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

var { HOVER_ROWS, hoverRules, hoverSlot } = await import('../../src/csshover.js');
var { CSS_TEMPLATE } = await import('../../src/cssraw.js');

var ALL = hoverRules(HOVER_ROWS);

// 一行 → 该行的 CSS（断言按族定位，避免整表字符串里跨族误命中）
function rowText(row) { return hoverRules([row]); }
function rules(css) { return css.match(/[^{}]+\{[^{}]*\}/g) || []; }

test('表行结构齐形：key 唯一、五组键都是数组、slot 都有 cssraw 拼接位', () => {
  var keys = new Set();
  var rawCssraw = readFileSync(new URL('../../src/cssraw.js', import.meta.url), 'utf8');
  var slots = new Set();
  for (var m of rawCssraw.matchAll(/hoverSlot\('([\w-]+)'\)/g)) slots.add(m[1]);
  for (var row of HOVER_ROWS) {
    assert.ok(!keys.has(row.key), '族键重复：' + row.key);
    keys.add(row.key);
    assert.ok(slots.has(row.slot), '行 ' + row.key + ' 的 slot=' + row.slot + ' 在 cssraw 无拼接位（漏插＝表值不生效）');
    for (var g of ['cards', 'trans', 'lift', 'img', 'title', 'press']) {
      assert.ok(Array.isArray(row[g]), '行 ' + row.key + ' 缺数组字段 ' + g);
    }
    assert.ok(row.cards.length > 0, '行 ' + row.key + ' 无卡根（cards 空则 trans/press 无处可挂）');
  }
  // 拼接位反过来也要有族：hoverSlot('x') 指向空集＝构建期抛错（fail loud），这里先静态核对
  for (var s of slots) {
    assert.ok(HOVER_ROWS.some(function (r) { return r.slot === s; }), 'cssraw 拼接位 slot=' + s + ' 无族登记');
  }
});

test('纯函数：同表连调两次同文，且表未被就地改写（scope 不重复叠加）', () => {
  assert.equal(hoverRules(HOVER_ROWS), ALL);
  hoverRules(HOVER_ROWS);
  // scope 只该出现在**产出文本**里，不该回写进表——就地改写会让第二次调用重复加前缀
  var bare = function (row, s) { // 表字段值不该自带自己的 scope 前缀（'.acsv-frow' 系类名除外：那是同名前缀，不是前缀）
    if (!row.scope) return true;
    return !(s === row.scope || s.indexOf(row.scope + ' ') === 0);
  };
  for (var row of HOVER_ROWS) {
    for (var e of row.trans) {
      for (var s of e.sels) assert.ok(bare(row, s), 'trans.sels 被就地加了 scope 前缀：' + s);
    }
    for (var l of row.lift) assert.ok(bare(row, l.card), 'lift.card 被就地加了 scope 前缀：' + l.card);
    for (var p of row.press) {
      for (var c of p.cards) assert.ok(bare(row, c), 'press.cards 被就地加了 scope 前缀：' + c);
    }
  }
});

test('正向：每行的每条声明都落到 CSS，组序恒为 trans→lift→img→title→press', () => {
  for (var row of HOVER_ROWS) {
    var txt = rowText(row);
    var expect = row.trans.length + row.lift.length + row.img.length + row.title.length + row.press.length;
    assert.equal(rules(txt).length, expect, '行 ' + row.key + ' 规则条数与表不符');
    // 每条声明块逐字命中
    for (var e of row.trans) assert.ok(txt.indexOf('{transition:' + e.v + '}') >= 0, e.v);
    for (var l of row.lift) {
      assert.ok(txt.indexOf('background:' + l.v) >= 0, row.key + ' 缺提底值 ' + l.v);
      if (l.ring) assert.ok(txt.indexOf('border-color:' + l.ring + ';') >= 0, row.key + ' 缺描边 ' + l.ring);
    }
    for (var i of row.img) assert.ok(txt.indexOf('{transform:' + i.v + '}') >= 0, row.key + ' 缺图元 ' + i.v);
    for (var t of row.title) assert.ok(txt.indexOf('{color:' + t.v + '}') >= 0, row.key + ' 缺标题 ' + t.v);
    for (var p of row.press) assert.ok(txt.indexOf('{transform:' + p.v + '}') >= 0, row.key + ' 缺按压 ' + p.v);
    // 组序：同类规则连成一片，且五组按固定次序出现（生成器换序即红——块内可读性靠它）
    var groups = rules(txt).map(function (r) {
      var decl = r.slice(r.indexOf('{') + 1, -1);
      if (/^transition:/.test(decl)) return 'trans';
      if (/background:/.test(decl)) return 'lift';
      if (/^transform:/.test(decl) && /:hover/.test(r)) return 'img';
      if (/^color:/.test(decl)) return 'title';
      if (/^transform:/.test(decl)) return 'press';
      return '?';
    });
    var order = ['trans', 'lift', 'img', 'title', 'press'].filter(function (g) { return groups.indexOf(g) >= 0; });
    assert.deepEqual(groups.filter(function (g, ix) { return g !== groups[ix - 1]; }), order,
      '行 ' + row.key + ' 组序漂移：' + groups.join(','));
  }
});

test('scope 拼装：有 scope 的行每段选择器都吃 scope；目标选择器不吃 scope（它是卡根后代）', () => {
  for (var row of HOVER_ROWS) {
    var txt = rowText(row);
    for (var r of rules(txt)) {
      var sel = r.slice(0, r.indexOf('{')).trim();
      for (var part of sel.split(',')) {
        if (row.scope) {
          var t = part.trim();
          assert.ok(t.indexOf(row.scope) === 0, row.key + ' 选择器未落进 scope：' + t);
          // scope 作为**独立类名**只许出现一次（`.acsv-frow` 系同前缀类名不算第二次——
          // (?![\w-]) 挡掉 `.acsv-frow-strip`），出现两次＝目标选择器被重复加了前缀
          var re = new RegExp(row.scope.replace(/[.$]/g, '\\$&') + '(?![\\w-])', 'g');
          assert.equal((t.match(re) || []).length, 1, row.key + ' scope 重复拼装：' + t);
        }
      }
    }
  }
});

test('无 img 组的行不得产 hover-transform 规则；press kind 与值形态一致', () => {
  for (var row of HOVER_ROWS) {
    var txt = rowText(row);
    if (!row.img.length) {
      assert.ok(!/:hover[^{}]*\{[^{}]*transform/.test(txt), row.key + ' 无图元行却产了 hover-transform');
    }
    for (var p of row.press) {
      if (p.kind === 'card') assert.match(p.v, /^scale\(/, row.key + ' card 档按压值不是 scale()：' + p.v);
      else if (p.kind === 'row') assert.match(p.v, /^translateY\(/, row.key + ' row 档按压值不是 translateY()：' + p.v);
      else assert.fail(row.key + ' press.kind 只能是 card/row：' + p.kind);
    }
  }
});

test('hoverSlot 拼接位：文本＝该 slot 各行之和；空 slot 抛错（fail loud）', () => {
  assert.equal(hoverSlot('frow'), hoverRules(HOVER_ROWS.filter(function (r) { return r.slot === 'frow'; })));
  assert.throws(function () { hoverSlot('no-such-slot'); }, /无族登记/);
});

// ---- 反向腿：产物里出现的本表所辖族交互规则，必须逐条有表出处 ----
var OWNED = /\.acsv-(jx-card|gcell|vrow|sarow|frow-strip|gquote-on|frow-img|frow)\b/;

test('反向：模板里本表所辖族的 :hover/:active 规则全部有表出处（手写副本回潮即红）', () => {
  var rest = CSS_TEMPLATE.split(ALL).join(''); // 表产出整体摘掉
  // 逐 slot 摘（表行在模板里是分散拼接的，ALL 连缀形态只存在于 frow 一处）
  for (var slot of ['jx', 'grid', 'rank', 'search', 'frow', 'mp']) {
    rest = rest.split(hoverSlot(slot)).join('');
  }
  var orphans = [];
  for (var r of rules(rest)) {
    var sel = r.slice(0, r.indexOf('{'));
    if (!/:hover|:active/.test(sel)) continue;
    if (!OWNED.test(sel)) continue;
    // 表外成员（互动键 .acsv-fact、作者名 .acsv-frow-name、时长角标显形等）语义不同，不进本表
    if (/acsv-fact|acsv-frow-name|acsv-frow-mdur|acsv-frow-text|acsv-mdetail|ubb-/.test(sel)) continue;
    orphans.push(r.trim());
  }
  assert.deepEqual(orphans, [], '模板里出现无表出处的本族交互规则（第二份实现＝漂移前态）：\n' + orphans.join('\n'));
});

test('反向：每族表产出确实拼进了模板（漏拼＝该族交互态静默消失）', () => {
  for (var row of HOVER_ROWS) {
    var txt = rowText(row);
    for (var r of rules(txt)) {
      assert.ok(CSS_TEMPLATE.indexOf(r.trim()) >= 0,
        '表行 ' + row.key + ' 的规则没进模板（cssraw 拼接位漏了？）：' + r.trim());
    }
  }
});

test('棘轮：暗皮四新族（分区/网格/榜单行/搜索行）的 hover 值与 0.9.317 搬表前逐字相同', () => {
  // 搬表批承诺「零视觉变化」，取值逐字钉在这里：0.9.318 统一批改值时**必须同步改本钉**
  //（改错一侧即红＝改口是显式的，不会静默漂）
  var byKey = {};
  for (var row of HOVER_ROWS) byKey[row.key] = row;
  assert.equal(byKey.jx.lift[0].v, 'rgba(255,255,255,.07)');
  assert.equal(byKey.jx.lift[0].ring, 'var(--acsv-accent-dim)');
  assert.equal(byKey.search.lift[0].v, 'rgba(255,255,255,.03)');
  assert.equal(byKey.rank.lift[0].v, 'rgba(255,255,255,.07)');
  assert.equal(byKey.grid.img[0].v, 'scale(1.05)');
  assert.equal(byKey.frow.press[0].v, 'scale(.985)');
  assert.equal(byKey['frow-line'].press[0].v, 'translateY(1px)');
});
