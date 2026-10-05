// test/cases/jingxuan.js —— harness 场景：精选页（0.9.169；0.9.170 网格改版=docs/preview/jingxuan.html ①②）
// mock：频道家族=test/my-sample.js（树含文章63/AC正义177 必剔样本；resourceList 每频道 30+10
// 两块、块1 末条杂质、游标 "1,900100"→''）；「全部」tab=__ACSV_MOCK_HOME__（homeFeedFetch 直读，
// 单页即尽）。源无关（视图自持游标，不动 home 泵）。
//   jingxuan：进视图 → chips 异步补齐（剔除两员）→ 全部 tab（1 大卡 + 全部条目、流尽尾行例外）
//     → 切动画 tab（多页）：首屏按行补齐（normals % cols == 0）+ 末行几何占满
//     → 触底续块 → 终页 → 点首卡进播放层（0.9.170 出口对齐：view=play + 层内锚=该条）
//     → Esc 回精选（视图保活：held 复原、不重建）
// 反跑：摘 channelTreeOf 剔除表 ⇒ chips 数红；摘 channelPageOf 杂质滤 ⇒ 动画 tab 卡数红；
// 摘卡片 openPanelItem（改回 startChain）⇒ jx-card-layer 红；摘按行补齐（nextTarget 改回定数）
// ⇒ jx-anim-flush 红；摘视图保活（def 去掉 suspend 语义）⇒ jx-view-back 红。
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;

