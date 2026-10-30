# 卫生收口批 B 交单（视图/卡面/chip/状态行文案）· 基线 c61d2cc · 2026-10-30

> 并发纪律执行记录：只动清单内文件；git/build/harness 未跑（禁）。cfg.js 行号在本批工作期间
> 漂移约 +21 行（他代理在途改动），复核后 rankBoards 形状未变（channel.tip 仍在，label 未用）。
> check-deps 因 chipkit 缺图会红=预期内，下方 README 片段供主会话并入。

## 1) 逐任务状态

| 任务 | 状态 | 落点（file:line，改后现场） |
| --- | --- | --- |
| ① chip 族收口 | 完成 | 新建 `src/chipkit.js`（export mountChipGroup）；`zone.js:59-61` data-chips 锚、`:95-112` fillSubChips、`:185-216` 三组挂载；`jingxuanview.js:243-254` chipGroup（替换 mkChip）；`natpanel.js:100-109` select 段钮；新单测 `test/unit/chipkit.test.js`（4 用例，node --test 绿） |
| ② 状态行文案闭环 | 完成 | `pageloader.js:38-43` DONE_LABEL_MOMENTS 出库；`followview.js:85`、`squarefeed.js:63` 改引用；`zone.js:142`、`jingxuanview.js:333`、`uppage.js:276` 改 LOADING_LABEL；`test/check-liststate.mjs` 增「加载中…」规则（owner=pageloader.js，白名单 comments.js/pickpop.js=有意例外）——闸绿 |
| ③ 分区榜 tip 分支 | 完成 | `zone.js:177-183`：两档统一 `(channel?curZone.name:b.label) + ' / ' + b.tip`；channel.tip 死字段复活，产出文案逐字不变（cfg 串与旧硬编码全等，已比对） |
| ④ 档内空态常数 | 完成 | `mytabs.js:27-28` EMPTY_WL/EMPTY_FAV（:227/:260/:314/:419 引用）；`followadmin.js:99-100` EMPTY_NOFOLLOW/EMPTY_GROUP_EMPTY + `:253` emptyTextForFilter()（:264/:274 两拍共用，setEmpty 协议不动） |
| ⑤ searchview 常数/注释 | 完成 | `searchview.js:37` SKEL_ROWS=6 + cfg.view.search 未登记骨架档的注释；`:29-31` 「记最近 10 词」→8（HIST_MAX=8 实况，searchhist.js:21 在册）；`:41-42` FOLLOW_OFF/ON_LABEL（:238/:241 引用）；`followadmin.js:86-95` relLabel 五串常数化。**跨文件合表放弃**：两文件串集不重合（followadmin 无 '＋ 关注' 前缀形态、searchview 无回粉/互粉/特别关注分支），合表需 searchview→followadmin 新边且视图件反向依赖我的页档件——按任务预案「嫌重就各自文件内收」执行 |
| ⑥ 展示名读注册表 | 完成 | `zone.js:71-73` 列头「榜单」读 `viewDef('zone').dock.label`；`jingxuanview.js:212-214` 标题读 `viewDef('jingxuan').dock.label`。核实：jingxuan 标题与 dock.label 是**同一展示名**（0.9.171 改名四处同碰即两串同源，无刻意分歧），收共读正确；sidebar 走 dockEntries() 派生不受影响；harness `jx-title-name` 钉的 '分区' 串由 dock.label 供给，逐字不变 |
| ⑦ P2 顺带 | dismissConfirm 完成；listsession **放弃**（差异 >30%，见 §2） | `pickpop.js:261-269` export dismissConfirm()（`.acsv-confirmpop` 摘除收本件，meadmin/followadmin 私拼消失）；`meadmin.js:43-46`、`followadmin.js:345` 改引用；`followadmin.js:37` 新增 import |
| ⑧ statOf/statRowOf | 完成（差异登记） | `jingxuanview.js:80-86`：statOf 与 cards.statRowOf 差异**在皮肤**（span.acsv-jx-stat 单元 vs div.acsv-gstats 整行；' ' 文本节点参与 jx 排布；statRowOf 吃契约 meta {k,t} 表项经 META_GLYPH 译码）——按审计建议注释登记不合并，cards.js 零改动 |
| ⑨ cases/views.js | 完成 | `:814-818`/`:833-841`/`:843`/`:852`/`:902` 五处 `.acsv-vchips:not(.acsv-rboards)` → `[data-chips]`/`[data-chips="zone|sub|period"]`，每条注明钉的不变式（见 §3） |

## 2) listsession 评估（放弃抽件的差异账）

mytabs.makeListCtx（mytabs.js:41-66）vs jingxuanview.moreOfList+ctxOfVm（jingxuanview.js:124-152）：
1. **回话落点不同**：mytabs 挂在 pageloader.onSettle（**请求落定**即 flush，成败都回）；
   jingxuan 挂在 drain()/flushWaitMore（**渲染落定**才回——按行补齐方言下请求回包≠渲染完成）。
