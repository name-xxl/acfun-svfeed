// test/cases/play.js —— harness 场景：播放层（深链热路径/直达冷路径）
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- play-deep ----
  C['play-deep'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 播放层深链（0.9.74）：地址栏直达 = 视图内自解析（不 reset 竖刷流、不切源）；坏形态
// 出"链接不完整"；解析未命中出错误盒+重试；层内切清晰度不得污染竖刷邻居
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
window.__ACSV_MOCK_DIRECT__ = { '488900': 1 }; // 直挂缝：webm 套 hls.js 会死在解析上
rec('play-feed-up', !!(await waitFor(function () { return feed() && feed().items.length > 0; }, 15000)));
var bufA = feed().items.length, curA = feed().current;
location.hash = 'svfeed/play/a/488900'; // 冷进入（等价分享链接/刷新回放）
rec('play-open', !!(await waitFor(function () {
  return !!q('.acsv-slide[data-ovl="1"]');
}, 10000)), location.hash);
rec('play-playing', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return !!v && !v.paused && v.currentTime > 0;
}, 25000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return 'state=' + (s && s.dataset.state) + ' paused=' + (v && v.paused);
})());
rec('play-title', !!(await waitFor(function () {
  var t = q('.acsv-slide[data-ovl="1"] .acsv-title');
  return !!t && /测试视频488900/.test(t.textContent); // 深链解析回包带标题（douga/info）
}, 8000)), (q('.acsv-slide[data-ovl="1"] .acsv-title') || {}).textContent);
rec('play-no-arrows', !q('.acsv-slide[data-ovl="1"] .acsv-arrows'));
rec('play-source-kept', (function () { // 不 setSource：播放解析与内容源无关
  var b = q('.acsv-seg-btn.on');
  return !!b && b.textContent === '小视频';
})());
rec('play-feed-untouched', feed().items.length === bufA && feed().current === curA,
  'items=' + feed().items.length + '/' + bufA + ' cur=' + feed().current + '/' + curA);
// 顶栏：深界面出「向左返回」（顶栏左缘，样式同右组）；✕ 收回单一意义=退出脚本
rec('play-backbtn-shown', (function () {
  var b = q('.acsv-back-btn');
  return !!b && b.style.display !== 'none' && b.offsetParent !== null;
})());
rec('play-backbtn-nopill', (function () { // 左键与居中搜索框不得压在一起
  var b = q('.acsv-back-btn'), p = q('.acsv-top .acsv-sbox');
  if (!b || !p) return false;
  return b.getBoundingClientRect().right <= p.getBoundingClientRect().left + 1;
})());
rec('play-x-single', (q('.acsv-top-right .acsv-tbtn:last-child') || {}).title === '退出');
// 层内切清晰度：竖刷邻居 qIdx 必须零污染（syncFwdQuality 的 data-ovl 守卫——
// 少了它 OVL_IDX+1 会打到竖刷第 0 条，把背后邻居重挂一遍）
var qBefore = feed().items.map(function (x) { return x.qIdx; }).join(',');
var cq = document.querySelectorAll('.acsv-slide[data-ovl="1"] .acsv-cq');
if (cq.length) cq[0].click();
var qi = document.querySelectorAll('.acsv-qitem');
rec('play-quality-menu', qi.length >= 2, 'cq=' + cq.length + ' items=' + qi.length);
if (qi.length > 1) qi[qi.length - 1].click();
await wait(800);
rec('play-quality-isolated', qi.length > 1
  && feed().items.map(function (x) { return x.qIdx; }).join(',') === qBefore,
  'before=' + qBefore + ' after=' + feed().items.map(function (x) { return x.qIdx; }).join(','));
