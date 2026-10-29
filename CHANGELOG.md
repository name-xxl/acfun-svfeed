# 更新日志

AcFun 小视频竖刷页脚本的版本更新记录（版本号即小节号，最新在前；0.9.81 起自 README 迁出）。
每节记录：病灶（真机/评审实证）→ 修法 → 测试证据。项目约定见 README 的「开发」章。

> 更早版本（0.9.199 及以前，共 199 节）见 [CHANGELOG-archive.md](CHANGELOG-archive.md)。

### 0.9.296（2026-10-29）· 档头落位守卫补齐第三档 + 锚点未挂载不再静默降级

**病灶（0.9.295 收尾复核时发现，同一道缝的余漏）**：0.9.295 给「档头被挂到列表末尾」这一类钉了
两条几何断言（`fav-head-above` 收藏夹 / `hd-head-above` 历史），但**第三档关注列表没有**——
`relation.js` 的 `fg-topbar` 只判存在性与标签文案，位置无人守。同一道缝已在两个档各出血一次，
第三档仍裸奔。

**修法**：
1. `relation.js` 新增 **`fg-head-above`**（档头底边 ≤ 首条成员行顶边），与另两档同款——三档位置
   各有一条机械守卫，后加第四档照抄得到范式。
2. `createMeHead` 的 `opts.before` **未挂载时不再静默**：降级 append 的同时计
   `stat('mehead.beforeDetached')`（release 下 stat 为 noop，零成本）。静默降级正是这类落位走偏
   能潜伏两轮的原因——坏姿势要能在 debug 读数里被看见，不能只指望 harness 几何断言兜。

**测试**：**摘修复反跑**——去掉关注列表的 `before: list`，`fg-head-above` 恰好转红
（headBottom=540 / rowTop=290），装回复绿（follow-groups 47 断言）。全量三段并行 57.9s、
89 场景 0 失败 + lint/check 八门禁/tsc 通过。

### 0.9.295（2026-10-29）· 浮标右缘按滚动条宽补偿（真机 9.5px 偏差）+ 我的页三档档头落位改锚点定序

**病灶 A（用户真机实报「只在原生页对齐了，脚本页没对齐」）**：0.9.294 把浮标 `right` 由 18 收到 30
（回顶内容盒右缘 24+6），harness 里两钮严丝合缝——**真机却差一条滚动条宽**。根因是两者**参照系不同**：
回顶是 `position:sticky`，横向基准＝滚动容器**内容盒**（`.acsv-view-body` padding 24 + `.acsv-backtop`
margin 6 **+ 容器自己的经典滚动条宽**）；浮标是 `position:fixed`，基准＝ICB（不含滚动条）。无头 Chromium
一律用**覆盖式滚动条（宽 0）**⇒ 这条缝在 harness 里恒等于 0（`docs/api-research.md` §10.15 在册盲区，
本轮实测复核：同参数滚动容器 `offsetWidth−clientWidth === 0`）。

**取证（不是推断）**：量用户真机截图——浮标直径 54 图素 ÷1.5 = **36 CSS px** ⇒ 确认跑的是 0.9.294
（非构建漂移，旧版 44 会显示 66 图素）；两枚钮图标中心横差 **9.5 CSS px**，回顶偏左，恰等于
`scrollbar-width:thin` 的滚动条宽。

**修法 A**：`pubfab.js` 新增纯函数 `cornerRightOf(offsetW, clientW, base)`＝`base + max(0, offset−client)`，
挂载时与容器内容盒变化时（`ResizeObserver`）重算并写 inline `right`（cssraw 的 `right:30` 留作兜底）。
浅色语境**不补偿**（原生页两钮都是 fixed、同贴 ICB，本就同线）。容器滚动条随内容有无出现/消失
（空列表↔长列表、切档换面板）⇒ 观察者跟着重算，不需要在消费方补调用点。

**测试 A**：
- 新单测 `test/unit/pubfab.test.js` 六条（6 断言）——**写测试当场抓出实现缺陷**：`clientWidth` 缺值
  被当成 0 宽，会算出 `base+整宽` 的荒谬补偿；修法＝两侧都须是可用的正数才谈滚动条，否则原值返回。
- harness `view-my` 81 断言（+3）：无头环境看不到真滚动条，故**覆盖 `offsetWidth/clientWidth` 模拟
  经典细滚动条（9px）+ 改宿主内边距触发 ResizeObserver**——`pubfab-corner-base`（基准 30）→
  `pubfab-corner-scrollbar`（变 39）→ `pubfab-corner-restore`（还原回 30）。
- **摘修复反跑**：`git stash` 掉 `pubfab.js` 后三条恰好全红（`inline right=` 空），恢复复绿。

**病灶 B（真机报障「观看历史界面不显示顶栏」同批修正，随本版出货）**：我的页三档的档头
（`meadmin.createMeHead`）与列表的**挂载先后**决定位置——历史档先挂 18 张卡网格、后建档头 ⇒ 档头被
append 到视口外约 1600px（DOM 在、断言绿、肉眼"没有顶栏"）。同属「位置靠调用先后」这一道缝。

**修法 B**：`createMeHead` 新增 `opts.before`（给了就 `insertBefore` 锚到列表之前），三档统一
「先建列表 → 档头带 `before:list`」——位置由锚点决定，与调用先后解耦。

**测试 B**：`hd-head-above` 几何钉（档头底 ≤ 首卡顶，与既有 `fav-head-above` 同款）钉住这一类，
防「换个档又犯一次」。

**合并验证**：全量三段并行全绿——89 场景 / 0 失败（57.3s）+ `check` 七门禁 + 单测 456 + tsc。

### 0.9.294（2026-10-29）· 发布浮标与回顶协调——横向错位 12px 矫正、C2+ 等大圆钮悬停展开椭条、我的页仅动态档出现

**由头（用户两条令）**：①「发布按钮和回到顶部按钮在显示上不协调」；②「'我的'界面不是有几个栏目吗，写动态按钮应该只在动态栏出现」。
按硬规矩先出静态预览（docs/preview/pubfab-backtop.html：①病灶对照 ②浅色基准 ③–⑤ 三案对照
**⑥ 案 C2+**（用户定案：折叠 36 与回顶等大 + 悬停展开椭形长条）**⑦ 我的页仅动态档出现** ⑧ 机器自检），
十项几何/显隐断言开页即跑、浏览器实测全过后才动 `src/`。

**病灶（五项，量值出自 cssraw 在册规则）**：
1. **横向错位 12px**（最刺眼）：回顶在脚本视图内是 `position:sticky`，基准是滚动容器**内容盒**——
   `.acsv-view-body` `padding-right:24` + `.acsv-backtop` `margin 0 6px 6px auto` ⇒ 回顶右缘距视口
   **30px**；浮标按 fixed 直觉写 `right:18` ⇒ 两钮右缘差 12px。0.9.224 头注自称「靠右下角对齐」，
   但只校了纵向（bottom 94 ≥ 回顶顶缘 84），横向这条缝一直开着。
2. **直径差 8px**：44 vs 36（回顶是 `.acsv-tbtn` 顶栏圆钮同族 36）。
3. **两套图标语言**：回顶=内联 SVG（chevUp，`fill:currentColor`），浮标=**文本字符 ✎（U+270E）**
   ——字形随系统字体漂移，与 0.9.105「图标语言统一」口径相悖。
4. **hover 反馈不一致**：回顶 `scale(1.08)+提亮`，浮标仅变色。
5. **全档常驻**：我的页五档（动态/观看历史/稍后再看/收藏夹/关注列表）共用一个视图体，浮标挂在
   视图体上 ⇒ 在「观看历史」档也杵着一枚「发动态」，与所在档语义无关。
（浅色语境早已对齐 24/24，是达标基准；阴影/实心红＝主行动强调，**有意保留**。）

**修法**：
1. **几何**（cssraw `.acsv-pubfab`）：`right 18→30` 与回顶同线；纵向不动（bottom 94）。
2. **C2+ 形态**：`width/height 36`（与回顶等大）、`border-radius 18`、flex 右对齐 + `padding:0 9px`
   + `overflow:hidden`；`hover` **只改 width 36→88 + 底色**、**不写 right**（右缘锚定 ⇒ 向左生长，
   光标下的图标零位移）；`transition:width .18s`。图标位钉右（`justify-content:flex-end`）⇒
   展开时文案从左侧滑出、图标原地不动。
3. **图标**（pubfab.js）：文本 `'✎'` → **内联 SVG 铅笔**（Material edit 实心路径，与 chevUp 同族
   「24 viewBox + 单 path + fill」）；SVG 走 `createElementNS`（`el`/`elHtml` 是 HTML 命名空间，
   innerHTML 拼不出真 svg——0.9.80 教训族）。文案 `span.acsv-pubfab-lb`「发动态」默认 `opacity:0`
   + `max-width:0`，hover 滑出（不用 display 切换——要保留过渡）。
4. **我的页仅动态档**（mypage.js `select()`）：浮标**常驻 DOM 只切显隐**（与五档面板「常驻 DOM
   只切 display」同语义；重建会丢 hover/动画态）——非动态档挂 `.tab-hide`（`opacity:0` +
   `pointer-events:none`，过渡与 tab 切换同步）。广场视图 / 原生页内嵌广场**不受影响**（整页
   都是动态语境）。
5. 浅色语境：`right/bottom` 不动（本就对齐），随形态继承 36 圆与展开。

**测试**（`view-my` 78 断言 +5、`moment-publish` 41 断言收紧 1）：
- `pubfab-form-c2`：SVG 图标（非 ✎ 文本）+ 文案位「发动态」+ 折叠 36 + right 30；
- `pubfab-hover-expand`：钉**规则载量**（样式表存在 `.acsv-pubfab:hover{…width:88px}`、该规则
  **不含 right**（右缘锚定）+ 文案行初始 `opacity:0/max-width:0`）——合成 mouseover **不触发**原生
  `:hover`（首版这样写恰好转红，改为规则断言；真 hover 由确认稿浏览器实测兜）；
- `pubfab-hidden-off-moments` / `pubfab-hidden-hist` / `pubfab-hidden-fav`：三档各钉一例（防只闸
  wait 档漏其它）+ `pubfab-back-on-moments`（切回复现——「隐了不回来」同样要钉）；
- `pub-fab-above-backtop` 的右对齐容差 **≤12 → ≤1**（病灶矫正后同线，收紧即门禁）。
- **摘修复反跑**：`git stash` 三个 src 文件后恰好转红 6 条（`pubfab-form-c2` svg=false w=44 right=18 /
  `pubfab-hover-expand` n/a / 三个 `pubfab-hidden-*` op=1 / `pub-fab-above-backtop` 差 10px），
  恢复后复绿。全量三段并行全绿（89 场景 / 0 失败，58.1s；`npm test` 含 check 七门禁 + 单测 + tsc）。

### 0.9.293（2026-10-29）· 我的页档头抽离共用——三档收一个 mehead 构件，收藏夹管理收进模态、adminTab 壳退役

**由头（用户令）**：「收藏夹也有顶部选择栏，还有历史记录栏，关注列表顶部选择栏 ui 能否抽离共用」
——我的页三档顶栏原本三种语言（收藏夹 chips+ops 行 / 历史孤一枚 danger chip / 关注列表原生
select+文字钮）。按硬规矩先出静态预览（docs/preview/me-tabhead.html：①三栏现状对照 +
②构件解剖 + ⑤B 案管理模态 + ⑨结构推导表，15 项计算样式机器清查），两项裁决：**收藏夹 B 案**
（管理收进「管理收藏夹」模态，与「编辑分组」同构建器，adminTab 壳零消费方退役）、
**清空历史=danger 红字**（B1）。

**修法**：
1. 新共用件 `meadmin.js`（零业务，全 opts 注入）：**createMeHead**——档头
   `[select?]+[动作区]`，关注列表/收藏夹/历史三档同构；select 菜单自持（overlay 'mehead-pop'+
   外点收起，菜单挂档头根不挂柄内——0.9.289 冒泡关层教训照抄），与消费方弹层互斥走
   onOpen/closeMenu 两根注入缝；visible 全假且无 select 时整行不渲染（历史空态）。
   **openManageModal**——管理模态共用构建器（erow 行改名/删除+常驻添加行+确认卡+页脚确定），
   followadmin「编辑分组」与 fav「管理收藏夹」同款；**openMmModal**——0.9.292 设置面板族壳
   （「设置分组」radio 模态直用）；mmWarn 顶部警示条、openMmConfirm 确认卡（全页单枚）。
