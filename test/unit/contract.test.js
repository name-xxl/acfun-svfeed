// 条目契约的机器闸门（0.9.82 统一条目模型）：把 data.js 里"两种内容源规整成同一份字段
// 契约"那句注释变成可执行断言。五条：
//   ① 面板各来源（panelItem 各 kind / searchVideoPageOf / viewPiOf）产出键 ⊆ ITEM_FIELDS.panel
//   ② 播放各来源（normalize / normalizeHome / playItemOf）产出键 ⊆ ITEM_FIELDS.play
//   ③ 播放契约顶层不得出现 userName/userId/head/isFollowing——作者只有一个出口 up
//   ④ up 形态固定四件套（id/name/img/isFollowing），来源私有的作者扩展字段不混进来
//   ⑤ viewPiOf 投影行为（0.9.211 批⑦收编）：守卫/kind 盖章/up 覆盖/id 容差/可选键真值落键
// ③ 是本次缺陷的防复发闸门：0.9.82 之前搜索传 upName、收藏把作者塞进 sub、榜单传 up、
// 播放契约又是扁平三件套，桥 itemOfPanel 只认其中一种，其余入口进播放层就退化成 '未知用户'。
// 字段**值**的真实性由 playitem.test.js/panelitem.test.js 钉；这里只关心键集合，所以 fixture 可以最小化。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { playItemOf, normalize, normalizeHome, ITEM_FIELDS } =
  await import('../../src/playitem.js');
var { panelItem, viewPiOf } = await import('../../src/panelitem.js'); // 面板契约件（0.9.162 data.js 终解；0.9.211 视图态投影）
var { searchVideoPageOf } = await import('../../src/searchfmt.js'); // 搜索规整 0.9.161 出库

// 已退役的扁平作者字段：出现在播放条目顶层即失败
var RETIRED = ['userName', 'userId', 'head', 'isFollowing'];

function outside(obj, list) { return Object.keys(obj).filter(function (k) { return list.indexOf(k) === -1; }); }

// 各来源最小 fixture（覆盖各自会填的每个字段分支）
var PANEL_CASES = {
  history: {
    resourceType: 2, videoId: 9, resourceId: 8, title: 't',
    playedSeconds: 5, playedSecondsShow: '观看至00:05'
  },
  fav: {
    contentId: 7, contentTitle: 't', contentImg: 'x',
    userPlayedSeconds: 3, userName: 'u', userId: 1, userImg: 'y'
  },
  rank: {
    dougaId: '6', contentType: 2, contentTitle: 't', contentDesc: 'd', videoCover: 'x',
    viewCount: 1, commentCount: 2, contributeTime: Date.now(), channelName: 'c',
    userName: 'u', authorId: 1, userImg: 'y', fansCount: 1, contributionCount: 1, userSignature: 's'
  },
  // 关注流（0.9.91）：动态条目是最宽的一套字段（ct/momentId/text/href/meta 全带）——
  // 契约白名单由它兜住；三类内容各自的取值落位由 playitem.test.js/panelitem.test.js 钉。
  // 0.9.98：moment.imgs（多图）与 rs10 转发也走 follow 解析器——白名单 'imgs' 由它兜住
  follow: {
    resourceType: 10, resourceId: 5, coverUrl: 'x', likeCount: 1, commentCount: 2, bananaCount: 3,
    createTime: Date.now(),
    moment: { text: '正文[emot=acfun,1/]', imgs: [{ url: 't.png', expandedUrl: 'b.png', originUrl: 'o.png' }] },
    repostSource: { resourceType: 10, resourceId: 6, moment: { text: '源正文', imgs: [{ url: 's.png' }] } },
    user: { userId: 9, userName: 'u', userHead: 'h' }
  },
  // 广场（0.9.125）：feedSquare 条目——无 resourceId（momentId 在 moment 里）、user 带
  // nameColor 扩展字段（白名单只认契约字段，扩展不混入）
  square: {
    resourceType: 10, createTime: Date.now(), likeCount: 1, commentCount: 2, bananaCount: 3,
    shareCount: 4, isLike: false, isThrowBanana: false,
    moment: { momentId: '5104327', text: '广场正文[emot=acfun,1/]', imgs: [{ url: 't.png', originUrl: 'o.png' }] },
    user: { userId: 9, userName: 'u', userHead: 'h', nameColor: 0 }
  }
};
// 搜索视频条目（0.9.151 起走 JSON 端点规整）：最小翻转样本覆盖规整器会填的每个字段分支
var SEARCH_J = {
  result: 0, totalNum: 1,
  videoList: [{
    contentId: 5, title: 't', emTitle: '<em>t</em>', coverUrl: 'c.png', playDuration: '01:00',
    viewCountInfo: '1次播放', userName: 'u', userId: 3, userImg: 'a.png',
    ctime: new Date(2026, 0, 1).getTime()
  }]
};

function playCases() {
  return {
    'normalize(sv)': normalize({
      meowId: 1, meowTitle: 't', user: { userId: 1, name: 'u' },
      playInfo: { videoUrls: [{ url: 'https://v.example/a.mp4' }] }
    }),
    normalizeHome: normalizeHome({ href: '2', title: 't', user: { userId: 2, name: 'u' } }),
    playItemOf: playItemOf({ acId: 3, title: 't', cover: '', up: { id: 3, name: 'u' } })
  };
}

