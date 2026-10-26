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
window.__ACSV_MOCK_DIRECT__ = { '488900': { date: window.__ACSV_PUBLISH_DATE__ } }; // 直挂缝：webm 套 hls.js 会死在解析上（date 按发布时刻口径给，见 play-date-published）
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
// 日期槽口径（0.9.85）：站方 UP 空间页展示的是"发布时刻"（douga/info 的 createTimeMillis），
// 而顶层 createTime 只是**展示串**（近期稿件是 "24小时前" 这种相对文案）。夹具特意把两者
// 摆成互不相同的诱饵——若实现回退去读 createTime（旧实现 slice(0,10)）或误用 uploadTime，
// 这里就会看到 "24小时前" 或别的值；正确实现应出本地时区的 YYYY-MM-DD
rec('play-date-published', (function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-meta .acsv-date');
  return !!d && d.textContent === window.__ACSV_PUBLISH_DATE__
    && d.textContent !== '24小时前';
})(), (function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-meta .acsv-date');
  return d ? JSON.stringify(d.textContent) + ' 期望=' + window.__ACSV_PUBLISH_DATE__ : 'no-date';
})());
// 层内右栏箭头（0.9.173 口径变更）：深链/刷新**无来源列表** ⇒ 会话=walk（相关池续命），
// 箭头随会话建——▲ 首条隐藏、▼ 在（旧 0.9.74「层内一律不建箭头」已被用户裁决取代；
// 「单条不出箭头」的新钉子移到 layer-list 的 ll-follow-single：动态里的视频卡片）
rec('play-arrows-walk', (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  var up = s && s.querySelector('.acsv-arrow-up'), dn = s && s.querySelector('.acsv-arrow-down');
  return !!up && !!dn && up.style.display === 'none' && dn.style.display !== 'none';
})(), (function () {
  var s = q('.acsv-slide[data-ovl="1"]');
  return 'up=' + !!(s && s.querySelector('.acsv-arrow-up')) + ' dn=' + !!(s && s.querySelector('.acsv-arrow-down'));
})());
// 分享上报（0.9.145 实报：点分享不上报）：官方口径=面板里**选平台**那一刻发 CHOOSE_SHARE_PLATFORM（weblog CLICK 通道，与观看历史同一条）。
// 层内条目已 resolve（上方日期/标题已从 douga/info 后归）⇒ videoId 就绪；断言只看参数形状（不硬编码 id）
var shBtn = q('.acsv-slide[data-ovl="1"] .acsv-rail-btn[title="私信分享给朋友"]');
if (shBtn) shBtn.click();
rec('play-share-pop', !!(await waitFor(function () { return !!q('.acsv-sharepop'); }, 6000)));
// 外点收起（0.9.147）：先点面板内部、再点外面（控件条）必须收
var shInside = q('.acsv-sharepop .acsv-share-tip') || q('.acsv-sharepop .acsv-share-list') || q('.acsv-sharepop');
if (shInside) shInside.click();
await wait(200);
rec('play-share-inside-keeps', !!q('.acsv-sharepop'));
var ctlBar2 = q('.acsv-controls');
if (ctlBar2) ctlBar2.click();
rec('play-share-outside-close', !!(await waitFor(function () { return !q('.acsv-sharepop'); }, 5000)));
if (shBtn) shBtn.click(); // 重开（后续复制链接上报断言用）
await waitFor(function () { return !!q('.acsv-sharepop'); }, 6000);
var wl0 = (window.__WL_CALLS || []).length;
var cpBtn = q('.acsv-sharepop .acsv-share-copy');
if (cpBtn) cpBtn.click();
rec('play-share-report', (function () {
  var calls = (window.__WL_CALLS || []).slice(wl0).filter(function (c) {
    return c.payload && c.payload.action === 'CHOOSE_SHARE_PLATFORM';
  });
  if (calls.length !== 1) return false;
  var p = calls[0].payload.params || {};
  return calls[0].channel === 'CLICK' && p.to_platform === 'COPY_LINK' && p.share_type === 'link'
    && p.resourceType === 'video' && p.cont_type === 'douga_atom' && p.content_type === 'douga_atom'
    && p.ac_id === '488900' && p.parent_content_id === '488900'
    && p.atom_id && p.atom_id === p.content_id && p.atom_id !== p.ac_id // atom_id ≠ ac_id（不拿 acId 冒充）
    && p.content_episode === 1 && p.album_id === '0'
    && p.req_id === 'req-mock' && p.group_id === 'grp-mock' && !!p.title;
})(), JSON.stringify((window.__WL_CALLS || []).slice(wl0).map(function (c) { return c.payload; })));
if (shBtn) shBtn.click(); // 同键再点=收面板（toggle）
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
// 0.9.235 层内控制三件（层内 slide 不在 scroller 里，旧写法全打空）：
// ① 倍速菜单改层内视频（菜单按钮与清晰度同 class，按文案「倍速」找）
var ovlV2 = q('.acsv-slide[data-ovl="1"] video');
var rateBtn = null;
Array.prototype.forEach.call(document.querySelectorAll('.acsv-slide[data-ovl="1"] .acsv-cq'), function (b) {
  if (/^倍速/.test(b.textContent || '')) rateBtn = b;
});
rec('ctl-rate-btn', !!rateBtn, rateBtn ? rateBtn.textContent : 'none');
if (rateBtn && ovlV2) {
  rateBtn.click();
  var rateItems = document.querySelectorAll('.acsv-qmenu .acsv-qitem');
  var pick2 = null;
  Array.prototype.forEach.call(rateItems, function (it) { if (/^2\.0x/.test(it.textContent)) pick2 = it; });
  if (pick2) pick2.click();
  await wait(200);
  rec('ctl-layer-rate-applied', ovlV2.playbackRate === 2, 'rate=' + ovlV2.playbackRate);
  rateBtn.click(); // 还原 1x（重开菜单后重取条目——旧引用已随菜单移除失联）
  await wait(80);
  var pick1 = null;
  Array.prototype.forEach.call(document.querySelectorAll('.acsv-qmenu .acsv-qitem'), function (it) {
    if (/^1\.0x/.test(it.textContent)) pick1 = it;
  });
  if (pick1) pick1.click();
  await wait(200);
  rec('ctl-layer-rate-restored', ovlV2.playbackRate === 1, 'rate=' + ovlV2.playbackRate);
}
// ② 长按 →2x、松手恢复（恢复走 applyRate 全舞台）
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
await wait(500); // > hold(350ms) 进入长按态
rec('ctl-hold-2x', !!(ovlV2 && ovlV2.playbackRate === 2), 'rate=' + (ovlV2 && ovlV2.playbackRate));
window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
await wait(200);
rec('ctl-hold-restored', !!(ovlV2 && ovlV2.playbackRate === 1), 'rate=' + (ovlV2 && ovlV2.playbackRate));
// ③ 层内弹幕开关：只翻层内按钮/图层（播放层开着时"当前条"=层内那条，不得打 FeedStore.current）
var ovlDmBtn = q('.acsv-slide[data-ovl="1"] .acsv-cdm');
rec('ctl-dm-btn', !!ovlDmBtn);
if (ovlDmBtn) {
  var ovlSlide = q('.acsv-slide[data-ovl="1"]');
  var running0 = !!(ovlSlide._dmLayer && ovlSlide._dmLayer.isRunning && ovlSlide._dmLayer.isRunning());
  ovlDmBtn.click();
  await wait(250);
  var running1 = !!(ovlSlide._dmLayer && ovlSlide._dmLayer.isRunning && ovlSlide._dmLayer.isRunning());
  rec('ctl-dm-layer-off', !ovlDmBtn.classList.contains('on') && running0 && !running1,
    'on=' + ovlDmBtn.classList.contains('on') + ' run=' + running0 + '->' + running1);
  ovlDmBtn.click();
  await wait(250);
  rec('ctl-dm-layer-on', ovlDmBtn.classList.contains('on')
    && !!(ovlSlide._dmLayer && ovlSlide._dmLayer.isRunning && ovlSlide._dmLayer.isRunning()),
    'on=' + ovlDmBtn.classList.contains('on'));
}
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
// 层内游走（0.9.170）：导航键改打**层内锚**——↓ = 相关池抽下一条（竖刷仍一动不能动）、
// ↑ = 回上一条（入口 488900）。旧口径「层内 ↓ 什么都不做」已被用户裁决取代；幽灵音频防线
// 的本意（竖刷不被层内按键带动）由上面的 play-key-nonav 继续钉住
rec('play-key-layer-step', !!(await waitFor(function () {
  var pl = TEST.call('playlayer') || {};
  return pl.active && Number(pl.id) !== 488900;
}, 8000)), JSON.stringify(TEST.call('playlayer')));
key('ArrowUp');
rec('play-key-layer-back', !!(await waitFor(function () {
  var pl = TEST.call('playlayer') || {};
  var v = q('.acsv-slide[data-ovl="1"] video');
  return pl.active && Number(pl.id) === 488900 && !!v && !v.paused;
}, 20000)), JSON.stringify(TEST.call('playlayer')));
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
// 抽屉接线自附（0.9.118）：关闭键由 comments 首次打开时自绑（不再由 slide 建壳时挂）——
// 点击必须能关（哨兵：自附未执行=静默死键；列表委托与之同一次自附调用，同源可证）
var dcls = q('.acsv-drawer-close');
if (dcls) dcls.click();
rec('play-drawer-close-btn', !!(await waitFor(function () {
  var r = q('#acsv-root');
  return !!r && !r.classList.contains('acsv-with-comments');
}, 6000)));
key('c'); // 重开（铺路后续 c 键关闭断言）
rec('play-comments-reopen', !!(await waitFor(function () {
  var r = q('#acsv-root');
  return !!r && r.classList.contains('acsv-with-comments');
}, 6000)));
// 0.9.190 头像框不裁：评论行左右内边距 ≥15（框 80×70 偏移 −15 的左溢出量）；有框的评论其
// 框左缘不得越过行左缘。摘 .acsv-citem 的 padding ⇒ 两条转红（lint/反跑口径见 CHANGELOG）
rec('play-cmt-pad15', !!(await waitFor(function () {
  var it = q('.acsv-drawer-list .acsv-citem');
  return it && Math.round(parseFloat(getComputedStyle(it).paddingLeft)) >= 15;
}, 6000)), (function () {
  var it = q('.acsv-drawer-list .acsv-citem');
  return it ? 'padL=' + getComputedStyle(it).paddingLeft : 'no-citem';
})());
rec('play-cavframe-not-clipped', !!(await waitFor(function () {
  var it = q('.acsv-drawer-list .acsv-citem'), fr = q('.acsv-drawer-list .acsv-cavframe');
  if (!it || !fr) return false;
  return fr.getBoundingClientRect().left >= it.getBoundingClientRect().left - 0.5;
}, 6000)), (function () {
  var it = q('.acsv-drawer-list .acsv-citem'), fr = q('.acsv-drawer-list .acsv-cavframe');
  if (!fr) return 'skip:no-frame';
  return 'frameL=' + Math.round(fr.getBoundingClientRect().left) + ' itemL=' + Math.round(it.getBoundingClientRect().left);
})());
// 0.9.186 可访问性：评论抽屉=模态对话框语义（role/aria-modal）+ 播放控制键 aria-label
//（与 title 同源）——摘 src/ui.js a11y 或摘对应属性即转红
rec('play-a11y-drawer-dialog', (function () {
  var d = q('.acsv-drawer');
  return !!d && d.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true'
    && d.getAttribute('aria-label') === '评论';
})());
rec('play-a11y-ctl-label', (function () {
  var pl = q('.acsv-cplay');
  return !!pl && pl.getAttribute('aria-label') === '播放/暂停（空格）';
})());
// 倍速档位（0.9.194 加 3x）：菜单由 CFG.rate 驱动，展开应见 3.0x（a11y 的 title 可定位倍速键）
var rateBtn = q('.acsv-slide[data-ovl="1"] .acsv-cbtn[title="切换播放速度"]');
if (rateBtn) rateBtn.click();
rec('play-rate-3x', !!(await waitFor(function () {
  var m = q('.acsv-slide[data-ovl="1"] .acsv-qmenu');
  return !!m && /3\.0x/.test(m.textContent);
}, 4000)), (function () {
  var m = q('.acsv-slide[data-ovl="1"] .acsv-qmenu');
  return m ? m.textContent : 'no-menu';
})());
if (rateBtn) rateBtn.click(); // 收起菜单，防污染后续
// 0.9.195 底栏原生图标：播放键/弹幕键 = CSS mask（A 站播放器内联 SVG data URI，非内置自绘）；
// 空格切换播放态 → mask 形状随之换（播放三角 ↔ 暂停双竖条）
function ctlMaskU(sel) {
  var mk = q('.acsv-slide[data-ovl="1"] ' + sel + ' .acsvg-icon-mask');
  return mk ? (mk.style.getPropertyValue('--acsvg-icon') || '') : '';
}
rec('play-icon-native-mask', /data:image\/svg\+xml/.test(ctlMaskU('.acsv-cplay')),
  ctlMaskU('.acsv-cplay').slice(0, 46));
