import { CFG } from './cfg.js';
import { el, fmt, fmtDurMs } from './ui.js';
import { registerView } from './viewreg.js';
import { AppAPI } from './appapi.js';
import { listChannels, listChannelFeed } from './channelapi.js';
import { relatedItemOf } from './relatedapi.js';
import { openPanelItem } from './cards.js';
import { imgInto } from './imgload.js';
import { GLYPHS } from './imicons.js';
import { getSetting } from './settings.js'; // 分区二选一（0.9.173）：关=相关池随机 / 开=网格顺序
import { testHook } from './dbg.js';

// ---------- 分区页（0.9.169；0.9.170 网格改版=docs/preview/jingxuan.html ①②；0.9.171 改名+原生图标） ----------
// 抖音精选式分区网格（展示名=「分区」，0.9.171 用户裁决改名；**视图 id/路由/文件名仍 jingxuan**
// ——id 是深链与测试的稳定键，改名只动展示串）：chips（全部 + allChannels 视频分区树）+
// 自适应卡片墙 + 触底续页。数据源（§6.7/§5 实测）：全部=selection/feed（AppAPI.homeFeedFetch
// **自持游标**——不动 home 泵的模块游标，0.9.169 翻页器隔离）；分区=channel/secondLevel/
// resourceList（主频道过滤、~30/块、"{n},{n}" 游标、终页形态未测按空游标/空页收口）。
//
// 卡片点击=openPanelItem（cards 注入缝 → playlayer.openPlayer）——与榜单/搜索/我的同一条出口：
// 播放层浮层单条播放、Esc 回分区原位（视图保活）；层内 ↓/↑ 与滚轮上下滑走相关游走
// （playlayer，0.9.170/0.9.171）。0.9.169 曾走 startChain 拆视图进竖屏游走——该链 0.9.179 已删。
//
// 网格两条纪律（用户裁决）：
//   ① 首卡 = 网格内 2 列 × 2 行跨格（.acsv-jx-big；撤旧 hero 大焦点区）——全部/分区 tab 同形态。
//      封面锁 16:9（styles.js）：与源图同比例 ⇒ cover 零裁切零拉伸；信息区 4 行填满。
//   ② 按行补齐：渲染量取「整行倍数」——大卡在场时行 1-2 各容 cols-2 张、其后每行 cols 张，
//      渲染到整行填满为止，底部不留空卡；多余条目留缓冲跨批续用（流尽时尾行例外）。
//      列数随窗宽 2–5 列自适应（auto-fill minmax），补齐步长**按现场列数算**，不写死。
// 视图骨架照 squareview（build/teardown + dock 元数据）；列表机械自持（视图单例，teardown 解绑）。

var st = null; // 当前实例状态（视图单例存活：build 建 / teardown 拆）

// 分区标签（大卡标签行）：dougaFeedView 的 tagList 形状未逐项实测（对象/字符串两说），
// 防御性取 name/tagName；无 tagList 或为 home 卡时回落 channelInfo（0.9.170 新契约字段）
function tagsOfDv(dv) {
  var out = [];
  var list = dv.tagList || [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    var n = typeof t === 'string' ? t : ((t && (t.name || t.tagName)) || '');
    if (n) out.push(n);
  }
  if (!out.length && dv.channel && dv.channel.name) out.push(String(dv.channel.name));
  return out.slice(0, 3);
}

// 两个来源 → 网格视图模型（显示投影，非契约）
function vmOfHome(item) {
  return {
    id: item.id, title: item.title || '', cover: item.cover || '',
    like: item.like || 0, dur: '', views: item.view || 0,
    tags: item.channelInfo ? [String(item.channelInfo)] : [],
    up: item.up || null
  };
}
function vmOfDv(dv) {
  var it = relatedItemOf(dv); // 复用相关域规整（home 契约模板 + 计数富化），up 已归一
  return {
    id: it.id, title: it.title, cover: it.cover,
    like: it.like, dur: fmtDurMs(dv.durationMillis), views: it.view,
    tags: tagsOfDv(dv), up: it.up
  };
}

// 计数位（0.9.171）：原生 iconfont 字形 + 数字——播放=rankView（E164，selection/feed 卡的
// extra 首位同字）、点赞=feedLike（E629，动态卡互动区同字）；类与用法照 cards.js 面板卡
// （el('i','acsvg-glyph',码点)，字体在 styles @font-face 注入）
function statOf(code, text) {
  var s = el('span', 'acsv-jx-stat');
  s.appendChild(el('i', 'acsvg-glyph', code));
  s.appendChild(document.createTextNode(' ' + text));
  return s;
}

