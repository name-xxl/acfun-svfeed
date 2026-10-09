// 场景：space-moments（0.9.218 空间页「动态」标签注入）
// 页面=BOOT_PATH 改写的 /u/12345（pagekind=member ⇒ boot 走空间页分流）+ 本场景 opt-out 自动挂壳
//（harness.html NO_AUTOMOUNT）——必须在**无壳**条件下验证。原生页夹具由场景体自己注入，两个
// 自建标签（动态 order1 / 小视频 order2）各由所属模块的轮询补注，然后断言：注入位次（确定性
// 排序，与两模块注入先后无关）、切换与站点排序控件互斥、**惰性**（不点不拉接口）、三合一渲染、
// 原生页落点（行尾 am 锚）、以及**浅色第二皮肤**（0.9.218 补的视频/文章条规则）。
// 夹具：MY_MOCK 之外的定向桩（feed/profile 三合一），mock 缝依赖 debug 构建。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['space-moments'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor;

    // 定向桩：feed/profile 三合一混排（与 view-my 同形）。createTime 一律取 5h 前以上 ⇒
    // 不进新鲜度回填名单（免得触发 moment/detail 真请求打穿 mock）
    window.__ACSV_MOCK_FORM__ = {
      'feed/profile': {
        result: 0, pcursor: 'no_more',
        feedList: [
          { resourceType: 10, resourceId: 5104362, createTime: Date.now() - 5 * 3600 * 1000,
            moment: { momentId: '5104362', text: 'TA 的动态正文' },
            user: { userId: 7, userName: '空间UP', userHead: '' },
            likeCount: 1, commentCount: 2, bananaCount: 3 },
          { resourceType: 2, resourceId: 488900, createTime: Date.now() - 6 * 3600 * 1000,
            caption: '动态流里的视频', playDuration: '00:11', viewCount: 5,
            user: { userId: 7, userName: '空间UP', userHead: '' } },
          { resourceType: 3, resourceId: 48879687, createTime: Date.now() - 7 * 3600 * 1000,
            articleTitle: '动态流里的文章', beginParagraph: '摘要',
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
      return rows.length === 3 && !!rows[0].querySelector('.acsv-frow-text')
        && !!rows[1].querySelector('.acsv-frow-strip') && !!rows[2].querySelector('.acsv-frow-strip');
    }, 8000)), 'rows=' + document.querySelectorAll(panelSel + ' .acsv-frow').length);

    // 6) 原生页落点：行尾 am 锚（浅色原生页不穿越深色详情面板）；非动态条不挂
    rec('sm-am-anchor', (function () {
      var rows = document.querySelectorAll(panelSel + ' .acsv-frow');
      var a = rows[0] && rows[0].querySelector('.acsv-mp-am');
      return !!a && a.textContent === 'am5104362'
        && a.getAttribute('href') === 'https://www.acfun.cn/moment/am5104362'
        && !(rows[1] && rows[1].querySelector('.acsv-mp-am'));
    })());

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

    // 8) 点原生标签 → 站点排序控件恢复显形（共享注入件的 ④ 分支）
    q('#sm-n-video').click();
    rec('sm-sort-restore', !!(await waitFor(function () {
      return q('#sm-n-sort').style.display === '';
    }, 3000)));
  };
})();
