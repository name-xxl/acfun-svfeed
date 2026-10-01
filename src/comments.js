import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, fmt, toast } from './ui.js';
import { ICONS } from './styles.js';
import { GLYPHS } from './imicons.js';
import { commentShareWire } from './immsg.js';
import { root, commentDrawer, claimDrawer, releaseDrawer, currentDrawer } from './state.js';
import { AppAPI } from './appapi.js';
import { uploadImage } from './upload.js';
import { renderCommentHtml, ubbImText } from './ubb.js';
import { mountEmotButton, ensureEmotionMap, insertAtCursor } from './emoticon.js';
import { openImageViewer } from './imgview.js';
import { buildInputBar, buildQuoteChip } from './inputbar.js';
import { openSharePanel } from './imshare.js';
// 经 imshare→imdrawer 回指本模块（syncCommentVars）成环：两侧都是函数、调用期才解引用，
// 与 attach.js 记录的 feedstore↔player 循环同款先例，模块求值期无依赖


// ---------- 评论抽屉 ----------
// A 站通用评论系统：小视频 sourceType=5（sourceId=meowId），普通视频 sourceType=3（sourceId=ac号），
// 无需登录即可浏览；接口在 CFG.api.comment
// UBB 渲染在 ubb.js、表情服务/面板在 emoticon.js（0.9.36 拆分，本文件回归抽屉编排）
export var commentState = { sourceId: 0, stype: 5, shareUrl: '', page: 1, totalPage: 1, pcursor: 'no_more', loading: false, replyTo: null, kind: 'sv' };

export function isOpenComments() {
  return !!(commentDrawer && commentDrawer.el.classList.contains('open'));
}

// 抽屉避让变量与模式：--acsv-dw 抽屉实际宽（CSS 里抽屉宽/底栏收窄/侧栏顶栏平移全用它），
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
  releaseDrawer('comments');
  if (root) syncCommentVars(); // 根类统一由 syncCommentVars 收拾（覆盖模式下可能本就没加）
}

export function openComments(sourceId, stype, shareUrl, kind) {
  if (!commentDrawer || !sourceId) return;
  claimDrawer('comments', closeComments); // 占槽：私信抽屉开着则自动收回，再展开评论
  commentDrawer.el.classList.add('open');
  if (root) syncCommentVars(); // isOpenComments 此时已为真：空间够则加避让根类，不够则纯覆盖
  commentState.stype = Number(stype) || 5;
  commentState.kind = kind === 'home' ? 'home' : 'sv';
  commentState.shareUrl = shareUrl || (CFG.api.shareBase + sourceId);
  ensureCommentInput();
  // 小视频模式纯浏览：不提供任何评论交互
  if (inputBar) inputBar.style.display = commentState.kind === 'home' ? 'flex' : 'none';
  if (commentState.sourceId !== sourceId) {
    setReply(null); // 换视频清掉未发送的回复目标
    loadComments(sourceId, 1, false);
  } else if (!commentDrawer.list.children.length) {
    loadComments(sourceId, 1, false);
  }
}

// 右栏按钮与 C 键共用：同一条目开着就收起，否则展开该条目的评论
export function toggleItemComments(item) {
  if (isOpenComments() && commentState.sourceId === item.id) closeComments();
  else openComments(item.id, item.stype, item.shareUrl, item.kind);
}

function loadComments(sourceId, page, append) {
  if (!commentDrawer) return;
  commentState.loading = true;
  commentState.sourceId = sourceId;
  var reqId = sourceId; // 换视频后旧响应一律丢弃，防止评论串台/分页游标被污染
  if (!append) {
    commentDrawer.list.innerHTML = '';
    commentDrawer.list.appendChild(el('div', 'acsv-spinner',
      null)).style.cssText = 'position:static;margin:40px auto;display:block';
  }
  var p = window.__ACSV_MOCK__ ? Promise.resolve(mockComments()) :
    request(CFG.api.comment + sourceId + '&sourceType=' + commentState.stype + '&page=' + page +
      '&pivotCommentId=0&newPivotCommentId=&showHotComments=1', 'GET');
  Promise.all([p, ensureEmotionMap()]).then(function (res) {
    if (reqId !== commentState.sourceId) return; // 响应返回前已切到其他视频
    var j = res[0];
    commentState.loading = false;
    var list = (j && j.rootComments) || [];
    commentState.page = (j && j.curPage) || page;
    commentState.totalPage = (j && j.totalPage) || 1;
    commentState.pcursor = (j && j.pcursor) || 'no_more';
    commentState.count = (j && j.commentCount != null) ? j.commentCount : list.length;
    renderComments(list, append, j && j.subCommentsMap, (j && j.hotComments) || []);
  }, function () {
    if (reqId !== commentState.sourceId) return;
    commentState.loading = false;
    renderCommentTip('评论加载失败，请重试');
  });
}

