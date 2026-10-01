// ---------- 私信消息解析层（脚本抽屉 imdrawer 与原生页增强 imnative 共享） ----------
// 新消息格式的唯一接入点：这里加解析函数，两端渲染器各自消费——脚本私信页支持了
// 新格式，原生页同步挂同一解析即可，不必重复实现。
// 首个战果：contentType 10001 作品分享卡——web 版 ImSdk 的 messageConstructorMap 未注册
// 该类型，content 被留在原始 ArrayBuffer；UTF-8 解码即 JSON
// {prologue, resourceBody:[{coverUrl,resourceId,resourceType,durationSec,
//   viewCountShow,commentCountShow,danmakuCountShow,title}]}

export function msgContentType(m) {
  try { return (m.rawMsg && m.rawMsg.contentType) || 0; } catch (e) { return 0; }
}

export function parseCard(m) {
  try {
    if (msgContentType(m) !== 10001) return null;
    var buf = m.rawMsg && m.rawMsg.content;
    if (!buf) return null;
    var j = JSON.parse(new TextDecoder('utf-8').decode(buf));
    if (!j || !Array.isArray(j.resourceBody) || !j.resourceBody.length) return null;
    return j;
  } catch (e) { return null; }
}

// extra 载荷 key 单源（0.9.59）：发送构造（imshare）与解析（quoteExtraOf/cmtShareOf）
// 共用——字符串两处硬编码时 typo 即静默丢载荷
export var QUOTE_EXTRA_KEY = 'acsvQuote';
export var CMT_EXTRA_KEY = 'acsvCmt';

// ---------- 评论转发识别（0.9.51，评论转发私信专属卡片的分流通约） ----------
// 发送侧（comments 转发委托）wire 首行为「@作者：」，与手打视频分享（标题\n链接）只差
// 首行形态——此前不加区分地走视频分享卡，评论内容进了标题槽后被 dougaCard enrich 的
// 视频标题覆盖，评论在卡片上完全不可见（真机截图实证）。误判成本对称且低：「@某人：
// 这个好看 URL」渲染成评论卡也说得通；作者名含全角冒号/超 40 字则回落视频分享卡（可读性无损）
var RE_CMT_SHARE = /^@([^\n：]{1,40})：/;
export function isCommentShare(title) {
  return RE_CMT_SHARE.test(String(title || ''));
}
// 从 wire 标题拆评论作者（「@作者：」首段）；检测未命中返回 ''。收口说明：检测与拆分
// 共用同一正则（0.9.54 前 imdrawer.cmtHtml 各写一份，靠「拆分仅在检测通过后运行」的
// 隐式约束保持一致）
export function commentShareAuthor(title) {
  var m = RE_CMT_SHARE.exec(String(title || ''));
  return m ? m[1] : '';
}
// 评论转发 wire 组装（0.9.59 收口）：发送侧唯一拼装处——首行「@作者：」形态即上方
// 检测/拆分的契约来源，此前拼装散在 comments.js，改格式会静默失配（quoteWireText
// 同款先例）。作者名含全角冒号/超 40 字不在此拦（检测回落视频卡是既有容错）
export function commentShareWire(name, text) {
  return '@' + (name || '') + '：' + (text || '');
}

