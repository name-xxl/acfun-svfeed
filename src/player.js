import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, fmtTime, ensureStyle } from './ui.js';
import { root, scroller, setRoot, setScroller, setCommentDrawer, slideAt, resetDrawerSlot, stageVisible, isOvlSlide, OVL_IDX } from './state.js';
import { parseRoute, isFeedRoute, syncHash, getAppliedMid, setAppliedMid, cancelHashSync, setItemProvider } from './route.js';
import { FeedStore, setChangeHandler } from './feedstore.js';
import { getSource, setSource, resetHomePager, API } from './api.js';
import { isOpenComments, closeComments, openComments, commentState, syncCommentVars, toggleItemComments } from './comments.js';
import { onPlaying as dmOnPlaying, stopAll as dmStopAll } from './danmaku.js';
import { UpVideos } from './uppage.js';
import { FollowVideos, enterVideos, enterAll } from './followstream.js';
import { dbg, stat, testHook } from './dbg.js';
import { markWatchProgress, reportLeave, reportLeaveCurrent } from './report.js';
import { prewarm, preconnectSeed } from './prewarm.js';
import { pb, playVideo, showSoundHint, resetForMount, cancelSeekHold, offCurrent } from './playback.js';
import { attachVideo, switchQuality, setSessionHooks } from './attach.js';
import { showControls, updateArrows } from './controls.js';
import { onHomeResolved, setCommentsOpener } from './rail.js';
import { buildSlide, buildDrawer } from './slide.js';
import { toggleImDrawer, teardownIm } from './imdrawer.js';
import { mountBadge } from './imbadge.js'; // 未读徽标（0.9.163 自 imdrawer 拆出）
import { releaseCheck, openReleaseNotes, teardownRelease } from './release.js';
import { openSettings } from './settingspanel.js';
import { overlayTeardown } from './overlay.js';
import { syncRouteView, teardownViews, currentView, backFromOrigin } from './views.js';
import { buildDock, teardownDock, setFeedHomeHandler } from './sidebar.js';
import { startFollowBadge, stopFollowBadge } from './followbadge.js';
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
  // 播放层开着时"当前条"是层内那条（哨兵 idx）：session 的自动起播判定按它比对
  currentIdx: function () { return currentView() === 'play' ? OVL_IDX : FeedStore.current; },
  onResolved: function (session) { onHomeResolved(session.slide, session.item); },
  // 会话驱动的起播（挂载/恢复链）：舞台被视图盖住时只挂不播——隐藏舞台起播＝幽灵音频
  // （视图态 `loadInitial` 晚到的实锤路径）；退出视图由 views.resumeCurrentVideo 恢复
  play: function (video) { if (videoStageVisible(video)) playVideo(video); },
  // HealthMonitor 恢复阶梯的降档动作（session.js 经 hooks 回接）
  qualitySwitch: function (session, qIdx) { switchQuality(session.item, session.slide, qIdx); },
  // 恢复链的重跑解析（mock/真实同路）与末端重挂
  refreshItem: function (item) { return FeedStore.refresh(item); },
  reattach: function (session) { attachVideo(session.slide, session.item, session.idx); },
  onAttachPlay: function (session, video) {
    if (!videoStageVisible(video)) return; // 同上：挂载即起播的路径同样按"自己那张"让位
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
    // 10s 首报定时器已删（0.9.87）：其"关页送不出"的兜底职责由 pause 即报（0.9.86 官方
    // 对齐）+ pagehide 直发（官方同款 sendBeacon，0.9.87 实测）接管，进度检查点不再依赖墙钟
  },
  onPause: function (session, video) {
    if (session.slide._ctlPlayBtn) session.slide._ctlPlayBtn.innerHTML = ICONS.play;
    // 官方对齐（0.9.86 实测）：官方 video 页暂停即报当前位（CLIENT_BROWSE_HISTORY，
    // playedSeconds=当前秒）。暂停是自然检查点——长停留/切标签后的进度不再只停在 10s 首报。
    // dispose 链先 pause 后 dispose 的同值近邻双报由同秒位去重兜住，无需另设门槛
    reportLeave(session, video, 'pause');
  },
  onMeta: function (session, video) {
    syncPanFit(session.slide); // 竖屏等满高可容的画面标记只平移，抽屉避让不白缩
    if (session.slide._ctlTime) {
      var metaTxt = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
      session.slide._ctlTime.textContent = metaTxt;
      session.slide._lastTimeTxt = metaTxt; // 与 onTime 的同值缓存对齐（0.9.166）
    }
  },
  onTime: function (session, video) {
    var slide = session.slide;
    if (!video.duration) return;
    markWatchProgress(session, video); // 崩溃补报的落盘水位（0.9.87，内部按 CFG 节流）
    var trackEl = slide._ctlTrack;
    var draggingNow = !!trackEl && trackEl.dataset.drag === '1';
    var pct = (video.currentTime / video.duration * 100) + '%';
    var txt = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    // 同值跳过（0.9.166）：pct 每拍都在变（写了也看不出差别），时间文本 1Hz 才变——
    // 文本去重省掉 ~3/4 tick 的 textContent 写。stat 只在 pct/文本双同值的整拍跳过时
    // 计数（harness 断言用）；拖动态照旧不写进度条（_lastPct 照跟，松手即恢复真值）
    var moved = slide._lastPct !== pct;
    var talked = slide._lastTimeTxt !== txt;
    if (moved) {
      slide._lastPct = pct;
      if (!draggingNow) {
        if (slide._ctlFill) slide._ctlFill.style.width = pct;
        if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
      }
    }
    if (talked) {
      slide._lastTimeTxt = txt;
      if (slide._ctlTime) slide._ctlTime.textContent = txt;
    }
    if (!moved && !talked) stat('ontime.skip');
  },
  // 播完也是一次"离开"：先报最终进度再连播滚动（后续 dispose 重复触发由同秒位去重拦截）
  onEnded: function (session) {
    reportLeave(session, session.video, 'ended');
    // 连播判定：显式排除播放层（0.9.78 结构化）——层内没有"下一条"，层内会话也不该
    // 动竖刷游标；旧写法只靠"哨兵 -1 撞不上 current"的巧合正确（改成 hooks.currentIdx()
    // 会变成 -1===-1 成立 → scrollToIndex(0)，把竖刷滚到第 0 条——0.9.77 评审点名的陷阱）
    if (pb.autoplayNext && !isOvlSlide(session.slide) && session.idx === FeedStore.current) {
      scrollToIndex(session.idx + 1);
    }
  },
  // 兜底路径：滑出渲染窗口/换清晰度重挂/切源/关闭信息流才走 dispose（相邻划走只 pause
  // 不 dispose，那条路由 setActive 负责）；video 已拆但引用仍持有最终 currentTime
  // （见 session.js dispose），在此上报离开时刻的观看进度
  onDisposed: function (session, video) {
    reportLeave(session, video, 'dispose');
  }
};
// 会话驱动的起播（挂载/恢复链）门禁：按"视频自己那张舞台"判——竖刷被视图盖住不起播
// （视图冷启动 loadInitial 晚到会把背后视频播起来＝幽灵音频），但同一门禁绝不能拦住
// 播放层里的视频（层内 slide 不在 scroller 里，stageVisible() 对它恒 false，0.9.74 踩过）
function videoStageVisible(video) {
  return !!(video && video.offsetParent !== null);
}
// 钩子注入 attach.js（SESSION_HOOKS 依赖上层导航/侧栏/控制栏，不能反向 import）
setSessionHooks(SESSION_HOOKS);
// route 的"当前条"取件（0.9.113）：地址栏回写现读 FeedStore.items[idx]——经 provider 注入
//（route 不能反向 import 本模块/流仓库）；触发时刻读语义由 route 侧注释钉着，勿改传参形态
setItemProvider(function (idx) { return FeedStore.items[idx]; });
// rail 评论键出口（0.9.116）：右栏组件不再 import 评论域——「展开/收起评论」动作接线在编排层
//（先例 setItemProvider；input 的 c 键同动作走下方 setupInputHandlers 的 toggleComments）
setCommentsOpener(toggleItemComments);

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
      var slot = scroller.querySelector('.acsv-slide-slot[data-idx="' + i + '"]');
      if (slot) slot.replaceWith(slide); // 占位壳原位换回：offsetTop 不动，免去全量重排（0.9.165）
      else scroller.appendChild(slide);
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
      if (idx < cur - CFG.feed.slideBelt || idx > cur + CFG.feed.slideBelt) {
        // 占位壳（0.9.165 水位）：belt 之外的 slide 换等高空壳——poster 位图/控件 DOM
        // 释放；等高 ⇒ offsetTop 全表不变，零滚动补偿；按 data-idx 划回原位重建。
        // class 异于 .acsv-slide ⇒ slideAt 查不到 ⇒ 既有「目标在窗外先挪游标」路径兜住跳转
        if (io) io.unobserve(s);
        var slotEl = el('div', 'acsv-slide-slot');
        slotEl.dataset.idx = idx;
        s.replaceWith(slotEl);
        stat('slide.slot');
        return;
      }
      if (idx < cur - CFG.win.back - 1 || idx > cur + CFG.win.fwd + 2) {
        var c = s.querySelector('.acsv-ambient');
        if (c) c.remove();
      }
    }
  });
  FeedStore.slim(cur); // 数据水位与壳回收同拍（0.9.165）
  // 按索引排序，保证滚动位置正确。0.9.165 起从 children 现取（含占位壳、滤掉无 idx 的
  // 全局 spinner）——旧写法排序 sweep 前抓的 slides 快照，会把 sweep 已换成壳的 slide
  // appendChild「复活」，壳与旧 slide 并存 ⇒ slideAt 永远命中无会话的旧壳（重建永不发生）
  var ordered = Array.prototype.slice.call(scroller.children)
    .filter(function (c) { return c.dataset && c.dataset.idx != null; })
    .sort(function (a, b) {
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
  // 会随会话长度线性放大（0.9.37 时 slide 元素常驻；0.9.165 起窗外已换占位壳，
  // 全量口径收敛到 belt 带）；判定谓词与 sweepVideos 共用（0.9.38）；
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
    // 舞台被视图盖住时不起播、不弹提示：隐藏舞台起播＝幽灵音频（视图冷启动时 loadInitial
    // 晚到会把藏在视图后的视频播起来）；回来由 views.exitView 的恢复路径接管
    if (videoStageVisible(cur)) {
      // 用户明确暂停过的视频滑走再滑回：不强制播放（playVideo 会清 _userPaused，须先判断）
      if (!curSlide._userPaused) playVideo(cur);
      if (!pb.soundOn && !pb.firstGestureSeen) {
        if (!curSlide.querySelector('.acsv-hint')) showSoundHint(curSlide);
      }
    }
  }
}