function normalizeSubs(subMap, cid) {
  if (!subMap) return [];
  var v = subMap[String(cid)] || subMap[cid];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.subComments) return v.subComments;
  return [];
}

// 原生 iconfont 字形图标（imicons.GLYPHS 登记表消费；el() 即 textContent，码点直写）
function glyph(codepoint) {
  return el('i', 'acsvg-glyph', codepoint);
}

function commentItem(c, subMap, sourceId) {
  var item = el('div', 'acsv-citem');
  // 头像 + 昵称可点击进入用户主页
  var homeUrl = c.userId ? CFG.api.userBase + c.userId : null;
  var avLink = el('a', 'acsv-avlink');
  if (homeUrl) { avLink.href = homeUrl; avLink.target = '_blank'; avLink.title = '访问 ' + (c.userName || '') + ' 的空间'; }
  var av = el('img', 'av');
  av.referrerPolicy = 'no-referrer';
  // headUrl 可能是字符串或 [{cdn,url}] 数组
  var hu = c.headUrl;
  if (Array.isArray(hu)) hu = (hu[0] && hu[0].url) || '';
  else if (hu && typeof hu === 'object') hu = hu.url || '';
  av.src = (typeof hu === 'string' && hu ? hu : CFG.api.defaultAvatar).split('?')[0];
  avLink.appendChild(av);
  var body = el('div', 'acsv-cbody');
  var name = el('div', 'acsv-cname');
  if (homeUrl) {
    var na = el('a', null, c.userName || 'AcFun用户');
    na.href = homeUrl; na.target = '_blank';
    name.appendChild(na);
  } else {
    name.appendChild(el('span', null, c.userName || 'AcFun用户'));
  }
  if (c.isUp) name.appendChild(el('span', 'up', 'UP'));
  body.appendChild(name);
  var ctext = el('div', 'acsv-ctext');
  ctext.innerHTML = renderCommentHtml(c.content); // 内容先 esc 再 UBB 渲染（renderCommentHtml 内）
  body.appendChild(ctext);
  var meta = el('div', 'acsv-cmeta');
  meta.appendChild(el('span', null, c.postDate || ''));
  var like = null, replyBtn = null;
  // 点赞/回复/转发三键图标统一用动态页互动区同款 iconfont 字形（imicons.GLYPHS.feed*
  // 码点，字体抽屉内自注入）：点亮态切实心字形（feedLikeFill），颜色状态机由容器 color 驱动
  var likeGlyph = function (on) { return glyph(on ? GLYPHS.feedLikeFill : GLYPHS.feedLike); };
  if (commentState.kind === 'home') {
    // 小视频模式纯浏览：点赞/回复仅推荐模式提供。
    // 点击统一委托在 drawer list 上（见 commentListClick），这里只挂数据引用，
    // 免得长列表每条评论两个监听器、innerHTML 重建时反复创建丢弃
    var on0 = !!(c.isLike || c.localLike);
    like = el('span', 'acsv-clike' + (on0 ? ' on' : ''));
    like._g = likeGlyph(on0);
    like.appendChild(like._g);
    var likeN = el('span', null, fmt((c.likeCount || 0) + (c.localLike ? 1 : 0)));
    like.appendChild(likeN);
    like.title = '点赞评论';
    like._c = c;
    like._n = likeN;
    meta.appendChild(like);
    replyBtn = el('span', 'acsv-creplybtn');
    replyBtn.appendChild(glyph(GLYPHS.feedComment));
    replyBtn.appendChild(document.createTextNode('回复'));
    replyBtn._target = { id: String(c.commentId), name: c.userName || 'AcFun用户' };
    meta.appendChild(replyBtn);
    // 转发到私信（0.9.50，官方无此入口）：按钮只挂数据引用，弹层与发送在 commentListClick 委托
    var fwdBtn = el('span', 'acsv-cfwdbtn');
    fwdBtn.appendChild(glyph(GLYPHS.feedRepost));
    fwdBtn.appendChild(document.createTextNode('转发'));
    fwdBtn.title = '转发这条评论到私信';
    fwdBtn._target = { id: String(c.commentId), name: c.userName || 'AcFun用户', content: c.content || '' };
    meta.appendChild(fwdBtn);
  } else {
    like = el('span', 'acsv-clike');
    like.appendChild(likeGlyph(false));
    like.appendChild(el('span', null, fmt(c.likeCount)));
    meta.appendChild(like);
  }
  body.appendChild(meta);
  var subs = normalizeSubs(subMap, c.commentId);
  var subBox = null;
  if (subs.length) {
    subBox = el('div', 'acsv-csub');
    subs.forEach(function (s) { subBox.appendChild(commentItem(s, null, sourceId)); });
    body.appendChild(subBox);
  }
  if ((c.subCommentCount || 0) > subs.length) {
    expandSubComments(body, c, subBox);
  }
  item.appendChild(avLink);
  item.appendChild(body);
  return item;
}

