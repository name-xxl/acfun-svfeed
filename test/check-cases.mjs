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
// 先剥行注释再扫：HEADLESS_SKIP 里的示例条目（注释形态）不算登记
const runnerTxt = fs.readFileSync(path.join(ROOT, 'test', 'run-harness.mjs'), 'utf8')
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
console.log('[check-cases] OK');
