# 更新日志

AcFun 小视频竖刷页脚本的版本更新记录（版本号即小节号，最新在前；0.9.81 起自 README 迁出）。
每节记录：病灶（真机/评审实证）→ 修法 → 测试证据。项目约定见 README 的「开发」章。

> 更早版本（0.9.199 及以前，共 199 节）见 [CHANGELOG-archive.md](CHANGELOG-archive.md)。

### 0.9.261（2026-10-17）· 分类覆盖收尾——剩余 18 件全部登记（一项）

**由头**：0.9.260 建播放层桶后仍有 20 件未纳。本批把其中 18 件按性质一次登完（另 2 件不属口径候选），
`check-direction` 覆盖面 **82.0% → 98.2%（109/111）**。**无代码行为改动**（只动测试门禁与文档）。

- **① 18 件登记（`test/check-direction.mjs`）**：接口层 **+5**（`channelapi`/`favapi`/`relationapi`/
  `momentapi`/`upload`——域传输：只做端点取数与回包规整，不含视图/交互知识；归 FEATURE 也绿，但会
  把"传输"与"特性域"混为一谈，且归 API 后出边**仍受口径 B 约束**，不是自由桶）；零依赖叶 **+1**
  （`searchfmt`——纯投影，同 `ubbtext` 族，只依赖 imgurl/playitem/timefmt）；特性层 **+12**
  （`banpop`/`favpop`/`grouppop`/`pickpop`/`popplace` 弹层族；`emoticon`/`ubb`/`imcard` 内容 kit；
  `listtail`/`sidebar`/`release`/`followseen` 视图件）。**逐件核过入边**：18 件的全部消费方都是
  FEATURE 或 SKIP_B 组合根 ⇒ 三口径复跑 **0/0/0**，`KNOWN` 仍为 `[]`。
- **② 注释勘误**：`momentpost` 的归类注释曾称"与同在 FEATURE 里的 momentapi（读域）同类"——
  momentapi 实际从未登记；本批按域传输归接口层，注释同步改为"接口层的 momentapi（读域）"。
- **未纳 2 件（有意）**：`cssraw.js`（构建期输入，src 内零入边）与 `devicetab.js`（生成物）——
  不属于任何方向口径的候选，登记反而是噪声。
- **不做**：`deleteMoment`/`uploadImages` 仍不删——复读判定二者是**已设计未接线**的 API（动态删除、
  九宫格多图上传，文件头与历史 CHANGELOG 都记着设计意图），删掉等于丢弃已完成实现；真要清，先裁决
  "这两个功能还做不做"，再连 README/CHANGELOG 一起改。
- **测试**：`check-direction` 三口径 0 条；单测 414/414、harness 82/82、lint/tsc/check 全绿；
  产物仅版本号变化（本批不碰 `src/`，体积不变）。

### 0.9.260（2026-10-17）· 方向诊断补第三口径（播放层桶）/ 首屏解包耗时打点（两项）

**由头**：0.9.259 批④ 的覆盖首轮卡在四件播放层内核上——不是入边审计没做完，而是 `check-direction`
只有"基建/接口/特性"三层，**缺播放层桶**。本批补桶（而不是给四件找 `KNOWN` 豁免），并顺手把审计
§九 留下的"首屏解包成本未真机实测"做成可直接读数的打点。**无用户可见行为改动**。

- **① 新口径 C + PLAY（播放层，18 件；`test/check-direction.mjs`）**：病灶——四件
  （`session`/`feedstore`/`controls`/`dmcanvas`）归 FEATURE 会把"播放层→播放层"的入边误判成反向
  （口径 B 红），归 INFRA 又会被"→ 未登记件"判红（口径 A 红），于是长期登不进任何桶；`KNOWN` 为空
  其实是靠"不登"回避，而不是真无债。修法——建 18 件播放层桶（session/attach/playback/hls/prewarm；
  controls/input；dmcanvas/danmaku；playgest/playstate/levelstack/relatedapi；interact/report/
  watchledger；feedstore/feedctx）+ 口径 C（**播放层只许依赖 播放层/基建/接口/零依赖叶**；不许依赖
  特性层、组合根、未登记件）。**建桶不放松任何既有边**：基建→播放层仍由口径 A 判红（PLAY 不在 A 的
  允许集），播放层→特性仍由口径 B 判红（PLAY ⊄ FEATURE）。同批把 `advdm`（高弹模型核：无 DOM/无
  状态/无网络）与 `toastmsg`（话术单源：只 import ui/cfg）归入零依赖叶，消解口径 C 唯一会报的两条
  （`dmcanvas→advdm`、`danmaku→toastmsg`）；且**无一基建件 import 它们**，口径 A 射程零变化。
  **测试**：反跑——临时在 `session.js` 顶插 `import './devicetab.js';`（播放层→未登记件）⇒ 口径 C
  **1 条 / exit=1**；还原后三口径复归 0、exit=0。覆盖面 71 → **91/111（82.0%）**（未纳 20 件，其中
  `cssraw.js` 是构建期输入、`devicetab.js` 是生成物，二者无需登记；其余 18 件为后续可选的逐件审计）。
  **没有新增任何 `KNOWN` 豁免**（仍为 `[]`）。
- **② 首屏解包耗时打点（`src/styles.js`，debug-only）**：病灶——审计 §九 明确"首屏解包成本只有
  node 口径（≈1.9 ms）、未真机实测"，而 0.9.258 的 CSS 压缩已交付，这条不闭环就永远是个"不知道真机
  多贵"的已交付项。修法——模块求值期在 `unpackText` 前后 `set('css.unpackMs', …)`（`__ACSV_DEBUG__`
  闸内，release 整段死码消除），真机 DevTools 读 `__ACSV_TEST__.getStats()['css.unpackMs']`
  （TM grant 模式经 `unsafeWindow`）。这不是行为断言（不配 harness 钉子），只是把真机验收清单里的
  那一项变成可直接读数。
- **测试总账**：单测 414/414；harness 82/82 场景；lint / tsc / check（cases/release/deps/no-leak/
  direction）全绿；产物 release 576,653 B / debug 920,497 B（较 0.9.259 +4 B / +130 B，为 debug
  计时段的死码残留，体积门禁内）。

### 0.9.259（2026-10-16）· 审计批④——翻页协议单源 / check-direction 登记卫生与覆盖首轮（两项）

**由头**：`docs/optimization-audit-2026-10-16.md` 的批④（P2-5 逐字副本 + P3-2 棘轮卫生）。
**无用户可见行为改动**（三处同拍内次序归一，逐条论证见①）。

- **① 翻页协议收进单源（`src/pageloader.js` 新增）**：病灶——四份"加载下一页"是逐字副本
  （`followview.load` / `squarefeed.load` / `mypage` 观看历史 / `mypage` adminTab 动态档壳），
  字面守卫 `if (my !== seq || !list.isConnected) return;` 全仓 8 处。四处同形的协议有六件事：
  在途守卫、代数令牌 + 已拆/换档丢包、骨架两路都收、三态状态行（续拉/到底/失败二选一）、首屏
  标记、两路都清 `loading`。修法——新件只收**这六件事**，**翻页范式不收**：游标方言（毫秒时间戳 /
  页码 / 偏移量）、传输、解析、到底判定、空态文案全留消费点，以注入缝显式表达差异——
  `skeleton(firstPage)`（**建不建由消费点定**：历史档每页都建，与另三家"仅首屏"不同形）、
  `earlySettle`（历史档沿用 0.9.236 的"在陈旧守卫**之前**结算"形状）、`busyGate`（动态档续拉
  状态行的判据是"已有条目"而非"非首屏"）、`beforeFetch`（档表未到不发废请求）、
  `doneLabel`/`failLabel`/`loadingLabel`；返回 `{load, reset, done}`（`reset` 收容原
  `squarefeed.refresh`/`adminTab.select` 里的五行复位，`done` 供 `makeListCtx` 的 isDone 缝）。
  净折掉约 117 行重复协议（四文件净 +1 行，新件 88 行）——方向同仓内先例（`makeListCtx` 0.9.179、
  0.9.148 的 `adminTab` 壳："同形副本必漂移"）。
  **测试**：`view-my` 新增三钉——`hist-page2-skeleton`（延迟的第二页在途时 12 张骨架在位 ⇒ 钉
  "历史档每页都建骨架"）、`hist-request-bodies`（两发请求体精确等于
  `pageNo=1&pageSize=20&resourceTypes=1&resourceTypes=2` 与 `pageNo=2&…`）、
  `hist-done-raw-count`（第二发确实发生 ⇒ 钉"到底按**原始条数**"，即 0.9.77 那条实锤注释的
  承重墙）。**反跑**：历史档到底改成按筛除后条数 ⇒ `view-my` **8 条断言转红**
  （`hist-done-raw-count bodies=1`、`hist-page2-skeleton skel=0`、`hist-page2 n=18 calls=1` …）；
  骨架改成仅首屏 ⇒ `hist-page2-skeleton` 转红。两处均还原复绿（主代理独立复跑第一条反跑，
  读数一致）。行为等价：三处同拍内次序归一（历史/动态档空态插在状态行之前；动态档 `loading`
  在状态行之后清），两写之间无布局读取、无重入点。
- **② check-direction 登记卫生 + 覆盖首轮（`test/check-direction.mjs` / `docs/dependency-audit.md`）**：
  病灶——口径注释写"基建层 16 件"而 `INFRA` 实有 21 件（0.9.258 加 `pack` 后 22、本批加
  `pageloader` 后 23）；`momentpost.js` 在 `FEATURE` 重复登记（全表唯一重复）；覆盖率 60.9%。
  修法/结果——注释改 **23** 并附"改 INFRA 必须改这一行"的纪律注与复算一行命令；删重复登记；
  `pageloader` 入 INFRA（零依赖叶，同 `pack` 先例）；再**有界首轮**试登七件真共享件：
  `cards`（卡面 kit 单源，11 个消费方都在 FEATURE）、`views`（子视图框架；唯一消费方 player 属
  SKIP_B，选更严的 FEATURE 登记）、`imsend`（私信域发送核心）**三件登记成功**；
  `session`/`feedstore`/`controls`/`dmcanvas` **四件留待**——它们的入边全是"播放层→播放层"，
  而现有分类只有基建/接口/特性三桶，缺的其实是"播放层"桶（**未造 `KNOWN` 豁免凑绿**）。
  覆盖率 67→**71/111（64.0%）**；未纳 40 件清单与四件被卡的具体入边记入
  `docs/dependency-audit.md` 新增的 0.9.259 节（审计定的"多批小步"，不硬扫）。
- **测试总账**：单测 414/414；harness **82/82 场景**（`view-my 67`、`view-follow 80`、
  `view-square 39`、`fav-folders 46`、`member-plaza 36`、`layer-list 67`、`play-deep 93` …）；
  lint / tsc / check（cases/release/deps/no-leak/direction）全绿；产物 576,649 B / 920,367 B（563/899KB）。
  **一则如实记录**：验证期间 `view-follow` 的行内评论链出现时序抖动（该场景本体约 5s，偶发跑到
  15–32s，断言落在固定 8s 窗口上）；用 HEAD 的 followview 在本树可复现、在净 HEAD 工作树 10/10
  通过 ⇒ 判为环境/时序抖动、**未归因到本批改动**（最终全量两轮均绿，但未找到确定性成因，
  不以"已修"记）。

### 0.9.258（2026-10-16）· 审计批②——CSS 压缩内嵌 / 解包单源收口 / 体积门禁（三项）

**由头**：`docs/optimization-audit-2026-10-16.md` 的批②（构建改造）：P0-1 全量 CSS 压缩内嵌
（实测上限 −10.98%）与 P1-2 体积门禁（阈值按压缩后实测定）。形态照二审裁定的**"接缝模板 + 运行时
拼接"**（§四 P0-1）——不采用"构建期冻结最终串"，理由=单源：CFG 插值与主色替换仍只住 `styles.js`
一处（同 hls/devicetab 先例）。**本批零行为改动**：runtime CSS 与压缩前逐字节相同（见①的 cmp 证据）。

- **① 全量 CSS 由字面量链改压缩内嵌（`src/cssraw.js` 新增 / `src/styles.js` / `build.js`）**：
  病灶——全量 CSS 以 ~92KB 的 `+ '…'` 字面量链写在 `styles.js` 里，而 esbuild **不压字符串字面量**
  （实测逐字进产物）⇒ 每个页面都要下载并解析这 92KB。修法——原文整段机械搬到 `src/cssraw.js`
  （**构建期输入**，定位同 `node_modules/hls.js`：只被 `build.js` import；随产物发布的模块一律
  不得引它），23 处 CFG 插值 + 1 处 `+ IMGVIEW_CSS +` 拼接改写为 `'{{缝名}}'` 标记；`build.js`
  以 deflateRaw(level 9)+base64 内嵌 `window.__ACSV_CSS_SRC__`（`__ACSV_CSS_LEN__`=模板 UTF-8
  字节数，同 hls 的长度校验纪律），`styles.js` 模块求值期解包 → 按 `SEAMS` 表回填 → 照旧
  `#fd4c5d → var(--acsv-accent)`（**顺序不变**：先回填、后换色）。`IMGVIEW_CSS` 留作第 13 缝
  （不内联进 cssraw.js）——同一段 CSS 在仓里存两份迟早漂，与"单源收口"相冲。失败降级：串缺失/
  解包失败 → 空模板（CSS 仍带 `:root` 与三小段独立导出），打点 `css.tplFail`；未登记标记原样留下
  并打点 `css.seamLeft`（缝名与表漂移可见；两者仅 debug 有效）。
  **测试**：改动前后各打桩求值一次 runtime `CSS` → **92,451 B 逐字节相同（`cmp` 退出 0）**，另三块
  独立导出段 sha 前缀不变；产物 release 645,532 → **575,990 B（−69,542 B = −10.77%）**、
  debug 987,456 → **918,713 B（−68,743 B）**。首屏成本：**node 口径探针，未真机实测**
  （审计 §四点名要真机数据，这条只作量级参考；探针 `test/tmp-probe/css-unpack-perf.mjs` 未跟踪）
  ＝解包 1.83 ms + 接缝回填 0.05 ms（50 次均值），量级远小于原先每页解析 92KB 源文字的代价。
- **② 解包助手单源（`src/pack.js` 新增 / `src/hls.js` / `src/devname.js`）**：病灶——`unpackHls`
  与 `unpackDeviceTab` 是两份逐字相似的 deflateRaw+base64 解包（审计明令：CSS 若各写一份就是第三
  份 `unpack*`，违 AGENTS 规则 3）。修法——抽 `pack.unpackText(packed, len, onFail)`（零内部依赖：
  base64 → inflateSync(fflate) → 长度校验 → UTF-8 解码；失败一律返 null、绝不抛），两个旧件只剩
  薄壳补各自打点（`hls.unpackLen` / `hls.unpackErr` 读数与调用方零变化）。`check-direction` 登记
  pack 为基建件（否则口径 A 报 styles→pack 越层）、`check-deps` 入基础件集 + README 图补节点与边。
  **测试**：既有 `hls-pack.test.js`（脏 base64/半截串/长度不符一律 null）与 `devname.test.js`
  （截断/长度不符/空值一律 null）原样通过（414/414）；harness 的 hls/cdn-fallback 场景照旧经
  注入串解包起播。
- **③ 体积门禁落地（`test/check-release.mjs`）**：病灶——此前只有"release < debug×0.9"的**相对**
  断言，整体静默膨胀 11% 照样绿；CSS 压缩落下 70KB 后不立闸，等于把这 11% 余量白送。修法——加
  **绝对上限 + 分段表**（total / head / hls / css / rest 五段，上限=压缩后实测定 ×1.02；分段让
  "涨在哪一段"一眼可读），另加两条反跑闸：产物里 `'{{'` 必须 **0 次**（CSS 原文一旦被哪个随产物
  发布的模块 import 进来即现形）、`window.__ACSV_CSS_SRC__` 必须在场。
  **测试**：**摘修复反跑**——把 release 基线临时调到当前体积之下 ⇒ 红（`release total 超上限：
  575990B > 510000B`）；往产物尾塞一个 `{{` ⇒ 红（`产物里出现 1 处 '{{' 标记`），两者还原复绿。
- **测试总账**：单测 414/414；harness **82/82 场景全量通过**（本批不动行为，computed style/几何
  断言即 CSS 的回归网——如 `composer`（面板/弹层取色与几何）、`views`（各视图网格与量取值）、
  `smoke`（**release 产物**冷启动）；CSS 若空/未回填，这些场景成片转红）；lint / tsc / check
  （cases/release/deps/no-leak/direction）全绿。

### 0.9.257（2026-10-16）· 审计批①——转圈定时器 / 恢复看门狗 / 陈旧列表上下文 / 弹幕恢复 / 悬停保活链 / 上限空转 / 徽标监听 / lint 盲区（八项）

**由头**：三份外部优化报告（原始方案 / 二次精读复核 / 合并版）逐条回源裁定，归档
`docs/optimization-audit-2026-10-16.md`（含**撤回的判错**与"未复核"清单——报告 11 条判错里 8 条维持、
3 条经独立反驳者复核改写理由）。本批取其中**可用 harness 复现、且能"摘修复反跑"**的八项，逐项修 +
配断言；关键断言均经**还原病灶转红、复绿**，逐条反跑读数记在 `test/cases/audit257.js` 文件头。

- **① 平滑 seek 后永久转圈（`session.js`）**：病灶——转圈定时器的清理点写在 `setState` 的同值早退
  **之后**（ready/error 两分支内）。`waiting` 臂起 300ms 定时器后 state 仍是 `ready`，smooth seek 的
  `seeked` 调 `setState('ready')` 被同值守卫短路 ⇒ 定时器无人撤，到期直写 `loading` 反盖已恢复的
  画面；而 spec 下 smooth seek 只发 seeking/seeked、**不发 playing**，再没有归位事件。修法——清理
  提到早退之前（"归口一处"的原注释即指此处）。测试 `state-seek-ready`（waiting → 100ms → seeked →
  越过 300ms 仍须 ready）；反跑 ⇒ `ssr-ready-holds` 读 `state=loading` 转红。
- **② 重解析换源无看门狗（`session.js`）**：病灶——`_recovering` 重入锁只由 `playing`/看门狗释放，
  而 0.9.256 只给"换备用 CDN"臂挂了看门狗；"重跑解析"臂挂上新源后若立刻 error，该 error 被锁吞 ⇒
  会话永停 `recovering`（无错误盒无重试）。修法——该臂同样 `self._armRecoverWatch()`（回调是**普通
  函数**，必须 `self`，写 `this.` 会 TypeError）。测试 `recover-refresh-watch`（真身换单条死链 +
  mock 直链改本地 404，经 `slide._session.item` 取真身）；反跑 ⇒ `rrw-watch-armed`（watch=0）+
  `rrw-error-state` + `rrw-leaves-recovering` 三条转红。
- **③ 陈旧列表上下文灌进新舞台（`player.js`）**：病灶——空间页列表上下文是模块级常驻（格子点击
  激活、unmount 有意不复位，深链续泵靠它），从别处深链进同一 id 空间时沿用了它，于是按上一集的
  `feedCursor` 把旧列表剩余条目灌进新舞台。修法——深链落地时加**所有权判据**：`UpVideos.items` 含
  本次 `mid`（或解析出的 `hit.item.id`）才延续，否则让出（不动 unmount、不动关注侧）。测试
  `deeplink-upctx`（造态缝 `upvideos.activate`——真机条目需 GM 抓 m 站 HTML，本地 harness 无 GM
  通道）；反跑 ⇒ `duc-old-list-not-pumped`（`second=11053531`＝旧列表首条）+ `duc-ctx-released` 转红。
- **④ 暂停→恢复重建弹幕态并多发请求（`danmaku.js`）**：病灶——同一视频每次 `playing` 都重跑
  `setItems`（全量重排轨）并重建高级弹幕泵（`wins` 归零 ⇒ `ADV_MAX_WIN` 单会话上限失效），恢复后
  ≤1.5s 还会对同窗多发一次 POST。修法——按 `slide._dmVideoId` 与 `!findPump(layer)` 两道门控
  （`layer.start()` 不进闸：弹幕开关重开必须照旧生效）；图层销毁时清标记。测试 `dm-play-gated`
  （mock 计 `pollByPosition` + 包装 `layer.setItems` 计次）；反跑 ⇒ `dpg-no-extra-adv`（adv 1→2）+
  `dpg-no-refill` 转红。
- **⑤ 音量悬停保活链永续（`controls.js`）**：病灶——指针停在音量区（`_volOpen` 真）时 slide 被拆壳
  （换条/Esc/换层），Chromium 不给已拆节点补发 `pointerleave` ⇒ `volScheduleHide` 不再排、`_volOpen`
  卡真，闲置保活以 `ctlIdle`(2500ms) 永续自续，闭包持整棵 slide 子树 + item。修法——定时器体首行
  `if (!slide.isConnected) return;`（旧 slide 不会被插回，分离即终态）。测试 `ctl-detach-stop`（切源
  `resetStream` 摘整批 slide）+ debug 埋点 `ctl.keepalive`；反跑 ⇒ `cds-detach-stopped` 两拍计数继续
  爬升（k 1→2）转红。
- **⑥ 列表链打满上限后 30ms 空转、随机流回落永不触发（`feedstore.js`）**：病灶——`feedctx` 撞
  `maxPages` 只置 `chainCapped`、不置 `done`，泵见 `!done && !failed` 便以 `chainGap`(30ms) 自续，
  **且 `fetchMore()` 的回落分支永不进入**（`ensureMore` 有上下文时直接早退）⇒ 舞台饿死。修法——
  `chainCapped` 与 `done/failed` 并列当终态。测试 `pump-chaincapped`（关注流定向桩永不 `no_more`
  ⇒ 链必然打满，再逐条 `scrollTo` 泵到耗尽）+ 埋点 `feed.pumpRearm`；反跑 ⇒ `pcm-pump-rearm-stopped`
  （rearm 187→421）+ `pcm-fallback-engaged`（items 停在 9、随机流 0 条）转红。
  **口径备注**：回落与 `done/failed` 同款——在下一次 `ensureMore`（用户下一划）执行，不是主动补拉；
  与修复前等价（旧代码那 30ms 空转同样不送货），无回归。
- **⑦ 未读徽标监听跨挂载累积（`imbadge.js`）**：病灶——SDK 实例是永不释放的单例（`imsend.ensureIm`
  只 bump `connGen`），每次 mount 都叠一层 `unReadCountUpdate` 且从不撤；回调里的 `mounted` 又是
  **共享模块标志**，最新一次挂载置真后所有陈旧回调都过守卫 ⇒ 一个事件触发 N 次 `getSessions` 全量
  求和。修法——登记句柄 + `stopBadge()` 里 `off`（照 `imsend` 的 `sendSucceed` 撤法），`mountBadge`
  先 `stopBadge` 收旧（防未 teardown 的重挂孤儿化 timer/监听）。测试 `badge-listener`（假 SDK 夹具
  `test/fake-imsdk.js` 走 `imsend` 的 directLoad 真路径 + `imbadge.accelerate` 压缩 `badgeDelay`）+
  钩子增 `listenerArmed`；反跑 ⇒ `bl-single-listener`（live=3）+ `bl-one-event-one-sum`（invoked=3）
  转红。
