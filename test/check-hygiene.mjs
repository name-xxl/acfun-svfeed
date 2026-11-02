/*
 * 通用重复扫描器（2026-10-30，用户追问「能否机械判定」；0.9.308 补第三扫；同日扩面补④⑤两扫；
 * 0.9.320 补第六扫）——把卫生审计的判定口径变成不依赖预先知道答案的网：定向棘轮
 * （check-dialect/liststate/zlayers）只守「已知事实」，本件负责**发现未知**。六扫：
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
 *   ⑥ 跨文件重复 <svg> 标记串（0.9.320）：在**⑥ 自持的注释层**（stripSvgComments，不是
 *      stripComments——那一版的行尾判据在含 `"` 的 svg 上失配，见 ⑥ 段）后文本用
 *      /<svg[\s\S]*?<\/svg>/g 抽运行串，**长度 ≥40 字节（UTF-8，Buffer.byteLength 口径）**且
 *      出现在 **≥2 个 src 文件**即病灶；kind=svg；key=svg:运行串@文件,文件（全串进 key、不截断）。
 *      依据=README 卫生审计判定口径 1「字面≥2处即病灶」，只是把比对粒度从**整条字面量**下沉到
 *      **SVG 标记串**这一层——专治「图标抄一份进另一个更大的模板串」这类 ①③ 都够不着的缝
 *      （实证：topbar 手抄 styles.js 的 ICONS.comment 整段 <svg>，尾部多拼 badge span ⇒ 与
 *      styles.js 那条不是同一整串，① 看不见；又跨文件 ⇒ ③ 也看不见 ⇒ 130B 同形副本整条漏网）。
 *      同**一文件内**把图标抄 ≥3 遍归 ③（0.9.320 起 ③ 的胶水/骨架排除对 `<svg` 字面开例外）；
 *      本扫已知够不着的四种形态（自闭合 / 开闭标签分居两串 / base64 通道 / 逐字漂移）列在 ⑥ 段末。
 * 三种模式（另有可选 --src <dir> 覆盖扫描目录，缺省 src/ 不变，向后兼容，供 fixture 自检）：
 *   node test/check-hygiene.mjs            → 报告模式（永远 exit 0，出候选清单供人判）
 *   node test/check-hygiene.mjs --gate     → 棘轮模式：候选须全在 test/hygiene-baseline.json
 *                                            （登记=有意并存/待收口批），新增未登记即红。
 *   node test/check-hygiene.mjs --emit     → 迁移辅助：stdout 出当前候选的 key 清单（JSON，
 *                                            无 why）——key 格式升级/收口后重排基线用。
 * 基线条目：{ "kind":"dup|idup|clone|debt|leaf|svg", "key":..., "why":... }——收口一处删一行，
 * 基线只能缩不能胖。key 携带**文件集/次数**（0.9.309）：dup:字面@文件,文件 / idup:文件:字面@次数 /
 * clone:文件+文件:首窗首行 / svg:运行串@文件,文件——登记项扩张（×2→×3、换宿主、同件加写）即换
 * key 转 NEW，「登记时写下的触发条件」（如「扩到 3 处再抽 helper」）从此由闸看见，不再靠眼过。
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
// （", label: " "</a>" "<i …>" 这类拼装尾/HTML 骨架——收常量价值低、噪声高，如实放弃这条边；
//  但 `<svg …>` 图标字面除外，0.9.320，见下）；CJK ≤2 字。合格判据同判定口径 1：本件内第 3 次
// 写同一串，就该有常数。
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
    // 例外（0.9.320）：`<svg` 字面不排——首字符 `<` 属 `\W` 会把**全部**图标字面量丢掉，于是同一
    // 文件里把图标抄 5 遍本扫看不见、⑥ 又只跨 ≥2 文件 ⇒ 六扫全瞎。图标同件 ≥3 写正是「该有常数」。
    if (!HAS_CJK.test(lit) && /^\W|\W$/.test(lit) && !/^<svg/.test(lit)) continue;
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

// ---------- ⑥ 跨文件重复 <svg> 标记串（①③ 都够不着的「图标抄进更大模板串」缝） ----------
// 事实源：README 卫生审计判定口径 1「字面≥2处即病灶」。与 ① 的区别只在**比对粒度**——① 比
// 整条字面量，本扫比字面量内部的 SVG 标记串，故「抄整段 <svg> 再尾部另拼」的副本也进网（实证：
// 本批 topbar 手抄 styles.js 的 ICONS.comment 整段 <svg>，尾部多拼 badge span ⇒ 130B 副本 ①③ 双盲）。
// 「同一文件内抄 ≥3 遍」不归本扫（本扫只跨 ≥2 文件），归 ③——0.9.320 起 ③ 的胶水/骨架排除对
// `<svg` 字面开了例外，两条网的边界这才接得上（否则图标字面量因首字符 `<` 属 \W 被 ③ 全数丢掉）。

// —— ⑥ 自持注释层：为什么不能复用 stripComments ——
// 那一版的行尾判据是 /\s+\/\/[^'"\n]*$/：注释体内一律不容引号（拿「有没有引号」粗判这行是不是
// 字符串）。而 SVG 标记串必含 `"`（viewBox="0 0 24 24"），于是
//   var E = 1; // 参考 <svg viewBox="0 0 24 24">…</svg>
// 整条正则失配 ⇒ 注释原样留在文本里 ⇒ 两个文件各写这样一行就被本扫报成 1 组副本（复核实测假阳）。
// 只补「整行注释」那一半也救不了：同一行里「代码 + 注释」两种 svg 仍得分清。故本扫自带一层，
// 逐字符走引号状态：引号外的 // 吃到行尾、引号外的 /* */ 整段丢弃、引号内的 // 是数据不是注释。
// 保守取向——宁可漏剥，不可把代码当注释吃掉（漏剥最多多一组噪声；错剥让整条图标静默失踪，
// 而本扫的存在意义恰恰是别静默）：// 的前一字符是 \（正则里的 \/）或 :（http://）时不判注释。
// 跨行状态：/* */ 由 block 接住；模板字面量未闭合（tick）时引号状态延续到下一行。
// stripComments 本体不动——①②③⑤ 共用它，动一行就是既有棘轮账整页翻。
// 附注（本批不改 ①，如实记着）：同一处失配对 ① 也漏——行尾注释没剥掉，① 就会把注释里 svg 的
// path `d` 值当「≥12 字符协议串」提出（fixture 实测：两文件各一行 `// 参考 <svg…>` ⇒ ⑥ 0 组、
// ① 仍 1 组）。要修得动 stripComments 本体，留后批裁决。
const stripSvgComments = (s) => {
  const out = [];
  let block = false; // 跨行 /* … */ 未闭合
  let tick = false;  // 跨行模板字面量未闭合（串内的 // 是数据）
  for (let line of s.split('\n')) {
    if (block) { // 续行：吃到 */，之后的内容才归代码
      const e0 = line.indexOf('*/');
      if (e0 < 0) { out.push(''); continue; }
      line = line.slice(e0 + 2);
      block = false;
    }
    let res = '';
    let q = tick ? '`' : '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '\\') { res += c + (line[i + 1] === undefined ? '' : line[i + 1]); i++; continue; }
        if (c === q) q = '';
        res += c;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { q = c; res += c; continue; }
      if (c === '/' && line[i + 1] === '/') {
        const p = line[i - 1];
        if (p === '\\' || p === ':') { res += '//'; i++; continue; } // 正则 \/ 或 http:// ⇒ 保守不判
        break;                                                       // 引号外的行尾注释：吃到行尾
      }
      if (c === '/' && line[i + 1] === '*') {
        const e1 = line.indexOf('*/', i + 2);
        if (e1 < 0) { block = true; break; } // 跨行块注释：本行余下全丢
        i = e1 + 1;
        continue;
      }
      res += c;
    }
    tick = q === '`';
    out.push(res);
  }
  return out.join('\n');
};

