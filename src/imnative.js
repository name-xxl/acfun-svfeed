// ---------- 原生私信页增强（仅 message.acfun.cn 运行，boot.js 按 host 分流） ----------
// 官方网页私信对未注册消息类型（10001 作品卡、2026 客服卡…）只显示「不支持查看此消息」
// 占位。本模块借同页 ImSdk 的内核缓存把消息解析出来，在原生 DOM 上原位渲染——只替换
// 占位内容，气泡外壳（白底圆角/头像/头像列）全部保留原生样式。
// 解析层与脚本抽屉共享（immsg.js）：以后新消息格式在 immsg 加解析，这里加渲染分支即可。

import { CFG } from './cfg.js';
import { el } from './ui.js';
import { ICON_SVGS } from './imicons.js';
import { parseCard, parseShare, degradeText, previewOfMessage, msgContentType, msgTextOf, fmtDur } from './immsg.js';
import { AppAPI } from './appapi.js';

var UNSUPPORTED = '不支持查看此消息，请前往最新版客户端查看。';

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
  + 'padding:0 9px 9px;font-size:12px;line-height:1.45;color:#333}';
var mo = null, moTimer = null;

export function bootNativeIm() {
  // 挂载即观察，分享卡不等 SDK：解析源是消息元素自带的 data-text 属性（纯 DOM 可得），
  // 与内核是否可见无关。旧版先等 window.ImSdk 再干活——沙箱里那恒为 undefined（页面
  // SDK 在页面 world），整个模块自诞生从未激活过（0.9.29 自证日志：连就位行都不打）。
  console.info('[acsv-im] 原生页增强挂载：分享卡走 DOM-only，内核探活中');
  watch();
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
// 收到=.message-target——**旧扫描只写 .message-target，把自发分享全漏了**）。两分支：
// 占位 → 数据配对替换（需内核）；文本消息 → 分享卡替换（纯 DOM，不依赖内核）。分支
// 共用 pairMessage 的惰性 msgCache（一轮扫描至多一次 getMessages）
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
      else {
        var tip = degradeText(msg);
        if (tip && tip !== UNSUPPORTED) content.textContent = tip;
      }
      return;
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
          span.textContent = '[分享] ' + (sh.title ? sh.title.slice(0, 30) : '推荐视频');
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
    if (msgContentType(last) === 10001) {
      var prev = previewOfMessage(last);
      if (prev) span.textContent = prev;
    } else {
      var tip = degradeText(last);
      if (tip && tip !== UNSUPPORTED) span.textContent = tip;
    }
  });
}

// 卡片渲染进 Shadow DOM：宿主页 CSS 物理隔离（0.9.23 实测 .content img{height:48px}
// 的表情图规则会把封面压成长条），样式完全自持；数据一律 textContent 写入防注入
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
    content.textContent = share.note; // 原文只留附言；标题由卡片承载
    appendShadow(content, [cardItem({
      coverUrl: c.cover, viewCountShow: c.view, commentCountShow: c.comment,
      durationSec: c.durationSec, title: c.title || share.title
    }, share.url)]);
  });
}

function appendShadow(content, items, prologue) {
  var host = document.createElement('div');
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = SHADOW_CSS;
  root.appendChild(style);
  if (prologue) root.appendChild(el('div', 'prologue', prologue));
  items.forEach(function (item) { root.appendChild(item); });
  content.appendChild(host);
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
