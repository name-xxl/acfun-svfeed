import { CFG } from './cfg.js';
import { toast, sweepSlideVideos } from './ui.js';
import { createSession } from './session.js';
import { slideAt, isOvlSlide } from './state.js';
import { FeedStore } from './feedstore.js'; // 仅调用期解引用（feedstore↔player 循环同款先例）
import { reapplyQuality } from './quality.js';

// ---------- 元素级契约总表 ----------
// 以下 _xxx 属性挂在 slide/item DOM 对象上，是跨模块的隐式协作面。
// 曾散落在各文件的闭包里，现集中列出（读/写方），新增字段先来此处登记：
//
// slide（.acsv-slide 元素）：
//   _session     会话句柄    写: attach.js(attachVideo 赋值);dispose+置 null: player(renderWindow/unmount/switchSource)、controls(rebuildFwdNeighbor)、playlayer(teardownPlayView)、attach(syncFwdQuality) 读: report.js(离开上报)
//   _resumeAt    续播秒位    写: attach.js(switchQuality/syncFwdQuality)/controls(编码·缓冲菜单)/session(恢复链末级重挂) 读: attachVideo→session.resumeAt
//   _userPaused  用户暂停意图 写: playback.js(暂停置 1/playVideo 清 0) 读: player(setActive)、session.js(自动续播判定)
//   _ctlTimer/_ctlTime/_ctlPlayBtn/_ctlFill/_ctlHandle/_ctlTrack/_qBtn
//                控制栏元素引用 写: controls.js(buildControls/showControls) 读: controls、player(SESSION_HOOKS);
//                _qBtn 的档位文本另由 attach(switchQuality)/rail(onHomeResolved) 写 textContent
//   _dmLayer     弹幕图层    写/读: danmaku.js(onPlaying 建/本地弹幕);stop: controls(开关)/player(窗口扫描);session.js dispose 销毁
//   _watchTimer  首报兜底定时器 写/读: player(SESSION_HOOKS onPlaying/onDisposed)
//   _likeSync/_favSync/_banSync/_cmtSync/_shareSync/_followSync
//                计数回填钩子 写: rail.js(buildSideRail) 读: rail.js(onHomeResolved)
//   _followSync  作者面同步（0.9.82 起**无条件注册**，幂等）：头像/关注块 + 左下 @名字 行由
//                rail.syncRailUp / rail.syncMetaUp 渲染，up 为 null（作者未知）时对应节点不挂
//
// slide 的 dataset 投影（与 _xxx 并行的第二协作面，0.9.36 登记拖动契约）：
//   data-state   会话状态投影 写: slide.js(buildSlide 初始)/session.js(setState: loading/ready/error…;waiting 处理器直写) 读: player(renderWindow error 判定)、CSS、harness 断言
//   data-paused  暂停投影     写: session.js(playing/pause)/playback.js(play() 被拒) 读: CSS(中央暂停图标/控制栏常显)
//   data-drag    拖动进度条中 写: controls.js(拖动起止) 读: player(SESSION_HOOKS timeupdate——拖动期停写时间)
//   data-idx     楼层序号     写: slide.js(buildSlide) 读: 全项目（定位/回收/扫描判定）
//   data-ovl     播放层标记   写: playlayer.js(层内 slide) 读: state.isOvlSlide/ownerIdxOf
//                             （0.9.78 函数化：哨兵 OVL_IDX 与读出函数同源于 state.js）——
//                             slide(点按判定)/attach(syncFwdQuality)/controls(rebuildFwd邻位)/player(连播)
//                             凡按 idx 回查 FeedStore 的地方一律先问它，别再散读 dataset
//   data-panfit  画面 fit 标记 写: player.js(syncPanFit) 读: CSS
//
// item（feedstore 条目）：
//   up           作者契约（0.9.82 统一条目模型）{ id, name, img, isFollowing } | null——**作者
//                唯一出口**。定型在 data.upOf；面板/搜索来源经 data.playItemOf 归一进播放层；
//                resolve 回包在 appapi 就地补建。读方 rail(syncMetaUp/syncRailUp)、
//                slide(buildSlide)、interact(setRealFollow)。顶层 userName/userId/head/
//                isFollowing 已退役（test/unit/contract.test.js 禁其回流）
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
// manual=true 表示用户在菜单手选：此后看门狗不再对该条目自动降档，且把新偏好同步到前向邻居
export function switchQuality(item, slide, qIdx, manual) {
  var video = slide.querySelector('video');
  if (!video || !item.qualities || !item.qualities[qIdx]) {
    // 解析中/错误态没有 video：菜单点击不能无声无息（!item.qualities 已由菜单侧 toast）
    if (!video && item.qualities) toast('视频还没就绪，稍候再试');
    return;
  }
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
  if (manual) syncFwdQuality(slide);
}

// 手动切档把新偏好同步到前向邻居。清晰度偏好在 resolve 时经 applyQuality 一次性应用，
// 预挂的 idx+1（CFG.win.fwd）与 prewarm 已解析的 idx+1/idx+2 冻结在旧档上——不在这里
// 重算，新偏好要隔一两个视频才生效（用户报障的根因）。idx+1 重选档并立刻重建会话
// （运行中的预挂会话不会自己重读 item.urls）；idx+2 尚无 slide 只重选档，划到时按新档
// 挂载。重建走 attachVideo → session 直挂快路径补发 onResolved，onHomeResolved 会连带
// 刷新 _qBtn 档位文本。后向不动：已看过的内容重建丢播放位置（0.9.43 定例）；自动降档
// （manual=false）不进来——它是本机临时补救，不写偏好，邻居不该跟随
function syncFwdQuality(slide) {
  try {
    if (isOvlSlide(slide)) return; // 播放层 slide 无前向邻居（idx 哨兵会打到竖刷第 0 条）
    var idx = Number(slide.dataset.idx);
    for (var k = 1; k <= 2; k++) reapplyQuality(FeedStore.items[idx + k]);
    var fwd = slideAt(idx + 1);
    var it = fwd && FeedStore.items[idx + 1];
    if (!fwd || !it || !it.qualities || !fwd._session) return; // 解析在途时 reapply 未生效，等 resolve 现读新偏好
    var fv = fwd.querySelector('video');
    if (fv && fv.currentTime > 1) fwd._resumeAt = fv.currentTime; // 预挂条可能被回看过（滑回场景）
    fwd._session.dispose();
    fwd._session = null;
    attachVideo(fwd, it, idx + 1);
  } catch (e) { }
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
