import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, fmtTime, ensureStyle } from './ui.js';
import { root, scroller, setRoot, setScroller, setCommentDrawer, slideAt, resetDrawerSlot } from './state.js';
import { parseRoute, isFeedRoute, syncHash, getAppliedMid, setAppliedMid, cancelHashSync } from './route.js';
import { FeedStore } from './feedstore.js';
import { getSource, setSource, resetHomePager, API } from './api.js';
import { isOpenComments, closeComments, openComments, commentState, syncCommentVars } from './comments.js';
import { onPlaying as dmOnPlaying, stopAll as dmStopAll } from './danmaku.js';
import { UpVideos } from './uppage.js';
import { dbg } from './dbg.js';
import { reportLeave, reportLeaveCurrent } from './report.js';
import { prewarm, preconnectSeed } from './prewarm.js';
import { pb, playVideo, showSoundHint, resetForMount, cancelSeekHold, offCurrent } from './playback.js';
import { attachVideo, switchQuality, setSessionHooks } from './attach.js';
import { showControls, updateArrows } from './controls.js';
import { onHomeResolved } from './rail.js';
import { buildSlide, buildDrawer } from './slide.js';
import { openDrawer, mountBadge, teardownIm } from './imdrawer.js';
import { releaseCheck, openReleaseNotes, teardownRelease } from './release.js';
import { overlayTeardown } from './overlay.js';
import { syncRouteView, teardownViews, currentView } from './views.js';
import { buildDock, teardownDock } from './sidebar.js';
import { buildTopbar, teardownTopbar, syncTopbarSeg } from './topbar.js';
import { setupInputHandlers, teardownInputHandlers } from './input.js';

// ---------- UI ----------
var io = null;
// 激活观察器工厂：切源清空 scroller 后观察列表必须重建，否则 detached slide 滞留
// io 内部表（0.9.37）；供 mount 与 switchSource 共用
function makeIO() {
  return new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && en.intersectionRatio >= CFG.io.ratio) {
        setActive(Number(en.target.dataset.idx));
      }
    });
  }, { root: scroller, threshold: [CFG.io.ratio] });
}
// player.js 只留编排层：渲染窗口/激活/滚动/初始加载/生命周期/顶栏 + 会话回接钩子。
// 已迁出：播放态与声音 → playback.js；观看上报 → report.js；预热 → prewarm.js；
// 控制栏 → controls.js；挂源/清晰度切换+契约总表 → attach.js；右侧栏 → rail.js；
// 单条 slide/评论抽屉骨架 → slide.js。

// ---- 抽屉避让的画幅分档：满高也装得下剩余区域的画面只平移不缩放 ----
// 避让缩放比按宽度推导，对竖屏这类高度受限的画面纯属浪费（宽边远没到边界却被等比缩小）。
// 判据：videoWidth/videoHeight ≤ (vw−dw)/vh → 满高画面宽 ≤ 剩余宽，translateX(−dw/2) 即可。
// 元数据到达（onMeta）与 resize 时重估，结果写在 slide 的 data-panfit 上，CSS 据此切换平移/缩放
function panFitOf(video) {
  if (!video.videoWidth || !video.videoHeight) return false;
  var dw = Math.min(CFG.comments.drawerW, window.innerWidth * CFG.comments.drawerMaxWp);
  return video.videoWidth / video.videoHeight <= (window.innerWidth - dw) / window.innerHeight;
}
function syncPanFit(slide) {
  var v = slide.querySelector('video');
  if (v && panFitOf(v)) slide.dataset.panfit = '1';
  else slide.removeAttribute('data-panfit');
}
var resizeTimer = null;
window.addEventListener('resize', function () {
  if (!scroller) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    if (!scroller) return;
    Array.prototype.forEach.call(scroller.querySelectorAll('.acsv-slide'), syncPanFit);
  }, 150); // 尾节流：拖窗口时全量 syncPanFit 没必要逐帧跑（0.9.37）
});

