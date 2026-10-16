# 优化方案审计：三份报告的逐条回源裁定（v0.9.256）

> 2026-10-16 留档。缘起：外部依次提交三份优化报告（原始方案 / 二次精读复核 / 总报告合并版），
> 本文对其中每一条可判定的主张回源码裁定，作为后续动手（批次①~④）的**唯一事实底稿**——
> 将来质疑某条"到底是不是 bug""修复该怎么写"时，先读这里。
>
> **裁定原则**：凡"行数/次数/可达性/是否真泄漏/重复份数/能否反跑"的量断言，一律复算复读，
> 不采信转述。凡是报告与代码不符的，标注**实况**并给证据行号。
>
> **两轮审定**：一审由本代理逐条回源；二审（§八）由一个独立只读子代理**以反驳为目标**复核本文的
> 撤回与写法修正，结论已并入正文——二审推翻了本文一审的 **3 条理由**（N2 的机制、P1-1 的"不能
> 静音"论证、P0-1 的"不可行"），并纠正 3 处数字与 6 处行号。凡正文与"引用行号"不符者，以正文为准。
>
> **三轮追加**：§八 记批① / 批② 的落地追记（含实测数字）；**§九 是批③ 的实测裁定——它推翻了
> §2.3 对 P2-1 / P2-2(a) 的严重度、以及 §七「批③」四条里的三条**（读那两处之前先看 §九）。
>
> **一审时的口径**：正文 §一~§七 是 2026-10-16 一审的**只读**审计，行号对应 v0.9.256（`8244521`）；
> 此后实际落地的批次与实测见 §八、§九。

## 一、方法与基线

- **基线**：`src/*.js` 108 件、约 21,905 行；release `acfun-svfeed.user.js` 644,788 B、
  debug 985,603 B（比值 0.654）；版本 0.9.256。
- **量测陷阱**（写入纪律）：PowerShell `(Get-Content).Count` 在本仓按换行拆分不全（`styles.js`
  报 1581，实为 1824）。凡行数断言一律 `node` 读文件 `split('\n')` 复算。
- **复跑命令**：
  - 行数/体积：`node -e "…readFileSync…split('\n').length"`、`fs.statSync(...).size`
  - CSS 压缩收益：`node --input-type=module` 里打桩 `window/document/__ACSV_DEBUG__` 后
    `import('./src/styles.js')`，对 `CSS`/`IMGVIEW_CSS`/`NATIVE_IP_CSS`/`NATIVE_PANEL_CSS`
    各跑 `zlib.deflateRawSync(level 9).toString('base64').length`
  - lint 覆盖面：`npx eslint --print-config tools/gen-device-data.js`（看 `rules` 是否为 0）、
    `npx eslint src build.js test/unit tools; echo $?`
  - 覆盖率：解析 `test/check-direction.mjs` 的 `new Set([...])` 逐表取成员，与 `src/` 实际文件集求差
  - CFG 插值清点：逐行剥 `//` 注释后数 `CFG.` 出现次数（实测 24 处非注释）
- **证据分级**：只写两类——「亲读/亲测」（附行号或命令）与「逐行核验并给出可复跑命令」。
  无法由代码定论的一律进 §五，不写进 §二。

## 二、成立条目（可直接执行）

### 2.1 行为缺陷

**A1 · 转圈定时器在「平滑 seek」下漏清 → 永久转圈**

- 证据：`src/session.js:36-41` `setState` 首行 `if (this.state === s) return;`，而
  `clearTimeout(this._waitTimer)` 在 `:41`（`state==='ready'` 分支内）——**清理点在同值早退之后**。
  `waiting` 臂在 `:299-307` 起 300 ms 定时器，到期**直写** `self.state='buffering'` +
  `slide.dataset.state='loading'`（`:305-306`）。`seeked` 臂在 `:313-316`：`!paused && readyState>=2`
  时调 `self.setState('ready')`。
- 机制：smooth seek 期间 state 仍是 `'ready'`（定时器未到点）→ `setState('ready')` 被 `:37` 短路
  → 定时器存活 → 300 ms 后画面已恢复但状态被打成 loading；且 smooth seek 按规范**只发
  seeking/seeked、不发 playing**，`playing` 臂（`:278-293`，会清表）永远不来 ⇒ 挂圈。
- 数字：300 ms 为字面量（`:307`）；`_waitTimer` 清点共 4 处：`:280`（playing）、`:41`（ready）、
  `:46`（error）、`:337`（dispose）。
- 触发面（报告"真机高频"过宽）：需 seeked 落在 300 ms 窗口内、且期间无 playing/pause 事件。
  "永不恢复"的依据是 `:309-312` 的作者注释（自称真机实测），非规范推演——见 §五。

**A2 · 恢复链「重解析」分支缺换线看门狗**

- 证据：`src/session.js:213` 换 CDN 分支有 `this._armRecoverWatch();`；转重解析分支
  `:219-235` 没有。看门狗本体 `:242-257`，超时 8 s（`src/cfg.js:233 recoverStuck`）。
- 机制：`_recovering` 重入锁只在 `:283`（playing）、`:251/:254`（看门狗）释放；重解析后新源
  立刻 error 时，新 error 被 `:191` 的锁吞掉 ⇒ 会话永久停在 `'recovering'`（无错误盒、无重试）。

**A3 · 陈旧列表上下文把上一集条目泵进新舞台**

- 证据：`src/player.js:506-507` 契约注释（"不动 `UpVideos.feedActive`：空间页入口（uppage）靠它
  继续按主页列表顺序泵流，深链只负责把点击的那条置顶"）；`unmount`（`:618-652`）无复位；
  上下文激活在原生空间页点击时完成（`src/uppage.js:118-124`：`activateContext(UpVideos)` +
  `feedCursor = offset+k+1` + `location.hash = CFG.hash + '/v/' + it.id`）。
- 机制：`ensureMore`→`pumpListContext`（`src/feedstore.js:89-96,104-143`）按 `ctx.feedCursor`
  逐条取详情入池；unmount 不清 `feedActive`，于是**从任意 `/v/` 深链重进的舞台**会继续泵
  上一集空间页列表的剩余条目。
- 影响面修正（报告说"done 态也会重打 completed 列表"不准确）：`done` 上下文在 `:117` 会走
  `fetchMore()`（随机流，与无上下文近似）⇒ 真损失是**未完成的陈旧上下文**注入旧条目。
- **关注侧的自保护范围比报告与现代码注释更窄**：`src/followstream.js:84-88` 的复位只在
  `enterVideos()`（"视频"侧入口）里跑；若从卡片/搜索等路径深链而 `FollowVideos.feedActive`
  仍为真，同类陈旧注入在关注侧同样存在（A3 只管 UpVideos，此处仅备案）。

**A4 · 暂停→恢复重建弹幕态 + 重复打高弹请求**

- 证据：`src/danmaku.js:41-50` `onPlaying` 每次都走 `layer.start()` +
  `fetchList(...).then(setItems)` + `startAdvPump`；`startAdvPump`（`:75-78`）先 `stopAdvPump`
  再**重建 `st`**（`start/end=-1`、`inflight=false`、`wins=0`）；`setItems`
  （`src/dmcanvas.js:372-388`）全量重跑 readSettings/文本过滤/sort+merge/filter/`assignLanes`；
  泵 interval 1500 ms（`danmaku.js:101`）。