(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['jingxuan'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key, TEST = h.TEST;
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
    // 全部 tab：首卡=网格内 2×2 跨格大卡（1 张）+ 其余全入网格；mockHome 单页 ⇒ 流尽
    var mhLen = (window.__ACSV_MOCK_HOME__ || []).length;
    var vAll = await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.big === 1 && t.cards === mhLen && t.done ? t : null;
    }, 8000);
    rec('jx-all-big-grid', !!vAll, JSON.stringify(TEST.call('jingxuan')) + ' mhLen=' + mhLen);
    rec('jx-all-end-tip', !!(vAll && /到底/.test(vAll.tip)), (vAll || {}).tip || '');
    // 大卡四行信息区结构（0.9.170）：标题 + 分区标签（home 卡取契约 channelInfo）+ UP 行 + 数据行
    rec('jx-big-info-rows', (function () {
      var big = q('.acsv-jx-grid .acsv-jx-big');
      if (!big) return false;
      var tags = big.querySelectorAll('.acsv-jx-tags .acsv-jxtag');
      return !!big.querySelector('.acsv-jx-ct') && tags.length === 1 && tags[0].textContent === '主机单机'
        && !!big.querySelector('.acsv-jx-up') && !!big.querySelector('.acsv-jx-cm');
    })(), (function () {
      var big = q('.acsv-jx-grid .acsv-jx-big');
      return big ? (big.querySelector('.acsv-jx-tags') || {}).textContent || 'no-tags' : 'no-big';
    })());
    // 切动画 tab（channelId=1，多页）：首屏按行补齐（渲染量取整行倍数——不是按视口补一批）
    var animChip = Array.prototype.filter.call(q('.acsv-vchips').children, function (x) { return x.textContent === '动画'; })[0];
    rec('jx-anim-chip', !!animChip);
    if (animChip) animChip.click();
    var vAnim = await waitFor(function () {
      var t = TEST.call('jingxuan');
      if (!t || t.tab !== '1' || t.big !== 1 || !t.normals || t.done) return null;
      // 按行补齐不变式：普通卡数落在刷新点集上——大卡在场时行 1-2 各容 cols-2 张、其后每行
      // cols 张 ⇒ 刷新点 = 2(cols-2) + k·cols（cols=2 时大卡独占两行 ⇒ 2k）。与实现同式
      var base = 2 * Math.max(0, t.cols - 2);
      var min = base > 0 ? base : t.cols;
      return t.normals >= min && (t.normals - base) % t.cols === 0 ? t : null;
    }, 8000);
    rec('jx-anim-flush', !!vAnim, JSON.stringify(TEST.call('jingxuan')));
    // 分区卡大卡的标签行数据源=dougaFeedView.tagList（桩按 {name} 给两条）
    rec('jx-big-tags-dv', (function () {
      var tags = q('.acsv-jx-grid .acsv-jx-big');
      var list = tags && tags.querySelectorAll('.acsv-jx-tags .acsv-jxtag');
      return !!list && list.length === 2 && list[0].textContent === '动画';
    })(), (function () {
      var big = q('.acsv-jx-grid .acsv-jx-big');
      return big ? (big.querySelector('.acsv-jx-tags') || {}).textContent || 'no-tags' : 'no-big';
    })());
    // 末行几何：最后一行带（last row band）被卡片横向铺满——大卡跨行也算覆盖（结果不变式）
    var flushGeo = (function () {
      var g = q('.acsv-jx-grid');
      if (!g) return { ok: false, info: 'no-grid' };
      var kids = Array.prototype.slice.call(g.children);
      if (!kids.length) return { ok: false, info: 'empty' };
      var maxTop = Math.max.apply(null, kids.map(function (k) { return Math.round(k.offsetTop); }));
      var y = maxTop + 5; // 末行带内取一点，统计跨该点的卡片
      var gap = (parseFloat(getComputedStyle(g).columnGap) || 0) + 2; // 列间距是合法间隙
      var iv = kids.filter(function (k) {
        return k.offsetTop <= y && k.offsetTop + k.offsetHeight > y;
      }).map(function (k) { return [k.offsetLeft, k.offsetLeft + k.offsetWidth]; })
        .sort(function (a, b) { return a[0] - b[0]; });
      if (!iv.length) return { ok: false, info: 'no-card-in-band' };
      // offsetLeft 相对 offsetParent（非网格）——跨度按首卡起算，不与 0 比
      var covered = iv[0][0];
      for (var i = 0; i < iv.length; i++) {
        if (iv[i][0] > covered + gap) return { ok: false, info: 'hole@' + iv[i][0] + ' covered=' + covered + ' gw=' + g.clientWidth };
        if (iv[i][1] > covered) covered = iv[i][1];
      }
      var span = covered - iv[0][0];
      return { ok: span >= g.clientWidth - 2, info: 'span=' + span + ' gw=' + g.clientWidth + ' n=' + iv.length };
    })();
    rec('jx-flush-geometry', flushGeo.ok, flushGeo.info);
    // 触底逐行续放（缓冲 29 条、每次一行 cols 张 ⇒ 滚到缓冲放完才会去打第二页）→ 第二页
    // 游标空串收口 ⇒ done ⇒ 缓冲全放
    var body = q('.acsv-view-body');
    var before = (TEST.call('jingxuan') || {}).cards || 0;
    if (body) { body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); }
    rec('jx-anim-page2', !!(await waitFor(function () {
      return ((TEST.call('jingxuan') || {}).cards || 0) > before;
    }, 6000)), 'before=' + before + ' now=' + ((TEST.call('jingxuan') || {}).cards));
    for (var si = 0; si < 20; si++) {
      if ((TEST.call('jingxuan') || {}).done) break;
      if (body) { body.scrollTop = body.scrollHeight; body.dispatchEvent(new Event('scroll')); }
      await wait(120);
    }
    rec('jx-anim-end', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return t && t.done;
    }, 8000)), JSON.stringify(TEST.call('jingxuan')));
    // 点大卡 → 播放层（0.9.170 出口对齐：与榜单/搜索/我的同一条缝；不再是拆视图进舞台游走）。
    // 动画 tab 首条 = 频道1 块1 k=1 ⇒ dougaId 900101（桩确定性，见 my-sample.js）
    var card1 = q('.acsv-jx-grid .acsv-jx-big');
    rec('jx-card-dom', !!card1);
    var expId = 900101;
    if (!card1) return;
    card1.click();
    rec('jx-card-layer', !!(await waitFor(function () {
      var pl = TEST.call('playlayer') || {};
      return TEST.call('view') === 'play' && pl.active && Number(pl.id) === expId ? pl : null;
    }, 8000)), JSON.stringify(TEST.call('playlayer')) + ' exp=' + expId);
    // Esc 回精选：视图保活（held 复原、网格原样，不重建）
    key('Escape');
    rec('jx-view-back', !!(await waitFor(function () {
      var t = TEST.call('jingxuan');
      return TEST.call('view') === 'jingxuan' && t && t.present && t.cards >= 1 ? t : null;
    }, 6000)), JSON.stringify(TEST.call('jingxuan')) + ' view=' + TEST.call('view'));
    rec('jx-view-not-held', !q('.acsv-view-held'));
  };
})();
