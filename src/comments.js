import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, fmt, toast, spinner } from './ui.js';
import { errNotLogin, errSend, errImgTooBig } from './toastmsg.js'; // 话术单源（0.9.212 批⑧）
import { ICONS } from './styles.js';
import { GLYPHS } from './imicons.js';
import { commentShareWire } from './immsg.js';
import { root, commentDrawer, claimDrawer, releaseDrawer, currentDrawer } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { testHook } from './dbg.js';
import { AppAPI } from './appapi.js';
import { uploadImage } from './upload.js';
import { ubbImText } from './ubbtext.js';
import { mountEmotButton, ensureEmotionMap, insertAtCursor } from './emoticon.js';
import { openImageViewer } from './imgview.js';
import { buildInputBar, buildQuoteChip } from './inputbar.js';
import { openSharePanel } from './sharepanel.js';
import { commentItemOf } from './commentkit.js'; // 条目构建单源（0.9.133 自本文件下沉）
import { relDrawerSync, relDrawerClose } from './reldrawer.js'; // 相关推荐 tab 两 seam（0.9.167）
// imdrawer→本模块（syncCommentVars）为单向回指（0.9.114 断 imshare→imdrawer 后不再成环）；
// 本模块→sharepanel（原 imshare 面板族）侧均为函数、调用期才解引用，模块求值期无依赖


// ---------- 评论抽屉 ----------
// A 站通用评论系统：小视频 sourceType=5（sourceId=meowId），普通视频 sourceType=3（sourceId=ac号），
// 无需登录即可浏览；接口在 CFG.api.comment
// UBB 渲染在 ubb.js、表情服务/面板在 emoticon.js（0.9.36 拆分，本文件回归抽屉编排）；
// 评论条目构建/楼中楼展开于 0.9.133 下沉 commentkit.js（本文件只留管线：状态/宿主/输入条/
// 点击委托/乐观插入/翻页——条目渲染一律经 commentItemOf(c, subMap, cmtOpts()) 单源出口）
// **翻页口径（0.9.140 实报「视频评论加载不全」修正）**：根评论分页**只认 page/totalPage**
// （pc-direct/comment/list 实测——2026-10-04 内置浏览器登录态抓包：38 页 2221 条的样本，
// **每一页都回 `pcursor:"no_more"`**，连页 1 也是；带 page=N 请求有效、页 38 有货、页 39 空壳）。
// 旧实现把 `pcursor !== 'no_more'` 当附加闸门 ⇒ 恒假 ⇒ 「加载更多评论」按钮/触底翻页**永不触发**，
// 全部视频都卡在首页（~40 根），正是实报现象。pcursor 只对 **comment/sublist（楼中楼）** 有意义，
// 那条链在 commentkit.expandSubComments 里按 pcursor 翻，勿与根评论口径混用。
// **翻页触发（0.9.141 实报改）**：按钮撤除，改「哨兵 + IntersectionObserver」自动续页（三宿主
// 通用，机制与缘由见下方 armMoreSentinel 块注）
// loadedSourceId：**首屏成功**的源 id 账本（0.9.193）——applyDrawerContent 的重开判据用它，
//  修「失败后 tip 节点占了 !children.length 的坑 ⇒ 同一视频重开不重拉」
// failPage：追加失败停在的页号（0=无）。>0 时 canLoadMore() 判假——防触底哨兵在视口内
//  反复自动重试成请求风暴；点尾行「重试」清闸
export var commentState = { sourceId: 0, stype: 5, shareUrl: '', page: 1, totalPage: 1, loading: false, replyTo: null, kind: 'sv', loadedSourceId: 0, failPage: 0 };

// 评论管线 DOM 宿主（0.9.96 动态详情面板）：null = 经典抽屉（commentDrawer）。管线全经
// curHost() 取宿主——与 commentState 数据单例配对；claimDrawer('comments') 同槽互斥保证
// 一次只有一个宿主在消费（面板与抽屉互斥开，openCommentsHost 里显式关抽屉）
var host = null;
function curHost() { return host || commentDrawer; }

export function isOpenComments() {
  return !!(commentDrawer && commentDrawer.el.classList.contains('open'));
}

