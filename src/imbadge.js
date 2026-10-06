// ---------- 私信未读徽标（0.9.163 自 imdrawer.js 拆出；仿 followbadge.js 先例） ----------
// 顶栏 + 收起浮条未读徽标：unReadCountUpdate 事件加速 + 慢轮询兜底（仅缓存读）。
// 与抽屉 UI 零共享状态（只经 imsend.ensureIm 取会话缓存）——mountBadge 由 player 挂载、
// teardownIm 经 stopBadge 反向通知拆除，本模块不 import 抽屉（方向 imbadge→imsend 单向）。
// mounted 门禁：teardown 后残留的 tick/延迟首查/推送监听全部失效（重进由 mountBadge 重新武装）。
import { CFG } from './cfg.js';
import { ensureIm, isLogined } from './imsend.js';

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
  badgeTimer = setInterval(tick, CFG.im.badgePoll);
  // 首查延迟：避免页面一打开就为徽标拉起 SDK；SDK 就位后再挂推送事件加速
  badgeDelayTimer = setTimeout(function () {
    if (!mounted) return;
    tick();
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
