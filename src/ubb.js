// ---------- 评论 UBB 渲染（0.9.36 自 comments.js 拆出） ----------
// 管线：先 esc 全文，再按特性逐一白名单放行——[img] 字符类排除引号、[color] 限 hex、
// [emot] 过图床白名单 + 全 URL 字符集。除数据源可控性外与动态广场 UBB 同语义。
import { esc } from './ui.js';
import { EmotionMap } from './emoticon.js';

// A 站图床白名单：host 锚定 + 斜杠后全 URL 字符集（白名单只锚 host 时，斜杠后可带
// 引号破出 src 属性——emot 映射分支曾栽在这里，0.9.33）
var IMG_CDN_OK = /^https?:\/\/[\w.-]+\.(aixifan\.com|acfun\.cn)\//;
var URL_CHARS_OK = /^[\w\-./:?=&%]+$/;

export function renderCommentHtml(content) {
  var h = esc(content || '');
  // 表情：[emot=acfun,id/] 走映射（值可能是字符串或 {url} 对象）；其他包走 umeditor 固定图床
  h = h.replace(/\[emot=acfun,(\w+)\/\]/g, function (_, id) {
    var em = EmotionMap.map[id];
    var u = em ? (typeof em === 'string' ? em : em.url) : null;
    var abs = u ? u.replace(/^\/\//, 'https://') : u;
    if (u && IMG_CDN_OK.test(abs) && URL_CHARS_OK.test(abs)) {
      return '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">';
    }
    return '[表情]';
  });
  h = h.replace(/\[emot=(\w+),(\w+)\/\]/g, function (_, pkg, id) {
    return '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/' + pkg + '/' + id + '.gif" referrerpolicy="no-referrer">';
  });
  // 图片：[img=图片]URL[/img] / [img=alt]URL[/img] / [img]URL[/img]，限 A 站图床白名单
  h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
  });
  h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
  });
  // 颜色：[color=#hex]…[/color]。颜色值白名单限 # + 3~8 位 hex（防 style 属性注入）；
  // 跑在 emot/img 之后，正文里的表情/配图可被颜色 span 包裹；未闭合或非法值按字面显示（与未知 UBB 一致）
  h = h.replace(/\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]/g, function (_, cv, inner) {
    return '<span style="color:' + cv + '">' + inner + '</span>';
  });
  return h;
}