2. **关注列表**：顶栏/编辑分组模态换 meadmin 出口，**形态零变化**（select 142×36/菜单/文字钮
   量值原样，模态家族类名 .acsv-flm*→.acsv-mm* 随出库改姓，mh* 档头升共享段）。
3. **收藏夹**：chips+ops 行退役 → mehead select（夹名+计数）+「管理收藏夹」模态（建/改名/
   删夹，删除确认「一并移除」文案原样）；卡面「移动/移除收藏」不动。行为校准两处：建夹跳
   新夹沿用旧口径；夹表刷新不再整表重拉列表（旧 adminTab reloadOnRefresh 的粗粒度余留——
   卡面增删已就地维护，摘卡后空态照出）。
4. **历史**：孤 chip 升档头 danger 文字钮（红字 #ff8a95，悬停提亮；裁决 B1），列表空=整行
   不渲染；确认卡/写链原样。
5. **adminTab 壳退役**（0.9.150 建，0.9.289 起收藏夹单消费方 → 本批零消费方，死后即删）：
   mytabs 体内删除，cssraw 管理壳段（gops/gform/ginput/gok/gcancel/gerr/gdanger）与
   `.acsv-mepanel .acsv-vchips` 孤儿规则随批清除。

**测试**：三场景随新结构更新——relation.js 选择器迁移（mh/mm/mmwarn，45 处）；views.js
fav 几何钉换档头对象（fav-head-above）、切夹走 select 菜单、历史清空键选择器随迁；
favfolders.js 管理段重写为模态驱动（ff-head/ff-my-modal/ff-my-create-sel/ff-del-select/
ff-del-fallback 新钉，行定位走 mm-erow data-id）。**摘更新反跑**：临时退掉 mehead 标签文本
节点，follow-groups（fg-topbar）+fav-folders（ff-head 等 5 处）恰好转红，恢复复绿。实现期
连带修掉三个真伤：mehead setLabel 初版写到箭头元素（标签恒空）、档头动作 onClick 没把钮
本体传给消费方（hist 确认卡锚 undefined 抛 getBoundingClientRect）、buildFav 的 list 先于
head 挂载（档头落到列表下面=0.9.69 病灶形态，fav-head-above 几何钉抓到）。全量三段并行
全绿（57.4s，89 场景 0 失败）+ lint/check 八门禁（含 check-direction meadmin FEATURE 登记）
/tsc 通过。

### 0.9.292（2026-10-29）· 关注列表两张弹窗对齐设置面板——原生模仿壳整体换族，确认弹层并入 pickpop 单源

**由头（用户裁决）**：编辑分组/设置分组两张模态 0.9.289 虽对齐了原生，但与脚本自家设置面板
家族（齿轮面板）割裂——用户令「编辑弹窗 ui 设计要对齐设置面板」。按硬规矩先出静态预览
（docs/preview/follow-modal-settings.html：①设置面板缩样并排同族对照 + ⑦新旧几何推导表 +
交付前 33 项计算样式机器清查），三项裁决：**同批换族**（两模态共用 openModal 壳）/
**选中表达保 radio 圆点**（行语言取 .set-sel-item）/ **删除确认弹层换 pickpop 同族**。

**修法**（交互与写链零变化，只换皮）：
1. 模态壳换设置面板量值（cssraw `.acsv-flm-*` / followadmin.openModal 壳重构 hd+bd+foot）：
   遮罩 .45→.62；面板 blur12+边白.1+圆角15→14+阴影 0 10px 34（SET_CSS .set-panel）；标题
   16 居中→15/600 左置、✕ 裸字形→28 圆钮（.set-x）；**内层 203px 限高退役**——列表随面板体
   滚动（体 20 padding，面板 max-height min(76vh,640px)）；确定键从居中红块 128×36→**页脚
   右置 primary**（.set-foot 同型）。落位不动（0.9.291 视口垂直居中钉，fg-group-center 原样过）。
2. 行语言：编辑分组组行=**.set-row 节奏**（新 `.acsv-flm-erow`：名 14/18 左+ghost 操作键右
   hover 白.12，行距 20，替代灰条卡）；设置分组 radio 行=透底 36 高 hover 白.12（.set-sel-item
   同款，radio accent 点亮+字白保留=⑤-A 案）；输入（改名/添加）=设置输入家族（无边 圆角8
   bg 白.12 focus .18）；添加行/改名小动作键换 `.acsv-flm-sbtn(.primary)`。
3. **确认弹层单源收口**：`openPcf`/`.acsv-flpcf` 整体退役——取消特别关注/取消关注/删除分组
   三处改走 `pickpop.openConfirmPop`（title/text/okLabel 注入，busy 与层内失败提示归
   pickpop；锚=☰钮/删除键、宿主=acts/行，落位 popplace、外点收起 guardOutside）。**不占
   overlay 槽**（与全脚本删除类确认同口径——mytabs/评论区现行，Esc 随宿主视图）；互斥由
   行内菜单开场清扫+全页单枚（openConfirmCard 开新摘旧）保证。followadmin→pickpop 新边入图。
4. 文案零变化：确认文案/警示条/placeholder/toast 全保留原串。

**测试**：relation.js follow-groups 场景断言随新结构更新选择器（confirmpop/pick-ok/erow/
flm-foot/flm-sbtn）——写链 body 断言（action 14/15/2/3/4/6/5）、校验警示条、topmost 可视、
居中钉全部保留。**摘更新反跑**：临时退回旧选择器（erow→gi），fg-edit-modal 恰好转红
（45/46），恢复复绿；全量三段并行全绿（57.2s，89 场景 0 失败）+ lint/check 七门禁/tsc 通过。

### 0.9.291（2026-10-29）· 关注列表模态落位改视口垂直居中——顶部下移系实现自造，原生实测重心正中

**病灶**（用户真机纠正「弹窗居中啊，怎么定位在顶部啊」）：0.9.290 模态落位写了
align-items:flex-start + padding-top 96（顶部下移）——原生实测（§16 取证截图，模态
y 266..641 / 900 视口）重心正中，顶部下移是实现自造口径；预览 maskdemo 框只示意形态
没表达落位，确认时漏看。

**修法**：`.acsv-flm-wrap` 改纯 flex 滚动容器（去 align/justify/padding-top），`.acsv-flm-main`
加 `margin:auto`——居中之外模态高于视口时顶边仍可达（滚动不裁顶）。场景钉结果不变式
fg-group-center（上距≈下距 ±24px 且不超视口）；确认稿 ⑤ 补落位注记（maskdemo 不表达落位）。

**测试**：harness follow-groups 46 断言全绿（新增居中钉）；全量三段+七门禁复跑见下。

### 0.9.290（2026-10-29）· 关注列表模态「不出弹窗」——body 挂载被 #acsv-root 盖住，挂载点收进脚本根 + 场景可视断言补闸

**病灶**（真机报障：点编辑分组/设置分组无反应）：0.9.289 的两张模态与顶部警示条挂
`document.body`、z 用根内层档 63/64/66——而脚本整个 UI 活在 `#acsv-root`（fixed inset:0、
**z 2147483000、不透明黑底**）里，低 z 的 body 子元素被根容器整体盖住：DOM 在、事件通
（harness 用 JS click 照样走）、**视觉永不可见**。harness 45 断言绿着漏过——模态类断言全是
DOM 存在判据，无一可视判据（fixed 层 offsetParent 恒 null，老帮手也照不出来）。

**修法**：①挂载点收进脚本根（`mountHost() = state.root || document.body`，模态/警示条同改）
——根内 z 63/64/66 即 cssraw 层档语义（视图 55…更新 65 之上），与在册 `.acsv-toast`
（body 挂载配 z 2147483600）两种口径并存、本件取根挂口径；②场景补**可视断言帮手
topmost()**（元素中心 elementFromPoint 命中须在元素内部——被盖住即红，fixed 层有效），
钉进 fg-group-modal/fg-edit-modal/fg-add-invalid 三处。

**测试**：摘修复反跑——临时退回 body 挂载，三条可视断言恰好转红（42/45），恢复复绿
（45/45，7.2s）；全量三段+七门禁/tsc 复跑见下。可视断言从此钉住「弹层被盖」这一类病灶
（harness 盲区教训在册：可见性判据不能只查 DOM 存在/offsetParent）。

### 0.9.289（2026-10-29）· 我的页「关注列表」对齐原生 /member/feeds/following——域件 followadmin 接替旧关注分组档

**由头（用户裁决）**：原生个人中心左栏本就有「关注列表」页（/member/feeds/following），脚本
「我的页-关注分组」tab 与之同语义却完全不同构（chips+组头操作+两 chip 成员行）。用户令对齐；
按硬规矩先出静态预览（docs/preview/follow-list-native.html），经五轮确认（每轮附真机取证）
后才进实现。取证与写链探针全量入档 docs/api-research.md §16（本地留档）。

**修法**：新域件 `followadmin.buildFollowAdmin` 接替 `mytabs.buildFollowGroups`（adminTab 壳
自此只剩收藏夹单消费方）——

1. 顶栏 chips 行退役 →「全部分组」select（142×36，过滤 action=7/9）+ 右上「编辑分组」文字钮；
   行内归属标签随原生撤除（归属由过滤档+设置分组表达）。
2. 成员行 1:1 照原生量取（§16）：头像 60 圆、名 16/24、data「关注:N 粉丝:N 投稿:N」三段
   （间距 24）、完整签名 2 行钳、行距 20×0 分隔线；行悬停不加（原生无反馈）。
3. 行内两 chip → 单颗「☰ 已关注」钮（104×30，iconfont 三横 **U+E2CE**）→ 下拉菜单：
   **特别关注=action 14 直发（独立标记，实测不动 groupId，非 regroup）**/取消特别关注=15/
   取消关注=2——后两键套原生 PopConfirm 确认步（134 宽 圆角 2 双钮小层，用户拍板「模仿原生」；
   加特别关注不确认=非对称确认，探针实抓）。钮文案照 bundle 状态机：followingStatus
   1=回粉/2=已关注·互粉→已互粉/3=特别关注（getFollows 条目自带，relationapi 补解析
   followingStatus/isFriend/followingCountShow 三键）。写链出口新增
   relationapi.specialFollow/unSpecialFollow（body 只 toUserId+action，与 bundle handleAction 同形）。
4. 组管理收进两张原生壳模态（400 宽 圆角 15+遮罩）：「设置分组」=radio 选组（限高 203 滚动）
   +底部常驻添加输入行+红确定（regroup action=3，选中未变不发废包）；「编辑分组」=组条改名
   （relation/group action=6）/删除（action=5，删组确认文案含「移至未分组」；未分组不进列、
   特别关注只改名）/建组（action=4）。校验单源 nameval.groupNameError——**与原生 bundle 真实
   正则 /^[-一-龥_a-zA-Z0-9_]{1,8}$/（trim 后）逐字符一致**（placeholder 漏写下划线是原生文案
   自己偏窄，§16 bundle+失败路径实测）；失败/保留字反馈=顶部警示条（模仿 ac-toast-warn，
   icon **U+E1A0** 金黄）。添加行聚焦出「取消添加/添加分组」双小钮。
5. imicons 登记 E2CE/E182（模态叉）/E1A0（警示条）三码点（select 箭头复用在册 edCaret E166，
   不重登）；字体走 cssraw 在册 @font-face 同源。
6. tab 名「关注分组」→「关注列表」（对齐原生导航口径）；**明确不跟**：数字分页（0.9.219
   尾部统一 listtail 在册）、行内归属标签、名字行勋章/认证小图标（用户裁决不加——official/
   college 两枚 SVG 已采 §16 备用）。

**边界**：确认弹层（.acsv-flpcf）与 pickpop.openConfirmPop 并存——本页走原生模仿态（预览④b
裁决），它页仍走 openConfirmPop；rail 角标 grouppop 不动（写链同走 regroup 单源）；弹出层共
用单槽（Esc 走 overlay 栈 'fl-pop'，无自带按键监听）。

**测试证据**：harness `follow-groups` 随形态重写，45 断言全绿（7.0s）——写链 body 逐字节钉
14/15/2/3/4/5/6 七码；确认弹层取消（零发包）/确定两路；校验警示条两路（超长/保留名）；
select 过滤档 body（action=9 带组 id）与档表联动；编辑模态建/改名/删全链。期间揪出并修掉
select 菜单误挂 toggle 柄内的冒泡关层缺陷（点选项即被关闭，harness 实锤）。单测 450 全绿
（followListPageOf 新三键缺省中性值不伪造）。check 六步链绿；体积基线按审计批②「撞线即重裁」
约定更新至本批实测（release total 611,440/css 24,432/rest 464,852；debug total 988,304/
rest 841,646——增量=新域件+模态壳+弹层家族 CSS，head/hls 不动）。真机探针全程自家账号、
测后 followingStatus 3→2 复原、groupId 未动（§16 在档）。

