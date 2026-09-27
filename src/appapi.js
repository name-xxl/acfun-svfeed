import { CFG } from './cfg.js';
import { request } from './net.js';
import { normalizeHome } from './data.js';

// ---------- APP 家族接口层 ----------
// 域名 api-new.app.acfun.cn（与 acfunchina.com 同后端），固定 mkey 免登录读；
// 写操作（收藏/投蕉/评论点赞）靠 .acfun.cn 域 Cookie（GM_xhr 自动携带），
// 另附 acfun.midground.api_st 双保险（未登录时 token 换不到，直发让接口报错）。
// selection/feed 必须带 appVersion 头，douga/playInfo 不带（对齐 A 站客户端行为）。

var pcursor = '';
var exhausted = false;

// 令牌：登录后 id.app.acfun.cn 用网页 Cookie 换 acfun.midground.api_st
var apiSt = null, apiStBusy = null;
export function ensureApiSt(force) {
  if (apiSt && !force) return Promise.resolve(apiSt);
  if (apiStBusy) return apiStBusy;
  apiStBusy = fetch(CFG.api.token, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'sid=acfun.midground.api'
  }).then(function (r) { return r.json(); }).then(function (j) {
    apiStBusy = null;
    if (j && j.result === 0 && j['acfun.midground.api_st']) {
      apiSt = j['acfun.midground.api_st'];
      return apiSt;
    }
    throw new Error('token-denied');
  }, function (e) { apiStBusy = null; throw e; });
  return apiStBusy;
}

