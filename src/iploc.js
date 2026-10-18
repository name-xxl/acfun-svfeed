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
//  - 回填触发＝**进入视口**（0.9.247，用户裁决「和广场一样用视口内回填」；squarefeed backfillIO
//    同款机械）——渲染只挂观察、滚到才进队列；命中缓存仍同步上屏（根本不进观察）。长列表
//    （首屏 40 条）不再把屏外评论塞满队列
//  - 「无值不渲染」铁律：ipLocation 空串 → 不上标签、不占位（负缓存防重复查询）
//
// 设置：开关 ipShow / 保留期 ipKeep（SCHEMA group 评论）；Web-IP 老保留期键 `acr_days` 一次性收养。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, isSafeKey } from './ui.js';
import { stat, testHook, swallow } from './dbg.js';
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
  } catch (e) { /* best-effort: storage */ }
  try {
    var raw = localStorage.getItem(UID_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { /* best-effort: storage */ }
  return null;
}

function writeStore(obj) {
  try { if (typeof GM_setValue === 'function') { GM_setValue(UID_KEY, obj); return; } } catch (e) { /* best-effort: storage */ }
  try { localStorage.setItem(UID_KEY, JSON.stringify(obj)); } catch (e) { /* best-effort: storage */ }
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
  window.addEventListener('pagehide', function () { // singleton-listener: 关页落盘兜底，页面级
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; saveUids(); }
  });
} catch (e) { /* 非浏览器环境（单测）忽略 */ }

// Web-IP 保留期老键一次性收养：本设置从未落盘 + 老键在场时才收养（D8：合并日不清老用户偏好）
function adoptLegacyDays() {
  try {
    var mine = null;
    if (typeof GM_getValue === 'function') mine = GM_getValue(storeKey('ipKeep'), null);
    if (mine == null) { try { mine = localStorage.getItem(storeKey('ipKeep')); } catch (e) { /* best-effort: storage */ } }
    if (mine != null) return;
    var old = null;
    if (typeof GM_getValue === 'function') old = GM_getValue(DAYS_KEY, null);
    if (old == null) return;
    var v = mapLegacyDays(old);
    if (v != null) setSetting('ipKeep', v);
  } catch (e) { /* best-effort: storage */ }
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
    cbs.forEach(function (fn) { try { fn(ip, (e && e.t) || 0); } catch (err) { swallow(err, 'iploc'); } });
  });
}

// ---------- 视口内回填（0.9.247，用户裁决「和广场一样用视口内回填」） ----------
// 触发从「渲染即排队」改为「**进入视口**」——squarefeed backfillIO 同款（0.9.228/0.9.230 的机械
// 与教训都在册）：单例 IO、rootMargin 200px、**root=视口**（不是宿主容器——广场实测容器 root 在
// harness 里回调不触发；且「进入视口」本就该以视口为准，两种滚动方言通吃）、进过一次就 unobserve
//（滚回去不重查——正/负缓存已兜）。命中缓存仍同步上屏，只有未命中才挂观察、滚到才排队。
var viewIO = null;
if (typeof IntersectionObserver === 'function') {
  viewIO = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e.isIntersecting) continue;
      var meta = /** @type {any} */ (e.target); // 元素背引用 _acsvIpUid 不在 Element 契约面（cast 过 tsc）
      viewIO.unobserve(meta); // 只观察一次
      var uid = meta._acsvIpUid; // 元素背引用（commentkit _c/_n/_target 体例）
      // 按节点传参进 armQuery（**不在循环里写闭包**——广场 0.9.230「闭包共享绑定、每批只补最后
      // 一行」的真凶在案）
      if (uid != null && meta.isConnected) armQuery(meta, String(uid));
    }
  }, { rootMargin: '200px' });
}

// 进视口后触发（非同步路径）：到点**重判缓存**——等待期间同 uid 的可见条目可能已查回
function armQuery(meta, k) {
  if (!getSetting('ipShow')) return; // 挂观察期间关开关：不再发起
  var st = lookupState(uids[k], Date.now(), keepMsOf(getSetting('ipKeep')));
  if (st === 'pos') { stat('ip.hit'); appendTag(meta, uids[k].ip, uids[k].t || 0, k); return; }
  if (st === 'neg') { stat('ip.neg'); return; }
  fetchFor(k, function (ip, t) {
    if (!meta.isConnected) return; // 条目已被重渲染/宿主关闭：只留缓存
    appendTag(meta, ip, t, k); // k 必带：标签的 data-acsv-uid＝点击弹面板的资料卡键（0.9.254 复审①修）
  });
}

