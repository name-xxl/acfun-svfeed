# 依赖图审计：反向例外清收（0.9.109 – 0.9.115）

> 2026-10-04 留档。缘起：视图层拆件（0.9.109）评审时把全仓「反向 import 边」与「静态环」
> 逐条清点，逐片清收（B1–B6）。本文是「为什么给某条边做注册制/注入缝」的实证依据——
> 将来质疑某条缝的成本时，先读这里。

## 一、方法论

- **边集**：`src/*.js` 全部静态 `import './x.js'`（含副作用 import），与 `test/check-deps.mjs`
  同源正则；节点=全部 src 文件（66 个）。
- **环检测**：DFS 三色（on-stack 判回边），报告完整环路径。
- **复现**：`node test/check-deps.mjs`（0.9.115 起规则⑤内建，任何环即红）。

## 二、收官前环清单（0.9.114 状态，即 B1/B4/B5 已落地后的 B6 起点）

**import 环 14 个——全部穿经同一条边 `feedstore.js → player.js`**：

```
feedstore.js → player.js → feedstore.js
feedstore.js → player.js → uppage.js → feedstore.js
feedstore.js → player.js → followstream.js → feedstore.js
feedstore.js → player.js → report.js → feedstore.js
feedstore.js → player.js → prewarm.js → feedstore.js
feedstore.js → player.js → playback.js → feedstore.js
attach.js → feedstore.js → player.js → attach.js
feedstore.js → player.js → controls.js → feedstore.js
attach.js → feedstore.js → player.js → controls.js → attach.js
feedstore.js → player.js → rail.js → feedstore.js
feedstore.js → player.js → slide.js → feedstore.js
attach.js → feedstore.js → player.js → slide.js → attach.js
feedstore.js → player.js → views.js → feedstore.js
feedstore.js → player.js → input.js → feedstore.js
```

即：这条边是**全图 14 个环的共同枢纽边**（views/attach/input 各族的传递环都以它为回边）。

## 三、收官实证（0.9.115）

删除 `feedstore→player` 一条边（改 `setChangeHandler` 注册缝）后复检：**0 环（整图 DAG）**。

各片贡献：

| 片 | 撤除的边 | 机制（先例：views.setItemOpener） |
|---|---|---|
| B1 | topbar→followstream | buildTopbar hooks 三键（onFollowVideos/onFollowAll/getFollowActive） |
| B2 | input→views、input→playlayer | `api.getView` 注入 + `state.playItem` 镜像（层内状态中介） |
| B3 | sidebar→settingspanel | buildDock hooks（onSettings；player.mount 注入并兼保模块可达性） |
| B4 | route→feedstore | `setItemProvider`（触发时刻读语义，注释钉死） |
| B5 | imshare→imdrawer | `setChatOpener`（imdrawer 模块求值期注册；im-open 页哨兵钉注册态） |
| B6 | feedstore→player（14 环枢纽） | `setChangeHandler`（mount 注册/unmount 注销，与挂载态同生共死；debug 金丝雀 `feed-changed-no-listener` 钉「无 mount 不取流」假设） |

## 四、规则⑤（已内建于 check-deps）

任何静态 import 环即红（对含基础件在内的全部内部边；与 README 精选图无关），不设登记豁免。

**边界声明**：**无环 ≠ 方向正确**——无环的反向边（如 0.9.109 前的 topbar→followstream，
本就不成环）不在规则⑤射程；「层声明 + 在册例外」的方向规则留待后续（暂缓项）。
不得把规则⑤的绿灯误读为「依赖方向已被守护」。

## 五、附带保全

- `test/unit/purity.test.js`（0.9.115 新增）：两次断边使 route/followbadge 单测链都不再经过
  player——「player 顶层零副作用」由该测试显式钉住（最小垫桩 = 实测集，头注写明扩展而非
  放宽断言的纪律）。
- 连带注释已按实况校准：attach / comments / session / followstream×2 / feedstore / route.test /
  followbadge.test / topbar / cards / views 等处的「循环先例」与「例外登记」表述随环消亡改写。

## 六、方向诊断（0.9.116–0.9.117 收尾）

- **0.9.116**：三条同形边（input→comments / input→imdrawer / rail→comments）全部改注入/注册缝
  ——剩余清单收敛为 2 条（下表）。**0.9.118**：`slide→comments` 走缓裁选项①（接线自附）收边
  ——在册收敛为 1 条（data→ubb）。**0.9.119**：`data→ubb` 随手下沉（前置检查：两纯函数与渲染
  路径无共享正则常量，故只沉纯投影族、不动正则）——**方向清单清零**，诊断进入常驻观察态。
- **V3 正式关闭**：方向卫生库存 = 5 条、全部无环、消法现成——**永远不值得一座门**。幸存者 =
  `test/check-direction.mjs`（npm script `check-direction`）：每 Phase 顺手跑一次的**非门禁**
  诊断，并列两条保守口径（正式分层 / 特性域），在册项带理由、未登记项报警、永远 exit 0。
  头注原样留档本审计最值钱的认知——「规则的上游是口径，口径不定，候选集就不定」。
- **0.9.160 诊断复跑**补一处漏登记：`topbar→searchhist`（0.9.158 引入该边时只跑了门禁 check、未复跑本诊断）——searchhist.js 是读写站方 searchCache 的**零依赖叶**、topbar（聚焦历史面板）与
 searchview 两方消费，校准进 LEAF_SHARED（同 immsg/imicons：错的是归类，不是依赖）；未登记归零。
- 诊断首跑（0.9.117）即校准一处口径：`topbar→imicons` 曾按 私信层 subgraph 归属被误报——
  imicons/immsg 是 README 明示的零依赖解耦点（出身 placement），视同基础件（同
  report→watchledger 的误报自纠：错的是归类，不是依赖）。校准后：在册 2 条、未登记 0 条。

| 遗留项 | 状态 | 候选修法 |
|---|---|---|
| `slide→comments` | **已修（0.9.118）** | 接线自附：slide 只建空壳+注册句柄（`setCommentDrawer`）；comments 首次打开时自附关闭键/列表委托（标记打在抽屉对象上，重挂载各自绑）——边因「slide 不再 import」而死。评论列表委托分支的行为面在全仓本就零覆盖（harness 不 mock comment/list，既有缺口），自附执行由 play-deep 关闭键哨兵钉住（两处同一次调用） |
| `data→ubb` | **已修（0.9.119）** | 随手下沉：`ubbImText`/`ubbPlain` 纯投影族独立为 `ubbtext.js`（零依赖），data/momentbar/comments 改道——契约层只碰纯逻辑；ubb.js 只留渲染侧 |

## 七、0.9.133：评论条目 kit 抽离（模块拆分台账）

- **由头**：评论观感追平（名字等级色/头像框/设备/楼层/回复前缀）动工前先盘定「评论渲染共几处」
  ——全仓审计结论：**条目渲染仅一处**（comments.js `commentItem`，4 个内部调用点：楼中楼递归/
  展开追加/首屏翻页/发送后乐观插入；抽屉、行内、详情面板三宿主全经它），内容卡（imcard
  `cshareCard`）亦已单源；真正的耦合点是 kit 直读全局 `commentState`（kind 分叉 / sublist 的
  sourceId·stype）与浅色皮肤并行调色板。
- **拆法**（同 cards.js 0.9.109 / rowkit.js 0.9.124 纪律）：`commentkit.js` = `commentItemOf`（唯一
  导出）+ `expandSubComments` + `normalizeSubs`/`glyph`（内部件不导出）；**无状态**——mode/
  sourceId/stype 经 opts 注入（comments.js 侧 `cmtOpts()` 单源出口）。点击委托与 back-refs 契约
  （`_c/_n/_target`）原样留在既有位置；边方向：comments → commentkit 单向（kit 只依赖基建
  cfg/net/ui/imicons/imgload/ubb）。
