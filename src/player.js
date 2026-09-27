import { CFG } from './cfg.js';
import { ICONS, SITE_ICONS, VIDEO_ICONS } from './styles.js';
import { el, esc, fmt, fmtTime, toast, ensureStyle, copyText } from './ui.js';
import { root, scroller, setRoot, setScroller, setCommentDrawer } from './state.js';
import { parseRoute, isFeedRoute, syncHash } from './route.js';
import { FeedStore } from './feedstore.js';
import { API, getSource, setSource, resetHomePager } from './api.js';
import { isOpenComments, closeComments, openComments, commentState } from './comments.js';
import { setRealLike, setRealFollow, setRealFavorite, giveBanana } from './interact.js';
import { nativeHls, ensureHls } from './hls.js';
import { dmEnabled, setDmEnabled, onPlaying as dmOnPlaying, stopAll as dmStopAll, createDmBox as dmCreateBox } from './danmaku.js';
import { UpVideos } from './uppage.js';
import { dbg } from './dbg.js';

// ---------- UI ----------
var io = null, keyHandler = null, keyUpHandler = null, fsChangeHandler = null, ghostIv = null;
var visResumeHandler = null;
var soundOn = false, firstGestureSeen = false;
var autoplayNext = false, playRate = 1;
var seekHold = { active: false, timer: null, prevRate: 1 };
var logoLabel = null, segSv = null, segHome = null;

function currentVideo() {
  return scroller && scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"] video');
}

// ---------- 播放控制栏 ----------
function showControls(slide) {
  slide.dataset.ctl = '1';
  clearTimeout(slide._ctlTimer);
  slide._ctlTimer = setTimeout(function () {
    var v = slide.querySelector('video');
    if (v && !v.paused) slide.dataset.ctl = '';
  }, CFG.time.ctlIdle);
}

function buildControls(slide, idx, item) {
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
    var v = videoOf();
    if (!v) return;
    if (!firstGestureSeen && !soundOn) { firstGestureSeen = true; enableSound(v); hideSoundHint(); return; }
    firstGestureSeen = true;
    if (v.paused) playVideo(v);
    else { v.pause(); var ps = v.closest('.acsv-slide'); if (ps) ps._userPaused = true; sweepVideos(); }
  });

  var timeLabel = el('span', 'acsv-time', '00:00 / 00:00');
  var spacer = el('span');
  spacer.style.flex = '1';

  var autoBtn = el('button', 'acsv-cbtn acsv-cauto', '<span class="acsv-dot"></span>连播');
  autoBtn.title = '播完自动播放下一条（关闭则单条循环）';
  autoBtn.classList.toggle('on', autoplayNext);
  autoBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    autoplayNext = !autoplayNext;
    autoBtn.classList.toggle('on', autoplayNext);
    if (scroller) {
      var vs = scroller.querySelectorAll('video');
      Array.prototype.forEach.call(vs, function (v) { v.loop = !autoplayNext; });
    }
    toast(autoplayNext ? '连播已开启：播完自动下一条' : '连播已关闭：单条循环播放');
  });

  var rateBtn = el('button', 'acsv-cbtn acsv-crate', '倍速 ' + playRate.toFixed(1) + 'x');
  rateBtn.title = '切换播放速度';
  rateBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    var rates = [0.5, 1, 1.5, 2];
    var i = rates.indexOf(playRate);
    playRate = rates[(i + 1) % rates.length];
    rateBtn.textContent = '倍速 ' + playRate.toFixed(1) + 'x';
    if (scroller) {
      var vs = scroller.querySelectorAll('video');
      Array.prototype.forEach.call(vs, function (v) { v.playbackRate = playRate; });
    }
    toast('播放速度：' + playRate + 'x');
  });

  var muteBtn = el('button', 'acsv-cbtn acsv-cmute', soundOn ? ICONS.volOn : ICONS.volOff);
  muteBtn.title = '静音开关（M）';
  muteBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    var v = videoOf();
    if (!firstGestureSeen) firstGestureSeen = true;
    toggleSound(v);
    if (v && soundOn) playVideo(v);
    hideSoundHint();
  });

  var fsBtn = el('button', 'acsv-cbtn acsv-cfs', ICONS.fs);
  fsBtn.title = '全屏（F）';
  fsBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root && root.requestFullscreen) root.requestFullscreen();
  });

  // ---- 推荐模式专属控件：弹幕开关 / 常驻发送框 / 清晰度（评论在右栏） ----
  var dmBtn = null, dmBox = null, qWrap = null, qBtn = null, qMenu = null;
  if (item && item.kind === 'home') {
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

  row.appendChild(playBtn);
  row.appendChild(timeLabel);
  row.appendChild(spacer);
  if (dmBtn) row.appendChild(dmBtn);
  if (dmBox) row.appendChild(dmBox);
  if (qWrap) row.appendChild(qWrap);
  row.appendChild(autoBtn);
  row.appendChild(rateBtn);
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
  return box;
}

function updateArrows() {
  if (!root) return;
  var ups = root.querySelectorAll('.acsv-arrow-up');
  Array.prototype.forEach.call(ups, function (up) {
    // 第一条直接隐藏上一条按钮
    up.style.display = FeedStore.current <= 0 ? 'none' : 'grid';
    up.disabled = FeedStore.current <= 0;
  });
}

function refreshMuteIcons() {
  if (!root) return;
  var bs = root.querySelectorAll('.acsv-cmute');
  Array.prototype.forEach.call(bs, function (b) {
    b.innerHTML = soundOn ? ICONS.volOn : ICONS.volOff;
  });
}