2. **waiter 结构**：mytabs 队列（waiters[] 多人等）；jingxuan 单槽 st.waitMore（后到覆盖，
   视图单例语境刻意简单化）。
3. **条目形状**：mytabs rows 已是面板 pi 直接 slice；jingxuan st.rendered 是 vm，回话前
   `.map(piOfVm)` 投影。
4. **到底短路**：mytabs `isDone()` 前置 return null 不发空拉；jingxuan 无前置判，靠
   done→drain→flush 自然 resolve null。
5. **ctx 语义**：mytabs 恒 `{kind:'list'}`；jingxuan 有 relSequential 开关分叉
   （关=`{kind:'walk'}` 随机游走）+ 按 id 找 idx（indexOf 不可用：vm≠pi 引用不同）。

五条结构性差异，抽单源需注入 4+ 个缝（落点/槽形/投影/短路），收益只剩摘约 10 行同形
resolve 尾——强抽即造出「什么都吃、什么都不像」的第三件。放弃，登记于本批注。

## 3) README 片段（主会话并入用）

### 3.1 共享 UI 基建模块表（liststate.js 行旁新增）

| `chipkit.js` | chip 按钮组单源（0.9.306 批⑤①，共享 UI 基建）：`mountChipGroup({host,items,isOn,onPick,cls})`——「同项短路→摘 on→点亮→回调」协议唯一定义处；items 表项 {label,data?}，初始高亮与点击短路同问 isOn（DOM on 态恒等数据态，zone 子频道行旧「全部无条件 on」与 curSub 漂移的角由此消失）；cls 默认 'acsv-vchip'（'acsv-vchip sm' 小档、natpanel 段钮传 cls:''），选中类名 'on' 固定；返回本批节点数组供消费点补 data-* 锚；host 清空不归本件。只 import ui.js，零业务；消费 zone/jingxuanview/natpanel。 |

### 3.2 mermaid 图：新增节点（liststate[...] 行旁）

    chipkit["chipkit.js（chip 按钮组单源·mountChipGroup）"]

边行**整行替换**（chipkit/pageloader/pickpop 为新边；zone→liststate、uppage→cfg 等
EXCLUDED_TARGETS 基础件边按既有口径不要求画）：

    zone --> appapi & cards & chipkit & listtail & pageloader & viewreg & rankapi
    jingxuanview --> appapi & cards & channelapi & chipkit & imicons & imgload & listtail & pageloader & relatedapi & settings & timefmt & viewreg
    natpanel --> cfg & chipkit & dbg & devname & iploc & overlay & settings & styles & ui
    followadmin --> cards & imicons & imgload & listtail & meadmin & nameval & overlay & pageloader & pickpop & relationapi & toastmsg
    uppage --> api & cfg & feedctx & feedstore & imgload & net & pagekind & pageloader & spacetab & timefmt & ui

（可选精选边，同 liststate 口径不强制：zone --> liststate 已存在 import、本次未画不动。）

### 3.3 pageloader.js 表行（现 :405）句尾追加

**0.9.306 批⑤②**：`LOADING_LABEL` 追加被 zone/jingxuanview/uppage 三处裸串引用；新增
`DONE_LABEL_MOMENTS='已加载全部动态'`（followview/squarefeed 两处 doneLabel 字面收编）。
check-liststate 随批立「加载中…」字面规则：owner=pageloader.js，白名单=comments.js/pickpop.js
（评论行/选择层在途占位，非翻页状态行语境，**有意例外**已在此与闸注释双登记）。

### 3.4 「开发」章闸门清单行（现 :350）改写

    #   空态/列表文案单源（liststate.setEmpty / pageloader 常数〔失败两态+「加载中…」+
    #   动态到底，0.9.300 起、0.9.306 批⑤扩〕，check-liststate 三道出口）/

## 4) CHANGELOG「0.9.306」小节草稿（B 批范围；若与 A 批并节，主会话合稿）

### 0.9.306（2026-10-30）· 卫生收口批⑤——chip 族/状态行文案/档内空态/展示名读注册表

**病灶（六域卫生审计 B 批清单）**：「同项短路→摘 on→点亮→回调」的 chip 点击协议跨
zone×4/jingxuan/natpanel 手抄六份，zone 子频道行「全部」无条件 on 与实选 curSub 漂移；
pageloader 三态文案收口（0.9.300/0.9.259）后仍有旁路——「已加载全部动态」两处字面、
「加载中…」三处裸串（zone/精选/uppage）；分区榜 tip 把 cfg.rankBoards.channel.tip 绕成
死字段（channel 档硬编码同值串，分支失实）；稍后再看/收藏夹/关注列表空态串各两处字面、
搜索 UP 卡与关注列表钮文案同词各写；「分区」标题与 dock、「榜单」列头与 dock 各存两份
（0.9.171 改名四处同碰教训的余数）；确认卡「全页单枚」摘旧逻辑 meadmin/followadmin 两份
私拼 `.acsv-confirmpop`。

