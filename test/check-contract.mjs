/*
 * slide/item 字段契约棘轮（0.9.297）——AGENTS 规矩 7「病灶上溯结构」的机械抓手。
 *
 * 病灶：attach.js 的元素级契约总表此前只是**注释**；0.9.296 复核发现 8 个跨模块字段
 * （slide: _lastPct/_lastTimeTxt/_descSync/_ctlDmBtn/_dmVideoId；item: _sprite/_spriteBusy/
 * _qualitiesAll）已在代码里读写、表里没有。改名/重构不会被 tsc 或 check-deps 发现。
 *
 * 口径：源码里 `slide._` / `sl._` / `item._` / `it._` 字段字面量必须命中
 * src/domfields.js 的 SLIDE_FIELDS / ITEM_FIELDS。dmcanvas 的 `it` 是弹幕项（不是 feed
 * item），整文件豁免；其余 `it._` 按 item 处理。注释先剥掉，避免命中说明文字。
 *
 *   node test/check-contract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLIDE_FIELDS, ITEM_FIELDS } from '../src/domfields.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const SLIDE = new Set(SLIDE_FIELDS);
const ITEM = new Set(ITEM_FIELDS);
// dmcanvas 的 it 是弹幕渲染项（_w/_px/_lane/_dur/_bmp…），不是 feed item
const NON_FEED_IT_FILES = new Set(['dmcanvas.js']);
const RE = /\b(slide|sl|item|it)\._([A-Za-z][A-Za-z0-9_]*)/g;

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

const bad = [];
let hits = 0;
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
  const lines = stripComments(fs.readFileSync(path.join(SRC, f), 'utf8')).split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(RE)) {
      const obj = m[1];
      const field = '_' + m[2];
      if (obj === 'it' && NON_FEED_IT_FILES.has(f)) continue;
      hits++;
      const owner = obj === 'slide' || obj === 'sl' ? SLIDE : ITEM;
      if (!owner.has(field)) {
        bad.push('src/' + f + ':' + (i + 1) + '  ' + obj + field
          + ' 未登记——跨模块字段先写进 src/domfields.js（AGENTS 规矩 7）');
      }
    }
  }
}

console.log('[check-contract] slide/item 字段扫描 ' + hits + ' 处，未登记 ' + bad.length + ' 处');
if (bad.length) {
  bad.forEach((b) => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('[check-contract] OK');