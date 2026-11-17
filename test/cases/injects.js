// test/cases/injects.js —— harness 场景：官方页面增强注入闸（0.9.341，确认稿
// docs/preview/native-inject-switch.html）
// 语义钉子（稿⑥行为承诺的形态/行为腿，取值腿在 check-preview）：
//   · 关＝不注入不加载整链短路——断言全用「缺席」形态：入口不在、宿主未被吃、样式未落；
//   · 生效＝冷启动判读：关值在 harness.html **bundle 前**预置（同 ip-tags-off 先例），
//     运行中改设置不动当前页——不测「即时摘除」是因为根本没承诺（无 unmount 义务）；
//   · 竖刷世界不在射程：off 场景里壳照常挂载/路由照常（nav-off-shell-alive 钉反例——
//     若哪天有人把闸错接到 toggle/mount 链上，这条先红）。
// 反跑口径（规矩 4）：摘 boot 任一处 injectOn 短路 → 对应关态场景「缺席断言」转红；
//   摘对侧开态对照（inject-home-nav）则注入件本身失修时关态假绿——正反双腿各管各的。
// 新增场景记得同步 run-harness.mjs 的 HARNESS_CASES（check-cases.mjs 双向校验）。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  // 官方首页顶导航夹具：nav.js 的选择器面（#pagelet_navigation）+ 白名单 label「首页」；
  // watchNav 的 MutationObserver 会等它（boot 时夹具不在 = harness 常态，注入走 MO 补拍）
  function seedTopNav() {
    document.body.insertAdjacentHTML('beforeend',
      '<nav id="pagelet_navigation"><ul class="nav-ul">'
      + '<li id="nv-li-home"><a href="/" id="nv-a-home">首页</a></li>'
      + '</ul></nav>');
  }

  // ---------- 开态对照：inject-home-nav（零预置=默认全开）——nav.js 正腿 + 后续关态的「本可注入」证明 ----------
  C['inject-home-nav'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor;
    seedTopNav(q);
    var nav = await waitFor(function () {
      var it = q('[data-acsv-nav]');
      return it && it.textContent.indexOf('小视频') >= 0 && it;
    }, 5000);
    rec('nav-on-injected', !!nav);
    // 克隆体落点：紧随原生 li 之后、href 走脚本路由锚（0.9.47 首页白名单内）
    var a = nav && nav.querySelector('a[href="#svfeed"]');
    rec('nav-on-href', !!a, a ? a.getAttribute('href') : 'none');
    rec('nav-on-sentinel', !!(nav && nav.getAttribute('data-acsv-nav') === '1'));
  };

  // ---------- 关态①：总闸关 × 首页（短路点 boot home→navGate）----------
  C['inject-off-home'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait;
    // 反例钉：脚本世界不随闸关——竖刷壳（boot 无关的 toggle/mount 链）照常挂载
    rec('nav-off-shell-alive', !!q('#acsv-root'));
    seedTopNav(q);
    // MO 补拍时序：开态下注入是「夹具插入→亚秒级」；等满 1500ms 仍缺席即判短路生效
    //（摘 boot 的 injectOn('injectNavEntry') 短路 → 这里被注入 → 转红）
    await wait(1500);
    rec('nav-off-no-clone', !q('[data-acsv-nav]'));
    rec('nav-off-native-untouched', !!(q('#nv-li-home') && q('#nv-li-home').nextElementSibling === null));
  };

  // ---------- 关态②：plaza+IP 双关 × /member/feeds（memberCenter 支整支短路）----------
  C['inject-off-member'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait;
    var snap = window.__BOOT_SNAP__ || {};
    rec('inj-mc-kind', (snap.dbg || []).indexOf('boot:memberCenter') >= 0,
      'dbg=' + String((snap.dbg || []).slice(0, 6)));
    // 稿⑥「两闸全关时本支一行不跑」：样式与 root 前置同灭（摘 injectPageIp 短路则样式先红）
    rec('inj-mc-no-style', snap.style === false, 'style=' + snap.style);
    rec('inj-mc-no-root', snap.root === false, 'root=' + snap.root);
    // 原生页夹具同 member-plaza（导航两链 + feeds 容器）——摘修复反跑：入口会被轮询打成
    document.body.insertAdjacentHTML('beforeend',
      '<div class="ac-member-navigation"><div class="member-sub-nav">'
      + '<a href="/member/feeds" id="mc-n-feeds">动态</a>'
      + '<a href="/member/feeds/fans" id="mc-n-fans">粉丝</a>'
      + '</div></div>'
      + '<div class="ac-member-main"><div class="ac-member-feeds">'
      + '<div class="ac-member-feeds-header" id="mc-hd-header">头部</div>'
      + '<div id="mc-hd-native">原生条目</div>'
      + '</div></div>');
    await wait(1600); // > 轮询一拍（retryMs 500）×2 + MO 补拍余量
    rec('inj-mc-no-nav', !q('[data-acsv-mnav]'));
    rec('inj-mc-host-untouched', !q('.acsv-mp') && !!q('#mc-hd-native'));
    rec('inj-mc-no-toast', !q('.acsv-toast')); // toast 是 watchMemberNav 首步——缺席=链未起
  };

  // ---------- 关态③：空间两标签分项关（总闸仍默认开）× /u/12345 ----------
  C['inject-off-space'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait;
    var snap = window.__BOOT_SNAP__ || {};
    rec('inj-sp-kind', (snap.dbg || []).indexOf('boot:member') >= 0,
      'dbg=' + String((snap.dbg || []).slice(0, 6)));
    // 标签栏夹具同 space-moments（三原生 + 排序 li）——摘两短路后轮询/自愈会把两自建标签打成
    document.body.insertAdjacentHTML('beforeend',
      '<div id="ac-space"><div class="ac-space-contribute-list"><ul class="tags">'
      + '<li data-index="video" id="sp-n-video">视频</li>'
      + '<li data-index="article" id="sp-n-article">文章</li>'
      + '<li data-index="album" id="sp-n-album">合辑</li>'
      + '<li id="sp-n-sort"><span id="ac-space-contribute-sort">最新</span></li>'
      + '</ul></div></div>');
    await wait(1600); // > CFG.nav.retryMs(500)×2：开闸形态下夹具晚到也会被补注入
    rec('inj-sp-no-moment-tab', !q('li[data-index="moment"]'));
    rec('inj-sp-no-svideo-tab', !q('li[data-index="svideo"]'));
    rec('inj-sp-native-alive', !!(q('#sp-n-video') && q('#sp-n-album')));
    // 注入件样式自持（spacetab/uppage 挂载才 ensureStyle）：两标签全关＝member 支零样式
    rec('inj-sp-no-style', !q('#acsv-style'));
  };
})();
