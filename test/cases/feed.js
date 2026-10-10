// test/cases/feed.js —— harness 场景：基础流（首屏起播/切源/快速划动/解析失败/预热）
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- smoke ----
  C['smoke'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
key('ArrowDown');
// release 构建无 __ACSV_TEST__（读不到 current）：跳过索引断言，非死路
rec('next-on-arrowdown', !TEST ? true : !!(await waitFor(function () { return cur() === 1; }, 5000)),
  TEST ? '' : 'skip:release');
await wait(1500);
var vids = document.querySelectorAll('#acsv-root video');
// 窗口 [cur-1, cur+1]：cur/cur+1 挂新 video，cur-1 保留旧 video（已暂停）→ 上限 3
rec('videos-capped', vids.length <= 3, 'count=' + vids.length);
// 0.9.186 可访问性：顶栏图标按钮 aria-label（与 title 同源）——摘属性即转红
var tbIm = q('.acsv-im-btn'), tbUpd = q('.acsv-upd-btn');
rec('a11y-topbar-im', !!tbIm && tbIm.getAttribute('aria-label') === '私信');
rec('a11y-topbar-upd', !!tbUpd && tbUpd.getAttribute('aria-label') === '更新说明');
// 0.9.197 两级全屏：网页全屏＝隐自身 UI（dock/顶栏/右栏/信息区都在 CSS 里收口到根类）；
// 可见性用 offsetParent（display:none 时为 null）。窗口全屏走 Fullscreen API，无头环境下
// 无用户激活、requestFullscreen 不可靠，故只钉影院态与退出路径。
// 模拟站点自身的经典滚动条（实机 A 站首页 innerWidth 1280 / clientWidth 1265）：覆盖层
// position:fixed;inset:0 对的是 ICB（不含滚动条）⇒ 不解锁就永远右侧留一条缝。先撑高再进影院
var tallStub = document.createElement('div');
tallStub.style.cssText = 'width:1px;height:3000px';
document.body.appendChild(tallStub);
rec('webfs-hides-ui', (function () {
  var r = document.getElementById('acsv-root'), b = q('.acsv-cwebfs');
  if (!r || !b) return false;
  b.click();
  var dock = q('.acsv-dock'), top = q('.acsv-top'), side = q('.acsv-side');
  // 影院态左栏已隐 ⇒ 滚动区让位边距必须归零，否则左侧留黑（0.9.202 实报「网页全屏没铺满」）
  var sc = q('.acsv-scroller');
  var marginZero = sc && getComputedStyle(sc).marginLeft === '0px';
  return r.classList.contains('acsv-cinema') && b.classList.contains('on')
    && dock && dock.offsetParent === null && top && top.offsetParent === null
    && side && side.offsetParent === null && marginZero;
})(), (function () {
  var sc = q('.acsv-scroller');
  return 'scrollerMarginLeft=' + (sc ? getComputedStyle(sc).marginLeft : 'none');
})());
// 影院态必须**铺满视口**（0.9.207 实报「网页全屏最右侧有空隙」）：根/滚动区/幻灯片三者都
// 右缘贴到 innerWidth、左缘 0——任一处留边都会在黑底上露成"空隙"
rec('webfs-fills-viewport', (function () {
  var r = document.getElementById('acsv-root');
  var sc = q('.acsv-scroller'), sl = q('.acsv-slide');
  if (!r || !sc || !sl) return false;
  var rr = r.getBoundingClientRect(), sr = sc.getBoundingClientRect(), lr = sl.getBoundingClientRect();
  var W = window.innerWidth, H = window.innerHeight;
  return Math.abs(rr.left) <= 1 && Math.abs(rr.width - W) <= 1 && Math.abs(rr.height - H) <= 1
    && Math.abs(sr.left) <= 1 && Math.abs(sr.right - W) <= 1
    && Math.abs(lr.left) <= 1 && Math.abs(lr.right - W) <= 1;
})(), (function () {
  var r = document.getElementById('acsv-root'), sc = q('.acsv-scroller'), sl = q('.acsv-slide');
  if (!r || !sc || !sl) return 'missing';
  var rr = r.getBoundingClientRect(), sr = sc.getBoundingClientRect(), lr = sl.getBoundingClientRect();
  return 'win=' + window.innerWidth + 'x' + window.innerHeight
    + ' | root=' + Math.round(rr.left) + '..' + Math.round(rr.right)
    + ' w=' + Math.round(rr.width) + ' h=' + Math.round(rr.height)
    + ' | scroller=' + Math.round(sr.left) + '..' + Math.round(sr.right)
    + ' | slide=' + Math.round(lr.left) + '..' + Math.round(lr.right);
})());
// 影院态下**站点滚动条必须被锁掉**：页面有滚动条时覆盖层仍须铺满（锁前 1265 / 锁后 1280 实测）
rec('webfs-locks-page-scroll', (function () {
  var de = document.documentElement;
  var r = document.getElementById('acsv-root');
  if (!r) return false;
  var rr = r.getBoundingClientRect();
  // 注：无头 Chromium 用**覆盖式滚动条**（不占布局宽），所以这里宽度那条在无头下是恒真兜底，
  // 真正钉住的是「类在 + 计算样式 overflowY=hidden」——后者是锁生效的实效判据（真机 1265→1280）
  return de.classList.contains('acsv-scroll-lock')
    && getComputedStyle(de).overflowY === 'hidden'
    && Math.abs(rr.width - window.innerWidth) <= 1;
})(), (function () {
  var de = document.documentElement;
  var r = document.getElementById('acsv-root');
  return 'lockClass=' + de.classList.contains('acsv-scroll-lock')
    + ' overflowY=' + getComputedStyle(de).overflowY
    + ' | rootW=' + (r ? Math.round(r.getBoundingClientRect().width) : 'none')
    + ' innerW=' + window.innerWidth + ' clientW=' + de.clientWidth
    + ' pageScroll=' + (de.scrollHeight > de.clientHeight);
})());
if (tallStub.parentNode) tallStub.remove();
rec('webfs-esc-exits', (function () {
  var r = document.getElementById('acsv-root');
  key('Escape'); // 影院态下 Esc 只退影院（顶栏已隐，不许直接退脚本）
  var dock = q('.acsv-dock');
  return !r.classList.contains('acsv-cinema') && dock && dock.offsetParent !== null
    && !!r; // 根仍在：没被 Esc 误退
})());
// 影院退出**不解锁**（我们的 UI 还挂着，覆盖层仍须铺满）——解锁点只在根拆除时
rec('webfs-lock-kept-after-exit', document.documentElement.classList.contains('acsv-scroll-lock'),
  'lockClass=' + document.documentElement.classList.contains('acsv-scroll-lock'));
key('Escape');
rec('esc-exits', !!(await waitFor(function () { return !document.getElementById('acsv-root'); }, 5000)));
// 根拆除＝解锁：把 html 还给站点（否则站页再也滚不动）
rec('scroll-lock-released', !document.documentElement.classList.contains('acsv-scroll-lock'),
  'lockClass=' + document.documentElement.classList.contains('acsv-scroll-lock'));
  };
  // ---- homeswitch ----
  C['homeswitch'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('home-first-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
var f = feed();
rec('home-resolved', !!(f && f.items[0] && f.items[0].hasUrls));
  };

  // ---- fastswipe ----
  C['fastswipe'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
for (var i = 0; i < 4; i++) { key('ArrowDown'); await wait(150); }
await wait(3000); // 等滚动吸附/窗口回收收敛
var c = cur(), vids2 = document.querySelectorAll('#acsv-root video'), others = 0;
Array.prototype.forEach.call(vids2, function (v) {
  var s = v.closest('.acsv-slide');
  if (s && Number(s.dataset.idx) !== c && !v.paused) others++;
});
rec('video-count-capped', vids2.length <= 3, 'count=' + vids2.length + ' cur=' + c);
rec('only-current-plays', others === 0, 'othersPlaying=' + others);
  };

  // ---- land-near（0.9.216：近跳落点不变式 + repeat 守卫；issue #1「滚半屏停留」） ----
  C['land-near'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, finish = h.finish;
    rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    // 0.9.216 探针实测：smooth 飞行中一次「auto 瞬时滚动」会无声撕掉动画（scroll 事件
    // 不发、停在半途、mandatory snap 对已取消的滚动不补吸附）——issue #1「滚半屏停留」
    // 的机制原型。近跳归队远跳链路（瞬时落位+两帧 settle）后，同窗口的 auto 落笔不再
    // 能撕掉任何东西（动画本就不存在），落点钉死在目标顶
    key('ArrowDown');
    await wait(16); // 复刻 0.9.74 landWhenVisible 的轮询间隔：auto 撕 smooth 的历史窗口
    q('.acsv-scroller').scrollTo({ top: 0, behavior: 'auto' }); // 撕 smooth 的那次落笔（旧病灶模拟）
    rec('land-near-after-auto-tear', !!(await waitFor(function () {
      var sl = slide(1), sc = q('.acsv-scroller');
      return sl && sc && Math.abs(sl.offsetTop - sc.scrollTop) <= 2;
    }, 4000)), (function () {
      var sl = slide(1), sc = q('.acsv-scroller');
      return sl && sc ? 'd=' + Math.round(sl.offsetTop - sc.scrollTop) : 'no-slide';
    })());
    rec('land-stuck-zero', (window.__ACSV_TEST__.getStats()['land.stuck'] || 0) === 0,
      'land.stuck=' + (window.__ACSV_TEST__.getStats()['land.stuck'] || 0));
    // 用户输入时间戳：滚轮必留痕（落点复核「跟不跟手势抢」的判据）
    var t0 = window.__acsvLastInput || 0;
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    rec('input-stamp-wheel', (window.__acsvLastInput || 0) > t0);
    // 方向戳（0.9.231）：落位兜底按它选补齐方向（+1 下一条 / -1 上一条）——无它则退化为
    // 「最近吸附点」。两向各打一发，读数必须跟着翻
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }));
    var dirUp = window.__acsvLastInputDir;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }));
    rec('input-stamp-wheel-dir', dirUp === -1 && window.__acsvLastInputDir === 1,
      'up=' + dirUp + ' down=' + window.__acsvLastInputDir);
    // 键盘 repeat 不再触发连翻（0.9.216：repeat 重发导航会在飞行中段打断重发）：
    // 首发起飞后 repeat 连发 3 次，游标与视口必须停在 2 不再前进
    key('ArrowDown');
    var held = 0;
    for (var ri = 0; ri < 3; ri++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true, bubbles: true }));
      held++;
    }
    await wait(1200); // 等足一次近跳的落位+settle 周期
    rec('key-repeat-no-advance', (function () {
      var sl = slide(2), sc = q('.acsv-scroller');
      return held === 3 && cur() === 2 && sl && sc && Math.abs(sl.offsetTop - sc.scrollTop) <= 2;
    })(), 'cur=' + cur() + (function () {
      var sl = slide(2), sc = q('.acsv-scroller');
      return sl && sc ? ' d=' + Math.round(sl.offsetTop - sc.scrollTop) : ' no-slide';
    })());
    // 半屏停留探测器有效性（0.9.216）：临时解除吸附造出「静止在非吸附点」（真实病灶态
    // ——在途滚动被 auto 撕掉后静态停在非吸附点、snap 不补——已由 0.9.216 探针 p7 实测
    // 钉死，这里只验探测器本身不哑：判据连栽过三坑——收 keydown 自拦、拿 cur 判跳过正主、
    // landSeq 让连续切换全废）。解除吸附后 scrollTop 能稳定停在两吸附点之间，探测器应记一笔
    var stuck0 = window.__ACSV_TEST__.getStats()['land.stuck'] || 0;
    var heal0 = window.__ACSV_TEST__.getStats()['land.heal'] || 0; // 基线须在造态前抓：自愈与现象计数同拍
    var sc2 = q('.acsv-scroller');
    sc2.style.scrollSnapType = 'none'; // 造态期间吸附一直解除：非吸附位不会被引擎吸回
    sc2.scrollTop = Math.round(sc2.clientHeight * 1.5);
    rec('land-stuck-detected', !!(await waitFor(function () {
      return (window.__ACSV_TEST__.getStats()['land.stuck'] || 0) > stuck0;
    }, 4000)), 'stuck=' + (window.__ACSV_TEST__.getStats()['land.stuck'] || 0)
      + ' top=' + Math.round(sc2.scrollTop) + ' h=' + sc2.clientHeight);
    // ---- 落位兜底自愈（0.9.231：0.9.216 的探测器升级为动作，release 也生效）----
    // 与上一条同一造态、同一拍：现象计数先落，紧接着按手势方向补齐到吸附点（land.stuck
    // 口径不变——非零＝当场上演过；自愈不改 FeedStore.current，游标交回 IO 正常推进）。
    // 吸附仍解除着 ⇒ on-snap 只可能是脚本自愈写的（引擎不背这个锅；摘掉自愈两断言即转红）
    rec('land-heal-acted', !!(await waitFor(function () {
      return (window.__ACSV_TEST__.getStats()['land.heal'] || 0) > heal0;
    }, 6000)), 'heal=' + (window.__ACSV_TEST__.getStats()['land.heal'] || 0)
      + ' top=' + Math.round(sc2.scrollTop) + ' h=' + sc2.clientHeight);
    rec('land-heal-on-snap', (function () {
      var st = sc2.scrollTop, on = false;
      Array.prototype.forEach.call(sc2.children, function (c) {
        if (c.dataset && c.dataset.idx != null && Math.abs(c.offsetTop - st) <= 2) on = true;
      });
      return on;
    })(), 'top=' + Math.round(sc2.scrollTop));
    sc2.style.scrollSnapType = ''; // 造态结束：恢复吸附
    // 负例（手势未收不抢）：同样造非吸附位，但持续打手势时间戳（模拟长拖拽/连续滚轮）——
    // 静默判据不满足，自愈不得出手（scrollTop 保持原样、heal 计数不涨）。先等过上一笔
    // 自愈的 2s 频控窗，否则会把「频控挡下」误读成「静默闸生效」
    await wait(2200);
    sc2.style.scrollSnapType = 'none';
    var stuckTop = Math.round(sc2.clientHeight * 2.5);
    sc2.scrollTop = stuckTop;
    var healN = window.__ACSV_TEST__.getStats()['land.heal'] || 0;
    var stampIv = setInterval(function () { window.__acsvLastInput = Date.now(); }, 200);
    await wait(1400);
    clearInterval(stampIv);
    rec('land-heal-input-gate', (window.__ACSV_TEST__.getStats()['land.heal'] || 0) === healN
      && Math.abs(sc2.scrollTop - stuckTop) <= 2,
      'heal=' + (window.__ACSV_TEST__.getStats()['land.heal'] || 0) + '/' + healN
        + ' top=' + Math.round(sc2.scrollTop) + ' want=' + stuckTop);
    sc2.style.scrollSnapType = '';
    // 落位调用计数（0.9.216 诊断）：近跳走脚本这条路必留痕（本场景共发起 2 次近跳）——
    // 真机上「land.near 恒 0」即用户根本没走 landAt（滚轮/触摸原生滚动），排查方向整体换
    rec('land-call-counted', (window.__ACSV_TEST__.getStats()['land.near'] || 0) >= 2,
      'land.near=' + (window.__ACSV_TEST__.getStats()['land.near'] || 0));
    finish();
  };

  // ---- resolvefail ----
  C['resolvefail'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('resolve-fail-error-state', !!(await waitFor(function () {
  var s = slide(0);
  return s && s.dataset.state === 'error';
}, 20000)));
  };
  // ---- prewarm ----
  C['prewarm'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
key('ArrowDown');
rec('next-on-arrowdown', !!(await waitFor(function () { return cur() === 1; }, 5000)));
// 等防抖(500ms)+解析。cur=1 时渲染窗口只解析到 idx2；idx3 有 urls 只能来自预热
await wait(2500);
var f = feed();
var it3 = f && f.items[3];
rec('prewarm-cur2-resolved', !!(it3 && it3.hasUrls), 'items=' + (f ? f.items.length : 0));
rec('preconnect-injected', !!document.querySelector('link[rel="preconnect"]'));
var st = TEST.getStats();
rec('prewarm-counted', (st.prewarm || 0) >= 1, 'stats=' + JSON.stringify(st));
  };
  // ---- feed-slim（0.9.165 水位：远端置瘦 + slide 占位壳） ----
  // 夹具：harness.html 预处理把 sv mock 克隆到 40 条（feed-slim 专属，meowId 偏移保唯一）
  // ——sv mock 单发全量入库，一次 fetchMore 即得长列表。驱动=两拍真实近跳 + scrollTo 测试
  // 钩子六段跳转（每段窗口新建 3 张 slide、sweep 把 belt 外的换壳 ⇒ 累计 ≥15 壳；远跳走
  // scrollToIndex「先挪游标」路径 + auto 瞬时落位）⇒ cur=35 时 idx<29 全部置瘦
  //（hasUrls=false + feed.slim 计数）、.acsv-slide 收敛 belt 带内。回跳 2 + 两拍 ArrowUp
  //（item0 经「占位壳原位换回 → cur 挂载 → session.start → ensureResolved」重解析恢复）。
  // 驱动注意（实测教训）：连划必须逐拍等 cur 前进——固定短节奏会打断 smooth 滚动，
  // mandatory snap 回吸原条、IO 把 cur 摆回去（fastswipe 不钉 cur 所以暴露不了）。
  // 反跑：slimBehindAt/slideBelt 停用 ⇒ 四组断言全转红
  C['feed-slim'] = async function (h) {
    var rec = h.rec, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, TEST = h.TEST;
rec('slim-first-video', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
key('ArrowDown');
await waitFor(function () { return cur() === 1; }, 8000);
key('ArrowDown');
await waitFor(function () { return cur() === 2; }, 8000);
var stops = [8, 14, 20, 26, 32, 35];
for (var i = 0; i < stops.length; i++) {
  TEST.call('scrollTo', stops[i]);
  await waitFor(function () { return cur() === stops[i]; }, 15000);
}
await wait(600); // 等最后一拍 renderWindow（置瘦+壳回收）收敛
var c = cur(), snap = TEST.call('feed');
var expect = Math.min(c - 30, snap.items.length), slimmed = 0;
snap.items.forEach(function (it, k) { if (k < c - 30 && !it.hasUrls) slimmed++; });
rec('slim-behind-cleared', c >= 31 && slimmed === expect,
  'cur=' + c + ' slimmed=' + slimmed + '/' + expect);
rec('slim-stat-counted', (TEST.getStats()['feed.slim'] || 0) >= expect,
  'stat=' + TEST.getStats()['feed.slim']);
var sc = document.querySelector('.acsv-scroller');
var realN = sc.querySelectorAll('.acsv-slide').length;
var slotN = sc.querySelectorAll('.acsv-slide-slot').length;
rec('slide-count-bounded', realN <= 15, 'slides=' + realN + ' cur=' + c);
rec('slots-exist', slotN >= 15, 'slots=' + slotN);
TEST.call('scrollTo', 2); // 回跳：跨壳反向（占位壳原位换回路径）
await waitFor(function () { return cur() === 2; }, 15000);
key('ArrowUp');
await waitFor(function () { return cur() === 1; }, 8000);
key('ArrowUp');
await waitFor(function () { return cur() === 0; }, 8000);
await wait(1000); // 等 item0 的 resolving → 重解析回填
var back = TEST.call('feed');
rec('slim-reresolve-on-return', !!(back.items[0] && back.items[0].hasUrls),
  'cur=' + cur() + ' it0=' + JSON.stringify(back.items[0])
  + ' 0to5=' + back.items.slice(0, 6).map(function (x) { return x.hasUrls ? 1 : 0; }).join(''));
// 深带两级水位（0.9.213 批⑨）的带边界/不误伤不变式由 feedstore-slim.test.js 直采钉死
//（sv 条目全链路不产 desc，本场景无判据——探针前提不成立，勿在此加 desc 断言）。
  };
})();