**修法（规矩 3/7：协议与串收口单源、表项优先于分支）**：新建 `chipkit.js`
`mountChipGroup({host,items,isOn,onPick,cls})`——初始高亮与点击短路同问 isOn，zone 四组
/精选/原生面板段钮全表驱动，三行容器钉 `data-chips="zone|sub|period"` 锚（榜单行沿用
data-board）；pageloader 出库 `DONE_LABEL_MOMENTS`、裸串五处改引用，check-liststate
随批立「加载中…」规则（owner=pageloader + comments/pickpop 有意例外白名单）；zone.syncTip
两档统一 `名 / b.tip`（channel 档名取 curZone，cfg 串复活，产出文案逐字不变）；mytabs/
followadmin 空态串与 followadmin relLabel、searchview 钮文案各文件内常数化（跨文件合表
否决：串集不重合且需视图→档件反向边）；zone 列头/精选标题改读 `viewDef(id).dock.label`；
pickpop 导出 `dismissConfirm()` 收「全页单枚」摘旧（类串只剩构建处同文件内）。makeListCtx
×moreOfList 抽 listsession 评估后**放弃**——回话落点/waiter 形制/条目投影/短路路径/ctx
分叉五处结构差，强抽造第三件（差异账入 docs/hygiene-batch-B-views-2026-10-30.md）。

**测试**：新单测 `test/unit/chipkit.test.js`（node --test 4 绿：初始高亮/同项短路/换项
协议与回调实参/皮肤覆写与组间隔离，反跑点在册）；`check-liststate` 绿；eslint 全触面文件
零告警；全模块 import 冒烟绿。harness 侧 cases/views.js 五处 chip 选择器换 data-chips 锚
（zone-hot-hides-channel 钉「锚集合恰三枚且热档全隐」、zone-switch/subs/backtop-tall 按锚
取行），`jx-title-name`/relation/favfolders 确认卡流程断言零改动兼容。全场景 harness 留
主会话 build 后跑。

## 5) 断言清单（反跑点）

1. `test/unit/chipkit.test.js` 用例 1：初始 on 类与默认 cls —— 反跑：把 `cls` 默认改死
   `'acsv-vchip sm'` 或去掉 on 拼接 ⇒ 用例 1 红。
2. 用例 2 同项短路：不回调、不动他钮 on、state 推进后再点仍短路 —— 反跑：摘
   `if (o.isOn(item.data, i)) return;` ⇒ 首条断言（picked.length===0）红。
3. 用例 3 换项协议（先全组摘 on→点亮被点→回调实参 (data,i,node)）—— 反跑：删全组摘 on
   一行 ⇒ 旧项仍带 on 红；回调漏传 node ⇒ deepEqual 红。
4. 用例 4 皮肤/隔离：cls:''（natpanel 皮）与 'acsv-vchip sm'、两组 host 互不清 on ——
   反跑：把摘 on 改为 document 级 `.acsv-vchip` 扫描 ⇒ 第二 host 断言红。
5. `check-liststate`「加载中…」新规则 —— 反跑：任意消费文件还原裸 `'加载中…'` 字面 ⇒
   该文件转红；白名单两文件（comments/pickpop）不受影响。
6. cases/views.js zone-hot-hides-channel（锚集合恰 3 + 热档三行全隐）—— 反跑：摘任一
   data-chips 锚或 updateBoardVisibility 分支 ⇒ 红（旧 :not 写法只数行数，锚缺失即查空）。
7. cases/views.js zone-switch/zone-subs/weekChip（按锚取行点击）—— 反跑：DOM 换序
   （把 periodChips 挪到 subChips 前）旧序选择器会静默错拿，锚选择器**保持绿**=本次换锚
   的动机验证；真回归只可能来自功能坏。
8. cases/jingxuan.js jx-title-name 钉 '分区' —— 反跑：把 registerView dock.label 改回
   '精选' ⇒ 标题断言与 dock 快照同红（改名同碰两处即联动=⑥要钉的不变式）。
9. zone.syncTip（③）——channel 档 tip 现由 cfg 驱动；**未实测钉**：harness 无 channel 档
   tip 文本断言（zone-hot-tip 只钉热榜档），cfg.channel.tip 若被改坏 channel 档文案不会
   在现场景转红——如实登记（补断言归主会话，可用 .acsv-vtip 文本等值 '全站综合 / 依综
   合指数排序，每日更新一次'）。
10. dismissConfirm（⑦）——favfolders/relation 现行确认卡流程断言不动即兼容；**未实测钉**：
    「开菜单前摘残卡」这一拍 harness 无直接断言（反跑需构造残卡现场，现场景序列里确认
    卡都被正常消费）——零行为变更靠同式实现保证，登记。
11. natpanel 段钮短路（同项不再 setSetting）：harness 无 np select 断言（grep 无
    acsv-np-seg 命中）；写同值本就无感，语义变化仅在「省一次冗余写」——登记不钉。
