/*
 * check-lifecycle2 —— 定时器/观察器「生灭配对」+ catch「静默吞错」分诊（2026-10-30，P2 分诊批备料）
 *
 * 判定口径出处：AGENTS.md「五维自检·健壮」——生灭要可撤（window/document 监听已有 check-listeners
 * 守，本件补上同一生灭面里的定时器与观察器）、失败路径要有降级 + 可观测信号（stat/swallow）；
 * README「病灶×守卫对照表」将来填两行——①「监听器面 / 浮层键盘面」行扩出「定时器/观察器生灭面」
 * （收口出口 = teardown 配对摘净 / `// singleton-obs:` 标记，守卫 = 本件 --gate）；
 * ② 新增「失败可观测面」行（收口出口 = dbg.swallow / stat / throw / `// swallow:` 留因，
 * 守卫 = 本件 --gate；本筛只备料不裁案，候选量大属预期，交 P2 分诊批逐个表态）。
 *
 * ① 生灭配对（逐文件计数）：
 *    - `setInterval(` 计数 vs `clearInterval(` 计数，不等即候选（附两边计数）；
 *    - `new MutationObserver|IntersectionObserver|ResizeObserver` 实例 vs `.disconnect(` 调用
 *      计数，不等即候选——有的代码每次新建即断开，计数相等=放行；一建多断（自清+teardown 各断
 *      一次）按候选交人判，不猜语义。
 *    - 放行标记 `// singleton-obs:<理由>`：生灭行尾或其上一行 = 该实例放行（机制镜像
 *      check-listeners 的 `// singleton-listener:`）；独立成行 = 全文件放行。
 * ② 静默吞错（catch 分诊）：
 *    - 正则定位 catch（`catch {` 无参与 `.catch(function () {` 带参两形态都收；`.catch(() => x())`
 *      表达式形态无块体，跳过），从其后第一个 `{` 花括号配平提取块体；
 *    - 放行判据（块体内任一命中）：`stat(`、`throw`、`swallow(`（dbg.swallow 单源出口——eslint
 *      「空 catch 一律显式表态：注释说明意图，或走 dbg.swallow 计数/留因」口径）、`// swallow:`
 *      标记（写成 `/* swallow:` 块注释形态同收；标记活在注释里，故在原文层查）；否则即候选，
 *      附块体首行摘要（≤80 字符）供人判。
 *
 * 三模式（同 check-hygiene）：
 *   node test/check-lifecycle2.mjs            → 报告模式（永远 exit 0，出候选清单供人判）
 *   node test/check-lifecycle2.mjs --gate     → 棘轮模式：候选须全在 test/lifecycle-baseline.json
 *                                                （登记=有意/待分诊批），新增未登记即红；
 *                                                基线文件缺失按空账处理（全红，不宽容）。
 *   node test/check-lifecycle2.mjs --emit     → stdout 出当前候选 key 清单（JSON），基线重排用。
 *   两模式皆可 `--src <dir>` 换扫描目录（合成病灶自检用，不污染真实 src/）。
 *
 * key 格式（不用行号——行号易漂；原则=登记项扩张即换 key 转 NEW）：
 *   pair:<file>:iv <set>/<clear>、pair:<file>:obs <new>/<disc>——任一边计数一变即 NEW；
 *   补齐配对或加标记则候选消失、基线可删行（只缩不胖）。
 *   swallow:<file>:<块体首行摘要≤80>@<同形次数>——首行改写 / 次数增减即 NEW。
 *
 * 两层文本（偏移对齐，本件的关键设计）：代码层 = 注释与串/模板/正则的**内容**清成空格（定界符
 * 与换行保留），catch 定位、配平、stat/throw/swallow( 计数都在代码层——注释里的 catch、串里的
 * setInterval 不误报，且串内容清空后剩下的花括号全是真结构，纯深度配平即可；原文层保留一切，
 * 只用于查 `// swallow:` / `// singleton-obs:` 标记。两层逐字符同偏移，块体区间直接共享。
 * 近似（房规自觉，同 check-hygiene stripComments 的粗判度）：除法/正则二义按前 token 启发
 * （`/` 后紧跟空格按除法；关键词后视带词边界）；未闭合串弃到行尾；配平失败的 catch 宁漏不误
 * （计数上墙观测）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = process.argv.includes('--gate');
const EMIT = process.argv.includes('--emit');
const srcArg = process.argv.indexOf('--src');
const SRCDIR = srcArg > 0 ? path.resolve(process.argv[srcArg + 1]) : path.join(ROOT, 'src');
const BASE_PATH = path.join(ROOT, 'test', 'lifecycle-baseline.json');

if (!fs.existsSync(SRCDIR)) {
  console.error('[check-lifecycle2] 扫描目录不存在：' + SRCDIR);
  process.exit(1);
}
const files = fs.readdirSync(SRCDIR).filter((f) => f.endsWith('.js')).sort();
const srcOf = (f) => fs.readFileSync(path.join(SRCDIR, f), 'utf8').replace(/\r/g, '');

// ---------- 两层文本：代码层（注释与串内容清空，偏移不变） ----------
// 栈元素：'p' = 模板文本态；数字 = 该层模板插值内剩余花括号深度（插值内是代码，按代码处理）
function codeLayerOf(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const tpl = [];
  const put = (ch) => { out += ch === '\n' ? '\n' : ' '; };
  const blankStr = (q) => { // 引号串：定界保留、内容清空（含逃逸）；断行串弃到行尾防雪崩
    out += q; i++;
    while (i < n && src[i] !== q && src[i] !== '\n') {
      if (src[i] === '\\') { put(src[i]); if (i + 1 < n) put(src[i + 1]); i += 2; continue; }
      put(src[i]); i++;
    }
    if (src[i] === q) { out += q; i++; }
  };
  const blankBlock = () => { // /*…*/：内容清空，换行保留（行号不漂）
    i += 2;
    while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { put(src[i]); i++; }
    out += '  '; i += 2;
  };
  const lineCmt = () => { while (i < n && src[i] !== '\n') i++; };
  // 正则上下文启发：前一个非空白字符，或「词边界 + 关键词」结尾（margin / 2 不误判）
  const isRegexCtx = () => {
    let j = out.length - 1;
    while (j >= 0 && /\s/.test(out[j])) j--;
    if (j < 0) return true;
    if ('(,=:[!&|?{};+-*%<>~^:'.includes(out[j])) return true;
    const head = out.slice(Math.max(0, j - 11), j + 1);
    return /(?:^|[^\w$])(?:return|typeof|instanceof|delete|yield|await|void|new|case|in|of|do|else)$/.test(head);
  };
  const blankRe = () => { // 正则字面：内容连同标志位清空（字符类与逃逸知悉）；未闭合按除法放行
    let j = i + 1;
    let inCls = false;
    let ok = false;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '\n') break;
      if (inCls) { if (c === ']') inCls = false; } else if (c === '[') inCls = true;
      else if (c === '/') { ok = true; break; }
      j++;
    }
    if (!ok) { out += '/'; i++; return; }
    while (i <= j) { put(src[i]); i++; }
    while (i < n && /[a-z]/i.test(src[i])) { put(src[i]); i++; } // gimsuy 标志位
  };
  while (i < n) {
    const c = src[i];
    const st = tpl[tpl.length - 1];
    if (st === 'p') { // 模板文本：找 ` 收口或 ${ 插值
      if (c === '\\') { put(c); if (i + 1 < n) put(src[i + 1]); i += 2; continue; }
      if (c === '`') { out += '`'; tpl.pop(); i++; continue; }
      if (c === '$' && src[i + 1] === '{') { out += '  '; tpl.push(1); i += 2; continue; }
      put(c); i++; continue;
    }
    if (typeof st === 'number') { // 模板插值内（代码态）
      if (c === '\'' || c === '"') { blankStr(c); continue; }
      if (c === '`') { out += '`'; tpl.push('p'); i++; continue; }
      if (c === '/' && src[i + 1] === '/') { lineCmt(); continue; }
      if (c === '/' && src[i + 1] === '*') { blankBlock(); continue; }
      if (c === '/' && isRegexCtx()) { blankRe(); continue; }
      if (c === '{') { tpl[tpl.length - 1]++; out += c; i++; continue; }
      if (c === '}') {
        if (st === 1) { out += '  '; tpl.pop(); i++; continue; } // 插值收口回模板文本
        tpl[tpl.length - 1]--; out += c; i++; continue;
      }
      out += c; i++; continue;
    }
    // 顶层代码态
    if (c === '/' && src[i + 1] === '/') { lineCmt(); continue; }
    if (c === '/' && src[i + 1] === '*') { blankBlock(); continue; }
    if (c === '\'' || c === '"') { blankStr(c); continue; }
    if (c === '`') { out += '`'; tpl.push('p'); i++; continue; }
    if (c === '/' && src[i + 1] !== ' ' && isRegexCtx()) { blankRe(); continue; }
    out += c; i++;
  }
  return out;
}

