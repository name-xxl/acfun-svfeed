// test/cases/views.js —— harness 场景：子视图（我的/榜单/搜索/封面策略/私信抽屉避让宽窄两态）
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- view-my ----
  C['view-my'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 我的视图冒烟（0.9.62 起；0.9.69 抖音式改造：资料头/Tab 惰性/网格卡/骨架/chips 顺序）：
// hash 子路由进出 + postForm mock 缝（__ACSV_MOCK_FORM__）+ panelItem 契约过滤
// （坏例条目不渲染）+ 条目点击回竖刷插入播放（resolve 链走 mock）
document.cookie = 'auth_key=42_deadbeef'; // ui.selfUid：auth_key 前缀=uid
window.__ACSV_CARD_CALLS__ = 0;
window.__ACSV_HIST_CALLS__ = 0;
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
// 播放层条目直挂缝（webm 套 hls 会死在解析）。0.9.82 起值可为对象 {id,name,head,delay}：
// 连带模拟 douga/info 回包的作者部分（真实回包走 user.headUrl，见 my-sample 的实测形状）。
// delay 模拟网络往返，让"面板首帧的作者 → 回包后被详情覆写"这条状态转移真能被观测到
// （否则整条 resolve 链全是微任务，首帧态在测试里抓不住）。回包作者名与头像都刻意不同于
// 面板层（历史=历史UP/PANEL、收藏=收藏UP/PANEL），三路的"回包覆写"断言才能同形
window.__ACSV_MOCK_DIRECT__ = {
  '488900': { id: 9, name: '测试UP', head: window.__ACSV_RESOLVE_AVATAR__, delay: 700 },
  '489100': { id: 9, name: '测试UP', head: window.__ACSV_RESOLVE_AVATAR__, delay: 700 }
};
location.hash = 'svfeed/my';
// 可见性断言一律查真实渲染态 offsetParent（0.9.62 黑屏教训：内联 '' 回落样式表
// display:none，查内联值的断言被骗全绿）
rec('view-open', !!(await waitFor(function () {
  var v = q('.acsv-view');
  return v && v.offsetParent !== null; // 0.9.71 起视图头无标题字（dock 选中态为身份锚），下面 dock-highlight 断言之
}, 10000)));
topbarInView('my'); // 0.9.73：共享顶栏在视图态复用（可见/层级/seg 隐藏/视图头已删/正文不钻栏下）
rec('dock-highlight', !!(await waitFor(function () {
  var b = q('.acsv-dock-item[data-view="my"]');
  return b && b.classList.contains('on');
}, 3000)));
rec('scroller-hidden', q('.acsv-scroller').style.display === 'none');
// 资料头：昵称 + 关注/粉丝/投稿三数 + UID（契约 meCardOf 落位）
rec('me-card', !!(await waitFor(function () {
  var n = q('.acsv-mecard-name'), st = q('.acsv-mecard-stats');
  return n && n.textContent === '测试用户' && st && /34/.test(st.textContent)
    && /56/.test(st.textContent) && /12/.test(st.textContent);
}, 8000)));
rec('me-card-id-sign', /UID：42/.test((q('.acsv-mecard-id') || {}).textContent || '')
  && (q('.acsv-mecard-sign') || {}).textContent === '签名第一行 第二行');
// 网格卡：历史首屏 18 条；骨架已清（独立类名，绝不与卡片计数选择器同构）
rec('hist-cards', !!(await waitFor(function () {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  var bad = [].some.call(cells, function (r) { return /应被过滤/.test(r.textContent); });
  return cells.length === 18 && !bad;
}, 8000)));
rec('skeleton-gone', document.querySelectorAll('.acsv-gskel').length === 0);
rec('hist-tag', /观看至01:4/.test((q('.acsv-vlist.hist .acsv-gtag') || {}).textContent || ''));
// 时间文案的年份判定（0.9.85）：首条是"5 分钟前"（三天内走相对文案），第 2 条夹具给了 10 天前
// → 必须退回**带年份**的绝对日期（relTime 的"更早"档只写「M月D日 H时MM分」，老内容看不出年份）
rec('hist-card-time-year', (function () {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  var tm = cells[1] && cells[1].querySelector('.acsv-gtime');
  return !!tm && /^\d{4}-\d{2}-\d{2}$/.test(tm.textContent);
})(), (function () {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  var tm = cells[1] && cells[1].querySelector('.acsv-gtime');
  return tm ? tm.textContent : 'n/a';
})());
// 卡面收口（0.9.84）：历史条目**也带作者**——histories[].user 与 douga/info 的 user 同形状
// （真机实测见 my-sample 夹具），所以历史卡与收藏卡同构：进度只占封面角标、作者只占脚行。
// 同时钉"同名文本只能画一次"（0.9.83 那两类重复的机器闸门）
rec('hist-card-composition', (function () {
  var c = q('.acsv-vlist.hist .acsv-gcell');
  if (!c) return false;
  var foot = c.querySelector('.acsv-gfoot');
  var tm = c.querySelector('.acsv-gtime');
  return !!c.querySelector('.acsv-gtag') && !c.querySelector('.acsv-gmeta')
    && !!foot && /^@历史UP/.test(foot.textContent)
    && (c.textContent.match(/历史UP/g) || []).length === 1
    // 脚行右槽 = 观看时间（browseTime 毫秒时间戳 → 相对文案；夹具给的是"5 分钟前"那条）
    && !!tm && /分钟前$/.test(tm.textContent);
})(), (function () {
  var c = q('.acsv-vlist.hist .acsv-gcell');
  if (!c) return 'no-cell';
  var foot = c.querySelector('.acsv-gfoot');
  return 'gfoot=' + JSON.stringify((foot || {}).textContent)
    + ' gtag=' + JSON.stringify(((c.querySelector('.acsv-gtag') || {}).textContent))
    + ' count=' + ((c.textContent.match(/历史UP/g) || []).length);
})());
// 封面比例 4:3（A 站普通视频封面固定 4:3，只有小视频是 3:4）：历史/收藏条目经契约层
// 过滤后全是普通视频，卡面套 3:4 会把封面左右各裁掉一大块（连标题字都被切）。钉住防回归
rec('cover-ratio-4x3', (function () {
  var c = q('.acsv-vlist.hist .acsv-gcell .acsv-gcover');
  if (!c) return false;
  var r = c.getBoundingClientRect();
  return r.height > 0 && Math.abs(r.width / r.height - 4 / 3) < 0.05;
})(), (function () {
  var c = q('.acsv-vlist.hist .acsv-gcell .acsv-gcover');
  if (!c) return 'n/a';
  var r = c.getBoundingClientRect();
  return 'w/h=' + (r.height ? (r.width / r.height).toFixed(3) : '0');
})());
// 脚行钉卡底（0.9.90）：网格行内所有卡等高（grid stretch），脚行须 margin-top:auto 钉到卡底——
// 否则单行标题的卡富余空间落在脚行下方，脚注悬在半空、与双行标题的邻居错位（真机截图实证：
// 同一行三张卡，单行标题那张的 @作者/时间 比邻居高约 28px）。夹具里第 2 条是双行长标题
// （my-sample.js），首行单双行共存——不这样断言会在"全单行"的行里假绿
rec('card-foot-pinned', (function () {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  var checked = 0, bad = 0;
  for (var i = 0; i < cells.length; i++) {
    var foot = cells[i].querySelector('.acsv-gfoot');
    if (!foot) continue; // 无脚行的卡（作者与时间双缺的降级条目）不参与
    checked++;
    var gap = cells[i].getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom;
    if (gap > 1) bad++;
  }
  return checked > 0 && bad === 0;
})(), (function () {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  var maxGap = 0, lines = [];
  for (var i = 0; i < Math.min(cells.length, 6); i++) {
    var foot = cells[i].querySelector('.acsv-gfoot');
    var t = cells[i].querySelector('.acsv-gtitle');
    if (!foot) continue;
    var gap = Math.round(cells[i].getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom);
    if (gap > maxGap) maxGap = gap;
    lines.push('#' + i + ' gap=' + gap + (t ? ('/' + Math.round(t.getBoundingClientRect().height)) : ''));
  }
  return 'maxGap=' + maxGap + ' ' + lines.join(' ');
})());
// 面板无横向溢出（网格 minmax 自适应，宽窄都不撑破容器）
rec('no-overflow', (function () {
  var b = q('.acsv-view-body');
  return !!b && b.scrollWidth <= b.clientWidth + 1;
})());
var histMore = q('.acsv-mepanel[data-tab="hist"] .acsv-vmore');
rec('hist-more-visible', !!histMore && histMore.style.display !== 'none');
if (histMore) histMore.click();
rec('hist-page2', !!(await waitFor(function () {
  return document.querySelectorAll('.acsv-vlist.hist .acsv-gcell').length === 22;
}, 8000)));
// Tab 惰性：未激活的收藏夹不拉接口（0 卡）→ 点击后才建面板
rec('fav-tab-lazy', document.querySelectorAll('.acsv-vlist.fav .acsv-gcell').length === 0);
var tabFav = q('.acsv-metab[data-tab="fav"]');
if (tabFav) tabFav.click();
rec('fav-open', !!(await waitFor(function () {
  var p = q('.acsv-mepanel[data-tab="fav"]');
  return p && p.style.display !== 'none';
}, 3000)));
rec('fav-default-rows', !!(await waitFor(function () {
  var cells = document.querySelectorAll('.acsv-vlist.fav .acsv-gcell');
  return cells.length === 2 && /测试收藏视频0/.test(cells[0].textContent);
}, 8000)));
// 卡面收口（0.9.83）：三种来源共用一张 gridCardOf，作者唯一落点=脚行、进度唯一落点=封面角标。
// 这里钉的是"同名文本只能画一次"——0.9.82 收藏卡曾出现「石悦 / @石悦」（meta+脚行）与
// 「看到xx:xx」两遍（角标+meta），两类重复都是同一根因：卡面元素没有单一归属
function cardTexts(cell) {
  return {
    name: (cell.textContent.match(/收藏UP/g) || []).length,
    seen: (cell.textContent.match(/看到/g) || []).length,
    gmeta: !!cell.querySelector('.acsv-gmeta'),
    gfoot: cell.querySelector('.acsv-gfoot'),
    gtag: cell.querySelector('.acsv-gtag')
  };
}
rec('fav-card-composition', (function () {
  var c = q('.acsv-vlist.fav .acsv-gcell');
  if (!c) return false;
  var t = cardTexts(c);
  var tm = c.querySelector('.acsv-gtime');
  // 收藏条目夹具带 userPlayedSeconds（progress 非空）→ 角标应出「看到 01:05」；作者只在脚行；
  // 右槽出稿件**上传时刻**的带年份日期（夹具是真机实测值 2026-09-26；updateTime 那栏是"1 分钟前"
  // 的诱饵——若实现误用 updateTime，这里会看到「分钟前」而不是日期）
  return t.name === 1 && t.seen === 1 && !t.gmeta
    && !!t.gfoot && /^@收藏UP/.test(t.gfoot.textContent)
    && !!t.gtag && /^看到 /.test(t.gtag.textContent)
    && !!tm && tm.textContent === '2026-09-26';
})(), (function () {
  var c = q('.acsv-vlist.fav .acsv-gcell');
  if (!c) return 'no-cell';
  var t = cardTexts(c);
  return 'name=' + t.name + ' seen=' + t.seen + ' gmeta=' + t.gmeta
    + ' gfoot=' + JSON.stringify((t.gfoot || {}).textContent) + ' gtag=' + JSON.stringify((t.gtag || {}).textContent)
    + ' gtime=' + JSON.stringify(((c.querySelector('.acsv-gtime') || {}).textContent));
})());
// chips 顺序（0.9.69 修）：夹位选择器必须在**列表之上**（几何比较——原先
// insertBefore(chips, btn) 落在列表下方，真机实测 favRow0 y=833 < chips y=997）
rec('fav-chips-above', (function () {
  var chips = q('.acsv-mepanel[data-tab="fav"] .acsv-vchips');
  var first = q('.acsv-vlist.fav .acsv-gcell');
  if (!chips || !first || !chips.offsetParent) return false;
  return chips.getBoundingClientRect().bottom <= first.getBoundingClientRect().top + 1;
})());
var fchips = q('.acsv-mepanel[data-tab="fav"] .acsv-vchips').children;
var chip2 = fchips.length >= 2 ? fchips[fchips.length - 1] : null; // 夹二在收藏 chips 组末尾
if (chip2) chip2.click();
rec('fav-switch-rows', !!(await waitFor(function () {
  var cells = document.querySelectorAll('.acsv-vlist.fav .acsv-gcell');
  return cells.length === 1 && /测试收藏视频0/.test(cells[0].textContent);
}, 8000)));
// 收藏条目 → 播放层（0.9.82 作者契约）：卡面自带作者（docs §4.2 的 userId/userName/userImg），
// 首帧就应齐备——@名字 是链接、头像与关注角标都在，且**零额外请求**（不发 getUserCardList）。
// 首帧态用紧轮询抓：回包（delay）会把名字与头像换成详情里的，150ms 粒度的 waitFor 可能错过
var favRow0 = q('.acsv-vlist.fav .acsv-gcell');
var cardCalls0 = window.__ACSV_CARD_CALLS__;
if (favRow0) favRow0.click();
var favFirst = null;
for (var fw = 0; fw < 400 && favFirst === null; fw++) {
  var sf = q('.acsv-slide[data-ovl="1"]');
  if (sf) {
    var uf = sf.querySelector('.acsv-meta .acsv-up');
    var af = sf.querySelector('.acsv-rail .acsv-avatar');
    favFirst = {
      hash: location.hash,
      up: uf ? uf.textContent : '',
      href: uf ? uf.getAttribute('href') : '',
      avSrc: af ? af.getAttribute('src') : '',
      fb: !!sf.querySelector('.acsv-rail .acsv-followbtn')
    };
  } else await wait(10);
}
rec('fav-item-overlay', favFirst !== null && favFirst.hash === '#svfeed/play/a/489100',
  favFirst ? favFirst.hash : 'no-slide');
rec('fav-item-author-firstframe', !!favFirst && favFirst.up === '@收藏UP'
  && /\/u\/4321$/.test(favFirst.href || '')
  && favFirst.avSrc === window.__ACSV_PANEL_AVATAR__ && favFirst.fb,
  JSON.stringify(favFirst));
rec('fav-item-no-extra-fetch', window.__ACSV_CARD_CALLS__ === cardCalls0,
  'calls=' + window.__ACSV_CARD_CALLS__ + '/' + cardCalls0);
// 回包后同样被详情覆写（与历史/搜索三路同形）
rec('fav-item-author-refreshed', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  if (!s) return false;
  var up = s.querySelector('.acsv-meta .acsv-up');
  var av = s.querySelector('.acsv-rail .acsv-avatar');
  var fb = s.querySelector('.acsv-rail .acsv-followbtn');
  return !!up && up.tagName === 'A' && up.textContent === '@测试UP'
    && !!av && av.getAttribute('src') === window.__ACSV_RESOLVE_AVATAR__
    && !!fb && fb.offsetParent !== null; // 可见性查 offsetParent（0.9.62 黑屏教训）
}, 6000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var up = s && s.querySelector('.acsv-meta .acsv-up');
  return up ? up.textContent : 'no-up';
})());
key('Escape');
rec('fav-item-back', !!(await waitFor(function () {
  return location.hash === '#svfeed/my' && !q('.acsv-slide[data-ovl="1"]');
}, 8000)), location.hash);
// Tab 切回：面板常驻 DOM 只切 display——历史 22 条仍在且**不重拉接口**
var histCalls = window.__ACSV_HIST_CALLS__;
var tabHist = q('.acsv-metab[data-tab="hist"]');
if (tabHist) tabHist.click();
await wait(500);
rec('tab-keep-state', document.querySelectorAll('.acsv-vlist.hist .acsv-gcell').length === 22
  && window.__ACSV_HIST_CALLS__ === histCalls, 'calls=' + window.__ACSV_HIST_CALLS__);
