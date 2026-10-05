import { CFG } from './cfg.js';
import { el, toast } from './ui.js';
import { parseRoute } from './route.js';
import { API } from './api.js';
import { playItemOf } from './playitem.js';
import { setItemOpener } from './cards.js';
import { registerView } from './viewreg.js';
import { setVideoTarget, setWatchTarget, setPlayItem, OVL_IDX } from './state.js';
import { buildSlide } from './slide.js';
import { attachVideo } from './attach.js';
import { batch as relatedBatch, seed, setLayerHost, setLayerOpener } from './relatedapi.js';
import { isOpenComments, openComments, retargetComments } from './comments.js';
import { relDrawerShowList, relDrawerSyncList, relDrawerHideList, relDrawerListMode } from './reldrawer.js'; // 列表播放器抽屉（0.9.174/175）
import { testHook } from './dbg.js';

// ---------- 播放层（0.9.74）：列表条目就地播放，不再插队尾 + 跳回竖刷 ----------
// 契约与理由（详见 README 0.9.74）：
//  - 形态=子视图 play（复用 0.9.62 视图框架 + 0.9.74 深界面/来源保活）：不另开浮层宿主——
//    z 档（视图 55）、共享顶栏、dock、Esc 栈、抽屉避让全部免费；地址栏深链由
//    parseRoute().view 守卫天然免疫 syncHash 回写（0.9.62/0.9.72 同型坑）
//  - 条目真源=地址栏：#svfeed/play/<v|a>/<id>（复用 0.9.72 来源标记）。**不 setSource**：
//    播放解析链走 appapi（douga/playInfo），与竖刷内容源无关，不写源记忆
//  - 点击路径把面板条目暂存出"即时首帧"（标题/封面/作者来自面板契约的 up），解析回包由
//    既有 onHomeResolved 补计数；深链/刷新直达无暂存 → 先 API.deepLink 拿标题封面再建
//    （0.9.82：面板→播放的转换下沉为 data.playItemOf 纯函数——原来这层桥躺在本文件里，
//     要 DOM 依赖、不可单测，且只认榜单的 up，是搜索/收藏/历史入口显示'未知用户'的病灶）
//  - slide 不在竖刷流里：标记 slide.dataset.ovl='1' 是唯一判据，idx 用 state.OVL_IDX 哨兵
//    （0.9.78 起哨兵与读出函数 state.isOvlSlide/ownerIdxOf 同源）。触面守卫清单（改共享导出
//    形状必须 grep 全消费点，见 attach.js 契约表）：slide.js 点按判定、attach.syncFwdQuality、
//    controls.rebuildFwdNeighbor、rail 箭头（goTo 为空不建）、player.currentIdx（层开返回哨兵）；
//    renderWindow/幽灵扫描都是 scroller 域内，天然隔离
var pending = null; // 点击路径暂存的面板条目（{ acId, title, cover, up }）
var pendingCtx = null; // 点击路径暂存的会话上下文（0.9.173，见 applyCtx）
var slideRef = null; // 当前层内 slide（teardown 拆会话用；DOM 由框架拆）
var bodyRef = null; // 层体（换条要往它挂新 slide）
var curItem = null; // 层内当前条目（换条/游走的锚）
var hist = [];      // 层内历史：**每格随身带会话快照** {item, sess}——↑ 回退时连列表下标一起
var hIdx = -1;      // 还原（否则列表里 ↓↓ 再 ↑ 会把 idx 落在错格：harness ll-zone-back 首轮抓到）
// ---------- 级别栈（0.9.174）：一个窗口、多层"播放器实例" ----------
// 用户裁决：点抽屉「相关推荐」行 = **开第三个播放器**（列表播放器）而不是把当前视频顶掉——
// 压一级新级别（会话=那份列表），关闭（Esc）= 弹回**原来那条视频**（进度原地恢复）。
// 每级 = { item, sess, hist, hIdx, queue, at }；模型变量（hist/session/curItem…）恒描述**栈顶**，
// 压/弹前 saveLevel() 存档、弹后 loadLevel() 还原。
var levels = [];
var queue = [];     // walk 会话里 seq 模式一次多出的候选（随机模式恒空）
var stepping = false;

