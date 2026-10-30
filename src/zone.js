import { CFG } from './cfg.js';
import { el, singleFlight } from './ui.js';
import { setEmpty } from './liststate.js'; // 空态行单源（0.9.300）
import { LOADING_LABEL } from './pageloader.js'; // 「加载中…」文案单源（0.9.305 批⑤②）
import { mountChipGroup, CHIP_SM } from './chipkit.js'; // chip 协议/小档皮肤单源（0.9.305⑤/0.9.308）
import { requestRead } from './net.js';
import { postForm } from './appapi.js';
import { fetchRankBoard } from './rankapi.js';
import { panelItem } from './panelitem.js';
import { rowOf, upCardOf } from './cards.js';
import { createListTail } from './listtail.js'; // 尾部件（0.9.219：只借回顶） // chevUp 回顶图标（与关注/广场/搜索同源）
import { registerView, viewDef } from './viewreg.js';

// ---------- 分区榜单视图（0.9.62 建，0.9.66 对齐原生：子频道行 + UP 榜） ----------
// GET rank/channel（§6.1 实测：rankLimit 生效；POST 形状无 rankLimit 只回 10 条，勿改 POST；
// subChannelId 服务端真过滤——107/108/159 返回条数各异，直连参数）。条目经 panelItem
// 规整（contentType 2=视频，3=文章在契约层过滤），点击 rowOf 走播放层（playlayer 就地播放）。
// 子频道树：queryNavigators 分区树 children（cid+navName 官方树），singleFlight 单飞缓存；
// 树拉不到或频道无 children → 子频道行隐藏（降级不阻塞主榜）。
// UP 榜 = upListOf(rankList) 聚合作者 top10（契约层纯函数），section 置于视频榜下方。
var navTreeFlight = singleFlight(function () {
  return postForm(CFG.api.navTree, '').then(function (nv) {
    return nv && nv.data ? nv.data : [];
  }, function () { return []; });
});

// 榜单首屏会话级缓存（0.9.79）：视图每次进入整块重建重拉 100 条，来回切纯浪费。榜单是
// **日更数据**（rankPeriod 决定榜期、每日更新一次），5 分钟内复用零新鲜度风险。
// 只缓存这一个视图——我的页的历史/收藏**不做缓存**：它们必须反映"刚看过/刚收藏"，
// 新鲜度优先（现行为就是每次重拉，评审里明确保留）
var rankCache = {}; // key=频道|子频道|榜期 -> { at, rows }
var RANK_TTL = 5 * 60000;

// 递归找 navName===name 的分区节点，返回其 children（无则 []）
function subChannelsOf(tree, name) {
  var hit = null;
  (function walk(list) {
    (list || []).forEach(function (n) {
      if (hit) return;
      if (n.navName === name) hit = n;
      else walk(n.children);
    });
  })(tree);
  return hit && hit.children ? hit.children.map(function (c) {
    return { id: c.cid, name: c.navName };
  }).filter(function (c) { return c.id; }) : [];
}

