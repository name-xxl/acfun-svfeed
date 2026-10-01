// ---------- 原生私信页增强（仅 message.acfun.cn 运行，boot.js 按 host 分流） ----------
// 官方网页私信对未注册消息类型（10001 作品卡、2026 客服卡…）只显示「不支持查看此消息」
// 占位。本模块借同页 ImSdk 的内核缓存把消息解析出来，在原生 DOM 上原位渲染——只替换
// 占位内容，气泡外壳（白底圆角/头像/头像列）全部保留原生样式。
// 解析层与脚本抽屉共享（immsg.js）：以后新消息格式在 immsg 加解析，这里加渲染分支即可。

import { CFG } from './cfg.js';
import { el, esc } from './ui.js';
import { ICON_SVGS } from './imicons.js';
import { EmotionMap, ensureEmotionMap } from './emoticon.js';
import { parseCard, parseShare, isCommentShare, degradeText, previewOfMessage, msgContentType, msgTextOf, fmtDur, quoteOf, quoteExtraOf, quoteWireTrimLen } from './immsg.js';
import { AppAPI } from './appapi.js';

var UNSUPPORTED = '不支持查看此消息，请前往最新版客户端查看。';

// 表情码转图（评论卡引用块用；与 imdrawer.emotify 同构同契约——入参须是已 esc 的
// HTML 文本，EmotionMap 未加载/查无此 ID 降级「[表情]」文本，方言包走 umeditor 老图）
function emotifyHtml(html) {
  return html
    .replace(/\[emot=acfun,(\S+?)\/\]/g, function (_, id) {
      var it = EmotionMap.map && EmotionMap.map[id];
      return (it && it.url)
        ? '<img class="cshare-emot" src="' + it.url + '" referrerpolicy="no-referrer" alt="">'
        : '[表情]';
    })
    .replace(/\[emot=(\S+?),(\S+?)\/\]/g,
      '<img class="cshare-emot" src="//cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/$1/$2.gif" referrerpolicy="no-referrer" alt="">');
}

// 卡片样式只存在于 Shadow DOM 内：宿主页 CSS（如 .content img{height:48px} 的表情图
// 规则）物理隔离，封面按原始比例完整呈现。气泡外壳留在 light DOM，保留原生观感。
// 计数图标 = 站点原生 SVG（imicons 登记表）+ CSS mask currentColor 着色。
// 尺寸（0.9.31 用户反馈「卡片太大违和」）：紧凑聊天卡——限宽 228px、封面定高裁切
// （object-fit:cover，原始比例的高封面在聊天里太占屏），字号/内边距整体收一档
var SHADOW_CSS = ''
  + ':host{display:block}'
  + '.prologue{margin:0 0 6px;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap}'
  + '.item{display:block;width:228px;max-width:100%;margin:4px 0;border:1px solid #e7e7e7;'
  + 'border-radius:8px;background:#fff;overflow:hidden;text-decoration:none;color:inherit;'
  + 'transition:border-color .15s}'
  + '.item:hover{border-color:#fd4c5d}'
  + 'a.item:hover .title{color:#fd4c5d}'
  + '.coverbox{display:block;position:relative}'
  + '.cover{display:block;width:100%;height:126px;object-fit:cover;background:#f2f2f2}'
  + '.meta{display:flex;align-items:center;gap:4px;padding:5px 8px;font-size:11px;color:#999}'
  + '.meta .icon{display:inline-block;width:12px;height:12px;flex:none;background:currentColor;'
  + '-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}'
  + '.dur{margin-left:auto;font-variant-numeric:tabular-nums}'
  + '.title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;'
  + 'padding:0 9px 9px;font-size:12px;line-height:1.45;color:#333}'
  // 消息引用（浅色主题，配官方白底气泡）：黑系内嵌+2px 主题红左边线，与抽屉同一设计语言
  + '.qstrip{display:block;margin:0 0 6px;padding:4px 8px;border-left:2px solid #fd4c5d;'
  + 'background:rgba(0,0,0,.045);border-radius:3px;font-size:12px;color:#666;line-height:1.5;min-width:0}'
  + '.qstrip.link{cursor:pointer}'
  + '.qstrip.link:hover{background:rgba(0,0,0,.08)}'
  + '.qstrip .p{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.qbody{display:block;margin:0;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap}'
  // 评论转发卡（0.9.51，浅色配官方白底；评论原文主视觉 + 来源作品小条，语言同 qstrip）
  + '.cshare{display:block;width:228px;max-width:100%;margin:4px 0;border:1px solid #e7e7e7;'
  + 'border-radius:8px;background:#fff;overflow:hidden;text-decoration:none;color:inherit;'
  + 'transition:border-color .15s}'
  + 'a.cshare:hover{border-color:#fd4c5d}'
  + '.cshare .quote{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;'
  + 'padding:8px 10px;border-left:2px solid #fd4c5d;font-size:13px;line-height:1.55;color:#333;'
  + 'white-space:pre-wrap;word-break:break-word}'
  + '.cshare .quote .cshare-emot{display:inline-block;max-height:34px;max-width:68px;'
  + 'vertical-align:middle;margin:1px 2px}'
  + '.cshare .src{display:flex;align-items:center;gap:8px;padding:7px 9px;border-top:1px solid #efefef}'
  + '.cshare .srcimg{flex:none;width:56px;height:36px;object-fit:cover;border-radius:4px;background:#f2f2f2}'
  + '.cshare .srct{flex:1;min-width:0;font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
