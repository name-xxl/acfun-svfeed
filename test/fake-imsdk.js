// harness 私信 SDK 假件（0.9.257 audit 用例专用，不进产物）：imsend.loadImSdk 的 directLoad
// 分支按 globalConfig.imsdkcdn 注入本文件 ⇒ window.ImSdk 由此定义，ensureIm() 构造出的就是
// 下面的假实例。语义照真件：**构造即单例**（同页永远返回同一个实例、永不释放）——这正是
// 「监听不摘就跨挂载累积」的土壤。on/off/getSessions 全部记账，供 harness 断言。
(function () {
  var listeners = {};   // ev → [fn]（on 登记、off 摘除）
  var sessions = 0;     // kernel.getSessions 被读次数
  var inst = null;

  function FakeImSdk() {
    if (inst) return inst; // 单例：真件由 SDK 内部保证，这里显式复刻
    inst = {
      connected: true,             // imbadge.tick 的 connected 守卫
      kernel: {
        isConnected: true,
        getSessions: function () {
          sessions++;
          return [{ unreadCount: 3 }, { unreadCount: 4 }];
        }
      },
      on: function (ev, fn) {
        (listeners[ev] = listeners[ev] || []).push(fn);
        return inst;
      },
      off: function (ev, fn) {
        var arr = listeners[ev] || [];
        var i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
        return inst;
      }
    };
    return inst;
  }
  window.ImSdk = FakeImSdk;
  // 读数面（用例经 window.__ACSV_IM_FAKE__ 断言）
  window.__ACSV_IM_FAKE__ = {
    live: function () {
      var n = 0;
      Object.keys(listeners).forEach(function (k) { n += listeners[k].length; });
      return n;
    },
    sessions: function () { return sessions; },
    // 派发一次事件：返回**实际被调用**的监听数（陈旧监听未摘时这里会 > 1）
    emit: function (ev) {
      var arr = (listeners[ev] || []).slice();
      arr.forEach(function (f) { try { f(); } catch (e) { } });
      return arr.length;
    }
  };
})();