function buildSlide(item, idx) {
  var slide = el('section', 'acsv-slide');
  slide.dataset.idx = idx;
  slide.dataset.state = 'loading';

  if (item.cover) {
    var amb = el('div', 'acsv-ambient');
    amb.style.backgroundImage = 'url("' + item.cover + '")';
    slide.appendChild(amb);
  }

  var spinner = el('div', 'acsv-spinner');
  var playicon = el('div', 'acsv-playicon', ICONS.play);
  var errbox = el('div', 'acsv-errbox');
  errbox.appendChild(el('p', null, '视频加载失败'));
  var retry = el('button', 'acsv-retry', '重试');
  retry.addEventListener('click', function (ev) {
    ev.stopPropagation();
    item.urlIdx = 0; item.refreshed = false;
    if (item.kind === 'home') item.urls = []; // 强制重跑解析链
    attachVideo(slide, item, idx);
  });
  errbox.appendChild(retry);
  slide.appendChild(spinner);
  slide.appendChild(playicon);
  slide.appendChild(errbox);

  slide.appendChild(buildControls(slide, idx, item));

  // 右侧操作栏
  var rail = el('div', 'acsv-rail');
  if (item.head) {
    var avWrap = el('div', 'acsv-avwrap');
    var a = el('a');
    a.href = item.userId ? CFG.api.userBase + item.userId : item.shareUrl;
    a.target = '_blank';
    var av = el('img', 'acsv-avatar');
    av.referrerPolicy = 'no-referrer';
    av.src = item.head.split('?')[0];
    av.title = item.userName;
    a.appendChild(av);
    avWrap.appendChild(a);
    if (item.userId) {
      var fb = el('div', 'acsv-followbtn' + (item.isFollowing ? ' on' : ''), item.isFollowing ? '✓' : '+');
      fb.title = item.isFollowing ? '点击取消关注' : '关注 UP 主';
      fb.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (item.followBusy) return;
        var turnOn = !item.isFollowing;
        item.followBusy = true;
        fb.textContent = '…';
        setRealFollow(item, turnOn).then(function (ok) {
          item.followBusy = false;
          if (ok) {
            item.isFollowing = turnOn;
            fb.textContent = turnOn ? '✓' : '+';
            fb.classList.toggle('on', turnOn);
            fb.title = turnOn ? '点击取消关注' : '关注 UP 主';
            toast(turnOn ? '已关注 @' + item.userName : '已取消关注 @' + item.userName);
          } else {
            fb.textContent = item.isFollowing ? '✓' : '+';
            toast('关注失败（未登录？）');
          }
        });
      });
      avWrap.appendChild(fb);
    }
    rail.appendChild(avWrap);
    // 关注状态刷新（推荐模式由 douga/info 的 user.isFollowing 回填后调用）
    slide._followSync = function () {
      if (!item.userId) return;
      fb.textContent = item.isFollowing ? '✓' : '+';
      fb.classList.toggle('on', item.isFollowing);
      fb.title = item.isFollowing ? '点击取消关注' : '关注 UP 主';
    };
  }
  function railBtn(icon, count, title, onclick) {
    var wrap = el('div');
    wrap.style.marginBottom = '25px';
    var b = el('button', 'acsv-rail-btn');
    b.title = title;
    var imgEl = null, imgOn = null, imgOff = null;
    if (icon && icon.img) {
      imgEl = el('img', 'acsv-icon-img');
      imgEl.alt = '';
      imgOff = icon.img;
      imgOn = icon.imgOn || null;
      imgEl.addEventListener('error', function () {
        b.innerHTML = icon.svg || '';
      });
      imgEl.src = icon.img;
      b.appendChild(imgEl);
    } else {
      b.innerHTML = icon;
    }
    b.addEventListener('click', function (ev) { ev.stopPropagation(); onclick(b); });
    var c = el('div', 'acsv-count', count);
    wrap.appendChild(b); wrap.appendChild(c);
    rail.appendChild(wrap);
    return { btn: b, count: c, imgEl: imgEl, imgOn: imgOn, imgOff: imgOff };
  }
  // 双态图标切换（视频页原生 SVG 正常/激活两态）
  function railImgState(ui, on) {
    if (ui && ui.imgEl && ui.imgOn) ui.imgEl.src = on ? ui.imgOn : ui.imgOff;
  }
  // 点赞（home 用视频页原生点赞图标，sv 用小视频站图标）
  var likeIcon = item.kind === 'home'
    ? { img: VIDEO_ICONS.like, imgOn: VIDEO_ICONS.likeOn, svg: ICONS.heart }
    : { img: SITE_ICONS.heart, svg: ICONS.heart };
  var likeUI = railBtn(likeIcon, fmt(item.like), '点赞', function (b) {
    if (item.likeBusy) return;
    var turnOn = !item.localLike;
    // 乐观更新
    item.localLike = turnOn;
    item.like += turnOn ? 1 : -1;
    likeUI.count.textContent = fmt(item.like);
    b.classList.toggle('on', turnOn);
    railImgState(likeUI, turnOn);
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    item.likeBusy = true;
    setRealLike(item, turnOn).then(function (ok) {
      item.likeBusy = false;
      if (ok) {
        item.liked = turnOn;
        toast(turnOn ? '已点赞' : '已取消点赞');
      } else {
        // 未登录或失败：回滚
        item.localLike = !turnOn;
        item.like += turnOn ? -1 : 1;
        likeUI.count.textContent = fmt(item.like);
        toast('点赞失败（未登录？）');
      }
      likeUI.btn.classList.toggle('on', item.liked || item.localLike);
      railImgState(likeUI, item.liked || item.localLike);
    });
  });
  likeUI.btn.classList.toggle('on', item.liked || item.localLike);
  slide._likeSync = function () {
    var on = item.liked || item.localLike;
    likeUI.btn.classList.toggle('on', on);
    railImgState(likeUI, on);
    likeUI.count.textContent = fmt(item.like); // 解析后回填真实点赞数
  };
  // 评论（两模式都在右栏，sourceType 由 item.stype 分发）
  var cmtUI = railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), '展开/收起评论（C）', function () {
    if (isOpenComments() && commentState.meowId === item.id) closeComments();
    else openComments(item.id, item.stype, item.shareUrl, item.kind);
  });
  slide._cmtSync = function () { cmtUI.count.textContent = fmt(item.comment); };
  if (item.kind === 'home') {
    // 投蕉：弹数量层（对齐视频页"点第 N 根投 N"）；已投过则不可再展开
    var banUI = railBtn({ img: VIDEO_ICONS.banana, imgOn: VIDEO_ICONS.bananaOn, svg: ICONS.banana }, fmt(item.banana), '投蕉', function (b) {
      if (item.thrown) { toast('已投过蕉啦，明天再来~'); return; }
      toggleBanPop(slide, b, item);
    });
    slide._banSync = function () {
      banUI.count.textContent = fmt(item.banana);
      railImgState(banUI, item.thrown); // 投过变色（原生亮黄态）
      banUI.btn.classList.toggle('thrown', item.thrown);
      banUI.btn.title = item.thrown ? '今日已投过蕉啦' : '投蕉';
    };
    // 收藏
    var favUI = railBtn({ img: VIDEO_ICONS.favorite, imgOn: VIDEO_ICONS.favoriteOn, svg: ICONS.star }, fmt(item.fav), '收藏', function (b) {
      if (item.favBusy) return;
      var turnOn = !item.favorited;
      item.favBusy = true;
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      setRealFavorite(item, turnOn).then(function (ok) {
        item.favBusy = false;
        if (ok) {
          item.favorited = turnOn;
          toast(turnOn ? '已加入收藏' : '已取消收藏');
        } else {
          toast('收藏失败（未登录？）');
        }
        b.classList.toggle('on', item.favorited);
        railImgState(favUI, item.favorited);
      });
    });
    favUI.btn.classList.toggle('on', item.favorited);
    slide._favSync = function () {
      favUI.count.textContent = fmt(item.fav);
      favUI.btn.classList.toggle('on', item.favorited);
      railImgState(favUI, item.favorited);
    };
  }
  // 分享（home 带分享数，sv 显示文字标签）
  var shareUI = item.kind === 'home'
    ? railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, fmt(item.share), '复制分享链接', function () {
      copyText(item.shareUrl).then(function (ok) {
        toast(ok ? '已复制：' + item.shareUrl : '复制失败，请手动复制');
      });
    })
    : railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, '分享', '复制分享链接', function () {
      copyText(item.shareUrl).then(function (ok) {
        toast(ok ? '已复制：' + item.shareUrl : '复制失败，请手动复制');
      });
    });
  if (item.kind === 'home') slide._shareSync = function () { shareUI.count.textContent = fmt(item.share); };
    // 右侧功能区与上下翻页共用一个定位容器（箭头永远在功能区上方，不遮挡）
    var side = el('div', 'acsv-side');
    var arrows = el('div', 'acsv-arrows');
    var upBtn = el('button', 'acsv-arrow acsv-arrow-up', ICONS.chevUp);
    upBtn.title = '上一个（↑）';
    upBtn.addEventListener('click', function () {
      scrollToIndex(FeedStore.current - 1);
    });
    var downBtn = el('button', 'acsv-arrow acsv-arrow-down', ICONS.chevDn);
    downBtn.title = '下一个（↓）';
    downBtn.addEventListener('click', function () {
      scrollToIndex(FeedStore.current + 1);
    });
    arrows.appendChild(upBtn);
    arrows.appendChild(downBtn);
    side.appendChild(arrows);
    side.appendChild(rail);
    slide.appendChild(side);

  // 左下角信息（快手式：作者行在上，标题在下；home 用投稿时间替代播放量）
  var info = el('div', 'acsv-info');
  var meta = el('div', 'acsv-meta');
  var up = item.userId
    ? '<a href="https://www.acfun.cn/u/' + item.userId + '" target="_blank">@' + esc(item.userName) + '</a>'
    : '<span>@' + esc(item.userName) + '</span>';
  if (item.kind === 'home') {
    meta.innerHTML = up + '<span class="acsv-date"></span>';
  } else {
    meta.innerHTML = up
      + '<span>' + esc(item.date || '') + '</span>'
      + '<span class="acsv-views">' + fmt(item.view) + '次播放</span>';
  }
  info.appendChild(meta);
  info.appendChild(el('p', 'acsv-title', esc(item.title)));
  slide.appendChild(info);

  slide.addEventListener('mousemove', function () { showControls(slide); });
  slide.addEventListener('click', onSlideTap);
  // 氛围背景的 inset:-60px + scale(1.15) 溢出使 slide 成为可横向滚动的容器，
  // Ctrl+F 定位 / 焦点导航等程序化滚动会让整个画面横向错位，发生即归零
  slide.addEventListener('scroll', function () {
    if (slide.scrollLeft !== 0) slide.scrollLeft = 0;
  });
  return slide;
}

