// uplook.js 单元测试（0.9.160 自 data.test.js 迁入，用例逐字保持）：
// nameColorCss / frameUrlOf（0.9.134；字段名真机双源核对在册）——零依赖纯函数。
import { test } from 'node:test';
import assert from 'node:assert/strict';

var { nameColorCss, frameUrlOf } = await import('../../src/uplook.js');

test('nameColorCss：2=紫/1=红/0与缺失=不加色（字符串也认）', () => {
  assert.equal(nameColorCss(2), '#964cfd');
  assert.equal(nameColorCss(1), '#fd4c5c');
  assert.equal(nameColorCss(0), '');
  assert.equal(nameColorCss(undefined), '');
  assert.equal(nameColorCss('2'), '#964cfd');
});
test('frameUrlOf：thumbnailImageCdnUrl 优先、回退 thumbnailImage.cdnUrls[0].url；空/缺形→空串', () => {
  assert.equal(frameUrlOf({ avatarFrameImgInfo: { thumbnailImageCdnUrl: 'a.png' } }), 'a.png');
  assert.equal(frameUrlOf({ avatarFrameImgInfo: { thumbnailImage: { cdnUrls: [{ url: 'b.png' }] } } }), 'b.png');
  assert.equal(frameUrlOf({ avatarFrameImgInfo: { thumbnailImageCdnUrl: '', thumbnailImage: { cdnUrls: [{ url: 'b.png' }] } } }), 'b.png');
  assert.equal(frameUrlOf({ avatarFrameImgInfo: {} }), '');
  assert.equal(frameUrlOf({}), '');
  assert.equal(frameUrlOf(null), '');
});
