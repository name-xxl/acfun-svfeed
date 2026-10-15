// @ts-check
// ---------- 评论 IP 属地查询层（0.9.245，Web-IP 吸收批次①；路线图 Phase 5 · 任务卡 5.1） ----------
// 职责：uid → 属地（userInfo 回包 profile.ipLocation）。渲染点接线单源＝tagInto
//（commentkit 经管线 opts.ipTag 调用，见 comments.js.cmtOpts）——缓存命中**同步上屏**、
// 未命中串行排队回填；查询/缓存/负缓存/写防抖全部收在本件。
//
// 与 Web-IP v5.8.5 的关系（吸收口径；每条差异都是有意为之）：
//  - 缓存只留**全局 uid 缓存**，沿用老键 `acr_uids` **同 key 同形状**（正面 {ip,name,t} /
//    负面 {ip:null,failedAt,transient?}）——Web-IP 老用户数据零迁移（路线图 D8）；不做它的
//    页面级缓存（uid 缓存已覆盖跨页复用，双缓存是拦截层时代的冗余）
//  - 不做 commentId→userId 拦截层：抽屉渲染点手里就有 uid（Phase 6 原生页才 port，见路线图 6.1）
//  - 查询走 net.request（GM 优先、XHR withCredentials 兜底）——通道真机定案（GM 裸调带回登录态），
//    见 docs/api-research.md §12.4；实测属地口径＝省级短名，原文直显不做二次格式化（§12.1）
//  - 串行限流 / 负缓存分级 / 写防抖 / 上限淘汰照 Web-IP 既有值（阈值收 CFG.ip 单源）；
//    **加** pagehide 兜底落盘（路线图健壮性通则：关页时在途防抖要答得上出口）
//  - 「无值不渲染」铁律：ipLocation 空串 → 不上标签、不占位（负缓存防重复查询）
//
// 设置：开关 ipShow / 保留期 ipKeep（SCHEMA group 评论）；Web-IP 老保留期键 `acr_days` 一次性收养。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { el } from './ui.js';
import { stat } from './dbg.js';
import { getSetting, setSetting, storeKey } from './settings.js';

var UID_KEY = 'acr_uids';   // Web-IP v5.8.5 同 key（形状也同——双向兼容）
var DAYS_KEY = 'acr_days';  // Web-IP 保留期偏好老键（只收养一次，不写回）
var DAY = 864e5;

/** @typedef {{ ip: string|null, name?: string, t?: number, failedAt?: number, transient?: boolean }} IpEntry */

/** @type {Object<string, IpEntry>} */
var uids = {};
/** @type {Object<string, Array<(ip: string, t: number) => void>>} */
var pending = {};
var loaded = false;
var saveTimer = null;
var qTail = Promise.resolve();

// ---------- 纯函数（单测直采；环境触点只在下方壳里） ----------

// 负缓存新鲜度（迁 Web-IP isFailureCacheFresh，补 now 注入可测）：无 failedAt 不算；
// 瞬时错误（超时/断网/风控）用短 TTL，防瞬时故障把标签藏半天
export function isFailureCacheFresh(entry, now) {
  if (!entry || !entry.failedAt) return false;
  var ttl = entry.transient ? CFG.ip.transientFailedTtlMs : CFG.ip.failedTtlMs;
  return now - entry.failedAt < ttl;
}

// 正面新鲜度：保留期 0＝永久；老数据无时间戳视为新鲜（Web-IP 同款读法——旧页面缓存迁移来的
// 正面条目没有 t）
export function positiveFresh(entry, now, keepMs) {
  if (!entry || !entry.ip) return false;
  if (!keepMs || !entry.t) return true;
  return now - entry.t < keepMs;
}

// 缓存判定三态（tagInto 单源消费）：'pos' 可直接上屏 / 'neg' 负缓存新鲜静默跳过 / 'miss' 排队
export function lookupState(entry, now, keepMs) {
  if (!entry) return 'miss';
  if (entry.ip) return positiveFresh(entry, now, keepMs) ? 'pos' : 'miss';
  return isFailureCacheFresh(entry, now) ? 'neg' : 'miss';
}

// 保留期设置值 → 毫秒（档位值域＝天数，与 Web-IP acr_days 同域；'0'＝永久）
export function keepMsOf(v) {
  var n = Number(v);
  if (!isFinite(n) || n < 0) n = Number(CFG.ip.keepDef) || 0;
  return n > 0 ? n * DAY : 0;
}

// Web-IP 老键 acr_days → 本设置档位（值域重合零翻译；非法值 null＝不收养）
export function mapLegacyDays(v) {
  var s = String(v);
  for (var i = 0; i < CFG.ip.keepOptions.length; i++) {
    if (CFG.ip.keepOptions[i].v === s) return s;
  }
  return null;
}

// tooltip 文案（Web-IP 三行同款，文案单源——Phase 6 原生皮肤同用；t 缺省不落第三行）
export function tagTitle(ip, t) {
  var s = 'IP属地：' + ip + '\n（基于用户主页实时资料，不代表发布时的IP）';
  if (t) s += '\n查询于：' + new Date(t).toLocaleString();
  return s;
}

// 过期清理 + 上限淘汰（按时间最旧先出）原地进行，返回删除条数（load/save 两处共用）
export function pruneUids(map, now, keepMs, cap) {
  var removed = 0;
  for (var k in map) {
    var e = map[k];
    if (!e || typeof e !== 'object') { delete map[k]; removed++; continue; }
    if (e.ip) {
      if (keepMs && e.t && now - e.t >= keepMs) { delete map[k]; removed++; }
    } else if (!isFailureCacheFresh(e, now)) {
      delete map[k]; removed++;
    }
  }
  var keys = Object.keys(map);
  if (keys.length > cap) {
    keys.sort(function (a, b) {
      return ((map[a].t || map[a].failedAt || 0) - (map[b].t || map[b].failedAt || 0));
    });
    for (var i = 0; i < keys.length - cap; i++) { delete map[keys[i]]; removed++; }
  }
  return removed;
}

