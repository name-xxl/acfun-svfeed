import { CFG } from './cfg.js';
import { getSetting } from './settings.js';
import { stat, set, testHook } from './dbg.js';

// ---------- Canvas 弹幕渲染层 ----------
// 移植 AcFun-Danmaku-Sender 的本地弹幕画布思路（src/71-canvas-preview.js）：
// 无状态重绘——rVFC 每帧读 video.currentTime 反推所有弹幕位置，
// 暂停/seek/倍速天然正确，零播放器事件监听。
// 经典弹幕映射成"单帧模型"：mode 1=滚动 / 6=逆向滚动（同为滚动族，绘制方向相反）/ 4=底部 /
// 5=顶部（其余未知 mode 兜底滚动）。**注意**：高级弹幕（`danmakuType===1` 的
// `advancedDanmakuExtData`：定位/缩放/旋转/时序）本画布**尚未支持**——高弹三核
// easeProgress/interpolateModel/drawModel 未随骨架一并移植（见 0.9.194 计划批次）。
// 0.9.4 绘制内层优化（架构不变）：
//   1) 文本位图缓存：每条弹幕首次绘制渲染一次离屏位图（含描边），之后每帧 drawImage，
//      免去逐帧 strokeText+fillText 的字形光栅化；过期释放 + FIFO 上限 300 条兜底；
//   2) 时间窗扫描：items 按 at 升序（不变量），过期前缀 head 指针 + at>t 提前收工，
//      每帧只扫活动窗口，不再全量遍历；
//   3) 量宽缓存：文本+字号没变就不重复 measureText（发本地弹幕触发的全量重排不再卡顿）。

// 调试构建的绘制埋点：每 60 帧结算平均 paint 耗时/可见条数
// （正式构建 __ACSV_DEBUG__ 为 false，分支为空转，与 session.js 的模拟缝同一模式）
var dmFc = 0, dmMs = 0, dmVisSum = 0;

// mode 归一（0.9.194 抽出为顶层纯函数，供单测直采）：4=底部 / 5=顶部 / 6=逆向滚动 保留，
// 其余兜底滚动 1。真机取样实证 mode 6 存在（此前被错画成普通滚动）；高级弹幕
// （danmakuType=1 的编码如 7）不在本映射内——画布尚未支持（见头注）。
export function normMode(m) {
  return (m === 4 || m === 5 || m === 6) ? m : 1;
}

// 弹幕设置缓存（0.9.201）：**只在轨道重排时读一次**（不得进逐帧绘制路径，否则掉帧）。
// 值来自 settings 的「弹幕」分组（照原生 tab 条目，§10.12）。
var curAlpha = 1, curSizeScale = 1, curSpeed = 1, curArea = 0.72, curSubtitle = false, curMerge = true;
var curBlock = {}, curFilter = [];
function readSettings() {
  var a = Number(getSetting('dmAlpha'));
  curAlpha = (a > 0 && a <= 100) ? a / 100 : 1;
  var sz = Number(getSetting('dmSize'));
  curSizeScale = sz > 0 ? sz : 1;
  var sp = Number(getSetting('dmSpeed'));
  curSpeed = sp > 0 ? sp : 1;
  var ar = Number(getSetting('dmArea')) / 100; // 面板存百分比（30~100），内部用 0~1 占比
  curArea = (ar > 0 && ar <= 1) ? ar : 0.72;
  curSubtitle = !!getSetting('dmSubtitle');
  curMerge = !!getSetting('dmMerge');
  // 屏蔽设置（0.9.202）：按类型（top/bottom/scroll/color）+ 关键词列表（逗号/换行分隔）
  var blk = String(getSetting('dmBlock') || '');
  curBlock = { top: /\btop\b/.test(blk), bottom: /\bbottom\b/.test(blk), scroll: /\bscroll\b/.test(blk), color: /\bcolor\b/.test(blk) };
  curFilter = String(getSetting('dmFilter') || '').split(/[\n,]/)
    .map(function (x) { return x.trim(); }).filter(Boolean);
}

