/*
 * 发布一致性校验（0.9.81）：package.json 版本 ↔ 两个产物的 @version（debug 后缀归一）↔
 * CHANGELOG 里对应的小节。产物与 src 的同步由 CI 的 git diff --exit-code 保证；版本号这条链
 * 此前无人校验——改版忘 build、忘写日志都能溜过去（0.9.77/0.9.78 全靠人工纪律）。
 * 0.9.232 增产物尺寸断言：正式产物必须已 minify（release < debug×0.9）——minify 被摘掉即红。
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

const bad = [];
if (rel !== ver) bad.push('acfun-svfeed.user.js @version=' + rel + '（package.json=' + ver + '，忘了 build？）');
if (dbg !== ver) bad.push('acfun-svfeed.debug.user.js @version=' + dbg + '（package.json=' + ver + '，忘了 build？）');
if (relBytes >= dbgBytes * 0.9) bad.push('acfun-svfeed.user.js 未 minify？（' + relBytes + 'B vs debug ' + dbgBytes + 'B，应 < debug×0.9）');
if (!hasSection) bad.push('CHANGELOG.md 缺 ### ' + ver + '（…）小节（改版必须写日志）');

console.log('[check-release] package.json=' + ver + ' 产物=' + rel + '/' + dbg + ' changelog=' + (hasSection ? '有' : '缺')
  + ' 体积=' + (relBytes / 1024).toFixed(0) + '/' + (dbgBytes / 1024).toFixed(0) + 'KB');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-release] OK');
