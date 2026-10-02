import { CFG } from './cfg.js';
import { el } from './ui.js';
import { request } from './net.js';
import { panelItem } from './data.js';
import { registerView, rowOf } from './views.js';

// ---------- 分区榜单视图（0.9.62） ----------
// GET rank/channel（§6.1 实测：rankLimit 生效；POST 形状无 rankLimit 只回 10 条，勿改 POST）。
// 条目经 panelItem 规整（contentType 2=视频，3=文章在契约层过滤），点击 rowOf 内置 playAc。
function buildZoneView(body) {
  var zoneChips = el('div', 'acsv-vchips');
  var periodChips = el('div', 'acsv-vchips');
  var tip = el('div', 'acsv-vtip', '依赖综合指数排序，每日更新一次'); // 原生榜单页同款说明
  var list = el('div', 'acsv-vlist');
  body.appendChild(zoneChips);
  body.appendChild(periodChips);
  body.appendChild(tip);
  body.appendChild(list);

  var curZone = CFG.view.zones[0].id;
  var curPeriod = CFG.view.periods[0];

  function load() {
    list.innerHTML = '';
    list.appendChild(el('div', 'acsv-vempty', '加载中…'));
    request(CFG.api.rank + '?channelId=' + curZone + '&subChannelId='
      + '&rankLimit=' + CFG.view.rankLimit + '&rankPeriod=' + curPeriod, 'GET')
      .then(function (j) {
        var rows = [];
        ((j && j.rankList) || []).forEach(function (raw, i) {
          var pi = panelItem('rank', raw);
          if (pi) rows.push({ pi: pi, rank: i + 1 });
        });
        list.innerHTML = '';
        if (!rows.length) {
          list.appendChild(el('div', 'acsv-vempty', '该分区暂无榜单数据'));
          return;
        }
        rows.forEach(function (r) { list.appendChild(rowOf(r.pi, r.rank)); });
      }, function () {
        list.innerHTML = '';
        list.appendChild(el('div', 'acsv-vempty', '加载失败（网络不可达）'));
      });
  }

  CFG.view.zones.forEach(function (z, i) {
    var c = el('button', 'acsv-vchip' + (i === 0 ? ' on' : ''), z.name);
    c.addEventListener('click', function () {
      if (curZone === z.id) return;
      Array.prototype.forEach.call(zoneChips.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      curZone = z.id;
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
  load();
}

registerView({ id: 'zone', title: '分区榜单', build: buildZoneView });
