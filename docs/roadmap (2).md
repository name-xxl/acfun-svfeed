# acfun-svfeed 全功能化路线图

> v1.2 · 2026-10-03 · 状态：已批准的总体计划，版本号为锚点，按实测发现滚动修正
> v1.1 修订：吸收 2026-10-03 上报链路登录态实测（官方事件驱动、sendBeacon 信封、latest 语义），0.9.86/0.9.87 任务卡按实测重写，废弃原案 60s 心跳；提交纪律入档。
> v1.2 修订：补「开发理念（工程层五条）」，与产品层铁律同格；补两条缝隙条款（ubb 双仓 sunset、副作用出口分析通则）。
> v1.3 修订：嗅探时序按 2026-10-03 实测修订——官方 SDK 为静态脚本、启动批 flush 早于 document-end，原「document-start 时序铁律」废弃（数据与承诺影响面见 api-research §4.6）。
> v1.4 修订：D1 修订（关注语境「视频」侧允许借宿主竖刷舞台做纯视频子流，混合「全部」仍是列表——用户裁决）；增补批次 0.9.93–0.9.99 入档。
> 本文件是项目的战略层文档；具体实现以代码、单测、`docs/api-research.md` 为准。

---

## 0. 定位与总纲

**一句话定位**：A 站增强客户端——竖刷是一个视图，不是项目本身。单脚本吸收动态广场与 Web-IP 的成熟资产，成为全功能脚本。

**三条铁律**

1. **吸收不搬家**：被合并项目一律重写进 svfeed 的闸门体系（契约层、单测、harness、lint 禁令），禁止整仓平移。代码组织的成熟工程（拼接式模块、基础单测）不够 svfeed 的水位。
2. **双 UI 体系**：脚本页（首页，脚本是页面主人）与原生页（官方页面，脚本是客人）分开设计。共享逻辑层零 UI；两套皮肤各自管理入口与生命周期。先例：`imcard.js` 两皮肤同源（0.9.80）。
3. **实测先于动工**：端点形状、官方行为节奏先实测再写代码，结果进 `docs/api-research.md`；拿不准的标「未实测」，宁可空白不可编造。教训：0.9.82/0.9.83 凭 docs 残缺记录做字段裁决，0.9.84 实测推翻。

**开发理念（工程层五条）**——与产品层铁律同格；每条附机械强制手段。理念不落成工具只是愿望，这是 0.9.78–0.9.82「注释即规格 → 工具约束」传统的延续。

1. **模块化归一**：每个概念一个家——图片只走 imgInto、富文本只走 ubb、面板数据只走 PANEL_PARSERS 契约、逻辑层零 UI。新重复即 lint 候选；依赖单向（check-deps 盯）。**缝隙条款**：ubb 单源化的「广场反向跟进」必须有 sunset——0.9.89 落地后，广场要么吸收 svfeed 单源、要么 archive 指向 svfeed，不允许无限期双仓并行（漂移源）。
2. **易维护**：坑进编译器（pitfall → lint 禁令）、故意行为进测试（防误修钉测，如 live 路径回退）、知识进档案（实测入 api-research，拿不准标「未实测」）。
3. **可复用**：合并即复用——intake 清单九条是复用准则；纯函数优先抽纯（崩溃路径模拟不了，逻辑必须可测）；写路径与渲染分离。
4. **可拓展**：只开注册表式拓展点（PANEL_PARSERS / viewreg / settings schema / pageKind），加一个注册项即是全部成本；禁止预留抽象层（YAGNI，non-goals 守门）。
5. **健壮性**：任何出口误差有上界——上报三层为范式（合作现场直报 / 关页 beacon / 崩溃账本 ≤3s）；降级到文档化兜底而非静默腐化（wire 兜底路径为范式）；失败经 stat() 可见；乐观更新必须可回滚。**通则**：凡是「离开即丢」的副作用（上报、写链、查询），动工前默认问一遍「关页时它在哪」，答不上来的先补出口分析再写代码。

**两条伦理自检标准**（适用于所有新功能）

- 关掉脚本，世界是否无损？（可逆性）
- 用它，官方是否受益？（播放、互动、时长回流 A 站；不吃 UP 主播放量）

svfeed 通过这两条（界面替代、关系共生）；LocalRec 与旧 Danmaku-Sender 倒在「替代关系/权威」上——它们是本路线图的反面教材，不是合并对象。

---

## 1. 锁定决策记录

