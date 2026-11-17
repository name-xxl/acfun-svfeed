// test/cases/article.js —— harness 场景：文章阅读浮层（0.9.326 批；形态真源
// docs/preview/article-reader-v3.html）。两个登记场景（视口在 run-harness.mjs 钉）：
//   · article-reader        1600×900：开层 / 骨架 / 评论 stype=3 / 去重收缩 / composer / 回复 chip / 失败重试
//   · article-reader-narrow  540×900：窄态底栏收纳（⋯ 键 + 藏/蕉进弹层）+ 文末动作条仍可达
//
// 【开层接缝】契约钉死了模块与导出名（src/articleread.js ⇒ openArticleReader(pi) / closeArticleReader()），
// 未钉 harness 侧的触发口（入口范围稿内标「实现前列清」）。本场景体按序自行寻缝并把命中的缝名回写进
// rec info（寻不到缝 ⇒ article-* 全红且 info 直接列出候选，不靠猜）：
//   ① 句柄形态 testHook('articleread'|'articleReader'|…) ⇒ TEST.call(name) 返回 {open, close}
//      （imdrawer / momentdetail / playlayer 先例）；
//   ② 直调形态 TEST.call(name, pi)（momentEdit 先例：钩子体就是开层函数）；
//   ③ 全局形态 window.__ACSV_ARTICLE_SEAM__ = {open: openArticleReader, close: closeArticleReader}；
//   ④ 兜底 页面内 import('/src/articleread.js') 直调导出——该件依赖图只要牵到 styles.js→pack.js→
//      裸包名 'fflate'，浏览器解析必失败，故排最后（relation.js:19 的 popplace 先例是纯叶件才行）。
// 实现批最省事的一条：src/articleread.js 尾部加
//   testHook('articleread', function () { return { open: openArticleReader, close: closeArticleReader }; });
//
// 【数据 mock】文章页 HTML 走 net.requestText 的文本通道（net.js:96 契约：mock 命中吃字符串或 {html}），
// 故 __ACSV_MOCK_FORM__ 按 URL 子串桩掉；桩值里同时给 **window.articleInfo JSON**（§17.3 主路）与
// **#article-content 容器**（§17.3 DOM 兜底路），两条取数实现都吃得下。
// 两条夹具纪律（都是踩过的坑，别改）：
//   · 内嵌 JSON 里绝不出现分号 ⇒ 取数正则若是 uppage 那种非贪婪 `=\s*([\s\S]*?);` 会被正文里的
//     分号截断（夹具文案全用全角标点；探针件也刻意不带 ';'）；
//   · 内嵌 JSON 里的 </script> 一律转义成 <\/script>（JSON 合法转义，parse 后仍是真标签）⇒
//     DOMParser 路线不会提前终结内联脚本。
// 【评论管线】桩 comment/list 前先 delete window.__ACSV_MOCK__，否则 comments.js:219 直接吃内置
// mockComments（video 域夹具），stype=3 的定向桩与 sourceType 断言双双落空（detail-open 同款处置）。
// 【反跑】每条 rec 的「临时还原什么会转红」见文件末尾登记表。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  // ---------- 夹具常量（文案/计数/图链逐字取自确认稿；样本号取 §17.3 实测的 ac48868671） ----------
  var AR_ID = 48868671;
  var AR_ERR_ID = 48000000;            // 稿「前往原页」示意地址用的号，本场景当失败样本
  var AR_TITLE = '天涯此时共明月 DD歌回唱团圆';
  var AR_TITLE2 = '【长图勿刷】AC娘中秋摸鱼图鉴全公开';
  var AR_UP_NAME = 'AC娘本体';
  var AR_UP_ID = 23682490;
  var AR_PIC = 'https://imgs.aixifan.com/newUpload/23682490_3870ea2d5c7e4bcfb09b6b3699f6a560.jpg';
  var CMT_NAME1 = '一只芸喵喵';
  var CMT_TEXT1 = '先占楼许愿流心奶黄！去年的蛋黄莲蓉到现在还想，AC娘大气！';
  var CMT_TEXT2 = '歌单已经搓手期待了，《但愿人长久》求安排，中秋夜必到直播间。';
  var CMT_COUNT = 1024;               // 稿：共 1024 条评论
  var BAD_PIC_ALT = '坏图源留字';
  var BAD_LINK_TEXT = '坏链文字';
  var NESTED_TEXT = '嵌套脏件文字';
  var DIV_TEXT = '容器内正文';

  // ---------- 正文 SSR 夹具（白名单件 + 净化探针件混排） ----------
  function bodyHtml() {
    return '<p>又是一年团圆时节，AC娘在这里祝大家中秋快乐呀～今年 DD 歌回的主题就定为「唱团圆」，'
      + '欢迎各位歌手报名，把自己心里的那首「团圆」唱给大家听。</p>'
      + '<p>本篇文章下留言许愿你喜欢吃的月饼口味，因为想让你在中秋吃上本娘送的月饼呀[emot=acfun,95/][emot=zt,23/]'
      + '五仁党和流心党都别吵了，小孩子才做选择，本娘全都要。</p>'
      + '<h2>参与方式</h2>'
      + '<p>在文章下方留言，说出你最想吃的月饼口味和理由；9 月 30 日晚 8 点来 DD 歌回直播间，'
      + '就有机会拿走本娘准备的月饼礼盒。</p>'
      + '<ul><li>留言许愿喜欢的月饼口味，口味不限、理由不限；</li>'
      + '<li>9 月 30 日晚 8 点，DD 歌回直播间不见不散；</li>'
      + '<li>留言点赞最高的三位小伙伴，会收到月饼礼盒一份。</li></ul>'
      + '<ol><li>有序清单一</li><li>清单二</li></ol>'
      + '<p>第一行<br>第二行</p>'
      + '<blockquote>小孩子才做选择，本娘全都要。五仁和流心，都可以是好月饼。</blockquote>'
      // 非白名单容器（div）：整件摘除，里头的白名单件与文字要留住
      + '<div data-ar-probe="div"><p>' + DIV_TEXT + '</p></div>'
      + '<img src="' + AR_PIC + '" alt="中秋 DD 歌回活动配图" data-ar-probe="img" loading="lazy">'
      + '<h2>活动时间</h2>'
      + '<table><thead><tr><th>节点</th><th>时间</th></tr></thead>'
      + '<tbody><tr><td>留言截止</td><td>9 月 28 日 23:59</td></tr>'
      + '<tr><td>DD 歌回直播</td><td>9 月 30 日 20:00</td></tr></tbody></table>'
      + '<figure><figcaption>图注：AC娘月饼礼盒</figcaption></figure>'
      + '<pre><code>echo 中秋快乐</code></pre>'
      // ↓ 净化分支探针（契约在册：script/iframe/on* 内联事件/style 全摘；img/a 的 URL 须过
      //   imgurl.CDN_URL_OK，不过 ⇒ 摘除元素留 alt/文本）
      + '<script data-ar-probe="script">window.__AR_XSS__=1</scr' + 'ipt>'
      + '<iframe src="https://evil.example/if"></iframe>'
      + '<img src="https://evil.example/x.png" alt="' + BAD_PIC_ALT + '">'
      + '<a href="https://evil.example/go" target="_blank" rel="noopener">' + BAD_LINK_TEXT + '</a>'
      + '<blockquote><script>bad()</script><p><a href="javascript:void(0)" onmouseover="bad()">'
      + NESTED_TEXT + '</a></p></blockquote>'
      + '<p style="color:red" onclick="bad()">带内联样式的段落</p>'
      + '<h3>留言小贴士</h3>'
      + '<p>别只写「流心」两个字——写清楚为什么喜欢，才更容易被本娘看见。留言点赞最高的三位小伙伴，'
      + '记得留意站内私信。</p>';
  }

  function articleInfoOf(acId, title) {
    return {
      articleId: acId, title: title,
      // 内嵌前把 </ 与分号问题一并解掉（见文件头夹具纪律）
      parts: [{ title: title, content: bodyHtml() }],
      coverImage: AR_PIC,
      channelId: 63, channelName: '生活',
      likeCount: 12345, bananaCount: 6561, stowCount: 8924, commentCount: CMT_COUNT,
      viewCount: 123456, formatViewCount: '12.3万',
      isLike: false, isThrowBanana: false,
      tagList: [{ id: 1, name: '活动' }, { id: 2, name: 'AC娘' }, { id: 3, name: '中秋' }],
      user: { userId: AR_UP_ID, userName: AR_UP_NAME, userHead: '', headUrl: '', isFollowing: false },
      createTime: '2026-09-25', createTimeMillis: 1758775200000,
      shareUrl: 'https://www.acfun.cn/a/ac' + acId
    };
  }

  function articleHtmlOf(acId, title) {
    var info = JSON.stringify(articleInfoOf(acId, title))
      .replace(/<\//g, '<\\/')      // JSON 合法的 \/ 转义：parse 后仍是真 '</'
      .replace(/;/g, '；');          // 内嵌段零分号（正则截断风险；中文正文本该用全角）
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + title
      + ' - AcFun弹幕视频网</title></head><body>'
      + '<div id="article-content">' + bodyHtml() + '</div>'   // §17.3 DOM 兜底容器
      + '<scr' + 'ipt>window.articleInfo = ' + info + ';</scr' + 'ipt>'
      + '</div></body></html>';
  }

  // ---------- mock 表：具体键排基键前（mockHit 按 for..in 子串首命中；views.js:1577 教训） ----------
  function armMocks(opt) {
    opt = opt || {};
    window.__ACSV_DEFERRED__ = window.__ACSV_DEFERRED__ || [];
    var spec = {};
    // 评论：定向桩 + URL 记账（供 sourceType=3 断言）。基键 'comment/list' 位置由 MY_MOCK 决定，
    // 值被这里覆盖（Object.assign 同名保位换值），故 MY_MOCK 先并、spec 后并
    spec['comment/list'] = function (body, url) {
      window.__ACSV_AR_CMT_URL__ = String(url || '');
      return {
        result: 0, commentCount: CMT_COUNT, curPage: 1, totalPage: 1, pcursor: 'no_more',
        hotComments: [],
        rootComments: [
          { commentId: 'ar1', userId: 71, userName: CMT_NAME1, headUrl: '', sourceType: 3,
            content: CMT_TEXT1, postDate: '2小时前', likeCount: 128, isLike: false,
            subCommentCount: 5, deviceModel: 'iPhone 4' },
          { commentId: 'ar2', userId: 72, userName: '弹幕护体', headUrl: '', sourceType: 3,
            content: CMT_TEXT2, postDate: '昨天 21:47', likeCount: 54, isLike: false,
            subCommentCount: 0 }
        ],
        subCommentsMap: { ar1: [{ commentId: 'ar11', userId: 73, userName: '阿蝉不是蝉',
          replyTo: 'ar1', replyToUserName: CMT_NAME1, sourceType: 3,
          content: '流心奶黄 +1，去年没抢到礼盒今年势在必得', postDate: '1小时前', likeCount: 12 }] }
      };
    };
    // 属地/设备与表情包桩：断言期不吃真网。表情桩给一枚 acfun 包（id 95，URL 不含
    // emot/umeditor 字样——article-emot-ph 的「未回填」判据按 URL 形态扫，别让它误红）：
    // acfun 件走 refillBodyEmots 回填成 img.ubb-emotion（0.9.328），zt 件占位不动
    spec['user/userInfo'] = function () { return { result: 0, user_id: 0, user_name: '', profile: {} }; };
    spec['emotion/getUserEmotion'] = function () {
      return { result: 0, emotionPackageList: [{ name: 'AC娘', emotions: [
        { id: '95', name: '月饼AC', emotionImageSmallUrl: 'https://imgs.aixifan.com/face95.png',
          emotionImageBigUrl: 'https://imgs.aixifan.com/face95.png' }
      ] }] };
    };
    // 写链桩（0.9.327 互动接通）：api_st 令牌 + interact 两向 + 文章收藏两向——两族成功码
    // 方言不同（interact=1、favorite=0，contract okResult0 在册），桩各自如实
    spec['token/get'] = function () { return { result: 0, 'acfun.midground.api_st': 'mock-st' }; };
    spec['interact/add'] = function () {
      window.__ACSV_IA_HITS__ = (window.__ACSV_IA_HITS__ || 0) + 1;
      return { result: window.__ACSV_LIKE_FAIL__ ? 0 : 1 };
    };
    spec['interact/delete'] = function () {
      window.__ACSV_ID_HITS__ = (window.__ACSV_ID_HITS__ || 0) + 1;
      return { result: 1 };
    };
    spec['pc-direct/favorite'] = function () {
      window.__ACSV_SF_HITS__ = (window.__ACSF_SF_HITS__ || window.__ACSV_SF_HITS__ || 0) + 1;
      return { result: window.__ACSV_STOW_FAIL__ ? 1 : 0 };
    };
    spec['pc-direct/unFavorite'] = function () {
      window.__ACSV_SUR_HITS__ = (window.__ACSV_SUR_HITS__ || 0) + 1;
      return { result: 0 };
    };
    // 投蕉桩（0.9.332 单 toast 断言）：bananaPc 成功码方言 result=0（contract okResult0 在册）
    spec['banana/throwBanana'] = function () {
      window.__ACSV_BAN_HITS__ = (window.__ACSV_BAN_HITS__ || 0) + 1;
      return { result: 0 };
    };
    // 关注/取关桩（0.9.332 连点单发锁断言）：relation/follow 成功码 result=0（ok0 方言在册）
    spec['relation/follow'] = function () {
      window.__ACSV_FU_HITS__ = (window.__ACSV_FU_HITS__ || 0) + 1;
      return { result: 0 };
    };
    // 文章页：主样本（可延迟）与失败样本（可切失败），基键 '/a/ac' 排最后
    var main = function () {
      window.__ACSV_ART_HITS__ = (window.__ACSV_ART_HITS__ || 0) + 1;
      if (opt.defer) {
        return new Promise(function (res) {
          window.__ACSV_DEFERRED__.push(function () { res(articleHtmlOf(AR_ID, AR_TITLE)); });
        });
      }
      return articleHtmlOf(AR_ID, AR_TITLE);
    };
    var failing = function () {
      window.__ACSV_ART_ERR_HITS__ = (window.__ACSV_ART_ERR_HITS__ || 0) + 1;
      if (window.__ACSV_ART_ERR_FAIL__) return Promise.reject(new Error('mock 404'));
      return articleHtmlOf(AR_ERR_ID, AR_TITLE2);
    };
    spec['/a/ac' + AR_ID] = main;
    spec['/a/ac' + AR_ERR_ID] = failing;
    spec['/a/ac'] = main;              // 基键：任何未列举的文章号一律回主样本
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, spec);
  }

  // ---------- 定位与读数小件 ----------
  function readerEl() {
    return document.querySelector('.covbd') || document.querySelector('.arh1')
      || document.querySelector('.arhd') || document.querySelector('.aractbar');
  }
  function readerScope() {
    // 浮层内查找：从锚点往上找到 body 下的第一层（浮层根），退回 document
    var a = document.querySelector('.covbd') || document.querySelector('.arhd')
      || document.querySelector('.arh1') || document.querySelector('.arerr');
    if (!a) return document;
    var n = a;
    while (n.parentElement && n.parentElement !== document.body && n.parentElement !== document.documentElement) {
      n = n.parentElement;
    }
    return (n === document.body || n === document.documentElement || !n) ? document : n;
  }
  function rq(sel) { return readerScope().querySelector(sel); }
  function rqAll(sel) { return [].slice.call(readerScope().querySelectorAll(sel)); }
  function vis(el) {
    return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function waitGone() {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() {
        if (!readerEl()) return res(true);
        if (Date.now() - t0 > 6000) return res(false);
        setTimeout(tick, 120);
      })();
    });
  }
  function attrDump(el) {
    var out = [];
    if (el) [].forEach.call(el.attributes, function (a) { out.push(a.name); });
    return out.join(',');
  }
  // 白名单标签集合的「脏属性」扫描（img 仅 src/alt；a 仅 href）。
  // 0.9.330：img.ubb-emotion 是 refillBodyEmots 回填件（非净化产物，class/referrerpolicy
  // 出自 emoticon.emotImgOf 单源）；ld/acsv-imgfail 是 imgload 的加载态类（grid fade/终败，
  // load 事件晚于渲染、早于本轮断言 tick 时即在场）——三者均非净化产物，排除后本判据才时序无关
  function dirtyAttrs(root, allow) {
    var bad = [];
    [].forEach.call(root.querySelectorAll('img,a'), function (el) {
      var cl = el.classList;
      if (cl && (cl.contains('ubb-emotion') || cl.contains('ld') || cl.contains('acsv-imgfail'))) return;
      [].forEach.call(el.attributes, function (a) {
        if (allow.indexOf(el.tagName.toLowerCase() + '.' + a.name) < 0) {
          bad.push(el.tagName.toLowerCase() + '.' + a.name);
        }
      });
    });
    return bad;
  }
  // 全属性脏扫描：on* 内联事件与 style 一律不许活下来
  function eventStyleAttrs(root) {
    var bad = [];
    [].forEach.call(root.querySelectorAll('*'), function (el) {
      [].forEach.call(el.attributes, function (a) {
        if (/^on/i.test(a.name) || a.name === 'style') bad.push(el.tagName.toLowerCase() + '.' + a.name);
      });
    });
    return bad;
  }

  // ---------- 开层接缝（见文件头约定） ----------
  var SEAM = null;   // {name, open(pi), close()|null}
  var HOOK_NAMES = ['articleread', 'articleReader', 'articleread-open', 'openArticleReader', 'article'];

  function callHook(name, args) {
    try {
      var T = window.__ACSV_TEST__;
      if (!T) return { err: 'no-TEST' };
      return { v: T.call.apply(T, [name].concat(args)) };
    } catch (e) { return { err: String((e && e.message) || e) }; }
  }
  // ① 句柄形态
  function handleSeam(name) {
    var r = callHook(name, []);
    var v = r.v;
    if (v && typeof v.open === 'function') {
      return { name: 'hook:' + name + '.handle',
        open: function (pi) { v.open(pi); },
        close: typeof v.close === 'function' ? function () { v.close(); } : null };
    }
    return null;
  }
  // ②/③/④ 见 openReader
  async function openReader(pi) {
    if (SEAM) { SEAM.open(pi); return SEAM.name; }
    var i;
    for (i = 0; i < HOOK_NAMES.length; i++) {
      var s = handleSeam(HOOK_NAMES[i]);
      if (s) { SEAM = s; s.open(pi); return s.name; }
    }
    for (i = 0; i < HOOK_NAMES.length; i++) {
      var nm = HOOK_NAMES[i];
      callHook(nm, [pi]);                     // ② 直调形态（未注册则空转，不抛）
      if (await poll(readerEl, 900)) {
        SEAM = { name: 'hook:' + nm + '(pi)', open: function (p) { callHook(nm, [p]); }, close: null };
        return SEAM.name;
      }
    }
    var g = window.__ACSV_ARTICLE_SEAM__;    // ③ 全局形态
    if (g && typeof g.open === 'function') {
      SEAM = { name: 'global:__ACSV_ARTICLE_SEAM__', open: function (p) { g.open(p); },
        close: typeof g.close === 'function' ? function () { g.close(); } : null };
      SEAM.open(pi);
      return SEAM.name;
    }
    try {                                     // ④ 兜底：源码件直调（裸包名链必废）
      var m = await import('/src/articleread.js');
      if (m && typeof m.openArticleReader === 'function') {
        m.openArticleReader(pi);
        if (await poll(readerEl, 900)) {
          SEAM = { name: 'srcimport:articleread', open: function (p) { m.openArticleReader(p); },
            close: typeof m.closeArticleReader === 'function' ? function () { m.closeArticleReader(); } : null };
          return SEAM.name;
        }
      }
    } catch (e) { }
    return null;
  }
  function poll(fn, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() {
        var v = null;
        try { v = fn(); } catch (e) { }
        if (v) return res(v);
        if (Date.now() - t0 > ms) return res(null);
        setTimeout(tick, 120);
      })();
    });
  }
  var SEAM_NOTE = '候选缝：testHook(' + HOOK_NAMES.join('|') + ')→{open,close} 或 (pi) 直调 / '
    + 'window.__ACSV_ARTICLE_SEAM__ / import("/src/articleread.js")';
  async function closeReader() {
    if (SEAM && SEAM.close) SEAM.close();
    else {
      var btn = rq('.arhd .acsv-tbtn');
      if (btn) btn.click();
      else if (!document.querySelector('.arhd .acsv-tbtn')) {
        var any = document.querySelector('.acsv-tbtn');
        if (any) any.click();
      }
    }
    return await waitGone();
  }
  async function collapseComposer(h) {
    if (!vis(rq('.acsv-cinput'))) return true;
    h.key('Escape');
    var e = rq('.acsv-cinput-edit');
    if (vis(rq('.acsv-cinput')) && e) {
      e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    }
    return !!(await poll(function () { return !vis(rq('.acsv-cinput')); }, 4000));
  }

  // pi 走契约件产（不手抄契约字段）
  async function makePi(acId, title, begin) {
    var PI = await import('/src/panelitem.js');
    return PI.panelItem('follow', {
      resourceType: 3, resourceId: acId, articleTitle: title, beginParagraph: begin,
      coverUrl: AR_PIC, viewCount: 123456, likeCount: 12345, commentCount: CMT_COUNT,
      bananaCount: 6561, shareCount: 66, createTime: 1758775200000,
      user: { userId: AR_UP_ID, userName: AR_UP_NAME, userHead: '', isFollowing: false }
    });
  }

  // ======================= article-reader（1600×900 全形态） =======================
  C['article-reader'] = async function (h) {
    var rec = h.rec, wait = h.wait, waitFor = h.waitFor, key = h.key;
    var seam = null;
    try {
      armMocks({ defer: true });
      delete window.__ACSV_MOCK__;          // 评论走定向桩（detail-open 先例）
      var pi = await makePi(AR_ID, AR_TITLE, '又是一年团圆时节，AC娘在这里祝大家中秋快乐呀～');
      if (pi) seam = await openReader(pi);
    } catch (e) { seam = null; rec('article-open-throw', false, String((e && e.message) || e)); }

    if (!seam) {
      // 缝没接上：七组钉全部按「未开层」显式红，info 直接给接法（不许静默零断言）
      var why = 'seam=none（' + SEAM_NOTE + '）';
      rec('article-open', false, why);
      rec('article-skeleton', false, why);
      rec('article-comments', false, why);
      rec('article-dim', false, why);
      rec('article-composer', false, why);
      rec('article-reply-chip', false, why);
      rec('article-error', false, why);
      return;
    }

    // ---- ① 骨架期（延迟回包未放行）----
    var skel0 = rqAll('.arskel').length;
    var body0 = rq('.arbody');
    // 「.arbody 空」＝不在场，或在场但没有一个子节点（骨架只吃 .arskel 块）
    rec('article-skeleton', skel0 >= 3 && (!body0 || body0.children.length === 0),
      seam + ' skel=' + skel0 + ' arbody儿童=' + (body0 ? body0.children.length : 'no-arbody')
      + ' h1=' + (rq('.arh1') ? 'y' : 'n'));
    rec('article-skeleton-head', !!(rq('.arhd') && rq('.arhd').querySelector('.arskel')),
      '作者位骨架块=' + (rq('.arhd') ? rqAll('.arhd .arskel').length : 'no-arhd'));
    rec('article-skeleton-no-bar', !vis(rq('.aractbar')),
      '骨架期底栏在场=' + vis(rq('.aractbar')) + '（稿节③：骨架期不显示动作条）');
    window.__ACSV_DEFERRED__.splice(0).forEach(function (f) { f(); });   // flushDeferred
    var got = await waitFor(function () { return rq('.arh1'); }, 9000);
    rec('article-skeleton-gone', !!got && rqAll('.arskel').length === 0,
      'flush 后 .arh1=' + !!got + ' 残留骨架=' + rqAll('.arskel').length);

    // ---- ② 开层与形态 ----
    var h1 = rq('.arh1');
    var body = rq('.arbody');
    var covbd = rq('.covbd');
    rec('article-open', !!(h1 && body && covbd && vis(covbd)),
      seam + ' h1=' + (h1 ? JSON.stringify(h1.textContent.slice(0, 20)) : 'none')
      + ' body=' + !!body + ' covbd=' + !!covbd + ' vis=' + vis(covbd));
    rec('article-open-title', !!h1 && h1.textContent.trim() === AR_TITLE,
      (h1 || {}).textContent || 'none');
    rec('article-open-body-children', !!body && body.children.length >= 6,
      'children=' + (body ? body.children.length : -1)
      + ' text=' + JSON.stringify(((body || {}).textContent || '').slice(0, 20)));
    rec('article-open-tags', (function () {
      var chips = rqAll('.artags .artag');
      var txt = chips.map(function (c) { return c.textContent; }).join(',');
      return chips.length === 3 && txt.indexOf('活动') >= 0 && txt.indexOf('中秋') >= 0;
    })(), 'chips=' + rqAll('.artags .artag').length);
    rec('article-open-head', (function () {
      var name = rq('.arhd .arname');
      return !!name && !!rq('.arhd .arav') && !!rq('.arhd .ar-meta')
        && !!rq('.arhd .ar-read') && !!rq('.arhd .ar-follow')
        && name.textContent.indexOf(AR_UP_NAME) >= 0;
    })(), 'name=' + ((rq('.arhd .arname') || {}).textContent || 'none')
      + ' read=' + ((rq('.arhd .ar-read') || {}).textContent || 'none')
      + ' follow=' + ((rq('.arhd .ar-follow') || {}).textContent || 'none'));
    // 关注键连点单发锁（0.9.332）：在途回包期连点两次仅 1 次请求、终态「已关注」——
    // 摘 fb._busy 锁（articleread renderHead）反跑：第 2 击翻转 DOM 且补发取关 ⇒ 请求=2、终态「关注」即红
    var fbtn = rq('.arhd .ar-follow');
    var fu0 = window.__ACSV_FU_HITS__ || 0;
    if (fbtn) { fbtn.click(); fbtn.click(); }
    rec('article-follow-busy-lock', !!(await waitFor(function () {
      return (window.__ACSV_FU_HITS__ || 0) === fu0 + 1 && fbtn && fbtn.textContent === '已关注';
    }, 6000)), 'follow请求=' + ((window.__ACSV_FU_HITS__ || 0) - fu0)
      + ' 终态=' + ((fbtn || {}).textContent || 'none'));
    rec('article-open-z60', (function () {
      var n = h1 || rq('.arhd');
      while (n) {
        if (getComputedStyle(n).zIndex === '60') return true;
        n = n.parentElement;
      }
      return false;
    })(), 'z链=' + (function () {
      var out = [], n = h1 || rq('.arhd');
      while (n && out.length < 8) {
        out.push((n.className || n.tagName) + ':' + getComputedStyle(n).zIndex);
        n = n.parentElement;
      }
      return out.join(' > ');
    })());
    rec('article-open-below-top', (function () {
      // 0.9.327 真机反馈批裁决：壳不覆盖常驻顶栏（playlayer/视图体同款 top 让位）——
      // 直接量壳实体（.acsv-artread；此前量 #acsv-root 恒满视口，是测量错位不是实现错位）
      var sh = rq('.acsv-artread');
      if (!sh) return false;
      var r = sh.getBoundingClientRect();
      var topH = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--acsv-top-h')) || 72;
      return r.top >= topH - 1 && r.width >= innerWidth - 1 && r.height >= innerHeight - topH - 1;
    })(), (function () {
      var sh = rq('.acsv-artread');
      if (!sh) return 'no-shell';
      var r = sh.getBoundingClientRect();
      var topH = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--acsv-top-h')) || 72;
      return 'shell=' + Math.round(r.width) + '×' + Math.round(r.height)
        + ' top=' + Math.round(r.top) + ' 顶栏=' + topH + ' 视口=' + innerWidth + '×' + innerHeight;
    })());
    // 稿量值三件：760 版心 / 正文 16-28 / 标题 28（新增提案在册值）
    rec('article-open-metrics', (function () {
      var ci = rq('.covin');
      if (!ci || !body || !h1) return false;
      var cs = getComputedStyle(body);
      return Math.round(ci.getBoundingClientRect().width) === 760
        && cs.fontSize === '16px' && cs.lineHeight === '28px'
        && getComputedStyle(h1).fontSize === '28px';
    })(), (function () {
      var ci = rq('.covin');
      return 'covin=' + (ci ? Math.round(ci.getBoundingClientRect().width) : 'none')
        + ' body=' + (body ? getComputedStyle(body).fontSize + '/' + getComputedStyle(body).lineHeight : 'none')
        + ' h1=' + (h1 ? getComputedStyle(h1).fontSize : 'none');
    })());
    // 底栏为唯一动作条（v3.2 确认稿裁决「删文末条」）：covin 内不得再出动作条容器，
    // 底栏五键齐全（键序 赞/蕉/藏/评论/分享，即稿节①承诺序）
    rec('article-open-mdetail-actions', (function () {
      var acts = rq('.covin .acsv-mdetail-actions');
      // 键序=DOM 序（蕉/藏节点常驻 ⋯ 弹层子树，宽态 display:contents 摊回直排——
      // 不需要也不能按子树过滤，DOM 序天然是稿节①承诺序）
      var keys = rqAll('.aractbar-in .aract')
        .map(function (a) { return a.getAttribute('title') || ''; }).join('|');
      return !acts && /^点赞\|投蕉\|收藏\|评论\|分享$/.test(keys);
    })(), (function () {
      var acts = rq('.covin .acsv-mdetail-actions');
      return '文末残留=' + !!acts + ' keys=' + JSON.stringify(rqAll('.aractbar-in .aract')
        .map(function (a) { return a.getAttribute('title'); }));
    })());

    // ---- ③ 净化在真 DOM 上的落地（unit 侧 sanitize 若牵 DOM 跑不动，这组就是主钉）----
    rec('article-sanitize-script', !!(body && body.querySelectorAll('script').length === 0
      && window.__AR_XSS__ === undefined),
      'script=' + (body ? body.querySelectorAll('script').length : -1)
      + ' 已执行=' + (window.__AR_XSS__ === undefined ? 'n' : 'y'));
    rec('article-sanitize-iframe', !!(body && body.querySelectorAll('iframe').length === 0),
      'iframe=' + (body ? body.querySelectorAll('iframe').length : -1));
    rec('article-sanitize-onstyle', !!(body && eventStyleAttrs(body).length === 0),
      '脏属性=' + (body ? eventStyleAttrs(body).slice(0, 6).join(',') : 'no-body'));
    rec('article-sanitize-imgurl', (function () {
      if (!body) return false;
      var imgs = [].slice.call(body.querySelectorAll('img'));
      var evil = imgs.filter(function (i) { return /evil\.example/.test(i.getAttribute('src') || ''); });
      var kept = imgs.some(function (i) { return /aixifan\.com/.test(i.getAttribute('src') || ''); });
      var altKept = (body.textContent || '').indexOf(BAD_PIC_ALT) >= 0;
      return evil.length === 0 && kept && altKept;
    })(), (function () {
      if (!body) return 'no-body';
      var imgs = [].slice.call(body.querySelectorAll('img'));
      return 'imgs=' + imgs.map(function (i) { return (i.getAttribute('src') || '').slice(0, 26); }).join('|')
        + ' 留alt=' + ((body.textContent || '').indexOf(BAD_PIC_ALT) >= 0 ? 'y' : 'n');
    })());
    rec('article-sanitize-aurl', (function () {
      if (!body) return false;
      var as = [].slice.call(body.querySelectorAll('a'));
      var bad = as.filter(function (a) {
        var href = a.getAttribute('href') || '';
        return /evil\.example/.test(href) || /^javascript:/i.test(href);
      });
      return bad.length === 0 && (body.textContent || '').indexOf(BAD_LINK_TEXT) >= 0
        && (body.textContent || '').indexOf(NESTED_TEXT) >= 0;
    })(), (function () {
      if (!body) return 'no-body';
      var as = [].slice.call(body.querySelectorAll('a'));
      return 'a=' + as.map(function (a) { return (a.getAttribute('href') || '').slice(0, 22); }).join('|')
        + ' 留字=' + ((body.textContent || '').indexOf(BAD_LINK_TEXT) >= 0 ? 'y' : 'n')
        + '/' + ((body.textContent || '').indexOf(NESTED_TEXT) >= 0 ? 'y' : 'n');
    })());
    rec('article-sanitize-nested', (function () {
      if (!body) return false;
      var probeLeft = body.querySelectorAll('[data-ar-probe]').length;
      return probeLeft === 0 && (body.textContent || '').indexOf(DIV_TEXT) >= 0
        && body.querySelectorAll('blockquote script').length === 0;
    })(), (function () {
      if (!body) return 'no-body';
      return '探针件=' + body.querySelectorAll('[data-ar-probe]').length
        + ' 容器内正文=' + ((body.textContent || '').indexOf(DIV_TEXT) >= 0 ? 'y' : 'n')
        + ' bqScript=' + body.querySelectorAll('blockquote script').length
        + ' div=' + body.querySelectorAll('.arbody div').length;
    })());
    rec('article-sanitize-attrs', (function () {
      if (!body) return false;
      return dirtyAttrs(body, ['img.src', 'img.alt', 'a.href']).length === 0;
    })(), '脏属性=' + (body ? dirtyAttrs(body, ['img.src', 'img.alt', 'a.href']).slice(0, 8).join(',') : 'no-body'));
    rec('article-emot-ph', (function () {
      // 方言件 ⇒ 占位 span（带 data 属性），且 zt 图源未实测 ⇒ 不回填成 img
      if (!body) return false;
      var raw = (body.innerHTML || '').indexOf('[emot=zt') >= 0;
      var spans = [].slice.call(body.querySelectorAll('span')).filter(function (s) {
        return [].some.call(s.attributes, function (a) { return /^data-/.test(a.name); });
      });
      var backfill = [].slice.call(body.querySelectorAll('img')).some(function (i) {
        return /umeditor|emotion|emot/i.test(i.getAttribute('src') || '');
      });
      return !raw && spans.length >= 1 && !backfill;
    })(), (function () {
      if (!body) return 'no-body';
      var spans = [].slice.call(body.querySelectorAll('span')).filter(function (s) {
        return [].some.call(s.attributes, function (a) { return /^data-/.test(a.name); });
      });
      return 'raw=' + ((body.innerHTML || '').indexOf('[emot=zt') >= 0 ? 'y' : 'n')
        + ' 占位=' + spans.length + ' 首件=' + (spans[0] ? attrDump(spans[0]) : 'none');
    })());
    // 回填是异步的（map 就绪晚于首屏）：等真图到位再断言；摘修复 ⇒ 等超时返 null、断言红不吊死
    var emotIm = await waitFor(function () {
      return body && body.querySelector('img.ubb-emotion') || null;
    }, 9000);
    rec('article-emot-refill', (function () {
      // 0.9.328 回填钉：acfun 件 map 就绪后占位 → img.ubb-emotion；zt 件占位原样（不回填）；
      // 方言字面零漏出。摘掉 refillBodyEmots / sanitize 的 acfun 可回填占位任一半 ⇒ 本条红
      if (!body) return false;
      var im = body.querySelector('img.ubb-emotion');
      return !!im && /face95\.png/.test(im.getAttribute('src') || '')
        && !!body.querySelector('.ar-em[data-emot-pkg="zt"][data-emot-id="23"]')
        && body.querySelector('.ubb-emot-ph[data-pkg="acfun"]') == null
        && (body.innerHTML || '').indexOf('[emot=') < 0;
    })(), (function () {
      if (!body) return 'no-body';
      var im = body.querySelector('img.ubb-emotion');
      return 'refill=' + (im ? (im.getAttribute('src') || '').slice(0, 40) : 'none')
        + ' zt占位=' + (body.querySelector('.ar-em[data-emot-pkg="zt"]') ? 'y' : 'n')
        + ' acfun残留占位=' + body.querySelectorAll('.ubb-emot-ph[data-pkg="acfun"]').length;
    })());
    rec('article-whitelist-keep', (function () {
      if (!body) return false;
      var need = ['p', 'br', 'img', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'table',
        'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'figcaption', 'figure'];
      var miss = need.filter(function (s) { return !body.querySelector(s); });
      return miss.length === 0;
    })(), (function () {
      if (!body) return 'no-body';
      return ['p', 'br', 'img', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead',
        'tbody', 'th', 'td', 'pre', 'code', 'figcaption', 'figure']
        .map(function (s) { return s + '=' + body.querySelectorAll(s).length; }).join(' ');
    })());

    // ---- ④ 评论区（stype=3 定向桩 ⇒ commentkit 真实类名 + inputbar 输入条）----
    var items = await waitFor(function () { return rqAll('.acsv-citem'); }, 9000);
    var head = await waitFor(function () { return rq('.ar-cmhead'); }, 6000);
    rec('article-comments', !!(items && items.length >= 1 && head),
      'citem=' + (items ? items.length : -1) + ' cmhead=' + !!head);
    rec('article-comments-head', (function () {
      if (!head) return false;
      var t = head.textContent || '';
      return /共\s*1024\s*条评论/.test(t) && !!head.querySelector('.ar-cmtitle');
    })(), 'head=' + (head ? JSON.stringify(head.textContent.slice(0, 24)) : 'none'));
    rec('article-comments-stype3', /sourceType=3/.test(window.__ACSV_AR_CMT_URL__ || ''),
      'url=' + (window.__ACSV_AR_CMT_URL__ || 'none'));
    rec('article-comments-text', (function () {
      var t2 = (items && items[0] ? items[0].textContent : '') || '';
      return t2.indexOf(CMT_TEXT1) >= 0 && t2.indexOf(CMT_NAME1) >= 0;
    })(), 'c0=' + JSON.stringify((items && items[0] ? items[0].textContent : '').slice(0, 26)));
    // 输入条：收起态按稿不显 ⇒ 展开一次再钉「可见」，随后收回还原状态
    var pill = rq('.aractbar-input');
    if (pill && !vis(rq('.acsv-cinput'))) pill.click();
    var cinv = await waitFor(function () { return vis(rq('.acsv-cinput')); }, 6000);
    rec('article-comments-input', !!cinv && !!rq('.acsv-cinput-edit'),
      'cinput 展开后可见=' + !!cinv + ' edit=' + !!rq('.acsv-cinput-edit')
      + ' collapsed可见=' + vis(rq('.acsv-cinput')));
    await collapseComposer(h);
    // 「加载更多」按钮 0.9.141 已退役（稿节⑤：续翻走 .acsv-cmore-sentinel 触底）——不得加回
    rec('article-comments-no-loadmore', (function () {
      var inReader = rqAll('button').filter(function (b) {
        return /^\s*加载更多\s*$/.test(b.textContent || '');
      });
      return inReader.length === 0;
    })(), '加载更多钮=' + rqAll('button').filter(function (b) {
      return /^\s*加载更多\s*$/.test(b.textContent || '');
    }).length + ' sentinel=' + rqAll('.acsv-cmore-sentinel').length);

    // ---- ⑤ 唯一动作条：底栏恒常亮（v3.2 删文末条，dim 去重机构退役）----
    var bar = rq('.aractbar');
    var barH0 = bar ? bar.getBoundingClientRect().height : -1;
    rec('article-dim-pre', !!bar, '底栏在场=' + !!bar);
    if (covbd) {
      covbd.scrollTop = covbd.scrollHeight;                 // 滚到底（原 dim 触发位）
      await wait(400);                                      // IO 节拍——若 dim 残留此刻必现身
      var barEnd = rq('.aractbar');
      var op = (function () {
        var a = rq('.aractbar .aract');
        return a ? getComputedStyle(a).opacity : 'none';
      })();
      rec('article-dim', !!barEnd && op === '1',
        '滚到底动作键 opacity=' + op + '（v3.2：无渐隐；摘掉「删文末条」恢复 dim ⇒ 红）');
      var barH1 = barEnd ? barEnd.getBoundingClientRect().height : -2;
      rec('article-dim-act-faded', barH0 > 0 && Math.abs(barH0 - barH1) <= 1,
        '底栏高 ' + barH0 + '→' + barH1 + '（高度不折叠，避免滚动跳动）');
      rec('article-dim-bar-height', vis(rq('.aractbar-input')), 'pill 仍可见=' + vis(rq('.aractbar-input')));
      var mdEnd = rq('.covin .acsv-mdetail-actions');
      rec('article-dim-pill-alive', !mdEnd, '文末条残留=' + !!mdEnd + '（v3.2：正文结尾直接接评论头）');
      covbd.scrollTop = 0;
      await wait(150);
      rec('article-dim-state-single', !!(barEnd && barEnd.querySelector('.aract')),
        '滚回顶底栏仍在=' + !!(barEnd && barEnd.querySelector('.aract')));
    } else {
      rec('article-dim', false, '无 .covbd 可滚');
      rec('article-dim-act-faded', false, 'no-covbd');
      rec('article-dim-bar-height', false, 'no-covbd');
      rec('article-dim-pill-alive', false, 'no-covbd');
      rec('article-dim-state-single', false, 'no-covbd');
    }

    // ---- ④+ 写链：赞乐观/回滚 + 藏收藏/取消/回滚（0.9.327 互动接通；§17.2 首跑验证的机械钉）。
    // 每次点击先等桩命中计数 +1（回包已落地、busy 已清），再断言类态——不然乐观类在 promise
    // 落定前就被读，时序竞态会把「成功」误判成「回滚没生效」。0.9.331 起按钮=底栏唯一动作条
    //（文末条已删；宽态 display:contents 五键直排，首键=赞）
    var endActs = rq('.aractbar-in');
    var likeBtn = endActs ? endActs.querySelector('.aract') : null; // 首键=赞（键序 赞/蕉/藏/评/享）
    rec('article-like-btn', !!likeBtn, 'likeBtn=' + !!likeBtn);
    if (likeBtn) {
      var ia0 = window.__ACSV_IA_HITS__ || 0;
      likeBtn.click();
      await poll(function () { return (window.__ACSV_IA_HITS__ || 0) > ia0; }, 6000);
      var liked = await poll(function () { return likeBtn.classList.contains('on') || null; }, 6000);
      rec('article-like-on', !!liked, 'on=' + !!liked + ' title=' + likeBtn.title);
      window.__ACSV_LIKE_FAIL__ = true;
      var id0 = window.__ACSV_ID_HITS__ || 0;
      likeBtn.click(); // 取消赞：delete 桩成功 → off
      await poll(function () { return (window.__ACSV_ID_HITS__ || 0) > id0; }, 6000);
      var lOff = await poll(function () { return !likeBtn.classList.contains('on') || null; }, 6000);
      rec('article-like-off', !!lOff, 'off=' + !!lOff);
      // 再点亮：add 桩失败 → 乐观回滚 + errNotLogin
      var ia2 = window.__ACSV_IA_HITS__ || 0;
      likeBtn.click();
      await poll(function () { return (window.__ACSV_IA_HITS__ || 0) > ia2; }, 6000);
      var lRoll = await poll(function () { return !likeBtn.classList.contains('on') || null; }, 6000);
      rec('article-like-rollback', !!lRoll, '失败点亮被回滚=' + !!lRoll);
      window.__ACSV_LIKE_FAIL__ = false;
    }
    var stowBtn = endActs ? endActs.querySelector('.stow') : null;
    rec('article-stow-btn', !!stowBtn, 'stowBtn=' + !!stowBtn);
    if (stowBtn) {
      // 藏键描边化（v3.2）：idle=描边 SVG 在场、实心字形隐藏；点亮反转（摘掉 svgIdle
      // 接线/切换 CSS 任一半 ⇒ 本条红）
      rec('article-stow-outline', (function () {
        var svg = stowBtn.querySelector('svg.arstow');
        var gl = stowBtn.querySelector('.acsvg-glyph');
        if (!svg || !gl) return false;
        return getComputedStyle(svg).display !== 'none'
          && getComputedStyle(gl).display === 'none';
      })(), 'idle svg=' + !!(stowBtn.querySelector('svg.arstow'))
        + ' 实心隐=' + (function () {
          var gl = stowBtn.querySelector('.acsvg-glyph');
          return gl ? getComputedStyle(gl).display === 'none' : 'no-glyph';
        })());
      var sf0 = window.__ACSV_SF_HITS__ || 0;
      stowBtn.click();
      await poll(function () { return (window.__ACSV_SF_HITS__ || 0) > sf0; }, 6000);
      var stowed = await poll(function () { return stowBtn.classList.contains('on') || null; }, 6000);
      rec('article-stow-on', !!stowed, 'on=' + !!stowed);
      // 点亮态形态反转：实心字形露、描边星收（同上，摘切换 CSS ⇒ 红）
      rec('article-stow-outline-on', (function () {
        var svg = stowBtn.querySelector('svg.arstow');
        var gl = stowBtn.querySelector('.acsvg-glyph');
        if (!svg || !gl) return false;
        return getComputedStyle(svg).display === 'none'
          && getComputedStyle(gl).display !== 'none';
      })(), (function () {
        var svg = stowBtn.querySelector('svg.arstow');
        var gl = stowBtn.querySelector('.acsvg-glyph');
        if (!svg || !gl) return '缺件 svg=' + !!svg + ' glyph=' + !!gl;
        return 'on svg隐=' + (getComputedStyle(svg).display === 'none')
          + ' 实心露=' + (getComputedStyle(gl).display !== 'none');
      })());
      window.__ACSV_STOW_FAIL__ = true;
      var su0 = window.__ACSV_SUR_HITS__ || 0;
      stowBtn.click(); // 取消收藏：unFavorite 桩成功 → off
      await poll(function () { return (window.__ACSV_SUR_HITS__ || 0) > su0; }, 6000);
      var sOff = await poll(function () { return !stowBtn.classList.contains('on') || null; }, 6000);
      rec('article-stow-off', !!sOff, 'off=' + !!sOff);
      // 再收藏：favorite 桩失败 → 乐观回滚
      var sf2 = window.__ACSV_SF_HITS__ || 0;
      stowBtn.click();
      await poll(function () { return (window.__ACSV_SF_HITS__ || 0) > sf2; }, 6000);
      var sRoll = await poll(function () { return !stowBtn.classList.contains('on') || null; }, 6000);
      rec('article-stow-rollback', !!sRoll, '失败收藏被回滚=' + !!sRoll);
      window.__ACSV_STOW_FAIL__ = false;
    }

    // ---- ④' 投蕉单 toast（0.9.332）：成功话术单源 banpop「投出 N 根香蕉」——浮层 applied
    // 不得再补第二条（恢复 articleread applied 内 toast('投蕉成功') 反跑 ⇒ .acsv-toast
    // 文本变更 2 次 ⇒ 红；顺带首钉投蕉写链全链：开层→选 1 根→thrown 点亮→蕉桩命中）
    var banBtn = rq('.aractbar .aract.ban');
    var toastMoN = 0;
    var toastNode = document.querySelector('.acsv-toast');
    var mo = typeof MutationObserver === 'function' && toastNode
      ? new MutationObserver(function (muts) {
        muts.forEach(function (m) { if (m.type === 'childList' || m.type === 'characterData') toastMoN++; });
      }) : null;
    if (mo) mo.observe(toastNode, { childList: true, characterData: true, subtree: true });
    if (banBtn) banBtn.click();
    var bpop = await waitFor(function () { return rq('.aractbar .acsv-banpop'); }, 6000);
    // 弹层可见位（0.9.336 病灶钉）：必须在底栏**上方**——top:-4px 是行卡语境摆位，浮层底栏
    // 宿主 .aractbar-in 下弹层落进栏内＝深底同色近乎隐身（用户实报「没弹出投蕉弹层」）；
    // 摘 .acsv-artread .aractbar-in .acsv-banpop 摆位规则反跑即红
    var barIn = rq('.aractbar-in');
    rec('article-banpop-above-bar', !!(bpop && barIn && (function () {
      var pr = bpop.getBoundingClientRect(), br = barIn.getBoundingClientRect();
      return pr.height > 0 && pr.bottom <= br.top + 4;
    })()), (function () {
      if (!bpop || !barIn) return 'no-pop';
      var pr = bpop.getBoundingClientRect(), br = barIn.getBoundingClientRect();
      return 'popBottom=' + Math.round(pr.bottom) + ' barTop=' + Math.round(br.top);
    })());
    // 可见性实测（0.9.336 补强）：壳在视口内（无 harness 舞台 transform 偏移）时，elementFromPoint
    // 打弹层中心必须命中弹层自身——几何过但被遮挡/裁剪时本条红。elementFromPoint 是视口坐标系，
    // harness 把浮层壳挂进带 translate3d 的竖刷舞台（rect.left≈2000）时该判据失真 ⇒ 语境门禁跳过
    rec('article-banpop-hit', !!(bpop && (function () {
      var shellR = rq('.acsv-artread').getBoundingClientRect();
      if (shellR.left > 100 || shellR.left < -100) return true; // 偏移语境：判据不适用，显式跳过
      var pr = bpop.getBoundingClientRect();
      var hit = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
      return !!hit && (hit === bpop || bpop.contains(hit) || hit.closest('.acsv-banpop') === bpop);
    })()), (function () {
      if (!bpop) return 'no-pop';
      var shellR = rq('.acsv-artread').getBoundingClientRect();
      var pr = bpop.getBoundingClientRect();
      var hit = shellR.left > 100 || shellR.left < -100 ? null
        : document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
      return (shellR.left > 100 || shellR.left < -100 ? 'offset-context ' : '')
        + 'hit=' + (hit ? (hit.className || hit.tagName) : 'null')
        + ' rect=' + Math.round(pr.left) + ',' + Math.round(pr.top)
        + '+' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + ' vh=' + window.innerHeight;
    })());
    var ban1 = bpop && bpop.querySelector('button');
    if (ban1) ban1.click();
    var bThrown = await poll(function () {
      return banBtn && banBtn.classList.contains('thrown') || null;
    }, 6000);
    if (mo) mo.disconnect();
    rec('article-banana-single-toast', !!bThrown && toastMoN === 1,
      'thrown=' + !!bThrown + ' 蕉桩=' + (window.__ACSV_BAN_HITS__ || 0)
      + ' toast变更=' + toastMoN + '（期望 1：仅 banpop 成功话术）');

    // ---- ⑤ composer（点 pill 展开 / 轻条藏 / Esc 与外点收回）----
    pill = rq('.aractbar-input');
    rec('article-composer-pre', !!pill && !vis(rq('.acsv-cinput')),
      'pill=' + !!pill + ' 收起态 composer 可见=' + vis(rq('.acsv-cinput')));
    if (pill) pill.click();
    var opened = await waitFor(function () { return vis(rq('.acsv-cinput')); }, 6000);
    rec('article-composer', !!opened && !vis(pill),
      'composer 展开=' + !!opened + ' 轻条藏(pill 不可见)=' + !vis(pill));
    rec('article-composer-parts', !!(rq('.acsv-cinput-edit') && rq('.acsv-cinput-send')),
      'edit=' + !!rq('.acsv-cinput-edit') + ' send=' + !!rq('.acsv-cinput-send')
      + ' fmt=' + rqAll('.acsv-cinput-fmt').length);
    key('Escape');
    var escClosed = await poll(function () { return !vis(rq('.acsv-cinput')); }, 4000);
    rec('article-composer-esc', !!escClosed && !!readerEl(),
      'Esc 收起=' + !!escClosed + ' 浮层留存=' + !!readerEl());
    rec('article-composer-focus', (function () {
      var a = document.activeElement;
      return !!a && a === rq('.aractbar-input');
    })(), '焦点=' + (function () {
      var a = document.activeElement;
      return a ? (a.className || a.tagName) : 'none';
    })());
    if (pill) pill.click();
    await waitFor(function () { return vis(rq('.acsv-cinput')); }, 6000);
    if (h1) h1.click();                                     // 点外部（正文标题在 composer 之外）
    var outClosed = await poll(function () { return !vis(rq('.acsv-cinput')); }, 6000);
    rec('article-composer-outside', !!outClosed && !!readerEl(),
      '外点收起=' + !!outClosed + ' 浮层留存=' + !!readerEl());

    // ---- ⑦ 回复 chip（沿用 comments.js setReply 现成机制）----
    var rb = await waitFor(function () {
      var it = rq('.acsv-citem');
      return it ? it.querySelector('.acsv-creplybtn') : null;
    }, 6000);
    if (rb) rb.click();
    var chip = await waitFor(function () {
      var c = rq('.acsv-quotechip');
      return vis(c) ? c : null;
    }, 6000);
    var label = rq('.acsv-quotechip-label');
    rec('article-reply-chip', !!chip && !!label,
      'chip 可见=' + !!chip + ' display=' + (chip ? getComputedStyle(chip).display : 'n/a')
      + ' label=' + ((label || {}).textContent || 'none'));
    rec('article-reply-chip-label', (function () {
      var t3 = (label || {}).textContent || '';
      return t3.indexOf('回复 @') >= 0 && t3.indexOf(CMT_NAME1) >= 0;
    })(), 'label=' + ((label || {}).textContent || 'none')
      + '（稿口径「回复 @」vs comments.js:521 现成「回复：@」，全角冒号差由主代理裁决）');
    rec('article-reply-chip-ph', (function () {
      var e2 = rq('.acsv-cinput-edit');
      return !!e2 && (e2.getAttribute('data-ph') || '').indexOf('回复 @' + CMT_NAME1) >= 0;
    })(), 'ph=' + ((rq('.acsv-cinput-edit') || {}).getAttribute
      ? (rq('.acsv-cinput-edit') || {}).getAttribute('data-ph') : 'none'));
    var xx = rq('.acsv-quotechip-x');
    if (xx) xx.click();
    var chipGone = await poll(function () { return !vis(rq('.acsv-quotechip')); }, 6000);
    rec('article-reply-chip-cancel', !!chipGone, '✕ 后 chip 收起=' + !!chipGone);
    await collapseComposer(h);

    // ---- ⑧ 失败态（重试为主、前往原页为辅、失败不出动作条、作者行留存）----
    var closed = await closeReader();
    rec('article-close-clean', !!closed, seam + ' close 后 DOM 摘净=' + !!closed);
    window.__ACSV_ART_ERR_FAIL__ = true;
    var pi2 = await makePi(AR_ERR_ID, AR_TITLE2, '本娘把这次活动的十四宫格拼成了一张长图');
    var seam2 = SEAM ? (SEAM.open(pi2), SEAM.name) : await openReader(pi2);
    var err = await waitFor(function () { return vis(rq('.arerr')); }, 9000);
    rec('article-error', !!err, 'seam=' + seam2 + ' arerr 可见=' + !!err
      + ' 文章页请求数=' + (window.__ACSV_ART_ERR_HITS__ || 0) + ' mock失败开关=' + window.__ACSV_ART_ERR_FAIL__);
    rec('article-error-text', (function () {
      var e3 = rq('.arerr');
      if (!e3) return false;
      var t4 = e3.textContent || '';
      return t4.indexOf('正文拉取失败') >= 0 && t4.indexOf('重试') >= 0;
    })(), (function () {
      var e4 = rq('.arerr');
      return e4 ? JSON.stringify(e4.textContent.slice(0, 40)) : 'none';
    })());
    rec('article-error-no-bar', !vis(rq('.aractbar')), '失败态底栏可见=' + vis(rq('.aractbar')));
    rec('article-error-head-kept', (function () {
      var n2 = rq('.arhd .arname');
      return !!n2 && n2.textContent.indexOf(AR_UP_NAME) >= 0;
    })(), '失败态作者行=' + ((rq('.arhd .arname') || {}).textContent || 'none'));
    var retry = await waitFor(function () {
      var e5 = rq('.arerr');
      if (!e5) return null;
      var list = [].slice.call(e5.querySelectorAll('button'));
      for (var j = 0; j < list.length; j++) if (/重试/.test(list[j].textContent)) return list[j];
      return null;
    }, 6000);
    rec('article-error-retry-key', !!retry, '重试键=' + (retry ? retry.className + '|' + retry.textContent : 'none'));
    rec('article-error-origin-link', (function () {
      var e6 = rq('.arerr');
      if (!e6) return false;
      var a2 = [].slice.call(e6.querySelectorAll('a')).filter(function (x) {
        return /原页/.test(x.textContent || '');
      })[0];
      return !!a2 && /acfun\.cn/.test(a2.getAttribute('href') || '')
        && a2.getAttribute('target') === '_blank';
    })(), (function () {
      var e7 = rq('.arerr');
      if (!e7) return 'none';
      var a3 = [].slice.call(e7.querySelectorAll('a'))[0];
      return a3 ? a3.getAttribute('href') + ' target=' + a3.getAttribute('target') : 'no-a';
    })());
    window.__ACSV_ART_ERR_FAIL__ = false;
    var hitsBefore = window.__ACSV_ART_ERR_HITS__ || 0;
    if (retry) retry.click();
    var back = await waitFor(function () {
      var hh = rq('.arh1');
      return hh && hh.textContent.indexOf(AR_TITLE2) >= 0 ? hh : null;
    }, 9000);
    rec('article-error-recover', !!back && !vis(rq('.arerr')),
      '重试后 h1=' + ((back || {}).textContent || 'none').slice(0, 20)
      + ' arerr 退场=' + !vis(rq('.arerr')) + ' 重拉次数=' + ((window.__ACSV_ART_ERR_HITS__ || 0) - hitsBefore));
    var okClose = await closeReader();
    rec('article-error-close', !!okClose, '收尾 close=' + !!okClose);
    await wait(150);
  };

  // ======================= article-reader-narrow（540×900 窄态收纳） =======================
  C['article-reader-narrow'] = async function (h) {
    var rec = h.rec, wait = h.wait, waitFor = h.waitFor;
    var seam = null;
    try {
      armMocks({});
      delete window.__ACSV_MOCK__;
      var pi = await makePi(AR_ID, AR_TITLE, '又是一年团圆时节');
      if (pi) seam = await openReader(pi);
    } catch (e) { rec('article-narrow-throw', false, String((e && e.message) || e)); }
    if (!seam) {
      var why = 'seam=none（' + SEAM_NOTE + '）';
      rec('article-narrow-more', false, why);
      rec('article-narrow-no-direct', false, why);
      rec('article-narrow-pop', false, why);
      return;
    }
    var h1 = await waitFor(function () { return rq('.arh1'); }, 9000);
    rec('article-narrow-open', !!h1 && !!rq('.covbd') && !!rq('.aractbar'),
      seam + ' 视口=' + innerWidth + '×' + innerHeight + ' h1=' + !!h1);
    rec('article-narrow-metrics', (function () {
      var ci = rq('.covin');
      return !!h1 && !!ci && getComputedStyle(h1).fontSize === '24px'
        && Math.round(ci.getBoundingClientRect().width) <= innerWidth;
    })(), 'h1=' + (h1 ? getComputedStyle(h1).fontSize : 'none')
      + ' covin=' + (function () { var ci = rq('.covin'); return ci ? Math.round(ci.getBoundingClientRect().width) : 'none'; })());
    // ⋯ 键可见（稿节④：窄态底栏收成 输入 + 赞/评论/分享 + ⋯）
    var more = await waitFor(function () { return vis(rq('.aractbar-more')); }, 8000);
    rec('article-narrow-more', !!more && !!rq('.aractbar-morebtn'),
      'more 可见=' + !!more + ' btn=' + !!rq('.aractbar-morebtn')
      + ' more 样式=' + (function () { var m = rq('.aractbar-more'); return m ? getComputedStyle(m).display : 'none'; })());
    // 直排里不得再有 藏/蕉（它们搬进 ⋯ 弹层）
    rec('article-narrow-no-direct', (function () {
      var inBar = rq('.aractbar-in');
      if (!inBar) return false;
      var direct = directActs(inBar);
      var bad = direct.filter(function (a) {
        var t = (a.getAttribute('title') || '') + ' ' + (a.textContent || '') + ' ' + a.className;
        return /收藏|投蕉|\bstow\b|\bban\b/.test(t);
      });
      return bad.length === 0 && direct.length >= 2;
    })(), '直排键=' + (function () {
      var inBar = rq('.aractbar-in');
      if (!inBar) return 'none';
      return directActs(inBar).map(function (a) {
        return a.className + '(' + (a.getAttribute('title') || a.textContent.trim().slice(0, 6)) + ')';
      }).join(' | ');
    })());
    var btn = rq('.aractbar-morebtn');
    if (btn) btn.click();
    var popOpen = await waitFor(function () {
      var p = rq('.aractbar-pop');
      return vis(p) ? p : null;
    }, 6000);
    rec('article-narrow-pop', !!(popOpen && (function () {
      var keys = [].slice.call(popOpen.querySelectorAll('.aract'));
      var txt = keys.map(function (k) { return (k.getAttribute('title') || '') + k.textContent; }).join(',');
      return keys.length >= 2 && /收藏/.test(txt) && /蕉/.test(txt);
    })()), 'pop 展开=' + !!popOpen + ' 键=' + (popOpen ? [].slice.call(popOpen.querySelectorAll('.aract'))
      .map(function (k) { return k.getAttribute('title') || k.textContent.trim().slice(0, 6); }).join(' | ') : 'n/a'));
    // ⋯ 是窄态藏/蕉唯一入口（v3.2 删文末条：文末直排可达随文末条一并撤销，裁决时明知的
    // 代价）——按 title 断言弹层键（图标+计数无可见文字，可达性按 title 等价代理）
    rec('article-narrow-acts-reachable', (function () {
      var acts = rq('.covin .acsv-mdetail-actions');
      var pop = rq('.aractbar-pop');
      if (!pop) return false;
      var txt = [].slice.call(pop.querySelectorAll('.aract')).map(function (k) {
        return (k.getAttribute('title') || '') + (k.textContent || '');
      }).join(',');
      return !acts && /收藏/.test(txt) && /蕉/.test(txt);
    })(), (function () {
      var acts = rq('.covin .acsv-mdetail-actions');
      var pop = rq('.aractbar-pop');
      return '文末残留=' + !!acts + ' pop=' + (pop ? [].slice.call(pop.querySelectorAll('.aract'))
        .map(function (k) { return k.getAttribute('title'); }).join('|') : 'none');
    })());
    var okClose = await closeReader();
    rec('article-narrow-close-clean', !!okClose, 'close 后摘净=' + !!okClose);
    await wait(150);
  };
  // 直排键＝底栏容器内、不在弹层子树里的 .aract
  function directActs(inBar) {
    var pop = inBar.querySelector('.aractbar-pop');
    return [].slice.call(inBar.querySelectorAll('.aract')).filter(function (a) {
      return !(pop && pop.contains(a));
    });
  }
})();

