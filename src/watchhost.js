// @ts-check
// ---------- 宿主等待原语（0.9.342 批B：四份同形环收口单源） ----------
// 病灶（README 卫生口径「同形副本」）：「等宿主渲染 → 成一次即停 → 有界重试」这一个环体，
// nav.js（MO 式）/ memberplaza.js（setInterval 式）/ spacemoments.js、uppage.js（递归
// setTimeout 式）各抄一份——常数同取 CFG.nav.tries/retryMs，写法三套，改节拍要碰四处。
// 收口即本件；**刻意不收编的相邻形态**（语义不同，并表=大一统陷阱，批A裁决同款口径）：
//   常驻自愈观察器（spacetab.watchSpaceTabs、memberplaza.healObserver、nativeip 防抖重扫）——
//   它们没有「settled」概念；imnative waitKernel（等异步内核非 DOM 宿主）；逐元素补射计数
// （nativeip._acsvNipTries）。本件只治一次性完成型等待。
// 语义钉（与四份原件逐条对照）：
//   · 首拍同步跑一次（四件原语序一致：boot/调用点即试）；
//   · tries=轮询补拍上限（**计划内补拍条数**，非检查总数——memberplaza `++tries>=20` 与
//     uppage `tries++<20` 原语义同为此形）；tries×stepMs 走递归 setTimeout（memberplaza
//     的 setInterval 与其余两家的链式在「每 stepMs 一拍、上限 tries」上等价，收敛到链式）；
//   · observe=true 时 body childList+subtree 观察补拍（nav 原形态），成则自动摘；
//   · settled（apply 返回 true）⇒ 摘全部定时器与观察器，onDone 恰一次；
//   · deadlineMs 到期未 settled ⇒ 观察窗结束（nav 原件的 6s 语义：MO 摘掉、交给兜底件），
//     onDeadline 恰一次；已 settled 则 deadline 永不再响；
//   · 轮询预算（tries）用尽且始终未 settled ⇒ onEnd 恰一次（memberplaza 的「单循环可重启」
//     依赖此信号复位外部旗标；observe/deadline 不参与 onEnd——无预算可穷尽）；
//   · 零 catch：apply 抛错的传播行为与四份原件逐字一致（重构不夹带语义变化——五维自检批注）。
// 依赖：零（环境原语 setTimeout/MutationObserver 直用；document 仅 observe 分支触到）。
export function watchHost(opts) {
  var tries = opts.tries | 0;
  var stepMs = opts.stepMs || 0;
  var settled = false;
  var pollTimer = null, pollCount = 0, observer = null, deadlineTimer = null;

  function stopAll() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    if (deadlineTimer) { clearTimeout(deadlineTimer); deadlineTimer = null; }
    if (observer) { observer.disconnect(); observer = null; }
  }

  function shot() {
    if (settled) return;
    if (opts.apply() !== true) return;
    settled = true;
    stopAll();
    if (opts.onDone) opts.onDone();
  }

  shot(); // 首拍同步（调用点时序契约：能成即当拍成，不先交出一个 tick）
  if (settled) return;

  if (tries > 0 && stepMs > 0) {
    pollTimer = setTimeout(function pump() {
      pollCount++;
      pollTimer = null;
      shot();
      if (settled) return;
      if (pollCount < tries) pollTimer = setTimeout(pump, stepMs);
      else if (opts.onEnd) opts.onEnd(); // 预算尽而未成：一次性告知（外部据此复位「环在跑」旗标）
    }, stepMs);
  }

  if (opts.observe) {
    observer = new MutationObserver(shot);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (opts.deadlineMs > 0) {
    deadlineTimer = setTimeout(function () {
      deadlineTimer = null;
      if (settled) return;
      stopAll(); // 观察窗就此结束（原件语义：到点不再等宿主，交兜底件自证）
      if (opts.onDeadline) opts.onDeadline();
    }, opts.deadlineMs);
  }
}