// ---------- 层内会话（0.9.173）：↓「下一条从哪来」的单一真源 ----------
//   single 单条（**只由来源显式声明**：动态里的视频卡片）：没有下一条——不出箭头、↓ 静默
//   walk   相关池（**分区入口默认**，与设置 relSequential 组成二选一）：↓ 从相关池抽
//          （随机；设置开=整批顺序队列），换批续命不封顶
//   list   来源结果列表（搜索/榜单/我的/关注；分区设置开=网格顺序；层内点相关推荐行=那份
//          10 条）：↓ 顺序步进；尾部先问 more()（能续拉的来源提供：分区/我的/关注），
//          more 说没有（或没提供）= 停 + 「已经是最后一条」
// ↑ 一律走 hist 历史回退（跨会话也成立：跳轨后 ↑ 能退回原列表原位）。
// 上下文由**来源自己**在 openPanelItem(pi, ctx) 时给（视图最懂自家列表语义），层只管消费。
var session = { kind: 'single', list: [], rows: null, idx: -1, more: null };

export function openPlayer(pi, ctx) {
  if (!pi || !pi.acId) return;
  pending = pi;
  pendingCtx = ctx || null;
  location.hash = CFG.hash + '/play/a/' + pi.acId;
}

// 会话装配（层开/跳轨时调；放 swap 之前——新 slide 按新会话决定建不建箭头）。
// **缺省=walk**（用户裁决「仅播放单条就只剩动态里的视频卡片」——深链/刷新这类无列表来源
// 仍给相关池续命；单条只能由来源显式声明 {kind:'single'}）
function applyCtx(ctx) {
  if (ctx && ctx.kind === 'single') {
    session = { kind: 'single', list: [], rows: null, idx: -1, more: null };
  } else if (ctx && ctx.kind === 'list' && ctx.items && ctx.items.length) {
    session = {
      kind: 'list', list: ctx.items.slice(), rows: ctx.rows || null,
      idx: Number(ctx.idx) || 0, more: ctx.more || null
    };
    if (session.idx < 0 || session.idx >= session.list.length) session.idx = 0;
  } else {
    session = { kind: 'walk', list: [], rows: null, idx: -1, more: null };
  }
  queue = [];
}

// 列表显示行（抽屉「列表」tab 用）：来源给了 rows 就用它（字段更全：dur/like），否则从
// 面板条目降级投影（cover/title/up 总有，其余缺省）——与 list 同序同长，索引即播放项
function displayRowsOf(sess) {
  if (sess.rows && sess.rows.length === sess.list.length) return sess.rows;
  return sess.list.map(function (pi) {
    return {
      id: pi.acId, title: pi.title || '', cover: pi.cover || '',
      dur: pi.dur || '', like: pi.like || 0,
      up: (pi.up && pi.up.name) || pi.upName || ''
    };
  });
}

// 右栏 ▲▼ 状态（列表中间=两枚都在；首条藏 ▲；不可续拉的末条藏 ▼——同竖刷首条语义）
function syncArrows() {
  if (!slideRef) return;
  var up = slideRef.querySelector('.acsv-arrow-up');
  var dn = slideRef.querySelector('.acsv-arrow-down');
  if (up) {
    var hasPrev = hIdx > 0;
    up.style.display = hasPrev ? 'grid' : 'none';
    up.disabled = !hasPrev;
  }
  if (dn) {
    var hasNext = session.kind === 'walk' ? true
      : session.kind === 'list' ? (session.idx + 1 < session.list.length || !!session.more)
        : false;
    dn.style.display = hasNext ? 'grid' : 'none';
    dn.disabled = !hasNext;
  }
}

