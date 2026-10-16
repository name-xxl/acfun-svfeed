// ---------- 评论 UBB 渲染（0.9.36 自 comments.js 拆出） ----------
// 管线：先 esc 全文，再按特性逐一白名单放行——[img] 字符类排除引号、[color] 限 hex、
// [emot] 过图床白名单 + 全 URL 字符集、[at] uid 限数字、[resource] 属性区整体吞并。
// 0.9.256 起出链/出图的先行规则走**保护块**（protect/restore）：裸 ac 号与动态短链只扫
// 未被标记与 UBB 属性区包裹的裸文本，不再回头改写已生成 HTML（原"顺序等价"被反例证伪）。
// 正则与语义对齐动态广场项目（acfun-moment-plaza parser.js）的同名规则。
// 纯文本投影族（ubbImText/ubbPlain）0.9.119 下沉 ubbtext.js——本模块只留渲染侧。
import { esc } from './ui.js';
import { CFG } from './cfg.js';
import { emotImgOf, emotPlaceholderHtml } from './emoticon.js';

// A 站图床白名单（[img] 用）：host 锚定 + 斜杠后全 URL 字符集（白名单只锚 host 时，斜杠后
// 可带引号破出 src 属性——0.9.33 教训）。第二个分支是评论图床的 ksc2 预览域（upload.js
// 换出的签名 URL 就落在这里），host+path 双锚定防子域伪装；裸路径公开可访问，服务端 add
// 时会把它改写成 imgs.aixifan.com/newUpload 长期地址。**表情域的白名单已随 emotImgOf
// 搬去 emoticon.js（0.9.105）**——表情与评论图两张网不共用一套字符集
var IMG_CDN_OK = /^https?:\/\/([\w.-]+\.(aixifan\.com|acfun\.cn)|preview\.ndcsk\.com\/ksc2)\//;

