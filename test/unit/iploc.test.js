// iploc.js（评论 IP 属地查询层，0.9.245）单元测试：Node 内置 test 运行器，零依赖。
// 覆盖：Web-IP isFailureCacheFresh 8 项等值迁移（判鲜/边界/瞬时分级/null 守卫）+ 新增正面新鲜度、
// 三态判定、保留期换算、老键映射、tooltip 文案、过期清理/上限淘汰。
// 垫桩：iploc 的 import 链（cfg/net/ui/dbg/settings）需要最小 window/__ACSV_DEBUG__
//（momenteditor-repost.test.js 同口径；链上模块级副作用只允许监听/存储触点，垫桩可吸收）
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

var CFGmod = await import('../../src/cfg.js');
var CFG = CFGmod.CFG;
var {
  isFailureCacheFresh, positiveFresh, lookupState, keepMsOf, mapLegacyDays, tagTitle, pruneUids
} = await import('../../src/iploc.js');

var now = Date.now();
var H = 3600 * 1000;

// ---------- isFailureCacheFresh（Web-IP 8 项等值迁移） ----------

test('isFailureCacheFresh：无 failedAt 不算', () => {
  assert.equal(isFailureCacheFresh({ ip: null }, now), false);
});
test('isFailureCacheFresh：刚失败算新鲜', () => {
  assert.equal(isFailureCacheFresh({ failedAt: now }, now), true);
});
test('isFailureCacheFresh：超过 TTL 不算（7h > 6h）', () => {
  assert.equal(isFailureCacheFresh({ failedAt: now - 7 * H }, now), false);
});
test('isFailureCacheFresh：边界内算新鲜（5h < 6h）', () => {
  assert.equal(isFailureCacheFresh({ failedAt: now - 5 * H }, now), true);
});
test('isFailureCacheFresh：瞬时错误 5 分钟内算新鲜（短 TTL 分级）', () => {
  assert.equal(isFailureCacheFresh({ failedAt: now - 5 * 60 * 1000, transient: true }, now), true);
});
test('isFailureCacheFresh：瞬时错误 11 分钟外不算', () => {
  assert.equal(isFailureCacheFresh({ failedAt: now - 11 * 60 * 1000, transient: true }, now), false);
});
test('isFailureCacheFresh：null 输入', () => {
  assert.equal(isFailureCacheFresh(null, now), false);
});
test('isFailureCacheFresh：undefined 输入', () => {
  assert.equal(isFailureCacheFresh(undefined, now), false);
});
test('isFailureCacheFresh：TTL 值来自 CFG.ip 单源（非字面量）', () => {
  assert.equal(CFG.ip.failedTtlMs, 6 * H);
  assert.equal(CFG.ip.transientFailedTtlMs, 10 * 60 * 1000);
});

// ---------- positiveFresh ----------

test('positiveFresh：保留期内新鲜 / 超期不新鲜', () => {
  var e = { ip: '广东', t: now - 2 * 24 * H };
  assert.equal(positiveFresh(e, now, 7 * 24 * H), true);
  assert.equal(positiveFresh(e, now, 1 * 24 * H), false);
});
test('positiveFresh：keepMs=0＝永久档（多老都新鲜）', () => {
  assert.equal(positiveFresh({ ip: '广东', t: now - 999 * 24 * H }, now, 0), true);
});
test('positiveFresh：老数据无时间戳视为新鲜（Web-IP 迁移条目读法）', () => {
  assert.equal(positiveFresh({ ip: '江苏' }, now, 1 * H), true);
});
test('positiveFresh：无 ip / null 一律 false', () => {
  assert.equal(positiveFresh({ ip: null, failedAt: now }, now, 7 * 24 * H), false);
  assert.equal(positiveFresh(null, now, 7 * 24 * H), false);
});

// ---------- lookupState 三态 ----------

