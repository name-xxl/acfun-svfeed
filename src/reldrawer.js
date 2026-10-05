import { el, fmt } from './ui.js';
import { commentDrawer } from './state.js';
import { imgInto } from './imgload.js';
import { GLYPHS } from './imicons.js';
import { listRelated, relatedItemOf, panelItemOfDv, startChain, layerJump, layerOpen, pickInLayer } from './relatedapi.js';
import { testHook } from './dbg.js';

// ---------- 评论抽屉「相关推荐」tab（0.9.167；形态=docs/preview/jingxuan.html ③④⑤） ----------
// 抽屉骨架（slide.buildDrawer）提供 tab 键与平级第二列表（relList——绝不复用评论 dlist：
// resetList 会清它、.acsv-citem DOM 被 view-follow/detail-open 断言钉死）；本模块经句柄自附
// 行为（ensureDrawerWired 同体例），comments.js 只挂两个 seam：openComments 尾部 sync、
// closeComments 里 close。数据源 relatedapi（feed/related/general，§5 实测）。
// 行点击三落点（0.9.170/0.9.172/0.9.173）：层内 layerJump（0.9.174 起=**压新级别**，见 playlayer
// 级别栈）、层外 layerOpen 开层、播放器未挂载才落 startChain 兜底。
// 锚位行「▶ 播放中」= 当前视频本身（非推荐；回包实测不含当前视频，无重复风险）。
//
// 第三 tab「列表」（0.9.174）：列表播放器（相关推荐/合辑/分P）里展示**当前正在播的那份列表**——
// 与「相关推荐」（当前视频的推荐=跳转入口）并存。数据由 playlayer 经 relDrawerShowList 喂入
// （统一行形状 {id,title,cover,dur,like,up}，与 items 同序），行点击=列表内跳转（layerPick 缝）。

var cache = { rid: null, dvs: [], state: 'idle', title: '' }; // state: loading|ready|empty|error
// 「列表」tab 态（0.9.174）：rows=统一行数据（与播放器会话列表同序）、idx=当前播放项；hide 时清空
var lcache = { rows: [], idx: 0, title: '' };

// ms → m:ss / h:mm:ss（与 rail/controls 的 fmtTime 口径一致，迷你本地版免 import 重件）
function durText(ms) {
  var s = Math.round((Number(ms) || 0) / 1000);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return h ? h + ':' + p(m) + ':' + p(r) : m + ':' + p(r);
}

function wire() {
  var d = commentDrawer;
  if (!d || d._acsvRelWired) return !!d.relList;
  d._acsvRelWired = true;
  d.tabR.addEventListener('click', function () { showRel(); });
  d.tabC.addEventListener('click', function () { showCmt(); });
  if (d.tabL) d.tabL.addEventListener('click', function () { showList(); });
  if (d.listList) d.listList.addEventListener('click', function (ev) {
    var row = ev.target.closest('.acsv-relrow');
    if (!row || row._listIdx == null) return; // 状态行不响应
    pickInLayer(row._listIdx); // 列表内跳转（playlayer 注册的缝；不新开级别）
  });
  d.relList.addEventListener('click', function (ev) {
    var row = ev.target.closest('.acsv-relrow');
    if (!row || !row._dv) return; // 锚位行/状态行无 _dv，不响应
    // 会话语境（0.9.173 用户裁决）：点相关行 = **换成这份列表**（抽屉里这 10 条，顺序走、
    // 到头停）——层内 ↓/↑ 从此按它步进，不再在相关池里随机
    var idx = 0;
    for (var i = 0; i < cache.dvs.length; i++) if (cache.dvs[i] === row._dv) { idx = i; break; }
    // items=播放会话条目（面板条目）；rows=抽屉「列表」tab 的显示行（dur/like/up 全）——同序
    var ctx = {
      kind: 'list',
      items: cache.dvs.map(panelItemOfDv),
      rows: cache.dvs.map(dvRowOf),
      idx: idx
    };
    var item = relatedItemOf(row._dv);
    // 三种落点（0.9.170/0.9.172）：播放层在场 = 层内换轨；层外 = 开层（舞台/视图原地保活，
    // Esc 回当前视频）；播放器未挂载才落到遗留的 startChain（拆视图/重置流的旧形态）
    if (layerJump(item, ctx)) return;
    if (layerOpen(item, ctx)) return;
    startChain(row._dv.dougaId, item);
  });
  return true;
}

