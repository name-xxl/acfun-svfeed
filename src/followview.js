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
import { el } from './ui.js';
import { followPanelOf, momentPiOfRepost } from './data.js';
import { ubbTextOf, openPanelItem, setMomentOpener, stripOf, momentCellOf, momentMediaOf, skeletonRows } from './views.js';
import { ICONS } from './styles.js';
import { openSharePanel } from './imshare.js';
import { momentBarOf, momentShareItemOf } from './momentbar.js';
import { listMoments } from './momentapi.js';
import { imgInto } from './imgload.js';
import { registerView } from './viewreg.js';
import { setDockBadge } from './sidebar.js';
import { openMomentDetail } from './momentdetail.js';
import { openImageViewer } from './imgview.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { releaseDrawer } from './state.js';

// ---------- 原位评论区（0.9.100）：行内开合的宿主状态（模块级——teardown 要能收拾它） ----------
// 开新行前必须**显式关旧行**：claimDrawer 同槽重入不互收（comments.js 注释在册），不关的话
// 旧容器还挂着管线 DOM、commentState 却已指向新行——列表更新串台。
// 0.9.101：视频行也原位展开（原生 member-feed 三类条目都是原地开评论；sv=5 是 meow，
// www 视频=3——data.js normalizeHome 同值）；文章评论 stype 未实测，仍外链官方页
var openCmt = null; // { pi, box, list }

function closeInlineComments() {
  if (!openCmt) return;
  var c = openCmt;
  openCmt = null;
  c.box.remove();
  closeCommentsHost(); // 管线宿主复位（容器已拆，残留引用会读到死节点——momentdetail 同款）
  releaseDrawer('comments');
}

// cmt = { sourceId, stype, shareUrl }：按条目型给管线端点参数（动态=4/momentId，视频=3/acId）
function toggleInlineComments(pi, btn, cmt) {
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
  }, cmt.sourceId, cmt.stype, cmt.shareUrl, 'home');
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

// 行流的两块媒体构建器（0.9.102 收口：strip 下沉 views.stripOf、格子上挂 views.momentCellOf，
// 本模块只留**行流特有的布局决策**——九宫格 n1/n24 容器类；dispatch 走 views.momentMediaOf）
// 九宫格（member-feed-moment-image 等价）：容器 342、图 110 方 margin 0 4 4 0；1 图容器
// 299（图自适应 max299）；2/4 图容器 228。格上 cursor:pointer（原生同款），点击开大图
function rowGrid(pi) {
  var box = el('div', 'acsv-frow-imgs');
  var n = pi.imgs.length;
  if (n === 1) box.classList.add('n1');
  else if (n === 2 || n === 4) box.classList.add('n24');
  pi.imgs.forEach(function (im) { box.appendChild(momentCellOf('acsv-frow-img', im)); });
  return box;
}

// 单图兜底（imgInfos 缺失的老数据）；无图返 null——动态图像权威=imgs（0.9.105，cover 兜底
// 已退役：无图动态的顶层 coverUrl 是官方默认封面池/源封面，不是本条配图）
function rowSingle(pi, im0) {
  if (!im0) return null;
  var box = el('div', 'acsv-frow-imgs n1');
  box.appendChild(momentCellOf('acsv-frow-img', im0));
  return box;
}

// 动态媒体块分派（dispatcher 单源；行流 gridMin=1——单图也走宫格容器拿 299 自适应）
function momentMedia(pi) {
  return momentMediaOf(pi, { gridMin: 1, grid: rowGrid, single: rowSingle });
}

// 互动栏（0.9.105 收口共享件 momentbar）：键定义/写链编排单源，行流只提供两个出口——
// 分享（place=左贴行：右缘挨行左缘、底部对齐，0.9.105 裁决几何）与评论（动态/视频行内
// 原位展开、文章外链官方页）
function rowBarOf(pi, row) {
  return momentBarOf(pi, {
    skin: 'row',
    onShare: function (btn) {
      // 宿主=滚动视图体（absolute 坐标系含滚动偏移 → 弹层随列表滚动跟随）
      openSharePanel(btn, momentShareItemOf(pi), {
        headText: '分享给朋友',
        host: row.closest('.acsv-view-body'),
        place: { mode: 'left-of', anchorEl: row }
      });
    },
    onComment: function (btn) {
      if (pi.ct === 'moment') {
        toggleInlineComments(pi, btn, { sourceId: pi.momentId, stype: 4, shareUrl: pi.href });
      } else if (pi.ct === 'video') {
        toggleInlineComments(pi, btn, { sourceId: pi.acId, stype: 3, shareUrl: CFG.api.videoBase + pi.acId });
      } else if (pi.href) {
        window.open(pi.href, '_blank'); // 文章评论 stype 未实测：外链官方页（宁可漏不错）
      }
    }
  });
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
  if (pi.ct === 'moment') media = momentMedia(pi); // 内含 repost→引用卡 分派（dispatcher 单源）
  else media = stripOf(pi); // 视频/文章行：与引用卡内嵌源卡共用构建件（原生同款复用）
  if (media) content.appendChild(media);
  row.appendChild(content);
  row.appendChild(rowBarOf(pi, row));
  return row;
}