function onSlideTap(ev) {
  var slide = ev.currentTarget;
  var idx = Number(slide.dataset.idx);
  if (idx !== FeedStore.current) return;
  var video = slide.querySelector('video');
  if (!video) return;
  if (!firstGestureSeen && !soundOn) {
    firstGestureSeen = true;
    enableSound(video);
    hideSoundHint();
    return;
  }
  firstGestureSeen = true;
  if (video.paused) playVideo(video);
  else {
    video.pause();
    var ps = video.closest('.acsv-slide');
    if (ps) ps._userPaused = true;
    sweepVideos();
  }
}

function enableSound(video) {
  try { localStorage.setItem(CFG.lsSound, '1'); } catch (e) { }
  soundOn = true;
  if (video) { video.muted = false; video.volume = 1; playVideo(video); }
  refreshMuteIcons();
}

function toggleSound(video) {
  if (soundOn) {
    soundOn = false;
    try { localStorage.setItem(CFG.lsSound, ''); } catch (e) { }
    if (video) video.muted = true;
  } else {
    enableSound(video);
  }
  refreshMuteIcons();
}

function hideSoundHint() {
  var h = root && root.querySelector('.acsv-hint');
  if (h) h.classList.add('hide');
}

// 硬性兜底：任何时刻只允许当前 slide 的视频在播，其余一律暂停（防 MSE 幽灵音频）
function sweepVideos() {
  if (!scroller) return;
  var cur = FeedStore.current;
  Array.prototype.forEach.call(scroller.querySelectorAll('video'), function (v) {
    var s = v.closest('.acsv-slide');
    if (!s || Number(s.dataset.idx) !== cur) {
      if (!v.paused) v.pause();
    }
  });
}

