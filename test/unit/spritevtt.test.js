// appapi.parseSpriteVtt / spriteCueAt 单元测试（0.9.200）：A 站 spriteVtt 回包是 WEBVTT，
// 每条 cue 载荷 `图URL#xywh=x,y,w,h`。样本取自 2026-10-07 真机复验（ac48820714 → vid 39162748）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = globalThis.document || {};
globalThis.__ACSV_DEBUG__ = false;
var { parseSpriteVtt, spriteCueAt } = await import('../../src/appapi.js');

var VTT = [
  'WEBVTT',
  '',
  '00:00:0.000 --> 00:00:1.375',
  'https://tx-video.acfun.cn/a/sprite_1.webp?sign=aa&t=1&us=2#xywh=0,0,160,96',
  '',
  '00:00:1.375 --> 00:00:2.749',
  'https://tx-video.acfun.cn/a/sprite_1.webp?sign=aa&t=1&us=2#xywh=160,0,160,96',
  '',
  '00:01:2.500 --> 00:01:4.000',
  'https://tx-video.acfun.cn/a/sprite_2.webp?sign=bb&t=1&us=2#xywh=0,96,160,96',
  ''
].join('\n');

test('parseSpriteVtt：解析 WEBVTT 三字段（at/url/xywh），URL 去 #xywh、防盗链参数原样保留', () => {
  var cues = parseSpriteVtt(VTT);
  assert.equal(cues.length, 3);
  assert.equal(cues[0].at, 0);
  assert.equal(cues[1].at, 1.375);
  assert.equal(cues[2].at, 62.5); // 00:01:2.500 = 1 分 2.5 秒（秒后是冒号再毫秒）
  assert.equal(cues[1].url, 'https://tx-video.acfun.cn/a/sprite_1.webp?sign=aa&t=1&us=2');
  assert.deepEqual([cues[1].x, cues[1].y, cues[1].w, cues[1].h], [160, 0, 160, 96]);
  assert.deepEqual([cues[2].x, cues[2].y], [0, 96]);
});

test('parseSpriteVtt：脏输入不抛——空/无 cue/缺载荷行 一律安全', () => {
  assert.deepEqual(parseSpriteVtt(''), []);
  assert.deepEqual(parseSpriteVtt('WEBVTT\n\n'), []);
  assert.deepEqual(parseSpriteVtt(null), []);
  assert.deepEqual(parseSpriteVtt('00:00:0.000 --> 00:00:1.000\n'), []); // 载荷行缺失
});

test('spriteCueAt：取 <= sec 的最后一条（升序线性扫），越界与空安全', () => {
  var cues = parseSpriteVtt(VTT);
  assert.equal(spriteCueAt(cues, 0.5).at, 0);
  assert.equal(spriteCueAt(cues, 2).at, 1.375);
  assert.equal(spriteCueAt(cues, 100).at, 62.5);
  assert.equal(spriteCueAt(cues, 0).at, 0);
  assert.equal(spriteCueAt([], 5), null);
  assert.equal(spriteCueAt(null, 5), null);
});