// 底栏原生图标的**尺寸**：不能沿用右栏 .acsvg-icon-mask 的 40×40（0.9.202 实报「尺寸不对」）
rec('ctl-icon-size', (function () {
  var mk = q('.acsv-slide[data-ovl="1"] .acsv-cplay .acsvg-icon-mask');
  if (!mk) return false;
  var r = mk.getBoundingClientRect();
  return Math.round(r.width) === 20 && Math.round(r.height) === 20;
})(), (function () {
  var mk = q('.acsv-slide[data-ovl="1"] .acsv-cplay .acsvg-icon-mask');
  if (!mk) return 'none';
  var r = mk.getBoundingClientRect();
  return Math.round(r.width) + 'x' + Math.round(r.height);
})());
// 0.9.206 回退：底栏「弹」开关恢复为文本键（原生 12×12 字形缩到底栏 20px 后发糊、且与旁边
// 文字键（编码/缓冲/连播/倍速）不同族）——按钮文字是「弹」且**不带** mask 图标
var dmBtnEl = q('.acsv-slide[data-ovl="1"] .acsv-cdm');
rec('dm-btn-text', !!dmBtnEl && dmBtnEl.textContent === '弹'
  && !dmBtnEl.querySelector('.acsvg-icon-mask'), dmBtnEl ? JSON.stringify(dmBtnEl.textContent) : 'no-btn');
