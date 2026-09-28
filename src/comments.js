import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, esc, fmt, toast } from './ui.js';
import { ICONS } from './styles.js';
import { root, commentDrawer } from './state.js';
import { AppAPI } from './appapi.js';

// ---------- 评论抽屉 ----------
// A 站通用评论系统：小视频 sourceType=5（sourceId=meowId），普通视频 sourceType=3（sourceId=ac号），
// 无需登录即可浏览；接口在 CFG.api.comment
export var commentState = { sourceId: 0, stype: 5, shareUrl: '', page: 1, totalPage: 1, pcursor: 'no_more', loading: false, replyTo: null, kind: 'sv' };

// 表情包数据（复用动态广场 fetchEmoticonPacks/_applyEmoticons 思路）：
// map[id]={url,big,name,pkg} 供 UBB 渲染；packs=[{name,items}] 供面板分包展示
var EmotionMap = { loaded: false, loading: null, map: {}, packs: [] };

function applyEmotPacks(flat) {
  var map = {};
  var packs = [];
  var byName = {};
  (flat || []).forEach(function (u) {
    if (!u || !u.emotionId || !u.emotionImageUrl) return;
    var big = u.emotionBigUrl || u.emotionImageUrl;
    map[u.emotionId] = { url: u.emotionImageUrl, big: big, name: u.emotionName || '', pkg: u.emotionPkgName || '' };
    var pack = byName[u.emotionPkgName];
    if (!pack) {
      pack = byName[u.emotionPkgName] = { name: u.emotionPkgName || '表情', items: [] };
      packs.push(pack);
    }
    pack.items.push({ id: u.emotionId, url: u.emotionImageUrl, big: big, name: u.emotionName || '' });
  });
  EmotionMap.map = map;
  EmotionMap.packs = packs;
  EmotionMap.loaded = true;
  return packs;
}

function ensureEmotionMap() {
  if (EmotionMap.loaded) return Promise.resolve();
  if (EmotionMap.loading) return EmotionMap.loading;
  EmotionMap.loading = new Promise(function (resolve) {
    // 原生页面写入的 localStorage 缓存优先（www.acfun.cn 登录后存在）
    try {
      var cached = JSON.parse(localStorage.getItem('emoticonList') || 'null');
      if (Array.isArray(cached) && cached.length) { applyEmotPacks(cached); resolve(); return; }
    } catch (e) { }
    request(CFG.api.emotion, 'POST').then(function (j) {
      var flat = [];
      var pkgs = (j && (j.emotionPackageList || j.data)) || [];
      pkgs.forEach(function (p) {
        (p.emotions || []).forEach(function (e) {
          try {
            var url = e.emotionImageSmallUrl
              || (e.smallImageInfo && e.smallImageInfo.thumbnailImageCdnUrl)
              || (e.smallImageInfo && e.smallImageInfo.thumbnailImage && e.smallImageInfo.thumbnailImage.cdnUrls && e.smallImageInfo.thumbnailImage.cdnUrls[0] && e.smallImageInfo.thumbnailImage.cdnUrls[0].url)
              || '';
            var rawBig = (typeof e.emotionImageBigUrl === 'string' && e.emotionImageBigUrl)
              || (e.bigImageInfo && e.bigImageInfo.thumbnailImageCdnUrl)
              || (e.bigImageInfo && e.bigImageInfo.thumbnailImage && e.bigImageInfo.thumbnailImage.cdnUrls && e.bigImageInfo.thumbnailImage.cdnUrls[0] && e.bigImageInfo.thumbnailImage.cdnUrls[0].url)
              || '';
            flat.push({
              emotionId: e.id,
              emotionPkgName: p.name,
              emotionImageUrl: url,
              emotionBigUrl: rawBig || url,
              emotionName: (typeof e.name === 'string' && e.name) || ''
            });
          } catch (err) { }
        });
      });
      applyEmotPacks(flat);
      resolve();
    }, function () {
      EmotionMap.loading = null; // 清掉失败标记，下次进入可重试（否则整场会话表情失效）
      resolve();
    });
  });
  return EmotionMap.loading;
}

