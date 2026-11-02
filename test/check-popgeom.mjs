/*
 * 确认弹「几何宿主」声明闸（0.9.316，规矩 7 的结构收口）——pickpop 确认弹族的**每个调用点必须
 * 显式声明 placeHost**。
 *
 * 病灶（用户实报「删除动态的确认浮窗定位有问题」）：pickpop.place 的 A 模型「右缘 = min(宿主左缘,
 * 锚点左缘) − GAP_H」把 **host**（DOM 宿主）当**让位列**用；调用方传宽容器时，让位量 = 整个宿主
 * 宽度 ⇒ 左侧放不下 → 翻到宿主右缘 → 弹层与锚点脱钩（被甩到视口最右）。0.9.312 抽出 placeHost
 * （几何宿主）参数并修了历史删除/清空/评论删除三处，**但同一道缝照旧出血**：0.9.316 复核补四处
 * ——动态详情删除确认（host=整面板 920 宽）、收藏「移除」确认（不传 host ⇒ wrap 落在整操作行）、
 * 关注列表「移组/取关」确认（host=整组 chips）、管理模态「删除」确认（host=整条成员行 li）。
 *
 * 判据：扫 src/*.js 里每个 `openConfirmPop(` / `openMmConfirm(` 调用，括号配平取出其 opts 对象，
 * 要求其中出现 `placeHost:`。**不开静默例外口**：确要避开某一列就写 `placeHost: <那一列>`；
 * opts 是**透传标识符**（非对象字面量）的调用点必须带 `// popgeom-ok:<理由>` 标记（跟随本仓
 * singleton-listener / swallow 标记体例），并保证真声明在它自己的调用点。
 *
 * 反跑证明：摘掉任一调用点的 `placeHost:`（或标记）→ 转红；还原 → 转绿。
 *
 *   node test/check-popgeom.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DEFINERS = new Set(['pickpop.js']); // 定义处（不是调用点）
const CALLS = ['openConfirmPop(', 'openMmConfirm('];

const bad = [];
const rows = [];
for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith('.js')).sort()) {
  if (DEFINERS.has(f)) continue;
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\r/g, '');
  for (const call of CALLS) {
    let i = -1;
    while ((i = txt.indexOf(call, i + 1)) >= 0) {
      // 只看真调用：定义/字符串里不会出现（定义在 pickpop/meadmin，meadmin 的定义名是 openMmConfirm）
      if (/function\s+$/.test(txt.slice(Math.max(0, i - 24), i))) continue;
      const line = txt.slice(0, i).split('\n').length;
      const open = txt.indexOf('(', i);
      // 括号配平取出实参表
      let depth = 0, end = -1;
      for (let k = open; k < txt.length; k++) {
        const c = txt[k];
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) { end = k; break; } }
      }
      const args = end > 0 ? txt.slice(open, end + 1) : '';
      const braceAt = args.indexOf('{');
      if (braceAt < 0) { // 实参里没有对象字面量：opts 只能是透传标识符 ⇒ 要标记
        const near = txt.slice(Math.max(0, i - 40), (end > 0 ? end : i) + 120);
        const ok = /\/\/\s*popgeom-ok:/.test(near);
        rows.push('  ' + f + ':' + line + '  ' + call + '透传 opts  ' + (ok ? '标记 popgeom-ok ✓' : '✗ 缺标记'));
        if (!ok) bad.push(f + ':' + line + '：opts 透传却无 `// popgeom-ok:<理由>` 标记——'
          + '几何宿主真声明在调用方，这里必须显式表态（规矩 7：闸要看得见谁在让位）');
        continue;
      }
      let d2 = 0, bend = -1;
      for (let k = braceAt; k < args.length; k++) {
        const c = args[k];
        if (c === '{') d2++;
        else if (c === '}') { d2--; if (d2 === 0) { bend = k; break; } }
      }
      const body = bend > 0 ? args.slice(braceAt, bend + 1) : args;
      const declared = /placeHost\s*:/.test(body);
      const marker = /\/\/\s*popgeom-ok:/.test(body);
      const why = declared ? 'placeHost 已声明 ✓' : (marker ? '标记 popgeom-ok ✓' : '✗ 缺 placeHost');
      rows.push('  ' + f + ':' + line + '  ' + call + '  ' + why);
      if (!declared && !marker) {
        bad.push(f + ':' + line + '：调 ' + call + '… 的 opts 没声明 `placeHost:`——'
          + 'host 若是宽容器（整面板/整行/整组），A 模型会把整个宿主当让位列 ⇒ 弹层被甩到宿主右缘、'
          + '与锚点脱钩。修法：补 `placeHost: <锚点自身>`（或刻意要避开的那一列）');
      }
    }
  }
}

console.log('[check-popgeom] 确认弹几何宿主声明闸——' + rows.length + ' 个调用点');
for (const r of rows) console.log(r);
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-popgeom] 未通过：' + bad.length + ' 处');
  process.exit(1);
}
console.log('[check-popgeom] OK');