### 0.9.288（2026-10-29）· 已投蕉话术三串归二——「已经投过蕉啦」/「已投蕉」，删「明天再来」伪每日语义

**病灶**：同一「已投蕉」语义三处三串——竖刷右栏 title `今日已投过蕉啦`、动态底栏 title
`已投蕉`、点已投键 toast `已投过蕉啦，明天再来~`。用户问「悬浮提示怎么是自拟的」引出原生
取证（api-research §15.4，ac48934047 实锤 isThrowBanana=true）：原生两面投蕉键**均无
title/aria**，已投态＝`active` 类纯视觉点亮（与 ：hover 同规则，#FFBA0D），喂食弹层展开
规则显式 `data-bind-attr="false"]`——**isThrowBanana 是持久标记、弹层永久断，无任何按天
重置证据**。旧文案「今日」「明天再来~」是把每日配额语义错安在单稿永久锁上，属自拟夹带错误。

- **修法**（用户裁决话术）：toast 单源 `errBananaThrown` → `已经投过蕉啦`（toastmsg.js，
  rail/momentbar 两消费点自动同串）；title 统一短口径 `已投蕉`（rail.js `_banSync` 改串，
  momentbar 原串不动）——三串归二，均可回溯 toastmsg 注释里的取证依据。
- **测试**（450 单测 + 89 场景全绿；七门禁/tsc 全过）：无断言钉旧串（grep 证实），
  纯话术改不新增钉；真机对照样本与色值入档 api-research §15.4。

### 0.9.287（2026-10-28）· 交互态对齐原生——悬停=点亮色预览（红/蕉黄）、蓝档全退、蕉赞双图标显隐

**病灶**（结构性，非单点）：两域交互键的悬停态是历次自造口径的叠加——评论区 0.9.286
「全蓝+点赞红」、动态条悬停白、行流蕉键悬停红，没有一档出自原生页。用户裁决
「**原生有参考的用原生，统一设计语言**」。真机实测（api-research §15，CSSOM 全量规则扫描
+ CUA 真实悬停读计算样式 + 截图三重验证，页面 /moment/am5110765）：原生悬停语义＝
**点亮色预览**——评论区赞/回复悬停都红 #FD4C5C、动态条分享/评论/点赞悬停红 #FD4C5D、
蕉悬停黄 #FFBA0D !important，**原生不存在悬停蓝**；蕉/赞双图标显隐（.icon_path/.icon_fill
同在 DOM，CSS 切换，仅这两键有实心码点）；蕉黄站点自体两档（动态条 #FFBA0D / 视频侧
数量层 #FFB323——0.9.104 采的是视频侧，非抄错）。

- **修法**（预览 docs/preview/native-interaction-states.html 定稿，四裁点随裁决落）：① 评论区
  回复/转发/删除/设备/IP/展开/收起悬停蓝→主题红——无原生参考的键按「统一设计语言」归红，
  **蓝档全退**（删除基色警示粉、浅皮基色体系不动，只改悬停）；浅色 #409bef 档同批退役。
  ② 动态条（卡片+详情同族 .acsv-mdl-*）悬停白→红、蕉→#ffba0d；详情评论键补 cursor（本就
  可点滚到评论头，原生评论键同为悬停键）。③ 行流（.acsv-fact）蕉键悬停红→黄，其余键本已
  对齐不动。④ 动态域 thrown #ffb323→#ffba0d（rail/banpop 视频侧保持自家 #ffb323——各随
  各的原生）。⑤ **蕉赞双图标**：momentbar 蕉/赞键改 `.acsvg-dual` 双字形同在 DOM，显隐归
  CSS（`:hover`/`.on`/`.thrown` 都切实心），syncLike/syncBanana 的字形交换退役；分享/评论
  无实心码点保持单字形。评论域点赞仍是 JS 换字（原生评论域是背景图三态、无悬停换图语义）。
  键定义表新增 CSS 投影类 `acsv-k-<键名>`（蕉键悬停黄的选择器落点，两皮同挂）。
- **测试**（450 单测 + 89 场景全绿；七门禁/tsc 全过）：`follow-icon-codepoints` 升级四码点
  全钉（蕉 E62A/E65F、赞 E629/E660 双字形同在 DOM）；新增 `follow-dual-fill-on`（预置已赞
  行 .on 键 fill 可见/path 隐藏——结果不变式）；`follow-ban-yellow` 改钉 rgb(255,186,13)。
  反跑：摘 `.on .gfill` 显隐规则 → `follow-dual-fill-on` 恰好转红（80/81），恢复复绿。
  悬停色 harness 无真鼠标不钉——真悬停验证在预览阶段已做（18 键×全态机器清查 18/18
  PASS：CUA 逐键悬停 + matches(':hover') + 计算样式对照）。
- **顺笔**：docs/preview/_template.html 头注释新增改版纪律（禁整文件重写确认稿/禁内联色
  补丁/交付前逐键逐态机器清查）——定稿 v2 重写丢规则+内联补丁压悬停的病灶三问后立。

### 0.9.286（2026-10-26）· 评论三修——悬停色一档（全蓝+点赞红）、meta 行属性组受控断行、楼中楼独立收起键

**病灶**（用户报障三点，预览 `docs/preview/comment-meta-polish.html` 四轮裁决定稿）：① meta 行
各控件悬停色四套并存（点赞浅灰 / 回复转发浅蓝 / 删除浅粉 / IP 主题红——0.9.134「链接蓝」家族、
点赞早年口径、0.9.253 Web-IP 红三期各改各的），浅色皮肤（.acsv-mp）又是另一套；② 设备+IP
上身后（0.9.245/246）窄容器 meta 自然 flex-wrap 断点不受控——「转发 来自」混排一线、IP 孤悬
一线，楼中楼两三行错落灰字；③ 楼中楼展开件拉完自毁，展开后全程无收起入口。

- **修法**（全在 commentkit/cssraw 单源，抽屉/行内/详情三宿主自动同款）：① **悬停一档语义**：
  互动键/设备/IP 全键悬停蓝（深 `#9fd0ff`=设备链现款 / 浅 `#409bef`），唯点赞悬停主题红
  （身份色呼应已赞，悬停即预览点赞动作）；删除基色保留警示粉/红、悬停同蓝；展开键基色由
  主题红改灰（浅 #999）并同蓝悬停。图标（imicons 字形/mask/svg 全 currentColor 挂容器）
  自动随容器变色，零逐图标处理。② **属性组 .acsv-cattr（A+C 定稿）**：设备+IP 归组，组是
  meta 行整件——宽屏同线、放不下整组落第二行、极窄（行内宿主长设备名）才组内分设备/IP
  两线，互动键永不与来源件混排；C 档组 11px 弱化（深 `#5c616b` / 浅 `#a8adb5`，各比 meta
  基色退一档）。ipTag/devTag 接线口落点从 meta 行改组内（`tagInto` 首参即落签容器，IO 背
  引用 `_acsvIpUid` 随之挂组，纪律不变）。③ **收起独立灰键 `.acsv-cfold`**：首次成功展开即挂
  （分页中途即可收），点击整块移除回初始态（展开键若已自摘则放回、收起键自摘），再点重新
  拉取不走缓存；展开键保持单语义（查看 → 继续展开（剩 N 条）），拉完自摘、只剩灰键；
  代次门闸丢弃收起后的在飞回包（防收起后旧页追加上屏）。
- **测试**（450 单测 + 89 场景全绿；七门禁/tsc 全过）：新增钉——ip-tags `iph-meta-attr`
  （meta 直系末件=属性组、标签在组内）、dev-name `dname-attr-wrap`（设备件在组内且组为 meta
  末件）、member-plaza 收起件五连 `mp-cmt-fold-present/mid/collapse/full/reset`（sublist 桩
  第一页留 pcursor 造分页中途态；full 钉「重拉不走缓存——内联首屏子评论不回并」语义）。
  反跑：摘 `ensureFold`/ipTag 落点改回 meta 直挂 → `iph-meta-attr`、`mp-cmt-fold-mid` 转红
  （fold 链路连爆 case-threw=更红），恢复复绿。`iph-meta-last` 随落位收口改钉包裹关系（改名
  `iph-meta-attr`）。


### 0.9.285（2026-10-26）· 偏好记忆单链——底栏记忆收口 setSetting 单出口 + onChange 订阅捆绑

**病灶**（结构归因，非单点回归）：底栏偏好键的"记忆"长期三种真源并存——① `pb` 运行态 +
写入点手搓副作用清单（controls 连播/倍速：改 pb → setSetting → applyLoop/applyRate →
refreshPlaybackBtns 四步各写一遍）；② `resetForMount` 另列恢复清单（与写入清单靠人肉对齐）；
③ danmaku 影子变量 `enabled`（onChange 回填的第二真源）。0.9.282/283/284 三连病灶
（漏 defaultPlaybackRate / 预渲染条按钮快照漂移 / DM_DEFAULT 字典双写）表面各不相干，
合看即同一结构因：**"一个偏好改动后必须发生什么"没有单一出口**，加一处忘另一处只能靠
review 抓。归因与裁决过程见 README「病灶上溯结构（bug 三问）」。

- **修法**（0.9.285 偏好记忆单链，dmDefault 既有模型的推广）：可记忆偏好以 settings SCHEMA
  为唯一真源——**写入只许 `setSetting`；后果只许 `onChange` 订阅捆绑挂在拥有者模块；
  订阅注册即恢复（恢复清单消灭）；pb 记忆字段禁 playback.js 之外直写**。① playback.js 新增
  `watchPref`（onChange 注册 + 立即以当前值跑一遍）四捆绑：sound/vol（pb 同步+applyVolume+
  刷图标；vol 0=静音联动保持）/loop（pb 同步+全舞台 `applyLoopAll`，自 controls 内联扫描
  收编）/rate（pb 同步+applyRate）；`setVolume` 瘦身为"写会话意图+setSetting"，音量 0→1
  回弹改走订阅链；`resetForMount` 只剩手势复位两行。② controls.js 连播/倍速点击瘦身为
  `setSetting + toast`，另挂 `onChange('loop'/'rate', refreshPlaybackBtns)` UI 订阅（派发按
  注册序，playback 先求值 ⇒ 刷文案时 pb 已同步；0.9.283 的病灶由此结构性消灭）。③ danmaku
  影子变量退役，`dmEnabled()` 直读设置层（mem 缓存，热路径无成本）。④ dmcanvas 新增
  `refreshAllLayers`：SCHEMA「弹幕」组全键 onChange 订阅（与 0.9.284 恢复默认同源派生），
  dmpanel 逐写点手搓 `apply()` 退役。⑤ 长按松手恢复写点收进 `playback.endSeekHold`
  （棘轮零豁免）；seekHold 临时 2x 仍是唯一不落盘豁免。⑥ **有意不改**：codec/buf/quality
  走"消费点现读"（下次播放生效），菜单选中的重挂/邻居重建是**写点上下文动作**（只该在用户
  手势时刻发生，进订阅会让面板改键误触发重挂）——边界注释落在 attach.js/controls.js。
- **新守卫** `test/check-pref.mjs`（仿 check-listeners 静态棘轮，入 `npm run check` 链）：
  `pb.(soundOn|volume|autoplayNext|playRate) =` 在 playback.js 之外即红——写点收敛从此
  机器可查。
- **测试**（行为断言零改动，反跑矩阵双向验证）：① 撤 playback loop/rate 两条订阅 →
  mem-controls 四条恢复断言全红（失败信息正是病灶形态 '倍速 1.0x'/loop=true/rate=1），恢复
  复绿；② 撤 controls 两条 UI 订阅 → smoke `rate-sync-next` 红（'rate=倍速 1.0x loop=false'），
  恢复复绿；③ 临时在 controls 直写 `pb.autoplayNext=false` → check-pref 报未登记 exit 1，
  恢复复绿。断言补强：settings-open 增 `set-ctl-dm-layer-on-before/stopped/resumed` 三钉
  （面板改 dmDefault → 底栏按钮与图层起停同链跟随——"外部写入方→底栏跟随"的写者无关不变式，
  按钮半边 `set-ctl-dm-synced` 既有）。单测 450/450、harness 89/89、lint/tsc/check 全绿
  （含 check-pref 首跑 0 未登记）。
