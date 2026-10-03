import { CFG } from './cfg.js';
import { testHook } from './dbg.js';
import { el } from './ui.js';
import { imgInto } from './imgload.js';
import { root, scroller } from './state.js';
import { parseRoute } from './route.js';
import { overlayOpen, overlayTeardown } from './overlay.js';
import { viewDef } from './viewreg.js';
import { FeedStore } from './feedstore.js';
import { GLYPHS } from './imicons.js';
import { renderCommentHtml } from './ubb.js'; // 动态正文 UBB 单源（0.9.91）
import { syncDock } from './sidebar.js';
import { syncTopbar } from './topbar.js';

// ---------- 子视图框架（0.9.62：#svfeed/<view>/<arg>，左栏入口的多页面宿主） ----------
// 设计契约（接口依据 docs/api-research.md）：
//  - hash 语法扩展现有竖刷路由（route.js）：数字段=深链置顶、字母段=子视图，复用
//    hashchange 单一驱动与 player.toggle 编排，不引入 pathname/pushState 新机制
//  - 视图打开时竖刷保活：scroller 隐藏 + 全视频暂停（paused 时间轴不推进，看门狗天然
//    不判冻，无需 visibility 特判）；返回时恢复在播条目；FeedStore 不销毁，回来继续刷
//  - 视图作为 overlay 栈的非模态层（id:'view'）：Esc 关闭——普通视图=回竖刷，
//    深界面（def.deep：搜索/播放层）=回"打开它的那个界面"
//  - 深界面与来源链（0.9.74）：进深界面（def.deep：搜索/播放层）把来源压进来源链（origins
//    栈，可两级：我的→搜索→播放）；来源可保活（非 def.volatile 的视图）则同时**挂起其 DOM**
//    （类名换 acsv-view-held + visibility:hidden ⇒ 盒子存活、滚动位不丢、跳过 build 原位复原；
//    换类名是因为 .acsv-view 是全项目与 harness 的「当前视图」定位锚，留两个同构节点会污染
//    既有断言）。def.volatile（播放层：握播放会话/定时器）不入链也不挂起——离开即真拆；
//    同屏换参（搜索换词）=替换链顶那层，不叠层。普通视图（我的/榜单）之间与 dock 直跳维持
//    旧语义：收旧 + 来源链作废
//  - 条目点击：走播放层（playlayer.openPlayer），不再插入竖刷队尾（0.9.74 契约变更）
// player→本模块单向调用（syncRouteView）；本模块不再 import player（0.9.74 删 playAc 的
// scrollToIndex 依赖后循环消失）
// 视图清单与 dock 元数据在 viewreg.js（registerView 的唯一真源；本模块只读 viewDef）。
// 本模块只管编排：进出/保活/来源链/面板 kit
var current = null;     // 当前视图 { id, arg, def, el }
var origins = [];       // 来源链：[{ view, arg, rec }]；rec 非空=被挂起的普通视图 DOM
var wasPlaying = false; // 切出时当前条是否在播（回来恢复播放，用户主动暂停态不打扰）

export function currentView() { return current ? current.id : null; }

// 条目点击出口（0.9.74）：由 playlayer 注册时注入（setItemOpener）——本模块不反向 import
// 播放层，循环依赖归零（旧 playAc 的 views→player 边随之消失）。未注入时点击无动作
var itemOpener = null;
export function setItemOpener(fn) { itemOpener = typeof fn === 'function' ? fn : null; }
// 来源界面名（来源链顶，空链/null view = 竖刷）：深界面的 dock 高亮与「向左返回」定位用它
export function originView() {
  if (!origins.length) return null;
  return origins[origins.length - 1].view || 'feed';
}

function pauseAllVideos() {
  if (!scroller) return;
  var vs = scroller.querySelectorAll('video');
  Array.prototype.forEach.call(vs, function (v) { if (!v.paused) v.pause(); });
}

function resumeCurrentVideo() {
  if (!scroller) return;
  var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
  var v = slide && slide.querySelector('video');
  if (v && v.paused) {
    var p = v.play();
    if (p && p.catch) p.catch(function () { }); // 自动播放策略拒绝时静默（用户手动起播）
  }
}

