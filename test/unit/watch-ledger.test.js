// watchledger.js 单测（0.9.87）：观看上报持久账本的对账/参数/信封构造纯函数。
// 立测背景：崩溃/断电出口页面代码已死，harness 模拟不了"崩溃后重启"——所以对账逻辑必须
// 抽纯（now/ttl 可注入）在这里钉死边界。实测依据见 docs/api-research.md「写侧上报」：
// 服务器 playedSeconds 取 latest（低值回退）→ 补报单调守卫是实测必需。
// watchledger.js 模块级零环境触点（GM/localStorage 只在函数内），node 直import 安全
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis; // dbg.js 模块级求值需要（cfg→dbg 依赖链，data.test.js 同惯例）
globalThis.__ACSV_DEBUG__ = false;
var { reconcileLedger, buildHistoryParams, buildHistoryEnvelope } = await import('../../src/watchledger.js');

var NOW = 1790000000000;
var TTL = 24 * 3600 * 1000;

function ledger(obj) { return JSON.stringify(obj); }

test('reconcile：差量条目输出补报列表，id/videoId 反解、sec 取整', () => {
  var r = reconcileLedger(ledger({
    '488900:21005858': { maxSec: 42.9, reportedSec: 10, ts: NOW - 1000 }
  }), NOW, TTL);
  assert.deepEqual(r.replay, [{ id: 488900, videoId: '21005858', sec: 42 }]);
  assert.ok(r.keep['488900:21005858']);
});

test('reconcile：账平（maxSec<=reported）即清，不进 replay 也不留 keep', () => {
  var r = reconcileLedger(ledger({
    'a:1': { maxSec: 30, reportedSec: 30, ts: NOW },
    'b:2': { maxSec: 20, reportedSec: 30, ts: NOW } // reported 更高：低差量绝不补（防回退）
  }), NOW, TTL);
  assert.equal(r.replay.length, 0);
  assert.deepEqual(r.keep, {});
});

test('reconcile：TTL 过期剔除（注入 now/ttl 钉边界）', () => {
  var raw = ledger({ '488900:1': { maxSec: 40, reportedSec: 5, ts: NOW - 1 } });
  assert.equal(reconcileLedger(raw, NOW, TTL).replay.length, 1); // 刚好没过期
  assert.equal(reconcileLedger(raw, NOW + TTL, TTL).replay.length, 0); // 恰好到限：过期
});

test('reconcile：畸形输入容错——坏 JSON/数组/非对象/坏字段全跳过不抛', () => {
  for (var raw of ['not json{', 'null', '[]', '3', null, undefined]) {
    var r = reconcileLedger(raw, NOW, TTL);
    assert.equal(r.replay.length, 0);
    assert.deepEqual(r.keep, {});
  }
  var r = reconcileLedger(ledger({
    bad: 'str', arr: [], empty: null,
    nots: { maxSec: 'x', reportedSec: 1, ts: NOW },
    badts: { maxSec: 5, reportedSec: 1, ts: 0 },
    nokey: { maxSec: 5, reportedSec: 1, ts: NOW },            // key 缺冒号段
    badid: 'x:21005858|{maxSec:5,reportedSec:1,ts:' + NOW + '}' // 形不成对象条目，跳过
  }), NOW, TTL);
  assert.equal(r.replay.length, 0);
});

test('reconcile：key videoId 段含冒号/非数字时原样保留，id 段必须正数', () => {
  var r = reconcileLedger(ledger({
    '488900:mock-488900': { maxSec: 10, reportedSec: 1, ts: NOW }
  }), NOW, TTL);
  assert.deepEqual(r.replay, [{ id: 488900, videoId: 'mock-488900', sec: 10 }]);
  var bad = reconcileLedger(ledger({
    'x:1': { maxSec: 10, reportedSec: 1, ts: NOW },   // id 非数字
    '0:1': { maxSec: 10, reportedSec: 1, ts: NOW },   // id 非正
    '488900:': { maxSec: 10, reportedSec: 1, ts: NOW } // videoId 空
  }), NOW, TTL);
  assert.equal(bad.replay.length, 0);
});