- **文档**：AGENTS.md 新增规矩 7「病灶上溯结构」（只沉淀方法论意识，个案归本日志）；
  README「项目理念」补方法展开段；模块表 playback/controls/dmcanvas/danmaku/dmpanel/input
  行与 check 描述同步。

### 0.9.284（2026-10-26）· DM_DEFAULT 归一——恢复默认收口 SCHEMA def 单源

**债务**（0.9.283 底栏审计盘出，用户裁决归一）：dmpanel 自持一份 `DM_DEFAULT` 字典（六值
硬编码），与 SCHEMA def **双写**——settings.js 早已导出 defaultsSnapshot 并注释「皮肤初值
单源」，恢复默认按钮却不走它；将来任何人调 SCHEMA 里的 dm* 默认值（如 dmArea 72→50），
「恢复默认设置」会默默恢复到旧值。0.9.202 既有债务，非回归。

- **修法**：reset 按钮改 `SCHEMA.filter(group==='弹幕')` 全键回 `it.def`——**默认值与组键
  清单双双派生**（原六键清单 + dmBlock/dmFilter 显式写 '' 一并退役）；新增弹幕设置键自动
  进 reset，不必记得改这里。`DM_DEFAULT` 字典删除。
- **等值证明**（机器比对在案）：SCHEMA 弹幕组派生值 ≡ 原 DM_DEFAULT 六值 + dmBlock/''
  + dmFilter/''（键集合 8 键、逐值相同；零行为漂移，纯搬迁）。harness play-deep 的
  dmpanel-reset-samenode/sw-off/clears-filter 与滑杆四断言即回归网。单测 450/450、
  harness 89/89、lint/tsc/check 全绿。

### 0.9.283（2026-10-26）· 倍速/连播控件态跨 slide 同步——预渲染条的按钮快照漂移

**病灶**（用户实报）：改底栏倍速后下滑到第二条，**按钮文案显示旧倍速，播放速度却正确继承**——
显示与实际不一致。根因：slide 的控制栏在**预渲染时**一次性构建（slide.js appendChild
buildControls），倍速按钮文案/连播 on 态是**构建时的 pb 快照**（win back/fwd=1，滑到第 2 条时
它的控制栏早在首屏就建好了）；写入点只刷当前条的按钮，预渲染条永不跟随。0.9.282 修好播放侧
继承（defaultPlaybackRate）后此不一致裸露——此前被「换条回 1x」的旧缺陷掩盖（按钮显示 1.0x、
播放也 1x，一致地错）；连播 on 态是同款既有漂移，一并收。

- **修法**：controls 新增 `refreshPlaybackBtns()`（照 refreshFullBtns 体例全舞台扫）——连播键
  按 pb 刷 on 态、倍速 wrap 调 `refreshLabel` 刷文案；`buildMenu` 对**动态 title** 挂
  `wrap.refreshLabel` 外部刷新缝（编码/缓冲是静态串不挂）。两处写入点（连播点击/倍速选中）
  调用，预渲染条与层内条一并同步。
- **测试**（摘修复反跑双向验证）：smoke 场景 +2（`rate-sync-setup` 当前条改 2.0x + 连播开；
  `rate-sync-next` 滑到预渲染 slide(2) 断言按钮文案 '倍速 2.0x' + 连播 on + video 2x）。
  反跑：撤两处 refreshPlaybackBtns 调用 → `rate-sync-next` 红（失败信息正是病灶形态
  'rate=倍速 1.0x'），恢复后全绿。单测 450/450、harness 89/89、lint/tsc/check 全绿。

### 0.9.282（2026-10-26）· 连播/倍速跨会话记忆（底栏机制统一）+ 新会话倍速继承修复

**由头**（用户裁决）：底栏的记忆机制应当统一——弹幕开关/静音/音量/编码/缓冲都跨会话记忆，
唯独连播、倍速是纯会话内存态（刷新即回「关/1.0x」），不合用户直觉。收编进同一偏好层。

- **SCHEMA**：新增 `loop`（bool，def false）与 `rate`（number 0.5~3，def 1）两键（播放组、
  panel:false——底栏是唯一入口，照 sound/vol 先例）。值域守卫单源在设置层（clampNumber），
  消费侧不造第二份校验。
- **写入**（controls 两处双写）：连播键点击、倍速菜单选中各补 `setSetting`；**长按 → 键的
  临时 2x 快进（seekHold）有意不落盘**——它是瞬时态，松手恢复全局倍速。
- **读取**（playback.resetForMount）：mount 时从设置层刷 `pb.autoplayNext`/`pb.playRate`
  初值，与 sound/vol 同款位置；顺带修**既有缺陷**——`initVideo` 只设 `playbackRate`，
  而 `_attachSource+video.load()` 的媒体装载算法会把 playbackRate 重置回
  `defaultPlaybackRate`（恒 1）⇒「新建会话继承全局倍速」从未真正生效（换条/刷新后回 1x）。
  现同设 `defaultPlaybackRate = pb.playRate`，load 重置后落回的正是它；seekHold 的临时 2x
  只进 playbackRate，不污染恢复基准。
- **测试**（摘修复反跑双向验证）：单测 **450/450**（+1：SCHEMA 两键形状钉）；harness
  **89/89**（play-deep +3 连播/倍速点击落盘 `mem-loop-persist`/`mem-rate-persist`；
  新场景 **mem-controls** 8 断言——bundle 求值前预置 `acsv.s.loop=true`/`rate=1.5`，
  新鲜加载即「上次会话退出」语义，断言控件态恢复 + 播放行为生效
  （`playbackRate=1.5`/层内不循环））。反跑：撤 resetForMount 两行 → mem-controls 四条
  恢复断言全红（控件回落默认/速率 1/循环开），恢复后全绿。**反跑还揪出首版断言设计缺陷**：
  pb 是模块单例，hash 退出重进只是 unmount/mount、pb 残留旧值 ⇒「跨会话恢复」只能靠
  新鲜加载钉（watch-ledger-replay 范式），已在 play-deep 尾部注释在案。
  lint/tsc/check 全绿。
- **文档**：README 使用表连播/倍速两行补「跨会话记忆」；模块表 playback/sessionhooks 行同步。

### 0.9.281（2026-10-26）· 窗口全屏里退网页全屏的混合态——顶栏阴影左缺、搜索框偏心

**病灶**（用户实报「全屏状态顶部阴影左侧不完整」+ 复现路径「点击窗口全屏后，关闭网页全屏就
会出现这样的状态」，附截图）：全屏梯子两级（网页全屏=影院类、窗口全屏=影院类+OS 全屏）都隐
顶栏，但**窗口全屏里再点「网页全屏」**会落到一个从未被样式覆盖的混合态——`toggleWebFull`
只翻 `acsv-cinema` 类、不退 OS 全屏 ⇒ `:fullscreen` 有、cinema 无。此态下 `.acsv-dock`/
`.acsv-scroller` 的 `:fullscreen` 让位归零规则（0.9.202 族）照常生效（画面铺满），**唯独
`.acsv-top` 没有同款规则**：顶栏仍 `left:168px`——而顶栏自身就是那道渐变阴影
（`background:linear-gradient(rgba(0,0,0,.6),transparent)`）⇒ 左侧 168px 裸露无阴影、
搜索框随容器偏离视口中心 84px（截图裁剪互证：左段亮=无阴影、右段暗=有阴影，分界即 168px）。
非回归：`:fullscreen` 让位族自诞生就只写了 dock/scroller/vbody-play 三处，顶栏一直缺席。

- **修法**：`cssraw.js` 补同族第四条 `#acsv-root:fullscreen .acsv-top{left:0}`——混合态顶栏
  随视口铺满，阴影与搜索框回到设计形态（与常态同观感、仅宽度变满）。按钮语义不动：混合态
  是「OS 全屏 + 自身 UI」的合法组合（等同 F11 带界面），webBtn/winBtn 在该态的出栈路径
  （→影院全屏/→常态）本就自洽。
- **测试**（摘修复反跑双向验证）：harness `smoke` 场景 +1 断言 `fs-topbar-zero-rule`——
  混合态无头不可达（`requestFullscreen` 无用户激活，feed.js 头注在案），故钉**注入样式表**
  （styles.js 缝回填后的运行时真值）里该规则在场且 `left:0px`；修复前红（`rule not found`）、
  修复后绿。全量：单测 449/449、harness 88/88、lint/tsc/check 全绿。

### 0.9.280（2026-10-26）· 弹幕设置滑杆生效修复——select 白名单静默拒绝连续值

**病灶**（用户实报「弹幕设置面板有选项不生效」，附面板截图：不透明度/字体大小/弹幕速度全钉默认
100%）：底栏「弹幕设置」面板的四条滑杆里，「不透明度/字体大小/弹幕速度」三杆拖动后**渲染从不
变化**（显示区域正常）。根因在 schema 与写入面的类型错位：0.9.201 三键以 `select` 类型入
SCHEMA（当时语义是离散档位，options 白名单 '100'/'80'/…、'0.85'/'1'/'1.2'/'1.4'、'1.4'/'1'/'0.75'），
0.9.202 面板换**连续滑杆**入口后，`setSetting` 的 `validateValue` 按 select 白名单校验——滑杆写的
连续值（`'73'`）与 toFixed(2) 串（`'1.13'`/`'1.10'`）**不在白名单内即静默拒绝（返回 false）**，
`dmSize` 连三个档位串都因尾零对不上（'1.20' ≠ '1.2'）全军覆没。面板 `paint(v)` 无条件画新位置，
故滑杆看起来动了、`apply()` → dmcanvas `refresh()` 读回的仍是旧值——「拖了没效果、重开面板弹回」
即此。node 实证：`setSetting('dmAlpha','73') → false`，读回 '100'；**自 0.9.202 起从未生效**，
非回归。`dmArea` 当时即 `text` 类型故独活，与截图完全互证。

- **修法**：`settings.js` 三键 `select` → `text`（对齐 `dmArea` 先例——同为滑杆连续值）。
  历史落盘值全是白名单内的 JSON 串，text 校验全收 ⇒ 老用户已存的 80%/小/快 等档位零丢失；
  值域兜底不变：滑杆几何（min/max）钳写入，`dmcanvas.readSettings` 的数值区间守卫兜读取。
  select 严格性对真实下拉项（codec/buf/ipKeep）保持不动。
- **测试**（摘修复反跑双向验证）：单测 **449/449**（+2：SCHEMA 不变量「弹幕滑杆四键一律
  text」+ 编排组「滑杆连续值必须被接受且读回一致」）；harness **88/88**（play-deep +4
  `dmpanel-slider-dmArea/dmAlpha/dmSize/dmSpeed`——拖到非档位连续值断言落盘一致）。反跑：
  病灶还原（type 改回 select）时两条单测 + 三条 harness 断言转红（dmArea 恒绿），修复后全绿。
  lint/tsc/check 全绿。

### 0.9.279（2026-10-18）· 接线包：稍后再看（底栏）+ 评论/动态删除 + 三榜 + 历史删除

**由头**：接线包三批一次落。用户确认 `docs/preview/content-actions.html` 第 ⑥ 段：稍后再看入口放
播放器底栏，**倍速之后、音量之前**；**仅时钟图标**；on 态沿用底栏 `.acsv-cbtn.on` 的 accent 红。

- **批次 B · 数据域 `watchlaterapi.js`**：`waitingPageOf`（`list[]` + `pcursor`；`no_more`/空页到底）+
  `listWaiting`（POST query `pcursor/count`，登录读走 `request`）+ `addWaiting`/`cancelWaiting`
  （POST form `resourceId/resourceType=2`，写链走 `net.request` GM 通道 + APP 头）。参数取自 jadx
  `AcFunApiService`（`K2/Q0/H1`）；**登录态样本未取到**，面板字段只映射确定项、缺省不伪造。
- **B · 我的页第 5 档**：`mypage` 在「观看历史」与「收藏夹」之间插入「稍后再看」；`mytabs.buildWatchLater`
  走 `pageloader/listtail`，卡片复用 `gridCardOf`，hover「移出」复用收藏夹 `.acsv-favcell/.acsv-favacts`
  动作壳；移出乐观隐藏、失败回滚 + toast；未登录不请求，直接出可读空态。
