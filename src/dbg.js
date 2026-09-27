// ---------- 调试埋点 ----------
// 仅 debug 构建生效：__ACSV_DEBUG__ 由构建脚本 define 注入（正式构建为 false，整段被死码消除）。
export function dbgInit() {
  if (!__ACSV_DEBUG__) return;
  window.__dbg = ['iife-start'];
  window.addEventListener('error', function (e) { window.__dbg.push('ERR: ' + (e.message || 'unknown') + ' @' + (e.lineno || '?')); }, true);
}

export function dbg(label) {
  if (!__ACSV_DEBUG__) return;
  (window.__dbg = window.__dbg || []).push(label);
}