| # | 决策 | 内容 | 理由 |
| --- | --- | --- | --- |
| D1 | 关注流形态 | dock 卡片视图，不做全屏流式 **（v1.4 修订：关注语境「视频」侧允许借宿主竖刷舞台做**纯视频子流**——followDougaFeed 列表上下文走 UpVideos 通道；混合「全部」仍是列表视图，D1 对混合源的理由原样成立）** | 混合内容源（视频/文章/动态）只有卡片/列表能共存；复用 panelItem + 播放层直达；视频子流不动 FeedStore 泵逻辑，走列表上下文分支 |
| D2 | @match 范围 | 扩至 `https://www.acfun.cn/*`，排除 m.acfun.cn | 全功能脚本只装一个；m 站 PC 选择器不生效，别带死重 |
| D3 | 设置面板宿主 | dock 齿轮（脚本页）/ IP 标签点击（原生页），不走油猴菜单 | 统一入口、与 Web-IP 用户既有习惯兼容 |
| D4 | UI 分层 | settings.js 共享层 + 两皮肤；共享层禁止 import 皮肤（lint 级约束） | 设置项永远一致，不可能漏一边 |
| D5 | 高弹项目 | 独立回炉，暂不迁入；达标后作为 Phase 7 重新评估 | 理念级重构需要快速试错，svfeed 闸门体系是为稳定吸收设计的 |
| D6 | LocalRec | archive 不删除；算法核留待「竖刷双引擎」；scanner 不移植 | 壳的痛苦是 MV3 结构性的；扫盘合规风险最重 |
| D7 | 上报方案 | 三层：合作出口现场直报（触发点对齐官方：暂停/播完/离开）/ 关页 sendBeacon 官方信封直发（嗅探缓存，零硬编码）/ 崩溃持久账本对账（上界=落盘间隔 3s） | 2026-10-03 实测：官方事件驱动无心跳、playedSeconds 取 latest、client_timestamp 精确采信——对齐流量形态的唯一正解是照抄官方节奏，原案 60s 心跳废弃 |
| D8 | Web-IP 设备数据 | 带生成器（gen-device-data.js）不带表；key 兼容 `acr_*` | 仓库自净；不让合并日发布日变成老用户数据清零日 |

---

## 2. 主线版本序列

### Phase 0 —— 0.9.86 · 地基与修复

四件事互不纠缠，一个版本出。主题：把已知的洞一次填平。

#### 任务卡 0.1：评论链接劫持修复（中危）

- **病灶**：转发 wire = `@作者：ubbImText(content)\nshareUrl`。评论内嵌裸 acfun 链接（A 站评论常见）会成为 `RE_AC_URL.exec` 的首个匹配 → 卡片链接指向评论里提到的视频、`#ncid` 锚点丢失、预览截断在链接前。
- **修法**：`isCommentShare` 命中时优先选择 **note 为空**的候选（发送格式里推荐链恒独占末行；手打分享「看这个 链接 再看看」依赖首个匹配的默认行为保持不变）。建议 `parseShare` 返回全部候选或新增 `parseSharePreferTail`，imdrawer / imnative 两处渲染点共用。
- **文件**：`src/immsg.js`（parseShare / RE_AC_URL）、`src/imdrawer.js`（appendShareBubble）、`src/imnative.js`（tryShareCard、enhanceList 顺带统一走 plainPreview，消除 0.9.54 单源化的漏网点）。
- **测试**：单测钉「内嵌 URL 不劫持推荐链」的组装→检测→渲染往返；wire 兜底路径（extra 被剥除）断言 quote 内容完整。
- **验收**：`@作者：看看这个 https://…ac999 哈哈哈\nhttps://…ac888#ncid=5` 的 wire 渲染后 href = ac888#ncid=5。

#### 任务卡 0.2：@match 扩容 + boot 分流

- **内容**：metadata 扩至 `https://www.acfun.cn/*`（排除 m.acfun.cn）；新增 `pageKind(location)`：
- `home` → 全量初始化（现状不动）
- `video` / `article` / `member` → 轻量初始化（imnative + 未来的 IP/设备模块）
- `other` → 仅基础设施（设置存储、更新检查）
- **审查点**：① 0.9.47 首页白名单是「nav 入口显隐」不是运行门槛，扩 match 不冲突，但语义要加注释防误改；② 单测钉 pageKind 分支表；③ harness 加 home / none 场景。

#### 任务卡 0.3：LICENSE 文件

- 补 MIT LICENSE 文件（package.json 已声明，GitHub API 读不到文件）。让 GitHub 正确识别。

#### 任务卡 0.4：上报第一层——播放层补洞 + 触发点对齐官方

**对齐基准（2026-10-03 内置浏览器登录态实测）**：官方 CLIENT_BROWSE_HISTORY 为**事件驱动**——暂停报当前位、播完报整段、离开时报——**无心跳、无定时器**；传输走官方 weblog SDK 队列，攒批后以 navigator.sendBeacon POST 明文 JSON klog 信封到 misc2 端点；服务器 browseTime 精确采信 client_timestamp；playedSeconds 取 latest（单调守卫实测必需）。路线图原案「60s 心跳」据此废弃。

