// ---------- 浮层栈（0.9.61：Esc 显式分支链收拢为显式状态栈） ----------
// 0.9.22「不赌监听器注册顺序」的延续：栈内容就是状态，input.js 读栈顶裁决 Esc，
// 新增浮层零改 input.js；z 档位仍由各浮层样式显式声明（45/50/60/65 注释体系），
// 管理器不做隐式推导。
// modal 层（更新弹窗/大图查看器）吞全部真实按键——历史上靠各浮层自带 capture 监听实现，
// 0.9.61 起收口为本模块的单个 capture 监听：双裁决点会在合成事件路径上连关两层
//（capture 关掉本层后 input.js 又拿到下一层继续关），单点后无此问题。合成事件
//（harness，target=window）不走本监听——target 阶段 stopPropagation 拦不住同元素
// 监听器，由 input.js 的同款门禁兜住，两条路径行为一致。
// close 回调由注册方提供（release 的 seen/notified 写入、imdrawer 停轮询都在各自
// close 里，管理器零业务知识）；先出栈再调 close、异常隔离——单个浮层炸不掉整条
// Esc 链。close 内可再调 overlayClose(自身 id)（显式关闭路径同步栈），已出栈时空转。
var stack = []; // [{ id, close, modal }]，栈顶 = 最后打开
import { testHook } from './dbg.js';

export function overlayOpen(layer) {
  if (!layer || !layer.id || typeof layer.close !== 'function') return;
  ensureKey();
  overlayClose(layer.id); // 幂等：同 id 重开先收旧（imgview/release「open 先 close」惯例）
  stack.push({ id: layer.id, close: layer.close, modal: !!layer.modal });
}

export function overlayClose(id) {
  for (var i = stack.length - 1; i >= 0; i--) {
    if (stack[i].id !== id) continue;
    var layer = stack.splice(i, 1)[0];
    try { layer.close(); } catch (e) { /* 收尾异常不阻断 Esc 链 */ }
    return;
  }
}

export function overlayTop() {
  return stack.length ? stack[stack.length - 1] : null;
}

export function overlayIsOpen(id) {
  for (var i = 0; i < stack.length; i++) if (stack[i].id === id) return true;
  return false;
}

// 整流卸载（player.unmount 调）：自顶向下逐层收尾。0.9.22 教训的另一半：显式拆，
// 不赌事件顺序——root 拆了而监听/闭包残留会吞掉普通站页的全局键盘
export function overlayTeardown() {
  while (stack.length) overlayClose(stack[stack.length - 1].id);
}

// ---- 模态键语义（仅真实键盘；合成事件见文件头） ----
// 懒注册（首个浮层打开时），模块生命周期常驻：栈空时监听器空转，unmount 后不吞站点键盘
var keyBound = false;
function onOverlayKey(ev) {
  if (ev.target === window) return; // 合成事件：input.js 栈判定兜底
  var top = overlayTop();
  if (!top || !top.modal) return; // 非模态层不拦键：抽屉开着导航键照常到 input.js
  ev.stopPropagation();
  if (ev.key === 'Escape') overlayClose(top.id);
}
function ensureKey() {
  if (keyBound) return;
  keyBound = true;
  window.addEventListener('keydown', onOverlayKey, true);
}

// debug 构建测试钩子：harness 断言读浮层栈快照
testHook('overlay', function () { return stack.map(function (l) { return l.id + (l.modal ? ':m' : ''); }); });
