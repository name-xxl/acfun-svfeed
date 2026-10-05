/*
 * 依赖图校验（0.9.81）：README 的 mermaid 依赖图 ↔ src/*.js 真实静态 import。
 * 五条规则（对照 0.9.59「人工补 7 条缺失边」的教训定标——图是**精选图**：刻意省略到基础件的
 * 大多数边，所以不能拿 import 全集去要求图）：
 *   ① 每个 src/*.js 必须出现在图里（节点或聚合节点 others 名单内）——新模块漏进图，报错；
 *   ② 图里每个节点文件必须真实存在——删模块忘改图，报错；
 *   ③ import 边只要**目标不是基础件**，就必须在图里——特征层的新依赖漏画，报错；
 *   ④ 图里有、import 没有的边——告警（概念性分组边，如 views→mypage，不做强判）；
 *   ⑤ import 全集环检测（0.9.115 起）：任何静态环即红（对全部内部边、含基础件目标；
 *      与 README 精选图无关）。**边界**：无环 ≠ 方向正确——无环的反向边（如 0.9.110 前的
 *      topbar→followstream）不在本规则射程，方向规则留待后续；不得把本规则绿灯误读为
 *      「依赖方向已被守护」。
 * 基础件（EXCLUDED_TARGETS）：图对它们只保留少量精选边（如 data→cfg），其余不要求。
 * 环检测史（0.9.115 收官实证）：清边前全图 14 环全部穿经 feedstore→player，断该边后 0 环
 * ——清单与对比留档 docs/dependency-audit.md。
 *
 *   node test/check-deps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const EXCLUDED_TARGETS = new Set(['cfg.js', 'net.js', 'state.js', 'route.js',
  'ui.js', 'dbg.js', 'styles.js', 'playitem.js', 'panelitem.js']); // 基础/工具件（含契约件，0.9.162 接替 data.js）：图刻意只留少量精选边，不要求全画

// ---- 真实 import 边 + 模块清单 ----
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
const imports = new Set();
for (const f of files) {
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const m of txt.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)) imports.add(f + ' -> ' + m[1]);
  for (const m of txt.matchAll(/^import\s+'\.\/([\w.-]+\.js)';/gm)) imports.add(f + ' -> ' + m[1]); // 副作用导入（自注册）
}

// ---- mermaid 图：节点 / 聚合名单 / 边 ----
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const block = (readme.match(/```mermaid([\s\S]*?)```/) || [])[1] || '';
const nodeFiles = new Set(files);
const id2file = {};
const aggregated = new Set();
for (const m of block.matchAll(/^\s*(\w+)\["([^"\]]+)"\]/gm)) {
  const label = m[2];
  if (/\.js/.test(label)) {
    const fm = label.match(/^([\w.-]+\.js)/);
    if (fm) id2file[m[1]] = fm[1];
  } else {
    // 聚合节点（others）：标签是 `a · b · c` 形式的模块名清单（无 .js）
    label.split(' · ').forEach((t) => aggregated.add(t.trim() + '.js'));
  }
}
// 隐式节点：图里只在边上出现、未单独声明的 id（views/sidebar/overlay/comments…）——
// 按 `<id>.js` 推断（文件存在才算图内节点；others 之类聚合 id 无同名文件，自动落空）
for (const m of block.matchAll(/^\s*(\w+)\s*-->/gm)) {
  if (!id2file[m[1]] && nodeFiles.has(m[1] + '.js')) id2file[m[1]] = m[1] + '.js';
}
const graphEdges = new Set();
for (const m of block.matchAll(/^\s*(\w+)\s*-->\s*(.+)$/gm)) {
  const from = id2file[m[1]];
  if (!from) continue; // 聚合/未知节点：不参与边比对
  for (const t of m[2].split('&')) {
    const to = id2file[t.trim()];
    if (to) graphEdges.add(from + ' -> ' + to);
  }
}

const bad = [];
const graphFiles = new Set(Object.values(id2file));
// ① 模块漏进图
for (const f of files) {
  if (!graphFiles.has(f) && !aggregated.has(f)) {
    bad.push('src/' + f + ' 未进依赖图（加节点或写进 others 聚合名单）');
  }
}
// ② 图节点文件不存在
for (const id of Object.keys(id2file)) {
  if (!files.includes(id2file[id])) bad.push('图节点 ' + id + ' 指向不存在的 src/' + id2file[id]);
}
// ③ 特征层 import 边漏画
const missing = [...imports].filter((e) => {
  const [a, b] = e.split(' -> ');
  return graphFiles.has(a) && graphFiles.has(b) && !EXCLUDED_TARGETS.has(b) && !graphEdges.has(e);
}).sort();
missing.forEach((e) => bad.push('依赖图缺边：' + e + '（import 有、图里没有）'));
// ④ 概念边告警
const extra = [...graphEdges].filter((e) => {
  const [a, b] = e.split(' -> ');
  return !imports.has(e) && !EXCLUDED_TARGETS.has(b); // 基础件的精选多边不算问题
}).sort();

// ⑤ import 全集环检测（0.9.115）：任何静态环即红——环是求值期 undefined/TDZ 事故温床；
// 不设登记豁免（收官后全图 DAG，新环=架构腐化，先拆边再谈）
const adj = new Map();
for (const e of imports) {
  const [a, b] = e.split(' -> ');
  if (!adj.has(a)) adj.set(a, []);
  adj.get(a).push(b);
}
const seen = new Set(), stack = [], inStack = new Set();
function walk(n) {
  seen.add(n); stack.push(n); inStack.add(n);
  for (const m of (adj.get(n) || [])) {
    if (inStack.has(m)) bad.push('import 环：' + stack.slice(stack.indexOf(m)).concat(m).join(' → '));
    else if (!seen.has(m)) walk(m);
  }
  stack.pop(); inStack.delete(n);
}
for (const f of files) if (!seen.has(f)) walk(f);

console.log('[check-deps] src ' + files.length + ' 个 / 图节点 ' + Object.keys(id2file).length
  + ' 个 + 聚合 ' + aggregated.size + ' 个 / 图边 ' + graphEdges.size + ' 条 / import 边 ' + imports.size + ' 条');
if (extra.length) {
  console.log('  ⚠ 多边（图里有、import 没有——概念边或已删代码，仅告警）：');
  extra.forEach((e) => console.log('      ' + e));
}
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-deps] OK');