- **B · 底栏入口**：`playitem` 加 `waiting` 字段 + home `cap.waiting`（sv 不新增键）；`styles.ICONS.clock`；
  `controls` 在倍速之后插入时钟键（仅图标；`a11y` 文案「稍后再看 / 已加入稍后再看，点击移出」），
  乐观切换 `.on`、失败回滚；右栏不改，小视频底栏无此键。
- **A1 · 评论删除**：`comment/delete` PC 端点（`sourceId/sourceType/commentId`）；`commentkit`
  经 `opts.canDelete` 只在**推荐源 + 本人 + stype 3/4** 挂「删除」，点击委托 `openConfirmPop`
  （host=宿主根，防滚动列表裁剪）→ 成功移除条目 + 计数 -1；sv/他人无入口。sourceType=3 未单独实测，
  失败由 API 兜住、条目保留。
- **A2 · 动态删除**：`momentdetail` 头部对 `pi.momentId && pi.up.id===selfUid()` 出「⋮」→ 确认 →
  `deleteMoment`（既有）→ 关闭面板 + `opts.onDeleted`；`rowkit/followview/squareview/mypage` 移除
  对应行卡；列表卡面不加入口。
- **A3 · 三榜**：新 `rankapi.js`（hot GET count/pcursor/mkey；banana GET rankPeriod；youngStar
  POST form rankPeriod；回包复用 `panelitem.rank`，三榜与分区榜同族）+ `zone` 板 chips
  （分区榜/全站热榜/香蕉榜/新秀榜）；非 channel 隐藏渠道/子频道/榜期，`rankCache` key 加板名。
- **C · 历史删除/清空**：新 `historyapi.js`（`deleteHistory` form `comboIds` / `clearHistory`
  form `resourceTypes=1&resourceTypes=2`，jadx V2/f4）；`panelitem.history` 落 `comboId`；
  `mytabs` 历史卡 hover「删除」+ 顶部「清空历史」（复用 favcell 动作壳），确认后移除/清空 + 空态。
- **实报修复（APP 域写链 CORS 误判）**：用户实报「加稍后再看提示失败、实际已加入」。内置浏览器
  登录态表单 POST 实测：`addWaiting` 新增/已存在均回 `{"result":0}`；但 api-new 响应
  **没有 `Access-Control-Allow-Origin`**（未登录 401/无 ACAO），页面 `fetch` 会「服务端已写入、
  浏览器读不到响应」→ 误判失败。修法：waiting add/cancel 与 history delete/deleteAll 改走
  `net.request`（GM 通道带 Cookie + APP 头），与 `momentpost` 的 APP 域写链同口径；不再依赖
  `postForm` 的 Empty 假设。
- **测试**：单测 **447/447**（+11：watchlater 4 + playitem 1 + rankapi 3 + historyapi 3）；
  harness **88/88**（+4 `ctl-waiting`/`comment-delete`/`detail-delete`/`hist-delete`；
  `ctl-narrow`/`view-my`/`view-zone`/`fav-folders`/`relation` 扩面）。lint/tsc/check 全绿。
- **体积**：`acfun-svfeed.user.js` 601,321 B / `acfun-svfeed.debug.user.js` 968,570 B；
  check-release 的 rest/debug-total 段按约定重裁（见 `test/check-release.mjs` 0.9.279 注）。
- **文档**：README 模块表补 `watchlaterapi`/`rankapi`/`historyapi`、`controls`/`mypage`/`mytabs`/
  `zone` 行更新与依赖图节点/边；预览稿 `docs/preview/content-actions.html` 第 ⑥ 段为确认稿。

### 0.9.278（2026-10-18）· 非个性化推荐（游客态拉取发现类读，写链不变）

**由头**：用户要一个开关，换掉平台按个性化推荐拉来的视频，同时观看上报、评论、转发等行为不变。
真机用不带 Cookie 的 `curl` 实测 11 个发现类端点均可游客取数（结论入本地 `docs/api-research.md`
§14，不入公开仓）。

- **设置**：SCHEMA 末尾新增「隐私 → 非个性化推荐」（内部 key `guestRead`，默认关，hint 一行：
  「换用游客身份拉取推荐、小视频与发现内容；互动与观看上报照常，下次加载生效」）。放在末尾
  保证既有 `.acsv-sw` 索引不变；原生页 IP 面板不显示（无 `native` 标记）。
- **网络层**：`net.js` 新增 `transportPlan`（纯函数）/`requestRead`，`gmRequest` 透传
  `anonymous`；`request` 增加第 5 参 `opts.anon`。游客态规则：GM 用 `anonymous` 去 Cookie；
  无 GM 时跨域 XHR 可 `withCredentials=false`；**同源 XHR 无法 omit Cookie ⇒ fail closed**
  （`net.guestNoGm`），绝不静默退回带 Cookie。
- **游客读**（`requestRead`）：`homeFeed`、`api.feed`/`api.info`（小视频）、`playInfo`、
  `dmList`、`spriteVtt`、`channelapi` 两处、`relatedapi.listRelated`、搜索的视频/文章两端、
  `zone` 分区榜。
- **保持登录**（`request` 原样）：`dougaInfo`（赞/藏/蕉/关注个人态）、UP 主搜索（isFollowing）、
  评论/楼中楼、动态/广场/个人动态、我的页历史/收藏/分组、IP、签到。
- **写链不变**：`postForm` 仍 `credentials:'include'`；观看上报仍走官方 SDK/sendBeacon；
  转发/私信仍走 ImSdk。新增单测钉 `postForm` 凭证不受开关影响。
- **小视频**：`feed`/`info` 纳入游客拉取，但**不新增任何交互**；游客态 `isLike` 为 false
  （红心初始未赞），本轮不做 `like/infos` 回填。
- **测试**：单测 **436/436**（+6：`net.test.js` 新件 5 例 + settings 契约 1 例）；harness
  **84/84** 全绿（`settings-open` 行数 10→11、labels 追加「非个性化推荐」、新增默认关/开/持久化/
  关/持久化五钉；`related`/`layer-list` 的开关索引不变）。lint/tsc/check 全绿。
- **产物**：`acfun-svfeed.user.js` 591,653 B / `acfun-svfeed.debug.user.js` 950,002 B
  （check-release 分段 578/928KB，均在 ×1.02 门禁内）。
- **文档**：README 补「非个性化推荐」段、`net.js`/`settings.js` 模块行与 `net --> settings`
  依赖边；预览稿 `docs/preview/guest-read.html`（确认稿）。

### 0.9.277（2026-10-18）· 签到 + App 式黄历弹窗（网页端首个签到能力）

**由头**：用户问「网页端能不能调手机端签到接口、签到黄历能不能实现」→ 真机调研
（docs/api-research.md §10.17）+ App 反编译 UI 还原 → 按确认稿落地。

- **接口定论（实测）**：
  - `GET api-new…/user/getSignInInfos` 网页 Cookie 免参数直通（7 天日历 infos[7]；
    `continuousDays` 新字段；网页回包无 almanac）；
  - `POST api-new…/user/signIn` **web 不可行**（@Field access_token 要 App OAuth 令牌；
    换令牌 sid 白名单拒 acfun.api；8 组组合全灭）——写链改走
    `m.acfun.cn mobile-direct`（首选，GM 通道跨域带 Cookie）→ `www pc-direct`（同源写链兜底），
    两链空表体、今日已签回 result=122（App 侧按成功处理）；
  - `POST api-new…/user/updateAlmanacFortune` 网页 Cookie + 空表体 → 完整官方黄历
    （fortune/宜×3/忌×3/guideMsg/今日荐片）。App 侧它是「改运」按钮——按用户裁决**不缓存、
    每次实时拉**。
- **新件 `signapi.js`**（签到域）：`signInResultOf`/`almanacOf`/`signStateOf`/`ymdOf` 纯函数
  单测直采；`signIn()` 双链、`getSignInInfos()`、`fetchAlmanac()`、`tryAutoSign()`
  （singleFlight；开关默认可关；已签不发写请求；失败静默 + stat）。
- **新件 `signpanel.js`**（黄历弹窗）：按 App `fragment_sign_almanac_dialog_layout` + 用户截图
  逐像素还原的 3:4 竖卡（290×398）：6px 红包边 + 四角回纹角饰、「十月/18/OCT」错位日期、
  AC·运势红幅 + 散布白星、竖排宜忌（右→左、超长照 App 裁切）、特粗宋体运势、
  「今日奖励：香蕉xN」+「签到规则 ›」；点规则**同卡同尺寸翻面**（‹返回 + 5 条原文）；
  蒙层/取消/Esc 关闭。App 二进制立绘不入仓。
- **我的页（mypage）**：资料头右侧一枚按钮（不做签到栏，用户裁决）：签到（红）/
  签到中…（禁用）/ 今日已签（App 同款灰药丸，**可点=实时重拉黄历卡**）。
- **自动签到（boot）**：进脚本主页静默签一次；设置面板「通用」组新增「自动签到」开关
  （默认开）；当天已签服务端跳过，不打弹窗。
- **测试**：新增 `test/unit/signapi.test.js`（7 例：回包映射/122 重复/黄历缺项守卫/
  日历签到态）；harness 设置行数与开关索引随新增设置项同步（settings/related/layer-list）；
  check-release 体积基线按「撞线即重裁」约定重裁 css/total（签到弹窗 CSS ~1.2KB）。
- **文档**：api-research §10.17（实测全量）、inventory 签到族标注、README 依赖图补
  signapi/signpanel 节点与边、预览稿 docs/preview/signin-almanac.html（确认稿）。

### 0.9.276（2026-10-17）· 观察项收口：定时器/映射/画布生命周期（四项）

**由头**：A/B/D 三份精读台账的观察项收尾。能安全修的落地，信任边界/真机项明确接受，
不再留“待办”状态。

- **① `nativeip` 路由扫描去抖**（`src/nativeip.js:326-338`）：每次 pushState/replaceState
  都排一个 `onDomChange`，快速连续路由变化会叠多个幂等全页扫描；改为单 `urlTimer`，
  新路由清旧拍，只留最后一次。
- **② `report` 会话映射定长**（`src/report.js:23-30`）：`watchSentAt`/`lastMarkAt` 以
  `item.id:videoId` 为键，长会话线性增长；加 500 上限、按插入序淘汰最旧键。只影响去重/
  节流表，不改上报语义。
- **③ `dmcanvas` 暂停空转 + stopAll 销毁**（`src/dmcanvas.js:362-369`、`:437-447`、
  `:489-496`）：无 rVFC 时暂停旧实现仍每帧排 rAF（60Hz 空转）→ 暂停即 `running=false`
  停排，`playing` 经 `layer.start()` 重启；`stopAll` 从“只 stop”改为逐层 `destroy`
  （幂等，补触发 `onDestroy`、移除画布与图层闭包）。
- **④ `dbg` 调试镜像关页停表**（`src/dbg.js:37-47`）：1s `acsv-stats` 镜像 interval
  加 `pagehide` 清理；仅 debug 构建，release 死码消除。
- **明确接受（不改代码）**：`release` 正文是 GitHub 官方渲染 HTML（HTTPS + 官方 sanitize，
  与自动更新同源，属既定信任边界）；`imimage` 关闭抽屉不取消在途图片下载（缓存预热，
  非泄漏）；`session` 恢复后 `play()` 被自动播放策略拒绝是否造成可见暂停，需真机确认。
- **测试**：单测 **423/423**；harness **84/84**；lint/tsc/check 全绿。产物 582,590 B /
  934,291 B（较 0.9.275：release +257 B、debug +749 B）。`check-release` 的 rest 基线按
  审计批②约定重裁到本批实测值（0.9.258 以来累计功能增长首次撞线 81 B），+2% 门禁保留。

### 0.9.275（2026-10-17）· C 类精读修复：回包二级数组 / HLS 换源 / 评论请求序号（四项）

**由头**：视图/数据域 C 类精读台账（`docs/c-class-audit-2026-10-17.md`）。不做行为改版，
只补坏形状与旧响应的守卫。

- **C-P2-1 · `cardsOf` 的 `bodyContents` 非数组会炸整条推荐流**（`src/appapi.js:103-116`）：
  旧写法 `(block.bodyContents || []).forEach` 遇到对象/字符串直接抛错，`homeFeedFetch` 变成
  `failed`，推荐源整屏失败。修法：缺失=合法空块静默跳过，非数组走 `isArray` 计数后跳过。
  证据：`feed-blocks.test.js` 新增非数组用例——摘守卫即红，恢复即绿。
