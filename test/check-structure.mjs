/*
 * 静态结构筛（2026-10-30，六域卫生审计收口后的结构面补网）——check-hygiene 管「内容重复」
 * （字面/克隆），本件管「结构形状」：谁活着、谁没人用、谁只有一个消费方、谁在长胖。五筛：
 *   ① 孤儿模块（kind=orphan）：以 boot.js（运行时入口）、build.js 及其 import（cssraw/cssseg
 *      等构建期输入）、test/ 全部文件对 src 的引用为根，静态 import 图可达性遍历；从所有根
 *      都不可达的 src 文件即候选（check-deps 只钉「图里有没有」，本筛钉「运行时够不够得着」）。
 *   ② 死导出（kind=dead）：提取每文件 `export const|let|var|function|class NAME` 与
 *      `export { A, B as C }`（as 形态取导出名；default 跳过），符号在 src+test 全文做
 *      词边界计数（排除声明文件自身、剥注释——注释里的名字不是消费）；0 次即候选。
 *      key 带 @外部出现次数（候选恒为 0，但数字进 key：一旦有人用即脱离候选，登记项自然销账）。
 *      devicetab.js 这类生成物若产生噪声，如实报告计数让人登记，不设硬编码豁免。
 *   ③ 扇出/扇入榜：import 边出度/入度各 top10，纯报告不进闸——只给「该拆件了」的量化参照
 *      （标定：imdrawer.js 拆件前扇出 14）。
 *   ④ 单消费抽象（kind=single，YAGNI 嫌疑）：文件名匹配 /kit\.js$/ 或模块含
 *      `export function create[A-Z]` 工厂，src 消费文件数==1 且 test 无 import 即候选。
 *      视图件被 boot 独引是常态，不在本筛射程（命名特征已收窄到共享件）。
 *   ⑤ 尺寸棘轮（kind=size）：每文件行数+export 符号数记入基线；当前**任一超**基线即 NEW 红
 *      （增长即红=逼一次「拆件还是登记」的人判）；缩小合法。key 形如 size:文件:行L:导出E。
 *      判红特殊：按基线 key 内数字**数值比较**而非精确 key 匹配——精确匹配会把「瘦身」误判为
 *      未登记，与「缩小合法」矛盾。
 * 三种模式（镜像 check-hygiene）：
 *   node test/check-structure.mjs            → 报告模式（永远 exit 0，出候选清单供人判）
 *   node test/check-structure.mjs --gate     → 棘轮模式：候选须全在 test/structure-baseline.json
 *                                              （登记=有意保留/待收口批），新增未登记即红；
 *                                              基线文件缺失按空基线处理（全部候选=NEW=红，正确语义）。
 *   node test/check-structure.mjs --emit     → 建档辅助：stdout 出当前候选+全文件 size 的 key
 *                                              清单（JSON，无 why）——主会话首次生成基线、或
 *                                              收口/瘦身后的基线重排用。
 * 可选参数：--src <dir> 覆盖扫描目录（缺省 src/；自检用——合成病灶放系统临时目录，不碰真实
 *           src）；--baseline <file> 覆盖基线路径（自检用）。
 * 判定口径出处：README「卫生审计判定口径」（2026-10-30：改动放大按「改一个事实」推演、抽象
 * 冗余=YAGNI）与「病灶 × 守卫对照表」。本件落对照表**「通用发现层」行**（发现未知的网，不依赖
 * 预知答案）：孤儿/死导出/单消费钉「没人用的结构」，尺寸棘轮钉「单件膨胀」——将来在「通用发现
 * 层」行守卫列与 check-hygiene --gate 并列填入 check-structure --gate（报告模式 npm run 到位
 * 后由主会话登记 package.json）。
 * 基线条目：{ "kind":"orphan|dead|single|size", "key":..., "why":... }——收口一处删一行，
 * 基线只能缩不能胖。key 携带文件/次数/消费方/尺寸：登记项的触发条件变化（换宿主、长出第二个
 * 消费方、超过登记尺寸）即换 key 转 NEW，「登记时写下的条件」从此由闸看见。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const GATE = process.argv.includes('--gate');
const EMIT = process.argv.includes('--emit');
const SRC = path.resolve(argOf('--src') || path.join(ROOT, 'src'));
const BASE_PATH = argOf('--baseline') || path.join(ROOT, 'test', 'structure-baseline.json');

if (!fs.existsSync(SRC)) {
  console.error('[check-structure] 扫描目录不存在：' + SRC);
  process.exit(2);
}

// test 语料（递归 .js/.mjs/.html）：死导出计数语料 + 孤儿根来源。
// tmp-probe（gitignored 一次性探针，eslint 0.9.257 同判不入检）与 media（二进制）不入语料。
const TEST_DIR = path.join(ROOT, 'test');
const testFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'tmp-probe' || e.name === 'media' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|html)$/.test(e.name)) testFiles.push(p);
  }
})(TEST_DIR);

const readTxt = (p) => fs.readFileSync(p, 'utf8').replace(/\r/g, '');
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
const raw = new Map(files.map((f) => [f, readTxt(path.join(SRC, f))]));
const srcOf = (f) => raw.get(f);
// 剥注释（口径同 check-hygiene）：注释里提到的符号名不是消费，不救死导出
const stripComments = (s) => s.split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\s+\/\/[^'"\n]*$/, ''))
  .join('\n');
const stripped = new Map(files.map((f) => [f, stripComments(srcOf(f))]));
const testText = testFiles.map((p) => stripComments(readTxt(p))).join('\n');

// ---------- import 边（口径同 check-deps：from + 行首副作用导入两正则） ----------
const edges = new Set();
for (const f of files) {
  for (const m of srcOf(f).matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)) edges.add(f + ' -> ' + m[1]);
  for (const m of srcOf(f).matchAll(/^import\s+'\.\/([\w.-]+\.js)';/gm)) edges.add(f + ' -> ' + m[1]);
}
const adj = new Map();
const consumersOf = new Map(); // 入边：file -> Set<消费方 src 文件>（④ 用）
for (const e of edges) {
  const [a, b] = e.split(' -> ');
  if (!adj.has(a)) adj.set(a, []);
  adj.get(a).push(b);
  if (!consumersOf.has(b)) consumersOf.set(b, new Set());
  consumersOf.get(b).add(a);
}
const outDeg = new Map(files.map((f) => [f, 0]));
const inDeg = new Map(files.map((f) => [f, 0]));
for (const e of edges) {
  const [a, b] = e.split(' -> ');
  outDeg.set(a, outDeg.get(a) + 1);
  inDeg.set(b, inDeg.get(b) + 1);
}

// ---------- ① 孤儿模块：根 = boot.js + build.js/test 对 src 的引用，可达性遍历 ----------
const srcNamesIn = (txt) => [...txt.matchAll(/src\/([\w.-]+\.js)/g)].map((m) => m[1])
  .filter((n) => files.includes(n));
const roots = new Set();
if (files.includes('boot.js')) roots.add('boot.js'); // 运行时入口
const buildPath = path.join(ROOT, 'build.js');
if (fs.existsSync(buildPath)) {
  for (const n of srcNamesIn(readTxt(buildPath))) roots.add(n); // 构建期输入（cssraw 等）
}
const testRefs = new Set(); // test 直接引用的 src 文件（既是孤儿根，也是④的 test 消费证据）
for (const p of testFiles) {
  for (const n of srcNamesIn(readTxt(p))) { roots.add(n); testRefs.add(n); }
}
const reach = new Set(roots);
for (const queue = [...roots]; queue.length;) {
  for (const t of (adj.get(queue.pop()) || [])) {
    if (files.includes(t) && !reach.has(t)) { reach.add(t); queue.push(t); }
  }
}
const orphans = files.filter((f) => !reach.has(f));

// ---------- ② 死导出：声明提取 + src+test 全文词边界计数（排除声明文件自身） ----------
function exportsOf(f) {
  const code = stripped.get(f);
  const names = [];
  let m;
  const reDecl = /^export\s+(?!default\b)(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  while ((m = reDecl.exec(code))) names.push(m[1]);
  for (const mm of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (let item of mm[1].split(',')) {
      item = item.trim();
      if (!item) continue;
      const as = item.match(/\s+as\s+([A-Za-z_$][\w$]*)$/); // `a as b` 取导出名 b
      const name = as ? as[1] : item;
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || name === 'default') continue; // 残渣/default 防呆
      names.push(name);
    }
  }
  return [...new Set(names)];
}
const exportsMap = new Map(files.map((f) => [f, exportsOf(f)]));
// 标识符边界（\b 对 $ 名会失手）：前后不紧跟标识符字符（[A-Za-z0-9_$]）才算完整符号
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const useRe = (name) => new RegExp('(?<![\\w$])' + escRe(name) + '(?![\\w$])', 'g');
const dead = [];
const allStripped = files.map((f) => stripped.get(f));
for (let i = 0; i < files.length; i++) {
  const corpus = allStripped.slice(0, i).concat(allStripped.slice(i + 1)).join('\n')
    + '\n' + testText;
  for (const name of exportsMap.get(files[i])) {
    const n = corpus.match(useRe(name));
    if (!n) dead.push({ file: files[i], name, count: 0 });
  }
}

// ---------- ④ 单消费抽象（YAGNI 嫌疑）：kit 命名或 create 工厂，src 消费==1 且 test 无引 ----------
const singles = [];
for (const f of files) {
  const isKit = /kit\.js$/.test(f) || /^export\s+function\s+create[A-Z]/m.test(stripped.get(f));
  if (!isKit) continue;
  const cs = [...(consumersOf.get(f) || [])];
  if (cs.length === 1 && !testRefs.has(f)) singles.push({ file: f, consumer: cs[0] });
}

// ---------- ⑤ 尺寸：行数 + export 符号数（全文件记基线；超基线即 NEW） ----------
const sizes = files.map((f) => ({ file: f, L: srcOf(f).split('\n').length, E: exportsMap.get(f).length }));

// ---------- 基线（棘轮模式；缺失=空基线=全部 NEW，正确语义） ----------
// emit 模式不读基线：建档工作流是 `--emit > 基线路径`——shell 先把目标截成空文件，脚本随后
// 再解析它必崩。建档/重排恰发生在基线缺失或损坏之时，emit 必须对基线零依赖。
const baseline = !EMIT && fs.existsSync(BASE_PATH)
  ? JSON.parse(fs.readFileSync(BASE_PATH, 'utf8')) : { entries: [] };
const baseKeys = new Set(baseline.entries.map((e) => e.key));
const sizeBase = new Map();
for (const e of baseline.entries) {
  const m = /^size:(.+):行(\d+):导出(\d+)$/.exec(e.key);
  if (m) sizeBase.set(m[1], { L: +m[2], E: +m[3] });
}
// key 生成式五份共用（报告/闸/emit 同源，漂移即假绿）：
const orphanKey = (f) => 'orphan:' + f;
const deadKey = (d) => 'dead:' + d.file + ':' + d.name + '@' + d.count;
const singleKey = (s) => 'single:' + s.file + '@' + s.consumer;
const sizeKey = (s) => 'size:' + s.file + ':行' + s.L + ':导出' + s.E;
const sizeNews = sizes.filter((s) => {
  const b = sizeBase.get(s.file);
  return !b || s.L > b.L || s.E > b.E; // 任一超基线即 NEW；缩小合法（数值比较，非精确 key 匹配）
});

// ---------- emit：建档辅助（纯 key 清单；候选 + 全文件 size），基线重排后 why 由人迁 ----------
if (EMIT) {
  console.log(JSON.stringify({ entries: orphans.map((f) => ({ key: orphanKey(f) }))
    .concat(dead.map((d) => ({ key: deadKey(d) })))
    .concat(singles.map((s) => ({ key: singleKey(s) })))
    .concat(sizes.map((s) => ({ key: sizeKey(s) }))) }, null, 1));
  process.exit(0);
}

// ---------- 报告 ----------
const tagOf = (key) => (baseKeys.has(key) ? '登记' : 'NEW ');
const unregistered = [];
console.log('[check-structure] ' + (GATE ? '棘轮' : '报告') + '模式 · src ' + files.length
  + ' 件 · test 语料 ' + testFiles.length + ' 件 · 基线 '
  + (fs.existsSync(BASE_PATH) ? path.basename(BASE_PATH) + ' ' + baseline.entries.length + ' 条' : '缺失（全 NEW）'));
console.log('—— ① 孤儿模块 ' + orphans.length + ' 件（根：boot.js + build.js/test 引用，' + roots.size + ' 个根可达 ' + reach.size + ' 件）——');
for (const f of orphans) {
  const key = orphanKey(f);
  if (!baseKeys.has(key)) unregistered.push(key);
  console.log('  [' + tagOf(key) + '] ' + f);
}
console.log('—— ② 死导出 ' + dead.length + ' 项（外部 0 次提及；生成物噪声如实登记，不设硬编码豁免）——');
for (const d of dead) {
  const key = deadKey(d);
  if (!baseKeys.has(key)) unregistered.push(key);
  console.log('  [' + tagOf(key) + '] ' + d.file + '  ' + d.name);
}
console.log('—— ③ 扇出/扇入 top10（纯报告不进闸；标定：imdrawer.js 拆件前扇出 14）——');
const top = (m) => [...m].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 10);
console.log('  扇出: ' + top(outDeg).map(([f, n]) => f + '×' + n).join(' · '));
console.log('  扇入: ' + top(inDeg).map(([f, n]) => f + '×' + n).join(' · '));
console.log('—— ④ 单消费抽象（YAGNI 嫌疑） ' + singles.length + ' 件（kit 命名/create 工厂 × src 消费==1 × test 无引）——');
for (const s of singles) {
  const key = singleKey(s);
  if (!baseKeys.has(key)) unregistered.push(key);
  console.log('  [' + tagOf(key) + '] ' + s.file + '  唯一消费方 ' + s.consumer);
}
console.log('—— ⑤ 尺寸棘轮 超基线 ' + sizeNews.length + ' 件（行数+导出任一超即 NEW；缩小合法）——');
for (const s of sizeNews) {
  const b = sizeBase.get(s.file);
  console.log('  [NEW ] ' + s.file + '  行' + s.L + (b ? '>基线' + b.L : '（无基线）')
    + '  导出' + s.E + (b ? '>基线' + b.E : ''));
}
// 过时登记：基线里已不再是候选的 key / 已删文件的 size——只提示可缩，不判红（基线只能缩不能胖）
const currentKeys = new Set([...orphans.map(orphanKey), ...dead.map(deadKey), ...singles.map(singleKey)]);
const stale = baseline.entries.filter((e) => !/^size:/.test(e.key) && !currentKeys.has(e.key));
const staleSizes = [...sizeBase.keys()].filter((f) => !files.includes(f));
if (stale.length + staleSizes.length) {
  console.log('—— 过时登记 ' + (stale.length + staleSizes.length) + ' 条（已收口/已删，基线可缩）——');
  for (const e of stale) console.log('  [可删] ' + e.key);
  for (const f of staleSizes) console.log('  [可删] ' + f + ' 的 size 记录（文件已不存在）');
}
console.log('[check-structure] 未登记候选 ' + unregistered.length + ' 项 + 超基线尺寸 ' + sizeNews.length
  + ' 件' + (GATE ? '' : '（报告模式不判红；--gate 转棘轮）'));
if (GATE && (unregistered.length || sizeNews.length)) {
  console.log('  ✗ 结构面新增——收口（接线/摘死码/拆件）或确为有意保留写入 test/structure-baseline.json（带 why）；'
    + '基线缺失时先 --emit 建档');
  process.exit(1);
}
