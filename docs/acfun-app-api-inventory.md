# AcFun Android App 端点全量清单

> 来源：jadx-1.5.6 反编译 AcFun App（2026-10 提取），Retrofit `@GET`/`@POST` 注解全量去重
> 域名约定：`/rest/app/*` → `api-new.app.acfun.cn`；`/rest/zt/*` → `api.kuaishouzt.com`（快手中台）；`/rest/n/*` → 直播推流网关
> 形态约定：POST 均为 `application/x-www-form-urlencoded`（@FormUrlEncoded），GET 为 query 参数
> **标注口径（2026-10-05 修订）**：svfeed 消费端实际横跨四域——`api-new.app.acfun.cn/rest/app/*`（本清单主体）、
> `www.acfun.cn/rest/pc-direct/*`（web 端）、`m.acfun.cn/rest/mobile-direct/*`（m 站）、`id.app.acfun.cn`（令牌/图床）。
> 同名端点跨域参数方言可能不同：pc-direct/mobile-direct 的实测结论**不**自动适用于本清单的 APP 域端点；
> 「svfeed 在用」凡未注明 APP 域者均指 web/m 站变体。实测结论唯一真源 = `api-research.md`。

## 一、内容流 / 动态

| 端点 | 方法 | 说明 |
|---|---|---|
| /rest/app/feed/feedSquareV3 | GET | 动态广场 V3（**§2.8 实测**：count 生效、单段时间戳游标、不认 t:t 冒号方言；svfeed 在用 V1=feedSquare 同域 §2.7） |
| /rest/app/selection/feed | GET | 首页精选 feed（**svfeed 在用 APP 域**；频道 tab 复现不可行见 api-research §6.5） |
| /rest/app/feed/followFeedV2 | GET | 关注流·全类型（svfeed §2.1 实测的是 **pc-direct 变体**，APP 域未测） |
| /rest/app/feed/followDougaFeed | GET | 关注流·视频 tab（svfeed §2.1.2 实测的是 **pc-direct 变体**，APP 域未测） |
| /rest/app/feed/profile | GET | 个人主页动态 |
| /rest/app/feed/related/general | POST | 相关推荐（看完推荐）★ |
| /rest/app/feed/favorite/bangumi | GET | 追番列表 feed |
| /rest/app/feed/hot/bangumi | GET | 热门番剧 feed |
| /rest/app/meow/feedList | POST | 小视频信息流（svfeed 在用 **m 站 mobile-direct GET 变体** cfg.js:28，APP 域未测） |
| /rest/app/meow/momentList | POST | 小视频关联动态 |
| /rest/app/meow/slideList | POST | 小视频滑动列表（竖刷候选）★ |
| /rest/app/speedTheater | POST | 快剧场（短视频剧场） |
| /rest/app/discovery/feed/resources | POST | 发现页资源流 |
| /rest/app/discovery/feed/tags | POST | 发现页标签流 |
| /rest/app/discovery/feed/tag/category/resources | POST | 发现页标签分类流 |
| /rest/app/tag/feed | GET | 话题动态流 |
| /rest/app/tag/getResourceFeed | GET | 话题资源流 |
| /rest/app/user/official/followFeed | POST | 官方号关注流 |
| /rest/app/moment/checkPermission | GET | 发动态权限检查 |
| /rest/app/moment/detail | GET | 动态详情（svfeed 在用的是 **pc-direct 变体**，APP 域未测） |
| /rest/app/moment/add /delete | POST | 发布/删除动态 |

## 二、搜索家族

（svfeed 0.9.151 搜索 2.0 在用的三端点是 **pc-direct 变体** `/rest/pc-direct/search/{video,user,article}`，api-research §4.10；本节 APP 域端点未测）

