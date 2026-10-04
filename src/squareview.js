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
import { listSquare, momentDetail } from './momentapi.js';
import { registerView } from './viewreg.js';
import { openMomentDetail } from './momentdetail.js';
import { ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { nextBadgeInterval } from './followbadge.js'; // 退避序列单源（纯函数，单测在册）
import { syncRowBar } from './momentbar.js'; // 回填后互动栏同步（0.9.127）
import { testHook } from './dbg.js';
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
  // 发现态提示（0.9.127）：列表顶部——有新动态时显形，点击重拉第一页并整列重建（plaza 原
  // 语义；重建代价=展开态/行内评论区丢弃，属已知取舍）
  var upStatus = el('div', 'acsv-fstatus acsv-sup');
  upStatus.style.display = 'none';
  wrap.appendChild(upStatus);
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
  var latestAmId = 0;  // 发现态 diff 基准（最大 momentId；单调）

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
          if (key && key > latestAmId) latestAmId = key; // 发现态 diff 基准（单调）
          fresh++;
          // append-only：新行只追加尾部（展开态/原位评论区靠它保命）
          list.appendChild(feedRowOf(pi));
        });
        // 到底判定：契约层已把「no_more/空页/超 24h 窗口」收口进 page.noMore；此处只补
        // 「整页 0 新增」安全阀（去重后无新增=后端游标未推进）
        noMore = page.noMore || (fresh === 0 && page.items.length > 0);
        pcursor = page.nextCursor;
        armExpanders(list);
        (page.freshIds || []).forEach(refreshOne); // 新鲜度回填（≤3h 条目，后台静默）
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

  // ---------- 新鲜度回填（0.9.127；plaza _refreshOneMoment 的收窄版） ----------
  // 免登录列表的 isLike/isThrowBanana 恒 false；≤3h 新鲜条目走 moment/detail 补真值（携带
  // 登录态），patch 回 pi 并同步互动栏。只同步互动态五件（正文方言不换——[ac=] 已由 ubb.js
  // 单源渲染）；失败/行已拆静默（保持列表快照，与 plaza 后台静默纪律一致）
  function refreshOne(mid) {
    momentDetail(mid).then(function (st) {
      if (!st) return;
      var rows = list.querySelectorAll('.acsv-frow');
      for (var i = 0; i < rows.length; i++) {
        var pi = rows[i]._pi;
        if (pi && pi.momentId === mid) {
          pi.liked = st.liked;
          pi.thrown = st.thrown;
          pi.like = st.like;
          pi.banana = st.banana;
          pi.comment = st.comment;
          syncRowBar(rows[i], pi);
          return;
        }
      }
    }, function () { });
  }

  // ---------- 发现态轮询（0.9.127；plaza background 语义收窄到视图生命周期） ----------
  // 仅在广场视图打开时运转（build 启 / teardown 停——不学 plaza 在任意 /member 页常驻）；
  // 骨架=followbadge 同款：固定 tick + nextAt 闸门 + 代数丢弃陈旧回包 + hidden 短路；退避
  // 逐次翻倍（nextBadgeInterval 显式注入 square 档）。diff=最大 momentId：有新 → 顶部提示条；
  // 点击=重拉第一页并整列重建（plaza 原语义）
  var pollTimer = null, pollClock = 0, pollInterval = 0, pollGen = 0;
  function pollTick() {
    if (document.hidden) return;             // 后台标签不打扰
    if (Date.now() < pollClock) return;      // 固定节拍里的闸门
    if (!list.isConnected) return;
    var my = ++pollGen;
    listSquare('').then(function (page) {
      if (my !== pollGen || !list.isConnected) return; // 陈旧回包/视图已拆：丢弃
      var newest = 0, n = 0;
      page.items.forEach(function (pi) {
        if (pi.momentId > newest) newest = pi.momentId;
        if (pi.momentId > latestAmId) n++;
      });
      if (newest > latestAmId && latestAmId > 0) { // 首拉只建基准（防把存量误报为新）
        latestAmId = newest; // 基准推进：后续只数更新的（plaza 同款）
        upStatus.textContent = '↑发现 ' + n + ' 条新动态，点击刷新';
        upStatus.style.display = '';
      }
      pollInterval = nextBadgeInterval(pollInterval, n > 0, CFG.square.pollStart, CFG.square.pollMax);
      pollClock = Date.now() + pollInterval;
    }, function () {
      if (my !== pollGen) return;
      pollInterval = nextBadgeInterval(pollInterval, false, CFG.square.pollStart, CFG.square.pollMax); // 失败按空手退避：别锤接口
      pollClock = Date.now() + pollInterval;
    });
  }
  pollTimer = setInterval(pollTick, CFG.square.tick);
  stopPollFn = function () {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    pollGen++;
  };

  // 点击刷新：重拉第一页并整列重建（plaza 原语义）——展开态/行内评论区随重建丢弃（已知代价）
  upStatus.addEventListener('click', function () {
    upStatus.style.display = 'none';
    upStatus.textContent = '';
    closeInlineComments();
    list.textContent = '';
    seq++;              // 作废在途回包
    loading = false;
    noMore = false;
    firstPage = true;
    seenKeys = null;
    pcursor = '';
    latestAmId = 0;     // 重建基准（下一次轮询重新建立）
    pollInterval = 0;
    pollClock = 0;
    load();
  });

  // debug 探针（0.9.127）：harness 直调一次轮询（真实间隔 60s 起步，场景等不起）
  squareProbe = {
    run: function () { pollClock = 0; pollTick(); },
    latest: function () { return latestAmId; }
  };

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

// 发现态轮询的视图句柄（模块级：视图单例存活，build 写 teardown 清）
var stopPollFn = null;
var squareProbe = null;

// debug 构建测试钩子（0.9.127）：harness 直调一次发现态轮询并读基准
testHook('squarePoll', function () {
  if (!squareProbe) return null;
  squareProbe.run();
  return { latest: squareProbe.latest() };
});

// 视图卸载（0.9.127）：停发现态轮询 + 行内评论区宿主复位（容器随 DOM 拆，残留 host 引用
// 会读到死节点——followview 同款处置）
function squareTeardown() {
  if (stopPollFn) { stopPollFn(); stopPollFn = null; }
  squareProbe = null;
  closeInlineComments();
}

// 左栏 dock 元数据随视图声明（0.9.78）：order 15 = 排「榜单（10）」下面、与推荐/榜单同段
registerView({
  id: 'square', build: buildSquareView,
  teardown: squareTeardown,
  dock: {
    label: '广场', order: 15, group: 0,
    svg: '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>'
  }
});
