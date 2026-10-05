import { CFG } from './cfg.js';
import { el, fmt } from './ui.js';
import { registerView } from './viewreg.js';
import { AppAPI } from './appapi.js';
import { listChannels, listChannelFeed } from './channelapi.js';
import { relatedItemOf, startChain } from './relatedapi.js';
import { imgInto } from './imgload.js';
import { testHook } from './dbg.js';

// ---------- 精选页（0.9.169；形态=docs/preview/jingxuan.html ①②） ----------
// 抖音精选式分区网格：chips（全部 + allChannels 视频分区树）+ 首屏大焦点卡（仅「全部」tab）
// + 自适应卡片墙 + 触底续页。数据源（§6.7/§5 实测）：全部=selection/feed（AppAPI.homeFeedFetch
// **自持游标**——不动 home 泵的模块游标，0.9.169 翻页器隔离）；分区=channel/secondLevel/
// resourceList（主频道过滤、~30/块、"{n},{n}" 游标、终页形态未测按空 pcursor/空页收口）。
// 卡片点击=relatedapi.startChain（与评论抽屉「相关推荐」行同一条游走起步缝，不经 playlayer）：
// 从网格进入竖刷即随机游走（默认）或按列表顺序（relSequential 设置）。
// 视图骨架照 squareview（build/teardown + dock 元数据）；列表机械自持（视图单例，teardown 解绑）。

var st = null; // 当前实例状态（视图单例存活：build 建 / teardown 拆）

function durText(ms) {
  var s = Math.round((Number(ms) || 0) / 1000);
  if (!s) return ''; // home 卡不带时长：不摆空角标
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return h ? h + ':' + p(m) + ':' + p(r) : m + ':' + p(r);
}

// 两个来源 → 网格视图模型（显示投影，非契约；first=点击进游走链的播放条目）
function vmOfHome(item) {
  return {
    id: item.id, title: item.title || '', cover: item.cover || '',
    like: item.like || 0, dur: '',
    up: (item.up && item.up.name) || '', first: item
  };
}
function vmOfDv(dv) {
  return {
    id: Number(dv.dougaId != null ? dv.dougaId : dv.contentId) || 0,
    title: dv.title || dv.caption || '', cover: dv.coverUrl || '',
    like: dv.likeCount || 0, dur: durText(dv.durationMillis),
    up: (dv.user && dv.user.name) || '', first: relatedItemOf(dv)
  };
}

function cardOf(vm) {
  var card = el('div', 'acsv-jx-card');
  card.addEventListener('click', function () { startChain(vm.id, vm.first); });
  var cv = el('div', 'acsv-jx-cv');
  imgInto(cv, vm.cover, 'thumb');
  if (vm.dur) cv.appendChild(el('span', 'acsv-jx-dur', vm.dur));
  card.appendChild(cv);
  var ci = el('div', 'acsv-jx-ci');
  ci.appendChild(el('div', 'acsv-jx-ct', vm.title));
  var cm = el('div', 'acsv-jx-cm');
  cm.appendChild(el('span', null, '♥ ' + fmt(vm.like)));
  cm.appendChild(el('span', null, vm.up));
  ci.appendChild(cm);
  card.appendChild(ci);
  return card;
}

function skeletonCards(n) {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < n; i++) {
    var card = el('div', 'acsv-jx-card acsv-jx-skel');
    card.appendChild(el('div', 'acsv-jx-cv'));
    var ci = el('div', 'acsv-jx-ci');
    ci.appendChild(el('div', 'acsv-jx-ct'));
    ci.appendChild(el('div', 'acsv-jx-cm'));
    card.appendChild(ci);
    frag.appendChild(card);
  }
  return frag;
}

function buildJingxuanView(body) {
  var wrap = el('div', 'acsv-jx-wrap');
  var hd = el('div', 'acsv-jx-hd');
  hd.appendChild(el('span', 'acsv-jx-title', '精选'));
  hd.appendChild(el('span', 'acsv-jx-sub', '大家都在看 · 分区随便刷'));
  wrap.appendChild(hd);
  var chips = el('div', 'acsv-vchips'); // chips 复用 zone 的样式族（.acsv-vchip）
  wrap.appendChild(chips);
  var hero = el('div', 'acsv-jx-hero');
  wrap.appendChild(hero);
  var grid = el('div', 'acsv-jx-grid');
  wrap.appendChild(grid);
  var tip = el('div', 'acsv-jx-tip');
  wrap.appendChild(tip);
  body.appendChild(wrap);

  st = {
    tab: 'all',            // 'all' | 频道 id（Number）
    cursor: null,          // home 方言首芯片 ''；channel 方言首芯片 '0'——按 tab 取
    done: false, busy: false, count: 0,
    chips: chips, hero: hero, grid: grid, tip: tip, body: body,
    onScroll: function () {
      if (body.scrollTop + body.clientHeight >= body.scrollHeight - CFG.view.jingxuan.scrollPad) load();
    }
  };
  body.addEventListener('scroll', st.onScroll, { passive: true });

  function mkChip(label, id, on) {
    var c = el('button', 'acsv-vchip' + (on ? ' on' : ''), label);
    c.addEventListener('click', function () {
      if (st.tab === id) return;
      Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      st.tab = id;
      switchTab();
    });
    chips.appendChild(c);
  }
  mkChip('全部', 'all', true);
  listChannels().then(function (tree) {
    if (!st) return; // 视图已拆
    tree.forEach(function (ch) { mkChip(ch.name, ch.id, false); });
  }, function () { /* 树失败：只剩「全部」tab，主功能不拦 */ });

  switchTab();
}

