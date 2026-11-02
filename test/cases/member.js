// 场景：member-plaza（0.9.128 原生 /member 页内嵌广场）
// 页面=BOOT_PATH 改写的 /member/feeds + 本场景 opt-out 自动挂壳（harness.html NO_AUTOMOUNT）
// ——必须在**无壳**条件下验证：入口注入（走真实轮询，非 TEST 直驱）→ 点击就地展开（.acsv-mp
// 出现 + 行卡渲染 + 原生节点隐藏 + #acsv-root 不存在=不跳全屏壳的机器证据）→ 浅色皮肤
// （computed 色 #333 vs 深色皮肤的默认白；等级色两皮肤同值；点亮态赞红/蕉黄 computed 钉，0.9.314）
// → 行落点（0.9.314 用户裁决：行内无 am 号锚；点行 → window.open 收到站方原址 + '_blank'，
// 原生页不开脚本面板）→ 无壳评论管线（列表+输入条）→ 原生页点配图不接脚本查看器（同条点击
// 出站站方原址，0.9.314 裁决；旧「无壳大图浮层」两钉随裁决退役）→
// 再点=刷新重建（EXTRA 旗标证明真的重拉首页）→ 点原生「动态」链收回（不 reload）→ 收回后再点
// 入口重开（0.9.132：推广条按用户裁决撤除，重开唯入口径）。夹具：MY_MOCK 的 feedSquare
//（广场动态2 带图，喂点图落点断言）；mock 缝依赖 debug 构建。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['member-plaza'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST;
    // 定向桩（view-square 同款处置：走 __ACSV_MOCK_FORM__ 而非内置 __ACSV_MOCK__）
    var subCalls = 0; // 楼中楼收起件链路计数（0.9.286 断言用：第一页留 pcursor 造分页中途态）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'comment/sublist': function () {
        subCalls++;
        return subCalls === 1
          ? { result: 0, subComments: [{ commentId: 'mp1-2', userId: 43, userName: '楼中楼乙', headUrl: '', content: '第一页追加', postDate: '1分钟前', likeCount: 0, isLiked: false }], pcursor: '1' }
          : { result: 0, subComments: [{ commentId: 'mp1-3', userId: 44, userName: '楼中楼丙', headUrl: '', content: '第二页追加', postDate: '1分钟前', likeCount: 0, isLiked: false }], pcursor: 'no_more' };
      },
      'comment/list': function () {
        // 0.9.135 原生形态版式断言用：postDate（并入名字行）、subCommentCount 3 > 已载 1（展开按钮
        // 文案「共 3 条回复, 点击查看」）、子评论名字加粗/头像 30 的 CSS 语境
        return { result: 0, commentCount: 1, curPage: 1, totalPage: 1, pcursor: 'no_more',
          hotComments: [],
          rootComments: [
            { commentId: 'mp1', userId: 41, userName: '广场评论员', headUrl: '', content: '内嵌原位评论', postDate: '1分钟前', likeCount: 0, isLiked: false, subCommentCount: 3, isUp: true }
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
    // 发布浮标（0.9.225 用户口径「原生页只需要在动态广场出现」）：**只在广场里**，随广场开；
    // 位置与浅色回顶同列（right 对齐、浮标在上）
    rec('mp-pubfab-in-plaza', !!q('.acsv-mp .acsv-pubfab'));
    rec('mp-pubfab-light', (function () {
      var f = q('.acsv-pubfab');
      if (!f) return false;
      var cs = getComputedStyle(f);
      return cs.position === 'fixed' && Math.round(parseFloat(cs.right)) === 24;
    })(), (function () { var f = q('.acsv-pubfab'); return f ? getComputedStyle(f).right : 'none'; })());
    rec('mp-still-no-shell', q('#acsv-root') === null);
    // 入口选中态=镜像原生 active 类名（0.9.131 实报「选中后字体样式和原生不一致」修复：
    // 自绘 #ff4b76/600 撤除，样式交站点样式表接管）
    rec('mp-nav-active', (function () {
      var it = q('[data-acsv-mnav]');
      return !!it && it.classList.contains('ac-member-navigation-item-active')
        && it.classList.contains('router-link-exact-active');
    })());
    // 浅色皮肤生效：行名默认 computed 色 = 原生 #333（深色皮肤默认是白；0.9.157 名字三色体系）
    rec('mp-skin-name', (function () {
      var n = q('.acsv-mp .acsv-frow-name');
      return !!n && getComputedStyle(n).color === 'rgb(51, 51, 51)';
    })(), (function () { var n = q('.acsv-mp .acsv-frow-name'); return n ? getComputedStyle(n).color : 'none'; })());
    rec('mp-name-level', (function () { // 等级色在浅色页同样生效（夹具 广场UP3=等级 1 红 #fd4c5c）
      var hit = null;
      [].forEach.call(document.querySelectorAll('.acsv-mp .acsv-frow-name'), function (n) {
        if (/广场UP3/.test(n.textContent)) hit = n;
      });
      return !!hit && getComputedStyle(hit).color === 'rgb(253, 76, 92)';
    })(), (function () {
      var hit = null;
      [].forEach.call(document.querySelectorAll('.acsv-mp .acsv-frow-name'), function (n) { if (/广场UP3/.test(n.textContent)) hit = n; });
      return hit ? getComputedStyle(hit).color : 'no-node';
    })());
    // 0.9.314 浅皮点亮态 computed 色钉（本批 CSS 修复的专属闸）：浅皮块里 0,3,0 的 #999 与深皮
    // .on/.thrown（同 0,3,0）打平且源码更后 → 已赞/已投常驻灰（真病灶）。cssraw 在本块补的
    // `.acsv-mp .acsv-frow-acts .acsv-fact.on/.thrown` 两行（0,4,0）若被摘，这里即回 rgb(153,153,153)
    var mpLitLike = null, mpLitBan = null;
    [].forEach.call(document.querySelectorAll('.acsv-mp .acsv-frow-acts .acsv-fact'), function (b) {
      if (b._act === 'like' && !mpLitLike) mpLitLike = b; // 键判别走 momentbar 挂的 _act（同 views.js 惯例）
      if (b._act === 'banana' && !mpLitBan) mpLitBan = b;
    });
    var mpLitGot = 'no-key';
    if (mpLitLike && mpLitBan) {
      // 点亮态=类（生产路径=行数据回填时 syncRowBar 挂）：临时加类量 computed，量完**立即撤类**——
      // 残留的 .on/.thrown 会让本页后续点亮态断言假绿
      mpLitLike.classList.add('on');
      mpLitBan.classList.add('thrown');
      mpLitGot = getComputedStyle(mpLitLike).color + ' / ' + getComputedStyle(mpLitBan).color;
      mpLitLike.classList.remove('on');
      mpLitBan.classList.remove('thrown');
    }
    rec('mp-light-lit-colors', mpLitGot === 'rgb(253, 76, 93) / rgb(255, 186, 13)', mpLitGot);

    // 0.9.314 用户裁决①③：行尾 am 号锚整件撤除（memberplaza.addAmAnchor 与 cssraw 两行样式已删，
    // 行内已无生产者）——.acsv-mp-am 不得再出现；行落点改为**站方原址新标签**（rowkit.openRowSource
    // → window.open(pi.href,'_blank')），原生页不开脚本面板。摘 onOpen:openRowSource 回 noop 即转红
    rec('mp-no-amlink', !q('.acsv-mp .acsv-mp-am'),
      q('.acsv-mp') ? 'rows=' + document.querySelectorAll('.acsv-mp .acsv-frow').length : 'no-plaza');
    // 点**行根**：互动键/宫格各自 stopPropagation、内链走 <a> 分支，都够不到行默认（onOpen）——
    // 行根与正文文本才是落点。window.open 临时替换 → 点击 → **必须复原**（漏还原会劫持后续用例
    // 的全部开窗断言）；桩记 URL 串与第二参，证据串带实际值便于诊断
    var mpRow1 = null;
    [].forEach.call(document.querySelectorAll('.acsv-mp .acsv-frow'), function (r) {
      if (!mpRow1 && /广场动态1/.test(r.textContent)) mpRow1 = r;
    });
    window.__ACSV_OPEN__ = null;
    window.__ACSV_OPEN_T__ = null;
    if (mpRow1) {
      var origOpen = window.open;
      window.open = function (u, t) { window.__ACSV_OPEN__ = String(u); window.__ACSV_OPEN_T__ = String(t); return null; };
      try { mpRow1.click(); } finally { window.open = origOpen; }
    }
    rec('mp-row-open-source', !!(mpRow1 && mpRow1._pi
      && window.__ACSV_OPEN_T__ === '_blank' // 新标签（同窗跳转会丢页面：原生页内嵌语境不许）
      && /^https:\/\/www\.acfun\.cn\/moment\/am\d+$/.test(window.__ACSV_OPEN__ || '')
      && window.__ACSV_OPEN__ === mpRow1._pi.href), // 与行数据同源（CFG.api.momentBase，不许第二份手拼）
      window.__ACSV_OPEN__ == null ? (mpRow1 ? 'no-open' : 'no-row')
        : window.__ACSV_OPEN__ + ' [' + window.__ACSV_OPEN_T__ + ']');

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
    // 条目间分割线（0.9.136）：根评论有（原生色 #e6e6e6）、楼中楼不画（native 同款）
    rec('mp-cmt-native-sep', (function () {
      var hr = mpBox && mpBox.querySelector('.acsv-citem > .acsv-chr');
      return !!hr && getComputedStyle(hr).borderTopColor === 'rgb(230, 230, 230)'
        && !(mpBox && mpBox.querySelector('.acsv-csub .acsv-chr'));
    })());
    // UP 标不渲染（0.9.137；真机核对：原生评论组件无 UP 标识——isUp:true 样本也不该出标）
    rec('mp-cmt-no-up', !(mpBox && mpBox.querySelector('.acsv-cname .up'))
      && !(mpName && /UP/.test(mpName.textContent)), mpName ? mpName.textContent.trim().slice(0, 20) : 'none');
    // 楼中楼收起件（0.9.286，预览 comment-meta-polish 定稿）：独立灰键首次展开即挂、分页中途
    // 即可收、收起整块移除回初始（展开键放回）、重拉到完展开键自摘仅剩灰收起键。
    // 摘修复反跑：还原 expandSubComments 的 ensureFold/collapse 即转红
    var mpMore0 = mpBox && mpBox.querySelector('.acsv-cmore');
    rec('mp-cmt-fold-present', !!mpMore0 && /共 3 条回复, 点击查看/.test(mpMore0.textContent),
      mpMore0 ? mpMore0.textContent : 'none');
    if (mpMore0) mpMore0.click();
    await waitFor(function () { return mpBox.querySelector('.acsv-cfold'); }, 8000);
    rec('mp-cmt-fold-mid', (function () {
      var more = mpBox.querySelector('.acsv-cmore'), fold = mpBox.querySelector('.acsv-cfold');
      return !!more && /继续展开（剩 1 条）/.test(more.textContent) && !!fold
        && mpBox.querySelectorAll('.acsv-csub .acsv-citem').length === 2;
    })());
    mpBox.querySelector('.acsv-cfold').click();
    rec('mp-cmt-fold-collapse', (function () {
      var more = mpBox.querySelector('.acsv-cmore'), fold = mpBox.querySelector('.acsv-cfold');
      return !!more && /共 3 条回复, 点击查看/.test(more.textContent) && !fold
        && !mpBox.querySelector('.acsv-csub');
    })());
    mpBox.querySelector('.acsv-cmore').click();
    await waitFor(function () { return !mpBox.querySelector('.acsv-cmore'); }, 8000);
    rec('mp-cmt-fold-full', (function () {
      var fold = mpBox.querySelector('.acsv-cfold');
      // 重拉不走缓存：收起后再展开只含新拉的页（内联首屏子评论不回并）——1 页 1 条即拉完自摘
      return !!fold && mpBox.querySelectorAll('.acsv-csub .acsv-citem').length === 1;
    })());
    mpBox.querySelector('.acsv-cfold').click();
    rec('mp-cmt-fold-reset', (function () {
      var more = mpBox.querySelector('.acsv-cmore'), fold = mpBox.querySelector('.acsv-cfold');
      return !!more && !fold && !mpBox.querySelector('.acsv-csub');
    })());
    if (acts[1]) acts[1].click();
    await wait(250);
    rec('mp-cmts-close', !mRow.querySelector('.acsv-frow-cmts'));

    // 4) 原生页不接脚本大图查看器（0.9.314 用户裁决；实测依据 docs/api-research.md §18：官方关注
    //    动态流点动态卡配图＝站方自带查看器，脚本浮层在原生页既非原生观感又多余）。旧钉
    //    mp-imgview / mp-imgview-close（点格子 → 弹 .acsv-imgview → 点浮层关闭）随裁决退役，
    //    改写为两条各指一个红点：
    //      mp-no-imgview：点单图格子后脚本浮层不得出现，且那一击必须**有落点**（落到行默认）。
    //        红点＝摘 src/cards.js momentCellOf 的 siteOnly 提前 return（查看器回来 +
    //        stopPropagation 回来 ⇒ 弹层出现且不再有出站）
    //      mp-imgview-source：同一次点击的落点＝该行站方原址新标签，URL 与行数据同源。
    //        红点＝摘 memberplaza 的 onOpen:openRowSource（回 noop 即无出站）
    //    本宿主 boot 有 setRoot(document.body)（无壳浮层根，boot.js 分流表 memberCenter 分支），
    //    摘修复时浮层真的会挂上来，「不得出现」在这里是有牙的判据。事件派发同步，但弹层可能由
    //    后续补挂，故用 waitFor 开观察窗取**首个可见效应**：浮层节点与出站 URL 谁先到即本击落点，
    //    两侧都不动则窗满（3s）判红——不用固定 sleep 蒙
    var r2 = null;
    for (var j = 0; j < rows.length; j++) if (/广场动态2/.test(rows[j].textContent)) r2 = rows[j];
    var mpCell = r2 && r2.querySelector('.acsv-frow-img'); // 广场动态2 夹具带一张图 → rowGrid n1 单图格子
    window.__ACSV_OPEN__ = null; // 先清：上面 mp-row-open-source 用的是同一组捕获位
    window.__ACSV_OPEN_T__ = null;
    if (mpCell) {
      var mpCellOpen = window.open;
      window.open = function (u, t) { window.__ACSV_OPEN__ = String(u); window.__ACSV_OPEN_T__ = String(t); return null; };
      try { mpCell.click(); } finally { window.open = mpCellOpen; } // 用完必须复原
    }
    var mpHit = await waitFor(function () {
      if (q('.acsv-imgview')) return 'imgview';
      return window.__ACSV_OPEN__ ? 'source' : null;
    }, 3000);
    rec('mp-no-imgview', mpHit === 'source' && !q('.acsv-imgview'),
      'hit=' + mpHit + ' cell=' + (mpCell ? 'y' : 'none') + ' open=' + window.__ACSV_OPEN__);
    // 站方原址逐字钉（夹具 sq(2) → moment.momentId=5105000+2 → CFG.api.momentBase+5105002），
    // 并与行 _pi.href 同值——两条任一漂移即红，不留第二份手拼的余地
    rec('mp-imgview-source', mpHit === 'source'
      && window.__ACSV_OPEN__ === 'https://www.acfun.cn/moment/am5105002'
      && window.__ACSV_OPEN_T__ === '_blank'
      && !!r2 && !!r2._pi && window.__ACSV_OPEN__ === r2._pi.href,
      'hit=' + mpHit + ' u=' + window.__ACSV_OPEN__ + ' t=' + window.__ACSV_OPEN_T__
        + ' href=' + (r2 && r2._pi ? r2._pi.href : 'no-row'));

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
    // 广场收了 ⇒ 发布浮标必须跟着走（它挂在广场容器内，不常驻原生页）
    rec('mp-pubfab-gone', !q('.acsv-pubfab'));

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
