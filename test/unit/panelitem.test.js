// panelitem.js 面板条目契约单元测试（0.9.162 自 data.test.js 终解拆入，用例逐字保持）：
// panelItem 五源解析器（history/fav/rank/follow/square，0.9.62–0.9.157 各版实测在案）+
// momentPiOfRepost（0.9.102）+ momentExtraOf（0.9.122）。Node 内置 test 运行器，零依赖。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { panelItem, momentPiOfRepost, momentExtraOf } = await import('../../src/panelitem.js');

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

test('panelItem：未知 kind 与缺 acId/标题一律 null', () => {
  assert.equal(panelItem('other', { a: 1 }), null);
  assert.equal(panelItem('fav', { contentId: 0, contentTitle: 't' }), null);
  assert.equal(panelItem('fav', { contentId: 5, contentTitle: '' }), null);
});

// ---------- 图片字段归一（0.9.76）：http 老条目在 https 页面会被混合内容拦成裂图 ----------
// （meCardOf 头像升级半边用例 0.9.160 随函数迁 mypage.test.js）
test('panelItem：封面 http:// 与协议相对 // 一律升 https', () => {
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
  // 缺省不伪造：空字段仍是空串（渲染层判空不挂图）
  assert.equal(panelItem('history', { resourceType: 2, videoId: 1, resourceId: 2, title: 'T' }).cover, '');
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
  // 2 小时前文案随运行的日历位置而变（凌晨跑则为「昨天HH时MM分」）——双档同 file 既有惯例
  //（0.9.104 半夜跑实锤：单档 /小时前$/ 每天 00:00~02:00 必红）
  assert.match(pi.dateText, /^(2小时前|昨天\d{1,2}时\d{2}分)$/);
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
    // 0.9.157：等级色位随 upOf 第 5 参随族透传（源条 user 缺 nameColor → 挂 0；名字三色体系）
    up: { id: 42, name: '源UP', img: 'https://tx-free-imgs.acfun.cn/源头像.jpg', isFollowing: false, nameColor: 0 }
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

// ---------- 广场（0.9.125）：feedSquare 条目与单页规整 ----------
test('panelItem square：feedSquare 条目——momentId 嵌在 moment 里、绝对 createTime、互动态照收', () => {
  var pi = panelItem('square', {
    resourceType: 10, createTime: Date.now() - 5 * 60000,
    likeCount: 2, commentCount: 3, bananaCount: 4, shareCount: 5,
    isLike: false, isThrowBanana: false,
    moment: { momentId: '5104327', text: '正文[emot=acfun,1/]', imgs: [{ url: 'a.png', originUrl: 'b.png' }] },
    user: { userId: 7, userName: '李四', userHead: 'h.png', nameColor: 2 }
  });
  assert.equal(pi.ct, 'moment');
  assert.equal(pi.momentId, 5104327);
  assert.equal(pi.kind, 'square');
  assert.equal(pi.text, '正文[emot=acfun,1/]');
  assert.equal(pi.imgs.length, 1);
  assert.equal(pi.imgs[0].big, 'b.png'); // expandedUrl 缺席 → originUrl 回退
  assert.equal(pi.href, 'https://www.acfun.cn/moment/am5104327');
  assert.equal(pi.up.name, '李四');
  assert.equal(pi.up.nameColor, 2); // 行名等级色透传（0.9.134；plaza 真机在册）
  assert.deepEqual([pi.like, pi.comment, pi.banana, pi.share], [2, 3, 4, 5]);
  assert.ok(pi.dateText.length > 0); // fmtAgo 文案在位
  // nameColor 缺失 → 挂 0（nameColorCss 不加色）；非 type10 / 缺 momentId / 缺正文 一律拒
  var pi0 = panelItem('square', { resourceType: 10, moment: { momentId: '5104328', text: 'x' }, user: { userId: 8, userName: '王五' } });
  assert.equal(pi0.up.nameColor, 0);
  assert.equal(panelItem('square', { resourceType: 2, resourceId: 1 }), null);
  assert.equal(panelItem('square', { resourceType: 10, moment: { text: '无id' } }), null);
  assert.equal(panelItem('square', { resourceType: 10, moment: { momentId: '5' } }), null);
});

test('panelItem follow：user.nameColor 透传（0.9.157 真机核对：followFeedV2 20/20、followDougaFeed 10/10 都带）', () => {
  function fe(nc) {
    var u = { userId: 9, userName: 'u', userHead: 'h', isFollowing: true };
    if (nc !== undefined) u.nameColor = nc;
    return { resourceType: 10, resourceId: 5100, createTime: Date.now() - 60000, user: u, moment: { momentId: 5100, text: 'x' } };
  }
  assert.equal(panelItem('follow', fe(1)).up.nameColor, 1);
  assert.equal(panelItem('follow', fe(2)).up.nameColor, 2);
  assert.equal(panelItem('follow', fe()).up.nameColor, 0); // 缺省挂 0（nameColorCss 不加色）
  // 转发源（repostSource.user 同族）同样透传
  var rp = { resourceType: 10, resourceId: 5200, createTime: Date.now() - 60000,
    user: { userId: 1, userName: '转发者', userHead: 'h' },
    moment: { momentId: 5200, text: '转发者正文' },
    repostSource: { resourceType: 10, resourceId: 510091, user: { userId: 2, userName: '源UP', userHead: 'h', nameColor: 2 },
      moment: { momentId: 510091, text: '源正文' } } };
  assert.equal(panelItem('follow', rp).repost.up.nameColor, 2);
});

// ---------- momentExtraOf（0.9.122 私信转发动态的 extra 载荷） ----------
test('momentExtraOf：momentId 优先 pi.momentId；图归一（big 回退 url、无 url 丢）限 9；up 只收 id/name', () => {
  var p = momentExtraOf({
    momentId: 5104327, href: 'https://www.acfun.cn/moment/am5104327',
    text: '[emot=acfun,1/]正文', up: { id: '7', name: '李四', isFollowing: true },
    imgs: [{ url: 'a.jpg' }, { url: 'b.jpg', big: 'b2.jpg' }, { url: '' }]
  });
  assert.equal(p.momentId, '5104327');
  assert.equal(p.text, '[emot=acfun,1/]正文');
  assert.equal(p.imgs.length, 2); // 无 url 的丢弃
  assert.equal(p.imgs[0].big, 'a.jpg'); // big 缺省回退 url
  assert.equal(p.imgs[1].big, 'b2.jpg');
  assert.deepEqual(p.up, { id: '7', name: '李四' }); // 只收 id/name（契约收窄）
});

test('momentExtraOf：momentId 缺省从 href 反推；超 9 图截断；脏输入不抛', () => {
  var p = momentExtraOf({
    href: 'https://www.acfun.cn/moment/am888',
    imgs: new Array(12).fill({ url: 'x.jpg' })
  });
  assert.equal(p.momentId, '888');
  assert.equal(p.imgs.length, 9);
  assert.equal(momentExtraOf(null).momentId, '');
  assert.equal(momentExtraOf({}).up, null);
  assert.equal(momentExtraOf({}).text, '');
});