function playVideo(video) {
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

function destroyHls(slide) {
  if (slide._hls) {
    try { slide._hls.destroy(); } catch (e) { }
    slide._hls = null;
  }
}

// 按内容源挂播放源：sv=mp4 直链；home=m3u8（Safari 原生，其余走 hls.js）
function playCurrent(slide, video, item) {
  if (item.kind !== 'home') {
    video.src = item.urls[item.urlIdx];
    return;
  }
  var url = item.urls[item.urlIdx];
  if (nativeHls(video)) {
    video.src = url;
    return;
  }
  ensureHls().then(function (Hls) {
    if (!slide.isConnected || slide.querySelector('video') !== video) return; // 期间已换绑
    if (!Hls || !Hls.isSupported()) { video.src = url; return; }
    destroyHls(slide);
    var hls = new Hls({
      enableWorker: true,     // 转封装移入 Worker 线程，主线程只做解码渲染，降低卡帧概率
      maxBufferLength: 60,    // 前向缓冲 60s：网络抖动/瞬时卡顿不易饿死
      maxBufferSize: 120,     // 缓冲内存上限（MB）
      backBufferLength: 30,   // 及时回收回看缓冲，降低内存压力
      nudgeMaxRetry: 10       // 内部推帧重试次数提高
    });
    slide._hls = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    // 若该 m3u8 内含多档位，强制锁最高，防止 ABR 自动降档造成画质损失
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      if (hls.levels && hls.levels.length > 1) hls.currentLevel = hls.levels.length - 1;
    });
    hls.on(Hls.Events.ERROR, function (_, data) {
      if (data && data.fatal) handlePlayError(slide, video, item, FeedStore.current);
    });
  }, function () {
    video.src = url; // hls.js 拉取失败：赌一把原生解码
  });
}

// 播放错误统一恢复链（video error 与 hls fatal 共用）：
// 同档备用 CDN → 重跑解析（sv 重取详情 / home 重解析）→ error 态
function handlePlayError(slide, video, item, idx) {
  // 被移除的旧 video 闭包着活 slide：它的误事件不得驱动恢复链
  if (!slide.isConnected || !video.isConnected) return;
  // 换 CDN/重解析都会重挂源（video.load 归零），先记下进度，playing 后 seek 回去。
  // 否则后台挂久回前台时 Chromium 偶发的解码错误会把视频打回开头重放。
  if (video.currentTime > 1) slide._resumeAt = video.currentTime;
  if (item.urlIdx < item.urls.length - 1) {
    item.urlIdx++;
    playCurrent(slide, video, item);
    video.load();
    return;
  }
  if (!item.refreshed) {
    item.refreshed = true;
    if (item.kind === 'home') item.urls = [];
    FeedStore.refresh(item).then(function (ok) {
      if (ok && item.urls.length) {
        item.urlIdx = 0;
        playCurrent(slide, video, item);
        video.load();
        if (idx === FeedStore.current) playVideo(video);
      } else {
        slide.dataset.state = 'error';
      }
    });
    return;
  }
  slide.dataset.state = 'error';
}

// 投蕉数量选择弹层：默认全灰，悬停第 N 根时 1~N 一起变亮，点第 N 根投 N，点外部关闭
function toggleBanPop(slide, btn, item) {
  var existing = slide.querySelector('.acsv-banpop');
  if (existing) { existing.remove(); return; }
  var pop = el('div', 'acsv-banpop');
  var opts = [];
  var build = function (n) {
    var ob = el('button');
    ob.title = '投 ' + n + ' 根香蕉';
    var img = el('img');
    img.alt = '';
    img.src = VIDEO_ICONS.banana; // 默认灰
    img.addEventListener('error', function () { ob.textContent = n; });
    ob.appendChild(img);
    ob._img = img;
    ob.addEventListener('mouseenter', function () {
      opts.forEach(function (o, i) { o._img.src = i < n ? VIDEO_ICONS.bananaOn : VIDEO_ICONS.banana; });
    });
    ob.addEventListener('click', function (ev) {
      ev.stopPropagation();
      pop.remove();
      if (item.banBusy) return;
      item.banBusy = true;
      giveBanana(item, n).then(function (ok) {
        item.banBusy = false;
        if (ok) {
          item.banana += n;
          item.thrown = true; // 投蕉不可取消：投过即锁定
          if (slide._banSync) slide._banSync();
          toast('投出 ' + n + ' 根香蕉');
        } else {
          toast('投蕉失败（未登录或今日已投完？）');
        }
      });
    });
    opts.push(ob);
    pop.appendChild(ob);
  };
  for (var n = 1; n <= 5; n++) build(n);
  pop.addEventListener('mouseleave', function () {
    opts.forEach(function (o) { o._img.src = VIDEO_ICONS.banana; });
  });
  btn.parentNode.style.position = 'relative';
  btn.parentNode.appendChild(pop);
  setTimeout(function () {
    document.addEventListener('click', function onDoc() {
      if (pop.parentNode) pop.remove();
      document.removeEventListener('click', onDoc);
    });
  }, 0);
}

// home 条目解析完成后，把右侧栏/控制栏的计数与初始状态回填
function onHomeResolved(slide, item) {
  if (slide._likeSync) slide._likeSync();
  if (slide._favSync) slide._favSync();
  if (slide._banSync) slide._banSync();
  if (slide._cmtSync) slide._cmtSync();
  if (slide._shareSync) slide._shareSync();
  if (slide._followSync) slide._followSync();
  if (slide._qBtn) slide._qBtn.textContent = item.qualities ? item.qualities[item.qIdx].label : '自动';
  var ds = slide.querySelector('.acsv-meta .acsv-date');
  if (ds) ds.textContent = item.date || '';
}

