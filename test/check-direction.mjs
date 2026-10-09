/*
 * 方向诊断（0.9.117；0.9.187 由「永远 exit 0 的非门禁」升为**棘轮**）——看「方向卫生」有没有
 * 新增侵蚀：**未登记项 >0 即红**（在册项带理由放行）。它管的恰是 check-deps 规则⑤射程外的
 * **无环反向边**（"环"的门已由 check-deps 承担）。
 *
 * 为什么从"非门禁"改成"棘轮"：0.9.119 起在册清单已清零（KNOWN=[]）、两口径当前均 0 条——
 * 此刻开棘轮**零成本、纯防回归**：将来任何新反向边冒出来 = 需要一次裁决（修边 / 加设缝 /
 * 登记入册），不该默默放过。仍**不改判罚口径**（下面两条保守口径原样），只把"报警"升级为"红"。
 *
 * 口径（本文档最值钱的认知，原样留档）：
 *   「规则的上游是口径，口径不定，候选集就不定。」
 * —— v3（@family 声明 + check-taxonomy 方向规则）被关闭的原因不是规则难写，而是「层」没有
 * 唯一定义：同一张图按 README subgraph 分层与按「特性域」分层，候选集不同。故本诊断并列两条
 * 保守口径、人工看结果。棘轮只对**未登记**项判红，不重开"层定义"之争。
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
const INFRA = new Set(['cfg.js', 'net.js', 'playitem.js', 'panelitem.js', 'state.js', 'route.js', 'imgview.js', 'inputbar.js',
  'imgurl.js', 'pagekind.js', 'settings.js', 'viewreg.js', 'imgload.js', 'overlay.js', 'topbar.js',
  'ui.js', 'errbox.js', 'styles.js', 'dbg.js', 'timefmt.js', 'uplook.js', 'nameval.js']);
const API = new Set(['api.js', 'appapi.js', 'quality.js']);
// 校准（0.9.117 首跑即立；0.9.119 扩一项）：README 明示的五件零依赖解耦点里，immsg/imicons
// 现居私信层 subgraph——那是出身 placement，不是专属域；它们被 topbar/cards/momentbar/comments
// 等广泛消费，视同基础件。ubbtext（0.9.119 下沉的纯投影族）同为零依赖叶子。不校准则口径 A
// 会持续误报「共享叶子被顶层消费」（同 report→watchledger 的误报自纠：错的是归类，不是依赖）。
// searchhist（0.9.158 共享化：读写站方 searchCache 的零依赖叶，topbar 聚焦面板与 searchview
// 两方消费——0.9.160 诊断复跑发现该边漏登记，同 immsg/imicons 校准：错的是归类，不是依赖）
const LEAF_SHARED = new Set(['immsg.js', 'imicons.js', 'ubbtext.js', 'searchhist.js']);

// 口径 B 用：特性域清单（0.9.117 定版；新增特性模块时同步。0.9.124 加 rowkit.js——视图层
// 行卡 kit，与 followview/squareview 同层：它依赖 momentbar/comments 属特性层内互调，非反向；
// 0.9.128 加 squarefeed.js（广场列表机械工厂，视图家族共享件）与 memberplaza.js（原生页
// 入口/内嵌宿主）——同为特性层，与 rowkit/comments 的依赖属层内互调；0.9.133 加 commentkit.js
//——评论条目渲染 kit，与 comments.js 同层（管线→kit 单向））
const FEATURE = new Set(['followview.js', 'followstream.js', 'momentdetail.js', 'momentbar.js',
  'followbadge.js', 'imbadge.js', 'comments.js', 'imdrawer.js', 'imnative.js', 'mypage.js', 'zone.js',
  'searchview.js', 'playlayer.js', 'settingspanel.js', 'uppage.js', 'nav.js', 'rowkit.js',
  'squareview.js', 'squarefeed.js', 'memberplaza.js', 'commentkit.js', 'reldrawer.js',
  // 0.9.169 登记：reldrawer（抽屉 tab 特性件，comments 两 seam 单向）/ jingxuanview（分区页视图，
  // 消费 appapi/channelapi/cards/settings/imicons/relatedapi，无被依赖回边）。两者的方向复核
  // 与新增边清单见 docs/dependency-audit.md「0.9.168–0.178」节
  // 0.9.218 登记：spacetab（空间页标签栏注入共享件，两标签共用注入/切换/排序/自愈，只依赖 ui）/
  // spacemoments（空间页「动态」标签特性件，消费 spacetab/squarefeed/momentapi/memberplaza/cfg/ui）。
  // 二者与 rowkit 同属特性层 shared kit + 视图件，与 uppage/memberplaza 的依赖属层内互调
  //（spacemoments 复用 memberplaza 导出的 addAmAnchor=两个原生页宿主单源，非反向）
  // 0.9.221 登记：composermirror（输入框镜像层装饰器，消费 emoticon/tokenedit/ui）——把
  // 「输入条要渲染表情」这条边从基建层的 inputbar 挪到特性层（免得新增基建→特性反向边）
  // 0.9.222 登记：momenteditor（发动态编辑器，三处入口共用出口；消费 inputbar/composermirror/
  // momentpost/cards/overlay…）/ pubentry（原生 /member/feeds 入口注入，与 memberplaza 同页共存）
  'jingxuanview.js', 'spacetab.js', 'spacemoments.js', 'composermirror.js', 'tokenedit.js',
  // sharepanel 一并登记（0.9.222）：它是**分享面板 UI 共用件**（此前只 import imsend/imgload/popplace，
  // 都没进 FEATURE 集 ⇒ 从未报警）；本批它新增 → momenteditor（面板里「转发到动态」直接开编辑器），
  // 归类纠正后不再误报。同批：momenteditor（编辑器）/ pubentry（原生入口注入）
  'momenteditor.js', 'pubentry.js']);
const SKIP_B = new Set(['boot.js', 'player.js']);

// 在册项（0.9.119 起清空——data→ubb 随手下沉完成，方向卫生库存归零；新增项=需要一次裁决，
// 改动须同步 docs/dependency-audit.md）
const KNOWN = [
  // 0.9.222：分享面板加「转发到动态」⇒ sharepanel → momenteditor（新边）。
  // **为什么登记而不是改归类**：sharepanel/rail/slide 三者谁属特性层是**既有分类债**——把
  // sharepanel 计入 FEATURE 会连锁浮出 rail→sharepanel、slide→rail…… 那是另一次分类纠正的活，
  // 不该在一个功能批里连环做（本批只新增了这一条边）。债务与后续处置见 docs/dependency-audit.md。
  { edge: 'sharepanel.js -> momenteditor.js', note: '分享面板「转发到动态」直开编辑器；分类债待专项纠正' }
];
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

console.log('[check-direction] 方向诊断（棘轮）');
console.log('口径 A · 基建层 → 基建/接口层之外：' + hitsA.length + ' 条');
report(hitsA);
console.log('口径 B · 非特性 → 特性模块：' + hitsB.length + ' 条');
report(hitsB);
if (unregistered) {
  console.log('[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 ' + unregistered
    + ' 条——请裁决（修边 / 加设缝 / 登记入册）并同步 docs/dependency-audit.md');
  process.exit(1); // 棘轮（0.9.187）：未登记即红；在册项带理由放行
}
console.log('[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 0 条——方向卫生无新增侵蚀');
