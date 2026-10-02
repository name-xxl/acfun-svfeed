// data.js 面板条目契约单元测试：Node 内置 test 运行器，零依赖。
// 契约（0.9.62，字段依据 docs/api-research.md 实测）：panelItem 三来源规整成
// { acId,title,cover,progress,sub,kind }；非视频条目（番剧形态/无 videoId/文章）返回 null
// ——无 douga resolve 链，进竖刷必炸，宁可漏不错；homeItemOf 产出懒解析 home 契约。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { panelItem, homeItemOf, relTime, fmtWan, meCardOf } = await import('../../src/data.js');

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
test('panelItem rank：contentType=2 收、3（文章）滤；meta 三段原生文案；desc <br> 折行；up 含万格式文案', () => {
  var pi = panelItem('rank', {
    dougaId: '48885202', contentType: 2, contentTitle: '榜单视频',
    contentDesc: '视频简介<br/>第二行', videoCover: 'https://img.example/z.jpg',
    bananaCount: 527, commentCount: 50, contributeTime: Date.now() - 3 * 3600000,
    viewCount: 2329,
    channelName: '生活日常', // 实测：子频道名在顶层 channelName（channel.name 同值）
    channel: { id: 86, name: '生活日常', parentId: 201, parentName: '生活' },
    userName: '榜单UP', authorId: 700, fansCount: 33235, contributionCount: 353,
    userImg: 'https://img.example/u.jpg', userSignature: '签名<br/>折行'
  });
  assert.equal(pi.acId, 48885202);
  // meta 三段（图标位 kind + 原生文案）：播放/评论原样数字（原生实测不做万缩写）
  assert.deepEqual(pi.meta[0], { k: 'view', t: '2329' });
  assert.deepEqual(pi.meta[1], { k: 'comment', t: '50' });
  assert.equal(pi.meta[2].k, 'time');
  // 3 小时前文案随测试运行的日历位置而变（今天=3小时前；凌晨运行则为「昨天HH时MM分」）；
  // 频道文案 = channelName + 「频道」（原生「生活日常频道」，0.9.69 真机对照修正）
  assert.match(pi.meta[2].t, /^发布于(3小时前|昨天\d{1,2}时\d{2}分) \/ 生活日常频道$/);
  assert.equal(pi.desc, '视频简介\n第二行'); // <br> 折行（原生同款，渲染层 pre-line）
  assert.equal(pi.up.id, 700);
  assert.equal(pi.up.name, '榜单UP');
  assert.equal(pi.up.fans, 33235);
  assert.equal(pi.up.contrib, 353);
  assert.equal(pi.up.fansText, '3.3万'); // 原生 up-card 万格式（去尾随 .0）
  assert.equal(pi.up.contribText, '353'); // 不过万原样
  assert.equal(pi.up.sign, '签名 折行'); // 签名不截（3 行裁切在 CSS）
  assert.equal(panelItem('rank', { dougaId: '1', contentType: 3, contentTitle: '文章' }), null);
});

test('panelItem rank：无时间/无频道时 meta 判空拼装（不留「发布于」孤字与悬空斜杠）', () => {
  var pi = panelItem('rank', { dougaId: '2', contentType: 2, contentTitle: 't', viewCount: 1, commentCount: 2, userName: 'u' });
  assert.deepEqual(pi.meta[0], { k: 'view', t: '1' });
  assert.equal(pi.meta[2].t, ''); // 无时间无频道
  var pi2 = panelItem('rank', { dougaId: '3', contentType: 2, contentTitle: 't2', channelName: '搞笑', userName: 'u' });
  assert.equal(pi2.meta[2].t, '搞笑频道'); // 只有频道：无「发布于」也无前导斜杠
  var pi3 = panelItem('rank', { dougaId: '4', contentType: 2, contentTitle: 't3', contributeTime: Date.now() - 60000, userName: 'u' });
  assert.match(pi3.meta[2].t, /^发布于(1分钟前|昨天\d{1,2}时\d{2}分)$/); // 无频道：无尾随斜杠
});