- **C-P2-2 · `playInfo` 的 `playUrls` 非数组会让整条解析拒绝**（`src/appapi.js:205-220`）：
  改为 `Array.isArray` 守卫，坏流项只产出空 `urls`（随后被过滤），不拖垮其它档位。
- **C-P2-3 · HLS 脚本标签分支不换源**（`src/hls.js:133-136`）：无 GM 环境下首个 CDN 脚本
  执行了但没给出可用 `Hls` 时旧代码直接 reject；改为与 GM 分支同口径 `next()`，继续后续
  CDN。无自动化直测（需无 GM + 坏首源），以代码路径证明入账。
- **C-P2-4 · 评论请求只按 sourceId 判旧**（`src/comments.js:202-246`）：同源切宿主
  （抽屉→详情面板）或同源重试时，旧追加回包会污染新列表/游标。改为 `commentState.reqSeq`
  单调序号：每次 `loadComments` 自增，回包按序号丢弃。无 harness 直测，以代码路径证明入账。
- **测试**：单测 **423/423**（+1 feed-blocks）；harness **84/84**；lint/tsc/check 全绿。
  产物 582,333 B / 933,542 B（较 0.9.274：release +84 B、debug +201 B = 守卫与单测）。

### 0.9.274（2026-10-17）· B 类精读修复：发送日志水位 + SDK 单例弃槽（两项）

**由头**：私信域 B 类精读台账（`docs/b-class-audit-2026-10-17.md`）。每项先造证据/反跑，
再修；未改正常发送路径的行为与文案。

- **P1 · 发送日志水位仍按数组下标**（`src/imsdk.js:101-114`）：`imLogMark` 返回滚动缓冲的
  `length`，而 `imLogVerdict` 从该下标起扫。缓冲 max 60，发送期间 `shift()` 驱逐后下标整体
  漂移 ⇒ 本次「信息发送成功/失败」可能永远扫不到 ⇒ `doSend` 等到超时 ⇒ `withSendRecovery`
  重试 ⇒ **可能重复私信**（或把上一次发送的日志误当本次结果）。修法：`imLogMark` 改返回
  **累计写入数**（`drop + length`，与 `tracerCrashAfter` 同口径）；`imLogVerdict` 按
  `drop + i >= mark` 扫绝对序号。证据：`test/unit/imsend.test.js` 新增「缓冲驱逐后仍能命中
  本次发送」——修复前红（从下标 2 起扫越界返回 null），修复后绿。
- **P2 · SDK 构造器抛错会永久毒化 `imPromise`**（`src/imsdk.js:263-271`、`:383-402`）：
  旧写法的 rejection 回调只接住 `loadImSdk` 失败；`new Ctor` 在 fulfillment 内抛错时
  `imPromise` 停在 rejected，后续 `ensureIm()` 永远不再重试（私信域整块不可用直到刷新）。
  修法：`p.then(null, 弃槽)` 统一覆盖加载失败与构造失败；`rebuildIm` 同款。该路径依赖
  真实 SDK 构造器，loader 私有、无自动化直测，已在台账标注为代码路径证明。
- **过时注释校准（同批，零行为）**：`feedland` 的“两帧 settle”统一改为实际的 **8 帧**
  （`tries=8`）；`imimage.prewarmIm` 改为“预热令牌缓存、Cookie 首次取图时写”；
  `sessionhooks` 的 `scrollToIndex` 归属从 player 改为 feedland（player 只装配注入）；
  `imsdk` 的“清缓冲会让 buf.length < mark 恒 null”旧论证改为累计水位口径，并注明
  0.9.274 对日志水位/弃槽的修复。
- **测试**：单测 **422/422**（+1 imsend 日志水位）；harness **84/84**（B 类不改 harness）；
  lint/tsc/check 全绿。产物 582,249 B / 933,341 B（较 0.9.273：release +110 B、
  debug +207 B = 修复与单测代码；注释校准后的产物以最终 build 为准）。

### 0.9.273（2026-10-17）· A 类精读修复：关注流深链上下文 + feedland 定时器（三项）

**由头**：播放核心 A 类精读台账（`docs/a-class-audit-2026-10-17.md`）的 P1/P2 落地。
每项均先造断言转红、再修转绿。

- **P1 · 深链不清理关注视频流上下文**（`src/player.js:275-280`）：`loadDeepLink` 只对
  `UpVideos.feedActive` 做归属判定，`FollowVideos` 仍真时 `FeedStore.ensureMore` 会按旧关注
  列表的 `feedCursor` 把旧条目泵进新舞台。修法：镜像 UpVideos 的归属判定（上下文确实拥有
  `mid`/`hit.item.id` 才延续，否则置 `feedActive=false`）。证据：新增
  `deeplink-followctx`——修复前 `second=11053531`（旧关注首条）且 `feedActive=true` 三条红；
  修复后 9/9 绿。
- **P2 · `feedland` 260ms 探测定时器不可撤**（`src/feedland.js:92`）：`stopSnapWatch` 只清
  interval，在途探针仍可能执行 `scrollTo`/`land.heal`。修法：保存 `probeTimer` 并在 stop 时
  `clearTimeout`。证据：`test/unit/feedland.test.js` 假时钟断言；摘 `clearTimeout` 即红。
- **P2 · `landAt` 8 帧 settle 不可作废**（`src/feedland.js:57-65`）：近跳后 ~133ms 内切源/
  深链时旧 settle 会按新流同下标继续钉视口。修法：`settleSeq` 代际令牌，`landAt` 取号、
  `scrollToIndex`/`stopSnapWatch` 递增作废。证据：单测假 rAF 断言旧 settle 不得改写
  `scrollTop`；摘代际校验即红。
- **测试**：单测 **421/421**（+2）；harness **84/84**（+1 `deeplink-followctx`）；lint/tsc/check
  全绿。产物 582,139 B / 933,134 B（较 0.9.272：release +512 B、debug +1,098 B = 修复与
  反跑代码/断言）。

### 0.9.272（2026-10-17）· player 第二阶段拆件：落地/吸附移入 feedland

**由头**：`player.js` 拆件方案 Phase 2。纯搬迁，行为零变更；`land-near` 是零漂移主证据。

- **病灶**：`player.js` 里 issue #1 的两条防线（脚本落位 `landAt`/`landWhenVisible`/
  `scrollToIndex` 与原生滚动半屏自愈 `snapWatchTick`）约 120 行，与窗口渲染/挂载编排混在
  一起；这段时序最敏感，却没有独立边界。
- **修法**：新建 `src/feedland.js`（174 行），导出 `createLandKit(env)`；env 注入
  `getScroller/feedStore/slideAt/stageVisible/setActive/renderWindow/reportLeaveCurrent`，
  本件**不 import player**（无回边）。`landAt`/`snapWatchTick`/`start-stopSnapWatch`/
  `landWhenVisible`/`scrollToIndex` 逐字搬迁，仅把 `scroller`/`FeedStore`/`slideAt` 等
  改为 env 读取。`player.js` 640 → **522 行**，只留 `land` 装配、调用点与原有编排。
- **归类**：`check-direction` 的 **PLAY** 加 `feedland.js`（播放层几何/时序，只依赖 dbg
  基建；`setActive`/`renderWindow` 经注入，避免 PLAY→组合根）。三口径复跑 0/0/0。
- **登记同步**：README 播放层 subgraph 新增 feedland 节点、`player --> feedland`；模块表
  新增 feedland 行并改 player 行；`docs/dependency-audit.md` 追加 0.9.272 台账、
  `docs/roadmap.md` §11 补 Phase 2 落地追记。
- **测试证据**：既有断言/夹具零改动——**land-near**（land.stuck / land.heal / land.trunc /
  land-heal-on-snap）不改断言全绿；fastswipe / feed-slim / deeplink-* / stall-* / recover-*
  同批全绿；单测 419/419；lint/tsc/check 全绿；harness **83/83**。产物 581,627 B / 932,036 B
  （较 0.9.271：release +483 B、debug +1,164 B = 新模块头/工厂边界）。

### 0.9.271（2026-10-17）· player 第一阶段拆件：会话回接钩子移入 sessionhooks

**由头**：`player.js` 758 行的拆件方案 Phase 1（Phase 2 `feedland.js` 待下一批）。纯搬迁，
行为/样式/文案零变更。

- **病灶**：`SESSION_HOOKS`（initVideo/currentIdx/play/onPlaying/onPause/onMeta/onTime/onEnded/
  onDisposed 等）与画幅判断 `panFitOf`/`syncPanFit`/`videoStageVisible` 混在 player 编排层，
  约 120 行 session↔UI 胶水占着组合根；session.js 的状态机与 UI 编排边界只在注释里。
- **修法**：新建 `src/sessionhooks.js`（148 行），导出 `createSessionHooks({ scrollToIndex })`
  与 `syncPanFit`/`videoStageVisible`；`SESSION_HOOKS` 逐字搬迁，唯一导航回调 `scrollToIndex`
  经工厂注入（不 import player）。`player.js` 758 → **640 行**，只留 `createSessionHooks` 装配、
  resize 监听与原有编排。
- **归类**：`check-direction` 的 **SKIP_B** 加 `sessionhooks.js`（与 boot/player 同属组合根/
  编排层；它 import rail/playlayer/views 属装配向下，归 PLAY 会触发口径 C、归 FEATURE 语义不准；
  SKIP_B 对口径 B 源豁免）。三口径复跑 0/0/0。
- **登记同步**：README 播放层 subgraph 新增 sessionhooks 节点、`player --> sessionhooks` 与
  `sessionhooks --> attach & danmaku & feedstore & pb & playlayer & views` 实测边；模块表新增
  sessionhooks 行并改 player 行；`docs/dependency-audit.md` 追加 0.9.271 台账、
  `docs/roadmap.md` §11 补 Phase 1 落地追记（下一批 feedland）。
- **测试证据**：既有断言/夹具零改动——单测 419/419、lint、tsc、check（cases 81/81、deps、
  direction 0/0/0、listeners）、harness chromium 83/83 全绿即零漂移证据。产物 581,144 B /
  930,872 B（较 0.9.270：release +61 B、debug +356 B = 新模块头注释）。

### 0.9.270（2026-10-17）· imsend 拆件：SDK 基建移入 imsdk（高风险边界专项）

**由头**：0.9.264 ⑤ 拆件评估续项（`docs/roadmap.md` §11 第五项，原判「收益最大但风险高：
`imPromise`/`connGen`/崩溃水位被发送恢复链跨切，需一次边界重排」）。行为/样式/文案零变更——
纯文件搬迁，按既定边界整组搬、不顺手改逻辑。

- **病灶**：`imsend.js`（688 行）混 SDK 基建（加载/补丁/日志黑匣子/单例连接/重建）与
  「联系人 + 发送核心」两族职责；发送恢复链跨切单例槽/轮询世代/崩溃水位，却没有独立可测
  边界——改 SDK 注入或重连策略要读完整份发送可靠性代码。
- **拆法（边界 = 函数名）**：新建 `src/imsdk.js`（402 行），搬 `pageWin`、日志黑匣子
  （`logInstaller`/`injectPageFn`/`ensureLocalLog`/`imLogMark`/`imLogVerdict`/`imLogState`/
  `imLogTotal`/`tracerCrashAfter`/`tracerFixedTotal`/`hadTracerCrash`）、weblog 兜底
  （`weblogInstaller`/`tracerOk`/`ensureWeblogSync`）、`isLogined`、`gmGetText`/`loadImSdk`、
  `imPromise`/`ensureIm`、`linkOk`/`forceReconnect`、`tracerInstaller`/`ensureTracer`、
  `connGen`/`imShutdown`/`ensureConnected`、`resetSingleton`/`rebuildIm`。`imsend.js` 302 行，
  只留 `getContacts`/`mapSessions`/`fetchCards` 与 `doSend`/`forceSync`/`withSendRecovery`/
  `sendOnce`/`sendKernel`/`sendImage`/`sendQuote`/`sendCmtShare`/`sendMomentShare`。
- **跨切状态处理（本专项的关键裁决）**：`imPromise`（单例槽）、`connGen`（在途轮询世代）、
  `tracerFixedTotal`（已修复水位）三处**整组随 SDK 走**，`imsend.js` 不持副本——恢复链只经
  imsdk 出口 `hadTracerCrash()`/`rebuildIm()` 读；`rebuildIm` 内部仍在 `ensureConnected`
  成功后推进水位（`tracerFixedTotal = imLogTotal()`），语义逐字未动。
