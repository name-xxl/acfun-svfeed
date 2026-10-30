# 卫生收口批4（播放/弹幕域常量单源）——交卷附注

基线 c61d2cc。本文件含：README 增改片段（§A）、CHANGELOG「0.9.305」草稿（§B）、
新增/修改断言清单（§C，供摘修复反跑）。逐任务状态与改动点位在会话报告中。

> 运行时零行为变化承诺的取证点：CSS 缝回填后展平文本与旧裸字面量逐字节相同
> （`min(420px,64vh)`/`min(430px,62vh)`/9×`var(--acsv-dw,412px)`+`min(412px,88vw)` 全部复现）；
> 弹幕发送请求体 `'&color=16777215&mode=1&size=25'` 由派生值拼出同串（colorInt=parseInt(colorHex去#)，16)
> = 16777215 实测）；toast/菜单文案全等值；`CFG.rate.hold2x` 为数组名属性、不入 map/索引迭代。

## A. README 增改片段

### A1. 模块表行（改写文案）

- `timefmt.js` 行（现 520 行）改为：
  「时间/计数文案纯函数（零依赖叶）：`relTime`/`fmtDate`/`fmtAgo`/`fmtWan` + 播放面文案
  `fmtTime`（mm:ss，自 ui.js 下沉、ui 原位 re-export 消费点零改）/`timeText`（「x / y」单源，
  onMeta/onTime 同值短路的锚）/`timeRateLabel`（「N.Nx」单源）（0.9.305 卫生批4②⑥）。契约层、
  卡片与评论、播放控制面共用。」
- `ui.js` 行（521）追加：「播放面小工具 `videoOf` 同族新增 `resumeSlotOf(video)`（续播槽值单源：
  \>CFG.time.resumeMinSec 才给值否则 0）与事件名常数 `EV_LAYOUT_SHIFT`（评论抽屉↔弹幕画布广播通道
  名单源，0.9.305 批4③⑥）；toast 无 root no-op 补 `stat('toast.noRoot')` 信号（批4⑨）。」
- `popplace.js` 行（500）：**「零依赖叶子」措辞失效**，改「唯一 import=CFG 常数表（弹层视觉上限
  `A_MAX_H/A_MAX_VH/ROW_MAX_H/ROW_MAX_VH` 具名常数与 CSS `{{anchorMaxH}}` 等缝单源，0.9.305 批4⑦）」。
  依赖图 leaf class 的 `popplace` 条目、以及「绿色十一个节点」计数与说明段需同步（leaf 集合 -1 →
  或注明 popplace 属「只吃 cfg 的准叶」；README 371 行「读源码常数」表述仍成立）。
- `quality.js` 行（398）追加：「编码偏好归一 `normalizeCodec`（选档链与控制栏 UI 高亮共用，批4①）与
  60fps 档口径 `drop60FpsLabel`（看门狗降帧率阶梯 test/replace 双正则归一，批4⑥）」。
- `dmcanvas.js` 行（429）追加：「**0.9.305 批4⑤**：屏蔽六类单源表 `DM_BLOCK_TYPES`（k/label/test——
  curBlock 构造、filterDanmaku 编排、dmpanel 六 tag 三处派生）；滚动族判据 `isScrollMode` 导出（四处共用，
  屏蔽判据仍吃归一前原始 mode）；显示区域默认从 SCHEMA dmArea.def 派生（AREA_DEF，schema 漂移走
  `stat('dm.areaDefBad')` 并回落全区域）。」
- `dmpanel.js` 行（439）：「…（消费 ui/settings）」改为「…（消费 ui/settings/dmcanvas.DM_BLOCK_TYPES）」。
- `controls.js` 行（438）追加：「编码/缓冲菜单选项与 toast 文案、倍速展示全表驱动（CFG.codec.options/
  CFG.buf.labelOf/timefmt.timeRateLabel，批4①②）； codecPref=normalizeCodec 壳；音量数字由 fillVolSlide
  单写（撤前置手写，批4⑥）」。
- `session.js` 行（435）追加：「恢复态串 ST_RECOVERING 常数、探测窗 CFG.stall.probeMs、60fps 阶梯判据走
  quality.drop60FpsLabel、续播门限走 resumeSlotOf（0.9.305 批4③⑥）」。
- `playgest.js` 行（479）：「攒阈值 60px + 锁 500ms」后追加「——阈值具名常数 STEP_PX/LOCK_MS/SEG_MS/
  FLICK_MS 本件单源（0.9.305 批4⑥，仍零依赖叶）」。（README 使用表口径核对结论：滚轮攒阈值 60px 与
  锁 500ms 语义如实；触摸路径只判阈值不判锁为既有行为，未动。）
- `appapi.js` 行（397）弹幕 add 处注明「默认口径取 CFG.danmaku.defaults（批4④）」。
- `feedstore.js` 行：金丝雀键 `feed-changed-no-listener` 更名 `feed.noListener`（批4⑥）——
  docs/dependency-audit.md:50 提及旧键名，属历史审计记录不追改（父裁决）。

### A2. 依赖图新增边（form：`X --> Y`）

```
  controls --> quality
  session --> quality
  dmpanel --> dmcanvas
  popplace --> cfg
  ui --> dbg
  dmcanvas --> ui
```
行内追加式改法（若父偏好并线）：
- `sessionhooks --> attach & danmaku & feedstore & pb & playlayer & views & timefmt`
- `input --> feedstore & overlay & pb & settings & timefmt`
- `danmaku --> appapi & settings & toastmsg & cfg`
- `attach --> feedstore & quality & session & settings & domfields & cfg`
- `prewarm --> cfg`（prewarm 原无入图边，新增一行 `prewarm --> api & cfg & feedstore`）

### A3. CFG/SCHEMA 契约字段清单（若 README 维护该面）

CFG 新增：`codec.options[]`、`buf.labelOf(k)`、`danmaku.defaults{mode,size,colorHex}` +
派生 `colorInt`（文件末语句）、`rate.hold2x`（数组名属性）、`time.resumeMinSec`、
`win.fwdDepth`、`stall.probeMs`、`comments.drawerWOf(vw)`、`pop{anchorMaxH,anchorMaxVh,rowMaxH,rowMaxVh}`。
SCHEMA 无新增键；codec/buf 的 options 改引用/派生。SEAMS 新增缝：`anchorMaxH/anchorMaxVh/rowMaxH/
rowMaxVh/dwFallback`（cssraw 成对标记已入）。新 stat 键：`toast.noRoot`、`dm.areaDefBad`；改名键：
`feed.noListener`。

## B. CHANGELOG「0.9.305」草稿（照最新小节样式）

### 0.9.305（2026-10-30）· 卫生收口批4——播放/弹幕域常量单源（codec 四名单/续播门限/弹幕默认/屏蔽六类/CSS 缝五枚）

**病灶（六域卫生审计播放/弹幕域，复核属实）**：同一口径多份平行字面量——
- 编码偏好名单四份（settings SCHEMA 项/controls 菜单/controls toast/归一规则两份分躺 quality 与 controls）；
  缓冲档展示格式 `label+' '+max+'s'` 两处手写拼接；长按 2x 裸写两处；倍速「N.Nx」文案三处手拼；
  「>1s 才记续播」六处裸写；弹幕默认三件套（接口体 16777215/1/25、回显 #ffffff/1/25、advdm 残包默认）
  四处两口径；屏蔽六类在 dmcanvas 六字段构造与 dmpanel 六 tag 表平行两份；dmArea 默认 0.72 三处；
  滚动族 `(mode===1||mode===6)` 四处；`'acsv-layout-shift'` 字面三处；`'recovering'` 内部态串三处；
  前向深度 2 三处裸写；探测窗 1000ms 两处；playgest 60px 两处；音量数字前置手写+fillVolSlide 二写；
  「x / y」时间文案三处；60fps 档 test/replace 双正则两处；stat 键全库唯一连字符一个；
  弹层上限 420/0.64/430/0.62 JS 与 CSS 各一份、抽屉宽公式两份 + CSS 兜底 412px 十处。
  其中 settings.js「同源（controls 同表）」注释是**假注释**（彼时并不同表）。

**修法（规矩 3 单源收口 + 规矩 7 上到结构层）**：
- cfg.js 立表：`codec.options`（SCHEMA/菜单/toast 三消费派生，序即菜单序）、`buf.labelOf`、
  `danmaku.defaults{mode,size,colorHex}`（`colorInt` 文件末派生=16777215）、`time.resumeMinSec`、
  `win.fwdDepth`、`stall.probeMs`、`pop` 四值、`comments.drawerWOf(vw)`、`rate.hold2x`（名属性）。
- quality 导出 `normalizeCodec`（applyQuality 与 controls.codecPref 共用一规则）与 `drop60FpsLabel`
  （阶梯判据+低档名推导一函数）；timefmt 收播放面文案三件：`fmtTime` 自 ui 下沉（ui 原位 re-export，
  cards/controls 消费零改）、`timeText`（onMeta/onTime/初始占位同式，短路依赖钉死）、`timeRateLabel`。
- ui 导出 `resumeSlotOf`（六处拼装归一，宿主取 ui 因 session 不能反 import attach 的建议宿主——方向纪律）
  与 `EV_LAYOUT_SHIFT`；session 立 `ST_RECOVERING`；dmcanvas 立 `DM_BLOCK_TYPES` 六类表（k/label/test——
  readSettings/filterDanmaku/dmpanel 三面派生，序=判定序=展示序）与 `isScrollMode`；dmArea 回落值从
  SCHEMA def 派生（AREA_DEF IIFE，漂移走 `stat('dm.areaDefBad')`）；controls 音量数字撤前置手写；
  playgest 阈值四常数（本件单源，README 使用表口径核对无漂移后登记）；feedstore 金丝雀键改点分
  `feed.noListener`；toast 无 root no-op 补 `stat('toast.noRoot')`；ensureStyle 注记 boot/nativeip/
  natpanel 同形注入为登记例外勿再抽（本批不扩面）。
- CSS 缝五枚（照 jxgridMin 先例）：cssraw `min(420px,64vh)`/`min(430px,62vh)`/10 处 `412px` 兜底进
  `{{anchorMaxH/anchorMaxVh/rowMaxH/rowMaxVh/dwFallback}}` 缝，styles SEAMS 回填（vh 由分数 ×100 取整，
  Math.round 防 0.64×100=64.00000000000001 浮点污染）；**运行时 CSS 逐字节不变**（展平回验脚本过）。
- 有意不动：advdm 残包默认 DEF_SIZE/DEF_COLOR 保持字面量（零依赖模型核，其单测无 window/__ACSV_DEBUG__
  垫片，import cfg 即求值崩——注释登记同改义务）；controls 缓冲 toast「（前向 Ns）」句级文案不入菜单式；
  `CFG.time.hold`（进入阈值）与 keepIv 巡检 1s 与 probeMs 分概念不并；触摸路径不判锁为既有语义。

**测试**：单测新增/收紧——settings.test：codec options 引用同一性 + buf labelOf 派生格式 + normalizeCodec
四态（摘修复反跑：SCHEMA 还抄一份名单 ⇒ 引用同一性红；改 labelOf 式 ⇒ 派生红）；dmcanvas.test：
isScrollMode 七态、DM_BLOCK_TYPES k/label 序、表驱动过滤与旧判据逐条对齐（含 mode 原始值语义与大写白
toLowerCase 口径——反跑：filterDanmaku 还原自抄判据/表序重排 ⇒ 转红）；timefmt.test：fmtTime 七态、
timeText 三钉（`'00:00 / 00:00'` 即 controls 初始占位契约、同值短路两侧同式）、timeRateLabel 五档。
node --test 五件+advdm 69/69 绿；`src/player.js` 图在 purity 垫片下直载不抛；eslint 全绿。
build/全场景/各闸由收口人复跑（本批未跑 npm test，遵并发纪律）。

## C. 摘修复反跑断言清单（本批新增/收紧）

1. test/unit/settings.test.js「SCHEMA 不变量：codec/buf 选项名单与展示格式单源 CFG」
   - `codec.options` 与 `CFG.codec.options` **引用同一**（还原 SCHEMA 自抄数组 ⇒ 红）
   - buf options 深比对 `CFG.buf.labelOf` 派生；`buf.options[0].t === '标准 10s'`（labelOf 式改动 ⇒ 红）
2. test/unit/settings.test.js「normalizeCodec：非 auto/hevc 一律落 def」
   - 还原 controls/quality 各自内联三元再改坏一侧 ⇒ 红（两消费共函数）
3. test/unit/dmcanvas.test.js「isScrollMode：仅 1/6」+「DM_BLOCK_TYPES 六类序 + 表驱动对齐」
   - k/label 顺序深比对（重排 ⇒ 红）；`{scroll:true}` 剔 mode1/6 含大写白仍属滚动族；`{color:true}`
     不剔 '#FFFFFF'（toLowerCase 口径改动 ⇒ 红）；mode 7 不算滚动族（判据若改吃归一后 mode ⇒ 红）
4. test/unit/timefmt.test.js「fmtTime/timeText/timeRateLabel」
   - `timeText(0,0) === '00:00 / 00:00'`（controls 占位还原裸串不同式不红——真正反跑点是
     sessionhooks 两侧改回手拼不同式时 harness 时间断言；本单测钉格式锚）
   - `timeRateLabel(2) === '2.0x'`（feed.js case 钉的「倍速 2.0x」同源）
5. 非断言类反跑提示（给收口人）：
   - cssraw 缝回退裸字面 ⇒ check-release 的产物 `'{{'` 计数仍 0（构建期即等值），反跑证据在
     「SEAMS 表加项未成对」场景：摘掉 styles SEAMS 任一新缝 ⇒ styles 留 `{{name}}` 残标 +
     `stat('css.seamLeft')`（debug 构建）+ check-release「产物零缝标记」转红。
   - `CFG.danmaku.defaults.colorHex` 改动 ⇒ appapi 请求体 colorInt 随动（派生单点）——
     若有测试硬钉 body 串需知悉此处语义变化（现 harness 未钉 body 逐字节）。
