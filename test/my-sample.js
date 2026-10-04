// view-my / view-zone 场景的接口 mock 快照（0.9.62）。
// 形状 = docs/api-research.md 实测响应裁剪：历史条目 resourceType=2 且带 videoId（该体系
// 编码与收藏/榜单不同源）、dougaList 列表键 favoriteList、rank contentType 2=视频 3=文章。
// 坏例条目（番剧形态/无 videoId）专测 panelItem 契约过滤——宁可漏不错。
(function () {
  // 作者头像夹具（0.9.82）分两张，断言才能分辨"面板/SSR 自带的那张"与"douga/info 回包补的
  // 那张"（同一张的话"回包把头像换掉"就断言不出来）。都是 1×1 内联图，免外网请求。
  //   PANEL_AVATAR  面板层自带：搜索页 SSR 的 img.user-avatar / 收藏 dougaList 的 userImg /
  //                 观看历史的 user.headUrl
  //   RESOLVE_AVATAR douga/info 回包的 user.headUrl
  var PANEL_AVATAR = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  var RESOLVE_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  window.__ACSV_PANEL_AVATAR__ = PANEL_AVATAR;
  window.__ACSV_RESOLVE_AVATAR__ = RESOLVE_AVATAR;
  // 时间夹具（0.9.85）：三个值刻意互不相同，才能分辨实现读的是哪一个
  //   PUBLISH_TIME 站方展示的"发布时刻"（douga/info 的 createTimeMillis）= 播放层日期槽的期望值
  //   UPLOAD_TIME  稿件"上传时刻"（videoList[0].uploadTime）= 比发布时刻更早的诱饵
  //   createTime   顶层那个只是展示串（见 douga/info mock 里的 '24小时前' 诱饵）
  var PUBLISH_TIME = new Date(2026, 9, 2, 1, 25, 0).getTime();  // 本地 2026-10-02 01:25
  var UPLOAD_TIME = new Date(2026, 8, 26, 21, 39, 9).getTime(); // 本地 2026-09-26 21:39
  window.__ACSV_PUBLISH_TIME__ = PUBLISH_TIME;
  window.__ACSV_UPLOAD_TIME__ = UPLOAD_TIME;
  // 播放层日期槽的期望文案（本地时区 YYYY-MM-DD，与 fmtDate 同口径；时区无关地由本地分量构造）
  window.__ACSV_PUBLISH_DATE__ = PUBLISH_TIME ? (function () {
    var d = new Date(PUBLISH_TIME), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  })() : '';
  // 观看历史条目作者（0.9.84 真机实测形状）：histories[].user 与 douga/info 的 user 同形状
  // ——id 是**字符串**、名字在 name、头像在 headUrl。故意与回包 mock 的名字（测试UP）不同，
  // 才能断言"首帧作者来自列表 API、回包后被详情覆写"
  // browseTime 实测是毫秒时间戳（1790961102971 / typeof number）→ 卡片脚行右槽的相对时间
  function histUser(i) {
    return { id: String(25380695 + i), name: '历史UP', headUrl: PANEL_AVATAR, isFollowing: false };
  }
  var HIST_AGO = Date.now() - 5 * 60 * 1000; // 5 分钟前：相对时间文案稳定落在「N分钟前」
  var HIST_OLD = Date.now() - 10 * 86400000; // 10 天前：fmtAgo 应退回**带年份**的绝对日期
  var HIST_VIDS = [];
  for (var i = 0; i < 18; i++) {
    HIST_VIDS.push({
      resourceType: 2, videoId: 900000 + i, resourceId: 488900 + i,
      // 第 2 条（首行内）**刻意给双行长标题**：网格行内单双行标题共存是脚行钉底（0.9.90）
      // 的布局夹具——标题全单行时行内无富余，"脚行底=卡底" 断言会假绿，钉不住回归
      title: i === 1
        ? '测试历史视频1（这条标题刻意写长，用来占满两行，验证单双行标题共存时脚行仍钉在卡底）'
        : '测试历史视频' + i,
      cover: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      playedSeconds: 100 + i, playedSecondsShow: '观看至01:4' + (i % 10),
      user: histUser(i),
      // 第 2 条给"10 天前"：场景里钉住"更早 → 带年份日期"这一档（首条仍是 5 分钟前）
      browseTime: i === 1 ? HIST_OLD : HIST_AGO - i * 60000
    });
  }
  var HIST_P1 = HIST_VIDS.concat([
    { resourceType: 3, videoId: 950001, resourceId: 489001, title: 'X番剧条目应被过滤', cover: '', playedSeconds: 1, playedSecondsShow: '' },
    { resourceType: 2, videoId: null, resourceId: 489002, title: 'X无videoId应被过滤', cover: '', playedSeconds: 2, playedSecondsShow: '' }
  ]);
  var HIST_P2 = [];
  for (var j = 0; j < 4; j++) {
    HIST_P2.push({
      resourceType: 2, videoId: 900020 + j, resourceId: 488920 + j,
      title: '测试历史视频续' + j, cover: '', playedSeconds: 30, playedSecondsShow: '观看至00:30',
      user: histUser(20 + j), browseTime: HIST_AGO - j * 60000
    });
  }
  function favEntry(n) {
    return {
      contentId: 489100 + n, contentTitle: '测试收藏视频' + n, contentImg: '',
      userPlayedSeconds: 65 + n, userName: '收藏UP', stows: 12,
      // 作者字段按 docs §4.2 实测形状补全（0.9.82）：收藏条目进播放层要靠它出
      // @名字 链接、头像与关注按钮——此前夹具只给 userName，解析器也就只能拿到名字
      userId: 4321, userImg: PANEL_AVATAR,
      // 时间字段按实测补全（0.9.84/0.9.85）：contentCreateTime 取真机实测值（2026-09-26 21:39，
      // 稿件**上传时刻**）→ 卡片右槽应显示带年份的 2026-09-26；updateTime 给"1 分钟前"的
      // **诱饵**值（语义不纯，解析器不得采用——若误用，断言会看到分钟前而不是日期）
      contentCreateTime: new Date(2026, 8, 26, 21, 39, 18).getTime(),
      updateTime: Date.now() - 60 * 1000
    };
  }
  var ZONE_NAMES = { 0: '全站综合', 1: '动画', 59: '游戏', 58: '音乐', 68: '影视', 201: '生活', 70: '科技', 125: '鱼塘' };
  function rankList(url) {
    var cid = (url.match(/channelId=(\d+)/) || [])[1] || '1';
    var period = (url.match(/rankPeriod=(\w+)/) || [])[1] || 'DAY';
    var name = ZONE_NAMES[cid] || ('分区' + cid);
    var rows = [];
    var now = Date.now();
    for (var k = 0; k < 5; k++) {
      rows.push({
        dougaId: String(489500 + k), contentType: k === 4 ? 3 : 2, // 第 5 条文章形态：契约层过滤
        // k=3 极端行（0.9.69 行高不变量防回归）：超长标题（单行 ellipsis）/含 <br> 简介（pre-line
        // 折行）/超长无空格签名（3 行硬裁）/粉丝不过万（万格式原样分支）
        contentTitle: k === 3 ? new Array(40).join('超长标题') : '榜单' + name + '-' + period + '-' + k,
        videoCover: '',
        contentDesc: k === 3 ? '第一行简介<br/>第二行简介' : '简介' + k,
        bananaCount: 500 - k, viewCount: 3000 - k * 10,
        commentCount: 40 - k, contributeTime: now - (k + 1) * 3600000,
        // 频道字段按真机形状：子频道名在顶层 channelName（= channel.name），parentName 是主分区
        channelName: name,
        channel: { id: 86, name: name, parentId: 201, parentName: name },
        userName: '榜单UP' + (k % 2), authorId: 700 + (k % 2),
        fansCount: k === 3 ? 8000 : 33235 - k * 1000, // k=3 不过万；其余走「N.N万」
        contributionCount: 353 + k,
        userImg: '', userSignature: k === 3 ? new Array(60).join('无空格长签名') : '签名' + k
      });
    }
    return { result: 0, rankList: rows };
  }

  // ---- 关注流夹具（0.9.91 view-follow；形状裁剪自 docs/api-research.md §2.1.1 实测）----
  // 首屏 20 原始条：视频/文章/动态混排（动态含「有图」「无图」两种，正文带 UBB [at] 走单源渲染）
  // + 1 条未观察类型（resourceType 4）探契约过滤；分档枚举覆盖 1/2/10（今天/昨天/更早）。
  // 第二页 4 条（< pageSize → 「加载更多」该隐藏）
  var FOLLOW_COVER = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  function fu(i, name) {
    return { userId: 1000 + i, userName: name, userHead: PANEL_AVATAR, isFollowing: true };
  }
  function fBase(i, g, kind) {
    return { createTime: Date.now() - (2 + i) * 3600 * 1000, createTimeGroup: g, user: fu(i, '关注UP' + i), resourceType: kind };
  }
  function fVideo(i, g, title) {
    var e = fBase(i, g, 2);
    e.resourceId = 488801 + i; e.caption = title; e.coverUrl = FOLLOW_COVER;
    e.playDuration = '00:1' + (i % 10); e.viewCount = 100 + i;
    // 互动行数值态（0.9.99）：行内写链断言要两向（i=0 预置已赞、i=2 预置已投蕉）
    e.likeCount = 20 + i; e.commentCount = 3 + i; e.bananaCount = 5 + i; e.shareCount = i;
    e.isLike = i % 4 === 0; e.isThrowBanana = i === 2;
    return e;
  }
  function fArticle(i, g, title) {
    var e = fBase(i, g, 3);
    e.resourceId = 488601 + i; e.articleTitle = title; e.coverUrl = FOLLOW_COVER; e.viewCount = 200 + i;
    // 摘要源：实测是 beginParagraph（description 该条为空串，不是摘要源——§2.1.1）
    e.beginParagraph = '又是一年团圆时节，又想听家人们动人的歌喉了那么话不多说';
    // 互动行数值态（0.9.99）：文章行内赞/蕉只读，但计数照常展示
    e.likeCount = 30 + i; e.commentCount = 6; e.bananaCount = 7; e.shareCount = 8;
    return e;
  }
  function fMoment(i, g, text, withImg, repost) {
    var e = fBase(i, g, 10);
    e.resourceId = 510001 + i; e.coverUrl = withImg ? FOLLOW_COVER : '';
    e.likeCount = 10 + i; e.commentCount = 2 + i; e.bananaCount = 1 + i;
    // 互动态（0.9.96 详情面板写链夹具）：有真有假，赞/蕉状态机才测得到两向
    e.isLike = i % 3 === 0; e.isThrowBanana = false;
    e.moment = { momentId: 510001 + i, text: text };
    // 多图（0.9.98 实报修复「多图只出第一张」）：withImg='multi' 时给嵌套 imgs[]（紧凑
    // 三件套形状，§2.1.1 实测；顶层 coverUrl 仍=首图恒等律）——卡面应出九宫格而非单图。
    // 0.9.105：单图动态也必须带 imgs（契约「图像权威=imgs」，顶层 cover 不再作兜底渲染）
    if (withImg === 'multi') {
      e.moment.imgs = [1, 2, 3].map(function () {
        return { url: FOLLOW_COVER, expandedUrl: FOLLOW_COVER, originUrl: FOLLOW_COVER, width: 100, height: 100, type: 1 };
      });
    } else if (withImg) {
      e.moment.imgs = [{ url: FOLLOW_COVER, expandedUrl: FOLLOW_COVER, originUrl: FOLLOW_COVER, width: 100, height: 100, type: 1 }];
    }
    // 转发源（0.9.92 卡面形态夹具）：实测 repostSource 是完整分支条目，且转发的 coverUrl
    // 恒等于源封面——夹具照此构形（源封面与顶层封面同值），卡面才测得到「不拿源封面当主视觉」
    if (repost) {
      e.coverUrl = FOLLOW_COVER;
      // 0.9.102：源条补 user（@源UP 行夹具——rSource 形状与关注流同款）与计数（内嵌源卡时长/播放数）
      if (repost === 'video') e.repostSource = { resourceType: 2, resourceId: 488900, caption: '被转发的视频标题', coverUrl: FOLLOW_COVER, playDuration: '01:23', viewCount: 1234, user: { userId: 9001, userName: '源UP甲', userHead: PANEL_AVATAR } };
      // 转发动态（0.9.98 实测关注流实存）：源条 resourceType=10，源正文/源首图都在源嵌套 moment 里
      else if (repost === 'moment') e.repostSource = {
        resourceType: 10, resourceId: 510091,
        user: { userId: 9002, userName: '源UP乙', userHead: PANEL_AVATAR },
        // 源多图 2 张（0.9.107 实报样本形态：外层 5104362 → 源 5104327 imgs=2）
        moment: { momentId: 510091, text: '被转发的动态正文[emot=acfun,2/]带[at uid=9]@某人[/at]',
          imgs: [FOLLOW_COVER, FOLLOW_COVER].map(function (u) {
            return { url: u, expandedUrl: u, originUrl: u, width: 100, height: 100 };
          }) }
      };
      else e.repostSource = { resourceType: 3, resourceId: 488700, articleTitle: '被转发的文章标题', coverUrl: FOLLOW_COVER, viewCount: 567, user: { userId: 9003, userName: '源UP丙', userHead: PANEL_AVATAR } };
    }
    return e;
  }
  var FOLLOW_P1 = [
    // 今天（group 1）：3 视频 + 3 动态 + 1 文章 + 1 条未观察类型（4 → 应被过滤）
    fVideo(0, 1, '关注视频甲'), fMoment(1, 1, '动态正文带 UBB[at uid=1001]@关注UP1[/at]与表情[emot=acfun,1/]', true),
    fArticle(2, 1, '关注文章甲'), fVideo(3, 1, '关注视频乙'),
    // 无图动态正文刻意写长：展开/收起的溢出探测夹具（0.9.99）——前缀「无图动态」是
    // detail-open 场景的定位锚，截断不得动它
    fMoment(4, 1, '无图动态：只有文字的一条' + new Array(40).join('这条动态的正文刻意写得很长，用来验证展开按钮的溢出探测与钳高切换，'), false),
    fVideo(5, 1, '关注视频丙'), fMoment(6, 1, '另一条图文动态 #测试话题# ac488900', 'multi'),
    (function () { var e = fBase(7, 1, 4); e.resourceId = 488999; e.caption = '未观察类型应被过滤'; return e; })(),
    // 昨天（group 2）：2 视频 + 2 动态 + 2 文章
    fVideo(8, 2, '昨天的视频'), fArticle(9, 2, '昨天的文章'), fMoment(10, 2, '昨天的动态', true),
    fVideo(11, 2, '昨天的视频二'), fArticle(12, 2, '昨天的文章二'), fMoment(13, 2, '转发视频的动态：说说理由', true, 'video'),
    // 更早（group 10）：3 视频 + 2 动态 + 1 文章
    fVideo(14, 10, '更早的视频'), fMoment(15, 10, '更早的动态', true, 'moment'), fArticle(16, 10, '更早的文章'),
    fVideo(17, 10, '更早的视频二'), fMoment(18, 10, '转发文章的动态', true, 'article'), fVideo(19, 10, '更早的视频三')
  ];
  var FOLLOW_P2 = [
    fVideo(20, 10, '续页视频'), fArticle(21, 10, '续页文章'), fMoment(22, 10, '续页动态', true), fVideo(23, 10, '续页视频二')
  ];

  window.__ACSV_MY_MOCK__ = {
    // view-my/view-zone/view-follow 场景组装 __ACSV_MOCK_FORM__ 用（harness.html）
    // 关注流（0.9.91）：pcursor=0 取首屏，其余取第二页（游标语义与真实端点一致：响应回带新游标）
    'feed/followFeedV2': function (body, url) {
      window.__ACSV_FOLLOW_CALLS__ = (window.__ACSV_FOLLOW_CALLS__ || 0) + 1;
      var cur = (String(url).match(/pcursor=([^&]*)/) || [])[1] || '0';
      if (cur === '0') return { result: 0, feedList: FOLLOW_P1, pcursor: '1790785548652' };
      return { result: 0, feedList: FOLLOW_P2, pcursor: '' };
    },
    // 关注视频流（0.9.99 follow-videos）：官方视频 tab 端点。实测 §2.1.2：count 被忽略
    // 固定每页 10、终页 pcursor='no_more'——夹具照此构形（页1 10 条 / 页2 4 条+no_more）
    'feed/followDougaFeed': function (body, url) {
      var cur = (String(url).match(/pcursor=([^&]*)/) || [])[1] || '0';
      function fv(n) {
        return {
          resourceType: 2, resourceId: n, caption: '关注视频' + n, coverUrl: FOLLOW_COVER,
          playDuration: '00:2' + (n % 10), viewCount: 500 + n % 100,
          likeCount: 8, commentCount: 2, bananaCount: 3, shareCount: 1,
          createTime: Date.now() - n * 3600 * 1000, createTimeGroup: 1,
          user: { userId: 2000 + n % 5, userName: '视频UP' + n % 5, userHead: PANEL_AVATAR, isFollowing: true }
        };
      }
      if (cur === '0') {
        var p1 = [];
        for (var a = 488911; a <= 488920; a++) p1.push(fv(a));
        return { result: 0, feedList: p1, pcursor: '1790785548000', pageSize: 10 };
      }
      var p2 = [];
      for (var b = 488921; b <= 488924; b++) p2.push(fv(b));
      return { result: 0, feedList: p2, pcursor: 'no_more', pageSize: 10 };
    },
    // 广场流（0.9.126 view-square）：feedSquare——**首页不传 pcursor**（URL 无 query 即首页）；
    // 续页返回 `时间戳:时间戳` 游标；页2 含一条超 24h（26h）验证窗口剔除+即止；互动态恒 false
    // 照实测（免登录），createTime 绝对毫秒
    'feed/feedSquare': function (body, url) {
      function sq(n, hours, imgs) {
        return {
          resourceType: 10, createTime: Date.now() - hours * 3600 * 1000,
          likeCount: 3 + n, commentCount: 2 + n, bananaCount: 1 + n, shareCount: n,
          isLike: false, isThrowBanana: false,
          moment: { momentId: String(5105000 + n), text: '广场动态' + n + ' [emot=acfun,1/]', imgs: imgs || [] },
          user: { userId: 3000 + n, userName: '广场UP' + n, userHead: PANEL_AVATAR, nameColor: 0 }
        };
      }
      if (String(url).indexOf('pcursor=') === -1) {
        // 广场动态2 带图（0.9.128 member-plaza 场景）：无壳大图浮层断言的落点
        var p1s = [sq(1, 1), sq(2, 2, [{ url: FOLLOW_COVER, expandedUrl: FOLLOW_COVER, originUrl: FOLLOW_COVER }]), sq(3, 5), sq(4, 20)];
        // 发现态轮询断言用（view-square S3）：置位后首页多出一条「刚发」的动态（momentId 更大）
        if (window.__ACSV_SQUARE_EXTRA__) p1s.unshift(sq(8, 0.2));
        return { result: 0, feedList: p1s, pcursor: '1790785548652:1790785548652' };
      }
      if (String(url).indexOf('1790785548652') > -1) {
        return { result: 0, feedList: [sq(6, 23), sq(7, 26)], pcursor: 'no_more' };
      }
      return { result: 0, feedList: [], pcursor: 'no_more' };
    },
    // 行内写链桩（0.9.99 view-follow 的互动行断言；detail-open 会用同名桩覆盖出更全的一套）
    'token/get': function () { return { result: 0, 'acfun.midground.api_st': 'mock-st' }; },
    'interact/add': function () { return { result: window.__ACSV_LIKE_FAIL__ ? 0 : 1 }; },
    'interact/delete': function () { return { result: window.__ACSV_LIKE_FAIL__ ? 0 : 1 }; },
    // 投蕉桩（0.9.104：数量层断言用）——成功码 0（AppAPI.throwBanana 判 result===0）；
    // body 记到 __ACSV_BAN_BODY__ 供 resourceType（视频=2/文章=3）与 count 断言
    'banana/throwBanana': function (body) {
      window.__ACSV_BAN_BODY__ = String(body || '');
      return { result: 0 };
    },
    // 子频道树：官方树形状裁剪（children cid+navName），zone 视图选频道后填子频道 chips
    'page/queryNavigators': {
      result: 0,
      data: ['全站综合', '动画', '娱乐', '生活', '音乐', '舞蹈·偶像', '游戏', '科技', '影视', '体育', '鱼塘'].map(function (n, i) {
        return {
          navName: n, cid: [0, 1, 60, 201, 58, 123, 59, 70, 68, 69, 125][i],
          children: [{ cid: 900 + i, navName: n + '子频道' }, { cid: 901 + i, navName: n + '子频道二' }]
        };
      })
    },
    'browse/history/list': function (body) {
      window.__ACSV_HIST_CALLS__ = (window.__ACSV_HIST_CALLS__ || 0) + 1; // 切 Tab 不重拉断言用
      var page = Number((String(body).match(/pageNo=(\d+)/) || [])[1] || 1);
      return { result: 0, totalCount: 22, histories: page === 1 ? HIST_P1 : HIST_P2 };
    },
    // 我的页资料头（0.9.69）：§4.4 getUserCardList 实测形状。计数器供场景断言
    // 「二次进入命中缓存、不重复打接口」。following/followed→关注/粉丝 语义待真机核对
    'user/getUserCardList': function () {
      window.__ACSV_CARD_CALLS__ = (window.__ACSV_CARD_CALLS__ || 0) + 1;
      return {
        result: 0,
        users: [{
          id: 42, name: '测试用户',
          headUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
          signature: '签名第一行<br/>第二行', contentCount: 12, following: 34, followed: 56
        }]
      };
    },
    'favorite/folder/list': {
      result: 0,
      dataList: [
        { folderId: 111, name: '默认收藏夹', resourceCount: 2 },
        { folderId: 222, name: '夹二', resourceCount: 1 }
      ]
    },
    'favorite/resource/dougaList': function (body) {
      var fid = (String(body).match(/folderId=(\d+)/) || [])[1];
      var n = fid === '222' ? 1 : 2;
      var rows = [];
      for (var m = 0; m < n; m++) rows.push(favEntry(m));
      return { result: 0, total: n, favoriteList: rows };
    },
    // rank/channel 命中计数（0.9.79）：view-zone 断言「二次进入命中首屏缓存、不重打接口」用
    'rank/channel': function (body, url) {
      window.__ACSV_RANK_CALLS__ = (window.__ACSV_RANK_CALLS__ || 0) + 1;
      return rankList(url);
    },
    // 搜索页 SSR（0.9.72）：真机结构裁剪片段（未转义形态；真机 \" 转义形态由单测覆盖）。
    // 命中计数供 harness 断言「空词不发请求」。
    // 0.9.82：UP 段按真机形态补全 .video__main__user 包裹（a[href=/u/uid] > img.user-avatar
    // + span.user-name）——解析器要在这里取 uid 与头像，缺了这层就只能拿到名字
    'search?keyword=': function () {
      window.__ACSV_SEARCH_CALLS__ = (window.__ACSV_SEARCH_CALLS__ || 0) + 1;
      return [
        '<div class="search-video">',
        '<a href="/v/ac40742636"><img src="https://img.example/1.png?imageView2/1/w/160/h/90"/><span class="video__duration">02:04</span></a>',
        '<div class="video__main__title"><a href="/v/ac40742636">热门小说推荐</a></div>',
        '<div class="video__main__info"><div class="video__main__user"><a href="/u/73156935">'
          + '<img class="user-avatar" src="' + PANEL_AVATAR + '"/><span class="user-name">晨澜每日分享</span></a></div>',
        '<span class="info__view-count">2037次播放</span><span class="info__create-time">2023-02-24</span></div></div>',
        '<div class="search-video">',
        '<a href="/v/ac41033414"><img src="https://img.example/2.png"/><span class="video__duration">02:52</span></a>',
        '<div class="video__main__title"><a href="/v/ac41033414">#小说推荐#宝藏小说</a></div>',
        '<div class="video__main__info"><div class="video__main__user"><a href="/u/73156936">'
          + '<img class="user-avatar" src="' + PANEL_AVATAR + '"/><span class="user-name">西瓜推文</span></a></div>',
        '<span class="info__view-count">1459次播放</span><span class="info__create-time">2023-04-02</span></div></div>',
        '<div class="search-video">',
        '<a href="/v/ac41023197"><img src="https://img.example/3.png"/><span class="video__duration">03:05</span></a>',
        '<div class="video__main__title"><a href="/v/ac41023197">一口气看完《苏沅念裴以桉》</a></div>',
        '<div class="video__main__info"><span class="user-name">误为微物迁</span>',
        '<span class="info__view-count">1029次播放</span><span class="info__create-time">2025-12-05</span></div></div>'
      ].join('\n');
    },
    // resolve 链两段（GET，经 request() 同样命中 mockHit）：面板条目点击回竖刷要跑通
    'douga/info': function (body, url) {
      var id = (url.match(/dougaId=(\d+)/) || [])[1] || '0';
      return {
        result: 0, title: '测试视频' + id, description: '', tagList: [], channel: null,
        // uploadTime = 稿件上传时刻（实测语义，**不是**发布时刻）——放进 videoList[0]
        videoList: [{ id: 7700000 + Number(id) % 100000, uploadTime: UPLOAD_TIME }],
        // user 形状 = 2026-10-03 真机实测（dougaId=42527415）：id 是**字符串**、头像在 headUrl
        // （与 meow/首页卡片同键名）——回填链要按这个形状读，历史/深链的真实头像就来自这里
        user: { id: '9', name: '测试UP', headUrl: RESOLVE_AVATAR, isFollowing: false },
        likeCount: 12, bananaCount: 3, commentCount: 4, viewCount: 56, stowCount: 7, shareCount: 8,
        danmakuCount: 9,
        // 时间字段按实测形态摆两个**诱饵**（0.9.85）：站方展示的发布时刻在 createTimeMillis，
        // 顶层 createTime 只是展示串（近期稿件是相对文案）。若实现回退去读 createTime（或
        // slice 它）或误用 uploadTime，播放层日期槽就会露出下面这些值，断言立刻红
        createTime: '24小时前',
        createTimeMillis: PUBLISH_TIME,
        isLike: false, isFavorite: false, isThrowBanana: false
      };
    },
    'playInfo': function () {
      // cast 接口的 playUrls 是字符串数组（区别于 meow videoUrls 的 {url} 对象形态）
      return { playInfo: { streams: [{ qualityLabel: '1080P', fps: 30, playUrls: [window.__ACSV_TEST_WEBM__ || ''] }] } };
    }
  };
})();
