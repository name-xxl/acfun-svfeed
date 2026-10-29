// ---------- 我的页管理档（0.9.265 自 mypage.js 拆件：逐字搬迁，零行为漂移）----------
// 观看历史档（0.9.279 加单条删除/清空）+ 稍后再看档（0.9.279）+ 收藏夹档。
// 关注分组档 0.9.289 移出至 followadmin.js；**0.9.293 档头/管理模态收 meadmin 共用件**
//（确认稿 docs/preview/me-tabhead.html）：历史档头=danger 文字钮（空列表整行不渲染）、
// 收藏夹=mehead select +「管理收藏夹」模态（与关注列表「编辑分组」同构建器）——
// adminTab 管理壳（chips+ops+内联表单）随批退役（零消费方，死后即删）。
// mypage.js 只留资料头/动态/视图壳与注册；
// 布局与接口契约的总说明见 mypage.js 文件头（两件同属我的视图）。
import { CFG } from './cfg.js';
import { el, selfUid, toast } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem } from './panelitem.js';
import { gridCardOf, skeletonRows } from './cards.js';
import { createListTail } from './listtail.js'; // 尾部单源（0.9.219：我的页四档统一自动触底）
import { createPageLoader } from './pageloader.js'; // 翻页骨架单源（0.9.259：历史档）
import { listWaiting, cancelWaiting } from './watchlaterapi.js';
import { deleteHistory, clearHistory } from './historyapi.js';
import { openConfirmPop } from './pickpop.js';
import { createMeHead, openManageModal, mmWarn } from './meadmin.js';
import { folderList, folderAdd, folderRename, folderDelete, favRemove, favList } from './favapi.js';
import { openFavFolderPop } from './favpop.js';
import { folderNameError } from './nameval.js';

function rowList(parent, cls) {
  var list = el('div', 'acsv-vlist acsv-megrid ' + cls);
  parent.appendChild(list);
  return list;
}

// 首屏骨架（0.9.102 收口：计数/移除走 cards.skeletonRows；类名仍独立 acsv-gskel——
// 绝不与行/卡计数选择器同构，0.9.66 同构元素污染计数断言是既有教训；成功/失败/空三条路径
// 都必须调 remove，否则骨架常驻）
function skeleton(listEl) {
  return skeletonRows(listEl, CFG.view.me.skel, 'acsv-gskel');
}

// 列表会话机械（0.9.179 抽：历史 tab 与 adminTab 此前各写一份 moreWaiters/flush/more——单源收口）：
// 层内「列表」会话续拉 = 攒等待回调 → load() 落定后回话（新增条目 / null=到底或失败）；
// ctxOf(pi) 出 openPanelItem 第二参的会话语境（items 已加载序列 + 预载 idx + more 缝）
function makeListCtx(rowsOf, loadFn, isDone) {
  var waiters = [];
  function flush() {
    var w = waiters;
    waiters = [];
    w.forEach(function (cb) { cb(); });
  }
  function more() {
    if (isDone()) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var before = rowsOf().length;
      waiters.push(function () {
        resolve(rowsOf().length > before ? rowsOf().slice(before) : null);
      });
      loadFn();
    });
  }
  return {
    flush: flush,
    more: more,
    ctxOf: function (pi) {
      var rows = rowsOf();
      return { kind: 'list', items: rows.slice(), idx: Math.max(0, rows.indexOf(pi)), more: more };
    }
  };
}

