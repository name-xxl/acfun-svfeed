import { CFG } from './cfg.js';
import { el, selfUid, fmt, toast } from './ui.js';
import { postForm } from './appapi.js';
import { panelItem, meCardOf, groupNameError } from './data.js';
import { gridCardOf, moreBtn, skeletonRows } from './cards.js';
import { registerView } from './viewreg.js';
import { imgInto } from './imgload.js';
import { getGroups, listFollows, createGroup, renameGroup, removeGroup, unfollowUser } from './relationapi.js';
import { openFollowGroupPop } from './grouppop.js';
import { openConfirmPop } from './pickpop.js';

// ---------- 我的视图（0.9.62 起；0.9.69 抖音式个人主页改造）----------
// 布局：资料头（头像/昵称/关注·粉丝·投稿/签名）→ Tab（观看历史｜收藏夹）→ 3:4 封面网格。
// 接口契约 docs/api-research.md §4.1/§4.2（2026-10-02 实测）：历史 body 双 resourceTypes
// 缺一即 result 21「参数格式错误」；dougaList 列表键是 favoriteList（无 list 别名）。
// 条目一律经 panelItem 规整（类型过滤在契约层），点击 gridCardOf 走播放层（playlayer.openPlayer 就地播放，0.9.74 起不再插竖刷队尾）；
// 资料头经 meCardOf（§4.4 getUserCardList）——两处缺省字段都不伪造，缺就不渲染对应块
// （无 auth_key=未登录 → 整块头部不渲染；卡片角标只用契约在册字段）。
// 缓存：资料头模块级缓存（CFG.view.me.cardTtl）——views.js 的**新建** enter 会重建 DOM
// （0.9.74 来源复原路径不重建），不缓存的话每次新建都打一次接口；失败不写缓存（下次重试）。
var meCache = null; // { at, card }

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

