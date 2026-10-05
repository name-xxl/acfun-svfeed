// searchfmt.js 单元测试（0.9.161 自 data.test.js 迁入，用例逐字保持）：
// 搜索三端点规整（0.9.151）：真机样本形状（docs/api-research.md §4.10）——样本取自
// 内置浏览器实测回包（2026-10-04，「星际」）。Node 内置 test 运行器，零网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { searchVideoPageOf, searchUserPageOf, searchArticlePageOf } = await import('../../src/searchfmt.js');

// 样本取自内置浏览器实测回包（2026-10-04，「星际」）：顶层 totalNum（总数）/pageSize 30/
// pageNum（**总页数**）；emTitle 的 <em> 高亮由规整层一律剥成纯文本。
test('searchVideoPageOf：emTitle 剥高亮 + 封面/时长/播放文案剥后缀/作者四件套/日期 + total', () => {
  var j = {
    result: 0, totalNum: 600, pageSize: 30, pageNum: 20,
    videoList: [
      {
        contentId: 16485171, videoId: '13425768', title: '《星际穿越》', emTitle: '《<em>星际</em>穿越》',
        coverUrl: 'https://tx-free-imgs.acfun.cn/o_x.jpeg?imageslim', playDuration: '02:41',
        viewCount: 113511, viewCountInfo: '11.4万次播放', danmuCount: 230, commentCount: 283,
        userName: '神龙士力架', userId: 1597840, userImg: 'https://tx-free-imgs.acfun.cn/u.jpg?imageslim',
        ctime: new Date(2020, 5, 28, 13, 20, 30).getTime(), channelId: 206, itemType: 2
      },
      { contentId: 0, title: 'X 无 acId 应被跳过' }
    ]
  };
  var pg = searchVideoPageOf(j);
  assert.equal(pg.total, 600);
  assert.equal(pg.items.length, 1);
  assert.deepEqual(pg.items[0], {
    acId: 16485171,
    title: '《星际穿越》', // <em> 剥掉
    cover: 'https://tx-free-imgs.acfun.cn/o_x.jpeg?imageslim',
    dur: '02:41',
    views: '11.4万', // 「次播放」后缀剥掉
    up: { id: 1597840, name: '神龙士力架', img: 'https://tx-free-imgs.acfun.cn/u.jpg?imageslim', isFollowing: false },
    dateText: '2020-06-28'
  });
});

test('searchVideoPageOf：空/缺列表退空表（调用方出空态，不崩不伪造）', () => {
  assert.deepEqual(searchVideoPageOf(null), { items: [], total: 0 });
  assert.deepEqual(searchVideoPageOf({ result: 0, videoList: [] }), { items: [], total: 0 });
});

test('searchUserPageOf：计数串优先（fansCountStr/contentCountStr）+ 最近投稿 dougaFeedList 规整', () => {
  var j = {
    result: 0, totalNum: 63, pageSize: 30, pageNum: 3,
    userList: [
      {
        userId: 14266286, userName: '星际老男孩SCBOY', emTitle: '<em>星际</em>老男孩SCBOY',
        userImg: 'https://tx-free-imgs.acfun.cn/u2.jpg?imageslim',
        fansCount: 14288, fansCountStr: '1.4万', contentCount: 177, contentCountStr: '177',
        signature: '这里是黄旭东与孙一峰的官方山头，大家一起谐起来！',
        isFollowing: false, verifiedTypes: [],
        dougaFeedList: [
          {
            videoId: '28091169', contentId: '35099706', caption: '【星际老男孩】谐星语录之节奏的搬运工',
            coverUrls: ['https://tx-free-imgs.acfun.cn/c1.jpeg?imageslim'], playDuration: '02:09',
            contributeTime: '2022-06-01', type: 2
          },
          { videoId: 'x', caption: 'X 无 contentId 应被跳过' }
        ]
      },
      // 无 userName 的条目：名字回落 emTitle 并剥标签；两个计数字段都缺 → 留空
      { userId: 2, emTitle: '<em>星</em>探' }
    ]
  };
  var pg = searchUserPageOf(j);
  assert.equal(pg.total, 63);
  assert.equal(pg.items.length, 2);
  assert.deepEqual(pg.items[0], {
    uid: 14266286,
    name: '星际老男孩SCBOY',
    avatar: 'https://tx-free-imgs.acfun.cn/u2.jpg?imageslim',
    fans: '1.4万',
    contrib: '177',
    signature: '这里是黄旭东与孙一峰的官方山头，大家一起谐起来！',
    following: false,
    recents: [{
      acId: 35099706,
      title: '【星际老男孩】谐星语录之节奏的搬运工',
      cover: 'https://tx-free-imgs.acfun.cn/c1.jpeg?imageslim',
      dur: '02:09',
      dateText: '2022-06-01'
    }]
  });
  assert.equal(pg.items[1].name, '星探'); // emTitle 剥标签
  assert.equal(pg.items[1].fans, '');
  assert.deepEqual(pg.items[1].recents, []);
});

test('searchArticlePageOf：无封面文本条（标题剥高亮/摘要/阅读/评论/频道/日期）', () => {
  var j = {
    result: 0, totalNum: 100, pageSize: 30, pageNum: 4,
    articleList: [
      {
        contentId: 3231907, title: '围棋已无挑战性：谷歌要让AlphaGo玩《星际争霸》',
        emTitle: '围棋已无挑战性：谷歌要让AlphaGo玩《<em>星际</em>争霸》',
        decr: '素材来源于网络，侵权删除', userId: 3328282, userName: '寄昙说',
        viewCount: 203065, viewCountInfo: '20.3万', commentCount: 549, commentCountInfo: '549',
        channelName: '生活', itemType: 3, ctime: new Date(2016, 10, 5, 22, 35, 58).getTime()
      },
      { contentId: 0, title: 'X 无 id 应被跳过' }
    ]
  };
  var pg = searchArticlePageOf(j);
  assert.equal(pg.total, 100);
  assert.equal(pg.items.length, 1);
  assert.deepEqual(pg.items[0], {
    id: 3231907,
    title: '围棋已无挑战性：谷歌要让AlphaGo玩《星际争霸》',
    decr: '素材来源于网络，侵权删除',
    uid: 3328282,
    name: '寄昙说',
    views: '20.3万',
    comments: '549',
    channel: '生活',
    dateText: '2016-11-05'
  });
  assert.deepEqual(searchArticlePageOf(null), { items: [], total: 0 });
});