var mo = null, moTimer = null;

export function bootNativeIm() {
  // 挂载即观察，分享卡不等 SDK：解析源是消息元素自带的 data-text 属性（纯 DOM 可得），
  // 与内核是否可见无关。旧版先等 window.ImSdk 再干活——沙箱里那恒为 undefined（页面
  // SDK 在页面 world），整个模块自诞生从未激活过（0.9.29 自证日志：连就位行都不打）。
  console.info('[acsv-im] 原生页增强挂载 v' + __ACSV_VERSION__ + '：分享卡走 DOM-only，内核探活中');
  watch();
  ensureEmotionMap(); // 评论卡引用块渲染表情码需要 EmotionMap：预热（localStorage miss 走接口）
  // 内核探活（kernel() 走 unsafeWindow 读页面 world）只解锁占位替换（10001 卡），
  // 常驻轮询永不放弃；探不到只影响占位替换，不影响分享卡
  var n = 0;
  (function waitKernel() {
    if (kernel()) {
      console.info('[acsv-im] 页面 ImSdk 内核就位，占位替换已解锁');
      enhance();
      return;
    }
    setTimeout(waitKernel, ++n > 120 ? 1000 : 250);
  })();
}

function watch() {
  if (mo) return;
  try {
    mo = new MutationObserver(function () {
      clearTimeout(moTimer);
      moTimer = setTimeout(enhance, 200);
    });
    // 容器缺失时退回 body 级观察：SPA 的会话窗格随时重建，锚死单一节点且它当时不在，
    // 等于一个观察器都不装，之后所有渲染永远不触发重扫
    mo.observe(document.querySelector('.container-im') || document.body,
      { childList: true, subtree: true });
  } catch (e) { }
}

function kernel() {
  // 页面 world 读取：站点自己加载的 ImSdk 活在页面 window，沙箱里 window.ImSdk 恒
  // undefined（0.9.29 实锤：轮询条件永不成立，整个模块从未激活过）。读页面 world 必须
  // 走 unsafeWindow；window 兜底兼容直接注入页面 world 的情形
  try {
    var uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    var sdk = (uw && uw.ImSdk) || window.ImSdk;
    return (sdk && sdk.instance && sdk.instance.kernel) || null;
  } catch (e) { return null; }
}

function enhance() {
  try { enhanceChat(); } catch (e) { }
  try { enhanceList(); } catch (e) { }
}

