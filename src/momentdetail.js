import { CFG } from './cfg.js';
import { el, fmt } from './ui.js';
import { root, releaseDrawer } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { imgInto } from './imgload.js';
import { ubbTextOf, quoteBlockOf } from './cards.js';
import { ICONS } from './styles.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { openImageViewer } from './imgview.js';
import { openSharePanel } from './sharepanel.js';
import { momentBarOf, momentShareItemOf } from './momentbar.js';
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
// 乐观更新递进史：0.9.96 裁决「不抽公共件」（rail/comments/面板三处语境各异）→ 0.9.102
// 收「pi 级写路径」（interact.likePi/throwBananaPi）→ 0.9.105 收「键定义表+写链编排」
// （momentbar 共享件，行流卡与面板同源、skin 分皮肤）——原裁决的前提（三处各异）对
// 「行流卡 vs 详情面板」这一对已不成立；rail/comments 仍各自独立，边界不变。

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

// 多图轮播（0.9.105 用户裁决「左侧不是宫格，是左右切换+滚轮」；XHS 实测形制 2026-10-04：
// track translate3d 平移 + 箭头 60×60 垂直居中 + 底部居中小点 + **媒体区滚轮逐格切图**
//（XHS 实测 dispatch wheel 后 defaultPrevented=true、页面不滚、wrapper 平移一张））。
// 循环切换；slide 点击开大图（当前图 big）；单图走 panelSingle 保持静态。
function carouselOf(pi) {
  var n = pi.imgs.length;
  var idx = 0;
  var box = el('div', 'acsv-mdcar');
  var track = el('div', 'acsv-mdcar-track');
  var dots = [];
  pi.imgs.forEach(function (im) {
    var slide = el('div', 'acsv-mdcar-slide');
    imgInto(slide, im.url, 'grid');
    slide._big = im.big || im.url;
    slide.addEventListener('click', function (ev) {
      ev.stopPropagation();
      openImageViewer(slide._big);
    });
    track.appendChild(slide);
  });
  box.appendChild(track);
  function go(i) {
    idx = ((i % n) + n) % n; // 循环（XHS swiper loop 同款语义）
    track.style.transform = 'translate3d(' + (-idx * 100) + '%,0,0)';
    dots.forEach(function (d, k) { d.classList.toggle('on', k === idx); });
  }
  var prev = el('button', 'acsv-mdcar-btn prev');
  prev.title = '上一张';
  prev.innerHTML = ICONS.chevLt;
  prev.addEventListener('click', function (ev) { ev.stopPropagation(); go(idx - 1); });
  var next = el('button', 'acsv-mdcar-btn next');
  next.title = '下一张';
  next.innerHTML = ICONS.chevRt;
  next.addEventListener('click', function (ev) { ev.stopPropagation(); go(idx + 1); });
  box.appendChild(prev);
  box.appendChild(next);
  var dotWrap = el('div', 'acsv-mdcar-dots');
  pi.imgs.forEach(function (_, k) {
    var d = el('span', 'acsv-mdcar-dot' + (k === 0 ? ' on' : ''));
    d.addEventListener('click', function (ev) { ev.stopPropagation(); go(k); });
    dotWrap.appendChild(d);
    dots.push(d);
  });
  box.appendChild(dotWrap);
  // 滚轮切图（passive:false 才能 preventDefault；触控板连发节流 260ms≈一滚一张）
  var lock = 0;
  box.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var t = Date.now();
    if (t - lock < 260) return;
    lock = t;
    go(ev.deltaY > 0 ? idx + 1 : idx - 1);
  }, { passive: false });
  go(0);
  return box;
}
function panelSingle(pi, im0) {
  var im = el('div', 'acsv-mdetail-img');
  imgInto(im, im0 && im0.url, 'grid');
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

  // 布局判定（0.9.103 裁决「按内容型换布局」；0.9.105 收紧：图像权威=imgs——无图动态的
  // 顶层 coverUrl 是官方默认封面池/源封面，不算自有媒体）：有 imgs → 两栏（左媒体/右内容）；
  // 无图/纯文字/转发 → 单栏收窄（转发卡自带源缩略图，左区再放源封面会重复）
  var hasMedia = !pi.repost && pi.imgs && pi.imgs.length > 0;
  var side = null; // 右栏（两栏态）；管线 host.el 指向它——输入条 append 到 h.el 末尾=贴 side 底
  if (hasMedia) {
    panel.classList.add('acsv-mdetail-split');
    var mediaCol = el('div', 'acsv-mdetail-media');
    mediaCol.appendChild(pi.imgs.length > 1 ? carouselOf(pi) : panelSingle(pi, pi.imgs[0]));
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
  // 作者名=真链接（0.9.105 统一蓝链语言：与行流/引用卡 @源UP 同款；无 up.id 则不可点）
  var nameEl = el('a', 'acsv-gmom-name', pi.up && pi.up.name ? '@' + pi.up.name : '');
  if (pi.up && pi.up.id) {
    nameEl.href = CFG.api.userBase + pi.up.id;
    nameEl.target = '_blank';
    nameEl.rel = 'noopener';
    nameEl.addEventListener('click', function (ev) { ev.stopPropagation(); });
  }
  head.appendChild(nameEl);
  head.appendChild(el('span', 'acsv-gmom-time', pi.dateText || ''));
  hostEl.appendChild(head);

  // 可滚动体 = 评论管线的 list：正文 pin 在其首（管线清列表重挂，见 comments.resetList），
  // 评论区自然衔接在正文之后——一滚到底的整页阅读，不做双滚动区
  var list = el('div', 'acsv-mdetail-list');
  list.addEventListener('click', commentListClick); // 点赞/回复/转发/配图大图委托（经典抽屉同款委托；宿主各自挂，0.9.118 起抽屉侧自附）
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
  // 互动栏（0.9.105 共享件：与行流卡同键定义表/写链编排，skin=detail 走面板皮肤；
  // 四键统一 分享/评论/蕉/赞——分享卡 place=右贴：左缘挨面板右缘、底部对齐，0.9.105 裁决）
  pin.appendChild(momentBarOf(pi, {
    skin: 'detail',
    onShare: function (btn) {
      openSharePanel(btn, momentShareItemOf(pi), {
        headText: '分享给朋友',
        host: backdrop,
        place: { mode: 'right-of', anchorEl: panel }
      });
    },
    onComment: function () {
      // 评论区就在本面板（滚动体内）：滚到评论头并聚焦输入框
      var c = list.querySelector('.acsv-mdetail-cmthead');
      if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      var inp = hostEl.querySelector('.acsv-cinput-text');
      if (inp) inp.focus();
    }
  }));
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

// debug 构建测试钩子：harness 断言面板开合与当前动态 id（结构断言走 DOM 类名）
testHook('momentdetail', function () {
  return { open: !!panelEl, momentId: panelEl ? panelEl._momentId : 0 };
});