// 评论点赞（乐观更新 + 失败回滚）；like._c/_n 由 commentItem 挂上
function toggleCommentLike(like) {
  var c = like._c;
  if (!c || c.likeBusy) return;
  var on = !(c.isLike || c.localLike);
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
      toast('操作失败（未登录？）');
    });
}

// ---- 评论配图大图查看器：0.9.41 迁出为 imgview.js（评论/私信共用），此处只消费 ----

// 评论列表点击统一委托：挂一次在 drawer list 上，接管所有楼层的点赞/回复/配图大图。
// 挂载点在 slide.js 建抽屉骨架处（dlist.addEventListener('click', commentListClick)）
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
  if (fw && fw._target && commentDrawer) {
    ev.stopPropagation();
    var t = fw._target;
    openSharePanel(fw, {
      title: commentShareWire(t.name, ubbImText(t.content)),
      shareUrl: commentState.shareUrl + '#ncid=' + t.id,
      cmt: { ncid: t.id, content: t.content }
    }, {
      host: commentDrawer.el,
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

// 楼中楼展开：comment/sublist 分页拉取，就地追加渲染（网页版交互）
function expandSubComments(body, c, subBox) {
  var more = el('button', 'acsv-cmore', '展开 ' + c.subCommentCount + ' 条回复');
  var pcursor = '';
  var loaded = subBox ? subBox.querySelectorAll('.acsv-citem').length : 0;
  function appendSubs(arr) {
    if (!arr.length) return;
    if (!subBox) { subBox = el('div', 'acsv-csub'); body.insertBefore(subBox, more); }
    arr.forEach(function (s) { subBox.appendChild(commentItem(s, null, commentState.sourceId)); });
  }
  more.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (more._busy) return;
    more._busy = true;
    more.textContent = '展开中…';
    request(CFG.api.commentSub + '?sourceId=' + commentState.sourceId
      + '&sourceType=' + commentState.stype
      + '&rootCommentId=' + c.commentId + '&pcursor=' + pcursor + '&count=' + CFG.comments.subCount, 'GET')
      .then(function (j) {
        more._busy = false;
        if (!j || j.result !== 0) { more.textContent = '展开失败，点击重试'; return; }
        appendSubs(j.subComments || []);
        loaded += (j.subComments || []).length;
        pcursor = j.pcursor;
        if (!pcursor || pcursor === 'no_more' || loaded >= (c.subCommentCount || 0)) more.remove();
        else more.textContent = '继续展开（剩 ' + ((c.subCommentCount || 0) - loaded) + ' 条）';
      }, function () {
        more._busy = false;
        more.textContent = '展开失败，点击重试';
      });
  });
  body.appendChild(more);
}

function renderComments(list, append, subMap, hot) {
  if (!commentDrawer) return;
  if (!append) commentDrawer.list.innerHTML = '';
  commentDrawer.title.textContent = '评论 ' + fmt(commentState.count);
  if (!list.length && !append) {
    var empty = el('div', 'acsv-drawer-tip', '还没有评论，去原页抢沙发 →');
    var a = el('a', 'acsv-cmore');
    a.href = commentState.shareUrl;
    a.target = '_blank';
    a.textContent = '前往原页';
    empty.appendChild(document.createElement('br'));
    empty.appendChild(a);
    commentDrawer.list.appendChild(empty);
    return;
  }
  var seen = {};
  function push(c) {
    if (seen[c.commentId]) return;
    seen[c.commentId] = 1;
    commentDrawer.list.appendChild(commentItem(c, subMap, commentState.sourceId));
  }
  // 热门评论置顶（网页版同款排序语义：hotComments + 最新流）
  if (!append && hot && hot.length) {
    commentDrawer.list.appendChild(el('div', 'acsv-hot-head', '热门评论'));
    hot.forEach(push);
    commentDrawer.list.appendChild(el('div', 'acsv-hot-divider', '最新评论'));
  }
  list.forEach(push);
  if (commentState.page < commentState.totalPage && commentState.pcursor !== 'no_more') {
    var more = el('button', 'acsv-drawer-more', '加载更多评论');
    more.addEventListener('click', function () {
      more.remove();
      loadComments(commentState.sourceId, commentState.page + 1, true);
    });
    commentDrawer.list.appendChild(more);
  }
}

function renderCommentTip(text) {
  if (!commentDrawer) return;
  commentDrawer.list.innerHTML = '';
  commentDrawer.list.appendChild(el('div', 'acsv-drawer-tip', text));
}

// ---- 评论输入条（复用动态广场 editor/postComment 模块思路）----
// 常驻抽屉底部；支持发评论、回复评论（replyToCommentId=根评论）、回复楼中楼（=子评论）
var inputBar = null;
var replyChip = null; // 回复提示条（inputbar.buildQuoteChip 共用工厂，私信引用 chip 同款）：{box, label}

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
        toast('发送失败' + (r && r.msg ? '：' + r.msg : '（未登录？）'));
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
  if (!commentDrawer || isReply || !c || !c.commentId) return false;
  var list = commentDrawer.list;
  var tip = list.querySelector('.acsv-drawer-tip');
  if (tip) tip.remove(); // 清掉“还没有评论…”空提示
  var node = commentItem(c, null, commentState.sourceId);
  var divider = list.querySelector('.acsv-hot-divider');
  if (divider) divider.insertAdjacentElement('afterend', node);
  else list.insertBefore(node, list.firstChild);
  commentState.count++;
  commentDrawer.title.textContent = '评论 ' + fmt(commentState.count);
  return true;
}

