import { CFG } from './cfg.js';
import { el, fmt, toast } from './ui.js';
import { root, releaseDrawer } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { imgInto } from './imgload.js';
import { ubbTextOf, quoteBlockOf, momentCellOf } from './views.js';
import { GLYPHS } from './imicons.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { openImageViewer } from './imgview.js';
import { likePi, throwBananaPi } from './interact.js';
import { ensureEmotionMap } from './emoticon.js';
import { testHook } from './dbg.js';

// ---------- 动态详情面板（0.9.96，路线图 Phase 4.1/4.2 + 3.2 剩余收尾） ----------
// 形态（用户裁决「详情展开优先」）：点动态卡原地展开居中 overlay——正文全文 + 互动栏写链
// （赞/蕉）+ 评论区（comments.js 管线复用，stype=4；R3 已闭合）+ 底部输入条（表情面板
// mountEmotButton 直接落位，4.2）。
// 【intake 有意偏离登记】intake 写「el() + Shadow DOM」，本面板用**光 DOM**：评论区/输入条/
// 表情面板的样式全在全局 styles.js（.acsv-citem/.acsv-emotpanel 家族），进影子根=复制 CSS
// 造漂移源（单源理念重于 intake 字面）；光 DOM 先例=评论抽屉/imgview/release 整族。
// 与评论抽屉共用 overlay 层位 id 'comments' + claimDrawer 槽（同槽互斥，防 commentState
// 被两份宿主互踩）；modal:true 的按键豁免（输入框打字）在 overlay.js/input.js 各有一半。
// 乐观更新不抽公共件：rail（slide DOM 同步）/comments（列表插入）/本面板（互动栏计数）
// 三处语境各异，强行抽=预留抽象层（YAGNI 守门）——此裁决与计划在案，勿当"重复"归一。

var panelEl = null; // 背板单例（含 .acsv-mdetail-panel）；host 三元组挂在闭包里随面板生死

export function closeMomentDetail() {
  if (!panelEl) return;
  var p = panelEl;
  panelEl = null;
  p.remove();
  closeCommentsHost(); // 管线宿主复位（宿主 DOM 已随面板拆除，残留引用会读到死节点）
  releaseDrawer('comments');
  overlayClose('comments'); // Esc 路径已出栈时空转；显式关闭由此同步栈
}

// 媒体块构建器（dispatcher 注入件，0.9.102 收口）：面板宫格=模态栅格类名 + 共用
// views.momentCellOf 的格子挂法（大图挂法单源）；单图=面板件（big 拿不到就静展示）
function panelGrid(pi) {
  var grid = el('div', 'acsv-mdetail-imgs');
  grid.dataset.n = String(pi.imgs.length);
  pi.imgs.forEach(function (im) { grid.appendChild(momentCellOf('acsv-mdetail-imgcell', im)); });
  return grid;
}
function panelSingle(pi, im0) {
  var im = el('div', 'acsv-mdetail-img');
  imgInto(im, pi.cover, 'grid');
  var big = im0 && (im0.big || im0.url);
  if (big) {
    im._big = big;
    im.classList.add('onbig');
    im.addEventListener('click', function (ev) {
      ev.stopPropagation();
      openImageViewer(im._big);
    });
  }
  return im;
}