- 真实浪费面（口径修正）：经典弹幕**不会**重打网络（DM cache 是模块级 LRU 30，`danmaku.js:11-12,24-38`，
  跨 unmount 存活），浪费在 ①`setItems` 全套重算 ②高弹在恢复后 ≤1.5 s 内对同一窗口重发一次 POST
  ③`wins` 归零使 `ADV_MAX_WIN=200` 的会话上限失效（`:61,80`）。
- 门控的**必须限定**（见 §四）：`src/controls.js:20`（`applyDmState`）在弹幕开关重开时对
  **同一 slide** 再调一次 `dmOnPlaying`，那时图层刚 `stop()`、泵已被 `stopAdvPump` 拆掉，**必须**重建。
- 附带注意（二审补）：`layer.start()`（`dmcanvas.js:420-426`）不在门控范围内——`stop()`
  （`:428-436`）只停 rAF + 清画布、**保留 `items`**，所以"同 id 不必重拉"安全；但实现时别顺手
  把 `layer.start()` 一起门掉（关弹幕→开弹幕会停在停止态）。

**P1-3 · 音量悬停态的自续定时器链（拆壳后永不释放）**

- 证据：`src/controls.js:40-56` `showControls` 自续（`:46` `if (slide._volOpen) { showControls(slide); return; }`，
  间隔 `cfg.js:215 ctlIdle: 2500`）；`_volOpen` 全仓只有两处写：`:218`（`volOpen`，`pointerenter`
  于 `:229`）与 `:226`（`volScheduleHide` 的延时器体，`pointerleave` 于 `:230`）；**无 teardown 清它**
  （`_ctlTimer` 也只出现在 `:42-43`）。
- 机制：指针停在音量区时被拆壳（Esc 关播放层 / 层内换条）→ 进入时被 `:215` 清掉的那次 hide
  延时器**不会再排**（`pointerleave` 不触发）→ `_volOpen` 卡 true → `_ctlTimer` 每 2.5 s 自续，
  闭包持整棵 slide 子树 + `item`。
- 拆壳后无重插路径（二审验证）：`player.js:203-204` 是**新** slide 换回槽位、`playlayer.js:124-129/156`
  建新并移除旧的 ⇒ 守卫即终态。
- 触发面修正：不是"滚动换条即中"，需指针正停在 `volWrap` 上（`cfg.js:165 slideBelt:6` 使滚动
  拆壳需走过 7 条）；现实路径是键盘/层内换条。
- 前提外部性：Chromium 不给已拆元素补发 `pointerleave` 属浏览器行为，代码侧只能证明**仓库无补偿逻辑**。

**P1-4 · 列表链 capped 后 30 ms 空转，且"回落随机流"永不触发**

- 证据：`src/feedctx.js:48-53` 达 `maxPages` 时**只**置 `ctx.chainCapped = !ctx.done && pages>=o.maxPages`，
  不置 `done`；`src/feedstore.js:114-119` 在 `feedCursor >= items.length` 时
  `if (ctx.done || ctx.failed) fetchMore() else setTimeout(pumpListContext, CFG.time.chainGap)`；
  `chainGap = 30`（`cfg.js:222`）。
- 机制：capped 且未 done ⇒ 每 30 ms 重排一次 `setTimeout`（每拍仅 `env.getListContext()` + 空 while，
  无网络无 DOM，约 33 拍/秒），且**永远不会**进 `fetchMore()` 分支。
- 连带损失（报告未提）：`ensureMore`（`feedstore.js:92-96`）在上下文活着的整个期间都直接
  `pumpListContext` 并早退，所以 capped 后随机流补拉也拿不到入口 ⇒ 舞台可能饿死。
- `chainCapped` 全仓读者只有 `uppage.js:202-204`（进度文案先看 `done` 再看 `chainCapped`）与
  `followstream.js:116`（debug testHook），**泵侧不读** ⇒ 修法必须新增读点（见 §四）。

### 2.2 工程与门禁

**C1 · lint 盲区（`tools` 参数当前完全失效）**

- 证据：`eslint.config.mjs:14` `files: ['src/**/*.js', 'test/unit/**/*.js', 'build.js']`；
  `package.json` 的 `lint` 是 `eslint src build.js test/unit tools`。
- **本机实测**：`npx eslint --print-config tools/gen-device-data.js` → `rules: 0`；
  `npx eslint --print-config test/cases/views.js` → `rules: 0`；
  `npx eslint src build.js test/unit tools` → **退出 0 且无任何输出**（无匹配配置对象时规则集为空，
  不报警）。即：`tools` 在 CLI 上等于没跑；`test/cases/**`、`test/*.mjs` 亦全裸。
- 现有 globals（`eslint.config.mjs:18-25` 的 browser+node+`__ACSV_*__`）对这批文件**已足够**，
  扩面只需改 `files`；`:8-9` 的注释（"test/ 下的浏览器夹具…不纳入"）随之过期需改写。
- 形态约束：`test/cases/*.js` 是 **classic script**（`test/harness.html:21-43` 用 `<script src>` 挂，
  文件体是 IIFE 挂 `window.__ACSV_CASES__`，见 `test/cases/feed.js:5-6`），若要精确，可为该组
  单独 `sourceType: 'script'` 覆盖。

**P1-2 · 产物只有相对尺寸断言**

- 证据：`test/check-release.mjs`（全文 43 行）共 4 条断言：`:32/:33` 两个产物 `@version`、
  `:34` `relBytes < dbgBytes*0.9`（防 minify 被摘）、`:35` CHANGELOG 小节存在。尺寸只 print（`:37-38`）。
- 现状数字：644,788 / 985,603 B（比值 0.654，远低于 0.9 门槛 ⇒ 该闸对"静默膨胀"无感）。
- 无 marker 校验（userscript 头只在 `build.js:46-79` 生成，无人回读）。
- 排序论（二审降级为**判断项**，非硬约束）：按现值立绝对上限会在批②压缩后留出 ~11% 静默空间；
  若阈值写成"相对基线/分段表"则与顺序无关。倾向同批执行。

**P3-2 · `check-direction` 覆盖面与登记卫生**

- **本机实测**：注册 = INFRA 21 + API 3 + LEAF_SHARED 4 + FEATURE 37 + SKIP_B 2 − 1 重复 = **66**；
  `src/*.js` 108 件 ⇒ **未纳 42 件（38.9%）**，含 `cards/session/feedstore/controls/dmcanvas/views/imsend`
  等真共享件。报告"61 件覆盖"数字错，"42 件/39%"对。
- 注释漂移坐实：`test/check-direction.mjs:32` 写"基建层（styles.js 等 **16** 件）"，而 `INFRA` 实有 21 件。
- 重复登记坐实：`momentpost.js` 同时出现在 `:78` 与 `:88`（`FEATURE` 内），是全表唯一重复。
- 修法约束：登记是 `new Set` 白名单 + 入边扫描（正则只匹配**单引号** specifier），加一件会把
  **所有**外部入边翻红（`KNOWN` 当前为空、零容忍）⇒ 每加一件都要入边审计，必要时补 `KNOWN` +
  `docs/dependency-audit.md` 记录。属"多批小步"，不是一次性能补完的活。

