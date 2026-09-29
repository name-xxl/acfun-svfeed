import { CFG } from './cfg.js';
import { el, esc, toast } from './ui.js';
import { root, claimDrawer, releaseDrawer } from './state.js';
import {
  ensureIm, ensureConnected, ensureTracer, linkOk, forceSync,
  doSend, fetchCards, isLogined
} from './imshare.js';
import { syncCommentVars } from './comments.js';
import { parseCard, parseShare, fmtDur, msgTextOf, previewOfMessage } from './immsg.js';
import { ICON_SVGS } from './imicons.js';
import { AppAPI } from './appapi.js';

// 作品卡计数图标：站点原生 SVG 资产（imicons 登记表）+ CSS mask currentColor 着色，
// 暗色气泡内为白色描边形状，与原生列表页计数观感一致
var ICON_PLAY = '<i class="acsvg-cicon" style="--acsvg-cicon:url(' + ICON_SVGS.play + ')"></i>';
var ICON_COMMENT = '<i class="acsvg-cicon" style="--acsvg-cicon:url(' + ICON_SVGS.comment + ')"></i>';

// ---------- 私信抽屉（抖音式：列表 + 聊天两视图） ----------
// 数据面全部复用 imshare 已验证基础设施（补丁版 SDK / 连接 / 发送 / 头像）。
// 收发确认零事件依赖：新消息靠轮询 kernel.getMessages 增量（WS 推送由 SDK 内核自动
// 写入缓存，推送事件仅作即时上屏的加速路径）；已读走内核级 markSessionRead。

var drawer = null;          // { el, head, back, title, close, listView, search, listBody, chatView, bubbles, input, send }
var view = '';              // '' | 'list' | 'chat'
var cards = {};             // targetId -> {name, headUrl}（跨视图缓存）
var listTimer = null, chatTimer = null, badgeTimer = null, badgeDelayTimer = null;
var chat = null;            // { targetId, name, session, lastCount, seen, pendSeq, lastDivTs }
var badgeEl = null, mounted = false;

function badgeText(n) { return n > 99 ? '99+' : (n > 0 ? String(n) : ''); }

function selfUid() {
  var m = /(?:^|;\s*)auth_key=(\d+)/.exec(document.cookie);
  return m ? m[1] : '';
}

// ---------- 消息对象内省：方向/时间的降级提取（文本与卡片解析在 immsg.js 共享层） ----------
function msgFrom(m) {
  try {
    if (m.fromUserId != null) return String(m.fromUserId);
    if (m.rawMsg && m.rawMsg.fromUserId != null) return String(m.rawMsg.fromUserId);
  } catch (e) { }
  return '';
}
function msgTime(m) {
  try {
    if (m.date) return new Date(m.date).getTime() || 0;
    if (m.rawMsg && m.rawMsg.timestampMs) return Number(m.rawMsg.timestampMs) || 0;
  } catch (e) { }
  return 0;
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
// 对齐抖音相对时间：今天显时刻（刚刚/HH:MM）、昨天、一周内显星期、更早显日期（本地时区）
function relTime(ts) {
  if (!ts) return '';
  var d = Date.now() - ts;
  if (d < 60000) return '刚刚';
  var now = new Date(), t = new Date(ts);
  if (t.toDateString() === now.toDateString()) return pad2(t.getHours()) + ':' + pad2(t.getMinutes());
  if (t.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨天';
  if (d < 604800000) return '周' + '日一二三四五六'.charAt(t.getDay());
  return pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
}

function linkify(s) {
  return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
    return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
  });
}

