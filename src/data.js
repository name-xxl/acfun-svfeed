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
// rowOf 判空不渲染。返回 null = 非视频条目，调用方过滤（无 douga resolve 链，进竖刷必炸）。
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
    it.desc = String(raw.contentDesc || '').replace(/<br\s*\/?\s*>/gi, ' ').trim(); // 简介副行；官方简介是 HTML，<br> 折空格（契约层统一处理，douga/info description 将来同款）
    // extra 对齐原生榜单卡构成（0.9.67，原生 video-card extra 三段：播放数/评论数/发布于xx·频道
    // ——原生截图首位是播放数非蕉数，蕉是排序依据非展示项）；sub 契约层拼好，rowOf 零分支
    var ch = raw.channel || {};
    it.sub = (Number(raw.viewCount) || 0) + ' 播放 · ' + (Number(raw.commentCount) || 0)
      + ' 评论 · ' + relTime(Number(raw.contributeTime) || 0)
      + (ch.parentName || ch.channelName ? ' / ' + (ch.parentName || ch.channelName) : '');
    // UP 随行卡（原生 up-card：视频卡按排名配对作者卡，无独立 UP 榜）：rankList 条目自带
    // fansCount/userImg/userSignature——getUserCardList 无粉丝数，UP 粉丝以此为准（§4.4/§6.1）
    it.up = raw.userName ? {
      id: Number(raw.authorId || raw.userId) || 0,
      name: raw.userName,
      img: raw.userImg || '',
      fans: Number(raw.fansCount) || 0,
      contrib: Number(raw.contributionCount) || 0, // UP 总投稿数（原生 up-card 第二数据位）
      sign: String(raw.userSignature || '').replace(/<br\s*\/?\s*>/gi, ' ').slice(0, 60)
    } : null;
  } else {
    return null;
  }
  return it.acId && it.title ? it : null;
}

// 面板条目 → 竖刷 home 契约 item（懒解析：进播放器后 resolve 链回填直链与全量计数）。
// visit/user 留空走 normalizeHome 默认值，不伪造未实测的数据
export function homeItemOf(acId, title, cover) {
  return normalizeHome({ href: String(acId), title: title || '', img: cover ? [cover] : [] });
}

// 榜单 extra 的相对时间（0.9.67 对齐原生「发布于xx」）：<24h「N小时前」、<7天「N天前」、
// 其余「M月D日」。纯函数（脏输入降级空串，单测钉）
export function relTime(ms) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var diff = Date.now() - t;
  if (diff < 0 || isNaN(diff)) return '';
  var h = Math.floor(diff / 3600000);
  if (h < 1) return '1小时内';
  if (h < 24) return h + '小时前';
  var d = Math.floor(h / 24);
  if (d < 7) return d + '天前';
  var dt = new Date(t);
  return (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
}
