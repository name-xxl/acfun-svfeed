/*
 * 全局监听器卫生（0.9.264，P1 监听器生命周期）
 *
 * 只查 `window.addEventListener` / `document.addEventListener`：这类监听活过 DOM 拆除，
 * 是跨挂载累积的主要来源。每条必须满足其一：
 *   ① 同文件存在对应的 `removeEventListener('<type>'`（允许在 teardown/dispose 里）；
 *   ② 紧邻行（本行或上一行）带 `// singleton-listener: <理由>`——明确它是页面级单例。
 *
 * 元素级监听（`el.addEventListener`）不查：元素从 DOM 拆除后监听随之失效，不属于本闸范围。
 * 经 `lifecycle.createScope().on(...)` 登记的监听也不查：作用域由 `lifecycle.test.js` 钉住
 * 「dispose 一次摘净」，且 teardown 路径可见，不再需要同位标记。
 * 这不是运行时证明，而是**静态棘轮**：新增的 window/document 监听要么可撤，要么写明为何
 * 不撤；与 check-direction 同款「未登记即红」。
 *
 *   node test/check-listeners.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const RE_ADD = /(window|document)\.addEventListener\(\s*(['"])([^'"]+)\2/;
const RE_SINGLETON = /\/\/\s*singleton-listener\s*:/;

function removable(text, type) {
  var esc = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp("removeEventListener\\(\\s*(['\"])" + esc + "\\1").test(text);
}

var bad = [];
var total = 0;
for (var f of fs.readdirSync(SRC).filter(function (x) { return x.endsWith('.js'); })) {
  var lines = fs.readFileSync(path.join(SRC, f), 'utf8').split('\n');
  var text = lines.join('\n');
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(RE_ADD);
    if (!m) continue;
    total++;
    if (removable(text, m[3])) continue;
    var prev = i > 0 ? lines[i - 1] : '';
    if (RE_SINGLETON.test(lines[i]) || RE_SINGLETON.test(prev)) continue;
    bad.push('src/' + f + ':' + (i + 1) + '  ' + m[1] + " '" + m[3] + "' 未撤且未标 singleton-listener");
  }
}

console.log('[check-listeners] window/document 监听 ' + total + ' 处，未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach(function (b) { console.log('  ✗ ' + b); });
  process.exit(1);
}
console.log('[check-listeners] OK');