// ---------- DOM ----------
function ensureDrawerDom() {
  if (drawer || !root) return;
  var d = el('aside', 'acsv-msgdrawer');

  // 头部：列表标题 / 聊天返回条 复用同一容器
  var head = el('div', 'acsv-im-head');
  var back = el('button', 'acsv-im-back', '‹');
  back.title = '返回消息列表';
  back.style.display = 'none';
  var title = el('span', 'acsv-im-title', '私信');
  var close = el('button', 'acsv-im-close', '✕');
  close.title = '关闭';
  close.addEventListener('click', function (ev) { ev.stopPropagation(); closeDrawer(); });
  back.addEventListener('click', function (ev) {
    ev.stopPropagation();
    showList();
  });
  head.appendChild(back);
  head.appendChild(title);
  head.appendChild(close);
  d.appendChild(head);

  // 列表视图
  var listView = el('div', 'acsv-im-listview');
  var searchWrap = el('div', 'acsv-im-searchwrap');
  var search = el('input', 'acsv-im-search');
  search.placeholder = '搜索联系人';
  search.addEventListener('click', function (ev) { ev.stopPropagation(); });
  search.addEventListener('input', function () { renderList(search.value); });
  searchWrap.appendChild(search);
  listView.appendChild(searchWrap);
  var listBody = el('div', 'acsv-im-list');
  listView.appendChild(listBody);
  d.appendChild(listView);

  // 聊天视图
  var chatView = el('div', 'acsv-im-chatview');
  chatView.style.display = 'none';
  var bubbles = el('div', 'acsv-im-bubbles');
  var inputBar = el('div', 'acsv-im-inputbar');
  var input = el('textarea', 'acsv-im-input');
  input.rows = 1;
  input.placeholder = '发个消息…';
  var send = el('button', 'acsv-im-send', '发送');
  function doSubmit() {
    var t = input.value.replace(/\s+$/, '');
    if (!t) return;
    input.value = '';
    sendChat(t);
  }
  send.addEventListener('click', function (ev) { ev.stopPropagation(); doSubmit(); });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.stopPropagation(); doSubmit(); }
  });
  inputBar.appendChild(input);
  inputBar.appendChild(send);
  chatView.appendChild(bubbles);
  chatView.appendChild(inputBar);
  d.appendChild(chatView);

  root.appendChild(d);
  drawer = {
    el: d, head: head, back: back, title: title, close: close,
    listView: listView, search: search, listBody: listBody,
    chatView: chatView, bubbles: bubbles, input: input, send: send
  };
}

// ---------- 视图切换 ----------
function showList() {
  if (!drawer) return;
  stopChatPoll();
  view = 'list';
  drawer.back.style.display = 'none';
  drawer.title.textContent = '私信';
  drawer.listView.style.display = '';
  drawer.chatView.style.display = 'none';
  refreshList();
  startListPoll();
}
function showChat(targetId) {
  if (!drawer) return;
  stopListPoll();
  view = 'chat';
  var card = cards[targetId] || {};
  drawer.back.style.display = 'block';
  drawer.title.textContent = card.name || '用户 ' + targetId;
  drawer.listView.style.display = 'none';
  drawer.chatView.style.display = '';
  drawer.bubbles.innerHTML = '';
  chat = { targetId: String(targetId), name: card.name || '', session: null, lastCount: -1, seen: {}, pendSeq: 0, lastDivTs: 0 };
  loadChat();
  drawer.input.value = ''; // 清掉上一会话可能残留的草稿
  setTimeout(function () { try { drawer.input.focus(); } catch (e) { } }, 60);
  startChatPoll();
}
function stopListPoll() { if (listTimer) { clearInterval(listTimer); listTimer = null; } }
function stopChatPoll() { if (chatTimer) { clearInterval(chatTimer); chatTimer = null; } }

