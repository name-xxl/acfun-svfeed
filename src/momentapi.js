import { CFG } from './cfg.js';
import { request } from './net.js';
import { followVideoPageOf, squarePageOf, momentDetailStateOf } from './data.js';

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
    .then(followVideoPageOf); // 规整走契约层纯函数（单测直采）
}

// 广场流（0.9.125）：feedSquare 免登录读——**首页不传 pcursor**（实测惯例，与 followFeedV2
// 的 pcursor=0 方言不同）；游标形态 `时间戳:时间戳`；URL 逐字护 mock 缝（feed/feedSquare）；
// 规整走契约层 squarePageOf（result!==0 抛错=失败可重试，视图区分「失败」与「到底」）
export function listSquare(pcursor) {
  return request(CFG.api.feedSquare + (pcursor ? '?pcursor=' + encodeURIComponent(pcursor) : ''), 'GET')
    .then(squarePageOf);
}

// 单条动态详情（0.9.127，广场新鲜度回填）：pc-direct 带 Cookie 读——isLike/isThrowBanana
// 在此才为真值（免登录列表恒 false）。URL 逐字护 mock 缝（moment/detail）；Referer 按
// plaza 实测形态给（同端点转引 §2.7）；规整走契约层 momentDetailStateOf（失败/形状不合→null）
export function momentDetail(id) {
  return request(CFG.api.momentDetail + '?momentId=' + encodeURIComponent(id), 'GET',
    { Referer: 'https://www.acfun.cn/moment/am' + id })
    .then(momentDetailStateOf);
}

export function momentPageUrl(id) {
  return CFG.api.momentBase + id;
}
