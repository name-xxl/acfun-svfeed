/*
 * 浮层键盘监听卫生（0.9.298）——AGENTS 规矩 7 的机械抓手。
 *
 * 病灶：0.9.254 natpanel 已因「浮层自带 keydown 抢关」出血一次（叠层时一次 Esc 连关两层）；
 * 0.9.277 signpanel 又以 document.addEventListener('keydown') 自建 Esc，等于同一道缝第二次出血。
 * 结构因是浮层栈（overlay.js）虽是 Esc 单出口，却没有门禁禁止 feature 模块另起监听。
 *
 * 口径：src/*.js 里 `window|document.addEventListener('keydown', …)` 只许出现在三个白名单
 *   · overlay.js  —— 栈顶 modal 的唯一 capture 裁决点
 *   · input.js    —— 合成事件路径的栈判定兜底（overlay 文件头约定的第二条路径）
 *   · natpanel.js —— 原生页无 #acsv-root 壳时的合成事件兜底（0.9.254 复审在册）
 * 新浮层一律 `overlayOpen({ id, modal:true, close })`；要自持监听先来本表登记理由。
 *
 *   node test/check-overlay.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ALLOW = new Map([
  ['overlay.js', '浮层栈唯一 capture 裁决点'],
  ['input.js', '合成事件路径的 Esc 栈判定兜底'],
  ['natpanel.js', '原生页无 #acsv-root 壳时的合成事件兜底（0.9.254 在册）']
]);
const RE = /(?:window|document)\.addEventListener\(\s*['"]keydown['"]/g;

const bad = [];
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
  if (ALLOW.has(f)) continue;
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  if (RE.test(txt)) bad.push('src/' + f + ' 自带 window/document keydown——新浮层走 overlayOpen；'
    + '确需自持监听先登记 test/check-overlay.mjs 白名单并写理由');
  RE.lastIndex = 0;
}

console.log('[check-overlay] 浮层键盘监听白名单 ' + ALLOW.size + ' 件，未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-overlay] OK');