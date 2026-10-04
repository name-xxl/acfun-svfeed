/*
 * 方向诊断（0.9.117；V3「架构税」关闭后的幸存者）——**非门禁**：每 Phase 顺手跑一次，
 * 看「方向卫生」有没有新增侵蚀；永远 exit 0（清单小且可数，不值得一座门；"环"的门已由
 * check-deps 规则⑤承担，本诊断管的恰是规则⑤射程外的**无环反向边**）。
 *
 * 口径（本文档最值钱的认知，原样留档）：
 *   「规则的上游是口径，口径不定，候选集就不定。」
 * —— v3（@family 声明 + check-taxonomy 方向规则）被关闭的原因不是规则难写，而是「层」没有
 * 唯一定义：同一张图按 README subgraph 分层与按「特性域」分层，候选集不同；规则先于口径
 * 定，报出来是一堆歧义。故本诊断并列两条保守口径、人工看结果，不设自动判罚。
 *
 * 口径 A（正式分层）：README 基建层成员 → 基建层/接口层之外的 import 边。
 * 口径 B（特性域）：非特性模块 → 特性模块的边（特性集见下方清单，可增改；
 *                    boot/player 为组合根/编排层，对特性的装配属正常向下，不计）。
 *
 * 在册项（KNOWN，带理由）——新增项冒出来 = 需要一次裁决，别默默放过；
 * 处置记录见 docs/dependency-audit.md：
 *
 *   node test/check-direction.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

// 口径 A 用：README 基建层（styles.js 等 16 件）+ 接口层（3 件）
const INFRA = new Set(['cfg.js', 'net.js', 'data.js', 'state.js', 'route.js', 'imgview.js', 'inputbar.js',
  'imgurl.js', 'pagekind.js', 'settings.js', 'viewreg.js', 'imgload.js', 'overlay.js', 'topbar.js',
  'ui.js', 'styles.js', 'dbg.js']);
const API = new Set(['api.js', 'appapi.js', 'quality.js']);
// 校准（0.9.117 首跑即立；0.9.119 扩一项）：README 明示的五件零依赖解耦点里，immsg/imicons
// 现居私信层 subgraph——那是出身 placement，不是专属域；它们被 topbar/cards/momentbar/comments
// 等广泛消费，视同基础件。ubbtext（0.9.119 下沉的纯投影族）同为零依赖叶子。不校准则口径 A
// 会持续误报「共享叶子被顶层消费」（同 report→watchledger 的误报自纠：错的是归类，不是依赖）。
const LEAF_SHARED = new Set(['immsg.js', 'imicons.js', 'ubbtext.js']);

// 口径 B 用：特性域清单（0.9.117 定版；新增特性模块时同步。0.9.124 加 rowkit.js——视图层
// 行卡 kit，与 followview/squareview 同层：它依赖 momentbar/comments 属特性层内互调，非反向）
const FEATURE = new Set(['followview.js', 'followstream.js', 'momentdetail.js', 'momentbar.js',
  'followbadge.js', 'comments.js', 'imdrawer.js', 'imnative.js', 'mypage.js', 'zone.js',
  'searchview.js', 'playlayer.js', 'settingspanel.js', 'uppage.js', 'nav.js', 'rowkit.js',
  'squareview.js']);
const SKIP_B = new Set(['boot.js', 'player.js']);

// 在册项（0.9.119 起清空——data→ubb 随手下沉完成，方向卫生库存归零；新增项=需要一次裁决，
// 改动须同步 docs/dependency-audit.md）
const KNOWN = [];
const knownSet = new Set(KNOWN.map((k) => k.edge));

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
const edges = new Set();
for (const f of files) {
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const m of txt.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)) edges.add(f + ' -> ' + m[1]);
  for (const m of txt.matchAll(/^import\s+'\.\/([\w.-]+\.js)';/gm)) edges.add(f + ' -> ' + m[1]);
}

const hitsA = [];
const hitsB = [];
for (const e of edges) {
  const [a, b] = e.split(' -> ');
  if (INFRA.has(a) && !INFRA.has(b) && !API.has(b) && !LEAF_SHARED.has(b)) hitsA.push(e);
  if (!FEATURE.has(a) && FEATURE.has(b) && !SKIP_B.has(a)) hitsB.push(e);
}
hitsA.sort();
hitsB.sort();

let unregistered = 0;
function report(hits) {
  for (const e of hits) {
    if (knownSet.has(e)) {
      const k = KNOWN.find((x) => x.edge === e);
      console.log('  [在册] ' + e + ' —— ' + k.note);
    } else {
      unregistered++;
      console.log('  [⚠ 未登记] ' + e + ' —— 新侵蚀候选：请裁决（修边 / 加设缝 / 登记入册）并同步 docs/dependency-audit.md');
    }
  }
}

console.log('[check-direction] 方向诊断（非门禁）');
console.log('口径 A · 基建层 → 基建/接口层之外：' + hitsA.length + ' 条');
report(hitsA);
console.log('口径 B · 非特性 → 特性模块：' + hitsB.length + ' 条');
report(hitsB);
console.log(unregistered === 0
  ? '[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 0 条——方向卫生无新增侵蚀'
  : '[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 ' + unregistered + ' 条（见上方 ⚠）');
// 非门禁：永远 exit 0；要用它做门，先想清楚口径（见头注）
