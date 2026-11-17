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
 *   ⑤ 子项形态：type bool ∧ def true（全开=现状零行为变化）∧ panel false ∧ label/hint 齐。
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
// 0.9.343 复审：首页导航入口退出清单（进门键豁免）——六项改五项，改此项必先改稿
if (schemaKeys.length !== 5) bad.push('子项数=' + schemaKeys.length + '，与确认稿（五项，0.9.343 修订）不符——改稿先，改表随');

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

console.log('[check-injects] 注入闸配对钉（0.9.341）——稿 docs/preview/native-inject-switch.html');
for (const r of rows) console.log('  ' + r);
if (bad.length) {
  for (const b of bad) console.log('  ✗ ' + b);
  console.log('[check-injects] 未通过：' + bad.length + ' 处——摘 boot 任一处 injectOn 短路、或往皮肤手抄键，都会走到这里；反跑同口径');
  process.exit(1);
}
console.log('[check-injects] OK');