// ---------- 列表视图 ----------
var listSig = '';
// 增量签名：只读映射后的真实字段（旧版读 s.activeTime/s.lastMessage——映射后对象上
// 不存在，签名后两段恒为空串，预览/时间的变化永远触发不了重渲染）
function sessionSig(ss) {
  return ss.map(function (s) {
    return [s.targetId, s.unread, s.t,
      (s.last && (s.last.seqId || msgTime(s.last) || msgText(s.last))) || ''].join(':');
  }).join('|');
}
function refreshList() {
  ensureIm().then(function (inst) {
    return ensureConnected(inst).then(function () {
      var ss = [];
      try { ss = inst.kernel.getSessions() || []; } catch (e) { }
      ss = ss.map(function (s) {
        // 末条从消息库派生：发送即时进库（聊天视图同源），预览/排序随之即时更新；
        // 会话冗余字段 lastMessage 只作回退（SDK 发送后不更新它）
        var last = s.lastMessage || null;
        try {
          var msgs = inst.kernel.getMessages(s) || [];
          if (msgs.length) last = msgs[msgs.length - 1];
        } catch (e) { }
        return {
          targetId: String(s.targetId),
          unread: Number(s.unreadCount) || 0,
          t: msgTime(last) || new Date(s.date || 0).getTime() || 0,
          last: last
        };
      }).filter(function (s) { return s.targetId && s.targetId !== selfUid(); })
        .sort(function (a, b) { return b.t - a.t; });
      var ids = ss.map(function (s) { return Number(s.targetId); });
      var sig = sessionSig(ss) + '|' + ids.join(',');
      if (sig === listSig && drawer && drawer.listView.style.display !== 'none') return;
      listSig = sig;
      return fetchCards(ids).then(function (m) {
        Object.keys(m).forEach(function (k) { cards[k] = m[k]; });
        renderList('', ss);
      });
    });
  }).catch(function () {
    if (drawer && drawer.listBody && !drawer.listBody.children.length) {
      drawer.listBody.innerHTML = '';
      drawer.listBody.appendChild(el('div', 'acsv-share-tip', '私信连接失败，请稍后再试\n可先复制链接去站内分享'));
    }
  });
}
function renderList(kw, ss) {
  if (!drawer) return;
  kw = String(kw || '').trim().toLowerCase();
  var rows = (ss || lastListRows || []);
  if (ss) lastListRows = ss;
  // 标题带未读总数（对齐抖音「消息 (1)」）
  var unreadTotal = 0;
  rows.forEach(function (r) { unreadTotal += r.unread || 0; });
  if (view === 'list') drawer.title.textContent = '私信' + (unreadTotal > 0 ? ' (' + unreadTotal + ')' : '');
  drawer.listBody.innerHTML = '';
  var shown = 0;
  rows.forEach(function (r) {
    var card = cards[r.targetId] || {};
    var name = card.name || '用户 ' + r.targetId;
    if (kw && name.toLowerCase().indexOf(kw) < 0) return;
    shown++;
    var row = el('div', 'acsv-im-row');
    row.dataset.tid = r.targetId;
    var av = el('img', 'acsv-im-av');
    av.referrerPolicy = 'no-referrer';
    av.src = (card.headUrl || CFG.api.defaultAvatar).split('?')[0];
    av.addEventListener('error', function () { av.src = CFG.api.defaultAvatar; });
    row.appendChild(av);
    var mid = el('div', 'acsv-im-mid');
    var nm = el('div', 'acsv-im-name');
    nm.innerHTML = esc(name) + (r.unread > 0 ? '<span class="acsv-share-unread">' + (r.unread > 99 ? '99+' : r.unread) + '</span>' : '');
    mid.appendChild(nm);
    var prev = el('div', 'acsv-im-preview', esc(previewOf(r)));
    mid.appendChild(prev);
    row.appendChild(mid);
    var tm = el('div', 'acsv-im-time', relTime(r.t));
    row.appendChild(tm);
    row.addEventListener('click', function (ev) {
      ev.stopPropagation();
      showChat(r.targetId);
    });
    drawer.listBody.appendChild(row);
  });
  if (!shown) {
    drawer.listBody.appendChild(el('div', 'acsv-share-tip',
      kw ? '没有匹配的联系人' : '还没有聊过天的朋友\n先在 A 站 APP / 网页和 TA 私聊一句\n再回来把视频分享给 TA'));
  }
}
var lastListRows = null;
// 文本消息预览前缀在 immsg.previewOfMessage 统一映射：脚本分享格式出「[分享] 标题」，
// 其余 acfun 链接出「[视频] …」——对齐抖音「分享[视频]」的辨识度
function previewOf(r) {
  return r.last ? previewOfMessage(r.last) : '';
}

