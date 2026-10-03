import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, elHtml, toast, fmtTime, toggleFullscreen } from './ui.js';
import { root, scroller, slideAt, isOvlSlide } from './state.js';
import { FeedStore } from './feedstore.js';
import { pb, togglePlayGesture, toggleMuteGesture } from './playback.js';
import { dmEnabled, setDmEnabled, onPlaying as dmOnPlaying, createDmBox as dmCreateBox } from './danmaku.js';
import { switchQuality, attachVideo } from './attach.js';
import { getSetting, setSetting, onChange } from './settings.js';

// ---------- 播放控制栏 ----------
// 弹幕开关的「作用」单源（0.9.89）：控制栏按钮与设置面板是同一全局开关的两个入口——
// 面板侧没有 slide 闭包，故这里下沉成纯函数，两处共用（按钮态 + 当前条图层起停）
function applyDmState(sl, item) {
  var on = dmEnabled();
  if (sl && sl._ctlDmBtn) sl._ctlDmBtn.classList.toggle('on', on);
  if (!sl) return;
  var v = sl.querySelector('video');
  if (on && v) dmOnPlaying(sl, item, v);
  else if (sl._dmLayer) sl._dmLayer.stop();
}
// 设置面板改弹幕开关 → 当前条即时同步（面板是模态：开着时看不见控制栏，关掉后必须已就位）
onChange('dmDefault', function () {
  var idx = FeedStore.current;
  applyDmState(idx >= 0 ? slideAt(idx) : null, idx >= 0 ? FeedStore.items[idx] : null);
});

export function showControls(slide) {
  if (slide.dataset.ctl !== '1') slide.dataset.ctl = '1'; // mousemove 高频：避免重复写 DOM 属性
  clearTimeout(slide._ctlTimer);
  slide._ctlTimer = setTimeout(function () {
    var v = slide.querySelector('video');
    if (v && !v.paused) slide.dataset.ctl = '';
  }, CFG.time.ctlIdle);
}

