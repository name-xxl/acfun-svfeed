// ---------- 高级弹幕（advancedDanmaku）模型层：解析 / 缓动 / 插值 / 绘制 ----------
// 来源：用户的高弹项目（danmaku-sender）`src/71-canvas-preview.js` 的 easeProgress / interpolateModel /
// drawModel 三核 + `src/10-constants.js` 的锚点口径，**逐条移植成纯函数**（无 DOM、无状态、无网络），
// 供 dmcanvas 逐帧调用与单测直采。
//
// 数据来源（真机实证，docs/api-research.md §10.13）：
//   高级弹幕**不在**我们生产在用的 `new-danmaku/list` 链路里（该链路 100 条 danmakuType 全 0，
//   即便带 `enableAdvanced=true`）——只能走 `pollByPosition` 分段窗口另拉（appapi.danmakuAdvanced）。
//   条目的 `advancedDanmakuExtData` 是 **JSON 字符串**，399 条真机样本 parse 成功率 100%。
//
// 坐标口径（别按直觉改）：pos.x / pos.y 是 **0–100 的屏幕百分比**，scale 是倍数（1=100%），
// rotate 是角度。锚点九宫格与原生一致（0 左上 … 4 中中 … 8 右下）。

/** @typedef {Object} AdvFrame 单段关键帧状态（pos 为 0–100 百分比） */
/** @typedef {Object} AdvModel 高级弹幕模型 */

// 锚点枚举（与 A 站原生九宫格一致）：0 左上 1 中上 2 右上 3 左中 4 中中 5 右中 6 左下 7 中下 8 右下
export var DEFAULT_ANCHOR = 4;
// 模型缺省值（真机样本全带字段，这里只为残包兜底，不作"编造"用）
var DEF_DUR = 5000, DEF_SIZE = 25, DEF_COLOR = '#ffffff', DEF_FONT = 'SimHei';

function num(v, def) {
  var n = Number(v);
  return isFinite(n) ? n : def;
}

// timingFunction 白名单（0.9.204）：只认 CSS 合法关键字与 cubic-bezier(a,b,c,d) 形式，
// 其余一律回落 linear——真机样本 677 帧全 linear，但脏值不能让弹幕冻结在 (0,0)（高弹项目踩过）。
export function normTiming(fn) {
  var s = String(fn == null ? '' : fn).trim();
  if (!s) return 'linear';
  if (s === 'linear' || s === 'ease' || s === 'ease-in' || s === 'ease-out' || s === 'ease-in-out') return s;
  if (/^cubic-bezier\(\s*[\d.+-]+\s*,\s*[\d.+-]+\s*,\s*[\d.+-]+\s*,\s*[\d.+-]+\s*\)$/.test(s)) return s;
  return 'linear';
}

function cubicBezierXY(t, p1, p2) {
  var mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}
