// 场景：bf-viewport（0.9.229 视口渐进回填——四个动态宿主共用一套规则）
// 与 view-square 的分工：那条只钉"首屏可见行被回填"；本场景专测**视口驱动**——
// 把**老条目**（仍在广场 24h 窗内、但远超旧的 3h 新鲜窗）滚进视口后**也应被回填**，
// 且**每行只补一次**（mock 计数不随重复滚动增长）。旧契约「>3h 保持快照」已退役。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['bf-viewport'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait;

    window.__ACSV_BF_CALLS__ = 0;
    var now = Date.now();
    window.__ACSV_MOCK_FORM__ = {
      // 24 条：前 2 条"新"（1h 前），其余"老"（20h 前——仍在广场 24h 窗内、远超旧 3h 窗）
      'feed/feedSquare': {
        result: 0, pcursor: 'no_more',
        feedList: Array.from({ length: 24 }, function (_, i) {
          var id = 5190000 + i;
          return {
            resourceType: 10, resourceId: id,
            createTime: now - (i < 2 ? 1 : 20) * 3600 * 1000,
            moment: { momentId: String(id), text: '列表明文' + i }, // 列表是明文（服务端剥表情）
            user: { userId: 9, userName: 'UP' + i, userHead: '' },
            likeCount: 6, commentCount: 0, bananaCount: 0, shareCount: 0
          };
        })
      },
      // 详情才带 UBB（含令牌）——回填应把该行正文换成这一份
      'moment/detail': function (body, url) {
        window.__ACSV_BF_CALLS__++;
        var id = (String(url).match(/momentId=(\d+)/) || [])[1] || '';
        return { result: 0, moment: {
          momentId: id, text: '回填正文' + id + ' [emot=acfun,1/]',
          likeCount: 9, commentCount: 4, bananaCount: 2, isLike: true, isThrowBanana: true
        } };
      }
    };
    location.hash = 'svfeed/square';
    rec('bf-open', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-sqwrap .acsv-frow').length >= 20;
    }, 10000)));

    // ① 首屏可见行：进视口即补（互动态点亮 + 正文换成详情版）
    rec('bf-first-row', !!(await waitFor(function () {
      var t = q('.acsv-sqwrap .acsv-frow .acsv-frow-text');
      return !!t && /回填正文/.test(t.textContent)
        && (!!t.querySelector('img.ubb-emotion') || !!t.querySelector('.ubb-emot-ph'));
    }, 12000)), (function () {
      var t = q('.acsv-sqwrap .acsv-frow .acsv-frow-text');
      return t ? String(t.innerHTML).slice(0, 60) : 'no-row';
    })());

    // ② 老条目：滚到底（末行进视口）→ 同样被补（旧契约下它永远保持快照）
    var body = q('.acsv-view-body');
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new Event('scroll'));
    rec('bf-old-row', !!(await waitFor(function () {
      var rows = document.querySelectorAll('.acsv-sqwrap .acsv-frow');
      var last = rows[rows.length - 1];
      return !!last && /回填正文/.test(last.textContent);
    }, 12000)), (function () {
      var rows = document.querySelectorAll('.acsv-sqwrap .acsv-frow');
      var last = rows[rows.length - 1];
      return last ? last.textContent.slice(0, 40) : 'no-row';
    })());

    // ③ 每行只补一次：来回滚两趟，调用数不得再涨
    var n1 = window.__ACSV_BF_CALLS__;
    body.scrollTop = 0; body.dispatchEvent(new Event('scroll')); await wait(700);
    body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); await wait(700);
    rec('bf-once-per-row', window.__ACSV_BF_CALLS__ === n1, 'calls=' + n1 + '→' + window.__ACSV_BF_CALLS__);
  };
})();