- **病灶**：`reportLeaveCurrent` 只认 `slideAt(FeedStore.current)`，播放层会话（OVL slide）不在视野内 → 层开着关页，层内进度整体丢失。
- **修法**：`state.js` 仿 videoTarget 新增 `setWatchTarget(fn)/watchTarget()` 中介，返回层内 `{ session, video }`，「不回落竖刷」纪律照旧；`playlayer.js` 在 videoTarget 设/清除点同步设/清 watchTarget；`reportLeaveCurrent` 先问 watchTarget（有层内会话即报并 return），否则走原路径。
- **触发点对齐（实测：暂停即报）**：SESSION_HOOKS.onPause 加 `reportLeave(session, video, 'pause')`。
- **中间版本保留 10s 定时首报**（player.js）：0.9.87 beacon 落地后删除，避免中间版本出现 pagehide 丢失窗口。
- **参数对齐**：reportLeave 载荷补 `bangumiItemId: null`，与官方逐字段一致。
- **故意不修清单**：
- dispose() 内的 `video.pause()` 使 pause/dispose 双报——同秒去重兜住，跨秒为同值近邻报文，无害；
- live 路径无单调守卫是**故意的**——官方用户重看回退时历史同样回退，对齐即连回退一起对齐。钉单测「高进度已报 → 回拉暂停 → 断言发送低秒位」，防止被误修成单调。
- **测试**：watch provider 优先级单测（有层报层、无层报流、层关闭回落）；harness 新场景「播放层开 → pagehide」，断言以层内会话 + 最终秒位调用；既有 watch-report 场景保持绿。

**0.9.86 验收**：全绿（128 单测 + 新增 + harness 场景）；四任务卡各自独立可回退。

---

### Phase 1 —— 0.9.87 · 设置面板基建 + 上报补全

#### 任务卡 1.1：settings.js 共享层

- **schema 设计**：每项声明 `{ key, type: bool/number/select/text, default, min?, max?, label, group, needsNative? }`。两皮肤表驱动出自同一份 schema——新增设置项两边自动出现，不可能漏一边。
- **存储**：GM key 规划 `acsv.s.*`；读时默认值合并（照缓存层 TTL/合并语义）；写时防抖。
- **约束**：lint 立「settings 共享层禁止 import 任何皮肤模块」，check-deps 依赖图校验顺手盯。依赖方向单向：皮肤 → 共享层。

#### 任务卡 1.2：脚本页皮肤

- dock 底部齿轮 → `openSettings()` → overlay 栈（0.9.61 的栈管理器，Esc 行为白拿）。
- 表单生成器按 schema 产出控件；UI 全部 `el()` + Shadow DOM；样式对齐原生靠量取（0.9.69 纪律），不沿用 Web-IP 的 `#fd4c5d` 仿弹窗体系——那是原生页皮肤的事。
- **首批设置项**：更新提示开关等已有项（证明管道通）。IP/设备开关等 Phase 5 入住。

#### 任务卡 1.3：上报第二层——pagehide 官方同款直发 + 持久账本

- **信封嗅探**（report.js 启动处）：包一层 `navigator.sendBeacon`（try/catch，委托原函数），URL 含 `/log/collect/misc2` 时解析 Blob body，缓存最新 `{ url, common, inc }`。
- **时序（v1.3 按实测修订，2026-10-03）**：~~包装必须在 document-start、官方 weblog SDK 加载**之前**完成~~。实测：官方 SDK 是**页面静态脚本**且**启动批** flush 早于 document-end（首页：脚本 243ms / 首 flush 411ms / DCL 1269ms）——document-end 包装必然漏掉启动批，自 DCL 后首批（~2.3s）起进缓存；漏批不伤直发承诺（可报下限 watchReportMin=3s > 缓存就绪 ~2.3s），此前关页回落 SDK 队列路径。若将来要全捕启动批须 @run-at document-start（全局 boot 时序变更，未采纳，实测在案）。
- Blob 解析异步：缓存须解析完成才覆盖，不取同步占位（防止拿到半个 common）。
- **increment 续号**：`client_increment_id` 从嗅探到的官方最新值 max+1 续走，不自起炉灶——防服务端会话级单调/去重校验把低位自增当重复丢弃。若实测观测到丢报，再评估改用官方序列。
- **pagehide 直发**：有缓存信封且 wl.impr 就绪 → 组最小信封 `{ common, logs:[{ client_timestamp: Date.now(), client_increment_id, event_package…, element_package:{ action:'CLIENT_BROWSE_HISTORY', params: 同 reportLeave 载荷 } }] }` → sendBeacon(缓存 url)。官方自己卸载期就是 sendBeacon，同格式同端点，形态不可分。无缓存/未就绪回落现有 wl.sendImmediately 路径。
- **删 10s 定时首报**：其兜底职责由 pause 上报（官方同款检查点）+ pagehide 直发接管。
- **持久账本**（崩溃/强杀出口，本地机制零线上形态）：