// 播放层（0.9.74）：点首条历史 → 就地覆盖播放（旧契约「回竖刷 + 插队尾」已废止）。
// 钉：地址是 play 形态、层内视频真的起播、竖刷缓冲/游标零改动、层内不建上下箭头
var firstRow = q('.acsv-vlist.hist .acsv-gcell');
var firstId = 488900;
var myEl0 = q('.acsv-view');
var bufBefore = feed().items.length, curBefore = feed().current;
if (firstRow) firstRow.click();
// 紧轮询（10ms）抓"层内 slide 刚出现"那一刻的作者面快照：回包有 delay，150ms 粒度的 waitFor
// 可能落在回包之后，那样"首帧作者来自列表 API"这个态就抓不住了（接下来会被详情覆写）
var histFirst = null;
for (var tw = 0; tw < 400 && histFirst === null; tw++) {
  var s0 = q('.acsv-slide[data-ovl="1"]');
  if (s0) {
    var up0 = s0.querySelector('.acsv-meta .acsv-up');
    var av0 = s0.querySelector('.acsv-rail .acsv-avatar');
    histFirst = {
      up: up0 ? up0.textContent : '',
      href: up0 ? up0.getAttribute('href') : '',
      avSrc: av0 ? av0.getAttribute('src') : '',
      fb: !!s0.querySelector('.acsv-rail .acsv-followbtn')
    };
  } else await wait(10);
}
rec('item-plays-overlay', location.hash === '#svfeed/play/a/' + firstId
  && !!q('.acsv-slide[data-ovl="1"]'), location.hash);
// 作者契约（0.9.82；0.9.84 起历史**也有**面板层作者）：histories[].user 与 douga/info 的
// user 同形状（实测见 my-sample），所以首帧就应是完整三件套——@名字 是链接（uid 是字符串，
// 要 Number 归一）、头像来自 user.headUrl、关注角标可见，且**零额外请求**
rec('item-author-firstframe',
  !!histFirst && histFirst.up === '@历史UP'
    && /\/u\/25380695$/.test(histFirst.href || '')
    && histFirst.avSrc === window.__ACSV_PANEL_AVATAR__ && histFirst.fb,
  JSON.stringify(histFirst));
// 回包（delay 模拟网络往返）后：名字与头像都被详情覆写（历史UP→测试UP、面板头像→回包头像），
// 证明 onHomeResolved 的作者面同步真的在跑
rec('item-author-backfilled', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  if (!s) return false;
  var up = s.querySelector('.acsv-meta .acsv-up');
  var av = s.querySelector('.acsv-rail .acsv-avatar');
  var fb = s.querySelector('.acsv-rail .acsv-followbtn');
  return !!up && up.tagName === 'A' && up.textContent === '@测试UP'
    && /\/u\/9$/.test(up.getAttribute('href') || '')
    && !!av && av.getAttribute('src') === window.__ACSV_RESOLVE_AVATAR__
    && !!fb && fb.offsetParent !== null;
}, 6000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var av = s && s.querySelector('.acsv-rail .acsv-avatar');
  var up = s && s.querySelector('.acsv-meta .acsv-up');
  return (up ? up.textContent : 'no-up') + ' | src=' + (av ? String(av.getAttribute('src')).slice(0, 30) : 'no-av');
})());
rec('item-overlay-playing', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  // resolve 链走 my mock（douga/info + playInfo）→ 真起播；只查"元素在"会被黑屏骗过
  return !!v && !v.paused && v.currentTime > 0;
}, 20000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return 'state=' + (s && s.dataset.state) + ' paused=' + (v && v.paused) + ' t=' + (v && v.currentTime);
})());
rec('item-feed-untouched', feed().items.length === bufBefore && feed().current === curBefore,
  'items=' + feed().items.length + '/' + bufBefore + ' cur=' + feed().current + '/' + curBefore);
rec('item-no-arrows', !q('.acsv-slide[data-ovl="1"] .acsv-arrows'));
rec('item-feed-paused', (function () {
  var vs = document.querySelectorAll('.acsv-scroller video');
  for (var i = 0; i < vs.length; i++) if (!vs[i].paused) return false;
  return vs.length > 0;
})());
key('Escape'); // 返回来源：我的视图原位复原（同一节点、结果网格还在）
rec('item-back-to-my', !!(await waitFor(function () {
  return location.hash === '#svfeed/my' && TEST.call('view') === 'my'
    && q('.acsv-view') === myEl0 && !q('.acsv-slide[data-ovl="1"]');
}, 8000)), location.hash);
rec('item-back-keeps-grid', document.querySelectorAll('.acsv-vlist.hist .acsv-gcell').length === 22);
// 日期槽口径（0.9.85）：点**第二条**历史卡（id 488901）——它既不在直挂缝里、也不在 mock 卡片池里，
// 所以这条路走的是**真实 appapi.resolve**（前一条 488900 走直挂缝，钉不到 resolve 的取数逻辑）。
// 期望值 = createTimeMillis（站方 UP 空间页展示的发布时刻）；夹具把 createTime 摆成展示串诱饵
// "24小时前"、videoList[0].uploadTime 摆成更早的上传时刻——读错任一个都会在这里露馅。
// 播放本身会因 webm 走 hls 管线失败（cap.hls 未绕开），这一腿只看日期槽，不断言起播
var secondRow = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell')[1];
if (secondRow) secondRow.click();
rec('item2-date-published', !!(await waitFor(function () {
  var ds = q('.acsv-slide[data-ovl="1"] .acsv-meta .acsv-date');
  return !!ds && ds.textContent === window.__ACSV_PUBLISH_DATE__;
}, 15000)), (function () {
  var ds = q('.acsv-slide[data-ovl="1"] .acsv-meta .acsv-date');
  return (ds ? JSON.stringify(ds.textContent) : 'no-date') + ' 期望=' + window.__ACSV_PUBLISH_DATE__;
})());
key('Escape');
rec('item2-back', !!(await waitFor(function () {
  return location.hash === '#svfeed/my' && !q('.acsv-slide[data-ovl="1"]');
}, 8000)), location.hash);
// 视图内 Esc=返回竖刷：再进视图后合成 Esc 事件；顺带断言资料头命中缓存不重复打接口
location.hash = 'svfeed/my';
rec('re-enter-open', !!(await waitFor(function () {
  return q('.acsv-view').offsetParent !== null;
}, 8000)));
rec('me-card-cached', !!(await waitFor(function () {
  return q('.acsv-mecard-name') && window.__ACSV_CARD_CALLS__ === 1;
}, 5000)), 'calls=' + window.__ACSV_CARD_CALLS__);
// i 键在视图态不被吞（0.9.75：视图态只放行 Esc 与 i——顶栏私信按钮四界面常驻，键盘对齐）。
// 本场景为资料头设了假 auth_key（登录态）→ i 会真开抽屉走网络；先撤 cookie 验未登录分支
// （出提示＝键确实打到了私信模块），测完还原，后续步骤不受影响
document.cookie = 'auth_key=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
key('i');
rec('my-i-not-swallowed', !!(await waitFor(function () {
  return /私信需要先登录/.test((q('.acsv-toast') || {}).textContent || '');
}, 4000)), (q('.acsv-toast') || {}).textContent || '');
rec('my-i-no-drawer', (function () { // 抽屉未开（元素可能还没被懒建：不存在也算未开）
  var d = q('.acsv-msgdrawer');
  return !d || !d.classList.contains('open');
})());
document.cookie = 'auth_key=42_deadbeef'; // 还原（ui.selfUid 语义同 harness 初始设定）
// 来源视图保活（0.9.74）：我的 → 搜索（深界面）→ Esc 返回。钉四件事：挂起期只有一个
// .acsv-view（来源换类名 acsv-view-held，不污染全局定位锚）、回来是**同一个节点**、
// 滚动位保住（visibility 挂起而非 display:none）、数据不重拉
var myEl = q('.acsv-view');
var myBody = q('.acsv-view-body');
var histCalls0 = window.__ACSV_HIST_CALLS__;
myBody.scrollTop = 120;
location.hash = 'svfeed/search/测试词';
rec('hold-enter-deep', !!(await waitFor(function () {
  return !!q('.acsv-sgrid') && document.querySelectorAll('.acsv-view').length === 1;
}, 8000)), 'views=' + document.querySelectorAll('.acsv-view').length);
rec('hold-origin-suspended', document.querySelectorAll('.acsv-view-held').length === 1
  && q('.acsv-view-held') === myEl, 'held=' + document.querySelectorAll('.acsv-view-held').length);
key('Escape'); // 深界面 Esc=回来源（来源链顶），不是回竖刷
rec('hold-back-restored', !!(await waitFor(function () {
  return location.hash === '#svfeed/my' && q('.acsv-view') === myEl;
}, 8000)), location.hash);
rec('hold-restore-invariants', q('.acsv-view-body') === myBody
  && Math.abs(q('.acsv-view-body').scrollTop - 120) <= 2
  && window.__ACSV_HIST_CALLS__ === histCalls0
  && document.querySelectorAll('.acsv-view-held').length === 0,
  'scrollTop=' + Math.round(q('.acsv-view-body').scrollTop) + ' histCalls=' + window.__ACSV_HIST_CALLS__);
await wait(400); // 越过进视图前残留的 syncHash 150ms 定时器窗口（真实用户不可达的时序）
key('Escape');
rec('esc-back-to-feed', !!(await waitFor(function () {
  return /^#svfeed(\/(?:[va]\/)?\d+)?$/.test(location.hash) && q('.acsv-view') === null;
}, 8000)));
  };
  // ---- view-zone ----
  C['view-zone'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 分区榜单视图冒烟：渠道/榜期 chips 切换重渲染 + contentType 过滤 + 条目回竖刷
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
window.__ACSV_MOCK_DIRECT__ = { '489500': 1 }; // 播放层条目直挂缝（同 view-my）
location.hash = 'svfeed/zone';
rec('zone-open', !!(await waitFor(function () {
  // 视图身份锚=左栏 dock 选中态（0.9.71 起视图头无标题字——文字与 dock 重复，用户点名删除）
  var v = q('.acsv-view'), d = q('.acsv-dock-item[data-view="zone"]');
  return v && v.offsetParent !== null && d && d.classList.contains('on');
}, 10000)));
topbarInView('zone'); // 0.9.73：共享顶栏在视图态复用（同 view-my）
// 视频榜行数断言限定 .acsv-rlist——0.9.66 UP 榜 section 的行同为 .acsv-vrow
rec('zone-rows-filtered', !!(await waitFor(function () {
  var rows = document.querySelectorAll('.acsv-rlist .acsv-vrow');
  return rows.length === 4; // 5 条 mock 里 1 条 contentType=3 被契约层过滤
}, 8000)));
rec('zone-ups', !!(await waitFor(function () {
  // 原生 rlist 分栏：每行视频卡+作者卡左右并排（.acsv-upcard）
  return document.querySelectorAll('.acsv-rlist-row .acsv-upcard').length === 4;
}, 8000)));
// 排名水印：挂在视频卡内（定位宿主=.acsv-vrow.big 有 relative）——0.9.67 挂 static
// 行上致全部水印冒泡 view-body 叠一团，此断言钉住 offsetParent 防同型回归
rec('zone-rank-badge', (function () {
  var n = q('.acsv-vrow.big .acsv-rlist-num');
  return !!n && n.textContent === '1' && !!n.offsetParent && /big/.test(n.offsetParent.className);
})());
// ---- 0.9.69 原生对齐断言（原生 rank/list 实测基准） ----
// 行高恒定 129+1 分隔线：UP 卡固定 129 撑起行、视频卡 122 自然高——极端行（超长标题/
// 无空格长签名/含 <br> 简介）不许撑高（0.9.68 波动源=签名行数，这里逐行钉）
var rowHs = [].map.call(document.querySelectorAll('.acsv-rlist-row'), function (r) { return r.offsetHeight; });
rec('zone-row-height', rowHs.length === 4 && [].every.call(rowHs, function (h) { return h >= 126 && h <= 134; }),
  'hs=' + rowHs.join(','));
// meta 贴封面底（不变量：main 拉伸高=封面 90 + meta margin-top:auto）
var mbT = q('.acsv-vrow.big .acsv-vrow-thumb'), mbM = q('.acsv-vrow.big .acsv-vrow-meta');
var mbD = (mbT && mbM) ? Math.round((mbM.getBoundingClientRect().bottom - mbT.getBoundingClientRect().bottom) * 10) / 10 : null;
rec('zone-meta-bottom', mbD != null && mbD >= -1 && mbD <= 6, 'd=' + mbD);
// meta 三段原生图标码点（播放 U+E164 / 评论 U+E161 / 时间 U+E2F5；字形渲染真机核对）
var mgHost = q('.acsv-vrow.big');
var mgList = mgHost ? mgHost.querySelectorAll('.acsv-vrow-meta .acsvg-glyph') : [];
var mgCps = [].map.call(mgList, function (x) { return 'U+' + ((x.textContent.codePointAt(0) || 0).toString(16).toUpperCase()); });
rec('zone-meta-icons', mgList.length === 3 && mgCps.join(',') === 'U+E164,U+E161,U+E2F5', 'cp=' + mgCps.join(','));
// 时间段文案：发布于… + 「 / 频道」（频道名 = 顶层 channelName + 「频道」——0.9.69 真机
// 对照修正：channel 对象里是 name 不是 channelName，parentName 是主分区不可当频道名）
var mtSeg = mgHost ? mgHost.querySelectorAll('.acsv-vrow-meta .acsv-vmeta-i')[2] : null;
var mtTxt = mtSeg ? mtSeg.textContent : '';
rec('zone-meta-channel', /发布于/.test(mtTxt) && / \/ 全站综合频道$/.test(mtTxt), 't=' + mtTxt);
// 截断规则：标题单行（nowrap+ellipsis）、简介 3 行 clamp + pre-line（原生同款）
rec('zone-clamp', (function () {
  var t = q('.acsv-vrow.big .acsv-vrow-title'), d = q('.acsv-vrow.big .acsv-vrow-desc');
  if (!t || !d) return false;
  return getComputedStyle(t).whiteSpace === 'nowrap' && t.offsetHeight <= 20
    && getComputedStyle(d).webkitLineClamp === '3' && getComputedStyle(d).whiteSpace === 'pre-line';
})());
// 水印原生形态：48px 粗体 + rotate(10deg)（宿主 .big 断言另见 zone-rank-badge）
var numEl = q('.acsv-vrow.big .acsv-rlist-num');
var numCS = numEl ? getComputedStyle(numEl) : null;
rec('zone-num-native', !!numCS && numCS.fontSize === '48px' && /^matrix\(0\.98/.test(numCS.transform),
  numCS ? ('fs=' + numCS.fontSize + ' tf=' + numCS.transform.slice(0, 30)) : 'no-el');
// UP 卡：两个数据位图标（投稿 U+E15B / 粉丝 U+E155）+ 万格式 + 卡高 129（列宽 338 与行同轨）
var upcEl = q('.acsv-rlist-row .acsv-upcard');
var upcGlyphs = upcEl ? upcEl.querySelectorAll('.acsv-upcard-extra .acsvg-glyph') : [];
var upcCps = [].map.call(upcGlyphs, function (x) { return 'U+' + ((x.textContent.codePointAt(0) || 0).toString(16).toUpperCase()); });
var upcH = upcEl ? Math.round(upcEl.getBoundingClientRect().height) : null;
var upcTxt = upcEl && upcEl.querySelector('.acsv-upcard-extra') ? upcEl.querySelector('.acsv-upcard-extra').textContent : '';
rec('zone-upcard', upcCps.join(',') === 'U+E15B,U+E155' && /万/.test(upcTxt) && upcH >= 127 && upcH <= 131,
  'cp=' + upcCps.join(',') + ' h=' + upcH + ' txt=' + upcTxt);
var zchips = document.querySelectorAll('.acsv-vchips')[0].children;
var gameChip = [].filter.call(zchips, function (c) { return c.textContent === '游戏'; })[0];
if (gameChip) gameChip.click();
rec('zone-switch', !!(await waitFor(function () {
  var t = q('.acsv-rlist .acsv-vrow .acsv-vrow-title');
  return t && /榜单游戏-DAY-0/.test(t.textContent);
}, 8000)));
// 子频道行：切频道后填官方树 children（mock navTree），「全部」默认选中、请求带 subChannelId
rec('zone-subs', !!(await waitFor(function () {
  var chips = document.querySelectorAll('.acsv-vchips')[1].children;
  return chips.length === 3 && chips[0].textContent === '全部' && chips[0].classList.contains('on');
}, 8000)));
// 播放层（0.9.74）：点榜单行 → 就地覆盖播放（不跳回竖刷、不插队尾）。钉：地址 play 形态、
// 层内真起播（resolve 走 my mock）、竖刷零改动、层内无箭头、Esc 回榜单且原位复原
var zoneEl0 = q('.acsv-view');
var zBuf = feed().items.length, zCur = feed().current;
var zrow = q('.acsv-rlist .acsv-vrow');
if (zrow) zrow.click();
rec('zone-play-overlay', !!(await waitFor(function () {
  return location.hash === '#svfeed/play/a/489500' && !!q('.acsv-slide[data-ovl="1"]');
}, 10000)), location.hash);
rec('zone-play-playing', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var v = s && s.querySelector('video');
  return !!v && !v.paused && v.currentTime > 0;
}, 20000)));
rec('zone-play-feed-untouched', feed().items.length === zBuf && feed().current === zCur,
  'items=' + feed().items.length + '/' + zBuf + ' cur=' + feed().current + '/' + zCur);