// 按类型/关键词屏蔽（0.9.202，纯函数单测直采）。**注**：角色弹幕/高级弹幕两类尚无字段可判
//（danmakuStyle/danmakuType 未接，见批次 10），故这里只覆盖有据可依的四类。
export function filterDanmaku(list, block, keywords) {
  return (list || []).filter(function (it) {
    if (!it) return false;
    if (block) {
      if (block.top && it.mode === 5) return false;
      if (block.bottom && it.mode === 4) return false;
      if (block.scroll && (it.mode === 1 || it.mode === 6)) return false;
      if (block.color && it.color && String(it.color).toLowerCase() !== '#ffffff') return false;
    }
    if (keywords && keywords.length) {
      for (var i = 0; i < keywords.length; i++) if (String(it.text || '').indexOf(keywords[i]) >= 0) return false;
    }
    return true;
  });
}

// 合并重复弹幕（0.9.201，纯函数单测直采）：按 at 升序，同文本在 winMs 窗口内只留第一条。
// 前提：入参已按 at 升序（assignLanes 里就排好序，这里保持顺序稳定）
export function mergeDanmaku(list, winMs) {
  var win = Number(winMs) > 0 ? Number(winMs) : 1500;
  var lastByText = {};
  var out = [];
  for (var i = 0; i < (list || []).length; i++) {
    var it = list[i];
    if (!it) continue;
    var k = String(it.text || '');
    var prev = lastByText[k];
    if (prev != null && it.at - prev < win) continue; // 窗口内重复：丢
    lastByText[k] = it.at;
    out.push(it);
  }
  return out;
}