function cubicBezierDX(t, p1, p2) {
  var mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

// 缓动进度：归一化时间 t∈[0,1] → 进度。支持 CSS 关键字与 cubic-bezier(x1,y1,x2,y2)。
// 贝塞尔用牛顿迭代解 x(u)=t，平缓区（导数为 0）牛顿会发散 → 出界即改二分（单调性保证收敛）。
export function easeProgress(t, fn) {
  var name = normTiming(fn);
  if (name.indexOf('cubic-bezier') === 0) {
    var m = /^cubic-bezier\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*\)$/.exec(name);
    if (!m) return t;
    var x1 = parseFloat(m[1]), y1 = parseFloat(m[2]), x2 = parseFloat(m[3]), y2 = parseFloat(m[4]);
    var u = t, ok = false, i, dx, d, un;
    for (i = 0; i < 8; i++) {
      dx = cubicBezierXY(u, x1, x2) - t;
      if (Math.abs(dx) < 1e-6) { ok = true; break; }
      d = cubicBezierDX(u, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      un = u - dx / d;
      if (un < 0 || un > 1) break;
      u = un;
    }
    if (!ok) {
      var lo = 0, hi = 1;
      for (i = 0; i < 32; i++) {
        u = (lo + hi) / 2;
        if (cubicBezierXY(u, x1, x2) < t) lo = u; else hi = u;
      }
    }
    return cubicBezierXY(u, y1, y2);
  }
  switch (name) {
    case 'ease-in': return t * t;
    case 'ease-out': return t * (2 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t; // linear（含未知值回落）
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function pos3(o) { return { x: num(o && o.x, 0), y: num(o && o.y, 0), z: num(o && o.z, 0) }; }
// scale 缺省/0 视为 1（0 倍的弹幕等于看不见，真机样本无 0；残包按 1 兜底比按 0 更合理）
function scale3(o) { var p = pos3(o); return { x: p.x === 0 ? 1 : p.x, y: p.y === 0 ? 1 : p.y, z: p.z === 0 ? 1 : p.z }; }
function rot3(o) { return pos3(o); }

// 把原始 entry 归一成模型（残包兜底，不编造语义）：帧缺 from 时以 to 为起点（原地不动比飞出去温和）
function normFrame(f) {
  if (!f) return null;
  // 残帧（只给 from 或只给 to）：另一端沿用同一侧——原地不动，比"飞到 (0,0)"温和
  var from = f.from || f.to || {}, to = f.to || f.from || {};
  return {
    from: { pos: pos3(from.pos), scale: scale3(from.scale), rotate: rot3(from.rotate) },
    to: { pos: pos3(to.pos), scale: scale3(to.scale), rotate: rot3(to.rotate) },
    timingFunction: normTiming(f.timingFunction),
    staticTime: Math.max(0, num(f.staticTime, 0)),
    moveTime: Math.max(0, num(f.moveTime, 0))
  };
}

// 解析 `advancedDanmakuExtData`（JSON 字符串）→ AdvModel；坏 JSON / 非对象 / 无内容一律 null。
// **无帧的模型也返回**（静止弹幕：按 anchor+scale 定位于 scale/pos 缺省处），由渲染层决定画不画。
export function parseAdvanced(ext) {
  var o = ext;
  if (typeof ext === 'string') {
    try { o = JSON.parse(ext); } catch (e) { return null; }
  }
  if (!o || typeof o !== 'object') return null;
  var content = o.content == null ? '' : String(o.content);
  if (!content) return null;
  var ws = o.wordStyle || {};
  var frames = [];
  (o.animationFrames || []).forEach(function (f) {
    var nf = normFrame(f);
    if (nf) frames.push(nf);
  });
  return {
    id: String(o.id || ''),
    content: content,
    // contentType：真机 399 条全 0（文本）。1=Base64 图片弹幕——两画布都未实现，标出不画（不静默画错）
    contentType: num(o.contentType, 0),
    anchor: Math.max(0, Math.min(8, Math.round(num(o.anchor, DEFAULT_ANCHOR)))),
    zIndex: num(o.zIndex, 50),
    duration: Math.max(200, num(o.durationTime, DEF_DUR)),
    wordStyle: {
      font: String(ws.font || DEF_FONT),
      size: Math.max(8, num(ws.size, DEF_SIZE)),
      bold: !!ws.bold,
      stroke: ws.stroke !== false,
      color: String(ws.color || DEF_COLOR),
      shadow: ws.shadow || null
    },
    scale: scale3(o.scale),
    rotate: rot3(o.rotate),
    frames: frames,
    startTimeNow: !!o.startTimeNow
  };
}

// 把模型在 elapsedMs（相对该弹幕起始）处的绘制状态算出来：多段帧按 moveTime 累加定位当前段，
// 段内按 timingFunction 插值。返回帧状态；**超出所有段长 / 无帧**返回 null（不画）。
export function interpolateModel(model, elapsedMs) {
  if (!model || elapsedMs < 0) return null;
  var frames = model.frames || [];
  if (!frames.length) return null;
  var acc = 0;
  for (var i = 0; i < frames.length; i++) {
    var f = frames[i];
    var mt = f.moveTime || 0;
    if (elapsedMs < acc + mt || mt <= 0) {
      var p = mt > 0 ? Math.max(0, Math.min(1, (elapsedMs - acc) / mt)) : 1;
      var e = easeProgress(p, f.timingFunction);
      return {
        x: lerp(f.from.pos.x, f.to.pos.x, e),
        y: lerp(f.from.pos.y, f.to.pos.y, e),
        scaleX: lerp(f.from.scale.x, f.to.scale.x, e),
        scaleY: lerp(f.from.scale.y, f.to.scale.y, e),
        rotateX: lerp(f.from.rotate.x, f.to.rotate.x, e),
        rotateY: lerp(f.from.rotate.y, f.to.rotate.y, e),
        rotateZ: lerp(f.from.rotate.z, f.to.rotate.z, e)
      };
    }
    acc += mt;
  }
  return null;
}

// 绘制：pos 百分比 → 画布像素；锚点九宫格交给 canvas 原生 textAlign/textBaseline；
// 多行（字符画靠换行）按行高 = 字号逐行描边+填充（与原生 line-height 一致）。
// sizeScale：外层「字体大小」设置的字号倍率（1=原样；不缩放坐标，只缩放字号与描边）
export function drawModel(ctx, model, frame, cw, ch, sizeScale) {
  var ws = model.wordStyle || {};
  var k = num(sizeScale, 1) || 1;
  var size = (ws.size || DEF_SIZE) * k;
  var lines = String(model.content || '').split('\n');
  var lineHeight = size;
  var blockH = lines.length * lineHeight;
  var x = frame.x / 100 * cw;
  var y = frame.y / 100 * ch;
  var anchor = model.anchor == null ? DEFAULT_ANCHOR : model.anchor;
  var col = anchor % 3, row = Math.floor(anchor / 3);
  ctx.save();
  ctx.font = (ws.bold ? 'bold ' : '') + size + 'px ' + ws.font;
  ctx.translate(x, y);
  ctx.scale(frame.scaleX, frame.scaleY);
  if (frame.rotateZ) ctx.rotate(frame.rotateZ * Math.PI / 180);
  ctx.textAlign = col === 0 ? 'left' : col === 1 ? 'center' : 'right';
  ctx.textBaseline = 'middle';
  var yStart = row === 0 ? 0 : row === 1 ? -blockH / 2 : -blockH;
  var i;
  if (ws.stroke !== false) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, size / 12);
    ctx.strokeStyle = '#000000';
    for (i = 0; i < lines.length; i++) ctx.strokeText(lines[i], 0, yStart + (i + 0.5) * lineHeight);
  }
  if (ws.shadow) {
    ctx.shadowColor = ws.shadow.color || '#000000';
    ctx.shadowBlur = num(ws.shadow.blur, 0);
    ctx.shadowOffsetX = num(ws.shadow.x, 0);
    ctx.shadowOffsetY = num(ws.shadow.y, 0);
  }
  ctx.fillStyle = ws.color || DEF_COLOR;
  for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], 0, yStart + (i + 0.5) * lineHeight);
  ctx.restore();
}
