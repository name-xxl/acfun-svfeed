// immsg.js（私信共享解析层）单元测试：Node 内置 test 运行器，零依赖。
// 解析层是零依赖纯函数叶子，这里的用例把它的容错契约钉死——
// 任何输入（包括 null / 抛 getter 的脏对象）都不允许抛错，只允许降级。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  msgContentType, parseCard, parseShare, fmtDur,
  degradeText, msgTextOf, previewOfMessage
} from '../../src/immsg.js';

// contentType 10001 的 content 是 UTF-8 解码即 JSON 的 ArrayBuffer
function cardMsg(cardObj, contentType) {
  var bytes = new TextEncoder().encode(JSON.stringify(cardObj));
  return { rawMsg: { contentType: contentType == null ? 10001 : contentType, content: bytes.buffer } };
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