```javascript
  GM key: acsvWatchLedger（emoticon.js 先例）
  每条: { [item.id:videoId]: { maxSec, reportedSec, ts } }
  启动清账：TTL 24h + 账平即清 + 容量 32
```

- `CFG.time` 新增 `watchLedgerFlush: 3000`（误差上界=落盘间隔）、`watchLedgerTtl`。
- onTime 节流 3s 更新 maxSec 落盘；reportLeave 成功处同步 reportedSec——**「成功」定义为同步无异常**：sendImmediately 是 fire-and-forget，网络层失败不可知；reportedSec 是乐观水位，下一次离开事件天然愈合。注释钉死，防将来被当 bug「修」成确认制。
- `reconcileLedger(raw, now)` 纯函数 → 补报列表（单调守卫：只补 `maxSec > reportedSec`，防 latest 语义回退——实测必需）；补报经 wl.sendImmediately 常规路径，client_timestamp 由 ts 对齐（服务器精确采信，可写准观看时间）。补报 req_id 用当期 impression，归因漂移不影响历史落库（browseTime 采信 client_timestamp），注释即可。
- **窄窗记录**：pagehide 早于首次官方 flush（<3s 关页）时回落 XHR 路径，损失一条，频率极低，接受；与「weblog 未就绪 3 秒窗口」并档入 api-research。
- **误差账**：合作出口 0（现场直报）；关页 0（beacon 同端点同信封）；崩溃/断电/强杀 ≤ 落盘间隔（3s）。这是浏览器内天花板。
- **测试**：单测 reconcile 六项（TTL/账平/key 反解/容错/容量/空）+ 信封 builder（params 字段与官方逐字段一致、increment 续号连续）；harness「pagehide → beacon 直发」（stub sendBeacon 断言信封形状）、「账本对账」（GM 预置 → reload → 断言补发+清账）。

#### 任务卡 1.4：实测入档（api-research 新增「写侧上报 CLIENT_BROWSE_HISTORY」小节，钉 2026-10-03）

- 事件驱动节奏（暂停/播完/离开，无心跳、无定时器）；
- misc2 端点与 klog 信封结构（common / event_package / element_package 字段）；
- client_timestamp 精确采信；playedSeconds latest 语义（单调守卫依据）；
- 手搓信封端到端验证记录；
- sv 源 cap.watchReport 口径另记（有通道就补，无记「未实测/不存在」）。

**0.9.87 验收**：账本对账单测组（单调守卫/TTL/账平）；信封 builder 单测；设置面板 harness 场景；实测条目入档。

---

### Phase 2 —— 0.9.88 · 关注视图（一）实测 + 骨架 + video 卡

#### 任务卡 2.1：Gating 实测（动工前置，半天）

feed/webPush 目前只有**视频条目**的字段实测。待测清单：

1. 关注的 UP 发纯文字动态 / 图文动态 / 文章，推不推？条目形状？（有没有 `moment` 对象、图片数组、还是只有链接壳）
2. `createTimeGroup`（按时间分组标题）在混合流里的稳定性——若稳定，关注视图天然是「今天/昨天」分组卡片流。
3. `followUpers[].hasUnReadResource` 字段形状（0.9.90 未读徽标的数据源，顺手实测）。

实测结果决定 0.9.89 的形态：**接口不推动态** → 动态入口改道 moment 详情链，关注视图先做视频 + 文章，文档记「未实测」。

#### 任务卡 2.2：关注视图骨架 + video 卡

- viewreg 注册 `follow` 视图；`follow.js` 解析器进 PANEL_PARSERS 表驱动（0.9.78 模式），产出带 `kind` 判别子的契约。
- video 卡：feed/webPush 视频条目是全文档字段最全的（计数、isLike/isFavorite/isThrowBanana 状态全带），复用 gridCardOf + 0.9.74 播放层直达链路。
- pcursor 时间戳分页；分组标题渲染。
- **验收**：harness 关注场景；卡片点击进播放层断言。

---

### Phase 3 —— 0.9.89 · 关注视图（二）moment 卡

#### 任务卡 3.1：ubb.js 单源化扩展

- 并入广场 `parseContent` 的 `#话题#`、ac号自动转链规则；`[emot]/[img]/[at]` 以 svfeed 现有实现为单源（广场反向跟进——两项目两套 UBB 管线是注定的漂移源）。
- 测试：新规则夹具 + 旧规则回归。

#### 任务卡 3.2：moment 卡