// pi = follow 契约条目（ct='moment'）；正文/计数用列表载荷——text 全文性已实测
// （api-research §4.7：list 与 detail 逐字节相等），moment/detail 端点不接（其 moment 内
// commentCount/bananaCount 实测不可信，计数只有 feed 顶层是准的）
export function openMomentDetail(pi) {
  closeMomentDetail(); // open 先 close（幂等双保险，overlayOpen 同款惯例）
  if (!root || !pi || pi.ct !== 'moment' || !pi.momentId) return;

  var backdrop = el('div', 'acsv-mdetail');
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) closeMomentDetail(); // 背板点击关（settings 同款）
  });
  var panel = el('div', 'acsv-mdetail-panel');
  // ✕ 浮于背板右上（XHS 同款：卡片外圆形钮；Esc/背板点击语义不变）
  var x = el('button', 'acsv-mdetail-x', '✕');
  x.title = '关闭';
  x.addEventListener('click', closeMomentDetail);
  backdrop.appendChild(x);

  // 布局判定（0.9.103 用户裁决「按内容型换布局」）：有自有图（单图/多图、非转发）→ 小红书式
  // 两栏（左媒体/右内容，XHS 904×672 实测比例）；无图/纯文字/转发 → 单栏收窄（转发卡自带源
  // 缩略图，左区再放源封面会重复）
  var hasMedia = !pi.repost && ((pi.imgs && pi.imgs.length) || pi.cover);
  var side = null; // 右栏（两栏态）；管线 host.el 指向它——输入条 append 到 h.el 末尾=贴 side 底
  if (hasMedia) {
    panel.classList.add('acsv-mdetail-split');
    var mediaCol = el('div', 'acsv-mdetail-media');
    mediaCol.appendChild(pi.imgs && pi.imgs.length > 1 ? panelGrid(pi) : panelSingle(pi));
    panel.appendChild(mediaCol);
    side = el('div', 'acsv-mdetail-side');
    panel.appendChild(side);
  }
  var hostEl = side || panel;

  // 头部：作者行（XHS 尺寸：头像 40 圆、名字 16px——gmom 类名复用处的显式覆盖规则在 styles，
  // 类名复用=连作用域复用，0.9.96 教训）。✕ 已移至背板浮层，不再占头部
  var head = el('div', 'acsv-gmom-head acsv-mdetail-head');
  var av = el('span', 'acsv-gmom-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  head.appendChild(el('span', 'acsv-gmom-name', pi.up && pi.up.name ? '@' + pi.up.name : ''));
  head.appendChild(el('span', 'acsv-gmom-time', pi.dateText || ''));
  hostEl.appendChild(head);

  // 可滚动体 = 评论管线的 list：正文 pin 在其首（管线清列表重挂，见 comments.resetList），
  // 评论区自然衔接在正文之后——一滚到底的整页阅读，不做双滚动区
  var list = el('div', 'acsv-mdetail-list');
  list.addEventListener('click', commentListClick); // 点赞/回复/转发/配图大图委托（slide.js 同款挂法）
  var pin = el('div', 'acsv-cpin');
  var textSlot = el('div', 'acsv-mdetail-textwrap');
  pin.appendChild(textSlot);
  // 表情真图渲染依赖 EmotionMap（loadComments 会顺带 ensure），这里等 map 就绪再插正文——
  // 否则冷启动首开正文表情全是 [表情] 占位；map 失败也照渲染（ubb 降级为明文占位）
  ensureEmotionMap().then(function () {
    if (!panelEl) return;
    textSlot.innerHTML = '';
    textSlot.appendChild(ubbTextOf(pi.text, 'acsv-mdetail-text'));
  }, function () {
    if (!panelEl) return;
    textSlot.appendChild(ubbTextOf(pi.text, 'acsv-mdetail-text'));
  });
  // 转发卡（0.9.103）：两栏态媒体在左栏；单栏态只剩转发卡（quoteBlockOf 原生形制，@源UP+源卡）。
  // 互动栏留内容底部（0.9.103 用户裁决：赞/蕉/评论不搬进底栏）
  if (!hasMedia && pi.repost) pin.appendChild(quoteBlockOf(pi.repost));
  pin.appendChild(actionBar(pi));
  // 评论区标题 = 管线的 title（insertLocalComment/renderComments 会重写计数；titleFmt=XHS 文案）
  var cmthead = el('div', 'acsv-mdetail-cmthead');
  var title = el('span', 'acsv-mdetail-cmt', '评论');
  cmthead.appendChild(title);
  pin.appendChild(cmthead);
  list.appendChild(pin);
  hostEl.appendChild(list);

  backdrop.appendChild(panel);
  root.appendChild(backdrop);
  backdrop._momentId = pi.momentId;
  panelEl = backdrop;

  // 层位与槽位：与评论抽屉共用 overlay id 'comments'（同 id 幂等先收旧层——抽屉开着会经
  // closeComments 收掉）+ claimDrawer 槽；modal:true（背板模态，Esc 接栈）
  overlayOpen({ id: 'comments', modal: true, close: closeMomentDetail });
  // 评论区管线灌进宿主：host.el 两栏态=右栏（输入条 append 到 h.el 末尾=贴右栏底）、单栏态=
  // 面板；stype=4（动态评论，R3 闭合）+ kind='home'（开放互动）；titleFmt（0.9.103）=XHS
  // 文案「共 N 条评论」；shareUrl 用官方动态页落点（评论转发的 #ncid 锚点在原页原生定位楼层）
  openCommentsHost({
    el: hostEl, title: title, list: list, close: closeMomentDetail, pin: pin,
    titleFmt: function (n) { return '共 ' + fmt(n) + ' 条评论'; }
  }, pi.momentId, 4, pi.href, 'home');
}