// 会话回接钩子：控件条/弹幕/连播/观看上报/挂源。播放态归 session.js，UI 编排留在这里
var SESSION_HOOKS = {
  initVideo: function (video) {
    video.muted = !pb.soundOn;
    video.loop = !pb.autoplayNext;
    video.playbackRate = pb.seekHold.active ? 2 : pb.playRate;
  },
  currentIdx: function () { return FeedStore.current; },
  onResolved: function (session) { onHomeResolved(session.slide, session.item); },
  play: function (video) { playVideo(video); },
  // HealthMonitor 恢复阶梯的降档动作（session.js 经 hooks 回接）
  qualitySwitch: function (session, qIdx) { switchQuality(session.item, session.slide, qIdx); },
  // 恢复链的重跑解析（mock/真实同路）与末端重挂
  refreshItem: function (item) { return FeedStore.refresh(item); },
  reattach: function (session) { attachVideo(session.slide, session.item, session.idx); },
  onAttachPlay: function (session, video) {
    playVideo(video);
    if (!pb.soundOn && !pb.firstGestureSeen) {
      var slide = video.closest('.acsv-slide');
      if (slide && !slide.querySelector('.acsv-hint')) showSoundHint(slide);
    }
  },
  onPlaying: function (session, video) {
    var slide = session.slide, item = session.item;
    if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.pause;
    showControls(slide);
    dmOnPlaying(slide, item, video);
    // 10s 首报兜底：关标签页时 pagehide 上报送不出去（真机实测），播放中先保底入史；
    // 最终进度仍由离开时上报覆盖（同秒位去重，进度推进后会再报）
    clearTimeout(slide._watchTimer);
    slide._watchTimer = setTimeout(function () {
      slide._watchTimer = null;
      if (slide.isConnected && !video.paused && session.state !== 'disposed') {
        reportLeave(session, video, 'timer');
      }
    }, CFG.time.watchReport);
  },
  onPause: function (session, video) {
    if (session.slide._ctlPlayBtn) session.slide._ctlPlayBtn.innerHTML = ICONS.play;
  },
  onMeta: function (session, video) {
    syncPanFit(session.slide); // 竖屏等满高可容的画面标记只平移，抽屉避让不白缩
    if (session.slide._ctlTime) {
      session.slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    }
  },
  onTime: function (session, video) {
    var slide = session.slide;
    if (!video.duration) return;
    var trackEl = slide._ctlTrack;
    var draggingNow = !!trackEl && trackEl.dataset.drag === '1';
    var pct = (video.currentTime / video.duration * 100) + '%';
    if (!draggingNow) {
      if (slide._ctlFill) slide._ctlFill.style.width = pct;
      if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
    }
    if (slide._ctlTime) {
      slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    }
  },
  // 播完也是一次"离开"：先报最终进度再连播滚动（后续 dispose 重复触发由同秒位去重拦截）
  onEnded: function (session) {
    reportLeave(session, session.video, 'ended');
    if (pb.autoplayNext && session.idx === FeedStore.current) scrollToIndex(session.idx + 1);
  },
  // 兜底路径：滑出渲染窗口/换清晰度重挂/切源/关闭信息流才走 dispose（相邻划走只 pause
  // 不 dispose，那条路由 setActive 负责）；video 已拆但引用仍持有最终 currentTime
  // （见 session.js dispose），在此上报离开时刻的观看进度
  onDisposed: function (session, video) {
    if (session.slide._watchTimer) { clearTimeout(session.slide._watchTimer); session.slide._watchTimer = null; }
    reportLeave(session, video, 'dispose');
  }
};
// 钩子注入 attach.js（SESSION_HOOKS 依赖上层导航/侧栏/控制栏，不能反向 import）
setSessionHooks(SESSION_HOOKS);