// 舞台隐藏：只在「可见→隐藏」跃迁记账。0.9.74 修：进深界面会经"列表→播放"两级，
// 旧实现每次 enterView 都重记 wasPlaying——彼时舞台早已隐藏、当前条已被暂停 ⇒ 覆盖成
// false，列表关掉后竖刷不再恢复播放
function stageHide() {
  if (!scroller || scroller.style.display === 'none') return;
  var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
  var v = slide && slide.querySelector('video');
  wasPlaying = !!(v && !v.paused);
  scroller.style.display = 'none';
  pauseAllVideos();
}

function stageShow(restore) {
  if (!scroller) return;
  // 显式 'block' 同 stageHide：'' 回落样式表值的坑不赌 scroller 的 CSS 现状
  scroller.style.display = 'block';
  if (restore) resumeCurrentVideo();
  wasPlaying = false;
}

// 真销毁一个视图记录（拆 DOM；overlay 栈由调用方统一收）
function destroyRec(rec) {
  if (!rec) return;
  if (rec.def.teardown) { try { rec.def.teardown(); } catch (e) { } }
  if (rec.el) rec.el.remove();
}

// 来源链整清：挂起的普通视图 DOM 一并销毁
function clearOrigins() {
  while (origins.length) {
    var o = origins.pop();
    if (o.rec) destroyRec(o.rec);
  }
}

// 当前视图收尾：先摘 current（close 回调 closeView 靠它守卫早退——0.9.63 教训：切换/
// teardown 路径不得动 hash），再拆
function dropCurrent() {
  var rec = current;
  current = null;
  destroyRec(rec);
}

// 视图关闭（Esc）：普通视图回竖刷；深界面回来源链顶，空链回竖刷
function closeView() {
  if (!current) return;
  if (current.def.deep) return backFromOrigin();
  if (location.hash !== '#' + CFG.hash) location.hash = CFG.hash;
}

// 深界面的返回动作（Esc 与顶栏「向左返回」共用）：回"打开它的那个界面"
export function backFromOrigin() {
  var top = origins.length ? origins[origins.length - 1] : null;
  var to = top && top.view ? CFG.hash + '/' + top.view
    + (top.arg == null || top.arg === '' ? '' : '/' + encodeURIComponent(top.arg)) : CFG.hash;
  if (location.hash !== '#' + to) location.hash = to;
}

// 进深界面时把来源压链；来源可保活（非 volatile 的视图）则挂起其 DOM 并留 rec
// volatile（播放层：握播放会话/定时器）= 不入链也不挂起——隐藏容器里继续出声绝不允许，
// 它自己的来源本来就在链上，Esc 直接回那一层
function holdOrigin(prev) {
  if (prev.def.suspend) { try { prev.def.suspend(); } catch (e) { } }
  prev.el.className = 'acsv-view-held'; // 换类名：q('.acsv-view') 是全局定位锚
  origins.push({ view: prev.id, arg: prev.arg, rec: prev });
}