| 端点 | 方法 | 说明 |
|---|---|---|
| /rest/app/search/video | GET | 全站视频搜索（Y2 七参数版） |
| /rest/app/search/article | GET | 全站文章搜索 |
| /rest/app/search/user | GET | 搜用户 |
| /rest/app/search/bgm | GET | 搜番剧 |
| /rest/app/search/album | GET | 搜合辑 |
| /rest/app/search/tag | GET | 搜话题 |
| /rest/app/search/complex | GET | 综合搜索 |
| /rest/app/search/suggest | GET | 输入联想 |
| /rest/app/search/recommend /recommend/resource | GET | 搜索页推荐占位 |
| /rest/app/search/log | POST | 搜索埋点 |
| /rest/app/articleChannel/search | GET | ★ 文章区频道内搜索 |
| /rest/app/channel/resource/query/match | POST | ★ 频道内资源搜索 |
| /rest/app/user/searchInFollow | GET | ★ 关注列表内搜索 |
| /rest/app/user/resource/queryMatch | POST | UP主空间内搜索/用户资源检索（**§4.11 实测**：免登录、resourceType 2=视频 3=文章、页码游标、空 keyword=全量列举） |

## 三、UP主空间 / 用户

| 端点 | 方法 | 说明 |
|---|---|---|
| /rest/app/user/resource/query?count=20 | POST | ★ 空间资源列表（视频/文章） |
| /rest/app/user/resource/query/slideList | POST | ★ 空间资源竖刷列表 |
| /rest/app/user/userInfo /personalInfo /liveUserInfo | GET | 用户信息 |
| /rest/app/user/getUserCardList | POST | 用户卡片批量（svfeed 在用 **pc-direct 变体**） |
| /rest/app/user/resource/likeList /showLikeList | POST | 公开点赞列表 |
| /rest/app/user/related/category /uperFeed | POST | 空间相关分类推荐 |
| /rest/app/user/topResource /cancelTopResource | POST | 置顶稿件 |
| /rest/app/user/block/* | GET/POST | 黑名单 |
| /rest/app/user/stowTag /batchStowTag /unStowTag /getStowTagList | POST/GET | 收藏标签体系 |
| /rest/app/user/getSignInInfos /hasSignedIn /signIn | GET/POST | 签到 |
| /rest/app/user/rename /alterProfile /updateSignature /updateHeadUrl /updateSpaceImageUrl | POST | 资料修改 |
| /rest/app/user/meowFeed | POST | 用户小视频 feed |
| /rest/app/user/sameCityConfig | POST | 同城配置 |
| /rest/app/user/updateAlmanacFortune | POST | 老黄历运势（娱乐向） |
| /rest/app/relation/getFollows /isFollowing /follow /followBatch /group /getGroups /getAllFollowingsWithGroupsInfo /getSpecifyUserGroupId | GET/POST | 关注关系与分组 |

## 四、播放 / 弹幕

| 端点 | 方法 | 说明 |
|---|---|---|
| /rest/app/play/playInfo/mp4 /m3u8V2 | GET | 播放直链（未测；svfeed resolve 链核心实为下行 cast，勿混淆） |
| /rest/app/play/playInfo/cast | GET | 投屏/直链地址（**svfeed resolve 链核心，APP 域在用**，appapi.playInfo 走其 streams/videoUrls） |
| /rest/app/play/playInfo/maskVtt | POST | 掩码 VTT |
| /rest/app/play/playInfo/spriteVtt | POST | ★ 进度条预览雪碧图 |
| /rest/app/play/playInfo/anchorPoint | POST | 看点标记 |
| /rest/app/play/playInfo/videoDownloadInfos | POST | 下载档位信息 |
| /rest/app/douga/info /baseInfos | GET | 稿件信息/批量（**svfeed 在用 APP 域**，api-research §3） |
| /rest/app/new-danmaku/list | POST | 弹幕全量（svfeed 在用 **pc-direct 变体** /rest/pc-direct/new-danmaku/list） |
| /rest/app/new-danmaku/poll /pollByPosition | POST | ★ 弹幕增量轮询 |
| /rest/app/new-danmaku/preload | POST | 弹幕预载 |
| /rest/app/new-danmaku/add /deleteDanmaku /report | POST | 弹幕发布/删除/举报 |
| /rest/app/new-danmaku/like /cancel /updateRank /batchUpdateRank | POST | 弹幕点赞 |
| /rest/app/new-danmaku/blockWords/* forbiddenWords/* | POST | 屏蔽词/禁词 |
| /rest/app/new-danmaku/styleDanmaku/list | POST | 样式弹幕 |
| /rest/app/new-danmaku/getAdvancedAvailable /setAdvancedAvailable | POST | 高级弹幕权限 |
| /rest/app/danmaku/report | POST | 弹幕举报（旧版） |

## 五、评论

| 端点 | 说明 |
|---|---|
| /rest/app/comment/list /sublist /listByFloor /listPivot /subCommentSession | 评论各种维度拉取（svfeed 在用 list/sublist，**pc-direct 变体**） |
| /rest/app/comment/add /delete | 发布/删除 |
| /rest/app/comment/like /unlike | 点赞 |
| /rest/app/comment/addStickyComment /cancelStickyComment | 置顶评论（UP主权限） |

## 六、互动 / 收藏 / 投蕉

| 端点 | 说明 |
|---|---|
| /rest/app/banana/throwBanana | 投蕉（svfeed 在用 **pc-direct 变体**） |
| /rest/app/like/infos | 点赞状态批量 |
| /rest/app/multiInteraction /multiInteractionToBangumi | 一键三连类复合互动 |
| /rest/app/favorite /unFavorite /isFavorite | 收藏切换 |
| /rest/app/favorite/dougaList /articleList /albumList /bangumiList | 各类型收藏列表 |
| /rest/app/favorite/folder/add /delete /update /info /list | 收藏夹 CRUD |
| /rest/app/favorite/resource/add /remove /move /copy /delete /updateFolder /dougaList | 收藏项管理 |

## 七、文章 / 投稿 / 频道 / 排行

| 端点 | 说明 |
|---|---|
| /rest/app/article/info /editInfo /contribute /update /delete | 文章读写 |
| /rest/app/articleChannel/home /recoNew | 文章区首页/推荐 |
| /rest/app/contribute/checkPermission /createVideo /createDouga /deleteDouga /getCoverEditMaterial /getOriginalStatement | 视频投稿 |
| /rest/app/manage/getDougaList /getVideoList /searchDanmaku | 稿件管理（含弹幕搜索！） |
| /rest/app/channel/allChannels /secondLevel/pageModules /secondLevel/resourceList | 频道体系 |
| /rest/app/rank/hot /banana /channel /condition /getChannelList /youngStar | 排行榜 |
| /rest/app/new-bangumi/detail /list /itemList /schedule /detail/center/banner /index | 番剧 |
| /rest/app/new-bangumi/pay/afford /valuation /video /videoList | 番剧付费 |

## 八、合辑（アルバム arubamu）

| 端点 | 说明 |
|---|---|
| /rest/app/arubamu/getById /getByUid?size=20 /my/list /getMyArubamuById | 合辑查询 |
| /rest/app/arubamu/content/list | 合辑内容 |
| /rest/app/arubamu/add /modify /delete | 合辑 CRUD |
| /rest/app/arubamu/content/add /delete /sort | 合辑内容管理 |

## 九、直播（快手中台 rest/zt）

| 端点 | 说明 |
|---|---|
| /rest/zt/live/startPlay /stopPlay /getPlayUrls | 直播观看（svfeed 未用；real-url 项目领域） |
| /rest/zt/live/playBack/startPlay | 直播回放 |
| /rest/zt/live/biz/heartbeat/byAuthor /byUser | 心跳 |
| /rest/zt/live/gift/list /all /send /sendDraw | 礼物 |
| /rest/zt/live/redpack/getToken /grab /getLuckList | 红包 |
| /rest/zt/live/billboard | 榜单 |
| /rest/zt/live/watchingList | 在看列表 |
| /rest/zt/live/authorChat/* /chat/* | 连麦 |
| /rest/zt/live/paidShow/info /pay /queryOrder | 付费直播 |
| /rest/zt/live/author/action/kick /manager/* | 房管操作 |
| /rest/zt/live/startPush /stopPush /changePushContent | 主播推流 |
| /rest/zt/interact/add /delete /changeInteractType | 互动（svfeed 在用） |
| /rest/zt/live/audience/action/comment /like /shareLive | 直播间互动 |

## 十、直播推流（rest/n 游戏直播）

| 端点 | 说明 |
|---|---|
| /rest/n/live/game/startPush /getPushUrl /prePush /stopPush /changeProvider /checkResolution /startPushOrigin | 第三方推流（OBS 等） |

## 十一、私信 / 通知

| 端点 | 说明 |
|---|---|
| /rest/app/notify/load /clear | 通知列表（svfeed 未用——IM 走 ImSdk 长连接，通知无消费方） |
| /rest/app/notify/getMessageConfig /updateMessageDisplayConfig /updateMessageNotifyConfig | 通知配置 |
| /rest/app/notify/getFollowedReplyPrivateMessageConfig /updateFollowedReplyPrivateMessageConfig | 被回复/私信开关 |
| /rest/app/notify/contentAppeal | 内容申诉 |

（注：私信收发本体走 ImSdk 长连接，不在 REST 清单内——符合 svfeed 既有结论）

## 十二、账号 / 登录

| 端点 | 说明 |
|---|---|
| /rest/app/visitor/login | 游客登录（svfeed 未用；real-url 或有） |
| /rest/app/login/signin /mobileCode /sms/send /sns/accessToken /sns/code /mobileQuickForThreeOperator | 登录各通道 |
| /rest/app/login/logout /captcha | 登出/验证码 |
| /rest/app/token/get | 中台令牌（互动/图床前置；svfeed 在用，**host=id.app.acfun.cn**，imsend 换令牌链） |
| /rest/app/qr/scan /accept /cancel | 扫码登录 |
| /rest/app/phone/bind /rebind/new /rebind/origin | 手机绑定 |
| /rest/app/pwd/setup /modify /reset | 密码 |

## 十三、上传 / 图床

| 端点 | 说明 |
|---|---|
| /rest/app/image/upload/getToken /getUrlAfterUpload | 图片上传令牌（私信发图图床） |
| /rest/app/upload/ali/getToken /refreshToken /uploadFinish | 阿里云上传 |
| /rest/app/upload/ksCloud/prepareUpload /uploadFinish | 快手云上传 |
| api/upload/apply_image_upload /apply_video_upload /fragment /complete /publish_image /publish_video | 投稿上传（相对路径，另一网关） |

## 十四、支付 / 钱包 / 任务 / 粉丝团 / 活动

| 端点 | 说明 |
|---|---|
| pay/trade/prepay/{provider}/{type} /config /gateway/app/cashier/trade/* | 支付 |
| /rest/app/pay/wallet/balance /reward/resource /reward/resource/cardInfo | 钱包/打赏 |
| /rest/app/pay/deposit/products /prepay /receiveGift /giftsShow | 充值/礼物 |
| /rest/app/pay/coupon/* | 优惠券 |
| /rest/app/task/taskPanel /taskCompletionStatus /reportTaskAction /receiveTaskAward /receiveNewbieTaskAward /receiveLimitedTaskAward | 任务中心 |
| /rest/app/fansClub/fans/medal/* /live/medalInfo /friendshipDegreeRankInfo /user/info | 粉丝团/勋章 |
| /rest/app/live/timeBox/list /draw | 时光宝盒 |
| /rest/app/activity/invitation/* | 邀请活动 |

## 十五、直播元数据（rest/app/live 域）

| 端点 | 说明 |
|---|---|
| /rest/app/live/info /channel /channelFilters /liveTabList /liveSliding /operationInfo /throwBanana | 直播间信息/频道 |
| /rest/app/live/schedule/list /info /reserve | 直播预约 |
| /rest/app/live/type/list | 直播分类 |

## 十六、系统 / 配置 / 埋点 / 反馈

| 端点 | 说明 |
|---|---|
| /rest/app/system/startup /applist | 启动上报/应用列表 |
| /rest/app/abTest/config | AB 实验配置 |
| /rest/app/configuration/navigationBar | 首页导航配置 |
| /rest/app/log/action /rest/log/common/collect /rest/log/sdk/file/* | 埋点 |
| /rest/app/exposures/spam | 曝光上报 |
| /rest/app/feedback/* /fb/feedback/submit.aspx | 反馈 |
| /rest/app/report/playContent /relatedShow | 播放上报 |
| /rest/app/question/list /check /answer | 社区答题 |
| /rest/app/teenage/mode/open /close | 青少年模式 |
| /rest/app/safetyid /rest/infra/id/card/user/verify/status/get | 实名状态 |
| /rest/zt/appsupport/configs /hybrid/biz/checkupdate /hybrid/pkg/checkupdate | 热更新配置 |
| /rest/zt/freeTraffic/* | 免流（王卡等） |
| /rest/app/clock/r | 服务器时间 |
| /v2/offlines/checkOffline | 离线检查 |
| /v3/regions/recommendUp?pageSize=20 | 地区推荐 UP |
| /rest/app/resourceSlot /resource/type /getTagList /recommendTagList /getHistoryAndRecommendTagList /activityTagList | 资源元数据/标签 |
| /rest/app/tag/getCategoryList /getHotTagForMoment /getRecommendList /getUserHistoryTag /checkExist /suggest | 话题标签 |
| /rest/app/emotion/getUserEmotion | 表情 |
| /rest/app/staff/getStaff | 合作人员 |
| /rest/app/vote/addCommonVote /getVoteInfo /vote | 投票 |
| /rest/app/waitingList /addWaiting /cancelWaiting | 稍后再看 |
| /rest/app/browse/history/list /delete /deleteAll | 浏览历史 |
| /rest/app/flash/screen/list | 闪屏 |
| /rest/app/pop/home /acDailyMagazine /shareGuide/* | 弹窗/每日杂志/分享引导 |
| /rest/app/arubamu 见第八节；/rest/csc/center/url/get 客服 |
| /rest/inner/createUser /login/signin | 内部接口 |
| /openapi/video/live/fallback/startPush | 开放推流回调 |
| /rest/app/multiInteraction 见第六节 |
| /api/mock/longConn/open/startService | 长连接服务启动（IM 相关） |

---

## 优先级实测清单（★）（2026-10-05 按项目路线重排）

1. `feed/related/general` — 相关推荐（api-research §5「大家都在看无独立 JSON、唯一路线 DOM 解析」的潜在翻案，一发实测定生死）
2. `user/resource/query`（+ `/query/slideList` 空间竖刷候选）— 空间资源列表（UP 空间 JSON 化、解放 uppage.js DOM 解析；与已实测 §4.11 queryMatch 互补——queryMatch 空 keyword 已能全量列举）
3. `meow/slideList` — 小视频滑动列表（竖刷主业务现役 mobile-direct feedList 的兄弟端点，游标/序稳定性对比）
4. `play/playInfo/spriteVtt` — 进度条预览（白嫖官方雪碧图，功能增量）
5. `selection/feed/singleColumn` — 竖刷新内容源候选（正主 selection/feed 已在用）
6. `new-danmaku/poll` — 弹幕增量轮询（缓：全量已在用 pc-direct 变体，内存水位优化 0.9.165 刚落）
7. `user/searchInFollow` — 关注列表内搜索（Phase 5 抽屉顺路）
8. 砍：`manage/searchDanmaku`（UP 主视角，无消费方）
