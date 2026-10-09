import { CFG } from './cfg.js';
import { gmRequest } from './net.js';
import { createFeedContext, runChain, registerContext, activateContext } from './feedctx.js';
import { el, fmt, ensureStyle, closeOnOutsideClick } from './ui.js';
import { mountSpaceTab, watchSpaceTabs } from './spacetab.js'; // 空间页标签栏注入件（0.9.218 抽出单源）
import { FeedStore } from './feedstore.js';
import { API } from './api.js';
import { imgInto } from './imgload.js';

// ---------- UP 主空间页：小视频区块 ----------
// m 站 upPage 的 pagelet 数据（GM_xhr 抓取，跨域）；翻页游标为时间戳，no_more 表示到底。
// 自动链式加载（有页数上限）→ 页码分页浏览；最新=接口顺序，最热=渐进拉取点赞数后重排
var PAGE_SIZE = CFG.page.size;
// 核心字段由工厂生成（0.9.106，与 FollowVideos 同源）；本对象余下是空间页自有 UI 壳字段。
// pcursor 初值 null 是首拉判据（loadUpVideos(pcursor === null)），故 firstCursor: null
export var UpVideos = registerContext(createFeedContext({ firstCursor: null }));
UpVideos.uid = 0;
UpVideos.total = 0;
UpVideos.busy = false;
UpVideos.page = 1;
UpVideos.sortBy = 'newest';
UpVideos.counts = {};
UpVideos.countsFetched = 0;
UpVideos.hotFetching = false;
UpVideos.gridEl = null;
UpVideos.pagebarEl = null;
UpVideos.progressEl = null;
UpVideos.sortWrapEl = null;
UpVideos.countSpan = null;

// m 站对桌面 UA 会 302 到 PC 空间页（无小视频数据），必须伪装手机 UA
var M_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
function gmGetText(url) {
  return gmRequest({
    method: 'GET', url: url, timeout: CFG.time.gm, responseType: 'text',
    headers: { 'Referer': 'https://m.acfun.cn/', 'User-Agent': M_UA }
  });
}

function parseUpItems(html) {
  // DOMParser 的文档是惰性的：不触发 img 预取（detached div.innerHTML 会对封面发起双份下载）
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var out = [];
  var lis = doc.querySelectorAll('li[meow-id]');
  for (var i = 0; i < lis.length; i++) {
    var img = lis[i].querySelector('img');
    out.push({
      id: lis[i].getAttribute('meow-id'),
      cover: img ? img.getAttribute('src') : ''
    });
  }
  return out;
}