// ============================ 反跑登记表（临时还原什么 ⇒ 哪条转红） ============================
// article-skeleton            ：把「先出骨架」改成回包前不渲染骨架（或回包前就塞正文）⇒ .arskel<3 或
//                               .arbody 提前在场 ⇒ 红。
// article-skeleton-head       ：作者位不走骨架块（直接空着或吃 pi.up）⇒ 红。
// article-skeleton-no-bar     ：骨架期就把底栏 .aractbar 挂出来 ⇒ 红（稿节③）。
// article-skeleton-gone       ：回包落地不换掉骨架（flush 后 .arskel 仍在）⇒ 红。
// article-open                ：open 不建 .covbd/.arh1（或改名）⇒ 红；z 层未挂也红（vis 判据）。
// article-open-title          ：标题取 pi.title（列表态）或 SSR title 未剥后缀 ⇒ 与稿逐字不符 ⇒ 红。
// article-open-body-children  ：正文喂 renderCommentHtml（<p>/<img> 被转义成文本）⇒ children=0 ⇒ 红。
// article-open-tags           ：tagList 不接 / 胶囊改名 ⇒ chips≠3 ⇒ 红。
// article-open-head           ：阅读量不吃 viewCount/formatViewCount、关注键不挂 .ar-follow ⇒ 红。
// article-open-z60            ：浮层档位从 60 改成 55/58/61（撞顶栏或编辑器）⇒ 红。
// article-open-below-top      ：壳改回 inset:0 盖顶栏（0.9.327 真机反馈批裁决的反面）⇒ top
//                               ≠ 顶栏高 ⇒ 红。
// article-open-metrics        ：版心 760 / 正文 16-28 / 标题 28 任一件漂 ⇒ 红（稿附节 2 新增提案）。
// article-open-mdetail-actions：covin 内残留文末动作条，或底栏五键缺件/键序漂 ⇒ 红
//                               （v3.2 删文末条：底栏唯一动作条，键序=稿节①）。
// article-sanitize-script     ：白名单放进 script（或只脱标签留下文本体）⇒ 计数≠0；若真执行，
//                               __AR_XSS__ 读数转 'y' ⇒ 双保险都红。
// article-sanitize-iframe     ：放进 iframe ⇒ 红。
// article-sanitize-onstyle    ：on* 或 style 不再全摘 ⇒ 红（info 列出 tagName.属性名）。
// article-sanitize-imgurl     ：img URL 不过 CDN_URL_OK ⇒ 坏图源在场；或「摘除留 alt」改成连字删
//                               ⇒ 留alt=n ⇒ 红。
// article-sanitize-aurl       ：a href 不过白名单 / javascript: 未摘 / 锚文本被连坐删 ⇒ 红。
// article-sanitize-nested     ：非白名单容器留壳（探针 data-ar-probe 仍在）、或把容器里的白名单
//                               正文连坐删掉（容器内正文=n）、blockquote 内 script 未摘 ⇒ 红。
// article-sanitize-attrs      ：属性白名单放宽（img 收 data-ar-probe/loading、a 收 target/rel）⇒ 红。
// article-emot-ph             ：方言件原样漏出（raw=y）/占位不挂 data 属性/擅自回填未实测 zt 图源
//                               ⇒ 三者任一 ⇒ 红。
// article-emot-refill         ：acfun 件不出 img.ubb-emotion（回填接线被摘/占位不可回填）、zt 件
//                               被连坐回填、acfun 占位残留、方言字面漏出 ⇒ 任一 ⇒ 红（0.9.328）。
// article-whitelist-keep      ：白名单里漏掉 ol/br/figcaption/table 等任一件 ⇒ 红。
// article-comments            ：评论管线未进浮层（.acsv-citem=0）或 .ar-cmhead 不建 ⇒ 红。// article-comments-head       ：计数文案不是「共 N 条评论」或不回写 ⇒ 红（稿节⑤）。
// article-comments-stype3     ：stype 传成 4/5（照抄动态或视频缺省）⇒ 记账 URL 无 sourceType=3 ⇒ 红。
// article-comments-text       ：条目不走 commentkit（正文/昵称不落 .acsv-citem 子树）⇒ 红。
// article-comments-input      ：输入条不挂进浮层（.acsv-cinput 不在场或展开后仍不可见）⇒ 红。
// article-comments-no-loadmore：把 0.9.141 退役的「加载更多」按钮加回 ⇒ 红。
// article-dim                 ：滚到底底栏动作键被渐隐（dim 残留）⇒ 红——v3.2 删文末条后
//                               底栏恒常亮，摘掉「删文末条」恢复 dim 即红。
// article-dim-act-faded       ：底栏滚动前后高度折叠 ⇒ 红（稿：避免滚动跳动）。
// article-dim-bar-height      ：pill 不可见 ⇒ 红。
// article-dim-pill-alive      ：covin 内残留 .acsv-mdetail-actions 文末条 ⇒ 红（正文结尾直
//                               接接评论头）。
// article-dim-state-single    ：滚回顶底栏动作键不在场 ⇒ 红。
// article-composer            ：点 pill 不展开 composer，或展开后轻条不藏 ⇒ 红（稿节②）。
// article-composer-parts      ：composer 另造一套（无 .acsv-cinput-edit/-send/fmt 键）⇒ 红。
// article-composer-esc        ：Esc 不收起；或 Esc 把整层拆掉（readerEl 变 null）⇒ 红。
// article-composer-focus      ：收起后焦点不回 pill（稿附节 8）⇒ 红。
// article-composer-outside    ：点外部不收起 ⇒ 红。
// article-reply-chip          ：「回复」不接 setReply ⇒ chip 不显示 ⇒ 红。
// article-reply-chip-label    ：label 里没有「回复 @」⇒ 红（现成 comments.js:521 出「回复：@」，
//                               差一个全角冒号：钉稿口径，裁决归主代理）。
// article-reply-chip-ph       ：占位不联动（未走 bar.setPlaceholder）⇒ 红。
// article-reply-chip-cancel   ：✕ 不取消回复态 ⇒ 红。
// article-close-clean         ：closeArticleReader 不摘 DOM（或返回键不关层）⇒ 红。
// article-error               ：拉取失败不落 .arerr（白屏/静默/直接跳原页）⇒ 红。
// article-error-text          ：失败话术改名或无「重试」字样 ⇒ 红。
// article-error-no-bar        ：失败态仍出底栏（空互动）⇒ 红。
// article-error-head-kept     ：失败态把作者行一起摘掉（卡片 up 未用）⇒ 红。
// article-error-retry-key     ：重试不做 <button> 主键/文案不叫「重试」⇒ 红。
// article-error-origin-link   ：前往原页不吃当前 URL、或不新窗 ⇒ 红。
// article-error-recover       ：点重试不再拉（次数=0）或成功后 .arerr 不摘 ⇒ 红。
// article-narrow-open         ：窄态不建底栏/标题 ⇒ 红。
// article-narrow-metrics      ：窄态标题不降 24（稿：窄态 24/1.4）或版心溢出视口 ⇒ 红。
// article-narrow-more         ：窄态 ⋯ 键不显示（藏/蕉仍直排）⇒ 红。
// article-narrow-no-direct    ：底栏直排里仍有 收藏/投蕉 ⇒ 红。
// article-narrow-pop          ：点 ⋯ 不展开弹层，或弹层里藏/蕉不齐 ⇒ 红。
// article-narrow-acts-reachable：文末动作条残留（v3.2：⋯ 是窄态藏/蕉唯一入口）或弹层缺
//                               藏/蕉任一键 ⇒ 红。
// article-stow-outline         ：藏键 idle 实心（svg.arstow 不在场或未隐藏实心字形）⇒ 红
//                               （0.9.331 描边化；摘 actOf 的 svgIdle 接线即红）。
// article-stow-outline-on      ：点亮态不反转（描边未收/实心未露）⇒ 红（摘 .on 切换 CSS 即红）。
// article-like-btn/on/off/rollback：赞写链未接（点赞无反应=0.9.326 真机反馈病灶）/乐观不翻转/
//                               取消不回落/add 失败不回滚 ⇒ 各自红（§17.2 首跑验证机械钉）。
// article-stow-btn/on/off/rollback：收藏写链未接（同病灶）/收藏态不翻转/unFavorite 失效/
//                               favorite 失败不回滚 ⇒ 各自红（官方端点源码级反查 favapi.articleStow*）。
// article-follow-busy-lock    ：关注键连点单发锁缺失（在途回包期连点补发请求+终态回翻）⇒ 红
//                               （摘 renderHead fb._busy 反跑；relation/follow 桩计数）。
// article-banana-single-toast ：投蕉写链断裂（banpop 不开/选根无效/thrown 不亮）或浮层 applied
//                               补第二话术（.acsv-toast 文本变更 2 次）⇒ 红（话术单源 banpop，0.9.332）。
