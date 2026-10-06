// @ts-check
// ---------- 视图注册表（0.9.78 抽离）：registerView 的唯一真源 ----------
// 从 views.js 拆成零依赖小模块的理由：左栏 dock 要按视图的 dock 元数据派生条目列表——
// 此前 sidebar.ENTRIES 与注册表是两份人工清单（加一个视图要改两处，漂移源），而
// sidebar→views 会成环（views→sidebar 取 syncDock）。注册表独立成模块，两侧都读它。
/**
 * 视图注册契约（真契约，契约面 tsc 校验）：build 必填，其余可选。
 * @typedef {{ label:string, svg:string, order:number, group:number }} ViewDock
 * @typedef {{ id:string, build:(body:HTMLElement, arg?:string)=>void, teardown?:()=>void,
 *   resume?:()=>void, suspend?:()=>void, deep?:boolean, volatile?:boolean, dock?:ViewDock }} ViewDef
 * @typedef {{ id:string, label:string, svg:string, order:number, group:number }} DockEntry
 */
/** @type {Record<string, ViewDef>} */
var registry = {};

// def: { id, build(body, arg), teardown?, resume?, suspend?, deep?, volatile?, dock? }
//   dock: { label, svg, order, group } —— 声明即出现在左栏；group 变化处由 sidebar 插分隔线。
//   左栏顺序 = order 升序（同 order 按 id 稳定兜底）。要看视图清单用 viewDef/dockEntries，
//   不要再维护平行清单（0.9.78 前的 sidebar.ENTRIES 就是漂移源）
/** @param {ViewDef} def */
export function registerView(def) {
  if (def && def.id && typeof def.build === 'function') registry[def.id] = def;
}

/** @param {string} id @returns {ViewDef|null} */
export function viewDef(id) {
  return (id && registry[id]) || null;
}

// 左栏视图条目（'feed' 是裸竖刷路由不是视图，由 sidebar 自己补在队首——本函数只答视图部分）
/** @returns {DockEntry[]} */
export function dockEntries() {
  var out = [];
  for (var k in registry) {
    var d = registry[k];
    if (!d || !d.dock) continue;
    out.push({
      id: d.id,
      label: d.dock.label || d.id,
      svg: d.dock.svg || '',
      order: d.dock.order || 0,
      group: d.dock.group || 0
    });
  }
  out.sort(function (a, b) { return a.order - b.order || (a.id < b.id ? -1 : 1); });
  return out;
}
