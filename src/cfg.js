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
  lsCodec: 'acsv-codec',        // 编码偏好记忆（推荐模式）：auto|avc|hevc
  lsBuf: 'acsv-buf',            // 缓冲档位记忆（推荐模式）：std|mid|max
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
    // ---- 收藏（www.acfun.cn PC 端收藏夹体系，网页 Cookie 鉴权） ----
    favoriteAdd: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/add',
    favoriteRemove: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/remove',
    favFolderList: 'https://www.acfun.cn/rest/pc-direct/favorite/folder/list',
    bananaPc: 'https://www.acfun.cn/rest/pc-direct/banana/throwBanana',
    // ---- 弹幕（www.acfun.cn 同域，网页 Cookie 鉴权） ----
    dmList: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/list',
    dmAdd: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/add',
    // hls.js 分发源（按序尝试）：jsdelivr 大陆常不可达（0.9.12 实测连续拉取失败），
    // npmmirror（阿里）优先；两源同版本，拉取文本后 Function 执行，无签名校验需求
    hlsCdns: [
      'https://registry.npmmirror.com/hls.js/1.5.20/files/dist/hls.min.js',
      'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js'
    ]
  },
  feed: { bufferSize: 4 }, // 滚动缓冲：当前条之后保持的余量（条数）
  homeFeedCfg: { count: 10 },
  page: { size: 10 },
  up: { maxChainPages: 20 }, // 空间页自动链式加载页数上限（防几千条 UP 无感轰炸几百个请求）
  danmaku: {
    maxPages: 8,    // 全量列表最多翻页数（每页 200 条）
    pageSize: 200,
    scrollSec: 8,   // 滚动弹幕穿过全屏时长（速度基准）
    staySec: 4      // 顶部/底部弹幕停留时长
  },
  stall: {
    // FROZEN 判定（rVFC 事件驱动）：超过 gapFactor×理论帧间隔无新帧、且时间轴仍在推进
    gapFactor: 3.5,
    minGapMs: 150,     // 武装超时下限（ms）
    fpsEmaA: 0.2,      // 渲染帧率 EMA 平滑系数（逐帧采样）
    degWindowMs: 3000, // DEGRADED（慢放）持续判定窗口
    degFpsRatio: 0.5,  // EMA 帧率 < 源帧率×此值 → 慢放
    degDropRatio: 0.5, // droppedVideoFrames 占比阈值（辅助判定）
    healthyMs: 30000,  // 持续健康该时长后阶梯尝试数衰减 1（恢复"弹药"返还）
    fixGap: 2000,      // 两次自动恢复的最小间隔（0.9.10 起 2s：冻结判定本身已花 ≥1.3s 双窗确认，
                       // 4s 曾让真冻结最坏 8~12s 才走到重挂，体感"冻结很久→转圈"）
    cap: 6,            // home 模式单可见期累计自动恢复上限（回前台清零重计；期内自动降档不清，防走楼梯）
    svCap: 4,          // sv 直链无档可降，跨重挂累计上限更低
    nudge: 0.1,        // 无感顶针步长（秒）：前跳触发解码器重出帧
    visGraceMs: 3000   // 回前台保护期：合成器/解码器唤醒慢期间不进恢复阶梯（防最小化往返误判冻结降档）
  },
  // 编码偏好（推荐模式）：cast 接口档位不带编码字段，m3u8 是单变体 media playlist，
  // 编码只能从 m3u8 文件名嗅探（2026-09-28 实测：标记形如 h264_60/h264_6m，
  // 无标记档按 A 站历史编码推断为 avc）。默认 avc——HEVC 在部分 Chromium 无硬解，
  // 是 60fps 档卡帧的根源（看门狗降帧率阶梯同源）；hevc 档 label 加后缀便于辨认
  codec: {
    def: 'avc',
    suffix: '·HEVC',            // HEVC 档 label 后缀（纯 H.264 视频不加，避免视觉噪音）
    reHevc: /hevc|hvc1|hev1|h265/i, // 嗅探 HEVC（h265 要求 h 前缀，防误伤 1080p_2650 之类码率数字）
    reAvc: /h264|avc1|avc3/i    // 嗅探 H.264（仅确证用，未命中按 avc 推断）
  },
  // 缓冲档位（推荐模式 hls.js 构造参数）。maxBufferSize 单位是字节
  // （0.9.1 前误写 120 当 MB，实为 120 字节，被 maxBufferLength 的时间上限掩盖）
  buf: {
    def: 'mid',
    presets: {
      std: { label: '标准', maxBufferLength: 60,  maxMaxBufferLength: 120, maxBufferSize: 60e6,  backBufferLength: 30 },
      mid: { label: '加大', maxBufferLength: 180, maxMaxBufferLength: 300, maxBufferSize: 150e6, backBufferLength: 30 },
      max: { label: '极限', maxBufferLength: 480, maxMaxBufferLength: 600, maxBufferSize: 400e6, backBufferLength: 60 }
    }
  },
  time: {
    ctlIdle: 2500,      // 控制栏闲置隐藏
    hold: 350,          // 长按右键进入 2x 的阈值
    toast: 1800,        // toast 停留
    xhr: 15000,         // XHR 超时
    gm: 20000,          // GM 请求超时
    chainGap: 30,       // 空间页链式加载间隔
    hotGap: 120,        // 最热统计批次间隔
    seekStep: 5,        // 左右键快进/快退秒数
    navWait: 6000,      // 导航注入兜底等待
    ghostIv: 5000,      // 幽灵视频扫描间隔（兜底，低频即可）
    watchReportMin: 3,   // 观看历史上报门槛：离开时进度达到该秒数才计入历史（过滤闪滑）
    watchReport: 10000   // 首报兜底：播到该毫秒数先保底入史（关标签页时离开上报送不出去）
  },
  nav: { labels: ['首页', '番剧', '直播', '文章区', '鱼塘'], tries: 20, retryMs: 500 },
  io: { ratio: 0.6 },
  fmt: { wanMin: 9999 },
  comments: {
    drawerW: 380,      // 抽屉宽度（窄屏按比例收缩）
    drawerMaxWp: 0.88, // 抽屉最大占视口宽比例
    scaleMin: 0.3,     // 视频区缩放下限
    subCount: 20,      // 楼中楼每页条数
    imgMax: 10 * 1024 * 1024, // 评论图片上传上限
    scrollPad: 80,     // 无限滚动触发提前量（px）
    recentMax: 12      // 最近使用表情保留数
  },
  rate: [0.5, 1, 1.5, 2],   // 倍速循环档位
  win: { back: 1, fwd: 1 }, // 渲染窗口：当前条向上 back/向下 fwd 张挂视频；slide DOM 与氛围背景在窗外更远一/两格回收
  upload: {
    endpoint: 'https://upload.kuaishouzt.com', // 评论图片分片上传图床
    chunk: 1 << 20,   // 分片大小（1MB）
    tokenT: 15000,    // getToken 超时
    chunkT: 60000,    // 单分片超时（二进制大，放宽）
    completeT: 30000, // complete 超时
    urlT: 15000       // getUrlAfterUpload 超时
  }
};

// 归因实验开关（冻结排查用）：仅 debug 构建解析 localStorage['acsv-exp']（JSON）。
// 用语句形式而非三元：esbuild 无 minify 时只消除 if(false) 语句块，三元函数体会残留产物。
//   noMonitor 跳过看门狗（排除顶针/rME/降档动作本身致冻）  q30 滤掉 60fps 档（模拟主站解码负载）
//   noWorker hls.js enableWorker:false                    smallBuf 缓冲强制 std 档（排除内存压力）
CFG.exp = {};
if (__ACSV_DEBUG__) {
  try { CFG.exp = JSON.parse(localStorage.getItem('acsv-exp') || '{}') || {}; } catch (e) { }
}

dbg('cfg-ok');
