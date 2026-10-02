// data.js 面板条目契约单元测试：Node 内置 test 运行器，零依赖。
// 契约（0.9.62，字段依据 docs/api-research.md 实测）：panelItem 三来源规整成
// { acId,title,cover,progress,sub,kind }；非视频条目（番剧形态/无 videoId/文章）返回 null
// ——无 douga resolve 链，进竖刷必炸，宁可漏不错；homeItemOf 产出懒解析 home 契约；
// deepLinkOf（0.9.72）= 地址栏深链的 id 空间判据（meow 详情 / douga 详情二选一）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { panelItem, homeItemOf, deepLinkOf, relTime, fmtWan, meCardOf, parseSearchItems } = await import('../../src/data.js');

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
    upName: '晨澜每日分享',
    dateText: '2023-02-24'
  });
  assert.equal(items[1].acId, 41033414);
  assert.equal(items[1].dur, '16:55');
  assert.equal(items[1].views, '14.0万'); // 「阅读」后缀剥掉
  assert.equal(items[1].upName, 'UP & 名');
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