- **⑧ lint 盲区（`eslint.config.mjs` / `package.json`）**：病灶——`files` 只列 src、test/unit、
  build.js，而 `npm run lint` 命令行里的 `tools` **没有配置对象匹配** ⇒ 规则集为空、静默通过
  （实测 `--print-config tools/gen-device-data.js` 与 `test/cases/views.js` 均 `rules: 0`；
  `eslint src build.js test/unit tools` 退出 0 且零输出——`tools` 等于从没被检查）；`test/cases`、
  `test/*.mjs` 同样全裸。修法——`files` 扩到 test/tools，`lint` 脚本改 `eslint .`（范围由配置单点
  决定）。扩面即红 263 条 `no-unused-vars`，其中 262 条是 harness 场景体开头"公共件参数前置"的既有
  形制（0.9.81 迁入，逐字未改）⇒ 给 `test/cases/**` 单开一块只关这一条（`no-undef` /
  `no-constant-binary-expression` / `no-restricted-syntax` 照旧生效）；剩下 1 条是真账
  （`test/check-deps.mjs:88` 未用的 `a`，已删）。



**由头**：对全仓做七簇行级深读 + 逐条回源码复核（含对上一轮外部清单的误判剔除），筛出七项可
用现有 harness 复现、且能"摘修复反跑"的真问题，逐项修复并配断言。全部证据链见下（病灶 → 修法
→ 测试），关键断言均经**摘修复反跑转红、还原复绿**。

- **① 会话错误恢复锁死（`session.js`）**：病灶——`_recovering` 重入锁只由 `playing` 释放，而
  恢复链第一步"换备用 CDN"直接 return；备线再失败时新 `error` 被 190 行锁吞，不升级
  refreshItem、不落 error 态 ⇒ 无限转圈无重试（多 CDN 条目永远到不了升级档）。修法——换线后
  挂**看门狗**（`CFG.time.recoverStuck=8s`，playing/dispose 清表）：到期仍持锁且新源无数据/已
  error ⇒ 清锁回 `recover()` 走升级链；已出数据（暂停/被拒播）只解锁不升级。测试：新场景
  `recover-backup-fail`（真身经 `slide._session.item` 换双死链 + 合成 error，先等真实 error 落
  地防异步归零假绿）钉"升级到 refreshItem 恢复起播 + `recover.watch` 计数"；反跑（摘
  `_armRecoverWatch`）⇒ 两条断言转红（state=loading、watch=0），还原复绿。
- **② Esc 语义单源（`overlay.js`/`input.js`/`momenteditor.js`）**：病灶——`onEsc` 只在 overlay
  capture 生效，input.js 合成事件路径三处直调 `overlayClose`；发布动态提交中按 Esc 先弹栈、
  `close` 再因 busy 拒执行 ⇒ 编辑器在屏但不在栈顶（后续 Esc/媒体键泄漏到下层，且再也关不掉）。
  修法——新增 `overlayEsc()`（onEsc 裁决与关层顺序单源），overlay capture 与 input.js 三处接线
  全部走它；momentedit 注册 `onEsc:()=>!!busy`。测试：单测 overlayEsc 两条（消费不弹栈/放行走
  关层/空栈返假）；moment-publish 新增 busy 期连按 Esc 两条 + 落定关 + 非 busy 关；反跑（摘
  onEsc 注册）⇒ 三条断言转红且层序崩坏（stack=["view"]→[]、后续入口 null），还原复绿。
- **③ UBB 裸 ac 号规则二次改写已生成 HTML（`ubb.js`）**：病灶——裸 ac 号/动态短链规则跑在
  话题/at/img 之后且对整串替换：`#ac2019#` 话题 href、`[color=#ac1234]` hex 值、图链路径段含
  `ac\d{4,}` 三类输入被二次改写成 `<a>`（属性截断/`<a>` 嵌套）；原"顺序等价论"证伪。修法——
  **保护块**（protect/restore token）：表情/图/at/话题先行产出收进 token，裸 ac/动态短链只扫
  "未进 UBB 属性区与已生成标记"的文本段（`split(<tag>|[attr])` 双切）；`[ac=]`/`[resource]`
  内文先还原再剥标签（与旧"先成链再剥壳"逐字等价）；含保护块的话题不建链（token 防编进
  search keyword）。测试：单测 +5（话题/href、hex 颜色、图链 src、at 昵称、话题+正文并存），
  既有 32 条全量回归通过；反跑（protect 恒等 + 拆回旧整串替换）⇒ 恰好 5 条新断言转红，还原复绿。
- **④ 关注视频流二次进入回放上届列表（`followstream.js`）**：病灶——`enterVideos` 全新进入
  分支不重置 `FollowVideos`，items 只 concat：上届整列计入新会话（首条仍是旧视频），且上届
  `done=true` 令 `startFollowChain` 立即短路、新分页永不加载（耗尽后静默回落随机流）。修法——
  全新分支先 `FollowVideos.reset()`（feedctx 单源，含 failed=false）。测试：follow-videos 新增
  "离开关注流→再进视频"（等进入完成 + 沉降 1.2s 再比对 count——不只看瞬态，反跑实锤过瞬时窗口
  假绿）；反跑（摘 reset）⇒ count 14→24 转红，还原复绿。
- **⑤ 写链无超时 + 单飞 reset 假复位（`appapi.js`/`ui.js`）**：病灶——`postForm` 裸 fetch 无超时
  （半开 TCP 可 pending 数分钟，发送键锁死）；`singleFlight.reset()` 只清 val，请求挂起时
  `ensureApiSt(true)` 强制刷新拿到的仍是挂在 busy 上的僵尸 promise（全互动写链卡到刷新）。修
  法——postForm 加 AbortController 超时（对齐 `CFG.time.gm`，abort 归一到 'timeout' 话术供
  momentpost"结果未知→先查后补"匹配）；singleFlight reset 升代为**代际作废**（新 get 重新发
  起，旧等待者不撕）。测试：单测 singleflight 4 条（共享/失败重试/清值/在途作废）；反跑（reset
  还原旧语义）⇒ 在途作废条转红，还原复绿。
- **⑥ 深链迟到回包覆盖后发深链 + 首屏误弹错误盒（`player.js`）**：病灶——`loadDeepLink` 回包只
  挡"已退出竖刷"，不挡"期间又发起新深链"：A 未决时切 B 落地，A 迟到把 B 流重置成 A、地址栏
  也回写成 A；`loadInitial` 的 reset 后旧链以"成功空结果"收尾，旧回调见空库会弹错误盒盖在新流
  上。修法——两处都取 `FeedStore.gen` 代际快照守卫（deep-link 回包整体作废；loadInitial 旧链
  作废不再出盒/重绘）。测试：新场景 `deeplink-race`（harness 桩挂起 A 的 douga/info、切 B 落地
  后放行 A）；反跑（摘 gen 守卫）⇒ `race-stale-discarded`（first=48867213）+ `race-url-kept`
  转红，还原复绿。
- **⑦ 转圈收口：残留子项 + scroller 级不可见（`player.js`/`styles.js`）**：病灶——`clearSpinner`
  只删首个，播放层直达回舞台路径 mount/maybeStartFeed 双挂 ⇒ 残留无 idx 子项令 renderWindow
  排序快路（children.length !== ordered.length）恒真、此后每次重绘全量 appendChild 重排；
  scroller 直属 spinner 命中的是 `.acsv-spinner{display:none}`（622 行只匹配 slide 内）——
  首屏/切源/深链加载实际无转圈。修法——clearSpinner 全清；补 `.acsv-scroller>.acsv-spinner
  {display:block}`（可视形态入册 `docs/preview/loading-spinner.html`，与既有 slide 级转圈同枚）。
  测试：play-cold 新增残留清零 + 合成探测 computed display 两条；反跑（双处各自摘除）⇒ 两条
  分别转红（n=1 / display=none），还原复绿。
- **测试总账**：单测 414/414（+11：ubb 保护块 5 / overlayEsc 2 / singleflight 4）；harness
  75/75 场景全量通过（+2 新场景，publish/follow-videos/play-cold 新增断言）；lint / tsc /
  check（cases/release/deps/no-leak/direction）全绿；七项反跑逐项转红均还原复绿。

### 0.9.255（2026-10-15）· 设备数据优化专项——全品牌 4,031 条机械归一 + 压缩内嵌

**由头**：内置设备表是 Web-IP 移植批次的窄快照（996 条，生成器 TAIL 截断 + 区域变体剔除），
实测三类问题：覆盖缺口（`docs/api-research.md` 自录真机样本 `HONOR PGT-AN10` miss）、名称冗长
（渠道/区域/存储后缀如「一加 Ace 2 国行版 / 原神定制礼盒」）、类别过滤有洞（荣耀 MagicBook
笔记本漏入表）。维护完全靠手工重跑，先定"数据优化专项"：全量收录 + 纯机械归一，零人工清单。

- **生成器 v2（`tools/gen-device-data.js` 重写）**：25 源 = 22 个 CN 口径文件（含 asus_cn/nokia_cn/
  motorola_cn）+ sony/google/nothing 全球口径；Apple 改 `apple_all.md` 头部识别符（242）∪ gist
  补差（+1，iPad1,2）。
  管线四段：多源解析（手机+平板章节保留；笔记本/电视/穿戴/学习机/云电脑显式剔除，含章节名
  无关键词时的型号名兜底）→ 名称归一 14 组规则（多名取首段 / 存储括号 / 运营商渠道 SKU /
  区域后缀 / 美运营商 / 空白收缩等；5G 与特别版保留）→ 同码多名裁决（CN 文件优先 → 最短 →
  字典序）→ 键排序确定性输出。**144 组裁决全部自动定案**（干跑清单曾交用户过目后转纯机械）。
- **产物形态**：`src/devicetab.js` 由可读对象字面量改为 deflateRaw+base64 压缩串
  （`DEVICE_TAB_PACKED/LEN/COUNT`）；运行时 `devname.unpackDeviceTab` 惰性解包（hls.unpackHls
  同款长度校验——UTF-8 字节数，中文表下 ≠ 字符数；损坏/截断静默回落空表，用户层导入仍可用）。
  体积：debug 侧原源文件 38.7KB → 压缩串 35.0KB（**-3.7KB**），release +约 1KB；R6 水位反松。
- **质量收益（本地 2026-08-31 快照实测）**：真机样本 `PGT-AN10` → 荣耀 Magic5 Pro（原 miss）、
  `PHK110` → 一加 Ace 2、`PJD/PJZ110` → 一加 12/13（原带「国行版」脏尾）、`NOH-AN00` →
  HUAWEI Mate 40 Pro 5G；MagicBook/云电脑类别泄漏清零（单测不变式钉住）。
- **测试**：单测 402/402（新增 `gendevice.test.js`：归一样例/幂等、裁决三段规则、类别过滤边界；
  devname 新增解包三项：截断/长度不符/空值 → null、压缩串 <48KB 预算、类别泄漏不变式）；
  harness 73/73 场景全量回归通过（`nat-panel` 的设备数据条数断言改为相对不变式：导入前
  base+1，弃写死 997 的绝对数——防「数据扩容即红」）；lint/typecheck/check 全绿。关键断言
  摘修复反跑已验：摘解包长度校验 → devname 解包用例转红；停用 net 归一规则 → gendevice
  全网通用例转红（均还原复绿）。

### 0.9.254（2026-10-15）· 复审处置（①真 bug 修 + ②核实不复现 + 连带实证 Esc 层序缺陷）

**由头**：外部复审（Phase 5+6 吸收批次）报 1 真 bug + 1 边缘 bug + 可选意见若干。处置中借新增断言
连带实锤一处 Esc 层序缺陷（③）。

- **① 脚本页异步回填的 IP 标签丢 uid（真 bug，已修）**：病灶 `src/iploc.js` armQuery 的 fetchFor
  回填回调 `appendTag(meta, ip, t)` 漏传第 4 参 k ⇒ **首屏首次异步回填**的标签
  `data-acsv-uid="undefined"`，点击弹面板显示「用户名 未知 / UID undefined / 暂无缓存」（缓存命中
  路径 `tagInto`/`stmt==='pos'` 两处传了 k，此前测试只点了这条路径）。修法一行：
  `appendTag(meta, ip, t, k)`。测试：ip-tags 新增点**首条异步回填标签**⇒面板开（深色）+ 资料卡含
  甲/9001/广东；**摘修复反跑**（k 摘掉）⇒ `iph-async-panel-card` 唯一转红
  （`用户名未知UIDundefinedIP属地暂无缓存`），还原复绿。
- **② devTag 防重复绑（边缘 bug，实测不复现——同引用注册按 DOM 规范去重）**：复审指原生页重扫对
  站方原地重渲染的元素二次 devTag 会叠 click 监听 ⇒ 单击两次 toggle 相抵「切不动」。实测：devTag
  的 onToggle 是**模块级具名函数**，`addEventListener` 同 (type, callback, capture) 重复注册是
  no-op ⇒ 二次 devTag 后单击仍单切（Web-IP 的 `_acrDeviceBound` 守卫在其原仓同为冗余——其 handler
  也是具名函数，56-device.js:179）。处置：**不加死守卫**；native-ip 用例新增两条断言（重扫把代号改
  回→重扫重新美化 / 单击只切一次）钉住不变式，devTag 注释钉「onToggle 必须保持具名函数」的形状约束
  （改内联闭包即叠监听）；**病灶形状反跑**（临时改闭包注册）⇒ `nip-dev-rescan-single-toggle` 转红，
  还原复绿。
- **③ 连带修复：Esc 关 IP 面板会把底层视图层一起关掉（复核实锤）**：写①的断言时暴露——natpanel 自家
  window 按键监听的注册序先于 input.js 的 keyHandler，Esc 先把面板抢关出栈，input.js 随即把新栈顶
  `'view'` 层（订阅视图的浮层层，views.js:171）当普通层连关（`closeView()` → hash 回裸 `#svfeed`
  → 视图拆、回竖刷）。修法（两件）：natpanel **入浮层栈**（`overlayOpen({id:'natpanel', modal:true})`
  ——Esc 单点关栈顶，真键盘走 overlay capture，settingspanel 同款）；自家监听**门控只兜原生页合成
  事件**（判据「无 #acsv-root 壳」＝与 input.js:49 `isFeedRoute() && root` 同一事实的两处读取；摘掉
  门控即抢跑）。测试：`iph-esc-panel-only` 钉「Esc 后面板关 + 行内评论盒存活 + hash 仍
  `#svfeed/follow`」（hash 是同步判据：closeView 一发生地址即刻被改）；**摘修复反跑**（门控摘掉）⇒
  该条转红（`hash=#svfeed`）且 `iph-reopen` 连锁红。
- **④ 可选意见处置**：产物 626KB / debug 963KB（本批吸收 +47KB，大头 devicetab 40KB 原文）——R6
  1MB 水位 debug 侧余约 37KB，roadmap R6 行记观察不动表结构；natpanel number 控件分支留作表驱动
  通用性（无消费项，无害）；acr_cache 不收养维持现状（Web-IP v5.4 起正面积累进 acr_uids，损失≈零）。
- lint/check + 391 单测 + 73/73 场景全绿（ip-tags 21→24、native-ip 21→23 断言）。

### 0.9.253（2026-10-15）· IP 面板两主题 + 脚本页点击接通 + 齿轮页脚版本号（三项，预览定案）

**由头**（用户三问：「设置面板设计不统一吗 / 脚本页点击 IP 没反应吗 / 脚本页设置不展示版本号吗」；
计划模式定案 → 预览稿 `docs/preview/ip-panel-unified.html` 三轮改稿（两主题 → 精简 → 去例子）后确认，
标题定案「IP 属地 · 设备」）：

- **① 两皮肤收敛 + IP 面板两主题**：IP 面板定为**结构单源、两主题只换 token**——脚本页（`.acsv-cip`
  入口）＝**深色主题**（token 对齐齿轮面板家族：rgba(22,22,27,.97)+blur12/radius14、标题 15px 白、
  开关关态 rgb(158,158,158)、动作按钮 radius8 半透明，用户裁决）；原生页（`.acsv-nip` 入口）＝
  浅色主题（Web-IP 面板资产收敛版）。设置行**精简为单行式**（原 hint 文案转入 label 悬停 title）、
  组标移除、页脚只留版本号；开关 40×22→**34×18**（两主题同几何）；标签 cursor 改 **pointer**。
  SCHEMA 的 devName hint 顺带改口（去例子：『代号自动替换为友好名称；点击型号可切回代号』——
  齿轮面板该行同源受益）。**注：齿轮面板内容与 hint 两行式保持现状**（其既有形态，用户确认不动）。
- **② 脚本页 IP 点击接通**：`.acsv-cip` 补 uid 背引用（iploc.appendTag）；natpanel 委托 selector 扩
  `.acsv-cip, .acsv-nip`（主题随入口类）；boot home 分支装配 `mountNatPanel()`（幂等；全站覆盖＝
  home 由 boot、其余 www 由 nativeip）；面板宿主改 `#acsv-root || body`（脚本页进 root，momenteditor
  先例）。
- **③ 版本号单源 + 齿轮页脚**：cfg.js 新增 `export var APP_VERSION`（构建期 `__ACSV_VERSION__` 的
  UI 唯一出口）；settingspanel 页脚改 space-between——`v{APP_VERSION}` 左置 12px #8b909a + 「完成」
  右置（IP 面板页脚同源：只留 `v{版本}`，免责文案已在标签 tooltip 里不重复）。
- **测试**：harness +13 断言——`nat-panel`（23：标题/浅色主题/无小字块且 label title 载文案/开关
  34×18 实测/页脚版本号）；`ip-tags`（21：cip cursor:pointer + **点 cip 开面板** + 深色主题 +
  资料卡为该 uid + Esc 关）；`settings-open`（25：页脚版本号在场）。**摘修复反跑**：委托摘掉
  `.acsv-cip` 分支 ⇒ `iph-panel-open/dark/card` 三条转红，还原复绿。lint/check + 391 单测 +
  73/73 场景全绿。预览确认稿随批入库。

### 0.9.252（2026-10-15）· 原生面板设置区收窄为评论域（用户裁决 A）

**由头**（用户问「原生页面点击 ip 弹出的设置面板需要展示全部设置项吗」→ 裁决 A）：0.9.250 的原生
面板按 D4 字面渲染**全量** SCHEMA（通用/播放/评论 9 行）——但点 IP 标签进来的语境就是 IP/设备
功能（Web-IP 面板同范围），且播放/通用项在原生页**看不到效果**（脚本播放器不在该页），摆着只有
噪音。D4 的内核（共享层单一契约、皮肤不能反向 import）不受影响，改的只是"哪些项进哪个皮肤"。

- **修法**：SCHEMA 评论域三件（ipShow/ipKeep/devName）加 **`native: true` 标记**，新增单源出口
  `nativeItems()`＝panel ∧ native（settings.js）；natpanel 的设置区改渲染 `nativeItems()`。加项
  时在 SCHEMA 同一行顺手打标记即可——"两侧都不漏"的纪律保留（脚本面板仍全量 `panelItems()`）。
- **测试**：settings 单测 +1（nativeItems ⊆ panelItems、结构合法、**成员精确钉三件**——增删即
  改断言，防顺手漂移）；harness `nat-panel` 的 `np-schema-rows` 改复合断言（评论三件在场 +
  「自动检查更新/缓冲档位/快进步长」**不得在场**）。**摘修复反跑**：nativeItems 忽略标记（等价
  回退全量）⇒ 单测与 harness 负断言**双双转红**，还原复绿。lint/check + 391 单测 + 73/73 场景全绿。

### 0.9.251（2026-10-15）· 盖楼模式补配（Web-IP 6a 勘误）——评论组件两种显示模式全适配

**病灶（用户质疑「盖楼模式没适配吗」后真机核实，§13.4 更正）**：6a（0.9.248）把「盖楼精确类
今日站零命中」当依据不 port——那是**默认模式页面的单面读数**。真机切换实测：**盖楼模式是站点
评论区的用户可切换显示模式**（切换器 `.area-switch-floor` → 菜单 `data-usemode=FLOOR`；偏好键
`localStorage.ac_usp_commMode` 1=默认/2=盖楼）。切到盖楼后：`[data-commentid]` **= 0**（我们的
commentRoot 一条都扫不到 ⇒ 原生页 IP/设备在盖楼模式**完全不工作**）；根＝`.main-comment-item`
（精确类）×6、楼层块＝`.fc-comment-item`×9、注入点＝`.comment-item-footer-left`×8、uid 正主＝
`a.name[data-uid]`（`a[data-userid]`＝0）、设备锚 `.deviceModel` 同款、数据回包走
**`/rest/pc-direct/comment/listByFloor`**（顶层 `commentsMap{cid→评论}`+`commentIds`，非 rootComments）。
Web-IP 的 `SELECTORS_FLOOR` 正是给此模式用的、今天仍全命中；其 COMMENT_URL_PATTERNS 未含
listByFloor（盖楼映射全靠 DOM 兜底）。

- **修法**：`nativeip` 四处补配——① commentRoot 并入 `.main-comment-item, .fc-comment-item`
  （默认模式根是 `main-comment-item-<id>` 变体类，不重叠、无重复扫描）；② 拦截层加
  `/comment/listByFloor` + `extractCommentList` 增 commentsMap 分支（对象值收集；rootComments
  在场时优先）；③ `onComments` 增 `cid` 主名兼容；④ NATIVE_IP_CSS 补
  `.comment-item-footer-left .acsv-nip{margin-left:8px}`（照 Web-IP floorMode）。uid 兜底链的
  `a.name[data-uid]`（Web-IP 盖楼 userAttrLink）原样已在——实测 8/8 命中。切换模式会整片重渲染
  → 既有 MutationObserver 重扫自然接管（零新增机制）。
- **测试**：单测 +1（commentsMap 形 / 非对象值剔除 / rootComments 优先）。harness `native-ip`
  增**盖楼形状段**（21 断言）：根 `.main-comment-item`+`footer-left`+`a.name[data-uid]` → 标签 +
  **8px 间距**；无 uid 属性的楼层块 → listByFloor 回包（data:URL 灌 `commentsMap`/cid 形）→
  重观察补齐；盖楼设备锚同款替换（'RMX3700'→真我 GT Neo5 SE）。**摘修复反跑**：commentRoot
  退回单选择器 ⇒ `nip-floor-tag`/`nip-floor-margin`/`nip-floor-map-tag` 三条转红（设备断言
  不依赖 root 故仍绿——符合设计），还原复绿。lint/check + 390 单测 + 73/73 场景全绿。

### 0.9.250（2026-10-15）· 原生页设置面板（Web-IP 吸收 6c）——标签点击弹面板 + 数据导入导出

**由头**（Phase 6 第三块；用户「继续 6c 和 6d」）：把 Web-IP 的原生风格设置面板搬进来——它是
原生页上的**唯一设置入口**（D3：不走油猴菜单），并承接预览 ⑧.6 遗留的「设备数据导入/导出 UI」
（当时裁决「另批」，落点即此）。

- **修法**：新 `src/natpanel.js` + `styles.NATIVE_PANEL_CSS` 段（视觉＝原脚本面板资产照抄：浅色
  仿 A 站弹窗、主色 #fd4c5d、340px、z 2147483000，**不进 svfeed 暗色体系**——D4：共享层同源、
  皮肤各自生命周期）：
  - **触发**：点击任意原生页 IP 标签——捕获阶段委托 + preventDefault/stopImmediatePropagation
    （Web-IP 同款，避免触发站方点击逻辑）；Esc/遮罩点击关闭，关闭即 flushSettings。
  - **资料卡**：用户名/UID/IP属地/查询于（`iploc.entryOf` 直读，含负缓存条目）。
  - **设置区＝全量 SCHEMA 表驱动**（D4 落地：新增设置项两边自动出现）：bool→开关 / select→分段 /
    number→步进，三件工厂与 settingspanel 同语义不同皮。
  - **缓存管理**（acr_uids）：导出（ui.copyText）/导入（粘贴 JSON，bundle 或裸表两形，**跳过已
    存在**——Web-IP 同款）/清空（二次确认「确认清空?」，3 秒自还原）。
  - **设备数据**（acr_device_models 用户层）：N 条 + 导入（文件 .md/.txt 多选 + 粘贴，可跳过已存在）
    /导出/重置（二次确认）。
