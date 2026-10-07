// ---------- 播放层级别栈与层内步进核（0.9.209 自 playlayer.js 拆出） ----------
// 工作态（三态会话/层内历史/级别栈/walk 队列）全在本模块；一切环境触面（swap slide、箭头
// 同步、抽屉页签、toast、相关池请求、视频当前位置）经 setLevelIO 注入——纯状态可 node 单测，
// 断言钉 push/弹/回退/会话分派判定（ll-* 场景的浏览器侧行为不变式仍由 harness 钉）。
//
// 级别栈语义（0.9.174/175 用户裁决）：抽屉「相关推荐」行点击 = **压新级别开列表播放器**，
// 关闭（Esc）= 弹回**原来那条视频**（进度原地恢复）；每级 = { item, sess, hist, hIdx, queue, at }，
// 模型变量恒描述**栈顶**，压/弹前 saveLevel() 存档、弹后还原。深度封顶 2 级（第 1 级视频
// 播放器 → 第 2 级列表播放器，第 2 级里再压直接拒，防无限套娃）。
import {
  freshSession, sessionFromCtx, snapSession, sessionFromSnap,
  createHist, histJump, histReset, histBack
} from './playstate.js';
import { playItemOf } from './playitem.js';

// 环境触面契约：{ swap(item, resumeAt)→bool 换条挂载（含抽屉跟随）、alive() 层是否还在、
// curTime() 当前视频播放位秒、toast(msg)、syncArrows()、syncListTab()、listMode(bool)、
// hideList()、openListDrawer()、relatedBatch(id)→Promise<面板条目[]> }
var io = null;
export function setLevelIO(x) { io = x; }

var session = freshSession();
var H = createHist();
var levels = [];    // 级别栈：levels[0]=第 1 级（视频播放器），栈顶=当前
var queue = [];     // walk 会话里 seq 模式一次多出的候选（随机模式恒空）
var stepping = false;
var curItem = null; // 层内当前条目（换条/游走的锚；mountSlide 经 setCurItem 镜像）
var MAX_LEVELS = 2; // 封顶（0.9.175 用户裁决）：列表播放器只播自己那份列表，不再压级

export function currentSession() { return session; }
export function isSingle() { return session.kind === 'single'; }
export function curItemOf() { return curItem; }
export function setCurItem(item) { curItem = item; }
export function canBack() { return H.hIdx > 0; }
export function isStepping() { return stepping; }

// 会话装配（层开/跳轨时调；放 swap 之前——新 slide 按新会话决定建不建箭头）
export function applyCtx(ctx) {
  session = sessionFromCtx(ctx);
  queue = [];
}

// 层开登记（DOM 半边 mountSlide 在 playlayer）：历史第 0 条=入口那条（↑ 要能回到**入口**），
// 级别栈底同步建立；curItem 同步锚定（playlayer.mountSlide 侧 setCurItem 同值幂等）
export function enterLayer(item) {
  curItem = item;
  histReset(H, { item: item, sess: snapSession(session) });
  levels = [{ item: item, sess: snapSession(session), hist: H.hist, hIdx: 0, queue: [], at: 0 }];
  io.syncArrows();
}

// 落点=入历史（**级别内**换条：↓/列表内跳转都走这）
function jump(item) {
  if (!io.swap(item)) return false;
  histJump(H, { item: item, sess: snapSession(session) });
  io.syncArrows();
  io.syncListTab();
  return true;
}

function stackTop() { return levels.length ? levels[levels.length - 1] : null; }

// 把**栈顶工作态**写回级别（压/弹前调；级别内的 hist/session 变更都在这里落档）
function saveLevel() {
  var lv = stackTop();
  if (!lv) return;
  lv.item = curItem || lv.item;
  lv.sess = snapSession(session);
  lv.hist = H.hist;
  lv.hIdx = H.hIdx;
  lv.queue = queue;
  lv.at = io.curTime();
}

// 压新级别 = 开「列表播放器」（0.9.174 用户裁决）：当前级别原样保活（暂停存档），新级别播
// ctx 那份列表、锚在被点行；**自动展开抽屉并停在「列表」tab**（打开就看得见自己在那份列表里；
// DOM 半边经 io）。bodyRef/条目有效性由 playlayer 侧守卫（保持原判定次序）
export function pushLevel(item, ctx) {
  if (levels.length >= MAX_LEVELS) return true; // 已到上限：静默吞掉（调用方按"已处理"看待）
  saveLevel();
  applyCtx(ctx);
  if (!io.swap(item)) return false;
  histReset(H, { item: item, sess: snapSession(session) });
  levels.push({ item: item, sess: snapSession(session), hist: H.hist, hIdx: 0, queue: [], at: 0 });
  io.syncArrows();
  io.listMode(true); // 列表播放器：抽屉只留评论 + 列表（相关推荐入口收起，防套娃）
  io.openListDrawer();
  return true;
}