// ---------- 聊天视图 ----------
function loadChat() {
  ensureIm().then(function (inst) {
    return ensureConnected(inst).then(function () {
      ensureTracer(inst);
      var ss = [];
      try { ss = inst.kernel.getSessions() || []; } catch (e) { }
      var sess = null;
      ss.some(function (s) { if (String(s.targetId) === chat.targetId) { sess = s; return true; } return false; });
      if (!sess) {
        // 没聊过：内核级创建会话后重取
        return inst.kernel.openSession(0, chat.targetId).then(function () {
          var ss2 = inst.kernel.getSessions() || [];
          ss2.some(function (s) { if (String(s.targetId) === chat.targetId) { sess = s; return true; } return false; });
          chat.session = sess;
          chatPollOnce(inst, true);
          return null;
        }, function () { chat.session = null; return null; });
      }
      chat.session = sess;
      return chatPollOnce(inst, true);
    });
  }).catch(function () {
    if (drawer && drawer.bubbles && !drawer.bubbles.children.length) {
      drawer.bubbles.appendChild(el('div', 'acsv-share-tip', '私信连接失败，请稍后再试\n可先复制链接去站内分享'));
    }
  });
}
function chatPollOnce(inst, reset) {
  try {
    var k = inst.kernel;
    if (!chat.session) {
      var ss = k.getSessions() || [];
      ss.some(function (s) { if (String(s.targetId) === chat.targetId) { chat.session = s; return true; } return false; });
    }
    if (!chat.session) return;
    var msgs = k.getMessages(chat.session) || [];
    if (reset) { chat.seen = {}; chat.lastCount = -1; drawer.bubbles.innerHTML = ''; }
    var fresh = [];
    msgs.forEach(function (m) {
      // 兜底 key 用内容指纹而非随机数：reset 重建 seen 后同一条消息不会二次上屏
      var key = String((m.seqId !== undefined && m.seqId) || msgTime(m) || ('h' + msgFrom(m) + ':' + msgText(m)));
      if (chat.seen[key]) return;
      chat.seen[key] = true;
      fresh.push({ m: m, key: key });
    });
    // 乐观气泡对账：一旦缓存里出现自己刚发的那条，就移除占位
    if (chat.pending && fresh.some(function (x) {
      return msgFrom(x.m) === selfUid() && msgText(x.m) === chat.pending;
    })) {
      var ph = drawer.bubbles.querySelector('.acsv-im-bubble.pending');
      if (ph) ph.remove();
      chat.pending = null;
    }
    fresh.forEach(function (x) { appendBubble(x.m); });
    if (fresh.length || reset) {
      drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
      // 已读上报（内核级，headless 可用）
      try {
        if (chat.session && k.markSessionRead && chat.session.unreadCount !== undefined) k.markSessionRead(chat.session);
      } catch (e) { }
    }
  } catch (e) { }
}
// 时间分割线（抖音式）：与上一条消息间隔超过 dayDivGap 插入居中时间（乐观气泡同样参与分组）
function dayLabel(ts) {
  var now = new Date(), t = new Date(ts);
  var hm = pad2(t.getHours()) + ':' + pad2(t.getMinutes());
  if (t.toDateString() === now.toDateString()) return '今天 ' + hm;
  if (t.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨天 ' + hm;
  if (now.getTime() - ts < 604800000) return '周' + '日一二三四五六'.charAt(t.getDay()) + ' ' + hm;
  return pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()) + ' ' + hm;
}
function maybeDayDiv(ts) {
  if (!ts || !drawer || !chat) return;
  if (!chat.lastDivTs || ts - chat.lastDivTs >= CFG.im.dayDivGap) {
    drawer.bubbles.appendChild(el('div', 'acsv-im-daydiv', dayLabel(ts)));
  }
  chat.lastDivTs = ts;
}
function appendBubble(m) {
  if (!drawer) return;
  maybeDayDiv(msgTime(m));
  var mine = msgFrom(m) === selfUid();
  var card = parseCard(m);
  if (card) return appendCardBubble(card, mine);
  var share = parseShare(msgTextOf(m));
  if (share) return appendShareBubble(share, mine);
  var b = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
  var txt = el('div', 'acsv-im-msgtext');
  txt.innerHTML = linkify(msgTextOf(m));
  b.appendChild(txt);
  drawer.bubbles.appendChild(b);
}
// 卡片 DOM 构造（10001 协议卡与脚本分享卡共用）：封面+计数条+两行标题；href 给出则整卡可点。
// 封面/计数/时长 span 恒渲染（无值隐藏）——分享卡的骨架先以消息内标题上屏，dougaCard 回来
// 后由 patchVcard 原位填充，无需重建节点；无封面不设 src 灰底隐藏（默认头像当封面观感错误）
function vcardEl(r, mine) {
  var cardEl = el(r.href ? 'a' : 'div', 'acsv-im-vcard' + (mine ? ' mine' : ''));
  if (r.href) {
    cardEl.href = r.href;
    cardEl.target = '_blank';
    cardEl.rel = 'noopener';
  }
  var box = el('div', 'acsv-im-vcard-coverbox');
  var cover = el('img', 'acsv-im-vcard-cover');
  cover.alt = '';
  cover.referrerPolicy = 'no-referrer';
  if (r.coverUrl) cover.src = r.coverUrl;
  else cover.style.visibility = 'hidden';
  cover.addEventListener('error', function () { cover.style.visibility = 'hidden'; });
  box.appendChild(cover);
  var bar = el('div', 'acsv-im-vcard-bar');
  bar.innerHTML = ICON_PLAY + '<span class="acsv-im-vcard-view">' + esc(r.viewCountShow || '') + '</span>'
    + ICON_COMMENT + '<span class="acsv-im-vcard-cmt">' + esc(r.commentCountShow || '') + '</span>'
    + '<span class="acsv-im-vcard-dur"' + (r.durationSec ? '' : ' style="display:none"') + '>'
    + (r.durationSec ? esc(fmtDur(r.durationSec)) : '') + '</span>';
  box.appendChild(bar);
  cardEl.appendChild(box);
  if (r.title) cardEl.appendChild(el('div', 'acsv-im-vcard-title', r.title));
  return cardEl;
}
// 作品分享卡（对齐手机端）：封面 + 播放/评论计数 + 时长 + 两行标题；投稿视频整卡可点跳 ac 号页
function appendCardBubble(card, mine) {
  if (card.prologue) {
    var pre = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    pre.textContent = card.prologue;
    drawer.bubbles.appendChild(pre);
  }
  card.resourceBody.forEach(function (r) {
    drawer.bubbles.appendChild(vcardEl({
      href: Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : '',
      coverUrl: r.coverUrl, viewCountShow: r.viewCountShow,
      commentCountShow: r.commentCountShow, durationSec: r.durationSec, title: r.title
    }, mine));
  });
}
// 脚本分享消息（标题\n推荐链）与 10001 同契约：卡片替代纯文本。同步先渲染消息内标题的
// 卡片骨架（整卡 href 即分享链，enrich 失败也保持可读可点，不再出现文本+卡片双份），
// dougaCard 回来后原位 patch 以接口字段为准；标题外文本作附言气泡。等待期间切走会话/视图则放弃
function appendShareBubble(share, mine) {
  if (share.note) {
    var note = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    note.textContent = share.note;
    drawer.bubbles.appendChild(note);
  }
  var cardEl = vcardEl({ href: share.url, title: share.title }, mine);
  drawer.bubbles.appendChild(cardEl);
  var bubbles = drawer.bubbles;
  var tid = chat && chat.targetId;
  AppAPI.dougaCard(share.acId).then(function (c) {
    if (!c || !cardEl.isConnected || !drawer || drawer.bubbles !== bubbles
      || !chat || chat.targetId !== tid) return;
    patchVcard(cardEl, c);
    drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
  });
}
// enrich 原位补全：接口字段优先，骨架已带消息内标题兜底
function patchVcard(cardEl, c) {
  var cover = cardEl.querySelector('.acsv-im-vcard-cover');
  if (cover && c.cover) {
    cover.src = c.cover;
    cover.style.visibility = '';
  }
  var view = cardEl.querySelector('.acsv-im-vcard-view');
  if (view && c.view != null) view.textContent = c.view;
  var cmt = cardEl.querySelector('.acsv-im-vcard-cmt');
  if (cmt && c.comment != null) cmt.textContent = c.comment;
  var dur = cardEl.querySelector('.acsv-im-vcard-dur');
  if (dur && c.durationSec) {
    dur.textContent = fmtDur(c.durationSec);
    dur.style.display = '';
  }
  var tt = cardEl.querySelector('.acsv-im-vcard-title');
  if (tt && c.title) tt.textContent = c.title;
}
function sendChat(text) {
  var targetId = chat && chat.targetId;
  if (!targetId) return;
  // 乐观占位
  maybeDayDiv(Date.now());
  var b = el('div', 'acsv-im-bubble mine pending');
  var txt = el('div', 'acsv-im-msgtext');
  txt.innerHTML = linkify(text);
  b.appendChild(txt);
  drawer.bubbles.appendChild(b);
  drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
  chat.pending = text;
  ensureIm().then(function (inst) {
    return ensureConnected(inst).then(function () {
      ensureTracer(inst);
      return doSend(inst, Number(targetId), String(text).slice(0, CFG.im.maxLen)).catch(function (err) {
        // 失败自动恢复一次（链路坏→重连；否则强制同步），再试一发
        var pre = linkOk(inst) ? Promise.resolve() : ensureConnected(inst);
        return pre.then(function () { return forceSync(inst); })
          .then(function () { return doSend(inst, Number(targetId), String(text).slice(0, CFG.im.maxLen)); });
      });
    });
  }).then(function () {
    // 成功：占位气泡等轮询对账移除；若超时未对账，轮询 reset 也会刷新
    var ph = drawer.bubbles.querySelector('.acsv-im-bubble.pending');
    if (ph) {
      ph.classList.remove('pending');
      ph.classList.add('sent');
    }
    chat.pending = null;
  }).catch(function (err) {
    var ph = drawer.bubbles.querySelector('.acsv-im-bubble.pending');
    if (ph) {
      ph.classList.remove('pending');
      ph.classList.add('failed');
      ph.title = '发送失败，点击重试';
      ph.addEventListener('click', function (ev) {
        ev.stopPropagation();
        ph.remove();
        drawer.input.value = text;
        drawer.input.focus();
      });
    }
    chat.pending = null;
    toast('发送失败：' + String((err && err.message) || '').slice(0, 120), 8000);
  });
}
function startChatPoll() {
  stopChatPoll();
  chatTimer = setInterval(function () {
    if (!chat) return stopChatPoll();
    ensureIm().then(function (inst) {
      if (!inst.connected) return;
      chatPollOnce(inst, false);
    }, function () { });
  }, CFG.im.drawerChatPoll);
}
function startListPoll() {
  stopListPoll();
  listTimer = setInterval(function () {
    if (view !== 'list') return stopListPoll();
    refreshList();
  }, CFG.im.drawerListPoll);
}

