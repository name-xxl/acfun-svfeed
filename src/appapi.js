import { CFG } from './cfg.js';
import { request, mockHit } from './net.js';
import { singleFlight } from './ui.js';
import { normalizeHome } from './playitem.js';
import { fmtDate } from './timefmt.js';
import { coverUrl } from './imgurl.js';
import { applyQuality } from './quality.js';

// ---------- APP 家族接口层 ----------
// 读接口走 api-new.app.acfun.cn（与 acfunchina.com 同后端），固定 mkey 免登录：
// 首页推荐流/详情/播放直链（弹幕列表走 www.acfun.cn PC 端）。写操作端点全在
// www.acfun.cn PC 端或 interact API（点赞/投蕉/评论/弹幕；收藏/关注域已迁 favapi/relationapi，
// 但仍经本件 postForm 发），postForm
// 请求通道（页面 fetch + Cookie，风控友好）收口在本文件。selection/feed 必须带
// appVersion 头，douga/playInfo 不带（对齐 A 站客户端行为）。

var pcursor = '';
var exhausted = false;

// 令牌：登录后 id.app.acfun.cn 用网页 Cookie 换 acfun.midground.api_st
var apiStFlight = singleFlight(function () {
  return postForm(CFG.api.token, 'sid=acfun.midground.api').then(function (j) {
    if (j && j.result === 0 && j['acfun.midground.api_st']) return j['acfun.midground.api_st'];
    throw new Error('token-denied');
  });
});
export function ensureApiSt(force) {
  if (force) apiStFlight.reset();
  return apiStFlight.get();
}

// 设备指纹会话内固定：每请求随机 udid 是风控典型特征，一个会话应像同一台设备
var UDID = 'acsv-' + Math.random().toString(36).slice(2) + Date.now();

function homeHeaders(withAppVer) {
  var d = new Date();
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  var h = {
    'User-Agent': CFG.home.ua,
    'acPlatform': 'ANDROID_PHONE',
    'deviceType': '1',
    'net': 'WIFI',
    'productId': '2000',
    'udid': UDID,
    'resolution': '1080x1920',
    'market': 'tencent',
    'requestTime': d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.000',
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (withAppVer) h['appVersion'] = CFG.home.appVer;
  return h;
}

function q(extra) {
  return '?product=ACFUN_APP&app_version=' + CFG.home.appVer + (extra || '');
}

// 同域（www.acfun.cn）表单 POST 走原生 fetch：携带完整 Cookie/Referer/Sec-Fetch 指纹。
// 写操作（发弹幕/发评论）若经 GM_xmlhttpRequest 桥接会被风控判定为不可信设备
// （返回「需要开启账号保护才能扫描二维码登录」），必须与动态广场一样用页面内 fetch。
// 全项目的表单 POST 统一走这里（token/interact/follow 等写接口同语义），勿再内联 fetch
export function postForm(url, body) {
  var mocked = mockHit(url, body);
  if (mocked) return mocked;
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  }).then(function (r) { return r.json(); });
}

// selection/feed 聚合块 → 视频卡片（轮播图与非视频卡丢弃）
function cardsOf(body) {
  var out = [];
  (body || []).forEach(function (block) {
    if (!block || block.schema === 'carousels') return;
    (block.bodyContents || []).forEach(function (bc) {
      if (bc && bc.href && bc.resourceType === 2) out.push(bc);
    });
  });
  return out;
}

// 弹幕颜色十进制 int → '#rrggbb'（仅供本模块 danmakuList 使用）
function intToHex(n) {
  n = Number(n);
  if (!n || n < 0) n = 0xFFFFFF;
  return '#' + ('000000' + (n & 0xFFFFFF).toString(16)).slice(-6);
}

// （0.9.143 迁出退役）默认收藏夹体系（favFolderFlight/ensureFavFolder）与 setFavorite：收藏改
// 「弹层选夹」（官方口径）后不再有"快速落第一个夹"路径，收藏写链整体收口 **favapi.js**
//（三分支 add/updateFolder/remove + 夹 CRUD），操作面在 favpop.js（选择层）与 mypage（夹管理）。