// ---------- catch 块体提取（都在代码层：串内容已清空，配平无需避串） ----------
function findBodyOpen(code, from) { // catch 之后第一个 `{`；先撞到收括号（表达式形态）或分号则无块体
  let pd = 0;
  for (let i = from; i < code.length; i++) {
    const c = code[i];
    if (c === '{') return i;
    if (c === '(') pd++;
    else if (c === ')') { if (pd === 0) return -1; pd--; }
    else if (c === ';' && pd === 0) return -1;
  }
  return -1;
}
function matchBrace(code, open) {
  let d = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') d++;
    else if (code[i] === '}') { d--; if (d === 0) return i; }
  }
  return -1;
}

// ---------- 判据与标记（原文层查标记，代码层查代码形态） ----------
// 标记两种注释形态都收：`// swallow:` 与单行 catch 里自然写成的 `/* swallow: … */`
const RE_SWALLOW_MARK = /\/[/*]\s*swallow\s*:/;
const RE_OBS_MARK = /\/\/\s*singleton-obs\s*:/;
const RE_OBS_MARK_LINE = /^\s*\/\/\s*singleton-obs\s*:/; // 独立成行 = 文件级放行
const RE_SET_IV = /\bsetInterval\s*\(/;
const RE_CLEAR_IV = /\bclearInterval\s*\(/;
const RE_NEW_OBS = /\bnew\s+(?:MutationObserver|IntersectionObserver|ResizeObserver)\s*\(/;
const RE_DISCONNECT = /\.\s*disconnect\s*\(/;
const firstLine = (body) => { // 块体首行摘要（≤80）：key 的稳定形态，空白归一
  for (const l of body.split('\n')) {
    const t = l.replace(/\s+/g, ' ').trim();
    if (t) return t.length > 80 ? t.slice(0, 80) : t;
  }
  return '(空块体)';
};

// ---------- 扫描 ----------
const pairs = []; // { file, what:'iv'|'obs', n, m, marked }
const swallowGroups = new Map(); // file+NUL+sum -> { file, sum, n }
let catchTotal = 0;
let catchUnbalanced = 0;
for (const f of files) {
  const orig = srcOf(f);
  const layer = codeLayerOf(orig);
  const origLines = orig.split('\n');
  const codeLines = layer.split('\n'); // 换行逐字符保留 → 与 origLines 一一对应
  const fileWide = origLines.some((l) => RE_OBS_MARK_LINE.test(l));

  // ① 生灭配对（逐文件计数；标记放行的生实例不要求配对）
  let iv = 0, clear = 0, obs = 0, disc = 0, ivMarked = 0, obsMarked = 0;
  for (let li = 0; li < codeLines.length; li++) {
    const marked = fileWide
      || RE_OBS_MARK.test(origLines[li])
      || (li > 0 && RE_OBS_MARK.test(origLines[li - 1]));
    const cl = codeLines[li];
    if (RE_SET_IV.test(cl)) { iv++; if (marked) ivMarked++; }
    if (RE_CLEAR_IV.test(cl)) clear++;
    if (RE_NEW_OBS.test(cl)) { obs++; if (marked) obsMarked++; }
    if (RE_DISCONNECT.test(cl)) disc++;
  }
  if (iv - ivMarked !== clear) pairs.push({ file: f, what: 'iv', n: iv, m: clear, marked: ivMarked });
  if (obs - obsMarked !== disc) pairs.push({ file: f, what: 'obs', n: obs, m: disc, marked: obsMarked });

  // ② 静默吞错（catch 分诊；放行判据在两层各查其位）
  const re = /\bcatch\b/g;
  let m;
  while ((m = re.exec(layer))) {
    const open = findBodyOpen(layer, m.index + m[0].length);
    if (open < 0) continue;
    const close = matchBrace(layer, open);
    if (close < 0) { catchUnbalanced++; continue; } // 宁漏不误，弃置上墙
    catchTotal++;
    const blankBody = layer.slice(open + 1, close);
    if (/\bstat\s*\(/.test(blankBody) || /\bthrow\b/.test(blankBody)
      || /\bswallow\s*\(/.test(blankBody)) continue;
    if (RE_SWALLOW_MARK.test(orig.slice(open + 1, close))) continue; // 标记活在注释→原文层查
    const sum = firstLine(blankBody);
    const gk = f + '\u0000' + sum;
    const g = swallowGroups.get(gk);
    if (g) g.n++;
    else swallowGroups.set(gk, { file: f, sum, n: 1 });
  }
}

// ---------- key 生成式三处共用（报告/闸/emit 同源，漂移即假绿） ----------
const pairKey = (p) => 'pair:' + p.file + ':' + p.what + ' ' + p.n + '/' + p.m;
const swallowKey = (g) => 'swallow:' + g.file + ':' + g.sum + '@' + g.n;

// ---------- 基线（棘轮模式） ----------
const hasBase = fs.existsSync(BASE_PATH);
const baseline = hasBase ? JSON.parse(fs.readFileSync(BASE_PATH, 'utf8')) : { entries: [] };
const inBase = (key) => baseline.entries.some((e) => e.key === key);

const groups = [...swallowGroups.values()].sort((a, b) => b.n - a.n || (a.file < b.file ? -1 : 1));
const swallowItems = groups.reduce((s, g) => s + g.n, 0);

if (EMIT) { // 迁移辅助：纯 key 清单（stdout 即 JSON），基线重排后 why 由人迁
  console.log(JSON.stringify({ entries: pairs.map((p) => ({ key: pairKey(p) }))
    .concat(groups.map((g) => ({ key: swallowKey(g) }))) }, null, 1));
  process.exit(0);
}

// ---------- 报告 ----------
let unregistered = 0;
console.log('[check-lifecycle2] ' + (GATE ? '棘轮' : '报告') + '模式 · src ' + SRCDIR
  + ' · ' + files.length + ' 件 · catch 块体 ' + catchTotal + ' 处（配平失败弃置 ' + catchUnbalanced + '）');
if (GATE && !hasBase) {
  console.log('  ！test/lifecycle-baseline.json 缺失——按空账处理（不宽容），全部候选即未登记');
}
console.log('—— ① 生灭配对候选 ' + pairs.length + ' 项 ——');
for (const p of pairs) {
  const reg = inBase(pairKey(p));
  if (!reg) unregistered++;
  console.log('  [' + (reg ? '登记' : 'NEW ') + '] ' + p.file + '  '
    + (p.what === 'iv'
      ? 'setInterval ' + p.n + ' / clearInterval ' + p.m
      : 'new Observer ' + p.n + ' / disconnect ' + p.m)
    + (p.marked ? '（singleton-obs 已放行 ' + p.marked + '）' : ''));
}
console.log('—— ② 静默吞错候选 ' + groups.length + ' 组 / ' + swallowItems + ' 处 ——');
for (const g of groups) {
  const reg = inBase(swallowKey(g));
  if (!reg) unregistered++;
  console.log('  [' + (reg ? '登记' : 'NEW ') + '] ' + g.file + '  ×' + g.n + '  '
    + (g.sum.length > 60 ? g.sum.slice(0, 60) + '…' : g.sum));
}
if (groups.length) { // 按文件分诊视图：分诊批从最重的文件下手
  const byFile = new Map();
  for (const g of groups) byFile.set(g.file, (byFile.get(g.file) || 0) + g.n);
  const top = [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([f, cnt]) => f + '×' + cnt).join('  ');
  console.log('   按文件 top: ' + top + (byFile.size > 8 ? ' …共 ' + byFile.size + ' 件' : ''));
}
console.log('[check-lifecycle2] 未登记候选 ' + unregistered + ' 项'
  + (GATE ? '' : '（报告模式不判红；--gate 转棘轮）'));
if (GATE && unregistered) {
  console.log('  ✗ 新增未登记候选——补齐配对/加 `// singleton-obs:` 标记/给 catch 留观测'
    + '（stat/throw/swallow(`// swallow:`），或确属有意写入 test/lifecycle-baseline.json（带 why）');
  process.exit(1);
}