rec('zone-play-no-arrows', !q('.acsv-slide[data-ovl="1"] .acsv-arrows'));
rec('zone-play-hash-stable', (function () { // 地址不被 syncHash 回写（视图形态守卫）
  return location.hash === '#svfeed/play/a/489500';
})());
key('Escape'); // 深界面 Esc=回来源（榜单视图，同一节点、不重建）
rec('zone-play-back', !!(await waitFor(function () {
  return location.hash === '#svfeed/zone' && TEST.call('view') === 'zone'
    && q('.acsv-view') === zoneEl0 && !q('.acsv-slide[data-ovl="1"]');
}, 8000)), location.hash);
rec('zone-no-backbtn', (function () { // 返回键只属深界面（普通视图出口是常驻 dock + Esc）
  var b = q('.acsv-back-btn');
  return !!b && b.style.display === 'none';
})());
rec('zone-x-single', (q('.acsv-top-right .acsv-tbtn:last-child') || {}).title === '退出');
// 隐藏态落点（0.9.74）：视图开着时跳已缓冲条目——旧行为在 display:none 下量 offsetTop
// （无布局盒恒 0）⇒ 静默滚回第一条，退出视图后要往下滑几条才见到目标（真机报障同型）。
// 现在延后到舞台回来再落地，且落点必须是目标那张（结果不变式）
location.hash = 'svfeed/zone';
rec('hidden-jump-reopen', !!(await waitFor(function () {
  return !!q('.acsv-view') && q('.acsv-view').offsetParent !== null;
}, 8000)));
var hj = feed().items.length > 1 ? 1 : 0; // 目标取非 0 的已缓冲条目：跳 0 会与旧 bug 巧合同向
TEST.call('scrollTo', hj);
await wait(200);
key('Escape'); // 退出视图 → 舞台回来 → 落地
rec('hidden-jump-landed', !!(await waitFor(function () {
  var f = feed();
  var s = q('.acsv-scroller');
  // 舞台必须先回来：隐藏态全元素无布局盒、矩形恒 0，几何断言会被"全零"假绿骗过
  if (!f || !s || s.style.display === 'none' || !s.offsetParent) return false;
  var sl = slide(f.current);
  if (!sl || f.current !== hj) return false;
  var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
  return r.top <= st + 2 && r.top >= st - 2; // 目标那张恰好顶在舞台上缘
}, 8000)), 'idx=' + hj + ' cur=' + (feed() ? feed().current : 'n/a'));
// 两级进入的舞台记账（0.9.74 修）：榜单 → 搜索（深界面）→ Esc → Esc → 竖刷须恢复播放。
// 旧实现每次 enterView 都重记 wasPlaying——第二级进入时舞台早已隐藏、当前条被暂停 ⇒
// 覆盖成 false，回竖刷后不再起播（真机表现：返回后画面静止要手点一下）
rec('stage-resume-pre', !!(await waitFor(function () { return firstVideoReady(cur()); }, 15000)));
location.hash = 'svfeed/zone'; // 普通视图做来源（上一段末尾已在竖刷）
rec('deep2-zone', !!(await waitFor(function () {
  return !!q('.acsv-vchips') && q('.acsv-view') !== null;
}, 8000)));
location.hash = 'svfeed/search/测试词'; // 深界面：来源视图挂起
rec('deep2-open', !!(await waitFor(function () { return !!q('.acsv-sgrid'); }, 8000)));
rec('deep2-origin-held', document.querySelectorAll('.acsv-view-held').length === 1 && q('.acsv-view') !== null,
  'held=' + document.querySelectorAll('.acsv-view-held').length);
// 记账不变量：两级进入后 wasPlaying 必须仍是第一次跃迁捕获的 true（旧实现被二级覆盖成
// false；真机据此才恢复播放——IO 复显兜底会掩盖症状，所以直接钉记账值）
rec('stage-wasplaying-kept', TEST.call('stage').wasPlaying === true && TEST.call('stage').visible === false,
  JSON.stringify(TEST.call('stage')));
key('Escape');
rec('deep2-back-zone', !!(await waitFor(function () {
  // 钉「还原完成」：地址赋值是同步的，视图还原要等 hashchange——只查 hash 会与下一击竞态
  return location.hash === '#svfeed/zone' && TEST.call('view') === 'zone'
    && document.querySelectorAll('.acsv-view-held').length === 0;
}, 8000)), location.hash);
key('Escape');
rec('stage-resume', !!(await waitFor(function () {
  return q('.acsv-view') === null && firstVideoReady(cur());
}, 15000)), 'cur=' + (feed() ? feed().current : 'n/a'));
// 榜单首屏缓存（0.9.79）：退出视图再进——命中缓存零新增请求（榜单日更，5 分钟 TTL
// 无新鲜度风险；我的页的历史/收藏不做缓存，保持一致每次重拉）
var zoneCalls = window.__ACSV_RANK_CALLS__ || 0;
location.hash = 'svfeed/zone';
rec('zone-cache-reenter', !!(await waitFor(function () {
  return document.querySelectorAll('.acsv-rlist .acsv-rlist-row').length > 0;
}, 10000)));
rec('zone-cache-no-refetch', (window.__ACSV_RANK_CALLS__ || 0) === zoneCalls,
  'before=' + zoneCalls + ' after=' + (window.__ACSV_RANK_CALLS__ || 0));
  };
  // ---- view-search ----
  C['view-search'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 搜索视图冒烟（0.9.72 抖音式）：顶栏搜索框（72px 居中常驻）提交 → 关键词进地址
// （#svfeed/search/<kw>）→ 搜索页 SSR HTML（mock 回放真机片段）→ 结果网格卡；
// 视图内换词走地址重建；空词只出引导态不发请求；点卡片回竖刷
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
// 直挂缝（0.9.82 对象形态）：40742636 带 delay —— 搜索条目的作者首帧来自 SSR，
// 回包（详情）后会被换成 douga/info 里的名字与头像，正好验"回包刷新 DOM"这条链路
window.__ACSV_MOCK_DIRECT__ = {
  '40742636': { id: 9, name: '测试UP', head: window.__ACSV_RESOLVE_AVATAR__, delay: 700 },
  '41033414': 1
};
window.__ACSV_SEARCH_CALLS__ = 0;
location.hash = 'svfeed';
rec('topbar-72', !!(await waitFor(function () { return !!q('.acsv-top'); }, 8000))
  && q('.acsv-top').offsetHeight === 72, q('.acsv-top') ? 'h=' + q('.acsv-top').offsetHeight : 'no-bar');
rec('topbar-search-centered', (function () { // 居中常驻：左右余量对称 ±8px
  var b = q('.acsv-top'), p = q('.acsv-top .acsv-sbox');
  if (!b || !p) return false;
  var br = b.getBoundingClientRect(), pr = p.getBoundingClientRect();
  return Math.abs((pr.left - br.left) - (br.right - pr.right)) <= 8;
})());
rec('toast-below-topbar', (function () { // toast 落位引用 --acsv-top-h，不许压顶栏
  var b = q('.acsv-top'), t = q('.acsv-toast');
  if (!b || !t) return false;
  return parseFloat(getComputedStyle(t).top) >= b.getBoundingClientRect().height;
})());
(function () { // 顶栏提交
  var i = q('.acsv-top .acsv-sbox input');
  i.value = '测试词';
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})();
rec('search-url', !!(await waitFor(function () {
  return location.hash === '#svfeed/search/' + encodeURIComponent('测试词');
}, 8000)), location.hash);
rec('search-cards', !!(await waitFor(function () {
  return document.querySelectorAll('.acsv-sgrid .acsv-scell').length === 3;
}, 8000)));
rec('search-card-fields', (function () {
  var c = q('.acsv-sgrid .acsv-scell');
  if (!c) return false;
  return (c.querySelector('.acsv-gtitle') || {}).textContent === '热门小说推荐'
    && /2037/.test((c.querySelector('.acsv-gviews') || {}).textContent || '')
    && (c.querySelector('.acsv-gdur') || {}).textContent === '02:04'
    && /^@晨澜每日分享/.test((c.querySelector('.acsv-gfoot') || {}).textContent || '');
})());
rec('search-more-link', (function () {
  var a = q('.acsv-smfoot');
  return !!a && /search\?keyword=/.test(a.getAttribute('href') || '');
})());
// 卡面收口（0.9.83）：搜索卡同为 gridCardOf——作者走脚行、无 meta 行（该行已删，无生产者）
rec('search-card-composition', (function () {
  var c = q('.acsv-sgrid .acsv-scell');
  if (!c) return false;
  return !!c.querySelector('.acsv-gfoot') && !c.querySelector('.acsv-gmeta')
    && (c.textContent.match(/晨澜每日分享/g) || []).length === 1;
})());
topbarInView('view'); // 0.9.73：搜索视图 = 共享顶栏（视图头 / 视图内胶囊都已删）
rec('search-prefill', (function () { // 顶栏输入框是唯一输入框：提交后与地址关键词一致
  var i = q('.acsv-top .acsv-sbox input');
  return !!i && i.value === '测试词';
})(), 'v=' + ((q('.acsv-top .acsv-sbox input') || {}).value));
(function () { // 同词再回车：hash 不变不触发 hashchange——视图接管提交必须就地重跑
  var i = q('.acsv-top .acsv-sbox input'); // （0.9.73 顶栏化后的新路径，旧视图内输入框同款语义）
  i.value = '测试词';
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})();
rec('search-sameword-rerun', !!(await waitFor(function () {
  return window.__ACSV_SEARCH_CALLS__ === 2
    && document.querySelectorAll('.acsv-sgrid .acsv-scell').length === 3
    && location.hash === '#svfeed/search/' + encodeURIComponent('测试词');
}, 8000)), 'calls=' + window.__ACSV_SEARCH_CALLS__);
await wait(1200); // 等首屏落定（真机/手工流都在结果出齐后再换词）
var sgrid0 = q('.acsv-view .acsv-sgrid'); // 重建指纹：视图重建后网格是新节点
// （顶栏输入框是常驻单例，不能用"节点换新"证明重建——指纹必须挂在视图自有节点上）
(function () { // 视图换词：顶栏 Enter 写地址 → hashchange → 按 arg 重建
  var i = q('.acsv-top .acsv-sbox input');
  i.value = '第二词';
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})();
rec('search-resubmit', !!(await waitFor(function () {
  return location.hash === '#svfeed/search/' + encodeURIComponent('第二词')
    && document.querySelectorAll('.acsv-sgrid .acsv-scell').length === 3;
}, 8000)));
rec('search-rebuilt', !!(await waitFor(function () { // 换词必须真重建（DOM 换新节点）：
  var g = q('.acsv-view .acsv-sgrid');               // hashchange→重建要一拍，等价断言必须 waitFor
  return !!g && g !== sgrid0;
}, 8000)));
rec('search-calls', window.__ACSV_SEARCH_CALLS__ === 3, 'calls=' + window.__ACSV_SEARCH_CALLS__
  + ' hash=' + location.hash + ' cells=' + document.querySelectorAll('.acsv-sgrid .acsv-scell').length
  + ' viewOpen=' + (!!q('.acsv-view') && q('.acsv-view').style.display !== 'none'));
// 播放层（0.9.74）：点结果卡 → 就地播放；Esc 回搜索视图且**结果原样**（保活，不重拉）
var sCell = q('.acsv-sgrid .acsv-scell');
var srEl0 = q('.acsv-view');
var srCalls = window.__ACSV_SEARCH_CALLS__;
if (sCell) sCell.click();
// 紧轮询（10ms）抓"层内 slide 刚出现"那一刻的作者面快照：回包有 700ms delay，150ms 粒度的
// waitFor 可能落在回包之后，那样"首帧作者来自 SSR"这个态就抓不住了
var sFirst = null;
for (var sw = 0; sw < 400 && !sFirst; sw++) {
  sFirst = q('.acsv-slide[data-ovl="1"]');
  if (!sFirst) await wait(10);
}
rec('search-item-overlay', /^#svfeed\/play\/a\/\d+$/.test(location.hash) && !!sFirst, location.hash);
// 作者契约（0.9.82）：SSR 卡片里本来就带 UP 段（.video__main__user 的 /u/<uid> + user-avatar），
// 解析器此前只抓名字文本把它们丢了。首帧即应为完整三件套（@名字 链接 + 头像 + 关注角标），
// 且**零额外请求**（不发 getUserCardList——搜索条目的作者全在 SSR 里，这就是"其他地方都能
// 正常获取"的真相）。用同步断言：这一态会被后面的回包覆写，不能拿等待式断言之
rec('search-item-author-firstframe', (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  if (!s) return false;
  var up = s.querySelector('.acsv-meta .acsv-up');
  var av = s.querySelector('.acsv-rail .acsv-avatar');
  var fb = s.querySelector('.acsv-rail .acsv-followbtn');
  return !!up && up.tagName === 'A' && up.textContent === '@晨澜每日分享'
    && /\/u\/73156935$/.test(up.getAttribute('href') || '')
    && !!av && av.getAttribute('src') === window.__ACSV_PANEL_AVATAR__ // SSR 那张，非默认头像
    && !!fb && fb.offsetParent !== null; // 可见性查 offsetParent（0.9.62 黑屏教训）
})(), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var av = s && s.querySelector('.acsv-rail .acsv-avatar');
  var up = s && s.querySelector('.acsv-meta .acsv-up');
  return (up ? up.textContent : 'no-up') + ' | src=' + (av ? String(av.getAttribute('src')).slice(0, 30) : 'no-av');
})());
rec('search-item-no-extra-fetch', !window.__ACSV_CARD_CALLS__,
  'calls=' + window.__ACSV_CARD_CALLS__);