export function buildControls(slide, idx, item) {
  var box = el('div', 'acsv-controls');

  var track = el('div', 'acsv-track');
  var fill = el('div', 'acsv-track-fill');
  var handle = el('div', 'acsv-track-handle');
  var bubble = el('div', 'acsv-bubble');
  track.appendChild(fill);
  track.appendChild(handle);
  track.appendChild(bubble);

  var dragging = false;
  function videoOf() { return slide.querySelector('video'); }
  function ratioAt(ev) {
    var r = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  }
  function preview(ratio, live) {
    if (live) {
      fill.style.width = ratio * 100 + '%';
      handle.style.left = ratio * 100 + '%';
    }
    var v = videoOf();
    if (v && v.duration) bubble.textContent = fmtTime(ratio * v.duration);
    bubble.style.left = ratio * 100 + '%';
    bubble.classList.add('show');
  }
  track.addEventListener('pointerdown', function (ev) {
    dragging = true;
    track.dataset.drag = '1';
    try { track.setPointerCapture(ev.pointerId); } catch (e) { }
    preview(ratioAt(ev), true);
    ev.preventDefault();
  });
  track.addEventListener('pointermove', function (ev) {
    preview(ratioAt(ev), dragging);
  });
  track.addEventListener('pointerleave', function () {
    if (!dragging) bubble.classList.remove('show');
  });
  track.addEventListener('pointerup', function (ev) {
    if (!dragging) return;
    dragging = false;
    track.dataset.drag = '';
    var v = videoOf();
    var ratio = ratioAt(ev);
    if (v && v.duration) v.currentTime = ratio * v.duration;
    bubble.classList.remove('show');
    showControls(slide);
  });
  track.addEventListener('pointercancel', function () {
    dragging = false;
    track.dataset.drag = '';
    bubble.classList.remove('show');
  });

  var row = el('div', 'acsv-ctl-row');

  var playBtn = elHtml('button', 'acsv-cbtn acsv-cplay', ICONS.pause);
  playBtn.title = '播放/暂停（空格）';
  playBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    togglePlayGesture(videoOf());
  });

  var timeLabel = el('span', 'acsv-time', '00:00 / 00:00');
  var spacer = el('span');
  spacer.style.flex = '1';

  var autoBtn = elHtml('button', 'acsv-cbtn acsv-cauto', '<span class="acsv-dot"></span>连播');
  autoBtn.title = '播完自动播放下一条（关闭则单条循环）';
  autoBtn.classList.toggle('on', pb.autoplayNext);
  autoBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    pb.autoplayNext = !pb.autoplayNext;
    autoBtn.classList.toggle('on', pb.autoplayNext);
    if (scroller) {
      var vs = scroller.querySelectorAll('video');
      Array.prototype.forEach.call(vs, function (v) { v.loop = !pb.autoplayNext; });
    }
    toast(pb.autoplayNext ? '连播已开启：播完自动下一条' : '连播已关闭：单条循环播放');
  });

  // 倍速：与清晰度一致的展开菜单，按钮实时显示当前倍速
  var rateWrap = buildMenu(
    function () { return '倍速 ' + pb.playRate.toFixed(1) + 'x'; },
    function () {
      return CFG.rate.map(function (r) {
        return { t: r.toFixed(1) + 'x', on: r === pb.playRate };
      });
    },
    function (i) {
      pb.playRate = CFG.rate[i];
      if (scroller) {
        var vs = scroller.querySelectorAll('video');
        Array.prototype.forEach.call(vs, function (v) { v.playbackRate = pb.playRate; });
      }
      toast('播放速度：' + pb.playRate + 'x');
    },
    '切换播放速度'
  );

  var muteBtn = elHtml('button', 'acsv-cbtn acsv-cmute', pb.soundOn ? ICONS.volOn : ICONS.volOff);
  muteBtn.title = '静音开关（M）';
  muteBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleMuteGesture(videoOf());
  });

  var fsBtn = elHtml('button', 'acsv-cbtn acsv-cfs', ICONS.fs);
  fsBtn.title = '全屏（F）';
  fsBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleFullscreen();
  });

  // ---- 能力型控件：弹幕开关/发送框（cap.danmaku）、清晰度（cap.quality） ----
  // 编码/缓冲改动同步重建前向预挂条：这俩是 hls 构造参数，预挂的下一条带着改动前的
  // 实例继续跑（相邻划走只 pause 不 dispose），不重建就「间隔一条才生效」。
  // 只重建前向——后向是已看过的暂停内容，重建丢播放位置。dropCache：编码偏好变了，
  // 邻居 item 的清晰度链缓存（按旧偏好过滤的产物）一并作废；缓冲不涉及缓存不清。
  // idx+2 没有 slide 但可能已被 prewarm 按旧偏好解析（qIdx 冻结），同样作废缓存，
  // 划到时 renderWindow 会按新偏好现解析挂载
  function rebuildFwdNeighbor(slide, dropCache) {
    try {
      if (isOvlSlide(slide)) return; // 播放层 slide 无前向邻居（idx 哨兵会打到竖刷第 0 条）
      var idx = Number(slide.dataset.idx);
      if (dropCache) {
        var it2 = FeedStore.items[idx + 2];
        if (it2 && it2.cap && it2.cap.hls) { it2.urls = []; it2.qualities = null; it2.refreshed = false; }
      }
      var fwd = slideAt(idx + 1);
      var it = fwd && FeedStore.items[idx + 1];
      if (!fwd || !it || !fwd._session || !it.cap || !it.cap.hls) return;
      if (dropCache) { it.urls = []; it.qualities = null; it.refreshed = false; }
      fwd._session.dispose();
      fwd._session = null;
      attachVideo(fwd, it, idx + 1); // 直接重预挂；不经 renderWindow（避免 player↔controls 循环依赖）
    } catch (e) { }
  }

  var dmBtn = null, dmBox = null, qWrap = null, qBtn = null, qMenu = null, codecWrap = null, bufWrap = null;
  if (item && item.cap.danmaku) {
    dmBtn = el('button', 'acsv-cbtn acsv-cdm' + (dmEnabled() ? ' on' : ''), '弹');
    dmBtn.title = '弹幕开关';
    dmBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      // 只翻开关：按钮态与图层起停统一走 onChange('dmDefault') → applyDmState（单源，
      // 面板路径同一条链；这里再调一次会双重起停图层）
      setDmEnabled(!dmEnabled());
      toast(dmEnabled() ? '弹幕已开启' : '弹幕已关闭');
    });
    slide._ctlDmBtn = dmBtn; // 面板路径经 applyDmState 找得到本条按钮（同 _qBtn 体例）

    // 常驻内嵌输入框（Enter 发送，Esc 失焦）
    dmBox = dmCreateBox(item, videoOf);
  }
  if (item && item.cap.quality) {
    qWrap = el('span', 'acsv-qwrap');
    qBtn = el('button', 'acsv-cbtn acsv-cq', item.qualities ? item.qualities[item.qIdx].label : '自动');
    qBtn.title = '清晰度';
    qMenu = el('div', 'acsv-qmenu');
    qBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!item.qualities) { toast('清晰度列表还没拿到，稍等'); return; }
      if (qMenu.parentNode === qWrap) { qMenu.remove(); return; }
      qMenu.innerHTML = '';
      item.qualities.forEach(function (q, i) {
        var qi = el('button', 'acsv-qitem' + (i === item.qIdx ? ' on' : ''), q.label);
        qi.addEventListener('click', function (ev2) {
          ev2.stopPropagation();
          qMenu.remove();
          if (i !== item.qIdx) switchQuality(item, slide, i, true);
        });
        qMenu.appendChild(qi);
      });
      qWrap.appendChild(qMenu);
    });
    slide._qBtn = qBtn;
    qWrap.appendChild(qBtn);
  }
  // 编码偏好与缓冲档位（仅 home hls 源；sv 是 MP4 直链，两者均不适用）。
  // 切换都靠重挂生效：先记 _resumeAt，playing 后 seek 回去不丢进度
  if (item && item.cap.hls) {
    codecWrap = buildMenu('编码', function () {
      var cur = codecPref();
      return [
        { t: '自动', on: cur === 'auto' },
        { t: 'H.264', on: cur === 'avc' },
        { t: 'HEVC', on: cur === 'hevc' }
      ];
    }, function (i) {
      var keys = ['auto', 'avc', 'hevc'];
      setSetting('codec', keys[i]); // 0.9.89 收编：同键设置面板也改，控制栏菜单 getter 展开时现读
      toast('编码偏好：' + ['自动', 'H.264', 'HEVC'][i]);
      // 档位集随偏好过滤（applyQuality）：清懒解析缓存强制重跑解析链
      var v = slide.querySelector('video');
      if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
      item.urls = [];
      item.qualities = null;
      item.refreshed = false;
      attachVideo(slide, item, Number(slide.dataset.idx));
      rebuildFwdNeighbor(slide, true);
    });
    bufWrap = buildMenu('缓冲', function () {
      var key = getSetting('buf');
      if (!CFG.buf.presets[key]) key = CFG.buf.def;
      return Object.keys(CFG.buf.presets).map(function (k) {
        var p = CFG.buf.presets[k];
        return { t: p.label + ' ' + p.maxBufferLength + 's', on: k === key };
      });
    }, function (i) {
      var k = Object.keys(CFG.buf.presets)[i];
      var p = CFG.buf.presets[k];
      setSetting('buf', k); // 0.9.89 收编（会话内即时生效靠下面的重挂；落盘走设置层防抖）
      toast('缓冲：' + p.label + '（前向 ' + p.maxBufferLength + 's）');
      // 只影响 Hls 构造参数：重挂即生效
      var v = slide.querySelector('video');
      if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
      attachVideo(slide, item, Number(slide.dataset.idx));
      rebuildFwdNeighbor(slide, false);
    });
  }

  row.appendChild(playBtn);
  row.appendChild(timeLabel);
  row.appendChild(spacer);
  if (dmBtn) row.appendChild(dmBtn);
  if (dmBox) row.appendChild(dmBox);
  if (qWrap) row.appendChild(qWrap);
  if (codecWrap) row.appendChild(codecWrap);
  if (bufWrap) row.appendChild(bufWrap);
  row.appendChild(autoBtn);
  row.appendChild(rateWrap);
  row.appendChild(muteBtn);
  row.appendChild(fsBtn);

  box.appendChild(track);
  box.appendChild(row);
  box.addEventListener('click', function (ev) { ev.stopPropagation(); });
  box.addEventListener('mousemove', function () { showControls(slide); });

  slide._ctlTime = timeLabel;
  slide._ctlPlayBtn = playBtn;
  slide._ctlFill = fill;
  slide._ctlHandle = handle;
  slide._ctlTrack = track; // timeupdate 每帧要用，避免高频 querySelector
  return box;
}