// 清晰度切换：保留进度重挂（slide._resumeAt 在 playing 后 seek 回去）
// manual=true 表示用户在菜单手选：此后看门狗不再对该条目自动降档
function switchQuality(item, slide, qIdx, manual) {
  var video = slide.querySelector('video');
  if (!video || !item.qualities || !item.qualities[qIdx]) return;
  var t = video.currentTime || 0;
  item.qIdx = qIdx;
  item.urls = item.qualities[qIdx].urls;
  item.urlIdx = 0;
  item.refreshed = false;
  item._freezeTries = 0; // 新档位重新观察
  if (manual) item._qManual = true;
  try { localStorage.setItem(CFG.lsQuality, item.qualities[qIdx].label); } catch (e) { }
  slide._resumeAt = t;
  if (slide._qBtn) slide._qBtn.textContent = item.qualities[qIdx].label; // 底栏标识同步
  attachVideo(slide, item, Number(slide.dataset.idx));
  toast('清晰度：' + item.qualities[qIdx].label);
}

function attachVideo(slide, item, idx) {
  slide.dataset.state = 'loading';
  destroyHls(slide);
  if (slide._dmLayer) { slide._dmLayer.destroy(); slide._dmLayer = null; }
  if (slide._stallIv) { clearInterval(slide._stallIv); slide._stallIv = null; }
  if (slide._stallVis) { document.removeEventListener('visibilitychange', slide._stallVis); slide._stallVis = null; }
  // 清掉全部旧 video。不能用 src=''：空 src 会异步触发一次 SRC_NOT_SUPPORTED error，
  // 而被移除元素的监听器闭包着活 slide，会驱动 handlePlayError 写 _resumeAt/换 CDN/给
  // 离屏元素重新挂源——46s 被拽回 19s、进度条抽搐、暂停关不掉幽灵声音的共同根源。
  // removeAttribute('src') + load() 是规范拆除，不产生 error 事件。
  var olds = slide.querySelectorAll('video');
  Array.prototype.forEach.call(olds, function (v) {
    v.pause(); v.removeAttribute('src'); v.load(); v.remove();
  });
  var video = document.createElement('video');
  video.className = 'acsv-video';
  video.muted = !soundOn;
  video.loop = !autoplayNext;
  video.playbackRate = seekHold.active ? 2 : playRate;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';

  // 推荐模式懒解析：卡片无直链，先跑 douga/info → playInfo 再挂
  if (item.kind === 'home' && !item.urls.length) {
    if (!item.resolving) {
      item.resolving = true;
      API.refreshItem(item).then(function (ok) {
        item.resolving = false;
        if (ok && item.urls.length && slide.isConnected) {
          onHomeResolved(slide, item);
          attachVideo(slide, item, idx);
        } else {
          slide.dataset.state = 'error';
        }
      }, function () {
        item.resolving = false;
        slide.dataset.state = 'error';
      });
    }
    return;
  }

  video.addEventListener('playing', function () {
    clearTimeout(slide._waitTimer);
    slide.dataset.state = 'ready';
    slide.dataset.paused = '0';
    if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.pause;
    if (slide._resumeAt) {
      try { video.currentTime = slide._resumeAt; } catch (e) { }
      slide._resumeAt = 0;
    }
    showControls(slide);
    dmOnPlaying(slide, item, video);
    // 观看 ~10s 后上报一次观看历史（官方页面 weblog 管道）
    setTimeout(function () {
      if (slide.isConnected && !video.paused) reportWatch(slide, item, video);
    }, 10000);
  });
  video.addEventListener('pause', function () {
    slide.dataset.paused = '1';
    if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.play;
  });
  video.addEventListener('waiting', function () {
    clearTimeout(slide._waitTimer);
    slide._waitTimer = setTimeout(function () { slide.dataset.state = 'loading'; }, 300);
  });
  video.addEventListener('loadedmetadata', function () {
    if (slide._ctlTime) {
      slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    }
  });
  video.addEventListener('timeupdate', function () {
    if (!video.isConnected) return; // 幽灵元素不得写活 slide 的控制条
    if (!video.duration) return;
    var trackEl = slide.querySelector('.acsv-track');
    var draggingNow = !!trackEl && trackEl.dataset.drag === '1';
    var pct = (video.currentTime / video.duration * 100) + '%';
    if (!draggingNow) {
      if (slide._ctlFill) slide._ctlFill.style.width = pct;
      if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
    }
    if (slide._ctlTime) {
      slide._ctlTime.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
    }
  });
  video.addEventListener('ended', function () {
    if (autoplayNext && idx === FeedStore.current) scrollToIndex(idx + 1);
  });
  video.addEventListener('error', function () {
    handlePlayError(slide, video, item, idx);
  });
  // 先入 DOM 再挂源：hls 异步回调里的换绑检测依赖 video 已在 slide 内
  slide.insertBefore(video, slide.querySelector('.acsv-side'));
  playCurrent(slide, video, item);
  video.load();
  // 卡帧看门狗：时间轴在走（音频正常）但视频帧不上屏 = 解码卡住。
  // 用 requestVideoFrameCallback 统计上屏帧数，帧数不动且时间推进即判定冻结。
  // 恢复阶梯从轻到重，把可见的画质损失压到最后：
  //   0.1s 顶针（无感重置解码）→ recoverMediaError（不换档不重拉）
  //   → 降帧率（1080P60→1080P，保分辨率，60fps 才是解码负载大头）
  //   → 降一档分辨率；用户手选过档位（_qManual）则只做无感恢复、不再自动降档。
  // 注意：后台 tab 不上屏（rVFC 停发）是正常现象，必须跳过，否则挂着播切走会被误降档。
  var stall = { lastT: -1, frames: -1, lastFrames: -1, lastFix: 0 };
  function frameTick() { stall.frames++; if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frameTick); }
  if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frameTick);
  // 后台→前台回切瞬间，interval 与 rVFC 的恢复顺序不确定：若计时器抢在第一帧上屏前执行，
  // 后台积压的时间差会被误判成一次冻结。visibilitychange 不受后台节流影响，回前台先重建
  // 基线（lastT=-1 强制看门狗空转一轮再武装），彻底关掉这个误伤窗口。
  var visHandler = function () {
    if (!document.hidden) { stall.lastT = -1; stall.lastFrames = stall.frames; }
  };
  document.addEventListener('visibilitychange', visHandler);
  var stallIv = setInterval(function () {
    if (!slide.isConnected || slide.querySelector('video') !== video) {
      clearInterval(stallIv);
      document.removeEventListener('visibilitychange', visHandler);
      return;
    }
    if (document.hidden || video.paused || video.seeking || video.readyState < 2) {
      stall.lastT = video.currentTime;
      stall.lastFrames = stall.frames;
      return;
    }
    var nowT = video.currentTime;
    var timeAdv = stall.lastT >= 0 && nowT - stall.lastT >= CFG.stall.adv;
    var framesStuck = !!video.requestVideoFrameCallback && stall.frames === stall.lastFrames;
    stall.lastT = nowT;
    stall.lastFrames = stall.frames;
    if (!timeAdv || !framesStuck) return;
    var now = Date.now();
    if (now - stall.lastFix < CFG.stall.fixGap) return;
    var fixCap = item.kind === 'home' ? CFG.stall.cap : CFG.stall.svCap;
    if (item._freezeTries >= fixCap) {
      if (!item._freezeGaveUp) {
        item._freezeGaveUp = true;
        toast('视频持续卡顿，已停止自动恢复');
      }
      return;
    }
    stall.lastFix = now;
    item._freezeTries = (item._freezeTries || 0) + 1;
    // 第 1 次：0.1s 前跳顶针，强制解码管线重出帧，肉眼无感
    if (item._freezeTries === 1) {
      try { video.currentTime = Math.min(video.duration || 1e9, nowT + CFG.stall.nudge); } catch (e) { }
      return;
    }
    // 第 2 次：recoverMediaError 重置解码管线，不丢缓冲、不重新拉流
    if (item._freezeTries === 2 && slide._hls && slide._hls.recoverMediaError) {
      try { slide._hls.recoverMediaError(); } catch (e) { }
      return;
    }
    var canAutoQ = !item._qManual && item.kind === 'home' && item.qualities
      && item.qualities.length > 1 && item.qIdx < item.qualities.length - 1;
    // 第 3 次：优先降帧率不降分辨率（1080P60 → 1080P），观感损失最小
    if (canAutoQ && /60$/.test(item.qualities[item.qIdx].label)) {
      var curLabel = item.qualities[item.qIdx].label;
      for (var q = item.qIdx + 1; q < item.qualities.length; q++) {
        if (item.qualities[q].label === curLabel.replace(/60$/, '')) {
          toast('播放卡顿，已切换到 ' + item.qualities[q].label + '（同分辨率降帧率）');
          switchQuality(item, slide, q);
          return;
        }
      }
    }
    // 第 4 次：降一档分辨率
    if (canAutoQ) {
      toast('播放卡顿，已自动切换到 ' + item.qualities[item.qIdx + 1].label);
      switchQuality(item, slide, item.qIdx + 1);
      return;
    }
    // 档位到底/用户锁档/无 hls：能 recover 就 recover，否则重挂当前源
    if (slide._hls && slide._hls.recoverMediaError) {
      try { slide._hls.recoverMediaError(); } catch (e) { }
      return;
    }
    slide._resumeAt = nowT;
    attachVideo(slide, item, idx);
  }, CFG.stall.iv);
  slide._stallIv = stallIv;
  slide._stallVis = visHandler;
  if (idx === FeedStore.current && !slide._userPaused) {
    playVideo(video);
    if (!soundOn && !firstGestureSeen) showSoundHint(slide);
  }
}

