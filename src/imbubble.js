// ---------- 私信气泡渲染簇（0.9.268 自 imdrawer.js 拆出，逐字搬迁） ----------
// 聊天视图内「一条消息 → 气泡/卡片/分享/动态/引用条/图片」的装配与行包裹（含 hover 引用按钮
// 与引用定位）。抽屉骨架、轮询、发送乐观 UI、列表视图仍在 imdrawer.js；本件**不 import
// imdrawer**——抽屉态（drawer/chat/lastImInst）与时序钩子（setQuote/maybeDayDiv/msgTime）由
// 工厂 env 注入，避免宿主→本件→宿主的回边。
import { CFG } from './cfg.js';
import { el, esc, toast, selfUid } from './ui.js';
import { emotify } from './emoticon.js';
import { vcard, patchVcard, cshareCard, patchCshare, mcard } from './imcard.js';
import { lazyObserve } from './imgload.js';
import { fetchImImageBlob, peekImImageBlob, imageUrlOf } from './imimage.js';
import { openImageViewer } from './imgview.js';
import { ubbQuoteHtml } from './ubb.js';
import {
  parseCard, parseShare, msgTextOf, previewOfMessage,
  isCommentShare, commentShareAuthor, cmtShareOf, momentShareOf,
  msgContentType, isQuotable, quoteOf, quoteExtraOf
} from './immsg.js';
import { ICON_SVGS } from './imicons.js';
import { AppAPI } from './appapi.js';

// env 契约：
//   getDrawer()   当前抽屉态（未建/已拆为 null）
//   getChat()     当前会话态（targetId/quote/msgEls…；未进会话为 null）
//   getInst()     最近一次轮询的 IM 实例（图片 ks:// 换链用）
//   setQuote(q)   写会话引用目标并联动输入条 chip（imdrawer.setQuote）
//   maybeDayDiv(ts)  时间分割线（imdrawer.maybeDayDiv）
//   msgTime(m)    消息时间提取（imdrawer.msgTime——留宿主，随 env 注入避免复制）
export function createBubbleKit(env) {
  var getDrawer = env.getDrawer, getChat = env.getChat, getInst = env.getInst;
  var setQuote = env.setQuote, maybeDayDiv = env.maybeDayDiv, msgTime = env.msgTime;

  // ---------- 消息对象内省：方向提取（文本与卡片解析在 immsg.js 共享层） ----------
  function msgFrom(m) {
    try {
      if (m.fromUserId != null) return String(m.fromUserId);
      if (m.rawMsg && m.rawMsg.fromUserId != null) return String(m.rawMsg.fromUserId);
    } catch (e) { /* best-effort: parse */ }
    return '';
  }

  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
  }

  function imTextHtml(s) { return emotify(linkify(s)); }

  // ---------- 消息引用（气泡内摘要条 / hover 引用按钮 / 定位） ----------
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
    if (!getDrawer() || !getChat()) return;
    var wrap = getChat().msgEls[String(seqId)];
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
      try { getDrawer().input.focus(); } catch (e) { /* best-effort: cleanup */ }
    });
    return btn;
  }
  function appendBubble(m) {
    if (!getDrawer()) return;
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
      getDrawer().bubbles.appendChild(bubbleRow(b, mine, m)); // 引用消息本身也可被引用（套引用）
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
    getDrawer().bubbles.appendChild(bubbleRow(b, mine, m));
  }
  // 图片气泡（contentType 1，官方同路消息 APP 原生渲染）：wire 上 uri 是 ks:// 资源串，须经
  // kernel.file 换带鉴权的 https 直链才能显示；换链失败不出裂图，降级 [图片] 文本。
  // 宽高非 0 时按比例占位防布局跳动；点击开大图查看器（划选文字收尾在图上不触发，对齐评论）。
  // 字节懒加载（0.9.49）：滚入视口才拉，长历史只加载可见几张；pending 骨架微光占位
  function appendImageBubble(m, mine) {
    if (!getDrawer()) return;
    var w = Number(m.width) || 0, h = Number(m.height) || 0;
    var src = imageUrlOf(m, getInst()); // 换链管线 0.9.266 迁 imimage.js（inst 传参替代直读抽屉模块态）
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
    getDrawer().bubbles.appendChild(bubbleRow(b, mine, m));
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
      getDrawer().bubbles.appendChild(pre);
    }
    card.resourceBody.forEach(function (r) {
      var parts = vcard(SKIN, {
        href: Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : '',
        coverUrl: r.coverUrl, viewCountShow: r.viewCountShow,
        commentCountShow: r.commentCountShow, durationSec: r.durationSec, title: r.title
      }, mine);
      getDrawer().bubbles.appendChild(bubbleRow(parts.el, mine, m, 'cardrow'));
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
      getDrawer().bubbles.appendChild(note);
    }
    var isCmt = isCommentShare(share.title);
    var parts = isCmt
      ? cshareCard(SKIN, {
          href: share.url, text: share.title,
          html: cmt && cmt.content ? ubbQuoteHtml(commentShareAuthor(share.title), cmt.content) : ''
        }, mine)
      : vcard(SKIN, { href: share.url, title: share.title }, mine);
    var cardEl = parts.el;
    getDrawer().bubbles.appendChild(bubbleRow(cardEl, mine, m, 'cardrow'));
    var bubbles = getDrawer().bubbles;
    var tid = getChat() && getChat().targetId;
    AppAPI.dougaCard(share.acId).then(function (c) {
      if (!c || !cardEl.isConnected || !getDrawer() || getDrawer().bubbles !== bubbles
        || !getChat() || getChat().targetId !== tid) return;
      if (isCmt) patchCshare(parts, c);
      else patchVcard(parts, c);
      getDrawer().bubbles.scrollTop = getDrawer().bubbles.scrollHeight;
    });
  }
  // 动态分享气泡（0.9.122）：extra 载荷（momentShareOf）命中富渲染正文/真图，被剥按 wire
  // 文本降级——两态都出「查看动态」动态卡；附言（note）仍走独立文本气泡
  function appendMomentBubble(share, mine, m, moment) {
    if (share.note) {
      var note = el('div', 'acsv-im-bubble' + (mine ? ' mine' : ''));
      note.textContent = share.note;
      getDrawer().bubbles.appendChild(note);
    }
    var parts = mcard(SKIN, {
      href: share.url, text: share.title,
      html: moment && moment.text ? ubbQuoteHtml(commentShareAuthor(share.title), moment.text) : '',
      imgs: moment ? moment.imgs : []
    }, mine);
    getDrawer().bubbles.appendChild(bubbleRow(parts.el, mine, m, 'cardrow'));
  }

  return {
    appendBubble: appendBubble, quoteStrip: quoteStrip, bubbleRow: bubbleRow,
    locateMessage: locateMessage, SKIN: SKIN, msgFrom: msgFrom, imTextHtml: imTextHtml
  };
}