// Esc 弹级核：级别 >1 才弹——存档、弹出、还原上级工作态，返回 {item, at} 交 playlayer
// 换条（进度经 slide._resumeAt 槽恢复）并做抽屉收尾；单级返回 null（交回视图层退出）
export function escape() {
  if (levels.length <= 1) return null;
  saveLevel();
  levels.pop();
  var up = stackTop();
  session = sessionFromSnap(up.sess);
  H.hist = up.hist;
  H.hIdx = up.hIdx;
  queue = up.queue;
  return { item: up.item, at: up.at };
}

// 列表内跳转（抽屉「列表」tab 行点击；relatedapi.pickInLayer → playlayer → 这里）：
// 同一级别、同一列表，只挪锚点播该条——不压级、不换列表
export function pickInLevel(idx) {
  if (session.kind !== 'list' || !session.list.length) return false;
  if (idx < 0 || idx >= session.list.length) return false;
  session.idx = idx;
  return jump(playItemOf(session.list[idx]));
}

// 键盘 ↓/↑ 步进核（在途互斥/复按挡板与 slideRef 守卫在 playlayer 入口）。
// ↓ 按会话分派（single 静默 / list 顺序 / walk 相关池），↑ 一律历史回退
export function step(delta) {
  if (stepping) return false;
  if (delta < 0) {
    var h = histBack(H);
    if (!h) return false; // 已到入口：「已经是第一条」由 playlayer 出（含 DOM 守卫语境）
    // 会话随格还原（跨轨回退也能退回原列表原位——ll-btn-prev/ll-zone-back 钉这条）
    session = sessionFromSnap(h.sess);
    io.syncListTab(); // 列表播放器里 ↑/↓ 换条 → 抽屉「列表」tab 当前项跟随（tab 未激活时不抢）
    queue = [];
    var ok = io.swap(h.item);
    io.syncArrows();
    return ok;
  }
  return stepNext();
}

function stepNext() {
  if (session.kind === 'single') return false; // 单条来源：没有下一条（静默，同竖刷流尽语义）
  if (session.kind === 'list') {
    var i = session.idx + 1;
    if (i < session.list.length) {
      session.idx = i;
      jump(playItemOf(session.list[i])); // 列表存面板条目，步进时过 playItemOf 归一
      return true;
    }
    if (session.more) {
      if (stepping) return false;
      stepping = true;
      session.more().then(function (added) {
        stepping = false;
        if (!io.alive()) return; // 期间层已拆
        if (added && added.length) { session.list = session.list.concat(added); stepNext(); }
        else { io.toast('已经是最后一条'); io.syncArrows(); }
      }, function () { stepping = false; io.toast('已经是最后一条'); io.syncArrows(); });
      return true;
    }
    io.toast('已经是最后一条');
    return false;
  }
  // walk（相关池；分区默认。seq 模式先吃队列，随机模式每次向池要一批）
  if (queue.length) { jump(queue.shift()); return true; }
  if (stepping) return false;
  stepping = true;
  io.relatedBatch(curItem.id).then(function (items) {
    stepping = false;
    if (!io.alive()) return; // 期间层已拆
    if (!items || !items.length) { io.toast('没有更多相关推荐'); return; }
    queue = queue.concat(items.slice(1));
    jump(items[0]);
  });
  return true;
}

// 层拆/重建的工作态清零（playlayer 的 buildPlayView 与 teardownPlayView 共用；
// DOM 半边各自处理）
export function resetAll() {
  session = freshSession();
  H = createHist();
  levels = [];
  queue = [];
  stepping = false;
  curItem = null;
}

// debug 构建测试钩子取数（playlayer testHook 组装完整形态；release 死码消除）
export function debugState() {
  return {
    session: session.kind,
    listLen: session.list.length,
    listIdx: session.idx,
    hasMore: !!session.more,
    hist: H.hist.length,
    hIdx: H.hIdx,
    queue: queue.length,
    levels: levels.length,
    parentId: levels.length > 1 ? (levels[levels.length - 2].item || {}).id || null : null,
    curAt: stackTop() ? Math.round(stackTop().at || 0) : 0,
    parentAt: levels.length > 1 ? Math.round(levels[levels.length - 2].at || 0) : 0
  };
}