// 抽屉避让变量与模式：--acsv-dw 抽屉实际宽（CSS 里抽屉宽/底栏收窄/侧栏平移/顶栏收窄全用它），
// --acsv-cscale 视频画面缩放比。剩余空间不足（< avoidMin）时放弃避让改纯覆盖：
// 不加 acsv-with-comments，视频原尺寸继续播，抽屉近乎全遮（背景本就 96% 不透明），关闭即恢复。
// open/mount 各算一次，resize 持续重算——开着抽屉拉窗口会在两种模式间自动切换
export function syncCommentVars() {
  if (!root) return;
  var vw = window.innerWidth;
  var dw = Math.min(CFG.comments.drawerW, vw * CFG.comments.drawerMaxWp);
  var ratio = (vw - dw) / vw;
  root.style.setProperty('--acsv-dw', dw + 'px');
  root.style.setProperty('--acsv-cscale', String(Math.max(CFG.comments.scaleMin, ratio)));
  // 避让根类由槽位统一裁决（任一抽屉占槽即避让；两抽屉同宽同锚点，同一时刻只开一个）
  root.classList.toggle('acsv-with-comments', !!currentDrawer() && ratio >= CFG.comments.avoidMin);
}
window.addEventListener('resize', syncCommentVars);

export function closeComments() {
  if (commentDrawer) commentDrawer.el.classList.remove('open');
  relDrawerClose(); // 非评论页签一律复位到评论（0.9.178 起含「列表」；面板宿主无 relList，内部自防）
  releaseDrawer('comments');
  overlayClose('comments'); // 已出栈（Esc 路径）时空转；显式关闭路径由此同步栈
  if (root) syncCommentVars(); // 根类统一由 syncCommentVars 收拾（覆盖模式下可能本就没加）
}

// 抽屉接线自附（0.9.118）：slide 只建空壳+注册句柄（setCommentDrawer），关闭键与列表委托由
// 本模块首次打开时自绑——slide 不再 import 本模块（原 slide→comments 边=buildDrawer 里那两行
// 接线，接线自附后边死）。标记打在抽屉对象上：重挂载=新抽屉各自绑；监听器随 DOM 拆除免解绑
function ensureDrawerWired() {
  var d = commentDrawer;
  if (!d || d._acsvWired) return;
  d._acsvWired = true;
  var dclose = d.el.querySelector('.acsv-drawer-close');
  if (dclose) dclose.addEventListener('click', closeComments);
  if (d.list) d.list.addEventListener('click', commentListClick);
}

export function openComments(sourceId, stype, shareUrl, kind, title) {
  if (!commentDrawer || !sourceId) return;
  ensureDrawerWired(); // 0.9.118：首次打开时自附关闭键/列表委托（边 slide→comments 已收）
  // 面板/行内宿主先显式收（0.9.105：面板不再占抽屉槽，互斥改**双向显式收**——私有信抽屉
  // 场景：面板与 IM 抽屉共存（避让由 CSS 根类做），抽屉 vs 面板仍是互斥的两面宿主）
  if (host) { var hPrev = host; host = null; try { hPrev.close(); } catch (e) { } }
  host = null; // 抽屉路径：管线宿主回到经典抽屉（面板路径见 openCommentsHost）
  // overlayOpen 必须先于 claimDrawer（0.9.64 顺序回归修复）：其内部幂等收旧层会调
  // closeComments 清槽+摘避让根类（其内 relDrawerClose 会把任何非评论页签复位到评论，0.9.178）——若槽先占后清，末尾 syncCommentVars 读到空槽会把
  // 根类摘掉（抽屉开着下滑切评论源 → 新视频按无抽屉渲染被覆盖，真机复现实锤）
  overlayOpen({ id: 'comments', close: closeComments }); // 非模态层：不拦导航键，Esc 接栈
  claimDrawer('comments', closeComments); // 占槽：私信抽屉开着则自动收回，再展开评论
  commentDrawer.el.classList.add('open');
  if (root) syncCommentVars(); // isOpenComments 此时已为真：空间够则加避让根类，不够则纯覆盖
  applyDrawerContent(sourceId, stype, shareUrl, kind, title);
}

// 抽屉内容重定向（0.9.178 抽；**不碰浮层栈/槽位**）：换视频时抽屉跟着换源，但**不重开浮层**——
// 旧实现每步都走 openComments，overlayOpen 幂等收旧层 ⇒ closeComments ⇒ relDrawerClose 把
// 页签复位回评论（用户实报「点相关推荐往下刷，页签被切回评论」）。抽屉已开时改走本缝。
export function retargetComments(sourceId, stype, shareUrl, kind, title) {
  if (!commentDrawer || !commentDrawer.el.classList.contains('open')) {
    openComments(sourceId, stype, shareUrl, kind, title); // 没开就当普通打开（含浮层登记）
    return;
  }
  if (!sourceId) return;
  ensureDrawerWired();
  applyDrawerContent(sourceId, stype, shareUrl, kind, title);
}