// 脚本端分享文本（imshare 发送格式：标题行\n推荐链 URL）→ {title, note, acId, url}。
// 容忍式契约：URL 可出现在文本任意位置——抽屉从内核消息数据解析（换行完整），原生页
// 曾从 DOM 渲染产物解析（换行可能变 <br>/空格/直接拼接），「URL 独占末行」的严格锚定
// 正则在后者必然失配（0.9.26 原生页不出卡的根因）。URL 前文本=标题，URL 后文本=附言
// note（手打转发场景「看这个 链接 再看看」两端一致消费）。纯 URL 消息同样命中。
// #片段（0.9.52，评论转发带 #ncid= 评论锚点）属 URL 一并保留进 url——卡片/复制链接
// 都要能定位到楼层
var RE_AC_URL = /https?:\/\/www\.acfun\.cn\/v\/ac(\d+)(?:\/?\?[^\s]*)?(?:#[^\s]*)?/i;
var RE_TAIL_PUNCT = /[\s.,;:!?)\]】」』。、！？；：]+$/;
var RE_HEAD_PUNCT = /^[\s.,;:!?(\[【「『。、！？；：]+/;
export function parseShare(text) {
  var t = String(text == null ? '' : text);
  var m = RE_AC_URL.exec(t);
  if (!m) return null;
  // 句读贴着链接写（「给你 https://…。」）时两侧标点都不归属：URL 剥尾、附言剥头
  var url = m[0].replace(RE_TAIL_PUNCT, '');
  return {
    title: t.slice(0, m.index).trim().slice(0, 400),
    note: t.slice(m.index + m[0].length).replace(RE_HEAD_PUNCT, '').trim().slice(0, 300),
    acId: m[1],
    url: url
  };
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
export function fmtDur(sec) {
  var s = Math.round(Number(sec) || 0);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + ':' + pad2(m) : String(m)) + ':' + pad2(s % 60);
}

// 未识别类型的降级文案：优先协议自带的 backupTips（如 2026 客服评价卡的说明文字），剥标签可读化
export function degradeText(m) {
  try {
    var raw = m.rawMsg || {};
    if (typeof raw.backupTips === 'string' && raw.backupTips) {
      return raw.backupTips
        .replace(/<a[^>]*>/gi, ' [').replace(/<\/a>/gi, '] ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
  } catch (e) { }
  return '[暂不支持查看的消息，请前往客户端查看]';
}

// ---------- 消息引用（0.9.39，双 wire 通道共享一套接收契约 {seqId, preview, text}） ----------
// ① 原生 Reference（contentType 12）：内核注册了 ReferenceMsg，收到即被 decodeContent
//    解成 .text（回复正文）+ .originMsg（重建的原消息对象），零手写 protobuf；
// ② extra 兜底：文本消息 + proto extra 字段藏 {acsvQuote:{seqId,preview,text}} JSON，
//    服务端零风险，对方客户端只看到可读拼接文本（imshare.sendQuote 负责拼）。
// 引用锚点 = 原消息 seqId（抽屉定位与列表 key 同源）。

// 是否可被引用：有有效预览的类型（文本/分享 0、图片 1、作品卡 10001、引用 12）——引用条
// 要有可读摘要才有意义，未知类型（预览只能是「暂不支持」文案）不给入口。图片两条通道都
// 安全：ImageMsg 已注册，reference 通道的 originMsg 重建无碍；extra 通道更不经过内核解码。
// reference 通道仍禁 10001：内核 decodeContent 查表 new，未注册类型会崩
export function isQuotable(m, wire) {
  var ct = msgContentType(m);
  if (ct !== 0 && ct !== 1 && ct !== 10001 && ct !== 12) return false;
  return !(wire === 'reference' && ct === 10001);
}

// 原生引用通道解析：非 type 12 返回 null。originMsg 缺失/异常时降级不弃疗——
// seqId/preview 置空（引用条退化为无锚点样式），正文 text 照常可读
export function quoteOf(m) {
  try {
    if (msgContentType(m) !== 12) return null;
    var o = m.originMsg;
    var seqId = '', preview = '';
    if (o) {
      try {
        var raw = o.rawMsg || {};
        if (raw.seqId !== undefined && raw.seqId !== null) seqId = String(raw.seqId);
      } catch (e1) { }
      preview = previewOfMessage(o) || '';
    }
    return {
      seqId: seqId,
      preview: String(preview).slice(0, 60),
      text: String(typeof m.text === 'string' ? m.text : msgTextOf(m))
    };
  } catch (e) { return null; }
}

// extra 兜底通道解析：文本消息的 extra 里翻 acsvQuote。extra 被服务端/中间端剥掉时
// 返回 null，消息按普通文本渲染（wire 文文本身可读，官方端观感不受影响）
export function quoteExtraOf(m) {
  try {
    if (msgContentType(m) !== 0) return null;
    var extra = m.rawMsg && m.rawMsg.extra;
    if (!extra) return null;
    var q = (JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(extra))) || {})[QUOTE_EXTRA_KEY];
    if (!q || typeof q.text !== 'string') return null;
    return {
      seqId: q.seqId != null ? String(q.seqId) : '',
      preview: String(q.preview || '').slice(0, 60),
      text: q.text
    };
  } catch (e) { return null; }
}

// ---------- extra 通道 wire 拼接的唯一定义处（0.9.42 收口） ----------
// 发送侧（imshare.sendQuote）拼 wire 文本、原生页（imnative）去重判定，都从这里取，
// 两处硬编码必然漂移。拼接格式是 APP 端可读性契约：对方客户端只看得到这段纯文本
export function quoteWirePrefix(preview) {
  return '[引用] ' + (preview || '原消息');
}
export function quoteWireText(preview, text) {
  return quoteWirePrefix(preview) + '\n' + text;
}
// 原生页正文去重判定：官方把 extra 通道引用消息的 wire 文本原样渲染进气泡正文，
// 补引用摘要条后「摘要」会出现两份（0.9.42）。官方正文恰为发送侧拼接形态时返回
// 应剥离的前缀字符数（含紧随的分隔空白——原生渲染换行可能保留 \n、变 <br>（不产生
// 文本）或折叠成空格，故余部容忍前导空白后须精确等于 q.text）；任何不匹配返回 0，
// 调用方维持「只补条不动正文」的兜底。门槛在调用方：只有 extra/引用解析命中才询问
export function quoteWireTrimLen(contentText, q) {
  try {
    var prefix = quoteWirePrefix(q && q.preview);
    var t = String(contentText == null ? '' : contentText);
    if (t.indexOf(prefix) !== 0) return 0;
    var rest = t.slice(prefix.length);
    var ws = /^[\s\u00a0]+/.exec(rest);
    var body = rest.slice(ws ? ws[0].length : 0);
    return body === q.text ? prefix.length + (ws ? ws[0].length : 0) : 0;
  } catch (e) { return 0; }
}

// 评论转发 extra 通道解析（0.9.52）：文本消息 extra 里的 {acsvCmt:{ncid, content}}，
// content 是原始 UBB 正文（发送侧 ubbImText 的输入）——接收端据此渲染真表情/[img]；
// extra 被服务端/中间端剥掉时返回 null，走 isCommentShare 启发式降级（[表情] 占位文本）
export function cmtShareOf(m) {
  try {
    if (msgContentType(m) !== 0) return null;
    var extra = m.rawMsg && m.rawMsg.extra;
    if (!extra) return null;
    var q = (JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(extra))) || {})[CMT_EXTRA_KEY];
    if (!q || typeof q.content !== 'string') return null;
    return { ncid: q.ncid != null ? String(q.ncid) : '', content: q.content };
  } catch (e) { return null; }
}

