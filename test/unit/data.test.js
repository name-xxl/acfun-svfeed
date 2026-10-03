// data.js 面板条目契约单元测试：Node 内置 test 运行器，零依赖。
// 契约（0.9.62，字段依据 docs/api-research.md 实测）：panelItem 三来源规整成
// { acId,title,cover,progress,sub,up,kind }；非视频条目（番剧形态/无 videoId/文章）返回 null
// ——无 douga resolve 链，进竖刷必炸，宁可漏不错；homeItemOf 产出懒解析 home 契约；
// deepLinkOf（0.9.72）= 地址栏深链的 id 空间判据（meow 详情 / douga 详情二选一）。
// 作者契约（0.9.82）：所有来源的作者只有一个出口 up{id,name,img,isFollowing}|null
// （字段白名单与"禁止回流扁平旧名"的闸门在 contract.test.js）
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { panelItem, homeItemOf, playItemOf, normalize, normalizeHome, deepLinkOf, relTime, fmtDate, fmtAgo, fmtWan, meCardOf, parseSearchItems, followVideoPageOf, momentPiOfRepost } = await import('../../src/data.js');

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
test('panelItem fav：contentId/contentTitle 落位，续看秒数入 progress，作者入 up 契约', () => {
  var pi = panelItem('fav', {
    contentId: 46651052, contentTitle: '收藏视频', contentImg: 'https://img.example/y.jpg',
    userPlayedSeconds: 65, userName: '收藏UP', userId: 1234,
    userImg: 'https://img.example/fav-up.jpg', stows: 12
  });
  assert.equal(pi.acId, 46651052);
  assert.equal(pi.title, '收藏视频');
  assert.equal(pi.progress, 65);
  // 作者（0.9.82）：docs §4.2 实测条目自带 userName/userId/userImg——进 up 契约，
  // sub 不再承载作者（此前与历史的「观看至xx:xx」共用同一字段）
  assert.deepEqual(pi.up, { id: 1234, name: '收藏UP', img: 'https://img.example/fav-up.jpg', isFollowing: false });
  assert.equal(pi.sub, '');
});

test('panelItem fav：无 userName 时 up 为 null（作者未知不伪造）', () => {
  var pi = panelItem('fav', { contentId: 1, contentTitle: 't', userPlayedSeconds: 0 });
  assert.equal(pi.progress, null);
  assert.equal(pi.up, null);
});

test('panelItem fav：contentCreateTime（稿件上传时刻）→ 带年份日期；updateTime 不用', () => {
  var pi = panelItem('fav', {
    contentId: 1, contentTitle: 't',
    contentCreateTime: new Date(2026, 8, 26, 21, 39, 18).getTime(), // 真机实测值（上传时刻）
    updateTime: Date.now() - 60 * 1000                             // 记录 1 分钟前刚变过，不该被采用
  });
  assert.equal(pi.dateText, '2026-09-26'); // 带年份（0.9.85：老投稿必须能判年）
  assert.doesNotMatch(pi.dateText, /分钟前/); // 用的是 contentCreateTime，不是 updateTime
  assert.equal(panelItem('fav', { contentId: 1, contentTitle: 't' }).dateText, '');
  assert.equal(panelItem('fav', { contentId: 1, contentTitle: 't', contentCreateTime: 'x' }).dateText, '');
});

test('panelItem history：作者由 histories[].user 映射进 up（0.9.84 实测形状；id 是字符串要归一）', () => {
  var pi = panelItem('history', {
    resourceType: 2, videoId: 900001, resourceId: 48820714, title: '测试视频', playedSecondsShow: '观看至02:47',
    user: { id: '25380695', name: '羽兰明月_01', headUrl: '//imgs.aixifan.com/u.jpg', isFollowing: true }
  });
  assert.deepEqual(pi.up, {
    id: 25380695, name: '羽兰明月_01', img: 'https://imgs.aixifan.com/u.jpg', isFollowing: true
  });
  // 缺 user（坏例/降级）时 up 为 null——作者未知不伪造，进播放层后由 resolve 回填
  assert.equal(panelItem('history', {
    resourceType: 2, videoId: 900002, resourceId: 48820715, title: '无作者'
  }).up, null);
});

