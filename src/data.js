import { CFG } from './cfg.js';
import { coverUrl } from './imgurl.js';
import { ubbPlain } from './ubbtext.js';

// 图片字段（cover/head/avatar）一律经 imgurl.coverUrl 归一（0.9.76）：http:// 老条目在
// https 页面会被混合内容拦成裂图，归一在这里做一次，全部消费端（卡片/氛围底图/播放层）继承

// ---------- 数据层 ----------
// 两种内容源规整成同一份字段契约（feedstore/player/comments 只认这套字段）：
//   sv   小视频 meow（urls 直接可用）
//   home 首页推荐 selection/feed（卡片只有元信息，urls 由 douga/info+playInfo 懒解析）
// 能力差异收敛在 cap 上：player 等消费端按能力分支，不再散布 kind==='home'；
// 新内容源 = 新 normalize + 一份 cap 开关
//
// 作者契约（0.9.82）：作者从三个扁平字段（userName/userId/head/isFollowing）收敛为**一个
// 可空子对象** item.up{id,name,img,isFollowing}，缺失即 null——不编造占位文案。各来源只允许
// 在自家解析器里声明自家的字段名（5 个端点 5 种形状是事实，不消灭，只压缩成一行映射，
// 同 0.9.80「皮肤差异不当重复消灭」）；下游（slide/rail/interact/回填）一律只读 item.up。
// 此前搜索传 upName、收藏把作者塞进 sub、榜单传 up、播放契约又是扁平三件套——桥
// playlayer.itemOfPanel 只认榜单那一种，其余入口进播放层就退化成 '未知用户'（0.9.82 病灶）。
export function upOf(id, name, img, isFollowing) {
  var n = String(name || '').trim();
  var i = Number(id) || 0;
  if (!n && !i) return null; // 无名无 id：作者未知（不伪造）
  return { id: i, name: n, img: img || '', isFollowing: !!isFollowing };
}

// 契约字段白名单（可执行契约，0.9.82）：test/unit/contract.test.js 断言各来源产出 ⊆ 本表
// ——新来源自带字段名会在单测直接红。play 侧作者只有 up 一个出口（顶层 userName/userId/head/
// isFollowing 已退役），panel 侧作者同样只有 up（fav 原来的 sub 作者名已迁出）
export var ITEM_FIELDS = {
  play: ['kind', 'stype', 'id', 'title', 'up', 'cover', 'urls', 'urlIdx', 'refreshed', 'cap',
    'resolving', 'videoId', 'channel', 'qualities', 'qIdx', 'like', 'comment', 'view',
    'banana', 'fav', 'share', 'danmakuCount', 'date', 'shareUrl', 'liked', 'favorited',
    'thrown', 'localLike'],
  panel: ['kind', 'acId', 'title', 'cover', 'dur', 'views', 'dateText', 'desc', 'progress',
    'sub', 'meta', 'up',
    // 关注流（0.9.91）：content type 判别子与动态卡字段。ct 与 kind 正交——kind 在契约里是
    // **来源方言**（= PANEL_PARSERS 的表键），不能兼内容类型；关注流一个来源出三种内容，
    // 故内容判别子另立 ct（video|article|moment），卡片渲染按 ct 分支（同一张卡，契约驱动）
    'ct', 'momentId', 'text', 'href', 'repost',
    // 0.9.98 动态多图：配图列表（{url 缩略, big 大图}[]，来自嵌套 moment.imgs——0.9.91 时
    // 以为 feed 只给单张 coverUrl，实报「多图只出第一张」后实测形状在册）
    'imgs',
    // 0.9.99 仿原生互动行：分享计数（shareCount 在三族条目顶层计数族，§2.1.1/§2.1.2 实测）
    'share',
    // 0.9.96 详情面板写链：数值计数与互动态（字段名对齐 rail 词汇，见 follow 解析器注释）
    'like', 'comment', 'banana', 'liked', 'thrown']
};