// 播放层的网页全屏必须铺满（0.9.208 实报「playlayer 的网页全屏没修复」）：舞台 .acsv-vbody-play
// 平时让开 dock（left:168），影院态若不同步归零，左侧就留 168px 死区、画面挤在剩余区域里。
// 判据取**布局**而非视觉矩形：抽屉开着时画面会被 scale+translate 避让（设计内行为，实测 868 宽），
// 那不该算作"没铺满"——故视频只钉「布局宽 == 舞台宽」，舞台/幻灯片钉视觉矩形。
(function () {
  var wf = q('.acsv-cwebfs');
  if (!wf) { rec('playlayer-webfs-fills', false, 'no-btn'); return; }
  wf.click(); // 进网页全屏（再点一次退出，不动 Esc——播放层里 Esc 还要退层，避免污染后续）
  var stage = q('.acsv-vbody-play');
  var slide = stage && stage.querySelector('.acsv-slide'); // 必须取舞台内的：文档里还有别的隐藏 slide
  var v = slide && slide.querySelector('video');
  var W = window.innerWidth;
  function L(el) { return el ? el.getBoundingClientRect().left : null; }
  function R(el) { return el ? el.getBoundingClientRect().right : null; }
  var ok = stage && slide
    && Math.abs(L(stage)) <= 1 && Math.abs(R(stage) - W) <= 1
    && Math.abs(L(slide)) <= 1 && Math.abs(R(slide) - W) <= 1
    && (!v || Math.abs(parseFloat(getComputedStyle(v).width) - W) <= 1);
  rec('playlayer-webfs-fills', ok,
    'win=' + W + ' | stage=' + (stage ? Math.round(L(stage)) + '..' + Math.round(R(stage)) : 'none')
    + ' | slide=' + (slide ? Math.round(L(slide)) + '..' + Math.round(R(slide)) : 'none')
    + ' | videoLayoutW=' + (v ? getComputedStyle(v).width : 'none')
    + ' | videoRect=' + (v ? Math.round(L(v)) + '..' + Math.round(R(v)) : 'none')
    + ' | drawerOpen=' + document.getElementById('acsv-root').classList.contains('acsv-with-comments'));
  wf.click(); // 退回常态
}());
// 0.9.202 弹幕设置 = 底栏弹层（用户裁决：不做进设置面板）：齿轮开面板 → 两 tab → 开关/滑杆即时重排 →
// 恢复默认必须**原地重绘**（若替换面板节点，齿轮闭包指向游离节点，从此关不掉——本组钉这条）
var dmpBtn = q('.acsv-slide[data-ovl="1"] .acsv-cdmset');
var dmp = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
rec('dmpanel-btn', !!dmpBtn);
rec('dmpanel-closed-default', !!(dmp && dmp.style.display === 'none'));
// 弹层锚定（0.9.206 实机修）：右缘必须对齐触发按钮、下缘在按钮上方 12px（此前挂 slide 贴窗口边）
function alignInfo(btn, box, gap) {
  if (!btn || !box) return 'no-box';
  var b = btn.getBoundingClientRect(), m = box.getBoundingClientRect();
  return 'btn.right=' + Math.round(b.right) + ' box.right=' + Math.round(m.right)
    + ' | btn.top=' + Math.round(b.top) + ' box.bottom=' + Math.round(m.bottom)
    + ' gap=' + Math.round(b.top - m.bottom) + '(want ' + gap + ')';
}
rec('dmpanel-icon-native', (function () {
  var mk = dmpBtn && dmpBtn.querySelector('.acsvg-icon-mask');
  return !!(mk && /data:image\/svg\+xml/.test(mk.style.getPropertyValue('--acsvg-icon') || ''));
})(), (function () {
  var mk = dmpBtn && dmpBtn.querySelector('.acsvg-icon-mask');
  return mk ? (mk.style.getPropertyValue('--acsvg-icon') || '').slice(0, 40) : 'no-mask';
})());
if (dmpBtn) dmpBtn.click();
rec('dmpanel-opens', !!(dmp && dmp.style.display === '' && dmp.querySelector('.acsv-dmpbody')),
  dmp ? 'display="' + dmp.style.display + '"' : 'no-panel');
rec('dmpanel-tabs', !!(dmp && dmp.querySelectorAll('.acsv-dmptabs span').length === 2),
  dmp ? dmp.querySelector('.acsv-dmptabs').textContent : 'none');
// 「弹幕设置」tab：防挡字幕 / 合并重复弹幕 两个开关 + 显示区域 / 不透明度 / 字体大小 / 弹幕速度 四条滑杆
rec('dmpanel-rows', !!(dmp && dmp.querySelectorAll('.acsv-dmprow').length === 6),
  dmp ? 'rows=' + dmp.querySelectorAll('.acsv-dmprow').length : 'none');
// 面板右缘＝设置键右缘；面板下缘＝设置键上缘 - 12
rec('dmpanel-anchored-to-btn', (function () {
  if (!dmpBtn || !dmp) return false;
  var b = dmpBtn.getBoundingClientRect(), m = dmp.getBoundingClientRect();
  return Math.abs(m.right - b.right) <= 1 && Math.abs((b.top - m.bottom) - 12) <= 1;
})(), alignInfo(dmpBtn, dmp, 12));
var dmSw0 = dmp && dmp.querySelectorAll('.acsv-dmpsw')[0];
if (dmSw0) dmSw0.click();
rec('dmpanel-sw-on', !!(dmSw0 && dmSw0.classList.contains('on')));
rec('dmpanel-sw-persist', !!(await waitFor(function () {
  return window.localStorage.getItem('acsv.s.dmSubtitle') === 'true';
}, 3000)), 'raw=' + window.localStorage.getItem('acsv.s.dmSubtitle'));
// 屏蔽设置 tab：关键词过滤即时写设置
var dmTabBlk = dmp && dmp.querySelectorAll('.acsv-dmptabs span')[1];
if (dmTabBlk) dmTabBlk.click();
var dmBodies = dmp ? dmp.querySelectorAll('.acsv-dmpbody') : [];
rec('dmpanel-tab-switch', !!(dmBodies[0] && dmBodies[1]
  && dmBodies[0].style.display === 'none' && dmBodies[1].style.display === ''),
  dmBodies[0] ? 'set="' + dmBodies[0].style.display + '" blk="' + dmBodies[1].style.display + '"' : 'none');
// 屏蔽 tab 六类标签（照原生，0.9.204 补齐角色/高级）+ 关键词输入
rec('dmpanel-block-tags', !!(dmp && dmp.querySelectorAll('.acsv-dmptag').length === 6),
  dmp ? 'tags=' + dmp.querySelectorAll('.acsv-dmptag').length : 'none');
