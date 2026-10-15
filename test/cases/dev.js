// test/cases/dev.js —— harness 场景：设备型号美化（0.9.246，Web-IP 吸收批次②）
// 机制：跟随关注视图行内评论宿主（ip.js 同款入口）；定向桩 'comment/list'——三条根评论带
// deviceModel（'realme RMX3619' 代前缀/取末段；'iPhone3,1'；'ZZZZ9999X' 未收录）+ 一楼中楼
// （'iPhone14,5'，钉 subOpts 的 devTag 透传）+ 'user/userInfo' 空回包（属地链路静默，不干扰本场景）。
//   dev-name：友好名替换（含代前缀取末段）+ **href 与结构不动**（预览 ③ 定稿）+ tooltip 原始型号 +
//     点击切换两向（友好名 ⇄ 原文）+ 未收录兜底原文（不瞎猜）+ 楼中楼同美化
//   dev-name-off：bundle 前预置 acsv.s.devName=false（harness.html 场景预处理）→ 全部保持原文
// 新增场景记得同步 run-harness.mjs 的 HARNESS_CASES（test/check-cases.mjs 双向校验）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  var APP_HREF = '//www.acfun.cn/app/';

  function stubOf() {
    return Object.assign({}, window.__ACSV_MY_MOCK__, {
      'user/userInfo': function () { return { result: 0, profile: {} }; },
      'comment/list': function () {
        return { result: 0, commentCount: 3, curPage: 1, totalPage: 1, pcursor: 'no_more', hotComments: [],
          rootComments: [
            { commentId: 'd1', userId: 9101, userName: '甲', headUrl: '', content: '带前缀码', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0, deviceModel: 'realme RMX3619' },
            { commentId: 'd2', userId: 9102, userName: '乙', headUrl: '', content: '苹果码', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0, deviceModel: 'iPhone3,1' },
            { commentId: 'd3', userId: 9103, userName: '丙', headUrl: '', content: '未收录码', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0, deviceModel: 'ZZZZ9999X' }
          ],
          subCommentsMap: { d3: [{ commentId: 'd3-1', userId: 9104, userName: '丁', headUrl: '', content: '楼中楼设备', postDate: '刚刚', likeCount: 0, subCommentCount: 0, deviceModel: 'iPhone14,5' }] } };
      }
    });
  }

  // 根评论节点（楼中楼会嵌套 .acsv-citem，取直属子级才是根）
  function rootsOf(box) { return box.querySelectorAll('.acsv-frow-cmtlist > .acsv-citem'); }
  function devAnchor(item) { return item && item.querySelector('.acsv-cfrom a'); }

  async function openRowInline(h) {
    var waitFor = h.waitFor, q = h.q;
    location.hash = 'svfeed/follow';
    var viewOk = await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null;
    }, 10000);
    if (!viewOk) return null;
    var mRow = null;
    await waitFor(function () {
      var rows = document.querySelectorAll('.acsv-mewrap .acsv-frow');
      for (var i = 0; i < rows.length; i++) {
        if (/动态正文带 UBB/.test(rows[i].textContent)) { mRow = rows[i]; return true; }
      }
      return false;
    }, 8000);
    if (!mRow) return null;
    var acts = mRow.querySelectorAll('.acsv-fact');
    if (acts[1]) acts[1].click(); // 评论键 → 行内展开
    var box = await waitFor(function () {
      var b = mRow.querySelector('.acsv-frow-cmts');
      return b && rootsOf(b).length === 3 ? b : null;
    }, 8000);
    return box ? { row: mRow, box: box } : null;
  }

  C['dev-name'] = async function (h) {
    var rec = h.rec, waitFor = h.waitFor, wait = h.wait;
    window.__ACSV_MOCK_FORM__ = stubOf();
    delete window.__ACSV_MOCK__;
    var hs = await openRowInline(h);
    rec('dname-open', !!hs);
    if (!hs) return;
    var roots = rootsOf(hs.box);
    var a1 = devAnchor(roots[0]), a2 = devAnchor(roots[1]), a3 = devAnchor(roots[2]);
    // 命中即替换（代前缀 'realme RMX3619' → 真我 V30；取末段查表）
    rec('dname-hit', !!(await waitFor(function () { return a1 && a1.textContent === '真我 V30'; }, 8000)),
      a1 ? a1.textContent : 'no-anchor');
    // 预览 ③ 定稿：只换文字，href（官方 APP 落点）与结构不动
    rec('dname-href-kept', !!a1 && a1.getAttribute('href') === APP_HREF, a1 ? a1.getAttribute('href') : '');
    // tooltip = 原始型号 + 点击提示（Web-IP 文案同款）
    rec('dname-title', !!a1 && a1.title === '原始型号: realme RMX3619\n点击可切换显示', a1 ? a1.title : '');
    // 点击切换两向：友好名 ⇄ 原文（preventDefault 拦原生跳转）
    if (a1) a1.click();
    rec('dname-toggle-back', !!a1 && a1.textContent === 'realme RMX3619', a1 ? a1.textContent : '');
    if (a1) a1.click();
    rec('dname-toggle-again', !!a1 && a1.textContent === '真我 V30', a1 ? a1.textContent : '');
    // 精确命中（无前缀码）
    rec('dname-apple', !!(await waitFor(function () { return a2 && a2.textContent === 'iPhone 4'; }, 8000)),
      a2 ? a2.textContent : 'no-anchor');
    // 未收录兜底原文：不瞎猜、不加提示、保持原生跳转语义
    rec('dname-miss-verbatim', !!a3 && a3.textContent === 'ZZZZ9999X' && a3.getAttribute('href') === APP_HREF,
      a3 ? a3.textContent + '|' + a3.title : 'no-anchor');
    // 楼中楼同美化（subOpts 的 devTag 透传路径）
    rec('dname-sub', !!(await waitFor(function () {
      var sub = roots[2] && roots[2].querySelector('.acsv-csub .acsv-cfrom a');
      return sub && sub.textContent === 'iPhone 13';
    }, 8000)), (function () {
      var sub = roots[2] && roots[2].querySelector('.acsv-csub .acsv-cfrom a');
      return sub ? sub.textContent : 'no-sub';
    })());
    await wait(200); // 属地链路静默收尾（不干扰本场景断言）
  };

  C['dev-name-off'] = async function (h) {
    var rec = h.rec, wait = h.wait;
    window.__ACSV_MOCK_FORM__ = stubOf();
    delete window.__ACSV_MOCK__;
    var hs = await openRowInline(h);
    rec('dname-off-open', !!hs);
    if (!hs) return;
    await wait(500); // 渲染与（若有的）替换窗口
    var roots = rootsOf(hs.box);
    rec('dname-off-verbatim', !!devAnchor(roots[0]) && devAnchor(roots[0]).textContent === 'realme RMX3619',
      devAnchor(roots[0]) ? devAnchor(roots[0]).textContent : 'no-anchor');
    rec('dname-off-no-title', !!devAnchor(roots[1]) && !devAnchor(roots[1]).title);
  };
})();
