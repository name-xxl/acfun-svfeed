// test/cases/boot.js —— harness 场景：boot 页面类型分流（0.9.88）
// 机制：pathname 在 bundle 前经 harness.html 的 BOOT_PATH replaceState 改到位（冷启动语义），
// bundle 求值后立即由 __BOOT_SNAP__ 快照「挂载前」状态（样式/根节点/__dbg）。
//   boot-home（/）：全量初始化——样式先就位（导航兜底胶囊前置条件），路由监听照常
//   boot-video（/v/…）：仅基础设施——全量 CSS 不得注入；深链挂载可达性是不变式（不得回归）
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
})();
