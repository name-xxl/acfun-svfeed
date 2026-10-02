import { CFG } from './cfg.js';
import { el } from './ui.js';
import { parseRoute } from './route.js';
import { API } from './api.js';
import { homeItemOf } from './data.js';
import { registerView, setItemOpener } from './views.js';
import { setVideoTarget } from './state.js';
import { buildSlide } from './slide.js';
import { attachVideo } from './attach.js';

// ---------- 播放层（0.9.74）：列表条目就地播放，不再插队尾 + 跳回竖刷 ----------
// 契约与理由（详见 README 0.9.74）：
//  - 形态=子视图 play（复用 0.9.62 视图框架 + 0.9.74 深界面/来源保活）：不另开浮层宿主——
//    z 档（视图 55）、共享顶栏、dock、Esc 栈、抽屉避让全部免费；地址栏深链由
//    parseRoute().view 守卫天然免疫 syncHash 回写（0.9.62/0.9.72 同型坑）
//  - 条目真源=地址栏：#svfeed/play/<v|a>/<id>（复用 0.9.72 来源标记）。**不 setSource**：
//    播放解析链走 appapi（douga/playInfo），与竖刷内容源无关，不写源记忆
//  - 点击路径把面板条目暂存出"即时首帧"（标题/封面/UP 头像来自面板契约），解析回包由
//    既有 onHomeResolved 补计数；深链/刷新直达无暂存 → 先 API.deepLink 拿标题封面再建
//  - slide 不在竖刷流里：唯一判据 slide.dataset.ovl==='1'，idx 用 OVL_IDX 哨兵。触面守卫
//    清单（改共享导出形状必须 grep 全消费点，见 attach.js 契约表）：slide.js 点按判定、
//    attach.syncFwdQuality、controls.rebuildFwdNeighbor、rail 箭头（goTo 为空不建）、
//    player.currentIdx（层开返回哨兵）；renderWindow/幽灵扫描都是 scroller 域内，天然隔离
export var OVL_IDX = -1;
var pending = null; // 点击路径暂存的面板条目（{ acId, title, cover, up }）
var slideRef = null; // 当前层内 slide（teardown 拆会话用；DOM 由框架拆）
var itemRef = null; // 当前层内条目（键盘 c=评论开合要打到它，不是竖刷当前条）

// 层内当前条目（input.js 的 c 键用；无层=null）
export function currentItem() { return itemRef; }

// 面板条目 → 播放层。up 字段（榜单/搜索结果带）给首帧头像与 UP 名；缺则留空待解析回填
function itemOfPanel(pi) {
  var item = homeItemOf(pi.acId, pi.title, pi.cover);
  var up = pi.up || {};
  if (up.img) item.head = up.img;
  if (up.name) item.userName = up.name;
  if (up.id) item.userId = up.id;
  return item;
}

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
  itemRef = item;
  // 键盘手势重定向（空格/静音/快进/全屏打层内那条；有钩子不回落竖刷，见 state.videoTarget）
  setVideoTarget(function () {
    var v = slideRef && slideRef.querySelector('video');
    return v || null;
  });
  attachVideo(slide, item, OVL_IDX); // 懒解析/错误恢复/弹幕/互动栏/上报全走既有链路
}

function buildErr(body, msg) {
  var box = el('div', 'acsv-errbox');
  box.style.display = 'grid'; // 同 player.showLoadError：错误盒与转圈不并存
  box.appendChild(el('p', null, msg));
  body.appendChild(box);
}

function buildPlayView(body, arg) {
  body.classList.add('acsv-vbody-play');
  var id = Number(arg) || 0;
  if (!id) { buildErr(body, '播放链接不完整（缺少视频 id）'); return; }
  var st = pending;
  pending = null;
  if (st && String(st.acId) === String(id)) {
    mountSlide(body, itemOfPanel(st)); // 即时首帧：面板已有标题封面，直链交会话解析链补
    return;
  }
  // 深链/刷新直达：先解析（拿标题/封面/来源），失败出错误盒 + 重试（绝不静默）
  var spinner = el('div', 'acsv-spinner');
  body.appendChild(spinner);
  (function load() {
    API.deepLink(id, parseRoute().src).then(function (hit) {
      if (!body.isConnected) return; // 期间已离开播放层
      spinner.remove();
      if (!hit) {
        buildErr(body, '视频加载失败');
        var b = el('button', 'acsv-retry', '重试');
        b.addEventListener('click', function () { b.remove(); body.appendChild(spinner); load(); });
        body.appendChild(b);
        return;
      }
      mountSlide(body, hit.item);
    }, function () {
      if (!body.isConnected) return;
      spinner.remove();
      buildErr(body, '视频加载失败（网络不可达）');
    });
  })();
}

function teardownPlayView() {
  setVideoTarget(null); // 撤键盘重定向：此后"当前视频"回到竖刷当前条
  if (slideRef && slideRef._session) { slideRef._session.dispose(); slideRef._session = null; }
  slideRef = null;
  itemRef = null;
  pending = null;
}

registerView({
  id: 'play',
  build: buildPlayView,
  teardown: teardownPlayView,
  deep: true, // 深界面：关闭/返回=回来源链顶（打开它的那个列表/搜索页）
  volatile: true // 握播放会话/定时器：离开即真拆，绝不挂起（隐藏容器里继续出声绝不允许）
});
setItemOpener(openPlayer); // 视图条目点击出口（views 不反向 import 本模块）
