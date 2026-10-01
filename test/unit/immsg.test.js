// immsg.js（私信共享解析层）单元测试：Node 内置 test 运行器，零依赖。
// 解析层是零依赖纯函数叶子，这里的用例把它的容错契约钉死——
// 任何输入（包括 null / 抛 getter 的脏对象）都不允许抛错，只允许降级。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  msgContentType, parseCard, parseShare, fmtDur,
  degradeText, msgTextOf, previewOfMessage,
  isQuotable, quoteOf, quoteExtraOf, quoteWireText, quoteWireTrimLen,
  isCommentShare, commentShareWire, commentShareAuthor, cmtShareOf, QUOTE_EXTRA_KEY, CMT_EXTRA_KEY
} from '../../src/immsg.js';

// contentType 10001 的 content 是 UTF-8 解码即 JSON 的 ArrayBuffer
function cardMsg(cardObj, contentType) {
  var bytes = new TextEncoder().encode(JSON.stringify(cardObj));
  return { rawMsg: { contentType: contentType == null ? 10001 : contentType, content: bytes.buffer } };
}

// contentType 12 引用消息：内核 decodeContent 解出的形态（.text 回复正文 + .originMsg 重建原消息）
function refMsg(originMsg, text) {
  return { rawMsg: { contentType: 12, seqId: '900' }, originMsg: originMsg, text: text };
}

// extra 兜底通道：文本消息 + rawMsg.extra 藏 {acsvQuote} JSON
function extraMsg(payload, contentType) {
  var bytes = new TextEncoder().encode(JSON.stringify(payload));
  return { text: 'wire 文本', rawMsg: { contentType: contentType == null ? 0 : contentType, extra: bytes.buffer } };
}

var SAMPLE_CARD = {
  prologue: '给你推荐',
  resourceBody: [{
    coverUrl: 'https://imgs.aixifan.com/cover.jpg',
    resourceId: '1234',
    resourceType: 2,
    durationSec: 91,
    viewCountShow: '1.2万',
    commentCountShow: '56',
    danmakuCountShow: '7',
    title: '标题'
  }]
};

// ---------- msgContentType ----------
test('msgContentType：取 rawMsg.contentType，异常/缺失落 0', () => {
  assert.equal(msgContentType({ rawMsg: { contentType: 10001 } }), 10001);
  assert.equal(msgContentType({ rawMsg: {} }), 0);
  assert.equal(msgContentType({}), 0);
  assert.equal(msgContentType(null), 0);
  assert.equal(msgContentType(undefined), 0);
});

// ---------- parseCard ----------
test('parseCard：合法 10001 卡解析出 resourceBody', () => {
  var j = parseCard(cardMsg(SAMPLE_CARD));
  assert.ok(j && Array.isArray(j.resourceBody) && j.resourceBody.length === 1);
  assert.equal(j.resourceBody[0].title, '标题');
  assert.equal(j.prologue, '给你推荐');
});

test('parseCard：非 10001 / 缺 content / 坏 JSON / 空 resourceBody 一律 null', () => {
  assert.equal(parseCard(cardMsg(SAMPLE_CARD, 1)), null);          // 非 10001
  assert.equal(parseCard({ rawMsg: { contentType: 10001 } }), null); // content 缺失
  var bad = new TextEncoder().encode('{oops').buffer;
  assert.equal(parseCard({ rawMsg: { contentType: 10001, content: bad } }), null);
  assert.equal(parseCard(cardMsg({ prologue: 'x', resourceBody: [] })), null);
  assert.equal(parseCard(cardMsg({ prologue: 'x' })), null);
  assert.equal(parseCard(null), null);
});

// ---------- parseShare ----------
test('parseShare：URL 居中——URL 前是标题、后是附言', () => {
  var s = parseShare('看这个 https://www.acfun.cn/v/ac1234 再看看');
  assert.equal(s.acId, '1234');
  assert.equal(s.title, '看这个');
  assert.equal(s.note, '再看看');
  assert.equal(s.url, 'https://www.acfun.cn/v/ac1234');
});