// 会话窗格扫描：锚在每条消息 `.chat-content-item .message` 上（实测结构 2026-09-30：
// 线程容器 chat-content-item[data-id=0_{tid}] 内是逐条 message 元素，每条自带
// data-id/data-seq-id/data-text 原始全文与 .content 气泡体；自发=.message-self、
// 收到=.message-target——**旧扫描只写 .message-target，把自发分享全漏了**）。三分支：
// 占位 → 数据配对替换（需内核）；引用消息 → 补引用摘要条（见下）；文本消息 → 分享卡
// 替换（纯 DOM，不依赖内核）。分支共用 pairMessage 的惰性 msgCache（一轮扫描至多一次 getMessages）
function enhanceChat() {
  var msgCache = {};
  document.querySelectorAll('.chat-content-item .message').forEach(function (msgEl) {
    if (msgEl.getAttribute('data-acsv')) return;
    var content = msgEl.querySelector('.content');
    if (!content) return;
    var text = content.textContent.trim();
    if (text === UNSUPPORTED) {
      var msg = pairMessage(msgEl, msgCache);
      if (!msg) return;
      msgEl.setAttribute('data-acsv', '1');
      var card = parseCard(msg);
      if (card) renderCard(content, card);
      else if (renderQuote(content, msg)) { } // 引用消息（占位形态）：摘要条+正文整体替换
      else {
        var tip = degradeText(msg);
        if (tip && tip !== UNSUPPORTED) content.textContent = tip;
      }
      return;
    }
    // 引用消息正文可读形态：官方对 type 12 的展示形态真机才能确认——若直接显示正文
    // （ReferenceMsg 自带 .text），在这里把引用摘要条补到正文上方。配对成功即打标
    //（普通文本消息不再重复配对；配对失败不打标留给下一轮），识别成功即止不再走分享卡
    //（回复正文带链接时归属引用）。extra 通道的官方正文是发送侧拼接文本「[引用] 摘要␤回复」，
    // 补条前先剥掉拼接前缀只留回复，否则摘要出现两份（0.9.42）；形态不识别（type 12 等）
    // 维持只补条不动正文的兜底。剥离成败各打一条带正文样本的自证日志（每条消息至多
    // 一次，靠打标幂等）——「新代码在不在跑/为何没剥」远程可判读，不重演 0.9.29 哑火
    if (!msgEl.getAttribute('data-acsv-quote')) {
      var m2 = pairMessage(msgEl, msgCache);
      if (m2) {
        msgEl.setAttribute('data-acsv-quote', '1');
        var q2x = quoteExtraOf(m2);
        var q2 = quoteOf(m2) || q2x;
        if (q2 && (q2.preview || q2.seqId)) {
          var trimLen = quoteWireTrimLen(content.textContent, q2);
          if (trimLen > 0) {
            if (stripLeadingContent(content, trimLen)) {
              console.info('[acsv-im] 引用正文剥离 wire 前缀 ' + trimLen + ' 字');
            } else {
              console.info('[acsv-im] 引用正文 DOM 跨界，放弃剥离保留原文：' + bodySample(content));
            }
          } else if (q2x) { // type 12 形态未知不打；extra 通道对不上拼接形态才值得留痕
            console.info('[acsv-im] 引用正文未识别拼接形态，保留原文：' + bodySample(content));
          }
          prependQuoteStrip(content, q2);
          return;
        }
      }
    }
    tryShareCard(msgEl, content, msgCache);
  });
}

// msgEl ↔ 内核消息配对（占位替换的兜底数据通道）：tid 从线程容器 data-id（0_{tid}）
// 反查，消息按自身 data-id/data-seq-id 命中——不依赖 activeSession 的切换时序。
// 查找失败返回 null，由调用方不打标记留给下一轮（observer 触发重扫）
function pairMessage(msgEl, msgCache) {
  var k = kernel();
  if (!k) return null;
  var thread = msgEl.closest('.chat-content-item');
  var tid = thread ? String(thread.getAttribute('data-id') || '').replace(/^0_/, '') : '';
  if (!tid) return null;
  if (!msgCache[tid]) {
    var sess = null;
    try {
      (k.getSessions() || []).some(function (s) {
        if (String(s.targetId) === tid) { sess = s; return true; }
        return false;
      });
    } catch (e) { }
    var by = {};
    if (sess) {
      try {
        (k.getMessages(sess) || []).forEach(function (m) {
          var raw = m.rawMsg || {};
          if (raw.seqId !== undefined) by[String(raw.seqId)] = m;
          if (raw.id) by['id:' + raw.id] = m;
        });
      } catch (e) { }
    }
    msgCache[tid] = by;
  }
  return msgCache[tid]['id:' + msgEl.getAttribute('data-id')] ||
    msgCache[tid][String(msgEl.getAttribute('data-seq-id'))] || null;
}

