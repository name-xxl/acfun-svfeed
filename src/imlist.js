// ---------- 私信列表视图簇（0.9.269 自 imdrawer.js 拆出，逐字搬迁） ----------
// 联系人列表的拉取/增量签名/渲染/预览映射与列表轮询。抽屉骨架、视图切换与生命周期仍在
// imdrawer.js；本件**不 import imdrawer**——抽屉/视图/联系人缓存与跨簇钩子（开聊天、轮询工厂、
// 时间格式）由工厂 env 注入，避免回边。
import { CFG } from './cfg.js';
import { el, esc, selfUid } from './ui.js';
import { imgInto } from './imgload.js';
import { msgTextOf, previewOfMessage } from './immsg.js';
import { ensureIm, ensureConnected } from './imsdk.js';
import { fetchCards } from './imsend.js';

// env 契约：
//   getDrawer()  当前抽屉态（search / listBody / title）
//   getView()    当前视图（'' | 'list' | 'chat'）
//   getCards()   联系人缓存（targetId -> {name, headUrl}）
//   setCards(m)  合并一次 fetchCards 回包进缓存
//   openChat(id) 行点击进聊天（imdrawer.showChat 编排）
//   makePoller(fn, gap)  自停轮询工厂（imdrawer 共享态）
//   msgTime(m) / chatTime(ts)  时间提取与相对时间（imdrawer / imchat 单源）
export function createListKit(env) {
  var getDrawer = env.getDrawer, getView = env.getView;
  var getCards = env.getCards, setCards = env.setCards;
  var openChat = env.openChat, makePoller = env.makePoller;
  var msgTime = env.msgTime, chatTime = env.chatTime;

  var listSig = '';
  var lastListRows = null;
  var listPoll = makePoller(function () {
    if (getView() !== 'list') return listPoll.stop();
    if (document.hidden) return; // 后台标签不打扰（同 followbadge/squarefeed 约定）
    refreshList();
  }, CFG.im.drawerListPoll);

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
        try { ss = inst.kernel.getSessions() || []; } catch (e) { /* best-effort: sdk */ }
        ss = ss.map(function (s) {
          // 末条从消息库派生：发送即时进库（聊天视图同源），预览/排序随之即时更新；
          // 会话冗余字段 lastMessage 只作回退（SDK 发送后不更新它）
          var last = s.lastMessage || null;
          try {
            var msgs = inst.kernel.getMessages(s) || [];
            if (msgs.length) last = msgs[msgs.length - 1];
          } catch (e) { /* best-effort: sdk */ }
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
        if (sig === listSig && getDrawer() && getView() === 'list') return; // 0.9.75：视图态看 view，不再看 display
        listSig = sig;
        return fetchCards(ids).then(function (m) {
          setCards(m);
          // 0.9.236：轮询刷新保留搜索词与滚动位置（此前 renderList('',…)：新消息一到，
          // 过滤失效全量回显 + 列表回顶——用户正在搜索时被"重置"）
          var kw = getDrawer() && getDrawer().search ? getDrawer().search.value : '';
          var st0 = getDrawer() && getDrawer().listBody ? getDrawer().listBody.scrollTop : 0;
          renderList(kw, ss);
          if (getDrawer() && getDrawer().listBody) getDrawer().listBody.scrollTop = st0;
        });
      });
    }).catch(function () {
      if (getDrawer() && getDrawer().listBody && !getDrawer().listBody.children.length) {
        getDrawer().listBody.innerHTML = '';
        getDrawer().listBody.appendChild(el('div', 'acsv-share-tip', '私信连接失败，请稍后再试\n可先复制链接去站内分享'));
      }
    });
  }
  function renderList(kw, ss) {
    if (!getDrawer()) return;
    kw = String(kw || '').trim().toLowerCase();
    var rows = (ss || lastListRows || []);
    if (ss) lastListRows = ss;
    // 标题带未读总数（对齐抖音「消息 (1)」）
    var unreadTotal = 0;
    rows.forEach(function (r) { unreadTotal += r.unread || 0; });
    if (getView() === 'list') getDrawer().title.textContent = '私信' + (unreadTotal > 0 ? ' (' + unreadTotal + ')' : '');
    getDrawer().listBody.innerHTML = '';
    var shown = 0;
    rows.forEach(function (r) {
      var card = getCards()[r.targetId] || {};
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
      var tm = el('div', 'acsv-im-time', chatTime(r.t));
      row.appendChild(tm);
      row.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openChat(r.targetId);
      });
      getDrawer().listBody.appendChild(row);
    });
    if (!shown) {
      getDrawer().listBody.appendChild(el('div', 'acsv-share-tip',
        kw ? '没有匹配的联系人' : '还没有聊过天的朋友\n先在 A 站 APP / 网页和 TA 私聊一句\n再回来把视频分享给 TA'));
    }
  }
  // 文本消息预览前缀在 immsg.previewOfMessage 统一映射：脚本分享格式出「[分享] 标题」，
  // 其余 acfun 链接出「[视频] …」——对齐抖音「分享[视频]」的辨识度
  function previewOf(r) {
    return r.last ? previewOfMessage(r.last) : '';
  }
  // 拆壳重置（teardownIm）：签名与末次行集归零，重开抽屉时同会话集不得因旧签名跳过重绘
  function reset() {
    listSig = '';
    lastListRows = null;
  }

  return {
    listPoll: listPoll, refreshList: refreshList, renderList: renderList,
    previewOf: previewOf, reset: reset
  };
}
