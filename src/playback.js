import { ICONS } from './styles.js';
import { el } from './ui.js';
import { root, scroller, slideAt, videoTarget, isOvlSlide, ovlNoNext } from './state.js';
import { FeedStore } from './feedstore.js';
import { getSetting, setSetting } from './settings.js';

// ---------- 播放态与声音原语 ----------
// 播放相关全局状态收拢在 pb 一个对象里（原 player.js 顶部散落的一批模块变量）：
// 划动/键盘/控制栏/hooks 都读写它，跨模块传值不再依赖 player.js 闭包
export var pb = {
  soundOn: false,        // 当前是否出声（localStorage 恢复，mount 时 resetForMount 刷新）
  volume: 1,             // 音量真值 0~1（0.9.199；0 即静音，与 soundOn 联动）
  firstGestureSeen: false, // 是否已发生过用户手势（浏览器自动播放策略：首次交互才能出声）
  autoplayNext: false,   // 连播开关（关闭=单条循环）
  playRate: 1,           // 全局倍速
  seekHold: { active: false, timer: null, prevRate: 1 }, // →键 长按 2x 快进状态
  soundHintShown: false, // 静音提示只弹一次
  soundHintDismissed: false
};

// 连播 loop 落点单源（0.9.183）：attach（session._attach 经 hooks.initVideo）与连播开关
// 切换（controls）两处共用。层内 single 会话没有下一条——连播开着也只循环（语义=没有
// 下一条可连时回落单条循环）；其余（竖刷任意条 / 层内 walk、list）统一 !pb.autoplayNext。
// 旧切换只扫 scroller 里的 video，层内 slide 不在其中 → 层内 loop 不随开关走（漂移）
export function applyLoop(slide, video) {
  video.loop = !pb.autoplayNext || (isOvlSlide(slide) && ovlNoNext());
}

// mount 时复位会话内手势/提示状态；静音偏好从设置层取（0.9.89 收编：老键 acsv-sound-on 首读收养）
export function resetForMount() {
  pb.firstGestureSeen = false;
  pb.soundHintShown = false;
  pb.soundOn = getSetting('sound');
  var v = Number(getSetting('vol'));
  pb.volume = (v >= 0 && v <= 1) ? v : 1;
  if (pb.volume === 0) pb.soundOn = false; // 音量为 0 即静音（两态联动，避免"开着声却没声"）
}

// 音量（0.9.199）：0~1 真值 + 与静音态的联动；控制栏竖条滑杆/静音键共用。
// 拖起来（>0）= 取消静音；拖到底（0）= 静音。落盘走设置层（防抖），跨会话记住。
export function setVolume(v) {
  v = Math.min(1, Math.max(0, Number(v) || 0));
  pb.volume = v;
  setSetting('vol', v);
  pb.soundOn = v > 0;
  applyVolume();
  refreshMuteIcons();
}

// 把当前音量/静音态落到所有 video（新建的由 player.initVideo 同步）
export function applyVolume() {
  if (!root) return;
  Array.prototype.forEach.call(root.querySelectorAll('video'), function (v) {
    v.volume = pb.volume;
    v.muted = !pb.soundOn || pb.volume === 0;
  });
}

// 当前是否"静音"（声音关 或 音量为 0）——图标与滑杆态的单一判据
export function isMuted() { return !pb.soundOn || pb.volume === 0; }

// 退出信息流时复位长按快进：恢复原速，否则倍速残留到下次进入
export function cancelSeekHold() {
  if (pb.seekHold.timer) { clearTimeout(pb.seekHold.timer); pb.seekHold.timer = null; }
  if (pb.seekHold.active) {
    pb.seekHold.active = false;
    pb.playRate = pb.seekHold.prevRate;
  }
}

export function currentVideo() {
  // 播放层开着时"当前视频"=层内那条（覆盖钩子由 playlayer 设置/清除；有钩子不回落竖刷——
  // 层内还没挂上 video 就该什么都打不到，绝不能打到背后隐藏的竖刷）
  var tf = videoTarget();
  if (tf) return tf();
  var s = slideAt(FeedStore.current);
  return s && s.querySelector('video');
}

// 「非当前即暂停」谓词：setActive 窗口扫描与 sweepVideos 幽灵扫描共用（0.9.38 收敛）
export function offCurrent(s) {
  return !s || Number(s.dataset.idx) !== FeedStore.current;
}

