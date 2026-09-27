# AcFun 小视频 · PC 站竖刷页（油猴脚本）

在 **www.acfun.cn（PC 网页端）** 加入「小视频」入口，打开全屏抖音式竖滑信息流。
支持**双内容源**（竖刷页顶栏切换）：**小视频**（meow 接口，竖版短视频）与 **推荐**
（APP 首页推荐流，普通视频投稿，带弹幕/清晰度切换/收藏/投蕉），浏览与播放均**无需登录**。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展；
2. 任选其一：
   - **直接安装**：打开 [最新版 acfun-svfeed.user.js](https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed.user.js)，
     Tampermonkey 会自动弹出安装页；
   - **手动**：新建脚本，把 `acfun-svfeed.user.js` 的内容整个粘贴进去保存（或把文件拖入浏览器安装）；
3. 打开任意 `www.acfun.cn` 页面，顶部导航会出现「小视频」项；
   若站点改版导致导航没注入成功，页面右下角会出现红色「▶ AcFun 小视频」悬浮按钮作为兜底入口
   （个人主页 `/u/<uid>` 不弹——那里已注入「小视频」标签）。

## 使用

| 操作 | 效果 |
|---|---|
| 点击导航「小视频」/ 右下角悬浮按钮 | 打开竖刷页（地址变为 `www.acfun.cn/#svfeed`，可直接收藏） |
| 切换视频时 | 地址栏自动变为 `#svfeed/<meowId>`（不产生历史记录）；刷新或直接打开带 id 的链接可回到同一条视频 |
| 鼠标滚轮 / ↑↓ / PgUp PgDn / J K / 右下角箭头 | 上一个 / 下一个视频（滚动吸附） |
| ← / →（短按） | 快退 / 快进 5 秒 |
| →（长按） | 2 倍速快进，松手恢复原速 |
| 点击画面 | 第一次点击开启声音，之后为播放/暂停 |
| 空格 | 播放 / 暂停 |
| M / 控制栏喇叭 | 静音切换 |
| F / 控制栏全屏按钮 | 全屏切换 |
| Esc / 右上角 ✕ | 退出竖刷页，回到正常站点 |
| 悬停画面底部 | 浮出播放控制栏：可拖动进度条（带时间气泡）、播放/暂停、时间、连播、倍速、静音、全屏；鼠标静止 2.5 秒自动淡出 |
| 连播开关 | 开：播完自动下一条；关（默认）：单条循环 |
| 倍速按钮 | 0.5x → 1.0x → 1.5x → 2.0x 循环切换 |
| 评论按钮 / C 键 | 展开右侧评论抽屉：真实评论列表（头像、UP 徽章、嵌套回复、**评论点赞**），头像和昵称可点击进入用户主页；切视频自动刷新，分页加载更多；Esc 先关抽屉再退出。**展开时视频区整体等比缩放到剩余空间**（抖音式，不裁画面） |
| 右侧红心 | **真实点赞**：登录 A 站后直接生效（自动换取 api_st 令牌调互动接口）；未登录回退本地状态并提示 |
| 头像角标 +/✓ | **真实关注 / 取消关注** UP 主（需登录） |
| 分享 | 复制该视频分享链接 |

### 推荐模式（顶栏「小视频 | 推荐」切换，选择记忆）

数据来自 APP 首页推荐流（免登录），内容为普通视频投稿，交互对齐 APP：

| 操作 | 效果 |
|---|---|
| 顶栏「推荐」 | 切到 APP 首页推荐流（立即重置数据流；logo 文案随源变化） |
| 右侧栏 | 点赞 / 评论 / **投蕉**（弹数量层：默认全灰，悬停第 N 根时 1~N 一起点亮，点第 N 根投 N；**投过即锁定变色**，状态由 `douga/info` 的 `isThrowBanana` 回填，A 站投蕉不可取消）/ 分享，图标取自视频页原生资源（加载失败回退内置 SVG） |
| 控制栏「弹」 | 弹幕开关（记忆状态）；Canvas 渲染，滚动/顶部/底部弹幕 + 轨道防重叠，暂停/seek/倍速自动正确 |
| 控制栏「发弹」 | 抖音式内嵌输入框横向展开（点外部/Esc 收起），发送到当前进度（网页 Cookie 鉴权需登录），成功后本地即时回显 |
| 控制栏清晰度 | 360P~1080P60 多档（m3u8 + hls.js 懒加载），切换保留播放进度，档位记忆 |
| 控制栏评论 | 评论入口（sourceType=3，普通视频），评论条目可点赞 |
| 播放直链链路 | ac号 → `douga/info` 拿 videoId → `playInfo/cast` 拿全档直链（http 强制转 https） |

界面设计借鉴快手网页版（new-reco）：封面模糊延伸的氛围背景、扁平白色图标操作栏、右下角切换箭头、悬停播放控制栏。

## UP 主空间页的小视频标签

