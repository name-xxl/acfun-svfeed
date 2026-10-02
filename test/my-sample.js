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
  // 观看历史条目作者（0.9.84 真机实测形状）：histories[].user 与 douga/info 的 user 同形状
  // ——id 是**字符串**、名字在 name、头像在 headUrl。故意与回包 mock 的名字（测试UP）不同，
  // 才能断言"首帧作者来自列表 API、回包后被详情覆写"
  // browseTime 实测是毫秒时间戳（1790961102971 / typeof number）→ 卡片脚行右槽的相对时间
  function histUser(i) {
    return { id: String(25380695 + i), name: '历史UP', headUrl: PANEL_AVATAR, isFollowing: false };
  }
  var HIST_AGO = Date.now() - 5 * 60 * 1000; // 5 分钟前：相对时间文案稳定落在「N分钟前」
  var HIST_VIDS = [];
  for (var i = 0; i < 18; i++) {
    HIST_VIDS.push({
      resourceType: 2, videoId: 900000 + i, resourceId: 488900 + i,
      title: '测试历史视频' + i, cover: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      playedSeconds: 100 + i, playedSecondsShow: '观看至01:4' + (i % 10),
      user: histUser(i), browseTime: HIST_AGO - i * 60000
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
      // 时间字段按实测补全（0.9.84）：contentCreateTime=投稿时间（毫秒戳，进卡片右槽）、
      // updateTime=记录最后变更（语义不纯，解析器**不采用**——这里给个"1 分钟前"的诱饵值，
      // 断言若误用 updateTime 就会露出「分钟前」被单测/场景抓住）
      contentCreateTime: Date.now() - 5 * 60 * 1000,
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

  window.__ACSV_MY_MOCK__ = {
    // view-my/view-zone 场景组装 __ACSV_MOCK_FORM__ 用（harness.html）
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
        videoList: [{ id: 7700000 + Number(id) % 100000 }],
        // user 形状 = 2026-10-03 真机实测（dougaId=42527415）：id 是**字符串**、头像在 headUrl
        // （与 meow/首页卡片同键名）——回填链要按这个形状读，历史/深链的真实头像就来自这里
        user: { id: '9', name: '测试UP', headUrl: RESOLVE_AVATAR, isFollowing: false },
        likeCount: 12, bananaCount: 3, commentCount: 4, viewCount: 56, stowCount: 7, shareCount: 8,
        danmakuCount: 9, createTime: '2026-10-01 00:00:00',
        isLike: false, isFavorite: false, isThrowBanana: false
      };
    },
    'playInfo': function () {
      // cast 接口的 playUrls 是字符串数组（区别于 meow videoUrls 的 {url} 对象形态）
      return { playInfo: { streams: [{ qualityLabel: '1080P', fps: 30, playUrls: [window.__ACSV_TEST_WEBM__ || ''] }] } };
    }
  };
})();
