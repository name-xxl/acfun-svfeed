import { CFG } from './cfg.js';
import { el, toast } from './ui.js';
import { request } from './net.js';
import { upOf } from './data.js';
import { searchVideoPageOf, searchUserPageOf, searchArticlePageOf } from './searchfmt.js'; // 回包规整（0.9.161 出库）
import { gridCardOf, openPanelItem, skeletonRows } from './cards.js';
import { ICONS } from './styles.js'; // chevUp 回顶图标（与关注/广场同源）
import { imgInto } from './imgload.js';
import { registerView } from './viewreg.js';
import { setSearchHandler, focusSearch } from './topbar.js';
import { openFollowGroupPop } from './grouppop.js';
import { followUser } from './relationapi.js';
import { histList, histAdd, histClear } from './searchhist.js';

// ---------- 搜索视图 2.0（0.9.151）：类目 chips + 真分页 + UP 卡 + 文章行 + 搜索历史 ----------
// 数据源=三端点（cfg.api.search{Video,User,Article}，真机实测 docs/api-research.md §4.10）：
// **pCursor 是页码**（page/pageNo 被忽略）、每页固定 30、totalNum 总数 / pageNum 总页数。
// 0.9.72 的 SSR 首屏解析退役——那版只有第一页（?pageNo= 无效），且无 UP/文章类目。
// 关键词与类目唯一真源=地址栏（#svfeed/search/<kind>/<kw>；route.viewKind + views 二段参数），
// 顶栏搜索框是唯一输入（0.9.73 起；挂起期交还默认提交的纪律同旧版）。语义要点：
//   · 换词**并行预拉三类目**（各 30 条小 JSON）：chips 计数（totalNum）即时、切类目零等待；
//   · 类目切换走地址（views 按 kind 重建视图、读模块级缓存不再发请求；浏览器前进/后退同路）；
//   · 分页=哨兵自动续页（同评论侧 0.9.141 口径，不做「加载更多」按钮）；到底出「已显示全部 N 条」；
//   · UP 卡：未关注一键关注（relationapi.followUser，落未分组）；已关注点开**分组选择层**
//     （grouppop，可改分组/取消关注——与 rail 关注角标同语义件，不在卡上另造一套）；
//   · 历史：searchhist 记最近 10 词，空词态出 chips（可点可清空）；联想端点实测不存在，不做。
var KIND_LABEL = { video: '视频', up: 'UP主', article: '文章' };
var KINDS = ['video', 'up', 'article'];
var PAGE_SIZE = 30; // 三端点实测固定每页 30（响应 pageSize=30；count 类参数被忽略）

// 模块级缓存（跨视图重建存活：类目切换/前进后退/换词回来都读它，不再打接口）：
// { kw, kinds: { video|up|article: { items, total, page, done, loading, err } } }。同一时刻只
// 缓存一个关键词——换词即整组丢弃（旧在途回包写旧对象，天然作废）
var cache = null;

function newState() { return { items: [], total: 0, page: 0, done: false, loading: false, err: false }; }
function cacheFor(kw) {
  // 空词态（历史页）**不碰模块缓存**：它没有结果集，不该把上一次搜索的缓存驱逐掉
  //（否则「搜 A → 空词看历史 → 点历史里的 A」会整组重拉）
  if (!kw) return { kw: '', kinds: { video: newState(), up: newState(), article: newState() } };
  if (!cache || cache.kw !== kw) {
    cache = { kw: kw, kinds: { video: newState(), up: newState(), article: newState() } };
  }
  return cache;
}

function apiOf(kind) {
  return kind === 'up' ? CFG.api.searchUser
    : (kind === 'article' ? CFG.api.searchArticle : CFG.api.searchVideo);
}
function normOf(kind, j) {
  return kind === 'up' ? searchUserPageOf(j)
    : (kind === 'article' ? searchArticlePageOf(j) : searchVideoPageOf(j));
}
function hashOf(kind, kw) {
  return CFG.hash + '/search/' + kind + '/' + encodeURIComponent(kw);
}

