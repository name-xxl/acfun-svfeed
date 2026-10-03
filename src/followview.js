// ---------- 关注视图（0.9.100 还原度重构）：全部侧 = 原生骨架单列无限流 ----------
// 形态沿革：0.9.91 混合卡流 → 0.9.99 仿原生行流（自创暗色卡）→ 0.9.100 按原生骨架重做。
// 复刻法=动态广场 renderer.js 的路数：**逐段复刻原生 /member/feeds 的 DOM 骨架与量取值**
// （ac-member-feed → member-feed-user/feed-content/member-feed-interactive 的等价四段），
// 颜色换算成面板暗色系（量取日 2026-10-03，对照表见 styles.js 关注段头注）。「视频」侧
// 不归本视图：followstream.js 把关注视频流接进宿主竖刷舞台，顶栏 seg 切换。
// 交互还原：正文展开（原生「...展开」同款）、图片点击开大图（原生 cursor:pointer 同款）、
// 视频时长 hover 浮层（原生 video-time 同款）、**评论键原位展开评论区**（comments.js 管线
// host 化复用，openCommentsHost 挂行内容器——面板/抽屉/行内三宿主同走 claimDrawer 槽）。
// 无限滚动五条借鉴广场 controller.js（append-only/失败不置到底/三态状态行/整页 0 新增判
// 到底/loading 代数保护），出处与退化说明见下方 load() 注释。
// 光 DOM 有意偏离 intake 的「el()+Shadow DOM」（0.9.96 登记同款理由：评论/引用块族样式
// 单源在全局 styles.js，进影子根=复制 CSS 造漂移源）。
import { CFG } from './cfg.js';
import { el, fmt, toast } from './ui.js';
import { request } from './net.js';
import { followPanelOf } from './data.js';
import { ubbTextOf, quoteBlockOf, openPanelItem } from './views.js';
import { ubbPlain } from './ubb.js';
import { commentShareWire } from './immsg.js';
import { openSharePanel } from './imshare.js';
import { GLYPHS } from './imicons.js';
import { imgInto } from './imgload.js';
import { registerView } from './viewreg.js';
import { setDockBadge } from './sidebar.js';
import { openMomentDetail } from './momentdetail.js';
import { setRealLike } from './interact.js';
import { AppAPI } from './appapi.js';
import { openImageViewer } from './imgview.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { releaseDrawer } from './state.js';

// ---------- 原位评论区（0.9.100）：行内开合的宿主状态（模块级——teardown 要能收拾它） ----------
// 开新行前必须**显式关旧行**：claimDrawer 同槽重入不互收（comments.js 注释在册），不关的话
// 旧容器还挂着管线 DOM、commentState 却已指向新行——列表更新串台。
var openCmt = null; // { pi, box, list }

function closeInlineComments() {
  if (!openCmt) return;
  var c = openCmt;
  openCmt = null;
  c.box.remove();
  closeCommentsHost(); // 管线宿主复位（容器已拆，残留引用会读到死节点——momentdetail 同款）
  releaseDrawer('comments');
}

function toggleInlineComments(pi, btn) {
  if (openCmt && openCmt.pi === pi) { closeInlineComments(); return; } // 同条目再点=收起
  closeInlineComments();
  var row = btn.closest('.acsv-frow');
  var box = el('div', 'acsv-frow-cmts');
  var list = el('div', 'acsv-frow-cmtlist');
  list.addEventListener('click', commentListClick); // 行内点赞/回复/配图大图委托（slide 同款挂法）
  box.appendChild(list);
  var acts = btn.parentNode;
  if (acts.nextSibling) row.insertBefore(box, acts.nextSibling);
  else row.appendChild(box);
  openCmt = { pi: pi, box: box, list: list };
  // pin 不传：行内正文本就在上方，评论区只要列表+输入条（resetList 对缺 pin 有守卫）
  openCommentsHost({
    el: box,
    title: btn._n, // 评论计数 span 交给管线回写（momentdetail 同款）
    list: list,
    close: closeInlineComments
  }, pi.momentId, 4, pi.href, 'home');
}

// ---------- 行渲染（feedRowOf）：原生骨架四段 head / content / acts（sep=行间灰带） ----------