// 播放进度看门狗 + 观看历史上报：home 条目播放 10s 后走官方页面 weblog
// （CLICK/CLIENT_BROWSE_HISTORY，参数对齐官方 sendHistory），计入 A 站观看记录
var watchReported = {};
function reportWatch(slide, item, video) {
  if (!item || item.kind !== 'home' || !item.videoId) return;
  var key = item.id + ':' + item.videoId;
  if (watchReported[key]) return;
  try {
    var w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    var wl = w.weblog;
    if (!wl || !wl.impr || !wl.sendImmediately) return;
    wl.sendImmediately('CLICK', {
      action: 'CLIENT_BROWSE_HISTORY',
      params: {
        req_id: wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
        group_id: wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined,
        atom_id: String(item.videoId),
        ac_id: String(item.id),
        album_id: '0',
        resourceTypeCode: 2, // 官方 video 页配置固定值
        playedSeconds: Math.floor(video.currentTime || 0),
        videoId: Number(item.videoId) || 0,
        reportIdName: Number(item.id) || 0,
        resourceType: 'video',
        dougaId: Number(item.id) || 0
      }
    });
    watchReported[key] = true;
  } catch (e) { dbg('report-watch-err'); }
}

var soundHintEl = null, soundHintShown = false, soundHintDismissed = false;
function showSoundHint(slide) {
  hideSoundHint();
  if (soundHintShown || soundHintDismissed || soundOn || firstGestureSeen) return;
  soundHintShown = true;
  soundHintEl = el('div', 'acsv-hint');
  soundHintEl.appendChild(el('span', null, '🔇 当前处于静音'));
  var btn = el('button', 'acsv-hint-btn', '开启声音');
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    firstGestureSeen = true;
    var v = slide.querySelector('video');
    enableSound(v);
    if (v && soundOn) playVideo(v);
    hideSoundHint();
  });
  var x = el('button', 'acsv-hint-x', '✕');
  x.addEventListener('click', function (ev) {
    ev.stopPropagation();
    soundHintDismissed = true;
    hideSoundHint();
  });
  soundHintEl.appendChild(btn);
  soundHintEl.appendChild(x);
  soundHintEl.addEventListener('click', function (ev) { ev.stopPropagation(); });
  slide.appendChild(soundHintEl);
}

