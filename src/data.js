import { CFG } from './cfg.js';

// ---------- 数据层 ----------
// 两种内容源规整成同一份字段契约（feedstore/player/comments 只认这套字段）：
//   sv   小视频 meow（urls 直接可用）
//   home 首页推荐 selection/feed（卡片只有元信息，urls 由 douga/info+playInfo 懒解析）
// 能力差异收敛在 cap 上：player 等消费端按能力分支，不再散布 kind==='home'；
// 新内容源 = 新 normalize + 一份 cap 开关
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
    userName: user.name || '未知用户',
    userId: user.userId || 0,
    head: user.headUrl || '',
    cover: covers.length ? covers[0].url : '',
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
    userName: user.name || '未知用户',
    userId: Number(user.userId) || 0,
    head: user.headUrl || '',
    isFollowing: !!user.isFollowing,
    cover: (bc.img && bc.img[0]) || '',
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
// { acId, title, cover, progress, sub, kind }——面板渲染与「点击回竖刷」零分支（对齐
// 顶部两源契约理念）。可选字段 desc（rank 简介，0.9.65）：无来源的 kind 上为 undefined，
// rowOf 判空不渲染。rank 另带 meta（0.9.69，原生 extra 三段结构化）+ up（随行作者卡）；
// 其余来源的 meta 为 undefined，rowOf 走 sub 纯文本分支。返回 null = 非视频条目，
// 调用方过滤（无 douga resolve 链，进竖刷必炸）。
// 类型字段实测（docs/api-research.md §4/§6，2026-10-02）：
//   browse/history 的 resourceType 编码与收藏/榜单体系不同源——条目 2=普通视频（社区文档
//   「参数 1 视频 2 番剧」的释义在条目字段上不成立），必须连 videoId 一起校验、宁可漏不错；
//   rank/channel 的 contentType 2=视频 3=文章；dougaList 是纯视频端点无需过滤
export function panelItem(kind, raw) {
  if (!raw) return null;
  var it = { acId: 0, title: '', cover: '', progress: null, sub: '', kind: kind };
  if (kind === 'history') {
    if (raw.resourceType !== 2 || !raw.videoId) return null;
    it.acId = Number(raw.resourceId) || 0;
    it.title = raw.title || raw.dougaVideoTitle || '';
    it.cover = raw.cover || '';
    it.progress = raw.playedSeconds > 0 ? Number(raw.playedSeconds) : null;
    it.sub = raw.playedSecondsShow || '';
  } else if (kind === 'fav') {
    it.acId = Number(raw.contentId) || 0;
    it.title = raw.contentTitle || '';
    it.cover = raw.contentImg || '';
    it.progress = raw.userPlayedSeconds > 0 ? Number(raw.userPlayedSeconds) : null;
    it.sub = raw.userName || '';
  } else if (kind === 'rank') {
    if (raw.contentType !== 2) return null;
    it.acId = Number(raw.dougaId || raw.contentId) || 0;
    it.title = raw.contentTitle || '';
    it.cover = raw.videoCover || '';
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
      img: raw.userImg || '',
      fans: Number(raw.fansCount) || 0,
      contrib: Number(raw.contributionCount) || 0,
      fansText: fmtWan(raw.fansCount),
      contribText: fmtWan(raw.contributionCount),
      sign: String(raw.userSignature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim()
    } : null;
  } else {
    return null;
  }
  return it.acId && it.title ? it : null;
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
    avatar: u.headUrl || '',
    sign: String(u.signature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim(),
    contrib: u.contentCount != null ? Number(u.contentCount) || 0 : null,
    follow: u.following != null ? Number(u.following) || 0 : null,
    fans: u.followed != null ? Number(u.followed) || 0 : null
  };
}

// 面板条目 → 竖刷 home 契约 item（懒解析：进播放器后 resolve 链回填直链与全量计数）。
// visit/user 留空走 normalizeHome 默认值，不伪造未实测的数据
export function homeItemOf(acId, title, cover) {
  return normalizeHome({ href: String(acId), title: title || '', img: cover ? [cover] : [] });
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

// UP 数据位计数文案（0.9.69 对齐原生 up-card）：<10000 原样；≥10000 一位小数「N.N万」
// （原生实测 33235→3.3万 / 469000→46.9万 / 6062 原样）；脏输入按 0
export function fmtWan(n) {
  var v = Number(n) || 0;
  if (v < 10000) return String(v);
  return (Math.round(v / 1000) / 10) + '万';
}