// ---------- 开关与徽标 ----------
// 抽屉槽位（state.js 协调）：开前 claim 占槽（评论抽屉开着则被自动收回），关时 release；
// 视频避让根类由 syncCommentVars 按 currentDrawer() 统一裁决
export function openDrawer() {
  if (!isLogined()) { toast('私信需要先登录 AcFun 账号'); return; }
  ensureDrawerDom();
  claimDrawer('im', closeDrawer);
  drawer.el.classList.add('open');
  syncCommentVars(); // 复用评论抽屉的避让（视频平移缩放/控制栏侧栏让位）
  showList();
}
export function openChat(targetId) {
  if (!isLogined()) { toast('私信需要先登录 AcFun 账号'); return; }
  ensureDrawerDom();
  claimDrawer('im', closeDrawer);
  drawer.el.classList.add('open');
  syncCommentVars();
  showChat(String(targetId));
}
export function closeDrawer() {
  if (drawer) drawer.el.classList.remove('open');
  stopListPoll();
  stopChatPoll();
  view = '';
  releaseDrawer('im');
  syncCommentVars(); // 根类归 syncCommentVars 统一收拾
}
// 整体拆除（退出竖刷时 unmount 调用）：停全部轮询并重置模块态。不清的话旧 aside 引用
// 会让重进的 ensureDrawerDom 拒绝重建（抽屉打不开直到刷新），badgeTimer 还会继续拉 SDK
export function teardownIm() {
  mounted = false;
  if (badgeDelayTimer) { clearTimeout(badgeDelayTimer); badgeDelayTimer = null; }
  if (badgeTimer) { clearInterval(badgeTimer); badgeTimer = null; }
  stopListPoll();
  stopChatPoll();
  releaseDrawer('im');
  drawer = null; view = ''; chat = null;
  cards = {}; listSig = ''; lastListRows = null;
  badgeEl = null;
}

