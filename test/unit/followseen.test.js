// followseen.js（关注已读水位，0.9.139 抽为叶子件）单元测试：零 import 叶子，无需环境垫桩
// —— 覆盖 markSeen/ensureSeen/setSeen-seenAt 往返（无 GM 环境走内存降级）。
// 背景：水位写入口从"仅徽标轮询"扩到两个关注语境入口（followview 首屏成功 / followstream
// 进视频侧），抽件的依赖理由（避免 followstream→followbadge 成环）见 src/followseen.js 头注
import { test } from 'node:test';
import assert from 'node:assert/strict';

var fs = await import('../../src/followseen.js');

test('setSeen/seenAt 往返（无 GM 环境内存降级）', () => {
  fs.setSeen(12345);
  assert.equal(fs.seenAt(), 12345);
});

test('ensureSeen：无水位时写入当前时刻；已有水位幂等不动', () => {
  fs.setSeen(0);
  assert.equal(fs.seenAt(), 0);
  var before = Date.now();
  fs.ensureSeen();
  var v = fs.seenAt();
  assert.ok(v >= before && v <= Date.now(), 'seen=' + v);
  fs.setSeen(999);
  fs.ensureSeen();
  assert.equal(fs.seenAt(), 999); // 已有水位（哪怕很小）不覆盖
});

test('markSeen：推进到当前时刻（已读语义出口——消费方不自己取时刻）', () => {
  fs.setSeen(1);
  var before = Date.now();
  fs.markSeen();
  var v = fs.seenAt();
  assert.ok(v >= before && v <= Date.now(), 'seen=' + v);
});
