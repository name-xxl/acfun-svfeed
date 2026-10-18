// @ts-check
// ---------- 稍后再看域（0.9.279）：列表读 + 加入/移出写链 ----------
// 端点与参数取自 jadx `AcFunApiService`（docs/acfun-app-api-inventory.md）：
//   waitingList = @POST + query pcursor/count（需登录；回包 list[] + pcursor；
//   条目 = RecommendFeedDouga（APP 视频卡））；
//   addWaiting / cancelWaiting = @POST form resourceId/resourceType（视频 resourceType=2）。
// 传输纪律：列表与增删都走 net.request（GM 通道带 Cookie）。**不能用 postForm**：
// api-new 对 addWaiting/cancelWaiting 的响应没有 CORS 头，页面 fetch 会「服务端已写入、
// 浏览器读不到响应」→ 误报失败；这与 momentpost 的 APP 域写链同一口径。
// URL 字面量逐字=harness mock 缝。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { appDeviceHeaders } from './appapi.js';
import { stat } from './dbg.js';

// 回包 → { items: 原始卡[], cursor, noMore }。只做形状守卫，条目规整归 panelitem.waiting。
// 终页：pcursor='no_more' / 空页 / 缺游标——三者任一即停（与 App CursorResponse.hasMore 同义）。
export function waitingPageOf(j) {
  var raws = (j && Array.isArray(j.list)) ? j.list : [];
  var cur = (j && j.pcursor != null) ? String(j.pcursor) : '';
  var noMore = !raws.length || cur === '' || cur === 'no_more';
  return { items: raws, cursor: noMore ? '' : cur, noMore: noMore };
}

// 列表（需登录）。失败抛错 → pageloader 出三态失败行；未登录由 mytabs 的 selfUid 门先挡。
export function listWaiting(pcursor) {
  return request(CFG.api.waitingList + '?pcursor=' + encodeURIComponent(pcursor || '')
    + '&count=' + CFG.view.pageSize, 'POST')
    .then(function (j) {
      if (!j || j.result !== 0) throw new Error('waiting-list-' + ((j && j.result) || 'null'));
      return waitingPageOf(j);
    });
}

function writeWaiting(url, item) {
  return request(url, 'POST', appDeviceHeaders(),
    'resourceId=' + encodeURIComponent(item && item.id) + '&resourceType=2')
    .then(function (j) {
      var ok = !!(j && j.result === 0);
      if (!ok) stat('wl.fail');
      return ok;
    }, function () {
      stat('wl.fail');
      return false;
    });
}

export function addWaiting(item) {
  return writeWaiting(CFG.api.waitingAdd, item);
}

export function cancelWaiting(item) {
  return writeWaiting(CFG.api.waitingCancel, item);
}
