import { CFG } from './cfg.js';
import { el, selfUid, fmt, toast } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem } from './data.js';
import { groupNameError, folderNameError } from './nameval.js';
import { coverUrl } from './imgurl.js'; // meCardOf 头像归一（0.9.160 就地收编随迁）
import { gridCardOf, moreBtn, skeletonRows } from './cards.js';
import { registerView } from './viewreg.js';
import { imgInto } from './imgload.js';
import { getGroups, listFollows, createGroup, renameGroup, removeGroup, unfollowUser } from './relationapi.js';
import { openFollowGroupPop } from './grouppop.js';
import { openConfirmPop } from './pickpop.js';
import { folderList, folderAdd, folderRename, folderDelete, favRemove, favList } from './favapi.js';
import { openFavFolderPop } from './favpop.js';

// ---------- 我的视图（0.9.62 起；0.9.69 抖音式个人主页改造）----------
// 布局：资料头（头像/昵称/关注·粉丝·投稿/签名）→ Tab（观看历史｜收藏夹｜**关注分组**，0.9.142 加第三个）→ 4:3 封面网格。
// 接口契约 docs/api-research.md §4.1/§4.2（2026-10-02 实测）：历史 body 双 resourceTypes
// 缺一即 result 21「参数格式错误」；dougaList 列表键是 favoriteList（无 list 别名）。
// 条目一律经 panelItem 规整（类型过滤在契约层），点击 gridCardOf 走播放层（playlayer.openPlayer 就地播放，0.9.74 起不再插竖刷队尾）；
// 资料头经 meCardOf（§4.4 getUserCardList）——两处缺省字段都不伪造，缺就不渲染对应块
// （无 auth_key=未登录 → 整块头部不渲染；卡片角标只用契约在册字段）。
// 缓存：资料头模块级缓存（CFG.view.me.cardTtl）——views.js 的**新建** enter 会重建 DOM
// （0.9.74 来源复原路径不重建），不缓存的话每次新建都打一次接口；失败不写缓存（下次重试）。
var meCache = null; // { at, card }

// ---------- 个人资料卡契约（0.9.69；0.9.160 自 data.js 就地收编：唯一消费方随域走） ----------
// getUserCardList 回包 → 我的页头部字段。字段全部来自实测登记端点（docs/api-research.md §4.4：
// headUrl/name/signature/contentCount/following/followed），**缺省一律 null**——渲染层判空隐藏，
// 不伪造未实测的数据。following/followed → 关注/粉丝 的语义待真机核对（站点口径若不同只改
// 这里的映射，渲染层零分支）；uid 过滤失败时退第一条（回包里只有一条时同款）。
// export 仅为单测直采（纯函数，不触 DOM）——消费面仍限本模块
export function meCardOf(j, uid) {
  var users = (j && j.result === 0 && j.users) || [];
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i] && users[i].id) === String(uid)) { u = users[i]; break; }
  }
  u = u || users[0];
  if (!u || !u.id) return null;
  return {
    uid: Number(u.id) || 0,
    name: u.name || '',
    avatar: coverUrl(u.headUrl),
    sign: String(u.signature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim(),
    contrib: u.contentCount != null ? Number(u.contentCount) || 0 : null,
    follow: u.following != null ? Number(u.following) || 0 : null,
    fans: u.followed != null ? Number(u.followed) || 0 : null
  };
}

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