在 `www.acfun.cn/u/<uid>` 空间页的内容标签栏（视频/文章/合辑）末尾自动加一个「小视频」标签
（PC 端空间本来不展示小视频），浏览体验对齐视频投稿标签：

- **自动加载全部**：后台按游标链顺序拉取该 UP 的全部小视频（每页 10 个、间隔 150ms 防压），左上角实时显示"已加载 N / 总数"；
- **页码分页浏览**：底部页码条（窗口式页码 + 省略号），未加载到zhi的页码置灰，后台加载到即自动点亮；
- **最新 / 最热筛选**（右上角下拉，样式仿站点排序）：最新=接口顺序（时间倒序）；最热=逐个拉取
  meow/info 统计点赞数后重排（渐进完成，进度实时显示，切回最新恢复原序）；
- 点击封面直接以竖刷模式打开该视频（`#svfeed/<meowId>`），**后续按主页列表顺序**依次播放
  （空间页后台继续加载，列表追完后回落随机推荐流），Esc 退回空间页。

数据抓自 m 站 upPage 的 pagelet 接口（`userId&type=6&pcursor=<时间戳>`，返回 BigPipe HTML），
**必须在 Tampermonkey 下运行**（依赖 GM_xmlhttpRequest 跨域，浏览器直连会被 CORS 拦截）。
注意：接口本身不支持排序参数（实测 sort/order 均被忽略），最热排序为客户端统计实现。

## 说明与限制

- 接口：`POST https://m.acfun.cn/rest/mobile-direct/meow/feedList`（信息流）、
  `POST .../meow/info?meowId=<id>`（单视频详情，用于直链过期后刷新）、
  `GET https://www.acfun.cn/rest/pc-direct/comment/list?sourceId=<meowId>&sourceType=5`（评论列表，
  小视频在通用评论系统里的 sourceType 是 5，免登录；评论头像 headUrl 是 `[{cdn,url}]` 数组）。
  优先走 `GM_xmlhttpRequest`，未授权时回退 `fetch`。
- 操作栏点赞/评论/分享图标取自 AcFun 小视频页面自带资源（ali-imgs CDN 的 PNG，90×90@2x），
  加载失败自动回退到内置 SVG；已点赞的红色态用 CSS filter 对 PNG 染色实现。
- feedList 是随机推荐池（无翻页 cursor，m 站"下一条"也是同一接口、每批 5 条），脚本内按 `meowId`
  去重后拼接成无限流；刷新页面时若地址带 `#svfeed/<meowId>` 则先加载该条，否则重新随机。
- 视频直链带签名（约 7 天有效），播放失败时自动换备用 CDN → 刷新详情 → 手动重试。
- 每个小视频只有**单一档位**的直链（播放接口不提供清晰度切换）：清晰度取决于该视频上传时平台转出的源文件，
  新一些的视频多为 720p（横屏 1280×720 / 竖屏 720×1280），2018 年前后的老投稿常见 720×480。
  已实测 `meow/info` 与 `feedList` 对同一 ID 返回完全一致的 playInfo，无隐藏的高清参数；
  App 端 `api-new.app.acfun.cn/rest/app/meow/info` 需登录 api_st（未登录返回 result 105001）。
- 真实互动接口（需登录 www.acfun.cn）：
  点赞 = `POST id.app.acfun.cn/rest/web/token/get`（sid=acfun.midground.api，带 cookie）换 api_st →
  `POST api.kuaishouzt.com/rest/zt/interact/add|delete`（objectId=<meowId>&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP，成功返回 result=1）；
  关注 = `POST www.acfun.cn/rest/pc-direct/relation/follow`（toUserId&action=1/2，成功 result=0）。
  两接口 CORS 均放行 www.acfun.cn，页内 fetch 带 cookie 即可。

### 推荐模式接口（api-new.app.acfun.cn，与 acfunchina.com 同后端互通）

- 首页流：`POST /rest/app/selection/feed?product=ACFUN_APP&app_version=6.31.1.1026&appMode=0`，
  body `mkey=<固定token>&pcursor=<游标>&count=10`；**必须带 APP 请求头**
  （acPlatform=ANDROID_PHONE、appVersion、productId=2000、udid、requestTime 等，UA 用
  `acvideo core/...` 设备格式），缺了报 result 21；selection/feed 必须带 appVersion 头，
  douga/playInfo 不带。mkey 是客户端硬编码 token，免登录免签名。
- 详情：`GET /rest/app/douga/info?dougaId=<ac号>&mkey=` → `videoList[].id` 即 videoId，
  附 channel（发弹幕的 subChannelId/Name 取 channel.parentId/parentName）、全套计数、
  isLike/isFavorite 初始状态。
