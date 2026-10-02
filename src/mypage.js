import { CFG } from './cfg.js';
import { el, selfUid, fmt } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem, meCardOf } from './data.js';
import { gridCardOf, moreBtn } from './views.js';
import { registerView } from './viewreg.js';
import { imgInto } from './imgload.js';

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
      imgInto(box, card.avatar, 'avatar', 'acsv-mecard-av');
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
  var pageNo = 0, seq = 0; // seq：换页/重试令牌，旧回包丢弃（0.9.77，searchview 同款模式）

  function load() {
    var my = ++seq;
    var gone = skeleton(list);
    postForm(CFG.api.history,
      'pageNo=' + (pageNo + 1) + '&pageSize=' + CFG.view.pageSize
      + '&resourceTypes=1&resourceTypes=2').then(function (j) {
        gone();
        if (my !== seq || !list.isConnected) return; // 过期/退出视图：在途回包丢弃
        btn.disabled = false;
        btn.textContent = '加载更多';
        var raws = (j && j.histories) || [];
        var rows = [];
        raws.forEach(function (raw) {
          var pi = panelItem('history', raw);
          if (pi) rows.push(pi);
        });
        pageNo++;
        rows.forEach(function (pi) { list.appendChild(gridCardOf(pi)); });
        // 到底判定按**原始条数**（非筛除后条数）：契约层会滤掉非视频条目（番剧/无 videoId），
        // 「有效行 < pageSize」在筛除后恒真会把还有下一页的列表误判成到底（0.9.77 实锤：
        // mock 首页 20 原始 → 18 有效，按有效数判到底则第二页 4 条永远拉不到）。
        // 判据用闭包 btn（恒在）：首屏 b 不存在，旧实现首屏到底仍显示「加载更多」
        if (raws.length < CFG.view.pageSize) btn.style.display = 'none';
        if (!rows.length && pageNo === 1) list.appendChild(el('div', 'acsv-vempty', '暂无观看记录'));
      }, function () {
        gone();
        if (my !== seq || !list.isConnected) return;
        btn.disabled = false;
        btn.textContent = '加载失败，点击重试';
      });
  }
  load();
}

// ---- 收藏夹：夹 chips（列表之上）→ 单夹 dougaList 翻页 ----
function buildFav(panel) {
  var chips = el('div', 'acsv-vchips');
  var list = rowList(panel, 'fav');
  // 0.9.77 修：旧实现 moreBtn(null) 仍被其内部 onClick(b) 调用——每次点击抛 TypeError 且
  // 按钮卡死「加载中…」（load 收的是 null，无人复位）。改为经 moreBtn 回调统一驱动
  var btn = moreBtn(function () { load(); });
  panel.appendChild(btn);
  var folderId = null, page = 0, seq = 0; // seq：换夹令牌，旧夹在途回包丢弃（0.9.77）

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
        seq++; // 作废旧夹在途回包（慢网连点换夹：旧行不得追加进新夹列表）
        list.innerHTML = '';
        btn.style.display = '';
        btn.disabled = false;
        btn.textContent = '加载更多';
        load();
      });
      chips.appendChild(c);
      if (i === 0) folderId = f.folderId; // 默认选中第一个夹
    });
    // chips 插在**列表之前**（0.9.69 修：原先 insertBefore(chips, btn) 落在列表下方，
    // 夹位选择器跑到视频行底下；真机几何实测 favRow0 y=833 < chips y=997 实锤）
    panel.insertBefore(chips, list);
    if (folderId) load();
  }, function () {
    gone();
    if (!list.isConnected) return;
    panel.insertBefore(el('div', 'acsv-vempty', '收藏夹加载失败'), list);
    btn.style.display = 'none';
  });

  function load() {
    if (!folderId) { // 夹列表未到（按钮先于数据可见）：复位按钮，不发废请求
      btn.disabled = false;
      btn.textContent = '加载更多';
      return;
    }
    var my = ++seq;
    postForm(CFG.api.favDougaList,
      'folderId=' + folderId + '&page=' + (page + 1) + '&perpage=' + CFG.view.pageSize)
      .then(function (j) {
        if (my !== seq || !list.isConnected) return; // 过期/退出视图：在途回包丢弃
        page++;
        btn.disabled = false;
        btn.textContent = '加载更多';
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
        if (my !== seq || !list.isConnected) return;
        btn.disabled = false;
        btn.textContent = '加载失败，点击重试';
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

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 的条目从注册表派生，不再维护第二份清单）
registerView({
  id: 'my', build: buildMyView,
  dock: {
    label: '我的', order: 20, group: 1,
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  }
});
