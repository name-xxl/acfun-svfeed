# 更新日志

AcFun 小视频竖刷页脚本的版本更新记录（版本号即小节号，最新在前；0.9.81 起自 README 迁出）。
每节记录：病灶（真机/评审实证）→ 修法 → 测试证据。项目约定见 README 的「开发」章。

> 更早版本（0.9.199 及以前，共 199 节）见 [CHANGELOG-archive.md](CHANGELOG-archive.md)。

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
