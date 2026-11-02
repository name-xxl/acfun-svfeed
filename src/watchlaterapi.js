// @ts-check
// ---------- 稍后再看域（0.9.279）：列表读 + 加入/移出写链 ----------
// 端点与参数取自 jadx `AcFunApiService`（docs/acfun-app-api-inventory.md）：
//   waitingList = @POST + query pcursor/count（需登录；回包 list[] + pcursor；
//   条目 = RecommendFeedDouga（APP 视频卡））；
//   addWaiting / cancelWaiting = @POST form resourceId/resourceType（视频 resourceType=2）。
// 传输纪律：列表与增删都走 net.request（GM 通道带 Cookie）。**不能用 postForm**：
// api-new 对 addWaiting/cancelWaiting 的响应没有 CORS 头，页面 fetch 会「服务端已写入、
// 浏览器读不到响应」→ 误报失败；这与 momentpost 的 APP 域写链同一口径。
// 门禁动态（§14.3，2026-11-02 实测）：add/cancel 按端点各自波动（10-18 全开 → 10-30 全灭 →
// 11-02 add 开/cancel 灭），且服务端对任意输入（含 resourceId=undefined）恒回 result:0——
// 成功码只是「收讫」，本地判不了真假。URL 字面量逐字=harness mock 缝。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { appDeviceHeaders } from './appapi.js';
import { isEndCursor, RT, okResult0 } from './contract.js'; // 游标/资源类型/成功码方言单源（0.9.304）
import { stat } from './dbg.js';

// 回包 → { items: 原始卡[], cursor, noMore }。只做形状守卫，条目规整归 panelitem.waiting。
// 终页：pcursor='no_more' / 空页 / 缺游标——三者任一即停（与 App CursorResponse.hasMore 同义）。
export function waitingPageOf(j) {
  var raws = (j && Array.isArray(j.list)) ? j.list : [];
  var cur = (j && j.pcursor != null) ? String(j.pcursor) : '';
  var noMore = !raws.length || isEndCursor(cur);
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

// 写链入参＝显式 resourceId 标量（0.9.311）。病灶史：调用面曾各自塞「整个条目对象」、
// 写链内部猜字段名（item.id），面板条目契约只有 acId → 实际发出 resourceId=undefined，
// 而服务端对任意输入恒回 result:0（假成功、无信号，§14.3）——乐观移除后刷新条目又回来。
// 收口：调用点（controls=home PlayItem.id；mytabs=PanelItem.acId）各取对字段，传标量；
// 写链不再猜对象。守卫：非正整数不发请求（wl.fail 可观测），杜绝垃圾请求。
function writeWaiting(url, rid) {
  var id = Number(rid);
  if (!(id > 0)) {
    stat('wl.fail');
    return Promise.resolve(false);
  }
  return request(url, 'POST', appDeviceHeaders(),
    'resourceId=' + id + '&resourceType=' + RT.VIDEO)
    .then(function (j) {
      var ok = okResult0(j);
      if (!ok) stat('wl.fail');
      return ok;
    }, function () {
      stat('wl.fail');
      return false;
    });
}

export function addWaiting(rid) {
  return writeWaiting(CFG.api.waitingAdd, rid);
}

export function cancelWaiting(rid) {
  return writeWaiting(CFG.api.waitingCancel, rid);
}
