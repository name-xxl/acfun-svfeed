// data.js 面板条目契约单元测试：Node 内置 test 运行器，零依赖。
// 契约（0.9.62，字段依据 docs/api-research.md 实测）：panelItem 三来源规整成
// { acId,title,cover,progress,sub,kind }；非视频条目（番剧形态/无 videoId/文章）返回 null
// ——无 douga resolve 链，进竖刷必炸，宁可漏不错；homeItemOf 产出懒解析 home 契约。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { panelItem, homeItemOf, relTime } = await import('../../src/data.js');

// ---------- panelItem: history ----------
test('panelItem history：resourceType=2 且有 videoId 才收，字段逐个落位', () => {
  var pi = panelItem('history', {
    resourceType: 2, videoId: 900001, resourceId: 48820714,
    title: '测试视频', cover: 'https://img.example/x.jpg',
    playedSeconds: 167, playedSecondsShow: '观看至02:47'
  });
  assert.equal(pi.acId, 48820714);
  assert.equal(pi.title, '测试视频');
  assert.equal(pi.cover, 'https://img.example/x.jpg');
  assert.equal(pi.progress, 167);
  assert.equal(pi.sub, '观看至02:47');
  assert.equal(pi.kind, 'history');
});

test('panelItem history：番剧形态与无 videoId 一律 null（编码不同源，宁可漏不错）', () => {
  assert.equal(panelItem('history', { resourceType: 3, videoId: 1, resourceId: 1, title: '番剧' }), null);
  assert.equal(panelItem('history', { resourceType: 2, videoId: null, resourceId: 2, title: '无videoId' }), null);
  assert.equal(panelItem('history', null), null);
});

// ---------- panelItem: fav ----------
test('panelItem fav：contentId/contentTitle 落位，续看秒数入 progress', () => {
  var pi = panelItem('fav', {
    contentId: 46651052, contentTitle: '收藏视频', contentImg: 'https://img.example/y.jpg',
    userPlayedSeconds: 65, userName: '收藏UP', stows: 12
  });
  assert.equal(pi.acId, 46651052);
  assert.equal(pi.title, '收藏视频');
  assert.equal(pi.progress, 65);
  assert.equal(pi.sub, '收藏UP');
});

test('panelItem fav：userPlayedSeconds 为 0/缺省时 progress 为 null', () => {
  var pi = panelItem('fav', { contentId: 1, contentTitle: 't', userPlayedSeconds: 0 });
  assert.equal(pi.progress, null);
});

// ---------- panelItem: rank ----------
test('panelItem rank：contentType=2 收、3（文章）滤；dougaId 字符串转数；sub 对齐原生 extra（蕉/评论/相对时间/频道）；up 信息落位', () => {
  var pi = panelItem('rank', {
    dougaId: '48885202', contentType: 2, contentTitle: '榜单视频',
    contentDesc: '视频简介<br/>第二行', videoCover: 'https://img.example/z.jpg',
    bananaCount: 527, commentCount: 50, contributeTime: Date.now() - 3 * 3600000,
    viewCount: 2329,
    channel: { parentName: '生活日常', channelName: '生活日常' },
    userName: '榜单UP', authorId: 700, fansCount: 8000, contributionCount: 300,
    userImg: 'https://img.example/u.jpg', userSignature: '签名<br/>折行'
  });
  assert.equal(pi.acId, 48885202);
  assert.equal(pi.sub, '2329 播放 · 50 评论 · 3小时前 / 生活日常'); // 原生 extra 首位=播放数非蕉数
  assert.equal(pi.desc, '视频简介 第二行'); // 官方简介 HTML <br> 折空格
  assert.equal(pi.up.id, 700);
  assert.equal(pi.up.name, '榜单UP');
  assert.equal(pi.up.fans, 8000);
  assert.equal(pi.up.contrib, 300);
  assert.equal(pi.up.sign, '签名 折行');
  assert.equal(panelItem('rank', { dougaId: '1', contentType: 3, contentTitle: '文章' }), null);
});

// ---------- relTime ----------
test('relTime：<24h 小时前、<7天 天前、其余 M月D日；脏输入降级空串', () => {
  var now = Date.now();
  assert.equal(relTime(now - 3600000 * 3), '3小时前');
  assert.equal(relTime(now - 3600000 * 25), '1天前');
  assert.equal(relTime(now - 3600000 * 24 * 6), '6天前');
  assert.match(relTime(now - 3600000 * 24 * 8), /^\d{1,2}月\d{1,2}日$/);
  assert.equal(relTime(0), '');
  assert.equal(relTime(null), '');
  assert.equal(relTime(now + 999999), ''); // 未来时间不显示
});

test('panelItem：未知 kind 与缺 acId/标题一律 null', () => {
  assert.equal(panelItem('other', { a: 1 }), null);
  assert.equal(panelItem('fav', { contentId: 0, contentTitle: 't' }), null);
  assert.equal(panelItem('fav', { contentId: 5, contentTitle: '' }), null);
});

// ---------- homeItemOf ----------
test('homeItemOf：产出懒解析 home 契约（id/cover 入位，urls 留空待 resolve）', () => {
  var it = homeItemOf(48820714, '标题', 'https://img.example/c.jpg');
  assert.equal(it.kind, 'home');
  assert.equal(it.stype, 3);
  assert.equal(it.id, 48820714);
  assert.equal(it.title, '标题');
  assert.equal(it.cover, 'https://img.example/c.jpg');
  assert.deepEqual(it.urls, []);
  assert.equal(it.cap.lazyResolve, true);
  assert.equal(it.resolving, false);
});
