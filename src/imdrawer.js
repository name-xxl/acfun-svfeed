import { CFG } from './cfg.js';
import { el, esc, toast, selfUid, ensureStyle, a11y } from './ui.js'; // cookieVal 已随图片换链管线迁 imsend（0.9.163）
import { root, claimDrawer, releaseDrawer, setRoot } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { testHook } from './dbg.js';
import {
  ensureIm, ensureConnected, ensureTracer, linkOk, forceSync,
  doSend, sendQuote, sendImage, fetchImImageBlob, fetchCards, isLogined, imShutdown,
  prewarmIm, peekImImageBlob, imageUrlOf
} from './imsend.js';
import { stopBadge } from './imbadge.js'; // 未读徽标件（0.9.163 自本模块拆出；teardown 经它收清）
import { setChatOpener } from './sharepanel.js';
import { syncCommentVars } from './comments.js';
import { mountEmotButton, EmotionMap, ensureEmotionMap, emotify } from './emoticon.js';
import { openImageViewer } from './imgview.js';
import { vcard, patchVcard, cshareCard, patchCshare, mcard } from './imcard.js';
import { imgInto, lazyObserve } from './imgload.js';
import { ubbQuoteHtml } from './ubb.js';
import { buildInputBar, buildQuoteChip } from './inputbar.js';
import {
  parseCard, parseShare, msgTextOf, previewOfMessage,
  isCommentShare, commentShareAuthor, cmtShareOf, momentShareOf,
  msgContentType, isQuotable, quoteOf, quoteExtraOf
} from './immsg.js';
import { ICON_SVGS } from './imicons.js';
import { AppAPI } from './appapi.js';
import { errImLogin, errImgTooBig, errLong } from './toastmsg.js'; // 话术单源（0.9.212 批⑧）

// ---------- 私信抽屉（抖音式：列表 + 聊天两视图） ----------
// 数据面全部复用 imsend 已验证基础设施（补丁版 SDK / 连接 / 发送 / 头像）。
// 收发确认零事件依赖：新消息靠轮询 kernel.getMessages 增量（WS 推送由 SDK 内核自动
// 写入缓存，推送事件仅作即时上屏的加速路径）；已读走内核级 markSessionRead。
//
// 簇导览（0.9.163；自上而下，每段以 `// ----------` 横幅开头，grep 段名即达）：
//   模块态+自停轮询（makePoller/listPoll/chatPoll）→ 消息对象内省 → DOM 骨架（ensureDrawerDom）
//   → 视图切换（setPane/showList/showChat）→ 列表视图（refreshList/renderList）→ 聊天视图
//   （loadChat/chatPollOnce/时间分割）→ 消息引用（setQuote/quoteStrip/bubbleRow）→ 气泡渲染
//   分流（appendBubble：引用/图片/卡片/分享/文本）→ 发送乐观 UI（sendImageMsg/sendChat）→
//   开关与生命周期（openDrawer/openChat/toggle/closeDrawer/teardownIm + 测试缝×4）。
//   调用方向：生命周期→列表/聊天数据→气泡渲染→引用/发送，全簇单向向下；
//   顶栏未读徽标在 imbadge.js、图片 URL 换链在 imsend.js（0.9.163 两缝外迁）。

var drawer = null;          // { el, head, back, title, close, listView, search, listBody, chatView, bubbles, quoteChip:{box,label}, input, send }
var view = '';              // '' | 'list' | 'chat'
var cards = {};             // targetId -> {name, headUrl}（跨视图缓存）

// 自停式轮询（0.9.35 收敛 stopX/startX 模板）：tick 内调 poll.stop() 即自拆
function makePoller(fn, gap) {
  var t = null;
  function stop() { if (t) { clearInterval(t); t = null; } }
  return { start: function () { stop(); t = setInterval(fn, gap); }, stop: stop };
}
var listPoll = makePoller(function () {
  if (view !== 'list') return listPoll.stop();
  if (document.hidden) return; // 后台标签不打扰（同 followbadge/squarefeed 约定）
  refreshList();
}, CFG.im.drawerListPoll);
var chatPoll = makePoller(function () {
  if (!chat) return chatPoll.stop();
  if (document.hidden) return; // 后台标签不打扰（同 followbadge/squarefeed 约定）
  ensureIm().then(function (inst) {
    if (!inst.connected) return;
    chatPollOnce(inst, false);
  }, function () { });
}, CFG.im.drawerChatPoll);
var chat = null;            // { targetId, name, session, lastCount, seen, lastDivTs, quote, msgEls }
var lastImInst = null;      // 最近一次轮询的 IM 实例：图片消息 ks:// 换链要用 kernel.file


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

