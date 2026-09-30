import { CFG } from './cfg.js';
import { request, gmRequest } from './net.js';
import { singleFlight } from './ui.js';
import { normalizeHome } from './data.js';
import { applyQuality } from './quality.js';

// ---------- APP 家族接口层 ----------
// 域名 api-new.app.acfun.cn（与 acfunchina.com 同后端），固定 mkey 免登录读。
// 这里只剩读接口（首页推荐流/详情/播放直链/弹幕列表）；全部写操作（点赞/收藏/
// 投蕉/关注/评论/弹幕）都在 www.acfun.cn PC 端或 interact API，走 postForm 页面
// fetch（风控友好）。selection/feed 必须带 appVersion 头，douga/playInfo 不带
// （对齐 A 站客户端行为）。

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

// 上传用 GM 通道（POST + JSON 解析；无 GM/网络错/超时/解析失败一律 reject）
function gmPostJson(opts) {
  return gmRequest({
    method: 'POST', url: opts.url, headers: opts.headers,
    data: opts.data, timeout: opts.timeout
  });
}

// 图片上传四阶段：getToken → 分片（顺序逐一）→ complete → 换长期 URL
function uploadGetToken(file) {
  return gmPostJson({
    url: 'https://www.acfun.cn/rest/pc-direct/image/upload/getToken',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'fileName=' + encodeURIComponent(file.name || 'image.png'),
    timeout: CFG.upload.tokenT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.info && d.info.token)) throw new Error('no-token');
    return d.info.token;
  });
}

function uploadChunks(token, file) {
  var endpoint = CFG.upload.endpoint;
  var total = file.size;
  function step(i) {
    if (i * CFG.upload.chunk >= total) return Promise.resolve();
    var start = i * CFG.upload.chunk;
    var end = Math.min(start + CFG.upload.chunk, total);
    return gmPostJson({
      url: endpoint + '/api/upload/fragment?upload_token=' + encodeURIComponent(token) + '&fragment_id=' + i,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + (end - 1) + '/' + total
      },
      data: file.slice(start, end),
      timeout: CFG.upload.chunkT
    }).then(function (d) {
      if (!d || d.result !== 1) throw new Error('chunk-' + i);
      return step(i + 1);
    });
  }
  return step(0);
}

function uploadComplete(token, chunks) {
  return gmPostJson({
    url: CFG.upload.endpoint + '/api/upload/complete?upload_token=' + encodeURIComponent(token)
      + '&fragment_count=' + chunks,
    timeout: CFG.upload.completeT
  }).then(function (d) {
    if (!d || d.result !== 1) throw new Error('complete');
  });
}

function uploadGetUrl(token) {
  return gmPostJson({
    url: 'https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'token=' + encodeURIComponent(token) + '&bizFlag=web-comment-text',
    timeout: CFG.upload.urlT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.url)) throw new Error('no-url');
    return d.url.split('?')[0]; // 剥签名参数，存裸路径长期可访问
  });
}

// 默认收藏夹：收藏必须落夹，快速收藏统一进第一个夹（对齐 acfunsdk 的 default_fid 做法）。
// 会话内缓存 + 单飞（singleFlight）；无任何收藏夹时抛错（极罕见，需先在站内创建）
var favFolderFlight = singleFlight(function () {
  return postForm(CFG.api.favFolderList, '').then(function (j) {
    var list = (j && (j.dataList || j.data)) || [];
    if (list.length && list[0].folderId != null) return String(list[0].folderId);
    throw new Error('no-fav-folder');
  });
});
function ensureFavFolder() {
  return favFolderFlight.get();
}

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
      }, function () { return []; });
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
      if (d.createTime) item.date = String(d.createTime).slice(0, 10);
      else if (d.createTimeMillis) item.date = new Date(d.createTimeMillis).toISOString().slice(0, 10);
      var u = d.user || {};
      if (u.id) item.userId = Number(u.id) || item.userId;
      if (u.name) item.userName = u.name;
      item.isFollowing = !!u.isFollowing; // 关注状态以详情为准（卡片不带）
      return self.playInfo(item.videoId, item.id).then(function (qualities) {
        if (!qualities.length) return false;
        item.qualities = qualities;
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

  // ---- 收藏（PC 端收藏夹体系） ----
  // 视频 resourceType=9（收藏体系专用枚举，acfunsdk 里显式做 2→9 映射），且必须
  // 落进收藏夹（addFolderIds/delFolderIds）。此前调的 APP 端 /rest/app/favorite
  // 不带收藏夹参数，服务端返回 result:0 但实际不入库——「提示成功却没收藏」的根源。
  // 网页 Cookie 即可鉴权（同域 fetch，无需 api_st），协议与 AcFunHelper/acfunsdk 一致
  setFavorite: function (acId, on) {
    return ensureFavFolder().then(function (fid) {
      return postForm(on ? CFG.api.favoriteAdd : CFG.api.favoriteRemove, on
        ? 'resourceId=' + acId + '&resourceType=9&addFolderIds=' + fid
        : 'resourceType=9&resourceId=' + acId + '&delFolderIds=' + fid);
    }).then(function (j) {
      return !!(j && j.result === 0);
    }, function () { return false; });
  },
  // ---- 投蕉（PC 端点，网页 Cookie 即可） ----
  // 推荐模式互动统一走 web 通道（收藏/关注/点赞/投蕉）。resourceType=2 与 APP 端同义
  // （acfunsdk AcVideo 的 resource_type 即 2）；count 1~5
  throwBanana: function (acId, count) {
    return postForm(CFG.api.bananaPc,
      'resourceId=' + acId + '&resourceType=2&count=' + (count > 0 ? count : 1))
      .then(function (j) { return !!(j && j.result === 0); }, function () { return false; });
  },
  // 评论点赞：PC 端点（复用动态广场模块，网页 Cookie 即可，无需 token）
  commentLike: function (sourceId, sourceType, commentId, on) {
    return postForm(CFG.api.commentLikePc + (on ? 'like' : 'unlike'),
      'sourceId=' + sourceId + '&sourceType=' + sourceType + '&commentId=' + commentId)
      .then(function (j) { return !!(j && j.result === 0); }, function () { return false; });
  },

  // ---- 图片上传（移植动态广场 uploadImage：getToken → 分片 → complete → 换 URL） ----
  // 需 GM_xmlhttpRequest（二进制分片）；成功返回可长期访问的裸路径 URL。
  // 各阶段独立成 Promise 小函数，任何一步失败统一落为 null
  uploadImage: function (file) {
    var chunks = Math.max(1, Math.ceil(file.size / CFG.upload.chunk));
    return uploadGetToken(file)
      .then(function (token) {
        return uploadChunks(token, file).then(function () { return token; });
      })
      .then(function (token) {
        return uploadComplete(token, chunks).then(function () { return token; });
      })
      .then(uploadGetUrl)
      .then(function (url) { return url || null; }, function () { return null; });
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
      if (j && j.result === 0) return { ok: true, comment: j.comment || null };
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