// 抽屉内容装配（openComments 与 retargetComments 共用；调用前须保证抽屉已 open、槽已占）
function applyDrawerContent(sourceId, stype, shareUrl, kind, title) {
  commentState.stype = Number(stype) || 5;
  commentState.kind = kind === 'home' ? 'home' : 'sv';
  commentState.shareUrl = shareUrl || (CFG.api.shareBase + sourceId);
  ensureCommentInput();
  // 小视频模式纯浏览：不提供任何评论交互
  if (inputBar) inputBar.style.display = commentState.kind === 'home' ? 'flex' : 'none';
  // 相关推荐 tab（0.9.167）：按 kind 显形 tab、换视频刷新候选池；title 供锚位行「播放中」
  //（title 由调用方带出——setActive/toggleItemComments 手里都有 item，openComments 签名加宽）
  relDrawerSync(sourceId, commentState.kind, title || '');
  if (commentState.sourceId !== sourceId) {
    setReply(null); // 换视频清掉未发送的回复目标
    loadComments(sourceId, 1, false);
  } else if (commentState.loadedSourceId !== sourceId) {
    // 首屏未曾成功（失败态/tip 占位）→ 重开时重拉（0.9.193；旧判据 !list.children.length 被
    // tip 节点占了坑，同视频重开不重拉，用户只能切走再切回）
    loadComments(sourceId, 1, false);
  }
}

// 换条评论跟随（0.9.209 批②收口）：竖刷 setActive 与播放层 swap 同型的「抽屉开着就跟到
// 新视频」出口——判开、同源跳过、重定向三步收此单源（此前两处各写各的判定）。重定向走
// retarget 缝不重开浮层（0.9.178 纪律：重开会触发 closeComments ⇒ 页签被打回评论）。
// 注：同源跳过取竖刷侧判据（sourceId 相同即返回）；层内 swap 恒为新条目，旧层内无判据的
// 路径仅在 ↑ 历史回退撞同源时可达，其「首屏失败重拉」补拉由重开抽屉路径承担（0.9.193 口径）
export function followComments(item) {
  if (!item || !item.id || !isOpenComments()) return;
  if (commentState.sourceId === item.id) return;
  retargetComments(item.id, item.stype, item.shareUrl, item.kind, item.title);
}

// 右栏按钮与 C 键共用：同一条目开着就收起，否则展开该条目的评论
export function toggleItemComments(item) {
  if (isOpenComments() && commentState.sourceId === item.id) closeComments();
  else openComments(item.id, item.stype, item.shareUrl, item.kind, item.title);
}

// 在自定义宿主里跑评论管线（0.9.96 动态详情面板）：h = { el, title, list, close, pin?, titleFmt? }。
// titleFmt(n) 可选：计数标题文案定制（0.9.103，面板传「共 N 条评论」）；缺省「评论 N」。
// 面板与抽屉共用 claimDrawer('comments') 槽 + commentState 单例——同 id 槽位重入不互收
// （state.claimDrawer 语义），故抽屉开着须先显式关，防两份宿主互踩；overlay 层由调用方
// 注册（modal 与否是面板自己的事），close 路径里 host 复位见 closeCommentsHost
export function openCommentsHost(h, sourceId, stype, shareUrl, kind) {
  if (commentDrawer && commentDrawer.el.classList.contains('open')) closeComments();
  host = h;
  // 0.9.105：**不占 claimDrawer 槽**——面板/行内宿主不是"抽屉"，占槽会让私信抽屉打开时
  // 整个拆面板（实报「打开私信时详情页被挤掉」的根因）；与评论抽屉的互斥由 openComments
  // 的显式收承担（反向已在此函数首行关闭抽屉）
  commentState.stype = Number(stype) || 5;
  commentState.kind = kind === 'home' ? 'home' : 'sv';
  commentState.shareUrl = shareUrl || '';
  ensureCommentInput();
  if (inputBar) inputBar.style.display = commentState.kind === 'home' ? 'flex' : 'none';
  setReply(null); // 跨宿主残留的回复目标一律清掉
  if (commentState.sourceId !== sourceId || !h.list.querySelector('.acsv-citem')) {
    loadComments(sourceId, 1, false);
  }
}