function imTextHtml(s) { return emotify(linkify(s)); }

// ---------- DOM ----------
function ensureDrawerDom() {
  if (drawer || !root) return;
  var d = el('aside', 'acsv-msgdrawer');
  // 无障碍（0.9.186）：抽屉=模态对话框语义（纯属性，不改形态/视觉）
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', '私信');

  // 头部：列表标题 / 聊天返回条 复用同一容器
  var head = el('div', 'acsv-im-head');
  var back = el('button', 'acsv-im-back', '‹');
  a11y(back, '返回消息列表');
  var title = el('span', 'acsv-im-title', '私信');
  var close = el('button', 'acsv-im-close', '✕');
  a11y(close, '关闭');
  close.addEventListener('click', function (ev) { ev.stopPropagation(); closeDrawer(); });
  back.addEventListener('click', function (ev) {
    ev.stopPropagation();
    showList();
  });
  head.appendChild(back);
  head.appendChild(title);
  head.appendChild(close);
  d.appendChild(head);

  // 列表视图（0.9.75：两视图绝对定位叠在裁剪舞台上，滑入/退场走 CSS 类，见 setPane）
  var listView = el('div', 'acsv-im-listview acsv-im-pane');
  var searchWrap = el('div', 'acsv-im-searchwrap');
  var search = el('input', 'acsv-im-search');
  search.placeholder = '搜索联系人';
  search.addEventListener('click', function (ev) { ev.stopPropagation(); });
  search.addEventListener('input', function () { renderList(search.value); });
  searchWrap.appendChild(search);
  listView.appendChild(searchWrap);
  var listBody = el('div', 'acsv-im-list');
  listView.appendChild(listBody);

  // 聊天视图
  var chatView = el('div', 'acsv-im-chatview acsv-im-pane');
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

  // 舞台（0.9.75）：position:relative + overflow:hidden 承载两面板（滑出面板必须被裁剪——
  // .acsv-msgdrawer / #acsv-root 都无 overflow，不裁会滑出视口）
  var stage = el('div', 'acsv-im-stage');
  stage.appendChild(listView);
  stage.appendChild(chatView);
  d.appendChild(stage);

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

// ---------- 视图切换（0.9.75：类状态 + CSS 双向平移） ----------
// 旧实现是内联 style.display 硬切（无过渡＝生硬）。现在状态类挂抽屉根 .chat-on：列表左移
// 退场、会话从右滑入（返回反向，时长走 --acsv-dw-t 单源）；返回键显隐与面板位移都在 CSS 里。
// 关抽屉保留 chat-on：重开还是上次那个会话（与旧 display 行为一致）
function setPane(name) {
  if (!drawer) return;
  view = name;
  drawer.el.classList.toggle('chat-on', name === 'chat');
}
function showList() {
  if (!drawer) return;
  chatPoll.stop();
  setPane('list');
  drawer.title.textContent = '私信';
  refreshList();
  listPoll.start();
}
function showChat(targetId) {
  if (!drawer) return;
  listPoll.stop();
  var card = cards[targetId] || {};
  drawer.title.textContent = card.name || '用户 ' + targetId;
  setPane('chat');
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
      if (sig === listSig && drawer && view === 'list') return; // 0.9.75：视图态看 view，不再看 display
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
    // 头像走共享加载器（0.9.77，与分享面板同一份）：归一 + 重试 + 默认头像兜底；
    // 旧实现手拼 src + split('?')[0] + onerror 兜底，与 imsend 同构双份（改一处漏一处）
    imgInto(row, card.headUrl || CFG.api.defaultAvatar, 'avatar', 'acsv-im-av');
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
  // 清类时值 = 动画时长(CFG.im.flashMs) + 余量——与 styles 的 acsv-im-flash 动画**同源**
  // （此前 1300 与 CSS 1.2s 分处两地硬编码，改一处忘另一处即残留描边/闪动被截断）
  setTimeout(function () { t.classList.remove('acsv-im-flash'); }, CFG.im.flashMs + 100);
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
  if (share) return appendShareBubble(share, mine, m, cmtShareOf(m), momentShareOf(m));
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
  var src = imageUrlOf(m, lastImInst); // 换链管线 0.9.163 迁 imsend.js（inst 传参替代直读抽屉模块态）
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
      lazyObserve(img, function () {
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
// 图片懒加载观察器（0.9.76 起共用 imgload.lazyObserve 单例实现——全项目只留一份 IO：
// root 缺省=viewport，祖先滚动容器裁剪自动计入；抽屉关/拆无需重建；会话视图平移出裁剪舞台
// 期间（transform + overflow:hidden）不交叉也就不触发）
// 卡片皮肤（暗色抽屉，0.9.80）：装配逻辑在 imcard.js 共享层（与原生私信页同源），
// 这里只声明命名与图标画法——布局/视觉仍在 styles.js 的 .acsv-im-* 规则里
var SKIN = {
  tag: 'div',
  root: 'acsv-im-vcard', coverbox: 'acsv-im-vcard-coverbox', cover: 'acsv-im-vcard-cover',
  bar: 'acsv-im-vcard-bar', view: 'acsv-im-vcard-view', cmt: 'acsv-im-vcard-cmt',
  dur: 'acsv-im-vcard-dur', title: 'acsv-im-vcard-title',
  rootMine: 'mine',
  cshare: 'acsv-im-cshare', quote: 'acsv-im-cshare-quote', src: 'acsv-im-cshare-src',
  srct: 'acsv-im-cshare-srctitle', srcimg: 'acsv-im-cshare-cover',
  mimgs: 'acsv-im-cshare-mimgs', mimg: 'acsv-im-cshare-mimg', // 动态卡配图行（0.9.122）
  coverHidden: 'visibility', // 沿用 0.9.51 真机验收形态（盒子保留，防布局跳动）
  icon: function (kind) {
    var i = document.createElement('i');
    i.className = 'acsvg-cicon';
    i.style.setProperty('--acsvg-cicon', 'url(' + (kind === 'comment' ? ICON_SVGS.comment : ICON_SVGS.play) + ')');
    return i;
  }
};
// 作品分享卡（对齐手机端）：封面 + 播放/评论计数 + 时长 + 两行标题；投稿视频整卡可点跳 ac 号页。
// 卡片包 cardrow 行挂引用按钮（同条多卡各自可点，引的都是同一条消息）
function appendCardBubble(card, mine, m) {
  if (card.prologue) {
    var pre = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    pre.textContent = card.prologue;
    drawer.bubbles.appendChild(pre);
  }
  card.resourceBody.forEach(function (r) {
    var parts = vcard(SKIN, {
      href: Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : '',
      coverUrl: r.coverUrl, viewCountShow: r.viewCountShow,
      commentCountShow: r.commentCountShow, durationSec: r.durationSec, title: r.title
    }, mine);
    drawer.bubbles.appendChild(bubbleRow(parts.el, mine, m, 'cardrow'));
  });
}
// 脚本分享消息（标题\n推荐链）与 10001 同契约：卡片替代纯文本。同步先渲染消息内标题的
// 卡片骨架（整卡 href 即分享链，enrich 失败也保持可读可点，不再出现文本+卡片双份），
// dougaCard 回来后原位 patch 以接口字段为准；标题外文本作附言气泡。等待期间切走会话/视图则放弃。
// 评论转发（isCommentShare 命中）走专属评论卡——评论内容是主视觉，绝不能进视频卡的标题槽
//（会被 enrich 的视频标题覆盖，0.9.51 前评论因此整个消失）。cmt=cmtShareOf 载荷
//（extra 存活时），quote 用原始 UBB 富渲染真表情；被剥则按 wire 文本占位降级。
// 动态转发（0.9.122）走专属动态卡：动态 wire 首行也是 @作者： 形态**会过 isCommentShare**，
// 必须按 kind 先分流（否则被评论卡抢走）；动态无按 id 的读接口，不回拉 enrich
function appendShareBubble(share, mine, m, cmt, moment) {
  if (share.kind === 'moment') return appendMomentBubble(share, mine, m, moment);
  if (share.note) {
    var note = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    note.textContent = share.note;
    drawer.bubbles.appendChild(note);
  }
  var isCmt = isCommentShare(share.title);
  var parts = isCmt
    ? cshareCard(SKIN, {
        href: share.url, text: share.title,
        html: cmt && cmt.content ? ubbQuoteHtml(commentShareAuthor(share.title), cmt.content) : ''
      }, mine)
    : vcard(SKIN, { href: share.url, title: share.title }, mine);
  var cardEl = parts.el;
  drawer.bubbles.appendChild(bubbleRow(cardEl, mine, m, 'cardrow'));
  var bubbles = drawer.bubbles;
  var tid = chat && chat.targetId;
  AppAPI.dougaCard(share.acId).then(function (c) {
    if (!c || !cardEl.isConnected || !drawer || drawer.bubbles !== bubbles
      || !chat || chat.targetId !== tid) return;
    if (isCmt) patchCshare(parts, c);
    else patchVcard(parts, c);
    drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
  });
}
// 动态分享气泡（0.9.122）：extra 载荷（momentShareOf）命中富渲染正文/真图，被剥按 wire
// 文本降级——两态都出「查看动态」动态卡；附言（note）仍走独立文本气泡
function appendMomentBubble(share, mine, m, moment) {
  if (share.note) {
    var note = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
    note.textContent = share.note;
    drawer.bubbles.appendChild(note);
  }
  var parts = mcard(SKIN, {
    href: share.url, text: share.title,
    html: moment && moment.text ? ubbQuoteHtml(commentShareAuthor(share.title), moment.text) : '',
    imgs: moment ? moment.imgs : []
  }, mine);
  drawer.bubbles.appendChild(bubbleRow(parts.el, mine, m, 'cardrow'));
}
// debug 构建测试钩子（0.9.80）：卡片装配迁共享层 imcard 后，抽屉皮肤（类名/己方类/图标类/
// 封面隐藏机制/骨架补全）在 im-open 页有结构断言——不做网络与内核依赖，只验装配产物。
// 与 im-native 场景的分工：那边验原生皮肤与 attach 时序，这里验暗色皮肤
testHook('imCardSmoke', function () {
  if (!root) setRoot(document.body);
  ensureDrawerDom();
  var v = vcard(SKIN, {
    href: 'https://www.acfun.cn/v/ac1', coverUrl: '', viewCountShow: '12',
    commentCountShow: '3', title: '卡片标题'
  }, true);
  var c = cshareCard(SKIN, { href: 'https://www.acfun.cn/v/ac1#ncid=9', text: '@张三：好看' }, false);
  var mt = mcard(SKIN, { // 动态卡富态（0.9.122）：html 富渲染 + 配图行 + 查看动态条
    href: 'https://www.acfun.cn/moment/am5104327', text: '@李四：动态正文',
    html: '<span class="ubb-emotion">富渲染</span>正文',
    imgs: [{ url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', big: 'https://imgs.aixifan.com/big.jpg' }]
  }, false);
  var md = mcard(SKIN, { href: '', text: '@李四：动态正文', imgs: [] }, true); // 降级态（extra 被剥）
  drawer.bubbles.appendChild(v.el);
  drawer.bubbles.appendChild(c.el);
  drawer.bubbles.appendChild(mt.el);
  drawer.bubbles.appendChild(md.el);
  var icon = v.el.querySelector('i');
  return {
    vcardCls: v.el.className,
    vcardHref: v.el.getAttribute('href'),
    mine: v.el.classList.contains('mine'),
    view: v.view.className + '|' + v.view.textContent,
    cmt: v.cmt.className + '|' + v.cmt.textContent,
    durHidden: getComputedStyle(v.dur).display === 'none',
    title: v.title.className + '|' + v.title.textContent,
    coverHidden: getComputedStyle(v.cover).visibility === 'hidden',
    iconCls: icon ? icon.className : '',
    iconVar: icon ? icon.style.getPropertyValue('--acsvg-cicon').slice(0, 4) : '',
    cshareCls: c.el.className,
    cshareHref: c.el.getAttribute('href'),
    quoteHasViewer: !!c.quote.querySelector('.ubb-imgc, .acsv-emotimg, span, a') || c.quote.innerHTML.length > 0,
    srct: c.srct.textContent,
    srcimgHidden: getComputedStyle(c.cover).visibility === 'hidden',
    mcardCls: mt.el.className,
    mcardHref: mt.el.getAttribute('href'),
    mcardImgs: mt.el.querySelectorAll('.' + SKIN.mimg).length,
    mcardQuoteHtml: mt.quote.querySelector('.ubb-emotion') !== null,
    mcardSrct: mt.el.querySelector('.' + SKIN.srct).textContent,
    mcardDegraded: md.el.classList.contains('mine') && md.quote.textContent.indexOf('动态正文') > -1
      && md.el.querySelector('.' + SKIN.mimg) === null
  };
});
// 图片即选即发（微信/抖音 IM 惯例，不插入文本框）：读自然宽高 → 乐观占位（本地预览）→
// sendImage（SDK 内核自动传图床换 ks://，确认含上传故用 imgSendT）→ 成功摘占位补真身。
// File 留在闭包，失败点击重试整条重走（ImageMsg 每次新建，File 可重复上传）
function sendImageMsg(file) {
  var targetId = chat && chat.targetId;
  if (!targetId) return;
  if (file.size > CFG.im.imgMax) {
    errImgTooBig(Math.round(CFG.im.imgMax / 1024 / 1024));
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
      errLong('图片发送失败：' + String((err && err.message) || '').slice(0, 120));
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
    errLong('发送失败：' + String((err && err.message) || '').slice(0, 120));
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

// ---------- 开关与生命周期 ----------
// 模拟缝（harness im-open 冒烟，0.9.49 quoteChip 回归教训）：绕过登录门槛直验「抽屉 DOM
// 骨架可建可开」——quoteChip 必须是真实元素节点（工厂返回对象漏 .box 的同族回归在此拦截）
// debug 测试钩子（0.9.105）：供 harness 驱动「面板×私信避让共存」断言——open 走 openDrawerCore
// （不触发 ImSdk 预热，纯 DOM/槽位/避让链）
testHook('imdrawer', function () {
  return {
    open: function () { ensureDrawerDom(); openDrawerCore(); return true; },
    close: function () { closeDrawer(); return true; },
    isOpen: function () { return !!drawer && drawer.el.classList.contains('open'); }
  };
});

testHook('imDrawerSmoke', function () {
  if (!root) setRoot(document.body); // harness 最小页无 player 挂载，root 兜底（仅调试构建可达）
  ensureStyle(); // 0.9.88：boot 只在首页注入全量样式（im-open 页两不沾）——生产态抽屉恒在
                 // 挂载（样式随 mount 就位）之后打开，这里补齐同一前置，否则量到的 computed style 全是默认值
  ensureDrawerDom();
  drawer.el.classList.add('open');
  return {
    drawerConnected: !!(drawer.el && drawer.el.isConnected),
    drawerOpen: drawer.el.classList.contains('open'),
    quoteChipIsNode: !!(drawer.quoteChip && drawer.quoteChip.box instanceof Element),
    quoteChipInDrawer: !!(drawer.quoteChip && drawer.quoteChip.box && drawer.quoteChip.box.isConnected),
    input: !!drawer.el.querySelector('.acsv-cinput-text'),
    send: !!drawer.el.querySelector('.acsv-cinput-send'),
    bubblesConnected: !!(drawer.bubbles && drawer.bubbles.isConnected)
  };
});
// 视图态避让冒烟（0.9.73）：走真实开抽屉路径（浮层栈 + 抽屉槽 + 避让根类三步），但不拉
// ImSdk/不轮询/不依赖登录——抽屉×视图的避让几何（正文收窄/顶栏右组随容器收窄/降级）与 Esc 链的
// 确定性验证面。与 imDrawerSmoke 的分工：那个只验骨架 DOM，这个验避让编排
testHook('imOpenSmoke', function () {
  if (!root) setRoot(document.body); // harness 最小页无 player 挂载，root 兜底（仅调试构建可达）
  ensureDrawerDom();
  openDrawerCore();
  return {
    open: drawer.el.classList.contains('open'),
    withComments: root.classList.contains('acsv-with-comments'),
    drawerConnected: drawer.el.isConnected
  };
});
// 视图切换冒烟（0.9.75）：只切 setPane 状态类，不跑 loadChat/轮询/网络——「舞台裁剪 +
// 两面板位移 + 返回键显隐」这套动画契约的确定性验证面
testHook('imPaneSmoke', function (mode) {
  if (!root) setRoot(document.body);
  ensureDrawerDom();
  setPane(mode === 'chat' ? 'chat' : 'list');
  return {
    view: view,
    chatOn: drawer.el.classList.contains('chat-on'),
    backShown: getComputedStyle(drawer.back).display !== 'none'
  };
});
// 抽屉槽位（state.js 协调）：开前 claim 占槽（评论抽屉开着则被自动收回），关时 release；
// 视频避让根类由 syncCommentVars 按 currentDrawer() 统一裁决
// 开抽屉的共用核心（0.9.73 抽出）：浮层栈 + 槽位 + 避让根类三步同源。生产两入口
// （openDrawer/openChat）与测试缝（imOpenSmoke）共用——测试不再自建 .open 绕过避让路径
function openDrawerCore() {
  // overlayOpen 先于 claimDrawer：同 openComments（0.9.64 顺序回归修复，防幂等收旧清槽后摘避让类）
  overlayOpen({ id: 'im', close: closeDrawer }); // 非模态层：不拦导航键，Esc 接栈
  claimDrawer('im', closeDrawer);
  drawer.el.classList.add('open');
  syncCommentVars(); // 复用评论抽屉的避让（视频平移缩放；0.9.73 起视图正文右缘收窄，见 styles.js）
}
export function openDrawer() {
  if (!isLogined()) { errImLogin(); return; }
  ensureDrawerDom();
  prewarmIm(); // 首图提前换好 midground 令牌，进会话不等 token 往返
  openDrawerCore();
  showList();
}
export function openChat(targetId) {
  if (!isLogined()) { errImLogin(); return; }
  ensureDrawerDom();
  prewarmIm(); // 同 openDrawer：分享面板直达会话也不等 token 往返
  openDrawerCore();
  showChat(String(targetId));
}
// 「捎句话」出口注册（0.9.114）：sharepanel 不再 import 本模块（互 import 环已断）——模块求值期
// 把 openChat 注册进去；home 页本模块必经 player→imdrawer 装载，注册必达（im-open 页哨兵在册）
setChatOpener(openChat);
// 抽屉是否开着（class 是唯一真源；顶栏按钮/i 键开合判据）
export function isImOpen() {
  return !!(drawer && drawer.el && drawer.el.classList.contains('open'));
}
// 顶栏私信按钮与 i 键的开合入口（0.9.75）：关闭分支**先于登录门槛**——未登录/登录失效也能关
// （旧行为 onDrawer=openDrawer 恒开：二次点击走 overlayOpen 幂等收旧→同 tick 摘类又加类，
// 合成掉＝观感"点了没反应"）。开着就关，否则走 openDrawer（含登录门槛与 toast）
export function toggleImDrawer() {
  if (isImOpen()) { closeDrawer(); return; }
  openDrawer();
}
export function closeDrawer() {
  if (drawer) drawer.el.classList.remove('open');
  listPoll.stop();
  chatPoll.stop();
  view = '';
  releaseDrawer('im');
  overlayClose('im'); // 已出栈（Esc 路径）时空转；显式关闭路径由此同步栈
  syncCommentVars(); // 根类归 syncCommentVars 统一收拾
}
// 整体拆除（退出竖刷时 unmount 调用）：停全部轮询并重置模块态。不清的话旧 aside 引用
// 会让重进的 ensureDrawerDom 拒绝重建（抽屉打不开直到刷新），徽标轮询还会继续拉 SDK
export function teardownIm() {
  imShutdown(); // 使在途连接轮询失效：孤儿 poll 不再 forceReconnect 动共享单例（0.9.34）
  stopBadge(); // 徽标双 timer/门禁/元素引用清收（0.9.163 随 mountBadge 迁 imbadge）
  listPoll.stop();
  chatPoll.stop();
  releaseDrawer('im');
  drawer = null; view = ''; chat = null;
  cards = {}; listSig = ''; lastListRows = null;
}