// 硬性兜底：任何时刻只允许当前 slide 的视频在播，其余一律暂停（防 MSE 幽灵音频）
export function sweepVideos() {
  if (!scroller) return;
  Array.prototype.forEach.call(scroller.querySelectorAll('video'), function (v) {
    if (offCurrent(v.closest('.acsv-slide')) && !v.paused) v.pause();
  });
}

export function playVideo(video) {
  var ps = video.closest && video.closest('.acsv-slide');
  if (ps) ps._userPaused = false; // 播放即清除用户暂停意图
  var p = video.play();
  if (p && p.catch) {
    p.catch(function () {
      var slide = video.closest('.acsv-slide');
      if (slide) slide.dataset.paused = '1';
    });
  }
}

export function enableSound(video) {
  setSetting('sound', true);
  pb.soundOn = true;
  if (pb.volume === 0) { pb.volume = 1; setSetting('vol', 1); } // 音量被拖到 0 后开声：回到满音量
  if (video) { video.muted = false; video.volume = pb.volume; playVideo(video); }
  refreshMuteIcons();
}

export function toggleSound(video) {
  if (pb.soundOn) {
    pb.soundOn = false;
    setSetting('sound', false);
    if (video) video.muted = true;
  } else {
    enableSound(video);
  }
  refreshMuteIcons();
}

// 点按/空格/播放按钮共用的播放-暂停切换：首次手势先开声（自动播放策略），
// 暂停记 _userPaused（滑走再滑回不强制续播）并触发一次兜底清扫
export function togglePlayGesture(video) {
  if (!video) return;
  if (!pb.firstGestureSeen && !pb.soundOn) {
    pb.firstGestureSeen = true;
    enableSound(video);
    hideSoundHint();
    return;
  }
  pb.firstGestureSeen = true;
  if (video.paused) playVideo(video);
  else {
    video.pause();
    var ps = video.closest('.acsv-slide');
    if (ps) ps._userPaused = true;
    sweepVideos();
  }
}

// 静音键/M 键共用：开关声音；开了声音顺手续播
export function toggleMuteGesture(video) {
  pb.firstGestureSeen = true;
  toggleSound(video);
  if (video && pb.soundOn) playVideo(video);
  hideSoundHint();
}

export function hideSoundHint() {
  var h = root && root.querySelector('.acsv-hint');
  if (h) h.classList.add('hide');
}

var soundHintEl = null;
export function showSoundHint(slide) {
  hideSoundHint();
  if (pb.soundHintShown || pb.soundHintDismissed || pb.soundOn || pb.firstGestureSeen) return;
  pb.soundHintShown = true;
  soundHintEl = el('div', 'acsv-hint');
  soundHintEl.appendChild(el('span', null, '🔇 当前处于静音'));
  var btn = el('button', 'acsv-hint-btn', '开启声音');
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    pb.firstGestureSeen = true;
    var v = slide.querySelector('video');
    enableSound(v);
    if (v && pb.soundOn) playVideo(v);
    hideSoundHint();
  });
  var x = el('button', 'acsv-hint-x', '✕');
  x.addEventListener('click', function (ev) {
    ev.stopPropagation();
    pb.soundHintDismissed = true;
    hideSoundHint();
  });
  soundHintEl.appendChild(btn);
  soundHintEl.appendChild(x);
  soundHintEl.addEventListener('click', function (ev) { ev.stopPropagation(); });
  slide.appendChild(soundHintEl);
}

export function refreshMuteIcons() {
  if (!root) return;
  var muted = isMuted();
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-cmute'), function (b) {
    b.innerHTML = muted ? ICONS.volOff : ICONS.volOn;
    b.classList.toggle('mute', muted); // 0.9.199：静音态可断言/可着色
  });
  // 竖条滑杆同步（0.9.199）：填充高、手柄位、数字——同一判据 pb.volume
  var pct = Math.round(pb.volume * 100);
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-volslide'), function (s) {
    var fill = s.querySelector('.voltrack i'), hd = s.querySelector('.voltrack b'), n = s.querySelector('.volnum');
    if (fill) fill.style.height = pct + '%';
    if (hd) { hd.style.bottom = pct + '%'; hd.style.display = pct > 0 ? '' : 'none'; }
    if (n) n.textContent = String(pct);
  });
}
