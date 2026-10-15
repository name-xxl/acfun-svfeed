// tools/gen-device-data.js 纯函数测试（0.9.255 数据优化专项）：Node 内置 test 运行器，零依赖。
// 覆盖：归一规则 golden（含真实数据样本）+ 同码裁决三段规则 + 类别过滤边界。
// 注意：import 该模块不会执行 main()（按 process.argv[1] 与自身路径比对门控）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var { normalizeName, pickWinner, shouldKeep } = await import('../../tools/gen-device-data.js');

// ---------- normalizeName（真实数据样本，规则回退即转红） ----------

test('normalizeName：多名取首段 + 渠道词', () => {
  assert.equal(normalizeName('小米 5 高配版 / 尊享版'), '小米 5 高配版');
  assert.equal(normalizeName('一加 Ace 2 国行版 / 原神定制礼盒'), '一加 Ace 2');
  assert.equal(normalizeName('华为畅享 9 移动 4G+ 标配/高配版'), '华为畅享 9');
});
test('normalizeName：存储/内存括号与区域括号', () => {
  assert.equal(normalizeName('荣耀 Magic7 (16GB+1TB)'), '荣耀 Magic7');
  assert.equal(normalizeName('Pixel (North America)'), 'Pixel');
  assert.equal(normalizeName('红米 3X (联通定制)'), '红米 3X');
});
test('normalizeName：运营商/区域后缀与保留项', () => {
  assert.equal(normalizeName('真我 X7 Pro 至尊版 5G 运营商定制版'), '真我 X7 Pro 至尊版 5G');
  assert.equal(normalizeName('Galaxy S5 电信 3G 双卡版'), 'Galaxy S5');
  assert.equal(normalizeName('Redmi 7 运营商'), 'Redmi 7');
  assert.equal(normalizeName('HUAWEI Mate 40 Pro 5G'), 'HUAWEI Mate 40 Pro 5G'); // 5G 保留
  assert.equal(normalizeName('iPhone 4'), 'iPhone 4'); // 无规则命中即原样
});
test('normalizeName：全网通/双网通与区域尾词', () => {
  assert.equal(normalizeName('HUAWEI nova 全网通标配版'), 'HUAWEI nova');
  assert.equal(normalizeName('红米 3 全网通 标准版'), '红米 3');
  assert.equal(normalizeName('华为 P8 双 4G 标配版'), '华为 P8');
  assert.equal(normalizeName('Nothing Phone (2) Global'), 'Nothing Phone (2)');
});
test('normalizeName：幂等（两轮收敛后不再变化）', () => {
  var samples = ['小米 5 高配版 / 尊享版', '一加 Ace 2 国行版 / 原神定制礼盒',
    'HUAWEI Mate 40 Pro 5G', '荣耀 Magic7 (16GB+1TB)', '红米 3X (联通定制)'];
  for (var i = 0; i < samples.length; i++) {
    var once = normalizeName(samples[i]);
    assert.equal(normalizeName(once), once, samples[i]);
  }
});

// ---------- pickWinner（CN 优先 → 最短 → 字典序） ----------

test('pickWinner：CN 文件优先于全球文件', () => {
  var w = pickWinner([
    { name: 'Xperia XZ (Dual SIM)', src: 'sony.md' },
    { name: 'Xperia XZ', src: 'sony_cn.md' }
  ]);
  assert.equal(w.name, 'Xperia XZ');
});
test('pickWinner：同为 CN 取最短', () => {
  var w = pickWinner([
    { name: '真我 GT Neo5 SE 高配版', src: 'realme_cn.md' },
    { name: '真我 GT Neo5 SE', src: 'realme_cn.md' }
  ]);
  assert.equal(w.name, '真我 GT Neo5 SE');
});
test('pickWinner：同长同源字典序（确定性）', () => {
  var w = pickWinner([
    { name: 'Redmi Pad SE', src: 'xiaomi_cn.md' },
    { name: 'Redmi Pad M7', src: 'xiaomi_cn.md' }
  ]);
  assert.equal(w.name, 'Redmi Pad M7');
});

// ---------- shouldKeep（类别过滤） ----------

test('shouldKeep：笔记本/穿戴剔除，平板/手机保留，Apple 全系保留', () => {
  assert.equal(shouldKeep('笔记本电脑', 'HUAWEI MateBook D 16'), false);
  assert.equal(shouldKeep('荣耀 MagicBook 系列', '荣耀 MagicBook 14 R5'), false);
  assert.equal(shouldKeep('WIKO', 'Hi MateBook D 16 锐龙版'), false); // 章节名无关键词，靠型号名兜底
  assert.equal(shouldKeep('穿戴设备', 'vivo WATCH 3'), false);
  assert.equal(shouldKeep('智慧屏', '荣耀智慧屏 X1'), false);
  assert.equal(shouldKeep('平板电脑', 'vivo Pad3 Pro'), true);
  assert.equal(shouldKeep('小米平板', '小米平板 6 Pro'), true);
  assert.equal(shouldKeep('小米数字系列', '小米 15'), true);
  assert.equal(shouldKeep('(none)', 'ZTE A2017'), true);
});
