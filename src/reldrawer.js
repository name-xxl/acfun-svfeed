import { el, fmt } from './ui.js';
import { commentDrawer } from './state.js';
import { imgInto } from './imgload.js';
import { GLYPHS } from './imicons.js';
import { listRelated, relatedItemOf, startChain, layerJump } from './relatedapi.js';
import { testHook } from './dbg.js';

// ---------- 评论抽屉「相关推荐」tab（0.9.167；形态=docs/preview/jingxuan.html ③④⑤） ----------
// 抽屉骨架（slide.buildDrawer）提供 tab 键与平级第二列表（relList——绝不复用评论 dlist：
// resetList 会清它、.acsv-citem DOM 被 view-follow/detail-open 断言钉死）；本模块经句柄自附
// 行为（ensureDrawerWired 同体例），comments.js 只挂两个 seam：openComments 尾部 sync、
// closeComments 里 close。数据源 relatedapi（feed/related/general，§5 实测）。
// 行点击 = relatedapi.startChain：起点置顶 + setSource('related') + 游走泵接管竖刷。
// 锚位行「▶ 播放中」= 当前视频本身（非推荐；回包实测不含当前视频，无重复风险）。

var cache = { rid: null, dvs: [], state: 'idle', title: '' }; // state: loading|ready|empty|error

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
  d.relList.addEventListener('click', function (ev) {
    var row = ev.target.closest('.acsv-relrow');
    if (!row || !row._dv) return; // 锚位行/状态行无 _dv，不响应
    // 两种落点（0.9.170）：播放层浮层在场 = 层内换条（不拆界面、Esc 仍回来源列表）；
    // 否则 = 舞台游走起步（起点置顶 + 拆视图进竖刷）。层判定由 playlayer 注册进 relatedapi
    var item = relatedItemOf(row._dv);
    if (layerJump(item)) return;
    startChain(row._dv.dougaId, item);
  });
  return true;
}

function showTab(rel) {
  var d = commentDrawer;
  if (!d) return;
  d.tabC.classList.toggle('on', !rel);
  d.tabR.classList.toggle('on', rel);
  d.list.style.display = rel ? 'none' : '';
  d.relList.style.display = rel ? '' : 'none';
  // 输入条属评论 tab：相关推荐下隐藏；恢复时还原**隐藏前**的内联值（sv 模式 openComments
  // 设 display:'none'——不能无脑还 ''，否则小视频的纯浏览语义被破）
  var input = d.el.querySelector('.acsv-cinput');
  if (input) {
    if (rel) { input._acsvDisp = input.style.display; input.style.display = 'none'; }
    else if (input.style.display === 'none') input.style.display = input._acsvDisp || '';
  }
}

function showCmt() { showTab(false); }

function showRel() {
  showTab(true);
  render();
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
    '下一条从本列表随机抽，逐级游走；设置里可切「按列表顺序续播」'));
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
  d.tabR.style.display = isVideo ? '' : 'none';
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
    rid: cache.rid
  };
});