// 顶栏提交接管（挂起/复原用；0.9.74 深界面保活期间交还默认提交）
var activeSubmit = null;
var activeIO = null; // 当前视图的续页哨兵观察器（teardown 断开；同一时刻只有一个搜索视图）
var histListener = null; // 共享历史清空广播的订阅器（0.9.158；teardown 摘除）

function buildSearchView(body, arg, kind) {
  var kw = String(arg || '').trim();
  var curKind = KINDS.indexOf(kind) >= 0 ? kind : 'video';
  var c = cacheFor(kw);
  // 规范地址（0.9.151）：类目段缺席的形态（#svfeed/search/<kw>——0.9.72 历史链接与"顶栏默认
  // 提交"的首跳）挂载时规范化为 /search/<kind>/<kw>。用 replace 不留历史条目：back 不套娃。
  // 回跳后 syncRouteView 比 view/arg/kind 全等（kind 已随本次构建对齐）→ 不会重进不循环
  if (kw && !kind) {
    try { location.replace('#' + hashOf(curKind, kw)); }
    catch (e) { location.hash = hashOf(curKind, kw); }
  }

  var chips = el('div', 'acsv-schips');
  var state = el('div', 'acsv-sstate');
  var res = el('div', 'acsv-sres');
  var end = el('div', 'acsv-send');
  var sentinel = el('div', 'acsv-cmore-sentinel');
  // 回顶（0.9.154；关注/广场/原生内嵌广场同款共享件 .acsv-backtop）：sticky 钉滚动流右下，
  // 超 backTopAt 淡入；**三个类目共用一个**（按钮在视图层、不在类目里）；评论抽屉打开时
  // 正文右缘本就让位到抽屉左缘，它 sticky 在正文流里跟着让位
  var backTop = el('button', 'acsv-tbtn acsv-backtop');
  backTop.innerHTML = ICONS.chevUp;
  backTop.title = '回到顶部';
  body.appendChild(chips);
  body.appendChild(state);
  body.appendChild(res);
  body.appendChild(end);
  body.appendChild(sentinel);
  body.appendChild(backTop); // 须在内容之后（sticky 的定位基准）
  sentinel.style.display = 'none';
  body.addEventListener('scroll', function () {
    backTop.classList.toggle('on', body.scrollTop > CFG.view.search.backTopAt);
  }, { passive: true });
  backTop.addEventListener('click', function () {
    body.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 共享历史被外部清空（顶栏面板「清除历史」）→ 空词态重画 chips（0.9.158；非空词态无历史件，免画）
  if (!histListener) {
    histListener = function () { if (!String(arg || '').trim() && res.isConnected) render(); };
    document.addEventListener('acsv-searchhist', histListener);
  }
  var skelGone = null;
  function showSkel() {
    if (skelGone) return;
    res.textContent = '';
    skelGone = skeletonRows(res, 6, 'acsv-gskel');
  }
  function hideSkel() {
    if (skelGone) { skelGone(); skelGone = null; }
  }
  function setState(txt) {
    state.textContent = txt || '';
    state.style.display = txt ? '' : 'none';
  }

  // 取一页（page 1 起）：短路已取过/在途/失败待重试/中间页未到；成功后落缓存并重绘。
  // 失败标 err 停在当前页，由「点击重试」清位重取（自动续页不静默重试——避免失败风暴）
  function ensure(k, page) {
    var st = c.kinds[k];
    if (!c.kw || st.loading || st.err) return;
    if (page <= st.page || (page > 1 && (st.done || st.page < page - 1))) return;
    st.loading = true;
    request(apiOf(k) + '?keyword=' + encodeURIComponent(c.kw) + '&pCursor=' + page).then(function (j) {
      st.loading = false;
      if (!j || j.result !== 0) { st.err = true; render(); return; }
      var pg = normOf(k, j);
      if (pg.total) st.total = pg.total;
      pg.items.forEach(function (it) { st.items.push(it); });
      st.page = page;
      // 到底判定：空页 / 短页 / 已积满 totalNum（三者任一——与收藏侧"列表与总数自洽"同口径）
      if (!pg.items.length || pg.items.length < PAGE_SIZE
        || (st.total && st.items.length >= st.total)) st.done = true;
      render();
    }, function () {
      st.loading = false;
      st.err = true;
      render();
    });
  }

  // 同词再搜（顶栏 Enter 打在同词上）：整组缓存作废重拉——"再搜一次"的语义是刷新结果
  function rerun() {
    cache = null;
    c = cacheFor(kw);
    if (kw) KINDS.forEach(function (k) { ensure(k, 1); });
    render();
  }

  function retry() {
    var st = c.kinds[curKind];
    st.err = false;
    st.page = 0; st.done = false; st.items = [];
    ensure(curKind, 1);
    render();
  }

  // 空词态：最近搜索（searchhist）chips + 清空；无历史出引导文案
  function renderHistory() {
    state.style.display = 'none';
    state.textContent = '';
    var row = el('div', 'acsv-shist');
    var hs = histList();
    if (hs.length) {
      row.appendChild(el('span', 'acsv-shlb', '最近搜索'));
      hs.forEach(function (w) {
        var b = el('button', 'acsv-shchip', w);
        b.type = 'button';
        b.addEventListener('click', function () { location.hash = hashOf(curKind, w); });
        row.appendChild(b);
      });
      var clr = el('button', 'acsv-shclr', '清空');
      clr.type = 'button';
      clr.addEventListener('click', function () { histClear(); render(); });
      row.appendChild(clr);
    } else {
      row.appendChild(el('span', 'acsv-shlb', '输入关键词，搜索 A 站视频 / UP主 / 文章（搜过的词会记在这里）'));
    }
    res.textContent = '';
    res.appendChild(row);
  }

  function emptyTextOf(k) {
    return k === 'video' ? '没有找到相关视频（换「UP主」或「文章」试试）'
      : k === 'up' ? '没有找到相关 UP 主' : '没有找到相关文章';
  }

  function videoCellOf(it) {
    // 契约 → 网格卡（kind='search' 触发角标/脚行；无 href → 点击进播放层就地播放）
    return gridCardOf({
      acId: it.acId, title: it.title, cover: it.cover, kind: 'search',
      dur: it.dur, views: it.views, up: it.up, dateText: it.dateText
    });
  }

  function upCardOf(u) {
    var card = el('div', 'acsv-supcard');
    var hd = el('div', 'acsv-suphd');
    var av = el('a', 'acsv-supav');
    av.href = CFG.api.userBase + u.uid;
    av.target = '_blank';
    av.rel = 'noopener';
    imgInto(av, u.avatar || CFG.api.defaultAvatar, 'avatar', 'acsv-avatar acsv-supavatar');
    hd.appendChild(av);
    var info = el('div', 'acsv-supinfo');
    var nm = el('a', 'acsv-supname', u.name);
    nm.href = CFG.api.userBase + u.uid;
    nm.target = '_blank';
    nm.rel = 'noopener';
    info.appendChild(nm);
    var meta = el('div', 'acsv-supmeta');
    if (u.fans !== '' && u.fans != null) meta.appendChild(el('span', null, '粉丝 ' + u.fans));
    if (u.contrib !== '' && u.contrib != null) meta.appendChild(el('span', null, '投稿 ' + u.contrib));
    info.appendChild(meta);
    if (u.signature) info.appendChild(el('div', 'acsv-supsig', u.signature));
    hd.appendChild(info);
    var fb = el('button', 'acsv-supfollow' + (u.following ? ' on' : ''), u.following ? '已关注' : '＋ 关注');
    fb.type = 'button';
    function paintFb() {
      fb.textContent = u.following ? '已关注' : '＋ 关注';
      fb.classList.toggle('on', u.following);
    }
    fb.addEventListener('click', function () {
      if (fb._busy) return;
      if (!u.following) {
        fb._busy = true;
        followUser(u.uid).then(function (ok) { // 关注落「未分组」（groupId 传空，与旧一键关注同语义）
          fb._busy = false;
          if (!ok) { toast('关注失败（未登录？）'); return; }
          u.following = true;
          paintFb();
          toast('已关注 @' + u.name);
        });
        return;
      }
      // 已关注 → 分组选择层（更改分组 / 取消关注）——复用 rail 关注角标的语义件
      openFollowGroupPop(fb, {
        uid: u.uid, name: u.name, following: true,
        done: function (res2) {
          if (res2 && res2.unfollowed) { u.following = false; toast('已取消关注 @' + u.name); }
          paintFb();
        }
      });
    });
    hd.appendChild(fb);
    card.appendChild(hd);
    if (u.recents && u.recents.length) {
      var recs = el('div', 'acsv-suprecs');
      u.recents.forEach(function (r) {
        var rc = el('div', 'acsv-srec');
        var cov = el('div', 'acsv-sreccov');
        imgInto(cov, r.cover, 'cover', null);
        if (r.dur) cov.appendChild(el('span', 'acsv-srecdur', r.dur));
        rc.appendChild(cov);
        rc.appendChild(el('div', 'acsv-srectt', r.title));
        if (r.dateText) rc.appendChild(el('div', 'acsv-srectm', r.dateText));
        rc.title = r.title;
        rc.addEventListener('click', function () {
          openPanelItem({
            acId: r.acId, title: r.title, cover: r.cover, kind: 'search',
            up: upOf(u.uid, u.name, u.avatar, u.following)
          });
        });
        recs.appendChild(rc);
      });
      card.appendChild(recs);
    }
    return card;
  }

  function articleRowOf(a) {
    var row = el('div', 'acsv-sarow');
    row.appendChild(el('div', 'acsv-satt', a.title));
    if (a.decr) row.appendChild(el('div', 'acsv-sadecr', a.decr));
    var meta = el('div', 'acsv-sameta');
    if (a.name) meta.appendChild(el('span', null, '@' + a.name));
    if (a.views) meta.appendChild(el('span', null, '阅读 ' + a.views));
    if (a.comments) meta.appendChild(el('span', null, '评论 ' + a.comments));
    if (a.channel) meta.appendChild(el('span', 'acsv-sach', a.channel));
    if (a.dateText) meta.appendChild(el('span', null, a.dateText));
    row.appendChild(meta);
    row.addEventListener('click', function () {
      // 文章落原生页（脚本无文章播放，与关注流文章卡同口径）
      var w = window.open(CFG.api.articleBase + a.id, '_blank');
      if (w) w.opener = null;
    });
    return row;
  }

  function render() {
    if (!res.isConnected) return; // 已拆视图：在途回包不落 DOM
    if (!c.kw) { // 空词：隐含 chips/结果全清 + 历史态
      chips.textContent = '';
      hideSkel();
      sentinel.style.display = 'none';
      end.textContent = '';
      renderHistory();
      return;
    }
    // chips：计数来自各端点 totalNum（已加载的类目才显数字——不编造未取过的数）
    chips.textContent = '';
    KINDS.forEach(function (k) {
      var ks = c.kinds[k];
      var b = el('button', 'acsv-schip' + (k === curKind ? ' on' : ''),
        KIND_LABEL[k] + (ks.total ? ' ' + ks.total : ''));
      b.type = 'button';
      b.addEventListener('click', function () {
        if (k === curKind) return;
        location.hash = hashOf(k, kw); // 走地址重建（读缓存，零请求）
      });
      chips.appendChild(b);
    });
    var st = c.kinds[curKind];
    end.textContent = '';
    res.textContent = '';
    if (st.err) {
      hideSkel();
      setState('');
      var r = el('button', 'acsv-sretry', '加载失败，点击重试');
      r.type = 'button';
      r.addEventListener('click', retry);
      res.appendChild(r);
      sentinel.style.display = 'none';
      if (activeIO) activeIO.unobserve(sentinel);
      return;
    }
    if (!st.items.length) {
      if (st.loading || !st.done) { // 首屏在途（或还没发）：骨架占位，勿闪空
        setState('');
        showSkel();
      } else {
        hideSkel();
        setState(emptyTextOf(curKind));
      }
      sentinel.style.display = 'none';
      if (activeIO) activeIO.unobserve(sentinel);
      return;
    }
    hideSkel();
    setState('');
    // 视频类目结果容器带 .acsv-sgrid（16:9 网格；类名只在视频类目上——UP/文章是卡片/文本流）
    res.className = 'acsv-sres' + (curKind === 'video' ? ' acsv-sgrid' : '');
    if (curKind === 'video') st.items.forEach(function (it) { res.appendChild(videoCellOf(it)); });
    else if (curKind === 'up') st.items.forEach(function (u) { res.appendChild(upCardOf(u)); });
    else st.items.forEach(function (a) { res.appendChild(articleRowOf(a)); });
    if (st.done && st.total) end.textContent = '已显示全部 ' + st.total + ' 条';
    // 续页哨兵：每渲染后重挂末尾（IO 已在视口内即续翻，短路页自动补）；回顶钮紧随其后
    // （同为 sticky/流末件，被后追加的结果卡挤到中间就不再钉底）
    body.appendChild(sentinel);
    body.appendChild(backTop);
    sentinel.style.display = st.done ? 'none' : '';
    if (activeIO) {
      activeIO.unobserve(sentinel);
      if (!st.done) activeIO.observe(sentinel);
    }
  }

  if (!activeIO) {
    activeIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting || !res.isConnected) return;
        var st = c.kinds[curKind];
        if (c.kw && !st.done && !st.err && !st.loading) ensure(curKind, st.page + 1);
      });
    }, { rootMargin: '200px' });
  }

  // 顶栏输入框提交（setSearchHandler 接管期）；同词再回车 hash 不变——就地重跑
  function submit(nw) {
    nw = String(nw == null ? '' : nw).trim();
    var target = nw ? hashOf(curKind, nw) : CFG.hash + '/search';
    if (location.hash === '#' + target) {
      if (nw) rerun(); else render();
      return;
    }
    location.hash = target;
  }
  setSearchHandler(submit);
  activeSubmit = submit;

  if (kw) {
    histAdd(kw); // 记历史（幂等：同词提前）；每次真正发起搜索记一次
    KINDS.forEach(function (k) { ensure(k, 1); }); // 并行预拉三类目（chips 计数/切类目零等待）
  } else {
    focusSearch();
  }
  render();
}

// 退出/重建时还原默认提交（player.navSearch）——不还原则离开搜索视图后顶栏 Enter 仍打在本
// 视图的旧闭包上（写 hash 前先撞同词判定，表现为"点了没反应"）；续页观察器同批断开
function teardownSearchView() {
  activeSubmit = null;
  setSearchHandler(null);
  if (activeIO) { activeIO.disconnect(); activeIO = null; }
  if (histListener) { document.removeEventListener('acsv-searchhist', histListener); histListener = null; }
}

registerView({
  id: 'search',
  build: buildSearchView,
  teardown: teardownSearchView,
  // 深界面（0.9.74）：关闭/返回=回来源界面（挂起链顶）；被播放层盖住时作为来源视图挂起
  deep: true,
  // 顶栏输入框是常驻单例：挂起期（DOM 还在、输入框归别人用）必须交还默认提交，
  // 否则本视图的闭包会劫持离开后写下的 Enter——复原时再接管回来
  suspend: function () { setSearchHandler(null); },
  resume: function () { if (activeSubmit) setSearchHandler(activeSubmit); }
});
