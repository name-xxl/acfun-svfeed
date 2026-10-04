// ---------- 搜索历史（0.9.151 叶子；0.9.158 后端改**复用站方 searchCache**） ----------
// 后端 = **站方原生搜索框的同一份历史**：`localStorage['searchCache']`（JSON 字符串数组，
// 新词在前）。0.9.158 起读写都走它——我们在脚本里搜的词会出现在站方原生搜索框的面板里，
// 反之亦然（用户裁决「读写复用」+「ui 也复用」，面板见 topbar 的聚焦层）。
//
// **语义照抄站方组件源码**（`static/common/widget/searchBox/index.*.js`，2026-10-05 反查实证）：
//   写入 d(e): JSON.parse(localStorage.getItem('searchCache')) || []  →  filter(去重)
//              →  unshift(新词)  →  **splice(8)**（即保留 8 条上限）  →  setItem
//   清除：键被移除（实测点原生「清除历史」后 getItem === null）
//   面板条目：<a href="/search?keyword=…" target="_blank">词</a>
// **写入前必须过滤**：站方渲染历史是把词拼进 HTML 字符串（同一份源码实证），我们写进这个
// 共享键的词不许带 `<`/`>`（否则等于往原生页面注入标签）——站方用自己的 xssFilter，我们做
// 保守等价（剥标签字符），并按此过滤**合并迁移**进来的老词。
//
// 迁移：0.9.151–157 的自建 GM 键 `acsvSearchHist` 只在**首次读**时合并进站方键（去重、同样
// 过上限与过滤），老键**不删**（回滚友好——与设置层收养老键同一纪律）；此后不再读写它。
// 降级：localStorage 不可用（禁用/异常）时走内存数组，本会话内可用、不抛错。
// 依赖纪律：零 import 叶子（只碰 localStorage，不需要 GM）。
var SITE_KEY = 'searchCache';
var LEGACY_KEY = 'acsvSearchHist';
var HIST_MAX = 8; // 站方上限（splice(8) 实证；0.9.151–157 我们自定 10，复用后照站方）
var memArr = null; // localStorage 不可用时的会话内降级
var merged = false;

function ls() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (e) { }
  return null;
}

// 写入前的保守过滤：站方把词拼进 HTML 渲染，共享键里不许出现标签字符
function safeWord(s) {
  return String(s == null ? '' : s).replace(/[<>]/g, '').trim();
}

function readRaw() {
  var L = ls();
  if (!L) return memArr ? memArr.slice() : [];
  var j = null;
  try { j = JSON.parse(L.getItem(SITE_KEY)); } catch (e) { j = null; }
  return Array.isArray(j) ? j : [];
}

function putArr(a) {
  var L = ls();
  if (!L) { memArr = a.slice(); return; }
  try { L.setItem(SITE_KEY, JSON.stringify(a)); } catch (e) { memArr = a.slice(); }
}

// 老 GM 键 → 站方键的一次性合并（首次读触发；老键保留不删）
function mergeLegacy(arr) {
  if (merged) return arr;
  merged = true;
  var old = '';
  try { if (typeof GM_getValue === 'function') old = String(GM_getValue(LEGACY_KEY, '') || ''); } catch (e) { }
  if (!old) return arr;
  var j = null;
  try { j = JSON.parse(old); } catch (e) { j = null; }
  if (!Array.isArray(j)) return arr;
  // 合并序：**站方词保持原序在前、老键词按原序追加在后**——不扰动原生面板已有的历史序
  //（原生那是用户看得见的主面）；重复时只留站方那条。过上限/过滤同样适用。
  var next = arr.slice();
  j.forEach(function (w) {
    var k = safeWord(w);
    if (!k || next.indexOf(k) >= 0) return;
    next.push(k);
  });
  if (next.length > HIST_MAX) next.length = HIST_MAX;
  putArr(next);
  return next;
}

// 最近搜索（新在前；返回副本，调用方可随意遍历）
export function histList() {
  var arr = readRaw()
    .filter(function (x) { return typeof x === 'string' && x; })
    .map(safeWord)               // 共享键里可能有站方过滤后的词；过来再过一道（双保险，幂等）
    .filter(function (x) { return x; })
    .slice(0, HIST_MAX);
  return mergeLegacy(arr);
}

// 记一个关键词：去重（同词提到最前）+ 上限 8 + 写入前过滤（站方语义，见头注）。空词不记。
export function histAdd(kw) {
  var k = safeWord(kw);
  if (!k) return;
  var a = histList();
  a = a.filter(function (x) { return x !== k; });
  a.unshift(k);
  if (a.length > HIST_MAX) a.length = HIST_MAX;
  putArr(a);
}

// 清空 = 移除站方键（原生「清除历史」同款行为，2026-10-05 实测）
export function histClear() {
  merged = true; // 清空后不再回头合老键（用户明确要清）
  memArr = [];
  var L = ls();
  if (!L) return;
  try { L.removeItem(SITE_KEY); } catch (e) { }
}
