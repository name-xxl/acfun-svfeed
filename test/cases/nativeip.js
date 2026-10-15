// test/cases/nativeip.js —— harness 场景：原生页评论 IP + 设备（0.9.248，Web-IP 吸收 6a/6b）
// 机制：pathname 经 harness.html BOOT_PATH 在 bundle 前改到 /v/ac777777（pagekind=video ⇒
// boot 原生页分支 ⇒ mountNativeIp；同 member-plaza 先例，本场景在 NO_AUTOMOUNT——无壳前提）；
// 场景体自建原生评论 DOM（照 §13 实测形状：`[data-commentid]` 根 + `.area-comment-from` +
// `a.deviceModel` + `a.name[data-userid]`），MutationObserver 重扫 + IO 进视口即注入。
//   native-ip：标签注入（同一节点/注入点/tooltip）+ 设备美化（替换/点击切换/手动态不被重扫覆盖）
//     + 拦截层与竞态修正（无 uid 属性的评论先挂观察 → data:URL 灌一发"评论回包"建映射 →
//     有界重观察把标签补上）+ 同 uid 去重（缓存单源）+ SPA 路由清映射
//   native-surfaces（6b）：pushState 换路径串测两处专属挂点——用户主页 /u/ 的
//     #ac-space-info[data-uid]（IP属地 前缀 + common-info 类）→ 个人中心 /member/feeds 的
//     .feed-time（closest 两跳爬链取条目内 UP 链 uid）
// 新增场景记得同步 run-harness.mjs 的 HARNESS_CASES（test/check-cases.mjs 双向校验）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['native-ip'] = async function (h) {
    var rec = h.rec, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST;
    var calls = {};
    window.__ACSV_MOCK_FORM__ = {
      'user/userInfo': function (body, url) {
        var uid = (String(url).match(/userId=(\d+)/) || [])[1];
        if (uid) calls[uid] = (calls[uid] || 0) + 1;
        if (uid === '9301') return { result: 0, profile: { ipLocation: '广东' } };
        if (uid === '9302') return { result: 0, profile: { ipLocation: '上海' } };
        if (uid === '9503') return { result: 0, profile: { ipLocation: '湖北' } };
        if (uid === '9504') return { result: 0, profile: { ipLocation: '湖南' } };
        return { result: 0, profile: {} };
      }
    };
    var nip = TEST && TEST.call('nativeip');
    rec('nip-mounted', !!(nip && nip.mounted), JSON.stringify(nip || null));
    rec('nip-css', !!document.getElementById('acsv-nip-css'));

    // 原生评论 DOM 工厂（照 §13 实测形状）
    function addComment(cid, opts) {
      opts = opts || {};
      var el = document.createElement('div');
      el.className = 'area-comment-top clearfix comment-item-' + cid + ' main-comment-item-' + cid;
      el.setAttribute('data-commentid', cid);
      var from = document.createElement('span');
      from.className = 'area-comment-from';
      var lbl = document.createElement('span');
      lbl.textContent = '来自';
      from.appendChild(lbl);
      if (opts.dev) {
        var d = document.createElement('a');
        d.className = 'deviceModel';
        d.setAttribute('href', 'https://www.acfun.cn/app/');
        d.textContent = opts.dev;
        from.appendChild(d);
      } else {
        var w = document.createElement('span');
        w.textContent = '网页端';
        from.appendChild(w);
      }
      el.appendChild(from);
      if (opts.uid) {
        var a = document.createElement('a');
        a.className = 'name';
        a.setAttribute('data-userid', String(opts.uid));
        a.textContent = '甲';
        el.appendChild(a);
      }
      document.body.appendChild(el);
      return el;
    }

    // ① 带 data-userid：重扫挂观察 → 进视口 → 查询 → 标签注入（同一节点/同注入点/tooltip 同源）
    var c1 = addComment('nip-1', { uid: 9301, dev: 'RMX3619' });
    c1.scrollIntoView({ block: 'center' });
    rec('nip-tag', !!(await waitFor(function () { return c1.querySelector('.acsv-nip'); }, 8000)),
      (c1.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nip-tag-same-node', !!(c1.isConnected && c1.querySelector('.area-comment-from .acsv-nip')));
    rec('nip-tooltip', (function () {
      var t = (c1.querySelector('.acsv-nip') || {}).title || '';
      return t.indexOf('IP属地：广东') === 0 && t.indexOf('查询于：') > 0;
    })());
    // ② 设备美化：代号 → 友好名；点击切回代号；此后重扫不得覆盖手动选择
    var dev = c1.querySelector('.deviceModel');
    rec('nip-dev', !!dev && dev.textContent === '真我 V30', dev ? dev.textContent : 'none');
    if (dev) dev.click();
    rec('nip-dev-toggle', !!dev && dev.textContent === 'RMX3619', dev ? dev.textContent : '');
    var c2 = addComment('nip-2', { uid: 9302 }); // append 触发重扫（防抖 300ms → processDevices）
    await wait(700);
    rec('nip-dev-manual-kept', !!dev && dev.textContent === 'RMX3619', dev ? dev.textContent : '');
    // ③ 拦截层 + 竞态修正：无 uid 属性的评论——首拍 uid 缺（不放弃）→ 回包建映射 → 重观察补齐
    var c3 = addComment('nip-3', {});
    c3.scrollIntoView({ block: 'center' });
    await wait(500); // 首拍（~350ms）已过、第一次重试（~950ms）未到
    rec('nip-race-before', !c3.querySelector('.acsv-nip'));
    try {
      // data: URL 含 '/comment/list' 标记：走拦截层 hookFetch → await → clone → json → 建映射
      await fetch('data:application/json,{"rootComments":[{"commentId":"nip-3","userId":9302}],"m":"/comment/list"}');
    } catch (e) {
      rec('nip-fetch-seed', false, String(e));
    }
    rec('nip-map-seeded', !!(await waitFor(function () {
      return TEST.call('nativeip') && TEST.call('nativeip').map >= 1;
    }, 3000)), 'map=' + (TEST.call('nativeip') || {}).map);
    rec('nip-race-tag', !!(await waitFor(function () { return c3.querySelector('.acsv-nip'); }, 8000)),
      (c3.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nip-c2-tag', !!(await waitFor(function () { return c2.querySelector('.acsv-nip'); }, 8000)));
    // 同 uid 去重：c3 的 9302 应吃 c2 已查回的缓存（查询计数不涨）——共享核单源
    rec('nip-uid-once', calls['9302'] === 1, JSON.stringify(calls));
    // ③.5 盖楼模式形状（0.9.251）：根 .main-comment-item（精确类）+ 楼层块 .fc-comment-item；
    // uid 走 a.name[data-uid]；注入点在 .comment-item-footer-left（间距 8px）；设备锚同款
    var fr = document.createElement('div');
    fr.className = 'main-comment-item main-comment-item-777001';
    fr.setAttribute('data-cid', '777001');
    var na = document.createElement('a');
    na.className = 'name';
    na.setAttribute('data-uid', '9503');
    fr.appendChild(na);
    var flA = document.createElement('div');
    flA.className = 'comment-item-footer-left';
    fr.appendChild(flA);
    document.body.appendChild(fr);
    fr.scrollIntoView({ block: 'center' });
    var floorTag = await waitFor(function () { return flA.querySelector('.acsv-nip'); }, 8000);
    rec('nip-floor-tag', !!floorTag, (flA.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nip-floor-margin', !!(floorTag && getComputedStyle(floorTag).marginLeft === '8px'),
      floorTag ? getComputedStyle(floorTag).marginLeft : 'none');
    // 楼层块（无 data-uid）：靠 listByFloor 回包（commentsMap/cid 形）灌映射后由重观察补齐
    var fcB = document.createElement('div');
    fcB.className = 'fc-comment-item';
    fcB.setAttribute('data-cid', '777002');
    var flB = document.createElement('div');
    flB.className = 'comment-item-footer-left';
    fcB.appendChild(flB);
    var devF = document.createElement('a');
    devF.className = 'deviceModel';
    devF.textContent = 'RMX3700';
    fcB.appendChild(devF);
    document.body.appendChild(fcB);
    fcB.scrollIntoView({ block: 'center' });
    await wait(500); // 重扫 + 首拍：uid 缺不放弃（有界重试窗口内）
    rec('nip-floor-before', !flB.querySelector('.acsv-nip'));
    try {
      await fetch('data:application/json,{"result":0,"commentIds":[777002],"commentsMap":{"777002":{"cid":777002,"userId":9504}},"m":"/comment/listByFloor"}');
    } catch (e) { }
    rec('nip-floor-map-tag', !!(await waitFor(function () { return flB.querySelector('.acsv-nip'); }, 8000)),
      (flB.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nip-floor-dev', !!(await waitFor(function () {
      return devF.textContent === '真我 GT Neo5 SE';
    }, 8000)), devF.textContent);
    // ④ SPA 路由：路径变 → 映射清空（跨页无效且会无限累积）
    history.pushState(null, '', '/v/ac888888' + location.search);
    rec('nip-route-clear', !!(await waitFor(function () {
      return TEST.call('nativeip') && TEST.call('nativeip').map === 0;
    }, 3000)), 'map=' + (TEST.call('nativeip') || {}).map);
  };

  C['native-surfaces'] = async function (h) {
    var rec = h.rec, waitFor = h.waitFor;
    var calls = {};
    window.__ACSV_MOCK_FORM__ = {
      'user/userInfo': function (body, url) {
        var uid = (String(url).match(/userId=(\d+)/) || [])[1];
        if (uid) calls[uid] = (calls[uid] || 0) + 1;
        if (uid === '9401') return { result: 0, profile: { ipLocation: '北京' } };
        if (uid === '9402') return { result: 0, profile: { ipLocation: '广州' } };
        return { result: 0, profile: {} };
      }
    };
    // ① 用户主页：pushState 换路径（路由监听 500ms 后重扫；DOM 追加触发 300ms 重扫，双路兜）
    history.pushState(null, '', '/u/12345' + location.search);
    var info = document.createElement('div');
    info.id = 'ac-space-info';
    info.setAttribute('data-uid', '9401');
    var top = document.createElement('div');
    top.className = 'top';
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = '一只芸喵喵';
    top.appendChild(name);
    info.appendChild(top);
    document.body.appendChild(info);
    rec('nsp-profile-tag', !!(await waitFor(function () {
      var s = info.querySelector('.acsv-nip');
      return s && s.textContent === 'IP属地：北京';
    }, 8000)), (info.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nsp-profile-common-info', (function () {
      var s = info.querySelector('.acsv-nip');
      return !!(s && s.classList.contains('common-info') && s.style.marginLeft === '16px');
    })());
    // ② 个人中心动态条目：再换路径 → 造条目（真机链 .feed-time → .feed-up-info → .feed-up）
    history.pushState(null, '', '/member/feeds' + location.search);
    var feed = document.createElement('div');
    feed.className = 'feed-up';
    var upInfo = document.createElement('div');
    upInfo.className = 'feed-up-info';
    var timeEl = document.createElement('span');
    timeEl.className = 'feed-time';
    timeEl.textContent = '37分钟前';
    upInfo.appendChild(timeEl);
    var a = document.createElement('a');
    a.setAttribute('href', '//www.acfun.cn/u/9402');
    upInfo.appendChild(a);
    feed.appendChild(upInfo);
    document.body.appendChild(feed);
    rec('nsp-up-tag', !!(await waitFor(function () {
      var s = timeEl.querySelector('.acsv-nip');
      return s && s.textContent === '广州';
    }, 8000)), (timeEl.querySelector('.acsv-nip') || {}).textContent || 'none');
    rec('nsp-up-in-time', !!timeEl.querySelector('.acsv-nip'));
    rec('nsp-up-once', calls['9402'] === 1, JSON.stringify(calls));
  };

  // 6c：原生页设置面板（点击 IP 标签 → 浅色原生皮肤面板；资料卡/SCHEMA 行/开关落盘/
  // 设备数据导入端到端/缓存清空二次确认）
  C['nat-panel'] = async function (h) {
    var rec = h.rec, waitFor = h.waitFor, wait = h.wait, TEST = h.TEST, key = h.key;
    var calls = {};
    window.__ACSV_MOCK_FORM__ = {
      'user/userInfo': function (body, url) {
        var uid = (String(url).match(/userId=(\d+)/) || [])[1];
        if (uid) calls[uid] = (calls[uid] || 0) + 1;
        if (uid === '9501') return { result: 0, profile: { ipLocation: '广东', name: '甲' } };
        return { result: 0, profile: {} };
      }
    };
    function addComment(cid, uid, dev) {
      var el0 = document.createElement('div');
      el0.className = 'area-comment-top comment-item-' + cid + ' main-comment-item-' + cid;
      el0.setAttribute('data-commentid', cid);
      var from = document.createElement('span');
      from.className = 'area-comment-from';
      var lbl = document.createElement('span');
      lbl.textContent = '来自';
      from.appendChild(lbl);
      if (dev) {
        var d = document.createElement('a');
        d.className = 'deviceModel';
        d.textContent = dev;
        from.appendChild(d);
      }
      el0.appendChild(from);
      var a = document.createElement('a');
      a.className = 'name';
      a.setAttribute('data-userid', String(uid));
      el0.appendChild(a);
      document.body.appendChild(el0);
      return el0;
    }
    function visible(el2) {
      if (!el2) return false;
      var r = el2.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el2).display !== 'none';
    }
    function rowOf(mask, re) {
      var rows = mask.querySelectorAll('.acsv-np-row');
      for (var i = 0; i < rows.length; i++) if (re.test(rows[i].textContent)) return rows[i];
      return null;
    }
    function btnOf(scope, text) {
      return Array.prototype.filter.call(scope.querySelectorAll('button'), function (b) { return b.textContent === text; })[0] || null;
    }

    // ① 造评论 → 标签 → 点击开面板
    var c1 = addComment('np-1', 9501, 'RMX3619');
    var tag = await waitFor(function () { return c1.querySelector('.acsv-nip'); }, 8000);
    rec('np-tag', !!tag);
    if (!tag) return;
    tag.click();
    var mask = await waitFor(function () { return document.querySelector('.acsv-np-mask'); }, 3000);
    rec('np-open', visible(mask));
    if (!mask) return;
    // ② 用户资料卡（用户名/UID/属地来自 mock）
    var card = mask.querySelector('.acsv-np-card');
    rec('np-card', (function () {
      if (!card) return false;
      var t = card.textContent;
      return t.indexOf('甲') >= 0 && t.indexOf('9501') >= 0 && t.indexOf('广东') >= 0;
    })(), card ? card.textContent : 'none');
    // ③ 全量 SCHEMA 表驱动在场（通用/播放/评论三组代表行）
    var labels = Array.prototype.map.call(mask.querySelectorAll('.acsv-np-row>span:first-child'), function (x) { return x.textContent; }).join('|');
    rec('np-schema-rows', labels.indexOf('自动检查更新') >= 0 && labels.indexOf('缓冲档位') >= 0
      && labels.indexOf('评论区显示 IP 属地') >= 0 && labels.indexOf('属地缓存保留') >= 0
      && labels.indexOf('设备型号美化') >= 0, labels);
    // ④ 开关拨动 + Esc 关闭即落盘（flushSettings）
    var ipRow = rowOf(mask, /评论区显示 IP 属地/);
    var ipSw = ipRow && ipRow.querySelector('.acsv-np-sw');
    rec('np-ipshow-on', !!(ipSw && ipSw.classList.contains('on')));
    if (ipSw) ipSw.click();
    rec('np-ipshow-off', !!(ipSw && !ipSw.classList.contains('on')));
    key('Escape');
    rec('np-esc-close', !!(await waitFor(function () { return !document.querySelector('.acsv-np-mask'); }, 3000)));
    rec('np-ipshow-persist', localStorage.getItem('acsv.s.ipShow') === 'false', 'raw=' + localStorage.getItem('acsv.s.ipShow'));
    // ⑤ 设备数据导入端到端：重开 → 导入视图 → 粘贴 → 导入 → 新代号进查表
    tag.click();
    var mask2 = await waitFor(function () { return document.querySelector('.acsv-np-mask'); }, 3000);
    rec('np-reopen', visible(mask2));
    var dRow = mask2 && rowOf(mask2, /设备数据/);
    var dImport = dRow && btnOf(dRow, '导入');
    if (dImport) dImport.click();
    var ta = mask2 && mask2.querySelector('.acsv-np-ta');
    rec('np-dev-import-view', !!ta);
    if (ta) {
      ta.value = '`ZZZT-NP`: 测试机型NP';
      var confirmBtnImport = btnOf(mask2, '导入');
      if (confirmBtnImport) confirmBtnImport.click();
      await wait(250);
    }
    rec('np-dev-count-after', !!(mask2 && /设备数据 997 条/.test(mask2.textContent)),
      mask2 ? (rowOf(mask2, /设备数据/) || {}).textContent || 'none' : 'no-mask');
    var c2 = addComment('np-2', 9502, 'ZZZT-NP');
    rec('np-dev-import-e2e', !!(await waitFor(function () {
      var d = c2.querySelector('.deviceModel');
      return d && d.textContent === '测试机型NP';
    }, 8000)), (c2.querySelector('.deviceModel') || {}).textContent || 'none');
    // ⑥ 缓存清空（二次确认识别）+ 面板仍可关
    var cRow = mask2 && rowOf(mask2, /缓存管理/);
    var clearBtn = cRow && btnOf(cRow, '清空');
    rec('np-clear-btn', !!clearBtn);
    if (clearBtn) {
      clearBtn.click();
      rec('np-clear-confirm-label', clearBtn.textContent === '确认清空?', clearBtn.textContent);
      clearBtn.click();
    }
    rec('np-clear-done', !!(await waitFor(function () { return TEST.call('iploc').size === 0; }, 3000)),
      'size=' + (TEST.call('iploc') || {}).size);
    key('Escape');
    rec('np-final-close', !!(await waitFor(function () { return !document.querySelector('.acsv-np-mask'); }, 3000)));
  };
})();
