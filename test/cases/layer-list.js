// test/cases/layer-list.js —— 播放层「列表会话」（0.9.173；形态=docs/preview/jingxuan.html ②会话表）
// 用户裁决：搜索/榜单/分区/我的/关注进层后，↓/↑（含右栏 ▲▼、滚轮、触摸）按**来源结果列表**走——
// 搜索/榜单到头停（提示 + ▼ 隐）；分区按设置二选一（关=相关池随机 / 开=网格顺序续拉）；
// 相关推荐行跳转 = 换成那份 10 条列表（顺序、到头停）；动态里的视频卡片 = 单条（不出箭头）。
// mock：rank/channel（5 行，第 5 条文章被契约滤 ⇒ 4 视频行 489500..489503）、
//   /search/video（acId 500000+k）、selection/feed（__ACSV_MOCK_HOME__ 8 条）、
//   feed/related/general（池 700000+rid*10+k）——全在 my-sample/home-sample 里。
// 反跑：摘 playlayer 的 list 分派（走回 walk）⇒ ll-zone-step 红；摘 ctxOfVm 的 readSetting
// 分支 ⇒ ll-jx-list 红；摘 syncArrows ⇒ ll-zone-end/ll-up-hidden-first 红。
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;

(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['layer-list'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key, TEST = h.TEST;

    // ---- ① 榜单：层内 ↓/↑ = 榜单行顺序；右栏 ▲▼ 状态；到头停（提示 + ▼ 隐）；Esc 回榜单 ----
    location.hash = '#svfeed/zone';
    rec('ll-zone-rows', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-rlist-row .acsv-vrow').length >= 4;
    }, 10000)), 'rows=' + document.querySelectorAll('.acsv-rlist-row .acsv-vrow').length);
    var rows = document.querySelectorAll('.acsv-rlist-row .acsv-vrow');
    if (!rows.length) return;
    rows[0].click();
    var pl = await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'list' ? p : null;
    }, 8000);
    rec('ll-zone-list', !!pl, JSON.stringify(TEST.call('playlayer')));
    rec('ll-zone-anchor', !!(pl && Number(pl.id) === 489500), 'id=' + (pl || {}).id);
    rec('ll-arrows', !!(pl && pl.arrows === 2), 'arrows=' + (pl || {}).arrows);
    rec('ll-up-hidden-first', !!(pl && pl.upShown === false), JSON.stringify(pl));
    rec('ll-down-shown', !!(pl && pl.downShown === true));
    key('ArrowDown');
    rec('ll-zone-step', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 1 && Number(p.id) === 489501;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    rec('ll-up-shown-mid', !!(TEST.call('playlayer') || {}).upShown);
    key('ArrowUp');
    rec('ll-zone-back', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 0 && Number(p.id) === 489500 && p.upShown === false;
    }, 6000)), JSON.stringify(TEST.call('playlayer')));
    // 走到最后一条（489503）→ 再 ↓ = 停 + 「已经是最后一条」+ ▼ 隐
    for (var s = 0; s < 3; s++) { key('ArrowDown'); await wait(350); }
    key('ArrowDown');
    rec('ll-zone-end', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      var t = (q('.acsv-toast') || {}).textContent || '';
      return p.active && p.listIdx === 3 && /最后一条/.test(t) && p.downShown === false ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')) + ' toast=' + ((q('.acsv-toast') || {}).textContent || ''));
    // 右栏 ▲（回退一枚）：点它应回到 489502（会话内 ↑ 同一动作）
    var upBtn = q('.acsv-slide[data-ovl="1"] .acsv-arrow-up');
    rec('ll-up-btn-dom', !!upBtn);
    if (upBtn) upBtn.click();
    rec('ll-btn-prev', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 2 && Number(p.id) === 489502;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('Escape');
    rec('ll-zone-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'zone' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));

    // ---- ② 搜索：层内 = 搜索结果顺序（500001, 500002, ...；到头停）----
    location.hash = 'svfeed/search/video/' + encodeURIComponent('测试词');
    rec('ll-search-cells', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-sgrid .acsv-scell').length >= 3;
    }, 10000)), 'cells=' + document.querySelectorAll('.acsv-sgrid .acsv-scell').length);
    var cells = document.querySelectorAll('.acsv-sgrid .acsv-scell');
    if (!cells.length) return;
    cells[0].click();
    rec('ll-search-list', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'list' && Number(p.id) === 500001 ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('ArrowDown');
    rec('ll-search-step', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 1 && Number(p.id) === 500002;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('Escape');
    rec('ll-search-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'search' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));

    // ---- ③ 分区二选一：默认（关）= walk（相关池随机）；设置开 = 网格列表 + 可续拉 ----
    location.hash = '#svfeed/jingxuan';
    rec('ll-jx-grid', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.present && t.cards >= 3 ? t : null;
    }, 10000)), JSON.stringify(TEST.call('jingxuan')));
    var big = q('.acsv-jx-grid .acsv-jx-big');
    rec('ll-jx-big-dom', !!big);
    if (big) big.click();
    rec('ll-jx-walk', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'walk' ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('Escape');
    await waitFor(function () { return TEST.call('view') === 'jingxuan'; }, 6000);
    // 开设置（第 3 个布尔开关 = relSequential）→ 再点卡片 = 列表会话（网格顺序 + 可续拉）
    var gear = q('.acsv-dock-gear');
    if (gear) gear.click();
    var host = await waitFor(function () { return q('.acsv-set-host'); }, 5000);
    rec('ll-set-open', !!host);
    var sh = host && host.shadowRoot;
    var sw = sh && sh.querySelectorAll('.set-sw')[2];
    rec('ll-set-sw', !!sw);
    if (sw) sw.click();
    key('Escape');
    await waitFor(function () { return !q('.acsv-set-host'); }, 4000);
    var big2 = q('.acsv-jx-grid .acsv-jx-big');
    if (big2) big2.click();
    rec('ll-jx-list', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'list' && p.listLen >= 3 && p.hasMore === true ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('ArrowDown');
    rec('ll-jx-step', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 1 && Number(p.id) !== 900101;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    key('Escape');
    rec('ll-jx-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'jingxuan' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));

    // ---- ④ 动态里的视频卡片 = **单条**（用户裁决：仅此一例不出箭头、不可切）----
    location.hash = '#svfeed/follow';
    var vrow = await waitFor(function () {
      var rows = document.querySelectorAll('.acsv-frow');
      for (var i = 0; i < rows.length; i++) {
        if (/关注视频甲/.test(rows[i].textContent || '')) return rows[i];
      }
      return null;
    }, 12000);
    rec('ll-follow-vrow', !!vrow);
    if (vrow) vrow.click();
    rec('ll-follow-single', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'single' && p.arrows === 0 ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    var idS = Number((TEST.call('playlayer') || {}).id);
    key('ArrowDown');
    await wait(600);
    rec('ll-single-noop', (function () {
      var p = TEST.call('playlayer') || {};
      return p.active && Number(p.id) === idS;
    })(), 'id=' + (TEST.call('playlayer') || {}).id + '/' + idS);
    key('Escape');
    rec('ll-follow-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'follow' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));
  };
})();
