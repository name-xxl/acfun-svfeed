import { ICONS } from './styles.js';
import { el, videoOf } from './ui.js';
import { root, scroller, slideAt, videoTarget, isOvlSlide, ovlNoNext } from './state.js';
import { FeedStore } from './feedstore.js';
import { getSetting, setSetting, onChange } from './settings.js';

// ---------- 播放态与声音原语 ----------
// 播放相关全局状态收拢在 pb 一个对象里（原 player.js 顶部散落的一批模块变量）：
// 划动/键盘/控制栏/hooks 都读写它，跨模块传值不再依赖 player.js 闭包。
// 四个记忆字段（soundOn/volume/autoplayNext/playRate）是 settings 层的**运行态缓存**，
// 唯一真源在设置层（0.9.285 偏好记忆单链）：写入只走 setSetting，同步/生效/刷图标全挂
// 本件底部 watchPref 订阅捆绑；**禁止本件之外直写**（test/check-pref.mjs 棘轮），唯一豁免
// 是 seekHold 的临时 2x（不落盘的瞬时态，写点也在本件）
export var pb = {
  soundOn: false,        // 当前是否出声（'sound' 订阅同步）
  volume: 1,             // 音量真值 0~1（'vol' 订阅同步；0 即静音，与 soundOn 联动）
  firstGestureSeen: false, // 是否已发生过用户手势（浏览器自动播放策略：首次交互才能出声）
  autoplayNext: false,   // 连播开关（'loop' 订阅同步）
  playRate: 1,           // 全局倍速（'rate' 订阅同步）
  seekHold: { active: false, timer: null, prevRate: 1 }, // →键 长按 2x 快进状态（临时态）
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

// 连播 loop 全舞台落点（0.9.285 自 controls 连播键收编）：层内 slide 挂在视图体下、不在
// scroller 里——开关的生效扫描必须走 root 全遍历（0.9.183 同款漂移教训）；新建 video 由
// sessionhooks.initVideo 按 pb.autoplayNext 同步
export function applyLoopAll() {
  if (!root) return;
  Array.prototype.forEach.call(root.querySelectorAll('video'), function (v) {
    var sl = v.closest('.acsv-slide');
    if (sl) applyLoop(sl, v);
  });
}

// 全局倍速落全舞台（0.9.235）：层内 slide 挂在视图体下、不在 scroller 里——倍速菜单与长按
// 恢复只扫 scroller 时层内视频全部打空（与 0.9.183 连播键同款漂移）。root 全遍历；新建
// video 由 player.initVideo 按 pb.playRate 同步（既有）
export function applyRate() {
  if (!root) return;
  Array.prototype.forEach.call(root.querySelectorAll('video'), function (v) { v.playbackRate = pb.playRate; });
}

// ---------- 偏好效果捆绑（0.9.285 偏好记忆单链） ----------
// 每个可记忆偏好「一键一捆绑」：写入方只许 setSetting（一键一出口），一切后果（pb 同步/
// 全舞台生效/图标刷新）只挂这里的订阅。watchPref 注册即以当前值跑一遍——**注册即恢复**，
// resetForMount 不再另列偏好清单（「写入点副作用清单 + 恢复清单」两份人肉对齐，正是
// 0.9.282/283 病灶的结构形态）。controls.js 对 loop/rate 另挂 UI 刷订阅；setSetting 按注册
// 序同步派发，本件先于 controls 求值（import 序）⇒ 进到 controls 的订阅时 pb 已同步。
function watchPref(key, fn) { onChange(key, fn); fn(getSetting(key)); }

watchPref('sound', function (v) {
  pb.soundOn = v;
  applyVolume();
  refreshMuteIcons();
});
watchPref('vol', function (v) {
  pb.volume = v;
  if (v === 0) pb.soundOn = false; // 音量为 0 即静音（两态联动，避免"开着声却没声"）
  applyVolume();
  refreshMuteIcons();
});
watchPref('loop', function (v) {
  pb.autoplayNext = !!v;
  applyLoopAll();
});
watchPref('rate', function (v) {
  pb.playRate = Number(v) || 1;
  applyRate();
});

// mount 时复位**会话内手势/提示**状态（0.9.285 起偏好不在此列：pb 的记忆字段由上面的
// watchPref 订阅链在模块求值期从设置层刷入并保持同步——恢复清单已消灭，不存在第二份要背）
export function resetForMount() {
  pb.firstGestureSeen = false;
  pb.soundHintShown = false;
}

// 音量（0.9.199）：0~1 真值 + 与静音态的联动；控制栏竖条滑杆/静音键共用。
// 0.9.285 单链化：拖起来（>0）= 取消静音是**会话意图**（写 pb.soundOn、不落 sound 键，
// 旧语义保留）；落盘只走 setSetting('vol')，其余（pb.volume 同步/0 即静音联动/全舞台应用/
// 图标刷新）全在 'vol' 订阅捆绑里。
export function setVolume(v) {
  v = Math.min(1, Math.max(0, Number(v) || 0));
  pb.soundOn = v > 0;
  setSetting('vol', v);
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

// 退出信息流时复位长按快进：恢复原速，否则倍速残留到下次进入。
// 与 endSeekHold 的差别=本件是卸载兜底（video 已拆，不 applyRate 不 toast）
export function cancelSeekHold() {
  if (pb.seekHold.timer) { clearTimeout(pb.seekHold.timer); pb.seekHold.timer = null; }
  if (pb.seekHold.active) {
    pb.seekHold.active = false;
    pb.playRate = pb.seekHold.prevRate;
  }
}

// 长按 2x 快进松手恢复（0.9.285 自 input.js 收编写点）：恢复原速并全舞台落 playbackRate
//（含层内，0.9.235 口径），返回是否有活动中的长按（调用方据此决定是否 toast）。
// pb.playRate 的这次写是 seekHold 临时态豁免——恢复的本来就是记忆值，不落盘
export function endSeekHold() {
  if (!pb.seekHold.active) return false;
  pb.seekHold.active = false;
  pb.playRate = pb.seekHold.prevRate;
  applyRate();
  return true;
}

export function currentVideo() {
  // 播放层开着时"当前视频"=层内那条（覆盖钩子由 playlayer 设置/清除；有钩子不回落竖刷——
  // 层内还没挂上 video 就该什么都打不到，绝不能打到背后隐藏的竖刷）
  var tf = videoTarget();
  if (tf) return tf();
  var s = slideAt(FeedStore.current);
  return videoOf(s);
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

// 开声/静音切换（0.9.285 单链化）：落盘只走 setSetting，pb.soundOn 同步与图标/全舞台应用
// 由 'sound'/'vol' 订阅链接管；video 上的即时动作（muted/续播）是本写点的上下文动作
export function enableSound(video) {
  setSetting('sound', true);
  if (pb.volume === 0) setSetting('vol', 1); // 音量被拖到 0 后开声：回满音量（订阅链连带 soundOn）
  if (video) { video.muted = false; video.volume = pb.volume; playVideo(video); }
}

export function toggleSound(video) {
  if (pb.soundOn) {
    setSetting('sound', false);
    if (video) video.muted = true;
  } else {
    enableSound(video);
  }
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
    var v = videoOf(slide);
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

// 竖条音量滑杆单支同步（0.9.237 单源）：填充高、手柄位、数字——同一判据 pb.volume。
// refreshMuteIcons 对全舞台循环调用；controls 新键滑杆时也调它（此前不画初值 ⇒ 初始空轨）
export function fillVolSlide(s) {
  var pct = Math.round(pb.volume * 100);
  var fill = s.querySelector('.voltrack i'), hd = s.querySelector('.voltrack b'), n = s.querySelector('.volnum');
  if (fill) fill.style.height = pct + '%';
  if (hd) { hd.style.bottom = pct + '%'; hd.style.display = pct > 0 ? '' : 'none'; }
  if (n) n.textContent = String(pct);
}

export function refreshMuteIcons() {
  if (!root) return;
  var muted = isMuted();
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-cmute'), function (b) {
    b.innerHTML = muted ? ICONS.volOff : ICONS.volOn;
    b.classList.toggle('mute', muted); // 0.9.199：静音态可断言/可着色
  });
  // 竖条滑杆同步（0.9.199）：填充高、手柄位、数字——单支逻辑见 fillVolSlide（0.9.237 抽出）
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-volslide'), fillVolSlide);
}
