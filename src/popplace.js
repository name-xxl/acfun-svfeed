// ---------- 弹层定位（0.9.149 统一收口）：两套锚定模型 + 共用落位/守望 ----------
// 项目里两种弹层锚定此前各写一份实现（pickpop 的 pickPlaceOf / sharepanel 的 placePop），常数已漂
// （水平间距 12/10、视口边距 4/8、高度下限 140/120）——收口到本件：**两套模型、一份实现、一份常数**。
//   A) anchorPlaceOf —— 按钮旁选择层（pickpop → grouppop/favpop，0.9.142 起）：垂直下方优先 →
//      下方可用 < MIN_BELOW 且上方更宽裕则**翻上** → 高度按所选方向可用空间压高；水平**让开宿主
//      一列**（右缘 = min(宿主左缘, 锚点左缘) − GAP_H），左侧放不下翻到宿主右侧，再不行视口收边。
//   B) rowPlaceOf —— 行/面板贴靠（sharepanel 的 place 模式，0.9.105 用户裁决几何）：水平
//      right-of=右缘贴行左缘 / left-of=左缘贴面板右缘，越界先翻对侧再收边；**底对齐锚点底**
//      （弹层底=锚点底）；锚点之上可用空间不足时压缩自身高度（列表内部滚动，下限 ROW_MIN_H）。
// 共用：applyPlace（写 style：两模型都写 maxHeight/left/top）+ watchPlace（首帧 rAF 校准 +
// ResizeObserver 重算 + window resize；el 拆掉即自清理，无监听残留）。
// 纯函数只吃几何（rect/尺寸/视口），**不碰 DOM、零 import**——单测直采 test/unit/popplace.test.js；
// 坐标口径：函数入参的 a/host 是**视口坐标**，返回值 left/top 是**宿主内容坐标**（+滚动偏移），
// 故弹层随宿主滚动天然跟随。
export var GAP = 6;         // A：弹层与锚点的垂直间距
export var GAP_H = 10;      // A：让开宿主列的水平间距（= 分享面板 rail 实测口径：宿主左缘 − 10）
export var PAD = 8;         // A：视口内边距
export var MIN_BELOW = 240; // A：下方可用空间的"够用"阈值：低于它且上方更宽裕才翻上
export var A_MIN_H = 120;   // A：高度下限（空间极窄时尽力而为）
export var ROW_GAP = 12;    // B：贴行/面板的水平间距（place.gap 缺省）
export var ROW_PAD = 4;     // B：视口内边距
export var ROW_MIN_H = 140; // B：高度下限

// A) 按钮旁选择层：a=锚点 rect、host=宿主 rect+滚动、vp=视口、popW/popH=弹层当前尺寸
// → { up, left, top, maxH }（up=是否翻上；maxH=生效高度上限，调用方写进 style.maxHeight）
export function anchorPlaceOf(a, host, vp, popW, popH) {
  var below = vp.h - a.bottom - GAP - PAD;
  var above = a.top - GAP - PAD;
  var up = below < MIN_BELOW && above > below;
  var avail = up ? above : below;
  // 高度上限：所选方向可用空间 ∩ 既有视觉上限（420 / 64vh）；下限 A_MIN_H
  var maxH = Math.max(A_MIN_H, Math.min(avail, 420, vp.h * 0.64));
  var h = Math.min(Math.max(popH, 0), maxH);
  var top = up
    ? a.top - GAP - h - host.top + host.st   // 翻上：底边贴锚点上缘 - GAP
    : a.bottom + GAP - host.top + host.st;   // 向下：顶边贴锚点下缘 + GAP
  // 水平：右缘 = min(宿主左缘, 锚点左缘) − GAP_H；左侧放不下 → 翻宿主右侧
  var refLeft = Math.min(a.left, host.left);
  var want = refLeft - GAP_H - popW;
  if (want < PAD) want = Math.max(a.right, host.right) + GAP_H;
  var left = want - host.left + host.sl;
  var minL = PAD - host.left + host.sl;
  var maxL = vp.w - PAD - host.left + host.sl - popW;
  if (maxL < minL) maxL = minL;
  if (left > maxL || left < minL) left = Math.max(minL, Math.min(maxL, left));
  return { up: up, left: left, top: top, maxH: maxH };
}

// B) 行/面板贴靠：mode='left-of'（弹层在锚点左侧，右缘贴锚点左缘 − gap）/ 'right-of'（对侧）；
// 底对齐锚点底；高度上限 = 锚点之上可用空间（∩ 430 / 62vh，下限 ROW_MIN_H）
export function rowPlaceOf(a, host, vp, popW, popH, mode, gap) {
  var g = gap > 0 ? gap : ROW_GAP;
  var leftOf = mode !== 'right-of';
  var maxH = Math.max(ROW_MIN_H, Math.min(a.bottom - host.top + host.st - ROW_PAD, 430, vp.h * 0.62));
  function leftAt(isLeft) {
    return isLeft
      ? a.left - host.left + host.sl - popW - g
      : a.right - host.left + host.sl + g;
  }
  var minL = ROW_PAD - host.left + host.sl;
  var maxL = vp.w - ROW_PAD - host.left + host.sl - popW;
  if (maxL < minL) maxL = minL;
  var left = leftAt(leftOf);
  var flipped = false;
  if (left < minL || left > maxL) {
    // 空间不足：先翻到对侧（保持与锚点相邻、不遮卡片），对侧也放不下才收进视口
    var flip = leftAt(!leftOf);
    if (flip >= minL && flip <= maxL) { left = flip; flipped = true; }
    else left = Math.max(minL, Math.min(maxL, left));
  }
  var top = a.bottom - host.top + host.st - Math.min(popH, maxH); // 底对齐（弹层底=锚点底）
  if (top < ROW_PAD) top = ROW_PAD;
  return { left: left, top: top, maxH: maxH, flipped: flipped };
}

// 落位（两模型共用）：写 maxHeight/left/top。内容到达/尺寸变化后重复调用即可（幂等）
export function applyPlace(el, geo) {
  el.style.maxHeight = Math.round(geo.maxH) + 'px';
  el.style.left = Math.round(geo.left) + 'px';
  el.style.top = Math.round(geo.top) + 'px';
}

// 落位守望：立即 + 首帧 rAF（弹层宽高首帧才齐）各算一次；之后 ResizeObserver（内容异步到达）与
// window resize 兜底。el 从 DOM 拆掉后下一次回调自清理（观察器/监听一律注销，无残留）。
export function watchPlace(el, doPlace) {
  function again() { if (el.isConnected) doPlace(); }
  doPlace();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(again);
  if (typeof ResizeObserver === 'function') {
    // 引用必须保活：局部 observer 会被 GC → 停观察 → 内容异步填充后落位漂移（0.9.105 拍板）
    el._ro = new ResizeObserver(function () { requestAnimationFrame(again); });
    el._ro.observe(el);
  } else {
    setTimeout(again, 350); // 无 ResizeObserver 时的一次性延时兜底
  }
  function onWin() {
    if (!el.isConnected) {
      window.removeEventListener('resize', onWin);
      if (el._ro) el._ro.disconnect();
      return;
    }
    doPlace();
  }
  window.addEventListener('resize', onWin);
}