function mountSlide(body, item, resumeAt) {
  // 箭头（0.9.173）：非单条会话才建——single（动态卡片）保持 0.9.74 的「层内无翻页箭头」
  //（深链/刷新无来源上下文 ⇒ 缺省 walk，箭头在，见 applyCtx 注释）
  var goTo = session.kind === 'single' ? null : {
    up: function () { playStep(-1); },
    down: function () { playStep(1); }
  };
  var slide = buildSlide(item, OVL_IDX, goTo);
  // 进度续播槽（0.9.174 弹回上级）：attachVideo 会把 slide._resumeAt 转入 session.resumeAt，
  // playing 后 seek 回去——复用既有槽位，不自造第二套 seek（attach.js 契约表在册）
  if (resumeAt > 1) slide._resumeAt = resumeAt;
  slide.dataset.ovl = '1';
  body.appendChild(slide);
  slideRef = slide;
  curItem = item;
  // 层内当前条目镜像（0.9.111 下沉 state）：input 的 c 键读 state.playItem，不再反向 import
  // 本模块（旧 itemRef/currentItem 已删——全仓唯一消费者是 input）
  setPlayItem(item);
  // 键盘手势重定向（空格/静音/快进/全屏打层内那条；有钩子不回落竖刷，见 state.videoTarget）
  setVideoTarget(function () {
    var v = slideRef && slideRef.querySelector('video');
    return v || null;
  });
  // 关页/切标签兜底上报的重定向（0.9.86，见 state.watchTarget）：reportLeaveCurrent 必须能
  // 找到层内会话；会话未挂上（_session 还没建）返回 null=什么都不报
  setWatchTarget(function () {
    var s = slideRef && slideRef._session;
    return s ? { session: s, video: s.video } : null;
  });
  attachVideo(slide, item, OVL_IDX); // 懒解析/错误恢复/弹幕/互动栏/上报全走既有链路
}

// 层内换条（0.9.170）：拆旧 slide 会话 → 挂新。抽屉开着就跟着换视频（setActive 同款纪律：
// 评论/相关推荐两个 tab 的宿主都要跟上新 id，title 供锚位行）；hash 不跟写——层地址=入口
// 那条，Esc/刷新仍回入口（游走是层内临时态，不污染分享链接）
function swap(item, resumeAt) {
  if (!bodyRef || !item) return false;
  if (slideRef && slideRef._session) { slideRef._session.dispose(); slideRef._session = null; }
  if (slideRef && slideRef.parentNode) slideRef.parentNode.removeChild(slideRef);
  slideRef = null;
  mountSlide(bodyRef, item, resumeAt);
  // 抽屉跟着换条：走**重定向缝**（不重开浮层——重开会触发 closeComments ⇒ 页签被打回评论，
  // 用户实报「点相关推荐往下刷，页签切回评论」；0.9.178）
  if (isOpenComments()) retargetComments(item.id, item.stype, item.shareUrl, item.kind, item.title);
  return true;
}

// 会话快照（历史格随身存一份；list 数组共享引用、idx/more 值拷贝——列表增长不需回滚）
function snapSession() {
  return { kind: session.kind, list: session.list, rows: session.rows, idx: session.idx, more: session.more };
}

// 落点=入历史（回退后再前进会截断旧前向分支）——**级别内**换条（↓/↑/列表内跳转都走这）
function jump(item) {
  if (!swap(item)) return false;
  hist[hIdx + 1] = { item: item, sess: snapSession() };
  hist.length = hIdx + 2;
  hIdx = hist.length - 1;
  syncArrows();
  syncListTab();
  return true;
}