export function normalize(raw) {
  var play = raw.playInfo || {};
  var urls = (play.videoUrls || []).map(function (u) { return u && u.url; })
    .filter(function (u) { return u && /^https?:/.test(u); });
  var covers = play.coverUrls && play.coverUrls.length ? play.coverUrls
    : (play.firstFrameUrls || []);
  var user = raw.user || {};
  var counts = raw.meowCounts || {};
  return {
    kind: 'sv',
    stype: 5,
    id: raw.meowId || 0,
    title: raw.meowTitle || raw.intro || '#AcFun小视频',
    up: upOf(user.userId, user.name, coverUrl(user.headUrl), user.isFollowing),
    cover: covers.length ? coverUrl(covers[0].url) : '',
    urls: urls,
    urlIdx: 0,
    refreshed: false,
    // sv：直链 mp4、无弹幕/清晰度/投蕉/收藏，无需懒解析与观看上报
    cap: {
      hls: false, danmaku: false, quality: false, banana: false,
      favorite: false, lazyResolve: false, watchReport: false
    },
    like: counts.likeCount || 0,
    comment: counts.commentCount || 0,
    view: counts.viewCount || 0,
    // 与 home 契约对齐的零值字段：sv 不提供这些数据，但消费端可无分支地 fmt()
    banana: 0,
    fav: 0,
    share: 0,
    danmakuCount: 0,
    favorited: false,
    thrown: false,
    // meow 源的 createTime 实测是日期串（feed-sample: "2019-09-06"），且该流无毫秒兄弟字段，
    // 故仍按"日期串切前 10 位"取。⚠️ 若哪天真机发现它也返回相对文案（APP 家族的 douga/info
    // createTime 就是 "24小时前" 这种展示串，见 appapi.resolve 的 0.9.85 注释），同法改成
    // 先取毫秒字段再 fmtDate
    date: (raw.createTime || '').slice(0, 10),
    shareUrl: raw.shareUrl || (CFG.api.shareBase + raw.meowId),
    liked: !!raw.isLike,
    localLike: false
  };
}

// selection/feed 的视频卡片（resourceType=2）→ 契约字段；urls/qualities 待 resolve
export function normalizeHome(bc) {
  var user = bc.user || {};
  var visit = bc.visit || {};
  return {
    kind: 'home',
    stype: 3,
    id: Number(bc.href) || 0,
    title: bc.title || '',
    up: upOf(user.userId, user.name, coverUrl(user.headUrl), user.isFollowing),
    cover: coverUrl(bc.img && bc.img[0]),
    urls: [],
    urlIdx: 0,
    refreshed: false,
    // home：m3u8（hls.js）+ 弹幕 + 清晰度 + 投蕉/收藏；卡片懒解析；可上报观看历史
    cap: {
      hls: true, danmaku: true, quality: true, banana: true,
      favorite: true, lazyResolve: true, watchReport: true
    },
    // 懒解析状态：resolving 防并发（ensureResolved 在途复用同管）
    resolving: false,
    videoId: '',
    channel: null,
    qualities: null,
    qIdx: 0,
    like: 0, // 卡片不带点赞数，resolve 时由 douga/info 的 likeCount 回填
    banana: visit.bananas || 0,
    comment: visit.comments || 0,
    view: visit.views || 0,
    fav: 0,   // 收藏数（resolve 回填 stowCount）
    share: 0, // 分享数（resolve 回填 shareCount）
    danmakuCount: 0,
    date: '',
    shareUrl: CFG.api.videoBase + (Number(bc.href) || ''),
    liked: false,
    favorited: false,
    thrown: false, // 是否已投过蕉（douga/info 的 isThrowBanana 回填；投蕉不可取消）
    localLike: false
  };
}

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
    it.up = upOf(u.userId, u.userName, coverUrl(u.userHead), u.isFollowing);
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
          return upOf(u.userId, u.userName, coverUrl(u.userHead));
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
    it.up = upOf(u.userId, u.userName, coverUrl(u.userHead), u.isFollowing);
    // 行名等级色（0.9.134）：feedSquare 的 user 带 nameColor（plaza 真机代码在册；0/缺失不加色）
    if (it.up) it.up.nameColor = Number(u.nameColor) || 0;
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

