import { CFG } from './cfg.js';
import { el } from './ui.js';
import { imgInto } from './imgload.js';
import { openImageViewer } from './imgview.js';
import { GLYPHS } from './imicons.js';
import { renderCommentHtml } from './ubb.js'; // 动态正文 UBB 单源（0.9.91）
import { nameColorCss } from './uplook.js'; // 名字等级色（0.9.157 三色体系：默认白/等级红紫；0.9.160 叶子出库）

// ---------- 卡面 kit（0.9.109 自 views.js 拆出：编排 / 卡面分家） ----------
// 全项目卡面构建单源：网格卡（gridCardOf）/行卡（rowOf）/资源横条（stripOf）/引用卡
// （quoteBlockOf）/UP 卡（upCardOf）/计数行（statRowOf）/骨架（skeletonRows）。消费方：
// mypage、zone、searchview、followview、momentdetail；playlayer 经注入缝（setItemOpener）
// 注册条目出口。
// 0.9.219：`moreBtn`（「加载更多」按钮）**退役**——最后一个消费方（我的页 历史/收藏/分组）已改
// listtail 自动触底（该按钮范式与全站其余页不一致，见 listtail.js 头注）。
// 拆出纪律（0.9.109）：逐字搬运零逻辑改动——类名与 DOM 形状被 harness 断言钉着
//（0.9.67/68 水印 offsetParent 契约等，见 rowOf/gridCardOf 段头注），共享导出的形状
// 改动必须 grep 全消费点。依赖：本模块不 import views.js（编排不反向依赖卡面）、不反向
// import 播放层/详情面板——点击出口一律走下方注入缝。

// 条目点击出口（0.9.74）：由 playlayer 注册时注入（setItemOpener）——本模块不反向 import
// 播放层，循环依赖归零（旧 playAc 的 views→player 边随之消失）。未注入时点击无动作
var itemOpener = null;
export function setItemOpener(fn) { itemOpener = typeof fn === 'function' ? fn : null; }

// 条目点击出口的转发（0.9.99）：followview 互动行与 rowOf/gridCardOf 同门进播放层——
// 不直接 import playlayer（依赖方向维持本模块不反向依赖播放层），经注入的 opener 出
// ctx（0.9.173，可选第二参）：来源的**会话语境**（{kind:'list', items, idx, more} / {kind:'walk'}），
// 原样转给播放层——层内 ↓ 按它决定"下一条从哪来"（来源视图最懂自家列表语义）。缺省=单条。
// 可传函数形式（点击那刻求值，列表在会话中增长时拿到的是最新一份）
export function openPanelItem(pi, ctx) {
  if (itemOpener) itemOpener(pi, typeof ctx === 'function' ? ctx() : ctx);
}

// 动态详情出口（0.9.101；0.9.102 收口：载荷改为 **repost 对象**——pi 构造下沉
// data.momentPiOfRepost，契约字段不再由 UI 层拼装）。同款注入，避免本模块→momentdetail
// 反向依赖；未注册（理论上不会有：followview 随 bundle 加载）时调用方外链官方页兜底
var momentOpener = null;
export function setMomentOpener(fn) { momentOpener = typeof fn === 'function' ? fn : null; }

// 骨架行共享件（0.9.102 收口）：N 个占位 div + 移除闭包；**类名必传且各视图独立**
//（acsv-gskel/acsv-fskel——绝不与行/卡计数选择器同构，0.9.66 同构元素污染计数断言）
export function skeletonRows(listEl, n, cls) {
  var nodes = [];
  for (var i = 0; i < n; i++) {
    var d = el('div', cls);
    nodes.push(d);
    listEl.appendChild(d);
  }
  return function () {
    nodes.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
  };
}

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