- 播放：`GET /rest/app/play/playInfo/cast?videoId=&resourceId=<ac号>&resourceType=2&mkey=` →
  streams[] 按清晰度降序（1080P60…360P，各 2 个 CDN），playUrls 为 http m3u8，
  前缀直接换 https 可用（实测 200）；Chromium 需 hls.js（GM_xhr 拉 jsdelivr 后 Function 执行，
  不吃页面 CSP），Safari 走原生 HLS。
- 弹幕：全量 `POST www.acfun.cn/rest/pc-direct/new-danmaku/list`
  （resourceId=<videoId>&resourceType=9&pcursor=1&count=200，网页 Cookie，pcursor 翻页）；
  发送 `POST www.acfun.cn/rest/pc-direct/new-danmaku/add`
  （body/color/mode=1/position=<ms>/id=<ac号>/videoId/subChannelId/subChannelName/type=douga）。
- 收藏/投蕉/评论点赞：`POST /rest/app/favorite`（resourceId&resourceType=2）、
  `/rest/app/unFavorite`（resourceIds=…）、`/rest/app/banana/throwBanana`（count 1~5）、
  `/rest/app/comment/like|unlike`——.acfun.cn 域 Cookie（GM_xhr 自动携带）+
  `acfun.midground.api_st` 双保险；**写接口的登录态有效性需在 Tampermonkey 下实测**。
- 弹幕 mode：1=滚动、4=底部、5=顶部；颜色为十进制 int（16777215=白色），position 为毫秒。

## 更新日志

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

## 开发

源码按模块拆在 `src/`（ES 模块），构建打包成单文件油猴脚本：

```
npm install          # 安装 esbuild（仅开发依赖）
npm run build        # 产出 acfun-svfeed.user.js + acfun-svfeed.debug.user.js
npm run watch        # 监听 src/ 变更自动重建
```

| 模块 | 职责 |
|---|---|
| `cfg.js` | 常量表（接口地址、APP 请求头/固定 mkey、timings、导航标签） |
| `net.js` | `request(url, method, headers, body)`：GM_xmlhttpRequest 优先、XHR 回退 |
| `data.js` | 双 normalize：meow（kind=sv）与 selection 卡片（kind=home）→ 同一字段契约 |
| `api.js` | 接口封装 + 内容源状态（getSource/setSource）+ feed/refresh 按源分发（mock 桩收口在这） |
| `appapi.js` | APP 家族接口层：selection feed（游标）、douga/playInfo 懒解析、收藏/投蕉/评论点赞、弹幕 list/add、api_st 令牌 |
| `feedstore.js` | 信息流数据仓库（游标泵，空间页列表上下文按序泵入；home 条目允许空 urls 懒解析） |
| `route.js` | `#svfeed[/<meowId>]` 路由解析与地址栏同步 |
| `state.js` | `root`/`scroller`/`commentDrawer` 跨模块 UI 单例（player 赋值，他人只读） |
| `styles.js` / `ui.js` | CSS、图标；`el`/`esc`/`fmt`/`toast`/剪贴板/样式注入等工具 |
| `interact.js` | 真实点赞/关注（api_st → interact 接口）；收藏/投蕉转发 AppAPI |
| `comments.js` | 评论抽屉（sourceType 按 item.stype 分发 5/3、UBB 渲染、楼中楼、分页、评论点赞） |
| `hls.js` | hls.js 懒加载（GM_xhr 拉文本 + Function 执行，Safari 原生 HLS 探测） |
| `dmcanvas.js` | Canvas 弹幕渲染层（无状态重绘：每帧按 video.currentTime 反推位置；滚动轨道分配；DPR 对齐） |
| `danmaku.js` | 弹幕编排：列表拉取/缓存、开关记忆、绑定/解绑 slide、发送输入条 |
| `player.js` | 播放器：slide 构建、控制栏（双形态）、懒解析挂载、清晰度切换、顶栏源切换、键盘、挂载/卸载 |
| `nav.js` / `uppage.js` | 导航入口注入；UP 主空间页小视频标签 |
| `boot.js` | 启动入口（构建 entry） |

`acfun-svfeed.debug.user.js` 与正式版出自同一源码，仅 `__ACSV_DEBUG__` 注入值不同：
调试版在 `window.__dbg` 记录启动埋点（iife-start / cfg-ok / mount-enter / root-appended / toggle），
正式构建中被死码消除，运行行为一致。改动只在 `src/` 里做，不要手改两个 `.user.js`（构建产物）。

## 本地开发预览

```
npm run build
node -e "…任意静态服务器…"   # 或 npx serve
# 打开 http://127.0.0.1:8137/test/harness.html
```

`test/harness.html` 使用 `test/feed-sample.js`（真实 meow 快照）与 `test/home-sample.js`
（真实 selection/feed 卡片快照 + 本地测试视频）做 mock，可以在不装 Tampermonkey 的情况下调试
界面与交互逻辑；加 `?src=home` 直接进入推荐模式。
注意 harness 的 mock 分支会绕过真实接口 URL 拼接，接口地址类 bug 在本地预览里测不出来。