test('parseShare：句读贴着链接——URL 剥尾标点、附言剥头标点', () => {
  var s = parseShare('给你 https://www.acfun.cn/v/ac77。');
  assert.equal(s.url, 'https://www.acfun.cn/v/ac77');
  assert.equal(s.title, '给你');
  assert.equal(s.note, '');
  var s2 = parseShare('https://www.acfun.cn/v/ac77？（附言');
  assert.equal(s2.url, 'https://www.acfun.cn/v/ac77');
  assert.equal(s2.note, '（附言');
});

test('parseShare：纯 URL / 带 query / 多行标题（imshare 发送格式）', () => {
  var s = parseShare('https://www.acfun.cn/v/ac9');
  assert.equal(s.acId, '9');
  assert.equal(s.title, '');
  assert.equal(s.note, '');
  assert.equal(parseShare('https://www.acfun.cn/v/ac5?shareUserId=xx&fid=1').acId, '5');
  var multi = parseShare('标题行\nhttps://www.acfun.cn/v/ac42');
  assert.equal(multi.title, '标题行');
  assert.equal(multi.acId, '42');
});

test('parseShare：非 AcFun 视频链 / 空输入 → null', () => {
  assert.equal(parseShare('https://www.bilibili.com/video/av1'), null);
  assert.equal(parseShare('看看这个 www.acfun.cn/v/ac1'), null); // 无协议不命中
  assert.equal(parseShare(''), null);
  assert.equal(parseShare(null), null);
  assert.equal(parseShare(undefined), null);
});

// ---------- fmtDur ----------
test('fmtDur：进位/取整/脏输入', () => {
  assert.equal(fmtDur(0), '0:00');
  assert.equal(fmtDur(59), '0:59');
  assert.equal(fmtDur(60), '1:00');
  assert.equal(fmtDur(91), '1:31');
  assert.equal(fmtDur(3661), '1:01:01');
  assert.equal(fmtDur(59.6), '1:00');     // 先取整再进位
  assert.equal(fmtDur('abc'), '0:00');
  assert.equal(fmtDur(undefined), '0:00');
});

// ---------- degradeText ----------
test('degradeText：优先协议 backupTips 并剥标签可读化，否则默认文案', () => {
  assert.equal(
    degradeText({ rawMsg: { backupTips: '<a href="x">客服</a>回复<br/>你好' } }),
    '[客服] 回复\n你好' // 末尾 trim 会剥掉剥标签时留下的前导空格
  );
  assert.equal(degradeText({ rawMsg: {} }), '[暂不支持查看的消息，请前往客户端查看]');
  assert.equal(degradeText(null), '[暂不支持查看的消息，请前往客户端查看]');
});

// ---------- msgTextOf：五级字段回退 ----------
test('msgTextOf：text → content → content.text → rawMsg.content → rawMsg.content.text → degrade', () => {
  assert.equal(msgTextOf({ text: 'a', content: 'b' }), 'a');
  assert.equal(msgTextOf({ content: 'b' }), 'b');
  assert.equal(msgTextOf({ content: { text: 'c' } }), 'c');
  assert.equal(msgTextOf({ rawMsg: { content: 'd' } }), 'd');
  assert.equal(msgTextOf({ rawMsg: { content: { text: 'e' } } }), 'e');
  assert.equal(msgTextOf({}), '[暂不支持查看的消息，请前往客户端查看]');
  assert.equal(msgTextOf({ rawMsg: { backupTips: '说明文字' } }), '说明文字'); // 兜底接 backupTips
  assert.equal(msgTextOf(null), '[暂不支持查看的消息，请前往客户端查看]');
});

// ---------- 消息引用解析（0.9.39） ----------
test('isQuotable：extra 通道文本/卡片/引用均可引；reference 通道禁卡；无预览类型禁', () => {
  assert.equal(isQuotable({ rawMsg: { contentType: 0 } }), true);
  assert.equal(isQuotable({ rawMsg: {} }), true); // 缺失按 0
  assert.equal(isQuotable(cardMsg(SAMPLE_CARD)), true);   // extra 通道不经过内核解码
  assert.equal(isQuotable(refMsg(null, 'x')), true);      // 引用套引用
  assert.equal(isQuotable(cardMsg(SAMPLE_CARD), 'reference'), false); // 内核重建 originMsg 会崩
  assert.equal(isQuotable(refMsg(null, 'x'), 'reference'), true);
  assert.equal(isQuotable({ rawMsg: { contentType: 1 } }), true);     // 图片可引（预览 [图片]）
  assert.equal(isQuotable({ rawMsg: { contentType: 2026 } }), false); // 未知类型同
  assert.equal(isQuotable(null), true); // 容错契约：不抛错（缺失按 0 走）
});

