import { CFG } from './cfg.js';

// ---------- 观看上报持久账本 + 官方 klog 信封（0.9.87） ----------
// 纯逻辑层：账本结构/对账、上报参数/直发信封构造全部抽成可注入的纯函数——崩溃/断电/
// 强杀出口里页面代码已死，harness 无法模拟"崩溃后重启"，所以对账必须可单测、环境触点
// （GM/Beacon 嗅探）全部留在 report.js。实测依据（2026-10-03 内置浏览器登录态，见
// docs/api-research.md「写侧上报」）：服务器 browseTime 精确采信信封 client_timestamp；
// playedSeconds 取 latest（低值会回退）——所以补报单调守卫是实测必需而非设计偏好。

export var LEDGER_KEY = 'acsvWatchLedger';
var LEDGER_CAP = 32; // 容量上限：长会话按 ts 淘汰最旧条目，防账本无限涨

// ---------- 存储触点（GM 优先跨 origin 共享，emoticon.js 先例；无 TM 回落 localStorage） ----------
function rawGet() {
  try { if (typeof GM_getValue === 'function') return GM_getValue(LEDGER_KEY); } catch (e) { }
  try { return localStorage.getItem(LEDGER_KEY); } catch (e) { }
  return null;
}
function rawSet(str) {
  try { if (typeof GM_setValue === 'function') { GM_setValue(LEDGER_KEY, str); return; } } catch (e) { }
  try { localStorage.setItem(LEDGER_KEY, str); } catch (e) { }
}

// ---------- 对账（纯函数，now/ttl 可注入） ----------
// raw = 账本 JSON 串或对象。返回 { replay, keep }：
//   replay = 待补报差量 [{ id, videoId, sec }]——单调守卫：只补 maxSec > reportedSec 的
//            死会话差量（无用户意图；live 路径镜像官方语义允许回退，见 report.js 注释，
//            两者不冲突：补报发生时 live 路径已死）。
//   keep   = 清洗后账本——TTL 过期 / 账平（maxSec<=reported）/ 畸形条目剔除，超容量按 ts
//            淘汰最旧。调用方补报成功后从 keep 删除对应条目再落盘。
// 畸形 JSON 串整体容错：返空账，不抛。
export function reconcileLedger(raw, now, ttl) {
  var out = { replay: [], keep: {} };
  var obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch (e) { return out; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  var limit = typeof ttl === 'number' ? ttl : CFG.time.watchLedgerTtl;
  var kept = [];
  for (var k in obj) {
    var e = obj[k];
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    var maxSec = Number(e.maxSec), reported = Number(e.reportedSec), ts = Number(e.ts);
    if (!isFinite(maxSec) || !isFinite(reported) || !isFinite(ts) || ts <= 0) continue;
    if (now - ts > limit) continue;   // TTL：历史早已翻篇，不养僵尸
    if (maxSec <= reported) continue; // 账平即清
    var parts = String(k).split(':');
    var id = Number(parts[0]);
    var videoId = parts.slice(1).join(':'); // key = item.id:videoId，videoId 段保留原样
    if (!isFinite(id) || id <= 0 || !videoId) continue;
    var sec = Math.floor(maxSec);
    if (sec < CFG.time.watchReportMin) continue; // 门槛与 live 一致
    out.replay.push({ id: id, videoId: videoId, sec: sec });
    out.keep[k] = { maxSec: maxSec, reportedSec: reported, ts: ts };
    kept.push([ts, k]);
  }
  // 容量淘汰：keep 超上限按 ts 删最旧（补报在即的条目也在 keep 里，由调用方删除）
  if (kept.length > LEDGER_CAP) {
    kept.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 0; i < kept.length - LEDGER_CAP; i++) delete out.keep[kept[i][1]];
  }
  return out;
}

// ---------- 上报参数（纯函数）：live 与补报共用，与官方逐字段对齐 ----------
// 2026-10-03 实测官方普通视频载荷：带 bangumiItemId: null；其余字段见 docs 写侧上报
export function buildHistoryParams(item, sec, reqId, groupId) {
  return {
    req_id: reqId,
    group_id: groupId,
    atom_id: String(item.videoId),
    ac_id: String(item.id),
    album_id: '0',
    resourceTypeCode: 2,
    playedSeconds: sec,
    videoId: Number(item.videoId) || 0,
    reportIdName: Number(item.id) || 0,
    resourceType: 'video',
    bangumiItemId: null,
    dougaId: Number(item.id) || 0
  };
}

// ---------- 关页直发信封（纯函数） ----------
// cache = 嗅探缓存 { url, common, tpl, inc }（report.js 嗅探官方 misc2 批所得）。克隆官方
// 批里一条 log 的骨架（task_event 信封结构原样），只换时间戳/自增号/action/params——
// client_increment_id 从官方序列续号（+1，不自起炉灶：防服务器会话级单调/去重校验把
// 自编号当重复丢弃）；common 原样透传（含 safety_id，实测服务器认）。缓存不完整返 null。
export function buildHistoryEnvelope(cache, item, sec, reqId, groupId, now) {
  if (!cache || !cache.url || !cache.common || !cache.tpl) return null;
  var log = JSON.parse(JSON.stringify(cache.tpl)); // 深拷贝：不得污染嗅探缓存里的模板
  if (!log || !log.event_package || !log.event_package.task_event) return null;
  var task = log.event_package.task_event;
  if (!task.element_package) return null;
  log.client_timestamp = typeof now === 'number' ? now : Date.now();
  log.client_increment_id = (Number(cache.inc) || 0) + 1;
  task.element_package.action = 'CLIENT_BROWSE_HISTORY';
  task.element_package.params = JSON.stringify(buildHistoryParams(item, sec, reqId, groupId));
  return { url: cache.url, body: JSON.stringify({ common: cache.common, logs: [log] }) };
}

// ---------- 账本读写（内存镜像 + 写穿；启动即清账） ----------
var ledgerMem = null;
function mem() {
  if (!ledgerMem) {
    var raw = rawGet();
    ledgerMem = raw ? reconcileLedger(raw, Date.now()).keep : {}; // 启动清账：TTL/账平/畸形不进内存
  }
  return ledgerMem;
}
function flush() {
  try { rawSet(JSON.stringify(ledgerMem)); } catch (e) { }
}

// 播放中水位（onTime 节流后调用）：只推 maxSec，不动 reportedSec——单调水位
export function ledgerMax(key, sec, now) {
  var m = mem();
  var e = m[key];
  if (!e) e = m[key] = { maxSec: 0, reportedSec: 0, ts: 0 };
  e.ts = now; // 持续观看即活跃：TTL 按 ts 判，不能让长播放中途过期
  if (sec > e.maxSec) e.maxSec = sec;
  flush();
}

// 上报成功后同步（乐观水位：sendImmediately fire-and-forget，见 report.js 注释）
export function ledgerReported(key, sec, now) {
  var m = mem();
  var e = m[key];
  if (!e) e = m[key] = { maxSec: 0, reportedSec: 0, ts: 0 };
  if (sec > e.maxSec) e.maxSec = sec;
  e.reportedSec = sec;
  e.ts = now;
  flush();
}

export function ledgerDelete(key) {
  var m = mem();
  if (m[key]) { delete m[key]; flush(); }
}

export function ledgerSnapshot() { return mem(); }