function createLayer(slide, video) {
  var canvas = document.createElement('canvas');
  canvas.className = 'acsv-dmcanvas';
  var ctx = canvas.getContext('2d');
  slide.insertBefore(canvas, slide.querySelector('.acsv-side'));

  var items = [];  // {text, at(ms), mode, color, size, _px, _w, _dur, _lane,
                   //  _mk(量宽键), _bmp/_bk/_lw/_lh(位图缓存)}，按 at 升序
  var raf = 0, running = false, lastAlign = 0;
  var cssW = 0, cssH = 0, dpr = 1;
  var lastRaw = [];  // 最近一次 setItems 的原始入参：设置变更后 refresh() 重排用（0.9.202）
  var laneH = 30, lastW = 0;
  var head = 0, lastT = -1;  // 活动窗口：head=首个未过期项下标
  var devK = 1;              // 视觉缩放×dpr：位图按此分辨率渲染，上屏 1:1 不重采样
  var sprQueue = [], sprN = 0; // 位图 FIFO（防 seek 回扫风暴撑爆内存）与存活计数
  // 有 requestVideoFrameCallback 时按视频帧率驱动：新帧上屏才重绘，暂停即停画（旧 rAF
  // 按显示器刷新率全量重绘，144Hz 屏放 30fps 视频时 ~4/5 的重绘是纯浪费，还和视频渲染抢主线程）
  var vfc = !!video.requestVideoFrameCallback;

  function align() {
    var vr = video.getBoundingClientRect();
    var sr = slide.getBoundingClientRect();
    // rect 是视觉尺寸；slide 本身不再被施加变换（评论抽屉避让只变换画面元素），
    // scale 恒为 1——保留检测只为兜底未来可能的外层变换，画布贴视频视觉矩形即可
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
    devK = scale * dpr;
    var pw = Math.round(cssW * scale * dpr), ph = Math.round(cssH * scale * dpr);
    // 位图按视觉尺寸×dpr 建，保证缩放显示下依然清晰；只在实际变化时赋值（赋值会清空画布）
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  function fontPxOf(size) {
    return Math.max(12, Math.min(80, Math.round(size * curSizeScale * cssH / 810))); // 字号倍率随设置（0.9.201）
  }

  function measure(it) {
    var px = fontPxOf(it.size);
    var key = px + '|' + it.text;
    if (it._mk === key) return; // 量宽缓存：文本/字号没变不重复 measureText
    it._px = px;
    ctx.font = px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    it._w = Math.max(8, ctx.measureText(it.text).width);
    it._mk = key;
  }

  // 文本位图：首次绘制（或文本/字号/缩放变化）时渲染一次，之后每帧 drawImage。
  // 位图按设备像素（视觉缩放×dpr）建，主画布同变换绘制，1:1 上屏不重采样
  function spriteOf(it) {
    var bk = it._px + '|' + it.text + '|' + devK;
    if (it._bmp && it._bk === bk) return;
    var pad = Math.max(2, Math.ceil(it._px / 24) + 2); // 描边半径+抗锯齿余量
    var lw = Math.ceil(it._w) + pad * 2;
    var lh = Math.ceil(it._px * 1.4) + pad * 2;
    var bmp = document.createElement('canvas');
    bmp.width = Math.max(1, Math.round(lw * devK));
    bmp.height = Math.max(1, Math.round(lh * devK));
    var bctx = bmp.getContext('2d');
    bctx.setTransform(devK, 0, 0, devK, 0, 0);
    bctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.lineJoin = 'round';
    bctx.lineWidth = Math.max(1, it._px / 12);
    bctx.strokeStyle = 'rgba(0,0,0,.82)';
    bctx.strokeText(it.text, lw / 2, lh / 2);
    bctx.fillStyle = it.color;
    bctx.fillText(it.text, lw / 2, lh / 2);
    it._bmp = bmp; it._bk = bk; it._lw = lw; it._lh = lh;
    sprQueue.push(it);
    sprN++;
    if (sprQueue.length > 300) {
      var old = sprQueue.shift();
      if (old._bmp) { old._bmp = null; sprN--; }
    }
  }

  // 轨道分配：按出现时间排序，滚动轨要求上一条"尾部完全进入"才能复用，
  // 全满时塞进最早空出的轨；顶部/底部按停留时间占行。
  // mode 归一在顶层 normMode()（0.9.194）。
  function assignLanes() {
    readSettings(); // 设置只在轨道重排时读一次（0.9.201；不进逐帧路径）
    if (cssW < 10 || cssH < 10 || !items.length) return;
    var i, it;
    var maxPx = 0;
    for (i = 0; i < items.length; i++) {
      measure(items[i]);
      if (items[i]._px > maxPx) maxPx = items[i]._px;
      items[i]._dur = (items[i].mode === 1 || items[i].mode === 6)
        ? (cssW + items[i]._w) / cssW * CFG.danmaku.scrollSec * curSpeed * 1000
        : CFG.danmaku.staySec * 1000;
    }
    laneH = Math.max(28, Math.round(maxPx * 1.4));
    // 显示区域（0.9.201）：滚动轨占 curArea；**防挡字幕**再让出底部一条字幕带（约 18% 屏高）
    var scrollArea = curSubtitle ? Math.max(0.1, curArea - 0.18) : curArea;
    var scrollLanes = Math.max(1, Math.floor(cssH * scrollArea / laneH));
    var sideLanes = Math.max(1, Math.floor(cssH * Math.min(curArea, 0.6) / laneH));
    var busy = {};
    items.sort(function (a, b) { return a.at - b.at; });
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var mode = normMode(it.mode);
      it.mode = mode;
      var arr = busy[mode] || (busy[mode] = []);
      var limit = (mode === 1 || mode === 6) ? scrollLanes : sideLanes;
      var pick = -1, minAt = Infinity, minIdx = 0;
      for (var l = 0; l < limit; l++) {
        var freeAt = arr[l] || 0;
        if (freeAt <= it.at) { pick = l; break; }
        if (freeAt < minAt) { minAt = freeAt; minIdx = l; }
      }
      if (pick < 0) pick = minIdx;
      it._lane = pick;
      if (mode === 1 || mode === 6) {
        var speed = (cssW + it._w) / it._dur; // px/ms
        arr[pick] = it.at + it._w / speed;
      } else {
        arr[pick] = it.at + it._dur;
      }
    }
    lastW = cssW;
  }

  function paint() {
    var t0 = 0, vis = 0;
    if (__ACSV_DEBUG__) t0 = performance.now();
    // 几何对齐限频：布局读取没必要每帧做（250ms 内的缩放/尺寸变化下一帧补齐，无感）
    var now = Date.now();
    if (now - lastAlign > 250) {
      lastAlign = now;
      align();
      if (Math.abs(cssW - lastW) > 60) assignLanes(); // 窗口尺寸变化重排轨道
    }
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalAlpha = curAlpha; // 不透明度（0.9.201；读缓存值，不逐帧读设置）
    if (items.length && cssW >= 10) {
      var t = video.currentTime * 1000;
      // 向后 seek 会让过期前缀判定失效：指针归零，本帧多扫一点，之后恢复窗口扫描
      if (t < lastT) head = 0;
      lastT = t;
      // 前推 head 跳过过期前缀，顺带释放位图；_dur 未量出（NaN）时不动，等重排后自愈
      while (head < items.length && items[head]._dur > 0 && t > items[head].at + items[head]._dur) {
        var gone = items[head];
        if (gone._bmp) { gone._bmp = null; sprN--; }
        head++;
      }
      for (var i = head; i < items.length; i++) {
        var it = items[i];
        if (it.at > t) break;               // 升序不变量：后面只会更晚出现，收工
        if (t > it.at + it._dur) continue;  // 窗口中段可能有先过期项（顶/底停留短）
        var p = (t - it.at) / it._dur;
        var x, y;
        if (it.mode === 5) {          // 顶部
          x = cssW / 2; y = laneH * (it._lane + 0.9);
        } else if (it.mode === 4) {   // 底部
          x = cssW / 2; y = cssH - laneH * (it._lane + 0.5);
        } else if (it.mode === 6) {   // 逆向滚动：左缘外 → 右缘外（0.9.194）
          x = -it._w / 2 + p * (cssW + it._w);
          y = laneH * (it._lane + 1);
        } else {                      // 滚动：右缘外 → 左缘外，匀速
          x = cssW + it._w / 2 - p * (cssW + it._w);
          y = laneH * (it._lane + 1);
        }
        if (x < -it._w / 2 || x > cssW + it._w / 2) continue;
        spriteOf(it);
        ctx.drawImage(it._bmp, x - it._lw / 2, y - it._lh / 2, it._lw, it._lh);
        vis++;
      }
    }
    ctx.globalAlpha = 1; // 复位（位图缓存/后续绘制不受影响）
    if (__ACSV_DEBUG__) {
      stat('dm.frame');
      dmMs += performance.now() - t0;
      dmVisSum += vis;
      if (++dmFc >= 60) {
        set('dm.paintMs', +(dmMs / dmFc).toFixed(2));
        set('dm.visible', Math.round(dmVisSum / dmFc));
        set('dm.sprites', sprN);
        dmFc = 0; dmMs = 0; dmVisSum = 0;
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
    // rAF 兜底路径按显示器刷新率驱动：暂停时不重绘（rVFC 路径暂停自然不出帧），
    // 恢复播放后下一帧自动恢复
    if (!vfc && video.paused) { schedule(); return; }
    paint();
    schedule();
  }

  var api = {
    setItems: function (list) {
      readSettings(); // 每次换条/改设置都重读一次（不进每帧绘制路径）
      lastRaw = list || [];
      items = (list || []).filter(function (m) { return m && m.text; });
      if (curMerge && items.length > 1) { // 合并重复弹幕（0.9.201）：先按 at 升序再同文本去重
        items.sort(function (a, b) { return a.at - b.at; });
        items = mergeDanmaku(items);
      }
      items = filterDanmaku(items, curBlock, curFilter); // 屏蔽设置（0.9.202）
      head = 0; lastT = -1;      // 新数组：窗口指针作废
      sprQueue = []; sprN = 0;   // 旧条目连同位图一起交给 GC
      if (running) {
        assignLanes();
        if (video.paused) paint(); // 暂停中 rVFC 不触发，主动画一帧让弹幕立即可见
      }
    },
    // 发送成功后的本地回显：按 at 有序插入（时间窗扫描依赖升序不变量，通常就落在队尾）
    addLocal: function (it) {      var j = items.length;
      while (j > 0 && items[j - 1].at > it.at) j--;
      items.splice(j, 0, it);
      if (running) {
        assignLanes();
        if (video.paused) paint();
      }
    },
    start: function () {
      if (running) return;
      running = true;
      lastAlign = 0;
      lastW = 0; // 强制重排：stop 期间 addLocal 攒下的条目可能没量过宽（否则首帧 NaN 坐标静默丢失）
      paint();   // 直接画一帧：暂停态开启弹幕也能马上显示（rVFC 暂停时不触发）
      schedule();
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
      // 从图层表摘除自己：否则每次重挂（切清晰度）都泄漏一个闭包，
      // 持有 canvas/ctx/video/items 直到整页退出才释放
      var at = layers.indexOf(this);
      if (at >= 0) layers.splice(at, 1);
    }
  };
  // 设置变更后即时重排（0.9.202）：用最近一次入参重跑（重读设置 → 合并/屏蔽/轨道/字号全刷新）。
  // 「弹幕设置」面板改任何一项都调它；挂在对象上而非字面量里（字面量内引用不到同级属性）
  api.refresh = function () { api.setItems(lastRaw); };
  return api;
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

// harness 模拟缝：绕过弹幕接口直接驱动图层做绘制冒烟（正式构建 testHook 为 noop）
testHook('dmcanvas', function () { return DmCanvas; });
