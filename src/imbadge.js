// ---------- 私信未读徽标（0.9.163 自 imdrawer.js 拆出；仿 followbadge.js 先例） ----------
// 顶栏 + 收起浮条未读徽标：unReadCountUpdate 事件加速 + 慢轮询兜底（仅缓存读）。
// 0.9.244：轮询起点随 badgeDelay（15s）——此前 mount 即起 5s 拍、首拍就 ensureIm 拉 860KB
// SDK，「避免一打开就拉 SDK」的延迟意图被架空（真机读数：挂载后 7.8s SDK 已 connect）。
// 与抽屉 UI 零共享状态（只经 imsend.ensureIm 取会话缓存）——mountBadge 由 player 挂载、
// teardownIm 经 stopBadge 反向通知拆除，本模块不 import 抽屉（方向 imbadge→imsend 单向）。
// mounted 门禁：teardown 后残留的 tick/延迟首查/推送监听全部失效（重进由 mountBadge 重新武装）。
// 0.9.257 推送监听改「登记句柄 + stopBadge 里 off」：SDK 实例是永不释放的单例
// （imsend.ensureIm 只 bump connGen），此前每次挂载都叠一层监听且从不撤；更糟的是回调里的
// mounted 是**共享模块标志**，最新一次挂载置真后所有陈旧回调都能通过守卫 ⇒ 一个
// unReadCountUpdate 触发 N 次 getSessions 全量求和（N=历史挂载次数）。另 mountBadge 先
// stopBadge：未经 teardown 的重挂否则还会孤儿化上一对 timer 与旧监听。
import { CFG } from './cfg.js';
import { ensureIm, isLogined } from './imsend.js';
import { testHook } from './dbg.js';

var badgeEl = null, mounted = false;
var badgeTimer = null, badgeDelayTimer = null;
var badgeInst = null, unreadFn = null; // 推送监听句柄（0.9.257；撤法同 imsend.js 的 sendSucceed）

function badgeText(n) { return n > 99 ? '99+' : (n > 0 ? String(n) : ''); }

// btn 参数保留（player 调用形态不变）；徽标只写 badge 元素
export function mountBadge(btn, badge) {
  stopBadge(); // 先收旧（0.9.257）：重挂不保证经过 teardownIm
  badgeEl = badge;
  mounted = true;
  var last = -1;
  function tick() {
    if (!mounted) return;
    if (document.hidden) return; // 后台标签不打扰（同 followbadge/squarefeed 约定）
    if (!isLogined()) { setBadge(0); return; }
    ensureIm().then(function (inst) {
      if (!mounted || !inst.connected) return;
      var sum = 0;
      try {
        (inst.kernel.getSessions() || []).forEach(function (s) { sum += Number(s.unreadCount) || 0; });
      } catch (e) { }
      setBadge(sum);
    }, function () { });
  }
  function setBadge(n) {
    if (n === last) return;
    last = n;
    var txt = badgeText(n), show = n > 0 ? '' : 'none';
    if (badgeEl) { badgeEl.textContent = txt; badgeEl.style.display = show; }
  }
  // 轮询不在此武装（0.9.244）：mount 即起的 5s 拍会在首拍就 ensureIm 拉 860KB SDK，
  // 把 badgeDelay 的延迟意图架空——首查与轮询都从 badgeDelay 到点起
  badgeDelayTimer = setTimeout(function () {
    if (!mounted) return;
    tick();
    badgeTimer = setInterval(tick, CFG.im.badgePoll);
    ensureIm().then(function (inst) {
      badgeInst = inst;
      unreadFn = function () { if (mounted) tick(); };
      try { inst.on('unReadCountUpdate', unreadFn); } catch (e) { }
    }, function () { });
  }, CFG.im.badgeDelay);
}

// 抽屉整体拆除（teardownIm）通知缝：停双 timer、撤门禁、摘推送监听、清元素引用——原 teardownIm
// 内联三清（0.9.163 随 mountBadge 迁入本模块），不清的话残留 tick 会继续拉 SDK
export function stopBadge() {
  mounted = false;
  if (badgeDelayTimer) { clearTimeout(badgeDelayTimer); badgeDelayTimer = null; }
  if (badgeTimer) { clearInterval(badgeTimer); badgeTimer = null; }
  // 摘监听（0.9.257）：单例活着，不摘就跨挂载累积（句柄只在本次挂载内有效，随挂载重建）
  if (badgeInst && unreadFn) { try { badgeInst.off('unReadCountUpdate', unreadFn); } catch (e) { } }
  badgeInst = null;
  unreadFn = null;
  badgeEl = null;
}

// debug 测试钩子（0.9.244）：harness 钉「mount 时只武装延迟 timer、轮询随 badgeDelay 起」
// 0.9.257 增 listenerArmed：跨挂载循环后必须恒为「上一份已撤、当前一份在册」
testHook('imbadge', function () {
  return {
    mounted: function () { return mounted; },
    delayArmed: function () { return !!badgeDelayTimer; },
    pollArmed: function () { return !!badgeTimer; },
    listenerArmed: function () { return !!unreadFn; },
    // 0.9.257 增 accelerate（debug 缝）：把 badgeDelay 压到毫秒级。跨挂载循环的「监听登记
    // 几何」每轮都要等一个 badgeDelay（15s）才可观测，harness 连等数轮不现实；只改本模块
    // 读的 CFG 值，不碰任何逻辑（下一次 mountBadge 生效——已武装的 timer 仍按旧值走）
    accelerate: function (ms) { CFG.im.badgeDelay = Math.max(0, Number(ms) || 0); }
  };
});
