// ---------- UBB 纯文本投影（0.9.119 自 ubb.js 下沉） ----------
// 零依赖纯函数家族：把 UBB 原文压成纯文本（只投影不渲染、无 esc 语义）——
//   ubbImText：IM wire 文本化（评论转发私信的 wire 文本投影；表情码原样保留）
//   ubbPlain：明文投影（转发动态引用块标题；表情码/占位与 [img] 整体删除）
// 下沉理由（方向清单收尾）：data（契约层）曾为 ubbPlain 直连 ubb.js（渲染管线）——投影与渲染
// 分家后，契约层只碰纯逻辑；渲染侧（renderCommentHtml/ubbQuoteHtml）留在 ubb.js。
// 前置检查已做（用户定的约束）：两函数各条正则皆内联字面量，与渲染路径**无共享常量**
//（模块级仅 IMG_CDN_OK 且渲染侧私有）——不存在"正则单源劈半"，故只沉纯函数、不动正则。

// ---------- IM wire 文本化（0.9.50 引入；0.9.53 语义修正：表情码原样保留） ----------
// 评论转发私信的 wire 文本投影。官方 IM 的文本消息 wire 本来就携带 [emot=pkg,id/] 码，
// APP/官方 web 原生渲染成表情图（emoticon.emotify 同源契约——0.9.54 起表情转图收口在 emoticon.js）——
// 0.9.52 曾转 [表情] 占位，官方端只能看到占位文本，系劣化，已纠正。[img] 是评论系 UBB、
// IM 不认，转 [图片] 占位（真图渲染走 extra 载荷）；at/color/resource 摘内文。
// 未知/未闭合标签按字面保留
export function ubbImText(content) {
  var t = String(content || '');
  t = t.replace(/\[img=[^\]]*\]https?:\/\/[^\["']+?\[\/img\]/g, '[图片]');
  t = t.replace(/\[img\]https?:\/\/[^\["']+?\[\/img\]/g, '[图片]');
  t = t.replace(/\[at uid=\d+\]@?(.*?)\[\/at\]/g, '@$1');
  t = t.replace(/\[resource id=\d+ type=\d+[^\]]*\]([\s\S]*?)\[\/resource\]/gi, '$1');
  t = t.replace(/\[color=#[0-9a-fA-F]{3,8}\]([\s\S]*?)\[\/color\]/g, '$1');
  return t;
}

// ---------- UBB → 明文投影（0.9.98）：转发动态引用块标题用 ----------
// 与 ubbImText 同族的纯文本投影，但更狠：表情码/占位与 [img] 整体删除（引用块单行预览
// 不挂图、也不露图链裸文），at/resource 等成对标签只剥壳留内文（名字/标题自然落在明文里）。
// 只投影不渲染——富渲染走 renderCommentHtml/ubbTextOf 单源；空白压平成单空格（title 单行）
export function ubbPlain(content) {
  return String(content || '')
    .replace(/\[img=[^\]]*\][\s\S]*?\[\/img\]/gi, ' ')
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, ' ')
    .replace(/\[[^\[\]]{1,64}\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
