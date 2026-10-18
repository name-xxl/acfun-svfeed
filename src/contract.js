// @ts-check
// ---------- 关键端点回包的形状守卫（0.9.264） ----------
// 定位：**非抛错**的运行时契约探针。项目既有解析层一律「宁可漏不错」——形状不对就返回空/
// null；本件只补一个可观测点：缺形状时 `stat('contract.<tag>.miss')` 计数（release 下 stat
// 是 noop，零成本），调用方保持原有回退行为。用来把「站点改版/网关换形状」从静默降级变成
// 可读计数，而不是引入一套会误伤兼容形状的强 schema。
//
// 只收**入口级**必需字段：空数组/空串/0/false 都是合法值，只有 undefined/null 算缺。
import { stat } from './dbg.js';

/**
 * @param {unknown} obj
 * @param {string[]} fields
 * @param {string} tag
 * @returns {boolean}
 */
export function hasShape(obj, fields, tag) {
  if (!obj || typeof obj !== 'object') {
    stat('contract.' + tag + '.miss');
    return false;
  }
  var rec = /** @type {Record<string, unknown>} */ (obj);
  for (var i = 0; i < fields.length; i++) {
    var k = fields[i];
    if (rec[k] === undefined || rec[k] === null) {
      stat('contract.' + tag + '.miss');
      return false;
    }
  }
  return true;
}

/**
 * @param {unknown} v
 * @param {string} tag
 * @returns {boolean}
 */
export function isArray(v, tag) {
  if (Array.isArray(v)) return true;
  stat('contract.' + tag + '.miss');
  return false;
}