// 关注视频流单页规整（0.9.99，§2.1.2 实测）：followDougaFeed 响应 → {items:[{id:acId}],
// nextCursor, noMore}。只收 resourceType=2（端点语义即纯视频，过滤是宁漏不错的最后防线）；
// 终判 pcursor='no_more'（实测终值）/空壳/空页。**纯函数**放契约层——followstream 的
// loadFollowPage 转发它，单测直采不必拉起竖刷依赖图
export function followVideoPageOf(j) {
  var raws = (j && j.feedList) || [];
  var items = raws.filter(function (r) { return r && r.resourceType === 2 && r.resourceId; })
    .map(function (r) { return { id: Number(r.resourceId) }; });
  var next = j && j.pcursor != null ? String(j.pcursor) : '';
  var noMore = next === 'no_more' || !raws.length || !items.length;
  return { items: items, nextCursor: noMore ? '' : next, noMore: noMore };
}

// ---------- 关注分组契约（0.9.142；字段真机核对 2026-10-04，docs/api-research.md §2.2/§2.3/§2.6） ----------
// 组列表规整：getGroups → groupList[] {groupId, groupName, followingCount(Show)} → [{id, name, count}]。
// **真机要点**：id 一律字符串（接口回显即字符串，DOM dataset/比较同纪律）；**「未分组」是
// groupId="0" 的普通项**（实测 7 组含它、14 人）——不是"缺省值"，选它=移出所有分组
export function groupListOf(j) {
  var raws = (j && j.groupList) || [];
  var out = [];
  raws.forEach(function (g) {
    if (!g || g.groupId == null || g.groupId === '') return;
    out.push({
      id: String(g.groupId),
      name: String(g.groupName == null ? '' : g.groupName),
      count: g.followingCount != null ? Number(g.followingCount) || 0 : null
    });
  });
  return out;
}

// 关注成员分页规整：getFollows（action=9 组内 / 7 全部）→ {items, nextCursor, total, noMore}。
// **游标口径**：响应 pcursor 是**偏移量**（实测 "20"→"40"），与 followFeedV2 的毫秒时间戳不同源
// ——勿跨域复用游标（relationapi 内独立收口）。条目自带 groupId/groupName（成员归属，
// 管理页行上直接可显）；头像读序 userImg → userHeadImgInfo.thumbnailImageCdnUrl
export function followListPageOf(j) {
  var raws = (j && j.friendList) || [];
  var items = [];
  raws.forEach(function (u) {
    if (!u || u.userId == null || u.userId === '') return;
    items.push({
      id: String(u.userId),
      name: String(u.userName == null ? '' : u.userName),
      head: userHeadOf(u),
      sign: String(u.signature == null ? '' : u.signature),
      fans: u.fanCountShow != null ? String(u.fanCountShow) : '',
      contrib: u.contributeCountShow != null ? String(u.contributeCountShow) : '',
      groupId: u.groupId != null ? String(u.groupId) : '',
      groupName: String(u.groupName == null ? '' : u.groupName)
    });
  });
  // 终值 'no_more'（真机实测：最后一页回 pcursor:"no_more"）与空页同判到底；偏移量游标仅在上限内递交
  var next = j && j.pcursor != null ? String(j.pcursor) : '';
  var noMore = !items.length || !next || next === 'no_more';
  return {
    items: items,
    nextCursor: noMore ? '' : next,
    total: j && j.totalCount != null ? Number(j.totalCount) || 0 : null,
    noMore: noMore
  };
}

function userHeadOf(u) {
  if (u.userImg) return String(u.userImg);
  var t = u.userHeadImgInfo && u.userHeadImgInfo.thumbnailImageCdnUrl;
  return t ? String(t) : '';
}

// 建组后的新 id 定位（**兜底路径**：响应无 groupId 的旧形态）——拿 before 的 id 集与 after
// 的组列表做差集。**真机复验（2026-10-04）：现形态响应带 `{result:0, groupId}`，
// relationapi.createGroup 优先取响应 id、本函数仅作兜底**（旧记载"必须差集"已订正）。
// 同名组本就存在（after 里有两项同名且都不是新 id）时返回 ''，调用方按"重名"提示
export function newGroupIdOf(beforeIds, afterList, name) {
  var old = {};
  (beforeIds || []).forEach(function (id) { old[String(id)] = 1; });
  for (var i = 0; i < (afterList || []).length; i++) {
    var g = afterList[i];
    if (!old[g.id] && g.name === name) return g.id;
  }
  return '';
}

