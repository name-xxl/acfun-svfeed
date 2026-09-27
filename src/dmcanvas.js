import { CFG } from './cfg.js';

// ---------- Canvas 弹幕渲染层 ----------
// 移植 AcFun-Danmaku-Sender 的本地弹幕画布思路（src/71-canvas-preview.js）：
// 无状态重绘——rAF 每帧读 video.currentTime 反推所有弹幕位置，
// 暂停/seek/倍速天然正确，零播放器事件监听。
// 经典弹幕映射成"单帧模型"：mode 1=滚动(轨道分配) / 4=底部 / 5=顶部（未知兜底滚动）。

function createLayer(slide, video) {
  var canvas = document.createElement('canvas');
  canvas.className = 'acsv-dmcanvas';
  var ctx = canvas.getContext('2d');
  slide.insertBefore(canvas, slide.querySelector('.acsv-side'));

  var items = [];            // {text, at(ms), mode, color, size, _px, _w, _dur, _lane}
  var raf = 0, running = false, lastAlign = 0;
  var cssW = 0, cssH = 0, dpr = 1;
  var laneH = 30, lastW = 0;
  // 有 requestVideoFrameCallback 时按视频帧率驱动：新帧上屏才重绘，暂停即停画（旧 rAF
  // 按显示器刷新率全量重绘，144Hz 屏放 30fps 视频时 ~4/5 的重绘是纯浪费，还和视频渲染抢主线程）
  var vfc = !!video.requestVideoFrameCallback;

  function align() {
    var vr = video.getBoundingClientRect();
    var sr = slide.getBoundingClientRect();
    // 评论区展开等场景会给 scroller 加缩放变换：rect 是缩放后的视觉尺寸，
    // 需除以缩放比换算回 slide 本地坐标，否则画布会相对视频错位
    var scale = sr.width && slide.offsetWidth ? sr.width / slide.offsetWidth : 1;
    var x = vr.left - sr.left, y = vr.top - sr.top;
    var w = vr.width, h = vr.height;
    // video 是 object-fit:contain：对齐实际画面区域（剔除黑边），弹幕随画面同步缩放
    var vw = video.videoWidth, vh = video.videoHeight;
    if (vw && vh && w > 8 && h > 8) {
      var s = Math.min(w / vw, h / vh);
      var pw = vw * s, ph = vh * s;
      x += (w - pw) / 2;
      y += (h - ph) / 2;
      w = pw;
      h = ph;
    }
    x /= scale; y /= scale; w /= scale; h /= scale;
    cssW = Math.round(w);
    cssH = Math.round(h);
    canvas.style.left = Math.round(x) + 'px';
    canvas.style.top = Math.round(y) + 'px';
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    dpr = window.devicePixelRatio || 1;
    var pw = Math.round(cssW * scale * dpr), ph = Math.round(cssH * scale * dpr);
    // 位图按视觉尺寸×dpr 建，保证缩放显示下依然清晰；只在实际变化时赋值（赋值会清空画布）
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  function fontPxOf(size) {
    return Math.max(12, Math.min(80, Math.round(size * cssH / 810)));
  }

  function measure(it) {
    it._px = fontPxOf(it.size);
    ctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    it._w = Math.max(8, ctx.measureText(it.text).width);
  }

  // 轨道分配：按出现时间排序，滚动轨要求上一条"尾部完全进入"才能复用，
  // 全满时塞进最早空出的轨；顶部/底部按停留时间占行。
  function assignLanes() {
    if (cssW < 10 || cssH < 10 || !items.length) return;
    var i, it;
    var maxPx = 0;
    for (i = 0; i < items.length; i++) {
      measure(items[i]);
      if (items[i]._px > maxPx) maxPx = items[i]._px;
      items[i]._dur = items[i].mode === 1
        ? (cssW + items[i]._w) / cssW * CFG.danmaku.scrollSec * 1000
        : CFG.danmaku.staySec * 1000;
    }
    laneH = Math.max(28, Math.round(maxPx * 1.4));
    var scrollLanes = Math.max(1, Math.floor(cssH * 0.72 / laneH));
    var sideLanes = Math.max(1, Math.floor(cssH * 0.6 / laneH));
    var busy = {};
    items.sort(function (a, b) { return a.at - b.at; });
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var mode = it.mode === 4 || it.mode === 5 ? it.mode : 1;
      it.mode = mode;
      var arr = busy[mode] || (busy[mode] = []);
      var limit = mode === 1 ? scrollLanes : sideLanes;
      var pick = -1, minAt = Infinity, minIdx = 0;
      for (var l = 0; l < limit; l++) {
        var freeAt = arr[l] || 0;
        if (freeAt <= it.at) { pick = l; break; }
        if (freeAt < minAt) { minAt = freeAt; minIdx = l; }
      }
      if (pick < 0) pick = minIdx;
      it._lane = pick;
      if (mode === 1) {
        var speed = (cssW + it._w) / it._dur; // px/ms
        arr[pick] = it.at + it._w / speed;
      } else {
        arr[pick] = it.at + it._dur;
      }
    }
    lastW = cssW;
  }

  function paint() {
    // 几何对齐限频：布局读取没必要每帧做（250ms 内的缩放/尺寸变化下一帧补齐，无感）
    var now = Date.now();
    if (now - lastAlign > 250) {
      lastAlign = now;
      align();
      if (Math.abs(cssW - lastW) > 60) assignLanes(); // 窗口尺寸变化重排轨道
    }
    ctx.clearRect(0, 0, cssW, cssH);
    if (items.length && cssW >= 10) {
      var t = video.currentTime * 1000;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (t < it.at || t > it.at + it._dur) continue;
        var p = (t - it.at) / it._dur;
        var x, y;
        if (it.mode === 5) {          // 顶部
          x = cssW / 2; y = laneH * (it._lane + 0.9);
        } else if (it.mode === 4) {   // 底部
          x = cssW / 2; y = cssH - laneH * (it._lane + 0.5);
        } else {                      // 滚动：右缘外 → 左缘外，匀速
          x = cssW + it._w / 2 - p * (cssW + it._w);
          y = laneH * (it._lane + 1);
        }
        if (x < -it._w / 2 || x > cssW + it._w / 2) continue;
        ctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, it._px / 12);
        ctx.strokeStyle = 'rgba(0,0,0,.82)';
        ctx.strokeText(it.text, x, y);
        ctx.fillStyle = it.color;
        ctx.fillText(it.text, x, y);
      }
    }
  }

  function schedule() {
    if (!running) return;
    if (vfc) raf = video.requestVideoFrameCallback(frame);
    else raf = requestAnimationFrame(frame);
  }

  function frame() {
    if (!running) return;
    paint();
    schedule();
  }

  return {
    setItems: function (list) {
      items = (list || []).filter(function (m) { return m && m.text; });
      if (running) {
        assignLanes();
        if (video.paused) paint(); // 暂停中 rVFC 不触发，主动画一帧让弹幕立即可见
      }
    },
    // 发送成功后的本地回显
    addLocal: function (it) {
      items.push(it);
      if (running) {
        assignLanes();
        if (video.paused) paint();
      }
    },
    start: function () {
      if (running) return;
      running = true;
      lastAlign = 0;
      frame(); // 直接画一帧：暂停态开启弹幕也能马上显示（rVFC 暂停时不触发）
    },
    stop: function () {
      running = false;
      if (raf) {
        if (vfc) { try { video.cancelVideoFrameCallback(raf); } catch (e) { } }
        else cancelAnimationFrame(raf);
        raf = 0;
      }
      try { ctx.clearRect(0, 0, cssW, cssH); } catch (e) { }
    },
    destroy: function () {
      this.stop();
      if (canvas.parentNode) canvas.remove();
    }
  };
}

// 当前窗口内所有存活图层（切 slide / 退出竖刷页时统一停）
var layers = [];

export var DmCanvas = {
  create: function (slide, video) {
    var layer = createLayer(slide, video);
    layers.push(layer);
    return layer;
  },
  stopAll: function () {
    layers.forEach(function (l) { try { l.stop(); } catch (e) { } });
    layers = [];
  }
};
