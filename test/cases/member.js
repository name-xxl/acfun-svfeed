// 场景：member-plaza（0.9.128 原生 /member 页内嵌广场）
// 页面=BOOT_PATH 改写的 /member/feeds + 本场景 opt-out 自动挂壳（harness.html NO_AUTOMOUNT）
// ——必须在**无壳**条件下验证：入口注入（走真实轮询，非 TEST 直驱）→ 点击就地展开（.acsv-mp
// 出现 + 行卡渲染 + 原生节点隐藏 + #acsv-root 不存在=不跳全屏壳的机器证据）→ 浅色皮肤
// （computed 色 #333 vs 深色皮肤的 #57a9f5）→ 无壳评论管线（列表+输入条）→ 无壳大图浮层 →
// 再点=刷新重建（EXTRA 旗标证明真的重拉首页）→ 点原生「动态」链收回（不 reload）→ 收回后再点
// 入口重开（0.9.132：推广条按用户裁决撤除，重开唯入口径）。夹具：MY_MOCK 的 feedSquare
//（广场动态2 带图，喂无壳大图断言）；mock 缝依赖 debug 构建。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['member-plaza'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST;
    // 定向桩（view-square 同款处置：走 __ACSV_MOCK_FORM__ 而非内置 __ACSV_MOCK__）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'comment/list': function () {
        // 0.9.135 原生形态版式断言用：postDate（并入名字行）、subCommentCount 3 > 已载 1（展开按钮
        // 文案「共 3 条回复, 点击查看」）、子评论名字加粗/头像 30 的 CSS 语境
        return { result: 0, commentCount: 1, curPage: 1, totalPage: 1, pcursor: 'no_more',
          hotComments: [],
          rootComments: [
            { commentId: 'mp1', userId: 41, userName: '广场评论员', headUrl: '', content: '内嵌原位评论', postDate: '1分钟前', likeCount: 0, isLiked: false, subCommentCount: 3 }
          ],
          subCommentsMap: { mp1: [{ commentId: 'mp1-1', userId: 42, userName: '楼中楼甲', headUrl: '', content: '楼中楼内容', postDate: '1分钟前', likeCount: 0, isLiked: false, replyToUserName: '广场评论员', replyTo: 41 }] } };
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
    // 0.9.132 用户裁决：不再注入推广条（「多余的设计」——入口已在导航内）
    rec('mp-no-banner', !q('[data-acsv-mpromo]'));
    rec('mp-no-shell', q('#acsv-root') === null); // 无壳前提成立（禁自动挂壳的机器证据）

    // 1.5) 接管旧 plaza 脚本晚到的注入（0.9.129 真机加固；0.9.132 起旧推广条也随接管清扫）：
    // 自愈观察器驱动——静态让位会让用户点到已 sunset 的旧脚本
    (function () {
      var fakeItem = document.createElement('a');
      fakeItem.className = 'ac-member-navigation-item ac-member-navigation-sub-item plaza-nav-item';
      fakeItem.textContent = '旧广场项';
      q('[data-acsv-mnav]').parentNode.appendChild(fakeItem);
      var fakePromo = document.createElement('div');
      fakePromo.className = 'plaza-promotion';
      fakePromo.textContent = '旧推广条';
      q('#mp-hd-header').parentNode.insertBefore(fakePromo, q('#mp-hd-header').nextSibling);
    })();
    rec('mp-takeover', !!(await waitFor(function () {
      return !q('.plaza-nav-item') && !q('.plaza-promotion') && !q('[data-acsv-mpromo]')
        && document.querySelectorAll('[data-acsv-mnav]').length === 1;
    }, 4000)));

    // 2) 点击导航项 → 就地展开（不跳全屏壳）
    q('[data-acsv-mnav]').click();
    rec('mp-open', !!(await waitFor(function () {
      return q('.acsv-mp') && document.querySelectorAll('.acsv-mp .acsv-frow').length === 4;
    }, 8000)), 'rows=' + document.querySelectorAll('.acsv-mp .acsv-frow').length);
    rec('mp-native-hidden', q('#mp-hd-native').style.display === 'none');
    rec('mp-still-no-shell', q('#acsv-root') === null);
    // 入口选中态=镜像原生 active 类名（0.9.131 实报「选中后字体样式和原生不一致」修复：
    // 自绘 #ff4b76/600 撤除，样式交站点样式表接管）
    rec('mp-nav-active', (function () {
      var it = q('[data-acsv-mnav]');
      return !!it && it.classList.contains('ac-member-navigation-item-active')
        && it.classList.contains('router-link-exact-active');
    })());
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
    // 0.9.135 原生形态版式（内嵌语境专属）：时间并入名字行「发表于 x」、工具行无日期、
    // 头像 computed 50px、楼中楼头像 30px+名字加粗、展开文案「共 N 条回复, 点击查看」
    var mpBox = mRow.querySelector('.acsv-frow-cmts');
    var mpRoot = mpBox && mpBox.querySelector('.acsv-citem');
    function mpOwn(node, cls) {
      for (var i2 = 0; node && i2 < node.children.length; i2++) if (node.children[i2].classList.contains(cls)) return node.children[i2];
      return null;
    }
    var mpBody = mpOwn(mpRoot, 'acsv-cbody');
    var mpName = mpOwn(mpBody, 'acsv-cname');
    var mpMeta = mpOwn(mpBody, 'acsv-cmeta');
    rec('mp-cmt-native-datetitle', !!(mpName && /发表于/.test(mpName.textContent) && /1分钟前/.test(mpName.textContent)
      && mpMeta && !/1分钟前/.test(mpMeta.textContent)), mpName ? mpName.textContent.trim().slice(0, 24) : 'none');
    rec('mp-cmt-native-av', (function () {
      var av = mpRoot && mpRoot.querySelector('img.av');
      return !!av && getComputedStyle(av).width === '50px';
    })(), (function () { var av = mpRoot && mpRoot.querySelector('img.av'); return av ? getComputedStyle(av).width : 'none'; })());
    rec('mp-cmt-native-more', (function () {
      var b = mpBox && mpBox.querySelector('.acsv-cmore');
      return !!b && /共 3 条回复, 点击查看/.test(b.textContent);
    })(), (function () { var b = mpBox && mpBox.querySelector('.acsv-cmore'); return b ? b.textContent : 'none'; })());
    rec('mp-cmt-native-sub', (function () {
      var sub = mpBox && mpBox.querySelector('.acsv-csub .acsv-citem');
      var subAv = sub && sub.querySelector('img.av');
      var subName = sub && sub.querySelector('.acsv-cname a');
      return !!sub && !!subAv && getComputedStyle(subAv).width === '30px'
        && !!subName && getComputedStyle(subName).fontWeight === '700';
    })());
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

    // 5.5) 展开态被站点重画吞掉（Vue SPA 路由切换同型）：悬空状态先清再开——再点入口必须
    // 重开，而不是在死节点上刷新（0.9.129 真机加固的回归钉）
    q('.acsv-mp').remove(); // 模拟站点重渲染换掉内嵌根（mpRoot 悬空）
    await wait(150);
    q('[data-acsv-mnav]').click();
    rec('mp-stale-recover', !!(await waitFor(function () {
      return q('.acsv-mp') && document.querySelectorAll('.acsv-mp .acsv-frow').length >= 4;
    }, 8000)), 'rows=' + document.querySelectorAll('.acsv-mp .acsv-frow').length);

    // 6) 点原生「动态」链 → 收回（不 reload：原生 DOM 复原 + 内嵌列表拆除）
    q('#mp-hd-feeds').click();
    rec('mp-close-restore', !!(await waitFor(function () {
      return !q('.acsv-mp') && q('#mp-hd-native').style.display !== 'none';
    }, 5000)));
    rec('mp-nav-active-off', (function () {
      var it = q('[data-acsv-mnav]');
      return !!it && !it.classList.contains('ac-member-navigation-item-active');
    })());

    // 6.2) 点击决策（0.9.130 真机实报修复）：**以宿主存在为准**（plaza 原语义，不看路径）——
    // feeds 子页（/following、/fans；真机实测容器是 following-panel/fans-panel，无
    // .ac-member-feeds）必须走"跳转+自动展开"，而不是静默等宿主（旧路径前缀判断的病灶）
    (function () {
      window.__mpMain = q('.ac-member-main');
      window.__mpMain.remove();
    })();
    history.replaceState(null, '', '/member/feeds' + location.search);
    await wait(50);
    rec('mp-plan-wait', TEST.call('memberMp').plan() === 'wait', TEST.call('memberMp').plan());
    history.replaceState(null, '', '/member/feeds/following' + location.search);
    await wait(50);
    rec('mp-plan-redirect', TEST.call('memberMp').plan() === 'redirect', TEST.call('memberMp').plan());
    history.replaceState(null, '', '/member/feeds' + location.search);
    document.body.appendChild(window.__mpMain);
    await wait(50);
    rec('mp-plan-open', TEST.call('memberMp').plan() === 'open', TEST.call('memberMp').plan());

    // 6.5) 已撤除（0.9.132）：推广条自愈随条幅一并删除（重开唯入口径，见步 7）

    // 7) 收回后再点入口 → 重开（0.9.132 起重开路径唯入口径；推广条已撤）
    q('[data-acsv-mnav]').click();
    rec('mp-reopen', !!(await waitFor(function () {
      return q('.acsv-mp') && document.querySelectorAll('.acsv-mp .acsv-frow').length >= 4;
    }, 8000)));
  };
})();
