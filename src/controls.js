import { CFG } from './cfg.js';
import { ICONS, PLAYER_ICONS } from './styles.js';
import { el, elHtml, toast, fmtTime, isCinema, toggleWebFull, toggleWindowFull, a11y, mountIcon, closeOnOutsideClick } from './ui.js';
import { root, scroller, slideAt, isOvlSlide } from './state.js';
import { FeedStore } from './feedstore.js';
import { pb, togglePlayGesture, toggleMuteGesture, applyLoop, setVolume, isMuted } from './playback.js';
import { dmEnabled, setDmEnabled, onPlaying as dmOnPlaying, createDmBox as dmCreateBox } from './danmaku.js';
import { switchQuality, attachVideo, detachSession } from './attach.js';
import { AppAPI, spriteCueAt } from './appapi.js'; // 悬停缩略图（0.9.200）
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
    // 音量滑杆开着（悬停/拖动/滚轮调节中）：保活重排，不随闲置隐藏——否则静止 2.5s
    // 整条栏连滑杆一起消失（0.9.215 用户实报「音量条不常驻」）
    if (slide._volOpen) { showControls(slide); return; }
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
  var bthumb = el('div', 'acsv-bubthumb'); // 悬停缩略图（0.9.200；无数据时不占位）
  var btime = el('div', 'acsv-bubtime');
  bubble.appendChild(bthumb);
  bubble.appendChild(btime);
  track.appendChild(fill);
  track.appendChild(handle);
  track.appendChild(bubble);

  var dragging = false;
  function videoOf() { return slide.querySelector('video'); }
  // 缩略图懒拉（0.9.200）：首次悬停才取，失败静默（整块不显示，气泡回落为"只有时间"）
  function ensureSprite() {
    if (!item || item._sprite || item._spriteBusy || !item.videoId) return;
    item._spriteBusy = true;
    AppAPI.spriteVtt(item.videoId, item.id).then(function (cues) {
      item._spriteBusy = false;
      item._sprite = cues || [];
    }, function () { item._spriteBusy = false; });
  }
  function showThumb(sec) {
    var cues = item && item._sprite;
    var c = cues && cues.length ? spriteCueAt(cues, sec) : null;
    if (!c) { bthumb.style.display = 'none'; bubble.classList.remove('has-thumb'); return; }
    bthumb.style.display = 'block';
    bubble.classList.add('has-thumb');
    bthumb.style.width = c.w + 'px';
    bthumb.style.height = c.h + 'px';
    bthumb.style.backgroundImage = 'url("' + c.url + '")';
    bthumb.style.backgroundPosition = (-c.x) + 'px ' + (-c.y) + 'px';
  }
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
    if (v && v.duration) {
      var sec = ratio * v.duration;
      btime.textContent = fmtTime(sec);
      showThumb(sec);
    }
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
    ensureSprite(); // 悬停即预取缩略图数据（懒拉一次，失败静默）
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

  var playBtn = el('button', 'acsv-cbtn acsv-cplay');
  mountIcon(playBtn, PLAYER_ICONS.pause); // 0.9.195：原生播放器图标（初始=播放中→暂停双竖条）
  a11y(playBtn, '播放/暂停（空格）');
  playBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    togglePlayGesture(videoOf());
  });

  var timeLabel = el('span', 'acsv-time', '00:00 / 00:00');
  var spacer = el('span');
  spacer.style.flex = '1';

  var autoBtn = elHtml('button', 'acsv-cbtn acsv-cauto', '<span class="acsv-dot"></span>连播');
  a11y(autoBtn, '播完自动播放下一条（关闭则单条循环）');
  autoBtn.classList.toggle('on', pb.autoplayNext);
  autoBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    pb.autoplayNext = !pb.autoplayNext;
    autoBtn.classList.toggle('on', pb.autoplayNext);
    if (root) {
      // 全舞台遍历（0.9.183）：层内 slide 挂在视图体下、不在 scroller 里——旧写法只扫
      // scroller，层内视频 loop 不随开关切换（漂移）；统一走 applyLoop（层内 single
      // 会话恒循环，不受开关影响）
      var vs = root.querySelectorAll('video');
      Array.prototype.forEach.call(vs, function (v) {
        var sl = v.closest('.acsv-slide');
        if (sl) applyLoop(sl, v);
      });
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

  // 音量（0.9.199 用户裁决「滑杆做成竖的」）：静音键 + 悬停展开的**竖条**滑杆；
  // 竖轨自下而上＝声音变大，拖到底=0＝静音（与静音键两态联动，判据 playback.isMuted）。
  // 0.9.215 显隐收归 JS（原纯 CSS :hover）：静音键（高 32px）与滑杆（bottom:38px）间有 6px
  // 死区，上够滑杆必断 hover、display 瞬切无缓冲——现 enter 即开、leave 延时 volHide 才关
  // （死区在延时窗内穿过即重新 enter 取消关闭），开期间置 slide._volOpen 让控制栏保活
  var volWrap = el('span', 'acsv-volwrap');
  var muteBtn = elHtml('button', 'acsv-cbtn acsv-cmute', isMuted() ? ICONS.volOff : ICONS.volOn);
  a11y(muteBtn, '静音开关（M）· 悬停调节音量');
  muteBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleMuteGesture(videoOf());
  });
  var volSlide = buildVolSlide();
  volWrap.appendChild(muteBtn);
  volWrap.appendChild(volSlide);
  var volHideTimer = null;
  function volOpen() {
    clearTimeout(volHideTimer);
    volHideTimer = null;
    if (volSlide.style.display !== 'flex') volSlide.style.display = 'flex';
    slide._volOpen = true;
    showControls(slide); // 悬停音量区也算活跃：唤醒/保活控制栏
  }
  function volScheduleHide() {
    clearTimeout(volHideTimer);
    volHideTimer = setTimeout(function () {
      volHideTimer = null;
      volSlide.style.display = '';
      slide._volOpen = false;
    }, CFG.time.volHide);
  }
  volWrap.addEventListener('pointerenter', volOpen);
  volWrap.addEventListener('pointerleave', volScheduleHide);
  // 悬停滚轮直调音量（±5%/格）：preventDefault+stopPropagation 双拦——playgest 的层内翻条
  // wheel 手势绑在层体上，不拦会边调音量边翻条
  volWrap.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    volOpen();
    setVolume(pb.volume + (ev.deltaY < 0 ? 0.05 : -0.05));
  }, { passive: false });

  // 画中画（0.9.200 用户裁决）：**换条/退出自动关**（不拦切换——切换会 dispose video，浏览器自会退出 PiP）；
  // 不支持的环境（pictureInPictureEnabled=false）按钮不显示
  var pipBtn = elHtml('button', 'acsv-cbtn acsv-cpip', ICONS.pip);
  a11y(pipBtn, '画中画（切到别的标签也能继续看）');
  if (typeof document.pictureInPictureEnabled === 'boolean' && !document.pictureInPictureEnabled) {
    pipBtn.style.display = 'none';
  }
  pipBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    togglePip(videoOf());
  });

  // 两级全屏（0.9.197 用户裁决）：网页全屏＝隐自身 UI、画面铺满浏览器窗口；窗口全屏＝再进 OS 全屏。
  // F 键走同一梯子（常态→网页全屏→窗口全屏→常态，见 ui.toggleFullLadder）
  var webBtn = elHtml('button', 'acsv-cbtn acsv-cwebfs', ICONS.webFs);
  a11y(webBtn, '网页全屏（铺满浏览器窗口）');
  webBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleWebFull();
    refreshFullBtns();
  });
  var winBtn = elHtml('button', 'acsv-cbtn acsv-winfs', ICONS.winFs);
  a11y(winBtn, '窗口全屏（铺满整个屏幕）');
  winBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleWindowFull();
    refreshFullBtns();
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
      detachSession(fwd);
      attachVideo(fwd, it, idx + 1); // 直接重预挂；不经 renderWindow（避免 player↔controls 循环依赖）
    } catch (e) { }
  }

  var dmBtn = null, dmBox = null, dmSetBtn = null, dmWrap = null, qWrap = null, qBtn = null, qMenu = null, codecWrap = null, bufWrap = null;
  if (item && item.cap.danmaku) {
    // 0.9.206：**回退成文本「弹」**（0.9.195 换成的原生 12×12 字形在底栏缩放后发糊、且与旁边
    // 文字键（编码/缓冲/连播/倍速）不同族——用户实机裁决改回原来的）。开关态仍走 .on 着色 + 关闭降透明
    dmBtn = el('button', 'acsv-cbtn acsv-cdm' + (dmEnabled() ? ' on' : ''), '弹');
    a11y(dmBtn, '弹幕开关');
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

    // 弹幕设置键 + 展开面板（0.9.202）：面板挂 slide（不随控制栏闲置隐藏），外点/Esc 收
    dmSetBtn = elHtml('button', 'acsv-cbtn acsv-cdmset');
    mountIcon(dmSetBtn, PLAYER_ICONS.dmset); // 原生「弹幕设置」齿轮气泡图标
    a11y(dmSetBtn, '弹幕设置');
    // 面板锚在**设置键自己**身上（0.9.206 实机修）：此前挂 slide 用 right:14px 定位，展开后
    // 右缘贴的是窗口边而不是按钮，看着"没对齐按钮"。改法与清晰度菜单同构——包一层 .acsv-dmwrap，
    // 面板 right:0 / bottom:calc(100%+12px)，右缘与下缘都由按钮定。
    var dmWrap = el('span', 'acsv-dmwrap');
    var dmPanel = buildDmPanel(slide);
    dmPanel.style.display = 'none';
    dmWrap.appendChild(dmSetBtn);
    dmWrap.appendChild(dmPanel);
    slide.appendChild(dmWrap);
    dmSetBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var on = dmPanel.style.display === 'none';
      dmPanel.style.display = on ? '' : 'none';
      dmSetBtn.classList.toggle('on', on);
    });
    closeOnOutsideClick(dmPanel, [dmSetBtn], function () {
      dmPanel.style.display = 'none';
      dmSetBtn.classList.remove('on');
    });
  }
  if (item && item.cap.quality) {
    qWrap = el('span', 'acsv-qwrap');
    qBtn = el('button', 'acsv-cbtn acsv-cq', item.qualities ? item.qualities[item.qIdx].label : '自动');
    a11y(qBtn, '清晰度');
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
  if (dmWrap) row.appendChild(dmWrap);
  if (qWrap) row.appendChild(qWrap);
  if (codecWrap) row.appendChild(codecWrap);
  if (bufWrap) row.appendChild(bufWrap);
  row.appendChild(autoBtn);
  row.appendChild(rateWrap);
  row.appendChild(volWrap);
  row.appendChild(pipBtn);
  row.appendChild(webBtn);
  row.appendChild(winBtn);

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

// ---------- 弹幕设置面板（0.9.202，用户裁决：入口在底栏、展开面板——照 A 站原生两 tab） ----------
// 入口＝底栏「弹幕设置」键（原生 bfq_dmsz 齿轮气泡图标）；面板挂 **slide**（不像控制栏那样随闲置隐藏）。
// 两个 tab 照原生：**弹幕设置**（防挡字幕/合并重复 开关 + 显示区域/不透明度/字体大小/弹幕速度 滑杆 +
// 恢复默认设置）与 **屏蔽设置**（按类型屏蔽 + 关键词过滤）。
// 任一改动即时生效：写设置（防抖落盘）+ 让当前层 refresh()（dmcanvas 用最近入参重排，不等换条）。
function buildDmPanel(slide) {
  var box = el('div', 'acsv-dmpanel');
  function apply() {
    if (slide && slide._dmLayer && slide._dmLayer.refresh) slide._dmLayer.refresh();
  }
  function swRow(label, key) {
    var r = el('div', 'acsv-dmprow');
    r.appendChild(el('label', null, label));
    var sw = el('span', 'acsv-dmpsw');
    var sync = function () { sw.classList.toggle('on', !!getSetting(key)); };
    sync();
    sw.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setSetting(key, !getSetting(key));
      sync(); apply();
    });
    r.appendChild(sw);
    return r;
  }
  function sliderRow(label, key, min, max, suffix, decode, encode) {
    var r = el('div', 'acsv-dmprow');
    r.appendChild(el('span', 'acsv-dmplb', label));
    var track = el('span', 'acsv-dmptrack');
    var fill = el('i'), hd = el('b');
    track.appendChild(fill); track.appendChild(hd);
    var val = el('span', 'acsv-dmpv');
    function dec() { var n = decode(getSetting(key)); return isNaN(n) ? min : n; }
    function paint(v) {
      var pct = (v - min) / (max - min) * 100;
      fill.style.width = pct + '%';
      hd.style.left = pct + '%';
      val.textContent = Math.round(v) + (suffix || '');
    }
    paint(dec());
    function ratioAt(ev) {
      var rect = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
    }
    function setTo(ev) {
      var v = Math.round(min + ratioAt(ev) * (max - min));
      setSetting(key, encode(v));
      paint(v); apply();
    }
    var dragging = false;
    track.addEventListener('pointerdown', function (ev) {
      dragging = true;
      try { track.setPointerCapture(ev.pointerId); } catch (e) { }
      setTo(ev);
      ev.stopPropagation(); ev.preventDefault();
    });
    track.addEventListener('pointermove', function (ev) { if (dragging) setTo(ev); });
    track.addEventListener('pointerup', function () { dragging = false; });
    track.addEventListener('pointercancel', function () { dragging = false; });
    r.appendChild(track); r.appendChild(val);
    return r;
  }
  // 内容整体重建（原地重绘：替换节点会让外侧闭包指向游离面板，齿轮从此失效）
  function fill() {
    while (box.firstChild) box.removeChild(box.firstChild);
  var tabs = el('div', 'acsv-dmptabs');
  var tSet = el('span', 'on', '弹幕设置');
  var tBlk = el('span', null, '屏蔽设置');
  tabs.appendChild(tSet); tabs.appendChild(tBlk);
  box.appendChild(tabs);

  // tab1：弹幕设置
  var bodySet = el('div', 'acsv-dmpbody');
  bodySet.appendChild(swRow('防挡字幕', 'dmSubtitle'));
  bodySet.appendChild(swRow('合并重复弹幕', 'dmMerge'));
  bodySet.appendChild(sliderRow('显示区域', 'dmArea', 30, 100, '%',
    function (v) { return Number(v); }, function (v) { return String(v); }));
  bodySet.appendChild(sliderRow('不透明度', 'dmAlpha', 20, 100, '%',
    function (v) { return Number(v); }, function (v) { return String(v); }));
  bodySet.appendChild(sliderRow('字体大小', 'dmSize', 85, 140, '%',
    function (v) { return Math.round((Number(v) || 1) * 100); }, function (v) { return (v / 100).toFixed(2); }));
  bodySet.appendChild(sliderRow('弹幕速度', 'dmSpeed', 60, 160, '%',
    function (v) { return Math.round((Number(v) || 1) * 100); }, function (v) { return (v / 100).toFixed(2); }));
  var reset = el('button', 'acsv-dmpreset', '恢复默认设置');
  reset.addEventListener('click', function (ev) {
    ev.stopPropagation();
    ['dmSubtitle', 'dmMerge', 'dmArea', 'dmAlpha', 'dmSize', 'dmSpeed'].forEach(function (k) {
      setSetting(k, DM_DEFAULT[k]);
    });
    setSetting('dmBlock', '');
    setSetting('dmFilter', '');
    refreshDmPanel(box); // 面板自身重绘（滑杆/开关回到默认）
    apply();
  });
  bodySet.appendChild(reset);
  box.appendChild(bodySet);

  // tab2：屏蔽设置
  var bodyBlk = el('div', 'acsv-dmpbody');
  bodyBlk.style.display = 'none';
  bodyBlk.appendChild(el('div', 'acsv-dmpblk', '按类型屏蔽'));
  var tags = el('div', 'acsv-dmptags');
  function blockHas(k) { return new RegExp('\\b' + k + '\\b').test(String(getSetting('dmBlock') || '')); }
  function toggleBlock(k) {
    var parts = String(getSetting('dmBlock') || '').split(/\s+/).filter(Boolean);
    var i = parts.indexOf(k);
    if (i >= 0) parts.splice(i, 1); else parts.push(k);
    setSetting('dmBlock', parts.join(' '));
    apply();
  }
  // 六类与原生一致（§10.12）；判据字段：mode / color / roleId / adv（0.9.204 补齐后两类）
  [['top', '顶部弹幕'], ['bottom', '底部弹幕'], ['scroll', '滚动弹幕'], ['color', '彩色弹幕'],
    ['role', '角色弹幕'], ['advanced', '高级弹幕']].forEach(function (p) {
    var t = el('span', 'acsv-dmptag', p[1]);
    t.classList.toggle('on', blockHas(p[0]));
    t.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleBlock(p[0]);
      t.classList.toggle('on', blockHas(p[0]));
    });
    tags.appendChild(t);
  });
  bodyBlk.appendChild(tags);
  bodyBlk.appendChild(el('div', 'acsv-dmpblk', '过滤弹幕（关键词，逗号分隔）'));
  var fi = el('input', 'acsv-dmpfilter');
  fi.type = 'text';
  fi.placeholder = '如：剧透, 前排';
  fi.value = String(getSetting('dmFilter') || '');
  fi.addEventListener('click', function (ev) { ev.stopPropagation(); });
  fi.addEventListener('input', function () { setSetting('dmFilter', fi.value); apply(); });
  bodyBlk.appendChild(fi);
  box.appendChild(bodyBlk);

  // tab 切换
  function showTab(which) {
    var isSet = which === 'set';
    tSet.classList.toggle('on', isSet);
    tBlk.classList.toggle('on', !isSet);
    bodySet.style.display = isSet ? '' : 'none';
    bodyBlk.style.display = isSet ? 'none' : '';
  }
  tSet.addEventListener('click', function (ev) { ev.stopPropagation(); showTab('set'); });
  tBlk.addEventListener('click', function (ev) { ev.stopPropagation(); showTab('block'); });
  }
  box.__fill = fill;
  fill();
  return box;
}

