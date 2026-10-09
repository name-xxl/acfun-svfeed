// 场景：moment-publish（0.9.222 发动态编辑器）
// 走**真实入口**（我的页 tab 行右侧「✎ 发动态」）→ 编辑器壳 → 组参 → 提交 → 成功/失败两分支。
// mock 缝抓 body 形状（`params` JSON 的字段与取值）与结果码映射，依赖 debug 构建。
// 为什么能抓到：写链走 net.request ⇒ 命中 __ACSV_MOCK_FORM__（直用 gmRequest 的模块是漏缝的）。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['moment-publish'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST;

    document.cookie = 'auth_key=42_deadbeef'; // selfUid（先查后补路径要用）
    window.__ACSV_ADD_BODY__ = null;
    window.__ACSV_ADD_FAIL__ = null;
    window.__ACSV_MOCK_FORM__ = {
      'moment/add': function (body) {
        window.__ACSV_ADD_BODY__ = body;
        var f = window.__ACSV_ADD_FAIL__;
        if (f) {
          return { result: f, error_msg: f === 140000 ? '内容长度必须为1-233' : '参数格式错误，请仔细阅读API文档。' };
        }
        return { result: 0, moment: { momentId: '5109999' } };
      },
      'user/getUserCardList': { result: 1, users: [] },
      'browse/history/list': { result: 0, totalCount: 0, histories: [] }
    };
    location.hash = 'svfeed/my';

    // 1) 入口 → 编辑器壳
    rec('pub-entry-present', !!(await waitFor(function () { return !!q('.acsv-me-entry'); }, 10000)));
    q('.acsv-me-entry').click();
    rec('pub-editor-open', !!(await waitFor(function () { return !!q('.acsv-me-host .acsv-me'); }, 5000)));
    rec('pub-editor-title', /发动态/.test((q('.acsv-me-hd') || {}).textContent || ''),
      (q('.acsv-me-hd') || {}).textContent);
    rec('pub-editor-mirror', !!q('.acsv-me .acsv-cinput-mir')); // 编辑器输入条同带镜像层（三处共用）

    // 2) 输入 → 字数 → 可见范围
    var ta = q('.acsv-me .acsv-cinput-text');
    ta.value = '自动化测试内容 [emot=acfun,1/]';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    rec('pub-count', /\/233$/.test((q('.acsv-me-count') || {}).textContent || ''),
      (q('.acsv-me-count') || {}).textContent);
    var pills = document.querySelectorAll('.acsv-me-pill');
    if (pills[1]) pills[1].click();
    rec('pub-vis-fans', !!(pills[1] && pills[1].classList.contains('on')));

    // 3) 提交 → 成功分支（body 形状＝契约面）
    q('.acsv-me-ok').click();
    rec('pub-posted-closes', !!(await waitFor(function () { return !q('.acsv-me-host'); }, 6000)));
    rec('pub-body-shape', (function () {
      var b = window.__ACSV_ADD_BODY__;
      if (!b) return false;
      var m = /params=([^&]*)/.exec(String(b));
      if (!m) return false;
      var j = JSON.parse(decodeURIComponent(m[1]));
      return j.content === '自动化测试内容 [emot=acfun,1/]' && Array.isArray(j.imgs)
        && j.shareResourceType === 0 && j.visibleForFans === true;
    })(), String(window.__ACSV_ADD_BODY__).slice(0, 100));

    // 4) 失败分支：服务端回 140000（内容太长）→ 可读话术 + **内容保留** + 按钮变「重试发布」
    window.__ACSV_ADD_FAIL__ = 140000;
    q('.acsv-me-entry').click();
    await waitFor(function () { return !!q('.acsv-me'); }, 5000);
    var ta2 = q('.acsv-me .acsv-cinput-text');
    ta2.value = '要失败的内容';
    ta2.dispatchEvent(new Event('input', { bubbles: true }));
    q('.acsv-me-ok').click();
    rec('pub-fail-tip', !!(await waitFor(function () {
      var t = q('.acsv-me-tip');
      return t && /内容太长/.test(t.textContent);
    }, 6000)), (q('.acsv-me-tip') || {}).textContent);
    rec('pub-fail-keeps-content', (q('.acsv-me .acsv-cinput-text') || {}).value === '要失败的内容');
    rec('pub-fail-retry-label', (q('.acsv-me-ok') || {}).textContent === '重试发布');

    // 5) 关闭（提交中不许关 → 落定后可以关）
    window.__ACSV_ADD_FAIL__ = null;
    q('.acsv-me-cc').click();
    rec('pub-closed', !!(await waitFor(function () { return !q('.acsv-me-host'); }, 4000)));

    // 6) 转发形态：带源引用块 + params 携 repostMomentId（编辑器的转发入口由分享面板给出）
    window.__ACSV_ADD_BODY__ = null;
    var fake = { ct: 'moment', momentId: 5104362, text: '源动态正文', imgs: [], up: { id: 7, name: '源UP' } };
    var rp = TEST.call('momentRepostOf', fake);
    rec('pub-repost-map', !!rp && rp.ct === 'moment' && rp.id === 5104362, JSON.stringify(rp && rp.id));
    TEST.call('momentEdit', { repost: rp });
    rec('pub-repost-edit', !!(await waitFor(function () { return !!q('.acsv-me-host'); }, 4000)));
    rec('pub-repost-quote', !!q('.acsv-me-bd .acsv-gquote'), (q('.acsv-me-bd') || {}).textContent);
    rec('pub-repost-title', /转发/.test((q('.acsv-me-hd') || {}).textContent || ''));
    var ta3 = q('.acsv-me .acsv-cinput-text');
    ta3.value = '转发语';
    ta3.dispatchEvent(new Event('input', { bubbles: true }));
    q('.acsv-me-ok').click();
    await waitFor(function () { return !q('.acsv-me-host'); }, 6000);
    rec('pub-repost-body', (function () {
      var b = window.__ACSV_ADD_BODY__;
      if (!b) return false;
      var m = /params=([^&]*)/.exec(String(b));
      if (!m) return false;
      var j = JSON.parse(decodeURIComponent(m[1]));
      return j.content === '转发语' && j.repostMomentId === 5104362;
    })(), String(window.__ACSV_ADD_BODY__).slice(0, 100));
  };
})();