- 契约：`kind: 'moment'`——UP 头 + 正文（ubb 管线渲染）+ 图片宫格（1/2/4/9 布局，**全部走 imgInto**）+ 头像框覆盖层 + 赞/评/蕉三计数。
- 点击行为：原地展开详情 + 评论区，或跳 `/moment/amX`。
- **关键验证**：comments.js 的 `stype` 参数化是否完整覆盖 sourceType=4。成立 → 动态详情评论区复用现有抽屉，省半个模块；不成立 → 本 Phase 工作量 +50%，届时重估。**已闭合**（2026-10-03 前置实测成立，见 api-research §4.7——响应与视频同族、`page=` 分页有效，动态详情评论区复用现有抽屉）。

**0.9.89 验收**：emot/img 夹具；详情展开 harness 场景。

---

### Phase 4 —— 0.9.90 · 动态互动写链

#### 任务卡 4.1：写链路

- 端点形状**已实测闭环**（2026-10-03，api-research §4.7）：`interact/add|delete`（objectType=10，**svfeed 精简参数即可，无需 userId/kpf**）、`banana/throwBanana`（resourceType=10，**禁自投 170008**、Referer=moment 页）、`comment/add`（sourceType=4，响应=完整评论对象）、`comment/delete`（**新入档端点**：sourceId+sourceType+commentId，官方 UI 抓包）。广场资产吸收时注意三处差异：cursor+count 写法无效（count 被忽略，page= 才有效）、userId 非必需、其无删评端点——逐条复核别照抄（吸收不搬家）。
- 乐观更新 + 回滚模式照 `toggleCommentLike` 的既有范式。
- **出口分析（副作用通则「关页时它在哪」）**：四个写链全是幂等意图动作（赞/投蕉/发评/删评），在途请求关页即丢 = 动作未发生，用户可见状态不变、可重按——**无需持久账本**（对比：上报是进度覆盖语义才需要出口兜底）；唯一硬要求是乐观更新失败必须回滚（计数与按钮态一并回退）。

#### 任务卡 4.2：表情面板

- 广场 emotpanel（对齐原生三段式 + 最近使用 + 悬停大图）重写进 overlay 语言。入口：动态详情评论框。

#### 任务卡 4.3：未读徽标 + 轮询

- followUpers 未读徽标（数据源**已实测**：`hasUnReadResource` 布尔且假值真实存在，§2.1.1）；轮询退避 60s 起步翻倍封顶 10min（广场现成策略）。

**0.9.90 验收**：写路径单测 + 乐观更新/回滚钉牢；轮询退避单测。

---

### Phase 5 —— 0.9.91 · 评论抽屉 IP + 设备美化

#### 任务卡 5.1：抽屉 IP（简化版）

- svfeed 自己的评论抽屉渲染时手里就有 `t.userId`——**不需要 Web-IP 的 commentId→userId 拦截层**，IP 查询直接在渲染点挂。比原版简化一整层。
- 保留并吸收：串行限流队列、uid 缓存（TTL 1 天）、负缓存分级、存储防抖——这些模式原样进 util 层。
- 展示：按 Web-IP 设计（国内省/市、海外国家/地区；属地即内容物优先于港澳台表述）。展示场景：抽屉评论 + 回复提示。

#### 任务卡 5.2：设备美化

- 四级查表模块（厂商 → 系列 → 机型，中文优先，兜底原文）；`gen-device-data.js` 工具链移植（**带生成器不带表**，仓库自净）。
- 开关进设置面板（0.9.87 已备好宿主）。
- 数据许可：README 加段落——MobileModels CC BY-NC-SA 4.0，署名 + 非商业 + 相同方式共享；与 MIT 代码分声明，禁止下游当整机 MIT 再分发数据。

#### 任务卡 5.3：存储兼容

- GM key 兼容 `acr_*`（不清老用户数据）；或写一次性迁移。二选一，默认兼容。

**0.9.91 验收**：Web-IP 48 项单测等值迁移为 svfeed 风格用例。

---

### Phase 6 —— 0.9.92 · 原生页扩展 + Web-IP 收尾

#### 任务卡 6.1：原生页 IP + 设备

- v/a/member 页启用（pageKind 轻量分支在 0.9.86 已备位）。这时才 port commentId→userId 拦截层（原生页评论 DOM 里没有 userId）。
- 拦截优先级：触发式捕获（评论接口响应优先，DOM 属性兜底）——照 Web-IP 的既有方案。

#### 任务卡 6.2：原生页设置皮肤

- IP 标签点击 → **原生风格弹窗**（Web-IP 面板资产吸收，保持原生设计语言，不进 svfeed 暗色体系）。共享层同源，皮肤各自生命周期。

#### 任务卡 6.3：老仓库归档

- AcFun-Web-IP、AcFunDeviceReveal：archive + README 顶部指向 svfeed。操作前确认 issue/star 无未了事项。

**0.9.92 验收**：harness 原生页场景扩至全覆盖。

---

### Phase 7 —— （占位）高弹迁入评估

不排期、不占版本号。触发条件：高弹独立回炉完成且对照迁入标准达标（模块边界干净 / 逻辑层有测试 / UI 可剥出原生皮肤）。届时重新评估是否以本 Phase 迁入。