- **配套数据层**：`iploc` 增 `entryOf/exportUids/importUids/clearUids`（bundle 形与危险键守卫
  照 Web-IP）；`devname` 增 `deviceCount/exportDevices/importDeviceText/resetUserDevices`
  （导入写用户层 → 重建索引；`isSafeKey` 迁 `ui.js` 单源——缓存导入与设备导入两域共用）。
  与 Web-IP 的有意差异：**开关关语义分离**（ipShow 关＝不查不渲染但不清数据；其「缓存开关关闭
  即清空」是耦合设计，清空改由显式按钮承担）。
- **测试**：单测 +6（iploc 导出/导入两形/危险键/清空；devname 导入合并·跳过·覆盖/重置回内置/
  条数导出——垫桩 localStorage 升级为真表）；harness 新场景 **nat-panel**（18 断言）：标签点击
  开面板（可见性）/资料卡三行/全量 SCHEMA 行在场/开关拨动 + Esc 落盘/设备导入**端到端**（粘贴
  新代号 → 新评论的设备锚被替换）/缓存清空二次确认 + 计数归零。**摘修复反跑**：摘掉标签点击
  委托 ⇒ `np-open` 转红，还原复绿。lint/check + 389 单测 + 73/73 场景全绿。
- **6d 老仓归档（同日执行，无产物改动）**：`AcFun-Web-IP`、`AcFunDeviceReveal` 两仓顶部加归档
  横幅（指向本仓）后推 main，并在 GitHub 归档（`archived: true` 双复核）——前置核查：两仓 issue
  均为 0（star 1/0，无未了事项）；DeviceReveal 原「合并说明」链条同步更新（Web-IP → svfeed，
  Web-IP 亦已归档）。

### 0.9.249（2026-10-15）· 原生页专属挂点（Web-IP 吸收 6b）——用户主页 IP + 个人中心动态 UP IP

**由头**：6a（0.9.248）把评论区打通后，补 Web-IP 覆盖面的另两处专属挂点（用户 2026-10-15 点名
的「用户主页 ip」与「个人主页（动态）」，**以原脚本为准**）：`injectProfileIp`（/u/ 资料卡）与
`injectUpIp`（/member 动态条目）两函数**真机核实爬链后逐件 port**（closest 两跳
`.feed-time → .feed-up-info → .feed-up` 实测成立、条目内 UP 链 `a[href=//www.acfun.cn/u/<uid>]` ✓，
docs/api-research.md §13.2）。

- **修法**：`nativeip.js` 增两挂点（进 `onDomChange` 统一重扫链）：
  - 用户主页：`#ac-space-info[data-uid]` 的 `.top` 内补「IP属地：x」——文案带前缀、`common-info`
    类复用站内相对定位（与私信/举报/分享同一水平线）、12px/#999/左距 16 内联（Web-IP 同款）；
  - 个人中心：每条 `.feed-time` 内追加 UP 属地 span（closest 两跳取条目 → 条目内 `/u/` 或
    `/live/` 链取 uid；**uid 未渲染时不标记、留待下次重扫**——Web-IP 同款语义）；按节点传参，
    不在循环里写共享闭包（广场 0.9.230 教训在册）。
- **测试**：harness 新场景 **native-surfaces**（7 断言；同 native-ip 的无壳 + /v/ 起步，场景体内
  **pushState 串测**两处挂点）：主页标签（文案前缀 + common-info 类 + 16px 左距）→ 动态条目
  （标签落进 `.feed-time` + 同 uid 只查一次）。**摘修复反跑**：摘掉 `injectProfileIp()` 调用 ⇒
  `nsp-profile-tag`/`nsp-profile-common-info` 转红，还原复绿。lint/check + 383 单测 + 72/72 场景全绿。

### 0.9.248（2026-10-15）· 原生页评论 IP + 设备（Web-IP 吸收 6a）——拦截层 + 视口注入 + 竞态修正

**由头**（Phase 6 开工；用户「做原生页功能实现……以原脚本为准」）：把 Web-IP 的原生页覆盖面搬进
来。**先真机逐面核实覆盖**（docs/api-research.md §13）：评论区实为**统一组件**——视频 /v/、文章
/a/、动态详情 /moment/ 三面同款（`[data-commentid]` 根 + `.area-comment-from` 注入点 +
`a.name[data-userid]`，实测 6/24/2 条全带）；Web-IP 的「盖楼」精确类（`.main-comment-item`/
`.fc-comment-item`）今天零命中（站上新类名带 id 后缀）⇒ 不 port；用户主页 /u/ 与个人中心
/member 动态条目两处挂点留 6b 批。

- **修法**：新 `src/nativeip.js`（**只挂原生页**，boot 表尾统一入口，home 竖刷不吃）：拦截层
  （fetch/XHR hook → commentId→userId 映射，路径变清表）+ DOM 兜底链（a[data-userid] →
  a.name[data-uid] → /u/ 链接 → 头像 src）+ 可见优先注入（IO 200px/root=视口/入视口即 unobserve
  → `iploc.resolveFor` 共享核 → `.acsv-nip` 浅色段：无底色继承字色、hover #fd4c5d、间距 3px，
  tooltip 与抽屉同源）+ 重画补注（MutationObserver 300ms 重扫；已见未注入只读缓存补——屏外不
  打扰）+ SPA 路由清映射 + 设备美化（评论 `.deviceModel` → `devname.devTag` 单源，含点击切换与
  手动记忆 data-acsv-dev-manual，站点重渲染改回代号会重替换）。配套：`iploc` 增数据侧出口
  `resolveFor`/`peek`（视口语义归调用方）；`styles` 增 `NATIVE_IP_CSS` 段（原生页自持注入，
  同 IMGVIEW_CSS 先例，不进全量 CSS）。
  **修正 port（roadmap 6.1 在册）**：Web-IP 的 IO 回调**先 unobserve 再处理**、uid 提取失败即
  **永久漏处理**——我们失败不放弃：卸观察后**有界重观察重试**（600ms×8 拍；IO 只报状态变化，
  重新 observe 才会对仍在视口内的目标再触发）。
- **测试**：新单测 `nativeip.test.js` 26 项——**Web-IP 停靠的 24 项全部等值迁移**（isCommentUrl 7 /
  extractCommentList 4 / parseUidFromHref 7 / extractUidFromComment 6，DOM 用最小桩）＋ 非数组
  回包容错。harness 新场景 **native-ip**（16 断言；BOOT_PATH 到 /v/ac777777 + NO_AUTOMOUNT 无壳，
  场景体自建原生评论 DOM）：标签注入（同一节点/注入点/tooltip 同源）+ 设备替换/点击切换/手动
  态不被重扫覆盖 + 拦截层与竞态修正（无 uid 属性评论：data:URL 灌"评论回包"建映射 → 重观察把
  标签补齐）+ 同 uid 去重（缓存单源）+ 路由清映射。**摘修复反跑**：handleVisible 换回 Web-IP 原
  语义（先卸观察、缺失即弃）⇒ `nip-race-tag` 转红（该条永久漏），还原复绿。
  lint/check + 383 单测 + 71/71 场景全绿。

### 0.9.247（2026-10-15）· IP 属地回填改「视口内回填」——广场 backfillIO 同款

**由头**（用户一句「ip 回填能不能和广场一样用视口内回填」）：0.9.245 的回填是「渲染即排队」——
抽屉首屏约 40 条评论会把屏外（用户没翻到的）30+ 条也排进 200ms 串行队列：费请求，且滚到手
的条目要排在长队尾。广场 0.9.228/0.9.230 的视口渐进回填（backfillIO）正是为此而生。

- **修法**：`iploc.tagInto` 未命中从「立即 fetchFor」改为「挂 viewIO 观察」——squarefeed
  backfillIO 同款机械逐条对齐：单例 IO、rootMargin 200px、**root=视口**、进过一次就 unobserve
  （滚回去不重查，正/负缓存已兜）、回调按节点传参（广场 0.9.230「闭包共享绑定、每批只补最后
  一行」的真凶教训在册；本处回调内同步调 armQuery，无循环闭包）。命中缓存仍**同步上屏**（根本
  不进观察）；进视口后**重判缓存**（等待期间同 uid 的可见条目可能已查回）；挂观察期间关开关则
  不再发起；无 IO 的老内核退回渲染即排队（行为不回退）。
- **测试**：harness `ip-tags` 增**「视口门控」断言链**（16 断言）：打开评论区即把视图滚离视口 →
  等一拍**零查询**（门控生效）→ 滚回（两段：整盒居中 + 末件进内层列表可见带）→ 四条才陆续
  发出。**摘修复反跑**：临时摘掉观察器（退回立即排队）⇒ `iph-viewport-gate` 转红（滚离期间已
  发 3 发），还原复绿。**过程中破的一个真坑**（diag 实锤）：`.acsv-frow-cmtlist` 是
  max-height:420 的独立滚动区，IO 的相交按**祖先裁剪盒**算——件被内层列表裁掉 7px 就不算
  「在视口内」（首跑 4 件只触发 3 件查询即栽在此）；生产语义正确（滚内层列表照常触发），
  用例按两段滚动修正。lint/check + 357 单测 + 70/70 场景全绿。

### 0.9.246（2026-10-15）· 设备型号美化（Web-IP 吸收批次②）——生成器入库 + 四级查表 + 点击切换

**由头**（Web-IP 吸收第二批；同日裁决：设备表入库、两批拆分、预览「照抄成熟原版」定稿）：把评论
「来自 x」里的厂商内部代号（`RMX3619` / `iPhone3,1`）替换为友好名（真我 V30 / iPhone 4）——
Web-IP v5.8.5 `56-device.js` 的成熟形态整体吸收。

- **修法**：
  - `tools/gen-device-data.js` 移植（ESM 化，输出改 `src/devicetab.js`）——**带生成器**；对本地
    MobileModels 数据目录重建：**996 条**，抽查含 2026-10-15 真机样本（`24129PN74C`→Xiaomi 15、
    `RMX3619`→真我 V30 全中）。生成物入库（「勿手改」头注 + CC BY-NC-SA 分声明）；README 新增
    「设备型号数据许可」段（R4 收口：署名/非商业/相同方式共享，与 MIT 分声明）。
  - 新 `src/devname.js`：四级匹配（精确 → 大小写 → 去尾字母 → 前缀包含）+ 查找缓存（上限 500、
    最旧 20% 淘汰）逐字移植；接线口 `devTag(a, model)` 由 comments.cmtOpts 经 `opts.devTag` 注入
    commentkit（同 ipTag 纪律）——**只换锚文本**（href/结构不动，预览 ③ 定稿）、未收录兜底原文、
    **命中映射才挂点击切换**（友好名 ⇄ 原文 + tooltip「原始型号」，preventDefault 拦原生跳转，
    照抄 Web-IP）。用户层读 Web-IP 同键 `acr_device_models`（**只读**兼容；导入/导出 UI 属 Phase 6
    6c），**合并语义升级**＝内置先、用户条覆盖（反转 Web-IP「保存快照整体顶掉内置」——旧快照会把
    新内置整个盖住）。SCHEMA 评论组 +`devName` 开关（默认开）；`CFG.dev.cacheMax`。
- **测试**：新单测 `devname.test.js` 12 项（Web-IP 16 项等值迁移：解析 7 + 四级匹配 9——夹具表
  跑语义、不钉上游数据；新增：缓存记录/覆盖合并/危险键守卫/真实内置表抽查）。harness 新场景
  **dev-name**（12 断言：代前缀取末段/精确命中/href 保持/tooltip/切换两向/未收录原文/楼中楼
  透传）与 **dev-name-off**（6 断言：关态原文）；settings-open 随 SCHEMA 8→9 行更新。
  **摘修复反跑**：`devTag` 提前 return（禁替换）⇒ 5 条断言转红（命中/标题/二向切换/苹果码/
  楼中楼），还原复绿。lint/check + 357 单测 + 70/70 场景全绿。

### 0.9.245（2026-10-15）· 评论抽屉 IP 属地（Web-IP 吸收批次①）——iploc 查询层 + 设置两行 + 渲染点注入

**由头**（路线图 Phase 5 启动；用户 2026-10-15 裁决两批拆分 + 预览定稿「原项目的 UI 已经很成熟，
照抄就行」）：吸收 Web-IP（本地 `AcFun-Web-IP` v5.8.5）的评论 IP 属地——抽屉渲染点手里就有
userId，**不需要它的 commentId→userId 拦截层**（那层随 Phase 6 原生页再 port），是本批最大的
简化；页面级缓存同撤（uid 缓存已覆盖跨页复用）。前置实测全清（docs/api-research.md §12，本地
留档）：端点 `userInfo→profile.ipLocation`（登录态 5/5 非空、游客空串；`getUserCardList` 不带
属地）、通道 GM 裸调真机带回登录态（§12.4）、属地格式 **64 条采样全部省级短名**（§12.1——预览
示例已按实测改稿，用户改稿点①）。

- **修法**：新 `src/iploc.js`（评论 IP 属地查询层）：**单层 uid 缓存**沿用老键 `acr_uids` 同 key
  同形状（Web-IP 老用户数据零迁移，D8）；串行限流 200ms + 写盘防抖 2s + 上限 5000 最旧淘汰 +
  **pagehide 兜底落盘**（Web-IP 无此件，补的）；负缓存分级（无属地 6h / 网络错 10min，照
  Web-IP）；「无值不渲染」铁律。接线口 `tagInto(meta, uid)` 由 comments.cmtOpts 经 **opts.ipTag**
  注入 commentkit（kit 不 import 特性模块的纪律；三宿主 + 发送后乐观插入同经 cmtOpts，天然全
  覆盖）——缓存命中**同步上屏**、未命中串行排队回填（节点存活守卫）、空属地静默。阈值收
  `CFG.ip` 单源 + `CFG.api.userInfo` 新端点。settings SCHEMA 评论组 +2 行：`ipShow`（开关，默认
  开）/ `ipKeep`（保留期 永久/1/7/30 天，默认 7 天——比 Web-IP 的永久更保守）；Web-IP 老保留期键
  `acr_days` 一次性收养（值域重合零翻译）。styles 增 `.acsv-cip`（灰字原文直显；悬停主题色＝
  Phase 6 可点击的预兆，预览 ② 定稿）。确认稿 `docs/preview/ip-device-tags.html` 随批入库。
- **测试**：新单测 `iploc.test.js` 26 项（Web-IP `isFailureCacheFresh` 8 项等值迁移 + 正面新鲜度/
  三态判定/保留期换算/老键映射/tooltip 文案/过期清理与上限淘汰）。harness 新场景 **ip-tags**
  （15 断言：未命中排队四发 + 标签落地**同一 DOM 节点**不变式 + meta 末尾落位 + 三行 tooltip +
  空属地/网络错不渲染 + **楼中楼同显**（opts.ipTag 透传路径）+ 收起重开：命中同步上屏 + 四种
  缓存复用计数不涨）与 **ip-tags-off**（6 断言：开关关闭零查询零标签）；settings-open 断言随
  SCHEMA +2 行更新（6→8 行）。
  **摘修复反跑**：临时摘掉两条负缓存写入 ⇒ `iph-cache-noreq` 转红（9002/9003 各被重查一次），
  还原复绿。lint/check + 345 单测 + 66/66 场景全绿（README 依赖图 +iploc 节点与 6 条边）。

### 0.9.244（2026-10-15）· 私信徽标轮询随 badgeDelay 起：不再「进竖刷 5s 就拉 860KB SDK」

**病灶（真机实测实锤）**：imbadge 在 mount 即起 `setInterval(tick, 5s)`，首拍（~5s）就
`ensureIm()` 拉 860KB IM SDK——cfg 里 `badgeDelay: 15000`「避免页面一打开就拉起 SDK」的意图
被架空。真机读数（`__acsvImLog` 秒表探针，2026-10-15）：**挂载后 7.8s** SDK 即 connect
（5s 首拍 + fetch/编译约 2.8s）。

- **修法**：轮询起点移入 `badgeDelayTimer` 回调（15s 到点：首查 → 武装 5s 轮询 → 订阅
  unReadCountUpdate 加速）。行为变化＝私信角标出现从 ~5-8s 推到 ~15s（即 cfg 声明意图；
  期间手动开私信抽屉仍即时走 ensureIm，不受影响）。顺带给 `loadImSdk` 加埋点
  `im.sdkLoad`/`im.loadMs`（对标 hls.evalMs，此后读 acsv-stats 即可验证）。
- **测试证据**：imbadge 增 debug 测试钩子（mounted/delayArmed/pollArmed）；新增 harness 场景
  `badge-delay`（debug 构建；分发器等过挂载后立即断言「只武装延迟 timer、轮询未武装」——
  初版挂在 smoke 上，smoke 走 release 构建无 `__ACSV_TEST__`、断言被恒跳过，反跑不红即改）。
  **摘修复反跑**：把 interval 挪回 mount 处 ⇒ `badge-delay-armed` 转红（poll=true），还原复绿。
  lint/check + 319 单测 + 66/66 场景全绿。

### 0.9.243（2026-10-15）· 单源收口批：pad2/videoOf 归位、relTime 改名、死码清理、测试管线并行

**病灶（复核清单实锤）**：同一小逻辑多份副本与同名两义——`pad2` 五处（appapi/imdrawer/
immsg/timefmt/ui）、`querySelector('video')` 20 处跨 8 文件、`imdrawer.relTime`（抖音式）与
`timefmt.relTime`（原生四档）同名两义；另有零引用死码（`ui.toggleFullscreen`、
`momentapi.momentPageUrl`、8 个无生产者 CSS 类）；`repostOf` moment 分支硬写 `cover:''`
与 panelitem 生产面（cover 透传）不对称；snapWatch 缺后台标签门；`npm test` 三段串行白等。

- **修法**：
  - `pad2` 归 `timefmt.js` 单源（appapi/imdrawer/ui 三处副本改 import；ui.fmtTime/fmtDurMs 顺带
    改走它）；**immsg 按零依赖叶属性豁免**（引 timefmt 即破叶——既有定案，本地副本留注释档）。
  - `imdrawer.relTime` 改名 `chatTime`（防与 timefmt.relTime 混用；调用点 :316 随改）。
  - `ui.videoOf(slide)` 单源（null 安全），`querySelector('video')` 20 处全数收口；controls 局部
    `videoOf()` 闭包退役（dmCreateBox 注入改写为 `function () { return videoOf(slide); }`）。
  - 死码删除：`ui.toggleFullscreen`、`momentapi.momentPageUrl`、styles 八类（dmpnote /
    space-more×2 / space-tip / cbtxt / mdetail-imgs×2 / mdetail-imgcell×2 / vsec×2）。
  - `repostOf` moment 分支 `cover: pi.cover || ''`（对齐 panelitem 生产面）。
  - snapWatch 补 `document.hidden` 门（后台标签不打扰，同徽标轮询约定；回前台下一拍自然续上）。
  - `npm test` 改 `test/run-all.mjs`：check/单测/harness 三段并行（本机 20 核实测 ~44s vs 串行
    ~54.6s），输出按任务名行级加前缀；CI 分步跑法不动（`npm test` 仅本地入口）。
- **测试证据**：新单测 `momenteditor-repost.test.js`（repostOf 三支形状 + cover 透传钉——
  **摘修复反跑**：moment 分支 cover 改回 `''` ⇒ 断言转红，还原复绿）；pad2/videoOf/改名/死码为
  等价改写，由 lint/check + 全量单测 + 65/65 场景兜底。README 依赖图 +2 边（ui→timefmt、
  imdrawer→timefmt）。lint/check + 319 单测 + 65/65 场景全绿。

### 0.9.242（2026-10-15）· hls 内嵌串压缩存储：产物 -176KB（-23%），每页少解析约 180KB

**病灶（体积账本实测）**：hls.light.min.js 以**原文**字符串内嵌（window.__ACSV_HLS_SRC__，
300,381 字节 = 产物 39.7%）——`@match www.acfun.cn/*` 每开一个站内页面（含不看视频的）
都要下载并解析这份脚本，是低配机的固定成本。

- **修法**（方案 B＝纯 JS 解压，兼容面归零）：build.js 改 `deflateRawSync(level 9)` + base64
  内嵌（raw 296,762 → 90,254 → b64 120,340），并注入 `window.__ACSV_HLS_LEN__`（原文字节数，
  完整性校验）；产物 **756,474 → 580,673 字节**（739→567KB，-175.8KB ≈ -23.2%），debug 同批
  1046KB→879KB。src/hls.js 新增 `unpackHls`（atob → fflate `inflateSync` → utf8 解码）：
  fflate 为纯 JS 实现（~3.8KB，随包，零浏览器新 API 依赖）；ensureHls 首调（懒）解包后照旧
  走三层装载；解包失败（缺串/截断/非法 base64/长度不符）静默下沉既有 CDN 兜底链——不新增
  失败形态。新埋点 hls.unpackMs / hls.unpackLen / hls.unpackErr。
- **解压库选型实录（单测抓出）**：先试更小的 tiny-inflate（~3KB）——其对**截断流死循环**
  （读越界按 0 位继续解码、destLen 无界增长，页面会被冻死；本批单测「半截串」用例实锤挂起
  30s+）；同用例 fflate 5ms 抛 `unexpected EOF`、随机脏字节抛 `invalid distance` ⇒ 换 fflate
  （仅 +736B）。教训：**库的失败模式也是选型指标**，损坏输入要摆上单测台面。
- **测试证据**：新单测 `hls-pack.test.js` 两条——往返还原 hls.light.min.js 原文（逐字节相等）
  + 5 类脏输入一律 null；harness `hls-lazy` 断言改压缩形态（packed>90KB + raw 区间
  250K~360K 钉 light 版不退回完整版）+ 新增 `hls-unpack-counted`（解包埋点在场的装载链自证，
  同 `hls-eval-counted` 体例）。**摘修复反跑**：unpackHls 直返压缩串 ⇒ hls-src-embedded /
  hls-unpack-counted 转红（装载退层 CDN，离线全灭），还原复绿。lint/check + 317 单测 +
  65/65 场景全绿。

### 0.9.241（2026-10-15）· 播放/计数「万」口径统一：ui.fmt 退役，全部走 timefmt.fmtWan

**病灶（静态复算实证）**：同一指标存在两套「万」口径——`ui.fmt` 走 `(n/10000).toFixed(1)`
（滑卡「次播放」/rail 赞评蕉藏/评论计数/我的页统计/精选网格等 10 件消费），出 `1.0万`、
11500→`1.1万`；`timefmt.fmtWan` 走整数半进位（面板网格卡/行卡/粉丝数），出 `1万`、11500→`1.2万`。
全量复算 [1万,300万]：两口径显示不同者 30 万个数字（约 10%）——尾随 `.0` 样式差 298,804 例、
真值分岔 1,196 例（全在 x.x5 半值，浮点 vs 半进位）；同一张网格卡族内部即分裂（精选走 fmt、
面板走 fmtWan）。

- **修法**（预览稿 `docs/preview/views-count-format.html` 裁决 **B**）：`timefmt.fmtWan` 为全站唯一
  「万」口径（原生实测背书：up-card 33235→3.3万 / 469000→46.9万；整数半进位无浮点歧义）；
  `ui.fmt` 与 `CFG.fmt.wanMin` 一并退役；10 个消费件（commentkit/comments/jingxuanview/momentbar/
  momentdetail/mypage/rail/reldrawer/slide/uppage）改 `import { fmtWan } from './timefmt.js'`，
  调用名同步更名；README 依赖图 +8 边、模块表 ui 行去 `fmt`；注释旧名 `fmt()` 订正（playitem）。