- **导出/导入迁移**：imsdk 导出 `ensureIm`/`isLogined`/`linkOk`/`forceReconnect`/`ensureTracer`/
  `imShutdown`/`ensureConnected`/`rebuildIm`/`imLogMark`/`imLogVerdict`/`hadTracerCrash`/
  `imLogTotal`/`tracerCrashAfter`（后四件供单测与发送核心）；imsend 只 import
  `ensureConnected`/`ensureTracer`/`linkOk`/`rebuildIm`/`hadTracerCrash`/`imLogMark`/`imLogVerdict`，
  并删去不再使用的 `gmRequest`/`cookieVal`/`stat`/`set`（eslint 零告警）。消费方同步：
  imdrawer（`ensureIm/isLogined/imShutdown`）、imbadge（`ensureIm/isLogined`）、imlist
  （`ensureIm/ensureConnected` + imsend 的 `fetchCards`）、imchat（`ensureIm/ensureConnected/
  ensureTracer`）、imsendui（`ensureIm/ensureConnected/ensureTracer/linkOk` + imsend 的
  `doSend/sendQuote/sendImage/forceSync`）、sharepanel（`ensureIm/ensureConnected/isLogined`
  + imsend 的 `getContacts/fetchCards/sendCmtShare/sendMomentShare/sendOnce`）。
- **登记同步**：`check-direction` FEATURE 加 `imsdk.js`（私信特性域；出边只到 cfg/dbg/net/ui
  基建），三口径复跑 **0/0/0**；README 私信 subgraph 新增 `imsdk` 节点、按实测补七条边
  （`imsend --> imsdk` 与六个消费件 → imsdk），模块表新增 imsdk 行、imsend 行删去 SDK
  加载/连接/黑匣职责（注明 0.9.270 拆分）、imbadge/sharepanel/imdrawer 行的 `imsend.ensureIm`
  改 `imsdk.ensureIm`；`test/unit/imsend.test.js` 的 `tracerCrashAfter` 改从 imsdk 导入并同步
  头注；`docs/dependency-audit.md` 追加 0.9.270 台账、`docs/roadmap.md` §11 补落地追记。
- **测试证据**：既有断言/夹具零改动——单测 **419/419**（imsend.test.js 水位 4/4 语义未改，
  仅 import 路径与头注）、lint、tsc、check（check-cases 81/81、check-deps、check-direction
  0/0/0）、harness chromium **83/83**（badge-delay 4、badge-listener 9、im-open 25、
  im-native 13、im-bubble 9 全绿）。产物 581,083 B / 930,516 B（较 0.9.269：release ±0 B、
  debug +19 B = 新文件头注释与模块边界）。

### 0.9.269（2026-10-17）· imdrawer 三簇拆件：列表/聊天/发送移入 imlist/imchat/imsendui

**由头**：0.9.264 ⑤ 拆件评估续项（`docs/roadmap.md` §11；0.9.268 拆出气泡簇后 imdrawer 仍
769 行）。行为/样式/文案零变更——纯文件搬迁，分三子批，**每批 build + harness 绿后才进入下一批**。

- **病灶**：`imdrawer.js` 在气泡簇外迁后仍混三族职责——抽屉骨架/视图切换/生命周期（本分）、
  列表视图（拉取/签名/渲染/轮询）、聊天视图（会话轮询/时间分割/引用 chip）、发送乐观 UI
  （文本/引用/图片占位与失败重试）。三族只共享 `drawer/view/cards/chat/lastImInst` 与两个
  小工具（`msgTime`/`makePoller`），却让任一族改动都要读整份抽屉代码。
- **子批 1 · 发送 UI → `src/imsendui.js`**：搬 `sendImageMsg`/`readSize`/`sendChat`（原约
  522–649 行）；`createSendKit(env)` 导出 `{ sendImageMsg, sendChat }`（`readSize` 私有），env =
  `getDrawer/getChat/getBubble/maybeDayDiv/setQuote/chatPollOnce`；`inputBar` 的图片/发送回调改走
  kit。`imdrawer.js` 769 → 652 行。批后 harness `im-bubble,im-open,im-native,composer-rich`
  = 9/25/13/49 断言全绿。
- **子批 2 · 列表视图 → `src/imlist.js`**：搬 `listPoll`/`sessionSig`/`refreshList`/`renderList`/
  `previewOf`/`lastListRows`/`listSig`（原约 48–52、226–324 行）；`createListKit(env)` 导出
  `{ listPoll, refreshList, renderList, previewOf, reset }`，env =
  `getDrawer/getView/getCards/setCards/openChat/makePoller/msgTime/chatTime`；`showList` 改
  `listKit.listPoll.stop()/start()`，搜索框改 `listKit.renderList`，行点击经 `openChat` 注入回
  `showChat`。`imdrawer.js` 652 → 561 行。批后 harness
  `im-bubble,im-open,im-native,view-im,view-im-narrow` = 9/25/13/30/30 全绿。
- **子批 3 · 聊天视图 + 引用 chip → `src/imchat.js`**：搬 `chatPoll`/`loadChat`/`chatPollOnce`/
  `dayLabel`/`maybeDayDiv`/`chatTime`/`setQuote`/`renderQuoteChip`（原约 53–60、326–424 行）；
  `createChatKit(env)` 导出八件，env =
  `getDrawer/getChat/setChat/getInst/setInst/getBubble/makePoller/msgTime`；`bubble` 工厂的
  `setQuote`/`maybeDayDiv`、`sendKit`/`listKit` 的跨簇钩子全部改指 `chatKit`；`showChat` 改
  `chatKit.chatPoll.stop()`/`loadChat()`/`chatPoll.start()`；`closeDrawer`/`teardownIm`/
  `ensureDrawerDom`（chip 取消、表情冷启动重拉）与 `imBubbleSmoke` 同步改。`imdrawer.js`
  561 → 454 行。批后 harness `im-bubble,im-open,im-native,badge-listener,badge-delay`
  = 9/25/13/9/4 全绿。
- **两处必要的缝扩展**（同 0.9.268 先例，不改行为）：① `imlist` 多出 `reset()`——teardown 原
  清 `listSig/lastListRows`，不重置会让重开抽屉时同会话集因旧签名跳过重绘；② `imchat` 直接
  import 零依赖叶 `immsg.msgTextOf`，保持 `chatPollOnce` 的兜底消息 key 与拆前逐字一致（不在
  kit 里复制第二份文本投影）。
- **收口后的 imdrawer 只留**：共享状态 `drawer/view/cards/chat/lastImInst`、`msgTime`、
  `makePoller`、`ensureDrawerDom`、`setPane/showList/showChat`、`openDrawerCore`/`openDrawer`/
  `openChat`/`closeDrawer`/`toggleImDrawer`/`teardownIm`、测试钩子与注册；无已搬实现的副本。
- **登记同步**：`check-direction` FEATURE 加 `imlist.js`/`imchat.js`/`imsendui.js`（私信特性域；
  入边全部来自 imdrawer，出边只到 FEATURE/INFRA/零依赖叶），三口径复跑 **0/0/0**；README 私信
  subgraph 新增三节点、`imdrawer -->` 按实测收窄（去掉 imgload/immsg/timefmt）、新增
  `imlist --> imgload & immsg & imsend`、`imchat --> immsg & imsend & timefmt`、
  `imsendui --> imsend & toastmsg`，模块表新增三行并改 imdrawer 行；`eslint.config.mjs` 图片
  白名单由 `imdrawer.js` 换成 `imsendui.js`；`docs/dependency-audit.md` 追加 0.9.269 台账、
  `docs/roadmap.md` §11 补落地追记。
- **测试证据**：既有断言/夹具零改动——单测 419/419、lint、tsc、check（check-cases、check-deps、
  check-direction 0/0/0）、harness chromium **83/83** 全绿。产物 581,083 B / 930,497 B
  （较 0.9.268：release +1,415 B、debug +3,666 B = 三个新文件头注释/工厂边界/`reset` 缝）。

### 0.9.268（2026-10-17）· imdrawer 拆件：气泡渲染簇移入 imbubble（先补断言再拆）

**由头**：0.9.264 ⑤ 拆件评估第四项（`docs/roadmap.md` §11，原判「风险中高：先补渲染断言再拆」）。
行为/样式/文案零变更——纯文件搬迁。

- **病灶**：`src/imdrawer.js` 938 行混两族职责——抽屉骨架/轮询/列表/发送生命周期，与聊天视图的
  气泡渲染（文本/引用/图片/作品卡/分享/评论转发/动态卡、引用条与定位、暗色卡片皮肤）。后一族约
  200 行逐条直读 `drawer`/`chat`/`lastImInst`，此前没有结构断言兜底，拆件风险集中在「渲染分流
  顺序被搬歪」。
- **先补断言（第一步，独立跑绿后才动源码）**：`imdrawer.js` 新增 debug 钩子 `imBubbleSmoke`，
  用假消息直调 `appendBubble`，覆盖己方/对方文本、extra 引用条、10001 作品卡，返回结构快照
  （bubbles/mine/text/quote/quoteLink/quotePreview/quotebtn/card/daydiv）；`test/cases/msg.js`
  新增 `im-bubble` 场景（6 条断言），`run-harness.mjs` 登记（debug 构建）。先跑
  `im-bubble`（9 断言）与 `im-open,im-native`（25+13 断言）全绿，再进入搬迁。
- **修法**：新建 `src/imbubble.js`（264 行），以 `createBubbleKit(env)` 工厂承接 `msgFrom`/
  `linkify`/`imTextHtml`、`quoteStrip`/`locateMessage`/`bubbleRow`/`quoteBtnEl`、
  `appendBubble`/`appendImageBubble`/`SKIN`/`appendCardBubble`/`appendShareBubble`/
  `appendMomentBubble`。env 注入 `getDrawer/getChat/getInst/setQuote/maybeDayDiv/msgTime`，
  **不 import imdrawer**（无回边、无环）；`imdrawer.js` 收窄到 769 行，只留骨架/轮询/列表/
  引用 chip/发送乐观 UI/生命周期。代码**逐字搬迁**（仅 `drawer`→`env.getDrawer()`、
  `chat`→`env.getChat()`、`lastImInst`→`env.getInst()`、`setQuote`→`env.setQuote`、
  `maybeDayDiv`→`env.maybeDayDiv` 的机械替换；逻辑/文案/类名/请求参数零改动）。
- **两处必要的缝扩展**：`chatPollOnce` 的消息 key 仍用 `msgFrom`（`bubble.msgFrom` 出口）；
  发送乐观占位复用 `quoteStrip`/`imTextHtml`（kit 出口），避免在 imdrawer 复制第二份渲染逻辑。
  `eslint.config.mjs` 图片白名单把 `imbubble.js` 加入（原 `imdrawer.js` 保留——发送占位仍建
  本地预览 `img`）。
- **登记同步**：`check-direction` FEATURE 加 `imbubble.js`（私信特性域；入边来自 imdrawer，
  出边仅 FEATURE/INFRA/API/零依赖叶），三口径复跑 0/0/0；README 私信 subgraph 新增 imbubble
  节点、`imdrawer --> … & imbubble` 与 `imbubble --> …` 实测边，模块表新增 imbubble 行并改
  imdrawer 行；`docs/dependency-audit.md` 追加 0.9.268 台账、`docs/roadmap.md` §11 补落地追记。
- **测试证据**：既有断言/夹具未改——单测 419/419、lint、tsc、check（check-cases 81/81、
  check-deps 节点/边、check-direction 0/0/0）、harness chromium **83/83** 全绿；拆后 `im-bubble`
  同一钩子继续绿（9 断言）。产物 579,668 B / 926,831 B（较 0.9.267：release +1,728 B、
  debug +3,270 B = 新文件头注释/工厂边界/新断言钩子）。

### 0.9.267（2026-10-17）· controls 拆件：弹幕设置面板移入 dmpanel（零行为漂移）

**由头**：0.9.264 ⑤ 拆件评估第三项（`docs/roadmap.md` §11）。行为/样式/文案零变更——纯文件搬迁。

- **病灶**：`src/controls.js` 732 行混两族职责——控制栏（进度条/清晰度菜单/手势）与弹幕设置面板
  （齿轮展开两 tab：设置开关/滑杆 + 屏蔽标签/关键词）。两族零共享状态，改面板却要读整份控制栏
  代码；边界只写在注释里。
