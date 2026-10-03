import { CFG } from './cfg.js';

// ---------- 列表上下文（0.9.106 架构收口） ----------
// 背景（用户三问的根因）：竖刷舞台是共享的唯一实现，但「列表上下文」这套东西被抄了两份——
// UpVideos（空间页，uppage.js）与 FollowVideos（关注视频流，followstream.js）各持 8 个核心
// 字段 + 一套链式加载状态机；且两侧 feedActive 无互斥清理（空间流激活时进关注视频流，
// getListContext 优先 UpVideos ⇒ 关注列表永不被泵——真债务）。
// 本模块收口三件：
//   ① createFeedContext —— 核心字段与 reset 的单源（UI 壳字段各侧自行挂）；
//   ② runChain —— 链式加载状态机单源（上限/间隔/done/failed/chainCapped 判定一处）；
//   ③ 上下文注册表 + **单活互斥**（activateContext 清其余）——替代"优先序兜底"。
// 依赖单向：本模块只依赖 cfg（叶子），uppage/followstream/feedstore 三方引用无环。

export function createFeedContext(opts) {
  opts = opts || {};
  return {
    dockView: opts.dockView || '', // 舞台态 dock 高亮归属（views.syncRouteView 经 listContext 读）
    feedActive: false,
    items: [],
    feedCursor: 0, // 泵游标：下一条待泵入的下标
    pcursor: opts.firstCursor !== undefined ? opts.firstCursor : '0',
    done: false,
    failed: false,
    chainBusy: false,
    chainCapped: false,
    // 上下文重置（进入/重试前清）——不动 dockView 与 UI 壳
    reset: function () {
      this.items = [];
      this.feedCursor = 0;
      this.pcursor = opts.firstCursor !== undefined ? opts.firstCursor : '0';
      this.done = false;
      this.failed = false;
      this.chainBusy = false;
      this.chainCapped = false;
    }
  };
}

// 链式加载（uppage/followstream 原两份 step 循环的单源）：
// o.loadPage(ctx, isFirst) → Promise<{loaded:boolean}>；**约定 loadPage 自行**并入 items、
// 推进 pcursor、置 done/failed（两侧解析形状差异全部留在各自 loadPage 内，通道也各走各的：
// uppage 仍 gmRequest、关注流仍 net.request）。o.onStep(res)/o.onDone() 承载各自 UI 副作用。
export function runChain(ctx, o) {
  if (ctx.chainBusy) return;
  ctx.chainBusy = true;
  ctx.chainCapped = false;
  var pages = 0;
  (function step() {
    if (!ctx.chainBusy || ctx.done || pages >= o.maxPages) {
      ctx.chainCapped = !ctx.done && pages >= o.maxPages;
      ctx.chainBusy = false;
      if (o.onDone) o.onDone();
      return;
    }
    pages++;
    o.loadPage(ctx, pages === 1 && !ctx.items.length).then(function (res) {
      if (o.onStep) o.onStep(res);
      if (ctx.done || !res || !res.loaded) {
        ctx.chainBusy = false;
        if (o.onDone) o.onDone();
        return;
      }
      setTimeout(step, CFG.time.chainGap);
    }, function () {
      ctx.failed = true;
      ctx.chainBusy = false;
      if (o.onDone) o.onDone();
    });
  })();
}

// 上下文注册表（单活互斥）：activateContext 清掉其余所有上下文的 feedActive——修「双上下文
// 互踩」（此前只靠 listContext 的优先序兜底，被压制的一方永远泵不动且无人清理）
var CONTEXTS = [];
export function registerContext(ctx) {
  if (CONTEXTS.indexOf(ctx) < 0) CONTEXTS.push(ctx);
  return ctx;
}
export function activateContext(ctx) {
  CONTEXTS.forEach(function (c) { if (c !== ctx) c.feedActive = false; });
  ctx.feedActive = true;
}
export function deactivateContext(ctx) {
  if (ctx) ctx.feedActive = false;
}
export function activeContext() {
  for (var i = 0; i < CONTEXTS.length; i++) {
    if (CONTEXTS[i].feedActive) return CONTEXTS[i];
  }
  return null;
}
