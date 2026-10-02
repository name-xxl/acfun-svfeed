import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, fmtTime, ensureStyle } from './ui.js';
import { root, scroller, setRoot, setScroller, setCommentDrawer, slideAt, resetDrawerSlot } from './state.js';
import { parseRoute, isFeedRoute, syncHash } from './route.js';
import { FeedStore } from './feedstore.js';
import { getSource, setSource, resetHomePager } from './api.js';
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
import { syncRouteView, teardownViews } from './views.js';
import { buildDock, teardownDock } from './sidebar.js';
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
var logoLabel = null, segSv = null, segHome = null;

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

// 首屏/切源加载失败的统一错误盒：重试重新走 loadInitial，可反复重试直到成功
function showLoadError(msg, routeMid) {
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
    loadInitial(routeMid);
  });
  box.appendChild(b);
  scroller.appendChild(box);
}

// 首屏/切源共用的初始加载链：spinner 撤除、错误盒、渲染与吸附都在这一处收口
function loadInitial(routeMid) {
  (routeMid ? FeedStore.loadFirst(routeMid) : FeedStore.ensureMore()).then(function () {
    if (!scroller) return; // 加载期间已退出竖刷页
    if (!FeedStore.items.length) {
      showLoadError('内容加载失败，请检查网络后重试', routeMid);
      return;
    }
    clearSpinner();
    renderWindow();
    var slide = slideAt(FeedStore.current);
    if (slide) scroller.scrollTop = slide.offsetTop;
    setActive(FeedStore.current);
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

  var top = el('div', 'acsv-top');
  var logo = el('div', 'acsv-logo');
  var logoImg = el('img', 'acsv-logo-img');
  logoImg.src = CFG.api.logoSvg;
  logoImg.alt = 'AcFun';
  logo.appendChild(logoImg);
  logoLabel = el('span', null, getSource() === 'home' ? '推荐' : '小视频');
  logo.appendChild(logoLabel);
  top.appendChild(logo);
  var tr = el('div', 'acsv-top-right');
  // 内容源切换：小视频(meow) / 推荐(APP 首页推荐)
  segSv = el('button', 'acsv-seg-btn' + (getSource() !== 'home' ? ' on' : ''), '小视频');
  segHome = el('button', 'acsv-seg-btn' + (getSource() === 'home' ? ' on' : ''), '推荐');
  segSv.title = '切换到小视频流';
  segHome.title = '切换到 APP 首页推荐流';
  segSv.addEventListener('click', function (ev) { ev.stopPropagation(); switchSource('sv'); });
  segHome.addEventListener('click', function (ev) { ev.stopPropagation(); switchSource('home'); });
  var seg = el('div', 'acsv-seg');
  seg.appendChild(segSv);
  seg.appendChild(segHome);
  tr.appendChild(seg);
  // 私信入口：内联 SVG 信封字形 + 未读徽标
  var imBtn = el('button', 'acsv-tbtn acsv-im-btn');
  imBtn.title = '私信';
  imBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span class="acsv-im-badge" style="display:none"></span>';
  imBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    openDrawer();
  });
  tr.appendChild(imBtn);
  // 更新入口：release 说明弹窗 + 新版本红点（0.9.60，imBtn 同款内联 SVG + 角标）
  var updBtn = el('button', 'acsv-tbtn acsv-upd-btn');
  updBtn.title = '更新说明';
  updBtn.innerHTML = ICONS.upd + '<span class="acsv-upd-dot" style="display:none"></span>';
  updBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    openReleaseNotes();
  });
  tr.appendChild(updBtn);
  var exitBtn = el('button', 'acsv-tbtn', '✕');
  exitBtn.title = '退出（Esc）';
  exitBtn.addEventListener('click', exitFeed);
  tr.appendChild(exitBtn);
  top.appendChild(tr);
  root.appendChild(top);

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
  mountBadge(imBtn, imBtn.querySelector('.acsv-im-badge'));
  dbg('root-appended');
  releaseCheck(); // 每次打开竖刷页检查一次更新（内部带最小间隔节流，失败静默）

  io = makeIO();

  setupInputHandlers({ scrollToIndex: scrollToIndex, exitFeed: exitFeed });

  var route = parseRoute();
  var routeMid = route.mid;
  resetHomePager(); // 推荐源重新拉首屏，不吃上次会话的游标
  if (!routeMid || getSource() === 'home') {
    // 普通入口（home 模式不支持 meow 深链置顶）：清空缓冲重新拉取
    routeMid = null;
    UpVideos.feedActive = false;
    FeedStore.reset();
  }
  loadInitial(routeMid);
}

function unmount() {
  if (!root) return;
  if (io) { io.disconnect(); io = null; }
  teardownInputHandlers();
  cancelSeekHold();
  dmStopAll();
  teardownIm(); // 停私信徽标轮询/重置抽屉模块态（不清会让重进后的私信抽屉打不开）
  teardownRelease(); // 拆更新弹窗单例与 capture 监听（root 拆后监听残留会吞站点页全局键盘）
  resetDrawerSlot(); // 清槽位：评论侧没有 teardown，防残留闭包让重进后的第一次 Esc 被吃掉
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
  if (segSv) segSv.classList.toggle('on', getSource() !== 'home');
  if (segHome) segHome.classList.toggle('on', getSource() === 'home');
  if (logoLabel) logoLabel.textContent = getSource() === 'home' ? '推荐' : '小视频';
}

// 顶栏开关：小视频 ↔ 推荐，立即重置数据流并回到第一条
function switchSource(s) {
  if (!scroller || getSource() === s) return;
  setSource(s);
  updateSegUI();
  closeComments();
  dmStopAll();

  Array.prototype.forEach.call(scroller.querySelectorAll('.acsv-slide'), function (sl) {
    if (sl._session) { sl._session.dispose(); sl._session = null; }
  });
  scroller.innerHTML = '';
  scroller.scrollTop = 0;
  // 旧 slide 全部移除：观察列表同步重建，detached slide 不滞留 io（0.9.37）
  if (io) io.disconnect();
  io = makeIO();
  FeedStore.reset();
  loadInitial(null);
}

function exitFeed() {
  unmount();
  if (isFeedRoute()) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

export function toggle() {
  dbg('toggle:' + (isFeedRoute() ? 'feed' : 'off'));
  if (isFeedRoute()) {
    mount();
    syncRouteView(); // hashchange 已在竖刷路由内跳变（#svfeed ↔ #svfeed/<view>）：视图层进出
  } else {
    teardownViews(); // 先收视图（含 close 回调），再走 unmount 全链
    unmount();
  }
  dbg('toggle-done');
}
// hashchange 监听在 boot.js 统一编排（启动入口不散落）
