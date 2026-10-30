/*
 * 通用重复扫描器（2026-10-30，用户追问「能否机械判定」；0.9.308 补第三扫；同日扩面补④⑤两扫）
 * ——把卫生审计的判定口径变成不依赖预先知道答案的网：定向棘轮
 * （check-dialect/liststate/zlayers）只守「已知事实」，本件负责**发现未知**。五扫：
 *   ① 字符串字面跨文件重复：CJK 用户文案 / ≥12 字符协议·URL·键串（排除 web 惯用词表），
 *      同一字面出现 ≥2 文件即候选（README 判定口径 1：字面≥2处即病灶，一致只是漂移前态）。
 *   ② 代码克隆：注释剥离 + 空白归一后，≥K 连续有效行的同形窗口跨文件出现即候选；
 *   ③ 同文件 ≥3 写（0.9.308）：文案串/长协议串在本件内第 3 次出现即候选（跨文件网看不见
 *      的角落；数字面实测同名不同义淹信号，有意不扫，见 CHANGELOG 0.9.308 盲区测量）。
 *   ④ 债务标记（2026-10-30 扩面）：在**含注释原文**扫 /TODO|FIXME|HACK|未实测/——不能用
 *      stripComments 后文本，TODO 就住在注释里（与 ①②③ 的剥注释层分属两层，不共用中间量）；
 *      kind=debt；key=debt:文件:字样@次数（不用行号——行号易漂；次数变化即换 key 转 NEW，
 *      「记下的债还了没有、又欠了几笔」由闸看见）。
 *   ⑤ 纯叶失真（2026-10-30 扩面）：leaf 清单**机器读自 README.md 依赖图 `class … leaf;` 行**
 *      （解析逗号分隔文件名；读不到 fail loud 直接报错退出，不许静默跳过——纯度宣称失去
 *      事实源就等于没宣称）。strip comments 后的文本含 document. / window. / globalThis /
 *      localStorage / Date.now( / Math.random( / new Date( 任一即候选；kind=leaf；
 *      key=leaf:文件:原语。依据=README 卫生审计判定口径 3「注释即事实源者必须可核」：
 *      零依赖叶的纯度是写给消费方的承诺，必须机械核验，不核就是假注释。--src 只换扫描目录，
 *      事实源仍在本仓 README。
 * 三种模式（另有可选 --src <dir> 覆盖扫描目录，缺省 src/ 不变，向后兼容，供 fixture 自检）：
 *   node test/check-hygiene.mjs            → 报告模式（永远 exit 0，出候选清单供人判）
 *   node test/check-hygiene.mjs --gate     → 棘轮模式：候选须全在 test/hygiene-baseline.json
 *                                            （登记=有意并存/待收口批），新增未登记即红。
 *   node test/check-hygiene.mjs --emit     → 迁移辅助：stdout 出当前候选的 key 清单（JSON，
 *                                            无 why）——key 格式升级/收口后重排基线用。
 * 基线条目：{ "kind":"dup|idup|clone|debt|leaf", "key":..., "why":... }——收口一处删一行，
 * 基线只能缩不能胖。key 携带**文件集/次数**（0.9.309）：dup:字面@文件,文件 / idup:文件:字面@次数 /
 * clone:文件+文件:首窗首行——登记项扩张（×2→×3、换宿主、同件加写）即换 key 转 NEW，
 * 「登记时写下的触发条件」（如「扩到 3 处再抽 helper」）从此由闸看见，不再靠眼过。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// --src <dir>：覆盖扫描目录（缺省 src/ 不变；resolve 兼容绝对路径，供 fixture 自检）
const SRCI = process.argv.indexOf('--src');
const SRC = path.resolve(ROOT, SRCI > -1 && process.argv[SRCI + 1] ? process.argv[SRCI + 1] : 'src');
const GATE = process.argv.includes('--gate');
const EMIT = process.argv.includes('--emit');
const K = 6; // 克隆判定：连续有效行数阈值

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
const srcOf = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r/g, '');

// ---------- ① 字符串字面跨文件重复 ----------
// web/DOM/HTTP 惯用词——重复它们不是病灶（浏览器 API 词汇表），从候选里排除
const IDIOM = new Set(['POST', 'GET', 'PUT', 'DELETE', 'PATCH', 'HEAD',
  'Content-Type', 'application/json', 'text/html', 'application/x-www-form-urlencoded',
  'click', 'keydown', 'keyup', 'keypress', 'input', 'change', 'scroll', 'load', 'error',
  'abort', 'timeout', 'resize', 'focus', 'blur', 'mouseenter', 'mouseleave', 'mousedown',
  'mouseup', 'mousemove', 'pointerdown', 'pointerup', 'pointermove', 'pointercancel',
  'touchstart', 'touchend', 'touchmove', 'visibilitychange', 'hashchange', 'DOMContentLoaded',
  'complete', 'loading', 'interactive', 'automatic', 'none', 'auto', 'both', 'horizontal',
  'vertical', 'block', 'inline', 'flex', 'grid', 'absolute', 'fixed', 'relative', 'sticky',
  'hidden', 'visible', 'cover', 'contain', 'center', 'pointer', 'default', 'inherit',
  'https://', 'http://', '//', '/', '', 'utf-8', 'no-referrer', 'same-origin',
  'boolean', 'string', 'number', 'object', 'function', 'undefined', 'null',
  'text/javascript']); // 0.9.309 补：Blob 装载 MIME——与表内 application/json 同类惯用，
                       // hls/imsdk 双件同法登记项据此销账（值属平台词汇，非项目字面）
const HAS_CJK = /[一-鿿＀-￯]/;
const stripComments = (s) => s.split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\s+\/\/[^'"\n]*$/, ''))   // 行尾注释（串内含 // 的以引号粗判）
  .join('\n');

const stringMap = new Map(); // lit -> Set<file>
const weakSet = new Set();   // 短词类弱候选（打印供眼过，不进棘轮账）
for (const f of files) {
  const code = stripComments(srcOf(f));
  let m;
  const re = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`/g;
  while ((m = re.exec(code))) {
    const lit = m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]);
    if (lit === undefined || lit.length < 2) continue;
    if (IDIOM.has(lit)) continue;
    if (/^\.\//.test(lit)) continue;                  // import 路径（ES 模块常态，不是病灶）
    if (/^&?[\w-]+=$/.test(lit) || /^[\w&?=-]+$/.test(lit)) continue;  // 纯拼参片段（`&x=`）：值单源在枚举表，片段共用无害
    const isCopy = HAS_CJK.test(lit);
    // CJK 短词（≤4 字且无标点/数字）：同名不同义的按钮词常态（「关闭」×6 各有语境），
    // 降入弱候选（文末一行带过），不进棘轮主账
    const shortWord = isCopy && lit.length <= 4 && !/[，。：；？！、（）%\d]/.test(lit);
    if (shortWord) { if (!weakSet.has(lit)) weakSet.add(lit); continue; }
    const isProto = !isCopy && lit.length >= 12 &&
      (/[=:/&.?]/.test(lit) || /[\w-]+\.[\w-]+/.test(lit));
    if (!isCopy && !isProto) continue;
    if (!stringMap.has(lit)) stringMap.set(lit, new Set());
    stringMap.get(lit).add(f);
  }
}
const dups = [...stringMap].filter(([, s]) => s.size >= 2)
  .sort((a, b) => b[1].size - a[1].size);

// ---------- ③ 同文件内重复字面（≥3 写，跨文件网看不见的角落） ----------
// 排除：cssraw.js（CSS 模板本体，重复样式段是设计）；缝名 {{…}}；首尾非标点成分的「胶水串」
// （", label: " "</a>" "<i …>" 这类拼装尾/HTML 骨架——收常量价值低、噪声高，如实放弃这条边）；
// CJK ≤2 字。合格判据同判定口径 1：本件内第 3 次写同一串，就该有常数。
const idups = []; // {file, lit, n}
for (const f of files) {
  if (f === 'cssraw.js') continue;
  const code = stripComments(srcOf(f));
  const cnt = new Map();
  let m;
  const re3 = /'([^'\n]{4,})'|"([^"\n]{4,})"|`([^`\n$]{4,})`/g;
  while ((m = re3.exec(code))) {
    const lit = m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]);
    if (IDIOM.has(lit) || /^\.\//.test(lit) || lit.includes('{{') || /\}\}$/.test(lit)) continue;
    // 胶水/骨架尾排除只对 ASCII 串判（JS 的 \W 含 CJK——中文文案首字不是标点！）
    if (!HAS_CJK.test(lit) && /^\W|\W$/.test(lit)) continue;
    // 题材聚焦（同判定口径 1 的本意）：CJK 文案串（≥4 字）或含非字面字符的长协议串（≥16）——
    // DOM tag 名、状态机串（'disposed'×18）、类型字面量属正常多写，不是「该常量化」的文案/协议
    if (HAS_CJK.test(lit) ? lit.length < 4
      : !(lit.length >= 16 && /[^A-Za-z0-9_ .\-:]/.test(lit))) continue;
    cnt.set(lit, (cnt.get(lit) || 0) + 1);
  }
  for (const [lit, n] of cnt) if (n >= 3) idups.push({ file: f, lit, n });
}
idups.sort((a, b) => b.n - a.n);

// ---------- ② 代码克隆（跨文件同形窗口） ----------
function sigLines(f) {
  const out = [];
  stripComments(srcOf(f)).split('\n').forEach((l, i) => {
    const t = l.trim().replace(/\s+/g, ' ');
    if (t) out.push({ n: i + 1, t });
  });
  return out;
}
const winMap = new Map(); // join-key -> [{file, from, to}]
for (const f of files) {
  const ls = sigLines(f);
  for (let i = 0; i + K <= ls.length; i++) {
    const win = ls.slice(i, i + K).map((x) => x.t).join('|');
    if (win.length < 140) continue;                    // 纯壳行（短 return/括号雨）不算签名
    if (!winMap.has(win)) winMap.set(win, []);
    winMap.get(win).push({ file: f, from: ls[i].n, to: ls[i + K - 1].n });
  }
}
// 只报跨文件；相邻窗口并入区段
const clones = [];
for (const [win, hits] of winMap) {
  const fs_ = new Set(hits.map((h) => h.file));
  if (fs_.size < 2) continue;
  const byFile = {};
  hits.sort((a, b) => a.file === b.file ? a.from - b.from : (a.file < b.file ? -1 : 1))
    .forEach((h) => {
      const arr = byFile[h.file] || (byFile[h.file] = []);
      const last = arr[arr.length - 1];
      if (last && h.from <= last.to + 2) last.to = Math.max(last.to, h.to);
      else arr.push({ from: h.from, to: h.to });
    });
  clones.push({ lines: win.split('|').length, files: Object.keys(byFile), byFile, text: win.split('|') });
}
clones.sort((a, b) => (b.byFile[Object.keys(b.byFile)[0]].to - b.byFile[Object.keys(b.byFile)[0]].from)
  - (a.byFile[Object.keys(a.byFile)[0]].to - a.byFile[Object.keys(a.byFile)[0]].from));

// ---------- ④ 债务标记（含注释原文——TODO 就住在注释里，故不用 stripComments 后文本） ----------
// 字面匹配、区分大小写、全文计数（次数进 key：+1 笔 / 还 1 笔都换 key 转 NEW，闸看得见）
const DEBT_WORDS = ['TODO', 'FIXME', 'HACK', '未实测'];
const debts = []; // {file, word, n}
for (const f of files) {
  const raw = srcOf(f);
  for (const w of DEBT_WORDS) {
    const n = (raw.match(new RegExp(w, 'g')) || []).length;
    if (n) debts.push({ file: f, word: w, n });
  }
}

// ---------- ⑤ 纯叶失真（leaf 清单机器读自 README——读不到 fail loud，不许静默跳过） ----------
// 口径出处：README 卫生审计判定口径 3「注释即事实源者必须可核」。--src 只换扫描目录，
// 事实源仍在本仓 README（fixture 自检时复用 README 在册叶名即可命中）。
const LEAF_PRIMITIVES = ['document.', 'window.', 'globalThis', 'localStorage',
  'Date.now(', 'Math.random(', 'new Date('];
const README_PATH = path.join(ROOT, 'README.md');
if (!fs.existsSync(README_PATH)) {
  console.error('[check-hygiene] ✗ README.md 读不到——零依赖叶清单失去事实源，纯叶扫描无法进行（fail loud）');
  process.exit(1);
}
const leafClass = fs.readFileSync(README_PATH, 'utf8')
  .match(/^\s*class\s+([^\s;]+)\s+leaf\s*;/m); // 不匹配 classDef（"class" 后须紧跟空白）
if (!leafClass) {
  console.error('[check-hygiene] ✗ README.md 依赖图中找不到 `class … leaf;` 行——纯叶清单失去机器可读事实源，fail loud（不许静默跳过）');
  process.exit(1);
}
const LEAVES = new Set(leafClass[1].split(',').map((s) => s.trim())
  .filter(Boolean).map((n) => n.endsWith('.js') ? n : n + '.js'));
if (!LEAVES.size) {
  console.error('[check-hygiene] ✗ README.md `class … leaf;` 行解析结果为空——事实源疑似损坏，fail loud');
  process.exit(1);
}
const leafHits = []; // {file, prim}
for (const f of files) {
  if (!LEAVES.has(f)) continue;
  const code = stripComments(srcOf(f)); // 剥注释后判定：注释里提到 window. 不算触面
  for (const p of LEAF_PRIMITIVES) if (code.includes(p)) leafHits.push({ file: f, prim: p });
}

// ---------- 基线（棘轮模式） ----------
const BASE_PATH = path.join(ROOT, 'test', 'hygiene-baseline.json');
const baseline = fs.existsSync(BASE_PATH)
  ? JSON.parse(fs.readFileSync(BASE_PATH, 'utf8')) : { entries: [] };
const inBase = (key) => baseline.entries.some((e) => e.key === key);
const unregistered = [];
// key 生成式三份共用（报告/闸/emit 同源，漂移即假绿）：
const dupKey = (lit, s) => 'dup:' + lit + '@' + [...s].sort().join(',');
const idupKey = (d) => 'idup:' + d.file + ':' + d.lit + '@' + d.n;
const cloneKey = (c) => 'clone:' + c.files.slice().sort().join('+') + ':' + c.text[0].slice(0, 42);
const debtKey = (d) => 'debt:' + d.file + ':' + d.word + '@' + d.n;
const leafKey = (h) => 'leaf:' + h.file + ':' + h.prim;

// ---------- 报告 ----------
if (EMIT) { // 迁移辅助：纯 key 清单（不带报告头尾，stdout 即 JSON），基线重排后 why 由人迁
  console.log(JSON.stringify({ entries: dups.map(([lit, s]) => ({ key: dupKey(lit, s) }))
    .concat(idups.map((d) => ({ key: idupKey(d) })))
    .concat(clones.map((c) => ({ key: cloneKey(c) })))
    .concat(debts.map((d) => ({ key: debtKey(d) })))
    .concat(leafHits.map((h) => ({ key: leafKey(h) }))) }, null, 1));
  process.exit(0);
}
console.log('[check-hygiene] ' + (GATE ? '棘轮' : '报告') + '模式 · src ' + files.length + ' 件 · 克隆阈值 ' + K + ' 行');
console.log('—— ① 跨文件重复字面 ' + dups.length + ' 组 ——');
for (const [lit, s] of dups) {
  const key = dupKey(lit, s);
  if (!inBase(key)) unregistered.push(key);
  const tag = inBase(key) ? '登记' : 'NEW ';
  console.log('  [' + tag + '] ' + JSON.stringify(lit.length > 40 ? lit.slice(0, 40) + '…' : lit)
    + '  ×' + s.size + '  ' + [...s].join(','));
}
console.log('—— ③ 同文件内 ≥3 写 ' + idups.length + ' 项 ——');
for (const d of idups) {
  const key = idupKey(d);
  if (!inBase(key)) unregistered.push(key);
  console.log('  [' + (inBase(key) ? '登记' : 'NEW ') + '] ' + d.file + '  ×' + d.n
    + '  ' + JSON.stringify(d.lit.length > 44 ? d.lit.slice(0, 44) + '…' : d.lit));
}
console.log('—— ② 跨文件代码克隆 ' + clones.length + ' 簇 ——');
for (const c of clones) {
  const key = cloneKey(c);
  if (!inBase(key)) unregistered.push(key);
  const tag = inBase(key) ? '登记' : 'NEW ';
  // byFile[file] = 该文件命中的区段数组（合并后）
  const span = Object.entries(c.byFile).map(([f, ranges]) => f + ':' +
    ranges.map((r) => r.from + '-' + r.to).join(',')).join(' | ');
  console.log('  [' + tag + '] ' + c.files.length + ' 份  ' + span);
  console.log('         首行: ' + c.text[0].slice(0, 90));
}
console.log('—— ④ 债务标记 ' + debts.length + ' 项 ——');
for (const d of debts) {
  const key = debtKey(d);
  if (!inBase(key)) unregistered.push(key);
  console.log('  [' + (inBase(key) ? '登记' : 'NEW ') + '] ' + d.file + '  ' + d.word + ' ×' + d.n);
}
console.log('—— ⑤ 纯叶失真 ' + leafHits.length + ' 项（README class…leaf; 清单 × 环境原语） ——');
for (const h of leafHits) {
  const key = leafKey(h);
  if (!inBase(key)) unregistered.push(key);
  console.log('  [' + (inBase(key) ? '登记' : 'NEW ') + '] ' + h.file + '  ' + h.prim);
}
console.log('—— 弱候选（CJK≤4 字短词，同名不同义常态，仅眼过）：'
  + [...weakSet].join(' / ') + ' ——');
console.log('[check-hygiene] 未登记候选 ' + unregistered.length + ' 项'
  + (GATE ? '' : '（报告模式不判红；--gate 转棘轮）'));
if (GATE && unregistered.length) {
  console.log('  ✗ 新增未登记重复——收口为单源，或确为有意并存写入 test/hygiene-baseline.json（带 why）');
  process.exit(1);
}