// 大卡信息区 4 行（标题全卡通用；标签/UP 行数据缺失就不挂——space-between 摊余量）
function infoOf(vm, big) {
  var ci = el('div', 'acsv-jx-ci');
  ci.appendChild(el('div', 'acsv-jx-ct', vm.title));
  if (!big) {
    var cm0 = el('div', 'acsv-jx-cm');
    cm0.appendChild(statOf(GLYPHS.feedLike, fmt(vm.like)));
    cm0.appendChild(el('span', null, (vm.up && vm.up.name) || ''));
    ci.appendChild(cm0);
    return ci;
  }
  if (vm.tags && vm.tags.length) {
    var tg = el('div', 'acsv-jx-tags');
    vm.tags.forEach(function (t) { tg.appendChild(el('span', 'acsv-jxtag', t)); });
    ci.appendChild(tg);
  }
  if (vm.up && vm.up.name) {
    var up = el('div', 'acsv-jx-up');
    var ava = el('span', 'acsv-jx-ava');
    if (vm.up.img) imgInto(ava, vm.up.img, 'avatar');
    up.appendChild(ava);
    up.appendChild(el('span', null, vm.up.name));
    ci.appendChild(up);
  }
  var cm = el('div', 'acsv-jx-cm');
  cm.appendChild(statOf(GLYPHS.rankView, fmt(vm.views)));
  cm.appendChild(statOf(GLYPHS.feedLike, fmt(vm.like)));
  cm.appendChild(el('span', null, vm.dur || ''));
  ci.appendChild(cm);
  return ci;
}

// vm → 面板条目（playlayer 即时首帧 + playItemOf 归一的契约形状）
function piOfVm(vm) {
  return { acId: vm.id, title: vm.title, cover: vm.cover, up: vm.up };
}

// 层内会话语境（0.9.173 用户裁决：分区保留「随机 / 列表顺序」二选一）：
//   设置关（默认）= {kind:'walk'}——层内 ↓ 从相关池随机抽（抖音式刷不完，换批续命）
//   设置开 = 列表会话：按网格渲染顺序步进，尾部续拉下一页（more 由本视图供）
function ctxOfVm(vm) {
  if (!getSetting('relSequential')) return { kind: 'walk' };
  return function () {
    if (!st) return { kind: 'walk' };
    var items = st.rendered.map(piOfVm);
    var idx = 0;
    for (var i = 0; i < st.rendered.length; i++) if (st.rendered[i].id === vm.id) { idx = i; break; }
    return { kind: 'list', items: items, idx: idx, more: moreOfList() };
  };
}

// 列表会话的续拉：推进一拍渲染，把新增的 vm 转成面板条目交回（无新增=null → 层里提示到头）
function moreOfList() {
  return function () {
    return new Promise(function (resolve) {
      if (!st) { resolve(null); return; }
      var before = st.rendered.length;
      st.waitMore = function () {
        st.waitMore = null;
        resolve(st.rendered.length > before ? st.rendered.slice(before).map(piOfVm) : null);
      };
      advance();
    });
  };
}

function cardOf(vm, big) {
  var card = el('div', 'acsv-jx-card' + (big ? ' acsv-jx-big' : ''));
  card.addEventListener('click', function () {
    openPanelItem(piOfVm(vm), ctxOfVm(vm));
  });
  var cv = el('div', 'acsv-jx-cv');
  imgInto(cv, vm.cover, 'thumb');
  if (vm.dur) cv.appendChild(el('span', 'acsv-jx-dur', vm.dur));
  card.appendChild(cv);
  card.appendChild(infoOf(vm, big));
  return card;
}

// 现场列数（auto-fill 随窗宽 2–5 列变化）：补齐步长跟它走。列数在会话中变（缩放窗口）时
// 已渲染部分不重排——下一次 advance 用新列数算目标，dense 流自动回填既有空位
function cols() {
  if (!st || !st.grid) return 4;
  var t = getComputedStyle(st.grid).gridTemplateColumns || '';
  var n = t.split(' ').filter(function (x) { return x; }).length;
  return n > 0 ? n : 1;
}