export function renderWindow() {
  if (!scroller) return;
  var cur = FeedStore.current;
  var lo = Math.max(0, cur - 1), hi = cur + 2;
  for (var i = lo; i <= hi && i < FeedStore.items.length; i++) {
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + i + '"]');
    if (!slide) {
      slide = buildSlide(FeedStore.items[i], i);
      scroller.appendChild(slide);
      if (io) io.observe(slide);
    }
    if ((i === cur || i === cur + 1) && !slide.querySelector('video')
      && slide.dataset.state !== 'error') {
      attachVideo(slide, FeedStore.items[i], i);
    }
  }
  // 只保留当前±1的视频元素，回收远处的（回滑时会重新挂载）
  var slides = scroller.querySelectorAll('.acsv-slide');
  Array.prototype.forEach.call(slides, function (s) {
    var idx = Number(s.dataset.idx);
    if (idx < cur - 1 || idx > cur + 1) {
      var v = s.querySelector('video');
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }
      if (idx < cur - 2 || idx > cur + 3) {
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
  updateArrows();
}

function setActive(idx) {
  syncHash(idx);
  FeedStore.current = idx;
  // 每次都补缓冲（空间页列表上下文的泵也在这里启动）
  FeedStore.ensureMore().then(renderWindow);
  updateArrows();
  if (isOpenComments()) {
    var itC = FeedStore.items[idx];
    if (itC && commentState.meowId !== itC.id) openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
  }
  if (!scroller) return;
  // 暂停非当前视频，停掉其弹幕图层（滚动回来 playing 会自动重启）
  var vs = scroller.querySelectorAll('video');
  Array.prototype.forEach.call(vs, function (v) {
    var s = v.closest('.acsv-slide');
    if (s && Number(s.dataset.idx) !== idx) {
      v.pause();
      if (s._dmLayer) s._dmLayer.stop();
    }
  });
  var cur = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"] video');
  if (cur) {
    cur.muted = !soundOn;
    playVideo(cur);
    if (!soundOn && !firstGestureSeen) {
      var slide = cur.closest('.acsv-slide');
      if (slide && !slide.querySelector('.acsv-hint')) showSoundHint(slide);
    }
  }
}

function scrollToIndex(idx) {
  if (!scroller) return;
  FeedStore.ensureMore().then(function () {
    renderWindow();
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
    if (slide) {
      scroller.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
      setActive(idx);
    }
  });
}

function mount() {
  dbg('mount-enter');
  if (root) return;
  ensureStyle();
  firstGestureSeen = false;
  soundHintShown = false;
  try { soundOn = localStorage.getItem(CFG.lsSound) === '1'; } catch (e) { soundOn = false; }

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
  var exitBtn = el('button', 'acsv-tbtn', '✕');
  exitBtn.title = '退出（Esc）';
  exitBtn.addEventListener('click', exitFeed);
  tr.appendChild(exitBtn);
  top.appendChild(tr);
  root.appendChild(top);

  setScroller(el('div', 'acsv-scroller'));
  root.appendChild(scroller);

  // 评论抽屉骨架
  var drawer = el('aside', 'acsv-drawer');
  var dhead = el('div', 'acsv-drawer-head');
  var dtitle = el('span', null, '评论');
  var dclose = el('button', 'acsv-drawer-close', '✕');
  dclose.title = '收起评论（Esc）';
  dclose.addEventListener('click', closeComments);
  dhead.appendChild(dtitle);
  dhead.appendChild(dclose);
  var dlist = el('div', 'acsv-drawer-list');
  drawer.appendChild(dhead);
  drawer.appendChild(dlist);
  root.appendChild(drawer);
  setCommentDrawer({ el: drawer, title: dtitle, list: dlist });

  root.appendChild(el('div', 'acsv-toast'));

  scroller.appendChild(el('div', 'acsv-spinner'));
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(root);
  dbg('root-appended');

  io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && en.intersectionRatio >= 0.6) {
        setActive(Number(en.target.dataset.idx));
      }
    });
  }, { root: scroller, threshold: [0, CFG.io.ratio, 0.9] });

  keyHandler = function (ev) {
    if (!isFeedRoute() || !root) return;
    if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
    var cur = FeedStore.current;
    switch (ev.key) {
      case 'ArrowDown': case 'PageDown': case 'j':
        ev.preventDefault(); scrollToIndex(cur + 1); break;
      case 'ArrowUp': case 'PageUp': case 'k':
        ev.preventDefault(); scrollToIndex(Math.max(0, cur - 1)); break;
      case 'ArrowLeft':
        ev.preventDefault();
        (function () {
          var v = currentVideo();
          if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - CFG.time.seekStep);
        })();
        break;
      case 'ArrowRight': {
        ev.preventDefault();
        if (ev.repeat || seekHold.active || seekHold.timer) break;
        // 短按快进 5 秒；按住 350ms 后进入 2 倍速快进，松手恢复
        seekHold.timer = setTimeout(function () {
          seekHold.timer = null;
          seekHold.active = true;
          seekHold.prevRate = playRate;
          var v = currentVideo();
          if (v) v.playbackRate = 2;
          toast('2× 快进中');
        }, CFG.time.hold);
        break;
      }
      case ' ':
        ev.preventDefault();
        (function () {
          var v = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
          if (!v) return;
          if (!firstGestureSeen && !soundOn) { firstGestureSeen = true; enableSound(v); hideSoundHint(); return; }
          firstGestureSeen = true;
          if (v.paused) playVideo(v);
          else { v.pause(); var ps = v.closest('.acsv-slide'); if (ps) ps._userPaused = true; sweepVideos(); }
        })();
        break;
      case 'm': case 'M': {
        var v2 = scroller && scroller.querySelector('.acsv-slide[data-idx="' + cur + '"] video');
        firstGestureSeen = true;
        toggleSound(v2);
        if (v2 && soundOn) playVideo(v2);
        hideSoundHint();
        break;
      }
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (root.requestFullscreen) root.requestFullscreen();
        break;
      case 'Escape':
        // 弹幕输入条开着：只关输入条，不退出竖刷页

        if (isOpenComments()) closeComments();
        else exitFeed();
        break;
      case 'c': case 'C': {
        var itC = FeedStore.items[cur];
        if (itC) {
          if (isOpenComments() && commentState.meowId === itC.id) closeComments();
          else openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
        }
        break;
      }
    }
  };
  keyUpHandler = function (ev) {
    if (ev.key !== 'ArrowRight' || !root) return;
    var v = currentVideo();
    if (seekHold.timer) {
      // 短按：快进 5 秒
      clearTimeout(seekHold.timer);
      seekHold.timer = null;
      if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + CFG.time.seekStep);
    } else if (seekHold.active) {
      // 长按结束：恢复原速
      seekHold.active = false;
      playRate = seekHold.prevRate;
      if (scroller) {
        var vs = scroller.querySelectorAll('video');
        Array.prototype.forEach.call(vs, function (x) { x.playbackRate = playRate; });
      }
      toast('恢复 ' + playRate.toFixed(1) + 'x');
    }
  };
  window.addEventListener('keydown', keyHandler);
  window.addEventListener('keyup', keyUpHandler);
  // 全屏切换时视口高度变化会让 mandatory snap 重新吸附到相邻 slide，
  // 在吸附发生前把 scrollTop 强制回正到当前条
  fsChangeHandler = function () {
    if (!scroller) return;
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    if (slide) scroller.scrollTop = slide.offsetTop;
  };
  document.addEventListener('fullscreenchange', fsChangeHandler);
  // 幽灵音频守护：每 2s 扫描一次，非当前 slide 的视频一律暂停
  ghostIv = setInterval(sweepVideos, 2000);
  // 回前台追帧（用户定调：后台继续出声可听，回来画面无卡顿跟上声音进度）：
  // hidden 时画面渲染停止但音频时钟照走，回前台画面往往停在旧帧上慢慢追。
  // 等 400ms 看它能否自己出帧：能则不干预；不能就 0.1s 顶针强制画面立即
  // 吸附到音频所在进度（音频本就没停，0.1s 无感，是"跳到位"不是"冻着追"）。
  visResumeHandler = function () {
    if (document.hidden || !scroller) return;
    var s = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    var v = s && s.querySelector('video');
    if (!v || v.paused || v.seeking) return;
    var snap = function () {
      if (!v.isConnected || v.paused || v.seeking) return;
      try { v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 0.1); } catch (e) { }
    };
    if (v.requestVideoFrameCallback) {
      var ok = false;
      v.requestVideoFrameCallback(function () { ok = true; });
      setTimeout(function () { if (!ok) snap(); }, 400);
    } else snap();
  };
  document.addEventListener('visibilitychange', visResumeHandler);

  var route = parseRoute();
  var routeMid = route.mid;
  resetHomePager(); // 推荐源重新拉首屏，不吃上次会话的游标
  if (!routeMid || getSource() === 'home') {
    // 普通入口（home 模式不支持 meow 深链置顶）：清空缓冲重新拉取
    routeMid = null;
    UpVideos.feedActive = false;
    FeedStore.reset();
  }
  (routeMid ? FeedStore.loadFirst(routeMid) : FeedStore.ensureMore()).then(function () {
    if (!FeedStore.items.length) {
      if (scroller) {
        var box = el('div', 'acsv-errbox');
        box.style.display = 'grid';
        box.appendChild(el('p', null, '小视频加载失败，请检查网络后重试'));
        var b = el('button', 'acsv-retry', '重试');
        b.addEventListener('click', function () {
          FeedStore.seen = {}; FeedStore.items = [];
          box.remove();
          var sp = el('div', 'acsv-spinner'); scroller.appendChild(sp);
          FeedStore.ensureMore().then(renderWindow);
        });
        box.appendChild(b);
        scroller.appendChild(box);
      }
      return;
    }
    var sp = scroller.querySelector('.acsv-spinner');
    if (sp) sp.remove();
    renderWindow();
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    if (slide) scroller.scrollTop = slide.offsetTop;
    setActive(FeedStore.current);
  });
}

