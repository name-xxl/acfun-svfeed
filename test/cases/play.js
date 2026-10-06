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
rec('dm-icon-native-mask', /data:image\/svg\+xml/.test(ctlMaskU('.acsv-cdm')),
  ctlMaskU('.acsv-cdm').slice(0, 46));
// 0.9.202 弹幕设置 = 底栏弹层（用户裁决：不做进设置面板）：齿轮开面板 → 两 tab → 开关/滑杆即时重排 →
// 恢复默认必须**原地重绘**（若替换面板节点，齿轮闭包指向游离节点，从此关不掉——本组钉这条）
var dmpBtn = q('.acsv-slide[data-ovl="1"] .acsv-cdmset');
var dmp = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
rec('dmpanel-btn', !!dmpBtn);
rec('dmpanel-closed-default', !!(dmp && dmp.style.display === 'none'));
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
if (dmpBtn) dmpBtn.click(); // 再点齿轮收起：能收起即证明闭包还指着活节点
rec('dmpanel-closes', !!(await waitFor(function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
  return !!(d && d.style.display === 'none');
}, 2000)), (function () {
  var d = q('.acsv-slide[data-ovl="1"] .acsv-dmpanel');
  return d ? 'display="' + d.style.display + '"' : 'no-panel';
})());
var uBefore = ctlMaskU('.acsv-cplay');
var pb0 = q('.acsv-slide[data-ovl="1"] .acsv-cplay');
if (pb0) pb0.click(); // 直接点播放键：抽屉开着时焦点在评论输入框，Space 会被输入框吃掉
rec('play-icon-swaps', !!(await waitFor(function () {
  var u = ctlMaskU('.acsv-cplay');
  return u && u !== uBefore;
}, 4000)), 'before=' + uBefore.slice(0, 30) + ' after=' + ctlMaskU('.acsv-cplay').slice(0, 30));
if (pb0) pb0.click(); // 切回，防污染后续
// 0.9.199 音量竖条：结构（高远大于宽）+ 拖动改音量（自下而上）+ 拖到底=静音（与静音键两态联动）。
// 滑杆平时 display:none（hover 展开），无头下不便 hover —— 测试期强制展开再量。
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
  };
})();