**P1-1 · release 里保留的裸 `console.*`**

- **本机实测**：`src/` 内 `console.` 共 21 行、**裸 19 处**（`imnative.js` 10、`imsend.js` 7、
  `release.js:291`、`sharepanel.js:204`），模板 `src/imgload.js:55` 的 1 处已被 `__ACSV_DEBUG__` 闸 +
  esbuild DCE 掉（release 产物内 `grep '[acsv-img]'` = 0）。release 产物内实际存在 19 处
  （info 10 / warn 7 / log 1 / error 1）。
- 口径修正：报告"16 处"漏了 `imsend.js:71-73`（三处）⇒ 应为 19 处。
- **"能不能静音"的论证（一审写错，二审纠正）**：`imsend.js:71-73` 是 SDK 黑匣子镜像
  （`G.localLog`），但黑匣子缓冲 `G.__acsvImLog` 是由 `push`（`:54-69`）写的，而 `:71-73` **先
  `push` 后 console** ⇒ `:105/:110/:123` 的读回**不经过** console，静音它们**不会**破坏读回。
  保留的真实理由是"刻意给真机/devtools 看的镜像"，不是"技术上不能动"。
- 仍需逐个裁决的其余三处：`imnative.js:169/:172`（原生页结构自检，注释在 `:97-99`——"自检把
  '第一现场'钉在页面控制台"）、`release.js:291`（注释 `:287-288`"失败静默：仅埋点 + console 留痕"）、
  `sharepanel.js:204`（与用户可见 toast 并存）。**这些是有意的 release 可见诊断，不是漏网的调试输出。**
- 机制确认：`__ACSV_DEBUG__` 是 build-time define（`build.js:115`），release 下 esbuild 直接 DCE 整句
  （`imgload.js:55` 的实测证据）。
- 二审附带疑点（**未实测，勿据此动手**）：`:70-73` 的 `localLog` 与 `:75-83` 对 `G.console[lv]`
  的包装叠加——若 SDK 走 `localLog` 打日志，则同一条会被 `push` 两次（黑匣子条目/水位翻倍）。
  需要 SDK 侧或真机确认后再评估。

### 2.3 性能与重复

**P2-2(a) · `dmcanvas` 的 resize 无节流（重）**

- 证据：`src/dmcanvas.js:472-480` `armRealign` 直接 `window.addEventListener('resize', realignAll)`；
  `realignAll`（`:467-471`）逐图层 `realign()`（`:454-457`）→ `align()`（`:129-131`）
  **每图层 2 次 `getBoundingClientRect`**（video + slide），尺寸跳变 >60 px 再全量 `assignLanes()`
  （`:456` → `:209-250` 逐条 measure + 重排）。
- 对照：`src/player.js:65-73` 同一事件有 150 ms 尾节流先例。仓内**无共享 throttle/debounce 助手**
  （`player.js:65-72`、`route.js:69`、`momentdetail.js:87`、`nativeip.js:377`、`settings.js:233` 各写各的）。

**P2-2(b) · `comments.js` 的 resize（轻，性质不同）**

- 证据：`src/comments.js:60-70` `syncCommentVars` 只读 `window.innerWidth` 并写两个 CSS 变量 +
  切一个类；**无任何 rect 读取**。报告与 (a) 并列不准确。

**P2-2(c) · `controls.js` 指针移动读 rect（单次）**

- 证据：`src/controls.js:96-99` `ratioAt(ev)` 一次 `track.getBoundingClientRect()`；调用点
  `:117-124`（pointerdown/pointermove，`preview` 内还有样式写与 `showThumb`）。"每事件 ×2 次"不实。

**P2-1 · 占位壳线性累积 → 扫描成本无上界（成本=时间，不是内存）**

- 证据：`src/player.js:224-227` 换出用空 `div.acsv-slide-slot`（只带 `data-idx`，样式
  `src/styles.js:167` `.acsv-slide-slot{height:100%}`）原位保留；换回见 `:203-204`；
  **无淘汰路径**（`src/feedstore.js:67-68` 明令 items 绝不删元素：`data-idx/offsetTop` 是滚动定位承重墙）。
- 全量扫描两处：`renderWindow`（`player.js:240-248`，每次换条的 `children` 全量 slice+sort+比较，
  顺序不同才重排）与 `snapWatchTick`（`:348-379`，600 ms 一拍，`:359-365` 逐 children 读
  `c.offsetTop` ⇒ **每元素一次强制布局**）。
- 口径修正：壳体是空 div，内存可忽略；成本是 O(已访问索引) 的时间。该设计**被测试钉住**
  （`test/cases/feed.js:335-336`：`slide-count-bounded(realN<=15)` + `slots-exist(slotN>=15)`）。
- 安全性判定：壳体**必须留在原位**（位置决定其上下所有条目的 offsetTop）⇒ 任何"删壳/回收"方案
  都会破坏滚动几何，**不可行**；替代形态是"有界扫描/有序索引"（§四）。

**P2-4 · IM 未读监听跨挂载累积（比报告更严重）**

- 证据：`src/imbadge.js:43-50` 在 `badgeDelay`（15 s）到点后注册
  `inst.on('unReadCountUpdate', function () { if (mounted) tick(); })`；`:55-60` `stopBadge()` 只清
  两个定时器 + `badgeEl`，**无 `off`**；SDK 实例是永不复用释放的单例
  （`src/imsend.js:266-275`，`imShutdown` 只 bump `connGen`）。
- 加重项（报告未提）：守卫是**共享模块标志** `mounted`，最新一次挂载置真后**所有**陈旧监听都通过
  `if (mounted) tick()` ⇒ 每个事件触发 N 次 `getSessions()` 全量求和；且 `mountBadge`（`:18-51`）
  首行不调 `stopBadge()`，未经 teardown 的重挂还会孤儿化上一对定时器。
- 修复样板就在同族文件：`src/imsend.js:426` `try { inst.off('sendSucceed', onEvt); } catch (e) { }`。

**P2-3 · 私信列表轮询（口径大幅收窄）**

- 证据：`src/imdrawer.js:251-272` 每拍先 `getSessions` → 逐会话从消息库派生尾条
  （注释明写"SDK 发送后不更新 `lastMessage`"）→ 算 `sig = sessionSig(ss) + '|' + ids.join(',')`（`:270`）
  → `:271 if (sig === listSig && drawer && view === 'list') return;` → **`:271 listSig = sig` 在 `:272
  fetchCards(ids)` 之前** ⇒ 在途期间的重拍直接早退。轮询 1.5 s（`cfg.js:386`，`src/imdrawer.js:54-58`
  另有 `view !== 'list'` 自停 + `document.hidden` 跳过）。
- 真实浪费面：某个会话签名一变就为**全部**会话 id 重发 `fetchCards`（`src/imsend.js:402-410`）；
  `imdrawer.js:46` 的 `cards` 是存储不是请求缓存。可照 `src/appapi.js:288-310` 的 Promise 级缓存
  范式（键=uid，失败弃缓存）。
