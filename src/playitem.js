// @ts-check
import { CFG } from './cfg.js';
import { coverUrl } from './imgurl.js';

/**
 * 作者四件套（0.9.82 契约）：缺失即 null（不编造占位文案）。nameColor 仅在调用方显式传第 5 参时挂。
 * @typedef {{ id:number, name:string, img:string, isFollowing:boolean, nameColor?:number }} Up
 */
/**
 * 播放条目契约（本文件的产出形状；字段白名单见 ITEM_FIELDS.play）。
 * 可选键（?）为**部分来源/部分阶段**才有：resolving/videoId/qualities/qIdx 仅 home 懒解析态
 * ——sv（meow 直链）无这组键（tsc 校验实证：normalize 的产出缺它们，不是笔误而是契约事实）；
 * channel/channelInfo 两种来源方言不同形状故 key 分离。
 * @typedef {{ kind:string, stype:number, id:number, title:string, up:Up|null, cover:string,
 *   urls:string[], urlIdx:number, refreshed:boolean, cap:Record<string,boolean>,
 *   resolving?:boolean, videoId?:string, channel?:any, channelInfo?:string, qualities?:any, qIdx?:number,
 *   like:number, comment:number, view:number, banana:number, fav:number, share:number,
 *   danmakuCount:number, date:string, shareUrl:string, liked:boolean, favorited:boolean,
 *   thrown:boolean, localLike:boolean, desc?:string }} PlayItem
 */

// ---------- 播放条目契约（0.9.162 自 data.js 终解拆出：两种内容源规整成同一份字段） ----------
// feedstore/player/comments 只认这套字段：
//   sv   小视频 meow（urls 直接可用）
//   home 首页推荐 selection/feed（卡片只有元信息，urls 由 douga/info+playInfo 懒解析）
// 能力差异收敛在 cap 上：player 等消费端按能力分支，不再散布 kind==='home'；
// 新内容源 = 新 normalize + 一份 cap 开关
//
// 图片字段（cover/head/avatar）一律经 imgurl.coverUrl 归一（0.9.76）：http:// 老条目在
// https 页面会被混合内容拦成裂图，归一在这里做一次，全部消费端（卡片/氛围底图/播放层）继承
// ——面板侧同纪律（panelitem.js）。
//
// 作者契约（0.9.82）：作者从三个扁平字段（userName/userId/head/isFollowing）收敛为**一个
// 可空子对象** item.up{id,name,img,isFollowing}，缺失即 null——不编造占位文案。各来源只允许
// 在自家解析器里声明自家的字段名（5 个端点 5 种形状是事实，不消灭，只压缩成一行映射，
// 同 0.9.80「皮肤差异不当重复消灭」）；下游（slide/rail/interact/回填）一律只读 item.up。
// 此前搜索传 upName、收藏把作者塞进 sub、榜单传 up、播放契约又是扁平三件套——桥
// playlayer.itemOfPanel 只认榜单那一种，其余入口进播放层就退化成 '未知用户'（0.9.82 病灶）。
// nameColor（0.9.157，可选第 5 参）：名字等级色 0/1/2（动态域三色体系：默认白/红/紫）。
// **只在调用方显式传第 5 参时才挂键**（传 undefined 也挂 0）——play 侧各处沿用 4 参调用，
// 播放契约④「up 固定四件套」不受影响；内联渲染统一走 nameColorCss（0=不加色）
/**
 * A 站简介/签名类 HTML 文本的 <br> 折行（0.9.64 榜单卡先例；0.9.194 抽公用单源，说明/签名两处共用）。
 * @param {any} s @param {string} [rep] 替换串（缺省换行；签名等单行场景传空格） @returns {string}
 */
export function foldBr(s, rep) {
  return String(s == null ? '' : s).replace(/<br\s*\/?\s*>/gi, rep == null ? '\n' : rep).trim();
}

/** @returns {Up|null} */
export function upOf(id, name, img, isFollowing, nameColor) {  var n = String(name || '').trim();
  var i = Number(id) || 0;
  if (!n && !i) return null; // 无名无 id：作者未知（不伪造）
  var up = { id: i, name: n, img: img || '', isFollowing: !!isFollowing };
  if (arguments.length >= 5) up.nameColor = Number(nameColor) || 0;
  return up;
}

