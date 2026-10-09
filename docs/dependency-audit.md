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