- **边界（二审限定）**："事实单飞"只在签名不变时成立——签名在途变化仍会并发重发，不能当保证。
- **必须保留**的语义：刚从本页发送过的会话（`chat.targetId`）恒派生尾条，否则"发完回列表预览
  立即变"会断（该语义只有代码注释 + `CHANGELOG-archive.md` 佐证，`docs/api-research.md` 无条目）。

**P3-1 · `imnative` 内核探活（建议不动）**

- 证据：`src/imnative.js:86-96`：`setTimeout(waitKernel, ++n > 120 ? 1000 : 250)`（`:95`）⇒ 前 30 s
  每 250 ms、之后 1 Hz；命中即 `console.info` + `enhance()` + `return`（自终止）；每拍只是一次
  `kernel()` 属性读；仅原生 IM 宿主启动（`boot.js:44 kind === 'native'`）。
- 措辞修正（二审）：**"自终止"只对命中分支成立**——源注释 `:87` 明写"常驻轮询永不放弃"，
  探不到内核时确实会无限 1 Hz（报告的"无限 1 Hz"不算全错）。页隐藏停拍有陷阱：把
  `if (document.hidden) return;` 写在重臂之前会**永久杀死**轮询。结论不变：不做。

### 2.4 单源与小项

- **fmtDur 重复**（成立）：`src/cards.js:338-342` 与 `src/ui.js:40-43` 语义等价（都 clamp 负值、
  都取整、都 `mm:ss`、均不支持小时），且 `cards.js:2` 已 import ui.js。`src/immsg.js:113-120` 的副本
  **不是**同一个函数（支持小时、不 clamp），其 `:113-114` 的"零依赖叶豁免（0.9.243）"注释坐实 ⇒ 保持。
- **toast 文案漂移**（成立）：`src/momentbar.js:91` `'投蕉失败（今日已投过/未登录？）'`
  vs `src/toastmsg.js:20` `'投蕉失败（未登录或今日已投完？）'`；`toastmsg.js:18` 的注释自称
  "banpop 同串两处"，而 `momentbar.js:10` 只 import 了 `errNotLogin` 没 import `errBanana`。
  另：`momentbar.js:85` 还有第二处手写串 `'已投过蕉啦，明天再来~'`（报告未抓）。
- **死代码**（成立）：`src/momentpost.js:132 deleteMoment`、`src/upload.js:97 uploadImages`
  在 `src/`、`test/` 全仓**零调用**（唯二命中是 README/CHANGELOG 文案与另一仓的 Java 源）。
  它们已被 tree-shake 出 debug 产物。删除须同步文档口径（README:434、CHANGELOG:836/943/948）。
- **N1**（成立）：`src/player.js:536-539` 三行里 `:538` 与 `:536-537` 内容重复（`:538` 是前两行
  的重新折行），代码在 `:539` 不受影响。
- **N3**（成立）：`src/comments.js:315` `}  var pic = ev.target.closest('.ubb-imgc');` 闭合括号与
  新语句同行；全 `src/` 中 `}\s+var ` 只有这一处。
- **overlay 测试缺口**（成立，范围已收窄）：`test/unit/overlay.test.js` 已有 11 条（含
  `overlayEsc` onEsc 消费/空栈/无 onEsc、`isInputTarget` 分类器、teardown、异常隔离）。
  真缺口 = 捕获链 `onOverlayKey`（`src/overlay.js:72-80`，未导出）与 `isInputTarget` 的**集成**：
  harness 的 `key()` 派发在 window 上而 `onOverlayKey` 对 `ev.target===window` 直接早退，
  `test/cases/settings.js:84` 的元素派发只用 Escape（永不进 `isInputTarget` 分支）。
- **开关几何重复**（成立，文件归位）：第二份**不在** `natpanel.js`（该文件无自有 CSS，只 import
  `NATIVE_PANEL_CSS` 注入，`src/natpanel.js:23,30-36`），而在 `src/styles.js:43-46`
  （`.acsv-np-sw` 34×18/r22/2px/14px/translateX(16px)）对应 `src/settingspanel.js:53-56` 的 `.set-sw`。
- **P4 URL 字面量**（行号纠正）：`src/ubb.js:58` 是注释；字面量在 `:64`（`/search?keyword=`，
  `cfg.js` 无对应键，需新增）、`:72`、`:86`（与 `videoBase`/`articleBase` 重复合成）；
  同文件 `:76` 已在用 `CFG.api.momentBase`。`src/momentapi.js:39-44` 的 Referer 是**刻意**逐字
  （注释"URL 逐字护 mock 缝"），且与 `cfg.js:50 momentBase` 重复 —— 有据豁免。
- **`build.js` 串行 await**（成立）：`:137-138` 两个独立 `await esbuild.build(...)`；watch 分支
  `:134` 已用 `Promise.all` 先例。
- **`<style>` 注入样板**（成立，6 处中的 5 处可抽 `injectCss`）：`src/ui.js:104-110`（带 id 幂等，
  现成范式）、`src/boot.js:41-43`、`src/imnative.js:400-406`（shadow root）、
  `src/natpanel.js:30-36`、`src/nativeip.js:356-363`、`src/settingspanel.js:221-223`（shadow root）。
  `createElement('script')` 的 4 处（`hls.js:98/165`、`imsend.js:93/228`）是带 onload/onerror/timeout
  的加载器，**不同型**，不要并进同一助手。
- **P0-1 CSS 压缩收益**（成立）：**本机实测**（三处口径都量过）
  `CSS`（=`:root{--acsv-accent:…}` 前缀 + 已替换主色的 `RAW_CSS`）**92,451 B → deflateRaw+base64
  21,648 B ⇒ −70,803 B = −10.98% of 644,788**；`RAW_CSS` 单独 = 92,388 B；
  四块合计 98,929 → 24,236 = **−74,693 B（−11.58%）**。
  - 先例同构：`build.js:33-44`（hls light，deflateRaw+base64 + `__ACSV_HLS_LEN__` 长度校验）
    → `src/hls.js:63-76,178` `unpackHls`；`src/devname.js:33-44` `unpackDeviceTab` + `src/devicetab.js:11-13`。
    fflate 已在包内（仅 `hls.js:3`、`devname.js:22` 两个消费者），**不增体积**。
  - `RAW_CSS` 是模块私有 `var`（非导出）；导出的是 `CSS`、`IMGVIEW_CSS`、`NATIVE_IP_CSS`、
    `NATIVE_PANEL_CSS`。注意 `IMGVIEW_CSS`（`:7-11`）**也**被拼进 `RAW_CSS`（`:697`）⇒ 产物里存在两份。
  - esbuild 不压字符串字面量（实测：`RAW_CSS` 的 24 段字面量在 release 产物里逐字存在）。
- **CFG 插值清点**（本机实测）：`styles.js` 非注释 `CFG.` 引用 **24 处** = `RAW_CSS` 内 23 处 +
  `:1770` 的 `:root` 前缀 1 处；其中 **8 处在 `@media` 条件里**（`:146/672/1212/1213/1467/1579/1583/1586`）。
  全仓 11 个 `@media` 条件**无一**使用 `var(`（`:672` 的 `var(--acsv-dw,412px)` 在**体**里）。