test('previewOfMessage：图片消息出 [图片]；表情短代码统一显示 [表情]（官方列表预览同款）', () => {
  assert.equal(previewOfMessage({ rawMsg: { contentType: 1 } }), '[图片]');
  assert.equal(previewOfMessage({ text: '看 [emot=acfun,123/] 好笑' }), '看 [表情] 好笑');
  assert.equal(previewOfMessage({ text: '哈哈[emot=acfun,1/]' }), '哈哈[表情]');
});

test('quoteOf：type 12 解出 {seqId, preview, text}，preview 复用预览映射', () => {
  var q = quoteOf(refMsg({ rawMsg: { contentType: 0, seqId: '123' }, content: '原消息内容' }, '回复正文'));
  assert.equal(q.seqId, '123');
  assert.equal(q.preview, '原消息内容');
  assert.equal(q.text, '回复正文');
});

test('quoteOf：originMsg 缺失降级不弃疗（锚点/摘要置空，正文保留）', () => {
  var q = quoteOf(refMsg(null, '回复正文'));
  assert.equal(q.seqId, '');
  assert.equal(q.preview, '');
  assert.equal(q.text, '回复正文');
});

test('quoteOf：非 type 12 / 脏输入返回 null 不抛错', () => {
  assert.equal(quoteOf({ text: '普通文本' }), null);
  assert.equal(quoteOf(cardMsg(SAMPLE_CARD)), null);
  assert.equal(quoteOf(null), null);
  var poisoned = { rawMsg: { contentType: 12 }, get originMsg() { throw new Error('boom'); }, text: 'x' };
  assert.doesNotThrow(() => quoteOf(poisoned));
});

test('quoteExtraOf：extra 里翻出 acsvQuote，正文取结构化数据而非 wire 文本', () => {
  var q = quoteExtraOf(extraMsg({ acsvQuote: { seqId: '7', preview: '摘要', text: '真实正文' } }));
  assert.equal(q.seqId, '7');
  assert.equal(q.preview, '摘要');
  assert.equal(q.text, '真实正文'); // wire 上的 m.text 是可读拼接文本，不采用
});

test('quoteExtraOf：无 extra / 坏 JSON / 载荷不合规 / 非 type 0 一律 null', () => {
  assert.equal(quoteExtraOf({ rawMsg: { contentType: 0 } }), null);
  assert.equal(quoteExtraOf({ rawMsg: { contentType: 0, extra: new TextEncoder().encode('{oops').buffer } }), null);
  assert.equal(quoteExtraOf(extraMsg({ other: 1 })), null);
  assert.equal(quoteExtraOf(extraMsg({ acsvQuote: { preview: '没正文' } })), null);
  assert.equal(quoteExtraOf(extraMsg({ acsvQuote: { seqId: '1', text: 'x' } }, 12)), null);
  assert.equal(quoteExtraOf(null), null);
});

test('previewOfMessage：引用消息（两通道）出「[引用] 回复正文」，优先于分享/链接分支', () => {
  assert.equal(previewOfMessage(refMsg({ rawMsg: { contentType: 0, seqId: '1' }, content: '原' }, '回复内容')),
    '[引用] 回复内容');
  assert.equal(previewOfMessage(extraMsg({ acsvQuote: { seqId: '', preview: '', text: '回复内容' } })),
    '[引用] 回复内容');
  // 回复正文里带 AcFun 链接仍归引用分支，不出 [分享]
  assert.ok(previewOfMessage(refMsg({ rawMsg: { contentType: 0, seqId: '1' }, content: '原' },
    '看 https://www.acfun.cn/v/ac1234')).startsWith('[引用] '));
});