- **修法**：新建 `src/dmpanel.js`（159 行）承接 `buildDmPanel(slide)` 及私有件 `DM_DEFAULT`/
  `refreshDmPanel(box)`（原 471–623 行整体搬迁）；`controls.js` 收窄到 579 行，只留控制栏主体与
  `var dmPanel = buildDmPanel(slide)` 调用点。代码**逐字剪切**（仅 `buildDmPanel` 加 `export`、
  import 重排 + 文件头归属说明，逻辑/文案/类名/设置键/事件语义零改动）；`getSetting`/`setSetting`
  与 `el` 在 controls 其余段仍被使用，import 保留。
- **登记同步**：`check-direction` 的 **PLAY** 加 `dmpanel.js`（与 controls 同属播放层 UI 件，
  只依赖 ui/settings 基建 ⇒ PLAY→INFRA 合法，不进 FEATURE）；README 播放层 others 聚合名单加
  `dmpanel`、模块表新增 dmpanel 行并改 controls 行；`docs/dependency-audit.md` 追加 0.9.267
  拆件台账、`docs/roadmap.md` §11 落地追记补记。
- **测试证据**：既有断言/夹具未改——单测 419/419、lint、tsc、check（含 check-deps 节点/边、
  check-direction 三口径 0/0/0）、harness chromium 82/82 全绿即零漂移证据。产物 577,940 B /
  923,561 B（较 0.9.266：release ±0 B、debug +21 B = 新文件头注释与模块边界）。

### 0.9.266（2026-10-17）· imsend 拆件：图片管线移入 imimage（零行为漂移）

**由头**：0.9.264 ⑤ 拆件评估第二项（`docs/roadmap.md` §11）。行为/样式/文案零变更——纯文件搬迁。

- **病灶**：`src/imsend.js` 889 行混两族职责——SDK 加载/连接/发送恢复链，与私信图片管线
  （字节：midground 令牌/blob LRU/下载队列/在飞去重；URL 换链：ks://→官方直链）挤在一件。
  两族零共享状态，改图片缓存却要读整份发送可靠性代码；边界只写在注释里。
- **修法**：新建 `src/imimage.js`（210 行）承接 `midgroundToken`/`mgTokenP`、`imgBlobCache`/
  `IMG_BLOB_CACHE_MAX`/`cacheBlobPut`、`imgQ`/`imgActive`/`IMG_Q_LIMIT`/`runQueuedImg`/
  `pumpImgQ`/`enqueueImg`、`imgInflight`、`imgCacheKey`、`peekImImageBlob`/`fetchImImageBlob`/
  `prewarmIm`，以及 `imageUrlOf`/`imageUriFromRaw`/`officialize`；`imsend.js` 收窄到 688 行，
  保留 `sendImage`（只走 SDK 构造器）。代码**逐字剪切**（两段原文直接搬移，仅 import/export
  重排 + 文件头归属说明，逻辑/文案/请求参数/缓存语义零改动）；`imsend.js` 的 `ui` import 去掉
  搬迁后不再使用的 `selfUid`（`cookieVal` 仍供 `isLogined`）。
- **登记同步**：`check-direction` 的 FEATURE 加 `imimage.js`（与 imsend/imdrawer 同属私信特性域，
  唯一入边来自 imdrawer）；README 私信 subgraph 新增 imimage 节点、`imdrawer --> … & imimage & …`
  边、模块表新增 imimage 行并改 imsend/imdrawer/imgload 三行；`docs/dependency-audit.md` 追加
  0.9.266 拆件台账、`docs/roadmap.md` §11 落地追记补记。
- **测试证据**：既有断言/夹具未改——单测 419/419、lint、tsc、check（含 check-deps 节点/边、
  check-direction 三口径 0/0/0）、harness chromium 82/82 全绿即零漂移证据。产物 577,940 B /
  923,540 B（较 0.9.265：release −2 B、debug +21 B = 新文件头注释与模块边界）。

### 0.9.265（2026-10-17）· mypage 拆件：管理档移入 mytabs（零行为漂移）

**由头**：0.9.264 ⑤ 拆件评估的第一项（P2-8）。行为/样式/文案零变更——纯文件搬迁。

- **病灶**：`src/mypage.js` 739 行、多职责（资料头 + 动态档 + 历史档 + 管理档壳 + 收藏夹档 +
  关注分组档 + 视图注册）。改任一档都要读整文件；档与档之间的边界只在注释里。
- **修法**：新建 `src/mytabs.js`（552 行）承接观看历史档（`buildHistory`）、管理 tab 壳
  （`adminTab`）、收藏夹档（`buildFav`）、关注分组档（`buildFollowGroups`）及其私有件
  `rowList`/`skeleton`/`makeListCtx`；`mypage.js` 收窄到 195 行，只留资料头（`meCardOf`/
  `buildMeCard`）、动态档（`buildMoments`）、视图壳（`buildMyView`）、卸载
  （`myTeardown`）与注册。代码**逐字搬迁**（仅三处 builder 加 `export`、import/export 重排），
  已用脚本对 `HEAD:src/mypage.js` 原文做逐行比对（6 段全部 VERBATIM-OK）。
- **登记同步**：`check-direction` 的 FEATURE 加 `mytabs.js`（与 mypage 同层，唯一入边来自 mypage）；
  README 依赖图新增 mytabs 节点、原 mypage 的 18 目标边拆成 mypage 9 条（appapi/imgload/imgurl/
  momentapi/rowkit/squarefeed/timefmt/viewreg/mytabs）+ mytabs 12 条（appapi/cards/favapi/favpop/
  grouppop/imgload/listtail/nameval/pageloader/pickpop/relationapi/toastmsg，与 import 实测一致）；
  模块表新增 mytabs 行、mypage 行补拆件说明。
- **测试证据**：既有断言/夹具未改——单测 419/419、lint、tsc、check（含 check-deps 缺边与
  check-direction 三口径 0 条）、harness chromium 82/82 全绿即零漂移证据。产物 577,942 B /
  923,519 B（debug +20 B＝mytabs 文件头两行，压缩产物尺寸不变）。

### 0.9.264（2026-10-17）· P1 健壮性三件 + WebKit 冒烟 + 拆件评估（五项）

**由头**：五维代码质量评估的 P1/P2 落地。行为零变更——空 catch 只加意图标记/计数；端点守卫
只计数并保持原回退；监听器作用域等价替代手写 add/remove；拆件评估未动代码。

- **① 空 catch 分级**：eslint 加 `no-empty` 门禁（射程 src/*.js；test/tools/build 既有夹具
  维持原规则）。137 处空 catch 全部显式表态：cleanup 38 / storage 38 / parse 13 / sdk 13 /
  media 3 / network 2 / `dbg.swallow` 30（`stat('swallow.<module>')`，release 下 noop）。
  Promise `.catch(function () {})` 不改。
- **② 监听器生命周期**：新增 `src/lifecycle.js`（`createScope()` → `{on, dispose, size}`），
  `session` 的 `visibilitychange` 与 `searchview` 的 `acsv-searchhist` 迁入作用域；新增
  `test/check-listeners.mjs` 静态棘轮（window/document 监听未撤且未标
  `// singleton-listener:` 即红），已进 `npm run check`。当前 26 处、0 未登记。
- **③ 关键端点形状守卫**：新增 `src/contract.js`（`hasShape`/`isArray`，缺形状只
  `stat('contract.<tag>.miss')` 计数、绝不抛错）；接线 feed（meow）/`douga.info` /
  `playInfo` / comment list 四个入口，调用方保持原回退。
- **④ WebKit 冒烟**：`test/run-harness.mjs` 支持 `HARNESS_BROWSER=webkit`；CI 增 WebKit
  安装与 7 场景冒烟（view-my/view-search/im-open/upd-open/ip-tags/composer-rich/comment-fail），
  chromium 全量主回归不变。
- **⑤ P2-8 大文件拆件评估**：`docs/roadmap.md` 新增 §11——mypage→mytabs、imsend→imimage
  优先；controls→dmpanel 次之；player 暂缓；未动任何代码。
- **测试**：单测 419/419；lint/tsc/check 全绿；harness 82/82；WebKit 7/7。产物 577,942 B /
  923,499 B（较 0.9.263 +1,210 B / +2,714 B：两个新基建件、契约接线与 137 处注释/计数的净增）。

### 0.9.263（2026-10-17）· 复用收口与契约类型扩面（三项）

**由头**：五维代码质量评估（v0.9.262）的 P2 清单——同形副本与类型覆盖缺口。三项均为低风险
收口，视觉形态与交互零变化（不触发 UI 预览门槛）。

- **① 时长格式化单源**：`cards.js` 的私有 `fmtDur` 与 `ui.fmtTime` 语义等价（clamp 负值 /
  `mm:ss` / 补零），改 import `fmtTime` 并删除副本。输出逐字符一致。
- **② 投蕉话术单源**：`momentbar.js` 两处手写串（失败 / 已投过）与 `rail.js` 的已投过串收归
  `toastmsg.js`（新增 `errBananaThrown`）；失败文案统一为 `errBanana` 的「投蕉失败（未登录或
  今日已投完？）」。行为不变，仅消除同义异写。
- **③ 契约面类型扩面 +6**：`favapi` / `relationapi` / `momentapi` / `channelapi` / `quality` /
  `pageloader` 挂 `// @ts-check`（24 → 30 件）；`tsc -p jsconfig.json` 零错误，无需新增注解。
- **测试**：单测 414/414；harness 82/82；lint/tsc/check 全绿。产物 576,732 B / 920,785 B
  （较 0.9.262 −184 B / −206 B：删副本、并话术的净减）。

### 0.9.262（2026-10-17）· 开关控件单源（双皮合并；按确认稿落地）（一项）

**由头**：审计 P3-3——同一枚 34×18 药丸开关在齿轮面板（`settingspanel` 的 `.set-sw`，`button+<i>`）
与原生页/IP 面板（`natpanel` 的 `.acsv-np-sw`，`span+::after`）各写一份。按
`docs/preview/toggle-unified.html` 确认稿落地（预览稿已入档）。**几何零变化**。

- **① CSS 单源（`styles.js` 新增 `SWITCH_CSS`）**：几何/过渡/悬停/焦点/禁用一份；几何全由变量
  推导（位移 = `--sw-w − --sw-knob − 2×--sw-inset` = 16px，不再写死魔数）；两皮只换 token
  （`skin-dark` 走基础 token / `skin-light` 换关态 `#ddd` + 旋钮阴影）。两处宿主各自注入**同一串**
  （齿轮面板在 Shadow DOM 内，全局样式进不去）：`SET_CSS` 前置 `SWITCH_CSS`，`NATIVE_PANEL_CSS`
  原位拼 `SWITCH_CSS`，并删掉 `.acsv-np-sw` 四条与 `.acsv-np.dark` 两条覆盖规则。
- **② DOM/状态单源（`ui.makeSwitch`）**：`<button class="acsv-sw" role="switch" aria-checked>` +
  `<i>` 旋钮；乐观切换 + 幂等 `sync`。原生页面板由 `span` 改 `button`（顺带修掉不可聚焦/不可键盘
  操作）；`switchOf` 按本次主题传 `dark|light`，齿轮面板 `boolControl` 改用它。
- **③ 三处用户确认的观感变更**（预览稿已确认）：新增悬停提亮（`filter:brightness(1.06)`——用
  filter 而非 `color-mix`，照顾旧内核）、新增 `:focus-visible` 焦点环、过渡统一 `150ms`。浅色
  旋钮阴影保留、暗色无（与改造前一致）。
- **④ 预览期未暴露的坑（已修）**：`--sw-on` 不能只写 `var(--acsv-accent)`——原生页不注入全量
  CSS，变量未定义会让"开"态透明；改为 `var(--acsv-accent, #fd4c5d)` 带回退。
- **测试**：`settings-open` +4 钉（`set-sw-geometry` 34×18 / `set-sw-knob` 14×14 / `set-sw-a11y`
  `role=switch` / `set-sw-dark-token` 关态 `rgb(158,158,158)`）；`nat-panel` +1 钉
  （`np-sw-light-token` 关态 `#ddd`）。**反跑**：删掉 `.acsv-sw.skin-light` 的 token ⇒
  `np-sw-light-token` 转红（读回退色 `rgb(158,158,158)`），还原复绿。两条 token 断言用 `waitFor`
  等过渡落定（150ms 过渡期内 `getComputedStyle` 读到的是插值/起点色，直接断言会假红）。
- **测试总账**：单测 414/414；harness 82/82；lint/tsc/check 全绿；产物 576,916 B / 920,991 B
  （较 0.9.261 +263 B / +494 B：按钮化 + 可访问性属性的净增）。

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