---

### 增补批次（v1.4 追记）—— 0.9.93–0.9.99 · 关注流纵深

0.9.93–0.9.97（关注卡面 v2/尾件沉底/详情面板/写链/未读徽标）按各自 CHANGELOG 入档，不逐条回写本文件。0.9.99 是本批次的形态级收口：

#### 任务卡 9.1：关注语境双面（0.9.99，用户裁决驱动）

- **形态**：舞台顶栏关注语境 seg「视频 | 全部」（复用源切换 seg 视觉、独立类名防 `.acsv-top--view` 误伤）；默认落在全部（与官方 /member/feeds 一致）。
- **视频侧**：数据源 `followDougaFeed`（官方视频 tab 端点，§2.1.2 实测：count 被忽略固定 10/页、终页 `pcursor='no_more'`、条目与 followFeedV2 视频条目同构）。走 **UpVideos 列表上下文通道**（空间页先例）：`followstream.js` 持 FollowVideos 上下文（feedActive/items/feedCursor + `ctx.info` 自带 home 家族 resolve）→ 深链 `svfeed/a/<acId>` 接管宿主竖刷舞台 → `feedstore.pumpListContext` 按列表泵入，`ctx.info || env.api.info` 一处分派；耗尽回落当前源随机流。**不动 playlayer**（层内无上下滑是既定事实）。
- **全部侧**：仿原生单列无限流（头像行+正文+媒体块+互动行）。无限滚动五条借鉴广场 controller.js（吸收不搬家）：append-only / 失败不置到底 / 三态状态行 / 整页 0 新增判到底 / loading 代数保护；触底提前量 300px、回顶按钮照搬阈值思路。
- **行内写链**：赞/蕉（乐观回滚 + 投蕉不可逆锁，rail 范式；文章只读——写链未实测）、评论（动态→详情面板/视频→播放层/文章→外链）、分享（imshare 面板，wire 契约「标题行\nURL」）。
- **徽标语义**：进关注语境（任一侧）即清零；`isFollowContext()` 单源（hash 前缀 ‖ 流活动）——只看 hash 会在舞台放关注视频（地址是深链形态）时误点亮。
- **验收**：单测 182；harness `view-follow` 38 断言 + 新场景 `follow-videos` 15 断言（seg 显隐/深链接管/泵序 488912/全部回路/原地续看不重置缓冲）。
- **9.1 追记八（0.9.107 三修）**：dock 推荐改显式重置（goFeedHome+sidebar 注入；Esc 保上下文对照）；转发源 rs10 多图链（契约 imgs+引用卡九宫格+详情透传，样本 5104362→5104327 在册）；未读徽标改时间水位线（followUpers 布尔清不掉实锤→followFeedV2 createTime 水位；进语境 poll 自持推进）。
- **9.1 追记七（0.9.106 架构重构）**：列表上下文收口 feedctx（createFeedContext/runChain/单活互斥注册表——UpVideos+FollowVideos 同源，双上下文互踩清零）；动态域读接口收口 momentapi（listMoments/listVideos/unreadCount，URL 逐字护 mock；评论域/写链边界登记）；imshare token 硬编码去重。单测 193。
- **9.1 追记六（0.9.105 整批整修，用户实报九项+架构三问）**：详情左区改轮播（XHS 实测）；作者名蓝链统一；UBB 吸收广场五条方言+表情尺寸作用域+pre-line+占位回填；行盒级钳高；引用卡标题两行；momentbar 共享互动栏（面板四键含分享）；分享卡 place 定位（贴行左缘/贴面板右缘+底对齐+翻转/压缩兜底）；私信×详情共存（不占槽+左移避让+z62）；回顶图标统一；dock 高亮归属修复（listContext.dockView）；无图动态官方封面修复（图像权威=imgs）。架构三问的**真债务**（双上下文互踩+上下文核心重复+请求编排散落）归 0.9.106 收。
- **9.1 追记五（0.9.104 关注语境三处实报）**：舞台态隐源 seg（与关注 seg 互斥）；蕉「已投」锁定蕉黄 #ffb323（拆色，与 rail 同源）；视频/文章行接投蕉数量层（banpop.js 自 rail 抽件共享；文章 resourceType=3 未实测标注）；动态维持单蕉。view-follow 61 / follow-videos 18 断言。
- **9.1 追记四（0.9.103 详情页小红书式改版，用户裁决）**：动态详情面板按 xiaohongshu.com 详情实测重做——两栏（左媒体 504 黑底/右栏 400 三段式）按内容型换布局（有图两栏、无图/转发单栏收窄）；互动栏留内容底部；comments 管线 titleFmt（「共 N 条评论」）；✕ 浮卡片外。detail-open 28 断言 + 两栏/单栏目检。backlog：作者行关注钮/底栏窄输入框展开。
- **9.1 追记三（0.9.102 收口，用户裁决两处口径）**：死代码/死配置清理（含「转发旗标」需求作废登记——原生无文字旗标）；共享件抽取（媒体块 dispatcher `momentMediaOf`、写链 pi 级 `likePi/throwBananaPi`、`stripOf` 下沉、`skeletonRows`、`.acsv-seg-follow` 修饰类、`CFG.api.momentBase`、`momentPiOfRepost`）；**引用卡完全照原生**（@源UP 蓝链 + 内嵌完整源内容卡）；seg 显隐收紧到关注语境（与徽标抑制判据分用途）。harness view-follow 53 / follow-videos 17 断言。
- **9.1 追记二（0.9.101 交互补课，用户真机五点实报）**：评论冒泡守卫（评论区内部点击不再冒成行默认）+ 表情面板宿主锚定（position:relative）+ 视频行也原位展开评论（stype=3）+ 图标码点采样修正（分享 E628/蕉 E62A·E65F——此前误用 E15B/E2EA）+ 列居中 + 引用块可点（视频→播放层/文章→外链/动态→详情面板）。harness 51 断言；**等待条件钉「层已建」（view+data-ovl 哨兵）防同步假绿**的教训同期入册。
- **9.1 追记（0.9.100 还原度重构，用户实报「无限画布不还原」）**：0.9.99 的行流是自创暗色卡，偏离「尽量复用原生设计」。按广场复刻法重做——内置浏览器量取原生 /member/feeds（computed style + 样式表规则，量取日入 styles 注释），结构/字号/间距/层级 1:1 对齐（扁平列表+灰带分隔、头像 50、名字 16px、60px 缩进、正文 pre-line、九宫格 342/110/299/228、横条双灰块+title 600+info 绝对定位、时长 hover 浮层、互动行 48px/42/12px）；颜色暗色换算（对照表在 styles 段头注）。交互还原：图片点大图、评论键**原位展开评论区**（comments 管线 host 化挂行内，开新关旧互斥 + teardown 清宿主）。`view-follow` 重写 42 断言。