export function rowOf(pi, rank, openCtx) { // openCtx：来源会话语境（0.9.173，可选）
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
  row.addEventListener('click', function () { openPanelItem(pi, openCtx); });
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
//     （fmtAgo：三天内相对文案、更早带年份）——各源取数口径见 panelitem.js 解析器与 docs 各节
// 0.9.83 收口：作者与进度此前都在 meta 行（.acsv-gmeta）又各画了一遍——收藏卡出现
// 「石悦」/「@石悦」与「看到xx:xx」双份。现在作者只走脚行、进度只留角标，meta 行整体删除
// 外链语义（0.9.91）：pi.href 有值 → 根元素换 <a target=_blank rel=noopener>（文章/动态的
// 落点在站方页，进不了播放层——解析链只覆盖视频）；无 href → div + itemOpener（播放层直达）
export function gridCardOf(pi, openCtx) { // openCtx：来源会话语境（0.9.173，可选；函数形式支持列表增长）
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
  // panelitem.js 解析器）；无作者又无时间（如历史缺 user 的降级条目）整行不挂
  var upName = pi.up && pi.up.name ? pi.up.name : '';
  if (upName || pi.dateText) {
    var foot = el('div', 'acsv-gfoot');
    foot.appendChild(el('span', 'acsv-gup', upName ? '@' + upName : ''));
    foot.appendChild(el('span', 'acsv-gtime', pi.dateText || ''));
    cell.appendChild(foot);
  }
  if (!pi.href) cell.addEventListener('click', function () { openPanelItem(pi, openCtx); });
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

// 资源横条卡（0.9.100 自 followview 下沉，0.9.102 收口共享）：「封面左（时长 hover 浮层）+
// 标题右（600 单行省略）+ 播放数」——原生 member-feed-resource 形制的构建单源。两处消费：
// 关注行流的视频/文章行（item=pi），与引用卡内嵌的源内容卡（item=repost 透传字段）——原生
// 本身就是同款 markup 复用（§2.1.1 实测：内嵌源卡与顶层资源卡同规格），故同一套类名不加
// 前缀参数。仅消费 item.ct/title/cover/dur/views 五个字段
export function stripOf(item) {
  var strip = el('div', 'acsv-frow-strip');
  var cov = el('div', 'acsv-frow-scover');
  imgInto(cov, item.cover, 'grid');
  if (item.ct === 'article') cov.appendChild(el('span', 'acsv-frow-tag', '文章'));
  if (item.dur) cov.appendChild(el('span', 'acsv-frow-mdur', item.dur));
  strip.appendChild(cov);
  var bd = el('div', 'acsv-frow-sbody');
  bd.appendChild(el('div', 'acsv-frow-stitle', item.title || ''));
  if (item.ct === 'article' && item.desc) bd.appendChild(el('div', 'acsv-frow-sdesc', item.desc));
  var info = el('div', 'acsv-frow-sinfo');
  info.appendChild(el('i', 'acsvg-glyph', GLYPHS.rankView));
  info.appendChild(document.createTextNode(item.views || '0'));
  bd.appendChild(info);
  strip.appendChild(bd);
  return strip;
}

// 可点图片单元（0.9.102 大图挂法单源）：imgInto 缩略 + `_big`（expandedUrl）+ 点击开
// imgview；stopPropagation 防冒泡成宿主（行默认/背板关闭）。行宫格与引用卡源配图共用
//（0.9.109 订正：详情面板自带大图挂法，不经此件——原注释"面板宫格共用"已过期）
export function momentCellOf(cls, im) {
  var cell = el('div', cls);
  cell._big = im.big || im.url; // 大图转呈 expandedUrl（点缩略看大图，原生同款）
  imgInto(cell, im.url, 'grid');
  cell.addEventListener('click', function (ev) {
    ev.stopPropagation();
    openImageViewer(cell._big);
  });
  return cell;
}

// 动态媒体块 dispatcher（0.9.102 收口）：repost→引用卡；imgs≥opts.gridMin→opts.grid(pi)；
// 有 cover→opts.single(pi, im0)。行流=原生固定 px 形制（gridMin=1，单图也走宫格容器拿 299
// 自适应）——0.9.109 订正：唯一消费者是 followview（详情面板自带轮播/单图构建器，0.9.103
// 起不经本函数）；dispatcher 本身单源（0.9.100 时是两份复制）
export function momentMediaOf(pi, opts) {
  if (pi.repost) return quoteBlockOf(pi.repost);
  var n = pi.imgs ? pi.imgs.length : 0;
  if (n >= opts.gridMin) return opts.grid(pi);
  if (pi.cover || n) return opts.single(pi, n ? pi.imgs[0] : null);
  return null;
}

// 转发引用卡（0.9.96 抽共享；0.9.102 按原生形制重做——用户裁决「完全照原生」）。
// 原生实测（§2.1.1，2026-10-03）：转发行 = 转发者正文 + `.member-feed-repost-content`
//（#f8f8f8 灰块、padding 10、左出血 -10、**无竖线**），内部两段：
//   ① `.repost-up > .up-name`「@源UP」——14px/#666、下距 12、名字是**蓝链**（→ /u/uid）；
//   ② 源内容卡：视频/文章 = 与行内同款 stripOf（原生就是同款 markup 复用）；
//      动态（rs10）= **纯正文**（原生实测样本 UBB 已渲染、含表情图 48×48；配图动态源未观察
//      → 有图则首图最小形态，标未实测）。
// 点击语义（0.9.101 起）：@源UP → 源UP主页（锚点自导航，不冒泡）；源卡 → 视频播放层 /
// 文章官方页 / 动态详情面板（setMomentOpener 注入，未注册外链兜底）；源 id 缺席保持静展示
export function quoteBlockOf(repost) {
  var q = el('div', 'acsv-gquote');
  // ① @源UP 行
  var up = el('div', 'acsv-gquote-up');
  var name = el('a', 'acsv-gquote-upname', '@' + (repost.up && repost.up.name ? repost.up.name : ''));
  if (repost.up && repost.up.id) {
    name.href = CFG.api.userBase + repost.up.id;
    name.target = '_blank';
    name.rel = 'noopener';
  }
  // 名字等级色（0.9.157 三色体系）：与行卡/面板同源同码——等级红/紫内联覆盖默认白
  var ncss = nameColorCss(repost.up && repost.up.nameColor);
  if (ncss) name.style.color = ncss;
  // 名字是独立落点（源 UP 主页）：锚点自己导航，不冒泡成源卡点击/行默认
  name.addEventListener('click', function (ev) { ev.stopPropagation(); });
  up.appendChild(name);
  q.appendChild(up);
  // ② 源内容卡
  if (repost.ct === 'video' || repost.ct === 'article') {
    q.appendChild(stripOf(repost));
  } else {
    var txt = el('div', 'acsv-gquote-text');
    txt.appendChild(ubbTextOf(repost.text || repost.title || '', 'acsv-gquote-textbody'));
    q.appendChild(txt);
    // 源配图（0.9.107 实报修复：此前只出 cover 首图）：多图=行流九宫格形制（n1/n24，
    // 格子自挂大图——复用主动态同一套件）；无 imgs 才退 cover 单图（老数据兜底）
    var rImgs = repost.imgs || [];
    if (rImgs.length) {
      var box = el('div', 'acsv-frow-imgs');
      if (rImgs.length === 1) box.classList.add('n1');
      else if (rImgs.length === 2 || rImgs.length === 4) box.classList.add('n24');
      rImgs.forEach(function (im) { box.appendChild(momentCellOf('acsv-frow-img', im)); });
      q.appendChild(box);
    } else if (repost.cover) {
      var img = el('div', 'acsv-gquote-img');
      imgInto(img, repost.cover, 'grid');
      q.appendChild(img);
    }
  }
  if (repost.id) {
    q.classList.add('acsv-gquote-on');
    q.addEventListener('click', function (ev) {
      if (ev.target.closest('.acsv-gquote-upname')) return; // @源UP 走自己的锚点
      ev.stopPropagation(); // 不冒泡成宿主行/卡的行默认动作（开转发本身）
      if (repost.ct === 'video') {
        openPanelItem({ acId: Number(repost.id) || 0, title: repost.title || '', cover: repost.cover || '', up: repost.up || null });
      } else if (repost.ct === 'article') {
        window.open(CFG.api.articleBase + repost.id, '_blank');
      } else if (repost.ct === 'moment') {
        if (momentOpener) {
          // 源动态 → 详情面板（pi 构造下沉 data.momentPiOfRepost，契约字段出 UI 层）
          momentOpener(repost);
        } else {
          window.open(CFG.api.momentBase + repost.id, '_blank');
        }
      }
    });
  }
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

function fmtDur(sec) {
  sec = Math.max(0, Number(sec) || 0);
  var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}
