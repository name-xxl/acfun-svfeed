/*
 * 确认稿 ↔ 实现 的**取值闸**（0.9.314 用户裁决 A 案）——只管「稿承诺的取值有没有真的落到实现里」，
 * 不评价散文、不解析结构、不比较行号。
 *
 * 病灶（2026-11-02 用户质询「项目纪律不是先出预览再实现吗，预览稿和成品有出入怎么办」）：
 * 本仓规矩 1 是「UI 先出静态预览、经用户确认后才进 src」，但**稿与实现之间此前没有任何机械闸**
 * （`grep -rn preview test/*.mjs` = 0）——静默出入真的发生过两起：
 *   ① 条卡 `cursor:pointer` 稿里有、实现里没有（直到有人顺手读码才发现，已补）；
 *   ② 宫格放大稿写 1.03、实现取 1.05（方向相反，靠人把稿改成 1.05）。
 * 按规矩 7（同一道缝反复出血即结构裁决、收口必配闸）补这一条。
 *
 * 判据（故意做成最窄、最不易假绿的形态）：注册表每行 = { 稿文件, 取值字面, src 文件, 说明 }——
 * 该**字面必须同时出现在稿与实现两侧**。摘掉实现里的取值 ⇒ 转红；稿里删掉该字面 ⇒ 也转红。
 * 附反跑证明（摘实现 → 转红 → 还原 → 转绿）。
 *
 * 作用范围刻意只覆盖「稿承诺的**取值**」：形态/行为类承诺（如「原生页不得再弹脚本查看器」
 * 「hover 环不得回潮」）由 harness 断言承载（sm-no-imgview / mp-no-imgview / sm-frow-no-ring…），
 * 不在本闸重复——两条腿各管各的，避免同一事实两处钉、两处漂。
 *
 *   node test/check-preview.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 注册表（新增一行 = 把一处「稿承诺的取值」纳入机械守卫）。两个要点：
// ① 值取两侧**逐字共有**的片段，别取类名/选择器——稿用的是 `.new` 作用域的演示选择器，
//    与实现的选择器本来就不逐字相同（宫格那条更极端：稿里占位图元是 `<i>`、实现是 `<img>`）；
// ② `srcCount` 钉**实现侧出现次数**：只钉「≥1 处」在共享取值上会假绿——实测反跑：
//    `scale(1.05)` 在 cssraw 有两处（本批行卡一条 + 既有网格卡先例 `.acsv-gcell:hover .acsv-gcover img`），
//    只摘本批那条，字面仍在 ⇒ 闸照绿。钉住次数后，摘任一条即转红；顺带也挡住「同值又添一份」的复发。
const PINS = [
  {
    draft: 'docs/preview/moment-strip-actions.html', value: 'background:rgba(255,255,255,.10)', src: 'src/cssraw.js', srcCount: 2,
    why: '行卡 hover 提底一档（暗皮 .06→.10；浅皮同档另在 .acsv-mp 块）'
  },
  {
    draft: 'docs/preview/moment-strip-actions.html', value: 'scale(1.05)', src: 'src/cssraw.js', srcCount: 2,
    why: '宫格图元微放大（对齐网格卡 .acsv-gcell 先例；稿初标 1.03 已按裁决统一为 1.05）'
  },
  {
    draft: 'docs/preview/moment-strip-actions.html', value: 'scale(.985)', src: 'src/cssraw.js', srcCount: 2,
    why: '卡面按压（条卡/引用卡/宫格格子）'
  },
  {
    draft: 'docs/preview/moment-strip-actions.html', value: 'translateY(1px)', src: 'src/cssraw.js', srcCount: 2,
    why: '行级按压（整行）'
  },
  {
    draft: 'docs/preview/moment-detail-close.html', value: 'width:28px;height:28px;border-radius:50%', src: 'src/cssraw.js', srcCount: 1,
    why: '动态详情头部右钮组：⋮ 与 ✕ 同规格 28 圆（原背板 40 圆浮钮撤入头部；两键一条规则管）'
  }
];

const bad = [];
const rows = [];
for (const p of PINS) {
  const dPath = path.join(ROOT, p.draft);
  const sPath = path.join(ROOT, p.src);
  if (!fs.existsSync(dPath)) { bad.push('稿文件缺失：' + p.draft); continue; }
  if (!fs.existsSync(sPath)) { bad.push('实现文件缺失：' + p.src); continue; }
  const dTxt = fs.readFileSync(dPath, 'utf8');
  const sTxt = fs.readFileSync(sPath, 'utf8');
  const countOf = (t, v) => t.split(v).length - 1;
  const dn = countOf(dTxt, p.value);
  const sn = countOf(sTxt, p.value);
  rows.push('  ' + p.value + '  稿×' + dn + ' / ' + p.src + '×' + sn + '（注册 ' + p.srcCount + '）  ← ' + p.why);
  if (!dn) bad.push(p.draft + ' 里没有取值 `' + p.value + '`（稿没写/被删 → 稿与实现已脱钩）');
  if (!sn) bad.push(p.src + ' 里没有取值 `' + p.value + '`（实现没落/被摘 → 稿承诺的取值未生效）');
  else if (sn !== p.srcCount) {
    bad.push(p.src + ' 里 `' + p.value + '` 出现 ' + sn + ' 次、注册期望 ' + p.srcCount + ' 次'
      + '（少＝实现被摘了一条；多＝又添了一份同值字面）——核对后同步改注册');
  }
}

console.log('[check-preview] 稿↔实现 取值闸（规矩 1 的机械守卫）——' + PINS.length + ' 条注册项');
for (const r of rows) console.log(r);
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-preview] 未通过：' + bad.length + ' 处——取值必须**同时**出现在确认稿与实现两侧'
    + '（且实现侧出现次数与注册一致）；确属有意变化（取值改口/规则增删）请**同步改稿、改实现、改注册**，别只改一侧');
  process.exit(1);
}
console.log('[check-preview] OK');