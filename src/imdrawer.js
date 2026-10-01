import { CFG } from './cfg.js';
import { el, esc, toast, cookieVal } from './ui.js';
import { root, claimDrawer, releaseDrawer } from './state.js';
import {
  ensureIm, ensureConnected, ensureTracer, linkOk, forceSync,
  doSend, sendQuote, sendImage, fetchImImageBlob, fetchCards, isLogined, imShutdown,
  prewarmIm, peekImImageBlob
} from './imshare.js';
import { syncCommentVars } from './comments.js';
import { mountEmotButton, EmotionMap, ensureEmotionMap } from './emoticon.js';
import { openImageViewer } from './imgview.js';
import { renderCommentHtml } from './ubb.js';
import { buildInputBar, buildQuoteChip } from './inputbar.js';
import {
  parseCard, parseShare, fmtDur, msgTextOf, previewOfMessage,
  isCommentShare, cmtShareOf,
  msgContentType, isQuotable, quoteOf, quoteExtraOf
} from './immsg.js';
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

var drawer = null;          // { el, head, back, title, close, listView, search, listBody, chatView, bubbles, quoteChip:{box,label}, input, send }
var view = '';              // '' | 'list' | 'chat'
var cards = {};             // targetId -> {name, headUrl}（跨视图缓存）
var badgeTimer = null, badgeDelayTimer = null;

// 自停式轮询（0.9.35 收敛 stopX/startX 模板）：tick 内调 poll.stop() 即自拆
function makePoller(fn, gap) {
  var t = null;
  function stop() { if (t) { clearInterval(t); t = null; } }
  return { start: function () { stop(); t = setInterval(fn, gap); }, stop: stop };
}
var listPoll = makePoller(function () {
  if (view !== 'list') return listPoll.stop();
  refreshList();
}, CFG.im.drawerListPoll);
var chatPoll = makePoller(function () {
  if (!chat) return chatPoll.stop();
  ensureIm().then(function (inst) {
    if (!inst.connected) return;
    chatPollOnce(inst, false);
  }, function () { });
}, CFG.im.drawerChatPoll);
var chat = null;            // { targetId, name, session, lastCount, seen, lastDivTs, quote, msgEls }
var lastImInst = null;      // 最近一次轮询的 IM 实例：图片消息 ks:// 换链要用 kernel.file
var badgeEl = null, mounted = false;

function badgeText(n) { return n > 99 ? '99+' : (n > 0 ? String(n) : ''); }

function selfUid() {
  var m = /^(\d+)/.exec(cookieVal('auth_key'));
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

// 表情短代码转图（官方 IM 的 wire 格式就是 [emot=acfun,ID/]，APP/官方 web 原生渲染）：
// EmotionMap 直查转小图，未加载/查无此 ID 降级「[表情]」文本；其余方言包走 umeditor 老
// 图路径——两分支与官方 convertEmotionCodeToHtml 同构。入参须是已 esc 的 HTML 文本
function emotify(html) {
  return html
    .replace(/\[emot=acfun,(\S+?)\/\]/g, function (_, id) {
      var it = EmotionMap.map && EmotionMap.map[id];
      return (it && it.url)
        ? '<img class="acsv-im-emotimg" src="' + it.url + '" referrerpolicy="no-referrer" alt="">'
        : '[表情]';
    })
    .replace(/\[emot=(\S+?),(\S+?)\/\]/g,
      '<img class="acsv-im-emotimg" src="//cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/$1/$2.gif" referrerpolicy="no-referrer" alt="">');
}
function imTextHtml(s) { return emotify(linkify(s)); }

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
  // 引用 chip：DOM 由 inputbar.buildQuoteChip 统一产出（0.9.47 起评论回复同款），置输入条上方，setQuote 驱动显隐
  var quoteChip = buildQuoteChip(function () { setQuote(null); }, '取消引用');
  var inputBar = buildInputBar({
    img: { title: '发送图片', onFile: sendImageMsg }, // 尺寸门禁在 sendImageMsg 内
    placeholder: '发个消息…',
    onSend: function () {
      var t = inputBar.input.value.replace(/\s+$/, '');
      if (!t) return;
      inputBar.input.value = '';
      inputBar.fitHeight();
      sendChat(t);
    }
  });
  var input = inputBar.input; // 引用 chip 联动 placeholder（renderQuoteChip）用
  chatView.appendChild(bubbles);
  chatView.appendChild(quoteChip.box); // chip 置输入条上方；buildQuoteChip 返回 {box,label}，挂 DOM 须取 .box
  chatView.appendChild(inputBar.box);
  d.appendChild(chatView);

  // 表情面板挂抽屉根：.acsv-emotpanel 以最近 positioned 祖先锚定，私信抽屉同为 absolute
  // 容器、bottom:57px 与 IM 输入条高度恰好对齐，无需覆写样式
  var emotPanel = el('div', 'acsv-emotpanel');
  emotPanel.style.display = 'none';
  d.appendChild(emotPanel);
  mountEmotButton(inputBar.emotBtn, emotPanel, input);
  // 表情图渲染依赖 EmotionMap：抽屉创建即预热（localStorage 缓存命中近零开销），避免没开
  // 过面板时收到的表情消息只能显示 [表情]；首次真拉取完成后聊天视图在场就重渲一拍
  var mapCold = !EmotionMap.loaded;
  ensureEmotionMap().then(function () {
    if (!mapCold || !drawer || view !== 'chat' || !chat) return;
    ensureIm().then(function (inst) {
      if (inst.connected) chatPollOnce(inst, true);
    }, function () { });
  });

  root.appendChild(d);
  drawer = {
    el: d, head: head, back: back, title: title, close: close,
    listView: listView, search: search, listBody: listBody,
    chatView: chatView, bubbles: bubbles, quoteChip: quoteChip, input: input, send: inputBar.send
  };
}

