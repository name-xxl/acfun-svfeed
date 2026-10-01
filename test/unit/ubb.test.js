// ubb.js（评论 UBB 渲染）单元测试：Node 内置 test 运行器，零依赖。
// 管线契约：先 esc 全文再白名单放行——注入要么被转义成死文本、要么整标签不命中按字面
// 显示；任何输入不允许抛错。规则语义对齐动态广场项目（acfun-moment-plaza parser.js）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 依赖链 ubb→ui→cfg→dbg 在模块顶层读 window（dbg.js），且 dbg 顶层读构建期 define
// __ACSV_DEBUG__——Node 直采源码时两个都要先垫再动态 import
globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { renderCommentHtml, ubbPlainText } = await import('../../src/ubb.js');

// ---------- [at] @ 提及 ----------
test('at：线上原文出用户主页链接，@ 前缀保留', () => {
  assert.equal(
    renderCommentHtml('[at uid=77768876]@zeyuzeng.***[/at]'),
    '<a class="ubb-at" href="https://www.acfun.cn/u/77768876" target="_blank" rel="noopener">@zeyuzeng.***</a>'
  );
});

test('at：标签内不带 @ 也统一补前缀；uid 进 href', () => {
  assert.equal(
    renderCommentHtml('[at uid=42]昵称[/at]'),
    '<a class="ubb-at" href="https://www.acfun.cn/u/42" target="_blank" rel="noopener">@昵称</a>'
  );
});

test('at：昵称注入不逃逸——引号/尖括号已被全文 esc，落在文本位', () => {
  var h = renderCommentHtml('[at uid=1]@" onmouseover="alert(1)[/at]');
  assert.ok(!h.includes('onmouseover="alert'), h);
  assert.ok(h.includes('@&quot; onmouseover=&quot;alert(1)</a>'), h);
  var h2 = renderCommentHtml('[at uid=1]<script>alert(1)</script>[/at]');
  assert.ok(!h2.includes('<script'), h2);
});

test('at：未闭合/缺 uid 按字面显示（与未知 UBB 一致）', () => {
  var open = '[at uid=1]没有尾';
  assert.equal(renderCommentHtml(open), open);
  var bad = '[at]@无uid[/at]';
  assert.equal(renderCommentHtml(bad), bad);
});

// ---------- [resource] 作品引用 ----------
test('resource：线上原文（type=2 视频）出 /v/ 链接，icon 吞掉、标题保留', () => {
  assert.equal(
    renderCommentHtml('[resource id=43633455 type=2 icon=https://ali-imgs.acfun.cn/udata/pkg/acfun/icon_comment_pc_vid_18_3.png]要被这空姐笑死哈哈哈5.0[/resource]'),
    '<a class="ubb-res" href="https://www.acfun.cn/v/ac43633455" target="_blank" rel="noopener">要被这空姐笑死哈哈哈5.0</a>'
  );
});

test('resource：type=3 及未知 type 按文章走 /a/', () => {
  assert.ok(renderCommentHtml('[resource id=5 type=3 icon=x]文[/resource]')
    .includes('href="https://www.acfun.cn/a/ac5"'));
  assert.ok(renderCommentHtml('[resource id=6 type=10 icon=x]他[/resource]')
    .includes('href="https://www.acfun.cn/a/ac6"'));
});

test('resource：icon 值里恰有 ac 数字形态不串扰，id 以捕获组为准', () => {
  var h = renderCommentHtml('[resource id=99 type=2 icon=https://ali-imgs.acfun.cn/udata/pkg/acfun/ac43633455.png]标题[/resource]');
  assert.equal(h.match(/ubb-res/g).length, 1);
  assert.ok(h.includes('href="https://www.acfun.cn/v/ac99"'), h);
});

test('resource：内层先行规则生成的标签被剥掉，单链接防嵌套', () => {
  var h = renderCommentHtml('[resource id=1 type=2 icon=x][img=图]https://imgs.aixifan.com/a.png[/img]标题[/resource]');
  assert.ok(!h.includes('<img'), h);
  assert.ok(h.endsWith('>标题</a>'), h);
});

test('resource：未闭合按字面显示', () => {
  var open = '[resource id=1 type=2]没有尾';
  assert.equal(renderCommentHtml(open), open);
});

test('resource：多行连续引用各自成链，换行保留（pre-wrap 展示）', () => {
  var raw = ['5.0 [resource id=5 type=2 icon=i]标题5[/resource]',
    '4.0 [resource id=4 type=2 icon=i]标题4[/resource]'].join('\n');
  var h = renderCommentHtml(raw);
  assert.equal(h.match(/ubb-res/g).length, 2);
  assert.ok(h.includes('\n'));
});

