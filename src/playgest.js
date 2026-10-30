// ---------- 层内滑动手势（0.9.171 建；0.9.184 自 playlayer.js 拆出——视图壳/会话/级别栈/手势
// 四缝之一，逐字搬运） ----------
// 用户实报「playlayer 窗口无法滑动切换视频」：滚轮/触摸板上下滑 = step(±1)。与竖刷的差异——
// 竖刷靠原生 scroll-snap 翻条，层内只有一条 slide：手势自己攒阈值（细碎滚动先累计到 60px
// 再推一步，避免一次滑动连推多条）+ 500ms 锁防抖。抽屉等浮层是 root 级兄弟节点，在其上滚动
// 不命中绑定在层体上的本监听（天然隔离）。
// step 由宿主注入（playlayer.playStep），返回布尔——true=确实翻了一条才吞滚轮（防橡皮筋）；
// 手势累计态（gest）随层单例：一次只开一层，绑定即重置。
// 阈值常数（0.9.305 卫生批4⑥合一；README 使用表口径「攒阈值 60px + 锁 500ms」）：滚轮累计
// 与触摸位移共用 STEP_PX，翻条锁共用 LOCK_MS——本件保持零依赖叶（口径：纯手势壳，不吃 CFG），
// 400ms 断段窗/800ms 划动时限同族登记，防再裸写
var STEP_PX = 60;   // 攒阈值：细碎滚动先累计到这个像素量才推一步（防一次滑动连推多条）
var LOCK_MS = 500;  // 翻条后防抖锁：锁内不再翻
var SEG_MS = 400;   // 滚轮断段窗：距上一事件超过它按新一段从头累计
var FLICK_MS = 800; // 触摸划动时限：慢拖超过它不算划动
var gest = { acc: 0, at: 0, lock: 0, y0: 0, t0: 0 };
function onWheel(step, ev) {
  var now = Date.now();
  if (now - gest.at > SEG_MS) gest.acc = 0; // 新一段滚动从头累计
  gest.at = now;
  gest.acc += ev.deltaY;
  if (Math.abs(gest.acc) < STEP_PX || now - gest.lock < LOCK_MS) return;
  var dir = gest.acc > 0 ? 1 : -1;
  gest.acc = 0;
  if (step(dir)) {
    gest.lock = now;
    if (ev.cancelable) ev.preventDefault(); // 层内无滚动语义：吞掉防橡皮筋
  }
}
function onTouchStart(ev) {
  var t = ev.touches && ev.touches[0];
  gest.y0 = t ? t.clientY : 0;
  gest.t0 = Date.now();
}
function onTouchEnd(step, ev) {
  var t = ev.changedTouches && ev.changedTouches[0];
  if (!t || !gest.y0) return;
  var dy = gest.y0 - t.clientY; // 上滑（dy>0）=下一条
  gest.y0 = 0;
  if (Math.abs(dy) < STEP_PX || Date.now() - gest.t0 > FLICK_MS) return;
  step(dy > 0 ? 1 : -1);
}

// 绑定层体滑动手势（先重置累计）；返回解绑函数——teardown 调用，随层拆（0.9.171 纪律）。
export function bindLayerGestures(body, step) {
  gest.acc = 0; gest.at = 0; gest.lock = 0; gest.y0 = 0; gest.t0 = 0;
  var wheel = function (ev) { onWheel(step, ev); };
  var touchStart = function (ev) { onTouchStart(ev); };
  var touchEnd = function (ev) { onTouchEnd(step, ev); };
  body.addEventListener('wheel', wheel, { passive: false });
  body.addEventListener('touchstart', touchStart, { passive: true });
  body.addEventListener('touchend', touchEnd, { passive: true });
  return function unbind() {
    body.removeEventListener('wheel', wheel);
    body.removeEventListener('touchstart', touchStart);
    body.removeEventListener('touchend', touchEnd);
  };
}
