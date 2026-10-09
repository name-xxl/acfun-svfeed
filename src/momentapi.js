import { CFG } from './cfg.js';
import { request } from './net.js';
import { squarePanelOf, followPanelOf } from './panelitem.js'; // 条目派发在面板契约件（0.9.162 data.js 终解）；本域回包规整 0.9.159 域归域迁入本模块

// ---------- 动态域读接口（0.9.106 收口；0.9.107 徽标弃用 webPush 后 unreadCount 退役） ----------
// 背景（用户三问之「接口统一管理了吗」）：端点此前已全在 cfg.js，但**请求编排**散在
// followview（列表）/followstream（视频流）/followbadge（未读）三处各拼查询串、各解析。
// 本模块收「关注/动态读」四条（0.9.125 加广场流）+ 落点拼串；边界：评论管线
//（comment/list/sublist）属评论域留 comments.js，写链在 interact/appapi（既有分层不动）。
// **URL 形态与旧实现逐字保持**——harness mock 按 URL 子串命中（feed/followFeedV2、
// feed/followDougaFeed、feed/webPush、feed/feedSquare），改字符即断夹具。
export function listMoments(pcursor) {
  return request(CFG.api.followFeed + '?useWebp=true&count=' + CFG.view.pageSize + '&pcursor=' + pcursor, 'GET');
}

export function listVideos(pcursor) {
  return request(CFG.api.followDouga + '?pcursor=' + encodeURIComponent(pcursor || '0'), 'GET')
    .then(followVideoPageOf); // 规整收口本模块（0.9.159 域归域，单测直采）
}

// 广场流（0.9.125）：feedSquare 免登录读——**首页不传 pcursor**（实测惯例，与 followFeedV2
// 的 pcursor=0 方言不同）；游标形态 `时间戳:时间戳`；URL 逐字护 mock 缝（feed/feedSquare）；
// 规整走本模块 squarePageOf（0.9.159 自契约层域归域；result!==0 抛错=失败可重试，视图区分「失败」与「到底」）
export function listSquare(pcursor) {
  return request(CFG.api.feedSquare + (pcursor ? '?pcursor=' + encodeURIComponent(pcursor) : ''), 'GET')
    .then(squarePageOf);
}

// UP 个人主页动态流（0.9.218 数据面新增；实测 §10.1 字段级核对）：feed/profile 免登录读、任意
// uid 可读；**三合一混排**（rt10 图文动态 / rt2 视频 / rt3 文章）；游标=下一页首条 createTime
// （毫秒），终页 'no_more'；首页 pcursor 传空串（实测与不传等价）。URL 逐字护 mock 缝（feed/profile）；
// 规整走本模块 profilePageOf——**刻意不套广场的 24h 窗口**（个人主页是历史流，套上会砍掉老动态）
export function listProfile(uid, pcursor) {
  return request(CFG.api.feedProfile + '?userId=' + encodeURIComponent(uid)
    + '&count=' + CFG.view.moments.count + '&pcursor=' + encodeURIComponent(pcursor || ''), 'GET')
    .then(profilePageOf);
}

// 单条动态详情（0.9.127，广场新鲜度回填）：pc-direct 带 Cookie 读——isLike/isThrowBanana
// 在此才为真值（免登录列表恒 false）。URL 逐字护 mock 缝（moment/detail）；Referer 按
// plaza 实测形态给（同端点转引 §2.7）；规整走本模块 momentDetailStateOf（0.9.159 自契约层迁入；失败/形状不合→null）
export function momentDetail(id) {
  return request(CFG.api.momentDetail + '?momentId=' + encodeURIComponent(id), 'GET',
    { Referer: 'https://www.acfun.cn/moment/am' + id })
    .then(momentDetailStateOf);
}

export function momentPageUrl(id) {
  return CFG.api.momentBase + id;
}

// ---------- 回包规整（0.9.159 自 data.js 域归域迁入）：端点回包 → 模型，纯函数单测直采 ----------
// 本域回包形状只有本域消费，规整随域走（不再寄放契约层）；squarePageOf 消费的条目派发
// squarePanelOf 仍属契约层（面板条目契约单源）。

// 关注视频流单页规整（0.9.99，§2.1.2 实测）：followDougaFeed 响应 → {items:[{id:acId}],
// nextCursor, noMore}。只收 resourceType=2（端点语义即纯视频，过滤是宁漏不错的最后防线）；
// 终判 pcursor='no_more'（实测终值）/空壳/空页。**纯函数**收口本模块——followstream 的
// loadFollowPage 转发它，单测直采不必拉起竖刷依赖图
export function followVideoPageOf(j) {
  var raws = (j && j.feedList) || [];
  var items = raws.filter(function (r) { return r && r.resourceType === 2 && r.resourceId; })
    .map(function (r) { return { id: Number(r.resourceId) }; });
  var next = j && j.pcursor != null ? String(j.pcursor) : '';
  var noMore = next === 'no_more' || !raws.length || !items.length;
  return { items: items, nextCursor: noMore ? '' : next, noMore: noMore };
}