export function updateArrows(slide) {
  if (!root) return;
  // 当前 slide 的箭头即所见状态：传参免全量扫描（长会话 slide 常驻 scroller，
  // querySelectorAll 随会话线性放大，0.9.37）；未传参回退全量（兜底路径）。
  // 显隐在每次激活时重估——离开画面的箭头带旧状态无妨，滑回即刷新
  var ups = slide ? slide.querySelectorAll('.acsv-arrow-up') : root.querySelectorAll('.acsv-arrow-up');
  Array.prototype.forEach.call(ups, function (up) {
    // 第一条直接隐藏上一条按钮
    up.style.display = FeedStore.current <= 0 ? 'none' : 'grid';
    up.disabled = FeedStore.current <= 0;
  });
}

// hls 实例/挂源/错误恢复链已迁入 session.js（3b）；这里只留编码偏好的 UI 读取。
// 当前编码偏好（档位集已在 applyQuality 按偏好过滤，这里只供 UI 高亮与 toast）。
// 0.9.89 收编：值域校验留在设置层（coerceValue），此处只管 UI 兜底默认
export function codecPref() {
  var v = getSetting('codec');
  if (v !== 'auto' && v !== 'hevc') v = CFG.codec.def;
  return v;
}

// 仿清晰度菜单的下拉构造（复用 acsv-qwrap/acsv-qmenu 样式，无需新 CSS）。
// entries 是 getter：每次展开现读，偏好在别处被改后高亮仍准确。
// title 传函数则按钮文案动态求值（展开时与选中后各刷一次，如倍速显示当前值）；tip 为悬浮提示
function buildMenu(title, getEntries, onPick, tip) {
  var wrap = el('span', 'acsv-qwrap');
  var btn = el('button', 'acsv-cbtn acsv-cq');
  var labelText = function () { return typeof title === 'function' ? title() : title; };
  btn.textContent = labelText();
  btn.title = tip || (typeof title === 'function' ? '' : title);
  var menu = el('div', 'acsv-qmenu');
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (menu.parentNode === wrap) { menu.remove(); return; }
    btn.textContent = labelText();
    menu.innerHTML = '';
    getEntries().forEach(function (en, i) {
      var it = el('button', 'acsv-qitem' + (en.on ? ' on' : ''), en.t);
      it.addEventListener('click', function (ev2) {
        ev2.stopPropagation();
        menu.remove();
        onPick(i);
        btn.textContent = labelText();
      });
      menu.appendChild(it);
    });
    wrap.appendChild(menu);
  });
  wrap.appendChild(btn);
  return wrap;
}
