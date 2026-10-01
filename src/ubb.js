// ---------- 评论 UBB 渲染（0.9.36 自 comments.js 拆出） ----------
// 管线：先 esc 全文，再按特性逐一白名单放行——[img] 字符类排除引号、[color] 限 hex、
// [emot] 过图床白名单 + 全 URL 字符集、[at] uid 限数字、[resource] 属性区整体吞并。
// 正则与语义对齐动态广场项目（acfun-moment-plaza parser.js）的同名规则。
import { esc } from './ui.js';
import { CFG } from './cfg.js';
import { EmotionMap } from './emoticon.js';

// A 站图床白名单：host 锚定 + 斜杠后全 URL 字符集（白名单只锚 host 时，斜杠后可带
// 引号破出 src 属性——emot 映射分支曾栽在这里，0.9.33）。第二个分支是评论图床的
// ksc2 预览域（upload.js 换出的签名 URL 就落在这里），host+path 双锚定防子域伪装；
// 裸路径公开可访问，服务端 add 时会把它改写成 imgs.aixifan.com/newUpload 长期地址
var IMG_CDN_OK = /^https?:\/\/([\w.-]+\.(aixifan\.com|acfun\.cn)|preview\.ndcsk\.com\/ksc2)\//;
var URL_CHARS_OK = /^[\w\-./:?=&%]+$/;

export function renderCommentHtml(content) {
  var h = esc(content || '');
  // 表情：[emot=acfun,id/] 走映射（map 值恒为 {url} 对象，string 分支系历史格式兼容）；
  // 其他包走 umeditor 固定图床
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
  // @ 提及：[at uid=123]@昵称[/at] → 用户主页链接。uid 限数字进 href；@? 可选吞掉后
  // 统一补 @ 前缀；昵称不再单独转义——全文 esc 已跑过，二次转义会把 & 变成 &amp;quot;
  // （广场项目 v3.7.0 修过的双重转义教训）
  h = h.replace(/\[at uid=(\d+)\]@?(.*?)\[\/at\]/g, function (_, uid, name) {
    return '<a class="ubb-at" href="' + CFG.api.userBase + uid + '" target="_blank" rel="noopener">@' + name + '</a>';
  });
  // 作品引用：[resource id=456 type=2 icon=URL]标题[/resource] → 视频/文章链接
  //（pc-direct 评论方言；type 2=视频，其余按文章）。icon 等其余属性区用 [^\]]* 整体吞掉
  //（值是 URL 不参与输出，还能防 URL 里恰有 id 形态串扰）；标题先剥标签——内层若含
  // 表情/配图，先行规则已生成 <img>，剥掉后由本条产出单链接防 <a> 嵌套。未闭合按字面
  h = h.replace(/\[resource id=(\d+) type=(\d+)[^\]]*\]([\s\S]*?)\[\/resource\]/gi, function (_, id, type, inner) {
    var base = type === '2' ? CFG.api.videoBase : CFG.api.articleBase;
    return '<a class="ubb-res" href="' + base + id + '" target="_blank" rel="noopener">' + inner.replace(/<[^>]+>/g, '') + '</a>';
  });
  // 颜色：[color=#hex]…[/color]。颜色值白名单限 # + 3~8 位 hex（防 style 属性注入）；
  // 跑在 emot/img 之后，正文里的表情/配图可被颜色 span 包裹；未闭合或非法值按字面显示（与未知 UBB 一致）
  h = h.replace(/\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]/g, function (_, cv, inner) {
    return '<span style="color:' + cv + '">' + inner + '</span>';
  });
  return h;
}