// 广场流单页规整（0.9.125，§2.7 实测；0.9.126 收口 **24h 窗口**；0.9.127 出 **freshIds**）：
// feedSquare 响应 → {items:[pi], nextCursor, noMore, freshIds}。窗口=广场的原味（plaza：翻到
// 发布 >24h 即止）——超窗条目逐条剔除且**直接判到底**（首屏/翻页两态同此判据）；freshIds=
// 窗口内且发布 ≤3h 的 momentId（视图据此走 moment/detail 补互动态真值——免登录列表的
// isLike/isThrowBanana 恒 false）；**result!==0 = 失败（throw）**——调用方区分「失败可重试」与
// 「到底」，绝不许把失败当到底；终判 pcursor='no_more'。**纯函数**收口本模块，单测直采
export function squarePageOf(j) {
  if (!j || j.result !== 0) throw new Error('square-fail');
  var raws = Array.isArray(j.feedList) ? j.feedList : [];
  var now = Date.now();
  var cutoff = now - CFG.view.square.windowMs;
  var items = [];
  var freshIds = [];
  var crossed = false;
  raws.forEach(function (raw) {
    var t = Number(raw && raw.createTime) || 0;
    if (t && t < cutoff) { crossed = true; return; } // 超 24h 窗口：剔除并标记边界
    var pi = squarePanelOf(raw);
    if (pi) {
      items.push(pi); // 契约层过滤（宁漏不错）
      if (t && now - t <= CFG.view.square.freshMs) freshIds.push(pi.momentId);
    }
  });
  var next = j.pcursor != null ? String(j.pcursor) : '';
  var noMore = crossed || next === 'no_more' || !raws.length || !items.length;
  return { items: items, nextCursor: noMore ? '' : next, noMore: noMore, freshIds: freshIds };
}

// 个人主页动态流单页规整（0.9.218）：feed/profile 响应 → {items:[pi], nextCursor, noMore, freshIds}。
// 条目形状与 followFeedV2 **同构**（2026-10-09 字段级核对：resourceId / createTime(毫秒) / 三计数 /
// user(userId,userName,userHead,isFollowing,nameColor) / rt10 的 moment{text,imgs[]} 与 repostSource
// 全部对得上）⇒ 直接复用契约层的 follow 解析器，**不新增解析器**（单源收口）。
// **无 24h 窗口**（与 squarePageOf 的关键差异）：历史流照单全收，翻页只认 pcursor/空页/整页滤空；
// freshIds=≤3h 的动态条目（视图据此走 moment/detail 补互动态真值，与广场同口径）。纯函数，单测直采。
export function profilePageOf(j) {
  if (!j || j.result !== 0) throw new Error('profile-fail');
  var raws = Array.isArray(j.feedList) ? j.feedList : [];
  var now = Date.now();
  var items = [];
  var freshIds = [];
  raws.forEach(function (raw) {
    var pi = followPanelOf(raw);
    if (!pi) return; // 契约层过滤（宁可漏不错）：三类之外的 resourceType 一概不接
    items.push(pi);
    var t = Number(raw && raw.createTime) || 0;
    if (pi.ct === 'moment' && t && now - t <= CFG.view.moments.freshMs) freshIds.push(pi.momentId);
  });
  var next = j.pcursor != null ? String(j.pcursor) : '';
  // 到底判据：终页标记 / 空页 / 整页被契约层滤空（后端游标未推进时由工厂的"整页 0 新增"安全阀兜住）
  var noMore = next === 'no_more' || !raws.length || !items.length;
  return { items: items, nextCursor: noMore ? '' : next, noMore: noMore, freshIds: freshIds };
}

// 单条动态详情状态（0.9.127，moment/detail 回填用；字段名 plaza 实测转引 §2.7）：只为
// 「新鲜条目互动态回填」取五件——moment 对象上的 likeCount/commentCount/bananaCount 与
// isLike/isThrowBanana（详情才带登录态）。失败/形状不合返回 null，调用方静默保持列表快照
export function momentDetailStateOf(j) {
  if (!j || j.result !== 0 || !j.moment) return null;
  var mo = j.moment;
  return {
    liked: !!mo.isLike,
    thrown: !!mo.isThrowBanana,
    like: Number(mo.likeCount) || 0,
    comment: Number(mo.commentCount) || 0,
    banana: Number(mo.bananaCount) || 0
  };
}