// m 站把各投稿类型的数据内联成 var xxxInfo = {...}（0 投稿是 ""）；整页里 articlesInfo
// 等也带 totalCount，裸抓首个 "totalCount" 会拿到别的投稿数——必须按变量名精确提取
function extractSvInfo(text) {
  var m = text.match(/var shortVideoInfo\s*=\s*([\s\S]*?);/);
  if (!m || m[1].charAt(0) !== '{') return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function loadUpVideos(first) {
  var uid = UpVideos.uid;
  UpVideos.busy = true;
  var url = first
    ? CFG.api.upPage + uid
    : CFG.api.upPage + uid + '?page=' + UpVideos.pcursor
      + '&userId=' + uid + '&type=6&pcursor=' + UpVideos.pcursor
      + '&pagelets=short-video-list&ajaxpipe=1';
  return gmGetText(url).then(function (txt) {
    UpVideos.busy = false;
    var html = txt, pc = 'no_more', svi;
    if (first) {
      svi = extractSvInfo(txt);
    } else {
      try {
        var j = JSON.parse(txt.replace(/\/\*<!-- fetch-stream -->\*\/\s*$/, ''));
        html = (j && j.html) || '';
        // totalCount/pcursor 都在 scripts 内联的 shortVideoInfo 里，html 片段没有
        svi = extractSvInfo(((j && j.scripts) || []).join(''));
      } catch (e) {
        UpVideos.failed = true;
        return [];
      }
    }
    if (svi) {
      if (svi.totalCount) UpVideos.total = Number(svi.totalCount) || 0;
      if (svi.pcursor) pc = svi.pcursor;
    }
    var items = parseUpItems(html);
    if (pc === 'no_more' || !items.length) {
      UpVideos.done = true;
      // 到底后以实际加载条数为准：0 投稿归零，接口计数异常时也被纠正
      UpVideos.total = UpVideos.items.length + items.length;
    }
    UpVideos.pcursor = pc;
    return items;
  }, function () {
    UpVideos.busy = false;
    UpVideos.failed = true;
    return [];
  });
}

function appendUpCells(items, offset) {
  var grid = UpVideos.gridEl;
  if (!grid || !grid.isConnected) return;
  offset = offset || 0;
  items.forEach(function (it, k) {
    var cell = el('div', 'acsv-space-cell');
    cell.title = '播放小视频';
    // 封面走共享加载器（space 策略：重试 + 淡入；失败隐藏，不再留永久 opacity:0 的隐身空卡）
    imgInto(cell, it.cover, 'space');
    cell.addEventListener('click', function () {
      // 从列表第 offset+k 个进入：后续按主页列表顺序播放（单活互斥：清关注视频流等，0.9.106）
      activateContext(UpVideos);
      UpVideos.feedCursor = offset + k + 1;
      FeedStore.resetForList();
      // 写标记形态（0.9.72）：空间页条目全是 meow 小视频，带 v 标记免去解析层的 id 空间探测
      location.hash = CFG.hash + '/v/' + it.id;
    });
    grid.appendChild(cell);
  });
}

function sortedUpItems() {
  var arr = UpVideos.items.slice();
  if (UpVideos.sortBy === 'hotest') {
    var withCounts = arr.filter(function (it) { return UpVideos.counts[it.id] !== undefined; });
    var without = arr.filter(function (it) { return UpVideos.counts[it.id] === undefined; });
    withCounts.sort(function (a, b) { return (UpVideos.counts[b.id] || 0) - (UpVideos.counts[a.id] || 0); });
    return withCounts.concat(without);
  }
  return arr; // 接口顺序即最新在前
}

function renderUpPage() {
  var grid = UpVideos.gridEl;
  if (!grid || !grid.isConnected) return;
  var sorted = sortedUpItems();
  var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  if (UpVideos.page > pages) UpVideos.page = pages;
  var slice = sorted.slice((UpVideos.page - 1) * PAGE_SIZE, UpVideos.page * PAGE_SIZE);
  grid.innerHTML = '';
  appendUpCells(slice, (UpVideos.page - 1) * PAGE_SIZE);
  renderUpPagebar(pages);
  renderUpProgress();
}

function renderUpPagebar(totalPagesLoaded) {
  var bar = UpVideos.pagebarEl;
  if (!bar) return;
  var totalPages = UpVideos.total ? Math.ceil(UpVideos.total / PAGE_SIZE) : totalPagesLoaded;
  var cur = UpVideos.page;
  bar.innerHTML = '';
  function btn(label, target, opts) {
    opts = opts || {};
    var b = el('button', 'acsv-pagebtn' + (opts.cur ? ' cur' : '') + (opts.dots ? ' dots' : ''), label);
    if (opts.disabled) b.disabled = true;
    if (!opts.disabled && !opts.cur && !opts.dots) {
      b.addEventListener('click', function () {
        UpVideos.page = target;
        renderUpPage();
      });
    }
    bar.appendChild(b);
  }
  btn('‹', cur - 1, { disabled: cur <= 1 });
  var shown = {};
  var windowLo = Math.max(1, cur - 2), windowHi = Math.min(totalPages, cur + 2);
  [1, windowLo - 1, windowLo, windowHi + 1, totalPages].forEach(function (p) {
    if (p >= 1 && p <= totalPages) shown[p] = 'jump';
  });
  for (var p = windowLo; p <= windowHi; p++) shown[p] = false;
  var keys = Object.keys(shown).map(Number).sort(function (a, b) { return a - b; });
  var prev = 0;
  keys.forEach(function (p) {
    if (prev && p - prev > 1) btn('…', 0, { dots: true });
    var loaded = p <= totalPagesLoaded;
    btn(String(p), p, { cur: p === cur, disabled: !loaded });
    prev = p;
  });
  btn('›', cur + 1, { disabled: cur >= totalPagesLoaded });
}

function renderUpProgress() {
  var elp = UpVideos.progressEl;
  if (!elp) return;
  // 标签页徽标同步总数（0 投稿也要把 '0' 写实，而不是留占位）
  if (UpVideos.countSpan && (UpVideos.total || UpVideos.done)) {
    UpVideos.countSpan.textContent = fmt(UpVideos.total);
  }
  var loaded = UpVideos.items.length;
  var base = '已加载 ' + loaded + (UpVideos.total ? ' / ' + UpVideos.total : '');
  if (UpVideos.sortBy === 'hotest' && !UpVideos.done) {
    elp.textContent = base + '（加载中，最热排序将在加载完成后准确）';
  } else if (UpVideos.sortBy === 'hotest') {
    elp.textContent = loaded ? '热度统计 ' + UpVideos.countsFetched + ' / ' + loaded : base;
  } else {
    elp.textContent = UpVideos.done ? '共 ' + loaded + ' 个'
      : (UpVideos.failed && !loaded ? '加载失败（需在 Tampermonkey 下运行）'
        : (UpVideos.chainCapped ? base + '（已达自动加载上限）' : base + '（后台加载中）'));
  }
}

// 链式加载：状态机单源=feedctx.runChain（0.9.106；与关注视频流链同机）。
// loadUpVideos 已自带 done/failed/pcursor/total 写状态与页数语义，这里只做并入与 UI 回调
function startUpChain() {
  runChain(UpVideos, {
    maxPages: CFG.up.maxChainPages,
    onDone: renderUpProgress,
    loadPage: function (ctx, isFirst) {
      return loadUpVideos(isFirst).then(function (items) {
        if (items.length) {
          ctx.items = ctx.items.concat(items);
          renderUpPage();
        }
        return { loaded: items.length > 0 };
      });
    }
  });
}

function ensureHotCounts() {
  if (UpVideos.hotFetching) return;
  UpVideos.hotFetching = true;
  (function step() {
    if (!UpVideos.hotFetching) return;
    var todo = UpVideos.items.filter(function (it) { return UpVideos.counts[it.id] === undefined; });
    if (!todo.length) {
      UpVideos.hotFetching = false;
      renderUpProgress();
      return;
    }
    var batch = todo.slice(0, 4);
    Promise.all(batch.map(function (it) {
      // 走 api.js 的统一解析（normalize），不再手取 meowFeed.meowCounts（避免双份解析）
      return API.info(it.id).then(function (n) {
        UpVideos.counts[it.id] = (n && n.like) || 0;
      }, function () {
        UpVideos.counts[it.id] = 0;
      });
    })).then(function () {
      UpVideos.countsFetched = Object.keys(UpVideos.counts).length;
      if (UpVideos.sortBy === 'hotest') renderUpPage();
      renderUpProgress();
      setTimeout(step, CFG.time.hotGap);
    });
  })();
}

function injectSpaceVideos(uid) {
  if (document.getElementById('acsv-space-grid')) return;
  UpVideos.uid = Number(uid);
  UpVideos.pcursor = null;
  UpVideos.done = false;
  UpVideos.failed = false;
  UpVideos.chainCapped = false;
  UpVideos.total = 0;
  UpVideos.items = [];
  UpVideos.page = 1;
  UpVideos.sortBy = 'newest';
  UpVideos.counts = {};
  UpVideos.countsFetched = 0;
  ensureStyle();

  var grid = el('div', 'acsv-space-grid');
  grid.id = 'acsv-space-grid';
  var pagebar = el('div', 'acsv-pagebar');
  var progress = el('span', 'acsv-progress-txt', '加载中…');

  // 最新/最热排序（样式仿站点排序下拉）
  var sort = el('div', 'acsv-sort');
  sort.appendChild(el('span', 'acsv-sort-cur', '最新'));
  sort.appendChild(el('i', 'arrow', '▾'));
  var menu = el('ul', 'acsv-sort-menu');
  [['newest', '最新'], ['hotest', '最热']].forEach(function (p) {
    var li = el('li', p[0] === 'newest' ? 'on' : '', p[1]);
    li.dataset.sort = p[0];
    li.addEventListener('click', function (ev) {
      ev.stopPropagation();
      UpVideos.sortBy = p[0];
      sort.querySelector('.acsv-sort-cur').textContent = p[1];
      [...menu.children].forEach(function (m) { m.classList.toggle('on', m.dataset.sort === p[0]); });
      sort.classList.remove('open');
      UpVideos.page = 1;
      renderUpPage();
      if (p[0] === 'hotest') ensureHotCounts();
    });
    menu.appendChild(li);
  });
  sort.appendChild(menu);
  sort.addEventListener('click', function (ev) {
    ev.stopPropagation();
    sort.classList.toggle('open');
  });
  // 外点收起（0.9.148 收口）：原为自挂 document 冒泡监听且永不注销；与弹层/面板共用 ui.closeOnOutsideClick（捕获相）。
  // 菜单选项自有关闭逻辑（li 点击内 sort.classList.remove('open')）⇒ 内部点击不算外点
  closeOnOutsideClick(menu, [sort], function () { sort.classList.remove('open'); });

  var toolbar = el('div', 'acsv-toolbar');
  toolbar.appendChild(progress);
  toolbar.appendChild(sort);

  UpVideos.gridEl = grid;
  UpVideos.pagebarEl = pagebar;
  UpVideos.progressEl = progress;

  // 优先嵌入空间页的内容标签栏（原生 视频/文章/合辑 之后加一个「小视频」）。
  // 0.9.218：注入/切换/排序收口 spacetab.mountSpaceTab（与「动态」标签同源）——order=2 ⇒
  // 排在「动态（order=1）」之后，且与两者注入先后无关（首尾规则见该件头注）；本件只给
  // 面板内容与启动链。
  var cl = document.querySelector('.ac-space-contribute-list');
  var tagsUl = cl && cl.querySelector('ul.tags');
  if (cl && tagsUl) {
    var mounted = mountSpaceTab({
      cl: cl, tagsUl: tagsUl, index: 'svideo', order: 2,
      html: '小视频<span>0</span>', // 含徽标 span，须走 innerHTML 语义（el 第三参是 textContent）
      title: '该 UP 主的小视频',
      buildPanel: function (panel) {
        panel.appendChild(toolbar);
        panel.appendChild(grid);
        panel.appendChild(pagebar);
      }
    });
    if (mounted) {
      UpVideos.countSpan = mounted.li.querySelector('span');
      startUpChain();
    }
    return; // 标签栏在：不论本次是否新注入（可能已注入过）都不走兜底区块
  }

  // 兜底：标签栏不存在时退化为底部独立区块
  var space = document.getElementById('ac-space');
  var wp = space && (space.querySelector('.wp') || space);
  if (!wp) return;
  var sec = el('section', 'acsv-space');
  sec.id = 'acsv-space';
  var head = el('div', 'acsv-space-head');
  head.appendChild(el('h2', null, '小视频'));
  head.appendChild(el('span', 'n', '0'));
  sec.appendChild(head);
  sec.appendChild(toolbar);
  sec.appendChild(grid);
  sec.appendChild(pagebar);
  wp.appendChild(sec);
  UpVideos.countSpan = head.querySelector('.n');
  startUpChain();
}

// 自愈回调（0.9.218，spacetab.watchSpaceTabs 驱动）：**单次同步尝试**，不起定时器
//（观察器被反复触发时不得叠出多串重试）。三个条件同时成立才重注：在 /u/ 页、空间页根在、
// 两个哨兵都不在（=被站点重渲染冲掉了）。injectSpaceVideos 与 mountSpaceTab 本身幂等。
export function healSpaceVideos() {
  var mU = location.pathname.match(/^\/u\/(\d+)/);
  if (!mU) return;
  if (document.getElementById('acsv-space') || document.getElementById('acsv-space-grid')) return;
  if (!document.getElementById('ac-space')) return;
  injectSpaceVideos(mU[1]);
}

export function tryInjectSpace() {
  var mU = location.pathname.match(/^\/u\/(\d+)/);
  if (!mU) return;
  watchSpaceTabs(healSpaceVideos); // 自愈：SPA 重渲染冲掉注入项后回补（0.9.218 共享观察器）
  var tries = 0;
  var attempt = function () {
    // 主路径产物是 grid（tab 注入），兜底路径产物才是 section——两个哨兵都要查，
    // 否则主路径成功后 attempt 会反复重入（此前靠 injectSpaceVideos 内层守卫兜住，0.9.36 收口）
    if (document.getElementById('acsv-space') || document.getElementById('acsv-space-grid')) return;
    if (document.getElementById('ac-space')) {
      injectSpaceVideos(mU[1]);
      return;
    }
    if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
  };
  attempt();
}
