// test/cases/deeplink.js —— harness 场景：深链五态（v/a 标记、裸形态、源压过、未命中）
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- deeplink-sv ----
  C['deeplink-sv'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 深链冒烟（0.9.72）：地址栏 id 跨两个 id 空间（v=meowId 小视频 / a=acId 推荐），
// 且 mount 的 if(root) return 让深链只在冷启动生效。这里钉五件事：跨空间解析、
// 置顶落地、源随链接、挂载态就地跳转、失败可见（旧行为是静默重随机一屏）。
// hash 已在 bundle 前写好（见上方 DEEP_HASH），所以这里走的就是冷启动深链路径
function segOn() { var b = q('.acsv-seg-btn.on'); return b ? b.textContent : ''; }
if (CASE === 'deeplink-miss') {
  // 两个 id 空间都查不到：必须错误盒 + 缓冲为空（旧行为=静默 fetchMore 随机流）
  rec('miss-errbox', !!(await waitFor(function () { return q('.acsv-errbox'); }, 12000)));
  rec('miss-no-random', (function () {
    var f = feed();
    return !!f && f.items.length === 0;
  })(), 'items=' + (feed() ? feed().items.length : 'no-feed'));
  rec('miss-retry', !!q('.acsv-retry'));
  rec('miss-spinner-gone', !q('.acsv-spinner'));
} else {
  var DEEP_WANT = CASE === 'deeplink-ac' ? '48867212' : '11053531';
  rec('deep-first-item', !!(await waitFor(function () {
    var f = feed();
    return f && f.items[0] && String(f.items[0].id) === DEEP_WANT;
  }, 15000)), 'want=' + DEEP_WANT);
  rec('deep-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  // 简介打通（0.9.194）：douga/info 顶层 description（HTML 含 <br/>）经 foldBr 折行落 item.desc
  //（数据来自本就在发的同一发回包；此前只取了 videoList/计数，没读 description）。仅 ac 深链有桩。
  if (CASE === 'deeplink-ac') {
    rec('deep-desc-folded', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && f.items[0].desc === '第一行简介\n第二行简介';
    }, 8000)), 'desc=' + JSON.stringify((feed().items[0] || {}).desc));
  }
  // 源随链接走：a → 推荐 / v → 小视频（deeplink-switch 的源记忆故意留 home，必须被压过）
  rec('deep-source', segOn() === (CASE === 'deeplink-ac' ? '推荐' : '小视频'), 'seg=' + segOn());
  // 地址栏被回写成**标记形态**：以后复制出去的链接零探测零歧义
  rec('deep-hash-marked', !!(await waitFor(function () {
    return new RegExp('^#svfeed/' + (CASE === 'deeplink-ac' ? 'a' : 'v')
      + '/' + DEEP_WANT + '$').test(location.hash);
  }, 6000)), location.hash);
  // 挂载态就地跳转（P2 钉）：地址换成另一条深链 → 跳到那条并真的渲染/起播
  // （目标落在渲染窗口外，靠 scrollToIndex 先挪游标才拿得到 slide——曾经整跳静默失败）
  if (CASE === 'deeplink-sv') {
    var bufBefore = feed().items.length;
    location.hash = 'svfeed/v/10606164'; // feed-sample 第 5 条：已在缓冲里（走原地跳分支）
    rec('warm-jump', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[f.current] && String(f.items[f.current].id) === '10606164';
    }, 10000)));
    rec('warm-jump-keeps-buffer', feed().items.length >= bufBefore,
      'before=' + bufBefore + ' after=' + feed().items.length);
    rec('warm-jump-playing', !!(await waitFor(function () {
      var f = feed();
      // 与 warm-jump 合起来才有效：单看 firstVideoReady(f.current) 在「没跳、还在原位」
      // 时也会绿（游标 0 那条本来就在播），必须连 id 一起钉
      return f && String(f.items[f.current].id) === '10606164' && firstVideoReady(f.current);
    }, 25000)));
    rec('warm-jump-url', /^#svfeed\/v\/10606164$/.test(location.hash), location.hash);
    // 落点不变式（0.9.74）：跳转必须「视口里就是目标那张」——只钉游标/URL/起播会漏掉
    // 落点漂移（旧行为：停在目标上方几条，真机可见而断言全绿：稀疏渲染 + 平滑滚动截断）
    rec('warm-jump-landed', !!(await waitFor(function () {
      var f = feed();
      var s = q('.acsv-scroller');
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      if (!s || !sl) return false;
      var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
      return r.top <= st + 2 && r.top >= st - 2; // 当前条恰好顶在舞台上缘
    }, 8000)), (function () {
      var s = q('.acsv-scroller');
      var f = feed();
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      return s && sl ? 'slideTop=' + Math.round(sl.getBoundingClientRect().top - s.getBoundingClientRect().top) : 'n/a';
    })());
  }
}
  };
  // ---- deeplink-bare ----
  C['deeplink-bare'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 深链冒烟（0.9.72）：地址栏 id 跨两个 id 空间（v=meowId 小视频 / a=acId 推荐），
// 且 mount 的 if(root) return 让深链只在冷启动生效。这里钉五件事：跨空间解析、
// 置顶落地、源随链接、挂载态就地跳转、失败可见（旧行为是静默重随机一屏）。
// hash 已在 bundle 前写好（见上方 DEEP_HASH），所以这里走的就是冷启动深链路径
function segOn() { var b = q('.acsv-seg-btn.on'); return b ? b.textContent : ''; }
if (CASE === 'deeplink-miss') {
  // 两个 id 空间都查不到：必须错误盒 + 缓冲为空（旧行为=静默 fetchMore 随机流）
  rec('miss-errbox', !!(await waitFor(function () { return q('.acsv-errbox'); }, 12000)));
  rec('miss-no-random', (function () {
    var f = feed();
    return !!f && f.items.length === 0;
  })(), 'items=' + (feed() ? feed().items.length : 'no-feed'));
  rec('miss-retry', !!q('.acsv-retry'));
  rec('miss-spinner-gone', !q('.acsv-spinner'));
} else {
  var DEEP_WANT = CASE === 'deeplink-ac' ? '48867212' : '11053531';
  rec('deep-first-item', !!(await waitFor(function () {
    var f = feed();
    return f && f.items[0] && String(f.items[0].id) === DEEP_WANT;
  }, 15000)), 'want=' + DEEP_WANT);
  rec('deep-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  // 简介打通（0.9.194）：douga/info 顶层 description（HTML 含 <br/>）经 foldBr 折行落 item.desc
  //（数据来自本就在发的同一发回包；此前只取了 videoList/计数，没读 description）。仅 ac 深链有桩。
  if (CASE === 'deeplink-ac') {
    rec('deep-desc-folded', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && f.items[0].desc === '第一行简介\n第二行简介';
    }, 8000)), 'desc=' + JSON.stringify((feed().items[0] || {}).desc));
  }
  // 源随链接走：a → 推荐 / v → 小视频（deeplink-switch 的源记忆故意留 home，必须被压过）
  rec('deep-source', segOn() === (CASE === 'deeplink-ac' ? '推荐' : '小视频'), 'seg=' + segOn());
  // 地址栏被回写成**标记形态**：以后复制出去的链接零探测零歧义
  rec('deep-hash-marked', !!(await waitFor(function () {
    return new RegExp('^#svfeed/' + (CASE === 'deeplink-ac' ? 'a' : 'v')
      + '/' + DEEP_WANT + '$').test(location.hash);
  }, 6000)), location.hash);
  // 挂载态就地跳转（P2 钉）：地址换成另一条深链 → 跳到那条并真的渲染/起播
  // （目标落在渲染窗口外，靠 scrollToIndex 先挪游标才拿得到 slide——曾经整跳静默失败）
  if (CASE === 'deeplink-sv') {
    var bufBefore = feed().items.length;
    location.hash = 'svfeed/v/10606164'; // feed-sample 第 5 条：已在缓冲里（走原地跳分支）
    rec('warm-jump', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[f.current] && String(f.items[f.current].id) === '10606164';
    }, 10000)));
    rec('warm-jump-keeps-buffer', feed().items.length >= bufBefore,
      'before=' + bufBefore + ' after=' + feed().items.length);
    rec('warm-jump-playing', !!(await waitFor(function () {
      var f = feed();
      // 与 warm-jump 合起来才有效：单看 firstVideoReady(f.current) 在「没跳、还在原位」
      // 时也会绿（游标 0 那条本来就在播），必须连 id 一起钉
      return f && String(f.items[f.current].id) === '10606164' && firstVideoReady(f.current);
    }, 25000)));
    rec('warm-jump-url', /^#svfeed\/v\/10606164$/.test(location.hash), location.hash);
    // 落点不变式（0.9.74）：跳转必须「视口里就是目标那张」——只钉游标/URL/起播会漏掉
    // 落点漂移（旧行为：停在目标上方几条，真机可见而断言全绿：稀疏渲染 + 平滑滚动截断）
    rec('warm-jump-landed', !!(await waitFor(function () {
      var f = feed();
      var s = q('.acsv-scroller');
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      if (!s || !sl) return false;
      var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
      return r.top <= st + 2 && r.top >= st - 2; // 当前条恰好顶在舞台上缘
    }, 8000)), (function () {
      var s = q('.acsv-scroller');
      var f = feed();
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      return s && sl ? 'slideTop=' + Math.round(sl.getBoundingClientRect().top - s.getBoundingClientRect().top) : 'n/a';
    })());
  }
}
  };
  // ---- deeplink-ac ----
  C['deeplink-ac'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 深链冒烟（0.9.72）：地址栏 id 跨两个 id 空间（v=meowId 小视频 / a=acId 推荐），
// 且 mount 的 if(root) return 让深链只在冷启动生效。这里钉五件事：跨空间解析、
// 置顶落地、源随链接、挂载态就地跳转、失败可见（旧行为是静默重随机一屏）。
// hash 已在 bundle 前写好（见上方 DEEP_HASH），所以这里走的就是冷启动深链路径
function segOn() { var b = q('.acsv-seg-btn.on'); return b ? b.textContent : ''; }
if (CASE === 'deeplink-miss') {
  // 两个 id 空间都查不到：必须错误盒 + 缓冲为空（旧行为=静默 fetchMore 随机流）
  rec('miss-errbox', !!(await waitFor(function () { return q('.acsv-errbox'); }, 12000)));
  rec('miss-no-random', (function () {
    var f = feed();
    return !!f && f.items.length === 0;
  })(), 'items=' + (feed() ? feed().items.length : 'no-feed'));
  rec('miss-retry', !!q('.acsv-retry'));
  rec('miss-spinner-gone', !q('.acsv-spinner'));
} else {
  var DEEP_WANT = CASE === 'deeplink-ac' ? '48867212' : '11053531';
  rec('deep-first-item', !!(await waitFor(function () {
    var f = feed();
    return f && f.items[0] && String(f.items[0].id) === DEEP_WANT;
  }, 15000)), 'want=' + DEEP_WANT);
  rec('deep-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  // 简介打通（0.9.194）：douga/info 顶层 description（HTML 含 <br/>）经 foldBr 折行落 item.desc
  //（数据来自本就在发的同一发回包；此前只取了 videoList/计数，没读 description）。仅 ac 深链有桩。
  if (CASE === 'deeplink-ac') {
    rec('deep-desc-folded', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && f.items[0].desc === '第一行简介\n第二行简介';
    }, 8000)), 'desc=' + JSON.stringify((feed().items[0] || {}).desc));
  }
  // 源随链接走：a → 推荐 / v → 小视频（deeplink-switch 的源记忆故意留 home，必须被压过）
  rec('deep-source', segOn() === (CASE === 'deeplink-ac' ? '推荐' : '小视频'), 'seg=' + segOn());
  // 地址栏被回写成**标记形态**：以后复制出去的链接零探测零歧义
  rec('deep-hash-marked', !!(await waitFor(function () {
    return new RegExp('^#svfeed/' + (CASE === 'deeplink-ac' ? 'a' : 'v')
      + '/' + DEEP_WANT + '$').test(location.hash);
  }, 6000)), location.hash);
  // 挂载态就地跳转（P2 钉）：地址换成另一条深链 → 跳到那条并真的渲染/起播
  // （目标落在渲染窗口外，靠 scrollToIndex 先挪游标才拿得到 slide——曾经整跳静默失败）
  if (CASE === 'deeplink-sv') {
    var bufBefore = feed().items.length;
    location.hash = 'svfeed/v/10606164'; // feed-sample 第 5 条：已在缓冲里（走原地跳分支）
    rec('warm-jump', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[f.current] && String(f.items[f.current].id) === '10606164';
    }, 10000)));
    rec('warm-jump-keeps-buffer', feed().items.length >= bufBefore,
      'before=' + bufBefore + ' after=' + feed().items.length);
    rec('warm-jump-playing', !!(await waitFor(function () {
      var f = feed();
      // 与 warm-jump 合起来才有效：单看 firstVideoReady(f.current) 在「没跳、还在原位」
      // 时也会绿（游标 0 那条本来就在播），必须连 id 一起钉
      return f && String(f.items[f.current].id) === '10606164' && firstVideoReady(f.current);
    }, 25000)));
    rec('warm-jump-url', /^#svfeed\/v\/10606164$/.test(location.hash), location.hash);
    // 落点不变式（0.9.74）：跳转必须「视口里就是目标那张」——只钉游标/URL/起播会漏掉
    // 落点漂移（旧行为：停在目标上方几条，真机可见而断言全绿：稀疏渲染 + 平滑滚动截断）
    rec('warm-jump-landed', !!(await waitFor(function () {
      var f = feed();
      var s = q('.acsv-scroller');
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      if (!s || !sl) return false;
      var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
      return r.top <= st + 2 && r.top >= st - 2; // 当前条恰好顶在舞台上缘
    }, 8000)), (function () {
      var s = q('.acsv-scroller');
      var f = feed();
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      return s && sl ? 'slideTop=' + Math.round(sl.getBoundingClientRect().top - s.getBoundingClientRect().top) : 'n/a';
    })());
  }
}
  };
  // ---- deeplink-switch ----
  C['deeplink-switch'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 深链冒烟（0.9.72）：地址栏 id 跨两个 id 空间（v=meowId 小视频 / a=acId 推荐），
// 且 mount 的 if(root) return 让深链只在冷启动生效。这里钉五件事：跨空间解析、
// 置顶落地、源随链接、挂载态就地跳转、失败可见（旧行为是静默重随机一屏）。
// hash 已在 bundle 前写好（见上方 DEEP_HASH），所以这里走的就是冷启动深链路径
function segOn() { var b = q('.acsv-seg-btn.on'); return b ? b.textContent : ''; }
if (CASE === 'deeplink-miss') {
  // 两个 id 空间都查不到：必须错误盒 + 缓冲为空（旧行为=静默 fetchMore 随机流）
  rec('miss-errbox', !!(await waitFor(function () { return q('.acsv-errbox'); }, 12000)));
  rec('miss-no-random', (function () {
    var f = feed();
    return !!f && f.items.length === 0;
  })(), 'items=' + (feed() ? feed().items.length : 'no-feed'));
  rec('miss-retry', !!q('.acsv-retry'));
  rec('miss-spinner-gone', !q('.acsv-spinner'));
} else {
  var DEEP_WANT = CASE === 'deeplink-ac' ? '48867212' : '11053531';
  rec('deep-first-item', !!(await waitFor(function () {
    var f = feed();
    return f && f.items[0] && String(f.items[0].id) === DEEP_WANT;
  }, 15000)), 'want=' + DEEP_WANT);
  rec('deep-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  // 简介打通（0.9.194）：douga/info 顶层 description（HTML 含 <br/>）经 foldBr 折行落 item.desc
  //（数据来自本就在发的同一发回包；此前只取了 videoList/计数，没读 description）。仅 ac 深链有桩。
  if (CASE === 'deeplink-ac') {
    rec('deep-desc-folded', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && f.items[0].desc === '第一行简介\n第二行简介';
    }, 8000)), 'desc=' + JSON.stringify((feed().items[0] || {}).desc));
  }
  // 源随链接走：a → 推荐 / v → 小视频（deeplink-switch 的源记忆故意留 home，必须被压过）
  rec('deep-source', segOn() === (CASE === 'deeplink-ac' ? '推荐' : '小视频'), 'seg=' + segOn());
  // 地址栏被回写成**标记形态**：以后复制出去的链接零探测零歧义
  rec('deep-hash-marked', !!(await waitFor(function () {
    return new RegExp('^#svfeed/' + (CASE === 'deeplink-ac' ? 'a' : 'v')
      + '/' + DEEP_WANT + '$').test(location.hash);
  }, 6000)), location.hash);
  // 挂载态就地跳转（P2 钉）：地址换成另一条深链 → 跳到那条并真的渲染/起播
  // （目标落在渲染窗口外，靠 scrollToIndex 先挪游标才拿得到 slide——曾经整跳静默失败）
  if (CASE === 'deeplink-sv') {
    var bufBefore = feed().items.length;
    location.hash = 'svfeed/v/10606164'; // feed-sample 第 5 条：已在缓冲里（走原地跳分支）
    rec('warm-jump', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[f.current] && String(f.items[f.current].id) === '10606164';
    }, 10000)));
    rec('warm-jump-keeps-buffer', feed().items.length >= bufBefore,
      'before=' + bufBefore + ' after=' + feed().items.length);
    rec('warm-jump-playing', !!(await waitFor(function () {
      var f = feed();
      // 与 warm-jump 合起来才有效：单看 firstVideoReady(f.current) 在「没跳、还在原位」
      // 时也会绿（游标 0 那条本来就在播），必须连 id 一起钉
      return f && String(f.items[f.current].id) === '10606164' && firstVideoReady(f.current);
    }, 25000)));
    rec('warm-jump-url', /^#svfeed\/v\/10606164$/.test(location.hash), location.hash);
    // 落点不变式（0.9.74）：跳转必须「视口里就是目标那张」——只钉游标/URL/起播会漏掉
    // 落点漂移（旧行为：停在目标上方几条，真机可见而断言全绿：稀疏渲染 + 平滑滚动截断）
    rec('warm-jump-landed', !!(await waitFor(function () {
      var f = feed();
      var s = q('.acsv-scroller');
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      if (!s || !sl) return false;
      var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
      return r.top <= st + 2 && r.top >= st - 2; // 当前条恰好顶在舞台上缘
    }, 8000)), (function () {
      var s = q('.acsv-scroller');
      var f = feed();
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      return s && sl ? 'slideTop=' + Math.round(sl.getBoundingClientRect().top - s.getBoundingClientRect().top) : 'n/a';
    })());
  }
}
  };
  // ---- deeplink-miss ----
  C['deeplink-miss'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 深链冒烟（0.9.72）：地址栏 id 跨两个 id 空间（v=meowId 小视频 / a=acId 推荐），
// 且 mount 的 if(root) return 让深链只在冷启动生效。这里钉五件事：跨空间解析、
// 置顶落地、源随链接、挂载态就地跳转、失败可见（旧行为是静默重随机一屏）。
// hash 已在 bundle 前写好（见上方 DEEP_HASH），所以这里走的就是冷启动深链路径
function segOn() { var b = q('.acsv-seg-btn.on'); return b ? b.textContent : ''; }
if (CASE === 'deeplink-miss') {
  // 两个 id 空间都查不到：必须错误盒 + 缓冲为空（旧行为=静默 fetchMore 随机流）
  rec('miss-errbox', !!(await waitFor(function () { return q('.acsv-errbox'); }, 12000)));
  rec('miss-no-random', (function () {
    var f = feed();
    return !!f && f.items.length === 0;
  })(), 'items=' + (feed() ? feed().items.length : 'no-feed'));
  rec('miss-retry', !!q('.acsv-retry'));
  rec('miss-spinner-gone', !q('.acsv-spinner'));
} else {
  var DEEP_WANT = CASE === 'deeplink-ac' ? '48867212' : '11053531';
  rec('deep-first-item', !!(await waitFor(function () {
    var f = feed();
    return f && f.items[0] && String(f.items[0].id) === DEEP_WANT;
  }, 15000)), 'want=' + DEEP_WANT);
  rec('deep-plays', !!(await waitFor(function () { return firstVideoReady(0); }, 25000)));
  // 简介打通（0.9.194）：douga/info 顶层 description（HTML 含 <br/>）经 foldBr 折行落 item.desc
  //（数据来自本就在发的同一发回包；此前只取了 videoList/计数，没读 description）。仅 ac 深链有桩。
  if (CASE === 'deeplink-ac') {
    rec('deep-desc-folded', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && f.items[0].desc === '第一行简介\n第二行简介';
    }, 8000)), 'desc=' + JSON.stringify((feed().items[0] || {}).desc));
  }
  // 源随链接走：a → 推荐 / v → 小视频（deeplink-switch 的源记忆故意留 home，必须被压过）
  rec('deep-source', segOn() === (CASE === 'deeplink-ac' ? '推荐' : '小视频'), 'seg=' + segOn());
  // 地址栏被回写成**标记形态**：以后复制出去的链接零探测零歧义
  rec('deep-hash-marked', !!(await waitFor(function () {
    return new RegExp('^#svfeed/' + (CASE === 'deeplink-ac' ? 'a' : 'v')
      + '/' + DEEP_WANT + '$').test(location.hash);
  }, 6000)), location.hash);
  // 挂载态就地跳转（P2 钉）：地址换成另一条深链 → 跳到那条并真的渲染/起播
  // （目标落在渲染窗口外，靠 scrollToIndex 先挪游标才拿得到 slide——曾经整跳静默失败）
  if (CASE === 'deeplink-sv') {
    var bufBefore = feed().items.length;
    location.hash = 'svfeed/v/10606164'; // feed-sample 第 5 条：已在缓冲里（走原地跳分支）
    rec('warm-jump', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[f.current] && String(f.items[f.current].id) === '10606164';
    }, 10000)));
    rec('warm-jump-keeps-buffer', feed().items.length >= bufBefore,
      'before=' + bufBefore + ' after=' + feed().items.length);
    rec('warm-jump-playing', !!(await waitFor(function () {
      var f = feed();
      // 与 warm-jump 合起来才有效：单看 firstVideoReady(f.current) 在「没跳、还在原位」
      // 时也会绿（游标 0 那条本来就在播），必须连 id 一起钉
      return f && String(f.items[f.current].id) === '10606164' && firstVideoReady(f.current);
    }, 25000)));
    rec('warm-jump-url', /^#svfeed\/v\/10606164$/.test(location.hash), location.hash);
    // 落点不变式（0.9.74）：跳转必须「视口里就是目标那张」——只钉游标/URL/起播会漏掉
    // 落点漂移（旧行为：停在目标上方几条，真机可见而断言全绿：稀疏渲染 + 平滑滚动截断）
    rec('warm-jump-landed', !!(await waitFor(function () {
      var f = feed();
      var s = q('.acsv-scroller');
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      if (!s || !sl) return false;
      var st = s.getBoundingClientRect().top, r = sl.getBoundingClientRect();
      return r.top <= st + 2 && r.top >= st - 2; // 当前条恰好顶在舞台上缘
    }, 8000)), (function () {
      var s = q('.acsv-scroller');
      var f = feed();
      var sl = f && document.querySelector('.acsv-slide[data-idx="' + f.current + '"]');
      return s && sl ? 'slideTop=' + Math.round(sl.getBoundingClientRect().top - s.getBoundingClientRect().top) : 'n/a';
    })());
  }
}
  };
})();