function enterView(id, arg) {
  var def = viewDef(id);
  if (!def || !root) return false;
  var top = origins.length ? origins[origins.length - 1] : null;
  // 回来路径：目标＝来源链顶（深界面的来源）→ pop；顶着挂了 DOM 就原位复原（跳过 build）
  var back = !!(top && String(top.view || '') === String(id)
    && String(top.arg || '') === String(arg || ''));
  var rec = null;
  var replaced = false;
  if (back) {
    rec = top.rec;
    origins.pop();
  } else if (top && String(top.view || '') === String(id)) {
    // 同屏换参（搜索换词/顶栏再搜）：替换链顶那层——不叠新的，也不把旧屏当来源
    destroyRec(top.rec);
    origins.pop();
    replaced = true;
  }
  var prev = current;
  current = null; // 先摘 current：overlayTeardown→closeView 不得动 hash（0.9.63 教训）
  var heldRec = null;
  // 同 id 的 prev（搜索换词那一拍）不保活：那是同一个屏换了参数，留着就是双份 DOM
  if (prev && !back && !replaced && def.deep && !prev.def.volatile && prev.id !== id) {
    holdOrigin(prev);
    heldRec = prev;
  }
  if (prev && prev !== heldRec) destroyRec(prev);
  if (!def.deep) clearOrigins(); // 普通视图/回竖刷：来源链作废（dock 直跳语义）
  overlayTeardown(); // 换舞台：抽屉/弹窗/大图全部收掉，新界面从干净栈开始
  if (rec) {
    rec.el.className = 'acsv-view';
    rec.el.style.display = 'block';
    if (rec.def.resume) { try { rec.def.resume(); } catch (e) { } }
    current = rec;
    overlayOpen({ id: 'view', close: closeView }); // 非模态层：Esc=关闭
    return true;
  }
  stageHide();
  var e = el('div', 'acsv-view');
  var body = el('div', 'acsv-view-body');
  e.appendChild(body);
  root.appendChild(e);
  // 必须显式 'block'：CSS 里 .acsv-view 初始 display:none，'' 会回落到样式表值——
  // 0.9.62 黑屏 bug 根因（内容渲染了但容器不可见，harness 断言只查内联值被骗过）
  e.style.display = 'block';
  current = { id: id, arg: arg, def: def, el: e };
  overlayOpen({ id: 'view', close: closeView }); // 非模态层：Esc=关闭
  def.build(body, arg);
  return true;
}

// 最后一个视图退出（回竖刷）：拆当前 + 来源链作废 + 恢复舞台
function exitView(restore) {
  dropCurrent();
  overlayTeardown(); // 0.9.73 对称收尾：视图内新开的浮层随视图一并收
  clearOrigins();
  stageShow(!!(restore && wasPlaying));
}

// hashchange 主钩子（player.toggle 调；boot 的 hashchange 链唯一入口）
export function syncRouteView() {
  if (!root) return;
  var r = parseRoute();
  var def = viewDef(r.view);
  if (def) {
    if (!current || current.id !== r.view
      || String(current.arg || '') !== String(r.viewArg || '')) {
      enterView(r.view, r.viewArg);
    }
  } else if (current) {
    exitView(true);
  }
  // dock 高亮：深界面（搜索/播放）不在 dock 里——指向来源界面（来源链顶），空链回「推荐」
  syncDock(def && def.deep ? (originView() || 'feed') : r.view);
  // 顶栏按界面同步（0.9.73 四处复用；0.9.74：✕ 恒=退出脚本，深界面另出「向左返回」）。
  // searchCtx（0.9.75 补）：搜索视图本身，或从搜索页打开、尚未回到别处的播放层——顶栏输入框
  // 靠它决定「保持关键词 / 离开即清空」（离开＝回列表/竖刷，或经播放层再跳到别的界面）
  var deep = !!(def && def.deep);
  syncTopbar(r.view, r.viewArg, {
    deep: deep,
    searchCtx: r.view === 'search' || (deep && originView() === 'search')
  });
}

// 整流卸载（player.unmount 调）：不恢复播放（视频随后统一拆除），清当前视图与来源链
export function teardownViews() {
  dropCurrent();
  clearOrigins();
  stageShow(false);
}

// debug 构建测试钩子：harness 钉舞台记账与来源链（release 死码消除）
testHook('stage', function () {
  return {
    visible: !!(scroller && scroller.style.display !== 'none'),
    wasPlaying: wasPlaying,
    current: currentView(),
    origin: originView(),
    held: document.querySelectorAll('.acsv-view-held').length
  };
});

// ---- 面板 kit：条目行（cover+标题+meta，点击进播放层）与「加载更多」按钮 ----
// meta 行拼装规则：rank 走契约 meta 三段（原生 extra 图标位）；其余来源 sub 优先
// （历史=「观看至xx:xx」、收藏=UP 名），progress 仅在 sub 未表达时补显（收藏的续看秒数）
// 榜单 meta 段 kind → 原生字形（imicons.GLYPHS：原生 rank/list 浏览器实测码点）。
// 0.9.91 补 like/banana：关注流动态卡的三计数（点赞/评论/投蕉）复用同一张字形表，
// 码点来自 0.9.55/0.9.56 的动态卡互动区实测（feedLike 未点亮位 / banana）
var META_GLYPH = {
  view: GLYPHS.rankView, comment: GLYPHS.rankComment, time: GLYPHS.rankTime,
  like: GLYPHS.feedLike, banana: GLYPHS.banana
};