function homeHeaders(withAppVer) {
  var d = new Date();
  function p(n) { return n < 10 ? '0' + n : '' + n; }
  var h = {
    'User-Agent': CFG.home.ua,
    'acPlatform': 'ANDROID_PHONE',
    'deviceType': '1',
    'net': 'WIFI',
    'productId': '2000',
    'udid': 'acsv-' + Math.random().toString(36).slice(2) + Date.now(),
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
function postForm(url, body) {
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

// 弹幕颜色十进制 int → '#rrggbb'
export function intToHex(n) {
  n = Number(n);
  if (!n || n < 0) n = 0xFFFFFF;
  return '#' + ('000000' + (n & 0xFFFFFF).toString(16)).slice(-6);
}

export var AppAPI = {
  // ---- 首页推荐流 ----
  resetPager: function () { pcursor = ''; exhausted = false; },
  isExhausted: function () { return exhausted; },
  homeFeed: function () {
    if (exhausted) return Promise.resolve([]);
    var self = this;
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
          return {
            label: s.qualityLabel || s.qualityType || '默认',
            urls: (s.playUrls || []).map(function (u) {
              return /^http:/.test(u) ? u.replace(/^http:/, 'https:') : u;
            }).filter(function (u) { return /^https?:/.test(u); })
          };
        }).filter(function (x) { return x.urls.length; });
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
        self.applyQuality(item);
        return item.urls.length > 0;
      });
    });
  },

  // 按记忆清晰度（无记忆取最高档，streams 本身按清晰度降序）
  applyQuality: function (item) {
    var label = null;
    try { label = localStorage.getItem(CFG.lsQuality); } catch (e) { }
    var idx = 0;
    if (label) {
      for (var i = 0; i < item.qualities.length; i++) {
        if (item.qualities[i].label === label) { idx = i; break; }
      }
    }
    item.qIdx = idx;
    item.urls = item.qualities[idx].urls;
    item.urlIdx = 0;
  },

  // ---- 互动写接口 ----
  appPost: function (url, body) {
    return ensureApiSt().then(function (st) {
      return request(url, 'POST', homeHeaders(false), body + '&acfun.midground.api_st=' + encodeURIComponent(st));
    }, function () {
      // 未登录换不到 token：不带 st 直发，让接口自行报未登录
      return request(url, 'POST', homeHeaders(false), body);
    }).then(function (j) {
      return !!(j && j.result === 0);
    }, function () { return false; });
  },
  setFavorite: function (acId, on) {
    return this.appPost(on ? CFG.api.favorite : CFG.api.unFavorite,
      on ? 'resourceId=' + acId + '&resourceType=2'
        : 'resourceIds=' + acId + '&resourceType=2');
  },
  throwBanana: function (acId, count) {
    return this.appPost(CFG.api.banana,
      'resourceId=' + acId + '&resourceType=2&count=' + (count > 0 ? count : 1));
  },
  // 评论点赞：PC 端点（复用动态广场模块，网页 Cookie 即可，无需 token）
  commentLike: function (sourceId, sourceType, commentId, on) {
    return postForm(CFG.api.commentLikePc + (on ? 'like' : 'unlike'),
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      'sourceId=' + sourceId + '&sourceType=' + sourceType + '&commentId=' + commentId)
      .then(function (j) { return !!(j && j.result === 0); }, function () { return false; });
  },

  // 图片上传（移植动态广场 uploadImage：getToken → 分片 → complete → 换 URL）
  // 需 GM_xmlhttpRequest（二进制分片）；成功返回可长期访问的裸路径 URL
  uploadImage: function (file) {
    return new Promise(function (resolve) {
      if (typeof GM_xmlhttpRequest !== 'function') return resolve(null);
      var CHUNK = 1 << 20; // 1MB 分片
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://www.acfun.cn/rest/pc-direct/image/upload/getToken',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'fileName=' + encodeURIComponent(file.name || 'image.png'),
        timeout: 15000,
        onload: function (r) {
          var token = null;
          try {
            var d = JSON.parse(r.responseText);
            token = d.result === 0 && d.info ? d.info.token : null;
          } catch (e) { }
          if (!token) return resolve(null);
          var endpoint = 'https://upload.kuaishouzt.com';
          var total = file.size;
          var chunks = Math.max(1, Math.ceil(total / CHUNK));
          var i = 0;
          function nextChunk() {
            if (i >= chunks) return complete();
            var start = i * CHUNK;
            var end = Math.min(start + CHUNK, total);
            GM_xmlhttpRequest({
              method: 'POST',
              url: endpoint + '/api/upload/fragment?upload_token=' + encodeURIComponent(token) + '&fragment_id=' + i,
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Range': 'bytes ' + start + '-' + (end - 1) + '/' + total
              },
              data: file.slice(start, end),
              timeout: 60000,
              onload: function (r2) {
                try {
                  if (JSON.parse(r2.responseText).result === 1) { i++; return nextChunk(); }
                } catch (e) { }
                resolve(null);
              },
              onerror: function () { resolve(null); }
            });
          }
          function complete() {
            GM_xmlhttpRequest({
              method: 'POST',
              url: endpoint + '/api/upload/complete?upload_token=' + encodeURIComponent(token) + '&fragment_count=' + chunks,
              timeout: 30000,
              onload: function (r3) {
                try {
                  if (JSON.parse(r3.responseText).result === 1) return getUrl();
                } catch (e) { }
                resolve(null);
              },
              onerror: function () { resolve(null); }
            });
          }
          function getUrl() {
            GM_xmlhttpRequest({
              method: 'POST',
              url: 'https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              data: 'token=' + encodeURIComponent(token) + '&bizFlag=web-comment-text',
              timeout: 15000,
              onload: function (r4) {
                try {
                  var d4 = JSON.parse(r4.responseText);
                  resolve(d4.result === 0 && d4.url ? d4.url.split('?')[0] : null);
                } catch (e) { resolve(null); }
              },
              onerror: function () { resolve(null); }
            });
          }
          nextChunk();
        },
        onerror: function () { resolve(null); }
      });
    });
  },

  // 发评论/回复（复用动态广场 postComment：replyToCommentId 传入则为回复楼中楼；
  // midgroundToken 由网页 Cookie 换取，未登录时直发让接口报错）；失败透传 error_msg
  postComment: function (sourceId, sourceType, content, replyToCommentId) {
    var base = 'sourceId=' + sourceId + '&sourceType=' + sourceType
      + '&replyToCommentId=' + (replyToCommentId || 0)
      + '&content=' + encodeURIComponent(content);
    var FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };
    return ensureApiSt().then(function (st) {
      return postForm(CFG.api.commentAdd, base + '&midgroundToken=' + encodeURIComponent(st));
    }, function () {
      return postForm(CFG.api.commentAdd, base);
    }).then(function (j) {
      if (j && j.result === 0) return { ok: true };
      return { ok: false, msg: (j && (j.error_msg || j.msg)) || '' };
    }, function () { return { ok: false, msg: '网络错误' }; });
  },

  // ---- 弹幕（www.acfun.cn 同域，网页 Cookie） ----
  // 注意：POST body 必须带表单 Content-Type，否则后端解析不到参数（result 21）
  // 全量分页拉取，返回按 position 升序的规整条目
  danmakuList: function (videoId) {
    var all = [];
    var FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };
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
          if (!next || next === 'no_more' || next === '0'
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