// 落地：把视口移到 idx 那张，并保证「落点就是它」（0.9.74）。
//  - 舞台不可见时由 scrollToIndex 推迟调用：视图态 scroller 无布局盒，offsetTop 恒 0
//    ⇒ 旧行为静默滚回第一条（命中缓冲的同步跳最常踩）
//  - 远跳（|Δ|>1）用瞬时落位：跨多条平滑滚动期间泵流补渲染/强制吸附点都会截断动画，
//    落点漂移成"停在目标上方几条"；近跳（箭头/连播 Δ=1）保持 smooth，手感与旧版零变化
//  - 远跳落地后连续两帧复量回正一次（补插 slide 会让内容整体平移、像素锚点不动）；
//    用户自己滚过（偏离超过半屏）立即放弃，不跟手势抢
var landTimer = null;
function landAt(idx, near) {
  var slide = slideAt(idx);
  if (!slide) return;
  var target = slide.offsetTop;
  scroller.scrollTo({ top: target, behavior: near ? 'smooth' : 'auto' });
  setActive(idx);
  if (near) return;
  var tries = 2;
  (function settle() {
    if (!scroller || tries-- <= 0) return;
    var s = slideAt(idx);
    if (!s) return;
    var d = s.offsetTop - scroller.scrollTop;
    if (Math.abs(d) > 2 && Math.abs(d) < scroller.clientHeight / 2) scroller.scrollTop = s.offsetTop;
    requestAnimationFrame(settle);
  })();
}

