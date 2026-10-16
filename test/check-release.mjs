/*
 * 发布一致性校验（0.9.81）：package.json 版本 ↔ 两个产物的 @version（debug 后缀归一）↔
 * CHANGELOG 里对应的小节。产物与 src 的同步由 CI 的 git diff --exit-code 保证；版本号这条链
 * 此前无人校验——改版忘 build、忘写日志都能溜过去（0.9.77/0.9.78 全靠人工纪律）。
 * 0.9.232 增产物尺寸断言：正式产物必须已 minify（release < debug×0.9）——minify 被摘掉即红。
 * 0.9.258（审计批② P1-2）增**绝对体积门禁 + 分段表**：此前只有上面那条相对断言，整体静默
 * 膨胀 11% 照样通过；CSS 压缩落下 70KB 后不立闸，等于把这 11% 余量白送。另增两条反跑闸：
 * 产物里 '{{' 必须 0 次（CSS 原文一旦被压进产物即现形）、__ACSV_CSS_SRC__ 必须在场。
 *
 *   node test/check-release.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

function artifactVer(file) {
  const m = fs.readFileSync(path.join(ROOT, file), 'utf8').match(/@version\s+(\S+)/);
  return m ? String(m[1]).replace(/-debug$/, '') : '(缺 @version)';
}
const rel = artifactVer('acfun-svfeed.user.js');
const dbg = artifactVer('acfun-svfeed.debug.user.js');
// 0.9.232：正式产物必须已 minify（release < debug×0.9；实测压缩后 ≈71%、未压 ≈99.99%）
const relBytes = fs.statSync(path.join(ROOT, 'acfun-svfeed.user.js')).size;
const dbgBytes = fs.statSync(path.join(ROOT, 'acfun-svfeed.debug.user.js')).size;

let changelog = '';
try { changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'); } catch (e) { }
const esc = ver.replace(/\./g, '\\.');
const hasSection = new RegExp('^### ' + esc + '[（(]', 'm').test(changelog);

// 体积分段（0.9.258）：口径 = 头部与横幅包裹文本（head，已扣两个内嵌串）/ 内嵌 hls b64 / 内嵌
// CSS 模板 b64 / 其余代码体（rest）。分段统计让"涨在哪一段"一眼可读（此前只有一个总数）。
function sections(file) {
  const buf = fs.readFileSync(path.join(ROOT, file));
  const txt = buf.toString('utf8');
  const hlsB64 = (txt.match(/window\.__ACSV_HLS_SRC__ = "([^"]*)";/) || [, ''])[1].length;
  const cssB64 = (txt.match(/window\.__ACSV_CSS_SRC__ = "([^"]*)";/) || [, ''])[1].length;
  const at = txt.indexOf('(function () {');
  const head = Buffer.byteLength(txt.slice(0, at < 0 ? txt.length : at)) - hlsB64 - cssB64;
  return { total: buf.length, head: head, hls: hlsB64, css: cssB64, rest: buf.length - head - hlsB64 - cssB64 };
}
// 实测基线（0.9.258 构建产物）与 +2% 上限（上限 = ceil(基线×1.02)）。+2% 是单批正常改动的量级：
// 撞线说明这一批涨得超常，应重新裁一次阈值（并把新基线写在这里），而不是默默放过
const BASE = {
  release: { total: 575990, head: 1815, hls: 120340, css: 21656, rest: 432179 },
  debug: { total: 918713, head: 1885, hls: 120340, css: 21656, rest: 774832 }
};
const relSec = sections('acfun-svfeed.user.js');
const dbgSec = sections('acfun-svfeed.debug.user.js');
const SECTIONS = ['total', 'head', 'hls', 'css', 'rest'];

const bad = [];
if (rel !== ver) bad.push('acfun-svfeed.user.js @version=' + rel + '（package.json=' + ver + '，忘了 build？）');
if (dbg !== ver) bad.push('acfun-svfeed.debug.user.js @version=' + dbg + '（package.json=' + ver + '，忘了 build？）');
if (relBytes >= dbgBytes * 0.9) bad.push('acfun-svfeed.user.js 未 minify？（' + relBytes + 'B vs debug ' + dbgBytes + 'B，应 < debug×0.9）');
if (!hasSection) bad.push('CHANGELOG.md 缺 ### ' + ver + '（…）小节（改版必须写日志）');
for (const [kind, sec] of [['release', relSec], ['debug', dbgSec]]) {
  for (const k of SECTIONS) {
    const max = Math.ceil(BASE[kind][k] * 1.02);
    if (sec[k] > max) bad.push(kind + ' ' + k + ' 超上限：' + sec[k] + 'B > ' + max + 'B（基线 ' + BASE[kind][k] + 'B +2%）——体积门禁（审计批② P1-2）');
  }
}
// 内嵌 CSS 模板只许以**压缩串**形态进产物：src/cssraw.js 的原文若被哪个随产物发布的模块
// import 进来，产物里就会重新出现 '{{' 接缝标记（标记只在运行时回填后才消失）⇒ 本批收益归零。
// 这条同时钉住「cssraw.js 只许 build.js import」的纪律（AGENTS 规则 3 的反跑闸）
for (const f of ['acfun-svfeed.user.js', 'acfun-svfeed.debug.user.js']) {
  const txt = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const marks = (txt.match(/\{\{/g) || []).length;
  if (marks) bad.push(f + ' 里出现 ' + marks + " 处 '{{' 标记——CSS 原文被压进产物了？（cssraw.js 只许 build.js import）");
  if (txt.indexOf('window.__ACSV_CSS_SRC__') < 0) bad.push(f + ' 缺 window.__ACSV_CSS_SRC__（构建时漏内嵌 CSS 模板？）');
}

const secLine = (kind, sec) => kind + ' ' + SECTIONS.map((k) => k + ' ' + sec[k] + '/' + Math.ceil(BASE[kind][k] * 1.02)).join(' · ');
console.log('[check-release] package.json=' + ver + ' 产物=' + rel + '/' + dbg + ' changelog=' + (hasSection ? '有' : '缺')
  + ' 体积=' + (relBytes / 1024).toFixed(0) + '/' + (dbgBytes / 1024).toFixed(0) + 'KB');
console.log('[check-release] 体积分段（值/上限=基线×1.02）：' + secLine('release', relSec));
console.log('[check-release]                 ' + secLine('debug', dbgSec));
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-release] OK');
