// ---------- 私信卡片装配（0.9.80）：抽屉（暗色）与原生私信页（浅色 Shadow）两套皮肤共用 ----------
// 此前两份逐行同构的装配代码（改一处漏一处，0.9.77 评审点名的重复面）。这里共享**结构与语义**：
//   视频卡 = 封面 + 计数条（播放/评论/时长）+ 两行标题；评论卡 = 引用块 + 来源小条
//   时序   = 封面"load 才放出、error 隐藏"（防裂图闪与永久空窗）、[img] 配图点击看大图
//            （整卡是 <a>，必须 preventDefault）、dougaCard 回包原位 patch
// 皮肤（skin）只声明命名与图标画法——布局与视觉仍在各自 CSS（暗/浅两套），皮肤差异是事实，
// 不当重复消灭。拼装差异（标签名/类名/隐藏机制）全部由 skin 承载，装配逻辑只有这一份
import { el, esc } from './ui.js';
import { fmtDur } from './immsg.js';
import { emotify } from './emoticon.js';
import { openImageViewer } from './imgview.js';

// skin 契约（消费方各自声明；见 imdrawer/imnative 的 SKIN）：
//   tag          卡片内块级标签名（抽屉 div / 原生页 span）
//   root/coverbox/cover/bar/view/cmt/dur/title   视频卡类名（view/cmt 允许 ''）
//   rootMine     己方卡追加类（原生页不分己方/对方，给 ''）
//   cshare/quote/src/srct/srcimg                 评论卡类名
//   coverHidden  'visibility' | 'display' —— 封面隐藏机制（沿用各皮肤 0.9.51/0.9.57 真机验收形态）
//   icon(kind)   计数图标元素（kind: 'play' | 'comment'）
function hideCover(img, skin) {
  if (skin.coverHidden === 'display') img.style.display = 'none';
  else img.style.visibility = 'hidden';
}
function showCover(img, skin) {
  if (skin.coverHidden === 'display') img.style.display = '';
  else img.style.visibility = '';
}

// 视频卡（10001 协议卡与脚本分享卡共用骨架）：r = { href?, coverUrl?, viewCountShow?,
// commentCountShow?, durationSec?, title? }。href 给出则整卡可点（新标签打开）。
// 标题元素恒建（空标题 display:none）——骨架先上、enrich 回包原位补全（0.9.80 修：此前
// 无标题链的分享消息，enrich 回来的标题因元素不存在被丢弃）
export function vcard(skin, r, mine) {
  var a = el(r.href ? 'a' : 'div', skin.root + (mine && skin.rootMine ? ' ' + skin.rootMine : ''));
  if (r.href) {
    a.href = r.href;
    a.target = '_blank';
    a.rel = 'noopener';
  }
  var box = el(skin.tag, skin.coverbox);
  var cover = el('img', skin.cover);
  cover.alt = '';
  cover.referrerPolicy = 'no-referrer';
  // load 才放出 / error 隐藏（两皮肤统一，0.9.80）：先挂监听再设 src——enrich 迟到补 src
  // （骨架无封面）与裂图两个方向都由这一对监听收口，不靠 patch 手动清隐藏
  cover.addEventListener('load', function () { showCover(cover, skin); });
  cover.addEventListener('error', function () { hideCover(cover, skin); });
  if (r.coverUrl) cover.src = r.coverUrl;
  else hideCover(cover, skin); // 无封面不设 src（空 src 会打页面自身）——占位隐藏
  box.appendChild(cover);
  var bar = el(skin.tag, skin.bar);
  bar.appendChild(skin.icon('play'));
  var view = el(skin.tag, skin.view, r.viewCountShow || '');
  bar.appendChild(view);
  bar.appendChild(skin.icon('comment'));
  var cmt = el(skin.tag, skin.cmt, r.commentCountShow || '');
  bar.appendChild(cmt);
  var dur = el(skin.tag, skin.dur, r.durationSec ? fmtDur(r.durationSec) : '');
  if (!r.durationSec) dur.style.display = 'none';
  bar.appendChild(dur);
  box.appendChild(bar);
  a.appendChild(box);
  var title = el(skin.tag, skin.title, r.title || '');
  if (!r.title) title.style.display = 'none';
  a.appendChild(title);
  a.addEventListener('click', function (ev) { ev.stopPropagation(); });
  return { el: a, cover: cover, view: view, cmt: cmt, dur: dur, title: title };
}

// dougaCard enrich 原位补全（视频卡）：接口字段在位才覆盖——骨架里的消息内标题兜底不动，
// 缺字段不动对应元素（不把"没这个数"写成 0）
export function patchVcard(parts, c) {
  if (parts.cover && c.cover) parts.cover.src = c.cover;
  if (parts.view && c.view != null) parts.view.textContent = c.view;
  if (parts.cmt && c.comment != null) parts.cmt.textContent = c.comment;
  if (parts.dur && c.durationSec) {
    parts.dur.textContent = fmtDur(c.durationSec);
    parts.dur.style.display = '';
  }
  if (parts.title && c.title) {
    parts.title.textContent = c.title;
    parts.title.style.display = '';
  }
}

// 评论转发卡（0.9.51）：评论原文是主视觉——html（extra 载荷 ubbQuoteHtml 富渲染）优先，
// 缺则 wire 文本 emotify（表情码仍真图）；来源作品收底部小条，封面 load 才放出
// （enrich 失败也保持可读可点：整卡 href=作品链接，小条先出占位文案）
export function cshareCard(skin, spec, mine) {
  var a = el(spec.href ? 'a' : 'div', skin.cshare + (mine && skin.rootMine ? ' ' + skin.rootMine : ''));
  if (spec.href) {
    a.href = spec.href;
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.addEventListener('click', function (ev) { ev.stopPropagation(); });
  var quote = el(skin.tag, skin.quote);
  if (spec.html) {
    quote.innerHTML = spec.html;
    // [img] 配图点击看大图：整卡是 <a>，preventDefault 防跳作品页
    quote.addEventListener('click', function (ev) {
      var im = ev.target && ev.target.closest ? ev.target.closest('.ubb-imgc') : null;
      if (!im) return;
      ev.preventDefault();
      ev.stopPropagation();
      openImageViewer(im.getAttribute('src') || '');
    });
  } else {
    // wire 文本兜底：esc + emotify 出真表情（0.9.53 起 wire 携原始码）；不走 linkify
    //——quote 在卡片 <a> 内，禁嵌套 a
    quote.innerHTML = emotify(esc(spec.text || ''));
  }
  a.appendChild(quote);
  var src = el(skin.tag, skin.src);
  var cover = el('img', skin.srcimg);
  cover.alt = '';
  cover.referrerPolicy = 'no-referrer';
  hideCover(cover, skin);
  cover.addEventListener('load', function () { showCover(cover, skin); });
  cover.addEventListener('error', function () { hideCover(cover, skin); });
  src.appendChild(cover);
  var srct = el(skin.tag, skin.srct, '查看来源作品');
  src.appendChild(srct);
  a.appendChild(src);
  return { el: a, quote: quote, cover: cover, srct: srct };
}

// 评论卡 enrich：只动来源小条，评论正文永不碰（0.9.51 教训：正文一旦被视频标题覆盖，
// 评论整个消失——同一个坑不挖第二次）
export function patchCshare(parts, c) {
  if (parts.cover && c.cover) parts.cover.src = c.cover;
  if (parts.srct && c.title) parts.srct.textContent = c.title;
}