// mode: 'cmt' | 'rel' | 'list'（0.9.174 三态；列表 tab 只在列表播放器里显形，由 showList 控制）
function showTab(mode) {
  var d = commentDrawer;
  if (!d) return;
  d.tabC.classList.toggle('on', mode === 'cmt');
  d.tabR.classList.toggle('on', mode === 'rel');
  if (d.tabL) d.tabL.classList.toggle('on', mode === 'list');
  d.list.style.display = mode === 'cmt' ? '' : 'none';
  d.relList.style.display = mode === 'rel' ? '' : 'none';
  if (d.listList) d.listList.style.display = mode === 'list' ? '' : 'none';
  // 输入条属评论 tab：其余两 tab 下隐藏；恢复时还原**隐藏前**的内联值（sv 模式 openComments
  // 设 display:'none'——不能无脑还 ''，否则小视频的纯浏览语义被破）
  var input = d.el.querySelector('.acsv-cinput');
  if (input) {
    if (mode !== 'cmt') { input._acsvDisp = input.style.display; input.style.display = 'none'; }
    else if (input.style.display === 'none') input.style.display = input._acsvDisp || '';
  }
}

function showCmt() { showTab('cmt'); }

function showRel() {
  showTab('rel');
  render();
}

function showList() {
  showTab('list');
  renderList();
}

// ---------- 「列表」tab（0.9.174）：列表播放器的当前列表 ----------
// 行=统一形状 {id,title,cover,dur,like,up}（与 items 同序；相关推荐由 cache.dvs 供，未来合辑/分P 同形）；
// 当前播放项：封面位换「▶ 播放中」+ 行描边（.acsv-lcur，styles.js）；行点击=列表内跳转（layerPick 缝）
function listRowOf(row, i) {
  var node = el('div', 'acsv-relrow' + (i === lcache.idx ? ' acsv-lcur' : ''));
  node._listIdx = i;
  var cv = el('div', 'acsv-relcv');
  if (i === lcache.idx) {
    cv.appendChild(el('div', 'acsv-relplay', '▶ 播放中'));
  } else {
    imgInto(cv, row.cover || '', 'thumb');
    if (row.dur) cv.appendChild(el('span', 'acsv-reldur', row.dur));
  }
  node.appendChild(cv);
  var rt = el('div', 'acsv-relrt');
  rt.appendChild(el('div', 'acsv-reltt', row.title || ''));
  var mm = el('div', 'acsv-relmm');
  var like = el('span', null);
  like.appendChild(el('span', 'acsv-relicon', GLYPHS.feedLike));
  like.appendChild(document.createTextNode(' ' + fmt(row.like || 0)));
  mm.appendChild(like);
  mm.appendChild(el('span', null, row.up || ''));
  rt.appendChild(mm);
  node.appendChild(rt);
  return node;
}

// dougaFeedView → 列表显示行（统一行形状，0.9.174）
function dvRowOf(dv) {
  return {
    id: Number(dv.dougaId != null ? dv.dougaId : dv.contentId) || 0,
    title: dv.title || dv.caption || '',
    cover: dv.coverUrl || '',
    dur: durText(dv.durationMillis),
    like: dv.likeCount || 0,
    up: (dv.user && dv.user.name) || ''
  };
}

function renderList() {
  var d = commentDrawer;
  if (!d || !d.listList) return;
  d.listList.innerHTML = '';
  if (!lcache.rows.length) {
    d.listList.appendChild(el('div', 'acsv-drawer-tip', '当前没有可播放的列表'));
    return;
  }
  for (var i = 0; i < lcache.rows.length; i++) d.listList.appendChild(listRowOf(lcache.rows[i], i));
  d.listList.appendChild(el('div', 'acsv-relnote',
    '当前播放列表（' + lcache.rows.length + ' 条）：点行跳转，不新开播放器；走到最后一条停'));
}