export function rowOf(pi, rank) {
  // 榜单条目走大卡+右侧 UP 卡（对齐原生 rlist 分栏）；历史/收藏维持小卡
  var row = el('div', 'acsv-vrow' + (pi.kind === 'rank' ? ' big' : ''));
  if (rank != null && pi.kind !== 'rank') {
    row.appendChild(el('div', 'acsv-vrow-rank' + (rank <= 3 ? ' top' : ''), String(rank)));
  }
  // 榜单排名=视频卡右下角大水印（原生视觉锚点）。定位宿主契约：必须挂在有
  // position:relative 的卡内（.acsv-vrow.big）——0.9.67 挂视图行上（行 static）
  // 致全部水印冒泡到 view-body 叠成一团，真机 dump offsetParent 实锤
  if (rank != null && pi.kind === 'rank') {
    row.appendChild(el('div', 'acsv-rlist-num', String(rank)));
  }
  var thumb = el('div', 'acsv-vrow-thumb');
  imgInto(thumb, pi.cover, 'thumb');
  row.appendChild(thumb);
  var main = el('div', 'acsv-vrow-main');
  main.appendChild(el('div', 'acsv-vrow-title', pi.title));
  if (pi.desc) main.appendChild(el('div', 'acsv-vrow-desc', pi.desc));
  // meta 行：rank=契约 meta 三段（图标代义，原生无「播放/评论」字样）；其余来源纯文本
  if (pi.kind === 'rank' && pi.meta) {
    var meta = el('div', 'acsv-vrow-meta');
    pi.meta.forEach(function (b) {
      var seg = el('span', 'acsv-vmeta-i');
      seg.appendChild(el('i', 'acsvg-glyph', META_GLYPH[b.k] || ''));
      if (b.t) seg.appendChild(document.createTextNode(b.t));
      meta.appendChild(seg);
    });
    main.appendChild(meta);
  } else {
    var bits = [];
    if (pi.sub) bits.push(pi.sub);
    if (pi.progress != null && pi.kind !== 'history') bits.push('看到 ' + fmtDur(pi.progress));
    main.appendChild(el('div', 'acsv-vrow-meta', bits.join(' · ')));
  }
  row.appendChild(main);
  row.addEventListener('click', function () { if (itemOpener) itemOpener(pi); });
  return row;
}