- **机器证明**：代码行多重集比对——缺失 10 行全为签名/全局读替换点（commentItem→commentItemOf、
  commentState.kind→opts.mode、sourceId/stype→opts.*、两处调用点），多出 18 行全为 imports/新
  签名/opts 替换/`cmtOpts`（逐行可控）；view-follow 68 / detail-open 38 断言原样全绿 = 零漂移。

## 0.9.163：imdrawer 两缝清收（拆件台账）

- **由头**：全库架构审计判定 imdrawer.js（1010 行）「接近但未过界」——一句话「私信抽屉的
  完整前端」仍成立，真正出戏的两段按用户裁决顺手拆走：图片 URL 换链协议（ks://→官方直链
  三级兜底 + proto 手解 + 参数白名单，零 DOM）迁 **imsend.js**（与图片字节管线同族，导出
  imageUrlOf 改 inst 传参替代直读抽屉模块态 lastImInst）；顶栏未读徽标（与抽屉零共享状态）
  独立为 **imbadge.js**（仿 followbadge.js 先例，teardownIm 经 stopBadge 反向通知，方向
  imbadge→imsend 单向）。
- **结果**：imdrawer 1010→911 行、头注补簇导览（按段名 grep 即达）；player→imbadge、
  imdrawer→imbadge（stopBadge）、imbadge→imsend 三边入图；check-direction FEATURE +imbadge。
  纯搬迁，代码行多重集机器比对在案（签名调整仅 imageUrlOf 一处私有签名 + 头注）。

## 0.9.168–0.178：相关推荐域 + 分区页 + 播放层级栈（拆件台账）

- **由头**：用户路线（「大家都在看」进评论抽屉 → 抖音精选式分区页 → 播放层出口对齐/层内会话 →
  点相关行开「列表播放器」）连批落地，新增四件、层内状态机两次换代。
- **新增模块与边**：`relatedapi.js`（相关推荐域，player/reldrawer/api/cards 消费）、
  `reldrawer.js`（抽屉 tab 特性件，comments 两 seam + playlayer 三 seam）、`channelapi.js`
  （频道域，jingxuanview 消费）、`jingxuanview.js`（分区页视图，cards/settings/imicons/relatedapi 消费）；
  README 图同步 12 条边，`check-direction` FEATURE +reldrawer/jingxuanview（0.9.169 登记）。
- **两次换代（方向纪律复核点）**：①播放层「会话三态」（single/walk/list，0.9.173）——上下文由
  **来源视图**经 `openPanelItem(pi, ctx)` 传入（视图最懂自家列表语义，层只消费）；②「级别栈」
  （0.9.174，封顶 2 级）——跳轨改压级，mediator 扩 `pickInLayer`/`playEscape` 两缝；依赖方向
  全程单向（playlayer→reldrawer→relatedapi，无回边）。
- **顺抓缺陷**：`appapi.resolve` 的非 m3u8 直链守卫位置错（在 applyQuality 前判空 urls，恒不触发；
  0.9.174 修）；`openComments` 幂等收旧层导致换条页签复位（0.9.178 抽 `retargetComments` 分流）。
- **待办**：合辑/分P 接口未实测（行形状与 push 入口已就位）；~~playlayer.js 已 496 行（视图壳/会话/
  级别栈/手势/抽屉缝），拆件列为下批候选（用户裁决「先不拆，下一批一起」）~~
  **已销账（0.9.210 拆件出货，见下节）**。
- **0.9.179 已删**：舞台游走链（startChain/setChainStarter/resetPump + api 的 related 内容源 +
  feedstore 的 tip 透传 + topbar 的 related seg 特判）——三出口改道后 UI 不可达、仅剩「播放器未挂载」
  兜底；删除后图边 237→235（api→relatedapi、player→relatedapi 两条随之消失）。

## 0.9.210：playlayer 拆件收尾（四缝补完）+ 编排重复收口

- **拆件**：会话模型 → `playstate.js`（**零依赖新叶子**，三态装配/快照/层内历史，node 直测）；
  级别栈/步进核 → `levelstack.js`（工作态单源，环境触面经 `setLevelIO` 注入——`relatedBatch`
  走注入不 import relatedapi，**未新增特性域→接口域静态边**，check-direction 口径 B 仍 0 条）；
  playlayer.js 452→318 行只剩视图壳。至此 0.9.184 提出的「视图壳/会话/级别栈/手势」四缝全部拆净。
- **编排重复收口**：`attach.detachSession`（拆会话三行 8 处单源，契约表同步登记）；
  `comments.followComments`（换条评论跟随 2 处单源——同源跳过取竖刷判据，层内 ↑ 回退撞同源
  的窄路径差异已在 comments.js 注释记账，0.9.214 再把「已经是第一条」提示收回 levelstack 核内，
  复原旧实现 stepping 挡在 toast 前的语义）。
- 图：补 playstate/levelstack 独立节点（playstate 入零依赖叶子名单）+ toastmsg（0.9.212）
  ——给 others 聚合成员（danmaku）首画独立边会触发其全部 import 边入图校验（补了
  danmaku→appapi/settings、player→danmaku 三条，见 ccc1d3f）。

## 0.9.187：方向诊断升棘轮（`check-direction` 未登记即红）

- **现状回顾**：第四节边界声明把「层声明 + 在册例外」的方向规则列为暂缓项；第六节 V3 关闭时判
  「永远不值得一座门」，幸存者为**永远 exit 0 的非门禁** `check-direction`。0.9.160 诊断复跑
  校准 `topbar→searchhist` 后，在册 `KNOWN=[]` 清零、两口径均 0 条。
- **改动**：`check-direction.mjs` 由「非门禁」升为**棘轮**——**未登记项 >0 即 `process.exit(1)`**；
  在册项仍带理由放行。`package.json` 的 `check` 链末追加该脚本（进 CI）。**不改判罚口径**（两条
  保守口径原样）——棘轮只对「未登记」判红，不重开"层定义"之争。
- **为何此刻零成本**：在册清零 + 当前 0 条 ⇒ 开棘轮不改变现有绿灯结果，纯防回归：将来任何新反向
  边 = 需要一次裁决（修边 / 加设缝 / 登记入册），不再默默放过（V3 关闭时"不得把规则⑤绿灯误读为
  方向已守护"的缺口由此补上）。
- **附带**：0.9.184/185/186 的架构减债（errbox/playgest 拆件、a11y）均过本棘轮（0 未登记）。

## 0.9.233：分类债专项收敛（sharepanel/rail/slide 一次登记，KNOWN 清零）+ 契约面 tsc 扩面

- **背景（0.9.222 登记的债务兑现）**：0.9.222 记录「sharepanel/rail/slide 谁属特性层从未定过……
  债务留待专项分类纠正（届时三件一起定，一次收敛）」。本批即该专项。
- **裁决**：三件一并计入 FEATURE（check-direction 口径 B 的「特性域」）——它们是与 followview/
  comments 同格的**特性层 UI 件**（消费方只认 openSharePanel/buildSlide 等出口）；README 图中位于
  播放层 others / 私信层 subgraph 是**出身 placement、不是专属域**（同 immsg/imicons/ubbtext 校准先例）。
- **连锁核对（+3 前先重放）**：三件全部入边 = comments/imdrawer/momentdetail/rowkit/playlayer
  （FEATURE）+ player（SKIP_B 组合根）⇒ +3 不浮任何新红；两口径 0 条、KNOWN 复归 []。
