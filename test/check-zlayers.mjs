/*
 * 层级/网格「注释即事实源」的机械守卫（0.9.303）——AGENTS 规矩 7 的抓手。
 *
 * 病灶（六域卫生审计 P0 之三/之五）：
 *   · overlay.js 头注写「大图 60」、cssraw 写「压过 imgview(60)」、pubfab 写「编辑器(62)」，
 *     而实体早在 0.9.108 就把大图提到 63、编辑器落 63/64——注释充当档位表却无守卫；
 *   · cfg.view.jingxuan.gridMin/gridGap 零消费、CSS 裸字面，注释却宣称「与 styles.js 同值」
 *     ——「邻居有缝、新户没挂」的接缝掉队。
 * 本闸三道，任一失配即红：
 *   ① 实体表：权威浮层类的 z-index 必须等于档位表（改档=先改实体、再同步本表，逼显式）；
 *   ② 注释档语：src 注释里「单词(数字)」若单词属单档词汇表，数字必须等于权威值
 *      （「大图 60」这类旧错误语不能再现）；
 *   ③ gridMin/gridGap→SEAMS 消费闸：CFG.view.* 的每个网格常量必须进 styles.js SEAMS，
 *      且 SEAMS 里的网格缝必须真被 cssraw 的 {{缝名}} 消费（双向覆盖，防死缝/防死值）。
 *
 *   node test/check-zlayers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

const bad = [];

// 展平：cssraw.js/styles.js 的 CSS 全是 `'…' + '{{seam}}' + '…'` 的字符串字面量串接——
// 整行注释先剥（注释里有 `'{{'` 这类引号，先剥免得配对错位），再去缝括号、按序取全部单引号
// 字面量拼接（CSS 正文无内嵌单引号，已 grep 验证）→ 得连续模板文本（缝名留原样、无花括号）。
// 再按 `选择器{声明}` 切规则、逗号拆选择器、后出现的 z-index 覆盖先前（近似级联，
// `.acsv-drawer,.acsv-msgdrawer{58}` 被 `.acsv-msgdrawer{62}` 覆盖正是靠这条）。
function flattenCss(files) {
  var out = [];
  for (const f of files) {
    var t = read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\{\{|\}\}/g, '');
    var m, re = /'([^'\n]*)'/g;
    while ((m = re.exec(t))) out.push(m[1]);
  }
  return out.join('');
}
// 解析 class → 生效 z-index（同一规则多次命中取最后一次）
function classZMap(css) {
  var map = {};
  var re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(css))) {
    var z = m[2].match(/z-index:\s*(\d+)/);
    if (!z) continue;
    // 只归属 .acsv- 前缀类（滤掉 styles.js import 路径拼进选择器串产生的 `.js` 假类）；
    // 逗号/复合选择器里每个 acsv- 类都吃这个 z（级联里后续规则再覆盖，正是我们要的近似）
    var cs = m[1].match(/acsv-[\w-]+/g);
    if (!cs) continue;
    cs.forEach(function (c) { map[c] = Number(z[1]); });
  }
  return map;
}
var ZMAP = classZMap(flattenCss(['cssraw.js', 'styles.js']));

// ---------- ① 实体 z 档权威表（档位实体以 cssraw/styles 为准） ----------
const ZLAYER = {
  'acsv-view': 55, 'acsv-view-held': 55,
  'acsv-dock': 56,
  'acsv-top--view': 57, 'acsv-pubfab': 57,          // 浮标与视图态顶栏同档（tie，DOM 序定叠）
  'acsv-drawer': 58,                                 // 评论抽屉
  'acsv-mdetail': 61,                                // 动态详情
  'acsv-msgdrawer': 62, 'acsv-set-host': 62, 'acsv-salm-host': 62, 'acsv-me-host': 62,
  'acsv-imgview': 63, 'acsv-mmask': 63,              // 大图 / 动态编辑器遮罩
  'acsv-mm-wrap': 64,                                // 动态编辑器主体
  'acsv-upd': 65,                                    // 更新弹窗
  'acsv-mmwarn': 66                                  // 编辑器警示条
};
for (const [cls, want] of Object.entries(ZLAYER)) {
  if (!(cls in ZMAP)) { bad.push('权威表引用了不存在或无 z-index 的类 .' + cls + '（改名后本表须跟进）'); continue; }
  if (ZMAP[cls] !== want) {
    bad.push('实体漂移：.' + cls + ' z-index:' + ZMAP[cls] + '，权威表=' + want
      + '（改档先改实体并同步本表——档位摘要注释在 overlay.js 头）');
  }
}

// ---------- ② 注释档语一致性（单档词汇 + 括注数字） ----------
const KEYWORDS = {
  '视图': 55, 'dock': 56, '顶栏': 57, '抽屉': 58, '详情': 61, '设置': 62,
  '大图': 63, 'imgview': 63, '更新弹窗': 65
};
const KW_RE = new RegExp('(' + Object.keys(KEYWORDS).join('|') + ')\\s*[（(]\\s*(\\d{2})\\s*[)）]', 'g');
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
  const txt = read(f);
  let m;
  KW_RE.lastIndex = 0;
  while ((m = KW_RE.exec(txt))) {
    const want = KEYWORDS[m[1]];
    if (Number(m[2]) !== want) {
      bad.push('注释档语失实：src/' + f + ' 里「' + m[1] + '(' + m[2] + ')」——权威=' + want
        + '（实体见 check-zlayers 的 ZLAYER 表；勿让注释充当漂移的档位表）');
    }
  }
}

// ---------- ③ gridMin/gridGap → SEAMS 消费闸（cfg 值必须经缝进 CSS） ----------
const cfgTxt = read('cfg.js');
const stylesTxt = read('styles.js');
// cfg.view.*.gridMin/gridGap：扫 `块名: { ... gridMin/gridGap }` 的块（块头 4 空格缩进、字段 6 空格）
const cfgGrid = []; // [{block, field}]
{
  const lines = cfgTxt.split('\n');
  let block = null;
  for (let i = 0; i < lines.length; i++) {
    const bh = lines[i].match(/^\s{4}(\w+):\s*\{/);          // view 块内的一级子块
    if (bh) { block = bh[1]; continue; }
    const fg = lines[i].match(/^\s{6}(gridMin|gridGap):/);   // 块内网格字段
    if (fg && block) cfgGrid.push({ block, field: fg[1] });
    if (/^\s{2}\w/.test(lines[i]) && !/^\s{2}\w+:\s*\{/.test(lines[i])) block = null; // 出块粗复位
  }
}
const seamsUsed = new Set();
{
  let m; const se = /CFG\.view\.(\w+)\.(gridMin|gridGap)/g;
  while ((m = se.exec(stylesTxt))) seamsUsed.add(m[1] + '.' + m[2]);
}
for (const g of cfgGrid) {
  if (!seamsUsed.has(g.block + '.' + g.field)) {
    bad.push('cfg.view.' + g.block + '.' + g.field + ' 未进 styles.js SEAMS——死配置或被裸字面绕过'
      + '（0.9.303 教训：jingxuan.gridMin 曾零消费而注释宣称同值）');
  }
}
// SEAMS 里的网格缝必须真被 cssraw 的 {{缝名}} 消费（防死缝）
{
  let m; const gm = /^\s*(\w*[gG]rid(?:Min|Gap)):/gm;
  const cssRawTxt = read('cssraw.js');
  while ((m = gm.exec(stylesTxt))) {
    const seam = m[1];
    if (!cssRawTxt.includes('{{' + seam + '}}')) {
      bad.push('SEAMS.' + seam + ' 无 cssraw 的 {{' + seam + '}} 消费点——死缝（缝表与模板要成对）');
    }
  }
}

console.log('[check-zlayers] z 档实体 ' + Object.keys(ZLAYER).length + ' 类 / 注释单档词 '
  + Object.keys(KEYWORDS).length + ' 个 / 网格缝 cfg ' + cfgGrid.length + ' 项——未登记 '
  + bad.length + ' 处');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-zlayers] OK');
