import { CFG } from './cfg.js';
import { stat } from './dbg.js';
import { FeedStore } from './feedstore.js';
import { scroller, slideAt, watchTarget } from './state.js';

// 观看历史上报：离开（划走/播完/关页）时把最终进度经官方页面 weblog 管道
// （CLICK/CLIENT_BROWSE_HISTORY，参数对齐官方 sendHistory）计入 A 站观看记录。
// playedSeconds 即停止位置，历史/续播按真实进度显示；进度低于 watchReportMin
// 的闪滑误触不入历史。同一条目允许多次上报（进度更新语义）：watchSentAt 记
// 最后上报秒位，进度未推进的重复触发（播完后的连播 dispose、切标签往返）不重发。
// 单调性不对称（0.9.86 官方对齐实测）：live 路径镜像官方语义——暂停/离开即报当前位，
// 用户重看回退时历史同样回退（官方自己也这样）；单调守卫只用于持久账本补报（见 0.9.87
// reconcile，那是无用户意图的死会话，补低值会把手前的历史改回去）。**不要把 live 路径
// "修"成单调的**
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
        bangumiItemId: null, // 官方实测载荷带此键（普通视频恒 null）——逐字段对齐
        dougaId: Number(item.id) || 0
      }
    });
    // 乐观水位：sendImmediately 是 fire-and-forget，网络层失败不可感知。这里记"已报"
    // 只代表 SDK 队列收了——真丢了由下一次离开事件按推进后的秒位天然愈合（进度语义允许），
    // 不是 bug，别在这里加"确认送达"机制
    watchSentAt[key] = sec;
    stat('report-watch');
  } catch (e) { stat('report-watch-err'); }
}

// 关标签页/切走标签兜底：对当前会话补报最终进度。官方 weblog 在卸载期能否送达
// 取决于其内部实现，脚本不可控——发不出仅丢这条上报，无副作用
export function reportLeaveCurrent(via) {
  try {
    // 播放层优先（0.9.86）：层内 slide 不在竖刷流里，slideAt(FeedStore.current) 永远查不到
    // 它（dataset.ovl='1'）——不补这条，层内观看关页时 10s 首报之后的进度全丢。层内开着
    // 就只报层内会话，**不回落竖刷**（背后是暂停的旧条，报它=幽灵进度），与 videoTarget 同纪律
    var tf = watchTarget();
    var wt = tf && tf(); // 钩子返回"取层内会话"的函数，须二次调用（playback.js videoTarget 同 idiom）
    if (wt && wt.session) {
      reportLeave(wt.session, wt.session.video, via);
      return;
    }
    if (!scroller || FeedStore.current < 0) return;
    var s = slideAt(FeedStore.current);
    if (s && s._session) reportLeave(s._session, s._session.video, via);
  } catch (e) { }
}
window.addEventListener('pagehide', function () { reportLeaveCurrent('pagehide'); });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) reportLeaveCurrent('hidden');
});