// HealthMonitor（卡帧看门狗 v3）在 session.js：与会话同生命周期，dispose 即停，
// 恢复阶梯经 hooks 回接 switchQuality/attachVideo。

export function renderWindow() {
  if (!scroller) return;
  var cur = FeedStore.current;
  var lo = Math.max(0, cur - CFG.win.back), hi = cur + CFG.win.fwd;
  for (var i = lo; i <= hi && i < FeedStore.items.length; i++) {
    var slide = slideAt(i);
    if (!slide) {
      slide = buildSlide(FeedStore.items[i], i, scrollToIndex);
      scroller.appendChild(slide);
      if (io) io.observe(slide);
    }
    if ((i === cur || i === cur + CFG.win.fwd) && !slide.querySelector('video')
      && slide.dataset.state !== 'error') {
      attachVideo(slide, FeedStore.items[i], i);
    }
  }
  // 只保留当前±1的视频元素，回收远处的（回滑时会重新挂载）：整会话拆除
  var slides = scroller.querySelectorAll('.acsv-slide');
  Array.prototype.forEach.call(slides, function (s) {
    var idx = Number(s.dataset.idx);
    if (idx < cur - CFG.win.back || idx > cur + CFG.win.fwd) {
      if (s._session) { s._session.dispose(); s._session = null; }
      if (idx < cur - CFG.win.back - 1 || idx > cur + CFG.win.fwd + 2) {
        var c = s.querySelector('.acsv-ambient');
        if (c) c.remove();
      }
    }
  });
  // 按索引排序，保证滚动位置正确
  var ordered = Array.prototype.slice.call(slides).sort(function (a, b) {
    return Number(a.dataset.idx) - Number(b.dataset.idx);
  });
  if (scroller.children.length !== ordered.length ||
    Array.prototype.some.call(scroller.children, function (c, k) { return c !== ordered[k]; })) {
    ordered.forEach(function (s) { scroller.appendChild(s); });
  }
  updateArrows(slideAt(cur));
}

function setActive(idx) {
  // 划走即"离开"：在 current 切走前对旧条目报最终进度（相邻划走不 dispose，
  // 这里是主路径；同 idx 重复触发的 setActive 不重报）
  if (FeedStore.current !== idx) reportLeaveCurrent('swipe');
  syncHash(idx);
  FeedStore.current = idx;
  // 每次都补缓冲（空间页列表上下文的泵也在这里启动）
  FeedStore.ensureMore().then(renderWindow);
  prewarm(idx);
  updateArrows(slideAt(idx));
  if (isOpenComments()) {
    var itC = FeedStore.items[idx];
    if (itC && commentState.sourceId !== itC.id) openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
  }
  // 暂停非当前视频，停掉其弹幕图层（滚动回来 playing 会自动重启）。
  // 0.9.37 收敛为窗口内扫描：video 只存在于渲染窗口的 slide 里，全量扫 scroller
  // 会随会话长度线性放大（slide 元素常驻）；判定谓词与 sweepVideos 共用（0.9.38）；
  // 幽灵兜底仍由 playback.sweepVideos 负责
  for (var wi = Math.max(0, idx - CFG.win.back); wi <= idx + CFG.win.fwd && wi < FeedStore.items.length; wi++) {
    var ws = slideAt(wi);
    if (!ws || !offCurrent(ws)) continue;
    var wv = ws.querySelector('video');
    if (wv && !wv.paused) {
      wv.pause();
      if (ws._dmLayer) ws._dmLayer.stop();
    }
  }
  var curSlide = slideAt(idx);
  var cur = curSlide && curSlide.querySelector('video');
  if (cur) {
    cur.muted = !pb.soundOn;
    // 用户明确暂停过的视频滑走再滑回：不强制播放（playVideo 会清 _userPaused，须先判断）
    if (!curSlide._userPaused) playVideo(cur);
    if (!pb.soundOn && !pb.firstGestureSeen) {
      if (!curSlide.querySelector('.acsv-hint')) showSoundHint(curSlide);
    }
  }
}

