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

// ---------- 端点方言登记表（0.9.304，六域卫生审计·接口域 P1#1） ----------
// 游标终值：APP/web 各翻页端点无下页时回 pcursor='no_more'。此前全库 11 处裸写同一字符串、
// 判据各自拼装（null/空串/'0' 方言不一）——站方改终值即 8 文件同批、改漏一处静默
// 「永不到底」或「提前到底」。终判的**另一半**（空页/空条目/24h 窗口越界/固定页长）留在各域
// 调用点——那是各端点的固有事实；这里只统一「终值令牌」本身。
// 防回潮闸：test/check-dialect.mjs（`no_more` 字面唯本件可写）。
export var CURSOR_END = 'no_more';

/**
 * 游标到底判定：缺省/空串/终值/额外方言（opts.also，如 followDougaFeed 族另回 '0'）。
 * @param {unknown} v
 * @param {{ also?: Array<string|number> }} [opts]
 * @returns {boolean}
 */
export function isEndCursor(v, opts) {
  if (v === undefined || v === null || v === '') return true;
  var s = String(v);
  if (s === CURSOR_END) return true;
  var also = (opts && opts.also) || [];
  for (var i = 0; i < also.length; i++) {
    if (s === String(also[i])) return true;
  }
  return false;
}

// 资源类型枚举族（0.9.304 登记；真机 docs §2/§4/§10 实测）——此前 `resourceType=2/9`、
// 三元映射 `ct→数字` 散在 8+ 文件裸写，同数字跨族不同义：
//   VIDEO=2  APP 家族稿件（playInfo cast/danmaku 计数/repost 视频/waiting/搜索卡过滤）
//   DOUGA=9  收藏·弹幕体系专用枚举（favorite/resource、new-danmaku——acfunsdk 2→9 显式映射）
//   ARTICLE=3 文章（repost 用；写链未全测，见 interact 头注）
//   MOMENT=10 动态（interact objectType 与 repost 同值）
export var RT = { VIDEO: 2, ARTICLE: 3, DOUGA: 9, MOMENT: 10 };

// 评论 sourceType 族（通用评论系统按来源分线；与 RT 是**不同族**枚举勿混用）：
//   SV=5 小视频 · VIDEO=3 投稿视频 · MOMENT=4 动态（playitem 契约与 comments/rowkit 消费同表）
export var ST = { SV: 5, VIDEO: 3, MOMENT: 4 };

// PC-direct 写链成功码方言（0.9.304）：`result===0` 即成功——此前 favapi/relationapi 各持一份
// `ok0`，appapi/historyapi/watchlaterapi 又内联同判多遍。统一谓词（kuaishouzt 家族成功码是 1、
// APP 网关 result 0/失败非 0 语义不同，不在本谓词射程——那属各域判定，勿混）。
/** @param {any} j @returns {boolean} */
export function okResult0(j) { return !!(j && j.result === 0); }
