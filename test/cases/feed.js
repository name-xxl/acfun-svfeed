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
key('Escape');
rec('esc-exits', !!(await waitFor(function () { return !document.getElementById('acsv-root'); }, 5000)));
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
})();