// ---------- 视图切换 ----------
function showList() {
  if (!drawer) return;
  chatPoll.stop();
  view = 'list';
  drawer.back.style.display = 'none';
  drawer.title.textContent = '私信';
  drawer.listView.style.display = '';
  drawer.chatView.style.display = 'none';
  refreshList();
  listPoll.start();
}
function showChat(targetId) {
  if (!drawer) return;
  listPoll.stop();
  view = 'chat';
  var card = cards[targetId] || {};
  drawer.back.style.display = 'block';
  drawer.title.textContent = card.name || '用户 ' + targetId;
  drawer.listView.style.display = 'none';
  drawer.chatView.style.display = '';
  drawer.bubbles.innerHTML = '';
  // quote=待引用目标 {seqId, preview, originMsg}；msgEls=seen key→气泡主元素（引用定位用）。
  // 都是会话级状态：切会话随 chat 重建自然清空，不残留上一会话的引用
  chat = { targetId: String(targetId), name: card.name || '', session: null, lastCount: -1, seen: {}, lastDivTs: 0, quote: null, msgEls: {} };
  loadChat();
  drawer.input.value = ''; // 清掉上一会话可能残留的草稿
  setTimeout(function () { try { drawer.input.focus(); } catch (e) { } }, 60);
  chatPoll.start();
}