// 网格卡（0.9.69 我的页抖音式；0.9.83 卡面收口；0.9.91 关注流三内容型）：封面 + 封面角标
// + 标题/正文 + 计数行 + 脚行。与 rowOf 并列而非替换——rowOf 被 zone 消费且 0.9.67/68 断言
// 钉着它的类名与 watermark offsetParent 契约，共享导出的形状改动必须 grep 全消费点（既有教训）。
// 来源类共用这一张卡，差异全部由契约字段决定（消费点已 grep：mypage.js ×2、searchview.js、
// followview.js——0.9.91 起）：
//   封面左下角标 = 进度/属性语义位：历史 sub=「观看至xx:xx」、收藏 progress=「看到 xx:xx」、
//     搜索/关注视频 views=播放数（右下另有时长 .acsv-gdur）、关注文章=「文章」（ct 判别）
//   正文位（0.9.91，关注动态）：ct='moment' 时正文用 ubb 单源渲染（renderCommentHtml），
//     有图走标题位、无图占封面位（.acsv-gtext-tile，窄网格卡不留空封面）；站方同元素**不钳高**
//     （它是 830px 宽行卡），网格窄卡必须钳（见 styles 段注释，量取值在册）
//   计数行（0.9.91）：pi.meta（复用 rank 的三段语义）在脚行之上渲染，字形按 k 走 META_GLYPH
//   脚行 = **作者与时间的唯一落点**（@UP名 + 右槽时间）：四源都从这里出作者（历史条目的作者来自
//     histories[].user，0.9.84 实测与该站 APP 家族同形状，不是"卡面没有"）；右槽 = 搜索的发布
//     日期（SSR 原样）/ 收藏的稿件上传时刻（fmtDate，带年份）/ 历史的观看时间与关注流的条目时间
//     （fmtAgo：三天内相对文案、更早带年份）——各源取数口径见 data.js 解析器与 docs 各节
// 0.9.83 收口：作者与进度此前都在 meta 行（.acsv-gmeta）又各画了一遍——收藏卡出现
// 「石悦」/「@石悦」与「看到xx:xx」双份。现在作者只走脚行、进度只留角标，meta 行整体删除
// 外链语义（0.9.91）：pi.href 有值 → 根元素换 <a target=_blank rel=noopener>（文章/动态的
// 落点在站方页，进不了播放层——解析链只覆盖视频）；无 href → div + itemOpener（播放层直达）
export function gridCardOf(pi) {
  var cell = el(pi.href ? 'a' : 'div', 'acsv-gcell' + (pi.kind === 'search' ? ' acsv-scell' : ''));
  if (pi.href) {
    cell.href = pi.href;
    cell.target = '_blank';
    cell.rel = 'noopener'; // 对外新标签一律 noopener（upCardOf 同款纪律）
  }
  var cover = el('div', 'acsv-gcover');
  imgInto(cover, pi.cover, 'grid');
  // 封面角标 = 进度/属性语义位：历史 sub 就是「观看至xx:xx」（契约在册）；收藏只有续看秒数能进
  // 角标——没有时长算不出比例条，就不做比例条（不伪造）
  var tag = pi.kind === 'history' ? pi.sub
    : (pi.progress != null ? '看到 ' + fmtDur(pi.progress) : '');
  if (tag) cover.appendChild(el('div', 'acsv-gtag', tag));
  if (pi.views) {
    var vb = el('div', 'acsv-gtag acsv-gviews');
    vb.appendChild(el('i', 'acsvg-glyph', GLYPHS.rankView));
    vb.appendChild(document.createTextNode(pi.views));
    cover.appendChild(vb);
  }
  if (pi.dur) cover.appendChild(el('div', 'acsv-gdur', pi.dur));
  cell.appendChild(cover);
  cell.appendChild(el('div', 'acsv-gtitle', pi.title));
  // 计数行（meta 三段 + 字形）：rank 走 rowOf；关注流的动态三计数由 followview 的专属宽卡出
  //（0.9.93 起本函数只服务网格卡族：我的/搜索/关注流里的视频卡——内容型差异在各自卡型里表达）
  if (pi.meta && pi.meta.length) cell.appendChild(statRowOf(pi.meta));
  // 脚行：@UP名 + 右槽时间（抖音式；两字段皆空不挂节点）。右槽由契约层拼好（各源取数口径见
  // data.js 解析器）；无作者又无时间（如历史缺 user 的降级条目）整行不挂
  var upName = pi.up && pi.up.name ? pi.up.name : '';
  if (upName || pi.dateText) {
    var foot = el('div', 'acsv-gfoot');
    foot.appendChild(el('span', 'acsv-gup', upName ? '@' + upName : ''));
    foot.appendChild(el('span', 'acsv-gtime', pi.dateText || ''));
    cell.appendChild(foot);
  }
  if (!pi.href) cell.addEventListener('click', function () { if (itemOpener) itemOpener(pi); });
  return cell;
}

// UBB 正文块（0.9.91 起；0.9.93 供关注流的动态/转发卡）：内容走 ubb 单源渲染（表情/[at]/
// 资源链与评论同一条管线，接口另给的 replaceUbbText 明文版不用——intake「ubb/emotify 单源」）。
// 注：外链卡（根元素是 <a>）里会**嵌套** ubb 产出的 <a class="ubb-at">——这是 DOM 构造的
// 嵌套（createElement/appendChild 允许），不是 HTML 解析器的嵌套（那是非法的）：内层链接
// 在自己的命中区优先，其余区域走外层外链，行为符合预期，故不做剥离
export function ubbTextOf(text, cls) {
  var t = el('div', cls);
  t.innerHTML = renderCommentHtml(text || '');
  return t;
}