// 头像行（member-feed-user 等价）：头像 50 圆 + 名字链接 16px + 时间块级在其下
function headOf(pi) {
  var head = el('div', 'acsv-frow-head');
  var av = el('span', 'acsv-frow-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  var info = el('div', 'acsv-frow-info');
  var name = el('a', 'acsv-frow-name', pi.up && pi.up.name ? pi.up.name : '');
  if (pi.up && pi.up.id) {
    name.href = CFG.api.userBase + pi.up.id;
    name.target = '_blank';
    name.rel = 'noopener';
  }
  info.appendChild(name);
  info.appendChild(el('span', 'acsv-frow-time', pi.dateText || ''));
  head.appendChild(info);
  return head;
}

// 媒体横条（member-feed-resource-content 等价）：左右两块灰底拼合——cover 块 204（img
// 204×128、时长 hover 浮层、文章红角标）+ body 块（title 600 单行省略 / desc 两行 / info 绝对定位）
function stripMedia(pi) {
  var strip = el('div', 'acsv-frow-strip');
  var cov = el('div', 'acsv-frow-scover');
  imgInto(cov, pi.cover, 'grid');
  if (pi.ct === 'article') cov.appendChild(el('span', 'acsv-frow-tag', '文章'));
  if (pi.dur) cov.appendChild(el('span', 'acsv-frow-mdur', pi.dur));
  strip.appendChild(cov);
  var bd = el('div', 'acsv-frow-sbody');
  bd.appendChild(el('div', 'acsv-frow-stitle', pi.title || ''));
  if (pi.desc) bd.appendChild(el('div', 'acsv-frow-sdesc', pi.desc));
  var info = el('div', 'acsv-frow-sinfo');
  info.appendChild(el('i', 'acsvg-glyph', GLYPHS.rankView));
  info.appendChild(document.createTextNode(pi.views || '0'));
  bd.appendChild(info);
  strip.appendChild(bd);
  return strip;
}

// 九宫格（member-feed-moment-image 等价）：容器 342、图 110 方 margin 0 4 4 0；1 图容器
// 299（图自适应 max299）；2/4 图容器 228。格上 cursor:pointer（原生同款），点击开大图
function momentImgs(pi) {
  var box = el('div', 'acsv-frow-imgs');
  var n = pi.imgs.length;
  if (n === 1) box.classList.add('n1');
  else if (n === 2 || n === 4) box.classList.add('n24');
  pi.imgs.forEach(function (im) {
    var cell = el('div', 'acsv-frow-img');
    cell._big = im.big || im.url; // 大图查看转呈 expandedUrl（点缩略看大图，原生同款）
    imgInto(cell, im.url, 'grid');
    box.appendChild(cell);
  });
  return box;
}

// 动态媒体块分派：转发=引用块（quoteBlockOf 共享件）；配图=九宫格（含单图 n1 形态）；
// 无图旧条目兜底顶层 cover 单图。返回 null=纯文字
function momentMedia(pi) {
  if (pi.repost) return quoteBlockOf(pi.repost);
  if (pi.imgs && pi.imgs.length) return momentImgs(pi);
  if (pi.cover) {
    var box = el('div', 'acsv-frow-imgs n1');
    var cell = el('div', 'acsv-frow-img');
    imgInto(cell, pi.cover, 'grid');
    box.appendChild(cell);
    return box;
  }
  return null;
}

// 互动行（feed-interactive 等价）：分享=icon+「分享」文字（原生无数字）、评论/蕉/赞=icon+数字；
// 蕉/赞双态（点亮换 fill glyph + accent 色，GLYPHS 单件等价原生 path/fill 机制）
function actRowOf(pi) {
  var bar = el('div', 'acsv-frow-acts');
  [
    { k: 'share', label: '分享', glyph: GLYPHS.share, text: '分享' },
    { k: 'comment', label: '评论', glyph: GLYPHS.feedComment, n: pi.comment },
    { k: 'banana', label: pi.thrown ? '已投蕉' : '投蕉', glyph: GLYPHS.banana, n: pi.banana, on: !!pi.thrown },
    { k: 'like', label: pi.liked ? '已赞' : '点赞', glyph: pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike, n: pi.like, on: !!pi.liked }
  ].forEach(function (def) {
    var b = el('span', 'acsv-fact' + (def.on ? ' on' : ''));
    b._act = def.k;
    b.title = def.label;
    b.appendChild(el('i', 'acsvg-glyph', def.glyph));
    if (def.text) b.appendChild(el('span', null, def.text));
    if (def.n != null) {
      var n = el('span', null, fmt(def.n));
      b.appendChild(n);
      b._n = n;
    }
    bar.appendChild(b);
  });
  return bar;
}

function feedRowOf(pi) {
  var row = el('div', 'acsv-frow');
  row._pi = pi; // 行级数据引用：列表级委托按它分派（comments.js commentListClick 同款挂法）
  row.appendChild(headOf(pi));
  var content = el('div', 'acsv-frow-content');
  if (pi.ct === 'moment') {
    // 正文 UBB 单源（表情/at/资源链）；clamp 是展开态开关的初始类（溢出才挂「展开」按钮）
    content.appendChild(ubbTextOf(pi.text, 'acsv-frow-text clamp'));
  }
  var media = null;
  if (pi.repost) media = quoteBlockOf(pi.repost);
  else if (pi.ct === 'moment') media = momentMedia(pi);
  else media = stripMedia(pi);
  if (media) content.appendChild(media);
  row.appendChild(content);
  row.appendChild(actRowOf(pi));
  return row;
}

// ---------- 互动行为（乐观更新照 rail.js:154-177 范式；pi 与详情面板同引用——
// 面板里再操作计数，行内 DOM 不自动跟新：v1 不做跨面实时同步，低频场景，注释防误判） ----------

// like/banana 的按钮态统一回写（glyph 点亮 + 计数）；分享无计数（原生同款）
function syncAct(btn, pi) {
  var k = btn._act;
  if (k === 'like') {
    btn.classList.toggle('on', !!pi.liked);
    btn.title = pi.liked ? '已赞' : '点赞';
    var g = btn.querySelector('.acsvg-glyph');
    if (g) g.textContent = pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike;
  } else if (k === 'banana') {
    btn.classList.toggle('on', !!pi.thrown);
    btn.title = pi.thrown ? '已投蕉' : '投蕉';
  }
  if (btn._n) btn._n.textContent = fmt(k === 'like' ? pi.like : k === 'banana' ? pi.banana : pi.comment);
}

function likeItemOf(pi) {
  // objectType 派生在 interact.js：动态=10、其余=2；home 形状加 kpf=PC_WEB 对齐官方网页
  return pi.ct === 'moment' ? { id: pi.momentId, kind: 'moment' } : { id: pi.acId, kind: 'home' };
}

function actLike(pi, btn) {
  if (pi.ct === 'article') return; // 文章写链未实测：只读
  if (pi.likeBusy) return;
  pi.likeBusy = true;
  var on = !pi.liked;
  pi.liked = on;
  pi.like += on ? 1 : -1;
  syncAct(btn, pi);
  setRealLike(likeItemOf(pi), on).then(function (ok) {
    pi.likeBusy = false;
    if (ok) return;
    pi.liked = !on; // 失败回滚（乐观值全退，rail 同款）
    pi.like += on ? -1 : 1;
    syncAct(btn, pi);
    toast('操作失败（未登录？）');
  });
}

function actBanana(pi, btn) {
  if (pi.ct === 'article') return; // 文章写链未实测：只读
  if (pi.banBusy || pi.thrown) return;
  pi.banBusy = true;
  // 投蕉不可逆（官方无取消端点，0.9.96 同款）：失败只 toast 不回滚投态——没投出去才留重试
  var throwP = pi.ct === 'moment' ? AppAPI.throwBanana(pi.momentId, 1, 10) : AppAPI.throwBanana(pi.acId, 1);
  throwP.then(function (ok) {
    pi.banBusy = false;
    if (!ok) { toast('投蕉失败' + (pi.thrown ? '' : '（今日已投过/未登录？）')); return; }
    pi.thrown = true;
    pi.banana += 1;
    syncAct(btn, pi);
    toast('投蕉成功');
  });
}

function actShare(pi, btn, host) {
  // wire 契约「标题行\nURL」（parseShare 两端出分享卡）：标题=@作者：正文/标题明文
  var text = pi.ct === 'moment' ? ubbPlain(pi.text) : (pi.title || '');
  var url = pi.ct === 'video' ? CFG.api.videoBase + pi.acId : pi.href;
  openSharePanel(btn, {
    title: commentShareWire(pi.up && pi.up.name, text),
    shareUrl: url
  }, { host: host, headText: '分享给朋友' });
}

function rowDefault(pi) {
  if (pi.ct === 'moment') {
    closeInlineComments(); // 面板接管评论区（claimDrawer 同槽，先关行内防两份宿主互踩）
    openMomentDetail(pi);
  } else if (pi.ct === 'video') openPanelItem(pi);
  else if (pi.href) window.open(pi.href, '_blank');
}

// ---------- 视图组装 ----------

// 首屏骨架行（独立类名 acsv-fskel：绝不与行内计数选择器同构——0.9.66 教训）
function skeleton(listEl) {
  var nodes = [];
  for (var i = 0; i < CFG.view.follow.skel; i++) {
    var d = el('div', 'acsv-fskel');
    nodes.push(d);
    listEl.appendChild(d);
  }
  return function () {
    nodes.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
  };
}

// 展开/收起的溢出探测：clamp 类先渲染，rAF 后量 scrollHeight——溢出才挂按钮（不溢出
// 的正文不出现假按钮）。批量一帧做一次，不做滚动监听（翻页时对新批再 arm 一次即可）
function armExpanders(scope) {
  requestAnimationFrame(function () {
    if (!scope.isConnected) return;
    [].forEach.call(scope.querySelectorAll('.acsv-frow-text.clamp'), function (t) {
      if (t.scrollHeight <= t.clientHeight + 1) return;
      var more = el('span', 'acsv-fmore', '展开');
      t.parentNode.insertBefore(more, t.nextSibling);
    });
  });
}

function buildFollowView(body) {
  setDockBadge('follow', 0); // 进关注语境即清（0.9.97；视频侧的清零在 followstream.enterVideos）
  var wrap = el('div', 'acsv-mewrap');
  body.appendChild(wrap);
  var list = el('div', 'acsv-frows');
  wrap.appendChild(list);
  // 三态底部状态行（借鉴广场 load-more-status）：加载中… / 加载失败，滚动重试 / 已加载全部
  // 动态；点击=手动重试（首屏失败列表为空没有滚动可依，点击是唯一重试出口）
  var status = el('div', 'acsv-fstatus');
  wrap.appendChild(status);
  // 回顶（借鉴广场 back-top）：sticky 钉在滚动流底部右缘，超 backTopAt 才现身
  var backTop = el('div', 'acsv-fbacktop', '↑');
  backTop.title = '回到顶部';
  body.appendChild(backTop);

  var pcursor = '0';    // 首页游标（毫秒时间戳由响应回填；空/缺=no_more → 到底）
  var seq = 0;          // 在途回包令牌：视图已拆（闭包死）或重建时旧回包丢弃
  var loading = false;
  var noMore = false;
  var firstPage = true;
  var seenKeys = null;  // 去重键集（momentId||acId）：整页 0 新增 → 判到底（广场安全阀）

  function setStatus(text, busy) {
    status.textContent = text || '';
    status.classList.toggle('busy', !!busy);
  }

  function load() {
    if (loading || noMore) return;
    loading = true;
    var my = ++seq;
    var sk = firstPage ? skeleton(list) : null;
    if (!firstPage) setStatus('加载中…', true);
    request(CFG.api.followFeed + '?useWebp=true&count=' + CFG.view.pageSize + '&pcursor=' + pcursor, 'GET')
      .then(function (j) {
        if (sk) sk();
        if (my !== seq || !list.isConnected) return; // 视图已拆/重建：在途回包丢弃
        var raws = (j && j.feedList) || [];
        // 整页重复安全阀：新增键=0 即判到底（被契约过滤的条目不算新增也不算重复）
        var fresh = 0;
        if (!seenKeys) seenKeys = new Set();
        raws.forEach(function (raw) {
          var pi = followPanelOf(raw);
          if (!pi) return; // 契约层过滤（未知类型/缺身份字段——宁可漏不错）
          var key = pi.momentId || pi.acId;
          if (key && seenKeys.has(key)) return;
          if (key) seenKeys.add(key);
          fresh++;
          // **append-only 不变量**：新行只追加尾部，绝不重渲染整列表（头部注释①——
          // 展开态/原位评论区/面板引用靠它保命）
          list.appendChild(feedRowOf(pi));
        });
        var next = j && j.pcursor != null ? String(j.pcursor) : '';
        // 到底判定：终值 'no_more'（与 followDougaFeed 同族语义）/ 空游标 / 空页 / 整页 0 新增
        if (next === 'no_more' || !next || !raws.length || (fresh === 0 && raws.length)) noMore = true;
        pcursor = next;
        armExpanders(list);
        if (firstPage && !list.children.length && noMore) {
          list.appendChild(el('div', 'acsv-vempty', '关注的 UP 还没有新动态'));
        }
        firstPage = false;
        setStatus(noMore ? '已加载全部动态' : '');
        loading = false;
      }, function () {
        if (sk) sk();
        if (my !== seq || !list.isConnected) return;
        // 失败不置到底：下次触底自动重试；首屏失败列表为空，点击是唯一出口
        setStatus(list.children.length ? '加载失败，滚动重试' : '加载失败，点击重试');
        loading = false;
      });
  }

  // 列表级委托（commentListClick 同款挂法）：互动键 → 行为分派；展开 → 钳高切换；
  // 正文配图/九宫格 → 大图；内链不劫持；其余落行默认动作。命中即 return，不双触发行默认
  list.addEventListener('click', function (ev) {
    var row = ev.target.closest('.acsv-frow');
    if (!row || !row._pi) return;
    var pi = row._pi;
    var act = ev.target.closest('.acsv-fact');
    if (act) {
      ev.stopPropagation();
      var k = act._act;
      if (k === 'like') actLike(pi, act);
      else if (k === 'banana') actBanana(pi, act);
      else if (k === 'comment') {
        if (pi.ct === 'moment') toggleInlineComments(pi, act); // 原位展开（原生同款）
        else actComment(pi);
      } else if (k === 'share') actShare(pi, act, body);
      return;
    }
    var more = ev.target.closest('.acsv-fmore');
    if (more) {
      var t = row.querySelector('.acsv-frow-text');
      if (t) {
        var clamped = t.classList.toggle('clamp');
        more.textContent = clamped ? '展开' : '收起';
      }
      return;
    }
    var img = ev.target.closest('.acsv-frow-img');
    if (img) {
      ev.stopPropagation();
      openImageViewer(img._big || img.querySelector('img') && img.querySelector('img').src || '');
      return;
    }
    var pic = ev.target.closest('.ubb-imgc');
    if (pic) {
      // 划选文字收尾在图片上不弹大图（commentListClick 同款判据）
      var sel = window.getSelection ? window.getSelection() : null;
      if (!sel || sel.isCollapsed) {
        ev.stopPropagation();
        openImageViewer(pic.getAttribute('src') || '');
      }
      return;
    }
    if (ev.target.closest('a')) return; // 内链（@/资源/名字/文章条）自导航，不冒泡成行默认
    rowDefault(pi);
  });

  // 无限滚动：挂在**实际滚动容器**（.acsv-view-body 即本 body）——非 window（与广场的
  // 差异点，广场列表直接活在页面流里）；触底提前量 300px（CFG.view.follow.scrollPad）
  body.addEventListener('scroll', function () {
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - CFG.view.follow.scrollPad) load();
    backTop.classList.toggle('on', body.scrollTop > CFG.view.follow.backTopAt);
  }, { passive: true });
  backTop.addEventListener('click', function () {
    body.scrollTo({ top: 0, behavior: 'smooth' });
  });

  load();
}

// 评论/分享以外的一条旧出口收敛（视频/文章的评论键仍走各自落点）
function actComment(pi) {
  if (pi.ct === 'video') openPanelItem(pi); // 播放层直达，评论在层内抽屉
  else if (pi.href) window.open(pi.href, '_blank'); // 文章评论在官方页
}

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 从注册表派生）。无 deep/无 volatile——
// 普通 dock 视图（收旧 + 来源链作废）；「视频」侧从顶栏 seg 进（followstream.enterVideos）。
// teardown：离开视图把行内评论区宿主复位（容器随 DOM 拆，残留 host 引用会读到死节点）
registerView({
  id: 'follow', build: buildFollowView,
  teardown: closeInlineComments,
  dock: {
    label: '关注', order: 30, group: 1,
    svg: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
  }
});