test('契约①：面板各来源产出键 ⊆ 面板契约白名单', () => {
  Object.keys(PANEL_CASES).forEach(function (kind) {
    var pi = panelItem(kind, PANEL_CASES[kind]);
    assert.ok(pi, 'panelItem(' + kind + ') 应产出条目');
    assert.deepEqual(outside(pi, ITEM_FIELDS.panel), [], kind + ' 出现契约外字段');
  });
  var hits = searchVideoPageOf(SEARCH_J).items;
  assert.equal(hits.length, 1);
  assert.deepEqual(outside(hits[0], ITEM_FIELDS.panel), [], 'searchVideoPageOf 出现契约外字段');
  // 视图态投影（0.9.211 收编：searchview/jingxuanview 的 pi 构造单源）：产出键同样 ⊆ 白名单
  assert.deepEqual(outside(viewPiOf({ acId: 1, title: 't', cover: 'c', up: null, kind: 'search', dur: '01:00', views: '1', dateText: 'd' }, 'search'),
    ITEM_FIELDS.panel), [], 'viewPiOf 出现契约外字段');
  assert.deepEqual(outside(viewPiOf({ id: 2, title: 't', cover: '', up: { id: 2, name: 'u' } }),
    ITEM_FIELDS.panel), [], 'viewPiOf(vm 形) 出现契约外字段');
});

test('契约②：播放各来源产出键 ⊆ 播放契约白名单', () => {
  var cases = playCases();
  Object.keys(cases).forEach(function (name) {
    assert.deepEqual(outside(cases[name], ITEM_FIELDS.play), [], name + ' 出现契约外字段');
  });
});

test('契约③：播放契约顶层禁出现已退役的扁平作者字段（作者只有 up 一个出口）', () => {
  var cases = playCases();
  Object.keys(cases).forEach(function (name) {
    var it = cases[name];
    RETIRED.forEach(function (k) {
      assert.equal(k in it, false, name + '：顶层 ' + k + ' 已退役（0.9.82），作者只走 item.up');
    });
    assert.ok('up' in it, name + '：播放条目必须带 up 键（null = 作者未知，不编造占位）');
  });
});

test('契约④：up 形态固定四件套，来源私有的作者扩展字段不混入播放条目', () => {
  var item = playItemOf({
    acId: 1, title: 't',
    up: { id: 5, name: 'u', img: 'i', isFollowing: true, fans: 9, sign: 's' } // 榜单作者卡的扩展字段
  });
  assert.deepEqual(Object.keys(item.up).sort(), ['id', 'img', 'isFollowing', 'name']);
  assert.equal(item.up.fans, undefined);
  // 面板契约侧反之：作者卡要吃的扩展字段必须保留（两个契约的差异是事实）
  var rank = panelItem('rank', PANEL_CASES.rank);
  assert.equal(rank.up.fans, 1);
  assert.equal(rank.up.sign, 's');
});

// 视图态投影 viewPiOf（0.9.211 批⑦）：投影行为钉死——身份守卫/kind 盖章/up 覆盖/id 容差/
// 可选字段真值落键（缺键与空串在渲染层同形，但白名单闸门要键集合确定性）
test('契约⑤：viewPiOf 投影——守卫、盖章、覆盖、可选键', () => {
  // 无 acId（含 id 容差双空）→ null
  assert.equal(viewPiOf({ title: 't' }), null);
  assert.equal(viewPiOf(null), null);
  assert.equal(viewPiOf({ acId: 0, id: 0, title: 't' }), null);
  // id 字段容差（分区 vm 形）：id 落到 acId
  assert.equal(viewPiOf({ id: 7, title: 't' }).acId, 7);
  // kind 盖章：传了才落键（jingxuan 旧形无 kind 键，保持同形）
  assert.equal(viewPiOf({ acId: 1, title: 't' }).kind, undefined);
  assert.equal('kind' in viewPiOf({ acId: 1, title: 't' }), false);
  assert.equal(viewPiOf({ acId: 1, title: 't' }, 'search').kind, 'search');
  // up 覆盖：第三参在场即用（搜索 UP 卡最近作品）；undefined 透传源 up
  assert.equal(viewPiOf({ acId: 1, title: 't', up: null }, 'search', { id: 9, name: 'u' }).up.id, 9);
  assert.equal(viewPiOf({ acId: 1, title: 't', up: { id: 3, name: 'x' } }).up.id, 3);
  // 可选字段真值落键：空串/缺省不落键
  var bare = viewPiOf({ acId: 1, title: 't', dur: '', views: '', dateText: '' });
  assert.deepEqual(Object.keys(bare).sort(), ['acId', 'cover', 'title', 'up']);
  var full = viewPiOf({ acId: 1, title: 't', dur: '01:00', views: '1万', dateText: 'd' });
  assert.deepEqual(Object.keys(full).sort(), ['acId', 'cover', 'dateText', 'dur', 'title', 'up', 'views']);
});
