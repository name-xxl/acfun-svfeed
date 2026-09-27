// ==UserScript==
// @name         AcFun 小视频 - PC 站抖音式竖滑页
// @namespace    https://github.com/acvideo/acfun-svfeed
// @version      0.7.1
// @description  在 www.acfun.cn 顶部导航加入「小视频」入口，打开全屏抖音式竖滑小视频信息流（数据来自 AcFun 小视频 meow 接口，免登录）
// @author       acvideo
// @match        https://www.acfun.cn/*
// @grant        GM_xmlhttpRequest
// @connect      m.acfun.cn
// @connect      www.acfun.cn
// @run-at       document-end
// @noframes
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // 0. CFG —— 常量表（魔法值唯一来源）
  // ===================================================================
  var CFG = {
    hash: 'svfeed',
    lsSound: 'acsv-sound-on',
    accent: '#fd4c5d',
    api: {
      feed: 'https://m.acfun.cn/rest/mobile-direct/meow/feedList?count=20&firstPage=false',
      info: 'https://m.acfun.cn/rest/mobile-direct/meow/info?meowId=',
      comment: 'https://www.acfun.cn/rest/pc-direct/comment/list?sourceId=',
      token: 'https://id.app.acfun.cn/rest/web/token/get',
      interact: 'https://api.kuaishouzt.com/rest/zt/interact/',
      follow: 'https://www.acfun.cn/rest/pc-direct/relation/follow',
      emotion: 'https://m.acfun.cn/rest/mobile-direct/emotion/getUserEmotion',
      upPage: 'https://m.acfun.cn/upPage/',
      shareBase: 'https://m.acfun.cn/sv/?mid=',
      userBase: 'https://www.acfun.cn/u/',
      defaultAvatar: 'https://imgs.aixifan.com/style/image/defaultAvatar.jpg',
      logoSvg: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/common/widget/header/img/acfunlogo.11a9841251f31e1a3316.svg'
    },
    feed: { count: 20, bufferSize: 4 },
    page: { size: 10 },
    time: {
      ctlIdle: 2500, // 控制栏闲置隐藏
      hold: 350,     // 长按右键进入 2x 的阈值
      toast: 1800,   // toast 停留
      xhr: 15000,    // XHR 超时
      gm: 20000,     // GM 请求超时
      chainGap: 30,  // 空间页链式加载间隔
      hotGap: 120,   // 最热统计批次间隔
      seekStep: 5,   // 左右键快进/快退秒数
      navWait: 6000  // 导航注入兜底等待
    },
    nav: { labels: ['首页', '番剧', '直播', '文章区', '鱼塘'], tries: 20, retryMs: 500 },
    io: { ratio: 0.6 },
    fmt: { wanMin: 9999 }
  };
  var PAGE_SIZE = CFG.page.size; // 空间页分页大小

  // ---------- 网络层 ----------
  function request(url, method) {
    method = method || 'POST';
    return new Promise(function (resolve, reject) {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: method,
          url: url,
          timeout: 15000,
          onload: function (r) {
            try { resolve(JSON.parse(r.responseText)); }
            catch (e) { reject(new Error('bad json')); }
          },
          onerror: function () { reject(new Error('network')); },
          ontimeout: function () { reject(new Error('timeout')); }
        });
      } else {
        // 站点可能重写 window.fetch（A 站页面包装器对部分 URL 会抛错），回退用 XHR
        var x = new XMLHttpRequest();
        x.open(method, url);
        x.withCredentials = true;
        x.timeout = 15000;
        x.onload = function () {
          try { resolve(JSON.parse(x.responseText)); }
          catch (e) { reject(e); }
        };
        x.onerror = function () { reject(new Error('network')); };
        x.ontimeout = function () { reject(new Error('timeout')); };
        x.send();
      }
    });
  }

  // ---------- 数据层 ----------
  function normalize(raw) {
    var play = raw.playInfo || {};
    var urls = (play.videoUrls || []).map(function (u) { return u && u.url; })
      .filter(function (u) { return u && /^https?:/.test(u); });
    var covers = play.coverUrls && play.coverUrls.length ? play.coverUrls
      : (play.firstFrameUrls || []);
    var user = raw.user || {};
    var counts = raw.meowCounts || {};
    return {
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

    // ===
  // 5. 信息流数据仓库（纯数据 + 游标泵；UI 通过 env.onChange 得到通知）
  // ===
  function createFeedStore(env) {
    var store = {
      items: [],
      seen: {},
      loading: false,
      pumpBusy: false,
      current: 0,

      changed: function () { if (env.onChange) env.onChange(); },

      fetchMore: function () {
        var self = this;
        if (self.loading) return Promise.resolve();
        self.loading = true;
        return env.api.feed().then(function (list) {
          self.loading = false;
          list.forEach(function (n) {
            if (n.id && !self.seen[n.id] && n.urls.length) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
          });
          self.changed();
        }, function () { self.loading = false; });
      },

      // 直链过期刷新：换备用 CDN 或重取详情
      refresh: function (item) {
        return env.api.info(item.id).then(function (p) {
          if (p && p.urls.length) { item.urls = p.urls; item.urlIdx = 0; return true; }
          return false;
        }, function () { return false; });
      },

      ensureMore: function () {
        var self = this;
        var ctx = env.getListContext();
        if (ctx) {
          // 空间页进入：按主页列表顺序泵入后续视频
          self.pumpListContext(ctx);
          return Promise.resolve();
        }
        if (self.items.length === 0 || self.current >= self.items.length - CFG.feed.bufferSize) {
          return self.fetchMore();
        }
        return Promise.resolve();
      },

      // 按列表上下文顺序泵入下一条（逐个取详情，保持列表顺序）
      pumpListContext: function (ctx) {
        var self = this;
        if (!ctx || self.pumpBusy) return;
        self.pumpBusy = true;
        (function step() {
          if (self.getListContext() !== ctx) { self.pumpBusy = false; return; }
          while (ctx.feedCursor < ctx.items.length
            && self.seen[ctx.items[ctx.feedCursor].id]) {
            ctx.feedCursor++;
          }
          if (ctx.feedCursor >= ctx.items.length) {
            // 已加载的列表耗尽：空间页后台还在加载则等它，否则回落随机流
            self.pumpBusy = false;
            if (ctx.done) self.fetchMore().then(function () { env.onChange(); });
            return;
          }
          var raw = ctx.items[ctx.feedCursor];
          env.api.info(raw.id).then(function (n) {
            if (n && n.id && n.urls.length && !self.seen[n.id]) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
            ctx.feedCursor++;
            self.pumpBusy = false;
            if (self.items.length - self.current < CFG.feed.bufferSize) self.pumpListContext(ctx);
            else env.onChange();
          }, function () {
            ctx.feedCursor++;
            self.pumpBusy = false;
            self.pumpListContext();
          });
        })();
      },

      resetForList: function () {
        this.items = [];
        this.seen = {};
        this.current = 0;
        this.loading = false;
        this.pumpBusy = false;
      },

      // 进入时带 meowId：缓冲为空则加载该条置顶；缓冲已有则跳到它
      loadFirst: function (mid) {
        var self = this;
        if (self.items.length) {
          for (var i = 0; i < self.items.length; i++) {
            if (String(self.items[i].id) === String(mid)) {
              self.current = i;
              return Promise.resolve();
            }
          }
          return Promise.resolve();
        }
        return env.api.info(mid).then(function (n) {
          if (n && n.id && n.urls.length) {
            self.seen[n.id] = 1;
            self.items.unshift(n);
            self.current = 0;
            return;
          }
          return self.fetchMore();
        }, function () { return self.fetchMore(); });
      }
    };
    return store;
  }

  var FeedStore = createFeedStore({
    api: {
      feed: function () { return API.feed(); },
      info: function (id) { return API.info(id); }
    },
    onChange: function () { if (scroller) renderWindow(); },
    getListContext: function () { return UpVideos.feedActive ? UpVideos : null; }
  });

    function fmt(n) {
    n = Number(n) || 0;
    return n <= CFG.fmt.wanMin ? String(n) : (n / 10000).toFixed(1) + '万';
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(Number(s) || 0));
    var m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
  }

  // ---------- API：站点接口（mock 桩统一在 API 层收口） ----------
  function mockData() { return window.__ACSV_MOCK__ || null; }

  var API = {
    // 随机推荐流：返回规整后的条目数组
    feed: function () {
      var mock = mockData();
      if (mock && mock.feed) {
        return Promise.resolve((mock.feed || [])
          .filter(function (r) { return r && r.playInfo && r.playInfo.videoUrls && r.playInfo.videoUrls.length; })
          .map(normalize));
      }
      return request(CFG.api.feed).then(function (json) {
        return ((json && json.meowFeed) || []).map(normalize);
      });
    },
    // 单条详情：找不到时 resolve null
    info: function (mid) {
      var mock = mockData();
      if (mock && mock.feed) {
        var raw = mock.feed.filter(function (r) { return String(r.meowId) === String(mid); })[0];
        return Promise.resolve(raw ? normalize(raw) : null);
      }
      return request(CFG.api.info + mid).then(function (json) {
        return (json && json.meowFeed) ? normalize(json.meowFeed) : null;
      });
    }
  };

  // ---------- 路由 ----------
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var m = h.match(new RegExp('^' + CFG.hash + '(?:\\/(\\d+))?'));
    return {
      active: !!m || location.pathname === '/' + CFG.hash,
      mid: m && m[1] ? m[1] : null
    };
  }

  function isFeedRoute() {
    return parseRoute().active;
  }

  // 地址栏跟随当前视频：#svfeed/<meowId>，刷新/分享可回到同一条
  function syncHash(idx) {
    if (!root) return;
    var it = FeedStore.items[idx];
    if (!it) return;
    try {
      history.replaceState(null, '',
        location.pathname + location.search + '#' + CFG.hash + '/' + it.id);
    } catch (e) { }
  }

  // ---------- UI ----------
  var root = null, scroller = null, io = null, keyHandler = null, keyUpHandler = null;
  var soundOn = false, firstGestureSeen = false;
  var autoplayNext = false, playRate = 1;
  var seekHold = { active: false, timer: null, prevRate: 1 };

  function currentVideo() {
    return scroller && scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"] video');
  }

  var CSS = ''
    + '#acsv-root{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;user-select:none}'
    + '.acsv-root *{box-sizing:border-box;margin:0;padding:0}'
    + '.acsv-top{position:absolute;top:0;left:0;right:0;height:56px;display:flex;align-items:center;'
    + 'padding:0 24px;background:linear-gradient(rgba(0,0,0,.6),transparent);z-index:30;pointer-events:none}'
    + '.acsv-top *{pointer-events:auto}'
    + '.acsv-logo{display:flex;align-items:center;gap:8px;min-width:0}'
    + '.acsv-logo-img{height:26px;width:auto;display:block}'
    + '.acsv-logo em{color:#fff;font-style:normal;font-weight:400;font-size:13px;margin-left:8px;opacity:.9}'
    + '.acsv-top-right{margin-left:auto;display:flex;gap:10px}'
    + '.acsv-tbtn{width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.14);'
    + 'color:#fff;cursor:pointer;display:grid;place-items:center;font-size:16px;transition:transform .15s,background .15s}'
    + '.acsv-tbtn:hover{transform:scale(1.08);background:rgba(255,255,255,.25)}'
    + '.acsv-scroller{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}'
    + '.acsv-scroller::-webkit-scrollbar{display:none}'
    + '.acsv-slide{position:relative;height:100vh;height:100dvh;scroll-snap-align:start;scroll-snap-stop:always;'
    + 'display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}'
    + '.acsv-video{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;cursor:pointer;z-index:5}'
    + '.acsv-ambient{position:absolute;inset:-60px;z-index:0;background-size:cover;background-position:center;'
    + 'filter:blur(60px) brightness(.35) saturate(1.2);transform:scale(1.15)}'
    + '.acsv-rail{position:absolute;right:36px;bottom:96px;z-index:20;width:56px;display:flex;flex-direction:column;'
    + 'align-items:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}'
    + '.acsv-avatar{width:48px;height:48px;border-radius:50%;border:2px solid #fff;object-fit:cover;display:block;transition:transform .15s}'
    + '.acsv-avwrap{position:relative;margin-bottom:18px}'
    + '.acsv-followbtn{position:absolute;right:-2px;bottom:-4px;width:20px;height:20px;border-radius:50%;'
    + 'background:#fd4c5d;color:#fff;border:2px solid #111;font-size:13px;line-height:17px;text-align:center;'
    + 'cursor:pointer;font-weight:700;user-select:none;transition:transform .15s,background .15s;z-index:2}'
    + '.acsv-followbtn:hover{transform:scale(1.15)}'
    + '.acsv-followbtn.on{background:#555}'
    + '.acsv-avatar:hover{transform:scale(1.08)}'
    + '.acsv-rail-btn{width:56px;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;'
    + 'align-items:center;margin-bottom:18px}'
    + '.acsv-rail-btn svg{width:40px;height:40px;fill:#fff;filter:drop-shadow(0 1px 4px rgba(0,0,0,.55));transition:transform .15s}'
    + '.acsv-rail-btn:hover svg{transform:scale(1.12)}'
    + '.acsv-rail-btn.on svg{fill:#fd4c5d}'
    + '.acsv-rail-btn.bump svg{animation:acsv-bump .4s ease}'
    + '@keyframes acsv-bump{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1)}}'
    + '.acsv-count{font-size:13px;font-weight:500;line-height:16px;margin-top:4px;margin-bottom:0;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}'
    + '.acsv-info{position:absolute;left:24px;bottom:40px;z-index:15;max-width:min(56%,560px);color:#fff;'
    + 'text-shadow:0 1px 4px rgba(0,0,0,.7);transition:bottom .25s ease}'
    + '.acsv-slide[data-ctl="1"] .acsv-info,.acsv-slide[data-paused="1"] .acsv-info{bottom:96px}'
    + '.acsv-meta{font-size:15px;font-weight:600;line-height:21px;margin-bottom:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}'
    + '.acsv-meta .acsv-views{font-size:13px;font-weight:400;opacity:.85}'
    + '.acsv-meta a{color:#fff;text-decoration:none}'
    + '.acsv-meta a:hover{text-decoration:underline}'
    + '.acsv-title{font-size:16px;font-weight:400;line-height:22px;max-height:66px;overflow:hidden;cursor:default}'
    + '.acsv-arrows{position:absolute;right:44px;bottom:508px;z-index:28;display:flex;flex-direction:column;gap:10px}'
    + '.acsv-arrow{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.12);cursor:pointer;'
    + 'display:grid;place-items:center;backdrop-filter:blur(4px);transition:background .15s,transform .15s}'
    + '.acsv-arrow svg{width:22px;height:22px;fill:#fff}'
    + '.acsv-arrow:hover{background:rgba(255,255,255,.25);transform:scale(1.06)}'
    + '.acsv-arrow:disabled{opacity:.3;cursor:default;transform:none}'
    + '.acsv-controls{position:absolute;left:0;right:0;bottom:0;z-index:25;padding:26px 14px 8px;'
    + 'background:linear-gradient(transparent,rgba(0,0,0,.72));opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s,right .28s ease}'
    + '.acsv-slide[data-ctl="1"] .acsv-controls,.acsv-slide[data-paused="1"] .acsv-controls{opacity:1;visibility:visible}'
    + '.acsv-track{position:relative;height:4px;margin:0 4px 6px;border-radius:2px;background:rgba(255,255,255,.32);cursor:pointer;transition:height .15s}'
    + '.acsv-track:hover,.acsv-track[data-drag="1"]{height:6px}'
    + '.acsv-track-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#fd4c5d;border-radius:2px}'
    + '.acsv-track-handle{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:#fff;'
    + 'transform:translate(-50%,-50%) scale(0);transition:transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.5)}'
    + '.acsv-track:hover .acsv-track-handle,.acsv-track[data-drag="1"] .acsv-track-handle{transform:translate(-50%,-50%) scale(1)}'
    + '.acsv-bubble{position:absolute;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.82);padding:3px 8px;'
    + 'border-radius:6px;font-size:12px;display:none;white-space:nowrap}'
    + '.acsv-bubble.show{display:block}'
    + '.acsv-ctl-row{display:flex;align-items:center;gap:6px}'
    + '.acsv-cbtn{border:none;background:none;color:#fff;cursor:pointer;height:32px;min-width:32px;padding:0 6px;'
    + 'border-radius:6px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;'
    + 'font-family:inherit;transition:background .15s}'
    + '.acsv-cbtn:hover{background:rgba(255,255,255,.16)}'
    + '.acsv-cbtn svg{width:20px;height:20px;fill:#fff}'
    + '.acsv-cbtn.on{color:#fd4c5d}'
    + '.acsv-cbtn.on svg{fill:#fd4c5d}'
    + '.acsv-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}'
    + '.acsv-cbtn.on .acsv-dot{background:#fd4c5d}'
    + '.acsv-time{font-size:12px;color:#ddd;font-variant-numeric:tabular-nums;margin-left:4px}'
    + '.acsv-icon-img{width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 1px 4px rgba(0,0,0,.55));transition:transform .15s}'
    + '.acsv-rail-btn:hover .acsv-icon-img{transform:scale(1.12)}'
    + '.acsv-rail-btn.on .acsv-icon-img{filter:invert(52%) sepia(52%) saturate(1800%) hue-rotate(310deg) brightness(1.05)}'
    + '.acsv-rail-btn.bump .acsv-icon-img{animation:acsv-bump .4s ease}'
    + '.acsv-drawer{position:absolute;top:0;right:0;bottom:0;width:min(380px,88vw);z-index:45;display:flex;flex-direction:column;'
    + 'background:rgba(22,22,27,.96);backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.09);'
    + 'transform:translateX(100%);transition:transform .28s ease}'
    + '.acsv-drawer.open{transform:translateX(0)}'
    + '.acsv-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:15px;font-weight:600;'
    + 'border-bottom:1px solid rgba(255,255,255,.09);flex:none}'
    + '.acsv-drawer-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;'
    + 'border-radius:50%;cursor:pointer;font-size:13px;line-height:1}'
    + '.acsv-drawer-close:hover{background:rgba(255,255,255,.22)}'
    + '.acsv-drawer-list{flex:1;overflow-y:auto;padding:6px 0 14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}'
    + '.acsv-drawer-list::-webkit-scrollbar{width:5px}'
    + '.acsv-drawer-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}'
    + '.acsv-citem{padding:10px 14px;display:flex;gap:10px;border-radius:10px;transition:background .15s}'
    + '.acsv-citem:hover{background:rgba(255,255,255,.045)}'
    + '.acsv-avlink{flex:none;display:block}'
    + '.acsv-citem img.av{width:36px;height:36px;border-radius:50%;object-fit:cover;transition:transform .15s}'
    + '.acsv-avlink:hover img.av{transform:scale(1.08)}'
    + '.acsv-cbody{flex:1;min-width:0}'
    + '.acsv-cname{font-size:13px;color:#9aa0ab;margin-bottom:4px;display:flex;align-items:center;gap:6px}'
    + '.acsv-cname a{color:#9aa0ab;text-decoration:none}'
    + '.acsv-cname a:hover{color:#e8eaed;text-decoration:underline}'
    + '.acsv-cname .up{background:#fd4c5d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600}'
    + '.acsv-ctext{font-size:14px;line-height:1.6;word-break:break-word;white-space:pre-wrap;color:#f0f1f3}'
    + '.acsv-cmeta{font-size:12px;color:#7a7f8a;margin-top:6px;display:flex;gap:12px;align-items:center}'
    + '.acsv-clike{display:inline-flex;align-items:center;gap:3px}'
    + '.acsv-clike svg{width:12px;height:12px;fill:#7a7f8a}'
    + '.acsv-csub{margin:8px 0 2px;padding:4px 12px;background:rgba(255,255,255,.05);border-radius:10px}'
    + '.acsv-csub .acsv-citem{padding:8px 0}'
    + '.acsv-csub .acsv-citem:hover{background:none}'
    + '.acsv-csub .acsv-citem img.av{width:26px;height:26px}'
    + '.acsv-cmore{font-size:12px;color:#9fd0ff;text-decoration:none}'
    + '.acsv-drawer-more{display:block;margin:12px auto;padding:8px 24px;border:1px solid rgba(255,255,255,.22);'
    + 'background:none;color:#ddd;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}'
    + '.acsv-drawer-more:hover{background:rgba(255,255,255,.1)}'
    + '.acsv-drawer-tip{padding:46px 0;text-align:center;color:#888;font-size:13px}'
    + '.acsv-hint{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);z-index:40;display:flex;'
    + 'align-items:center;gap:10px;padding:8px 10px 8px 16px;background:rgba(0,0,0,.72);border-radius:999px;'
    + 'font-size:13px;white-space:nowrap;animation:acsv-fadein .3s ease}'
    + '.acsv-hint.hide{display:none}'
    + '.acsv-hint-btn{border:none;background:#fd4c5d;color:#fff;font-size:12px;font-family:inherit;'
    + 'padding:6px 14px;border-radius:999px;cursor:pointer}'
    + '.acsv-hint-btn:hover{background:#ff6b7a}'
    + '.acsv-hint-x{border:none;background:none;color:#aaa;font-size:14px;cursor:pointer;padding:4px 8px;line-height:1}'
    + '.acsv-hint-x:hover{color:#fff}'
    + '@keyframes acsv-fadein{from{opacity:0}to{opacity:1}}'
    + '.acsv-spinner{position:absolute;top:50%;left:50%;margin:-16px 0 0 -16px;width:32px;height:32px;z-index:8;'
    + 'border:3px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite;pointer-events:none}'
    + '@keyframes acsv-spin{to{transform:rotate(360deg)}}'
    + '.acsv-slide[data-state="loading"] .acsv-spinner{display:block}.acsv-spinner{display:none}'
    + '.acsv-playicon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9;width:72px;height:72px;'
    + 'border-radius:50%;background:rgba(0,0,0,.5);display:none;place-items:center;pointer-events:none}'
    + '.acsv-playicon svg{width:34px;height:34px;fill:#fff;margin-left:4px}'
    + '.acsv-slide[data-paused="1"] .acsv-playicon{display:grid}'
    + '.acsv-errbox{position:absolute;inset:0;display:none;place-items:center;z-index:12;flex-direction:column;gap:12px;color:#bbb}'
    + '.acsv-slide[data-state="error"] .acsv-errbox{display:grid}'
    + '.acsv-retry{padding:8px 22px;border:none;border-radius:999px;background:#fd4c5d;color:#fff;cursor:pointer;font-size:13px}'
    + '.acsv-toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2147483600;background:rgba(0,0,0,.78);'
    + 'color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .25s;pointer-events:none}'
    + '.acsv-toast.show{opacity:1}'
    + '.acsv-fab{position:fixed;right:18px;bottom:18px;z-index:2147482990;background:#fd4c5d;color:#fff;border:none;'
    + 'border-radius:999px;padding:10px 16px;font-size:13px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}'
    // UP 主空间页的小视频区块（空间页为浅色主题）
    + '.acsv-space{margin:18px auto 40px;max-width:1160px;font-family:inherit}'
    + '.acsv-space-head{display:flex;align-items:baseline;gap:8px;padding:0 4px 10px;'
    + 'border-bottom:2px solid #fd4c5d;margin-bottom:14px}'
    + '.acsv-space-head h2{font-size:18px;color:#333;margin:0;font-weight:700}'
    + '.acsv-space-head .n{color:#999;font-size:13px}'
    + '.acsv-space-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}'
    + '@media (max-width:1000px){.acsv-space-grid{grid-template-columns:repeat(3,1fr)}}'
    + '@media (max-width:640px){.acsv-space-grid{grid-template-columns:repeat(2,1fr)}}'
    + '.acsv-space-cell{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;'
    + 'aspect-ratio:3/4;background:#000;display:block}'
    + '.acsv-space-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s,opacity .2s;opacity:0}'
    + '.acsv-space-cell img.ld{opacity:1}'
    + '.acsv-space-cell:hover img{transform:scale(1.06)}'
    + '.acsv-space-more{display:block;margin:16px auto;padding:8px 28px;border:1px solid #ddd;background:#fff;'
    + 'color:#666;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}'
    + '.acsv-space-more:hover{color:#fd4c5d;border-color:#fd4c5d}'
    + '.acsv-space-tip{padding:30px 0;text-align:center;color:#999;font-size:13px}'
    // 评论抽屉避让：单一类驱动，五处位移（scroller/rail/arrows/controls/info）同一过渡
    + '.acsv-scroller,.acsv-rail,.acsv-arrows,.acsv-controls,.acsv-info{transition:transform .28s ease,right .28s ease,bottom .25s ease,opacity .25s,visibility .25s}'
    + '#acsv-root.acsv-with-comments .acsv-scroller{transform:translateX(calc(min(380px, 88vw) / -2))}'
    + '#acsv-root.acsv-with-comments .acsv-rail{transform:translateX(calc(24px - min(380px, 88vw) / 2))}'
    + '#acsv-root.acsv-with-comments .acsv-arrows{transform:translateX(calc(24px - min(380px, 88vw)))}'
    + '#acsv-root.acsv-with-comments .acsv-controls{left:calc(min(380px, 88vw) / 2);right:calc(min(380px, 88vw) / 2 + 14px)}'
    + '#acsv-root.acsv-with-comments .acsv-info{transform:translateX(calc(min(380px, 88vw) / 2))}'
    // 评论内 UBB 渲染（表情/图片）
    + '.ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}'
    + '.ubb-imgc{display:block;max-width:min(240px,100%);max-height:220px;border-radius:8px;margin-top:6px;cursor:zoom-in}'
    // 空间页小视频：工具栏（进度 + 排序）与分页条
    + '.acsv-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:0 0 10px;position:relative}'
    + '.acsv-progress-txt{font-size:12px;color:#999;margin-right:auto}'
    + '.acsv-sort{position:relative;cursor:pointer;font-size:13px;color:#666;user-select:none;'
    + 'padding:4px 10px;border:1px solid #e5e5e5;border-radius:4px;background:#fff}'
    + '.acsv-sort:hover{border-color:#fd4c5d;color:#fd4c5d}'
    + '.acsv-sort .arrow{font-size:10px;margin-left:4px}'
    + '.acsv-sort-menu{display:none;position:absolute;right:0;top:110%;z-index:30;min-width:100%;'
    + 'background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.12);overflow:hidden}'
    + '.acsv-sort.open .acsv-sort-menu{display:block}'
    + '.acsv-sort-menu li{list-style:none;padding:8px 18px;white-space:nowrap}'
    + '.acsv-sort-menu li:hover{background:#fdf0f1;color:#fd4c5d}'
    + '.acsv-sort-menu li.on{color:#fd4c5d;font-weight:700}'
    + '.acsv-pagebar{display:flex;justify-content:center;align-items:center;gap:6px;margin:18px 0 6px;flex-wrap:wrap}'
    + '.acsv-pagebtn{min-width:32px;height:32px;padding:0 8px;border:1px solid #e0e0e0;background:#fff;'
    + 'color:#555;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s}'
    + '.acsv-pagebtn:hover:not(:disabled):not(.cur){border-color:#fd4c5d;color:#fd4c5d}'
    + '.acsv-pagebtn.cur{background:#fd4c5d;border-color:#fd4c5d;color:#fff;cursor:default}'
    + '.acsv-pagebtn:disabled{color:#ccc;cursor:default;background:#f7f7f7}'
    + '.acsv-pagebtn.dots{border:none;background:none;cursor:default}';

  var ICONS = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    volOn: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    volOff: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.4 1.4L12 10.8l4.6 4.6L18 14z"/></svg>',
    chevDn: '<svg viewBox="0 0 24 24"><path d="M12 16l-6-6 1.4-1.4L12 13.2l4.6-4.6L18 10z"/></svg>'
  };

  // A 站小视频页面自带的操作图标（加载失败自动回退到手绘 SVG）
  var SITE_ICONS = {
    heart: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_zan@2x.3e69f4646decbd73fd17.png',
    comment: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_comment@2x.9d8f81ede8984dd9aa34.png',
    share: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_share@2x.f63773e510e6d3259acb.png'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var toastTimer = null;
  function toast(msg) {
    if (!root) return;
    var t = root.querySelector('.acsv-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, CFG.time.toast);
  }

  // ---------- 播放控制栏 ----------
  function showControls(slide) {
    slide.dataset.ctl = '1';
    clearTimeout(slide._ctlTimer);
    slide._ctlTimer = setTimeout(function () {
      var v = slide.querySelector('video');
      if (v && !v.paused) slide.dataset.ctl = '';
    }, CFG.time.ctlIdle);
  }

  function buildControls(slide, idx) {
    var box = el('div', 'acsv-controls');

    var track = el('div', 'acsv-track');
    var fill = el('div', 'acsv-track-fill');
    var handle = el('div', 'acsv-track-handle');
    var bubble = el('div', 'acsv-bubble');
    track.appendChild(fill);
    track.appendChild(handle);
    track.appendChild(bubble);

    var dragging = false;
    function videoOf() { return slide.querySelector('video'); }
    function ratioAt(ev) {
      var r = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    }
    function preview(ratio, live) {
      if (live) {
        fill.style.width = ratio * 100 + '%';
        handle.style.left = ratio * 100 + '%';
      }
      var v = videoOf();
      if (v && v.duration) bubble.textContent = fmtTime(ratio * v.duration);
      bubble.style.left = ratio * 100 + '%';
      bubble.classList.add('show');
    }
    track.addEventListener('pointerdown', function (ev) {
      dragging = true;
      track.dataset.drag = '1';
      try { track.setPointerCapture(ev.pointerId); } catch (e) { }
      preview(ratioAt(ev), true);
      ev.preventDefault();
    });
    track.addEventListener('pointermove', function (ev) {
      preview(ratioAt(ev), dragging);
    });
    track.addEventListener('pointerleave', function () {
      if (!dragging) bubble.classList.remove('show');
    });
    track.addEventListener('pointerup', function (ev) {
      if (!dragging) return;
      dragging = false;
      track.dataset.drag = '';
      var v = videoOf();
      var ratio = ratioAt(ev);
      if (v && v.duration) v.currentTime = ratio * v.duration;
      bubble.classList.remove('show');
      showControls(slide);
    });
    track.addEventListener('pointercancel', function () {
      dragging = false;
      track.dataset.drag = '';
      bubble.classList.remove('show');
    });

    var row = el('div', 'acsv-ctl-row');

    var playBtn = el('button', 'acsv-cbtn acsv-cplay', ICONS.pause);
    playBtn.title = '播放/暂停（空格）';
    playBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var v = videoOf();
      if (!v) return;
      if (!firstGestureSeen && !soundOn) { firstGestureSeen = true; enableSound(v); hideSoundHint(); return; }
      firstGestureSeen = true;
      if (v.paused) playVideo(v); else v.pause();
    });

    var timeLabel = el('span', 'acsv-time', '00:00 / 00:00');
    var spacer = el('span');
    spacer.style.flex = '1';

    var autoBtn = el('button', 'acsv-cbtn acsv-cauto', '<span class="acsv-dot"></span>连播');
    autoBtn.title = '播完自动播放下一条（关闭则单条循环）';
    autoBtn.classList.toggle('on', autoplayNext);
    autoBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      autoplayNext = !autoplayNext;
      autoBtn.classList.toggle('on', autoplayNext);
      if (scroller) {
        var vs = scroller.querySelectorAll('video');
        Array.prototype.forEach.call(vs, function (v) { v.loop = !autoplayNext; });
      }
      toast(autoplayNext ? '连播已开启：播完自动下一条' : '连播已关闭：单条循环播放');
    });

    var rateBtn = el('button', 'acsv-cbtn acsv-crate', '倍速 ' + playRate.toFixed(1) + 'x');
    rateBtn.title = '切换播放速度';
    rateBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var rates = [0.5, 1, 1.5, 2];
      var i = rates.indexOf(playRate);
      playRate = rates[(i + 1) % rates.length];
      rateBtn.textContent = '倍速 ' + playRate.toFixed(1) + 'x';
      if (scroller) {
        var vs = scroller.querySelectorAll('video');
        Array.prototype.forEach.call(vs, function (v) { v.playbackRate = playRate; });
      }
      toast('播放速度：' + playRate + 'x');
    });

    var muteBtn = el('button', 'acsv-cbtn acsv-cmute', soundOn ? ICONS.volOn : ICONS.volOff);
    muteBtn.title = '静音开关（M）';
    muteBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var v = videoOf();
      if (!firstGestureSeen) firstGestureSeen = true;
      toggleSound(v);
      if (v && soundOn) playVideo(v);
      hideSoundHint();
    });

    var fsBtn = el('button', 'acsv-cbtn acsv-cfs', ICONS.fs);
    fsBtn.title = '全屏（F）';
    fsBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root && root.requestFullscreen) root.requestFullscreen();
    });

    row.appendChild(playBtn);
    row.appendChild(timeLabel);
    row.appendChild(spacer);
    row.appendChild(autoBtn);
    row.appendChild(rateBtn);
    row.appendChild(muteBtn);
    row.appendChild(fsBtn);

    box.appendChild(track);
    box.appendChild(row);
    box.addEventListener('click', function (ev) { ev.stopPropagation(); });
    box.addEventListener('mousemove', function () { showControls(slide); });

    slide._ctlTime = timeLabel;
    slide._ctlPlayBtn = playBtn;
    slide._ctlFill = fill;
    slide._ctlHandle = handle;
    return box;
  }

  function updateArrows() {
    if (!root) return;
    var up = root.querySelector('.acsv-arrow-up');
    if (up) {
      // 第一条直接隐藏上一条按钮
      up.style.display = FeedStore.current <= 0 ? 'none' : 'grid';
      up.disabled = FeedStore.current <= 0;
    }
  }

  function refreshMuteIcons() {
    if (!root) return;
    var bs = root.querySelectorAll('.acsv-cmute');
    Array.prototype.forEach.call(bs, function (b) {
      b.innerHTML = soundOn ? ICONS.volOn : ICONS.volOff;
    });
  }

  // ---------- 真实互动（点赞 / 关注） ----------
  // 点赞：id.app.acfun.cn 换 api_st → api.kuaishouzt.com interact/add|delete（objectType=2 对 meow 同样有效）
  // 关注：www.acfun.cn/rest/pc-direct/relation/follow（toUserId + action 1/2）
  // 均依赖登录 cookie；未登录时点赞回退本地状态，关注给出提示
  var apiSt = null, apiStBusy = null;

  function ensureApiSt(force) {
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

  function callInteract(st, item, add) {
    return fetch(CFG.api.interact + (add ? 'add' : 'delete'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'objectId=' + item.id + '&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP'
        + '&acfun.midground.api_st=' + encodeURIComponent(st)
    }).then(function (r) { return r.json(); }).then(function (j) {
      return !!(j && j.result === 1);
    });
  }

  function setRealLike(item, on) {
    return ensureApiSt().then(function (st) {
      return callInteract(st, item, on);
    }, function () { return false; }).then(function (ok) {
      if (ok) return true;
      // 令牌可能过期：强制刷新重试一次
      return ensureApiSt(true).then(function (st2) {
        return callInteract(st2, item, on);
      }).catch(function () { return false; });
    });
  }

  function setRealFollow(item, on) {
    return fetch(CFG.api.follow, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'toUserId=' + item.userId + '&action=' + (on ? 1 : 2) + '&groupId='
    }).then(function (r) { return r.json(); }).then(function (j) {
      return !!(j && j.result === 0);
    }).catch(function () { return false; });
  }

  // ---------- 评论抽屉 ----------
  // A 站通用评论系统：小视频的 sourceType=5，sourceId 即 meowId（无需登录），接口在 CFG.api.comment
  var commentDrawer = null;
  var commentState = { meowId: 0, page: 1, totalPage: 1, pcursor: 'no_more', loading: false };

  // 表情包映射：[emot=acfun,id/] → cdn 图 URL（POST getUserEmotion，登录可用）
  var EmotionMap = { loaded: false, loading: null, map: {} };
  function ensureEmotionMap() {
    if (EmotionMap.loaded) return Promise.resolve();
    if (EmotionMap.loading) return EmotionMap.loading;
    EmotionMap.loading = request(CFG.api.emotion, 'POST').then(function (j) {
      EmotionMap.loaded = true;
      var pkgs = (j && j.emotionPackageList) || [];
      pkgs.forEach(function (p) {
        (p.emotions || []).forEach(function (e) {
          try {
            var u = e.bigImageInfo && e.bigImageInfo.thumbnailImage && e.bigImageInfo.thumbnailImage.cdnUrls && e.bigImageInfo.thumbnailImage.cdnUrls[0] && e.bigImageInfo.thumbnailImage.cdnUrls[0].url;
            if (!u && e.smallImageInfo) {
              u = e.smallImageInfo.thumbnailImage && e.smallImageInfo.thumbnailImage.cdnUrls && e.smallImageInfo.thumbnailImage.cdnUrls[0] && e.smallImageInfo.thumbnailImage.cdnUrls[0].url;
            }
            if (u) EmotionMap.map[String(e.id)] = u;
          } catch (err) { }
        });
      });
    }, function () { });
    return EmotionMap.loading;
  }

  var IMG_CDN_OK = /(imgs|tx-cdn|cdn|tx-free|tx-free-imgs|tx-free-imgs2|ali-imgs)\.(aixifan\.com|acfun\.cn)\//;
  function renderCommentHtml(content) {
    var h = esc(content || '');
    // 表情：[emot=acfun,id/] 走映射；其他包走 umeditor 固定图床
    h = h.replace(/\[emot=acfun,(\w+)\/\]/g, function (_, id) {
      var u = EmotionMap.map[id];
      return u ? '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">' : '[表情]';
    });
    h = h.replace(/\[emot=(\w+),(\w+)\/\]/g, function (_, pkg, id) {
      return '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/' + pkg + '/' + id + '.gif" referrerpolicy="no-referrer">';
    });
    // 图片：[img=图片]URL[/img] / [img=alt]URL[/img] / [img]URL[/img]，限 A 站图床白名单
    h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    return h;
  }

  function isOpenComments() {
    return !!(commentDrawer && commentDrawer.el.classList.contains('open'));
  }

  function closeComments() {
    if (commentDrawer) commentDrawer.el.classList.remove('open');
    if (root) root.classList.remove('acsv-with-comments');
  }

  function openComments(meowId) {
    if (!commentDrawer || !meowId) return;
    commentDrawer.el.classList.add('open');
    if (root) root.classList.add('acsv-with-comments');
    if (commentState.meowId !== meowId) {
      loadComments(meowId, 1, false);
    } else if (!commentDrawer.list.children.length) {
      loadComments(meowId, 1, false);
    }
  }

  function loadComments(meowId, page, append) {
    if (!commentDrawer) return;
    commentState.loading = true;
    commentState.meowId = meowId;
    if (!append) {
      commentDrawer.list.innerHTML = '';
      commentDrawer.list.appendChild(el('div', 'acsv-spinner',
        null)).style.cssText = 'position:static;margin:40px auto;display:block';
    }
    var p = window.__ACSV_MOCK__ ? Promise.resolve(mockComments()) :
      request(CFG.api.comment + meowId + '&sourceType=5&page=' + page +
        '&pivotCommentId=0&newPivotCommentId=', 'GET');
    Promise.all([p, ensureEmotionMap()]).then(function (res) {
      var j = res[0];
      commentState.loading = false;
      var list = (j && j.rootComments) || [];
      commentState.page = (j && j.curPage) || page;
      commentState.totalPage = (j && j.totalPage) || 1;
      commentState.pcursor = (j && j.pcursor) || 'no_more';
      commentState.count = (j && j.commentCount != null) ? j.commentCount : list.length;
      renderComments(list, append, j && j.subCommentsMap);
    }, function () {
      commentState.loading = false;
      renderCommentTip('评论加载失败，请重试');
    });
  }

  function normalizeSubs(subMap, cid) {
    if (!subMap) return [];
    var v = subMap[String(cid)] || subMap[cid];
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (v.subComments) return v.subComments;
    return [];
  }

  function commentItem(c, subMap, meowId) {
    var item = el('div', 'acsv-citem');
    // 头像 + 昵称可点击进入用户主页
    var homeUrl = c.userId ? CFG.api.userBase + c.userId : null;
    var avLink = el('a', 'acsv-avlink');
    if (homeUrl) { avLink.href = homeUrl; avLink.target = '_blank'; avLink.title = '访问 ' + (c.userName || '') + ' 的空间'; }
    var av = el('img', 'av');
    av.referrerPolicy = 'no-referrer';
    // headUrl 可能是字符串或 [{cdn,url}] 数组
    var hu = c.headUrl;
    if (Array.isArray(hu)) hu = (hu[0] && hu[0].url) || '';
    else if (hu && typeof hu === 'object') hu = hu.url || '';
    av.src = (typeof hu === 'string' && hu ? hu : CFG.api.defaultAvatar).split('?')[0];
    avLink.appendChild(av);
    var body = el('div', 'acsv-cbody');
    var name = el('div', 'acsv-cname');
    if (homeUrl) {
      var na = el('a', null, esc(c.userName || 'AcFun用户'));
      na.href = homeUrl; na.target = '_blank';
      name.appendChild(na);
    } else {
      name.appendChild(el('span', null, esc(c.userName || 'AcFun用户')));
    }
    if (c.isUp) name.appendChild(el('span', 'up', 'UP'));
    body.appendChild(name);
    body.appendChild(el('div', 'acsv-ctext'));
    body.lastChild.innerHTML = renderCommentHtml(c.content);
    var meta = el('div', 'acsv-cmeta');
    meta.appendChild(el('span', null, esc(c.postDate || '')));
    var like = el('span', 'acsv-clike', ICONS.heart);
    like.appendChild(el('span', null, fmt(c.likeCount)));
    meta.appendChild(like);
    body.appendChild(meta);
    var subs = normalizeSubs(subMap, c.commentId);
    if (subs.length) {
      var box = el('div', 'acsv-csub');
      subs.forEach(function (s) { box.appendChild(commentItem(s, null, meowId)); });
      if (c.subCommentCount > subs.length) {
        var more = el('a', 'acsv-cmore', '其余 ' + (c.subCommentCount - subs.length) + ' 条回复见原页 →');
        more.href = CFG.api.shareBase + meowId;
        more.target = '_blank';
        box.appendChild(more);
      }
      body.appendChild(box);
    } else if ((c.subCommentCount || 0) > 0) {
      var link = el('a', 'acsv-cmore', '查看 ' + c.subCommentCount + ' 条回复（原页） →');
      link.href = CFG.api.shareBase + meowId;
      link.target = '_blank';
      body.appendChild(link);
    }
    item.appendChild(avLink);
    item.appendChild(body);
    return item;
  }

  function renderComments(list, append, subMap) {
    if (!commentDrawer) return;
    if (!append) commentDrawer.list.innerHTML = '';
    commentDrawer.title.textContent = '评论 ' + fmt(commentState.count);
    if (!list.length && !append) {
      var empty = el('div', 'acsv-drawer-tip', '还没有评论，去原页抢沙发 →');
      var a = el('a', 'acsv-cmore');
      a.href = 'https://m.acfun.cn/sv/?mid=' + commentState.meowId;
      a.target = '_blank';
      a.textContent = '前往原页';
      empty.appendChild(document.createElement('br'));
      empty.appendChild(a);
      commentDrawer.list.appendChild(empty);
      return;
    }
    var seen = {};
    list.forEach(function (c) {
      if (seen[c.commentId]) return;
      seen[c.commentId] = 1;
      commentDrawer.list.appendChild(commentItem(c, subMap, commentState.meowId));
    });
    if (commentState.page < commentState.totalPage && commentState.pcursor !== 'no_more') {
      var more = el('button', 'acsv-drawer-more', '加载更多评论');
      more.addEventListener('click', function () {
        more.remove();
        loadComments(commentState.meowId, commentState.page + 1, true);
      });
      commentDrawer.list.appendChild(more);
    }
  }

  function renderCommentTip(text) {
    if (!commentDrawer) return;
    commentDrawer.list.innerHTML = '';
    commentDrawer.list.appendChild(el('div', 'acsv-drawer-tip', text));
  }

  function mockComments() {
    // 本地 harness 用示例数据（真实环境走通用评论接口）
    return {
      commentCount: 2, curPage: 1, totalPage: 1, pcursor: 'no_more',
      rootComments: [
        { commentId: 'm1', userId: 123, userName: '香蕉君', headUrl: '', content: '这条视频太棒了（示例评论，仅本地预览显示）', postDate: '2026-09-01', likeCount: 233, isUp: false, subCommentCount: 1 },
        { commentId: 'm2', userId: 456, userName: 'UP主本人', headUrl: '', content: '感谢收看！', postDate: '2026-09-02', likeCount: 66, isUp: true, subCommentCount: 0 }
      ],
      subCommentsMap: { m1: [{ commentId: 'm1-1', userId: 789, userName: '路人甲', headUrl: '', content: '前排！', postDate: '2026-09-01', likeCount: 3, subCommentCount: 0 }] }
    };
  }

  function buildSlide(item, idx) {
    var slide = el('section', 'acsv-slide');
    slide.dataset.idx = idx;
    slide.dataset.state = 'loading';

    if (item.cover) {
      var amb = el('div', 'acsv-ambient');
      amb.style.backgroundImage = 'url("' + item.cover + '")';
      slide.appendChild(amb);
    }

    var spinner = el('div', 'acsv-spinner');
    var playicon = el('div', 'acsv-playicon', ICONS.play);
    var errbox = el('div', 'acsv-errbox');
    errbox.appendChild(el('p', null, '视频加载失败'));
    var retry = el('button', 'acsv-retry', '重试');
    retry.addEventListener('click', function (ev) {
      ev.stopPropagation();
      item.urlIdx = 0; item.refreshed = false;
      attachVideo(slide, item, idx);
    });
    errbox.appendChild(retry);
    slide.appendChild(spinner);
    slide.appendChild(playicon);
    slide.appendChild(errbox);

    slide.appendChild(buildControls(slide, idx));

    // 右侧操作栏
    var rail = el('div', 'acsv-rail');
    if (item.head) {
      var avWrap = el('div', 'acsv-avwrap');
      var a = el('a');
      a.href = item.userId ? CFG.api.userBase + item.userId : item.shareUrl;
      a.target = '_blank';
      var av = el('img', 'acsv-avatar');
      av.referrerPolicy = 'no-referrer';
      av.src = item.head.split('?')[0];
      av.title = item.userName;
      a.appendChild(av);
      avWrap.appendChild(a);
      if (item.userId) {
        var fb = el('div', 'acsv-followbtn' + (item.isFollowing ? ' on' : ''), item.isFollowing ? '✓' : '+');
        fb.title = item.isFollowing ? '点击取消关注' : '关注 UP 主';
        fb.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (item.followBusy) return;
          var turnOn = !item.isFollowing;
          item.followBusy = true;
          fb.textContent = '…';
          setRealFollow(item, turnOn).then(function (ok) {
            item.followBusy = false;
            if (ok) {
              item.isFollowing = turnOn;
              fb.textContent = turnOn ? '✓' : '+';
              fb.classList.toggle('on', turnOn);
              fb.title = turnOn ? '点击取消关注' : '关注 UP 主';
              toast(turnOn ? '已关注 @' + item.userName : '已取消关注 @' + item.userName);
            } else {
              fb.textContent = item.isFollowing ? '✓' : '+';
              toast('关注失败（未登录？）');
            }
          });
        });
        avWrap.appendChild(fb);
      }
      rail.appendChild(avWrap);
    }
    function railBtn(icon, count, title, onclick) {
      var wrap = el('div');
      wrap.style.marginBottom = '25px';
      var b = el('button', 'acsv-rail-btn');
      b.title = title;
      if (icon && icon.img) {
        var img = el('img', 'acsv-icon-img');
        img.alt = '';
        img.addEventListener('error', function () {
          b.innerHTML = icon.svg || '';
        });
        img.src = icon.img;
        b.appendChild(img);
      } else {
        b.innerHTML = icon;
      }
      b.addEventListener('click', function (ev) { ev.stopPropagation(); onclick(b); });
      var c = el('div', 'acsv-count', count);
      wrap.appendChild(b); wrap.appendChild(c);
      rail.appendChild(wrap);
      return { btn: b, count: c };
    }
    var likeUI = railBtn({ img: SITE_ICONS.heart, svg: ICONS.heart }, fmt(item.like), '点赞', function (b) {
      if (item.likeBusy) return;
      var turnOn = !item.localLike;
      // 乐观更新
      item.localLike = turnOn;
      item.like += turnOn ? 1 : -1;
      likeUI.count.textContent = fmt(item.like);
      b.classList.toggle('on', turnOn);
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      item.likeBusy = true;
      setRealLike(item, turnOn).then(function (ok) {
        item.likeBusy = false;
        if (ok) {
          item.liked = turnOn;
          toast(turnOn ? '已点赞' : '已取消点赞');
        } else {
          // 未登录或失败：回滚
          item.localLike = !turnOn;
          item.like += turnOn ? -1 : 1;
          likeUI.count.textContent = fmt(item.like);
          b.classList.toggle('on', item.localLike);
          toast('点赞失败（未登录？）');
        }
      });
    });
    likeUI.btn.classList.toggle('on', item.liked || item.localLike);
    railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), '展开/收起评论（C）', function () {
      if (isOpenComments() && commentState.meowId === item.id) closeComments();
      else openComments(item.id);
    });
    railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, '分享', '复制分享链接', function () {
      copyText(item.shareUrl).then(function (ok) {
        toast(ok ? '已复制：' + item.shareUrl : '复制失败，请手动复制');
      });
    });
    railBtn(ICONS.ext, '原页', '打开小视频原页', function () {
      window.open(item.shareUrl, '_blank');
    });
    slide.appendChild(rail);

    // 左下角信息（快手式：作者行在上，标题在下）
    var info = el('div', 'acsv-info');
    var meta = el('div', 'acsv-meta');
    var up = item.userId
      ? '<a href="https://www.acfun.cn/u/' + item.userId + '" target="_blank">@' + esc(item.userName) + '</a>'
      : '<span>@' + esc(item.userName) + '</span>';
    meta.innerHTML = up
      + '<span>' + esc(item.date || '') + '</span>'
      + '<span class="acsv-views">' + fmt(item.view) + '次播放</span>';
    info.appendChild(meta);
    info.appendChild(el('p', 'acsv-title', esc(item.title)));
    slide.appendChild(info);

    slide.addEventListener('mousemove', function () { showControls(slide); });
    slide.addEventListener('click', onSlideTap);
    return slide;
  }

  function onSlideTap(ev) {
    var slide = ev.currentTarget;
    var idx = Number(slide.dataset.idx);
    if (idx !== FeedStore.current) return;
    var video = slide.querySelector('video');
    if (!video) return;
    if (!firstGestureSeen && !soundOn) {
      firstGestureSeen = true;
      enableSound(video);
      hideSoundHint();
      return;
    }
    firstGestureSeen = true;
    if (video.paused) playVideo(video); else video.pause();
  }

  function enableSound(video) {
    try { localStorage.setItem(CFG.lsSound, '1'); } catch (e) { }
    soundOn = true;
    if (video) { video.muted = false; video.volume = 1; playVideo(video); }
    refreshMuteIcons();
  }

  function toggleSound(video) {
    if (soundOn) {
      soundOn = false;
      try { localStorage.setItem(CFG.lsSound, ''); } catch (e) { }
      if (video) video.muted = true;
    } else {
      enableSound(video);
    }
    refreshMuteIcons();
  }

  function hideSoundHint() {
    var h = root && root.querySelector('.acsv-hint');
    if (h) h.classList.add('hide');
  }

  function playVideo(video) {
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        var slide = video.closest('.acsv-slide');
        if (slide) slide.dataset.paused = '1';
      });
    }
  }

  function attachVideo(slide, item, idx) {
    slide.dataset.state = 'loading';
    var old = slide.querySelector('video');
    if (old) { old.pause(); old.src = ''; old.remove(); }
    var video = document.createElement('video');
    video.className = 'acsv-video';
    video.muted = !soundOn;
    video.loop = !autoplayNext;
    video.playbackRate = seekHold.active ? 2 : playRate;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.src = item.urls[item.urlIdx];
    video.addEventListener('playing', function () {
      clearTimeout(slide._waitTimer);
      slide.dataset.state = 'ready';
      slide.dataset.paused = '0';
      if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.pause;
      showControls(slide);
    });
    video.addEventListener('pause', function () {
      slide.dataset.paused = '1';
      if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.play;
    });
    video.addEventListener('waiting', function () {
      clearTimeout(slide._waitTimer);
      slide._waitTimer = setTimeout(function () { slide.dataset.state = 'loading'; }, 300);
    });
    video.addEventListener('loadedmetadata', function () {
      if (slide._ctlTime) {
        slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
      }
    });
    video.addEventListener('timeupdate', function () {
      if (!video.duration) return;
      var trackEl = slide.querySelector('.acsv-track');
      var draggingNow = !!trackEl && trackEl.dataset.drag === '1';
      var pct = (video.currentTime / video.duration * 100) + '%';
      if (!draggingNow) {
        if (slide._ctlFill) slide._ctlFill.style.width = pct;
        if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
      }
      if (slide._ctlTime) {
        slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
      }
    });
    video.addEventListener('ended', function () {
      if (autoplayNext && idx === FeedStore.current) scrollToIndex(idx + 1);
    });
    video.addEventListener('error', function () {
      // 直链签名可能过期：先换备用 CDN，再刷新一次详情
      if (item.urlIdx < item.urls.length - 1) {
        item.urlIdx++;
        video.src = item.urls[item.urlIdx];
        video.load();
        return;
      }
      if (!item.refreshed) {
        item.refreshed = true;
        FeedStore.refresh(item).then(function (ok) {
          if (ok && item.urls.length) {
            video.src = item.urls[0];
            video.load();
            if (idx === FeedStore.current) playVideo(video);
          } else {
            slide.dataset.state = 'error';
          }
        });
        return;
      }
      slide.dataset.state = 'error';
    });
    slide.insertBefore(video, slide.querySelector('.acsv-rail'));
    video.load();
    if (idx === FeedStore.current) {
      playVideo(video);
      if (!soundOn && !firstGestureSeen) showSoundHint(slide);
    }
  }

  var soundHintEl = null, soundHintShown = false, soundHintDismissed = false;
  function showSoundHint(slide) {
    hideSoundHint();
    if (soundHintShown || soundHintDismissed || soundOn || firstGestureSeen) return;
    soundHintShown = true;
    soundHintEl = el('div', 'acsv-hint');
    soundHintEl.appendChild(el('span', null, '🔇 当前处于静音'));
    var btn = el('button', 'acsv-hint-btn', '开启声音');
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      firstGestureSeen = true;
      var v = slide.querySelector('video');
      enableSound(v);
      if (v && soundOn) playVideo(v);
      hideSoundHint();
    });
    var x = el('button', 'acsv-hint-x', '✕');
    x.addEventListener('click', function (ev) {
      ev.stopPropagation();
      soundHintDismissed = true;
      hideSoundHint();
    });
    soundHintEl.appendChild(btn);
    soundHintEl.appendChild(x);
    soundHintEl.addEventListener('click', function (ev) { ev.stopPropagation(); });
    slide.appendChild(soundHintEl);
  }

  function renderWindow() {
    if (!scroller) return;
    var cur = FeedStore.current;
    var lo = Math.max(0, cur - 1), hi = cur + 2;
    for (var i = lo; i <= hi && i < FeedStore.items.length; i++) {
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + i + '"]');
      if (!slide) {
        slide = buildSlide(FeedStore.items[i], i);
        scroller.appendChild(slide);
        if (io) io.observe(slide);
      }
      if ((i === cur || i === cur + 1) && !slide.querySelector('video')
        && slide.dataset.state !== 'error') {
        attachVideo(slide, FeedStore.items[i], i);
      }
    }
    // 只保留当前±1的视频元素，回收远处的（回滑时会重新挂载）
    var slides = scroller.querySelectorAll('.acsv-slide');
    Array.prototype.forEach.call(slides, function (s) {
      var idx = Number(s.dataset.idx);
      if (idx < cur - 1 || idx > cur + 1) {
        var v = s.querySelector('video');
        if (v) { v.pause(); v.src = ''; v.remove(); }
        if (idx < cur - 2 || idx > cur + 3) {
          var c = s.querySelector('.acsv-ambient');
          if (c) c.remove();
        }
      }
    });
    // 按索引排序，保证滚动位置正确
    var ordered = Array.prototype.slice.call(slides).sort(function (a, b) {
      return Number(a.dataset.idx) - Number(b.dataset.idx);
    });
    if (scroller.children.length !== ordered.length ||
      Array.prototype.some.call(scroller.children, function (c, k) { return c !== ordered[k]; })) {
      ordered.forEach(function (s) { scroller.appendChild(s); });
    }
    updateArrows();
  }

  function setActive(idx) {
    syncHash(idx);
    FeedStore.current = idx;
    // 每次都补缓冲（空间页列表上下文的泵也在这里启动）
    FeedStore.ensureMore().then(renderWindow);
    updateArrows();
    if (isOpenComments()) {
      var itC = FeedStore.items[idx];
      if (itC && commentState.meowId !== itC.id) openComments(itC.id);
    }
    if (!scroller) return;
    // 暂停非当前视频
    var vs = scroller.querySelectorAll('video');
    Array.prototype.forEach.call(vs, function (v) {
      var s = v.closest('.acsv-slide');
      if (s && Number(s.dataset.idx) !== idx) v.pause();
    });
    var cur = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"] video');
    if (cur) {
      cur.muted = !soundOn;
      playVideo(cur);
      if (!soundOn && !firstGestureSeen) {
        var slide = cur.closest('.acsv-slide');
        if (slide && !slide.querySelector('.acsv-hint')) showSoundHint(slide);
      }
    }
  }

  function scrollToIndex(idx) {
    if (!scroller) return;
    FeedStore.ensureMore().then(function () {
      renderWindow();
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
      if (slide) {
        scroller.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
        setActive(idx);
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { }
      ta.remove();
      resolve(ok);
    });
  }

  // 样式表挂在 head 上，保证悬浮按钮在信息流未打开时也有样式
  function ensureStyle() {
    if (document.getElementById('acsv-style')) return;
    var st = el('style', null, CSS);
    st.id = 'acsv-style';
    (document.head || document.documentElement).appendChild(st);
  }

  function mount() {
    if (root) return;
    ensureStyle();
    firstGestureSeen = false;
    soundHintShown = false;
    try { soundOn = localStorage.getItem(CFG.lsSound) === '1'; } catch (e) { soundOn = false; }

    root = el('div');
    root.id = 'acsv-root';
    root.className = 'acsv-root';

    var top = el('div', 'acsv-top');
    var logo = el('div', 'acsv-logo');
    var logoImg = el('img', 'acsv-logo-img');
    logoImg.src = CFG.api.logoSvg;
    logoImg.alt = 'AcFun';
    logo.appendChild(logoImg);
    logo.appendChild(el('span', null, '小视频'));
    top.appendChild(logo);
    var tr = el('div', 'acsv-top-right');
    var exitBtn = el('button', 'acsv-tbtn', '✕');
    exitBtn.title = '退出（Esc）';
    exitBtn.addEventListener('click', exitFeed);
    tr.appendChild(exitBtn);
    top.appendChild(tr);
    root.appendChild(top);

    scroller = el('div', 'acsv-scroller');
    root.appendChild(scroller);

    var arrows = el('div', 'acsv-arrows');
    var upBtn = el('button', 'acsv-arrow acsv-arrow-up', ICONS.chevUp);
    upBtn.title = '上一个（↑）';
    upBtn.addEventListener('click', function () {
      scrollToIndex(FeedStore.current - 1);
    });
    var downBtn = el('button', 'acsv-arrow acsv-arrow-down', ICONS.chevDn);
    downBtn.title = '下一个（↓）';
    downBtn.addEventListener('click', function () {
      scrollToIndex(FeedStore.current + 1);
    });
    arrows.appendChild(upBtn);
    arrows.appendChild(downBtn);
    root.appendChild(arrows);

    // 评论抽屉骨架
    var drawer = el('aside', 'acsv-drawer');
    var dhead = el('div', 'acsv-drawer-head');
    var dtitle = el('span', null, '评论');
    var dclose = el('button', 'acsv-drawer-close', '✕');
    dclose.title = '收起评论（Esc）';
    dclose.addEventListener('click', closeComments);
    dhead.appendChild(dtitle);
    dhead.appendChild(dclose);
    var dlist = el('div', 'acsv-drawer-list');
    drawer.appendChild(dhead);
    drawer.appendChild(dlist);
    root.appendChild(drawer);
    commentDrawer = { el: drawer, title: dtitle, list: dlist };

    root.appendChild(el('div', 'acsv-toast'));

    scroller.appendChild(el('div', 'acsv-spinner'));
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(root);

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          setActive(Number(en.target.dataset.idx));
        }
      });
    }, { root: scroller, threshold: [0, CFG.io.ratio, 0.9] });

    keyHandler = function (ev) {
      if (!isFeedRoute() || !root) return;
      if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
      var cur = FeedStore.current;
      switch (ev.key) {
        case 'ArrowDown': case 'PageDown': case 'j':
          ev.preventDefault(); scrollToIndex(cur + 1); break;
        case 'ArrowUp': case 'PageUp': case 'k':
          ev.preventDefault(); scrollToIndex(Math.max(0, cur - 1)); break;
        case 'ArrowLeft':
          ev.preventDefault();
          (function () {
            var v = currentVideo();
            if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - CFG.time.seekStep);
          })();
          break;
        case 'ArrowRight': {
          ev.preventDefault();
          if (ev.repeat || seekHold.active || seekHold.timer) break;
          // 短按快进 5 秒；按住 350ms 后进入 2 倍速快进，松手恢复
          seekHold.timer = setTimeout(function () {
            seekHold.timer = null;
            seekHold.active = true;
            seekHold.prevRate = playRate;
            var v = currentVideo();
            if (v) v.playbackRate = 2;
            toast('2× 快进中');
          }, CFG.time.hold);
          break;
        }
        case ' ':
          ev.preventDefault();
          (function () {
            var v = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
            if (!v) return;
            if (!firstGestureSeen && !soundOn) { firstGestureSeen = true; enableSound(v); hideSoundHint(); return; }
            firstGestureSeen = true;
            if (v.paused) playVideo(v); else v.pause();
          })();
          break;
        case 'm': case 'M': {
          var v2 = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
          firstGestureSeen = true;
          toggleSound(v2);
          if (v2 && soundOn) playVideo(v2);
          hideSoundHint();
          break;
        }
        case 'f': case 'F':
          if (document.fullscreenElement) document.exitFullscreen();
          else if (root.requestFullscreen) root.requestFullscreen();
          break;
        case 'Escape':
          if (isOpenComments()) closeComments();
          else exitFeed();
          break;
        case 'c': case 'C': {
          var itC = FeedStore.items[cur];
          if (itC) {
            if (isOpenComments() && commentState.meowId === itC.id) closeComments();
            else openComments(itC.id);
          }
          break;
        }
      }
    };
    keyUpHandler = function (ev) {
      if (ev.key !== 'ArrowRight' || !root) return;
      var v = currentVideo();
      if (seekHold.timer) {
        // 短按：快进 5 秒
        clearTimeout(seekHold.timer);
        seekHold.timer = null;
        if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + CFG.time.seekStep);
      } else if (seekHold.active) {
        // 长按结束：恢复原速
        seekHold.active = false;
        playRate = seekHold.prevRate;
        if (scroller) {
          var vs = scroller.querySelectorAll('video');
          Array.prototype.forEach.call(vs, function (x) { x.playbackRate = playRate; });
        }
        toast('恢复 ' + playRate.toFixed(1) + 'x');
      }
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyUpHandler);

    var route = parseRoute();
    var routeMid = route.mid;
    if (!routeMid) {
      // 普通入口：每次进入清空缓冲，重新拉取最新推荐
      UpVideos.feedActive = false;
      FeedStore.items = [];
      FeedStore.seen = {};
      FeedStore.current = 0;
      FeedStore.loading = false;
      FeedStore.pumpBusy = false;
    }
    (routeMid ? FeedStore.loadFirst(routeMid) : FeedStore.ensureMore()).then(function () {
      if (!FeedStore.items.length) {
        if (scroller) {
          var box = el('div', 'acsv-errbox');
          box.style.display = 'grid';
          box.appendChild(el('p', null, '小视频加载失败，请检查网络后重试'));
          var b = el('button', 'acsv-retry', '重试');
          b.addEventListener('click', function () {
            FeedStore.seen = {}; FeedStore.items = [];
            box.remove();
            var sp = el('div', 'acsv-spinner'); scroller.appendChild(sp);
            FeedStore.ensureMore().then(renderWindow);
          });
          box.appendChild(b);
          scroller.appendChild(box);
        }
        return;
      }
      var sp = scroller.querySelector('.acsv-spinner');
      if (sp) sp.remove();
      renderWindow();
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
      if (slide) scroller.scrollTop = slide.offsetTop;
      setActive(FeedStore.current);
    });
  }

  function unmount() {
    if (!root) return;
    if (io) { io.disconnect(); io = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (keyUpHandler) { window.removeEventListener('keyup', keyUpHandler); keyUpHandler = null; }
    if (seekHold.timer) { clearTimeout(seekHold.timer); seekHold.timer = null; }
    seekHold.active = false;
    var vs = root.querySelectorAll('video');
    Array.prototype.forEach.call(vs, function (v) { v.pause(); v.src = ''; });
    root.remove();
    root = null; scroller = null; commentDrawer = null;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function exitFeed() {
    unmount();
    if (isFeedRoute()) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function toggle() {
    if (isFeedRoute()) mount();
    else unmount();
  }
  window.addEventListener('hashchange', toggle);

  // ---------- 导航入口注入 ----------
  var NAV_LABELS = CFG.nav.labels;

  function tryInjectNav() {
    if (document.querySelector('[data-acsv-nav]')) return true;
    var links = document.querySelectorAll(
      '#pagelet_navigation a, #pagelet_header a, header a, .normal-nav a, .guide-list a, nav a');
    var target = null, label = '';
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || '').trim();
      if (NAV_LABELS.indexOf(t) !== -1) { target = links[i]; label = t; break; }
    }
    if (!target) return false;
    var li = target.closest('li') || target.parentElement;
    if (!li || !li.parentNode) return false;
    var clone = li.cloneNode(true);
    // 替换克隆体里的文字与链接
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim() === label) {
        node.nodeValue = '小视频';
        break;
      }
    }
    var anchors = clone.querySelectorAll('a');
    var a = anchors.length ? anchors[anchors.length - 1] : clone.querySelector('a');
    if (!a) a = clone;
    a.href = '#' + CFG.hash;
    a.removeAttribute('target');
    if (a.classList) a.classList.remove('active');
    a.title = 'AcFun 小视频 · 竖刷模式（油猴脚本）';
    clone.setAttribute('data-acsv-nav', '1');
    clone.querySelectorAll('*').forEach(function (n) { n.removeAttribute('id'); });
    li.parentNode.insertBefore(clone, li.nextSibling);
    return true;
  }

  var navObserver = null, navTries = 0;
  function watchNav() {
    if (tryInjectNav()) return;
    navObserver = new MutationObserver(function () {
      if (tryInjectNav()) {
        navObserver.disconnect();
        navObserver = null;
      }
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
    // 兜底：导航一直没渲染出来（或结构变了），给个悬浮入口
    setTimeout(function () {
      if (navObserver) { navObserver.disconnect(); navObserver = null; }
      if (document.getElementById('acsv-fab') || document.querySelector('[data-acsv-nav]')) return;
      var fab = el('button', 'acsv-fab', '▶ AcFun 小视频');
      fab.id = 'acsv-fab';
      fab.addEventListener('click', function () { location.hash = CFG.hash; });
      document.body.appendChild(fab);
    }, CFG.time.navWait);
  }

  // ---------- UP 主空间页：小视频区块 ----------
  // m 站 upPage 的 pagelet 数据（GM_xhr 抓取，跨域）；翻页游标为时间戳，no_more 表示到底。
  // 自动链式加载全部 → 页码分页浏览；最新=接口顺序，最热=渐进拉取 meow/info 点赞数后重排
  var PAGE_SIZE = 10;
  var UpVideos = {
    uid: 0, pcursor: null, total: 0, busy: false, done: false, failed: false,
    items: [], chainBusy: false, page: 1, sortBy: 'newest',
    counts: {}, countsFetched: 0, hotFetching: false,
    feedActive: false, feedCursor: 0,
    gridEl: null, pagebarEl: null, progressEl: null, sortWrapEl: null, countSpan: null
  };

  function gmGetText(url) {
    return new Promise(function (resolve, reject) {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          timeout: 20000,
          headers: {
            'Referer': 'https://m.acfun.cn/',
            // m 站对桌面 UA 会 302 到 PC 空间页（无小视频数据），必须伪装手机 UA
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
          },
          onload: function (r) { resolve(r.responseText); },
          onerror: function () { reject(new Error('network')); },
          ontimeout: function () { reject(new Error('timeout')); }
        });
      } else {
        reject(new Error('no-gm'));
      }
    });
  }

  function parseUpItems(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    var out = [];
    var lis = box.querySelectorAll('li[meow-id]');
    for (var i = 0; i < lis.length; i++) {
      var img = lis[i].querySelector('img');
      out.push({
        id: lis[i].getAttribute('meow-id'),
        cover: img ? img.src : ''
      });
    }
    return out;
  }

  function loadUpVideos(first) {
    var uid = UpVideos.uid;
    UpVideos.busy = true;
    var url = first
      ? CFG.api.upPage + uid
      : CFG.api.upPage + uid + '?page=' + UpVideos.pcursor
        + '&userId=' + uid + '&type=6&pcursor=' + UpVideos.pcursor
        + '&pagelets=short-video-list&ajaxpipe=1';
    return gmGetText(url).then(function (txt) {
      UpVideos.busy = false;
      var html = txt, pc = 'no_more';
      if (first) {
        var pm = txt.match(/"pcursor":"([^"]+)"/);
        pc = pm ? pm[1] : 'no_more';
      } else {
        try {
          var j = JSON.parse(txt.replace(/\/\*<!-- fetch-stream -->\*\/\s*$/, ''));
          html = (j && j.html) || '';
          var sm = ((j && j.scripts) || []).join('').match(/"pcursor":"([^"]+)"/);
          pc = sm ? sm[1] : 'no_more';
        } catch (e) {
          UpVideos.failed = true;
          return [];
        }
      }
      var tm = html.match(/"totalCount":(\d+)/) || txt.match(/"totalCount":(\d+)/);
      if (tm) UpVideos.total = Number(tm[1]);
      var items = parseUpItems(html);
      if (pc === 'no_more' || !items.length) UpVideos.done = true;
      UpVideos.pcursor = pc;
      return items;
    }, function () {
      UpVideos.busy = false;
      UpVideos.failed = true;
      return [];
    });
  }

  function appendUpCells(items, offset) {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    offset = offset || 0;
    items.forEach(function (it, k) {
      var cell = el('div', 'acsv-space-cell');
      cell.title = '播放小视频';
      var img = el('img');
      img.referrerPolicy = 'no-referrer';
      img.loading = 'lazy';
      img.addEventListener('load', function () { img.classList.add('ld'); });
      img.src = it.cover;
      cell.appendChild(img);
      cell.addEventListener('click', function () {
        // 从列表第 offset+k 个进入：后续按主页列表顺序播放
        UpVideos.feedActive = true;
        UpVideos.feedCursor = offset + k + 1;
        FeedStore.resetForList();
        location.hash = CFG.hash + '/' + it.id;
      });
      grid.appendChild(cell);
    });
  }

  function sortedUpItems() {
    var arr = UpVideos.items.slice();
    if (UpVideos.sortBy === 'hotest') {
      var withCounts = arr.filter(function (it) { return UpVideos.counts[it.id] !== undefined; });
      var without = arr.filter(function (it) { return UpVideos.counts[it.id] === undefined; });
      withCounts.sort(function (a, b) { return (UpVideos.counts[b.id] || 0) - (UpVideos.counts[a.id] || 0); });
      return withCounts.concat(without);
    }
    return arr; // 接口顺序即最新在前
  }

  function renderUpPage() {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    var sorted = sortedUpItems();
    var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (UpVideos.page > pages) UpVideos.page = pages;
    var slice = sorted.slice((UpVideos.page - 1) * PAGE_SIZE, UpVideos.page * PAGE_SIZE);
    grid.innerHTML = '';
    appendUpCells(slice, (UpVideos.page - 1) * PAGE_SIZE);
    renderUpPagebar(pages);
    renderUpProgress();
  }

  function renderUpPagebar(totalPagesLoaded) {
    var bar = UpVideos.pagebarEl;
    if (!bar) return;
    var totalPages = UpVideos.total ? Math.ceil(UpVideos.total / PAGE_SIZE) : totalPagesLoaded;
    var cur = UpVideos.page;
    bar.innerHTML = '';
    function btn(label, target, opts) {
      opts = opts || {};
      var b = el('button', 'acsv-pagebtn' + (opts.cur ? ' cur' : '') + (opts.dots ? ' dots' : ''), label);
      if (opts.disabled) b.disabled = true;
      if (!opts.disabled && !opts.cur && !opts.dots) {
        b.addEventListener('click', function () {
          UpVideos.page = target;
          renderUpPage();
        });
      }
      bar.appendChild(b);
    }
    btn('‹', cur - 1, { disabled: cur <= 1 });
    var shown = {};
    var windowLo = Math.max(1, cur - 2), windowHi = Math.min(totalPages, cur + 2);
    [1, windowLo - 1, windowLo, windowHi + 1, totalPages].forEach(function (p) {
      if (p >= 1 && p <= totalPages) shown[p] = 'jump';
    });
    for (var p = windowLo; p <= windowHi; p++) shown[p] = false;
    var keys = Object.keys(shown).map(Number).sort(function (a, b) { return a - b; });
    var prev = 0;
    keys.forEach(function (p) {
      if (prev && p - prev > 1) btn('…', 0, { dots: true });
      var loaded = p <= totalPagesLoaded;
      btn(String(p), p, { cur: p === cur, disabled: !loaded });
      prev = p;
    });
    btn('›', cur + 1, { disabled: cur >= totalPagesLoaded });
  }

  function renderUpProgress() {
    var elp = UpVideos.progressEl;
    if (!elp) return;
    // 标签页徽标同步总数
    if (UpVideos.countSpan && UpVideos.total) {
      UpVideos.countSpan.textContent = fmt(UpVideos.total);
    }
    var loaded = UpVideos.items.length;
    var base = '已加载 ' + loaded + (UpVideos.total ? ' / ' + UpVideos.total : '');
    if (UpVideos.sortBy === 'hotest' && !UpVideos.done) {
      elp.textContent = base + '（加载中，最热排序将在加载完成后准确）';
    } else if (UpVideos.sortBy === 'hotest') {
      elp.textContent = loaded ? '热度统计 ' + UpVideos.countsFetched + ' / ' + loaded : base;
    } else {
      elp.textContent = UpVideos.done ? '共 ' + loaded + ' 个'
        : (UpVideos.failed && !loaded ? '加载失败（需在 Tampermonkey 下运行）' : base + '（后台加载中）');
    }
  }

  function startUpChain() {
    if (UpVideos.chainBusy) return;
    UpVideos.chainBusy = true;
    (function step() {
      if (!UpVideos.chainBusy || UpVideos.done) {
        UpVideos.chainBusy = false;
        renderUpProgress();
        return;
      }
      loadUpVideos(UpVideos.pcursor === null).then(function (items) {
        if (items.length) {
          UpVideos.items = UpVideos.items.concat(items);
          renderUpPage();
        }
        if (UpVideos.done || !items.length) {
          UpVideos.chainBusy = false;
          renderUpProgress();
          return;
        }
        setTimeout(step, CFG.time.chainGap);
      });
    })();
  }

  function ensureHotCounts() {
    if (UpVideos.hotFetching) return;
    UpVideos.hotFetching = true;
    (function step() {
      if (!UpVideos.hotFetching) return;
      var todo = UpVideos.items.filter(function (it) { return UpVideos.counts[it.id] === undefined; });
      if (!todo.length) {
        UpVideos.hotFetching = false;
        renderUpProgress();
        return;
      }
      var batch = todo.slice(0, 4);
      Promise.all(batch.map(function (it) {
        return request(CFG.api.info + it.id).then(function (j) {
          var mc = (j && j.meowFeed && j.meowFeed.meowCounts) || {};
          UpVideos.counts[it.id] = mc.likeCount || 0;
        }, function () {
          UpVideos.counts[it.id] = 0;
        });
      })).then(function () {
        UpVideos.countsFetched = Object.keys(UpVideos.counts).length;
        if (UpVideos.sortBy === 'hotest') renderUpPage();
        renderUpProgress();
        setTimeout(step, CFG.time.hotGap);
      });
    })();
  }

  function injectSpaceVideos(uid) {
    if (document.getElementById('acsv-space-grid')) return;
    UpVideos.uid = Number(uid);
    UpVideos.pcursor = null;
    UpVideos.done = false;
    UpVideos.failed = false;
    UpVideos.total = 0;
    UpVideos.items = [];
    UpVideos.page = 1;
    UpVideos.sortBy = 'newest';
    UpVideos.counts = {};
    UpVideos.countsFetched = 0;
    ensureStyle();

    var grid = el('div', 'acsv-space-grid');
    grid.id = 'acsv-space-grid';
    var pagebar = el('div', 'acsv-pagebar');
    var progress = el('span', 'acsv-progress-txt', '加载中…');

    // 最新/最热排序（样式仿站点排序下拉）
    var sort = el('div', 'acsv-sort');
    sort.appendChild(el('span', 'acsv-sort-cur', '最新'));
    sort.appendChild(el('i', 'arrow', '▾'));
    var menu = el('ul', 'acsv-sort-menu');
    [['newest', '最新'], ['hotest', '最热']].forEach(function (p) {
      var li = el('li', p[0] === 'newest' ? 'on' : '', p[1]);
      li.dataset.sort = p[0];
      li.addEventListener('click', function (ev) {
        ev.stopPropagation();
        UpVideos.sortBy = p[0];
        sort.querySelector('.acsv-sort-cur').textContent = p[1];
        [...menu.children].forEach(function (m) { m.classList.toggle('on', m.dataset.sort === p[0]); });
        sort.classList.remove('open');
        UpVideos.page = 1;
        renderUpPage();
        if (p[0] === 'hotest') ensureHotCounts();
      });
      menu.appendChild(li);
    });
    sort.appendChild(menu);
    sort.addEventListener('click', function (ev) {
      ev.stopPropagation();
      sort.classList.toggle('open');
    });
    document.addEventListener('click', function () { sort.classList.remove('open'); }, { once: false });

    var toolbar = el('div', 'acsv-toolbar');
    toolbar.appendChild(progress);
    toolbar.appendChild(sort);

    UpVideos.gridEl = grid;
    UpVideos.pagebarEl = pagebar;
    UpVideos.progressEl = progress;

    // 优先嵌入空间页的内容标签栏（视频/文章/合辑之后加一个「小视频」）
    var cl = document.querySelector('.ac-space-contribute-list');
    var tagsUl = cl && cl.querySelector('ul.tags');
    if (cl && tagsUl) {
      var albumLi = tagsUl.querySelector('li[data-index="album"]');
      // 站点原生排序（只对视频/文章/合辑生效）：小视频激活时隐藏，切走时恢复
      var siteSortSpan = tagsUl.querySelector('#ac-space-contribute-sort');
      var siteSortLi = siteSortSpan ? siteSortSpan.closest('li') : null;
      var li = el('li', null, '小视频<span>0</span>');
      li.dataset.index = 'svideo';
      li.title = '该 UP 主的小视频';
      var panel = el('div', 'tag-content');
      panel.appendChild(toolbar);
      panel.appendChild(grid);
      panel.appendChild(pagebar);
      li.addEventListener('click', function (ev) {
        // 手动切换，阻断站点委托（未知 data-index 可能引发站点代码异常）
        ev.stopPropagation();
        if (siteSortLi) siteSortLi.style.display = 'none';
        var lis = tagsUl.children;
        for (var i = 0; i < lis.length; i++) lis[i].classList.remove('active');
        li.classList.add('active');
        var panels = cl.querySelectorAll(':scope > .tag-content');
        for (var k = 0; k < panels.length; k++) panels[k].classList.remove('active');
        panel.classList.add('active');
      });
      // 点其他标签时恢复站点排序显示
      tagsUl.addEventListener('click', function (ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest('li[data-index]') : null;
        if (t && t.dataset.index !== 'svideo' && siteSortLi) siteSortLi.style.display = '';
      });
      if (albumLi) albumLi.insertAdjacentElement('afterend', li);
      else tagsUl.appendChild(li);
      cl.appendChild(panel);
      UpVideos.countSpan = li.querySelector('span');
      startUpChain();
      return;
    }

    // 兜底：标签栏不存在时退化为底部独立区块
    var space = document.getElementById('ac-space');
    var wp = space && (space.querySelector('.wp') || space);
    if (!wp) return;
    var sec = el('section', 'acsv-space');
    sec.id = 'acsv-space';
    var head = el('div', 'acsv-space-head');
    head.appendChild(el('h2', null, '小视频'));
    head.appendChild(el('span', 'n', ''));
    sec.appendChild(head);
    sec.appendChild(toolbar);
    sec.appendChild(grid);
    sec.appendChild(pagebar);
    wp.appendChild(sec);
    UpVideos.countSpan = head.querySelector('.n');
    startUpChain();
  }

  function tryInjectSpace() {
    var mU = location.pathname.match(/^\/u\/(\d+)/);
    if (!mU) return;
    var tries = 0;
    var attempt = function () {
      if (document.getElementById('acsv-space')) return;
      if (document.getElementById('ac-space')) {
        injectSpaceVideos(mU[1]);
        return;
      }
      if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
    };
    attempt();
  }

  // ---------- 启动 ----------
  ensureStyle();
  toggle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchNav);
  } else {
    watchNav();
  }
  tryInjectSpace();
})();