export function scrollToIndex(idx) {
  if (!scroller) return;
  FeedStore.ensureMore().then(function () {
    if (!scroller) return;
    // 目标可能落在渲染窗口外（深链就地跳转 / 视图条目回竖刷插入队尾）：renderWindow 只渲染
    // [cur-1, cur+1]，不先把游标挪过去就永远拿不到那条 slide，整跳会静默失败。挪游标前
    // 照 setActive 的规矩对旧条目报最终进度（划走即离开），挪后 setActive 不会重复报
    if (!slideAt(idx) && idx < FeedStore.items.length) {
      if (FeedStore.current !== idx) reportLeaveCurrent('swipe');
      FeedStore.current = idx;
    }
    renderWindow();
    var slide = slideAt(idx);
    if (slide) {
      scroller.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
      setActive(idx);
    }
  });
}

// 首屏转圈的统一清理（错误盒出现前、数据渲染前都要撤掉转圈）
function clearSpinner() {
  if (!scroller) return;
  var sp = scroller.querySelector('.acsv-spinner');
  if (sp) sp.remove();
}

// 首屏/切源/深链加载失败的统一错误盒：重试重跑传入的加载链，可反复重试直到成功
function showLoadError(msg, retry) {
  if (!scroller) return;
  clearSpinner(); // 错误盒与转圈不并存
  var box = el('div', 'acsv-errbox');
  box.style.display = 'grid';
  box.appendChild(el('p', null, msg));
  var b = el('button', 'acsv-retry', '重试');
  b.addEventListener('click', function () {
    box.remove();
    FeedStore.reset(); // 统一走 reset，不绕过封装直接改 seen/items
    if (!scroller) return;
    scroller.appendChild(el('div', 'acsv-spinner'));
    retry();
  });
  box.appendChild(b);
  scroller.appendChild(box);
}

// 首屏/切源共用的初始加载链：spinner 撤除、错误盒、渲染与吸附都在这一处收口
function loadInitial() {
  FeedStore.ensureMore().then(function () {
    if (!scroller) return; // 加载期间已退出竖刷页
    if (!FeedStore.items.length) {
      showLoadError('内容加载失败，请检查网络后重试', loadInitial);
      return;
    }
    clearSpinner();
    renderWindow();
    var slide = slideAt(FeedStore.current);
    if (slide) scroller.scrollTop = slide.offsetTop;
    setActive(FeedStore.current);
  });
}

// 流整批重置：拆旧会话/slide、重建观察器、清 scroller 与滚动位（切源与深链重置共用，勿各自内联）
function resetStream() {
  if (!scroller) return;
  Array.prototype.forEach.call(scroller.querySelectorAll('.acsv-slide'), function (sl) {
    if (sl._session) { sl._session.dispose(); sl._session = null; }
  });
  scroller.innerHTML = '';
  scroller.scrollTop = 0;
  // 旧 slide 全部移除：观察列表同步重建，detached slide 不滞留 io（0.9.37）
  if (io) io.disconnect();
  io = makeIO();
}

