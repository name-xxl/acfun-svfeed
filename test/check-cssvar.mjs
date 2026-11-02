/*
 * CSS 变量「定义 ↔ 使用」失配闸（0.9.317，规矩 7 的结构收口）——**每个使用点必须在定义处有定义**。
 *
 * 病灶：CSS 变量名写错是**静默失效**——`var(--acsv-accentt)` 不报错、不抛异常，只是那条声明
 * 退回初始值（`background:var(--无此名)` ⇒ 透明）。本仓的变量此前有「单源」主张（值旁的注释里
 * 自陈「由某某独用、别再写第二份字面」），但**零机械守卫**：拼错一处、或把定义删/改名而使用点
 * 留着，都要等有人肉眼看见渲染不对才发现。同型事故在别的域
 * 已见过（`test/check-preview.mjs` 就是「稿有实现无」那两起静默出入的收口），变量这一层当时没网。
 *
 * 判据（最窄、最不易假绿）：
 *   ① **使用点 ← 定义**：src/*.js 里每个 `var(--acsv-…)` 的变量名，必须在同一批 src 文件里存在
 *      **定义**——CSS 声明 `--acsv-…:` **或** JS 侧 `setProperty('--acsv-…'`（`--acsv-dw` /
 *      `--acsv-cscale` 就是 comments.js 运行时写入的那一类，只有后者）。缺定义 ⇒ 退出码 1。
 *   ② **定义 ← 使用点**（只报告、不判红）：零消费变量打印 `⚠ 零消费`——删定义是净减法、留着是
 *      零消费 token，取舍交人（本仓 `--acsv-accent-dim` 撤红框后即入此列，见 CHANGELOG 0.9.318）。
 *
 * 作用域与边界：只认 `--acsv-` 前缀（`--acsvg-cicon` / `--i` 等影子根/外来私有变量不在射程——
 * 前缀不同即不同命名空间）；`var(--acsv-dw,412px)` 的**兜底值**不影响判定（有定义即有）；
 * 跨文件共享是设计（定义在 styles.js、使用在别处是常态），故定义集合取**全 src 并集**。
 * 扫描前剥**整行注释**（行首 `//` `*` `/*`，同 check-hygiene/check-structure 体例）：注释里的
 * `var(--acsv-…)` 只是提及、不是使用点（cssraw 撤框那条注释即此形）。行尾注释带提及的仍计入——
 * 那本来就是代码行，宁可多算一处使用，也不静默漏一处。
 *
 * 反跑证明：把 styles.js 里的 `--acsv-accent:` 改成 `--acsv-accentx:`（定义改名）⇒ 全部使用点
 * 失配、转红；还原 ⇒ 转绿。只改一处使用点的名字（`var(--acsv-accent-dimmm)`）⇒ 同样转红。
 *
 *   node test/check-cssvar.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DEF_RE = /(--acsv-[a-z0-9-]+)\s*:|setProperty\(\s*'(--acsv-[a-z0-9-]+)'/g;
const USE_RE = /var\(\s*(--acsv-[a-z0-9-]+)/g;
const codeOnly = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

const defs = new Map(); // 变量名 -> Set(文件)
const uses = new Map();
for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith('.js')).sort()) {
  const txt = codeOnly(fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r/g, ''));
  for (const m of txt.matchAll(DEF_RE)) {
    const n = m[1] || m[2];
    if (!defs.has(n)) defs.set(n, new Set());
    defs.get(n).add(f);
  }
  for (const m of txt.matchAll(USE_RE)) {
    const n = m[1];
    if (!uses.has(n)) uses.set(n, new Set());
    uses.get(n).add(f);
  }
}

const bad = [];
const rows = [];
for (const [n, files] of [...uses].sort()) {
  const ok = defs.has(n);
  rows.push('  ' + n + '  ' + (ok ? '定义@' + [...defs.get(n)].sort().join(',') : '✗ 无定义')
    + '  使用@' + [...files].sort().join(','));
  if (!ok) {
    bad.push(n + '：' + [...files].sort().join(',') + ' 使用了它，但全 src 找不到定义处'
      + '（变量名写错是静默失效——那条声明退回初始值，渲染上看不出是谁的锅）');
  }
}
const zero = [...defs].filter(([n]) => !uses.has(n)).map(([n]) => n + '@' + [...defs.get(n)].join(','));

console.log('[check-cssvar] CSS 变量定义↔使用闸——' + defs.size + ' 个定义 / ' + uses.size + ' 个使用名');
for (const r of rows) console.log(r);
if (zero.length) console.log('  ⚠ 零消费变量（只报告不判红——删/留交人）：' + zero.join(' | '));
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-cssvar] 未通过：' + bad.length + ' 处使用点无定义'
    + '（写错名/漏定义/改名只改一侧——两侧必须同批改，或走 import 单源而不裸写字面）');
  process.exit(1);
}
console.log('[check-cssvar] OK');