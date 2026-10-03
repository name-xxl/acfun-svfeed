// ---------- 关注视图（0.9.99 重构）：全部侧 = 仿原生单列无限流 ----------
// 形态沿革：0.9.91 混合卡流（D1 dock 卡片视图）→ 0.9.99 顶栏「视频|全部」双面（D1 修订在册：
// 竖刷化仅限纯视频子流，本视图=「全部」侧仍是列表）。仿原生对象 = 站方 /member/feeds「全部」
// 单列条目（头像行 + 正文 + 媒体块 + 互动行），样式按量取口径对齐（0.9.69 纪律，量取日
// 2026-10-03：头像 40 圆、封面横条 204:128、互动行四键等分、主色 --acsv-accent）。
// 「视频」侧不归本视图：followstream.js 把关注视频流接进宿主竖刷舞台，顶栏 seg 切换。
// 光 DOM 有意偏离 intake 的「el()+Shadow DOM」（0.9.96 登记同款理由：评论/引用块族样式
// 单源在全局 styles.js，进影子根=复制 CSS 造漂移源）。
// 无限滚动借鉴动态广场 controller.js 的成熟实现（吸收不搬家，五条全重写进本闸门体系）：
//   ① append-only 不整列表重建（新行只追加尾部——展开态/大图/面板引用不因翻页丢失）
//   ② 失败不置到底（状态行「加载失败，滚动重试」，下次触底自动重试）
//   ③ 三态底部状态行（加载中… / 加载失败，滚动重试 / 已加载全部动态）
//   ④ 整页 0 新增判到底（防服务端翻页异常死循环）
//   ⑤ loading 标志代数保护——本视图无刷新入口、闭包随视图生死，代数退化成 seq+isConnected
//     双检（广场场景里「新会话接管标志」在这里不存在，注释防误修成复杂版）
// 数据源不变：followFeedV2 统一混合流（§2.1.1）；行内写链：赞/蕉（互动行，rail 乐观范式）、
// 评论/分享/大图（各自既有出口）。
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

// ---------- 行渲染（feedRowOf）：头像行 + 正文（动态）+ 媒体块 + 互动行 ----------

