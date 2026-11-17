// @ts-check
// ---------- 文章阅读浮层（0.9.326，确认稿 docs/preview/article-reader-v3.html） ----------
// B 案整视口全覆盖 + 760 版心 + 常驻轻动作条。数据源＝文章页 SSR window.articleInfo
// （§17.3 实测；取数做括号配平扫描——内容串里的半角分号会截断非贪婪正则版式，
// uppage extractSvInfo 的手法在此不合用，本篇自写配平器）。降级 DOM 取
// #article-content，再败＝失败态。评论区＝comments.js 管线复用（stype=3 已实测
// §17.1，与视频同族同串），宿主形态照 momentdetail 的 openCommentsHost 契约
// （pin＝正文区，输入条三件套随宿主迁移；宿主 el 必须 flex 列 + position:relative，
// 表情面板 bottom:84px 定位要求）。互动写链（赞/蕉/藏）0.9.327 起接通——端点出处与
// 未实测标注见各写链函数注（likePi 文章形状 / favapi.articleStow*）。
// 正文渲染不走评论域 UBB 渲染器（它全文先转义，<p>/<img> 会变可见字面文本，稿附节 7）
// ——sanitizeArticleBody 是纯字符串白名单清洗（node 可单测），表情方言分包待遇：acfun 出
// 可回填占位（refillBodyEmots 接 refillEmoticons 管线回填真图），[emot=zt,*] 方言转死占位
// （zt 图源未实测，不回填，稿附节 7）。窄态藏/蕉收纳：同一批键 DOM 不动，
// 宽屏 display:contents 摊回底栏直排、窄屏弹层化（值仍单源）。
// 底栏为唯一动作条（v3.2 确认稿裁决「删文末条」）：v3.1 的双条 + dim 去重机构随批退役。
// 壳不覆盖常驻顶栏：top 让位 var(--acsv-top-h)（0.9.327 真机反馈批裁决，playlayer/视图体
// 同款；顶栏保持可见可交互）。作者头像字段＝articleInfo.user.headUrl（真机 SSR 核对——
// 关注流形状的 userHead 在文章域不存在，0.9.326 误用即头像获取失败病灶）。
import { CFG } from './cfg.js';
import { el, elHtml, esc, toast, a11y, closeOnOutsideClick } from './ui.js';
import { fmtWan } from './timefmt.js';
import { root, releaseDrawer } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { requestText } from './net.js';
import { imgInto } from './imgload.js';
import { CDN_URL_OK } from './imgurl.js';
import { openImageViewer } from './imgview.js';
import { openSharePanel } from './sharepanel.js';
import { momentShareItemOf } from './momentbar.js';
import { openCommentsHost, closeCommentsHost, commentListClick, focusEditOf, replyBtnOf } from './comments.js';
import { followUser, unfollowUser } from './relationapi.js';
import { likePi, throwBananaPi } from './interact.js';
import { articleStowAdd, articleStowRemove } from './favapi.js';
import { toggleBananaPop } from './banpop.js';
import { errNotLogin, errBananaThrown } from './toastmsg.js';
import { ensureEmotionMap, EmotionMap, refillEmoticons, emotPlaceholderHtml } from './emoticon.js';
import { GLYPHS } from './imicons.js';
import { ICONS } from './styles.js';
import { testHook } from './dbg.js';