// 锚位行 + 推荐行 + 三态（loading 骨架两行 / empty / error+重试）。每次全量重建：
// 列表 ≤10 行、切视频才重拉，重建成本可忽略（不做行 diff）
function render() {
  var d = commentDrawer;
  if (!d || !d.relList) return;
  d.relList.innerHTML = '';
  if (cache.state === 'loading') {
    for (var i = 0; i < 2; i++) {
      var sk = el('div', 'acsv-relrow');
      sk.appendChild(el('div', 'acsv-relcv acsv-relsk'));
      var rt = el('div', 'acsv-relrt');
      rt.appendChild(el('div', 'acsv-reltt acsv-relsk'));
      rt.appendChild(el('div', 'acsv-relmm acsv-relsk'));
      sk.appendChild(rt);
      d.relList.appendChild(sk);
    }
    return;
  }
  if (cache.state === 'error') {
    var box = el('div', 'acsv-drawer-tip', '相关推荐加载失败，请重试');
    var retry = el('button', 'acsv-relretry', '重试');
    retry.addEventListener('click', function () {
      cache.state = 'loading';
      render();
      prefetch(cache.rid);
    });
    box.appendChild(el('br'));
    box.appendChild(retry);
    d.relList.appendChild(box);
    return;
  }
  if (cache.state === 'empty') {
    d.relList.appendChild(el('div', 'acsv-drawer-tip', '这个视频暂时没有相关推荐'));
    return;
  }
  // 锚位行（播放中）——不是推荐数据；标题=当前视频（openComments 传入）
  var anchor = el('div', 'acsv-relrow acsv-relanchor');
  var aplay = el('div', 'acsv-relplay', '▶ 播放中');
  anchor.appendChild(aplay);
  var art = el('div', 'acsv-relrt');
  art.appendChild(el('div', 'acsv-reltt', cache.title || '当前视频'));
  var amm = el('div', 'acsv-relmm');
  amm.appendChild(el('span', null, '正在播放'));
  art.appendChild(amm);
  anchor.appendChild(art);
  d.relList.appendChild(anchor);
  // 推荐行
  for (var k = 0; k < cache.dvs.length; k++) {
    d.relList.appendChild(rowOf(cache.dvs[k]));
  }
  d.relList.appendChild(el('div', 'acsv-relnote',
    '点行 = 开列表播放器（这份 10 条按顺序播，Esc 回当前视频）'));
}

function rowOf(dv) {
  var row = el('div', 'acsv-relrow');
  row._dv = dv; // 点击委托读取（relatedapi.startChain 的行数据源）
  var cv = el('div', 'acsv-relcv');
  imgInto(cv, dv.coverUrl || '', 'thumb');
  cv.appendChild(el('span', 'acsv-reldur', durText(dv.durationMillis)));
  row.appendChild(cv);
  var rt = el('div', 'acsv-relrt');
  rt.appendChild(el('div', 'acsv-reltt', dv.title || dv.caption || ''));
  var mm = el('div', 'acsv-relmm');
  var like = el('span', null);
  like.appendChild(el('span', 'acsv-relicon', GLYPHS.feedLike));
  like.appendChild(document.createTextNode(' ' + fmt(dv.likeCount || 0)));
  mm.appendChild(like);
  mm.appendChild(el('span', null, (dv.user && dv.user.name) || ''));
  rt.appendChild(mm);
  row.appendChild(rt);
  return row;
}

// 拉取（静默预取：tab 没开也先拉，切过去零等待）；失败置 error（开着的 tab 即刻出重试）
function prefetch(rid) {
  listRelated(rid).then(function (dvs) {
    if (cache.rid !== String(rid)) return; // 期间已切视频：旧响应丢弃（同评论 reqId 纪律）
    cache.dvs = dvs || [];
    cache.state = cache.dvs.length ? 'ready' : 'empty';
    if (commentDrawer && commentDrawer.relList.style.display !== 'none') render();
  }, function () {
    if (cache.rid !== String(rid)) return;
    cache.dvs = [];
    cache.state = 'error';
    if (commentDrawer && commentDrawer.relList.style.display !== 'none') render();
  });
}

