// test/cases/layer-list.js —— 播放层「列表会话」（0.9.173；形态=docs/preview/jingxuan.html ②会话表）
// 用户裁决：搜索/榜单/分区/我的进层后，↓/↑（含右栏 ▲▼、滚轮、触摸）按**来源结果列表**走（关注视图
// 的视频卡片例外=单条，见 ④）——
// 搜索/榜单到头停（提示 + ▼ 隐）；分区按设置二选一（关=相关池随机 / 开=网格顺序续拉）；
// 相关推荐行跳转 = **压新级别开列表播放器**（0.9.174，那份 10 条顺序播、Esc 弹回原视频）；
// 动态里的视频卡片 = 单条（不出箭头）。
// mock：rank/channel（5 行，第 5 条文章被契约滤 ⇒ 4 视频行 489500..489503）、
//   /search/video（acId 500000+k）、selection/feed（__ACSV_MOCK_HOME__ 8 条）、
//   feed/related/general（池 700000+rid*10+k）——全在 my-sample/home-sample 里。
// 反跑：摘 playlayer 的 list 分派（走回 walk）⇒ ll-zone-step 红；摘 ctxOfVm 的 readSetting
// 分支 ⇒ ll-jx-list 红；摘 syncArrows ⇒ ll-zone-end/ll-up-hidden-first 红；
// ⑤连播进层（0.9.183）：摘 player.js onEnded 的层内 playStep 分支 ⇒ ll-autonext 红；
// 摘 controls 开关遍历的根级扩面/applyLoop ⇒ ll-auto-loop-off/ll-auto-loop-on 红；
// 摘 state.ovlNoNext 注册或 playback.applyLoop 的 single 豁免 ⇒ ll-single-loop-always 红。
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

    // ---- ③b 用户路径端到端（0.9.174/175 复现口径）：分区点卡 → 相关行 → **压列表播放器**
    //      → Esc 关抽屉 → Esc **弹回原视频** → Esc 才退层回分区 ----
    var big3 = q('.acsv-jx-grid .acsv-jx-big');
    rec('ll-path-card-dom', !!big3);
    if (big3) {
      var entryId = Number((TEST.call('jingxuan') || {}).rendered) ? 0 : 0; // 占位：实际取点击后 hook
      big3.click();
      rec('ll-path-l1', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && pl.levels === 1 ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      var l1Id = Number((TEST.call('playlayer') || {}).id);
      key('c'); // 开抽屉 → 相关推荐 tab（层内条目 kind=home）
      rec('ll-path-drawer', !!(await waitFor(function () {
        var d = q('.acsv-drawer');
        var t = TEST.call('reldrawer');
        return !!d && d.classList.contains('open') && t && t.relTabShown;
      }, 6000)), JSON.stringify(TEST.call('reldrawer')));
      var tabR2 = q('.acsv-dtab-rel');
      if (tabR2) tabR2.click();
      rec('ll-path-rel-ready', !!(await waitFor(function () {
        var t = TEST.call('reldrawer');
        return t && t.relOn && t.rows === 11 ? t : null;
      }, 8000)), JSON.stringify(TEST.call('reldrawer')));
      var rowJ = q('.acsv-rellist .acsv-relrow:nth-child(2)');
      rec('ll-path-row-dom', !!rowJ);
      if (rowJ) rowJ.click();
      rec('ll-path-l2', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        var t = TEST.call('reldrawer') || {};
        return pl.active && pl.levels === 2 && Number(pl.parentId) === l1Id && t.listOn ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')) + ' ' + JSON.stringify(TEST.call('reldrawer')));
      key('Escape'); // 关抽屉（列表播放器的抽屉是自动开的）
      rec('ll-path-drawer-closed', !!(await waitFor(function () {
        var d = q('.acsv-drawer');
        return !!d && !d.classList.contains('open');
      }, 4000)));
      key('Escape'); // **弹回原视频**
      rec('ll-path-back-video', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && pl.levels === 1 && Number(pl.id) === l1Id ? pl : null;
      }, 8000)), 'l1=' + l1Id + ' ' + JSON.stringify(TEST.call('playlayer')));
      key('Escape'); // 再 Esc 才退层回分区
      rec('ll-path-exit', !!(await waitFor(function () {
        return TEST.call('view') === 'jingxuan' && !(TEST.call('playlayer') || {}).active;
      }, 6000)), 'view=' + TEST.call('view'));

      // ---- ③c 顶栏「向左返回」也必须先弹级（0.9.176：用户实报「点左上角返回键直接回分区」）----
      var big4 = q('.acsv-jx-grid .acsv-jx-big');
      if (big4) {
        big4.click();
        rec('ll-path2-l1', !!(await waitFor(function () {
          var pl = TEST.call('playlayer') || {};
          return pl.active && pl.levels === 1 ? pl : null;
        }, 8000)), JSON.stringify(TEST.call('playlayer')));
        var l1b = Number((TEST.call('playlayer') || {}).id);
        key('c');
        await waitFor(function () { return !!q('.acsv-drawer.open'); }, 6000);
        var tabR3 = q('.acsv-dtab-rel');
        if (tabR3) tabR3.click();
        await waitFor(function () { var t = TEST.call('reldrawer'); return t && t.rows === 11; }, 8000);
        var rowJ2 = q('.acsv-rellist .acsv-relrow:nth-child(2)');
        if (rowJ2) rowJ2.click();
        rec('ll-path2-l2', !!(await waitFor(function () {
          var pl = TEST.call('playlayer') || {};
          return pl.active && pl.levels === 2 ? pl : null;
        }, 8000)), JSON.stringify(TEST.call('playlayer')));
        var backBtn = q('.acsv-back-btn');
        rec('ll-path2-backbtn-dom', !!backBtn);
        if (backBtn) backBtn.click();
        rec('ll-path2-back-pop', !!(await waitFor(function () {
          var pl = TEST.call('playlayer') || {};
          return pl.active && pl.levels === 1 && Number(pl.id) === l1b ? pl : null;
        }, 8000)), 'l1=' + l1b + ' ' + JSON.stringify(TEST.call('playlayer')));
        // 弹回时抽屉仍开着（用户就是在这个状态下点返回键的）：「列表」页签必须已经收起
        //（0.9.177 实报「点返回键回原视频，抽屉里还是列表」——上级是列表会话时旧逻辑会再亮它）
        rec('ll-path2-pop-no-list', !!(await waitFor(function () {
          var d = q('.acsv-drawer');
          var t = TEST.call('reldrawer');
          return !!d && d.classList.contains('open') && t && t.listShown === false && t.listOnly === false ? t : null;
        }, 4000)), JSON.stringify(TEST.call('reldrawer')));
        if (backBtn) backBtn.click(); // 单级：返回键这回才回来源
        rec('ll-path2-back-origin', !!(await waitFor(function () {
          return TEST.call('view') === 'jingxuan' && !(TEST.call('playlayer') || {}).active;
        }, 6000)), 'view=' + TEST.call('view'));
      }
    }

    // ---- ③d 列表页签不得泄漏到下次进层（0.9.176 用户实报「再次点分区视频，展开抽屉出现列表栏」）----
    (function () { if (big4) big4.click(); })(); // 再进一层（此时上一轮列表播放器页签应已随层拆收起）
    if (big4) {
      rec('ll-leak-l1', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && pl.levels === 1 ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      key('c');
      rec('ll-leak-no-listtab', !!(await waitFor(function () {
        var d = q('.acsv-drawer');
        var t = TEST.call('reldrawer');
        return !!d && d.classList.contains('open') && t && t.listShown === false && t.listOnly === false ? t : null;
      }, 6000)), JSON.stringify(TEST.call('reldrawer')));
      key('Escape');
      key('Escape');
      await waitFor(function () { return TEST.call('view') === 'jingxuan'; }, 6000);
    }

    // ---- ③e 抽屉默认停在「评论」+ 页签跟随（0.9.178 用户实报两条）----
    // ①「展开抽屉应默认打开评论，不记忆上次」：进列表播放器（列表页签自动激活）→ 关抽屉 → 重开，
    //    必须回评论（列表页签仍在场——那是第三播放器的 UI——但不得激活）
    (function () { if (big4) big4.click(); })();
    if (big4) {
      rec('ll-def-l1', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && pl.levels === 1 ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      var l1c = Number((TEST.call('playlayer') || {}).id);
      key('c');
      await waitFor(function () { return !!q('.acsv-drawer.open'); }, 6000);
      var tabR5 = q('.acsv-dtab-rel');
      if (tabR5) tabR5.click();
      await waitFor(function () { var t = TEST.call('reldrawer'); return t && t.rows === 11; }, 8000);
      var rowJ3 = q('.acsv-rellist .acsv-relrow:nth-child(2)');
      if (rowJ3) rowJ3.click();
      rec('ll-def-l2-liston', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        var t = TEST.call('reldrawer') || {};
        return pl.active && pl.levels === 2 && t.listOn ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('reldrawer')) + ' ' + JSON.stringify(TEST.call('playlayer')));
      key('Escape'); // 关抽屉（此刻列表页签是激活的）
      await waitFor(function () { var d = q('.acsv-drawer'); return !!d && !d.classList.contains('open'); }, 4000);
      key('c'); // 重开：不得记忆上次页签
      await waitFor(function () { return !!q('.acsv-drawer.open'); }, 6000);
      rec('ll-def-open-cmt', (function () {
        var t = TEST.call('reldrawer') || {};
        var tabC = q('.acsv-dtab'); // 文档序第一个 = 评论页签
        return !!tabC && tabC.classList.contains('on') && t.relOn === false && t.listOn === false && t.listShown === true;
      })(), JSON.stringify(TEST.call('reldrawer')));
      key('Escape'); // 收抽屉，继续 ② 路径
      key('Escape'); // 弹回第 1 级
      await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && pl.levels === 1;
      }, 8000);
      key('c');
      await waitFor(function () { return !!q('.acsv-drawer.open'); }, 6000);
      // ②「点相关推荐后往下刷要跟着当前栏目」：抽屉开着停在相关推荐，↓ 换条后仍在该页签、且列的是新视频的
      var tabR4 = q('.acsv-dtab-rel');
      if (tabR4) tabR4.click();
      rec('ll-follow-rel-on', !!(await waitFor(function () {
        var t = TEST.call('reldrawer');
        return t && t.relOn && t.rows === 11 ? t : null;
      }, 8000)), JSON.stringify(TEST.call('reldrawer')));
      key('ArrowDown');
      rec('ll-follow-next', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && Number(pl.id) !== l1c ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      rec('ll-follow-keep-tab', !!(await waitFor(function () {
        var d = q('.acsv-drawer');
        var t = TEST.call('reldrawer');
        var pl = TEST.call('playlayer') || {};
        // 抽屉仍开、仍停在相关推荐、且已切到**新视频**的那份（rid 跟随）
        return !!d && d.classList.contains('open') && t && t.relOn && t.relTabShown && t.rid === String(pl.id) ? t : null;
      }, 8000)), JSON.stringify(TEST.call('reldrawer')) + ' ' + JSON.stringify(TEST.call('playlayer')));
      key('Escape');
      key('Escape');
      await waitFor(function () { return TEST.call('view') === 'jingxuan'; }, 6000);
    }

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
    // 单条会话的连播语义（0.9.183）：没有下一条 → 连播开着也只循环（loop 恒 true、ended 不前进）
    var autoBtnS = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
    rec('ll-single-autobtn-dom', !!autoBtnS);
    if (autoBtnS) autoBtnS.click();
    rec('ll-single-loop-always', !!(await waitFor(function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      return v && v.loop === true ? v : null;
    }, 8000)), 'loop=' + ((q('.acsv-slide[data-ovl="1"] video') || {}).loop));
    var vS = await waitFor(function () { return q('.acsv-slide[data-ovl="1"] video'); }, 8000);
    if (vS) vS.dispatchEvent(new Event('ended'));
    await wait(400);
    rec('ll-single-ended-noop', (function () {
      var p = TEST.call('playlayer') || {};
      return p.active && Number(p.id) === idS;
    })(), 'id=' + (TEST.call('playlayer') || {}).id);
    if (autoBtnS) autoBtnS.click(); // 还原开关，免影响后续块
    key('Escape');
    rec('ll-follow-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'follow' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));

    // ---- ⑤ 连播进层（0.9.183）：连播开关旧实现只接竖刷——层内（非推荐板块）播完必须自动下一条 ----
    location.hash = '#svfeed/zone';
    rec('ll-auto-rows', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-rlist-row .acsv-vrow').length >= 4;
    }, 10000)), 'rows=' + document.querySelectorAll('.acsv-rlist-row .acsv-vrow').length);
    var rowsA = document.querySelectorAll('.acsv-rlist-row .acsv-vrow');
    if (!rowsA.length) return;
    rowsA[0].click();
    rec('ll-auto-list', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.session === 'list' && Number(p.id) === 489500 ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    // 连播开启：层内视频 loop 关（有下一条可连；旧实现只扫 scroller，层内 loop 不随开关走）。
    // 换条后新视频要等解析回包才 _attach——一律 waitFor 落地再断言
    var autoBtnA = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
    rec('ll-auto-btn-dom', !!autoBtnA);
    if (autoBtnA) autoBtnA.click();
    rec('ll-auto-loop-off', !!(await waitFor(function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      return v && v.loop === false ? v : null;
    }, 8000)), 'loop=' + ((q('.acsv-slide[data-ovl="1"] video') || {}).loop));
    // 播完（ended 事件）→ 自动下一条 = list 顺序 489501，与手动 ↓ 同路分派
    var vA = q('.acsv-slide[data-ovl="1"] video');
    if (vA) vA.dispatchEvent(new Event('ended'));
    rec('ll-autonext', !!(await waitFor(function () {
      var p = TEST.call('playlayer') || {};
      return p.active && p.listIdx === 1 && Number(p.id) === 489501 ? p : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    // 关掉连播：换条后新视频 loop 开（开关遍历覆盖层内视频——旧实现只扫 scroller 会漂）
    var autoBtnB = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
    if (autoBtnB) autoBtnB.click();
    rec('ll-auto-loop-on', !!(await waitFor(function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      return v && v.loop === true ? v : null;
    }, 8000)), 'loop=' + ((q('.acsv-slide[data-ovl="1"] video') || {}).loop));
    key('Escape');
    rec('ll-auto-exit', !!(await waitFor(function () {
      return TEST.call('view') === 'zone' && !(TEST.call('playlayer') || {}).active;
    }, 6000)), 'view=' + TEST.call('view'));
  };
})();