// 头像行：原生 member-feed-user 同位（头像 + @名 + 时间）
function headOf(pi) {
  var head = el('div', 'acsv-frow-head');
  var av = el('span', 'acsv-frow-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  head.appendChild(el('span', 'acsv-frow-name', pi.up && pi.up.name ? '@' + pi.up.name : ''));
  head.appendChild(el('span', 'acsv-frow-time', pi.dateText || ''));
  return head;
}

// 媒体横条（视频/文章）：仿原生 content-left/right——封面左（时长角标右下）+ 标题右
//（量取 2026-10-03：封面 204:128，标题两行钳高；文章加「文章」chip）
function stripMedia(pi) {
  var m = el('div', 'acsv-frow-media');
  var cov = el('div', 'acsv-frow-mcover');
  imgInto(cov, pi.cover, 'grid');
  if (pi.dur) cov.appendChild(el('span', 'acsv-frow-mdur', pi.dur));
  m.appendChild(cov);
  var bd = el('div', 'acsv-frow-mbody');
  if (pi.ct === 'article') bd.appendChild(el('span', 'acsv-frow-mkind', '文章'));
  bd.appendChild(el('div', 'acsv-frow-mtitle', pi.title || ''));
  if (pi.views) bd.appendChild(el('div', 'acsv-frow-mmeta', pi.views + '次播放'));
  if (pi.ct === 'article' && pi.desc) bd.appendChild(el('div', 'acsv-frow-mdesc', pi.desc));
  m.appendChild(bd);
  return m;
}

// 媒体块分派（动态）：转发=引用块（quoteBlockOf 共享件）；多图=九宫格（0.9.98 形制，
// 类名与详情面板共用——同一视觉意图不复制第二份规则）；单图=cover 大图
function momentMedia(pi) {
  if (pi.repost) return quoteBlockOf(pi.repost);
  if (pi.imgs && pi.imgs.length > 1) {
    var grid = el('div', 'acsv-gmom-imgs');
    grid.dataset.n = String(pi.imgs.length);
    pi.imgs.forEach(function (im) {
      var cell = el('div', 'acsv-gmom-imgcell');
      imgInto(cell, im.url, 'grid');
      grid.appendChild(cell);
    });
    return grid;
  }
  if (pi.cover) {
    var im = el('div', 'acsv-gmom-img');
    imgInto(im, pi.cover, 'grid');
    return im;
  }
  return null;
}

// 互动行：原生 feed-interactive 同序（分享 → 评论 → 蕉 → 赞，量取 2026-10-03）。
// 文章的赞/蕉**只读**（写链未实测，§2.1.1 同族但端点未验证——渲染成哑键不算丢功能）
function actRowOf(pi) {
  var bar = el('div', 'acsv-frow-acts');
  [
    { k: 'share', label: '分享', glyph: GLYPHS.share, n: pi.share, on: false },
    { k: 'comment', label: '评论', glyph: GLYPHS.feedComment, n: pi.comment, on: false },
    { k: 'banana', label: pi.thrown ? '已投蕉' : '投蕉', glyph: GLYPHS.banana, n: pi.banana, on: !!pi.thrown },
    { k: 'like', label: pi.liked ? '已赞' : '点赞', glyph: pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike, n: pi.like, on: !!pi.liked }
  ].forEach(function (def) {
    var b = el('span', 'acsv-fact' + (def.on ? ' on' : ''));
    b._act = def.k;
    b.title = def.label;
    b.appendChild(el('i', 'acsvg-glyph', def.glyph));
    var n = el('span', null, fmt(def.n));
    b.appendChild(n);
    b._n = n;
    bar.appendChild(b);
  });
  return bar;
}

function feedRowOf(pi) {
  var row = el('div', 'acsv-frow');
  row._pi = pi; // 行级数据引用：列表级委托按它分派（comments.js commentListClick 同款挂法）
  row.appendChild(headOf(pi));
  if (pi.ct === 'moment') {
    // 正文 UBB 单源（表情/at/资源链）；clamp 是展开态开关的初始类（溢出才挂「展开」按钮）
    row.appendChild(ubbTextOf(pi.text, 'acsv-frow-text clamp'));
  }
  var media = null;
  if (pi.repost) media = quoteBlockOf(pi.repost);
  else if (pi.ct === 'moment') media = momentMedia(pi);
  else media = stripMedia(pi);
  if (media) row.appendChild(media);
  row.appendChild(actRowOf(pi));
  return row;
}

// ---------- 互动行为（乐观更新照 rail.js:154-177 范式；pi 与详情面板同引用——
// 面板里再操作计数，行内 DOM 不自动跟新：v1 不做跨面实时同步，低频场景，注释防误判） ----------

// like/banana 的按钮态统一回写（glyph 点亮 + 计数）；act 行里计数 span 挂在 _n 上
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
  btn._n.textContent = fmt(k === 'like' ? pi.like : k === 'banana' ? pi.banana : k === 'comment' ? pi.comment : pi.share);
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

function actComment(pi) {
  if (pi.ct === 'moment') openMomentDetail(pi); // 评论在详情面板（stype=4 管线复用）
  else if (pi.ct === 'video') openPanelItem(pi); // 播放层直达，评论在层内抽屉
  else if (pi.href) window.open(pi.href, '_blank'); // 文章评论在官方页
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
  if (pi.ct === 'moment') openMomentDetail(pi);
  else if (pi.ct === 'video') openPanelItem(pi);
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
          // 展开态/大图/面板引用靠它保命）
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
        // 失败不置到底（头部注释②）：下次触底自动重试；首屏失败列表为空，点击是唯一出口
        setStatus(list.children.length ? '加载失败，滚动重试' : '加载失败，点击重试');
        loading = false;
      });
  }

  // 列表级委托（commentListClick 同款挂法）：互动键 → 行为分派；展开 → 钳高切换；
  // 正文配图 → 大图；内链不劫持；其余落行默认动作。命中即 return，不双触发行默认
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
      else if (k === 'comment') actComment(pi);
      else if (k === 'share') actShare(pi, act, body);
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
    if (ev.target.closest('a')) return; // 内链（@/资源/文章条）自导航，不冒泡成行默认
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

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 从注册表派生）。无 deep/无 volatile——
// 普通 dock 视图（收旧 + 来源链作废）；「视频」侧从顶栏 seg 进（followstream.enterVideos）
registerView({
  id: 'follow', build: buildFollowView,
  dock: {
    label: '关注', order: 30, group: 1,
    svg: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
  }
});