// 组名/夹名校验（站点 chunk 实锤正则 + 保留名；返回 '' = 通过，否则内联提示文案）。
// 真机边界：组名 1~8 字、收藏夹名 1~40 字，均只许中英文/数字/下划线（**无空格连字符**）；
// 组名另禁保留名「未分组/特别关注」（chunk 校验正则，§2.6）
var GROUP_NAME_RE = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,8}$/;
var FOLDER_NAME_RE = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,40}$/;
export function groupNameError(name) {
  var s = String(name == null ? '' : name).trim();
  if (!s) return '请输入分组名';
  if (!GROUP_NAME_RE.test(s)) return '1~8 个字，仅限中英文、数字、下划线';
  if (s === '未分组' || s === '特别关注') return '「' + s + '」是保留名，换一个';
  return '';
}
export function folderNameError(name) {
  var s = String(name == null ? '' : name).trim();
  if (!s) return '请输入收藏夹名';
  if (!FOLDER_NAME_RE.test(s)) return '1~40 个字，仅限中英文、数字、下划线';
  return '';
}

// ---------- 收藏夹契约（0.9.143；字段真机核对 2026-10-04，docs/api-research.md §4.2） ----------
// 夹列表规整：folder/list → dataList[] {folderId, name, resourceCount, inFolder} → [{id,name,count,inFolder}]。
// **inFolder 只在请求带 resourceId 时才有意义**（收藏弹窗的勾选态数据源，§4.2 实测）；不带时恒缺省
export function folderListOf(j) {
  var raws = (j && (j.dataList || j.data)) || [];
  var out = [];
  raws.forEach(function (f) {
    if (!f || f.folderId == null) return;
    out.push({
      id: String(f.folderId),
      name: String(f.name == null ? '' : f.name),
      count: f.resourceCount != null ? Number(f.resourceCount) || 0 : null,
      inFolder: !!f.inFolder
    });
  });
  return out;
}

// 建夹响应 → 新夹 id：真机形状 `{result:0, data:{folderId, name, resourceCount, …}}`（data 是夹 meta）。
// 拿不到 data 的形态（纯 {result:0}）返回 ''——调用方回查夹列表兜底
export function folderIdOf(j) {
  var d = (j && j.data) || j || {};
  return d.folderId != null && d.folderId !== '' ? String(d.folderId) : '';
}

// 广场流单页规整（0.9.125，§2.7 实测；0.9.126 收口 **24h 窗口**；0.9.127 出 **freshIds**）：
// feedSquare 响应 → {items:[pi], nextCursor, noMore, freshIds}。窗口=广场的原味（plaza：翻到
// 发布 >24h 即止）——超窗条目逐条剔除且**直接判到底**（首屏/翻页两态同此判据）；freshIds=
// 窗口内且发布 ≤3h 的 momentId（视图据此走 moment/detail 补互动态真值——免登录列表的
// isLike/isThrowBanana 恒 false）；**result!==0 = 失败（throw）**——调用方区分「失败可重试」与
// 「到底」，绝不许把失败当到底；终判 pcursor='no_more'。**纯函数**放契约层，单测直采
export function squarePageOf(j) {
  if (!j || j.result !== 0) throw new Error('square-fail');
  var raws = Array.isArray(j.feedList) ? j.feedList : [];
  var now = Date.now();
  var cutoff = now - CFG.view.square.windowMs;
  var items = [];
  var freshIds = [];
  var crossed = false;
  raws.forEach(function (raw) {
    var t = Number(raw && raw.createTime) || 0;
    if (t && t < cutoff) { crossed = true; return; } // 超 24h 窗口：剔除并标记边界
    var pi = squarePanelOf(raw);
    if (pi) {
      items.push(pi); // 契约层过滤（宁漏不错）
      if (t && now - t <= CFG.view.square.freshMs) freshIds.push(pi.momentId);
    }
  });
  var next = j.pcursor != null ? String(j.pcursor) : '';
  var noMore = crossed || next === 'no_more' || !raws.length || !items.length;
  return { items: items, nextCursor: noMore ? '' : next, noMore: noMore, freshIds: freshIds };
}

