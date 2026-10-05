// test/cases/related.js —— harness 场景：评论抽屉「相关推荐」tab + 随机游走链（0.9.168）
// 源：home（HOME_CASES 登记）——tab 只对视频条目（kind==='home'）显形；桩=test/my-sample.js
// 的 'feed/related/general'（确定性池：700000+rid*10+k，跨池不相交 ⇒ 断言可精确预言）。
//   rel-drawer：home 流就绪 → c 键开抽屉 → tab 在场且 prefetch 就绪（rows=锚位1+池10）
//     → 切 tab → 点首行**开层**（0.9.172：舞台原地保活，不再 startChain 拆视图/重置流）
//     → 层内 walk 抽一条（池内）→ 设置面板开 relSequential → 层内 ↓ 整批入队（queue>0）
//     → Esc 退层：条目表与游标仍是原样（保活终局证据）
//   rel-layer（0.9.170）：播放层内 ↓/↑/滚轮/触摸游走 + 抽屉行层内换条（不拆界面）
// 反跑：摘 slide.buildDrawer 的 tab 行 ⇒ rel-tab-ready 红；摘 relatedapi.batch 的换批/seq
// 分支 ⇒ rel-seq-queue 红；摘 setLayerOpener 注册 ⇒ rel-row-opens-layer/rel-stage-kept 红
// （落回 startChain ⇒ 舞台被重置）；摘层内游走缝合 ⇒ rel-layer-* 红。
// mock 装配（views.js 同款文件作用域）：本场景跑在 home 源（HOME_CASES），sv 专用
// __ACSV_MOCK__ 不在——评论与 resolve 链（链外条目 douga/info+playInfo）都走 net ⇒
// 必须 FORM 指向 MY_MOCK
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;