// 契约字段白名单（可执行契约，0.9.82）：test/unit/contract.test.js 断言各来源产出 ⊆ 本表
// ——新来源自带字段名会在单测直接红。play 侧作者只有 up 一个出口（顶层 userName/userId/head/
// isFollowing 已退役），panel 侧作者同样只有 up（fav 原来的 sub 作者名已迁出）
export var ITEM_FIELDS = {
  play: ['kind', 'stype', 'id', 'title', 'up', 'cover', 'urls', 'urlIdx', 'refreshed', 'cap',
    'resolving', 'videoId', 'channel', 'channelInfo', 'qualities', 'qIdx', 'like', 'comment', 'view',
    'banana', 'fav', 'share', 'danmakuCount', 'date', 'shareUrl', 'liked', 'favorited',
    'thrown', 'localLike', 'desc'],
  panel: ['kind', 'acId', 'title', 'cover', 'dur', 'views', 'dateText', 'desc', 'progress',
    'sub', 'meta', 'up',
    // 关注流（0.9.91）：content type 判别子与动态卡字段。ct 与 kind 正交——kind 在契约里是
    // **来源方言**（= panelitem.js PANEL_PARSERS 的表键），不能兼内容类型；关注流一个来源出
    // 三种内容，故内容判别子另立 ct（video|article|moment），卡片渲染按 ct 分支（同一张卡，
    // 契约驱动）
    'ct', 'momentId', 'text', 'href', 'repost',
    // 0.9.98 动态多图：配图列表（{url 缩略, big 大图}[]，来自嵌套 moment.imgs——0.9.91 时
    // 以为 feed 只给单张 coverUrl，实报「多图只出第一张」后实测形状在册）
    'imgs',
    // 0.9.99 仿原生互动行：分享计数（shareCount 在三族条目顶层计数族，§2.1.1/§2.1.2 实测）
    'share',
    // 0.9.96 详情面板写链：数值计数与互动态（字段名对齐 rail 词汇，见 follow 解析器注释）
    'like', 'comment', 'banana', 'liked', 'thrown']
};

/** @returns {PlayItem} */
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
/** @returns {PlayItem} */
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
    // 卡片自带的分区标签（0.9.170）：selection/feed 卡实测带 channelInfo（如「主机单机」）——
    // 精选页大卡信息区的标签行用它；与 resolve 回填的 channel（对象）**不同形状**，故另立键，
    // 不合并（channel 只在解析后才有、且是 {id,name,...}；这里永远是卡片自带的展示串）
    channelInfo: bc.channelInfo || '',
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

// 面板条目 → 竖刷 home 契约 item（懒解析：进播放器后 resolve 链回填直链与全量计数）。
// user 留空 → up 为 null（0.9.82：作者未知就是 null，不再编造 '未知用户' 占位；
// 回包后由 appapi.resolve 回填 + onHomeResolved 刷渲染）
/** @returns {PlayItem} */
export function homeItemOf(acId, title, cover) {
  var c = coverUrl(cover);
  return normalizeHome({ href: String(acId), title: title || '', img: c ? [c] : [] });
}

// 面板/搜索条目 → 播放层条目（0.9.82 下沉自 playlayer.itemOfPanel）。原来这层桥躺在
// playlayer.js——要 DOM 依赖、不是纯函数，既进不了 node --test，也只认榜单的 up（本次病灶）。
// 作者只做四件套归一：榜单的作者卡扩展字段（fans/sign…）不带进播放层；缺作者则留 null，
// 等 resolve 链回填（appapi.resolve 写 item.up）。
/** @returns {PlayItem} */
export function playItemOf(pi) {
  var item = homeItemOf(pi.acId, pi.title, pi.cover);
  if (pi.up) item.up = upOf(pi.up.id, pi.up.name, pi.up.img, pi.up.isFollowing);
  return item;
}

// ---------- 深链判据（0.9.72，纯函数，离线单测） ----------
// 地址栏深链的 id 跨两个 id 空间（见 route.js parseHash 注释）：meow 详情 / douga 详情二选一
// → { item, source }；两者皆未命中 = 该 id 不是可播放视频 → null（调用方出错误盒，
// **不**回落随机流）。命中要求：meow 必须带直链（sv 直链随详情下发，无直链即不可播）；
// douga 必须 result=0 且 videoList 非空（否则后续 playInfo 必空——appapi.resolve 同款判据）。
// home 条目直链留空交懒解析链补（home 卡片本就 urls:[]，cap.lazyResolve 已在契约里）；
// id 取请求用的 acId 本身（douga/info 回包不带 dougaId，且 resolve 要用它回查）
/** @returns {{ item: PlayItem, source: string }|null} */
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