// ---------- 互动行为（乐观更新照 rail.js:154-177 范式；pi 与详情面板同引用——
// 面板里再操作计数，行内 DOM 不自动跟新：v1 不做跨面实时同步，低频场景，注释防误判） ----------

function rowDefault(pi) {
  if (pi.ct === 'moment') {
    closeInlineComments(); // 面板接管评论区（claimDrawer 同槽，先关行内防两份宿主互踩）
    openMomentDetail(pi);
  } else if (pi.ct === 'video') openPanelItem(pi);
  else if (pi.href) window.open(pi.href, '_blank');
}

// ---------- 视图组装 ----------

// 首屏骨架行（0.9.102 收口：计数/移除走 views.skeletonRows；类名仍独立 acsv-fskel）
function skeleton(listEl) {
  return skeletonRows(listEl, CFG.view.follow.skel, 'acsv-fskel');
}

// 展开/收起的溢出探测：clamp 类先渲染，rAF 后量 scrollHeight——溢出才挂按钮（不溢出
// 的正文不出现假按钮）。批量一帧做一次，不做滚动监听（翻页时对新批再 arm 一次即可）
function armExpanders(scope) {
  requestAnimationFrame(function () {
    if (!scope.isConnected) return;
    [].forEach.call(scope.querySelectorAll('.acsv-frow-text.clamp'), function (t) {
      if (t._armed) return; // 已判过（挂了按钮或确认不溢出）：不重复
      // 图未解码时量不准（ubb 产出的 img 无尺寸属性，0.9.105）——等齐了再判，一次 load 重测
      var imgs = t.querySelectorAll('img'), pending = 0;
      [].forEach.call(imgs, function (im) { if (!im.complete) pending++; });
      if (pending) {
        [].forEach.call(imgs, function (im) {
          if (im.complete) return;
          var once = function () {
            im.removeEventListener('load', once);
            im.removeEventListener('error', once);
            armExpanders(scope); // 重测这一批（_armed 防重复）
          };
          im.addEventListener('load', once);
          im.addEventListener('error', once);
        });
        return;
      }
      t._armed = true;
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
  // 回顶（借鉴广场 back-top；0.9.105 图标语言统一）：顶栏同款圆钮 .acsv-tbtn + chevUp SVG，
  // sticky 钉在滚动流右下，超 backTopAt 才现身（.on）
  var backTop = el('button', 'acsv-tbtn acsv-fbacktop');
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
    // 行内评论区内部（评论列表/输入条/表情面板/回复条）一律不参与行默认——**0.9.100 的病灶**：
    // 这些点击冒泡到本委托后落 rowDefault，点一下表情按钮就把评论区关掉换成详情面板
    //（用户实报「表情面板打不开」）；评论区自己的委托（commentListClick）已各自处理
    if (ev.target.closest('.acsv-frow-cmts')) return;
    var pi = row._pi;
    // 互动键已自挂监听（momentbar 共享件）——委托不再接 act 分支
    var more = ev.target.closest('.acsv-fmore');
    if (more) {
      var t = row.querySelector('.acsv-frow-text');
      if (t) {
        var clamped = t.classList.toggle('clamp');
        more.textContent = clamped ? '展开' : '收起';
      }
      return;
    }
    // 宫格图的大图查看由格子自挂（views.momentCellOf，含 stopPropagation）——委托不再接
    //（0.9.102 收口：此前两处各挂一份会双开）
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

// 动态详情出口注册（0.9.101；0.9.102 载荷改 repost）：views.quoteBlockOf 点源动态卡时要开
// momentdetail——views 不反向依赖本模块，走注入；pi 构造在 data.momentPiOfRepost（契约层）
setMomentOpener(function (rp) { openMomentDetail(momentPiOfRepost(rp)); });

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
