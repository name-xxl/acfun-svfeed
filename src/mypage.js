import { CFG } from './cfg.js';
import { el } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem } from './data.js';
import { registerView, rowOf, moreBtn } from './views.js';

// ---------- 我的视图（0.9.62）：观看历史 + 收藏夹 ----------
// 接口契约 docs/api-research.md §4.1/§4.2（2026-10-02 实测）：历史 body 双 resourceTypes
// 缺一即 result 21「参数格式错误」；dougaList 列表键是 favoriteList（无 list 别名）。
// 条目一律经 panelItem 规整（类型过滤在契约层），点击 rowOf 内置 playAc 回竖刷。
function rowList(parent, cls) {
  var list = el('div', 'acsv-vlist ' + cls);
  parent.appendChild(list);
  return list;
}

// ---- 观看历史：pageNo 翻页，list.length < pageSize 即到底 ----
function buildHistory(section) {
  var pageNo = 0;
  var list = rowList(section, 'hist');
  var btn = moreBtn(load);
  section.appendChild(btn);

  function load(b) {
    postForm(CFG.api.history,
      'pageNo=' + (pageNo + 1) + '&pageSize=' + CFG.view.pageSize
      + '&resourceTypes=1&resourceTypes=2').then(function (j) {
        if (b) { b.disabled = false; b.textContent = '加载更多'; }
        var rows = [];
        ((j && j.histories) || []).forEach(function (raw) {
          var pi = panelItem('history', raw);
          if (pi) rows.push(pi);
        });
        pageNo++;
        rows.forEach(function (pi) { list.appendChild(rowOf(pi)); });
        // 到底判定：本页有票数不足一页或零条（空页防死循环，feedstore 同款）
        if (rows.length < CFG.view.pageSize && b) b.style.display = 'none';
        if (!rows.length && pageNo === 1) list.appendChild(el('div', 'acsv-vempty', '暂无观看记录'));
      }, function () {
        if (b) { b.disabled = false; b.textContent = '加载失败，点击重试'; }
      });
  }
  load(null);
}

// ---- 收藏夹：夹 chips → 单夹 dougaList 翻页 ----
function buildFav(section) {
  var chips = el('div', 'acsv-vchips');
  var list = rowList(section, 'fav');
  var btn = moreBtn(null);
  section.appendChild(btn);
  var folderId = null, page = 0;

  btn.addEventListener('click', function () { if (folderId) load(null); });
  postForm(CFG.api.favFolderList, '').then(function (j) {
    var folders = (j && (j.dataList || j.data)) || [];
    if (!folders.length) {
      section.insertBefore(el('div', 'acsv-vempty', '还没有收藏夹'), btn);
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
    section.insertBefore(chips, btn);
    if (folderId) load(null);
  }, function () {
    section.insertBefore(el('div', 'acsv-vempty', '收藏夹加载失败'), btn);
    btn.style.display = 'none';
  });

  function load(b) {
    postForm(CFG.api.favDougaList,
      'folderId=' + folderId + '&page=' + (page + 1) + '&perpage=' + CFG.view.pageSize)
      .then(function (j) {
        page++;
        if (b) { b.disabled = false; b.textContent = '加载更多'; }
        var rows = [];
        ((j && j.favoriteList) || []).forEach(function (raw) {
          var pi = panelItem('fav', raw);
          if (pi) rows.push(pi);
        });
        rows.forEach(function (pi) { list.appendChild(rowOf(pi)); });
        // total 对照判定到底（favoriteList 与 folder/info 的 resourceCount 自洽，§4.2 实测）
        if ((j && rows.length < CFG.view.pageSize) || !rows.length) btn.style.display = 'none';
        if (!rows.length && page === 1) list.appendChild(el('div', 'acsv-vempty', '这个夹还没有收藏'));
      }, function () {
        if (b) { b.disabled = false; b.textContent = '加载失败，点击重试'; }
      });
  }
}

function buildMyView(body) {
  var secHist = el('div', 'acsv-vsec');
  secHist.appendChild(el('div', 'acsv-vsec-title', '观看历史'));
  body.appendChild(secHist);
  buildHistory(secHist);

  var secFav = el('div', 'acsv-vsec');
  secFav.appendChild(el('div', 'acsv-vsec-title', '收藏夹'));
  body.appendChild(secFav);
  buildFav(secFav);
}

registerView({ id: 'my', title: '我的', build: buildMyView });