// ---- 观看历史：pageNo 翻页，list.length < pageSize 即到底 ----
// 尾部加载（0.9.219 统一）：改走 listtail 自动触底（此前是「加载更多」按钮——与同页「动态」档
// 及全站其它页都不一致）；到底/失败改由状态行表达
// 0.9.259（审计批④）：在途守卫/代数令牌/骨架起收/三态状态行收进 pageloader 单源；本档只剩
// 页码方言（请求体 pageNo=pageNo+1）、契约过滤、到底判据与空态。两处差异显式注入：
//   ① skeleton 不看 firstPage——历史档**每页都建**骨架（首屏也是它）；
//   ② earlySettle——0.9.236「在途守卫」的既有形状是**在陈旧守卫之前**结算（loading 与骨架
//      都在守卫前收），与另三家的「守卫后结算」不同形，原样保留
export function buildHistory(panel, scroller) {
  var list = rowList(panel, 'hist');
  var allRows = [];      // 已加载面板条目（层内列表会话的条目源，0.9.173）
  // 档头（meadmin 共用件，0.9.293）：无 select 纯动作行；「清空历史」danger 红字（预览⑥B1），
  // 列表空=整行不渲染（visible 全假触发 mehead 整行隐藏）
  var head = createMeHead(panel, {
    before: list, // 档头钉在列表之上（0.9.294：位置由锚点定，不依赖调用先后）
    actions: [{
      label: '清空历史',
      danger: true,
      visible: function () { return allRows.length > 0; },
      onClick: function (btn) { confirmClear(btn); }
    }]
  });
  var pageNo = 0;        // 页码（已落定页数；请求体 pageNo=pageNo+1，空态判据 pageNo===1）
  var pg = createPageLoader({
    earlySettle: true,
    host: function () { return list; },
    fetch: function () {
      return postForm(CFG.api.history,
        'pageNo=' + (pageNo + 1) + '&pageSize=' + CFG.view.pageSize
        + '&resourceTypes=1&resourceTypes=2');
    },
    skeleton: function () { return skeleton(list); },
    // 建序：尾部件 ↔ 翻页骨架互相引用——骨架先建、状态行走懒引用（`tail` 在首次落定前必然已
    // 赋值：尾部件就在下面几行），尾部件拿 load 本体作触底/重试回调
    setStatus: function (text, busy) { tail.setStatus(text, busy); },
    doneLabel: '已加载全部',
    onPage: function (j, info) {
      var raws = (j && j.histories) || [];
      var rows = [];
      raws.forEach(function (raw) {
        var pi = panelItem('history', raw);
        if (pi) rows.push(pi);
      });
      pageNo++;
      rows.forEach(function (pi) {
        allRows.push(pi);
        list.appendChild(cellOf(pi));
      });
      // 到底判定按**原始条数**（非筛除后条数）：契约层会滤掉非视频条目（番剧/无 videoId），
      // 「有效行 < pageSize」在筛除后恒真会把还有下一页的列表误判成到底（0.9.77 实锤：
      // mock 首页 20 原始 → 18 有效，按有效数判到底则第二页 4 条永远拉不到）
      var noMore = raws.length < CFG.view.pageSize;
      syncTail();
      return { noMore: noMore };
    },
    // 层内续拉回话（0.9.173）：成功给新增条目、失败给 null → 层里停住提示；两路都要回话
    onSettle: function () { lctx.flush(); }
  });
  // 层内语义（0.9.173）：↓/↑ = 历史列表顺序；尾部续拉下一页（到底=null → 层里停住提示）
  var lctx = makeListCtx(function () { return allRows; }, pg.load, function () { return pg.done(); });
  var tail = createListTail({
    root: panel, scrollEl: scroller || panel, pad: CFG.view.me.scrollPad,
    backTopAt: CFG.view.me.backTopAt, onBottom: pg.load, onRetry: pg.load
  });

  // 空态/清空键随列表长度同步（单条删完也要回到「暂无观看记录」）
  function syncTail() {
    var n = allRows.length;
    head.refresh(); // 清空历史随列表长度显隐（空=整行不渲染，0.9.293）
    if (!n) {
      if (!list.querySelector('.acsv-vempty')) list.appendChild(el('div', 'acsv-vempty', '暂无观看记录'));
      tail.setStatus('');
    } else {
      var empty = list.querySelector('.acsv-vempty');
      if (empty) empty.remove();
    }
  }

  function cellOf(pi) {
    var cell = el('div', 'acsv-favcell acsv-histcell');
    cell.appendChild(gridCardOf(pi, function () { return lctx.ctxOf(pi); }));
    if (pi.comboId) {
      var acts = el('div', 'acsv-favacts acsv-hisacts');
      var rm = el('button', 'acsv-vchip sm', '删除');
      rm.type = 'button';
      rm.addEventListener('click', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        openConfirmPop(rm, {
          host: panel,
          title: '删除这条观看记录？',
          text: '只删除观看历史，不会取消收藏，也不影响稿件本身。',
          okLabel: '删除',
          run: function () { return deleteHistory(pi); },
          done: function () {
            var i = allRows.indexOf(pi);
            if (i >= 0) allRows.splice(i, 1);
            cell.remove();
            syncTail();
            toast('已删除观看记录');
          }
        });
      });
      acts.appendChild(rm);
      cell.appendChild(acts);
    }
    return cell;
  }

  // 清空历史（二次确认走 pickpop 确认卡；锚=档头文字钮）
  function confirmClear(btn) {
    openConfirmPop(btn, {
      host: panel,
      title: '清空全部观看历史？',
      text: '共 ' + allRows.length + ' 条记录将被移除，操作不可恢复。',
      okLabel: '清空',
      run: clearHistory,
      done: function () {
        list.innerHTML = '';
        allRows = [];
        syncTail();
        toast('已清空观看历史');
      }
    });
  }

  pg.load();
}

