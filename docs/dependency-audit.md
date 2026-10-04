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
  ——在册收敛为 1 条（data→ubb）。
- **V3 正式关闭**：方向卫生库存 = 5 条、全部无环、消法现成——**永远不值得一座门**。幸存者 =
  `test/check-direction.mjs`（npm script `check-direction`）：每 Phase 顺手跑一次的**非门禁**
  诊断，并列两条保守口径（正式分层 / 特性域），在册项带理由、未登记项报警、永远 exit 0。
  头注原样留档本审计最值钱的认知——「规则的上游是口径，口径不定，候选集就不定」。
- 诊断首跑（0.9.117）即校准一处口径：`topbar→imicons` 曾按 私信层 subgraph 归属被误报——
  imicons/immsg 是 README 明示的零依赖解耦点（出身 placement），视同基础件（同
  report→watchledger 的误报自纠：错的是归类，不是依赖）。校准后：在册 2 条、未登记 0 条。

| 遗留项 | 状态 | 候选修法 |
|---|---|---|
| `slide→comments` | **已修（0.9.118）** | 接线自附：slide 只建空壳+注册句柄（`setCommentDrawer`）；comments 首次打开时自附关闭键/列表委托（标记打在抽屉对象上，重挂载各自绑）——边因「slide 不再 import」而死。评论列表委托分支的行为面在全仓本就零覆盖（harness 不 mock comment/list，既有缺口），自附执行由 play-deep 关闭键哨兵钉住（两处同一次调用） |
| `data→ubb` | 待随手下沉 | 先查 `ubbPlain` 与渲染路径是否共享正则常量：共享则连正则一起沉到纯文本投影小模块，`ubb.js` 反向 import 它（下行） |
