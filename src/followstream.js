import { CFG } from './cfg.js';
import { AppAPI } from './appapi.js';
import { playItemOf } from './data.js';
import { setDockBadge } from './sidebar.js';
import { FeedStore } from './feedstore.js'; // 仅 enterVideos 运行期触达（0.9.115 断 feedstore↔player 后为普通单向边）
import { createFeedContext, runChain, registerContext, activateContext } from './feedctx.js';
import { listVideos } from './momentapi.js';
import { testHook } from './dbg.js';

// ---------- 关注视频流（0.9.99）：FollowVideos 列表上下文 + followDougaFeed 分页链 ----------
// 「视频 | 全部」顶栏切换的「视频」侧：把关注 UP 的纯视频流接进**宿主竖刷舞台**。形态照
// uppage 的 UpVideos 列表上下文通道（空间页先例）：feedActive + items + feedCursor →
// feedstore.getListContext 命中 → pumpListContext 按列表顺序泵入；列表耗尽回落当前源随机流
//（UpVideos 同款语义）。数据源 followDougaFeed（官方视频 tab，§2.1.2 实测：每页固定 10、
// 终页 pcursor='no_more'、条目与 followFeedV2 视频条目同构）。
// 依赖注意：import FeedStore 仅 enterVideos 运行时触达（列表上下文经 feedctx 注册表交递，
// 本模块与 feedstore 无静态环；0.9.115 断 feedstore↔player 后本边为普通单向——表述已校准）。

// 核心字段由工厂生成（0.9.106；与 UpVideos 同源——8 字段+链机不再两套）
export var FollowVideos = registerContext(createFeedContext({
  dockView: 'follow', // 舞台态 dock 高亮归属（views.syncRouteView 经 listContext 读；0.9.105）
  firstCursor: '0'
}));

// 竖刷泵的详情解析：home 家族（douga/info + playInfo resolve），产出**item 本体**——
// 注意 AppAPI.resolve 返回的是布尔（成功与否），泵守卫读 n.id/n.urls.length，必须在这层
// 把 item 交出去（失败则 reject，泵按死链跳过）。非 m3u8 直链（harness webm 直挂/未来
// mp4 直链）绕开 hls 管线——与 api.js 直挂缝同判（cap.hls=false 走 video.src 直挂）
FollowVideos.info = function (id) {
  var item = playItemOf({ acId: Number(id), title: '', cover: '' });
  return AppAPI.resolve(item).then(function (ok) {
    if (!ok) throw new Error('resolve failed');
    if (item.urls.length && !/\.m3u8/i.test(item.urls[0])) item.cap.hls = false;
    return item;
  });
};

// 单页拉取：传输收口在 momentapi（URL 逐字保持以护 mock 缝），规整逻辑在契约层纯函数
// followVideoPageOf（单测直采）——本函数做「ctx 状态并入」并回 {loaded, page}（page=规整
// 后的原始页，enterVideos 首屏读它；runChain 只读 loaded——两消费面各取所需）
export function loadFollowPage(cur) {
  return listVideos(cur).then(function (page) {
    if (page.items.length) {
      FollowVideos.items = FollowVideos.items.concat(page.items);
      FollowVideos.pcursor = page.nextCursor;
    }
    if (page.noMore || !page.items.length) FollowVideos.done = true;
    return { loaded: page.items.length > 0, page: page };
  });
}

// 后台分页链：状态机单源=feedctx.runChain（0.9.106；与空间页链同机）；页数有上限，防超长
// 关注列表无感发几百请求；到底/失败置 done/failed——泵见 failed 即回落当前源随机流
export function startFollowChain() {
  runChain(FollowVideos, {
    maxPages: CFG.followStream.maxChainPages,
    loadPage: function (ctx) { return loadFollowPage(ctx.pcursor); }
  });
}

// 关注语境判据（单源）：关注视图开着，或舞台正在放关注视频流。顶栏 seg 显隐与徽标
// 不点亮判据都走这里——徽标若只看 hash，舞台放关注视频时地址是深链形态会误点亮（0.9.99）
export function isFollowContext() {
  return FollowVideos.feedActive
    || new RegExp('#' + CFG.hash + '/follow').test(String(location.hash));
}

// 进「视频」侧：已在流中 → 原地跳回当前条（syncRouteFeed 缓冲命中，不重置）；否则确保首页
// 有货后深链首条接管舞台（loadDeepLink 自带 reset，首条置顶后泵从 feedCursor=1 续）。
// 返回 Promise<boolean> 给调用方出 UI（逻辑层零 UI）
export function enterVideos() {
  setDockBadge('follow', 0); // 进关注语境即清（0.9.97「进视图即清」延伸到视频侧）
  if (FollowVideos.feedActive) {
    var it = FeedStore.items[FeedStore.current] || FeedStore.items[0];
    if (it) {
      location.hash = CFG.hash + '/a/' + it.id;
      return Promise.resolve(true);
    }
    // feedActive 残留但缓冲已空（被切源/重置过）：落回全新进入
  }
  activateContext(FollowVideos); // 单活互斥：清掉空间页等其余上下文（0.9.106 互踩修复）
  FollowVideos.failed = false;
  return loadFollowPage('0').then(function (res) {
    var page = res.page; // 0.9.106：loadFollowPage 回 {loaded, page}（并入已在其内完成）
    if (!page.items.length) { FollowVideos.feedActive = false; FollowVideos.done = true; return false; }
    FollowVideos.feedCursor = 1; // 首条由深链置顶，从 1 起泵（items/pcursor 已并入）
    FeedStore.resetForList(); // 深链前清一次：上一源的缓冲与游标不得混进关注流
    location.hash = CFG.hash + '/a/' + FollowVideos.items[0].id;
    startFollowChain();
    return true;
  }, function () {
    FollowVideos.feedActive = false;
    return false;
  });
}

// 进「全部」侧：打开关注视图。舞台流**不清**——之后点「视频」按上面分支原位续看
export function enterAll() {
  location.hash = CFG.hash + '/follow';
}

// debug 构建测试钩子：harness 断言上下文激活/泵游标/链状态
testHook('followstream', function () {
  return {
    feedActive: FollowVideos.feedActive,
    count: FollowVideos.items.length,
    cursor: FollowVideos.feedCursor,
    done: FollowVideos.done,
    capped: FollowVideos.chainCapped
  };
});