// ==================== 正文白名单清洗（纯字符串式，node 可单测） ====================
// 标签白名单（稿附节 2 承诺集）：不在表内的容器「摘壳留内容」（unwrap）；script/style/
// iframe 这类「内容也不能留」的件连文本一起丢（深度扫到配对闭合）。属性白名单：
// img 仅 src/alt、a 仅 href，URL 一律过 imgurl.CDN_URL_OK 单源（不手抄第二份网）；
// 不过 ⇒ 摘除元素留 alt/锚文本。文本节点一律经 ui.esc 转义（先解五种标准实体再转义
// ＝规范化单转义，内容里的 &amp; 不会变成可见的 &amp;amp;）。表情方言分包待遇（0.9.328）：
// acfun 走 emotPlaceholderHtml 单源出可回填占位（refillBodyEmots 回填真图）；zt 等包
// 转死占位 span——不做回填管线（图源无实测在账，账目见下与稿附节 7；refillEmoticons
// 只认 acfun 包）。
var AR_KEEP = {
  p: 1, br: 1, img: 1, h2: 1, h3: 1, ul: 1, ol: 1, li: 1, blockquote: 1,
  table: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1, pre: 1, code: 1,
  figcaption: 1, figure: 1, a: 1
};
var AR_DROP_ALL = {
  script: 1, style: 1, iframe: 1, object: 1, embed: 1, link: 1, meta: 1,
  title: 1, head: 1, noscript: 1, template: 1, svg: 1, math: 1, form: 1,
  input: 1, button: 1, select: 1, textarea: 1
};
var AR_ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function arEscText(s) {
  return esc(String(s).replace(/&(amp|lt|gt|quot|#39);/g, function (m) { return AR_ENT[m]; }));
}
// 属性串里按名取值（双引号/单引号/裸值三形态），取不到给 ''
function arAttrOf(attrStr, name) {
  var re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i');
  var m = re.exec(attrStr);
  return m ? (m[2] != null ? m[2] : (m[3] != null ? m[3] : m[4])) : '';
}
export function sanitizeArticleBody(html) {
  var s = String(html == null ? '' : html);
  var out = '', i = 0, n = s.length;
  while (i < n) {
    var lt = s.indexOf('<', i);
    if (lt < 0) { out += arEscText(s.slice(i)); break; }
    out += arEscText(s.slice(i, lt));
    var gt = s.indexOf('>', lt);
    if (gt < 0) { out += arEscText(s.slice(lt)); break; } // 破碎标签：整段当文本转义丢出
    var raw = s.slice(lt + 1, gt);
    i = gt + 1;
    var cm = raw.match(/^\s*\/\s*([a-zA-Z][\w-]*)/);
    if (cm) { // 闭合标签：白名单件出对应闭合，其余丢（unwrap 的壳不配闭合）
      var cn = cm[1].toLowerCase();
      if (AR_KEEP[cn] && cn !== 'br' && cn !== 'img') out += '</' + cn + '>';
      continue;
    }
    if (/^\s*[!?]/.test(raw)) continue; // 注释/处理指令/声明丢
    var tm = raw.match(/^\s*([a-zA-Z][\w-]*)/);
    var tag = tm ? tm[1].toLowerCase() : '';
    if (!tag) { out += arEscText('<' + raw + '>'); continue; } // '<3' 这类裸比较符：当文本
    if (AR_DROP_ALL[tag]) { // 连内容一起丢：扫到配对闭合（同标签深度计）
      var closeRe = new RegExp('</' + tag + '\\s*>', 'gi');
      var openRe = new RegExp('<' + tag + '(\\s|>|/)', 'gi');
      var depth = 1, scan = i, nxt = null, isClose = false;
      while (depth > 0) {
        openRe.lastIndex = scan; closeRe.lastIndex = scan;
        var o = openRe.exec(s), c2 = closeRe.exec(s);
        nxt = null; isClose = false;
        if (o && (!c2 || o.index < c2.index)) nxt = o;
        else if (c2) { nxt = c2; isClose = true; }
        if (!nxt) { i = n; break; } // 无闭合：丢到结尾
        if (isClose) { depth--; if (depth === 0) i = nxt.index + nxt[0].length; }
        else depth++;
        scan = nxt.index + nxt[0].length;
      }
      continue;
    }
    if (!AR_KEEP[tag]) continue; // 非白名单容器：摘壳留内容
    var attrStr = raw.slice(tm[0].length);
    if (tag === 'br') { out += '<br>'; continue; }
    if (tag === 'img') {
      var src = arAttrOf(attrStr, 'src');
      if (!CDN_URL_OK.test(src)) { out += arEscText(arAttrOf(attrStr, 'alt')); continue; }
      var alt = arAttrOf(attrStr, 'alt');
      out += '<img src="' + esc(src) + '"' + (alt ? ' alt="' + esc(alt) + '"' : '') + '>';
      continue;
    }
    if (tag === 'a') {
      var href = arAttrOf(attrStr, 'href');
      if (!CDN_URL_OK.test(href)) continue; // 摘壳留锚文本（内容随主循环输出）
      out += '<a href="' + esc(href) + '">';
      continue;
    }
    out += '<' + tag + '>'; // 其余白名单件无属性（属性白名单外全摘的最简形态）
  }
  // 表情方言分包待遇（0.9.328）：acfun 走 emotPlaceholderHtml 单源——带 data-pkg/id 的
  // 可回填占位（refillEmoticons 在 map 就绪后回填真图，管线与评论/行流同一条）；其余包
  // （zt 等）维持死占位——图源未实测不回填（稿附节 7），本函数仍纯字符串可 node 单测
  return out.replace(/\[emot=(\w+),(\d+)\/?\]/g, function (m, pkg, id) {
    if (pkg === 'acfun') return emotPlaceholderHtml(pkg, id);
    return '<span class="ar-em" data-emot-pkg="' + esc(pkg) + '" data-emot-id="' + esc(id) + '">表情</span>';
  });
}

// ==================== 长图判定（纯函数，node 可单测） ====================
// 口径：按**折算高**判（图在 760 版心里实际占的高 = 自然高 × 版心宽/自然宽），
// 超 75vh（稿节⑥）才算长图——直接拿自然高判会把「矮但极宽」的图误判（宽横幅
// 自然高 1000 也到不了版心 75vh）。版心宽缺省 760（稿承诺值），调用方传真实列宽。
export function isTallImg(w, h, vhPx, colW) {
  var nw = Number(w) || 0, nh = Number(h) || 0;
  if (!nw || !nh) return false;
  var col = Number(colW) || 760;
  var vh = Number(vhPx) || 0;
  if (!vh) return false;
  return (nh * (col / nw)) > vh * 0.75;
}

// ==================== 文章页 SSR 取数 ====================
// window.articleInfo＝整页里的一条 JSON（§17.3）。从首个 '{' 做**括号配平**
// （字符串/转义感知）——正文串里的半角分号不影响；JSON.parse 失败＝null 走降级。
function extractArticleInfo(text) {
  var k = String(text == null ? '' : text).indexOf('window.articleInfo');
  if (k < 0) return null;
  var st = text.indexOf('{', k);
  if (st < 0) return null;
  var depth = 0, inStr = false, q = '', bs = false;
  for (var j = st; j < text.length; j++) {
    var ch = text.charAt(j);
    if (inStr) {
      if (bs) bs = false;
      else if (ch === '\\') bs = true;
      else if (ch === q) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = true; q = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(st, j + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}
// 主路＝SSR JSON；降级＝DOM 取 #article-content innerHTML；两路都败＝reject（失败态）
function fetchArticle(acId) {
  return requestText(CFG.api.articleBase + acId).then(function (html) {
    var info = extractArticleInfo(html);
    if (info && (info.title || (info.parts && info.parts.length))) return info;
    var doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html');
    var c = doc.querySelector('#article-content');
    if (c) return { _domHtml: c.innerHTML, title: '' };
    throw new Error('artread-no-article');
  });
}

// ==================== 浮层本体 ====================
var shell = null;        // .acsv-artread 根（open 先 close 的单例）
var curPi = null;        // 当前 pi（失败态作者行/分享都从它拿）
var composerOpen = false;
var refs = null;         // 壳内句柄集（见 openArticleReader 末尾）

export function closeArticleReader() {
  if (!shell) return;
  var s = shell;
  shell = null;
  curPi = null;
  composerOpen = false;
  s.remove();
  closeCommentsHost();   // 管线宿主复位（DOM 已拆，残留引用读死节点——momentdetail 同款）
  releaseDrawer('comments');
  overlayClose('artread'); // Esc 路径已出栈时空转；显式关闭由此同步栈
}

// composer 开合＝「底栏 ⇄ 完整输入条」互换（稿节②）：开时底栏藏、焦点进编辑区；
// 关时底栏回、焦点回入口 pill（稿附节 8）。骨架期/失败态底栏本就 display:none，
// composerOpen 恒 false（pill 不可点），不会误回显。
function composerMode(on) {
  if (!refs || composerOpen === !!on) return;
  composerOpen = !!on;
  refs.hostEl.style.display = composerOpen ? 'flex' : 'none';
  refs.bar.style.display = composerOpen ? 'none' : '';
  if (composerOpen) {
    focusEditOf(refs.hostEl);
  } else {
    refs.pill.focus();
  }
}

// 层内 Esc 裁决（overlay onEsc 契约，0.9.237）：composer 开着先收 composer（不关层）；
// ⋯ 弹层开着先收弹层；都没开＝放行交栈关层。真实键盘与 harness 合成键两条路径同走
// overlayEsc（overlay.js:45-51 单源），一处实现两端一致。
function onEsc() {
  if (!shell) return false;
  if (composerOpen) { composerMode(false); return true; }
  if (refs && refs.more.classList.contains('open')) { refs.more.classList.remove('open'); return true; }
  return false;
}

// 头部三态：骨架（作者位骨架块）→ 成功（articleInfo.user）→ 失败（pi.up 兜底，
// 稿节③「作者行保留（卡片已有 up）」）
function renderHead(info, failed) {
  var inr = refs.head.querySelector('.arhd-in');
  if (!inr) return;
  inr.innerHTML = '';
  var back = el('button', 'acsv-tbtn');
  back.type = 'button';
  a11y(back, '返回');
  back.innerHTML = ICONS.chevLt;
  back.addEventListener('click', closeArticleReader);
  inr.appendChild(back);
  var u = (info && info.user) || (curPi && curPi.up) || null;
  var author = el('div', 'arauthor');
  var av = el('span', 'arav');
  imgInto(av, (u && (u.headUrl || u.userHead || u.img)) || CFG.api.defaultAvatar, 'avatar');
  author.appendChild(av);
  var mid = el('div', 'ar-mid');
  var name = el('a', 'arname', (u && (u.userName || u.name)) || '');
  var uid = (u && (u.userId || u.id)) || 0;
  if (uid) {
    name.href = CFG.api.userBase + uid;
    name.target = '_blank';
    name.rel = 'noopener';
    name.addEventListener('click', function (ev) { ev.stopPropagation(); });
  }
  mid.appendChild(name);
  var meta = el('div', 'ar-meta');
  if (!failed) {
    var dateText = String((info && info.createTime) || (curPi && curPi.dateText) || '');
    if (dateText) {
      meta.appendChild(el('span', null, dateText));
      meta.appendChild(el('span', 'ar-date-sep', '·'));
    }
    var readText = (info && (info.formatViewCount
      || (info.viewCount != null ? fmtWan(info.viewCount) : '')))
      || (curPi && curPi.views) || '';
    if (readText) meta.appendChild(el('span', 'ar-read', '阅读 ' + readText));
  }
  mid.appendChild(meta);
  author.appendChild(mid);
  inr.appendChild(author);
  if (uid) {
    var isFollowing = u ? !!u.isFollowing : false;
    var fb = el('button', 'ar-follow', isFollowing ? '已关注' : '关注');
    fb.type = 'button';
    fb.setAttribute('aria-pressed', isFollowing ? 'true' : 'false');
    if (isFollowing) fb.classList.add('on');
    fb.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var on = fb.classList.contains('on');
      fb.classList.toggle('on', !on);
      fb.textContent = !on ? '已关注' : '关注';
      fb.setAttribute('aria-pressed', !on ? 'true' : 'false');
      (on ? unfollowUser(String(uid)) : followUser(String(uid))).then(function (ok) {
        if (!ok) {
          fb.classList.toggle('on', on);
          fb.textContent = on ? '已关注' : '关注';
          fb.setAttribute('aria-pressed', on ? 'true' : 'false');
          toast(on ? '取消关注失败' : '关注失败');
        }
      });
    });
    inr.appendChild(fb);
  }
}

// 互动键（赞/蕉/藏/评论/分享），底栏唯一动作条（v3.2 删文末条）：一份 nums 数值态 + st
// 点亮态写一份 DOM（无「两份 .n 恒等」不变式）；写链编排见 toggleLike/
// openBanana/toggleStow；comment 键只锚到评论头（composer 仅 pill 触发，0.9.327 真机
// 反馈批裁决），分享走 momentShareItemOf 单源。
function dualGlyph(a, b) {
  return '<span class="acsvg-dual"><i class="acsvg-glyph gpath">' + a + '</i>'
    + '<i class="acsvg-glyph gfill">' + b + '</i></span>';
}
function actOf(mount, o) {
  var b = el('span', 'aract' + (o.cls ? ' ' + o.cls : ''));
  b.title = o.title;
  if (o.glyphs) b.appendChild(elHtml('span', null, dualGlyph(o.glyphs[0], o.glyphs[1])));
  else if (o.svgIdle) {
    // 描边 SVG（idle）+ 实心字形（点亮）双件并存，显隐归 cssraw（.aract.stow/.on 切换）
    b.appendChild(elHtml('span', null, o.svgIdle));
    b.appendChild(el('i', 'acsvg-glyph', o.glyph));
  } else b.appendChild(el('i', 'acsvg-glyph', o.glyph));
  var n = null;
  if (o.n != null) { n = el('span', 'n', o.n); b.appendChild(n); }
  if (o.onClick) b.addEventListener('click', function (ev) { ev.stopPropagation(); o.onClick(b, ev); });
  mount.appendChild(b);
  return { node: b, n: n };
}
function syncActs() {
  if (!refs) return;
  var n = refs.nums, st = refs.st;
  var fmt = {
    like: fmtWan(n.like), banana: fmtWan(n.banana),
    stow: n.stow ? fmtWan(n.stow) : '', comment: fmtWan(n.comment)
  };
  ['like', 'banana', 'stow', 'comment'].forEach(function (k) {
    var h = refs.barActs && refs.barActs[k];
    if (!h) return;
    if (h.n) h.n.textContent = fmt[k];
    if (k === 'like') {
      h.node.classList.toggle('on', st.liked);
      h.node.title = st.liked ? '已赞' : '点赞';
    } else if (k === 'banana') {
      h.node.classList.toggle('thrown', st.thrown);
      h.node.title = st.thrown ? '已投蕉' : '投蕉';
    } else if (k === 'stow') {
      h.node.classList.toggle('on', st.stowed);
      h.node.title = st.stowed ? '已收藏' : '收藏';
    }
  });
  // 同步行卡 pi（同一引用）：浮层乐观值回写后，行卡侧 syncRowBar/视口回填机制自然跟随
  if (curPi) {
    curPi.like = n.like; curPi.banana = n.banana; curPi.comment = n.comment;
    curPi.liked = st.liked; curPi.thrown = st.thrown;
  }
}

// ---- 写链（0.9.327 真机反馈批：首版只读改全接通） ----
// 赞＝likePi（文章走 home 形状 objectType=2+kpf，§17.2 大概率成立标首跑验证）；
// 蕉＝banpop 数量层（文章 resourceType=3，momentbar 文章行同款路径）；
// 藏＝favapi.articleStowAdd/Remove（官方文章页源码反查端点，标〔源码级反查〕未真机首跑）。
// 全部乐观 + 失败回滚 + toast（momentbar wireLike 同款编排）；乐观值回写 pi（行卡同步）。
function toggleLike() {
  if (!refs || refs.st.busy.like) return;
  var st = refs.st, on = !st.liked;
  st.liked = on;
  refs.nums.like += on ? 1 : -1;
  st.busy.like = true;
  syncActs();
  likePi(curPi, on).then(function (ok) {
    if (!refs) return;
    refs.st.busy.like = false;
    if (ok) return;
    refs.st.liked = !on;
    refs.nums.like += on ? -1 : 1;
    syncActs();
    errNotLogin();
  });
}
function openBanana(btn) {
  if (!refs || refs.st.busy.ban) return;
  if (refs.st.thrown) { errBananaThrown(); return; }
  toggleBananaPop(btn, {
    anchorBtn: true, // 底栏横贯整宽 ⇒ 弹层按按钮矩形锚（momentbar 0.9.207 同款）
    send: function (n) { return throwBananaPi(curPi, n); },
    applied: function (n) {
      refs.nums.banana += n;
      refs.st.thrown = true;
      syncActs();
      toast('投蕉成功');
    }
  });
}
function toggleStow() {
  if (!refs || refs.st.busy.stow) return;
  var st = refs.st, on = !st.stowed;
  st.stowed = on;
  refs.nums.stow += on ? 1 : -1;
  st.busy.stow = true;
  syncActs();
  (on ? articleStowAdd(curPi.acId) : articleStowRemove(curPi.acId)).then(function (ok) {
    if (!refs) return;
    refs.st.busy.stow = false;
    if (ok) return;
    refs.st.stowed = !on;
    refs.nums.stow += on ? -1 : 1;
    syncActs();
    toast(on ? '收藏失败' : '取消收藏失败');
  });
}
// 键序统一 赞/蕉/藏/评论/分享（稿节①）——唯一动作条（v3.2 删文末条，序即稿承诺）；
// 窄态把 蕉/藏 两键挂进 ⋯ 弹层（DOM 序不变，CSS 摆位）
function actKeys(mount, ctx) {
  var out = {};
  var st = ctx.st;
  out.like = actOf(mount, {
    glyphs: [GLYPHS.feedLike, GLYPHS.feedLikeFill],
    title: st.liked ? '已赞' : '点赞', n: fmtWan(ctx.nums.like), cls: st.liked ? 'on' : '',
    onClick: function () { toggleLike(); }
  });
  out.banana = actOf(mount, {
    glyphs: [GLYPHS.feedBanana, GLYPHS.feedBananaFill],
    title: st.thrown ? '已投蕉' : '投蕉', n: fmtWan(ctx.nums.banana),
    cls: st.thrown ? 'thrown ban' : 'ban',
    onClick: function (btn) { openBanana(btn); }
  });
  out.stow = actOf(mount, {
    svgIdle: ICONS.stowOutline, glyph: GLYPHS.feedStow, title: '收藏',
    n: ctx.nums.stow ? fmtWan(ctx.nums.stow) : '',
    cls: 'stow' + (st.stowed ? ' on' : ''),
    onClick: function () { toggleStow(); }
  });
  out.comment = actOf(mount, {
    glyph: GLYPHS.feedComment, title: '评论', n: fmtWan(ctx.nums.comment),
    onClick: function () {
      var head = refs.pin.querySelector('.ar-cmhead');
      if (head) head.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
  out.share = actOf(mount, {
    glyph: GLYPHS.feedRepost, title: '分享',
    onClick: function (btn) {
      openSharePanel(btn, momentShareItemOf(curPi), { host: shell, pi: curPi });
    }
  });
  return out;
}

// 正文配图后处理：sanitize 产物里的裸 img 升级成 .arimg 容器——加载走 imgload
// 重试链（imgInto 单源）、点击进大图（imgview 单源）、长图 75vh 兜底（稿节⑥，
// 折算高判定见 isTallImg）。imgInto 自挂的 loading/decoding 属性摘掉：正文 img
// 的属性白名单只有 src/alt（sanitize 契约，测试钉），惰性由重试链自身承担。
function upgradeBodyImgs(scope) {
  [].forEach.call(scope.querySelectorAll('.arbody img'), function (old) {
    var src = old.getAttribute('src') || '';
    var alt = old.getAttribute('alt') || '';
    var wrap = el('div', 'arimg onbig');
    old.parentNode.insertBefore(wrap, old);
    old.remove();
    imgInto(wrap, src, 'grid');
    var img = wrap.querySelector('img');
    if (!img) return;
    // 正文 img 的属性白名单只有 src/alt（sanitize 契约，测试钉）：imgInto 自挂的
    // loading/decoding/referrerPolicy 全摘（重试 fire 会回写 referrerPolicy——load 探针里再摘一次）
    img.removeAttribute('loading');
    img.removeAttribute('decoding');
    img.removeAttribute('referrerpolicy');
    img.alt = alt;
    wrap.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var u2 = img.currentSrc || img.src;
      if (u2) openImageViewer(u2);
    });
    var probe = function () {
      img.removeAttribute('referrerpolicy'); // fire() 重试会回写，探针期再摘（见上注）
      var colW = wrap.clientWidth || 760;
      if (isTallImg(img.naturalWidth, img.naturalHeight, window.innerHeight, colW)) {
        wrap.classList.add('arimg--tall');
        if (!wrap.querySelector('.artall')) wrap.appendChild(el('span', 'artall', '长图 · 点击查看全图'));
      } else {
        wrap.classList.remove('arimg--tall');
      }
    };
    if (img.complete) probe();
    else {
      img.addEventListener('load', probe);
      img.addEventListener('error', probe);
    }
  });
}

// 底栏为唯一动作条（v3.2 确认稿裁决「删文末条」）：无第二份可去重，dim/IO 已整体退役——
// 五键恒常亮、栏高不折叠、pill 常在（v3.1 的 armDim/.aractbar--dim 随文末条一并撤销）。

// 正文表情回填（0.9.328）：acfun 占位 → 真图（refillEmoticons 单源）。必须跑在
// upgradeBodyImgs 之后——回填插入的 img 是直出小图，进 .arimg 升级/长图/大图管线就坏了。
// map 就绪晚于正文渲染时走 ensureEmotionMap 异步补一次；关层后不回填死节点（loadArticle 同款判据）
function refillBodyEmots(pin) {
  if (EmotionMap.loaded) { refillEmoticons(pin); return; }
  ensureEmotionMap().then(function () {
    if (!shell || !refs || !refs.pin || refs.pin !== pin) return;
    refillEmoticons(pin);
  });
}

function renderArticle(info) {
  var bodyHtml = '';
  if (info._domHtml) bodyHtml = info._domHtml;
  else if (info.parts && info.parts.length) {
    bodyHtml = info.parts.map(function (p) { return p && p.content ? String(p.content) : ''; }).join('');
  }
  clearSkels();
  var pin = refs.pin;
  pin.innerHTML = '';
  pin.appendChild(el('h1', 'arh1', info.title || (curPi && curPi.title) || ''));
  var tags = info.tagList;
  if (tags && tags.length) {
    var tagBox = el('div', 'artags');
    tags.forEach(function (t) {
      if (t && t.name) tagBox.appendChild(el('span', 'artag', String(t.name)));
    });
    if (tagBox.children.length) pin.appendChild(tagBox);
  }
  var body = elHtml('div', 'arbody', sanitizeArticleBody(bodyHtml));
  pin.appendChild(body);
  upgradeBodyImgs(pin);
  refillBodyEmots(pin);
  // 底栏为唯一动作条（v3.2 确认稿裁决：删文末动作条，dim 去重机构整体退役）——
  // 正文结尾直接接评论头；refs.acts 不再存在，syncActs 只写底栏一份
  var cmhead = el('div', 'ar-cmhead');
  refs.title = el('span', 'ar-cmtitle', '评论');
  cmhead.appendChild(refs.title);
  pin.appendChild(cmhead);
  renderHead(info, false);
  refs.bar.style.display = '';
  syncActs();
  refs.covbd.scrollTop = 0;
}

function renderError() {
  clearSkels();
  refs.pin.innerHTML = '';
  renderHead(null, true);
  var box = el('div', 'arerr');
  box.appendChild(el('div', 't', '正文拉取失败'));
  box.appendChild(el('div', 'd', '网络开小差了，这篇文章暂时读不到。可以重试，或去原页阅读。'));
  var btns = el('div', 'btns');
  var retry = el('button', 'acsv-upd-act primary', '重试');
  retry.type = 'button';
  retry.addEventListener('click', function () { loadArticle(); });
  var origin = el('a', 'acsv-upd-act', '前往原页');
  origin.href = (curPi && curPi.href) || (CFG.api.articleBase + (curPi ? curPi.acId : ''));
  origin.target = '_blank';
  origin.rel = 'noopener';
  btns.appendChild(retry);
  btns.appendChild(origin);
  box.appendChild(btns);
  pinAppend(box);
}
function pinAppend(node) {
  if (refs && refs.pin) refs.pin.appendChild(node);
}

// 骨架期：作者位骨架块 + 正文位骨架条（.arbody 不在场——稿节③口径「骨架期不显示
// 动作条」；「.arbody 空＝不在场或在场无子节点」，本实现选不在场）
function renderSkeleton() {
  var inr = refs.head.querySelector('.arhd-in');
  if (inr) {
    inr.innerHTML = '';
    var back = el('button', 'acsv-tbtn');
    back.type = 'button';
    a11y(back, '返回');
    back.innerHTML = ICONS.chevLt;
    back.addEventListener('click', closeArticleReader);
    inr.appendChild(back);
    var author = el('div', 'arauthor');
    author.appendChild(el('span', 'arskel av'));
    var mid = el('div', 'ar-mid');
    mid.appendChild(el('div', 'arskel ln'));
    mid.appendChild(el('div', 'arskel ln short'));
    author.appendChild(mid);
    inr.appendChild(author);
  }
  if (refs.covin) {
    var sk = el('div', 'arskel-wrap');
    sk.appendChild(el('div', 'arskel t'));
    for (var i = 0; i < 3; i++) sk.appendChild(el('div', 'arskel ln'));
    sk.appendChild(el('div', 'arskel img'));
    refs.covin.insertBefore(sk, refs.list);
  }
}
function clearSkels() {
  if (!refs || !refs.covin) return;
  [].forEach.call(refs.covin.querySelectorAll('.arskel-wrap'), function (n) { n.remove(); });
  [].forEach.call(refs.head.querySelectorAll('.arskel'), function (n) { n.remove(); });
}

function loadArticle() {
  if (!shell || !curPi || !refs) return;
  composerMode(false);               // 重试时若在 composer 态，先收回（幂等）
  renderSkeleton();
  refs.pin.innerHTML = '';
  refs.bar.style.display = 'none';   // 骨架期不出动作条（稿节③）
  fetchArticle(curPi.acId).then(function (info) {
    if (!shell) return; // 回包前已关层：防回填死节点（momentdetail 同款判据）
    // 计数取 SSR 真值（缺省回落 pi 的列表载荷）
    var n = refs.nums;
    n.like = info.likeCount != null ? (Number(info.likeCount) || 0) : (curPi.like || 0);
    n.banana = info.bananaCount != null ? (Number(info.bananaCount) || 0) : (curPi.banana || 0);
    n.stow = info.stowCount != null ? (Number(info.stowCount) || 0) : 0;
    n.comment = info.commentCount != null ? (Number(info.commentCount) || 0) : (curPi.comment || 0);
    refs.st.liked = info.isLike != null ? !!info.isLike : !!curPi.liked;
    refs.st.thrown = info.isThrowBanana != null ? !!info.isThrowBanana : !!curPi.thrown;
    renderArticle(info);
    // 评论管线灌进宿主（stype=3 已实测 §17.1；shareUrl 给评论转发锚点与空态出口；
    // pin＝正文区，resetList 清列表后由管线重挂）
    openCommentsHost({
      el: refs.hostEl, title: refs.title, list: refs.list,
      close: closeArticleReader, pin: refs.pin,
      titleFmt: function (n) { return '共 ' + fmtWan(n) + ' 条评论'; }
    }, curPi.acId, 3, info.shareUrl || curPi.href, 'home');
  }, function () {
    if (!shell) return;
    renderError();
  });
}

// pi＝panelitem 契约条目（ct='article'：acId/title/href/up{id,name,img,isFollowing}/
// like/comment/banana/views/dateText）。脚本页入口（rowkit 行落点与评论键）；原生页
// 宿主仍走站方原址外链（0.9.314 siteOnly 裁决，不经此层）。
export function openArticleReader(pi) {
  if (!pi || pi.ct !== 'article' || !pi.acId) return;
  closeArticleReader();
  curPi = pi;
  var nums = {
    like: Number(pi.like) || 0, banana: Number(pi.banana) || 0,
    stow: 0, comment: Number(pi.comment) || 0
  };
  var st = { liked: !!pi.liked, thrown: !!pi.thrown, stowed: false, busy: {} };
  var s = el('div', 'acsv-artread');
  s.addEventListener('click', function (ev) {
    if (ev.target === s) closeArticleReader(); // 壳底即背板：点底关（mdetail 同款）
  });
  var head = el('div', 'arhd');
  var headIn = el('div', 'arhd-in');
  head.appendChild(headIn);
  var covbd = el('div', 'covbd');
  var covin = el('div', 'covin');
  var list = el('div', 'ar-list');
  list.addEventListener('click', commentListClick); // 评论点赞/回复/转发/配图大图委托（momentdetail 同款挂法）
  // 点「回复」先展开 composer 再交给管线 setReply（capture 先于上方的冒泡委托）——
  // 否则 chip 挂进隐藏的 composer 宿主，回复目标看不见（稿节⑦：回复即展开+带上下文）
  list.addEventListener('click', function (ev) {
    if (replyBtnOf(ev)) composerMode(true);
  }, true);
  var pin = el('div', 'ar-pin');
  list.appendChild(pin);
  covin.appendChild(list);
  covbd.appendChild(covin);
  // composer 宿主：flex 列 + relative（表情面板 bottom:84px 定位要求，0.9.101 实报）；
  // 输入条三件套由 comments.ensureCommentInput 迁进来——收起态不占高度（稿节②）
  var hostEl = el('div', 'ar-composer');
  var bar = el('div', 'aractbar');
  var barIn = el('div', 'aractbar-in');
  bar.appendChild(barIn);
  bar.style.display = 'none'; // 骨架期/失败态不出（稿节③）
  var pill = el('button', 'aractbar-input', '说点什么…');
  pill.type = 'button';
  barIn.appendChild(pill);
  // ⋯ 收纳（稿节④）：宽屏 display:contents 把弹层摊回直排、窄屏弹层化——同一批键
  // DOM 不动，值仍单源；弹层收 收藏/投蕉 两件（直排留 赞/评论/分享）
  var more = el('span', 'aractbar-more');
  var moreBtn = el('button', 'aractbar-morebtn', '⋯');
  moreBtn.type = 'button';
  a11y(moreBtn, '更多操作');
  var pop = el('div', 'aractbar-pop');
  more.appendChild(moreBtn);
  more.appendChild(pop);
  barIn.appendChild(more);
  moreBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    more.classList.toggle('open');
  });
  closeOnOutsideClick(pop, [more], function () { more.classList.remove('open'); });
  var backtop = el('button', 'acsv-tbtn ar-backtop');
  backtop.type = 'button';
  a11y(backtop, '回到顶部');
  backtop.innerHTML = ICONS.chevUp;
  backtop.addEventListener('click', function (ev) {
    ev.stopPropagation();
    covbd.scrollTo({ top: 0, behavior: 'smooth' });
  });
  s.appendChild(head);
  s.appendChild(covbd);
  s.appendChild(hostEl);
  s.appendChild(bar);
  s.appendChild(backtop);
  (root || document.body).appendChild(s);
  shell = s;
  refs = {
    head: head, covbd: covbd, covin: covin, list: list, pin: pin,
    hostEl: hostEl, bar: bar, barIn: barIn, pill: pill,
    more: more, pop: pop, nums: nums, st: st, barActs: null, title: null
  };
  composerOpen = false;
  pill.addEventListener('click', function (ev) { ev.stopPropagation(); composerMode(true); });
  closeOnOutsideClick(hostEl, [pill], function () { if (composerOpen) composerMode(false); });
  // 底栏直排键 + ⋯ 弹层键：同一批节点，唯一动作条（v3.2 删文末条）。more 插到「评论」键
  // 之前（DOM 序 = 赞/蕉/藏/评论/分享，即稿节①键序）；蕉/藏两键挂进弹层，宽屏
  // display:contents 摊回直排、窄屏弹层化（值仍单源，稿节④）
  refs.barActs = actKeys(barIn, refs);
  barIn.insertBefore(more, refs.barActs.comment.node);
  pop.appendChild(refs.barActs.banana.node);
  pop.appendChild(refs.barActs.stow.node);
  renderSkeleton();
  loadArticle();
  overlayOpen({ id: 'artread', modal: true, close: closeArticleReader, onEsc: onEsc });
}

// debug 构建测试钩子：harness 接缝 {open(pi), close()}——形态照 test/cases/article.js 文件头
// 钉死的句柄形态（momentdetail 的 {open:bool} 快照形态不匹配本批用例的寻缝协议）
testHook('articleread', function () {
  return { open: openArticleReader, close: closeArticleReader, isOpen: function () { return !!shell; } };
});