- **反跑证据**：暂摘 `'sharepanel.js'` 出 FEATURE ⇒ `sharepanel.js -> momenteditor.js` 立刻以
  「⚠ 未登记」转红（exit 1）；还原后 0/0。check-release 的 minify 反跑见 CHANGELOG 0.9.232。
- **同批第二件（tsc 扩面）**：新 `types/globals.d.ts` 纯声明件（项目「不写 .ts」的唯一例外，
  见 jsconfig 头注）+ 10 契约件（feedstore/session/net/api/settings/levelstack/playstate/immsg/
  commentkit/ubbtext）挂 `// @ts-check`。实测 17 条错误全为环境全局（GM_*/__ACSV_DEBUG__/
  `window.__ACSV_MOCK_*`/WebKitMediaSource）、0 条逻辑/类型错误；摘掉 d.ts 反跑：17 条原样转红。

## 0.9.225：发布头集修复 + 原生页浮标收窄（pubentry 退场）

- **删件**：`pubentry.js`（0.9.224 引入）——原生页浮标不再 body 级常驻，改由 `memberplaza.openPlaza`
  在自己的容器里 `mountPubFab(mpRoot, {light:true})`（随广场开/收）。故 `boot → pubentry` 边退场。
- **新增边**：`memberplaza → pubfab`；`momentpost → appapi`（**发布链要用设备头集**，见下）。
- **为什么 `momentpost → appapi` 是**特性→接口**的正常向**：`appapi` 在方向诊断的 API 集里，
  接口层被特性层消费属常规向下；真正的教训是**不要另造第二份头集**（头集单源在 appapi.homeHeaders）。
- **通道差异的教训（写进 CHANGELOG 与 §11）**：0.9.223 用「APP 域同源页面 fetch」验证发布**成功**，
  但那条路径自带 **Referer**；脚本的 GM 通道没有 Referer ⇒ 缺 APP 头集时被网关拒成 `result 708`
  「无效的请求」。**同源锚点验证会掩盖"缺头"类问题**——通道差异必须单独验。

## 0.9.224：发布入口统一为常驻浮标（pubfab）台账

- **新增件**：`pubfab.js`（消费 momenteditor/ui）；`pubentry.js` 由「导航项注入 + 哨兵 + MO 自愈」**收窄**为
  「挂 body 的 fixed 浮标」一件事（观察器不再需要——站点 SPA 只重画自己的子树，body 级 fixed 元素冲不掉）。
- **新增边**：`pubfab → momenteditor & ui`；`mypage → pubfab`、`squareview → pubfab`（替换 0.9.222 的
  `mypage/squareview → momenteditor` 直连）；`pubentry → pubfab`。
- **撤掉的边/类**：`.acsv-me-entry` / `.acsv-sq-tools` / `.acsv-me-card-entry` 三组样式与两处调用点全撤
  （三处入口统一成一个机制）。
- **两条写进头注的口径（改的时候别丢）**：① **z:57**——浮标压列表内容但**必须被抽屉/详情/编辑器盖住**
  （不许照抄 `#acsv-fab` 的 2147482990：那会盖住它自己打开的编辑器）；② **位置实测校准**——暗色回顶 sticky
  的基准是滚动容器**内容盒**（视图体 padding-bottom:30 ⇒ 实占 [48,84]），故浮标 bottom:94；浅色 fixed
  回顶占 [28,64]，浮标 bottom:74。
- **零漂移**：59/59 场景 + 309 单测；几何断言做过摘修复反跑（bottom 改回 70 即转红）。

## 0.9.222：发动态编辑器 + 三处入口 + 分享面板转发项台账

- **新增两件**：`momenteditor.js`（编辑器，三处入口共用出口，消费 inputbar/composermirror/momentpost/
  cards/overlay/imgload/momentapi/upload/toastmsg/emoticon/dbg/ui/cfg）、`pubentry.js`（原生 /member/feeds
  入口注入，消费 momenteditor/ui）。
- **新增边**：`mypage → momenteditor`、`squareview → momenteditor`、`boot → pubentry`、
  `sharepanel → momenteditor`（**唯一一条入 KNOWN 的**，见下）。
- **在册 1 条（KNOWN=[] 自 0.9.119 以来首次破例）**：`sharepanel.js -> momenteditor.js`。
  **裁决过程（记下来免得下次重走）**：先按「分类纠正」把 sharepanel 计入 FEATURE，棘轮立刻连锁浮出
  `rail.js -> sharepanel.js`；把 rail 也计入 FEATURE，又浮出 `slide.js -> rail.js`……⇒ 判定这是
  **既有分类债**（sharepanel/rail/slide 谁属特性层从未定过；它们此前 import 的目标都不在 FEATURE 集内，
  所以一直没报），**不该在一个功能批里连环重分类**。故撤回 sharepanel/rail 的归类改动，只把本批
  **新引入的那一条边**登记放行，债务留待专项分类纠正（届时 slide/rail/sharepanel 一起定，一次收敛）。
- **后续（0.9.233）**：专项已做——三件一次计入 FEATURE、KNOWN 复归清零（见本文件 0.9.233 节）。
- **顺带**：`momenteditor` 收尾收成单出口 `teardown()`（初版 close/done 各写一遍，且都漏删 `#acsv-me-root`
  ⇒ 反复开会累积空壳）。
- **harness**：新场景 `moment-publish`（20 断言）钉「入口→壳→组参→提交」全链与 params body 形状；
  调试钩子 `momentRepostOf`/`momentEdit`（debug 专用，正式构建死码消除）。

## 0.9.221：输入框镜像层（composermirror）+ 令牌原子编辑（tokenedit）台账

- **新增两件**：`tokenedit.js`（令牌区间扫描/镜像 HTML/事件绑定；只依赖 `ui`）、
  `composermirror.js`（输入条装饰器；依赖 `emoticon`+`tokenedit`+`ui`）。
- **为什么单开装饰器而不塞进 inputbar（本批唯一的架构裁决）**：`inputbar.js` 在 README 分层里属
  **基建层**（check-direction 的 INFRA 集，共 22 件）。要在输入框里渲染表情就必须碰 `emoticon`（特性层），
  直接写在 inputbar 里 ⇒ **新增「基建 → 特性」反向边**（口径 A 实测报红，见本批首次 check-direction 输出）。
  处置＝**加设缝/分家**：inputbar 退回「纯建 DOM」，表情渲染由**特性层装饰器**包一层，
  调用方显式 `decorateInput(bar)`（评论/私信/动态编辑器三处）。方向两口径复归 0 条。
- **新增边**：`composermirror → emoticon & tokenedit & ui`；`comments → composermirror`；
  `imdrawer → composermirror`。`inputbar` 出边**零新增**（它仍然只依赖 ui/styles）。
- **行为纪律（写在模块头注，改的时候别丢）**：① 删除走浏览器原生编辑路径（先选整块再删）⇒ 撤回栈不破；
  ② 组合期（isComposing/229）一律不拦 ⇒ 不吃中文输入法候选词；③ 镜像层与 textarea **必须同度量**
  （字号/行高/内边距/断行逐项对齐）——差 1px 就露「字影」，harness 有断言钉这一条。
- **零漂移证据**：评论/私信/详情三处输入条 DOM 结构只多了 wrap+mirror 两层；既有断言（含 `detail-side-input`）
  全绿，新增 4 条行为断言；摘修复反跑（装饰器空转）转红。
- **顺带修**：`emoticon.insertAtCursor` 程序化写值不发 `input` 事件（镜像层/自动增高会「改了但没重画」）。

## 0.9.219：列表尾部件抽离（listtail）台账

- **新增模块**：`src/listtail.js`——收口**尾部三样**（触底监听双方言 / 三态状态行 / 回顶按钮），
  只依赖 `ui`+`styles`（基建），**不 import 任何特性件**（check-direction 两口径均无新增侵蚀）。