// 回包后：作者行与头像都被真实详情覆写（原地更新，作者面不会因刷新而消失或退回占位）
rec('search-item-author-refreshed', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  if (!s) return false;
  var up = s.querySelector('.acsv-meta .acsv-up');
  var av = s.querySelector('.acsv-rail .acsv-avatar');
  return !!up && up.tagName === 'A' && up.textContent === '@测试UP'
    && !!av && av.getAttribute('src') === window.__ACSV_RESOLVE_AVATAR__; // 头像节点被换掉
}, 6000)), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var av = s && s.querySelector('.acsv-rail .acsv-avatar');
  var up = s && s.querySelector('.acsv-meta .acsv-up');
  return (up ? up.textContent : 'no-up') + ' | src=' + (av ? String(av.getAttribute('src')).slice(0, 30) : 'no-av');
})());
rec('search-item-overlay-kw', (function () { // 层内关键词保持（还没离开搜索上下文）
  var i = q('.acsv-top .acsv-sbox input');
  return TEST.call('view') === 'play' && !!i && i.value === '第二词';
})(), 'v=' + JSON.stringify((q('.acsv-top .acsv-sbox input') || {}).value));
key('Escape');
rec('search-item-back', !!(await waitFor(function () {
  return /^#svfeed\/search/.test(location.hash) && TEST.call('view') === 'search'
    && q('.acsv-view') === srEl0;
}, 8000)), location.hash);
rec('search-item-keeps-kw', (function () { // 深钻不算离开搜索上下文：关键词保持
  var i = q('.acsv-top .acsv-sbox input');
  return !!i && i.value === '第二词';
})(), 'v=' + ((q('.acsv-top .acsv-sbox input') || {}).value));
rec('search-item-back-kept', document.querySelectorAll('.acsv-sgrid .acsv-scell').length === 3
  && window.__ACSV_SEARCH_CALLS__ === srCalls,
  'calls=' + window.__ACSV_SEARCH_CALLS__ + '/' + srCalls);
(function () { // 顶栏空词提交：只开视图出引导态，不发请求
  var i = q('.acsv-top .acsv-sbox input');
  i.value = '';
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})();
rec('search-empty-nofetch', !!(await waitFor(function () {
  return location.hash === '#svfeed/search'
    && /输入关键词/.test((q('.acsv-sstate') || {}).textContent || '');
}, 8000)) && window.__ACSV_SEARCH_CALLS__ === 3, 'calls=' + window.__ACSV_SEARCH_CALLS__);
// 离开搜索视图 → 默认提交还原（handler 生命周期）+ 地址深链回填（分享链接/刷新回放的落点）
key('Escape');
rec('search-esc-back', !!(await waitFor(function () {
  return /^#svfeed(\/(?:[va]\/)?\d+)?$/.test(location.hash)
    && q('.acsv-view') === null;
}, 8000)), location.hash);
location.hash = 'svfeed/search/' + encodeURIComponent('深链词');
rec('search-deeplink-prefill', !!(await waitFor(function () {
  var i = q('.acsv-top .acsv-sbox input');
  return q('.acsv-view').offsetParent !== null && !!i && i.value === '深链词'
    && document.querySelectorAll('.acsv-sgrid .acsv-scell').length === 3;
}, 8000)), 'v=' + ((q('.acsv-top .acsv-sbox input') || {}).value));
rec('search-calls-final', window.__ACSV_SEARCH_CALLS__ === 4, 'calls=' + window.__ACSV_SEARCH_CALLS__);
rec('search-backbtn-shown', (function () { // 搜索结果页是深界面：来源不在 dock 上
  var b = q('.acsv-back-btn');
  return !!b && b.style.display !== 'none' && b.offsetParent !== null;
})());
var sBack = q('.acsv-back-btn'); // 收尾顺带钉返回键真路径：回来源（此例来源是竖刷）
if (sBack) sBack.click();
rec('search-backbtn-back', !!(await waitFor(function () {
  return location.hash === '#svfeed' && q('.acsv-view') === null;
}, 8000)), location.hash);
rec('search-leave-clears-kw', (function () { // 离开搜索上下文（回竖刷）即清空输入框
  var i = q('.acsv-top .acsv-sbox input');
  return !!i && i.value === '';
})(), 'v=' + JSON.stringify((q('.acsv-top .acsv-sbox input') || {}).value));
  };
  // ---- cover-fallback ----
  C['cover-fallback'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 封面加载策略冒烟（0.9.76）：三种封面态各一条——好图（data:，load 后淡入）/
// flaky（静态服务首拉 404 再拉 200，走通重试链；断 naturalWidth 即证明第二次真的发生）/
// 死链（重试链耗尽 → 降级：img 隐藏 + .acsv-imgfail + 占位文案，严禁留 Chrome 裂图）
document.cookie = 'auth_key=42_deadbeef';
window.__ACSV_MOCK_FORM__ = {
  // 资料头不是本场景关注点且不桩就会真打外网：桩成空回包（meCardOf 返回 null 静默）
  'user/getUserCardList': { result: 1, users: [] },
  'browse/history/list': {
    result: 0, totalCount: 3,
    histories: [
      { resourceType: 2, videoId: 900101, resourceId: 488101, title: '好图封面',
        cover: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        playedSeconds: 10, playedSecondsShow: '观看至00:10' },
      { resourceType: 2, videoId: 900102, resourceId: 488102, title: 'flaky 封面',
        cover: '/flaky-cover.png?pid=' + CASE, playedSeconds: 20, playedSecondsShow: '观看至00:20' },
      { resourceType: 2, videoId: 900103, resourceId: 488103, title: '死链封面',
        cover: '/nope-404.png?pid=' + CASE, playedSeconds: 30, playedSecondsShow: '观看至00:30' }
    ]
  }
};
location.hash = 'svfeed/my';
function coverBox(title) {
  var cells = document.querySelectorAll('.acsv-vlist.hist .acsv-gcell');
  for (var i = 0; i < cells.length; i++) {
    var t = cells[i].querySelector('.acsv-gtitle');
    if (t && t.textContent === title) return cells[i].querySelector('.acsv-gcover');
  }
  return null;
}
rec('cover-cards', !!(await waitFor(function () {
  return document.querySelectorAll('.acsv-vlist.hist .acsv-gcell').length === 3;
}, 10000)));
rec('cover-good-loads', !!(await waitFor(function () { // 加载成功 + 淡入到位（不许停在半透明）
  var img = coverBox('好图封面') && coverBox('好图封面').querySelector('img');
  return img && img.naturalWidth > 0 && getComputedStyle(img).opacity === '1';
}, 8000)));
rec('cover-retry-loads', !!(await waitFor(function () { // 首拉 404 → 重试链换 URL 再拉 200
  var b = coverBox('flaky 封面'), img = b && b.querySelector('img');
  return img && img.naturalWidth > 0 && !img.classList.contains('acsv-imgfail');
}, 10000)), (function () {
  var b = coverBox('flaky 封面'), img = b && b.querySelector('img');
  return img ? ('src=' + img.getAttribute('src') + ' nw=' + img.naturalWidth) : 'no-img';
})());
rec('cover-dead-degrades', !!(await waitFor(function () { // 重试耗尽 → 隐藏裂图 + 占位文案
  var b = coverBox('死链封面');
  var img = b && b.querySelector('img');
  var ph = b && b.querySelector('.acsv-gph');
  return img && img.classList.contains('acsv-imgfail')
    && (img.style.display === 'none' || getComputedStyle(img).display === 'none')
    && ph && ph.textContent === '封面加载失败';
}, 12000)), (function () {
  var b = coverBox('死链封面');
  var img = b && b.querySelector('img');
  return img ? ('cls=' + img.className + ' disp=' + getComputedStyle(img).display) : 'no-img';
})());
rec('cover-no-broken-glyph', (function () { // 终态不变量：每张封面要么加载成功要么已隐藏
  var imgs = document.querySelectorAll('.acsv-vlist.hist .acsv-gcover img');
  if (imgs.length !== 3) return false;
  return [].every.call(imgs, function (im) {
    return im.naturalWidth > 0 || im.classList.contains('acsv-imgfail');
  });
})());
// ---- 网络面证据（0.9.77）：计数端点 /__hits 让「重试链真的打了网络」可证
//（此前只断终态——终态在重试链没跑的情况下也可能为真，属弱断言）----
async function hitsOf(p) {
  try { return (await (await fetch('/__hits?pid=' + CASE)).json())[p] || 0; } catch (e) { return -1; }
}
rec('cover-retry-counted', (await hitsOf('/flaky-cover.png')) === 2,
  'flaky=' + (await hitsOf('/flaky-cover.png'))); // 首拉 404 + 换 URL 重拉 200：恰好两发
rec('cover-dead-exhausted', (await hitsOf('/nope-404.png')) === 3,
  'dead=' + (await hitsOf('/nope-404.png'))); // 三跳两两换 URL：恰好三发
// ---- 二次进入（0.9.77 备忘语义）：死链备忘命中 → 连一发请求都不发（img 从未拿到
// src），但仍出降级占位（用户可读结果不变）。0.9.76 的续期语义下这里会再打三发 ----
// 退出必须等视图真的拆掉（view=null + DOM 消失）才继续：waitFor 首判是同步的，
// 若在同一 task 内紧接着重写 hash，浏览器会把两次 fragment 变化合并成净零变化、
// 一个 hashchange 都不发——视图从未退出，也就谈不上"重建"（踩实教训，写进断言里）
key('Escape');
rec('cover-exit', !!(await waitFor(function () {
  return location.hash === '#svfeed' && document.querySelectorAll('.acsv-view').length === 0;
}, 8000)), location.hash + ' views=' + document.querySelectorAll('.acsv-view').length);
location.hash = 'svfeed/my';
rec('cover-reenter', !!(await waitFor(function () {
  return document.querySelectorAll('.acsv-vlist.hist .acsv-gcell').length === 3;
}, 10000)));
rec('cover-reenter-degrade', !!(await waitFor(function () {
  var b = coverBox('死链封面');
  var img = b && b.querySelector('img');
  return !!img && img.classList.contains('acsv-imgfail') && !!b.querySelector('.acsv-gph');
}, 8000)));
rec('cover-memo-no-src', (function () { // 备忘命中：这条死链的 src 从未赋值（零网络）
  var b = coverBox('死链封面'), img = b && b.querySelector('img');
  return !!img && !img.getAttribute('src');
})(), (function () {
  var b = coverBox('死链封面'), img = b && b.querySelector('img');
  return img ? ('src=' + img.getAttribute('src') + ' cls=' + img.className) : 'no-img';
})());
rec('cover-memo-zero-hits', (await hitsOf('/nope-404.png')) === 3,
  'dead=' + (await hitsOf('/nope-404.png'))); // 与首轮相同：二次进入零新增请求
// 策略名解析（0.9.78）：拼错名字必须出声（此前静默退化成空策略，占位/兜底悄悄丢），
// 已知名给全策略（断言里认 ph 字段——grid 策略的占位文案就在它上面）
rec('img-policy-known', TEST.call('imgPolicy', 'grid').indexOf('"ph"') >= 0,
  TEST.call('imgPolicy', 'grid'));
var uWarns = [], oWarn = console.warn;
console.warn = function (m) { uWarns.push(String(m)); };
var uBogus = TEST.call('imgPolicy', 'grrid');
console.warn = oWarn;
rec('img-policy-unknown-warns', uBogus === '{}' && uWarns.length === 1 && /grrid/.test(uWarns[0]),
  uBogus + ' warns=' + uWarns.length);
  };
  // ---- view-im ----
  C['view-im'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 抽屉×视图避让冒烟（0.9.73）：视图里开私信抽屉 → 正文让位（宽视口右缘收窄到抽屉左缘，
// 逐帧贴合同曲线）或降级纯覆盖（中窄视口，CFG.view.avoidW 护栏）；顶栏右组避让平移后
// 仍可点；Esc 链 = 先关抽屉（视图保留）→ 再退竖刷；离开视图 = 浮层随视图收（对称收尾）。
// 走 imOpenSmoke 模拟缝：真实避让路径（浮层栈 + 抽屉槽 + syncCommentVars），不拉 ImSdk /
// 不依赖登录。宽窄两态由驱动设视口（view-im=1280 / view-im-narrow=1000，见 run-harness.mjs）
var IMV_WIDE = CASE === 'view-im';
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
location.hash = IMV_WIDE ? 'svfeed/my' : 'svfeed/zone';
rec('imview-open', !!(await waitFor(function () {
  return q('.acsv-view').offsetParent !== null;
}, 10000)));
topbarInView('imview');
var imvSmoke = TEST.call('imOpenSmoke');
rec('imview-drawer-open', !!(imvSmoke && imvSmoke.open && imvSmoke.drawerConnected && imvSmoke.withComments),
  JSON.stringify(imvSmoke || {}));
await wait(500); // 越过 .28s 抽屉滑入/正文收窄过渡
rec('imview-body-geometry', (function () {
  var b = q('.acsv-view-body'), d = q('.acsv-msgdrawer');
  if (!b || !d) return false;
  var br = b.getBoundingClientRect(), dr = d.getBoundingClientRect();
  // 宽视口：正文右缘=抽屉左缘（同曲线过渡的稳态）；中窄视口：正文不动（right=0，纯覆盖）
  return IMV_WIDE ? Math.abs(br.right - dr.left) <= 2 : Math.abs(br.right - window.innerWidth) <= 2;
})(), (function () {
  var b = q('.acsv-view-body'), d = q('.acsv-msgdrawer');
  if (!b || !d) return 'n/a';
  return 'bodyR=' + Math.round(b.getBoundingClientRect().right)
    + ' drawerL=' + Math.round(d.getBoundingClientRect().left) + ' vw=' + window.innerWidth;
})());
// 护栏的核心目的：正文不因收窄/挤压出现横向溢出（榜单 338px 定宽列的最窄可用宽推算）
rec('imview-no-overflow', (function () {
  var b = q('.acsv-view-body');
  return !!b && b.scrollWidth <= b.clientWidth + 1;
})());
rec('imview-topbar-right-clear', (function () { // 右组避让平移生效：整体在抽屉左缘左侧
  var tr = q('.acsv-top-right'), d = q('.acsv-msgdrawer');
  if (!tr || !d) return false;
  return tr.getBoundingClientRect().right <= d.getBoundingClientRect().left + 1;
})());
rec('imview-buttons-clickable', (function () { // 私信/更新/✕ 被抽屉盖住即失去出口——必须真实渲染
  var btns = [q('.acsv-im-btn'), q('.acsv-upd-btn'), q('.acsv-top-right .acsv-tbtn:last-child')];
  return btns.every(function (b) { return !!b && b.offsetParent !== null && b.offsetWidth > 0; });
})());
// 搜索框让位（0.9.73 收口 0.9.72 遗留：右组左移会压到居中搜索框）：宽视口=收窄后与右组
// 不重叠；窄视口（<CFG.view.avoidTopW=1012）=不可用即隐藏，只留右组
rec('imview-pill-clear', (function () {
  var p = q('.acsv-top .acsv-sbox'), tr = q('.acsv-top-right');
  if (!p || !tr) return false;
  var vis = getComputedStyle(p).display !== 'none' && p.offsetParent !== null;
  if (!vis) return !IMV_WIDE;
  return p.getBoundingClientRect().right <= tr.getBoundingClientRect().left + 1;
})(), (function () {
  var p = q('.acsv-top .acsv-sbox'), tr = q('.acsv-top-right');
  if (!p || !tr) return 'n/a';
  return 'pillR=' + Math.round(p.getBoundingClientRect().right)
    + ' groupL=' + Math.round(tr.getBoundingClientRect().left)
    + ' dw=' + Math.round(p.getBoundingClientRect().width);
})());
// 0.9.75：动画时长单源（--acsv-dw-t）——抽屉与两处"让位"（顶栏 right / 正文 right）必须同值，
// 这是逐帧贴合不变式的前提（抽离共享规则时最容易悄悄改坏的点）
rec('imview-timing-single-source', (function () {
  var d = q('.acsv-msgdrawer'), t = q('.acsv-top'), b = q('.acsv-view-body');
  if (!d || !t || !b) return false;
  var dd = getComputedStyle(d).transitionDuration;
  return dd === getComputedStyle(t).transitionDuration && dd === getComputedStyle(b).transitionDuration;
})(), (function () {
  var d = q('.acsv-msgdrawer'), t = q('.acsv-top'), b = q('.acsv-view-body');
  return d && t && b ? (getComputedStyle(d).transitionDuration + '/' + getComputedStyle(t).transitionDuration
    + '/' + getComputedStyle(b).transitionDuration) : 'n/a';
})());
key('i'); // 视图态按 i：直接关掉开着的抽屉（0.9.75 键位全界面通用，未登录也能关）
rec('imview-i-closes-in-view', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer');
  return !!d && !d.classList.contains('open');
}, 5000)));
var s3 = TEST.call('imOpenSmoke'); // 缝开：Esc 链的起点恢复
rec('imview-reopen-for-esc', !!(s3 && s3.open));
key('Escape'); // 栈顶=im → 先关抽屉（视图保留）
rec('imview-esc-drawer', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer'), r = q('#acsv-root');
  return !!d && !d.classList.contains('open') && !!r && !r.classList.contains('acsv-with-comments');
}, 5000)));
rec('imview-view-kept', q('.acsv-view').offsetParent !== null
  && location.hash === (IMV_WIDE ? '#svfeed/my' : '#svfeed/zone'), location.hash);
