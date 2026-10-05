import { CFG } from './cfg.js';
import { coverUrl } from './imgurl.js';
import { ubbPlain } from './ubbtext.js';
import { fmtAgo, fmtDate, fmtWan, relTime } from './timefmt.js';
import { upOf } from './playitem.js'; // 作者契约单源（0.9.162 data.js 终解后，up 定型在播放契约件）

// ---------- 面板条目契约（0.9.162 自 data.js 终解拆出；原 0.9.62 落户） ----------
// 五类面板源（history/fav/rank/follow/square）的条目规整表 + 派发入口 + 动态附件
// （转发源 pi / 私信 extra 载荷）。唯一消费面：列表视图（zone/mypage/followview/squareview）、
// 详情面板落点（momentPiOfRepost→momentdetail 经 followview/squareview）、私信转发（momentExtraOf）。
// 图片字段（cover）一律经 imgurl.coverUrl 归一（0.9.76，同 playitem 头注）；
// 时间文案（dateText/fansText）一律出自 timefmt 纯函数。

// ---------- 视图面板条目契约（0.9.62）：三种来源规整成同一份字段 ----------
// { kind, acId, title, cover, progress, sub, up, dateText }——面板渲染与「点击进播放层（0.9.74）」
// 零分支（对齐顶部两源契约理念）。字段语义（0.9.82 统一条目模型起）：
//   up      作者契约（{id,name,img,isFollowing}|null）——**作者唯一出口**。榜单来源另带
//           fans/contrib/fansText/contribText/sign（随行作者卡专用，进播放层时由 playItemOf 剥掉）；
//           fav 由 dougaList 条目映射、history 由 histories[].user 映射（0.9.84 实测与本站
//           APP 家族 user 同形状：id 字符串 / name / headUrl / isFollowing）
//   sub     进度文案（history=「观看至xx:xx」）——0.9.82 起 fav 不再把作者名塞在这里（语义混用）
//   dateText 脚行右槽的时间文案（0.9.84 起）：**各源口径不同，由解析器各自拼好**——
//           历史=观看时间（fmtAgo：三天内相对、更早带年份）、收藏=稿件上传时刻（fmtDate 带年份）、
//           搜索=SSR 原样的发布日期、rank 不产（它的随行作者卡另有 meta）。取数口径与差异见
//           docs §3/§4.1/§4.2
//   desc    rank 简介（0.9.65）；meta   rank 原生 extra 三段（0.9.69）——其余来源为 undefined
// 返回 null = 非视频条目，调用方过滤（没有可解析的视频源，进播放层必失败）。
// 类型字段实测（docs/api-research.md §4/§6，2026-10-02）：
//   browse/history 的 resourceType 编码与收藏/榜单体系不同源——条目 2=普通视频（社区文档
//   「参数 1 视频 2 番剧」的释义在条目字段上不成立），必须连 videoId 一起校验、宁可漏不错；
//   rank/channel 的 contentType 2=视频 3=文章；dougaList 是纯视频端点无需过滤
// 解析器表（0.9.78 表驱动，IMG_POLICY 同款模式）：新来源 = 加一行表项 + 单测，不再往
// if 链里插分支。每个解析器往 it 上填字段，返回 false = 非视频条目（调用方过滤，宁可漏不错）
var PANEL_PARSERS = {
  history: function (raw, it) {
    if (raw.resourceType !== 2 || !raw.videoId) return false;
    it.acId = Number(raw.resourceId) || 0;
    it.title = raw.title || raw.dougaVideoTitle || '';
    it.cover = coverUrl(raw.cover);
    it.progress = raw.playedSeconds > 0 ? Number(raw.playedSeconds) : null;
    it.sub = raw.playedSecondsShow || '';
    // 作者（0.9.84）：histories[].user 与 douga/info 的 user **同形状**（APP 家族）——
    // 2026-10-03 用户登录态实测：{ id:"25380695"（字符串）, name, headUrl（头像）,
    // isFollowing, fanCount:"6337", contributeCount, signature, avatarFrame… }。
    // 所以历史条目**在列表层就有作者**：卡片首帧即出 @UP名 脚行，进播放层首帧就有头像与
    // 关注角标（此前误以为该形状未实测、只能等 douga/info 回包）
    var u = raw.user || {};
    it.up = upOf(u.id, u.name, coverUrl(u.headUrl), u.isFollowing);
    // 观看时间：browseTime 实测是**毫秒时间戳**（2026-10-03 实测值 1790961102971 / typeof number）。
    // 走 fmtAgo（0.9.85）：三天内相对文案，更早带年份的绝对日期。browseTimeGroup 是按日分组
    // 标题（"今天/昨天"），不是单条时间，用不得
    it.dateText = fmtAgo(Number(raw.browseTime));
    return true;
  },
  fav: function (raw, it) {
    it.acId = Number(raw.contentId) || 0;
    it.title = raw.contentTitle || '';
    it.cover = coverUrl(raw.contentImg);
    it.progress = raw.userPlayedSeconds > 0 ? Number(raw.userPlayedSeconds) : null;
    // 作者：docs §4.2 实测 dougaList 条目自带 userId/userName/userImg。0.9.82 起进 up 契约
    // ——此前作者名塞在 sub 里，与历史的「观看至xx:xx」共用一个字段（语义混用）
    it.up = upOf(raw.userId, raw.userName, coverUrl(raw.userImg), false);
    // 时间右槽 = 稿件**上传时刻**（contentCreateTime，实测毫秒时间戳 1790429958888，与 douga/info
    // 的 videoList[0].uploadTime 只差 9 秒，两接口互证）。用 fmtDate 出带年份的绝对日期：
    // 它是"内容属性"，老投稿必须有年份可判（0.9.85 用户实报"没年份判定、点进去才看得到"）。
    // **注意与站方页面的口径差**：站方 UP 空间页/v 页展示的是"发布时刻"（douga/info 的
    // createTimeMillis，实测同稿比上传时刻晚 5.16 天），收藏列表接口不提供该值，故此处按上传
    // 时刻显示——差异来源已记入 docs §4.2，不做静默对齐（要拿发布时刻得每张卡各发一发详情请求）
    it.dateText = fmtDate(Number(raw.contentCreateTime));
    return true;
  },
  rank: function (raw, it) {
    if (raw.contentType !== 2) return false;
    it.acId = Number(raw.dougaId || raw.contentId) || 0;
    it.title = raw.contentTitle || '';
    it.cover = coverUrl(raw.videoCover);
    // 简介：官方是 HTML，<br> 折行（0.9.69 原生同款——原生 description 保留 br 折行；
    // 渲染层 white-space:pre-line，超过 3 行由 CSS 裁）
    it.desc = String(raw.contentDesc || '').replace(/<br\s*\/?\s*>/gi, '\n').trim();
    // meta 三段结构化（0.9.69 对齐原生 video-card extra：图标+播放数、图标+评论数、
    // 图标+「发布于xx / 频道」——原生无「播放/评论」字样，图标代义）。文案契约层拼好，
    // rowOf 只按 k 出字形；判空拼装：无时间不留「发布于」孤字、无频道不留悬空斜杠。
    // 频道名实测在条目顶层 channelName（= channel.name，子频道名如「生活日常」），
    // 原生文案 = 名 + 「频道」；channel.parentName 是主分区（生活），非展示项
    var t = relTime(Number(raw.contributeTime) || 0);
    var ch = raw.channelName || (raw.channel || {}).name || (raw.channel || {}).channelName || '';
    it.meta = [
      { k: 'view', t: String(Number(raw.viewCount) || 0) },
      { k: 'comment', t: String(Number(raw.commentCount) || 0) },
      { k: 'time', t: (t ? '发布于' + t : '') + (ch ? (t ? ' / ' : '') + ch + '频道' : '') }
    ];
    // UP 随行卡（原生 up-card：视频卡按排名配对作者卡，无独立 UP 榜）：rankList 条目自带
    // fansCount/userImg/userSignature——getUserCardList 无粉丝数，UP 粉丝以此为准（§4.4/§6.1）；
    // 签名不截（原生 sign 全文渲染，3 行裁切在 CSS）；计数文案万格式（原生 353 / 3.3万）
    it.up = raw.userName ? {
      id: Number(raw.authorId || raw.userId) || 0,
      name: raw.userName,
      img: coverUrl(raw.userImg),
      isFollowing: false, // 榜单卡片不带关注态；进播放层后由 douga/info 的 user.isFollowing 回填
      fans: Number(raw.fansCount) || 0,
      contrib: Number(raw.contributionCount) || 0,
      fansText: fmtWan(raw.fansCount),
      contribText: fmtWan(raw.contributionCount),
      sign: String(raw.userSignature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim()
    } : null;
    return true;
  },
  // 关注流（0.9.91）：一个来源三种内容，靠 ct 判别（cross-来源见 ITEM_FIELDS.panel 注释）。
  // 端点与三类条目形状全部实测在册：docs/api-research.md §2.1.1（2026-10-03，内置浏览器登录态）
  follow: function (raw, it) {
    var u = raw.user || {};
    // 作者：followFeedV2 的 user 形状是 **userHead**（不是 meow 的 headUrl，也不是 APP 家族的
    // headUrl——三套并存的又一例，只在本解析器里认一次）。进播放层/卡面都走同一份 up 契约
    // nameColor 透传（0.9.157 真机核对：followFeedV2 20/20、followDougaFeed 10/10 的 user 都带）
    it.up = upOf(u.userId, u.userName, coverUrl(u.userHead), u.isFollowing, u.nameColor);
    it.dateText = fmtAgo(Number(raw.createTime));
    // 播放数只在视频/文章分支赋值；**动态不挂**——实测动态 viewCount 恒 0，「0 播放」不是
    // 信息是噪音（真数据复核截图发现；动态卡面只留三计数行）
    switch (raw.resourceType) {
      case 2: // 视频
        if (!raw.resourceId) return false;
        it.ct = 'video';
        it.acId = Number(raw.resourceId) || 0;
        it.title = raw.caption || '';
        it.cover = coverUrl(raw.coverUrl);
        it.views = fmtWan(raw.viewCount);
        it.share = Number(raw.shareCount) || 0;
        // 时长实测是**展示串**（"00:11"，2026-10-03 实测 typeof string）——直用不格式化；
        // 缺则不挂角标
        it.dur = raw.playDuration || '';
        // 互动行数值态（0.9.99 仿原生行内写链）：字段名对齐 rail 词汇，isLike/isThrowBanana
        // 两端点实测都在条目顶层（§2.1.1/§2.1.2）；赞走 setRealLike({id,kind:'home'})
        it.like = Number(raw.likeCount) || 0;
        it.comment = Number(raw.commentCount) || 0;
        it.banana = Number(raw.bananaCount) || 0;
        it.liked = !!raw.isLike;
        it.thrown = !!raw.isThrowBanana;
        return true;
      case 3: // 文章：与视频同族字段，差异只在正文型字段名（§2.1.1 实测）
        if (!raw.resourceId) return false;
        it.ct = 'article';
        it.acId = Number(raw.resourceId) || 0;
        it.title = raw.articleTitle || '';
        it.cover = coverUrl(raw.coverUrl);
        it.views = fmtWan(raw.viewCount);
        it.share = Number(raw.shareCount) || 0;
        // 互动行数值态只作**展示**（0.9.99）：文章赞/蕉写链未实测，行内不接写链（渲染层裁决）
        it.like = Number(raw.likeCount) || 0;
        it.comment = Number(raw.commentCount) || 0;
        it.banana = Number(raw.bananaCount) || 0;
        // 摘要 = beginParagraph（实测的正文引导段；description 该条为空串，是坑不是摘要源——
        // 见 §2.1.1）。文章卡是文本向的卡，摘要就是它区别于视频图卡的主体（0.9.93）
        it.desc = String(raw.beginParagraph || raw.description || '').trim();
        // 外链落点：文章页（upCardOf 同款 target=_blank；进不了播放层——解析链只覆盖视频）
        it.href = CFG.api.articleBase + it.acId;
        return true;
      case 10: // 动态
        if (!raw.resourceId) return false;
        it.ct = 'moment';
        it.momentId = Number(raw.resourceId) || 0;
        var mo = raw.moment || {};
        // 正文用嵌套 moment.text（**UBB 原文**）→ 渲染走 ubb.js 单源（表情/at/资源链）；
        // 接口另有 replaceUbbText（UBB 已换成 [表情] 明文占位）——那是给不做 UBB 的客户端的，
        // 我们不用它（intake「ubb/emotify 单源」）
        it.text = mo.text || raw.discoveryResourceFeedShowContent || '';
        // 多图契约（0.9.98 实测，用户实报「多图动态只出第一张」的病灶在此）：配图动态的嵌套
        // moment 带**紧凑 imgs[]**（{url 224 方缩略, expandedUrl 大图, originUrl 原图,
        // width/height}），无配图时整个字段缺席；顶层 coverUrl 恒=首图——多图时它只是
        // 其中之一，此前卡面只挂 coverUrl 就只剩第一张。同信息的冗长形状 imgInfos[]
        // （cdnUrls 三层嵌套）刻意不取：一物二源必漂移
        it.imgs = imgsOfMoment(mo);
        // 动态的**图像唯一权威 = moment.imgs**（0.9.105 实报「无配图却带官方封面」修复）：
        // 顶层 coverUrl 对无图动态恒非空——实测三类来源（2026-10-04：29 条动态 21 条无图）：
        // 官方默认封面池（tx-free-imgs 根路径乱码名 PNG，同张共享出现 3 次/2 次）、转发源
        // 封面（恒等律）、用户图——都不是「本条动态自己的配图」。契约层不再赋 it.cover，
        // 渲染层不再做 cover 兜底；转发源卡独家使用 repost.cover（不受影响）
        // 转发（23/36 实测占比）：repostSource 是完整分支条目，取**卡面 + 落点**所需
        //（源类型/源 id/源标题/源封面/源作者 + 视频源的时长与播放数；0.9.101 起源条可点，
        // id/up/text 是落点与详情面板的料）；源条文案与形态由渲染层按 ct 出。
        // 0.9.98 补 rs10（源是另一条动态，实测关注流实存 3/21）：此前漏接，这类卡被当
        // 原创渲染、误把源首图挂成作者自己的图。引用块取源正文明文 + 源首图。
        // 0.9.102（引用卡完全照原生）：视频/文章源内嵌**完整源内容卡**——契约补 dur（展示串
        // 直用）/views（万格式），渲染层与行内 strip 共用同一构建件（原生就是同款 markup 复用）；
        // up 形状：rs.user 与关注流条目同款（userId/userName/userHead，§2.1.1）
        var rs = raw.repostSource;
        function rsUp(u) {
          u = u || {};
          return upOf(u.userId, u.userName, coverUrl(u.userHead), false, u.nameColor); // 等级色同族透传（0.9.157）
        }
        if (rs && (rs.resourceType === 2 || rs.resourceType === 3)) {
          it.repost = {
            ct: rs.resourceType === 2 ? 'video' : 'article',
            id: Number(rs.resourceId) || 0,
            title: String(rs.caption || rs.articleTitle || ''),
            cover: coverUrl(rs.coverUrl),
            // 时长是展示串直用（同 follow 视频行）；播放数缺则不挂（不虚标 0）
            dur: String(rs.playDuration || ''),
            views: rs.viewCount != null ? fmtWan(rs.viewCount) : '',
            up: rsUp(rs.user)
          };
        } else if (rs && rs.resourceType === 10 && rs.resourceId) {
          var rsm = rs.moment || {};
          var rsImgs = Array.isArray(rsm.imgs) ? rsm.imgs : [];
          it.repost = {
            ct: 'moment',
            id: Number(rs.resourceId) || 0,
            title: ubbPlain(rsm.text || rs.discoveryResourceFeedShowContent || ''),
            cover: coverUrl((rsImgs[0] && (rsImgs[0].url || rsImgs[0].originUrl)) || rs.coverUrl),
            // 源正文**原文**（UBB）：引用卡内嵌正文与详情面板都靠它渲染（ubbPlain 投影不可逆；
            // 原生实测内嵌正文 UBB 已渲染出表情图——我们同走 ubb 单源）
            text: rsm.text || rs.discoveryResourceFeedShowContent || '',
            // 源多图（0.9.107 实报：外层 5104362 的源 5104327 列表载荷 imgs=2、引用卡只出
            // 首图；另一 rs 源带 6 张）——与主动态同款映射，引用卡宫格与详情面板共用
            imgs: imgsOfMoment(rsm),
            up: rsUp(rs.user)
          };
        }
        // 三计数（路线图 Phase 3 的动态卡规格）：复用 meta 三段语义与 META_GLYPH，不新增字段
        it.meta = [
          { k: 'like', t: String(Number(raw.likeCount) || 0) },
          { k: 'comment', t: String(Number(raw.commentCount) || 0) },
          { k: 'banana', t: String(Number(raw.bananaCount) || 0) }
        ];
        // 详情面板写链的数值态（0.9.96）：字段名对齐视频侧 rail 词汇（like/comment/banana
        // 数值 + liked/thrown 布尔），互动态实测在条目顶层（api-research §2.1.1/§4.7）。
        // meta 字符串三段保留给卡面计数行——两份并存是刻意的（卡面展示口径 vs 乐观更新
        // 需要的可变数值，合成一份会让卡面渲染耦合写链状态）
        it.like = Number(raw.likeCount) || 0;
        it.comment = Number(raw.commentCount) || 0;
        it.banana = Number(raw.bananaCount) || 0;
        it.share = Number(raw.shareCount) || 0;
        it.liked = !!raw.isLike;
        it.thrown = !!raw.isThrowBanana;
        // 落点实测：www.acfun.cn/moment/am<resourceId> 真渲染（2026-10-03，h1 与正文都在）；
        // 接口 shareUrl 是 m.acfun.cn/communityCircle/moment/<id> 分享链，PC 侧并档不用
        it.href = CFG.api.momentBase + it.momentId;
        return true;
      default:
        return false; // 其余 resourceType（直播等未观察到）一概不接——宁可漏不错
    }
  },
  // 动态广场（0.9.125，广场页数据源；实测依据 docs/api-research.md §2.7）：feedSquare 条目与
  // followFeedV2 动态条目**不同构**——无 resourceId（momentId 嵌在 moment.momentId 字符串）、
  // 无转发源（服务端已过滤，v3.3.0 起 1000 条样本 resourceType 全 10）、createTime 是**绝对
  // 毫秒**；user/userInfo 两形状归一。互动态在条目顶层但免登录恒 false——解析层照收不虚改，
  // 新鲜度刷新（≤3h 走 moment/detail）补偿在视图层
  square: function (raw, it) {
    if (!raw || raw.resourceType !== 10) return false; // 端点语义即纯动态（过滤=宁漏不错兜底）
    var u = raw.user || raw.userInfo || {};
    // 行名等级色（0.9.134；0.9.157 并入 upOf 第 5 参统一透传）：feedSquare 的 user 带 nameColor
    it.up = upOf(u.userId, u.userName, coverUrl(u.userHead), u.isFollowing, u.nameColor);
    it.dateText = fmtAgo(Number(raw.createTime));
    it.ct = 'moment';
    var mo = raw.moment || {};
    it.momentId = Number(mo.momentId) || 0;
    // 正文 UBB 原文（渲染走 ubb.js 单源；replaceUbbText 明文版不用，intake「ubb/emotify 单源」）
    it.text = mo.text || '';
    it.imgs = imgsOfMoment(mo);
    // 三计数（meta 三段语义，与 follow 同）+ 写链数值态：isLike/isThrowBanana 无登录态
    // 恒 false（§2.7 实测）——视图层对新鲜条目补真值，展示层不虚改
    it.meta = [
      { k: 'like', t: String(Number(raw.likeCount) || 0) },
      { k: 'comment', t: String(Number(raw.commentCount) || 0) },
      { k: 'banana', t: String(Number(raw.bananaCount) || 0) }
    ];
    it.like = Number(raw.likeCount) || 0;
    it.comment = Number(raw.commentCount) || 0;
    it.banana = Number(raw.bananaCount) || 0;
    it.share = Number(raw.shareCount) || 0;
    it.liked = !!raw.isLike;
    it.thrown = !!raw.isThrowBanana;
    // 落点：www.acfun.cn/moment/am<id>（与 follow 动态同款；接口 shareUrl 是 m.acfun 短链不用）
    it.href = CFG.api.momentBase + it.momentId;
    return true;
  }
};

// moment.imgs → 契约配图数组（0.9.107 抽出：主动态与转发源共用同一映射）
function imgsOfMoment(mo) {
  return (Array.isArray(mo && mo.imgs) ? mo.imgs : []).map(function (im) {
    im = im || {};
    return { url: coverUrl(im.url), big: coverUrl(im.expandedUrl || im.originUrl || im.url) };
  }).filter(function (im) { return im.url; });
}

// 关注流条目派发（0.9.91）：列表加载与"动态里转发的源条目"共用同一入口
export function followPanelOf(raw) {
  return raw ? panelItem('follow', raw) : null;
}

// 广场条目派发（0.9.125）：与 followPanelOf 同形——契约层过滤在 panelItem（身份判据/白名单），
// 视图只管渲染
export function squarePanelOf(raw) {
  return raw ? panelItem('square', raw) : null;
}

// 转发源（动态）→ 可开详情面板的 pi（0.9.102）：此前在 views.quoteBlockOf 里手搓契约
// 字段（UI 层定义契约=漂移源），下沉为纯函数——id/text/up/cover 由 repost 透传，计数未知
// 给 0（面板互动栏不虚标），评论区走管线真拉（sourceId=源 momentId）
export function momentPiOfRepost(rp) {
  return {
    ct: 'moment', kind: 'follow', momentId: rp.id, text: rp.text || '',
    href: CFG.api.momentBase + rp.id, up: rp.up || null, cover: rp.cover || '', dateText: '',
    // 源配图透传（0.9.107 实报：从引用卡点进详情"纯文字样式、实际有图"——hasMedia 看 imgs）
    imgs: rp.imgs || [],
    like: 0, comment: 0, banana: 0, liked: false, thrown: false
  };
}

// 动态 pi → 私信转发 extra 载荷（0.9.122）：发送侧（momentbar.momentShareItemOf）唯一拼装处。
// wire 走 ubbPlain 明文（官方客户端可读），本载荷带原始 UBB 正文/配图（限 9）/UP 供接收端
// 脚本富渲染真表情真图——extra 是脚本↔脚本通道，被服务端剥掉则降级文本动态卡（同 0.9.52
// 评论转发纪律）。momentId 取 pi.momentId，缺省从 href（/moment/am<id>）反推
export function momentExtraOf(pi) {
  pi = pi || {};
  var m = /\/moment\/am(\d+)/.exec(String(pi.href || ''));
  return {
    momentId: String(pi.momentId != null && pi.momentId !== '' ? pi.momentId : (m ? m[1] : '')),
    text: String(pi.text || ''),
    imgs: (pi.imgs || []).slice(0, 9).map(function (im) {
      im = im || {};
      return { url: im.url || '', big: im.big || im.url || '' };
    }).filter(function (im) { return im.url; }),
    up: pi.up ? { id: pi.up.id || '', name: pi.up.name || '' } : null
  };
}

// 视图面板条目契约（0.9.62）：三种来源规整成同一份字段；返回 null = 不可渲染条目，
// 调用方过滤（没有可解析的入口，进播放层/外链必失败）。
// 身份判据（0.9.91 放宽）：`(acId || momentId) && (title || text)`——动态条目既没有 acId
// 也没有 title（它的内容就是 text，落点靠 momentId 拼官方页 URL），是关注流带来的唯一结构差异；
// 其余来源仍要求 acId + title（放宽不改变它们的行为）
export function panelItem(kind, raw) {
  var p = PANEL_PARSERS[kind];
  if (!raw || !p) return null;
  var it = { acId: 0, title: '', cover: '', progress: null, sub: '', up: null, kind: kind };
  if (p(raw, it) === false) return null;
  return (it.acId || it.momentId) && (it.title || it.text) ? it : null;
}