// ---- 稍后再看（0.9.279）：cursor 翻页；卡片复用网格卡，hover「移出」复用收藏夹 cell 动作壳 ----
// 数据面见 watchlaterapi；条目规整见 panelitem.waiting。未登录不请求，直接出可读空态。
export function buildWatchLater(panel, scroller) {
  if (!selfUid()) {
    panel.appendChild(el('div', 'acsv-vempty', '登录后才能查看稍后再看'));
    return;
  }
  var list = rowList(panel, 'wl');
  var allRows = [];
  var pg = createPageLoader({
    host: function () { return list; },
    fetch: function (cursor) { return listWaiting(cursor); },
    skeleton: function () { return skeleton(list); },
    setStatus: function (text, busy) { tail.setStatus(text, busy); },
    doneLabel: '已加载全部',
    onPage: function (page, info) {
      var raws = page.items || [];
      var rows = [];
      raws.forEach(function (raw) {
        var pi = panelItem('waiting', raw);
        if (pi) rows.push(pi);
      });
      var empty = list.querySelector('.acsv-vempty');
      if (empty && rows.length) empty.remove();
      rows.forEach(function (pi) {
        allRows.push(pi);
        list.appendChild(cellOf(pi));
      });
      if (!rows.length && info.firstPage) {
        list.appendChild(el('div', 'acsv-vempty', '还没有稍后再看的内容'));
      }
      return { cursor: page.cursor, noMore: page.noMore };
    },
    onSettle: function () { lctx.flush(); }
  });
  var lctx = makeListCtx(function () { return allRows; }, pg.load, function () { return pg.done(); });
  var tail = createListTail({
    root: panel, scrollEl: scroller || panel, pad: CFG.view.me.scrollPad,
    backTopAt: CFG.view.me.backTopAt, onBottom: pg.load, onRetry: pg.load
  });
  function cellOf(pi) {
    var cell = el('div', 'acsv-favcell acsv-wlcell');
    cell.appendChild(gridCardOf(pi, function () { return lctx.ctxOf(pi); }));
    var acts = el('div', 'acsv-favacts acsv-wlacts');
    var rm = el('button', 'acsv-vchip', '移出');
    rm.type = 'button';
    rm.addEventListener('click', function (ev) {
      ev.stopPropagation();
      ev.preventDefault();
      if (cell._busy) return;
      cell._busy = true;
      cell.style.display = 'none'; // 乐观移除
      cancelWaiting(pi).then(function (ok) {
        cell._busy = false;
        if (!ok) {
          cell.style.display = '';
          toast('移出失败（未登录或网络错误）');
          return;
        }
        var i = allRows.indexOf(pi);
        if (i >= 0) allRows.splice(i, 1);
        cell.remove();
        if (!allRows.length && !list.querySelector('.acsv-vempty')) {
          list.appendChild(el('div', 'acsv-vempty', '还没有稍后再看的内容'));
        }
        toast('已移出稍后再看');
      }, function () {
        cell._busy = false;
        cell.style.display = '';
        toast('移出失败（未登录或网络错误）');
      });
    });
    acts.appendChild(rm);
    cell.appendChild(acts);
    return cell;
  }
  pg.load();
}

