// ---------- 列表空态行单源（0.9.300） ----------
// 病灶：`el('div','acsv-vempty', …)` 在 9 个视图/档件里各拼一遍，且「已有就改、有行就摘」
// 的时序各写各的（有的先 querySelector 再 append，有的手动 remove）。文案不是问题，
// **同一枚空态行的建/改/摘协议**才是重复——0.9.297 复核把它列进可维护性卫生。
//
// 口径：一个列表容器最多一枚 `.acsv-vempty`；`setEmpty(list, text)`：
//   · text 为假 → 摘除现有空态行（有行时清位）
//   · 已有 → 只改 textContent（不重建，保留节点与位置）
//   · 没有 → 建一行追加
// 返回空态节点或 null。列表行的**真实数据**仍归各消费点；本件只管空态视觉行的生命周期。
// `el(...,'acsv-vempty')` 只许出现在本件（test/check-liststate.mjs 守）。
import { el } from './ui.js';

/**
 * @param {HTMLElement} list
 * @param {string|null|undefined} text
 * @returns {HTMLElement|null}
 */
export function setEmpty(list, text) {
  var cur = list.querySelector('.acsv-vempty');
  if (!text) {
    if (cur && cur.parentNode) cur.parentNode.removeChild(cur);
    return null;
  }
  if (cur) {
    cur.textContent = String(text);
    return cur;
  }
  var row = el('div', 'acsv-vempty', String(text));
  list.appendChild(row);
  return row;
}