- **收口了什么（按「同一件事被实现了几遍」清点）**：

  | 件 | 收口前 | 收口后 |
  |---|---|---|
  | 触底监听 | 5 份（squarefeed / followview / jingxuanview / searchview(IO) / comments(IO)） | squarefeed/followview/jingxuanview 归一；**searchview 与 comments 的 IO 哨兵有意保留**（非滚动宿主也成立，0.9.141 起范式） |
  | 回顶按钮 | 4 份（squarefeed / followview / zone / searchview） | 归一 + jingxuanview **补上**（此前无） |
  | 三态状态行 | 2 份逐字重复（squarefeed / followview） | 1 份 |
  | 「加载更多」按钮 | moreBtn（仅 mypage 三档消费） | 退役（最后消费方改自动触底） |

- **有意不收口（写下来防下次误读为漏收）**：各页**翻页范式**保留——广场/关注=时间戳游标、我的页
  历史/收藏=pageNo、分组=偏移量、搜索=页码+IO 哨兵、分区=自持游标+按行补齐、空间页小视频=后台链+页码条。
  统一的是**尾部呈现与触发件**，不是翻页协议。
- **新增边**：`listtail → styles & ui`；`squarefeed / followview / mypage / zone / searchview /
  jingxuanview → listtail`（全为特性层→基建层，零反向）。
- **零漂移证据**：squarefeed / followview 换件后 `view-square`、`member-plaza`、`space-moments`、
  `view-follow` 场景**断言未改**全绿；我的页三档改自动触底是**有意的行为变更**，断言按新口径重写
  并做摘修复反跑（摘 `onBottom` → 四条转红，还原即绿）。
- **顺带修**：`followview` 的状态行此前注释写「点击=手动重试」却**未接线**（首屏失败时没有可依的
  滚动，点击是唯一出口）——接入本件后自动接上。

## 0.9.218：动态浏览（空间页注入 + 我的页双宿主）拆件台账

- **新增两个模块**：`spacetab.js`（空间页内容标签栏注入共享件：标签卡 + 面板 + 手动切换 +
  站点排序控件互斥 + **确定性插入位** + 共享 MutationObserver 自愈；只依赖 `ui`）、
  `spacemoments.js`（空间页「动态」标签特性件）。
- **新增边**（全部层内互调，口径 A/B 均 0 未登记）：
  - `spacemoments → cfg / ui / spacetab / squarefeed / momentapi / memberplaza`
  - `spacetab → ui`
  - `uppage → spacetab`（**uppage 借此从 `others` 聚合升为独立节点**——聚合名单会漏检指向它的边，
    升节点后 `boot → uppage`、`player → uppage` 两条此前不可见的边一并入图）
  - `mypage → momentapi / rowkit / squarefeed`；`rowkit → momentdetail`；`boot → spacemoments`
- **为什么把落点策略下沉 rowkit**（`openRowDefault`）：广场视图与我的页动态两处原本各写一份
  「动态→详情面板 / 非动态→href」的策略（同一含义两处定义=漂移源）。下沉后 `squareview` 与
  `mypage` 共用一份，工厂的 `onOpen` 仍可覆盖（`memberplaza`/`spacemoments` 传 noop = 原生页语义）。
  环检查：`momentdetail` 不 import `rowkit`，新边不成环（check-deps 规则⑤ 已复核）。
- **为什么 `spacetab` 要抽**：两个自建标签（小视频 order2 / 动态 order1）共存需要**一套**切换/
  互斥/排序逻辑——各写一份就是「两份看着一样」（单源收口不允许）。抽出时 uppage 侧只保留
  面板内容与启动链，零行为变化（空间页场景 `space-moments` 的位次/切换断言即其闸门）。
- **为什么 `addAmAnchor` 从 memberplaza 导出**：两个原生页宿主（/member 内嵌广场、/u/ 空间页动态）
  的落点出口同形，导出复用可避免第二份实现；属特性层内互调（非反向）。
- **`spacemoments → squarefeed` 的复用代价与代价的定价**：列表机械（加载/三态/骨架/触底/回顶/
  新鲜度回填）全部来自广场工厂；为此给工厂加了四个可注入项（`fetchPage/emptyText/poll/view`），
  **默认值＝改造前行为**——零漂移证据＝`view-square` 与 `member-plaza` 场景全绿（既有断言未动）。

## 0.9.258：CSS 压缩内嵌的两个新件（审计批②，P0-1 + 解包单源）

- **新增模块**：`pack.js`（内嵌压缩串解包**单源**：`unpackText(packed, len, onFail)`，零内部依赖，
  只 import fflate）、`cssraw.js`（全量 CSS 模板，**构建期输入**——只被根目录 `build.js` import，
  src 内零入边、不进产物；产物里以 `window.__ACSV_CSS_SRC__` 压缩串携带）。
- **新增边**（口径 A/B 均 0 未登记）：`styles → pack`、`hls → pack`、`devname → pack`（三条都是
  特性/播放层 → 基建件）。`pack.js` 已登记 `check-direction` 的 INFRA 与 `check-deps` 的
  EXCLUDED_TARGETS（否则口径 A 报「styles→pack 越层」）；README 图补两节点三边。
- **为什么不再各留一份解包**：原 `hls.unpackHls` 与 `devname.unpackDeviceTab` 是逐字相似的两份，
  CSS 若照抄就是第三份（AGENTS 规则 3）。收口后两件只剩薄壳补各自打点
  （`hls.unpackLen`/`hls.unpackErr` 读数与调用方零变化），`hls-pack` / `devname` 单测未改即绿。
- **IMGVIEW_CSS 为何留作第 13 缝**：它在原文里是 `+ IMGVIEW_CSS +` 拼接引用；内联成字面量会让
  同一段 CSS 在仓里存两份（styles.js 与 cssraw.js）⇒ 迟早漂，与单源收口相冲。留缝则 styles.js
  仍是该段文本唯一出处。

## 0.9.259：翻页骨架抽离（审计批④ P2-5）+ check-direction 登记卫生与覆盖扩面第一轮

- **新增模块**：`pageloader.js`（翻页骨架**单源**，零依赖叶：`createPageLoader(o) → {load, reset, done}`）。
  收口的是四家**逐字相同的协议**——在途守卫 / 代数令牌 + `host().isConnected` 陈旧回包丢弃 / 骨架
  成功失败两路都收 / 三态状态行 / 落定交 `onPage` 回 `{cursor, noMore}`；**翻页范式留在消费点**
  （游标方言、传输、契约过滤、到底判定、空态文案）。四消费点：`followview`（关注流，momentId||acId
  去重 + markSeen + armExpanders）、`squarefeed`（广场/个人主页两宿主，onRow + armBackfill + 发现态
  latestAmId）、`mypage` 观看历史（页码方言 + **原始条数**到底判据 + 契约过滤，bone 每页都建）、
  `mypage` 管理档壳（收藏夹/分组，页码⇄偏移量两游标，档表未到不发）。
- **保留到缝里的四处差异（都是显式选项，不是隐性行为）**：①`skeleton(firstPage)`——历史档每页都建，
  故本件不按 firstPage 过滤、只把 firstPage 传进去；②`earlySettle`——历史档沿用 0.9.236 形状
  （在途标志与骨架在**陈旧守卫之前**结算；另三家在守卫之后，`reset()` 的 seq++ 若在守卫前清
  loading 会让迟到回包放开在途标志、叠发一发）；③`busyGate()`——管理档壳的续拉状态行判据是
  「已有条目」（首屏 0 行且未到底时与「非首屏」不等价）；④`beforeFetch()`——同上壳的「档表未到
  不发废请求」（`cur == null` 时清状态行并跳过）。
