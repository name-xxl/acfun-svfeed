# 更新日志

AcFun 小视频竖刷页脚本的版本更新记录（版本号即小节号，最新在前；0.9.81 起自 README 迁出）。
每节记录：病灶（真机/评审实证）→ 修法 → 测试证据。项目约定见 README 的「开发」章。

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

### 0.9.199（2026-10-07）· 播放器打磨（六）：画中画 PiP（换条/退出自动关）

- **由头**：用户裁决「画中画＝换条/退出时自动关」（预览稿内已记）。
- **修法**：底栏加 PiP 键（`ICONS.pip` 自绘）；`togglePip(video)` 进/出 PiP，失败静默（无用户手势或能力不足时
  浏览器会 reject）；激活态由 `enterpictureinpicture`/`leavepictureinpicture` 事件同步
  （`controls.refreshPipBtn`，监听在 `input.js` 挂载并在 teardown 摘除）。**不拦换条**——切换会 dispose video，
  元素一移除浏览器自会退出 PiP（这正是"自动关"语义的天然实现，无需额外拦截）。**支持门控**：
  `document.pictureInPictureEnabled === false` 时按钮不显示。
- **测试**：build/lint/check（含 tsc）/单测 262/全场景 56 全绿。play-deep 58→59 断言：`pip-btn`
  （按钮在 + `aria-label` 正确 + 可见性随 `pictureInPictureEnabled` 门控）。
  注：真实进出 PiP 需要用户激活与系统合成器，**无头环境不可靠**，故不钉真实进出。

### 0.9.198（2026-10-07）· 播放器打磨（五）：音量竖条滑杆（真音量 + 与静音两态联动）

- **由头**：用户裁决「音量滑杆做成竖的」（预览稿内已记）。
- **病灶**：音量此前**只有二值静音**——`video.volume` 恒 1、`pb` 里根本没有音量值，想小声看只能全静音。
- **修法**：
  ① `pb.volume`（0~1 真值）+ 设置项 `vol`（`panel:false`——控制栏竖条是唯一入口，面板里做 0~1 步进器没有意义）；
     `resetForMount` 恢复偏好并把「音量 0」归一到静音态。
  ② `playback.setVolume(v)`：clamp → 落盘（走设置层防抖）→ **两态联动**（>0 即取消静音、=0 即静音）→
     `applyVolume()` 落到所有 video；新建视频由 `player.initVideo` 同步 `volume/muted`。
  ③ 控制栏：静音键外包一层 `.acsv-volwrap`，hover 展开**竖条**（`.acsv-volslide`：竖轨 + 手柄 + 数字）；
     指针捕获拖动（拖出轨道也继续调），**自下而上＝声音变大**（原生同款语义）；
     `refreshMuteIcons` 一并同步填充高/手柄位/数字，并给静音态加 `.mute` 类。
- **测试**：build/lint/check（含 tsc）/单测 262/全场景 56 全绿。play-deep 55→58 断言：
  `vol-slider-vertical`（高 > 宽×4）、`vol-drag-mid`（拖到中间 ⇒ `video.volume≈0.5` 且未静音）、
  `vol-zero-mutes`（拖到底 ⇒ `video.muted` 且按钮带 `.mute`）。**反跑实证**：摘掉 `setVolume` 里的
  `applyVolume()` ⇒ `vol-drag-mid` 转红（`vol=1.00 muted=true`）；还原 ⇒ 绿。
  测试注：滑杆平时 `display:none`（hover 展开），无头下不便 hover，故测试期强制展开后再量。

### 0.9.197（2026-10-07）· 播放器打磨（四）：两级全屏（网页全屏 / 窗口全屏）+ 测试提速设施

- **由头**：用户裁决两级全屏语义——**网页全屏＝视频铺满浏览器窗口**（隐自身 UI）、**窗口全屏＝铺满整个屏幕**
  （再叠 OS 全屏）；预览稿 `player-bottombar.html` 内已记裁决。
- **修法**：根类 `.acsv-cinema` 承载影院态（CSS 一处收口：隐 dock/顶栏/右栏/信息区；**抽屉不隐**——那是
  用户主动开的浮层）；`ui` 增 `toggleWebFull`/`toggleWindowFull`/`toggleFullLadder` 三件；底栏把原「全屏」
  一枚**拆成网页全屏 + 窗口全屏**两枚（新图标 `ICONS.webFs`/`winFs`，自绘——A 站播放器控制栏未定位到全屏键）；
  **F 键走三级梯子**（常态→网页全屏→窗口全屏→常态）；**Esc 在影院态先退影院**（顶栏已隐，Esc 是主出口，
  不许直接退脚本）；`controls.refreshFullBtns` 同步两键激活态（跨 slide 全量扫，同 `refreshMuteIcons` 体例），
  由点击/`fullscreenchange`/按键三处驱动。
- **测试提速（用户实报「测试慢耽误进度」）**：实测全量 56 场景 **≈2m15s**，且**并发 2 与 3 无差**
  （CPU 受限，提并发只增解码争抢、白担假红风险）⇒ 并发度改为环境变量 `HARNESS_CONC`（默认仍 2）；
  新增 `npm run case`（即 run-harness，配 ONLY 用）。迭代期**定向跑**单场景 **1.5～9.5s**，全量只在提交前跑一次。
- **测试**：build/lint/check（含 tsc）/单测 262/全场景 56 全绿。smoke 9→11 断言：`webfs-hides-ui`
  （点网页全屏 ⇒ 根带 `.acsv-cinema`、且 dock/顶栏/侧栏 `offsetParent` 为 null）＋ `webfs-esc-exits`
  （Esc 只退影院、不误退脚本）。**反跑实证**：把 `.acsv-dock` 从隐藏名单摘掉 ⇒ `webfs-hides-ui` 转红；还原 ⇒ 绿。
  注：窗口全屏走 Fullscreen API，**无头环境无用户激活、`requestFullscreen` 不可靠**，故只钉影院态与退出路径。

### 0.9.196（2026-10-07）· 播放器打磨（三）：简介 UI（案 A：标题下内联 + 展开）

- **由头**：用户裁决「简介展开＝案 A」（预览稿 `player-bottombar.html` 内已记裁决）。数据层 0.9.194 已打通
  （`resolve` 读 `description` → `foldBr` 折行 → `item.desc`），本批只做渲染与交互。
- **修法**：slide 信息区在标题下挂 `.acsv-descwrap`：`.acsv-desc` **2 行 clamp** + 「展开简介 ▾」；
  展开后限高 34vh 可滚（竖刷是全屏单条，不能让简介吃掉画面），文字带投影保证浅色画面可读。
  **时序**：`desc` 要等 douga/info 回包才到，故容器先建、经 `slide._descSync` 由既有 `onHomeResolved`
  （解析完成中枢）统一回填——与作者行/日期同一条链；幂等（同文不重绘，保住展开态）；无简介整块不显示。
- **测试**：build/lint/check（含 tsc）/单测 262/全场景 56 全绿。deeplink-ac 8→10 断言：
  `deep-desc-ui`（简介渲染到标题下且有展开键）＋ `deep-desc-toggle`（点开 → open + 收起文案；再点复位）。
  **反跑实证**：摘掉 `onHomeResolved` 里的 `_descSync` 调用 ⇒ 两条转红；还原 ⇒ 绿。
- **流程改进（用户实报「测试慢影响进度」）**：迭代期改用**定向跑**——`node test/run-harness.mjs <场景名,...>`
  （ONLY 支持逗号列表，传未知名会报错退出），实测单场景 **1.5～9.5s** vs 全量 56 场景约 40s；
  全量只在**提交前跑一次**。

### 0.9.195（2026-10-07）· 播放器打磨（二）：底栏改用 A 站原生图标（含状态切换）

- **由头**：用户裁决「底栏图标优先用原生的」（对齐 README 早已成文的「优先原生、内置 SVG 仅作回退」——
  底栏此前是**唯一仍全用自绘 SVG/文字**的操作区）。预览稿 `docs/preview/player-bottombar.html` 经确认
  （同时裁决：简介展开=案 A、画中画=换条自动关、弹幕设置=照原生两 tab 全做、音量滑杆=竖条）。
- **真机取材**：A 站播放器控件图标是**内联 SVG data URI**（无外链）；用内置浏览器从 www 视频页
  直接抓取并**程序化落盘写入源码**（不经手抄——手抄 base64 前两轮已翻车两次）。
  本轮取到：**播放三角（`bfq_bf`）/ 暂停双竖条 / 「弹」字形**。音量与弹幕开关的原生件**不随状态换图**
  （靠类名着色），故只取单枚。
- **机制收口**：mask 装载自 `rail.js` 的 `railBtn` 内联段**抽出为 `ui.mountIcon(btn, icon)`**
  （右栏/底栏共用同一套「CSS mask 借形状、颜色由 color 控、失败回退内置 SVG」）；新增
  `ui.setBtnIcon(btn, icon)` 供运行时换状态图标（只换 `--acsvg-icon`，保住颜色策略）。
  **注意**：`rail` 的 `<img>` 分支（小视频站 PNG）**留在 rail.js**——那条属图片禁令白名单内的图面，
  底栏不需要，故不收口到 ui.js（避免把 ui.js 拉进图片白名单）。
- **落点**：`styles.js` 新增 `PLAYER_ICONS`（play/pause/danmaku，各带 `svg` 回退）；
  `controls.js` 的播放键与弹幕键改走 `mountIcon`；`player.js` 的播放/暂停切换改走 `setBtnIcon`。
  **踩坑留档**：`PLAYER_ICONS` 引用 `ICONS`，**必须在 `ICONS` 定义之后**声明（首版插在其前 →
  全场景崩在 `reading 'play'`；已挪到图标表之后）。
- **测试**：build/lint/check（含 tsc）/单测 262/全场景 **56** 全绿。play-deep 51→55 断言：新增
  `play-icon-native-mask` / `dm-icon-native-mask`（mask 是 `data:image/svg+xml` 原生件，非自绘）与
  `play-icon-swaps`（点播放键 → mask 形状随播放态更换）。**反跑实证**：还原旧 `elHtml(..., ICONS.pause)`
  ⇒ 三条全红（`before="" after=""`）；还原 ⇒ 全绿。
  另注：该场景**不能用 Space 驱动**——抽屉开着时焦点在评论输入框，Space 被输入框吃掉（改用点击播放键）。

### 0.9.194（2026-10-06）· 播放器打磨（一）：简介数据打通 + 三倍速 + 分区加载提示 + mode 6 修正

- **简介打通**（数据层；展示 UI 待预览确认后另批）：`douga/info` 顶层 `description` 就是视频简介
  （HTML 含 `<br/>`，§3 实测）。`appapi.resolve` **一直在取这一发回包**，却只读了 videoList/计数/
  createTimeMillis/user，**没读 description**。修法：读它 → 用新抽的契约件纯函数 `foldBr`（`<br>` 折
  换行，与榜单卡 0.9.64 同口径；`panelitem` 原有的两处内联折叠一并收口过来）→ 落 `item.desc`；
  契约 `ITEM_FIELDS.play` + `PlayItem` typedef 加 `desc`。harness 直挂缝（`api.refreshItem`，本就
  镜像 resolve 的 up/date）补同口径一行，使该字段在 harness 可观测。
- **三倍速**：`CFG.rate` 加 `3`（一行；菜单/文案由该表驱动，无第二处名单、无校验钳制）。
- **分区页续页「加载中…」尾行**：旧实现续页在途**零提示**（只有"到底/失败"两种 tip），用户分不清
  "到底了"还是"卡住了"；广场列表早有完整三态。修法：`advance()` 发请求前落一行「加载中…」。
  **顺手修真 bug**：`drain()` 的结束提示原带 `if (!st.tip.textContent)` 守卫 —— 会被新落的
  「加载中…」挡住，使「已经到底啦」永不出现；改为**无条件写**（结束提示必须顶替在途提示）。
- **mode 6 逆向滚动修正**：真机取样（ac17784502 等）实证弹幕回包**存在 mode 6**，而画布
  `assignLanes` 原把"非 4/5 一律当 1"⇒ 逆向滚动被错画成普通左→右滚动。修法：mode 归一抽成顶层
  纯函数 `normMode`（4/5/6 保留、其余兜底 1），绘制加 mode 6 分支（左缘外→右缘外），时长/轨道
  按滚动族同款。
- **测试**：build/lint/check（含 tsc）/单测 **262**（+2 文件：`playitem.foldBr`、`dmcanvas.normMode`）
  /全场景 **56** 全绿。新增/改动断言 **3 条 + 复用 1 条**，**反跑实证 ×2**：① 还原 drain 旧守卫 ⇒
  `jx-all-end-tip` 转红（读到「加载中…」）；② 摘掉缝内 `item.desc` 一行 ⇒ `deep-desc-folded` 转红
  （`desc=""`）。另 `play-rate-3x`（展开倍速菜单须见 3.0x）。
- **如实记录**：① `resolve` 侧的 `desc` 写入**无 harness 直覆盖**（mock 直挂缝跳过 resolve，属
  README 自认的 harness 盲区）；`foldBr` 纯函数有单测、缝内同口径行有断言。② 分区页「加载中…」
  是**瞬态**（mock 即时回包）无可断言窗口，只能由「到底提示不被顶掉」这条回归断言间接守。
- **本批不做**（另行排期）：简介**展示 UI**、底栏原生图标、两级全屏、音量滑杆、PiP、进度条缩略图、
  弹幕设置面板、高级弹幕渲染——均按计划批次推进，形态类需先出预览。

### 0.9.193（2026-10-06）· 修：评论追加失败会清空整列表（失败分道 + 可重试 + 到底/加载尾行）

- **由头**：本轮体检（架构/体验/理念三路探查 + 自查）发现的高危项；用户过目预览
  `docs/preview/comment-drawer-states.html` 后确认。
- **病灶（已核实）**：`comments.js` 的 `loadComments` 失败回调**不分 append/首屏**一律
  `renderCommentTip`，而它先 `resetList` **清空已加载的全部评论**、只留一句**不可点击**的
  「评论加载失败，请重试」；且 `applyDrawerContent` 的重开判据 `!list.children.length` 被 tip
  节点占了坑 ⇒ **同一视频重开也不重拉**（只能切走再切回）。一次翻页网络抖动即毁掉整段已读评论，
  且用户无路可走。
- **修法**：
  ① **失败分道**：追加失败**不动已渲染列表**、末尾挂**可点**重试行（重试只续拉该页）；首屏失败
     给整块**可点**重试。
  ② **加载账本**：新增 `commentState.loadedSourceId`（首屏成功后落值），`applyDrawerContent`
     改判据 ⇒ 失败后同视频重开能重拉。
  ③ **失败闸门**：新增 `commentState.failPage`，>0 时 `canLoadMore()` 判假——重试行往往仍在视口
     内，不禁会反复自动重试成请求风暴；点重试清闸。
  ④ **尾行三态**（新 `.acsv-ctail`，复用既有 `acsv-spin` 关键帧）：触底**加载中** / **加载失败+重试**
     / **没有更多评论了**（旧口径「到底静默停」→ 出到底行，消除「到底了还是卡住了」的歧义）。
  三宿主（抽屉/行内/详情）共用管线，一并生效；楼中楼不受影响。
- **顺核·层叠**：尾行不会被评论输入框遮挡——输入栏 `.acsv-cinput{flex:none}` 是挂在抽屉上的
  **flex 兄弟节点、在流内**（非覆盖层），列表滚动区底=输入栏顶。Playwright 实测：`listBottom`
  2241 === `inputTop` 2241，尾行底 2227（留 14px）。唯一覆盖列表底部的是**表情面板**
  （`.acsv-emotpanel{position:absolute;bottom:57px}`，既有行为，仅"正在挑表情"时临时）。
- **测试**：build/lint/check（含 tsc）/单测 260/全场景 **56**（+新场景 `comment-fail` 9 断言；
  view-follow 78→79 补「到底尾行」）全绿。**反跑实证**：还原旧行为（追加失败即 `renderCommentTip`
  清列表）⇒ `cf-append-fail-keeps-list` 由 `items=2` 变 **`items=0`** 转红（连同 cf-first-page/
  cf-retry-ok/cf-end-tail 共 4 条红）；还原 ⇒ 全绿。失败桩手法=`comment/list` page>1 返回
  **rejected Promise**（`net.mockHit` 的 `Promise.resolve` 会把它变 rejected，mock 缝里唯一能造
  请求失败的方式）。

### 0.9.192（2026-10-06）· 架构减债：契约面类型检查扩面（route / state / viewreg）

- **由头**：架构减债轨道，接 0.9.188 的 tsc 试点。选定三件 = 被广泛消费 × 契约强 × 纯逻辑：
  `route.js`（`parseHash/parseRoute` 的返回形状被 views/player/playlayer 等消费）、`state.js`
  （21 消费者，中介 API）、`viewreg.js`（`registerView` 的视图定义=真契约）。
- **修法**：三件加 `// @ts-check` + JSDoc 契约：
  - `route.js`：`@typedef Route {active,mid,src,view,viewArg,viewKind}` + `parseHash/parseRoute @returns {Route}`；
  - `viewreg.js`：`@typedef ViewDef {id, build(必填), teardown?, resume?, suspend?, deep?, volatile?, dock?}`
    + `ViewDock`/`DockEntry` + `registry` 标 `Record<string,ViewDef>`；
  - `state.js`：`root/scroller` 标 `HTMLElement|null`、`commentDrawer` 标新 `CommentDrawer` typedef。
  均只加类型注解，**零运行时代码改动**。
- **测试**：build/lint/check（含 tsc）/单测 260/全场景 55 全绿。**反跑实证 ×2**：`route` 读不存在
  字段 ⇒ `TS2339 Property 'nopeField' does not exist on type 'Route'`；`viewreg` 注册缺 `build` 的
  定义 ⇒ `TS2741 Property 'build' is missing ... in type 'ViewDef'`；还原 ⇒ exit 0。
- **渐进扩面**：消费端（cards/rail/slide 等）仍暂未覆盖，按需后续加注解。

### 0.9.191（2026-10-06）· 架构减债：spinner 单源（ui.spinner()，7 处裸建收口）

- **由头**：架构减债轨道。审计发现 `el('div','acsv-spinner')` 在 **7 处**裸建（`player.js`×4 /
  `playlayer.js` / `slide.js` / `comments.js`），语义统一（仅「挂/撤转圈」，无宿主差异）= 第二份
  看着一样的实现。
- **修法**：`ui.spinner(inline)` 收口（同 errbox 范式）。`inline=true` 是评论列表内的**静态内联变体**
  ——`.acsv-spinner` 默认 `position:absolute` 靠 slide 的 `data-state` 显隐，列表内需复位为 `static`
  + 自适应上下留白。`playlayer`/`slide` 内原同名局部变量 `spinner` 改名 `sp`（避免遮蔽导入）。
- **测试**：build/lint/check（含 tsc）/单测 260/全场景 55 全绿。**纯重构零行为变化**——既有转圈相关
  断言（`spinner-recover` 6 / `play-deep` / `deeplink-*` / `hls-*` / `play-cold`）原样全绿；`grep`
  实证裸建收敛为 `ui.js` 一处、调用点 7 处全走 `spinner()`。
- **顺记（发现，非本批引入）**：连跑期间 harness 有一次单场景偶发失败，随后 3 连跑 + 完整 `npm test`
  全绿。本批是纯「元素创建路径」重构、不涉时序，判为既有抖动，未定位到具体场景，留观。

### 0.9.190（2026-10-06）· 修：评论头像框左侧被裁（评论行内边距 + 抽屉 380→412）

- **由头**：用户实报「显示头像框后，头像框左边会被遮挡一部分」，怀疑抽屉太窄。
- **定位（src/styles.js 量值核实）**：**与抽屉宽度无关**。头像是 50×50；头像框 `.acsv-cavframe` 是
  80×70 覆盖层、偏移 `(−15,−15)`（plaza 原生复刻值），**向左溢出 15px**；评论行 `.acsv-citem` 自身
  无左右内边距、`.acsv-drawer-list` 水平内边距 0 且是滚动容器（另一轴按规范被钳成 auto）⇒ 左 15px
  被裁。对照：同抽屉「相关推荐/列表」行自带 `padding:8px 12px` 故不裁；内联语境（`.acsv-frows`）
  宿主同样无内边距 ⇒ 一并裁。
- **修法**（用户裁决「评论行左右 16 + 抽屉加宽 32」；预览稿 `docs/preview/comment-avatar-frame-clip.html`
  经用户确认）：
  ① `.acsv-citem` 加 `padding:0 16px`（16 ≥ 溢出量 15；全语境统一修——抽屉/广场/关注/详情内联）；
  子评论 `.acsv-csub .acsv-citem{padding:0}` 保持不缩进（头像 30px、无框、原生亦不缩进）。
  ② `.acsv-relrow` 12→16，与评论行同基准（消 4px 缩进差）。
  ③ `CFG.comments.drawerW` **380→412**——正好补回左右各 16，**正文可用宽不变**（≈300px），不因
  修复变挤；同步两个派生阈值 `avoidW` 1140→**1170**、`avoidTopW` 1012→**1050**（各 +32，推导注释
  同步）；CSS 回退值 `var(--acsv-dw,380px)` 共 10 处同步 412（仅回退语义，JS 恒写实值）。
- **影响面**：私信抽屉 `.acsv-msgdrawer` 共用 `--acsv-dw`，一并加宽 32（同源，已声明）。
- **测试**：build/lint/check（含 tsc）/单测 260/全场景 55 全绿。play-deep 49→51 断言：新增
  `play-cmt-pad15`（评论行 padding-left ≥15）+ `play-cavframe-not-clipped`（框左缘不越行左缘；
  `comments.mockComments` 的 m1 加头像框，给 harness 一条能验「框不被裁」的真实路径）。
  **反跑实证**：摘 `.acsv-citem` 的 padding ⇒ 两条转红（`padL=0px`；`frameL=854 itemL=869`
  ——正是"框左缘越过行左缘 15px"的病身）；还原 ⇒ 全绿。

### 0.9.189（2026-10-06）· 换源：竖刷「推荐」源 selection/feed → 单列精选 singleColumn

- **由头**：用户裁决「用 singleColumn 替代现有推荐源」——**形态不变（仍全屏竖刷），只换数据源**。
  因不涉界面/版式，按硬规矩①**无需先出预览**（纯数据源替换）。
- **真机先行（2026-10-06 curl，同 APP 头；入档 docs/api-research.md §10.2）**：`POST
  rest/app/selection/feed/singleColumn` 免登录，`pcursor=` 首屏回
  `body:[{schema:"monkey_mountain",bodyContents:[…9 条]}]`、`pcursor:"2"`——**首屏即可含视频块**
  （非纯轮播），9 条里 8 条 `resourceType=2`；item 键
  `title/href/img[]/user{name,headUrl,userId}/visit{views,bananas,comments,danmakus}/channelInfo/duration…`
  与 selection/feed **同构** ⇒ 解析层可原样直吃。
- **修法**：`CFG.api.homeFeed` 改指 `/rest/app/selection/feed/singleColumn`，**解析层零改动**
  （`appapi.cardsOf` 的「carousels 丢弃 + resourceType=2 过滤」两源通用；`normalizeHome` 直吃）。
  **共用面**：分区页「全部」tab 经同一 `homeFeedFetch`，随换源一并生效（同源单源）。顺手加固
  `cardsOf`：body 非数组时返回空页（原实现会抛）。
- **测试**：build/lint/check（含 tsc）/单测 **260**（+2：新 `test/unit/feed-blocks.test.js` 钉聚合块解析）
  /全场景 55 全绿。**反跑实证**：摘 `cardsOf` 的 carousels 丢弃 ⇒ 新单测转红；还原 ⇒ 绿。
- **注**：harness 走 `__ACSV_MOCK_HOME__` 短路，**不覆盖真实端点解析**——本批端点证据=真机 curl
  复验 + 入档（api-research §10.2），非 harness。

### 0.9.188（2026-10-06）· 架构减债：契约面类型检查试点（tsc --checkJs）

- **由头**：用户裁定 A4 可做。项目全 JS，契约（playitem/panelitem 的条目形状）只靠注释 + eslint +
  单测守，**没有机器类型检查**；字段名漂移（"自产拼写"痛点）只能靠人眼或单测偶然覆盖。
- **修法**：**不改造项目、不写 .ts**——引入 `typescript`（devDep）+ `jsconfig.json`，用
  `checkJs:false` + 逐文件 `// @ts-check` **选择性开启**（只查被标注的纯逻辑/契约件，未标注文件仅
  被解析取类型、其内部错误不报）。试点首批：`playitem`（含 `Up`/`PlayItem` typedef + `@returns`）、
  `panelitem`、`imgurl`、`timefmt`、`uplook`、`nameval`、`pagekind`。`check` 链末追加
  `tsc -p jsconfig.json`（进 CI；CI 的 `npm ci` 会装 typescript，工作流无需改）；新增 `typecheck`。
- **tsc 当场抓到的两处真问题**（非笔误）：
  ① `timefmt` 的 `Date - Date` 算术（TS 不允许，需显式 `.getTime()`）——行为不变，改显式；
  ② `sv` 归一条目**不含** home 懒解析专属字段（resolving/videoId/channel/qualities/qIdx）——typedef
  据此把这 5 项标可选并注明「只 home 有」（契约事实，此前只存在于注释里的隐性约定）。
- **测试**：build/lint/check（含 tsc 步）/单测 258/全场景 55 全绿；timefmt 边界单测原样（`getTime`
  改写数值等价）。**反跑实证**：在 `playitem` 读一个不存在的字段 ⇒ `TS2339: Property 'nopeField'
  does not exist on type 'PlayItem'`、exit 1；还原 ⇒ exit 0——正是"字段名漂移"的机器防线。
- **渐进扩面**：后续新模块/契约件按需加 `// @ts-check` 并补 JSDoc；消费端（cards/rail/slide 等）暂未覆盖。

### 0.9.187（2026-10-06）· 架构减债：方向诊断升棘轮（check-direction 未登记即红）

- **由头**：架构减债轨。`check-direction` 自 0.9.117 起是「永远 exit 0 的非门禁」（V3 关闭时的
  选择：「永远不值得一座门」）；0.9.160 校准 `topbar→searchhist` 后在册 `KNOWN=[]` 清零、两口径
  均 0 条。
- **修法**：由「非门禁」升为**棘轮**——未登记反向边 >0 即 `process.exit(1)`，在册项带理由放行；
  `package.json` 的 `check` 链末追加该脚本（进 CI）。**不改判罚口径**（两条保守口径原样）——棘轮
  只对「未登记」判红，不重开"层定义"之争（V3 关闭的核心顾虑）。
- **为何此刻零成本**：在册清零 + 当前 0 条 ⇒ 开棘轮不改现有绿灯结果，纯防回归：将来任何新反向边
  = 需要一次裁决（修边 / 加设缝 / 登记入册），不再默默放过——补上 check-deps 规则⑤
  「无环 ≠ 方向正确」的缺口。
- **测试**：build/lint/check（图 238 边，含本棘轮）/单测 258/全场景 55 全绿。**反跑实证**：临时
  加一条反向边 `cfg.js→boot.js` ⇒ check-direction 报「未登记 1 条」并 exit 1；还原 ⇒ exit 0。
  `docs/dependency-audit.md` 补「0.9.187：方向诊断升棘轮」节。

### 0.9.186（2026-10-06）· 体验打磨：可访问性最小集（aria-label / 对话框语义）

- **由头**：体验打磨轨。审计「全程无 ARIA/role、抽屉浮层无对话框语义」。**为守硬规矩①**，本批只做
  **不可见**的无障碍属性——`title` 文本气泡属可见变化（悬停提示），另走预览，不在本批。
- **修法**：`ui.a11y(el, label)` 收口「title + aria-label 同源一处设定」（本项目按钮普遍已有 title
  作悬停提示；aria-label 让屏幕阅读器读同一标签，防两者漂移）。落点：
  - 顶栏图标按钮（返回/搜索/私信/更新/退出）；播放控制键（播放/连播/静音/全屏/弹幕/清晰度/倍速）；
    右栏操作键（赞/评/蕉/藏/享/关注/上下箭头）。
  - 评论抽屉（`slide.buildDrawer`）与私信抽屉（`imdrawer`）加 `role="dialog"` + `aria-modal="true"`
    + `aria-label`（纯属性，不改 DOM 形态/视觉/交互）。
  - `a11y` 只动无障碍属性，**不新增可见提示**（既有 title 原样保留——play.js 的 `[title="…"]` 选择器不受影响）。
- **测试**：build/lint/check（图 238 边）/单测 258/全场景 55 全绿。新增 5 断言：feed.smoke
  `a11y-topbar-im`/`a11y-topbar-upd`、play.js `play-a11y-drawer-dialog`/`play-a11y-ctl-label`、
  views.js `imview-a11y-dialog`（view-im / view-im-narrow 各一）。**摘修复反跑实证**：令 `a11y` 不设
  aria-label ⇒ 恰好这 5 条转红（smoke 7/9、play-deep 48/49、view-im 29/30）；`play-a11y-drawer-dialog`
  走直设属性、不受影响——反证了「a11y 收口」与「抽屉直设」两条路径各自成立。

### 0.9.185（2026-10-06）· 体验打磨：闪动时长单源 + 私信轮询可见性门

- **由头**：体验打磨轨起步。审计口径「反馈时值散落硬编码」——**结论基本失真**：`ui.toast` 早已
  默认 `CFG.time.toast`（1800），全仓无散落 toast 硬编码（评估把 imdrawer 的引用高亮闪动误读成
  toast）。逐点核后真正的问题只剩一处跨文件耦合 + 一处缺约定。
- **修法①（闪动时长单源）**：`imdrawer` 清 `.acsv-im-flash` 的 `1300` 与 `styles` 的 `1.2s` 动画
  分处两地硬编码——改一处忘另一处即描边残留或闪动被截断。收口 `CFG.im.flashMs=1200`：styles 动画
  与 imdrawer 清类（=本值+100ms 余量）**同源**。
- **修法②（轮询可见性门）**：后台标签不打扰——`imbadge.tick` 与 `imdrawer` 的 `listPoll`/`chatPoll`
  补 `if (document.hidden) return;`，与既有 followbadge/squarefeed/session/report 约定一致。
  **有意不门**：memberplaza 的 nav 注入定时器是有界重试（≤tries×retryMs）；input 的幽灵视频扫描
  后台仍要跑（hidden 标签页照出声音，需停非当前条）。
- **测试**：build/lint/check（图 238 边）/单测 258/全场景 55 全绿（badge-poll 23 / view-im 29
  原样）。**如实记录**：E2 的门禁与既有约定同款——那些门禁（followbadge/squarefeed）在仓内本就
  未单钉（followbadge 只暴露 poll，tick 的门禁无红绿断言），本批**不新增空心断言**，只保证既有
  场景零回归。

### 0.9.184（2026-10-06）· 架构减债：错误盒单源（errbox.js）+ playlayer 拆件（playgest.js）

- **由头**：用户裁决「架构减债 + 体验打磨」两轨；本批为架构减债第一刀——收口一处真实重复 + playlayer
  拆件（该拆件曾因「先不拆，下一批改动再一起拆」挂起于 0.9.178 审计，本批既有改动即"下一批"）。
- **病灶（重复）**：`player.js` 的 `showLoadError` 与 `playlayer.js` 的 `buildErr` 各建一份
  `.acsv-errbox`——同 class、同「文案 + 可选重试键」形态、同「点击先撤盒再重跑」出口纪律 = 第二份
  看着一样的实现，违「单源收口」硬规矩。
- **修法①（错误盒）**：抽 `src/errbox.js`（`errBox(host,msg,onRetry)` 唯一导出）收口盒体与重试键；
  宿主差异（player 重试前 `FeedStore.reset()` + 重挂 spinner、层内直接重跑 load）经 onRetry 回调注入
  ——盒体**不反向 import 任何宿主**（依赖方向：宿主 → errbox）。**边界**：`slide.js:27` 另有一只
  `.acsv-errbox`，是构建期常驻、由 `.acsv-slide[data-state=error]` 驱动显隐、重试走 stopPropagation
  + 重挂 attachVideo（不撤盒）的**结构件**，生命周期不同，有意不并入（同 imgload 白名单例外登记法）。
- **修法②（拆件）**：playlayer.js 的层内滑动手势（`onWheel`/`onTouchStart`/`onTouchEnd` + gest 累计态）
  迁 `src/playgest.js`——`bindLayerGestures(body, step)` 绑定滚轮/触摸上下滑并返回解绑函数（随层拆）；
  `step` 由宿主注入（`playlayer.playStep`）。playlayer 501→451 行。
- **图的同步**：README mermaid +errbox 节点（基建层）/ +playgest 节点（播放层）+ 三条边（player→errbox、
  playlayer→errbox、playlayer→playgest）；`check-direction.mjs` INFRA +errbox.js（基建件归类，同 ui.js）。
- **测试**：build/lint/check（图 238 边）/单测 258/全场景 55/direction 全绿。错误盒为**纯结构收口，DOM
  形态不变**——既有断言（play-deep 47 / deeplink-miss miss-errbox·miss-retry / hls-sealed 错误盒可见 /
  hls ovl errbox）原样全绿 = 零行为漂移；`grep -l acsv-errbox src/` 实证构建点收敛为 errbox.js +
  slide.js（后者登记为结构件例外）。手势搬迁做**代码行多重集比对**：旧/新各 27 行，唯一差异为两处签名
  注入 `step` 参数（同 0.9.163 imageUrlOf 签名调整先例）；layer-list 65 断言原样全绿。

### 0.9.183（2026-10-06）· 连播进层：非推荐板块（播放层）播完自动下一条

- **由头**：用户实报「连播对非推荐板块不生效」。定因：连播的唯一自动出口在 player.js
  `onEnded`，其中 `!isOvlSlide(session.slide)` 豁免把播放层会话全部挡在门外——这是 0.9.78
  的写法，当时层内确实没有"下一条"；0.9.170–174 层内已有 walk/list 会话（相关池/来源
  列表，`stepNext` 与手动 ↓ 同路），连播却没接过去。推荐板块=主竖刷不经过播放层故正常，
  其余板块（分区/广场/搜索/榜单/收藏/空间/动态卡片）全走播放层 ⇒ 开关在层内是 no-op。
  连带发现开关切换只扫 `scroller` 里的 video，层内视频 loop 不随开关走（漂移）。
- **修法**：① `onEnded` 层内分支接 `playStep(1)`（walk/list 自动下一条；single 由 loop
  兜底不会走到）；② loop 落点收单源 `playback.applyLoop`——attach（`hooks.initVideo`
  改传 session）与开关切换两处共用；③ 开关遍历扩到全舞台（root）：层内 slide 挂在视图
  体下不在 scroller 里；④ 层内 **single 会话（动态视频卡片）没有下一条 → 连播开着也只
  循环**（"没有下一条可连时回落单条循环"），谓词经 state.js `setOvlNoNext` 注入
  （playItem 同型中介：playlayer→slide→controls 有环，消费方零新模块边）。
- **测试**：layer-list 新增 ⑤ 连播进层块 + ④ 单条连播语义（共 6 条新断言：
  ll-single-loop-always/ll-single-ended-noop/ll-auto-loop-off/ll-autonext/ll-auto-loop-on
  等）——**反跑实证**：摘 onEnded 层内分支 ⇒ ll-autonext 红；摘开关根级遍历 ⇒
  ll-auto-loop-off 红；摘 applyLoop 的 single 豁免 ⇒ ll-single-loop-always 红。
  全链 build/lint/check/单测 258/全场景 55 绿。

### 0.9.182（2026-10-06）· hls 装载第三层：Blob 脚本（页面 world）——实机「秒拒」形态补缺

- **由头**：0.9.181 交付后用户真机复测仍「视频加载失败」；新读数形态变化——`hls.evalMs` 9→1
  （构造期即失败，「秒拒」），即 0.9.181 的「同 realm 取数」只治「编译了取不回」，治不了
  「根本不让编译」。**处置**：已推的 22 个提交整体撤回（远端 main 退回 `8616427`＝v0.9.166
  发布点、CI 取消、未发任何 release），修复验证过再推。
- **修法**：装载补第三层 `loadViaBlob`——内嵌串 / CDN 文本先走 eval 收编（0.9.181 原样），
  拿不到类时改以 **Blob URL + `<script>` 注入**执行：脚本在**页面 world** 跑，绕开 TM 沙箱对
  Function/全局语义的干扰；onload 后经 `pageWin()`（unsafeWindow，0.9.30 同款跨 world 读法）
  读回类；超时/onerror/读空按失败下沉 CDN。与 IM SDK 装载同机制（0.9.41 起该机制在本环境
  实证可用；依赖页面 script-src 含 blob:，A 站满足）。分层落点全部打点（evalOk/evalNoClass/
  evalNoMse/blobOk/blobNoClass/blobErr/blobTimeout/blobNoUrl + evalErr 异常摘要）。
- **顺手补仪器**：stats 镜像带 `ver`（构建期 `__ACSV_VERSION__`）——「装的到底是哪一版」从此
  随读数自证（0.9.180/181 两轮靠追问才确认）。
- **测试**：新场景 `hls-blob`（`setEvalOff` 缝模拟实机 eval 失效）——blob 层装载成功 /
  blobOk 计数在场 / **未下沉 CDN**（cdnIdx 缺席）；**反跑实证**：摘 blob 层 ⇒ 后两条转红
  （`cdnIdx=0`，CDN 层接走）。hls-lazy / hls-probe / hls-sealed 照旧全绿；全链 build/lint/
  check/单测/全场景全绿。真机验收口径：装 debug 版开推荐视频应能播；读数看 `ver` +
  `hls.blobOk`/`attach.hls`。

### 0.9.181（2026-10-06）· hls.js 装载取数修 world/UMD 双坑——「视频加载失败」定因

- **由头**：0.9.180 封印原生回落后用户实报「新版本视频加载失败」；按 README「冻结归因实验」
  让用户换 debug 版读数定因（`hls.lazyEval:1`、`hls.evalMs:9`、`attach.cdnFail:2`、
  `session.dispose:8`；小视频直链不经此路径故正常——范围完全对上）。
- **病灶**：`evalMs=9` 是真实解析耗时（CSP 秒拒是 0ms 级）——**编译执行了，但类取不回来**。
  即 0.9.164 hls 改懒 eval 起，TM 实机装载一直静默失败：旧版回落原生 HLS 管线「看似能播」
  （这正是用户冻结复现的真身——原生管线最小化往返冻死），0.9.180 封印后暴露为错误态。
  两个叠加的坑：①**world 分裂**——TM 隔离沙箱下 `new Function` 的全局落点与脚本 `window`
  未必同一对象（0.9.30「window.ImSdk 恒 undefined」同款），编译完回头读 `window.Hls` 落空；
  ②**UMD 逃逸**——hls.js 的 rollup UMD 在页面存在 CJS `module/exports` 或 AMD `define` 时走
  注册分支（`module.exports=i()` / `define(i)`）不落全局（反跑实证：三标识符齐备时
  `module.exports` 变 function、全局无 Hls）。
- **修法**：`hls.js` 新 `evalHlsSource()`——编译体包一层 wrapper，形参把 define/module/exports
  遮成 undefined（UMD 必走 `globalThis.Hls=` 分支）；取数尾拼进同一段被编译源码用 return 取回
  类（**同一 realm 内取回**，绕开 world 读），另 globalThis/module/exports 三臂兜底；取回后
  回填 `window.Hls`（脚本 world 快路径命中）；内嵌串与 CDN 文本两条路同走此函数；异常摘要
  记入 `hls.evalErr`（debug 打点）。
- **测试**：新场景 `hls-probe`（页面预置敌意 AMD define + CJS module/exports）——装载成功 /
  `define` 未被调用 / `module.exports` 未被改写；**反跑实证**：还原旧取数（裸 `new Function` +
  window 直读）⇒ 两条转红（`done=reject`、`cjs=function`）。`hls-lazy`/`hls-sealed` 照旧全绿；
  全链 build/lint/check/单测/全场景全绿。**真机验收口径**：装 debug 版开推荐视频，stats 应见
  `attach.hls` 增长、`attach.cdnFail` 不再增长、`hls.evalErr` 无值。

### 0.9.180（2026-10-06）· 封「hls.js 不可得 → 原生回落」——冻结专项防线补漏

- **由头**：用户复现最小化往返冻结后裁决「直接封原生回落，如果没记错的话，冻结专项已经有结论，
  原生不可靠」（远端 v0.9.14 release「最小化往返冻结专项」定案：Edge(Chromium) 原生 HLS 管线
  （Media Foundation）后台往返后画面冻死、音频正常；hls.js 路径实测 8 轮零冻结）。
- **病灶**：0.9.164 hls.js 改懒 eval 后，`ensureHls` 失败（内嵌串缺失/编译被拒——如环境禁 eval——
  且 CDN 逐源兜底全灭）时，`session._attachSource` 的两处旧回落（`attach.cdnFail`/`attach.unsupported`）
  把 m3u8 直接交 `video.src`「赌一把原生解码」——在 Edge 上即静默退回冻结专项定案的问题管线，
  且全程无痕（编译错误被空 catch 吞掉、打点仅 debug 可见）。
- **修法**：两处回落收口到新 `session._failNoHls(key)`——hls.js 不可得一律 **error 态**
  （「视频加载失败」+ 重试；重试/换条重开会重走全链），**不再**把 m3u8 交给原生管线。原生 HLS
  只剩两条显式合法路：无 MSE 环境（iOS Safari 类，本来走不了 hls.js）与 `exp.native` 强制对照
  开关（仅 debug；README 归因表第 7 轮口径不变）。配套测试缝：`testHook('hls').setFail(v)`
  （仅 debug）令 `ensureHls` 一律拒绝。
- **测试**：新 harness 场景 `hls-sealed`（debug 构建）——playInfo 桩改吐同源 m3u8（resolve 链
  的非 m3u8 守卫按 URL 放行 ⇒ `cap.hls` 保持 true；清 `__ACSV_MOCK_DIRECT__` 防被直挂缝接走）→
  `setFail` 令 hls.js 不可得 → 播放层 home 条目深链挂载 ⇒ 5 断言：深链开层 / 落 error 态 /
  **video 无 src**（m3u8 未落原生管线）/ 错误盒可见（offsetParent）/ `attach.cdnFail` 计数在场。
  **反跑实证**：session 还原旧回落 ⇒ 三条转红，证据行 `src="…/nope-404.m3u8"`（m3u8 真被交给
  `video.src`）。全链 build/lint/check/单测/全场景全绿。
- **顺核**（本地，未改码）：产物内嵌串与 `node_modules/hls.js/dist/hls.min.js` 逐字一致
  （415,250 字符）、`hls-lazy` 场景 8 断言全绿——懒加载链本身无病，本批只封其失败态的出路；
  用户复现机读不到 `acsv-stats`（release 构建无打点，`acsv-exp` 为 null 已排除实验开关残留）
  ⇒ 后续归因须换 debug 构建按「冻结归因实验」读数。

### 0.9.179（2026-10-06）· 删退役死代码：舞台游走链（startChain + related 内容源）

- **由头**：用户裁决「把退役的死代码删了」（0.9.178 审计结论：该链 UI 不可达、仅剩兜底）；
  拆件（playlayer 496 行）按用户口径「先不拆，下一批改动再一起拆」本批不动。
- **退役判据**：三个出口相继改道后无人可达——0.9.170 分区页卡片改 `openPanelItem`、0.9.172 舞台上
  的抽屉行改 `layerOpen`（开层保活）、0.9.174 层内行改 `pushLevel`（压级）；`startChain` 只剩
  「播放器未挂载」兜底，而 boot 恒加载 playlayer ⇒ 理论不可达。层内的「随机游走 / 列表顺序」二选一
  **不走这条链**（用 `batch`/`seed`），故删除对在线行为零影响。
- **删除清单**：`relatedapi.js`：setChainStarter/startChain/resetPump（零消费）；`player.js`：
  setChainStarter 注册整块（含注释，1177 字节）+ 三处 ensureBaseSource 调用；`api.js`：
  `import { batch as relatedBatch }`、setSource 的 related 分支、ensureBaseSource 定义、
  feed(tipId)→feed() 分派；`feedstore.js`：fetchMore 的 tipId 计算与传参；`topbar.js`：seg 的
  `src !== 'related'` 特判；`reldrawer.js`：第三落点 startChain 与 import（行点击收敛为两落点：
  层内压级 / 层外开层；播放器不可用时静默）。保留 `batch`/`seed`/`pickFresh`/`relatedPageOf`/
  `relatedItemOf`/`panelItemOfDv`/三缝/cfg 端点/设置项 relSequential。
- **证据**：零引用证明——`grep -rn "startChain\|setChainStarter\|resetPump\|relatedBatch\|tipId\|
  ensureBaseSource" src/` 仅剩历史注释（无代码命中）；**图边 237→235**（api→relatedapi、
  player→relatedapi 两条随删消失，check-deps 绿）；入口行为仍被场景钉住（`rel-drawer` 的
  `rel-row-opens-layer`/`rel-stage-kept` = 舞台行开层保活；`layer-list`/`rel-layer` 压级/弹回全量）。
  全链 build/lint/check/单测 258/**52 场景全绿**（断言数与删除前一致）。
- **顺记**：0.9.167 泄密门禁批状态核实——**早已随 0.9.168 混批入库**（check-no-leak.mjs + CHANGELOG
  节 + check 链第三位；`npm run check` 尾行「两份接口侦察文档确认在仓外」在案），本次无需动作；
  附记 0aef955（审计清收批：单源收口两处 + 过时注释/文档全量勘正）。

### 0.9.178（2026-10-06）· 抽屉页签：开默认评论（不记忆）+ 换条不切页签（用户实报两条）

- **由头**：用户实报两条——①「视频展开抽屉应该是默认打开评论，而不是记忆上次」（实测重开落在
  上一次的页签上）；②「视频抽屉点击了相关推荐，向下刷应该跟随当前栏目，而不是切回评论」。
- **病灶**：①`relDrawerClose` 只复位「相关推荐」页签（0.9.167 写的），0.9.174 新增的「列表」页签
  漏网 ⇒ 在列表页签上关抽屉，下次打开就是列表（记忆）。②**每换一条都走 `openComments`**，而
  `overlayOpen` 幂等会先收旧层 ⇒ `closeComments` ⇒ `relDrawerClose` 把页签打回评论 ⇒ 用户正在
  看的「相关推荐」被切走（层内 ↓/滚轮与舞台滑动同病——`player.setActive` 也是 openComments）。
- **修法**：①`relDrawerClose` 改为"任何非评论页签都复位"（评论=抽屉默认页签；列表面签在场但不激活，
  第三播放器语义不变）。②`comments.js` 抽出 `applyDrawerContent`（openComments 与新增的
  `retargetComments` 共用）：**retargetComments 不碰浮层栈/槽位**——抽屉已开时只换源（kind/输入条/
  相关推荐同步/评论列表重载），页签与渲染状态原地保留；未开时回落 openComments。playlayer.swap 与
  player.setActive 两处"跟着换条"改走该缝。
- **测试**：`layer-list` 54→55 断言：③e-① 进列表播放器（列表页签激活）→ 关抽屉 → 重开 ⇒ 评论页签
  激活且 `listShown===true`（列表页签在场不激活）；③e-② 停在相关推荐按 ↓ ⇒ 抽屉仍开、**仍在该页签**、
  且 `rid` 已跟到新视频。**反跑双证**：relDrawerClose 退回只复位 rel ⇒ ③e-① 红（重开落在列表页签，
  listOn=true）；swap 退回 openComments ⇒ ③e-② 红（relOn=false，页签被切回评论）。全链 build/lint/
  check/单测 258/52 场景全绿。

### 0.9.177（2026-10-06）· 弹回第 1 级一律收「列表」页签（用户实报第三洞）

- **由头**：用户实报「点左上角返回键返回原视频抽屉也还是会有列表」——0.9.176 修的弹级路径里留了
  一条"上级会话是列表就重新显示列表页签"的分支（为早先未封顶的嵌套设想写的）；而 0.9.175 封顶后
  上级恒为第 1 级，且**第 1 级的会话本来就常常是列表**（榜单/搜索/我的，以及分区开「按列表顺序」
  时是网格列表）⇒ 弹回时页签又亮、还挂着上级那份列表。
- **修法**：PlayEscape 的弹回分支改为**无条件 `relDrawerHideList()`**（收页签 + 清 lcache + 复位
  评论页签）再 `relDrawerListMode(false)`。至此「列表」页签**只可能在第三播放器（级别 2）里出现**：
  开它=pushLevel（显示）、关它=弹回/退层（收起，0.9.176/177 两处）。
- **测试**：`layer-list` 48→49 断言：③c 段补 `ll-path2-pop-no-list`——**抽屉开着**时点返回键弹回，
  断言抽屉仍开且 `listShown===false && listOnly===false`（用户原状态复现）。**反跑实证**：还原旧的
  "上级是列表就再亮"分支 ⇒ 该断言红（listShown=true、8 行陈列表在场）。全链 build/lint/check/
  单测 258/52 场景全绿。

### 0.9.176（2026-10-06）· 顶栏「向左返回」接级别弹回 + 列表页签随层拆（用户实报两洞）

- **由头**：用户追问「分区》视频》相关推荐列表》分区，为什么关闭列表还是不会回到视频」并补一句
  **「我点的是左上角返回键」**——即 0.9.174 的级别栈只接了 Esc 链，顶栏「向左返回」仍直连
  `backFromOrigin()`（一步回来源视图、整层拆掉），列表播放器一按就回分区。
- **修法**：`player.js` 的 topbar 注入改包装——`onBack: function () { if (playEscape()) return;
  backFromOrigin(); }`（与 Esc 第二级同源；单级时行为不变）。**一处改动零新依赖**（player 已同时
  import views 与 playlayer）。
- **测试**：`layer-list` 41→46 断言：新增 ③c 段——分区点卡 → c 开抽屉 → 相关推荐 → 点行（levels=2）
  → **点 `.acsv-back-btn` ⇒ levels=1 且 id=入口视频**（弹回原视频而非回分区）→ 再点返回键才回来源
  （view=jingxuan）。**反跑实证**：返回键还原成直连 backFromOrigin ⇒ `ll-path2-back-pop` 红
  （层直接拆掉、levels=0——用户现象当场复现）。全链 build/lint/check/单测 258/52 场景全绿。
- **同批第二洞（用户实报）**：「再次点击分区的视频时，展开抽屉会出现列表栏」——teardown 只解了
  `listOnly`，**没收起「列表」页签**：`tabL` 的 display 与 `lcache` 留着，下次进层开抽屉就是上次
  那份陈列表。修：teardownPlayView 先 `relDrawerHideList()`（收页签 + 清缓存 + 复位评论）再
  `relDrawerListMode(false)`。
- **测试（合计 46→48 断言）**：③c 段返回键弹级（见上）；③d 段**泄漏回归**——进列表播放器后退层，
  再从分区点卡进层开抽屉，断言 `listShown===false && listOnly===false`（无陈列表）。**反跑实证**：
  摘 teardown 的 relDrawerHideList ⇒ `ll-leak-no-listtab` 红（listShown=true、8 行陈列表在场）。
- **清点**：能离开播放层的出口全数对齐级别栈——Esc ✓、顶栏向左返回 ✓（本次）、✕ 退出脚本=退出
  整个脚本（语义如此，不动）、dock/浏览器前进后退=显式换界面（layer 是 deep 界面，其来源链由
  route 层管；不进级别栈）。

### 0.9.175（2026-10-06）· 列表播放器封顶：只管自己那份列表，相关推荐入口收起（防无限套娃）

- **由头**：用户裁决「第三个播放器只管自己的播放列表，相关推荐或者合辑分P不显示，防止用户无限开
  视频套娃，逻辑不好做」——0.9.174 的级别栈理论可无限压级（在第 2 级里再点相关推荐 → 第 3 级…）。
- **修法**：①`MAX_LEVELS = 2`：`pushLevel` 超限即静默吞掉（按"已处理"返回，不落回开层兜底）。
  ②`reldrawer` 新 seam `relDrawerListMode(on)`：列表播放器（级别≥2）里抽屉**只留评论 + 列表**——
  相关推荐页签收起（正看着它则弹回列表页签），退出列表播放器按最近一次 kind 判定还原
  （`_relByKind` 记住 relDrawerSync 的结论）；`relDrawerSync` 显隐判定叠加 listOnly 门。
  ③接线：pushLevel 开（on）、playEscape 回第 1 级（off）、teardown（off）。
- **测试**：`rel-layer` 31→34 断言——进列表播放器后 `listOnly && relTabShown===false`；
  **套娃硬测**：对被隐藏的相关列表派发合成点击（display:none 元素仍可派发事件走委托）⇒ levels 仍
  为 2；弹回第 1 级后 `listOnly===false && relTabShown===true` 还原。**反跑两连全红**：摘
  relDrawerListMode(true) ⇒ rl-rel-tab-hidden 红；摘 MAX_LEVELS 上限 ⇒ 合成点击真压出第 3 级，
  rl-pop-parent/rl-parent-resume-slot/rl-list-tab-hidden/rl-layer-exit 连带 4 条红。全链
  build/lint/check/单测 258/52 场景全绿。预览 ⑥ 段同步（列表播放器只有评论+列表两个页签）。

### 0.9.174（2026-10-06）· 播放层「级别栈」：相关推荐行 = 开列表播放器，关闭即回原视频

- **由头**：用户实报「太反直觉了——打开分区》视频》点击相关推荐》关闭相关推荐》分区，原来播放的视频也
  没有了」：0.9.173 的「点相关行=同级别换轨」把当前视频顶掉了，Esc 又直退来源。用户裁决：这类
  自带列表的视频（相关推荐；未来合辑/分P）该**开第三个播放器**——关闭它回原来那条视频；打开它时
  **默认展开抽屉展示当前列表**。三问定案：①抽屉新增第三 tab「列表」；②只留 Esc 弹回；③进度先做
  级别内恢复过渡（后续接官方观看历史做全局断点续播）。
- **修法**：①**级别栈**（playlayer）：单级状态收进 `levels=[{item,sess,hist,hIdx,queue,at}]`，栈顶
  即当前播放器；`pushLevel`（抽屉相关行）= 存档当前级（含播放秒数）→ 压新级（会话=那份 10 条）→
  挂新 slide → **自动开抽屉+切「列表」tab**；`playEscape`（级别>1 才弹）= 存档 → 弹 → 还原上级
  会话/历史 → 挂回上级视频并经**既有续播槽**（`slide._resumeAt` → attachVideo 转 `session.resumeAt`，
  playing 后 seek；不自造第二套 seek）恢复进度。②**Esc 三级链**（input.js + player 注入
  `api.playEscape`）：浮层（抽屉等，非 view 层）→ 播放层级别 → 视图层退出。③**抽屉第三 tab**
  （slide.buildDrawer 加 tabL + 第三平级容器 listList；reldrawer 三态 showTab + 列表行渲染 +
  三 seam `relDrawerShowList/SyncList/HideList`；行点击=**列表内跳转**（relatedapi.pickInLayer →
  playlayer.pickInLevel，同级别换条不压级）。行形状统一 `{id,title,cover,dur,like,up}`（本轮=相关
  推荐由 cache.dvs 供；合辑/分P 未来同形）。④顺手修正：推荐 tab 尾部文案改口（旧文"下一条随机抽"
  与 0.9.173 语义不符）。
- **顺抓真缺陷（非本批新代码）**：`appapi.resolve` 的「非 m3u8 直链守卫」站在 `applyQuality` **之前**
  ——那一刻 `item.urls` 还是空数组，守卫恒不触发（0.9.168 埋的位置错；舞台路径被 api.js 的 mock 分支
  掩盖，池条目才露馅：webm 被喂进 hls.js/MSE，重挂即 error）。修：守卫移到 `applyQuality` 之后。
- **测试**：`rel-layer` 21→31 断言：点相关行 → levels=2/parentId=锚（**压级**）→ 抽屉自动停「列表」
  tab（listShown/listOn/listRows=10/listIdx=0）→ 点列表第 3 行 = 列表内跳转（levels 不变、listIdx=2）
  → Esc 关抽屉 → 再 Esc **弹回上级**（id=锚 + 列表 tab 收起）→ 续播槽转交=5（harness 池条目直链被
  https 升级打不通，故断言槽位转交+直挂不变式；真机复验 seek 落地）→ 再 Esc 退层。**反跑三连全红**：
  退回同级换轨 ⇒ 6 条红；摘 playEscape 注入 ⇒ rl-pop-parent 等 5 条红；摘直挂守卫 ⇒ rl-parent-direct
  红（hls=true + MSE blob 实锤）。全链 build/lint/check（deps 236 边）/单测 258/52 场景全绿。
- **遗留**：合辑/分P 未接（接口未实测，行形状与 push 入口已就位）；全局断点续播（官方历史进度）
  留待后续批。
- **勘正注记**：三问②「只留 Esc 弹回」在 0.9.176 扩充——顶栏「向左返回」同源弹级；0.9.175 另封顶
  套娃深度 2 级（列表播放器内收起相关推荐页签）。

### 0.9.173（2026-10-06）· 层内会话化：搜索/榜单按结果列表浏览 + 右栏 ▲▼ + 分区二选一

- **由头**：用户裁决「搜索、榜单界面的 playlayer 做支持按结果列表滑动浏览吧，还有加上右栏上下切换
  的按钮，分区也没加这个按钮。这样一来，仅播放单条就只剩动态里的视频卡片了」+ 三连问答定语义
  （①列表到头按源分治：搜索/榜单停、分区续拉；②层内点相关行=换成那份 10 条列表、顺序走到头停；
  ③接全部有序来源；④**分区保留「随机 / 列表顺序」二选一**，设置项 relSequential 不退役）。
  **勘正注记**：其中「②层内点相关行=换成那份 10 条列表、顺序走到头停」已被 0.9.174 推翻——改为
  **压新级别开列表播放器**（关掉即回原视频）；关注视图「有下一页续拉」口径亦修正为**单条**。
- **修法**：playlayer 的「↓ 下一条从哪来」收口成**会话三态**（single/walk/list）——
  `single` 单条：不出箭头、↓ 静默（**只由来源显式声明**：动态里的视频卡片）；`walk` 相关池：
  ↓ 从池抽（随机；设置开=整批队列），**缺省态**（深链/刷新）+ 分区默认；`list` 来源结果列表：
  ↓ 顺序步进、尾部问 `more()`（分区/我的/关注提供；搜索/榜单不给）无则停 + 「已经是最后一条」。
  ↑ 一律历史回退，且**历史格随身带会话快照 {item,sess}**——跨轨（跳相关行）回退连列表下标一起
  还原（首轮 harness 抓到 idx 不同步的真缺陷）。**右栏 ▲▼**：非单条会话随 slide 建（复用
  styles.js 既有 .acsv-arrows/.acsv-arrow 样式，零新增样式值），首条藏 ▲、不可续拉的末条藏 ▼；
  点击与 ↓/↑/滚轮/触摸同源（rail.buildSideRail 的 goTo 支持 {up,down} 双形态）。**上下文由来源给**：
  `openPanelItem(pi, ctx)`（cards 透传；rowOf/gridCardOf 带可选 openCtx）——搜索（结果序、停）、
  榜单（行序、停）、我的（收藏经 adminTab/历史自有 loader，都接 more 续拉）、关注视图（动态里的
  视频卡片 = 显式单条）、分区（**设置二选一**：关=walk 随机 / 开=网格顺序 + more 续拉下一页）、
  抽屉相关行（relatedapi.panelItemOfDv 出新缝：换成那份 10 条列表）。
- **测试**：新场景 `layer-list`（32 断言）：榜单行进层=列表会话（锚 489500/箭头 2 枚/首条 ▲ 隐）→
  ↓ 到 489501 → ↑ 回锚（会话下标随格还原）→ 走到 489503 再 ↓ = 「已经是最后一条」+ ▼ 隐 →
  点右栏 ▲ 回 489502（按钮与键同源）→ Esc 回榜单；搜索（500001→500002 顺序步进）→ Esc 回搜索；
  分区默认=walk、开设置后=列表（listLen≥3 + hasMore）→ ↓ 步进；关注视图视频卡片=**单条**
  （arrows=0 + ↓ 原地不动）。旧钉按新口径改：play-deep「层内不建箭头」→「深链=walk 会话、箭头在、
  首条 ▲ 隐」；view-zone/view-my 同款两处。**反跑三连全红**：摘 list 分派（落回 walk）⇒
  ll-zone-step/ll-search-step/ll-jx-step 等 5 条红；摘分区设置分支（恒 walk）⇒ ll-jx-list 红；
  摘 syncArrows ⇒ ll-up-hidden-first/ll-zone-back/ll-zone-end 红。全链 build/lint/check（deps 236 边）/
  单测 258/52 场景全绿。

### 0.9.172（2026-10-06）· 相关推荐行点击改「开层」：舞台原地保活，退出回当前视频

- **由头**：用户实报「可是现在不保活啊。在分区中点击相关推荐视频，原窗口直接没了。在推荐、榜单、
  动态或者其它场景都是这样」——0.9.167 以来，抽屉「相关推荐」行的点击出口是 relatedapi.startChain
  （起点置顶 + setSource('related') + **FeedStore.reset + resetStream + teardownViews**）：整条流被
  换掉、视图被拆，回不去当前视频。0.9.170 只修了「层内」那一半（layerJump），层外（竖刷舞台上）
  这条仍是旧形态。
- **修法**：relatedapi 新增**开层缝**（setLayerOpener/layerOpen，同款 mediator——本模块不 import
  playlayer），playlayer 注册为 openPlayer（面板条目契约 {acId,title,cover,up}）；reldrawer 行点击
  三落点：层内 = layerJump 换条 → 层外 = layerOpen **开层**（舞台 stageHide 暂停在原条、视图若在
  则照常挂起保活、抽屉随浮层栈收起）→ 播放器未挂载才落 startChain 兜底。层内 ↓/↑/滚轮沿同一条
  游走泵（换条后链从新条目继续），Esc 退出层回竖刷当前视频原位（views.exitView 的 restore 语义）。
- **勘正注记**：本节「层内 = layerJump 换条」「层内 ↓/↑ 沿同一条游走泵」已被 0.9.174 推翻——
  层内点行改**压新级别**（列表播放器，那份 10 条按顺序、Esc 弹回原视频）。
- **测试**：harness `rel-drawer` 重写行点击后的断言段（22→23）：点首行 → `rel-row-opens-layer`
  （view=play + 层锚=池 k=1）→ `rel-stage-kept`（**条目表与游标零变化**——保活的直接证据）→
  抽屉收起 → 层内 walk 抽池内下一条 + seen 增长 → 开 relSequential 后 ↓ 整批入队
  （`rel-seq-queue`，queue>0）→ Esc 退层：条目表/游标仍是原样（`rel-exit-stage` 终局证据）。
  **反跑实证**：摘 setLayerOpener 注册 ⇒ 落回 startChain，5 条断言全红且舞台条目表当场被重置
  （len=3/8，正是用户报的「原窗口直接没了」）。全链 build/lint/check/单测 258/51 场景全绿。

### 0.9.171（2026-10-06）· 分区页收尾三件：层内滑动切换 + 卡片原生图标 + 改名「分区」

- **由头**：用户真机看 0.9.170 后的三条反馈——①「精选点开的 playlayer 窗口怎么无法滑动切换视频」
  ②「精选卡片的播放点赞要用原生图标」③「精选改名叫分区吧」。
- **修法**：①**层内滑动切换**（playlayer）：滚轮/触摸板上下滑与触摸上/下滑 = playStep(±1)，与键盘
  ↓/↑ 汇入同一条泵（walk/seq 语义、历史回退、防回头路全复用）。与竖刷的差异——竖刷靠原生
  scroll-snap 翻条，层内只有一条 slide：手势**自己攒阈值**（细碎滚动先累计到 60px 再推一步，避免
  一次滑动连推多条）+ **500ms 锁**防抖；轮子反向 = ↑ 回上一层历史；抽屉等浮层是 root 级兄弟节点，
  在其上滚动不命中监听（天然隔离）。②**计数位改原生 iconfont 字形**：卡片 meta 的播放/点赞由文本
  示意符（▶/♥）改为站内字形——播放=`rankView`(E164，selection/feed 卡 extra 首位同字)、点赞=
  `feedLike`(E629，动态卡互动区同字)，类 `.acsvg-glyph` + 字体 @font-face 与 cards.js 面板卡同源
  （大卡 meta=播放+点赞+时长；普通卡=点赞+UP 名）。③**展示名「精选」→「分区」**：dock 标签与页头
  标题改口；**视图 id/路由/文件名仍 jingxuan**（id 是深链与测试的稳定键，改名只动展示串）。
- **测试**：harness 两改——`rel-layer` +4 断言（21）：滚轮下/上各一（反向要等 500ms 锁一拍）、
  触摸上滑一条（合成 TouchEvent）；`jingxuan` +2 断言（22）：dock 展示名=分区且 dataset.view 仍
  jingxuan、页头标题=分区、计数位字形码点逐位核对（大卡 E164+E629、普通卡 E629）。**反跑三连全红**：
  摘 wheel 监听 ⇒ rl-wheel-step 红；摘 touch 监听 ⇒ rl-touch-step 红；图标退回文本 ⇒ jx-native-icons 红。
  全链 build/lint/check/单测 258/51 场景全绿。

### 0.9.170（2026-10-06）· 精选页 v5：出口对齐播放层 + 层内游走 + 2×2 大卡 + 按行补齐 + 左栏挪位

- **由头**：用户四连裁决（预览稿 v5，定稿前四轮往返）：①「精选这种带选择的场景，即看即走，
  应该和榜单/搜索/动态一样用浮层」②「精选在左栏放在推荐上面」③「首张太大，占 2×2 卡片位置就好」
  ④「不是不足一屏时下拉下一批填满，拉的数量要做到底部无空卡片」。核对后确认 ① 指的是**点击出口**：
  榜单/搜索/动态点卡片走 playlayer（浮层单条、Esc 回来源原位），精选此前拆视图进舞台游走——两套观感。
- **勘正注记**：本节「层内换条（抽屉随新视频重开）」「否则 = startChain 舞台起链」已被后续推翻——
  0.9.172 起层外 = 开层、0.9.174 起层内 = 压新级别、0.9.178 起换条走 retargetComments（不重开浮层）。
- **修法**：①**精选卡片点击改 openPanelItem**（cards 注入缝 → playlayer.openPlayer，与全站列表同一条
  出口）；Esc 回精选原位（视图保活：held 复原、滚动位不丢）。②**层内游走**（playlayer）：键盘 ↓/PageDown/j
  在层内不再吞掉，经 player 注入的 api.playStep 走 `playStep(±1)`——↓ = relatedapi.batch(当前条) 抽下一条
  （walk=池内随机逐级递归，seq=吃队列）、↑ = 回上一条（层内历史 hist+hIdx；**入口条目**在 enterLayer 登记为
  历史第 0 条，否则 ↑ 回不到入口——harness 首轮即抓到）；层开时 seed(入口 id) 播种 seen 防回头路；
  hash 不跟写（层地址=入口，Esc/刷新仍回入口，不污染分享链接）。③**抽屉相关推荐行的两落点**：
  relatedapi 新增层宿主 mediator（setLayerHost/layerActive/layerJump，playlayer 注册）——层在场 = 层内换条
  （不拆界面，抽屉随新视频重开），否则 = startChain 舞台起链（旧语义不变）。④**左栏挪位**：精选 order 16→5
  置顶；**推荐条目首次参与统一排序**（order 10，与榜单同序按 id 兜底）——sidebar 由「恒队首」改为合并排序。
  ⑤**网格改版**：撤 hero 大焦点区，首卡改网格内 2×2 跨格（.acsv-jx-big；封面锁 16:9 ⇒ 与源图同比例、
  cover 零裁切零拉伸，信息区恒 ≈164px 按 4 行排：标题 18px/分区标签/UP 行/数据行）；**按行补齐**渲染
  （nextTarget=2(cols-2)+k·cols、cols 按现场列数算、多余留缓冲跨批续用、铺不满滚动体时按整行继续推进）；
  网格 dense 流。⑥顺修自家缺陷：`st.cursor` 拉页后未写回（每次都用同一游标 → mock 反复回第一块、
  永不终页；harness `jx-anim-end` 抓到）。⑦契约加 `channelInfo`（selection/feed 卡自带的分区展示串，
  与 resolve 回填的 channel 对象形状不同故另立键）——大卡标签行数据源。
- **测试**：单测 258 不变（新逻辑在视图/层内，纯函数 nextTarget 由 harness 钉）；harness 场景三改一新——
  `jingxuan` 重写（20 断言：chips 剔除/全部 tab 大卡 1+全量/大卡四行结构/动画 tab **按行补齐不变式**
  `(normals-base)%cols==0` + **末行带几何铺满**（大卡跨行计入覆盖、列间距算合法间隙）/逐行续放至终页/
  点大卡进播放层/Esc 回精选保活）、新场景 `rel-layer`（17 断言：深链进层 → ↓ 池内抽条 → ↑ 回入口 →
  再 ↓ 前向重开 → c 抽屉 rid 跟随 → 行点击层内换条（view 保持 play + 抽屉跟随新 id）→ Esc 关抽屉/退层）、
  `view-my` dock 顺序改新序、频道桩补 tagList、`play-deep` 补层内 ↓/↑ 两条（旧口径「层内 ↓ 什么都不做」
  被用户裁决取代——竖刷不被层内按键带动的本意由既有 play-key-nonav 继续钉住，45→47 断言）。
  **反跑五连全红**：摘 input 的 playStep 注入 ⇒ rl-layer-step 红；
  layerActive 恒 false ⇒ rl-layer-jump 红；nextTarget 退化 +10 ⇒ jx-anim-flush/geometry 红；卡片出口倒回
  startChain ⇒ jx-card-layer 红；精选 order 倒回 16 ⇒ dock-order 红。
  全链 build/lint/check（deps 234 边）/单测 258/51 场景全绿。

### 0.9.169（2026-10-05）· 精选页：抖音精选式分区网格（channel 家族首接线）

- **由头**：用户裁决「把大家都在放进抖音精选式页」→ 分区流当日实测破局（api-research §6.7：
  allChannels 免登录频道树 + channel/secondLevel/resourceList 分区视频流，channelId 主频道过滤
  实锤、~30/块、\"{n},{n}\" 游标、子频道参数被无视）+ 预览稿 ①② 段确认（3cb56fd，v4）。
- **修法**：①新域件 `channelapi.js`（§6.7 口径全在册：channelTreeOf 非视频域剔除表
  NON_VIDEO={63 文章,177 AC正义}、channelPageOf 杂质按 channel.parentId 本地复核滤——宁漏不错；
  终页形态未测按空游标/空页收口）。②**翻页器隔离**：appapi 抽 `homeFeedFetch(cur)` 单发
  （请求形状/规整单源，mockHome 缝随迁；**不裁终页语义**——pcursor 空串在旧实现不是终页，
  终页判定权留调用方），homeFeed 泵与精选页「全部」tab 各自持游标零互扰。③新视图
  `jingxuanview.js`（dock order 16）：chips 复用 .acsv-vchip 族、首屏大焦点卡（仅「全部」tab）、
  自适应网格、触底续页、骨架/空/失败三态；卡片点击=relatedapi.startChain 起游走链（与抽屉行
  同缝）。④起步器补 **teardownViews**：视图开着时 route 层不回写深链（route.js 在册防踩语义）
  ——不关视图游走链在背后空转；保活只对 deep 接口（playlayer），回精选=dock 再点。⑤styles 补
  jx 段 + **补上 0.9.168 漏定义的 @keyframes acsv-pulse**（.acsv-relsk 引用悬空，动画静默失效）。
- **勘正注记**：本节三条已被 0.9.170 推翻——dock order 16→**5**（置顶于推荐之上）、首屏 hero 大焦点卡→**网格内 2×2 跨卡**、
  卡片点击 startChain→**openPanelItem 走播放层**（详见 0.9.170 节）。
- **测试**：单测 255→258（channelTreeOf 剔除/保序、channelPageOf 拆包/杂质滤/终页三形态/抛错）；
  harness 新场景 `jingxuan`（17 断言；桩=频道树含必剔两员 + 每频道 30+10 两块、块1 末条杂质、
  游标 \"1,900100\"→''）：chips 剔除断言 → 全部 tab 大卡 1+2/网格/触底到底 → 动画 tab 29 张
  （30-杂质）→ 续块 39 → 终页 → 点首卡起链（900101 置顶+hash）→ 视图随深链路由拆除。
  反跑实证：摘 NON_VIDEO 剔除表 ⇒ chips 断言红（4 枚含 AC正义）。全链 build/lint/check
  （deps 226 边）/单测 258/50 场景全绿。调试修三处自家病灶：全部 tab 首批被「游标未前进」
  守卫吞掉（home 方言 ''→'' 合法）、骨架卡未清抢走首卡点击、场景桩 pcursor 未解码。

### 0.9.168（2026-10-05）· 相关推荐进评论抽屉：tab + 随机游走泵（feed/related/general 首接线）

- **由头**：拆包清单 ★1 `feed/related/general` 当日实测破局（api-research §5：POST 表单
  `resourceType=2&resourceId`、免登录、无游标一发 10 条、重复调用换一批、回包不含当前视频、
  首条非固定 UP 本人、分区亲和）+ 用户裁决两连：①「大家都在看」并入评论抽屉做「相关推荐」
  tab（跟着每个视频走=所有视频自动有此功能）；②竖刷「下一条」默认**随机游走**——在当前视频的
  相关推荐池里随机抽一条、逐级走，不按列表顺序；设置面板给「按列表顺序续播」开关（relSequential，
  默认关）。预览稿 docs/preview/jingxuan.html v4 先行确认（3cb56fd）。
- **勘正注记（0.9.172 起）**：本节「行点击 = startChain 起游走链」「竖刷下一条默认随机游走」两处已改——舞台点相关行
  改为 `layerOpen` **开层保活**（0.9.172 用户实报「原窗口直接没了」），层内点行 0.9.174 起改为**压新级别**
  （列表播放器）；`startChain`/related 内容源仅剩「播放器未挂载」兜底，准退役。
- **修法**：①新域件 `relatedapi.js`（传输+规整+泵一体，不 import feedstore/player——环检测
  零豁免）：`relatedPageOf` 拆包裹层（{dougaFeedView,expTag,type}）、`relatedItemOf` 走 home
  契约模板（resolve 链/prewarm/slim/深链回写全免费；计数富化+up 主键 id）、`batch(tipId)` 游走
  泵（自持 seen 防回头路；整批见尽换批 ≤3 次；兜底放宽允许重播——断流比偶尔重播更伤）；随机性
  只在 walk 模式抽 1 条，seq 模式按展示顺序全出（pickFresh 纯函数，rand 注入单测确定性）。
  ②起步走 **player 注册的起步缝**（setChainStarter/startChain mediator）：不走 hash→loadDeepLink
  ——那条链「源随链接走」会 setSource('home') 覆写游走态；起步器镜像其复位序列但保住 related，
  且 related **不持久化**（settings source 只认 sv|home），mount 普通入口/maybeStartFeed/
  goFeedHome 换流分支三处 `ensureBaseSource()` 归位。③取流锚：feedstore.fetchMore 把仓库末条
  id 传给 `API.feed(tipId)`（仅 related 消费，签名加宽不改既有源行为）——walk 每步 1 条、
  seq 整批 ≤10 条，节奏由 bufferSize=4 前瞻自然驱动。④评论抽屉双 tab：slide.buildDrawer 头部
  插「评论 N | 相关推荐」tab 行（dtitle 仍是管线回写目标、dclose 原样），**平级第二列表**
  relList（绝不复用 dlist——resetList 会清它、.acsv-citem DOM 被 view-follow 68/detail-open
  38 断言钉死）；新 `reldrawer.js`（锚位「▶ 播放中」行+推荐行小封面/时长/两行标题/赞数·UP 名、
  骨架/空/失败三态、sv 条目隐藏 tab、输入条显隐记忆隐藏前内联值不破小视频纯浏览）；comments.js
  只挂两 seam（openComments 尾部 sync——换视频刷新候选池；closeComments 复位）。行点击=
  startChain 起游走链。⑤设置 SCHEMA 加 relSequential（seekStep 后，开关索引不移），面板/存储/
  校验全免费。⑥appapi.resolve 补非 m3u8 直链 cap.hls=false 守卫（followstream 同款先例——
  游走条目 resolve 出 webm/mp4 直链时不再误入 hls.js 管线）。⑦topbar syncTopbarSeg 对
  related 源两键全灭（seg 是 sv↔home 开关，游走进出不经 seg）。
- **测试**：单测 250→255（relatedPageOf 拆包/抛错、pickFresh rand 两端界+seen 过滤+seq 保序、
  relatedItemOf 契约白名单 ⊆ ITEM_FIELDS.play+字段映射+up=null 不编造）；harness 新场景
  `rel-drawer`（22 断言，home 源 + my-sample 确定性池桩 700000+rid*10+k）：tab 就绪→切 tab
  （rows=11=锚位+池）→点首行起链（起点置顶 kind=home lazy=true+hash `#svfeed/a/<id>`+
  seenCount≥2+抽屉收起）→scrollTo 推进池内互异→设置面板开 relSequential→seq 整批入链
  （增量≥5 区分 walk 的 1 条/步）；settings-open 用例 5→6 控件同步。反跑实证：摘 seq 分支
  ⇒ rel-seq-batch 红（before=3 now=6 <5）；摘 tabR ⇒ 构建期 ReferenceError 红。全链
  build/lint/check（deps 221 边含 5 条新边）/单测/49 场景全绿。
- **边界**：仅评论抽屉宿主有 tab（面板/行内宿主形态不变）；fav/搜索/榜单等面板条目不经此链；
  写链零新增（点赞/收藏仍走原 rail 键，resolve 链回填互动态）。

### 0.9.167（2026-10-05）· 泄密门禁：两份接口侦察文档钉死仓外（check-no-leak 入 check 链）

- **由头**：用户定调「不提供灰产滋生土壤」（A 站近年屡遭灰产攻击）。同日裁决
  `docs/api-research.md` + `docs/acfun-app-api-inventory.md` 退公开仓改本地留档，但当时只靠
  .gitignore + 文档头注记护缝——`git add -f` 硬塞或未来 ignore 被清，都能静默回仓，缺机器闸。
- **修法**：新增 `test/check-no-leak.mjs` 挂进 `npm run check` 链尾（cases→release→deps→no-leak），
  三断言任一破即 exit 1：①两文件不在 git 索引；②两文件被 .gitignore 覆盖；③两文件不在暂存区。
  纯 git 元数据校验，脚本行为零改动，产物仅 @version 随批漂移。
- **测试**：摘修复反跑 = `git add -f docs/api-research.md` ⇒ 门禁转红（索引断言抓住），
  `git rm --cached` 还原 ⇒ 转绿；lint/build/check（含新门禁）+ npm test 全量场景全绿。

### 0.9.166（2026-10-05）· 小件合批：重试抖动 ±20% + onTime 同值跳过 + 会话请求计数（net/img 打点）

- **由头**：性能评估核实轮通过的三条小项：①图片重试链固定间隔（0/600/1200ms）——多图
  同时失败时重试齐发成同步请求尖峰；②onTime 每 tick 无条件写进度 DOM（player.js:119，
  实测每拍都写 fill/handle/text 无上次值比对——时间文本 1Hz 才变，~3/4 tick 白写）；
  ③「对服务器友好吗」缺数据面——stat 埋点有 prewarm/attach/stall 却没有请求计数。
- **修法**：①`coverAttempts(raw, now, rnd)`（imgurl.js）：②③跳 delay 各乘
  `(0.9+0.2×rnd())` 的 ±20% 随机；rnd 缺省恒 0.5（=×1.0，既有单测/夹具节奏确定性不变），
  生产唯一调用点 imgload 传 Math.random；首跳恒 0 不抖。②player onTime：slide 上缓存
  `_lastPct`/`_lastTimeTxt`，同值跳过 DOM 写（onMeta 同步缓存）；`ontime.skip` 只在
  pct/文本双同值的整拍跳过时计数。③net.js request/requestText 入口 `stat('net.req')`、
  countFail 包装 `stat('net.fail')`（含 mock 命中；gmRequest 直用方 upload/imsend 不计，
  避免传输层双计）；imgload `stat('img.req'/'img.retry'/'img.fail'/'img.memoHit')`。
  以上打点全走 dbg.stat——正式构建 noop 死码消除，零线上成本。
- **测试**：单测 249→250（coverAttempts 抖动组：rnd=0/1 两端界 540/1080 与 660/1320 +
  缺省精确 600/1200 + 首跳恒 0）；harness cover-fallback 尾补四断言（img.req≥7/
  img.retry≥1/img.fail≥2/img.memoHit≥1——与场景既有 /__hits 网络面互证：memoHit 对应
  二次进入死链零请求）；play-cold 尾补 ontime-skip-counted（同 currentTime 连发两次合成
  timeupdate ⇒ 第二次整拍跳过）。反跑实证：撤抖动（rnd 恒 0.5）⇒ 两端界断言转红；撤
  onTime 去重 ⇒ skip 计数不增转红；撤计数器 ⇒ img-stat/net 断言转红。lint/check + 全量
  48 场景全绿。

### 0.9.165（2026-10-05）· 内存水位：FeedStore 远端置瘦 + slide 等高占位壳——连刷长会话内存从线性涨变 O(水位)

- **由头**：性能评估核实轮实锤（0.9.15x）：FeedStore.items/seen 只增不减（全文件无
  splice/shift），连刷 500 条后每条还挂着最多 9 档 qualities/urls（api-research §「9 档直链」）
  的媒体载荷，内存随会话线性涨；同轮盘点补一刀——renderWindow 对窗外 slide 只 dispose
  会话/氛围背景，**slide 壳建后永不拆**（poster 位图 + 控件 DOM 随访问条数常驻）。Head 淘汰
  不可行（索引位移破坏 dataset.idx/hash/滚动锚定），故走「置瘦不删位」。
- **修法**：①数据层 `FeedStore.slim(cur)`（feedstore.js）：idx < cur−30（新 CFG
  `feed.slimBehindAt=30`）的已解析条目清 urls/qualities/_qualitiesAll/urlIdx 并置
  `cap.lazyResolve=true`——划回时 session.start → ensureResolved（api.js:32 在途复用链）
  自动走 refreshItem 重解析（sv=info 1 请求；home=resolve 2 请求，档位按 quality.js 全局
  偏好重选）；元数据（id/videoId/up/title/cover/计数/日期）全保留（上报去重/评论键/侧栏
  渲染依赖）；`_resolveP` 在途与已瘦幂等跳过；renderWindow 每拍调用、stat('feed.slim')。
  ②DOM 层占位壳（player.js renderWindow）：窗外 `feed.slideBelt=6` 格之外的 slide 换
  **等高**空壳 `.acsv-slide-slot[data-idx=N]`（io.unobserve + replaceWith，stat('slide.slot')）
  ——等高 ⇒ offsetTop 全表不变、零滚动补偿；class 异于 `.acsv-slide` ⇒ slideAt 查不到 ⇒
  既有「目标在窗外先挪游标再渲染」路径（scrollToIndex:297-301）兜住跨壳跳转；重建路径
  发现同 idx 壳则 replaceWith 原位换回（免 appendChild+全量重排）；resetStream 的
  innerHTML 清场连壳一起清。
- **测试**：新 harness 场景 `feed-slim` 六断言（harness.html 预处理把 sv mock 克隆 8→40 条、
  meowId 偏移保唯一、单发全量入库；划到 35 ⇒ idx<cur−30 全部 hasUrls=false 且
  feed.slim 计数一致 + `.acsv-slide` 收敛 ≤15 + 占位壳 ≥15；划回顶部 ⇒ item0 重解析
  hasUrls=true）；反跑实证：slimBehindAt/slideBelt 停用（改 9999）⇒ 四组断言转红。
  单测 249 + lint/check + 全量 48 场景全绿。快滑越过占位区与今日「未构建区域」同行为
  （IO 链断 → cur 跳跃），非回归。

### 0.9.164（2026-10-05）· hls.js 懒 eval：内嵌从「可执行代码」改「字符串字面量」，非竖刷页省 ~415KB 编译

- **由头**：性能评估核实轮实锤——build.js 自 0.9.14 起把 hls.min.js 以可执行代码内嵌产物
  banner，而 @run-at document-end + @match 全站 ⇒ 每个 AcFun 页面（原生页注入、动态、空间
  ……这些根本用不到 hls 的会话）都在页面加载时白付整份 hls 的 JS 编译。**实测勘正**：
  hls.min.js = 415,253 字节（评估口径「~1MB」是把整个产物 1,003,342 字节当成了 hls）——
  但仍是产物内最大单件（约四成），低配机上最大的单笔固定编译成本。
- **修法**：内嵌形态改为字符串字面量 `window.__ACSV_HLS_SRC__`（build.js 侧 JSON.stringify
  + U+2028/2029 转义防 es2018 target 语法坑），页面加载只解析一个字符串常量；`ensureHls`
  在 CDN 兜底链之前增设内嵌串路径——首个 m3u8 挂载前 `new Function(src)()` 一次性编译
  （与既有 CDN 兜底同机制、同样不吃页面 CSP），打点 `stat('hls.lazyEval')` +
  `set('hls.evalMs')`。串缺失（构建机没装 hls.js）或编译失败静默落 CDN 逐源链——0.9.14 的
  「运行时零网络依赖」目标不变；Safari 原生 HLS 路径依旧零支付；内嵌串只试一次（evalTried），
  失败定局不重试。
- **测试**：hls.js 增 testHook('hls')；新 harness 场景 `hls-lazy` 五断言（页面加载后内嵌串
  在场且 `window.Hls` 未定义 → 经钩子 ensureHls → `Hls.isSupported` 为真 + lazyEval 计数
  在场；harness 全部 mock 播放走 cap.hls=false 直链缝、无人提前触发 ensureHls，断言稳定）；
  反跑实证：build.js 恢复 eager 内联 ⇒ `hls-not-parsed-on-load` 转红。单测 249 + lint/check
  + 全量 47 场景全绿。产物体积微涨（字符串转义开销 420,847/415,253 ≈ +1.3%），运行期编译
  成本从「每页加载」挪到「首个 m3u8 挂载前一次性」。

### 0.9.163（2026-10-05）· imdrawer 收整：头注簇导览 + 两缝清收（图片换链→imsend、未读徽标→imbadge）

- **由头**：接 data.js 拆件序列（0.9.159–162）后的第二目标。审计判定 imdrawer.js（1010 行）
  「接近但未过界」——一句话「私信抽屉的完整前端」仍成立、依赖全绿，真正出戏的只有两段，
  经用户裁决顺手拆走（再不拆就永远挂账）：**图片 URL 换链协议**（ks://→官方直链三级兜底 +
  Image proto 手解 + officialize 参数白名单，63 行零 DOM，按 README「图片 URL 规则」归属语义
  属 imsend 层）与 **mountBadge 未读徽标**（34 行，与抽屉 UI 零共享状态）。
- **搬迁（机械逐字、逻辑行零改动）**：换链管线迁 `imsend.js`（与图片字节管线同族成完整
  「图片管线」；导出 `imageUrlOf(m, inst)` 改 inst 传参替代直读抽屉模块态 lastImInst——
  私有签名调整一处，机器比对在案；imageUriFromRaw/officialize 仍私有）；徽标独立
  `imbadge.js`（仿 followbadge.js 先例：mountBadge 由 player 挂载、teardownIm 经导出的
  stopBadge 反向通知拆除，方向 imbadge→imsend 单向不回抽屉）；imdrawer 头注补**簇导览**
  （按段名 grep 即达，调用方向单向向下）。imdrawer 1010→911 行，player import 拆两行。
- **测试**：单测 249→249（imdrawer/imbadge 无独立单测面，行为由 harness im-open/msg 场景
  钉着——原样全绿即零漂移）；纯搬迁以代码行多重集机器比对替代反跑：imdrawer 摘除 112
  非空行、103 行逐字见于 imbadge/imsend 新增，差异仅 9 行签名/注释调整（imageUrlOf 加
  inst 参、lastImInst→inst×2、import 行×2、头注措辞×3、私有标注×1）。lint/check + 全量
  46 场景全绿。
- **治理**：check-direction FEATURE +imbadge；README 依赖图 +imbadge 节点 +3 边
  （player→imbadge、imdrawer→imbadge、imbadge→imsend）；模块表 +imbadge 行、imdrawer/
  imsend 行改写；docs/dependency-audit.md 补拆件台账。

### 0.9.162（2026-10-05）· data.js 终解：条目契约分家为 playitem.js + panelitem.js，「杂物抽屉」退役

- **由头**：接 0.9.159/160/161 拆件序列的收官。data.js 经过三步瘦身（860→504 行）只剩
  播放/面板两族条目契约——「data.js」这个名字已名不副实（它不再是数据层全家，只是契约），
  按用户裁决终解：拆成两件**一句话说得清**的契约件，data.js 从依赖图删除。
- **新件（机械搬迁、签名不变；逻辑行零改动）**：`playitem.js`（播放条目契约：sv/home 双
  normalize + `ITEM_FIELDS` 白名单 + 作者契约 `upOf`（0.9.82/0.9.157 演进史头注随迁）+
  `playItemOf` 桥 + `deepLinkOf` 深链判据）；`panelitem.js`（面板条目契约：panelItem 解析器表
  五源 + `followPanelOf`/`squarePanelOf` 派发 + `momentPiOfRepost`/`momentExtraOf` 动态附件，
  upOf 改自 playitem import——作者契约单源不挪）。12 个 src 消费方 import 改道（api/appapi/
  playlayer/followstream/searchview/searchfmt→playitem；followview/squareview/mypage/zone/
  momentbar/momentapi→panelitem）。
- **测试**：单测 249→249——data.test.js（570 行）终解拆为 playitem.test.js（9 组）+
  panelitem.test.js（25 组），用例逐字切片随迁（含 upOf nameColor/playItemOf 归 playitem、
  panelItem 五源/momentPiOfRepost/momentExtraOf/图片归一归 panelitem）；contract.test.js 契约
  白名单闸门改道两契约件（闸门语义不变）。纯搬迁以**代码行多重集机器比对**替代反跑：
  data.js 488 非空行中 484 行逐字保留于两契约件，差异仅 4 行注释改写（分节头更名+
  ITEM_FIELDS 注释交叉引用改指 panelitem.js）与 16 行新头注/import。lint/check + 全量
  46 场景全绿。
- **治理**：check-deps `EXCLUDED_TARGETS` 的 data.js → playitem/panelitem（契约件接替
  「被广泛消费基础件」豁免待遇）；check-direction `INFRA` 名单同步；README 依赖图 data 节点
  →两契约件节点+5 条边改道（momentapi/followstream/momentbar/searchfmt + panelitem 出边）；
  模块表 data.js 行 → playitem/panelitem 两行；README「单源收口」条文与 AGENTS.md 规矩 3
  终稿口径：**契约规整收口契约件（playitem/panelitem），域内回包规整随各自 \*api.js**。

### 0.9.161（2026-10-05）· data.js 拆件第三步：搜索三端点规整出库（searchfmt.js）

- **由头**：接 0.9.159/160 拆件序列。搜索三端点规整（0.9.151 入驻）是搜索域专属的回包适配
  ——唯一消费方 searchview，继续留在契约件里只是历史惯性；出库后 data.js 收敛为纯
  「条目契约」（播放/面板两族）。
- **搬迁（机械逐字、签名不变）**：新件 `searchfmt.js` = stripEm(私) + searchVideoPageOf/
  searchUserPageOf/searchArticlePageOf；出边 data（upOf 作者契约仍属契约层）、imgurl
  （coverUrl）、timefmt（fmtDate/fmtWan）。消费方 `searchview.js` 三件改指 searchfmt；
  `contract.test.js` 契约白名单闸门改道（searchVideoPageOf 产出键 ⊆ ITEM_FIELDS.panel 的
  闸门语义不变，只是 import 换源）。data.js 564→504 行。
- **测试**：单测 249→249——4 组搜索用例逐字迁新建 searchfmt.test.js，data.test.js 同步
  摘除，总数守恒。纯搬迁以代码行多重集机器比对替代反跑：data.js 摘除 85 非空行全部逐字
  见于新件，差异仅文件头/分节头注释与 import 行，逻辑行零改动。lint/check + 全量 46 场景全绿。
- **治理**：README 依赖图 +1 节点 +4 边（searchfmt→data/imgurl/timefmt、searchview→
  searchfmt）；模块表 +searchfmt 行、data.js/searchview 行同步。

### 0.9.160（2026-10-05）· data.js 拆件第二步：通用叶子出库（timefmt/uplook/nameval）+ meCardOf 就地收编

- **由头**：接 0.9.159 拆件序列。审计四条「明显不属于 data」的内容出库：时间文案
  （relTime/fmtDate/fmtAgo/fmtWan）是零依赖格式化叶；观感映射（nameColorCss 硬编码 CSS
  色值/frameUrlOf 头像框 URL）是 UI 词汇进了数据层，消费方全是渲染件；组名/夹名校验
  （带中文提示文案）是表单语义件助手；meCardOf 是我的页专属回包适配，唯一消费方就是 mypage。
- **新件（零依赖叶，逐字搬迁、签名不变）**：`timefmt.js`（relTime/fmtDate/fmtAgo/fmtWan，
  data.js 解析器与 appapi 共同消费）；`uplook.js`（nameColorCss/frameUrlOf，消费方
  cards/rowkit/momentdetail/commentkit）；`nameval.js`（groupNameError/folderNameError +
  两正则，消费方 grouppop/favpop/mypage）。`meCardOf` 就地收编进 `mypage.js`（export 仅为
  单测直采，消费面仍限本模块；补 coverUrl import 随迁）。data.js 710→564 行，改 import
  timefmt 四件；`data.js` 不再是「什么都收」的入口。
- **测试**：单测 248→249——timefmt（6 组）/uplook（2）/nameval（1）用例逐字随迁；meCardOf
  4 组迁新建 mypage.test.js（Node 直载经 purity 同款六件垫桩，一次通过）；原
  panelItem/meCardOf 混合的图片升级用例一拆二（各自随函数归位）。lint/check + 全量 46 场景全绿。
- **治理**：check-direction INFRA 名单 +3（零出边叶）；README 依赖图 +3 节点 +9 边
  （data→timefmt、appapi→timefmt、四渲染件→uplook、grouppop/favpop/mypage→nameval）
  +3 绿叶标注、散文段「绿色七个」→「十个」；模块表 +3 行、data.js/rowkit/mypage 行同步。

### 0.9.159（2026-10-05）· data.js 拆件第一步：域回包规整归域（relationapi/favapi/momentapi 收编）

- **由头**：全库架构审计判定 `data.js`（860 行）为「杂物抽屉」——8 个低耦合簇物理拼接、
  簇间仅 5 条单向边无环；膨胀根因是「契约规整收口 data.js」条文让每个新数据源都往里堆。
  经用户裁决全拆解散（终解于后续版本），本片先走消费面零波及的一步：**域回包规整随域走**
  ——分组/收藏/动态流的回包形状只有各自 api 域消费，规整函数迁入对应 `*api.js`。
- **搬迁（机械逐字、导出签名不变）**：`relationapi.js` += groupListOf/followListPageOf/
  newGroupIdOf/userHeadOf(私)；`favapi.js` += folderListOf/folderIdOf；`momentapi.js` +=
  followVideoPageOf/squarePageOf/momentDetailStateOf（squarePageOf 消费的条目派发
  squarePanelOf 仍属契约层，momentapi→data 边保持）。**全库消费方 import 零改动**——这三个
  api 模块本就是唯一消费方；`data.js` 860→710 行。注释口径随迁（followstream/squarefeed/
  squareview 的「契约层 squarePageOf」提法改指 momentapi）。
- **测试**：单测 248→248——随函数新建 relationapi/favapi/momentapi.test.js（9 组用例逐字
  随迁），data.test.js 同步摘除，总数守恒。纯搬迁无反跑概念，以**代码行多重集机器比对**
  替代（0.9.133 同款口径）：data.js 摘除 141 非空行、137 行逐字见于三 api 新增，差异仅
  4 行注释措辞（「放契约层」→「收口本模块」+ 两条分节头）与 import/分节头新增，逻辑行
  零改动。lint/check + 全量 46 场景全绿。
- **文档**：README（单源收口条文改双口径「跨源条目契约规整在 data.js、域回包规整随各自
  *api.js」；momentapi/squareview 模块行同步）。

### 0.9.158（2026-10-05）· 搜索历史复用原生（聚焦面板 UI + 共享 searchCache 存储）

- **由头**：用户问「A 站首页原生的搜索框聚焦出现的历史记录面板逻辑，我们能不能拿来复用」→
  「ui 也复用」。**反查实证**（站方组件源码 `static/common/widget/searchBox/index.*.js` + 真机
  实测，全部记入 docs/api-research.md §4.10 补记）：历史 = `localStorage['searchCache']`
  （写入原文 `parse||[] → filter 去重 → unshift → splice(8) → setItem`，词过 xssFilter——因为
  站方渲染时把词**拼进 HTML**）；「清除历史」= 移除键；面板 = 「历史记录」+「清除历史」+ 词条，
  `focus` 开、**`mouseleave .search-result` 收**。**顺带修正 0.9.151 的误判**：联想端点
  `/search/suggest?count=6&callback=…` **存在**（只吃 JSONP——不带 callback 回 result 21，正是
  上轮判死的原因），但实测多词恒空、不带 `suggestKeywords`（站方自己也是空、代码里就有
  "联想不到切热搜"的兜底）⇒ 结论"不做联想"不变、依据更新。今日热搜零请求出现但来源未定位
  （不在 SSR HTML 与已下载 JS 里），**不复用**（宁可空白不可编造）。
- **存储复用**（`src/searchhist.js` 重写）：后端改为读写站方 `searchCache`——语义照抄（去重提前、
  **上限 8**、写入前剥 `<`/`>`）；清除=移除键；**老 GM 键 `acsvSearchHist` 首次读一次性并入**
  （站方词原序在前、老词按原序追加，去重/过上限/过过滤）后不再碰、**老键不删**（回滚友好）；
  无 localStorage 走内存降级。收益=两边历史同一份（原生搜的进我们的 chips，反之亦然）。
- **UI 复用**（`topbar.js`）：搜索框挂聚焦历史面板——focus/点空框展开（有词或**无历史时不弹**，
  与原生一致）、mouseleave（原生同款）+ 外点（`ui.closeOnOutsideClick`，0.9.147 统一件）+ Esc
  收起、点词即搜（回填后走既有提交链：会记历史/进视图/就地重跑）、「清除历史」= histClear +
  广播 `acsv-searchhist` ⇒ 已挂载的空词搜索视图重画 chips（两个面同源联动）；样式进 styles 暗色段
  （含评论抽屉避让同款收窄）。**取代 0.9.156 的"点空框→跳搜索视图看历史"**（点击即见历史，
  不必跳转）；空框回车进搜索视图 + chips 的路径保留。
- **测试**：单测 246→**248**（searchhist 重写 7 条：站方语义/上限 8/读到站方键/坏 JSON/清除=移除键/
  老键合并序（站方词在前、老词追加、去重、过滤、过上限、老键不删）/清空后不再合老键/无 localStorage
  降级）。harness view-search 67→**77 断言**——新增：站方键预置词在 chips 与面板同屏（"读到站方
  历史"实锤）、`search-pop-open/items/format`（站方键 JSON 格式）、mouseleave 收、外点收、点词即搜
  且收起且**提到最前**（站方去重提前语义）、重开面板、清除历史=键被移除 + 空词态回引导文案。
  **反跑三条**：①面板不读站方键 ⇒ 单测 1/3/5 与 harness 早段钉转红（读链是承重件）②上限改 10 ⇒
  上限钉红 ③撤外点收起 ⇒ `search-pop-outside-close` 转红。**顺修**：面板清空后已挂载视图 chips
  不联动（补广播 + 视图订阅，teardown 摘除）。lint/check + 全量 46 场景全绿。
- **文档**：预览稿 `docs/preview/search-dropdown.html`（已确认，留档）；api-research §4.10 补记
  （键语义/清除/面板交互原文/联想修正/热搜未定位）；README（searchhist 行改写、topbar 行补面板）。

### 0.9.157（2026-10-05）· 动态卡名字三色体系（默认白 / 等级红紫；蓝回归链接专用）

- **由头**：用户实报「动态页面 id 颜色得重新规划下，现在的颜色逻辑太乱了」+ 复述口径
  「动态卡 id 不是有三种颜色吗，默认的我们现在是蓝色，原生的是默认黑色，我们改成白的吧，
  可见性好一点」→ 预览稿 `docs/preview/moment-name-colors.html`（用户裁决：默认用**纯白**、
  顺带项**一起修**）。
- **病灶（盘点实证）**：
  ① 等级色（紫 `#964cfd`/红 `#fd4c5c`）**只挂了一条链路**——`data.js` 仅广场映射透传
  `up.nameColor`；关注流/转发源/详情面板全无 ⇒ 「三色」名存实亡（**真机核对**：followFeedV2
  20/20、followDougaFeed 10/10 的 `user` 都带 nameColor，0/1/2 三值并存——是漏接不是拿不到）；
  ② 名字占着链接蓝 `#57a9f5`（行卡/引用卡 @源UP/详情面板头三处），与原生「默认=正文色」
  （原生浅色页=黑 `#333`）的语义不符，且同一位 UP 点开详情还会由紫/红变蓝；
  ③ 顺带真缺陷：**动态正文里的 @提及/资源链在深色下没有任何颜色规则** → 落回浏览器默认链接色
  （反跑实测打印 `rgb(0, 0, 238)`，黑底近乎不可见）。
- **修法**：名字三色体系——默认**白 `#fff`**（CSS），等级 1 红 / 等级 2 紫**内联覆盖**
  （`data.nameColorCss`，优先级天然最高）；**蓝 #57a9f5 回归「链接专用」**。
  ① 数据层：`upOf` 增可选第 5 参 `nameColor`（**只在传第 5 参时挂键**——play 侧四处沿用 4 参
  调用，播放契约④「up 固定四件套」不受影响，单测钉住）；关注流解析器（v2 三类型 + 视频流同器）
  与转发源 `rsUp` 随族透传；广场原「后挂 nameColor」并入同参（单源化）。
  ② 渲染层：行卡（rowkit 已有内联逻辑，源头补齐即生效）、引用卡 @源UP（cards.quoteBlockOf）、
  详情面板头（momentdetail）三处同码走 `nameColorCss` ⇒ 同一位 UP 在列表/引用/面板**同色**。
  ③ 样式：`.acsv-frow-name` / `.acsv-gquote-upname` / `.acsv-mdetail-head .acsv-gmom-name`
  深色三处蓝 → 白（hover 只加下划线）；`.acsv-mp` 浅色三处保持原生 `#333` 不动（等级内联同值，
  白底同样可见）。④ 正文链接：`.acsv-frow-text a` / `.acsv-mdetail-text a` /
  `.acsv-gquote-textbody a` 补 `#57a9f5`（顺手修掉浏览器默认色）。⑤ styles 段头注换算表补
  「0.9.157 颜色分工」口径。
- **测试**：单测 244→**246**（`upOf` 第 5 参三态 + 4 参不挂键 + play 桥仍四件套；follow 解析器
  nameColor 透传与转发源同族；既有转发源契约钉随族补 `nameColor: 0`）。harness：
  view-follow 75→**78**（`follow-name-3colors` 一屏三色+默认白 / `follow-text-link-color`
  正文链接=链接蓝 / `follow-quote-upname-level` 引用卡 @源UP 等级紫）；view-square 37→**39**
  （行名等级红 + 默认白）；member-plaza 32→**33**（浅色页等级色同值生效）；detail-open 41→**42**
  （面板头与列表同色）。夹具：`setNC` 三条等级色（红/紫/红）+ 转发源紫名 + 广场第三条红名。
  **双反跑实证**：撤正文链接规则 ⇒ `follow-text-link-color` 转红（打印 `rgb(0, 0, 238)`——
  浏览器默认色的实锤）；名字回蓝 + 撤等级色透传 ⇒ `follow-name-3colors`（四名全蓝）/
  `square-name-default-white` / `detail-head-name-level`（面板头白而非红）转红。
  lint/check + 全量 46 场景全绿。
- **文档**：预览稿留档（已确认）；README（followview 行「作者名蓝链」→「作者名三色」、
  rowkit 行补颜色口径）。

### 0.9.156（2026-10-05）· 点搜索框即出搜索历史（实报「点击不出搜索历史」）

- **病灶**（用户实报）：搜索历史只活在**空词搜索态**（`#svfeed/search` 且无关键词）里，而进入
  该态的唯一路径是「空框回车 / 点放大镜」——**点输入框本身只是聚焦，什么也不出现**；用户点了
  框（或从搜索视图返回后再点）自然什么都看不到。真机同型细节：从搜索视图返回后焦点往往**还在
  输入框上**，此时再"聚焦"连 focus 事件都不派发，靠 focus 做入口必失灵。
- **修法**：顶栏输入框挂 **click**（恒定派发）——非搜索视图、框为空、且当前不在搜索视图
  （`curView` 守卫，syncTopbar 维护）时，走既有 `onSearch('')` 进空词搜索态：最近搜索/引导
  即在那；输入框是共享单例、导航后保持聚焦可无缝续打；Esc/「向左返回」回原界面（播放中的
  视频按既有 wasPlaying 语义恢复）。**空历史时引导文案补一句**「搜过的词会记在这里」——
  让"这里会有历史"这件事自明。
- **测试**：view-search 63→**67 断言**——`search-focus-opens`（回竖刷后点空框：进
  `#svfeed/search` 且历史 chips 在场）/ `search-focus-history`（chip 就是前面深链步骤记下的
  「深链词」且输入框仍聚焦）/ `search-focus-noloop`（已在搜索态再点：hash 不变、视图不叠加）
  / `search-empty-hint`（清空历史后的引导文案）。**反跑实证**：点击入口停用 ⇒ 前三条转红
  （hash 滞留 `#svfeed/v/…`、chips=0）。lint/check + 全量 46 场景全绿（其余场景不点搜索框，
  零波及）。

### 0.9.155（2026-10-05）· 榜单回顶 + 左栏「我的」「关注」互换（我的沉底）

- **由头**：用户两条实报——「榜单也需要回到顶部按钮」+「左侧栏把『我的』和『关注』换个位置，
  『我的』放在最底下」。均为既有形态的直接延伸（回顶件 0.9.154 已正名为共享件；左栏顺序
  是 order 数值，不涉新控件），故未另起预览稿。
- **榜单回顶**：`zone.js` 接入 `.acsv-tbtn .acsv-backtop`（与关注/广场/搜索同款）——
  sticky 钉滚动流右下、超 `CFG.view.zoneBackTopAt`（300，同 follow/square/search）淡入、
  点击平滑回顶。榜单是单发 100 条的长列表（原生同款），滚到中段没有出口。按钮挂 body 且
  在 wrap 之后：本视图渲染只动 wrap 内部（含 `list.innerHTML=''` 重拉），不会把它挤走。
- **左栏互换**：dock 顺序=order 升序 —— 关注 30→**20**、我的 20→**30** ⇒ 左栏变为
  **推荐/榜单/广场 │ 关注/我的**（「我的」沉底；分隔线仍在 广场→关注 之间，group 未动）。
- **测试**：view-zone 44→**48 断言**——`zone-backtop-idle-top`（在顶部：钮在但不现身）/
  `zone-backtop-tall`（夹具行数旋钮 `__ACSV_RANK_N__=14` + 切榜期重拉，造可滚动长列表）/
  `zone-backtop-shown`（滚到底 .on 且可见）/ `zone-backtop-return`（点击平滑回顶 ≤4px 且 .on
  摘除）。view-my 56→**57 断言**——`dock-order-my-last` 钉左栏条目序
  `feed,zone,square,follow,my`。**反跑实证**：榜单阈值停用 ⇒ shown 转红（s=1302）；
  顺序互换还原 ⇒ dock 钉转红（打印 `feed,zone,square,my,follow`）。lint/check + 全量
  46 场景全绿。
- **README**：榜单行补回顶、sidebar 行补顺序口径（推荐/榜单/广场/关注/我的）。

### 0.9.154（2026-10-04）· 搜索页回到顶部（实报「三栏都需要回到顶部按钮」；回顶件正名共享）

- **由头**：用户实报「搜索结果页，三栏都需要回到顶部按钮」（形态预览经用户裁决=推荐项：
  关注/广场同款右下圆钮、滚过 300px 淡入）。
- **修法**：搜索视图接入既有回顶件——`.acsv-tbtn`（顶栏圆钮同族：36 圆/白 chevUp/hover 提亮）
  + `sticky` 钉滚动流右下、超 `CFG.view.search.backTopAt`（300，同 follow/square）淡入、点击
  `body.scrollTo({top:0,behavior:'smooth'})`。按钮挂在**视图层**（不进类目）——三个类目共用一个；
  每拍渲染把钮与哨兵一并重挂流末（否则被后追结果卡挤到中间不再钉底）；评论抽屉打开时正文右缘
  让位、钮 sticky 在正文流里跟着让位。
- **顺修（正名）**：`.acsv-fbacktop` → **`.acsv-backtop`**——该类已是四处共享件（关注视图 /
  广场 / 原生内嵌广场 mp 皮肤 / 本次搜索），名字里的 follow 前缀名不符（0.9.149 popplace 同款
  「统一」纪律）。机械改名入册：styles 4 处（含 mp 覆盖）+ followview / squarefeed 各 1 处 +
  既有两个钉子（view-follow 的 `follow-backtop-icon` / 回顶断言）。
- **测试**：view-search 60→**63 断言**——`search-backtop-shown`（滚过多屏后 .on 且可见）/
  `search-backtop-return`（点击平滑回顶到 ≤4px 且 .on 摘除）/ `search-backtop-in-layer-only`
  （类目切换后仍是同一件、页内唯一）。**反跑实证**：阈值停用（永不挂 .on）⇒ shown 转红
  （打印 `on=false s=2405`）。类名改名波及面回归：view-follow 75 / view-square 37 /
  member-plaza 32 原样全绿。**顺修夹具跨午夜脆点**（本轮全量实跑踩中：00:04 时夹具的
  「5 分钟前」落到昨天，`hist-card-composition` 的 /分钟前$/ 假红）——my-sample 的 HIST_AGO
  钳到「今天零点后 1 秒」与「now−0.5s」较近者（保证 dayDiff=0 且仍在过去）。lint/check +
  全量 46 场景全绿。
- **文档**：预览稿 `docs/preview/search-v2.html` 补 ⑥ 回顶段（形态/显隐阈值/让位规则与示意）。

### 0.9.153（2026-10-04）· 动态正文可划选复制（实报「动态正文不支持拖动选择复制」）

- **病灶**（用户实报）：`#acsv-root` 全局 `user-select:none`（竖刷页防误选手势），此前只给
  **评论正文**开过例外——**动态正文三处全被锁死**：关注流/广场行卡 `.acsv-frow-text`、
  动态详情面板 `.acsv-mdetail-text`、引用卡（转发源）`.acsv-gquote-textbody`。
- **修法**：三处正文按评论正文先例开 `user-select:text`（只开正文——名字/时间/按键仍不可选，
  防误选）；**顺修**行卡委托 `wireRowList`：**划选收尾的 click 不触发行默认**（否则拖选完
  松手即把详情/播放打开）——与同函数内图片「划选收尾不弹大图」（`sel.isCollapsed` 判据，
  commentListClick 先例）同一纪律。
- **测试**：detail-open 38→**41 断言**——`detail-row-text-selectable`（行卡正文 computed
  user-select=text）/ `detail-panel-text-selectable`（面板正文同）/ `detail-select-no-open`
  （程序化划选后点行：面板**不**开且选区仍在；清选区后点击才开——下述既有 detail-panel-open
  即该主路径）。**反跑实证**：撤 `user-select:text` + 撤划选守卫 ⇒ 前两条与第三条同时转红
  （修前打印 `none` / `sel=0`）。lint/check + 全量 46 场景全绿。

### 0.9.152（2026-10-04）· UP 卡最近投稿行固定三列（实报「出现一张单独的大封面」）

- **病灶**（用户实报，搜索 UP主 类目）：UP 卡下方「最近投稿」小卡行用了 `flex:1` ——
  **只有 1 条**最近投稿的 UP，唯一那张小卡被拉满整行，16:9 撑成一张巨幅封面（修前实测
  1050px 宽 / 卡宽 1074px）。真机复核这不是边角情形：30 条 UP 样本里最近投稿 1 条的 3 个、
  2 条的 2 个、0 条的 4 个（`dougaFeedList` 长度分布实测）。
- **修法**：`.acsv-suprecs` 改 **`display:grid` + `repeat(3,minmax(0,1fr))`**，小卡去 `flex:1`——
  1/2/3 条都保持同一小卡尺寸、左对齐不拉伸（形态仍与已确认预览稿的三条并列一致）；
  `.acsv-srec` 只留 `min-width:0`（防长标题撑列）。
- **测试**：harness view-search 59→**60 断言**——mock 增第三条 UP（**只有 1 条最近投稿**），
  新钉 `search-up-single-rec-size`：该小卡宽 / 卡宽 ∈ (0.2, 0.4)（≈ 1/3 列宽）。**反跑实证**：
  还原 `flex:1` 即转红（修前打印 `w=1050/1074`）。相关计数钉随夹具 2→3 同步更新
  （chips「UP主 3」/ 卡片数 / 关注键两态 / 深链类目）。lint/check + 全量 46 场景全绿。
- **文档**：预览稿 `docs/preview/search-v2.html` 补「1 条最近投稿」态与说明（存档修后形态）。

### 0.9.151（2026-10-04）· 搜索 2.0（三 JSON 端点真分页 / 类目 chips / UP 卡 / 搜索历史）

- **由头**：用户「完善一下搜索吧，现在搜索功能很简陋」。现状=0.9.72 的搜索只做得到 **SSR 首屏**
  （`?pageNo=` 无效、只能视频、无分页）。真机实测（登录态内置浏览器，docs/api-research.md **§4.10**
  新增）发现 PC 搜索其实有 **JSON 三端点**，且**分页参数是 `pCursor`（页码）**——`page`/`pageNo`
  被忽略，靠点原生 pager 抓包坐实（它发的 ajaxpipe 带 `pCursor=2&sortType=1&channelId=0`）。
  实测样本（星际）：视频 600 条/20 页、UP主 63/3 页、文章 100/4 页；联想端点**不存在**
  （`search/suggest` 回参数错、原生搜索框真实键入零请求）。
- **形态（事前预览稿 docs/preview/search-v2.html，用户三项裁决：三类目全做 / UP 卡带最近投稿＋关注键 /
  搜索历史做）**：
  - **类目 chips**：视频/UP主/文章，计数=各端点 `totalNum`（不编未取过的数）；
  - **换词并行预拉三类目**（各 30 条小 JSON）+ **模块级缓存**（跨视图重建存活）：切类目/前进后退/
    历史回访**零请求**；
  - **哨兵自动续页**（同评论侧 0.9.141 口径，无「加载更多」按钮），到底出「已显示全部 N 条」；
  - **UP 卡**：头像/名/粉丝/投稿/签名 + **最近投稿 3 条可直接点播**（`dougaFeedList`）+ 一键关注
    （`relationapi.followUser`，落未分组）；**已关注态点开=分组选择层**（grouppop：改分组/取消关注，
    与 rail 关注角标同语义件，不在卡上另造一套）；
  - **文章行**：无封面文本条（标题/摘要/作者/阅读/评论/频道/日期），点击新标签开 `/a/ac` 原生页；
  - **搜索历史**（空词态）：新叶子 `src/searchhist.js`（GM `acsvSearchHist`，去重提前、上限 10、
    无 GM 内存降级），chips 可点可清空；
  - **地址唯一真源扩为 `#svfeed/search/<kind>/<kw>`**：route 增 `searchRe`→`viewKind`、views 的二段参数
    （enterView/build/来源链/`syncRouteView` 比较全带上），旧单段形态（0.9.72 历史链接 + 顶栏默认首跳）
    挂载时 `location.replace` 规范化为类目段（不留历史条目）。
- **退役**：`data.parseSearchItems`（SSR 区段解析）与 `cfg.api.search`（SSR URL）整体删除；
  `emTitle` 的 `<em>` 高亮由契约层剥成纯文本（卡片不做局部高亮）。
- **顺修（场景实锤）**：空词态（历史页）此前会**驱逐结果缓存**（`cacheFor('')` 占位），
  于是「搜 A → 看历史 → 点历史里的 A」整组重拉——空词态改为不碰模块缓存（新场景钉「历史态与
  点历史 chip 全程零请求」）。
- **测试**：单测 237→**244**（新 `searchhist.test.js` 5 条：去重提前/上限 10/清空/坏原文/无 GM 降级；
  `data.test.js` 三规整 4 条替 parseSearchItems 2 条——真机样本形状，含 em 剥标签与坏条目跳过；
  `contract.test.js` 面板契约来源改 `searchVideoPageOf`；`route.test.js` 补类目段 4 例并全量补
  `viewKind` 字段）。**harness：view-search 重写（59 断言）**——三端点分键计数钉「换词预拉三个 /
  切类目零请求 / 哨兵只续当前类目 / 历史态与历史点击零请求 / 深链词补三发」，另有：chips 计数、
  卡字段（em 剥标签/播放文案剥后缀/日期）、UP 卡两态与关注 body（`action=1`）、已关注→分组层开合、
  最近投稿点进播放层、文章行字段与 `window.open` 目标、视频结果卡进播放层四连钉（首帧作者=搜索 JSON、
  零额外请求、回包覆写、Esc 回原样）、失败重试（result 21 → 点重试成功）、历史增删。lint/check +
  全量 **46 场景**全绿。
- **README**：依赖图 +`searchhist` 节点与 searchview 五条边（cards/grouppop/imgload/relationapi/searchhist）；
  模块表 searchview 行改写 + searchhist 行；使用章搜索框行改写（三类目/续页/历史）；作者来源表站内搜索行
  改指 JSON。

### 0.9.150（2026-10-04）· 0.9.148 遗留清收（抽管理壳 / 删孤儿页 / 追补预览）

- **由头**：0.9.148 审计遗留四项中 ①③④ 尚未处置（② 已由 0.9.149 统一）——用户裁决「**抽、删、补**」。
- **抽**：`src/mypage.js` 两个管理 tab 是同形副本（`buildFav` 213 行 / `buildFollowGroups` 230 行，
  差异只有数据源/校验/文案）⇒ 抽**页内局部工厂 `adminTab(panel, o)`**：chips（[全部?]＋各档＋
  「＋新建」）→ 组头操作（改名/删除，`sysTab` 豁免）→ 内联表单（新建/改名共用）→ 列表 → moreBtn
  翻页，含选中/刷新骨架（首进 `started` 补拉、`reloadOnRefresh` 分派：收藏夹=true 夹表变即重拉列表、
  分组=false 成员行原地改）。**壳零业务**——数据/文案/校验/行渲染全由 opts 注入；两 builder 各收成
  约百行配置。**证据=行为等价**：view-my 56 / fav-folders 45 / follow-groups 35 / detail-open 38
  四条场景**零断言改动**通过（含 `fg-move-tag`/`ff-move-refresh`/`fg-rows` 等全部交互钉）。
  仍作我页局部件（单一消费面；第三个消费方再提独立模块，注在壳头注）。
- **删**：`git rm test/share-preview.html`——孤儿件（无构建/测试/文档引用）+ 旧 CSS 快照，预览职能
  已由 `docs/preview/` 取代（0.9.148 曾加作废横幅，本版按裁决删除；仓库内仅 CHANGELOG 审计段提及，
  属历史叙述）。
- **补**：0.9.142/143 的 UI 在预览规矩入册（144263d）之前落地、无事前稿 ⇒ 按**已出货形态**追补
  `docs/preview/follow-groups.html`（我的页管理面三态 + rail 选择层三态：未关注默认勾「未分组」/
  已关注不预选＋层内取消关注/行内新建）与 `docs/preview/fav-folders.html`（选择层三态：未收藏默认
  勾首夹/已藏回显/全取消=移除 + 我的页管理面）。两稿页首均标「**追补稿（回画 · 非事前确认）**」并
  注明对应版本；**自检**：1600×900 截图逐段核对已出货形态 + 540 窄宽无横向溢出（`docs/preview/README`
  边界补一条追补稿标记规则）。
- **测试**：build/lint/check + 全量 46 场景 + 单测 237 全绿（壳提取无断言改动，见「抽」）。

### 0.9.149（2026-10-04）· 弹层定位统一（placePop 并入 popplace；两模型一实现）

- **由头**：0.9.148 审计遗留项 ②「`sharepanel.placePop` 与 `pickpop.pickPlaceOf` 是同口径两实现
  （常数已漂：间距 12/10、边距 4/8、下限 140/120）」→ 用户裁决「**统一**」（理念 3 单源收口）。
- **修法**：新建**零依赖叶子 `src/popplace.js`**——**两套锚定模型、一份实现、一份常数**：
  ① `anchorPlaceOf`（按钮旁选择层）：下方优先 → 下方可用 <240 且上方更宽裕则翻上 → 高度按所选方向
  可用空间压高；水平**让开宿主一列**（右缘 = min(宿主左缘, 锚左缘) − 10），左不够翻宿主右侧；
  ② `rowPlaceOf`（行·面板贴靠，0.9.105 裁决几何）：右缘贴行左缘 / 左缘贴面板右缘、**底对齐锚点底**、
  锚上空间不足压缩自身（下限 140）；③ 共用 `applyPlace`/`watchPlace`（立即 + 首帧 rAF 校准 +
  ResizeObserver 保活（`el._ro` 防 GC）+ window resize，拆掉自清理无残留）。常数集中一处
  （GAP 6 / GAP_H 10 / PAD 8 / MIN_BELOW 240 / A_MIN_H 120 / ROW_GAP 12 / ROW_PAD 4 / ROW_MIN_H 140）。
  **顺修**：原 `placePop` 把「视口坐标的 minL/maxL」与「内容坐标的 left」混比——统一为内容坐标
  （实测场景 sl≈0 故行为不变，属正确性修正，注在 `rowPlaceOf` 头注）。pickpop 只留「取 rect + 落位」；
  sharepanel 的 `placePop` 整体删除。
- **测试**：单测 232→237——`test/unit/pickpop.test.js` 更名 **`popplace.test.js`**（原 6 条几何钉
  原样搬入 + **新增 5 条 rowPlaceOf 钉**：贴行右缘−12/贴面板左缘+12/底对齐=锚点底/越界翻侧与收边到
  视口缘/高度下限 140 + 顶边收口/宿主滚动下的底对齐内容坐标）。**harness 零改动通过**：view-follow 的
  `follow-share-geometry`（行模型：右缘贴行左缘 ±16、底对齐 ±2）与 follow-groups 的 `fg-pop-geom`
  （按钮模型：不压操作栏列 + 右缘=宿主左缘−10）原样全绿——**行为等价的最直接证据**。lint/check +
  全量 46 场景 + 单测 237 全绿。
- **README**：依赖图 +`popplace` 节点/两条边（pickpop→popplace、sharepanel→popplace）/**绿叶子名单
  七个**；模块表 +`popplace` 行、pickpop 与 sharepanel 两行改指（原「两套定位」说明撤除）。

### 0.9.148（2026-10-04）· 0.9.139–147 复查处置（审计：死代码/理念/过时注释与文档）

- **由头**（用户「审一下今天的一系列改动，看看有无死代码残留，以及违背项目理念的，以及更新过时
  注释与md」）：三路并行审计（死代码与残留 / 过时注释与文档 / 理念合规），本版只做**处置**，不新增功能。
- **P0 真缺陷（审计命中，已修）**：`favpop` 的 `done` 只回 `{favorited}`，而我的页收藏卡**「移动」**
  消费 `res.ids` ⇒ 提交成功后回调抛 TypeError、**卡不摘除且夹计数不刷新**（静默失效）；该路径
  **此前零测试覆盖**（fav-folders 只测了「移除收藏」）。修法：`favpop.done` 回 `{ favorited, ids }`
  （契约写进头注）；mypage 侧**刻意不做 `|| []` 容错**——首版加了容错，反跑立刻证明它把这条钉
  废掉（缺 ids 时降级成"删了卡"，测试转不了红）：**容错掩盖契约破坏**，改为严格读 + 注释写明。
  新增 4 条 harness 钉（开层/提交/body/`ff-move-refresh`=列表真重渲染）；摘修复反跑：退回旧契约
  ⇒ `ff-move-refresh` 转红（connected=true）。
- **单源收口（审计点：理念 3 两处漏网）**：① `uppage.js` 排序菜单的原自挂 `document` 冒泡监听
  （永不注销）并入 `ui.closeOnOutsideClick`（捕获相；菜单选项自有关闭逻辑，内部点击不算外点）；
  ② 我的页 `dougaList` 读链下沉 `favapi.favList`（URL 逐字保持护 mock 缝）——收藏域 IO 不再一分为二。
- **退役残留**：`comments.mockComments` 里无人读的 `pcursor` 字段删除（0.9.140 起根评论翻页只认
  page/totalPage，退役登记在注）。
- **过时注释与文档（审计"必修"清单全清）**：`interact.js` 头注（只剩点赞/投蕉，关注→relationapi、
  收藏→favapi 迁出登记）、`attach.js`（删已退役的 `interact(setRealFollow)` 读方）、`pickpop.js`+
  `banpop.js`（外点口径：一次性监听 → 捕获相常驻）、`data.newGroupIdOf`（头注仍写"响应不带 groupId、
  必须差集"——与真机复验"响应带 groupId、差集仅兜底"矛盾）、`mypage.js`（头注两 tab→三 tab、3:4→4:3；
  删重复段头）、`rail.js` 关注角标 **title 用户可见文案**（"点击取消关注"→"点击选择/更改分组"）、
  `test/unit/pickpop.test.js` 头注横向口径；建议级 5 处（appapi/cfg/report/sharepanel/emoticon 头注）
  一并补齐。**README**：使用章 6 处（评论翻页/关注分组弹层/我的页三 tab+两处管理化/推荐栏收藏键/
  分享上报）+ 交互接口章（action=3 与夹 CRUD 收口）+ 场景文件数（7→12）+ **模块表补 6 个新模块行**
  （followseen/relationapi/favapi/pickpop/grouppop/favpop）+ 3 处职责修正（appapi/interact/mypage）
  + followbadge 水位描述（0.9.139 markSeen）+ immsg 消费方（三方→六方）。**docs**：api-research 新增
  **§4.9 评论列表分页**（0.9.140 的真机结论此前只在 CHANGELOG，属理念 2 漏档，补记：每页都回
  `pcursor:"no_more"`、page 驱动、38 页样本）+ §2.1.2 补 groupId 指针；`docs/preview/pickpop-position.html`
  加「**横向口径已被 0.9.146 取代**」指针（4 处）。**日期口径统一**：0.9.144–147 小节的
  「2026-10-05」→ **2026-10-04**（与 git 提交时间一致；此前跨日误记）。
- **理念边界澄清（审计裁决点）**：README「项目理念」第 1 条 + `AGENTS.md` 补一句——**纯交互/行为
  修正（视觉形态零变化）不算预览范畴；只要新增/改动控件与面板形态，仍须先出预览**（0.9.145/0.9.147
  按此口径不违背；0.9.144/0.9.146 有预览在册）。
- **反跑证据补强**：`inside-keeps` 四条"防过度矫正"钉在"旧一次性语义/无逻辑"变异下**本来是绿的**
  （审计指出其从未被证明有效）——本版补第二种变异（内部点击也关=过度矫正）实测：pickpop 的
  `ff-out-inside-keeps` 转红 ✓；分享面板/表情面板两条在"内部点击是否到 document"上存在环境差异
  （探针实证：守卫已装载、外部点击命中、内部点击不命中），判别力有限，**如实登记**不粉饰。
- **测试**：fav-folders 41→45；三场景 45/75/45 + 全量 46 场景全绿；单测 232。
- **遗留（登记待裁）**：① 我的页两个管理 tab 是同形副本（buildFav/buildFollowGroups 各约百行平行），
  是否抽"管理 tab 壳"；② `sharepanel.placePop` 与 `pickpop.pickPlaceOf` 是同口径两实现（常数已漂：
  gap 12/10、边距 4/8、下限 140/120），是否统一；③ `test/share-preview.html`（孤儿 + 旧 CSS 快照）
  已加**作废横幅**，删除与否待定；④ 理念入册（144263d）之前的 0.9.142/143 UI 无预览稿，是否追认。

### 0.9.147（2026-10-04）· 外点收起收口（实报「关注/收藏/转发/表情面板应点外面收起」）

- **病灶两处**（用户实报四类面板：关注分组、收藏夹、转发面板、表情面板）：
  ① **旧实现是"一次性监听 + 先摘监听再判内点 + 挂冒泡相"**（pickpop/sharepanel/banpop 同款）——
  点一下**面板内部**（选个分组、点下联系人）就把监听吃掉，之后再点外面**永远收不起来**（实报
  主症状）；且冒泡相会被页面里大量 `stopPropagation` 吞掉（控件条、弹幕输入框、评论操作键、
  rail 按键……），点这些区域等于没收。
  ② **表情面板压根没有外点收起逻辑**（`mountEmotButton` 只做按钮 toggle）。
- **修法**：把"外点收起"收口成共用件 **`ui.closeOnOutsideClick(panel, keep, onClose)`**——**捕获相**
  监听（不被冒泡链上的 stopPropagation 吞）、**常驻到面板拆除**（面板内点击不摘监听，被隐藏而
  未拆的表情面板能反复生效；已拆面板在下一次点击自清理，无残留），`keep` 里的节点（触发按钮）
  算内部以保住 toggle 语义。四处接入：pickpop（关注/收藏）、sharepanel（转发/分享）、banpop
  （投蕉数量层，同型病灶顺修）、emoticon（表情面板，新增；隐藏不拆 ⇒ 每面板只装一次）。
- **测试**：fav-folders 38→41（外点收起三步钉：开层 → **点面板内部不收起** → 点**控件条**
  （stopPropagation 区域）必须收起）；play-deep 43→45（分享面板同款两步）；view-follow 73→75
  （表情面板：内部点击不收、点视图体收起；外点刻意选**中性元素**——行正文会顺带触发别的收起
  路径，当外点会假通过）。**双反跑实证**：①把共用件退回旧语义（一次性+先摘监听+冒泡相）⇒
  fav-folders `ff-out-close`、play-deep `play-share-outside-close` 转红；②摘掉表情面板那段（=改前
  无逻辑）⇒ `follow-emot-outside-close` 转红。lint 干净 + 46 场景全绿。

### 0.9.146（2026-10-04）· 选择层横向让位（实报「会盖住图标」；按头像位置算）

- **病灶**（用户实报「关注和收藏窗口对齐可以看看分享，现在这两个会盖住图标」）：0.9.144 的横向
  口径是"**右缘对齐锚点右缘**"——锚点是右侧操作栏里的按钮时，弹层整块压在 56px 的操作栏列上，
  把 点赞/评论/收藏/分享 那一列图标盖住。对照**分享面板**（用户点名）：它不看按钮自身，而是
  **让开宿主（btn.parentNode）一整列**（CSS `right:66px` 相对 56px 宿主 = 宿主左缘再往左 10px）。
- **修法**（形态经 `docs/preview/pickpop-align.html` 确认稿；用户裁决「**按头像位置算**」= 以头像块/
  操作栏列作让位基准）：`pickPlaceOf` 横向改 **右缘 = min(宿主左缘, 锚点左缘) − 10px** ——取 min
  是为了"宽宿主（rail 头像块 48px）也算数"（关注角标仅 20px 宽，拿它自身左缘当基准仍会压列）；
  左侧放不下 → 翻到**宿主右侧**（左缘 = max(宿主右缘, 锚右缘) + 10），再不行 → 视口收边（8px）。
  纵向沿用 0.9.144 已确认规则（下方优先 → 翻上 → 按可用空间压高）。纯函数签名加 `host.right`
  （翻侧兜底用）；落位/重算机制不动。
- **测试**：单测 231→232（横向三案改判 + 新增「宿主比锚宽时取宿主左缘」= 头像块 48 vs 角标 20 的
  rail 实测几何）；harness follow-groups 的 `fg-pop-geom` 增横向不变式：**弹层整体不压操作栏列**
  （`pop.right ≤ rail.left`）且 `pop.right = 宿主左缘 − 10px（±2）`。**摘修复反跑实证**：退回"右缘对齐
  锚点右缘" ⇒ 转红（`pop.r=1242 > railL=1188`，压列 54px = 实报现象）。lint 干净 + 46 场景全绿；
  预览稿标注「已确认 · 0.9.146」留档。

### 0.9.145（2026-10-04）· 分享上报（实报「点击分享不会上报」；官方口径真机对齐）

- **病灶**（用户实报）：我们脚本的分享动作（rail/行流/详情面板 → 分享面板 → 复制链接 / 私信发送）
  **完全不上报**，站方侧看不到任何分享行为。
- **真机抓包定性**（2026-10-04 内置浏览器登录态 /v/ac26640967；页面内包 `sendBeacon` +
  `weblog.sendImmediately`，fetch/XHR/beacon/Image 全网络留档）：
  · 上报时机 = **分享面板里"选平台"那一刻**（点开面板本身不上报，一次选择一条）；
  · 通道 = 与观看历史**同一条** weblog `CLICK` 事件（`sendImmediately('CLICK',{action:'CHOOSE_SHARE_PLATFORM',params})`
    → misc2 批量），**没有专用分享端点**；
  · 参数全量实测（复制链接/微博两采样）：`req_id`/`group_id`（impr 会话 id，与 reportLeave 同源）、
    `atom_id`=videoId、`content_id`=videoId、`ac_id`=acId、`parent_content_id`=acId（**两个 id 空间，
    atom_id ≠ ac_id，不许拿 acId 冒**）、`album_id:"0"`、`resourceType:"video"`、
    `cont_type`=`content_type`=`"douga_atom"`、`content_episode:1`、`title`、`share_id`=登录 uid、
    `share_type:"link"`、`to_platform`∈{`COPY_LINK`,`WEIBO`}（实测枚举）；
  · **动态页 /moment/am\* 不加载 weblog SDK**（实测 hasWeblog=false）⇒ 官方动态分享无上报通道。
- **修法**：`report.js` 新增 `buildShareParams`（**纯函数**，单测直采）+ `reportShare`（SDK 未就绪
  隔 1s 短重试，同 reportLeave）；接缝=sharepanel **「复制链接」→ `COPY_LINK`**（官方同形；点即记，
  与剪贴板成败无关）+ **私信发送成功 → `'IM'`**（**自创枚举**——官方没有"私信分享"路径，实测枚举里
  没有它，登记在册、站方若给正式标签只改一处）。**非视频条目（动态/文章）不上报**：官方无此通道且
  动态形状未实测 ⇒ 宁可空白不可编造。
- **测试**：单测 227→231（`report-share.test.js`：官方同形字段逐项对齐 / to_platform 透传 /
  非视频与缺平台一律 null / 缺 req-group id 不伪造）；play-deep 41→43（层内分享 → 面板 → 复制链接，
  断言 `__WL_CALLS` 里恰一条 `CHOOSE_SHARE_PLATFORM` 且字段形状全对，含 `atom_id !== ac_id`）；
  **摘修复反跑实证**：撤掉上报调用 ⇒ `play-share-report` 转红（`[]`）。lint 干净 + 46 场景全绿；
  docs 新增 §4.8 在册。

### 0.9.144（2026-10-04）· 选择层定位重做（实报「弹出浮层的位置不是很合理」）

- **病灶**（用户实报 + 截图：收藏夹层从收藏键往下长出视口、底部被裁）：定位只在**插入瞬间**算
  一次——那一刻内容还是「加载中…」（~110px），于是判定"锚点下方放得下"就向下展开；等列表
  （7 组 / 多夹 ≈ 420px）到达，**没有人再算一次**；且没有"按可用空间压高"的规则 ⇒ 弹层越出
  视口底被裁（第二张截图的选分组层则是够长但压着画面）。
- **修法**（形态经 `docs/preview/pickpop-position.html` 确认稿；首次走「UI 先出静态预览」新规矩）：
  定位数学抽成**纯函数 `pickPlaceOf`**（单测直采），落位薄壳 `place()` 只写 style——
  ① **内容到达后重算**（渲染完成即重跑 place；`ResizeObserver` + `window.resize` 兜底、自清理无监听
  残留）；② 垂直：下方优先，下方可用 < 240px 且上方更宽裕 → **翻到锚点上方**（底边贴锚点上缘 − 6），
  高度上限 = **所选方向可用空间**（再受 420 / 64vh 约束）——列表内部滚动、标题与底键常驻，
  **永不越出视口**；③ 水平改**右缘对齐锚点**（弹层整体向按钮左侧展开）+ 8px 视口内边距（原为
  左缘对齐 + 4px 硬收边，会粘屏幕边）。样式侧配套：`.acsv-pick-body` 的 `min-height` 60→0
  （flex 子项带 min-height 会把弹层顶出 maxHeight 之外，即老病灶的路径）。
- **测试**：单测 221→227（`test/unit/pickpop.test.js` 新增 6 条钉几何决策：向下/翻上/压高/不许
  在上下都窄时翻上/水平收边/宿主滚动坐标系）；harness follow-groups 33→35（组表堆到 31 项开层，
  钉「弹层整体不越出视口 + 垂直分支服从规则 + 高度 ≤ 所选方向可用空间」）。**摘修复反跑实证**：
  退回"只在插入时算一次 + 不压高" ⇒ `fg-pop-geom` 转红（`pop b=739 > vp 720`，即用户截图的越界）。
  lint 干净 + 46 场景全绿。

### 0.9.143（2026-10-04）· 收藏夹全闭环（选夹/建夹/改名/删夹 + 移动/移除收藏）

- **由头**（同批裁决「管理页+弹层全闭环」「官方弹层」的后半）：收藏长期是"快速落第一个夹"
  （0.9.30 起的 ensureFavFolder），我的页收藏夹只读——写侧端点文档早齐（docs §4.2），缺口=选择器/
  建夹/移动。
- **真机复验三点**（2026-10-04 内置浏览器登录态；两次隔离测试、终态逐项复原）：① **删夹会连带
  移除仅存于该夹的收藏记录**（未收藏靶 → 建夹→加藏→删夹 ⇒ 该条收藏整体消失、不落任何夹）——
  删除确认文案照此明示；② **收藏夹改名端点是 `favorite/folder/update`**（`folderId&name`，
  探测实证名称落库后立即复原；`folder/edit`、`folder/modify` 均 404）——文档"弹窗 chunk 未出现
  该端点"的空白在此补上；③ 建夹响应 `data` 即夹 meta（含 **folderId**）。
- **修法**：新两件——**favapi.js**（收藏域读写收口：folderList（带 resourceId 得 inFolder 勾选态）/
  folderAdd·folderRename·folderDelete / favAdd·favUpdate·favRemove，一律 resourceType=9）+
  **favpop.js**（选择层语义：多选勾选 + 行内新建 + **三分支提交**——未收藏=add（**默认勾第一个夹**，
  点开即确定≈原一步路径）、已收藏有改动=updateFolder 差集、**全取消=remove**）。**落地面**：rail
  收藏键改弹层；我的页收藏夹 tab 管理化（chips 加「＋新建夹」、组头「改名·删除收藏夹」（删除
  二次确认「一并移除」）、卡面 hover「移动 / 移除收藏」）。**连带退役**：appapi 的
  ensureFavFolder/默认夹缓存与 setFavorite、interact.setRealFavorite（收藏动作全走弹层）。
- **harness 盲区顺修**：场景体抛错此前直接冒泡到分发器 ⇒ `done` 永不置真 ⇒ 驱动层只报「120s 超时」
  （真错被吃掉，本次首跑实锤）。分发器改为 try/catch 记 `case-threw` 显式断言（0.9.143）。
- **测试**：新场景 **fav-folders 38 断言**（rail 三分支 body 派发 + 已藏回显 + 层内新建；我的页
  建/改名/删夹 + 卡面移除），夹具把夹表与"该视频在哪些夹"都做成**可变状态**（勾选态真值）；
  单测 219→221（folderListOf/folderIdOf）；**摘修复反跑实证**：默认预选撤除 + remove 分支禁用
  ——7 条断言转红。view-my 的夹位断言改**按文案**取「夹二」（chips 末尾现在是「＋新建夹」）。
  lint 干净 + 46 场景全绿；README 依赖图 +favapi/favpop 两节点与边。

### 0.9.142（2026-10-04）· 关注分组全闭环（选组/建组/移组/删组/改名 + 组内成员管理）

- **由头**（用户：「你看看新关注分组和新收藏分组功能能不能完善一下」→ 范围裁决「管理页+弹层全
  闭环」+「官方弹层」）：接口其实**早已全实测**（docs §2.2/§2.5/§2.6），代码侧为零——关注动作恒落
  「未分组」（interact.setRealFollow 的 groupId 传空）、无任何组 UI。
- **真机复验四点**（2026-10-04 内置浏览器登录态；建→移→改名→删闭环全走，终态**逐项复原**）：
  ① **建组响应其实带新 groupId**（`{result:0,groupId:"281985"}`）——文档记的"响应不带 id、须差集
  回查"是旧读法，实现改为**优先取响应、差集兜底**；② **action=1 对已关注用户不改归属**（实测以
  action=1+新组 id 提交仍留原组）⇒ 改分组必须 action=3（这条决定了 UI 分派，写死防回归）；
  ③ **「未分组」= groupId `"0"`** 的普通首项，action=3 传 0 可移回；④ **followFeedV2 不吃 groupId
  过滤**（带与不带同列表同游标；feed 条目的 groupId 字段是**埋点串**不是关注分组）⇒ 关注视图
  **不做分组 chips**，分组只做关系管理（结论入档 docs §2.1.2/§2.6）。
- **修法**：新三件——**relationapi.js**（关注域读写收口：getGroups / listFollows(action=9 组内·7
  全部；**偏移量游标**、终值 `no_more`） / followUser·unfollowUser·regroup / createGroup·removeGroup·
  renameGroup；写链一律 postForm 页面 fetch 通道）；**pickpop.js**（通用「选择层」壳：单选/多选/内联
  新建/确认弹；banpop 同款 toggle、文档级外点关闭、随宿主销毁、rect 定位越界翻上）；**grouppop.js**
  （关注分组语义：未关注**默认勾未分组**≈原一键、已关注**不预选**防误移、已关注态附「取消关注」）。
  **落地面**：rail 关注角标点开=「选择/更改分组」（旧"单击直接关注/取关"退役，能力不减）；我的页
  新增第三 tab「关注分组」——chips（全部/未分组/各分组(N)/＋新建分组）+ 组头操作（改名/删除，删除
  二次确认「成员移到未分组」，系统组不提供）+ 成员列表（偏移量分页、行显归属标签、移组/取关）。
  契约纯函数下沉 data.js：groupListOf / followListPageOf / newGroupIdOf / 组名·夹名校验（正则实锤）。
- **测试**：新场景 **follow-groups 33 断言**（我的页建/改名/删/移组/取关 + rail 弹层两态 + 两处新建
  入口；写链正确性只在**请求 body 留档**上可见——mock 不回语义）；单测 214→219（契约四组：组表规整/
  成员分页含 no_more 终值/差集定位/名称校验）；**摘修复反跑实证**：改分组误用 action=1、默认预选撤除
  ——两条钉各自转红。lint 干净 + 45 场景全绿；README 依赖图 +relationapi/grouppop/pickpop 三节点与边。

### 0.9.141（2026-10-04）· 评论翻页改自动加载（「加载更多评论」按钮撤除）

- **实报两连**（用户：「加载更多评论 ui 自动加载后仍显示，没啥用就删了吧，现在的逻辑是滚动到底
  自动加载吗」+ 截图：按钮夹在 #9 与 #8 之间）：①**滚动到底自动加载只对经典抽屉成立**——旧实现
  把 scroll 监听挂在宿主 `list` 上，但只有抽屉的 `.acsv-drawer-list` 自己是滚动容器；行内
  （rowkit，活在被 `.acsv-view-body` 滚动的视图流里）与详情面板（momentdetail，被面板体滚动）
  两宿主的 list **从不滚动** ⇒ 那两个宿主里只有按钮能翻页；②按钮在自动翻页后**残留列表中段**
  （append 把新条目接在按钮之后、旧按钮未摘除——正是截图那枚）。
- **修法**：**按钮整体撤除**，翻页改「**哨兵 + IntersectionObserver**」——哨兵挂在当前宿主 list
  末尾，进视口（rootMargin 200px 预取）即续翻；IO 天然对任意祖先滚动容器成立（含 overflow
  裁剪与 transform 位移），无需按宿主换挂，也不再有可残留的按钮。每渲染后把哨兵重挂末尾并
  **重新 observe 一次**：IO 只在交叉状态"变化"时回调，短路页（一页装不满）重挂后状态未变不会再
  回调，靠重 observe 的初始投递续翻；`canLoadMore`（loading / page<totalPage）闸门保证收敛。
  连带退役：`.acsv-drawer-more` 样式与 `CFG.comments.scrollPad`（登记在册）；`scrollList/scrollFn`
  按宿主换挂机制整块撤除。楼中楼「共 N 条回复, 点击查看」的 sublist 分页（按 pcursor）不动。
- **测试**：view-follow 72→73（翻页钉改自动加载形态：无按钮 + 哨兵存在 + 哨兵进视口自动续页 +
  append 不重渲染 + 到底后等一拍条数不变；行内宿主正是"list 不滚动"的实报形态，`scrollIntoView`
  驱动视图体滚动）。**摘哨兵反跑实证**：`follow-cmts-sentinel/autoload/append/stop` 四断言转红。
  单测 214 + 44 场景全绿。

### 0.9.140（2026-10-04）· 三报三修：评论翻页失效 / 子评论日期断行 / 回推荐被重拉

- **A「视频评论加载不全」（用户实报，附截图）**：真机抓包定性（内置浏览器登录态，/v/ac26640967：
  2221 条评论 / 38 页）——`pc-direct/comment/list` **每一页都回 `pcursor:"no_more"`**（页 1 亦如此；
  `page=N` 请求有效、页 38 有货、页 39 空壳）。旧判据把 `pcursor !== 'no_more'` 当附加闸门 ⇒ 恒假
  ⇒「加载更多评论」按钮与触底翻页**永不触发**，所有视频都卡在首页（该样本实测约 37 根/页）＝实报
  现象。修法：根评论翻页**只认 page/totalPage**，另加"越界空页=到底"收口；`commentState.pcursor`
  退役（它只对楼中楼 sublist 有意义——那条链本就按 pcursor 翻，未动）。
- **B 子评论「发表于/时间」断行（实报「换行在中间断开，不好看」）**：名字行是 flex-wrap，长名字
  挤满行尾时会在「发表于」与时间之间断行。修法：两件裹进新的 **`.acsv-cdate`**（inline-flex +
  nowrap）作**不可拆单元**——要么整件留行内、要么整件换行；`.acsv-csub .acsv-cname>span` 的字重
  规则把 700 传给包裹件，楼中楼观感不变（根/子同一构建件，全语境同修）。
- **C 切榜单回推荐视频被刷新（实报）**：dock「推荐」入口自 0.9.107 起是"显式重置"（清列表上下文
  +重拉当前源随机流），副作用是**从任何普通视图回推荐都重拉**。修法：新增 `feedStreamOn`（
  loadInitial 装载置真 / loadDeepLink 置假 / unmount 清），`goFeedHome` 只在"确实要换流"时重置
  ——列表上下文活动（0.9.107 两形态）、当前条来自深链、播放层直达推迟首屏；否则只退出视图/播放层、
  接着看当前条（与 Esc「接着看」语义归一）。
- **测试**：view-follow 68→72（评论桩改两页且照真机形态 `pcursor` 恒 `no_more`：按钮出现→点击
  追加第二页→到 totalPage 收口，兼钉 append 不重渲染）；view-square 36→37（`square-cmt-dateatomic`：
  根/子名字行内 `.acsv-cdate` 且 computed `white-space:nowrap`）；view-zone 41→44
  （`home-return-kept` 钉缓冲条数/游标/当前条 id + **同一 slide DOM 节点**不变——重拉必换新节点，
  比 id 更硬；夹具 feed 是固定样本，id 单独断言会被"重拉后碰巧同 id"骗过）。**摘修复反跑实证**：
  三条新钉各自转红（view-zone 报 `slide=false`）。单测 214 + 44 场景全绿。

### 0.9.139（2026-10-04）· 关注红点短访复亮缺口（水位推进改确定性钩子）

- **病灶**（用户问「你看一下关注页的红点提醒和消失逻辑」→ 通读 + harness 实测复现）：0.9.107 的
  水位推进只挂在轮询里（`poll()` 见关注语境才 `setSeen(now)`），而"进关注语境"只做**视觉清零**
  （followview.buildFollowView / followstream.enterVideos 的 `setDockBadge(0)`）。tick 5s 一跑但
  受 nextAt 闸门约束（亮着时 60s）⇒ **访问短于剩余闸门**时水位原地不动，离开后下一拍把同一批
  `createTime > 水位` 的条目原样数回来 = 复亮同一计数。0.9.107「固定数量未读反复出现」的**间歇版**
  （取决于进出时机，真机体感"时好时坏"）；既有 badge-poll 场景覆盖不到——它全程手动驱动 poll，
  等于假设"访问期内必有 in-view poll"。
- **修法**：水位抽成叶子件 **followseen.js**（零依赖；水位若留在徽标域，followstream 引入它会与
  既有的 `followbadge → followstream` 成环），推进改**确定性钩子**——"进语境且首屏真的到了"即
  `markSeen()`：followview 首屏成功回包内（失败不写——用户没看到内容，不得吞掉）、followstream
  进视频侧（已在流中立即写；全新进入待首屏有货）。poll 的 in-view 分支降级为**兜底**（吸收
  停留期间新到的内容，保持基准节奏）。判定口径不变（徽标 = `createTime > 水位` 条数）。
- **测试**：badge-poll 18→23 断言（**第 6 步=缺口回归钉**：水位压回过去 + 一条越水位可渲染样本行
  → poll 亮 1 → 进视图 → **访问期内零 poll** 直接 Escape → 再 poll 必须不复亮；含"首屏真的到了"
  与"进视图即写水位"两条前置断言）；follow-videos 24→25（`fv-badge-seen-on-enter`）；单测 211→214
  （followseen 叶子：往返 / ensureSeen 幂等 / markSeen 推进）。**摘除修复反跑实证**：badge-poll
  `badge-peek-no-relight` 转红 `text=1 disp=block`（原缺口原样）、`badge-peek-seen-on-load` 同红，
  follow-videos `fv-badge-seen-on-enter` 转红。README 依赖图 +followseen 节点/三条边/绿叶子名单。

### 0.9.138（2026-10-04）· 评论版式全语境统一（三处宿主同一门原生形态；form 分派撤除）

- **由头**（用户问「视频评论抽屉、动态评论展开、动态详情卡片的评论三处的布局渲染是分开来的
  吗，怎么感觉不一样啊」→ 裁决选「2」：抽屉/详情也换成原生形态）：渲染本来就是一份
  （commentkit 单源），差别在 0.9.135 引入的 `form` 分派（内嵌原生页=native 版式，脚本页面=
  自有版式）。
- **修法**：**撤除 form 分派，几何全语境统一为原生形态**——50px 头像（头像框随回 80×70/-15）、
  条目 18px 顶距、无内边距/圆角/hover（扁平列表）、名字 12px、内容缩进 30、楼中楼灰块/头像 30/
  名字 700、「共 N 条回复, 点击查看」居中主题色；同时撤除条目 hover 卡、头像悬停缩放与
  `form` 机制（commentState.form / 宿主判据 / cmtOpts / commentkit / subOptsOf 全清）。
  **皮肤只剩颜色差异**：深色基础值 vs `.acsv-mp` 浅色（含 #e6e6e6 原生分割线色）。三处宿主
  （抽屉/展开/详情面板）+ 行内（关注/广场/内嵌）自动同码。
- **测试**：view-square `square-cmt-av36` → `square-cmt-av50`（脚本页面也是 50px 的统一钉）；
  member-plaza 全套原生版式断言（50/30/700/措辞/分割线）原样通过=同码兼容；单测 211 + 44
  场景全绿。

### 0.9.137（2026-10-04）· 撤除评论「UP」标（真机核对：原生评论组件没有）

- **病灶**（用户实报「A站没有评论区up标识提示」）：我们的评论条在 `isUp` 时自绘红底「UP」标；
  内置浏览器真机核对——A站 pc 评论组件在**视频**（/v/ac26640967，56 条评论）、**文章**
  （/a/ac48885762，19 条）与 **feeds 动态展开区**三域**均无任何 UP 标识渲染**（标题行只有
  名字/发表于/时间），此前自加的标与原生不符。
- **修法**：commentkit 撤除 UP 标渲染（`isUp` 字段不再消费）；styles 撤除 `.acsv-cname .up`
  样式（退役登记在册）；mockComments 数据侧字段保留不动。
- **测试**：member-plaza 根评论样本标 `isUp: true` + 新增 `mp-cmt-no-up`（原生形态不渲染）31→32；
  view-square 同样本 + `square-cmt-no-up`（脚本形态同款）35→36；单测 211 + 44 场景全绿。

### 0.9.136（2026-10-04）· 评论日期两形态统一 + 条目分割线 + 设备件防断行

- **病灶**（用户实报三连：「评论之间有分割线啊，你加了吗／其它地方的评论日期也改一下位置和
  格式吧／加了设备信息后排版都乱了」+ 窄宽截图）：0.9.134 的「来自 x」设备件把 meta 行挤爆
  ——窄容器（抽屉 380px）里各件被压成竖排逐字断行（日期断成两行、"回复/转发/来自"逐字堆叠）；
  日期还留在工具行；且评论条目一直没有原生那样的间隔分割线。
- **修法**：①**日期并入名字行「发表于 x」改为两形态统一**（抽屉/脚本视图/详情面板不再在工具
  行放日期）；②**条目间分割线**（`hr.acsv-chr`，**仅根评论**——native 同款楼中楼不画；深色
  =白 7%、内嵌原生=#e6e6e6；绝对定位贴条目底——item 是 flex 行，直接挂会成第三列）；
  ③**防逐字断行**：`.acsv-cmeta` 加 flex-wrap+row-gap、元信息件 `white-space:nowrap`（整件
  换行不折字）、名字行 flex-wrap、发表于/时间件 nowrap。
- **测试**：view-square 的 `square-cmt-form-svfeed` 改为 `square-cmt-datetitle`（统一行为钉：
  名字行有「发表于」且工具行无日期）+ 新增 `square-cmt-sep`（根有/楼中楼无）34→35；
  member-plaza 新增 `mp-cmt-native-sep`（原生分割线色 #e6e6e6 且楼中楼不画）30→31；
  单测 211 + 44 场景全绿。

### 0.9.135（2026-10-04）· 评论「原生形态」版式（内嵌页语境追平真机）

- **由头**（用户实问「动态评论展开的样式是不是和原生的有差异啊」）：内置浏览器实测真机
  /member/feeds 展开评论区——字段层（红紫名/框/来自/楼层/回复前缀）0.9.134 已对齐，差异在
  **版式**：头像 50×50、时间并入名字行「名字 发表于 1小时前」、工具行不含日期、楼中楼灰块
  缩进 88/头像 30/名字加粗、查看按钮「共 N 条回复, 点击查看」（居中主题色文字链）。
- **修法**：commentkit 增 `form` 形态参数（'native'|'svfeed'）——comments 管线在宿主挂进
  `.acsv-mp`（memberplaza 内嵌根）时判 'native'，抽屉/脚本视图/详情面板维持 'svfeed'；
  **两形态互不影响**（脚本形态继续：日期在工具行、头像 36px）。原生版式 CSS 全在 `.acsv-mp`
  作用域（含 88 缩进/30px 楼中楼头像/700 粗体/原生文案），kit 内两处 DOM 分叉（时间入名字行、
  展开按钮措辞）；`.acsv-cpre` 前缀包裹（原生：灰字+蓝链）。
- **不做**：顶部富文本编辑器（加粗/颜色工具条）——与底部署输入条是两套交互范式，不重造；
  举报功能不引入。
- **测试**：member-plaza +4 断言（时间并入名字行且工具行无日期 / 头像 computed 50px / 展开
  文案原生措辞 / 楼中楼 30px+700）26→30；view-square +2 形态互斥钉（svfeed 形态：日期在工具
  行 + 头像 36px）32→34；单测 211 + 44 场景全绿。

### 0.9.134（2026-10-04）· 评论观感落地（名字等级色/头像框/设备/楼层/回复前缀 + 已赞态实锤修复）

- **字段依据**（真机双源回包核对：视频 sourceType=3 + 动态 sourceType=4）：`nameColor` 0/1/2
  （2=紫 `#964cfd`、1=红 `#fd4c5c`、0/缺失不加色）；`avatarFrameImgInfo`（读序
  `thumbnailImageCdnUrl → thumbnailImage.cdnUrls[0].url`，空=无框）；`deviceModel`（机型串）；
  `floor`（数字）；回复前缀字段**两源不同名**——动态侧 `replyToUserName`、视频侧 `replyToName`
  （+`replyTo` 为目标 uid）。
- **实锤顺修**：已赞态列表真机字段是 **`isLiked`**（`isLike` 字段不存在）——原读 `isLike` 使
  「早就赞过的评论从不点亮、点它还会再发一次赞」，改三读 `isLiked↔isLike↔localLike`。
- **落地**（在 0.9.133 抽出的 commentkit 一处收口）：名字等级色（根+楼中楼，`data.nameColorCss`
  纯函数）；头像框覆盖层**仅根评论**（36px 头像等比 58×50、-11/-11——plaza 50px 配 80×70、-15
  的 ×0.72）；设备「来自 x」链 `//www.acfun.cn/app/`（根+子）；楼层 **仅根评论**（子评论 floor
  是线程内序号且会重复 1，native 不显）；楼中楼「回复 @名 :」前缀（仅子评论，双字段读）。
  行名等级色同源小改：广场映射把 `user.nameColor` 挂进 up + `rowkit.headOf` 内联色。
- **测试**：单测 `nameColorCss`/`frameUrlOf` + 广场 `up.nameColor` 透传（209→211）；view-square
  评论桩扩字段（根：nameColor2/floor5/device/frame/isLiked；子：replyToUserName+replyTo 且
  **故意带** floor 与头像框——钉「根限定：子评论两样都不显」）+6 断言（等级色 computed=紫/
  根有框子无框/根有 #5 子无楼层/设备文本+链接/子前缀且根无前缀/已赞亮态）26→32。

### 0.9.133（2026-10-04）· 评论条目 kit 抽离（commentkit.js；观感追平的动工前置）

- **由头**（用户问「评论区渲染卡片共有几处？能否抽离统一处理」）：全仓审计结论——**条目渲染
  仅一处**（comments.js `commentItem`，4 个内部调用点；抽屉/行内/详情面板三宿主全经它；发送后
  乐观插入同源），评论内容卡（imcard `cshareCard`）亦已单源；真正的耦合点是 kit 直读全局
  `commentState`（交互态 kind 分叉 / sublist 的 sourceId·stype）与浅色皮肤并行调色板。
- **拆法**（同 cards.js 0.9.109 / rowkit.js 0.9.124 纪律，逐字搬运零逻辑改动）：新
  `commentkit.js` = `commentItemOf`（唯一导出）+ `expandSubComments` + `normalizeSubs`/`glyph`
  （内部件不导出）；**无状态**——mode/sourceId/stype 经 opts 注入，comments.js 侧 `cmtOpts()`
  单源出口；点击委托与 back-refs 契约（`_c/_n/_target`）原样留既有位置。comments.js 只留管线
  （状态/宿主/输入条/委托/乐观插入/翻页）。
- **机器证明**：代码行多重集比对——缺失 10 行全为签名/全局读替换点，多出 18 行全为 imports/
  新签名/opts 替换/`cmtOpts`（逐行可控）；view-follow 68 / detail-open 38 断言原样全绿。
  配套：README 模块表+依赖图（comments→commentkit 单向、commentkit→imicons/imgload/ubb）、
  check-direction 特性清单、docs/dependency-audit.md §七 台账。

### 0.9.132（2026-10-04）· 撤除「动态广场」推广条（用户裁决：多余的设计）

- **裁决**（用户实报「关注动态的『按am号查找动态，试试动态广场』的提示可以删了，多余的设计」）：
  /member/feeds 不再注入推广条——成员导航的「动态广场」入口已在同一屏，条幅纯属噪音。
- **改动**：memberplaza 删除注入件 `tryBanner`/`promoEl` 及其全部引用（attempt/healNeeded/
  openPlaza/closePlaza/dropStaleState）；旧 plaza 脚本的 `.plaza-promotion` 残留仍随接管清扫
  （tryInjectNav 两处清扫点）；SPA 自愈相应收窄为入口看护。
- **测试**：member-plaza 断言改版（28→26）：删 `mp-banner`/`mp-banner-back`/`mp-banner-heal`；
  新增 `mp-no-banner`（不再注入）；`mp-takeover` 扩为"旧入口项 + 旧推广条均被清扫、无自有条幅"
  （20→26）；步 7 改为入口重开（`mp-reopen`）。

### 0.9.131（2026-10-04）· 内嵌入口选中态改镜像原生（字体样式对齐）

- **病灶**（用户实报「动态广场选中后的字体样式和原生不一致」）：入口选中态此前自绘
  `.acsv-mnav-active`（色 #ff4b76、字重 600）——真机量取原生选中项（如 粉丝列表/关注动态）
  是**站点自己的类**在管：色 #FD4C5D、字重不变（400）。
- **修法**：撤除自绘样式；选中态改为**镜像原生 active 类名**（`router-link-exact-active` +
  `ac-member-navigation-item-active`）——样式由站点样式表原样接管（含 hover），一致性由构造
  保证；memberplaza 内 `setActive()` 单源（展开=加 / 收回与悬空复位=撤）。
- **测试**：member-plaza +2 断言（26→28）：`mp-nav-active`（展开期两个原生 active 类在场）、
  `mp-nav-active-off`（收回即撤）。

### 0.9.130（2026-10-04）· 内嵌入口子页修复：feeds 子页点击不再静默无反应

- **病灶**（用户实报「还是不行，点了没反应」；控制台线索定位到 `/member/feeds/following`）：
  点击决策此前用 pathname 前缀判断（`/^\/member\/feeds(\/|$)/` 把 `/following`、`/fans` 子页
  也算作 feeds 主页）→ 子页上 `openPlaza()` 找不到 `.ac-member-feeds` 宿主（真机实测子页容器
  是 `following-panel`/`fans-panel`）→ 落入"轮询等宿主"分支 → 10s 后静默放弃 = 点击无反应。
- **修法**：决策改回**以宿主存在为准**（plaza enterPlaza 原语义，不看路径）——`entryPlan()`
  四态：refresh（已展开，再点=刷新）/ open（宿主在场，就地展开）/ wait（feeds 主页面宿主未
  就绪，轮询补开）/ redirect（其余——含 feeds 子页与他人个人中心页——GM 旗标 + 跳
  `/member/feeds` 落地自动展开）；`feedsPath()` 收紧为 `^\/member\/feeds\/?$`（推广条/SPA
  自愈的 feeds 判据同步受益）。
- **测试**：member-plaza +3 断言（23→26）：`mp-plan-wait`（主页面去宿主=等）/
  `mp-plan-redirect`（子页路径去宿主=跳转）/`mp-plan-open`（复原=就地展开）。

### 0.9.129（2026-10-04）· 内嵌广场真机加固：SPA 自愈 / 悬空恢复 / 接管旧脚本

- **背景**（真机复现取证）：用内置浏览器（带登录态）在真实 `www.acfun.cn/member/feeds` 上
  注入调试/正式两版产物实测——入口注入、真实点击、就地展开、真数据 20 行渲染全部正常
  （截图在册）；同时暴露三类真实缺陷面：个人中心是 **Vue Router SPA**（导航项带
  `router-link-exact-active`），路由切换会重画导航/feeds 区——①展开态 DOM 被重画吞掉后
  `mpRoot` 悬空，**再点入口只会在死节点上刷新（表象=点击无反应）**；②推广条被重画吞掉后
  不再补回；③与旧 plaza 脚本并存时静态让位——用户会在旧脚本已 sunset 的入口上点击。
- **修法**（三重加固，全在 memberplaza.js）：
  ①**悬空恢复**：点击入口先查 `mpRoot.isConnected`，悬空先 `dropStaleState()` 再重开
  （同型状态在自愈观察器里也会顺手复位）；
  ②**SPA 自愈**：body 级 MutationObserver + 300ms 防抖，仅当"该有的不在"（入口/推广条缺失、
  旧脚本晚到）时补一拍 `attempt()`（幂等，自成即静默；成员页生命周期外零成本）；
  ③**接管旧 plaza**：发现 `.plaza-nav-item`/`.plaza-promotion` 一律移除后注入自有
  （先确认宿主存在再动手，防"删了旧的插不进新的"；晚到的旧注入由观察器清扫）。
- **测试**：member-plaza 场景 +4 断言（20→24）：`mp-takeover`（伪造旧项/旧条→观察器清扫且
  自有唯一）、`mp-stale-recover`（移除内嵌根模拟重画→再点必须重开而非刷新死节点）、
  `mp-banner-heal`（删推广条→观察器自动补回）。
- **真机抽验点（你侧，0.9.129 必装）**：/member/feeds 出现「动态广场」与推广条；点击就地
  展开真数据流；展开后用原生导航来回切页再回来——推广条自动补回、入口再点可重开；若旧
  plaza 脚本未卸载，本次起会被自动接管（建议仍从 Tampermonkey 卸载）。

### 0.9.128（2026-10-04）· 原生 /member 页「动态广场」入口 + 内嵌广场（就地展开，不跳竖刷壳）

- **病灶修正**（用户裁决）：0.9.124–127 吸收动态广场时把「导航注入/推广条/auto_enter」列为丢弃
  （理由"由 dock 入口替代"）——实为**功能缺口**：要在原生 `/member/feeds` 页也能进广场、**保留
  原页浏览观感、不跳 svfeed 全屏壳**。修复=新增 `memberplaza.js`（入口 + 就地展开宿主），渲染走
  **svfeed 单源**（行卡/评论/写链复用现有管线）+ 一层**原生浅色皮肤**（`.acsv-mp` 根类分派；
  色值抄 plaza css 真机验证值：#333 名/正文、#999 时间/计数、#f7f7f7 灰带/楼中楼底、#409bef
  原生蓝链；点亮态沿用 svfeed 单源变量）。
- **入口**（plaza navigation.js 逐行复刻）：成员导航（三选择器）fans 链后插「动态广场」项；
  `/member/feeds` 的 `.ac-member-feeds-header` 后插推广条「按am号查找动态，试试动态广场」+「进入」
  （原版文案/配色）；非 feeds 成员页点击=GM 旗标 + 跳 `/member/feeds` 落地自动展开（auto_enter
  照搬）；并存保险=旧 plaza 脚本已注入时让位不双入口。
- **就地展开**：原生子节点整体隐藏（DOM 保留）→ 插入 `.acsv-mp` → 行点击=不动作（原页语义）、
  行右上补 **am 号锚**（plaza 原物）、分享/评论/赞蕉/表情/图片全走 svfeed 单源；收回=移除+复原
  （点原生「动态」链即收回，**不 reload**——比 plaza 原版优）；展开期再点入口=刷新。
- **列表机械收口 `squarefeed.js` 工厂**：squareview 的加载/五条不变量/24h 窗口消费/发现态轮询/
  新鲜度回填/骨架/三态状态行/回顶抽为宿主无关工厂（root/scrollEl/backTopHost/onOpen/onRow 注入；
  滚动源两方言=视图体 `.acsv-view-body` / window）——squareview 变薄，内嵌宿主共用同一份代码
  （view-square 场景全绿=零漂移机器证据）。
- **boot 限定反转 0.9.47 决策**：`/member` 路径 ensureStyle + setRoot(document.body) +
  watchMemberNav（其余非首页页面维持不注入；无壳环境 toast 元素自备）。
- **测试**：新 harness 场景 `member-plaza`（BOOT_PATH 改写 pathname 至 `/member/feeds` +
  NO_AUTOMOUNT 禁自动挂壳——**无壳前提**验证）：18 断言=入口真实轮询注入/位置/推广条/无壳前提/
  就地展开（行卡渲染+原生隐藏+`#acsv-root` 不存在=不跳壳机器证据）/浅色皮肤 computed 色
  rgb(51,51,51)/am 锚/无壳评论条（含 composer）/无壳大图浮层与关闭/刷新重建（EXTRA 旗标）/哨兵
  防重/点「动态」收回复原/推广条重开。43→44 场景。
- **真机抽验点（你侧）**：`/member/feeds` 出现「动态广场」入口与推广条；点击就地展开（原页
  导航/头部还在、浅色页）；行内评论可开可写；点原生「动态」收回；非 feeds 成员页点击=跳 feeds
  自动展开；与旧 plaza 脚本并存时应只见一个入口（建议卸载 plaza）。

### 0.9.127（2026-10-04）· 广场吸收 S3：发现态轮询 + 新鲜度回填（广场原味收官）

- **发现态轮询**（plaza background 语义收窄到**视图生命周期**）：仅在广场打开时运转（build
  启 / teardown 停——不学 plaza 在任意 /member 页常驻）；骨架=followbadge 同款（固定 tick +
  nextAt 闸门 + 代数丢弃 + hidden 短路），退避逐次翻倍（nextBadgeInterval 显式注入 square 档
  ——退避序列单源）。diff=最大 momentId：有新 → 列表顶部提示条「↑发现 N 条新动态，点击刷新」
  （首拉只建基准，防存量误报新）；点击=重拉第一页整列重建（plaza 原语义；代价=展开态丢弃在案）。
- **新鲜度回填**：免登录列表 isLike/isThrowBanana 恒 false——契约层 squarePageOf 增 **freshIds**
  （窗内且 ≤3h），视图走新端点 **momentapi.momentDetail**（pc-direct 带 Cookie，§2.7 转引）补
  真值，`momentDetailStateOf` 纯函数取五件，patch 回 pi 并 `momentbar.syncRowBar` 同步互动栏；
  失败/行已拆静默（保持列表快照）。正文方言不换（[ac=] 已由 ubb.js 单源渲染）。
- **测试**：view-square +4 断言（fresh-inject 亮态回填 / skip-old 5h 不刷 / up-hint 发现 1 条 /
  refresh-rebuild 重建含新条）；data.test 补 freshIds 两处与 momentDetailStateOf 用例；
  my-sample 页1 支持 `__ACSV_SQUARE_EXTRA__` 注入新条；单测 208→209。
- **真机抽验点（你侧）**：广场页放着等一轮（60s 后首查）——别人发新动态后顶部出现提示条、
  点击刷新列表含新条；新鲜动态的赞/蕉从"不可信灰态"变真值。

### 0.9.126（2026-10-04）· 广场吸收 S2：广场视图本体（dock 第三格 + feedSquare 流）

- **内容**：新 `src/squareview.js`（视图 id=square，dock「广场」order 15 group 0——排榜单
  下面、与推荐/榜单同段；boot 自注册一行）——列表壳沿用关注视图五条不变量（append-only/
  失败不置到底/三态状态行/整页 0 新增判到底/代数丢弃），方言换广场（首页不传游标）；行卡/
  列表委托/行内评论全走 rowkit（与关注同源零漂移）；**24h 窗口判据上移契约层**（squarePageOf
  增窗口收口：超窗逐条剔除+直接判到底——首屏/翻页同此判据）；容器/骨架独立类名
  acsv-sqwrap/acsv-sqskel（防断言串域），状态行点击重试显式接线（首屏失败唯一出口，关注
  视图同注释未接线的缺口在此补上）。`[ac=id@video]` 紧凑方言补进 ubb.js（排裸 ac 号规则后，
  剥先行标签防链接嵌套）+ 单测。
- **测试**：harness 新增 view-square（13 断言：dock 高亮/行卡契约字段/行内评论开合/触底
  续翻/24h 超窗剔除即止/状态行终态/Esc 回舞台；夹具 my-sample feedSquare 页2 含 26h 超窗
  条目）；data.test 补窗口用例；ubb.test 补方言用例；单测 207→208。
- **取舍登记**：IndexedDB 留存**整体丢弃**（plaza 审计：只写不读、全仓无消费面）——"保留
  原有功能"的唯一字面偏离，理由=无功能可保；发现态轮询收窄到视图生命周期（S3）。

### 0.9.125（2026-10-04）· 广场吸收 S1：数据面（feedSquare 端点 + 契约规整）

- **内容**：`CFG.api.feedSquare`（api-new 免登录域，注释载实测语义：单页固定 20、首页不传
  游标、`时间戳:时间戳` 游标、`no_more` 终页、历史约 53h、无转发、**互动态恒 false**）；
  `CFG.view.square.*`（skel/24h 窗口/3h 新鲜窗/scrollPad/backTopAt）与 `CFG.square` 轮询块
  （60s 起步封顶 10min——S2/S3 消费）；`momentapi.listSquare`（**首页省略 query**，与
  followFeedV2 的 pcursor=0 方言不同；URL 逐字护 mock 缝）；`data` 契约层 `PANEL_PARSERS.square`
  （无 resourceId→momentId 取 moment.momentId、绝对 createTime 直走 fmtAgo、user/userInfo
  两形状归一、meta 三计数 + 写链数值态照收不虚改）+ `squarePanelOf` + `squarePageOf`
  （**result!==0 抛错=失败可重试**——「失败不置到底」不变量在传输面兑现）。
- **文档**：docs/api-research.md §2.7 入册（feedSquare 实测转引，来源=plaza 仓积累）。
- **测试**：data.test +2（条目落位/身份判据/失败抛错/终页与空页兜底）；contract.test
  PANEL_CASES 加 square（白名单子集断言兜住 nameColor 等扩展字段不混入）；单测 205→207。

### 0.9.124（2026-10-04）· 广场吸收 S0：抽 rowkit.js（关注/广场共用行卡 kit）

- **背景（广场吸收计划首片）**：广场页（0.9.126 起）与关注·全部页要共用同一套原生骨架行卡
  ——followview 的行卡构建件与行内评论控制器在 pi 契约下自包含，机械抽为 `rowkit.js`。
- **修法（逐字搬迁零逻辑改动）**：followview.js 353→155 行——行卡（原生骨架四段）/九宫格/
  媒体分派/互动栏接线/行内评论宿主控制器/列表级委托迁入 `rowkit.js`（215 行）。两处适配：
  列表委托包成 `wireRowList(list, onOpen)`（末行 rowDefault→onOpen；落点策略留各视图）；
  四处加 export（closeInlineComments/toggleInlineComments/feedRowOf/armExpanders）。
  `feedRowOf` 全通用（分享/评论出口本就是共享件，无需注入）；view 壳/游标方言/rowDefault 留守。
- **测试**：代码行机器比对（预期差集=拆分 import 行+export 变体+wireRowList 包装，逐条列示）；
  单测 205 + 42 场景全绿——`.acsv-frow*` 全部既有断言原样通过＝零视觉/行为漂移的机器证据；
  check-deps 图加 rowkit 节点+六出边、followview 边改画；check-direction 特性清单加 rowkit
  （视图层 kit、与 followview/squareview 同层，口径 B 校准）。

### 0.9.123（2026-10-04）· IM 评审 #2 落地：imshare 拆分 imsend（协议核心）+ sharepanel（面板 UI）

- **背景（此前挂"下次动 IM 顺手"的挂账项，本次点名执行）**：45.9K/1037 行单文件里住着五簇
  ——SDK 加载/注入/补丁、连接重连、发送核心、图片字节管线、分享面板 UI；协议核心与需求
  高频区的面板 UI 同文件，UI 改动牵动发送可靠性表面。
- **修法（纯搬迁零逻辑改动）**：机械抽取（锚点切片脚本落盘 + 代码行机器比对）——`imsend.js`
  （SDK 加载器/tracer 手术/日志黑匣子/连接重连/doSend/sendKernel/withSendRecovery/sendQuote/
  sendImage/sendCmtShare/sendMomentShare/图片字节管线）+ `sharepanel.js`（openSharePanel 一族
  + 「捎句话」注册缝 setChatOpener 与 im-open 哨兵）。边界仅两处可见性调整：getContacts/
  sendOnce 加 export 供面板消费（eslint 精准抓出，正是门的价值）；imshare.js 删除，消费方
  六文件改 import（imdrawer→imsend+sharepanel；comments/followview/momentdetail/rail→
  sharepanel）；搬迁引发的模块名注释校准 13 处（immsg/imgload/net/imdrawer/comments/rail/测试）。
- **测试**：check-deps 图同步（imsend/sharepanel 两节点 + 三边；imdrawer 与四消费方行改指）；
  imsend.test.js（原 imshare.test.js 更名，链收窄至 cfg/net/ui/appapi/immsg）；单测 205 +
  42 场景全绿——im-open 的 chatOpener 哨兵随缝迁至 sharepanel 后照绿（注册链未断的机器证据）。
- **收益兑现**：协议核心与面板 UI 自此独立演化；发送侧单测的独立面已就位。

### 0.9.122（2026-10-04）· 私信转发动态渲染动态卡（富版：extra 载荷 + 双皮肤卡 + 降级链）

- **病灶（用户实报「私信转发动态不会渲染动态卡」）**：非回归、是缺口——动态转发在 IM 层
  从未卡片化。发送侧 wire=「@作者：明文\n动态链」（ubbPlain，无 extra）；接收侧识别器只有
  parseCard（10001）与 parseShare（正则只认 /v/ac），动态 URL 双双不匹配 → 落纯文本气泡。
  IM 层全仓 grep "moment" 零命中（从头就没接过）。连带症状：列表预览把动态链误标 [视频]；
  且动态 wire 首行是 @作者： 形态会过 isCommentShare（识别后不按 kind 优先会被评论卡抢走）。
- **修法（富版一次到位）**：① immsg：RE_MOMENT_URL 收编两形态（PC /moment/am<id> + 官方
  分享短链 m.acfun.cn/communityCircle/moment/<id>），parseShare 出 kind/momentId（视频链
  kind 默认 video，既有语义不动；评论选链规则同收编动态 wire）；新 extra 契约
  MOMENT_EXTRA_KEY+momentShareOf；previewOfMessage 出 [动态]。② data：momentExtraOf
  （pi→载荷纯函数：原始 UBB 正文/配图归一限 9/UP 收窄，momentId 缺省从 href 反推）。
  ③ 发送：momentbar.momentShareItemOf 携 moment 载荷 → imshare.sendMomentShare（extra 通道，
  与 0.9.52 评论转发同纪律）。④ 接收：imcard.mcard（动态卡=引用块+配图行+「查看动态」条，
  骨架根类复用评论卡、皮肤 CSS 继承，新增 mimgs/mimg 两皮肤名）；imdrawer/imnative 按 kind
  先分动态卡（先于 isCommentShare 分流），extra 被剥自动降级 wire 文本态——两态都可读可点。
  ⑤ 预览/列表：imnative.enhanceList 与 previewOfMessage 按 kind 出 [动态]（修 [视频]/[评论] 误标）。
- **测试**：immsg.test +5（动态链两形态/视频 kind 不动/选链收编/载荷往返与空载荷/预览）；
  data.test +2（载荷构造：归一/限 9/回退/收窄）；im-open +2（动态卡富态皮肤断言 + 降级态）；
  im-native 10→13（动态 wire 降级卡/无附言清空/列表 [动态] 不误标）。单测 198→205 + 42 场景全绿。
- **边界**：对方官方客户端无论哪种都只看 wire 文本（协议如此）；extra 存活同 0.9.52 纪律，
  需真机抽验（发送→在自己抽屉看富卡）。文章（/a/ac）分享同族缺口已登记、本次未动。

### 0.9.121（2026-10-04）· hadTracerCrash 水位修复：旧崩溃不再误诊重建

- **病灶（IM 层评审确认）**：`hadTracerCrash` 从日志缓冲 0 号全量扫——已治愈的旧 tracer 崩溃
  （滚动 60 行可滞留很久）会让之后每次普通发送失败都被误诊成"需要重建单例"（无谓重建=
  拆链重连，代价远大于重试一次）。
- **修法**：`logInstaller` 记累计驱逐数 `__acsvImLogDrop`；判据抽为纯函数
  `tracerCrashAfter(lines, drop, fromTotal)`——水位按**累计写入数**（drop+下标）比对，
  驱逐致下标漂移也不失准；`rebuildIm` 新实例连上后推进 `tracerFixedTotal`，此后只认新崩溃。
  **为何不选"重建成功后清缓冲"**：清空会让同页在途 doSend 的 `imLogVerdict(mark)` 水位失配
  → 该发送超时终局 → 恢复重试 → 若原发送实际已成功 = 重复私信；水位+驱逐计数无此险
  （取舍理由写进 imshare 注释）。
- **测试**：新增 test/unit/imshare.test.js（+4 用例：水位前忽略/水位后命中/驱逐补偿/脏输入
  容错）——纯判据零内核可直测，imshare 链在 Node 以惯例垫桩直载通过。单测 194→198 +
  42 场景全绿。

### 0.9.120（2026-10-04）· 原生页结构自检 canary + im-native fixture 扩列表分支

- **背景（IM 层评审）**：imnative 是对官方私信页内部 DOM 的外科手术——官方改版即静默失效，
  而线上唯一在场者是页面里的脚本自己；harness fixture 是自造 DOM，抓不到官方改版。
  故保险拆两层：页内自检（主）+ fixture 契约（补）。
- **修法**：① `structureCanary`（imnative）：启动 10s 后盘点 7 项官方选择器命中，打一行 info
  自证（0.9.29/0.9.42 自证日志传统）；三位功能家族（线程消息/会话列表/容器）全空且页面确有
  `[class*="chat-"]` 元素 → warn 点名 + `stat('native-struct-miss')`（复跑 20s 终判，防慢加载
  冤告警；空收件箱等无 chat-* 元素只留 info）；② 新增 `testHook('nativeStructure')`，
  im-native fixture 扩 `enhanceList` 纯 DOM 分支（会话列表预览改写：`[分享]`/`[评论]` 两形态）。
- **测试**：im-native 7→10 断言（native-list-share / native-list-cmt / native-structure-contract
  ——官方 DOM 契约清单在 fixture 全命中，改选择器必须同步 fixture 与自检清单）；
  `nativeChatEnhance` 钩子驱动范围扩至 `enhance()`（chat+list 同跑）——列表预览改写分支
  此前零自动化覆盖。单测 194 + 42 场景全绿。

### 0.9.119（2026-10-04）· data→ubb 随手下沉：纯文本投影独立为 ubbtext.js，方向清单清零

- **前置检查（用户定的约束）**：ubbPlain 与渲染路径**不共享正则常量**（各函数内联字面量，
  模块级仅 IMG_CDN_OK 且渲染侧私有）——无"正则单源劈半"风险，故只沉纯函数、不动正则。
- **修法**：ubbImText（IM wire 文本化）+ ubbPlain（明文投影）自 ubb.js 下沉到新模块
  `ubbtext.js`（零依赖纯函数家族，逐字搬迁）；消费方改道：data/momentbar → ubbtext，
  comments 拆双 import（renderCommentHtml 仍自 ubb）。**data→ubb 边死**；ubb.js 只剩渲染侧
  （renderCommentHtml/ubbQuoteHtml）。
- **测试**：check-deps 图同步（ubbtext 独立节点 + 三入边；data/momentbar 改边、comments 加边）；
  check-direction **两口径清零**（在册清单清空，进入常驻观察态——方向卫生库存全清）；单测
  194（ubb.test 拆双 import，用例零改动）+ 42 场景全绿。

### 0.9.118（2026-10-04）· slide→comments 接线自附：方向清单再收一条

- **背景**：方向清单缓裁项（0.9.116 留账）。整个依赖=slide 建评论抽屉骨架时的两行接线
  （关闭键 closeComments / 列表委托 commentListClick）。
- **修法（缓裁选项①：接线自附）**：slide 只建空壳 + 注册句柄（setCommentDrawer 现成，
  0.9.48 建）；comments.js 首次打开抽屉时经句柄自绑两处监听（标记打在抽屉对象上——重挂载
  =新抽屉各自绑；监听器随 DOM 拆除，无需解绑）。slide 删 comments import——边死。
  commentListClick 保持导出（followview/momentdetail 的行内/面板宿主各自挂，不变）。
- **测试**：check-deps 无图边可删（slide 在 others 聚合、本就免画）；check-direction 在册
  2 条 → 1 条（剩 data→ubb）；play-deep +2 断言（play-drawer-close-btn 钉自附执行——两处
  绑定同一次调用；play-comments-reopen 铺路）。评论列表委托分支的行为面在全仓本就零覆盖
  （harness 不 mock comment/list，既有缺口非本片引入，已如实登记 docs）。单测 194 + 42 场景全绿。

### 0.9.117（2026-10-04）· 方向诊断 check-direction（V3 关闭后的幸存者）

- **背景**：V3（@family + check-taxonomy 方向规则）经审计关闭——「规则的上游是口径，口径不定，
  候选集就不定」；幸存者为每 Phase 顺手跑一次的**非门禁**诊断。
- **内容**：test/check-direction.mjs 并列两条保守口径——A 正式分层（README 基建层 → 基建/接口
  层之外）、B 特性域（非特性模块 → 特性模块）；在册项带理由、未登记项报警；永远 exit 0。
  首跑即校准一处口径：`topbar→imicons` 曾被 A 误报——imicons 是 README 明示的零依赖解耦点
  （居私信层 subgraph 系出身 placement），视同基础件（同 report→watchledger 的误报自纠）。
  npm script `check-direction`；头注原样留档「口径」句与 V3 关闭缘由；遗留清单（slide→comments
  缓裁 / data→ubb 待沉）入册 docs/dependency-audit.md 第六节。
- **测试**：诊断首跑（校准后）=在册 2 条、未登记 0 条；未动源码，单测 194 + 42 场景回归全绿。

### 0.9.116（2026-10-04）· 方向卫生收尾：input×2 + rail 三边改注入/注册缝

- **背景**：方向审计（v3 关闭时量化）剩下的 5 条候选里，三条同形「事件路由 → 打开动作」：
  input→comments（键盘 c）、input→imdrawer（键盘 i）、rail→comments（右栏评论按钮）。
- **修法**：input 的 api 注入面扩至五键（+toggleImDrawer/toggleComments，player.mount 注入）；
  rail 出 setCommentsOpener 注册缝（player 模块求值期注册 toggleItemComments，先例
  cards.setItemOpener）；两处均保留未注册 no-op 兜底。收边后方向清单剩 slide→comments
  （缓裁：接线自附 vs 登记）与 data→ubb（随手下沉）两条。
- **测试**：check-deps 删 input→comments、input→imdrawer 两条图边（rail 在 others 聚合名单、
  本就免画）；既有哨兵复用证明注入未断——imview-i-login-guard（i 键打到抽屉模块）与
  play-key-comments（c 键打层内条目）；rail 评论键零覆盖 → play-deep +2 断言
  （play-rail-comments / play-rail-comments-close：点击开合并经缝）。单测 194 + 42 场景全绿。

### 0.9.115（2026-10-04）· 反向例外清收⑥（压轴）+ 收官：feedstore↔player 断环，整图 DAG

- **背景**：feedstore（流仓库）的 env.onChange 直连 player.renderWindow——环检测实证它是
  **全图 14 个 import 环的共同枢纽边**（逐条清单见 docs/dependency-audit.md）。
- **修法**：变更通知改 setChangeHandler 注册缝（player.mount 注册 / unmount 注销，与挂载态
  同生共死；`if (scroller)` 守卫连同 renderWindow 整体搬进注册方闭包）。转发保持触发时刻读；
  三条触发线（fetchMore / pumpListContext×2）全部由 player 取流路径发起、晚于 mount——
  注册前静默是死代码而非行为差异。新增 debug **金丝雀**`stat('feed-changed-no-listener')`：
  该状态按论证不可达，可达=未来新触发线违反「无 mount 不取流」假设，第一发即在 acsv-stats。
- **不变量保全**：新增 test/unit/purity.test.js——最小垫桩（0.9.115 实测集，非推测）下 Node
  直载 player.js 不抛，显式补回两次断边后失去的「顶层零副作用」链式检验；route.test /
  followbadge.test 头注按实况校准。
- **收官**：check-deps 新增**规则⑤（任何 import 环即红）**，头注写明边界「无环 ≠ 方向正确」。
  落地后首次全绿：**14 环 → 0 环（整图 DAG）**。审计报告留档 docs/dependency-audit.md。
- **测试**：单测 193 + 1（purity）+ 42 场景全绿；连带注释校准 6 处（attach/comments/session/
  followstream×2/feedstore——「循环先例」表述随环消亡按实况改写）。

### 0.9.114（2026-10-04）· 反向例外清收⑤：imshare↔imdrawer 互 import 环改注册缝

- **背景**：imshare（ImSdk 基建）为分享完成后的「捎句话」直连 imdrawer.openChat——
  imshare↔imdrawer 是全仓两条真环之一（README 在册）。
- **修法**：imshare 导出 setChatOpener 注册缝（先例 views.setItemOpener），imdrawer 模块
  求值期注册 openChat；「捎句话」点击经缝转发，缺席 no-op。注册必达链：home 页
  player→imdrawer→imshare（求值序 imshare 先、注册后；原生页不加载分享面板无此需求）。
  新增 im-open 页哨兵 testHook('chatOpener')——防未来重构悄悄丢注册行导致点击静默 no-op。
- **测试**：check-deps 删 imshare→imdrawer 边；im-open 冒烟 +1 断言（出口已注册）；
  单测 193 + 42 场景全绿。真机抽验点（分享发送→「捎句话」→打开对应会话）由用户在真实
  账号执行——自动化不发他人私信。

### 0.9.113（2026-10-04）· 反向例外清收④：route→feedstore 改 provider 注入

- **背景**：syncHash（地址栏回写）读 FeedStore.items 取"当前条"{id,kind}——基建层（路由）
  直连播放层（流仓库），并构成 route→feedstore→player→route 环。
- **修法**：取件改 setItemProvider 注入（player 模块级注册 () => FeedStore.items[idx]，
  同 setSessionHooks 惯例），route 删 feedstore import。**保持触发时刻读语义**（150ms
  定时器里现读——切流/重置后 items 已清空 ⇒ 残留定时器静默不写，是 cancelHashSync 之外的
  第二道守卫；改成调用时传 item 会破坏它，注释钉在 route 侧）。顺带断 route 环。
  route.test 垫片收窄：链缩至 route→cfg→dbg（模块级读 window），只留 window/__ACSV_DEBUG__
  两项；player 顶层零副作用的隐式链检验由 followbadge 单测继续承担（B6 落地后显式补回）。
- **测试**：check-deps 删 route→feedstore 边；单测 193 + 42 场景全绿。

### 0.9.112（2026-10-04）· 反向例外清收③：sidebar→settingspanel 改 player 注入

- **背景**：dock 齿轮直连 settingspanel（作者自定性"皮肤→皮肤"，可拆一条）。
- **修法**：buildDock 增 hooks 形参（照 buildTopbar 形制），player.mount 注入
  { onSettings: openSettings }；sidebar 删 import。接线点选 player 而非 boot 是硬约束：
  本片撤掉 sidebar 的 import 后，settingspanel 若无人 import 会从模块图掉出（esbuild 只
  打包可达模块、齿轮静默失效）——注入方必须同时成为该模块的可达来源，player.mount 即
  壳的组装点（buildDock 就在 buildTopbar 下两行）。齿轮只存在于 player 建的 dock 里，
  行为零变化。
- **测试**：check-deps 改边（sidebar→settingspanel 删、player→settingspanel 增）；单测 193
  + 42 场景全绿（settings-open/settings-migrate 断言覆盖齿轮入口面）。

### 0.9.111（2026-10-04）· 反向例外清收②：input 去 views/playlayer 反边（playItem 下沉 state）

- **背景**：input（键盘件）直连 views（currentView 视图门禁）与 playlayer（currentItem 层内
  条目）——两条下行反边；其 api 注入面（scrollToIndex/exitFeed）本已存在，这两条属漏收编。
- **修法**：① 视图门禁改 `api.getView` 注入（player 已 import views，零新边）；② 层内条目
  事实下沉 state（`playItem` 镜像 + setPlayItem，与 videoTarget/watchTarget 同族"层内状态
  中介"）——playlayer 在 mountSlide/teardown 同步，itemRef/currentItem 导出整体删除（全仓
  唯一消费者即 input，测试零引用）。刻意不做 player→playlayer import：那会在 B6 落地前
  制造 player→playlayer→attach/route→feedstore→player 新环；状态镜像零新边。
- **测试**：check-deps 删 input→views、input→playlayer 边；单测 193 + 42 场景全绿
  （play-deep/play-cold 断言覆盖层内门禁与 c 键面）。

### 0.9.110（2026-10-04）· 反向例外清收①：topbar 关注 seg 改 hooks 注入

- **背景（架构评审）**：topbar→followstream 是全仓唯一"纯省事型"反向边（基建共享件直连
  特性模块；0.9.99 起登记为例外）——非环、需求仅 2 动作 + 1 状态读、注入点（player.mount
  的 buildTopbar hooks）现成。其余 5 条反向边均有结构原因（环/传参链），各归后续切片。
- **修法**：player.mount 注入三键 onFollowVideos/onFollowAll/getFollowActive；topbar 删
  followstream import——「行为全部经 hooks 注入」的模块契约就此为真。顺带补头注**单例
  语义警告**（buildTopbar 只在首建接收 hooks，二次调用静默忽略 h 参数——防御性怪癖留痕，
  防后来者误用）。撤销该边顺带断掉 views→topbar→followstream→feedstore→player→views
  五节点传递环。
- **测试**：check-deps 删 topbar→followstream 边；单测 193 + 42 场景全绿（view-follow 68 /
  follow-videos 24 / badge-poll 18 断言覆盖 seg 显隐与切换行为面，零行为变化）。

### 0.9.109（2026-10-04）· 视图层拆件：卡面 kit 独立为 cards.js

- **动机（架构评审）**：views.js 混住两职责——视图生命周期编排（current/origins/舞台/路由
  同步）与卡面构建（rowOf/gridCardOf/…250+ 行）；mypage 等视图要 import「编排模块」来拿
  一张卡，职责错配是视图层体感乱的根源。
- **修法（机械搬迁零逻辑改动）**：卡面 kit 段 + skeletonRows + 点击出口注入缝
  （setItemOpener/openPanelItem/setMomentOpener——kit 闭包直读注入缝，必须随件走，留在
  views.js 会成 cards↔views 环）整体搬入新模块 cards.js；views.js 只留 5 个编排导出
  （currentView/originView/backFromOrigin/syncRouteView/teardownViews），卡面符号零残留。
  六消费方（mypage/zone/searchview/followview/momentdetail/playlayer）只改 import 路径；
  类名/签名/testHook 一字符未动；长注释全量随迁（0.9.67/68 水印宿主契约、gridCardOf 事实
  规格段、quoteBlockOf 原生实测值）。顺带订正两处过期注释（momentMediaOf「详情面板
  gridMin=2」、momentCellOf「面板宫格共用」——详情面板 0.9.103 起自带轮播/大图挂法）与
  搬迁引发的模块限定注释名（7 处 views.xxx → cards.xxx）。
- **测试**：check-deps 图同步（cards 隐式节点 + 六入边 + 四出边，views 旧 kit 边移除）；
  单测 193 + harness 全场景回归全绿（全部黑盒类名/几何断言照旧定位——红线"形状冻结"的
  机器证据）。

### 0.9.108（2026-10-04）· 大图查看器层级修复

- **病灶（用户实报「图片查看器层级在动态详情之下，会被动态详情覆盖」）**：大图查看器
  z=60、动态详情面板 z=61——从详情面板内部开大图（0.9.98 起的宫格/轮播点击）必被面板
  背板盖住，只见暗色面板不见图。档位自 0.9.96 详情面板引入时即错位（当时无面板内开图
  路径，未暴露）。
- **修法**：`.acsv-imgview` z 60→**63**（浮于详情面板 61 与设置 62 之上——从任意面板开
  的图都必须是最上层；更新弹窗 65 仍在顶）；同步修正三处 z 档位注释（styles.js 顶栏避让/
  dock/面板段的「大图(60)」引用）。
- **测试**：detail-open +1 断言（`detail-imgview-z`：面板内开图后 computed z 比较，
  40+ 与 63 必须更大）。38 断言全绿；42 场景回归。

### 0.9.107（2026-10-04）· 三修：dock 推荐失效 / 转发源多图链 / 未读徽标改时间水位线

- **A dock「推荐」在带上下文的舞台上失效**（实报两形态：进视频后点推荐没反应 / 从全部回舞台
  仍是视频流）：旧实现只赋裸 hash，舞台已带列表上下文时 hashchange 链零重置。修法：
  player 新增导出 `goFeedHome()`（清 FollowVideos/UpVideos 上下文 → cancelHashSync/
  resetHomePager/setAppliedMid/resetStream/FeedStore.reset → loadInitial → 改 hash 走视图退出
  链；**hash 已是裸 #svfeed 时显式补跑 syncRouteView**——dock 高亮/seg 显隐需显式同步，
  首跑实锤）；sidebar 经 `setFeedHomeHandler` 注入（先例 setItemOpener），无回调兜底裸 hash。
  **Esc 回舞台保持「接着看」语义**（对照注释在册）。
- **B 转发源动态（rs10）多图链**（实报：「两张图只渲染一张」+「从引用卡进详情是纯文字样式、
  实际有图」同根）：实测样本 外层 5104362 → 源 5104327，**列表载荷 `rs.moment.imgs` 就有
  2 张**（另发现一条源带 6 张）——病灶=0.9.102 rs10「无样本最小形态」只取 cover 首图、且
  `momentPiOfRepost` 未透传 imgs。修法三处贯通：契约 rs10 补 `imgs`（与主动态同款映射，
  抽出 `imgsOfMoment`）；引用卡渲染改**行流九宫格**（n1/n24、格子自挂大图；无 imgs 才退
  cover 单图；补 `.acsv-gquote .acsv-frow-imgs{max-width:100%}` 防面板 340 溢出）；
  `momentPiOfRepost` 透传 imgs → 从引用卡进详情：两栏 + 轮播出图。
- **C 未读徽标改时间水位线**（实报「固定数量的未读反复出现」）：实测（2026-10-04）
  `followUpers[]` 只有四字段**无时间戳**、是 UP 级**服务端长期不清**的标记（重载原生
  /member/feeds 前后同一批 UP 纹丝不动、期间无任何清未读请求）——旧实现"布尔计数+进视图
  本地清零"⇒ 下一拍原样复亮同一固定数。**关键发现**：webPush 顶层 `feedList` 是新内容条目流
  （带毫秒 createTime）；但 webPush 无动态，水位源改用 **followFeedV2**（混合流含动态）。
  修法：持久水位 `acsvFollowSeenAt`（GM，无 GM 环境内存降级；首装初始化=now 防误报）→
  徽标=首屏 `createTime > 水位` 条数；**进关注语境期间 poll 自持推进水位**（看过即已读，
  且保持基准节奏把落后窗口压到 60s）→ 离开后不复亮、UP 再发新内容亮真实新增数；退避/
  hidden 短路/未登录静默全保留；momentapi.unreadCount 退役（webPush 常量留档备用）。
- **测试**：badge-poll 场景重写 18 断言（水位线全链：空手不亮/新内容亮真实数/退避 60→120→
  240/进语境水位推进且不打扰/离开不复亮（核心）/再发新亮 2）；follow-videos 24 断言
  （+dock 推荐两形态 + 源 seg 恢复）；view-follow 68 断言（+源多图宫格 2 格 + 引用卡进详情
  split/轮播 2 slide）。42 场景全绿；单测 193。
- **回归坑（两处首跑实锤）**：goFeedHome 在 hash 已裸时需显式 syncRouteView；badge 场景
  夹具曾用"未来时间戳"（真实 createTime 必在过去）。

### 0.9.106（2026-10-04）· 架构重构：列表上下文工厂 + 动态域接口收口（用户三问的根因）

- **背景（用户三问）**：「关注页在和推荐页抢竖刷组件吗？组件不能抽出来共用吗？」「动态的接口
  放进接口模块统一管理了吗？」——0.9.105 已答一半（竖刷舞台本就共享、端点已全在 cfg），
  本版收**真债务**两笔：
- **债务一：列表上下文两套 + 双上下文互踩**（实锤：空间流激活时进关注视频流，getListContext
  优先 UpVideos ⇒ 关注列表永不被泵且无清理路径；switchSource 也只清关注侧）。
  修法：新模块 **feedctx.js**——①`createFeedContext`（8 核心字段 + reset 单源；UpVideos/
  FollowVideos 都由此生成，UI 壳各自挂）；②`runChain`（链式加载状态机单源：上限/间隔/
  done/failed/chainCapped 判定一处收口，两侧只提供各异的 loadPage——uppage 仍 gmRequest
  通道、关注流仍 net.request，通道不换）；③**注册表 + 单活互斥**（activateContext 清其余，
  替代"优先序兜底"）——空间格点击/enterVideos 互相清场，player 显式换源补清空间侧。
  单测 5 条钉状态机（推进/到底/上限截断/reject 不卡死/单活互斥）。
- **债务二：动态域请求编排散落**（端点已在 cfg ✓，但 followview/followstream/followbadge
  三处各拼查询串各解析）。修法：新模块 **momentapi.js** 收「关注/动态读」三条
  （listMoments/listVideos/unreadCount）+ 落点拼串；**URL 形态逐字保持**（harness mock 按
  子串命中）；边界登记：评论管线属评论域留 comments.js、写链在 interact/appapi 不动；顺修
  imshare token/get 内联硬编码（重复 cfg.api.token 的第二份）。
- **回归中抓到的两处契约错配（同版修复）**：loadFollowPage 迁 fetch 收口后返回值形状变了、
  enterVideos 仍按旧形状读（feedCursor 不设/深链不跳——harness fv-deeplink 一击命中）；
  以及 followbadge poll 未 return 导致 await 语义少一层微任务（badge 退避断言假红）——
  均按新契约改齐并把 loadFollowPage 契约写清 `{loaded, page}`。
- **测试**：单测 193（feedctx 5 条新增）；harness 42 场景全绿（follow-videos 19/view-follow
  66/detail-open 37 不变——重构行为不变由全量保护）。README 依赖图 +feedctx/momentapi 两
  节点与 8 条边。

### 0.9.105（2026-10-04）· 关注/详情整批整修（用户实报九项 + 架构三问）

- **A 详情左区改多图轮播**（用户裁决；XHS 实测对齐 2026-10-04）：track translate3d 平移 +
  箭头 60×60 垂直居中 + 底部分页点 + **滚轮**（媒体区 wheel passive:false，preventDefault +
  逐格，XHS 实测同款：dispatch 后 defaultPrevented=true、页面不滚、wrapper 平移一张）；循环；
  单图不轮播；slide 点击开大图。
- **B 作者名统一蓝**：行流 `.acsv-frow-name` 与面板头名字 → #57a9f5（引用卡 @源UP 同源；
  实报「灰字在黑底不显眼」）；面板头名字 span→真链接（userBase+up.id）。
- **C UBB 吸收广场资产**：字面 `[表情]` 灰字占位（+data 供回填）、emot 正则容差（斜杠可选/
  数字 id）、`#话题#`→站内搜索、裸 `ac123`/`v/acN` 转链、`m.acfun.cn` 动态短链→momentBase；
  行内规则排在 `[resource]` 前（靠顺序等价广场的保护块，剥壳防 <a> 嵌套）。**不吸收登记**：
  `[ac=]` 方言（广场自家数据源）、保护块机制（顺序 replace 已稳）。配套：三处正文表情/图片
  尺寸作用域（34/68——实报「动态卡不支持 ubb 解析吗」真凶=表情图自然尺寸≈80px）、面板与
  引用卡正文补 pre-line、白名单自 ubb 搬至 emoticon（表情域）、`emotImgOf/emotPlaceholderHtml/
  refillEmoticons` 三件套 + 行流 `ensureEmotionMap` 预热回填（不再赌"别处先加载"）。
- **D 展开截断**：`.clamp` max-height:84px → `-webkit-line-clamp:4`（像素硬裁切半行 → 行盒级
  裁剪）；armExpanders 图片 load 后重测（img 无尺寸属性时首测不准）。
- **E 引用卡标题换行**（实报「省略号截断、卡片有显示空间」）：引用卡内标题 2 行 clamp、
  藏摘要；顶层行 strip 保持原生单行。
- **F 共用资产抽离（用户点名）**：新模块 **momentbar.js**——键定义表 + 写链编排单源，行流卡
  与详情面板同源、skin 分皮肤（类名沿用旧值防测试钉子）；**面板互动栏四键统一**（分享/评论/
  蕉/赞，补上面板的分享入口）；CSS 行流 `.acsv-fact` 族 scope 到 `.acsv-frow-acts` 防面板
  吃 48/42 尺寸。momentdetail 头注「乐观更新不抽公共件」裁决条目按递进史修订。
- **G 分享卡定位**（裁决几何）：`openSharePanel` 增 `opts.place`（rect 计算落宿主内容坐标系
  → 随列表滚动跟随）：行流=右缘挨行左缘 12px、底部共用坐标；面板=左缘挨面板右缘、底对齐；
  空间不足**翻转**兜底、锚下空间不足**压缩弹层高度**（内部滚动）；RO 引用保留（局部
  observer 会被 GC 停观察——底对齐漂移实锤）。默认无 place 调用（rail/comments）零改动。
- **H 私信×详情共存**（裁决「左移避让」）：根因=面板占 claimDrawer 槽被 IM 驱逐拆面板——
  面板/行内宿主**不再占槽**（互斥改双向显式收：openComments 见宿主先收）；`acsv-with-comments`
  根类下面板 `padding-right:var(--acsv-dw)` 左移避让（复用既有避让体系+过渡）；`.acsv-msgdrawer`
  z 62（浮于面板 61 上）；imdrawer 加 debug testHook。
- **I 回顶按钮**：'↑' 文本 → `.acsv-tbtn` 圆钮 + chevUp SVG（顶栏图标语言统一）。
- **J dock 高亮修复**（架构问一实锤）：舞台深链 r.view=null → syncDock 回落「推荐」——
  改经 `feedstore.listContext()`（新导出）读上下文 `dockView`（FollowVideos='follow'），
  深界面空链兜底同款；follow-videos 场景补 dock 断言（原无 dock 断言=漏网处）。
- **K 无图动态的官方封面修复**（实测量化）：29 条动态 21 条无图且 coverUrl 恒非空——三类
  来源（官方默认封面池/转发源封面/用户图）都不是"本条配图"。契约层 ct=moment 不再赋
  `it.cover`、渲染层去 cover 兜底、详情 hasMedia 只看 imgs（转发源卡 repost.cover 不受影响）。
- **与架构三问的关系（详见 0.9.106）**：竖刷组件本就共享（stage 唯一实现，FollowVideos 是
  第二数据上下文）；真债务=双上下文互踩清理 + 上下文核心重复——0.9.106 收。
- **测试**：单测 188（UBB 新规则 ×5 + 占位/回填形态更新）；harness：view-follow 66（分享几何
  实测 1600×900 桌面视口/UBB 话题与裸 ac 渲染/引用卡换行/回顶 svg）、detail-open 37（轮播
  三向/四键/分享几何/私信共存避让 0.2s 过渡等待）、follow-videos 19（dock 高亮）；三场景
  视口固定 1600×900（几何裁决坐标需行侧留白）。全绿后提交。

### 0.9.104（2026-10-03）· 关注语境三处实报：源 seg 冲突 / 蕉黄 / 投蕉数量层

- **① 舞台放关注流时冒出「小视频/推荐」栏**（用户实报）：源切换 seg 与关注 seg 在舞台态
  语义冲突（换源=退出关注流），此前只有视图态由 CSS 隐。修法：`syncFollowSeg` 补 inline
  显隐——`view==null && feedActive` 时隐源 seg，退出关注流复位（视图态仍归 CSS）。
- **② 已投蕉的颜色**（用户实报「是黄的」）：视频侧（rail）与原生都是锁定**蕉黄 #ffb323**
  （styles 注释在册「A 站蕉色」），而关注行流/详情面板的蕉「已投」态此前与点赞共用 `.on`
  的 accent 红。修法：蕉态拆色——行流 `.acsv-fact.thrown` / 面板 `.acsv-mdl-ban.thrown`
  统一蕉黄（点赞保持 accent 不变）。
- **③ 动态单蕉 vs 视频/文章五蕉**（用户口径「和视频机制一样」）：动态行维持单蕉直投
  （官方机制=一蕉，resourceType=10）；**视频/文章行接视频页同款数量层**——默认全灰、悬停
  第 N 根 1~N 一起亮、点第 N 根投 N、已投过不可再展开（toast 提示）。实现：数量层自 rail
  抽出共享件 **banpop.js**（toggleBananaPop(btn, {send, applied})，rail 改调、行为不变；
  eslint 图片白名单加相同理由=站点静态图标两态切图）；`throwBananaPi(pi, count)` 扩展
  resourceType 映射（动态 10/视频 2/**文章 3——enum 与 follow feed 一致，未实测**：写链测试
  纪律不能对他人文章投蕉，失败态由 toast 兜底）；文章行投蕉自此启用（**点赞仍只读**）。
- **测试**：harness `view-follow` 61 断言（+8：数量层 5 选项/悬停 1~N 亮/点 3 投 3 计数与
  resourceType=2/蕉黄 rgb(255,179,35)/已投锁定不弹层/文章 rt=3 投 2）、`follow-videos`
  18 断言（+1：舞台态源 seg 隐藏）；my-sample 补 banana/throwBanana 桩（记 body 供断言）。
- **顺修**：单测「2 小时前」时刻断言半夜翻车（跨零点落「昨天HH时MM分」档，与同 file 其它
  用例的双档惯例不一致）——按既有惯例改双档。
- **回归**：lint 干净、check 三项过（banpop 入 others 聚合）、单测 183 全绿、harness 42
  场景 0 失败（首跑曾出现一次未复现的偶发 FAIL，连跑三次全绿，未定位即无事实记录）。

### 0.9.103（2026-10-03）· 动态详情页改版：小红书式两栏

- **背景（用户裁决「动态详情页可以模仿小红书」）**：详情面板自 0.9.96 起是单栏 680 宽。
  按小红书详情页形制重做——**动工前实测**（xiaohongshu.com 详情页 computed style，
  2026-10-03，标注入 styles 段头注）：容器 904×672 圆角 20 深色 #121212；左媒体区 504
  黑底（圆角 20 0 0 20）/右栏 400 三段式：作者行 81（头像 40 圆、名字 16px
  rgba(255,255,255,.8)）、滚动区（内容 padding 0 20 20、正文 **16/24**、评论标题
  「共 N 条评论」14px）、底栏（输入框+图标键）；✕=40 圆浮于卡片外右上。
- **两条用户口径（问答定案）**：①互动栏（赞/蕉/评论）**留在内容底部**（不搬进底栏），
  卡片底部仍是我们的输入条；②**按内容型换布局**——有自有图（单图/多图非转发）=两栏，
  无图/纯文字/转发=单栏收窄（转发卡自带源缩略图，左区再放源封面重复）。
- **修法**：momentdetail 重构——`split = !repost && (imgs.length || cover)`；两栏态
  左栏 `.acsv-mdetail-media`（黑底/contain/左圆角）装既有 panelGrid/panelSingle，右栏
  `.acsv-mdetail-side`（400）= 作者行（XHS 尺寸；gmom 类名复用处显式覆盖，0.9.96 教训）
  + 管线 list + 输入条（**host.el 指 side**——管线三件套 append 到 h.el 末尾天然贴右栏底）；
  单栏态收窄 min(620px,94vw)，转发卡走 quoteBlockOf。✕ 移背板浮层（XHS 同款）。
  comments 管线加可选 `h.titleFmt`（缺省「评论 N」不变；面板传「共 N 条评论」）。
  正文 16/24 对齐 XHS；面板圆角 20；窄屏（<860px）回落单栏、媒体转上方 38vh。
- **测试**：harness `detail-open` 28 断言（+单栏无媒体列断言、+两栏 split/media/side/输入条
  在 side 断言、标题文案改 XHS 式）；可视化目检两栏/单栏各一张（媒体列/右栏三段/✕ 浮层
  落位正确）。单测 183 不变（无契约变化）。
- **回归**：lint 干净、check 三项过、单测 183 全绿、harness 42 场景 0 失败。
- **明确不做（backlog）**：作者行「关注」按钮（XHS 有；写链+状态回填是新功能面）、
  底栏窄输入框+展开交互（口径①已改）、图片轮播（我们宫格/单图形态）。

### 0.9.102（2026-10-03）· 关注页收口：死代码清理 + 共享件抽取 + 引用卡完全照原生

- **背景**：0.9.98–0.9.101 连改四版（多图/双面/还原度/交互），代码评审发现两类欠账：
  ①0.9.100 行流重写遗留的死 CSS/死配置；②同一概念两套实现（媒体块、写链）。用户裁决
  两处口径后一并收口。
- **A 死代码清理（零行为变化）**：styles 删除并逐条登记（0.9.83 先例）：`.acsv-ggroup`×2
  （分组标题随行流退役）、`.acsv-gkind`、`.acsv-follow*` 网格规则、「卡面 v2」段头、
  `.acsv-gart*`×5、`.acsv-gmom` 根卡、`.acsv-gmom-flag`、`.acsv-gmom-text`、
  `.acsv-gmom-quoted`×2、`.acsv-gwide` 陈旧注释；cfg 删 `followStream.pageSize`（无消费，
  服务端钳制事实在 §2.1.2）。**「转发旗标」需求作废登记**：原生实测 50 条转发内「转发」
  文字 0 次——转发由引用卡形态表达（0.9.92 需求据此关闭）。
- **B 共享件抽取**：①媒体块：`views.momentCellOf`（大图挂法单源）+ `views.momentMediaOf`
  dispatcher（repost/宫格/单图分派；行流 gridMin=1 原生 px、面板 gridMin=2 模态栅格——布局
  有意分叉入注释）；②`views.stripOf`（资源横条构建件自 followview 下沉，行内与引用卡内嵌
  源卡共用——原生同款 markup 复用）；③`interact.likePi/throwBananaPi`（pi 级写路径单源，
  followview 与 momentdetail 改调；rail/comments 维持不并入，0.9.96 裁决的「三处语境各异」
  前提对这两个同 pi 契约的消费面不再成立，注释更新）；④`views.skeletonRows`（mypage/
  followview 各传独立类名）；⑤`.acsv-fseg` 并入 `.acsv-seg` 修饰类（pill 样式不再第二份；
  两处隐藏规则带 `:not(.acsv-seg-follow)`，fseg 显隐仍只由 syncFollowSeg 控）；⑥
  `CFG.api.momentBase`（散落三处字面量收口）；⑦`data.momentPiOfRepost`（契约字段不再由
  UI 层拼装；`setMomentOpener` 载荷改 repost）。
- **C 引用卡完全照原生（用户裁决）**：按原生实测（§2.1.1 追补：repost-content 灰块
  padding 10/左出血 -10/无竖线；repost-up 14px #666 下距 12 + **蓝链** rgb(64,155,239)；
  内嵌源卡与顶层同规格；rs10 源=纯正文无封面）重做为「@源UP 行 + 完整源内容卡」；契约补
  `dur/views`；rs10 正文走 UBB 单源渲染（原生同款含表情图）；@源UP 是独立落点（→源UP主页，
  锚点不冒泡），源卡三落点不变。0.9.92 期「缩略图+类型字」自创形态退役。
- **D seg 显隐收紧（用户裁决）**：仅「关注视图开」或「舞台态+关注流激活」可见（此前
  feedActive 常驻导致我的/榜单等视图里常显）；与徽标抑制的 `isFollowContext()` 是两个
  用途（宽松/严格），两侧注释写明。
- **E 文档漂移修正**：momentdetail 陈旧注释（源条已可点）、styles 段头注（101/102 现状+
  退役登记）、topbar 头注（fseg 直接 import 例外）、README 两行。
- **测试**：单测 183（repost 契约 deepEqual 补 dur/views + `momentPiOfRepost` 纯函数用例）；
  harness `view-follow` 53 断言（引用卡原生形制断言重写 + 宫格点图开大图新断言）、
  `follow-videos` 17 断言（+seg 收紧：进我的即隐/Esc 回舞台恢复）。
- **回归**：lint 干净、check 三项过（依赖图去 followview→appapi、momentdetail→appapi 两
  条死边，+views→imgview）、单测 183 全绿、harness 42 场景 0 失败。真机验收：引用卡
  目检（对照原生）+ 转发三种源的点按。

### 0.9.101（2026-10-03）· 关注行流交互补课：五处实报逐条修

- **病灶（用户真机五点实报）**：0.9.100 的结构量取到位了，但交互层还有一套账——
  ①「评论展开逻辑没做吗」②「表情面板打不开」③「投蕉图标用错了」④「动态卡片应该居中」
  ⑤「转发卡片，点击转发的内容小卡不会打开播放」。
- **①+② 同根：评论区内点击冒泡 + 宿主无定位（两处都得修）**
  - 冒泡：行级委托只挡了互动键，评论区内部（评论条目/输入条/表情按钮）的点击冒到
    `rowDefault`——点一下表情按钮就把评论区关掉换详情面板。修法：委托入口加
    `closest('.acsv-frow-cmts')` 早退（评论区有自己的 commentListClick 委托）。
  - 定位：`.acsv-emotpanel` 是 `absolute;bottom:57px`，靠宿主定位——行内盒无 `position`
    时它逃逸到 `.acsv-view-body` 底缘（看起来就是打不开）。修法：`.acsv-frow-cmts`
    加 `position:relative`（输入条/回复条同宿主，一并归位）。
  - 顺带：**视频行也原位展开评论**（原生 member-feed 三类条目同款交互；stype=3——
    www 视频的 comment sourceType，data.js normalizeHome 同值；sv=5 是 meow）；文章评论
    stype 未实测，仍外链官方页（宁可漏不错）。
- **③ 图标码点**：原生 member-feed 互动行实测采样（2026-10-03 内置浏览器 charCodeAt）：
  分享 **E628** / 评论 E627 / 蕉 **E62A**（点亮 E65F）/ 赞 E629（点亮 E660）。0.9.100 里
  分享误用了站点头部的 E15B（GLYPHS.share）、蕉误用了竖刷侧栏的 E2EA（GLYPHS.banana）；
  修法：imicons 补 `feedBanana/feedBananaFill`，行内与 momentdetail 互动栏改走
  `feedRepost/feedBanana(+Fill)`（点亮换字同原生 path/fill 双态）。
- **④ 居中**：`.acsv-frows` 补 `margin:0 auto`（原生 member 页 870 列居中，此前左对齐）。
- **⑤ 引用块可点**（原生同款：官方源条就是指向源内容的链接）：契约层 `repost` 补
  `id`（落点）+ `up`（播放层首帧作者/详情面板头像）+ rs10 补 `text`（源正文原文，详情面板
  用）；`quoteBlockOf` 挂点击——视频→播放层（openPanelItem 注入出口）、文章→官方页新窗、
  动态→详情面板（`setMomentOpener` 注入，views 不反向依赖 momentdetail；未注册外链兜底）；
  无 id 的旧数据保持静展示。
- **测试**：单测 182（转发源契约改 deepEqual 钉 id/up 全形）；harness `view-follow`
  51 断言（+冒泡守卫/视频行内评论 stype=3/图标码点逐字面/**表情面板可开**/引用块三落点）。
  **测试自身踩坑登记**：引用块→播放层的等待条件只写 hash+`.acsv-slide` 会被同步满足
  （hash 是 openPlayer 同步写的、舞台本来就有 slide）→ case 抢在 hashchange 前按 Esc，
  播放层从未挂载、后续断言全打在游离 DOM 上假绿。等待条件必须钉**层已建**的可观测面
  （`view==='play'` + `.acsv-slide[data-ovl="1"]` 哨兵），返回同理钉「视图已恢复」。
- **回归**：lint 干净、check 三项过、单测 182 全绿、harness 42 场景 0 失败。真机验收：
  五点实报逐条复看 + 行内评论发删（自有动态）。

### 0.9.100（2026-10-03）· 关注行流还原度重构：按原生骨架重做

- **病灶（用户实报「无限画布不还原，违背尽量复用原生设计的原则」）**：0.9.99 的行流是
  自创暗色卡（圆角卡片底、头像 40、名字 13px、时间右侧、互动行加边框、时长常显角标、
  data-n 三列九宫格）——形不是原生形。本轮按**广场复刻法**重做：先读广场 renderer.js/css.js
  （逐类名复刻原生 DOM + 互动行直接抓原生页活的 .feed-interactive 复用），再用内置浏览器
  量取 /member/feeds 的 computed style 与样式表规则（量取日 2026-10-03，全部入 styles 注释）。
- **原生量取 → 结构对齐**：扁平列表（条目无底色无圆角，条目间 10px 灰带=feed-separate，
  实现用相邻行 border-top）+ 头像 50 圆 + 名字 16px 链接（hover 红）+ 时间块级在名字下 +
  内容区 60px 缩进（正文/媒体/互动与名字左对齐）+ 正文 14/21 **pre-line** + 九宫格原生形制
  （容器 342/图 110 方 margin 0 4 4 0/1 图 299 自适应/2、4 图 228）+ 视频横条**左右两块灰底
  拼合**（cover 204 + body padding 10/14；title 16/600 单行省略；desc 12/18 两行 clamp；
  info 绝对定位 bottom 13 left 14）+ **时长 hover 浮层**（原生 video-time 同款，非常显角标）+
  文章红角标右上（resource-tag 同位）+ 互动行 48px 高/右距 42/12px/hover accent，
  分享=icon+「分享」文字（原生无数字）。颜色暗色换算对照表在 styles 关注段头注
  （#333→#e8eaee、#f8f8f8→rgba 白系面、#999→#8a90a0、hover→accent）。
- **交互还原**：图片（九宫格/单图/正文配图）点击开大图（原生 cursor:pointer 同款）；
  **评论键原位展开评论区**（用户裁决）——comments.js 管线 host 化复用
  （openCommentsHost 挂行内容器：列表+输入条+表情面板+计数回写全套），开新行先显式关旧行
  （claimDrawer 同槽重入不互收），行内列表补 commentListClick 委托（点赞/回复/配图大图），
  registerView 补 teardown 清宿主；行本体点击仍开详情面板（与行内评论经同槽互斥）。
- **修法取舍**：0.9.98 的 data-n 三列九宫格规则随之退役（行内换原生形制；详情面板
  .acsv-mdetail-imgs 不受影响）；评论交互不再经详情面板一条道。
- **测试**：harness `view-follow` 重写 42 断言（三类行原生骨架判别位/互动行四键/赞乐观
  两向/原位评论区[展开、计数回写、再点收起、开新关旧互斥]/展开收起/无限滚动/状态行/
  append-only）；单测 182 不变（无契约变化）。摘要：摘全局 SV 夹具的教训复用（loadComments
  见 __ACSV_MOCK__ 真值走内置 mockComments，detail-open 同款处置）。
- **回归**：lint 干净、check 三项过（依赖图 +followview→comments）、单测 182 全绿、
  harness 42 场景 0 失败。真机验收：还原度目检（对照原生页并排）+ 行内评论发删（自有动态）。

### 0.9.99（2026-10-03）· 关注语境双面：顶栏「视频|全部」+ 竖刷流 + 仿原生无限流

- **背景（用户裁决）**：关注页改双面——顶栏 seg 左「视频」右「全部」（像推荐页的源切换），
  视频侧=首页竖刷样式播关注视频、全部侧=仿原生 /member/feeds 单列无限流；默认落在全部。
  roadmap D1 随之修订（v1.4）：竖刷化仅限**纯视频子流**，混合「全部」仍是列表——D1 对混合
  源的理由原样成立。
- **视频侧（followstream.js 新模块）**：数据源选官方视频 tab 端点 `followDougaFeed`
  （动工前登录态实测入档 §2.1.2：count 被忽略**固定每页 10**、终页 `pcursor='no_more'`、
  条目与 followFeedV2 视频条目同构——解析零形状新增）。形态照空间页 UpVideos 列表上下文
  通道：FollowVideos 上下文 → 深链 `svfeed/a/<acId>` 接管宿主竖刷舞台 → `pumpListContext`
  按列表泵入（`ctx.info || env.api.info` 一处分派，ctx.info 走 home 家族 resolve 并对非
  m3u8 直链绕 hls 管线）；后台分页链有页数上限，耗尽回落当前源随机流。不动 playlayer。
- **全部侧（followview 重构）**：三种卡 → 仿原生单列行（头像行 + UBB 正文钳高/展开 + 媒体块
  [横条封面|九宫格|引用块] + 互动行「分享评论蕉赞」站方同序）。**行内写链**：赞/蕉乐观回滚
  （rail 范式；投蕉不可逆锁；文章只读——写链未实测）、评论三出口（详情面板/播放层/外链）、
  分享（imshare 面板 + wire 契约，行与详情面板共享同一 pi 引用）。**无限滚动借鉴广场
  controller.js 五条**（吸收不搬家）：append-only 不整列表重建 / 失败不置到底 / 三态状态行
  （加载中…/加载失败，滚动重试/已加载全部动态）/ 整页 0 新增判到底 / loading 代数保护
  （本视图无刷新入口，退化为 seq+isConnected 双检，注释防误修成复杂版）；触底提前量 300px、
  回顶按钮 300px 现身。挂**实际滚动容器**（.acsv-view-body），非广场的 window。
- **徽标语义**：进关注语境任一侧即清零；`isFollowContext()` 收口为单源判据（hash 前缀 ‖
  流活动）——只看 hash 会在舞台放关注视频（地址是深链形态）时误点亮。
- **测试**：单测 182（三族 share/视频数值态、followVideoPageOf 单页规整纯函数入契约层）；
  harness `view-follow` 重写 38 断言（三类行判别位/互动行四键序/赞乐观两向/展开收起/滚动
  触底翻页/状态行终态/append-only 可观测面），新场景 **follow-videos** 15 断言（seg 显隐/
  深链接管起播/泵序=列表序/「全部」确定性回路/原地续看不重置缓冲）。
- **回归**：lint 干净、check 三项过（README 依赖图 +followstream 节点与 8 条边）、单测 182
  全绿、harness 42 场景 0 失败。真机验收清单（自有内容纪律）：行内赞/蕉、投蕉不可逆锁、
  分享出卡、竖刷泵序与回落。

### 0.9.98（2026-10-03）· 关注动态多图出全 + 转发动态（rs10）补接

- **病灶（用户实报「多图动态只出第一张」）**：0.9.91 落关注视图时首测样本恰好无图，把
  「feed 只给单张 coverUrl」当成了契约、宫格进了「明确不做」。本次登录态重抓 followFeedV2
  实证：配图动态的嵌套 `moment` 带**紧凑 `imgs[]`**（url 224 方缩略/expandedUrl 大图/
  originUrl 原图，无图时字段缺席），顶层 `coverUrl` 恒=首图——多图时卡面只挂 coverUrl
  自然只剩第一张。同信息冗长形状 `imgInfos[]`（cdnUrls 三层嵌套）刻意不取（一物二源必漂移）。
- **修法**：
  - **契约层（data.js）**：follow 解析器补 `it.imgs`（`{url, big}[]`，big 按
    expandedUrl→originUrl→url 逐级回落）；`ITEM_FIELDS.panel` 加 `'imgs'`。
  - **卡面（followview.js）**：原创动态 `imgs.length>1` 出**九宫格**（3 列方格贴原生
    member-feed 尺寸律，2/4 张降 2 列防角洞，`data-n` 驱动 CSS 降列）；单图/无图分支不变。
    整卡仍是单一点击目标（进详情面板），格上不另挂点击。
  - **详情面板（momentdetail.js）**：同款九宫格 + **点格开大图**（imgview 转呈 expandedUrl，
    原生同款交互；单图也接，拿不到 big 则静展示）；`stopPropagation` 防惊动列表委托与背板。
  - **顺带补接 rs10（转发动态，实测关注流实存 3/21）**：此前解析只认 repostSource 的
    resourceType 2/3，源是动态的转发被当原创渲染、误把源首图挂成作者自己的图。现引用块取
    源正文明文（新 `ubb.ubbPlain` 投影：表情/`[img]` 整删、成对标签剥壳留内文）+ 源首图
    （`rsImgs[0]` → `rs.coverUrl` 回落）；`quoteBlockOf` 类型字三态（视频/文章/动态）。
- **测试**：单测 180（imgs 映射/回落/空数组、rs10 引用块契约、ubbPlain 剥离规则、契约
  白名单夹具带上 imgs 分支）；harness `view-follow` +2 断言（九宫格 data-n=3、rs10 引用块
  明文+旗标+类型字）、`detail-open` +5 断言（面板九宫格→点格开大图→Esc 分层关）。
- **回归**：lint 干净、`npm run check` 三项通过（README 依赖图 +`data→ubb`、
  `momentdetail→imgview` 两边）、单测 180 全绿、harness 41 场景 0 失败。

### 0.9.97（2026-10-03）· Phase 4.3：关注未读徽标 + 轮询退避

- **背景**：数据源已实测在册（§2.1.1：`followUpers[].hasUnReadResource` 布尔且假值真实
  存在）；**webPush 是唯一携 followUpers 的端点**（followFeedV2 顶层 ups 字段语义未确认，
  不可依赖）——徽标需新增 webPush 拉取，cfg.js 补端点常量。
- **修法**：
  - **followbadge.js（新）**：轮询状态机 = 广场 background.js 骨架的吸收重写（固定 tick
    + nextAt 闸门 + 重入门禁 + 代数丢弃陈旧回包），退避按 roadmap 措辞做**真逐次翻倍**
    （广场实为 idle 分档阶梯，不照抄）：`nextBadgeInterval` 纯函数——60s 起步 ×2 封顶
    10min、发现新内容即刻回落基准（首查未发现的第一档=基准本身）。生命周期挂
    player.mount/unmount（dock 常驻先例——不挂视图 enter/exit，离开关注页徽标不死）；
    `document.hidden` 短路省请求；未登录静默（selfUid 判据，followUpers 要登录态）。
  - **徽标落点**：sidebar buildDock 循环给每个视图条目加 `.acsv-dock-badge` 位 +
    `setDockBadge(view, n)` 命令式出口——运行状态不塞 viewreg 静态声明（混入即第二份
    状态源）；n>99 封顶沿 imdrawer badgeText 语义；样式沿 .acsv-upd-dot 家族（描边用
    面板底色防压 on 高亮发糊）。
  - **进关注视图即清**（buildFollowView 清零）：用户已到场，角标不再打扰；poll 侧在
    视图内也不点亮（无状态路由判据 inFollowView，退出后下一拍自然恢复）。
- **测试**：单测 174（`nextBadgeInterval` 序列 60→120→240→480→600 封顶/回落/首查档/
  脏输入与自定义档注入——roadmap 4.3 验收「轮询退避单测」落位）；harness 新场景
  **badge-poll 14 断言**（webPush 桩驱动 poll：徽标 2→清→翻倍 120/240→再发现回落
  60→进关注视图不打扰；假 auth_key cookie 供 selfUid）。
- **回归**：lint 干净、`npm run check` 三项通过（README 依赖图 +followbadge 节点与
  followbadge→net/sidebar、player→followbadge、followview→sidebar 边）、单测 174 全绿、
  构建幂等、harness 41 场景 0 失败。

### 0.9.96（2026-10-03）· Phase 4.1+4.2：动态详情面板——评论区复用 + 赞/蕉写链 + 表情面板落位

- **背景（路线图 Phase 4 动工前置已闭环 62d7295）**：动态写链五端点真机实测入档
  api-research §4.7（R3 闭合：comment/list sourceType=4 与视频同族、`page=` 分页有效、
  楼中楼 sublist 同族；text 全文性=list 与 detail 逐字节相等，且 detail 的 moment 内
  commentCount/bananaCount 实测不可信——**详情面板只吃列表载荷，不接 moment/detail**）。
  入口形态用户裁决「详情展开优先」：点动态卡原地展开居中 overlay，卡面保持纯展示。
- **修法**：
  - **comments.js 管线 host 化**（评论区复用的最小路径）：管线对 commentDrawer 单例的
    直读收敛为 `curHost()`（null=经典抽屉，行为零变）；新出口 `openCommentsHost(h,…)/
    closeCommentsHost()`——宿主三元组 `{el, title, list, close, pin?}` 由面板供给；
    输入条三件套（输入栏/回复 chip/表情面板）随宿主**迁移**（append 搬移 + scroll 监听
    换挂，scroll 不冒泡挂公共祖先救不了）；`resetList` 收口三处 innerHTML 清空并重挂
    正文 pin（防「清列表冲掉动态正文」）；`postComment` 归一 sourceType=4 的回显形状
    （实测评论对象平铺在响应顶层，无嵌套 comment 字段——乐观上屏否则失效）。
  - **momentdetail.js（新）**：面板 = 头部作者行 + 可滚动体（正文 pin：UBB 全文
    ensureEmotionMap 就绪后渲染 + 单图/引用块（views.quoteBlockOf 抽共享，卡面同源）+
    互动栏）+ 评论区（管线灌入 stype=4、kind='home' 开放互动）+ 底部输入条。互动栏：
    **赞**=乐观 +1/−1 失败整体回滚（rail 范式）；**投蕉**=count 1 不可逆只进不退（官方无
    取消端点，thrown 锁死——注释防误修成回滚）；评论数展示（commentCount 含楼中楼口径）。
    与评论抽屉共用 overlay 层位 id 'comments' + claimDrawer 槽（同槽互斥，commentState
    单例不被两份宿主互踩）。
  - **【intake 有意偏离登记】**：面板用**光 DOM** 不用 Shadow DOM——评论区/输入条/表情
    样式全在全局 styles.js，进影子根=复制 CSS 造漂移源（单源重于 intake 字面）；光 DOM
    先例=评论抽屉/imgview/release 整族。乐观更新**不抽公共件**：rail/comments/面板三处
    语境各异，强行抽=预留抽象层（YAGNI 守门），裁决入注释。
  - **写链参数化**：interact.callInteract 的 objectType 按 item 派生（kind='moment'→10，
    实测精简参数即可、userId/kpf 非必需）；AppAPI.throwBanana 加 resourceType 参数
    （默认 2，端点不动）。
  - **overlay/input 模态键输入豁免（双路径同语义）**：modal 层 capture 对 input/textarea/
    select/contentEditable 放行（Esc 除外，输入框内 Esc 由 inputbar 失焦）——面板模态
    后评论框要能打字；分类器 isInputTarget 导出钉单测。
  - **4.2 表情面板 = 单源补特性（吸收不搬家）**：emoticon.renderEmotPanel 补「悬停大图
    预览」（广场特性对照物；124px 随条目定位、横向钳在面板内、pointer-events:none），
    不搬广场面板代码；面板容器 position 锚定使 .acsv-emotpanel 的 bottom:57px 既有规则
    直接成立，emoticon 零架构改动。
  - **数据契约**：follow 解析器 case 10 补数值态 like/comment/banana（字段名对齐 rail
    词汇）+ liked/thrown（接口已有未映射）；meta 字符串三段保留给卡面（两份并存刻意：
    卡面展示口径 vs 乐观更新的可变数值）。
- **测试**：单测 173（overlay.isInputTarget 分类器 9 断言含脏输入不炸；data 动态数值态
  两向）；harness 新场景 **detail-open 20 断言**（面板结构/正文 pin 防冲哨兵/stype=4+
  sourceId/赞乐观→取消→mock 失败回滚三段/发评论乐观上屏且插正文 pin 之后/表情面板
  落位/输入条宿主迁移重开/Esc 拆净宿主复位）；view-follow 45 断言同步（动态卡
  `<a>`→`<div>` 无 href，宽度/沉底不变式保持）。排障记：场景首跑 3 红——①harness 全局
  `__ACSV_MOCK__`（feed-sample）真值令评论管线走内置 mockComments、定向桩永不命中
  （calls=undefined 实锤），场景内显式 delete；②连点被 likeBusy 守卫吞（乐观同步、
  复位异步的竞态），点击间加一拍；③正文 pin 渲染等 ensureEmotionMap 的时序竞态改
  waitFor。守卫/竞态均是测试侧口径，产品代码无改。
- **真数据复核**（内置浏览器登录态，debug 产物注入真实页）：自有动态（am5103843）面板
  全链在位——正文（内联表情真图）/真实评论 2 条/互动栏/输入条；**赞真机往返** 2→3→2
  （kuaishouzt add/delete 均 result 1）；**自投报错路径**顺带实测：170008 → toast 投蕉
  失败、计数不动（失败不触发 thrown 锁，正确）。复核抓出并修复：头部头像用了
  `.acsv-gmom-av` 但 24px 规则作用域是 `.acsv-gmom-head img`——原生尺寸头像撑爆面板；
  修法 = 头部类名复用 `.acsv-gmom-head`（同形制同一条规则），`.acsv-mdetail-head` 只补
  分隔线（单源样式纪律的又一实例）。
- **回归**：lint 干净、`npm run check` 三项通过（README 依赖图 +momentdetail 节点）、
  单测 173 全绿、构建幂等、harness 40 场景 0 失败（detail-open/view-follow 单跑均绿）。

### 0.9.95（2026-10-03）· 动态卡尾件沉底：引用块与计数行贴底，正文吃余量

- **病灶（用户实报）**：「卡片内引用的信息和脚注可以置底，为正文腾出空间，同时观感更整齐」——
  动态卡（`.acsv-gmom`）虽已是 flex 列，但内部是自然堆叠：短正文的卡（如「可以的，居然还有独家」）
  引用块/计数行紧贴正文、卡底留大片空白；**同行各卡的计数行高低不齐**。核对代码：视频卡与
  文章卡的脚行**早已** `margin-top:auto` 沉底（0.9.90 网格卡脚行钉底），**动态卡是唯一漏网的卡型**。
- **修法**（沿用既有手法，DOM 结构与契约不动）：转发卡打修饰类 `acsv-gmom-quoted`
  （用类而非 `:has()`，避开旧浏览器支持面）→ `.acsv-gmom-quoted .acsv-gquote{margin-top:auto}`
  （引用块吃余量、与计数行成组贴底）；`.acsv-gmom:not(.acsv-gmom-quoted) .acsv-gstats{margin-top:auto}`
  （无引用的图文/纯文字卡计数行贴底）。**图不沉底**：图是内容不是尾件，跟着正文走才读得顺
  （取舍入注释）。余量落在「正文与尾件之间」；卡高由同行最高者定（grid stretch）→ 沉底后
  同行各卡底自动对齐——这就是「整齐」的机制。顺带把文章卡内边距 10px 统一到 12px（与动态卡
  一致，尾件基线同源）。
- **测试**：harness `view-follow` 42 → **45 断言**：`follow-moment-stats-bottom`（逐张动态卡，
  尾件贴**自己卡的内容底**——口径要减掉卡自身内边距，首版按 border-box 直接比是错的）、
  `follow-quote-above-stats`（引用块与计数行成组相邻且在正文之下）、`follow-row-bottoms-aligned`
  （逐卡尾件贴底不变式）。**防「修」哨兵已验**：临时把 `auto` 撤成固定边距后两条变红，逐卡 gap
  打印出 **210px** 的悬空（正是病灶）；恢复即绿。
- **真数据复核**（内置浏览器，产物注入真实页）：20 张卡尾件 gap **全 0**，同行卡高一致
  （309×3 / 366×3）→ 底对齐；截图确认短正文转发卡的引用块+计数沉底、与邻卡脚行齐平。
- **附带根治：`upd-open` 断续复现的「负载抖动」真身 = 测试侧竞态**（0.9.82 起登记在册）。
  失败时 note 里的 hash 是深层链接形态（`#svfeed/v/<id>`）——那是竖刷自己的**地址栏回写**
  （`syncHash` 150ms 尾节流）在本步之后落地，把 `upd-off` 改回竖刷路由 → toggle 判定仍在
  路由内 → 当场重挂，unmount 永远等不到 root 消失。修法：`remount()` 先 `await wait(400)`
  越窗再翻 hash（同文件同族的惰性断言早有此守卫，此处漏了）。连跑 3 次单场景 + 全量轮均绿。
- **回归**：lint 干净、`npm run check` 三项通过、单测 172 全绿、构建幂等、harness 39 场景 0 失败。

### 0.9.94（2026-10-03）· 关注视图卡面 v3：尺寸统一到视频卡（卡内样式不变）

- **病灶（用户二次实报）**：「还是浪费了横向空间」——通栏版（0.9.93）下短文本的转发卡占满
  1064px、右侧一大片留白：**宽度该由内容定还是统一，是两回事**——统一尺寸 + 卡内换样式，
  才是既不空洞也不留白的解。
- **修法**：文本向卡（动态/转发/文章）与视频卡**同尺寸**（同格宽 344px、单格），只保留**卡内**
  样式差异（头像行 + 正文 + 单图/引用块 + 三计数；文章=薄条封面 + 标题 + 摘要）；`.acsv-gwide`
  去掉整行跨度（类名保留：语义与断言锚点）；动态单图从限宽 460 改撑满格宽；窄屏复位规则随之
  删除（已无跨度，规则天然成立）；`dense` 保留（防个别行留洞）。
- **测试**：harness `view-follow` 44 → **42 断言**——「通栏」两条换成 **`follow-size-uniform`**
  （视频/文章/动态/转发四类卡宽逐类相等，±1px）+ `follow-col-single-all`（全员单格、分组标题
  仍整行，它是分节线）；图片/引用块/计数/UBB 断言不变。
- **真数据复核**（内置浏览器，产物注入真实页）：20 卡同宽 344px 三列铺满（无空洞无留白），
  转发卡引用块、图文动态的单图、计数行逐条在卡内。
- **回归**：lint 干净、`npm run check` 三项通过、单测 172 全绿、构建幂等、harness 39 场景
  仅 `upd-open.remount-ok` 复现既有负载抖动（0.9.82/0.9.85/0.9.88/0.9.91 已登记的 unmount
  步超窗连锁，其余轮 302ms 完成；单跑 21/21 绿）。

### 0.9.93（2026-10-03）· 关注视图卡面 v2：按内容型换卡 + 「文本向整行、媒体向多列」

- **病灶（用户实报）**：0.9.92 把三类内容硬塞进同一张网格卡——「强制统一有点不协调，
  样式和可读性美观性也打折扣」；而原生关注流是 870px 单列宽卡，桌面宽屏同样浪费
  （用户的裁决：「可以模仿但需要改进」）。
- **修法（模仿原生信息层级、改进横向空间利用）**：
  - **按内容型换卡**（followview 自己的卡族，视频继续复用共享网格卡）：视频=封面卡
    （时长/播放数/脚行，点击进播放层）；**文章=文本向薄条卡**（薄条封面 + 标题 + **摘要** +
    脚行——摘要取实测的 `beginParagraph`，`description` 该条为空串不是摘要源，已在解析器注释钉死）；
    **动态=文本向宽卡**（头像行 + UBB 正文 + 单图（限 460×260）+ 三计数行；作者落头像行——
    0.9.83「作者唯一落点=脚行」是网格卡族的收口，文本向卡按原生形制走头像行，信息仍只出现一次）；
    **转发=动态卡 + 引用块**（左竖线 + 源缩略图 + 源标题 + 源类型字）与「转发」旗标。
  - **布局**：`grid-auto-flow:dense` + 文本向卡 `grid-column:1/-1` **整行通栏**、媒体向卡单格；
    分档标题同整行。为什么不是「跨两列」：2 跨度在 3+ 列网格里必然在右侧留空洞（首版实测：
    repost 占 1-2 列、第三列空两行，分组标题还被当普通格塞进列里）；整行通栏 + dense 回填
    是卡片流不破洞的通行解（知乎/掘金同款）。窄屏（<720）回落单列，规则天然成立。
  - 附带减负：`gridCardOf` 交出动量/转发专属分支（只服务网格卡族：我的/搜索/关注视频卡），
    UBB 正文与计数行抽成 views 的共享小件（`ubbTextOf` / `statRowOf`）单源。
- **测试**：harness `view-follow` 42 → **44 断言**（卡型归属与**形态互斥**（视频无头像行、
  动态无时长、文章无头像行）、文本向卡通栏 vs 媒体向单格、分组标题整行、**宽卡确实比媒体卡宽
  1.5×**（「改进空间利用」的机器化）、文章摘要、转发旗标与引用块、转发不挂源图大图、
  动态正文 UBB at 链与三计数）；单测 172（文章 `desc=beginParagraph` 断言并入既有用例；另有前两版新增的 repost 用例）；夹具补摘要与两条转发。
- **真数据复核**（内置浏览器，产物注入真实页）：20 卡 = 8 视频（3 列媒体网格）+ 12 动态
  （通栏，其中 9 条转发带引用块）；头像行/引用块/计数行逐条在场，页首视频三列填满无空洞。
- **回归**：lint 干净、`npm run check` 三项通过、单测 172 全绿、构建幂等、harness 39 场景 0 失败。

### 0.9.92（2026-10-03）· 关注视图卡面辨识度：类型角标体系 + 转发动态的结构性签名

- **病灶（用户实报：「怎么区分纯文章/视频动态和文字、图片、转发动态」）**：卡面只有「文章」一个
  类型标识，**动态完全没有标识**——带图动态与视频卡长得一样（都是 图 + 文 + 脚行），
  **转发动态更是直接顶着源内容的封面**，一眼分不出转发/图文/视频三类。
- **实测（36 条动态跨 3 页，2026-10-03）**：`momentType`（1/2）与是否转发**不相关**（两种值
  都出现在转发与非转发上）——不能用它分类；**`repostSource` 存在与否才是转发的可靠判据**
  （23/36 为转发）；**转发的 `coverUrl` 恒等于源内容封面（9/9 全等）**——这正是"转发卡伪装成
  视频卡"的根因；**纯文字动态未观察到**（36/36 都有 coverUrl），文本瓦片保留为兜底并标注；
  `coverImgInfo` 为 null（无多图信息，宫格仍不做）。
- **修法**：
  - **类型角标体系收口到左上**（左下=播放数、右下=时长，各占其位不打架）：文章=「文章」、
    动态=「动态」、转发=「转发」（替代"动态"——「这是转发」是比「这是动态」更该先看到的信息）；
    视频不加角标（时长角标即签名）。顺带修掉 0.9.91 的叠字：文章卡「文章」与播放数此前同在左下。
  - **转发动态的结构性签名**：封面位改放**转发语文本瓦片**（不再拿源封面当主视觉），正文位挂
    **内嵌源条**（源缩略图 + 源标题 + 源类型字「视频/文章」）——原生关注流对转发也是「转发语 +
    引用块」的信息层级，这里压到网格卡尺度。契约层新增 `repost: { ct, title, cover }`
    （源类型只认实测的 2/3，未观察类型不编造、按原创动态降级渲染）。
- **测试**：单测 +1（repost 三件套 / 未知源类型不挂 → 172 全绿）；harness `view-follow`
  30 → **39 断言**（三类角标逐类、角标位几何不变式、**角标与播放数不重叠**、转发卡=瓦片+源条+
  源类型字、转发文章卡的源类型字）；夹具新增两条转发（转视频 / 转文章）。
- **真数据复核**（内置浏览器，最终产物注入真实页）：20 卡 = 8 视频（无角标）+ 3 原创动态
  （「动态」）+ 9 转发（「转发」+ 文本瓦片 + 源条带「视频/文章」标签），逐条在场。
- **回归**：lint 干净、`npm run check` 三项通过、单测 172 全绿、构建幂等、harness 39 场景 0 失败。

### 0.9.91（2026-10-03）· 关注视图：视频 + 文章 + 动态三类混合卡流（路线图 2.2 + Phase 3 动态卡并入）

- **实测前置（铁律 3，落档 docs §2.1.1）**：端点选定 **`followFeedV2`**（统一混合流——不带
  `resourceTypes` 即视频(2)/文章(3)/动态(10) 混排，首屏 20 条里 12 条是动态）；`feed/webPush`
  是另一条端点（只有视频+文章、**拿不到动态**，踩过坑已记档）。三类条目形状、`createTimeGroup`
  数字枚举（1 今天/2 昨天/10 更早，边界实测钉死）、动态 PC 落地页 `www.acfun.cn/moment/am<id>`
  真渲染、视频 `playDuration` 是展示串——全部先量后写。样式量取：站方动态卡（浅色宽行卡
  870 宽、头像占 60px 左栏、计数行 48px 高/12px 次级灰/项距 42px、正文不钳高）——只借字号与
  次级灰，其余按本方卡族取值，量取值与日期写在 styles 段注释。
- **契约层（一个表项 + 判别子）**：`PANEL_PARSERS.follow` + 导出 `followPanelOf`；内容判别子
  **`ct: video|article|moment`** 与既有 `kind`（来源方言）正交——关注流一个来源出三种内容，
  判别子落在产出物上（路线图「产出带 kind 判别子的契约」的落法）。动态身份 `momentId`
  （无 acId/title 是它唯一结构差异），`panelItem` 身份判据相应放宽为 `(acId||momentId)&&(title||text)`；
  白名单增 `ct/momentId/text/href`（contract.test.js 的机器闸门同步扩）。
- **卡片（扩 gridCardOf，不新立工厂）**：`pi.href` 有值 → 根元素换 `<a target=_blank rel=noopener>`
  （文章/动态落点在站方页），无值维持 div + 播放层直达（视频）；`ct` 驱动角标与正文位——
  文章贴「文章」角标、动态正文走 **ubb.js 单源渲染**（不用接口的 `replaceUbbText` 明文版）、
  无图动态正文占封面位（文本瓦片，窄卡不留空封面）、三计数复用 `meta` 三段语义 + `META_GLYPH`
  补 like/banana 字形。作者仍只落**钉底脚行**（与 0.9.83 卡面收口、0.9.90 脚行钉底同一批不变式）。
  **动态不挂播放数角标**：实测动态 `viewCount` 恒 0，「0 播放」不是信息是噪音（真数据复核
  截图发现，单测钉住）——播放数只在视频/文章上出。
- **视图（新 `followview.js`）**：`registerView({id:'follow', dock:{label:'关注',order:30,group:1}})`，
  boot 链自注册；结构照 mypage 范式（`acsv-gskel` 骨架 / `acsv-vempty` 空失败态 / `seq` 令牌丢过期
  回包 / **到底判定按原始条数**）；分档标题按 `createTimeGroup` 组变化处插、跨页去重。
  **明确不做**（理由入注释与本节）：内嵌转发条、多图宫格（feed 只给单图，多图形状未实测）、
  动态原地展开详情+评论区（moment 评论 sourceType 未实测）、未读徽标、直播 —— 均为后续版本。
- **测试**：单测 +5（`data.test.js` 三类解析：ct 判别/时长展示串/作者取 `userHead`/UBB 原文进
  text/三计数/缺身份与未观察类型过滤/作者缺失不伪造；`contract.test.js` 白名单加动态夹具——
  扩的是既有用例的夹具集，不新增用例数）。
  harness +1：**`view-follow` 30 断言**——契约过滤（未观察类型不渲染）/ 三个分档标题顺序 /
  三类卡判别位（视频时长+播放数角标、文章「文章」角标+外链、动态 UBB at 链+三计数+外链）/
  无图动态文本瓦片 / **视频卡点击进播放层**（外链卡不参与）/ 翻页 23 条到底藏按钮 / 跨页分档去重 /
  Esc 回竖刷。夹具扩 my-sample（首屏 20 原始条含 1 条探过滤条 + 第二页 4 条）。
- **真数据复核**（内置浏览器登录态，产物注入真实页）：关注视图首屏 20 张卡 = 8 视频 + 12 动态
  （与探针数字一致），三个分档标题在场、动态三计数与作者脚行渲染正常、dock「关注」高亮。
- **回归**：lint 干净、`npm run check` 三项通过（依赖图新增 followview 节点与 3 条边）、
  单测 171 全绿、构建幂等、harness 39 场景 0 失败（`view-follow` 30 断言在列）。
  全量轮 `upd-open.remount-ok` 复现既有负载抖动（0.9.82/0.9.85/0.9.88 已登记：remount 某步
  两次超窗，本轮 note 显示其余轮 305ms、超窗轮 30s——与并行浏览器工作叠加），单跑 21/21 绿。

### 0.9.90（2026-10-03）· 网格卡脚注钉底：单双行标题混排不再错位

- **病灶（用户截图实证 + 代码定位）**：网格卡（`views.gridCardOf`，我的页历史/收藏与搜索页共用）
  的单元格是普通块级，子元素自上而下排（封面→标题→脚行）。网格行内所有卡等高（`display:grid`
  默认 stretch，由该行标题两行那张定高）——于是**单行标题的卡富余空间落在脚行下方**，脚注悬在
  半空：同一行三张卡，单行标题那张的 `@作者/时间` 比邻居高约 28px。同类钉底在行卡
  （`.acsv-vrow.big` 的 meta）与榜单 UP 卡早已是既有实现，网格卡是漏网的那类。
- **修法**：`.acsv-gcell` 改 flex 列；`.acsv-gfoot` 由 `margin-top:4px` 改 `margin-top:auto`
  + `padding-top:4px`（auto 吸走卡内富余，保底 4px 间距——内容顶满的卡观感与此前完全一致）；
  封面/标题补 `flex:none` 防 flex 收缩覆盖 `aspect-ratio` 与标题 `max-height` 钳高。
- **测试**：夹具先行——`my-sample.js` 历史第 2 条（首行内）改**双行长标题**，让行内单双行共存
  （原夹具标题全单行，行内无富余，断言会假绿）；`view-my` 新增 **`card-foot-pinned`** 逐卡不变式
  「脚行底 = 卡底」（容差 1px，无脚行的降级条目跳过）。**防「修」哨兵已验**：临时撤掉 auto 后
  该断言变红（`maxGap=20 #0 gap=20/20 #1 gap=0/40 #2 gap=20/20` —— 单行标题的卡留 20px 富余、
  双行那张为 0，正是病灶画面），恢复后转绿。内置浏览器目视复核：首行 20px/40px/20px 三种标题高
  的卡，脚注同一基线、逐卡 gap=0。
- **回归**：lint 干净、`npm run check` 三项通过、单测 166 全绿、构建幂等、harness 38 场景 0 失败。

### 0.9.89（2026-10-03）· Phase 1 收尾：设置层收编（路线图 1.1）+ 脚本页设置面板（1.2）

- **前置实测（铁律 3，内置浏览器登录态，落档 docs/api-research.md §7）**：
  - **老键真值快照**：本机 profile 实存 4 键——`acsv-source=sv`、`acsv-sound-on=1`（关态写**空串**）、
    `acsv-upd-v1={"lastCheck":…}`、`acsv-stats`（debug 埋点镜像，非偏好）；`acsv-dm-on`/`acsv-codec`/
    `acsv-buf`/`acsv-quality` 未出现，**标注「未现场观测、形态按写入点原文构造」**（不脑补成实测）。
    清晰度 label 真实形态同机实测 = `1080P+ / 1080P / 720P / 540P / 360P / 自动`（官方播放器菜单）。
    探测只读不写，前后键清单一致（无其它写入方）。
  - **样式量取（0.9.69 纪律）**：官方弹幕设置面板（400 宽、rgba(21,21,21,.8)、radius 2px、行高 18+20
    节奏、开关 34×18、按钮 126×26）+ 官方清晰度菜单（radius 4px、选项行 36px、选中 accent）——
    量取值与日期写在 settingspanel.js 文件头；**几何取官方、表面取本方 .acsv-upd 家族**（脚本页面板
    必须与自家模态同族；官方是扁平 2px 圆角无模糊，差异有据）；未量到的开关旋钮几何按药丸内切推导，注释在册。
- **设置共享层 `src/settings.js`（1.1）**：SCHEMA 唯一契约（`def` 引用 CFG——默认值单一来源不复制，
  两皮肤表驱动同源）；存储**逐键** `acsv.s.<key>`（GM 优先 / localStorage 回落，watchledger 体例）+
  写防抖（`CFG.time.setFlush`，关面板 / pagehide 强制 flush）；**无 TTL 是知情设计**（偏好不是缓存——
  对照观看账本的 24h TTL：那是差量缓存过期即无价值，偏好过期没有语义，理由在模块头）。读取三态
  = 新键 → 老键收养 → 默认；`onChange` 订阅（读方零反向依赖，同 state.js 中介纪律）；纯逻辑抽纯
  （coerceValue / fromLegacy / validateValue / clampNumber / defaultsSnapshot）供单测直采。
  **lint 新禁令**：`src/settings.js` 只许 import `./cfg.js`（D4「共享层禁止 import 皮肤」的机制化）。
- **收编（迁移式，六项老键）**：`acsv-source→source`、`acsv-dm-on→dmDefault`、`acsv-codec→codec`、
  `acsv-buf→buf`、`acsv-quality→quality`、`acsv-sound-on→sound`——九个消费点全部改走设置层
  （api / danmaku / quality / controls / session / attach / playback / release / input）；首读收养老值
  并落新键、**老键不删**（回滚友好，5.3「兼容老 key」提前成立）。不迁移：`acsv-upd-v1`（是状态机
  seen/notified/ignored）、`acsv-stats`（调试通道）、`acsv_emot_recent_v1`（最近项缓存）、GM 键。
- **脚本页设置皮肤 `src/settingspanel.js`（1.2）**：dock 底部齿轮（`margin-top:auto`；复用 dock-item
  样式但不带 data-view，故不进 syncDock 高亮）→ overlay 栈 modal 层（Esc 与模态键语义零改 input.js）；
  host 挂 root + **Shadow DOM** 作用域样式（intake 清单体例；主题变量穿影子边界继承）；控件按 schema
  表驱动——bool 开关 / select 下拉 / number 步进器，**text 不实现控件**（单测钉「panel:true 的类型必须在
  实现集内」，将来塞 text 项会红而非静默无控件）。首批五项：自动检查更新（新；门在 `releaseCheck()`
  入口，**mock 注入不绕门**供场景测，顶栏「更新」手动入口不受门约束）、弹幕默认开启（即时生效：
  订阅读回，控制栏「弹」按钮与当前条图层单源走 `applyDmState`）、编码偏好、缓冲档位、快进步长
  （原硬编码 5s 无入口；5..30 可调，按键时现读、改完即生效）。
- **测试**：单测 +16（`settings.test.js`：schema 不变量四组 + coerceValue / fromLegacy / clampNumber +
  存储编排组——读三态、收养一次、非法值落默认、防抖落盘、订阅退订；编排组用 10 行 localStorage 垫片
  直测，专治「mem 预填默认值 → 存储永远读不到」这一类初稿真 bug）。harness +2：`settings-open`
  （点齿轮——首个点 dock 的驱动；五控件在场、开关写盘 + 控制栏「弹」按钮即时同步、Esc 关且浮层栈空、
  重开状态保持；**面板改编码偏好 → 关面板即 flush → 控制栏「编码」菜单高亮同步**，收编端到端证据）、
  `settings-migrate`（bundle 前只预置老键 → 面板读出收养值 + 新键生成 + 老键未删；
  影子根断言走 host.shadowRoot）。harness.html 的源记忆种子键同步改 `acsv.s.source`。
- **回归**：lint 干净、`npm run check` 三项通过（依赖图新增 settings / settingspanel 节点与 8 条边）、
  单测 166 全绿、构建幂等、harness 38 场景 0 失败。

### 0.9.88（2026-10-03）· Phase 0 收尾：评论转发选链修复 + boot 页面类型分流 + LICENSE

- **评论链接劫持修复（路线图 0.1，中危）**：
  - **病灶**：转发评论 wire = `@作者：ubbImText(评论)\n分享链#ncid`（comments.js → imshare 组装序），
    `parseShare` 只取首个 URL 匹配——评论正文里嵌的裸 acfun 链接（A 站评论常见）会抢走匹配：
    卡片 href 指向评论里提到的视频、`#ncid` 锚点丢失、`note` 变成「哈哈哈\nhttps://…」这类残渣、
    预览截断在链接前。0.9.51 的「评论卡 vs 视频卡」分流通约成立，但链选错了。
  - **修法（全收在 immsg.parseShare 内，导出形状不变）**：`RE_AC_URL` 带 `g` 循环收候选（上界 8 防御）；
    首段过 `isCommentShare`（与卡面分流同一判据）即按评论 wire 处理——推荐链恒独占末行，故
    从后往前挑首个 `note` 为空（剥句读后）的候选，正文内嵌链后面必有内容/换行天然排除；
    无空 note 候选回落末个候选；非评论形态一律首个匹配（手打分享「看这个 链接 再看看」语义不动）。
    消费点零改动：5 个调用点（预览/抽屉/原生页两处）都在解析后判断形态并逐字用 `share.url`。
- **boot 页面类型分流（路线图 0.2）**：
  - **病灶**：@match 早已覆盖全 www（该半张卡是 no-op），但 boot 只有 host 判断——v/a/member
    页全走全量初始化，**每个 www 页无条件注入 76KB 全量 CSS**；分流实际藏在 nav 白名单 /
    uppage 路径匹配 / toggle 路由检查各自的守卫里，boot 层无显式契约。
  - **修法**：新零依赖叶子 `pagekind.js`：`pageKind({hostname,pathname})` → native/home/video/
    article/member/other（member 判据与 uppage 的 `/u/\d+` 逐字一致，单测钉一致性）。boot 改为
    按总表分流（表在 boot 头注释里）：native 现状不动；home 全量（ensureStyle 保留——导航兜底胶囊
    未挂载也要有样式）；member + tryInjectSpace（样式由注入点自持）；video/article/other 仅基础设施，
    全量 CSS 不再注入（挂载时 player.mount 自持）。**保留 toggle + hashchange 到全部 www 页**
    （路线图写「other 仅基础设施」的偏离，有意）：任何页面粘 `#svfeed` 深链都能进竖刷是 0.9.72 起
    的性质，route.js 的 `/svfeed` 路径别名同样依赖它，不挂载时零成本。nav 白名单补注「显示闸门
    非运行门槛」。上报链路是模块求值期行为，不经本表、不受影响。
- **LICENSE（路线图 0.3）**：补 MIT LICENSE（package.json 早已声明，GitHub API 读不到文件）。
- **附带**：`imDrawerSmoke` 补 `ensureStyle()`——im-open 页既不挂载也不在首页，样式不再自动注入后
  其 computed style 断言全量失效（生产态抽屉恒在挂载之后打开，样式必已就位）。
- **测试**：单测 +12——`immsg` +5（评论 wire 往返验收案例：内嵌裸链不劫持推荐链/多链选末行/手打
  多链保持首个/无空 note 候选回落/预览含完整正文）；新增 `pagekind.test.js` 7 例（六分类分支表 +
  member 判据与 uppage 一致性 + 脏输入容错）。harness +2：`boot-home`（pathname `/` → 样式先就位 +
  `boot:home` 埋点）、`boot-video`（`/v/…` → 挂载前**无**全量 CSS + `boot:video` 埋点 + hash 深链
  仍可挂载的不变式）——机制是 harness.html 的 `BOOT_PATH`（bundle 前 replaceState 改 pathname，
  与 DEEP_HASH 同款时序；bundle 加载器改绝对路径、TEST_WEBM 相对解析挪到改路径之前）+ 挂载前
  快照 `__BOOT_SNAP__`。**回归**：lint 干净、`npm run check` 三项通过、单测 150 全绿、构建幂等、
  harness 36 场景（34 例 + dm-smoke/im-open）0 失败（基线轮曾复现 upd-open 负载抖动——
  0.9.82/0.9.85 已登记的 remount unmount 步超窗连锁假红，单跑 21/21 绿；本版全量轮 21/21 过）。

### 0.9.87（2026-10-03）· 观看上报补全非合作出口：关页官方同款直发 + 持久账本崩溃补报，删 10s 首报

- **实测（内置浏览器登录态，ac24325439 全程 240s，详见 docs §4.6）**：
  官方 CLIENT_BROWSE_HISTORY 纯事件驱动（暂停报当前位/播完报整段，238s 连播零上报——
  官方自己容忍崩溃丢数据）；官方 SDK 批量 flush 本就走 `navigator.sendBeacon` 到
  `log-sdk.ksapisrv.com/…/collect/misc2`，线格式明文 JSON webLogger 信封；服务器 `browseTime`
  **精确采信信封 `client_timestamp`**（手搓信封端到端实测 0ms 滞后）、`playedSeconds` 取
  **latest**（发 100 实测把「已看完」回退成 01:40，报 240 恢复）。原方案的「60s 心跳」与
  「sendBeacon 逆向」两个前提双双死于实测：心跳无形态依据（官方没有）、直发无逆向成本
  （复刻官方自己的 flush 形态）。
- **修法**：
  - **信封嗅探（report.js，脚本启动处）**：document-start 包一层 `sendBeacon`（官方 SDK
    之前，时序契约钉注释），URL 含 `/collect/misc2` 的批解析缓存 `{ url, common, tpl, inc }`
    ——common 原样透传（含 safety_id，服务器认）、tpl 取批内一条 log 作信封骨架、inc=批内
    最大自增号；**Blob body 异步解析完成才整体覆盖缓存**（防半个信封）。
  - **关页直发**：pagehide 时若有缓存 → `buildHistoryEnvelope` 克隆骨架换 action/params/
    时间戳、`client_increment_id` 从官方序列 **+1 续号**（不自起炉灶，防会话级单调/去重
    校验当重复丢弃）→ `sendBeacon(缓存 url)`；直发回环再被嗅探层解析，续号连续性天然保持。
    无缓存（<3s 关页窄窗）回落 SDK 队列路径，极低频损失一条，接受（已并档 docs）。
  - **持久账本（崩溃/断电/强杀出口）**：`watchledger.js` 纯逻辑层——账本
    `{ [id:videoId]: { maxSec, reportedSec, ts } }`，GM 存储优先（无 TM 回落 localStorage）；
    onTime 节流 3s 只推 `maxSec` 水位（重看回退不污染）；`reportLeave` 成功处同步
    `reportedSec`（**乐观水位**，注释钉死：fire-and-forget，差量由下一次离开事件天然愈合）；
    启动 `reconcile` 对账——TTL 24h/账平即清/畸形容错/容量 32 按 ts 淘汰，差量经
    `weblog.sendImmediately` 按官方事件形态补发（req_id 用当期 impression，归因漂移可接受：
    落库采信 client_timestamp）→ 清账。**单调守卫只在补报侧**：live 路径镜像官方语义允许
    回退（0.9.86 防修哨兵钉住），补报是死会话无用户意图——两者不冲突。
  - **删 10s 首报定时器**（player.js onPlaying/onDisposed 的 `_watchTimer` 全清）：其兜底
    职责由 pause 即报（0.9.86）+ pagehide 直发接管，进度检查点不再依赖墙钟；attach.js
    slide 字段登记表同步注销。
- **测试**：单测 +10（`watch-ledger.test.js`：reconcile 六项边界——TTL 恰好到限/账平/畸形
  JSON/字段容错/key 反解含 videoId 带冒号/容量淘汰按 ts 最旧/差量门槛；params 与官方逐字段
  对齐；信封续号 +1/深拷贝不污染模板/缓存不完整返 null）。harness +2：
  `watch-pagehide-beacon`（stub sendBeacon 喂假官方批建缓存 → 真实播放 → pagehide 断言
  信封 common 原样/续号=假批+1/params 逐字段/同秒位去重）；`watch-ledger-replay`
  （bundle 求值前预置账本，页面新鲜加载=重启语义：差量补发断言 playedSeconds=42、账平与
  TTL 条目不补、清账）。**附带修复**：`check-cases.mjs` 行注释剥离不兼容 CRLF（git autocrlf
  往返后 `\r` 残留使 HEADLESS_SKIP 示例条目被当成登记）——先剥 `\r` 再按行剥注释。
- **回归**：lint 干净、单测 138 全绿、`npm run check` 三项通过、harness 34 场景 0 失败、
  构建幂等。

### 0.9.86（2026-10-03）· 观看上报对齐官方事件流：播放层 pagehide 补洞 + 暂停即报 + 载荷补键

- **病灶（内置浏览器登录态实测 + 代码核查，实测见 docs/api-research.md「写侧上报」）**：
  两处进度丢失 + 一处形态偏差——
  1. **播放层 pagehide 全丢**：`reportLeaveCurrent` 只查 `slideAt(FeedStore.current)`，播放层
     slide（`dataset.ovl='1'`、idx 哨兵 -1）永远查不到——层内观看关页/切标签时，10s 首报之后
     的进度没有出口；
  2. **暂停不报**：官方 video 页实测是「暂停即报当前位」（`playedSeconds=当前秒`），我们此前
     只在划走/播完/dispose/定时器报——长停留+崩溃窗口内的进度粒度比官方粗；
  3. **载荷缺键**：官方 CLIENT_BROWSE_HISTORY params 带 `bangumiItemId: null`（普通视频恒
     null），我们没有。
- **修法**：
  - `state.js` 新增 `setWatchTarget/watchTarget` 中介（与 0.9.74 `videoTarget` 同款、同款
    「不回落」纪律）：返回层内 `{ session, video }`；`playlayer` 进出层设置/清除；
    `reportLeaveCurrent` 先问钩子，层内开着只报层内会话，绝不回落竖刷（背后是暂停旧条，
    报它=幽灵进度）。
  - `SESSION_HOOKS.onPause` 加 `reportLeave(…, 'pause')`（官方对齐：暂停=自然检查点）。
    dispose 链先 pause 后 dispose 的同值近邻双报由同秒位去重兜住。
  - 载荷补 `bangumiItemId: null`，与官方逐字段一致。
  - 两条纪律注释钉死防误「修」：①`watchSentAt` 是**乐观水位**（sendImmediately fire-and-
    forget，网络层失败不可感知，差量由下一次离开事件天然愈合）；②**单调性不对称**——live
    路径镜像官方语义（重看回退=历史回退，如实报），单调守卫只属于 0.9.87 账本补报。
- **测试**：单测 0（本版改动全在 DOM 挂钩点，纯逻辑随 0.9.87 账本一起进单测）；harness
  `watch-report` 场景改按 pause 语义重排（pause 即报 / 划走同秒去重 / pagehide live 秒位 /
  防修哨兵「高秒位已报 → 回拉 3.5 暂停 → 断言发 3」）+ payload 断言加 `bangumiItemId`；
  新增 `watch-playlayer-pagehide` 场景（home 源 + MY_MOCK 直挂缝）：层开 pagehide 断言报
  488900 与派发瞬间秒位、重复 pagehide 去重、Esc 后断言回落竖刷当前条。

### 0.9.85（2026-10-03）· 时间口径三处收口：播放层对齐站方发布时刻 + 卡片时间带年份

- **病灶（用户报障「收藏夹时间不对」+「创建时间没有年份判定、老视频点进去才看得到年份」）**：
  同一条视频（ac48875146）在三个界面给出三个不同的时间，根因是**读的字段不同源**：

  | 界面 | 显示 | 实际字段 |
  |---|---|---|
  | 原生 UP 空间页 | 2026/10/02 | `douga/info` 的 `createTimeMillis`（发布时刻） |
  | 我们播放层 | 「24小时前」 | 同一个 `createTime`——但它是**展示串**，被 `slice(0,10)` 当日期透传 |
  | 我们收藏卡 | 「9月26日 21时39分」 | `dougaList.contentCreateTime` = 稿件**上传时刻** |

  另有既存缺陷：日期兜底分支 `new Date(ms).toISOString().slice(0,10)` 是 **UTC**，本地凌晨/晚上
  整体差一天；卡片时间走 `relTime` 的"更早"档是 `M月D日 H时MM分`（**无年份**），三年前的投稿
  在卡片上根本判不出年份。
- **实测（2026-10-03，三稿交叉验证，见 docs §3）**：`createTime` 是展示串（旧稿 `"2023-10-2"`、
  近期 `"24小时前"`）；`createTimeMillis` = 站方页面展示的发布时刻（原生 UP 页 2026/10/02 与之
  吻合）；**顶层没有** `uploadTime`，它在 `videoList[0].uploadTime`，且与收藏接口的
  `contentCreateTime` **只差 9 秒**（两接口互证 = 上传时刻）——`createTime − uploadTime` 三例为
  12 秒 / 19.5 小时 / 5.16 天，二者是不同口径。
- **修法**：
  - 新增两个纯函数（`data.js`）：`fmtDate(ms)` → **本地时区** `YYYY-MM-DD`（明令不准用
    `toISOString`，UTC 口径会差一天）；`fmtAgo(ms, now)` → 今天/昨天/前天走 `relTime` 相对文案，
    **更早退回带年份日期**（`relTime` 本身不动——榜单卡的「发布于xx」是 0.9.69 对齐原生的口径）。
  - `appapi.resolve` 日期槽改用 `fmtDate(d.createTimeMillis)`（站方口径），删掉 slice 展示串与
    UTC 兜底；**不用** `videoList[0].uploadTime`（那是上传时刻，会与站方页面矛盾）。
  - 收藏卡右槽 → `fmtDate(contentCreateTime)`（带年份）；历史卡右槽 → `fmtAgo(browseTime)`。
- **测试**：单测 +2（`fmtDate` 本地分量断言与"非 UTC"判据、`fmtAgo` 五档含跨年），fav/history
  用例改按新口径断言；harness 加两条——`view-my` 点**第二条**历史卡（488901，既不在直挂缝也不在
  mock 卡片池里 → 走**真实 resolve**）断言日期槽 = 发布时刻（夹具把 `createTime` 摆成诱饵
  `"24小时前"`、`uploadTime` 摆成更早时刻，读错任一个即红）；`__ACSV_MOCK_DIRECT__` 增 `date`
  字段（缝自己编日期会掩盖口径，改由调用方显式给），`play-deep` 据此断言。历史卡"更早 → 带年份"
  单独一条断言（夹具第 2 条给 10 天前）。
- **回归**：lint 干净、单测 128 全绿、`npm run check` 三项通过、构建幂等；`upd-open` 的
  `remount-ok` 仍是既存 flake（0.9.82 已实测其在改动前同样复现），非本次引入。
- **文档**：`docs §3/§4.1/§4.2`、README 时间口径段与 `data.js` 模块行按实测改写；顺带清掉 5 处
  过时注释（`views.js` 还写着"收藏卡无日期字段、右槽留空"、`slide.js` 写"投稿时间"、
  面板契约注释块漏 `dateText`、meow 的 `createTime` 缺风险注记）；README 补
  「开发 → 发布（Release）」清单——**每次 release 正文必须写明下载 `acfun-svfeed.user.js`**、
  别下 `.debug` 版（历史下载记录里真出现过误下：v0.9.81 正式版 3 次 / debug 1 次）。

### 0.9.84（2026-10-03）· 观看历史接上作者（`histories[].user` 实测）+ 推翻 0.9.82/0.9.83 的两处误判

- **病灶（用户追问："观看历史没脚行吗"）**：对。0.9.82/0.9.83 两节都把"观看历史卡面无作者"当成
  事实（依据是 `docs §4.1` 只记了 `histories[]` 有 `user` 对象、**未记形状**），于是历史卡既无
  脚行、进播放层也要等 `douga/info` 回包才有作者。**这个判断是错的**——用户登录态实测解开了形状。
- **实测（2026-10-03，用户登录态 `browse/history/list` 响应）**：`histories[].user` 与
  `douga/info` 的 user **同形状**（同属本站 APP 家族）：`{ id:"25380695"（**字符串**）, name,
  headUrl（头像）, isFollowing, fanCount:"6337", contributeCount, signature, avatarFrame,
  avatarFramePcImg/MobileImg, headCdnUrls[], userHeadImgInfo{…}, href（= uid）… }`。条目另有
  `browseTime`（单条观看时间，实测**毫秒时间戳**：`1790961102971` / `typeof number`）与
  `browseTimeGroup`（按日分组标题，**不是**单条时间）。条目键共 29 个，全部记入
  `docs/api-research.md §4.1`。
- **修法**：`PANEL_PARSERS.history` 加两行——`it.up = upOf(raw.user.id, raw.user.name,
  coverUrl(raw.user.headUrl), raw.user.isFollowing)`（`id` 是字符串，`upOf` 里 `Number` 归一）
  与 `it.dateText = relTime(Number(raw.browseTime))`（直接走项目既有的相对时间文案：N分钟前 /
  昨天H时MM分 / M月D日 H时MM分，同榜单「发布于xx」那套）。于是历史条目**在列表层就带齐作者
  三件套 + 观看时间**：历史卡首帧即出「`@UP名` + 右槽观看时间」脚行（与搜索卡同构），进播放层
  首帧即有头像与关注角标——**零额外请求**，也不依赖回包。三张卡片从此完全同形：作者都在脚行、
  进度都在封面角标，脚行右槽分别为 搜索=发布日期 / 历史=观看时间 / 收藏=投稿时间。
- **顺带把收藏卡右槽也填上（同一批实测）**：`dougaList` 条目的 `contentCreateTime`（投稿时间）
  与 `updateTime`（记录最后变更）实测都是毫秒时间戳（同一条实测：1790429958888 ≈6 天前 /
  1790960018142 ≈1.3 小时前，不变式 `contentCreateTime ≤ updateTime` 成立）。取
  `contentCreateTime` 进右槽（与搜索卡的「发布日期」同义）；**不用 `updateTime`**——续看进度/
  改夹/点赞同步都会刷新它（本条就带 `userPlayedSeconds`），语义不纯，与 0.9.82/0.9.83 两批
  "清掉字段语义混用"同一取向。
- **顺带更正**：`docs §3`/`§4.1`/`§4.2`、README 作者来源表、`src/views.js`/`src/data.js`/
  `src/appapi.js` 与 `src/api.js` 里"历史卡面不带作者""首帧无作者→回包补上"等表述全部按实测改写。
- **测试**：`data.test.js` 的 history 用例从"up 为 null"翻转为"user → up 三件套 + id 字符串归一"，
  并保留"缺 user 时 up 为 null"的降级断言；新增两个时间用例——`browseTime`（历史）与
  `contentCreateTime`（收藏，并带 `updateTime` 诱饵值 + `doesNotMatch(/分钟前/)` 钉住"不用
  updateTime"），文案按运行日历位置断两档（同榜单 meta 的既有断法），缺省/脏值/未来时间空串。
  harness 夹具按实测形状给历史条目补 `user`/`browseTime`、给收藏条目补 `userId/userImg`/
  `contentCreateTime`（都取 5 分钟前 → 文案稳定落在「N分钟前」）+ `updateTime` 诱饵，
  `hist-card-composition` 断言从"无脚行"翻转为"脚行 `@历史UP` + 右槽 `N分钟前` + 整卡只出现 1 次"，
  `fav-card-composition` 补上右槽 `N分钟前`（若误用 `updateTime`，诱饵值会让它变成"1 分钟前"，
  场景断言与单测的 `doesNotMatch` 一起露馅）；
  历史→播放层断言从"首帧无作者"翻转为"首帧即 `@历史UP` 链接 + 面板头像 + 关注角标 →
  回包后被详情覆写为 `@测试UP` + 回包头像"。夹具头像拆成两张（`PANEL_AVATAR` 面板侧 /
  `RESOLVE_AVATAR` 回包侧），"回包把作者面换掉"才断言得出来；收藏路补上同样的覆写断言，
  三条入口（历史/收藏/搜索）现在断言同形。首帧态一律用 10ms 紧轮询抓（`delay` 模拟回包在途，
  150ms 粒度的 `waitFor` 会落在回包之后）。
- **回归**：lint 干净、单测 126 全绿、`npm run check` 三项通过、构建幂等；`upd-open` 的
  `remount-ok` 仍是既存 flake（0.9.82 已实测其在改动前同样复现），非本次引入。

### 0.9.83（2026-10-03）· 我的页卡面收口：作者唯一落点=脚行、进度唯一落点=封面角标

- **病灶（用户报障：收藏卡 UP 名与「看到」各出现两次）**：三种来源共用同一张 `gridCardOf`
  （`mypage.js` 历史/收藏 + `searchview.js` 搜索；样式同属 `.acsv-g*` 一套），差异本应由契约字段
  决定——但卡面元素没有单一归属，同一信息被画了两遍：
  - **UP 名重复（0.9.82 引入）**：脚行 `.acsv-gfoot` 的判据原为 `pi.upName`，而该字段**只有搜索
    来源产出**，收藏天然进不去；0.9.82 统一作者契约时判据改成 `pi.up.name`（`upName` 退役），
    收藏条目随之满足条件 → meta 行（`石悦`）与脚行（`@石悦`）并存。
  - **「看到 xx:xx」重复（0.9.69 起的既存缺陷）**：封面左下角标（进度语义位，历史卡
    「观看至xx:xx」同位置）画了一处，meta 行又拼了一处。
- **修法**：删掉 meta 行整块（`.acsv-gmeta` 及其 CSS——唯一生产者已移除，属死码）。卡面从此
  **作者唯一落点 = 脚行**（搜索卡 `@UP名 + 发布日期`；收藏卡无日期字段，右槽留空只出 `@UP名`；
  当时的历史卡还没接上作者，故整行不挂——**0.9.84 起历史也出脚行**）、**进度唯一落点 =
  封面左下角标**（历史 `sub`「观看至xx:xx」/收藏 `progress`「看到 xx:xx」）。脚行右槽在搜索卡里
  是发布日期（视频属性），不与应用个人的观看进度混用（与 0.9.82 清掉 `sub` 语义混用同一取向）。
- **不动**：封面比例仍是搜索域 16:9、我的页 4:3——那是封面数据本身的原始比例（搜索页 SSR 出的
  就是 16:9 图，普通视频封面 4:3），属数据事实而非样式分歧；网格容器与类名未动，zone 等消费点
  零影响。
- **测试**：harness 三路卡面组成断言（本次两类重复的机器闸门——**同名文本只能画一次**）：
  收藏卡 → 整卡文本里 `收藏UP` 恰好 1 次、`看到` 恰好 1 次、无 `.acsv-gmeta`、脚行以 `@收藏UP`
  开头、角标以 `看到 ` 开头；历史卡 → 有 `.acsv-gtag`、无 `.acsv-gfoot`/`.acsv-gmeta`、无 `@`；
  搜索卡 → 有 `.acsv-gfoot`、无 `.acsv-gmeta`、作者名恰好 1 次。
- **回归**：lint 干净、单测 124 全绿、`npm run check` 三项通过、构建幂等；`upd-open` 的
  `remount-ok` 仍是既存 flake（0.9.82 已实测其在改动前同样复现），非本次引入。

### 0.9.82（2026-10-03）· 作者契约统一（`item.up` 单一出口）+ 回填后渲染同步（可维护性/正确性批）

- **病灶（用户报障：搜索页与我的页进播放显示「未知用户」）**：两处叠加。① 面板→播放的桥
  `playlayer.itemOfPanel` 只认榜单来源的 `up` 对象，而搜索传 `upName`、收藏把作者名塞在进度
  字段 `sub` 里、历史条目根本没有作者字段 → 桥造出的播放条目作者为空，落进 `data.js` 两个
  `normalize` 里写死的 `user.name || '未知用户'`。② `douga/info` 回包其实一直把真名写回了
  `item.userName/userId`（`appapi.resolve`），但渲染面是 `slide.buildSlide` 构建期一次性拼死的
  innerHTML，唯一的回填钩子 `onHomeResolved` 只刷日期——于是回填写成功、屏幕上的假名字永久常驻。
- **作者契约（统一条目模型）**：作者收敛为**一个可空子对象** `item.up{id,name,img,isFollowing}`，
  顶层 `userName/userId/head/isFollowing` 退役。各来源只在自己的解析器里声明自家字段名（端点形状
  差异是事实，只压缩成一行映射，同 0.9.80「皮肤差异不当重复消灭」）：meow/首页 `user{userId,name,
  headUrl}`、榜单 `userName/authorId|userId/userImg`、收藏 `userName/userId/userImg`（§4.2 实测）、
  搜索页 SSR 的 `.video__main__user`。**搜索来源是白捡的**：SSR 里本来就有 `a[href=/u/<uid>]` 与
  `img.user-avatar`，旧正则只取 `user-name` 文本，把 uid 与头像一起丢了——现在取回，搜索与收藏
  条目的首帧即带 UP 主页链接、头像与关注角标，**零额外请求**。
- **桥梁下沉**：面板→播放的转换 `itemOfPanel` 从 `playlayer.js` 搬到 `data.js` 成为纯函数
  `playItemOf`（作者只做四件套归一，榜单作者卡的扩展字段不带进播放层）。原来这层桥要 DOM 依赖、
  进不了 node --test，且只认当时已知的那一种来源——这正是缺陷能穿过全部测试闸门的原因之一。
- **渲染同步（数据 → DOM 的契约）**：`rail.syncMetaUp`（左下 `@名字` 行）与 `rail.syncRailUp`
  （右侧栏头像/关注块，含"头像源变了就重建 img 节点"——`imgInto` 只在建节点时读一次 URL，
  原地改 src 会绕过它的归一/重试/死链备忘链）都做成**幂等**，`slide._followSync` 无条件注册、
  `onHomeResolved` 末尾重刷。作者未知时**不挂节点**（不编造占位文案）；历史条目与深链冷进入
  在回包后补上名字/链接/头像/关注角标。
- **头像来自同一发回包（2026-10-03 真机实测）**：`douga/info` 的 `user` 里就有 `headUrl`
  （与 meow/首页卡片同键名，`id` 是字符串），所以深链 ac 空间也能拿到**真实**头像——据此在
  `appapi.resolve` 回填 `item.up.img`，**零额外请求**（不必另调 `getUserCardList`）。
  实测形状记入 `docs/api-research.md` §3。（本节当时把"观看历史"也归入"卡面不带作者"，
  该判断有误——**0.9.84 已实测更正**）
- **测试**：新增 `test/unit/contract.test.js`——面板/播放各来源产出键 ⊆ 字段白名单、**播放契约
  顶层禁出现 `userName`/`userId`/`head`/`isFollowing`**（本批病灶的防复发闸门）、`up` 形态固定
  四件套；`data.test.js` 改按 `up` 断言并新增「空 user → `up` 为 null」。harness 三路断言：
  搜索卡首帧 `@晨澜每日分享` + SSR 头像 + 关注角标且 `__ACSV_CARD_CALLS__` 不增（证零请求）→
  回包后名字与头像**双双被真实详情覆写**（头像节点被换掉；`__ACSV_MOCK_DIRECT__` 新增对象形态
  `{id,name,head,delay}` 模拟回包与网络往返）；收藏卡首帧即 `@收藏UP` 链接 + 头像 + 角标；
  历史卡首帧**作者面整个不挂**且全文无「未知用户」→ 回包后补上 `@测试UP`、真实头像与关注角标
  （用 10ms 紧轮询抓首帧态，150ms 粒度的 waitFor 会落在回包之后）。
- **有意不做**：不额外调 `getUserCardList` 补头像——**不需要**：头像随各来源自己的回包就到
  （见上），再发一次是白拉流量（0.9.79 效率批方向）。当时的 `histories[].user` 形状未实测，
  故按"不伪造"留空待补——**0.9.84 已实测到形状并补上**（那条"当前影响仅剩观看历史列表层首帧
  无作者行"的结论随之作废：历史条目本来就在列表层带作者三件套）。
- **eslint**：新增定向禁令——`src/` 下禁 `未知用户` 字面量（把"注释即规格"钉成工具规则，
  同 0.9.78 三条禁令的做法）。
- **回归**：lint 干净、单测 124 全绿、构建幂等、`npm run check` 三项静态校验通过（本批新增
  `appapi → imgurl` 一条 import 边，依赖图已同步）。harness：**注**——`upd-open` 的
  `remount-ok` 是**既存 flake**（偶发 `unmount FAIL@#svfeed/v/10882969`，30s 超窗）；
  在改动前的提交状态上用相同命令复跑同样复现（3 次中 2 次），本批全量跑也时中时不中，
  与改动前表现一致，**非本批引入**（其余 30 场景在各次全量跑中均稳定通过）。

### 0.9.81（2026-10-02）· 测试/文档/CI 工程化：harness 拆场景文件 + 三项静态一致性校验 + 并行驱动

- **harness 拆分**：`test/harness.html` 1589→203 行，只留公共件与分发器；场景体按域拆进
  `test/cases/*.js` 七个文件（feed/stall/views/play/deeplink/upd/msg）。搬迁用「公共件参数前置」
  （`C = window.__ACSV_CASES__; C['x'] = async function (h) { var rec = h.rec, …; …原代码逐字… }`）
  ——场景体一行未改，回归面不变；分发器对未知 CASE 记 `case-known=false`（断言级失败，
  不再「零断言静默通过」）。
- **三项静态校验（`npm run check`，CI 在 build 后必过）**：
  - `test/check-cases.mjs`：cases/ 注册名 ↔ run-harness 名单双向对齐（漏登记即失败）；
  - `test/check-release.mjs`：package.json ↔ 两产物 @version（debug 后缀归一）↔ CHANGELOG 小节；
  - `test/check-deps.mjs`：src 静态 import（含副作用导入）↔ README 依赖图——「每个模块必须在图里」
    「图节点文件必须存在」「特征层 import 边不得缺画」为错误，「基础/工具件的精选多边」与概念边
    只告警。**据此重建依赖图**：补 43 个节点声明（新增 ui/styles/dbg/overlay/topbar + 隐式节点
    推断）与 100 条边（修 0.9.59 之后新积的缺边：attach→feedstore/quality、imdrawer→ubb、
    imshare→imgload、input→各视图、player→api/playback、mypage/zone→viewreg 等），"视图清单
    单一真源" 之后依赖图也有了机器闸门。
- **`ONLY` 参数校验**：传未知名过去静默「0 场景 0 失败」（本批实锤：`views-check` 白跑），现在
  直接报错退出并列出可用场景名。
- **无头驱动并行**：场景标 `serial: true` 的（视频时序判定敏感：stall-*/fastswipe/quality-switch/
  dispose-mid-recovery/spinner-recover/prewarm/watch-report/cdn-fallback/resolvefail/homeswitch/
  smoke/upd-open + dm-smoke/im-open 独立页）串行独占，其余 14 个两两并发；夹具请求计数按
  `pid` 隔离（`/__hits?pid=`）防并行污染。**验收**：全量连跑 3 次零失败（见提交正文）。
- **CHANGELOG 抽离**：`### 0.9.x` 共 80 节自 README 迁至 `CHANGELOG.md`（README 2000→370 行，
  留指针）；「版本号即小节号」的约定改指 CHANGELOG，`check-release` 机器保证。
- **测试**：31 场景全绿（并行+串行混合驱动）；lint 干净、单测 117 全绿、构建幂等。

### 0.9.80（2026-10-02）· 私信卡片装配抽共享层（两皮肤同源）+ 图片手拼 lint 禁令（去重/可扩展性第二批）

- **卡片装配共享层 `imcard.js`**：抽屉（暗色 `.acsv-im-*`）与原生私信页（浅色 Shadow DOM）
  此前各写一份逐行同构的装配代码（改一处漏一处，0.9.77 评审点名的重复面）。共享**结构与
  语义**：视频卡=封面+计数条（播放/评论/时长）+两行标题；评论卡=引用块+来源小条；封面
  "load 才放出 / error 隐藏"（统一时序，防裂图闪）；dougaCard 回包原位 patch（评论卡只动
  来源小条——0.9.51 教训不挖第二次）。**皮肤只声明命名与图标画法**（tag/类名/隐藏机制/icon），
  布局与视觉仍在各自 CSS——皮肤差异是事实，不当重复消灭。顺修一处旧缺陷：骨架无标题的分享
  消息（裸 URL wire），enrich 回来的标题此前因标题元素不存在被丢弃，现恒建元素空则隐藏。
- **测试网先行**：原生页装配此前零自动化覆盖（真机验收过）——先加 `im-native` 场景（造
  `.chat-content-item .message[data-text]` 结构 + `douga/info` 桩，驱动 `enhanceChat`，断言
  Shadow DOM 内卡片结构/附言/评论卡锚点与来源小条/封面 load 才放出，6 断言）钉住改造前行为，
  再动刀；抽屉侧 `im-open` 补 `imCardSmoke` 结构断言（类名/己方类/图标机制/无封面不设 src，
  15→20 断言）。
- **图片 DOM 手拼 lint 禁令**：`el('img')`/`createElement('img')` 在 src 全局禁，例外文件
  （imgload/imcard/imdrawer[鉴权 blob 管线]/emoticon/imgview/rail[站点图标]/sidebar[logo]）
  在 eslint 里逐个注明理由——"图片唯一入口"从注释约定变工具约束，新图面绕过 `imgInto` 会被
  lint 拦下（变异验证：往 views.js 插一行 `el('img')` 即报错）。`new Image()` 不受禁令
  （探测/读自然宽高不是页面图面）。
- **测试**：30→31 场景（新增 im-native）、im-open 15→20 断言；lint 干净、单测 117 全绿、
  构建幂等。

### 0.9.79（2026-10-02）· 省掉两处白拉的流量：播放层直达不预热竖刷 + 榜单首屏缓存（效率批）

- **播放层直达不预热后台竖刷**：从分享链接冷启动（`#svfeed/play/a/<id>`）此前 mount 走普通
  入口，白拉一屏竖刷请求、还要在后台缓冲一屏视频（层里根本不看它）。改为 `feedDeferred`：
  冷启动跳过 `loadInitial()`，`toggle` 尾部 `maybeStartFeed()` 在**真正回到舞台那一刻**
  （无 currentView、FeedStore 仍空）才补拉（带 spinner）；`unmount` 清标志。
  代价明账：从分享链接退出回竖刷要等一次首屏加载（换掉那份白拉的流量与后台解码）。
  新 harness 场景 `play-cold`（DEEP_HASH 冷启动 + MY_MOCK/直挂缝）：层内真起播、`feed().items`
  为空、scroller 无 video（零后台缓冲）、Esc 后竖刷真加载并起播（8 断言）。
- **榜单首屏会话级缓存**：视图每次进入整块重建重拉 100 条（含 100 张封面），来回切纯浪费；
  榜单是**日更数据**（榜期决定、每日更新一次），按 `频道|子频道|榜期` 缓存 5 分钟零新鲜度风险。
  `load()` 命中缓存直出（零请求），未命中原路。**只缓存榜单这一个视图**——我的页的历史/收藏
  **不做缓存**：它们必须反映"刚看过/刚收藏"，新鲜度优先（现行为就是每次重拉，评审明确保留）。
  `my-sample` 加 `rank/channel` 命中计数，view-zone 补两条断言（二次进入真渲染 + 零新增请求）。
- **测试**：29→30 场景（新增 play-cold）、view-zone 38→40 断言；lint 干净、单测 117 全绿。

### 0.9.78（2026-10-02）· 契约钉死：可执行的三条禁令 + 视图清单单一真源（可维护性/可扩展性第一批）

**背景**：0.9.77 评审指出项目多处「注释即规格」（图片唯一入口、播放层哨兵、左栏清单），
本轮把它们钉成工具与结构约束——不新增行为，只为「以后不会写错」。

- **eslint 定向禁令**（eslint.config.mjs）：禁 `URL.split('?')`——0.9.40 实锤（剥参数会把带签名的
  图整条清空），归一/重试链只在 `imgurl.coverUrl`/`coverAttempts`。规则落地即绿（0.9.77 已清零）。
- **策略名拼错必须出声**：`imgload.policyOf(name)` 抽出（未知名 → debug 构建 console.warn + 退化
  空策略；此前静默退化，占位/兜底悄悄丢，只剩重试默认值）；`imgInto` 改走它。harness `cover-fallback`
  补两条：`imgPolicy('grid')` 给全策略（认 `ph` 字段）、`imgPolicy('grrid')` 退化为 `{}` 且恰好一声警告。
- **播放层哨兵函数化**（OVL_IDX，0.9.77 评审点名的"巧合正确"）：`state.js`（零 import）新增
  `OVL_IDX`/`isOvlSlide(el)`/`ownerIdxOf(el)`，哨兵定义从 playlayer 迁入；`attach`/`controls`/`slide`
  三处 `dataset.ovl==='1'` 散读换 `isOvlSlide`；`player` 连播判定改**显式**排除播放层
  （`!isOvlSlide(session.slide) && idx === FeedStore.current`，不再靠 -1 撞不等于）；attach.js 契约
  总表同步。新单测 `state.test.js`（3 条）。
- **左栏 dock 从注册表派生**（消除漂移源）：新模块 `viewreg.js`（零依赖叶子：registerView/viewDef/
  dockEntries）；四个视图模块改从它注册；`mypage`/`zone` 的注册带 `dock:{label,svg,order,group}`
  （SVG 随视图声明，group 变化处 sidebar 插分隔线）；`sidebar.js` 删 ENTRIES 人工清单。`data-view`/
  类名不变（harness 既有断言零改动）。依赖图/模块表/叶子类同步（viewreg 进 leaf）。
- **panelItem 表驱动**（可扩展性第一批）：`data.js` 的 if 链改 `PANEL_PARSERS[kind]` 三解析器
  （history/fav/rank，返回 false=过滤），新来源 = 加一行表项 + 单测，与 IMG_POLICY 同款模式；
  语义零变化（data.test.js + view-my/view-zone 场景原样兜底）。
- **测试**：单测 114→117（state.test.js：哨兵优先级/dataset 缺失/数字与字符串 idx 归一）；
  harness cover-fallback +2 断言（策略名两分支）。29 场景全绿。

### 0.9.77（2026-10-02）· 收口三欠账：播放层重试盒残留 / 图片入口覆盖头像面 / 死链备忘 TTL 语义（+ 我的页三修）

**背景**：0.9.60–0.9.76 一天内的架构与内容推进评审后，三处「名义契约 ≠ 实际」收口（每项都补了可证断言）。

- **播放层重试残留错误盒（用户可见，P1）**：`playlayer.buildErr` 把「重试」键挂在盒外且点击只摘按钮，
  而 `.acsv-errbox` 是 `inset:0` 的全幅遮罩（styles.js）——重载成功后错误文案常驻最上层并吃掉视频
  点按，反复失败还会一盒叠一盒。修：重试键进盒、点击整盒撤除再重跑；「网络不可达」分支同走此盒
  （此前该分支没有重试出口）。harness `play-deep` 补四条：错误盒真在屏（offsetParent+几何）、
  失败重试不叠盒（errboxes===1）、恢复后重试盒撤且层内真起播、坏形态视图可见性。
- **图片入口覆盖头像面（P2）**：`imgInto` 此前只有 5 处调用——竖刷右栏头像（rail）、评论头像
  （comments）、私信列表头像（imdrawer）、分享面板头像（imshare）四处仍是手拼 `el('img')`，其中
  前两处**连失败兜底都没有**，评论头像还直吃接口值（http 老头像在 https 页必被混合内容拦）；四处的
  `.split('?')[0]` 与 `imgurl` 的「query 一律保留」契约相悖（0.9.40 教训的残留形态）。全部改走
  `imgInto(..., 'avatar')`（归一+重试+默认头像兜底），`split('?')[0]` 全仓归零；`imgload.js` 头注
  按实况校准「覆盖边界」（已收口清单 + 有意不并入的例外：鉴权 blob 管线/UBB 与表情 HTML/站点静态
  图标/大图查看器），README 模块表同步。
- **死链备忘 TTL 语义（P2）**：0.9.76 的终败路径每渲染一次就重写时间戳——来回进出视图的死链
  **永不过 TTL**，与「过期给一次复试机会」的注释意图相反；且备忘命中被 `terminal()` 直接吞掉，
  头像策略跳过默认头像兜底。修：判定抽成 `imgurl.memoState`/`memoTrim` 纯函数（**只读不写不续期**，
  离线单测钉三轮语义），`imgload` 只在首次判死时 `memoMark`，命中备忘且有 fallback 的策略直走兜底图。
- **重试链第三跳换 URL**：0.9.76 第三跳只换 referrer、URL 与第二跳全同，与自家「失败负缓存必须换
  URL」的理由自相矛盾；现追加 `acsv_r3` 尾参（同一次决策内三跳 URL 两两互异，单测断言）。
- **我的页三修（P2）**：① 历史翻页「到底」判据原按**筛除后**条数（契约层会滤掉番剧/无 videoId
  条目，"有效行 < pageSize" 在筛除后恒真，首页 20 原始→18 有效时会把还有下一页的列表误判成到底）
  且首屏走 null 分支恒不隐藏——改按**原始条数**判、判据用闭包 `btn`（0.9.77 首轮修复按有效条数
  判被 view-my 场景钉出误判，一并校正）。② `moreBtn(null)` 被其内部 `onClick(b)` 调用——收藏夹
  点「加载更多」每次抛 TypeError 且按钮卡死「加载中…」；`moreBtn` 加防御 + 收藏夹改经回调驱动。
  ③ 我的页两列表补请求令牌（searchview 同款 `seq`）：慢网换夹/换页时旧回包丢弃，不再把旧夹的
  行追加进新夹列表、不再推进页码。
- **顺带**：删 `views.js` 的无 CSS 死类 `acsv-with-view`（0.9.73 起已无消费方）；`player.js` 连播
  判定补哨兵注释（播放层 idx=OVL_IDX 与 FeedStore.current 恒不等是**有意**的层内隔离，禁改
  `hooks.currentIdx()`——-1===-1 会把竖刷滚到第 0 条）。
- **测试**：单测 112→114（`memoState` 三分支/命中不续期/过期即清、`memoTrim` 淘汰序；第三跳断言
  改写为「两两互异」）；harness 新增 `GET /__hits` 计数端点（run-harness）把「重试链真的打了网络」
  与「备忘命中的二次进入零请求」变成可证断言——`cover-fallback` 补六条（flaky 恰好两发、死链恰好
  三发、退出等到视图真拆（waitFor 首判同步，同 task 内连改 hash 会被浏览器合并成净零变化、
  一个 hashchange 都不发——踩实教训写进断言）、二次进入 img 无 src、零新增请求、降级占位仍在）；
  `play-deep` 补五条（错误盒真在屏/不叠盒/恢复后盒撤且起播/坏形态可见性；计数限定正文直接子级
  ——slide 自带隐藏错误盒会污染计数）。29 场景全绿。

### 0.9.76（2026-10-02）· 封面加载策略：URL 归一 + 失败重试链 + 终败降级（图片加载收成单一入口）

**病灶**（用户实测：搜索/历史/收藏偶发封面裂图）：三处封面此前共用一段裸 `<img>` 装配
（`src` 直取契约字段 + `no-referrer` + `loading=lazy`），**链上零失败处理**——无归一、无重试、无兜底，
一次失败就把 Chrome 裂图永久留在卡上。三个成因：① 老条目 http 封面在 https 页面被混合内容拦掉
（播放直链早有同款归一 `appapi.js`，封面漏了）；② 腾讯 CI 处理参数（`imageMogr2/…`）失败时没有回退
原图的路；③ 瞬时网络失败无重试，且浏览器对失败过的 URL 有负缓存，原样重发可能不打网络直接再报错。

- **新模块 `imgurl.js`（纯逻辑层，零 import）**：`coverUrl` 归一（trim/实体解码/http→https/协议相对
  →https/其它 scheme 原样；**query 一律保留**——0.9.40 剥参数清空签名图的教训）+ `coverAttempts`
  重试链决策（三跳：原 URL → 600ms 后**换一个 URL** 重试[CI 形态去 query 回原图，否则追加 `acsv_r`
  破缓存] → 1200ms 后同 URL 换原生同款 referer 兜住宿主防盗链；`data:`/`blob:` 只一跳不重试）。
- **新模块 `imgload.js`（执行层，图片唯一入口）**：`IMG_POLICY` 策略表把图面差异收成一表
  （grid/thumb/avatar/space 四种：懒加载/重试/兜底/占位/淡入）+ `imgInto(host,url,policy[,cls])` +
  `lazyObserve` 观察器单例。终败形态：img 隐藏 + `.acsv-imgfail` 类 + 网格卡暗字「封面加载失败」
  （用户点名：静默灰块分不清加载中/已失败）；头像失败回落默认头像；会话级失败备忘（TTL 10 分钟/
  上限 200）让视图重建不重打同一死链。
- **契约层归一**：`data.js` 的封面/头像字段（history `cover`/fav `contentImg`/rank `videoCover` +
  `up.img`/资料头 avatar/meow 与 selection 的 cover·head/`homeItemOf`）全部过 `coverUrl`——氛围底图
  与播放层继承；搜索 SSR 解析顺带支持 `data-src`/`data-original` 懒加载形态（`src` 可能是占位图）。
- **消费点收敛（grep 全消费点后逐一接线）**：`gridCardOf`（搜索/历史/收藏）、`rowOf` 缩略图、
  `upCardOf` 头像、我的页资料头、空间页投稿格全部收敛成一行 `imgInto`；空间页顺带修掉「失败即永久
  `opacity:0` 隐身空卡」（旧代码只有 load 才加 `ld`，error 无人管）；`imdrawer` 的 `imImgLazy` 并入
  共享 `lazyObserve`（全项目只留一份 IO 实现；私信鉴权/blob 管线保持原样——真机验收过的链路不重开）。
- **测试**：新单测 `imgurl.test.js`（归一 + 重试链枚举：CI 形态/普通 URL/签名 query/data:/空）+
  `data.test.js` 补 http→https 与 `data-src` 两例（单测 106→112）；新 harness 场景 `cover-fallback`
  （mock 历史三条封面：好图/flaky/死链；静态服务加 `/flaky-cover.png` 特判首拉 404 再拉 200——
  断 `naturalWidth>0` 即证明重试链真的发生；死链断 `.acsv-imgfail`+隐藏+占位文案；终态不变量：
  每张封面要么加载成功要么已隐藏，不许裂图）（28→29 场景）。**变异验证**：短路重试链 →
  `cover-retry-loads` 挂（实测 `src=/flaky-cover.png nw=0`，即只发了首拉 404）；`terminal()` 置空 →
  `cover-dead-degrades`/`cover-no-broken-glyph` 挂。**首个变异暴露的教训**：`img.acsv-imgfail{display:none}`
  的 CSS 兜底会让「删掉脚本隐藏分支」的变异照样全绿（断言被 CSS 兜住、没钉在脚本行为上）——已删该 CSS
  规则，隐藏/占位收成脚本单源（重复实现会掩盖分支被改坏）。
- **有意不做**：GM 通道拉封面（要扩 `@connect` + blob 生命周期，收益不值）；封面 preconnect
  （`<img>` 是 no-cors 连接，复用不了现有 CORS 匿名 preconnect；首个 img 请求本身即建连）；不做每图
  微光 shimmer（懒加载离屏图会长期微光，灰底与骨架同色更安静）；评论/侧栏头像与表情/UBB 图本次不迁
  （README 已登记：新图面一律走 `imgInto`）。

### 0.9.75（2026-10-02）· 抽屉动画抽离（列表↔会话双向平移）+ 私信信封开合 + I 快捷键

**用户三点实测**：① 联系人列表↔会话切换无动画、生硬；② 私信没有快捷键；③ 顶栏信封点第二遍没反应、关不掉抽屉。

- **动画抽离（单一来源）**：评论抽屉与私信抽屉此前各自逐字重复一套滑入骨架（`translateX(100%)` +
  `transition:transform .28s ease` + `.open{translateX(0)}`，只差宽度默认值/背景 .96↔.97），现在合并为
  一条共用选择器规则（`.acsv-drawer,.acsv-msgdrawer{…}`），各自只写差异。**时长收成 `:root` 的
  `--acsv-dw-t`**：抽屉与 7 处「让位」过渡（顶栏 right / 正文 right / 视频与侧栏 transform / 底栏 right /
  弹幕画布 / 加载圈 left）全部引用它——让位量按抽屉位置插值，必须同曲线同时长才逐帧贴合，收成单源后改
  一处全局同步，禁止各自取值（harness 断言 computed duration 三者相等，反例即 0.28s/0.5s 分化）。
- **列表↔会话「双向平移」**（iOS/微信式下钻）：两视图不再 `style.display` 硬切，改为包进
  `.acsv-im-stage`（relative + **overflow:hidden**——两面板要 translateX(±100%)，而 `.acsv-msgdrawer` /
  `#acsv-root` 都没有 overflow，不裁就会滑出视口/出横向滚动条）后绝对定位叠加（`.acsv-im-pane`），状态
  类是抽屉根的 `.chat-on`：列表左移 −100% 退场、会话从 +100% 滑入归零，返回反向；返回键显隐也收进 CSS。
  **坑**：`refreshList` 的「列表可见才短路刷新」判据原读 `listView.style.display`——display 不再表达视图
  态后必须改读 `view === 'list'`，否则列表刷新永久短路（发消息后新会话不冒头）。
- **顶栏信封＝开合**：旧 `onDrawer: openDrawer` 恒开，二次点击走 `overlayOpen` 幂等收旧（同 tick 摘类又
  加类被合成）＝观感「点了没反应」。新增 `toggleImDrawer`（`isImOpen()` 以 class 为唯一真源），且**关闭
  分支放在登录门槛之前**——未登录/登录失效也能关；分享面板的 `openChat`（直达会话）仍只开。
- **`I` 快捷键**（input.js）：插在「模态门禁 + 输入框目标豁免」之后、**视图门禁之前**——竖刷/我的/榜单/
  搜索/播放层全界面通用（顶栏信封本就四界面常驻），输入框聚焦不触发；`c`（评论）在视图态仍被吞（视图里
  没有「当前条」），两者语义不同不合并。
- **测试**：`im-open` 6→15 断言（舞台裁剪/面板绝对定位叠加/过渡在场/时长单源/双向位移实测——翻类后等
  420ms 过渡回落再量，变换是异步的，立刻量等于量起点）；`view-im`·`view-im-narrow` 19→28（新增
  `imPaneSmoke` 只切状态类、不跑网络/轮询；视图态 `i` 直接关掉开着的抽屉；缝开→点信封→必须关；缝开→
  `i`→必须关；未登录 `i` 出登录提示；输入框聚焦 `i` 不触发）；`view-my` 40→42（该场景假 `auth_key` 是
  登录态——撤 cookie 验未登录分支、测完还原）；`play-deep` 28→30（播放层 `i` 生效且不打断层内视频）。
  **变异验证**：`toggleImDrawer` 还原恒开 → 三条断言挂；顶栏让位过渡改回字面量 `.5s` → 时长单源断言挂。
  单测 106 + 28 场景全绿。
- **搜索框清空（0.9.75 补，用户实测）**：离开搜索上下文时清空顶栏输入框——此前只在 `view==='search'`
  时按地址回填、离开没人清，返回列表后残留上一次关键词。上下文由 views 判定随 `syncTopbar` 的 opts 传入：
  搜索视图本身，或**从搜索页打开、尚未回到别处的播放层**——深钻（点结果卡进播放层）保持关键词，真正
  离开（返回列表/竖刷，或经播放层再跳到别的界面）才清；其余 hashchange 不碰输入框（保留 0.9.73「不打断
  正在拼字」契约）。harness：view-search 29→32（层内保持/返回即清）；变异验证：去掉清空分支 →
  `search-leave-clears-kw` 挂（实测残留 `v="深链词"`）。
- **有意不做**：不做抽屉动画的 JS 抽象层（两个消费者共用选择器 + 一个时长变量已够）；不做 iOS 视差（列表
  只移 −30%）；不给评论抽屉加二级页；不动 `openChat`（分享面板直达会话仍只开）。

### 0.9.74（2026-10-02）· 列表条目就地播放（播放层子视图）+ 竖刷落点稳定化

**病灶**（用户实测：「点榜单/我的页条目跳转播放，要往下滑几条才见到所选的视频」，初判像缓存）：
不是缓存脏数据，是 `playAc → scrollToIndex` 的**落点**算不准，三条机制叠加——
① 索引→像素映射不稳定：`renderWindow` 只渲染 `[cur-1, cur+1]`，远跳时 DOM 稀疏，而
`slide.offsetTop` 表达的是「DOM 顺序 × 视口高」（不是索引）；落地后窗口渲染在 cur 前补插一张
就会让内容整体平移，而 `scrollTop` 是像素锚点不动 ⇒ 视口里显示上一张，IO 顺手把 current
设回去——观感正是「停在目标上方几条」。② 远跳的平滑滚动会被泵流补渲染/`scroll-snap-stop:
always` 吸附点截断，落点漂移。③ **命中缓冲的同步跳**在子视图里执行（hashchange 是异步任务，
微任务链先跑完）：此刻 scroller 是 `display:none`，无布局盒 ⇒ `offsetTop` 恒 0 ⇒ 等价
「滚回第一条」——越常看的条目越容易命中缓冲，越必现，这就是「像缓存问题」的来源。
harness 盲区：旧断言只看游标/URL/起播，**没有一条钉「视口里就是目标那张」**，全绿而真机坏。

- **播放层（`src/playlayer.js`，子路由 `#svfeed/play/<v|a>/<id>`）**：列表条目（我的/榜单/
  搜索）点击改为**就地覆盖播放**——不再插竖刷队尾、不再跳回竖刷，竖刷缓冲/游标/源记忆零改动
  （旧 `playAc` 契约废止删除）。形态=子视图 `play`（复用 0.9.62 框架 + 深界面来源保活）：
  z 档（视图 55）、共享顶栏、dock、Esc 栈、抽屉避让全部复用；地址是标记深链形态，**天然免疫
  syncHash 回写**（既有的 `parseRoute().view` 守卫零改动）。条目真源=地址栏：点击路径用面板
  条目出即时首帧（标题/封面/UP 头像），冷进入（分享链接/刷新）走 `API.deepLink` 先解析（拿
  标题/封面/来源），失败出错误盒+重试（绝不静默）；**不 setSource**——播放解析链走 appapi
  （douga/info + playInfo），与竖刷内容源无关。层内不建上下箭头（没有竖刷邻居）。
- **来源视图保活 + 来源链（`views.js`）**：进深界面（`def.deep`：搜索/播放层）把来源压进来源
  链；来源可保活（非 `def.volatile`）则**挂起其 DOM**——类名换 `acsv-view-held` + `visibility:
  hidden`（visibility 保盒子在，`.acsv-view-body` 的滚动位不丢；换类名是因为 `.acsv-view` 是
  全项目/harness 的「当前视图」定位锚，留两个同构节点会污染既有断言）。回来原位复原、跳过
  build、不重拉。`def.volatile`（播放层握播放会话/定时器）不入链也不挂起：离开即真拆——隐藏
  容器里继续出声绝不允许；同屏换参（搜索换词）替换链顶那层，不叠层。关闭语义：普通视图
  Esc=回竖刷（不变）；深界面 Esc=回来源链顶（空链回竖刷）。
- **✕ 单一意义 + 顶栏「向左返回」**（用户裁决）：✕ 永远=退出脚本回首页（普通界面 Esc 另义，
  故 title 只在竖刷态带 Esc 提示）；深界面（搜索结果页/播放层）在顶栏左缘（=左栏右缘）出
  样式同款「向左返回」=回来源链顶——它们的来源不在 dock 上，必须有返回出口；普通视图出口
  仍是常驻 dock + Esc。
- **竖刷落点稳定化（`player.js`）**：`scrollToIndex` 三条收敛——目标不可见时**延后落地**
  （rAF 轮询舞台可见）；远跳（|Δ|>1）改**瞬时落位**；落地后两帧复量回正一次（补插 slide 会
  平移内容），用户自己滚过（偏离超半屏）立即放弃。近跳（箭头/连播）保持 smooth，手感与代码
  路径零变化。
- **隐藏态起播门禁**：`setActive`/会话 `play`/`onAttachPlay` 按「视频自己那张舞台」判可见性
  ——竖刷被盖住不起播（视图冷启动 `loadInitial` 晚到会把背后视频播起来＝幽灵音频），但同一门禁
  **不拦播放层里的视频**（层内 slide 不在 scroller 里，用全局 stageVisible 会连自己一起挡，
  实现期实测踩过）；键盘手势按 `state.videoTarget` 覆盖「当前视频」，**有钩子不回落竖刷**
  （层内还没挂上 video 就什么都不打）；`c` 键评论开合打层内条目（`playlayer.currentItem`，
  不是竖刷当前条）、`↑↓` 照旧吞掉（层内没有竖刷邻居）。
- **解耦守卫（`data-ovl` 唯一判据，attach.js 契约表在册）**：层内 slide 用 `OVL_IDX=-1` 哨兵
  ——slide 点按判定、`attach.syncFwdQuality`、`controls.rebuildFwdNeighbor` 全加守卫（少了它
  `items[-1+1]` 会打到竖刷第 0 条，把背后邻居重挂一遍）；rail 在 `goTo=null` 时不建箭头；
  `SESSION_HOOKS.currentIdx` 层开返回哨兵（会话自动起播判定）。视图条目点击出口改由
  playlayer 注册注入（`setItemOpener`）——views 不再 import player，循环依赖少一条。
- **测试**：单测 106（route 加 play 形态：v/a 标记 + src 落位、**不填 mid**、裸 `#svfeed/play`
  落视图分支、脏输入不激活）；harness 28 场景——新增 `play-deep`（28 断言：冷进入自解析/标题/
  不切源/竖刷零改动/层内切清晰度不污染邻居/坏形态错误态/未命中错误盒+重试/返回键与 ✕ 语义/
  键盘重定向/评论键打层内条/幽灵音频防线），view-my·view-zone 改写为播放层契约（40/38 断言：开层真起播、
  竖刷零改动、关闭回来源且**同一节点**），view-search 点卡改播放层 + 返回键回搜索页不重拉
  （29 断言）；`deeplink-sv` 加 `warm-jump-landed`、view-zone 加 `hidden-jump-landed` 落点
  不变式（**断言先判舞台可见**——隐藏态矩形恒 0 会把几何断言假绿骗过，实测踩过）；view-my 加
  4 条来源保活断言（节点同一性/滚动位/请求计数/唯一 `.acsv-view`）+ view-zone 加两级进入的
  舞台记账断言。**变异验证**：还原旧落点行为 `hidden-jump-landed` 挂（cur=0，正是用户报障）；
  还原旧记账 `stage-wasplaying-kept` 挂（wasPlaying 被二级进入覆盖成 false）。
- **有意不做**：播放层内列表上下条切换、方向键在层内改列表（需注入列表上下文，二期再说）；
  绝对定位+占位撑高的布局改造（点击路径已改播放层，残余面只剩深链热跳，落点三条收敛已够；
  该改造动核心布局、28 场景几何断言面太大）；播放层切内容源（不 setSource 是契约）。
- harness 驱动：场景表新增 `play-deep`；mock 缝新增 `__ACSV_MOCK_DIRECT__`（点名直挂：
  面板/搜索结果条目 id 不在 home 卡片池时，测试要它真起播——同款本地 webm 直挂，webm 套
  hls.js 会死在解析上）。

### 0.9.73（2026-10-02）· 顶栏四界面复用（推荐/榜单/我的/搜索）+ 抽屉避让推广到视图

- **顶栏四界面复用**（0.9.72「待拍板」定稿）：共享顶栏（搜索框 | 私信 | 更新 | ✕）在视图态提到
  视图容器之上（z 序 视图 55 < dock 56 < 顶栏 57 < 抽屉 58 < 大图 60 < 更新 65）；源切换由 CSS
  真隐藏（此前只是名义隐藏——视图里点它会静默重置背后 feed 且零界面反馈）；各视图自带的视图头
  （`.acsv-view-head`/`.acsv-view-x`）与搜索视图内自带胶囊（`.acsv-vsrow`）整体删除：**顶栏搜索框
  就是搜索视图唯一输入框**——syncTopbar 按地址关键词回填（深链/刷新回放落点），搜索视图挂载期
  `setSearchHandler` 接管提交（同词再回车 hash 不变，就地重跑；teardown 还原默认提交，否则旧闭包
  劫持离开视图后的 Enter）。
- **抽屉避让推广到视图**（本次核心）：视图里也能开私信抽屉（顶栏入口），避让语义按项目理念补齐——
  **视图正文右缘收窄到抽屉左缘**（`right:var(--acsv-dw)`，与抽屉同 .28s ease：线性插值下正文右缘
  恒等于抽屉左缘，逐帧贴合，无先跳后盖）；卡片不缩放，网格 auto-fill 自然重排。中窄视口
  （<`CFG.view.avoidW`=1140，按榜单行最小可用宽推导）退化为纯覆盖——视图不能像视频那样缩放，
  阈值只能比 `avoidMin` 更严，防 338px 定宽列被挤压出横向滚动条。
- **顶栏让位收口**（顺手修 0.9.72 遗留：右组 `translateX(-dw)` 左移后会压在居中搜索框上，顶栏进
  视图后四界面全可见）：改为**顶栏整体收窄到抽屉左缘**——右组随容器贴边（不再吃 transform），绝对
  居中的搜索框随容器自动回剩余区中心，并按「剩余宽 − 右组预留 304」收窄，绝不压到右组；视口窄到
  搜索框不可用（<`CFG.view.avoidTopW`=1012）时只留右组；避让态隐藏源切换（抽屉开着时切源会静默
  重置背后舞台）。
- **退出视图的浮层对称收尾**：`exitView` 补 `overlayTeardown`——离开视图（Esc / 点卡片 / dock 直切）
  时视图内开过的抽屉/弹窗一并收，避免「回竖刷还挂着抽屉、视频被避让顶开」的跨舞台残留；Esc 链
  在视图态=抽屉→视图→竖刷（浮层栈天然支持，input.js 零改动）。
- 验证：单测 105 不变；harness 27 场景全绿——新增 `view-im`/`view-im-narrow` 各 19 断言（正文让位
  几何/右组贴边/搜索框不重叠/按钮可点/Esc 逐层；窄视口护栏降级纯覆盖 + 无横向溢出；驱动首次支持
  按场景设视口）、`view-search` 25 断言（新增同词重跑、深链回填、重建指纹改挂视图自有节点——顶栏
  输入框是常驻单例，「节点换新」不再能证明重建）、view-my/zone 各补顶栏复用 6 断言。imdrawer 抽
  `openDrawerCore` 供 `imOpenSmoke` 模拟缝（真实避让路径：浮层栈+抽屉槽+syncCommentVars，不拉
  ImSdk/不依赖登录）。四个界面 + 抽屉态截图核对通过。

### 0.9.72（2026-10-02）· 深链修病灶：粘贴链接不再被随机流吞掉（地址栏带来源标记 + 挂载态就位同步）

**病灶**（用户实测：「有时复制链接粘贴到地址栏会被进入即刷新机制误刷」= 内容被重新随机）：
地址栏 `#svfeed/<id>` 的 id **跨两个 id 空间**——小视频是 meowId（`normalize` 落 `raw.meowId`）、
推荐是 acId（`normalizeHome` 落 `Number(bc.href)`），裸数字形态语法同形不可分辨，而解析路径却由
**持久化的源记忆**决定、失败还静默降级。于是：
① 源记忆=推荐时 `mount()` 的 `if (getSource() === 'home')` 直接把深链丢掉 → 重新随机一屏推荐；
② 源记忆=小视频时深链被拿去打 `meow/info?meowId=<acId>` → 查不到 → `loadFirst` 静默
`fetchMore()` → 重新随机一屏小视频。两条路症状一致且**无任何提示**，「有时」= 取决于当时源记忆。

- **地址栏写来源标记**：`#svfeed/v/<meowId>`（小视频）/ `#svfeed/a/<acId>`（推荐）——复制粘贴
  出去的链接零探测零歧义（也避开「ac id 恰好是合法 meow id → 解析到错视频」的静默错）。
  `parseHash` 新增 `src` 段，标记段只有 `v/a` 两个字母且**必须带数字段**才成立（裸 `#svfeed/v`
  仍落视图分支，与 `#svfeed/my`/`zone` 天然互斥，单测逐形态钉住）；`syncHash` 与空间页入口
  （uppage 写 `v/`）一律写标记形态。旧的裸数字链接仍兼容：解析层先按 meow 再按 ac 探测。
- **解析与内容源解耦**（`API.deepLink(mid, src)` + 纯函数 `data.deepLinkOf`）：meow 详情命中
  且带直链 → sv 源；未命中回落 `douga/info` → 造懒解析 home 条目（直链交 `ensureResolved` 补），
  **源随链接走**（命中即 `setSource`，与顶栏手动切源同语义同持久化）——否则分享给推荐源用户
  的链接永远打不开。彻底删掉 `mount()` 里按源记忆丢弃深链的分支。
- **失败不再静默随机**：解析未命中走既有错误盒（可重试），不再回落 `fetchMore()` 随机流
  ——旧行为下用户只看到一屏随机内容，无从判断链接是否生效。`FeedStore.loadFirst` 随之删除
  （它的「缓冲有则跳/否则拉」两条分支都被下一条的就位同步取代）。
- **挂载态深链就位同步 `syncRouteFeed()`**（P2）：`mount()` 的 `if (root) return` 让深链只在
  冷启动生效——**已在竖刷页时粘贴链接原本是彻底无操作**，且随后 `syncHash` 还会把地址栏回写成
  正在播的那条。新增与 `views.syncRouteView` 对位的补位（子视图早已做「当前 vs 路由」比对）：
  目标已在缓冲 → 原地跳（不重置不重拉）；不在缓冲 → 走冷启动同一条深链路径；`mid` 相同或
  无 `mid`（Esc 回 `#svfeed`）一律不动流。`appliedMid` 由 `mount`/`syncRouteFeed`/`syncHash`
  共同维护（放 route.js，与 syncHash 同处一个同步状态），`unmount` 清空。
- **`scrollToIndex` 修静默失效**：它只渲染 `[cur-1, cur+1]`，目标落在窗口外时 `slideAt(idx)` 为
  null、`setActive` 被 `if (slide)` 跳过 → **整跳无声失败**（深链就地跳转与视图条目「插入队尾
  播放」都踩这个）。改为先把游标挪到目标再 renderWindow（挪前照 `setActive` 的规矩对旧条目上报
  观看进度）。
- **`cancelHashSync()`**：切流/深链重置前撤掉在途的地址回写——残留定时器会拿旧 index 去读重置
  后的新 items，把地址写错（0.9.62 视图地址被踩成深链的同型实锤）。
- **测试**：单测 104（route 全形态含标记段与裸字母视图名互斥、`deepLinkOf` 四路判据）；
  harness 新增 5 个场景（此前深链路径**零覆盖**——所有场景都只设不带 id 的 `#svfeed`）：
  `deeplink-sv`（v 标记置顶 + 起播 + 挂载态就地跳转且不重置缓冲）、`deeplink-bare`（老裸形态
  探测）、`deeplink-ac`（a 标记经 douga 详情置顶）、`deeplink-switch`（源记忆=推荐 仍须落地）、
  `deeplink-miss`（错误盒 + 缓冲为空，对比旧行为）；深链场景的 hash 必须在 bundle 求值前写好
  （boot 在 document-end 读 `location.hash`）。**变异验证**：把旧行为改回来
  （`getSource() === 'home'` 丢弃 + `syncRouteFeed` 短路）时 `deeplink-switch` 连挂 3 条断言，
  其中 `deep-hash-marked` 实测地址栏被写成 `#svfeed/a/48867212`（随机推荐卡的 id）——正是用户
  报的「内容被重新随机」。24 场景全绿。

#### 同版二期：顶栏重做（72px + 居中搜索框 + 抽离共享组件）+ 抖音式搜索视图

- **顶栏抽离**（`src/topbar.js`，对齐左栏 dock 三件套）：`buildTopbar/syncTopbar/teardownTopbar`；
  右组四件套（源切换 seg｜私信｜更新｜✕）类名与事件原样迁移、行为经 hooks 注入（组件不反向
  import player，避免循环依赖）；`views.syncRouteView` 调 `syncTopbar(view)` 与 `syncDock` 对位
  （视图态隐源切换、✕ 语义改「返回竖刷」；视图态是否把顶栏提到视图之上待「三界面复用」拍板）。
- **高度 56→72px**：`--acsv-top-h` 单源（`:root`），`.acsv-toast{top:calc(var(--acsv-top-h)+14px)}`
  联动（原 70px 是 56+14 的隐式耦合）；顶栏左缘让开左栏（`left:CFG.view.dockW`），窄屏还原满宽。
- **搜索框居中常驻**（抖音同款位置）：胶囊 `min(480px,44%)` 绝对居中；窄屏改流内自适应（否则压
  右侧按钮组）；Enter/按钮 → `#svfeed/search/<kw>`（关键词进地址，可分享/刷新回放）。
  抽屉避让不受影响：`.acsv-top-right` 照旧 `translateX(-dw)`（真机实测 -380px ✓）。
  （0.9.73 起改为顶栏整体收窄到抽屉左缘——右组不再吃 transform，见上方 0.9.73 条目。）
- **搜索视图**（`src/searchview.js`，抖音式结果网格）：数据源 = 搜索页 **SSR 整页 HTML**
  （`net.requestText` 文本通道 + `data.parseSearchItems` 纯函数：反转义 → 只吃 `.search-video`
  区段（整页 113 个 /v/ac 混有 UP 投稿/文章/推荐位）→ acId 去重 + 实体解码 + 坏段跳过）；
  `?pageNo=` 实测无效 → 只做首屏 + 底部「去 A 站搜索页看全部」出口。结果卡复用 `gridCardOf`
  扩展（封面左下播放数（原生字形+数字）/右下时长 / 标题两行 / 底部 @UP·日期——历史/收藏不传
  这些字段渲染零变化）；点击走现成 `playAc` 回竖刷。关键词唯一真源 = 地址栏（视图内 Enter 写
  hash → hashchange → 按 arg 重建；同词再搜就地重跑）。路由 `viewRe` 放行非数字参数
  （`decodeArg` 坏编码原样不抛，单测钉转义/截断编码）。
- 验证：单测 105（+parseSearchItems 2 条 + route 关键词段 1 条）；harness 25 场景（新增
  `view-search` 14 断言：顶栏 72/胶囊居中/toast 不压顶栏/顶栏提交→地址带词→结果卡字段/视图内
  换词重建（DOM 换新节点指纹）/空词不发请求/点卡片回竖刷）；真机（注入构建）复核 30 张真实
  结果卡 + 抽屉避让 + 窄屏 640（顶栏满宽、胶囊流内）。坑实锤：场景断言"瞬时满足"的 waitFor 后
  **同步**检查重建/请求计数 → 换词重建要过一拍，等价断言必须 waitFor（排查过程用 `__dbg` 探针
  定位，未误判为应用缺陷）。

### 0.9.71（2026-10-02）· 视图头去掉标题字（左栏 dock 已有选中态）

- 分区榜单/我的 视图顶部原显示「分区榜单」「我的」标题（`.acsv-view-title`）——与左栏
  dock 的标签+高亮重复（用户点名删除）。头部只留右上角 ✕（返回竖刷，Esc 同效），head
  改 `justify-content:flex-end`；框架 `buildHead()` 不再接收 def.title，registerView 的
  title 参数随之退役（消费点 grep 全清：规则/参数/断言一并删）。
- harness 断言改钉「dock 选中态」为视图身份锚：zone-open 查
  `.acsv-dock-item[data-view="zone"].on`；view-my 的 view-open 去掉标题字检查
  （紧随其后的 dock-highlight 断言已覆盖）。
- 95 单测 + 19 场景全绿；真机复核头部仅 ✕、dock 高亮正常、榜单内容不受影响。

### 0.9.70（2026-10-02）· 榜单内容宽 1200→1600（宽屏两侧太"空"）

- 0.9.69 按原生把 rlist 内容宽定为原生同款 1200 居中；实看 1920 屏两侧各留 355px 空白
  「太空」（对比 harness 页 1280 窗下内容铺满可用宽 = 偏好的密度）。
- 修：`.acsv-zone-wrap` max-width **1200→1600**——1920 下内容占 84%（与偏好密度一致），
  并与我的页 `.acsv-mewrap{max-width:1600}` 同宽同密度；**卡内指标不变**（封面 160×90、
  行高 130、标题单行/简介 3 行/meta 贴底+原生图标/48px 旋转水印/UP 卡 129 全按原生）。
- harness view-zone 断言不受影响（1280 窗下上限本就取不到 1200/1600 之差）；95 单测
  + 19 场景全绿；真机复核 1920 下 wrap=1600、行高仍逐行 130。

### 0.9.69（2026-10-02）· 榜单全量对齐原生（行高 201→130 + meta 贴底原生图标）+ 我的页抖音式个人主页

#### 榜单对齐原生 rank/list（真机逐项量取定案）

- **基准（IAB 打开原生 acfun.cn/rank/list 实测 computed style）**：行 **129.67**（UP 卡 129
  撑起行、视频卡 125+4）、封面 **160×90** 直角、标题 **单行** 16px、简介 **clamp 3 行**（保
  留 `<br>` 折行）、meta **贴信息块底（≈封面底）** 12px/12 三段图标、UP 栏 **338**（无间隙、
  扁平透明+左 1px 竖线）、头像 90、签名 **固定 3 行（48px 恒占位）**、行分隔线在行上跨两栏、
  列头 CN 18/EN 10、水印 **48px 粗体 rotate(10°)** #eee 贴卡右下（bottom:-8 探出被卡裁）、
  内容 **1200px 居中**（`.acsv-zone-wrap`，视频卡 862+UP 338，文字块 654）。
- **图标=原生字形零新依赖**：原生用 `acfun-frontend-next`，与 styles @font-face 注入的字体
  **同一文件（URL 逐字节相同）**——码点实测登记 imicons.GLYPHS：播放 `U+E164`/评论 `U+E161`/
  时间 `U+E2F5`/粉丝 `U+E155`（投稿复用 share `U+E15B`），真机 `document.fonts.check` 通过、
  截图确认无豆腐块。
- **契约层结构化（views 零分支）**：`panelItem('rank')` 产出 `meta=[{k:'view'|'comment'|'time'}]`
  三段（契约层拼好文案，rowOf 按 k 出字形）+ `up.fansText/contribText`（新纯函数 `fmtWan`：
  <1万原样、≥1万一位小数去尾随 .0——原生实测 33235→3.3万 / 29978→3万）；desc `<br>` 折行
  （原折空格）；签名**去掉 60 字硬截**（3 行裁切交 CSS）。
- **`relTime` 重写为原生四档 + now 可注入**：今天 `<1h`「N分钟前」/「N小时前」、昨天/前天
  「昨天H时MM分」、更早「M月D日 H时MM分」（MM 补零 H 不补零，原生实测 0时10分/8时00分）；
  日历判定（非 24h 差）——23:50 看 00:10 = 「昨天23时50分」；now 注入使跨日/跨月/跨年边界
  可确定性单测（`<1h→N分钟前` 为推断项，待真机样本复核）。
- **真机对照修正的字段坑**：频道文案原生是「生活日常频道」——子频道名在条目**顶层
  `channelName`**（= `channel.name`），`channel.parentName` 是主分区（生活）；契约层取
  `channelName + '频道'`（docs/api-research.md §6.1 字段形状同步勘正，另记 stowCount）。
- **行高机制换代（0.9.68 机制作废重写）**：旧机制「行高基准=视频卡封面 160」→ 新机制
  「UP 卡固定 129 撑起行、视频卡 122 自然高」；所有能撑高的输入逐一封死（标题 nowrap、简介
  clamp、签名 height:48 恒占位、**UP 名/数据位空值 min-height 防高度塌陷**、图标盒/行盒显式）。
  meta 贴底=不变量机制（main 拉伸高=封面 90，峰值内容 84 <90，`margin-top:auto` 贴封面底）。
- harness view-zone 9→16 断言（**逐行**行高 126–134、meta 底-封面底 ≤6、三段图标码点、
  频道文案、标题单行/简介 clamp+pre-line、水印 48px+rotate+宿主 `.big`、UP 卡双数据位+万+
  卡高 129）；mock 补极端行（超长标题/无标题空格长签名/`<br>` 简介/不过万粉丝）。单测 91→95
  （relTime 四档+日历边界 ×2、fmtWan、rank meta 形状与判空拼装）。
- 坑实锤：① 断言按 `.acsv-vrow.big .acsv-vrow-meta .acsvg-glyph` 全查把 4 行×3=12 个图标
  全数进去（应为宿主卡内 3 个）——改为先取首卡再 querySelectorAll；② UP 数据位行没有行盒
  高度致卡高 132（原生 129）——`height/line-height:16px` + 14×14 图标盒钉死。
- 真机复核：注入调试构建在真实排行榜页量取——100 行真实数据、**行高逐行 130**、封面
  160×90、UP 卡 129、meta 贴底差 0、码点全对、1200 居中、窄屏（640）单列回落无溢出。

#### 我的页抖音式个人主页（资料头 + Tab + 4:3 封面网格）

- **布局形态（用户提供抖音个人主页参考图定案）**：全宽长列表（行 1699px、内容只占左侧
  400px、右侧全空）→ 内容容器 max-width 1600 居中 + 资料头 + Tab + 封面网格
  （1920 下 5 列）；卡片=封面（左下角标）+ 两行标题 + meta，hover 封面微放大/标题
  accent。容器只挂我页（`.acsv-mewrap`，不动共享 `.acsv-view-body`，避开榜单 0.9.67/68
  的原生对齐区）。
- **封面比例 4:3（用户纠正实测口径）**：A 站**普通视频封面固定 4:3**，只有小视频是 3:4——
  历史/收藏条目经契约层过滤后全是普通视频（panelItem 只收 resourceType=2+videoId），
  卡面若套抖音的 3:4 会把封面左右各裁掉一大块（连标题字都被切）。比例入 `CFG.view.me.coverRatio`
  （骨架同源），harness 加 `cover-ratio-4x3` 断言钉住；将来若混入小视频条目需按 kind 分档。
- **资料头**：`auth_key` 前缀=当前 uid（`ui.selfUid`，原 imdrawer 私有函数上收共享）→
  `getUserCardList`（§4.4 在册端点）取 头像/昵称/签名/投稿数/关注/粉丝；头像+昵称+关注·
  粉丝·投稿+「UID：<uid>」+签名。**缺省一律不显示**（契约层 meCardOf 全字段 null 语义，
  不把「没这个数」显示成 0）；未登录（无 auth_key）或接口失败整块不渲染、静默、页面照常。
  `following/followed → 关注/粉丝` 的语义待真机核对（口径不符只改契约层映射）。
- **Tab 惰性 + 状态保留**：观看历史｜收藏夹 两个面板**常驻 DOM 只切 display**——首次激活
  才拉接口，切回不重拉（harness 断言钉：切回后 22 卡仍在且 history 接口调用数不变）。
- **修既有缺陷（几何实测实锤）**：收藏夹夹位 chips 原渲染在**列表下方**（`insertBefore(chips,
  btn)` 而 list 先 append → [标题,列表,chips,按钮]；实测 favRow0 y=833 < chips y=997）——
  改为 `insertBefore(chips, list)`，chips 归位筛选行（Tab 之下、网格之上），harness 加几何
  顺序断言防同型回归。
- **首屏骨架 + 深色滚动条**：`.acsv-gskel`（独立类名，绝不与卡片计数选择器同构）成功/
  失败/空三路径都移除；`.acsv-view-body` 滚动条深色化（我的/榜单共用）。
- **角标只用契约在册字段**：历史=`观看至 xx:xx`（`panelItem.sub`）；时长/播放量接口未实测
  提供 → **不做**（不伪造）；收藏夹角标=续看秒数。
- harness：view-my 14→24 断言（资料头/签名折空格/骨架已清/角标/无横向溢出/Tab 惰性/
  chips 在列表之上/切 Tab 不重拉/资料头缓存不重复打接口）；mock 补 `user/getUserCardList`
  快照与调用计数；单测 88→91（meCardOf 3 条）。
- README 使用节补「左栏我的」一行；模块表 mypage/views/ui 行同步。

### 0.9.68（2026-10-02）· 榜单水印归位视频卡右下角 + 行高一致性

- **水印叠团修复（真机 dump 实锤）**：排名水印 `.acsv-rlist-num` 定位宿主=视图行但行是
  `position:static`——absolute 冒泡到 `.acsv-view-body`，全部水印叠在视图右下同一处
  （实测 5 行 offsetParent 全 view-body、top 全 586 相同）。修=水印移入视频卡（rowOf 的
  rank 分支内建，宿主 `.acsv-vrow.big` 已有 relative），定位卡右下角（right:6/bottom:-14
  探出微裁，仿原生）；harness 断言钉 offsetParent 应为 .acsv-vrow.big 防同型回归。
- **行高一致性加固**：实测当前行高已统一（rowH 全 201、两栏全 193 等高），波动源=UP 卡
  签名 1~4 行（旧封顶 72px）——签名 3 行封顶（54px）+ `.acsv-upcard` overflow:hidden
  （极端长签名绝不撑高行）+ 行 `align-items:stretch` 显式声明（行高基准=视频卡）。
- 真机复核：6 行水印逐行贴各自卡右下（numAtCard/宿主断言全 true）、行高逐行 201/193 全等；
  88 单测+19 场景全绿。

### 0.9.67（2026-10-02）· 榜单结构对齐原生 rlist：视频卡+UP 卡左右分栏

- **结构定案（用户提供原生页 HTML+CSS）**：原生榜单=双列头（榜单 Rank | Up主 Author）+
  `rlist__cards` 每行「视频卡 | UP 卡」**左右分栏按排名配对**——无独立 UP 榜。0.9.66 的
  分离 UP 榜 section 与 0.9.67 初版的卡底随行条均不合原生结构，一并退役（upListOf 死码
  删除）；zone 视图重写为 `.acsv-rlist-row` grid 双列（`minmax(0,1fr) 300px`，双列头同轨
  对齐；窄屏媒体查询回落单列）。
- **UP 卡**（views.upCardOf，原生 up-card 等价）：圆头像+名字+签名（多行不截）+粉丝/投稿
  双数据位（rankList 的 fansCount+contributionCount；原生第二位是用户收藏数，接口不带，
  以投稿数补位并注释）；整卡 UP 主页链接 target=_blank（原生同款）。
- **extra 对齐原生 video-card 构成**：meta=「2347 播放 · 51 评论 · 21小时前 / 生活」
  （原生截图首位是**播放数**非蕉数——蕉是排序依据非展示项）；新增 relTime 纯函数
  （<24h 小时前/<7天 天前/其余 M月D日，脏输入降级空串）；契约层拼好 sub，rowOf 零分支。
- **视觉对齐原生（用户对比图差异清单逐条）**：排名=右下大号半透明水印数字（原生视觉
  锚点，替代左缘小徽章）；UP 卡横排（88px 大圆头像左+信息块右，名字 accent 色，签名
  break-all 整齐换行）；双列头 accent 竖线+中英文（榜单 Rank/Up主 Author）；行分隔线+
  封面 260×160+标题 hover accent（链接语义用 hover 表达）；UP 双数据位=粉丝+投稿（原生
  为粉丝+收藏，收藏数 rankList 不带，补位并注释）。原生 CSS 参考点：--acr-primary
  #fd4c5d 与我们 --acsv-accent 同色。
- **坑实锤**：视图列表类名 vlist→rlist 后 harness 断言未跟随（null.textContent 炸驱动
  120s 超时）；UP 行数断言与视频行数断言分离。
- mock 补 commentCount/contributeTime/channel/contributionCount；88 单测（relTime 新增）
  +19 场景（view-zone 9 断言）全绿；真机截图对照原生 rlist 分栏一致。

### 0.9.66（2026-10-02）· 榜单大卡+子频道+UP 榜（对齐原生三件套）+ UP 接口入库

- **卡片对齐原生尺寸**：rank 条目走大卡（`acsv-vrow--big`：横版封面 160×100+标题/简介/meta
  三行区），历史/收藏维持小卡；真机对照原生榜单卡观感一致。
- **子频道行**：queryNavigators 分区树 children（cid+navName 官方树）动态填充，选主频道后
  出现（「全部」+各子频道），rank 请求带 subChannelId——**服务端真过滤实测**（107→4 条/
  108→31 条/159→3 条）；树拉不到或频道无 children 隐藏子频道行（降级不阻塞）；切频道重置
  选区。rank 页 URL 参数语义破解：pcid=主频道、cid=子频道。
- **UP 榜 section**：视频榜下方 top10（圆形头像+名字+粉丝数+「榜单第 N 名」+签名）。
  数据=upListOf（data.js 新纯函数：rankList 按 authorId 去重取最高排名，契约层单测钉）。
  **UP 粉丝来源=rankList.fansCount**——getUserCardList（ids 多值批量）返回 users 无粉丝数，
  UP 空间页新版 SPA 无轻量端点（均实测）；UP 接口契约入 docs/api-research.md §4.4。
- **坑实锤**：UP 行头像类名笔误（upimg 无样式规则致头像原尺寸渲染）真机截图抓出即修；
  harness view-zone 断言限定 `.acsv-vlist:not(.ups)`（UP 行同为 .acsv-vrow 会污染行数断言）。
- mock 补 navTree 子频道树/fansCount/authorId；89 单测（up/upListOf 新增）+19 场景
  （view-zone 9 断言）全绿；真机截图对照原生（大卡/子频道/UP 榜）。

### 0.9.65（2026-10-02）· 榜单对齐原生（补全/文案/UI）+ 状态观察钩子沉淀

- **榜单补全（"不全"实锤）**：原生全站日榜 100 条、频道 13 个，此前只取 20 条 7 频道。
  rankLimit 20→100（实测生效）；CFG.view.zones 重写为原生同序 12 频道（全站综合 0/动画 1/
  娱乐 60/生活 201/音乐 58/舞蹈·偶像 123/游戏 59/科技 70/影视 68/体育 69/鱼塘 125——cid=0
  即全站综合实测 100 条；番剧 cid=155 仅 3 条杂项、文章榜 89 条全 contentType=3 竖刷不
  支持，均不放不做半成品）。榜期文案对齐原生：今日/三日/本周。
- **UI 对齐原生（复用官方形态）**：chips 行下加官方同款说明「依赖综合指数排序，每日更新
  一次」；榜单行 meta 改原生构成「2329 播放 · 527 蕉」+ 新增简介副行（契约可选字段 desc，
  官方简介是 HTML——`<br/>` 契约层统一折空格，douga/info description 将来同款）。
- **状态观察钩子沉淀**：test/state-spy.js——`__spyState(类名)` 包装 DOMTokenList
  add/remove/toggle，按类名过滤记录变更+调用栈前 4 帧，返回 stop()；默认零开销（不开启
  原型原样），防宿主页类操作刷屏。固化 0.9.64 避让类实战打法；harness.html 统一引入。
- 真机验证：11 频道/3 榜期/说明行/100 条/简介副行干净渲染，截图对照原生布局一致。
  19 场景+87 单测全绿（data.test rank 断言同步新契约）。

### 0.9.64（2026-10-02）· 让位回归三连修：标题对齐 / logo 进侧栏 / 抽屉避让跟随

- **标题栏双重让位回归**：`.acsv-info` 挂 slide 内（slide 已随 scroller margin 让位 dock），
  0.9.63 误把 left 改成 dockW+16 致标题落 352px——恢复 24px（注释防再犯）。
- **抽屉避让"下滑不跟随"（0.9.61 回归，真机复现+猴补丁抓栈实锤）**：抽屉开着下滑时
  setActive 会 openComments 切评论源（旧功能），而 openComments 内 claimDrawer 先占槽、
  overlayOpen 后入栈——其内部幂等收旧层调 closeComments 清槽+摘避让根类，末尾
  syncCommentVars 读到空槽把根类摘掉 → 新视频按无抽屉渲染被覆盖。修=overlayOpen 挪到
  claimDrawer 之前（先收旧层再占槽），openComments/openDrawer/openChat 三处同修。
  定性：回归而非旧架构缺陷，避让系统（根类+变量+panfit 分层）本身健康，补丁不重构。
- **logo 进左侧栏常驻**（0.9.63 侧栏化后的归位）：dock 顶部 AcFun logo+分隔；顶栏删
  logo 与「小视频/推荐」源提示（updateSegUI 的 logoLabel 引用删除，seg 按钮保留）。
- 真机验证：猴补丁抓摘类调用栈定位 → 修复后同路径复验（根类保持/新视频 transform 正确
  apply/截图确认避让并排布局）。19 场景+87 单测全绿。

### 0.9.63（2026-10-02）· 黑屏修复 + 抖音式左侧栏重设计

- **黑屏修复**：`.acsv-view` 样式表初始 `display:none`，enterView 恢复写 `style.display=''`
  只是清内联值、回落样式表值——内容渲染了但容器不可见（harness 断言只查内联值被骗全绿，
  0.9.62 发布版黑屏根因）。修复=显式 `'block'`（scroller 恢复同步显式，防同型坑）；
  harness 可见性断言全部改查真实渲染态 `offsetParent`。
- **侧栏重设计（抖音式）**：48px 悬浮图标块 → 168px 全高贴左导航（图标+文字横排、
  hover/当前项灰 pill、分组分隔线）；新增「推荐」条目（回竖刷，竖刷模式高亮它）。
- **主区让位**：scroller margin-left=dockW（视频居中于剩余空间，抖音同款）、info/视图
  padding 适配；全屏（:fullscreen）下 dock 隐藏+让位还原（沉浸满幅）；窄屏阈值 560→720。
- **顺修视图间直切**：我的→榜单直切闪回竖刷——exitView 清 current 后 overlayClose 仍触发
  backToFeed 改 hash，新视图被随后的 hashchange 关掉；backToFeed 加 current 守卫
  （Esc 路径 current 非空不受影响）。真机验证踩实，harness 此前只测了经竖刷中转的切换。
- 真机验证（内置浏览器注入构建实拍）：我的（历史 20 行+收藏夹）、榜单（真实排名/封面/蕉数/
  chips）、竖刷让位布局、my↔zone 直切，全部通过。19 场景+87 单测全绿。

### 0.9.62（2026-10-02）· 架构升级二期：hash 子路由视图层 + 我的/分区视图

- **子视图路由**：hash 语法扩展（route.js 纯函数 parseHash，全锚定顺修 `#svfeedother`
  误判激活）——数字段=竖刷深链 `#svfeed/<id>`、字母段=子视图 `#svfeed/my`、`#svfeed/zone/<cid>`，
  语法天然互斥；hashchange 链唯一入口不变（toggle→syncRouteView），无新路由机制。
  依据「新机制必要性」裁定：pathname/pushState 方案否决——hash 已被深链活用且视图参数
  可在现有语法内表达，新机制必要性不成立。
- **views.js 视图框架**：registerView 自注册（boot import 即入册）、视图切换=旧 teardown→
  新 build；**竖刷保活**：scroller 隐藏+全视频暂停（暂停态时间轴不推进，看门狗天然不判冻）、
  返回时恢复在播条目，FeedStore 不销毁回来继续刷；视图是浮层栈非模态层（Esc=返回竖刷），
  进视图先 overlayTeardown 清空竖刷舞台浮层。
- **左栏 dock**（sidebar.js）：竖刷路由内常驻图标列（我的/榜单，二期关注/搜索不空挂），
  当前视图高亮、<560px 隐藏（.acsv-info left 让位 72px 随媒体查询还原）。
- **我的视图**（mypage.js）：观看历史（POST browse/history/list 双 resourceTypes 缺一即 21、
  pageNo 翻页、「观看至xx:xx」）+ 收藏夹（chips 切夹→dougaList 翻页）。
- **分区榜单视图**（zone.js）：CFG.view.zones 渠道 chips + 日/三日/周榜期，GET rank/channel
  （rankLimit 实测生效；POST 形状无 rankLimit 只回 10 条）。
- **数据契约**：data.js 新增 panelItem（history/fav/rank 三来源→统一条目契约，非视频条目
  契约层过滤返回 null——历史条目 resourceType=2 且必须连 videoId 校验（该体系编码与收藏/
  榜单不同源，实测 40/40 视频；「参数 2=番剧」的文档释义在条目字段上不成立）、榜单 contentType
  2=视频 3=文章）+ homeItemOf（面板条目→懒解析 home 契约）。
- **playAc 回竖刷**：gen 校验（切源丢弃在途回包）+ seen 查重（流内直接 scrollToIndex）+
  resolve 失败 toast 回退 + append 不 unshift（不打乱当前流）。
- **mock 缝**（net.mockHit）：debug 构建 `window.__ACSV_MOCK_FORM__` 按 url 子串命中即返回
  （postForm 与 request GET 同缝），api.js refreshItem 的 home mock 不在卡片池的 id 放行走
  真实解析链——面板插入条目在 harness 下由缝接住、生产走 AppAPI.resolve；快照
  test/my-sample.js（实测原样形状：favoriteList 键、playUrls 字符串数组——曾照 meow 的
  {url} 对象形态写桩致 resolve 全灭，逐级探针定位）。
- **坑实锤**：syncHash 残留定时器在进视图 150ms 内 replaceState 把视图地址无声踩成深链
  （不触发 hashchange，视图态与地址脱钩、Esc 回写判定失效）——回写前查 parseRoute().view
  视图态直接跳过；backToFeed 改无条件回写（地址已被踩时回写正好拉回一致）。
- **harness**：新增 view-my（14 断言：路由进出/dock 高亮/契约过滤/历史翻页/切夹/条目回竖刷
  插入播放/Esc 返回）、view-zone（7 断言：渠道切换/排名徽章/过滤/回竖刷），17→19 场景；
  run-harness 端口重抽避 Chromium 非安全端口黑名单（listen(0) 随机抽中 6665 全场景
  ERR_UNSAFE_PORT）。单测 74→87（route 语法 6 + panelItem/homeItemOf 契约 7）。
- README：模块表/依赖图补 overlay/views/sidebar/mypage/zone 六节点及 import 边。

### 0.9.61（2026-10-02）· 架构升级一期：浮层栈管理器（Esc 显式分支链收拢，行为零变化）

- **src/overlay.js**：overlayOpen/Close/Top/IsOpen/Teardown 单例栈——栈内容即状态
  （0.9.22「不赌监听器注册顺序」的收拢，新增浮层零改 input.js）；close 回调注册方自带
  （release 的 seen/notified 写入、imdrawer 停轮询不进管理器）、先出栈再调+异常隔离、
  同 id 重开先收旧；close 内可再调 overlayClose(自身 id) 同步栈（显式关闭路径的自举）。
- **模态键语义单点化**：imgview/release 各自的 capture 自关退役（双裁决点在合成事件路径
  连关两层——capture 关本层后 input.js 又拿下一层；真实键盘归 overlay 单 capture，
  target=window 合成事件由 input.js 同款门禁兜底，两路径行为一致）。
- **四层接栈**：release（modal）/imgview（modal）/评论抽屉/私信抽屉（claimDrawer 右槽互斥
  保留，Esc 判定接栈）；input.js 门禁（栈顶 modal 吞键）与 Escape 分支定长化。
- **顺修**：imgview 无 teardown——开图后直接离开竖刷，残留监听吞站点键盘（unmount 补
  overlayTeardown 自顶向下收尾）。
- 单测 66→74（入栈出栈/幂等/自举空转/异常隔离/claim 序/teardown 序）；17 场景全绿。

### 0.9.60（2026-10-02）· 更新提示：release 说明弹窗 + 每次打开检查新版本

- **数据源与渲染（官方形态复用）**：拉 GitHub 官方 `releases.atom`（与 @downloadURL 同域，
  无 API 限流；`@connect` 补 github.com，TM 首次请求会弹授权确认），正文直接注入**官方
  渲染 HTML**（自家仓库发布物 + GitHub 管线消毒，elHtml 信任契约）——不自研 markdown
  渲染（ubb.js 只认 AcFun 方言，md 另起炉灶违背单源原则）；注入后统一 `a` 标签
  target=_blank/rel/相对链接补全（防点击把 #svfeed 路由导航走）。
- **交互**：每次打开刷视频界面检查一次（60s 最小间隔，防 Esc 频繁进出刷请求）。更新后
  首次打开弹「vX 更新内容」（中性标题，兼容首装/升级——首发版所有用户都没有状态文件）；
  发现新版本仅首次弹「发现新版本」+ [前往更新][忽略此版本]，此后 toast 轻提醒、红点亮至
  忽略或升级；顶栏信封旁新增「更新」按钮（ICONS.upd）随时手动查看。状态存
  `localStorage['acsv-upd-v1']`；弹窗真实打开才写 seen/notified（fetch 回来用户已退出则
  丢弃，防弹窗被永久吞掉）。
- **解析纯函数区**（导出供单测）：cmpVersion 逐段数值比（字典序会把 0.10.0 误判小于
  0.9.59）；normVer 剥 v 前缀/-debug 后缀；parseRelAtom 稳定机器格式惰性正则 + XML 实体
  解码（&amp; 恒最后替，防 &amp;lt; 双重解码穿到 '<'）；**latestEntry 按版本号取最大**——
  atom 按 updated 排序，编辑旧 release 会把它顶到首位，信顺序会把老版本误报成新版本；
  decideUpd 门控（popup/toast/updated/none × ignored/notified）。
- **Esc 链更新**（0.9.22 定稿延续）：input.js 显式分支最前——更新弹窗开着吞全部按键、
  Esc 先关弹窗（顺序变更为 更新弹窗 → 大图查看器 → 抽屉 → 退出）；capture 监听只补真实
  键盘的模态语义，不依赖监听器注册顺序。unmount 新增 `teardownRelease`——单例与 capture
  监听不过夜（root 拆除后监听残留会吞掉普通站页的全局键盘）。
- **localStorage 兜底语义**：写失败（隐私模式）才启用内存态覆盖合并、写成功即清——读侧
  无条件信内存会遮蔽外部写入（harness 场景 toast-only 首跑即踩实：②步 writeState 落下的
  状态把 ③步直接种进 localStorage 的种子挡住了，17 断言挂 2，已修）。
- 测试：单测 +11 例（55→66）；新 harness 场景 `upd-open`（`__ACSV_MOCK_RELEASE__` 注入走
  真实 mount→releaseCheck 链路，mock 绕过 GM 依赖与节流；版本号从 debug 产物头正则自取，
  升版本不假红），16→17 场景。

### 0.9.59（2026-10-01）· 全链总览整改：wire/extra 收口 + 依赖图对齐 + 私信抽屉冒烟场景

- **wire 拼装收口**（immsg）：评论转发 wire 新增 `commentShareWire(name, text)` 单源
  组装——首行「@作者：」形态即 `isCommentShare`/`commentShareAuthor` 的检测契约，此前
  拼装散在 comments.js，改格式会让检测静默失配（卡片无提示退化，quoteWireText 同款
  先例）；单测钉死「组装→检测→拆作者」往返。
- **extra 载荷 key 常量化**（immsg 属地）：`QUOTE_EXTRA_KEY`/`CMT_EXTRA_KEY` 替代
  发送（imshare sendQuote/sendCmtShare）与解析（quoteExtraOf/cmtShareOf）四处字面量
  ——两处硬编码时 typo 即静默丢载荷。
- **依赖图对齐**：补 0.9.50/0.9.55/0.9.57 新增的 7 条 import 边（comments→state/
  imicons/imshare，imnative→imshare/emoticon/ubb/imgview）；`ubb` 节点与模块职责表补
  IM wire/引用富正文职责描述。
- **新 harness 场景 `im-open`**（0.9.49 quoteChip 回归教训落地）：dm-smoke 实为弹幕
  画布冒烟，私信抽屉此前零覆盖。imdrawer 新增 `imDrawerSmoke` 模拟缝（绕登录门槛直建
  抽屉 DOM，harness 最小页无 player 时 root 兜底 setRoot），断言骨架可建可开、
  quoteChip 是真实元素节点、输入栏/气泡容器在场。15→16 场景。

### 0.9.58（2026-10-01）· 评论转发链路复查抛光（注释/可读性，无行为变化）

- 复查 0.9.55→0.9.57（三键字码统一 + 原生页富渲染）：结构符合设计语言、无新增热路径
  问题；三处小抛光——state.js root 契约注释补原生页 `setRoot(body)` 语义（0.9.57）；
  点赞回滚分支的字形切换表达式补「恢复切换前状态」说明（逻辑本身正确，写法易误读）；
  imicons GLYPHS 头注释对齐现状（www 页字体已由 styles 统一注入，原生页官方自带）。

### 0.9.57（2026-10-01）· 原生页评论转发卡富渲染：配图真图可点看大图

- 原生页（message.acfun.cn）评论卡引用块此前用 wire 文本渲染，`[img]` 配图只能显示
  `[图片]` 占位。现接通 extra 载荷：`pairMessage` 配对内核消息 → `cmtShareOf` 解出
  原始 UBB → `ubbQuoteHtml` 富渲染——真表情 + **配图真图，点击大图查看器**（extra 被
  服务端剥掉则回落 wire 文本降级，表情码仍真图）。
- **ubbQuoteHtml 收口**（ubb.js）：引用块富正文（作者头 esc + renderCommentHtml 完整
  管线 + `<a>`退化 span 防卡片嵌套），抽屉 cmtHtml 迁此、原生页同消费——两端渲染
  语义单源。
- **imgview 样式单源拆分**（styles.IMGVIEW_CSS）：原生页不注入全量 CSS（既定设计），
  boot 仅注入该段 + `root=body`（state.setRoot），大图查看器在原生页可用；fadein
  动画随段提供（RAW_CSS 原 keyframes 定义随之移除）。
- 官方 APP 维持 `[图片]` 占位（已拍板不做追发图片消息）。

### 0.9.56（2026-10-01）· 评论三键图标统一动态页原生字码 + 字形尺寸修正

- **点赞/回复也换原生字码**：从动态页互动区实测提取评论 `\ue627`、点赞未点亮
  `\ue629`/点亮实心 `\ue660` 码点（连同转发 `\ue628` 以 `feed*` 命名登记 imicons.GLYPHS），
  三颗操作键全部改用 iconfont 字形渲染，点亮态切实心字形（乐观更新与回滚同步切换）。
  评论侧 nativeIcon 探测路径（0.9.46 引入、0.9.54 加 memo）随之退役，SITE_ICONS/
  VIDEO_ICONS 依赖摘除。
- **字形尺寸修正**（0.9.55 转发图标偏大的根因）：实现方式差异——svg/mask 图标是
  12×12 定盒（墨迹约 10px），iconfont 字形墨迹 ≈1.02em（canvas 实测），13px 字号墨迹
  达 13.3px。`.acsvg-glyph` 改 11px 字号 + 12×12 定盒（line-height 压盒 + text-align
  居中），与 svg 图标盒子尺寸一致、视觉等大；浏览器 A/B 实测与三键整排渲染验证。

### 0.9.55（2026-10-01）· 评论转发按钮补动态页同款分享图标

- 转发按钮此前是纯文字，与点赞/回复的图标风格不齐。补上**动态页（member/feeds）互动
  区「分享」同款 iconfont 字形**（浏览器实测码点 `\ue628`，acfun-frontend-next 字体）：
  imicons.GLYPHS 登记 `repost` 码点（首个真实消费者），styles 注入该字体的 @font-face
  （src 取自动态页页面样式，woff+ttf 兜底）与 `.acsvg-glyph` 字形类（currentColor 跟随
  容器状态色，13px 与 12px svg 视觉等高）。
- 小视频站分享 PNG（`SITE_ICONS.share`）方案被此替代——iconfont 码点即动态页原生物，
  无 CDN hash 失效问题。

### 0.9.54（2026-10-01）· 评论转发链路评审整改：收口 ×2 + 效率 ×2 + 边角 ×2

- **emotify 收口**（结构）：表情码转图从 imdrawer/imnative 两份同构实现收敛为
  emoticon.js 单份导出（EmotionMap 属地，两端均已依赖；「两处硬编码必然漂移」收口
  原则，quoteWireText 先例），输出类名统一 `acsv-emotimg`（原 `.acsv-im-emotimg` /
  Shadow 内 `.cshare-emot` 退役）。
- **wire 契约正则收口**（结构）：评论转发标题的检测与作者拆分共用 immsg 单一来源
  （`RE_CMT_SHARE` + 新导出 `commentShareAuthor`）——0.9.52 起 imdrawer.cmtHtml 另写
  一份拆分正则，靠「拆分仅在检测通过后运行」的隐式约束保持一致，已消除。
- **nativeIcon 探测结论 memo**（效率）：模块级按 URL 记录探测结论，结论落地后新节点
  不再发探测（CDN 死亡场景零扇出）；未结论期各节点仍自挂 onerror 自愈（mask 加载
  失败会渲染成色块的坑），飞行期重复探测由浏览器按 URL 去重网络。
- **表情包跨域缓存**（效率）：localStorage 按 origin 隔离，官方页写在 www 的
  'emoticonList' 原生页读不到——message.acfun.cn 每次加载必打表情接口。新增 GM 存储
  缓存层（跨 origin 共享，7 天 TTL，读取链 localStorage→GM→接口，成功回填 GM）；
  `@grant` 补 GM_getValue/GM_setValue；修正「原生页面写入缓存」的误导注释。
- **边角**：消息列表 `[评论]/[分享]` 预览先占位化再截断（wire 携原始表情码后直接
  slice 会切在码中间）；`ubbPlainText` 改名 `ubbImText`（0.9.53 保留表情码后已非
  纯文本，名实对齐）。

### 0.9.53（2026-10-01）· 评论转发 wire 回归官方表情契约 + 原生页去重

- **契约修正（手机端问题的正解）**：官方 IM 的文本消息 wire 本来就携带
  `[emot=pkg,id/]` 码，APP/官方 web 原生渲染成表情图（imdrawer.emotify 的既有前提）。
  0.9.52 把码转成 `[表情]` 占位是违背该契约的劣化——官方端只能看到占位文本。
  `ubbPlainText` 纠正为表情码原样保留（`[img]` 是评论系 UBB、IM 不认，仍转 `[图片]`；
  at/color/resource 摘内文），**手机端/官方网页直接看到真表情**；extra 载荷职责收缩为
  `[img]` 原图渲染与保真兜底，表情不再依赖它。
- **原生页（message.acfun.cn）两处**：① 评论卡与原文重复渲染修复——官方气泡只留
  附言（`content.textContent = share.note`），引用行+URL 行由卡片承载（与视频分享同一
  模式）；② 引用块表情码出真图——imnative 本地 `emotifyHtml`（与 imdrawer.emotify
  同构同契约）+ `ensureEmotionMap` 挂载预热。
- **抽屉占位降级路径**（extra 被服务端剥掉时）同样 esc+emotify 渲染真表情，不再显示
  `[表情]` 占位文本。
- 0.9.52 期间发出的旧消息 wire 已固化为占位文本，无法追溯。

### 0.9.52（2026-10-01）· 评论转发卡渲染真表情 + 点击定位到评论楼层

- **表情**：wire 文本里表情在发送侧已转 `[表情]` 占位（官方 APP 可读性契约），接收端
  拿不回表情码。改走**extra 通道**（0.9.42 引用消息同款双通道思路）：`sendCmtShare`
  发明文 wire + proto extra 藏 `{acsvCmt:{ncid, content:原始 UBB}}`；接收端
  `cmtShareOf` 命中时 quote 走 renderCommentHtml 完整管线富渲染——表情经 EmotionMap
  出真图、`[img]` 配图出可点大图（preventDefault 防穿透卡片跳转）、at/resource 链接
  退化 span（卡片根是 `<a>`，HTML 禁止嵌套 a）；extra 被服务端剥掉则回落 0.9.51 的
  `[表情]` 占位降级，官方 APP 恒见可读文本。
- **定位评论**：转发 URL 拼 `#ncid=<评论ID>` 锚点（A 站落地页原生定位楼层的格式）；
  parseShare 的 URL 正则扩展保留 `#` 片段——卡片 href、复制链接、原生页挂卡全部带上，
  点击直达被转发的那条评论。发送载荷同步携带 ncid。
- 原生页（imnative）本轮保持 0.9.51 启发式卡片（extra 解析需 pairMessage 内核配对，
  收益低未做）；官方 APP 渲染不受影响。

### 0.9.51（2026-10-01）· 评论转发误判视频分享卡修复：专属评论卡

- **问题**：评论转发私信的 wire 文本（`@作者：评论内容\n作品链接`）命中 parseShare 后
  与手打视频分享走同一张视频卡——评论内容进了卡片标题槽，dougaCard enrich 又以
  「接口字段优先」用**视频标题把它覆盖**，评论在卡片上完全不可见，观感就是一张普通
  视频分享卡（真机截图实证）。
- **识别**：immsg 新增 `isCommentShare(title)`——发送侧 wire 首行恒为「@作者：」，
  以此与手打分享分流（首行 @ 开头且 40 字内见全角冒号）；误判成本对称且低（手打
  「@某人：这个好看 URL」渲染成评论卡也说得通），作者名含全角冒号取第一个（只歪
  归属拆分不歪识别，整行进引用块）、超 40 字回落视频卡，可读性无损。零 wire 改动、
  零 extra 依赖（extra 有被服务端剥除的风险，不作识别依据）。
- **专属卡片**（两端同构，容器语言与视频卡一致）：评论原文为主视觉（accent 左条引用
  式排版，pre-wrap 保换行、超长钳 6 行），来源作品收进底部小条（小封面 + 标题，
  enrich 前显示「查看来源作品」，dougaCard 失败仍可读可点跳作品链接）。enrich 只补
  小条，评论正文永远不碰。脚本抽屉暗色版（imdrawer.cshareEl/patchCshare）+ 原生页
  浅色 Shadow 版（imnative.cshareItem，官方文本气泡保留原文、下方补条）。
- **列表预览分流**：评论转发消息前缀由 `[分享]` 改 `[评论]`（抽屉 previewOfMessage +
  原生页会话列表两处）。
- **附带修复**：视频卡封面 `width:100%;height:auto` 原始比例渲染，竖屏小视频 9:16
  封面在 ~300px 气泡宽下高达 500px+ 刷满会话——加 `max-height:190px + object-fit:
  cover` 居中裁剪，横版 16:9 封面（≈169px）在钳制值以下不受任何影响。

### 0.9.50（2026-10-01）· 评论转发到私信（官方无此入口，脚本补位）

- **背景**：实测 A 站两端都没有「分享评论到私信」入口（PC 评论无分享按钮、APP 分享
  面板无私信项），但有「转发评论到动态」——产物为普通转发型动态，评论内容以
  `附言//[at 评论作者]@昵称[/at]：评论原文` 形式内嵌正文、无结构化字段（样本
  am5100598 实证）。私信侧脚本补位。
- **交互**：评论操作行（点赞/回复旁）新增「转发」文字按钮（仅推荐模式，与回复同门控，
  楼中楼同享）→ 弹 imshare 好友分享弹层（标题「转发这条评论」，挂抽屉根锚输入条上方，
  复用搜索/最近联系人/发送/捎句话全链路）→ 选人发送。
- **消息格式**：`@评论作者：评论纯文本\n作品链接`——对齐官方动态转发格式并适配
  parseShare 契约（标题行\nURL）：对端官方 APP 收到可读纯文本，脚本抽屉两端自动出
  分享卡。分享弹层 `openSharePanel` 加 `opts`（`host` 挂载点/meta 行在滚动列表内挂载
  会被水平裁剪、`popClass` 位置修饰、`headText` 标题文案），rail 分享不传保持原状。
- **`ubb.ubbPlainText`**：UBB → 纯文本投影（表情/配图转 `[表情]`/`[图片]` 占位，at/
  resource/color 摘内文），标签清单与 renderCommentHtml 镜像、处理顺序一致，供私信
  文本用（不进 HTML 故不做 esc）；单测 +9 例。
- **模块环**：comments→imshare→imdrawer→comments 成环（评论侧弹私信面板），两侧均
  函数、调用期才解引用，feedstore↔player 同款先例。
- **提交说明**：本版本与未入库的 0.9.49（私信图片懒加载，同文件 imshare.js 叠加）一次
  提交，git log 按先例注明。

### 0.9.49（2026-10-01）· 私信图片渲染提速 + 抽屉打不开修复

- **修复 0.9.48 回归：私信抽屉无法展开**——`ensureDrawerDom` 改用 `buildQuoteChip`
  工厂后返回值从元素变成了 `{box,label}` 对象，`chatView.appendChild(quoteChip)` 漏加
  `.box`，开抽屉必抛 `TypeError: parameter 1 is not of type 'Node'`，`drawer` 赋值走不到、
  抽屉永远建不出来（评论侧 `appendChild(replyChip.box)` 写法正确，仅私信侧漏改）。
- **问题**：图片气泡等待久，四因叠加——下载的是原图（`officialize` 沿官方抓包白名单
  剥 w/h，几 MB 原图只用 180px 展示）；`fetchImImageBlob` 每次拼 `?_=Date.now()` 击穿
  浏览器缓存且 blob/objectURL 零复用、从不 revoke（重开/切会话全量重下 + 持续泄漏）；
  历史消息一次性全量并行拉取（进会话 N 个 GM 请求抢带宽）；首图串行等 token/get 往返
  且加载中无任何提示。
- **LRU 缓存**（imshare.js）：blob objectURL 缓存上限 30 条、淘汰即 revoke——重开/来回
  切会话命中秒显，顺带修掉泄漏；**key 取 resourceId 资源本体而非整串 URL**：重开会话
  内核换链可用性不定（0.9.41「零会话依赖三级兜底」同款前提），内核形态与本地拼装两条
  路的 URL 参数不同，整串做 key 互不命中——真机首验「非秒出」的根因；缓存查询在令牌
  之前，命中连 token/get 都省；在飞去重让「加载中点开大图」共享同一次下载。
- **首拉不再击穿 HTTP 缓存**：`?_=` buster 只保留在令牌强刷后的重试路（防命中可能
  已中毒的缓存响应），首拉裸 URL 让浏览器缓存跨页面刷新生效。
- **懒加载**（imdrawer.js）：图片气泡滚入视口（viewport root + 200px rootMargin 预读，
  祖先滚动容器裁剪自动计入）才拉字节，长历史只加载可见几张；并发上限 3（FIFO 队列）
  防快滚挤爆带宽。
- **令牌预热**：新增 `prewarmIm()` 挂在 `openDrawer`/`openChat`——开抽屉即单飞换好
  midground 令牌写好 Cookie，进会话首图不等 token 往返。
- **加载感知**：接收侧复用发送侧 `.pending` 类 + 新增 shimmer 微光扫过动画
  （`acsv-im-shimmer`，`position:relative` 随之入图片气泡基规则）；**缓存命中在渲染时
  同步上屏**（`peekImImageBlob` 只读窥缓存，不闪微光、不等 IntersectionObserver 一拍）；
  大图查看器改走 `fetchImImageBlob`——缓存命中秒开，blob 被 LRU 淘汰 revoke 后自动
  重拉（直用渲染时 curSrc 有潜在裂图面）。
- 不变量：下载尺寸仍是原图（缩略图资源探查需真机 proto dump，另行立项）；失败仍降级
  「[图片]」文本；发送侧乐观气泡与 `revokeObjectURL` 逻辑不动。

### 0.9.48（2026-10-01）· 评论回复提示复用私信引用 chip

- 评论的回复目标此前是**输入条栏内红药丸**（`.acsv-creply`，整颗可点取消），挤占输入行、
  长昵称把输入框压窄；私信的引用提示（输入条上方独立一行：label 左对齐自动省略 + 右侧
  独立 ✕）观感明显更合理，按用户拍板两 drawer 统一为后者。
- **收敛 `inputbar.buildQuoteChip(onCancel, xTitle)`**：私信引用 chip 的 DOM 工厂化
  （`div.acsv-quotechip` = label + ✕，沿用 0.9.41 输入条收敛先例——共用组件保留一侧
  前缀，类名去 `im-` 中性化）；`imdrawer.renderQuoteChip` 由每次重建子节点改为只回填
  label 与显隐。
- **评论侧** `setReply`：提示条置输入条上方（`replyChip.box` 先于 `inputBar` append），
  label「回复：@昵称」/ placeholder「回复 @昵称…」与私信「引用：摘要」/「回复引用的
  内容…」同构；发送成功/切视频清目标逻辑不动。`buildInputBar` 的 `opts.chip` 参数随
  栏内药丸一并退役。
- **CSS**：`.acsv-im-quotechip*` → `.acsv-quotechip*` 四条规则重命名共用；`.acsv-creply`
  删除，RAW_CSS 头部「alpha 形态主题色不换肤例外」注释随之失效一并清理（grep 证实再无
  alpha 形态残留）。
- 行为差异：取消回复从「点整颗药丸」变为「点右侧 ✕」（与私信一致）；表情面板
  `bottom:57px` 锚定不变，提示条在场时面板会盖住提示条——私信既有行为，保持一致。

### 0.9.47（2026-10-01）· 小视频入口收窄为首页白名单

- **问题**：导航注入此前在 `www.acfun.cn` 全站每页盲试——先找白名单标签链接克隆
  「小视频」项，6 秒（`navWait`）仍失败就弹右下角兜底胶囊。于是播放页等非首页处
  只要导航渲染慢/结构不匹配，胶囊就会弹出来，且一旦创建永不撤销。
- **修复**：`cfg.nav.pages` 页面白名单（pathname 正则数组，0.9.47 起 `[/^\/$/]` 仅
  首页），`watchNav` 开头加闸门——白名单外不注入、不起 MutationObserver、不挂 6 秒
  兜底定时器，整条链路直接短路；原 `/u/` 个人空间特判被白名单覆盖，删除。
- 兜底胶囊**保留**：仅首页注入失败（站点改版）时仍会弹出，README 承诺的改版兜底能力不变。
- 不受影响：`#svfeed` 路由（route.js）仍全页面响应——分享链接、带 meowId 回跳链接在
  任意页面打开仍可进竖刷页；空间页 `/u/` 的「小视频」标签注入（uppage.js）是独立功能不动。

### 0.9.46（2026-10-01）· 评论点赞/回复图标换用 A 站原生形状

- 评论操作按钮此前是手绘 Material 心形 SVG + 纯文字「回复」，与同页右侧操作栏的
  原生图标风格不统一。
- **点赞**：照搬 rail.js「原生图标只借形状」模式——CSS mask（`.acsvg-cicon`
  currentColor 染色）+ `new Image()` 探测、CDN hash 失效回退手绘 SVG；形状跟随同页
  操作栏选型：推荐页用视频页拇指 SVG（`VIDEO_ICONS.like`），小视频站用心形 PNG
  （`SITE_ICONS.heart`）。楼中楼走同一 `commentItem()` 自动跟随。
- **回复**：补上原生评论气泡 PNG（`SITE_ICONS.comment`）+ 文字，`inline-flex` 排版，
  hover 变色由容器 `color` 驱动自动跟随。
- **CSS**：`.acsv-clike` 状态色（灰 → hover 亮灰 → `.on` 主题红）从 `svg fill` 三处
  规则收敛为容器 `color` 驱动，mask/回退两条渲染路径共用；无行为改动，点赞乐观更新
  与回滚逻辑不动。

### 0.9.45（2026-10-01）· 切清晰度「隔一两个视频才生效」修复

- **根因**：清晰度偏好只在条目解析时经 `applyQuality` 应用一次（appapi.js），解析完
  `ensureResolved` 即短路永不再算；而手动切档时 idx+1 已被渲染窗口预挂（旧档会话在跑）、
  idx+1/idx+2 已被 prewarm 按旧偏好解析完（qIdx 冻结）——新偏好要等划过这两条、到
  idx+3 现解析才生效。0.9.43 给编码/缓冲菜单补过同族邻居重建，清晰度菜单漏接。
- **修复**：`switchQuality(manual)` 尾部新增 `syncFwdQuality`——idx+1/idx+2 从
  `_qualitiesAll` 还原全集本地重选档（新导出 `reapplyQuality`，不重走网络、防二次收窄）；
  idx+1 有预挂会话则保进度（`_resumeAt` 槽位）dispose+attachVideo 重建，`_qBtn` 文本由
  直挂快路径的 onResolved→onHomeResolved 连带刷新；idx+2 无 slide 划到时按新档挂载。
  后向不动（已看内容重建丢位置）；自动降档不跟随（本机临时补救，不写偏好）。
- **编码菜单同族补漏**：`rebuildFwdNeighbor` 的 dropCache 此前只作废 idx+1，prewarm 的
  idx+2 仍旧编码过滤档位，一并作废（controls.js）。
- **加固**：清晰度菜单在解析中/错误态（无 video）点击由静默早退改为 toast 提示。
- **测试**：feed 快照补 qIdx/qLabel 字段；harness quality-switch 场景新增三条断言
  （预挂条会话重建 dispose+2 / items[1][2] qIdx 跟随 / label 同步），连同 smoke、
  homeswitch、prewarm、fastswipe 五场景全绿。

### 0.9.44（2026-10-01）· 全库注释/文档对齐 + 两处顺手修复

- **空间页徽标修复**：0.9.36 `el()` 改 textContent 语义的漏网点——「小视频」标签的 HTML 串
  被当纯文本（字面显示 `小视频<span>0</span>`），且计数 span 选择器恒空、标签页徽标总数失效；
  改走 `elHtml()`（uppage.js）。
- **恢复链末级重挂丢进度修复**：看门狗阶梯走到 tailReattach（锁档/到底档场景）时进度写进了
  旧会话对象，而 attachVideo 只认 `slide._resumeAt` 传输槽位 → 重挂后从头播放；改写槽位
  （session.js）。
- **死码清理**：danmaku.rebind（零调用，图层重建由 dispose+onPlaying 覆盖）、cfg.codec.reAvc、
  cfg.api.appBase（零消费）。
- **src 注释全库校对**（43 模块逐文件通读）：attach.js 契约总表六组读写方按 grep 实证修正、
  抽屉骨架/委托挂载点归属 slide.js、弹幕发送框常驻语义、hls.js 内嵌主路径、appapi 读写接口
  收口表述、exp 开关补 native 键等约 20 处；imgview/emoticon 抽离的版本归属统一为 0.9.41
  （inputbar.js 头注释自证 + 更新日志，源码三处 0.9.40 系笔误）。
- **README 校对**：私信/评论抽屉同槽互斥（「并存」系 0.9.19 前旧表述）、Esc 关闭链更正、
  私信能力清单补引用/表情/图片、评论互动按源门控表述、操作栏图标 mask 方案、依赖图补
  `imshare→immsg`/`comments→upload` 边、模块职责表补全 11 个播放层文件、npm scripts 描述。

### 0.9.43（2026-09-30）· 原生页引用去重加固 + 自证日志

- **贴界 `<br>` 残留修复**（0.9.42 实缺陷）：实测结构里换行渲染成 `<br>`（不产生文本，
  textContent 换行必丢），正文子节点是 `[文本节点(前缀), <br>, 文本节点(回复)]`——
  0.9.42 的剥离循环在文本节点耗尽前缀长度后即停手，`<br>` 留下，剥完变「空行+回复」。
  现在到达边界后顺手摘掉贴界零文本节点，遇首个非空节点收工（回复自身多行的 `<br>`
  不误伤）；另兼容官方把正文排进唯一包裹元素的形态（下钻一层再走）。
- **自证日志**（0.9.29 教训第三次生效：「依赖用户侧重装的验证必须自证新代码在跑」）：
  构建注入 `__ACSV_VERSION__`，挂载行带版本号 `[acsv-im] 原生页增强挂载 v0.9.43`；
  剥离成功打 `引用正文剥离 wire 前缀 n 字`，失败（拼接形态未识别 / DOM 跨界）各打
  一条带正文前 80 字样本的 info——「为何没剥」远程可判读，不再静默。

### 0.9.42（2026-09-30）· 原生页引用去重：剥掉正文里的 wire 拼接前缀

- **根因**（用户截图逐字吻合）：extra 通道（默认）引用消息的 wire 可见文本是发送侧
  拼接的「`[引用] 摘要\n回复`」（给 APP 端纯文本可读性的契约，不能改）。原生页官方把
  这条文本消息整段渲染进气泡正文，脚本引用分支又按 extra 里的 `acsvQuote` 在正文上方
  补灰色摘要条——摘要出现两份；嵌套引用时呈 `[引用] [引用] …` 叠加。
- 修复：`immsg` 收口 wire 拼接唯一定义处（`quoteWirePrefix/quoteWireText`，发送侧
  `sendQuote` 改同一来源），新增 `quoteWireTrimLen` 判定官方正文恰为发送侧拼接形态
  （前缀命中 + 余部剥前导空白后精确等于回复正文；`\n` 保留/`<br>` 丢失/空白折叠三
  形态均命中）；`imnative` 补摘要条前外科手术式剥离前缀（文本节点跨界切片，元素跨界
  预检后整体放弃全有或全无），官方对回复部分的链接/表情渲染原样保留；形态不识别
  （type 12 等）维持只补条不动正文的兜底。原生页观感对齐抽屉：引用条 + 纯回复。
- 契约测试补位：发送侧 wire 格式此前零测试覆盖，本次 `quoteWireText/quoteWireTrimLen`
  全形态钉死（命中三形态、四类不匹配、preview 缺省「原消息」、脏输入容错）。

### 0.9.41（2026-09-30）· 私信表情与图片：官方同路消息 + 输入条 UI 抽离

- **输入栏收敛 `inputbar.js`**：评论/私信底部输入栏此前各自一份（`.acsv-cinput*` /
  `.acsv-im-*`），观感漂移（textarea 圆角 8/10 不一、发送键一药丸一圆角矩形、自动增高
  只有评论有）。`buildInputBar(opts)` 统一为同一套 DOM/CSS/行为——评论侧零迁移（沿用
  `.acsv-cinput*` 类名与既有 querySelector 引用），IM 侧补齐自动增高、Esc 失焦、发送键
  药丸形；差异语义（回复药丸 chip、图片按钮行为、placeholder/maxLength、onSend）参数
  注入。IM 侧重复样式（`.acsv-im-inputbar/-input/-send/-emot/-imgbtn`）退役。

- **表情**：官方 IM 的表情就是 TEXT 消息里的 `[emot=acfun,ID/]` 短代码（SDK 内
  `convertEmotionCodeToHtml` 收发双向转换，APP/官方 web 原生渲染）。输入条加表情按钮，
  面板复用 emoticon.js（插 UBB 代码混排进文本）；气泡渲染 esc+linkify 后追加短代码转图
  （EmotionMap 直查 → umeditor 老图兜底 → 「[表情]」文本兜底，与官方同构）；列表预览
  统一显示「[表情]」。抽屉创建即预热 EmotionMap，避免没开过面板时表情只出文本。
- **图片**：IMAGE 消息（contentType 1，官方同路）——`ImageMsg.create({image: File})` 走
  `kernel.sendMessage`，SDK beforeSend 自动上传图床换 `ks://` 资源串，APP/官方 web 原生
  渲染。**不能发 https 直链**：官方端渲染非 ks:// 资源会 throw，打断整个会话渲染循环。
  即选即发（微信/抖音 IM 惯例）：读自然宽高 → 乐观占位（本地预览）→ `sendImage` → 成功
  摘占位补真身 / 失败点击重试。收图 `msg.url`(ks://) 经 `kernel.file.resourceUrlToHttpUrl`
  换链渲染，宽高按比例占位；点击开大图查看器。确认走 clientSeqId 对账（`sendKernel`
  兼容上传期间 clientSeqId 晚赋；超时 `CFG.im.imgSendT=60s`，上限 `CFG.im.imgMax=10MB`）。
- **UI 抽离**：大图查看器迁出 `imgview.js`（评论/私信共用，comments/input 改 import）；
  表情按钮三件套（toggle+懒加载+光标插入）抽 `emoticon.mountEmotButton`，两处输入条
  去重。表情面板样式 `.acsv-emot*` 本就无作用域，私信抽屉内锚定零覆写（bottom:57px 恰
  对齐 IM 输入条）。
- 图片消息可被引用（`isQuotable` 加 ct 1，预览「[图片]」；ImageMsg 已注册，两条 wire 通道皆安全）。
- **缓冲档位降流量**：标准/加大/极限的前向缓冲 60/180/480s → **10/20/30s**（maxMaxBufferLength
  与 maxBufferSize 等比收缩；backBufferLength 保持原值——回退缓冲不产生前向流量，调小反而
  会让回拖进度条重新下载）。档位记忆键不变，已选档用户自动落到新值。
- **编码/缓冲改动同步重建前向预挂条**：这俩是 hls 构造参数、仅会话创建时读取，预挂的下一条
  带旧实例继续跑（相邻划走只 pause 不 dispose），此前「间隔一条才全部生效」。现在改动瞬间
  邻居 item 会话重建（编码改动连带作废其清晰度链缓存）；后向邻居是已观看的暂停内容，
  重建丢播放位置，不动。
- **图片发送卡死修复**（真机定位）：站点 globalConfig 供给的旧版 SDK（rc.1）link 对象缺
  `log/logPerformance` 方法，图片上传成功后的性能打点走 `kernel.log → this.link.log` 直接
  TypeError，发送整体失败（文本路径不经此打点故长期未暴露）。`ensureTracer` 双侧补 no-op
  桩（与补 tracer 同族手术，只丢埋点）；诊断中同时排除了 CORS——上传端点预检明确放行
  www.acfun.cn，上传 POST 实测 200。
- **图片渲染域改写 + GM 兜底**：内核换链产物指向远端配置下发的 apiAddress
  （sixinpic.kuaishou.com，实测对 acfun token 401）；改写为 message.acfun.cn 官方参数形态
  （白名单 resourceId/userId/did/kpn/imsdkver/platform，剥 token 与 w/h——官方页同资源该
  形态实测 200）。下载端按 Cookie 里的 midground 令牌鉴权（直链跨站没这张 Cookie 必
  401，query 带令牌实测不认；官方页 DOM 实锤 ks:// 形态 = resourceId + 数字尾缀）——
  GM 拉字节前先 id.app.acfun.cn token/get（sid=acfun.midground.api）现换令牌写进
  .acfun.cn 父域 Cookie（本页可写父域，message.acfun.cn 无 host 级同名时即采用），
  被拒强刷重试一次；失败降级 [图片] 文本（gmRequest 增 arraybuffer、
  `@connect message.acfun.cn + id.app.acfun.cn`）。
  渲染链**零会话依赖**：uri 取 m.url → rawMsg.content 手解 proto 字段 1（重开会话内核
  decodeContent/file 配置不保证就绪，「装后首开能渲染、重开失败」的根因）；URL 内核换链
  失败时本地拼装（ks:// 尾段 resourceId + 本端 Cookie userId/_did）。
- 与 0.9.40 评论配图修复零交集：那条链路产出签名 https URL 供 comment/add 改写落库，
  私信图片走内核上传产 ks:// 资源串，各走各的管线。

### 0.9.40（2026-09-30）· 评论图片修复：上传 URL 保留签名参数（服务端靠它改写长期地址）

- **根因**（用户实测 DevTools 载荷 vs add 回显对比实证）：`comment/add` 服务端解析
  content 里 `[img=图片]` 的完整签名 URL（`preview.ndcsk.com/ksc2/…?pkey=…&imgId=…`），
  把它改写成 `imgs.aixifan.com/newUpload/{uid}_{hash}.png` 再落库；脚本此前在
  `upload.js` 剥掉 `?` 后参数只发裸 ksc2 路径，服务端解析不到图，**整条 content 被
  清空**——评论成空壳，原网页与脚本抽屉都渲染不出。
- 修复：`uploadGetUrl` 原样返回 `getUrlAfterUpload` 的完整 URL；`IMG_CDN_OK` 白名单
  补 `preview.ndcsk.com/ksc2/` 分支（host+path 双锚定，裸路径公开可访问已验证），
  兜底服务端未改写的旧内容。
- 附带：评论输入框 `maxLength` 233→1000——配图代码 450+ 字符，限 233 时插入图片后
  输入框锁死打不了字（用户被迫发纯图评论的次生原因）。

### 0.9.39（2026-09-30）· 私信消息引用：原生 Reference 双通道 + 摘要条/定位 UI

- **双 wire 通道**（`CFG.im.quoteWire` 切换，默认 `extra`）：
  - `extra`：文本消息 + proto extra 字段藏 `{acsvQuote:{seqId,preview,text}}`，对方
    客户端只看到「[引用] 摘要\n正文」可读文本，零兼容风险。
  - `reference`：原生引用消息（contentType 12，内核已注册 `ReferenceMsg`，编解码全由
    SDK 承担，收到的消息自带 `.text` + `.originMsg`）。绕过 widget 文本/图片白名单走
    `kernel.sendMessage` 直发（`imshare.sendKernel`），确认改为会话缓存里按
    clientSeqId 对账（内核直发没有「信息发送成功」日志）。**2026-09-30 真机实测**：
    服务端接受（消息正常落地、web 端渲染正常），但 AcFun APP 端不渲染、提示「客户端
    不支持查看此消息」——降为保留通道，APP 后续支持引用了再切回。
- **解析层**（`immsg.js`，两通道统一消费为 `{seqId, preview, text}`）：`quoteOf`（type 12，
  originMsg 缺失降级不弃疗）、`quoteExtraOf`（extra 翻 acsvQuote）、`isQuotable(m, wire)`
  （文本/卡片/引用套引用可引；图片与未知类型无有效预览不给入口；`wire='reference'` 时
  卡片例外——内核 decodeContent 重建 originMsg 查表 `new`，10001 未注册会崩）； 
  `previewOfMessage` 引用分支优先于分享/链接。
- **抽屉 UI**（`imdrawer.js`）：文本/卡片/分享卡气泡 hover 出「引用」按钮（行包裹器
  `.acsv-im-rowwrap` 承接，mine 行反序；卡片行宽度上收到包裹器避免 % 宽循环解析；
  reference 通道卡片无按钮）；输入条上方引用 chip（复刻评论抽屉 acsv-creply 交互，
  placeholder 联动）；发送失败点击重试会恢复引用 chip；引用气泡=摘要条（黑系内嵌+
  主题红细左边线+单行省略）+ 回复正文，点击摘要条按 originMsg.seqId 定位原消息
  （`chat.msgEls` 登记锚点 + flash 描边高亮）。引用判定先行于卡片/分享——回复正文带
  链接依然是引用气泡。
- **原生页**（`imnative.js`，只读）：type 12 占位形态整条替换（摘要条+正文进 Shadow
  DOM）；官方能自行显示正文的形态则只在正文上方补摘要条；列表预览与抽屉同源。
- **恢复逻辑泛化**：`sendOnce` 的失败恢复（tracer 重建/重连/forceSync）抽成
  `withSendRecovery(inst, send)`，文本与引用发送共用，doSend 路径行为不变。
- 随版本带入上一轮工作区成果：评论 UBB 补 `[at uid=N]`/`[resource id= type=]` 规则
  （对齐动态广场方言，`CFG.api.articleBase` 配套）；私信气泡开文字选择（划选后原生右键
  复制，退役 `.sent` 类与按文本对账的占位移除块）；`ubb.test.js` 单测落库。

### 0.9.38（2026-09-30）· P2-d 契约收口：upload 迁出 / CFG 纪律补漏 / dataset 投影登记

- 图片上传四阶段迁出 appapi → `upload.js`（接口层只留读/写接口与互动）；
  getToken/getUrlAfterUpload 两个内联端点入 `CFG.upload`。
- CFG 纪律补漏：表情最近使用键名入 `CFG.lsEmotRecent`；"10MB" toast 文案改由
  `CFG.comments.imgMax` 推导（`slice(0,12)` 双写已在 0.9.36 随拆分消除）。
- 「非当前即暂停」谓词收敛为 `playback.offCurrent`（setActive 窗口扫描与
  sweepVideos 幽灵扫描共用，判定改一处即三处生效）。
- attach.js 契约总表补 **dataset 投影节**（data-state/paused/drag/idx/panfit 的
  读写方）——dataset 与 `_xxx` 并行的第二协作面此前在表外。
- **有意不做**：paginate 通用分页泵——danmakuList 修复后已有页数/条目数双上限且
  表意清晰，单调用点抽泵是 YAGNI；等第二个接入方出现再收敛。

### 0.9.37（2026-09-30）· P2-c 热路径效率：扫描界界化 + 观察器重建

- **setActive 暂停扫描收敛为窗口内**：video 只存在于渲染窗口的 slide 里，原全量扫
  scroller 会随会话长度线性放大（slide 元素常驻不拆）；幽灵兜底仍由 sweepVideos 负责。
- **updateArrows 传当前 slide**：长会话中 `root.querySelectorAll('.acsv-arrow-up')`
  同样线性放大；箭头显隐本就随激活重估，传参后 O(1 slide)，未传参回退全量。
- **IntersectionObserver 工厂化（makeIO）**：切源清空 scroller 后观察列表同步重建，
  detached slide 不再滞留 io 内部表（原实现滞留到卸载才释放）。
- **onFrame 死亡判定去掉逐帧 querySelector**：video 元素在会话存活期内不会被换
  （所有换绑路径都先 dispose 本会话），isConnected 足以覆盖。
- **resize 尾节流 150ms**：拖窗口时全量 syncPanFit 不必逐帧跑。
- **有意不做**：dmcanvas addLocal 增量插轨——量宽有缓存、items 近似有序，全量
  assignLanes 实测为亚毫秒级且只在用户手动发弹幕时触发，增量分配需复制贪心分配器、
  分歧风险大于收益。

### 0.9.36（2026-09-30）· P2-b 结构治理：comments 三分 + el() 语义重构 + 死契约清理

- **comments.js 三分**（692 → 约 400 行）：UBB 渲染拆 `ubb.js`（esc-first 管线 +
  IMG_CDN_OK/URL 字符集白名单），表情服务与面板拆 `emoticon.js`（EmotionMap/缓存/
  最近使用/renderEmotPanel，插入经注入回调），本文件回归抽屉编排。顺带修掉
  emotReadRecent 的 `slice(0,12)` 与 CFG.comments.recentMax 双写。
- **el() 第三参改 textContent 语义，HTML 场景另立 `elHtml()`**：全项目 60+ 调用点
  逐一分类——图标 SVG/拼 HTML 改 elHtml，纯文本统一走 el（esc() 包裹随之删除）。
  这是 0.9.33 XSS 三坑的根因治理：「不可信文本被当 HTML 传」从此结构性不可能。
  imdrawer/imnative/imshare/comments/slide 共 10 处 esc 包裹随之退役。
- **mock 死契约清理**：`item.resolved` 声明于 data.js、仅 mock 分支写、全项目零消费——
  字段与契约注释一并删除。comments 的 mock 真值判定**有意保留**（生产环境永不定义
  __ACSV_MOCK__，harness 本地预览依赖该语义）。
- **uppage 哨兵收口**：tryInjectSpace 同时查 `acsv-space-grid` 与 `acsv-space`——
  此前只查兜底路径的 section id，主路径成功后靠内层守卫兜住反复重入。

### 0.9.35（2026-09-30）· P2-a 重复收敛：八组样板各归一处（等价重构，行为不变）

- net.js 新增 `gmRequest(opts)`（GM 通道参数化出口：responseType/超时/自定义头/二进制
  data/状态码门）——request 的 GM 分支、appapi 二进制上传、uppage/imshare 拉文本，
  四处内联 GM 包装收敛为一处。
- ui.js 新增 `singleFlight`：appapi 令牌/收藏夹两组「值缓存+单飞」收敛
  （comments 表情映射与 api.ensureResolved 形状不同，保留原样并说明）。
- ui.js 新增 `cookieVal`/`teardownVideo`/`sweepSlideVideos`：imdrawer.selfUid 与
  imshare.isLogined 的 cookie 解析、attach/session 幽灵清扫两处逐字重复收敛。
- imshare 新增 `injectPageFn`：「直写 unsafeWindow → 失败再内联 script」三处样板收敛；
  已生效时跳过直写（installer 幂等，重复包裹本就该防）。
- rail 新增 `withBusy`：关注/点赞/收藏/投蕉四处 busy 守卫收敛，顺手补上拒绝路径复位
  （原实现请求异常时 busy 永真、按钮永久锁死）。
- session 冻结阶梯第 3 级与慢放判定**逐行重复**的降帧率逻辑抽为 `dropFpsRung`/`canAutoQ()`
  （调参/演进不再双改）；自校准系数 2.5 入 `CFG.stall.arriveFactor`（1500/300/1000 等
  单点值维持内联+注释）。
- imdrawer 新增 `makePoller`：列表/聊天双轮询的 start/stop 模板收敛。
- **有意不做**：pad2 双定义保留——immsg 必须维持零依赖叶子属性，一行 helper 的去重
  不值得破坏它。

### 0.9.34（2026-09-30）· P1 边界加固：六处防御补强

- **弹幕列表翻页加页数上限**（appapi danmakuList）：原条目数上限挡不住「空页 + 活游标」
  的服务端异常——同一游标无限递归爆栈；现页数/条目数双上限。
- **编码过滤不再永久收窄档位集**（quality.js）：过滤始终从 playInfo 全集出发并留档
  `_qualitiesAll`，二次调用/偏好切回时档位可恢复，不再砍一刀少一半。
- **私信发送回调加会话校验**（imdrawer sendChat）：发送后快速切会话，旧回调不再污染
  新会话的占位气泡与对账标记；失败 toast 保留（消息确实没发出去）。
- **键盘空格/M/F/C 补 ev.repeat 守卫**（input.js）：长按不再播放暂停抖动/静音疯切/
  全屏连切/评论反复开合（ArrowRight 原有守卫，ArrowDown/Escape 维持现状）。
- **rebuildIm 先同步占住单例槽**（imshare）：重建期间并发 ensureIm 等同一个 promise，
  不再看到 null 又并行 new 出双单例；加载失败弃槽保住重试语义。
- **ensureConnected 轮询加代际取消**（imshare connGen + imShutdown）：抽屉拆除后，
  在途连接轮询（最长 25s，3.5s 会触发 forceReconnect）立即失效，不再动共享单例。

### 0.9.33（2026-09-30）· P0 安全与正确性：XSS 三点修复 + msgText 未定义引用 + eslint 落地

- **XSS 三点修复（同根因：`el()` 第三参是 innerHTML，调用点漏 esc）**：
  - 抽屉分享卡标题裸传 innerHTML（imdrawer vcardEl）——对方发送「HTML+AcFun 链接」文本，
    parseShare 把 URL 前文本当 title 即可注入，**任意联系人可利用**；现 esc 后写入。
  - 原生页 title/prologue/计数四处同病（imnative），且原注释自称「一律 textContent 防注入」
    与实现不符——全部 esc，注释改为如实描述。
  - 评论表情映射 URL 只锚 host 前缀，页面可写的 localStorage 投毒可破出 src 属性——
    补全 URL 字符集白名单。
- **msgText 未定义引用 ×3**（imdrawer sessionSig/去重 key/乐观对账，应为 msgTextOf）：
  无 seqId 且无时间的消息触发 ReferenceError，被整体 try/catch 吞成「聊天不渲染 /
  误报连接失败」的静默故障。
- **eslint 落地**（flat config 最小规则集：no-undef / no-unused-vars /
  no-constant-binary-expression，声明油猴全局与 `__ACSV_DEBUG__`），
  `npm run lint` + CI 步骤。首跑 17 错全部清零：顺手清死代码 7 处
  （imshare `lastImError`/`singletonHealthy`、appapi `FORM`、uppage 死 import、
  nav `navTries`、session `self`/`re` 等）。
- **安全版本，建议所有用户更新。**

### 0.9.32（2026-09-30）· 工程化四项：immsg 单测 / 质量策略剥离 / 架构依赖图 / harness 进 CI

- **immsg.js 单元测试**（`test/unit/immsg.test.js`，Node 内置 test 运行器，零新依赖）：
  解析层 7 个导出全用例覆盖，把「任何输入不抛错、只降级」的容错契约钉死
  （含 null 输入与 getter 抛错的脏对象）。
- **播放策略剥离**：`applyQuality` 从 appapi.js 迁出到新叶子模块 `src/quality.js`——
  APP 接口层只管取档，选档策略（编码偏好过滤、清晰度记忆）归播放侧；对外无调用方变化。
- **架构依赖图**：模块职责表后补 mermaid 依赖图（手绘自真实 import，四层分组），
  标出 immsg/imicons 零依赖叶子与 `setSessionHooks` 唯一钩子注入点。
- **harness 进 CI**：新增 `test/run-harness.mjs`（Playwright 无头驱动），跑全部 14 个
  页内断言场景 + dm-smoke；依赖 `__ACSV_TEST__` 模拟缝的场景用 debug 构建、
  smoke/resolvefail 用 release 构建覆盖正式产物。build.yml 在产物同步校验后追加
  Playwright 缓存 + 单测 + harness 三步，回归不靠手测。
- **构建脚本 ESM 化**：package.json 加 `type:module`，build.js 转 ESM import
  （产物逐字节一致，已验证）；diag-out.js 改名 .cjs（原为 CJS dump，避免被误判）。

### 0.9.31（2026-09-30）· 原生页分享卡紧凑化（真机验收通过后的观感微调）

- 0.9.30 真机验收通过：挂载/内核/识别三行日志齐备，分享卡与 10001 卡替换在
  message.acfun.cn 上屏——原生页增强特性自 0.9.22 立项以来首次真正工作。
- 卡片观感按聊天分享卡惯例紧凑化：限宽 228px（原占满气泡宽）、封面定高 126px 裁切
  （object-fit:cover，原按原始比例完整铺开的高封面太占屏）、字号收一档（标题 13→12、
  计数条 12→11）、圆角 10→8、内边距收窄。卡片 CSS 全在 Shadow DOM（imnative
  SHADOW_CSS），抽屉侧 .acsv-im-vcard（260px 暗色卡）未动。

### 0.9.30（2026-09-30）· world 隔离根因修复：unsafeWindow 读内核 + 分享卡 DOM-only

- **真根因（用户反馈 10001 卡也从未被替换 → 全模块从未激活实锤）**：脚本带 @grant 跑在
  Tampermonkey 隔离沙箱，`window.ImSdk` 在沙箱里**恒为 undefined**——message.acfun.cn 的
  ImSdk 是站点自己加载的，活在页面 world。`bootNativeIm` 的探活条件永不成立，enhance 一次
  都没跑过：占位替换、分享卡、列表预览全部从未工作（此前所有版本、所有选择器修复都在给
  一个从未启动的引擎换零件）。此前「跨 world 读已证实可靠」的结论只对沙箱内自建实例成立。
- **kernel() 改走 `unsafeWindow.ImSdk`**（读页面 world 的本职 API），window 兜底；探到内核
  只解锁占位替换（10001 卡），常驻轮询。
- **分享卡降级为 DOM-only、不再等 SDK**：解析源是消息元素自带的 data-text 属性（纯 DOM），
  挂载即观察即扫描——即使 unsafeWindow 读不到内核，分享卡照常工作。列表预览的分享改写
  同样脱内核；占位预览改写仍需内核（未就位留给下一轮）。
- 验收日志三行制：`挂载`（必现=脚本在跑）→ `内核就位`（unsafeWindow 通了才现，缺它只影响
  占位替换）→ `识别到分享消息 acN`（扫描命中的逐条确认）。

### 0.9.29（2026-09-30）· 原生页增强自证日志（诊断「0 标记」读数）

- 探针实测 `sdkReady:true / msgs:211 / shareMarked:0`——DOM 结构与选择器假设成立，但
  扫描零命中，唯一分歧是「页面跑的不是新版」还是「0.9.28 在本页失效」。加两行自证
  日志消除分歧：内核就位打 `[acsv-im] 原生页增强模块就位`（不出现=脚本未注入/未启用），
  识别到分享打 `[acsv-im] 识别到分享消息 acN`（不出现但就位行在=扫描未命中，需 DOM）。
- 真机教训再证：「依赖用户侧重装的验证，读数必须先自证新代码在跑」第三次生效。

### 0.9.28（2026-09-30）· 扫描锚定每条消息 + data-text 权威文本源（DOM 实测定案）

- **根因实锤（用户提供 message.acfun.cn 真实 DOM）**：原生页**自发消息 class 是
  `.message-self.message`，收到的才是 `.message-target.message`**——旧扫描
  `.message-target .content` 只覆盖收到的半边，而用户测试的分享全是自己发的，从
  0.9.25 起根本不在扫描范围内（10001 卡是别人发来的，所以一直正常）。
- **扫描锚改 `.chat-content-item .message`**（逐条消息，两类 class 通吃，各自带
  data-id/data-seq-id）。0.9.27 的 `.chat-content-item` 锚定作废——它是整个会话线程
  容器（几十条消息一个 item），item 级兜底粒度错误（单卡挂会话末尾）。
- **`data-text` 权威文本源**：实测原生把消息原始全文（换行原样保留）写在每条
  `.message` 的 data-text 属性上——`.content` 里 `<br>` 不产生文本，textContent 换行
  必丢，data-text 一行 getAttribute 拿到。解析三源保序：data-text → textContent（容忍
  式）→ 内核配对（前两者失配才付 getMessages 代价）。
- 真实样本回归全过：分享 data-text/br 拼接形态命中、sv 链与裸 ac 号/占位文案/客服
  UBB/hd 短链正确排除。

### 0.9.27（2026-09-30）· 原生页三处静默死点消除（「卡片完全没出现」修复）

- **SDK 就位轮询 30s 放弃 → 永不放弃**：旧版 `250ms×120` 后静默 return，页面加载慢/
  ImSdk 惰性初始化时整个增强模块哑火（连 10001 卡也不渲染，控制台零报错）。改快相位
  30s 后转 1s 常驻轮询（每秒一次属性读，代价可忽略），就位即停。
- **观察器锚死单点**：`watch()` 只在 `.container-im` 当时存在才挂 observer，否则一个
  观察器都不装，之后所有 DOM 变化永不触发重扫。改 `.container-im || document.body`
  兜底，SPA 会话窗格随时重建也有观察器在。
- **扫描锚从占位形状挪到消息容器**：`.message-target .content` 是从「不支持」占位反推
  的结构，原生支持的**文本消息走另一条渲染分支、未必有这个结构**——扫描根本看不见
  文本消息，分享卡一次都不会尝试。现锚在 `.chat-content-item`（带 data-id 的稳定锚点）
  三分支：占位 → 数据配对替换（原路径）；有 content 结构 → 分享卡替换（0.9.26 路径）；
  **无 content 结构 → item 级识别，dougaCard 成功后把卡片挂到消息条目尾部**（不碰原文，
  文本节点归属未知）。
- **dougaCard 失败可诊断**：恒为 resolve(null) 的静默失败现在打一次
  `[acsv-im] 分享卡详情拉取失败 acN` warn——有 warn=网络/GM 问题，无 warn 且无卡=扫描
  未命中（DOM 结构问题，需贴消息条目 HTML 定位）。

### 0.9.26（2026-09-30）· 分享卡「替代而非追加」+ 原生页数据同源（真机验收反馈修复）

- **抽屉：分享卡改「替代」契约**——0.9.25 文本气泡照常渲染、卡片异步追加在后面，出现
  「文本+卡片」双份。现在与 10001 协议卡同路径：同步先渲染消息内标题的卡片骨架（整卡
  href 即分享链），`dougaCard` 回来后**原位 patch**（封面/计数/时长/标题以接口为准，
  带会话/容器守卫）；标题外文本作附言气泡（对齐 10001 的 prologue）；enrich 失败卡片
  仍在（可读可点），不再双份。`vcardEl` 微调：无封面不设 src 灰底隐藏（不再拿默认头像
  当封面），计数/时长 span 恒渲染供 patch 填充。
- **原生页：解析数据源与抽屉同源（0.9.25 原生不出卡的根因）**——旧路径从 DOM 渲染产物
  （`content.textContent`）解析，换行被原生渲染吃掉后「URL 独占末行」的严格正则必然
  失配 → 静默无卡（抽屉从内核消息数据解析故正常，正是「抽屉有卡、原生没卡」的来源）。
  重构：占位替换与分享卡共用的 `pairMessage` 助手（`.chat-content-item` data-id →
  getSessions/getMessages 的 seqId/id 映射，同轮扫描惰性 msgCache）；分享可疑文本先走
  DOM 快路径，失配且含 acfun 痕迹才配对内核从数据解析；`dougaCard` **成功后**才把原文
  改写为「附言 + 卡片」（对齐官方 prologue+card），失败保持原文一字不动。
- **`immsg.parseShare` 放宽为容忍式契约**：URL 可出现在文本任意位置（前=标题、后=附言），
  数据形态与 DOM 形态通吃；句读贴链（「给你 https://…。」）两侧标点都不归属。esbuild
  转译直测 8 形态全过（换行完整/拼接/变空格/前后带话/纯 URL/尾句号/非分享/空）。

### 0.9.25（2026-09-30）· 脚本分享消息渲染为作品卡片（双端）+ star 图标勘误

- **脚本端分享格式升级为作品卡**：imshare 发出的分享是纯文本（`标题\nhttps://www.acfun.cn/v/acXXX`），
  APP 端只能看到文字。现在抽屉与原生私信页都会把它渲染成与 10001 协议卡同观感的作品卡
  （封面 + 播放/评论计数 + 时长 + 两行标题，整卡可点）。**原消息完整保留**——文本气泡
  （链接可点）在前、卡片为纯附加，拉详情失败就保持纯文本，可读性零损失；列表预览出
  「[分享] 标题」。
- **数据层 `AppAPI.dougaCard(acId)`**：douga/info 一发拿全卡片字段（title / coverUrl /
  durationMillis / 三类计数，2026-09-29 实测；coverUrls/image/cover 恒空，封面就在
  coverUrl）。Promise 级缓存，同一 ac 号多条消息只发一请求，失败不缓存可重试。
- **解析层 `immsg.parseShare`**：严格识别推荐链分享格式（标题行 + URL 独占末行，纯 URL
  也命中）；小视频链（m.acfun.cn/sv/?mid=）按既定边界不做任何交互，保持纯文本。
- **调研结论（LocalRec-for-AcFun）**：该扩展按 ac 号取字段不走 JSON 接口，而是抓
  `www.acfun.cn/v/ac{ac号}` 整页 HTML 后正则截取内嵌的 `window.pageInfo = window.videoInfo`
  （实测与 douga/info 载荷同构）——因为 A 站网页端没有公开的视频详情 JSON 接口。思路可作
  GM 链路失效时的备援，本版未采用：douga/info JSON 只有几 KB 且已在播放解析链路日常使用。
- imicons 登记 star e160 勘误：那是「动态」图标（顶部与历史相邻那颗），不是收藏。

### 0.9.24（2026-09-30）· 卡片 Shadow DOM 隔离 + 原生图标登记表

- **架构：原生页卡片改 Shadow DOM 渲染**。0.9.23 封面被压成长条的根因是宿主页 CSS
  泄漏——聊天气泡表情图规则 `.content img{height:48px}` 直接命中注入的封面 img，
  1200×675 被拉伸成 383×48。卡片 DOM 与样式整体迁入 shadow root，宿主规则物理隔离，
  封面原始比例完整呈现；气泡外壳留在 light DOM 保留原生观感，消息数据一律
  textContent 写入防注入。
- **新模块 `imicons.js`：站点原生图标登记表**（双端共享）。收录经视觉核对的图标资产：
  计数图标用 list60 的 CDN SVG（播放 `icon_view_player`、评论 `icon_message`，14×14），
  配合 CSS mask + currentColor 任意着色（明暗主题通用，暗色抽屉内为白色形状）；
  另登记 acfun-frontend-next 字形码点 18 枚（播放/弹幕/消息/搜索/时钟/星星/蕉…）。
  以后发现新图标登记进表，两端直接取用。
- **纠正 0.9.23 的图标误用**：e15e 实为站点头部「消息」图标，并非评论计数（已从卡片
  撤下，登记表里改记为 message 并注明）；评论图标以 list60 实际使用的 SVG 资产为准。
- 撤销 0.9.23 的 @font-face 注入（字形不再直接使用）。

### 0.9.23（2026-09-30）· 作品卡原生图标 + 封面原始比例（双端）

> 注：本版将 e15e 用作评论图标，后经 list60 核对证伪（那是头部「消息」图标），
> 0.9.24 已改为 list60 实际使用的 SVG 资产并建立 imicons 登记表。

- **计数图标换成站点原生字形**：播放 = `acfun-frontend-next` 的 `e3de`（列表页计数
  同款）、评论气泡 = `e15e`（站点头部消息图标同款），替换原先的手绘 SVG。私信页
  （message.acfun.cn）只是声明了该 family 并未真正加载字体，imnative 注入与站点同源的
  @font-face（ali-imgs CDN，自带 CORS）；脚本抽屉侧 RAW_CSS 兜底声明（@font-face 不
  触发下载，字形渲染时才拉取），保证任意宿主页都不出豆腐块。
- **封面按原始比例展示，不再 16:9 裁剪**：`object-fit:cover + aspect-ratio` 会把非
  16:9 的封面截成长条且显示不全；两端（脚本抽屉 + 原生页）改为 `width:100%;height:auto`
  完整呈现封面。

### 0.9.22（2026-09-30）· 原生私信页消息增强（解析层共享，为升级铺路）

- **架构：消息解析层抽成共享模块 `immsg.js`**。脚本私信抽屉（imdrawer）与原生私信页
  增强（imnative）各自挂渲染器、共用同一套解析——以后脚本私信页支持了新消息格式，
  在 immsg.js 加解析、两端各加渲染分支即可，原生页自动同步能力。
- **原生私信页增强（message.acfun.cn/im）**：官方网页私信对未注册类型只显示「不支持
  查看此消息」占位。本模块借同页 ImSdk 内核缓存原位渲染——只替换占位内容，气泡外壳
  （白底圆角/头像）保留原生样式；会话窗格用消息元素自带的 `data-seq-id` 与内核消息
  精确配对，列表用 `.chat-nav-item` 的 `data-user-id` 映射会话改写预览文案（「[作品
  卡片] 标题」）。MutationObserver 跟随会话切换/新消息/滚动加载，全程 try/catch 不
  干扰原生页。
- **卡片视觉**：浅色主题对齐原生（无遮罩），封面下播放/评论图标+计数的灰色信息行
  （内联 SVG 复刻原生图标形状——iconfont 字形不跨页），右侧时长，两行截断标题，
  投稿视频整卡点击跳 ac 号页。
- 入口：@match 新增 `message.acfun.cn`，boot.js 按 hostname 分流（原生页不注入竖刷
  样式、不做导航/空间页注入）。

### 0.9.21（2026-09-29）· 私信作品卡片渲染（网页端原生都渲染不出来的消息）

- **contentType 10001 作品分享卡渲染**（对齐手机端）：关注自动回复里的卡片消息（如
  二七梦窗口），官方网页端只显示「不支持查看此消息，请前往最新版客户端查看」。实测
  根因：web 版 ImSdk 的 `messageConstructorMap` 未注册 10001，content 被留在原始
  ArrayBuffer 不解析——而字节本身完整送达，UTF-8 解码即 JSON
  `{prologue, resourceBody:[{coverUrl, resourceId, resourceType, durationSec,
  viewCountShow, commentCountShow, danmakuCountShow, title}]}`。抽屉内自行解析渲染：
  prologue 文本气泡 + 封面卡片（播放/评论计数条、时长、两行标题），投稿视频
  （resourceType=2）整卡点击跳 ac 号页；列表预览显示「[作品卡片] 标题」。卡片内计数
  是服务端发送时刻的快照（同一段卡 2022 年 29.3万 / 2026 年 30.2万），与当前实际
  数据有出入属协议行为。
- **未识别类型降级链升级**：`msgText` 末级先读 `rawMsg.backupTips`（剥标签可读化——
  客服 2026 评价卡的说明文字由此展示），仍无则「[暂不支持查看的消息，请前往客户端
  查看]」，替换原「[非文本消息]」。

### 0.9.20（2026-09-29）· 气泡对齐 / 捎句话节点替换 / 预览数据源

- **自己气泡靠右**：`.acsv-im-bubbles` 一直缺 `display:flex;flex-direction:column`，
  `align-self:flex-end` 从未生效——所有消息靠左，仅剩底色区分。「写了子级、漏了父级
  容器」的第三例（前两例：`.acsv-im-listview` 无规则致列表滑不动、本例）。已对抽屉
  全部 22 个类做 DOM↔CSS 对账，这是唯一缺口。
- **捎句话节点替换**：旧实现一个按钮靠 mode 旗标切换「发送/导航」两种行为，旗标分支
  无法从结构上杜绝重发。改为发送成功后 `replaceWith` 全新「捎句话」节点——旧节点连同
  发送监听器一起销毁，新节点唯一行为是进聊天，重发在结构上不可能。（已核实旧代码的
  捎句话分支同样不可达发送路径；若「重复分享」仍出现，判别法：只分享一次、不点捎句话，
  对话里出现两条一样的消息 = `sendOnce` 超时盲重试的服务端重复，属 0.9.16 可靠性
  骨架的固有取舍，确认后另案处理。）
- **会话预览数据源**：预览改从消息库（`getMessages` 末条）派生——发送即时进库，预览
  与排序时间随之即时更新、刚聊过的联系人置顶；会话冗余字段 `lastMessage` 只作回退
  （SDK 发送后不更新它）。顺带修 `sessionSig` 读不存在字段（`activeTime`/`lastMessage`
  在映射后对象上不存在，签名后两段恒为空串）导致的变化检测全盲——预览变化从此能
  触发重渲染。

### 0.9.19（2026-09-29）· 抽屉槽位架构重构 + 聊天体验修正

- **架构：抽屉槽位协调器（state.js）**。0.9.18 的「双抽屉并存」被实测推翻——两抽屉
  同宽同锚点上下叠放，上层把下层 100% 遮死，「并存」视觉上不存在（点评论按钮时评论
  抽屉其实开了，只是整个藏在私信抽屉后面）。改为槽位模型：右侧同一时刻只开一个抽屉，
  open 前 claim 占槽并自动收回已占槽抽屉（开评论→私信收起，开私信→评论收起），close
  时 release。comments 与 imdrawer 不再互相 import（0.9.17 循环依赖漏导出正是评论
  抽屉回归的温床），Esc 与视频避让根类统一读槽位；player 卸载时 resetDrawerSlot，
  防残留闭包让重进后的第一次 Esc 被吃掉。
- **删除收起按钮/右缘浮条**：顶栏信封常驻且未读数常显，收起态没有信息增量，⇥ 与
  浮条整体移除。
- **捎句话回归纯导航**：0.9.18 把分享文案预填进输入框，语义上等于「再发一次分享」；
  改为点击直达该联系人聊天、输入框留空聚焦，自己组织语言补充一句，preset 参数删除。
- **聊天时间分割线**：渲染管线补上时间模型——与上一条消息间隔 ≥5 分钟插入居中分割
  （今天/昨天/周X/MM-DD + HH:MM，本地时区，`CFG.im.dayDivGap` 可调），大段消息有
  呼吸感；乐观气泡同样参与分组。
- **自己气泡去红**：主题红是动作/强调色，铺满气泡属大面积滥用；改为深蓝灰 #3e4a5a，
  气泡内链接色 #9fd0ff。

### 0.9.18（2026-09-29）· 抽屉修复专项 + 抖音式交互对齐

- **修复评论抽屉打不开（0.9.17 回归）**：`openComments` 里的互斥调用 `closeDrawer()`
  没有导入（comments.js 只 import 了 `isDrawerOpen`），esbuild 平铺打包时把真函数改名
  `closeDrawer2` 避让全局引用，裸调用运行时 ReferenceError，`classList.add('open')`
  永远执行不到——评论按钮自 0.9.17 起静默失效。esbuild 对未定义标识符不报错，构建
  一直能过，属于"能编译 ≠ 能运行"的典型坑。
- **修复联系人列表滑不动**：`.acsv-im-listview` 此前没有任何 CSS 规则（非 flex、无
  高度约束），子级 `.acsv-im-list` 已写好的 `flex:1;min-height:0;overflow-y:auto`
  全部落空，列表按内容撑高溢出抽屉。补上与聊天视图同款的 flex 列规则。
- **修复退出竖刷后私信抽屉打不开**：`mountBadge` 的 5s 轮询与 15s 首查定时器没有
  teardown，`unmount` 也不重置 imdrawer 模块态——重进后 `ensureDrawerDom` 因旧
  aside 引用拒绝重建（直到刷新页面），后台还持续为徽标拉 ImSdk。新增 `teardownIm()`
  在 unmount 调用：全部定时器/模块态清零，`mounted` 门禁让残留推送监听与延迟回调失效。
- **双抽屉并存（抖音式）**：私信抽屉定位为全局浮层（z 序高于评论抽屉，盖其右缘），
  与评论抽屉互不挤占、可同时展开，开一方不再关另一方；顺带移除了从未成功执行过的
  互斥调用（即上面那条回归的根因）。
- **收起态浮条**：标题栏新增收起按钮（⇥）——收成右缘竖条（信封 + 未读数），会话视图
  与未读保留，点浮条还原；✕ 才是真正关闭（title 由误标的「收起」修正为「关闭」）。
  Esc 逐层关：私信 → 收起浮条彻底关 → 评论 → 退出。
- **会话预览对齐抖音**：分享消息预览映射「[视频] 标题」类型前缀（协议无卡片，渲染层
  识别 acfun.cn 链接）；相对时间改为抖音规则（今天 HH:MM / 昨天 / 一周内周X / 更早
  MM-DD，本地时区）。
- **捎句话预填**：分享面板发送成功后点「捎句话」直达聊天并预填分享文案（标题+链接，
  启用 openChat 预留的 preset 口子）；顺带修切换会话草稿串台、消息去重兜底改内容指纹
  （reset 不重复上屏）、「捎句话」按钮态样式补齐、私信抽屉宽度与评论抽屉统一走
  `--acsv-dw`。

### 0.9.17（2026-09-29）· 抖音式私信抽屉 + 捎句话

- **顶栏右上角私信入口**：内联 SVG 信封图标（站点 iconfont 字形在覆盖层不可靠）+ 未读数
  红点徽标，点击打开私信抽屉。
- **私信抽屉**（右侧滑入，评论抽屉同款交互，Esc 关闭）：
  - **列表视图**：最近联系人（头像/昵称/未读红点/相对时间，本地搜索过滤），标题带未读
    总数（「私信 (2)」）；
  - **聊天视图**：点联系人进入 1v1 聊天——头部「‹ 返回列表」、历史消息气泡（自己右侧
    主题色、对方左侧深灰、链接自动可点）、底部输入条发送、失败气泡点击重发、
    对方新消息即时上屏、已读自动上报（内核级 markSessionRead，真正清掉未读）。
- **捎句话**：分享面板发送成功后该行按钮变 [捎句话]，点击直达与该联系人的聊天窗
  （输入框留空聚焦），作为分享后的补充发言。
- **新消息机制**：复用已建立的 WebSocket 长连接（服务端主动推送，SDK 自动入缓存）；
  事件即时上屏（customMessage/unReadCountUpdate）+ 打开期间 1.5s 轮询增量兜底
  （跨 TM 沙箱事件可能丢触发，轮询是已验证的可靠通道）；未读徽标 5s 慢刷（首查延迟 15s，
  避免打开页面就拉 SDK）。
- **视频避让 + 双抽屉互斥**：私信抽屉与评论抽屉共享同一套避让机制（`acsv-with-comments`
  根类 + `--acsv-dw/--acsv-cscale`：视频平移缩放、控制栏右移、侧栏左移、顶栏收窄（0.9.73）、
  窄屏纯覆盖降级；0.9.73 起**视图正文**也按同一根类收窄让位——抽屉 z 提到视图/顶栏之上，
  avoidW/avoidTopW 两级窄态护栏）；两抽屉互斥，Esc 逐层关：抽屉 → 视图 → 退出竖刷页。

### 0.9.16（2026-09-29）· 抖音式私信分享面板

- **分享按钮升级为私信分享面板**：点开列出最近联系人（ImSdk 会话列表 + getUserCardList
  头像昵称、未读红点、本地搜索过滤），点「分享」直接把 `标题+分享链接` 发进对方私信，
  成功标记 ✓ 已发送；底部保留复制链接 / 消息中心入口。
- 实现：懒加载官方 ImSdk（页面 `globalConfig.imsdkcdn` 同款），**加载前对源码文本打两处
  字符级补丁**（禁用 SendMsg 打点里无保护的 `f.context` 读取——旧版 49d365 内核不传
  kTraceConfig，链路 tracer 恒为 undefined，SendMsg 打点必崩 `TypeError: reading 'context'`，
  属官方构建缺陷：收路径有保护发路径没有；补丁后以 `blob:` 执行，CSP 允许），补丁失配自动
  回退未修补直载。发送前多探针校验真实链路（`kernel.isConnected`/`linkState`，会话列表读
  本地缓存感知不到断线）；确认走三路兜底：成功回调 + `sendSucceed` 事件 + 轮询 SDK 日志流
  （`window.localLog` 黑匣子，失败原因直接透到提示）。失败自动恢复：链路坏 → 重连；
  服务端 `{syncOffset}` 拒绝（要求先同步）→ 强制 `kernel.sync()` 一轮再补发。未登录 /
  SDK 加载失败 / 连接失败均降级为复制链接，不阻断分享。
- 已知边界：私信消息是纯文本（官方协议无分享卡片）；面板联系人来自历史会话（首次私聊
  需先在 APP/官网发起）；无任何聊天记录时显示引导提示。

### 0.9.14（2026-09-29）· hls.js 构建期内嵌，摆脱 CDN 依赖

- **hls.min.js 构建期内嵌进脚本**（npm 依赖 `hls.js@1.5.20`，build.js 从
  `node_modules` 读入拼进产物）：运行时零网络依赖。起因：0.9.13 双 CDN（npmmirror +
  jsdelivr）在某用户网络**全部拉取失败**（attach.cdnFail 持续），强制 hls.js 策略形同
  虚设；ensureHls 的 CDN 兜底列表保留但正常情况下不再触网（首检 window.Hls 即命中）。

### 0.9.13（2026-09-29）· hls.js 多源加载

- **hls.js 分发源改为列表按序尝试**：`npmmirror`（阿里，大陆稳定可达）优先、`jsdelivr`
  兜底，单源失败自动换下一个。起因：0.9.12 强制 hls.js 后实测 `attach.cdnFail: 4`——
  jsdelivr 在用户网络完全不可达，hls.js 从未加载成功，视频仍走原生兜底管线，强制策略
  形同虚设；GM_xhr 连接白名单同步补 `registry.npmmirror.com`；新增 `hls.cdnIdx` 记录
  命中的源。

### 0.9.12（2026-09-29）· 弃用 Edge 原生 HLS，强制 hls.js

- **MSE 可用一律走 hls.js**：归因实验最终定位——冻结发生在 Edge(Chromium) 154 的
  **Media Foundation 原生 HLS 管线**里（`nativeHls()` 探测命中，attach.native 实测），
  后台往返后画面停摆、音频正常（`stall.frozen` 实锤），720P/硬件解码（edge://gpu 已确认
  NVDEC 硬解正常后仍复现）均不豁免，且该管线是黑盒——无缓冲策略/错误恢复/观测面。
  现仅 MSE 不可用（iOS Safari 类）或 debug 开关 `exp.native` 强制对照时才交原生；
- 顺带：hls.js 路径回到主位后，缓冲档位/编码锁定/全部统计仪器（`hls.levelCodec` 等）
  对推荐流重新生效。

### 0.9.11（2026-09-29）· 挂载路径统计

- **`attach.hls`/`attach.native`/`attach.direct`/`attach.unsupported`/`attach.cdnFail`**：
  记录每个会话实际走的挂载路径。起因：home 源视频在播但 `hls.levelCodec` 恒为 undefined
  → MANIFEST_PARSED 从未触发 → 实际未走 hls.js（原生/直链兜底路径在跑），此前关于
  worker/缓冲/编码锁的所有推断对该路径无效，需要先确认路径再归因。

### 0.9.10（2026-09-29）· 冻结恢复提速

- **fixGap 4000 → 2000ms**：真冻结场景下阶梯逐级尝试的间隔压缩一半——冻结判定本身已花
  ≥1.3s（双探测窗确认），4s 间隔曾让最坏情况 8~12s 才走到末段重挂，体感"冻结很久→转圈"；
  现最坏 ~4-5s 到重挂。实测数据佐证真冻结存在（stall.frozen/detectSlow/phantom 判读见
  「冻结归因实验」）。

### 0.9.9（2026-09-29）· 调试统计 localStorage 镜像

- **stats/埋点每秒镜像进 `localStorage['acsv-stats']`**（debug 构建 only）：0.9.8 的
  unsafeWindow 赋值在实测的 TM/浏览器组合下仍不跨 world（页面控制台读不到），localStorage
  同源两 world 共享同步读写，是保证可见的通道。读取：
  `JSON.parse(localStorage.getItem('acsv-stats'))`，取 `.stats` 字段，`.dbg` 为最近 60 条
  启动埋点（该项非空即证明调试版在跑）。

### 0.9.8（2026-09-29）· 修复调试埋点在 TM 下不可见

- **`__ACSV_TEST__`/`__dbg` 改挂 `unsafeWindow`**：TM grant 模式下脚本运行在隔离 world，
  挂在沙箱 window 上的调试对象页面控制台永远读不到（harness 页内加载同 world 才碰巧可见，
  一上 TM 即失灵）——现落到 `unsafeWindow`，DevTools 直接可读；无 TM 环境退回 `window`。

### 0.9.7（2026-09-29）· 冻结归因实验仪器（仅 debug）

- **实验开关**：localStorage `acsv-exp`（JSON，debug 构建 only，正式构建死码消除零开销）——
  `noMonitor`（跳过看门狗）/ `q30`（滤 60fps 档）/ `noWorker`（关转封装 worker）/ `smallBuf`
  （缓冲强制 std 档），见上方「冻结归因实验」小节；
- **回前台帧恢复测量**：`vis.return` 计回前台次数，`vis.framesBackMs` = 回前台到首个真实帧耗时
  ——区分「真楔死」与「监视器误判」的关键指标；
- **播放编码可见化**：`hls.levelCodec` 写实际播放编码（默认嗅探结果，多变体流以真实 CODECS
  覆写）——确诊 HEVC 泄漏。

### 0.9.6（2026-09-29）· 卡帧阶梯末段死局修复

- **阶梯末段 rME/重挂交替**：锁档或档位到底时（canAutoQ false），旧版第 3 次恢复起只会
  无限重复 `recoverMediaError`——它只重置 MSE 管线（治坏分片），治不了 video 元素/解码器
  楔死（帧停、音频走、弹幕同停的形态），只有重挂换全新元素才救得动，而旧版末段永远到不了
  重挂 → 冻结永久修不动。现按奇偶交替：奇数次先重挂（强手段优先），偶数次 rME；
  新增埋点 `stall.tailRme`/`stall.tailReattach`；
- **回前台 = 新故障域**：`_freezeTries`/`_freezeGaveUp` 在 visHandler 回前台时清零——
  `_freezeGaveUp` 原本置位后跨后台周期永久生效（0.9.5 起计数不再被自动降档清零，触顶更快），
  give-up 后就是永久冻结；现在每个后台往返周期重新拿满阶梯预算，单个可见期内
  "自动降档不清计数"的防走楼梯语义不变；
- **回前台复查补缓冲误判修正**：`_onVis` 的 stuck 判定加 `readyState >= 3`——数据不足
  （hls 正常补片）交给 waiting 加载圈，不再触发一次无谓的全量重拉。

### 0.9.5（2026-09-29）· 最小化往返误伤专项

- **回前台保护期**（`stall.visGraceMs: 3000`）：最小化往返后 Chromium 合成器/GPU 解码器
  唤醒慢，常见 1~2s 不出帧而时间轴照走——旧版回前台重建基线后立即武装，两个探测窗确认
  （~1.5s）就误判冻结进恢复阶梯。现在 visHandler 回前台时开保护窗口，窗口内 FROZEN 终判
  按缓冲探测同款 1s 重探不进阶梯、DEGRADED 直接跳过，真实帧到达即自清；
- **错误恢复链后台守卫**：最小化期间 Chromium 偶发解码错误/hls fatal 会立即触发
  `recover()` → `video.load()` 丢缓冲全量重拉（回来看到的就是重新缓冲）。现在后台只挂起
  `_recoverPending`（埋点 `recover.deferred`），回前台给 1.5s 自愈窗口复查——时间轴恢复
  推进/已暂停则作废，仍卡死或带 `video.error` 才补跑；监听随 `dispose` 拆除；
- **阶梯防走楼梯**：`switchQuality` 改为仅手动切档重置 `_freezeTries`——旧版自动降档也
  清零，"误判→降档→清零→再误判"反复最小化会一路降到 360P；自动降档沿用累计数
  （cap 门槛 + healthyMs 衰减仍有效），真卡顿多次后照样放弃；
- **清晰度列表显式排序**：`playInfo` 档位按分辨率数字降序排一次，不再赌接口下发顺序
  （`applyQuality` 的"无记忆取最高档 = idx 0"依赖此前提）；同分辨率档（60fps/30fps）
  值相同，稳定排序保接口先后（rung3 降帧率匹配依赖）。

### 0.9.4（2026-09-28）· 弹幕绘制性能专项

- **弹幕文本位图缓存**：每条弹幕首次绘制时渲染一次离屏位图（含黑描边，按视觉缩放×dpr
  分辨率建、上屏 1:1 不重采样），之后每帧 `drawImage`——替代旧版逐帧对每条可见弹幕
  `strokeText`+`fillText` 两次字形光栅化。密集弹幕时绘制开销降一个数量级；
  位图随条目过期释放，另有 FIFO 300 条上限兜底（seek 回扫不撑内存）；
- **时间窗扫描**：弹幕池按出现时间有序（不变量），每帧绘制用「过期前缀 head 指针 +
  `at>t` 提前收工」只扫活动窗口——替代旧版对全部弹幕（上限 8 页×200=1600 条）的
  全量遍历；向后 seek 自动重置窗口；
- **量宽缓存**：`measureText` 按「文本+字号」缓存，本地发弹幕触发的全量轨道重排
  不再有千条级量宽突发（重排只剩排序+扫轨）；
- **修复 rAF 兜底路径暂停空转**：无 rVFC 的浏览器上暂停视频仍按显示器刷新率全量重绘，
  现已跳过（rVFC 路径本就暂停即停画）；
- **修复重启丢字**：图层 stop 期间攒下的本地弹幕，重启后首帧因度量缺失坐标 NaN 被
  静默丢弃——`start()` 现在强制重排；
- debug 构建新增绘制埋点：`dm.paintMs`（60 帧平均 paint 耗时）/ `dm.visible`（平均可见
  条数）/ `dm.sprites`（存活位图数），`__ACSV_TEST__.getStats()` 读取；
- 新增 `test/dm-smoke.html` 确定性绘制冒烟：stub video 手动泵帧驱动图层（不依赖真实
  视频出帧，自动化环境的合成器冻结也不影响），覆盖窗口扫描/位图缓存/过期释放/seek
  重置/暂停补帧/有序插入。
- **观看历史上报改为离开时上报最终进度**：旧版播放 10s 定时上报一次（看 30 分钟历史里
  也只显示"看到 00:10"）；现改为离开视频的时刻（划走/播完/关页/切走标签）上报当时的
  播放位置，历史/续播按真实进度显示。进度 ≥3s 才计入（过滤闪滑误触），同一条目随进度
  推进可多次上报（服务端按进度更新），同秒位重复触发不重发；`dispose` 钩子把拆除前的
  video 引用交给上报（`session.js`），关闭信息流/切源也覆盖。真机实测关标签页时
  `pagehide` 上报送不出去（官方 weblog 管道不支持卸载期发送），故保留播放 10s 的
  定时**首报兜底**：先确保入史，离开时再更新为最终进度；
- **修复回滑/恢复播放后暂停图标残留**：暂停标记的清除收口在 `setState('ready')`，
  而回滑（及手动暂停恢复）时会话本就是 ready 态、幂等早退——`data-paused="1"` 永远
  清不掉，中央暂停大图标盖住正常播放的画面。playing 事件现在无条件清标记；

### 0.9.3（2026-09-28）· 卡顿自愈提速 + 播放会话重构（Tier 1+2）

- **冻结自愈窗口 2~6s → 0.3~1s**：卡帧看门狗升级 v3（HealthMonitor）——从「2s 轮询对账」
  改为 rVFC 事件驱动（每帧按源帧率武装 `3.5×帧间隔` 超时，帧间隔按实际到帧节奏自校准），
  亚秒级检出解码冻结；区分三类健康态：FROZEN（走阶梯）/ DEGRADED（慢放）/ rebuffer（等加载圈）；
- **慢放不再漏检**：旧版只抓「帧完全不动」，10~15fps 幻灯片式降帧永不处理——现在用渲染帧率
  EMA + droppedVideoFrames 占比持续监测，掉帧持续 3s 即**主动同分辨率降帧率**（1080P60→1080P），
  在"有点卡"阶段就消化，而不是冻死后再救；用户手选档位（_qManual）仍不自动降档，只提示；
- **恢复阶梯新增"弹药返还"**：持续 30s 健康则阶梯尝试数衰减 1——一次网络抖动不再永久消耗
  恢复次数（旧版只涨不降）；
- **播放会话状态机（重构）**：新增 `src/session.js`，video 生命周期/hls 实例/懒解析等待/
  进度续播/错误恢复链/健康监测收进单一「播放会话」对象，`dispose()` 一次拆净；
  slide 播放态 expando（`_recovering/_waitTimer/_stallIv/_stallVis/_hls`）全部消灭，
  0.9.1 幽灵 video 拆除铁律/后台基线重建/追帧吸附全部保留为显式守卫；
- **划动白屏缩短**：索引稳定 500ms 后预热 cur+2 的懒解析（douga/info+playInfo 提前跑），
  解析出的媒体 CDN 动态补 `preconnect`（官方页面 head 的预连接清单 + 动态落点）；
- **修复存量 bug ×2**：①看门狗阶梯末段重挂引用了作用域外的 `idx`（v2 起潜伏，走到即抛
  ReferenceError）；②错误恢复换 CDN/重解析后**不恢复播放**（`video.load()` 置 paused，
  一直被"划走再划回会重播"掩盖成隐形卡死）——两处均已修并加回归场景；
- **修复切回标签页检测失活（真机反馈）**：v3 事件驱动的「缓冲」分支在无基线时（切回瞬间
  基线恰好重建为空）放弃武装、等一个不会再来的 `playing` 事件——视频从未暂停时检测永久失活，
  表现为切回后转圈+画面冻住+声音正常。已改为**探测-再判定**（快照时间轴 1s 后复查：动了=
  冻结走阶梯；没动=真缓冲限频计数）+ 1s 兜底重武装巡检 + 破坏性阶梯前的幻影冻结防护
  （恢复间隔内解码帧仍在推进则不降档），检测常活；
- **修复恢复后转圈不清除（真机反馈）**：顶针恢复是落在已缓冲区间的「平滑 seek」——按规范
  只发 `seeked` 不发 `playing`，而状态机只有 `playing` 能清转圈 → 画面正常了转圈仍挂着。
  已补 `seeked` 恢复边（未暂停且数据就绪即归位播放态），等待转圈改走显式内部态；
- debug 构建新增 `__ACSV_TEST__` 度量缝（stall/prewarm/dispose 计数 + 冻结/慢放模拟缝），
  harness 从人工预览页升级为 13 场景自动化验证（含 CDN 容灾/清晰度切换保进度/恢复中断销毁/
  切回标签页检测存活/转圈归位）。

### 0.9.2（2026-09-28）· 编码偏好 + 缓冲调优

- **编码偏好（推荐模式）**：控制栏新增「编码」菜单（自动 / H.264 / HEVC，默认 H.264）。
  实测 cast 档位无编码字段、m3u8 为单变体（编码选择发生在接口档位层而非 hls.js level 层），
  脚本从 m3u8 文件名嗅探编码标记后按偏好过滤档位：默认滤掉 HEVC 档，从源头防无硬解卡帧
  （与 0.9.1 降帧率阶梯同源问题的根治手段），HEVC 档在清晰度菜单显示 `·HEVC` 后缀；
- **缓冲档位（推荐模式）**：控制栏新增「缓冲」菜单——标准 60s / 加大 180s（默认）/ 极限 480s，
  并开启 `startFragPrefetch` 首片预取，网络抖动更不易饿死；
- **修复 maxBufferSize 单位 bug**：旧配置把 120 当 MB 传给 hls.js（实际单位是字节，
  即 120 字节），一直被前向 60s 的时间上限掩盖，本次随档位表一并修正；
- 两项切换均保留播放进度；小视频源是 MP4 直链，不涉及。

### 0.9.1（2026-09-28）· 播放稳定性专项

- **卡帧恢复阶梯**：视频解码冻结（声音在走、画面不上屏）时从轻到重自动恢复——
  0.1s 无感顶针 → hls.js `recoverMediaError` → **保分辨率降帧率**（1080P60→1080P，60fps 才是解码大头）→
  降一档分辨率；在菜单**手动选过清晰度后不再自动降档**，只做无感恢复；
- **修复幽灵 video 元素 bug**：旧版用 `src=''` 拆除视频会异步触发一次假 error，被移除元素的
  监听器还在操控活 slide——表现为进度回跳（如 46s 跳回 19s）、进度条来回抽搐、暂停关不掉声音、
  备用 CDN 被悄悄消耗。已改规范拆除 + 幽灵元素防护；
- **修复后台误伤**：最小化/切页时画面停走但声音继续，旧看门狗会误判冻结触发恢复甚至降档——
  已跳过后台期并在回前台时重建基线；
- **回前台追帧吸附**：切回页面后若画面 400ms 内出不了新帧，自动 0.1s 顶针把画面直接吸附到
  声音所在进度（后台声音不中断，回来无冻结感）；
- **弹幕画布改 rVFC 驱动**：新视频帧上屏才重绘（旧 rAF 按显示器刷新率全量重绘，
  144Hz 屏放 30fps 视频约 4/5 是浪费、暂停也在烧），暂停即停画；
- **换 CDN 重试保进度**：播放出错自动换源/重解析时不再跳回开头；
- 观看历史上报：推荐模式播放约 10s 后经官方 weblog 管道计入 A 站观看记录。

### 0.9.0

- 双内容源（小视频 | 推荐）、推荐模式完整体验（弹幕/清晰度/收藏/投蕉/评论）、UP 主空间页小视频标签。
