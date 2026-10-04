// ---------- 搜索历史（0.9.151 抽为叶子件） ----------
// 搜索视图空词态的「最近搜索」数据源：GM 持久 `acsvSearchHist`（JSON 数组字符串，新在前，
// 上限 10），无 GM 环境（harness/降级）内存兜底。语义：add 去重提前 + 截断；clear 清空。
// 抽成零依赖叶子而非留在 searchview：存储读写要能被单测直采（GM 空环境两态），且该域将
// 随"搜索更多类目"继续长大。与 followseen 同款纪律：**读每次问 GM**（不缓存）——
// 缓存会让测试与多标签页互不可见。
var HIST_KEY = 'acsvSearchHist';
var HIST_MAX = 10;
var memRaw = ''; // 无 GM（harness/降级）时的兜底原文

function readArr() {
  var raw = '';
  try {
    if (typeof GM_getValue === 'function') raw = String(GM_getValue(HIST_KEY, '') || '');
  } catch (e) { }
  if (!raw) raw = memRaw;
  var j = null;
  try { j = JSON.parse(raw || '[]'); } catch (e) { j = null; }
  if (!Array.isArray(j)) return [];
  return j.filter(function (x) { return typeof x === 'string' && x; }).slice(0, HIST_MAX);
}

function writeArr(a) {
  var raw = JSON.stringify(a);
  memRaw = raw;
  try { if (typeof GM_setValue === 'function') GM_setValue(HIST_KEY, raw); } catch (e) { }
}

// 最近搜索（新在前；返回副本，调用方可随意遍历）
export function histList() {
  return readArr();
}

// 记一个关键词：去重（同词提到最前）+ 上限截断。空词不记。
export function histAdd(kw) {
  var k = String(kw == null ? '' : kw).trim();
  if (!k) return;
  var a = readArr();
  var i = a.indexOf(k);
  if (i >= 0) a.splice(i, 1);
  a.unshift(k);
  if (a.length > HIST_MAX) a.length = HIST_MAX;
  writeArr(a);
}

export function histClear() {
  writeArr([]);
}
