import { CFG } from './cfg.js';
import { el, fmt, toast } from './ui.js';
import { root, releaseDrawer } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { imgInto } from './imgload.js';
import { ubbTextOf, quoteBlockOf } from './views.js';
import { GLYPHS } from './imicons.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { openImageViewer } from './imgview.js';
import { setRealLike } from './interact.js';
import { AppAPI } from './appapi.js';
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

  // 头部：作者行 + ✕（作者在头像行——0.9.93 文本向卡形制）。类名复用 .acsv-gmom-head：
  // 头像 24px 等规则的样式作用域在其下（styles.js），面板头同形制就同一条规则（单源）；
  // .acsv-mdetail-head 只补边框分隔
  var head = el('div', 'acsv-gmom-head acsv-mdetail-head');
  var av = el('span', 'acsv-gmom-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  head.appendChild(el('span', 'acsv-gmom-name', pi.up && pi.up.name ? '@' + pi.up.name : ''));
  head.appendChild(el('span', 'acsv-gmom-time', pi.dateText || ''));
  var x = el('button', 'acsv-mdetail-x', '✕');
  x.title = '关闭';
  x.addEventListener('click', closeMomentDetail);
  head.appendChild(x);
  panel.appendChild(head);

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
  if (pi.repost) {
    // 引用块与动态卡同源（views.quoteBlockOf）；源条点击不接播放（v1 静态展示）
    pin.appendChild(quoteBlockOf(pi.repost));
  } else if (pi.imgs && pi.imgs.length > 1) {
    // 多图（0.9.98）：与卡面同款的九宫格；格上另挂**大图查看**（详情面板是独立交互面，
    // 不像卡面整卡一个点击目标）——imgview 转呈 expandedUrl（native 同款点缩略看大图）
    var grid = el('div', 'acsv-mdetail-imgs');
    grid.dataset.n = String(pi.imgs.length);
    pi.imgs.forEach(function (im) {
      var cell = el('div', 'acsv-mdetail-imgcell');
      imgInto(cell, im.url, 'grid');
      cell._big = im.big || im.url;
      cell.addEventListener('click', function (ev) {
        ev.stopPropagation(); // 不惊动列表委托（commentListClick）与背板关闭判定
        openImageViewer(cell._big);
      });
      grid.appendChild(cell);
    });
    pin.appendChild(grid);
  } else if (pi.cover) {
    var im = el('div', 'acsv-mdetail-img');
    imgInto(im, pi.cover, 'grid');
    // 单图也接大图查看（big 来自嵌套 imgs 的 expandedUrl；拿不到就不挂，保持静展示）
    var big1 = pi.imgs && pi.imgs[0] && (pi.imgs[0].big || pi.imgs[0].url);
    if (big1) {
      im._big = big1;
      im.classList.add('onbig');
      im.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openImageViewer(im._big);
      });
    }
    pin.appendChild(im);
  }
  pin.appendChild(actionBar(pi));
  // 评论区标题 = 管线的 title（insertLocalComment/renderComments 会重写计数）
  var cmthead = el('div', 'acsv-mdetail-cmthead');
  var title = el('span', 'acsv-mdetail-cmt', '评论');
  cmthead.appendChild(title);
  pin.appendChild(cmthead);
  list.appendChild(pin);
  panel.appendChild(list);

  backdrop.appendChild(panel);
  root.appendChild(backdrop);
  backdrop._momentId = pi.momentId;
  panelEl = backdrop;

  // 层位与槽位：与评论抽屉共用 overlay id 'comments'（同 id 幂等先收旧层——抽屉开着会经
  // closeComments 收掉）+ claimDrawer 槽；modal:true（背板模态，Esc 接栈）
  overlayOpen({ id: 'comments', modal: true, close: closeMomentDetail });
  // 评论区管线灌进面板宿主：stype=4（动态评论，R3 闭合）+ kind='home'（开放互动）——
  // shareUrl 用官方动态页落点（评论转发的 #ncid 锚点在原页原生定位楼层）
  openCommentsHost({ el: panel, title: title, list: list, close: closeMomentDetail, pin: pin },
    pi.momentId, 4, pi.href, 'home');
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
    setRealLike({ id: pi.momentId, kind: 'moment' }, on).then(function (ok) {
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
  banana.appendChild(el('i', 'acsvg-glyph', GLYPHS.banana));
  banana.appendChild(banN);
  banana.title = pi.thrown ? '已投蕉' : '投蕉';
  banana.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (pi.banBusy || pi.thrown) return;
    pi.banBusy = true;
    AppAPI.throwBanana(pi.momentId, 1, 10).then(function (ok) {
      pi.banBusy = false;
      if (!ok) { toast('投蕉失败' + (pi.thrown ? '' : '（今日已投过/未登录？）')); return; }
      pi.thrown = true; // 投蕉不可逆：只进不退（官方无取消端点），锁死防重复投
      pi.banana += 1;
      banana.classList.add('on');
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