// 顶栏 + 收起浮条未读徽标：unReadCountUpdate 事件加速 + 慢轮询兜底（仅缓存读）。
// mounted 门禁：teardown 后残留的 tick/延迟首查/推送监听全部失效（重进由 mountBadge 重新武装）
export function mountBadge(btn, badge) {
  badgeEl = badge;
  mounted = true;
  var last = -1;
  function tick() {
    if (!mounted) return;
    if (!isLogined()) { setBadge(0); return; }
    ensureIm().then(function (inst) {
      if (!mounted || !inst.connected) return;
      var sum = 0;
      try {
        (inst.kernel.getSessions() || []).forEach(function (s) { sum += Number(s.unreadCount) || 0; });
      } catch (e) { }
      setBadge(sum);
    }, function () { });
  }
  function setBadge(n) {
    if (n === last) return;
    last = n;
    var txt = badgeText(n), show = n > 0 ? '' : 'none';
    if (badgeEl) { badgeEl.textContent = txt; badgeEl.style.display = show; }
  }
  badgeTimer = setInterval(tick, CFG.im.badgePoll);
  // 首查延迟：避免页面一打开就为徽标拉起 SDK；SDK 就位后再挂推送事件加速
  badgeDelayTimer = setTimeout(function () {
    if (!mounted) return;
    tick();
    ensureIm().then(function (inst) {
      try { inst.on('unReadCountUpdate', function () { if (mounted) tick(); }); } catch (e) { }
    }, function () { });
  }, CFG.im.badgeDelay);
}