test('lookupState：新鲜正面=pos / 过期正面=miss（排队重查）', () => {
  assert.equal(lookupState({ ip: '广东', t: now - H }, now, 7 * 24 * H), 'pos');
  assert.equal(lookupState({ ip: '广东', t: now - 8 * 24 * H }, now, 7 * 24 * H), 'miss');
});
test('lookupState：新鲜负面=neg（静默跳过） / 过期负面=miss', () => {
  assert.equal(lookupState({ ip: null, failedAt: now - H }, now, 7 * 24 * H), 'neg');
  assert.equal(lookupState({ ip: null, failedAt: now - 7 * H }, now, 7 * 24 * H), 'miss');
});
test('lookupState：空条目=miss', () => {
  assert.equal(lookupState(undefined, now, 7 * 24 * H), 'miss');
  assert.equal(lookupState(null, now, 7 * 24 * H), 'miss');
});

// ---------- keepMsOf / mapLegacyDays ----------

test('keepMsOf：档位天数换算（0＝永久）', () => {
  assert.equal(keepMsOf('7'), 7 * 24 * H);
  assert.equal(keepMsOf('1'), 1 * 24 * H);
  assert.equal(keepMsOf('30'), 30 * 24 * H);
  assert.equal(keepMsOf('0'), 0);
});
test('keepMsOf：非法值回落默认档（CFG.ip.keepDef）', () => {
  assert.equal(keepMsOf('abc'), 7 * 24 * H);
  assert.equal(keepMsOf(undefined), 7 * 24 * H);
});
test('mapLegacyDays：Web-IP acr_days 值域零翻译', () => {
  assert.equal(mapLegacyDays(0), '0');
  assert.equal(mapLegacyDays('1'), '1');
  assert.equal(mapLegacyDays(7), '7');
  assert.equal(mapLegacyDays('30'), '30');
});
test('mapLegacyDays：域外值不收养', () => {
  assert.equal(mapLegacyDays(5), null);
  assert.equal(mapLegacyDays(''), null);
  assert.equal(mapLegacyDays(null), null);
});

// ---------- tagTitle（Web-IP 三行同款） ----------

test('tagTitle：三行（属地/免责/查询时间）', () => {
  var s = tagTitle('广东', now);
  assert.ok(s.indexOf('IP属地：广东') === 0);
  assert.ok(s.indexOf('（基于用户主页实时资料，不代表发布时的IP）') > 0);
  assert.ok(s.indexOf('查询于：') > 0);
});
test('tagTitle：无查询时刻只落两行（不伪造时间）', () => {
  var s = tagTitle('中国香港', 0);
  assert.equal(s.split('\n').length, 2);
  assert.ok(s.indexOf('查询于') === -1);
});

// ---------- pruneUids（过期清理 + 上限淘汰） ----------

test('pruneUids：过期正面按保留期删、保留期内留', () => {
  var m = {
    a: { ip: '广东', t: now - 2 * 24 * H },
    b: { ip: '江苏', t: now - 8 * 24 * H }
  };
  assert.equal(pruneUids(m, now, 7 * 24 * H, 5000), 1);
  assert.ok(m.a && !m.b);
});
test('pruneUids：永久档（keepMs=0）不删正面', () => {
  var m = { a: { ip: '广东', t: now - 999 * 24 * H } };
  assert.equal(pruneUids(m, now, 0, 5000), 0);
  assert.ok(m.a);
});
test('pruneUids：过期负面删（含瞬时分级）', () => {
  var m = {
    a: { ip: null, failedAt: now - 7 * H },                        // 普通负缓存过期
    b: { ip: null, failedAt: now - 11 * 60 * 1000, transient: true }, // 瞬时过期
    c: { ip: null, failedAt: now - H },                             // 新鲜负面保留
    d: { ip: null, failedAt: now - 5 * 60 * 1000, transient: true } // 新鲜瞬时保留
  };
  assert.equal(pruneUids(m, now, 7 * 24 * H, 5000), 2);
  assert.ok(!m.a && !m.b && m.c && m.d);
});
test('pruneUids：超上限按时间最旧淘汰，负数/垃圾条目不炸', () => {
  var m = {
    old: { ip: 'A', t: now - 100 * H },
    mid: { ip: 'B', t: now - 50 * H },
    new: { ip: 'C', t: now - 1 * H },
    bad: null
  };
  // bad 先清理（1 条），cap=2 再淘汰最旧的 old（1 条）
  assert.equal(pruneUids(m, now, 0, 2), 2);
  assert.ok(!m.old && !m.bad && m.mid && m.new);
});