// —— 阈值：SVG_MIN＝40，单位**字节**（UTF-8）。判定走 svgBytes()（Buffer.byteLength），不是
// run.length——后者是 UTF-16 码元，含 CJK 的 svg 会被算短（fixture 实测：63 码元 / 101 字节的
// CJK 图标在码元口径下判「不足 64」放行、字节口径下入网；复核那条 63 码元 / 137 字节同形），
// 而头注当时宣称的正是「字节」。40 的实测依据（本批全仓 26 条 distinct 运行串，最短 56B）：
// <64B 只有 1 条＝styles.js 的 play 图标 56B，其余 25 条 ≥69B；
// 该条在 ≥0/32/40/48/56/64/80 各档跨文件重复组均为 0 ⇒ 64B 的唯一实际作用就是把这条 56B 图标
// 留在「抄了没人管」的状态。降到 40 把它纳入网内，噪声不变（真仓实测仍 0 组）。低于阈值不记账
// 的动机照旧：单 path 简形短图标（箭头/叉号一类）同名不同义是常态。
const SVG_MIN = 40;
const svgBytes = (run) => Buffer.byteLength(run, 'utf8'); // 单位口径唯一出口：判定与报告同源
const svgMap = new Map(); // 运行串 -> Set<file>
for (const f of files) {
  const code = stripSvgComments(srcOf(f));
  let m;
  const re6 = /<svg[\s\S]*?<\/svg>/g;
  while ((m = re6.exec(code))) {
    const run = m[0];
    if (svgBytes(run) < SVG_MIN) continue;
    if (!svgMap.has(run)) svgMap.set(run, new Set());
    svgMap.get(run).add(f);
  }
}
// 跨 ≥2 文件即候选；文件集大者优先，同集大小串长者在前
const svgs = [...svgMap].filter(([, s]) => s.size >= 2)
  .sort((a, b) => b[1].size - a[1].size || svgBytes(b[0]) - svgBytes(a[0]));
