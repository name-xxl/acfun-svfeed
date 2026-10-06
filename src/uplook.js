// @ts-check
// ---------- 作者观感映射（0.9.160 自 data.js 叶子出库） ----------
// 零依赖纯函数：nameColorCss（名字等级色→内联 CSS 色值）/ frameUrlOf（头像框→URL）。
// 消费方全是渲染件（cards/rowkit/momentdetail/commentkit）——UI 词汇不进契约层；
// 名字三色体系（0.9.157）的取色单源在此。

// ---------- 评论观感纯函数（0.9.134；字段名真机双源核对在册：视频 sourceType=3 与动态=4） ----------
// 名字等级色：nameColor 2=紫、1=红、0/缺失=不加内联色（plaza 真机值；双源回包三值齐见）
export function nameColorCss(v) {
  var n = Number(v) || 0;
  return n === 2 ? '#964cfd' : n === 1 ? '#fd4c5c' : '';
}
// 头像框 URL：thumbnailImageCdnUrl 优先，回退 thumbnailImage.cdnUrls[0].url（双源实测形状）
export function frameUrlOf(c) {
  if (!c || !c.avatarFrameImgInfo) return '';
  var f = c.avatarFrameImgInfo;
  if (f.thumbnailImageCdnUrl) return f.thumbnailImageCdnUrl;
  var u = f.thumbnailImage && f.thumbnailImage.cdnUrls && f.thumbnailImage.cdnUrls[0];
  return (u && u.url) || '';
}