// 面板关闭时复位管线宿主（宿主 DOM 已随面板拆除，残留引用会让 curHost() 读到死节点）
export function closeCommentsHost() { host = null; }

// 评论计数标题文案（0.9.103）：宿主可选 titleFmt 定制（小红书式详情面板用「共 N 条评论」）；
// 缺省维持「评论 N」——抽屉/行内不传，行为零变化
function titleText(h, n) {
  return h && h.titleFmt ? h.titleFmt(n) : '评论 ' + fmt(n);
}

// 清空评论列表（宿主感知）：面板宿主的正文 pin（h.pin，.acsv-cpin）由宿主持有，
// 管线清列表必须重挂——否则 loadComments 一跑把动态正文冲掉
function resetList(h) {
  h.list.innerHTML = '';
  if (h.pin) h.list.appendChild(h.pin);
}

function loadComments(sourceId, page, append) {
  var h = curHost();
  if (!h) return;
  commentState.loading = true;
  commentState.sourceId = sourceId;
  var reqId = sourceId; // 换视频后旧响应一律丢弃，防止评论串台/分页游标被污染
  if (!append) {
    commentState.failPage = 0;
    resetList(h); // 首屏/换源：清空整个列表（含任何尾行）
    h.list.appendChild(spinner(true));
  } else {
    clearMoreRow(h);                        // 重试/续拉前先摘旧尾行
    h.list.appendChild(moreRow('loading')); // 触底在途指示（0.9.193）
  }
  var p = window.__ACSV_MOCK__ ? Promise.resolve(mockComments()) :
    request(CFG.api.comment + sourceId + '&sourceType=' + commentState.stype + '&page=' + page +
      '&pivotCommentId=0&newPivotCommentId=&showHotComments=1', 'GET');
  Promise.all([p, ensureEmotionMap()]).then(function (res) {
    if (reqId !== commentState.sourceId) return; // 响应返回前已切到其他视频
    var j = res[0];
    commentState.loading = false;
    commentState.failPage = 0;
    var list = (j && j.rootComments) || [];
    commentState.page = (j && j.curPage) || page;
    commentState.totalPage = (j && j.totalPage) || 1;
    // 越界空页=到底（防"按钮点了没反应"式空转；正常到底由 page===totalPage 收口）
    if (append && !list.length) commentState.totalPage = commentState.page;
    commentState.count = (j && j.commentCount != null) ? j.commentCount : list.length;
    if (!append) commentState.loadedSourceId = sourceId; // 首屏成功：落账本（重开判据用）
    renderComments(list, append, j && j.subCommentsMap, (j && j.hotComments) || []);
  }, function () {
    if (reqId !== commentState.sourceId) return;
    commentState.loading = false;
    if (append) {
      // 追加失败（0.9.193 病灶修复）：**不动已渲染列表**，末尾挂可点重试行。
      // 旧实现不分 append/首屏一律 renderCommentTip ⇒ 清空整列表 + 不可点的「请重试」，
      // 一次翻页抖动就毁掉整段已读评论。
      commentState.failPage = page; // 闸门：哨兵不再自动续拉，等用户点重试
      clearMoreRow(h);
      h.list.appendChild(moreRow('fail', sourceId, page));
    } else {
      commentState.loadedSourceId = 0; // 首屏未成：账本归零 ⇒ 重开能重拉
      renderCommentTip(h, '评论加载失败', function () { loadComments(sourceId, 1, false); });
    }
  });
}

// （0.9.133 下沉）normalizeSubs / glyph / commentItem / expandSubComments → commentkit.js：
// 全项目评论条目构建单源（view-follow 68 / detail-open 38 断言钉着类名与 DOM）；本文件经
// commentItemOf(c, subMap, cmtOpts()) 消费——kit 无状态，mode/sourceId/stype 由 cmtOpts 注入

// 评论点赞（乐观更新 + 失败回滚）；like._c/_n 由 commentItem 挂上
function toggleCommentLike(like) {
  var c = like._c;
  if (!c || c.likeBusy) return;
  var on = !(c.isLiked || c.isLike || c.localLike); // 三读（0.9.134 实锤：列表真机字段为 isLiked）
  c.likeBusy = true;
  c.localLike = on;
  like.classList.toggle('on', on);
  like._g.textContent = on ? GLYPHS.feedLikeFill : GLYPHS.feedLike; // 点亮切实心字形
  like._n.textContent = fmt((c.likeCount || 0) + (on ? 1 : 0));
  AppAPI.commentLike(commentState.sourceId, commentState.stype, c.commentId, on)
    .then(function (ok) {
      c.likeBusy = false;
      if (ok) return;
      c.localLike = !on; // 失败回滚
      like.classList.toggle('on', !on);
      // 恢复切换前状态的字形（on 是本次切换的目标态，故与乐观分支取值相反）
      like._g.textContent = on ? GLYPHS.feedLike : GLYPHS.feedLikeFill;
      like._n.textContent = fmt(c.likeCount || 0);
      errNotLogin();
    });
}