- **新增边**（`check-direction` 两口径 0 未登记 / `check-deps` 绿）：`followview → pageloader`、
  `squarefeed → pageloader`、`mypage → pageloader`（三条都是特性/视图件 → 基建件）。`pageloader.js`
  已登记 `check-direction` 的 INFRA（零依赖叶，同 `pack.js` 定位）；README 图补一节点三边。
  **`check-deps` 未动 EXCLUDED_TARGETS**：`pack.js` 那条走豁免是因为它的入边不打算画，而本件的
  三条入边直接画在图里（规则③由"画边"满足，比豁免更严——将来新增消费点漏画会直接翻红）。
- **`check-direction` 卫生（P3-2）**：①`INFRA` 计数注释 16 → **23**（16 是 0.9.11x 时代的残留；
  实况 0.9.256 时 21、0.9.258 加 pack 后 22、本批加 pageloader 后 23），并附复点命令与"改 INFRA
  同批改本行"的纪律；②删掉 `FEATURE` 内 `momentpost.js` 的**重复登记**（`:83` 与 `:93` 各一份，
  全表唯一重复，令注册数与成员数各虚增 1——归类理由留在原处，条目归位上组）。
- **覆盖扩面第一轮（逐件试登记 + 跑 check-direction；本轮 7 件里 3 件入册）**：
  - 入册 `cards.js` / `views.js` / `imsend.js`（均 **FEATURE**，两口径 0 条）。理由分别：cards＝
    卡面 kit 单源，11 个消费方全在表内（当基建件会在口径 A 报 `cards→ubb` 越层）；views＝子视图
    框架，唯一消费方 player 是 SKIP_B 组合根（另一可行桶是 SKIP_B，取 FEATURE 是因为它更严：
    将来任何非特性件反向依赖本件仍会翻红）；imsend＝私信域发送核心，消费方 imbadge/imdrawer/
    sharepanel 三件均已在表内（README 私信层是出身 placement，同 0.9.233 校准先例）。
  - **未入册四件（`session` / `feedstore` / `controls` / `dmcanvas`）——两个桶都会翻红，且翻红的
    边全是播放层→播放层**（`check-direction` 只认"基建/接口/特性"三层，**播放层内核没有桶**）：
    | 文件 | 登记 FEATURE 时翻红 | 登记 INFRA 时翻红 |
    |---|---|---|
    | `session.js` | `attach → session` | `session → hls` |
    | `feedstore.js` | `attach/controls/input/playback/prewarm/report/views → feedstore`（7 条） | `feedstore → feedctx` |
    | `controls.js` | `input → controls` | `controls → attach/danmaku/feedstore/playback`（4 条） |
    | `dmcanvas.js` | `danmaku → dmcanvas` | `dmcanvas → advdm` |
    这不是"修边"就能消的债——要收它们得先给口径 B 添一个"播放层/编排宿主"桶（本批不动，
    留作下一轮分类裁决；`KNOWN` 仍为 **[]**，没有为凑绿新增任何豁免）。
  - 结果：注册 67 → **71** / `src` 110 → **111**（60.9% → **64.0%**）；未纳 40 件（follow-up 清单：
    advdm/attach/banpop/channelapi/controls/cssraw/dmcanvas/emoticon/favapi/favpop/feedctx/feedstore/
    followseen/grouppop/hls/imcard/input/interact/levelstack/listtail/momentapi/pickpop/playback/
    playgest/playstate/popplace/prewarm/relatedapi/relationapi/release/report/searchfmt/session/
    sidebar/toastmsg/ubb/upload/watchledger + devicetab（生成物））。每加一件都要入边审计，
    故全量扫尾不在本批范围。

## 0.9.260：播放层建桶（口径 C）+ 收编 0.9.259 卡住的四件 + 覆盖面 64%→82%

0.9.259 的四件（`session`/`feedstore`/`controls`/`dmcanvas`）不是"入边审计没做完"，而是**分类学缺一层**：
归 FEATURE 会把"播放层→播放层"的入边误判成反向（口径 B 红），归 INFRA 又会被"→ 未登记件"判红
（口径 A 红）。本批补的正是这个桶，而不是给四件找豁免（`KNOWN` 仍为 **[]**）。

- **新桶 `PLAY`（播放层，18 件）**：`session attach playback hls prewarm | controls input |
  dmcanvas danmaku | playgest playstate levelstack relatedapi | interact report watchledger |
  feedstore feedctx`。定位=**播放/泵流核心**（含播放态、弹幕窗口、泵游标等**领域知识**——所以不能进
  INFRA；又被特性层广泛依赖——所以不能进 FEATURE）。
- **新口径 C**（`test/check-direction.mjs`）：`PLAY → (PLAY ∪ INFRA ∪ API ∪ LEAF_SHARED)` 之外即红。
  它补的正是前两条口径剩下的两半：口径 B 管"播放层→特性"，口径 C 再管"播放层→组合根 / 未登记件"；
  反过来"基建→播放层"仍由口径 A 判红（PLAY 不在 A 的允许集里）——**建桶没有放松任何既有边**。
- **两件零依赖叶归位（`LEAF_SHARED`）**：`advdm`（高弹模型核：无 DOM/无状态/无网络）与
  `toastmsg`（话术单源：只 import ui/cfg）。不归位的话口径 C 会各报一条 `dmcanvas→advdm` /
  `danmaku→toastmsg`；归零依赖叶即消解，且**无一基建件 import 它们**，口径 A 射程零变化。
- **反跑证据**：临时在 `session.js` 顶插 `import './devicetab.js';`（播放层→未登记件）⇒ 口径 C
  `1 条 / [⚠ 未登记] session.js -> devicetab.js`、**exit=1**；还原后三口径复归 0、exit=0。
- **覆盖**：注册 71 → **91 / 111（82.0%）**，未纳 20 件；其中 `cssraw.js`（构建期输入、src 内零入边）
  与 `devicetab.js`（生成物）属**无需登记**，其余 18 件（banpop/channelapi/emoticon/favapi/favpop/
  followseen/grouppop/imcard/listtail/momentapi/pickpop/popplace/relationapi/release/searchfmt/sidebar/
  ubb/upload）仍是后续可选的逐件审计对象（每加一件仍要过入边）。

## 0.9.261：覆盖收尾——剩余 18 件全部登记（另 2 件属"无需登记"）

0.9.260 之后未纳 20 件；本批把其中 18 件按性质登记，逐件核过入边，三口径复跑 **0/0/0**：

| 桶 | +件数 | 文件 | 归类依据 |
|---|---|---|---|
| **API**（接口层） | +5 | `channelapi` `favapi` `relationapi` `momentapi` `upload` | 域传输：只做端点取数与回包规整，不含视图/交互知识。归 FEATURE 也全绿，但会把"传输"与"特性域"混为一谈；归 API 后出边**仍受口径 B 约束**（接口层→特性=红），不是自由桶 |
| **LEAF_SHARED** | +1 | `searchfmt` | 纯投影（同 `ubbtext` 族）：搜索卡投影，只依赖 imgurl/playitem/timefmt |
| **FEATURE** | +12 | `banpop` `favpop` `grouppop` `pickpop` `popplace` `emoticon` `ubb` `imcard` `listtail` `sidebar` `release` `followseen` | 特性层共享 kit / 弹层族 / 视图尾件 / 私信卡；入边**全部来自 FEATURE 或 SKIP_B 组合根**（逐件表见 `check-direction` 内的分组注释） |

- **覆盖**：91 → **109 / 111（98.2%）**。未纳仅 `cssraw.js`（构建期输入，src 内零入边）与
  `devicetab.js`（生成物）——这两件**不属于任何方向口径的候选**，登记反而是噪声。
