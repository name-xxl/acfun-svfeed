import { dbg } from './dbg.js';

// ===================================================================
// 0. CFG —— 常量表（魔法值唯一来源）
// ===================================================================
export var CFG = {
  hash: 'svfeed',
  lsSound: 'acsv-sound-on',
  lsSource: 'acsv-source',      // 内容源记忆：sv=小视频 home=首页推荐
  lsDm: 'acsv-dm-on',           // 弹幕开关记忆
  lsQuality: 'acsv-quality',    // 清晰度记忆（推荐模式，存 qualityLabel）
  accent: '#fd4c5d',
  home: {
    appVer: '6.31.1.1026',
    ua: 'acvideo core/6.31.1.1026(OPPO;OPPO A83;7.1.1)',
    mkey: 'AAHewK3eIAAyMTkwNTExNzYAAhAAMEP1uwSZbohCYAAAAJlXIdNAMQR5fM2F-KEOYN5wnGQA6_eLEvGiajzUp4_YnU8EjTm7gzNYhBv59oCCDhbdkmIwsXnF9PgS5ly8eQyjuXlcS7VpWG0QlK0HakVDamteMHNHIui0A8V4tmELqQ%3D%3D'
  },
  api: {
    feed: 'https://m.acfun.cn/rest/mobile-direct/meow/feedList?count=20&firstPage=false',
    info: 'https://m.acfun.cn/rest/mobile-direct/meow/info?meowId=',
    comment: 'https://www.acfun.cn/rest/pc-direct/comment/list?sourceId=',
    commentSub: 'https://www.acfun.cn/rest/pc-direct/comment/sublist',
    commentAdd: 'https://www.acfun.cn/rest/pc-direct/comment/add',
    commentLikePc: 'https://www.acfun.cn/rest/pc-direct/comment/',
    token: 'https://id.app.acfun.cn/rest/web/token/get',
    interact: 'https://api.kuaishouzt.com/rest/zt/interact/',
    follow: 'https://www.acfun.cn/rest/pc-direct/relation/follow',
    emotion: 'https://m.acfun.cn/rest/mobile-direct/emotion/getUserEmotion',
    upPage: 'https://m.acfun.cn/upPage/',
    shareBase: 'https://m.acfun.cn/sv/?mid=',
    userBase: 'https://www.acfun.cn/u/',
    videoBase: 'https://www.acfun.cn/v/ac',
    defaultAvatar: 'https://imgs.aixifan.com/style/image/defaultAvatar.jpg',
    logoSvg: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/common/widget/header/img/acfunlogo.11a9841251f31e1a3316.svg',
    // ---- APP 家族接口（api-new.app.acfun.cn，免登录读 + 域 Cookie 写） ----
    appBase: 'https://api-new.app.acfun.cn/rest/app',
    homeFeed: 'https://api-new.app.acfun.cn/rest/app/selection/feed',
    dougaInfo: 'https://api-new.app.acfun.cn/rest/app/douga/info',
    playInfo: 'https://api-new.app.acfun.cn/rest/app/play/playInfo/cast',
    favorite: 'https://api-new.app.acfun.cn/rest/app/favorite',
    unFavorite: 'https://api-new.app.acfun.cn/rest/app/unFavorite',
    banana: 'https://api-new.app.acfun.cn/rest/app/banana/throwBanana',
    commentLike: 'https://api-new.app.acfun.cn/rest/app/comment/',
    // ---- 弹幕（www.acfun.cn 同域，网页 Cookie 鉴权） ----
    dmList: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/list',
    dmAdd: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/add',
    hlsCdn: 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js'
  },
  feed: { count: 20, bufferSize: 4 },
  homeFeedCfg: { count: 10 },
  page: { size: 10 },
  danmaku: {
    maxPages: 8,    // 全量列表最多翻页数（每页 200 条）
    pageSize: 200,
    scrollSec: 8,   // 滚动弹幕穿过全屏时长（速度基准）
    staySec: 4      // 顶部/底部弹幕停留时长
  },
  stall: {
    iv: 2000,     // 看门狗轮询间隔（ms）
    adv: 1,       // 冻结判定：窗口内时间轴推进阈值（秒）
    fixGap: 4000, // 两次自动恢复的最小间隔（ms）
    cap: 6,       // home 模式单个条目累计自动恢复上限（降档会重置计数）
    svCap: 4,     // sv 直链无档可降，跨重挂累计上限更低
    nudge: 0.1    // 无感顶针步长（秒）：前跳触发解码器重出帧
  },
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

dbg('cfg-ok');