---

## 3. 支线：独立项目处置

### 3.1 高弹项目（AcFun-Danmaku-Sender）独立回炉

**诊断**：接口层优秀（API.md 是全仓库最值钱的资产），UI 层崩盘。病灶按严重度：

1. **身份矛盾（根因）**：寄生在原生高弹面板内又隐藏其全部内容——穿原生的衣服干替换原生的事。
2. 400ms setInterval 轮询当主机制（补丁长成主循环）。
3. 巨型 innerHTML 模板 + 状态双源；字符串化 UI，ID 全局裸奔。
4. confirm() 阻塞发送确认。
5. 手调仿原生 CSS（0.9.69 已弃的老路）。

**理念三刀**：

1. **用户镜像换**：第一用户从「野生字幕君」换成 UP 主本人——给自己的视频加字幕/特效层，有权写、错了能补、挨骂是自己的创作选择。字幕组第二，野生降级为克制模式。落产品机制：**身份感知发送策略**（自己视频闸口放宽，他人视频收紧 + 「建议先与 UP 主沟通」）。
2. **核心隐喻换**：Sender → 剪辑器；发送 → 出版。三审三校、印数公开、样书留存 = 四道闸（见下）。一组高弹 = 一个作品文件（可存/改/版本化/复用），台账从清理工具升级为作品管理器。
3. **与平台关系换**：寄生对抗 → 分工共生。官方 launcher 是观众开关，我们是创作后台；官方渲染器是彩排舞台，发送管道是官方的路，我们只做护栏。

**回炉顺序**：

1. 定位先行（半天，零代码）：README + 名称从 Sender 改为「高级弹幕层编辑器」——定死它，后面技术取舍都有裁判。
2. 画布优先重构：面板从表单+发送钮翻转为「官方渲染器彩排画布（pause→seek→inject→play 干跑）+ 角落二级导出」；顺手清病灶 1/2/3/5。预览单源——默认走官方渲染器彩排（所见即观众所见），A 站渲染器预览保留为高级选项。
3. 四道闸：① 真渲染器彩排（默认流程，未发送 model 注进官方播放器过一遍）② 输出 lint（帧界/时长非零/timingFunction CSS 合法/起止不重叠，坏弹幕死在本地）③ 计数显性化 + 「能 frames 复用就不多发」原则 + 超阈值二次确认 ④ 发送台账（danmakuId 进 GM，清理视图把 2 条/分钟人肉删除变成台账点选）。
4. 身份感知发送策略（ownerId 对登录用户：自己视频宽松，他人视频收紧）。
5. 成熟后对照迁入标准决定是否进 svfeed。

