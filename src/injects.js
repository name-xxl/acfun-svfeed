// ---------- 非脚本页注入总闸（0.9.341；确认稿 docs/preview/native-inject-switch.html） ----------
// 背景（2026-11-17 用户口径裁决）：开发期内官方上架了网页端动态广场，与本脚本原生面功能重合。
// 用户视角这是**功能开关**（面板文案不说「注入」），实现视角是**注入闸门**：关＝不注入、
// 不加载、整链短路（0.9.47 白名单短路先例），重新加载页面后观感恢复原生。**无即时摘除承诺**
// ——boot 一次判读，当前页不回头（各件因此零 unmount 义务，这是裁决不是欠账）。
// 作用域只限非脚本页：#svfeed 竖刷世界是独立新界面、不寄生官方页，不在本闸射程（用户明示）。
//
// 单源纪律（AGENTS 规矩 3/7）：本件是「要不要注入」的**唯一判读出口**，形态同 dest.js
// destOf——总闸 × 子项二维布尔，单源。键清单＝SCHEMA 里 sub:'inject' 五键 + 总闸键
// injectNative；二级面板行从 settings.injectItems() 派生，**boot 调用点 ↔ SCHEMA 键**的
// 配对由 test/check-injects.mjs 双向钉死（摘一侧短路/漏一侧登记即红）——不许长出人工第二份清单。
// 未登记键一律 false（fail-closed）：拼错键名＝功能不注入，而不是静默全开。
// **豁免（0.9.343 用户复审）**：首页顶导航入口（watchNav+兜底胶囊）不在本闸射程——脚本唯一
// 进门键，闸吞入口＝用户关掉后无门可回（自锁悖论实报）；boot 总注与 harness off-home 腿反钉。
import { getSetting } from './settings.js';

// 总闸键（一级面板「官方页面增强」行）：关时 injectOn 恒 false 且不读子项——
// 零开销是语义承诺（值保留但不判），置灰态因此不回写各项存储
export var INJECT_MASTER = 'injectNative';

// 「这次要不要注入」唯一查询出口（仅 boot 消费；二级面板只读总闸值做置灰判定）
export function injectOn(key) {
  if (getSetting(INJECT_MASTER) !== true) return false;
  return getSetting(key) === true;
}
