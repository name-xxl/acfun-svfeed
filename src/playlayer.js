import { CFG } from './cfg.js';
import { toast, spinner } from './ui.js';
import { errBox } from './errbox.js';
import { bindLayerGestures } from './playgest.js'; // 层内滑动手势（0.9.184 自本模块拆出）
import { parseRoute } from './route.js';
import { API } from './api.js';
import { playItemOf } from './playitem.js';
import { setItemOpener } from './cards.js';
import { registerView } from './viewreg.js';
import { setVideoTarget, setWatchTarget, setPlayItem, setOvlNoNext, OVL_IDX } from './state.js';
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
var unbindGest = null; // 层内滑动手势解绑函数（0.9.184 自本模块拆至 playgest.js；随层拆）

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
// 「当前会话没有下一条」中介注册（0.9.183）：playback.applyLoop 的 loop 落点读它（single
// 恒循环）——判据是本会话私有状态，经 state 注入（playItem 同型先例），消费方零新模块边
setOvlNoNext(function () { return session.kind === 'single'; });

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

// 层内滑动手势（0.9.171）：滚轮/触摸板上下滑 = playStep(±1)——逻辑 0.9.184 拆至 playgest.js
// （视图壳/会话/级别栈/手势四缝之一），本模块只持解绑函数、随层拆。

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

// 错误盒（盒体单源见 errbox.js；0.9.77 教训「重试键在盒内且点击先整盒撤除」随盒体下沉）。
// 两条失败路径（深链解析空/网络）出口形态一致。

function buildPlayView(body, arg) {
  body.classList.add('acsv-vbody-play');
  var id = Number(arg) || 0;
  if (!id) { errBox(body, '播放链接不完整（缺少视频 id）'); return; }
  bodyRef = body;
  hist = []; hIdx = -1; queue = []; stepping = false;
  unbindGest = bindLayerGestures(body, playStep); // 层内滑动手势（0.9.184 逻辑在 playgest.js）
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
  var sp = spinner();
  function load() {
    body.appendChild(sp);
    API.deepLink(id, parseRoute().src).then(function (hit) {
      if (!body.isConnected) return; // 期间已离开播放层
      sp.remove();
      if (!hit) { errBox(body, '视频加载失败', load); return; }
      enterLayer(body, hit.item);
    }, function () {
      if (!body.isConnected) return;
      sp.remove();
      errBox(body, '视频加载失败（网络不可达）', load);
    });
  }
  load();
}

function teardownPlayView() {
  setVideoTarget(null); // 撤键盘重定向：此后"当前视频"回到竖刷当前条
  setWatchTarget(null); // 撤上报重定向（0.9.86）：兜底上报回到竖刷当前条
  if (unbindGest) { unbindGest(); unbindGest = null; } // 滑动手势随层拆（0.9.171；0.9.184 解绑函数化）
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