var dmFi = dmp && dmp.querySelector('.acsv-dmpfilter');
if (dmFi) { dmFi.value = '剧透'; dmFi.dispatchEvent(new Event('input', { bubbles: true })); }
rec('dmpanel-filter-persist', !!(await waitFor(function () {
  return window.localStorage.getItem('acsv.s.dmFilter') === '"剧透"';
}, 3000)), 'raw=' + window.localStorage.getItem('acsv.s.dmFilter'));
// 恢复默认：面板**同一颗节点**（不被 replaceChild 换掉）+ 开关回位 + 关键词清空
var dmReset = dmp && dmp.querySelector('.acsv-dmpreset');
if (dmReset) dmReset.click();
rec('dmpanel-reset-samenode', !!(dmp && q('.acsv-slide[data-ovl="1"] .acsv-dmpanel') === dmp),
  'sameNode=' + (!!(dmp && q('.acsv-slide[data-ovl="1"] .acsv-dmpanel') === dmp)));
rec('dmpanel-reset-sw-off', (function () {
  var s = dmp && dmp.querySelector('.acsv-dmpsw');
  return !!(s && !s.classList.contains('on'));
})(), (function () {
  var s = dmp && dmp.querySelector('.acsv-dmpsw');
  return s ? s.className : 'none';
})());
rec('dmpanel-reset-clears-filter', !!(await waitFor(function () {
  return window.localStorage.getItem('acsv.s.dmFilter') === '""';
}, 3000)), 'raw=' + window.localStorage.getItem('acsv.s.dmFilter'));
// 0.9.280 滑杆生效钉：拖四杆到**非档位**连续值 → 落盘必须等于滑杆写值。0.9.201 三键以 select
// 入库、0.9.202 换滑杆入口，options 白名单把连续值（'73'/'1.13'/'1.10'）在 setSetting 静默拒绝
// ——面板照画新位置、设置从未变更 ⇒「不透明度/字体大小/弹幕速度」从未生效（dmArea 当时即
// text 故独活，本组恒绿防回漂）。摘修复反跑：settings.js 三键 type 改回 select，三条转红。
var sliderPins = [
  [2, 'dmArea', 25 / 70, '55'],    // min30 max100 → v=55
  [3, 'dmAlpha', 53 / 80, '73'],   // min20 max100 → v=73（刻意避开 20/40/60/80/100 档位点）
  [4, 'dmSize', 28 / 55, '1.13'],  // min85 max140 → v=113 → encode (113/100).toFixed(2)
  [5, 'dmSpeed', 0.5, '1.10']      // min60 max160 → v=110 → encode (110/100).toFixed(2)
];
for (var spi = 0; spi < sliderPins.length; spi++) {
  await (async function (pin) {
    var prow = dmp ? dmp.querySelectorAll('.acsv-dmprow')[pin[0]] : null;
    var ptrack = prow && prow.querySelector('.acsv-dmptrack');
    if (ptrack) {
      var pr = ptrack.getBoundingClientRect();
      ptrack.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true,
        clientX: pr.left + pr.width * pin[2], clientY: pr.top + pr.height / 2, pointerId: 1 }));
    }
    rec('dmpanel-slider-' + pin[1], !!(await waitFor(function () {
      try { return JSON.parse(window.localStorage.getItem('acsv.s.' + pin[1])) === pin[3]; }
      catch (e) { return false; }
    }, 3000)), pin[1] + ' raw=' + window.localStorage.getItem('acsv.s.' + pin[1])
      + ' want=' + JSON.stringify(pin[3]));
  })(sliderPins[spi]);
}
if (dmpBtn) dmpBtn.click(); // 再点齿轮收起：能收起即证明闭包还指着活节点
rec('dmpanel-closes', !!(await waitFor(function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
  return !!(d && d.style.display === 'none');
}, 2000)), (function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
  return d ? 'display="' + d.style.display + '"' : 'no-panel';
})());
// 清晰度菜单同款锚定（**放最后**：点清晰度键＝面板外点击，会先把弹幕面板收掉）
var qBtnEl = q('.acsv-slide[data-ovl="1"] .acsv-cq');
if (qBtnEl) qBtnEl.click();
var qMenuEl = q('.acsv-slide[data-ovl="1"] .acsv-qmenu');
rec('qmenu-anchored-to-btn', (function () {
  if (!qBtnEl || !qMenuEl) return false;
  var b = qBtnEl.getBoundingClientRect(), m = qMenuEl.getBoundingClientRect();
  return Math.abs(m.right - b.right) <= 1 && Math.abs((b.top - m.bottom) - 12) <= 1;
})(), alignInfo(qBtnEl, qMenuEl, 12));
if (qBtnEl) qBtnEl.click(); // 收起
var uBefore = ctlMaskU('.acsv-cplay');
var pb0 = q('.acsv-slide[data-ovl="1"] .acsv-cplay');
if (pb0) pb0.click(); // 直接点播放键：抽屉开着时焦点在评论输入框，Space 会被输入框吃掉
rec('play-icon-swaps', !!(await waitFor(function () {
  var u = ctlMaskU('.acsv-cplay');
  return u && u !== uBefore;
}, 4000)), 'before=' + uBefore.slice(0, 30) + ' after=' + ctlMaskU('.acsv-cplay').slice(0, 30));
if (pb0) pb0.click(); // 切回，防污染后续
// 0.9.199 音量竖条：结构（高远大于宽）+ 拖动改音量（自下而上）+ 拖到底=静音（与静音键两态联动）。
// 滑杆平时 display:none（0.9.215 起 JS 悬停展开），无头下不便 hover —— 测试期强制展开再量。
(function () {
  var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  if (s) s.style.display = 'flex';
})();
function volTrack() { return q('.acsv-slide[data-ovl="1"] .acsv-volslide .voltrack'); }
function ovlVideo() { return q('.acsv-slide[data-ovl="1"] video'); }
function dragTo(ratio) { // ratio: 0=底 1=顶
  var t = volTrack();
  if (!t) return false;
  var r = t.getBoundingClientRect();
  var y = r.bottom - r.height * ratio;
  t.dispatchEvent(new PointerEvent('pointerdown', { clientY: y, clientX: r.left + 2, bubbles: true }));
  t.dispatchEvent(new PointerEvent('pointerup', { clientY: y, clientX: r.left + 2, bubbles: true }));
  return true;
}
rec('vol-slider-vertical', (function () {
  var t = volTrack();
  if (!t) return false;
  var r = t.getBoundingClientRect();
  return r.height > r.width * 4;
})(), (function () { var t = volTrack(); if (!t) return 'none'; var r = t.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })());
dragTo(0.5);
rec('vol-drag-mid', (function () {
  var v = ovlVideo();
  return !!v && Math.abs(v.volume - 0.5) < 0.12 && v.muted === false;
})(), (function () { var v = ovlVideo(); return v ? 'vol=' + v.volume.toFixed(2) + ' muted=' + v.muted : 'no-video'; })());
dragTo(0);
rec('vol-zero-mutes', (function () {
  var v = ovlVideo(), b = q('.acsv-slide[data-ovl="1"] .acsv-cmute');
  return !!v && v.muted === true && !!b && b.classList.contains('mute');
})(), (function () { var v = ovlVideo(); var b = q('.acsv-slide[data-ovl="1"] .acsv-cmute'); return (v ? 'muted=' + v.muted : 'no-video') + ' cls=' + (b ? b.className : 'none'); })());
dragTo(1); // 复位到满音量（含取消静音），防污染后续
(function () { var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide'); if (s) s.style.display = ''; })();
// 0.9.215 音量条显隐收归 JS（用户实报「音量调不好、不常驻」）：enter 即开 / leave 延时
// volHide(350) 才关（键→杆 6px 死区在延时窗内穿过）/ 开期间控制栏闲置保活（showControls 认
// slide._volOpen）。钉三不变式：开 → 越过 ctlIdle(2500) 栏不隐 → leave 后先仍在、后才收
var volWrapEl = q('.acsv-slide[data-ovl="1"] .acsv-volwrap');
var ovlSlideEl = q('.acsv-slide[data-ovl="1"]');
volWrapEl.dispatchEvent(new PointerEvent('pointerenter'));
rec('vol-open-on-enter', (function () {
  var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  return !!s && s.style.display === 'flex';
})(), (function () { var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide'); return s ? 'disp=' + (s.style.display || 'css') : 'no-slide'; })());
await wait(2700); // 越过 ctlIdle(2500) 且全程无 mousemove
rec('vol-open-keeps-controls', (function () {
  var v = ovlVideo(), s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  // 视频须在播（否则闲置隐藏本就不触发，断言无意义）；栏与滑杆都必须还在
  return !!v && !v.paused && ovlSlideEl.dataset.ctl === '1' && !!s && s.style.display === 'flex';
})(), (function () {
  var v = ovlVideo();
  return 'paused=' + (v && v.paused) + ' ctl=' + JSON.stringify(ovlSlideEl.dataset.ctl);
})());
volWrapEl.dispatchEvent(new PointerEvent('pointerleave'));
await wait(150); // 延时窗内：必须仍在（死区穿越靠这口气）
rec('vol-hide-delayed', (function () {
  var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  return !!s && s.style.display === 'flex';
})(), (function () { var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide'); return s ? 'disp=' + (s.style.display || 'css') : 'no-slide'; })());
rec('vol-hidden-after-delay', !!(await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  return s && s.style.display !== 'flex';
}, 1500)), (function () { var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide'); return s ? 'disp=' + (s.style.display || 'css') : 'no-slide'; })());
// 0.9.215 悬停滚轮调音量：±5%/格；preventDefault+stopPropagation 双拦层内翻条手势
// （playgest 的 wheel 绑在层体上）——断言事件被吞 + 视频节点没被换掉（翻条会换节点）
var volVideoBefore = ovlVideo();
var wheelDown = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
volWrapEl.dispatchEvent(wheelDown);
rec('vol-wheel-down', (function () {
  var v = ovlVideo();
  return !!v && Math.abs(v.volume - 0.95) < 0.01 && wheelDown.defaultPrevented === true && v === volVideoBefore;
})(), (function () { var v = ovlVideo(); return (v ? 'vol=' + v.volume.toFixed(3) : 'no-video') + ' prevented=' + wheelDown.defaultPrevented + ' sameNode=' + (v === volVideoBefore); })());
var wheelUp = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true });
volWrapEl.dispatchEvent(wheelUp);
rec('vol-wheel-up', (function () {
  var v = ovlVideo();
  return !!v && Math.abs(v.volume - 1) < 0.01 && wheelUp.defaultPrevented === true;
})(), (function () { var v = ovlVideo(); return v ? 'vol=' + v.volume.toFixed(3) : 'no-video'; })());
// 滚轮也经 volOpen 开了滑杆：收掉防污染后续
volWrapEl.dispatchEvent(new PointerEvent('pointerleave'));
await waitFor(function () {
  var s = q('.acsv-slide[data-ovl="1"] .acsv-volslide');
  return s && s.style.display !== 'flex';
}, 1500);
// 0.9.200 画中画：底栏有 PiP 键，且**支持门控**正确（pictureInPictureEnabled=false 时不显示）。
// 真实进出 PiP 需要用户激活 + 系统合成器，无头环境不可靠，故只钉按钮与门控
rec('pip-btn', (function () {
  var b = q('.acsv-slide[data-ovl="1"] .acsv-cpip');
  if (!b) return false;
  var supported = typeof document.pictureInPictureEnabled === 'boolean' ? document.pictureInPictureEnabled : true;
  var ariaOk = b.getAttribute('aria-label') === '画中画（切到别的标签也能继续看）';
  var visOk = supported ? b.style.display !== 'none' : b.style.display === 'none';
  return ariaOk && visOk;
})(), (function () {
  var b = q('.acsv-slide[data-ovl="1"] .acsv-cpip');
  return b ? ('aria=' + b.getAttribute('aria-label') + ' disp=' + (b.style.display || 'inline') + ' enabled=' + document.pictureInPictureEnabled) : 'none';
})());
// 0.9.200 进度条悬停缩略图：harness 无 sprite 桩（请求必失败）→ 必须**优雅降级**：气泡仍出时间、
// 且不出现缩略图块（绝不能因为拿不到雪碧图就没提示）。真机上的缩略图裁切由解析器单测钉。
(function () {
  var t = q('.acsv-slide[data-ovl="1"] .acsv-track');
  if (t) {
    var r = t.getBoundingClientRect();
    t.dispatchEvent(new PointerEvent('pointermove', { clientY: r.top + r.height / 2, clientX: r.left + r.width * 0.5, bubbles: true }));
  }
})();
rec('track-hover-time-only', (function () {
  var b = q('.acsv-slide[data-ovl="1"] .acsv-bubble');
  var th = q('.acsv-slide[data-ovl="1"] .acsv-bubthumb');
  var tm = b && b.querySelector('.acsv-bubtime');
  return !!b && b.classList.contains('show') && !!tm && /\d/.test(tm.textContent || '')
    && !!th && th.style.display === 'none';
})(), (function () {
  var tm = q('.acsv-slide[data-ovl="1"] .acsv-bubtime');
  var th = q('.acsv-slide[data-ovl="1"] .acsv-bubthumb');
  return 'time=' + (tm ? tm.textContent : 'none') + ' thumb=' + (th ? th.style.display : 'none');
})());
(function () { // 收气泡，防污染后续
  var t = q('.acsv-slide[data-ovl="1"] .acsv-track');
  if (t) t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
})();
key('c');
rec('play-key-comments-close', !!(await waitFor(function () {
  var r = q('#acsv-root');
  return !!r && !r.classList.contains('acsv-with-comments');
}, 6000)));
// rail 评论键（0.9.116 收边后经注册缝 setCommentsOpener）：层内右栏评论按钮点击=开合
//（哨兵：缝断则静默 no-op——这条链此前零覆盖；i 键/c 键有既有哨兵，rail 没有）
var rbtn = q('.acsv-slide[data-ovl="1"] .acsv-rail-btn[title="展开/收起评论（C）"]');
if (rbtn) rbtn.click();
rec('play-rail-comments', !!(await waitFor(function () {
  var r = q('#acsv-root'), d = q('.acsv-drawer');
  return !!r && r.classList.contains('acsv-with-comments') && !!d && d.classList.contains('open');
}, 6000)));
if (rbtn) rbtn.click(); // 再点收起（toggle 语义）
rec('play-rail-comments-close', !!(await waitFor(function () {
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
// 0.9.281 连播/倍速跨会话记忆（底栏机制统一，用户裁决；0.9.285 起写入收口 setSetting 单出口，
// pb 同步/生效挂 playback.watchPref 订阅）：点击落设置层；「记忆」钉用户可见行为。
// 摘修复反跑：撤 controls 两处 setSetting（或撤 playback 两条 watchPref 订阅），persist 即转红。
window.__ACSV_MOCK_DIRECT__ = { '488900': { date: window.__ACSV_PUBLISH_DATE__ } }; // 尾段 retry 改过直挂缝，进层前恢复（开局同款）
location.hash = 'svfeed/play/a/488900';
rec('mem-layer-open', !!(await waitFor(function () {
  return !!q('.acsv-slide[data-ovl="1"] .acsv-cauto');
}, 12000)), location.hash);
var memAuto = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
if (memAuto) memAuto.click(); // 连播开（层内默认关）
rec('mem-loop-persist', !!(await waitFor(function () {
  return window.localStorage.getItem('acsv.s.loop') === 'true';
}, 3000)), 'raw=' + window.localStorage.getItem('acsv.s.loop'));
// 倍速：底栏多个 buildMenu 同类名（.acsv-cq），按文案找倍速键；菜单在 wrap 内取（防拿捏别的开着的菜单），选 1.5x（CFG.rate[2]）
var memRateBtn = null;
Array.prototype.forEach.call(document.querySelectorAll('.acsv-slide[data-ovl="1"] .acsv-cq'), function (b) {
  if (/^倍速 /.test(b.textContent)) memRateBtn = b;
});
if (memRateBtn) memRateBtn.click();
var memMenu = memRateBtn ? memRateBtn.parentNode.querySelector('.acsv-qmenu') : null;
var memItem = null;
if (memMenu) Array.prototype.forEach.call(memMenu.querySelectorAll('.acsv-qitem'), function (c) {
  if (c.textContent === '1.5x') memItem = c;
});
if (memItem) memItem.click();
rec('mem-rate-persist', !!(await waitFor(function () {
  try { return JSON.parse(window.localStorage.getItem('acsv.s.rate')) === 1.5; } catch (e) { return false; }
}, 3000)), 'raw=' + window.localStorage.getItem('acsv.s.rate'));
// 「恢复」半边不在此钉：pb 是模块单例，hash 退出重进只是 unmount/mount、pb 残留旧值 ⇒
// 断言恒绿测不出目标行为（首跑反跑实证）。跨会话恢复由独立场景 mem-controls 钉——
// harness 在 bundle 求值前预置存储，新鲜加载即「上次会话」语义（watch-ledger-replay 范式）。
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
// 0.9.256 转圈收口：① 播放层直达路径 mount/maybeStartFeed 双挂 spinner，clearSpinner 旧只删
// 首个 ⇒ 残留无 idx 子项让 renderWindow 排序快路永久失效；② scroller 级 spinner 旧 CSS 只给
// slide 内选择器，直属 scroller 的转圈被 display:none 隐掉（首屏加载实际无转圈）
rec('cold-no-stale-spinner', document.querySelectorAll('.acsv-scroller > .acsv-spinner').length === 0,
  'n=' + document.querySelectorAll('.acsv-scroller > .acsv-spinner').length);
(function () {
  var spProbe = document.createElement('div');
  spProbe.className = 'acsv-spinner';
  q('.acsv-scroller').appendChild(spProbe);
  rec('spinner-scroller-visible', getComputedStyle(spProbe).display !== 'none',
    'display=' + getComputedStyle(spProbe).display);
  spProbe.remove();
})();
// onTime 同值跳过（0.9.166）：连发两次同 currentTime 的合成 timeupdate ⇒ 第二次 pct/文本
// 双同值整拍跳过（stat 计数可证；真进度变化时 moved/talked 任一为真即照写，不吞真进度）
var tv = document.querySelector('.acsv-scroller video');
if (tv) {
  tv.dispatchEvent(new Event('timeupdate'));
  var skip0 = TEST.getStats()['ontime.skip'] || 0;
  tv.dispatchEvent(new Event('timeupdate'));
  rec('ontime-skip-counted', (TEST.getStats()['ontime.skip'] || 0) > skip0,
    'skip=' + TEST.getStats()['ontime.skip']);
}
  };
  // ---- watch-playlayer-pagehide ----
  C['watch-playlayer-pagehide'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 0.9.86 对齐哨兵：层内 slide 不在竖刷流里（dataset.ovl='1'），pagehide 兜底上报必须经
// state.watchTarget 找到层内会话——旧实现只查 slideAt(FeedStore.current)，层内关页时
// 10s 首报之后的进度全丢。home 源：teardown 清钩子后，pagehide 必须回落竖刷当前条
function ovlVideo() { var s = q('.acsv-slide[data-ovl="1"]'); return s && s.querySelector('video'); }
function watchCount() { return TEST.getStats()['report-watch'] || 0; }
function lastPayload() { return (window.__WL_CALLS[window.__WL_CALLS.length - 1] || {}).payload || null; }
rec('feed-up', !!(await waitFor(function () { return feed() && feed().items.length > 0; }, 15000)));
window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;
window.__ACSV_MOCK_DIRECT__ = { '488900': 1 }; // 直挂缝：webm 套 hls.js 会死在解析上（同 play-deep）
location.hash = 'svfeed/play/a/488900';
rec('layer-open', !!(await waitFor(function () { return !!q('.acsv-slide[data-ovl="1"]'); }, 10000)));
rec('layer-playing', !!(await waitFor(function () {
  var v = ovlVideo();
  return !!v && !v.paused && v.currentTime > 0;
}, 25000)));
rec('layer-progress', !!(await waitFor(function () {
  var v = ovlVideo();
  return !!v && v.currentTime >= 3.2;
}, 20000)));
// 层开着合成 pagehide：必须报层内条目（488900），秒位=派发瞬间 currentTime
var c0 = watchCount();
var t0 = Math.floor(ovlVideo().currentTime);
window.dispatchEvent(new Event('pagehide')); // 同步派发：处理器读同一时刻的 currentTime
rec('pagehide-reports-layer', watchCount() > c0, 'watch=' + watchCount());
var lp = lastPayload();
rec('pagehide-layer-acid', !!lp && lp.action === 'CLIENT_BROWSE_HISTORY'
  && String(lp.params.ac_id) === '488900', JSON.stringify(lp && lp.params || null));
rec('pagehide-layer-sec', !!lp && lp.params.playedSeconds >= t0 && lp.params.playedSeconds <= t0 + 1,
  'want~' + t0 + ' got=' + (lp && lp.params.playedSeconds));
window.dispatchEvent(new Event('pagehide')); // 进度未推进 → 同秒位去重
rec('pagehide-layer-deduped', watchCount() === c0 + 1, 'watch=' + watchCount());
// teardown 清 watchTarget：此后 pagehide 回落竖刷当前条（home 条目可报），绝不残留层内旧会话
key('Escape');
rec('layer-back', !!(await waitFor(function () {
  return location.hash === '#svfeed' && q('.acsv-slide[data-ovl="1"]') === null;
}, 8000)));
// teardown 清 watchTarget：此后 pagehide 回落竖刷当前条（home 条目可报），绝不残留层内旧会话。
// 竖刷视频此前被层挡住（幽灵音频防线）停在 0——先真实播放攒过门槛再派发
rec('feed-playing', !!(await waitFor(function () {
  var v = slide(0) && slide(0).querySelector('video');
  return !!v && !v.paused && v.currentTime >= 3.2;
}, 30000)));
var c1 = watchCount();
window.dispatchEvent(new Event('pagehide'));
rec('pagehide-back-to-feed', watchCount() > c1, 'watch=' + watchCount());
var lp1 = lastPayload();
rec('pagehide-feed-acid', !!lp1 && String(lp1.params.ac_id) !== '488900'
  && String(lp1.params.ac_id) === String((feed().items[feed().current] || {}).id),
  JSON.stringify(lp1 && lp1.params || null));
// 0.9.234 dispose 上报：拆源前快照（原实现 removeAttribute('src')+load() 已把 currentTime 归零，
// 钩子里读到 0 被门槛静默丢弃）。先推进 ≥1s 避开 pagehide 同秒去重，再手动 dispose 现行会话。
await wait(1700);
var vD = slide(0) && slide(0).querySelector('video');
var tD = vD ? Math.floor(vD.currentTime) : 0;
var cD = watchCount();
var sD = slide(0) && slide(0)._session;
if (sD && tD >= 3) {
  sD.dispose();
  rec('dispose-reports-lastT', !!(await waitFor(function () { return watchCount() > cD; }, 5000)),
    'watch=' + watchCount() + ' tD=' + tD);
  var lpD = lastPayload();
  rec('dispose-lastT-value', !!lpD && lpD.params && lpD.params.playedSeconds === tD,
    'want=' + tD + ' got=' + JSON.stringify(lpD && lpD.params || null));
} else {
  rec('dispose-reports-lastT', false, 'no-session tD=' + tD);
}
  };
  // ---- dm-ime（0.9.234：弹幕输入的输入法组合守卫） ----
  C['dm-ime'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, wait = h.wait, waitFor = h.waitFor;
// 病灶：Enter 不判 isComposing ⇒ 中文选词的回车把半成品弹幕发出去。
// 正负双向钉：组合期 Enter 不得发送；真 Enter 必须照发（防守卫把正常发送一起拦死）。
// home 源（harness HOME_CASES）：卡片 cap.danmaku=true 有弹幕框，videoId 由 refreshItem 缝补上
var calls = 0;
window.__ACSV_MOCK_FORM__ = Object.assign(window.__ACSV_MOCK_FORM__ || {}, {
  'new-danmaku/add': function () { calls++; return { result: 0, danmakuId: 1 }; }
});
rec('dmime-ready', !!(await waitFor(function () {
  var s = slide(0), v = s && s.querySelector('video');
  return !!(v && v.duration > 0 && s.dataset.state !== 'error' && s._session && s._session.item.videoId);
}, 25000)));
var inp = q('.acsv-slide[data-idx="0"] .acsv-dm-input');
rec('dmime-input-present', !!inp);
if (!inp) return;
inp.focus();
inp.value = '组合期回车不该发送';
var ev1 = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true });
if (!ev1.isComposing) { try { Object.defineProperty(ev1, 'isComposing', { value: true }); } catch (e) { } }
inp.dispatchEvent(ev1);
await wait(400);
rec('dmime-ime-enter-blocked', calls === 0 && inp.value === '组合期回车不该发送', 'calls=' + calls);
inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
rec('dmime-real-enter-sends', !!(await waitFor(function () { return calls > 0; }, 6000)), 'calls=' + calls);
  };
  // ---- fs-guard（已撤，留注防重走）：0.9.235 曾疑「层内 fullscreenchange 把隐藏的竖刷
  // 回正归零」而加 stageVisible 守卫——摘修复反跑实测**无法转红**：scroller display:none 时
  // 写 scrollTop 是空操作、关层恢复后位置原样。按「不写猜测性实现」撤掉守卫与用例。
  // ---- ctl-typing（0.9.235：栏内输入框聚焦中，控制栏闲置不得收） ----
  C['ctl-typing'] = async function (h) {
    var rec = h.rec, slide = h.slide, wait = h.wait, waitFor = h.waitFor;
// 弹幕输入框聚焦（home 源才有弹幕框）→ 越过 ctlIdle(2500ms) 栏必须仍在；失焦后闲置照旧收起
rec('ctlt-playing', !!(await waitFor(function () {
  var s = slide(0), v = s && s.querySelector('video');
  return !!(v && v.duration > 0 && !v.paused && s.dataset.state !== 'error');
}, 25000)));
var s = slide(0);
var inp = s.querySelector('.acsv-dm-input');
rec('ctlt-input', !!inp);
// 0.9.237 音量竖条初始即绘制（原先不画初值：首悬停/新建 slide 是空轨、数字却是真值）。
// 滑杆本体默认 display:none（悬停才展开）——rect 高度恒 0，判据用内联填充高是否已写
var vt = s.querySelector('.voltrack i');
rec('ctlt-vol-initial', !!(vt && vt.style.height), 'inlineH=' + (vt ? vt.style.height : 'none'));
if (!inp) return;
s.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
await wait(120);
rec('ctlt-shown', s.dataset.ctl === '1', 'ctl=' + s.dataset.ctl);
inp.focus();
// 持续采样 4s（> ctlIdle 2500ms）：聚焦期栏必须全程在场。不用"blur 后必收"做负例——
// 视频 5s 循环的 playing→showControls 会周期性重新点亮，读单点会随机假红/假绿
var stayed = true;
for (var i = 0; i < 20; i++) {
  await wait(200);
  if (s.dataset.ctl !== '1') stayed = false;
}
rec('ctlt-keepalive', stayed, 'ctl=' + s.dataset.ctl);
inp.blur();
  };
  // ---- ctl-narrow（0.9.237：540 窄视口底栏横滑——方案 B，transform 平移不形成裁剪上下文） ----
  C['ctl-narrow'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, wait = h.wait, waitFor = h.waitFor;
rec('ctln-ready', !!(await waitFor(function () {
  var s = slide(0), v = s && s.querySelector('video');
  return !!(v && v.duration > 0 && s.dataset.state !== 'error');
}, 25000)));
var s = slide(0);
var row = s && s.querySelector('.acsv-ctl-row');
var strip = s && s.querySelector('.acsv-ctl-strip');
rec('ctln-parts', !!(row && strip));
if (!row || !strip) return;
var maxX = Math.round(strip.scrollWidth - row.clientWidth);
rec('ctln-overflow', maxX > 20, 'maxX≈' + maxX);
// 拖动：内容超出时按住左移（阈值 6px）——拖 60px 留出后续滚轮余量（拖满会顶到钳制上限）
row.dispatchEvent(new PointerEvent('pointerdown', { clientX: 420, bubbles: true, pointerId: 1 }));
row.dispatchEvent(new PointerEvent('pointermove', { clientX: 360, bubbles: true, pointerId: 1 }));
row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
var m1 = /translateX\(-([\d.]+)px\)/.exec(strip.style.transform || '');
rec('ctln-drag-pans', !!(m1 && Number(m1[1]) > 20), strip.style.transform || '(none)');
// 滚轮映射为横滑
row.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
var m2 = /translateX\(-([\d.]+)px\)/.exec(strip.style.transform || '');
rec('ctln-wheel-pans', !!(m2 && Number(m2[1]) > Number(m1 ? m1[1] : 0)), strip.style.transform || '(none)');
// 底栏时钟（0.9.279）：全量右移后必须落进可视区（新增键不能永远藏在横滑区）
row.dispatchEvent(new WheelEvent('wheel', { deltaY: 9999, bubbles: true, cancelable: true }));
var wb = s.querySelector('.acsv-cwait');
var rr = row.getBoundingClientRect(), br = wb && wb.getBoundingClientRect();
rec('ctln-wait-reachable', !!br && br.right > rr.left && br.left < rr.right,
  br ? Math.round(br.left - rr.left) + '..' + Math.round(br.right - rr.left) : 'no-btn');
// 平移后开倍速菜单：菜单必须完整可见（这就是不用 overflow 滚动的理由）。
// 先补一拍"干净点击"的 pointerdown/up——拖动落点的 click 抑制以 pointerdown 为周期复位
row.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, bubbles: true, pointerId: 2 }));
row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
var rateBtn = null;
Array.prototype.forEach.call(s.querySelectorAll('.acsv-cq'), function (b) {
  if (/^倍速/.test(b.textContent || '')) rateBtn = b;
});
if (rateBtn) {
  rateBtn.click();
  await wait(120);
  var qm = s.querySelector('.acsv-qmenu');
  rec('ctln-menu-visible', !!(qm && qm.getBoundingClientRect().height > 10),
    qm ? 'h=' + Math.round(qm.getBoundingClientRect().height) : 'no-menu');
}
  };

  // ---- ctl-waiting（0.9.279：底栏时钟 → add/cancel 写链） ----
  C['ctl-waiting'] = async function (h) {
    var rec = h.rec, slide = h.slide, waitFor = h.waitFor;
    rec('ctlw-ready', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    var s = slide(0);
    var it = s && s._session && s._session.item;
    var btn = s && s.querySelector('.acsv-cwait');
    rec('ctlw-present', !!(btn && it && it.kind === 'home'), btn ? 'btn' : 'no-btn');
    if (!btn || !it) return;
    var addBody = '', cancelBody = '';
    window.__ACSV_MOCK_FORM__ = window.__ACSV_MOCK_FORM__ || {};
    window.__ACSV_MOCK_FORM__['app/addWaiting'] = function (body) {
      addBody = String(body);
      return { result: 0 };
    };
    window.__ACSV_MOCK_FORM__['app/cancelWaiting'] = function (body) {
      cancelBody = String(body);
      return { result: 0 };
    };
    rec('ctlw-default-off', !btn.classList.contains('on'));
    btn.click();
    rec('ctlw-add-on', !!(await waitFor(function () { return btn.classList.contains('on'); }, 3000)));
    rec('ctlw-add-body', addBody === 'resourceId=' + it.id + '&resourceType=2', addBody);
    await waitFor(function () { return !it.waitingBusy; }, 3000); // 等写链 busy 复位再点第二下
    btn.click();
    rec('ctlw-cancel-off', !!(await waitFor(function () { return !btn.classList.contains('on'); }, 3000)));
    rec('ctlw-cancel-body', cancelBody === 'resourceId=' + it.id + '&resourceType=2', cancelBody);
    await waitFor(function () { return !it.waitingBusy; }, 3000);
    // 失败回滚：mock 返回显式错误码 -401（result:1 在新口径下是 Empty 成功码）
    window.__ACSV_MOCK_FORM__['app/addWaiting'] = function () { return { result: -401 }; };
    btn.click();
    rec('ctlw-fail-rollback', !!(await waitFor(function () { return !btn.classList.contains('on'); }, 3000)));
  };
  // ---- mem-controls ----
  // 0.9.281 连播/倍速跨会话记忆：harness 在 bundle 求值前预置 acsv.s.loop=true / acsv.s.rate=1.5
  //（见 harness.html 场景预处理）——页面新鲜加载即「上次会话退出」语义，0.9.285 起恢复由
  // playback.watchPref 的「注册即恢复」承担（订阅以当前设置值跑一遍），控件态与播放行为必须恢复。
  // 摘修复反跑：撤 playback 两条 watchPref('loop'/'rate') 注册即转红（控件回落默认 关/1.0x、
  // playbackRate=1、loop=true）。pb 是模块单例、hash 重进不刷新 ⇒「跨会话」只能靠新鲜加载钉
  //（watch-ledger-replay 同款范式）；play-deep 尾部只钉点击落盘半边
  C['mem-controls'] = async function (h) {
    var rec = h.rec, q = h.q, waitFor = h.waitFor;
rec('mem-layer-open', !!(await waitFor(function () {
  return !!q('.acsv-slide[data-ovl="1"] .acsv-cauto');
}, 25000)), location.hash);
rec('mem-loop-restored', (function () {
  var b = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
  return !!b && b.classList.contains('on');
})(), (function () {
  var b = q('.acsv-slide[data-ovl="1"] .acsv-cauto');
  return b ? b.className : 'no-btn';
})());
rec('mem-rate-restored', (function () {
  var b = null;
  Array.prototype.forEach.call(document.querySelectorAll('.acsv-slide[data-ovl="1"] .acsv-cq'), function (x) {
    if (/^倍速 /.test(x.textContent)) b = x;
  });
  return !!b && b.textContent === '倍速 1.5x';
})(), (function () {
  var b = null;
  Array.prototype.forEach.call(document.querySelectorAll('.acsv-slide[data-ovl="1"] .acsv-cq'), function (x) {
    if (/^倍速 /.test(x.textContent)) b = x;
  });
  return b ? b.textContent : 'no-btn';
})());
// 记忆落到播放行为：initVideo/onPlaying 按 pb.playRate 同步速率；连播开 ⇒ 层内（walk）不循环
rec('mem-rate-applied', !!(await waitFor(function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return !!v && Math.abs(v.playbackRate - 1.5) < 0.01;
}, 15000)), (function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return v ? 'rate=' + v.playbackRate : 'no-video';
})());
rec('mem-loop-applied', (function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return !!v && v.loop === false;
})(), (function () {
  var v = q('.acsv-slide[data-ovl="1"] video');
  return v ? 'loop=' + v.loop : 'no-video';
})());
  };
})();