export var AppAPI = {
  // ---- 首页推荐流 ----
  resetPager: function () { pcursor = ''; exhausted = false; },
  homeFeed: function () {
    if (exhausted) return Promise.resolve([]);
    return request(CFG.api.homeFeed + q('&appMode=0'), 'POST', homeHeaders(true),
      'mkey=' + CFG.home.mkey + '&pcursor=' + pcursor + '&count=' + CFG.homeFeedCfg.count)
      .then(function (j) {
        if (!j || j.result !== 0) { exhausted = true; return []; }
        pcursor = (j.pcursor === undefined || j.pcursor === null) ? '' : String(j.pcursor);
        var list = cardsOf(j.body).map(normalizeHome);
        if (!list.length) exhausted = true; // 空页防死循环
        return list;
      }, function () { return []; });
  },

  // ---- 详情 / 播放 ----
  dougaInfo: function (acId) {
    return request(CFG.api.dougaInfo + q('&dougaId=' + acId + '&mkey=' + CFG.home.mkey),
      'GET', homeHeaders(false));
  },
  playInfo: function (videoId, acId) {
    return request(CFG.api.playInfo + q('&videoId=' + videoId + '&resourceId=' + acId
      + '&resourceType=2&mkey=' + CFG.home.mkey), 'GET', homeHeaders(false))
      .then(function (j) {
        var streams = (j && j.playInfo && j.playInfo.streams) || [];
        return streams.map(function (s) {
          var urls = (s.playUrls || []).map(function (u) {
            return /^http:/.test(u) ? u.replace(/^http:/, 'https:') : u;
          }).filter(function (u) { return /^https?:/.test(u); });
          // 档位无编码字段：从首个 m3u8 文件名嗅探（实测依据见 cfg.codec 注释）
          var hevc = CFG.codec.reHevc.test(urls[0] || '');
          var raw = String(s.qualityLabel || s.qualityType || '默认');
          return {
            res: parseInt(raw, 10) || 0, // 排序键：同分辨率档（60fps/30fps）值相同，稳定排序保接口先后
            label: raw + (hevc ? CFG.codec.suffix : ''),
            codec: hevc ? 'hevc' : 'avc',
            fps: s.fps || 0, // HealthMonitor 的理论帧间隔与降帧率判定用
            urls: urls
          };
        }).filter(function (x) { return x.urls.length; })
          // applyQuality 的「无记忆取最高档 = idx 0」依赖降序，显式排一次不赌接口下发顺序
          .sort(function (a, b) { return b.res - a.res; });
      }, function (e) { return []; });
  },

  // 懒解析链：douga/info（videoId/计数/初始状态）→ playInfo（分档直链）
  resolve: function (item) {
    var self = this;
    return this.dougaInfo(item.id).then(function (d) {
      if (!d || d.result !== 0 || !(d.videoList || []).length) return false;
      item.videoId = d.videoList[0].id;
      item.channel = d.channel || null;
      item.danmakuCount = d.danmakuCount || 0;
      item.liked = !!d.isLike;
      item.favorited = !!d.isFavorite;
      item.thrown = !!d.isThrowBanana; // 已投过蕉：不可再投
      if (d.likeCount != null) item.like = d.likeCount;
      if (d.bananaCount != null) item.banana = d.bananaCount;
      if (d.commentCount != null) item.comment = d.commentCount;
      if (d.viewCount != null) item.view = d.viewCount;
      if (d.stowCount != null) item.fav = d.stowCount;
      if (d.shareCount != null) item.share = d.shareCount;
      // 发布时间（0.9.85 口径修正）：**站方页面展示的就是 createTime 那一档**——原生 UP 空间页
      // 对 ac48875146 显示「2026/10/02」，正是 createTimeMillis（10-02 01:25）。而顶层 createTime
      // 是**展示串**（旧稿 "2023-10-2"、近期 "24小时前"，格式随稿件新旧变），旧实现
      // `String(d.createTime).slice(0,10)` 把它当日期透传 → 播放层与竖刷卡日期槽会冒出「24小时前」；
      // 兜底分支的 toISOString().slice(0,10) 又是 UTC，本地凌晨/晚上整体差一天。改读毫秒字段 +
      // fmtDate 本地格式化，两个 bug 一起修，且与站方口径一致（缺失则留空，不伪造）
      // **不用 videoList[0].uploadTime**：实测那是"上传时刻"，比站方展示的发布时刻早
      // （三例差 12 秒 / 19.5 小时 / 5.16 天），拿它显示会与站方页面矛盾（见 docs §3）
      item.date = fmtDate(Number(d.createTimeMillis));
      // 作者回填（0.9.82）：写进契约唯一出口 item.up——此前写扁平 item.userName/userId/
      // isFollowing，而渲染面是构建期写死的，回填等于只写数据不刷屏。up 为 null（深链冷
      // 进入这类连卡片都没有的来源）时就地建一个，名字/id/头像由这里能拿到的部分补
      // 头像字段 headUrl 是 2026-10-03 真机实测（dougaId=42527415）：与 meow/首页卡片以及
      // histories[].user 同键名，同一发回包里就有——深链 ac 空间因此也能拿到**真实**头像，
      // 不必另发请求（id 实测是字符串，Number 归一）
      var u = d.user || {};
      if (u.id || u.name || u.headUrl) {
        item.up = item.up || { id: 0, name: '', img: '', isFollowing: false };
        if (u.id) item.up.id = Number(u.id) || item.up.id;
        if (u.name) item.up.name = u.name;
        if (u.headUrl) item.up.img = coverUrl(u.headUrl);
      }
      if (item.up) item.up.isFollowing = !!u.isFollowing; // 关注状态以详情为准（卡片不带）
    return self.playInfo(item.videoId, item.id).then(function (qualities) {
      if (!qualities.length) return false;
        item.qualities = qualities;
        // 非 m3u8 直链（harness webm 直挂/未来 mp4 直链源）绕开 hls.js 管线——与
        // followstream.FollowVideos.info 同款守卫（api.js 直挂缝同判）；真 m3u8 回包零变化
        if (item.urls.length && !/\.m3u8/i.test(item.urls[0])) item.cap.hls = false;
        applyQuality(item); // 播放策略（编码偏好/清晰度记忆）在 quality.js，接口层只管取数
        return item.urls.length > 0;
      });
    });
  },

  // 分享卡片详情：douga/info 一发拿全（title/coverUrl/durationMillis/计数，2026-09-29
  // 实测；coverUrls/image/cover 恒空，封面就在 coverUrl）。Promise 级缓存——同一 ac 号
  // 的多条分享消息只发一请求；失败即弃缓存，下条消息可重试（调用方降级纯文本）
  cardCache: {},
  dougaCard: function (acId) {
    var self = this;
    var key = String(acId);
    if (self.cardCache[key]) return self.cardCache[key];
    var p = this.dougaInfo(key).then(function (d) {
      if (!d || d.result !== 0 || !d.title) { delete self.cardCache[key]; return null; }
      return {
        title: String(d.title || ''),
        cover: String(d.coverUrl || ''),
        durationSec: Math.round((Number(d.durationMillis) || 0) / 1000),
        view: d.viewCountShow != null ? d.viewCountShow : (d.viewCount || ''),
        comment: d.commentCountShow != null ? d.commentCountShow : (d.commentCount || ''),
        danmaku: d.danmakuCountShow != null ? d.danmakuCountShow : (d.danmakuCount || ''),
        url: CFG.api.videoBase + key
      };
    }, function () { delete self.cardCache[key]; return null; });
    self.cardCache[key] = p;
    return p;
  },

  // （0.9.143 退役）setFavorite：见上方迁出登记——收藏写链已整体收口 favapi.js（resourceType=9
  // 与"必须落夹"两条协议原样保留在那里；APP 端不带夹参数"提示成功却没收藏"的教训也在册）

  // ---- 投蕉（PC 端点，网页 Cookie 即可） ----
  // 推荐模式互动统一走 web 通道（收藏/关注/点赞/投蕉）。resourceType=2 与 APP 端同义
  // （acfunsdk AcVideo 的 resource_type 即 2）；count 1~5
  // 投蕉：resourceType 可选（0.9.96 动态写链=10，api-research §4.7；默认 2=视频），
  // 同一端点 bananaPc；count 1~5。动态实测禁自投（result 170008）
  throwBanana: function (acId, count, resourceType) {
    return postForm(CFG.api.bananaPc,
      'resourceId=' + acId + '&resourceType=' + (resourceType || 2) + '&count=' + (count > 0 ? count : 1))
      .then(function (j) { return !!(j && j.result === 0); }, function () { return false; });
  },
  // 评论点赞：PC 端点（复用动态广场模块，网页 Cookie 即可，无需 token）
  commentLike: function (sourceId, sourceType, commentId, on) {
    return postForm(CFG.api.commentLikePc + (on ? 'like' : 'unlike'),
      'sourceId=' + sourceId + '&sourceType=' + sourceType + '&commentId=' + commentId)
      .then(function (j) { return !!(j && j.result === 0); }, function () { return false; });
  },

  // 发评论/回复（复用动态广场 postComment：replyToCommentId 传入则为回复楼中楼；
  // midgroundToken 由网页 Cookie 换取，未登录时直发让接口报错）；失败透传 error_msg
  postComment: function (sourceId, sourceType, content, replyToCommentId) {
    var base = 'sourceId=' + sourceId + '&sourceType=' + sourceType
      + '&replyToCommentId=' + (replyToCommentId || 0)
      + '&content=' + encodeURIComponent(content);
    return ensureApiSt().then(function (st) {
      return postForm(CFG.api.commentAdd, base + '&midgroundToken=' + encodeURIComponent(st));
    }, function () {
      return postForm(CFG.api.commentAdd, base);
    }).then(function (j) {
      // sourceType=4（动态）的回显是**评论对象平铺在响应顶层**（2026-10-03 实测：
      // commentId/content/deviceModel… 全在 j 上，无嵌套 comment 字段）——归一成
      // 乐观上屏要的形状；视频族（3/5）的嵌套 comment 字段维持原样
      if (j && j.result === 0) return { ok: true, comment: j.comment || (j.commentId ? j : null) };
      return { ok: false, msg: (j && (j.error_msg || j.msg)) || '' };
    }, function () { return { ok: false, msg: '网络错误' }; });
  },

  // ---- 弹幕（www.acfun.cn 同域，网页 Cookie） ----
  // 注意：POST body 必须带表单 Content-Type，否则后端解析不到参数（result 21）
  // 全量分页拉取，返回按 position 升序的规整条目
  danmakuList: function (videoId) {
    var all = [];
    var FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };
    var pages = 0;
    function page(p) {
      return request(CFG.api.dmList, 'POST', FORM,
        'resourceId=' + videoId + '&resourceType=9&enableAdvanced=true&pcursor=' + p
        + '&count=' + CFG.danmaku.pageSize + '&sortType=1&asc=false')
        .then(function (j) {
          if (!j || j.result !== 0) return all;
          (j.danmakus || []).forEach(function (m) {
            all.push({
              id: m.danmakuId,
              text: String(m.body || '').replace(/\s+/g, ' '),
              at: Number(m.position) || 0,
              mode: Number(m.mode) || 1,
              color: intToHex(m.color),
              size: Number(m.size) || 25
            });
          });
          var next = j.pcursor;
          // 页数与条目数双上限：条目数挡不住「空页 + 活游标」的服务端异常，
          // 那会让同一游标无限递归爆栈（0.9.34）
          if (!next || next === 'no_more' || next === '0'
            || ++pages >= CFG.danmaku.maxPages
            || all.length >= CFG.danmaku.maxPages * CFG.danmaku.pageSize) return all;
          return page(next);
        }, function () { return all; });
    }
    return page(1).then(function (list) {
      list.sort(function (a, b) { return a.at - b.at; });
      return list;
    });
  },
  danmakuAdd: function (item, text, positionMs) {
    var ch = item.channel || {};
    return postForm(CFG.api.dmAdd,
      'body=' + encodeURIComponent(text)
      + '&color=16777215&mode=1&size=25'
      + '&position=' + Math.max(0, Math.round(positionMs))
      + '&id=' + item.id + '&videoId=' + item.videoId
      + '&roleId=&subChannelId=' + (ch.parentId || 0)
      + '&subChannelName=' + encodeURIComponent(ch.parentName || '')
      + '&type=douga')
      .then(function (j) {
        if (j && j.result === 0) return { ok: true };
        return { ok: false, msg: (j && (j.error_msg || j.msg)) || '' };
      }, function () { return { ok: false, msg: '网络错误' }; });
  }
};
