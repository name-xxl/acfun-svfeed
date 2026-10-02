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
- **currentVideoInfo.playInfos**：9 档直链（2160P60→360P），与 cast playInfo **等价**（同视频同档位）→ home 源 resolve 链可省一请求（douga/info 一发同时拿详情+直链）
- 注意：videoList[].playInfos 恒空数组，直链在顶层 currentVideoInfo

## 4. 观看历史 / 收藏 / 搜索（〔实测〕）

### 4.1 观看历史

`POST https://www.acfun.cn/rest/pc-direct/browse/history/list`
body：`pageNo=1&pageSize=20&resourceTypes=1&resourceTypes=2`（1=视频 2=番剧，**两个同名参数都要带**）

- 实测 totalCount=268；histories[] 字段：resourceId / videoId / title / cover / intro / user / browseTime / playedSeconds / **playedSecondsShow（"观看至03:51"）** / durationSecondsShow / viewCountShow / commentCountShow / browseTimeGroup（按日分组标题）等
- "继续观看"成立：playedSeconds 可直接 seek

### 4.2 收藏夹

- folder/list〔在用〕：POST，真实夹 id 25698647 / 73414454
- **资源列表（视频收藏）**：`POST https://www.acfun.cn/rest/pc-direct/favorite/resource/dougaList`
  body：`folderId=<夹id>&page=1&perpage=10`（站点 chunk 实锤默认 perpage=30）
  - 响应：`{result, total, perpage, page, favoriteList[]}`——**列表键是 favoriteList**，没有 list/resourceList 别名（首轮误读键名差点误判空列表）
  - 实测：默认夹 total=5（与 folder/info 的 resourceCount 一致），page=2 空列表即取尽；另一夹 total=10 正常分页
  - favoriteList 条目（22 字段）：**contentId（=ac 号）**、contentTitle / contentDesc / contentImg、userName / userId / userImg、views / comments / stows / like / likeCount / likeCountShow / isLike、duration / **userPlayedSeconds（续看秒数）**、channelInfo、contentCreateTime、updateTime、requestId / groupId / status
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
- 响应 rankList[]：**dougaId（=ac 号）**/contentId、contentTitle、contentDesc、videoCover、duration、viewCount、bananaCount、danmuCount、commentCount、contributionCount、**fansCount/userImg/userSignature/authorId（UP 榜数据源）**、userName/userId、contentType（2=视频 3=文章）、channel{channelId,channelName,parentId,parentName}、contributeTime
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

## 7. 遗留注意事项

1. feed/webPush 条目 tag[] 覆盖率不稳 → 富化一律以 douga/info 的 tagList 为准，feed 内嵌 tag 仅作加速
2. 收藏资源列表响应键是 favoriteList（无 list/resourceList 别名），normalize 时直接取；取尽判定用 page 自增后 favoriteList 空 / total 对照

## 8. 来源

- 真机实测：内置浏览器带登录态（2026-10-02，本文所有〔实测〕标注）
- 站点源码实锤：member/favourite 页 webpack chunk（GetFavoriteDougas 请求构造与同族端点 /favorite/articleList、/favorite/albumList、/favorite/bangumiList）；acfunsdk source.py 同构旁证
- 收藏弹窗完整逻辑：视频页（/v/ac…）webpack chunk——add/remove/updateFolder 三分支、folder/list 带 resourceId、folder/add 名称校验正则
- 关注分组管理逻辑：member/feeds/following 页 webpack chunk——relation/group action=4/5/6、follow action=3、getFollows action=9、组名校验正则与保留名
- 参数线索：[zhuweitung/acfun-api-collect](https://github.com/zhuweitung/acfun-api-collect) AcFunApi.md（getFollows 的 action=7 / history 双 resourceTypes / feed/webPush 路径均以其为线索、实测确认）
- 用户提供抓包：relation/getGroups（GET）
- 项目内存快照：test/feed-sample.js（meow feedList 字段）