- **一处注释勘误**：`momentpost` 的归类注释曾写"与同在 FEATURE 里的 momentapi（读域）同类"——
  momentapi 实际从未登记过。本批按域传输归接口层，注释同步改为"接口层的 momentapi（读域）"。
- **反跑/证据**：本批只做登记（不改任何 import 边），门禁本身即证据——若某 FEATURE 成员的入边
  来自非特性来源，口径 B 立即翻红（0.9.259 的"四件被卡"表就是历史反证）。
- **未做的**：`deleteMoment`/`uploadImages` 仍不删。复读后判定它们不是"漏删的死代码"而是
  **已设计未接线**的 API（文件头与 CHANGELOG 都记着设计意图：动态删除、九宫格多图上传），
  删掉等于丢弃已完成的实现；真要清，应先裁决"这两个功能还做不做"，再连 README/CHANGELOG 一起改。

## 0.9.265：mypage 拆件（mytabs）

- **由头**：P2-8 拆件评估第一项。`mypage.js` 739 行，资料头 + 动态 + 历史 + 管理壳 + 收藏 +
  分组 + 视图注册挤在一件，改任一档都要读整文件。
- **拆法**：新建 `mytabs.js`，承接 `buildHistory` / `adminTab` / `buildFav` /
  `buildFollowGroups` 及其私有件 `rowList`/`skeleton`/`makeListCtx`；`mypage.js` 只留资料头
  （`meCardOf`/`buildMeCard`）、动态档（`buildMoments`）、视图壳（`buildMyView`）、卸载与注册。
  代码**逐字搬迁**（仅三个 builder 加 export、import/export 重排），对 `HEAD:src/mypage.js`
  做过逐段行多重集比对。
- **方向**：`mypage → mytabs` 单向；mytabs 出边 = 基建（cfg/panelitem/ui/pageloader/nameval/
  imgload）+ 接口（appapi/favapi/relationapi）+ 特性共享件（cards/listtail/favpop/grouppop/
  pickpop/toastmsg）。`check-direction` FEATURE 加 `mytabs.js`，三口径复跑 **0/0/0**；
  README 图把原 mypage 的 18 个目标拆成 mypage 9 条 + mytabs 12 条（与 import 实测一致）。
- **零漂移证据**：既有单测 419/419、lint/tsc/check、harness chromium 82/82 全绿，断言与夹具
  未改。产物 release 577,942 B / debug 923,519 B（debug +20 B = 文件头注释，压缩产物不变）。


## 0.9.266：imsend 拆件（imimage）

- **由头**：P2-8 拆件评估第二项（§11）。`imsend.js` 889 行里约 200 行是**纯图片域**（字节管线 +
  URL 换链），与发送核心（SDK 加载/连接/发送恢复链）无共享状态，却让每次改图片缓存都要读发送可靠性。
- **拆法**：新建 `imimage.js`，承接 `midgroundToken`/`mgTokenP`、`imgBlobCache`/`IMG_BLOB_CACHE_MAX`/
  `cacheBlobPut`、`imgQ`/`imgActive`/`IMG_Q_LIMIT`/`runQueuedImg`/`pumpImgQ`/`enqueueImg`、
  `imgInflight`、`imgCacheKey`、`peekImImageBlob`/`fetchImImageBlob`/`prewarmIm`，以及 URL 换链
  `imageUrlOf`/`imageUriFromRaw`/`officialize`；`imsend.js` 保留 `sendImage`（只走 SDK 构造器，
  不碰字节管线）。代码**逐字搬迁**（两段原文直接剪切，仅 import/export 重排），`imsend.js`
  889 → 688 行、`imimage.js` 210 行。
- **方向**：`imdrawer → imimage` 单向；imimage 出边 = 基建（cfg/dbg/net/ui），**不 import imsend**
  （无回边、无环）。`check-direction` FEATURE 加 `imimage.js`（与 imsend/imdrawer 同属私信特性域，
  唯一入边来自 imdrawer），三口径复跑 **0/0/0**；README 图新增 imimage 节点 +
  `imdrawer --> … & imimage & …`，check-deps 节点/边规则即证。
- **零漂移证据**：既有单测 419/419、lint/tsc/check、harness chromium 82/82 全绿，断言与夹具
  未改；`imsend.js` 的 `ui` import 去掉搬迁后不再使用的 `selfUid`（`cookieVal` 仍供 `isLogined`），
  `gmRequest`/`swallow`/`stat`/`set` 均仍被 SDK 加载器与其他段使用，保留。产物尺寸见 CHANGELOG
  0.9.266（净增仅为新文件头注释，逻辑字节等价）。


## 0.9.267：controls 拆件（dmpanel）

- **由头**：P2-8 拆件评估第三项（§11）。`controls.js` 732 行里约 150 行是**弹幕设置面板**
  （齿轮展开的两 tab：设置滑杆/开关 + 屏蔽标签/关键词），与控制栏的进度条/菜单/手势无共享
  状态，却让每次改面板都要读整份控制栏代码。
- **拆法**：新建 `dmpanel.js`，承接 `buildDmPanel(slide)` 及其私有件 `DM_DEFAULT`/
  `refreshDmPanel(box)`（原 471–623 行整体搬迁）；`controls.js` 只留控制栏主体与
  `var dmPanel = buildDmPanel(slide)` 调用点。代码**逐字搬迁**（仅 `buildDmPanel` 加 `export`、
  import 重排 + 文件头归属注释），对搬迁前工作区原文做过逐行 diff：除 `export` 关键字外 0 差异。
- **方向**：`controls → dmpanel` 单向；dmpanel 出边 = 基建（ui/settings），**不 import
  controls**（无回边、无环）。`check-direction` 把 `dmpanel.js` 登入 **PLAY**（与 controls 同属
  播放层 UI 件；PLAY→INFRA 合法，不归 FEATURE），三口径复跑 **0/0/0**；README 图把 dmpanel
  并入播放层 others 聚合名单（不单独建节点——单独建 controls 节点会触发其全部出边校验）。
- **零漂移证据**：既有单测 419/419、lint/tsc/check、harness chromium 82/82 全绿，断言与夹具
  未改；`controls.js` 732 → 579 行、`dmpanel.js` 159 行。产物尺寸见 CHANGELOG 0.9.267。

## 0.9.268：imdrawer 拆件（imbubble）

- **由头**：P2-8 拆件评估第四项（§11）。`imdrawer.js` 938 行里约 200 行是聊天视图的**气泡渲染
  簇**（引用条/定位/行包裹/文本/图片/作品卡/分享/评论转发/动态卡 + 暗色卡片皮肤），与抽屉
  骨架、轮询、列表、发送生命周期零共享状态；评估原判「风险中高：`msgEls` 依赖
  `lastElementChild`，多处直读 drawer，先补渲染断言再拆」。
- **先补断言（搬迁前独立跑绿）**：新增 debug 钩子 `imBubbleSmoke`（假消息直调 `appendBubble`：
  己方/对方文本、extra 引用、10001 作品卡；返回 bubbles/mine/text/quote/quoteLink/
  quotePreview/quotebtn/card/daydiv 快照）；`test/cases/msg.js` 新增 `im-bubble` 场景（6 条
  断言），`run-harness.mjs` 登记 debug 构建。搬迁前 `im-bubble` 9 断言、`im-open,im-native`
  25+13 断言全绿，搬迁后同一钩子继续绿——断言是拆件的验收面，不是事后补的注脚。
