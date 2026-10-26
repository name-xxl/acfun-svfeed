/*
 * 偏好写点棘轮（0.9.285，AGENTS 规矩 7「病灶上溯结构」的机械抓手）
 *
 * pb 的四个记忆字段（soundOn/volume/autoplayNext/playRate）是 settings 层唯一真源的运行态
 * 缓存（0.9.285 偏好记忆单链）：写入只许 setSetting，同步/生效/图标刷新全挂 playback.js
 * 的 onChange 订阅捆绑。直写 pb 即绕过订阅链——0.9.282（漏 defaultPlaybackRate）/
 * 0.9.283（预渲染条快照漂移）的病灶形态正是写点散落、副作用各写各的。本闸把「写点收敛」
 * 钉成机器可查：playback.js 之外任何 `pb.<记忆字段> =` 直接红（seekHold 临时 2x 的恢复
 * 写点也已收进 playback.endSeekHold，无豁免名单）。与 check-direction/check-listeners
 * 同款「未登记即红」的静态棘轮，不是运行时证明。
 *
 *   node test/check-pref.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OWNER = 'playback.js';
const RE_ASSIGN = /[^.\w]pb\.(soundOn|volume|autoplayNext|playRate)\s*=(?!=)/;

var bad = [];
for (var f of fs.readdirSync(SRC).filter(function (x) { return x.endsWith('.js'); })) {
  if (f === OWNER) continue;
  var lines = fs.readFileSync(path.join(SRC, f), 'utf8').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var code = lines[i].split('//')[0]; // 行尾注释里的提及不算写点
    var m = code.match(RE_ASSIGN);
    if (m) bad.push('src/' + f + ':' + (i + 1) + '  pb.' + m[1] + ' 直写——唯一真源在设置层，'
      + '写入只许 setSetting，同步/生效挂 playback.watchPref 订阅');
  }
}

console.log('[check-pref] pb 记忆字段写点棘轮（唯 ' + OWNER + ' 可写），未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach(function (b) { console.log('  ✗ ' + b); });
  process.exit(1);
}
console.log('[check-pref] OK');
