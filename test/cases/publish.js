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
      // 动态档长列表（30 行）：让视图体真的能滚 —— 浮标贴回顶的几何断言需要滚动
      'feed/profile': {
        result: 0, pcursor: 'no_more',
        feedList: Array.from({ length: 30 }, function (_, i) {
          return {
            resourceType: 10, resourceId: 5100000 + i, createTime: Date.now() - (i + 5) * 3600 * 1000,
            moment: { momentId: String(5100000 + i), text: '第 ' + i + ' 行动态' },
            user: { userId: 42, userName: '测试用户', userHead: '' }
          };
        })
      },
      'browse/history/list': { result: 0, totalCount: 0, histories: [] },
      // 0.9.237 表情面板测试桩：包0 给 12 条（网格两行），其余 19 包各 1 条（底栏必然溢出）
      'emotion/getUserEmotion': function () {
        var PIX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        var pkgs = [];
        for (var p = 0; p < 20; p++) {
          var n = p === 0 ? 12 : 1;
          var emos = [];
          for (var i = 0; i < n; i++) {
            emos.push({ id: 'e' + p + '_' + i, name: 'e' + p + '_' + i, emotionImageSmallUrl: PIX, emotionImageBigUrl: PIX });
          }
          pkgs.push({ name: '包' + p, emotions: emos });
        }
        return { result: 0, emotionPackageList: pkgs };
      }
    };
    location.hash = 'svfeed/my';

    // 1) 入口 → 编辑器壳
    // 0.9.224：入口＝右下角常驻浮标（旧的三处入口已撤：`.acsv-me-entry` 应当不存在）
    rec('pub-fab-present', !!(await waitFor(function () { return !!q('.acsv-pubfab'); }, 10000)));
    rec('pub-old-entries-gone', !q('.acsv-me-entry') && !q('.acsv-sq-tools'));
    // 位置口径（用户裁决）：**钉在「回到顶部」之上**——滚过阈值让回顶现身，再量几何
    var vb = q('.acsv-view-body');
    vb.scrollTop = 600;
    vb.dispatchEvent(new Event('scroll'));
    rec('pub-fab-above-backtop', !!(await waitFor(function () {
      var f = q('.acsv-pubfab');
      var b = q('.acsv-mepanel[data-tab="moments"] .acsv-backtop.on');
      if (!f || !b) return false;
      var fr = f.getBoundingClientRect(), br = b.getBoundingClientRect();
      return fr.bottom <= br.top + 1                       // 上下不重叠（浮标在上）
        && Math.abs(fr.right - br.right) <= 12;            // 右对齐（同一竖列）
    }, 5000)), (function () {
      var f = q('.acsv-pubfab');
      var b = q('.acsv-mepanel[data-tab="moments"] .acsv-backtop.on');
      if (!f || !b) return 'n/a';
      return 'fab.b=' + Math.round(f.getBoundingClientRect().bottom)
        + ' backtop.t=' + Math.round(b.getBoundingClientRect().top);
    })());
    vb.scrollTop = 0;
    vb.dispatchEvent(new Event('scroll'));
    q('.acsv-pubfab').click();
    rec('pub-editor-open', !!(await waitFor(function () { return !!q('.acsv-me-host .acsv-me'); }, 5000)));
    rec('pub-editor-title', /发动态/.test((q('.acsv-me-hd') || {}).textContent || ''),
      (q('.acsv-me-hd') || {}).textContent);
    rec('pub-editor-mirror', !!q('.acsv-me .acsv-cinput-mir')); // 编辑器输入条同带镜像层（三处共用）
    // 0.9.226：表情面板必须落在**模态矩形内**（曾因 absolute+bottom:57px 是抽屉口径 ⇒ 逃到浮层根、跑到屏幕底部）
    var eb = q('.acsv-me .acsv-cinput-emot');
    if (eb) eb.click();
    rec('pub-emotpanel-in-modal', !!(await waitFor(function () {
      var p = q('.acsv-me-emot'), m = q('.acsv-me');
      if (!p || !m || getComputedStyle(p).display === 'none') return false;
      var pr = p.getBoundingClientRect(), mr = m.getBoundingClientRect();
      return pr.top >= mr.top - 1 && pr.bottom <= mr.bottom + 1;
    }, 4000)), (function () {
      var p = q('.acsv-me-emot'), m = q('.acsv-me');
      if (!p || !m) return 'none';
      var pr = p.getBoundingClientRect(), mr = m.getBoundingClientRect();
      return 'panel=' + Math.round(pr.top) + '..' + Math.round(pr.bottom) + ' modal=' + Math.round(mr.top) + '..' + Math.round(mr.bottom);
    })());
    rec('pub-emot-items', !!(await waitFor(function () { return !!q('.acsv-me-emot .acsv-emot-item'); }, 5000)));
    // 0.9.237 预览定位钉：预览锚回面板内（原先逃到浮层根、屏幕左上 (82,4)）；首行条目翻到下方
    var paRect = q('.acsv-me-emot') && q('.acsv-me-emot').getBoundingClientRect();
    var cell1 = q('.acsv-me-emot .acsv-emot-item');
    var cellMid = q('.acsv-me-emot .acsv-emot-item:nth-child(12)') || cell1;
    if (cell1) cell1.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(120);
    var pv = q('.acsv-me-emot .acsv-emot-prev');
    var pvRect = pv && pv.getBoundingClientRect();
    var c1Rect = cell1 && cell1.getBoundingClientRect();
    rec('pub-emot-prev-in-panel', !!(pvRect && paRect && pvRect.left >= paRect.left - 1
      && pvRect.right <= paRect.right + 1 && pvRect.top >= paRect.top - 1),
      pvRect ? JSON.stringify({ l: Math.round(pvRect.left), t: Math.round(pvRect.top), pl: Math.round(paRect.left), pt: Math.round(paRect.top) }) : 'no-prev');
    rec('pub-emot-prev-first-row-below', !!(pvRect && c1Rect && pvRect.top > c1Rect.bottom),
      pvRect && c1Rect ? Math.round(pvRect.top) + '>' + Math.round(c1Rect.bottom) : 'no-prev');
    if (cellMid && cellMid !== cell1) {
      cellMid.dispatchEvent(new MouseEvent('mouseenter'));
      await wait(120);
      var pv2 = q('.acsv-me-emot .acsv-emot-prev');
      var r2 = pv2 && pv2.getBoundingClientRect();
      var c2Rect = cellMid.getBoundingClientRect();
      // 面板内第二行（上方留给 124px 预览不够）→ 翻到条目下方；且必须在面板矩形内
      rec('pub-emot-prev-row2-below', !!(r2 && r2.top > c2Rect.bottom && r2.left >= paRect.left - 1 && r2.right <= paRect.right + 1),
        r2 ? JSON.stringify({ t: Math.round(r2.top), cb: Math.round(c2Rect.bottom) }) : 'no-prev');
    }
    // 0.9.237 底栏拖动钉：20 包溢出，pointer 拖拽必须滚动（原先藏滚动条又无拖拽）
    var strip2 = q('.acsv-me-emot .acsv-emot-strip');
    var sBefore = strip2 ? strip2.scrollLeft : -1;
    if (strip2) {
      strip2.dispatchEvent(new PointerEvent('pointerdown', { clientX: 400, bubbles: true, pointerId: 3 }));
      strip2.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, bubbles: true, pointerId: 3 }));
      strip2.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
    }
    rec('pub-emot-strip-drag', !!(strip2 && strip2.scrollWidth > strip2.clientWidth + 10
      && strip2.scrollLeft > sBefore + 20),
      strip2 ? ('sw=' + strip2.scrollWidth + ' cw=' + strip2.clientWidth + ' sl=' + strip2.scrollLeft) : 'no-strip');
    if (eb) eb.click(); // 收起，免得影响后面

    // 2) 输入 → 字数 → 可见范围
    var ta = q('.acsv-me .acsv-cinput-text');
    ta.value = '自动化测试内容 [emot=acfun,1/]';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    rec('pub-count', /\/233$/.test((q('.acsv-me-count') || {}).textContent || ''),
      (q('.acsv-me-count') || {}).textContent);
    var pills = document.querySelectorAll('.acsv-me-pill');
    if (pills[1]) pills[1].click();
    rec('pub-vis-fans', !!(pills[1] && pills[1].classList.contains('on')));

    // 0.9.234 上传失败提示必须"出现且留存"：先前链式收尾 then 在 pending=0 时立刻把 tip 抹成空串，
    // 失败文案一闪而过。故意等 400ms 越过收尾 then 再断言（摘修复反跑：抹掉分支还原即转红）
    var fileInp = q('.acsv-me input[type=file]');
    if (fileInp) {
      var dtOK = true;
      try {
        var dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(2048)], 'probe.png', { type: 'image/png' }));
        fileInp.files = dt.files;
        fileInp.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) { dtOK = false; }
      var tipSeen = dtOK && !!(await waitFor(function () {
        return /图片上传失败/.test((q('.acsv-me-tip') || {}).textContent || '');
      }, 6000));
      await wait(400);
      rec('pub-upload-tip-persists', tipSeen && /图片上传失败/.test((q('.acsv-me-tip') || {}).textContent || ''),
        'seen=' + tipSeen + ' now=' + JSON.stringify((q('.acsv-me-tip') || {}).textContent));
    } else {
      rec('pub-upload-tip-persists', false, 'no-file-input');
    }

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
    q('.acsv-pubfab').click();
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
    // 0.9.226 浅色语境（原生页打开编辑器时）：面板根带 .acsv-mp ⇒ 外壳与内部件都走浅色
    TEST.call('momentEdit', { light: true });
    rec('pub-light-open', !!(await waitFor(function () { return !!q('.acsv-me.acsv-mp'); }, 4000)));
    rec('pub-light-shell', (function () {
      var m = q('.acsv-me.acsv-mp');
      if (!m) return false;
      var cs = getComputedStyle(m);
      return cs.backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(q('.acsv-me-hd')).color === 'rgb(51, 51, 51)';
    })(), (function () { var m = q('.acsv-me.acsv-mp'); return m ? getComputedStyle(m).backgroundColor : 'none'; })());
    q('.acsv-me-x').click();
    rec('pub-light-closed', !!(await waitFor(function () { return !q('.acsv-me-host'); }, 3000)));

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