// ---------- relTime（0.9.69 原生四档；注入 now → 日历边界确定性） ----------
test('relTime：今天/昨天/前天/更早四档原生文案（H 不补零、MM 补零）', () => {
  var now = new Date(2026, 9, 2, 18, 43, 0).getTime(); // 2026-10-02 18:43 本地
  var at = (y, mo, d, h, mi, s) => new Date(y, mo, d, h, mi, s || 0).getTime();
  assert.equal(relTime(at(2026, 9, 2, 15, 43), now), '3小时前');
  assert.equal(relTime(at(2026, 9, 2, 18, 13), now), '30分钟前');
  assert.equal(relTime(at(2026, 9, 2, 18, 42, 30), now), '1分钟前'); // <1 分钟收 1 分钟
  assert.equal(relTime(at(2026, 9, 2, 9, 0), now), '9小时前');
  assert.equal(relTime(at(2026, 9, 1, 20, 36), now), '昨天20时36分');
  assert.equal(relTime(at(2026, 9, 1, 8, 0), now), '昨天8时00分'); // MM 补零
  assert.equal(relTime(at(2026, 9, 0, 16, 18), now), '前天16时18分'); // day=0 → 9-30
  assert.equal(relTime(at(2026, 8, 28, 18, 54), now), '9月28日 18时54分');
});

test('relTime：日历边界（跨零点/跨月/跨年按日期而非 24h 差）', () => {
  var at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi, 0).getTime();
  // 昨天 23:50 看今天 00:10：仅 20 分钟前，但按日历算「昨天」
  assert.equal(relTime(at(2026, 9, 1, 23, 50), at(2026, 9, 2, 0, 10)), '昨天23时50分');
  assert.equal(relTime(at(2026, 8, 30, 12, 0), at(2026, 9, 1, 12, 0)), '昨天12时00分'); // 跨月
  assert.equal(relTime(at(2025, 11, 31, 23, 30), at(2026, 0, 1, 1, 0)), '昨天23时30分'); // 跨年
  assert.equal(relTime(at(2026, 0, 30, 9, 5), at(2026, 1, 1, 9, 5)), '前天9时05分'); // 跨月前天
});

test('relTime：脏输入/未来时间降级空串', () => {
  var now = new Date(2026, 9, 2, 18, 43, 0).getTime();
  assert.equal(relTime(0, now), '');
  assert.equal(relTime(null, now), '');
  assert.equal(relTime('abc', now), '');
  assert.equal(relTime(now + 999999, now), '');
});

// ---------- fmtWan（0.9.69 UP 数据位；原生实测 33235→3.3万 / 29978→3万 / 6062 原样） ----------
test('fmtWan：<1万原样、≥1万一位小数「万」去尾随 .0、脏输入 0', () => {
  assert.equal(fmtWan(9999), '9999');
  assert.equal(fmtWan(6062), '6062');
  assert.equal(fmtWan(10000), '1万');
  assert.equal(fmtWan(10499), '1万');
  assert.equal(fmtWan(29978), '3万');
  assert.equal(fmtWan(33235), '3.3万');
  assert.equal(fmtWan(469000), '46.9万');
  assert.equal(fmtWan(0), '0');
  assert.equal(fmtWan(null), '0');
  assert.equal(fmtWan(NaN), '0');
});

test('panelItem：未知 kind 与缺 acId/标题一律 null', () => {
  assert.equal(panelItem('other', { a: 1 }), null);
  assert.equal(panelItem('fav', { contentId: 0, contentTitle: 't' }), null);
  assert.equal(panelItem('fav', { contentId: 5, contentTitle: '' }), null);
});

// ---------- meCardOf（0.9.69 我的页头部契约） ----------
test('meCardOf：按 uid 取条目，字段逐个落位（含签名 <br> 折空格）', () => {
  var j = { result: 0, users: [
    { id: 7, name: '别人', headUrl: 'x' },
    { id: 42, name: '我', headUrl: 'https://img.example/a.jpg', signature: '第一行<br/>第二行',
      contentCount: 12, following: 34, followed: 56 }
  ] };
  var me = meCardOf(j, '42');
  assert.equal(me.uid, 42);
  assert.equal(me.name, '我');
  assert.equal(me.avatar, 'https://img.example/a.jpg');
  assert.equal(me.sign, '第一行 第二行');
  assert.equal(me.contrib, 12);
  assert.equal(me.follow, 34);
  assert.equal(me.fans, 56);
});

test('meCardOf：缺省字段一律 null（不伪造），uid 不在回包时退第一条', () => {
  var me = meCardOf({ result: 0, users: [{ id: 9, name: '只有名字' }] }, '42');
  assert.equal(me.uid, 9);
  assert.equal(me.contrib, null);
  assert.equal(me.follow, null);
  assert.equal(me.fans, null);
  assert.equal(me.sign, '');
  assert.equal(me.avatar, '');
});

test('meCardOf：失败/空回包/无 users 一律 null（调用方据此不渲染头部）', () => {
  assert.equal(meCardOf({ result: 1 }, '42'), null);
  assert.equal(meCardOf({ result: 0, users: [] }, '42'), null);
  assert.equal(meCardOf(null, '42'), null);
  assert.equal(meCardOf({ result: 0, users: [{ name: '无id' }] }, '42'), null);
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
