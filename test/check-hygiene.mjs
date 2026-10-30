/*
 * 通用重复扫描器（2026-10-30，用户追问「能否机械判定」；0.9.308 补第三扫）——把卫生审计
 * 的判定口径变成不依赖预先知道答案的网：定向棘轮（check-dialect/liststate/zlayers）只守
 * 「已知事实」，本件负责**发现未知**。三扫：
 *   ① 字符串字面跨文件重复：CJK 用户文案 / ≥12 字符协议·URL·键串（排除 web 惯用词表），
 *      同一字面出现 ≥2 文件即候选（README 判定口径 1：字面≥2处即病灶，一致只是漂移前态）。
 *   ② 代码克隆：注释剥离 + 空白归一后，≥K 连续有效行的同形窗口跨文件出现即候选；
 *   ③ 同文件 ≥3 写（0.9.308）：文案串/长协议串在本件内第 3 次出现即候选（跨文件网看不见
 *      的角落；数字面实测同名不同义淹信号，有意不扫，见 CHANGELOG 0.9.308 盲区测量）。
 * 两种模式：
 *   node test/check-hygiene.mjs            → 报告模式（永远 exit 0，出候选清单供人判）
 *   node test/check-hygiene.mjs --gate     → 棘轮模式：候选须全在 test/hygiene-baseline.json
 *                                            （登记=有意并存/待收口批），新增未登记即红。
 * 基线条目：{ "kind":"dup|clone", "key":..., "why":... }——收口一处删一行，基线只能缩不能胖。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const GATE = process.argv.includes('--gate');
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
  'boolean', 'string', 'number', 'object', 'function', 'undefined', 'null']);
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

// ---------- 基线（棘轮模式） ----------
const BASE_PATH = path.join(ROOT, 'test', 'hygiene-baseline.json');
const baseline = fs.existsSync(BASE_PATH)
  ? JSON.parse(fs.readFileSync(BASE_PATH, 'utf8')) : { entries: [] };
const inBase = (key) => baseline.entries.some((e) => e.key === key);
const unregistered = [];

// ---------- 报告 ----------
console.log('[check-hygiene] ' + (GATE ? '棘轮' : '报告') + '模式 · src ' + files.length + ' 件 · 克隆阈值 ' + K + ' 行');
console.log('—— ① 跨文件重复字面 ' + dups.length + ' 组 ——');
for (const [lit, s] of dups) {
  const key = 'dup:' + lit;
  if (!inBase(key)) unregistered.push(key);
  const tag = inBase(key) ? '登记' : 'NEW ';
  console.log('  [' + tag + '] ' + JSON.stringify(lit.length > 40 ? lit.slice(0, 40) + '…' : lit)
    + '  ×' + s.size + '  ' + [...s].join(','));
}
console.log('—— ③ 同文件内 ≥3 写 ' + idups.length + ' 项 ——');
for (const d of idups) {
  const key = 'idup:' + d.file + ':' + d.lit;
  if (!inBase(key)) unregistered.push(key);
  console.log('  [' + (inBase(key) ? '登记' : 'NEW ') + '] ' + d.file + '  ×' + d.n
    + '  ' + JSON.stringify(d.lit.length > 44 ? d.lit.slice(0, 44) + '…' : d.lit));
}
console.log('—— ② 跨文件代码克隆 ' + clones.length + ' 簇 ——');
for (const c of clones) {
  const key = 'clone:' + c.files.slice().sort().join('+') + ':' + c.text[0].slice(0, 42);
  if (!inBase(key)) unregistered.push(key);
  const tag = inBase(key) ? '登记' : 'NEW ';
  // byFile[file] = 该文件命中的区段数组（合并后）
  const span = Object.entries(c.byFile).map(([f, ranges]) => f + ':' +
    ranges.map((r) => r.from + '-' + r.to).join(',')).join(' | ');
  console.log('  [' + tag + '] ' + c.files.length + ' 份  ' + span);
  console.log('         首行: ' + c.text[0].slice(0, 90));
}
console.log('—— 弱候选（CJK≤4 字短词，同名不同义常态，仅眼过）：'
  + [...weakSet].join(' / ') + ' ——');
console.log('[check-hygiene] 未登记候选 ' + unregistered.length + ' 项'
  + (GATE ? '' : '（报告模式不判红；--gate 转棘轮）'));
if (GATE && unregistered.length) {
  console.log('  ✗ 新增未登记重复——收口为单源，或确为有意并存写入 test/hygiene-baseline.json（带 why）');
  process.exit(1);
}