// 面板内控件按当前设置重绘（恢复默认后调）——原地重绘，保住外层对 box 的引用
var DM_DEFAULT = { dmSubtitle: false, dmMerge: true, dmArea: '72', dmAlpha: '100', dmSize: '1', dmSpeed: '1' };
function refreshDmPanel(box) {
  if (box && box.__fill) box.__fill();
}

// 竖条音量滑杆（0.9.199）：显隐由组装处 JS 管（pointerenter/leave + 延时关闭，0.9.215 自
// 纯 CSS hover 收归）；拖动改 pb.volume（0 即静音，两态联动）。
// 竖轨自下而上＝声音变大（原生同款语义）。指针捕获让拖出轨道也能继续调。
function buildVolSlide() {
  var box = el('div', 'acsv-volslide');
  var track = el('div', 'voltrack');
  track.appendChild(el('i'));
  track.appendChild(el('b'));
  box.appendChild(track);
  box.appendChild(el('span', 'volnum', String(Math.round(pb.volume * 100))));
  function ratioAt(ev) {
    var r = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (r.bottom - ev.clientY) / r.height));
  }
  var dragging = false;
  track.addEventListener('pointerdown', function (ev) {
    dragging = true;
    try { track.setPointerCapture(ev.pointerId); } catch (e) { }
    setVolume(ratioAt(ev));
    ev.preventDefault();
    ev.stopPropagation();
  });
  track.addEventListener('pointermove', function (ev) { if (dragging) setVolume(ratioAt(ev)); });
  track.addEventListener('pointerup', function () { dragging = false; });
  track.addEventListener('pointercancel', function () { dragging = false; });
  box.addEventListener('click', function (ev) { ev.stopPropagation(); }); // 别冒泡成 slide 点按
  return box;
}