var backEl = q('.acsv-back-btn'); // 顶栏「向左返回」=回来源（此例来源是竖刷）
if (backEl) backEl.click();
rec('play-back', !!(await waitFor(function () {
  return location.hash === '#svfeed' && q('.acsv-slide[data-ovl="1"]') === null;
}, 8000)), location.hash);
rec('play-backbtn-hidden-feed', (function () {
  var b = q('.acsv-back-btn');
  return !!b && b.style.display === 'none';
})());
rec('play-x-feed', (q('.acsv-top-right .acsv-tbtn:last-child') || {}).title === '退出（Esc）');
// 键盘重定向（0.9.74）：媒体键打层内那条，导航键与竖刷一动不能动（幽灵音频防线）
location.hash = 'svfeed/play/a/488900';
rec('play-open2', !!(await waitFor(function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return !!v && !v.paused && v.currentTime > 0;
}, 20000)));
var curBeforeKey = feed().current;
key('ArrowDown');
await wait(300);
rec('play-key-nonav', feed().current === curBeforeKey, 'cur=' + feed().current + '/' + curBeforeKey);
var vk = q('.acsv-slide[data-ovl="1"] video');
var m0 = vk && vk.muted;
key('m');
rec('play-key-mute', !!(await waitFor(function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return !!v && v.muted !== m0;
}, 5000)));
rec('play-key-no-ghost', (function () {
  var vs = document.querySelectorAll('.acsv-scroller video');
  for (var i = 0; i < vs.length; i++) if (!vs[i].paused) return false;
  return true;
})());
// i 键在播放层不被吞（0.9.75）：未登录出提示、层内视频不受影响
key('i');
rec('play-i-not-swallowed', !!(await waitFor(function () {
  return /私信需要先登录/.test((q('.acsv-toast') || {}).textContent || '');
}, 4000)), (q('.acsv-toast') || {}).textContent || '');
rec('play-i-layer-kept', (function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return !!v && !v.paused;
})());
key('c'); // 层内评论开合（0.9.74）：必须打层内那条，不是竖刷当前条
rec('play-key-comments', !!(await waitFor(function () {
  var r = q('#acsv-root'), d = q('.acsv-drawer'), cs = TEST.call('comments');
  return !!r && r.classList.contains('acsv-with-comments') && !!d && d.classList.contains('open')
    && !!cs && String(cs.sourceId) === '488900';
}, 6000)), JSON.stringify(TEST.call('comments')));
key('c');
rec('play-key-comments-close', !!(await waitFor(function () {
  var r = q('#acsv-root');
  return !!r && !r.classList.contains('acsv-with-comments');
}, 6000)));
key('Escape');
rec('play-esc-back', !!(await waitFor(function () {
  return location.hash === '#svfeed' && q('.acsv-slide[data-ovl="1"]') === null;
}, 8000)), location.hash);
// 坏形态：缺 id → 视图内错误态（不静默）
location.hash = 'svfeed/play';
rec('play-badform', !!(await waitFor(function () {
  var v = q('.acsv-view');
  return !!v && /链接不完整/.test(v.textContent);
}, 8000)));
rec('play-badform-visible', (function () { // 0.9.77：错误态必须真在屏（0.9.63 黑屏同型防线）
  var v = q('.acsv-view');
  return !!v && v.offsetParent !== null;
})());
// 未命中：douga/info 回 result≠0 → 错误盒 + 重试
window.__ACSV_MOCK_FORM__ = { 'douga/info': function () { return { result: 1 }; } };
window.__ACSV_MOCK_DIRECT__ = {};
location.hash = 'svfeed/play/a/999999999';
rec('play-miss-errbox', !!(await waitFor(function () {
  var v = q('.acsv-view');
  return !!v && /视频加载失败/.test(v.textContent);
}, 12000)));
rec('play-miss-retry', !!q('.acsv-view .acsv-retry'));
rec('play-miss-errbox-visible', (function () { // 错误盒是全幅遮罩，必须真在屏且可点
  var eb = q('.acsv-view .acsv-errbox');
  return !!eb && eb.offsetParent !== null && eb.getBoundingClientRect().height > 0;
})());
// 重试链（0.9.77）：失败重试不叠盒（旧实现按钮挂盒外、盒体不清 → 每失败一次叠一盒）；
// 恢复 mock 后重试 → 错误盒整只撤除且层内真起播（旧实现成功后错误文案仍常驻遮罩）。
// 计数必须限定「正文直接子级」——slide 自带一只隐藏的 .acsv-errbox（buildSlide），
// 层内起播后被它污染计数会假红（.acsv-vbody-play 的直接子盒才是加载错误盒）
function playErrBoxes() {
  var b = q('.acsv-view-body.acsv-vbody-play');
  return b ? b.querySelectorAll(':scope > .acsv-errbox') : [];
}
function playSpin() {
  var b = q('.acsv-view-body.acsv-vbody-play');
  return b ? b.querySelectorAll(':scope > .acsv-spinner').length : -1;
}
q('.acsv-view .acsv-retry').click();
rec('play-retry-no-stack', !!(await waitFor(function () {
  var v = q('.acsv-view');
  return !!v && playErrBoxes().length === 1 && /视频加载失败/.test(v.textContent);
}, 12000)), 'errboxes=' + playErrBoxes().length);
// 恢复解析链（mock 回正常 shape + 直挂缝：webm 套 hls.js 会死在解析上，见本场景开局）
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
window.__ACSV_MOCK_DIRECT__ = { '999999999': 1 };
q('.acsv-view .acsv-retry').click();
rec('play-retry-recovers', !!(await waitFor(function () {
  return playErrBoxes().length === 0 && playSpin() === 0;
}, 12000)), 'errboxes=' + playErrBoxes().length + ' spin=' + playSpin());
rec('play-retry-playing', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return !!v && !v.paused && v.currentTime > 0;
}, 25000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return 'state=' + (s && s.dataset.state) + ' paused=' + (v && v.paused);
})());
key('Escape');
rec('play-miss-back', !!(await waitFor(function () { return location.hash === '#svfeed'; }, 8000)), location.hash);
  };
  // ---- play-cold ----
  C['play-cold'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 播放层直达（0.9.79）：分享链接冷启动 = 层内自解析起播，**不预热后台竖刷**（层里根本
// 不看它，白拉一屏请求 + 后台缓冲一屏视频）；离开层回舞台那一刻才补拉首屏。
// 热路径（feed 已加载）的层内播放由 play-deep 覆盖
rec('cold-layer-playing', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return !!v && !v.paused && v.currentTime > 0;
}, 25000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  return 'state=' + (s && s.dataset.state);
})());
rec('cold-feed-not-warmed', !!feed() && feed().items.length === 0,
  'items=' + (feed() ? feed().items.length : 'n/a'));
rec('cold-feed-no-video', document.querySelectorAll('.acsv-scroller video').length === 0,
  'vids=' + document.querySelectorAll('.acsv-scroller video').length);
key('Escape'); // 层内 Esc → 回来源（本例来源=竖刷）→ 补拉首屏
rec('cold-back-feed', !!(await waitFor(function () {
  return location.hash === '#svfeed' && q('.acsv-slide[data-ovl="1"]') === null;
}, 8000)), location.hash);
rec('cold-feed-loaded', !!(await waitFor(function () {
  return feed() && feed().items.length > 0;
}, 15000)), 'items=' + (feed() ? feed().items.length : 'n/a'));
rec('cold-feed-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  };
})();