test('panelItem history：browseTime 近三天走相对文案、更早带年份；缺省/脏值给空串', () => {
  var pi = panelItem('history', {
    resourceType: 2, videoId: 1, resourceId: 2, title: 't',
    browseTime: Date.now() - 3 * 3600 * 1000
  });
  // 与榜单 meta 同款断法：3 小时前文案随运行的日历位置而变（凌晨跑则为「昨天HH时MM分」）
  assert.match(pi.dateText, /^(3小时前|昨天\d{1,2}时\d{2}分)$/);
  // 更早（10 天前）→ 退回**带年份**的绝对日期（relTime 的"更早"档只有「M月D日 H时MM分」，
  // 老内容看不出年份——0.9.85 用户实报"点进去才看得到年份"）
  var old = panelItem('history', {
    resourceType: 2, videoId: 1, resourceId: 2, title: 't',
    browseTime: Date.now() - 10 * 86400000
  });
  assert.match(old.dateText, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(panelItem('history', { resourceType: 2, videoId: 1, resourceId: 2, title: 't' }).dateText, '');
  assert.equal(panelItem('history', {
    resourceType: 2, videoId: 1, resourceId: 2, title: 't', browseTime: 'abc'
  }).dateText, '');
  // 未来时间（时钟偏差）同样降级空串，不输出「-1小时前」这种假文案
  assert.equal(panelItem('history', {
    resourceType: 2, videoId: 1, resourceId: 2, title: 't', browseTime: Date.now() + 86400000
  }).dateText, '');
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
  assert.equal(pi.up.isFollowing, false); // 榜单卡片不带关注态，进播放层后由 douga/info 回填
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

// ---------- fmtDate / fmtAgo（0.9.85：本地时区日期 + 带年份判定的时间文案） ----------
// 时区不可注入（Date 的本地时区在进程里固定），所以断言用**本地分量**构造期望值：
// `new Date(2026, 9, 2, 1, 25)` 在任务时区下就是本地 2026-10-02 01:25，任何时区都成立
test('fmtDate：本地时区 YYYY-MM-DD（补零），不是 UTC 口径；脏值空串', () => {
  var ms = new Date(2026, 9, 2, 1, 25, 0).getTime(); // 本地 2026-10-02 01:25
  assert.equal(fmtDate(ms), '2026-10-02');
  assert.equal(fmtDate(new Date(2026, 0, 5, 9, 5, 0).getTime()), '2026-01-05'); // 月份/日补零
  // UTC 口径在这一刻会落到前一天（UTC+8 下 01:25 本地 = 前一日 17:25 UTC）——fmtDate 必须跟本地走
  var utc = new Date(ms).toISOString().slice(0, 10);
  if (utc !== '2026-10-02') assert.notEqual(fmtDate(ms), utc);
  assert.equal(fmtDate(0), '');
  assert.equal(fmtDate('abc'), '');
  assert.equal(fmtDate(null), '');
});

test('fmtAgo：今天/昨天/前天走相对文案，更早退回带年份日期；脏输入/未来空串', () => {
  var now = new Date(2026, 9, 3, 12, 0, 0).getTime(); // 本地 2026-10-03 12:00
  assert.equal(fmtAgo(new Date(2026, 9, 3, 11, 30, 0).getTime(), now), '30分钟前');
  assert.equal(fmtAgo(new Date(2026, 9, 3, 6, 0, 0).getTime(), now), '6小时前');
  assert.equal(fmtAgo(new Date(2026, 9, 2, 20, 36, 0).getTime(), now), '昨天20时36分');
  assert.equal(fmtAgo(new Date(2026, 9, 1, 14, 2, 0).getTime(), now), '前天14时02分');
  assert.equal(fmtAgo(new Date(2026, 8, 26, 21, 39, 0).getTime(), now), '2026-09-26'); // 更早 → 带年
  assert.equal(fmtAgo(new Date(2025, 2, 5, 10, 0, 0).getTime(), now), '2025-03-05');   // 跨年同样带年
  assert.equal(fmtAgo(0, now), '');
  assert.equal(fmtAgo('abc', now), '');
  assert.equal(fmtAgo(now + 86400000, now), ''); // 未来（时钟偏差）不输出假文案
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

// ---------- 作者契约（0.9.82）：两个 normalize 与面板→播放的桥 ----------
test('normalize/normalizeHome：作者落 up 三件套；user 缺失或无名无 id → up 为 null', () => {
  var sv = normalize({ meowId: 7, meowTitle: 't', user: { userId: 5, name: 'UP', headUrl: '//i/a.jpg' } });
  assert.deepEqual(sv.up, { id: 5, name: 'UP', img: 'https://i/a.jpg', isFollowing: false });
  assert.equal(sv.userName, undefined); // 扁平旧名已退役（禁回流见 contract.test.js）
  assert.equal(sv.head, undefined);

  var hm = normalizeHome({ href: '9', title: 't2', user: { userId: 6, name: 'UP2', headUrl: '//i/b.jpg', isFollowing: true } });
  assert.deepEqual(hm.up, { id: 6, name: 'UP2', img: 'https://i/b.jpg', isFollowing: true });
  assert.equal(hm.isFollowing, undefined); // 关注态随作者一起进 up

  // 作者未知：不再编造 '未知用户' 占位（本次缺陷的文案源头）
  assert.equal(normalize({ meowId: 8, user: {} }).up, null);
  assert.equal(normalizeHome({ href: '10', user: {} }).up, null);
  assert.equal(normalizeHome({ href: '11', user: { name: '   ' } }).up, null); // 空白名不当作作者
});

test('playItemOf：面板条目 → 播放条目，作者只做四件套归一（榜单作者卡扩展字段不带进层）', () => {
  var item = playItemOf({
    acId: 48820714, title: '标题', cover: 'https://i/c.jpg',
    up: { id: 700, name: '榜单UP', img: 'https://i/u.jpg', isFollowing: false, fans: 33235, sign: '签名' }
  });
  assert.equal(item.kind, 'home');
  assert.equal(item.id, 48820714);
  assert.equal(item.title, '标题');
  assert.deepEqual(item.up, { id: 700, name: '榜单UP', img: 'https://i/u.jpg', isFollowing: false });
  assert.equal(item.cap.lazyResolve, true);
  // 面板不带作者（历史）：up 留 null，等 resolve 回填——不再退化成 '未知用户'
  var h = playItemOf({ acId: 1, title: '历史条目', cover: '' });
  assert.equal(h.up, null);
  assert.equal(playItemOf({ acId: 2, title: 't', up: { name: '只有名字' } }).up.name, '只有名字');
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
  assert.equal(it.up, null); // 面板条目建造时无作者（0.9.82：null 而非 '未知用户' 占位）
});

// ---------- deepLinkOf（0.9.72 深链 id 空间判据） ----------
test('deepLinkOf：meow 命中（有直链）→ sv 源，原样置顶', () => {
  var meow = { kind: 'sv', id: 48820714, urls: ['https://v.example/a.mp4'] };
  var hit = deepLinkOf(meow, null, '48820714');
  assert.equal(hit.source, 'sv');
  assert.equal(hit.item, meow); // 同一对象，不做拷贝（置顶即入缓冲）
});

test('deepLinkOf：meow 无直链不算命中（sv 直链随详情下发，空即不可播）', () => {
  assert.equal(deepLinkOf({ kind: 'sv', id: 1, urls: [] }, null, '1'), null);
});

test('deepLinkOf：meow 未命中 → 回落 ac（douga 详情）并造懒解析 home 条目', () => {
  var hit = deepLinkOf(null, { result: 0, videoList: [{ id: 'v1' }], title: '标题', coverUrl: 'https://i/c.jpg' }, '42455525');
  assert.equal(hit.source, 'home');
  assert.equal(hit.item.kind, 'home');
  assert.equal(hit.item.id, 42455525); // id 取请求用的 acId（resolve 要用它回查）
  assert.equal(hit.item.title, '标题');
  assert.equal(hit.item.cover, 'https://i/c.jpg');
  assert.deepEqual(hit.item.urls, []); // 直链留给懒解析链补
  assert.equal(hit.item.cap.lazyResolve, true);
});

test('deepLinkOf：meow 与 ac 双命中时 meow 优先（裸链接探测的优先级基准）', () => {
  var meow = { kind: 'sv', id: 7, urls: ['https://v.example/a.mp4'] };
  var douga = { result: 0, videoList: [{ id: 'v1' }], title: 'ac 标题' };
  assert.equal(deepLinkOf(meow, douga, '7').source, 'sv');
});

test('deepLinkOf：douga 形态不合格一律未命中（result≠0 / videoList 空 / 无回包）', () => {
  assert.equal(deepLinkOf(null, { result: 1, videoList: [{ id: 'v1' }] }, '1'), null);
  assert.equal(deepLinkOf(null, { result: 0, videoList: [] }, '1'), null);
  assert.equal(deepLinkOf(null, { result: 0 }, '1'), null);
  assert.equal(deepLinkOf(null, null, '1'), null);
  assert.equal(deepLinkOf(null, undefined, '1'), null);
});

// ---------- parseSearchItems（0.9.72 搜索页 SSR HTML → 视频条目） ----------
// fixture 按真机实测结构裁剪（2026-10-02 抓 www.acfun.cn/search）：只吃 .search-video 区段，
// 文章区/UP 投稿等其它 /v/ac 链接不得混入
test('parseSearchItems：区段收窄 + 字段落位（时长/播放/UP/日期/封面）+ acId 去重 + 坏段跳过', () => {
  var html = [
    '<div class="article__main">',
    '<a href="/a/ac4414392" data-click-log=\'{"cont_type":"article","content_id":4414392,"title":"文章干扰条目"}\'>文章干扰条目</a>',
    '</div>',
    '<div class="search-video" data-exposure-log=\'{"content_id":40742636}\'>',
    '<div class="cover"><a href="/v/ac40742636" target="_blank" data-click-log=\'{"cont_type":"douga","content_id":40742636,"title":"热门小说推荐"}\'>',
    '<img src="https://tx-free-imgs.acfun.cn/newUpload/x_1.png?imageView2/1/w/160/h/90"/><span class="video__duration">02:04</span></a></div>',
    '<div class="video__main"><div class="video__main__title"><a href="/v/ac40742636" target="_blank">热门小说推荐</a></div>',
    '<div class="video__main__info"><div class="video__main__user"><a href="/u/73156935"><img class="user-avatar" src="a.png"/><span class="user-name">晨澜每日分享</span></a></div>',
    '<span class="info__view-count">2037次播放</span><span class="info__danmaku-count">0条弹幕</span><span class="info__create-time">2023-02-24</span></div></div></div>',
    '<div class="search-video" data-exposure-log=\'{"content_id":40742636}\'>',
    '<a href="/v/ac40742636"><img src="d.png"/><span class="video__duration">01:00</span></a>',
    '<div class="video__main__title"><a href="/v/ac40742636">重复条目</a></div></div>',
    '<div class="search-video">',
    '<a href="/v/ac99999"><img src="e.png"/></a>',
    '<div class="video__main__title"><a href="/v/ac99999">   </a></div></div>',
    '<div class="search-video">',
    '<a href="/v/ac41033414"><img src="https://x/y.png?a=1&amp;b=2"/><span class="video__duration">16:55</span></a>',
    '<div class="video__main__title"><a href="/v/ac41033414">标题带&amp;实体</a></div>',
    '<div class="video__main__info"><span class="user-name">UP &amp; 名</span>',
    '<span class="info__view-count">14.0万阅读</span><span class="info__create-time">2021-05-01</span></div></div>'
  ].join('\n');
  var items = parseSearchItems(html);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    acId: 40742636,
    title: '热门小说推荐',
    cover: 'https://tx-free-imgs.acfun.cn/newUpload/x_1.png?imageView2/1/w/160/h/90',
    dur: '02:04',
    views: '2037',
    // UP 段收窄到 .video__main__user：uid 与头像一并取回（0.9.82）——此时才可能进播放层
    // 就带 @名字 链接、头像与关注按钮；封面 <img> 与头像 <img> 同卡，收窄是硬要求
    up: { id: 73156935, name: '晨澜每日分享', img: 'a.png', isFollowing: false },
    dateText: '2023-02-24'
  });
  assert.equal(items[1].acId, 41033414);
  assert.equal(items[1].dur, '16:55');
  assert.equal(items[1].views, '14.0万'); // 「阅读」后缀剥掉
  // 变体页缺 .video__main__user 外层包裹：名字兜底回落到全段匹配，但 uid/头像不猜（为 null）
  assert.deepEqual(items[1].up, { id: 0, name: 'UP & 名', img: '', isFollowing: false });
  assert.equal(items[1].title, '标题带&实体');
  assert.equal(items[1].cover, 'https://x/y.png?a=1&b=2');
});

test('parseSearchItems：真机转义形态（\\" 反转义）可解析；空/非 HTML/无结果退空数组', () => {
  var esc = '<div class=\\"search-video\\"><a href=\\"/v/ac123\\"><img src=\\"c.png\\"/></a>'
    + '<div class=\\"video__main__title\\"><a href=\\"/v/ac123\\">转义条目</a></div></div>';
  var items = parseSearchItems(esc);
  assert.equal(items.length, 1);
  assert.equal(items[0].acId, 123);
  assert.equal(items[0].title, '转义条目');
  assert.equal(items[0].cover, 'c.png');
  assert.deepEqual(parseSearchItems(''), []);
  assert.deepEqual(parseSearchItems(null), []);
  assert.deepEqual(parseSearchItems('<html><body>没有搜索结果</body></html>'), []);
});

// ---------- 图片字段归一（0.9.76）：http 老条目在 https 页面会被混合内容拦成裂图 ----------
test('panelItem/meCardOf：封面与头像 http:// 与协议相对 // 一律升 https', () => {
  var h = panelItem('history', {
    resourceType: 2, videoId: 1, resourceId: 2, title: 'T',
    cover: 'http://tx-free-imgs.acfun.cn/a.jpg'
  });
  assert.equal(h.cover, 'https://tx-free-imgs.acfun.cn/a.jpg');
  var f = panelItem('fav', { contentId: 1, contentTitle: 'F', contentImg: '//imgs.aixifan.com/b.jpg' });
  assert.equal(f.cover, 'https://imgs.aixifan.com/b.jpg');
  var r = panelItem('rank', {
    contentType: 2, contentId: 3, contentTitle: 'R',
    videoCover: 'http://x/y.jpg', userName: 'UP', authorId: 1, userImg: '//imgs.aixifan.com/u.jpg'
  });
  assert.equal(r.cover, 'https://x/y.jpg');
  assert.equal(r.up.img, 'https://imgs.aixifan.com/u.jpg');
  var card = meCardOf({ result: 0, users: [{ id: 7, name: 'U', headUrl: 'http://imgs.aixifan.com/h.jpg' }] }, '7');
  assert.equal(card.avatar, 'https://imgs.aixifan.com/h.jpg');
  // 缺省不伪造：空字段仍是空串（渲染层判空不挂图）
  assert.equal(panelItem('history', { resourceType: 2, videoId: 1, resourceId: 2, title: 'T' }).cover, '');
});

test('parseSearchItems：data-src/data-original 懒加载形态优先于 src（src 可能是占位图）', () => {
  var html = '<div class="search-video"><a href="/v/ac777">'
    + '<img src="data:image/gif;base64,PLACEHOLDER" data-src="http://tx-free-imgs.acfun.cn/real.jpg"/></a>'
    + '<div class="video__main__title"><a href="/v/ac777">懒加载条目</a></div></div>'
    + '<div class="search-video"><a href="/v/ac778">'
    + '<img data-original="https://tx-free-imgs.acfun.cn/real2.jpg" src="a.png"/></a>'
    + '<div class="video__main__title"><a href="/v/ac778">data-original 条目</a></div></div>';
  var items = parseSearchItems(html);
  assert.equal(items.length, 2);
  assert.equal(items[0].cover, 'https://tx-free-imgs.acfun.cn/real.jpg'); // 升 https + 不取占位图
  assert.equal(items[1].cover, 'https://tx-free-imgs.acfun.cn/real2.jpg');
});

// ---------- panelItem: follow（0.9.91 关注流，形状实测 docs/api-research.md §2.1.1） ----------
test('panelItem follow：视频条目——时长是展示串直用、作者取 userHead、时间走 fmtAgo', () => {
  var pi = panelItem('follow', {
    resourceType: 2, resourceId: 48887520, caption: '心月狐的闪身boom？',
    coverUrl: 'https://tx-free-imgs.acfun.cn/x.jpg', playDuration: '00:11', viewCount: 832,
    createTime: Date.now() - 2 * 3600 * 1000,
    user: { userId: 12229455, userName: '一只芸喵喵', userHead: 'https://tx-free-imgs.acfun.cn/h.jpg', isFollowing: true }
  });
  assert.equal(pi.ct, 'video');
  assert.equal(pi.kind, 'follow');
  assert.equal(pi.acId, 48887520);
  assert.equal(pi.title, '心月狐的闪身boom？');
  assert.equal(pi.dur, '00:11'); // 展示串直用（不格式化——实测 typeof string）
  assert.equal(pi.views, '832');
  assert.equal(pi.up.name, '一只芸喵喵');
  assert.equal(pi.up.img, 'https://tx-free-imgs.acfun.cn/h.jpg'); // 头像是 userHead（不是 headUrl）
  assert.equal(pi.up.isFollowing, true);
  assert.match(pi.dateText, /小时前$/);
  assert.equal(pi.href, undefined); // 视频进播放层，无外链
});

test('panelItem follow：互动行数值态（0.9.99）——三族 share + 视频赞/蕉数值与互动态', () => {
  var u = { user: { userId: 1, userName: 'u' } };
  var v = panelItem('follow', Object.assign({
    resourceType: 2, resourceId: 48888718, caption: '朽叶', coverUrl: 'c.jpg',
    playDuration: '00:13', viewCount: 1001, createTime: Date.now() - 3600 * 1000,
    likeCount: 36, commentCount: 6, bananaCount: 126, shareCount: 0,
    isLike: true, isThrowBanana: false
  }, u));
  // 仿原生互动行（行内写链）的数值态：字段名对齐 rail 词汇（§2.1.1/§2.1.2 顶层实测）
  assert.equal(v.like, 36);
  assert.equal(v.comment, 6);
  assert.equal(v.banana, 126);
  assert.equal(v.share, 0);
  assert.equal(v.liked, true);
  assert.equal(v.thrown, false);
  var a = panelItem('follow', Object.assign({
    resourceType: 3, resourceId: 48868671, articleTitle: 't', coverUrl: '',
    likeCount: 1, commentCount: 2, bananaCount: 3, shareCount: 4, createTime: Date.now()
  }, u));
  assert.equal(a.share, 4); // 文章行内赞/蕉只读，但计数照常展示
  var m = panelItem('follow', Object.assign({
    resourceType: 10, resourceId: 5103843, coverUrl: '',
    likeCount: 2, commentCount: 3, bananaCount: 4, shareCount: 5,
    moment: { momentId: 5103843, text: 'x' }
  }, u));
  assert.equal(m.share, 5);
});

test('followVideoPageOf（0.9.99 §2.1.2）：单页规整——只收 type2、终判 no_more、空页兜底', () => {
  var page = followVideoPageOf({
    feedList: [
      { resourceType: 2, resourceId: 48888718 },
      { resourceType: 10, resourceId: 5104409 }, // 非视频：宁漏不错滤掉
      { resourceType: 2, resourceId: 0 },        // 缺 id：丢弃
      { resourceType: 2, resourceId: 48890001 }
    ],
    pcursor: '1790824871458'
  });
  assert.deepEqual(page.items, [{ id: 48888718 }, { id: 48890001 }]);
  assert.equal(page.nextCursor, '1790824871458');
  assert.equal(page.noMore, false);
  // 实测终值（极老游标回 1 条 + no_more）
  var end = followVideoPageOf({ feedList: [{ resourceType: 2, resourceId: 4424929 }], pcursor: 'no_more' });
  assert.equal(end.noMore, true);
  assert.equal(end.nextCursor, '');
  // 空壳/空页兜底同判
  assert.equal(followVideoPageOf({ feedList: [] }).noMore, true);
  assert.equal(followVideoPageOf(null).noMore, true);
});

test('panelItem follow：文章条目——articleTitle + 外链落点 articleBase', () => {
  var pi = panelItem('follow', {
    resourceType: 3, resourceId: 48868671, articleTitle: '天涯此时共明月 DD歌回唱团圆',
    beginParagraph: '又是一年团圆时节，又想听家人们动人的歌喉了',
    coverUrl: 'https://tx-free-imgs.acfun.cn/a.jpg', viewCount: 7669, createTime: Date.now() - 5 * 60000,
    user: { userId: 23682490, userName: 'AC娘本体', userHead: 'h.jpg' }
  });
  assert.equal(pi.ct, 'article');
  assert.equal(pi.acId, 48868671);
  assert.equal(pi.title, '天涯此时共明月 DD歌回唱团圆');
  assert.equal(pi.views, '7669');
  assert.equal(pi.href, 'https://www.acfun.cn/a/ac48868671');
  // 摘要=beginParagraph（description 那条是空串，不是摘要源——0.9.93 文章卡的主体）
  assert.equal(pi.desc, '又是一年团圆时节，又想听家人们动人的歌喉了');
  assert.equal(pi.dur, undefined); // 文章无时长角标
});

test('panelItem follow：动态条目——momentId 身份、UBB 原文进 text、三计数进 meta、外链 /moment/am', () => {
  var pi = panelItem('follow', {
    resourceType: 10, resourceId: 5104008,
    coverUrl: 'https://tx-free-imgs.acfun.cn/m.jpg',
    discoveryResourceFeedShowContent: '列表用正文[表情]',
    likeCount: 6, commentCount: 0, bananaCount: 0,
    isLike: true, isThrowBanana: false,
    createTime: Date.now() - 4 * 3600 * 1000,
    moment: { momentId: 5104008, text: '拿我和教授级别专业老师比较[emot=acfun,1656/]感到很荣幸', replaceUbbText: '拿我和教授级别专业老师比较[表情]感到很荣幸' },
    user: { userId: 11361784, userName: '潇湘huya', userHead: 'h.jpg' }
  });
  assert.equal(pi.ct, 'moment');
  assert.equal(pi.acId, 0);
  assert.equal(pi.momentId, 5104008);
  // 正文用嵌套 moment.text（UBB 原文），不用 replaceUbbText 的明文占位版
  assert.match(pi.text, /\[emot=acfun,1656\/\]/);
  assert.equal(pi.href, 'https://www.acfun.cn/moment/am5104008');
  assert.deepEqual(pi.meta, [{ k: 'like', t: '6' }, { k: 'comment', t: '0' }, { k: 'banana', t: '0' }]);
  // 数值态（0.9.96 详情面板写链）：字段名对齐 rail 词汇；缺 isLike/isThrowBanana 时落 false
  assert.equal(pi.like, 6);
  assert.equal(pi.comment, 0);
  assert.equal(pi.banana, 0);
  assert.equal(pi.liked, true);
  assert.equal(pi.thrown, false);
  assert.equal(pi.views, undefined); // 动态不挂播放数角标（实测 viewCount 恒 0，是噪音不是信息）
  assert.equal(pi.up.name, '潇湘huya');
});

test('panelItem follow：动态多图——嵌套 moment.imgs 映射 {url,big}，无图条目 imgs 为空数组', () => {
  var u = { user: { userId: 1, userName: 'u' } };
  var pi = panelItem('follow', Object.assign({
    resourceType: 10, resourceId: 5103843, coverUrl: 'https://tx-free-imgs.acfun.cn/first.jpeg',
    likeCount: 1, commentCount: 2, bananaCount: 3,
    moment: {
      momentId: 5103843, text: '多图正文',
      // 形状实测（2026-10-03 §2.1.1）：url=224 方缩略、expandedUrl=大图、originUrl=原图
      imgs: [
        { url: 'https://tx-free-imgs.acfun.cn/a.jpeg?imageView2/5/w/224/h/224', expandedUrl: 'https://tx-free-imgs.acfun.cn/a.jpeg?imageView2/2/w/0', originUrl: 'https://tx-free-imgs.acfun.cn/a.jpeg' },
        { url: 'https://tx-free-imgs.acfun.cn/b.jpeg?imageView2/5/w/224/h/224', expandedUrl: 'https://tx-free-imgs.acfun.cn/b.jpeg?imageView2/2/w/0' }
      ],
      // 冗长形状 imgInfos 与 imgs 同信息——解析器刻意不取（一物二源必漂移），给个诱饵验证
      imgInfos: [{ thumbnailImageCdnUrl: 'https://decoy.example/x' }]
    }
  }, u));
  assert.equal(pi.ct, 'moment');
  assert.equal(pi.imgs.length, 2);
  assert.equal(pi.imgs[0].url, 'https://tx-free-imgs.acfun.cn/a.jpeg?imageView2/5/w/224/h/224');
  assert.equal(pi.imgs[0].big, 'https://tx-free-imgs.acfun.cn/a.jpeg?imageView2/2/w/0');
  // big 优先 expandedUrl；该条给了 expandedUrl 没给 originUrl——逐级回落到 expandedUrl
  assert.equal(pi.imgs[1].big, 'https://tx-free-imgs.acfun.cn/b.jpeg?imageView2/2/w/0');
  var pi2 = panelItem('follow', Object.assign({
    resourceType: 10, resourceId: 5104409, coverUrl: '',
    moment: { momentId: 5104409, text: '无配图' } // 无配图时接口整个不给 imgs 字段
  }, u));
  assert.deepEqual(pi2.imgs, []);
});

test('panelItem follow：转发动态（rs10）——引用块取源正文明文 + 源首图', () => {
  var u = { user: { userId: 1, userName: 'u' } };
  var pi = panelItem('follow', Object.assign({
    resourceType: 10, resourceId: 5104410, coverUrl: 'https://tx-free-imgs.acfun.cn/src-t.jpeg',
    moment: { momentId: 5104410, text: '转发理由' },
    repostSource: {
      resourceType: 10, resourceId: 510091,
      moment: {
        momentId: 510091, text: '源正文[emot=acfun,2/]带[at uid=9]@某人[/at]',
        imgs: [{ url: 'https://tx-free-imgs.acfun.cn/src-t.jpeg' }]
      }
    }
  }, u));
  assert.equal(pi.repost.ct, 'moment');
  // 源正文走 ubbPlain 明文投影（表情码删除、at 留名字）——quote 块 title 是单行文本
  assert.equal(pi.repost.title, '源正文 带 @某人');
  // 源首图优先（imgs[0].url），缺图回落 rs 顶层 coverUrl（转发恒等律）
  assert.equal(pi.repost.cover, 'https://tx-free-imgs.acfun.cn/src-t.jpeg');
  var pi2 = panelItem('follow', Object.assign({
    resourceType: 10, resourceId: 5104411, coverUrl: 'https://tx-free-imgs.acfun.cn/c.jpeg',
    moment: { momentId: 5104411, text: '转发理由二' },
    // rs 是完整分支条目：纯文字源动态没嵌套 imgs，顶层 coverUrl（=源封面恒等律）兜底
    repostSource: { resourceType: 10, resourceId: 510092, coverUrl: 'https://tx-free-imgs.acfun.cn/c.jpeg', moment: { momentId: 510092, text: '纯文字源动态' } }
  }, u));
  assert.equal(pi2.repost.ct, 'moment');
  assert.equal(pi2.repost.title, '纯文字源动态');
  assert.equal(pi2.repost.cover, 'https://tx-free-imgs.acfun.cn/c.jpeg');
});

test('panelItem follow：未知类型与缺身份字段一律 null（宁可漏不错）', () => {
  var u = { user: { userId: 1, userName: 'u' } };
  assert.equal(panelItem('follow', Object.assign({ resourceType: 4, resourceId: 9, caption: 'x' }, u)), null); // 直播等未观察类型
  assert.equal(panelItem('follow', Object.assign({ resourceType: 2, resourceId: 0, caption: 'x' }, u)), null); // 视频缺 id
  assert.equal(panelItem('follow', Object.assign({ resourceType: 10, resourceId: 0 }, u)), null);              // 动态缺 id
  assert.equal(panelItem('follow', Object.assign({ resourceType: 3, resourceId: 8 }, u)), null);              // 文章缺标题
  assert.equal(panelItem('follow', Object.assign({ resourceType: 10, resourceId: 8 }, u)), null);             // 动态缺正文
  assert.equal(panelItem('follow', null), null);
});

test('panelItem follow：作者缺失不伪造（up=null），动态回退 discoveryResourceFeedShowContent', () => {
  var pi = panelItem('follow', {
    resourceType: 10, resourceId: 7, discoveryResourceFeedShowContent: '只有列表正文', createTime: Date.now(), user: {}
  });
  assert.equal(pi.up, null);
  assert.equal(pi.text, '只有列表正文');
});

test('panelItem follow：转发源契约（ct/id/title/cover/up）；未知源类型不挂 repost', () => {
  function mom(rs) {
    return panelItem('follow', {
      resourceType: 10, resourceId: 5104252, coverUrl: 'https://tx-free-imgs.acfun.cn/源封面.jpg',
      likeCount: 1, commentCount: 2, bananaCount: 3, createTime: Date.now(),
      moment: { momentId: 5104252, text: '可以的，居然还有独家[emot=acfun,2766/]' },
      repostSource: rs, user: { userId: 1, userName: 'u', userHead: 'h' }
    });
  }
  // 0.9.101：源条可点——契约补 id（落点）与 up（播放层首帧作者 / 详情面板头像）；
  // 0.9.102（引用卡完全照原生）：视频/文章源再补 dur（展示串直用）/views（万格式，缺则不挂）
  var v = mom({
    resourceType: 2, resourceId: 488900, caption: '被转发的视频标题', coverUrl: 'https://tx-free-imgs.acfun.cn/视频封面.jpg',
    playDuration: '01:23', viewCount: 12345,
    user: { userId: 42, userName: '源UP', userHead: 'https://tx-free-imgs.acfun.cn/源头像.jpg' }
  });
  assert.deepEqual(v.repost, {
    ct: 'video', id: 488900, title: '被转发的视频标题', cover: 'https://tx-free-imgs.acfun.cn/视频封面.jpg',
    dur: '01:23', views: '1.2万',
    up: { id: 42, name: '源UP', img: 'https://tx-free-imgs.acfun.cn/源头像.jpg', isFollowing: false }
  });
  var a = mom({ resourceType: 3, resourceId: 488700, articleTitle: '被转发的文章标题', coverUrl: 'https://tx-free-imgs.acfun.cn/文章封面.jpg' });
  assert.deepEqual(a.repost, {
    ct: 'article', id: 488700, title: '被转发的文章标题', cover: 'https://tx-free-imgs.acfun.cn/文章封面.jpg',
    dur: '', views: '', // 缺字段不虚标（时长空串、播放数空串）
    up: null // 源条不带 user：作者契约不伪造（upOf 空输入 → null）
  });
  // 未观察的源类型（如直播 4）：不挂 repost（渲染层按「原创动态」出，不编造源类型）
  assert.equal(mom({ resourceType: 4, resourceId: 9, caption: 'x' }).repost, undefined);
  assert.equal(mom(null).repost, undefined);
});

test('momentPiOfRepost（0.9.102）：转发源 → 详情面板 pi 纯函数——透传 id/text/up/cover，计数给 0', () => {
  var pi = momentPiOfRepost({
    ct: 'moment', id: 510091, text: '源正文[emot=acfun,2/]', cover: 'https://tx-free-imgs.acfun.cn/c.jpg',
    up: { id: 7, name: '源UP', img: 'h.jpg', isFollowing: false }
  });
  assert.equal(pi.ct, 'moment');
  assert.equal(pi.momentId, 510091);
  assert.equal(pi.text, '源正文[emot=acfun,2/]');
  assert.equal(pi.href, 'https://www.acfun.cn/moment/am510091'); // momentBase 单源（0.9.102）
  assert.equal(pi.up.name, '源UP');
  assert.equal(pi.cover, 'https://tx-free-imgs.acfun.cn/c.jpg');
  // 计数未知给 0（面板互动栏不虚标）——评论区走管线真拉（sourceId=源 momentId）
  assert.deepEqual([pi.like, pi.comment, pi.banana, pi.liked, pi.thrown], [0, 0, 0, false, false]);
  // 空输入容错：up/cover 缺省不炸
  var bare = momentPiOfRepost({ id: 1 });
  assert.equal(bare.up, null);
  assert.equal(bare.text, '');
});
