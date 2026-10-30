/*
 * 场景登记一致性校验（0.9.81）：test/cases/*.js 注册的场景名 ↔ run-harness.mjs 的 HARNESS_CASES
 * 双向对齐。背景：CASE 名 / ONLY 参数拼错过去会静默「零场景 / 零断言通过」（本批实锤：
 * node test/run-harness.mjs views-check → 0 场景 0 失败，白跑），静态校验把它变成显式失败。
 * 页面侧还有第二道闸：harness 分发器对未知 CASE 记 case-known=false（断言级失败）。
 *
 *   node test/check-cases.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 独立页场景：不在 cases/ 注册（各自 html）；从 runner 名单里剔除后再比
const NON_CASE_PAGES = ['dm-smoke', 'im-open'];

const registered = new Set();
const casesDir = path.join(ROOT, 'test', 'cases');
for (const f of fs.readdirSync(casesDir)) {
  const txt = fs.readFileSync(path.join(casesDir, f), 'utf8');
  for (const m of txt.matchAll(/C\['([\w-]+)'\]\s*=/g)) registered.add(m[1]);
}
// 先剥行注释再扫：HEADLESS_SKIP 里的示例条目（注释形态）不算登记。
// \r 必须先清：git autocrlf 往返会把工作区转成 CRLF，行尾残留的 \r 让 `\/\/.*$`
// 剥不掉整行注释（`.` 不匹配 \r、$ 又非多行模式）→ 注释里的示例条目被当成登记
// （0.9.86 stash 往返实锤）
const runnerTxt = fs.readFileSync(path.join(ROOT, 'test', 'run-harness.mjs'), 'utf8')
  .replace(/\r/g, '')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
const listed = new Set();
for (const m of runnerTxt.matchAll(/name:\s*'([\w-]+)'/g)) listed.add(m[1]);
for (const n of NON_CASE_PAGES) listed.delete(n);

const missingInRunner = [...registered].filter((n) => !listed.has(n)).sort();
const missingInCases = [...listed].filter((n) => !registered.has(n)).sort();

console.log('[check-cases] cases/ 注册 ' + registered.size + ' 个，runner 名单 ' + listed.size + ' 个');
if (missingInRunner.length) {
  console.log('  ✗ 已注册但 runner 未登记（ONLY 之外永远不跑）：' + missingInRunner.join(', '));
}
if (missingInCases.length) {
  console.log('  ✗ runner 已登记但无场景实现（页面会以 case-known=false 失败）：' + missingInCases.join(', '));
}
if (missingInRunner.length || missingInCases.length) process.exit(1);

// ---- 0.9.299：bundle 声明 / skip-as-pass / 测试类名存在性 ----
const bad = [];
const runnerRaw = fs.readFileSync(path.join(ROOT, 'test', 'run-harness.mjs'), 'utf8').replace(/\r/g, '');
const arrStart = runnerRaw.indexOf('const HARNESS_CASES = [');
const arrEnd = runnerRaw.indexOf('\n];', arrStart);
const caseLines = runnerRaw.slice(arrStart, arrEnd).split('\n')
  .filter((l) => /^\s*\{\s*name:/.test(l));
let releaseN = 0;
for (const l of caseLines) {
  const name = (l.match(/name:\s*'([\w-]+)'/) || [])[1];
  const m = l.match(/bundle:\s*'([\w-]+)'/);
  if (!m) bad.push('场景 ' + name + ' 未声明 bundle（release/debug 必须显式）');
  else if (m[1] === 'release') releaseN++;
  else if (m[1] !== 'debug') bad.push('场景 ' + name + ' bundle=' + m[1] + '（只许 release/debug）');
}
if (releaseN < 7) bad.push('release 场景仅 ' + releaseN + ' 个（下限 7：用户安装的是正式产物）');

// skip 必须走显式 skip，不许 rec(..., true, 'skip:...') 冒充通过
for (const f of fs.readdirSync(path.join(ROOT, 'test', 'cases'))) {
  const txt = fs.readFileSync(path.join(ROOT, 'test', 'cases', f), 'utf8').replace(/\r/g, '');
  const lines = txt.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/rec\([^\n]*,\s*true\s*,\s*['"][^'"]*skip/i.test(lines[i])) {
      bad.push('test/cases/' + f + ':' + (i + 1) + ' 用 rec(true, skip) 冒充通过——改 h.skip(name, reason)');
    }
  }
}

// cases 里的 .acsv-* 类名必须真实存在于 src（负存在断言的白名单单独列）
const NEGATIVE_SENTINEL = new Set(['acsv-np-ihint', 'acsv-np-group', 'acsv-me-entry', 'acsv-sq-tools']);
const srcText = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
const caseClasses = new Set();
for (const f of fs.readdirSync(casesDir)) {
  const txt = fs.readFileSync(path.join(casesDir, f), 'utf8');
  for (const m of txt.matchAll(/\.(acsv-[\w-]+)/g)) caseClasses.add(m[1]);
}
for (const c of caseClasses) {
  if (!srcText.includes(c) && !NEGATIVE_SENTINEL.has(c)) {
    bad.push('cases 引用了 src 不存在的类 .' + c + '（改名漏改？确为负存在断言请进白名单）');
  }
}
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-cases] bundle 声明 ' + caseLines.length + ' 个（release ' + releaseN
  + '）/ 类名 ' + caseClasses.size + ' 个 / skip 语义 OK');
console.log('[check-cases] OK');