## 三、报告判错（撤回 / 降级）

> 二审对本组逐条反驳，结果：8 条维持、3 条**部分正确**（行 2 机制、行 9 理由、行 10 推理），
> 已按实况改写。

| # | 报告原判 | 实况（证据） | 处置 |
|---|---|---|---|
| 1 | **F1 真 bug**：`cards.js:63` 的 `GLYPHS.banana`(E2EA) 让关注流/面板投蕉图标渲染旧字形 | **不可达**。`GLYPHS.banana` 全仓唯一读取点就是 `cards.js:63`；`META_GLYPH` 只被 `:89`（`rowOf`，`:86` 的 `if (pi.kind === 'rank' && pi.meta)` 分支内）与 `:180`（`statRowOf`，唯一调用者 `:149` 即 `gridCardOf`）读；`gridCardOf` 全仓 3 个消费点 = `mypage.js:184`（kind 为字面量 `panelItem('history')`，见 `:178`）、`mypage.js:441`（`favCell` ← `panelItem('fav')`，见 `:504`）、`searchview.js:195`（`viewPiOf`，`panelitem.js:339-354` **不复制 meta**）。而 `{k:'banana'}` 只在 `panelitem.js:223`（follow）/`:265`（square）产出，两条链只经 `rowkit.feedRowOf`（`followview.js:103`、`squarefeed.js:93`）→ `momentbar`（`feedBanana`）。rank 的 meta 是 `view/comment/time`（`panelitem.js:88-91`）。harness 已钉 `cp('banana')===0xE62A`（`test/cases/views.js:1836`） | 降级为**死映射**：可一行矫正（防未来 rank 条命中），但**无测试可反跑**，不得计入批①门槛。二审独立复追同一结论 |
| 2 | **N2**："`state.js` 直接 `export var`，任何模块可写" | 结论对（全仓对这些名字的赋值只在 `state.js:16-18` 与 `:69` 的 setter 内；`momenteditor.js:135/233` 的 `root` 是该模块自己的 `var root`）。**机制修正（二审）**：产物是 `build.js:96 format:'iife'`，esbuild 对"给 import 赋值"**构建期直接报错**——实测 `Cannot assign to import "root"`；不是运行期 TypeError | **前提撤回**。真实风险是隐式可变单例 + 时序耦合（`stageVisible()`/`slideAt()` 未挂载即假值），非写保护。改 getter 将波及 21 个消费方（`grep -l "from './state.js'"`）⇒ **不做** |
| 3 | P2-5："翻页状态机 5 份逐字副本（含 pickpop、searchview）" | 字面守卫**恰 8 处**（`followview.js:89,121`、`squarefeed.js:83,111`、`mypage.js:174,196,397,407`）= 4 骨架 / 3 文件；`pickpop.js:212-231` 是整表重渲（`:214 body.textContent=''`，无 cursor/noMore/分页，唯一调用点 `:255`），`searchview.js` 无该守卫（sentinel + `IntersectionObserver` `:364-368` + 页码 `:37`；`mypage.js:156` 注释自称"searchview 同款模式"=祖先） | 真副本 = **4 处 / 3 文件**（mypage 动态档已参数化 `loadFailText` 等）。注意：pickpop 的守卫是**同形**的（`:217/:227`），"出范围"的根据是**骨架语义**（无游标/noMore），不是"没有这段守卫" |
| 4 | P3-3："`settingspanel` ↔ **`natpanel`** 双皮" | 第二份在 `src/styles.js:43-46`（`NATIVE_PANEL_CSS`），`natpanel.js` 无自有 CSS | 文件归位（预览门槛仍为真：`docs/preview/` + `_template.html` 均在） |
| 5 | P4："`ubb.js:58` 残留 URL 字面量" | `:58` 是注释；实为 `:64/72/86` 三处，且 `:64` 的 `/search?keyword=` 在 CFG 里**无键** | 行号与份数纠正；`momentapi.js:39-44` 那条是有据豁免 |
| 6 | P2-1："belt 外旧壳定期回收/节点预算" | **不安全**：壳体必须留在原位（位置决定上下条目的 `offsetTop`），删壳必破滚动几何（`feedstore.js:67-68` 明令 items 不删），且 `test/cases/feed.js:335-336` 已钉 `slotN>=15` | 修复方向撤回 → 改为**有界扫描/有序索引**（§七批③） |
| 7 | P2-3："每 1.5 s 对全部会话重发 POST，无 single-flight/缓存" | `imdrawer.js:270-272` 有 sig 门且 `listSig` 在请求前赋值 ⇒ 在途早退（事实单飞，但签名变化时仍会并发） | 口径收窄为"一会话变→全 id 重拉" + 可选 uid 级请求缓存 |
| 8 | P3-1："按页可见性停拍" | 探活 250 ms×120 → 1 Hz（`:95`）；**命中**即自终止，探不到则按源注释 `:87` 永不放弃 | **建议不做**（改错会永久杀死轮询，收益近零）。措辞按二审限定（"自终止"非全程成立） |
| 9 | P1-1："16 处裸 console 全加闸" | 实为 **19 处**（多 `imsend.js:71-73`）；**理由修正（二审）**：这三处可以静音（黑匣子读回走 `push`，不经 console），保留的理由是"刻意给真机/devtools 看的镜像"；另 `imnative.js:169/:172`、`release.js:291`、`sharepanel.js:204` 是有意的 release 可见诊断 | 改为**逐条裁决**，禁止机械全闸（结论不变，论证已换） |
| 10 | P0-1："构建期算出最终 CSS 串再压缩" | **事实部分成立，推理修正（二审）**：8 处 CFG 在 `@media` 条件里属实，但那些 CFG 都是**字面量常量**（`cfg.js:21/247/248/270/274/251-252/259/276-277/308-309/391`），构建期代入不需要 `var()` ⇒ **构建期冻结在技术上可行**。"媒体查询不吃 var()"只否掉"把 CFG 换成运行时 CSS 变量"这条（即报告 P1a/P1b 的变量化路线）。报告的形态真正的代价是：`build.js` 要 import `src/cfg.js`（现只读 `package.json` + `node_modules`），且要在构建期复刻 `styles.js` 的 23 处插值拼装与主色替换顺序 ⇒ 与 AGENTS 规则 3（单源收口）冲突 | **形态改为"压缩 23 缝模板 + 运行时拼接"**（保留 CFG 插值与主色替换都在 `styles.js` 一处，与 hls/devicetab 先例同构）；不采用构建期冻结 |
| 11 | P1-2 排在批① | 阈值必须按批②压缩后实测定，否则刚立就松 | 归入**批②合并执行**（二审降级为效率判断：若阈值写成相对基线/分段表则与顺序无关） |

## 四、修复写法修正（照报告原文抄会翻车）

> 二审对 9 条逐条反驳：8 条维持，**A1 一条属偏好而非正确性**（已改写），P0-1/P1-2 同 §三。