// ---- 管理 tab 壳（0.9.150 抽件）：chips（[全部?]＋各档＋「＋ 新建」）+ 组头操作（改名/删除，sys 档豁免）
// + 内联表单（新建/改名共用）+ 列表 + moreBtn 翻页 + 选中/刷新骨架 ----
// 由头（0.9.148 审计）：`buildFav` 与 `buildFollowGroups` 此前是同形副本（各约百行，差异只有数据源/
// 校验/文案），违背理念 3「同形副本必漂移」——骨架收口到本壳。**仍作我页局部工厂**（单一消费面；
// 出现第三个消费方再提独立模块）。
// 壳零业务：数据/文案/校验/行渲染全由 opts 注入——
//   list            列表容器（消费方建：收藏夹=网格、分组=普通 div）；壳按 chips→ops→form→list→btn 序挂
//   allChip/allId   有 allChip 则加「全部」档（值 = allId）
//   addLabel        「＋ 新建 x」；delLabel「删除 x」
//   formLabel       { placeholder, maxLen, submit:{create,rename}, created, renamed }（后两为 toast 前缀）
//   nameError(name) 契约层校验（''=通过）
//   loadTabs()      → Promise<[{ id, chipText, raw }]>
//   loadPage(sel, cursor) → Promise<{ rows, noMore, nextCursor }>（分页口径自洽：收藏夹=页号递增/
//                   分组=响应偏移量；游标由壳持有并原样交给下一拍）
//   renderRow(row, ctx) → 元素（ctx={ list, refresh, sel() }——行内操作要用当前档与刷新）
//   emptyText(selId)/emptyTabsText/tabsFailText/loadFailText  四种空/失败文案
//   onCreate(name)/onRename(id,name) → Promise<id|true|null>（null=失败）
//   delConfirm(tab, refresh) → openConfirmPop opts（确认文案与 run/done 全由消费方给）
//   sysTab(tab)     → true 不给改名/删除（系统档）
//   reloadOnRefresh  refresh 后是否重拉列表（收藏夹=true：计数与卡面归属要重排；分组=false：成员行原地改）
//   firstCursor     首屏游标（缺省 0）
function adminTab(panel, o) {
  var chips = el('div', 'acsv-vchips');
  var ops = el('div', 'acsv-gops');
  var form = el('div', 'acsv-gform');
  form.style.display = 'none';
  var list = o.list;
  var btn = moreBtn(function () { load(); });
  panel.appendChild(chips);
  panel.appendChild(ops);
  panel.appendChild(form);
  panel.appendChild(list); // 消费方可能已挂过（rowList）——appendChild 即搬移，落位统一在此
  panel.appendChild(btn);

  var tabs = [];
  var cur = o.allChip ? o.allId : null;
  var cursor = o.firstCursor || 0;
  var seq = 0; // 在途回包令牌：换档/视图拆（isConnected）即丢弃
  var loading = false;
  var done = false;
  var started = false; // 是否已完成首拉（首进 refresh 要 select 一次把列表带起来）

  function tabOf(id) {
    for (var i = 0; i < tabs.length; i++) if (tabs[i].id === id) return tabs[i];
    return null;
  }
  function resetBtn() { btn.style.display = ''; btn.disabled = false; btn.textContent = '加载更多'; }

  function renderChips() {
    chips.textContent = '';
    if (o.allChip) {
      var all = el('button', 'acsv-vchip' + (cur === o.allId ? ' on' : ''), o.allChip);
      all.type = 'button';
      all.addEventListener('click', function () { select(o.allId); });
      chips.appendChild(all);
    }
    tabs.forEach(function (t) {
      var c = el('button', 'acsv-vchip' + (cur === t.id ? ' on' : ''), t.chipText);
      c.type = 'button';
      c.addEventListener('click', function () { select(t.id); });
      chips.appendChild(c);
    });
    var add = el('button', 'acsv-vchip', o.addLabel);
    add.type = 'button';
    add.addEventListener('click', function () { openForm('create'); });
    chips.appendChild(add);
    renderOps();
  }

  function renderOps() {
    ops.textContent = '';
    var t = tabOf(cur);
    if (!t || (o.sysTab && o.sysTab(t))) return;
    var rn = el('button', 'acsv-vchip sm', '改名');
    rn.type = 'button';
    rn.addEventListener('click', function () { openForm('rename', t); });
    var del = el('button', 'acsv-vchip sm acsv-gdanger', o.delLabel);
    del.type = 'button';
    del.addEventListener('click', function () {
      openConfirmPop(del, o.delConfirm(t, refresh));
    });
    ops.appendChild(rn);
    ops.appendChild(del);
  }

  // 新建/改名共用内联表单（不弹层：管理页本来就是"编辑态"，原地输入最轻）
  function openForm(mode, t) {
    form.textContent = '';
    form.style.display = '';
    var input = el('input', 'acsv-ginput');
    input.maxLength = o.formLabel.maxLen;
    input.placeholder = o.formLabel.placeholder;
    if (mode === 'rename') input.value = t.raw.name;
    var label = o.formLabel.submit[mode];
    var ok = el('button', 'acsv-gok', label);
    ok.type = 'button';
    var cancel = el('button', 'acsv-gcancel', '取消');
    cancel.type = 'button';
    var err = el('span', 'acsv-gerr');
    cancel.addEventListener('click', function () { form.style.display = 'none'; form.textContent = ''; });
    ok.addEventListener('click', function () {
      if (form._busy) return;
      var name = (input.value || '').trim();
      var msg = o.nameError(name);
      if (msg) { err.textContent = msg; return; }
      form._busy = true;
      ok.textContent = '提交中…';
      var req = mode === 'rename' ? o.onRename(t.id, name) : o.onCreate(name);
      req.then(function (made) {
        form._busy = false;
        ok.textContent = label;
        if (!made) { err.textContent = label + '失败（重名或未登录？）'; return; }
        form.style.display = 'none';
        form.textContent = '';
        toast((mode === 'rename' ? o.formLabel.renamed : o.formLabel.created) + name);
        refresh(mode === 'create' ? String(made) : undefined); // 新建跳新档；改名停在原档
      }, function () {
        form._busy = false;
        ok.textContent = label;
        err.textContent = '操作失败（未登录？）';
      });
    });
    form.appendChild(input);
    form.appendChild(ok);
    form.appendChild(cancel);
    form.appendChild(err);
    input.focus();
  }

  function select(id) {
    cur = id;
    started = true;
    cursor = o.firstCursor || 0;
    seq++;
    loading = false;
    done = false;
    list.textContent = '';
    resetBtn();
    renderChips();
    load();
  }

  // 档表刷新（建/改名/删/移组/取关后——计数与选中态都要跟着动）；nextSel 给了就跳过去（新建/删组后）
  function refresh(nextSel) {
    return o.loadTabs().then(function (ts) {
      if (!list.isConnected) return;
      tabs = ts;
      if (nextSel !== undefined) { select(nextSel); return; }
      if (!tabs.length) { // 无档（收藏夹被删空）：空态 + 收按钮
        chips.textContent = '';
        ops.textContent = '';
        list.textContent = '';
        list.appendChild(el('div', 'acsv-vempty', o.emptyTabsText));
        btn.style.display = 'none';
        return;
      }
      // 「全部」是伪档（不在 tabs 里）——不算失效；其余当前档查无（被删/首进）才回落
      var curValid = o.allChip ? (cur === o.allId || !!tabOf(cur)) : !!tabOf(cur);
      if (cur === null || !curValid) {
        select(o.allChip ? o.allId : tabs[0].id);
        return;
      }
      // 首进（列表还没起来）或需重拉：走 select（含 renderChips + load）；否则只重画 chips
      // （分组=成员行原地改，不重拉；收藏夹 reloadOnRefresh=true 走上面这条）
      if (!started || o.reloadOnRefresh) { select(cur); return; }
      renderChips();
    }, function () {
      if (!list.isConnected) return;
      if (list.children.length) return; // 已有内容：静默（计数可能略旧，下一拍再刷）
      list.textContent = '';
      list.appendChild(el('div', 'acsv-vempty', o.tabsFailText));
      btn.style.display = 'none';
    });
  }

  function load() {
    if (loading || done) return;
    if (cur == null) { resetBtn(); return; } // 档表未到（按钮先于数据可见）：不发废请求
    loading = true;
    var my = ++seq;
    o.loadPage(cur, cursor).then(function (p) {
      if (my !== seq || !list.isConnected) return; // 过期/退出视图：在途回包丢弃
      loading = false;
      var added = 0;
      (p.rows || []).forEach(function (r) { list.appendChild(o.renderRow(r, ctx)); added++; });
      cursor = p.nextCursor;
      if (p.noMore) { done = true; btn.style.display = 'none'; } else resetBtn();
      if (!added && !list.children.length) list.appendChild(el('div', 'acsv-vempty', o.emptyText(cur)));
    }, function () {
      if (my !== seq || !list.isConnected) return;
      loading = false;
      btn.disabled = false;
      btn.textContent = o.loadFailText;
    });
  }

  var ctx = {
    list: list,
    refresh: refresh,
    sel: function () { return cur; }
  };
  return { refresh: refresh, select: select, list: list, chips: chips, btn: btn };
}