// 当前播放位置（秒；<1s 不记——首帧误差不值得存）
function curTime() {
  var v = slideRef && slideRef.querySelector('video');
  return v && v.currentTime > 1 ? v.currentTime : 0;
}
function stackTop() { return levels.length ? levels[levels.length - 1] : null; }
// 把**栈顶工作态**写回级别（压/弹前调；级别内的 hist/session 变更都在这里落档）
function saveLevel() {
  var lv = stackTop();
  if (!lv) return;
  lv.item = curItem || lv.item;
  lv.sess = snapSession();
  lv.hist = hist;
  lv.hIdx = hIdx;
  lv.queue = queue;
  lv.at = curTime();
}
// 从级别恢复工作态（弹回上级时调）
function loadLevel(lv) {
  session = { kind: lv.sess.kind, list: lv.sess.list, rows: lv.sess.rows || null, idx: lv.sess.idx, more: lv.sess.more };
  hist = lv.hist;
  hIdx = lv.hIdx;
  queue = lv.queue;
}

// 压新级别 = 开「列表播放器」（0.9.174 用户裁决）：当前级别原样保活（暂停存档），新级别播
// ctx 那份列表、锚在被点行；**自动展开抽屉并停在「列表」tab**（打开就看得见自己在那份列表里）
// 套娃上限（0.9.175 用户裁决）：列表播放器**只播自己那份列表**，里面不再有相关推荐入口——
// 深度封顶 2 级（第 1 级视频播放器 → 第 2 级列表播放器），第 2 级里再想压级直接拒（防无限套娃）
var MAX_LEVELS = 2;
function pushLevel(item, ctx) {
  if (!bodyRef || !item) return false;
  if (levels.length >= MAX_LEVELS) return true; // 已到上限：静默吞掉（调用方按"已处理"看待）
  saveLevel();
  applyCtx(ctx);
  swap(item);
  hist = [{ item: item, sess: snapSession() }];
  hIdx = 0;
  levels.push({ item: item, sess: snapSession(), hist: hist, hIdx: 0, queue: [], at: 0 });
  syncArrows();
  relDrawerListMode(true); // 列表播放器：抽屉只留评论 + 列表（相关推荐入口收起，防套娃）
  openListDrawer();
  return true;
}

// Esc 弹级（player 注入 input 的 api.playEscape）：级别 >1 才弹——弹回上级原视频并**恢复进度**；
// 单级返回 false（交回视图层退出）。「列表」页签一律收起（0.9.177；上级虽是列表会话也不顶它
// 出来——页签是第三播放器专属 UI），且不再自动展开抽屉（Esc 第一下已关抽屉，"关闭即回"靠它）
export function playEscape() {
  if (!slideRef || levels.length <= 1) return false;
  saveLevel();
  levels.pop();
  var up = stackTop();
  loadLevel(up);
  swap(up.item, up.at); // 进度经 slide._resumeAt 槽恢复（方案一过渡；后续接官方历史断点续播）
  syncArrows();
  // 回第 1 级①：「列表」页签**一律收起**（0.9.177 用户实报「点返回键回原视频，抽屉里还是列表」）
  // ——列表页签是**第三播放器专属 UI**（用户裁决口径）；上级虽是列表会话（榜单/搜索/我的/分区
  // 列表模式）也不该顶它出来，第 1 级的抽屉只该是 评论 + 相关推荐
  relDrawerHideList();
  relDrawerListMode(false); // ②：相关推荐入口按 kind 判定还原
  return true;
}

// 列表内跳转（抽屉「列表」tab 行点击；relatedapi.pickInLayer → 这里）：同一级别、同一列表，
// 只挪锚点播该条——不压级、不换列表
function pickInLevel(idx) {
  if (session.kind !== 'list' || !session.list.length) return false;
  if (idx < 0 || idx >= session.list.length) return false;
  session.idx = idx;
  return jump(playItemOf(session.list[idx]));
}

// 抽屉「列表」tab 跟随（层内步进/跳转后调）：tab 未激活时不抢（relDrawerSyncList 内判）
function syncListTab() {
  if (session.kind === 'list' && session.list.length) relDrawerSyncList(session.idx);
}

