import { CFG } from './cfg.js';
import { el, singleFlight } from './ui.js';
import { request } from './net.js';
import { postForm } from './appapi.js';
import { panelItem, upListOf } from './data.js';
import { registerView, rowOf } from './views.js';

// ---------- 分区榜单视图（0.9.62 建，0.9.66 对齐原生：子频道行 + UP 榜） ----------
// GET rank/channel（§6.1 实测：rankLimit 生效；POST 形状无 rankLimit 只回 10 条，勿改 POST；
// subChannelId 服务端真过滤——107/108/159 返回条数各异，直连参数）。条目经 panelItem
// 规整（contentType 2=视频，3=文章在契约层过滤），点击 rowOf 内置 playAc。
// 子频道树：queryNavigators 分区树 children（cid+navName 官方树），singleFlight 单飞缓存；
// 树拉不到或频道无 children → 子频道行隐藏（降级不阻塞主榜）。
// UP 榜 = upListOf(rankList) 聚合作者 top10（契约层纯函数），section 置于视频榜下方。
var navTreeFlight = singleFlight(function () {
  return postForm(CFG.api.navTree, '').then(function (nv) {
    return nv && nv.data ? nv.data : [];
  }, function () { return []; });
});

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
  var zoneChips = el('div', 'acsv-vchips');
  var subChips = el('div', 'acsv-vchips');
  var periodChips = el('div', 'acsv-vchips');
  var tip = el('div', 'acsv-vtip', '依赖综合指数排序，每日更新一次'); // 原生榜单页同款说明
  var list = el('div', 'acsv-vlist');
  body.appendChild(zoneChips);
  body.appendChild(subChips);
  body.appendChild(periodChips);
  body.appendChild(tip);
  body.appendChild(list);
  var upSec = el('div', 'acsv-vsec');
  upSec.appendChild(el('div', 'acsv-vsec-title', 'UP 主'));
  var upList = el('div', 'acsv-vlist ups');
  upSec.appendChild(upList);
  body.appendChild(upSec);

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

  function load() {
    list.innerHTML = '';
    upList.innerHTML = '';
    list.appendChild(el('div', 'acsv-vempty', '加载中…'));
    request(CFG.api.rank + '?channelId=' + curZone.id + '&subChannelId='
      + (curSub == null ? '' : curSub) + '&rankLimit=' + CFG.view.rankLimit
      + '&rankPeriod=' + curPeriod, 'GET')
      .then(function (j) {
        var raws = (j && j.rankList) || [];
        var rows = [];
        raws.forEach(function (raw, i) {
          var pi = panelItem('rank', raw);
          if (pi) rows.push({ pi: pi, rank: i + 1 });
        });
        list.innerHTML = '';
        if (!rows.length) {
          list.appendChild(el('div', 'acsv-vempty', '该分区暂无榜单数据'));
        } else {
          rows.forEach(function (r) { list.appendChild(rowOf(r.pi, r.rank)); });
        }
        // UP 榜：契约层聚合（原始 rankList 过 contentType 前——文章作者也算 UP 热度）
        upList.innerHTML = '';
        upListOf(raws, 10).forEach(function (up) {
          var row = el('div', 'acsv-vrow up');
          var thumb = el('div', 'acsv-vrow-thumb'); // 圆头像尺寸由 .acsv-vrow.up 修饰（52px 圆）
          if (up.img) {
            var img = el('img');
            img.src = up.img;
            img.referrerPolicy = 'no-referrer';
            img.loading = 'lazy';
            thumb.appendChild(img);
          }
          row.appendChild(thumb);
          var main = el('div', 'acsv-vrow-main');
          main.appendChild(el('div', 'acsv-vrow-title', up.name));
          main.appendChild(el('div', 'acsv-vrow-meta', up.fans + ' 粉丝 · 榜单第 ' + up.rank + ' 名'));
          if (up.sign) main.appendChild(el('div', 'acsv-vrow-desc', up.sign));
          row.appendChild(main);
          upList.appendChild(row);
        });
      }, function () {
        list.innerHTML = '';
        list.appendChild(el('div', 'acsv-vempty', '加载失败（网络不可达）'));
      });
  }

  CFG.view.zones.forEach(function (z, i) {
    var c = el('button', 'acsv-vchip' + (i === 0 ? ' on' : ''), z.name);
    c.addEventListener('click', function () {
      if (curZone.id === z.id) return;
      Array.prototype.forEach.call(zoneChips.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      curZone = z;
      curSub = null; // 切频道重置子频道选区（坑 E）
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
  fillSubChips();
  load();
}

registerView({ id: 'zone', title: '分区榜单', build: buildZoneView });
