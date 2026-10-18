import { CFG } from './cfg.js';
import { el, selfUid, ensureStyle, a11y } from './ui.js'; // cookieVal 已随图片换链管线迁 imimage（0.9.266）
import { root, claimDrawer, releaseDrawer, setRoot } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { testHook } from './dbg.js';
import { ensureIm, isLogined, imShutdown } from './imsdk.js';
import { prewarmIm } from './imimage.js';
import { stopBadge } from './imbadge.js'; // 未读徽标件（0.9.163 自本模块拆出；teardown 经它收清）
import { setChatOpener } from './sharepanel.js';
import { syncCommentVars } from './comments.js';
import { mountEmotButton, EmotionMap, ensureEmotionMap } from './emoticon.js';
import { vcard, cshareCard, mcard } from './imcard.js';
import { buildInputBar, buildQuoteChip } from './inputbar.js';
import { createBubbleKit } from './imbubble.js';
import { createSendKit } from './imsendui.js';
import { createListKit } from './imlist.js';
import { createChatKit } from './imchat.js';
import { errImLogin } from './toastmsg.js'; // 话术单源（0.9.212 批⑧）

// ---------- 私信抽屉（抖音式：列表 + 聊天两视图） ----------
// 数据面全部复用 imsdk/imsend 已验证基础设施（补丁版 SDK / 连接 / 发送 / 头像）。
// 收发确认零事件依赖：新消息靠轮询 kernel.getMessages 增量（WS 推送由 SDK 内核自动
// 写入缓存，推送事件仅作即时上屏的加速路径）；已读走内核级 markSessionRead。
//
// 簇导览（0.9.269；自上而下，每段以 `// ----------` 横幅开头，grep 段名即达）：
//   共享态+自停轮询（makePoller）→ 三簇工厂装配（chat/list/send kit）→ 消息对象内省（msgTime）
//   → DOM 骨架（ensureDrawerDom）→ 视图切换（setPane/showList/showChat）→ 开关与生命周期
//   （openDrawer/openChat/toggle/closeDrawer/teardownIm + 测试缝×6）。
//   三簇已外迁（0.9.269）：列表视图→imlist.js、聊天视图+时间分割+引用 chip→imchat.js、
//   发送乐观 UI→imsendui.js；0.9.268 气泡渲染与引用条→imbubble.js。三件均经工厂 env 注入
//   抽屉/会话态，不 import 本模块（无回边）。
//   调用方向：生命周期→列表/聊天数据→气泡渲染→引用/发送，全簇单向向下；顶栏未读徽标在
//   imbadge.js、图片 URL 换链在 imimage.js（0.9.163 两缝外迁；换链 0.9.266 自 imsend 再迁）。

var drawer = null;          // { el, head, back, title, close, listView, search, listBody, chatView, bubbles, quoteChip:{box,label}, input, send }
var view = '';              // '' | 'list' | 'chat'
var cards = {};             // targetId -> {name, headUrl}（跨视图缓存）