// 列表播放器打开：自动展开抽屉（未开则开）并停在「列表」tab
function openListDrawer() {
  if (!curItem) return;
  if (!isOpenComments()) {
    openComments(curItem.id, curItem.stype, curItem.shareUrl, curItem.kind, curItem.title);
  }
  relDrawerShowList(displayRowsOf(session), session.idx, curItem.title || '');
}


// 层开：挂首条并把它登记为历史第 0 条（↑ 要能回到**入口**那条——mountSlide 只管 DOM，
// 不碰历史；deep-link 冷进入与点击进入两条路都经这里）
function enterLayer(body, item) {
  mountSlide(body, item);
  hist = [{ item: item, sess: snapSession() }];
  hIdx = 0;
  levels = [{ item: item, sess: snapSession(), hist: hist, hIdx: 0, queue: [], at: 0 }]; // 级别栈底（第 1 级）
  syncArrows();
}

// 层内滑动切换（0.9.171，用户实报「playlayer 窗口无法滑动切换视频」）：滚轮/触摸板上下滑 =
// playStep(±1)。与竖刷的差异——竖刷靠原生 scroll-snap 翻条，层内只有一条 slide：手势自己攒
// 阈值（细碎滚动先累计到 60px 再推一步，避免一次滑动连推多条）+ 500ms 锁防抖。抽屉等浮层是
// root 级兄弟节点，在其上滚动不命中本监听（天然隔离）
var gest = { acc: 0, at: 0, lock: 0, y0: 0, t0: 0 };
function onWheel(ev) {
  var now = Date.now();
  if (now - gest.at > 400) gest.acc = 0; // 新一段滚动从头累计
  gest.at = now;
  gest.acc += ev.deltaY;
  if (Math.abs(gest.acc) < 60 || now - gest.lock < 500) return;
  var dir = gest.acc > 0 ? 1 : -1;
  gest.acc = 0;
  if (playStep(dir)) {
    gest.lock = now;
    if (ev.cancelable) ev.preventDefault(); // 层内无滚动语义：吞掉防橡皮筋
  }
}
function onTouchStart(ev) {
  var t = ev.touches && ev.touches[0];
  gest.y0 = t ? t.clientY : 0;
  gest.t0 = Date.now();
}
function onTouchEnd(ev) {
  var t = ev.changedTouches && ev.changedTouches[0];
  if (!t || !gest.y0) return;
  var dy = gest.y0 - t.clientY; // 上滑（dy>0）=下一条
  gest.y0 = 0;
  if (Math.abs(dy) < 60 || Date.now() - gest.t0 > 800) return;
  playStep(dy > 0 ? 1 : -1);
}

// 键盘 ↓/↑ 入口（player 注入 input 的 api.playStep；ev.repeat 在 input 侧挡、在途互斥在此）。
// ↓ 按会话分派（single 静默 / list 顺序 / walk 相关池），↑ 一律历史回退
export function playStep(delta) {
  if (!slideRef || !curItem || stepping) return false;
  if (delta < 0) {
    if (hIdx <= 0) { toast('已经是第一条'); return false; }
    hIdx--;
    var h = hist[hIdx];
    // 会话随格还原（跨轨回退也能退回原列表原位——ll-btn-prev/ll-zone-back 钉这条）
    session = { kind: h.sess.kind, list: h.sess.list, rows: h.sess.rows || null, idx: h.sess.idx, more: h.sess.more };
    syncListTab(); // 列表播放器里 ↑/↓ 换条 → 抽屉「列表」tab 当前项跟随（tab 未激活时不抢）
    queue = [];
    swap(h.item);
    syncArrows();
    return true;
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
        if (!slideRef) return;
        if (added && added.length) { session.list = session.list.concat(added); stepNext(); }
        else { toast('已经是最后一条'); syncArrows(); }
      }, function () { stepping = false; toast('已经是最后一条'); syncArrows(); });
      return true;
    }
    toast('已经是最后一条');
    return false;
  }
  // walk（相关池；分区默认。seq 模式先吃队列，随机模式每次向池要一批）
  if (queue.length) { jump(queue.shift()); return true; }
  if (stepping) return false;
  stepping = true;
  relatedBatch(curItem.id).then(function (items) {
    stepping = false;
    if (!slideRef) return; // 期间层已拆
    if (!items || !items.length) { toast('没有更多相关推荐'); return; }
    queue = queue.concat(items.slice(1));
    jump(items[0]);
  });
  return true;
}