// ---- 评论配图大图查看器：0.9.41 迁出为 imgview.js（评论/私信共用），此处只消费 ----

// 评论列表点击统一委托：挂一次在宿主 list 上，接管所有楼层的点赞/回复/配图大图。
// 挂载点（0.9.118 起）：经典抽屉=openComments 自附（ensureDrawerWired）；行内/面板宿主
// 由 followview/momentdetail 各自挂（宿主自洽，不变）
export function commentListClick(ev) {
  var like = ev.target.closest('.acsv-clike');
  if (like && like._c) {
    // 与旧逐条绑定一致：stopPropagation，不惊动 document 级的外点关闭逻辑
    ev.stopPropagation();
    toggleCommentLike(like);
    return;
  }
  var rb = ev.target.closest('.acsv-creplybtn');
  if (rb && rb._target) {
    ev.stopPropagation();
    setReply(rb._target);
    if (inputBar) {
      var inp = inputBar.querySelector('.acsv-cinput-text');
      if (inp) inp.focus();
    }
    return;
  }
  // 转发到私信：弹层挂抽屉根（meta 行在滚动列表内会被裁剪），文本按官方动态转发格式
  // 拼「@作者：内容」+ 作品链接（parseShare 契约：标题行\nURL，两端出分享卡）。
  // URL 带 #ncid= 评论锚点（A 站落地页原生定位楼层）；cmt 载荷携原始 UBB（extra 通道
  // 发送，接收端渲染真表情）
  var fw = ev.target.closest('.acsv-cfwdbtn');
  if (fw && fw._target && curHost()) {
    ev.stopPropagation();
    var t = fw._target;
    openSharePanel(fw, {
      title: commentShareWire(t.name, ubbImText(t.content)),
      shareUrl: commentState.shareUrl + '#ncid=' + t.id,
      cmt: { ncid: t.id, content: t.content }
    }, {
      host: curHost().el,
      popClass: 'acsv-sharepop-drawer',
      headText: '转发这条评论'
    });
    return;
  }
  var pic = ev.target.closest('.ubb-imgc');
  if (pic) {
    // 划选文字收尾在图片上不弹大图（选区非折叠 = 在复制文字）
    var sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.isCollapsed) {
      ev.stopPropagation();
      openImageViewer(pic.getAttribute('src') || '');
    }
  }
}

// （0.9.133 下沉）expandSubComments → commentkit.js（搬迁注见上方条目构建处）

// 评论条目渲染出口（0.9.133 抽离 commentkit 后）：把管线状态注入给无状态 kit（原为 kit 直读全局）
function cmtOpts() {
  return { mode: commentState.kind, sourceId: commentState.sourceId, stype: commentState.stype };
}

// ---- 触底自动加载（0.9.141 实报改）：哨兵 + IntersectionObserver，三宿主通用 ----
// 实报两连（「加载更多评论 ui 自动加载后仍显示，没啥用就删了吧」+「现在的逻辑是滚动到底自动
// 加载吗」）：①**滚动到底自动加载只对经典抽屉成立**——旧实现把 scroll 监听挂在宿主 list 上，
// 但只有抽屉的 .acsv-drawer-list 自己是滚动容器；行内（rowkit，活在被 .acsv-view-body 滚动的
// 视图流里）与详情面板（momentdetail，被面板体滚动）两个宿主的 list **从不滚动** ⇒ 那两个
// 宿主里只有按钮能翻页；②按钮在自动翻页后**残留列表中部**（append 把新条目接在按钮之后，
// 旧按钮没被摘除——正是截图里夹在 #9 与 #8 之间的那枚）。处置：**按钮整体撤除**，改哨兵——
// 挂在当前宿主 list 末尾，进视口（rootMargin 预取）即续翻；IO 天然对任意祖先滚动容器成立
//（含 overflow 裁剪与 transform 位移），无需按宿主换挂，也不再有可残留的按钮。
// 每次渲染后重挂到末尾（新条目要在它之上），并**重新 observe 一次**：IO 只在交叉状态"变化"
// 时回调，短路页（一页装不满视口）重挂后状态未变不会再回调，重 observe 的初始投递负责续翻
// ——canLoadMore 闸门（loading/failPage/page<totalPage）保证收敛，到底即停并出**到底尾行**
// （0.9.193：旧口径"到底静默停"→ 改出「没有更多评论了」，消除"到底了/卡住了"的歧义）。
var moreSentinel = null, moreIO = null;

