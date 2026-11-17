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
    return sh.querySelectorAll('.acsv-sw')[idx];
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
    // 表驱动：十二张卡（label 顺序 = schema 顺序：通用组 3 + 播放组 5 + 评论组 3 + 隐私组 1）
    // 0.9.202：弹幕设置整组移出设置面板（改为底栏弹层）；0.9.245/246：评论组 +3（ipShow/ipKeep/devName）
    // 0.9.278：隐私组 +1（guestRead 非个性化推荐）
    // 0.9.341：通用组 +1（injectNative 官方页面增强，总开关+管理钮双控件——**其后开关索引 +1**）
    var labels = labelTexts(sh);
    rec('set-row-count', sh.querySelectorAll('.set-row').length === 12, 'rows=' + labels.join('/'));
    rec('set-labels', labels.join('|') === '自动检查更新|自动签到|官方页面增强|弹幕默认开启|编码偏好|缓冲档位|快进步长（秒）|相关推荐按列表顺序续播|评论区显示 IP 属地|属地缓存保留|设备型号美化|非个性化推荐', labels.join('|'));
    // 面板必须真渲染（offsetParent 真值法：0.9.62 黑屏教训）
    var pnl = sh.querySelector('.set-panel');
    rec('set-panel-visible', !!(pnl && pnl.offsetParent !== null));
    // 0.9.262 开关控件单源（P3-3）：几何 34×18 + 旋钮 14×14 + 可访问性（role/aria-checked）
    var sw0 = swOf(sh, 0);
    var swr = sw0 && sw0.getBoundingClientRect();
    rec('set-sw-geometry', !!swr && Math.round(swr.width) === 34 && Math.round(swr.height) === 18,
      swr ? swr.width + '×' + swr.height : 'none');
    var knob0 = sw0 && sw0.querySelector('i');
    var kr = knob0 && knob0.getBoundingClientRect();
    rec('set-sw-knob', !!kr && Math.round(kr.width) === 14 && Math.round(kr.height) === 14,
      kr ? kr.width + '×' + kr.height : 'none');
    rec('set-sw-a11y', !!sw0 && sw0.getAttribute('role') === 'switch',
      sw0 ? sw0.getAttribute('role') + '/' + sw0.getAttribute('aria-checked') : 'none');
    // 页脚版本号（0.9.253）：v{APP_VERSION} 左置（debug 构建带 -debug 后缀）——与 IP 面板页脚同源
    rec('set-footer-ver', /^v0\.9\.\d+/.test((sh.querySelector('.set-ver') || {}).textContent || ''),
      (sh.querySelector('.set-ver') || {}).textContent || 'none');
    // 弹幕开关：默认开 → 点关 → 存储 + 控制栏「弹」按钮即时同步（0.9.89 单源 applyDmState；
    // 0.9.285 偏好记忆单链：面板是「外部写入方」，按钮/图层跟随钉的就是 onChange 订阅链）
    // 0.9.341 索引注：injectNative 占 sw idx2（boolsub 也是 .acsv-sw），其后全部 +1
    var sw = swOf(sh, 3);
    rec('set-dm-on-default', !!(sw && sw.classList.contains('on')));
    var ctlDm = q('.acsv-cdm');
    rec('set-ctl-dm-on-before', !!(ctlDm && ctlDm.classList.contains('on')));
    var dmLayerOf = function () {
      var v = q('.acsv-slide video');
      var s = v && v.closest('.acsv-slide');
      return s && s._dmLayer;
    };
    rec('set-ctl-dm-layer-on-before', !!(function () { var L = dmLayerOf(); return !!L && L.isRunning(); })());
    if (sw) sw.click();
    rec('set-dm-now-off', !!(sw && !sw.classList.contains('on')));
    // 0.9.262 单源首日：暗色皮 token（关态 rgb(158,158,158)）与浅色皮分开由 skin-* 决定。
    // 等过渡落定再读（150ms 过渡期内 getComputedStyle 拿到的是插值/起点色）
    rec('set-sw-dark-token', !!sw && !!(await waitFor(function () {
      return getComputedStyle(sw).backgroundColor === 'rgb(158, 158, 158)';
    }, 1200)), sw ? getComputedStyle(sw).backgroundColor : 'none');
    rec('set-ctl-dm-synced', !!(ctlDm && !ctlDm.classList.contains('on')), 'ctlDmOn=' + (ctlDm ? ctlDm.classList.contains('on') : 'no-btn'));
    // 图层起停同链跟随（0.9.285 断言补强）：关=applyDmState 停层（同一次 onChange 派发，同步生效）
    rec('set-ctl-dm-layer-stopped', !!(function () { var L = dmLayerOf(); return !!L && !L.isRunning(); })());
    // 非个性化推荐（0.9.278）：默认关 → 点开（验持久化）→ 点关（验持久化）
    var swGuest = swOf(sh, 7); // 0.9.341：idx2 插入 injectNative 后 +1
    // 0.9.341 总闸行的「管理」钮（二级入口）在场；二级全流程本体在 settings-inject 场景
    var mb = sh.querySelector('.set-pair .set-act');
    rec('set-manage-btn', !!mb && mb.textContent === '管理', mb ? mb.textContent : 'none');
    rec('set-guest-default', !!(swGuest && !swGuest.classList.contains('on')));
    if (swGuest) swGuest.click();
    rec('set-guest-on', !!(swGuest && swGuest.classList.contains('on')));
    rec('set-guest-persist-on', !!(await waitFor(function () {
      return ls('acsv.s.guestRead') === 'true';
    }, 3000)), 'raw=' + ls('acsv.s.guestRead'));
    if (swGuest) swGuest.click();
    rec('set-guest-off', !!(swGuest && !swGuest.classList.contains('on')));
    rec('set-guest-persist-off', !!(await waitFor(function () {
      return ls('acsv.s.guestRead') === 'false';
    }, 3000)), 'raw=' + ls('acsv.s.guestRead'));
    // Esc 关面板（overlay 栈 modal:true 白拿；input.js 零改）→ 关即 flush
    key('Escape');
    rec('set-closed-by-esc', !!(await waitFor(function () { return !q('.acsv-set-host'); }, 3000)));
    rec('set-stack-empty', !TEST || (TEST.call('overlay') || []).length === 0, JSON.stringify(TEST ? TEST.call('overlay') : null));
    rec('set-persisted', !!(await waitFor(function () { return ls('acsv.s.dmDefault') === 'false'; }, 3000)), 'raw=' + ls('acsv.s.dmDefault'));
    // 重开：状态保持（读回自己的盘）
    var host2 = await openPanel(h);
    var sh2 = shadowOf(host2);
    rec('set-reopen-kept', !!(sh2 && swOf(sh2, 3) && !swOf(sh2, 3).classList.contains('on')));
    // 0.9.237 设置下拉三钉：字体简写修复（36px 行高/14px 字真正生效）+ 点外收起 + Esc 先收菜单不关面板
    var sel2 = sh2 && sh2.querySelector('.set-sel-btn');
    if (sel2) {
      sel2.click();
      var it0 = sh2.querySelector('.set-sel-item');
      rec('set-menu-metrics', (function () {
        if (!it0) return false;
        var cs = getComputedStyle(it0);
        return cs.lineHeight === '36px' && cs.fontSize === '14px';
      })(), it0 ? getComputedStyle(it0).lineHeight + '/' + getComputedStyle(it0).fontSize : 'no-item');
      await wait(60); // 外点监听在下一拍挂上（closeOnOutsideClick 的 setTimeout(0)）
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 面板外任意处
      await wait(80);
      rec('set-menu-outside-close', !sh2.querySelector('.set-sel-menu'));
      sel2.click(); // 重开，验证菜单级 Esc
      await wait(80);
      host2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(80);
      rec('set-menu-esc-once', !sh2.querySelector('.set-sel-menu') && !!q('.acsv-set-host')
        && (TEST.call('overlay') || []).some(function (l) { return /^settings/.test(l); }),
        JSON.stringify(TEST.call('overlay')));
    }
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
      var sw3 = swOf(sh3, 3); // 0.9.341 索引 +1（dmDefault）
      if (sw3) sw3.click();
      rec('set-ctl-dm-layer-resumed', !!(function () { var L = dmLayerOf(); return !!L && L.isRunning(); })());
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
    rec('mig-dm-adopted', !!(swOf(sh, 3) && !swOf(sh, 3).classList.contains('on'))); // 0.9.341 idx+1
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

  // ---------- settings-inject（0.9.341，确认稿 docs/preview/native-inject-switch.html） ----------
  // 二级「官方页面增强」全流程：管理钮进 → 六项清单/逐项持久化 → Esc 先回一级（消费不关层）
  // → 总闸关→hint 换话术→二级置灰（观感短路、值不回写）→ 开回还原 → 「完成」在二级直关整面板。
  // 反跑口径：摘 settingspanel 的 renderView/onPanelEsc/dim 任一环节 → 对应断言转红；
  // 摘 SCHEMA 子项 → 行数列先红（清单派生单源，人工抄表当场穿帮）。
  C['settings-inject'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, wait = h.wait, key = h.key,
      firstVideoReady = h.firstVideoReady, TEST = h.TEST;
    function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    // 文案逐字取自确认稿（稿=界面事实的唯一真源；改词必须先改稿）
    var NOTE_ON = '关闭后不再加载对应功能，重新加载页面后官方界面与未装脚本时一致；脚本竖刷世界不受影响。首页顶导航入口是脚本进门键，不入本清单、不受总闸管辖。';
    var NOTE_OFF = '官方页面增强已整体关闭；先回一级打开总开关，再逐项管理。';
    var LABELS6 = '个人中心「动态广场」|UP 主空间页「动态」标签|UP 主空间页「小视频」标签|官方页评论 IP 属地与设备型号|官方主页动态表情显示|官方私信卡片显示';
    rec('inj-ctl-ready', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    var host = await openPanel(h);
    var sh = shadowOf(host);
    rec('inj-panel', !!sh);
    if (!sh) return;
    // 1) 一级「管理」钮 → 二级：头部换装（‹ 在、✕ 隐）、说明条开态、六项顺序=SCHEMA 行序
    var mb = sh.querySelector('.set-pair .set-act');
    rec('inj-entry-btn', !!mb && mb.textContent === '管理');
    if (mb) mb.click();
    rec('inj-sub-title', ((sh.querySelector('.set-title') || {}).textContent) === '官方页面增强'); // =SCHEMA label 派生（标题单源）
    rec('inj-sub-head', !!sh.querySelector('.set-back') && !sh.querySelector('.set-x'));
    rec('inj-note-on', ((sh.querySelector('.set-note') || {}).textContent) === NOTE_ON);
    var inLabels = Array.prototype.map.call(sh.querySelectorAll('.set-body .set-label'), function (x2) { return x2.textContent; });
    rec('inj-rows-6', sh.querySelectorAll('.set-body .set-row').length === 6, inLabels.join('/'));
    rec('inj-labels-order', inLabels.join('|') === LABELS6, inLabels.join('|'));
    var swAll = sh.querySelectorAll('.set-body .acsv-sw');
    rec('inj-def-all-on', Array.prototype.every.call(swAll, function (s) { return s.classList.contains('on'); }));
    // 2) 逐项关（injectMemberPlaza=第 1 行；0.9.343 撤首页导航入口行后左移）→ 落盘 JSON 裸串 'false'
    if (swAll[0]) swAll[0].click();
    rec('inj-plaza-persist-off', !!(await waitFor(function () {
      return ls('acsv.s.injectMemberPlaza') === 'false';
    }, 3000)), 'raw=' + ls('acsv.s.injectMemberPlaza'));
    // 3) Esc 在二级=先回一级（overlay onEsc 预处理消费，面板不关、栈不动）
    key('Escape');
    await wait(150);
    rec('inj-esc-to-main', ((sh.querySelector('.set-title') || {}).textContent) === '设置' && !!q('.acsv-set-host'));
    rec('inj-esc-stack', !TEST || (TEST.call('overlay') || []).join() === 'settings:m',
      JSON.stringify(TEST ? TEST.call('overlay') : null));
    // 4) 重进二级：关态从存储读回（不是显示残留）
    var mb2 = sh.querySelector('.set-pair .set-act');
    if (mb2) mb2.click();
    var swA2 = sh.querySelectorAll('.set-body .acsv-sw');
    rec('inj-reopen-kept', !!swA2[0] && !swA2[0].classList.contains('on') && !!swA2[1] && swA2[1].classList.contains('on'));
    // 5) ‹ 回一级 → 拨总闸关：行 hint 换关态话术（hintOff 单源 SCHEMA）
    var back = sh.querySelector('.set-back');
    if (back) back.click();
    rec('inj-back-main-head', ((sh.querySelector('.set-title') || {}).textContent) === '设置' && !!sh.querySelector('.set-x'));
    var swMaster = swOf(sh, 2); // 通用组第三开关（updCheck/autoSign/injectNative）
    rec('inj-master-on-default', !!(swMaster && swMaster.classList.contains('on')));
    var hints = sh.querySelectorAll('.set-body .set-hint');
    if (swMaster) swMaster.click();
    rec('inj-master-hint-off', !!hints[2] && hints[2].textContent === '已整体关闭：官方页面恢复原样；重新加载后生效', hints[2] ? hints[2].textContent : 'none');
    // 6) 总闸关进二级：置灰态——说明条换话术、整行 dim、开关呈关位、pointer-events 停用、**值不回写**
    var mb3 = sh.querySelector('.set-pair .set-act');
    if (mb3) mb3.click();
    rec('inj-dim-note', ((sh.querySelector('.set-note') || {}).textContent) === NOTE_OFF);
    rec('inj-dim-rows', sh.querySelectorAll('.set-body .set-row.dim').length === 6);
    var dimSw = sh.querySelectorAll('.set-row.dim .acsv-sw');
    rec('inj-dim-vis-off', !!dimSw[0] && Array.prototype.every.call(dimSw, function (s) { return !s.classList.contains('on'); }));
    rec('inj-dim-ptr', !!dimSw[0] && getComputedStyle(dimSw[0]).pointerEvents === 'none');
    rec('inj-dim-value-untouched', ls('acsv.s.injectSpaceMoments') === null && ls('acsv.s.injectMemberPlaza') === 'false',
      'moments=' + ls('acsv.s.injectSpaceMoments') + ' plaza=' + ls('acsv.s.injectMemberPlaza'));
    // 7) 回一级把总闸开回 → 再进二级：各项还原自身状态（nav 默认开、plaza 仍关）
    var back2 = sh.querySelector('.set-back');
    if (back2) back2.click();
    var swMaster2 = swOf(sh, 2);
    if (swMaster2) swMaster2.click();
    rec('inj-master-hint-on', !!sh.querySelectorAll('.set-body .set-hint')[2]
      && sh.querySelectorAll('.set-body .set-hint')[2].textContent === '官方页上的广场接管、空间标签、评论 IP、动态表情、私信卡片；重新加载后生效');
    var mb4 = sh.querySelector('.set-pair .set-act');
    if (mb4) mb4.click();
    var swA4 = sh.querySelectorAll('.set-body .acsv-sw');
    rec('inj-restore-visual', !!swA4[0] && !swA4[0].classList.contains('on') && !!swA4[1] && swA4[1].classList.contains('on'));
    // 8) 二级「完成」=直关整面板（不做两步退出；关即 flush）+ 栈空 + 总闸值落盘
    var done = sh.querySelector('.set-foot .set-act.primary');
    if (done) done.click();
    rec('inj-done-close-all', !!(await waitFor(function () { return !q('.acsv-set-host'); }, 3000)));
    rec('inj-stack-empty', !TEST || (TEST.call('overlay') || []).length === 0,
      JSON.stringify(TEST ? TEST.call('overlay') : null));
    rec('inj-persist-master', !!(await waitFor(function () {
      return ls('acsv.s.injectNative') === 'true' && ls('acsv.s.injectMemberPlaza') === 'false';
    }, 3000)), 'master=' + ls('acsv.s.injectNative') + ' plaza=' + ls('acsv.s.injectMemberPlaza'));
    // 礼节还原（防同页后续断言吃脏盘；场景结束即新页，这步纯卫生）
    var host5 = await openPanel(h);
    var sh5 = shadowOf(host5);
    if (sh5) {
      var mb5 = sh5.querySelector('.set-pair .set-act');
      if (mb5) mb5.click();
      var sw5 = sh5.querySelectorAll('.set-body .acsv-sw');
      if (sw5[0]) sw5[0].click(); // plaza 点回开
      var done5 = sh5.querySelector('.set-foot .set-act.primary');
      if (done5) done5.click();
      await waitFor(function () { return !q('.acsv-set-host'); }, 3000);
    }
  };
})();
