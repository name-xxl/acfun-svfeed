import { CFG } from './cfg.js';
import { coverUrl } from './imgurl.js';
import { ubbPlain } from './ubb.js';

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
        it.imgs = (Array.isArray(mo.imgs) ? mo.imgs : []).map(function (im) {
          im = im || {};
          return { url: coverUrl(im.url), big: coverUrl(im.expandedUrl || im.originUrl || im.url) };
        }).filter(function (im) { return im.url; });
        // **转发的 coverUrl 实测恒等于源内容的封面**（9/9 全等，2026-10-03）——所以转发卡
        // 不能拿它当主视觉（会伪装成视频/文章卡，用户实报「分不清」），渲染层改挂源条
        it.cover = coverUrl(raw.coverUrl);
        // 转发（23/36 实测占比）：repostSource 是完整分支条目，取**卡面 + 落点**所需
        //（源类型/源 id/源标题/源缩略图/源作者；0.9.101 起源条可点，id/up/text 是落点与
        // 详情面板的料）；源条文案与形态由渲染层按 ct 出。
        // 0.9.98 补 rs10（源是另一条动态，实测关注流实存 3/21）：此前漏接，这类卡被当
        // 原创渲染、误把源首图挂成作者自己的图。引用块取源正文明文（ubbPlain 投影）+ 源首图。
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
            // 源正文**原文**（UBB）：点源条开详情面板时正文要靠它渲染（unplain 不可逆）
            text: rsm.text || rs.discoveryResourceFeedShowContent || '',
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
        it.href = 'https://www.acfun.cn/moment/am' + it.momentId;
        return true;
      default:
        return false; // 其余 resourceType（直播等未观察到）一概不接——宁可漏不错
    }
  }
};

// 关注流条目派发（0.9.91）：列表加载与"动态里转发的源条目"共用同一入口
export function followPanelOf(raw) {
  return raw ? panelItem('follow', raw) : null;
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

// ---------- 站内搜索（0.9.72）：搜索页 SSR HTML → 视频条目 ----------
// 端点**非 JSON**：整页 HTML 里结果是"转义过"的内嵌片段（原始响应引号为 \" 形态，先还原）。
// 整页 113 个 /v/ac 混有 UP 最新投稿/文章/推荐位——只吃 <div class="search-video"> 区段
// （区段收窄是硬要求，uppage.js 的 header-history 同款教训）。条目字段实测（2026-10-02 真机）：
//   <a href="/v/ac<id>">封面 <img> + <span class="video__duration">02:04</span>
//   <div class="video__main__title">…<a>标题</a></div>
//   <div class="video__main__user"><a href="/u/<uid>"><img class="user-avatar" src="…"/>
//     <span class="user-name">UP</span></a></div>
//   <span class="info__view-count">2037次播放</span> <span class="info__create-time">2023-02-24</span>
// 输出 { acId,title,cover,dur,views,up,dateText }；坏段跳过、acId 去重、整体失败退空数组
// （调用方出空态，不崩不伪造）。0.9.82：UP 段收窄到 .video__main__user 并取回 uid 与头像——
// 此前只抓 user-name 文本，把 SSR 已经给到的 /u/<uid> 与 img.user-avatar 丢弃，导致搜索
// 条目进播放层没有头像与关注按钮（真机形态见 test/unit/data.test.js 的搜索片段夹具）
var SEARCH_ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function searchDeent(s) {
  return String(s || '').replace(/&(amp|lt|gt|quot|#39);/g, function (m) { return SEARCH_ENT[m]; });
}
export function parseSearchItems(html) {
  var out = [];
  var seen = {};
  var t = String(html || '').replace(/\\"/g, '"');
  if (!t) return out;
  var parts = t.split('<div class="search-video"');
  for (var i = 1; i < parts.length; i++) {
    var seg = parts[i].slice(0, 4000); // 单条卡结构固定，截窗防跨条误配
    var idM = seg.match(/href="\/v\/ac(\d+)"/);
    var acId = idM ? Number(idM[1]) || 0 : 0;
    if (!acId || seen[acId]) continue;
    var titleM = seg.match(/class="video__main__title"[\s\S]{0,600}?<a[^>]*>([^<]*)<\/a>/);
    var title = titleM ? searchDeent(titleM[1]).trim() : '';
    if (!title) continue; // 无标题不成条（宁可少不错）
    seen[acId] = 1;
    // 封面：懒加载形态（data-src/data-original）优先——src 可能是占位图；无则取 src
    var coverM = seg.match(/<img[^>]*\sdata-(?:src|original)="([^"]+)"/)
      || seg.match(/<img[^>]*\ssrc="([^"]+)"/);
    var durM = seg.match(/class="video__duration">([^<]*)</);
    var viewsM = seg.match(/class="info__view-count">([^<]*)</);
    // UP 段收窄到 .video__main__user：uid 与头像都只在这一段里取——封面 <img> 也在同一张卡上，
    // 不收窄会抓错（img 收窄是硬要求）。user-name 兜底回落到全段匹配：变体页缺外层包裹时
    // 至少保住名字（宁可少不错）
    var upSeg = (seg.match(/class="video__main__user"[\s\S]{0,400}?<\/div>/) || [''])[0];
    var upM = upSeg.match(/class="user-name">([^<]*)</) || seg.match(/class="user-name">([^<]*)</);
    var uidM = upSeg.match(/\/u\/(\d+)/);
    var uimgM = upSeg.match(/<img[^>]*\ssrc="([^"]+)"/);
    var timeM = seg.match(/class="info__create-time">([^<]*)</);
    out.push({
      acId: acId,
      title: title,
      cover: coverUrl(coverM ? coverM[1] : ''),
      dur: durM ? durM[1].trim() : '',
      // 播放数只取数字部分（原生文本「2037次播放」/「14.0万阅读」——后缀随分区变，统一剥掉）
      views: viewsM ? viewsM[1].replace(/(次播放|次观看|播放|阅读)$/, '').trim() : '',
      up: upOf(uidM ? uidM[1] : 0, upM ? searchDeent(upM[1]).trim() : '', uimgM ? coverUrl(uimgM[1]) : '', false),
      dateText: timeM ? timeM[1].trim() : ''
    });
  }
  return out;
}
