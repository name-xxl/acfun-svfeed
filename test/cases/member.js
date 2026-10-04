// 场景：member-plaza（0.9.128 原生 /member 页内嵌广场）
// 页面=BOOT_PATH 改写的 /member/feeds + 本场景 opt-out 自动挂壳（harness.html NO_AUTOMOUNT）
// ——必须在**无壳**条件下验证：入口注入（走真实轮询，非 TEST 直驱）→ 点击就地展开（.acsv-mp
// 出现 + 行卡渲染 + 原生节点隐藏 + #acsv-root 不存在=不跳全屏壳的机器证据）→ 浅色皮肤
// （computed 色 #333 vs 深色皮肤的 #57a9f5）→ 无壳评论管线（列表+输入条）→ 无壳大图浮层 →
// 再点=刷新重建（EXTRA 旗标证明真的重拉首页）→ 点原生「动态」链收回（不 reload）→ 推广条
// 「进入」重开。夹具：MY_MOCK 的 feedSquare（广场动态2 带图，喂无壳大图断言）；mock 缝依赖
// debug 构建。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['member-plaza'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST;
    // 定向桩（view-square 同款处置：走 __ACSV_MOCK_FORM__ 而非内置 __ACSV_MOCK__）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'comment/list': function () {
        return { result: 0, commentCount: 1, curPage: 1, totalPage: 1, pcursor: 'no_more',
          hotComments: [],
          rootComments: [
            { commentId: 'mp1', userId: 41, userName: '广场评论员', headUrl: '', content: '内嵌原位评论', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0 }
          ],
          subCommentsMap: {} };
      },
      'moment/detail': function (body, url) {
        return { result: 0, moment: {
          momentId: (String(url).match(/momentId=(\d+)/) || [])[1],
          likeCount: 9, commentCount: 4, bananaCount: 2, isLike: true, isThrowBanana: true
        } };
      }
    });
    delete window.__ACSV_MOCK__;

    // 原生页夹具：成员导航（feeds/fans 两链）+ feeds 容器（header + 原生条目）
    document.body.insertAdjacentHTML('beforeend',
      '<div class="ac-member-navigation"><div class="member-sub-nav">'
      + '<a href="/member/feeds" id="mp-hd-feeds">动态</a>'
      + '<a href="/member/feeds/fans" id="mp-hd-fans">粉丝</a>'
      + '</div></div>'
      + '<div class="ac-member-main"><div class="ac-member-feeds">'
      + '<div class="ac-member-feeds-header" id="mp-hd-header">头部</div>'
      + '<div id="mp-hd-native">原生条目</div>'
      + '</div></div>');

    // 1) 入口注入走**真实轮询**（boot 时夹具不在，500ms 一拍打成）
    rec('mp-nav-injected', !!(await waitFor(function () {
      var it = q('[data-acsv-mnav]');
      return it && it.textContent === '动态广场';
    }, 5000)));
    rec('mp-nav-position', (function () {
      var it = q('[data-acsv-mnav]'), fans = q('#mp-hd-fans');
      return !!(it && fans && fans.nextSibling === it);
    })());
    rec('mp-banner', !!(await waitFor(function () {
      var b = q('[data-acsv-mpromo]');
      return b && /按am号查找动态/.test(b.textContent) && /进入/.test(b.textContent)
        && b.previousSibling && b.previousSibling.id === 'mp-hd-header';
    }, 5000)));
    rec('mp-no-shell', q('#acsv-root') === null); // 无壳前提成立（禁自动挂壳的机器证据）

    // 2) 点击导航项 → 就地展开（不跳全屏壳）
    q('[data-acsv-mnav]').click();
    rec('mp-open', !!(await waitFor(function () {
      return q('.acsv-mp') && document.querySelectorAll('.acsv-mp .acsv-frow').length === 4;
    }, 8000)), 'rows=' + document.querySelectorAll('.acsv-mp .acsv-frow').length);
    rec('mp-native-hidden', q('#mp-hd-native').style.display === 'none');
    rec('mp-still-no-shell', q('#acsv-root') === null);
    // 浅色皮肤生效：行名 computed 色 = 原生 #333（深色皮肤是 #57a9f5）
    rec('mp-skin-name', (function () {
      var n = q('.acsv-mp .acsv-frow-name');
      return !!n && getComputedStyle(n).color === 'rgb(51, 51, 51)';
    })(), (function () { var n = q('.acsv-mp .acsv-frow-name'); return n ? getComputedStyle(n).color : 'none'; })());
    // am 号锚（plaza 原物）
    rec('mp-amlink', (function () {
      var a = q('.acsv-mp-am');
      return !!a && /\/moment\/am\d+/.test(a.href) && /^am\d+$/.test(a.textContent);
    })(), (q('.acsv-mp-am') || {}).href);

    // 3) 无壳评论管线：行内展开 = 列表 + 输入条
    var rows = document.querySelectorAll('.acsv-mp .acsv-frow'), mRow = null;
    for (var i = 0; i < rows.length; i++) if (/广场动态1/.test(rows[i].textContent)) mRow = rows[i];
    var acts = mRow ? mRow.querySelectorAll('.acsv-fact') : [];
    if (acts[1]) acts[1].click();
    rec('mp-cmts-inline', !!(await waitFor(function () {
      var box = mRow.querySelector('.acsv-frow-cmts');
      return box && box.querySelector('.acsv-cinput') && /内嵌原位评论/.test(box.textContent);
    }, 8000)));
    if (acts[1]) acts[1].click();
    await wait(250);
    rec('mp-cmts-close', !mRow.querySelector('.acsv-frow-cmts'));

    // 4) 无壳大图浮层（imgview 走 root=body 的既有先例）
    var r2 = null;
    for (var j = 0; j < rows.length; j++) if (/广场动态2/.test(rows[j].textContent)) r2 = rows[j];
    var cell = r2 && r2.querySelector('.acsv-frow-img');
    if (cell) cell.click();
    rec('mp-imgview', !!(await waitFor(function () { return q('.acsv-imgview'); }, 5000)));
    if (q('.acsv-imgview')) q('.acsv-imgview').click();
    rec('mp-imgview-close', !!(await waitFor(function () { return !q('.acsv-imgview'); }, 3000)));

    // 5) 再点导航项 = 刷新重建（plaza refreshPlaza 语义；EXTRA 旗标证明真的重拉了首页）
    window.__ACSV_SQUARE_EXTRA__ = true;
    q('[data-acsv-mnav]').click();
    rec('mp-refresh', !!(await waitFor(function () {
      return /广场动态8/.test(q('.acsv-mp').textContent);
    }, 8000)));
    window.__ACSV_SQUARE_EXTRA__ = false;
    rec('mp-nav-dedupe', document.querySelectorAll('[data-acsv-mnav]').length === 1);

    // 6) 点原生「动态」链 → 收回（不 reload：原生 DOM 复原 + 内嵌列表拆除）
    q('#mp-hd-feeds').click();
    rec('mp-close-restore', !!(await waitFor(function () {
      return !q('.acsv-mp') && q('#mp-hd-native').style.display !== 'none';
    }, 5000)));
    rec('mp-banner-back', (function () {
      var b = q('[data-acsv-mpromo]');
      return !!b && b.style.display !== 'none';
    })());

    // 7) 推广条「进入」→ 重开（banner 点击路径）
    q('[data-acsv-mpromo] button').click();
    rec('mp-banner-open', !!(await waitFor(function () {
      return q('.acsv-mp') && document.querySelectorAll('.acsv-mp .acsv-frow').length >= 4;
    }, 8000)));
  };
})();