| 报告写法 | 应当改成 | 理由 |
|---|---|---|
| A2 在 `session.js:229` 后补 `this._armRecoverWatch()` | **`self._armRecoverWatch();`** | `:223` 是 `.then(function (ok) {...})` **普通函数**回调（非箭头），ESM+strict 下 `this === undefined` ⇒ TypeError。`var self = this` 在 `:186`。插点在 `video.load()`（`:228`）之后、`hooks.play`（`:229`）附近 |
| A1 在 seeked 里"补 `clearTimeout(self._waitTimer)`" | **两种都能修**；推荐把 `clearTimeout(this._waitTimer)` **上移到 `setState` 同值早退之前**（`:36` 后，条件 `s==='ready'\|\|s==='error'`），并删 `:41`/`:46` 两处冗余分支内清理 | 报告的写法同样能消除症状；上移的优势是合乎 `:41` 注释自述的"转圈清除与状态拨回归口一处"。上移不会误清：会以 ready/error 进入 `setState` 的路径只有 playing/seeked/error，之后若再进 waiting 会重新武装 |
| A3 在 `unmount` 尾清 `UpVideos.feedActive` + `FollowVideos.feedActive` | **只**在深链成功分支（`player.js:506-508`）加归属判定：`UpVideos.feedActive` 为真但 `UpVideos.items` 不含本次 `mid` 时置 `false`；**不动** unmount、**不动** FollowVideos | 空间页条目点击正是"激活 UpVideos + 写 `/v/<id>` 哈希"（`uppage.js:118-124`），深链分支就是它的续泵通道（`player.js:506-507` 契约）。清 unmount 会把"重进空间页续播顺序"一起打断 ⇒ 治陈旧而非治激活 |
| A4 "全局按 videoId 门控 `onPlaying`" | 判据 =「`!findPump(layer)`」+「`slide._dmVideoId !== item.videoId`」，分别决定是否 `startAdvPump` / `fetchList+setItems`；**`layer.start()` 不门控** | `controls.js:20` 的弹幕开关重开会**对同一 slide** 再调 `dmOnPlaying`，那时图层刚 `stop()`、泵已被 `stopAdvPump` 拆 ⇒ 必须重建；全局同 id 门控会让"重开弹幕"无声失效。`stop()` 保留 `items`，故同 id 不必重拉 |
| P1-4 "capped 时置 `done`" | 泵侧（`feedstore.js:117`）把 `chainCapped` 当**并存终态**：`if (ctx.done \|\| ctx.failed \|\| ctx.chainCapped) fetchMore()…` | `done` 语义是"列表到底"（`uppage.js:202-204` 的文案先看 `done` 再看 `chainCapped`）；冒用 `done` 会污染进度文案。同批顺带修好"回落随机流永不触发" |
| P1-3 "在 dispose 里逐键清定时器" | 定时器体首行加 `if (!slide.isConnected) return;`（`controls.js:44` 之前） | 三处分支全兜住；拆壳后无任何路径会把旧 slide 重新插入（`player.js:203-204` 是**新** slide 换回槽位）⇒ 守卫即终态 |
| P2-1 "回收旧壳" | `snapWatchTick` 按当前 idx 查 ±2 个 slot（有界）；`renderWindow` 维护有序索引，替代每次 `children` 全量 slice+sort+compare | 见 §三行 6：壳体是承重墙，不能删 |
| P0-1 "构建期求值最终 CSS" | 压缩**带 23 个接缝的模板** + 运行时拼接；`#fd4c5d → var(--acsv-accent)` 的 `.replace()` 必须在插值**之后**（现序见 `styles.js:1766-1771`）；解包复用**同一个**助手（勿新造第三份 `unpack*`，AGENTS 规则 3），带 `LEN` 校验 + 失败降级 | 保留单源（CFG 插值与主色替换都在 `styles.js`）；另：`ensureStyle`（`ui.js:104-110`）在 `boot.js:48` 是 **eager**，与 hls/devicetab 的 lazy 解包不同 ⇒ 解包成本落在首屏，需实测 |
| P1-2 "立个绝对上限" | 阈值按**批②压缩后**的实测定（如 +2%），并给分段表（头 / HLS b64 / CSS 字面量 / 其余） | 现在立＝留出 ~11% 的静默膨胀空间（判断项，非正确性缺陷） |

## 五、未复核 / 不可由代码定论

1. **Chromium 不给已拆元素补发 `pointerleave`**（P1-3 的触发前提）——代码侧只能证明仓库**无补偿逻辑**。
2. **A1 的"永不恢复"**依赖"平滑 seek 之后不再补发 `playing`"——依据是 `session.js:309-312` 的作者
   注释（自称真机实测），非规范推演，本轮无法独立判定。
3. **A1/A2/A4/P1-3/P1-4 的"摘修复反跑"落点**依赖 harness 模拟缝的可用性
   （`TEST.call('setStallSim', …)`、请求计数、`getSessions` 计数等）。本轮**未验证缝是否够用**，
   属实施期第一件事。
4. **"发送后 SDK 不更新 `lastMessage`"**（P2-3 的关键语义）只有 `imdrawer.js:253-254` 注释与
   `CHANGELOG-archive.md` 佐证，`docs/api-research.md` 无对应条目 ⇒ 若要动该链，先补实测。
5. **`imsend.js` 黑匣子双 `push` 疑点**（`:70-73` 与 `:75-83` 包装叠加）——需 SDK 侧或真机确认。
6. **模板形态（23 缝）的压缩尺寸**：一审给的 21,720 B（vs 冻结串 21,648）**未能复跑**
   （只复现了 21,648）⇒ 该数字暂不作为依据；实施时以实测为准。
7. **CFG 插值的非媒体查询归类**（15 处）来自结构化扫描（剥注释 + 逐行 `CFG.` 计数，命令见 §一）。

## 六、报告未发现的新事实

1. **`deactivateContext` 不是死导出**：生产侧零调用，但 `test/unit/feedctx.test.js:102` 在用
   （测试专用缝）。若按"死代码删除"处理会打掉单测。
2. **imbadge 的两个加重项**（陈旧监听共用 `mounted` 标志；`mountBadge` 不先 `stopBadge`）见 §2.3。
3. `src/momentbar.js:85` 的第二处手写投蕉文案（`toastmsg.js` 单源表外）。
4. `src/imsend.js:426` 的 `off` 用法（IM 家族唯一样板，P2-4 的修法可照抄）。
5. `IMGVIEW_CSS` 在产物里存在**两份**（`styles.js:697` 也拼进 `RAW_CSS`）⇒ 批②的节省口径要按实际
   字面量算（实测 `CSS` = 92,451 B / `RAW_CSS` = 92,388 B）。
6. **文档水位同步点只有一个**：`docs/roadmap.md:418`（R6 行，现值"release 628KB / debug 960KB"）。
   README 里的体积累述（`:179` 的 hls "300KB→120KB，产物 -23%"、`:393` 附近的 860KB SDK）都不是
   release/debug 水位 ⇒ 一审写的 `README.md:354/355/371` 是错的（那是 devname/devicetab/hls 模块行）。
7. `test/check-direction.mjs` 的入边正则**只匹配单引号** specifier（`:114-115`）；`KNOWN` 当前为空
   （`:107`，零容忍）。
8. `test/cases/*.js` 是 classic script（非 ESM），`test/feed-sample.js` 等是纯数据桩 ⇒ C1 扩面需
   按来源定 `sourceType`，数据桩可显式排除并写明理由。
