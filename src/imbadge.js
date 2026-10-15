// ---------- 私信未读徽标（0.9.163 自 imdrawer.js 拆出；仿 followbadge.js 先例） ----------
// 顶栏 + 收起浮条未读徽标：unReadCountUpdate 事件加速 + 慢轮询兜底（仅缓存读）。
// 0.9.244：轮询起点随 badgeDelay（15s）——此前 mount 即起 5s 拍、首拍就 ensureIm 拉 860KB
// SDK，「避免一打开就拉 SDK」的延迟意图被架空（真机读数：挂载后 7.8s SDK 已 connect）。
// 与抽屉 UI 零共享状态（只经 imsend.ensureIm 取会话缓存）——mountBadge 由 player 挂载、
// teardownIm 经 stopBadge 反向通知拆除，本模块不 import 抽屉（方向 imbadge→imsend 单向）。
// mounted 门禁：teardown 后残留的 tick/延迟首查/推送监听全部失效（重进由 mountBadge 重新武装）。
import { CFG } from './cfg.js';
import { ensureIm, isLogined } from './imsend.js';
import { testHook } from './dbg.js';

var badgeEl = null, mounted = false;
var badgeTimer = null, badgeDelayTimer = null;

function badgeText(n) { return n > 99 ? '99+' : (n > 0 ? String(n) : ''); }

// btn 参数保留（player 调用形态不变）；徽标只写 badge 元素
export function mountBadge(btn, badge) {
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
      try { inst.on('unReadCountUpdate', function () { if (mounted) tick(); }); } catch (e) { }
    }, function () { });
  }, CFG.im.badgeDelay);
}

// 抽屉整体拆除（teardownIm）通知缝：停双 timer、撤门禁、清元素引用——原 teardownIm 内联
// 三清（0.9.163 随 mountBadge 迁入本模块），不清的话残留 tick 会继续拉 SDK
export function stopBadge() {
  mounted = false;
  if (badgeDelayTimer) { clearTimeout(badgeDelayTimer); badgeDelayTimer = null; }
  if (badgeTimer) { clearInterval(badgeTimer); badgeTimer = null; }
  badgeEl = null;
}

// debug 测试钩子（0.9.244）：harness 钉「mount 时只武装延迟 timer、轮询随 badgeDelay 起」
testHook('imbadge', function () {
  return {
    mounted: function () { return mounted; },
    delayArmed: function () { return !!badgeDelayTimer; },
    pollArmed: function () { return !!badgeTimer; }
  };
});