// ---- 收藏夹 tab（0.9.143 管理化；0.9.150 骨架交 adminTab 壳）----
// 管理面：＋新建夹 / 组头「改名·删除收藏夹」（删除二次确认——**连带移除仅存于该夹的收藏记录**，
// 2026-10-04 隔离实测在册）+ 卡面 hover「移动 / 移除收藏」两键。读链走 favapi（folderList 带
// inFolder 是选择层专用，本页只用夹表与 favList）；夹 id/名一律字符串。
// reloadOnRefresh=true：夹表一变（建/删/改名/移动/移除）计数与卡面归属都要重排 ⇒ 重拉列表。
function buildFav(panel) {
  var list = rowList(panel, 'fav');
  var sk = skeleton(list);

  // 卡面 + hover 管理键（移动=调整收藏夹弹层；移除=二次确认）——wrapper 是网格项，卡面照常进
  function favCell(pi, ctx) {
    var box = el('div', 'acsv-favcell');
    box.appendChild(gridCardOf(pi));
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
          // 这里抛 TypeError、卡不摘除且夹计数不刷新）。**刻意不做 `|| []` 容错**：缺 ids 即契约破坏，
          // 由 harness ff-move-refresh 钉住（容错会把该缺陷掩盖成"删了卡"）
          if (!res.ids.length || res.ids.indexOf(String(ctx.sel())) < 0) box.remove();
          ctx.refresh();
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
        run: function () { return favRemove(pi.acId, [ctx.sel()]); },
        done: function () { toast('已移除收藏'); box.remove(); ctx.refresh(); }
      });
    });
    acts.appendChild(mv);
    acts.appendChild(rm);
    box.appendChild(acts);
    return box;
  }

  var tab = adminTab(panel, {
    list: list,
    allChip: null, // 收藏夹无「全部」档
    addLabel: '＋ 新建夹',
    delLabel: '删除收藏夹',
    formLabel: {
      placeholder: '收藏夹名（1~40 字）', maxLen: 40,
      submit: { create: '新建', rename: '改名' },
      created: '已新建收藏夹：', renamed: '已改名：'
    },
    nameError: folderNameError,
    reloadOnRefresh: true,
    emptyTabsText: '还没有收藏夹',
    tabsFailText: '收藏夹加载失败',
    loadFailText: '加载失败，点击重试',
    loadTabs: function () {
      return folderList().then(function (fs) {
        return fs.map(function (f) {
          return { id: f.id, chipText: (f.name || '收藏夹') + (f.count != null ? ' ' + f.count : ''), raw: f };
        });
      });
    },
    loadPage: function (sel, cursor) {
      return favList(sel, cursor + 1).then(function (j) { // 收藏夹分页=页号（1 起）
        var rows = [];
        ((j && j.favoriteList) || []).forEach(function (raw) {
          var pi = panelItem('fav', raw);
          if (pi) rows.push(pi);
        });
        // 到底判定：返回行数 < 页大小（favoriteList 与 folder/info 的 resourceCount 自洽，§4.2 实测）
        return { rows: rows, noMore: !rows.length || rows.length < CFG.view.pageSize, nextCursor: cursor + 1 };
      });
    },
    renderRow: function (pi, ctx) { return favCell(pi, ctx); },
    emptyText: function () { return '这个夹还没有收藏'; },
    onCreate: function (name) { return folderAdd(name); },        // → 新夹 id（响应 data.folderId）
    onRename: function (id, name) { return folderRename(id, name); },
    delConfirm: function (t, refresh) {
      return {
        title: '删除收藏夹',
        text: '「' + t.raw.name + '」及其中收藏会一并移除（视频本身不受影响，不可恢复）。',
        okLabel: '删除',
        run: function () { return folderDelete(t.id); },
        done: function () { toast('已删除收藏夹：' + t.raw.name); refresh(); }
      };
    }
  });
  tab.refresh().then(sk);
}

