// view-my / view-zone 场景的接口 mock 快照（0.9.62）。
// 形状 = docs/api-research.md 实测响应裁剪：历史条目 resourceType=2 且带 videoId（该体系
// 编码与收藏/榜单不同源）、dougaList 列表键 favoriteList、rank contentType 2=视频 3=文章。
// 坏例条目（番剧形态/无 videoId）专测 panelItem 契约过滤——宁可漏不错。
(function () {
  var HIST_VIDS = [];
  for (var i = 0; i < 18; i++) {
    HIST_VIDS.push({
      resourceType: 2, videoId: 900000 + i, resourceId: 488900 + i,
      title: '测试历史视频' + i, cover: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      playedSeconds: 100 + i, playedSecondsShow: '观看至01:4' + (i % 10)
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
      title: '测试历史视频续' + j, cover: '', playedSeconds: 30, playedSecondsShow: '观看至00:30'
    });
  }
  function favEntry(n) {
    return {
      contentId: 489100 + n, contentTitle: '测试收藏视频' + n, contentImg: '',
      userPlayedSeconds: 65 + n, userName: '收藏UP', stows: 12
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
        contentTitle: '榜单' + name + '-' + period + '-' + k, videoCover: '',
        contentDesc: '简介' + k, bananaCount: 500 - k, viewCount: 3000 - k * 10,
        commentCount: 40 - k, contributeTime: now - (k + 1) * 3600000,
        channel: { parentName: name, channelName: name },
        userName: '榜单UP' + (k % 2), authorId: 700 + (k % 2), fansCount: 8000 - k * 100,
        contributionCount: 300 - k * 10, userImg: '', userSignature: '签名' + k
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
      var page = Number((String(body).match(/pageNo=(\d+)/) || [])[1] || 1);
      return { result: 0, totalCount: 22, histories: page === 1 ? HIST_P1 : HIST_P2 };
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
    'rank/channel': function (body, url) { return rankList(url); },
    // resolve 链两段（GET，经 request() 同样命中 mockHit）：面板条目点击回竖刷要跑通
    'douga/info': function (body, url) {
      var id = (url.match(/dougaId=(\d+)/) || [])[1] || '0';
      return {
        result: 0, title: '测试视频' + id, description: '', tagList: [], channel: null,
        videoList: [{ id: 7700000 + Number(id) % 100000 }],
        user: { id: 9, name: '测试UP', isFollowing: false },
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