// 已知够不着的形态（如实登记，各一行；要补网须先有新证据，不写猜测性实现）：
//  · 自闭合 <svg …/>：本正则要求 </svg> 在场——当前 src 实测 0 条（26 个 <svg 与 26 个 </svg> 成对）；
//  · 开闭标签分居两个字符串字面量：抽不出真串，且 [\s\S]*? 不看引号 ⇒ 会截出跨语句的伪运行串；
//  · data:image/svg+xml;base64, 通道：编码形态看不见（当前实测 4 条 distinct，全在 styles.js，零跨文件重复）；
//  · 格式化/属性换序漂移：逐字比对看不见（同形不同序就是另一条串）。

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
const svgKey = (r, s) => 'svg:' + r + '@' + [...s].sort().join(',');

// ---------- 报告 ----------
if (EMIT) { // 迁移辅助：纯 key 清单（不带报告头尾，stdout 即 JSON），基线重排后 why 由人迁
  console.log(JSON.stringify({ entries: dups.map(([lit, s]) => ({ key: dupKey(lit, s) }))
    .concat(idups.map((d) => ({ key: idupKey(d) })))
    .concat(clones.map((c) => ({ key: cloneKey(c) })))
    .concat(debts.map((d) => ({ key: debtKey(d) })))
    .concat(leafHits.map((h) => ({ key: leafKey(h) })))
    .concat(svgs.map(([r, s]) => ({ key: svgKey(r, s) }))) }, null, 1));
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
console.log('—— ⑥ 跨文件重复 <svg> 标记串 ' + svgs.length + ' 组（≥' + SVG_MIN + 'B 运行串 × ≥2 件） ——');
for (const [run, s] of svgs) {
  const key = svgKey(run, s);
  if (!inBase(key)) unregistered.push(key);
  console.log('  [' + (inBase(key) ? '登记' : 'NEW ') + '] ' + svgBytes(run) + 'B ×' + s.size + '  '
    + JSON.stringify(run.length > 40 ? run.slice(0, 40) + '…' : run) + '  ' + [...s].join(','));
}
console.log('—— 弱候选（CJK≤4 字短词，同名不同义常态，仅眼过）：'
  + [...weakSet].join(' / ') + ' ——');
console.log('[check-hygiene] 未登记候选 ' + unregistered.length + ' 项'
  + (GATE ? '' : '（报告模式不判红；--gate 转棘轮）'));
if (GATE && unregistered.length) {
  console.log('  ✗ 新增未登记重复——收口为单源，或确为有意并存写入 test/hygiene-baseline.json（带 why）');
  process.exit(1);
}
