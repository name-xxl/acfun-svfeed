// timefmt.js 单元测试（0.9.160 自 data.test.js 迁入，用例逐字保持）：
// relTime（0.9.69 原生四档）/ fmtDate / fmtAgo（0.9.85）/ fmtWan（0.9.69）——零依赖纯函数，
// now 可注入，Node 内置 test 运行器。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var { relTime, fmtDate, fmtAgo, fmtWan } = await import('../../src/timefmt.js');

// ---------- relTime（0.9.69 原生四档；注入 now → 日历边界确定性） ----------
test('relTime：今天/昨天/前天/更早四档原生文案（H 不补零、MM 补零）', () => {
  var now = new Date(2026, 9, 2, 18, 43, 0).getTime(); // 2026-10-02 18:43 本地
  var at = (y, mo, d, h, mi, s) => new Date(y, mo, d, h, mi, s || 0).getTime();
  assert.equal(relTime(at(2026, 9, 2, 15, 43), now), '3小时前');
  assert.equal(relTime(at(2026, 9, 2, 18, 13), now), '30分钟前');
  assert.equal(relTime(at(2026, 9, 2, 18, 42, 30), now), '1分钟前'); // <1 分钟收 1 分钟
  assert.equal(relTime(at(2026, 9, 2, 9, 0), now), '9小时前');
  assert.equal(relTime(at(2026, 9, 1, 20, 36), now), '昨天20时36分');
  assert.equal(relTime(at(2026, 9, 1, 8, 0), now), '昨天8时00分'); // MM 补零
  assert.equal(relTime(at(2026, 9, 0, 16, 18), now), '前天16时18分'); // day=0 → 9-30
  assert.equal(relTime(at(2026, 8, 28, 18, 54), now), '9月28日 18时54分');
});

test('relTime：日历边界（跨零点/跨月/跨年按日期而非 24h 差）', () => {
  var at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi, 0).getTime();
  // 昨天 23:50 看今天 00:10：仅 20 分钟前，但按日历算「昨天」
  assert.equal(relTime(at(2026, 9, 1, 23, 50), at(2026, 9, 2, 0, 10)), '昨天23时50分');
  assert.equal(relTime(at(2026, 8, 30, 12, 0), at(2026, 9, 1, 12, 0)), '昨天12时00分'); // 跨月
  assert.equal(relTime(at(2025, 11, 31, 23, 30), at(2026, 0, 1, 1, 0)), '昨天23时30分'); // 跨年
  assert.equal(relTime(at(2026, 0, 30, 9, 5), at(2026, 1, 1, 9, 5)), '前天9时05分'); // 跨月前天
});

test('relTime：脏输入/未来时间降级空串', () => {
  var now = new Date(2026, 9, 2, 18, 43, 0).getTime();
  assert.equal(relTime(0, now), '');
  assert.equal(relTime(null, now), '');
  assert.equal(relTime('abc', now), '');
  assert.equal(relTime(now + 999999, now), '');
});

// ---------- fmtDate / fmtAgo（0.9.85：本地时区日期 + 带年份判定的时间文案） ----------
// 时区不可注入（Date 的本地时区在进程里固定），所以断言用**本地分量**构造期望值：
// `new Date(2026, 9, 2, 1, 25)` 在任务时区下就是本地 2026-10-02 01:25，任何时区都成立
test('fmtDate：本地时区 YYYY-MM-DD（补零），不是 UTC 口径；脏值空串', () => {
  var ms = new Date(2026, 9, 2, 1, 25, 0).getTime(); // 本地 2026-10-02 01:25
  assert.equal(fmtDate(ms), '2026-10-02');
  assert.equal(fmtDate(new Date(2026, 0, 5, 9, 5, 0).getTime()), '2026-01-05'); // 月份/日补零
  // UTC 口径在这一刻会落到前一天（UTC+8 下 01:25 本地 = 前一日 17:25 UTC）——fmtDate 必须跟本地走
  var utc = new Date(ms).toISOString().slice(0, 10);
  if (utc !== '2026-10-02') assert.notEqual(fmtDate(ms), utc);
  assert.equal(fmtDate(0), '');
  assert.equal(fmtDate('abc'), '');
  assert.equal(fmtDate(null), '');
});

test('fmtAgo：今天/昨天/前天走相对文案，更早退回带年份日期；脏输入/未来空串', () => {
  var now = new Date(2026, 9, 3, 12, 0, 0).getTime(); // 本地 2026-10-03 12:00
  assert.equal(fmtAgo(new Date(2026, 9, 3, 11, 30, 0).getTime(), now), '30分钟前');
  assert.equal(fmtAgo(new Date(2026, 9, 3, 6, 0, 0).getTime(), now), '6小时前');
  assert.equal(fmtAgo(new Date(2026, 9, 2, 20, 36, 0).getTime(), now), '昨天20时36分');
  assert.equal(fmtAgo(new Date(2026, 9, 1, 14, 2, 0).getTime(), now), '前天14时02分');
  assert.equal(fmtAgo(new Date(2026, 8, 26, 21, 39, 0).getTime(), now), '2026-09-26'); // 更早 → 带年
  assert.equal(fmtAgo(new Date(2025, 2, 5, 10, 0, 0).getTime(), now), '2025-03-05');   // 跨年同样带年
  assert.equal(fmtAgo(0, now), '');
  assert.equal(fmtAgo('abc', now), '');
  assert.equal(fmtAgo(now + 86400000, now), ''); // 未来（时钟偏差）不输出假文案
});

// ---------- fmtWan（0.9.69 UP 数据位；原生实测 33235→3.3万 / 29978→3万 / 6062 原样） ----------
test('fmtWan：<1万原样、≥1万一位小数「万」去尾随 .0、脏输入 0', () => {
  assert.equal(fmtWan(9999), '9999');
  assert.equal(fmtWan(6062), '6062');
  assert.equal(fmtWan(10000), '1万');
  assert.equal(fmtWan(10499), '1万');
  assert.equal(fmtWan(29978), '3万');
  assert.equal(fmtWan(33235), '3.3万');
  assert.equal(fmtWan(469000), '46.9万');
  assert.equal(fmtWan(0), '0');
  assert.equal(fmtWan(null), '0');
  assert.equal(fmtWan(NaN), '0');
});
