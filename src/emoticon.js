// ---------- 表情包服务 + 面板渲染（0.9.36 自 comments.js 拆出） ----------
// 数据：原生页写入的 localStorage 缓存优先，miss 才请求接口；UBB 渲染（ubb.js）读 map。
// 面板：分包 tab + 最近使用（localStorage 记录），插入走调用方注入的光标回调。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, closeOnOutsideClick } from './ui.js';

// 表情包数据（复用动态广场 fetchEmoticonPacks/_applyEmoticons 思路）：
// map[id]={url,big,name,pkg} 供 UBB 渲染；packs=[{name,items}] 供面板分包展示
export var EmotionMap = { loaded: false, loading: null, map: {}, packs: [] };

// ---------- UBB 表情三件（0.9.105 自 ubb.js 收口表情域） ----------
// 白名单（host 锚定 + 全 URL 字符集，0.9.33 破出 src 属性教训）随表情域走：
// emotImgOf 供 ubb.js 渲染、refillEmoticons 供行流「占位→真图」回填（map 就绪晚于首屏渲染）
var EMOT_CDN_OK = /^https?:\/\/([\w.-]+\.(aixifan\.com|acfun\.cn)|preview\.ndcsk\.com\/ksc2)\//;
var EMOT_URL_OK = /^[\w\-./:?=&%]+$/;
// 返回 { html }（真图）或 null（未就绪/未命中——调用方出占位 span）
export function emotImgOf(pkg, id) {
  pkg = String(pkg || '');
  id = String(id || '');
  if (!pkg || !id) return null;
  if (pkg !== 'acfun') {
    // 非主包老表情走 umeditor 静态路径（与原生 fallback 同构；pkg/id 已过 \w+/\d+ 正则）
    return { html: '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/'
      + pkg + '/' + id + '.gif" referrerpolicy="no-referrer">' };
  }
  var em = EmotionMap.map[id];
  var u = em ? (typeof em === 'string' ? em : em.url) : null;
  if (!u) return null;
  var abs = u.replace(/^\/\//, 'https://');
  if (!EMOT_CDN_OK.test(abs) || !EMOT_URL_OK.test(abs)) return null;
  return { html: '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">' };
}
// 表情占位（灰字；带 data-pkg/id 供回填定位）
export function emotPlaceholderHtml(pkg, id) {
  return '<span class="ubb-emot-ph"'
    + (pkg ? ' data-pkg="' + pkg + '"' : '') + (id ? ' data-id="' + id + '"' : '')
    + '>[表情]</span>';
}
// 占位回填（行流首屏渲染早于 EmotionMap 就绪时；只认带 data 的占位，字面量 [表情] 不动）
export function refillEmoticons(root) {
  if (!root || !EmotionMap.loaded) return;
  [].forEach.call(root.querySelectorAll('.ubb-emot-ph[data-pkg="acfun"][data-id]'), function (ph) {
    var hit = emotImgOf('acfun', ph.getAttribute('data-id'));
    if (hit) ph.outerHTML = hit.html;
  });
}

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

// 表情短代码转图（0.9.54 自 imdrawer 收口，原生页 imnative 同消费——两处硬编码必然漂移）。
// 官方 IM 的 wire 格式就是 [emot=acfun,ID/]，APP/官方 web 原生渲染；EmotionMap 直查转小图，
// 未加载/查无此 ID 降级「[表情]」文本；其余方言包走 umeditor 老图路径——两分支与官方
// convertEmotionCodeToHtml 同构。入参须是已 esc 的 HTML 文本
export function emotify(html) {
  return html
    .replace(/\[emot=acfun,(\S+?)\/\]/g, function (_, id) {
      var it = EmotionMap.map && EmotionMap.map[id];
      return (it && it.url)
        ? '<img class="acsv-emotimg" src="' + it.url + '" referrerpolicy="no-referrer" alt="">'
        : '[表情]';
    })
    .replace(/\[emot=(\S+?),(\S+?)\/\]/g,
      '<img class="acsv-emotimg" src="//cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/$1/$2.gif" referrerpolicy="no-referrer" alt="">');
}

// 表情包跨域缓存（0.9.54）：localStorage 按 origin 隔离——官方页在 www.acfun.cn 写的
// 'emoticonList' 缓存，message.acfun.cn 读不到，原生页此前每次加载都得打接口。GM 存储
// 跨 origin 共享（同一脚本管理器内），带 7 天 TTL；未登录页接口 401 时这层是唯一来源
var GM_EMOT_KEY = 'acsvEmotPacks';
var GM_EMOT_TTL = 7 * 24 * 3600 * 1000;
function gmEmotRead() {
  try {
    if (typeof GM_getValue !== 'function') return null;
    var c = JSON.parse(GM_getValue(GM_EMOT_KEY, 'null') || 'null');
    if (!c || !Array.isArray(c.packs) || !c.packs.length) return null;
    if (Date.now() - c.ts > GM_EMOT_TTL) return null;
    return c.packs;
  } catch (e) { return null; }
}
function gmEmotWrite(flat) {
  try {
    if (typeof GM_setValue !== 'function') return;
    GM_setValue(GM_EMOT_KEY, JSON.stringify({ ts: Date.now(), packs: flat }));
  } catch (e) { }
}

export function ensureEmotionMap() {
  if (EmotionMap.loaded) return Promise.resolve();
  if (EmotionMap.loading) return EmotionMap.loading;
  EmotionMap.loading = new Promise(function (resolve) {
    // 缓存两级：localStorage（origin 内；www.acfun.cn 官方页写入的 'emoticonList'）
    // → GM 存储（跨 origin）→ 接口。都 miss 才请求
    try {
      var cached = JSON.parse(localStorage.getItem('emoticonList') || 'null');
      if (Array.isArray(cached) && cached.length) { applyEmotPacks(cached); resolve(); return; }
    } catch (e) { }
    var gmPacks = gmEmotRead();
    if (gmPacks) { applyEmotPacks(gmPacks); resolve(); return; }
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
      gmEmotWrite(flat); // 回填跨域缓存：本域写入，全 origin（含原生页）后续命中
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
    var ids = JSON.parse(localStorage.getItem(CFG.lsEmotRecent) || '[]');
    if (Array.isArray(ids)) return ids.map(String).filter(Boolean).slice(0, CFG.comments.recentMax);
  } catch (e) { }
  return [];
}
function emotPick(id) {
  var ids = emotReadRecent().filter(function (x) { return x !== String(id); });
  ids.unshift(String(id));
  try { localStorage.setItem(CFG.lsEmotRecent, JSON.stringify(ids.slice(0, CFG.comments.recentMax))); } catch (e) { }
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
    // 悬停大图预览（0.9.96 4.2，广场 emotpanel 特性对照物在 svfeed 单源上的补齐）：
    // 小网格里看不清的表情悬停放大；预览 pointer-events:none 不挡交互，随条目定位
    b.addEventListener('mouseenter', function () {
      var pr = panel._prev;
      if (!pr || !pr.isConnected) {
        pr = el('div', 'acsv-emot-prev');
        pr._img = el('img');
        pr._img.referrerPolicy = 'no-referrer';
        pr.appendChild(pr._img);
        panel.appendChild(pr);
        panel._prev = pr;
      }
      pr._img.src = it.url;
      var prr = panel.getBoundingClientRect(), br = b.getBoundingClientRect();
      var left = br.left - prr.left + br.width / 2 - 62;
      left = Math.max(6, Math.min(left, prr.width - 130)); // 横向钳在面板内
      pr.style.left = left + 'px';
      pr.style.top = Math.max(4, br.top - prr.top - 132) + 'px';
      pr.style.display = 'block';
    });
    b.addEventListener('mouseleave', function () {
      if (panel._prev) panel._prev.style.display = 'none';
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

// ---- 输入条表情按钮三件套（0.9.41 自 comments.js 抽出：评论/私信输入条共用） ----
// 光标处插入 UBB 短代码并聚焦（maxlength 由 textarea 自身属性约束）
export function insertAtCursor(inp, code) {
  var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
  inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
  inp.focus();
  try { inp.setSelectionRange(pos + code.length, pos + code.length); } catch (e) { }
}
// 按钮点击 toggle 面板显隐；首次打开懒加载表情数据再渲染，失败后重开顺带重试。
// panel 由调用方创建并挂到自己抽屉的锚定位置（.acsv-emotpanel 定位随最近 positioned 祖先）
export function mountEmotButton(btn, panel, textarea) {
  var built = false;
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    var show = panel.style.display !== 'flex';
    panel.style.display = show ? 'flex' : 'none';
    // 外点收起（0.9.147 实报：表情面板原本没这逻辑）—— 每面板装一次即可，面板只隐不拆 ⇒
    // 监听常驻生效；点面板内部/按钮本身都不算外点（toggle 语义不变）
    if (!panel._outArmed) {
      panel._outArmed = true;
      closeOnOutsideClick(panel, [btn], function () { panel.style.display = 'none'; });
    }
    function showPanel() { renderEmotPanel(panel, function (code) { insertAtCursor(textarea, code); }); }
    if (show && !built) {
      built = true;
      panel.appendChild(el('div', 'acsv-drawer-tip', '表情加载中…'));
      ensureEmotionMap().then(showPanel);
    } else if (show) {
      ensureEmotionMap().then(showPanel); // 已加载时立即返回；上次失败则顺带重试
    }
  });
}
