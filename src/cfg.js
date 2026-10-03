import { dbg } from './dbg.js';

// ===================================================================
// 0. CFG —— 常量表（魔法值唯一来源）
// ===================================================================
export var CFG = {
  hash: 'svfeed',
  // ---- 老偏好键（0.9.89 起由 settings.js 收编）----
  // 六个 ls* 偏好键的**唯一真源仍是这里**（settings schema 的 legacy 字段引用它们）；
  // 但写入点已全部改走 settings.setSetting（`acsv.s.<key>`）。老键只在 settings 首读时
  // 被养一次（值不丢、键不删——回滚友好），此后不再读写。键名/值形态见 docs/api-research.md §7
  lsSound: 'acsv-sound-on',     // 静音记忆（关态写空串，不是删键）
  lsSource: 'acsv-source',      // 内容源记忆：sv=小视频 home=首页推荐
  lsDm: 'acsv-dm-on',           // 弹幕开关记忆
  lsQuality: 'acsv-quality',    // 清晰度记忆（推荐模式，存 qualityLabel）
  lsCodec: 'acsv-codec',        // 编码偏好记忆（推荐模式）：auto|avc|hevc
  lsBuf: 'acsv-buf',            // 缓冲档位记忆（推荐模式）：std|mid|max
  // 未收编：最近项缓存与更新状态机各有理由（见 settings.js 头注释与 docs §7）
  lsEmotRecent: 'acsv_emot_recent_v1', // 表情面板最近使用（emoticon.js）
  lsUpd: 'acsv-upd-v1',         // 更新检查状态：{seen,notified,ignored,lastCheck}（release.js）
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
    articleBase: 'https://www.acfun.cn/a/ac',
    // 动态 PC 落点（0.9.102 收口：此前该基址在 data.js/views.js 散落三处字面量）
    momentBase: 'https://www.acfun.cn/moment/am',
    // ---- 私信分享（网页私信 = 快手 ImSdk over WebSocket，无 REST 发送端点） ----
    // imsdk CDN hash 随官方发版变化，运行时优先取页面 globalConfig.imsdkcdn，此为兜底
    imsdk: 'https://static.yximgs.com/udata/pkg/acfun-im/ImSdk.eb6e95.js',
    // IM 图片资源官方下载域：内核换链产物指向远端配置下发的 apiAddress（sixinpic.kuaishou.com，
    // 实测对 acfun token 401）；官方页同资源走本域、参数不含 token 即 200（0.9.41 实测）
    imDownloadBase: 'https://message.acfun.cn',
    userCard: 'https://www.acfun.cn/rest/pc-direct/user/getUserCardList',
    defaultAvatar: 'https://imgs.aixifan.com/style/image/defaultAvatar.jpg',
    logoSvg: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/common/widget/header/img/acfunlogo.11a9841251f31e1a3316.svg',
    // ---- APP 家族接口（api-new.app.acfun.cn，免登录读 + 域 Cookie 写） ----
    homeFeed: 'https://api-new.app.acfun.cn/rest/app/selection/feed',
    dougaInfo: 'https://api-new.app.acfun.cn/rest/app/douga/info',
    playInfo: 'https://api-new.app.acfun.cn/rest/app/play/playInfo/cast',
    // ---- 收藏（www.acfun.cn PC 端收藏夹体系，网页 Cookie 鉴权） ----
    favoriteAdd: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/add',
    favoriteRemove: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/remove',
    favFolderList: 'https://www.acfun.cn/rest/pc-direct/favorite/folder/list',
    favDougaList: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/dougaList',
    bananaPc: 'https://www.acfun.cn/rest/pc-direct/banana/throwBanana',
    // ---- 视图面板（0.9.62，契约见 docs/api-research.md §4/§6 实测） ----
    history: 'https://www.acfun.cn/rest/pc-direct/browse/history/list',
    rank: 'https://www.acfun.cn/rest/pc-direct/rank/channel',
    navTree: 'https://www.acfun.cn/rest/pc-direct/page/queryNavigators',
    // 关注流（0.9.91）：**统一混合流**——不带 resourceTypes 即视频(2)+文章(3)+动态(10) 混排，
    // pcursor 是毫秒时间戳（翻页用响应值）。实测与差异见 docs/api-research.md §2.1.1：
    // 注意 feed/webPush 是另一条端点（只有视频+文章、无动态），不要混用
    followFeed: 'https://www.acfun.cn/rest/pc-direct/feed/followFeedV2',
    // 关注视频流（0.9.99）：官方「视频」tab 真实端点，纯视频（resourceType 全 2），形状与
    // followFeedV2 视频条目同构。实测 §2.1.2：count 被忽略固定每页 10、终页 pcursor='no_more'
    followDouga: 'https://www.acfun.cn/rest/pc-direct/feed/followDougaFeed',
    // 关注未读徽标数据源（0.9.97）：followUpers[].hasUnReadResource 只在此端点响应里
    // （followFeedV2 顶层的 ups 字段语义未确认，不可依赖——§2.1.1）
    webPush: 'https://www.acfun.cn/rest/pc-direct/feed/webPush',
    // 站内搜索（0.9.72）：**非 JSON**——整页 SSR HTML（结果区 div.search-video），
    // 走 net.requestText + data.parseSearchItems；?pageNo= 实测无效（两页同一结果集），只做首屏
    search: 'https://www.acfun.cn/search',
    // ---- 弹幕（www.acfun.cn 同域，网页 Cookie 鉴权） ----
    dmList: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/list',
    dmAdd: 'https://www.acfun.cn/rest/pc-direct/new-danmaku/add',
    // hls.js 分发源（按序尝试）：jsdelivr 大陆常不可达（0.9.12 实测连续拉取失败），
    // npmmirror（阿里）优先；两源同版本，拉取文本后 Function 执行，无签名校验需求
    hlsCdns: [
      'https://registry.npmmirror.com/hls.js/1.5.20/files/dist/hls.min.js',
      'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js'
    ],
    // ---- 更新检查（0.9.60）：GitHub 官方 releases.atom（与 @downloadURL 同域——分发通道
    // 可达则它可达；无 API 限流）。正文直接用官方渲染 HTML，releasePage 供「前往更新」跳转
    ghRelAtom: 'https://github.com/name-xxl/acfun-svfeed/releases.atom',
    releasePage: 'https://github.com/name-xxl/acfun-svfeed/releases/latest'
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
    arriveFactor: 2.5, // 自校准系数：武装间隔取 理论帧间隔 与 近期实际到帧间隔×此值 的大者
                       // （低帧率流/慢放态下「帧来得慢」不被误判成冻结；与判冻的 gapFactor 是两回事）
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
    reHevc: /hevc|hvc1|hev1|h265/i // 嗅探 HEVC（h265 要求 h 前缀，防误伤 1080p_2650 之类码率数字）；未命中按 avc 推断
  },
  // 缓冲档位（推荐模式 hls.js 构造参数）。maxBufferSize 单位是字节
  // （0.9.1 前误写 120 当 MB，实为 120 字节，被 maxBufferLength 的时间上限掩盖）。
  // 0.9.41 降流量调优：60/180/480s → 10/20/30s（maxMax/Bytes 等比收缩；backBuffer
  // 保持原值——回退缓冲不产生前向流量，调小反而会让回拖进度条重新下载）
  buf: {
    def: 'mid',
    presets: {
      std: { label: '标准', maxBufferLength: 10,  maxMaxBufferLength: 20, maxBufferSize: 15e6, backBufferLength: 30 },
      mid: { label: '加大', maxBufferLength: 20,  maxMaxBufferLength: 40, maxBufferSize: 30e6, backBufferLength: 30 },
      max: { label: '极限', maxBufferLength: 30,  maxMaxBufferLength: 60, maxBufferSize: 45e6, backBufferLength: 60 }
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
    watchLedgerFlush: 3000,    // 持久账本落盘节奏（0.9.87）：崩溃补报的误差上界=此间隔
    watchLedgerTtl: 86400000,  // 账本条目 TTL（24h）：陈旧差量没有补报价值，不养僵尸
    setFlush: 300,             // 设置写盘防抖窗（0.9.89）：面板连点开关只落一次盘；关面板/pagehide 强制 flush
    upd: 10000,          // release.atom 拉取超时
    updGap: 60000        // 两次更新检查最小间隔：防 Esc 频繁进出竖刷刷请求（mock 注入时绕过）
  },
  nav: {
    labels: ['首页', '番剧', '直播', '文章区', '鱼塘'],
    tries: 20,
    retryMs: 500,
    // 页面白名单：仅命中 pathname 的页面才跑导航注入/胶囊兜底。
    // 0.9.47 起收窄为首页——其余页面（独立布局/工具页/内容消费页）注入无意义或非目标场景，
    // 此前全站盲试会让 6 秒兜底胶囊出现在播放页等非首页处
    pages: [/^\/$/]
  },
  io: { ratio: 0.6 },
  fmt: { wanMin: 9999 },
  // ---- 子视图（0.9.62）：#svfeed/<view>/<arg>，左栏入口 + 面板参数 ----
  view: {
    narrow: 720,          // 视口宽低于此值隐藏左栏（竖刷是移动式布局，面板无意义）
    dockW: 168,           // 左栏展开宽（抖音式全高导航；scroller/info/视图 padding 与之绑定）
    pageSize: 20,         // 观看历史/收藏夹每页
    me: {                 // 我的页（0.9.69 抖音式个人主页）
      gridMin: 280,       // 网格卡最小列宽（列数随容器宽自适应，不写死断点；1920 下 5 列）
      gridGap: 16,        // 网格间距
      // 封面比例=4:3：A 站**普通视频封面固定 4:3**（只有小视频是 3:4）——历史/收藏条目
      // 经契约层过滤后全是普通视频（panelItem 只收 resourceType=2+videoId），套 3:4 会把
      // 封面左右各裁掉一大块（连标题字都被切）。将来若混入小视频条目需按 kind 分档
      coverRatio: '4 / 3',
      cardTtl: 1800000,   // 头部资料缓存（30min；视图新建 enter 重建 DOM——来源复原路径不重建，命中缓存免重复请求）
      skel: 12            // 首屏骨架卡数（约一屏）
    },
    rankLimit: 100,       // 榜单条数（原生全站日榜 100 条同款，rankLimit=100 实测生效）
    // 视图正文让位的最小视口宽（0.9.73）：抽屉占槽时视图正文右缘收窄到抽屉左缘，低于此宽
    // 退化为纯覆盖（与 comments.avoidMin 同款降级哲学）。推导=榜单行最小可用宽 ≈546
    // （封面 160+行左右 padding 32+gap 16+UP 卡 338）+ 正文左右内边距 206（dockW+14 与 24）
    // + 抽屉 380 ≈ 1132，向上取整；视图不能像视频那样缩放，阈值只能比 avoidMin 更严
    avoidW: 1140,
    // 抽屉避让下顶栏搜索框的隐藏阈值（视口宽，0.9.73）：顶栏收窄到抽屉左缘后，搜索框可用宽
    // = 剩余宽 − 右组预留 304（2×右组 128 + 2×间距 12 + 两侧 48）；低于「最小可用宽 160」
    // 即不可用 → 隐藏只留按钮组。推导=dockW 168 + 抽屉 380 + 304 + 160 ≈ 1012
    avoidTopW: 1012,
    search: {             // 搜索视图（0.9.72 抖音式结果网格；封面 16:9 为搜索页原始比例）
      gridMin: 300,       // 网格卡最小列宽（1920 下约 5-6 列，对齐抖音搜索页密度）
      gridGap: 16
    },
    // 关注视图（0.9.91）：只声明它**自己**的东西——0.9.99 起全部侧是仿原生单列行流
    //（不再用网格），本块只剩行流自己的参数
    follow: {
      skel: 12,           // 首屏骨架行数（约一屏）
      scrollPad: 300,     // 无限滚动触底提前量（px；借鉴广场 SCROLL_BOTTOM_OFFSET——长图片列表
                          // 提前量大些，避免用户看到加载停顿；评论区 80 是小容器场景）
      backTopAt: 300      // 距顶多少 px 显示回顶按钮（借鉴广场 BACK_TOP_THRESHOLD）
    },
    periods: ['DAY', 'THREE_DAYS', 'WEEK'], // 榜期（原生：今日/三日/本周）
    periodNames: { DAY: '今日', THREE_DAYS: '三日', WEEK: '本周' },
    zones: [              // 频道全集（对齐原生榜单页 tab 序；cid 实测 docs/api-research.md §6.2）：
      // 番剧不放（cid=155 仅 3 条杂项）、文章榜不放（89 条全 contentType=3，竖刷不支持）
      { id: 0, name: '全站综合' },
      { id: 1, name: '动画' }, { id: 60, name: '娱乐' }, { id: 201, name: '生活' },
      { id: 58, name: '音乐' }, { id: 123, name: '舞蹈·偶像' }, { id: 59, name: '游戏' },
      { id: 70, name: '科技' }, { id: 68, name: '影视' }, { id: 69, name: '体育' },
      { id: 125, name: '鱼塘' }
    ]
  },
  comments: {
    drawerW: 380,      // 抽屉宽度（窄屏按比例收缩）
    drawerMaxWp: 0.88, // 抽屉最大占视口宽比例
    scaleMin: 0.3,     // 视频区缩放下限
    avoidMin: 0.5,     // 剩余空间占视口比低于此值时放弃避让改纯覆盖（视频不缩放原尺寸续播，抽屉近乎全遮）
    subCount: 20,      // 楼中楼每页条数
    imgMax: 10 * 1024 * 1024, // 评论图片上传上限
    scrollPad: 80,     // 无限滚动触发提前量（px）
    recentMax: 12      // 最近使用表情保留数
  },
  rate: [0.5, 1, 1.5, 2],   // 倍速循环档位
  win: { back: 1, fwd: 1 }, // 渲染窗口：当前条向上 back/向下 fwd 张挂视频；slide DOM 与氛围背景在窗外更远一/两格回收
  // 关注未读徽标轮询（0.9.97，4.3）：60s 起步逐次翻倍封顶 10min，发现新内容即刻回落基准
  //（退避序列钉单测；tick 是固定节拍器粒度——真实间隔由 nextAt 闸门控制，广场同款骨架）
  follow: {
    pollStart: 60000,
    pollMax: 600000,
    tick: 5000
  },
  // 关注视频流（0.9.99）：followDougaFeed 后台分页链参数。每页条数**不在这里**——服务端钳制
  // 固定 10/页（实测 §2.1.2，count 被忽略），客户端无可调项；maxChainPages 防超长关注列表
  // 无感发几百请求（uppage 同款上限思路）；翻页间隔沿用 time.chainGap
  followStream: {
    maxChainPages: 8
  },
  im: {
    loadT: 12000,   // ImSdk 脚本加载超时（860KB，慢网放宽）
    connT1: 3500,   // 等待连接的宽容期：widget 自带 3 次重试 + sync 自恢复，别抢跑
    connT2: 25000,  // 主动 connect() 后的总等待
    pollGap: 300,   // 会话列表轮询间隔：连接后服务端 sync 需 1~2 拍
    pollMax: 15,    // 会话轮询上限（约 4.5s，超时按空列表处理）
    sendT: 12000,   // 发送确认超时：官方失败无回调、链路层 10s 才超时——必须大于它，
                    // 否则 SDK 的真实超时原因永远浮不出来（此前 8s 憋死过线索）
    maxLen: 1000,   // 官方单条字数上限（超限 sendMessage 同步返回 false）
    imgMax: 10 * 1024 * 1024, // 私信图片上限：与评论配图取同值（内核上传接口的真实上限未知，稳妥）
    imgSendT: 60000,          // 图片消息确认超时：含 SDK 内核上传图床耗时（大图慢网），远大于 sendT
    // 消息引用 wire 通道（2026-09-30 真机实测定案）：'extra'=文本消息 + proto extra
    // 字段藏 {acsvQuote} JSON，对方客户端看到「[引用] 摘要\n正文」可读文本；'reference'=
    // 原生 Reference 消息（contentType 12）——服务端接受（消息正常落地），但 AcFun APP
    // 端不渲染、提示「客户端不支持查看此消息」，故仅作保留通道（APP 后续支持了再切回）
    quoteWire: 'extra',
    drawerListPoll: 1500, // 消息抽屉列表刷新间隔（打开期间；缓存读）
    drawerChatPoll: 1500, // 聊天视图新消息增量间隔（打开期间；推送进缓存后由它上屏）
    dayDivGap: 300000,    // 聊天时间分割线间隔：与上一条消息相隔超过该值插入时间分割（5 分钟）
    badgePoll: 5000,      // 顶栏未读徽标刷新间隔（仅缓存读）
    badgeDelay: 15000     // 徽标首次探测延迟：避免页面一打开就拉起 SDK
  },
  upload: {
    endpoint: 'https://upload.kuaishouzt.com', // 评论图片分片上传图床
    tokenUrl: 'https://www.acfun.cn/rest/pc-direct/image/upload/getToken',
    urlAfterUpload: 'https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload',
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
//   native 强制走原生 HLS（0.9.12 对照组：MSE 可用时默认一律 hls.js）
CFG.exp = {};
if (__ACSV_DEBUG__) {
  try { CFG.exp = JSON.parse(localStorage.getItem('acsv-exp') || '{}') || {}; } catch (e) { }
}

dbg('cfg-ok');