// ---- 关注分组（0.9.142）：组 chips（全部/各分组）+ 建/改名/删 + 成员列表（移组/取关）----
// 读链走 relationapi（getGroups / listFollows action=9 组内·7 全部）；**游标是偏移量**
//（与 feed 域毫秒时间戳不同源，relationapi 内收口，别在这里另拼）。成员行自带 groupId/
// groupName（真机实测 §2.3），"全部"视图里直接显归属标签。系统组（未分组 id="0"、保留名
// "特别关注"）不给改名/删除（站方语义：未分组不可删）。**分组不动关注流内容**——服务端
// followFeedV2 不吃 groupId（2026-10-04 实测参数被忽略），所以关注视图无分组 chips，
// 分组只在这里做"关系管理"（建/删/改名/移组/取关）。
function buildFollowGroups(panel) {
  var chips = el('div', 'acsv-vchips');
  var ops = el('div', 'acsv-gops');
  var form = el('div', 'acsv-gform');
  form.style.display = 'none';
  var list = el('div', 'acsv-glist');
  var btn = moreBtn(function () { load(); });
  panel.appendChild(chips);
  panel.appendChild(ops);
  panel.appendChild(form);
  panel.appendChild(list);
  panel.appendChild(btn);

  var groups = [];
  var cur = '-1'; // '-1' = 全部（action=7）
  var pcursor = '';
  var seq = 0; // 在途回包令牌：换组/视图拆（isConnected）即丢弃
  var loading = false;
  var done = false;

  function sysGroup(g) { return g.id === '0' || g.name === '特别关注'; }
  function groupOf(id) {
    for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return groups[i];
    return null;
  }

  function renderChips() {
    chips.textContent = '';
    var all = el('button', 'acsv-vchip' + (cur === '-1' ? ' on' : ''), '全部');
    all.type = 'button';
    all.addEventListener('click', function () { select('-1'); });
    chips.appendChild(all);
    groups.forEach(function (g) {
      var c = el('button', 'acsv-vchip' + (cur === g.id ? ' on' : ''),
        g.name + (g.count != null ? ' ' + g.count : ''));
      c.type = 'button';
      c.addEventListener('click', function () { select(g.id); });
      chips.appendChild(c);
    });
    var add = el('button', 'acsv-vchip', '＋ 新建分组');
    add.type = 'button';
    add.addEventListener('click', function () { openForm('create'); });
    chips.appendChild(add);
    renderOps();
  }

  function renderOps() {
    ops.textContent = '';
    var g = groupOf(cur);
    if (!g || sysGroup(g)) return;
    var rn = el('button', 'acsv-vchip sm', '改名');
    rn.type = 'button';
    rn.addEventListener('click', function () { openForm('rename', g); });
    var del = el('button', 'acsv-vchip sm acsv-gdanger', '删除分组');
    del.type = 'button';
    del.addEventListener('click', function () {
      openConfirmPop(del, {
        title: '删除分组',
        text: '「' + g.name + '」里的成员会移到「未分组」，关注关系不变。',
        okLabel: '删除',
        run: function () { return removeGroup(g.id); },
        done: function () { toast('已删除分组：' + g.name); refreshGroups('-1'); }
      });
    });
    ops.appendChild(rn);
    ops.appendChild(del);
  }

  // 建组/改名共用的内联表单（不弹层：管理页本来就是"编辑态"，原地输入最轻）
  function openForm(mode, g) {
    form.textContent = '';
    form.style.display = '';
    var input = el('input', 'acsv-ginput');
    input.maxLength = 8;
    input.placeholder = '分组名（1~8 字）';
    if (mode === 'rename') input.value = g.name;
    var ok = el('button', 'acsv-gok', mode === 'rename' ? '改名' : '新建');
    ok.type = 'button';
    var cancel = el('button', 'acsv-gcancel', '取消');
    cancel.type = 'button';
    var err = el('span', 'acsv-gerr');
    var label = mode === 'rename' ? '改名' : '新建';
    cancel.addEventListener('click', function () { form.style.display = 'none'; form.textContent = ''; });
    ok.addEventListener('click', function () {
      if (form._busy) return;
      var name = (input.value || '').trim();
      var msg = groupNameError(name);
      if (msg) { err.textContent = msg; return; }
      form._busy = true;
      ok.textContent = '提交中…';
      var req = mode === 'rename' ? renameGroup(g.id, name) : createGroup(name);
      req.then(function (made) {
        form._busy = false;
        ok.textContent = label;
        if (!made) { err.textContent = label + '失败（重名或未登录？）'; return; }
        form.style.display = 'none';
        form.textContent = '';
        toast(mode === 'rename' ? '已改名：' + name : '已新建分组：' + name);
        refreshGroups(mode === 'rename' ? undefined : String(made));
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
    pcursor = '';
    seq++;
    loading = false;
    done = false;
    list.textContent = '';
    btn.style.display = '';
    btn.disabled = false;
    btn.textContent = '加载更多';
    renderChips();
    load();
  }

  // 组表刷新（建/改名/删/移组/取关后都要——计数要跟着动）：nextSel 给了就跳过去（新建/删组后）
  function refreshGroups(nextSel) {
    return getGroups().then(function (gs) {
      if (!list.isConnected) return;
      groups = gs;
      if (nextSel !== undefined) { select(nextSel); return; }
      if (cur !== '-1' && !groupOf(cur)) { select('-1'); return; } // 当前组没了（被删）
      renderChips();
    }, function () {
      if (!list.isConnected) return;
      chips.textContent = '';
      ops.textContent = '';
    });
  }

  function memberRow(u) {
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
    if (cur === '-1' && u.groupName) meta.appendChild(el('span', 'acsv-grow-tag', u.groupName));
    info.appendChild(meta);
    row.appendChild(info);
    var acts = el('div', 'acsv-grow-acts');
    var move = el('button', 'acsv-vchip sm', '移组');
    move.type = 'button';
    move.addEventListener('click', function () {
      openFollowGroupPop(move, {
        uid: u.id, name: u.name, following: true, noExtra: true,
        done: function (res) {
          if (cur !== '-1' && String(res.groupId) !== String(cur)) {
            row.remove(); // 组内视图：移走的成员即离席
            if (!list.querySelector('.acsv-grow')) list.appendChild(el('div', 'acsv-vempty', '这个分组还没有成员'));
          } else {
            var tag = meta.querySelector('.acsv-grow-tag');
            if (tag) tag.textContent = res.groupName || '';
          }
          refreshGroups();
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
        if (!list.querySelector('.acsv-grow')) list.appendChild(el('div', 'acsv-vempty', '还没有关注'));
        refreshGroups();
      });
    });
    acts.appendChild(move);
    acts.appendChild(un);
    row.appendChild(acts);
    return row;
  }

  function load() {
    if (loading || done) return;
    loading = true;
    var my = ++seq;
    listFollows(cur === '-1' ? '' : cur, pcursor).then(function (page) {
      if (my !== seq || !list.isConnected) return;
      loading = false;
      page.items.forEach(function (u) { list.appendChild(memberRow(u)); });
      pcursor = page.nextCursor;
      if (page.noMore || !page.items.length) {
        done = true;
        btn.style.display = 'none';
      } else {
        btn.disabled = false;
        btn.textContent = '加载更多';
      }
      if (!list.querySelector('.acsv-grow')) {
        list.appendChild(el('div', 'acsv-vempty', cur === '-1' ? '还没有关注' : '这个分组还没有成员'));
      }
    }, function () {
      if (my !== seq || !list.isConnected) return;
      loading = false;
      btn.disabled = false;
      btn.textContent = '加载失败，点击重试';
    });
  }

  if (!selfUid()) {
    list.appendChild(el('div', 'acsv-vempty', '登录后可管理关注分组'));
    btn.style.display = 'none';
    return;
  }
  refreshGroups('-1');
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
    label: '我的', order: 20, group: 1,
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  }
});
