// ---------- 舞台落地/吸附（0.9.272 自 player.js 拆出，逐字搬迁） ----------
// issue #1「切换后滚动到一半停留」的两条防线：
//   ① 脚本落位（landAt/scrollToIndex）：瞬时落位 + 8 帧 settle，无动画可撕；
//   ② 原生滚动自愈（snapWatchTick）：600ms 采样，连续静止且不在吸附点 → 按最后手势方向补齐。
// player 只注入舞台/流仓库/渲染回调（setActive/renderWindow/reportLeaveCurrent），本件
// 不 import player（无回边）。归类 PLAY（播放层几何/时序，只依赖 cfg/dbg 基建）。
import { stat } from './dbg.js';

/**
 * @param {{
 *   getScroller: () => HTMLElement|null,
 *   feedStore: any,
 *   slideAt: (idx:number) => HTMLElement|null,
 *   stageVisible: () => boolean,
 *   setActive: (idx:number) => void,
 *   renderWindow: () => void,
 *   reportLeaveCurrent: (why:string) => void
 * }} env
 */
export function createLandKit(env) {
  var getScroller = env.getScroller;
  var feedStore = env.feedStore;
  var slideAt = env.slideAt;
  var stageVisible = env.stageVisible;
  var setActive = env.setActive;
  var renderWindow = env.renderWindow;
  var reportLeaveCurrent = env.reportLeaveCurrent;

  // 落地：把视口移到 idx 那张，并保证「落点就是它」（0.9.74；0.9.216 近跳归队远跳链路）。
  //  - 舞台不可见时由 scrollToIndex 推迟调用：视图态 scroller 无布局盒，offsetTop 恒 0
  //    ⇒ 旧行为静默滚回第一条（命中缓冲的同步跳最常踩）
  //  - 远近跳统一瞬时落位+8 帧 settle：近跳旧走 smooth，会被一次「auto 瞬时滚动」无声撕掉
  //    （0.9.216 探针实测：auto 落笔即撕，scroll 事件一次不发，停在半途；而飞行中换壳/
  //    排序重排 52 次、途经 snap-stop:always 都掐不断 smooth——旧「重排掐断」推断被推翻）。
  //    游标在起飞时已同步到新条，撕掉后没有任何机制补吸附（mandatory snap 只对「正在滚动
  //    到吸附点」的滚动生效，对已取消的不补），观感=issue #1「滚动到一半停留」。瞬时落位
  //    无动画可撕，天然免疫；8 帧 settle 补落位后微任务链补渲染的漂移，守卫与远跳同款
  //  - 落地后连续复量回正（最多 8 帧；补插 slide 会让内容整体平移、像素锚点不动）；
  //    用户自己滚过（偏离超过半屏）立即放弃，不跟手势抢
  var landTimer = null;
  var settleSeq = 0; // settle 代际：新落位/停止时作废旧 rAF 链（0.9.273）
  function landAt(idx, near) {
    var scroller = getScroller();
    if (!scroller) return;
    // 0.9.216 诊断：近/远落位各计一笔。用户在真机上「切换视频」走不走脚本这条路，全靠它
    // 自证——滚轮/触摸走原生滚动，根本不到这里（`land.near` 恒 0 即「不走脚本」）
    stat(near ? 'land.near' : 'land.far');
    var slide = slideAt(idx);
    if (!slide) return;
    var target = slide.offsetTop;
    scroller.scrollTo({ top: target, behavior: 'auto' });
    setActive(idx);
    // settle 窗口 8 帧（~133ms）：盖过 0.9.74 landWhenVisible 轮询间隔（16ms）那类「auto
    // 撕 smooth」的落笔延迟——0.9.216 探针实测撕扯发生在起飞后 16ms，8 帧 settle 早已退场。
    // 不设「偏离<半屏」上界：被撕回旧条时偏离恰是一整屏，上界守卫会天然拒修（探针实锤）；
    // 「不跟手势抢」由 land.stuck 探测器的用户滚动时间戳兜底，settle 本身只管钉目标
    var tries = 8;
    var my = ++settleSeq;
    (function settle() {
      var sc = getScroller();
      if (!sc || my !== settleSeq || tries-- <= 0) return;
      var s = slideAt(idx);
      if (!s) return;
      var d = s.offsetTop - sc.scrollTop;
      if (Math.abs(d) > 2) sc.scrollTop = s.offsetTop;
      requestAnimationFrame(settle);
    })();
  }

  // 半屏停留：探测器 → 落位兜底（0.9.216 埋点；0.9.231 升级为 release 常驻自愈）。
  // issue #1「切换后滚动到一半停留」= 视口静止在两个吸附点之间。0.9.216 探针实测（p7）：
  // smooth 在途被一次 auto 滚动撕掉 ⇒ 视口停在非吸附点（实测 150→30、450→398）且
  // **永久不吸附**（2s 后仍在原处）；而纯程序化赋值到非吸附点会被 snap 吸回（实测 150→2）
  // ——「被撕掉的在途滚动」绕过了 snap 的滚动结束吸附。0.9.216 已把**脚本落位**改瞬时
  // （无动画可撕，见 landAt 注释）；但**滚轮/触摸走原生滚动、不经 landAt**——报障者
  // （2026-10-10 回帖：Win10+Edge100、滚轮、单次即停、永久卡半屏，两帧截图相隔 11s 视口
  // 纹丝不动）正是这条路。旧内核/别处撕扯何时制造它不可控，可控的是**最终态**：视口必须
  // 落在吸附点上。故把观测判据升级为动作——每 600ms 采一次，连续两次 scrollTop 不动
  // （真静止，排除动画/惯性）∧ 不落在任何带 data-idx 子项的 offsetTop（±2）∧ 距最后一次
  // 滚轮/触摸 >900ms（手势刚收、吸附未落不抢）⇒ 按最后一次手势方向补齐到吸附点（瞬时落位，
  // 同 landAt 的免疫手法），频控 2s；自愈不改 FeedStore.current，游标交回 IO 正常推进。
  // 判据三坑沿用 0.9.216 探针结论：不收 keydown（键盘导航正是脚本落位源，会自拦）、不拿
  // FeedStore.current 判（被撕回旧条时游标也回去，真场景整条跳过）、不设「期间无新落位」闸
  // （连续切换会让复核全废）
  var snapTicker = null;
  var snapHealAt = 0;
  var probeTimer = 0; // 260ms 双采样的句柄：stop 时必须可撤（0.9.273）
  function snapWatchTick() {
    var scroller = getScroller();
    if (!scroller || !feedStore.items.length) return;
    // 舞台被视图盖住时 scroller 无布局盒：offsetTop 全体归 0 ⇒ 任何静止位都"非吸附"，必须排除
    if (!stageVisible()) return;
    if (document.hidden) return; // 后台标签不打扰（imbade/followbadge 同款约定）；回前台下一拍自然续上
    var a = scroller.scrollTop;
    probeTimer = setTimeout(function () {
      probeTimer = 0;
      var sc = getScroller();
      if (!sc || !stageVisible()) return;
      if (Math.abs(sc.scrollTop - a) > 2) return; // 还在动（动画/惯性）
      if (Date.now() - (window.__acsvLastInput || 0) < 900) return; // 手势刚收，吸附未落
      var st = sc.scrollTop, prev = -1, next = -1, onSnap = false;
      Array.prototype.forEach.call(sc.children, function (c) {
        if (!c.dataset || c.dataset.idx == null) return; // 全局 spinner 等无 idx 子项不参与吸附表
        var t = c.offsetTop;
        if (Math.abs(t - st) <= 2) { onSnap = true; return; }
        if (t < st) { if (t > prev) prev = t; }
        else if (next === -1 || t < next) next = t;
      });
      if (onSnap) return;
      if (__ACSV_DEBUG__) stat('land.stuck'); // 现象计数（0.9.216 口径不变：非零＝当场上演过）
      if (Date.now() - snapHealAt < 2000) return; // 频控：仍在漂的连发不放大，下一拍复核兜底
      var dir = window.__acsvLastInputDir || 0; // 手势方向（input.js 打）：+1 下一条 / -1 上一条
      var target;
      if (dir > 0) target = next;
      else if (dir < 0) target = prev;
      else target = prev < 0 ? next : (next < 0 ? prev : (st - prev <= next - st ? prev : next));
      if (target < 0) return; // 两侧都无吸附点（空表/重制中）不该发生，兜底放弃
      snapHealAt = Date.now();
      sc.scrollTo({ top: target, behavior: 'auto' });
      if (__ACSV_DEBUG__) stat('land.heal');
    }, 260);
  }
  function startSnapWatch() {
    if (snapTicker) return;
    snapTicker = setInterval(snapWatchTick, 600);
  }
  function stopSnapWatch() {
    if (snapTicker) { clearInterval(snapTicker); snapTicker = null; }
    if (probeTimer) { clearTimeout(probeTimer); probeTimer = 0; }
    settleSeq++; // 同时作废在途 settle：卸载/停表后不再改写 scrollTop
  }
  if (__ACSV_DEBUG__) {
    // 装机标记：判读时先看它——`land.watch` 缺失即「含探测器的构建根本没装」（打点只在
    // 命中时建键，stuck 缺失本身分不清"没现象"还是"没这代码"，0.9.216 真机排查连栽在此）
    stat('land.watch');
  }

  // 视图态下 scroller 无布局盒：等它回来再落地（16ms 轮询，上限约 1s；期间离开流由 slideAt 兜底放弃）
  function landWhenVisible(idx, near, tries) {
    var scroller = getScroller();
    if (!scroller) return;
    if (!stageVisible()) {
      if (tries <= 0) return;
      landTimer = setTimeout(function () { landTimer = null; landWhenVisible(idx, near, tries - 1); }, 16);
      return;
    }
    landAt(idx, near);
  }

  function scrollToIndex(idx) {
    var scroller = getScroller();
    if (!scroller) return;
    settleSeq++; // 新落点作废旧 settle 链（landAt 会再取新代）
    feedStore.ensureMore().then(function () {
      if (!getScroller()) return;
      // 目标可能落在渲染窗口外（深链就地跳转）：renderWindow 只渲染
      // [cur-1, cur+1]，不先把游标挪过去就永远拿不到那条 slide，整跳会静默失败。挪游标前
      // 照 setActive 的规矩对旧条目报最终进度（划走即离开），挪后 setActive 不会重复报
      var near = Math.abs(idx - feedStore.current) <= 1;
      if (!slideAt(idx) && idx < feedStore.items.length) {
        if (feedStore.current !== idx) reportLeaveCurrent('swipe');
        feedStore.current = idx;
      }
      renderWindow();
      if (landTimer) { clearTimeout(landTimer); landTimer = null; } // 新落点作废旧等待
      if (!stageVisible()) return landWhenVisible(idx, near, 60);
      landAt(idx, near);
    });
  }

  return {
    landAt: landAt,
    landWhenVisible: landWhenVisible,
    scrollToIndex: scrollToIndex,
    startSnapWatch: startSnapWatch,
    stopSnapWatch: stopSnapWatch,
    tick: snapWatchTick
  };
}