// 视图态下 scroller 无布局盒：等它回来再落地（16ms 轮询，上限约 1s；期间离开流由 slideAt 兜底放弃）
function landWhenVisible(idx, near, tries) {
  if (!scroller) return;
  if (!stageVisible()) {
    if (tries <= 0) return;
    landTimer = setTimeout(function () { landTimer = null; landWhenVisible(idx, near, tries - 1); }, 16);
    return;
  }
  landAt(idx, near);
}

export function scrollToIndex(idx) {
  if (!scroller) return;
  FeedStore.ensureMore().then(function () {
    if (!scroller) return;
    // 目标可能落在渲染窗口外（深链就地跳转）：renderWindow 只渲染
    // [cur-1, cur+1]，不先把游标挪过去就永远拿不到那条 slide，整跳会静默失败。挪游标前
    // 照 setActive 的规矩对旧条目报最终进度（划走即离开），挪后 setActive 不会重复报
    var near = Math.abs(idx - FeedStore.current) <= 1;
    if (!slideAt(idx) && idx < FeedStore.items.length) {
      if (FeedStore.current !== idx) reportLeaveCurrent('swipe');
      FeedStore.current = idx;
    }
    renderWindow();
    if (landTimer) { clearTimeout(landTimer); landTimer = null; } // 新落点作废旧等待
    if (!stageVisible()) return landWhenVisible(idx, near, 60);
    landAt(idx, near);
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

// 舞台当前内容是否=「当前源推荐流」（0.9.140）：loadInitial 装载置真、深链置假。
// 唯一消费方 goFeedHome——它决定 dock「推荐」入口是"回舞台接着看"还是"换流重拉"
//（实报「看推荐栏视频→切榜单→回推荐，视频被刷新」的判据；卸载/播放层直达推迟首屏时为假）
var feedStreamOn = false;

// 首屏/切源共用的初始加载链：spinner 撤除、错误盒、渲染与吸附都在这一处收口
function loadInitial() {
  feedStreamOn = true; // 本链=当前源随机流（深链走 loadDeepLink，那里置假）
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
  feedStreamOn = false; // 舞台内容=链接那条，不是推荐流（0.9.140：dock「推荐」此时仍应换流重拉）
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
    // ✕ 单一意义（0.9.74 用户裁决）：退出脚本回首页——视图出口是 dock（常驻）+ Esc，
    // 深界面另有顶栏「向左返回」（onBack → 来源链顶）
    onExit: exitFeed,
    onBack: backFromOrigin,
    onSource: switchSource,
    onDrawer: toggleImDrawer, // 开合（0.9.75）：二次点击关闭——旧 openDrawer 恒开，点第二遍像没反应
    onRelease: openReleaseNotes,
    getSource: getSource,
    // 关注 seg 三键（0.9.110，撤 topbar 直连 followstream 的例外）：动作两键 + 状态读一键；
    // feedActive 是 feedctx 上下文句柄（本模块本就在多处写它，读经闭包转给顶栏）
    onFollowVideos: enterVideos,
    onFollowAll: enterAll,
    getFollowActive: function () { return FollowVideos.feedActive; }
  });

  setScroller(el('div', 'acsv-scroller'));
  root.appendChild(scroller);
  // 流仓库变更 → 窗口重绘（0.9.115）：feedstore 不反向 import 本模块，经注册缝回接；scroller
  // 守卫随件搬来（注册先于一切取流路径——首屏由 mount 尾部的 loadInitial 触发）；注销在 unmount
  setChangeHandler(function () { if (scroller) renderWindow(); });

  buildDrawer();
  syncCommentVars(); // 首次打开抽屉前就写好 --acsv-dw（抽屉宽）/ --acsv-cscale
  root.appendChild(el('div', 'acsv-toast'));

  scroller.appendChild(el('div', 'acsv-spinner'));
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(root);
  buildDock(root, { onSettings: openSettings }); // 左栏子视图入口：竖刷路由内常驻（unmount 随 teardownDock 拆）；设置齿轮出口经 hooks 注入（0.9.112）
  setFeedHomeHandler(goFeedHome); // 推荐条目显式重置入口（0.9.107）
  startFollowBadge(); // 关注未读徽标轮询（0.9.97，4.3）：dock 常驻生命周期，unmount 停
  mountBadge(tb.imBtn, tb.imBtn.querySelector('.acsv-im-badge'));
  dbg('root-appended');
  releaseCheck(); // 每次打开竖刷页检查一次更新（内部带最小间隔节流，失败静默）

  io = makeIO();

  setupInputHandlers({ scrollToIndex: scrollToIndex, exitFeed: exitFeed, getView: currentView, toggleImDrawer: toggleImDrawer, toggleComments: toggleItemComments }); // getView（0.9.111）/开合两键（0.9.116）：经注入，input 不再 import views/comments/imdrawer

  var route = parseRoute();
  if (route.mid) {
    // 深链：按 id 空间解析后置顶该条（源随链接走，不再被持久化偏好拦掉）
    loadDeepLink(route.mid, route.src);
  } else if (route.view === 'play') {
    // 播放层直达（0.9.79）：**不预热后台竖刷**——层里根本不看它，白拉一屏请求 + 后台缓冲
    // 一屏视频（0.9.77 评审实测）。推迟到真正离开层、回到舞台那一刻补拉（maybeStartFeed）。
    // 代价明账：从分享链接退出回竖刷要等一次首屏加载（换掉那份白拉的流量）
    feedDeferred = true;
  } else {
    // 普通入口：按持久化内容源清空缓冲重新随机拉取（resetHomePager 让推荐源不吃上次会话的游标）
    resetHomePager();
    UpVideos.feedActive = false;
    FollowVideos.feedActive = false; // 0.9.99：普通入口同样退出关注视频流（seg 回隐）
    setAppliedMid(null);
    FeedStore.reset();
    loadInitial();
  }
}

// 播放层直达推迟的竖刷首屏（0.9.79）：toggle 每次 hashchange 尾部问一次——真正回到舞台
// （无 currentView）才补拉；还在视图/播放层里就继续等。FeedStore 已非空（别的路径先拉了）
// 则只清标志不重复拉
var feedDeferred = false;
function maybeStartFeed() {
  if (!feedDeferred) return;
  if (!scroller) { feedDeferred = false; return; }
  if (currentView()) return;
  feedDeferred = false;
  if (FeedStore.items.length) return;
  resetHomePager();
  UpVideos.feedActive = false;
  FollowVideos.feedActive = false; // 0.9.99：同 mount 普通入口，退出关注视频流
  setAppliedMid(null);
  FeedStore.reset();
  scroller.appendChild(el('div', 'acsv-spinner'));
  loadInitial();
}

function unmount() {
  if (!root) return;
  feedDeferred = false; // 播放层直达的推迟标志随挂载态失效（重进按地址重新裁决）
  feedStreamOn = false; // 推荐流就位标志同理（0.9.140；重进由 mount 的加载分支重新裁决）
  cancelHashSync();   // 在途地址回写随退出作废（否则会把已退出的深链地址补写回来）
  setAppliedMid(null); // 深链意图随挂载态失效：重进时要按地址重新解析
  setChangeHandler(null); // 流仓库变更通知失效（0.9.115）：在途数据回流不得再触发重绘（重进由 mount 重注册）
  if (io) { io.disconnect(); io = null; }
  teardownInputHandlers();
  cancelSeekHold();
  dmStopAll();
  teardownIm(); // 停私信徽标轮询/重置抽屉模块态（不清会让重进后的私信抽屉打不开）
  teardownRelease(); // 拆更新弹窗单例与 capture 监听（root 拆后监听残留会吞站点页全局键盘）
  resetDrawerSlot(); // 清槽位：评论侧没有 teardown，防残留闭包让重进后的第一次 Esc 被吃掉
  teardownTopbar(); // 顶栏组件拆（含搜索框与右侧按钮组；徽标/红点在 teardownIm/teardownRelease 清）
  stopFollowBadge(); // 徽标轮询随 dock 拆（0.9.97）：清定时器 + 清条目角标
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
  FollowVideos.feedActive = false; // 0.9.99：显式换源=退出关注流（用户选了别的源，seg 回隐）
  UpVideos.feedActive = false; // 0.9.106：空间页上下文同清（互踩修复：此前换源只清关注侧）
  FeedStore.reset();
  loadInitial();
}

// 「推荐」入口（dock FEED_ENTRY 专用；0.9.107 实报修复）：回竖刷舞台并**重置为当前源的
// 随机流**——清列表上下文（关注视频流/空间页）、缓冲与游标重拉。此前该入口只赋裸 hash：
// 舞台已带上下文时 hashchange 链不做任何重置（syncRouteFeed 无 mid 直接 return）⇒
// 「进视频后点推荐没反应」/「从全部回舞台仍是关注视频流」两形态的共同病灶。
// 与 Esc 的分工：Esc 回舞台=**接着看**（不清上下文）；本入口=**去推荐**（显式重置）。
export function goFeedHome() {
  if (!root) { location.hash = CFG.hash; return; }
  // 0.9.140（实报「看推荐栏视频→切榜单或其它→回推荐，视频被刷新」）：本入口**只在该换流时重置**。
  // 舞台本来就是当前源推荐流（feedStreamOn）且无列表上下文时，「去推荐」与「回舞台」同一件事——
  // 关掉视图/播放层、接着看当前条，不 resetStream/重拉。保留重置的三类形态：①列表上下文活动
  //（0.9.107 两形态的共同判据——舞台带关注视频流/空间页列表时 feedActive 仍真）；②当前条来自
  // 深链（feedStreamOn=false，「去推荐」=要推荐流）；③播放层直达推迟首屏（feedStreamOn 仍假、缓冲空）。
  var keep = feedStreamOn && !FollowVideos.feedActive && !UpVideos.feedActive;
  if (!keep) {
    FollowVideos.feedActive = false;
    UpVideos.feedActive = false;
    cancelHashSync();   // 残留回写会拿旧 index 把地址踩成上一条的深链（同 switchSource 纪律）
    resetHomePager();
    setAppliedMid(null);
    resetStream();
    FeedStore.reset();
    loadInitial(); // 当前源随机流（loadInitial 自管 spinner，照 switchSource 不手动 append）
  }
  if (location.hash !== '#' + CFG.hash) location.hash = CFG.hash; // 视图/播放层退出走既有链
  else syncRouteView(); // hash 已是裸 #svfeed（如从视图 Esc 回来后）时 hashchange 不会来——
  // dock 高亮/关注 seg 显隐必须显式同步一次，否则停在旧态（0.9.107 首跑实锤两断言红）
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
    maybeStartFeed(); // 0.9.79：播放层直达推迟的竖刷首屏，回到舞台这一刻补拉
  } else {
    teardownViews(); // 先收视图（含 close 回调），再走 unmount 全链
    unmount();
  }
  dbg('toggle-done');
}
// hashchange 监听在 boot.js 统一编排（启动入口不散落）

// debug 构建测试钩子：harness 驱动「隐藏态落点」（视图开着时对已缓冲条目跳转，release 死码消除）
testHook('scrollTo', function (idx) { scrollToIndex(idx); });