// ---- 关注分组 tab（0.9.142；0.9.150 骨架交 adminTab 壳）----
// 读链走 relationapi（getGroups / listFollows action=9 组内·7 全部）；**游标是偏移量**
//（与 feed 域毫秒时间戳不同源，relationapi 内收口）。成员行自带 groupId/groupName（真机实测 §2.3），
// 「全部」视图里直接显归属标签。系统组（未分组 id="0"、保留名"特别关注"）不给改名/删除（站方语义：
// 未分组不可删）。**分组不动关注流内容**——服务端 followFeedV2 不吃 groupId（2026-10-04 实测参数
// 被忽略），所以关注视图无分组 chips，分组只在这里做"关系管理"（建/删/改名/移组/取关）。
// reloadOnRefresh=false：成员行自带回调原地更新（移组改标签/摘行、取关摘行），重拉会覆盖成旧夹具形态。
function buildFollowGroups(panel) {
  var list = el('div', 'acsv-glist');

  function memberRow(u, ctx) {
    var row = el('div', 'acsv-grow');
    var a = el('a', 'acsv-grow-link');
    a.href = CFG.api.userBase + u.id;
    a.target = '_blank';
    a.rel = 'noopener';
    imgInto(a, u.head || CFG.api.defaultAvatar, 'avatar', 'acsv-avatar acsv-grow-avatar');
    row.appendChild(a);
    var info = el('div', 'acsv-grow-info');
    info.appendChild(el('div', 'acsv-grow-name', u.name));
    var meta = el('div', 'acsv-grow-meta');
    if (u.fans) meta.appendChild(el('span', null, '粉丝 ' + u.fans));
    if (u.contrib) meta.appendChild(el('span', null, '投稿 ' + u.contrib));
    if (ctx.sel() === '-1' && u.groupName) meta.appendChild(el('span', 'acsv-grow-tag', u.groupName));
    info.appendChild(meta);
    row.appendChild(info);
    var acts = el('div', 'acsv-grow-acts');
    var move = el('button', 'acsv-vchip sm', '移组');
    move.type = 'button';
    move.addEventListener('click', function () {
      openFollowGroupPop(move, {
        uid: u.id, name: u.name, following: true, noExtra: true,
        done: function (res) {
          if (ctx.sel() !== '-1' && String(res.groupId) !== String(ctx.sel())) {
            row.remove(); // 组内视图：移走的成员即离席
            if (!ctx.list.querySelector('.acsv-grow')) ctx.list.appendChild(el('div', 'acsv-vempty', '这个分组还没有成员'));
          } else {
            var tag = meta.querySelector('.acsv-grow-tag');
            if (tag) tag.textContent = res.groupName || '';
          }
          ctx.refresh();
        }
      });
    });
    var un = el('button', 'acsv-vchip sm', '取关');
    un.type = 'button';
    un.addEventListener('click', function () {
      if (un._busy) return;
      un._busy = true;
      un.textContent = '…';
      unfollowUser(u.id).then(function (ok) {
        un._busy = false;
        if (!ok) { un.textContent = '取关'; toast('操作失败（未登录？）'); return; }
        toast('已取消关注 @' + u.name);
        row.remove();
        if (!ctx.list.querySelector('.acsv-grow')) ctx.list.appendChild(el('div', 'acsv-vempty', '还没有关注'));
        ctx.refresh();
      });
    });
    acts.appendChild(move);
    acts.appendChild(un);
    row.appendChild(acts);
    return row;
  }

  if (!selfUid()) { // 未登录：只出提示，不拉数据
    list.appendChild(el('div', 'acsv-vempty', '登录后可管理关注分组'));
    panel.appendChild(list);
    return;
  }
  var tab = adminTab(panel, {
    list: list,
    allChip: '全部', allId: '-1',
    addLabel: '＋ 新建分组',
    delLabel: '删除分组',
    formLabel: {
      placeholder: '分组名（1~8 字）', maxLen: 8,
      submit: { create: '新建', rename: '改名' },
      created: '已新建分组：', renamed: '已改名：'
    },
    nameError: groupNameError,
    sysTab: function (t) { return t.id === '0' || t.raw.name === '特别关注'; },
    reloadOnRefresh: false,
    firstCursor: '', // 偏移量游标（首页空串）
    emptyTabsText: '还没有分组',
    tabsFailText: '分组加载失败',
    loadFailText: '加载失败，点击重试',
    loadTabs: function () {
      return getGroups().then(function (gs) {
        return gs.map(function (g) {
          return { id: g.id, chipText: g.name + (g.count != null ? ' ' + g.count : ''), raw: g };
        });
      });
    },
    loadPage: function (sel, cursor) {
      return listFollows(sel === '-1' ? '' : sel, cursor).then(function (page) {
        return { rows: page.items, noMore: page.noMore, nextCursor: page.nextCursor };
      });
    },
    renderRow: function (u, ctx) { return memberRow(u, ctx); },
    emptyText: function (sel) { return sel === '-1' ? '还没有关注' : '这个分组还没有成员'; },
    onCreate: function (name) { return createGroup(name); },      // → 新组 id（响应带，差集兜底）
    onRename: function (id, name) { return renameGroup(id, name); },
    delConfirm: function (t, refresh) {
      return {
        title: '删除分组',
        text: '「' + t.raw.name + '」里的成员会移到「未分组」，关注关系不变。',
        okLabel: '删除',
        run: function () { return removeGroup(t.id); },
        done: function () { toast('已删除分组：' + t.raw.name); refresh('-1'); }
      };
    }
  });
  tab.refresh(); // 首进：拉组表 → 回落「全部」档（allId）并载入成员
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
  var panelGroups = el('div', 'acsv-mepanel');
  panelHist.setAttribute('data-tab', 'hist');
  panelFav.setAttribute('data-tab', 'fav');
  panelGroups.setAttribute('data-tab', 'groups');
  panelFav.style.display = 'none';
  panelGroups.style.display = 'none';
  wrap.appendChild(panelHist);
  wrap.appendChild(panelFav);
  wrap.appendChild(panelGroups);

  var panels = {
    hist: { el: panelHist, build: buildHistory, inited: false, name: '观看历史' },
    fav: { el: panelFav, build: buildFav, inited: false, name: '收藏夹' },
    groups: { el: panelGroups, build: buildFollowGroups, inited: false, name: '关注分组' }
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
    label: '我的', order: 30, group: 1, // 0.9.155 用户裁决：与「关注」互换——放左栏最底
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  }
});
