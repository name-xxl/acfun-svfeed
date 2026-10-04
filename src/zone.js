import { CFG } from './cfg.js';
import { el, singleFlight } from './ui.js';
import { request } from './net.js';
import { postForm } from './appapi.js';
import { panelItem } from './data.js';
import { rowOf, upCardOf } from './cards.js';
import { registerView } from './viewreg.js';

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
  var zoneChips = el('div', 'acsv-vchips');
  var subChips = el('div', 'acsv-vchips');
  var periodChips = el('div', 'acsv-vchips');
  var tip = el('div', 'acsv-vtip'); // 说明行文案随频道更新（原生「全站综合 / 依综合指数排序，每日更新一次」）
  wrap.appendChild(zoneChips);
  wrap.appendChild(subChips);
  wrap.appendChild(periodChips);
  wrap.appendChild(tip);
  // 双列头（原生 rlist__banner：榜单 Rank | Up主 Author）——rlist 行=视频卡+作者卡左右分栏
  var head = el('div', 'acsv-rlist-head');
  var hc1 = el('div', 'acsv-rlist-hcell');
  hc1.appendChild(el('span', 'acsv-rlist-hcn', '榜单'));
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

  var curZone = CFG.view.zones[0];
  var curSub = null;    // null=全部（subChannelId 空）
  var curPeriod = CFG.view.periods[0];

  function fillSubChips() {
    subChips.innerHTML = '';
    navTreeFlight.get().then(function (tree) {
      var subs = subChannelsOf(tree, curZone.name);
      if (!subs.length) return; // 全站综合/树缺：无子频道行（降级）
      var mk = function (label, sub, on) {
        var c = el('button', 'acsv-vchip sm' + (on ? ' on' : ''), label);
        c.addEventListener('click', function () {
          if (curSub === sub) return;
          Array.prototype.forEach.call(subChips.children, function (x) { x.classList.remove('on'); });
          c.classList.add('on');
          curSub = sub;
          load();
        });
        subChips.appendChild(c);
      };
      mk('全部', null, true);
      subs.forEach(function (s) { mk(s.name, s.id, false); });
    });
  }

  function render(rows) {
    list.innerHTML = '';
    if (!rows.length) {
      list.appendChild(el('div', 'acsv-vempty', '该分区暂无榜单数据'));
      return;
    }
    // 原生 rlist__cards：每行=视频卡+作者卡左右分栏（rowOf 出视频卡含排名水印，upCardOf 出作者卡）
    rows.forEach(function (r) {
      var pair = el('div', 'acsv-rlist-row');
      pair.appendChild(rowOf(r.pi, r.rank));
      pair.appendChild(upCardOf(r.pi));
      list.appendChild(pair);
    });
  }

  function load() {
    var key = curZone.id + '|' + (curSub == null ? '' : curSub) + '|' + curPeriod;
    var hit = rankCache[key];
    if (hit && Date.now() - hit.at < RANK_TTL) { render(hit.rows); return; } // 命中：零请求直出
    list.innerHTML = '';
    list.appendChild(el('div', 'acsv-vempty', '加载中…'));
    request(CFG.api.rank + '?channelId=' + curZone.id + '&subChannelId='
      + (curSub == null ? '' : curSub) + '&rankLimit=' + CFG.view.rankLimit
      + '&rankPeriod=' + curPeriod, 'GET')
      .then(function (j) {
        var rows = [];
        ((j && j.rankList) || []).forEach(function (raw, i) {
          var pi = panelItem('rank', raw);
          if (pi) rows.push({ pi: pi, rank: i + 1 });
        });
        rankCache[key] = { at: Date.now(), rows: rows };
        render(rows);
      }, function () {
        list.innerHTML = '';
        list.appendChild(el('div', 'acsv-vempty', '加载失败（网络不可达）'));
      });
  }

  function syncTip() { tip.textContent = curZone.name + ' / 依综合指数排序，每日更新一次'; }
  CFG.view.zones.forEach(function (z, i) {
    var c = el('button', 'acsv-vchip' + (i === 0 ? ' on' : ''), z.name);
    c.addEventListener('click', function () {
      if (curZone.id === z.id) return;
      Array.prototype.forEach.call(zoneChips.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      curZone = z;
      curSub = null; // 切频道重置子频道选区（坑 E）
      syncTip();
      fillSubChips();
      load();
    });
    zoneChips.appendChild(c);
  });
  CFG.view.periods.forEach(function (p, i) {
    var c = el('button', 'acsv-vchip sm' + (i === 0 ? ' on' : ''), CFG.view.periodNames[p] || p);
    c.addEventListener('click', function () {
      if (curPeriod === p) return;
      Array.prototype.forEach.call(periodChips.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      curPeriod = p;
      load();
    });
    periodChips.appendChild(c);
  });
  syncTip();
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