// ---------- 数据侧出口（原生页皮肤等宿主消费；0.9.248 随 6a 增） ----------

// 缓存直读（**不查询**）：原生页重扫补注入用（Web-IP injectFromCache 同义）——新鲜正面才返回
export function peek(uid) {
  var k = String(uid);
  ensureLoaded();
  var st = lookupState(uids[k], Date.now(), keepMsOf(getSetting('ipKeep')));
  return st === 'pos' ? { ip: uids[k].ip, t: uids[k].t || 0 } : null;
}

// uid → 属地回调（原生页等宿主消费；**视口语义归调用方**——命中同步回调、未命中排队、负缓存静默、
// 无值不回调）。抽屉皮肤走 tagInto（自带视口观察），本口给已有自持触发链的宿主用
export function resolveFor(uid, cb) {
  if (!uid || !getSetting('ipShow')) return;
  var k = String(uid);
  ensureLoaded();
  var st = lookupState(uids[k], Date.now(), keepMsOf(getSetting('ipKeep')));
  if (st === 'pos') { stat('ip.hit'); cb(uids[k].ip, uids[k].t || 0); return; }
  if (st === 'neg') { stat('ip.neg'); return; }
  fetchFor(k, function (ip, t) { if (ip) cb(ip, t); });
}

// ---------- 数据管理（0.9.250，面板 6c 消费） ----------

// 缓存条目直读（资料卡用：含负缓存条目；未查询过 null）
export function entryOf(uid) {
  var k = String(uid);
  ensureLoaded();
  return uids[k] || null;
}

// 导出（Web-IP bundle 同形 {version, uids}——其导入侧按 uids 取值，互通；pages 段我们没有）
export function exportUids() {
  ensureLoaded();
  return {
    version: typeof __ACSV_VERSION__ !== 'undefined' ? __ACSV_VERSION__ : '',
    uids: JSON.parse(JSON.stringify(uids))
  };
}

// 导入合并（Web-IP 语义：**跳过已存在**、危险键剔除；接受 bundle {uids} 或裸 uid 表）
export function importUids(data) {
  ensureLoaded();
  var src = data && typeof data === 'object'
    ? (data.uids && typeof data.uids === 'object' ? data.uids : data)
    : null;
  var added = 0;
  if (src) {
    for (var k in src) {
      if (!isSafeKey(k) || uids[k]) continue;
      var e = src[k];
      if (e && typeof e === 'object') { uids[k] = e; added++; }
    }
    if (added) { stat('ip.import', added); saveUids(); }
  }
  return { added: added, total: Object.keys(uids).length };
}

// 清空（显式动作，立即写盘不等防抖）
export function clearUids() {
  ensureLoaded();
  uids = {};
  writeStore(uids);
}

// ---------- 渲染点接线口（单源；commentkit 经 opts.ipTag 注入后调用） ----------

function appendTag(meta, ip, t, uid) {
  if (!ip || meta.querySelector('.acsv-cip')) return; // 幂等：重放/补注不叠标签
  var s = el('span', 'acsv-cip', ip);
  s.dataset.acsvUid = String(uid); // 点击入口（natpanel 捕获委托读取；0.9.253）
  s.title = tagTitle(ip, t);
  meta.appendChild(s);
}

// 挂标签（渲染点调用）：命中即上屏（同步，不进观察）；负缓存静默；未命中挂**视口观察**，滚到
// 才排队（无 IO 的老内核退回渲染即排队）
export function tagInto(meta, uid) {
  if (!uid || !getSetting('ipShow')) return;
  var k = String(uid);
  ensureLoaded();
  var st = lookupState(uids[k], Date.now(), keepMsOf(getSetting('ipKeep')));
  if (st === 'pos') { stat('ip.hit'); appendTag(meta, uids[k].ip, uids[k].t || 0, k); return; }
  if (st === 'neg') { stat('ip.neg'); return; }
  if (viewIO) {
    meta._acsvIpUid = k;
    viewIO.observe(meta);
  } else {
    armQuery(meta, k);
  }
}

testHook('iploc', function () {
  return { size: loaded ? Object.keys(uids).length : -1 };
});