var IMG_CDN_OK = /^https?:\/\/[\w.-]+\.(aixifan\.com|acfun\.cn)\//;
function renderCommentHtml(content) {
  var h = esc(content || '');
  // 表情：[emot=acfun,id/] 走映射（值可能是字符串或 {url} 对象）；其他包走 umeditor 固定图床
  h = h.replace(/\[emot=acfun,(\w+)\/\]/g, function (_, id) {
    var em = EmotionMap.map[id];
    var u = em ? (typeof em === 'string' ? em : em.url) : null;
    // 与 [img] 一致过 A 站图床白名单：映射值可能来自页面可写的 localStorage，防属性逃逸
    if (u && IMG_CDN_OK.test(u.replace(/^\/\//, 'https://'))) {
      return '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">';
    }
    return '[表情]';
  });
  h = h.replace(/\[emot=(\w+),(\w+)\/\]/g, function (_, pkg, id) {
    return '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/' + pkg + '/' + id + '.gif" referrerpolicy="no-referrer">';
  });
  // 图片：[img=图片]URL[/img] / [img=alt]URL[/img] / [img]URL[/img]，限 A 站图床白名单
  h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
  });
  h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function (_, u) {
    return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
  });
  return h;
}

export function isOpenComments() {
  return !!(commentDrawer && commentDrawer.el.classList.contains('open'));
}

export function closeComments() {
  if (commentDrawer) commentDrawer.el.classList.remove('open');
  if (root) root.classList.remove('acsv-with-comments');
}

export function openComments(sourceId, stype, shareUrl, kind) {
  if (!commentDrawer || !sourceId) return;
  commentDrawer.el.classList.add('open');
  if (root) {
    root.classList.add('acsv-with-comments');
    // 整体缩放避让：视频区缩到剩余空间，不平移不裁画面
    var dw = Math.min(CFG.comments.drawerW, window.innerWidth * CFG.comments.drawerMaxWp);
    var scale = Math.max(CFG.comments.scaleMin, (window.innerWidth - dw) / window.innerWidth);
    root.style.setProperty('--acsv-cscale', String(scale));
  }
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
    var na = el('a', null, esc(c.userName || 'AcFun用户'));
    na.href = homeUrl; na.target = '_blank';
    name.appendChild(na);
  } else {
    name.appendChild(el('span', null, esc(c.userName || 'AcFun用户')));
  }
  if (c.isUp) name.appendChild(el('span', 'up', 'UP'));
  body.appendChild(name);
  var ctext = el('div', 'acsv-ctext');
  ctext.innerHTML = renderCommentHtml(c.content); // 内容先 esc 再 UBB 渲染（renderCommentHtml 内）
  body.appendChild(ctext);
  var meta = el('div', 'acsv-cmeta');
  meta.appendChild(el('span', null, esc(c.postDate || '')));
  var like = null, replyBtn = null;
  if (commentState.kind === 'home') {
    // 小视频模式纯浏览：点赞/回复仅推荐模式提供。
    // 点击统一委托在 drawer list 上（见 commentListClick），这里只挂数据引用，
    // 免得长列表每条评论两个监听器、innerHTML 重建时反复创建丢弃
    like = el('span', 'acsv-clike' + ((c.isLike || c.localLike) ? ' on' : ''), ICONS.heart);
    var likeN = el('span', null, fmt((c.likeCount || 0) + (c.localLike ? 1 : 0)));
    like.appendChild(likeN);
    like.title = '点赞评论';
    like._c = c;
    like._n = likeN;
    meta.appendChild(like);
    replyBtn = el('span', 'acsv-creplybtn', '回复');
    replyBtn._target = { id: String(c.commentId), name: c.userName || 'AcFun用户' };
    meta.appendChild(replyBtn);
  } else {
    like = el('span', 'acsv-clike', ICONS.heart);
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
  like._n.textContent = fmt((c.likeCount || 0) + (on ? 1 : 0));
  AppAPI.commentLike(commentState.sourceId, commentState.stype, c.commentId, on)
    .then(function (ok) {
      c.likeBusy = false;
      if (ok) return;
      c.localLike = !on; // 失败回滚
      like.classList.toggle('on', !on);
      like._n.textContent = fmt(c.likeCount || 0);
      toast('操作失败（未登录？）');
    });
}

// 评论列表点击统一委托：挂一次在 drawer list 上，接管所有楼层的点赞/回复。
// 挂载点在 player.js 建抽屉骨架处（dlist.addEventListener('click', commentListClick)）
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