function buildZoneView(body) {
  // 原生 1200 内容宽居中（video-card≈860 + up-card 338）：chips/说明行/列头/列表
  // 同轨同宽——列头与行必须共用同一 grid 模板（0.9.67 两栏对齐教训）
  var wrap = el('div', 'acsv-zone-wrap');
  var boardChips = el('div', 'acsv-vchips acsv-rboards');
  var zoneChips = el('div', 'acsv-vchips');
  var subChips = el('div', 'acsv-vchips');
  var periodChips = el('div', 'acsv-vchips');
  // 三行容器钉 data-chips 锚（0.9.305 批⑤①/⑨）：harness 与外部选择器按锚取行，不再靠
  // 「非榜单行的 DOM 顺序」这种脆弱事实；榜单行沿用子钮上的 data-board 锚
  zoneChips.setAttribute('data-chips', 'zone');
  subChips.setAttribute('data-chips', 'sub');
  periodChips.setAttribute('data-chips', 'period');
  var tip = el('div', 'acsv-vtip'); // 说明行文案随频道/榜单更新
  wrap.appendChild(boardChips);
  wrap.appendChild(zoneChips);
  wrap.appendChild(subChips);
  wrap.appendChild(periodChips);
  wrap.appendChild(tip);
  // 双列头（原生 rlist__banner：榜单 Rank | Up主 Author）——rlist 行=视频卡+作者卡左右分栏
  var head = el('div', 'acsv-rlist-head');
  var hc1 = el('div', 'acsv-rlist-hcell');
  // 列头中文名与 dock 展示名共读注册表（0.9.305 批⑤⑥；0.9.171「改名四处同碰」教训：
  // 展示名不许在视图体内再存一份串，改一处漏三处）。build 必发生在 registerView 之后
  hc1.appendChild(el('span', 'acsv-rlist-hcn', viewDef('zone').dock.label));
  hc1.appendChild(el('span', 'acsv-rlist-hen', 'Rank'));
  var hc2 = el('div', 'acsv-rlist-hcell');
  hc2.appendChild(el('span', 'acsv-rlist-hcn', 'Up主'));
  hc2.appendChild(el('span', 'acsv-rlist-hen', 'Author'));
  head.appendChild(hc1);
  head.appendChild(hc2);
  wrap.appendChild(head);
  var list = el('div', 'acsv-rlist');
  wrap.appendChild(list);
  body.appendChild(wrap);
  // 回顶（0.9.155；0.9.219 换 listtail 共享件）：榜单是单发 100 条长列表（原生同款），滚到中段
  // 想回顶得拖很久。本视图无触底翻页 ⇒ 不传 onBottom；也不要状态行（自有三态占位件）⇒ status:false
  createListTail({
    root: body, scrollEl: body, backTopAt: CFG.view.zoneBackTopAt, status: false
  });

  var curZone = CFG.view.zones[0];
  var curSub = null;    // null=全部（subChannelId 空）
  var curPeriod = CFG.view.periods[0];
  var curBoard = CFG.view.rankBoards[0].id; // channel=分区榜；hot/banana/youngStar 走 APP 三榜

  function fillSubChips() {
    subChips.innerHTML = '';
    navTreeFlight.get().then(function (tree) {
      var subs = subChannelsOf(tree, curZone.name);
      if (!subs.length) return; // 全站综合/树缺：无子频道行（降级）
      // 表驱动（0.9.305 批⑤①）：协议在 chipkit 单源。旧写法「全部」无条件 on，榜单档
      // 往返后 curSub 未清时会与实选子频道漂移（高亮说谎）；现初值与短路同问 isOn，
      // 高亮恒等于实际生效的过滤档
      mountChipGroup({
        host: subChips, cls: CHIP_SM,
        items: [{ label: '全部', data: null }].concat(subs.map(function (s) {
          return { label: s.name, data: s.id };
        })),
        isOn: function (sub) { return curSub === sub; },
        onPick: function (sub) { curSub = sub; load(); }
      });
    });
  }

  function render(rows) {
    list.innerHTML = '';
    if (!rows.length) {
      setEmpty(list, '该分区暂无榜单数据');
      return;
    }
    // 原生 rlist__cards：每行=视频卡+作者卡左右分栏（rowOf 出视频卡含排名水印，upCardOf 出作者卡）
    rows.forEach(function (r, i) {
      var pair = el('div', 'acsv-rlist-row');
      // 会话语境（0.9.173）：层内 ↓/↑ = 榜单行顺序（榜单=固定条数，走到最后一条停，不给 more）
      pair.appendChild(rowOf(r.pi, r.rank, function () {
        return {
          kind: 'list',
          items: rows.map(function (x) { return x.pi; }),
          idx: i
        };
      }));
      pair.appendChild(upCardOf(r.pi));
      list.appendChild(pair);
    });
  }

  function load() {
    var key = curBoard + '|' + (curBoard === 'channel'
      ? curZone.id + '|' + (curSub == null ? '' : curSub) + '|' + curPeriod : '');
    var hit = rankCache[key];
    if (hit && Date.now() - hit.at < RANK_TTL) { render(hit.rows); return; } // 命中：零请求直出
    list.innerHTML = '';
    setEmpty(list, LOADING_LABEL); // 文案单源 pageloader（0.9.305 批⑤②）
    function settle(rows) { rankCache[key] = { at: Date.now(), rows: rows }; render(rows); }
    function fail() {
      list.innerHTML = '';
      setEmpty(list, '加载失败（网络不可达）');
    }
    if (curBoard !== 'channel') {
      fetchRankBoard(curBoard, CFG.view.periods[0]).then(settle, fail);
      return;
    }
    requestRead(CFG.api.rank + '?channelId=' + curZone.id + '&subChannelId='
      + (curSub == null ? '' : curSub) + '&rankLimit=' + CFG.view.rankLimit
      + '&rankPeriod=' + curPeriod, 'GET')
      .then(function (j) {
        var rows = [];
        ((j && j.rankList) || []).forEach(function (raw, i) {
          var pi = panelItem('rank', raw);
          if (pi) rows.push({ pi: pi, rank: i + 1 });
        });
        settle(rows);
      }, fail);
  }

  function boardOf(id) {
    for (var i = 0; i < CFG.view.rankBoards.length; i++) {
      if (CFG.view.rankBoards[i].id === id) return CFG.view.rankBoards[i];
    }
    return CFG.view.rankBoards[0];
  }
  function updateBoardVisibility() {
    var ch = curBoard === 'channel';
    zoneChips.style.display = ch ? '' : 'none';
    subChips.style.display = ch ? '' : 'none';
    periodChips.style.display = ch ? '' : 'none';
  }
  function syncTip() {
    var b = boardOf(curBoard);
    // 统一走表项（0.9.305 批⑤③）：此前 channel 档绕开表项、把「依综合指数排序…」硬编码
    // 在本函数（cfg rankBoards 的 channel.tip 成死字段）。现两档同式：`名 + ' / ' + b.tip`，
    // channel 档的"名"取当前分区名（语境就是分区），cfg 串回到单源；产出文案逐字不变
    tip.textContent = (curBoard === 'channel' ? curZone.name : b.label) + ' / ' + b.tip;
  }
  // ---- 四组 chip 全部表驱动（0.9.305 批⑤①）：建钮/短路/摘 on/点亮/回调协议在 chipkit ----
  mountChipGroup({
    host: boardChips,
    items: CFG.view.rankBoards.map(function (b) { return { label: b.label, data: b.id }; }),
    isOn: function (id) { return curBoard === id; },
    onPick: function (id) {
      curBoard = id;
      updateBoardVisibility();
      syncTip();
      if (curBoard === 'channel') fillSubChips();
      load();
    }
  }).forEach(function (c, i) {
    c.setAttribute('data-board', CFG.view.rankBoards[i].id); // 锚沿用（cases/views.js 的 boardChip）
  });
  mountChipGroup({
    host: zoneChips,
    items: CFG.view.zones.map(function (z) { return { label: z.name, data: z }; }),
    isOn: function (z) { return curZone.id === z.id; },
    onPick: function (z) {
      curZone = z;
      curSub = null; // 切频道重置子频道选区（坑 E）
      syncTip();
      fillSubChips();
      load();
    }
  });
  mountChipGroup({
    host: periodChips, cls: CHIP_SM,
    items: CFG.view.periods.map(function (p) { return { label: CFG.view.periodNames[p] || p, data: p }; }),
    isOn: function (p) { return curPeriod === p; },
    onPick: function (p) { curPeriod = p; load(); }
  });
  syncTip();
  updateBoardVisibility();
  fillSubChips();
  load();
}

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 的条目从注册表派生）
registerView({
  id: 'zone', build: buildZoneView,
  dock: {
    label: '榜单', order: 10, group: 0,
    svg: '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"/></svg>'
  }
});
