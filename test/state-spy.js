/*
 * state-spy：harness/调试用「状态被谁改了」观察钩子（0.9.65 沉淀）。
 *
 * 背景（实战案例）：0.9.64 抽屉避让"下滑不跟随"——根类 acsv-with-comments 被某条调用链
 * 摘掉，纯读代码推不出写入者（写入路径分散：open/close/resize 三入口同一 syncCommentVars）。
 * 最终靠包装 DOMTokenList.prototype.toggle 记录调用栈抓到 setActive→openComments→
 * overlayOpen 幂等收旧的完整链。本工具把这套打法固化：一行开启，按类名过滤，栈帧限深。
 *
 * 用法（harness.html 已引入，debug 场景内任意时机）：
 *   var stop = __spyState('acsv-with-comments');   // 只盯这个类，返回停止函数
 *   ... 复现操作 ...
 *   console.log(window.__spyLog);                  // [{ op, name, force, stack }]
 *   stop();                                        // 恢复原型，日志保留
 *
 * 设计约束：
 *  - 默认零开销：不开启时原型原样（对比方案「常开 MutationObserver」会拖慢全部场景且
 *    宿主页 AcFun 自己的类操作刷屏）；
 *  - 只包装 DOMTokenList 三方法（add/remove/toggle），命中 watch 名才记录；
 *  - 栈帧截前 4 帧（esbuild 产物单行栈，足够定位到源码函数名）。
 */
(function () {
  var proto = DOMTokenList.prototype;
  var orig = { add: proto.add, remove: proto.remove, toggle: proto.toggle };
  var watching = null; // null=未开启；字符串=watch 类名
  var log = [];

  function record(op, name, force) {
    if (watching === null || name !== watching) return;
    log.push({
      op: op,
      name: name,
      force: force === undefined ? null : !!force,
      stack: String(new Error().stack || "").split("\n").slice(2, 6).join(" <= ")
    });
  }

  proto.add = function () {
    for (var i = 0; i < arguments.length; i++) record("add", arguments[i]);
    return orig.add.apply(this, arguments);
  };
  proto.remove = function () {
    for (var i = 0; i < arguments.length; i++) record("remove", arguments[i]);
    return orig.remove.apply(this, arguments);
  };
  proto.toggle = function (name, force) {
    record("toggle", name, force);
    return orig.toggle.apply(this, arguments);
  };

  window.__spyState = function (watchClassName) {
    watching = watchClassName || null;
    log = [];
    return function stop() { watching = null; };
  };
  Object.defineProperty(window, "__spyLog", { get: function () { return log; } });
})();
