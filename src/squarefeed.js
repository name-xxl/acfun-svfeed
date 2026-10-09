// ---------- 广场流列表机械（0.9.128 自 squareview.js 抽出：宿主无关工厂） ----------
// 消费方两处：squareview（svfeed 深色广场页，滚动源=.acsv-view-body）与 memberplaza
// （原生 /member/feeds 内嵌浅色皮肤，滚动源=window）。抽取纪律=逐一搬运零逻辑改动（同
// rowkit 0.9.124 红线）：五条不变量（append-only/失败不置到底/三态状态行/整页 0 新增判到底/
// 代数丢弃）、24h 窗口（squarePageOf 收口，0.9.159 起在 momentapi：只出发布 ≤24h 且超窗即终页）、发现态轮询
//（生命周期=实例存活期，plaza 常驻语义的收窄在案）、新鲜度回填（momentDetail+syncRowBar）
// 全部原样；view-square 场景全绿=零漂移机器证据。
// 宿主注入：root（sup/列表/状态行落点）/ scrollEl（元素或 window）/ backTopHost（默认 root）/
// onOpen（行默认动作——视图=开详情面板、内嵌=不动作原页语义）/ onRow（行后处理，内嵌补 am 锚）。
// 返回句柄 { stop, refresh, probe }：stop 清轮询并解绑滚动（window 滚动必须显式解绑）。
// **数据源/文案可注入（0.9.218）**：本工厂原为广场专用（硬接 listSquare + 广场空态文案 + 强制
// 发现态轮询）；个人动态流（我的页/空间页两宿主）复用同一套机械，故抽出三项 opts——
//   fetchPage(pcursor)  取数（默认 listSquare；profile 流传 momentapi.listProfile 的绑定）
//   emptyText           空态文案（默认广场原文案；profile 两宿主按宿主分派「你/TA 还没…」）
//   poll:false          不建发现态轮询（空间页看的是别人，无需定时 diff）
//   view                阈值组（默认 CFG.view.square；profile 传 CFG.view.moments——**无 24h 窗口**）
// **默认值＝改造前行为**，零漂移证据=view-square 与 member-plaza 场景全绿。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { skeletonRows } from './cards.js';
import { ICONS } from './styles.js';
import { listSquare, momentDetail } from './momentapi.js';
import { ensureEmotionMap, refillEmoticons } from './emoticon.js';
import { nextBadgeInterval } from './followbadge.js'; // 退避序列单源（纯函数，单测在册）
import { syncRowBar } from './momentbar.js'; // 回填后互动栏同步（0.9.127）
import { closeInlineComments, feedRowOf, armExpanders, wireRowList } from './rowkit.js';

function noop() { }

