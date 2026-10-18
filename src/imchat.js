// ---------- 私信聊天视图簇（0.9.269 自 imdrawer.js 拆出，逐字搬迁） ----------
// 会话加载/轮询/已读上报、时间相对显示与分割线、消息引用 chip（setQuote/renderQuoteChip）。
// 气泡装配仍在 imbubble.js，发送乐观 UI 在 imsendui.js；本件**不 import imdrawer**——抽屉/会话/
// 实例态与轮询工厂、气泡轮询钩子由工厂 env 注入，避免回边。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { pad2 } from './timefmt.js';
import { msgTextOf } from './immsg.js';
import { ensureIm, ensureConnected, ensureTracer } from './imsdk.js';

// env 契约：
//   getDrawer()   当前抽屉态（bubbles / quoteChip / bar）
//   getChat()     当前会话态（targetId/session/seen/msgEls/quote…）；未进会话为 null
//   setChat(c)    重建/清空会话态（imdrawer.showChat / teardownIm）
//   getInst()     最近一次轮询的 IM 实例（图片 ks:// 换链用）
//   setInst(inst) 登记最近一次 IM 实例
//   getBubble()   气泡 kit（appendBubble / msgFrom）
//   makePoller(fn, gap)  自停轮询工厂（imdrawer 共享态）
//   msgTime(m)    消息时间提取（imdrawer 单源）
export function createChatKit(env) {
  var getDrawer = env.getDrawer, getChat = env.getChat;
  var setInst = env.setInst, getBubble = env.getBubble;
  var makePoller = env.makePoller, msgTime = env.msgTime;

  var chatPoll = makePoller(function () {
    if (!getChat()) return chatPoll.stop();
    if (document.hidden) return; // 后台标签不打扰（同 followbadge/squarefeed 约定）
    ensureIm().then(function (inst) {
      if (!inst.connected) return;
      chatPollOnce(inst, false);
    }, function () { });
  }, CFG.im.drawerChatPoll);

  function loadChat() {
    ensureIm().then(function (inst) {
      return ensureConnected(inst).then(function () {
        ensureTracer(inst);
        var ss = [];
        try { ss = inst.kernel.getSessions() || []; } catch (e) { /* best-effort: sdk */ }
        var sess = null;
        ss.some(function (s) { if (String(s.targetId) === getChat().targetId) { sess = s; return true; } return false; });
        if (!sess) {
          // 没聊过：内核级创建会话后重取
          return inst.kernel.openSession(0, getChat().targetId).then(function () {
            var ss2 = inst.kernel.getSessions() || [];
            ss2.some(function (s) { if (String(s.targetId) === getChat().targetId) { sess = s; return true; } return false; });
            getChat().session = sess;
            chatPollOnce(inst, true);
            return null;
          }, function () { getChat().session = null; return null; });
        }
        getChat().session = sess;
        return chatPollOnce(inst, true);
      });
    }).catch(function () {
      if (getDrawer() && getDrawer().bubbles && !getDrawer().bubbles.children.length) {
        getDrawer().bubbles.appendChild(el('div', 'acsv-share-tip', '私信连接失败，请稍后再试\n可先复制链接去站内分享'));
      }
    });
  }
  function chatPollOnce(inst, reset) {
    setInst(inst);
    try {
      var k = inst.kernel;
      var chat = getChat();
      if (!chat) return;
      if (!chat.session) {
        var ss = k.getSessions() || [];
        ss.some(function (s) { if (String(s.targetId) === chat.targetId) { chat.session = s; return true; } return false; });
      }
      if (!chat.session) return;
      var msgs = k.getMessages(chat.session) || [];
      if (reset) { chat.seen = {}; chat.msgEls = {}; chat.lastCount = -1; getDrawer().bubbles.innerHTML = ''; }
      var fresh = [];
      msgs.forEach(function (m) {
        // 兜底 key 用内容指纹而非随机数：reset 重建 seen 后同一条消息不会二次上屏
        var key = String((m.seqId !== undefined && m.seqId) || msgTime(m) || ('h' + getBubble().msgFrom(m) + ':' + msgTextOf(m)));
        if (chat.seen[key]) return;
        chat.seen[key] = true;
        fresh.push({ m: m, key: key });
      });
      fresh.forEach(function (x) {
        getBubble().appendBubble(x.m);
        // 登记本条消息最后一个节点（文本气泡=rowwrap，卡片=vcard）作引用定位锚：
        // 引用块点击按 originMsg.seqId 反查这里
        var lastEl = getDrawer().bubbles.lastElementChild;
        if (lastEl) chat.msgEls[x.key] = lastEl;
      });
      if (fresh.length || reset) {
        getDrawer().bubbles.scrollTop = getDrawer().bubbles.scrollHeight;
        // 已读上报（内核级，headless 可用）
        try {
          if (chat.session && k.markSessionRead && chat.session.unreadCount !== undefined) k.markSessionRead(chat.session);
        } catch (e) { /* best-effort: sdk */ }
      }
    } catch (e) { /* best-effort: sdk */ }
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
    if (!ts || !getDrawer() || !getChat()) return;
    var chat = getChat();
    if (!chat.lastDivTs || ts - chat.lastDivTs >= CFG.im.dayDivGap) {
      getDrawer().bubbles.appendChild(el('div', 'acsv-im-daydiv', dayLabel(ts)));
    }
    chat.lastDivTs = ts;
  }

  // 对齐抖音相对时间：今天显时刻（刚刚/HH:MM）、昨天、一周内显星期、更早显日期（本地时区）。
  // 0.9.243 由 relTime 改名 chatTime：与 timefmt.relTime（原生四档口径）同名两义，防混用
  function chatTime(ts) {
    if (!ts) return '';
    var d = Date.now() - ts;
    if (d < 60000) return '刚刚';
    var now = new Date(), t = new Date(ts);
    if (t.toDateString() === now.toDateString()) return pad2(t.getHours()) + ':' + pad2(t.getMinutes());
    if (t.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨天';
    if (d < 604800000) return '周' + '日一二三四五六'.charAt(t.getDay());
    return pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
  }

  // ---------- 消息引用（输入条 chip；气泡内摘要条/定位在 imbubble.js） ----------
  function setQuote(q) {
    var chat = getChat();
    if (chat) chat.quote = q || null;
    renderQuoteChip();
  }
  // chip 文案与 placeholder 联动（评论侧 comments.setReply 同构）；chat 为空时只藏不显
  function renderQuoteChip() {
    if (!getDrawer()) return;
    var chip = getDrawer().quoteChip, q = getChat() && getChat().quote;
    if (!q) {
      chip.box.style.display = 'none';
      chip.label.textContent = '';
      getDrawer().bar.setPlaceholder('发个消息…');
      return;
    }
    chip.box.style.display = 'flex';
    chip.label.textContent = '引用：' + (q.preview || '原消息');
    getDrawer().bar.setPlaceholder('回复引用的内容…');
  }

  return {
    chatPoll: chatPoll, loadChat: loadChat, chatPollOnce: chatPollOnce,
    dayLabel: dayLabel, maybeDayDiv: maybeDayDiv, chatTime: chatTime,
    setQuote: setQuote, renderQuoteChip: renderQuoteChip
  };
}
