// ---------- 表情包服务 + 面板渲染（0.9.36 自 comments.js 拆出） ----------
// 数据：原生页写入的 localStorage 缓存优先，miss 才请求接口；UBB 渲染（ubb.js）读 map。
// 面板：分包 tab + 最近使用（localStorage 记录），插入走调用方注入的光标回调。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { el } from './ui.js';

// 表情包数据（复用动态广场 fetchEmoticonPacks/_applyEmoticons 思路）：
// map[id]={url,big,name,pkg} 供 UBB 渲染；packs=[{name,items}] 供面板分包展示
export var EmotionMap = { loaded: false, loading: null, map: {}, packs: [] };

function applyEmotPacks(flat) {
  var map = {};
  var packs = [];
  var byName = {};
  (flat || []).forEach(function (u) {
    if (!u || !u.emotionId || !u.emotionImageUrl) return;
    var big = u.emotionBigUrl || u.emotionImageUrl;
    map[u.emotionId] = { url: u.emotionImageUrl, big: big, name: u.emotionName || '', pkg: u.emotionPkgName || '' };
    var pack = byName[u.emotionPkgName];
    if (!pack) {
      pack = byName[u.emotionPkgName] = { name: u.emotionPkgName || '表情', items: [] };
      packs.push(pack);
    }
    pack.items.push({ id: u.emotionId, url: u.emotionImageUrl, big: big, name: u.emotionName || '' });
  });
  EmotionMap.map = map;
  EmotionMap.packs = packs;
  EmotionMap.loaded = true;
  return packs;
}

export function ensureEmotionMap() {
  if (EmotionMap.loaded) return Promise.resolve();
  if (EmotionMap.loading) return EmotionMap.loading;
  EmotionMap.loading = new Promise(function (resolve) {
    // 原生页面写入的 localStorage 缓存优先（www.acfun.cn 登录后存在）
    try {
      var cached = JSON.parse(localStorage.getItem('emoticonList') || 'null');
      if (Array.isArray(cached) && cached.length) { applyEmotPacks(cached); resolve(); return; }
    } catch (e) { }
    request(CFG.api.emotion, 'POST').then(function (j) {
      var flat = [];
      var pkgs = (j && (j.emotionPackageList || j.data)) || [];
      pkgs.forEach(function (p) {
        (p.emotions || []).forEach(function (e) {
          try {
            var url = e.emotionImageSmallUrl
              || (e.smallImageInfo && e.smallImageInfo.thumbnailImageCdnUrl)
              || (e.smallImageInfo && e.smallImageInfo.thumbnailImage && e.smallImageInfo.thumbnailImage.cdnUrls && e.smallImageInfo.thumbnailImage.cdnUrls[0] && e.smallImageInfo.thumbnailImage.cdnUrls[0].url)
              || '';
            var rawBig = (typeof e.emotionImageBigUrl === 'string' && e.emotionImageBigUrl)
              || (e.bigImageInfo && e.bigImageInfo.thumbnailImageCdnUrl)
              || (e.bigImageInfo && e.bigImageInfo.thumbnailImage && e.bigImageInfo.thumbnailImage.cdnUrls && e.bigImageInfo.thumbnailImage.cdnUrls[0] && e.bigImageInfo.thumbnailImage.cdnUrls[0].url)
              || '';
            flat.push({
              emotionId: e.id,
              emotionPkgName: p.name,
              emotionImageUrl: url,
              emotionBigUrl: rawBig || url,
              emotionName: (typeof e.name === 'string' && e.name) || ''
            });
          } catch (err) { }
        });
      });
      applyEmotPacks(flat);
      resolve();
    }, function () {
      EmotionMap.loading = null; // 清掉失败标记，下次进入可重试（否则整场会话表情失效）
      resolve();
    });
  });
  return EmotionMap.loading;
}

