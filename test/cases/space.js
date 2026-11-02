// 场景：space-moments（0.9.218 空间页「动态」标签注入）
// 页面=BOOT_PATH 改写的 /u/12345（pagekind=member ⇒ boot 走空间页分流）+ 本场景 opt-out 自动挂壳
//（harness.html NO_AUTOMOUNT）——必须在**无壳**条件下验证。原生页夹具由场景体自己注入，两个
// 自建标签（动态 order1 / 小视频 order2）各由所属模块的轮询补注，然后断言：注入位次（确定性
// 排序，与两模块注入先后无关）、切换与站点排序控件互斥、**惰性**（不点不拉接口）、三合一渲染、
// 原生页落点（0.9.314 起＝点行跳站方原址新标签，行尾 am 号锚已撤；点配图格/正文内配图同样
// **不接脚本大图查看器**，两条腿都落到行默认出站，§18 实测裁决）、**浅色第二皮肤**（0.9.218
// 补的视频/文章条规则 + 0.9.314 补的点亮态）、以及行卡族交互态的**载量钉**（环/按压/作用域）。
// 夹具：MY_MOCK 之外的定向桩（feed/profile 三合一，首行带宫格配图 + 正文内嵌 [img]），
// mock 缝依赖 debug 构建。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['space-moments'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor;

    // 定向桩：feed/profile 三合一混排（与 view-my 同形）。createTime 一律取 5h 前以上 ⇒
    // 不进新鲜度回填名单（免得触发 moment/detail 真请求打穿 mock）
    //
    // 配图夹具（0.9.314 本批加）：首行动态给一张**宫格配图**（紧凑三件套形状，与 my-sample 的
    // FOLLOW_COVER 同款 data URI，imgsOfMoment 取 url + big=expandedUrl||originUrl||url）⇒ 行内
    // 出「单图格子」.acsv-frow-img，供「原生页不接脚本查看器」两条钉（sm-no-imgview /
    // sm-imgview-source）。正文再内嵌一条 [img]（走 ubb.js 单源渲染成 img.ubb-imgc，供
    // commentPicClick 那条腿的钉 sm-textpic-no-imgview）——图床白名单 CDN_URL_OK 只放行 A 站域
    //（data URI 不放行），故这里给 imgs.aixifan.com 的样本地址：harness 里取不到图不影响 DOM 成形
    var SM_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    var SM_PIC = 'https://imgs.aixifan.com/acsv-harness-textpic.png';
    window.__ACSV_MOCK_FORM__ = {
      'feed/profile': {
        result: 0, pcursor: 'no_more',
        feedList: [
          { resourceType: 10, resourceId: 5104362, createTime: Date.now() - 5 * 3600 * 1000,
            moment: { momentId: '5104362', text: 'TA 的动态正文[img=配图]' + SM_PIC + '[/img]',
              imgs: [{ url: SM_IMG, expandedUrl: SM_IMG, originUrl: SM_IMG, width: 100, height: 100, type: 1 }] },
            user: { userId: 7, userName: '空间UP', userHead: '' },
            likeCount: 1, commentCount: 2, bananaCount: 3 },
          { resourceType: 2, resourceId: 488900, createTime: Date.now() - 6 * 3600 * 1000,
            caption: '动态流里的视频', playDuration: '00:11', viewCount: 5,
            user: { userId: 7, userName: '空间UP', userHead: '' } },
          { resourceType: 3, resourceId: 48879687, createTime: Date.now() - 7 * 3600 * 1000,
            articleTitle: '动态流里的文章', beginParagraph: '摘要',
            user: { userId: 7, userName: '空间UP', userHead: '' } },
          // 转发条（0.9.314 补）：让「引用卡出站」这条口径有机器证据——外层 rt10 带 repostSource，
          // 契约层（follow 解析器，profilePageOf 复用同一份）出 it.repost{ct:'moment',id:5104327}，
          // 行内引用卡即由此渲染。置末位：既有钉取的是首行/第 1~3 行，append 不扰它们。
          { resourceType: 10, resourceId: 5105001, createTime: Date.now() - 8 * 3600 * 1000,
            moment: { momentId: '5105001', text: '转发一条动态' },
            // repostSource 在**条目顶层**（解析器取 raw.repostSource；嵌进 moment 等于没有转发源——首轮钉红实证）
            repostSource: { resourceType: 10, resourceId: 5104327,
              moment: { momentId: '5104327', text: '源动态正文' },
              user: { userId: 9, userName: '源UP', userHead: '' } },
            user: { userId: 7, userName: '空间UP', userHead: '' } }
        ]
      }
    };

    // 原生空间页夹具：内容标签栏（视频/文章/合辑 + 站点排序控件 li）+ 空间页根
    //（uppage 的小视频注入要求 #ac-space 在；排序 li 与真机一致**不带 data-index**）
    document.body.insertAdjacentHTML('beforeend',
      '<div id="ac-space"><div class="ac-space-contribute-list"><ul class="tags">'
      + '<li data-index="video" id="sm-n-video">视频</li>'
      + '<li data-index="article" id="sm-n-article">文章</li>'
      + '<li data-index="album" id="sm-n-album">合辑</li>'
      + '<li id="sm-n-sort"><span id="ac-space-contribute-sort">最新</span></li>'
      + '</ul></div></div>');

    var liSel = '.ac-space-contribute-list ul.tags > li[data-index="moment"]';
    var panelSel = '.ac-space-contribute-list > .tag-content[data-acsv-tab="moment"]';

    rec('sm-no-shell', q('#acsv-root') === null); // 无壳前提（禁自动挂壳的机器证据）

    // 1) 两个自建标签都由轮询补注（夹具插入晚于 boot）
    rec('sm-tab-injected', !!(await waitFor(function () {
      var li = q(liSel);
      return li && li.textContent === '动态' && !!q(panelSel);
    }, 8000)));
    rec('sm-svideo-alive', !!q('li[data-index="svideo"]')); // 既有「小视频」未被抽出件改坏

    // 2) 位次：原生三标签 → 动态(order1) → 小视频(order2)。**确定性**（不随注入先后漂移）
    rec('sm-tab-order', (function () {
      var seq = [].map.call(document.querySelectorAll('.ac-space-contribute-list ul.tags > li[data-index]'),
        function (li) { return li.getAttribute('data-index'); }).join(',');
      return seq === 'video,article,album,moment,svideo';
    })(), (function () {
      return [].map.call(document.querySelectorAll('.ac-space-contribute-list ul.tags > li[data-index]'),
        function (li) { return li.getAttribute('data-index'); }).join(',');
    })());

    // 3) 惰性：没点「动态」就不建列表（不拉 profile 接口）
    rec('sm-lazy', document.querySelectorAll(panelSel + ' .acsv-frow').length === 0
      && document.querySelectorAll(panelSel + ' .acsv-sqskel').length === 0);

    // 4) 点击切换：li/panel 同步 active + 站点排序控件隐藏（共享注入件的切换分支）
    q(liSel).click();
    rec('sm-switch', !!(await waitFor(function () {
      var li = q(liSel), p = q(panelSel);
      return li.classList.contains('active') && p.classList.contains('active')
        && q('#sm-n-sort').style.display === 'none';
    }, 3000)));

    // 5) 三合一渲染（复用广场行卡管线：动态=正文 / 视频·文章=内容条）
    rec('sm-rows', !!(await waitFor(function () {
      var rows = document.querySelectorAll(panelSel + ' .acsv-frow');
      return rows.length === 4 && !!rows[0].querySelector('.acsv-frow-text')
        && !!rows[1].querySelector('.acsv-frow-strip') && !!rows[2].querySelector('.acsv-frow-strip')
        && !!rows[3].querySelector('.acsv-gquote-on'); // 末行=转发条（引用卡出站钉的宿主；夹具四型）
    }, 8000)), 'rows=' + document.querySelectorAll(panelSel + ' .acsv-frow').length);

    // 6) 原生页落点（0.9.314 用户裁决，反转 0.9.218 的「点行无动作 + 行尾 am 号锚」）：
    //    ① 号锚整件撤除——addAmAnchor 与两处 onRow 挂载同批退役，行内处处不得再有 .acsv-mp-am
    //    （挂回 addAmAnchor 即转红）；② 点动态行根 → 站方原址新标签，走 rowkit.openRowSource。
    //    点击落点取**行根 div**：互动键（momentbar 自挂 ev.stopPropagation）/内链/宫格（各自
    //    stopPropagation 或委托侧 closest('a') 早退）都在子节点上，碰不到本路径。
    rec('sm-no-am-anchor', document.querySelectorAll(panelSel + ' .acsv-mp-am').length === 0,
      'anchors=' + document.querySelectorAll(panelSel + ' .acsv-mp-am').length);
    // window.open 临时桩接住后立刻复原（views.js 搜索/引用卡同款手法）；断言里按**原址**比对
    //（CFG.api.momentBase = https://www.acfun.cn/moment/am）。摘修复反跑：onOpen 换回 noop → 转红
    rec('sm-row-source-open', (function () {
      var row = document.querySelector(panelSel + ' .acsv-frow'); // 首行=动态条（夹具 order1）
      if (!row) return false;
      window.__ACSV_OPEN__ = null;
      var orig = window.open;
      window.open = function (u) { window.__ACSV_OPEN__ = String(u); return null; };
      try { row.click(); } finally { window.open = orig; }
      return window.__ACSV_OPEN__ === 'https://www.acfun.cn/moment/am5104362';
    })(), 'u=' + window.__ACSV_OPEN__);

    // 6b) 点行落点的**另两型**（0.9.314 补全）：视频条目在契约层**没有 href**（href 是「站外页
    //    落点」字段，视频在脚本页走播放层，故契约层只给 acId）——openRowSource 按 ct 兜 CFG.api.videoBase；
    //    文章条目本来就有 href。两型都必须在原生页有落点，否则「点行出新标签」在混排流里是空话。
    //    摘 openRowSource 里那句 video 兜底 → sm-row-source-video 转红（视频行点了没反应）。
    function openOnce(el) {
      window.__ACSV_OPEN__ = null; // 先清再判：元素缺席时证据串不得留上一次的值（假证据比没证据坏）
      if (!el) return null;
      var orig = window.open;
      window.open = function (u) { window.__ACSV_OPEN__ = String(u); return null; };
      try { el.click(); } finally { window.open = orig; }
      return window.__ACSV_OPEN__;
    }
    var rowsAll = document.querySelectorAll(panelSel + ' .acsv-frow');
    rec('sm-row-source-video', openOnce(rowsAll[1]) === 'https://www.acfun.cn/v/ac488900',
      'v=' + window.__ACSV_OPEN__ + ' rows=' + rowsAll.length); // 夹具 order2 = 视频行
    rec('sm-row-source-article', openOnce(rowsAll[2]) === 'https://www.acfun.cn/a/ac48879687',
      'a=' + window.__ACSV_OPEN__); // order3 = 文章行

    // 6c) 引用卡出站（0.9.314 裁决④）：原生页两宿主传 siteOnly:true → 行内引用卡点源（动态）出站
    //    站方原址新标签，**不开脚本详情面板**（脚本页宿主不传 → 仍走面板，故本钉只钉原生页这一半）。
    //    摘 memberplaza/spacemoments 的 siteOnly:true，或摘 cards 的出站分支 → 转红。
    rec('sm-quote-outbound', openOnce(document.querySelector(panelSel + ' .acsv-gquote-on'))
      === 'https://www.acfun.cn/moment/am5104327', 'q=' + window.__ACSV_OPEN__);

    // 6d) 原生页不接脚本大图查看器（0.9.314 用户裁决；实测依据 docs/api-research.md §18）：
    //    「点图弹脚本 .acsv-imgview」的旧口径随裁决退役（旧钉在 cases/member.js：mp-imgview /
    //    mp-imgview-close，本场景此前只有号锚钉）。首行现在带一张配图 → 单图格子 .acsv-frow-img，点它：
    //      sm-no-imgview：脚本浮层不得出现，且那一击必须**有落点**（落到行默认出站）
    //      sm-imgview-source：同一次点击的落点＝该行站方原址新标签
    //    **为什么两条都要合成「不弹层 + 有落点」双侧判据**：本宿主（/u/<uid>，pagekind=member）
    //    boot 不 setRoot（无壳浮层根只 native/memberCenter 两分支给，见 boot.js 分流表），摘掉
    //    cards.momentCellOf 的 siteOnly 提前 return 时 openImageViewer 会因 root 为空而静默——
    //    **光看「无浮层」在这一面是假绿**；加上「必须出站」才咬得住（stopPropagation 回来即无出站）。
    //    观察窗取**首个可见效应**（浮层节点 / 出站 URL 谁先到即本击落点），不用固定 sleep 蒙
    var smCell = rowsAll[0] && rowsAll[0].querySelector('.acsv-frow-img');
    window.__ACSV_OPEN__ = null; // 先清：openOnce 同款纪律，缺席时证据串不得留旧值
    if (smCell) {
      var smCellOpen = window.open;
      window.open = function (u) { window.__ACSV_OPEN__ = String(u); return null; };
      try { smCell.click(); } finally { window.open = smCellOpen; } // 用完必须复原
    }
    var smHit = await waitFor(function () {
      if (q('.acsv-imgview')) return 'imgview';
      return window.__ACSV_OPEN__ ? 'source' : null;
    }, 3000);
    rec('sm-no-imgview', smHit === 'source' && !q('.acsv-imgview'),
      'hit=' + smHit + ' cell=' + (smCell ? 'y' : 'none') + ' open=' + window.__ACSV_OPEN__);
    // 原址逐字钉 + 与行 _pi.href 同值（follow 解析器 CFG.api.momentBase + resourceId=5104362）
    rec('sm-imgview-source', smHit === 'source'
      && window.__ACSV_OPEN__ === 'https://www.acfun.cn/moment/am5104362'
      && !!(rowsAll[0] && rowsAll[0]._pi) && window.__ACSV_OPEN__ === rowsAll[0]._pi.href,
      'hit=' + smHit + ' u=' + window.__ACSV_OPEN__
        + ' href=' + (rowsAll[0] && rowsAll[0]._pi ? rowsAll[0]._pi.href : 'no-row'));

    // 6e) 正文内配图这一条腿（siteOnly 的第三处）：首行正文内嵌 [img] → img.ubb-imgc，
    //    rowkit.wireRowList 在 siteOnly 下**跳过** commentPicClick 消费，这一击同样落行默认。
    //    红点＝摘 wireRowList 里 !(opt && opt.siteOnly) 守卫 → commentPicClick 吞掉点击
    //    （stopPropagation + 试图弹脚本查看器）⇒ 无出站即转红
    var smPic = rowsAll[0] && rowsAll[0].querySelector('.acsv-frow-text .ubb-imgc');
    window.__ACSV_OPEN__ = null;
    if (smPic) {
      var smPicOpen = window.open;
      window.open = function (u) { window.__ACSV_OPEN__ = String(u); return null; };
      try { smPic.click(); } finally { window.open = smPicOpen; }
    }
    var smPicHit = await waitFor(function () {
      if (q('.acsv-imgview')) return 'imgview';
      return window.__ACSV_OPEN__ ? 'source' : null;
    }, 3000);
    rec('sm-textpic-no-imgview', !!smPic && smPicHit === 'source'
      && !q('.acsv-imgview') && window.__ACSV_OPEN__ === 'https://www.acfun.cn/moment/am5104362',
      'hit=' + smPicHit + ' pic=' + (smPic ? smPic.getAttribute('src') : 'none') + ' open=' + window.__ACSV_OPEN__);

    // 7) 浅色第二皮肤（0.9.218 补的视频/文章条规则）：computed 色证据——摘掉 styles.js 里那五条
    // `.acsv-mp .acsv-frow-s*` 即转红（本条是那段补丁的专属闸门）
    rec('sm-skin-light', (function () {
      var body = q(panelSel + ' .acsv-frow-sbody');
      var title = q(panelSel + ' .acsv-frow-stitle');
      var info = q(panelSel + ' .acsv-frow-sinfo');
      if (!body || !title || !info) return false;
      var cs = getComputedStyle;
      return cs(body).backgroundColor === 'rgb(247, 247, 247)'
        && cs(title).color === 'rgb(51, 51, 51)'
        && cs(info).color === 'rgb(153, 153, 153)';
    })(), (function () {
      var body = q(panelSel + ' .acsv-frow-sbody');
      return body ? getComputedStyle(body).backgroundColor : 'n/a';
    })());

    // 7b) 浅皮点亮态 computed 色钉（0.9.314 真病灶）：浅皮块里 `.acsv-mp .acsv-frow-acts
    //    .acsv-fact{color:#999}` 是 0,3,0，与深皮 `.acsv-frow-acts .acsv-fact.on/.thrown`
    //    （同为 0,3,0）打平且**源码更后** ⇒ 浅皮里已赞/已投常驻灰（实心字形切了、颜色没跟上）。
    //    修法=点亮两条选择器进 `.acsv-mp` 回到 0,4,0，无需 !important。加类量 computed 色、
    //    量完立刻撤类（不污染后续断言与观感）；摘掉那两条 `.acsv-mp …-fact.on/.thrown` 即转红
    //    （回落 #999 = rgb(153,153,153)）。
    var smokeLit = (function () {
      var row = document.querySelector(panelSel + ' .acsv-frow');
      var like = null, ban = null;
      [].forEach.call(row ? row.querySelectorAll('.acsv-frow-acts .acsv-fact') : [], function (b) {
        if (b._act === 'like' && !like) like = b; // 键判别走 momentbar 挂的 _act（views.js/member.js 惯例）
        if (b._act === 'banana' && !ban) ban = b;
      });
      if (!like || !ban) return { ok: false, info: 'n/a' };
      like.classList.add('on');
      ban.classList.add('thrown');
      var cs = getComputedStyle;
      var lc = cs(like).color, bc = cs(ban).color;
      like.classList.remove('on');
      ban.classList.remove('thrown');
      return { ok: lc === 'rgb(253, 76, 93)' && bc === 'rgb(255, 186, 13)',
        info: 'like=' + lc + ' ban=' + bc };
    })();
    rec('sm-skin-light-on', smokeLit.ok, smokeLit.info);

    // 7c) 行卡族交互态「载量钉」（0.9.314）：合成事件不触发原生 :hover/:active ⇒ 照 views.js 的
    //    pubfab-hover-expand 先例扫 document.styleSheets 的 cssText 钉**规则存在**。先用
    //    replace(/\s+/g,'') 归一化，再切成「选择器{声明块}」对——只钉 token、不绑声明顺序
    //    （Chrome 会把 .985 归一成 0.985 ⇒ 正则写 0?\.985 容两形；禁绑色值，rgba 会被重排成
    //    `rgba(255, 255, 255, 0.1)`）。三条各指一个红点：
    //      sm-frow-hover-lift：撤框后 hover 的**唯一视觉反馈**＝提底一档（暗皮条卡两块/引用卡
    //        灰块 background:rgba(255,255,255,.10)）。合成事件不触发 :hover，故照既有手法钉
    //        「规则载量」存在性（同 pubfab-hover-expand 口径）
    //      sm-frow-no-ring：**防回潮负钉**——三条可点面（条卡/引用卡/宫格）不得再出现边框环
    //        （::after 带 border）或 outline 替身。0.9.314 用户实看暗皮后判「红框突兀」，全场景
    //        撤除；这条闸钉住「别加回来」。同时留档：若将来真要加框，**不许退回 outline**——
    //        outline/inset 阴影画在卡根装饰层，会被封面与宫格的不透明图元整条吃掉（v1 实测病）
    //      sm-frow-press：卡面 :active scale(.985) + 行级 .acsv-frow:active translateY(1px)
    //      sm-frow-scope：提底族与按压族选择器**每一段**都必须在 .acsv-frow 作用域内
    //        （(?![\w-]) 挡住 `.acsv-frow-strip` 这类裸用）——面板/编辑器复用同批类名，不获得反馈
    var frowRules = (function () {
      var txt = '';
      var sheets = [].slice.call(document.styleSheets);
      for (var i = 0; i < sheets.length; i++) {
        try { txt += [].map.call(sheets[i].cssRules, function (r) { return r.cssText; }).join(''); } catch (e) { /* 跨域表读不到 cssRules：跳过 */ }
      }
      txt = txt.replace(/\s+/g, '');
      var out = [], re = /([^{}]*)\{([^{}]*)\}/g, m;
      while ((m = re.exec(txt))) out.push({ sel: m[1], blk: m[2] });
      return out;
    })();
    var frowScoped = function (r) { // 逗号分段每段都要有「.acsv-frow 本体」
      return r.sel.split(',').every(function (p) { return /\.acsv-frow(?![-\w])/.test(p); });
    };
    var liftRules = frowRules.filter(function (r) {
      // 值按浏览器归一化后匹配：.10 → 0.1（cssText 已去空白，故写 0?\.1）
      return /:hover/.test(r.sel) && /acsv-frow/.test(r.sel) && /background:rgba\(255,255,255,0?\.1\)/.test(r.blk);
    });
    // 族筛选**只认家族名**（不预筛作用域）：Un-scope 后 `.acsv-frow-strip:active` 仍是本族，
    // 若在筛选里就要求 `.acsv-frow` 本体，改造型病灶会被筛掉 ⇒ 作用域钉永远恒绿（探针实锤）
    var pressRules = frowRules.filter(function (r) {
      return /:active/.test(r.sel) && /acsv-frow/.test(r.sel);
    });
    var threeFace = function (r) { return /acsv-frow-strip|acsv-gquote-on|acsv-frow-img/.test(r.sel); };
    rec('sm-frow-hover-lift', frowRules.some(function (r) {
      return /acsv-frow-strip:hover/.test(r.sel) && /background:rgba\(255,255,255,0?\.1\)/.test(r.blk);
    }) && frowRules.some(function (r) {
      return /acsv-gquote-on:hover/.test(r.sel) && /background:rgba\(255,255,255,0?\.1\)/.test(r.blk);
    }), 'lift=' + liftRules.length);
    rec('sm-frow-no-ring', frowRules.every(function (r) {
      if (!threeFace(r)) return true;
      return !/outline/.test(r.blk) && !(/::after/.test(r.sel) && /border/.test(r.blk));
    }), 'ringLeft=' + frowRules.filter(function (r) {
      return threeFace(r) && (/outline/.test(r.blk) || (/::after/.test(r.sel) && /border/.test(r.blk)));
    }).length);
    rec('sm-frow-press', frowRules.some(function (r) {
      return /acsv-frow-strip:active/.test(r.sel) && /scale\(0?\.985\)/.test(r.blk);
    }) && frowRules.some(function (r) {
      return /\.acsv-frow:active/.test(r.sel) && /translateY\(1px\)/.test(r.blk);
    }), 'press=' + pressRules.length);
    // 只在「族规则存在」的前提下判作用域（存在性归上两条）——三条各指一个红点：全族被摘时
    // 红的是 lift/press，Un-scope 时才红本条
    rec('sm-frow-scope', liftRules.length > 0 && liftRules.every(frowScoped)
      && pressRules.every(frowScoped),
      'liftSel=' + liftRules.map(function (r) { return r.sel; }).join('|'));

    // 8) 点原生标签 → 站点排序控件恢复显形（共享注入件的 ④ 分支）
    q('#sm-n-video').click();
    rec('sm-sort-restore', !!(await waitFor(function () {
      return q('#sm-n-sort').style.display === '';
    }, 3000)));

    // 9) 站点 SPA 重画自愈（0.9.236）：只吞面板（留标签卡）——共享 MO 驱动 heal 必须补回新面板，
    //    点击后列表在新面板里重建（旧实现：inject 见卡即早退 + ensureList 见 feed 即早退 ⇒ 死标签）
    var panelOld = q(panelSel);
    panelOld.remove();
    rec('sm-heal-panel', !!(await waitFor(function () {
      var p = q(panelSel);
      return !!p && p.isConnected && p !== panelOld;
    }, 6000)));
    q(liSel).click();
    rec('sm-heal-rows', !!(await waitFor(function () {
      return document.querySelectorAll(panelSel + ' .acsv-frow').length === 4;
    }, 8000)), 'rows=' + document.querySelectorAll(panelSel + ' .acsv-frow').length);

    // 10) 连卡一起吞（全量重画）：heal 重挂卡+面板，点击同样重建列表
    q(liSel).remove();
    q(panelSel).remove();
    rec('sm-heal-both', !!(await waitFor(function () {
      return !!q(liSel) && !!q(panelSel);
    }, 6000)));
    q(liSel).click();
    rec('sm-heal-both-rows', !!(await waitFor(function () {
      return document.querySelectorAll(panelSel + ' .acsv-frow').length === 4;
    }, 8000)));
  };
})();