// 会话列表：.chat-nav-item 自带 data-user-id，直接映射会话。分享预览改写是纯 DOM
//（span.textContent）不依赖内核；占位预览改写才需要内核（未就位就留给下一轮）
function enhanceList() {
  var k = kernel();
  var byUid = null;
  document.querySelectorAll('.chat-nav-item[data-user-id]').forEach(function (nav) {
    var span = nav.querySelector('.content-last-message');
    if (!span || span.getAttribute('data-acsv')) return;
    if (span.textContent.trim() !== UNSUPPORTED) {
      // 脚本分享文本：原生原样展示会把长 URL 顶满预览行，改写成「[分享] 标题」
      if (!span.getAttribute('data-acsv-share')) {
        var sh = parseShare(span.textContent);
        if (sh) {
          span.setAttribute('data-acsv-share', '1');
          span.textContent = (isCommentShare(sh.title) ? '[评论] ' : '[分享] ')
            + (sh.title ? sh.title.slice(0, 30) : '推荐视频');
        }
      }
      return;
    }
    if (!k) return;
    if (!byUid) {
      byUid = {};
      (k.getSessions() || []).forEach(function (s) { byUid[String(s.targetId)] = s; });
    }
    var sess = byUid[nav.getAttribute('data-user-id')];
    var last = sess && sess.lastMessage;
    if (!last) return;
    span.setAttribute('data-acsv', '1');
    var ct = msgContentType(last);
    if (ct === 10001 || ct === 12) { // 10001 作品卡 / 12 引用消息：previewOfMessage 已统一映射
      var prev = previewOfMessage(last);
      if (prev) span.textContent = prev;
    } else {
      var tip = degradeText(last);
      if (tip && tip !== UNSUPPORTED) span.textContent = tip;
    }
  });
}

// 卡片渲染进 Shadow DOM：宿主页 CSS 物理隔离（0.9.23 实测 .content img{height:48px}
// 的表情图规则会把封面压成长条），样式完全自持。数据一律经 el() 写入——0.9.36 起
// el() 即 textContent，HTML 注入结构性不可能（0.9.33 曾以 esc+innerHTML 防守同一面）
function renderCard(content, card) {
  content.textContent = '';
  appendShadow(content, card.resourceBody.map(function (r) { return cardItem(r); }), card.prologue);
}

// 分享识别 → dougaCard 富化 → 渲染，公共尾部。dougaCard 失败打一次 warn
//（恒为 resolve(null)，不 warn 出问题时零线索）；解析命中即打标记防 observer 重复请求
function enrichShare(share, mount) {
  AppAPI.dougaCard(share.acId).then(function (c) {
    if (!c) {
      console.warn('[acsv-im] 分享卡详情拉取失败 ac' + share.acId + '（保持纯文本）');
      return;
    }
    mount(c);
  });
}