- **拆法**：新建 `imbubble.js`（264 行），导出 `createBubbleKit(env)`；env =
  `getDrawer/getChat/getInst/setQuote/maybeDayDiv/msgTime`。出口
  `{ appendBubble, quoteStrip, bubbleRow, locateMessage, SKIN, msgFrom, imTextHtml }`
  （后两个供 `chatPollOnce` 的消息 key 与发送乐观占位复用，避免第二份实现）。
  搬迁范围：`msgFrom`、`linkify`/`imTextHtml`、`quoteStrip`/`locateMessage`/`bubbleRow`/
  `quoteBtnEl`、`appendBubble`/`appendImageBubble`/`SKIN`/`appendCardBubble`/
  `appendShareBubble`/`appendMomentBubble`。机械替换仅五类：
  `drawer`→`env.getDrawer()`、`chat`→`env.getChat()`、`lastImInst`→`env.getInst()`、
  `setQuote`→`env.setQuote`、`maybeDayDiv`→`env.maybeDayDiv`；逻辑/文案/类名/请求参数零改动。
- **方向**：`imdrawer → imbubble` 单向；imbubble 出边 = FEATURE（emoticon/imcard/imimage/ubb）
  + INFRA（cfg/ui/imgload/imgview）+ API（appapi）+ 零依赖叶（immsg/imicons），**不 import
  imdrawer**。`check-direction` FEATURE 加 `imbubble.js`，三口径复跑 **0/0/0**；README 图新增
  节点 + imdrawer/imbubble 两组实测边，`check-deps` 节点/边/环全绿。
- **零漂移证据**：既有断言与夹具零改动；lint、tsc、check（check-cases 81/81、check-deps、
  check-direction）、单测 419/419、harness chromium 82/82（含拆前新增的 im-bubble）全绿。
  `imdrawer.js` 938 → 769 行、`imbubble.js` 264 行；仅新增文件头注释与工厂边界。

## 0.9.269：imdrawer 三簇拆件（imlist / imchat / imsendui）

- **由头**：P2-8 拆件评估续项（§11）。0.9.268 把气泡渲染簇拆到 imbubble 后，`imdrawer.js` 仍
  769 行混四族：抽屉骨架/视图切换/生命周期（本分）、列表视图、聊天视图+引用 chip、发送乐观 UI。
  后三族只共享 `drawer/view/cards/chat/lastImInst` 与 `msgTime`/`makePoller`，却让任一族改动都要
  读整份抽屉代码。**分三子批，每批 build + harness 全绿后才动下一批**（与 0.9.265–268 同纪律）。
- **子批 1（发送 UI → imsendui.js）**：搬 `sendImageMsg`/`readSize`/`sendChat`；工厂
  `createSendKit(env)` 导出 `{ sendImageMsg, sendChat }`，env =
  `getDrawer/getChat/getBubble/maybeDayDiv/setQuote/chatPollOnce`。`inputBar` 的图片/发送回调改走
  kit；`imdrawer.js` 769 → 652 行。harness `im-bubble,im-open,im-native,composer-rich`
  = 9/25/13/49 断言全绿。
- **子批 2（列表视图 → imlist.js）**：搬 `listPoll`/`sessionSig`/`refreshList`/`renderList`/
  `previewOf`/`lastListRows`/`listSig`；`createListKit(env)` 导出
  `{ listPoll, refreshList, renderList, previewOf, reset }`，env =
  `getDrawer/getView/getCards/setCards/openChat/makePoller/msgTime/chatTime`。`showList` 改
  `listKit.listPoll.stop()/start()`；搜索框改 `listKit.renderList`；行点击经 env.openChat 注入回
  `showChat`（编排仍留宿主）；`imdrawer.js` 652 → 561 行。harness
  `im-bubble,im-open,im-native,view-im,view-im-narrow` = 9/25/13/30/30 全绿。
- **子批 3（聊天视图+引用 chip → imchat.js）**：搬 `chatPoll`/`loadChat`/`chatPollOnce`/
  `dayLabel`/`maybeDayDiv`/`chatTime`/`setQuote`/`renderQuoteChip`；`createChatKit(env)` 导出八件，
  env = `getDrawer/getChat/setChat/getInst/setInst/getBubble/makePoller/msgTime`。`bubble` 工厂的
  `setQuote`/`maybeDayDiv`、`sendKit`/`listKit` 的跨簇钩子全部改指 `chatKit`；`showChat` 改
  `chatKit.chatPoll.stop()`/`loadChat()`/`chatPoll.start()`；`closeDrawer`/`teardownIm`/
  `ensureDrawerDom`（chip 取消、表情冷启动重拉）与 `imBubbleSmoke` 同步改；`imdrawer.js`
  561 → 454 行。harness `im-bubble,im-open,im-native,badge-listener,badge-delay`
  = 9/25/13/9/4 全绿。
- **两处必要的缝扩展**（与 0.9.268 同款，记为偏差而非静默改动）：
  ① `imlist` 多一个 `reset()`——teardown 原先清 `listSig/lastListRows`；若不重置，重开抽屉时
  同一会话集命中旧签名会跳过 `renderList`，新骨架的 listBody 将空着；
  ② `imchat` 直接 import 零依赖叶 `immsg.msgTextOf`，保持 `chatPollOnce` 的兜底消息 key 与拆前
  逐字一致（避免在 kit 内复制一份文本投影）。`imdrawer` 的 `setChat` 单写点以 env 注入，宿主与
  kit 不各存一份会话态赋值。
- **方向**：三件均为 `imdrawer → imlist/imchat/imsendui` 单向，**不 import imdrawer**（无回边、
  无环）。出边：imlist = INFRA（imgload）+ 零依赖叶（immsg）+ FEATURE（imsend）；imchat =
  零依赖叶（immsg）+ FEATURE（imsend）+ INFRA（timefmt）；imsendui = FEATURE（imsend）+ 零依赖叶
  （toastmsg）。
  `check-direction` FEATURE 加三件，三口径复跑 **0/0/0**。
- **README 图**：私信 subgraph 新增三节点；`imdrawer -->` 按实测收窄（去 imgload/immsg/timefmt，
  加 imchat/imlist/imsendui）；新增 `imlist -->`/`imchat -->`/`imsendui -->` 三组实测边；
  `check-deps` 节点/边/环全绿。
- **零漂移证据**：既有断言与夹具零改动；lint、tsc、check（check-cases、check-deps、
  check-direction 0/0/0、check-listeners）、单测 419/419、harness chromium **83/83** 全绿。
  `imdrawer.js` 769 → 454 行；`imsendui.js` 154 / `imlist.js` 139 / `imchat.js` 155 行。
  产物 release 581,083 B / debug 930,497 B（+1,415 / +3,666 B，均在新文件头注释与工厂边界）。

## 0.9.270：imsend 拆件（imsdk）

- **由头**：P2-8 拆件评估第五项（§11，评估原判「收益最大但风险高：`imPromise`/`connGen`/
  崩溃水位被发送恢复链跨切，需一次边界重排」）。`imsend.js` 688 行里约 350 行是 SDK 基建
  （加载/注入/源码补丁/tracer 手术/日志黑匣子/weblog 垫片/单例连接/崩溃水位），与「联系人 +
  发送核心」只经 7 个出口相连；改 SDK 策略却要读完整份发送可靠性代码。
- **边界（按当前函数名整组搬，零逻辑改动）**：新件 `imsdk.js`（402 行）收 `pageWin`、日志
  黑匣子（`logInstaller`/`injectPageFn`/`ensureLocalLog`/`imLogMark`/`imLogVerdict`/
  `imLogState`/`imLogTotal`/`tracerCrashAfter`/`tracerFixedTotal`/`hadTracerCrash`）、weblog
  兜底（`weblogInstaller`/`tracerOk`/`ensureWeblogSync`）、`isLogined`、`gmGetText`/
  `loadImSdk`、`imPromise`/`ensureIm`、`linkOk`/`forceReconnect`、`tracerInstaller`/
  `ensureTracer`、`connGen`/`imShutdown`/`ensureConnected`、`resetSingleton`/`rebuildIm`。
  `imsend.js` 688 → 302 行，只留 `getContacts`/`mapSessions`/`fetchCards` + `doSend`/
  `forceSync`/`withSendRecovery`/`sendOnce`/`sendKernel`/`sendImage`/`sendQuote`/
  `sendCmtShare`/`sendMomentShare`。