function setReply(target) {
  commentState.replyTo = target || null;
  if (!inputBar) return;
  var chip = inputBar.querySelector('.acsv-creply');
  var inp = inputBar.querySelector('.acsv-cinput-text');
  if (commentState.replyTo) {
    chip.style.display = 'inline-flex';
    chip.textContent = '回复 @' + commentState.replyTo.name + ' ✕';
    inp.placeholder = '回复 @' + commentState.replyTo.name + '…';
  } else {
    chip.style.display = 'none';
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
  inputBar = el('div', 'acsv-cinput');
  var chip = el('button', 'acsv-creply');
  chip.style.display = 'none';
  chip.title = '取消回复';
  chip.addEventListener('click', function (ev) {
    ev.stopPropagation();
    setReply(null);
  });
  var emotBtn = el('button', 'acsv-cinput-emot', ICONS.smiley);
  emotBtn.title = '表情';
  var imgBtn = el('button', 'acsv-cinput-img', ICONS.image);
  imgBtn.title = '插入图片';
  var fileInp = el('input');
  fileInp.type = 'file';
  fileInp.accept = 'image/*';
  fileInp.style.display = 'none';
  imgBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    fileInp.click();
  });
  fileInp.addEventListener('change', function () {
    var f = fileInp.files && fileInp.files[0];
    fileInp.value = '';
    if (!f) return;
    if (f.size > CFG.comments.imgMax) { toast('图片不能超过 10MB'); return; }
    imgBtn.textContent = '上传中';
    AppAPI.uploadImage(f).then(function (url) {
      imgBtn.innerHTML = ICONS.image;
      if (!url) { toast('图片上传失败（需登录）'); return; }
      toast('图片上传成功');
      var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
      var code = '[img=图片]' + url + '[/img]';
      inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
      inp.focus();
    });
  });
  var inp = el('textarea', 'acsv-cinput-text');
  inp.rows = 1;
  inp.maxLength = 233;
  inp.placeholder = '评论一时爽，一直评论一直爽。(˶‾᷄ ⁻̫ ‾᷅˵)';
  var send = el('button', 'acsv-cinput-send', '发送');
  var panel = el('div', 'acsv-emotpanel');
  inputBar.appendChild(chip);
  inputBar.appendChild(emotBtn);
  inputBar.appendChild(imgBtn);
  inputBar.appendChild(fileInp);
  inputBar.appendChild(inp);
  inputBar.appendChild(send);
  inputBar.addEventListener('click', function (ev) { ev.stopPropagation(); });
  commentDrawer.el.appendChild(panel);
  commentDrawer.el.appendChild(inputBar);

  // 输入内容自动增高（1~4 行，超出滚动），清空后收回
  function fitHeight() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(Math.max(inp.scrollHeight, 36), 96) + 'px';
  }
  inp.addEventListener('input', fitHeight);

  // 评论区无限滚动：接近底部自动加载下一页
  commentDrawer.list.addEventListener('scroll', function () {
    var l = commentDrawer.list;
    if (commentState.loading || commentState.page >= commentState.totalPage
      || commentState.pcursor === 'no_more') return;
    if (l.scrollTop + l.clientHeight >= l.scrollHeight - CFG.comments.scrollPad) {
      loadComments(commentState.sourceId, commentState.page + 1, true);
    }
  }, { passive: true });

  var panelBuilt = false;
  emotBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    var show = panel.style.display !== 'flex';
    panel.style.display = show ? 'flex' : 'none';
    if (show && !panelBuilt) {
      panelBuilt = true;
      panel.appendChild(el('div', 'acsv-drawer-tip', '表情加载中…'));
      ensureEmotionMap().then(function () { renderPanel(); });
    } else if (show) {
      ensureEmotionMap().then(renderPanel); // 已加载时立即返回；上次失败则顺带重试
    }
  });

  function emotReadRecent() {
    try {
      var ids = JSON.parse(localStorage.getItem('acsv_emot_recent_v1') || '[]');
      if (Array.isArray(ids)) return ids.map(String).filter(Boolean).slice(0, 12);
    } catch (e) { }
    return [];
  }
  function emotPick(id) {
    var ids = emotReadRecent().filter(function (x) { return x !== String(id); });
    ids.unshift(String(id));
    try { localStorage.setItem('acsv_emot_recent_v1', JSON.stringify(ids.slice(0, CFG.comments.recentMax))); } catch (e) { }
  }
  function emotFind(id) {
    var packs = EmotionMap.packs || [];
    for (var i = 0; i < packs.length; i++) {
      for (var k = 0; k < packs[i].items.length; k++) {
        if (String(packs[i].items[k].id) === String(id)) return packs[i].items[k];
      }
    }
    return null;
  }
  function insertAtCursor(code) {
    var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
    inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
    inp.focus();
    try { inp.setSelectionRange(pos + code.length, pos + code.length); } catch (e) { }
  }
  function renderPanel() {
    panel.innerHTML = '';
    var packs = EmotionMap.packs || [];
    if (!packs.length) {
      panel.appendChild(el('div', 'acsv-drawer-tip', '表情加载失败，请重试'));
      return;
    }
    function addEmot(grid, it) {
      var b = el('button', 'acsv-emot-item');
      b.title = it.name || ('[emot=acfun,' + it.id + '/]');
      var img = el('img');
      img.src = it.url;
      img.referrerPolicy = 'no-referrer';
      img.alt = '';
      img.loading = 'lazy';
      b.appendChild(img);
      b.addEventListener('click', function (ev2) {
        ev2.stopPropagation();
        insertAtCursor('[emot=acfun,' + it.id + '/]');
        emotPick(it.id);
      });
      grid.appendChild(b);
    }
    function gridOf(items) {
      var grid = el('div', 'acsv-emot-grid');
      items.forEach(function (it) { addEmot(grid, it); });
      return grid;
    }
    var recent = emotReadRecent().map(emotFind).filter(Boolean);
    var tabNames = [];
    if (recent.length) tabNames.push('最近使用');
    packs.forEach(function (p) { tabNames.push(p.name); });
    var tab = panel._tab && tabNames.indexOf(panel._tab) !== -1 ? panel._tab : tabNames[0];
    // 内容区（可滚动）
    var body = el('div', 'acsv-emot-body');
    body.appendChild(el('div', 'acsv-emot-head', tab));
    if (tab === '最近使用') body.appendChild(gridOf(recent));
    else packs.forEach(function (p) { if (p.name === tab) body.appendChild(gridOf(p.items)); });
    panel.appendChild(body);
    // 底部包切换条（固定，不随内容滚动）
    var foot = el('div', 'acsv-emot-foot');
    var strip = el('div', 'acsv-emot-strip');
    function thumb(tabName, imgUrl) {
      var tb = el('button', 'acsv-emot-thumb' + (tab === tabName ? ' on' : ''));
      tb.title = tabName;
      var ti = el('img');
      ti.src = imgUrl;
      ti.referrerPolicy = 'no-referrer';
      ti.alt = '';
      tb.appendChild(ti);
      tb.addEventListener('click', function (ev2) {
        ev2.stopPropagation();
        panel._tab = tabName;
        renderPanel();
      });
      strip.appendChild(tb);
    }
    if (recent.length) thumb('最近使用', recent[0].url);
    packs.forEach(function (p) { thumb(p.name, p.items[0].url); });
    var prev = el('button', 'acsv-emot-page', '‹');
    var next = el('button', 'acsv-emot-page', '›');
    prev.addEventListener('click', function (ev2) { ev2.stopPropagation(); strip.scrollBy({ left: -120, behavior: 'smooth' }); });
    next.addEventListener('click', function (ev2) { ev2.stopPropagation(); strip.scrollBy({ left: 120, behavior: 'smooth' }); });
    foot.appendChild(prev);
    foot.appendChild(strip);
    foot.appendChild(next);
    panel.appendChild(foot);
  }
  inp.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendCurrent(); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); inp.blur(); }
  });
  send.addEventListener('click', function (ev) { ev.stopPropagation(); sendCurrent(); });
  return inputBar;
}

function mockComments() {
  // 本地 harness 用示例数据（真实环境走通用评论接口）
  return {
    commentCount: 2, curPage: 1, totalPage: 1, pcursor: 'no_more',
    rootComments: [
      { commentId: 'm1', userId: 123, userName: '香蕉君', headUrl: '', content: '这条视频太棒了（示例评论，仅本地预览显示）', postDate: '2026-09-01', likeCount: 233, isUp: false, subCommentCount: 1 },
      { commentId: 'm2', userId: 456, userName: 'UP主本人', headUrl: '', content: '感谢收看！', postDate: '2026-09-02', likeCount: 66, isUp: true, subCommentCount: 0 }
    ],
    subCommentsMap: { m1: [{ commentId: 'm1-1', userId: 789, userName: '路人甲', headUrl: '', content: '前排！', postDate: '2026-09-01', likeCount: 3, subCommentCount: 0 }] }
  };
}