- **测试证据**：单测补两条口径分界断言——`fmtWan(11500)='1.2万'`（toFixed 口径会给 1.1万）、
  `fmtWan(999949)='100万'`（不出现 100.0万）；**摘修复反跑**：把 fmtWan 临时还原为 toFixed 实现
  ⇒ 两条断言转红，还原复绿。lint/check + 315 单测 + 65/65 场景全绿。

### 0.9.240（2026-10-15）· 私信条＝纯文本宿主（隐藏格式键/颜色键）

**用户实报**：「私信不支持富文本编辑，私信界面应该隐藏相关图标」——这是 0.9.238 给三宿主统一上
富文本时的**回退**（旧 textarea 时代私信本就没有格式能力，换富文本后工具栏给所有宿主都摆了 B/I/U/S + 颜色键）。

- **依据（代码内自证，非猜测）**：私信 wire 方言＝**纯文本 + 表情令牌**——收侧渲染就是
  `emotify(linkify())`（`src/imdrawer.js` 的 `imTextHtml`），官方客户端同口径；分享消息还要刻意用
  `ubbPlain` 压平成明文「只求官方可读」（`src/immsg.js:232`）。⇒ 发 `[b]`/`[color]` 给对方看到的是
  **字面标签**。表情/图片不受影响（`[emot=acfun,id/]` 是官方 IM 方言；图片走独立图片消息）。
- **修法**（inputbar 新增 `opts.insertOnly`）：不摆 4 个格式键、颜色键（split 三件）与**两条**竖分隔线，
  工具栏只剩插入键（表情 / 图片）+ 字数；**分层形式与 84px 高度保留**（空态不跳版、宽窄一套版式）。
  同时**拦掉浏览器自带的 Ctrl/Cmd+B/I/U**——工具栏没这键也不该让编辑期看着是粗的而对方收到 `[b]`。
  实现方式＝格式键/颜色键「先建后落位」：键对象仍建（`syncFmt` 遍历无副作用、`hideCol` 等回调不变），
  只是 `insertOnly` 时整组不 append——避免大改装配顺序引入回归。
- **评论条 / 动态编辑器不变**（那两处是 UBB 正文，格式会被渲染）。
- **测试证据**：新增 `im-open` 两条断言（结构：`plain=true` 且 格式键 0 / 颜色键 0 / 分隔线 0 / 插入键 2；
  行为：Ctrl+B/I/U 的 keydown `defaultPrevented` 且不带修饰键的 `b` 照常放行）——
  `imDrawerSmoke` 钩子补 `plain/fmtKeys/colKeys/seps/insertKeys` 五项；预览稿加 v3 备注与私信纯文本实例。
  摘修复反跑：把 `insertOnly` 摘掉（私信条恢复全工具栏）⇒ `im-open` 两条断言转红，还原复绿。
  全量 lint/check + 315 单测 + 65/65 场景全绿。

### 0.9.239（2026-10-15）· 颜色面板与图标 UI 对齐官方（真机实测）

用户 2026-10-15 点题「字体颜色面板与图标 UI 与官方的不同」→ 进计划模式做真机取证
（内置浏览器带登录态开 `/moment/am5110765` 读 live DOM + CSSOM，另读 CDN `@ac/umeditor` 交叉验证，
结论入档 docs/api-research.md §11.10），四件经用户裁决后按推荐项实现；预览稿 v2 先行、
用户逐项实拍复核（抓到色条偏右 7px、暗色格边过淡两处）后才进 src/。

- **颜色面板＝官方全量 70 色**（inputbar/styles）：`主题颜色` 6×10（Office 2007 主题表）+ `标准颜色` 1×10，
  两个行标题；10 列、格 14×14、列距 18（格内 margin 0 2px = 官方 `td{padding:0 2px}`）、
  首行后 10px、面板 216 宽 / padding 10px 18px / 圆角 5 / 顶上指回颜色键的三角；
  **仍向上开**（输入条恒贴宿主底边；官方向下开是配它"工具行在编辑区下方"的布局）。
  色值表导出为 `THEME_COLORS/STD_COLORS`（单测直采，改一处必须同步）。
  副产物：官方表里**没有**强调红 `#fd4c5d` ⇒ 品牌红退出色板（按"官方全量"裁决）。
- **颜色键＝官方 splitbutton 三件**（inputbar）：主键 18×18（点=应用当前色，不弹面板）+
  箭头键 14×18（点=开/收色板，开时按官方 `.edui-active` 亮起）+ 键下当前色条 16×2 圆角 1；
  箭头用官方 caret 字形 **E166**（imicons 新增 edCaret；12px + `transform:scale(.6)` 同官方用法）。
  **色条初值＝编辑区当前字色**，走 CSS 变量 `--acsv-edit-fg`（暗 #e8eaee / 浅 #333）——JS 只在选过色后写内联，
  省掉"建条时机拿不到皮肤"的坑。
- **键几何/状态色全套对齐**（styles）：键盒 24×24 → **18×18**、间距 gap 4 → **右距 8**、
  竖分隔线 1×16 → **1×18 且两条**（S 后 / 颜色键后，官方 `#dcdcdc` 的暗色同族 `rgba(255,255,255,.18)`）、
  悬停从"转强调红"改**只提字色**（暗 `#cfd3da→#fff`；浅色照官方 `#666→#333`）、
  激活从"红底红字"改**浅底+深字**（暗 `rgba(255,255,255,.12)`+`#fff`；浅色官方 `#e5e5e5`+`#333`）。
  **行高仍 24px ⇒ 输入条总高 84px 不变**（三宿主底部占位零变化）。
- **两处实拍修正**（用户复审预览时抓到，均已钉进 harness）：
  ① **色条偏右 7px** —— 官方 label 是**主键（18 宽）的子元素**（`left:50%` 相对主键 ⇒ 居中于 A 字形，
  实测 key[430,448]/label[431,447] 同心 439）；我们首版挂在 32 宽的 split 包裹层上 ⇒ 偏右。已改为挂主键内。
  ② **暗色格边过淡** —— 官方 `#e5e5e5` 是白底取值（给浅色格划轮廓），暗色面板上要划的是近黑格，
  16% 白几乎看不出 ⇒ 暗色取 `rgba(255,255,255,.34)`（对照实测定档），浅色仍用官方原值。
- **图标**：8 个字形（7 键 + 箭头）码点与官方**逐像素相同**（canvas 比对 pixelDiff=0，对照组 ≈1200），
  故只补 E166、字体仍走 `acfun-frontend-next`（零新增资源；官方那份是内联 subset，不必照抄）。
  **事实更正**：本稿 v1 写的依据"官方也是工具条在上"与实测相反（官方在编辑区下方、与「发送评论」同排），
  已在预览稿改口（形态本身是 2026-10-14 裁决，未动）。
- **回归危险区修正**（实现中发现，harness 抓出）：`hideCol` 仍写 inline `display:none`（与新的
  `.on` 类双写 ⇒ 类名残留）；箭头键的开关判据还在读 inline style（面板打不开）。两处一并收口为
  "显隐只认 `.on` 类"。
- **测试证据**：composer-rich 41 → **49 断言**（新增：4 格式键 + split 三件 + **两条**分隔线的结构、
  键盒 18×18/右距 8/分隔线 1×18/split 32 的几何、色板 70 格 7 组 ×10 + 两个行标题 + 格 14×14 +
  列距 4 + 面板 216 宽、**色条中心 == 主键中心 ±1px**、色条初值＝编辑区字色、主键点击不弹面板、
  箭头开面板并按官方亮起、点官方主题红 `#c0504d` 出口 `[color=#c0504d]`、色条跟色、面板收起、
  **暗色格边 alpha ≥ .3**）；detail-open/views `composer-toolbar` 按 v2 结构校准；
  moment-publish +1（浅色色板＝官方原值：格边 #e5e5e5/白底/分隔线 #dcdcdc/色条 #333）；
  单测 +3（新 `inputbar-colors.test.js`：70 格结构 / 逐格抄录 / 全 6 位 hex）。
  **摘修复反跑两轮全红**：A（色条挂回包裹层 + 格边 .16）⇒ `cr-collabel-center`（**dx=7.0**，正是用户实拍的那个偏移）
  + `cr-palette-cellborder` 红；B（主键也开面板 + 色板退回 6 列）⇒ `cr-colmain-no-pop` + `cr-colorpop-open`
  + `cr-palette-geometry` 红；还原复绿。全量 lint/check + 315 单测 + 65/65 场景全绿。
- **留档**：docs/api-research.md **§11.10**（官方工具行/色板全部实测数值与 CSSOM 原文、70 色全表、
  字形逐像素比对方法、暗色适配的取舍记录）；预览稿 `docs/preview/composer-richtext.html` v2
  （⑫ 实测对照表 + 两处实拍修正的注释）。**待真机抽验**：色板/工具行真机观感（本轮为读数非截图比对）。

### 0.9.238（2026-10-15）· 输入条富文本重写：textarea+镜像层 → contenteditable+出口序列化

用户 2026-10-14/15 就预览稿 `docs/preview/composer-richtext.html` 拍板：换成富文本编辑期
（上下分层 + 工具栏下分隔线 + 颜色键 + 原生字形图标 + 配图缩略块 + 编辑期表情 1em），
**依据＝官方实测**（docs §11.7/§11.8：官方评论编辑器就是主文档内 contenteditable + 出口
序列化 UBB，工具栏 `bold italic underline strikethrough | forecolor | emotion image`）。

- **载体替换（inputbar 重写，三宿主一处生效：评论 / 私信 / 动态编辑器）**：编辑期就是真实
  DOM 节点（表情＝`<img class="ubb-emotion">`、配图＝`.acsv-cinput-imgblk` 原子块、格式＝
  `<b>/<i>/<u>/<s>`），出口 `serializeUbb` 序列化回 UBB 提交。**病灶**（textarea 时代的
  自建补丁）：表情只是 17 字符文本令牌 ⇒ 退格会劈成 `[emot=acfun,123` 垃圾、拖选选中半个、
  方向键穿内部——为此养着镜像层 + 令牌原子化两件套；换载体后删除/选区/**撤销**全是浏览器
  原生行为，`composermirror.js` 与 `tokenedit.js` **随之退役删除**（tokenRanges 收进
  momentpost：出口文本的字数口径单源）。
- **工具栏**（预览稿 ①/⑪）：上行 5 格式键（B I U S + A 颜色）+ 细分隔线 + 表情/图片键 + 字数；
  图标改用**原生 iconfont 字形**（`acfun-frontend-next`，官方 UMEditor 同字体同码点：
  E18F/E19A/E1EA/E1E9/E1EB/E18B/E18A，登记 imicons.GLYPHS.ed*），弃自绘 SVG ⇒ 颜色随
  currentColor，深/浅两皮肤一套 CSS、零新增资源。色板 12 色、**向上开**（输入条恒贴宿主底边）。
- **出口序列化口径**（逐条对齐官方 Fe 序列化器）：`<b>/<strong>→[b]`、`<i>/<em>→[i]`、
  `<u>→[u]`、`<s>/<strike>/<del>→[s]`、行内 `text-decoration` 的 span → `[u]/[s]`、
  `<span style="color:#hex">→[color=#hex]`、`<img src alt>→[img=alt]url[/img]`、表情 img →
  `[emot=pkg,id/]`、`<br>→\r\n`、三连以上空行压两行、空包装去标记。字数＝文本 +
  **每个令牌块计 1**（官方 `getContentLength` 口径；配图块文件名不吃字数）。
  **渲染侧补四条**（ubb.js）：`[b]/[i]/[u]/[s]` 此前只写不认，自家发的加粗在正文按字面显示。
- **探针实锤的两处坑**（0.9.238 反跑证据）：① `execCommand('foreColor')` 把颜色写进**选区所在的
  既有标签**（`<b style="color: rgb(…)">`）而不是新包 span ⇒ 序列化只认 span 会整条丢色，改「任何
  标签的行内 style 都读」+ rgb→hex 归一（渲染侧 [color] 限 hex）；② 清空后浏览器留占位 `<br>`
  ⇒ `:empty` 占位文案不出，refresh 时清"纯占位壳"（`<b></b>` 空包装不清，那是加粗意图）。
- **撤销策略**（预览稿 ⑤ 定论落地）：程序化插入（表情/配图）统一走 `execCommand('insertHTML')`
  ⇒ 进浏览器原生撤销栈，**不自建快照栈**；`Range.insertNode` 只作降级退路。
- **超字数＝硬拒绝**（预览稿 ⑩ 第 10 项）：字数转红 + 输入框描红边 + 发送键禁用；动态编辑器
  另出「已超出 N 字，请删减后再发布」提示行（服务端 140000 仍作兜底）。字数文案：评论/私信裸数
  （0 出空）、动态恒显 n/233、超限一律 n/max。
- **浅色第二皮肤补齐**（预览稿 ⑨）：此前 `.acsv-mp` 只覆盖输入条底色三条，工具栏行在浅色下
  没有取值（白底上几乎看不见）；本次按本块既有原生值逐条补 20 条（图标 #999 / 格式键 #666 /
  分隔线 #e6e6e6 / 配图块 #f0f0f0；唯一新色是选中底 rgba(253,76,93,.12)）。
- **死后即删**：styles.ICONS 的 `image`/`smiley` 两条（唯一消费方是旧输入条，工具栏改原生字形后
  再无引用）随本批删除；`composermirror.js`/`tokenedit.js` 两件与 tokenedit 单测整件退役。
- **归类与纪律**：inputbar 由基建层改入特性层（富文本后它认识表情域与出口 UBB 方言，同
  sharepanel/rail/slide 的 0.9.233 先例）；粘贴只做**最保守纯文本化**（官方 filterRules 全集
  仍未实测，未照抄）；表情面板插入落点改为调用方注入（原 textarea 版 insertAtCursor 退役）。
  模态内隐去输入条自带发送键（发布动作归脚行，避免两个「发布」）。
- **测试证据**：新增场景 `composer-rich`（41 断言：工具栏/字形码点/⑧ 序列化对照表逐条/字数口径/
  真键输入/工具键 B·U/颜色归一/表情真插入/删除与撤销/粘贴清洗/空态占位/回复态 data-ph/超字硬拒绝/
  Enter 端到端进 comment/add 的 body）；detail-open 的镜像层四条改夸 contenteditable 形态与
  度量钉（13/18/12 不变）；moment-publish 改走"面板点表情 → 真节点 → 出口令牌 → body"（内容断言
  从字面令牌改为序列化结果）、+浅色工具栏取值、×镜像层；im-open/imDrawerSmoke 选择器改 `.acsv-cinput-edit`；
  单测 +2（ubb 四条格式规则：写入/嵌套/空标记/未闭合）+1（tokenRanges 收编后）−4（tokenedit 退役）。
  **摘修复反跑**：撤回「任何标签读 style」与「插入走 execCommand」两处 ⇒ composer-rich 六条转红
  （含预览稿记录的双令牌错乱形态），还原复绿；全量 lint/check + 312 单测 + 65/65 场景全绿。
- **待真机抽验**（docs/api-research.md §11.9）：服务端对 `[b]/[i]/[u]/[s]` 的接受与回显、
  三宿主 84px 输入条的底部占位观感、配图缩略图在真机签名 URL 下直显、233 硬拒绝与官方软提示差异。

### 0.9.237（2026-10-14）· UI/Bug 专项 Wave 2：预览定稿八项（docs/preview/ui-bugfix.html）

用户 2026-10-14 预览裁决：窄视口底栏＝方案 B（横滑）；简介亮底可读性＝衬底 B（全宽轻衬底 .42+13px）；
简介行数＝2 行（不变）。本批按稿实现，预览稿留档。

- **简介组**（slide/styles）：① 「展开简介」只在溢出时挂（量 clamp 后 scrollHeight——短简介不再
  出现点不动的假按钮）；② 长串 `overflow-wrap:anywhere`（此前 URL 撑到 704px 被裁、展开也看不到）；
  ③ 字号 12→13 + 亮底衬底 B（`.acsv-info-scrim` 全宽 42% / .42，随简介有无显隐、影院态隐藏、
  点穿透）；④ 「展开」`<a>`→`<button>`（点击区/键盘可达）；⑤ 点简介区不外冒（不再误触播放/暂停）。
- **窄视口底栏 B**（controls/styles）：按钮行内容包进 `.acsv-ctl-strip`，超出时 **transform 平移**
  （不用 overflow 滚动——那会形成裁剪上下文把清晰度/倍速菜单裁掉）：pointer 拖拽（>6px 进拖，
  落点 click 吞掉防误触）+ 竖向滚轮映射横滑；宽屏 strip=100% 行为不变。540 实测内容 626 vs
  容器 512（maxX≈114）。
- **私信抽屉 z 层级**（styles）：`.acsv-msgdrawer{z-index:62}` 原先声明在共享规则**之前**被同权重
  58 压掉——详情面板(z61)上开「捎句话」被盖住点不到。修法＝把 62 挪到共享规则之后；computed
  断言钉住。
- **设置面板三连**（settingspanel）：① `font:13px/1.4 inherit` 非法简写整条被丢（36px 行高从未
  生效）→ 拆成 font-size/line-height/font-family 三属性（btn/item/num-btn 三处）；② 下拉点外
  收起（closeOnOutsideClick，Shadow DOM 外点/别行点击都收）；③ 矮窗贴底时菜单上翻
  （`.set-sel-menu.up`，实测空间不足才翻）；④ Esc 先收菜单不关面板（overlay 新增层级 `onEsc`
  预处理器，返回真=已消费）。
- **音量竖条初始态**（playback/controls）：新键滑杆不画初值 ⇒ 首悬停/新建 slide 是空轨而数字是
  真值。修法＝抽 `fillVolSlide` 单源（refreshMuteIcons 同用），buildVolSlide 建完即填。
- **编辑器表情预览定位**（styles/emoticon）：0.9.226 面板改 static 后绝对定位预览逃到浮层根
  （实测悬停条目 (531,408) 预览出在 (82,4)）→ `.acsv-me-emot` 改 `position:relative`（仍在
  文档流）恢复锚点；并加「上方放不下 → 翻到条目下方」（首行不再盖住自己）。
- **弹幕画布暂停重排**（dmcanvas/comments）：align 只在 paint 里跑、暂停时 rVFC/rAF 双停 ⇒ 开
  评论抽屉/拉窗口后画布停在旧几何。修法＝`DmCanvas.realignAll`（图层表遍历 realign）+ 抽屉
  开合广播 `acsv-layout-shift`（零 import 边的跨模块提示，含过渡后 330ms 补拍）+ resize 监听。
- **表情面板底栏拖动**（emoticon/styles）：原先藏滚动条又无拖拽（鼠标只能连点 ‹ ›）→ pointer
  拖拽 + 竖向滚轮映射横滑 + grab 光标。
- **测试证据**：homeswitch +4（短简介无按钮/长简介有按钮/overflow-wrap/衬底）、deeplink 短简介
  断言按新行为校准（deep-desc-ui/no-fake-toggle）、detail-open +1（msgdrawer z=62）、settings-open
  +3（36px 行高/外点收起/Esc 只收菜单）、ctl-typing +1（音量初始填充）、新场景 `ctl-narrow`
  （横滑/拖拽/滚轮/菜单不被裁）、moment-publish +4（预览锚回面板/首行与行2 下翻/底栏拖动）、
  dm-smoke +1（realignAll 暂停跟几何）。摘修复反跑：上述各处全部转红后还原复绿；全量 lint/check
  + 313 单测 + 64/64 场景全绿。

### 0.9.236（2026-10-14）· UI/Bug 专项 Wave 1 第三组：列表重臂/自愈/竞态六件

- **视口回填后「展开」重复/陈旧**（rowkit）：回填替换正文会清 `_armed` 重臂，旧按钮不摘 ⇒
  新文仍溢出时叠成两枚、新文变短时留陈旧件。修法＝重臂前先摘旧 `.acsv-fmore` 再量。
  反跑：还原 ⇒ `bf-expander-dedup` 红（n=2；夹具首条文案加长触发溢出）。
- **空间页「动态」标签死标签**（spacemoments）：站点 SPA 重画只吞一半（留卡丢面板/反之）或
  换 uid 卡幸存时，inject 见卡即 true + ensureList 见 feed 即早退 ⇒ 新面板永久空白。修法＝
  inject 校验「卡+面板+uid」三元并清残件重挂；ensureList 幂等判据升级为「列表根仍在本面板里」。
  反跑 ⇒ `sm-heal-panel`/`sm-heal-rows`/`sm-heal-both`/`sm-heal-both-rows` 红。
- **分区页快速 A→B→A 旧回包混入**（jingxuanview）：`st.tab` 检查在切回后失效 ⇒ 晚到旧代把
  首页再叠一份（复现实测 cards=48/dup=18，重复段随缓冲放行才上屏）。修法＝请求代数 `st.gen`
  （switchTab 递增、回包校验代数）。反跑 ⇒ `jx-stale-gen-dropped` 红。
- **观看历史触底叠发**（mypage）：一拍多枚 scroll 各自 load（骨架叠闪 + 同页多请求）。修法＝
  `loading` 在途守卫（同页 adminTab 既有范式）。反跑 ⇒ `hist-single-flight` 红（calls=3→1）。
- **隐藏 tab 被连带触底**（listtail）：我的页四 tab 共用一个滚动体，滚动可见 tab 会把隐藏
  tab 的 onBottom 一并派出（后台空拉）。修法＝onScroll 加宿主可见性判据（offsetParent）。
  新增单测 `test/unit/listtail.test.js`（3 例）；反跑 ⇒ 隐藏宿主派发断言红。
- **私信列表轮询重置搜索**（imdrawer）：新消息刷新 `renderList('',…)` 把过滤清掉并回顶。
  修法＝刷新保留搜索词与 `listBody.scrollTop`。**无 harness 钉**（IM 列表无测试缝，smoke
  钩子不驱动轮询）——标**真机待验**。
- **测试证据**：+7 harness 断言（bf 1 / space 4 / jx 1 / my 1）+ 3 单测；上述五处反跑全红后
  还原复绿；全量 lint/check + **313 单测 + 63/63 场景**全绿。

### 0.9.235（2026-10-14）· UI/Bug 专项 Wave 1 第二组：播放层控制打空 + 输入保活

- **播放层控制三件套打空**（层内 slide 不在 scroller 里，三处旧写法只扫 scroller/FeedStore）：
  - 倍速菜单（controls.js）：层内选倍速只改按钮与 toast，画面码率不变；修法＝`playback.applyRate`
    全舞台单源（root 遍历；与 0.9.183 连播键同款先例）。
  - 长按→松手恢复（input.js）：层内长按后松手不恢复原速（toast 宣称已恢复）；同走 applyRate。
  - 弹幕开关（controls.js）：按钮只翻全局开关，onChange 回调按 `FeedStore.current` 找"当前条"——
    播放层开着时打的是背后隐藏的竖刷条（层内开关变死键、图层不停）；修法＝`activeDmContext`
    经 `state.videoTarget`/`playItem` 中介解析（有层打层内、不回落竖刷）。
- **弹幕输入聚焦中控制栏保活**（controls.js）：隐藏判据只有"视频在播"，打长弹幕/输入法选词超
  2.5s 整条栏连输入框一起隐藏＝盲打；修法＝焦点在 slide 内可编辑元素时保活重排（同 _volOpen 体例）。
- **撤一条未成立的猜测**：普查疑「层内 fullscreenchange 把隐藏的竖刷回正归零」——探针实测
  scroller display:none 时写 scrollTop 是空操作、关层后位置原样（反跑无法转红），按「不写猜测性
  实现」撤掉守卫与用例（案例代码处留注防重走）。
- **测试证据**：play-deep +4 断言（倍速生效/还原、长按 2x、松手恢复、层内弹幕开关连带图层
  停/起）；新场景 `ctl-typing`（聚焦 4s 持续采样保活，负例避开视频循环 playing 的重亮干扰）。
  摘修复反跑：ctl-layer-rate-applied（rate=1）/ctl-hold-restored（rate=2）/ctl-dm-layer-off
  （on=true run=true→true）/ctlt-keepalive（ctl=）四处全红后还原复绿。全量 lint/check +
  310 单测 + 63/63 场景全绿。

### 0.9.234（2026-10-14）· UI/Bug 专项 Wave 1 第一组：输入链与上报链八件

来源：全仓 UI 隐患普查（4 路源码扫描 + 实测探针）后的修复清单第一组。每件都配 harness
断言并做**摘修复反跑**（下述反跑结论均为本批实测）。

- **镜像幽灵文本**（comments/imdrawer 四处）：发送成功/切会话/失败回填原先只改 `input.value`，
  textarea 文字透明（显示全在镜像层）⇒ 已发送文字"幽灵残留"、切会话看到上会话草稿。
  修法：`inputbar.setText` 单源（值+高度）+ `decorateInput` 包一层补镜像重画。
  反跑：还原直写 value ⇒ `detail-input-cleared-mirror` 转红（v="" mir="详情面板的测试评论"）。
- **IME 组合期守卫 ×2**（danmaku.js / inputbar.js）：Enter 不判 `isComposing` ⇒ 中文选词回车
  把半成品发出去。修法：组合期只挡冒泡不动作（tokenedit 纪律②同款）。新场景 `dm-ime`
  正负双向钉（组合 Enter 不发 + 真 Enter 照发）；extend detail-open 同断言。
  反跑：还原 ⇒ `dmime-ime-enter-blocked`/`detail-ime-enter-blocked` 转红。
- **上传失败提示被立刻抹掉**（momenteditor）：链式收尾 then 在 pending=0 时清空 tip，失败文案
  一闪而过。修法：本次失败标记阻止收尾覆盖。反跑：还原 ⇒ `pub-upload-tip-persists` 转红。
- **waiting→error 竞态**（session）：error 落地后 300ms 在途转圈定时器把状态反盖成 loading
  （转圈盖住重试盒）。修法：`setState('error')` 清 `_waitTimer` + 定时器回调判 error。
  新场景 `waiting-error-race`；反跑 ⇒ `race-error-holds` 转红。
- **dispose 上报恒归零**（session/player）：`removeAttribute('src')+load()` 先于 `onDisposed`
  ⇒ 钩子读 currentTime 已是 0（本机 Chromium 实测 1.278s→0），低于门槛被静默丢弃。
  修法：拆源前快照 `session.lastT`，`reportLeave(session,null,'dispose',lastT)`。
  反跑 ⇒ `dispose-reports-lastT`/`dispose-lastT-value` 转红（watch 不增）。
- **弹幕高级泵泄漏**（danmaku/dmcanvas）：图层 destroy 后 interval 空转并持有死 video 闭包
  （直到整页退出才由 stopAll 清）。修法：dmcanvas `destroy` 增 `onDestroy` 出口回调，
  danmaku 借它 `stopAdvPump`。dm-smoke 反跑 ⇒ 出口断言转红。
- **mergeDanmaku 原型键**（dmcanvas）：`{}` 哈希读 `__proto__` 命中 Object.prototype ⇒
  `at - prev` 变 NaN，该文本**永不去重**。修法：`Object.create(null)`。单测加原型键用例。
- **评论点赞三态单源**（commentkit/comments）：取消赞只 +0 不减；且取消后 `isLiked` 仍为 true
  ⇒ 再点仍走取消方向、**回赞不了**。修法：`commentLikeState` 三态（localLike 覆写 ?? 服务端字段）
  单源，kit 渲染与 toggle 共用；反跑：还原 ⇒ `square-cmt-like-off-dec` 转红（0→0→0）。
- **测试证据**：新增 2 场景（dm-ime/waiting-error-race）与 8 条断言（含 watch-playlayer-pagehide
  的 dispose 上报两断言）；摘修复反跑上述 8 处全部转红；全量 lint/check + 310 单测 + 62/62 场景全绿。

### 0.9.233（2026-10-14）· 分类债专项收敛（sharepanel/rail/slide 一次登记）+ 契约面 tsc 扩面 10 件

- **病灶（两条既有债，一次清）**：① 方向棘轮唯一在册例外 `sharepanel → momenteditor`——0.9.222
  判定「三件分类不该在功能批里连环重分类」，债留专项；② 契约面类型检查自 0.9.188 起停在 10 件
  （roadmap A4 待办），扩面卡在没有环境全局声明（GM_*/__ACSV_* 等），逐文件 @ts-ignore 噪音大。