9. `imsend.js:75-83` 会把 `G.console.log/info/error` 换成会 `push` 的包装（黑匣子入口），
   与 `:70-73` 的 `localLog` 并存 ⇒ 见 §五.5 的双 `push` 疑点。

## 七、批次建议（未实施；本文只归档，不含任何代码改动）

- **批①（纯行为/工程焊缝，全部免预览）**：A1、A2、A3（修正版）、A4（修正版）、P1-3、P1-4、P2-4、C1。
  每条须"摘修复反跑"转红后才提交；版本号 + CHANGELOG 同批；`build/lint/check/单测/harness` 全绿。
  反跑缝不确定的（§五.3）先在实施期确认，确认不了就在提交信息里如实标注。
- **批②（构建改造）**：CSS deflateRaw+base64 内嵌（23 缝模板 + 运行时拼接，共享解包助手）+ **P1-2
  体积门禁**（阈值按压缩后实测）+ `docs/roadmap.md:418` 水位同步。预期产物 −10.98%（`CSS` 一块）
  ~ −11.58%（四块全压）。
- **批③（性能）——2026-10-16 实测后撤下三条，见 §九**：`dmcanvas` resize 节流、`snapWatchTick`/
  `renderWindow` 有界扫描、`controls` rect 读 rAF 合并**不做**（实测 0.005–2.7 ms/事件且浏览器已
  ≈1 次/帧合并 resize；0.29 ms/拍 @201 子项；26 µs/事件 ⇒ 收益不可测、改它只是风险）；
  `fetchCards` uid 级请求缓存**缓议**，待真机端点数据（页内成本实测 0，语义前提见 §五.4）。
- **批④（单源收口）**：翻页骨架抽 `pageLoader`（followview + squarefeed + mypage×2，逐消费点带
  harness 迁移；pickpop/searchview 不在范围）；`check-direction` 注释漂移（16→21）+ 去 `momentpost`
  重复登记 + 逐件入边审计补登记。
- **缓议/不做**：P3-3 双皮合并（**必须先出 `docs/preview/` 预览稿**，AGENTS 规则 1）；P3-1（不做）；
  N2 state.js 只读化（前提不成立、波及 21 个消费方）；`deleteMoment`/`uploadImages` 死代码删除
  （tree-shake 已剔，删它要连 README/CHANGELOG 口径一起改，宜独立小批）；F1 一行矫正
  （无测试可钉，须在提交信息里如实说明）。

## 八、复核记录

### 一审（2026-10-16，本代理）

逐条回源。命令与证据见 §一/§二；A1/A2/A3/A4/P1-3/P1-4/P2-4/C1/P0-1 的结论均由本代理**亲读**
对应 `file:line` 或**亲跑**命令确认（含 `zlib.deflateRawSync` 量 CSS、`eslint --print-config`、
`node` 复算覆盖率与行数、`esbuild` 探针）。

### 二审（2026-10-16，独立只读子代理，以反驳为目标）

**维持（8 条撤回）**：F1（不可达死映射——二审独立复追：`GLYPHS.banana` 唯一读取点 `cards.js:63`，
`gridCardOf` 3 个消费点均不携带 banana meta，harness 钉 0xE62A）、P2-5（8 处守卫 = 4 骨架/3 文件，
pickpop 出范围的根据是骨架语义）、P3-3、P4、P2-1（删壳必破几何）、P2-3（事实单飞；二审补"签名变化
仍会并发"）、P3-1（措辞需限定）、P0-1 的**事实部分**（8 处 @media 条件、全仓 0 处用 var()、替换顺序）。

**推翻并已改写的 3 条（本代理一审的错）**：

1. **N2 的机制**：一审写"跨模块赋值直接 TypeError"；二审用 esbuild 探针实证 **构建期报错**
   （`Cannot assign to import "root"`）。本代理复跑同一探针确认为真 ⇒ 正文 §三行 2 已改。
2. **P1-1 的"不能静音"论证**：一审称"静音会破坏读回"；二审指出 `imsend.js:54-69` 的 `push` 先于
   `:71-73` 的 console 镜像执行，且 `:105/:110/:123` 读的是 `__acsvImLog` 缓冲 ⇒ 静音**不影响**读回。
   本代理亲读 `imsend.js:40-83` 确认 ⇒ 正文改为"可以静音，但保留是有意的真机可见镜像"。
3. **P0-1 的"不可行"**：一审用"媒体查询不吃 var()"推出构建期冻结不可行；二审指出该事实只否掉
   "CFG→运行时 CSS 变量"这条路线，而 CFG 全是字面量常量、构建期代入不需要 var() ⇒ 冻结**可行**，
   真正代价是 build 期要复刻 `styles.js` 的拼装逻辑（违单源）。本代理核对 `cfg.js` 常量后接受 ⇒
   正文改为"形态选择：接缝模板优先，理由=单源"。

**数字与行号纠正（二审发现、本代理已验证）**：CFG 插值 24 处（非 23，含 `:1770`）；一审写的
"CSS 字面量 91,895 B"**无法复现**（实测 `CSS`=92,451 / `RAW_CSS`=92,388）⇒ 已替换；
`panelitem.js` banana 段 `:223/:265`（非 `:220/:262`）；`controls.js` `_volOpen` 写点 `:218/:226`、
pointerenter/leave `:229/:230`、进入时清 hide 定时器在 `:215`；`toastmsg.js` 注释在 `:18`；
`player.js` 节流块 `:65-73`；`docs/roadmap.md` 的 R6 水位行在 `:418`（非 `:417`）；
`imnative.js` 自检 console 在 `:169/:172`（非 `:97-99`，那是武装注释）、`release.js` console 在 `:291`。

**二审未能判定（已留在 §五）**：Chromium `pointerleave` 行为、A1 的"永不恢复"依据、反跑缝可用性、
`lastMessage` 语义出处、黑匣子双 `push`、模板形态的 21,720 B。

**二审后本代理的自省**：三条被推翻的都是**我自己的推理**（不是报告条目的判定），其中两条（N2/P0-1）
源于"用一句正确的事实推一个不成立的结论"；一条（P1-1）源于**只看调用点没读写入路径**。凡"因此
不可行/因此不能动"这类**推理性结论**，本仓后续审计应默认再派一个反驳者。

### 落地追记（2026-10-16，批②实施后补记；本节此前为只读留档，改动仅此条）

- **P0-1 已落地（0.9.258）**：形态即 §三行 10 / §四 P0-1 所定的"接缝模板 + 运行时拼接"——
  CSS 原文整段迁 `src/cssraw.js`（构建期输入，**只被 build.js import**），产物以
  `window.__ACSV_CSS_SRC__` 携带（模板 91,800 B → deflateRaw+base64 **21,656 B**；§五.6 悬着的
  那个数字以实测定案）；styles.js 侧解包走新共享件 `pack.unpackText`（hls/devname 同批改住它，
  全仓 unpack 实现**只剩一份**），再回填 `SEAMS` 表 13 缝（12 CFG + `imgview`=IMGVIEW_CSS 留缝，
  以免同一段 CSS 在仓里存两份）。**runtime CSS 92,451 B 与压缩前逐字节相同（`cmp` 退出 0）**；
  产物 release 645,532 → **575,990 B（−69,542 B = −10.77%）**、debug 987,456 → **918,713 B**；
  P1-2 体积门禁同批落地（分段基线 ×1.02 + 产物 `'{{'` 0 次反跑闸）。

