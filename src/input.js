import { CFG } from './cfg.js';
import { toast, toggleFullscreen } from './ui.js';
import { root, scroller, slideAt, playItem } from './state.js';
import { isFeedRoute } from './route.js';
import { FeedStore } from './feedstore.js';
import { pb, currentVideo, sweepVideos, togglePlayGesture, toggleMuteGesture } from './playback.js';
import { overlayTop, overlayClose } from './overlay.js';
import { getSetting } from './settings.js';

// ---------- 键盘/全屏/幽灵扫描：全局监听的注册与解除 ----------
// 上层导航（scrollToIndex/exitFeed）、视图门禁读（getView）与两个开合动作（toggleImDrawer/
// toggleComments）在 player.js，经 api 参数注入保持依赖单向（0.9.111/0.9.116 收编）；层内
// 条目的读走 state.playItem 镜像、层内游走走 api.playStep（0.9.170）——本模块不再 import
// 视图/评论/私信模块。
// 解除统一走 teardownInputHandlers（unmount 调用）。

var keyHandler = null, keyUpHandler = null, fsChangeHandler = null, ghostIv = null;

// api: { scrollToIndex, exitFeed, getView, toggleImDrawer, toggleComments, playStep }
export function setupInputHandlers(api) {
  keyHandler = function (ev) {
    if (!isFeedRoute() || !root) return;
    // 浮层栈门禁（0.9.61 收口，0.9.22「靠显式状态」精神不变——栈就是状态）：模态层
    // （更新弹窗/大图查看器）吞掉全部按键、仅 Escape 关栈顶，其余键不许穿透到弹窗
    // 后面的视频。真实键盘的模态语义在 overlay.js capture 已拦截（到不了这里），此门禁
    // 主要兜合成事件（harness，target=window）——两条路径行为一致
    var top = overlayTop();
    if (top && top.modal) {
      // 输入元素豁免（0.9.96 动态详情面板）：模态面板内的评论框要能打字（合成事件路径；
      // 真实键盘同款豁免在 overlay.js capture）——Esc 不豁免，关层语义保持
      if (ev.key !== 'Escape' && ev.target
        && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
      if (ev.key === 'Escape') overlayClose(top.id);
      return;
    }
    if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
    // 私信抽屉开合（0.9.75；0.9.116 经 api 注入）：全界面通用——放在视图门禁**之前**（顶栏私信
    // 按钮在我的/榜单/搜索/播放层都常驻，键盘要对齐；视图态其余键照旧吞）。输入框聚焦不触发（上面的目标豁免）
    if (ev.key === 'i' || ev.key === 'I') {
      if (!ev.repeat) api.toggleImDrawer();
      return;
    }
    // 子视图（#svfeed/my 等）是全屏页面：导航/互动键无意义一律吞掉，仅 Esc 放行走
    // 浮层栈（view 层在栈里，关=返回来源/竖刷）。放在 target 豁免之后——共享顶栏输入框（含搜索视图）聚焦时不受影响。
    // 播放层（0.9.74）例外：媒体键（空格/静音/快进快退/全屏）作用层内视频——currentVideo()
    // 已按 state.videoTarget 重定向；评论键 c 打层内条目（state.playItem，0.9.111 自
    // playlayer 下沉）；**导航 ↓/↑ 打层内游走（0.9.170）**——层内没有竖刷邻居，↓=当前视频
    // 相关池随机抽下一条（递归游走）、↑=回上一条（层内历史），动作在 playlayer（api.playStep）
    var curView = api.getView();
    var inPlay = curView === 'play';
    if (curView) {
      if (ev.key === 'Escape') {
        // Esc 三级链（0.9.174）：① 浮层（抽屉/大图…）先关；② 播放层还有"级别"可弹就先弹级
        //（列表播放器→回原视频；单级时 playEscape 返回 false）；③ 最后才关视图层=退出回来源
        var vTop = overlayTop();
        if (vTop && vTop.id !== 'view') { overlayClose(vTop.id); return; }
        if (inPlay && api.playEscape && api.playEscape()) return;
        if (vTop) overlayClose(vTop.id);
        return;
      }
      if (!inPlay) return;
    }
    var cur = FeedStore.current;
    switch (ev.key) {
      case 'ArrowDown': case 'PageDown': case 'j':
        if (inPlay) { ev.preventDefault(); if (!ev.repeat && api.playStep) api.playStep(1); break; }
        ev.preventDefault(); api.scrollToIndex(cur + 1); break;
      case 'ArrowUp': case 'PageUp': case 'k':
        if (inPlay) { ev.preventDefault(); if (!ev.repeat && api.playStep) api.playStep(-1); break; }
        ev.preventDefault(); api.scrollToIndex(Math.max(0, cur - 1)); break;
      case 'ArrowLeft':
        ev.preventDefault();
        (function () {
          var v = currentVideo();
          // 步长走设置层（0.9.89 收编：面板可调 5..30s；键位时现读，改完下一次按键即生效）
          if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - getSetting('seekStep'));
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
        if (ev.repeat) break; // 长按连发会播放/暂停高频抖动（0.9.34）
        togglePlayGesture(currentVideo());
        break;
      case 'm': case 'M':
        if (ev.repeat) break;
        toggleMuteGesture(currentVideo());
        break;
      case 'f': case 'F':
        if (ev.repeat) break;
        toggleFullscreen();
        break;
      case 'Escape': {
        // 浮层栈顶（更新弹窗→大图→抽屉，按打开序）：关栈顶；栈空退出竖刷页。
        // 0.9.61 起显式分支链收拢为栈——新增浮层不再改这里
        var ov = overlayTop();
        if (ov) overlayClose(ov.id);
        else api.exitFeed();
        break;
      }
      case 'c': case 'C': {
        if (ev.repeat) break; // 长按评论反复开合（0.9.34）
        // 播放层（0.9.74）：评论开合打层内那条（FeedStore 当前条不是它）
        var itC = inPlay ? playItem : FeedStore.items[cur];
        if (itC) api.toggleComments(itC);
        break;
      }
    }
  };
  keyUpHandler = function (ev) {
    if (ev.key !== 'ArrowRight' || !root) return;
    var v = currentVideo();
    if (pb.seekHold.timer) {
      // 短按：快进一个步长（步长见设置层 seekStep）
      clearTimeout(pb.seekHold.timer);
      pb.seekHold.timer = null;
      if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + getSetting('seekStep'));
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
