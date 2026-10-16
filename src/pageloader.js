// ---------- 翻页骨架单源（0.9.259；审计批④ P2-5） ----------
// 四份「加载下一页」此前是逐字副本（followview.load / squarefeed.load / mypage 观看历史 /
// mypage adminTab 动态档壳）。本件只收**四家相同的协议**，不收翻页范式——游标方言（毫秒
// 时间戳 / 页码 / 偏移量）、传输、解析、到底判定、空态文案全留在消费点：
//   ① 在途守卫（loading）：滚动一拍可派发多枚触底事件，不得叠发同页请求
//   ② 代数令牌 seq + host().isConnected：陈旧（换档/刷新已 ++seq）或视图已拆的回包丢弃
//   ③ 骨架两路都收：成功/失败都调 teardown（漏一路骨架常驻；0.9.66 同构元素污染计数是
//      既有教训，故骨架类名与行/卡计数选择器刻意不同构）
//   ④ 三态状态行：续拉打 loadingLabel、到底打 doneLabel、失败按 host 已有子节点二选一
//      （列表为空时没有可依的滚动，状态行点击是唯一出口）
//   ⑤ 落定：把回包交给 onPage（解析/追加/插空态），由它回 { cursor, noMore }
//
// 消费点注入（o）：
//   fetch(cursor)          取数（传输收口在各 *api.js；返回 Promise）
//   onPage(res, info)      解析/追加/空态；info = { firstPage, cursor }；返回 { cursor?, noMore? }
//   host()                 在途判据宿主（读 .isConnected / .children；四家都是列表容器）
//   setStatus(text, busy?) 状态行写口（listtail.setStatus）
//   skeleton(firstPage)    骨架：返回 teardown 函数或 null。**建不建由消费点定**——历史档
//                          每页都建（首屏 12 张卡也是它），故本件不按 firstPage 过滤，只把
//                          firstPage 传进去让消费点自己判
//   doneLabel/failLabel/loadingLabel  三态文案（failLabel = host 为空时的那一支）
//   firstCursor            首页游标（缺省 ''）
//   beforeFetch()          取数前钩子；返回 false = 本次不发（状态行由消费点自理）
//   busyGate()             是否打续拉状态行（缺省 = 非首屏；动态档传「已有条目」判定——
//                          「首屏 0 行且未到底」时两者不等价）
//   onSettle(ok)           两路落定后回话（列表会话续拉的 flush 缝）
//   earlySettle: true      在途标志/骨架在**陈旧守卫之前**结算（历史档 0.9.236 的既有形状；
//                          其余三家在守卫之后——动态档的换档刷新会 ++seq，守卫前清 loading
//                          会让迟到回包把在途标志放开、叠发一发）
// 返回 { load, reset, done }：load 翻一页（在途/到底时 No-op，可直接作 listtail 的
// onBottom/onRetry）；reset 复位（seq++/在途清/到底清/回首屏游标——刷新与换档复用原
// refresh/select 里的那几行）；done 读当前到底态（层内续拉的 isDone 缝）。
export function createPageLoader(o) {
  var firstCursor = o.firstCursor === undefined ? '' : o.firstCursor;
  var loadingLabel = o.loadingLabel || '加载中…';
  var doneLabel = o.doneLabel || '已加载全部';
  var failLabel = o.failLabel || '加载失败，点击重试';
  var cursor = firstCursor;
  var loading = false;
  var noMore = false;
  var firstPage = true;
  var seq = 0;

  function load() {
    if (loading || noMore) return;
    if (o.beforeFetch && o.beforeFetch() === false) return;
    loading = true;
    var my = ++seq;
    var sk = o.skeleton ? o.skeleton(firstPage) : null;
    if (o.busyGate ? o.busyGate() : !firstPage) o.setStatus(loadingLabel, true);
    o.fetch(cursor).then(function (res) {
      if (o.earlySettle) loading = false;
      if (sk) sk();
      var box = o.host();
      if (my !== seq || !box.isConnected) return; // 视图已拆/已换档：在途回包丢弃
      var r = o.onPage(res, { firstPage: firstPage, cursor: cursor }) || {};
      if (r.cursor !== undefined) cursor = r.cursor;
      noMore = !!r.noMore;
      firstPage = false;
      o.setStatus(noMore ? doneLabel : '');
      if (!o.earlySettle) loading = false;
      if (o.onSettle) o.onSettle(true);
    }, function () {
      if (o.earlySettle) loading = false;
      if (sk) sk();
      var box = o.host();
      if (my !== seq || !box.isConnected) return;
      // 失败不置到底：下次触底自动重试；列表为空时点击状态行是唯一出口
      o.setStatus(box.children.length ? '加载失败，滚动重试' : failLabel);
      loading = false;
      if (o.onSettle) o.onSettle(false);
    });
  }

  function reset() {
    seq++;
    loading = false;
    noMore = false;
    firstPage = true;
    cursor = firstCursor;
  }

  return {
    load: load,
    reset: reset,
    done: function () { return noMore; }
  };
}
