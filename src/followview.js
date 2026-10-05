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
// 行卡构建件与行内评论控制器 0.9.124 下沉 rowkit.js（关注/广场共用）——本文件只留视图壳、
// 游标方言与落点策略（rowDefault）。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { followPanelOf, momentPiOfRepost } from './panelitem.js';
import { openPanelItem, setMomentOpener, skeletonRows } from './cards.js';
import { ICONS } from './styles.js';
import { listMoments } from './momentapi.js';
import { markSeen } from './followseen.js'; // 首屏到达=已读（0.9.139；水位叶子件，勿在本模块自持水位）
import { registerView } from './viewreg.js';
import { setDockBadge } from './sidebar.js';
import { openMomentDetail } from './momentdetail.js';
import { ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { closeInlineComments, feedRowOf, armExpanders, wireRowList } from './rowkit.js';

// ---------- 互动行为（乐观更新照 rail.js:154-177 范式；pi 与详情面板同引用——
// 面板里再操作计数，行内 DOM 不自动跟新：v1 不做跨面实时同步，低频场景，注释防误判） ----------

function rowDefault(pi) {
  if (pi.ct === 'moment') {
    closeInlineComments(); // 面板接管评论区（claimDrawer 同槽，先关行内防两份宿主互踩）
    openMomentDetail(pi);
  } else if (pi.ct === 'video') {
    // 用户裁决（0.9.173）：「仅播放单条就只剩**动态里的视频卡片**」——动态语境的视频条目
    // 显式声明单条会话（不出右栏箭头、↓ 无下一条）；其余来源一律带列表/游走上下文
    openPanelItem(pi, { kind: 'single' });
  } else if (pi.href) window.open(pi.href, '_blank');
}

// ---------- 视图组装 ----------

// 首屏骨架行（0.9.102 收口：计数/移除走 cards.skeletonRows；类名仍独立 acsv-fskel）
function skeleton(listEl) {
  return skeletonRows(listEl, CFG.view.follow.skel, 'acsv-fskel');
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
  // 回顶（借鉴广场 back-top；0.9.105 图标语言统一）：顶栏同款圆钮 .acsv-tbtn + chevUp SVG，
  // sticky 钉在滚动流右下，超 backTopAt 才现身（.on）
  var backTop = el('button', 'acsv-tbtn acsv-backtop');
  backTop.innerHTML = ICONS.chevUp;
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
    listMoments(pcursor) // 传输收口 momentapi（0.9.106）；解析留在视图（分档/去重是视图语义）
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
        // 首屏到达=已读（0.9.139）：水位推进从"访问期内撞上轮询闸门"改为确定性钩子（短访不
        // 再复亮）。**放在成功回包内**——拉失败时用户什么也没看到，不得吞掉新内容
        if (firstPage) markSeen();
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

  wireRowList(list, rowDefault); // 列表级委托（commentListClick 同款挂法；0.9.124 收口 rowkit，落点经 onOpen）

  // 表情 map 预热 + 占位回填（0.9.105）：行流渲染不等 map（列表量大），先出占位灰字，
  // map 就绪后把占位回填成真表情——此前依赖"别处先加载过"的运气，冷启动首开表情全是 [表情]
  ensureEmotionMap().then(function () {
    if (list.isConnected) refillEmoticons(list);
  }, function () { });

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

// 动态详情出口注册（0.9.101；0.9.102 载荷改 repost）：cards.quoteBlockOf 点源动态卡时要开
// momentdetail——卡面 kit 不反向依赖本模块，走注入；pi 构造在 data.momentPiOfRepost（契约层）
setMomentOpener(function (rp) { openMomentDetail(momentPiOfRepost(rp)); });

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 从注册表派生）。无 deep/无 volatile——
// 普通 dock 视图（收旧 + 来源链作废）；「视频」侧从顶栏 seg 进（followstream.enterVideos）。
// teardown：离开视图把行内评论区宿主复位（容器随 DOM 拆，残留 host 引用会读到死节点）
registerView({
  id: 'follow', build: buildFollowView,
  teardown: closeInlineComments,
  dock: {
    label: '关注', order: 20, group: 1, // 0.9.155 用户裁决：与「我的」互换（我的沉底）
    svg: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
  }
});
