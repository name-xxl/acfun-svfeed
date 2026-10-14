// ---------- 站点原生图标资源表（imdrawer / imnative 双端共享） ----------
// 收录自实际页面提取并经视觉核对的 A 站原生图标。新页面发现新图标：登记进来，两端直接取用。
//
// ICON_SVGS：CDN SVG 资产（配合 CSS mask + currentColor 可任意着色，明暗主题通用）。
// GLYPHS：acfun-frontend-next 字形码点（www 页抽屉字体由 styles @font-face 统一注入
// ——0.9.55，码点需与该字体实际字形核对；原生页官方自带同字体）。
//
// 注意：message(e15e) 是站点头部的「消息」图标，不是评论计数图标——评论计数用
// ICON_SVGS.comment（0.9.23 误用教训）。计数字形码点从 list201/list60 实际使用提取。

export var ICON_SVGS = {
  play: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/img/icon_view_player.4a9692bb.svg', // v/list60 播放计数
  comment: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/img/icon_message.e89cfe55.svg'   // v/list60 评论计数
};

export var GLYPHS = {
  play: '\ue3de',       // 播放（list201 计数遮罩同款）
  danmu: '\ue3da',      // 弹幕（list201 计数遮罩同款）
  message: '\ue15e',    // 消息气泡（站点头部「消息」图标；非评论）
  search: '\ue15d',     // 搜索
  clock: '\ue15f',      // 时钟（历史）
  star: '\ue160',       // 星星（动态；顶部与历史相邻那颗，非收藏——0.9.24 误标勘正）
  banana: '\ue2ea',     // 蕉
  share: '\ue15b',      // 分享/上传（站点头部）
  // 动态卡（member/feeds）互动区四件套（0.9.55/0.9.56 浏览器实测码点，acfun-frontend-next）
  feedRepost: '\ue628',     // 分享/转发
  feedComment: '\ue627',    // 评论
  feedLike: '\ue629',       // 点赞（未点亮）
  feedLikeFill: '\ue660',   // 点赞（点亮实心）
  feedBanana: '\ue62a',     // 投蕉（未点亮；0.9.101 采样补——此前误用 GLYPHS.banana E2EA）
  feedBananaFill: '\ue65f', // 投蕉（点亮实心；0.9.101 采样补）
  phone: '\ue242',      // 手机
  monitor: '\ue184',    // 电脑
  tablet: '\ue185',     // 平板
  grid: '\ue15c',       // 网格
  shop: '\ue420',       // 商店
  game: '\ue3e8',       // 游戏
  power: '\ue19c',      // 电源
  rank: '\ue204',       // 排行/音柱
  arrowRight: '\ue3c2', // 右箭头
  arrowUp: '\ue163',    // 上箭头
  // 榜单卡 meta 与 UP 卡数据位（0.9.69，原生 rank/list 浏览器实测码点；同 acfun-frontend-next
  // 字体已由 styles @font-face 注入）：rankView 与封面 hover 播放按钮同字；
  // 投稿数复用 share('\ue15b')（原生 up-card 同字）
  rankView: '\ue164',    // 播放数（原生 video-card extra 首位）
  rankComment: '\ue161', // 评论数（原生 video-card extra 次位）
  rankTime: '\ue2f5',    // 发布时间（原生 video-card extra 时钟）
  fans: '\ue155',        // 粉丝数（原生 up-card 次数据位；音柱/人形字形实测渲染核对）
  // 官方 UMEditor 工具栏字形（0.9.238 富文本输入条；2026-10-15 用户裁决「图标要用原生的」）。
  // 来源＝官方工具栏 CSS 的 .edui-icon-*:before；**已核验这 7 个码点都在本字体里**
  // （cmap 实测：151 字形 / 码点段 e153–e660）⇒ 与官方评论编辑器工具栏同字体、同码点，
  // 字形逐像素相同。颜色随 currentColor（深/浅两皮肤一套 CSS），零新增资源
  edBold: '\ue18f',      // 加粗
  edItalic: '\ue19a',    // 斜体
  edUnderline: '\ue1ea', // 下划线
  edStrike: '\ue1e9',    // 删除线
  edColor: '\ue1eb',     // 颜色（字形自身带一条色条，随 currentColor——勿再叠自定义色条）
  edEmotion: '\ue18b',   // 表情
  edImage: '\ue18a',     // 图片
  // 0.9.239 补：官方 splitbutton 的下拉箭头（`.edui-caret:before{content:"\E166"}`，
  // 官方用法 font-size:12px + transform:scale(.6)）。同批实测：该码点在 acfun-frontend-next
  // 里与官方内联 subset「逐像素相同」（pixelDiff=0）
  edCaret: '\ue166'
};