// 文本消息的分享卡（dougaCard 成功才替换——原文改写为附言 + 卡片，对齐官方
// prologue+card，失败保持原文一字不动）。解析三源（保序）：
// ① `data-text` 属性 = 原始消息全文（实测原生把它原样写在每条 .message 上，换行完整，
//    是权威文本源——.content 里 <br> 不产生文本，textContent 换行必丢）；
// ② content.textContent（容忍式契约兜「标题URL」拼接/空格形态）；
// ③ 内核配对（前两者都失配才付 getMessages 代价）
function tryShareCard(msgEl, content, msgCache) {
  if (msgEl.getAttribute('data-acsv-share')) return;
  var raw = msgEl.getAttribute('data-text') || '';
  var plain = content.textContent;
  var share = parseShare(raw) || parseShare(plain);
  if (!share) {
    if (!/acfun\.cn/i.test(raw) && !/acfun\.cn/i.test(plain)) return;
    var msg = pairMessage(msgEl, msgCache);
    if (msg) share = parseShare(msgTextOf(msg));
  }
  if (!share) return;
  msgEl.setAttribute('data-acsv-share', '1');
  console.info('[acsv-im] 识别到分享消息 ac' + share.acId + '，拉取卡片详情');
  enrichShare(share, function (c) {
    if (!content.isConnected) return;
    if (isCommentShare(share.title)) {
      // 评论转发：原文（引用行+URL 行）整体由卡片承载，官方气泡只留附言——保留原文会与
      // 卡片引用块重复（0.9.52 真机截图实证）。quote 富渲染表情（0.9.53 wire 携原始码）
      content.textContent = share.note || '';
      var it = cshareItem(share.title, share.url);
      if (c.cover) it.img.src = c.cover;
      if (c.title) it.srct.textContent = c.title;
      appendShadow(content, [it.item]);
      return;
    }
    content.textContent = share.note; // 原文只留附言；标题由卡片承载
    appendShadow(content, [cardItem({
      coverUrl: c.cover, viewCountShow: c.view, commentCountShow: c.comment,
      durationSec: c.durationSec, title: c.title || share.title
    }, share.url)]);
  });
}

function appendShadow(content, items, prologue) {
  var sh = attachShadowRoot(content);
  content.appendChild(sh.host);
  if (prologue) sh.root.appendChild(el('div', 'prologue', prologue));
  items.forEach(function (item) { sh.root.appendChild(item); });
}

// Shadow DOM 宿主构建（appendShadow / 引用条共用）：样式表随宿主走，宿主由调用方决定
// 追加还是插到 .content 首位（引用条在官方正文上方）
function attachShadowRoot(content) {
  var host = document.createElement('div');
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = SHADOW_CSS;
  root.appendChild(style);
  return { host: host, root: root };
}