// 自停式轮询（0.9.35 收敛 stopX/startX 模板）：tick 内调 poll.stop() 即自拆
function makePoller(fn, gap) {
  var t = null;
  function stop() { if (t) { clearInterval(t); t = null; } }
  return { start: function () { stop(); t = setInterval(fn, gap); }, stop: stop };
}
// 列表/聊天轮询分别随 imlist.js / imchat.js（0.9.269）
var chat = null;            // { targetId, name, session, lastCount, seen, lastDivTs, quote, msgEls }
// 会话态单写点（showChat 重建 / teardown 清空）：以 env.setChat 注入 imchat，宿主不另开第二份赋值
function setChat(c) { chat = c; }
var lastImInst = null;      // 最近一次轮询的 IM 实例：图片消息 ks:// 换链要用 kernel.file
// 聊天视图簇（0.9.269 自本模块拆至 imchat.js）：抽屉/会话/实例态与轮询工厂、时间提取注入，
// 聊天件不 import 本模块（无回边）
var chatKit = createChatKit({
  getDrawer: function () { return drawer; },
  getChat: function () { return chat; },
  setChat: setChat,
  getInst: function () { return lastImInst; },
  setInst: function (inst) { lastImInst = inst; },
  getBubble: function () { return bubble; },
  makePoller: makePoller,
  msgTime: msgTime
});
// 气泡渲染簇（0.9.268 自本模块拆至 imbubble.js）：抽屉/会话/实例态与引用、时间分割钩子注入，
// 渲染件不 import 本模块（无回边）
var bubble = createBubbleKit({
  getDrawer: function () { return drawer; },
  getChat: function () { return chat; },
  getInst: function () { return lastImInst; },
  setQuote: chatKit.setQuote,
  maybeDayDiv: chatKit.maybeDayDiv,
  msgTime: msgTime
});
// 发送 UI 簇（0.9.269 自本模块拆至 imsendui.js）：抽屉/会话/气泡/时间分割/轮询钩子注入，
// 发送件不 import 本模块（无回边）
var sendKit = createSendKit({
  getDrawer: function () { return drawer; },
  getChat: function () { return chat; },
  getBubble: function () { return bubble; },
  maybeDayDiv: chatKit.maybeDayDiv,
  setQuote: chatKit.setQuote,
  chatPollOnce: chatKit.chatPollOnce
});
// 列表视图簇（0.9.269 自本模块拆至 imlist.js）：抽屉/视图/联系人缓存/开聊天/轮询工厂注入，
// 列表件不 import 本模块（无回边）
var listKit = createListKit({
  getDrawer: function () { return drawer; },
  getView: function () { return view; },
  getCards: function () { return cards; },
  setCards: function (m) { Object.keys(m).forEach(function (k) { cards[k] = m[k]; }); },
  openChat: function (targetId) { showChat(targetId); },
  makePoller: makePoller,
  msgTime: msgTime,
  chatTime: chatKit.chatTime
});


