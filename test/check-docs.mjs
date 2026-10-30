/*
 * README 机械事实校验（0.9.297）——只管可机器核对的部分，不评价散文。
 *
 * 病灶（0.9.296 复核）：模块职责表与源码两套手写清单已经漂了——表里缺 11 个模块、
 * route/nativeip 行有未转义竖线、482 行空行把表截成两段、momentapi/momentdetail 挤成一行；
 * 同时 README 里写死“16 个 case 文件”“522 行”等易变数字，没人守。
 *
 * 口径：
 *   ① 模块表（| 模块 | 职责 |）内不允许空行，每行必须恰好 3 根未转义竖线；
 *   ② 模块表第一列出现的所有 `x.js` 必须真实存在于 src/；src/*.js 也必须全部被表覆盖
 *      （合并行如 `styles.js` / `ui.js` 允许，按单元格内所有反引号 .js 计）；
 *   ③ 不校验行数/版本号/状态散文——那些应由“删掉易变数字 + 指向 CHANGELOG”解决。
 *
 *   node test/check-docs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const lines = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8').split(/\r?\n/);
const files = new Set(fs.readdirSync(SRC).filter((f) => f.endsWith('.js')));
const bad = [];

const start = lines.findIndex((l) => /^\|\s*模块\s*\|\s*职责\s*\|$/.test(l));
if (start < 0) bad.push('README 缺「| 模块 | 职责 |」表头');
else {
  const rows = [];
  let blankInTable = 0;
  let i = start;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\|/.test(l)) { rows.push(l); i++; continue; }
    if (l.trim() === '') {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (rows.length && j < lines.length && /^\|/.test(lines[j])) { blankInTable++; i = j; continue; }
    }
    break;
  }
  if (blankInTable) bad.push('模块表内有 ' + blankInTable + ' 处空行（会把表截断）');
  for (let r = 0; r < rows.length; r++) {
    const raw = rows[r].replace(/\\\|/g, 'X'); // 转义竖线不算列分隔
    const pipes = (raw.match(/\|/g) || []).length;
    if (pipes !== 3) bad.push('模块表第 ' + (start + 1 + r) + ' 行竖线数=' + pipes + '（应为 3）');
  }
  const listed = new Set();
  rows.forEach((l) => {
    const cell = l.split('|')[1] || '';
    for (const m of cell.matchAll(/`([^`]+\.js)`/g)) listed.add(m[1]);
  });
  [...files].filter((f) => !listed.has(f)).sort().forEach((f) => bad.push('src/' + f + ' 未进 README 模块表'));
  [...listed].filter((f) => !files.has(f)).sort().forEach((f) => bad.push('README 模块表列了不存在的 src/' + f));
}

console.log('[check-docs] README 模块表机械校验：src ' + files.size + ' 个');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-docs] OK');