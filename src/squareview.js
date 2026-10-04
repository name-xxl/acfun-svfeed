// ---------- 广场视图（0.9.126，吸收动态广场）：全站最新动态单列流 ----------
// 数据源=feedSquare（免登录，§2.7 实测）——与关注·全部页的差异全在「方言」：游标首页不传
// （续翻用响应的 `时间戳:时间戳`）、**24h 窗口**（契约层 squarePageOf 收口：只出发布 ≤24h
// 且超窗即终页——广场的原味）、互动态免登录恒 false（S3 起对 ≤3h 新鲜条目走 moment/detail
// 补偿）。行卡/列表委托/行内评论全复用 rowkit（与 followview 同源零漂移）。
// 列表壳五条不变量（append-only/失败不置到底/三态状态行/整页 0 新增判到底/代数丢弃）与
// followview 同款——「关注·全部」当初借鉴广场 controller.js，现在闭环回广场页。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { momentPiOfRepost } from './data.js';
import { setMomentOpener, skeletonRows } from './cards.js';
import { ICONS } from './styles.js';
import { listSquare } from './momentapi.js';
import { registerView } from './viewreg.js';
import { openMomentDetail } from './momentdetail.js';
import { ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { closeInlineComments, feedRowOf, armExpanders, wireRowList } from './rowkit.js';

// 行落点（广场条目全是动态，契约层保证）：点行=开详情面板；行内评论区先关防双宿主互踩
//（followview 同款处置）；非动态分支纯防御（理论不出现）
function rowDefault(pi) {
  if (pi.ct === 'moment') {
    closeInlineComments();
    openMomentDetail(pi);
  } else if (pi.href) window.open(pi.href, '_blank');
}

function buildSquareView(body) {
  var wrap = el('div', 'acsv-sqwrap');
  body.appendChild(wrap);
  var list = el('div', 'acsv-frows'); // 行容器沿用通用类（外层容器/骨架才是广场独立类名）
  wrap.appendChild(list);
  // 三态状态行（与 followview 同款视觉；**点击重试显式接线**——广场首屏失败列表为空，
  // 没有滚动可依时点击是唯一出口）
  var status = el('div', 'acsv-fstatus');
  wrap.appendChild(status);
  var backTop = el('button', 'acsv-tbtn acsv-fbacktop');
  backTop.innerHTML = ICONS.chevUp;
  backTop.title = '回到顶部';
  body.appendChild(backTop);

  var pcursor = '';   // 广场游标：首页**不传**（免登录实测惯例）；续翻用响应的 `时间戳:时间戳`
  var seq = 0;        // 在途回包令牌：视图已拆/重建时旧回包丢弃
  var loading = false;
  var noMore = false;
  var firstPage = true;
  var seenKeys = null; // 去重键集（momentId）：整页 0 新增 → 判到底（广场安全阀）

  function skeleton(listEl) {
    return skeletonRows(listEl, CFG.view.square.skel, 'acsv-sqskel');
  }

  function setStatus(text, busy) {
    status.textContent = text || '';
    status.classList.toggle('busy', !!busy);
  }

  function load() {
    if (loading || noMore) return;
    loading = true;
    var my = ++seq;
    var sk = firstPage ? skeleton(list) : null;
    if (!firstPage) setStatus('加载中…', true);
    listSquare(pcursor) // 传输收口 momentapi；规整/24h 窗口/失败可辨收口契约层 squarePageOf
      .then(function (page) {
        if (sk) sk();
        if (my !== seq || !list.isConnected) return; // 视图已拆/重建：在途回包丢弃
        var fresh = 0;
        if (!seenKeys) seenKeys = new Set();
        page.items.forEach(function (pi) {
          var key = pi.momentId;
          if (key && seenKeys.has(key)) return;
          if (key) seenKeys.add(key);
          fresh++;
          // append-only：新行只追加尾部（展开态/原位评论区靠它保命）
          list.appendChild(feedRowOf(pi));
        });
        // 到底判定：契约层已把「no_more/空页/超 24h 窗口」收口进 page.noMore；此处只补
        // 「整页 0 新增」安全阀（去重后无新增=后端游标未推进）
        noMore = page.noMore || (fresh === 0 && page.items.length > 0);
        pcursor = page.nextCursor;
        armExpanders(list);
        if (firstPage && !list.children.length && noMore) {
          list.appendChild(el('div', 'acsv-vempty', '广场暂时没有新动态'));
        }
        firstPage = false;
        setStatus(noMore ? '已加载全部动态' : '');
        loading = false;
      }, function () {
        if (sk) sk();
        if (my !== seq || !list.isConnected) return;
        // 失败不置到底：下次触底自动重试；首屏失败列表为空，点击是唯一出口
        setStatus(list.children.length ? '加载失败，滚动重试' : '加载失败，点击重试');
        loading = false;
      });
  }

  wireRowList(list, rowDefault); // 列表级委托（rowkit 共享；落点=本视图 rowDefault）

  // 表情 map 预热 + 占位回填（与 followview 同款）：列表渲染不等 map，先出占位灰字
  ensureEmotionMap().then(function () {
    if (list.isConnected) refillEmoticons(list);
  }, function () { });

  // 无限滚动（滚动容器=.acsv-view-body 即本 body；与广场原版「window 滚动」的差异点）
  body.addEventListener('scroll', function () {
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - CFG.view.square.scrollPad) load();
    backTop.classList.toggle('on', body.scrollTop > CFG.view.square.backTopAt);
  }, { passive: true });
  backTop.addEventListener('click', function () {
    body.scrollTo({ top: 0, behavior: 'smooth' });
  });
  status.addEventListener('click', function () { load(); }); // 失败重试出口（loading/noMore 下 load 自 No-op）

  load();
}

// 动态详情出口注册（0.9.126）：与 followview 注册同一闭包——setMomentOpener 是单槽注入，
// 两视图内容相同、覆盖无害（引用卡源动态落点在两视图一致）
setMomentOpener(function (rp) { openMomentDetail(momentPiOfRepost(rp)); });

// 左栏 dock 元数据随视图声明（0.9.78）：order 15 = 排「榜单（10）」下面、与推荐/榜单同段
registerView({
  id: 'square', build: buildSquareView,
  teardown: closeInlineComments, // 离开视图把行内评论区宿主复位（同 followview）
  dock: {
    label: '广场', order: 15, group: 0,
    svg: '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>'
  }
});