// ---------- 消息对象内省：时间的降级提取（方向/文本/卡片解析随气泡簇在 imbubble.js） ----------
function msgTime(m) {
  try {
    if (m.date) return new Date(m.date).getTime() || 0;
    if (m.rawMsg && m.rawMsg.timestampMs) return Number(m.rawMsg.timestampMs) || 0;
  } catch (e) { /* best-effort: parse */ }
  return 0;
}

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
  search.addEventListener('input', function () { listKit.renderList(search.value); });
  searchWrap.appendChild(search);
  listView.appendChild(searchWrap);
  var listBody = el('div', 'acsv-im-list');
  listView.appendChild(listBody);

  // 聊天视图
  var chatView = el('div', 'acsv-im-chatview acsv-im-pane');
  var bubbles = el('div', 'acsv-im-bubbles');
  // 引用 chip：DOM 由 inputbar.buildQuoteChip 统一产出（0.9.47 起评论回复同款），置输入条上方，setQuote 驱动显隐
  var quoteChip = buildQuoteChip(function () { chatKit.setQuote(null); }, '取消引用');
  var inputBar = buildInputBar({
    // 私信 wire 是**纯文本 + 表情令牌**（收侧 imTextHtml=emotify(linkify)，官方同口径；分享消息还要
    // 刻意压平成明文）⇒ 不摆格式键与颜色键：发 [b]/[color] 给对方看到的是字面标签
    insertOnly: true,
    img: { title: '发送图片', onFile: sendKit.sendImageMsg }, // 尺寸门禁在 sendImageMsg 内
    placeholder: '发个消息…',
    // 官方单条上限（cfg.im.maxLen）在**富文本口径**下当硬闸：字数按 DOM 算（表情计 1 字），
    // 超限即拒（发送键禁用）；发送链的 slice 仍留作兜底
    maxLength: CFG.im.maxLen,
    onSend: function () {
      var t = inputBar.text().replace(/\s+$/, '');
      if (!t) return;
      inputBar.setText(''); // 清空（值 + 字数 + 空态占位一处收口）
      sendKit.sendChat(t);
    }
  });
  var input = inputBar.edit; // 引用 chip 联动 placeholder / 切会话后聚焦（renderQuoteChip、showChat）
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
  // 容器、bottom:84px 与富文本输入条（84px 高）恰好对齐，无需覆写样式
  var emotPanel = el('div', 'acsv-emotpanel');
  emotPanel.style.display = 'none';
  d.appendChild(emotPanel);
  mountEmotButton(inputBar.emotBtn, emotPanel, inputBar.insertCode);
  // 表情图渲染依赖 EmotionMap：抽屉创建即预热（localStorage 缓存命中近零开销），避免没开
  // 过面板时收到的表情消息只能显示 [表情]；首次真拉取完成后聊天视图在场就重渲一拍
  var mapCold = !EmotionMap.loaded;
  ensureEmotionMap().then(function () {
    if (!mapCold || !drawer || view !== 'chat' || !chat) return;
    ensureIm().then(function (inst) {
      if (inst.connected) chatKit.chatPollOnce(inst, true);
    }, function () { });
  });

  root.appendChild(d);
  drawer = {
    el: d, head: head, back: back, title: title, close: close,
    listView: listView, search: search, listBody: listBody,
    chatView: chatView, bubbles: bubbles, quoteChip: quoteChip, input: input, bar: inputBar, send: inputBar.send,
    setText: inputBar.setText // 切会话清草稿/失败回填单源（内容 + 字数 + 空态一处收口）
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
  chatKit.chatPoll.stop();
  setPane('list');
  drawer.title.textContent = '私信';
  listKit.refreshList();
  listKit.listPoll.start();
}
function showChat(targetId) {
  if (!drawer) return;
  listKit.listPoll.stop();
  var card = cards[targetId] || {};
  drawer.title.textContent = card.name || '用户 ' + targetId;
  setPane('chat');
  drawer.bubbles.innerHTML = '';
  // quote=待引用目标 {seqId, preview, originMsg}；msgEls=seen key→气泡主元素（引用定位用）。
  // 都是会话级状态：切会话随 chat 重建自然清空，不残留上一会话的引用
  setChat({ targetId: String(targetId), name: card.name || '', session: null, lastCount: -1, seen: {}, lastDivTs: 0, quote: null, msgEls: {} });
  chatKit.loadChat();
  drawer.setText(''); // 清掉上一会话可能残留的草稿（含镜像层重画）
  setTimeout(function () { try { drawer.input.focus(); } catch (e) { /* best-effort: cleanup */ } }, 60);
  chatKit.chatPoll.start();
}

// ---------- 列表视图（0.9.269 拆至 imlist.js：listPoll/sessionSig/refreshList/renderList/previewOf） ----------

