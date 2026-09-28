import { CFG } from './cfg.js';
import { stat } from './dbg.js';
import { FeedStore } from './feedstore.js';
import { scroller, slideAt } from './state.js';

// 观看历史上报：离开（划走/播完/关页）时把最终进度经官方页面 weblog 管道
// （CLICK/CLIENT_BROWSE_HISTORY，参数对齐官方 sendHistory）计入 A 站观看记录。
// playedSeconds 即停止位置，历史/续播按真实进度显示；进度低于 watchReportMin
// 的闪滑误触不入历史。同一条目允许多次上报（进度更新语义）：watchSentAt 记
// 最后上报秒位，进度未推进的重复触发（播完后的连播 dispose、切标签往返）不重发
var watchSentAt = {};
export function reportLeave(session, video, via, sec, retryN) {
  var item = session && session.item;
  if (!item || !item.cap || !item.cap.watchReport || !item.videoId || !video) return;
  if (typeof sec !== 'number') sec = Math.floor(video.currentTime || 0);
  if (sec < CFG.time.watchReportMin) return;
  var key = item.id + ':' + item.videoId;
  if (watchSentAt[key] === sec) return;
  try {
    var w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    var wl = w.weblog;
    if (!wl || !wl.impr || !wl.sendImmediately) {
      // 官方脚本未就绪：页面存活路径隔 1s 短重试（上限 3 次）；关页路径重试无意义
      if (via !== 'pagehide' && (retryN || 0) < 3) {
        setTimeout(function () {
          reportLeave(session, video, via, sec, (retryN || 0) + 1);
        }, 1000);
      }
      return;
    }
    wl.sendImmediately('CLICK', {
      action: 'CLIENT_BROWSE_HISTORY',
      params: {
        req_id: wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : undefined,
        group_id: wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : undefined,
        atom_id: String(item.videoId),
        ac_id: String(item.id),
        album_id: '0',
        resourceTypeCode: 2, // 官方 video 页配置固定值
        playedSeconds: sec,
        videoId: Number(item.videoId) || 0,
        reportIdName: Number(item.id) || 0,
        resourceType: 'video',
        dougaId: Number(item.id) || 0
      }
    });
    watchSentAt[key] = sec;
    stat('report-watch');
  } catch (e) { stat('report-watch-err'); }
}

// 关标签页/切走标签兜底：对当前会话补报最终进度。官方 weblog 在卸载期能否送达
// 取决于其内部实现，脚本不可控——发不出仅丢这条上报，无副作用
export function reportLeaveCurrent(via) {
  try {
    if (!scroller || FeedStore.current < 0) return;
    var s = slideAt(FeedStore.current);
    if (s && s._session) reportLeave(s._session, s._session.video, via);
  } catch (e) { }
}
window.addEventListener('pagehide', function () { reportLeaveCurrent('pagehide'); });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) reportLeaveCurrent('hidden');
});