function ensureCommentInput() {
  if (inputBar && inputBar.isConnected) return inputBar;
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
        if (f.size > CFG.comments.imgMax) { toast('图片不能超过 ' + Math.round(CFG.comments.imgMax / 1024 / 1024) + 'MB'); return; }
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
  var panel = el('div', 'acsv-emotpanel');
  commentDrawer.el.appendChild(panel);
  commentDrawer.el.appendChild(replyChip.box); // 输入条上方：回复提示条
  commentDrawer.el.appendChild(inputBar);

  // 评论区无限滚动：接近底部自动加载下一页
  commentDrawer.list.addEventListener('scroll', function () {
    var l = commentDrawer.list;
    if (commentState.loading || commentState.page >= commentState.totalPage
      || commentState.pcursor === 'no_more') return;
    if (l.scrollTop + l.clientHeight >= l.scrollHeight - CFG.comments.scrollPad) {
      loadComments(commentState.sourceId, commentState.page + 1, true);
    }
  }, { passive: true });

  // 表情面板三件套（toggle+懒加载+光标插入）抽进了 emoticon.mountEmotButton，评论/私信共用
  mountEmotButton(bar.emotBtn, panel, inp);
  return inputBar;
}

function mockComments() {
  // 本地 harness 用示例数据（真实环境走通用评论接口）；m3/m4 演示 UBB 渲染：
  // [color] 着色与划选复制、[img] 配图与点击看大图（URL 须过 IMG_CDN_OK 白名单）
  return {
    commentCount: 4, curPage: 1, totalPage: 1, pcursor: 'no_more',
    rootComments: [
      { commentId: 'm1', userId: 123, userName: '香蕉君', headUrl: '', content: '这条视频太棒了（示例评论，仅本地预览显示）', postDate: '2026-09-01', likeCount: 233, isUp: false, subCommentCount: 1 },
      { commentId: 'm2', userId: 456, userName: 'UP主本人', headUrl: '', content: '感谢收看！', postDate: '2026-09-02', likeCount: 66, isUp: true, subCommentCount: 0 },
      { commentId: 'm3', userId: 777, userName: '富文本示例', headUrl: '', content: '[color=#4f81bd]这条评论用 [color] 标签着了色，\n换行也保留；正文现在可以划选后右键复制。[/color]\n这段是着色范围外的普通文字。', postDate: '2026-09-03', likeCount: 12, isUp: false, subCommentCount: 0 },
      { commentId: 'm4', userId: 888, userName: '配图示例', headUrl: '', content: '带配图的评论，点击图片可看大图：\n[img=图片]https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/ac2/1.gif[/img]', postDate: '2026-09-04', likeCount: 5, isUp: false, subCommentCount: 0 }
    ],
    subCommentsMap: { m1: [{ commentId: 'm1-1', userId: 789, userName: '路人甲', headUrl: '', content: '前排！', postDate: '2026-09-01', likeCount: 3, subCommentCount: 0 }] }
  };
}