// ---- 最近使用 ----
function emotReadRecent() {
  try {
    var ids = JSON.parse(localStorage.getItem('acsv_emot_recent_v1') || '[]');
    if (Array.isArray(ids)) return ids.map(String).filter(Boolean).slice(0, CFG.comments.recentMax);
  } catch (e) { }
  return [];
}
function emotPick(id) {
  var ids = emotReadRecent().filter(function (x) { return x !== String(id); });
  ids.unshift(String(id));
  try { localStorage.setItem('acsv_emot_recent_v1', JSON.stringify(ids.slice(0, CFG.comments.recentMax))); } catch (e) { }
}
function emotFind(id) {
  var packs = EmotionMap.packs || [];
  for (var i = 0; i < packs.length; i++) {
    for (var k = 0; k < packs[i].items.length; k++) {
      if (String(packs[i].items[k].id) === String(id)) return packs[i].items[k];
    }
  }
  return null;
}

// 面板渲染进调用方给的容器（评论输入条旁挂载）；insert(code) 由调用方注入——
// 表情模块不关心光标在哪个输入框里
export function renderEmotPanel(panel, insert) {
  panel.innerHTML = '';
  var packs = EmotionMap.packs || [];
  if (!packs.length) {
    panel.appendChild(el('div', 'acsv-drawer-tip', '表情加载失败，请重试'));
    return;
  }
  function addEmot(grid, it) {
    var b = el('button', 'acsv-emot-item');
    b.title = it.name || ('[emot=acfun,' + it.id + '/]');
    var img = el('img');
    img.src = it.url;
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    img.loading = 'lazy';
    b.appendChild(img);
    b.addEventListener('click', function (ev2) {
      ev2.stopPropagation();
      insert('[emot=acfun,' + it.id + '/]');
      emotPick(it.id);
    });
    grid.appendChild(b);
  }
  function gridOf(items) {
    var grid = el('div', 'acsv-emot-grid');
    items.forEach(function (it) { addEmot(grid, it); });
    return grid;
  }
  var recent = emotReadRecent().map(emotFind).filter(Boolean);
  var tabNames = [];
  if (recent.length) tabNames.push('最近使用');
  packs.forEach(function (p) { tabNames.push(p.name); });
  var tab = panel._tab && tabNames.indexOf(panel._tab) !== -1 ? panel._tab : tabNames[0];
  // 内容区（可滚动）
  var body = el('div', 'acsv-emot-body');
  body.appendChild(el('div', 'acsv-emot-head', tab));
  if (tab === '最近使用') body.appendChild(gridOf(recent));
  else packs.forEach(function (p) { if (p.name === tab) body.appendChild(gridOf(p.items)); });
  panel.appendChild(body);
  // 底部包切换条（固定，不随内容滚动）
  var foot = el('div', 'acsv-emot-foot');
  var strip = el('div', 'acsv-emot-strip');
  function thumb(tabName, imgUrl) {
    var tb = el('button', 'acsv-emot-thumb' + (tab === tabName ? ' on' : ''));
    tb.title = tabName;
    var ti = el('img');
    ti.src = imgUrl;
    ti.referrerPolicy = 'no-referrer';
    ti.alt = '';
    tb.appendChild(ti);
    tb.addEventListener('click', function (ev2) {
      ev2.stopPropagation();
      panel._tab = tabName;
      renderEmotPanel(panel, insert);
    });
    strip.appendChild(tb);
  }
  if (recent.length) thumb('最近使用', recent[0].url);
  packs.forEach(function (p) { thumb(p.name, p.items[0].url); });
  var prev = el('button', 'acsv-emot-page', '‹');
  var next = el('button', 'acsv-emot-page', '›');
  prev.addEventListener('click', function (ev2) { ev2.stopPropagation(); strip.scrollBy({ left: -120, behavior: 'smooth' }); });
  next.addEventListener('click', function (ev2) { ev2.stopPropagation(); strip.scrollBy({ left: 120, behavior: 'smooth' }); });
  foot.appendChild(prev);
  foot.appendChild(strip);
  foot.appendChild(next);
  panel.appendChild(foot);
}
