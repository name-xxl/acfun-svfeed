/*
 * 落点外链闸（落点收口结构批·配闸，2026-11-17）——扫 src/*.js 里的 `window.open(` 调用，
 * 对照下方白名单注册表（每条带来历）；**白名单外出现、或登记条目与源码计数不符，即 exit 1**。
 *
 * 钉的是哪起病灶：落点决策散布——「点这行/卡去哪」的 if 链同时活在五处
 *（rowkit.openRowDefault / openRowSource / rowBarOf 评论键、cards.quoteBlockOf 源卡点击、
 * searchview.articleRowOf），同一道缝反复出血：
 *   ① 0.9.331 followview.rowDefault 本地副本漏收 0.9.326「文章→阅读浮层」分支——关注页文章行
 *      按 href 兜底跳原址（同形副本漂移，用户实报）；
 *   ② 我的页动态视频行走 openRowDefault：它无视频分支、契约层视频又无 href——死点击；
 *      同条目在关注页却正常（本地副本恰好带视频分支）。
 * 按规矩 7 结构裁决：落点收口到 src/dest.js 注册表（(ct×宿主)→出口 + 单一查询出口 destOf），
 * 本闸防「第二份落点决策」回潮：新 window.open 必须二选一——进 dest 表（出站类共用 siteOut
 * 单出口），或在下方 WHITE 显式登记一行（写明来历与为什么不进表）。闸与表两条腿各管各：
 * 表管「决策该去哪」，闸管「决策不许再散布」。
 *
 * 射程说明：本闸只钉 window.open 调用。锚点出链（<a target=_blank>：ubb 资源链/[@]、
 * articleread「前往原页」、gridCardOf 外链卡）是「出链属性」缝不是「落点决策」缝，已由
 * ubbattr.A_TAIL 与各构建件注释钉住，不在本闸——两条腿各管各（同 check-preview 头注口径）。
 *
 * 反跑（摘修复反跑同款）：
 *   · 加：任一 src/*.js 临时添一行 `window.open('https://example.com', '_blank');`
 *     → 本闸「白名单无登记」转红（exit 1）；删掉还原。
 *   · 摘：把任一白名单条目对应的源码调用摘掉 → 计数不符同样转红（白名单双向：多/漏都红）；
 *     批 2 接线撤掉散布点后，必须同批减 WHITE 注册，否则闸钉着旧计数不放。
 *
 *   node test/check-dest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

// 白名单注册表（每条 = 文件 + 该文件 window.open( 的登记计数 + 来历）。计数语义**双向**：
// 多一条（新决策点没登记）与少一条（调用被摘而注册没撤）都红。批 2 逐条收编 destOf 时同步减注册。
const WHITE = [
  {
    file: 'src/dest.js', count: 1,
    why: '落点注册表 native 宿主单出口 siteOut（0.9.314 站方原址新标签）——收口后全仓「内容落点」唯一合法外链；单测另有棘轮钉 dest.js 恰 1 处'
  },
  {
    file: 'src/cards.js', count: 3,
    why: 'quoteBlockOf 三处兜底（0.9.333 接线后正常态三分支均不走外链：video→itemOpener 缝 / article→articleOpener 缝（dest 注册格）/ moment→momentOpener 缝）——本件不反向 import dest（环），缝未注册的外链是安全网非决策：siteOnly 三源出站(1) / script 文章缝未注册兜底(1) / moment 缝未注册兜底(1)'
  },
  {
    file: 'src/release.js', count: 2,
    why: '更新弹窗「前往更新」按钮 ×2（CFG.api.releasePage）——非内容落点（脚本自身更新域，无 ct/宿主语义），不进 dest 表，永久表外登记'
  }
];

const bad = [];
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
const reg = new Map(WHITE.map((w) => [w.file.replace(/^src\//, ''), w]));
for (const f of files) {
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  const n = txt.split('window.open(').length - 1;
  const w = reg.get(f);
  if (!w) {
    if (n > 0) {
      bad.push('src/' + f + ' 出现 ' + n + ' 处 window.open(，白名单无登记——新落点决策点：'
        + '进 dest 表（出站共用 siteOut 单出口）或在 test/check-dest.mjs WHITE 登记并写明来历');
    }
    continue;
  }
  if (n !== w.count) {
    bad.push('src/' + f + ' window.open( 实数 ' + n + '、注册 ' + w.count
      + '（多=又添一份落点决策；少=调用已摘而注册未撤）——核对后同批改 WHITE。原注册理由：' + w.why);
  }
}
for (const f of reg.keys()) {
  if (!files.includes(f)) bad.push('WHITE 登记的 ' + f + ' 已不存在——撤注册行');
}

console.log('[check-dest] 落点外链闸——src ' + files.length + ' 件 / 注册 ' + WHITE.length
  + ' 条 ' + WHITE.reduce((s, w) => s + w.count, 0) + ' 处 window.open(');
for (const w of WHITE) console.log('  ' + w.file + ' ×' + w.count + '  ← ' + w.why);
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-dest] 未通过：新落点决策必须收口 dest 表或显式登记——防第二份落点决策'
    + '（0.9.331 followview 副本漏文章分支 / 我的页视频行死点击即前车）');
  process.exit(1);
}
console.log('[check-dest] OK');