// meta 三段 → 计数行（0.9.93 抽出共享）：字形按 k 走 META_GLYPH；rank 的 meta 走 rowOf 的
// 另一种拼法，两处互不影响
export function statRowOf(meta) {
  var stat = el('div', 'acsv-gstats');
  (meta || []).forEach(function (m) {
    var s = el('span', 'acsv-gstat');
    var gl = META_GLYPH[m.k];
    if (gl) s.appendChild(el('i', 'acsvg-glyph', gl));
    s.appendChild(document.createTextNode(m.t));
    stat.appendChild(s);
  });
  return stat;
}

// 转发引用块（0.9.96 抽共享）：左竖线 + 源缩略图 + 源标题 + 源类型字——转发的结构性签名，
// followview 动态卡与 momentdetail 详情面板两处消费同一件（新重复即 lint 候选的先手）
export function quoteBlockOf(repost) {
  var q = el('div', 'acsv-gquote');
  var qt = el('div', 'acsv-gquote-thumb');
  imgInto(qt, repost.cover, 'thumb');
  q.appendChild(qt);
  var qb = el('div', 'acsv-gquote-body');
  qb.appendChild(el('div', 'acsv-gquote-title', repost.title || '（无标题）'));
  qb.appendChild(el('div', 'acsv-gquote-kind', (repost.ct === 'video' ? '视频' : '文章')));
  q.appendChild(qb);
  return q;
}

// 原生 up-card 等价物（rlist 右栏作者卡，横排）：大圆头像左+信息块右（名字 accent/签名/
// 数据位）。签名恒渲染（原生 p.sign 固定 3 行占位——空签名也占位，行高不随数据波动）；
// 数据位=投稿数+粉丝数（原生 up-card 两位 U+E15B/U+E155，万格式文案契约层拼好）。
// 整卡为 UP 主页链接（原生同款 target=_blank）
export function upCardOf(pi) {
  var card = el('div', 'acsv-upcard');
  var up = pi.up || {};
  var a = el('a', 'acsv-upcard-link');
  a.href = CFG.api.userBase + (up.id || '');
  a.target = '_blank';
  a.rel = 'noopener';
  // 头像走共享加载器：失败自动回落默认头像（本模块与 mypage 资料头同族策略）
  imgInto(a, up.img || CFG.api.defaultAvatar, 'avatar', 'acsv-upcard-avatar');
  var info = el('div', 'acsv-upcard-info');
  info.appendChild(el('div', 'acsv-upcard-name', up.name || ''));
  info.appendChild(el('p', 'acsv-upcard-sign', up.sign || ''));
  var extra = el('div', 'acsv-upcard-extra');
  var c1 = el('span', 'acsv-vmeta-i');
  c1.appendChild(el('i', 'acsvg-glyph', GLYPHS.share));
  c1.appendChild(document.createTextNode(up.contribText || '0'));
  var c2 = el('span', 'acsv-vmeta-i');
  c2.appendChild(el('i', 'acsvg-glyph', GLYPHS.fans));
  c2.appendChild(document.createTextNode(up.fansText || '0'));
  extra.appendChild(c1);
  extra.appendChild(c2);
  info.appendChild(extra);
  a.appendChild(info);
  card.appendChild(a);
  return card;
}

export function moreBtn(onClick) {
  var b = el('button', 'acsv-vmore', '加载更多');
  b.addEventListener('click', function () {
    if (b.disabled) return;
    b.disabled = true;
    b.textContent = '加载中…';
    // 防误传 null（0.9.77：收藏夹曾把回调传 null，点击抛 TypeError 且按钮卡死「加载中…」）
    if (typeof onClick === 'function') onClick(b);
  });
  return b;
}

function fmtDur(sec) {
  sec = Math.max(0, Number(sec) || 0);
  var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

// debug 构建测试钩子：harness 断言读当前视图（feedstore 快照同款惯例）
testHook('view', function () { return currentView(); });
