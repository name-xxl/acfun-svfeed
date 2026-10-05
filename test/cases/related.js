// test/cases/related.js —— harness 场景：评论抽屉「相关推荐」tab + 随机游走链（0.9.168）
// 源：home（HOME_CASES 登记）——tab 只对视频条目（kind==='home'）显形；桩=test/my-sample.js
// 的 'feed/related/general'（确定性池：700000+rid*10+k，跨池不相交 ⇒ 断言可精确预言）。
//   rel-drawer：home 流就绪 → c 键开抽屉 → tab 在场且 prefetch 就绪（rows=锚位1+池10）
//     → 切 tab → 点首行起链（起点置顶+source=related+抽屉收起+hash 回写）
//     → 游走推进（链尾锚换池）→ 设置面板开 relSequential → seq 整批入链（增量≥5 区分 walk 的 1 条/步）
// 反跑：摘 slide.buildDrawer 的 tab 行 ⇒ rel-tab-ready 红；摘 relatedapi.batch 的换批/seq
// 分支 ⇒ rel-seq-batch 红；摘起步器注册 ⇒ rel-chain-start 红。
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
    // 点首行（锚位后第一条 = 池 k=1）→ 起步：起点置顶 + 源切换 + 抽屉收起 + hash 回写
    var expectId = 700000 + Number(rid) * 10 + 1;
    var row1 = q('.acsv-rellist .acsv-relrow:nth-child(2)');
    rec('rel-row1-dom', !!row1);
    if (row1) row1.click();
    rec('rel-chain-start', !!(await waitFor(function () {
      var f = TEST.call('feed') || {};
      var it = f.items && f.items[0];
      return !!it && Number(it.id) === expectId && it.kind === 'home' && it.lazy === true;
    }, 8000)), 'expect=' + expectId);
    rec('rel-hash', !!(await waitFor(function () {
      return location.hash === '#svfeed/a/' + expectId;
    }, 5000)), location.hash);
    rec('rel-seen-grow', !!(await waitFor(function () {
      var t = TEST.call('rel');
      return t && t.seenCount >= 2 && t.mode === 'walk'; // seed(起点) + 首批游走 1 条
    }, 4000)), JSON.stringify(TEST.call('rel')));
    rec('rel-drawer-closed', !!(await waitFor(function () {
      var d = q('.acsv-drawer');
      return !!d && !d.classList.contains('open');
    }, 4000)));
    // 游走推进：滚到下一条 → 新链尾的池子续 1 条（walk 节奏：每步 +1）；池内互异
    TEST.call('scrollTo', 1);
    rec('rel-walk-step', !!(await waitFor(function () {
      var f = TEST.call('feed') || {};
      var its = f.items || [];
      if (its.length < 3) return false;
      var ids = its.map(function (x) { return Number(x.id); });
      var uniq = ids.slice(0, 3).every(function (v, i, a) { return a.indexOf(v) === i; });
      return uniq && its.slice(1).every(function (x) { return x.kind === 'home'; });
    }, 8000)), 'len=' + ((TEST.call('feed') || {}).items || []).length);
    // seq 模式：设置面板第 3 个开关（bool 项序：updCheck/dmDefault/relSequential）→ 整批入链
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
    var before = ((TEST.call('feed') || {}).items || []).length;
    TEST.call('scrollTo', before - 1); // current >= len-bufferSize ⇒ fetchMore（seq 批量出池）
    rec('rel-seq-batch', !!(await waitFor(function () {
      return ((TEST.call('feed') || {}).items || []).length >= before + 5;
    }, 8000)), 'before=' + before + ' now=' + ((TEST.call('feed') || {}).items || []).length);
    rec('rel-seq-mode', (function () { var t = TEST.call('rel'); return !!t && t.mode === 'seq'; })(), JSON.stringify(TEST.call('rel')));
  };
})();
