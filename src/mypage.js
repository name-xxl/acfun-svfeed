import { CFG } from './cfg.js';
import { el, selfUid, fmt } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem, meCardOf } from './data.js';
import { registerView, gridCardOf, moreBtn } from './views.js';

// ---------- 我的视图（0.9.62 起；0.9.69 抖音式个人主页改造）----------
// 布局：资料头（头像/昵称/关注·粉丝·投稿/签名）→ Tab（观看历史｜收藏夹）→ 3:4 封面网格。
// 接口契约 docs/api-research.md §4.1/§4.2（2026-10-02 实测）：历史 body 双 resourceTypes
// 缺一即 result 21「参数格式错误」；dougaList 列表键是 favoriteList（无 list 别名）。
// 条目一律经 panelItem 规整（类型过滤在契约层），点击 gridCardOf 内置 playAc 回竖刷；
// 资料头经 meCardOf（§4.4 getUserCardList）——两处缺省字段都不伪造，缺就不渲染对应块
// （无 auth_key=未登录 → 整块头部不渲染；卡片角标只用契约在册字段）。
// 缓存：资料头模块级缓存（CFG.view.me.cardTtl）——views.js 契约是「每次 enter 重建 DOM」，
// 不缓存会每次进入都打一次接口；失败不写缓存（下次进入重试）。
var meCache = null; // { at, card }

function rowList(parent, cls) {
  var list = el('div', 'acsv-vlist acsv-megrid ' + cls);
  parent.appendChild(list);
  return list;
}

// 首屏骨架：类名独立（acsv-gskel，绝不与行/卡计数选择器同构——0.9.66 同构元素污染计数
// 断言是既有教训）；成功/失败/空三条路径都必须调 remove，否则骨架常驻
function skeleton(listEl) {
  var nodes = [];
  for (var i = 0; i < CFG.view.me.skel; i++) {
    var d = el('div', 'acsv-gskel');
    nodes.push(d);
    listEl.appendChild(d);
  }
  return function () {
    nodes.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
  };
}

// ---- 资料头：auth_key 前缀=uid（ui.selfUid，与私信自有会话排除同源）→ getUserCardList ----
// 头部是锦上添花块：任何一步失败都静默（不 toast/不占位/无控制台噪音），页面照常可用
function buildMeCard(slot) {
  var uid = selfUid();
  if (!uid) return;
  if (meCache && Date.now() - meCache.at < CFG.view.me.cardTtl) { render(meCache.card); return; }
  postForm(CFG.api.userCard, 'ids=' + uid).then(function (j) {
    var card = meCardOf(j, uid);
    if (!card) return;
    meCache = { at: Date.now(), card: card };
    if (!slot.isConnected || slot.firstChild) return; // 视图已退出 / 已渲染过：只留缓存
    render(card);
  }, function () { });

  function render(card) {
    var box = el('div', 'acsv-mecard');
    if (card.avatar) {
      var av = el('img', 'acsv-mecard-av');
      av.src = card.avatar;
      av.referrerPolicy = 'no-referrer';
      av.loading = 'lazy';
      box.appendChild(av);
    } else {
      box.appendChild(el('div', 'acsv-mecard-av')); // 无头像保排版（底色圆）
    }
    var info = el('div', 'acsv-mecard-info');
    info.appendChild(el('div', 'acsv-mecard-name', card.name || ''));
    var stats = el('div', 'acsv-mecard-stats');
    addStat(stats, card.follow, '关注');
    addStat(stats, card.fans, '粉丝');
    addStat(stats, card.contrib, '投稿');
    if (stats.firstChild) info.appendChild(stats);
    info.appendChild(el('div', 'acsv-mecard-id', 'UID：' + card.uid));
    if (card.sign) info.appendChild(el('div', 'acsv-mecard-sign', card.sign));
    box.appendChild(info);
    slot.appendChild(box);
  }
  // 缺省（契约层 null=该字段无来源）不显示 0：避免把「没这个数」说成 0
  function addStat(host, num, label) {
    if (num == null) return;
    var s = el('div', 'acsv-mecard-stat');
    s.appendChild(el('b', '', fmt(num)));
    s.appendChild(document.createTextNode(label));
    host.appendChild(s);
  }
}

// ---- 观看历史：pageNo 翻页，list.length < pageSize 即到底 ----
function buildHistory(panel) {
  var list = rowList(panel, 'hist');
  var btn = moreBtn(load);
  panel.appendChild(btn);
  var pageNo = 0;

  function load(b) {
    var gone = skeleton(list);
    postForm(CFG.api.history,
      'pageNo=' + (pageNo + 1) + '&pageSize=' + CFG.view.pageSize
      + '&resourceTypes=1&resourceTypes=2').then(function (j) {
        gone();
        if (!list.isConnected) return; // 退出视图/重建：在途回包丢弃
        if (b) { b.disabled = false; b.textContent = '加载更多'; }
        var rows = [];
        ((j && j.histories) || []).forEach(function (raw) {
          var pi = panelItem('history', raw);
          if (pi) rows.push(pi);
        });
        pageNo++;
        rows.forEach(function (pi) { list.appendChild(gridCardOf(pi)); });
        // 到底判定：本页有票数不足一页或零条（空页防死循环，feedstore 同款）
        if (rows.length < CFG.view.pageSize && b) b.style.display = 'none';
        if (!rows.length && pageNo === 1) list.appendChild(el('div', 'acsv-vempty', '暂无观看记录'));
      }, function () {
        gone();
        if (!list.isConnected) return;
        if (b) { b.disabled = false; b.textContent = '加载失败，点击重试'; }
        else if (pageNo === 0) list.appendChild(el('div', 'acsv-vempty', '加载失败，稍后重试'));
      });
  }
  load(null);
}