function canLoadMore() {
  // failPage 闸门（0.9.193）：追加失败后禁止哨兵自动续拉（重试行在列表末尾、往往仍在
  // 视口内，不禁会反复自动重试成请求风暴）；点尾行「重试」清闸
  return !commentState.loading && !commentState.failPage
    && commentState.page < commentState.totalPage && !!curHost();
}

function onSentinel(es) {
  for (var i = 0; i < es.length; i++) {
    if (!es[i].isIntersecting) continue;
    if (canLoadMore()) loadComments(commentState.sourceId, commentState.page + 1, true);
    return;
  }
}

function armMoreSentinel(h) {
  if (!moreSentinel) {
    // 1px 高的占位（零面积目标在 IO 里判不成交叉——勿改 height:0）
    moreSentinel = el('div', 'acsv-cmore-sentinel');
    moreIO = new IntersectionObserver(onSentinel, { rootMargin: '200px' });
  }
  h.list.appendChild(moreSentinel); // 每渲染后重挂末尾（innerHTML 清空/宿主迁移后同路恢复）
  if (!canLoadMore()) return;       // 到底/在途：不 observe，省掉无意义回调
  moreIO.unobserve(moreSentinel);
  moreIO.observe(moreSentinel);     // 初始投递：哨兵已在视口内（短路页）即续翻
}

function renderComments(list, append, subMap, hot) {
  var h = curHost();
  if (!h) return;
  if (!append) resetList(h);
  else clearMoreRow(h); // 追加成功：先摘掉在途的 loading 尾行（0.9.193）
  h.title.textContent = titleText(h, commentState.count);
  if (!list.length && !append) {
    var empty = el('div', 'acsv-drawer-tip', '还没有评论，去原页抢沙发 →');
    var a = el('a', 'acsv-cmore');
    a.href = commentState.shareUrl;
    a.target = '_blank';
    a.textContent = '前往原页';
    empty.appendChild(document.createElement('br'));
    empty.appendChild(a);
    h.list.appendChild(empty);
    return;
  }
  var seen = {};
  function push(c) {
    if (seen[c.commentId]) return;
    seen[c.commentId] = 1;
    h.list.appendChild(commentItemOf(c, subMap, cmtOpts()));
  }
  // 热门评论置顶（网页版同款排序语义：hotComments + 最新流）
  if (!append && hot && hot.length) {
    h.list.appendChild(el('div', 'acsv-hot-head', '热门评论'));
    hot.forEach(push);
    h.list.appendChild(el('div', 'acsv-hot-divider', '最新评论'));
  }
  list.forEach(push);
  // 到底提示（0.9.193）：无更多可拉时给一行，消除「到底了还是卡住了」的歧义；
  // 追加失败时由尾行「重试」代表当前状态，不重复出到底行
  if (!commentState.failPage && commentState.page >= commentState.totalPage) {
    h.list.appendChild(moreRow('end'));
  }
  armMoreSentinel(h); // 列表末尾挂触底哨兵（有下一页才有效；0.9.141 取代「加载更多评论」按钮）
}

function renderCommentTip(h, text, onRetry) {
  if (!h) return;
  resetList(h);
  var tip = el('div', 'acsv-drawer-tip', text);
  if (onRetry) {
    var rt = el('a', 'acsv-ctail-rt', '重试');
    rt.addEventListener('click', function (ev) {
      ev.stopPropagation();
      tip.remove();
      onRetry();
    });
    tip.appendChild(rt);
  }
  h.list.appendChild(tip);
}

