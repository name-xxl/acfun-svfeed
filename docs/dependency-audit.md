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