// 单条动态详情状态（0.9.127，moment/detail 回填用；字段名 plaza 实测转引 §2.7）：只为
// 「新鲜条目互动态回填」取五件——moment 对象上的 likeCount/commentCount/bananaCount 与
// isLike/isThrowBanana（详情才带登录态）。失败/形状不合返回 null，调用方静默保持列表快照
export function momentDetailStateOf(j) {
  if (!j || j.result !== 0 || !j.moment) return null;
  var mo = j.moment;
  return {
    liked: !!mo.isLike,
    thrown: !!mo.isThrowBanana,
    like: Number(mo.likeCount) || 0,
    comment: Number(mo.commentCount) || 0,
    banana: Number(mo.bananaCount) || 0
  };
}

// ---------- 评论观感纯函数（0.9.134；字段名真机双源核对在册：视频 sourceType=3 与动态=4） ----------
// 名字等级色：nameColor 2=紫、1=红、0/缺失=不加内联色（plaza 真机值；双源回包三值齐见）
export function nameColorCss(v) {
  var n = Number(v) || 0;
  return n === 2 ? '#964cfd' : n === 1 ? '#fd4c5c' : '';
}
// 头像框 URL：thumbnailImageCdnUrl 优先，回退 thumbnailImage.cdnUrls[0].url（双源实测形状）
export function frameUrlOf(c) {
  if (!c || !c.avatarFrameImgInfo) return '';
  var f = c.avatarFrameImgInfo;
  if (f.thumbnailImageCdnUrl) return f.thumbnailImageCdnUrl;
  var u = f.thumbnailImage && f.thumbnailImage.cdnUrls && f.thumbnailImage.cdnUrls[0];
  return (u && u.url) || '';
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

// 面板/搜索条目 → 播放层条目（0.9.82 下沉自 playlayer.itemOfPanel）。原来这层桥躺在
// playlayer.js——要 DOM 依赖、不是纯函数，既进不了 node --test，也只认榜单的 up（本次病灶）。
// 作者只做四件套归一：榜单的作者卡扩展字段（fans/sign…）不带进播放层；缺作者则留 null，
// 等 resolve 链回填（appapi.resolve 写 item.up）。
export function playItemOf(pi) {
  var item = homeItemOf(pi.acId, pi.title, pi.cover);
  if (pi.up) item.up = upOf(pi.up.id, pi.up.name, pi.up.img, pi.up.isFollowing);
  return item;
}

// ---------- 个人资料卡契约（0.9.69）：getUserCardList 回包 → 我的页头部字段 ----------
// 字段全部来自实测登记端点（docs/api-research.md §4.4：headUrl/name/signature/contentCount/
// following/followed），**缺省一律 null**——渲染层判空隐藏，不伪造未实测的数据。
// following/followed → 关注/粉丝 的语义待真机核对（站点口径若不同只改这里的映射，
// 渲染层零分支）；uid 过滤失败时退第一条（回包里只有一条时同款）
export function meCardOf(j, uid) {
  var users = (j && j.result === 0 && j.users) || [];
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i] && users[i].id) === String(uid)) { u = users[i]; break; }
  }
  u = u || users[0];
  if (!u || !u.id) return null;
  return {
    uid: Number(u.id) || 0,
    name: u.name || '',
    avatar: coverUrl(u.headUrl),
    sign: String(u.signature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim(),
    contrib: u.contentCount != null ? Number(u.contentCount) || 0 : null,
    follow: u.following != null ? Number(u.following) || 0 : null,
    fans: u.followed != null ? Number(u.followed) || 0 : null
  };
}

// 面板条目 → 竖刷 home 契约 item（懒解析：进播放器后 resolve 链回填直链与全量计数）。
// user 留空 → up 为 null（0.9.82：作者未知就是 null，不再编造 '未知用户' 占位；
// 回包后由 appapi.resolve 回填 + onHomeResolved 刷渲染）
export function homeItemOf(acId, title, cover) {
  var c = coverUrl(cover);
  return normalizeHome({ href: String(acId), title: title || '', img: c ? [c] : [] });
}

