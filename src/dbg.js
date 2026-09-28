// ---------- 调试埋点 ----------
// 仅 debug 构建生效：__ACSV_DEBUG__ 由构建脚本 define 注入（正式构建为 false，整段被死码消除）。
// stats/hooks 容器在模块级创建：feedstore 等模块的 testHook 注册发生在模块求值期，
// 早于 boot.js 的 dbgInit()，先排队待挂。
// W：TM grant 模式下脚本跑在隔离 world，挂在 window 上的调试对象页面控制台看不见
// （harness 页内加载同 world 才碰巧可见）——必须落 unsafeWindow 才能在 DevTools 里读；
// 无 TM 环境无 unsafeWindow，退回 window
var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
var stats = {};
var hooks = {};
var pendingHooks = [];

export function dbgInit() {
  if (!__ACSV_DEBUG__) return;
  W.__dbg = ['iife-start'];
  window.addEventListener('error', function (e) {
    // 无 message 的 error 是资源加载失败（video/img 404 等），不是脚本错误，不计入
    if (!e.message && e.target) return;
    W.__dbg.push('ERR: ' + (e.message || 'unknown') + ' @' + (e.lineno || '?'));
  }, true);
  W.__ACSV_TEST__ = {
    getStats: function () { return JSON.parse(JSON.stringify(stats)); },
    stat: function (k, d) { stats[k] = (stats[k] || 0) + (d == null ? 1 : d); },
    set: function (k, v) { stats[k] = v; },
    // call('feed') 之类：调用模块注册的测试钩子
    call: function (name) {
      var fn = hooks[name];
      return fn ? fn.apply(null, Array.prototype.slice.call(arguments, 1)) : undefined;
    }
  };
  for (var i = 0; i < pendingHooks.length; i++) hooks[pendingHooks[i][0]] = pendingHooks[i][1];
  pendingHooks.length = 0;
  // 二重保险：unsafeWindow 属性赋值在部分 TM/浏览器组合下不跨 world（实测 0.9.8 失灵），
  // 再把 stats/启动埋点镜像进 localStorage（同源两 world 共享同步读写，页面控制台必可读）。
  // 读取：JSON.parse(localStorage.getItem('acsv-stats'))，1s 内刷新
  setInterval(function () {
    try {
      localStorage.setItem('acsv-stats', JSON.stringify({
        t: Date.now(),
        stats: stats,
        dbg: (W.__dbg || []).slice(-60)
      }));
    } catch (e) { }
  }, 1000);
}

function noop() { }

export var dbg = __ACSV_DEBUG__
  ? function (label) { (W.__dbg = W.__dbg || []).push(label); }
  : noop;

// 结构化计数（harness 断言用）：stat('stall.frozen')、stat('prewarm', 2)
export var stat = __ACSV_DEBUG__
  ? function (k, d) { stats[k] = (stats[k] || 0) + (d == null ? 1 : d); }
  : noop;

// 覆写型打点（周期结算的均值/快照用）：set('dm.paintMs', 1.23)
export var set = __ACSV_DEBUG__
  ? function (k, v) { stats[k] = v; }
  : noop;

// 模块 → harness 的测试钩子（如 feedstore 快照、后续的 forceStall 模拟缝）
export var testHook = __ACSV_DEBUG__
  ? function (name, fn) {
    if (window.__ACSV_TEST__) hooks[name] = fn;
    else pendingHooks.push([name, fn]);
  }
  : noop;