export function createSquareFeed(opts) {
  var root = opts.root;
  var winScroll = opts.scrollEl === window; // 滚动源方言：window（原生页内嵌）/ 元素（视图体）
  var onOpen = opts.onOpen || noop;
  var onRow = opts.onRow;
  var fetchPage = opts.fetchPage || listSquare; // 取数可注入（默认广场流）
  var view = opts.view || CFG.view.square;      // 阈值/骨架组可注入（默认广场档）
  var emptyText = opts.emptyText || '广场暂时没有新动态';
  var usePoll = opts.poll !== false;            // 发现态轮询（默认开；profile 宿主关）

  // 发现态提示（0.9.127）：列表顶部——有新动态时显形，点击重拉第一页并整列重建（plaza 原
  // 语义；重建代价=展开态/行内评论区丢弃，属已知取舍）
  var upStatus = el('div', 'acsv-fstatus acsv-sup');
  upStatus.style.display = 'none';
  root.appendChild(upStatus);
  var list = el('div', 'acsv-frows'); // 行容器沿用通用类（外层容器/骨架才是广场独立类名）
  root.appendChild(list);
  // 三态状态行（与 followview 同款视觉；**点击重试显式接线**——广场首屏失败列表为空，
  // 没有滚动可依时点击是唯一出口）
  var status = el('div', 'acsv-fstatus');
  root.appendChild(status);
  var backTop = el('button', 'acsv-tbtn acsv-backtop');
  backTop.innerHTML = ICONS.chevUp;
  backTop.title = '回到顶部';
  (opts.backTopHost || root).appendChild(backTop);

  var pcursor = '';   // 广场游标：首页**不传**（免登录实测惯例）；续翻用响应的 `时间戳:时间戳`
  var seq = 0;        // 在途回包令牌：实例停用/重建时旧回包丢弃
  var loading = false;
  var noMore = false;
  var firstPage = true;
  var seenKeys = null; // 去重键集（momentId）：整页 0 新增 → 判到底（广场安全阀）
  var latestAmId = 0;  // 发现态 diff 基准（最大 momentId；单调）

  function skeleton() {
    return skeletonRows(list, view.skel, 'acsv-sqskel');
  }

  function setStatus(text, busy) {
    status.textContent = text || '';
    status.classList.toggle('busy', !!busy);
  }

  function load() {
    if (loading || noMore) return;
    loading = true;
    var my = ++seq;
    var sk = firstPage ? skeleton() : null;
    if (!firstPage) setStatus('加载中…', true);
    fetchPage(pcursor) // 传输/规整/窗口/失败可辨收口 momentapi（squarePageOf / profilePageOf）
      .then(function (page) {
        if (sk) sk();
        if (my !== seq || !list.isConnected) return; // 实例已停/拆：在途回包丢弃
        var fresh = 0;
        if (!seenKeys) seenKeys = new Set();
        page.items.forEach(function (pi) {
          var key = pi.momentId;
          if (key && seenKeys.has(key)) return;
          if (key) seenKeys.add(key);
          if (key && key > latestAmId) latestAmId = key; // 发现态 diff 基准（单调）
          fresh++;
          // append-only：新行只追加尾部（展开态/原位评论区靠它保命）
          var row = feedRowOf(pi);
          if (onRow) onRow(row, pi); // 行后处理（内嵌宿主补 am 锚；视图不传）
          list.appendChild(row);
        });
        // 到底判定：契约层已把「no_more/空页/超 24h 窗口」收口进 page.noMore；此处只补
        // 「整页 0 新增」安全阀（去重后无新增=后端游标未推进）
        noMore = page.noMore || (fresh === 0 && page.items.length > 0);
        pcursor = page.nextCursor;
        armExpanders(list);
        (page.freshIds || []).forEach(refreshOne); // 新鲜度回填（≤3h 条目，后台静默）
        if (firstPage && !list.children.length && noMore) {
          list.appendChild(el('div', 'acsv-vempty', emptyText));
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

  wireRowList(list, onOpen); // 列表级委托（rowkit 共享；落点=宿主注入）

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

  // ---------- 发现态轮询（0.9.127；plaza background 语义收窄到实例生命周期） ----------
  // 仅在广场展开期间运转（创建启 / stop 停——不学 plaza 在任意 /member 页常驻）；
  // 骨架=followbadge 同款：固定 tick + nextAt 闸门 + 代数丢弃陈旧回包 + hidden 短路；退避
  // 逐次翻倍（nextBadgeInterval 显式注入 square 档）。diff=最大 momentId：有新 → 顶部提示条；
  // 点击=重拉第一页并整列重建（plaza 原语义）
  var pollTimer = null, pollClock = 0, pollInterval = 0, pollGen = 0;
  function pollTick() {
    if (document.hidden) return;             // 后台标签不打扰
    if (Date.now() < pollClock) return;      // 固定节拍里的闸门
    if (!list.isConnected) return;
    var my = ++pollGen;
    fetchPage('').then(function (page) {
      if (my !== pollGen || !list.isConnected) return; // 陈旧回包/实例已停：丢弃
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
  if (usePoll) pollTimer = setInterval(pollTick, CFG.square.tick);
  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    pollGen++;
  }

  // 点击刷新：重拉第一页并整列重建（plaza 原语义）——展开态/行内评论区随重建丢弃（已知代价）
  function refresh() {
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
  }
  upStatus.addEventListener('click', refresh);

  // 无限滚动（滚动源两方言）与回顶：window（原生页整页滚动，plaza controller 同款）或
  // 元素（视图体）。取值统一后按同一阈值触发/显隐
  function scrollTop() {
    return winScroll ? (window.pageYOffset || document.documentElement.scrollTop || 0) : opts.scrollEl.scrollTop;
  }
  function onScroll() {
    if (winScroll) {
      if (scrollTop() + window.innerHeight >= document.documentElement.scrollHeight - view.scrollPad) load();
    } else if (opts.scrollEl.scrollTop + opts.scrollEl.clientHeight
        >= opts.scrollEl.scrollHeight - view.scrollPad) {
      load();
    }
    backTop.classList.toggle('on', scrollTop() > view.backTopAt);
  }
  opts.scrollEl.addEventListener('scroll', onScroll, { passive: true });
  backTop.addEventListener('click', function () {
    if (winScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    else opts.scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
  status.addEventListener('click', function () { load(); }); // 失败重试出口（loading/noMore 下 load 自 No-op）

  // 表情 map 预热 + 占位回填（与 followview 同款）：列表渲染不等 map，先出占位灰字
  ensureEmotionMap().then(function () {
    if (list.isConnected) refillEmoticons(list);
  }, function () { });

  load();

  return {
    stop: function () {
      stopPoll();
      opts.scrollEl.removeEventListener('scroll', onScroll);
    },
    refresh: refresh,
    // debug 探针（0.9.127）：harness 直调一次轮询（真实间隔 60s 起步，场景等不起）
    probe: {
      run: function () { pollClock = 0; pollTick(); },
      latest: function () { return latestAmId; }
    }
  };
}
