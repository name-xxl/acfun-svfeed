// test/cases/settings.js —— harness 场景：设置面板（0.9.89 路线图 1.1/1.2）
// 机制：host 挂 root + Shadow DOM（settingspanel.js），断言经 host.shadowRoot（msg.js 先例）。
// 源：走 home（HOME_CASES）——只有 douga 条有 cap.danmaku/cap.hls（playitem.js:102），
// 控制栏「弹」按钮与编码/缓冲菜单只在 home 条存在，这正是本场景要同步的对象。
//   settings-open：点 dock 齿轮开面板（首个点 dock 的驱动——既有场景都直接写 hash）→ 六控件在场
//     → 关「弹幕默认开启」→ 存储落盘 + 控制栏「弹」按钮即时同步 → Esc 关（栈空）→ 重开状态保持
//   settings-migrate：bundle 前只预置老键（harness.html）→ 面板读出老键值（收养）+ 新键生成 + 老键未删
// 0.9.81 起本目录只放场景体；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  async function openPanel(h) {
    var gear = h.q('.acsv-dock-gear');
    if (!gear) return null;
    gear.click(); // 真实点击（含 dock 底部钉位的那颗齿轮）
    return await h.waitFor(function () { return h.q('.acsv-set-host'); }, 5000);
  }
  function shadowOf(host) { return host && host.shadowRoot; }
  function labelTexts(sh) {
    return Array.prototype.map.call(sh.querySelectorAll('.set-label'), function (x) { return x.textContent; });
  }
  function selTextOf(sh, idx) {
    var b = sh.querySelectorAll('.set-sel-btn')[idx];
    return b ? b.textContent : '';
  }
  function swOf(sh, idx) {
    return sh.querySelectorAll('.set-sw')[idx];
  }

  C['settings-open'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, key = h.key,
      firstVideoReady = h.firstVideoReady, TEST = h.TEST;
    rec('set-ctl-ready', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    var host = await openPanel(h);
    rec('set-host-mounted', !!host);
    var sh = shadowOf(host);
    rec('set-shadow-root', !!sh);
    if (!sh) return;
    // 表驱动：六张卡（label 顺序 = schema 顺序：通用组 1 + 播放组 5；0.9.168 增 relSequential）
    // 0.9.202：弹幕设置整组移出设置面板（改为底栏弹层），面板行数回到 6
    var labels = labelTexts(sh);
    rec('set-row-count', sh.querySelectorAll('.set-row').length === 6, 'rows=' + labels.join('/'));
    rec('set-labels', labels.join('|') === '自动检查更新|弹幕默认开启|编码偏好|缓冲档位|快进步长（秒）|相关推荐按列表顺序续播', labels.join('|'));
    // 面板必须真渲染（offsetParent 真值法：0.9.62 黑屏教训）
    var pnl = sh.querySelector('.set-panel');
    rec('set-panel-visible', !!(pnl && pnl.offsetParent !== null));
    // 弹幕开关：默认开 → 点关 → 存储 + 控制栏「弹」按钮即时同步（0.9.89 单源 applyDmState）
    var sw = swOf(sh, 1);
    rec('set-dm-on-default', !!(sw && sw.classList.contains('on')));
    var ctlDm = q('.acsv-cdm');
    rec('set-ctl-dm-on-before', !!(ctlDm && ctlDm.classList.contains('on')));
    if (sw) sw.click();
    rec('set-dm-now-off', !!(sw && !sw.classList.contains('on')));
    rec('set-ctl-dm-synced', !!(ctlDm && !ctlDm.classList.contains('on')), 'ctlDmOn=' + (ctlDm ? ctlDm.classList.contains('on') : 'no-btn'));
    // Esc 关面板（overlay 栈 modal:true 白拿；input.js 零改）→ 关即 flush
    key('Escape');
    rec('set-closed-by-esc', !!(await waitFor(function () { return !q('.acsv-set-host'); }, 3000)));
    rec('set-stack-empty', !TEST || (TEST.call('overlay') || []).length === 0, JSON.stringify(TEST ? TEST.call('overlay') : null));
    rec('set-persisted', !!(await waitFor(function () { return ls('acsv.s.dmDefault') === 'false'; }, 3000)), 'raw=' + ls('acsv.s.dmDefault'));
    // 重开：状态保持（读回自己的盘）
    var host2 = await openPanel(h);
    var sh2 = shadowOf(host2);
    rec('set-reopen-kept', !!(sh2 && swOf(sh2, 1) && !swOf(sh2, 1).classList.contains('on')));
    // 收编端到端（计划验收项）：面板改编码偏好 → 控制栏「编码」菜单高亮跟上（同一键的两个入口）
    var selBtn = sh2 && sh2.querySelector('.set-sel-btn'); // 第一个 select = 编码偏好
    if (selBtn) {
      selBtn.click();
      var opts = sh2.querySelectorAll('.set-sel-item');
      for (var oi = 0; oi < opts.length; oi++) if (opts[oi].textContent === 'HEVC') opts[oi].click();
    }
    var x1 = sh2 && sh2.querySelector('.set-x'); // ✕ 关 = flush，随后菜单 getter 现读的才是落盘值
    if (x1) x1.click();
    rec('set-codec-close-flush', !!(await waitFor(function () { return ls('acsv.s.codec') === '"hevc"'; }, 3000)), 'raw=' + ls('acsv.s.codec'));
    var codecBtn = Array.prototype.filter.call(document.querySelectorAll('.acsv-cbtn.acsv-cq'), function (b) {
      return b.textContent === '编码';
    })[0];
    rec('set-ctl-codec-btn', !!codecBtn);
    if (codecBtn) {
      codecBtn.click(); // 只开菜单读高亮，不点条目（点条目会重挂播放，非本断言所需）
      var onItem = document.querySelector('.acsv-qmenu .acsv-qitem.on');
      rec('set-ctl-codec-synced', !!onItem && onItem.textContent === 'HEVC', onItem ? onItem.textContent : 'no-on-item');
      codecBtn.click(); // 收起菜单
    }
    // 还原（纯礼节）：先把编码点回「自动」，再点回弹幕开 → ✕ 关
    var host3 = await openPanel(h);
    var sh3 = shadowOf(host3);
    if (sh3) {
      var sel3 = sh3.querySelector('.set-sel-btn');
      if (sel3) {
        sel3.click();
        var opts3 = sh3.querySelectorAll('.set-sel-item');
        for (var oj = 0; oj < opts3.length; oj++) if (opts3[oj].textContent === '自动') opts3[oj].click();
      }
      var sw3 = swOf(sh3, 1);
      if (sw3) sw3.click();
      var x3 = sh3.querySelector('.set-x');
      if (x3) x3.click();
    }
    await wait(300);
    rec('set-restored', ls('acsv.s.dmDefault') === 'true' && ls('acsv.s.codec') === '"auto"',
      'dm=' + ls('acsv.s.dmDefault') + ' codec=' + ls('acsv.s.codec'));
  };

  C['settings-migrate'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, key = h.key, firstVideoReady = h.firstVideoReady;
    rec('mig-ctl-ready', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    // 老键在场、新键缺席（harness.html 预置）
    rec('mig-legacy-seeded', ls('acsv-codec') === 'hevc' && ls('acsv.s.codec') === null,
      'legacy=' + ls('acsv-codec') + ' new=' + ls('acsv.s.codec'));
    var host = await openPanel(h);
    var sh = shadowOf(host);
    rec('mig-panel', !!sh);
    if (!sh) return;
    // 面板读出老键值（收养）：编码=HEVC、缓冲=标准 10s、弹幕开关=关
    rec('mig-codec-adopted', selTextOf(sh, 0) === 'HEVC', selTextOf(sh, 0));
    rec('mig-buf-adopted', selTextOf(sh, 1) === '标准 10s', selTextOf(sh, 1));
    rec('mig-dm-adopted', !!(swOf(sh, 1) && !swOf(sh, 1).classList.contains('on')));
    // 收养须落新键；老键不删（回滚友好）
    rec('mig-new-written', !!(await waitFor(function () { return ls('acsv.s.codec') === '"hevc"'; }, 3000)), 'raw=' + ls('acsv.s.codec'));
    rec('mig-legacy-kept', ls('acsv-codec') === 'hevc' && ls('acsv-buf') === 'std' && ls('acsv-dm-on') === '0');
    // 内里是影子根：光 DOM 查不到行（结构性证据，防哪天悄悄改回光 DOM）
    rec('mig-shadow-only', document.querySelectorAll('.set-row').length === 0);
    var x = sh.querySelector('.set-x');
    if (x) x.click();
    rec('mig-closed-by-x', !!(await waitFor(function () { return !q('.acsv-set-host'); }, 3000)));
    rec('mig-stack-empty', !h.TEST || (h.TEST.call('overlay') || []).length === 0);
  };
})();
