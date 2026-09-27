import { CFG } from './cfg.js';

// ---------- 数据层 ----------
// 两种内容源规整成同一份字段契约（feedstore/player/comments 只认这套字段）：
//   sv   小视频 meow（urls 直接可用）
//   home 首页推荐 selection/feed（卡片只有元信息，urls 由 douga/info+playInfo 懒解析）
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
    like: counts.likeCount || 0,
    comment: counts.commentCount || 0,
    view: counts.viewCount || 0,
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
    // 懒解析状态：resolving 防并发，resolved 表示 douga/info+playInfo 已取过
    resolving: false,
    resolved: false,
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