function switchTab() {
  st.cursor = st.tab === 'all' ? '' : '0'; // home 方言首芯片 ''；channel 首芯片 '0'
  st.done = false; st.busy = false; st.count = 0;
  st.hero.innerHTML = '';
  st.hero.style.display = st.tab === 'all' ? '' : 'none';
  st.grid.innerHTML = '';
  st.tip.innerHTML = '';
  st.grid.appendChild(skeletonCards(CFG.view.jingxuan.skel));
  load();
}

function setTip(node) {
  st.tip.innerHTML = '';
  if (node) st.tip.appendChild(node);
}

function failTip() {
  var box = el('div', null, '加载失败 · 网络或服务不可用');
  var retry = el('button', 'acsv-vchip', '重试');
  retry.addEventListener('click', function () { st.done = false; st.busy = false; load(); });
  box.appendChild(document.createElement('br'));
  box.appendChild(retry);
  setTip(box);
}

function load() {
  if (!st || st.busy || st.done) return;
  st.busy = true;
  var tab = st.tab, cursor = st.cursor;
  var p = tab === 'all'
    ? AppAPI.homeFeedFetch(cursor).then(function (r) {
      return { vms: r.items.map(vmOfHome), next: r.pcursor, failed: r.failed, end: r.failed || !r.items.length };
    })
    : listChannelFeed(tab, cursor || '0').then(function (page) {
      return { vms: page.items.map(vmOfDv), next: page.nextCursor, failed: false, end: page.noMore };
    });
  p.then(function (r) {
    if (!st || st.tab !== tab) return; // 期间已切 tab：旧响应丢弃（gen 语义视图侧自持）
    st.busy = false;
    if (r.failed) { failTip(); return; }
    if (!r.vms.length) {
      st.done = true;
      setTip(el('div', null, st.count ? '— 已经到底啦 —' : '这个分区暂时没有可看的内容'));
      return;
    }
    // 先渲染后判终：home 方言首芯片与单页回包游标都是 ''（mockHome/终页同形），「游标未
    // 前进=终」只能在**本批已入格之后**生效——放在渲染前会把唯一合法的 ''→'' 首批吞掉
    st.cursor = r.next;
    var first = st.count === 0;
    if (first) st.grid.innerHTML = ''; // 撤骨架（骨架也带 .acsv-jx-card 类——不清会让
    // 「点首卡」类断言/用户点击抓到无监听的骨架卡）
    if (first && tab === 'all' && r.vms.length > CFG.view.jingxuan.heroSide) {
      // 首屏大焦点卡（抖音精选形态，仅「全部」tab）：1 大 + 右列 heroSide 张，其余进网格
      var big = cardOf(r.vms[0]);
      big.classList.add('acsv-jx-big');
      st.hero.appendChild(big);
      var side = el('div', 'acsv-jx-side');
      for (var i = 1; i <= CFG.view.jingxuan.heroSide; i++) side.appendChild(cardOf(r.vms[i]));
      st.hero.appendChild(side);
      r.vms = r.vms.slice(CFG.view.jingxuan.heroSide + 1);
    }
    for (var k = 0; k < r.vms.length; k++) st.grid.appendChild(cardOf(r.vms[k]));
    st.count += r.vms.length;
    setTip(null);
    if (st.cursor === cursor || st.cursor == null || st.cursor === '') {
      st.done = true; // 游标未前进/耗尽=终（loop 兜底；channel 方言空游标=终页形态未测收口）
      setTip(el('div', null, '— 已经到底啦 —'));
    }
  }, function () {
    if (!st || st.tab !== tab) return;
    st.busy = false;
    failTip();
  });
}

function jingxuanTeardown() {
  if (!st) return;
  st.body.removeEventListener('scroll', st.onScroll);
  st = null;
}

// debug 构建测试钩子：harness 断言读视图态（release 死码消除）
testHook('jingxuan', function () {
  if (!st) return { present: false };
  return {
    present: true,
    tab: String(st.tab),
    chips: st.chips.children.length,
    heroCards: st.hero.querySelectorAll('.acsv-jx-card').length,
    cards: st.grid.querySelectorAll('.acsv-jx-card').length,
    skel: st.grid.querySelectorAll('.acsv-jx-skel').length,
    done: st.done,
    tip: st.tip.textContent
  };
});

// dock：order 16 = 广场（15）下面、同段（group 0）
registerView({
  id: 'jingxuan',
  build: buildJingxuanView,
  teardown: jingxuanTeardown,
  dock: {
    label: '精选', order: 16, group: 0,
    svg: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>'
  }
});
