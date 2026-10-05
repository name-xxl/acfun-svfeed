// test/cases/jingxuan.js —— harness 场景：精选页（0.9.169；形态=docs/preview/jingxuan.html ①②）
// mock：频道家族=test/my-sample.js（树含文章63/AC正义177 必剔样本；resourceList 每频道 30+10
// 两块、块1 末条杂质、游标 "1,900100"→''）；「全部」tab=__ACSV_MOCK_HOME__（homeFeedFetch 直读，
// 单页即尽）。源无关（视图自持游标，不动 home 泵）。
//   jingxuan：进视图 → chips 异步补齐（剔除两员）→ 全部 tab 大卡+网格+触底到底
//     → 切动画 tab（杂质滤后 29）→ 触底续块（+10）→ 再触底终页 → 点首卡起游走链 → Esc 回视图
// 反跑：摘 channelTreeOf 剔除表 ⇒ chips 数红；摘 channelPageOf 杂质滤 ⇒ 动画 tab 卡数红；
// 摘 jingxuan 卡片 startChain ⇒ 起链断言红。
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;

(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['jingxuan'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, key = h.key, TEST = h.TEST;
    // 进视图
    location.hash = '#svfeed/jingxuan';
    var v = await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.present ? t : null;
    }, 8000);
    rec('jx-view-open', !!v, JSON.stringify(TEST.call('jingxuan')));
    if (!v) return;
    // dock 高亮（views.syncRouteView 归属）
    rec('jx-dock-on', !!(await waitFor(function () {
      var d = q('.acsv-dock-item.on');
      return !!d && /精选/.test(d.textContent || '');
    }, 4000)), (q('.acsv-dock-item.on') || {}).textContent || '');
    // chips：全部 + 树（剔除文章63/AC正义177 ⇒ 1+2=3）
    rec('jx-chips', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.chips === 3;
    }, 6000)), 'chips=' + (TEST.call('jingxuan') || {}).chips);
    var chipTexts = Array.prototype.map.call(q('.acsv-vchips').children, function (x) { return x.textContent; }).join('|');
    rec('jx-chips-filtered', chipTexts === '全部|动画|游戏', chipTexts);
    // 全部 tab：大卡（1+2）+ 网格（mockHome 全量-3）→ 触底即尽（mockHome 单页）
    var vAll = await waitFor(function () {
      var t = TEST.call('jingxuan');
      var n = (window.__ACSV_MOCK_HOME__ || []).length;
      return t && t.heroCards === 3 && t.cards === n - 3 ? t : null;
    }, 8000), mhLen = (window.__ACSV_MOCK_HOME__ || []).length;
    rec('jx-all-hero-grid', !!vAll, JSON.stringify(TEST.call('jingxuan')) + ' mhLen=' + mhLen);
    var body = q('.acsv-view-body');
    if (body) { body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); }
    rec('jx-all-end', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.done && /到底/.test(t.tip);
    }, 6000)), JSON.stringify(TEST.call('jingxuan')));
    // 切动画 tab（channelId=1）：骨架 → 29 张（块1 30-杂质1）、大卡隐藏
    var animChip = Array.prototype.filter.call(q('.acsv-vchips').children, function (x) { return x.textContent === '动画'; })[0];
    rec('jx-anim-chip', !!animChip);
    if (animChip) animChip.click();
    rec('jx-anim-grid', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.tab === '1' && t.cards === 29 && t.heroCards === 0;
    }, 8000)), JSON.stringify(TEST.call('jingxuan')));
    // 触底续块（+10=39）→ 再触底终页（块2 游标空串收口）
    if (body) { body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); }
    rec('jx-anim-page2', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.cards === 39;
    }, 6000)), 'cards=' + (TEST.call('jingxuan') || {}).cards);
    if (body) { body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); }
    rec('jx-anim-end', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.done;
    }, 6000)), JSON.stringify(TEST.call('jingxuan')));
    // 点首卡 → 起游走链：900000+1*100+1=900101 置顶、hash 回写；Esc 回视图（视图挂起语义）
    var card1 = q('.acsv-jx-grid .acsv-jx-card');
    rec('jx-card-dom', !!card1);
    if (card1) card1.click();
    rec('jx-chain-start', !!(await waitFor(function () {
      var f = TEST.call('feed') || {};
      var it = f.items && f.items[0];
      return !!it && Number(it.id) === 900101 && it.kind === 'home';
    }, 8000)), 'expect=900101');
    rec('jx-chain-hash', !!(await waitFor(function () {
      return location.hash === '#svfeed/a/900101';
    }, 5000)), location.hash);
    // 起链后视图随深链路由拆除（游走链是舞台泵，不经 playlayer deep 接口——与
    // 「保活只对 deep 界面」的既有架构一致；回精选=dock 再点，重建廉价）
    rec('jx-view-consumed', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && !t.present;
    }, 4000)), JSON.stringify(TEST.call('jingxuan')));
  };
})();
