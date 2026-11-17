/*
 * 注入闸配对钉（0.9.341）：「SCHEMA sub:'inject' 键集」↔「boot 短路调用点」双向逐字对齐。
 *
 * 病灶来历（AGENTS 规矩 3/7）：开关注册表若清单与消费点各写各的，就是下一对
 * sidebar.ENTRIES↔viewreg 双清单（0.9.78 病灶先例）——加子项忘接闸=开关静默失灵，
 * 摘 boot 短路=面板照常显示"可关"而实际关不掉，两头都是**假绿**。本闸让这两种漂移当场红。
 *
 * 判据（全部机器可反跑）：
 *   ① injectItems()（settings 动态 import）键集 === boot.js 里 injectOn('…') 字面键集，
 *      且每个键在 boot 恰好出现一次（多=双消费点漂移源；少=面板有行而闸缺位）；
 *   ② boot 不得手写 'injectNative'（总闸只经 injects.js INJECT_MASTER 常量判读）；
 *   ③ settingspanel 不得出现任何子项键字面（二级清单必须 settings.injectItems() 派生，
 *      人工抄表=本闸存在的理由本身）；
 *   ④ 总闸项形态：type bool ∧ def true ∧ panel true ∧ manage 'inject' ∧ hintOff 在位；
 *      子项形态：type bool ∧ def true（全开=现状零行为变化）∧ panel false ∧ label/hint 齐；
 *   ⑤ **模块分闸（0.9.344 用户裁决「原生页新功能要进设置面板可开关，闸保后来者按规范」）**：
 *     boot 的每一个 import 模块必须在 BOOT_ROLES 显式落籍——NATIVE_GATED（原生面注入：必须
 *     给 key，key 与 SCHEMA sub:'inject' 及 boot injectOn 字面三方互锁）/ SCRIPT（脚本自有
 *     世界，不在射程）/ INFRA（boot 自身设施）/ EXEMPT（**只许一个**：nav.js 进门键，
 *     0.9.343 复审钉「闸不吞入口」——挪它进 GATED 或让豁免席扩编都红）。
 *     诚实边界：静态判不出「这个功能到底注不注入原生页」，本闸把默认路堵死——新模块想进
 *     boot 必须来此签字分类，漏分类=红；把原生注入谎标成 SCRIPT 属人的裁决，评审可见。
 *
 *   node test/check-injects.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// settings.js 求值链（→cfg）需要浏览器垫片——房子惯例同 test/unit/settings.test.js
globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.localStorage = { getItem: function () { return null; }, setItem: function () { }, removeItem: function () { } };

const { SCHEMA, findItem, injectItems } = await import('../src/settings.js');

const bootSrc = fs.readFileSync(path.join(ROOT, 'src/boot.js'), 'utf8');
const panelSrc = fs.readFileSync(path.join(ROOT, 'src/settingspanel.js'), 'utf8');
const injectsSrc = fs.readFileSync(path.join(ROOT, 'src/injects.js'), 'utf8');

const bad = [];
const rows = [];

// ① 键集双向配对
const schemaKeys = injectItems().map(function (it) { return it.key; });
const used = (bootSrc.match(/injectOn\('(\w+)'\)/g) || []).map(function (m) {
  return m.slice("injectOn('".length, -2);
});
const usedSet = new Set(used);
rows.push('SCHEMA sub:inject 键 ×' + schemaKeys.length + '：' + schemaKeys.join(', '));
rows.push('boot injectOn 调用 ×' + used.length + '：' + used.join(', '));
for (const k of schemaKeys) {
  const n = used.filter(function (x) { return x === k; }).length;
  if (n === 0) bad.push(k + '：SCHEMA 有子项但 boot 无短路点（面板可关而不生效=假开关）');
  else if (n > 1) bad.push(k + '：boot 出现 ' + n + ' 个短路点（多消费点=漂移源，收口到一处）');
}
for (const k of usedSet) {
  if (schemaKeys.indexOf(k) < 0) bad.push(k + '：boot 判了未登记键（getSetting 恒 undefined=fail-closed 不注入，实报"关了但没人关它"级幽灵）');
}
// 0.9.343 一修撤入口项（六→五）；0.9.346 二修增动态表情项（五→六）——改此项必先改稿
if (schemaKeys.length !== 6) bad.push('子项数=' + schemaKeys.length + '，与确认稿（六项，0.9.346 二修）不符——改稿先，改表随');

// ② boot 不手写总闸键（总闸短路在 injectOn 内部，boot 只见子项）
if (/['"]injectNative['"]/.test(bootSrc)) bad.push('boot.js 出现 injectNative 字面（总闸只许经 injects.js INJECT_MASTER）');
if (!/INJECT_MASTER = 'injectNative'/.test(injectsSrc)) bad.push('injects.js 总闸常量形态漂移');

// ③ 皮肤零抄表：子项键不许出现在 settingspanel
for (const k of schemaKeys) {
  if (panelSrc.includes("'" + k + "'") || panelSrc.includes('"' + k + '"')) {
    bad.push('settingspanel.js 手抄了键 ' + k + '——二级清单必须 settings.injectItems() 派生（规矩 3）');
  }
}
if (!/injectItems\s*\(/.test(panelSrc)) bad.push('settingspanel.js 未消费 injectItems()——二级清单疑似回到人工表');

// ④⑤ 表项形态
const master = findItem('injectNative');
if (!master || master.type !== 'bool' || master.def !== true || master.panel !== true || master.manage !== 'inject' || !master.hintOff) {
  bad.push('总闸项形态不符（type bool ∧ def true ∧ panel true ∧ manage:inject ∧ hintOff 在位）');
}
SCHEMA.forEach(function (it) {
  if (it.sub !== 'inject') return;
  if (it.type !== 'bool' || it.def !== true || it.panel !== false) bad.push(it.key + '：子项须 type bool ∧ def true（全开=现状）∧ panel false（不上主面板）');
  if (!it.label || !it.hint) bad.push(it.key + '：二级行缺 label/hint 文案');
});

// ---------- ⑤ 模块分闸（0.9.344）：boot 每个 import 必须显式落籍 ----------
// 原生页新功能三保险规范（README「开发」章）：①SCHEMA sub:'inject' 一行（存储+文案）
// ②boot injectOn(key) 短路 ③本表 NATIVE_GATED 落籍——三处缺一即红（①↔②由规则①钉，
// ③↔①②由本节的 ⑤a/⑤b 钉）。豁免席只许 nav.js（进门键，0.9.343）；谎标角色属人的
// 裁决，评审面由本表逐行显式化。
const BOOT_ROLES = {
  // INFRA：boot 自身分流/供件（非特性注入）
  './dbg.js': { role: 'INFRA' },
  './ui.js': { role: 'INFRA' },        // ensureStyle 样式供给（脚本页/原生页共用，注入与否由被闸件决定）
  './state.js': { role: 'INFRA' },     // setRoot
  './styles.js': { role: 'INFRA' },    // IMGVIEW_CSS 常量
  './pagekind.js': { role: 'INFRA' },  // 分流判据
  './injects.js': { role: 'INFRA' },   // 闸门层自身
  // EXEMPT：脚本唯一进门键——0.9.343 复审「闸不吞入口」，此席锁死单元素（扩编=红）
  './nav.js': { role: 'EXEMPT', why: '首页顶导航入口+兜底胶囊＝进设置面板的门（0.9.343）' },
  // NATIVE_GATED：原生页注入特性（keys 必须 ∈ SCHEMA sub:'inject'，且 boot 字面配对由规则①管）
  './uppage.js': { role: 'NATIVE_GATED', k: ['injectSpaceShortVideo'] },
  './spacemoments.js': { role: 'NATIVE_GATED', k: ['injectSpaceMoments'] },
  './memberplaza.js': { role: 'NATIVE_GATED', k: ['injectMemberPlaza'] },
  './imnative.js': { role: 'NATIVE_GATED', k: ['injectPageIm'] },
  './nativeip.js': { role: 'NATIVE_GATED', k: ['injectPageIp'] },
  './dynemot.js': { role: 'NATIVE_GATED', k: ['injectPageDynEmot'] }, // 0.9.346 三保险规范首个实战件：新功能=一行 SCHEMA+一处闸+一籍
  // SCRIPT：脚本自有世界（竖刷壳/dock 自注册视图/页内行为），不在注入闸射程（用户裁决 0.9.341）
  './player.js': { role: 'SCRIPT' },   // 竖刷壳本体（toggle/mount；0.9.345 起签到链在此首挂——不经 boot，不占本表）
  './natpanel.js': { role: 'SCRIPT' }, // 脚本页 IP 面板（原生页 IP 文本注入在 nativeip＝闸内）
  './mypage.js': { role: 'SCRIPT' },   // 以下六件＝registerView 自注册（脚本页 dock 世界）
  './zone.js': { role: 'SCRIPT' },
  './searchview.js': { role: 'SCRIPT' },
  './followview.js': { role: 'SCRIPT' },
  './squareview.js': { role: 'SCRIPT' },
  './jingxuanview.js': { role: 'SCRIPT' },
  './playlayer.js': { role: 'SCRIPT' }
};
const bootImports = new Set();
var reNamed = /from '(\.\/[^']+)'/g, mN;
while ((mN = reNamed.exec(bootSrc))) bootImports.add(mN[1]);
var reSide = /^import '(\.\/[^']+)'/gm, mS; // 自注册视图的副作用 import（行首）
while ((mS = reSide.exec(bootSrc))) bootImports.add(mS[1]);
// ⑤a 落籍检查：boot 新增 import 未分类＝红——来 BOOT_ROLES 签字才能进
for (const mod of bootImports) {
  if (!BOOT_ROLES[mod]) bad.push('boot.js 引了未落籍模块 ' + mod + '——原生页新特性须按三保险规范（README「开发」章）：SCHEMA sub:\'inject\' 一行 + boot injectOn 短路 + BOOT_ROLES 标 NATIVE_GATED；脚本世界标 SCRIPT；设施标 INFRA；EXEMPT 只许进门键');
}
// ⑤b NATIVE_GATED 的 key 必须都在 SCHEMA 登记（标了闸没上表=红；表↔调用字面由规则①管）
const gatedKeys = [];
for (const mod of Object.keys(BOOT_ROLES)) {
  const r = BOOT_ROLES[mod];
  if (r.role !== 'NATIVE_GATED') continue;
  for (const k of r.k) {
    gatedKeys.push(k);
    if (schemaKeys.indexOf(k) < 0) bad.push('BOOT_ROLES ' + mod + ' 声称闸 key ' + k + '，但 SCHEMA 无此 sub:\'inject\' 项（键不得复活/漏登记）');
    if (!bootImports.has(mod)) bad.push('BOOT_ROLES 登记了 ' + mod + ' 为闸内注入件，但 boot 已不引它（撤件请同批撤籍）');
  }
}
// ⑤c SCHEMA 键必须有闸籍（三列表互锁：SCHEMA↔boot 字面↔BOOT_ROLES）
for (const k of schemaKeys) {
  if (gatedKeys.indexOf(k) < 0) bad.push('SCHEMA 子项 ' + k + ' 无 BOOT_ROLES 归属（上表不接线=假开关；接线请落籍）');
}
// ⑤d 豁免席锁死：恰 nav.js 一家，且 nav.js 只能是 EXEMPT（把门划进闸=0.9.343 回潮，红）
const exempts = Object.keys(BOOT_ROLES).filter(function (m) { return BOOT_ROLES[m].role === 'EXEMPT'; });
if (exempts.length !== 1 || exempts[0] !== './nav.js') bad.push('EXEMPT 豁免席变形：' + JSON.stringify(exempts) + '——只许 ./nav.js（进门键不可被闸吞，扩编需用户裁决）');
if (BOOT_ROLES['./nav.js'].role !== 'EXEMPT') bad.push('nav.js 被挪出豁免席——进门键豁免是 0.9.343 用户复审钉，动它先过用户');
rows.push('BOOT_ROLES 落籍：' + bootImports.size + ' 个 boot import 全覆盖（GATED×' + gatedKeys.length + ' / EXEMPT×1 / SCRIPT/INFRA 其余）');

console.log('[check-injects] 注入闸配对钉 + 模块分闸（0.9.341/0.9.344）——稿 docs/preview/native-inject-switch.html');
for (const r of rows) console.log('  ' + r);
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-injects] 未通过：' + bad.length + ' 处——摘 boot 任一处 injectOn 短路、或往皮肤手抄键，都会走到这里；反跑同口径');
  process.exit(1);
}
console.log('[check-injects] OK');
