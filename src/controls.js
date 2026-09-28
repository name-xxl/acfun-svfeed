import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, toast, fmtTime, toggleFullscreen } from './ui.js';
import { root, scroller } from './state.js';
import { FeedStore } from './feedstore.js';
import { pb, togglePlayGesture, toggleMuteGesture } from './playback.js';
import { dmEnabled, setDmEnabled, onPlaying as dmOnPlaying, createDmBox as dmCreateBox } from './danmaku.js';
import { switchQuality, attachVideo } from './attach.js';

// ---------- 播放控制栏 ----------
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

  var playBtn = el('button', 'acsv-cbtn acsv-cplay', ICONS.pause);
  playBtn.title = '播放/暂停（空格）';
  playBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    togglePlayGesture(videoOf());
  });

  var timeLabel = el('span', 'acsv-time', '00:00 / 00:00');
  var spacer = el('span');
  spacer.style.flex = '1';

  var autoBtn = el('button', 'acsv-cbtn acsv-cauto', '<span class="acsv-dot"></span>连播');
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

  var muteBtn = el('button', 'acsv-cbtn acsv-cmute', pb.soundOn ? ICONS.volOn : ICONS.volOff);
  muteBtn.title = '静音开关（M）';
  muteBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleMuteGesture(videoOf());
  });

  var fsBtn = el('button', 'acsv-cbtn acsv-cfs', ICONS.fs);
  fsBtn.title = '全屏（F）';
  fsBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleFullscreen();
  });

  // ---- 能力型控件：弹幕开关/发送框（cap.danmaku）、清晰度（cap.quality） ----
  var dmBtn = null, dmBox = null, qWrap = null, qBtn = null, qMenu = null, codecWrap = null, bufWrap = null;
  if (item && item.cap.danmaku) {
    dmBtn = el('button', 'acsv-cbtn acsv-cdm' + (dmEnabled() ? ' on' : ''), '弹');
    dmBtn.title = '弹幕开关';
    dmBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setDmEnabled(!dmEnabled());
      dmBtn.classList.toggle('on', dmEnabled());
      var v = videoOf();
      var sl = v && v.closest('.acsv-slide');
      if (dmEnabled() && sl) dmOnPlaying(sl, item, v);
      else if (sl && sl._dmLayer) sl._dmLayer.stop();
      toast(dmEnabled() ? '弹幕已开启' : '弹幕已关闭');
    });

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
      try { localStorage.setItem(CFG.lsCodec, keys[i]); } catch (e) { }
      toast('编码偏好：' + ['自动', 'H.264', 'HEVC'][i]);
      // 档位集随偏好过滤（applyQuality）：清懒解析缓存强制重跑解析链
      var v = slide.querySelector('video');
      if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
      item.urls = [];
      item.qualities = null;
      item.refreshed = false;
      attachVideo(slide, item, Number(slide.dataset.idx));
    });
    bufWrap = buildMenu('缓冲', function () {
      var key = null;
      try { key = localStorage.getItem(CFG.lsBuf); } catch (e) { }
      if (!CFG.buf.presets[key]) key = CFG.buf.def;
      return Object.keys(CFG.buf.presets).map(function (k) {
        var p = CFG.buf.presets[k];
        return { t: p.label + ' ' + p.maxBufferLength + 's', on: k === key };
      });
    }, function (i) {
      var k = Object.keys(CFG.buf.presets)[i];
      var p = CFG.buf.presets[k];
      try { localStorage.setItem(CFG.lsBuf, k); } catch (e) { }
      toast('缓冲：' + p.label + '（前向 ' + p.maxBufferLength + 's）');
      // 只影响 Hls 构造参数：重挂即生效
      var v = slide.querySelector('video');
      if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
      attachVideo(slide, item, Number(slide.dataset.idx));
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

export function updateArrows() {
  if (!root) return;
  var ups = root.querySelectorAll('.acsv-arrow-up');
  Array.prototype.forEach.call(ups, function (up) {
    // 第一条直接隐藏上一条按钮
    up.style.display = FeedStore.current <= 0 ? 'none' : 'grid';
    up.disabled = FeedStore.current <= 0;
  });
}

// hls 实例/挂源/错误恢复链已迁入 session.js（3b）；这里只留编码偏好的 UI 读取。
// 当前编码偏好（档位集已在 applyQuality 按偏好过滤，这里只供 UI 高亮与 toast）
export function codecPref() {
  var v = null;
  try { v = localStorage.getItem(CFG.lsCodec); } catch (e) { }
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
