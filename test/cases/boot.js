// test/cases/boot.js —— harness 场景：boot 页面类型分流（0.9.88）
// 机制：pathname 在 bundle 前经 harness.html 的 BOOT_PATH replaceState 改到位（冷启动语义），
// bundle 求值后立即由 __BOOT_SNAP__ 快照「挂载前」状态（样式/根节点/__dbg）。
//   boot-home（/）：全量初始化——样式先就位（导航兜底胶囊前置条件），路由监听照常
//   boot-video（/v/…）：仅基础设施——全量 CSS 不得注入；深链挂载可达性是不变式（不得回归）
//   sign-auto-timing（/）：0.9.345——自动签到链只随脚本页首挂发起（裸官方首页零行为零弹窗）
// 0.9.81 起本目录只放场景体；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  async function body(h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, CASE = h.CASE;
    var isHome = CASE === 'boot-home';
    var kind = isHome ? 'home' : 'video';
    var snap = window.__BOOT_SNAP__ || {};
    var dbg = snap.dbg || [];
    // 挂载前快照：分流判据落点（dbg 埋点）+ 两分支的样式差异
    rec('boot-kind', dbg.indexOf('boot:' + kind) >= 0, 'dbg=' + dbg.slice(0, 6).join(','));
    rec('boot-style-pre-mount', snap.style === isHome,
      'style=' + snap.style + ' expect=' + isHome);
    rec('boot-no-root-pre-mount', snap.root === false, 'root=' + snap.root);
    // 深链挂载不变式：非首页（video）也靠 toggle/hashchange 进竖刷（0.9.72 起性质）。
    // 分发器已等过 #acsv-root，这里的断言钉「首页之外 boot 没把挂载链路弄断」
    rec('boot-mounted-after-hash', !!q('#acsv-root'));
    rec('boot-first-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  }
  C['boot-home'] = body;
  C['boot-video'] = body;

  // ---------- sign-auto-timing（0.9.345 用户复审：自动签到只随脚本页首挂，原生页零行为零弹窗） ----------
  // 反跑口径（规矩 4）：把链还原回 boot home 分支（旧形态）→ 裸 '/' 段 read≠0、卡落 body，
  // sat-bare-no-read / sat-bare-no-pop 双红；把首挂旗标摘掉 → sat-no-recall 红（重进重发）。
  // 场景前提：BOOT_PATH '/' + NO_AUTOMOUNT（裸段无壳）；假登录 cookie + 读写双计数 mock
  // 全在 harness.html **bundle 前**预置（boot 求值期即有 mock——否则旧形态的早发起会被
  // 「mock 未装→静默失败」掩盖成假绿，R1 反跑实测教训）。
  C['sign-auto-timing'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key, TEST = h.TEST;
    // 相位①：裸官方首页（无 hash 无挂载）——自动链一枚都不该发起，页面零脚本浮层
    await wait(1200);
    rec('sat-bare-no-read', window.__SIGN345__.read === 0, 'read=' + window.__SIGN345__.read);
    rec('sat-bare-no-pop', !q('.acsv-salm-host'));
    rec('sat-bare-no-shell', !q('#acsv-root'));
    // 相位②：进脚本页——首挂触发：一次读+一次写、黄历卡弹出且宿主是 #acsv-root
    location.hash = 'svfeed';
    rec('sat-mounted', !!(await waitFor(function () { return q('#acsv-root'); }, 15000)));
    var pop = await waitFor(function () { return q('.acsv-salm-host'); }, 8000);
    rec('sat-pop-on-mount', !!pop);
    rec('sat-pop-in-root', !!(pop && q('#acsv-root').contains(pop)));
    rec('sat-stack-pop', !TEST || (TEST.call('overlay') || []).some(function (l) { return /^signalmanac/.test(l); }),
      JSON.stringify(TEST ? TEST.call('overlay') : null));
    rec('sat-write-once', window.__SIGN345__.write === 1 && window.__SIGN345__.read === 1,
      'read=' + window.__SIGN345__.read + ' write=' + window.__SIGN345__.write);
    key('Escape'); // 关卡（overlay 栈 modal 语义，0.9.298 入栈断言同款驱动）
    await wait(200);
    rec('sat-pop-closed', !q('.acsv-salm-host'));
    // 相位③：离开竖刷再重进——首挂旗标+单飞：不重发请求、不再弹卡
    location.hash = '';
    await waitFor(function () { return !q('#acsv-root'); }, 5000);
    location.hash = 'svfeed';
    rec('sat-remount', !!(await waitFor(function () { return q('#acsv-root'); }, 15000)));
    await wait(1200);
    rec('sat-no-repop', !q('.acsv-salm-host'));
    rec('sat-no-recall', window.__SIGN345__.read === 1 && window.__SIGN345__.write === 1,
      'read=' + window.__SIGN345__.read + ' write=' + window.__SIGN345__.write);
  };
})();