// 画中画开关（0.9.200）：进/出 PiP。失败静默（用户手势缺失/能力不足时浏览器会 reject），
// 按钮态一律由 enter/leavepictureinpicture 事件同步（见 input.js 的监听）
function togglePip(video) {
  if (!document.pictureInPictureEnabled || !video || !video.requestPictureInPicture) return;
  if (document.pictureInPictureElement) { document.exitPictureInPicture(); return; }
  try {
    var p = video.requestPictureInPicture();
    if (p && p.catch) p.catch(function () { });
  } catch (e) { }
}

// PiP 激活态同步（跨 slide 全量扫）
export function refreshPipBtn() {
  if (!root) return;
  var on = !!document.pictureInPictureElement;
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-cpip'), function (b) { b.classList.toggle('on', on); });
}

// 全屏两键的激活态同步（跨 slide 全量扫，同 playback.refreshMuteIcons 体例）
export function refreshFullBtns() {
  if (!root) return;
  var cinema = isCinema(), fs = !!document.fullscreenElement;
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-cwebfs'), function (b) { b.classList.toggle('on', cinema); });
  Array.prototype.forEach.call(root.querySelectorAll('.acsv-winfs'), function (b) { b.classList.toggle('on', fs); });
}

export function updateArrows(slide) {  if (!root) return;
  // 当前 slide 的箭头即所见状态：传参免全量扫描（长会话 querySelectorAll 随会话线性
  // 放大，0.9.37；0.9.165 起窗外已换占位壳，全量口径收敛到 belt 带）；未传参回退全量（兜底路径）。
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
  var menuLbl = tip || (typeof title === 'function' ? '' : title);
  if (menuLbl) a11y(btn, menuLbl);
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
