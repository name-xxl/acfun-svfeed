// @ts-check
// ---------- 监听器生命周期作用域（0.9.264） ----------
// 只收 `window`/`document` 级、且**随挂载/会话生灭**的监听：挂载时 scope.on(...)，teardown 时
// scope.dispose() 一次摘净。页面级单例监听（boot 的 hashchange、dbg 的 error、input 的手势
// 捕获等）不进本件——它们活到页面结束，由 `test/check-listeners.mjs` 的同位
// `// singleton-listener: <理由>` 标记放行。
//
// 为什么不是全局注册表：全局 dispose 会把别的模块的监听一起摘掉；作用域按宿主隔离才安全。
// 零依赖叶（不 import 任何模块），供播放/视图/面板各自持有。

/**
 * @typedef {{ target: EventTarget, type: string, fn: EventListener, opts?: boolean | AddEventListenerOptions }} ListenerEntry
 */

/**
 * 创建一个监听器作用域。`on` 登记并立即挂载，`dispose` 逆序摘除（幂等）。
 * @returns {{ on: (target: EventTarget, type: string, fn: EventListener, opts?: boolean | AddEventListenerOptions) => EventListener, dispose: () => void, size: () => number }}
 */
export function createScope() {
  /** @type {ListenerEntry[]} */
  var entries = [];
  return {
    on: function (target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      entries.push({ target: target, type: type, fn: fn, opts: opts });
      return fn;
    },
    dispose: function () {
      for (var i = entries.length - 1; i >= 0; i--) {
        var e = entries[i];
        try { e.target.removeEventListener(e.type, e.fn, e.opts); } catch (err) { /* best-effort: cleanup */ }
      }
      entries.length = 0;
    },
    size: function () { return entries.length; }
  };
}
