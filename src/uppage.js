import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, fmt, ensureStyle } from './ui.js';
import { FeedStore } from './feedstore.js';
import { API } from './api.js';

// ---------- UP 主空间页：小视频区块 ----------
// m 站 upPage 的 pagelet 数据（GM_xhr 抓取，跨域）；翻页游标为时间戳，no_more 表示到底。
// 自动链式加载（有页数上限）→ 页码分页浏览；最新=接口顺序，最热=渐进拉取点赞数后重排
var PAGE_SIZE = CFG.page.size;
export var UpVideos = {
  uid: 0, pcursor: null, total: 0, busy: false, done: false, failed: false,
  items: [], chainBusy: false, chainCapped: false, page: 1, sortBy: 'newest',
  counts: {}, countsFetched: 0, hotFetching: false,
  feedActive: false, feedCursor: 0,
  gridEl: null, pagebarEl: null, progressEl: null, sortWrapEl: null, countSpan: null
};

function gmGetText(url) {
  return new Promise(function (resolve, reject) {
    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        timeout: CFG.time.gm,
        headers: {
          'Referer': 'https://m.acfun.cn/',
          // m 站对桌面 UA 会 302 到 PC 空间页（无小视频数据），必须伪装手机 UA
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
        },
        onload: function (r) { resolve(r.responseText); },
        onerror: function () { reject(new Error('network')); },
        ontimeout: function () { reject(new Error('timeout')); }
      });
    } else {
      reject(new Error('no-gm'));
    }
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
    var img = el('img');
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.addEventListener('load', function () { img.classList.add('ld'); });
    img.src = it.cover;
    cell.appendChild(img);
    cell.addEventListener('click', function () {
      // 从列表第 offset+k 个进入：后续按主页列表顺序播放
      UpVideos.feedActive = true;
      UpVideos.feedCursor = offset + k + 1;
      FeedStore.resetForList();
      location.hash = CFG.hash + '/' + it.id;
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

function startUpChain() {
  if (UpVideos.chainBusy) return;
  UpVideos.chainBusy = true;
  UpVideos.chainCapped = false;
  var pages = 0; // 本轮已加载页数：有上限，防超大 UP 主无感发几百个请求
  (function step() {
    if (!UpVideos.chainBusy || UpVideos.done || pages >= CFG.up.maxChainPages) {
      UpVideos.chainCapped = !UpVideos.done && pages >= CFG.up.maxChainPages;
      UpVideos.chainBusy = false;
      renderUpProgress();
      return;
    }
    pages++;
    loadUpVideos(UpVideos.pcursor === null).then(function (items) {
      if (items.length) {
        UpVideos.items = UpVideos.items.concat(items);
        renderUpPage();
      }
      if (UpVideos.done || !items.length) {
        UpVideos.chainBusy = false;
        renderUpProgress();
        return;
      }
      setTimeout(step, CFG.time.chainGap);
    });
  })();
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
  document.addEventListener('click', function () { sort.classList.remove('open'); }, { once: false });

  var toolbar = el('div', 'acsv-toolbar');
  toolbar.appendChild(progress);
  toolbar.appendChild(sort);

  UpVideos.gridEl = grid;
  UpVideos.pagebarEl = pagebar;
  UpVideos.progressEl = progress;

  // 优先嵌入空间页的内容标签栏（视频/文章/合辑之后加一个「小视频」）
  var cl = document.querySelector('.ac-space-contribute-list');
  var tagsUl = cl && cl.querySelector('ul.tags');
  if (cl && tagsUl) {
    var albumLi = tagsUl.querySelector('li[data-index="album"]');
    // 站点原生排序（只对视频/文章/合辑生效）：小视频激活时隐藏，切走时恢复
    var siteSortSpan = tagsUl.querySelector('#ac-space-contribute-sort');
    var siteSortLi = siteSortSpan ? siteSortSpan.closest('li') : null;
    var li = el('li', null, '小视频<span>0</span>');
    li.dataset.index = 'svideo';
    li.title = '该 UP 主的小视频';
    var panel = el('div', 'tag-content');
    panel.appendChild(toolbar);
    panel.appendChild(grid);
    panel.appendChild(pagebar);
    li.addEventListener('click', function (ev) {
      // 手动切换，阻断站点委托（未知 data-index 可能引发站点代码异常）
      ev.stopPropagation();
      if (siteSortLi) siteSortLi.style.display = 'none';
      var lis = tagsUl.children;
      for (var i = 0; i < lis.length; i++) lis[i].classList.remove('active');
      li.classList.add('active');
      var panels = cl.querySelectorAll(':scope > .tag-content');
      for (var k = 0; k < panels.length; k++) panels[k].classList.remove('active');
      panel.classList.add('active');
    });
    // 点其他标签时恢复站点排序显示
    tagsUl.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('li[data-index]') : null;
      if (t && t.dataset.index !== 'svideo' && siteSortLi) siteSortLi.style.display = '';
    });
    if (albumLi) albumLi.insertAdjacentElement('afterend', li);
    else tagsUl.appendChild(li);
    cl.appendChild(panel);
    UpVideos.countSpan = li.querySelector('span');
    startUpChain();
    return;
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

export function tryInjectSpace() {
  var mU = location.pathname.match(/^\/u\/(\d+)/);
  if (!mU) return;
  var tries = 0;
  var attempt = function () {
    if (document.getElementById('acsv-space')) return;
    if (document.getElementById('ac-space')) {
      injectSpaceVideos(mU[1]);
      return;
    }
    if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
  };
  attempt();
}
