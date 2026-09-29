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

// 脚本端分享文本（imshare 发送格式：标题行\n推荐链 URL）→ {title, note, acId, url}。
// 容忍式契约：URL 可出现在文本任意位置——抽屉从内核消息数据解析（换行完整），原生页
// 曾从 DOM 渲染产物解析（换行可能变 <br>/空格/直接拼接），「URL 独占末行」的严格锚定
// 正则在后者必然失配（0.9.26 原生页不出卡的根因）。URL 前文本=标题，URL 后文本=附言
// note（手打转发场景「看这个 链接 再看看」两端一致消费）。纯 URL 消息同样命中。
var RE_AC_URL = /https?:\/\/www\.acfun\.cn\/v\/ac(\d+)(?:\/?\?[^\s]*)?/i;
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

// 消息 → 列表预览文案（抽屉列表行 / 原生页列表占位共用）
export function previewOfMessage(m) {
  try {
    var card = parseCard(m);
    if (card) {
      var res = card.resourceBody[0] || {};
      return '[作品卡片] ' + String(res.title || card.prologue || '').slice(0, 30);
    }
    var txt = String(msgTextOf(m));
    var share = parseShare(txt);
    if (share) return '[分享] ' + (share.title ? share.title.slice(0, 30) : '推荐视频');
    if (/https?:\/\/[^\s]*acfun\.cn/i.test(txt)) {
      var first = (txt.split('\n')[0] || '').trim();
      var title = /^https?:\/\//i.test(first) ? '' : first;
      return '[视频] ' + (title ? title.slice(0, 30) : '分享了一个视频');
    }
    return txt.slice(0, 40);
  } catch (e) { return ''; }
}