// 互动栏（赞/蕉写链 + 评论数展示）。乐观更新+回滚照 rail.js:154-177 范式；投蕉 count=1
//（广场同款）且不可逆——失败仅 toast 不回滚（没有"取消投蕉"可回滚到，注释防误修成回滚）
function actionBar(pi) {
  var bar = el('div', 'acsv-mdetail-actions');

  var like = el('span', 'acsv-mdl-like' + (pi.liked ? ' on' : ''));
  var likeG = el('i', 'acsvg-glyph', pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike);
  var likeN = el('span', null, fmt(pi.like));
  like.appendChild(likeG);
  like.appendChild(likeN);
  like.title = '点赞动态';
  like.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (pi.likeBusy) return;
    pi.likeBusy = true;
    var on = !pi.liked;
    pi.liked = on;
    pi.like += on ? 1 : -1;
    like.classList.toggle('on', on);
    likeG.textContent = on ? GLYPHS.feedLikeFill : GLYPHS.feedLike;
    likeN.textContent = fmt(pi.like);
    likePi(pi, on).then(function (ok) { // pi 级写路径单源（interact，0.9.102 收口）
      pi.likeBusy = false;
      if (ok) return;
      pi.liked = !on; // 失败回滚（乐观值全部退回，rail 同款）
      pi.like += on ? -1 : 1;
      like.classList.toggle('on', pi.liked);
      likeG.textContent = pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike;
      likeN.textContent = fmt(pi.like);
      toast('操作失败（未登录？）');
    });
  });
  bar.appendChild(like);

  var banana = el('span', 'acsv-mdl-ban' + (pi.thrown ? ' on' : ''));
  var banN = el('span', null, fmt(pi.banana));
  // 蕉图标=原生四件套 E62A/E65F（0.9.101 采样复核；此前误用竖刷侧栏的 GLYPHS.banana E2EA）
  var banG = el('i', 'acsvg-glyph', pi.thrown ? GLYPHS.feedBananaFill : GLYPHS.feedBanana);
  banana.appendChild(banG);
  banana.appendChild(banN);
  banana.title = pi.thrown ? '已投蕉' : '投蕉';
  banana.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (pi.banBusy || pi.thrown) return;
    pi.banBusy = true;
    throwBananaPi(pi).then(function (ok) { // pi 级写路径单源（interact，0.9.102 收口）
      pi.banBusy = false;
      if (!ok) { toast('投蕉失败' + (pi.thrown ? '' : '（今日已投过/未登录？）')); return; }
      pi.thrown = true; // 投蕉不可逆：只进不退（官方无取消端点），锁死防重复投
      pi.banana += 1;
      banana.classList.add('on');
      banG.textContent = GLYPHS.feedBananaFill; // 点亮换实心（原生 path/fill 同款）
      banN.textContent = fmt(pi.banana);
      banana.title = '已投蕉';
      toast('投蕉成功');
    });
  });
  bar.appendChild(banana);

  var cmt = el('span', 'acsv-mdl-cmt');
  cmt.appendChild(el('i', 'acsvg-glyph', GLYPHS.feedComment));
  cmt.appendChild(el('span', null, fmt(pi.comment)));
  bar.appendChild(cmt);
  return bar;
}

// debug 构建测试钩子：harness 断言面板开合与当前动态 id（结构断言走 DOM 类名）
testHook('momentdetail', function () {
  return { open: !!panelEl, momentId: panelEl ? panelEl._momentId : 0 };
});
