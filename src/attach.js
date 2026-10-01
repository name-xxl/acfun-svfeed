import { CFG } from './cfg.js';
import { toast, sweepSlideVideos } from './ui.js';
import { createSession } from './session.js';

// ---------- 元素级契约总表 ----------
// 以下 _xxx 属性挂在 slide/item DOM 对象上，是跨模块的隐式协作面。
// 曾散落在各文件的闭包里，现集中列出（读/写方），新增字段先来此处登记：
//
// slide（.acsv-slide 元素）：
//   _session     会话句柄    写: attach.js(attachVideo) 读: player/renderWindow、report.js、unmount/switchSource
//   _resumeAt    续播秒位    写: attach.js(switchQuality)/controls(编码·缓冲菜单)/session(恢复链末级重挂) 读: attachVideo→session.resumeAt
//   _userPaused  用户暂停意图 写: playback.js(togglePlayGesture/playVideo) 读: playback、session.js
//   _ctlTimer/_ctlTime/_ctlPlayBtn/_ctlFill/_ctlHandle/_ctlTrack/_qBtn
//                控制栏元素引用 写: controls.js(buildControls/showControls) 读: controls、player(SESSION_HOOKS)
//   _dmLayer     弹幕图层    写/读: danmaku.js；session.js dispose 时销毁
//   _watchTimer  首报兜底定时器 写/读: player(SESSION_HOOKS onPlaying/onDisposed)
//   _likeSync/_favSync/_banSync/_cmtSync/_shareSync/_followSync
//                计数回填钩子 写: rail.js(buildSideRail) 读: rail.js(onHomeResolved)
//
// slide 的 dataset 投影（与 _xxx 并行的第二协作面，0.9.36 登记拖动契约）：
//   data-state   会话状态投影 写: session.js(setState: loading/ready/error…) 读: CSS、harness 断言
//   data-paused  暂停投影     写: session.js(playing/pause) 读: controls 中央暂停图标
//   data-drag    拖动进度条中 写: controls.js(拖动起止) 读: player(SESSION_HOOKS timeupdate——拖动期停写时间)
//   data-idx     楼层序号     写: slide.js(buildSlide) 读: 全项目（定位/回收/扫描判定）
//   data-panfit  画面 fit 标记 写: player.js(syncPanFit) 读: CSS
//
// item（feedstore 条目）：
//   _resolveP    懒解析在途 Promise 写/读: api.js(ensureResolved)
//   _freezeTries 卡帧恢复阶梯计数 写/读: session.js(HealthMonitor)；switchQuality 仅 manual 清零、回前台清零
//   _freezeGaveUp 阶梯放弃标记 写/读: session.js(HealthMonitor)；回前台清零（新故障域重新武装）
//   _qManual     用户手选过清晰度（禁自动降档） 写: attach.js(switchQuality) 读: session.js
//
// 会话回接钩子由 player.js 注入（SESSION_HOOKS 依赖上层导航/侧栏/控制栏，
// 不能被本模块反向 import——与 session.js 的 createSession hooks 同一风格）
var HOOKS = null;
export function setSessionHooks(h) { HOOKS = h; }

// 清晰度切换：保留进度重挂（slide._resumeAt 在 playing 后 seek 回去）
// manual=true 表示用户在菜单手选：此后看门狗不再对该条目自动降档
export function switchQuality(item, slide, qIdx, manual) {
  var video = slide.querySelector('video');
  if (!video || !item.qualities || !item.qualities[qIdx]) return;
  var t = video.currentTime || 0;
  item.qIdx = qIdx;
  item.urls = item.qualities[qIdx].urls;
  item.urlIdx = 0;
  item.refreshed = false;
  // 仅手动切档重置阶梯计数：自动降档若清零，"误判→降档→清零→再误判"会走楼梯一路降到底；
  // 自动降档沿用累计数（cap 门槛 + healthyMs 衰减仍然有效），真卡顿多次后照样放弃
  if (manual) item._freezeTries = 0;
  if (manual) item._qManual = true;
  // 仅用户手选才记忆：看门狗自动降档是临时的，写进去会跨会话固化成低清偏好
  if (manual) {
    try { localStorage.setItem(CFG.lsQuality, item.qualities[qIdx].label); } catch (e) { }
  }
  slide._resumeAt = t;
  if (slide._qBtn) slide._qBtn.textContent = item.qualities[qIdx].label; // 底栏标识同步
  attachVideo(slide, item, Number(slide.dataset.idx));
  toast('清晰度：' + item.qualities[qIdx].label);
}

// 重挂统一入口：旧会话一次拆净（video/看门狗/弹幕层/定时器），新会话接管。
// 进度续播槽 slide._resumeAt 语义不变：switchQuality/编码缓冲菜单/恢复链末级重挂写入，这里转入新会话
export function attachVideo(slide, item, idx) {
  if (slide._session) { slide._session.dispose(); slide._session = null; }
  // 防御强拆残留 video（幽灵防护；正常应已被旧会话 dispose 拆除）。
  // 不能用 src=''：空 src 会异步触发 SRC_NOT_SUPPORTED error 驱动恢复链（0.9.1 根因）
  sweepSlideVideos(slide);
  var session = createSession(slide, item, idx, HOOKS);
  slide._session = session;
  session.resumeAt = slide._resumeAt || 0;
  slide._resumeAt = 0;
  session.start();
}