## 九、批③ 实测结论（2026-10-16，harness 内 Chromium）

> **本节推翻 §2.3 对 P2-1 / P2-2(a) 的严重度评定，以及 §七「批③」四条里的三条。** 读 §2.3 与 §七
> 之前先看这里——项目铁律「实测先于动工」：审计提的四个热点当时**都没测过成本**。
>
> **方法**：可复用的探针台放在 gitignored 的 `test/tmp-probe/`（`probe.html` 最小挂载页 +
> `probe-runner.mjs` Playwright/静态服务 + `fake-imsdk-n.js` 可变会话假 SDK；`?feed=N` 克隆夹具到 N
> 条）。计数器：`Element.prototype.getBoundingClientRect`、`measureText`、
> `HTMLElement.prototype.offsetTop` getter（显式开关，计时期间一律关闭）、`page.route` 网络计数、
> 以及"同 DOM 下 `DmCanvas.stopAll()` 前后 A/B"以隔离 `realignAll` 的边际成本。每点 5 次取值 ×
> 2 轮独立运行取中位数；harness 时钟量化 0.1 ms（② 因此按 100 轮批量计时再除）。

| # | 场景 | 实测（中位数） | 成本真正落在哪 | 裁定 |
|---|---|---|---|---|
| ① | `dmcanvas.realign`：20 次 `resize`，K=1/3/5 活图层 × 60 条，尺寸不变 | burst **0.1 / 0.2 / 0.3 ms**（0.005–0.02 ms/事件）；rect 读 **40/120/200** ＝每层每事件 2 次（审计该句属实） | 无意义：读命中干净布局，每次 ≈5 µs | **不值得节流** |
| ① | 同上，但每事件使 16:9 适配宽跳 >60px（强制 `assignLanes`） | 60 条：burst 7.7/21.2/46.5 ms，A/B 边际 **0.4 / 1.6 / 2.7 ms/事件**；1600 条：**3.4 / 11.7 / 20.1 ms/事件** | `assignLanes` 的逐条 `measureText`（1600 条 1.7–1.9 ms）约占 40%；rect 读在处理器内只占 **10–15%**；其余是舞台重排 + 画布后备存储写 | 见裁定 |
| ① | 真实拖拽：20 事件 × 8 px（累计跨 60px 才触发一次 `assignLanes`） | 边际 **12.2 / 24.8 / 50.4 ms**/burst（60 条），1600 条 14.3/56.4/105.4 | 同上，但 `assignLanes` 一轮只跑 1–5 次 | **不值得节流** |
| ①b | 投递率：20 次 CDP viewport 连改 / 20 ms 间隔 | 连改只投递 **2–4 个** resize；20 ms 间隔 620 ms 内 60–80 个；3 图层@400 条时无 rAF 间隔 >16.8 ms | **浏览器已把 resize 合并到 ≈1 次/帧** | **不值得节流**（JS 节流降不下事件数） |
| ② | `snapWatchTick` 扫描（`scrollTo` 访问 15/50/200 条） | 子项 **16 / 51 / 201**；`offsetTop` 读 **= 子项数**（200.8 次/拍）；扫描 **0.011 / 0.070 / 0.287 ms/拍**（1.3 µs/子项）；`renderWindow` 比较 0.005/0.039/0.137 ms，全量重排分支**从未触发** | 一次干净布局读/子项——扫描期**不做任何变更**，故"每元素一次强制布局"**不成立** | **不值得改有界**（600 ms 一拍 ⇒ 占空比 0.05%） |
| ③ | `controls.ratioAt`：轨道上 100 次 `pointermove` | **2.6–2.8 ms/100 事件（≈26 µs/事件）**，其中 1.8–2.1 ms 在 `getBoundingClientRect` 内；轨道外同 burst 0.2 ms；真实 `mouse.move` 100/100 投递 | 每事件一次强制布局：`preview()` 在读之后写样式，下一次读要付重排（≈20 µs） | **不值得 rAF 合并** |
| ④ | `imdrawer` 列表轮询（1500 ms，真顶栏按钮开、假 SDK） | 静置 10 s：**0 POST**；单会话每 500 ms 变：**6–7 发/10 s**（＝每拍 1 发、6 个 id）；50 会话变：7 发/10 s、每次 50 个 id；50 会话签名重算 **<0.05 ms** | 页内成本不可见（50 行重建期一帧 33 ms，6 会话无） | **需真机/真网络数据** |

**逐条裁定**

- **① `dmcanvas.realign` —— 撤回"值得节流"**。空转期 0.005–0.02 ms/事件；几何真变 0.4–2.7 ms/事件
  （K≤5、60 条）；只有"≥3 活图层 × 全量 1600 条弹幕 × 每事件都跳 >60px"三个条件同时成立才到
  12–21 ms/事件（该量级在 60fps 下确会掉帧，但真机 GPU 路径未测）。且 **①b 断了节流的正当性**：
  浏览器本身已把 resize 合并到约 1 次/帧，JS 侧再加尾节流降不下事件数。若哪天真要动，最省的形态是
  **把 `realignAll` 合并到每帧一次**（rAF 去重）与/或重新审视 `realign()` 里那次 `assignLanes`
  （注意：该调用是为"暂停时画布也要跟上几何"而存在，属 0.9.237 的修复面，**不可随手删**）。
- **② `snapWatchTick` / `renderWindow` —— 撤回"有界扫描/有序索引"**。审计的前提（每子项一次强制
  布局）被实测否掉：扫描不产生变更，201 子项一轮 0.29 ms。除偶发布局脏时的尖峰（21 次采样里最大
  6.5 ms）外无稳定成本。改它＝用真风险换不可测的收益。
- **③ `controls.ratioAt` —— 撤回"rAF 合并"**。26 µs/事件 + 真实投递 ≤1 事件/帧。
- **④ `fetchCards` —— 缓议，待真机数据**。页内部分为 0；决定性是真实端点延迟/限流与会话规模，
  本地假 SDK 量不出。真要花预算，最省的形态是"复用现有 `cards{}`，只请求未命中的 id"，但审计已
  点明 `imdrawer.js:251-259` 的"刚发送会话恒派生"语义必须先有真机证据（§五.4）。

**本机量不到、必须真机的**：④ 的真实 POST 延迟/限流/会话规模；真机 GPU Chromium 上"快速拖窗口 ×
多张全量弹幕层"是否肉眼掉帧；真机单视频弹幕条数上限；① 的真实活图层数上限（`dmcanvas` 的
`layers` 数组没有观测缝，只能从 `session.js:349` 的 dispose 销毁推出 K≈1–3）；③ 的 sprite/VTT
拉取网络面（夹具条目无 `videoId`，路径未触发）。

**对批次表的影响**：§七「批③」四条 → **① ② ③ 撤下（实测不足），④ 缓议待真机数据**；「批④」不变。