- **修法一（方向）**：`sharepanel/rail/slide` 三件一次计入 FEATURE——特性层 UI 件（消费方只认
  openSharePanel/buildSlide 等出口），README 图中位于播放层 others/私信层 subgraph 是**出身
  placement、不是专属域**（immsg/imicons/ubbtext 校准先例）。+3 前按真实边集重放：全部入边 =
  comments/imdrawer/momentdetail/rowkit/playlayer（FEATURE）+ player（SKIP_B）⇒ 无新红。
  KNOWN 复归 []，口径 A/B 双 0。**反跑**：暂摘 sharepanel ⇒ 未登记转红（exit 1），还原复绿。
- **修法二（类型）**：新 `types/globals.d.ts` 纯声明件（项目「不写 .ts」唯一例外，jsconfig 头注
  已记：只声明不运行、不进产物不进依赖图）+ 10 契约件挂 `// @ts-check`（feedstore/session/net/
  api/settings/levelstack/playstate/immsg/commentkit/ubbtext）。实测 17 条错误全为环境全局
  （GM_xmlhttpRequest/GM_getValue/GM_setValue/__ACSV_DEBUG__/window.__ACSV_MOCK_*/
  WebKitMediaSource），0 条逻辑/类型错误。**反跑**：摘掉 d.ts → 17 条原样转红。
- **测试证据**：全量 check + 310 单测 + 60/60 场景全绿；checked 件 10 → 20 件；处置记录见
  docs/dependency-audit.md「0.9.233」节。

### 0.9.232（2026-10-14）· 正式产物开 minify——1.02MB→725KB（-29%），每个站点页面少解析约三成

- **病灶（量化）**：正式产物 1,046KB 全量缩进源码。`@match https://www.acfun.cn/*` 且
  `document-end` 注入——每开一个 A 站页面都要解析这整份脚本（大头是内嵌 hls light 字符串 +
  缩进源码），是所有站点页面共担的固定开销，低配机主线程负担随之。
- **修法**：正式构建开 esbuild `minify: !debug`（调试版保持可读，DevTools 读 `__dbg`/对照源码
  照旧）。banner/footer 由 esbuild 原样插入、不参与压缩：userscript 头 / `@version` / 内嵌 hls
  串 / `'use strict'` 包壳全保留（构建前后实测核对）。只改写法不改语义。
- **测试证据**：`check-release.mjs` 增尺寸断言（正式产物必须 < debug×0.9）；**摘 minify 反跑：
  1,046,448B vs 1,046,583B ≈ 99.99% ⇒ 断言转红**，还原后 742,471B/1,046,583B ≈ 71% 恢复绿。
  全量：check + 310 单测 + 60/60 场景（smoke/resolvefail 走压缩后 release）全绿。
  **真机待验**：Tampermonkey 装 0.9.232 开竖刷页冒烟——压缩产物首上真机（harness 仅两场景覆盖
  release，其余场景走 debug）。

### 0.9.231（2026-10-10）· issue #1 收口：滚轮路不在 0.9.216 射程内——落位兜底自愈（视口必须落在吸附点）

- **报障者回帖对账**（issue #1，2026-10-10）：**滚轮**切换 / **单次**即停 / **永久**卡两视频之间 /
  Win10+Edge 100 / 频繁；两张截图相隔 **11 秒**同一现场：视口静止在 ≈半屏偏移处（两视频各露一半）、
  上条视频仍在播。**判读：0.9.216 修的是脚本落位路（`landAt`）——源码注释自己写着「滚轮/触摸走原生
  滚动，根本不到这里」，他的路不在那次修复射程内**（不是回归）。
- **双引擎真滚轮实测**（临时探针，`test/tmp-probe/` 已 gitignore）：现役 Edge 155 + 旧内核
  Chromium 101（Playwright 1.21 rev1000，贴近报障者 Edge 100 内核代），静态复刻页与真实 app 两条路
  × 单齿/三齿/甩 8 齿/平滑滚轮事件流（小 delta 长串）/大滑档/CPU 降速 ×4——**正常滚轮打法全部落回
  吸附点，报障者现场的具体诱因本地未复现**；但**现象类复现成功**：飞行中一次 auto 落笔到非吸附位
  ⇒ 视口**永久**停在两吸附点之间（现役引擎复刻页：top 恒 1713、4s 纹丝不动、snap 不补；与 0.9.216
  p7 结论一致）。另见：同配方在旧内核复刻页**能走完到吸附点**、真实 app 页也会被后续滚动结束吸附
  ——撕裂后是否滞留随引擎/在飞 DOM 时序而异，正是「不可控的制造者、可控的最终态」。
- **修法（钉结果不变式，不猜病根）**：把 0.9.216 的 debug 专用探测器升级为 **release 常驻落位兜底**——
  每 600ms 采一次，连续两次 `scrollTop` 不动（真静止）∧ 不落在任何带 `data-idx` 子项 `offsetTop±2`
  ∧ 距最后一次滚轮/触摸 >900ms（手势刚收、吸附未落不抢）∧ 舞台可见（视图态无布局盒，全体「非吸附」，
  必须排除）⇒ **按最后一次手势方向补齐到吸附点**（瞬时落位，同 `landAt` 免疫手法），频控 2s；
  不改 `FeedStore.current`，游标交回 IO 正常推进。`input.js`：滚轮/触摸记方向
  （`__acsvLastInputDir`：+1 下一条 / -1 上一条）+ `touchmove` 盖时间戳（长拖拽期不误判「手势已收」）。
  `land.stuck` 口径不变（现象计数照旧先记），新增 `land.heal`（自愈笔数）——真机判读先看 `land.watch`。
- **测试证据**：`land-near` 场景 +4 断言——自愈出手且落回某吸附点（吸附保持解除着 ⇒ on-snap 只可能
  是脚本写的）、手势未收不许出手的负例（持续打时间戳 1.4s，位置纹丝不动）、方向戳两向翻牌。
  **摘掉自愈动作整块反跑：`land-heal-acted`/`land-heal-on-snap` 双双转红**（top 停在 1080 不回）。
  全量：60/60 场景 + 310 单测 + check 全绿。**真机待验**：报障者装 0.9.231 debug 复现时对账
  `land.stuck`≈`land.heal`（现场自愈计数）与 `land.near`（滚轮路应恒 0）。

### 0.9.230（2026-10-10）· 视口回填收口——真凶是 `var` 闭包共享绑定；3h 那套退役

（0.9.229 从未公开发布：release 发出即撤、tag 已清；本节是其最终态合并记录。）

- **病灶两层，第二层才是真凶**（0.9.229 那版"首屏绿"其实一直是 3h 那条路在罩着）：
  ① IO 传了 `root: 视图体元素`——本项目三个既有 IO 先例（评论翻页哨兵/图片懒加载/搜索哨兵）**统统用
  视口 root**，元素 root 在本 harness 下**回调不触发**；改成 `{ rootMargin: '200px' }`（"进入视口"本就
  该以视口为准，且两种滚动方言都适用）。
  ② **`var` 闭包共享绑定**：IO 回调里把行直接排队——`bfQueue.then(function(){ backfillRow(row, pi.momentId) })`
  的 `row`/`pi` 是 `var`，**本批所有排队闭包共享同一绑定**，异步执行时全指向**本批最后一条 entry**
  ⇒ **每批只补最后一行、其余静默漏掉**。实证（harness 首屏 24 行）：`moment/detail` 6 次请求**全打在
  第 5 行**（探针 `hit=[5]`）、首行正文原地不动；真机滚动天然分小批（每批常 1~2 行）⇒ 看着"正常"，
  其实是"每批最后一行的错觉"。**修法＝按行传参封装 `queueBackfill(row, mid)`**（最小修法）。
- **弃用两条非承重修法**（试过、实测无它们同样全绿 ⇒ 不写猜测性实现）：`requestAnimationFrame` 包裹
  observe（观察发生在 append 之后，IO 在下一帧渲染步骤里算交叉，布局已完成）、首屏全量兜底扫描。
- **退役 3h 新鲜度那套**（视口成为唯一触发）：`cfg.view.square.freshMs`/`view.moments.freshMs`、
  `squarePageOf`/`profilePageOf` 的 `freshIds` 产出、`squarefeed.refreshOne` 及消费点、相应单测断言
  ——全删；`view-square` 旧契约两条改口径（`square-fresh-inject` → **`square-vp-inject`** 视口口径、
  `square-fresh-skip-old` 删）；注释与 README 两处模块表同步收口（squareview/squarefeed/momentapi/
  cfg/momentbar/panelitem）。
- **测试证据**：独立场景 `bf-viewport`（24 条夹具：前 2 条 1h、其余 **20h**——仍在 24h 窗内、远超旧
  3h 窗）钉三件：首屏可见行即补 / **老条目滚进视口同样补** / 每行只补一次（来回滚两趟调用数不涨）。
  **摘闭包修复反跑**：`bf-first-row`（列表明文0）与 `square-vp-inject` **双双转红**；还原后全绿。
  全量：**60/60 场景** + 310 单测 + check 全绿。
- **真机待抽验**：四处宿主（广场/我的/空间页/原生内嵌）挑**几小时前的老动态**看表情是否随滚动出现
  ——本批核心即"老条目也有表情"，而此前那轮真机验证时 3h 那条路还在。

### 0.9.228（2026-10-10）· 动态流回填统一为「视口渐进」——四处一处改，老条目也有表情

- **用户裁决**：不做"≤3h 一刀切"，**四个动态面**（广场视图 / 「我的」页动态档 / 空间页「动态」标签 /
  原生 `/member/feeds` 内嵌广场）统一成**视口渐进回填**、**一套规则**。理由（双方确认）：3h 那套的毛病
  不是请求量（一屏也就 1~5 条新鲜）而是**覆盖率** —— 3 小时以外的条目永远拿不到正文（表情永远不见）。
- **修法（只改一处）**：四处宿主**本来就都走 `createSquareFeed`** ⇒ 在工厂内把触发从 `freshIds`（3h）换成
  **IntersectionObserver**：谁进入视口谁补（不论新旧），提前 200px 预取。四条纪律同时写进同一处：
  ① 每行只补一次（`row._bf`）；② **串行队列**（并发 1）；③ 失败静默且**不重试**（保持列表快照）；
  ④ 停用即断（`stop()` 里 disconnect）。结构上把 `refreshOne` 拆出**行级** `backfillRow(row, mid)`
  （拉详情 → patch 互动态五件 + **正文** → 重绘该行），`refreshOne(mid)` 退化成"按 id 找行"的薄包装
  （**保留到下一批退役**；两路共享 `_bf` 标，不重复拉）。
- **顺带治好一处老毛病**：补详情走 pc-direct **带登录态** ⇒ 免登录列表里恒 false 的
  `isLike/isThrowBanana` 随视口点亮（此前只有 ≤3h 的条目有这待遇）。
- **教训入档**：`winScroll` 这个方言变量**已在 0.9.219 随"触底/回顶方言"迁进 `listtail`**，新代码不能再引用
  （本轮 ESLint `no-undef` + 8 个场景转红即此）——"老变量已迁走"的坑要先 grep 再写。
- **测试**：全场景 **59/59** + 310 单测 + check 全绿。**行为断言未加**（按承诺：视口回填的断言要用
  **新增独立场景**补，不再插进 `view-square`——0.9.227 插坏场景是教训），列为遗留第①项。
- **本批遗留**：① 视口回填的独立 harness 场景；② 退役 3h 那套（`freshIds` 与两处页规整里的新鲜度判定）；
  ③ 真机四处抽验（挑**几小时前**的老动态看表情是否随滚动出现）。

### 0.9.227（2026-10-10）· 动态流的表情根因定案 + 回填补正文（列表里看得见表情）

- **根因（一整轮排查后定案）**：APP 域两个动态**列表**端点（`feedSquare` V1/V3、`feed/profile`）的
  `moment.text` 是**明文**（表情被服务端剥掉），**整包连 `[emot=` 都没有**（按字段逐条 dump 过：`feedSquareV3`
  的条目 23 键 + moment 10 键全列，`anyEmotAnywhere: false`）；而 **`pc-direct` 的详情端点
  （`moment/detail`）带 UBB 原文** ✓，`pc-direct/feed/followFeedV2`（关注流）也带 ✓。
  拆包佐证：广场的 moment bean `TagMoment` 只有 8 个字段（`text` + `replaceUbbText` + imgs/计数），
  **没有第三个正文字段** ⇒ 不是"字段没找对"，是**列表端点这份数据里就没有表情**。
  这也解释了"关注视图一直好、广场与我的页动态档一直不好"——前者走 pc-direct 关注流 ✓。
- **修法（零额外请求）**：`squarefeed` 本来就为 **≤3h 新鲜条目**拉 `moment/detail` 补互动态真值——
  **只是把回包里的正文丢掉了**（注释原文：「只同步互动态五件（正文方言不换）」）⇒ 本批让
  `momentDetailStateOf` 一并取 `text`，`refreshOne` 顺手把正文换上并**重绘该行正文**（清 `_armed`、
  重挂「展开」判定）。**这一发请求本来就在发**，所以列表侧"看得见表情"是**零成本**的。
- **未做（下一刀）**：① 视口渐近回填（把同一个回填件的触发从"≤3h"扩到"进入视口"，覆盖老条目）；
  ② 广场换源/补头集（实测：V3+mkey+设备头都仍是明文；「APP 广场能渲染」经复核为**关注流/详情**，
  非广场）；③ harness 断言（本批试加一段插入式断言把 view-square 场景**提前抛错**，已回退；
  回填行为目前由单测 `momentDetailStateOf` 钉住，harness 断言留待补）。
- **测试**：单测 310 全绿（`momentDetailStateOf` 增收 text：有值/缺省空串两态）；全场景待跑。

### 0.9.226（2026-10-10）· 编辑器表情面板归位（不再跑到屏幕底部）+ 原生页浅色皮肤

- **病灶（用户实报，附截图）**：在编辑器里点表情，面板**跑到屏幕最底部、通栏**，与编辑器分离。
  根因：`.acsv-emotpanel{position:absolute;bottom:57px}` 是**给抽屉输入条定的口径**，而模态里
  `.acsv-me` 没有定位上下文 ⇒ 面板锚到浮层根、钉在视口底部。（**预览稿里画的是"贴在输入区下方、
  模态内"——实现和稿子不一致，是本批的教训**。）
- **修法**：面板在模态内**走文档流**（`.acsv-me .acsv-me-emot{position:static;max-height:220px}`），
  落在工具行与脚行之间。断言：面板矩形必须**落在模态矩形内**（`pub-emotpanel-in-modal`）。
- **原生页皮肤（用户实报「原生页的皮肤也不对，是暗色的」）**：从原生页浮标打开的编辑器此前写死暗色。
  修法：`openMomentEditor({light:true})` ⇒ 面板根加 **`.acsv-mp`**，**复用既有浅色规则全套**
  （输入框/镜像层/表情面板/图片块），再补模态外壳那几条（`.acsv-me.acsv-mp`）。浮标按宿主透传 `light`。
  断言：浅色打开 ⇒ 面板带 `.acsv-mp` 且外壳底色 `rgb(255,255,255)`、标题 `rgb(51,51,51)`。
- **表情「渲染不出来」的调查（结论：不是渲染链断）**：读回用户那条（am5110765）服务端存的是
  **`111[emot=acfun,2762/]`（原文照存、包名 acfun、id 2762）**；2762（「鼓掌」，属 `蛇年AC娘` 包）
  **确实在我们的表情数据里**（`getUserEmotion` 回包实测 `has2762: true`）。曾疑 mixed-content
  （该表情图 URL 是 `http://tx-free-imgs2.acfun.cn/...`），但实测 **http 与 https 都能加载**
  （Chrome 自动升 https）⇒ **该假设被自身探针否掉**。**待用户给现场**（哪一屏、显示成灰字「[表情]」/
  空白/裂图）才能定案——三种症状对应三条不同的路（map 未就绪 / 白名单拦 / 图 404）。
- 测试：`moment-publish` 22→26 断言（面板在模态内 + 浅色三连）；全场景 59/59。

### 0.9.225（2026-10-10）· 发布报错「无效的请求」修复（缺 APP 头集）+ 原生页浮标收进动态广场

- **病灶（用户真机实报「发布失败：无效的请求」）**：发布链只发了 `Content-Type` 一个自定义头。
  用同源探针四分格定位（都用空内容，**不会真发出去**）：

  | 请求形态 | 服务端回 |
  |---|---|
  | 仅 `Content-Type` + **无 Referer**（≈ GM 通道） | **`result 708`「无效的请求」** ← 实报的报错 |
  | 仅 `Content-Type` + **带 Referer**（≈ 0.9.223 那一枪的形状） | `140000`（内容为空）——**过了网关** |
  | **APP 设备头集** + 无 Referer | `140000` ⇒ 头集就是通行证 |
  | 只有 `kpn/kpf/productId` | `708` ⇒ 光这几个不够 |

  ⇒ 网关认「**Referer 或 APP 头集**，二者其一」。GM 通道没有 Referer（页面 fetch 才有）⇒ 脚本必须发头集
  —— 这也正是为什么第三方那个脚本要发一大套头，而 0.9.223 的同源验证**恰好靠 Referer 混过去了**
  （教训：同源锚点验证会掩盖"缺头"类问题；通道差异要单独验）。
- **修法**：`appapi` 导出 `appDeviceHeaders()`（**不另造第二份头集**：与读接口同源单源），`momentpost` 的
  `addMoment`/`deleteMoment` 都带上它；请求形状抽成**纯函数** `publishRequest(content, opts)` →
  `{url, headers, body}`，单测直接钉「头集在场 + body 形状」（防下次"改着改着把通行证丢了"）。
  另：`result 708` 分档成 `gateway`，编辑器话术「请求被网关拒绝（无效的请求）——通常是请求头不全」。
- **原生页浮标范围收窄**（用户口径「原生页只需要在动态广场出现」）：`pubfab` 挂进**内嵌广场容器**
  （`memberplaza.openPlaza` 里 `mountPubFab(mpRoot, {light:true})`），广场收起即随之消失；**不再常驻原生页**
  ⇒ `pubentry.js` 整个退场（0.9.224 那版是 body 级常驻）。
- **测试**：单测 309→310（新增 `publishRequest` 头集闸门）；`member-plaza` 增 3 条断言（**广场里**有浮标 /
  浅色语境 `right:24` / **广场收起后浮标消失**）；全场景 59/59。

### 0.9.224（2026-10-10）· 发布入口统一为右下角常驻浮标（钉在回顶之上）

