// test/cases/stall.js —— harness 场景：卡帧看门狗与恢复（冻结/慢放/健康/可见性/恢复中划走/转圈归位/CDN 回退/清晰度/上报）
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- stall-frozen ----
  C['stall-frozen'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 模拟缝：过滤看门狗的 rVFC 帧回调，真实 currentTime 照走 → FROZEN 可确定性复现
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
TEST.call('setStallSim', 'frozen');
var okF = await waitFor(function () {
  var s = TEST.getStats();
  // rVFC 饿死的面板（如后台内嵌页）拿不到检测延迟，用 novfc 标记放行
  return s['stall.frozen'] >= 1 && (s['stall.detectLt800'] >= 1 || s['stall.novfc'] >= 1);
}, 8000);
rec('frozen-detected', !!okF, 'stats=' + JSON.stringify(TEST.getStats()));
TEST.call('setStallSim', 'off');
var okBack = await waitFor(function () { return firstVideoReady(0); }, 15000);
rec('recovers-after-sim-off', !!okBack);
  };
  // ---- stall-slow ----
  C['stall-slow'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
// DEGRADED 依赖帧节奏（EMA），rVFC 饿死的面板无法度量——先探针，饿死则诚实跳过
var vfcLive = await new Promise(function (res) {
  var v = slide(0).querySelector('video'), n = 0;
  if (!v || !v.requestVideoFrameCallback) return res(false);
  function tick() { n++; if (n >= 3) return res(true); v.requestVideoFrameCallback(tick); }
  v.requestVideoFrameCallback(tick);
  setTimeout(function () { res(n >= 3); }, 2500);
});
rec('rvfc-live', true, vfcLive ? 'live' : 'skip:rVFC-starved');
if (!vfcLive) { finish(); return; }
TEST.call('setStallSim', 'slow');
var okD = await waitFor(function () {
  return TEST.getStats()['stall.degraded'] >= 1;
}, 12000);
rec('slow-degraded-detected', !!okD, 'stats=' + JSON.stringify(TEST.getStats()));
TEST.call('setStallSim', 'off');
  };
  // ---- stall-healthy ----
  C['stall-healthy'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
await wait(10000); // 正常播放 10s：不允许任何画质损伤；冻结计数有界（后台面板 rVFC 饿死时可能有无害顶针）
var s2 = TEST.getStats();
rec('no-quality-damage', !s2['stall.rung3'] && !s2['stall.rung4'] && !s2['stall.degradeDown'] && !s2['stall.giveup'],
  'stats=' + JSON.stringify(s2));
rec('frozen-bounded', (s2['stall.frozen'] || 0) <= 4, 'frozen=' + (s2['stall.frozen'] || 0));
  };
  // ---- stall-visibility ----
  C['stall-visibility'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 切回标签页基线重建后，冻结检测必须仍然存活（回归：重建后误分类放弃武装→永久失活）
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
TEST.call('setStallSim', 'frozen');
var f1 = 0;
await waitFor(function () { f1 = TEST.getStats()['stall.frozen'] || 0; return f1 >= 1; }, 8000);
// 合成一次可见性变化：监视器会重建基线（mediaT=-1）——这里正是旧实现失活的入口
document.dispatchEvent(new Event('visibilitychange'));
var okV = await waitFor(function () {
  return (TEST.getStats()['stall.frozen'] || 0) >= f1 + 1;
}, 10000);
rec('frozen-detected-after-visibility', !!okV,
  'before=' + f1 + ' after=' + (TEST.getStats()['stall.frozen'] || 0));
TEST.call('setStallSim', 'off');
  };
  // ---- dispose-mid-recovery ----
  C['dispose-mid-recovery'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 恢复进行中划走 2 格：旧会话离开渲染窗口 → 必须 dispose 整体静默
// （监视器停止、无悬挂定时器继续顶针/计数）
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
TEST.call('setStallSim', 'frozen');
await waitFor(function () { return TEST.getStats()['stall.frozen'] >= 1; }, 8000);
var frozenAt = TEST.getStats()['stall.frozen'] || 0;
var d0 = TEST.getStats()['session.dispose'] || 0;
key('ArrowDown'); await wait(300);
key('ArrowDown');
await waitFor(function () { return cur() === 2; }, 5000);
TEST.call('setStallSim', 'off'); // 先关模拟：此后不应再有冻结事件
await wait(3000); // 留足时间暴露悬挂定时器
var s4 = TEST.getStats();
var v2 = slide(2) && slide(2).querySelector('video');
rec('old-session-quiet', (s4['stall.frozen'] || 0) <= frozenAt + 2,
  'frozen ' + frozenAt + '->' + (s4['stall.frozen'] || 0));
rec('session-disposed', (s4['session.dispose'] || 0) > d0, 'dispose ' + d0 + '->' + (s4['session.dispose'] || 0));
rec('next-playing', !!(v2 && !v2.paused && v2.currentTime > 0));
  };
  // ---- spinner-recover ----
  C['spinner-recover'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 冻结恢复的「平滑 seek」边：waiting 打成 loading 后，顶针只引发 seeked 不引发
// playing——画面恢复时转圈必须归位（真机实测回归）
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
var sv0 = slide(0).querySelector('video');
sv0.dispatchEvent(new Event('waiting'));
await wait(500); // 300ms 定时器到点 → 转圈
rec('spinner-on-while-waiting', slide(0).dataset.state === 'loading');
sv0.dispatchEvent(new Event('seeked')); // 顶针恢复：未暂停 + seek 完成
await wait(500);
rec('spinner-cleared-after-seeked', slide(0).dataset.state === 'ready' && !sv0.paused && !sv0.ended);
  };
  // ---- cdn-fallback ----
  C['cdn-fallback'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
var okC = await waitFor(function () { return firstVideoReady(0); }, 30000);
rec('fallback-to-second-cdn', !!okC);
var s3 = TEST.getStats();
rec('cdn-retry-counted', (s3['recover.cdn'] || 0) >= 1, 'stats=' + JSON.stringify(s3));
  };
  // ---- quality-switch ----
  C['quality-switch'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
rec('first-video-playing', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
await wait(1500); // 攒一点进度
var v0 = slide(0).querySelector('video');
var tBefore = v0.currentTime;
var cq = document.querySelectorAll('.acsv-cq');
rec('menus-present', cq.length >= 3, 'cq=' + cq.length); // 清晰度/编码/缓冲
cq[0].click(); // 打开清晰度菜单
var qitems = document.querySelectorAll('.acsv-qitem');
rec('quality-menu-items', qitems.length >= 2, 'n=' + qitems.length);
var d0 = TEST.getStats()['session.dispose'] || 0;
qitems[qitems.length - 1].click(); // 切到第二档
var okQ = await waitFor(function () { return firstVideoReady(0); }, 15000);
rec('playing-after-switch', !!okQ);
// 进度续播是「playing 后 seek 回去」（session.resumeAt）：ready 观测与 seek 落地
// 存在竞态（无头合成器上 seek 排队更晚），立即读会撞上 seek 前的 0.x 秒。
// 暂停钉住自然推进，currentTime 就只剩 seek 一条路径可动——等它落位，确定性判定
var v1 = slide(0).querySelector('video');
if (v1) v1.pause();
rec('progress-kept', !!(v1 && (await waitFor(function () {
  return v1.currentTime >= tBefore - 0.6;
}, 5000))),
  'before=' + tBefore.toFixed(1) + ' after=' + (v1 ? v1.currentTime.toFixed(1) : '-'));
rec('session-recreated', (TEST.getStats()['session.dispose'] || 0) > d0);
// 0.9.45 切档同步前向邻居：预挂 slide1 重选档重建（dispose 计数 +2：slide0+slide1），
// prewarm 已解析的 items[1]/[2] 重选档跟随新偏好——不再「隔一两个视频才生效」
rec('session-fwd-rebuilt', (TEST.getStats()['session.dispose'] || 0) >= d0 + 2,
  'dispose=' + (TEST.getStats()['session.dispose'] || 0) + ' d0=' + d0);
var fs = feed();
rec('fwd-neighbor-qsync', !!fs && fs.items.length > 2
  && fs.items[1].qIdx === fs.items[0].qIdx && fs.items[2].qIdx === fs.items[0].qIdx,
  'qIdx=' + (fs ? fs.items.slice(0, 3).map(function (x) { return x.qIdx; }).join(',') : '-'));
rec('fwd-neighbor-label', !!fs && fs.items.length > 2
  && fs.items[1].qLabel === fs.items[0].qLabel && fs.items[2].qLabel === fs.items[0].qLabel,
  'label=' + (fs ? fs.items.slice(0, 3).map(function (x) { return x.qLabel; }).join('|') : '-'));
  };
  // ---- watch-report ----
  C['watch-report'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 观看历史上报（home 源）：离开（划走/关页）时上报最终进度。
// 覆盖：≥门槛才报、payload 参数、暂停即报（0.9.86 官方对齐）、pagehide 兜底、
// 同秒位去重、门槛拦截、live 路径无单调守卫（低秒位如实重报的防修哨兵）。
// 上报链只读离开时刻 currentTime，不依赖播放态——autoplay 被环境拦截也能验证
function videoReady(i) {
  var s = slide(i), v = s && s.querySelector('video');
  return !!(s && v && v.duration > 0 && s.dataset.state !== 'error');
}
async function playUntil(i, minT) { // 真实播放攒进度（IAB 的 seekable 在激活播放前不展开，seek 不可靠）
  return !!(await waitFor(function () {
    var v = slide(i) && slide(i).querySelector('video');
    if (!v || !(v.duration > 0)) return false;
    if (v.paused && v.play) { try { v.play().catch(function () { }); } catch (e) { } }
    return v.currentTime >= minT;
  }, 20000));
}
function pauseAt(i) { // 冻结进度供精确断言
  var v = slide(i) && slide(i).querySelector('video');
  if (v) v.pause();
  return v ? v.currentTime : 0;
}
function watchCount() { return TEST.getStats()['report-watch'] || 0; }
rec('first-media-ready', !!(await waitFor(function () { return videoReady(0); }, 25000)));
if (!!(await playUntil(0, 3.2))) {
  var t0 = pauseAt(0);
  var want0 = Math.floor(t0);
  rec('playback-progress', want0 >= 3, 't=' + t0.toFixed(2));
  // 0.9.86 官方对齐：暂停即报当前位（官方 video 页实测语义）
  var cp = watchCount();
  rec('pause-reported', !!(await waitFor(function () { return watchCount() > cp; }, 5000)));
  var last = window.__WL_CALLS[window.__WL_CALLS.length - 1] || {};
  var rp = last.payload || null;
  rec('report-payload', last.channel === 'CLICK' && !!rp
    && rp.action === 'CLIENT_BROWSE_HISTORY' && rp.params
    && rp.params.playedSeconds === want0 && rp.params.resourceType === 'video'
    && rp.params.bangumiItemId === null
    && !!rp.params.ac_id && !!rp.params.atom_id,
    'want=' + want0 + ' got=' + JSON.stringify(rp && rp.params || null));
  // 划走（setActive 离开上报）：同一秒位 → 去重不重发（进度未推进）
  var c0 = watchCount();
  key('ArrowDown');
  rec('swipe-same-sec-deduped', watchCount() === c0, 'watch=' + watchCount());
  // pagehide 兜底（竖刷路径）：播放中直接合成 pagehide → 报 live 秒位（idx1 此前未报过）
  var c1 = watchCount();
  var play1 = !!(await playUntil(1, 3.2));
  window.dispatchEvent(new Event('pagehide'));
  rec('pagehide-reported', play1 && watchCount() > c1, 'play=' + play1 + ' watch=' + watchCount());
  // 同秒位去重：暂停报当前位 → 后续 pagehide 进度未推进不重发
  pauseAt(1);
  await waitFor(function () { return watchCount() > c1 + 1; }, 5000); // pause 即报（idx1）
  var c1b = watchCount();
  window.dispatchEvent(new Event('pagehide'));
  rec('pagehide-same-sec-deduped', watchCount() === c1b, 'watch=' + watchCount());
  window.dispatchEvent(new Event('pagehide'));
  rec('same-second-deduped', watchCount() === c1b, 'watch=' + watchCount());
  // 门槛：idx2 播放不足 3s 即划走语义（pause 冻结在小进度），pagehide 不得上报
  key('ArrowDown');
  await waitFor(function () { return cur() === 2; }, 5000);
  await waitFor(function () { return videoReady(2); }, 25000);
  await playUntil(2, 0.8);
  var t2 = pauseAt(2);
  var c2 = watchCount();
  window.dispatchEvent(new Event('pagehide'));
  await wait(400);
  rec('below-floor-skipped', watchCount() === c2 && t2 < 3,
    't2=' + t2.toFixed(2) + ' watch=' + watchCount());
  // 防修哨兵（0.9.86 单调性不对称）：高秒位已报（pause 即报）→ 回拉到 3.2 重看再暂停 →
  // 必须如实发低秒位。live 路径镜像官方语义（重看回退=历史回退），**别把它修成单调的**——
  // 单调守卫只属于 0.9.87 账本补报（死会话）
  var v2 = slide(2) && slide(2).querySelector('video');
  var dur = v2 ? v2.duration : 0;
  rec('duration-known', dur >= 4.5, 'dur=' + dur);
  var hiT = Math.max(4.05, dur * 0.8); // 测试片 loop=true 会回绕：高水位 ≥4.05 且 < 时长（防回绕永不满足）
  rec('replay-progress', !!(await playUntil(2, hiT)));
  pauseAt(2); // pause 即报高秒位（≥hiT）
  await waitFor(function () { return watchCount() > c2; }, 5000);
  var hi = Math.floor(v2.currentTime);
  v2.play();
  await wait(150);
  v2.currentTime = 3.2; // 回拉重看
  await wait(300);
  var cLow = watchCount();
  pauseAt(2); // 再暂停 → 报当前位 3 < hi
  rec('low-sec-live-reported', !!(await waitFor(function () { return watchCount() > cLow; }, 5000)), 'hi=' + hi);
  var lp = (window.__WL_CALLS[window.__WL_CALLS.length - 1] || {}).payload || null;
  rec('low-sec-live-value', !!lp && lp.params && lp.params.playedSeconds === 3 && hi > 3,
    'hi=' + hi + ' got=' + JSON.stringify(lp && lp.params || null));
} else {
  rec('playback-progress', false);
}
  };
})();