- **跨切状态处理**：三处跨切状态**整组随 SDK 走**，不做双向访问——
  `imPromise`（单例槽，rebuild 期间占槽语义不变）、`connGen`（在途轮询世代，`imShutdown`
  与 `ensureConnected` 同处）、`tracerFixedTotal`（已修复水位，`hadTracerCrash` 与
  `rebuildIm` 同处）。`imsend.withSendRecovery` 只 import `hadTracerCrash`/`rebuildIm`/
  `linkOk`/`ensureConnected`/`ensureTracer` 五个出口；`doSend` 只 import `imLogMark`/
  `imLogVerdict`。`rebuildIm` 的水位推进**仍在 `ensureConnected(inst)` 成功后执行**
  （`tracerFixedTotal = imLogTotal()`），与拆前逐字一致。
- **导出契约**：imsdk 导出 13 件——`ensureIm`/`isLogined`/`linkOk`/`forceReconnect`/
  `ensureTracer`/`imShutdown`/`ensureConnected`/`rebuildIm`/`imLogMark`/`imLogVerdict`/
  `hadTracerCrash`/`imLogTotal`/`tracerCrashAfter`。imsend 的 SDK 出口全部删除（消费方同步
  改指 imsdk），`gmRequest`/`cookieVal`/`stat`/`set` 四个不再使用的 import 同批移除
  （eslint 零告警）。
- **消费方迁移（逐个 grep，7 件）**：`imdrawer` → `ensureIm/isLogined/imShutdown`；
  `imbadge` → `ensureIm/isLogined`；`imlist` → `ensureIm/ensureConnected`（`fetchCards`
  留 imsend）；`imchat` → `ensureIm/ensureConnected/ensureTracer`；`imsendui` →
  `ensureIm/ensureConnected/ensureTracer/linkOk`（发送四件留 imsend）；`sharepanel` →
  `ensureIm/ensureConnected/isLogined`（联系人/发送留 imsend）；`imsend` → 上述七个出口。
  无遗漏：`grep -rn "from './imsend.js'" src test` 复核后，该路径只剩三处发送/联系人消费
  （`imlist` 的 `fetchCards`、`imsendui` 的发送四件、`sharepanel` 的联系人/发送五件），
  SDK 出口已无任何 imsend 引用。
- **方向**：入边 `imsend/imdrawer/imbadge/imlist/imchat/imsendui/sharepanel → imsdk`，
  全部在 FEATURE 表内（层内互调）；imsdk 出边只到基建 `cfg/dbg/net/ui`。`check-direction`
  FEATURE 加 `imsdk.js`，三口径复跑 **0/0/0**；`check-deps` 图节点 111 + 图边 372，
  新增七条实测边后全绿（旧图里 `imbadge/imchat/imdrawer → imsend` 三条多边告警随之消失）。
- **零漂移证据**：搬迁前后按函数逐段 diff（HEAD 基线 + 工作区 0.9.269 增量核对），除
  `export` 关键字与模块头注释外 0 差异。单测 **419/419**（`imsend.test.js` 4 条水位语义
  断言未改，只改 import 路径与头注）；lint、tsc、check 全绿；harness chromium **83/83**
  （badge-delay 4、badge-listener 9、im-open 25、im-native 13、im-bubble 9 全绿）。
  `imsend.js` 688 → 302 行、`imsdk.js` 402 行；产物 release 581,083 B / debug 930,516 B
  （release ±0 B / debug +19 B，均在新文件头注释）。

## 0.9.271：player 第一阶段拆件（sessionhooks）

- **由头**：`player.js` 758 行拆件方案 Phase 1。`SESSION_HOOKS` 与画幅判断约 120 行是
  session↔UI 胶水，却占着组合根；先把这层显性化，再做 Phase 2 `feedland`。
- **拆法**：新建 `sessionhooks.js`（148 行），导出 `createSessionHooks({ scrollToIndex })` +
  `syncPanFit`/`videoStageVisible`；`SESSION_HOOKS` 与 `panFitOf`/`syncPanFit` 逐字搬迁，
  唯一导航回调 `scrollToIndex` 经工厂注入（不 import player）。`player.js` 758 → 640 行，
  只留装配、resize 监听与原编排。
- **方向**：`player → sessionhooks` 单向；sessionhooks 出边 = 播放层（attach/controls/danmaku/
  feedstore/playback/playlayer/report）+ 特性（rail/views）+ 基建（cfg/styles/ui/state/dbg）。
  归类 **SKIP_B**（与 boot/player 同格；SKIP_B 对口径 B 源豁免，归 PLAY 会触发口径 C）。
  `check-direction` 三口径 **0/0/0**；README 图新增 `player --> sessionhooks` 与
  `sessionhooks --> attach & danmaku & feedstore & pb & playlayer & views`（实测边）。
- **零漂移证据**：`SESSION_HOOKS` 逐字搬迁（仅 `scrollToIndex` 改注入引用、模块头注释新增）；
  现有 smoke/stall-*/recover-*/watch-report/prewarm/land-near 等断言不改。单测 419/419、
  harness 83/83、lint/tsc/check 全绿；产物尺寸见 CHANGELOG。

## 0.9.272：player 第二阶段拆件（feedland）

- **由头**：player 方案 Phase 2。issue #1 的落位/吸附约 120 行是时序最敏感的一段，先独立。
- **拆法**：新建 `feedland.js`（174 行），`createLandKit(env)` 注入 `getScroller/feedStore/
  slideAt/stageVisible/setActive/renderWindow/reportLeaveCurrent`；`landAt`/`snapWatchTick`/
  `start-stopSnapWatch`/`landWhenVisible`/`scrollToIndex` 逐字搬迁，`player` 640 → 522 行。
- **方向**：`player → feedland` 单向；feedland 只 import `dbg`（基建），`setActive`/`renderWindow`
  经注入避免 PLAY→组合根。归 **PLAY**；`check-direction` 三口径 **0/0/0**。README 图新增
  `player --> feedland`。
- **零漂移证据**：`land-near` 的 `land.stuck`/`land.heal`/`land.trunc`/`land-heal-on-snap`
  断言未改且全绿；fastswipe/feed-slim/deeplink-*/stall-*/recover-* 同批全绿；单测 419、
  harness 83、lint/tsc/check 全绿。player 仍保留 renderWindow/setActive/mount/unmount 与
  路由编排（组合根不拆）。

## 0.9.289：关注列表档移件（followadmin）

- **新增模块**：`src/followadmin.js`——我的页「关注列表」档（对齐原生 /member/feeds/following，
  自 mytabs 移出；旧 buildFollowGroups 形态随批退役，adminTab 壳自此只剩收藏夹单消费方）。
- **新增边**：`followadmin → cards & imicons & imgload & listtail & nameval & overlay &
  pageloader & relationapi & toastmsg`；`mypage → followadmin`。`mytabs` 出边同步收窄
  （grouppop/imgload/nameval/relationapi/toastmsg 五边随移件消失）。
- **登记**：`check-direction` FEATURE 加 `followadmin.js`（唯一消费方 mypage 在表内；出边只到
  基建/零依赖叶/已入表特性共享件 cards/listtail/overlay——overlay 归 INFRA，接口层 relationapi
  为合法向下），三口径 0 条。
- 复点：`node test/check-direction.mjs` 0/0/0。