- **用户裁决**：「发动态做常驻悬浮按钮，放右下角回到顶部按钮上面，在现有页面常驻」+「三处旧入口一并撤掉」。
- **新件 `pubfab.js`**：右下角一枚圆钮，三处宿主（我的页四档 / 广场视图 / 原生 `/member/feeds`）**同一机制同一位置**。
  撤掉 0.9.222 的三处旧入口：广场列表上方工具条 / 我的页 tab 行按钮 / 原生导航项（`pubentry.js` 随之收窄成
  `initNativePubFab()` 一件事——挂 body、fixed，站点 SPA 重画子树冲不掉 ⇒ **自愈观察器不再需要**）。
- **位置是实测校准的**（这是本批最值钱的一条）：初版按"回顶暗色 sticky bottom:18 + 高 36"推算出浮标
  `bottom:70`，却**压住回顶 14px**。根因：sticky 的基准是滚动容器的**内容盒**，而 `.acsv-view-body`
  有 `padding-bottom:30px` ⇒ 回顶实际占 [48,84]（从 viewport 底算）⇒ 浮标须 ≥84，取 **94**（错开 10）；
  浅色回顶是 fixed `bottom:28`+36 ⇒ 占 [28,64]，浮标取 **74**。预览稿的坐标表已同步成实测值。
- **层级 z:57**（另一条口径）：压住列表内容(55)/dock(56)/顶栏(57)，**但被抽屉(58)/动态详情(61)/编辑器(62)/
  大图(63) 依次盖住**——浮标**绝不盖住它自己打开的编辑器**。现有全局兜底胶囊 `#acsv-fab` 的
  `z-index:2147482990`（压一切）**明确不照抄**（那条规则留给"无壳页唯一入口"的场景）。
- **测试**：`moment-publish` 增 3 条断言——浮标存在、**旧入口已消失**（`.acsv-me-entry`/`.acsv-sq-tools` 都不在）、
  **几何口径**（滚过阈值让回顶现身 → 浮标底边 ≤ 回顶顶边且右对齐同一竖列）。**摘修复反跑**：把浮标 `bottom`
  改回 70 ⇒ `pub-fab-above-backtop` 报 `fab.b=830 backtop.t=816` 转红，还原即绿。全量 59/59 场景 + 309 单测。
- **预览稿**：`docs/preview/pub-fab.html`（三格宿主对照 + 层级自证两态 + 坐标表 + 窄宽），已随代码同步实测数。

### 0.9.223（2026-10-10）· 真机回填：发布通道打通 + 限流码 + 字数口径定论

- **真机 go/no-go 通过**（内置浏览器登录态、APP 域同源锚点、发一条即删）：
  `POST …/rest/app/moment/add`，body 单字段 `params`，**Cookie 即可、零自定义头、无签名** →
  `{"result":0,…,"moment":{…}}`，取 `moment.momentId` 后 `moment/delete` → `result:0`，
  再查 `feed/profile` 确认已不在列表 ⇒ **发布—删除闭环成立**。§11.3 的三条结论（Cookie 是门 / 无签名 /
  两网关同后端）由「探到校验层」升级为「**真发成功**」。
- **新事实一：服务端有发帖频率限制** —— 紧接着的第二条被拒 `{"result":140011,"error_msg":"操作太频繁了，请稍后再试"}`
  ⇒ 确认我们「只做用户手动单发 + **绝不自动重试**」的设计是对的（重试会被限流、更糟的是可能重复发）；
  `140011` 已加入 `postResultOf` 的 kind `ratelimit`，编辑器给话术「发得太快了，稍等一会儿再试（服务端限流）」。
- **新事实二：字数口径定论** —— 隔限流窗口单条验证：发 raw **240**、含一个 17 字令牌的内容 → **服务端接受**
  ⇒ 令牌**不按原长计**（否则 240 > 233 必拒），实际成本 **≤10 字**。`momentCharCount` 据此从「从严的原始长度」
  改为 **令牌整块计 1 字**（客户端只是预检，真值仍以 140000 为准）。
- **测试**：单测补 `140011` 分档与「令牌计 1」四条（`309` 全绿）；harness `moment-publish` 不受影响。
- **仍待真机**：图文（`bizFlag`，上传链跨域，官方页面走 XHR ⇒ 推测 CORS 放行待验）、转发 `repost*` 必填组合、
  GM 通道特有的风控指纹（本枪是同源页面 fetch）。

### 0.9.222（2026-10-09）· 发动态（第二刀）：编辑器 + 三处入口 + 分享面板「转发到动态」

- **编辑器 `momenteditor.js`**（三处入口共用的唯一出口 `openMomentEditor(opts)`）：居中模态（overlay 栈
  id=`momentedit`、modal 吞键）、输入条＝`inputbar`+`composermirror`（**写的时候就看得见表情**、令牌整块删）、
  表情面板、九宫格缩略图（一律走 `imgInto`，不手拼 img —— 项目禁令）、可见范围两药丸、字数计数（>233 变红）、
  脚行「取消 / 发布」。转发时标题与按钮切「转发」、顶部带源**引用块**（复用 `cards.quoteBlockOf`，不新画）。
- **三处入口**：我的页（tab 行右侧「✎ 发动态」——**不动 `.acsv-metab` 集合**，tab 数与首键被 harness 钉着）；
  广场视图（列表上方右贴工具条，本视图此前没有工具位）；原生 `/member/feeds`（新件 `pubentry.js`：沿用同页
  memberplaza 的**导航项注入**形态 + 哨兵 + MO 自愈 + 8 秒兜底浮标）。发完各自刷新（我的页动态档 / 广场流）。
- **分享面板「转发到动态」**：面板拿到源 `pi`（行卡与详情面板两处传 `opts.pi`）才出这个键——引用块要源
  UP/正文/配图，只有 pi 给得全（**宁缺勿编**）；点它直接开编辑器并预填。
- **防误发**（发布是外向不可逆动作）：提交锁 + **绝不自动重试**（端点无幂等键，重试可能重复发）；
  失败按 `postResultOf` 的 kind 给可读话术并**保留内容**、按钮转「重试发布」；**网络/超时＝结果未知**
  走「**先查后补**」（`listProfile` 核对自己最近动态，命中即当成功，避免用户重复发）。收尾单出口
  （`teardown` 连根容器一起删——此前两处各写一遍且都漏删空壳）。
- **测试证据**：新场景 `moment-publish`（20 断言）——真实入口→壳/镜像层/字数/可见范围→提交，
  mock 缝抓 **params body 形状**（content/imgs/shareResourceType/visibleForFans）+ 成功关闭 +
  **失败话术与内容保留** + **转发形态**（引用块 + `repostMomentId`）。全场景 58→59。
- **方向卫生**：本批新增边 `sharepanel → momenteditor`（分享面板直开编辑器）。把 sharepanel 计入 FEATURE
  会连锁浮出 `rail→sharepanel`、`slide→rail`……那是**既有分类债**、属另一次分类纠正的活 ⇒ 本次按
  **KNOWN 登记放行**（在册 1 条，未登记 0 条），债务记入 `docs/dependency-audit.md` 待专项。
- **未做（下一刀）**：`/member/feeds` 那处的落点只走「导航项」这一既有先例（该页官方发布元素**无留档**，
  不猜 DOM）；缩略图上传段在 harness 里无法 mock（`gmRequest` 直用方漏缝）；**真机三连**（纯文字/图文/转发×3 源，
  自己账号发完即删）待跑——`bizFlag`、`repost*` 必填组合、**风控**三项都还在真机上等着定论。

### 0.9.221（2026-10-09）· 输入框内表情「看得见 + 编得动」——镜像层 + 令牌原子编辑

- **由来**（用户三连问）：「表情在编辑界面能不能渲染好啊，包括其它输入框」→「退格能删除整个表情字符吗、
  拖动能选吗」。现状是 textarea + **令牌原文**（`[emot=acfun,123/]` 17 字符）：写的时候看到一串代码，
  且退格只删一个字符 ⇒ **令牌被劈成垃圾**、拖选只能选「半个表情」、方向键穿过令牌内部。
- **两条决定**（用户裁决）：**镜像层**路线（不用 contenteditable，保住原生中文输入法/撤销/选区），
  表情取 **B 口径 `height:1em`**（图矮于行框 ⇒ 不撑行高 ⇒ 两侧行数永远一致、不漂移）。
- **新增两件**：
  - `tokenedit.js`（令牌原子编辑）：`tokenRanges` 扫描令牌区间（表情 + 图片两种短码，纯函数）/
    `mirrorHtml` 出镜像层 HTML（纯函数）/ `attachTokenEdit` 绑事件——退格与 Delete **整块删**、
    方向键**整块跳过**、选区（含拖选起点）**吸附到令牌边界**。三条纪律：删除走**浏览器原生编辑路径**
    （先选整块再让浏览器删 ⇒ 撤回栈不破）；**组合期一律不拦**（isComposing/229 ⇒ 不吃中文候选词）；
    令牌区间每拍重算（规模小，重算比维护增量更不易错）。
  - `composermirror.js`（镜像层装饰器）：给 inputbar 建的输入条包一层——textarea 文字透明只留光标、
    下层同度量 div 把令牌画成图（表情真图/未就绪先 `[表情]` 占位后回填，图片出「图片」小块）。
- **为什么是装饰器而不是塞进 inputbar**：inputbar 属**基建层**（README 分层），让它 import 特性层的
  `emoticon` 会新增「基建 → 特性」反向边（check-direction 口径 A 实测报红）⇒ 把这条边挪到特性层，
  输入条仍纯建 DOM。消费方三处：`comments`（评论输入条）/ `imdrawer`（私信）/ 动态编辑器（下一刀）。
- **顺手修**：`emoticon.insertAtCursor` 程序化写入后**不发 `input` 事件** ⇒ 镜像层/自动增高「改了但没重画」；
  现在补发（对既有监听方无害）。
- **测试证据**：新增 `test/unit/tokenedit.test.js`（令牌区间/镜像 HTML；断言**按切片**写、不硬编码令牌长度
  ——本文件初版正是栽在手数长度上）；harness `detail-open` 新增 4 条**行为断言**：镜像层存在、与 textarea
  **同度量**（字号/行高/左右内边距逐项相等——镜像层的命门）、令牌渲染成图/占位、**光标落令牌中间按退格
  ⇒ 整块删**（值回到 `测试好`，不留碎片）。**摘修复反跑**：把 `decorateInput` 改成空转 ⇒ 前两条转红，还原即绿。
  全量 `npm test` 绿（check 含依赖图/方向棘轮/tsc + 309 单测 + 58/58 场景）。
- **预览稿同步**：`docs/preview/moment-editor.html` 增 §⑧（三版口径对照 + 行高几何自证）与 §⑨（**可交互小样**：
  真 textarea + 真镜像层，可亲手试退格/拖选/方向键）。窄宽自检另抓到两处（整框横向溢出、工具行贴边）并修掉。

### 0.9.220（2026-10-09）· 发动态（第一刀）：数据面 + 上传参数化 + 编辑器预览稿（待确认）

- **范围**（用户裁决）：第一版＝**图文 + 公开/仅粉丝 + 转发**；入口三处（原生 `/member/feeds` · 脚本「广场」
  视图 · 脚本「我的」页）。本条只落**数据面与上传参数化**，UI 按规矩①先出静态预览、**等确认后再进 src**。
- **新增 `src/momentpost.js`（动态发布域）**：
  - `momentParams(content, opts)` 组 body 的 `params` JSON（`content/imgs/shareResourceType/visibleForFans`
    + 转发族 `repost*`，字段名取自反编译 `DynamicContributeData`，docs §11.6）；
  - `momentCharCount` 字数口径＝**原始长度**（UBB 令牌按原文长计，**从严**；服务端 `140000` 才是真值——
    「令牌算 1 还是算串长」是 §11.5 未实测项，定论后一行可换）；
  - `dimsOf` 写侧自量尺寸（`upload.js` 只回签名 URL，`imgs=[{url,width,height}]` 的尺寸必须自量）；
  - `postResultOf` 错误码 `0/21/-401/140000/140002` → 话术键；`addMoment`/`deleteMoment` 走 **`net.request`**
    ——真机里它内部就是 GM 通道（APP 域跨域唯一可行），同时**命中 harness 的 mock 缝**（直用 `gmRequest` 的
    模块是漏缝的，写链就无从断言）。
- **`cfg`**：加 `api.momentAdd` / `api.momentDelete`（api-new 域，与 api-ipv6 同后端）。
- **`upload.js`**：`bizFlag` 从写死提为**参数**（默认值＝评论链原值 `web-comment-text` ⇒ 零扰动；动态能否
  复用该 bizFlag **未实测**）+ 新增 `uploadImages(files, opts)` **多图编排**（串行、逐张独立成败、顺序不变）。
- **预览稿**：`docs/preview/moment-editor.html`（默认/输入中/表情面板/九宫格/仅粉丝/转发引用块/提交中/失败态/
  窄宽 540 + 三处入口形态 + 口径与风险附注）。**窄宽自检抓到两处**：①预览框固定 540 宽 + 页面内边距 ⇒ 整框
  横向溢出、字数计数被裁（改成随视口收）；②工具行在 540 下需**允许换行**而非挤爆。
- **测试证据**：新增 `test/unit/momentpost.test.js`（params 四字段/img 三字段归一/转发按源类型填族内字段/
  未知源不猜字段/字数 233 边界与令牌口径/错误码分档），单测 305 全绿；全量 `npm test` 绿
  （check 含依赖图/方向棘轮/tsc + 305 单测 + 58/58 场景）。
- **未做（下一刀，等预览确认）**：编辑器实现（overlay 壳 + inputbar + 表情 + 九宫格 + 可见范围 + 引用块）、
  三处入口注入、分享面板「转发到动态」项、发布后刷新与「先查后补」、以及**真机三连**（纯文字/图文/转发×3 源，
  已获授权：自己账号真发并删）。**风控仍是最大未知**：该端点在二次验证白名单内，且 APP 域写只能走 GM，
  与 `appapi` 头注「GM 写操作会被判不可信设备」冲突——真机一枪定生死。

### 0.9.219（2026-10-09）· 列表尾部加载统一——抽 listtail 尾部件，我的页三档改自动触底

- **病灶**（用户实报「'我的'页尾部滚动加载逻辑和脚本其它页面设计不一致」）：我的页 历史/收藏夹/关注分组
  三档还是 0.9.62 时代的**「加载更多」按钮**（到底只把按钮藏掉、无任何尾文案、分组档连骨架都没有），
  而同页的「动态」档（0.9.218 刚落）与全站其余页（广场/关注/分区/搜索）都是**滚到底自动加载**——
  **同一页内部就自相矛盾**。更底层的问题：同一件事被实现了好几遍——触底监听 5 份、回顶按钮 4 份、
  三态状态行 2 份逐字重复。
- **修法**：新共享件 `src/listtail.js` 收口**尾部三样**（触底监听双方言 / 三态状态行 / 回顶按钮），
  **不管翻页范式**（各页游标/页码/IO 哨兵/按行补齐各自保留）：
  - `squarefeed.js`（广场工厂，4 宿主）与 `followview.js` 换用它——**零行为变化**（view-square /
    member-plaza / space-moments / view-follow 全绿＝机器证据）。顺带修：followview 的状态行注释
    写着「点击=手动重试」却**从未接线**（首屏失败时点击是唯一出口），接上后由断言钉住。
  - `mypage.js` 三档改自动触底：去 `moreBtn`，到底/失败改由**状态行**表达（「已加载全部」/
    「加载失败，滚动重试」）；分组档**补首屏骨架**（同页另两档早就有）；四档统一挂**回顶**
    （`cfg.view.me` 补 `scrollPad/backTopAt`）。
  - `zone.js`（无触底）/`searchview.js`（IO 哨兵）只换回顶件；`jingxuanview.js` 接尾部件并把
    **此前没有的回顶**补上（触底仍走它自己的按行补齐方言）。
  - `cards.moreBtn`（「加载更多」按钮）**退役**——最后一个消费方已改自动触底。
- **测试证据**：`view-my` 的按钮式断言改口径（`hist-more-visible`→`hist-morebtn-retired` +
  滚到底续页 + `hist-status-done` + `hist-backtop-shown`，63 断言）；**摘修复反跑**：把历史档的
  `onBottom` 摘掉 → `hist-page2 (n=18 calls=1)` / `hist-status-done` / `tab-keep-state` /
  `item-back-keeps-grid` 四条转红，还原即绿。全量 `npm test` 绿（check 含依赖图/方向棘轮/tsc +
  300 单测 + 58/58 场景）。

### 0.9.218（2026-10-09）· 动态浏览双宿主——空间页「动态」标签 + 我的页「动态」tab（两套皮肤）

- **新功能**（用户裁决链：「个人主页注入动态查看」→「我的页也加动态浏览，和动态广场一样的设计思路，
  两套皮肤」→「动态放在观看历史前面，放第一个」）：**一处组件、两个宿主、两套皮肤**——同一份列表机械
  与行卡/详情/评论管线，暗色基底（脚本内「我的」页）+ `.acsv-mp` 浅色覆盖（原生空间页）。
  预览稿 = `docs/preview/moment-browse.html`（事前确认产物，随本批入库）。
- **数据面**：新增 `GET api-new.app.acfun.cn/rest/app/feed/profile?userId=`（实测依据 docs §10.1
  字段级核对）——**免登录**（`credentials:omit` 裸调 `result:0`）、任意 uid 可读、**三合一混排**
  （rt10 图文动态 / rt2 视频 / rt3 文章）、`type` 不传=混排（`3`=纯视频）、游标 `pcursor`=下一页首条
  createTime（毫秒）。条目形状与 followFeedV2 **同构**（resourceId/createTime/三计数/user 的
  userHead+nameColor/rt10 的 moment{text,imgs[]} 与 repostSource 逐项对得上）⇒ 规整**复用契约层
  follow 解析器，不新增解析器**。`profilePageOf` 刻意**不套广场的 24h 窗口**——个人主页是历史流，
  套上会把 24h 前的动态全砍掉（看起来像「这人只发过今天的」），单测专钉此条。
- **宿主 A（原生空间页 `/u/<uid>`）**：注入「动态」标签（追加在原生 视频/文章/合辑 之后、
  **不抢默认选中**）；数据源同一份混排流；行落点=**原生页语义**（行不动作 + 行尾 am 锚去官方动态页，
  浅色原生页不弹深色详情浮层；行内互动照常）；面板内套 `.acsv-mp` 浅色第二皮肤。
  为此**抽出 `spacetab.js`**（标签卡+面板+手动切换+站点排序控件互斥+**确定性插入位**+共享自愈单源），
  `uppage` 改调它（**零行为变化**，小视频面板内容与启动链留在原处）。两个自建标签**共用一条
  MutationObserver 自愈**——顺带修掉 uppage 此前「只有 20 拍轮询、无 MO，SPA 重渲染冲掉注入项后不回补」
  的既有缺陷。惰性：不点「动态」不拉接口。
- **宿主 B（脚本「我的」页）**：新增「动态」tab，**排第 1 且默认落地**（键序=按钮序）；列表机械复用
  广场工厂——该工厂本批加了 `fetchPage`/`emptyText`/`poll:false`/`view` 四项可注入（**默认值＝改造前
  行为**，零漂移证据=view-square 与 member-plaza 场景全绿）；自己 uid 取 `ui.selfUid()`（既有单源，
  不新开令牌口子）。
- **浅色皮肤补缺**（本特性必撞的既有缺口）：`.acsv-mp` 此前只覆盖到 `av/name/time/text/img/acts`，
  **漏了视频/文章条（scover/sbody/stitle/sdesc/sinfo）**——广场是纯动态流所以从没暴露，而个人动态流
  是三合一混排，漏了就是「白底条 + 近白标题」。同一处补丁把 `/member` 内嵌广场的潜在同类问题一并修掉。
- **验收证据**：单元 2 组新用例（三合一派发/无窗口到底判据/失败可辨）+ harness 2 处新断言
  （`view-my`：动态 tab 排第 1、默认选中、三合一渲染；新场景 **`space-moments`** 12 断言：两标签位次
  确定性、切换与排序控件互斥、惰性、am 锚、**浅色 computed 色**、点原生标签恢复排序）。
  **摘修复反跑两处均转红**：① 摘掉 styles.js 五条浅色 strip 规则 → `sm-skin-light` 报
  `rgba(255,255,255,0.06)`（正是暗色底漏到浅色页的病灶）；② 把「动态」键挪到 `panels` 末尾 →
  `moments-tab-first` 报 `hist,fav,groups,moments*`。
  **连带修**：`follow-groups`/`fav-folders`/`cover-fallback` 三场景原用**位置索引**定位我的页 tab
  （`tabs[2]`/`tabs[1]`）且假设「历史是默认 tab」，插动态后即错位——改成按 `data-tab` 属性定位并显式
  切回历史（位置索引本身就是脆弱点）。全场景 **58/58 绿**；`npm run check`（含依赖图/方向棘轮/tsc）全绿。
- **未做**：发布动态（`moment/add`）不在本批——另需通道/风控 go-no-go（docs §11 已记）。

### 0.9.217（2026-10-09）· 播放层 hls 条目不自动播修复——起播判定补「可播时」兜底

- **病灶**（用户真机实报「分区点进视频不会自动播放」；真机读数 + 源码链实证）：层内起播只有
  `session._attach` 末尾这一拍（`hooks.onAttachPlay`），而它**同步执行于 `_attachSource`
  之后**——直链条目此刻 src 已同步落好、`play()` 有效；但 **hls 条目走 `ensureHls().then`
  异步挂源**，这一拍执行时 video 尚无任何源，`play()` 被拒（NotSupportedError），而
  `MANIFEST_PARSED` 回调**只锁最高档、不补起播** ⇒ **hls 条目在播放层里永不自动播**。
  真机读数完全吻合：`readyState=4`（数据就绪）/ `paused=true` / `data-state` 停在 `loading`；
  而起播三条件（`idx===currentIdx()` 哨兵对齐、`!_userPaused`、舞台可见）**事后读全部成立**
  ——即「判定那一刻无效，之后再无重试」。竖刷页幸免：起播走 `setActive`（`loadInitial` 显式
  调用 + IO 随可见变化触发，天然重试）。
  测试盲区：harness 全部 mock 走 webm 直链（`cap.hls=false`），**无 m3u8 夹具** ⇒ 这条路径
  从来没有断言覆盖，故长期未发现。
- **修法**（纯行为修正，视觉形态零变化）：`_attach` 补一次**「真正可播时」的起播判定**——
  监听一次性 `canplay`，条件与首拍同款（`idx===currentIdx() && !_userPaused`），并以
  `!video.paused` 前置（已在播则完全 no-op，直链路径零扰动）；`hooks.play` 自带的「舞台
  不可见不起播」幽灵音频防线原样保留。
- **测试与验收**：harness 57 场景全绿（直链路径行为不变＝不误伤证据）。**该 bug 无法在
  harness 钉住**——缺 hls 真流夹具（webm 套 hls.js 死在解析上，0.9.74 已踩），故以**真机
  读数**为验证口径。**2026-10-09 真机验收通过**：同一条分区视频由修复前的
  「`state: loading` / `paused: true` / `readyState: 4`」变为「`state: ready` /
  `paused: false` / `readyState: 4`」——「数据就绪却永不播」的卡死消除，条目正常起播。

### 0.9.216（2026-10-09）· 切换停留半屏修复——近跳归队瞬时落位 + settle 延长 + 键盘 repeat 守卫（issue #1）

