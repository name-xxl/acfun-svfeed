// ==UserScript==
// @name         AcFun 小视频 - PC 站抖音式竖滑页
// @namespace    https://github.com/name-xxl/acfun-svfeed
// @version      0.9.1-debug
// @description  在 www.acfun.cn 顶部导航加入「小视频」入口，打开全屏抖音式竖滑信息流；支持小视频(meow)与 APP 首页推荐(selection/feed)双内容源、弹幕、清晰度切换【调试构建：window.__dbg 记录启动埋点】
// @author       name-xxl
// @homepageURL  https://github.com/name-xxl/acfun-svfeed
// @supportURL   https://github.com/name-xxl/acfun-svfeed/issues
// @updateURL    https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed.debug.user.js
// @downloadURL  https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed.debug.user.js
// @match        https://www.acfun.cn/*
// @grant        GM_xmlhttpRequest
// @connect      m.acfun.cn
// @connect      www.acfun.cn
// @connect      api-new.app.acfun.cn
// @connect      upload.kuaishouzt.com
// @connect      cdn.jsdelivr.net
// @run-at       document-end
// @noframes
// @license      MIT
// ==/UserScript==
(function () {
'use strict';
(() => {
  // src/dbg.js
  function dbgInit() {
    if (false) return;
    window.__dbg = ["iife-start"];
    window.addEventListener("error", function(e) {
      window.__dbg.push("ERR: " + (e.message || "unknown") + " @" + (e.lineno || "?"));
    }, true);
  }
  function dbg(label) {
    if (false) return;
    (window.__dbg = window.__dbg || []).push(label);
  }

  // src/cfg.js
  var CFG = {
    hash: "svfeed",
    lsSound: "acsv-sound-on",
    lsSource: "acsv-source",
    // 内容源记忆：sv=小视频 home=首页推荐
    lsDm: "acsv-dm-on",
    // 弹幕开关记忆
    lsQuality: "acsv-quality",
    // 清晰度记忆（推荐模式，存 qualityLabel）
    accent: "#fd4c5d",
    home: {
      appVer: "6.31.1.1026",
      ua: "acvideo core/6.31.1.1026(OPPO;OPPO A83;7.1.1)",
      mkey: "AAHewK3eIAAyMTkwNTExNzYAAhAAMEP1uwSZbohCYAAAAJlXIdNAMQR5fM2F-KEOYN5wnGQA6_eLEvGiajzUp4_YnU8EjTm7gzNYhBv59oCCDhbdkmIwsXnF9PgS5ly8eQyjuXlcS7VpWG0QlK0HakVDamteMHNHIui0A8V4tmELqQ%3D%3D"
    },
    api: {
      feed: "https://m.acfun.cn/rest/mobile-direct/meow/feedList?count=20&firstPage=false",
      info: "https://m.acfun.cn/rest/mobile-direct/meow/info?meowId=",
      comment: "https://www.acfun.cn/rest/pc-direct/comment/list?sourceId=",
      commentSub: "https://www.acfun.cn/rest/pc-direct/comment/sublist",
      commentAdd: "https://www.acfun.cn/rest/pc-direct/comment/add",
      commentLikePc: "https://www.acfun.cn/rest/pc-direct/comment/",
      token: "https://id.app.acfun.cn/rest/web/token/get",
      interact: "https://api.kuaishouzt.com/rest/zt/interact/",
      follow: "https://www.acfun.cn/rest/pc-direct/relation/follow",
      emotion: "https://m.acfun.cn/rest/mobile-direct/emotion/getUserEmotion",
      upPage: "https://m.acfun.cn/upPage/",
      shareBase: "https://m.acfun.cn/sv/?mid=",
      userBase: "https://www.acfun.cn/u/",
      videoBase: "https://www.acfun.cn/v/ac",
      defaultAvatar: "https://imgs.aixifan.com/style/image/defaultAvatar.jpg",
      logoSvg: "https://ali-imgs.acfun.cn/kos/nlav10360/static/common/widget/header/img/acfunlogo.11a9841251f31e1a3316.svg",
      // ---- APP 家族接口（api-new.app.acfun.cn，免登录读 + 域 Cookie 写） ----
      appBase: "https://api-new.app.acfun.cn/rest/app",
      homeFeed: "https://api-new.app.acfun.cn/rest/app/selection/feed",
      dougaInfo: "https://api-new.app.acfun.cn/rest/app/douga/info",
      playInfo: "https://api-new.app.acfun.cn/rest/app/play/playInfo/cast",
      favorite: "https://api-new.app.acfun.cn/rest/app/favorite",
      unFavorite: "https://api-new.app.acfun.cn/rest/app/unFavorite",
      banana: "https://api-new.app.acfun.cn/rest/app/banana/throwBanana",
      commentLike: "https://api-new.app.acfun.cn/rest/app/comment/",
      // ---- 弹幕（www.acfun.cn 同域，网页 Cookie 鉴权） ----
      dmList: "https://www.acfun.cn/rest/pc-direct/new-danmaku/list",
      dmAdd: "https://www.acfun.cn/rest/pc-direct/new-danmaku/add",
      hlsCdn: "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js"
    },
    feed: { count: 20, bufferSize: 4 },
    homeFeedCfg: { count: 10 },
    page: { size: 10 },
    danmaku: {
      maxPages: 8,
      // 全量列表最多翻页数（每页 200 条）
      pageSize: 200,
      scrollSec: 8,
      // 滚动弹幕穿过全屏时长（速度基准）
      staySec: 4
      // 顶部/底部弹幕停留时长
    },
    stall: {
      iv: 2e3,
      // 看门狗轮询间隔（ms）
      adv: 1,
      // 冻结判定：窗口内时间轴推进阈值（秒）
      fixGap: 4e3,
      // 两次自动恢复的最小间隔（ms）
      cap: 6,
      // home 模式单个条目累计自动恢复上限（降档会重置计数）
      svCap: 4,
      // sv 直链无档可降，跨重挂累计上限更低
      nudge: 0.1
      // 无感顶针步长（秒）：前跳触发解码器重出帧
    },
    time: {
      ctlIdle: 2500,
      // 控制栏闲置隐藏
      hold: 350,
      // 长按右键进入 2x 的阈值
      toast: 1800,
      // toast 停留
      xhr: 15e3,
      // XHR 超时
      gm: 2e4,
      // GM 请求超时
      chainGap: 30,
      // 空间页链式加载间隔
      hotGap: 120,
      // 最热统计批次间隔
      seekStep: 5,
      // 左右键快进/快退秒数
      navWait: 6e3
      // 导航注入兜底等待
    },
    nav: { labels: ["首页", "番剧", "直播", "文章区", "鱼塘"], tries: 20, retryMs: 500 },
    io: { ratio: 0.6 },
    fmt: { wanMin: 9999 }
  };
  dbg("cfg-ok");

  // src/styles.js
  var CSS = '#acsv-root{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;user-select:none}.acsv-root *{box-sizing:border-box;margin:0;padding:0}.acsv-top{position:absolute;top:0;left:0;right:0;height:56px;display:flex;align-items:center;padding:0 24px;background:linear-gradient(rgba(0,0,0,.6),transparent);z-index:30;pointer-events:none}.acsv-top *{pointer-events:auto}.acsv-logo{display:flex;align-items:center;gap:8px;min-width:0}.acsv-logo-img{height:26px;width:auto;display:block}.acsv-logo em{color:#fff;font-style:normal;font-weight:400;font-size:13px;margin-left:8px;opacity:.9}.acsv-top-right{margin-left:auto;display:flex;gap:10px}.acsv-tbtn{width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:grid;place-items:center;font-size:16px;transition:transform .15s,background .15s}.acsv-tbtn:hover{transform:scale(1.08);background:rgba(255,255,255,.25)}.acsv-scroller{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}.acsv-scroller::-webkit-scrollbar{display:none}.acsv-slide{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}.acsv-video{display:block;width:100%;height:100%;object-fit:contain;cursor:pointer;z-index:5}.acsv-ambient{position:absolute;inset:-60px;z-index:0;background-size:cover;background-position:center;filter:blur(60px) brightness(.35) saturate(1.2);transform:scale(1.15)}.acsv-side{position:absolute;right:36px;bottom:96px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:14px}.acsv-rail{width:56px;display:flex;flex-direction:column;align-items:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}.acsv-avatar{width:48px;height:48px;border-radius:50%;border:2px solid #fff;object-fit:cover;display:block;transition:transform .15s}.acsv-avwrap{position:relative;margin-bottom:18px}.acsv-followbtn{position:absolute;right:-2px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#fd4c5d;color:#fff;border:2px solid #111;font-size:13px;line-height:17px;text-align:center;cursor:pointer;font-weight:700;user-select:none;transition:transform .15s,background .15s;z-index:2}.acsv-followbtn:hover{transform:scale(1.15)}.acsv-followbtn.on{background:#555}.acsv-avatar:hover{transform:scale(1.08)}.acsv-rail-btn{width:56px;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;margin-bottom:18px}.acsv-rail-btn svg{width:40px;height:40px;fill:#fff;filter:drop-shadow(0 1px 4px rgba(0,0,0,.55));transition:transform .15s}.acsv-rail-btn:hover svg{transform:scale(1.12)}.acsv-rail-btn.on svg{fill:#fd4c5d}.acsv-rail-btn.bump svg{animation:acsv-bump .4s ease}@keyframes acsv-bump{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1)}}.acsv-count{font-size:13px;font-weight:500;line-height:16px;margin-top:4px;margin-bottom:0;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}.acsv-info{position:absolute;left:24px;bottom:40px;z-index:15;max-width:min(56%,560px);color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7);transition:bottom .25s ease}.acsv-slide[data-ctl="1"] .acsv-info,.acsv-slide[data-paused="1"] .acsv-info{bottom:96px}.acsv-meta{font-size:15px;font-weight:600;line-height:21px;margin-bottom:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}.acsv-meta .acsv-views{font-size:13px;font-weight:400;opacity:.85}.acsv-meta a{color:#fff;text-decoration:none}.acsv-meta a:hover{text-decoration:underline}.acsv-title{font-size:16px;font-weight:400;line-height:22px;max-height:66px;overflow:hidden;cursor:default}.acsv-arrows{display:flex;flex-direction:column;gap:10px}.acsv-arrow{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.12);cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(4px);transition:background .15s,transform .15s}.acsv-arrow svg{width:22px;height:22px;fill:#fff}.acsv-arrow:hover{background:rgba(255,255,255,.25);transform:scale(1.06)}.acsv-arrow:disabled{opacity:.3;cursor:default;transform:none}.acsv-controls{position:absolute;left:0;right:0;bottom:0;z-index:25;padding:26px 14px 8px;background:linear-gradient(transparent,rgba(0,0,0,.72));opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s,right .28s ease}.acsv-slide[data-ctl="1"] .acsv-controls,.acsv-slide[data-paused="1"] .acsv-controls{opacity:1;visibility:visible}.acsv-track{position:relative;height:4px;margin:0 4px 6px;border-radius:2px;background:rgba(255,255,255,.32);cursor:pointer;transition:height .15s}.acsv-track:hover,.acsv-track[data-drag="1"]{height:6px}.acsv-track-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#fd4c5d;border-radius:2px}.acsv-track-handle{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.5)}.acsv-track:hover .acsv-track-handle,.acsv-track[data-drag="1"] .acsv-track-handle{transform:translate(-50%,-50%) scale(1)}.acsv-bubble{position:absolute;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.82);padding:3px 8px;border-radius:6px;font-size:12px;display:none;white-space:nowrap}.acsv-bubble.show{display:block}.acsv-ctl-row{display:flex;align-items:center;gap:6px}.acsv-cbtn{border:none;background:none;color:#fff;cursor:pointer;height:32px;min-width:32px;padding:0 6px;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-family:inherit;transition:background .15s;white-space:nowrap;flex:none}.acsv-cbtn:hover{background:rgba(255,255,255,.16)}.acsv-cbtn svg{width:20px;height:20px;fill:#fff}.acsv-cbtn.on{color:#fd4c5d}.acsv-cbtn.on svg{fill:#fd4c5d}.acsv-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}.acsv-cbtn.on .acsv-dot{background:#fd4c5d}.acsv-time{font-size:12px;color:#ddd;font-variant-numeric:tabular-nums;margin-left:4px;white-space:nowrap;flex:none}.acsv-icon-img{width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 1px 4px rgba(0,0,0,.55));transition:transform .15s}.acsv-rail-btn:hover .acsv-icon-img{transform:scale(1.12)}.acsv-rail-btn.on .acsv-icon-img{filter:invert(52%) sepia(52%) saturate(1800%) hue-rotate(310deg) brightness(1.05)}.acsv-rail-btn.bump .acsv-icon-img{animation:acsv-bump .4s ease}.acsv-rail-btn.thrown{cursor:default}.acsv-drawer{position:absolute;top:0;right:0;bottom:0;width:min(380px,88vw);z-index:45;display:flex;flex-direction:column;background:rgba(22,22,27,.96);backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.09);transform:translateX(100%);transition:transform .28s ease}.acsv-drawer.open{transform:translateX(0)}.acsv-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:15px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.09);flex:none}.acsv-drawer-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1}.acsv-drawer-close:hover{background:rgba(255,255,255,.22)}.acsv-drawer-list{flex:1;overflow-y:auto;padding:6px 0 14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-drawer-list::-webkit-scrollbar{width:5px}.acsv-drawer-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}.acsv-cinput{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.09);background:rgba(22,22,27,.98)}.acsv-creply{display:none;align-items:center;border:none;background:rgba(253,76,93,.16);color:#fd4c5d;font-size:12px;padding:5px 9px;border-radius:999px;cursor:pointer;font-family:inherit;flex:none;white-space:nowrap}.acsv-cinput-emot{border:none;background:none;font-size:18px;cursor:pointer;flex:none;padding:2px;line-height:1}.acsv-cinput-emot:hover{transform:scale(1.12)}.acsv-cinput-text{flex:1;min-width:0;height:36px;border:none;background:rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:13px;padding:9px 12px;outline:none;font-family:inherit;resize:none}.acsv-cinput-text:focus{background:rgba(255,255,255,.16)}.acsv-cinput-send{flex:none;border:none;background:#fd4c5d;color:#fff;font-size:13px;padding:8px 16px;border-radius:999px;cursor:pointer;font-family:inherit}.acsv-cinput-send:hover{background:#ff6b7a}.acsv-emotpanel{position:absolute;left:0;right:0;bottom:57px;z-index:6;display:none;flex-direction:column;max-height:300px;padding:10px 10px 6px;background:rgba(22,22,27,.98);border-top:1px solid rgba(255,255,255,.1)}.acsv-emot-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-emot-head{font-size:12px;color:#7a7f8a;padding:4px 2px 6px}.acsv-emot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:2px}.acsv-emot-item{border:none;background:none;padding:2px;cursor:pointer;line-height:0;border-radius:6px}.acsv-emot-item:hover{background:rgba(255,255,255,.08)}.acsv-emot-item img{width:100%;height:44px;object-fit:contain;pointer-events:none}.acsv-emot-foot{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;background:rgba(255,255,255,.05);border-radius:8px}.acsv-emot-strip{display:flex;align-items:center;gap:8px;overflow-x:auto;flex:1;min-width:0;padding:2px;scrollbar-width:none}.acsv-emot-strip::-webkit-scrollbar{display:none}.acsv-emot-thumb{flex:none;width:32px;height:32px;padding:0;border:2px solid transparent;border-radius:8px;background:none;cursor:pointer;line-height:0}.acsv-emot-thumb img{width:100%;height:100%;object-fit:contain;pointer-events:none}.acsv-emot-thumb.on{border-color:#fd4c5d}.acsv-emot-page{flex:none;width:24px;height:24px;border:none;border-radius:50%;background:none;color:#999;cursor:pointer;font-size:14px;line-height:1}.acsv-emot-page:hover{background:rgba(255,255,255,.1);color:#fff}.acsv-cinput-emot svg{width:20px;height:20px;fill:#999;transition:fill .15s}.acsv-cinput-emot:hover svg{fill:#fd4c5d}.acsv-cinput-img{border:none;background:none;padding:2px;cursor:pointer;line-height:0}.acsv-cinput-img svg{width:20px;height:20px;fill:#999;transition:fill .15s}.acsv-cinput-img:hover svg{fill:#fd4c5d}.acsv-creplybtn{cursor:pointer;color:#7a7f8a;font-size:12px}.acsv-creplybtn:hover{color:#9fd0ff}.acsv-citem{padding:10px 14px;display:flex;gap:10px;border-radius:10px;transition:background .15s}.acsv-citem:hover{background:rgba(255,255,255,.045)}.acsv-avlink{flex:none;display:block}.acsv-citem img.av{width:36px;height:36px;border-radius:50%;object-fit:cover;transition:transform .15s}.acsv-avlink:hover img.av{transform:scale(1.08)}.acsv-cbody{flex:1;min-width:0}.acsv-cname{font-size:13px;color:#9aa0ab;margin-bottom:4px;display:flex;align-items:center;gap:6px}.acsv-cname a{color:#9aa0ab;text-decoration:none}.acsv-cname a:hover{color:#e8eaed;text-decoration:underline}.acsv-cname .up{background:#fd4c5d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600}.acsv-ctext{font-size:14px;line-height:1.6;word-break:break-word;white-space:pre-wrap;color:#f0f1f3}.acsv-cmeta{font-size:12px;color:#7a7f8a;margin-top:6px;display:flex;gap:12px;align-items:center}.acsv-clike{display:inline-flex;align-items:center;gap:3px}.acsv-clike svg{width:12px;height:12px;fill:#7a7f8a}.acsv-csub{margin:8px 0 2px;padding:4px 12px;background:rgba(255,255,255,.05);border-radius:10px}.acsv-csub .acsv-citem{padding:8px 0}.acsv-csub .acsv-citem:hover{background:none}.acsv-csub .acsv-citem img.av{width:26px;height:26px}.acsv-cmore{font-size:12px;color:#9fd0ff;text-decoration:none;display:inline-block;background:none;border:none;cursor:pointer;padding:0;font-family:inherit}.acsv-cmore:hover{text-decoration:underline}.acsv-hot-head{padding:10px 14px 4px;font-size:12px;color:#fd4c5d;font-weight:700;display:flex;align-items:center;gap:5px}.acsv-hot-divider{padding:12px 14px 4px;font-size:12px;color:#7a7f8a}.acsv-drawer-more{display:block;margin:12px auto;padding:8px 24px;border:1px solid rgba(255,255,255,.22);background:none;color:#ddd;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}.acsv-drawer-more:hover{background:rgba(255,255,255,.1)}.acsv-drawer-tip{padding:46px 0;text-align:center;color:#888;font-size:13px}.acsv-hint{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 16px;background:rgba(0,0,0,.72);border-radius:999px;font-size:13px;white-space:nowrap;animation:acsv-fadein .3s ease}.acsv-hint.hide{display:none}.acsv-hint-btn{border:none;background:#fd4c5d;color:#fff;font-size:12px;font-family:inherit;padding:6px 14px;border-radius:999px;cursor:pointer}.acsv-hint-btn:hover{background:#ff6b7a}.acsv-hint-x{border:none;background:none;color:#aaa;font-size:14px;cursor:pointer;padding:4px 8px;line-height:1}.acsv-hint-x:hover{color:#fff}@keyframes acsv-fadein{from{opacity:0}to{opacity:1}}.acsv-spinner{position:absolute;top:50%;left:50%;margin:-16px 0 0 -16px;width:32px;height:32px;z-index:8;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite;pointer-events:none}@keyframes acsv-spin{to{transform:rotate(360deg)}}.acsv-slide[data-state="loading"] .acsv-spinner{display:block}.acsv-spinner{display:none}.acsv-playicon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9;width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.5);display:none;place-items:center;pointer-events:none}.acsv-playicon svg{width:34px;height:34px;fill:#fff;margin-left:4px}.acsv-slide[data-paused="1"] .acsv-playicon{display:grid}.acsv-errbox{position:absolute;inset:0;display:none;place-items:center;z-index:12;flex-direction:column;gap:12px;color:#bbb}.acsv-slide[data-state="error"] .acsv-errbox{display:grid}.acsv-retry{padding:8px 22px;border:none;border-radius:999px;background:#fd4c5d;color:#fff;cursor:pointer;font-size:13px}.acsv-toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2147483600;background:rgba(0,0,0,.78);color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .25s;pointer-events:none}.acsv-toast.show{opacity:1}.acsv-fab{position:fixed;right:18px;bottom:18px;z-index:2147482990;background:#fd4c5d;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:13px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}.acsv-space{margin:18px auto 40px;max-width:1160px;font-family:inherit}.acsv-space-head{display:flex;align-items:baseline;gap:8px;padding:0 4px 10px;border-bottom:2px solid #fd4c5d;margin-bottom:14px}.acsv-space-head h2{font-size:18px;color:#333;margin:0;font-weight:700}.acsv-space-head .n{color:#999;font-size:13px}.acsv-space-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}@media (max-width:1000px){.acsv-space-grid{grid-template-columns:repeat(3,1fr)}}@media (max-width:640px){.acsv-space-grid{grid-template-columns:repeat(2,1fr)}}.acsv-space-cell{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;background:#000;display:block}.acsv-space-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s,opacity .2s;opacity:0}.acsv-space-cell img.ld{opacity:1}.acsv-space-cell:hover img{transform:scale(1.06)}.acsv-space-more{display:block;margin:16px auto;padding:8px 28px;border:1px solid #ddd;background:#fff;color:#666;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}.acsv-space-more:hover{color:#fd4c5d;border-color:#fd4c5d}.acsv-space-tip{padding:30px 0;text-align:center;color:#999;font-size:13px}.acsv-scroller,.acsv-side,.acsv-controls,.acsv-info{transition:transform .28s ease,right .28s ease,bottom .25s ease,opacity .25s,visibility .25s}#acsv-root.acsv-with-comments .acsv-scroller{transform:translateX(calc(min(380px, 88vw) / -2)) scale(var(--acsv-cscale, 1))}.ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.ubb-imgc{display:block;max-width:min(240px,100%);max-height:220px;border-radius:8px;margin-top:6px;cursor:zoom-in}.acsv-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:0 0 10px;position:relative}.acsv-progress-txt{font-size:12px;color:#999;margin-right:auto}.acsv-sort{position:relative;cursor:pointer;font-size:13px;color:#666;user-select:none;padding:4px 10px;border:1px solid #e5e5e5;border-radius:4px;background:#fff}.acsv-sort:hover{border-color:#fd4c5d;color:#fd4c5d}.acsv-sort .arrow{font-size:10px;margin-left:4px}.acsv-sort-menu{display:none;position:absolute;right:0;top:110%;z-index:30;min-width:100%;background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.12);overflow:hidden}.acsv-sort.open .acsv-sort-menu{display:block}.acsv-sort-menu li{list-style:none;padding:8px 18px;white-space:nowrap}.acsv-sort-menu li:hover{background:#fdf0f1;color:#fd4c5d}.acsv-sort-menu li.on{color:#fd4c5d;font-weight:700}.acsv-pagebar{display:flex;justify-content:center;align-items:center;gap:6px;margin:18px 0 6px;flex-wrap:wrap}.acsv-pagebtn{min-width:32px;height:32px;padding:0 8px;border:1px solid #e0e0e0;background:#fff;color:#555;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s}.acsv-pagebtn:hover:not(:disabled):not(.cur){border-color:#fd4c5d;color:#fd4c5d}.acsv-pagebtn.cur{background:#fd4c5d;border-color:#fd4c5d;color:#fff;cursor:default}.acsv-pagebtn:disabled{color:#ccc;cursor:default;background:#f7f7f7}.acsv-pagebtn.dots{border:none;background:none;cursor:default}.acsv-dmcanvas{position:absolute;z-index:8;pointer-events:none}.acsv-seg{display:flex;align-items:center;background:rgba(255,255,255,.14);border-radius:999px;padding:3px;gap:2px}.acsv-seg-btn{border:none;background:none;color:#fff;opacity:.7;font-size:13px;font-family:inherit;padding:6px 16px;border-radius:999px;cursor:pointer;transition:background .15s,opacity .15s;white-space:nowrap}.acsv-seg-btn:hover{opacity:.9}.acsv-seg-btn.on{background:rgba(255,255,255,.24);opacity:1;font-weight:600}.acsv-cbtxt{font-size:12px;color:#ddd;margin-left:2px}.acsv-qwrap{position:relative;display:flex}.acsv-qmenu{position:absolute;right:0;bottom:calc(100% + 12px);z-index:35;min-width:88px;background:rgba(18,18,22,.92);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 28px rgba(0,0,0,.45)}.acsv-qitem{border:none;background:none;color:#ccc;font-size:13px;font-family:inherit;padding:7px 16px;border-radius:8px;cursor:pointer;text-align:center;white-space:nowrap}.acsv-qitem:hover{background:rgba(255,255,255,.12);color:#fff}.acsv-qitem.on{color:#fd4c5d;font-weight:700}.acsv-dmbox{display:flex;align-items:center;flex:1 1 auto;min-width:0;max-width:min(340px,38vw);height:32px;padding:0 4px 0 14px;overflow:hidden;background:rgba(255,255,255,.14);border-radius:999px;transition:background .15s}.acsv-dmbox:focus-within{background:rgba(255,255,255,.2)}.acsv-dm-input{flex:1;min-width:0;border:none;background:none;outline:none;color:#fff;font-size:13px;font-family:inherit}.acsv-dm-input::placeholder{color:rgba(255,255,255,.4)}.acsv-dm-send{flex:none;border:none;background:rgba(255,255,255,.22);color:#fff;font-size:12px;padding:5px 14px;border-radius:999px;cursor:pointer;font-family:inherit}.acsv-dm-send:hover{background:#fd4c5d}.acsv-clike{cursor:pointer}.acsv-clike:hover svg{fill:#b9bec7}.acsv-clike.on svg{fill:#fd4c5d}.acsv-cdm:not(.on){opacity:.55}.acsv-banpop{position:absolute;right:62px;top:-4px;z-index:30;display:flex;align-items:center;gap:2px;padding:7px 10px;background:rgba(22,22,27,.96);border:1px solid rgba(255,255,255,.12);border-radius:999px;}.acsv-banpop button{border:none;background:none;padding:2px;cursor:pointer;line-height:0;opacity:.9;transition:transform .12s}.acsv-banpop button:hover{opacity:1;transform:scale(1.18)}.acsv-banpop button img{width:26px;height:26px;display:block}';
  var ICONS = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    volOn: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    volOff: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.4 1.4L12 10.8l4.6 4.6L18 14z"/></svg>',
    chevDn: '<svg viewBox="0 0 24 24"><path d="M12 16l-6-6 1.4-1.4L12 13.2l4.6-4.6L18 10z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    banana: '<svg viewBox="0 0 24 24"><path d="M21 18.2c-6.9 0-12.6-5-13.7-11.6C7.1 5.2 6 4.2 4.8 4.5 3.7 4.7 3 5.8 3.2 7 4.6 15.4 12 21.5 20.6 21c1.1-.1 1.9-1 1.9-2.1 0-.4-.6-.7-1.5-.7z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
    smiley: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>'
  };
  var SITE_ICONS = {
    heart: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_zan@2x.3e69f4646decbd73fd17.png",
    comment: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_comment@2x.9d8f81ede8984dd9aa34.png",
    share: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_share@2x.f63773e510e6d3259acb.png"
  };
  var VIDEO_ICONS = {
    like: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/like/keyFrames/frame1.3039ed46b4f6639fa576.svg",
    likeOn: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/like/keyFrames/frame12.fd90720499ace4b7850b.svg",
    favorite: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_follow.67c57d40c135d9f5036d.svg",
    favoriteOn: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_follow_hover.c96c3455cd5ebe98a14d.svg",
    banana: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana.d21040881e9721eb1fc8.svg",
    bananaOn: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana_hover.31b7f8940e072833fa9c.svg"
  };

  // src/state.js
  var root = null;
  var scroller = null;
  var commentDrawer = null;
  function setRoot(v) {
    root = v;
  }
  function setScroller(v) {
    scroller = v;
  }
  function setCommentDrawer(v) {
    commentDrawer = v;
  }

  // src/ui.js
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fmt(n) {
    n = Number(n) || 0;
    return n <= CFG.fmt.wanMin ? String(n) : (n / 1e4).toFixed(1) + "万";
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(Number(s) || 0));
    var m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
  }
  var toastTimer = null;
  function toast(msg) {
    if (!root) return;
    var t = root.querySelector(".acsv-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      t.classList.remove("show");
    }, CFG.time.toast);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function() {
        return true;
      }, function() {
        return false;
      });
    }
    return new Promise(function(resolve) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
      }
      ta.remove();
      resolve(ok);
    });
  }
  function ensureStyle() {
    if (document.getElementById("acsv-style")) return;
    var st = el("style", null, CSS);
    st.id = "acsv-style";
    (document.head || document.documentElement).appendChild(st);
  }

  // src/net.js
  function request(url, method, headers, body) {
    method = method || "POST";
    return new Promise(function(resolve, reject) {
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method,
          url,
          headers: headers || void 0,
          data: body || void 0,
          timeout: 15e3,
          onload: function(r) {
            try {
              resolve(JSON.parse(r.responseText));
            } catch (e) {
              reject(new Error("bad json"));
            }
          },
          onerror: function() {
            reject(new Error("network"));
          },
          ontimeout: function() {
            reject(new Error("timeout"));
          }
        });
      } else {
        var x = new XMLHttpRequest();
        x.open(method, url);
        x.withCredentials = true;
        x.timeout = 15e3;
        if (headers) {
          for (var k in headers) {
            try {
              x.setRequestHeader(k, headers[k]);
            } catch (e) {
            }
          }
        }
        x.onload = function() {
          try {
            resolve(JSON.parse(x.responseText));
          } catch (e) {
            reject(e);
          }
        };
        x.onerror = function() {
          reject(new Error("network"));
        };
        x.ontimeout = function() {
          reject(new Error("timeout"));
        };
        x.send(body || null);
      }
    });
  }

  // src/data.js
  function normalize(raw) {
    var play = raw.playInfo || {};
    var urls = (play.videoUrls || []).map(function(u) {
      return u && u.url;
    }).filter(function(u) {
      return u && /^https?:/.test(u);
    });
    var covers = play.coverUrls && play.coverUrls.length ? play.coverUrls : play.firstFrameUrls || [];
    var user = raw.user || {};
    var counts = raw.meowCounts || {};
    return {
      kind: "sv",
      stype: 5,
      id: raw.meowId || 0,
      title: raw.meowTitle || raw.intro || "#AcFun小视频",
      userName: user.name || "未知用户",
      userId: user.userId || 0,
      head: user.headUrl || "",
      cover: covers.length ? covers[0].url : "",
      urls,
      urlIdx: 0,
      refreshed: false,
      like: counts.likeCount || 0,
      comment: counts.commentCount || 0,
      view: counts.viewCount || 0,
      date: (raw.createTime || "").slice(0, 10),
      shareUrl: raw.shareUrl || CFG.api.shareBase + raw.meowId,
      liked: !!raw.isLike,
      localLike: false
    };
  }
  function normalizeHome(bc) {
    var user = bc.user || {};
    var visit = bc.visit || {};
    return {
      kind: "home",
      stype: 3,
      id: Number(bc.href) || 0,
      title: bc.title || "",
      userName: user.name || "未知用户",
      userId: Number(user.userId) || 0,
      head: user.headUrl || "",
      isFollowing: !!user.isFollowing,
      cover: bc.img && bc.img[0] || "",
      urls: [],
      urlIdx: 0,
      refreshed: false,
      // 懒解析状态：resolving 防并发，resolved 表示 douga/info+playInfo 已取过
      resolving: false,
      resolved: false,
      videoId: "",
      channel: null,
      qualities: null,
      qIdx: 0,
      like: 0,
      // 卡片不带点赞数，resolve 时由 douga/info 的 likeCount 回填
      banana: visit.bananas || 0,
      comment: visit.comments || 0,
      view: visit.views || 0,
      fav: 0,
      // 收藏数（resolve 回填 stowCount）
      share: 0,
      // 分享数（resolve 回填 shareCount）
      danmakuCount: 0,
      date: "",
      shareUrl: CFG.api.videoBase + (Number(bc.href) || ""),
      liked: false,
      favorited: false,
      thrown: false,
      // 是否已投过蕉（douga/info 的 isThrowBanana 回填；投蕉不可取消）
      localLike: false
    };
  }

  // src/appapi.js
  var pcursor = "";
  var exhausted = false;
  var apiSt = null;
  var apiStBusy = null;
  function ensureApiSt(force) {
    if (apiSt && !force) return Promise.resolve(apiSt);
    if (apiStBusy) return apiStBusy;
    apiStBusy = fetch(CFG.api.token, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "sid=acfun.midground.api"
    }).then(function(r) {
      return r.json();
    }).then(function(j) {
      apiStBusy = null;
      if (j && j.result === 0 && j["acfun.midground.api_st"]) {
        apiSt = j["acfun.midground.api_st"];
        return apiSt;
      }
      throw new Error("token-denied");
    }, function(e) {
      apiStBusy = null;
      throw e;
    });
    return apiStBusy;
  }
  function homeHeaders(withAppVer) {
    var d = /* @__PURE__ */ new Date();
    function p(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    var h = {
      "User-Agent": CFG.home.ua,
      "acPlatform": "ANDROID_PHONE",
      "deviceType": "1",
      "net": "WIFI",
      "productId": "2000",
      "udid": "acsv-" + Math.random().toString(36).slice(2) + Date.now(),
      "resolution": "1080x1920",
      "market": "tencent",
      "requestTime": d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + ".000",
      "Content-Type": "application/x-www-form-urlencoded"
    };
    if (withAppVer) h["appVersion"] = CFG.home.appVer;
    return h;
  }
  function q(extra) {
    return "?product=ACFUN_APP&app_version=" + CFG.home.appVer + (extra || "");
  }
  function postForm(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }).then(function(r) {
      return r.json();
    });
  }
  function cardsOf(body) {
    var out = [];
    (body || []).forEach(function(block) {
      if (!block || block.schema === "carousels") return;
      (block.bodyContents || []).forEach(function(bc) {
        if (bc && bc.href && bc.resourceType === 2) out.push(bc);
      });
    });
    return out;
  }
  function intToHex(n) {
    n = Number(n);
    if (!n || n < 0) n = 16777215;
    return "#" + ("000000" + (n & 16777215).toString(16)).slice(-6);
  }
  var AppAPI = {
    // ---- 首页推荐流 ----
    resetPager: function() {
      pcursor = "";
      exhausted = false;
    },
    isExhausted: function() {
      return exhausted;
    },
    homeFeed: function() {
      if (exhausted) return Promise.resolve([]);
      var self = this;
      return request(
        CFG.api.homeFeed + q("&appMode=0"),
        "POST",
        homeHeaders(true),
        "mkey=" + CFG.home.mkey + "&pcursor=" + pcursor + "&count=" + CFG.homeFeedCfg.count
      ).then(function(j) {
        if (!j || j.result !== 0) {
          exhausted = true;
          return [];
        }
        pcursor = j.pcursor === void 0 || j.pcursor === null ? "" : String(j.pcursor);
        var list = cardsOf(j.body).map(normalizeHome);
        if (!list.length) exhausted = true;
        return list;
      }, function() {
        return [];
      });
    },
    // ---- 详情 / 播放 ----
    dougaInfo: function(acId) {
      return request(
        CFG.api.dougaInfo + q("&dougaId=" + acId + "&mkey=" + CFG.home.mkey),
        "GET",
        homeHeaders(false)
      );
    },
    playInfo: function(videoId, acId) {
      return request(CFG.api.playInfo + q("&videoId=" + videoId + "&resourceId=" + acId + "&resourceType=2&mkey=" + CFG.home.mkey), "GET", homeHeaders(false)).then(function(j) {
        var streams = j && j.playInfo && j.playInfo.streams || [];
        return streams.map(function(s) {
          return {
            label: s.qualityLabel || s.qualityType || "默认",
            urls: (s.playUrls || []).map(function(u) {
              return /^http:/.test(u) ? u.replace(/^http:/, "https:") : u;
            }).filter(function(u) {
              return /^https?:/.test(u);
            })
          };
        }).filter(function(x) {
          return x.urls.length;
        });
      }, function() {
        return [];
      });
    },
    // 懒解析链：douga/info（videoId/计数/初始状态）→ playInfo（分档直链）
    resolve: function(item) {
      var self = this;
      return this.dougaInfo(item.id).then(function(d) {
        if (!d || d.result !== 0 || !(d.videoList || []).length) return false;
        item.videoId = d.videoList[0].id;
        item.channel = d.channel || null;
        item.danmakuCount = d.danmakuCount || 0;
        item.liked = !!d.isLike;
        item.favorited = !!d.isFavorite;
        item.thrown = !!d.isThrowBanana;
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
        item.isFollowing = !!u.isFollowing;
        return self.playInfo(item.videoId, item.id).then(function(qualities) {
          if (!qualities.length) return false;
          item.qualities = qualities;
          self.applyQuality(item);
          return item.urls.length > 0;
        });
      });
    },
    // 按记忆清晰度（无记忆取最高档，streams 本身按清晰度降序）
    applyQuality: function(item) {
      var label = null;
      try {
        label = localStorage.getItem(CFG.lsQuality);
      } catch (e) {
      }
      var idx = 0;
      if (label) {
        for (var i = 0; i < item.qualities.length; i++) {
          if (item.qualities[i].label === label) {
            idx = i;
            break;
          }
        }
      }
      item.qIdx = idx;
      item.urls = item.qualities[idx].urls;
      item.urlIdx = 0;
    },
    // ---- 互动写接口 ----
    appPost: function(url, body) {
      return ensureApiSt().then(function(st) {
        return request(url, "POST", homeHeaders(false), body + "&acfun.midground.api_st=" + encodeURIComponent(st));
      }, function() {
        return request(url, "POST", homeHeaders(false), body);
      }).then(function(j) {
        return !!(j && j.result === 0);
      }, function() {
        return false;
      });
    },
    setFavorite: function(acId, on) {
      return this.appPost(
        on ? CFG.api.favorite : CFG.api.unFavorite,
        on ? "resourceId=" + acId + "&resourceType=2" : "resourceIds=" + acId + "&resourceType=2"
      );
    },
    throwBanana: function(acId, count) {
      return this.appPost(
        CFG.api.banana,
        "resourceId=" + acId + "&resourceType=2&count=" + (count > 0 ? count : 1)
      );
    },
    // 评论点赞：PC 端点（复用动态广场模块，网页 Cookie 即可，无需 token）
    commentLike: function(sourceId, sourceType, commentId, on) {
      return postForm(
        CFG.api.commentLikePc + (on ? "like" : "unlike"),
        { "Content-Type": "application/x-www-form-urlencoded" },
        "sourceId=" + sourceId + "&sourceType=" + sourceType + "&commentId=" + commentId
      ).then(function(j) {
        return !!(j && j.result === 0);
      }, function() {
        return false;
      });
    },
    // 图片上传（移植动态广场 uploadImage：getToken → 分片 → complete → 换 URL）
    // 需 GM_xmlhttpRequest（二进制分片）；成功返回可长期访问的裸路径 URL
    uploadImage: function(file) {
      return new Promise(function(resolve) {
        if (typeof GM_xmlhttpRequest !== "function") return resolve(null);
        var CHUNK = 1 << 20;
        GM_xmlhttpRequest({
          method: "POST",
          url: "https://www.acfun.cn/rest/pc-direct/image/upload/getToken",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: "fileName=" + encodeURIComponent(file.name || "image.png"),
          timeout: 15e3,
          onload: function(r) {
            var token = null;
            try {
              var d = JSON.parse(r.responseText);
              token = d.result === 0 && d.info ? d.info.token : null;
            } catch (e) {
            }
            if (!token) return resolve(null);
            var endpoint = "https://upload.kuaishouzt.com";
            var total = file.size;
            var chunks = Math.max(1, Math.ceil(total / CHUNK));
            var i = 0;
            function nextChunk() {
              if (i >= chunks) return complete();
              var start = i * CHUNK;
              var end = Math.min(start + CHUNK, total);
              GM_xmlhttpRequest({
                method: "POST",
                url: endpoint + "/api/upload/fragment?upload_token=" + encodeURIComponent(token) + "&fragment_id=" + i,
                headers: {
                  "Content-Type": "application/octet-stream",
                  "Content-Range": "bytes " + start + "-" + (end - 1) + "/" + total
                },
                data: file.slice(start, end),
                timeout: 6e4,
                onload: function(r2) {
                  try {
                    if (JSON.parse(r2.responseText).result === 1) {
                      i++;
                      return nextChunk();
                    }
                  } catch (e) {
                  }
                  resolve(null);
                },
                onerror: function() {
                  resolve(null);
                }
              });
            }
            function complete() {
              GM_xmlhttpRequest({
                method: "POST",
                url: endpoint + "/api/upload/complete?upload_token=" + encodeURIComponent(token) + "&fragment_count=" + chunks,
                timeout: 3e4,
                onload: function(r3) {
                  try {
                    if (JSON.parse(r3.responseText).result === 1) return getUrl();
                  } catch (e) {
                  }
                  resolve(null);
                },
                onerror: function() {
                  resolve(null);
                }
              });
            }
            function getUrl() {
              GM_xmlhttpRequest({
                method: "POST",
                url: "https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                data: "token=" + encodeURIComponent(token) + "&bizFlag=web-comment-text",
                timeout: 15e3,
                onload: function(r4) {
                  try {
                    var d4 = JSON.parse(r4.responseText);
                    resolve(d4.result === 0 && d4.url ? d4.url.split("?")[0] : null);
                  } catch (e) {
                    resolve(null);
                  }
                },
                onerror: function() {
                  resolve(null);
                }
              });
            }
            nextChunk();
          },
          onerror: function() {
            resolve(null);
          }
        });
      });
    },
    // 发评论/回复（复用动态广场 postComment：replyToCommentId 传入则为回复楼中楼；
    // midgroundToken 由网页 Cookie 换取，未登录时直发让接口报错）；失败透传 error_msg
    postComment: function(sourceId, sourceType, content, replyToCommentId) {
      var base = "sourceId=" + sourceId + "&sourceType=" + sourceType + "&replyToCommentId=" + (replyToCommentId || 0) + "&content=" + encodeURIComponent(content);
      var FORM = { "Content-Type": "application/x-www-form-urlencoded" };
      return ensureApiSt().then(function(st) {
        return postForm(CFG.api.commentAdd, base + "&midgroundToken=" + encodeURIComponent(st));
      }, function() {
        return postForm(CFG.api.commentAdd, base);
      }).then(function(j) {
        if (j && j.result === 0) return { ok: true };
        return { ok: false, msg: j && (j.error_msg || j.msg) || "" };
      }, function() {
        return { ok: false, msg: "网络错误" };
      });
    },
    // ---- 弹幕（www.acfun.cn 同域，网页 Cookie） ----
    // 注意：POST body 必须带表单 Content-Type，否则后端解析不到参数（result 21）
    // 全量分页拉取，返回按 position 升序的规整条目
    danmakuList: function(videoId) {
      var all = [];
      var FORM = { "Content-Type": "application/x-www-form-urlencoded" };
      function page(p) {
        return request(
          CFG.api.dmList,
          "POST",
          FORM,
          "resourceId=" + videoId + "&resourceType=9&enableAdvanced=true&pcursor=" + p + "&count=" + CFG.danmaku.pageSize + "&sortType=1&asc=false"
        ).then(function(j) {
          if (!j || j.result !== 0) return all;
          (j.danmakus || []).forEach(function(m) {
            all.push({
              id: m.danmakuId,
              text: String(m.body || "").replace(/\s+/g, " "),
              at: Number(m.position) || 0,
              mode: Number(m.mode) || 1,
              color: intToHex(m.color),
              size: Number(m.size) || 25
            });
          });
          var next = j.pcursor;
          if (!next || next === "no_more" || next === "0" || all.length >= CFG.danmaku.maxPages * CFG.danmaku.pageSize) return all;
          return page(next);
        }, function() {
          return all;
        });
      }
      return page(1).then(function(list) {
        list.sort(function(a, b) {
          return a.at - b.at;
        });
        return list;
      });
    },
    danmakuAdd: function(item, text, positionMs) {
      var ch = item.channel || {};
      return postForm(
        CFG.api.dmAdd,
        "body=" + encodeURIComponent(text) + "&color=16777215&mode=1&size=25&position=" + Math.max(0, Math.round(positionMs)) + "&id=" + item.id + "&videoId=" + item.videoId + "&roleId=&subChannelId=" + (ch.parentId || 0) + "&subChannelName=" + encodeURIComponent(ch.parentName || "") + "&type=douga"
      ).then(function(j) {
        if (j && j.result === 0) return { ok: true };
        return { ok: false, msg: j && (j.error_msg || j.msg) || "" };
      }, function() {
        return { ok: false, msg: "网络错误" };
      });
    }
  };

  // src/api.js
  function mockData() {
    return window.__ACSV_MOCK__ || null;
  }
  function mockHome() {
    return window.__ACSV_MOCK_HOME__ || null;
  }
  var curSource = "sv";
  try {
    curSource = localStorage.getItem(CFG.lsSource) === "home" ? "home" : "sv";
  } catch (e) {
  }
  function getSource() {
    return curSource;
  }
  function setSource(s) {
    curSource = s === "home" ? "home" : "sv";
    if (curSource === "home") AppAPI.resetPager();
    try {
      localStorage.setItem(CFG.lsSource, curSource);
    } catch (e) {
    }
  }
  function resetHomePager() {
    if (curSource === "home") AppAPI.resetPager();
  }
  var API = {
    feed: function() {
      if (curSource === "home") {
        var mh = mockHome();
        if (mh) return Promise.resolve(mh.map(normalizeHome));
        return AppAPI.homeFeed();
      }
      var mock = mockData();
      if (mock && mock.feed) {
        return Promise.resolve((mock.feed || []).filter(function(r) {
          return r && r.playInfo && r.playInfo.videoUrls && r.playInfo.videoUrls.length;
        }).map(normalize));
      }
      return request(CFG.api.feed).then(function(json) {
        return (json && json.meowFeed || []).map(normalize);
      });
    },
    // 小视频单条详情（深链置顶用，home 模式不走）
    info: function(mid) {
      var mock = mockData();
      if (mock && mock.feed) {
        var raw = mock.feed.filter(function(r) {
          return String(r.meowId) === String(mid);
        })[0];
        return Promise.resolve(raw ? normalize(raw) : null);
      }
      return request(CFG.api.info + mid).then(function(json) {
        return json && json.meowFeed ? normalize(json.meowFeed) : null;
      });
    },
    // 直链过期/缺失时的补链：sv 重取详情，home 重跑解析
    refreshItem: function(item) {
      if (item.kind === "home") {
        var mh = mockHome();
        if (mh) {
          var raw = mh.filter(function(c) {
            return String(c.href) === String(item.id);
          })[0];
          var mu = raw && raw.mockUrl;
          item.urls = mu ? [mu] : [];
          item.qualities = mu ? [{ label: "示例", urls: [mu] }] : [];
          item.videoId = "mock-" + item.id;
          item.resolved = true;
          item.fav = 12;
          item.share = 34;
          item.date = "2026-09-26";
          return Promise.resolve(!!mu);
        }
        return AppAPI.resolve(item);
      }
      return this.info(item.id).then(function(p) {
        return !!(p && p.urls.length && (item.urls = p.urls, item.urlIdx = 0, true));
      }, function() {
        return false;
      });
    }
  };

  // src/uppage.js
  var PAGE_SIZE = 10;
  var UpVideos = {
    uid: 0,
    pcursor: null,
    total: 0,
    busy: false,
    done: false,
    failed: false,
    items: [],
    chainBusy: false,
    page: 1,
    sortBy: "newest",
    counts: {},
    countsFetched: 0,
    hotFetching: false,
    feedActive: false,
    feedCursor: 0,
    gridEl: null,
    pagebarEl: null,
    progressEl: null,
    sortWrapEl: null,
    countSpan: null
  };
  function gmGetText(url) {
    return new Promise(function(resolve, reject) {
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: 2e4,
          headers: {
            "Referer": "https://m.acfun.cn/",
            // m 站对桌面 UA 会 302 到 PC 空间页（无小视频数据），必须伪装手机 UA
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
          },
          onload: function(r) {
            resolve(r.responseText);
          },
          onerror: function() {
            reject(new Error("network"));
          },
          ontimeout: function() {
            reject(new Error("timeout"));
          }
        });
      } else {
        reject(new Error("no-gm"));
      }
    });
  }
  function parseUpItems(html) {
    var box = document.createElement("div");
    box.innerHTML = html;
    var out = [];
    var lis = box.querySelectorAll("li[meow-id]");
    for (var i = 0; i < lis.length; i++) {
      var img = lis[i].querySelector("img");
      out.push({
        id: lis[i].getAttribute("meow-id"),
        cover: img ? img.src : ""
      });
    }
    return out;
  }
  function loadUpVideos(first) {
    var uid = UpVideos.uid;
    UpVideos.busy = true;
    var url = first ? CFG.api.upPage + uid : CFG.api.upPage + uid + "?page=" + UpVideos.pcursor + "&userId=" + uid + "&type=6&pcursor=" + UpVideos.pcursor + "&pagelets=short-video-list&ajaxpipe=1";
    return gmGetText(url).then(function(txt) {
      UpVideos.busy = false;
      var html = txt, pc = "no_more";
      if (first) {
        var pm = txt.match(/"pcursor":"([^"]+)"/);
        pc = pm ? pm[1] : "no_more";
      } else {
        try {
          var j = JSON.parse(txt.replace(/\/\*<!-- fetch-stream -->\*\/\s*$/, ""));
          html = j && j.html || "";
          var sm = (j && j.scripts || []).join("").match(/"pcursor":"([^"]+)"/);
          pc = sm ? sm[1] : "no_more";
        } catch (e) {
          UpVideos.failed = true;
          return [];
        }
      }
      var tm = html.match(/"totalCount":(\d+)/) || txt.match(/"totalCount":(\d+)/);
      if (tm) UpVideos.total = Number(tm[1]);
      var items = parseUpItems(html);
      if (pc === "no_more" || !items.length) UpVideos.done = true;
      UpVideos.pcursor = pc;
      return items;
    }, function() {
      UpVideos.busy = false;
      UpVideos.failed = true;
      return [];
    });
  }
  function appendUpCells(items, offset) {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    offset = offset || 0;
    items.forEach(function(it, k) {
      var cell = el("div", "acsv-space-cell");
      cell.title = "播放小视频";
      var img = el("img");
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      img.addEventListener("load", function() {
        img.classList.add("ld");
      });
      img.src = it.cover;
      cell.appendChild(img);
      cell.addEventListener("click", function() {
        UpVideos.feedActive = true;
        UpVideos.feedCursor = offset + k + 1;
        FeedStore.resetForList();
        location.hash = CFG.hash + "/" + it.id;
      });
      grid.appendChild(cell);
    });
  }
  function sortedUpItems() {
    var arr = UpVideos.items.slice();
    if (UpVideos.sortBy === "hotest") {
      var withCounts = arr.filter(function(it) {
        return UpVideos.counts[it.id] !== void 0;
      });
      var without = arr.filter(function(it) {
        return UpVideos.counts[it.id] === void 0;
      });
      withCounts.sort(function(a, b) {
        return (UpVideos.counts[b.id] || 0) - (UpVideos.counts[a.id] || 0);
      });
      return withCounts.concat(without);
    }
    return arr;
  }
  function renderUpPage() {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    var sorted = sortedUpItems();
    var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (UpVideos.page > pages) UpVideos.page = pages;
    var slice = sorted.slice((UpVideos.page - 1) * PAGE_SIZE, UpVideos.page * PAGE_SIZE);
    grid.innerHTML = "";
    appendUpCells(slice, (UpVideos.page - 1) * PAGE_SIZE);
    renderUpPagebar(pages);
    renderUpProgress();
  }
  function renderUpPagebar(totalPagesLoaded) {
    var bar = UpVideos.pagebarEl;
    if (!bar) return;
    var totalPages = UpVideos.total ? Math.ceil(UpVideos.total / PAGE_SIZE) : totalPagesLoaded;
    var cur = UpVideos.page;
    bar.innerHTML = "";
    function btn(label, target, opts) {
      opts = opts || {};
      var b = el("button", "acsv-pagebtn" + (opts.cur ? " cur" : "") + (opts.dots ? " dots" : ""), label);
      if (opts.disabled) b.disabled = true;
      if (!opts.disabled && !opts.cur && !opts.dots) {
        b.addEventListener("click", function() {
          UpVideos.page = target;
          renderUpPage();
        });
      }
      bar.appendChild(b);
    }
    btn("‹", cur - 1, { disabled: cur <= 1 });
    var shown = {};
    var windowLo = Math.max(1, cur - 2), windowHi = Math.min(totalPages, cur + 2);
    [1, windowLo - 1, windowLo, windowHi + 1, totalPages].forEach(function(p2) {
      if (p2 >= 1 && p2 <= totalPages) shown[p2] = "jump";
    });
    for (var p = windowLo; p <= windowHi; p++) shown[p] = false;
    var keys = Object.keys(shown).map(Number).sort(function(a, b) {
      return a - b;
    });
    var prev = 0;
    keys.forEach(function(p2) {
      if (prev && p2 - prev > 1) btn("…", 0, { dots: true });
      var loaded = p2 <= totalPagesLoaded;
      btn(String(p2), p2, { cur: p2 === cur, disabled: !loaded });
      prev = p2;
    });
    btn("›", cur + 1, { disabled: cur >= totalPagesLoaded });
  }
  function renderUpProgress() {
    var elp = UpVideos.progressEl;
    if (!elp) return;
    if (UpVideos.countSpan && UpVideos.total) {
      UpVideos.countSpan.textContent = fmt(UpVideos.total);
    }
    var loaded = UpVideos.items.length;
    var base = "已加载 " + loaded + (UpVideos.total ? " / " + UpVideos.total : "");
    if (UpVideos.sortBy === "hotest" && !UpVideos.done) {
      elp.textContent = base + "（加载中，最热排序将在加载完成后准确）";
    } else if (UpVideos.sortBy === "hotest") {
      elp.textContent = loaded ? "热度统计 " + UpVideos.countsFetched + " / " + loaded : base;
    } else {
      elp.textContent = UpVideos.done ? "共 " + loaded + " 个" : UpVideos.failed && !loaded ? "加载失败（需在 Tampermonkey 下运行）" : base + "（后台加载中）";
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
      loadUpVideos(UpVideos.pcursor === null).then(function(items) {
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
      var todo = UpVideos.items.filter(function(it) {
        return UpVideos.counts[it.id] === void 0;
      });
      if (!todo.length) {
        UpVideos.hotFetching = false;
        renderUpProgress();
        return;
      }
      var batch = todo.slice(0, 4);
      Promise.all(batch.map(function(it) {
        return request(CFG.api.info + it.id).then(function(j) {
          var mc = j && j.meowFeed && j.meowFeed.meowCounts || {};
          UpVideos.counts[it.id] = mc.likeCount || 0;
        }, function() {
          UpVideos.counts[it.id] = 0;
        });
      })).then(function() {
        UpVideos.countsFetched = Object.keys(UpVideos.counts).length;
        if (UpVideos.sortBy === "hotest") renderUpPage();
        renderUpProgress();
        setTimeout(step, CFG.time.hotGap);
      });
    })();
  }
  function injectSpaceVideos(uid) {
    if (document.getElementById("acsv-space-grid")) return;
    UpVideos.uid = Number(uid);
    UpVideos.pcursor = null;
    UpVideos.done = false;
    UpVideos.failed = false;
    UpVideos.total = 0;
    UpVideos.items = [];
    UpVideos.page = 1;
    UpVideos.sortBy = "newest";
    UpVideos.counts = {};
    UpVideos.countsFetched = 0;
    ensureStyle();
    var grid = el("div", "acsv-space-grid");
    grid.id = "acsv-space-grid";
    var pagebar = el("div", "acsv-pagebar");
    var progress = el("span", "acsv-progress-txt", "加载中…");
    var sort = el("div", "acsv-sort");
    sort.appendChild(el("span", "acsv-sort-cur", "最新"));
    sort.appendChild(el("i", "arrow", "▾"));
    var menu = el("ul", "acsv-sort-menu");
    [["newest", "最新"], ["hotest", "最热"]].forEach(function(p) {
      var li2 = el("li", p[0] === "newest" ? "on" : "", p[1]);
      li2.dataset.sort = p[0];
      li2.addEventListener("click", function(ev) {
        ev.stopPropagation();
        UpVideos.sortBy = p[0];
        sort.querySelector(".acsv-sort-cur").textContent = p[1];
        [...menu.children].forEach(function(m) {
          m.classList.toggle("on", m.dataset.sort === p[0]);
        });
        sort.classList.remove("open");
        UpVideos.page = 1;
        renderUpPage();
        if (p[0] === "hotest") ensureHotCounts();
      });
      menu.appendChild(li2);
    });
    sort.appendChild(menu);
    sort.addEventListener("click", function(ev) {
      ev.stopPropagation();
      sort.classList.toggle("open");
    });
    document.addEventListener("click", function() {
      sort.classList.remove("open");
    }, { once: false });
    var toolbar = el("div", "acsv-toolbar");
    toolbar.appendChild(progress);
    toolbar.appendChild(sort);
    UpVideos.gridEl = grid;
    UpVideos.pagebarEl = pagebar;
    UpVideos.progressEl = progress;
    var cl = document.querySelector(".ac-space-contribute-list");
    var tagsUl = cl && cl.querySelector("ul.tags");
    if (cl && tagsUl) {
      var albumLi = tagsUl.querySelector('li[data-index="album"]');
      var siteSortSpan = tagsUl.querySelector("#ac-space-contribute-sort");
      var siteSortLi = siteSortSpan ? siteSortSpan.closest("li") : null;
      var li = el("li", null, "小视频<span>0</span>");
      li.dataset.index = "svideo";
      li.title = "该 UP 主的小视频";
      var panel = el("div", "tag-content");
      panel.appendChild(toolbar);
      panel.appendChild(grid);
      panel.appendChild(pagebar);
      li.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (siteSortLi) siteSortLi.style.display = "none";
        var lis = tagsUl.children;
        for (var i = 0; i < lis.length; i++) lis[i].classList.remove("active");
        li.classList.add("active");
        var panels = cl.querySelectorAll(":scope > .tag-content");
        for (var k = 0; k < panels.length; k++) panels[k].classList.remove("active");
        panel.classList.add("active");
      });
      tagsUl.addEventListener("click", function(ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest("li[data-index]") : null;
        if (t && t.dataset.index !== "svideo" && siteSortLi) siteSortLi.style.display = "";
      });
      if (albumLi) albumLi.insertAdjacentElement("afterend", li);
      else tagsUl.appendChild(li);
      cl.appendChild(panel);
      UpVideos.countSpan = li.querySelector("span");
      startUpChain();
      return;
    }
    var space = document.getElementById("ac-space");
    var wp = space && (space.querySelector(".wp") || space);
    if (!wp) return;
    var sec = el("section", "acsv-space");
    sec.id = "acsv-space";
    var head = el("div", "acsv-space-head");
    head.appendChild(el("h2", null, "小视频"));
    head.appendChild(el("span", "n", ""));
    sec.appendChild(head);
    sec.appendChild(toolbar);
    sec.appendChild(grid);
    sec.appendChild(pagebar);
    wp.appendChild(sec);
    UpVideos.countSpan = head.querySelector(".n");
    startUpChain();
  }
  function tryInjectSpace() {
    var mU = location.pathname.match(/^\/u\/(\d+)/);
    if (!mU) return;
    var tries = 0;
    var attempt = function() {
      if (document.getElementById("acsv-space")) return;
      if (document.getElementById("ac-space")) {
        injectSpaceVideos(mU[1]);
        return;
      }
      if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
    };
    attempt();
  }

  // src/feedstore.js
  function createFeedStore(env) {
    var store = {
      items: [],
      seen: {},
      loading: false,
      pumpBusy: false,
      current: 0,
      changed: function() {
        if (env.onChange) env.onChange();
      },
      fetchMore: function() {
        var self = this;
        if (self.loading) return Promise.resolve();
        self.loading = true;
        return env.api.feed().then(function(list) {
          self.loading = false;
          dbg("fetch:list=" + list.length);
          list.forEach(function(n) {
            if (n.id && !self.seen[n.id] && (n.kind === "home" || n.urls.length)) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
          });
          dbg("fetch:items=" + self.items.length);
          self.changed();
        }, function() {
          self.loading = false;
        });
      },
      // 直链过期刷新：sv 换备用 CDN 或重取详情；home 重跑解析链
      refresh: function(item) {
        return env.api.refreshItem(item).then(function(ok) {
          if (ok && item.urls.length) {
            item.urlIdx = 0;
            return true;
          }
          return false;
        }, function() {
          return false;
        });
      },
      ensureMore: function() {
        var self = this;
        var ctx = env.getListContext();
        if (ctx) {
          self.pumpListContext(ctx);
          return Promise.resolve();
        }
        if (self.items.length === 0 || self.current >= self.items.length - CFG.feed.bufferSize) {
          return self.fetchMore();
        }
        return Promise.resolve();
      },
      // 按列表上下文顺序泵入下一条（逐个取详情，保持列表顺序）
      pumpListContext: function(ctx) {
        var self = this;
        if (!ctx || self.pumpBusy) return;
        self.pumpBusy = true;
        (function step() {
          if (env.getListContext() !== ctx) {
            self.pumpBusy = false;
            return;
          }
          while (ctx.feedCursor < ctx.items.length && self.seen[ctx.items[ctx.feedCursor].id]) {
            ctx.feedCursor++;
          }
          if (ctx.feedCursor >= ctx.items.length) {
            self.pumpBusy = false;
            if (ctx.done || ctx.failed) self.fetchMore().then(function() {
              env.onChange();
            });
            else setTimeout(function() {
              self.pumpListContext(ctx);
            }, CFG.time.chainGap);
            return;
          }
          var raw = ctx.items[ctx.feedCursor];
          env.api.info(raw.id).then(function(n) {
            if (n && n.id && n.urls.length && !self.seen[n.id]) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
            ctx.feedCursor++;
            self.pumpBusy = false;
            if (self.items.length - self.current < CFG.feed.bufferSize) self.pumpListContext(ctx);
            else env.onChange();
          }, function() {
            ctx.feedCursor++;
            self.pumpBusy = false;
            self.pumpListContext(ctx);
          });
        })();
      },
      resetForList: function() {
        this.items = [];
        this.seen = {};
        this.current = 0;
        this.loading = false;
        this.pumpBusy = false;
      },
      // 内容源切换/进入竖刷页时的全量重置（resetForList 的别名，语义更明确）
      reset: function() {
        this.resetForList();
      },
      // 进入时带 meowId：缓冲为空则加载该条置顶；缓冲已有则跳到它
      loadFirst: function(mid) {
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
        return env.api.info(mid).then(function(n) {
          if (n && n.id && n.urls.length) {
            self.seen[n.id] = 1;
            self.items.unshift(n);
            self.current = 0;
            return;
          }
          return self.fetchMore();
        }, function() {
          return self.fetchMore();
        });
      }
    };
    return store;
  }
  var FeedStore = createFeedStore({
    api: {
      feed: function() {
        return API.feed();
      },
      info: function(id) {
        return API.info(id);
      },
      refreshItem: function(item) {
        return API.refreshItem(item);
      }
    },
    onChange: function() {
      if (scroller) renderWindow();
    },
    getListContext: function() {
      return UpVideos.feedActive ? UpVideos : null;
    }
  });

  // src/route.js
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, "");
    var m = h.match(new RegExp("^" + CFG.hash + "(?:\\/(\\d+))?"));
    return {
      active: !!m || location.pathname === "/" + CFG.hash,
      mid: m && m[1] ? m[1] : null
    };
  }
  function isFeedRoute() {
    return parseRoute().active;
  }
  function syncHash(idx) {
    if (!root) return;
    var it = FeedStore.items[idx];
    if (!it) return;
    try {
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#" + CFG.hash + "/" + it.id
      );
    } catch (e) {
    }
  }

  // src/comments.js
  var commentState = { meowId: 0, stype: 5, shareUrl: "", page: 1, totalPage: 1, pcursor: "no_more", loading: false, replyTo: null, kind: "sv" };
  var EmotionMap = { loaded: false, loading: null, map: {}, packs: [] };
  function applyEmotPacks(flat) {
    var map = {};
    var packs = [];
    var byName = {};
    (flat || []).forEach(function(u) {
      if (!u || !u.emotionId || !u.emotionImageUrl) return;
      var big = u.emotionBigUrl || u.emotionImageUrl;
      map[u.emotionId] = { url: u.emotionImageUrl, big, name: u.emotionName || "", pkg: u.emotionPkgName || "" };
      var pack = byName[u.emotionPkgName];
      if (!pack) {
        pack = byName[u.emotionPkgName] = { name: u.emotionPkgName || "表情", items: [] };
        packs.push(pack);
      }
      pack.items.push({ id: u.emotionId, url: u.emotionImageUrl, big, name: u.emotionName || "" });
    });
    EmotionMap.map = map;
    EmotionMap.packs = packs;
    EmotionMap.loaded = true;
    return packs;
  }
  function ensureEmotionMap() {
    if (EmotionMap.loaded) return Promise.resolve();
    if (EmotionMap.loading) return EmotionMap.loading;
    EmotionMap.loading = new Promise(function(resolve) {
      try {
        var cached = JSON.parse(localStorage.getItem("emoticonList") || "null");
        if (Array.isArray(cached) && cached.length) {
          applyEmotPacks(cached);
          resolve();
          return;
        }
      } catch (e) {
      }
      request(CFG.api.emotion, "POST").then(function(j) {
        var flat = [];
        var pkgs = j && (j.emotionPackageList || j.data) || [];
        pkgs.forEach(function(p) {
          (p.emotions || []).forEach(function(e) {
            try {
              var url = e.emotionImageSmallUrl || e.smallImageInfo && e.smallImageInfo.thumbnailImageCdnUrl || e.smallImageInfo && e.smallImageInfo.thumbnailImage && e.smallImageInfo.thumbnailImage.cdnUrls && e.smallImageInfo.thumbnailImage.cdnUrls[0] && e.smallImageInfo.thumbnailImage.cdnUrls[0].url || "";
              var rawBig = typeof e.emotionImageBigUrl === "string" && e.emotionImageBigUrl || e.bigImageInfo && e.bigImageInfo.thumbnailImageCdnUrl || e.bigImageInfo && e.bigImageInfo.thumbnailImage && e.bigImageInfo.thumbnailImage.cdnUrls && e.bigImageInfo.thumbnailImage.cdnUrls[0] && e.bigImageInfo.thumbnailImage.cdnUrls[0].url || "";
              flat.push({
                emotionId: e.id,
                emotionPkgName: p.name,
                emotionImageUrl: url,
                emotionBigUrl: rawBig || url,
                emotionName: typeof e.name === "string" && e.name || ""
              });
            } catch (err) {
            }
          });
        });
        applyEmotPacks(flat);
        resolve();
      }, function() {
        resolve();
      });
    });
    return EmotionMap.loading;
  }
  var IMG_CDN_OK = /^https?:\/\/[\w.-]+\.(aixifan\.com|acfun\.cn)\//;
  function renderCommentHtml(content) {
    var h = esc(content || "");
    h = h.replace(/\[emot=acfun,(\w+)\/\]/g, function(_, id) {
      var em = EmotionMap.map[id];
      var u = em ? typeof em === "string" ? em : em.url : null;
      return u ? '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">' : "[表情]";
    });
    h = h.replace(/\[emot=(\w+),(\w+)\/\]/g, function(_, pkg, id) {
      return '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/' + pkg + "/" + id + '.gif" referrerpolicy="no-referrer">';
    });
    h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function(_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function(_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    return h;
  }
  function isOpenComments() {
    return !!(commentDrawer && commentDrawer.el.classList.contains("open"));
  }
  function closeComments() {
    if (commentDrawer) commentDrawer.el.classList.remove("open");
    if (root) root.classList.remove("acsv-with-comments");
  }
  function openComments(meowId, stype, shareUrl, kind) {
    if (!commentDrawer || !meowId) return;
    commentDrawer.el.classList.add("open");
    if (root) {
      root.classList.add("acsv-with-comments");
      var dw = Math.min(380, window.innerWidth * 0.88);
      var scale = Math.max(0.3, (window.innerWidth - dw) / window.innerWidth);
      root.style.setProperty("--acsv-cscale", String(scale));
    }
    commentState.stype = Number(stype) || 5;
    commentState.kind = kind === "home" ? "home" : "sv";
    commentState.shareUrl = shareUrl || CFG.api.shareBase + meowId;
    ensureCommentInput();
    if (inputBar) inputBar.style.display = commentState.kind === "home" ? "flex" : "none";
    if (commentState.meowId !== meowId) {
      setReply(null);
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
      commentDrawer.list.innerHTML = "";
      commentDrawer.list.appendChild(el(
        "div",
        "acsv-spinner",
        null
      )).style.cssText = "position:static;margin:40px auto;display:block";
    }
    var p = window.__ACSV_MOCK__ ? Promise.resolve(mockComments()) : request(CFG.api.comment + meowId + "&sourceType=" + commentState.stype + "&page=" + page + "&pivotCommentId=0&newPivotCommentId=&showHotComments=1", "GET");
    Promise.all([p, ensureEmotionMap()]).then(function(res) {
      var j = res[0];
      commentState.loading = false;
      var list = j && j.rootComments || [];
      commentState.page = j && j.curPage || page;
      commentState.totalPage = j && j.totalPage || 1;
      commentState.pcursor = j && j.pcursor || "no_more";
      commentState.count = j && j.commentCount != null ? j.commentCount : list.length;
      renderComments(list, append, j && j.subCommentsMap, j && j.hotComments || []);
    }, function() {
      commentState.loading = false;
      renderCommentTip("评论加载失败，请重试");
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
    var item = el("div", "acsv-citem");
    var homeUrl = c.userId ? CFG.api.userBase + c.userId : null;
    var avLink = el("a", "acsv-avlink");
    if (homeUrl) {
      avLink.href = homeUrl;
      avLink.target = "_blank";
      avLink.title = "访问 " + (c.userName || "") + " 的空间";
    }
    var av = el("img", "av");
    av.referrerPolicy = "no-referrer";
    var hu = c.headUrl;
    if (Array.isArray(hu)) hu = hu[0] && hu[0].url || "";
    else if (hu && typeof hu === "object") hu = hu.url || "";
    av.src = (typeof hu === "string" && hu ? hu : CFG.api.defaultAvatar).split("?")[0];
    avLink.appendChild(av);
    var body = el("div", "acsv-cbody");
    var name = el("div", "acsv-cname");
    if (homeUrl) {
      var na = el("a", null, esc(c.userName || "AcFun用户"));
      na.href = homeUrl;
      na.target = "_blank";
      name.appendChild(na);
    } else {
      name.appendChild(el("span", null, esc(c.userName || "AcFun用户")));
    }
    if (c.isUp) name.appendChild(el("span", "up", "UP"));
    body.appendChild(name);
    body.appendChild(el("div", "acsv-ctext"));
    body.lastChild.innerHTML = renderCommentHtml(c.content);
    var meta = el("div", "acsv-cmeta");
    meta.appendChild(el("span", null, esc(c.postDate || "")));
    var like = null, replyBtn = null;
    if (commentState.kind === "home") {
      like = el("span", "acsv-clike" + (c.isLike || c.localLike ? " on" : ""), ICONS.heart);
      var likeN = el("span", null, fmt((c.likeCount || 0) + (c.localLike ? 1 : 0)));
      like.appendChild(likeN);
      like.title = "点赞评论";
      like.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (c.likeBusy) return;
        var on = !(c.isLike || c.localLike);
        c.likeBusy = true;
        c.localLike = on;
        like.classList.toggle("on", on);
        likeN.textContent = fmt((c.likeCount || 0) + (on ? 1 : 0));
        AppAPI.commentLike(commentState.meowId, commentState.stype, c.commentId, on).then(function(ok) {
          c.likeBusy = false;
          if (ok) return;
          c.localLike = !on;
          like.classList.toggle("on", !on);
          likeN.textContent = fmt(c.likeCount || 0);
          toast("操作失败（未登录？）");
        });
      });
      meta.appendChild(like);
      replyBtn = el("span", "acsv-creplybtn", "回复");
      replyBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        setReply({ id: String(c.commentId), name: c.userName || "AcFun用户" });
        if (inputBar) {
          var inp = inputBar.querySelector(".acsv-cinput-text");
          if (inp) inp.focus();
        }
      });
      meta.appendChild(replyBtn);
    } else {
      like = el("span", "acsv-clike", ICONS.heart);
      like.appendChild(el("span", null, fmt(c.likeCount)));
      meta.appendChild(like);
    }
    body.appendChild(meta);
    var subs = normalizeSubs(subMap, c.commentId);
    var subBox = null;
    if (subs.length) {
      subBox = el("div", "acsv-csub");
      subs.forEach(function(s) {
        subBox.appendChild(commentItem(s, null, meowId));
      });
      body.appendChild(subBox);
    }
    if ((c.subCommentCount || 0) > subs.length) {
      expandSubComments(body, c, subBox);
    }
    item.appendChild(avLink);
    item.appendChild(body);
    return item;
  }
  function expandSubComments(body, c, subBox) {
    var more = el("button", "acsv-cmore", "展开 " + c.subCommentCount + " 条回复");
    var pcursor2 = "";
    var loaded = subBox ? subBox.querySelectorAll(".acsv-citem").length : 0;
    function appendSubs(arr) {
      if (!arr.length) return;
      if (!subBox) {
        subBox = el("div", "acsv-csub");
        body.insertBefore(subBox, more);
      }
      arr.forEach(function(s) {
        subBox.appendChild(commentItem(s, null, commentState.meowId));
      });
    }
    more.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (more._busy) return;
      more._busy = true;
      more.textContent = "展开中…";
      request(CFG.api.commentSub + "?sourceId=" + commentState.meowId + "&sourceType=" + commentState.stype + "&rootCommentId=" + c.commentId + "&pcursor=" + pcursor2 + "&count=20", "GET").then(function(j) {
        more._busy = false;
        if (!j || j.result !== 0) {
          more.textContent = "展开失败，点击重试";
          return;
        }
        appendSubs(j.subComments || []);
        loaded += (j.subComments || []).length;
        pcursor2 = j.pcursor;
        if (!pcursor2 || pcursor2 === "no_more" || loaded >= (c.subCommentCount || 0)) more.remove();
        else more.textContent = "继续展开（剩 " + ((c.subCommentCount || 0) - loaded) + " 条）";
      }, function() {
        more._busy = false;
        more.textContent = "展开失败，点击重试";
      });
    });
    body.appendChild(more);
  }
  function renderComments(list, append, subMap, hot) {
    if (!commentDrawer) return;
    if (!append) commentDrawer.list.innerHTML = "";
    commentDrawer.title.textContent = "评论 " + fmt(commentState.count);
    if (!list.length && !append) {
      var empty = el("div", "acsv-drawer-tip", "还没有评论，去原页抢沙发 →");
      var a = el("a", "acsv-cmore");
      a.href = commentState.shareUrl;
      a.target = "_blank";
      a.textContent = "前往原页";
      empty.appendChild(document.createElement("br"));
      empty.appendChild(a);
      commentDrawer.list.appendChild(empty);
      return;
    }
    var seen = {};
    function push(c) {
      if (seen[c.commentId]) return;
      seen[c.commentId] = 1;
      commentDrawer.list.appendChild(commentItem(c, subMap, commentState.meowId));
    }
    if (!append && hot && hot.length) {
      commentDrawer.list.appendChild(el("div", "acsv-hot-head", "热门评论"));
      hot.forEach(push);
      commentDrawer.list.appendChild(el("div", "acsv-hot-divider", "最新评论"));
    }
    list.forEach(push);
    if (commentState.page < commentState.totalPage && commentState.pcursor !== "no_more") {
      var more = el("button", "acsv-drawer-more", "加载更多评论");
      more.addEventListener("click", function() {
        more.remove();
        loadComments(commentState.meowId, commentState.page + 1, true);
      });
      commentDrawer.list.appendChild(more);
    }
  }
  function renderCommentTip(text) {
    if (!commentDrawer) return;
    commentDrawer.list.innerHTML = "";
    commentDrawer.list.appendChild(el("div", "acsv-drawer-tip", text));
  }
  var inputBar = null;
  function setReply(target) {
    commentState.replyTo = target || null;
    if (!inputBar) return;
    var chip = inputBar.querySelector(".acsv-creply");
    var inp = inputBar.querySelector(".acsv-cinput-text");
    if (commentState.replyTo) {
      chip.style.display = "inline-flex";
      chip.textContent = "回复 @" + commentState.replyTo.name + " ✕";
      inp.placeholder = "回复 @" + commentState.replyTo.name + "…";
    } else {
      chip.style.display = "none";
      inp.placeholder = "评论一时爽，一直评论一直爽。";
    }
  }
  function sendCurrent() {
    var inp = inputBar.querySelector(".acsv-cinput-text");
    var send = inputBar.querySelector(".acsv-cinput-send");
    var text = (inp.value || "").trim();
    if (!text || inputBar._busy) return;
    inputBar._busy = true;
    send.textContent = "发送中…";
    var replyTo = commentState.replyTo;
    AppAPI.postComment(commentState.meowId, commentState.stype, text, replyTo ? replyTo.id : 0).then(function(r) {
      inputBar._busy = false;
      send.textContent = "发送";
      if (!r || !r.ok) {
        toast("发送失败" + (r && r.msg ? "：" + r.msg : "（未登录？）"));
        return;
      }
      toast(replyTo ? "回复成功" : "评论成功");
      inp.value = "";
      if (inputBar._fit) inputBar._fit();
      setReply(null);
      loadComments(commentState.meowId, 1, false);
    });
  }
  function ensureCommentInput() {
    if (inputBar && inputBar.isConnected) return inputBar;
    inputBar = el("div", "acsv-cinput");
    var chip = el("button", "acsv-creply");
    chip.style.display = "none";
    chip.title = "取消回复";
    chip.addEventListener("click", function(ev) {
      ev.stopPropagation();
      setReply(null);
    });
    var emotBtn = el("button", "acsv-cinput-emot", ICONS.smiley);
    emotBtn.title = "表情";
    var imgBtn = el("button", "acsv-cinput-img", ICONS.image);
    imgBtn.title = "插入图片";
    var fileInp = el("input");
    fileInp.type = "file";
    fileInp.accept = "image/*";
    fileInp.style.display = "none";
    imgBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      fileInp.click();
    });
    fileInp.addEventListener("change", function() {
      var f = fileInp.files && fileInp.files[0];
      fileInp.value = "";
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        toast("图片不能超过 10MB");
        return;
      }
      imgBtn.textContent = "上传中";
      AppAPI.uploadImage(f).then(function(url) {
        imgBtn.innerHTML = ICONS.image;
        if (!url) {
          toast("图片上传失败（需登录）");
          return;
        }
        toast("图片上传成功");
        var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
        var code = "[img=图片]" + url + "[/img]";
        inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
        inp.focus();
      });
    });
    var inp = el("textarea", "acsv-cinput-text");
    inp.rows = 1;
    inp.maxLength = 233;
    inp.placeholder = "评论一时爽，一直评论一直爽。(˶‾᷄ ⁻̫ ‾᷅˵)";
    var send = el("button", "acsv-cinput-send", "发送");
    var panel = el("div", "acsv-emotpanel");
    inputBar.appendChild(chip);
    inputBar.appendChild(emotBtn);
    inputBar.appendChild(imgBtn);
    inputBar.appendChild(fileInp);
    inputBar.appendChild(inp);
    inputBar.appendChild(send);
    inputBar.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    commentDrawer.el.appendChild(panel);
    commentDrawer.el.appendChild(inputBar);
    function fitHeight() {
      inp.style.height = "auto";
      inp.style.height = Math.min(Math.max(inp.scrollHeight, 36), 96) + "px";
    }
    inp.addEventListener("input", fitHeight);
    commentDrawer.list.addEventListener("scroll", function() {
      var l = commentDrawer.list;
      if (commentState.loading || commentState.page >= commentState.totalPage || commentState.pcursor === "no_more") return;
      if (l.scrollTop + l.clientHeight >= l.scrollHeight - 80) {
        loadComments(commentState.meowId, commentState.page + 1, true);
      }
    }, { passive: true });
    var panelBuilt = false;
    emotBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var show = panel.style.display !== "flex";
      panel.style.display = show ? "flex" : "none";
      if (show && !panelBuilt) {
        panelBuilt = true;
        panel.appendChild(el("div", "acsv-drawer-tip", "表情加载中…"));
        ensureEmotionMap().then(function() {
          renderPanel();
        });
      } else if (show) {
        renderPanel();
      }
    });
    function emotReadRecent() {
      try {
        var ids = JSON.parse(localStorage.getItem("acsv_emot_recent_v1") || "[]");
        if (Array.isArray(ids)) return ids.map(String).filter(Boolean).slice(0, 12);
      } catch (e) {
      }
      return [];
    }
    function emotPick(id) {
      var ids = emotReadRecent().filter(function(x) {
        return x !== String(id);
      });
      ids.unshift(String(id));
      try {
        localStorage.setItem("acsv_emot_recent_v1", JSON.stringify(ids.slice(0, 12)));
      } catch (e) {
      }
    }
    function emotFind(id) {
      var packs = EmotionMap.packs || [];
      for (var i = 0; i < packs.length; i++) {
        for (var k = 0; k < packs[i].items.length; k++) {
          if (String(packs[i].items[k].id) === String(id)) return packs[i].items[k];
        }
      }
      return null;
    }
    function insertAtCursor(code) {
      var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
      inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
      inp.focus();
      try {
        inp.setSelectionRange(pos + code.length, pos + code.length);
      } catch (e) {
      }
    }
    function renderPanel() {
      panel.innerHTML = "";
      var packs = EmotionMap.packs || [];
      if (!packs.length) {
        panel.appendChild(el("div", "acsv-drawer-tip", "表情加载失败（需登录）"));
        return;
      }
      function addEmot(grid, it) {
        var b = el("button", "acsv-emot-item");
        b.title = it.name || "[emot=acfun," + it.id + "/]";
        var img = el("img");
        img.src = it.url;
        img.referrerPolicy = "no-referrer";
        img.alt = "";
        img.loading = "lazy";
        b.appendChild(img);
        b.addEventListener("click", function(ev2) {
          ev2.stopPropagation();
          insertAtCursor("[emot=acfun," + it.id + "/]");
          emotPick(it.id);
        });
        grid.appendChild(b);
      }
      function gridOf(items) {
        var grid = el("div", "acsv-emot-grid");
        items.forEach(function(it) {
          addEmot(grid, it);
        });
        return grid;
      }
      var recent = emotReadRecent().map(emotFind).filter(Boolean);
      var tabNames = [];
      if (recent.length) tabNames.push("最近使用");
      packs.forEach(function(p) {
        tabNames.push(p.name);
      });
      var tab = panel._tab && tabNames.indexOf(panel._tab) !== -1 ? panel._tab : tabNames[0];
      var body = el("div", "acsv-emot-body");
      body.appendChild(el("div", "acsv-emot-head", tab));
      if (tab === "最近使用") body.appendChild(gridOf(recent));
      else packs.forEach(function(p) {
        if (p.name === tab) body.appendChild(gridOf(p.items));
      });
      panel.appendChild(body);
      var foot = el("div", "acsv-emot-foot");
      var strip = el("div", "acsv-emot-strip");
      function thumb(tabName, imgUrl) {
        var tb = el("button", "acsv-emot-thumb" + (tab === tabName ? " on" : ""));
        tb.title = tabName;
        var ti = el("img");
        ti.src = imgUrl;
        ti.referrerPolicy = "no-referrer";
        ti.alt = "";
        tb.appendChild(ti);
        tb.addEventListener("click", function(ev2) {
          ev2.stopPropagation();
          panel._tab = tabName;
          renderPanel();
        });
        strip.appendChild(tb);
      }
      if (recent.length) thumb("最近使用", recent[0].url);
      packs.forEach(function(p) {
        thumb(p.name, p.items[0].url);
      });
      var prev = el("button", "acsv-emot-page", "‹");
      var next = el("button", "acsv-emot-page", "›");
      prev.addEventListener("click", function(ev2) {
        ev2.stopPropagation();
        strip.scrollBy({ left: -120, behavior: "smooth" });
      });
      next.addEventListener("click", function(ev2) {
        ev2.stopPropagation();
        strip.scrollBy({ left: 120, behavior: "smooth" });
      });
      foot.appendChild(prev);
      foot.appendChild(strip);
      foot.appendChild(next);
      panel.appendChild(foot);
    }
    inp.addEventListener("keydown", function(ev) {
      ev.stopPropagation();
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        sendCurrent();
      } else if (ev.key === "Escape") {
        ev.stopPropagation();
        inp.blur();
      }
    });
    send.addEventListener("click", function(ev) {
      ev.stopPropagation();
      sendCurrent();
    });
    return inputBar;
  }
  function mockComments() {
    return {
      commentCount: 2,
      curPage: 1,
      totalPage: 1,
      pcursor: "no_more",
      rootComments: [
        { commentId: "m1", userId: 123, userName: "香蕉君", headUrl: "", content: "这条视频太棒了（示例评论，仅本地预览显示）", postDate: "2026-09-01", likeCount: 233, isUp: false, subCommentCount: 1 },
        { commentId: "m2", userId: 456, userName: "UP主本人", headUrl: "", content: "感谢收看！", postDate: "2026-09-02", likeCount: 66, isUp: true, subCommentCount: 0 }
      ],
      subCommentsMap: { m1: [{ commentId: "m1-1", userId: 789, userName: "路人甲", headUrl: "", content: "前排！", postDate: "2026-09-01", likeCount: 3, subCommentCount: 0 }] }
    };
  }

  // src/interact.js
  function callInteract(st, item, add) {
    return fetch(CFG.api.interact + (add ? "add" : "delete"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "objectId=" + item.id + "&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP&acfun.midground.api_st=" + encodeURIComponent(st)
    }).then(function(r) {
      return r.json();
    }).then(function(j) {
      return !!(j && j.result === 1);
    });
  }
  function setRealLike(item, on) {
    return ensureApiSt().then(function(st) {
      return callInteract(st, item, on);
    }, function() {
      return false;
    }).then(function(ok) {
      if (ok) return true;
      return ensureApiSt(true).then(function(st2) {
        return callInteract(st2, item, on);
      }).catch(function() {
        return false;
      });
    });
  }
  function setRealFollow(item, on) {
    return fetch(CFG.api.follow, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "toUserId=" + item.userId + "&action=" + (on ? 1 : 2) + "&groupId="
    }).then(function(r) {
      return r.json();
    }).then(function(j) {
      return !!(j && j.result === 0);
    }).catch(function() {
      return false;
    });
  }
  function setRealFavorite(item, on) {
    return AppAPI.setFavorite(item.id, on);
  }
  function giveBanana(item, count) {
    return AppAPI.throwBanana(item.id, count);
  }

  // src/hls.js
  var loading = null;
  function nativeHls(video) {
    try {
      return !!video.canPlayType("application/vnd.apple.mpegurl");
    } catch (e) {
      return false;
    }
  }
  function ensureHls() {
    if (window.Hls && window.Hls.isSupported) return Promise.resolve(window.Hls);
    if (loading) return loading;
    loading = new Promise(function(resolve, reject) {
      function ok() {
        if (window.Hls && window.Hls.isSupported) resolve(window.Hls);
        else reject(new Error("hls-load-failed"));
      }
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method: "GET",
          url: CFG.api.hlsCdn,
          timeout: 2e4,
          onload: function(r) {
            try {
              new Function(r.responseText)();
              ok();
            } catch (e) {
              reject(e);
            }
          },
          onerror: function() {
            reject(new Error("hls-network"));
          },
          ontimeout: function() {
            reject(new Error("hls-timeout"));
          }
        });
      } else {
        var s = document.createElement("script");
        s.src = CFG.api.hlsCdn;
        s.onload = ok;
        s.onerror = function() {
          reject(new Error("hls-network"));
        };
        (document.head || document.documentElement).appendChild(s);
      }
    }).catch(function(e) {
      loading = null;
      throw e;
    });
    return loading;
  }

  // src/dmcanvas.js
  function createLayer(slide, video) {
    var canvas = document.createElement("canvas");
    canvas.className = "acsv-dmcanvas";
    var ctx = canvas.getContext("2d");
    slide.insertBefore(canvas, slide.querySelector(".acsv-side"));
    var items = [];
    var raf = 0, running = false, lastAlign = 0;
    var cssW = 0, cssH = 0, dpr = 1;
    var laneH = 30, lastW = 0;
    var vfc = !!video.requestVideoFrameCallback;
    function align() {
      var vr = video.getBoundingClientRect();
      var sr = slide.getBoundingClientRect();
      var scale = sr.width && slide.offsetWidth ? sr.width / slide.offsetWidth : 1;
      var x = vr.left - sr.left, y = vr.top - sr.top;
      var w = vr.width, h = vr.height;
      var vw = video.videoWidth, vh = video.videoHeight;
      if (vw && vh && w > 8 && h > 8) {
        var s = Math.min(w / vw, h / vh);
        var pw = vw * s, ph = vh * s;
        x += (w - pw) / 2;
        y += (h - ph) / 2;
        w = pw;
        h = ph;
      }
      x /= scale;
      y /= scale;
      w /= scale;
      h /= scale;
      cssW = Math.round(w);
      cssH = Math.round(h);
      canvas.style.left = Math.round(x) + "px";
      canvas.style.top = Math.round(y) + "px";
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      dpr = window.devicePixelRatio || 1;
      var pw = Math.round(cssW * scale * dpr), ph = Math.round(cssH * scale * dpr);
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    }
    function fontPxOf(size) {
      return Math.max(12, Math.min(80, Math.round(size * cssH / 810)));
    }
    function measure(it) {
      it._px = fontPxOf(it.size);
      ctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
      it._w = Math.max(8, ctx.measureText(it.text).width);
    }
    function assignLanes() {
      if (cssW < 10 || cssH < 10 || !items.length) return;
      var i, it;
      var maxPx = 0;
      for (i = 0; i < items.length; i++) {
        measure(items[i]);
        if (items[i]._px > maxPx) maxPx = items[i]._px;
        items[i]._dur = items[i].mode === 1 ? (cssW + items[i]._w) / cssW * CFG.danmaku.scrollSec * 1e3 : CFG.danmaku.staySec * 1e3;
      }
      laneH = Math.max(28, Math.round(maxPx * 1.4));
      var scrollLanes = Math.max(1, Math.floor(cssH * 0.72 / laneH));
      var sideLanes = Math.max(1, Math.floor(cssH * 0.6 / laneH));
      var busy = {};
      items.sort(function(a, b) {
        return a.at - b.at;
      });
      for (i = 0; i < items.length; i++) {
        it = items[i];
        var mode = it.mode === 4 || it.mode === 5 ? it.mode : 1;
        it.mode = mode;
        var arr = busy[mode] || (busy[mode] = []);
        var limit = mode === 1 ? scrollLanes : sideLanes;
        var pick = -1, minAt = Infinity, minIdx = 0;
        for (var l = 0; l < limit; l++) {
          var freeAt = arr[l] || 0;
          if (freeAt <= it.at) {
            pick = l;
            break;
          }
          if (freeAt < minAt) {
            minAt = freeAt;
            minIdx = l;
          }
        }
        if (pick < 0) pick = minIdx;
        it._lane = pick;
        if (mode === 1) {
          var speed = (cssW + it._w) / it._dur;
          arr[pick] = it.at + it._w / speed;
        } else {
          arr[pick] = it.at + it._dur;
        }
      }
      lastW = cssW;
    }
    function paint() {
      var now = Date.now();
      if (now - lastAlign > 250) {
        lastAlign = now;
        align();
        if (Math.abs(cssW - lastW) > 60) assignLanes();
      }
      ctx.clearRect(0, 0, cssW, cssH);
      if (items.length && cssW >= 10) {
        var t = video.currentTime * 1e3;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (t < it.at || t > it.at + it._dur) continue;
          var p = (t - it.at) / it._dur;
          var x, y;
          if (it.mode === 5) {
            x = cssW / 2;
            y = laneH * (it._lane + 0.9);
          } else if (it.mode === 4) {
            x = cssW / 2;
            y = cssH - laneH * (it._lane + 0.5);
          } else {
            x = cssW + it._w / 2 - p * (cssW + it._w);
            y = laneH * (it._lane + 1);
          }
          if (x < -it._w / 2 || x > cssW + it._w / 2) continue;
          ctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(1, it._px / 12);
          ctx.strokeStyle = "rgba(0,0,0,.82)";
          ctx.strokeText(it.text, x, y);
          ctx.fillStyle = it.color;
          ctx.fillText(it.text, x, y);
        }
      }
    }
    function schedule() {
      if (!running) return;
      if (vfc) raf = video.requestVideoFrameCallback(frame);
      else raf = requestAnimationFrame(frame);
    }
    function frame() {
      if (!running) return;
      paint();
      schedule();
    }
    return {
      setItems: function(list) {
        items = (list || []).filter(function(m) {
          return m && m.text;
        });
        if (running) {
          assignLanes();
          if (video.paused) paint();
        }
      },
      // 发送成功后的本地回显
      addLocal: function(it) {
        items.push(it);
        if (running) {
          assignLanes();
          if (video.paused) paint();
        }
      },
      start: function() {
        if (running) return;
        running = true;
        lastAlign = 0;
        frame();
      },
      stop: function() {
        running = false;
        if (raf) {
          if (vfc) {
            try {
              video.cancelVideoFrameCallback(raf);
            } catch (e) {
            }
          } else cancelAnimationFrame(raf);
          raf = 0;
        }
        try {
          ctx.clearRect(0, 0, cssW, cssH);
        } catch (e) {
        }
      },
      destroy: function() {
        this.stop();
        if (canvas.parentNode) canvas.remove();
      }
    };
  }
  var layers = [];
  var DmCanvas = {
    create: function(slide, video) {
      var layer = createLayer(slide, video);
      layers.push(layer);
      return layer;
    },
    stopAll: function() {
      layers.forEach(function(l) {
        try {
          l.stop();
        } catch (e) {
        }
      });
      layers = [];
    }
  };

  // src/danmaku.js
  var cache = {};
  var enabled = true;
  try {
    enabled = localStorage.getItem(CFG.lsDm) !== "0";
  } catch (e) {
  }
  function dmEnabled() {
    return enabled;
  }
  function setDmEnabled(on) {
    enabled = !!on;
    try {
      localStorage.setItem(CFG.lsDm, on ? "1" : "0");
    } catch (e) {
    }
  }
  function fetchList(videoId) {
    if (!cache[videoId]) {
      cache[videoId] = AppAPI.danmakuList(videoId).then(null, function() {
        return [];
      });
    }
    return cache[videoId];
  }
  function onPlaying(slide, item, video) {
    if (!slide || !item || item.kind !== "home" || !item.videoId) return;
    if (!slide._dmLayer) slide._dmLayer = DmCanvas.create(slide, video);
    var layer = slide._dmLayer;
    if (!enabled) {
      layer.stop();
      return;
    }
    layer.start();
    fetchList(item.videoId).then(function(list) {
      layer.setItems(list);
    });
  }
  function stopAll() {
    DmCanvas.stopAll();
  }
  function createDmBox(item, videoOf) {
    var box = el("div", "acsv-dmbox");
    var input = el("input", "acsv-dm-input");
    input.type = "text";
    input.maxLength = 100;
    input.placeholder = "发个弹幕呗，嗷嗷";
    var send = el("button", "acsv-dm-send", "发送");
    box.appendChild(input);
    box.appendChild(send);
    box.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    var sending = false;
    function doSend() {
      var video = videoOf();
      var text = (input.value || "").trim();
      if (!text || !item.videoId || sending || !video) return;
      sending = true;
      var at = video.currentTime * 1e3 + 200;
      AppAPI.danmakuAdd(item, text, at).then(function(r) {
        sending = false;
        if (!r || !r.ok) {
          toast("弹幕发送失败" + (r && r.msg ? "：" + r.msg : "（未登录？）"));
          return;
        }
        toast("弹幕已发送");
        input.value = "";
        var slide = video.closest && video.closest(".acsv-slide");
        if (slide && slide._dmLayer) {
          slide._dmLayer.addLocal({ text, at, mode: 1, color: "#ffffff", size: 25 });
        }
      });
    }
    input.addEventListener("keydown", function(ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") doSend();
      else if (ev.key === "Escape") {
        ev.stopPropagation();
        input.blur();
      }
    });
    send.addEventListener("click", function(ev) {
      ev.stopPropagation();
      doSend();
    });
    return box;
  }

  // src/player.js
  var io = null;
  var keyHandler = null;
  var keyUpHandler = null;
  var fsChangeHandler = null;
  var ghostIv = null;
  var visResumeHandler = null;
  var soundOn = false;
  var firstGestureSeen = false;
  var autoplayNext = false;
  var playRate = 1;
  var seekHold = { active: false, timer: null, prevRate: 1 };
  var logoLabel = null;
  var segSv = null;
  var segHome = null;
  function currentVideo() {
    return scroller && scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"] video');
  }
  function showControls(slide) {
    slide.dataset.ctl = "1";
    clearTimeout(slide._ctlTimer);
    slide._ctlTimer = setTimeout(function() {
      var v = slide.querySelector("video");
      if (v && !v.paused) slide.dataset.ctl = "";
    }, CFG.time.ctlIdle);
  }
  function buildControls(slide, idx, item) {
    var box = el("div", "acsv-controls");
    var track = el("div", "acsv-track");
    var fill = el("div", "acsv-track-fill");
    var handle = el("div", "acsv-track-handle");
    var bubble = el("div", "acsv-bubble");
    track.appendChild(fill);
    track.appendChild(handle);
    track.appendChild(bubble);
    var dragging = false;
    function videoOf() {
      return slide.querySelector("video");
    }
    function ratioAt(ev) {
      var r = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    }
    function preview(ratio, live) {
      if (live) {
        fill.style.width = ratio * 100 + "%";
        handle.style.left = ratio * 100 + "%";
      }
      var v = videoOf();
      if (v && v.duration) bubble.textContent = fmtTime(ratio * v.duration);
      bubble.style.left = ratio * 100 + "%";
      bubble.classList.add("show");
    }
    track.addEventListener("pointerdown", function(ev) {
      dragging = true;
      track.dataset.drag = "1";
      try {
        track.setPointerCapture(ev.pointerId);
      } catch (e) {
      }
      preview(ratioAt(ev), true);
      ev.preventDefault();
    });
    track.addEventListener("pointermove", function(ev) {
      preview(ratioAt(ev), dragging);
    });
    track.addEventListener("pointerleave", function() {
      if (!dragging) bubble.classList.remove("show");
    });
    track.addEventListener("pointerup", function(ev) {
      if (!dragging) return;
      dragging = false;
      track.dataset.drag = "";
      var v = videoOf();
      var ratio = ratioAt(ev);
      if (v && v.duration) v.currentTime = ratio * v.duration;
      bubble.classList.remove("show");
      showControls(slide);
    });
    track.addEventListener("pointercancel", function() {
      dragging = false;
      track.dataset.drag = "";
      bubble.classList.remove("show");
    });
    var row = el("div", "acsv-ctl-row");
    var playBtn = el("button", "acsv-cbtn acsv-cplay", ICONS.pause);
    playBtn.title = "播放/暂停（空格）";
    playBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var v = videoOf();
      if (!v) return;
      if (!firstGestureSeen && !soundOn) {
        firstGestureSeen = true;
        enableSound(v);
        hideSoundHint();
        return;
      }
      firstGestureSeen = true;
      if (v.paused) playVideo(v);
      else {
        v.pause();
        var ps = v.closest(".acsv-slide");
        if (ps) ps._userPaused = true;
        sweepVideos();
      }
    });
    var timeLabel = el("span", "acsv-time", "00:00 / 00:00");
    var spacer = el("span");
    spacer.style.flex = "1";
    var autoBtn = el("button", "acsv-cbtn acsv-cauto", '<span class="acsv-dot"></span>连播');
    autoBtn.title = "播完自动播放下一条（关闭则单条循环）";
    autoBtn.classList.toggle("on", autoplayNext);
    autoBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      autoplayNext = !autoplayNext;
      autoBtn.classList.toggle("on", autoplayNext);
      if (scroller) {
        var vs = scroller.querySelectorAll("video");
        Array.prototype.forEach.call(vs, function(v) {
          v.loop = !autoplayNext;
        });
      }
      toast(autoplayNext ? "连播已开启：播完自动下一条" : "连播已关闭：单条循环播放");
    });
    var rateBtn = el("button", "acsv-cbtn acsv-crate", "倍速 " + playRate.toFixed(1) + "x");
    rateBtn.title = "切换播放速度";
    rateBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var rates = [0.5, 1, 1.5, 2];
      var i = rates.indexOf(playRate);
      playRate = rates[(i + 1) % rates.length];
      rateBtn.textContent = "倍速 " + playRate.toFixed(1) + "x";
      if (scroller) {
        var vs = scroller.querySelectorAll("video");
        Array.prototype.forEach.call(vs, function(v) {
          v.playbackRate = playRate;
        });
      }
      toast("播放速度：" + playRate + "x");
    });
    var muteBtn = el("button", "acsv-cbtn acsv-cmute", soundOn ? ICONS.volOn : ICONS.volOff);
    muteBtn.title = "静音开关（M）";
    muteBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var v = videoOf();
      if (!firstGestureSeen) firstGestureSeen = true;
      toggleSound(v);
      if (v && soundOn) playVideo(v);
      hideSoundHint();
    });
    var fsBtn = el("button", "acsv-cbtn acsv-cfs", ICONS.fs);
    fsBtn.title = "全屏（F）";
    fsBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root && root.requestFullscreen) root.requestFullscreen();
    });
    var dmBtn = null, dmBox = null, qWrap = null, qBtn = null, qMenu = null;
    if (item && item.kind === "home") {
      dmBtn = el("button", "acsv-cbtn acsv-cdm" + (dmEnabled() ? " on" : ""), "弹");
      dmBtn.title = "弹幕开关";
      dmBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        setDmEnabled(!dmEnabled());
        dmBtn.classList.toggle("on", dmEnabled());
        var v = videoOf();
        var sl = v && v.closest(".acsv-slide");
        if (dmEnabled() && sl) onPlaying(sl, item, v);
        else if (sl && sl._dmLayer) sl._dmLayer.stop();
        toast(dmEnabled() ? "弹幕已开启" : "弹幕已关闭");
      });
      dmBox = createDmBox(item, videoOf);
      qWrap = el("span", "acsv-qwrap");
      qBtn = el("button", "acsv-cbtn acsv-cq", item.qualities ? item.qualities[item.qIdx].label : "自动");
      qBtn.title = "清晰度";
      qMenu = el("div", "acsv-qmenu");
      qBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (!item.qualities) {
          toast("清晰度列表还没拿到，稍等");
          return;
        }
        if (qMenu.parentNode === qWrap) {
          qMenu.remove();
          return;
        }
        qMenu.innerHTML = "";
        item.qualities.forEach(function(q2, i) {
          var qi = el("button", "acsv-qitem" + (i === item.qIdx ? " on" : ""), q2.label);
          qi.addEventListener("click", function(ev2) {
            ev2.stopPropagation();
            qMenu.remove();
            if (i !== item.qIdx) switchQuality(item, slide, i, true);
          });
          qMenu.appendChild(qi);
        });
        qWrap.appendChild(qMenu);
      });
      slide._qBtn = qBtn;
      qWrap.appendChild(qBtn);
    }
    row.appendChild(playBtn);
    row.appendChild(timeLabel);
    row.appendChild(spacer);
    if (dmBtn) row.appendChild(dmBtn);
    if (dmBox) row.appendChild(dmBox);
    if (qWrap) row.appendChild(qWrap);
    row.appendChild(autoBtn);
    row.appendChild(rateBtn);
    row.appendChild(muteBtn);
    row.appendChild(fsBtn);
    box.appendChild(track);
    box.appendChild(row);
    box.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    box.addEventListener("mousemove", function() {
      showControls(slide);
    });
    slide._ctlTime = timeLabel;
    slide._ctlPlayBtn = playBtn;
    slide._ctlFill = fill;
    slide._ctlHandle = handle;
    return box;
  }
  function updateArrows() {
    if (!root) return;
    var ups = root.querySelectorAll(".acsv-arrow-up");
    Array.prototype.forEach.call(ups, function(up) {
      up.style.display = FeedStore.current <= 0 ? "none" : "grid";
      up.disabled = FeedStore.current <= 0;
    });
  }
  function refreshMuteIcons() {
    if (!root) return;
    var bs = root.querySelectorAll(".acsv-cmute");
    Array.prototype.forEach.call(bs, function(b) {
      b.innerHTML = soundOn ? ICONS.volOn : ICONS.volOff;
    });
  }
  function buildSlide(item, idx) {
    var slide = el("section", "acsv-slide");
    slide.dataset.idx = idx;
    slide.dataset.state = "loading";
    if (item.cover) {
      var amb = el("div", "acsv-ambient");
      amb.style.backgroundImage = 'url("' + item.cover + '")';
      slide.appendChild(amb);
    }
    var spinner = el("div", "acsv-spinner");
    var playicon = el("div", "acsv-playicon", ICONS.play);
    var errbox = el("div", "acsv-errbox");
    errbox.appendChild(el("p", null, "视频加载失败"));
    var retry = el("button", "acsv-retry", "重试");
    retry.addEventListener("click", function(ev) {
      ev.stopPropagation();
      item.urlIdx = 0;
      item.refreshed = false;
      if (item.kind === "home") item.urls = [];
      attachVideo(slide, item, idx);
    });
    errbox.appendChild(retry);
    slide.appendChild(spinner);
    slide.appendChild(playicon);
    slide.appendChild(errbox);
    slide.appendChild(buildControls(slide, idx, item));
    var rail = el("div", "acsv-rail");
    if (item.head) {
      var avWrap = el("div", "acsv-avwrap");
      var a = el("a");
      a.href = item.userId ? CFG.api.userBase + item.userId : item.shareUrl;
      a.target = "_blank";
      var av = el("img", "acsv-avatar");
      av.referrerPolicy = "no-referrer";
      av.src = item.head.split("?")[0];
      av.title = item.userName;
      a.appendChild(av);
      avWrap.appendChild(a);
      if (item.userId) {
        var fb = el("div", "acsv-followbtn" + (item.isFollowing ? " on" : ""), item.isFollowing ? "✓" : "+");
        fb.title = item.isFollowing ? "点击取消关注" : "关注 UP 主";
        fb.addEventListener("click", function(ev) {
          ev.stopPropagation();
          if (item.followBusy) return;
          var turnOn = !item.isFollowing;
          item.followBusy = true;
          fb.textContent = "…";
          setRealFollow(item, turnOn).then(function(ok) {
            item.followBusy = false;
            if (ok) {
              item.isFollowing = turnOn;
              fb.textContent = turnOn ? "✓" : "+";
              fb.classList.toggle("on", turnOn);
              fb.title = turnOn ? "点击取消关注" : "关注 UP 主";
              toast(turnOn ? "已关注 @" + item.userName : "已取消关注 @" + item.userName);
            } else {
              fb.textContent = item.isFollowing ? "✓" : "+";
              toast("关注失败（未登录？）");
            }
          });
        });
        avWrap.appendChild(fb);
      }
      rail.appendChild(avWrap);
      slide._followSync = function() {
        if (!item.userId) return;
        fb.textContent = item.isFollowing ? "✓" : "+";
        fb.classList.toggle("on", item.isFollowing);
        fb.title = item.isFollowing ? "点击取消关注" : "关注 UP 主";
      };
    }
    function railBtn(icon, count, title, onclick) {
      var wrap = el("div");
      wrap.style.marginBottom = "25px";
      var b = el("button", "acsv-rail-btn");
      b.title = title;
      var imgEl = null, imgOn = null, imgOff = null;
      if (icon && icon.img) {
        imgEl = el("img", "acsv-icon-img");
        imgEl.alt = "";
        imgOff = icon.img;
        imgOn = icon.imgOn || null;
        imgEl.addEventListener("error", function() {
          b.innerHTML = icon.svg || "";
        });
        imgEl.src = icon.img;
        b.appendChild(imgEl);
      } else {
        b.innerHTML = icon;
      }
      b.addEventListener("click", function(ev) {
        ev.stopPropagation();
        onclick(b);
      });
      var c = el("div", "acsv-count", count);
      wrap.appendChild(b);
      wrap.appendChild(c);
      rail.appendChild(wrap);
      return { btn: b, count: c, imgEl, imgOn, imgOff };
    }
    function railImgState(ui, on) {
      if (ui && ui.imgEl && ui.imgOn) ui.imgEl.src = on ? ui.imgOn : ui.imgOff;
    }
    var likeIcon = item.kind === "home" ? { img: VIDEO_ICONS.like, imgOn: VIDEO_ICONS.likeOn, svg: ICONS.heart } : { img: SITE_ICONS.heart, svg: ICONS.heart };
    var likeUI = railBtn(likeIcon, fmt(item.like), "点赞", function(b) {
      if (item.likeBusy) return;
      var turnOn = !item.localLike;
      item.localLike = turnOn;
      item.like += turnOn ? 1 : -1;
      likeUI.count.textContent = fmt(item.like);
      b.classList.toggle("on", turnOn);
      railImgState(likeUI, turnOn);
      b.classList.remove("bump");
      void b.offsetWidth;
      b.classList.add("bump");
      item.likeBusy = true;
      setRealLike(item, turnOn).then(function(ok) {
        item.likeBusy = false;
        if (ok) {
          item.liked = turnOn;
          toast(turnOn ? "已点赞" : "已取消点赞");
        } else {
          item.localLike = !turnOn;
          item.like += turnOn ? -1 : 1;
          likeUI.count.textContent = fmt(item.like);
          toast("点赞失败（未登录？）");
        }
        likeUI.btn.classList.toggle("on", item.liked || item.localLike);
        railImgState(likeUI, item.liked || item.localLike);
      });
    });
    likeUI.btn.classList.toggle("on", item.liked || item.localLike);
    slide._likeSync = function() {
      var on = item.liked || item.localLike;
      likeUI.btn.classList.toggle("on", on);
      railImgState(likeUI, on);
      likeUI.count.textContent = fmt(item.like);
    };
    var cmtUI = railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), "展开/收起评论（C）", function() {
      if (isOpenComments() && commentState.meowId === item.id) closeComments();
      else openComments(item.id, item.stype, item.shareUrl, item.kind);
    });
    slide._cmtSync = function() {
      cmtUI.count.textContent = fmt(item.comment);
    };
    if (item.kind === "home") {
      var banUI = railBtn({ img: VIDEO_ICONS.banana, imgOn: VIDEO_ICONS.bananaOn, svg: ICONS.banana }, fmt(item.banana), "投蕉", function(b) {
        if (item.thrown) {
          toast("已投过蕉啦，明天再来~");
          return;
        }
        toggleBanPop(slide, b, item);
      });
      slide._banSync = function() {
        banUI.count.textContent = fmt(item.banana);
        railImgState(banUI, item.thrown);
        banUI.btn.classList.toggle("thrown", item.thrown);
        banUI.btn.title = item.thrown ? "今日已投过蕉啦" : "投蕉";
      };
      var favUI = railBtn({ img: VIDEO_ICONS.favorite, imgOn: VIDEO_ICONS.favoriteOn, svg: ICONS.star }, fmt(item.fav), "收藏", function(b) {
        if (item.favBusy) return;
        var turnOn = !item.favorited;
        item.favBusy = true;
        b.classList.remove("bump");
        void b.offsetWidth;
        b.classList.add("bump");
        setRealFavorite(item, turnOn).then(function(ok) {
          item.favBusy = false;
          if (ok) {
            item.favorited = turnOn;
            toast(turnOn ? "已加入收藏" : "已取消收藏");
          } else {
            toast("收藏失败（未登录？）");
          }
          b.classList.toggle("on", item.favorited);
          railImgState(favUI, item.favorited);
        });
      });
      favUI.btn.classList.toggle("on", item.favorited);
      slide._favSync = function() {
        favUI.count.textContent = fmt(item.fav);
        favUI.btn.classList.toggle("on", item.favorited);
        railImgState(favUI, item.favorited);
      };
    }
    var shareUI = item.kind === "home" ? railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, fmt(item.share), "复制分享链接", function() {
      copyText(item.shareUrl).then(function(ok) {
        toast(ok ? "已复制：" + item.shareUrl : "复制失败，请手动复制");
      });
    }) : railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, "分享", "复制分享链接", function() {
      copyText(item.shareUrl).then(function(ok) {
        toast(ok ? "已复制：" + item.shareUrl : "复制失败，请手动复制");
      });
    });
    if (item.kind === "home") slide._shareSync = function() {
      shareUI.count.textContent = fmt(item.share);
    };
    var side = el("div", "acsv-side");
    var arrows = el("div", "acsv-arrows");
    var upBtn = el("button", "acsv-arrow acsv-arrow-up", ICONS.chevUp);
    upBtn.title = "上一个（↑）";
    upBtn.addEventListener("click", function() {
      scrollToIndex(FeedStore.current - 1);
    });
    var downBtn = el("button", "acsv-arrow acsv-arrow-down", ICONS.chevDn);
    downBtn.title = "下一个（↓）";
    downBtn.addEventListener("click", function() {
      scrollToIndex(FeedStore.current + 1);
    });
    arrows.appendChild(upBtn);
    arrows.appendChild(downBtn);
    side.appendChild(arrows);
    side.appendChild(rail);
    slide.appendChild(side);
    var info = el("div", "acsv-info");
    var meta = el("div", "acsv-meta");
    var up = item.userId ? '<a href="https://www.acfun.cn/u/' + item.userId + '" target="_blank">@' + esc(item.userName) + "</a>" : "<span>@" + esc(item.userName) + "</span>";
    if (item.kind === "home") {
      meta.innerHTML = up + '<span class="acsv-date"></span>';
    } else {
      meta.innerHTML = up + "<span>" + esc(item.date || "") + '</span><span class="acsv-views">' + fmt(item.view) + "次播放</span>";
    }
    info.appendChild(meta);
    info.appendChild(el("p", "acsv-title", esc(item.title)));
    slide.appendChild(info);
    slide.addEventListener("mousemove", function() {
      showControls(slide);
    });
    slide.addEventListener("click", onSlideTap);
    slide.addEventListener("scroll", function() {
      if (slide.scrollLeft !== 0) slide.scrollLeft = 0;
    });
    return slide;
  }
  function onSlideTap(ev) {
    var slide = ev.currentTarget;
    var idx = Number(slide.dataset.idx);
    if (idx !== FeedStore.current) return;
    var video = slide.querySelector("video");
    if (!video) return;
    if (!firstGestureSeen && !soundOn) {
      firstGestureSeen = true;
      enableSound(video);
      hideSoundHint();
      return;
    }
    firstGestureSeen = true;
    if (video.paused) playVideo(video);
    else {
      video.pause();
      var ps = video.closest(".acsv-slide");
      if (ps) ps._userPaused = true;
      sweepVideos();
    }
  }
  function enableSound(video) {
    try {
      localStorage.setItem(CFG.lsSound, "1");
    } catch (e) {
    }
    soundOn = true;
    if (video) {
      video.muted = false;
      video.volume = 1;
      playVideo(video);
    }
    refreshMuteIcons();
  }
  function toggleSound(video) {
    if (soundOn) {
      soundOn = false;
      try {
        localStorage.setItem(CFG.lsSound, "");
      } catch (e) {
      }
      if (video) video.muted = true;
    } else {
      enableSound(video);
    }
    refreshMuteIcons();
  }
  function hideSoundHint() {
    var h = root && root.querySelector(".acsv-hint");
    if (h) h.classList.add("hide");
  }
  function sweepVideos() {
    if (!scroller) return;
    var cur = FeedStore.current;
    Array.prototype.forEach.call(scroller.querySelectorAll("video"), function(v) {
      var s = v.closest(".acsv-slide");
      if (!s || Number(s.dataset.idx) !== cur) {
        if (!v.paused) v.pause();
      }
    });
  }
  function playVideo(video) {
    var ps = video.closest && video.closest(".acsv-slide");
    if (ps) ps._userPaused = false;
    var p = video.play();
    if (p && p.catch) {
      p.catch(function() {
        var slide = video.closest(".acsv-slide");
        if (slide) slide.dataset.paused = "1";
      });
    }
  }
  function destroyHls(slide) {
    if (slide._hls) {
      try {
        slide._hls.destroy();
      } catch (e) {
      }
      slide._hls = null;
    }
  }
  function playCurrent(slide, video, item) {
    if (item.kind !== "home") {
      video.src = item.urls[item.urlIdx];
      return;
    }
    var url = item.urls[item.urlIdx];
    if (nativeHls(video)) {
      video.src = url;
      return;
    }
    ensureHls().then(function(Hls) {
      if (!slide.isConnected || slide.querySelector("video") !== video) return;
      if (!Hls || !Hls.isSupported()) {
        video.src = url;
        return;
      }
      destroyHls(slide);
      var hls = new Hls({
        enableWorker: true,
        // 转封装移入 Worker 线程，主线程只做解码渲染，降低卡帧概率
        maxBufferLength: 60,
        // 前向缓冲 60s：网络抖动/瞬时卡顿不易饿死
        maxBufferSize: 120,
        // 缓冲内存上限（MB）
        backBufferLength: 30,
        // 及时回收回看缓冲，降低内存压力
        nudgeMaxRetry: 10
        // 内部推帧重试次数提高
      });
      slide._hls = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        if (hls.levels && hls.levels.length > 1) hls.currentLevel = hls.levels.length - 1;
      });
      hls.on(Hls.Events.ERROR, function(_, data) {
        if (data && data.fatal) handlePlayError(slide, video, item, FeedStore.current);
      });
    }, function() {
      video.src = url;
    });
  }
  function handlePlayError(slide, video, item, idx) {
    if (!slide.isConnected || !video.isConnected) return;
    if (video.currentTime > 1) slide._resumeAt = video.currentTime;
    if (item.urlIdx < item.urls.length - 1) {
      item.urlIdx++;
      playCurrent(slide, video, item);
      video.load();
      return;
    }
    if (!item.refreshed) {
      item.refreshed = true;
      if (item.kind === "home") item.urls = [];
      FeedStore.refresh(item).then(function(ok) {
        if (ok && item.urls.length) {
          item.urlIdx = 0;
          playCurrent(slide, video, item);
          video.load();
          if (idx === FeedStore.current) playVideo(video);
        } else {
          slide.dataset.state = "error";
        }
      });
      return;
    }
    slide.dataset.state = "error";
  }
  function toggleBanPop(slide, btn, item) {
    var existing = slide.querySelector(".acsv-banpop");
    if (existing) {
      existing.remove();
      return;
    }
    var pop = el("div", "acsv-banpop");
    var opts = [];
    var build = function(n2) {
      var ob = el("button");
      ob.title = "投 " + n2 + " 根香蕉";
      var img = el("img");
      img.alt = "";
      img.src = VIDEO_ICONS.banana;
      img.addEventListener("error", function() {
        ob.textContent = n2;
      });
      ob.appendChild(img);
      ob._img = img;
      ob.addEventListener("mouseenter", function() {
        opts.forEach(function(o, i) {
          o._img.src = i < n2 ? VIDEO_ICONS.bananaOn : VIDEO_ICONS.banana;
        });
      });
      ob.addEventListener("click", function(ev) {
        ev.stopPropagation();
        pop.remove();
        if (item.banBusy) return;
        item.banBusy = true;
        giveBanana(item, n2).then(function(ok) {
          item.banBusy = false;
          if (ok) {
            item.banana += n2;
            item.thrown = true;
            if (slide._banSync) slide._banSync();
            toast("投出 " + n2 + " 根香蕉");
          } else {
            toast("投蕉失败（未登录或今日已投完？）");
          }
        });
      });
      opts.push(ob);
      pop.appendChild(ob);
    };
    for (var n = 1; n <= 5; n++) build(n);
    pop.addEventListener("mouseleave", function() {
      opts.forEach(function(o) {
        o._img.src = VIDEO_ICONS.banana;
      });
    });
    btn.parentNode.style.position = "relative";
    btn.parentNode.appendChild(pop);
    setTimeout(function() {
      document.addEventListener("click", function onDoc() {
        if (pop.parentNode) pop.remove();
        document.removeEventListener("click", onDoc);
      });
    }, 0);
  }
  function onHomeResolved(slide, item) {
    if (slide._likeSync) slide._likeSync();
    if (slide._favSync) slide._favSync();
    if (slide._banSync) slide._banSync();
    if (slide._cmtSync) slide._cmtSync();
    if (slide._shareSync) slide._shareSync();
    if (slide._followSync) slide._followSync();
    if (slide._qBtn) slide._qBtn.textContent = item.qualities ? item.qualities[item.qIdx].label : "自动";
    var ds = slide.querySelector(".acsv-meta .acsv-date");
    if (ds) ds.textContent = item.date || "";
  }
  function switchQuality(item, slide, qIdx, manual) {
    var video = slide.querySelector("video");
    if (!video || !item.qualities || !item.qualities[qIdx]) return;
    var t = video.currentTime || 0;
    item.qIdx = qIdx;
    item.urls = item.qualities[qIdx].urls;
    item.urlIdx = 0;
    item.refreshed = false;
    item._freezeTries = 0;
    if (manual) item._qManual = true;
    try {
      localStorage.setItem(CFG.lsQuality, item.qualities[qIdx].label);
    } catch (e) {
    }
    slide._resumeAt = t;
    if (slide._qBtn) slide._qBtn.textContent = item.qualities[qIdx].label;
    attachVideo(slide, item, Number(slide.dataset.idx));
    toast("清晰度：" + item.qualities[qIdx].label);
  }
  function attachVideo(slide, item, idx) {
    slide.dataset.state = "loading";
    destroyHls(slide);
    if (slide._dmLayer) {
      slide._dmLayer.destroy();
      slide._dmLayer = null;
    }
    if (slide._stallIv) {
      clearInterval(slide._stallIv);
      slide._stallIv = null;
    }
    if (slide._stallVis) {
      document.removeEventListener("visibilitychange", slide._stallVis);
      slide._stallVis = null;
    }
    var olds = slide.querySelectorAll("video");
    Array.prototype.forEach.call(olds, function(v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
      v.remove();
    });
    var video = document.createElement("video");
    video.className = "acsv-video";
    video.muted = !soundOn;
    video.loop = !autoplayNext;
    video.playbackRate = seekHold.active ? 2 : playRate;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    if (item.kind === "home" && !item.urls.length) {
      if (!item.resolving) {
        item.resolving = true;
        API.refreshItem(item).then(function(ok) {
          item.resolving = false;
          if (ok && item.urls.length && slide.isConnected) {
            onHomeResolved(slide, item);
            attachVideo(slide, item, idx);
          } else {
            slide.dataset.state = "error";
          }
        }, function() {
          item.resolving = false;
          slide.dataset.state = "error";
        });
      }
      return;
    }
    video.addEventListener("playing", function() {
      clearTimeout(slide._waitTimer);
      slide.dataset.state = "ready";
      slide.dataset.paused = "0";
      if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.pause;
      if (slide._resumeAt) {
        try {
          video.currentTime = slide._resumeAt;
        } catch (e) {
        }
        slide._resumeAt = 0;
      }
      showControls(slide);
      onPlaying(slide, item, video);
      setTimeout(function() {
        if (slide.isConnected && !video.paused) reportWatch(slide, item, video);
      }, 1e4);
    });
    video.addEventListener("pause", function() {
      slide.dataset.paused = "1";
      if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.play;
    });
    video.addEventListener("waiting", function() {
      clearTimeout(slide._waitTimer);
      slide._waitTimer = setTimeout(function() {
        slide.dataset.state = "loading";
      }, 300);
    });
    video.addEventListener("loadedmetadata", function() {
      if (slide._ctlTime) {
        slide._ctlTime.textContent = fmtTime(video.currentTime) + " / " + fmtTime(video.duration);
      }
    });
    video.addEventListener("timeupdate", function() {
      if (!video.isConnected) return;
      if (!video.duration) return;
      var trackEl = slide.querySelector(".acsv-track");
      var draggingNow = !!trackEl && trackEl.dataset.drag === "1";
      var pct = video.currentTime / video.duration * 100 + "%";
      if (!draggingNow) {
        if (slide._ctlFill) slide._ctlFill.style.width = pct;
        if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
      }
      if (slide._ctlTime) {
        slide._ctlTime.textContent = fmtTime(video.currentTime) + " / " + fmtTime(video.duration);
      }
    });
    video.addEventListener("ended", function() {
      if (autoplayNext && idx === FeedStore.current) scrollToIndex(idx + 1);
    });
    video.addEventListener("error", function() {
      handlePlayError(slide, video, item, idx);
    });
    slide.insertBefore(video, slide.querySelector(".acsv-side"));
    playCurrent(slide, video, item);
    video.load();
    var stall = { lastT: -1, frames: -1, lastFrames: -1, lastFix: 0 };
    function frameTick() {
      stall.frames++;
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frameTick);
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frameTick);
    var visHandler = function() {
      if (!document.hidden) {
        stall.lastT = -1;
        stall.lastFrames = stall.frames;
      }
    };
    document.addEventListener("visibilitychange", visHandler);
    var stallIv = setInterval(function() {
      if (!slide.isConnected || slide.querySelector("video") !== video) {
        clearInterval(stallIv);
        document.removeEventListener("visibilitychange", visHandler);
        return;
      }
      if (document.hidden || video.paused || video.seeking || video.readyState < 2) {
        stall.lastT = video.currentTime;
        stall.lastFrames = stall.frames;
        return;
      }
      var nowT = video.currentTime;
      var timeAdv = stall.lastT >= 0 && nowT - stall.lastT >= CFG.stall.adv;
      var framesStuck = !!video.requestVideoFrameCallback && stall.frames === stall.lastFrames;
      stall.lastT = nowT;
      stall.lastFrames = stall.frames;
      if (!timeAdv || !framesStuck) return;
      var now = Date.now();
      if (now - stall.lastFix < CFG.stall.fixGap) return;
      var fixCap = item.kind === "home" ? CFG.stall.cap : CFG.stall.svCap;
      if (item._freezeTries >= fixCap) {
        if (!item._freezeGaveUp) {
          item._freezeGaveUp = true;
          toast("视频持续卡顿，已停止自动恢复");
        }
        return;
      }
      stall.lastFix = now;
      item._freezeTries = (item._freezeTries || 0) + 1;
      if (item._freezeTries === 1) {
        try {
          video.currentTime = Math.min(video.duration || 1e9, nowT + CFG.stall.nudge);
        } catch (e) {
        }
        return;
      }
      if (item._freezeTries === 2 && slide._hls && slide._hls.recoverMediaError) {
        try {
          slide._hls.recoverMediaError();
        } catch (e) {
        }
        return;
      }
      var canAutoQ = !item._qManual && item.kind === "home" && item.qualities && item.qualities.length > 1 && item.qIdx < item.qualities.length - 1;
      if (canAutoQ && /60$/.test(item.qualities[item.qIdx].label)) {
        var curLabel = item.qualities[item.qIdx].label;
        for (var q2 = item.qIdx + 1; q2 < item.qualities.length; q2++) {
          if (item.qualities[q2].label === curLabel.replace(/60$/, "")) {
            toast("播放卡顿，已切换到 " + item.qualities[q2].label + "（同分辨率降帧率）");
            switchQuality(item, slide, q2);
            return;
          }
        }
      }
      if (canAutoQ) {
        toast("播放卡顿，已自动切换到 " + item.qualities[item.qIdx + 1].label);
        switchQuality(item, slide, item.qIdx + 1);
        return;
      }
      if (slide._hls && slide._hls.recoverMediaError) {
        try {
          slide._hls.recoverMediaError();
        } catch (e) {
        }
        return;
      }
      slide._resumeAt = nowT;
      attachVideo(slide, item, idx);
    }, CFG.stall.iv);
    slide._stallIv = stallIv;
    slide._stallVis = visHandler;
    if (idx === FeedStore.current && !slide._userPaused) {
      playVideo(video);
      if (!soundOn && !firstGestureSeen) showSoundHint(slide);
    }
  }
  var watchReported = {};
  function reportWatch(slide, item, video) {
    if (!item || item.kind !== "home" || !item.videoId) return;
    var key = item.id + ":" + item.videoId;
    if (watchReported[key]) return;
    try {
      var w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      var wl = w.weblog;
      if (!wl || !wl.impr || !wl.sendImmediately) return;
      wl.sendImmediately("CLICK", {
        action: "CLIENT_BROWSE_HISTORY",
        params: {
          req_id: wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : void 0,
          group_id: wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : void 0,
          atom_id: String(item.videoId),
          ac_id: String(item.id),
          album_id: "0",
          resourceTypeCode: 2,
          // 官方 video 页配置固定值
          playedSeconds: Math.floor(video.currentTime || 0),
          videoId: Number(item.videoId) || 0,
          reportIdName: Number(item.id) || 0,
          resourceType: "video",
          dougaId: Number(item.id) || 0
        }
      });
      watchReported[key] = true;
    } catch (e) {
      dbg("report-watch-err");
    }
  }
  var soundHintEl = null;
  var soundHintShown = false;
  var soundHintDismissed = false;
  function showSoundHint(slide) {
    hideSoundHint();
    if (soundHintShown || soundHintDismissed || soundOn || firstGestureSeen) return;
    soundHintShown = true;
    soundHintEl = el("div", "acsv-hint");
    soundHintEl.appendChild(el("span", null, "🔇 当前处于静音"));
    var btn = el("button", "acsv-hint-btn", "开启声音");
    btn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      firstGestureSeen = true;
      var v = slide.querySelector("video");
      enableSound(v);
      if (v && soundOn) playVideo(v);
      hideSoundHint();
    });
    var x = el("button", "acsv-hint-x", "✕");
    x.addEventListener("click", function(ev) {
      ev.stopPropagation();
      soundHintDismissed = true;
      hideSoundHint();
    });
    soundHintEl.appendChild(btn);
    soundHintEl.appendChild(x);
    soundHintEl.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
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
      if ((i === cur || i === cur + 1) && !slide.querySelector("video") && slide.dataset.state !== "error") {
        attachVideo(slide, FeedStore.items[i], i);
      }
    }
    var slides = scroller.querySelectorAll(".acsv-slide");
    Array.prototype.forEach.call(slides, function(s) {
      var idx = Number(s.dataset.idx);
      if (idx < cur - 1 || idx > cur + 1) {
        var v = s.querySelector("video");
        if (v) {
          v.pause();
          v.removeAttribute("src");
          v.load();
          v.remove();
        }
        if (idx < cur - 2 || idx > cur + 3) {
          var c = s.querySelector(".acsv-ambient");
          if (c) c.remove();
        }
      }
    });
    var ordered = Array.prototype.slice.call(slides).sort(function(a, b) {
      return Number(a.dataset.idx) - Number(b.dataset.idx);
    });
    if (scroller.children.length !== ordered.length || Array.prototype.some.call(scroller.children, function(c, k) {
      return c !== ordered[k];
    })) {
      ordered.forEach(function(s) {
        scroller.appendChild(s);
      });
    }
    updateArrows();
  }
  function setActive(idx) {
    syncHash(idx);
    FeedStore.current = idx;
    FeedStore.ensureMore().then(renderWindow);
    updateArrows();
    if (isOpenComments()) {
      var itC = FeedStore.items[idx];
      if (itC && commentState.meowId !== itC.id) openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
    }
    if (!scroller) return;
    var vs = scroller.querySelectorAll("video");
    Array.prototype.forEach.call(vs, function(v) {
      var s = v.closest(".acsv-slide");
      if (s && Number(s.dataset.idx) !== idx) {
        v.pause();
        if (s._dmLayer) s._dmLayer.stop();
      }
    });
    var cur = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"] video');
    if (cur) {
      cur.muted = !soundOn;
      playVideo(cur);
      if (!soundOn && !firstGestureSeen) {
        var slide = cur.closest(".acsv-slide");
        if (slide && !slide.querySelector(".acsv-hint")) showSoundHint(slide);
      }
    }
  }
  function scrollToIndex(idx) {
    if (!scroller) return;
    FeedStore.ensureMore().then(function() {
      renderWindow();
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
      if (slide) {
        scroller.scrollTo({ top: slide.offsetTop, behavior: "smooth" });
        setActive(idx);
      }
    });
  }
  function mount() {
    dbg("mount-enter");
    if (root) return;
    ensureStyle();
    firstGestureSeen = false;
    soundHintShown = false;
    try {
      soundOn = localStorage.getItem(CFG.lsSound) === "1";
    } catch (e) {
      soundOn = false;
    }
    setRoot(el("div"));
    root.id = "acsv-root";
    root.className = "acsv-root";
    var top = el("div", "acsv-top");
    var logo = el("div", "acsv-logo");
    var logoImg = el("img", "acsv-logo-img");
    logoImg.src = CFG.api.logoSvg;
    logoImg.alt = "AcFun";
    logo.appendChild(logoImg);
    logoLabel = el("span", null, getSource() === "home" ? "推荐" : "小视频");
    logo.appendChild(logoLabel);
    top.appendChild(logo);
    var tr = el("div", "acsv-top-right");
    segSv = el("button", "acsv-seg-btn" + (getSource() !== "home" ? " on" : ""), "小视频");
    segHome = el("button", "acsv-seg-btn" + (getSource() === "home" ? " on" : ""), "推荐");
    segSv.title = "切换到小视频流";
    segHome.title = "切换到 APP 首页推荐流";
    segSv.addEventListener("click", function(ev) {
      ev.stopPropagation();
      switchSource("sv");
    });
    segHome.addEventListener("click", function(ev) {
      ev.stopPropagation();
      switchSource("home");
    });
    var seg = el("div", "acsv-seg");
    seg.appendChild(segSv);
    seg.appendChild(segHome);
    tr.appendChild(seg);
    var exitBtn = el("button", "acsv-tbtn", "✕");
    exitBtn.title = "退出（Esc）";
    exitBtn.addEventListener("click", exitFeed);
    tr.appendChild(exitBtn);
    top.appendChild(tr);
    root.appendChild(top);
    setScroller(el("div", "acsv-scroller"));
    root.appendChild(scroller);
    var drawer = el("aside", "acsv-drawer");
    var dhead = el("div", "acsv-drawer-head");
    var dtitle = el("span", null, "评论");
    var dclose = el("button", "acsv-drawer-close", "✕");
    dclose.title = "收起评论（Esc）";
    dclose.addEventListener("click", closeComments);
    dhead.appendChild(dtitle);
    dhead.appendChild(dclose);
    var dlist = el("div", "acsv-drawer-list");
    drawer.appendChild(dhead);
    drawer.appendChild(dlist);
    root.appendChild(drawer);
    setCommentDrawer({ el: drawer, title: dtitle, list: dlist });
    root.appendChild(el("div", "acsv-toast"));
    scroller.appendChild(el("div", "acsv-spinner"));
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.appendChild(root);
    dbg("root-appended");
    io = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          setActive(Number(en.target.dataset.idx));
        }
      });
    }, { root: scroller, threshold: [0, CFG.io.ratio, 0.9] });
    keyHandler = function(ev) {
      if (!isFeedRoute() || !root) return;
      if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
      var cur = FeedStore.current;
      switch (ev.key) {
        case "ArrowDown":
        case "PageDown":
        case "j":
          ev.preventDefault();
          scrollToIndex(cur + 1);
          break;
        case "ArrowUp":
        case "PageUp":
        case "k":
          ev.preventDefault();
          scrollToIndex(Math.max(0, cur - 1));
          break;
        case "ArrowLeft":
          ev.preventDefault();
          (function() {
            var v = currentVideo();
            if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - CFG.time.seekStep);
          })();
          break;
        case "ArrowRight": {
          ev.preventDefault();
          if (ev.repeat || seekHold.active || seekHold.timer) break;
          seekHold.timer = setTimeout(function() {
            seekHold.timer = null;
            seekHold.active = true;
            seekHold.prevRate = playRate;
            var v = currentVideo();
            if (v) v.playbackRate = 2;
            toast("2× 快进中");
          }, CFG.time.hold);
          break;
        }
        case " ":
          ev.preventDefault();
          (function() {
            var v = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
            if (!v) return;
            if (!firstGestureSeen && !soundOn) {
              firstGestureSeen = true;
              enableSound(v);
              hideSoundHint();
              return;
            }
            firstGestureSeen = true;
            if (v.paused) playVideo(v);
            else {
              v.pause();
              var ps = v.closest(".acsv-slide");
              if (ps) ps._userPaused = true;
              sweepVideos();
            }
          })();
          break;
        case "m":
        case "M": {
          var v2 = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
          firstGestureSeen = true;
          toggleSound(v2);
          if (v2 && soundOn) playVideo(v2);
          hideSoundHint();
          break;
        }
        case "f":
        case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else if (root.requestFullscreen) root.requestFullscreen();
          break;
        case "Escape":
          if (isOpenComments()) closeComments();
          else exitFeed();
          break;
        case "c":
        case "C": {
          var itC = FeedStore.items[cur];
          if (itC) {
            if (isOpenComments() && commentState.meowId === itC.id) closeComments();
            else openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
          }
          break;
        }
      }
    };
    keyUpHandler = function(ev) {
      if (ev.key !== "ArrowRight" || !root) return;
      var v = currentVideo();
      if (seekHold.timer) {
        clearTimeout(seekHold.timer);
        seekHold.timer = null;
        if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + CFG.time.seekStep);
      } else if (seekHold.active) {
        seekHold.active = false;
        playRate = seekHold.prevRate;
        if (scroller) {
          var vs = scroller.querySelectorAll("video");
          Array.prototype.forEach.call(vs, function(x) {
            x.playbackRate = playRate;
          });
        }
        toast("恢复 " + playRate.toFixed(1) + "x");
      }
    };
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("keyup", keyUpHandler);
    fsChangeHandler = function() {
      if (!scroller) return;
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
      if (slide) scroller.scrollTop = slide.offsetTop;
    };
    document.addEventListener("fullscreenchange", fsChangeHandler);
    ghostIv = setInterval(sweepVideos, 2e3);
    visResumeHandler = function() {
      if (document.hidden || !scroller) return;
      var s = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
      var v = s && s.querySelector("video");
      if (!v || v.paused || v.seeking) return;
      var snap = function() {
        if (!v.isConnected || v.paused || v.seeking) return;
        try {
          v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 0.1);
        } catch (e) {
        }
      };
      if (v.requestVideoFrameCallback) {
        var ok = false;
        v.requestVideoFrameCallback(function() {
          ok = true;
        });
        setTimeout(function() {
          if (!ok) snap();
        }, 400);
      } else snap();
    };
    document.addEventListener("visibilitychange", visResumeHandler);
    var route = parseRoute();
    var routeMid = route.mid;
    resetHomePager();
    if (!routeMid || getSource() === "home") {
      routeMid = null;
      UpVideos.feedActive = false;
      FeedStore.reset();
    }
    (routeMid ? FeedStore.loadFirst(routeMid) : FeedStore.ensureMore()).then(function() {
      if (!FeedStore.items.length) {
        if (scroller) {
          var box = el("div", "acsv-errbox");
          box.style.display = "grid";
          box.appendChild(el("p", null, "小视频加载失败，请检查网络后重试"));
          var b = el("button", "acsv-retry", "重试");
          b.addEventListener("click", function() {
            FeedStore.seen = {};
            FeedStore.items = [];
            box.remove();
            var sp2 = el("div", "acsv-spinner");
            scroller.appendChild(sp2);
            FeedStore.ensureMore().then(renderWindow);
          });
          box.appendChild(b);
          scroller.appendChild(box);
        }
        return;
      }
      var sp = scroller.querySelector(".acsv-spinner");
      if (sp) sp.remove();
      renderWindow();
      var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
      if (slide) scroller.scrollTop = slide.offsetTop;
      setActive(FeedStore.current);
    });
  }
  function unmount() {
    if (!root) return;
    if (io) {
      io.disconnect();
      io = null;
    }
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    if (keyUpHandler) {
      window.removeEventListener("keyup", keyUpHandler);
      keyUpHandler = null;
    }
    if (fsChangeHandler) {
      document.removeEventListener("fullscreenchange", fsChangeHandler);
      fsChangeHandler = null;
    }
    if (ghostIv) {
      clearInterval(ghostIv);
      ghostIv = null;
    }
    if (visResumeHandler) {
      document.removeEventListener("visibilitychange", visResumeHandler);
      visResumeHandler = null;
    }
    if (seekHold.timer) {
      clearTimeout(seekHold.timer);
      seekHold.timer = null;
    }
    seekHold.active = false;
    stopAll();
    Array.prototype.forEach.call(root.querySelectorAll(".acsv-slide"), destroyHls);
    var vs = root.querySelectorAll("video");
    Array.prototype.forEach.call(vs, function(v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
    root.remove();
    setRoot(null);
    setScroller(null);
    setCommentDrawer(null);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  function updateSegUI() {
    if (segSv) segSv.classList.toggle("on", getSource() !== "home");
    if (segHome) segHome.classList.toggle("on", getSource() === "home");
    if (logoLabel) logoLabel.textContent = getSource() === "home" ? "推荐" : "小视频";
  }
  function switchSource(s) {
    if (!scroller || getSource() === s) return;
    setSource(s);
    updateSegUI();
    closeComments();
    stopAll();
    Array.prototype.forEach.call(scroller.querySelectorAll(".acsv-slide"), function(sl) {
      var v = sl.querySelector("video");
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
        v.remove();
      }
      destroyHls(sl);
    });
    scroller.innerHTML = "";
    scroller.scrollTop = 0;
    FeedStore.reset();
    FeedStore.ensureMore().then(function() {
      if (!scroller) return;
      renderWindow();
      var sl = scroller.querySelector('.acsv-slide[data-idx="0"]');
      if (sl) scroller.scrollTop = sl.offsetTop;
      if (FeedStore.items.length) setActive(0);
      else {
        var box = el("div", "acsv-errbox");
        box.style.display = "grid";
        box.appendChild(el("p", null, "内容加载失败，请检查网络后重试"));
        var b = el("button", "acsv-retry", "重试");
        b.addEventListener("click", function() {
          box.remove();
          FeedStore.reset();
          FeedStore.ensureMore().then(renderWindow);
        });
        box.appendChild(b);
        scroller.appendChild(box);
      }
    });
  }
  function exitFeed() {
    unmount();
    if (isFeedRoute()) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  function toggle() {
    dbg("toggle:" + (isFeedRoute() ? "feed" : "off"));
    if (isFeedRoute()) mount();
    else unmount();
    dbg("toggle-done");
  }
  window.addEventListener("hashchange", toggle);

  // src/nav.js
  var NAV_LABELS = CFG.nav.labels;
  function tryInjectNav() {
    if (document.querySelector("[data-acsv-nav]")) return true;
    var links = document.querySelectorAll(
      "#pagelet_navigation a, #pagelet_header a, header a, .normal-nav a, .guide-list a, nav a"
    );
    var target = null, label = "";
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || "").trim();
      if (NAV_LABELS.indexOf(t) !== -1) {
        target = links[i];
        label = t;
        break;
      }
    }
    if (!target) return false;
    var li = target.closest("li") || target.parentElement;
    if (!li || !li.parentNode) return false;
    var clone = li.cloneNode(true);
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
    var node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.trim() === label) {
        node.nodeValue = "小视频";
        break;
      }
    }
    var anchors = clone.querySelectorAll("a");
    var a = anchors.length ? anchors[anchors.length - 1] : clone.querySelector("a");
    if (!a) a = clone;
    a.href = "#" + CFG.hash;
    a.removeAttribute("target");
    if (a.classList) a.classList.remove("active");
    a.title = "AcFun 小视频 · 竖刷模式（油猴脚本）";
    clone.setAttribute("data-acsv-nav", "1");
    clone.querySelectorAll("*").forEach(function(n) {
      n.removeAttribute("id");
    });
    li.parentNode.insertBefore(clone, li.nextSibling);
    return true;
  }
  var navObserver = null;
  function watchNav() {
    if (tryInjectNav()) return;
    navObserver = new MutationObserver(function() {
      if (tryInjectNav()) {
        navObserver.disconnect();
        navObserver = null;
      }
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() {
      if (navObserver) {
        navObserver.disconnect();
        navObserver = null;
      }
      if (document.getElementById("acsv-fab") || document.querySelector("[data-acsv-nav]")) return;
      if (/^\/u\/\d+/.test(location.pathname)) return;
      var fab = el("button", "acsv-fab", "▶ AcFun 小视频");
      fab.id = "acsv-fab";
      fab.addEventListener("click", function() {
        location.hash = CFG.hash;
      });
      document.body.appendChild(fab);
    }, CFG.time.navWait);
  }

  // src/boot.js
  dbgInit();
  ensureStyle();
  toggle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchNav);
  } else {
    watchNav();
  }
  tryInjectSpace();
})();

})();