// ---------- 列表视图 ----------
var listSig = '';
// 增量签名：只读映射后的真实字段（旧版读 s.activeTime/s.lastMessage——映射后对象上
// 不存在，签名后两段恒为空串，预览/时间的变化永远触发不了重渲染）
function sessionSig(ss) {
  return ss.map(function (s) {
    return [s.targetId, s.unread, s.t,
      (s.last && (s.last.seqId || msgTime(s.last) || msgTextOf(s.last))) || ''].join(':');
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
    var prev = el('div', 'acsv-im-preview', previewOf(r));
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
  lastImInst = inst;
  try {
    var k = inst.kernel;
    if (!chat.session) {
      var ss = k.getSessions() || [];
      ss.some(function (s) { if (String(s.targetId) === chat.targetId) { chat.session = s; return true; } return false; });
    }
    if (!chat.session) return;
    var msgs = k.getMessages(chat.session) || [];
    if (reset) { chat.seen = {}; chat.msgEls = {}; chat.lastCount = -1; drawer.bubbles.innerHTML = ''; }
    var fresh = [];
    msgs.forEach(function (m) {
      // 兜底 key 用内容指纹而非随机数：reset 重建 seen 后同一条消息不会二次上屏
      var key = String((m.seqId !== undefined && m.seqId) || msgTime(m) || ('h' + msgFrom(m) + ':' + msgTextOf(m)));
      if (chat.seen[key]) return;
      chat.seen[key] = true;
      fresh.push({ m: m, key: key });
    });
    fresh.forEach(function (x) {
      appendBubble(x.m);
      // 登记本条消息最后一个节点（文本气泡=rowwrap，卡片=vcard）作引用定位锚：
      // 引用块点击按 originMsg.seqId 反查这里
      var lastEl = drawer.bubbles.lastElementChild;
      if (lastEl) chat.msgEls[x.key] = lastEl;
    });
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

// ---------- 消息引用（气泡内摘要条 / hover 引用按钮 / 输入条 chip / 定位） ----------
function setQuote(q) {
  if (chat) chat.quote = q || null;
  renderQuoteChip();
}
// chip 文案与 placeholder 联动（评论侧 comments.setReply 同构）；chat 为空时只藏不显
function renderQuoteChip() {
  if (!drawer) return;
  var chip = drawer.quoteChip, q = chat && chat.quote;
  if (!q) {
    chip.box.style.display = 'none';
    chip.label.textContent = '';
    drawer.input.placeholder = '发个消息…';
    return;
  }
  chip.box.style.display = 'flex';
  chip.label.textContent = '引用：' + (q.preview || '原消息');
  drawer.input.placeholder = '回复引用的内容…';
}
// 气泡内引用摘要条：有锚点（原消息 seqId）才可点定位
function quoteStrip(q) {
  var s = el('div', 'acsv-im-quote' + (q.seqId ? ' link' : ''));
  s.appendChild(el('div', 'acsv-im-quote-preview', q.preview || '[原消息]'));
  if (q.seqId) {
    s.title = '点击查看原消息';
    s.addEventListener('click', function (ev) { ev.stopPropagation(); locateMessage(q.seqId); });
  }
  return s;
}
function locateMessage(seqId) {
  if (!drawer || !chat) return;
  var wrap = chat.msgEls[String(seqId)];
  if (!wrap || !wrap.isConnected) { toast('原消息不在已加载的记录里'); return; }
  // 描边打在气泡/卡片本体：包裹器还含默认隐藏的引用按钮，连同描边会框进一段空位
  var t = wrap.querySelector('.acsv-im-bubble') || wrap.querySelector('.acsv-im-vcard') || wrap;
  try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e1) { t.scrollIntoView(); }
  t.classList.remove('acsv-im-flash');
  void t.offsetWidth; // 强制 reflow：连续点击同一条也能重触发 CSS 动画
  t.classList.add('acsv-im-flash');
  setTimeout(function () { t.classList.remove('acsv-im-flash'); }, 1300);
}
// 行包裹器：气泡/卡片 + hover 引用按钮同行（mine 行反序让按钮贴右缘）。引用范围按通道
// 裁决：extra 通道（默认）文本/卡片/图片/引用都能引（0.9.41 起 isQuotable 含图片），
// reference 通道禁卡（内核重建 originMsg 会崩，见 immsg.isQuotable）
function bubbleRow(b, mine, m, extraCls) {
  var wrap = el('div', 'acsv-im-rowwrap' + (extraCls ? ' ' + extraCls : '') + (mine ? ' mine' : ''));
  wrap.appendChild(b);
  if (m && isQuotable(m, CFG.im.quoteWire)) wrap.appendChild(quoteBtnEl(m));
  return wrap;
}
function quoteBtnEl(m) {
  var btn = el('button', 'acsv-im-quotebtn', '↩'); // 回复箭头字形：比文字药丸轻量
  btn.title = '引用这条消息';
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    var raw = m.rawMsg || {};
    setQuote({
      seqId: raw.seqId !== undefined && raw.seqId !== null ? String(raw.seqId) : '',
      preview: previewOfMessage(m) || msgTextOf(m).slice(0, 40),
      originMsg: m
    });
    try { drawer.input.focus(); } catch (e) { }
  });
  return btn;
}
function appendBubble(m) {
  if (!drawer) return;
  maybeDayDiv(msgTime(m));
  var mine = msgFrom(m) === selfUid();
  // 引用判定先行于卡片/分享：回复正文里带链接时依然是引用气泡，不出分享卡
  var q = quoteOf(m) || quoteExtraOf(m);
  var b = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
  if (q) {
    b.appendChild(quoteStrip(q));
    var qtxt = el('div', 'acsv-im-msgtext');
    qtxt.innerHTML = imTextHtml(q.text);
    b.appendChild(qtxt);
    drawer.bubbles.appendChild(bubbleRow(b, mine, m)); // 引用消息本身也可被引用（套引用）
    return;
  }
  if (msgContentType(m) === 1) return appendImageBubble(m, mine);
  var card = parseCard(m);
  if (card) return appendCardBubble(card, mine, m);
  var share = parseShare(msgTextOf(m));
  if (share) return appendShareBubble(share, mine, m, cmtShareOf(m));
  var txt = el('div', 'acsv-im-msgtext');
  txt.innerHTML = imTextHtml(msgTextOf(m));
  b.appendChild(txt);
  drawer.bubbles.appendChild(bubbleRow(b, mine, m));
}
// 图片气泡（contentType 1，官方同路消息 APP 原生渲染）：wire 上 uri 是 ks:// 资源串，须经
// kernel.file 换带鉴权的 https 直链才能显示；换链失败不出裂图，降级 [图片] 文本。
// 宽高非 0 时按比例占位防布局跳动；点击开大图查看器（划选文字收尾在图上不触发，对齐评论）。
// 字节懒加载（0.9.49）：滚入视口才拉，长历史只加载可见几张；pending 骨架微光占位
function appendImageBubble(m, mine) {
  if (!drawer) return;
  var w = Number(m.width) || 0, h = Number(m.height) || 0;
  var src = imageUrlOf(m);
  var b = el('div', 'acsv-im-imgbubble' + (mine ? ' mine' : ''));
  if (src) {
    var img = document.createElement('img');
    img.className = 'acsv-im-imgimg';
    img.alt = '';
    if (w > 0 && h > 0) {
      img.style.width = Math.min(w, 180) + 'px';
      img.style.aspectRatio = w + ' / ' + h; // 加载前占住宽高比，上屏不跳
    }
    b.appendChild(img);
    var cached = peekImImageBlob(src);
    if (cached) {
      img.src = cached; // 缓存同步上屏：重开/切回会话不闪微光、不等观察器一拍
    } else {
      b.classList.add('pending');
      imImgLazy(img, function () {
        fetchImImageBlob(src).then(function (blobUrl) {
          if (!img.isConnected) return;
          b.classList.remove('pending');
          if (blobUrl) img.src = blobUrl;
          else { img.remove(); b.appendChild(document.createTextNode('[图片]')); }
        });
      });
    }
    b.addEventListener('click', function (ev) {
      var sel = window.getSelection ? window.getSelection() : null;
      if (sel && !sel.isCollapsed) return;
      ev.stopPropagation();
      // 大图查看器也走 fetchImImageBlob：命中缓存秒开；旧 blob 被 LRU 淘汰 revoke 了则
      // 自动重拉（直用渲染时的 curSrc 会裂图）。在飞去重保证与气泡加载共用同一次下载
      fetchImImageBlob(src).then(function (blobUrl) {
        if (blobUrl) openImageViewer(blobUrl);
      });
    });
  } else {
    b.textContent = '[图片]';
  }
  drawer.bubbles.appendChild(bubbleRow(b, mine, m));
}
// 图片懒加载观察器（模块级单例）：root 缺省=viewport，祖先滚动容器的裁剪自动计入，
// 抽屉关/拆无需重建；会话视图 display:none 期间不交叉也就不触发。rootMargin 提前
// 200px 预读；加载回调挂元素属性上，观察器本身零业务语义
var imImgObs = null;
function imImgLazy(img, load) {
  if (!imImgObs) {
    imImgObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        imImgObs.unobserve(en.target);
        var fn = en.target.__acsvImgLoad;
        if (fn) { en.target.__acsvImgLoad = null; fn(); }
      });
    }, { rootMargin: '200px 0px' });
  }
  img.__acsvImgLoad = load;
  imImgObs.observe(img);
}
// ks:// 资源 → 官方 download 直链（message.acfun.cn，参数白名单官方形态，无 token）。
// 零会话依赖三级兜底（重开会话后内核 decodeContent/file 配置都不保证就绪，首次能渲染
// 重开挂车的前车之鉴）：uri 取 m.url → rawMsg.content 手解 proto 字段 1；URL 取内核换链
// → 本地拼装（resourceId 从 ks:// 尾段、userId/did 取本端 Cookie）
function imageUrlOf(m) {
  var ks = '';
  try { ks = (m && (m.url || (m.imageAttachment && m.imageAttachment.uri))) || ''; } catch (e0) { }
  if (!ks) ks = imageUriFromRaw(m);
  if (!ks) { console.warn('[acsv-im] 图片消息无 uri（decode 与 raw 均未恢复）'); return ''; }
  if (!/^ks:\/\//.test(ks)) return officialize(ks);
  try {
    var k = lastImInst && lastImInst.kernel;
    if (k && k.file && k.file.resourceUrlToHttpUrl) {
      var u = officialize(k.file.resourceUrlToHttpUrl(ks, false, Number(m.width) || 0, Number(m.height) || 0));
      if (u) return u;
    }
  } catch (e) { }
  try {
    // ks://<resourceId>[/<数字尾缀>]：官方页 DOM 实测形态（data-text="ks://xxx.jpg/1"），
    // resourceId = 去掉 ks:// 后再剥尾缀的主段（官方 widget 同款 /\/\w+$/ 尾缀语义）
    var rid = ks.slice(5).replace(/\/\w+$/, '');
    if (!rid) { console.warn('[acsv-im] ks 资源串形态不识别:', ks.slice(0, 60)); return ''; }
    var ver = '';
    try {
      var cfgk = lastImInst && lastImInst.kernel && lastImInst.kernel.config;
      ver = (cfgk && (cfgk.imsdkver || cfgk.sdkVersion)) || '';
    } catch (e2) { }
    return CFG.api.imDownloadBase + '/rest/v2/app/download?resourceId=' + encodeURIComponent(rid)
      + '&userId=' + encodeURIComponent(selfUid())
      + '&did=' + encodeURIComponent(cookieVal('_did') || '')
      + '&kpn=ACFUN_APP&platform=H5' + (ver ? '&imsdkver=' + encodeURIComponent(ver) : '');
  } catch (e3) { return ''; }
}
// Image proto 字段 1（uri, string）手解：tag 0x0A + varint 长度 + 字节（uri 为 ASCII）。
// 内核 decodeContent 没跑（重开会话的缓存消息）时从这里恢复 uri
function imageUriFromRaw(m) {
  try {
    var buf = m && m.rawMsg && m.rawMsg.content;
    if (!buf) return '';
    var u8 = new Uint8Array(buf), i = 0;
    if (u8[i++] !== 0x0a) return '';
    var len = 0, shift = 0, b;
    do { b = u8[i++]; len += (b & 0x7f) * Math.pow(2, shift); shift += 7; } while (b & 0x80);
    if (!len || i + len > u8.length) return '';
    var s = '';
    for (var j = 0; j < len; j++) s += String.fromCharCode(u8[i + j]);
    return (/^ks:\/\//.test(s) || /^https?:\/\//.test(s)) ? s : '';
  } catch (e) { return ''; }
}
// 把 /rest/v2/app/download 产物改写成 message.acfun.cn 官方参数形态：剥 token 与 w/h
//（sixinpic 域 401 的教训：acfun token 在该域不认，官方形态免 token），参数白名单对齐
// 官方页抓包（resourceId/userId/did/kpn/imsdkver/platform）
function officialize(httpUrl) {
  try {
    if (!httpUrl || !/^https?:\/\//.test(httpUrl)) return '';
    var u = new URL(httpUrl);
    var rid = u.searchParams.get('resourceId');
    if (!rid) return '';
    var q = ['resourceId', 'userId', 'did', 'kpn', 'imsdkver', 'platform']
      .map(function (k) {
        var v = u.searchParams.get(k);
        return v == null ? null : k + '=' + encodeURIComponent(v);
      })
      .filter(Boolean).join('&');
    return CFG.api.imDownloadBase + '/rest/v2/app/download?' + q;
  } catch (e) { return ''; }
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
// 作品分享卡（对齐手机端）：封面 + 播放/评论计数 + 时长 + 两行标题；投稿视频整卡可点跳 ac 号页。
// 卡片包 cardrow 行挂引用按钮（同条多卡各自可点，引的都是同一条消息）
function appendCardBubble(card, mine, m) {
  if (card.prologue) {
    var pre = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    pre.textContent = card.prologue;
    drawer.bubbles.appendChild(pre);
  }
  card.resourceBody.forEach(function (r) {
    drawer.bubbles.appendChild(bubbleRow(vcardEl({
      href: Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : '',
      coverUrl: r.coverUrl, viewCountShow: r.viewCountShow,
      commentCountShow: r.commentCountShow, durationSec: r.durationSec, title: r.title
    }, mine), mine, m, 'cardrow'));
  });
}
// 脚本分享消息（标题\n推荐链）与 10001 同契约：卡片替代纯文本。同步先渲染消息内标题的
// 卡片骨架（整卡 href 即分享链，enrich 失败也保持可读可点，不再出现文本+卡片双份），
// dougaCard 回来后原位 patch 以接口字段为准；标题外文本作附言气泡。等待期间切走会话/视图则放弃。
// 评论转发（isCommentShare 命中）走专属评论卡——评论内容是主视觉，绝不能进视频卡的标题槽
//（会被 enrich 的视频标题覆盖，0.9.51 前评论因此整个消失）。cmt=cmtShareOf 载荷
//（extra 存活时），quote 用原始 UBB 富渲染真表情；被剥则按 wire 文本占位降级
function appendShareBubble(share, mine, m, cmt) {
  if (share.note) {
    var note = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    note.textContent = share.note;
    drawer.bubbles.appendChild(note);
  }
  var isCmt = isCommentShare(share.title);
  var cardEl = isCmt
    ? cshareEl({
        href: share.url, text: share.title,
        html: cmt && cmt.content ? cmtHtml(share.title, cmt.content) : ''
      }, mine)
    : vcardEl({ href: share.url, title: share.title }, mine);
  drawer.bubbles.appendChild(bubbleRow(cardEl, mine, m, 'cardrow'));
  var bubbles = drawer.bubbles;
  var tid = chat && chat.targetId;
  AppAPI.dougaCard(share.acId).then(function (c) {
    if (!c || !cardEl.isConnected || !drawer || drawer.bubbles !== bubbles
      || !chat || chat.targetId !== tid) return;
    if (isCmt) patchCshare(cardEl, c);
    else patchVcard(cardEl, c);
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
// 评论转发卡（0.9.51）：评论原文（@作者：内容）是主视觉——accent 左条引用式排版，
// 来源作品收进底部小条。整卡 href=作品链接（评论没有独立落地页，URL 带 #ncid= 锚点
// 时落地页原生定位楼层）；小条 enrich 前显示占位文案，dougaCard 失败也保持可读可点
//（与分享卡同一兜底原则）
function cshareEl(r, mine) {
  var cardEl = el(r.href ? 'a' : 'div', 'acsv-im-cshare' + (mine ? ' mine' : ''));
  if (r.href) {
    cardEl.href = r.href;
    cardEl.target = '_blank';
    cardEl.rel = 'noopener';
  }
  cardEl.addEventListener('click', function (ev) { ev.stopPropagation(); });
  var quote = el('div', 'acsv-im-cshare-quote');
  if (r.html) {
    quote.innerHTML = r.html;
    // [img] 配图点击看大图：整卡是 <a>，preventDefault 防跳作品页
    quote.addEventListener('click', function (ev) {
      var im = ev.target && ev.target.closest ? ev.target.closest('.ubb-imgc') : null;
      if (!im) return;
      ev.preventDefault();
      ev.stopPropagation();
      openImageViewer(im.getAttribute('src') || '');
    });
  } else {
    quote.textContent = r.text;
  }
  cardEl.appendChild(quote);
  var src = el('div', 'acsv-im-cshare-src');
  var cover = el('img', 'acsv-im-cshare-cover');
  cover.alt = '';
  cover.referrerPolicy = 'no-referrer';
  cover.style.visibility = 'hidden';
  cover.addEventListener('error', function () { cover.style.visibility = 'hidden'; });
  src.appendChild(cover);
  src.appendChild(el('div', 'acsv-im-cshare-srctitle', '查看来源作品'));
  cardEl.appendChild(src);
  return cardEl;
}
// 富评论正文（extra 载荷 content=原始 UBB 时）：走 renderCommentHtml 完整管线（esc+白
// 名单，表情经 EmotionMap 渲染真图、[img] 出可点大图）；at/resource 链接退化 span——
// 卡片根是 <a>，HTML 不允许嵌套 a（解析器会拆散 DOM）。作者头从 wire 标题拆出，esc 后拼接
function cmtHtml(title, raw) {
  var am = /^@([^：]*)：/.exec(String(title || ''));
  return esc('@' + (am ? am[1] : '') + '：')
    + renderCommentHtml(raw).replace(/<a\b[^>]*>/g, '<span>').replace(/<\/a>/g, '</span>');
}
// 评论卡 enrich 原位补全：只动来源小条，评论正文永远不碰
function patchCshare(cardEl, c) {
  var cover = cardEl.querySelector('.acsv-im-cshare-cover');
  if (cover && c.cover) {
    cover.src = c.cover;
    cover.style.visibility = '';
  }
  var t = cardEl.querySelector('.acsv-im-cshare-srctitle');
  if (t && c.title) t.textContent = c.title;
}
// 图片即选即发（微信/抖音 IM 惯例，不插入文本框）：读自然宽高 → 乐观占位（本地预览）→
// sendImage（SDK 内核自动传图床换 ks://，确认含上传故用 imgSendT）→ 成功摘占位补真身。
// File 留在闭包，失败点击重试整条重走（ImageMsg 每次新建，File 可重复上传）
function sendImageMsg(file) {
  var targetId = chat && chat.targetId;
  if (!targetId) return;
  if (file.size > CFG.im.imgMax) {
    toast('图片不能超过 ' + Math.round(CFG.im.imgMax / 1024 / 1024) + 'MB');
    return;
  }
  var localUrl = '';
  try { localUrl = URL.createObjectURL(file); } catch (e0) { }
  readSize(localUrl, function (w, h) {
    maybeDayDiv(Date.now());
    var b = el('div', 'acsv-im-imgbubble mine pending');
    if (localUrl) {
      var ph = document.createElement('img');
      ph.className = 'acsv-im-imgimg';
      ph.alt = '';
      ph.src = localUrl;
      if (w > 0 && h > 0) {
        ph.style.width = Math.min(w, 180) + 'px';
        ph.style.aspectRatio = w + ' / ' + h;
      }
      b.appendChild(ph);
    } else {
      b.textContent = '[图片]';
    }
    var holder = el('div', 'acsv-im-rowwrap mine');
    holder.appendChild(b);
    drawer.bubbles.appendChild(holder);
    drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
    function cleanup() { if (localUrl) { try { URL.revokeObjectURL(localUrl); } catch (e2) { } } }
    function onFail(err) {
      var stale = !chat || chat.targetId !== targetId;
      if (!stale && holder.isConnected) {
        b.classList.remove('pending');
        b.classList.add('failed');
        b.title = '发送失败，点击重试';
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          holder.remove();
          cleanup();
          sendImageMsg(file);
        });
      }
      toast('图片发送失败：' + String((err && err.message) || '').slice(0, 120), 8000);
    }
    ensureIm().then(function (inst) {
      return ensureConnected(inst).then(function () {
        ensureTracer(inst);
        return sendImage(inst, Number(targetId), file, w, h);
      }).then(function () {
        // 确认成功：内核缓存必有真身（ks:// 已回填），立即增量拉一拍渲染成图片气泡
        if (!chat || chat.targetId !== targetId) { cleanup(); return; }
        if (holder.isConnected) holder.remove();
        cleanup();
        chatPollOnce(inst, false);
      }, onFail);
    }, onFail);
  });
}
function readSize(url, cb) {
  if (!url) return cb(0, 0);
  var img = new Image();
  img.onload = function () { cb(img.naturalWidth || 0, img.naturalHeight || 0); };
  img.onerror = function () { cb(0, 0); };
  img.src = url;
}

function sendChat(text) {
  var targetId = chat && chat.targetId;
  if (!targetId) return;
  // 裁剪先行：占位/发送/失败回填共用同一串，所见即所发（超限官方静默拒发，只会白等超时）
  text = String(text).slice(0, CFG.im.maxLen);
  var quote = chat.quote || null; // 发送即定格：发送期间改引用目标不影响本条
  // 乐观占位（引用回复同款：摘要条 + 正文）
  maybeDayDiv(Date.now());
  var b = el('div', 'acsv-im-bubble mine pending');
  if (quote) b.appendChild(quoteStrip({ seqId: quote.seqId, preview: quote.preview }));
  var txt = el('div', 'acsv-im-msgtext');
  txt.innerHTML = imTextHtml(text);
  b.appendChild(txt);
  var holder = el('div', 'acsv-im-rowwrap mine');
  holder.appendChild(b);
  drawer.bubbles.appendChild(holder);
  drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
  function onFail(err) {
    var stale = !chat || chat.targetId !== targetId;
    if (!stale && holder.isConnected) {
      b.classList.remove('pending');
      b.classList.add('failed');
      b.title = '发送失败，点击重试';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        holder.remove();
        drawer.input.value = text;
        if (quote && chat && !chat.quote) setQuote(quote); // 重试恢复引用 chip（期间没换目标才回填）
        drawer.input.focus();
      });
    }
    // 消息确实没发出去：无论是否已切会话都提示（切会话场景不碰 DOM，只告知）
    toast('发送失败：' + String((err && err.message) || '').slice(0, 120), 8000);
  }
  ensureIm().then(function (inst) {
    return ensureConnected(inst).then(function () {
      ensureTracer(inst);
      // 引用走 sendQuote（内核直发，恢复重试已内置）；文本维持 doSend+就地恢复的既有路径
      return quote
        ? sendQuote(inst, Number(targetId), quote, text)
        : doSend(inst, Number(targetId), text).catch(function (err) {
          // 失败自动恢复一次（链路坏→重连；否则强制同步），再试一发
          var pre = linkOk(inst) ? Promise.resolve() : ensureConnected(inst);
          return pre.then(function () { return forceSync(inst); })
            .then(function () { return doSend(inst, Number(targetId), text); });
        });
    }).then(function () {
      // 成功即摘占位并就地补真身：文本走 doSend 确认、引用走 clientSeqId 对账，两条
      // 确认途径都晚于内核 pushSentKwaiMessage 把消息写入缓存，此刻 getMessages 必有
      // 真身，立即增量拉一拍上屏，不等下一拍轮询。占位节点走闭包引用，不用
      // querySelector——连发多条时按选择器只能摸到第一条，会摘错
      if (!chat || chat.targetId !== targetId) return;
      if (holder.isConnected) holder.remove();
      if (quote && chat.quote === quote) setQuote(null);
      chatPollOnce(inst, false);
    }, onFail);
  }, onFail);
}

// ---------- 开关与徽标 ----------
// 抽屉槽位（state.js 协调）：开前 claim 占槽（评论抽屉开着则被自动收回），关时 release；
// 视频避让根类由 syncCommentVars 按 currentDrawer() 统一裁决
export function openDrawer() {
  if (!isLogined()) { toast('私信需要先登录 AcFun 账号'); return; }
  ensureDrawerDom();
  prewarmIm(); // 首图提前换好 midground 令牌，进会话不等 token 往返
  claimDrawer('im', closeDrawer);
  drawer.el.classList.add('open');
  syncCommentVars(); // 复用评论抽屉的避让（视频平移缩放/控制栏侧栏让位）
  showList();
}
export function openChat(targetId) {
  if (!isLogined()) { toast('私信需要先登录 AcFun 账号'); return; }
  ensureDrawerDom();
  prewarmIm(); // 同 openDrawer：分享面板直达会话也不等 token 往返
  claimDrawer('im', closeDrawer);
  drawer.el.classList.add('open');
  syncCommentVars();
  showChat(String(targetId));
}
export function closeDrawer() {
  if (drawer) drawer.el.classList.remove('open');
  listPoll.stop();
  chatPoll.stop();
  view = '';
  releaseDrawer('im');
  syncCommentVars(); // 根类归 syncCommentVars 统一收拾
}
// 整体拆除（退出竖刷时 unmount 调用）：停全部轮询并重置模块态。不清的话旧 aside 引用
// 会让重进的 ensureDrawerDom 拒绝重建（抽屉打不开直到刷新），badgeTimer 还会继续拉 SDK
export function teardownIm() {
  mounted = false;
  imShutdown(); // 使在途连接轮询失效：孤儿 poll 不再 forceReconnect 动共享单例（0.9.34）
  if (badgeDelayTimer) { clearTimeout(badgeDelayTimer); badgeDelayTimer = null; }
  if (badgeTimer) { clearInterval(badgeTimer); badgeTimer = null; }
  listPoll.stop();
  chatPoll.stop();
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