- **病灶**（issue #1「视频之间切换回出现滚动到一半停留」；0.9.216 探针实测链）：近跳旧走
  `scrollTo({behavior:'smooth'})`，会被一次**「auto 瞬时滚动」无声撕掉**——探针实测：飞行
  中 `scrollTo({behavior:'auto'})` 落笔即撕，scroll 事件一次不发，停在半途。p7 探针把这一
  状态量化钉死：smooth 在途被撕后，视口**静态停在非吸附点且永久不吸附**（撕到 150→停 30、
  撕到 450→停 398，2s 后仍在原处）；而对照组「纯程序化赋值到非吸附点」会被 snap 吸回吸附点
  （150→2）⇒ **「被撕掉的在途滚动」绕过了 snap 的滚动结束吸附**，这正是「停在半屏」的机制。
  游标在起飞时已同步到新条（`setActive` 在 `scrollTo` 之后立即跑）、箭头/评论等控件全部刷新，
  只缺视口没到位。同时推翻两条旧推断（探针实锤）：①「飞行中 DOM 重排掐断 smooth」不成立
  （每帧换壳+排序重排 52 次动画照飞）；②「`scroll-snap-stop:always` 截断远跳」不成立（远跳
  途经 4 个吸附点畅通）。auto 撕扯的现实入口：0.9.74 `landWhenVisible` 轮询链（起飞 16ms 后
  舞台若短暂不可见，timer 挂 60 次后 `landAt` auto 重发）；settle 旧两帧窗口（t≈0/16ms 跑完
  即退场）+「偏离<半屏」守卫（被撕回旧条时偏离恰是一整屏，守卫天然拒修）双双接不住。
- **修法**（纯行为修正，视觉形态零变化）：
  - **近跳归队远跳链路**：`landAt` 远近跳统一 `behavior:'auto'` 瞬时落位——无在途滚动可撕，
    天然免疫；代价是丢近跳 ~300ms 平滑动画（0.9.74 当年刻意保 smooth 的取舍反转：截断
    风险 > 动画手感）；
  - **settle 延长到 8 帧**（~133ms）：盖过 landWhenVisible 轮询间隔（16ms）那类撕扯的
    落笔延迟；**去掉「偏离<半屏」上界守卫**（撕回旧条偏离一整屏，上界必拒修——探针实锤）；
    「不跟手势抢」改由 `land.stuck` 探测器的用户滚动时间戳兜底，settle 只管钉目标；
  - **`land.stuck` 半屏停留探测器**（debug 构建，release 整块死码消除）：每 600ms 采样，
    连续两次 `scrollTop` 不动（真静止，排除在途动画/惯性）且不落在任何 slide 的 `offsetTop`
    （±2）⇒ `stat('land.stuck')`——直接探测「静止在非吸附点」这个现象本身，不依赖落位时机
    与游标状态（判据连栽三坑的教训：①不收 keydown——键盘导航键正是脚本落位的触发源，收进来
    打点自己拦自己；②不拿 `FeedStore.current` 判——被撕回旧条时 IO 会把游标改回去，正主
    场景整条跳过；③不设「期间无新落位」闸——用户连续切换会让每次复核全废，实测连按 38 次
    一次不漏地全被跳过）。用户正常刷即可，读数非零＝现象存在（修复版恒 0）；
  - **`land.near`/`land.far` 落位计数**（debug 构建）：`landAt` 入口各计一笔——真机上
    「切换视频」到底走不走脚本这条路，靠它自证（`land.near` 恒 0 即用户走的是滚轮/触摸
    原生滚动，根本没经过 `landAt`，issue #1 的排查方向要整体换）；
  - **`land.watch` 装机标记**（debug 构建）：模块加载打一笔——判读前先看它，缺失即「含
    探测器的构建根本没装」。打点只在命中时建键，`land.stuck` 缺失本身分不清「没现象」还是
    「没这代码」，真机排查第三次栽在这个不确定性上；
  - **键盘 repeat 守卫**（input.js）：舞台 ↑↓/PageUp/PageDown/j/k 补 `!ev.repeat`——
    长按连发此前会在飞行中段反复重发导航（' '/'m'/ArrowRight/层内 playStep 早有同款守卫）；
  - **构建版本自证**（build.js）：debug 构建的 `__ACSV_VERSION__` 改注入 `V+'-debug'`——
    `stats.ver` 此前 debug/release 一字不差，真机排查分不出装的是哪个（本次实机就撞上：
    用户报 ver=0.9.216 无从判断；更麻烦的是 release 版**不写 stats**，读到的还可能是旧
    debug 快照的残留）。`normVer` 在首个 `-` 处截断（release.js），更新检查/上报口径零
    变化；**探针构建** `acfun-svfeed.probe.user.js`（旧行为+打点，gitignore 不入库）即靠
    此后缀自证身份。
- **测试**：harness 57 场景（新增 `land-near` 10 断言：auto 撕扯后落点不变式 / `land.stuck`
  归零 / 近跳计数留痕 / 输入时间戳留痕 / repeat 不连翻 / **探测器有效性**——临时解除吸附造出
  「静止在非吸附点」，探测器必记一笔，守住「现象探测器不哑」这条回归）；**摘修复反跑**：
  settle 还原两帧+半屏守卫 ⇒ `land-near-after-auto-tear` 与 `key-repeat-no-advance` 双双
  转红（d=720=一整屏，正是「撕回旧条」症状）；摘掉探测器 ⇒ `land-stuck-detected` 转红
  （诊断值 `top=1080`＝非吸附点，指针准确）。另修 `view-im` 两处抽屉几何断言：固定
  `wait(400)` 改 `waitFor` 等稳定——并发池负载下 CSS 过渡时机不定会量到中间态而假红
  （本次连跑复现，bodyR 1188/1273 vs vw 1280），改后全场景连跑两轮全绿。单测 297、
  lint/check 五件套全绿。
- **验收状态**（诚实标注）：机制判定基于**独立探针实测**（7 个 HTML 探针，headless
  Chromium）+ 源码路径分析；**未获报障设备真机复现**——issue #1 报告者设备不可得，开发者
  自身设备用旧行为探针刷数十条亦未复现（`land.near` 20 次走脚本路径、`land.stuck` 零命中，
  触发需特定时序：近跳 smooth 在途叠加一次 auto 写入）。故本版定位为「消除一个已实测存在
  的脆弱机制」而非「复现并修复某例报障」；待报告者补复现细节后再行对账。
- **另补层内游走起播盲区断言**（同批排查副产物；用户实报「分区点进视频不会自动播放」）：
  `ll-jx-walk-plays`（点卡片进入的**首条**必须真起播）+ `ll-jx-step-plays`（层内往下切的
  **下一条**必须真起播）——旧断言只钉「层开了/游标走到下一条」，不钉「真的播起来了」。
  起播走 `session.onAttachPlay`（非竖刷的 `setActive` 路径），条件 `idx===currentIdx()`
  （层内=哨兵 `OVL_IDX`；`views.enterView` 先赋 `current` 再 `build`，故成立）&&
  `!_userPaused` && 舞台可见。两断言在 mock 下均绿——即该路径本身通；若真机不播，差异必在
  解析/挂源环节，按 `data-state` 与 video 状态定位（诊断口径见提交说明）。

### 0.9.215（2026-10-07）· 音量条显隐修复（延时关闭+悬停保活）+ 悬停滚轮调音量

- **由头**：用户实报「音量调不好调节，好像不会常驻」。复核代码实证三病灶：① 滑杆显隐是
  纯 CSS `:hover`（`display:none↔flex` 瞬切零缓冲），且滑杆 `bottom:38px` 与静音键（高
  32px）之间有 **6px hover 死区**——鼠标从键上够滑杆必断 hover，滑杆当场消失；② 控制栏
  闲置 2500ms 隐藏只认 mousemove，静止悬停音量区 2.5s 整条栏连滑杆一起 `visibility:hidden`；
  ③ 调节通道单一：唯一入口是 hover 出一条 4px 宽竖轨，无滚轮/键盘备用通道。
- **修法**（纯行为修正，滑杆视觉形态零变化）：
  - **显隐收归 JS**（styles 删 `:hover` 展开行，显隐单源）：volwrap `pointerenter` 即开、
    `pointerleave` 延时 `CFG.time.volHide`(350ms) 才关——6px 死区在延时窗内穿过、进入滑杆
    即重新 enter 取消关闭；
  - **悬停保活**：开/关置 `slide._volOpen`（attach 契约表已登记），`showControls` 闲置回调
    见 `_volOpen` 则重排计时而非隐藏（与弹幕设置面板「不随闲置隐藏」先例同口径）；volOpen
    顺带 showControls，悬停音量区本身算活跃；
  - **悬停滚轮调音量**：滚轮一格 ±5%，走 `setVolume`（填充/手柄/数字/静音图标自动联动）；
    `preventDefault+stopPropagation` 双拦 playgest 层内翻条 wheel 手势，不拦会边调边翻条。
- **有意不做**：键盘 ↑↓ 调音量（用户未选）；滑杆尺寸/位置零改动；设置面板仍不加音量入口
  （0.9.198 裁决 `panel:false` 维持）。
- **测试**：play-deep 增 6 钉子——enter 即开 / 开期间越过 ctlIdle(2500) 无 mousemove 栏不隐
  （要求视频在播，否则断言无意义）/ leave 后 150ms 仍在 / 过后收掉 / 滚轮下一格 1→0.95 且
  事件被吞且视频节点未换（未翻条）/ 滚轮上一格回 1。harness 56 场景全绿（play-deep 85 断言）。
  **反跑证据**：`git checkout -- src` 还原病灶重建 → 5 钉转红（vol-open-on-enter/
  vol-open-keeps-controls[ctl=""]/vol-hide-delayed/vol-wheel-down/vol-wheel-up）；
  vol-hidden-after-delay 病灶下假绿属串联断言的正常伴随（滑杆从未开过）。

### 0.9.214（2026-10-07）· 审计修复：↑ 在途误弹「已经是第一条」+ 文档收口

- **由头**：提交前子代理审计（299443e..HEAD 全区间逐函数比对）发现的唯一行为偏差：0.9.210
  拆件初版把「已经是第一条」toast 判定留在壳层（`!ok && delta<0`），而旧实现的 stepping
  在途挡在 toast **之前**——more()/相关池请求在途窗口内按 ↑（或上滑手势）会误弹
  「已经是第一条」（既非第一条、文案也误导）。触发窗口窄，单测未覆盖该组合故全绿漏网。
- **修法**：提示收回 levelstack 核内（`histBack` 失败时经 io.toast 出；stepping 挡仍在其前），
  playlayer 壳层不再判 toast——与旧实现逐字同序。
- **文档收口**（同批）：CHANGELOG 0.9.211 节体错位修复 + 两处计数订正（toastmsg 实为 13 处、
  detachSession 实为 8 处）；README 表格行合并修复 + playlayer 行随拆件改口；dependency-audit
  拆件待办销账 + 补 0.9.210 小节；roadmap 追记 v1.6 区间（0.9.209–0.9.214）。
- **测试**：levelstack.test 增「↑ 在途静默」钉子（在途 ↑ 无 toast、在途结束后到入口才提示），
  单测 296→297；harness 56 场景全绿。**反跑证据**：摘除核内 io.toast（入口失败改回裸 return false）→「↑ 到入口出提示」与「在途结束后到入口才提示」两钉子转红。

### 0.9.213（2026-10-07）· 批⑨：feedstore 深带两级水位（desc 重字段保守瘦身）

- **由头**：0.9.209 工程评估第⑨条（上次效率批被否后的保守重设计）。现状：slim 只清媒体
  载荷（urls/qualities），长会话下条目元数据仍线性涨；其中唯一的长文本载荷是 desc
  （home 源 resolve 从 douga/info description 折叠，HTML 折行后可达数 KB/条）。
- **修法**：两级水位——slimBehindAt=30 外清载荷（一级，不变）；**deepSlimAt=120 外再清
  desc**（新常量，cfg 唯一来源）。契约面字段（id/title/up/计数/cover）全保留：向上回滚
  slide 重建不残缺，跨深带回滚后简介区按「无简介条目」既有形态渲染（该形态本就存在，
  非新造）。**有意不动**：seen{} 去重表（清了会让随机流重复条目 re-introduce）、
  items 数组（data-idx/offsetTop 是滚动定位承重墙，绝不删元素）。debug 读数
  `feed.deepSlim` 计数随批入库。
- **测试**：新增 feedstore-slim.test.js（node 直采，purity 同款垫桩）：三带边界
  （未及/一级/深带）逐条不变式 + 幂等 + seen 不可清 + _resolveP 在途跳过，单测
  293→296。**反跑证据**：把深带边界临时错写成一级带 → 2 用例转红，恢复复绿。
  harness feed-slim 维持原断言全绿（sv 条目全链路不产 desc，desc 探针前提不成立，
  已在场景注释记账防后人踩坑）。

### 0.9.212（2026-10-07）· 批⑧：用户提示话术单源（toastmsg）+ 长驻时长收口

- **由头**：0.9.209 工程评估第⑧条——toast 出口虽单源（ui.toast），但「什么错弹什么话」
  散落各域：同串多处（『操作失败（未登录？）』×3、『投蕉失败（未登录或今日已投完？）』×2、
  『私信需要先登录 AcFun 账号』×2）、同构拼装两处（『发送失败：msg/（未登录？）』评论与
  弹幕各写一遍）、长驻时长裸数字（imdrawer 两处 8000，其余恒默认 1800）。
- **修法**：新基建件 `src/toastmsg.js`（依赖 ui+cfg，零 DOM）——errNotLogin/errBanana/
  errImLogin/errImgTooBig/errSend/errLong 六个出口，六域 13 处替换（comments/banpop/
  danmaku/momentbar/mypage/imdrawer）；长驻口径收 `CFG.time.toastLong=8000`（cfg=
  常量唯一来源惯例，时长不另设第二真相源）。**纪律**：文案内容零改动、只收出口；一次性
  上下文强耦合的提示（状态回显类）有意不进来——判定口径「同串或同构 ≥2 处才收编」。
- **测试**：build/lint/check（check-deps 补 toastmsg 节点+6 条消费边）/单测 293/harness
  56 场景全绿——comment-fail 场景钉的失败提示文案不动即绿=话术零变化。

### 0.9.211（2026-10-07）· 批⑦：视图态 pi 投影收编 panelitem（viewPiOf 单源）

- **由头**：0.9.209 工程评估第⑦条——searchview（视频卡 + UP 卡最近作品两处）与
  jingxuanview（piOfVm）各自手拼面板 pi（kind 手盖章、acId 无守卫、字段面靠约定），
  与「单源收口」理念有张力。
- **核对后的实际收编面**（评估结论两处修正）：① uppage.js 的 `{id,cover}` 是**网格中间态**
  （进信息流走 api normalize，不是面板条目）——误报，不收；② searchfmt 是搜索域的
  **域内回包规整**归属地（0.9.159 域归域决策），不迁——真正缺的是「域条目→面板 pi」最后
  一步投影的单源。修法：panelitem 新增 `viewPiOf(src, kind, upOverride)`——acId 守卫
  （只查 id，标题守卫留在域件：搜索标题剥高亮后合法为空）、kind 盖章（传了才落键，
  jingxuan 旧形无 kind 键保持同形）、up 覆盖（搜索 UP 卡最近作品作者取该 UP）、
  id 双容差（vm 的 id 字段名，同 rank 解析器 dougaId||contentId 先例）、可选字段
  （dur/views/dateText）真值落键（渲染层全真值守卫，缺键与空串同形）。
  三个消费点（searchview×2 / jingxuanview×1）改走契约件；followstream 空壳条目核对：本就
  走 playItemOf（播放契约件入口），不属自产，不动。
- **测试**：contract.test.js 增契约⑤（投影行为 + 产出键 ⊆ ITEM_FIELDS.panel 白名单），
  单测 292→293；harness 56 场景全绿（view-search/jingxuan 相关断言不动即绿=行为零变化）。
  README panelitem 行同步。

### 0.9.210（2026-10-07）· playlayer 拆件收尾（playstate/levelstack）+ 两处编排重复收口

- **由头**：dependency-audit 在册候选「playlayer 拆件（先不拆，下一批一起）」到期；0.9.184
  已拆四缝之一（手势→playgest），本批拆完剩下两缝，顺带收口 player/playlayer 编排层的
  重复片段。