// 层宿主注册（relatedapi mediator）：抽屉「相关推荐」行在层内点 = **压新级别开列表播放器**
//（0.9.174；原「层内换条」语义已被用户裁决推翻——关闭要能回原视频）
setLayerHost({
  active: function () { return !!slideRef; },
  // 抽屉「相关推荐」行点击（层内）= **开列表播放器**（压新级别，0.9.174 用户裁决——关闭即回原视频）
  jump: function (item, ctx) { return pushLevel(item, ctx || { kind: 'walk' }); },
  // 抽屉「列表」tab 行点击 = 列表内跳转（同级别换条）
  pick: pickInLevel
});

// 开层注册（0.9.172）：层外（竖刷舞台）点相关推荐行 = 以该视频开播放层——舞台原地保活
// （stageHide 暂停当前条），Esc 回当前视频；不再走 startChain（拆视图/重置流，实报「窗口没了」）
setLayerOpener(function (item) {
  if (!item || !item.id) return false;
  openPlayer({ acId: item.id, title: item.title, cover: item.cover, up: item.up });
  return true;
});

// 错误盒 + 盒内重试（0.9.77 修）：重试键必须在盒内且点击时整盒撤除——.acsv-errbox 是
// inset:0 的全幅遮罩（styles.js），旧实现把按钮挂盒外、点击只摘按钮，重载成功后错误盒
// 仍覆盖在视频上（文案常驻 + 吃掉点按），反复失败还会一盒一盒叠起来。
// 网络失败分支同走此盒：两条失败路径的出口形态一致（此前该分支无重试口）。
function buildErr(body, msg, onRetry) {
  var box = el('div', 'acsv-errbox');
  box.style.display = 'grid'; // 同 player.showLoadError：错误盒与转圈不并存
  box.appendChild(el('p', null, msg));
  if (onRetry) {
    var b = el('button', 'acsv-retry', '重试');
    b.addEventListener('click', function () {
      box.remove(); // 先撤盒再重跑：盒在则遮罩在
      onRetry();
    });
    box.appendChild(b);
  }
  body.appendChild(box);
  return box;
}

function buildPlayView(body, arg) {
  body.classList.add('acsv-vbody-play');
  var id = Number(arg) || 0;
  if (!id) { buildErr(body, '播放链接不完整（缺少视频 id）'); return; }
  bodyRef = body;
  hist = []; hIdx = -1; queue = []; stepping = false;
  gest.acc = 0; gest.at = 0; gest.lock = 0; gest.y0 = 0;
  body.addEventListener('wheel', onWheel, { passive: false });
  body.addEventListener('touchstart', onTouchStart, { passive: true });
  body.addEventListener('touchend', onTouchEnd, { passive: true });
  seed(id); // 游走泵播种：入口视频登记为已见（层内 ↓ 的链从这里开始，不回头）
  var st = pending;
  var ctx = pendingCtx;
  pending = null;
  pendingCtx = null;
  applyCtx(ctx); // 会话（0.9.173）：点击路径带来源上下文；深链/刷新无 ctx ⇒ 缺省 walk（相关池续命）
  if (st && String(st.acId) === String(id)) {
    enterLayer(body, playItemOf(st)); // 即时首帧：面板已有标题封面与作者（up 契约），直链交会话解析链补
    return;
  }
  // 深链/刷新直达：先解析（拿标题/封面/来源），失败出错误盒 + 重试（绝不静默）。
  // load() 自带转圈进出：每次重跑先挂 spinner、结束时撤（成功/失败都不留）
  var spinner = el('div', 'acsv-spinner');
  function load() {
    body.appendChild(spinner);
    API.deepLink(id, parseRoute().src).then(function (hit) {
      if (!body.isConnected) return; // 期间已离开播放层
      spinner.remove();
      if (!hit) { buildErr(body, '视频加载失败', load); return; }
      enterLayer(body, hit.item);
    }, function () {
      if (!body.isConnected) return;
      spinner.remove();
      buildErr(body, '视频加载失败（网络不可达）', load);
    });
  }
  load();
}