// 列表尾行三态（0.9.193）：loading 触底在途 / fail 追加失败可重试 / end 已到底。
// 复用 .acsv-drawer-tip 家族（新紧凑样式 .acsv-ctail）；重试点击直绑（行每次重建，无需委托）
function clearMoreRow(h) {
  if (!h) return;
  var r = h.list.querySelector('.acsv-ctail');
  if (r) r.remove();
}
function moreRow(kind, sourceId, page) {
  var row = el('div', 'acsv-ctail');
  if (kind === 'loading') {
    row.appendChild(el('span', 'acsv-ctail-sp'));
    row.appendChild(el('span', null, '加载中…'));
  } else if (kind === 'fail') {
    row.appendChild(el('span', null, '评论加载失败'));
    var rt = el('a', 'acsv-ctail-rt', '重试');
    rt.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var h = curHost();
      if (!h) return;
      commentState.failPage = 0; // 清闸
      clearMoreRow(h);
      loadComments(sourceId, page, true);
    });
    row.appendChild(rt);
  } else {
    row.appendChild(el('span', null, '没有更多评论了'));
  }
  return row;
}

// ---- 评论输入条（复用动态广场 editor/postComment 模块思路）----
// 常驻宿主底部；支持发评论、回复评论（replyToCommentId=根评论）、回复楼中楼（=子评论）
var inputBar = null;
var replyChip = null; // 回复提示条（inputbar.buildQuoteChip 共用工厂，私信引用 chip 同款）：{box, label}
var emotPanelEl = null; // 表情面板容器（emoticon.mountEmotButton 消费）
// （0.9.141 撤除）scrollList/scrollFn：按宿主 list 挂 scroll 的触底翻页——只有抽屉的 list 是
// 滚动容器，行内/面板宿主恒挂错，已由上面的哨兵 + IO 取代（退役登记，勿再加回）

function setReply(target) {
  commentState.replyTo = target || null;
  if (!inputBar) return;
  var inp = inputBar.querySelector('.acsv-cinput-text');
  if (commentState.replyTo) {
    replyChip.box.style.display = 'flex';
    replyChip.label.textContent = '回复：@' + commentState.replyTo.name;
    inp.placeholder = '回复 @' + commentState.replyTo.name + '…';
  } else {
    replyChip.box.style.display = 'none';
    inp.placeholder = '评论一时爽，一直评论一直爽。';
  }
}

function sendCurrent() {
  var inp = inputBar.querySelector('.acsv-cinput-text');
  var send = inputBar.querySelector('.acsv-cinput-send');
  var text = (inp.value || '').trim();
  if (!text || inputBar._busy) return;
  inputBar._busy = true;
  send.textContent = '发送中…';
  var replyTo = commentState.replyTo;
  var forId = commentState.sourceId;
  AppAPI.postComment(commentState.sourceId, commentState.stype, text, replyTo ? replyTo.id : 0)
    .then(function (r) {
      inputBar._busy = false;
      send.textContent = '发送';
      if (!r || !r.ok) {
        errSend('', r);
        return;
      }
      toast(replyTo ? '回复成功' : '评论成功');
      inp.value = '';
      if (inputBar._fit) inputBar._fit();
      setReply(null);
      if (forId !== commentState.sourceId) return; // 发送期间已切视频
      if (insertLocalComment(r.comment, !!replyTo)) return; // 根评论乐观上屏，滚动位置不丢
      loadComments(commentState.sourceId, 1, false); // 回复楼中楼/无回显数据：退回整页刷新
    });
}

// 发评论成功后的乐观上屏：根评论且有服务端回显时插到「最新」段首。
// 返回 false 表示无法本地插入（回复进楼中楼 / 缺回显数据），调用方退回整页重拉
function insertLocalComment(c, isReply) {
  var h = curHost();
  if (!h || isReply || !c || !c.commentId) return false;
  var list = h.list;
  var tip = list.querySelector('.acsv-drawer-tip');
  if (tip) tip.remove(); // 清掉“还没有评论…”空提示
  var node = commentItemOf(c, null, cmtOpts());
  var divider = list.querySelector('.acsv-hot-divider');
  if (divider) divider.insertAdjacentElement('afterend', node);
  // 面板宿主的正文 pin 占列表首位：新评论插 pin 之后，不能盖住正文
  else if (h.pin && h.pin.parentNode === list) list.insertBefore(node, h.pin.nextSibling);
  else list.insertBefore(node, list.firstChild);
  commentState.count++;
  h.title.textContent = titleText(h, commentState.count);
  return true;
}

