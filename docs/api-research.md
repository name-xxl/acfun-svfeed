# AcFun 接口侦察笔记（竖刷扩展向）

> 目的：评估抖音式扩展功能（关注流 / 我的面板 / 相关推荐 / meta 富化等）的接口可得性，先于功能立项。
> 方法：内置浏览器（带用户登录态）真机实测为主（2026-10-02）；社区文档 [zhuweitung/acfun-api-collect](https://github.com/zhuweitung/acfun-api-collect) 的 AcFunApi.md 作参数线索，以实测结果为准。
> 验证等级：〔实测〕= 带登录态请求真实端点拿到 result 0 与数据；〔在用〕= 项目已上线；〔待打样〕= 端点存在但请求形状未定。
> 结论先行：**关注流、关注列表、观看历史、用户搜索、收藏夹读写全链路（列表/详情/加藏/改夹/建夹/删夹）、关注分组管理（建组/入组/移组/删组/组过滤）、频道榜单 rank/channel 全部实测可用**；PC 分区已无列表翻页 API（可行路线=榜单 JSON + 分区页精选块 SSR）；无未定位端点。

## 1. 通道与鉴权（项目约定，本轮全部维持）

| 通道 | 适用 | 说明 |
|---|---|---|
| www.acfun.cn 页面 fetch（postForm） | PC 同域读写 | Cookie 自动；写操作必须走此通道（风控） |
| api-new.app.acfun.cn / m.acfun.cn（GM_xmlhttpRequest） | APP 家族读 | CORS 不回显：页面 fetch 直连报 ERR_FAILED，但服务器实际 200 |
| id.app.acfun.cn/rest/web/token/get | api_st 换取 | 已在用（ensureApiSt） |

本轮坐实的坑：

- www.acfun.cn 重写 window.fetch（部分 URL 返回 null），探测代码要判空（项目已知）
- 社区文档的方法/路径与真实路由多处不符：getFollows 实为 POST+action=7；followLiveUsers 在 `live/` 段不在 `relation/`；getGroups 实为 GET（文档写 POST）。**探测 404 不代表端点不存在——先换路径段再放弃**
- 历史接口缺双 resourceTypes 之一即 result 21「参数格式错误」——报错语义误导（实为缺参）

## 2. 关注体系（全〔实测〕——抖音对比的最大缺口补齐）

### 2.1 关注流 feed/webPush

`GET https://www.acfun.cn/rest/pc-direct/feed/webPush?count=10&pcursor=0`

- pcursor=0 取首页；翻页用响应 pcursor（**毫秒时间戳**，实测 1790758800390）
- 响应：feedList[] + followUpers[] + pcursor

feedList 条目（实测首屏 10 条字段清单）：

- 身份：resourceId（=ac 号）、videoId、resourceType（2=视频）、tagResourceType
- 内容：caption（标题）、coverUrl、coverImgInfo、playDuration、channel
- 计数：viewCount / commentCount / stowCount / shareCount / bananaCount / likeCount
- 状态：isLike / isFavorite / isThrowBanana；user{userId,userName,userHead,isFollowing}（头像在 user.userHead，非 meow feed 的 headUrl）；authorId
- 链接：shareUrl / picShareUrl
- 时间：createTime / time（"34分钟前"）/ createTimeGroup（按时间分组标题）
- tag[]：**部分条目才携带**（首轮实测曾整页无 tag，本轮 10 条中有条目含）——按不可依赖处理

followUpers[]（左侧关注列表+未读徽标数据源）：hasUnReadResource / headUrl / userId / name，首屏 20 条

#### 2.1.1 Gating 补测：关注流到底推什么（0.9.91 关注视图动工前置，2026-10-03 内置浏览器登录态）

**更正（同日第二稿）**：本小节初稿下过「动态不在关注流」的结论——**错的**。错因两条：只看
`/member/feeds` 的 tab 名推断类目、只查了 `feed/webPush` 一条端点。用户当场指出「全部里有动态」，
复测证实：**关注流有动态**（`resourceType: 10`），但**不在 webPush 上，而在 `followFeedV2` 上**。
初稿结论作废，以下为修正后的实测。

**数据源（PC 关注动态页 `/member/feeds` 抓包，四处）**：

- **全部 tab** = **服务端渲染**（首屏 HTML 里直接有 `member-feed-moment` 节点，页面加载无 feed 类 XHR）
- **视频 tab** → `GET /rest/pc-direct/feed/followDougaFeed?pcursor=<毫秒>&count=20`
- **文章 tab** → `GET /rest/pc-direct/feed/followFeedV2?useWebp=true&pcursor=<毫秒>&count=20&resourceTypes=3`
- （tab 结构里只找到 全部/视频/文章 三个可点元素；直播条目在「全部」流里以类目标签出现）

**`followFeedV2` 是统一关注流端点**（本轮实测，pcursor=毫秒时间戳）：

| 请求 | 结果 |
|---|---|
| 不带 resourceTypes | 20 条 = **视频 8 + 动态 12**（混合流） |
| `resourceTypes=2` | 20 条全视频 |
| `resourceTypes=3` | 20 条全文章 |
| `resourceTypes=1` / `=4` | 空（枚举观察：视频 2 / 文章 3 / 动态 10） |

顶层还带 `pullCount / userInfo / requestId / followTags / ups / pcursor`（`ups` 本次为空数组，
语义未确认；关注列表与未读徽标仍以 webPush 的 `followUpers` 为准）。

**`feed/webPush` 与 `followFeedV2` 的实质差异**：webPush 连翻 6 页 60 条 = 59×视频 + 1×文章、
**零动态**（同一时间窗内 followFeedV2 首屏就有 12 条动态）⇒ **关注视图若要做动态，必须用
`followFeedV2`，webPush 拿不到**。这条差异是选型关键。

**动态条目形状（resourceType 10，实测样本 momentId 5104008）**：

- 顶层：`resourceId`（=动态号，**非 ac 号**）/ `resourceType: 10` / `tagResourceType: 3` /
  `authorId` / `user{userId,userName,userHead,...}` / `createTime` / `time` / `createTimeGroup` /
  `coverUrl`（配图封面）/ `shareUrl` = **`https://m.acfun.cn/communityCircle/moment/<momentId>`** /
  计数 `viewCount/commentCount/stowCount/bananaCount/shareCount/likeCount` /
  状态 `isLike/isFavorite/isThrowBanana` / `groupId`
- `discoveryResourceFeedShowContent`：**列表用正文**（携 UBB 方言，实测含 `[emot=acfun,1656/]`）
- 嵌套 `moment`：`{momentId, text(UBB 原文), replaceUbbText(**UBB 已替换为明文占位**，如 `[表情]`),
  momentType(本条 2), originResourceType(本条 1), visibleForFans, commentCount, bananaCount,
  shareCount, isThrowBanana}`——`replaceUbbText` 可直接用于列表预览
- `repostSource`：**转发动态的源条目，是完整的分支条目**（本条源是视频：带 `caption/playDuration/
  channel/user/createTimeGroup/resourceType/resourceId/...` 整族字段）⇒ 动态卡可内嵌"转发的视频/文章"卡

**文章条目形状（resourceType 3，实测样本 ac48868671）**：`articleTitle` / `beginParagraph`
（正文引导段）/ `articleBody`（正文全文开头）/ `description`（**本条为空串——摘要取 beginParagraph，
不是它**）/ `coverUrl` / `imageCount` + `articleImgInfos[]` / `articleBodyPics` /
`articleBodyImgsWithFormat` / `discoveryResourceFeedShowImageCount`；计数/状态/user/shareUrl/
时间/tag/hotComments 与视频条目**同族**（⇒ 三类条目一张卡 + `kind` 判别子即可承载）。

**`createTimeGroup` 是数字枚举，不是文案**：实测取值 {1, 2, 10}，分档边界（逐条「距今小时」实证）：
`1` = 今天（样本 2.3h/2.4h）、`2` = 昨天（16.6~26.3h，含 `time` 已成日期串的条目）、`10` = 更早
（45.4h 起）。跨页单调不跳变 ⇒ 「今天/昨天/更早」分组标题可用（枚举值是契约，文案由客户端映射）。

**`followUpers[].hasUnReadResource`（webPush 侧）**：布尔且**有假值**（19 个关注 6 true / 13 false）
⇒ 未读徽标数据源可用；条目 `{userId, name, headUrl, hasUnReadResource}`。

**直播**：站方「全部」流里有直播条目（样本：付小远brenda 直播中）；feed/webPush 与 followFeedV2
本轮样本均未出现直播条目 ⇒ 「未观察到」，关注视图按不推处理（不入契约）。

**0.9.91 形态据此定**：关注视图 = **视频 + 文章 + 动态**三类混合卡片流（`kind` 判别子），
数据源用 **`followFeedV2`**，带今天/昨天/更早分组标题；直播不做。

### 2.2 关注分组 getGroups

`GET https://www.acfun.cn/rest/pc-direct/relation/getGroups`
（用户抓包 + 实测 result 0；社区文档写 POST，实为 GET）

### 2.3 关注列表 getFollows

`POST https://www.acfun.cn/rest/pc-direct/relation/getFollows`
body：`action=7&page=1&count=20&groupId=-1`（-1=不分组；action=8 为粉丝列表）

- 翻页：pcursor 为**偏移量**（实测 "20"），与 webPush 时间戳不同源
- 实测 totalCount=91，friendList 每页 20 条
- 条目字段：userId / userName / signature / userHeadImgInfo / gender / fanCountShow / contributeCountShow / isFollowing / isFollowed / verifiedText / socialMedal 等

### 2.4 关注的主播 followLiveUsers

`POST https://www.acfun.cn/rest/pc-direct/live/followLiveUsers`
（实测本账号空列表；路径经 member 页 performance 实锤在 `live/` 段）

### 2.5 关注/取关 relation/follow〔在用〕+ 入组语义

`POST https://www.acfun.cn/rest/pc-direct/relation/follow`

- action=1 关注（可配 groupId=组id 直接入组）/ action=2 取消关注 / **action=3 给已关注用户重设分组**（toUserId+groupId+action=3，UI 文案"更改分组成功"）
- 视频/文章页关注弹窗 = **单选下拉**（选项文本"组名(成员数)"），点确定按所选 groupId 提交；弹窗内**无建组入口**，官方文案"如需添加新的分组点这里>>"跳关注列表页（站点 chunk 实锤）
- 脚本现行（interact.js setRealFollow）：toUserId + action 1/2 + **groupId 传空** → 全落"未分组"，无组选择

### 2.6 关注分组管理（2026-10-02 全生命周期真机实测，测试组已清理）

- 组列表：`GET …/relation/getGroups` → groupList[]：{groupId, groupName, followingCount, followingCountShow}（实测 7 组）
- **组 CRUD 同一端点**：`POST …/relation/group`，action 切换（关注列表页 chunk 实锤 + 真机）：
  - **action=4 建组**：`action=4&groupName=<组名>` → result 0；**响应不带新 groupId**——须拿组名回查 getGroups 差集定位（实测坑）；组名限 `^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,8}$`（**1~8 字符**，仅中英数下划线），保留名"特别关注/未分组"禁用（chunk 校验正则）
  - **action=5 删组**：`action=5&groupId=<组id>` → result 0；组内成员移至"未分组"（UI 确认文案）
  - **action=6 重命名**：`groupId=<组id>&action=6&groupName=<新名>`
- 按组过滤关注列表：getFollows **action=9** + `groupId=<组id>`（action=7 全部 / 8 粉丝的隐藏兄弟用法；实测组内 totalCount 与成员 userId 精确）
- 实测闭环链：建组×2 → 关注入组1（action=9 过滤 total=1）→ action=3 移到组2（组1 归零、组2 total=1）→ 取关 → 删组×2，各步 result 0，终态组列表复原（7 组、无残留）
- 对接现状：补全抓手 = 组下拉（getGroups）+ 建组（action=4）+ 移组（action=3）+ 组过滤（action=9）；官方弹窗不做建组，插件可自行做全

## 3. 详情与 meta 富化素材（douga/info，〔实测〕）

`GET https://api-new.app.acfun.cn/rest/app/douga/info?product=ACFUN_APP&app_version=…&dougaId=…&mkey=…`（免登录，ac48820714 实测）

- **description**：视频简介（HTML `<br/>` 换行需处理）——"简介能拿吗"的答案：能
- **tagList[]**：tagId + name——话题标签可靠数据源（feed 卡片只有标题内嵌 #话题）
- channel、danmakuCount、全量计数（like/banana/comment/view/stow/share）
- 初始状态：isLike / isFavorite / isThrowBanana / user.isFollowing
- **`user` 对象（2026-10-03 实测，dougaId=42527415 免登录拉取）**：含作者头像——
  `{ id:"25380695"（**字符串**）, name, headUrl（头像，与 meow/首页卡片同键名）,
  isFollowing, fanCount:"6337"（字符串）, contributeCount:"3275", signature,
  avatarImage, headCdnUrls[{url,freeTrafficCdn}]（多 CDN 备选）, userHeadImgInfo{…},
  avatarFramePcImg/MobileImg（头像框）}`。**头像是在这一发回包里**，与 `histories[].user`
  （§4.1）**同形状**，所以深链 ac 空间进播放层后能拿到真实头像且**无需额外请求**（0.9.82 据此
  在 appapi.resolve 回填 `item.up.img`；历史条目的同一字段在列表层就用上了，见 §4.1）
- **currentVideoInfo.playInfos**：9 档直链（2160P60→360P），与 cast playInfo **等价**（同视频同档位）→ home 源 resolve 链可省一请求（douga/info 一发同时拿详情+直链）
- 注意：videoList[].playInfos 恒空数组，直链在顶层 currentVideoInfo
- **三个时间字段（2026-10-03 实测，三个稿件交叉验证）**——**口径互不相同，别混用**：
  - 顶层 `createTimeMillis` = **站方展示的"发布时刻"**。判据：原生 UP 空间页对 ac48875146
    显示「2026/10/02」，正是该值（10-02 01:25）。**项目 0.9.85 起就用它填日期槽**。
  - 顶层 `createTime` = **展示串**，格式随稿件新旧变：旧稿 `"2023-10-2"`（不补零、非 ISO）、
    近期稿 `"24小时前"`（相对文案）。**它不是机器可读日期**——旧实现 `slice(0,10)` 当日期用，
    于是播放层/竖刷卡日期槽会冒出「24小时前」（用户实报）。
  - `videoList[0].uploadTime` = **稿件上传时刻**（顶层**没有** uploadTime 字段）；
    `currentVideoInfo.playInfos[0..8].uploadTime` 是各档转码时间（同稿毫秒级差异）。
    它与收藏接口的 `contentCreateTime`（§4.2）只差 9 秒 → **两接口互证这是"上传时刻"**。
  - 两口径的差：`createTime − uploadTime` 实测 **12 秒**（2017 老稿）/ **19.5 小时** / **5.16 天**
    （ac48875146）——即"上传后被发布/过审"的等待，随稿件而异。
  - 顶层字段清单（ac48875146 实测，44 个）：isLike、commentCountRealValue、groupId、
    bananaCountShow、stowCount(Show)、giftPeachCount(Show)、channel、description、likeCount(Show)、
    title、shareCount(Show)、belongToSpecifyArubamu、hasHotComment、isDislike、result、shareCount、
    picShareUrl、videoList、danmakuCount(Show)、isThrowBanana、viewCount(Show)、bananaCount、
    currentVideoInfo、coverCdnUrls、dougaId、isRewardSupportted、durationMillis、
    commentCountTenThousandShow、coverImgInfo、host-name、coverUrl、disableEdit、**createTime**、
    **createTimeMillis**、superUbb、shareUrl、user、status、isFavorite

## 4. 观看历史 / 收藏 / 搜索（〔实测〕）

### 4.1 观看历史

`POST https://www.acfun.cn/rest/pc-direct/browse/history/list`
body：`pageNo=1&pageSize=20&resourceTypes=1&resourceTypes=2`（1=视频 2=番剧，**两个同名参数都要带**）

- 实测 totalCount=268；histories[] 条目键（2026-10-03 登录态实测，共 29 个）：`disable /
  groupId / resourceType / videoId / resourceId / itemId / comboId / title / dougaVideoTitle /
  dougaTotalVideoCount / intro / cover / coverImgInfo / **user** / browseTime / **browseTimeGroup**
  （按日分组标题）/ playedSeconds / playedSecondsShow（"观看至03:51"）/ durationSeconds /
  durationSecondsShow / viewCount / viewCountShow / commentCount / commentCountShow /
  bangumiItemTitle / bangumiItemEpisodeName / bangumiItemCover / priority / platform`
- **`user` 对象与 `douga/info` 的 user 同形状**（同属本站 APP 家族；实测键）：
  `{ id:"25380695"（**字符串**）, name, headUrl（头像）, isFollowing, fanCount:"6337",
  contributeCount:"3275", signature, avatarFrame / avatarFramePcImg / avatarFrameMobileImg,
  headCdnUrls[{url,freeTrafficCdn}], avatarImage, userHeadImgInfo{…}, isFollowed,
  followingStatus, verifiedTypes[], gender, nameColor, action, href（= uid）… }`
  → **观看历史条目在列表层就带作者三件套**，卡片首帧即可出 `@UP名` 脚行，进播放层首帧
  即有头像与关注角标（项目 0.9.84 据此在 `PANEL_PARSERS.history` 映射 `it.up`）
- **`browseTime` = 毫秒时间戳**（2026-10-03 实测值 `1790961102971` / `typeof number`）——单条的
  **观看时间**：0.9.84 起进历史卡脚行右槽，0.9.85 起走 `data.fmtAgo`（三天内相对文案：N分钟前 /
  昨天H时MM分 / 前天H时MM分；**更早退回带年份的 `YYYY-MM-DD`**——`relTime` 的"更早"档只有
  「M月D日 H时MM分」，老内容判不出年份）。**别把 `browseTimeGroup` 当时间**——那是"按日分组
  标题"（今天/昨天），用于列表分组
- "继续观看"成立：playedSeconds 可直接 seek

### 4.2 收藏夹

- folder/list〔在用〕：POST，真实夹 id 25698647 / 73414454
- **资源列表（视频收藏）**：`POST https://www.acfun.cn/rest/pc-direct/favorite/resource/dougaList`
  body：`folderId=<夹id>&page=1&perpage=10`（站点 chunk 实锤默认 perpage=30）
  - 响应：`{result, total, perpage, page, favoriteList[]}`——**列表键是 favoriteList**，没有 list/resourceList 别名（首轮误读键名差点误判空列表）
  - 实测：默认夹 total=5（与 folder/info 的 resourceCount 一致），page=2 空列表即取尽；另一夹 total=10 正常分页
  - favoriteList 条目（22 字段）：**contentId（=ac 号）**、contentTitle / contentDesc / contentImg、userName / userId / userImg、views / comments / stows / like / likeCount / likeCountShow / isLike、duration / **userPlayedSeconds（续看秒数）**、channelInfo、contentCreateTime、updateTime、requestId / groupId / status
  - **两个时间字段都是毫秒时间戳**（2026-10-03 实测同一条：`contentCreateTime=1790429958888`
    ≈6 天前、`updateTime=1790960018142` ≈1.3 小时前，不变式 `contentCreateTime ≤ updateTime` 成立）：
    `contentCreateTime` = **稿件上传时刻**（与 douga/info 的 `videoList[0].uploadTime` **只差 9 秒**，
    两接口互证，见 §3——注意它**不是**站方页面展示的"发布时刻"，后者见 §3 的 `createTimeMillis`，
    本稿两者差 5.16 天）；`updateTime` = **这条收藏记录的最后变更时间**——续看进度 / 改夹 /
    点赞同步都可能刷新它（本条就带 `userPlayedSeconds`），**语义不纯**。项目 0.9.85 的取舍：
    收藏卡脚行右槽显示 `contentCreateTime` 的**带年份日期**，不用 `updateTime`；
    与站方页面的口径差是有意保留的（列表接口不提供发布时刻，要拿得每张卡各发一发详情请求）
- **folder/info（夹 meta）**：`POST …/favorite/folder/info`（folderId=…）→ {folderId, name, resourceCount, favoriteCountLimit, cover, status, type, lastFavoriteTime, inFolder}，**不含资源列表**
- 同族端点（站点 chunk 实锤请求形状 + 真机 result 0；本账号对应维度为空收藏故仅验证契约）：`GET /favorite/bangumiList?page=&perpage=`、`POST /favorite/articleList`、`POST /favorite/albumList`（均 page/perpage 分页，响应同构 favoriteList）
- 探测教训：`/favorite/resource/list` 不存在（404）——资源列表按内容类型拆四个端点（dougaList/articleList/bangumiList/albumList；acfunsdk source.py 同构旁证）
- 取消收藏 `/favorite/resource/remove`〔在用〕；文章维度 chunk 形如 {resourceType:9, resourceId, delFolderIds}

**收藏写侧（2026-10-02 全生命周期真机实测，测试夹已清理无残留）**：

- 弹窗夹列表（勾选态）：`POST …/favorite/folder/list` body `resourceId=<ac号>` → dataList[] 每项同夹 meta 形状并多带 **inFolder**（该视频是否已藏进此夹）——收藏弹窗勾选态数据源；不带 resourceId〔在用〕仅夹列表
- 加收藏（可多夹）：`POST …/favorite/resource/add` body `resourceId=<ac号>&resourceType=9&addFolderIds=<id,id,…>`——**resourceType 9=投稿视频**（项目现行一致），多夹逗号拼接 → result 0
- 改分组/移动：`POST …/favorite/resource/updateFolder` body `resourceId=&resourceType=9&addFolderIds=<新勾选>&delFolderIds=<取消的>`（视频页 chunk 三分支实锤 + 真机实测 A→B：A 夹 total 归零、B 夹 total=1）
- 移除收藏：`POST …/favorite/resource/remove` body `resourceId=<ac号>&resourceType=9&delFolderIds=<id,…>` → result 0
- 建夹：`POST …/favorite/folder/add` body `name=<夹名>`——名称限 `^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,40}$`（中英数下划线，**无连字符/空格**，视频页 chunk 校验正则）→ data.folderId（data 形状同 folder/info 夹 meta）
- 删夹：`POST …/favorite/folder/delete` body `folderId=<夹id>` → result 0（弹窗 chunk 未出现该端点——PC 删除入口不在收藏弹窗里；真机实测可用）
- 实测闭环链：建夹→加藏（folder/list 勾选态翻转 inFolder=true、夹内 dougaList total=1）→updateFolder 移动→移除→删夹，各步 result 0，终态夹列表复原
- 对接现状：脚本现行 add=resourceType 9 落第一个夹（appapi.js ensureFavFolder），缺口=夹选择器/建夹/移动——写侧端点已齐，可立项补全

### 4.3 用户搜索（新发现）

`GET https://www.acfun.cn/rest/pc-direct/search/user?keyword=…`

- 实测 "ac娘" → userList 30 条（含 userId/userName）
- 可接"搜 UP 主 → 看 TA 最新投稿"链路（配合 uppage / getFollows）

### 4.4 UP 信息（〔实测〕2026-10-02，榜单 UP 榜/未来 UP 面板用）

- **UP 卡批量**：`POST /rest/pc-direct/user/getUserCardList` body `ids=<uid,uid,…>`（多值逗号分隔，acfunsdk 同款）→ `{result, users[]}`：headUrl / name / id / signature / **contentCount（投稿数）** / verifiedType / verifiedTypes / followed / following / isFollowedByCurrentUser——**无粉丝数**
- **UP 粉丝数来源 = rankList 条目自带 fansCount**（§6.1，UP 榜据此展示；getUserCardList 不补）
- UP 空间页 /u/&lt;uid&gt;：新版 SPA 无 __INITIAL_STATE__，粉丝数无轻量端点（2026-10-02 探测）
- 项目在用：cfg.api.userCard（getUserCardList）

### 4.5 登录用户自身资料（0.9.69 我的页头部）〔端点实测；计数语义待核〕

- **self uid = `auth_key` cookie 前缀**（`^(\d+)`，形如 `<uid>_<hex>`）——零网络、零鉴权即可得，
  项目内自 0.9.19 起在用（imdrawer 自有会话排除）；0.9.69 上收为 `ui.selfUid()` 共享。
  未登录无该 cookie → 返回 ''（我的页据此整块不渲染资料头）。
- **资料字段直接复用 getUserCardList（§4.4）**：`POST /rest/pc-direct/user/getUserCardList`
  body `ids=<selfUid>`（同源 postForm，携带网页 Cookie）→ headUrl / name / signature /
  contentCount（投稿数）。契约投影：`data.meCardOf(j, uid)`（缺省字段一律 null，渲染层判空隐藏）。
- **⚠ 待真机核对**：`following` / `followed` 与站点口径「关注 / 粉丝」的对应关系——本次按
  `following=关注、followed=粉丝` 呈现（社区通用命名），**未在本轮真机验证**；核对方法：登录后
  打开自己的空间页 `/u/<uid>` 对比数字。口径不符时只改 `data.js meCardOf` 的映射（渲染层零分支），
  若两字段都不成立则按缺省 null 处理（头部自动只显示头像/昵称/签名/投稿数）。
- 未采用：`info.app` 侧个人资料（无轻量端点）、UP 空间页 HTML 解析（重、且为 SPA）。

### 4.6 写侧上报 CLIENT_BROWSE_HISTORY（0.9.86/0.9.87 实测，内置浏览器登录态）

**采集方式**：acfun.cn 视频页（/v/ac24325439，240s 稿）页面内包 `XMLHttpRequest/sendBeacon/`
官方 `weblog` SDK，播放全程记录（2026-10-03，登录态，账号 uid 51737407）。

- **节奏 = 纯事件驱动，无心跳**：实测暂停报一次（`playedSeconds=0`，与 `VIDEO_PAUSE`
  同批）、播完报整段（`playedSeconds=240`），中间 238 秒连续播放**零上报**。官方自己
  容忍崩溃丢数据——我们没有心跳的形态依据（0.9.87 据此把心跳从方案里删掉）。
- **官方管道与线格式**：页面 `weblog.sendImmediately('CLICK', {action, params})` → SDK
  攒批 → **`navigator.sendBeacon` POST** 到
  `https://log-sdk.ksapisrv.com/rest/wd/common/log/collect/misc2?v=3.9.21&kpn=ACFUN_WEB`
  （大批走同域 `…/collect/radar?…`，perf 域名 apilog-web.acfun.cn 是另一条管道）。
  body 是**明文 JSON**（`need_encrypt:false`）：`{ common(设备/用户/safety_id 等), logs:
  [{ client_timestamp, client_increment_id, session_id, time_zone, event_package.task_event.
  element_package: { action, params(JSON 串) } }] }`。params 与项目载荷逐字段一致
  （含 `bangumiItemId: null`），0.9.86 已对齐。
- **手搓信封端到端验证（两次）**：克隆官方 misc2 批（或最小化成 common+单条 log）改
  `client_timestamp`/`client_increment_id` 重发 → 观看历史 `browseTime` **精确等于所发
  client_timestamp（0ms 滞后）**，`playedSeconds` 相应落库。服务器**采信客户端时间戳**、
  `playedSeconds` 取 **latest**（发 100 真实把「已看完」回退成 01:40，随后报 240 恢复
  ——补报单调守卫因此是实测必需）。
- **官方卸载形态**：SDK 批量 flush 本就走 sendBeacon；队列卸载期不 flush（0.9.2 真机
  实测「pagehide 送不出去」的根因）。项目 0.9.87 关页直发=复刻官方自己的 flush 形态。
- **已知窄窗（并档）**：①pagehide 早于官方首次 flush（<3s 关页：嗅探缓存未建立，回落
  SDK 队列，卸载期可能丢一条）；②weblog 未就绪 3s 窗口（live 路径 1s×3 短重试后放弃）。
  均极低频、损失一条，接受。
- **消费侧**：`browse/history/list`（§4.1）即对账读口——实测 `browseTime` 随上报即时
  刷新，可用来做端到端验证。

## 5. 内容扩展路线定性（〔实测〕）

- **大家都在看**：无独立 JSON 接口（v 页 performance 时间线无相关请求），服务端直出进 v 页 HTML（实测 40 个 /v/ac 链接）→ 唯一路线 DOM 解析（uppage.js 同款）；window.videoInfo 内嵌 douga/info 等价数据（含 mkey）但**无**相关视频数组
- **评论 sourceType**：1 与 3 等价（同视频同评论列表），现有 sourceId 用法不受影响

## 6. 分区与榜单（首页分区扩展向，〔实测〕2026-10-02）

结论：**PC 端已没有传统的"分区视频列表翻页 API"**（旧 ajaxpipe / page 参数全死）；分区批量数据有三条路——频道榜单 JSON（最优）、分区页 SSR 精选块（一次性）、APP 家族流（推荐/图文）。

### 6.1 频道榜单 rank/channel（JSON，主推）

`GET https://www.acfun.cn/rest/pc-direct/rank/channel?channelId=0&subChannelId=&rankLimit=100&rankPeriod=DAY`

- rankPeriod：DAY / THREE_DAYS / WEEK（周榜实测可用）；**rankLimit=100 实测生效**（原生全站日榜同款 100 条；社区文档写 POST 且无 rankLimit，POST 只回默认 10 条——用 GET）
- **channelId=0 = 全站综合**（100 条混合；URL 参数 cid=-1 是页面参数不是接口参数——接口 -1 返回空）
- **subChannelId 服务端真过滤**（0.9.66 实测：channelId=1+sub=107→4 条 / 108→31 条 / 159→3 条，数量随子频道变化）
- 频道 cid 实测（与 queryNavigators 分区一致）：动画1（100）/娱乐60（31）/生活201（100）/音乐58（95）/舞蹈·偶像123（100）/游戏59（100）/科技70（97）/影视68（40）/体育69（65）/鱼塘125（22）/文章63（89 条全 contentType=3）；番剧 cid=155 仅 3 条杂项
- 响应 rankList[]：**dougaId（=ac 号）**/contentId、contentTitle、contentDesc、videoCover、duration、viewCount、bananaCount、danmuCount、commentCount、contributionCount、**fansCount/userImg/userSignature/authorId（UP 榜数据源）**、userName/userId、contentType（2=视频 3=文章）、contributeTime
  - 频道字段形状（0.9.69 真机对照修正）：子频道名在**顶层 channelName**（= `channel.name`，如「生活日常」；原生 extra 展示为 `channelName + 频道`）；`channel{id,name,parentId,parentName}` 里**是 name 不是 channelName**，parentName 为主分区（如「生活」），非展示项；另带 stowCount（视频收藏数，原生榜单卡不展示）
- 直链获取：dougaId 接现有 resolve 链（douga/info + cast）即可竖刷——榜单条目自带计数与封面，resolve 只为拿直链

### 6.1.1 子频道（0.9.66）

- **官方分区树动态取**：POST /rest/pc-direct/page/queryNavigators（无参）→ data[] 递归 children{cid,navName,link}；按 zone 名（navName）递归匹配取 children 即子频道 chips（动画实测 9 个：动画综合106/短片·手书·配音190/MAD·AMV107/MMD·3D108/虚拟偶像207/动画资讯159/COSPLAY·声优133/特摄99/次元衍生212）
- 树中无 TV动画(67)/剧场动画(180)/国产动画(120)（主导航有）——以官方树为准
- rank 页 URL 参数语义：**pcid=主频道、cid=子频道**（接口侧映射 channelId/subChannelId）

### 6.2 线上分区 id 对照表（queryNavigators，站点每页自调）

实测（POST /rest/pc-direct/page/queryNavigators，data[] 递归 children{navName,link,cid}）：
动画=1（子：动画综合106 / MAD·AMV107 / MMD·3D108 / 动画资讯159 / 短片·手书·配音190 / 国产动画120 / 剧场动画180）、娱乐=60、鬼畜=87、生活=201 与 73（新旧并存）、美食=89、音乐=58、游戏=59 与 164、科技=70、汽车=122、影视=68、鱼塘=125、文章=63、资讯=110
- acfunsdk channel_data（生活情感=73 等）是历史快照，以本表为准；新旧 id 并存时需实测哪个有内容

### 6.3 分区页精选块（SSR，一次性，无翻页）

`GET https://www.acfun.cn/v/list{cid}/index.htm` → 服务端直出区块化卡片（动画实测 71 张 /v/ac 链接）

- **旧翻页已死**：`?page=2`/`pageNo=2` 无效（p1/p2 首卡相同）；旧 ajaxpipe（`quickViewId=listwrapper&ajaxpipe=1`，acfunsdk 还在用）现返回整页 HTML
- 页面无排序 tab、滚动零请求（无限滚动不存在）；注意顶栏"最近观看"下拉也含 /v/ac 链接，DOM 解析时要排除 .header-history
- 定性：可做"分区精选"一次性首屏（uppage.js 同款 DOM 解析），不构成可持续翻页流

### 6.4 图文流 article/feed（生活/鱼塘/文章向）

`POST https://www.acfun.cn/rest/pc-direct/article/feed`
body 实测（生活分区滚动加载抓包）：`cursor=<毫秒时间戳>_<文章id>&onlyOriginal=false&limit=10&sortType=createTime&timeRange=all&realmId=50&realmId=25&…`（多 realmId 同名参数）
- cursor 游标翻页；图文分区批量获取可用（本调研以视频为主，响应字段未展开）

### 6.5 APP 侧分区接口探测（〔实测〕：有频道 tab、无开放 feed）

- **APP 首页顶栏配置可直读**：`GET https://api-new.app.acfun.cn/rest/app/configuration/navigationBar?product=ACFUN_APP&app_version=…`（免登录；实测请求头集 appVersion/acPlatform/deviceType/net/productId/udid/resolution/market/requestTime 齐全即可，**无需 UA 伪装**——桌面浏览器可直调 APP 家族接口，探测利器）
- tab 表实测：defaultTabs[] = 直播(appTabType 7) / 精选(2，label=choiceness→即 selection/feed) / 番剧(3) + **频道 tab（appTabType 5，href=分区 id）**：动画1 / 娱乐60 / 游戏59 / 生活201 / 舞蹈123 / 音乐58 / 科技70 / 体育69 / 鱼塘125 / 影视68
- **但频道 tab 的 feed 无法经 selection/feed 复现**：`tabId=channel_1` / `label=` / `appTabType=5&channelId=` / `cid=` / `channelId=` 全试——同参两次请求内容随机（推荐流噪声，无过滤迹象）；专用 `/rest/app/channel/feed` 不存在（返回非 JSON）。**定位真参数唯一路径 = 真机抓包 APP**（待打样）
- **tag/feed**：`POST /rest/app/tag/feed`（mkey 免登录）result 0——是**话题广场**卡流（tag[]：tagId / tagName / tagCover / tagResourceCount / stowCount / summary / cardTitle，pcursor 时间戳游标），非按话题取视频；tagId 过滤参数无效
- 附：selection/feed 从桌面浏览器直调需带全上述头集（缺 deviceType/udid/requestTime 组即 result 21「参数格式错误」）

### 6.6 「左栏分区/榜单」可行底座

- 榜单：rank/channel 全字段 JSON + 现有 resolve 链 → 可竖刷，最接近抖音式"榜单"
- 分区：6.3 精选块做首屏 + 榜单续刷；或左栏只做榜单
- 直播：不立项（仅开播提醒，形式待定）——直播 API 家族未探，followLiveUsers 本账号空列表无样本

## 7. 本地偏好存储真值与迁移（0.9.89 实测）

采集方式：内置浏览器（登录态）在 www.acfun.cn 读取本机 profile 的 localStorage——该 profile 此前跑过脚本的
debug 构建（`acsv-stats` 埋点键与 mount 埋点在场佐证，非本次写入），本次只读不写（复核：探测前后键清单一致）。
日期 2026-10-03。目的：0.9.89「设置层收编」（老键 → `acsv.s.<key>`）的迁移夹具用真值，不脑补形态。

**本机 profile 实际存在的键（原值原文）**：

| key | 实测值 | 形态说明 |
|---|---|---|
| `acsv-source` | `sv` | 值域 sv/home（写入点 api.setSource） |
| `acsv-sound-on` | `1` | 开=`1`、关=**空串**（playback.toggleSound 写 `''`，不是删键） |
| `acsv-upd-v1` | `{"lastCheck":1790947748603}` | 更新检查状态机；本机仅有 lastCheck，seen/notified/ignored 缺席（形态由 release.readState 钉死） |
| `acsv-stats` | `{"t":…,"stats":{…},"dbg":[…]}` | **不是偏好**：debug 构建的埋点镜像（dbg.js 周期写），不收编 |

**本机未出现（该 profile 未改过该项 → 消费点走默认）**：`acsv-dm-on`（`"1"`/`"0"`）、`acsv-codec`
（`"auto"|"avc"|"hevc"`）、`acsv-buf`（`"std"|"mid"|"max"`）、`acsv-quality`（清晰度 label）。
**标注：这四项为「未在现场观测到」**，形态来自仓库写入点（danmaku.setDmEnabled / controls 编码·缓冲菜单 /
attach.switchQuality），迁移夹具按写入点原文构造。

**清晰度 label 的真实形态（同机实测，官方播放器清晰度菜单选项文本）**：`1080P+ / 1080P / 720P / 540P / 360P / 自动`
（视频 ac24325439）。脚本存的是 app 接口 `qualityLabel`，可能带编码后缀（`…·HEVC`，session.js 实测注释）。

**无其它写入方**：本机 LS 里 `acsv` 前缀只有上表 4 键；GM 存储（观看账本 / 表情包）在管理器侧、不在 LS。

**迁移方向（0.9.89 设置层）**：`source` / `dmDefault`（自 acsv-dm-on）/ `codec` / `buf` / `quality` / `sound`
六项收编进 `acsv.s.<key>`——首读时新键缺 → 收养老键值并落新键，**老键不删**（回滚友好）。
不迁移：`acsv-upd-v1`（是状态机 seen/notified/ignored，不是设置）、`acsv-stats`（调试通道）、
`acsv_emot_recent_v1`（最近项缓存）、GM 键（账本/表情包）。

## 8. 遗留注意事项

1. feed/webPush 条目 tag[] 覆盖率不稳 → 富化一律以 douga/info 的 tagList 为准，feed 内嵌 tag 仅作加速
2. 收藏资源列表响应键是 favoriteList（无 list/resourceList 别名），normalize 时直接取；取尽判定用 page 自增后 favoriteList 空 / total 对照

## 9. 来源

- 真机实测：内置浏览器带登录态（2026-10-02，本文所有〔实测〕标注）
- 站点源码实锤：member/favourite 页 webpack chunk（GetFavoriteDougas 请求构造与同族端点 /favorite/articleList、/favorite/albumList、/favorite/bangumiList）；acfunsdk source.py 同构旁证
- 收藏弹窗完整逻辑：视频页（/v/ac…）webpack chunk——add/remove/updateFolder 三分支、folder/list 带 resourceId、folder/add 名称校验正则
- 关注分组管理逻辑：member/feeds/following 页 webpack chunk——relation/group action=4/5/6、follow action=3、getFollows action=9、组名校验正则与保留名
- 参数线索：[zhuweitung/acfun-api-collect](https://github.com/zhuweitung/acfun-api-collect) AcFunApi.md（getFollows 的 action=7 / history 双 resourceTypes / feed/webPush 路径均以其为线索、实测确认）
- 用户提供抓包：relation/getGroups（GET）
- 项目内存快照：test/feed-sample.js（meow feedList 字段）