function teardownPlayView() {
  setVideoTarget(null); // 撤键盘重定向：此后"当前视频"回到竖刷当前条
  setWatchTarget(null); // 撤上报重定向（0.9.86）：兜底上报回到竖刷当前条
  if (bodyRef) { // 滑动手势随层拆（0.9.171）
    bodyRef.removeEventListener('wheel', onWheel);
    bodyRef.removeEventListener('touchstart', onTouchStart);
    bodyRef.removeEventListener('touchend', onTouchEnd);
  }
  if (slideRef && slideRef._session) { slideRef._session.dispose(); slideRef._session = null; }
  slideRef = null;
  setPlayItem(null); // 镜像随层拆（0.9.111）
  pending = null;
  pendingCtx = null;
  bodyRef = null; curItem = null; hist = []; hIdx = -1; queue = []; stepping = false; // 层内游走态随层拆
  levels = []; // 级别栈随层拆（0.9.174）
  // 抽屉「列表」页签随层拆：**必须先收页签再解 listOnly**（0.9.176 修实报「再次点分区视频，
  // 展开抽屉还挂着列表栏」——退出层只解了 listOnly，tabL 的 display 与 lcache 留着，
  // 下次进层开抽屉就是上次那份陈列表）
  relDrawerHideList();
  relDrawerListMode(false);
  session = { kind: 'single', list: [], rows: null, idx: -1, more: null };
}

registerView({
  id: 'play',
  build: buildPlayView,
  teardown: teardownPlayView,
  deep: true, // 深界面：关闭/返回=回来源链顶（打开它的那个列表/搜索页）
  volatile: true // 握播放会话/定时器：离开即真拆，绝不挂起（隐藏容器里继续出声绝不允许）
});

// debug 构建测试钩子：harness 断言读层态与游走账（release 死码消除）
testHook('playlayer', function () {
  return {
    active: !!slideRef,
    id: curItem ? curItem.id : null,
    hist: hist.length,
    hIdx: hIdx,
    queue: queue.length,
    session: session.kind,
    listLen: session.list.length,
    listIdx: session.idx,
    hasMore: !!session.more,
    levels: levels.length,
    parentId: levels.length > 1 ? (levels[levels.length - 2].item || {}).id || null : null,
    curAt: stackTop() ? Math.round(stackTop().at || 0) : 0,
    parentAt: levels.length > 1 ? Math.round(levels[levels.length - 2].at || 0) : 0,
    at: (function () { var v = slideRef && slideRef.querySelector('video'); return v ? Math.round(v.currentTime) : 0; })(),
    arrows: slideRef ? slideRef.querySelectorAll('.acsv-arrow').length : 0,
    upShown: !!(slideRef && (slideRef.querySelector('.acsv-arrow-up') || {}).style
      && slideRef.querySelector('.acsv-arrow-up').style.display !== 'none'),
    downShown: !!(slideRef && (slideRef.querySelector('.acsv-arrow-down') || {}).style
      && slideRef.querySelector('.acsv-arrow-down').style.display !== 'none')
  };
});

setItemOpener(openPlayer); // 视图条目点击出口（卡面 kit 不反向 import 本模块）