// ---------- [img] 图床白名单 ----------
test('img：ksc2 预览域裸路径与带签名参数的 URL 都渲染图片', () => {
  var bare = renderCommentHtml('[img]https://preview.ndcsk.com/ksc2/AbCdEf-123_456.png[/img]');
  assert.ok(bare.includes('<img class="ubb-imgc" src="https://preview.ndcsk.com/ksc2/AbCdEf-123_456.png"'), bare);
  var signed = renderCommentHtml('[img=图片]https://preview.ndcsk.com/ksc2/AbCdEf.png?pkey=AA&imgId=BB[/img]');
  assert.ok(signed.includes('<img class="ubb-imgc" src="https://preview.ndcsk.com/ksc2/AbCdEf.png?pkey=AA&amp;imgId=BB"'), signed);
});

test('img：ksc2 分支 host+path 双锚定——ksc2 伪装进子域不渲染', () => {
  var fake = 'https://preview.ndcsk.com.evil.com/ksc2/x.png';
  assert.equal(renderCommentHtml('[img]' + fake + '[/img]'), fake);
  var fake2 = 'https://preview.ndcsk.com/ksc2.evil.com/x.png';
  assert.equal(renderCommentHtml('[img]' + fake2 + '[/img]'), fake2);
});

// ---------- 既有规则回归 ----------
test('emot：Node 下 EmotionMap 为空，主包表情降级 [表情]；img 过白名单；color 包裹', () => {
  assert.equal(renderCommentHtml('[emot=acfun,2797/]'), '[表情]');
  assert.equal(renderCommentHtml('[img]https://evil.example/x.png[/img]'),
    'https://evil.example/x.png'); // 非白名单图床按字面回落为 URL 文本
  assert.ok(renderCommentHtml('[img]https://imgs.aixifan.com/x.png[/img]')
    .includes('<img class="ubb-imgc" src="https://imgs.aixifan.com/x.png"'));
  assert.equal(renderCommentHtml('[color=#ff0000]红[/color]'),
    '<span style="color:#ff0000">红</span>');
});

// ---------- 组合与容错 ----------
test('组合：resource 内嵌表情降级文本随标题保留；at 与正文混排', () => {
  var h = renderCommentHtml('[at uid=7]@甲[/at] [resource id=8 type=2 icon=i][emot=acfun,1/]赞[/resource]');
  assert.ok(h.includes('>@甲</a>'), h);
  assert.ok(h.includes('>[表情]赞</a>'), h); // 表情在 Node 下降级为 [表情] 文本，进标题
  assert.equal(renderCommentHtml(''), '');
  assert.equal(renderCommentHtml(null), '');
  assert.equal(renderCommentHtml(undefined), '');
});

// ---------- ubbPlainText（0.9.50 评论转发私信的纯文本投影） ----------
test('plain：at 出 @昵称（带不带 @ 前缀均可），uid 不残留', () => {
  assert.equal(ubbPlainText('[at uid=7]@甲[/at]'), '@甲');
  assert.equal(ubbPlainText('[at uid=7]乙[/at]'), '@乙');
  assert.ok(!ubbPlainText('[at uid=7]@甲[/at]').includes('uid'), 'uid 应被吃掉');
});

test('plain：emot 统一转 [表情]，img 两种形态转 [图片]', () => {
  assert.equal(ubbPlainText('赞[emot=acfun,2797/]'), '赞[表情]');
  assert.equal(ubbPlainText('[emot=ts,1/]'), '[表情]');
  assert.equal(ubbPlainText('看[img=图片]https://imgs.aixifan.com/a.png?pkey=1[/img]'),
    '看[图片]');
  assert.equal(ubbPlainText('[img]https://preview.ndcsk.com/ksc2/a.png[/img]'), '[图片]');
});

test('plain：color/resource 摘内文，resource 的 icon 属性区不残留', () => {
  assert.equal(ubbPlainText('[color=#ff0000]红[/color]'), '红');
  assert.equal(
    ubbPlainText('[resource id=99 type=2 icon=https://ali-imgs.acfun.cn/x.png]标题[/resource]'),
    '标题');
  assert.ok(!ubbPlainText('[resource id=99 type=2 icon=x]标题[/resource]').includes('icon'));
});

test('plain：color 包 emot/img 时内层先转（处理顺序与渲染侧一致）', () => {
  assert.equal(ubbPlainText('[color=#ff0000][emot=acfun,1/]红[/color]'), '[表情]红');
});

test('plain：未闭合/未知标签按字面保留；无 esc 语义——原始字符原样透传', () => {
  var open = '[at uid=1]没有尾';
  assert.equal(ubbPlainText(open), open);
  assert.equal(ubbPlainText('a<b>&"\'c'), 'a<b>&"\'c');
});

test('plain：组合与空值', () => {
  var raw = '[at uid=5]@丙[/at]：说得好[emot=acfun,1/]，图在此[img]https://imgs.aixifan.com/b.png[/img]';
  assert.equal(ubbPlainText(raw), '@丙：说得好[表情]，图在此[图片]');
  assert.equal(ubbPlainText(''), '');
  assert.equal(ubbPlainText(null), '');
});
