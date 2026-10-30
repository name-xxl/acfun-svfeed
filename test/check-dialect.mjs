/*
 * 协议方言字面量单源守卫（0.9.304，六域卫生审计·接口域 P1#1/#2/#3/#4）——AGENTS 规矩 7。
 *
 * 病灶：端点方言字符串/数字此前散作裸字面——
 *   · 'no_more' 终值 11 处跨 8 文件（且各方 null/空串/'0' 拼装不一）；
 *   · resourceType 2/3/9/10 裸数字散写（favapi 三连 9、appapi 弹幕 9、interact 三元映射…）；
 *   · 令牌 sid/回包字段 'acfun.midground.api(_st)' 跨 appapi/imimage/interact 4 处；
 *   · 网关识别串 '?product=ACFUN_APP&app_version=' 两份（appapi.q / momentpost.query）；
 *   · PC-direct 成功码 `result===0` 谓词两份 ok0 + 多份内联。
 * 站方重编号/换 sid 即多文件同批、改漏静默。本批已把方言收口到 contract.js（CURSOR_END/
 * isEndCursor/RT/ST/okResult0）与 CFG.dialect（appQuery/tokenSid/tokenField/kpn/subBiz/
 * interactTypeLike）——本闸钉「收口不回潮」：
 *   ① `'no_more'` 字符串字面量唯 contract.js（消费点只许 isEndCursor/CURSOR_END）；
 *   ② `sid=acfun.midground.api` 与 `acfun.midground.api_st` 唯 cfg.js（消费点走 CFG.dialect）；
 *   ③ `?product=ACFUN_APP&app_version=` 唯 cfg.js（消费点走 appapi.appQuery）；
 *   ④ 请求构造里 `resourceType=数字` 裸拼接（body/query 串）不得再现——走 RT；
 *   ⑤ `result === 0` 内联布尔判定（`!!(j && j.result === 0)`）不得在 contract.js 外再现——走 okResult0。
 * 注：`result !== 0` 抛错探针（failCode 家族，各域 `throw new Error('xxx-'+j.result)`）不在射程——
 * 那是失败消息拼装不是成功布尔；docs 注释里的 'no_more'/'resourceType=9' 是文档，不算代码字面。
 *
 *   node test/check-dialect.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const files = fs.readdirSync(SRC).filter((x) => x.endsWith('.js'));
const bad = [];

// 去掉注释行（`^\s*//` 起首），只查代码字面——本仓注释恒独占一行，行尾注释不剥不误伤目标 token
function codeOf(f) {
  return fs.readFileSync(path.join(SRC, f), 'utf8')
    .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
}

// ① 'no_more' 字符串字面（带引号）唯 contract.js
// ②③ 令牌/网关串（带引号）唯 cfg.js
// ⑤ 内联成功码布尔
const QUOTED = [
  { pat: /["']no_more["']/, owner: 'contract.js', why: '走 isEndCursor/CURSOR_END（0.9.304）' },
  { pat: /["']sid=acfun\.midground\.api["']/, owner: 'cfg.js', why: '走 CFG.dialect.tokenSid' },
  { pat: /["']acfun\.midground\.api_st["']/, owner: 'cfg.js', why: '走 CFG.dialect.tokenField' },
  { pat: /["']\?product=ACFUN_APP&app_version=/, owner: 'cfg.js', why: '走 appapi.appQuery' },
  { pat: /!!\(\s*j\s*&&\s*j\.result\s*===\s*0\s*\)/, owner: 'contract.js', why: '走 okResult0（0.9.304）' }
];
for (const f of files) {
  const code = codeOf(f);
  for (const q of QUOTED) {
    if (f === q.owner) continue;
    if (q.pat.test(code)) bad.push('src/' + f + ' 再现裸方言字面 /' + q.pat.source + '/——' + q.why);
  }
}

// ④ 请求构造里 resourceType=数字 裸拼接——字符串拼接中出现 `'&resourceType=2'`/`'resourceType=9&'`
//    这类带数字的字面片段。逐行扫（剥行尾注释——本 token 不会出现在 URL 串里，截断安全）；
//    owner 豁免：contract.js（枚举表）与 historyapi.js 的 HISTORY_TYPES_FORM 定义行
//    （历史族 resourceTypes=1/2 是**本域对**不是 RT 成员，单源就写在该定义处）。
{
  const RT_RE = /resourceType[s]?=[2-9]\b/;
  const OWNERS = { 'contract.js': 1, 'historyapi.js': 1 };
  for (const f of files) {
    if (OWNERS[f]) continue;
    const lines = fs.readFileSync(path.join(SRC, f), 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].replace(/\s+\/\/.*$/, '');
      if (/^\s*\/\//.test(l) || !RT_RE.test(l)) continue;
      bad.push('src/' + f + ':' + (i + 1) + ' 请求串里裸 resourceType=数字——走 contract.RT 枚举（0.9.304）');
    }
  }
}

console.log('[check-dialect] 方言字面单源：扫描 ' + files.length + ' 件 / 规则 '
  + (QUOTED.length + 1) + ' 条——未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-dialect] OK');