test('reconcile：门槛——差量低于 watchReportMin 的条目不补报', () => {
  var r = reconcileLedger(ledger({
    'a:1': { maxSec: 2.9, reportedSec: 0, ts: NOW }
  }), NOW, TTL);
  assert.equal(r.replay.length, 0);
});

test('reconcile：容量上限——keep 超 32 按 ts 淘汰最旧', () => {
  var obj = {};
  for (var i = 0; i < 40; i++) {
    obj[(488000 + i) + ':v' + i] = { maxSec: 10, reportedSec: 0, ts: NOW - (40 - i) * 1000 };
  }
  var r = reconcileLedger(obj, NOW, TTL);
  assert.equal(r.replay.length, 40); // 差量都有效，补报由调用方逐条清账
  assert.equal(Object.keys(r.keep).length, 32);
  assert.ok(!r.keep['488000:v0']); // ts 最旧的被淘汰
  assert.ok(r.keep['488039:v39']); // 最新的保留
});

test('buildHistoryParams：与官方 CLIENT_BROWSE_HISTORY 逐字段对齐（实测载荷）', () => {
  var p = buildHistoryParams({ id: 488900, videoId: '21005858' }, 42, 'req-1', 'grp-1');
  assert.deepEqual(p, {
    req_id: 'req-1', group_id: 'grp-1',
    atom_id: '21005858', ac_id: '488900', album_id: '0',
    resourceTypeCode: 2, playedSeconds: 42,
    videoId: 21005858, reportIdName: 488900,
    resourceType: 'video', bangumiItemId: null, dougaId: 488900
  });
});

test('buildHistoryEnvelope：克隆官方骨架续号 +1，深拷贝不污染缓存模板', () => {
  var cache = {
    url: 'https://log-sdk.ksapisrv.com/rest/wd/common/log/collect/misc2?v=3.9.21&kpn=ACFUN_WEB',
    common: { identity_package: { user_id: '51737407' }, safety_id: 'AAKK' },
    inc: 4242,
    tpl: {
      client_timestamp: 1, client_increment_id: 4242, session_id: 's', time_zone: 'GMT+08:00',
      event_package: { task_event: { type: 1, element_package: { action: 'VIDEO_PAUSE', params: '{}',
        keepme: 1 } } }
    }
  };
  var env = buildHistoryEnvelope(cache, { id: 488900, videoId: '21005858' }, 42, 'req-1', 'grp-1', NOW);
  assert.equal(env.url, cache.url);
  var parsed = JSON.parse(env.body);
  assert.deepEqual(parsed.common, cache.common); // common 原样透传（JSON 往返后深相等）
  var log = parsed.logs[0];
  assert.equal(log.client_increment_id, 4243); // 从官方序列续号，不自起炉灶
  assert.equal(log.client_timestamp, NOW);
  var ep = log.event_package.task_event.element_package;
  assert.equal(ep.action, 'CLIENT_BROWSE_HISTORY');
  assert.equal(ep.keepme, 1); // 骨架其余字段原样保留
  var params = JSON.parse(ep.params);
  assert.equal(params.playedSeconds, 42);
  assert.equal(params.ac_id, '488900');
  assert.equal(cache.tpl.event_package.task_event.element_package.action, 'VIDEO_PAUSE'); // 模板未污染
  assert.equal(cache.inc, 4242); // inc 由调用方（嗅探/回环）推进，构造器不副作用
});

test('buildHistoryEnvelope：缓存不完整/缺骨架返 null（回落 SDK 队列路径的判据）', () => {
  assert.equal(buildHistoryEnvelope(null, {}, 1, '', '', NOW), null);
  assert.equal(buildHistoryEnvelope({ url: 'u' }, {}, 1, '', '', NOW), null);
  assert.equal(buildHistoryEnvelope({ url: 'u', common: {}, tpl: {} }, {}, 1, '', '', NOW), null); // 无 event_package
});