// ---- 收藏夹：夹 chips（列表之上）→ 单夹 dougaList 翻页 ----
function buildFav(panel) {
  var chips = el('div', 'acsv-vchips');
  var list = rowList(panel, 'fav');
  var btn = moreBtn(null);
  panel.appendChild(btn);
  var folderId = null, page = 0;

  btn.addEventListener('click', function () { if (folderId) load(null); });
  var gone = skeleton(list);
  postForm(CFG.api.favFolderList, '').then(function (j) {
    gone();
    if (!list.isConnected) return;
    var folders = (j && (j.dataList || j.data)) || [];
    if (!folders.length) {
      panel.insertBefore(el('div', 'acsv-vempty', '还没有收藏夹'), list);
      btn.style.display = 'none';
      return;
    }
    folders.forEach(function (f, i) {
      var c = el('button', 'acsv-vchip' + (i === 0 ? ' on' : ''),
        (f.name || '收藏夹') + (f.resourceCount != null ? ' ' + f.resourceCount : ''));
      c.addEventListener('click', function () {
        if (folderId === f.folderId) return;
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        folderId = f.folderId;
        page = 0;
        list.innerHTML = '';
        btn.style.display = '';
        btn.textContent = '加载更多';
        load(null);
      });
      chips.appendChild(c);
      if (i === 0) folderId = f.folderId; // 默认选中第一个夹
    });
    // chips 插在**列表之前**（0.9.69 修：原先 insertBefore(chips, btn) 落在列表下方，
    // 夹位选择器跑到视频行底下；真机几何实测 favRow0 y=833 < chips y=997 实锤）
    panel.insertBefore(chips, list);
    if (folderId) load(null);
  }, function () {
    gone();
    if (!list.isConnected) return;
    panel.insertBefore(el('div', 'acsv-vempty', '收藏夹加载失败'), list);
    btn.style.display = 'none';
  });

  function load(b) {
    postForm(CFG.api.favDougaList,
      'folderId=' + folderId + '&page=' + (page + 1) + '&perpage=' + CFG.view.pageSize)
      .then(function (j) {
        if (!list.isConnected) return;
        page++;
        if (b) { b.disabled = false; b.textContent = '加载更多'; }
        var rows = [];
        ((j && j.favoriteList) || []).forEach(function (raw) {
          var pi = panelItem('fav', raw);
          if (pi) rows.push(pi);
        });
        rows.forEach(function (pi) { list.appendChild(gridCardOf(pi)); });
        // total 对照判定到底（favoriteList 与 folder/info 的 resourceCount 自洽，§4.2 实测）
        if ((j && rows.length < CFG.view.pageSize) || !rows.length) btn.style.display = 'none';
        if (!rows.length && page === 1) list.appendChild(el('div', 'acsv-vempty', '这个夹还没有收藏'));
      }, function () {
        if (!list.isConnected) return;
        if (b) { b.disabled = false; b.textContent = '加载失败，点击重试'; }
      });
  }
}

function buildMyView(body) {
  var wrap = el('div', 'acsv-mewrap');
  body.appendChild(wrap);

  var cardSlot = el('div', 'acsv-mecard-slot');
  wrap.appendChild(cardSlot);
  buildMeCard(cardSlot);

  // Tab：面板常驻 DOM 只切 display——切回不重拉接口，翻页游标与已加载列表都保留；
  // 首次激活才 build（惰性），进入视图默认落观看历史
  var tabRow = el('div', 'acsv-metabs');
  wrap.appendChild(tabRow);
  var panelHist = el('div', 'acsv-mepanel');
  var panelFav = el('div', 'acsv-mepanel');
  panelHist.setAttribute('data-tab', 'hist');
  panelFav.setAttribute('data-tab', 'fav');
  panelFav.style.display = 'none';
  wrap.appendChild(panelHist);
  wrap.appendChild(panelFav);

  var panels = {
    hist: { el: panelHist, build: buildHistory, inited: false, name: '观看历史' },
    fav: { el: panelFav, build: buildFav, inited: false, name: '收藏夹' }
  };
  Object.keys(panels).forEach(function (id) {
    var b = el('button', 'acsv-metab', panels[id].name);
    b.type = 'button';
    b.setAttribute('data-tab', id);
    b.addEventListener('click', function () { select(id); });
    tabRow.appendChild(b);
  });

  function select(id) {
    Object.keys(panels).forEach(function (k) {
      panels[k].el.style.display = k === id ? '' : 'none';
    });
    Array.prototype.forEach.call(tabRow.children, function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === id);
    });
    var p = panels[id];
    if (!p.inited) { p.inited = true; p.build(p.el); }
  }
  select('hist');
}

registerView({ id: 'my', build: buildMyView });