export function renderCommentHtml(content) {
  var h = esc(content || '');
  // 保护块（0.9.256）：先行规则产出的 HTML 收进 token，裸 ac 号/动态短链规则只扫"剩余裸文本"。
  // 旧「顺序等价论」在 [color=#ac1234]（hex 撞 ac 号形态）、[at] 昵称/话题内容恰为 ac 号、
  // 图链路径段含 ac 号三类输入上被证伪——ac 规则回头把已生成标记的属性/内容二次改写成 <a>
  //（href/src 属性截断、<a> 嵌套）。token 用不可见控制符包夹，与用户文本碰撞视为零
  var prot = [];
  function protect(html) { prot.push(html); return '\x01acsv' + (prot.length - 1) + '\x01'; }
  function restore(s) {
    return String(s).replace(/\x01acsv(\d+)\x01/g, function (_, n) { return prot[Number(n)] || ''; });
  }
  // 字面量 [表情]（API 直接给的明文）→ 灰字占位（0.9.105 吸收广场规则；**先于 emot 规则**，
  // 防自家占位 span 里的 [表情] 文本被二次包裹）
  h = h.replace(/\[表情\]/g, function () { return protect(emotPlaceholderHtml('', '')); });
  // 表情：[emot=acfun,id/] 走映射（斜杠可选、id 限数字——0.9.105 对齐广场容差；未命中出带
  // data-pkg/id 的占位供 refillEmoticons 回填）；其他包走 umeditor 固定图床
  h = h.replace(/\[emot=acfun,(\d+)\/?\]/g, function (_, id) {
    var hit = emotImgOf('acfun', id);
    return protect(hit ? hit.html : emotPlaceholderHtml('acfun', id));
  });
  h = h.replace(/\[emot=(\w+),(\d+)\/?\]/g, function (_, pkg, id) {
    var hit = emotImgOf(pkg, id);
    return hit ? protect(hit.html) : '[表情]';
  });
  // 图片：[img=图片]URL[/img] / [img=alt]URL[/img] / [img]URL[/img]，限 A 站图床白名单
  h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? protect('<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">') : u;
  });
  h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? protect('<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">') : u;
  });
  // @ 提及：[at uid=123]@昵称[/at] → 用户主页链接。uid 限数字进 href；@? 可选吞掉后
  // 统一补 @ 前缀；昵称不再单独转义——全文 esc 已跑过，二次转义会把 & 变成 &amp;quot;
  // （广场项目 v3.7.0 修过的双重转义教训）
  h = h.replace(/\[at uid=(\d+)\]@?(.*?)\[\/at\]/g, function (_, uid, name) {
    return protect('<a class="ubb-at" href="' + CFG.api.userBase + uid + '" target="_blank" rel="noopener">@' + name + '</a>');
  });
  // 行内链接类三条（0.9.105 吸收广场规则）：#话题# → 站内搜索（保护块——话题内文不再被
  // 后续 ac/动态短链规则二次改写）；裸 ac 号/v/ac、a/ac → 作品链；动态短链
  // m.acfun.cn/communityCircle/moment/N → PC 动态页。后两条只扫「未进 [UBB 属性区] 与
  // 已生成标记」的文本段（0.9.256）：[color=#ac1234] 这类属性区/value 形态从此不串扰
  h = h.replace(/#([^#\s]{1,30}?)#/g, function (m, topic) {
    // 话题内文含保护块（表情/图/at 先行产出）：与旧实现同构（旧 HTML 的标签空格会阻断捕获）
    // 不建话题链——否则 token 会被 encodeURIComponent 编进 search keyword
    if (/\x01acsv\d+\x01/.test(topic)) return m;
    return protect('<a class="ubb-topic" href="https://www.acfun.cn/search?keyword=' + encodeURIComponent(topic)
      + '" target="_blank" rel="noopener">#' + topic + '#</a>');
  });
  h = h.split(/(<[^>]*>|\[[^\]]*\]?)/).map(function (seg, i) {
    if (i % 2) return seg; // 标记段/UBB 属性段：不扫
    seg = seg.replace(/\b(?:([va])\/)?(ac\d{4,})\b/gi, function (_, prefix, id) {
      var type = (prefix || 'a').toLowerCase();
      var display = prefix ? prefix + '/' + id : id;
      return '<a class="ubb-ac" href="https://www.acfun.cn/' + type + '/' + id + '" target="_blank" rel="noopener">'
        + display + '</a>';
    });
    return seg.replace(/m\.acfun\.cn\/communityCircle\/moment\/(\d+)/g, function (_, id) {
      return '<a class="ubb-ac" href="' + CFG.api.momentBase + id + '" target="_blank" rel="noopener">am' + id + '</a>';
    });
  }).join('');
  // 紧凑引用方言（0.9.126 吸收广场）：[ac=48879687@video]文字[/ac]（feedSquare 列表专有形态；
  // 详情/评论是下方 [resource] 完整形态）。@video→/v/，其余（@article/无后缀）→/a/。必须排在
  // 裸 ac 号规则之后：display 文本可能已被先行规则渲染成 <a>，剥标签后由本条统一出链防嵌套。
  // 内文先还原保护块再剥标签（0.9.256）——保护块里的可见文本与真标签同等对待、逐字保留
  h = h.replace(/\[ac=(\d+)(?:@(\w+))?\]([\s\S]*?)\[\/ac\]/gi, function (_, id, suffix, inner) {
    var type = String(suffix || '').toLowerCase() === 'video' ? 'v' : 'a';
    // id 是纯数字：落点补 'ac' 前缀（/v/ac<id>），与裸 ac 号规则同形
    return '<a class="ubb-ac" href="https://www.acfun.cn/' + type + '/ac' + id + '" target="_blank" rel="noopener">'
      + restore(inner).replace(/<[^>]+>/g, '') + '</a>';
  });
  // 作品引用：[resource id=456 type=2 icon=URL]标题[/resource] → 视频/文章链接
  //（pc-direct 评论方言；type 2=视频，其余按文章）。icon 等其余属性区用 [^\]]* 整体吞掉
  //（值是 URL 不参与输出，还能防 URL 里恰有 id 形态串扰）；标题先还原保护块再剥标签——
  // 内层表情/配图/话题只留可见文本（与旧"先成链再剥壳"逐字等价）。未闭合按字面
  h = h.replace(/\[resource id=(\d+) type=(\d+)[^\]]*\]([\s\S]*?)\[\/resource\]/gi, function (_, id, type, inner) {
    var base = type === '2' ? CFG.api.videoBase : CFG.api.articleBase;
    return '<a class="ubb-res" href="' + base + id + '" target="_blank" rel="noopener">'
      + restore(inner).replace(/<[^>]+>/g, '') + '</a>';
  });
  // 行内格式四件（0.9.238 补：官方 Fe 序列化器自己就在产出这四种，A 站评论确实支持；
  // 此前只做富文本**写**侧、渲染侧缺这四条 ⇒ 自家发的加粗在正文里按字面显示）。
  // 反方向（写侧→[b] 等）见 inputbar.serializeUbb；官方全集还有 [sup]/[sub]，工具栏没有对应
  // 键、本批不做（出需求再补，规则同形）。位置放在 color 之前：颜色 span 可包格式标签，
  // 四条内也不互相吞（各自 [\s\S]*? 非贪婪闭合）；未闭合/非法值一律按字面显示（与未知 UBB 一致）
  h = h.replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<b>$1</b>');
  h = h.replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<i>$1</i>');
  h = h.replace(/\[u\]([\s\S]*?)\[\/u\]/g, '<u>$1</u>');
  h = h.replace(/\[s\]([\s\S]*?)\[\/s\]/g, '<s>$1</s>');
  // 颜色：[color=#hex]…[/color]。颜色值白名单限 # + 3~8 位 hex（防 style 属性注入）；
  // 跑在 emot/img 之后，正文里的表情/配图可被颜色 span 包裹；未闭合或非法值按字面显示（与未知 UBB 一致）
  h = h.replace(/\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]/g, function (_, cv, inner) {
    return '<span style="color:' + cv + '">' + inner + '</span>';
  });
  return restore(h); // 保护块统一还原（0.9.256）：token 所在文本已全部按各自规则处理完
}

// ---------- 引用块富正文（0.9.57 收口：抽屉 cmtHtml 迁此，imnative 同消费） ----------
// 「@作者：」头 + 原始 UBB 富渲染（renderCommentHtml 完整管线：表情 EmotionMap 真图、
// [img] 出真图）；链接退化 span——引用块置于卡片 <a> 内，HTML 禁止嵌套 a（解析器会
// 拆散 DOM）。author 为裸昵称（内部 esc），raw 为原始 UBB（renderCommentHtml 自带 esc）
export function ubbQuoteHtml(author, raw) {
  return esc('@' + (author || '') + '：')
    + renderCommentHtml(raw).replace(/<a\b[^>]*>/g, '<span>').replace(/<\/a>/g, '</span>');
}