// 「整行补齐」目标（普通卡总数，含大卡在场的前提）：行 1-2 各容 cols-2 张（cols=2 时大卡
// 独占两行 ⇒ 首目标=2），其后每行 cols 张 ⇒ 刷新点 = 2(cols-2) + k·cols。取 ≥ 已渲染的最小值
function nextTarget(rendered, c) {
  c = c || cols();
  var base = 2 * Math.max(0, c - 2);
  var n = base > 0 ? base : c;
  while (n <= rendered) n += c;
  return n;
}

function skelCard(big) {
  var card = el('div', 'acsv-jx-card acsv-jx-skel' + (big ? ' acsv-jx-big' : ''));
  card.appendChild(el('div', 'acsv-jx-cv'));
  var ci = el('div', 'acsv-jx-ci');
  ci.appendChild(el('div', 'acsv-jx-ct'));
  if (big) {
    ci.appendChild(el('div', 'acsv-jx-tags'));
    ci.appendChild(el('div', 'acsv-jx-up'));
  }
  ci.appendChild(el('div', 'acsv-jx-cm'));
  card.appendChild(ci);
  return card;
}

// 骨架也按整行给（1 大 + nextTarget(0) 张普通）——与实体同形，数据到达即原位换实卡
function skeletonCards() {
  var frag = document.createDocumentFragment();
  frag.appendChild(skelCard(true));
  var n = nextTarget(0);
  for (var i = 0; i < n; i++) frag.appendChild(skelCard(false));
  return frag;
}

