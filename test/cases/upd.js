// test/cases/upd.js —— harness 场景：更新提示四相位
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- upd-open ----
  C['upd-open'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 更新提示冒烟（0.9.60）：走真实 mount→releaseCheck 链路，__ACSV_MOCK_RELEASE__
// 注入绕过 GM 依赖与 60s 节流。版本号从 debug 产物头正则自取——不硬编码，升版本不假红
var upVer = '';
try {
  var upSrc = await (await fetch('../acfun-svfeed.debug.user.js')).text();
  upVer = ((upSrc.match(/@version\s+(\S+)/) || [])[1] || '').replace(/-debug$/, '');
} catch (e) { }
rec('version-detected', !!upVer, upVer);
if (!upVer) { finish(); return; }
var UPD_LS = 'acsv-upd-v1';
function updRead() {
  try { return JSON.parse(localStorage.getItem(UPD_LS) || '{}') || {}; } catch (e) { return {}; }
}
function updSeed(obj) { localStorage.setItem(UPD_LS, JSON.stringify(obj)); }
// content 是 XML 转义后的官方渲染 HTML（GitHub atom 形态）
var UPD_BODY = '&lt;h2&gt;更新内容&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;条目一&lt;/li&gt;&lt;li&gt;条目二&lt;/li&gt;&lt;/ul&gt;';
function updAtom(tag, title) {
  return '<feed><entry>'
    + '<id>tag:github.com,2008:Repository/1/' + tag + '</id>'
    + '<link rel="alternate" type="text/html" href="https://github.com/name-xxl/acfun-svfeed/releases/tag/' + tag + '"/>'
    + '<title>' + (title || tag) + '</title>'
    + '<content type="html">' + UPD_BODY + '</content>'
    + '</entry></feed>';
}
var remountFails = 0;
var remountMaxMs = 0;
var remountNote = ''; // 失败/最慢那轮的分解（unmount/mount 各自耗时与失守步）
async function remountStep(fn, tag, note) { // 每步允许重试一次：全量跑尾部负载抖动（实测偶发一步 >15s，
                                 // 真机同路径 3.5s 内完成）与真卡死分开——两步都超窗才计数
  var t = performance.now();
  if (await waitFor(fn, 15000)) { note[tag] = Math.round(performance.now() - t); return true; }
  if (await waitFor(fn, 15000)) { note[tag] = Math.round(performance.now() - t); return true; }
  note[tag] = 'FAIL@' + location.hash;
  return false;
}
async function remount() { // 模拟用户退出再进竖刷页（unmount→mount 全链）。窗宽与计数：
                          // 静默超时会让后续断言指向错误对象（全量跑踩实——unmount 超窗时
                          // 相位②整体空转，弹窗直到下一次 remount 才出现，报错全落在错的地方）
  var t0 = performance.now();
  var note = {};
  // 越窗守卫（0.9.95 根因）：竖刷自己的地址栏回写 syncHash 是 150ms 尾节流——若它在本步
  // 之后落地，会把 'upd-off' 改回 '#svfeed/v/<id>'，toggle 判定仍在竖刷路由 → 当场重挂，
  // unmount 永远等不到 root 消失（实测失败时 note 里的 hash 正是深层链接形态，0.9.82 起
  // 断续复现的那条「负载抖动」真身）。先越窗再翻 hash（同族断言早有的惰性等 400ms 同款）
  await wait(400);
  location.hash = 'upd-off';
  if (!(await remountStep(function () { return !document.getElementById('acsv-root'); }, 'unmount', note))) remountFails++;
  location.hash = 'svfeed';
  if (!(await remountStep(function () { return document.getElementById('acsv-root'); }, 'mount', note))) remountFails++;
  var ms = Math.round(performance.now() - t0);
  remountMaxMs = Math.max(remountMaxMs, ms);
  if (remountFails || ms > 15000) remountNote = JSON.stringify(note) + ' total=' + ms;
}
function updModal() { return document.querySelector('.acsv-upd'); }
function updDot() { return document.querySelector('.acsv-upd-dot'); }
function updActBtn(text) {
  return [].filter.call(document.querySelectorAll('.acsv-upd-act'), function (x) {
    return x.textContent === text;
  })[0] || null;
}

// ① 已更新：seen 落旧版 + mock latest=当前 → 弹「vX 更新内容」、官方 HTML 真渲染、seen 落盘
updSeed({ seen: '0.0.1' });
window.__ACSV_MOCK_RELEASE__ = updAtom('v' + upVer, upVer);
await remount();
rec('updated-modal', !!(await waitFor(function () {
  return updModal() && updModal().querySelector('.acsv-upd-md');
}, 8000)));
rec('updated-title', !!updModal() && updModal().querySelector('.acsv-upd-h1').textContent === 'v' + upVer + ' 更新内容',
  updModal() ? updModal().querySelector('.acsv-upd-h1').textContent : '-');
rec('updated-rich', !!updModal() && updModal().querySelectorAll('.acsv-upd-md li').length === 2);
rec('seen-written', updRead().seen === upVer, JSON.stringify(updRead()));
var updX = updModal() && updModal().querySelector('.acsv-upd-x');
if (updX) updX.click();
rec('updated-closed', !!(await waitFor(function () { return !updModal(); }, 3000)));

// ② 发现新版本：seen=当前 + latest=99.0.0 → 弹窗+红点；忽略后写 ignored、重开静默、红点灭
updSeed({ seen: upVer });
window.__ACSV_MOCK_RELEASE__ = updAtom('v99.0.0');
await remount();
rec('available-modal', !!(await waitFor(function () {
  return updModal() && updModal().querySelector('.acsv-upd-md');
}, 8000)));
rec('available-title', !!updModal() && updModal().querySelector('.acsv-upd-h1').textContent === '发现新版本 v99.0.0',
  updModal() ? updModal().querySelector('.acsv-upd-h1').textContent : '-');
rec('available-sub', !!updModal() && updModal().querySelector('.acsv-upd-sub').textContent === '当前 v' + upVer);
rec('dot-on', !!updModal() && !!updDot() && updDot().style.display !== 'none');
var ig = updActBtn('忽略此版本');
if (ig) ig.click();
rec('ignored-written', !!(await waitFor(function () { return updRead().ignored === '99.0.0'; }, 3000)),
  JSON.stringify(updRead()));
rec('dot-off-after-ignore', !!updDot() && updDot().style.display === 'none');
await remount();
await wait(1500);
rec('ignored-silent', !updModal());

// ③ 已提醒过：只出 toast 轻提醒（红点仍亮），不再弹窗
updSeed({ seen: upVer, notified: '99.0.0' });
await remount();
rec('toast-only', !!(await waitFor(function () {
  var t = document.querySelector('.acsv-toast.show');
  return t && /发现新版本/.test(t.textContent) && !updModal();
}, 5000)));
rec('dot-still-on', !!updDot() && updDot().style.display !== 'none');

// ④ 手动入口：点顶栏更新按钮 → 加载中态被官方 HTML 内容替换
window.__ACSV_MOCK_RELEASE__ = updAtom('v' + upVer, upVer);
updSeed({ seen: upVer });
await remount();
await wait(1200); // 自动检查走 none 分支，不弹窗
rec('no-auto-modal', !updModal());
var ub = document.querySelector('.acsv-upd-btn');
if (ub) ub.click();
rec('manual-opens', !!(await waitFor(function () {
  return updModal() && updModal().querySelector('.acsv-upd-md');
}, 8000)));
var ubx = updModal() && updModal().querySelector('.acsv-upd-x');
if (ubx) ubx.click();
// remount 全链健康（4 次 unmount→mount 无静默超时）+ 最慢一轮耗时（超窗预警）
rec('remount-ok', remountFails === 0, 'fails=' + remountFails + ' maxMs=' + remountMaxMs
  + (remountNote ? ' note=' + remountNote : ''));
  };
})();