// 深链置顶：解析 id 空间（meow/ac；标记形态直取、历史裸数字探测）后整批重置并落到该条。
// 源随链接走（命中即 setSource，与顶栏手动切源同语义、同持久化）——否则推荐源下分享链接
// 永远打不开（旧行为：source=home 直接丢弃深链，重新随机一屏）。未命中出错误盒，
// **绝不**静默回落随机流（旧行为：链接失效时用户只看到一屏随机内容，无从判断）
function loadDeepLink(mid, src) {
  setAppliedMid(mid); // 同步登记意图：toggle 紧随其后的 syncRouteFeed 不得重复处理
  cancelHashSync();   // 残留回写会拿旧 index 把地址踩成上一条的深链
  FeedStore.reset();  // gen++：作废旧流在途响应（旧源不得回填新库）
  resetStream();
  if (scroller) scroller.appendChild(el('div', 'acsv-spinner'));
  API.deepLink(mid, src).then(function (hit) {
    if (!scroller) return; // 加载期间已退出竖刷页
    if (!hit) {
      showLoadError('链接的视频加载失败，请重试', function () { loadDeepLink(mid, src); });
      return;
    }
    setSource(hit.source);
    updateSegUI();
    // 不动 UpVideos.feedActive：空间页入口（uppage）靠它继续按主页列表顺序泵流，
    // 深链只负责把点击的那条置顶（旧路径 loadFirst 同款语义）
    FeedStore.reset();           // 源可能已变：清一次再置顶（gen++ 丢切换窗口内的在途响应）
    FeedStore.items.push(hit.item);
    FeedStore.seen[hit.item.id] = 1;
    FeedStore.current = 0;
    clearSpinner();
    renderWindow();
    setActive(0); // 地址栏由 syncHash 落到 #svfeed/<标记>/<id>，随后继续向下泵流
  });
}

function mount() {
  dbg('mount-enter');
  if (root) return;
  ensureStyle();
  preconnectSeed();
  resetForMount();

  setRoot(el('div'));
  root.id = 'acsv-root';
  root.className = 'acsv-root';

  // 顶栏（0.9.72 抽离为共享组件 topbar.js，对齐左栏 dock 模式）：搜索框居中常驻 +
  // 右侧按钮组（源切换/私信/更新/退出）。行为经 hooks 注入，组件不反向 import 本模块
  var tb = buildTopbar(root, {
    onSearch: navSearch,
    // ✕ 语义跟随 Esc：视图在栈 → 返回竖刷；竖刷态 → 退出（视图态顶栏是否可见待复用拍板）
    onExit: function () { if (currentView()) location.hash = CFG.hash; else exitFeed(); },
    onSource: switchSource,
    onDrawer: openDrawer,
    onRelease: openReleaseNotes,
    getSource: getSource
  });

  setScroller(el('div', 'acsv-scroller'));
  root.appendChild(scroller);

  buildDrawer();
  syncCommentVars(); // 首次打开抽屉前就写好 --acsv-dw（抽屉宽）/ --acsv-cscale
  root.appendChild(el('div', 'acsv-toast'));

  scroller.appendChild(el('div', 'acsv-spinner'));
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(root);
  buildDock(root); // 左栏子视图入口：竖刷路由内常驻（unmount 随 teardownDock 拆）
  mountBadge(tb.imBtn, tb.imBtn.querySelector('.acsv-im-badge'));
  dbg('root-appended');
  releaseCheck(); // 每次打开竖刷页检查一次更新（内部带最小间隔节流，失败静默）

  io = makeIO();

  setupInputHandlers({ scrollToIndex: scrollToIndex, exitFeed: exitFeed });

  var route = parseRoute();
  if (route.mid) {
    // 深链：按 id 空间解析后置顶该条（源随链接走，不再被持久化偏好拦掉）
    loadDeepLink(route.mid, route.src);
  } else {
    // 普通入口：按持久化内容源清空缓冲重新随机拉取（resetHomePager 让推荐源不吃上次会话的游标）
    resetHomePager();
    UpVideos.feedActive = false;
    setAppliedMid(null);
    FeedStore.reset();
    loadInitial();
  }
}