// ---------- 存储触点（GM 优先 / localStorage 回落；acr_uids 对 Web-IP 双向兼容） ----------

function readStore() {
  try {
    if (typeof GM_getValue === 'function') {
      var g = GM_getValue(UID_KEY, null);
      if (g) return typeof g === 'string' ? JSON.parse(g) : g;
    }
  } catch (e) { }
  try {
    var raw = localStorage.getItem(UID_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { }
  return null;
}

function writeStore(obj) {
  try { if (typeof GM_setValue === 'function') { GM_setValue(UID_KEY, obj); return; } } catch (e) { }
  try { localStorage.setItem(UID_KEY, JSON.stringify(obj)); } catch (e) { }
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  var raw = readStore();
  if (raw && typeof raw === 'object') {
    for (var k in raw) {
      var e = raw[k];
      if (e && typeof e === 'object') uids[k] = e;
    }
  }
  pruneUids(uids, Date.now(), keepMsOf(getSetting('ipKeep')), CFG.ip.maxUids);
}

function saveUids() {
  pruneUids(uids, Date.now(), keepMsOf(getSetting('ipKeep')), CFG.ip.maxUids);
  writeStore(uids);
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    saveUids();
  }, CFG.ip.saveDebounceMs);
}

// 关页兜底：在途防抖的查询结果不丢（settings.flushSettings 同款纪律）
try {
  window.addEventListener('pagehide', function () {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; saveUids(); }
  });
} catch (e) { /* 非浏览器环境（单测）忽略 */ }

// Web-IP 保留期老键一次性收养：本设置从未落盘 + 老键在场时才收养（D8：合并日不清老用户偏好）
function adoptLegacyDays() {
  try {
    var mine = null;
    if (typeof GM_getValue === 'function') mine = GM_getValue(storeKey('ipKeep'), null);
    if (mine == null) { try { mine = localStorage.getItem(storeKey('ipKeep')); } catch (e) { } }
    if (mine != null) return;
    var old = null;
    if (typeof GM_getValue === 'function') old = GM_getValue(DAYS_KEY, null);
    if (old == null) return;
    var v = mapLegacyDays(old);
    if (v != null) setSetting('ipKeep', v);
  } catch (e) { }
}
adoptLegacyDays();

// ---------- 查询（串行限流 + inflight 合并 + 写盘防抖；口径照 Web-IP） ----------

// 相邻请求最小间隔（防「滚动一屏并发几十个」触发风控）：队列尾链式（Web-IP scheduleRequest 同款）
function scheduleRequest(job) {
  var result = qTail.then(job);
  qTail = result.catch(function () { }).then(function () {
    return new Promise(function (resolve) { setTimeout(resolve, CFG.ip.intervalMs); });
  });
  return result;
}

// 回包 → 缓存（Web-IP applyUserInfo 同口径）：有值存正面（带 name/t），空串存负面（6h）
function applyUserInfo(k, j) {
  var p = (j && j.profile) || {};
  var ip = p.ipLocation || '';
  if (ip) uids[k] = { ip: ip, name: p.name || '', t: Date.now() };
  else uids[k] = { ip: null, failedAt: Date.now() };
  scheduleSave();
}

// 触发查询（inflight 合并：同 uid 多条评论共用一发）；结束后回调全部等待者（值可为空＝无属地）
function fetchFor(k, cb) {
  if (pending[k]) { pending[k].push(cb); return; }
  pending[k] = [cb];
  scheduleRequest(function () {
    stat('ip.q');
    return request(CFG.api.userInfo + k, 'GET').then(function (j) {
      applyUserInfo(k, j);
    }, function () {
      // 超时/断网/http 非 2xx/坏 JSON：瞬时负缓存（分级同 Web-IP——短 TTL 防瞬时故障反复重打）
      stat('ip.fail');
      uids[k] = { ip: null, failedAt: Date.now(), transient: true };
      scheduleSave();
    });
  }).then(function () {
    var cbs = pending[k] || [];
    delete pending[k];
    var e = uids[k];
    var ip = (e && e.ip) || '';
    if (ip) stat('ip.serve');
    cbs.forEach(function (fn) { try { fn(ip, (e && e.t) || 0); } catch (err) { } });
  });
}

// ---------- 渲染点接线口（单源；commentkit 经 opts.ipTag 注入后调用） ----------

function appendTag(meta, ip, t) {
  if (!ip || meta.querySelector('.acsv-cip')) return; // 幂等：重放/补注不叠标签
  var s = el('span', 'acsv-cip', ip);
  s.title = tagTitle(ip, t);
  meta.appendChild(s);
}

// 挂标签（渲染点调用）：命中即上屏（同步）；负缓存静默；未命中排队，回填前查节点存活
export function tagInto(meta, uid) {
  if (!uid || !getSetting('ipShow')) return;
  var k = String(uid);
  ensureLoaded();
  var st = lookupState(uids[k], Date.now(), keepMsOf(getSetting('ipKeep')));
  if (st === 'pos') { stat('ip.hit'); appendTag(meta, uids[k].ip, uids[k].t || 0); return; }
  if (st === 'neg') { stat('ip.neg'); return; }
  fetchFor(k, function (ip, t) {
    if (!meta.isConnected) return; // 条目已被重渲染/宿主关闭：只留缓存
    appendTag(meta, ip, t);
  });
}