// ---------- 聊天视图（0.9.269 拆至 imchat.js：chatPoll/loadChat/chatPollOnce/时间/引用 chip） ----------
// debug 构建测试钩子（0.9.80）：卡片装配迁共享层 imcard 后，抽屉皮肤（类名/己方类/图标类/
// 封面隐藏机制/骨架补全）在 im-open 页有结构断言——不做网络与内核依赖，只验装配产物。
// 与 im-native 场景的分工：那边验原生皮肤与 attach 时序，这里验暗色皮肤
testHook('imCardSmoke', function () {
  if (!root) setRoot(document.body);
  ensureDrawerDom();
  var v = vcard(bubble.SKIN, {
    href: 'https://www.acfun.cn/v/ac1', coverUrl: '', viewCountShow: '12',
    commentCountShow: '3', title: '卡片标题'
  }, true);
  var c = cshareCard(bubble.SKIN, { href: 'https://www.acfun.cn/v/ac1#ncid=9', text: '@张三：好看' }, false);
  var mt = mcard(bubble.SKIN, { // 动态卡富态（0.9.122）：html 富渲染 + 配图行 + 查看动态条
    href: 'https://www.acfun.cn/moment/am5104327', text: '@李四：动态正文',
    html: '<span class="ubb-emotion">富渲染</span>正文',
    imgs: [{ url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', big: 'https://imgs.aixifan.com/big.jpg' }]
  }, false);
  var md = mcard(bubble.SKIN, { href: '', text: '@李四：动态正文', imgs: [] }, true); // 降级态（extra 被剥）
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
    mcardImgs: mt.el.querySelectorAll('.' + bubble.SKIN.mimg).length,
    mcardQuoteHtml: mt.quote.querySelector('.ubb-emotion') !== null,
    mcardSrct: mt.el.querySelector('.' + bubble.SKIN.srct).textContent,
    mcardDegraded: md.el.classList.contains('mine') && md.quote.textContent.indexOf('动态正文') > -1
      && md.el.querySelector('.' + bubble.SKIN.mimg) === null
  };
});
// 气泡渲染冒烟（0.9.268）：拆件前先钉住 appendBubble 的分流产物——己方/对方文本、extra 引用条、
// 10001 作品卡。假消息直调渲染入口，不碰网络/内核；图片分支会触发鉴权换链，留给后续场景。
testHook('imBubbleSmoke', function () {
  if (!root) setRoot(document.body);
  ensureDrawerDom();
  setChat({
    targetId: '9001', name: '', session: null, lastCount: -1,
    seen: {}, lastDivTs: 0, quote: null, msgEls: {}
  });
  drawer.bubbles.innerHTML = '';
  var enc = new TextEncoder();
  var uid = selfUid();
  bubble.appendBubble({ fromUserId: uid, text: '你好', rawMsg: { contentType: 0 } });
  bubble.appendBubble({ fromUserId: '9002', text: '对方消息', rawMsg: { contentType: 0 } });
  bubble.appendBubble({
    fromUserId: '9002', text: '引用正文',
    rawMsg: {
      contentType: 0,
      extra: enc.encode(JSON.stringify({
        acsvQuote: { seqId: '11', preview: '原消息', text: '引用正文' }
      }))
    }
  });
  bubble.appendBubble({
    fromUserId: '9002',
    rawMsg: {
      contentType: 10001,
      content: enc.encode(JSON.stringify({
        prologue: '',
        resourceBody: [{
          resourceType: 2, resourceId: '488900', title: '卡片标题', coverUrl: '',
          viewCountShow: '1', commentCountShow: '2', durationSec: 60
        }]
      }))
    }
  });
  var bubbles = drawer.bubbles;
  return {
    uid: uid,
    bubbles: bubbles.querySelectorAll('.acsv-im-bubble').length,
    mine: bubbles.querySelectorAll('.acsv-im-bubble.mine').length,
    text: bubbles.querySelectorAll('.acsv-im-msgtext').length,
    quote: bubbles.querySelectorAll('.acsv-im-quote').length,
    quoteLink: bubbles.querySelectorAll('.acsv-im-quote.link').length,
    quotePreview: (bubbles.querySelector('.acsv-im-quote-preview') || {}).textContent || '',
    quotebtn: bubbles.querySelectorAll('.acsv-im-quotebtn').length,
    card: bubbles.querySelectorAll('.acsv-im-vcard').length,
    daydiv: bubbles.querySelectorAll('.acsv-im-daydiv').length
  };
});
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
    input: !!drawer.el.querySelector('.acsv-cinput-edit'),
    send: !!drawer.el.querySelector('.acsv-cinput-send'),
    // 0.9.240：私信条＝纯文本宿主——格式键/颜色键一个都不该有（wire 方言不支持 UBB）
    fmtKeys: drawer.el.querySelectorAll('.acsv-cinput-fmt').length,
    colKeys: drawer.el.querySelectorAll('.acsv-cinput-colkey').length,
    seps: drawer.el.querySelectorAll('.acsv-fmtsep').length,
    insertKeys: drawer.el.querySelectorAll('.acsv-cinput-emot, .acsv-cinput-img').length,
    plain: !!(drawer.bar && drawer.bar.plain),
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
  listKit.listPoll.stop();
  chatKit.chatPoll.stop();
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
  listKit.listPoll.stop();
  chatKit.chatPoll.stop();
  releaseDrawer('im');
  drawer = null; view = ''; setChat(null);
  cards = {}; listKit.reset();
}