- **拆件**（纯重构，行为零变化）：
  - `src/playstate.js`（**零依赖新叶子**）：三态会话装配（缺省=walk/single 显式/list 钳位）+
    快照还原 + 层内历史（历史格随身带会话快照），自 playlayer 逐字平移；
  - `src/levelstack.js`：级别栈（saveLevel/pushLevel 封顶 2/escape 弹级）/步进核（↓ 按三态
    分派、↑ 历史回退）/walk 队列，自 playlayer 平移；环境触面（swap slide/箭头/页签/toast/
    curTime/**relatedBatch**）经 `setLevelIO` 注入——不新增对 relatedapi 的静态边；
  - playlayer.js 452→**318 行**，只剩视图壳（DOM 挂载/抽屉联动/深链解析/生命周期）。
- **编排重复收口**：① 会话拆装三行散落 8 处收成 `attach.detachSession(slide)`（player 3 处/
  playlayer 2 处/attach 2 处/controls 1 处，契约表同步登记）；② 换条评论跟随两处同型判定
  收成 `comments.followComments(item)`（player setActive/playlayer swap）——同源跳过取竖刷
  侧判据，层内 ↑ 回退撞同源的窄路径差异已在注释记账。
- **测试**：新增 playstate.test（6 断言组）+ levelstack.test（8 断言组，假桩 io 直测压级/
  弹级/回退/三态分派/封顶/队列），node 直测从 0 到场；harness 56 场景全绿（ll-* 级别栈
  行为钉死不动）。**反跑证据**：摘除 enterLayer 的 curItem 锚定 → levelstack walk 用例转红
  （batchCalls [undefined]），恢复复绿。README 依赖图补两节点（playstate 入零依赖叶子名单）。
- 单测 278→292（+14 断言）。

### 0.9.209（2026-10-07）· 工程减债两则：内嵌 hls.js 换 light 版 + postForm 失败口径对齐 net 层

- **⑤ 内嵌 hls.js 换 light 版**：build.js 内嵌源 `hls.min.js`（415KB）→ `hls.light.min.js`（297KB），
  双产物各减 ~118KB。light 砍掉的是备用音轨/字幕轨/EME(DRM)——本脚本用到的 API 面
  （`isSupported/attachMedia/loadSource/on/levels/currentLevel/levelCodec/recoverMediaError/destroy`
  + 缓冲配置族）经 grep 全量核对全在 light 核心射程；ABR 与手动档位不受影响，且 session.js
  本就恒锁最高档禁 ABR。字幕边界已记注释：未来字幕方向=AI ASR 实时字幕（走音频流自识别，
  不经 hls 字幕轨），light 不受影响。随动：hls-lazy 场景 `hls-src-embedded` 断言阈值
  300000→250000（原值是「内嵌串在场非空壳」下限，light 296,762 过旧线 1 千余，按新实况收口）。
- **⑥ postForm 失败口径对齐 net 层**：appapi.postForm 此前不查 HTTP 状态码——非 200 的
  HTML 错误页死在 `r.json()` 抛 SyntaxError，归因不明；且绕过 `net.js countFail`，
  `stat('net.fail')` 会话失败计数不罩这条通道。修法：非 2xx 抛 `Error('http-<status>')`，
  全链失败（网络/状态/解析）计入 `net.fail`；mock 命中不计（对齐 request 语义）。
  全消费点（favapi/relationapi/interact/imsend/mypage/zone + appapi 域内）grep 核对：
  均为 `.then(j=>…)` 两参式，错误形态收窄兼容。
- **测试**：build/lint/check（含 tsc）/单测 / 全场景 harness 全绿（跑数见提交信息）。

### 0.9.208（2026-10-07）· 播放层的网页全屏也要铺满（0.9.202 那次只修了竖刷流）

- **由头**：用户实机「playlayer 的网页全屏没修复」+ 截图（`#svfeed/play/a/...`）。
- **病灶（0.9.202 漏的另一半）**：影院态（网页全屏）靠"左栏已隐 ⇒ 让位边距必须归零"来铺满，而当时只归零了
  **竖刷流**的 `.acsv-scroller{margin-left:dockW}`。**播放层的舞台是另一个容器**——`.acsv-vbody-play{left:168px}`
  （同样是为了让开 dock），它只在 `:fullscreen`（OS 全屏）那条规则里被归零，**网页全屏这条路径漏了**。
  于是播放层进网页全屏后左侧仍留 168px 死区，画面被挤在剩余区域里（反跑读数 `stage=168..1280`、
  视频布局宽只剩 1112px）。
- **修法**：补 `#acsv-root.acsv-cinema .acsv-vbody-play{left:0}`，与既有 `:fullscreen` 那条同口径。
  顺手核了一遍范围：dock 让位只有三处（竖刷 `.acsv-scroller` / 播放层 `.acsv-vbody-play` / 各视图
  `.acsv-view-body` 左内边距），而 F 键与影院按钮在**非播放视图**里被 key 门禁吞掉（input.js：`if (curView) { … if (!inPlay) return; }`）
  ⇒ 影院态实际只需管前两处，现在都齐了。
- **测试**：build/lint/check（含 tsc）/单测 278 / **全场景 56 全绿**。play-deep 78→**79** 断言
  （`playlayer-webfs-fills`：舞台与幻灯片视觉矩形铺满视口 ±1px，视频钉**布局宽 == 视口宽**）。
  判据取布局而非视觉矩形是有意的：抽屉开着时画面会被 scale+translate 避让（实测量到 868 宽，`drawerOpen=true`），
  那是设计内行为，不该算"没铺满"。
- **反跑证据**：删掉新规则 → `playlayer-webfs-fills` 转红，读数正是病灶
  （`stage=168..1280 | slide=168..1280 | videoLayoutW=1112px`，168 即 dockW）；恢复即绿。

### 0.9.207（2026-10-07）· 实机两处：网页全屏右侧缝隙（站点滚动条）+ 五蕉弹窗飞到卡最右端

- **① 网页全屏最右侧有空隙（用户实机截图）**：病灶是**站点自身的经典滚动条**。
  实测 A 站首页：`innerWidth = 1280` 而 `documentElement.clientWidth = 1265`（15px 滚动条，页面确实可滚），
  而我们的覆盖层是 `position:fixed; inset:0`——它按 **ICB（不含滚动条）** 定尺，于是右侧恒定留一条
  滚动条宽的缝，网页全屏黑底上极扎眼（用户截图里右侧那条就是它；探针实测 `w=1265 right=1265`）。
  **更深一层**：`player.js` 自 0.9.195 起就在挂载时写 `documentElement.style.overflow='hidden'`——但那只是
  **内联**样式，站点 SPA 一次回写就被顶掉（内联压不过内联）。故本批改为 **`!important` 的样式表类锁**：
  `html.acsv-scroll-lock{overflow:hidden!important}` + 挂载加类 / 卸载摘类（单源，成对）。
  真机实测锁生效即归零（1265→1280，且可还原；站点自身行内值不动）。
- **② 关注页投蕉弹窗偏移到最右边（用户实机截图）**：`toggleBananaPop` 把弹层挂在 `btn.parentNode` 上，
  而**宿主宽度随消费面而异**——竖刷右栏是紧贴按钮的小壳（CSS 的 `right:62` 本就是"离宿主右缘 62"），
  关注行的动作条却是横贯整卡的宽条，同一个 `right:0` 在后者把弹层顶到卡片最右端。
  修法：消费面声明 `anchorBtn: true`，弹层按**矩形**锚——右缘＝按钮右缘（纵向仍由各自 CSS 管：
  行内抬到按钮上方、右栏与按钮齐平）。momentbar 的视频/文章行与详情动作条同源，一处声明两处受益。
- **测试**：build/lint/check（含 tsc）/单测 278 / **全场景 56 全绿**。smoke 12→**15** 断言
  （`webfs-fills-viewport`：根/滚动区/幻灯片三者铺满视口；`webfs-locks-page-scroll`：类在 **且计算样式
  overflowY=hidden**；`webfs-lock-kept-after-exit`：影院退出不解锁；`scroll-lock-released`：根拆除即解锁），
  并给 harness 页临时挂一条撑高假内容来模拟站点滚动条。view-follow 79→**80**（`follow-ban-pop-anchored`：
  弹层右缘对齐投蕉键 ±1px 且底边在按钮上方）。
- **反跑证据**：① 撤掉加类 → `webfs-locks-page-scroll` / `webfs-lock-kept-after-exit` 同红；
  ② 撤掉 `anchorBtn` → `follow-ban-pop-anchored` 转红，读数正是病灶本身
  （`pop.right=1294 btn.right=723 | row.right=1314`——弹层贴着卡片最右端，离按钮 570px）。恢复即绿。
- **如实说明**：无头 Chromium 用**覆盖式滚动条**（不占布局宽），所以①的"宽度"那条在 harness 里是恒真兜底，
  真正钉住的是"类 + 计算样式"与真机读数（1265→1280）；这种"站点滚动条挤窄覆盖层"的毛病 harness 复现不出来。
  已把该结论入档 `docs/api-research.md` §10.15（本地留档）。

### 0.9.206（2026-10-07）· 实机两处：底栏「弹」开关回退文本键 + 弹幕设置面板改锚按钮

- **由头**：用户实机截图（竖刷页）两点——① 「底栏弹幕开关样式可以改回原来的」；② 「清晰度和弹幕设置展开后位置没对齐按钮」。
- **① 回退（0.9.195 的账）**：0.9.195 把底栏图标整体换成 A 站原生件，其中「弹」开关换成了原生
  **12×12 字形**（`bfq` 那批的内联 SVG，缩到底栏 20px 后发糊，且与旁边文字键「编码/缓冲/连播/倍速」不同族）。
  现改回**文本键 `弹`**（`el(...,'acsv-cbtn acsv-cdm','弹')`，开关态仍靠 `.on` 着色 + 关闭降透明）。
  播放/暂停键**保留**原生图标（用户只点了弹幕开关这一项）。
- **② 真病灶（我 0.9.202 埋的）**：弹幕设置面板当时**挂在 slide 上**、用 `.acsv-dmpanel{right:14px;bottom:52px}` 定位
  ——右缘贴的是**窗口边**而不是触发它的设置键。控制栏里设置键左边还有一大堆键，真机上两者差**几百像素**
  （harness 视口里只差 14px，所以本批把它做成断言时两种量级都能抓）。
  修法照既有约定：包一层 `.acsv-dmwrap{position:relative;display:flex}`（与清晰度/编码/缓冲的 `.acsv-qwrap` 同构），
  面板改 `right:0;bottom:calc(100% + 12px)` ⇒ **右缘＝设置键右缘、下缘＝设置键上缘 −12px**，与清晰度菜单同一套锚定。
- **清晰度菜单**：harness 实测本就合规（右缘对齐按钮 ±1px、间距 12px，锚定在 `.acsv-qwrap`）——本轮把它也补成**断言**，
  作为"两处弹层同一口径"的回归网；若你想要别的锚法（如贴控制栏右端而非贴按钮）说一声，一行的事。
- **测试**：build/lint/check（含 tsc）/单测 278 / **全场景 56 全绿**。play-deep 76→**78** 断言，新增：
  `dm-btn-text`（「弹」是文本键且不带 mask 图标）、`dmpanel-anchored-to-btn`、`qmenu-anchored-to-btn`
  （两者都是右缘 ±1px + 间距 12px，附 `btn.right/box.right/gap` 读数便于定位）。
  测试顺序有个坑：点清晰度键＝弹幕面板的外点点击，会把它收掉——该断言必须放在面板一组之后。
  连跑三轮零失败。
- **反跑证据**：注入两处病灶（面板 CSS 还原 `right:14px` / 「弹」键还原原生 mask）→
  `dm-btn-text`（textContent=""）与 `dmpanel-anchored-to-btn`（`btn.right=600 box.right=586 | gap=20(want 12)`）同时转红，恢复即绿。

### 0.9.205（2026-10-07）· 弹幕画布口径改 16:9（按播放器区域，不再跟画面比例）

- **由头**：用户实机质疑「异形比例视频弹幕画布是不是也要按 16:9 来绘制」+ 竖屏稿截图（`ac48872714`）：
  原生弹幕 `123321 ×8`、`自动签到弹幕~ ×2`、`6666` 都**压在左右黑边上**。用户的判断是对的。
- **真机取证（§10.14）**：竖屏稿（画面 1080×1922 = 9:16）上，`<video>` 元素框与 `.danmaku-screen`
  **逐像素重合且恒为 16:9**——1780×900 视口 → 1226×690（1.777）、1000×1400 竖视口 → 680×383（1.775）、
  1600×500 扁视口 → 680×383。**播放器区域比例与稿件比例、窗口比例都无关**，坐标系是那块 16:9 区。
- **推翻上一轮的推断（如实记）**：我此前在 16:9 稿上量到「元素框 = 795×447 = 画面」，据此推断元素框跟着画面长；
  竖屏稿一量即分叉——那只是两种口径在 16:9 下重合的巧合。高弹项目注释里的「用 video 画面尺寸才与 A 站
  pos 坐标系一致」同样只在 16:9 稿上成立。
- **病灶（改前真实观感）**：按画面矩形画，竖屏稿画布只有 **506×900 的窄列**（播放器 1600×900 时），
  字号仍按画布高换算（28px 不变）→ 字号占画布宽从 1.8% 涨到 **5.5%**、一条 20 字弹幕宽 **111%（比屏还宽）**、
  存活时长从 10.8s 拉到 **16.9s**（"字大、挤、赖着不走"）。
- **修法**：新增纯函数 `fit169(w, h)`（取居中、恰好装下的 16:9 矩形），`align()` 用它替换原 contain 画面矩形数学。
  **对 16:9 稿两种口径逐像素等价**（元素框本身 16:9 时 fit 就是原框）⇒ 本批的唯一形态变化只发生在异形稿上。
  副效应：高级弹幕的 `pos` 百分比随之切到与原生同一空间（异形稿上更高保真，16:9 稿位置不变）；
  观感**与稿件比例解耦**（字号/速度/占轨时长一律同 16:9 稿）。轨道分配、字号公式、四项弹幕设置语义均不动。
- **测试**：build/lint/check（含 tsc）/单测 **278**（277→278：+1 条 `fit169`——三档取值 + 退化输入不产 NaN，画布 NaN 尺寸会让整层消失）/
  **全场景 56 全绿**。dm-smoke 24→**28** 断言：竖屏稿（720×1280）在 16:9 区里画布必须是**整块 640×360**、
  方框区取居中 16:9（上下留边 140）、超宽区取 16:9（左右留边 250）、16:9 区零偏移。每改一次区域须过 align 的 250ms 限频。
- **反跑证据**：把 `align()` 还原成画面矩形口径 → 四条新断言同时转红，实测读数正是病灶本身
  （竖屏稿 `{"w":203,"h":360}`——弹幕被挤进 203 宽的窄列），恢复即绿。
- **预览留档**：`docs/preview/danmaku-canvas-169.html`（改前/改后并排 + 三档比例 + 非 16:9 区域的居中留边 +
  几何数字表 + 540 窄态自检）。形态改动由用户实机指令与截图直接指定（原生即目标形态），故按指令落地并同步留档预览。
- **本批未做（如实）**：原生弹幕层在暂停/空池态仍抓不到渲染宿主（`.danmaku-screen` 只有空占位 div、
  画布 0 尺寸、无 shadow DOM/iframe），故**原生字号换算律未实测**；本批不动字号公式（仍按画布高 810 基准），
  因为切到 16:9 画布后该项在异形稿上已与 16:9 稿一致。

### 0.9.204（2026-10-07）· 高级弹幕渲染（取池 + 移植渲染核 + 屏蔽补齐）+ 真机取证

- **由头**：用户点「我们的弹幕画布应该支持高弹渲染吧，画布当初就是从高弹项目吸收进来的」——画布骨架移植了，
  但高级弹幕三核（easeProgress/interpolateModel/drawModel）当年没随骨架搬，`danmakuType===1` 的条目**一直没画**。
- **真机取证（内置浏览器带登录态，`docs/api-research.md` §10.13）**——推翻了一个想当然：
  **我们生产在用的 `new-danmaku/list` 链路即使带 `enableAdvanced=true`，也一条高级弹幕都不返回**
  （样本稿 100 条 `danmakuType` 全 0，两个排序方向各测一次同形）⇒ 高级弹幕**只能另起 `pollByPosition` 这一路**。
  同一稿件 pollByPosition（0–20s 窗口）= 602 条里 **399 条高级**，`advancedDanmakuExtData` JSON 解析成功率 100%。
  画像：`contentType` 全 0（无图片弹幕）、锚点九宫格真被用到（左上 347/中中 28/右中 21）、
  帧数 1/2/4/11/**12** 均出现、`durationTime` 最大 **120s**、`timingFunction` 全 `linear`。
- **两条语义由真机钉死**（避免了猜）：**出现时刻 = 条目 `position`**（399/399 条 `ext.startTime` 与 `position`
  逐条相等）；**存活时长 = `durationTime` = 各帧 `moveTime` 之和**（399/399 条相等）。
- **取池形态：跟播放头增量拉窗口**。样本稿时长 **1912s ÷ 20s = 96 个窗口**——**全量扫等于进页连打上百发请求**，
  故按原生做法（进窗拉当前、快到窗口尾预取下一段、seek 由下一 tick 补齐），单会话窗口上限 200 兜底；
  图层停/弹幕关掉时**不打请求**（`isRunning` 门），unmount/换源由既有 `dmStopAll` 收摊。
- **修法**：
  ① 新模块 `src/advdm.js`（**零依赖纯函数**，从高弹项目逐条移植 + 白名单加固）：`parseAdvanced` /
     `easeProgress`（CSS 关键字与 `cubic-bezier(a,b,c,d)`；**平缓区曲线牛顿迭代会发散 → 出界即改二分**，
     非法值一律回落 `linear`——脏值不能让弹幕冻结在 (0,0)，这是高弹项目踩过的坑）/`interpolateModel`（多段帧）/
     `drawModel`（九宫格锚点、多行＝字符画、描边、影子）。残包兜底：坏 JSON/无 content → null；
     帧只给 from 或只给 to → 另一端沿用同侧（原地不动，不飞到 (0,0)）；
  ② `appapi.danmakuAdvanced(videoId, from, to)`：窗口是**左闭右开毫秒区间**，只收 `danmakuType===1`
     且 `contentType===0`、有帧的条目，按 `danmakuId` 去重；list 条目补 `roleId` 映射（角色弹幕判据，两条链路都带）；
  ③ `dmcanvas` 加**第二条渲染通道**：高级弹幕不进轨道分配/位图缓存（它们是绝对坐标的少数派，走轨道全错），
     每帧按 pos 百分比 + 帧插值绘制、按 `zIndex` 升序压同屏；`addAdvanced` 增量喂入（同 id 幂等）；
     字号随「字体大小」设置缩放，**不受「显示区域」约束**（落点由 pos 自己决定，用轨道口径裁会凭空抹掉）；
  ④ 底栏弹幕设置「屏蔽设置」补 **角色弹幕 / 高级弹幕** 两类（判据 `roleId>0` / 有 `adv`），六类与原生对齐。
- **测试**：build/lint/check（含 tsc）/单测 **277**（+11：`advdm` 8 条含贝塞尔收敛与残包兜底；
  `filterDanmaku` 六类判据按维度拆测——**测试数据自己踩过坑**：把彩色/角色/高级都写成 mode 1，会被滚动屏蔽一并带走）/
  **全场景 56 全绿**。dm-smoke 14→**24** 断言（真机形状 ext 走浏览器内真实解析链、幂等、`dm.adv` 埋点、
  **锚点几何按像素判**：左上必须不透明、右下必须透明、过期不画、seek 回来重现）；play-deep 75→76（屏蔽标签数=6）。
- **反跑证据**：注入三处病灶——drawModel 忽略 pos 百分比 / addAdvanced 去掉幂等去重 / 缓动白名单漏放非法值 →
  `高级弹幕落在锚点位置`、`addAdvanced 幂等`、`dm.adv 埋点`、`seek 回退后重现` 四条 harness 断言与
  `drawModel` 单测同时转红，恢复即绿。
- **真数据全量校验**：把 399 条里**结构最刁的 73 条**（12/11/4/2 帧、非左上锚点、带 scale/rotate）原始
  ext 抓下来逐条过我们的解析器与插值器（起点/中点/终点三点）：**73/73 解析成功、351 个关键帧插值全为有限值**
  （零 NaN——NaN 会让弹幕在画布上整条消失）。模型层对真机数据零拒收。
- **本批未做（如实）**：① `contentType===1`（Base64 图片弹幕）两侧画布都未实现——**明确不画**（不静默画错）；
  ② 过滤弹幕仅关键词（原生还有「按用户 id」，需本地列表 UI，另批）；③ **脚本在真站上的端到端目视验收未做**
  （本轮真机只到「接口与数据形状」，渲染由 harness 按真机形状钉；实机验收待下批跑一次）。

### 0.9.203（2026-10-07）· 测试提速：harness 全场景同池并发（2m11s → 37s）

- **由头**：用户「测试有点太耽误时间了，影响进度」。全场景此前 2m11s。
- **先量再改**：驱动打印每个场景耗时后，时间去向清楚了——**串行独占组（33 个场景）吃掉大头**，
  其中最贵的 watch-report 18.1s / stall-healthy 10.7s / upd-open 7.0s / watch-playlayer-pagehide 7.1s，
  而它们本就是**在等墙钟窗口**（心跳/冻结窗/上报重定向），串行独占只是让整机白等。
  另统计场景体里的固定 `wait(N)` 合计约 43s（stall 10s、feed 8.75s、views 8.03s 为最），
  这些是有意的等窗，不动。
- **推翻 0.9.81 的假设（有实测支撑）**：0.9.81 按 `serial` 标记把「时序敏感」场景串行独占，理由是
  「帧间隔/冻结窗口在解码争抢下会假红」。本机 20 核实测该顾虑不成立：全场景同池并发 4 **连跑 8 次**
  56/56 全绿（每轮 43s），并发 6 → 32s（1 次绿）；改默认为按核数取 `min(6, max(2, 核数/4))`（本机 = 5）
  后又连跑 3 次全绿（37s）。合计**新口径连续 12 轮全场景零失败**。
- **改法**：`HARNESS_SERIAL=1` 才走老的独占分组（`serial` 标记保留 = 记录哪些场景曾被判定敏感，
  怀疑假红时用它做对照）；默认全部进同一并发池。驱动顺带：`waitForFunction` 轮询 500ms→100ms
  （done 置位后平均多等 250ms，56 个场景累计十几秒空转）、每行打印该场景耗时（下次找慢点不必再猜）。
- **验证**：`HARNESS_CONC` 覆盖仍有效；`HARNESS_SERIAL=1` 口径单独跑一次确认仍全绿（2m1s）。
  低配机自动退回并发 2（`max(2, 核数/4)` 下限），不吃满小机器。

### 0.9.202（2026-10-07）· 播放器打磨（九）：弹幕设置搬进底栏（两 tab 弹层）+ 实机四问返修

- **由头**：用户实机截图四问——① 网页全屏没有铺满；② 换的播放键好像反了；③ 弹幕、播放图标尺寸不对；
  ④ **「弹幕设置应该放在底栏做这种展开，而非放在设置里」**（推翻 0.9.201 的做法）。
- **④ 翻案的理由（0.9.201 错在哪）**：0.9.201 把弹幕设置塞进 `settingspanel`，理由是「已有表驱动面板，不另造」。
  但设置面板的语义是**改完下次生效的偏好**，弹幕这几项是**播放中要反复微调的现场参数**——入口在 Dock 齿轮里，
  离画面最远，用户要「调一下看效果」就得开设置、调、关、再看。原生 A 站把它挂在**播放器底栏**（`bfq_dmsz` 齿轮气泡），
  原地展开、改一项立刻看到，这才是对的形态。**结论：入口跟着使用场景走，不是跟着实现复用走。**
- **修法（底栏弹层）**：`controls.js` 新增 `dmSetBtn`（原生 `bfq_dmsz` 图标，`PLAYER_ICONS.dmset`）+
  `buildDmPanel(slide)`——点齿轮在底栏上方展开 300px 弹层（`closeOnOutsideClick` 收），两 tab：
  **弹幕设置**（防挡字幕/合并重复弹幕两开关 + 显示区域/不透明度/字体大小/弹幕速度四滑杆 + 恢复默认设置）｜
  **屏蔽设置**（按类型屏蔽四标签：顶部/底部/滚动/彩色弹幕 + 过滤弹幕关键词输入）。
  任一改动即时生效：写设置（防抖落盘）+ 调 `slide._dmLayer.refresh()`（`dmcanvas` 用**最近一次入参**重跑
  `setItems` → 重读设置 → 合并/屏蔽/轨道/字号全刷新），**不必等换条**。
  SCHEMA 里弹幕 8 项（含新增 `dmBlock`/`dmFilter`）全部 `panel:false`（退出设置面板），`settings-open` 行数 12→6 回退。
- **④ 的一个真坑（本批测试钉住）**：面板「恢复默认设置」原实现是 `replaceChild` 换一颗新面板——外层齿轮按钮的闭包
  指着**旧节点**，从此点齿轮只改游离节点的 `display`，**面板再也关不掉**；开关读数也停在旧 DOM 上失真。
  改为**原地重绘**（`box.__fill()` 清空重建子节点，节点本体不换）。反跑证据：临时还原 `replaceChild` →
  `dmpanel-reset-samenode`（sameNode=false）/`dmpanel-reset-sw-off`（读旧节点仍 on）/`dmpanel-closes`（display=""）
  三条断言同时转红，恢复即绿。
- **① 网页全屏没铺满**：影院模式（`acsv-cinema`）隐藏了 Dock，但 `.acsv-scroller` 的 `margin-left:168px` 还在，
  左侧空出一条 Dock 宽。补 `#acsv-root.acsv-cinema .acsv-scroller{margin-left:0}`；
  `webfs-hides-ui` 增断言 `scrollerMarginLeft === '0px'`。
- **② 播放键反了**：从原生按钮内联 SVG data URI 的 `<title>` 解码确认——**播放中**显示的是 `bfq_zt`（暂停双竖条，
  1030B）、**暂停中**显示 `bfq_bf`（播放三角，1570B）。此前 `PLAYER_ICONS.play/pause` 两个图形**命名对调**，
  故显示恒定相反。已按解码结果交换（play←1570 三角，pause←1030 双竖条）。
- **③ 图标尺寸不对**：`.acsvg-icon-mask` 是右栏尺寸（40×40），底栏沿用即撑爆。补
  `.acsv-cbtn .acsvg-icon-mask{width:20px;height:20px}`；`ctl-icon-size` 断言量真几何（20×20）。
- **测试**：build/lint/check（含 tsc）/单测 266 / **全场景 56 全绿**。play-deep 断言 58→**75**（新增弹幕面板组 17 条：
  按钮在场、默认收起、原生图标、两 tab、6 行控件、开关落盘、tab 切换、关键词过滤落盘、恢复默认原地重绘 + 回位 + 关得掉）。
- **本批未做（如实）**：屏蔽设置里的**角色弹幕 / 高级弹幕**两项无字段可判（`danmakuStyle`/`danmakuType` 要等
  高级弹幕渲染批次接入后才有），面板内已明写该说明；「弹幕速度」滑杆的百分比语义（越大越慢）暂靠数值感知。

### 0.9.201（2026-10-07）· 播放器打磨（八）：弹幕设置（照原生「弹幕设置」tab 的条目）

- **由头**：用户裁决「弹幕设置面板照原生两 tab 全做」。本批先做**弹幕设置 tab** 的条目（屏蔽设置另批）。
- **一个取巧与它的理由**：项目**已有 schema 驱动的设置面板**（`settingspanel`：两皮肤同源、Shadow DOM、overlay 栈、
  表驱动控件）。照原生条目加进 SCHEMA 即在面板里成组出现——比另造一个两 tab 弹窗省一大块工作，且不破「单源」，
  **故不另造面板**。**放 SCHEMA 末尾**：面板按连续同名分组渲染，插在中间会把「播放」组劈成两段。
- **修法**：SCHEMA 增「弹幕」组 6 项（不透明度 / 字体大小 / 弹幕速度 / 显示区域 / 防挡字幕 / 合并重复弹幕，
  默认值照原生 §10.12）；`dmcanvas` **只在轨道重排时读一次**（`readSettings()` 仅在 `assignLanes`/`setItems` 调，
  **不进逐帧绘制路径**——否则掉帧）：不透明度→`ctx.globalAlpha`（绘制前后复位）、字号→`fontPxOf` 倍率、
  速度→滚动时长倍率、显示区域→滚动/顶底轨道占比、防挡字幕→底部再让出约 18% 屏高、
  合并重复→新增纯函数 `mergeDanmaku`（同文本 1.5s 窗口内只留一条；`setItems` 里先按 `at` 排序再合并）。
- **测试**：build/lint/check（含 tsc）/单测 **266**（+1 `mergeDanmaku`）/全场景 56 全绿。settings-open 的行数与
  标签断言同步更新（6→12 行 + 弹幕 6 项）——该场景原按**序号**取控件（「第一个 select = 编码偏好」、`swOf(sh,1)`），
  把新组放**末尾**后原有定位全部保持，改动面最小。
- **本批未做（如实）**：① 原生面板还有「恢复默认设置」按钮——我们表驱动面板暂无分组重置能力；
  ② 「屏蔽设置」tab（按类型屏蔽含高级弹幕 + 过滤弹幕 用户id/关键字）——另批。

### 0.9.200（2026-10-07）· 播放器打磨（七）：进度条悬停缩略图（spriteVtt）

- **由头**：用户点选（预览稿 ④）。此前气泡**只有时间**。
- **真机取证**（2026-10-07，匿名直连即可）：`POST play/playInfo/spriteVtt`（§10.4 记免登录）→ `spriteVtt`
  是 **WEBVTT**（样本 49k 文本）；每条 cue 载荷 `图URL#xywh=x,y,w,h`，瓦片 **160×96**，URL 带 sign/t/us
  防盗链参数；**时间戳形如 `HH:MM:SS.mmm`——秒后用冒号再接毫秒**（非标准 VTT 的 `.`），且**秒可一位**
  （`00:01:2.500`）——两条都已兼容并写进单测。
- **修法**：`cfg.api.spriteVtt` + `appapi.spriteVtt(videoId, acId)`（**微缓存**：同 videoId 只打一次；
  失败静默返回 `[]`）+ 纯函数 `parseSpriteVtt`/`spriteCueAt`（单测直采）；控制栏气泡加
  `.acsv-bubthumb`（**CSS background 裁显示**，不走 imgload——它非"封面字段"语义）与 `.acsv-bubtime`，
  悬停 `pointermove` 时懒拉一次并按当前秒取 cue 摆位。
- **优雅降级**：拿不到雪碧图（或没数据）时缩略图整块 `display:none`，气泡回落为「只有时间」——
  绝不因为预览图失败就连时间提示都没有。
- **测试**：build/lint/check（含 tsc）/单测 **265**（+3：新 `spritevtt.test.js` 解析 / 脏输入 / 取 cue）/
  全场景 56 全绿。play-deep 59→60 断言：`track-hover-time-only`（harness 无 sprite 桩 ⇒ 必须只出时间、
  不出缩略图块）。注：真机缩略图的**裁切正确性**由解析器单测钉（harness 侧无 sprite 数据）。
