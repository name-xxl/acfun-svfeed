// ubb.js（评论 UBB 渲染）单元测试：Node 内置 test 运行器，零依赖。
// 管线契约：先 esc 全文再白名单放行——注入要么被转义成死文本、要么整标签不命中按字面
// 显示；任何输入不允许抛错。规则语义对齐动态广场项目（acfun-moment-plaza parser.js）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 依赖链 ubb→ui→cfg→dbg 在模块顶层读 window（dbg.js），且 dbg 顶层读构建期 define
// __ACSV_DEBUG__——Node 直采源码时两个都要先垫再动态 import
globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { renderCommentHtml } = await import('../../src/ubb.js');

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
