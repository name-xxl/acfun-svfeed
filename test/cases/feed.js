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
  };
})();