// ---------- 深链判据（0.9.72，纯函数，离线单测） ----------
// 地址栏深链的 id 跨两个 id 空间（见 route.js parseHash 注释）：meow 详情 / douga 详情二选一
// → { item, source }；两者皆未命中 = 该 id 不是可播放视频 → null（调用方出错误盒，
// **不**回落随机流）。命中要求：meow 必须带直链（sv 直链随详情下发，无直链即不可播）；
// douga 必须 result=0 且 videoList 非空（否则后续 playInfo 必空——appapi.resolve 同款判据）。
// home 条目直链留空交懒解析链补（home 卡片本就 urls:[]，cap.lazyResolve 已在契约里）；
// id 取请求用的 acId 本身（douga/info 回包不带 dougaId，且 resolve 要用它回查）
export function deepLinkOf(meow, douga, mid) {
  if (meow && meow.id && meow.urls && meow.urls.length) return { item: meow, source: 'sv' };
  if (douga && douga.result === 0 && (douga.videoList || []).length) {
    return {
      item: homeItemOf(mid, String(douga.title || ''), String(douga.coverUrl || '')),
      source: 'home'
    };
  }
  return null;
}

// 榜单 extra 的相对时间（0.9.69 对齐原生「发布于xx」四档，日历判定）：
// 今天 <1h「N分钟前」/ 今天「N小时前」/ 昨天「昨天H时MM分」/ 前天「前天H时MM分」/
// 更早「M月D日 H时MM分」（MM 补零、H 不补零——原生实测 0时10分 / 8时00分）。
// now 可注入：日历判定纯函数化，单测钉跨日/跨月/跨年边界（不注入则用当前时间）；
// 脏输入/未来时间降级空串。dayDiff 用本地零点差值 round（DST 23/25 小时日不误判）
export function relTime(ms, now) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var n = Number(now) || Date.now();
  var diff = n - t;
  if (diff < 0 || isNaN(diff)) return '';
  var dt = new Date(t), nd = new Date(n);
  var hm = dt.getHours() + '时' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes() + '分';
  var dayDiff = Math.round(
    (new Date(nd.getFullYear(), nd.getMonth(), nd.getDate())
      - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  if (dayDiff <= 0) {
    var min = Math.floor(diff / 60000);
    if (min < 60) return Math.max(1, min) + '分钟前';
    return Math.floor(diff / 3600000) + '小时前';
  }
  if (dayDiff === 1) return '昨天' + hm;
  if (dayDiff === 2) return '前天' + hm;
  return (dt.getMonth() + 1) + '月' + dt.getDate() + '日 ' + hm;
}

// 本地时区 YYYY-MM-DD（0.9.85）。**不要用 toISOString().slice(0,10)**：那是 UTC，
// 本地凌晨/晚上会整体差一天（既有 resolve 兜底分支就踩过）
export function fmtDate(ms) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var d = new Date(t);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// 卡片上的"时间"文案（0.9.85）：今天/昨天/前天走 relTime 的相对文案（今天8小时前 / 昨天20时36分 /
// 前天14时02分——不带年份也不会有歧义），更早则退回**带年份**的绝对日期。
// 为什么不直接用 relTime：它的"更早"档是「M月D日 H时MM分」（0.9.69 对齐直播/榜单原生卡片的
// 既定口径，榜单卡继续用它），但收藏/历史卡上一条三年前的投稿只写"9月26日 21时39分"根本
// 判断不出年份，必须点进去才看得到（用户实报）。dayDiff 用本地零点差值 round（同 relTime，
// DST 23/25 小时日不误判）；脏输入/未来时间降级空串
export function fmtAgo(ms, now) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var n = Number(now) || Date.now();
  var diff = n - t;
  if (diff < 0 || isNaN(diff)) return '';
  var dt = new Date(t), nd = new Date(n);
  var dayDiff = Math.round(
    (new Date(nd.getFullYear(), nd.getMonth(), nd.getDate())
      - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  return dayDiff <= 2 ? relTime(t, n) : fmtDate(t);
}

// UP 数据位计数文案（0.9.69 对齐原生 up-card）：<10000 原样；≥10000 一位小数「N.N万」
// （原生实测 33235→3.3万 / 469000→46.9万 / 6062 原样）；脏输入按 0
export function fmtWan(n) {
  var v = Number(n) || 0;
  if (v < 10000) return String(v);
  return (Math.round(v / 1000) / 10) + '万';
}

// ---------- 站内搜索三端点（0.9.151）：/rest/pc-direct/search/{video,user,article} → 条目 ----------
// 0.9.72 的 SSR HTML 区段解析（parseSearchItems）退役：真机实测（2026-10-04，docs/api-research.md
// §4.10）PC 搜索其实有 JSON 端点，且 **pCursor 是页码游标**（page/pageNo 被忽略——原生 pager 抓包
// 坐实），每页固定 30、totalNum 总数、pageNum 是总页数。三个规整器共用一个「剥高亮」：
// emTitle 的 <em>…</em> 一律剥成纯文本（卡片不做局部高亮；关键字命中信息靠排位表达）。
// 字段形状照真机样本裁剪；坏条目跳过（宁可少不错），整体失败调用方出空态。
function stripEm(s) {
  return String(s == null ? '' : s).replace(/<\/?em>/g, '');
}

// 视频：{ items[{acId,title,cover,dur,views,up,dateText}], total }
export function searchVideoPageOf(j) {
  var items = [];
  (((j && j.videoList) || [])).forEach(function (raw) {
    var acId = Number((raw && (raw.contentId != null ? raw.contentId : raw.id)) || 0);
    if (!acId) return;
    items.push({
      acId: acId,
      title: stripEm(raw.title || raw.emTitle).trim(),
      cover: coverUrl(raw.coverUrl || ''), // 无 coverUrl 的条目给空串，imgInto 走兜底图
      dur: String(raw.playDuration || ''),
      // 播放数只取数字部分（原生文本「11.4万次播放」/「2037次播放」——后缀随分区变，统一剥掉）
      views: String(raw.viewCountInfo || raw.viewCount || '').replace(/(次播放|次观看|播放|阅读)$/, '').trim(),
      up: upOf(raw.userId || 0, raw.userName || '', raw.userImg ? coverUrl(raw.userImg) : '', false),
      dateText: fmtDate(raw.ctime)
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}

// UP主：{ items[{uid,name,avatar,fans,contrib,signature,following,recents}], total }
// recents = dougaFeedList（真机实测最多 3 条）——卡内直接可点播
export function searchUserPageOf(j) {
  var items = [];
  (((j && j.userList) || [])).forEach(function (raw) {
    var uid = Number((raw && (raw.userId != null ? raw.userId : raw.id)) || 0);
    if (!uid) return;
    var recents = [];
    (((raw && raw.dougaFeedList) || [])).forEach(function (d) {
      var acId = Number((d && d.contentId) || 0);
      if (!acId) return;
      recents.push({
        acId: acId,
        title: String((d && d.caption) || ''),
        cover: coverUrl(((d && d.coverUrls) || [])[0] || ''),
        dur: String((d && d.playDuration) || ''),
        dateText: String((d && d.contributeTime) || '')
      });
    });
    items.push({
      uid: uid,
      name: stripEm(raw.userName || raw.emTitle).trim(),
      avatar: coverUrl(raw.userImg || ''),
      // 计数优先用服务端已格式化串（fansCountStr「1.4万」/contentCountStr），缺则本地格式化
      fans: raw.fansCountStr || (raw.fansCount != null ? fmtWan(raw.fansCount) : ''),
      contrib: raw.contentCountStr || (raw.contentCount != null ? String(raw.contentCount) : ''),
      signature: String(raw.signature || ''),
      following: !!raw.isFollowing,
      recents: recents
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}

// 文章：{ items[{id,title,decr,name,uid,views,comments,channel,dateText}], total }
// 无封面字段（真机样本确认）——渲染走纯文本行卡
export function searchArticlePageOf(j) {
  var items = [];
  (((j && j.articleList) || [])).forEach(function (raw) {
    var id = Number((raw && (raw.contentId != null ? raw.contentId : raw.id)) || 0);
    if (!id) return;
    items.push({
      id: id,
      title: stripEm(raw.title || raw.emTitle).trim(),
      decr: String(raw.decr || ''),
      uid: Number(raw.userId || 0) || 0,
      name: String(raw.userName || ''),
      views: String(raw.viewCountInfo || '').trim(),
      comments: String(raw.commentCountInfo || '').trim(),
      channel: String(raw.channelName || ''),
      dateText: fmtDate(raw.ctime)
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}