// 消息文本提取（抽屉气泡用）；所有已知字段都拿不到时走 degradeText
export function msgTextOf(m) {
  try {
    if (typeof m.text === 'string' && m.text) return m.text;
    if (typeof m.content === 'string' && m.content) return m.content;
    if (m.content && typeof m.content.text === 'string') return m.content.text;
    var raw = m.rawMsg || {};
    if (typeof raw.content === 'string' && raw.content) return raw.content;
    if (raw.content && typeof raw.content.text === 'string') return raw.content.text;
  } catch (e) { }
  return degradeText(m);
}

// 表情短代码 → [表情]（官方列表预览同款语义：convertEmotionCodeToHtml 的兜底分支）
var RE_EMOT_CODE = /\[emot=\S+?\/\]/g;
function plainPreview(s) { return String(s).replace(RE_EMOT_CODE, '[表情]'); }

// 消息 → 列表预览文案（抽屉列表行 / 原生页列表占位共用）
export function previewOfMessage(m) {
  try {
    var card = parseCard(m);
    if (card) {
      var res = card.resourceBody[0] || {};
      return '[作品卡片] ' + String(res.title || card.prologue || '').slice(0, 30);
    }
    if (msgContentType(m) === 1) return '[图片]';
    // 引用消息：预览回复正文（引用链消息正文里带链接时也归引用，不出分享/视频预览）
    var q = quoteOf(m) || quoteExtraOf(m);
    if (q) return '[引用] ' + plainPreview(q.text).slice(0, 30);
    var txt = plainPreview(msgTextOf(m));
    var share = parseShare(txt);
    if (share) {
      // 先占位化再截断：wire 携原始表情码（0.9.53），直接 slice 会切在码中间
      return (isCommentShare(share.title) ? '[评论] ' : '[分享] ')
        + (share.title ? plainPreview(share.title).slice(0, 30) : '推荐视频');
    }
    if (/https?:\/\/[^\s]*acfun\.cn/i.test(txt)) {
      var first = (txt.split('\n')[0] || '').trim();
      var title = /^https?:\/\//i.test(first) ? '' : first;
      return '[视频] ' + (title ? title.slice(0, 30) : '分享了一个视频');
    }
    return txt.slice(0, 40);
  } catch (e) { return ''; }
}