// ---- 收藏夹档（0.9.143 管理化；0.9.293 档头/管理收 meadmin 共用件，adminTab 壳退役）----
// 形态=关注列表镜像（预览 me-tabhead.html ⑤B 案）：mehead select（夹名+计数）+「管理收藏夹」
// 模态（meadmin.openManageModal，与关注列表「编辑分组」同构建器：建/改名/删夹，删除确认
// 「一并移除」）；卡面 hover「移动 / 移除收藏」不动。读链走 favapi（folderList 带 inFolder 是
// 选择层专用，本页只用夹表与 favList）；夹 id/名一律字符串。
export function buildFav(panel, scroller) {
  var list = rowList(panel, 'fav');
  var tabs = [];   // [{ id, label, raw }] 夹表（loadTabs 现拉，写链后重拉）
  var cur = null;  // 当前夹 id
  var rows = [];   // 已加载面板条目（顺序；层内列表会话的条目源，0.9.173）
  // 档头钉在列表之上（0.9.294：与历史档同范式——before:list 定位置，不靠调用先后）
  var head = createMeHead(panel, {
    before: list,
    select: {
      load: function () {
        return loadTabs().then(function (ts) {
          return ts.map(function (t) { return { id: t.id, label: t.label }; });
        });
      },
      current: function () { return cur; },
      onPick: function (id) { select(id); }
    },
    actions: [{ label: '管理收藏夹', onClick: function () { openManage(); } }],
    onFail: function () { mmWarn('收藏夹加载失败'); }
  });
  var tail = null;
  var pg = createPageLoader({
    host: function () { return list; },
    fetch: function (cursor) { return favList(cur, cursor + 1); }, // 收藏夹分页=页号（1 起）
    skeleton: function () { return skeleton(list); }, // 每页都建，两路自动收（关注列表同形）
    busyGate: function () { return rows.length > 0; }, // 首屏靠骨架，续拉用状态行
    beforeFetch: function () { if (cur == null) { tail.setStatus(''); return false; } },
    setStatus: function (text, busy) { tail.setStatus(text, busy); },
    doneLabel: '已加载全部',
    failLabel: '加载失败，点击重试',
    onPage: function (j) {
      var raws = (j && j.favoriteList) || [];
      raws.forEach(function (raw) {
        var pi = panelItem('fav', raw);
        if (pi) { rows.push(pi); list.appendChild(favCell(pi)); }
      });
      if (!rows.length && !list.querySelector('.acsv-vempty')) {
        list.appendChild(el('div', 'acsv-vempty', '这个夹还没有收藏'));
      }
      // 到底判定按**原始条数**（favoriteList 与 folder/info 的 resourceCount 自洽，§4.2 实测）
      return { noMore: !raws.length || raws.length < CFG.view.pageSize };
    },
    onSettle: function () { lctx.flush(); }
  });
  // 层内语义（0.9.173）：↓/↑ = 本夹收藏顺序；尾部续拉下一页（到底=null → 层里停住提示）
  var lctx = makeListCtx(function () { return rows; }, pg.load, function () { return pg.done(); });
  tail = createListTail({
    root: panel, scrollEl: scroller || panel, pad: CFG.view.me.scrollPad,
    backTopAt: CFG.view.me.backTopAt, onBottom: pg.load, onRetry: pg.load
  });

  function tabOf(id) {
    for (var i = 0; i < tabs.length; i++) if (String(tabs[i].id) === String(id)) return tabs[i];
    return null;
  }
  function loadTabs() {
    return folderList().then(function (fs) {
      tabs = fs.map(function (f) {
        return { id: f.id, label: (f.name || '收藏夹') + (f.count != null ? ' ' + f.count : ''), raw: f };
      });
      return tabs;
    });
  }
  // 档切换：清列表 → 回第一页（骨架由 pageloader 钩子每页自建自收；reset 作废在途回包）
  function select(id) {
    cur = id;
    var t = tabOf(id);
    head.setLabel(t ? t.label : '');
    pg.reset();
    rows.length = 0;
    list.textContent = '';
    pg.load();
  }
  // 夹表刷新（建/改名/删/移动/移除后）：建夹跳新夹；当前夹被删回落首夹；其余只刷标签计数。
  // 不重拉列表——卡面增删已就地维护（摘卡后空态见 favCell），重拉是旧 adminTab 的粗粒度余留
  function refreshFolders(nextSel) {
    return loadTabs().then(function (ts) {
      if (!list.isConnected) return;
      if (nextSel !== undefined) { select(nextSel); return; }
      if (!ts.length) { // 夹删空
        cur = null;
        head.setLabel('');
        pg.reset();
        rows.length = 0;
        list.textContent = '';
        list.appendChild(el('div', 'acsv-vempty', '还没有收藏夹'));
        tail.setStatus('');
        return;
      }
      if (cur == null || !tabOf(cur)) { select(ts[0].id); return; } // 首进/当前夹被删
      var t = tabOf(cur);
      head.setLabel(t.label); // 改名/他夹增删：只刷标签（计数跟 latest 夹表）
    }, function () {
      if (!list.isConnected) return;
      if (list.children.length) return; // 已有内容：静默（计数可能略旧，下一拍再刷）
      list.textContent = '';
      list.appendChild(el('div', 'acsv-vempty', '收藏夹加载失败'));
      tail.setStatus('');
    });
  }

  // 卡面 + hover 管理键（移动=调整收藏夹弹层；移除=二次确认）——wrapper 是网格项，卡面照常进
  function favCell(pi) {
    var box = el('div', 'acsv-favcell');
    box.appendChild(gridCardOf(pi, function () { return lctx.ctxOf(pi); }));
    var acts = el('div', 'acsv-favacts');
    var mv = el('button', 'acsv-vchip sm', '移动');
    mv.type = 'button';
    mv.addEventListener('click', function (ev) {
      ev.stopPropagation();
      openFavFolderPop(mv, {
        acId: pi.acId, favorited: true, title: '调整收藏夹',
        done: function (res) {
          // 本夹被取消勾选（或整条移除）→ 该卡不再属于当前列表：摘除；否则原地留（夹计数刷新）
          // 契约由 favpop 保证：done 回 { favorited, ids }（0.9.148 实锤——旧契约只回 favorited 时
          // 这里抛 TypeError、卡不摘除且夹计数不刷新）。**刻意不做 "|| []" 容错**：缺 ids 即契约破坏，
          // 由 harness ff-move-refresh 钉住（容错会把该缺陷掩盖成"删了卡"）
          if (!res.ids.length || res.ids.indexOf(String(cur)) < 0) removeRow(pi, box);
          refreshFolders();
        }
      });
    });
    var rm = el('button', 'acsv-vchip sm', '移除收藏');
    rm.type = 'button';
    rm.addEventListener('click', function (ev) {
      ev.stopPropagation();
      openConfirmPop(rm, {
        title: '移除收藏',
        text: '把「' + (pi.title || '这条视频') + '」从所有收藏夹移除？',
        okLabel: '移除',
        run: function () { return favRemove(pi.acId, [cur]); },
        done: function () { toast('已移除收藏'); removeRow(pi, box); refreshFolders(); }
      });
    });
    acts.appendChild(mv);
    acts.appendChild(rm);
    box.appendChild(acts);
    return box;
  }
  function removeRow(pi, box) {
    box.remove();
    var i = rows.indexOf(pi);
    if (i >= 0) rows.splice(i, 1);
    if (!rows.length && !list.querySelector('.acsv-vempty')) {
      list.appendChild(el('div', 'acsv-vempty', '这个夹还没有收藏'));
    }
  }

  // 管理收藏夹模态（meadmin.openManageModal；与关注列表「编辑分组」同构建器）
  function openManage() {
    head.closeMenu();
    openManageModal({
      id: 'fav-manage',
      title: '管理收藏夹',
      load: function () { return folderList(); },
      addPlaceholder: '收藏夹名（1~40 字）',
      addOkLabel: '新建',
      addMaxLen: 40,
      check: folderNameError,
      onCreate: folderAdd,
      onRename: folderRename,
      onDelete: folderDelete,
      deleteTitle: '删除收藏夹',
      deleteOkLabel: '删除',
      deleteText: function (f) {
        return '「' + (f.name || '') + '」及其中收藏会一并移除（视频本身不受影响，不可恢复）。';
      },
      created: '已新建收藏夹：',
      renamed: '已改名：',
      deleted: function (n) { return '已删除收藏夹：' + (n || ''); },
      onChanged: function (type, id) {
        // 建夹跳新夹（旧 adminTab.refresh(made) 口径）；删当前夹回落首夹；其余刷标签计数
        refreshFolders(type === 'created' ? String(id) : undefined);
      }
    });
  }

  refreshFolders();
}
