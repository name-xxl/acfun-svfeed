/*
 * 列表空态/失败文案单源（0.9.300）——AGENTS 规矩 7 的机械抓手。
 *
 * 病灶：9 个视图/档件各自 `el('div','acsv-vempty', …)`，建/改/摘协议各写各的；
 * 「加载失败，点击重试」在 pageloader 默认与 followadmin/mytabs 覆盖里共四份。
 * 结构因是空态行与列表状态文案没有单一出口。本闸把出口钉死：
 *   · `el('div','acsv-vempty', …)` 只许出现在 src/liststate.js；
 *   · `加载失败，点击重试` / `加载失败，滚动重试` 只许出现在 src/pageloader.js
 *     （消费方用 FAIL_RETRY / FAIL_SCROLL 或走 createPageLoader 默认）；
 *   · 「加载中…」（0.9.305 批⑤②）：ASCII 引号原样串只许出现在 src/pageloader.js
 *     （owner，LOADING_LABEL 定义处）+ 白名单两处**有意例外**——comments.js 评论行
 *     在途占位、pickpop.js 选择层在途占位（非列表翻页状态行，注释已在批注登记；emoticon.js
 *     的「表情加载中…」是不同串，天然不命中）。消费方用 LOADING_LABEL。
 *
 *   node test/check-liststate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const VEMPTY_RE = /el\(\s*['"]div['"]\s*,\s*['"]acsv-vempty['"]/;
const RETRY_RE = /加载失败，点击重试|加载失败，滚动重试/;
const LOADING_RE = /['"]加载中…['"]/;
// 「加载中…」有意例外（0.9.305 批⑤②登记）：非翻页状态行语境，保留字面量
const LOADING_KEEP = new Set(['comments.js', 'pickpop.js']);

const bad = [];
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  if (f !== 'liststate.js' && VEMPTY_RE.test(txt)) {
    bad.push('src/' + f + ' 手拼 acsv-vempty——走 liststate.setEmpty（0.9.300）');
  }
  if (f !== 'pageloader.js' && RETRY_RE.test(txt)) {
    bad.push('src/' + f + ' 手写列表失败文案——用 pageloader.FAIL_RETRY/FAIL_SCROLL（0.9.300）');
  }
  if (f !== 'pageloader.js' && !LOADING_KEEP.has(f) && LOADING_RE.test(txt)) {
    bad.push('src/' + f + ' 手写「加载中…」——用 pageloader.LOADING_LABEL（0.9.305 批⑤②）');
  }
}

console.log('[check-liststate] 空态/失败/加载中文案单源：未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-liststate] OK');