function buildJingxuanView(body) {
  var wrap = el('div', 'acsv-jx-wrap');
  var hd = el('div', 'acsv-jx-hd');
  hd.appendChild(el('span', 'acsv-jx-title', '分区')); // 展示名 0.9.171 用户裁决：精选→分区（id/路由仍 jingxuan）
  hd.appendChild(el('span', 'acsv-jx-sub', '大家都在看 · 分区随便刷'));
  wrap.appendChild(hd);
  var chips = el('div', 'acsv-vchips'); // chips 复用 zone 的样式族（.acsv-vchip）
  wrap.appendChild(chips);
  var grid = el('div', 'acsv-jx-grid');
  wrap.appendChild(grid);
  var tip = el('div', 'acsv-jx-tip');
  wrap.appendChild(tip);
  body.appendChild(wrap);

  st = {
    tab: 'all',            // 'all' | 频道 id（Number）
    cursor: null,          // home 方言首芯片 ''；channel 方言首芯片 '0'——按 tab 取
    done: false, busy: false, err: false,
    big: false, normals: 0, buf: [],
    rendered: [], // 已渲染 vm 序列（渲染顺序；列表会话的条目源，0.9.173）
    waitMore: null, // 列表会话续拉的等待回调（drain 渲染完触发，0.9.173）
    chips: chips, grid: grid, tip: tip, body: body,
    onScroll: function () {
      if (body.scrollTop + body.clientHeight >= body.scrollHeight - CFG.view.jingxuan.scrollPad) advance();
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
  st.done = false; st.busy = false; st.err = false;
  st.big = false; st.normals = 0; st.buf = [];
  st.rendered = []; st.waitMore = null;
  st.grid.innerHTML = '';
  st.tip.innerHTML = '';
  st.grid.appendChild(skeletonCards());
  advance();
}

function setTip(node) {
  st.tip.innerHTML = '';
  if (node) st.tip.appendChild(node);
}

function failTip() {
  var box = el('div', null, '加载失败 · 网络或服务不可用');
  var retry = el('button', 'acsv-vchip', '重试');
  retry.addEventListener('click', function () {
    if (!st) return;
    st.err = false; st.done = false; st.busy = false;
    setTip(null);
    advance();
  });
  box.appendChild(document.createElement('br'));
  box.appendChild(retry);
  setTip(box);
}

// 拉一页进缓冲；尾部再调 advance（凑够整行再渲染）。终页/失败在本函数记账
function fetchPage() {
  if (!st || st.busy || st.done || st.err) return;
  st.busy = true;
  var tab = st.tab, cursor = st.cursor;
  var p = tab === 'all'
    ? AppAPI.homeFeedFetch(cursor).then(function (r) {
      return { vms: r.items.map(vmOfHome), next: r.pcursor, failed: r.failed, empty: !r.items.length };
    })
    : listChannelFeed(tab, cursor || '0').then(function (page) {
      return { vms: page.items.map(vmOfDv), next: page.nextCursor, failed: false, empty: page.noMore };
    });
  p.then(function (r) {
    if (!st || st.tab !== tab) return; // 期间已切 tab：旧响应丢弃（gen 语义视图侧自持）
    st.busy = false;
    if (r.failed) { st.err = true; failTip(); return; }
    if (!r.vms.length) { st.done = true; drain(); return; }
    st.buf = st.buf.concat(r.vms);
    // 游标写回 + 终页判定（**先写回再判**）：游标未前进/耗尽=终（loop 兜底；channel 空游标=
    // 终页形态未测收口）。判定放在**入缓冲之后**——home 方言首芯片与单页回包游标都是 ''
    // （mockHome/终页同形），先判会把合法首批吞掉（0.9.169 教训）
    st.cursor = r.next;
    if (r.next == null || r.next === '' || r.next === cursor) st.done = true;
    advance();
  }, function () {
    if (!st || st.tab !== tab) return;
    st.busy = false;
    st.err = true;
    failTip();
  });
}

// 渲染到「下一个整行点」（不足则拉页；流尽则把缓冲全放掉——尾行可能不满）。
// 渲染后若滚动体还没被铺满（首屏/窄窗），按整行继续推进——每次推进都以整行为单位
function advance() {
  if (!st || st.busy || st.err) return;
  var needBig = st.big ? 0 : 1;
  var need = nextTarget(st.normals) - st.normals + needBig;
  if (st.buf.length >= need || st.done) { drain(); return; }
  fetchPage();
}

// 落一张卡并记入 rendered 序列（列表会话的条目源与渲染同序，0.9.173）
function placeCard(vm, big) {
  st.grid.appendChild(cardOf(vm, big));
  st.rendered.push(vm);
}

// 列表会话续拉的等待回调（若在等：本拍渲染完即刻回话，交回新增条目）
function flushWaitMore() {
  if (st && st.waitMore) st.waitMore();
}

function drain() {
  if (!st) return;
  // 首批实卡落位前撤骨架（骨架也带 .acsv-jx-card/.acsv-jx-big 类——不清会与实卡并存）
  if (st.buf.length && !st.big) st.grid.innerHTML = '';
  if (st.done) {
    // 流尽：缓冲全放（尾行可不满——数据用尽）；大卡仍只挂首张
    if (!st.big && st.buf.length) { placeCard(st.buf.shift(), true); st.big = true; }
    while (st.buf.length) { placeCard(st.buf.shift(), false); st.normals++; }
    if (!st.big && !st.normals) st.grid.innerHTML = ''; // 空分区：留空网格，不摆永久骨架
    if (!st.tip.textContent) {
      setTip(el('div', null, (st.big || st.normals) ? '— 已经到底啦 —' : '这个分区暂时没有可看的内容'));
    }
    flushWaitMore();
    return;
  }
  if (!st.big && st.buf.length) { placeCard(st.buf.shift(), true); st.big = true; }
  var target = nextTarget(st.normals);
  while (st.normals < target && st.buf.length) {
    placeCard(st.buf.shift(), false);
    st.normals++;
  }
  setTip(null);
  flushWaitMore();
  // 渲染后滚动体仍没被铺满（首屏/窄窗/高视口）：按整行继续推进——每次推进都以整行为单位，
  // 不出现半空行（这就是「按行补齐」与「按视口补一批」的分野）
  if (!st.done && !st.err && st.body.scrollHeight <= st.body.clientHeight + 4) advance();
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
    big: st.grid.querySelectorAll('.acsv-jx-big').length,
    cards: st.grid.querySelectorAll('.acsv-jx-card').length,
    skel: st.grid.querySelectorAll('.acsv-jx-skel').length,
    normals: st.normals,
    buf: st.buf.length,
    rendered: st.rendered.length,
    cols: cols(),
    done: st.done,
    tip: st.tip.textContent
  };
});

// dock：order 5 = 左栏最顶（0.9.170 用户裁决：分区在推荐之上；推荐条目 order 10 见 sidebar）
registerView({
  id: 'jingxuan',
  build: buildJingxuanView,
  teardown: jingxuanTeardown,
  dock: {
    label: '分区', order: 5, group: 0, // 展示名（0.9.171 改名；id 仍 jingxuan）
    svg: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>'
  }
});