await wait(400); // 过渡回落
rec('imview-restored', (function () {
  var b = q('.acsv-view-body');
  return !!b && Math.abs(b.getBoundingClientRect().right - window.innerWidth) <= 2;
})(), (function () {
  var b = q('.acsv-view-body');
  return b ? 'bodyR=' + Math.round(b.getBoundingClientRect().right) + ' vw=' + window.innerWidth : 'n/a';
})());
key('Escape'); // 再 Esc → 回竖刷
rec('imview-esc-view', !!(await waitFor(function () {
  return /^#svfeed(\/(?:[va]\/)?\d+)?$/.test(location.hash)
    && q('.acsv-view') === null;
}, 8000)), location.hash);

// ---- 0.9.75：私信开合（顶栏按钮/i 键）----
// i 键在输入框聚焦时不触发（目标豁免在前）：事件派到顶栏输入框上，抽屉不开且无新提示
var toastBefore = (q('.acsv-toast') || {}).textContent || '';
(function () {
  var i = q('.acsv-top .acsv-sbox input');
  if (i) i.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
})();
await wait(300);
rec('imview-i-input-exempt', (function () {
  var d = q('.acsv-msgdrawer');
  return (!d || !d.classList.contains('open'))
    && ((q('.acsv-toast') || {}).textContent || '') === toastBefore;
})(), 'toast=' + ((q('.acsv-toast') || {}).textContent || ''));
// i 键已接线（未登录）：出登录提示——证明键真的打到了私信抽屉模块（打开侧受登录门槛）
key('i');
rec('imview-i-login-guard', !!(await waitFor(function () {
  return /私信需要先登录/.test((q('.acsv-toast') || {}).textContent || '');
}, 4000)), (q('.acsv-toast') || {}).textContent || '');
// 顶栏私信按钮＝开合（用户报障）：缝开后点按钮必须关——旧行为 onDrawer=openDrawer 恒开，
// 二次点击走 overlayOpen 幂等收旧（同 tick 摘类又加类被合成）＝观感"点了没反应"
var s1 = TEST.call('imOpenSmoke');
rec('imview-btn-open', !!(s1 && s1.open));
q('.acsv-im-btn').click();
rec('imview-btn-toggle-close', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer'), r = q('#acsv-root');
  return !!d && !d.classList.contains('open') && !!r && !r.classList.contains('acsv-with-comments');
}, 5000)));
// i 键＝开合：缝开后再按必须关（关闭分支先于登录门槛，所以未登录也能关）
var s2 = TEST.call('imOpenSmoke');
rec('imview-i-close-open', !!(s2 && s2.open));
key('i');
rec('imview-i-toggle-close', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer');
  return !!d && !d.classList.contains('open');
}, 5000)));
  };
  // ---- view-im-narrow ----
  C['view-im-narrow'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 抽屉×视图避让冒烟（0.9.73）：视图里开私信抽屉 → 正文让位（宽视口右缘收窄到抽屉左缘，
// 逐帧贴合同曲线）或降级纯覆盖（中窄视口，CFG.view.avoidW 护栏）；顶栏右组避让平移后
// 仍可点；Esc 链 = 先关抽屉（视图保留）→ 再退竖刷；离开视图 = 浮层随视图收（对称收尾）。
// 走 imOpenSmoke 模拟缝：真实避让路径（浮层栈 + 抽屉槽 + syncCommentVars），不拉 ImSdk /
// 不依赖登录。宽窄两态由驱动设视口（view-im=1280 / view-im-narrow=1000，见 run-harness.mjs）
var IMV_WIDE = CASE === 'view-im';
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
location.hash = IMV_WIDE ? 'svfeed/my' : 'svfeed/zone';
rec('imview-open', !!(await waitFor(function () {
  return q('.acsv-view').offsetParent !== null;
}, 10000)));
topbarInView('imview');
var imvSmoke = TEST.call('imOpenSmoke');
rec('imview-drawer-open', !!(imvSmoke && imvSmoke.open && imvSmoke.drawerConnected && imvSmoke.withComments),
  JSON.stringify(imvSmoke || {}));
await wait(500); // 越过 .28s 抽屉滑入/正文收窄过渡
rec('imview-body-geometry', (function () {
  var b = q('.acsv-view-body'), d = q('.acsv-msgdrawer');
  if (!b || !d) return false;
  var br = b.getBoundingClientRect(), dr = d.getBoundingClientRect();
  // 宽视口：正文右缘=抽屉左缘（同曲线过渡的稳态）；中窄视口：正文不动（right=0，纯覆盖）
  return IMV_WIDE ? Math.abs(br.right - dr.left) <= 2 : Math.abs(br.right - window.innerWidth) <= 2;
})(), (function () {
  var b = q('.acsv-view-body'), d = q('.acsv-msgdrawer');
  if (!b || !d) return 'n/a';
  return 'bodyR=' + Math.round(b.getBoundingClientRect().right)
    + ' drawerL=' + Math.round(d.getBoundingClientRect().left) + ' vw=' + window.innerWidth;
})());
// 护栏的核心目的：正文不因收窄/挤压出现横向溢出（榜单 338px 定宽列的最窄可用宽推算）
rec('imview-no-overflow', (function () {
  var b = q('.acsv-view-body');
  return !!b && b.scrollWidth <= b.clientWidth + 1;
})());
rec('imview-topbar-right-clear', (function () { // 右组避让平移生效：整体在抽屉左缘左侧
  var tr = q('.acsv-top-right'), d = q('.acsv-msgdrawer');
  if (!tr || !d) return false;
  return tr.getBoundingClientRect().right <= d.getBoundingClientRect().left + 1;
})());
rec('imview-buttons-clickable', (function () { // 私信/更新/✕ 被抽屉盖住即失去出口——必须真实渲染
  var btns = [q('.acsv-im-btn'), q('.acsv-upd-btn'), q('.acsv-top-right .acsv-tbtn:last-child')];
  return btns.every(function (b) { return !!b && b.offsetParent !== null && b.offsetWidth > 0; });
})());
// 搜索框让位（0.9.73 收口 0.9.72 遗留：右组左移会压到居中搜索框）：宽视口=收窄后与右组
// 不重叠；窄视口（<CFG.view.avoidTopW=1012）=不可用即隐藏，只留右组
rec('imview-pill-clear', (function () {
  var p = q('.acsv-top .acsv-sbox'), tr = q('.acsv-top-right');
  if (!p || !tr) return false;
  var vis = getComputedStyle(p).display !== 'none' && p.offsetParent !== null;
  if (!vis) return !IMV_WIDE;
  return p.getBoundingClientRect().right <= tr.getBoundingClientRect().left + 1;
})(), (function () {
  var p = q('.acsv-top .acsv-sbox'), tr = q('.acsv-top-right');
  if (!p || !tr) return 'n/a';
  return 'pillR=' + Math.round(p.getBoundingClientRect().right)
    + ' groupL=' + Math.round(tr.getBoundingClientRect().left)
    + ' dw=' + Math.round(p.getBoundingClientRect().width);
})());
// 0.9.75：动画时长单源（--acsv-dw-t）——抽屉与两处"让位"（顶栏 right / 正文 right）必须同值，
// 这是逐帧贴合不变式的前提（抽离共享规则时最容易悄悄改坏的点）
rec('imview-timing-single-source', (function () {
  var d = q('.acsv-msgdrawer'), t = q('.acsv-top'), b = q('.acsv-view-body');
  if (!d || !t || !b) return false;
  var dd = getComputedStyle(d).transitionDuration;
  return dd === getComputedStyle(t).transitionDuration && dd === getComputedStyle(b).transitionDuration;
})(), (function () {
  var d = q('.acsv-msgdrawer'), t = q('.acsv-top'), b = q('.acsv-view-body');
  return d && t && b ? (getComputedStyle(d).transitionDuration + '/' + getComputedStyle(t).transitionDuration
    + '/' + getComputedStyle(b).transitionDuration) : 'n/a';
})());
key('i'); // 视图态按 i：直接关掉开着的抽屉（0.9.75 键位全界面通用，未登录也能关）
rec('imview-i-closes-in-view', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer');
  return !!d && !d.classList.contains('open');
}, 5000)));
var s3 = TEST.call('imOpenSmoke'); // 缝开：Esc 链的起点恢复
rec('imview-reopen-for-esc', !!(s3 && s3.open));
key('Escape'); // 栈顶=im → 先关抽屉（视图保留）
rec('imview-esc-drawer', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer'), r = q('#acsv-root');
  return !!d && !d.classList.contains('open') && !!r && !r.classList.contains('acsv-with-comments');
}, 5000)));
rec('imview-view-kept', q('.acsv-view').offsetParent !== null
  && location.hash === (IMV_WIDE ? '#svfeed/my' : '#svfeed/zone'), location.hash);
await wait(400); // 过渡回落
rec('imview-restored', (function () {
  var b = q('.acsv-view-body');
  return !!b && Math.abs(b.getBoundingClientRect().right - window.innerWidth) <= 2;
})(), (function () {
  var b = q('.acsv-view-body');
  return b ? 'bodyR=' + Math.round(b.getBoundingClientRect().right) + ' vw=' + window.innerWidth : 'n/a';
})());
key('Escape'); // 再 Esc → 回竖刷
rec('imview-esc-view', !!(await waitFor(function () {
  return /^#svfeed(\/(?:[va]\/)?\d+)?$/.test(location.hash)
    && q('.acsv-view') === null;
}, 8000)), location.hash);