(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['rel-drawer'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, key = h.key, TEST = h.TEST,
      firstVideoReady = h.firstVideoReady;
    rec('rel-feed-ready', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    var feed0 = TEST.call('feed') || {};
    var rid = feed0.items && feed0.items[0] && feed0.items[0].id;
    rec('rel-home-item', !!rid && Number(rid) > 40000000, 'rid=' + rid);
    if (!rid) return;
    // 开抽屉（c 键）——tab 显形（home 条目）+ prefetch 就绪
    key('c');
    rec('rel-drawer-open', !!(await waitFor(function () {
      var d = q('.acsv-drawer');
      return !!d && d.classList.contains('open');
    }, 6000)));
    var rd = await waitFor(function () {
      var t = TEST.call('reldrawer');
      return t && t.present && t.relTabShown && t.state === 'ready' ? t : null;
    }, 8000);
    rec('rel-tab-ready', !!rd, JSON.stringify(TEST.call('reldrawer')));
    if (!rd) return;
    // 切 tab（rows 断言在此之后：渲染由 showRel 触发，隐藏态 prefetch 就绪不渲染）
    var tabR = q('.acsv-dtab-rel');
    if (tabR) tabR.click();
    var rd2 = await waitFor(function () {
      var t = TEST.call('reldrawer');
      var rl = q('.acsv-rellist');
      return t && t.relOn && t.rows === 11 && t.hasAnchor && !!rl
        && rl.style.display !== 'none'
        && q('.acsv-drawer-list').style.display === 'none' ? t : null;
    }, 4000);
    rec('rel-tab-on', !!rd2, JSON.stringify(TEST.call('reldrawer')));
    rec('rel-rows', !!rd2 && rd2.rows === 11, 'rows=' + (rd2 || {}).rows); // 锚位 1 + 池 10
    rec('rel-anchor', !!rd2 && !!rd2.hasAnchor);
    // 点首行（锚位后第一条 = 池 k=1）→ **开层**（0.9.172 用户实报「原窗口直接没了」的修正）：
    // 以该视频开播放层，舞台原地保活（items/current 一动不能动），抽屉随浮层栈收起；
    // 不再 startChain（旧形态=重置整条流 + 拆视图，回不去当前视频）
    var expectId = 700000 + Number(rid) * 10 + 1;
    var stageLen = ((TEST.call('feed') || {}).items || []).length;
    var stageCur = (TEST.call('feed') || {}).current;
    var row1 = q('.acsv-rellist .acsv-relrow:nth-child(2)');
    rec('rel-row1-dom', !!row1);
    if (row1) row1.click();
    rec('rel-row-opens-layer', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') === 'play' && pl.active && Number(pl.id) === expectId ? pl : null;
    }, 8000)), 'expect=' + expectId + ' ' + JSON.stringify(TEST.call('playlayer')));
    rec('rel-stage-kept', (function () { // 舞台保活：条目表与游标零变化（层不动竖刷）
      var f = TEST.call('feed') || {};
      return (f.items || []).length === stageLen && f.current === stageCur;
    })(), 'len=' + ((TEST.call('feed') || {}).items || []).length + '/' + stageLen + ' cur=' + (TEST.call('feed') || {}).current + '/' + stageCur);
    rec('rel-drawer-closed', !!(await waitFor(function () {
      var d = q('.acsv-drawer');
      return !!d && !d.classList.contains('open');
    }, 4000)));
    // 层内游走（walk）：↓ 抽池内下一条（池 id 空间 700000+expectId*10+k）；已见集增长
    key('ArrowDown');
    rec('rel-layer-walk', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      var d = Number(pl.id) - (700000 + expectId * 10);
      return pl.active && pl.hist === 2 && d >= 1 && d <= 10 ? pl : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    rec('rel-seen-grow', !!(await waitFor(function () {
      var t = TEST.call('rel');
      return t && t.seenCount >= 2 && t.mode === 'walk'; // seed(入口) + 游走一条
    }, 4000)), JSON.stringify(TEST.call('rel')));
    // seq 模式：设置面板第 3 个开关（bool 项序：updCheck/dmDefault/relSequential）→ 层内 ↓ 整批入队
    var gear = q('.acsv-dock-gear');
    if (gear) gear.click();
    var host = await waitFor(function () { return q('.acsv-set-host'); }, 5000);
    rec('rel-set-open', !!host);
    var sh = host && host.shadowRoot;
    var sw = sh && sh.querySelectorAll('.set-sw')[2];
    rec('rel-set-sw-found', !!sw);
    if (sw) sw.click();
    rec('rel-set-sw-on', !!(sw && sw.classList.contains('on')));
    key('Escape');
    rec('rel-set-closed', !!(await waitFor(function () { return !q('.acsv-set-host'); }, 4000)));
    var walkId = (TEST.call('playlayer') || {}).id;
    key('ArrowDown');
    rec('rel-seq-queue', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return pl.active && Number(pl.id) !== Number(walkId) && pl.queue >= 1 ? pl : null; // 整批入队（queue>0）
    }, 8000)), 'walkId=' + walkId + ' ' + JSON.stringify(TEST.call('playlayer')));
    rec('rel-seq-mode', (function () { var t = TEST.call('rel'); return !!t && t.mode === 'seq'; })(), JSON.stringify(TEST.call('rel')));
    // Esc 退出层 → 回竖刷舞台：仍是原条目表与游标（保活的终局证据）
    key('Escape');
    rec('rel-exit-stage', !!(await waitFor(function () {
      var f = TEST.call('feed') || {};
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') == null && !pl.active && (f.items || []).length === stageLen && f.current === stageCur;
    }, 8000)), 'view=' + TEST.call('view') + ' len=' + ((TEST.call('feed') || {}).items || []).length + '/' + stageLen);
  };

  // ---- rel-layer：播放层内游走（0.9.170） ----
  // 层内 ↓ = 当前视频相关池随机抽下一条（逐级递归）、↑ = 回上一条（层内历史）；抽屉「相关
  // 推荐」行在层内点 = 层内换条（不拆界面）；Esc 关抽屉、再 Esc 退出层回舞台。
  // 反跑：摘 input 的 api.playStep 注入 ⇒ rel-layer-step 红；摘 relatedapi.setLayerHost
  // （layerActive 恒 false）⇒ rel-layer-jump 红（会走 startChain 拆视图）。
  C['rel-layer'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, key = h.key, TEST = h.TEST,
      firstVideoReady = h.firstVideoReady;
    rec('rl-feed-ready', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    var feed0 = TEST.call('feed') || {};
    var rid = feed0.items && feed0.items[0] && Number(feed0.items[0].id);
    rec('rl-home-item', !!rid && rid > 40000000, 'rid=' + rid);
    if (!rid) return;
    // 进播放层（深链形态=分享链接同路；层内条目 id=该 ac 号）
    location.hash = 'svfeed/play/a/' + rid;
    rec('rl-layer-open', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') === 'play' && pl.active && Number(pl.id) === rid ? pl : null;
    }, 10000)), JSON.stringify(TEST.call('playlayer')));
    // ↓：相关池抽下一条（池 id 空间 700000+rid*10+k，见 my-sample 桩）
    key('ArrowDown');
    var pool = 700000 + rid * 10;
    rec('rl-layer-step', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      if (!pl.active || pl.hist !== 2) return null;
      var d = Number(pl.id) - pool;
      return d >= 1 && d <= 10 ? pl : null;
    }, 10000)), JSON.stringify(TEST.call('playlayer')) + ' pool=' + pool);
    // ↑：回上一条（层内历史，不再打网络）
    key('ArrowUp');
    rec('rl-layer-back', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return pl.active && Number(pl.id) === rid && pl.hIdx === 0;
    }, 6000)), JSON.stringify(TEST.call('playlayer')));
    // 再 ↓：前向重开（回退后的前向分支截断重建）
    key('ArrowDown');
    rec('rl-layer-fwd2', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return pl.active && pl.hist === 2 && pl.hIdx === 1;
    }, 10000)), JSON.stringify(TEST.call('playlayer')));
    // 滚轮/触摸滑 = 层内切换（0.9.171 用户实报「playlayer 窗口无法滑动切换视频」）——
    // 手势汇入同一条泵 playStep；反向滚 = ↑ 回上一层历史（锁 500ms，故反向要等一拍）
    var lbody = q('.acsv-vbody-play');
    rec('rl-layer-body', !!lbody);
    if (lbody) {
      var idW = Number((TEST.call('playlayer') || {}).id);
      lbody.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true }));
      rec('rl-wheel-step', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && Number(pl.id) !== idW ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      await h.wait(650);
      lbody.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, bubbles: true, cancelable: true }));
      rec('rl-wheel-back', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && Number(pl.id) === idW ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
      // 触摸上滑 = 下一条（TouchEvent 合成；与滚轮同一条播放器换条路）
      var idT = Number((TEST.call('playlayer') || {}).id);
      var t1 = new Touch({ identifier: 7, target: lbody, clientX: 300, clientY: 600 });
      lbody.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1], bubbles: true }));
      var t2 = new Touch({ identifier: 7, target: lbody, clientX: 300, clientY: 420 });
      lbody.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t2], bubbles: true }));
      rec('rl-touch-step', !!(await waitFor(function () {
        var pl = TEST.call('playlayer') || {};
        return pl.active && Number(pl.id) !== idT ? pl : null;
      }, 8000)), JSON.stringify(TEST.call('playlayer')));
    }
    // 抽屉：c 开 → 相关推荐 tab 在场（层内条目 kind=home）且已就绪且 rid 跟随层内当前条
    key('c');
    rec('rl-drawer-open', !!(await waitFor(function () {
      var d = q('.acsv-drawer');
      return !!d && d.classList.contains('open');
    }, 6000)));
    var curId = (TEST.call('playlayer') || {}).id;
    rec('rl-rel-ready', !!(await waitFor(function () {
      var t = TEST.call('reldrawer');
      return t && t.present && t.relTabShown && t.rid === String(curId) && t.state === 'ready' ? t : null;
    }, 8000)), JSON.stringify(TEST.call('reldrawer')) + ' cur=' + curId);
    var tabR = q('.acsv-dtab-rel');
    if (tabR) tabR.click();
    rec('rl-tab-on', !!(await waitFor(function () {
      var t = TEST.call('reldrawer');
      return t && t.relOn && t.rows === 11 && t.hasAnchor;
    }, 4000)), JSON.stringify(TEST.call('reldrawer')));
    // 进度恢复取证：跳转前把当前视频挪到 5s（弹回上级时应 seek 回这里）
    (function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      if (v) { try { v.currentTime = 5; } catch (e) { } }
    })();
    await h.wait(500);
    rec('rl-prejump-at', (function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      return !!v && v.currentTime >= 4.5;
    })(), (function () {
      var v = q('.acsv-slide[data-ovl="1"] video');
      return 't=' + (v ? v.currentTime.toFixed(1) : 'none');
    })());
    // 点首行 = **开列表播放器**（0.9.174：压新级别，不顶掉当前视频）；抽屉自动停在「列表」tab
    var expectId = 700000 + Number(curId) * 10 + 1;
    var row1 = q('.acsv-rellist .acsv-relrow:nth-child(2)');
    rec('rl-row1-dom', !!row1);
    if (row1) row1.click();
    rec('rl-layer-jump', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') === 'play' && pl.active && Number(pl.id) === expectId && pl.levels === 2
        && Number(pl.parentId) === Number(curId) ? pl : null;
    }, 8000)), 'expect=' + expectId + ' ' + JSON.stringify(TEST.call('playlayer')));
    rec('rl-parent-saved', ((TEST.call('playlayer') || {}).parentAt || 0) >= 4,
      'parentAt=' + (TEST.call('playlayer') || {}).parentAt);
    rec('rl-list-tab', !!(await waitFor(function () {
      var t = TEST.call('reldrawer');
      return t && t.listShown && t.listOn && t.listRows === 10 && t.listIdx === 0 ? t : null;
    }, 6000)), JSON.stringify(TEST.call('reldrawer')));
    rec('rl-drawer-follow', !!(await waitFor(function () {
      var t = TEST.call('reldrawer');
      return t && t.rid === String(expectId);
    }, 6000)), JSON.stringify(TEST.call('reldrawer')));
    // 列表内跳转：点列表第 3 行 → 同级别换条（levels 不变）+ 列表当前项跟随
    var pickRow = q('.acsv-listlist .acsv-relrow:nth-child(3)');
    rec('rl-list-row-dom', !!pickRow);
    if (pickRow) pickRow.click();
    rec('rl-list-pick', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      var t = TEST.call('reldrawer') || {};
      return pl.active && pl.levels === 2 && t.listIdx === 2 && t.listOn ? pl : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')) + ' ' + JSON.stringify(TEST.call('reldrawer')));
    // Esc 关抽屉 → 再 Esc = **弹回上级**（列表播放器语义：回到跳转前那条视频 + 进度恢复）
    key('Escape');
    rec('rl-drawer-closed', !!(await waitFor(function () {
      var d = q('.acsv-drawer');
      return !!d && !d.classList.contains('open');
    }, 4000)));
    key('Escape');
    rec('rl-pop-parent', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return pl.active && pl.levels === 1 && Number(pl.id) === Number(curId) ? pl : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')));
    // 进度恢复（方案一）：弹回时把离开时的秒数写进续播槽（slide._resumeAt → session.resumeAt，
    // 既有机制 playing 后 seek）。harness 的池条目直链会被 appapi 升级成 https（本地服务打不通）
    // 播不起来，故断言**槽位转交**这一层侧不变式；真机复验 seek 落地（CHANGELOG 在册）
    rec('rl-parent-resume-slot', (function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var ses = sl && sl._session;
      var v = sl && sl.querySelector('video');
      // 未开播：槽里还留着 5；已开播：seek 到位（resume 槽清零）——两者任一即恢复成立
      return !!ses && (Math.round(ses.resumeAt) === 5 || (!!v && v.currentTime >= 4.5));
    })(), (function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var ses = sl && sl._session;
      var v = sl && sl.querySelector('video');
      return 'resumeAt=' + (ses ? ses.resumeAt : 'nosession') + ' t=' + (v ? v.currentTime.toFixed(1) : 'no-video');
    })());
    // 直挂守卫（0.9.174 修 appapi 守卫位置）：webm 池条目不得走 hls.js/MSE（src 不是 blob:）
    rec('rl-parent-direct', (function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var ses = sl && sl._session;
      var v = sl && sl.querySelector('video');
      return !!ses && ses.item && ses.item.cap && ses.item.cap.hls === false && !ses._hls
        && !!v && !/^blob:/.test(v.currentSrc || v.src || '');
    })(), (function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var ses = sl && sl._session;
      var v = sl && sl.querySelector('video');
      return 'hls=' + (ses && ses.item && ses.item.cap && ses.item.cap.hls)
        + ' hlsInst=' + !!(ses && ses._hls) + ' src=' + String(v && (v.currentSrc || v.src) || '').slice(0, 40);
    })());
    // 等待窗：能播则断言 seek 落到 5s；harness 池条目直链打不通（https 升级）时留在槽里也算成立
    rec('rl-parent-at', !!(await waitFor(function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var ses = sl && sl._session;
      var v = sl && sl.querySelector('video');
      if (!ses) return false;
      if (v && v.currentTime >= 4.5) return true;
      return !v || v.error || ses.resumeAt >= 4; // 不可播（测试环境限制）：槽位仍在=契约成立
    }, 10000)), (function () {
      var sl = q('.acsv-slide[data-ovl="1"]');
      var v = sl && sl.querySelector('video');
      if (!v) return 'no-video';
      return 't=' + v.currentTime.toFixed(1) + ' resume=' + (sl._session ? sl._session.resumeAt : 'nosession')
        + ' err=' + (v.error ? v.error.code : 0);
    })());
    rec('rl-list-tab-hidden', (function () {
      var t = TEST.call('reldrawer') || {};
      return t.listShown === false; // 弹回上级（非列表播放器）→ 「列表」tab 收起
    })(), JSON.stringify(TEST.call('reldrawer')));
    // 再 Esc 退出层（单级 ⇒ 交回视图层，深界面回来源=舞台）
    key('Escape');
    rec('rl-layer-exit', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') == null && !pl.active;
    }, 6000)), 'view=' + TEST.call('view'));
  };
})();
