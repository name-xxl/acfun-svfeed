// @ts-check
// ---------- 观看历史写链（0.9.279）：单条删除 / 清空 ----------
// 端点取自 jadx `AcFunApiService`（V2/f4）：
//   browse/history/delete    = POST form comboIds（重复 Long；PC 列表条目带 comboId）
//   browse/history/deleteAll = POST form resourceTypes（重复 int；PC 列表口径 1=视频 2=番剧）
// 均需登录；写链走 net.request（GM 通道带 Cookie）——api-new 无 CORS 头，页面 fetch 会
// 「服务端已写入、浏览器读不到响应」，与 momentpost 的 APP 域写链同口径。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { appDeviceHeaders } from './appapi.js';
import { stat } from './dbg.js';

function write(url, body) {
  return request(url, 'POST', appDeviceHeaders(), body).then(function (j) {
    var ok = !!(j && j.result === 0);
    if (!ok) stat('hist.fail');
    return ok;
  }, function () {
    stat('hist.fail');
    return false;
  });
}

// 单条：pi 必须有 comboId（panelitem.history 解析器落键）；没有就不发请求。
export function deleteHistory(item) {
  var id = item && item.comboId;
  if (!id) return Promise.resolve(false);
  return write(CFG.api.historyDelete, 'comboIds=' + encodeURIComponent(id));
}

export function clearHistory() {
  return write(CFG.api.historyDeleteAll, 'resourceTypes=1&resourceTypes=2');
}
