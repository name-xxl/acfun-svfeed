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
import { batch as relatedBatch, seed, setLayerHost } from './relatedapi.js';
import { isOpenComments, openComments } from './comments.js';
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
var slideRef = null; // 当前层内 slide（teardown 拆会话用；DOM 由框架拆）
var bodyRef = null; // 层体（换条要往它挂新 slide）
var curItem = null; // 层内当前条目（换条/游走的锚）
var hist = [];      // 层内历史（↑ 回退；↓ 追加，回退后再 ↓ 截断重开）
var hIdx = -1;
var queue = [];     // seq 模式一次多出的候选（walk 模式恒空）
var stepping = false;

export function openPlayer(pi) {
  if (!pi || !pi.acId) return;
  pending = pi;
  location.hash = CFG.hash + '/play/a/' + pi.acId;
}

function mountSlide(body, item) {
  var slide = buildSlide(item, OVL_IDX, null); // goTo=null：层内不建上下翻页箭头
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
function swap(item) {
  if (!bodyRef || !item) return false;
  if (slideRef && slideRef._session) { slideRef._session.dispose(); slideRef._session = null; }
  if (slideRef && slideRef.parentNode) slideRef.parentNode.removeChild(slideRef);
  slideRef = null;
  mountSlide(bodyRef, item);
  if (isOpenComments()) openComments(item.id, item.stype, item.shareUrl, item.kind, item.title);
  return true;
}

// 落点=入历史（回退后再前进会截断旧前向分支）
function jump(item) {
  if (!swap(item)) return false;
  hist[hIdx + 1] = item;
  hist.length = hIdx + 2;
  hIdx = hist.length - 1;
  return true;
}

// 层开：挂首条并把它登记为历史第 0 条（↑ 要能回到**入口**那条——mountSlide 只管 DOM，
// 不碰历史；deep-link 冷进入与点击进入两条路都经这里）
function enterLayer(body, item) {
  mountSlide(body, item);
  hist = [item];
  hIdx = 0;
}

// 键盘 ↓/↑ 入口（player 注入 input 的 api.playStep；ev.repeat 在 input 侧挡、在途互斥在此）。
// 前向：seq 模式先吃队列；walk 模式每次向相关池要一批（batch 内部按 relSequential 分派，
// 返回 1 条或整列），抽到就换、抽空（连续失败/池尽）给 toast 不静默
export function playStep(delta) {
  if (!slideRef || !curItem || stepping) return false;
  if (delta < 0) {
    if (hIdx <= 0) { toast('已经是第一条'); return false; }
    hIdx--;
    swap(hist[hIdx]);
    return true;
  }
  if (queue.length) { jump(queue.shift()); return true; }
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

// 层宿主注册（relatedapi mediator）：抽屉「相关推荐」行在层内点 = 层内换条（不拆界面）
setLayerHost({
  active: function () { return !!slideRef; },
  jump: jump
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
  seed(id); // 游走泵播种：入口视频登记为已见（层内 ↓ 的链从这里开始，不回头）
  var st = pending;
  pending = null;
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
  if (slideRef && slideRef._session) { slideRef._session.dispose(); slideRef._session = null; }
  slideRef = null;
  setPlayItem(null); // 镜像随层拆（0.9.111）
  pending = null;
  bodyRef = null; curItem = null; hist = []; hIdx = -1; queue = []; stepping = false; // 层内游走态随层拆
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
    queue: queue.length
  };
});

setItemOpener(openPlayer); // 视图条目点击出口（卡面 kit 不反向 import 本模块）