// ---------- extra 通道 wire 拼接与原生页去重（0.9.42） ----------
test('quoteWireText：发送侧拼接格式的唯一定义处；preview 缺省「原消息」', () => {
  assert.equal(quoteWireText('摘要', '回复'), '[引用] 摘要\n回复');
  assert.equal(quoteWireText('', '回复'), '[引用] 原消息\n回复');
  assert.equal(quoteWireText(null, '回复'), '[引用] 原消息\n回复');
});

test('quoteWireTrimLen：恰为发送侧拼接形态时返回剥离长度（\\n 保留/<br> 丢失/空白折叠三形态）', () => {
  var q = { preview: '红红火火恍恍惚惚', text: '111' };
  var head = '[引用] 红红火火恍恍惚惚';
  assert.equal(quoteWireTrimLen(head + '\n111', q), head.length + 1);      // 原生保留 \n（文本节点原样）
  assert.equal(quoteWireTrimLen(head + '111', q), head.length);            // 换行渲染成 <br>（不产生文本）
  assert.equal(quoteWireTrimLen(head + ' 111', q), head.length + 1);       // 换行折叠成空格
  assert.equal(quoteWireTrimLen(head + '\u00a0111', q), head.length + 1);  // 折叠成 nbsp
  // preview 缺省：发送侧拼的就是「原消息」
  assert.equal(quoteWireTrimLen('[引用] 原消息\n回复', { preview: '', text: '回复' }), '[引用] 原消息'.length + 1);
  // 正文含正则特殊字符照常命中（实现不走正则）
  assert.equal(quoteWireTrimLen('[引用] a(b)\nc*d', { preview: 'a(b)', text: 'c*d' }), '[引用] a(b)'.length + 1);
});

test('quoteWireTrimLen：形态不匹配一律 0（只补条不动正文的兜底门槛）', () => {
  var q = { preview: '摘要', text: '回复' };
  assert.equal(quoteWireTrimLen('[引用] 另一条消息\n回复', q), 0);  // preview 不符
  assert.equal(quoteWireTrimLen('[引用] 摘要\n别的正文', q), 0);   // 余部 ≠ q.text
  assert.equal(quoteWireTrimLen('前缀 [引用] 摘要\n回复', q), 0);  // 拼接不在开头
  assert.equal(quoteWireTrimLen('[引用] 摘要', q), 0);             // 只有前缀没有正文
  // preview 与原生正文截断不一致（type 12 等来源 preview 是再映射摘要）不硬剥
  var long = '这是一条特别长的原消息超过摘要上限';
  assert.equal(quoteWireTrimLen('[引用] ' + long + '\n回复', { preview: long.slice(0, 5), text: '回复' }), 0);
});

test('quoteWireTrimLen：脏输入容错不抛错', () => {
  assert.equal(quoteWireTrimLen(null, { preview: 'a', text: 'b' }), 0);
  assert.equal(quoteWireTrimLen('[引用] a\nb', null), 0);
  assert.equal(quoteWireTrimLen(undefined, undefined), 0);
});

// ---------- previewOfMessage ----------
test('previewOfMessage：卡片 / 分享 / 站内链接 / 纯文本各走各的分支', () => {
  assert.equal(previewOfMessage(cardMsg(SAMPLE_CARD)), '[作品卡片] 标题');
  assert.equal(previewOfMessage({ text: '看这个 https://www.acfun.cn/v/ac1234 再看看' }),
    '[分享] 看这个');
  // acfun.cn 站内链接但不匹配 /v/acN（如番剧页）→ [视频] 分支
  assert.equal(previewOfMessage({ text: 'https://www.acfun.cn/bangumi/aa' }),
    '[视频] 分享了一个视频');
  var long = new Array(50).join('字');
  assert.equal(previewOfMessage({ text: long }), long.slice(0, 40));
});

test('previewOfMessage：脏输入不抛错（getter 抛异常也走降级）', () => {
  var poisoned = { get rawMsg() { throw new Error('boom'); } };
  assert.doesNotThrow(() => previewOfMessage(poisoned));
  assert.equal(previewOfMessage(poisoned), '[暂不支持查看的消息，请前往客户端查看]');
  assert.equal(previewOfMessage(null), '[暂不支持查看的消息，请前往客户端查看]');
});

