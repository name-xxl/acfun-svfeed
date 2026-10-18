// ---------- 会话回接钩子（0.9.271 自 player.js 拆出，逐字搬迁） ----------
// session.js 只认「一个正在播放的视频」的状态机；控件条/弹幕/连播/观看上报/挂源这些
// UI 编排由本件回接。导航实现已迁 feedland（scrollToIndex），player 负责装配并经
// createSessionHooks 注入；本件不 import player/feedland（无回边）。归类 SKIP_B：与
// boot/player 同属组合根/编排层，对特性的装配属正常向下（口径 B 对 SKIP_B 源豁免）。
import { CFG } from './cfg.js';
import { PLAYER_ICONS } from './styles.js';
import { fmtTime, setBtnIcon, videoOf } from './ui.js';
import { applyLoop, playVideo, showSoundHint, pb } from './playback.js';
import { showControls } from './controls.js';
import { onPlaying as dmOnPlaying } from './danmaku.js';
import { switchQuality, attachVideo } from './attach.js';
import { FeedStore } from './feedstore.js';
import { markWatchProgress, reportLeave } from './report.js';
import { OVL_IDX, isOvlSlide } from './state.js';
import { currentView } from './views.js';
import { onHomeResolved } from './rail.js';
import { playStep } from './playlayer.js';
import { stat } from './dbg.js';

// ---- 抽屉避让的画幅分档：满高也装得下剩余区域的画面只平移不缩放 ----
// 避让缩放比按宽度推导，对竖屏这类高度受限的画面纯属浪费（宽边远没到边界却被等比缩小）。
// 判据：videoWidth/videoHeight ≤ (vw−dw)/vh → 满高画面宽 ≤ 剩余宽，translateX(−dw/2) 即可。
// 元数据到达（onMeta）与 resize 时重估，结果写在 slide 的 data-panfit 上，CSS 据此切换平移/缩放
function panFitOf(video) {
  if (!video.videoWidth || !video.videoHeight) return false;
  var dw = Math.min(CFG.comments.drawerW, window.innerWidth * CFG.comments.drawerMaxWp);
  return video.videoWidth / video.videoHeight <= (window.innerWidth - dw) / window.innerHeight;
}
export function syncPanFit(slide) {
  var v = videoOf(slide);
  if (v && panFitOf(v)) slide.dataset.panfit = '1';
  else slide.removeAttribute('data-panfit');
}

// 会话驱动的起播（挂载/恢复链）门禁：按"视频自己那张舞台"判——竖刷被视图盖住不起播
// （视图冷启动 loadInitial 晚到会把背后视频播起来＝幽灵音频），但同一门禁绝不能拦住
// 播放层里的视频（层内 slide 不在 scroller 里，stageVisible() 对它恒 false，0.9.74 踩过）
export function videoStageVisible(video) {
  return !!(video && video.offsetParent !== null);
}

/**
 * @param {{ scrollToIndex: (idx:number)=>void }} env
 */
export function createSessionHooks(env) {
  var scrollToIndex = env.scrollToIndex;
  return {
    initVideo: function (session, video) {
      video.volume = pb.volume;                          // 0.9.199 音量真值（0 = 静音态）
      video.muted = !pb.soundOn || pb.volume === 0;
      applyLoop(session.slide, video); // loop 落点单源（0.9.183，playback.applyLoop）
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
      if (slide._ctlPlayBtn) setBtnIcon(slide._ctlPlayBtn, PLAYER_ICONS.pause);
      showControls(slide);
      dmOnPlaying(slide, item, video);
      // 10s 首报定时器已删（0.9.87）：其"关页送不出"的兜底职责由 pause 即报（0.9.86 官方
      // 对齐）+ pagehide 直发（官方同款 sendBeacon，0.9.87 实测）接管，进度检查点不再依赖墙钟
    },
    onPause: function (session, video) {
      if (session.slide._ctlPlayBtn) setBtnIcon(session.slide._ctlPlayBtn, PLAYER_ICONS.play);
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
      if (!pb.autoplayNext) return; // 关=单条循环（loop=true，ended 事件根本不会到这）
      if (isOvlSlide(session.slide)) {
        // 连播进层（0.9.183）：0.9.78 的层内豁免写在 walk/list 会话出现之前——那时层内确实
        // 没有"下一条"；如今层内有（相关池/来源列表），接 playStep 与手动 ↓ 同路分派；
        // single 会话由 applyLoop 恒 loop 兜底，不会走到这
        playStep(1);
        return;
      }
      // 竖刷连播：显式排除已在上面的层内分支处理（0.9.78 结构化）——旧写法只靠"哨兵 -1
      // 撞不上 current"的巧合正确（改成 hooks.currentIdx() 会变成 -1===-1 成立 →
      // scrollToIndex(0)，把竖刷滚到第 0 条——0.9.77 评审点名的陷阱）
      if (session.idx === FeedStore.current) {
        scrollToIndex(session.idx + 1);
      }
    },
    // 兜底路径：滑出渲染窗口/换清晰度重挂/切源/关闭信息流才走 dispose（相邻划走只 pause
    // 不 dispose，那条路由 setActive 负责）；最终秒位走 session.lastT 拆前快照
    //（0.9.234：拆源后 video.currentTime 已归零，不能现场读）
    onDisposed: function (session) {
      reportLeave(session, null, 'dispose', session.lastT);
    }
  };
}
