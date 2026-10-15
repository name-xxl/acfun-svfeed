// test/cases/nativeip.js —— harness 场景：原生页评论 IP + 设备（0.9.248，Web-IP 吸收 6a）
// 机制：pathname 经 harness.html BOOT_PATH 在 bundle 前改到 /v/ac777777（pagekind=video ⇒
// boot 原生页分支 ⇒ mountNativeIp；同 member-plaza 先例，本场景在 NO_AUTOMOUNT——无壳前提）；
// 场景体自建原生评论 DOM（照 §13 实测形状：`[data-commentid]` 根 + `.area-comment-from` +
// `a.deviceModel` + `a.name[data-userid]`），MutationObserver 重扫 + IO 进视口即注入。
//   native-ip：标签注入（同一节点/注入点/tooltip）+ 设备美化（替换/点击切换/手动态不被重扫覆盖）
//     + 拦截层与竞态修正（无 uid 属性的评论先挂观察 → data:URL 灌一发"评论回包"建映射 →
//     有界重观察把标签补上）+ 同 uid 去重（缓存单源）+ SPA 路由清映射
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
    // ④ SPA 路由：路径变 → 映射清空（跨页无效且会无限累积）
    history.pushState(null, '', '/v/ac888888' + location.search);
    rec('nip-route-clear', !!(await waitFor(function () {
      return TEST.call('nativeip') && TEST.call('nativeip').map === 0;
    }, 3000)), 'map=' + (TEST.call('nativeip') || {}).map);
  };
})();
