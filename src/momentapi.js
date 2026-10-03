import { CFG } from './cfg.js';
import { request } from './net.js';
import { followVideoPageOf } from './data.js';

// ---------- 动态域读接口（0.9.106 收口） ----------
// 背景（用户三问之「接口统一管理了吗」）：端点此前已全在 cfg.js，但**请求编排**散在
// followview（列表）/followstream（视频流）/followbadge（未读）三处各拼查询串、各解析。
// 本模块收「关注/动态读」三条 + 落点拼串；边界：评论管线（comment/list/sublist）属评论域
// 留 comments.js，写链在 interact/appapi（既有分层不动）。
// **URL 形态与旧实现逐字保持**——harness mock 按 URL 子串命中（feed/followFeedV2、
// feed/followDougaFeed、feed/webPush），改字符即断夹具。
export function listMoments(pcursor) {
  return request(CFG.api.followFeed + '?useWebp=true&count=' + CFG.view.pageSize + '&pcursor=' + pcursor, 'GET');
}

export function listVideos(pcursor) {
  return request(CFG.api.followDouga + '?pcursor=' + encodeURIComponent(pcursor || '0'), 'GET')
    .then(followVideoPageOf); // 规整走契约层纯函数（单测直采）
}

export function unreadCount() {
  return request(CFG.api.webPush + '?count=10&pcursor=0', 'GET').then(function (j) {
    var ups = (j && j.followUpers) || [];
    return ups.filter(function (u) { return u && u.hasUnReadResource; }).length;
  });
}

export function momentPageUrl(id) {
  return CFG.api.momentBase + id;
}