function unmount() {
  if (!root) return;
  cancelHashSync();   // 在途地址回写随退出作废（否则会把已退出的深链地址补写回来）
  setAppliedMid(null); // 深链意图随挂载态失效：重进时要按地址重新解析
  if (io) { io.disconnect(); io = null; }
  teardownInputHandlers();
  cancelSeekHold();
  dmStopAll();
  teardownIm(); // 停私信徽标轮询/重置抽屉模块态（不清会让重进后的私信抽屉打不开）
  teardownRelease(); // 拆更新弹窗单例与 capture 监听（root 拆后监听残留会吞站点页全局键盘）
  resetDrawerSlot(); // 清槽位：评论侧没有 teardown，防残留闭包让重进后的第一次 Esc 被吃掉
  teardownTopbar(); // 顶栏组件拆（含搜索框与右侧按钮组；徽标/红点在 teardownIm/teardownRelease 清）
  teardownDock(); // 左栏入口与视图容器随后由 teardownViews/overlayTeardown 收尾
  teardownViews();
  // 浮层栈自顶向下收尾：含 imgview（此前它无 teardown——开图后直接离开竖刷，残留监听
  // 会吞掉普通站页的全局键盘）与任何未关的抽屉/弹窗，close 回调各自幂等
  overlayTeardown();

  // 会话整批拆除（video/hls/看门狗/弹幕层/定时器一次拆净）
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-slide'), function (s) {
    if (s._session) { s._session.dispose(); s._session = null; }
  });
  var vs = root.querySelectorAll('video');
  Array.prototype.forEach.call(vs, function (v) { v.pause(); v.removeAttribute('src'); v.load(); });
  root.remove();
  setRoot(null); setScroller(null); setCommentDrawer(null);
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

function updateSegUI() {
  syncTopbarSeg(); // seg 高亮由 topbar 组件统一维护（0.9.72 抽离）
}

// 搜索提交（顶栏搜索框 Enter/按钮）：进搜索视图，关键词走地址栏
// （#svfeed/search/<kw>）——可分享/刷新回放；空词只开视图（视图内出引导态）
function navSearch(kw) {
  var base = CFG.hash + '/search';
  location.hash = kw ? base + '/' + encodeURIComponent(kw) : base;
}

// 顶栏开关：小视频 ↔ 推荐，立即重置数据流并回到第一条
function switchSource(s) {
  if (!scroller || getSource() === s) return;
  setSource(s);
  updateSegUI();
  closeComments();
  dmStopAll();
  resetStream();
  FeedStore.reset();
  loadInitial();
}

function exitFeed() {
  unmount();
  if (isFeedRoute()) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

// 挂载态深链同步：mount 的 if(root) return 让深链只在冷启动生效——已在竖刷页时把地址换成
// 另一条深链（粘贴链接、点别人的分享链接）会变成彻底无操作，随后 syncHash 还把地址栏回写成
// 正在播的那条。这里是与 views.syncRouteView 对位的补位（子视图早已做「当前 vs 路由」比对）。
// 只处理根路由：子视图段与无目标段一律不动流（Esc 回 #svfeed 不得触发任何重置）
function syncRouteFeed() {
  if (!root) return;
  var r = parseRoute();
  if (r.view || !r.mid) return;
  if (String(r.mid) === String(getAppliedMid())) return; // 同一条（含 mount 刚登记的意图）
  for (var i = 0; i < FeedStore.items.length; i++) {
    if (String(FeedStore.items[i].id) === String(r.mid)) {
      setAppliedMid(r.mid); // 已在缓冲：原地跳，不重置缓冲也不重拉
      scrollToIndex(i);
      return;
    }
  }
  loadDeepLink(r.mid, r.src); // 不在缓冲：与冷启动同一条路径（含按标记/探测选源）
}

export function toggle() {
  dbg('toggle:' + (isFeedRoute() ? 'feed' : 'off'));
  if (isFeedRoute()) {
    mount();
    syncRouteFeed(); // 挂载态下 hash 跳到另一条深链：就地跳转，不重置流
    syncRouteView(); // hashchange 已在竖刷路由内跳变（#svfeed ↔ #svfeed/<view>）：视图层进出
  } else {
    teardownViews(); // 先收视图（含 close 回调），再走 unmount 全链
    unmount();
  }
  dbg('toggle-done');
}
// hashchange 监听在 boot.js 统一编排（启动入口不散落）