// ---------- isCommentShare（0.9.51 评论转发识别） ----------
test('isCommentShare：发送侧 wire 首行「@作者：」命中，内容含换行/URL 不影响', () => {
  assert.ok(isCommentShare('@森崎：好心的先生太太，给我一点🍌吧！'));
  assert.ok(isCommentShare('@森崎：第一行\n第二行\nhttps://www.acfun.cn/v/ac123'));
  assert.ok(isCommentShare('@a：')); // 空内容也算（转发空评论的极端形态）
});

test('isCommentShare：手打分享/纯标题/邮箱开头不误判', () => {
  assert.ok(!isCommentShare('这就是你妹控的理由吗？'));
  assert.ok(!isCommentShare('看这个 https://www.acfun.cn/v/ac123'));
  assert.ok(!isCommentShare('联系我 test@example.com：'));
  assert.ok(!isCommentShare(''));
  assert.ok(!isCommentShare(null));
});

test('isCommentShare：全角冒号取第一个——名字含冒号只歪归属拆分不歪识别（整行进引用块，可读性无损）', () => {
  assert.ok(isCommentShare('@带：冒号的名字：内容'));
  assert.ok(!isCommentShare('@' + '长'.repeat(41) + '：内容'));
  assert.ok(isCommentShare('@' + '名'.repeat(40) + '：内容'));
});

test('previewOfMessage：评论转发预览走 [评论] 前缀', () => {
  assert.equal(
    previewOfMessage({ text: '@森崎：好心的先生太太\nhttps://www.acfun.cn/v/ac123' }),
    '[评论] @森崎：好心的先生太太');
});

// ---------- 0.9.52 评论转发的 URL 锚点与 extra 载荷 ----------
test('parseShare：#ncid 片段保留进 url（卡片/复制链接可定位楼层），尾标点照剥', () => {
  var s = parseShare('@森崎：看这条\nhttps://www.acfun.cn/v/ac48768753#ncid=807213320');
  assert.equal(s.acId, '48768753');
  assert.equal(s.url, 'https://www.acfun.cn/v/ac48768753#ncid=807213320');
  var s2 = parseShare('看 https://www.acfun.cn/v/ac123?a=1#ncid=456。');
  assert.equal(s2.url, 'https://www.acfun.cn/v/ac123?a=1#ncid=456');
});

test('cmtShareOf：extra 载荷往返；被剥/非文本类型降级 null', () => {
  var payload = { ncid: '807213320', content: '[emot=acfun,1/]赞[at uid=7]@甲[/at]' };
  var m = { rawMsg: { contentType: 0, text: 'x', extra: new TextEncoder().encode(JSON.stringify({ acsvCmt: payload })).buffer } };
  var got = cmtShareOf(m);
  assert.equal(got.ncid, '807213320');
  assert.equal(got.content, payload.content);
  assert.equal(cmtShareOf({ rawMsg: { contentType: 0, text: 'x' } }), null); // extra 被剥
  assert.equal(cmtShareOf(cardMsg(SAMPLE_CARD)), null); // 非文本类型
  assert.equal(cmtShareOf(null), null);
});

// ---------- commentShareWire / extra key 常量（0.9.59 收口） ----------
test('commentShareWire：组装产物过检测且作者可还原（wire 契约单源往返）', () => {
  var w = commentShareWire('森崎', '任意[emot=acfun,1/]正文');
  assert.ok(isCommentShare(w), 'wire 必须过 isCommentShare');
  assert.equal(commentShareAuthor(w), '森崎');
  assert.ok(w.endsWith('：任意[emot=acfun,1/]正文'));
  assert.equal(commentShareWire('', ''), '@：');
  assert.equal(commentShareWire(null, null), '@：');
});

test('extra key 常量钉死字面值（发送/解析两端跨文件共用）', () => {
  assert.equal(QUOTE_EXTRA_KEY, 'acsvQuote');
  assert.equal(CMT_EXTRA_KEY, 'acsvCmt');
  // cmtShareOf 用常量读 key：构造侧同样用常量写，往返不丢
  var m = { rawMsg: { contentType: 0, text: 'x', extra: new TextEncoder().encode(JSON.stringify({ [CMT_EXTRA_KEY]: { ncid: '9', content: 'c' } })).buffer } };
  var got = cmtShareOf(m);
  assert.equal(got.ncid, '9');
  assert.equal(got.content, 'c');
});