function ensureCommentInput() {
  var h = curHost();
  if (!h) return inputBar;
  if (!inputBar) {
    // 回复提示条（私信引用 chip 同款，输入条上方独立一行）：label 提目标、× 取消，
    // 文案与 placeholder 联动收敛在 setReply
    replyChip = buildQuoteChip(function () { setReply(null); }, '取消回复');
    // 输入栏 DOM/行为收敛在 inputbar.buildInputBar（评论/私信共用）：这里只注入差异语义——
    // 图片按钮走「上传→插配图代码」、长度 1000（配图代码含完整签名 URL 450+ 字符，
    // 限 233 会把输入框锁死到打不了字）
    var bar = buildInputBar({
      img: {
        title: '插入图片',
        onFile: function (f) {
          if (f.size > CFG.comments.imgMax) { errImgTooBig(Math.round(CFG.comments.imgMax / 1024 / 1024)); return; }
          bar.imgBtn.textContent = '上传中';
          uploadImage(f).then(function (url) {
            bar.imgBtn.innerHTML = ICONS.image;
            if (!url) { toast('图片上传失败（需登录）'); return; }
            toast('图片上传成功');
            insertAtCursor(bar.input, '[img=图片]' + url + '[/img]');
          });
        }
      },
      placeholder: '评论一时爽，一直评论一直爽。(˶‾᷄ ⁻̫ ‾᷅˵)',
      maxLength: 1000,
      onSend: sendCurrent
    });
    inputBar = bar.box;
    inputBar.imgBtn = bar.imgBtn;
    inputBar._fit = bar.fitHeight; // sendCurrent 清空后收回高度（既有约定）
    var inp = bar.input;
    emotPanelEl = el('div', 'acsv-emotpanel');
    // 表情面板三件套（toggle+懒加载+光标插入）抽进了 emoticon.mountEmotButton，评论/私信共用
    mountEmotButton(bar.emotBtn, emotPanelEl, inp);
  }
  // 宿主迁移（0.9.96 面板↔抽屉互斥开，输入条三件套同一时刻只在一个宿主里）：append 即搬移。
  // 触底翻页不再随宿主换挂监听（0.9.141 起哨兵随 list 走，见 armMoreSentinel）
  if (inputBar._host !== h) {
    h.el.appendChild(emotPanelEl);
    h.el.appendChild(replyChip.box);
    h.el.appendChild(inputBar);
    inputBar._host = h;
  }
  return inputBar;
}

function mockComments() {
  // 本地 harness 用示例数据（真实环境走通用评论接口）；m3/m4 演示 UBB 渲染：
  // [color] 着色与划选复制、[img] 配图与点击看大图（URL 须过 IMG_CDN_OK 白名单）
  return {
    commentCount: 4, curPage: 1, totalPage: 1, // pcursor 已退役（0.9.140：根评论翻页只认 page/totalPage）
    rootComments: [
      // m1 带**头像框**（0.9.190）：给 harness 一条能验「框不被裁」的真实路径——缩略图走
      // frameUrlOf（avatarFrameImgInfo.thumbnailImageCdnUrl）；1×1 透明 GIF，仅要几何不要像素
      { commentId: 'm1', userId: 123, userName: '香蕉君', headUrl: '',
        avatarFrameImgInfo: { thumbnailImageCdnUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' },
        content: '这条视频太棒了（示例评论，仅本地预览显示）', postDate: '2026-09-01', likeCount: 233, isUp: false, subCommentCount: 1 },
      { commentId: 'm2', userId: 456, userName: 'UP主本人', headUrl: '', content: '感谢收看！', postDate: '2026-09-02', likeCount: 66, isUp: true, subCommentCount: 0 },
      { commentId: 'm3', userId: 777, userName: '富文本示例', headUrl: '', content: '[color=#4f81bd]这条评论用 [color] 标签着了色，\n换行也保留；正文现在可以划选后右键复制。[/color]\n这段是着色范围外的普通文字。', postDate: '2026-09-03', likeCount: 12, isUp: false, subCommentCount: 0 },
      { commentId: 'm4', userId: 888, userName: '配图示例', headUrl: '', content: '带配图的评论，点击图片可看大图：\n[img=图片]https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/ac2/1.gif[/img]', postDate: '2026-09-04', likeCount: 5, isUp: false, subCommentCount: 0 }
    ],
    subCommentsMap: { m1: [{ commentId: 'm1-1', userId: 789, userName: '路人甲', headUrl: '', content: '前排！', postDate: '2026-09-01', likeCount: 3, subCommentCount: 0 }] }
  };
}

// debug 构建测试钩子：harness 断言评论抽屉当前源与开合态（播放层键盘 c 打的是层内那条，
// 不是竖刷当前条——0.9.74）
testHook('comments', function () {
  return {
    sourceId: commentState.sourceId, stype: commentState.stype,
    kind: commentState.kind, open: isOpenComments()
  };
});