function unmount() {
  if (!root) return;
  if (io) { io.disconnect(); io = null; }
  if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (keyUpHandler) { window.removeEventListener('keyup', keyUpHandler); keyUpHandler = null; }
  if (fsChangeHandler) { document.removeEventListener('fullscreenchange', fsChangeHandler); fsChangeHandler = null; }
  if (ghostIv) { clearInterval(ghostIv); ghostIv = null; }
  if (visResumeHandler) { document.removeEventListener('visibilitychange', visResumeHandler); visResumeHandler = null; }
  if (seekHold.timer) { clearTimeout(seekHold.timer); seekHold.timer = null; }
  seekHold.active = false;
  dmStopAll();

  Array.prototype.forEach.call(root.querySelectorAll('.acsv-slide'), destroyHls);
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
    var v = sl.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }
    destroyHls(sl);
  });
  scroller.innerHTML = '';
  scroller.scrollTop = 0;
  FeedStore.reset();
  FeedStore.ensureMore().then(function () {
    if (!scroller) return;
    renderWindow();
    var sl = scroller.querySelector('.acsv-slide[data-idx="0"]');
    if (sl) scroller.scrollTop = sl.offsetTop;
    if (FeedStore.items.length) setActive(0);
    else {
      var box = el('div', 'acsv-errbox');
      box.style.display = 'grid';
      box.appendChild(el('p', null, '内容加载失败，请检查网络后重试'));
      var b = el('button', 'acsv-retry', '重试');
      b.addEventListener('click', function () {
        box.remove();
        FeedStore.reset();
        FeedStore.ensureMore().then(renderWindow);
      });
      box.appendChild(b);
      scroller.appendChild(box);
    }
  });
}

function exitFeed() {
  unmount();
  if (isFeedRoute()) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

export function toggle() {
  dbg('toggle:' + (isFeedRoute() ? 'feed' : 'off'));
  if (isFeedRoute()) mount();
  else unmount();
  dbg('toggle-done');
}
window.addEventListener('hashchange', toggle);