// ---------- 消息引用渲染（0.9.39 补条；0.9.42 起正文去重：剥 wire 拼接前缀） ----------
// 摘要条：有 seqId 锚点才可点，按官方 message 元素自带的 data-seq-id 定位滚动
function quoteStripEl(q) {
  var s = el('div', 'qstrip' + (q.seqId ? ' link' : ''));
  s.appendChild(el('span', 'p', q.preview || '[原消息]'));
  if (q.seqId) {
    s.addEventListener('click', function (ev) {
      ev.stopPropagation();
      try {
        var t = document.querySelector('.chat-content-item .message[data-seq-id="'
          + String(q.seqId).replace(/"/g, '') + '"]');
        if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (e) { }
    });
  }
  return s;
}
// 占位替换形态：摘要条 + 回复正文整体进 Shadow DOM。返回 false = 两条通道都解析不出，
// 调用方回落 degradeText 文案
function renderQuote(content, msg) {
  var q = quoteOf(msg) || quoteExtraOf(msg);
  if (!q) return false;
  content.textContent = '';
  var sh = attachShadowRoot(content);
  content.appendChild(sh.host);
  sh.root.appendChild(quoteStripEl(q));
  sh.root.appendChild(el('div', 'qbody', q.text));
  return true;
}
// 正文可读形态：官方正文上方补摘要条。extra 通道的官方正文是发送侧 wire 拼接文本
//（「[引用] 摘要␤回复」，immsg.quoteWireText），调用方先按 quoteWireTrimLen 剥掉前缀，
// 剥不动（形态不识别）才原样保留
function prependQuoteStrip(content, q) {
  var sh = attachShadowRoot(content);
  sh.root.appendChild(quoteStripEl(q));
  content.insertBefore(sh.host, content.firstChild);
}

// 正文样本（诊断日志用）：JSON 序列化让换行/空格显形，截 80 字符防刷屏
function bodySample(content) {
  return JSON.stringify(String(content.textContent || '').slice(0, 80));
}

// 外科手术式前缀剥离（quoteWireTrimLen 的 DOM 执行端）：按校验过的累计文本长度从头部
// 摘节点。文本节点跨边界切片（官方正文常把整段排进少量文本节点，主场景）；元素节点
// 跨界则预检后整体放弃（全有或全无，绝不剥一半）。到达边界后顺手摘掉贴界的零文本
// 节点——换行渲染成的 <br> 不产生文本，不摘会留「空行+回复」（0.9.42 实缺陷）；遇首个
// 非空节点收工，回复自身多行的 <br> 不会误伤
function stripLeadingContent(content, trimLen) {
  // 官方若把正文排进唯一包裹元素（<div>/<span>），下钻到真正排字的层级再走
  while (content.childNodes.length === 1
    && content.firstChild.nodeType === 1
    && content.firstChild.textContent === content.textContent) {
    content = content.firstChild;
  }
  var kids = Array.prototype.slice.call(content.childNodes);
  var acc = 0, i, k, n;
  for (i = 0; i < kids.length; i++) { // 预检：跨界元素即放弃，正文一字不动
    if (acc >= trimLen) break;
    k = kids[i];
    n = (k.nodeType === 3 ? k.nodeValue : k.textContent) || '';
    if (acc + n.length > trimLen && k.nodeType !== 3) return false;
    acc += n.length;
  }
  acc = 0;
  for (i = 0; i < kids.length && acc <= trimLen; i++) {
    k = kids[i];
    n = (k.nodeType === 3 ? k.nodeValue : k.textContent) || '';
    if (acc === trimLen) {
      if (n !== '') break; // 正文开始，收工
      content.removeChild(k); // 贴界零文本节点（<br>/空文本）顺手清掉
      continue;
    }
    if (acc + n.length > trimLen) { k.nodeValue = k.nodeValue.slice(trimLen - acc); acc = trimLen; } // 预检保证此处必为文本节点
    else { content.removeChild(k); acc += n.length; }
  }
  return true;
}

// 单张卡片（10001 协议卡与脚本分享卡共用）：封面+播放/评论计数+时长+两行标题；
// hrefOverride 给出则整卡可点（协议卡按 resourceType 投稿视频自跳 ac 号页）
function cardItem(r, hrefOverride) {
  var href = hrefOverride
    || (Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : '');
  var a = el(href ? 'a' : 'div', 'item');
  if (href) {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
  }
  var box = el('span', 'coverbox');
  var img = el('img', 'cover');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.src = r.coverUrl || '';
  img.addEventListener('error', function () { img.style.display = 'none'; });
  box.appendChild(img);
  var meta = el('span', 'meta');
  var playIcon = el('i', 'icon');
  playIcon.style.setProperty('--i', 'url("' + ICON_SVGS.play + '")');
  meta.appendChild(playIcon);
  meta.appendChild(el('span', null, r.viewCountShow || ''));
  var commentIcon = el('i', 'icon');
  commentIcon.style.setProperty('--i', 'url("' + ICON_SVGS.comment + '")');
  meta.appendChild(commentIcon);
  meta.appendChild(el('span', null, r.commentCountShow || ''));
  if (r.durationSec) meta.appendChild(el('span', 'dur', fmtDur(r.durationSec)));
  box.appendChild(meta);
  a.appendChild(box);
  if (r.title) a.appendChild(el('span', 'title', r.title));
  a.addEventListener('click', function (ev) { ev.stopPropagation(); });
  return a;
}
// 评论转发条目（0.9.51）：官方文本气泡保留原文（就是评论主视觉），我们只在下方补
// 来源作品小条。封面 enrich 回来再上，img 先 display:none、load 放出，防裂图占位
function cshareItem(text, href) {
  var a = el(href ? 'a' : 'div', 'cshare');
  if (href) {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
  }
  var quote = el('span', 'quote');
  quote.innerHTML = emotifyHtml(esc(text)); // 评论正文富渲染：表情码出真图（wire 携原始码，0.9.53）
  a.appendChild(quote);
  var src = el('span', 'src');
  var img = el('img', 'srcimg');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.style.display = 'none';
  img.addEventListener('load', function () { img.style.display = ''; });
  img.addEventListener('error', function () { img.style.display = 'none'; });
  src.appendChild(img);
  var srct = el('span', 'srct', '查看来源作品');
  src.appendChild(srct);
  a.appendChild(src);
  a.addEventListener('click', function (ev) { ev.stopPropagation(); });
  return { item: a, img: img, srct: srct };
}
