import { CFG } from './cfg.js';
import { toast, toggleFullscreen } from './ui.js';
import { root, scroller, slideAt } from './state.js';
import { isFeedRoute } from './route.js';
import { FeedStore } from './feedstore.js';
import { pb, currentVideo, sweepVideos, togglePlayGesture, toggleMuteGesture } from './playback.js';
import { isOpenComments, closeComments, toggleItemComments } from './comments.js';

// ---------- 键盘/全屏/幽灵扫描：全局监听的注册与解除 ----------
// 上层导航（scrollToIndex/exitFeed）在 player.js，经 api 参数注入保持依赖单向；
// 解除统一走 teardownInputHandlers（unmount 调用）。

var keyHandler = null, keyUpHandler = null, fsChangeHandler = null, ghostIv = null;

// api: { scrollToIndex, exitFeed }
export function setupInputHandlers(api) {
  keyHandler = function (ev) {
    if (!isFeedRoute() || !root) return;
    if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
    var cur = FeedStore.current;
    switch (ev.key) {
      case 'ArrowDown': case 'PageDown': case 'j':
        ev.preventDefault(); api.scrollToIndex(cur + 1); break;
      case 'ArrowUp': case 'PageUp': case 'k':
        ev.preventDefault(); api.scrollToIndex(Math.max(0, cur - 1)); break;
      case 'ArrowLeft':
        ev.preventDefault();
        (function () {
          var v = currentVideo();
          if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - CFG.time.seekStep);
        })();
        break;
      case 'ArrowRight': {
        ev.preventDefault();
        if (ev.repeat || pb.seekHold.active || pb.seekHold.timer) break;
        // 短按快进 5 秒；按住 350ms 后进入 2 倍速快进，松手恢复
        pb.seekHold.timer = setTimeout(function () {
          pb.seekHold.timer = null;
          pb.seekHold.active = true;
          pb.seekHold.prevRate = pb.playRate;
          var v = currentVideo();
          if (v) v.playbackRate = 2;
          toast('2× 快进中');
        }, CFG.time.hold);
        break;
      }
      case ' ':
        ev.preventDefault();
        togglePlayGesture(currentVideo());
        break;
      case 'm': case 'M':
        toggleMuteGesture(currentVideo());
        break;
      case 'f': case 'F':
        toggleFullscreen();
        break;
      case 'Escape':
        // 评论抽屉开着：先关抽屉；否则退出竖刷页
        if (isOpenComments()) closeComments();
        else api.exitFeed();
        break;
      case 'c': case 'C': {
        var itC = FeedStore.items[cur];
        if (itC) toggleItemComments(itC);
        break;
      }
    }
  };
  keyUpHandler = function (ev) {
    if (ev.key !== 'ArrowRight' || !root) return;
    var v = currentVideo();
    if (pb.seekHold.timer) {
      // 短按：快进 5 秒
      clearTimeout(pb.seekHold.timer);
      pb.seekHold.timer = null;
      if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + CFG.time.seekStep);
    } else if (pb.seekHold.active) {
      // 长按结束：恢复原速
      pb.seekHold.active = false;
      pb.playRate = pb.seekHold.prevRate;
      if (scroller) {
        var vs = scroller.querySelectorAll('video');
        Array.prototype.forEach.call(vs, function (x) { x.playbackRate = pb.playRate; });
      }
      toast('恢复 ' + pb.playRate.toFixed(1) + 'x');
    }
  };
  window.addEventListener('keydown', keyHandler);
  window.addEventListener('keyup', keyUpHandler);
  // 全屏切换时视口高度变化会让 mandatory snap 重新吸附到相邻 slide，
  // 在吸附发生前把 scrollTop 强制回正到当前条
  fsChangeHandler = function () {
    if (!scroller) return;
    var slide = slideAt(FeedStore.current);
    if (slide) scroller.scrollTop = slide.offsetTop;
  };
  document.addEventListener('fullscreenchange', fsChangeHandler);
  // 幽灵音频守护：定期扫描，非当前 slide 的视频一律暂停。
  // 只是兜底（setActive/pause 钩子已覆盖绝大多数场景），低频即可
  ghostIv = setInterval(sweepVideos, CFG.time.ghostIv);
  // 回前台刻意不干预：纯 <video> 音视频同用媒体时钟，hidden 期间 currentTime 照走，
  // 合成器恢复后自然呈现当前进度帧，任何 seek 都会冲刷解码管线、制造一次可感知顿挫
  //（0.9.x 的"400ms 探测 + 0.1s 顶针吸附"正是切回标签页卡顿的元凶，已移除）。
  // 回前台后真冻结由 HealthMonitor 兜底：hidden 时 disarm、回前台重建基线、
  // 连续两个探测窗确认才进恢复阶梯，不会误伤正常唤醒。
}

export function teardownInputHandlers() {
  if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (keyUpHandler) { window.removeEventListener('keyup', keyUpHandler); keyUpHandler = null; }
  if (fsChangeHandler) { document.removeEventListener('fullscreenchange', fsChangeHandler); fsChangeHandler = null; }
  if (ghostIv) { clearInterval(ghostIv); ghostIv = null; }
}