// seam ①：comments.openComments 尾部调。kind!=='home'（sv 小视频/未知）隐藏 tab——
// related/general 只收视频稿件（resourceType=2，§5）；换视频刷新缓存并按需重渲染
export function relDrawerSync(rid, kind, title) {
  var d = commentDrawer;
  if (!d || !d.relList) return;
  wire();
  var isVideo = kind === 'home';
  d._relByKind = isVideo; // kind 判定的结果记下来——列表播放器退出时要按它还原
  d.tabR.style.display = (isVideo && !d._listOnly) ? '' : 'none';
  if (!isVideo) {
    if (d.tabR.classList.contains('on')) showCmt(); // 正看着相关列表、划到小视频：弹回评论 tab
    return;
  }
  rid = String(rid);
  if (cache.rid !== rid) {
    cache.rid = rid;
    cache.title = title || '';
    cache.dvs = [];
    cache.state = 'loading';
    if (d.tabR.classList.contains('on')) render();
    prefetch(rid);
  } else if (title && cache.title !== title) {
    cache.title = title; // 同 id 重开（标题补齐）：只刷锚位文案
    if (d.tabR.classList.contains('on')) render();
  }
}

// seam ②：comments.closeComments 调——tab 复位到评论（下次打开从评论区起步）；缓存保留
//（同视频重开抽屉零等待）
export function relDrawerClose() {
  var d = commentDrawer;
  if (!d || !d.relList) return;
  if (d.tabR.classList.contains('on')) showCmt();
}

// seam ③（0.9.174）：列表播放器打开/换条时调——显形「列表」tab 并展示当前列表（抽屉本身的
// 展开由 playlayer 侧 openComments 负责）；rows=统一行数据（与播放器会话列表同序），idx=播放项
export function relDrawerShowList(rows, idx, title) {
  var d = commentDrawer;
  if (!d || !d.listList || !d.tabL) return;
  wire();
  lcache.rows = (rows || []).slice();
  lcache.idx = Number(idx) || 0;
  lcache.title = title || '';
  d.tabL.style.display = '';
  showList();
}

// seam ④（0.9.174）：层内步进/列表内跳转后同步当前项——只在「列表」tab 正激活时重渲染
//（用户切去看评论/相关推荐时不抢 tab）
export function relDrawerSyncList(idx) {
  var d = commentDrawer;
  if (!d || !d.listList || !d.tabL || !d.tabL.classList.contains('on')) return;
  lcache.idx = Number(idx) || 0;
  renderList();
}

// seam ⑤（0.9.174）：弹回上级/退层时收「列表」tab（隐藏 + 复位评论；列表态清空——下次是
// 新级别的列表，不能留旧行）
export function relDrawerHideList() {
  var d = commentDrawer;
  if (!d || !d.listList || !d.tabL) return;
  lcache.rows = [];
  lcache.idx = 0;
  d.tabL.style.display = 'none';
  if (d.tabL.classList.contains('on')) showCmt();
}

// seam ⑥（0.9.175）：列表播放器（级别≥2）里抽屉**只留评论 + 列表**——相关推荐 tab 收起
//（防无限套娃：用户裁决「第三个播放器只管自己的播放列表，相关推荐不显示」）；
// 退出列表播放器（弹回上级）时按最近的 kind 判定还原
export function relDrawerListMode(on) {
  var d = commentDrawer;
  if (!d || !d.tabR) return;
  d._listOnly = !!on;
  if (on) {
    if (d.tabR.classList.contains('on')) showList(); // 正看着相关推荐：弹回列表页签
    d.tabR.style.display = 'none';
  } else {
    d.tabR.style.display = d._relByKind ? '' : 'none';
  }
}

// debug 构建测试钩子：harness 断言读 tab/列表态（release 死码消除）
testHook('reldrawer', function () {
  var d = commentDrawer;
  if (!d || !d.relList) return { present: false };
  return {
    present: true,
    relTabShown: d.tabR.style.display !== 'none',
    relOn: d.tabR.classList.contains('on'),
    state: cache.state,
    rows: d.relList.querySelectorAll('.acsv-relrow').length,
    hasAnchor: !!d.relList.querySelector('.acsv-relanchor'),
    rid: cache.rid,
    listShown: !!(d.tabL && d.tabL.style.display !== 'none'),
    listOn: !!(d.tabL && d.tabL.classList.contains('on')),
    listRows: d.listList ? d.listList.querySelectorAll('.acsv-relrow').length : 0,
    listIdx: lcache.idx,
    listOnly: !!d._listOnly
  };
});
