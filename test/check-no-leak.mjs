/*
 * 泄密门禁（2026-10-05 用户裁决）——两份接口侦察文档（docs/api-research.md、
 * docs/acfun-app-api-inventory.md）改**本地留档、永不入公开仓**：接口端点虽是公开客户端
 * 可观察的事实，但成体系的「实测笔记 + 全量清单」会降低灰产起步成本，用户明确不做这种土壤。
 *
 * 本门禁钉三件事，任何一条破防即 exit 1：
 *   ①两文件不在 git 索引（git add -f 硬塞进来会被抓住）；
 *   ②两文件被 .gitignore 覆盖（防 ignore 规则被清后 untracked 噪音诱发误 add）；
 *   ③暂存区不含两文件（双保险，拦在 git diff --cached 层）。
 *
 * 摘修复反跑：git add -f docs/api-research.md 后跑本脚本必须转红（验完 git rm --cached 还原）。
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = ['docs/api-research.md', 'docs/acfun-app-api-inventory.md'];
const run = (cmd) => execSync(cmd, { encoding: 'utf8', cwd: ROOT });
const fail = (msg) => { console.error('check-no-leak：' + msg); process.exit(1); };

const tracked = new Set(run('git ls-files').split('\n'));
for (const f of DOCS) {
  if (tracked.has(f)) fail(`${f} 已被 git 跟踪——2026-10-05 裁决：本地留档永不入公开仓，请 git rm --cached 撤下`);
}

for (const f of DOCS) {
  let ignored = true;
  try { execSync(`git check-ignore -q "${f}"`, { cwd: ROOT }); } catch { ignored = false; }
  if (!ignored) fail(`${f} 未被 .gitignore 覆盖——补 ignore 规则，防 untracked 噪音诱发误 add`);
}

const staged = new Set(run('git diff --cached --name-only').split('\n'));
for (const f of DOCS) {
  if (staged.has(f)) fail(`${f} 出现在暂存区——git restore --staged 撤下后再提交`);
}

console.log('check-no-leak：两份接口侦察文档确认在仓外（未跟踪 + 已忽略 + 未暂存）');