**回收资产清单**：API.md 直接进 svfeed docs（渲染器机制、IsOwnDanmaku 过滤器、`__seq` 指纹、时序配方、timingFunction 约束、错误码表）；`gmPost/sendModel/sendDanmaku/verifySent` 平移；字幕解析与预设展开（纯函数）平移 + 补单测；预设表单 schema 化（90-preset-ui 的 40KB 手搓表单全灭，表单生成器统一出，开发面板同款）。

### 3.2 LocalRec-for-AcFun 归档

- archive 不删除（公共仓库删除不可逆，archive 免费且保留一切链接）。README 顶部加「已归档，计算资产逐步吸收进 acfun-svfeed」。
- 资产转移：`推荐算法参数参考.md` 进 svfeed docs（独一份）；`AcFun-API技术文档.md` 与 api-research 去重合并；`recommender.js` 算法核纯计算、只依赖存储接口——将来若做「竖刷双引擎」（官方 feed 当探索源 + 本地精排个性化层，Phase 6 之后评估）再平移。
- **scanner 扫盘不移植**（合规风险最重；feed 接口语料已更好）。

---

## 4. Intake 清单（每个合并项动工前逐条过）

- [ ] 契约层先行：数据进 `panelItem` / `PANEL_PARSERS` 式判别子契约，不接散装 DOM
- [ ] 图片唯一入口：所有 `<img>` 过 imgInto（imgurl 归一 + 重试链 + 终败降级）
- [ ] `el()` 构建 + Shadow DOM；ubb/emotify 单源
- [ ] overlay 栈管理（脚本页）；原生页皮肤自管生命周期
- [ ] 样式对齐原生靠**量取 computed style**（注明量取日期），不手调像素
- [ ] GM 存储带 TTL/负缓存语义；防抖
- [ ] 端点形状实测进 api-research（拿不准标「未实测」）
- [ ] 单测 + harness 场景覆盖新路径；lint 禁令随新坑追加
- [ ] 存储 key 规划（兼容老 key 或一次性迁移）

## 5. 测试与闸门体系

- **单测**：当前 128 项，每 Phase 增量钉新契约（纯函数优先抽纯——崩溃路径模拟不了，逻辑必须可测）
- **harness**：当前 31 场景；0.9.86 加 home/none/播放层关页；0.9.87 加 pagehide-beacon/账本对账；后续按 Phase 增加关注/详情/原生页场景
- **静态校验**：check-cases / check-release / check-deps 已在 CI；新增「settings 共享层单向依赖」规则
- **lint 禁令传统**：新坑模式即立禁（0.9.78 的 URL.split 禁令、0.9.80 的手拼 img 禁令、0.9.82 的「未知用户」字面量禁令为先例）
- **CHANGELOG** 随版本；README 依赖图同步（comments 节点游离的 mermaid 小修随手做）
- **提交纪律**：每版本 build/lint/test 全绿后直接提 main（不 push）；提交信息风格「0.9.XX：主旨——细节+测试」

## 6. 风险登记

| # | 风险 | 状态/缓解 |
| --- | --- | --- |
| R1 | feed/webPush 不推动态/文章 | 0.9.88 gating 实测；最坏情况动态入口改道，先视频+文章 |
| R2 | 官方 history 上报节奏未知（影响心跳方案） | **已闭合**（2026-10-03 实测：官方事件驱动、无心跳；方案改为触发点对齐 + 信封嗅探，原心跳案废弃） |
| R3 | comments.js stype=4 复用不成立 | **已闭合**（2026-10-03 前置实测成立，api-research §4.7；动态详情评论区复用现有抽屉，无 +50% 工作量） |
| R4 | CC BY-NC-SA 数据混布合规 | 0.9.91 前完成 README 数据许可段；数据段与 MIT 代码分声明 |
| R5 | sv 源观看无 web 上报通道 | api-research 记「未实测」，不当 bug 反复查 |
| R6 | 单文件体积过 1MB | 盯水位；死链备忘式惰性加载守住 |
| R7 | 高弹回炉后迁入评估不通过 | 不迁，保持独立；svfeed 不受影响（本就不依赖） |
| R8 | 服务端对 client_increment_id 的校验强度未知 | 缓解：信封嗅探时续号（max+1）；若观测到直发丢报，再评估与官方序列对齐 |

## 7. 明确不做（non-goals）

- **浏览器扩展形态**：MV3 的 SW 生命周期/消息契约/IDB 迁移是结构性痛苦，不做。
- **替代官方推荐权**：本地精排只作为竖刷的增强层选项（Phase 6 之后再评估），不重写首页推荐。
- **弹幕池批量工具**：任何「帮别人视频批量写入」的无闸工具不做；高弹的所有写入必须过四道闸。
- **m.acfun.cn 支持**：PC 选择器体系在移动端不生效。
- **GM outbox 重放队列**：上报语义是进度覆盖，下一次离开事件天然自愈。