// ---- 0.9.75：私信开合（顶栏按钮/i 键）----
// i 键在输入框聚焦时不触发（目标豁免在前）：事件派到顶栏输入框上，抽屉不开且无新提示
var toastBefore = (q('.acsv-toast') || {}).textContent || '';
(function () {
  var i = q('.acsv-top .acsv-sbox input');
  if (i) i.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
})();
await wait(300);
rec('imview-i-input-exempt', (function () {
  var d = q('.acsv-msgdrawer');
  return (!d || !d.classList.contains('open'))
    && ((q('.acsv-toast') || {}).textContent || '') === toastBefore;
})(), 'toast=' + ((q('.acsv-toast') || {}).textContent || ''));
// i 键已接线（未登录）：出登录提示——证明键真的打到了私信抽屉模块（打开侧受登录门槛）
key('i');
rec('imview-i-login-guard', !!(await waitFor(function () {
  return /私信需要先登录/.test((q('.acsv-toast') || {}).textContent || '');
}, 4000)), (q('.acsv-toast') || {}).textContent || '');
// 顶栏私信按钮＝开合（用户报障）：缝开后点按钮必须关——旧行为 onDrawer=openDrawer 恒开，
// 二次点击走 overlayOpen 幂等收旧（同 tick 摘类又加类被合成）＝观感"点了没反应"
var s1 = TEST.call('imOpenSmoke');
rec('imview-btn-open', !!(s1 && s1.open));
q('.acsv-im-btn').click();
rec('imview-btn-toggle-close', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer'), r = q('#acsv-root');
  return !!d && !d.classList.contains('open') && !!r && !r.classList.contains('acsv-with-comments');
}, 5000)));
// i 键＝开合：缝开后再按必须关（关闭分支先于登录门槛，所以未登录也能关）
var s2 = TEST.call('imOpenSmoke');
rec('imview-i-close-open', !!(s2 && s2.open));
key('i');
rec('imview-i-toggle-close', !!(await waitFor(function () {
  var d = q('.acsv-msgdrawer');
  return !!d && !d.classList.contains('open');
}, 5000)));
  };

  // ---- view-follow：关注视图冒烟（0.9.100 还原度重构：原生骨架单列无限流）----
  // 数据源 followFeedV2 混合流不变；断言按份量：契约过滤 / 三类行的**原生骨架判别位**
  // （视频=横条双灰块+600 标题+info 播放数+hover 时长浮层、文章=红角标+两行摘要、
  // 动态=正文 pre-line+九宫格原生形制）/ 互动行四键（分享带文字无数字）+赞乐观两向 /
  // **评论键原位展开评论区**（管线回写计数、再点收起、开新关旧互斥）/ 展开/收起 /
  // 无限滚动（触底翻页+三态状态行+append-only）/ Esc 回竖刷
  C['view-follow'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key,
      topbarInView = h.topbarInView, TEST = h.TEST;
    // MY_MOCK（行流/写链桩）+ 评论列表桩（原位评论区断言用，形状同 detail-open）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'comment/list': function () {
        return { result: 0, commentCount: 3, curPage: 1, totalPage: 1, pcursor: 'no_more',
          hotComments: [],
          rootComments: [
            { commentId: 'c1', userId: 21, userName: '测试员甲', headUrl: '', content: '原位评论第一条', postDate: '1分钟前', likeCount: 2, isLike: false, subCommentCount: 0 },
            { commentId: 'c2', userId: 22, userName: '测试员乙', headUrl: '', content: '原位评论第二条', postDate: '2分钟前', likeCount: 0, isLike: false, subCommentCount: 0 }
          ],
          subCommentsMap: {} };
      }
    });
    window.__ACSV_FOLLOW_CALLS__ = 0;
    // 摘掉全局 SV 夹具：loadComments 见 __ACSV_MOCK__ 真值会走内置 mockComments
    //（commentCount 4）而不是下面的定向桩（detail-open 同款处置）
    delete window.__ACSV_MOCK__;
    location.hash = 'svfeed/follow';
    rec('follow-open', !!(await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null;
    }, 10000)));
    topbarInView('follow');
    rec('follow-dock-highlight', !!(await waitFor(function () {
      var b = q('.acsv-dock-item[data-view="follow"]');
      return b && b.classList.contains('on');
    }, 3000)));
    rec('follow-scroller-hidden', q('.acsv-scroller').style.display === 'none');
    // 首屏：19 行（20 原始条 − 1 条未观察类型），骨架已清
    rec('follow-rows', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length === 19;
    }, 8000)), 'n=' + document.querySelectorAll('.acsv-mewrap .acsv-frow').length);
    rec('follow-skeleton-gone', document.querySelectorAll('.acsv-fskel').length === 0);
    rec('follow-bad-filtered', !/未观察类型/.test(q('.acsv-mewrap').textContent));
    // 顶栏关注 seg：语境可见、默认「全部」高亮（dock 直进的默认侧，0.9.99 口径）
    var fsegAll = q('.acsv-seg-follow .acsv-seg-btn:nth-child(2)');
    var fsegVideos = q('.acsv-seg-follow .acsv-seg-btn:nth-child(1)');
    rec('follow-seg-ctx', !!fsegAll && fsegAll.closest('.acsv-seg-follow').style.display !== 'none'
      && fsegAll.classList.contains('on') && fsegVideos && !fsegVideos.classList.contains('on'),
      'all=' + (fsegAll && fsegAll.classList.contains('on')) + ' videos=' + (fsegVideos && fsegVideos.classList.contains('on')));
    // 行定位器（按文本找行）
    var rows = document.querySelectorAll('.acsv-mewrap .acsv-frow');
    function rowOf(text) {
      for (var i = 0; i < rows.length; i++) {
        if (new RegExp(text).test(rows[i].textContent)) return rows[i];
      }
      return null;
    }
    // ---- 视频行（原生骨架）：横条双灰块 + 时长 hover 浮层 + 600 标题 + info 播放数 ----
    var vRow = rowOf('关注视频甲');
    rec('follow-video-row', !!(vRow && vRow.querySelector('.acsv-frow-strip')
      && vRow.querySelector('.acsv-frow-scover img')
      && vRow.querySelector('.acsv-frow-sbody')
      && /00:10/.test((vRow.querySelector('.acsv-frow-mdur') || {}).textContent || '')
      && /关注视频甲/.test((vRow.querySelector('.acsv-frow-stitle') || {}).textContent || '')
      && /100/.test((vRow.querySelector('.acsv-frow-sinfo') || {}).textContent || '')),
      vRow ? (vRow.querySelector('.acsv-frow-stitle') || {}).textContent : 'no-row');
    rec('follow-video-like-on', !!(vRow && [].some.call(vRow.querySelectorAll('.acsv-fact'),
      function (b) { return b._act === 'like' && b.classList.contains('on'); })),
      '预置 isLike（夹具 i=0）→ 赞键点亮');
    // ---- 文章行：红角标「文章」+ 两行摘要 + 无时长浮层 ----
    var aRow = rowOf('关注文章甲');
    rec('follow-article-row', !!(aRow && aRow.querySelector('.acsv-frow-scover img')
      && (aRow.querySelector('.acsv-frow-tag') || {}).textContent === '文章'
      && /团圆时节/.test((aRow.querySelector('.acsv-frow-sdesc') || {}).textContent || '')
      && !aRow.querySelector('.acsv-frow-mdur')),
      aRow ? 'tag/desc' : 'no-row');
    // ---- 动态行：正文（pre-line）+ 单图 n1 + 互动行四键（分享带文字无数字）----
    var mRow = rowOf('动态正文带 UBB');
    rec('follow-moment-ubb', !!(mRow && mRow.querySelector('.acsv-frow-text a.ubb-at')),
      mRow ? (mRow.querySelector('.acsv-frow-text') || {}).textContent : 'no-row');
    rec('follow-moment-img', !!(mRow && mRow.querySelector('.acsv-frow-imgs.n1 .acsv-frow-img img')));
    var mActs = mRow ? mRow.querySelectorAll('.acsv-fact') : [];
    rec('follow-moment-acts', mActs.length === 4
      && mActs[0]._act === 'share' && mActs[1]._act === 'comment'
      && mActs[2]._act === 'banana' && mActs[3]._act === 'like'
      && /分享/.test(mActs[0].textContent) && mActs[0]._n === undefined
      && mActs[1]._n.textContent === '3' && mActs[2]._n.textContent === '2'
      && mActs[3]._n.textContent === '11',
      [].map.call(mActs, function (b) { return b._act + '=' + (b._n ? b._n.textContent : 'txt'); }).join('|'));
    // 行内写链：赞乐观两向（mock add/delete 均 result 1 → 成功）
    mActs[3].click();
    rec('follow-like-on', !!(await waitFor(function () {
      return mActs[3].classList.contains('on') && mActs[3]._n.textContent === '12';
    }, 5000)), 'n=' + mActs[3]._n.textContent);
    // 点击间留一拍：乐观态是同步的、likeBusy 复位在异步 then——连点会被 busy 守卫吞掉
    //（detail-open 同款教训，非产品 bug）
    await wait(120);
    mActs[3].click();
    rec('follow-like-off', !!(await waitFor(function () {
      return !mActs[3].classList.contains('on') && mActs[3]._n.textContent === '11';
    }, 5000)), 'n=' + mActs[3]._n.textContent);
    // ---- 原位评论区（0.9.100）：点评论键 → 行内展开（列表+输入条+计数回写）----
    mActs[1].click();
    rec('follow-cmts-inline', !!(await waitFor(function () {
      var box = mRow.querySelector('.acsv-frow-cmts');
      return box && box.querySelectorAll('.acsv-citem').length >= 2
        && !!box.querySelector('.acsv-cinput');
    }, 8000)), 'items=' + (mRow.querySelectorAll('.acsv-frow-cmts .acsv-citem') || []).length);
    rec('follow-cmts-count', /3/.test(mActs[1]._n.textContent || ''),
      'n=' + (mActs[1]._n || {}).textContent); // 计数被管线回写（host title 语义）
    mActs[1].click(); // 同条目再点=收起
    rec('follow-cmts-toggle', !!(await waitFor(function () {
      return !mRow.querySelector('.acsv-frow-cmts');
    }, 5000)));
    // 开新关旧互斥：A 行开着再点 B 行 → A 收 B 开
    mActs[1].click(); // A=动态正文带 UBB
    var gRow = rowOf('另一条图文动态');
    var gActs = gRow ? gRow.querySelectorAll('.acsv-fact') : [];
    if (gActs[1]) gActs[1].click();
    rec('follow-cmts-mutex', !!(await waitFor(function () {
      return !mRow.querySelector('.acsv-frow-cmts') && !!gRow.querySelector('.acsv-frow-cmts');
    }, 8000)));
    if (gActs[1]) gActs[1].click(); // 收起，防污染后续断言
    // 冒泡守卫（0.9.101 实报修复）：行内评论区内部（评论条目/输入条/表情按钮）的点击
    // 不得冒泡成行默认——0.9.100 的病灶是点一下表情按钮把评论区关掉换详情面板
    mActs[1].click();
    await waitFor(function () { return !!mRow.querySelector('.acsv-frow-cmts .acsv-citem'); }, 8000);
    var citem = mRow.querySelector('.acsv-frow-cmts .acsv-citem');
    if (citem) citem.click();
    await wait(300);
    rec('follow-cmts-no-bubble', !q('.acsv-mdetail') && !!mRow.querySelector('.acsv-frow-cmts'),
      'panel=' + !!q('.acsv-mdetail') + ' cmts=' + !!mRow.querySelector('.acsv-frow-cmts'));
    mActs[1].click(); // 收起
    // 视频行也原位展开评论（0.9.101）：stype=3（www 视频）+ sourceId=acId，不再进播放层
    var vActs = vRow.querySelectorAll('.acsv-fact');
    vActs[1].click();
    rec('follow-video-cmts', !!(await waitFor(function () {
      var box = vRow.querySelector('.acsv-frow-cmts');
      return box && box.querySelectorAll('.acsv-citem').length >= 2;
    }, 8000)));
    var vcst = TEST.call('comments');
    rec('follow-video-cmts-params', !!(vcst && vcst.stype === 3 && String(vcst.sourceId) === '488801'),
      JSON.stringify(vcst));
    // 表情面板（0.9.101 实报「表情面板打不开」）：宿主锚定后的可开性——面板在行内盒里
    // 展示（position:relative 锚，0.9.100 宿主无定位会逃逸到视图底缘；冒泡守卫挡它被关）
    var emotBtn = vRow.querySelector('.acsv-frow-cmts .acsv-cinput-emot');
    if (emotBtn) emotBtn.click();
    rec('follow-cmts-emotpanel', !!(await waitFor(function () {
      var p2 = vRow.querySelector('.acsv-frow-cmts .acsv-emotpanel');
      return p2 && p2.style.display !== 'none' && p2.offsetParent !== null;
    }, 5000)));
    if (emotBtn) emotBtn.click(); // 再点收面板
    vActs[1].click(); // 收起
    // 图标码点（0.9.101 实报「投蕉图标用错」）：原生 member-feed 四件套
    // 分享 E628 / 评论 E627 / 蕉 E62A / 赞（该行预置已赞）E660——竖刷侧栏的蕉(E2EA)与
    // 站点头部分享(E15B)都是错的（0.9.100 用错那两个）
    rec('follow-icon-codepoints', (function () {
      function cp(act) {
        var b = null;
        [].forEach.call(vRow.querySelectorAll('.acsv-fact'), function (x) { if (x._act === act) b = x; });
        var g = b && b.querySelector('.acsvg-glyph');
        return g ? g.textContent.codePointAt(0) : 0;
      }
      return cp('share') === 0xE628 && cp('comment') === 0xE627 && cp('banana') === 0xE62A && cp('like') === 0xE660;
    })(), 'share/comment/banana/like=' + (function () {
      var out = [];
      [].forEach.call(vRow.querySelectorAll('.acsv-fact'), function (x) {
        var g = x.querySelector('.acsvg-glyph');
        out.push(x._act + ':' + (g ? g.textContent.codePointAt(0).toString(16) : '?'));
      });
      return out.join(' ');
    })());
    // ---- 投蕉（0.9.104 用户口径「视频/文章=视频机制」）：数量层（点第 N 根投 N）+ 蕉黄 ----
    var vBan = null;
    [].forEach.call(vRow.querySelectorAll('.acsv-fact'), function (x) { if (x._act === 'banana') vBan = x; });
    if (vBan) vBan.click();
    rec('follow-ban-pop', !!(await waitFor(function () {
      return vRow.querySelectorAll('.acsv-banpop button').length === 5;
    }, 5000)), 'n=' + vRow.querySelectorAll('.acsv-banpop button').length);
    var popBtns = vRow.querySelectorAll('.acsv-banpop button');
    if (popBtns[2]) popBtns[2].dispatchEvent(new MouseEvent('mouseenter'));
    rec('follow-ban-hover', (function () {
      if (popBtns.length !== 5) return false;
      var src = [].map.call(popBtns, function (b) { return (b._img || {}).src || ''; });
      // 悬停第 3 根：1~3 一起亮（banana_hover），4/5 仍灰（视频页原生交互）
      return /banana_hover/.test(src[0]) && /banana_hover/.test(src[2])
        && !/banana_hover/.test(src[3]) && !/banana_hover/.test(src[4]);
    })(), (function () {
      return [].map.call(popBtns, function (b) { return /hover/.test((b._img || {}).src || '') ? 'L' : 'G'; }).join('');
    })());
    if (popBtns[2]) popBtns[2].click(); // 点第 3 根投 3
    rec('follow-ban-applied', !!(await waitFor(function () {
      return vBan.classList.contains('thrown') && vBan._n.textContent === '8';
    }, 5000)), 'n=' + vBan._n.textContent);
    // 蕉黄 = A 站蕉色 #ffb323（与竖刷 rail .thrown 同源；0.9.104 实报「已投蕉的颜色是黄的」）
    rec('follow-ban-yellow', getComputedStyle(vBan).color === 'rgb(255, 179, 35)',
      getComputedStyle(vBan).color);
    rec('follow-ban-video-rt', /resourceType=2/.test(window.__ACSV_BAN_BODY__ || '')
      && /count=3/.test(window.__ACSV_BAN_BODY__ || ''), window.__ACSV_BAN_BODY__);
    // 已投过不可再展开（rail 同款语义：toast 提示，不弹层）
    if (vBan) vBan.click();
    await wait(200);
    rec('follow-ban-locked', !vRow.querySelector('.acsv-banpop'));
    // 文章行：同款数量层 + resourceType=3（enum 一致，未实测标注在 interact）
    var aBan = null;
    [].forEach.call(aRow.querySelectorAll('.acsv-fact'), function (x) { if (x._act === 'banana') aBan = x; });
    if (aBan) aBan.click();
    await waitFor(function () { return aRow.querySelectorAll('.acsv-banpop button').length === 5; }, 5000);
    var aPop = aRow.querySelectorAll('.acsv-banpop button');
    if (aPop[1]) aPop[1].click(); // 投 2
    rec('follow-ban-article', !!(await waitFor(function () {
      return aBan.classList.contains('thrown') && aBan._n.textContent === '9';
    }, 5000)), 'n=' + aBan._n.textContent);
    rec('follow-ban-article-rt', /resourceType=3/.test(window.__ACSV_BAN_BODY__ || '')
      && /count=2/.test(window.__ACSV_BAN_BODY__ || ''), window.__ACSV_BAN_BODY__);
    // ---- 多图行：九宫格原生形制（默认容器 342、3 格 110 方）----
    rec('follow-moment-multigrid', !!(gRow && gRow.querySelector('.acsv-frow-imgs:not(.n1):not(.n24)')
      && gRow.querySelectorAll('.acsv-frow-img').length === 3),
      gRow ? 'cells=' + gRow.querySelectorAll('.acsv-frow-img').length : 'no-row');
    // 宫格图点击 → 大图查看（0.9.102：格子自挂 momentCellOf，委托分支已删防双开）
    var gCell = gRow && gRow.querySelector('.acsv-frow-imgs .acsv-frow-img');
    if (gCell) gCell.click();
    rec('follow-grid-imgview', !!(await waitFor(function () { return !!q('.acsv-imgview img'); }, 5000)));
    key('Escape');
    rec('follow-grid-imgview-close', !!(await waitFor(function () { return !q('.acsv-imgview'); }, 5000)));
    // ---- 转发行（0.9.102 完全照原生）：引用卡 = @源UP 行 + 完整源内容卡 ----
    var rRow = rowOf('转发视频的动态');
    rec('follow-repost-quote', !!(rRow
      && (rRow.querySelector('.acsv-gquote-upname') || {}).textContent === '@源UP甲'
      && (rRow.querySelector('.acsv-gquote-upname') || {}).getAttribute
      && rRow.querySelector('.acsv-gquote-upname').getAttribute('href') === 'https://www.acfun.cn/u/9001'
      && rRow.querySelector('.acsv-gquote .acsv-frow-strip') // 内嵌完整源卡（与行内同款构建件）
      && /被转发的视频标题/.test((rRow.querySelector('.acsv-gquote .acsv-frow-stitle') || {}).textContent || '')
      && (rRow.querySelector('.acsv-gquote .acsv-frow-mdur') || {}).textContent === '01:23'
      && /1234/.test((rRow.querySelector('.acsv-gquote .acsv-frow-sinfo') || {}).textContent || '')),
      rRow ? (rRow.querySelector('.acsv-gquote') || {}).textContent : 'no-row');
    // 转发动态（rs10）：@源UP + 源正文 UBB 单源渲染（at 出链）+ 无源卡 strip
    var rRow3 = rowOf('更早的动态');
    rec('follow-repost-moment', !!(rRow3
      && (rRow3.querySelector('.acsv-gquote-upname') || {}).textContent === '@源UP乙'
      && rRow3.querySelector('.acsv-gquote-textbody a.ubb-at')
      && /被转发的动态正文/.test((rRow3.querySelector('.acsv-gquote-textbody') || {}).textContent || '')
      && !rRow3.querySelector('.acsv-gquote .acsv-frow-strip')),
      rRow3 ? (rRow3.querySelector('.acsv-gquote') || {}).textContent : 'no-row');
    // 引用块可点（0.9.101 实报「点转发的内容小卡不会打开播放」）：三落点分别验证——
    // 视频源→播放层（直挂缝）、文章源→官方页新窗（window.open 桩）、动态源→详情面板
    window.__ACSV_MOCK_DIRECT__ = { '488900': 1 };
    var qVideo = rRow.querySelector('.acsv-gquote');
    if (qVideo) qVideo.click();
    // 等待条件必须钉**播放层真挂载**：hash 是 openPlayer 同步写的、.acsv-slide 在舞台里
    // 本来就有（竖刷的 slide）——只看这两样会同步通过，case 抢在 hashchange 处理前按
    // Escape，播放层从未挂载、关注视图反被关掉（0.9.101 首跑实锤：后续断言全打在游离
    // DOM 上假绿）。view==='play' + data-ovl 哨兵才是「层已建」的可观测面
    rec('follow-quote-play', !!(await waitFor(function () {
      return location.hash === '#svfeed/play/a/488900' && TEST.call('view') === 'play'
        && !!q('.acsv-slide[data-ovl="1"]');
    }, 10000)), location.hash + ' view=' + TEST.call('view'));
    key('Escape');
    // 返回同理钉「视图真恢复」：backFromOrigin 同步改 hash，但 enterView('follow') 在
    // 随后的 hashchange 里才跑——只等 hash 会在恢复完成前抢跑
    rec('follow-quote-back', !!(await waitFor(function () {
      return location.hash === '#svfeed/follow' && TEST.call('view') === 'follow'
        && !q('.acsv-view-held');
    }, 8000)), location.hash + ' view=' + TEST.call('view'));
    var rRow2 = rowOf('转发文章的动态');
    window.__ACSV_LAST_OPEN__ = '';
    window.open = function (u) { window.__ACSV_LAST_OPEN__ = String(u); return null; };
    var qArt = rRow2 && rRow2.querySelector('.acsv-gquote');
    if (qArt) qArt.click();
    rec('follow-quote-article', /\/a\/ac488700$/.test(window.__ACSV_LAST_OPEN__ || ''),
      window.__ACSV_LAST_OPEN__);
    var qMom = rRow3.querySelector('.acsv-gquote');
    if (qMom) qMom.click();
    rec('follow-quote-moment', !!(await waitFor(function () {
      var md = TEST.call('momentdetail');
      return md && md.open === true && md.momentId === 510091;
    }, 8000)), JSON.stringify(TEST.call('momentdetail')));
    key('Escape');
    await waitFor(function () { return !q('.acsv-mdetail'); }, 8000);
    // ---- 展开/收起：溢出才挂按钮（rAF 探测），点击切换钳高 ----
    var longRow = rowOf('无图动态');
    rec('follow-expand-armed', !!(longRow && longRow.querySelector('.acsv-fmore') !== null
      && longRow.querySelector('.acsv-frow-text').classList.contains('clamp')),
      longRow ? 'more=' + !!longRow.querySelector('.acsv-fmore') : 'no-row');
    if (longRow) longRow.querySelector('.acsv-fmore').click();
    rec('follow-expand-open', !!(longRow && !longRow.querySelector('.acsv-frow-text').classList.contains('clamp')
      && longRow.querySelector('.acsv-fmore').textContent === '收起'));
    if (longRow) longRow.querySelector('.acsv-fmore').click();
    rec('follow-expand-closed', !!(longRow && longRow.querySelector('.acsv-frow-text').classList.contains('clamp')
      && longRow.querySelector('.acsv-fmore').textContent === '展开'));
    // ---- 无限滚动：触底翻页（append-only）+ 三态状态行 + 回顶按钮 ----
    var body = q('.acsv-view-body');
    rec('follow-status-idle', (q('.acsv-fstatus') || {}).textContent === '');
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new Event('scroll'));
    rec('follow-page2', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length === 23;
    }, 8000)), 'n=' + document.querySelectorAll('.acsv-mewrap .acsv-frow').length
      + ' calls=' + window.__ACSV_FOLLOW_CALLS__);
    // 第二页 4 条（< pageSize）→ followFeedV2 回空游标 → 到底：状态行终态文案（借鉴广场）
    rec('follow-status-done', (q('.acsv-fstatus') || {}).textContent === '已加载全部动态',
      (q('.acsv-fstatus') || {}).textContent);
    // 回顶按钮：滚过了阈值才现身（backTopAt=300）
    rec('follow-backtop-on', !!(await waitFor(function () {
      return q('.acsv-fbacktop').classList.contains('on');
    }, 3000)));
    // append-only 不变式的可观测面：翻页后首行仍是原首行（整列表未重建）
    rec('follow-append-only', new RegExp('关注视频甲').test(
      (document.querySelectorAll('.acsv-mewrap .acsv-frow')[0] || {}).textContent || ''));
    // 动态行点击 → 原地详情面板（0.9.96 交互沿用；面板内断言归 detail-open 场景）
    var mRow2 = rowOf('另一条图文动态');
    if (mRow2) mRow2.click();
    rec('follow-detail-open', !!(await waitFor(function () {
      return !!q('.acsv-mdetail .acsv-mdetail-panel');
    }, 8000)));
    key('Escape');
    rec('follow-detail-close', !!(await waitFor(function () {
      return !q('.acsv-mdetail');
    }, 8000)));
    // Esc 回竖刷（普通 dock 视图语义：收旧 + 回舞台）
    await wait(400);
    key('Escape');
    rec('follow-esc-to-feed', !!(await waitFor(function () {
      return /^#svfeed(\/(?:[va])?\d+)?$/.test(location.hash) && q('.acsv-view') === null;
    }, 8000)), location.hash);
  };

  // ---- 动态详情面板（0.9.96）：卡点击原地展开 + 评论区管线复用（stype=4）+ 写链乐观回滚 ----
  // 同槽互斥的「面板收回抽屉」半向由 view-follow 之外的抽屉场景语境覆盖成本高，此处钉
  // 可观测不变量：面板开着时抽屉 open=false（TEST.call('comments')），模态层 'comments:m' 在栈
  C['detail-open'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key, TEST = h.TEST;
    // 评论管线在 __ACSV_MOCK__ 真值时走内置 mockComments（feed-sample 全局夹具）——本场景
    // 要测的是**定向端点桩**（真实请求形状），先摘掉它；每场景独立页面，无需恢复
    delete window.__ACSV_MOCK__;
    // 评论/写链 mock：token 桩 + 定向端点桩（mockHit 按 url 子串命中）；
    // __ACSV_LIKE_FAIL__ 切 interact add/delete 失败测回滚
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'token/get': function () { return { result: 0, 'acfun.midground.api_st': 'mock-st' }; },
      'comment/list': function () {
        return { result: 0, commentCount: 3, curPage: 1, totalPage: 1, pcursor: 'no_more',
          hotComments: [],
          rootComments: [
            { commentId: 'c1', userId: 21, userName: '测试员甲', headUrl: '', content: '详情面板首条评论', postDate: '1分钟前', likeCount: 2, isLike: false, subCommentCount: 0 },
            { commentId: 'c2', userId: 22, userName: '测试员乙', headUrl: '', content: '第二条', postDate: '2分钟前', likeCount: 0, isLike: false, subCommentCount: 0 }
          ],
          subCommentsMap: {} };
      },
      'comment/add': function (body) {
        if (window.__ACSV_CMT_FAIL__) return { result: 1, error_msg: 'mock 失败' };
        var txt = '';
        try { txt = decodeURIComponent((String(body).match(/content=([^&]*)/) || [])[1] || ''); } catch (e) { }
        return { result: 0, commentId: 'c9', userId: 99, userName: 'name_xxl', headUrl: '', content: txt, postDate: '刚刚', likeCount: 0 };
      },
      'interact/add': function () { return { result: window.__ACSV_LIKE_FAIL__ ? 0 : 1 }; },
      'interact/delete': function () { return { result: window.__ACSV_LIKE_FAIL__ ? 0 : 1 }; }
    });
    location.hash = 'svfeed/follow';
    rec('detail-feed-open', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length === 19;
    }, 10000)));
    // 点动态卡（无图那条正文唯一）→ 面板原地展开
    var cards = document.querySelectorAll('.acsv-mewrap .acsv-frow');
    var mCard = null;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].matches('.acsv-frow') && /无图动态/.test(cards[i].textContent)) { mCard = cards[i]; break; }
    }
    rec('detail-moment-card', !!mCard);
    if (mCard) mCard.click();
    rec('detail-panel-open', !!(await waitFor(function () {
      return !!q('.acsv-mdetail .acsv-mdetail-panel') && !!q('.acsv-mdetail-list .acsv-cpin');
    }, 8000)));
    // 正文 pin 在列表首位且评论区加载后仍在（管线 reset 重挂——防「清列表冲掉正文」哨兵）
    rec('detail-text-pin', !!(await waitFor(function () {
      return /无图动态/.test((q('.acsv-mdetail-list .acsv-cpin .acsv-mdetail-text') || {}).textContent || '');
    }, 8000)));
    // 评论区管线复用：stype=4 + sourceId=momentId（510005 = 夹具 fMoment(4)）+ 面板非抽屉
    rec('detail-comments-type', !!(await waitFor(function () {
      var c = TEST.call('comments');
      return c && c.open === false && c.stype === 4 && String(c.sourceId) === '510005';
    }, 8000)), JSON.stringify(TEST.call('comments')));
    rec('detail-comments-list', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mdetail-list .acsv-citem').length >= 2;
    }, 8000)), 'n=' + document.querySelectorAll('.acsv-mdetail-list .acsv-citem').length);
    // 计数标题 = commentCount（含楼中楼口径，§4.7 坑②的契约化）
    // 标题文案走 titleFmt（0.9.103 XHS 式「共 N 条评论」）
    rec('detail-comments-title', /共\s*3\s*条评论/.test((q('.acsv-mdetail-cmt') || {}).textContent || ''));
    // 单栏态（无图动态）：不得出现两栏媒体列（按内容型换布局——0.9.103 裁决）
    rec('detail-single-no-media', !q('.acsv-mdetail-split') && !q('.acsv-mdetail-media')
      && !!q('.acsv-mdetail-panel .acsv-mdetail-head'));
    // 互动栏：赞乐观 +1（mock add 成功）→ 再点取消（delete 成功）。点击间留一拍：
    // 乐观态是同步的、likeBusy 复位在异步 then——连点会被 busy 守卫吞掉（非产品 bug）
    var like = q('.acsv-mdl-like');
    rec('detail-like-init', !!like && !like.classList.contains('on') && /14/.test(like.textContent));
    if (like) like.click();
    rec('detail-like-on', !!(await waitFor(function () {
      var l = q('.acsv-mdl-like');
      return l && l.classList.contains('on') && /15/.test(l.textContent);
    }, 5000)));
    await wait(120);
    if (like) like.click();
    rec('detail-like-off', !!(await waitFor(function () {
      var l = q('.acsv-mdl-like');
      return l && !l.classList.contains('on') && /14/.test(l.textContent);
    }, 5000)));
    // 失败回滚：mock 切失败 → 乐观 +1 后整体退回（计数与点亮态一并，rail 同款）
    window.__ACSV_LIKE_FAIL__ = true;
    await wait(120);
    if (like) like.click();
    rec('detail-like-rollback', !!(await waitFor(function () {
      var l = q('.acsv-mdl-like');
      return l && !l.classList.contains('on') && /14/.test(l.textContent);
    }, 5000)));
    window.__ACSV_LIKE_FAIL__ = false;
    // 发评论乐观上屏：新评论紧跟正文 pin（无热门段 → pin 后第一条），标题计数 +1
    var inp = q('.acsv-mdetail-panel .acsv-cinput-text');
    rec('detail-input-present', !!inp);
    if (inp) {
      inp.value = '详情面板的测试评论';
      var send = q('.acsv-mdetail-panel .acsv-cinput-send');
      if (send) send.click();
    }
    rec('detail-comment-inserted', !!(await waitFor(function () {
      var pin2 = q('.acsv-mdetail-list .acsv-cpin');
      var first = pin2 && pin2.nextElementSibling;
      return first && first.classList.contains('acsv-citem')
        && /详情面板的测试评论/.test(first.textContent)
        && /共\s*4\s*条评论/.test((q('.acsv-mdetail-cmt') || {}).textContent || '');
    }, 8000)), 'n=' + document.querySelectorAll('.acsv-mdetail-list .acsv-citem').length);
    // 表情面板（4.2）：节点挂面板宿主（display:none 待开）；输入条在面板内（宿主迁移）
    rec('detail-emotpanel', !!q('.acsv-mdetail-panel > .acsv-emotpanel'));
    rec('detail-input-in-panel', !!q('.acsv-mdetail-panel .acsv-cinput'));
    // Esc 关面板（模态层顶）→ 面板拆净、宿主复位、栈回到视图层
    key('Escape');
    rec('detail-esc-close', !!(await waitFor(function () {
      var md = TEST.call('momentdetail');
      return !q('.acsv-mdetail') && md && md.open === false;
    }, 8000)));
    // 重开：输入条宿主再迁移回来（复用第二向——面板↔抽屉/面板↔面板的搬移路径）
    if (mCard) mCard.click();
    rec('detail-reopen-input', !!(await waitFor(function () {
      return !!q('.acsv-mdetail-panel .acsv-cinput');
    }, 8000)));
    key('Escape');
    await wait(400);
    // 多图动态详情（0.9.98）：正文后出九宫格（data-n=3），点格开大图——imgview 是独立
    // 模态层（先关图层、面板留存），再 Esc 收面板复位
    var gCard = null;
    for (var gi = 0; gi < cards.length; gi++) {
      if (cards[gi].matches('.acsv-frow') && /另一条图文动态/.test(cards[gi].textContent)) { gCard = cards[gi]; break; }
    }
    rec('detail-multigrid-card', !!gCard);
    if (gCard) gCard.click();
    // 两栏态（0.9.103 XHS 式）：split 类 + 左媒体列 + 右内容栏；宫格在**媒体列**内
    rec('detail-split-layout', !!(await waitFor(function () {
      return !!q('.acsv-mdetail-panel.acsv-mdetail-split')
        && !!q('.acsv-mdetail-media') && !!q('.acsv-mdetail-side')
        && !!q('.acsv-mdetail-side .acsv-mdetail-head');
    }, 8000)));
    rec('detail-multigrid', !!(await waitFor(function () {
      var g = q('.acsv-mdetail-media .acsv-mdetail-imgs');
      return g && g.dataset.n === '3' && g.querySelectorAll('img').length === 3;
    }, 8000)), 'n=' + document.querySelectorAll('.acsv-mdetail-imgs img').length);
    // 输入条与表情面板落**右栏**（管线 host.el=side：append 到 h.el 末尾=贴右栏底）
    rec('detail-side-input', !!(await waitFor(function () {
      return !!q('.acsv-mdetail-side .acsv-cinput');
    }, 8000)));
    var cell0 = q('.acsv-mdetail-imgs .acsv-mdetail-imgcell');
    if (cell0) cell0.click();
    rec('detail-imgview', !!(await waitFor(function () {
      return !!q('.acsv-imgview img');
    }, 5000)));
    key('Escape');
    rec('detail-imgview-close', !!(await waitFor(function () {
      return !q('.acsv-imgview') && !!q('.acsv-mdetail'); // 图层关、面板留存（模态栈分层）
    }, 5000)));
    key('Escape');
    rec('detail-multigrid-close', !!(await waitFor(function () {
      var md = TEST.call('momentdetail');
      return !q('.acsv-mdetail') && md && md.open === false;
    }, 8000)));
    await wait(400);
  };

  // ---- 关注未读徽标（0.9.97，4.3）：webPush 桩驱动 poll 状态机——计数/回落/翻倍/进视图不打扰 ----
  C['badge-poll'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key, TEST = h.TEST;
    // harness 页无登录 cookie：设假 auth_key（selfUid 只读前缀数字段）
    document.cookie = 'auth_key=51737407_x; path=/';
    var unread = [true, true, false, false, false]; // 2 真 3 假（§2.1.1 实测布尔有假值）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'feed/webPush': function () {
        return {
          result: 0,
          followUpers: unread.map(function (u, i) {
            return { userId: 100 + i, name: 'UP' + i, headUrl: '', hasUnReadResource: u };
          })
        };
      }
    });
    location.hash = 'svfeed';
    rec('badge-feed-open', !!(await waitFor(function () { return !!q('.acsv-dock'); }, 10000)));
    rec('badge-mounted', !!(TEST.call('followbadge') || {}).mounted);
    // 首查：2 未读 → 徽标 2；发现新内容 → 间隔回落基准 60s
    await TEST.call('followbadge').poll();
    rec('badge-shows-2', !!(await waitFor(function () {
      var b = q('.acsv-dock-item[data-view="follow"] .acsv-dock-badge');
      return b && b.textContent === '2' && b.style.display === 'block';
    }, 5000)));
    rec('badge-interval-base', TEST.call('followbadge').interval === 60000,
      'interval=' + TEST.call('followbadge').interval);
    // 空手 → 徽标清 + 逐次翻倍（60→120→240）
    unread = [false, false, false, false, false];
    await TEST.call('followbadge').poll();
    rec('badge-cleared', !!(await waitFor(function () {
      var b = q('.acsv-dock-item[data-view="follow"] .acsv-dock-badge');
      return b && b.style.display === 'none';
    }, 5000)));
    rec('badge-interval-120', TEST.call('followbadge').interval === 120000,
      'interval=' + TEST.call('followbadge').interval);
    await TEST.call('followbadge').poll();
    rec('badge-interval-240', TEST.call('followbadge').interval === 240000,
      'interval=' + TEST.call('followbadge').interval);
    // 再发现新内容 → 回落基准（从 240 档直接跳回 60，不沿用退避档）
    unread = [true, false, false, false, false];
    await TEST.call('followbadge').poll();
    rec('badge-shows-1', !!(await waitFor(function () {
      var b = q('.acsv-dock-item[data-view="follow"] .acsv-dock-badge');
      return b && b.textContent === '1';
    }, 5000)));
    rec('badge-interval-reset-again', TEST.call('followbadge').interval === 60000,
      'interval=' + TEST.call('followbadge').interval);
    // 进关注视图不打扰：未读仍真，但 poll 不点亮（stateless 路由判据）
    location.hash = 'svfeed/follow';
    rec('badge-follow-view', !!(await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null;
    }, 8000)));
    unread = [true, true, true, false, false];
    await TEST.call('followbadge').poll();
    await wait(300);
    rec('badge-suppressed-in-view', (function () {
      var b = q('.acsv-dock-item[data-view="follow"] .acsv-dock-badge');
      return b && b.style.display === 'none';
    })());
    key('Escape');
    await wait(400);
  };

  // ---- follow-videos（0.9.99）：关注语境「视频」侧——顶栏 seg → FollowVideos 上下文 →
  // 宿主竖刷舞台深链接管 + 按列表顺序泵入 + seg「全部」确定性回路 + 原地续看不重置缓冲 ----
  C['follow-videos'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key,
      TEST = h.TEST, feed = h.feed, firstVideoReady = h.firstVideoReady;
    window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__; // 含 followDougaFeed/douga/info/playInfo 桩
    // 深链首条走直挂缝（play-cold 同款）：webm 非 m3u8，套 hls.js 会死在解析上
    window.__ACSV_MOCK_DIRECT__ = { '488911': 1 };
    location.hash = 'svfeed/follow';
    rec('fv-view-open', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length >= 19;
    }, 10000)));
    // seg 语境可见、默认「全部」高亮
    var segAll = q('.acsv-seg-follow .acsv-seg-btn:nth-child(2)');
    rec('fv-seg-ctx', !!segAll && segAll.classList.contains('on'));
    // 点「视频」→ 深链首条接管舞台（夹具页1 首条 = 488911）
    q('.acsv-seg-follow .acsv-seg-btn:nth-child(1)').click();
    rec('fv-deeplink', !!(await waitFor(function () {
      return location.hash === '#svfeed/a/488911';
    }, 10000)), location.hash);
    rec('fv-first-item', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && String(f.items[0].id) === '488911';
    }, 10000)), 'id=' + (feed() && feed().items[0] ? feed().items[0].id : 'n/a'));
    rec('fv-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
    // FollowVideos 上下文：后台链把两页拉满（10+4、done），泵游标从 1 起（首条已深链置顶）
    rec('fv-ctx', !!(await waitFor(function () {
      var st = TEST.call('followstream');
      return st && st.feedActive === true && st.count >= 14 && st.done === true;
    }, 8000)), JSON.stringify(TEST.call('followstream')));
    // 按列表顺序泵入：第二槽位 = 列表第二条（488912），不是随机流
    rec('fv-pump-order', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[1] && String(f.items[1].id) === '488912';
    }, 10000)), 'id2=' + (feed() && feed().items[1] ? feed().items[1].id : 'n/a'));
    rec('fv-slides', document.querySelectorAll('.acsv-slide').length >= 2,
      'n=' + document.querySelectorAll('.acsv-slide').length);
    // 深链态视图已退：语境由 feedActive 顶住，seg 高亮切「视频」
    rec('fv-seg-videos', !!(await waitFor(function () {
      var b = q('.acsv-seg-follow .acsv-seg-btn:nth-child(1)');
      return b && b.classList.contains('on');
    }, 5000)));
    // 源切换 seg（小视频/推荐）在关注流舞台态隐藏（0.9.104 实报「切视频冒出小视频/推荐栏」）
    rec('fv-srcseg-hidden', (function () {
      var sg = q('.acsv-top .acsv-seg:not(.acsv-seg-follow)');
      return !!sg && sg.style.display === 'none';
    })(), (function () {
      var sg = q('.acsv-top .acsv-seg:not(.acsv-seg-follow)');
      return sg ? (sg.style.display || '(empty)') : 'no-seg';
    })());
    // seg「全部」= 确定性回路：回关注视图，行流还在
    q('.acsv-seg-follow .acsv-seg-btn:nth-child(2)').click();
    rec('fv-back-all', !!(await waitFor(function () {
      return location.hash === '#svfeed/follow'
        && document.querySelectorAll('.acsv-mewrap .acsv-frow').length >= 19;
    }, 10000)), location.hash);
    // 再点「视频」= 原地续（缓冲不重置：条数不涨、地址跳回当前条）
    var lenBefore = (feed() || { items: [] }).items.length;
    q('.acsv-seg-follow .acsv-seg-btn:nth-child(1)').click();
    rec('fv-resume', !!(await waitFor(function () {
      return location.hash === '#svfeed/a/488911';
    }, 10000)), location.hash);
    rec('fv-resume-keeps-buffer', (feed() || { items: [] }).items.length === lenBefore,
      'before=' + lenBefore + ' after=' + (feed() ? feed().items.length : 'n/a'));
    // seg 显隐收紧（0.9.102 裁决）：仅「关注视图开」或「舞台态+关注流激活」——进「我的」等
    // dock 视图即隐（语境判据不是流活动）；Esc 回舞台（feedActive 仍在）恢复可见
    location.hash = 'svfeed/my';
    rec('fv-seg-hidden-in-view', !!(await waitFor(function () {
      var fe = q('.acsv-seg-follow');
      return fe && fe.style.display === 'none' && TEST.call('view') === 'my';
    }, 8000)), 'display=' + (q('.acsv-seg-follow') || {}).style.display);
    key('Escape');
    rec('fv-seg-back-on-stage', !!(await waitFor(function () {
      var fe = q('.acsv-seg-follow');
      return fe && fe.style.display !== 'none' && TEST.call('view') === null;
    }, 8000)), 'display=' + (q('.acsv-seg-follow') || {}).style.display);
    key('Escape');
    await wait(400);
  };
})();
