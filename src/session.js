import { CFG } from './cfg.js';
import { stat, set, testHook } from './dbg.js';
import { toast, sweepSlideVideos } from './ui.js';
import { ensureResolved } from './api.js';
import { nativeHls, ensureHls } from './hls.js';
import { getSetting } from './settings.js';

// ---------- 播放会话：一个「正在播放的视频」的完整生命周期 ----------
// 状态机：idle → resolving → loading → ready(⇄paused)；→ error；任意 → disposed。
// 3a 迁入：video 元素生命周期、懒解析等待、进度续播（resumeAt）、等待转圈、状态同步；
// 3b 迁入：hls 实例所有权与错误恢复链；3c 迁入：HealthMonitor 状态化。
// slide 侧只留 slide._session 单句柄，_recovering/_recoverPending/_resumeAt/_waitTimer/监视器
// 等播放态由会话接管；player 经 hooks 回接 UI 与编排（控件条/弹幕/连播/降档），
// 两个模块无循环 import（feedstore⇄player 的调用期解引用先例同款思路）。
//
// dispose 铁律（0.9.1 幽灵 video 教训）：video 拆除必须 removeAttribute('src')+load()，
// 绝不用 src=''——空 src 会异步触发一次假 SRC_NOT_SUPPORTED error，被移除元素的
// 监听器闭包着活 slide，会驱动恢复链写进度/换 CDN/给离屏元素重挂源。
export function createSession(slide, item, idx, hooks) {
  var S = {
    state: 'idle',
    slide: slide,
    item: item,
    idx: idx,
    video: null,
    hooks: hooks,
    monitor: null, // HealthMonitor（见文末）：FROZEN/DEGRADED 检测与恢复阶梯
    _hls: null,
    resumeAt: 0,        // 重挂前的播放进度，playing 后 seek 回去（attachVideo 从槽位转入）
    _recovering: false, // 恢复链重入锁：video error 与 hls fatal 可能接连触发
    _waitTimer: null,

    setState: function (s) {
      if (this.state === s) return;
      this.state = s;
      if (s === 'loading') slide.dataset.state = 'loading';
      else if (s === 'ready') {
        clearTimeout(this._waitTimer); // 转圈的清除与状态拨回归口一处
        slide.dataset.state = 'ready';
        slide.dataset.paused = '0';
      }
      else if (s === 'error') slide.dataset.state = 'error';
      if (hooks.onState) hooks.onState(this, s);
    },

    start: function () {
      var self = this;
      this.setState('loading');
      // 推荐模式懒解析：卡片无直链，先跑 douga/info → playInfo 再挂。
      // ensureResolved 与 setActive 预热共用同一个在途 Promise：预热中划到这里直接等结果
      if (item.cap.lazyResolve && !item.urls.length) {
        this.setState('resolving');
        ensureResolved(item).then(function (ok) {
          if (self.state === 'disposed') return;
          if (ok && slide.isConnected) {
            if (hooks.onResolved) hooks.onResolved(self);
            self._attach();
          } else {
            self.setState('error');
          }
        });
        return;
      }
      // 直挂快路径（预热已完成解析/重挂）：补发 onResolved，日期/计数/清晰度/关注
      // 状态才有机会同步——预热场景 slide 构建晚于解析，此前这条路径什么都不回填。
      // 仅 lazyResolve 条目需要（sv 直挂无此回填面）；钩子内全是幂等 sync，重挂重复触发无害
      if (item.cap.lazyResolve && hooks.onResolved) hooks.onResolved(this);
      this._attach();
    },

    _attach: function () {
      // 防御性清扫：slide 内残留的一切旧 video（幽灵防护；正常应已被上一会话 dispose）
      sweepSlideVideos(slide);
      var video = document.createElement('video');
      video.className = 'acsv-video';
      hooks.initVideo(video); // muted/loop/playbackRate 由 player 全局状态决定
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      this.video = video;

      this._wire(video);
      // 先入 DOM 再挂源：hls 异步回调里的换绑检测依赖 video 已在 slide 内
      slide.insertBefore(video, slide.querySelector('.acsv-side'));
      this._attachSource(video);
      video.load();
      // exp.noMonitor（仅 debug）：跳过看门狗——归因实验用，排除顶针/rME/降档动作本身致冻
      this.monitor = CFG.exp.noMonitor ? null : installHealthMonitor(this);
      if (this.idx === hooks.currentIdx() && !slide._userPaused) hooks.onAttachPlay(this, video);
    },

    // 按内容源挂播放源：sv=mp4 直链；home=m3u8（Safari 原生，其余走 hls.js）
    _attachSource: function (video) {
      var self = this;
      var item = this.item;
      this._destroyHls();
      var url = item.urls[item.urlIdx];
      if (!item.cap.hls) { // 直链 mp4 直接挂；m3u8 源走 hls.js/原生
        video.src = url;
        stat('attach.direct');
        return;
      }
      // 0.9.12 起 MSE 可用一律优先 hls.js：Edge(Chromium) 154 也声称原生支持 HLS
      // （实测 attach.native），但其 Media Foundation HLS 管线后台往返后画面停摆
      // （音频正常、帧停，stall.frozen 实锤，720P/硬解均复现），且是黑盒——无缓冲
      // 策略/错误恢复/观测面。仅 MSE 不可用（iOS Safari 类）或 exp.native 强制对照时交原生
      var noMse = !window.MediaSource && !window.WebKitMediaSource;
      if (nativeHls(video) && (noMse || CFG.exp.native)) {
        video.src = url;
        stat('attach.native');
        return;
      }
      ensureHls().then(function (Hls) {
        if (self.state === 'disposed') return;
        if (!slide.isConnected || slide.querySelector('video') !== video) return; // 期间已换绑
        if (!Hls || !Hls.isSupported()) { video.src = url; stat('attach.unsupported'); return; }
        self._destroyHls();
        var hls = new Hls(bufConfig());
        self._hls = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        stat('attach.hls');
        // 若该 m3u8 内含多档位，强制锁最高，防止 ABR 自动降档造成画质损失
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          if (self.state === 'disposed') return;
          // 归因实验：实际播放编码可见化（默认写嗅探结果；多变体流以真实 CODECS 覆写）
          var q = item.qualities && item.qualities[item.qIdx];
          if (q) set('hls.levelCodec', q.codec + (q.fps ? '/' + q.fps : ''));
          if (hls.levels && hls.levels.length > 1) {
            hls.currentLevel = hls.levels.length - 1;
            var top = hls.levels[hls.levels.length - 1];
            set('hls.levelCodec', (top.attrs && top.attrs.CODECS) || top.videoCodec || 'multi?');
          }
        });
        hls.on(Hls.Events.ERROR, function (_, data) {
          if (data && data.fatal) self.recover();
        });
      }, function () {
        stat('attach.cdnFail'); // hls.js 脚本拉取失败（jsdelivr 不可达等）：赌一把原生解码
        if (self.state !== 'disposed') video.src = url;
      });
    },

    _destroyHls: function () {
      if (this._hls) {
        try { this._hls.destroy(); } catch (e) { }
        this._hls = null;
      }
    },

    // 错误恢复统一链（video error 与 hls fatal 共用）：
    // 同档备用 CDN → 重跑解析（sv 重取详情 / home 重解析）→ error 态
    recover: function () {
      var self = this;
      var video = this.video;
      var item = this.item;
      // 被移除的旧 video 闭包着活 slide：它的误事件不得驱动恢复链
      if (!slide.isConnected || !video || !video.isConnected) return;
      if (this._recovering) return; // video error 与 hls fatal 接连触发只处理一次
      // 后台不立即恢复：最小化期间分片停滞/解码器休眠抛出的偶发 error 多数回前台即自愈，
      // 立即 load() 会白白丢缓冲全量重拉（0.9.x「最小化回来视频重载」的一支）——
      // 挂起待回前台由 _onVis 复查后再决定补跑与否
      if (document.hidden) {
        this._recoverPending = true;
        stat('recover.deferred');
        return;
      }
      this._recovering = true;
      this.state = 'recovering'; // 内部态：dataset 保持原样，恢复成功由 playing 归位
      // 换 CDN/重解析都会重挂源（video.load 归零），先记下进度，playing 后 seek 回去。
      // 否则后台挂久回前台时 Chromium 偶发的解码错误会把视频打回开头重放。
      if (video.currentTime > 1) this.resumeAt = video.currentTime;
      if (item.urlIdx < item.urls.length - 1) {
        stat('recover.cdn');
        item.urlIdx++;
        this._attachSource(video);
        video.load();
        // video.load() 按规范置 paused：必须显式续播（旧实现漏了这一步，
        // 一直被「用户划走再划回会重播」掩盖成隐形卡死）
        if (self.idx === hooks.currentIdx() && !self.slide._userPaused) hooks.play(video);
        return;
      }
      if (!item.refreshed) {
        stat('recover.resolve');
        item.refreshed = true;
        if (item.cap.lazyResolve) item.urls = [];
        hooks.refreshItem(item).then(function (ok) {
          if (self.state === 'disposed') return;
          if (ok && item.urls.length) {
            item.urlIdx = 0;
            self._attachSource(video);
            video.load();
            if (self.idx === hooks.currentIdx() && !self.slide._userPaused) hooks.play(video);
          } else {
            self.setState('error');
          }
        });
        return;
      }
      stat('recover.error');
      this.setState('error');
    },

    _wire: function (video) {
      var self = this;
      // recover() 后台守卫的另一半：挂起的恢复请求回前台复查——给解码器 1.5s 自愈窗口，
      // 时间轴恢复推进/已暂停 = 后台偶发错误已自愈，作废挂起；仍卡死或带错误才补跑恢复链
      this._onVis = function () {
        if (self.state === 'disposed' || document.hidden || !self._recoverPending) return;
        self._recoverPending = false;
        var v = self.video;
        if (!v || !v.isConnected) return;
        var t0 = v.currentTime;
        setTimeout(function () {
          if (self.state === 'disposed' || self.video !== v || !v.isConnected) return;
          // readyState<3 = 缓冲饿死、hls 正在正常补片：交给 waiting 加载圈，不算卡死
          // （否则回前台一次普通补缓冲就会触发一次无谓的全量重拉）
          var stuck = !v.paused && !v.seeking && !v.ended && v.readyState >= 3 && v.currentTime <= t0;
          if (v.error || stuck) self.recover();
        }, 1500);
      };
      document.addEventListener('visibilitychange', this._onVis);
      video.addEventListener('playing', function () {
        if (self.state === 'disposed') return;
        clearTimeout(self._waitTimer);
        self._recovering = false; // 错误恢复链成功走完
        // 暂停标记不能只靠 setState('ready') 清：回滑/手动恢复时会话本就是 ready 态，
        // setState 幂等早退，残留 data-paused="1" 会让中央暂停图标盖住正常播放的画面
        slide.dataset.paused = '0';
        self.setState('ready');
        if (self.resumeAt) {
          try { video.currentTime = self.resumeAt; } catch (e) { }
          self.resumeAt = 0;
        }
        if (hooks.onPlaying) hooks.onPlaying(self, video);
      });
      video.addEventListener('pause', function () {
        if (self.state === 'disposed') return;
        slide.dataset.paused = '1';
        if (hooks.onPause) hooks.onPause(self, video);
      });
      video.addEventListener('waiting', function () {
        clearTimeout(self._waitTimer);
        self._waitTimer = setTimeout(function () {
          // 必须走内部态 'buffering' 而非直写 dataset：直写会让 session.state 停留在
          // 'ready'，seeked/playing 归位时被 setState 的同值守卫短路，转圈永远挂着
          if (self.state === 'disposed') return;
          self.state = 'buffering';
          slide.dataset.state = 'loading';
        }, 300);
      });
      // 恢复动作（0.1s 顶针）落在已缓冲区间时是「平滑 seek」：readyState 全程
      // HAVE_ENOUGH_DATA、无跳变 → 按规范只发 seeking/seeked、不发 playing——
      // 冻结期 waiting 已把状态打成 loading 的话，画面恢复后转圈会永远挂着（真机实测）。
      // seek 完成且未暂停 = 事实在播，直接归位
      video.addEventListener('seeked', function () {
        if (self.state === 'disposed' || self.state === 'error') return;
        if (!video.paused && video.readyState >= 2) self.setState('ready');
      });
      video.addEventListener('loadedmetadata', function () {
        if (hooks.onMeta) hooks.onMeta(self, video);
      });
      video.addEventListener('timeupdate', function () {
        if (!video.isConnected) return; // 幽灵元素不得写活 slide 的控制条
        if (hooks.onTime) hooks.onTime(self, video);
      });
      video.addEventListener('ended', function () {
        if (self.state === 'disposed') return;
        if (hooks.onEnded) hooks.onEnded(self);
      });
      video.addEventListener('error', function () {
        if (self.state === 'disposed') return;
        self.recover();
      });
    },

    dispose: function () {
      if (this.state === 'disposed') return;
      this.state = 'disposed';
      if (this._waitTimer) { clearTimeout(this._waitTimer); this._waitTimer = null; }
      if (this._onVis) { document.removeEventListener('visibilitychange', this._onVis); this._onVis = null; }
      this._destroyHls();
      if (this.monitor) { this.monitor.stop(); this.monitor = null; }
      if (slide._dmLayer) { slide._dmLayer.destroy(); slide._dmLayer = null; }
      var video = this.video;
      if (video) {
        video.pause(); video.removeAttribute('src'); video.load(); video.remove();
        this.video = null;
      }
      stat('session.dispose');
      // video 已从 DOM 拆除但对象仍持有 currentTime：观看历史上报要在离开时刻读最终进度，
      // 经此参数把拆前引用交给 player（钩子内不得再操作 video）
      if (hooks.onDisposed) hooks.onDisposed(this, video);
    }
  };
  return S;
}

// hls.js 构造参数（推荐模式）。缓冲档位用户可调（控制栏「缓冲」菜单 + 设置面板，0.9.89
// 收编进设置层 acsv.s.buf）；startFragPrefetch 让首片在 attach 阶段就预取，缩短出画时间。
// VOD 不碰 lowLatencyMode：它只对 LL-HLS 直播有意义。maxBufferSize 单位是字节
//（0.9.1 前误写 120 当 MB）
function bufConfig() {
  var key = getSetting('buf');
  var p = (key && CFG.buf.presets[key]) || CFG.buf.presets[CFG.buf.def];
  if (CFG.exp.smallBuf) p = CFG.buf.presets.std; // exp（仅 debug）：缩缓冲，排除内存压力因素
  return {
    enableWorker: !CFG.exp.noWorker, // exp.noWorker（仅 debug）：关转封装 worker，归因实验用
    startFragPrefetch: true, // attach 阶段预取首片
    nudgeMaxRetry: 10,       // 内部推帧重试次数提高
    maxBufferLength: p.maxBufferLength,    // 前向缓冲秒数：网络抖动/瞬时卡顿不易饿死
    maxMaxBufferLength: p.maxMaxBufferLength,
    maxBufferSize: p.maxBufferSize,        // 缓冲内存上限（字节）
    backBufferLength: p.backBufferLength   // 回看缓冲回收，压内存
  };
}

// ---------- HealthMonitor：会话的健康状态监测与恢复阶梯（v3，自 player.js 迁入） ----------
// FROZEN   时间轴在走但超过 gapFactor×理论帧间隔无新帧 = 解码卡住 → 恢复阶梯
// DEGRADED 渲染帧率 EMA 持续低于源帧率×degFpsRatio（或丢帧占比超限）= 慢放
//          → 主动同分辨率降帧率（v2 只在彻底冻死后才降，这里在"有点卡"时就降）
// rebuffer 时间轴也停了 = 网络/缓冲问题，交给 waiting 加载圈，不计冻结不走阶梯
// 恢复阶梯（rung 语义与 0.9.1 一致，仅触发更快）：
//   0.1s 顶针 → recoverMediaError → 同分辨率降帧率 → 降一档分辨率 → 重挂；
//   fixGap 门控 + cap 上限 + 持续 healthyMs 后尝试数衰减（一次抖动不永久消耗恢复次数）。
// 0.9.1 防线全保留：后台不检测 + 回前台重建基线；paused/seeking/ended 跳过；
// _qManual 关自动降档。无 rVFC 的浏览器不装（v2 在此环境下本就检测不到）。
function installHealthMonitor(S) {
  var slide = S.slide, video = S.video, item = S.item;
  if (!video.requestVideoFrameCallback) return null;
  var st = { mediaT: -1, frames: -1, wall: 0, gapSec: 0.2, arrival: 0, probes: 0, dropped: null, totalFrames: null,
             ema: 0, samples: 0, degSince: 0, lastFix: 0, lastEvent: Date.now(), lastTF: null, protectUntil: 0,
             returnAt: 0, lastRebuffer: 0, stopped: false };
  var armTimer = null;

  // 源帧率：cast 各档自带 fps；mock/缺省按 30fps（勿用 EMA 兜底——慢放判定会自我参照失效）
  function srcFps() {
    var q = item.qualities && item.qualities[item.qIdx];
    return (q && q.fps) || 30;
  }
  function disarm() { if (armTimer) { clearTimeout(armTimer); armTimer = null; } }
  function armTimeout() {
    if (st.stopped || armTimer) return;
    // 自校准：理论帧间隔 与 近期实际到帧间隔×2.5 取大者——低帧率流/慢放态下
    // 「帧来得慢」不会被误判成冻结；真冻结（完全无帧）仍在亚秒级检出
    st.gapSec = Math.max(CFG.stall.minGapMs,
      CFG.stall.gapFactor * 1000 / srcFps(), st.arrival * CFG.stall.arriveFactor) / 1000;
    armTimer = setTimeout(onGap, st.gapSec * 1000);
  }
  function arm() {
    if (st.stopped || armTimer) return;
    if (document.hidden || video.paused || video.seeking || video.ended || video.readyState < 2) return;
    armTimeout();
  }
  // 每帧调用的死亡判定（0.9.37 去掉逐帧 querySelector）：video 元素在会话存活期内
  // 不会被换——所有换绑路径（attachVideo/switchQuality/恢复链重挂）都先 dispose 本
  // 会话（st.stopped 短路在前），isConnected 足以覆盖 slide 被拆的残余场景
  function dead() { return st.stopped || S.state === 'disposed' || !slide.isConnected || !video.isConnected; }
  function stop() {
    st.stopped = true;
    disarm();
    if (st.keepIv) { clearInterval(st.keepIv); st.keepIv = null; }
    video.removeEventListener('playing', arm);
    video.removeEventListener('seeked', arm);
    document.removeEventListener('visibilitychange', visHandler);
  }

  // 兜底重武装：事件驱动武装有死角——「playing 事件只在暂停→播放沿触发」，视频从未暂停时
  // （如切回标签页基线重建后）一次误分类放弃武装就会永久失活。1s 巡检只负责 arm()，
  // 检测本身仍由帧间超时驱动（后台时 arm() 内被 hidden 守卫挡住，无开销）
  st.keepIv = setInterval(function () {
    if (dead()) { stop(); return; }
    arm();
  }, 1000);

  // 超时无帧：先分辨「解码冻结」与「缓冲饿死」。
  // 无基线（切回标签页/修复动作后）先探测：快照时间轴再复查。时间轴在走而帧没来
  // 需**连续两个探测窗确认**才进阶梯——真实冻结多付 ~1 个窗格延迟，换来对
  // 「可见但渲染偶发停顿」面板的免疫；任何真实帧到达都会清零探测计数。
  function onGap() {
    armTimer = null;
    if (dead()) { stop(); return; }
    if (document.hidden || video.paused || video.seeking || video.ended || video.readyState < 2) return; // keepalive 会重新 arm
    var adv = st.mediaT >= 0 ? video.currentTime - st.mediaT : -1;
    if (adv < st.gapSec * 0.3) {
      var now = Date.now();
      if (adv >= 0 && now - st.lastRebuffer > 5000) {
        stat('stall.rebuffer'); // 确认时间轴没走才是真缓冲
        st.lastRebuffer = now;
      }
      st.mediaT = video.currentTime; // 探测基线
      st.probes = 0;
      if (armTimer) clearTimeout(armTimer);
      armTimer = setTimeout(onGap, 1000); // 缓冲探测放宽到 1s，避免重缓冲期高频空转
      return;
    }
    st.probes = (st.probes || 0) + 1;
    if (st.probes < 2) {
      st.mediaT = video.currentTime;
      armTimeout();
      return;
    }
    // 回前台保护期内不进阶梯：最小化过的窗口合成器/解码器唤醒慢，帧恢复时序不确定——
    // 按缓冲探测同款放宽到 1s 重探，真实帧到达（onFrame）即清零一切；窗口过了仍无帧才算真冻结
    if (Date.now() < st.protectUntil) {
      st.probes = 0;
      st.mediaT = video.currentTime;
      armTimer = setTimeout(onGap, 1000);
      return;
    }
    st.probes = 0;
    var detectMs = st.wall ? Date.now() - st.wall : -1;
    recover(detectMs);
  }

  // 恢复阶梯：fixGap 门控 + cap 上限；进入恢复态（playing 事件归位 ready）
  function recover(detectMs) {
    var now = Date.now();
    if (now - st.lastFix < CFG.stall.fixGap) { armTimeout(); return; }
    st.lastFix = now;
    st.lastEvent = now;
    st.mediaT = -1; // 修复动作后重建基线
    st.degSince = 0;
    S.state = 'recovering'; // 内部态：dataset 保持原样
    stat('stall.frozen');
    if (detectMs < 0) stat('stall.novfc'); // 从未收到过 rVFC 帧：环境饿死，无法度量检测延迟
    else stat(detectMs < 800 ? 'stall.detectLt800' : 'stall.detectSlow');
    var fixCap = item.cap.quality ? CFG.stall.cap : CFG.stall.svCap;
    if (item._freezeTries >= fixCap) {
      if (!item._freezeGaveUp) {
        item._freezeGaveUp = true;
        toast('视频持续卡顿，已停止自动恢复');
        stat('stall.giveup');
      }
      armTimeout();
      return;
    }
    item._freezeTries = (item._freezeTries || 0) + 1;
    var tfNow = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality().totalVideoFrames : -1;
    // 第 1 次：0.1s 前跳顶针，强制解码管线重出帧，肉眼无感
    if (item._freezeTries === 1) {
      try { video.currentTime = Math.min(video.duration || 1e9, video.currentTime + CFG.stall.nudge); } catch (e) { }
      if (tfNow >= 0) st.lastTF = tfNow;
      armTimeout();
      return;
    }
    // 第 2 次：recoverMediaError 重置解码管线，不丢缓冲、不重新拉流
    if (item._freezeTries === 2 && S._hls && S._hls.recoverMediaError) {
      try { S._hls.recoverMediaError(); } catch (e) { }
      if (tfNow >= 0) st.lastTF = tfNow;
      armTimeout();
      return;
    }
    // 幻影冻结防护：两次恢复之间解码帧仍在明显推进（totalVideoFrames 增量 > 2s 帧量）
    // = 视频实际在正常出帧，只是 rVFC 被环境饿死——破坏性动作（降档/重挂）全部叫停，
    // 只回退计数。顶针/recoverMediaError 无害，保持响应
    if (item._freezeTries >= 2 && tfNow >= 0 && st.lastTF != null && tfNow - st.lastTF > srcFps() * 2) {
      stat('stall.phantom');
      item._freezeTries = 0;
      st.lastTF = tfNow;
      st.lastFix = now;
      st.lastEvent = now;
      armTimeout();
      return;
    }
    if (tfNow >= 0) st.lastTF = tfNow;
    // 第 3 次：优先降帧率不降分辨率（1080P60 → 1080P），观感损失最小
    if (dropFpsRung('播放卡顿，已切换到 ', 'stall.rung3')) return;
    // 第 4 次：降一档分辨率
    if (canAutoQ()) {
      toast('播放卡顿，已自动切换到 ' + item.qualities[item.qIdx + 1].label);
      stat('stall.rung4');
      S.hooks.qualitySwitch(S, item.qIdx + 1);
      return;
    }
    // 档位到底/用户锁档：recoverMediaError 与整会话重挂**交替**走——rME 只重置 MSE 管线
    // （治坏分片/解码配置错），治不了 video 元素/解码器楔死（后台往返的冻结多属此类），
    // 只有重挂换全新元素才有机会；奇数次先重挂（强手段优先）。无 hls 直链只能重挂
    if (S._hls && S._hls.recoverMediaError && item._freezeTries % 2 === 0) {
      stat('stall.tailRme');
      try { S._hls.recoverMediaError(); } catch (e) { }
      armTimeout();
      return;
    }
    stat('stall.tailReattach');
    // 进度必须走 slide._resumeAt 槽位：attachVideo 只认槽位，写 S.resumeAt 新会话读不到（进度归零）
    S.slide._resumeAt = video.currentTime;
    S.hooks.reattach(S); // attachVideo → 本会话 dispose → 新会话接管
  }

  // 自动降档前提五条件（recover 阶梯与慢放判定共用，原两处逐行重复 0.9.35 收敛）
  function canAutoQ() {
    return !item._qManual && item.cap.quality && item.qualities
      && item.qualities.length > 1 && item.qIdx < item.qualities.length - 1;
  }
  // 同分辨率降帧率（1080P60 → 1080P）：label 可能带编码后缀（1080P60·HEVC），
  // 60 后面允许 · 或结尾。阶梯第 3 级与慢放判定共用，找到即切并返回 true
  function dropFpsRung(toastHead, statKey) {
    if (!(canAutoQ() && /60(·|$)/.test(item.qualities[item.qIdx].label))) return false;
    var curLabel = item.qualities[item.qIdx].label;
    for (var q = item.qIdx + 1; q < item.qualities.length; q++) {
      if (item.qualities[q].label === curLabel.replace(/60(?=·|$)/, '')) {
        toast(toastHead + item.qualities[q].label + '（同分辨率降帧率）');
        stat(statKey);
        S.hooks.qualitySwitch(S, q); // 换档 → 新会话接管，本监视器随 dispose 停止
        return true;
      }
    }
    return false;
  }

  // 慢放：解码没死但帧率撑不住。顶针/recoverMediaError 治不了，直接走降帧率档；
  // 无帧率档可降或用户锁档时只提示，不擅动分辨率
  function onDegraded() {
    if (Date.now() < st.protectUntil) return; // 回前台保护期：合成器唤醒慢帧来得稀≠慢放
    stat('stall.degraded');
    var now = Date.now();
    if (now - st.lastFix < CFG.stall.fixGap) return;
    st.lastFix = now;
    st.lastEvent = now;
    st.degSince = 0;
    S.state = 'recovering';
    if (dropFpsRung('持续掉帧，已降为 ', 'stall.degradeDown')) return;
    if (!item._qManual) toast('画面持续掉帧，可尝试在清晰度菜单降低档位');
  }

  // 每帧回调：更新帧率 EMA/丢帧占比 → DEGRADED 判定 + 阶梯回退；并重新武装 FROZEN 超时
  function onFrame(now, meta) {
    if (dead()) { stop(); return; }
    video.requestVideoFrameCallback(onFrame); // 先续排队：模拟缝短路时也不断流（句柄无需保存，stop 靠标志位退出）
    var m2 = meta;
    if (__ACSV_DEBUG__ && stallSim === 'frozen') return; // 冻结模拟：帧数据不再送达
    if (__ACSV_DEBUG__ && stallSim === 'slow') {
      // 慢放模拟：只放行 1/4 帧回调（拉开到帧间隔 ~133ms）且帧计数 +1 递增，
      // 两件事合成「约 7.5fps 渲染」——只做其中一件都会被真实帧率抵消
      if (++slowSkip & 3) return;
      slowFrames++;
      m2 = { presentedFrames: slowFrames, mediaTime: meta.mediaTime };
    }
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    st.probes = 0; // 真实帧到达：探测链清零
    var wall = Date.now();
    // 归因关键指标：回前台到首个真实帧的耗时。反复 >2000ms = 真楔死（看门狗该出手）；
    // 反复 <1000ms 却仍被判冻 = 监视器误判（脚本锅实锤）
    if (st.returnAt) { set('vis.framesBackMs', wall - st.returnAt); st.returnAt = 0; }
    if (st.wall) {
      var dArr = wall - st.wall;
      if (dArr > 0 && dArr < 2000) st.arrival = st.arrival ? st.arrival * 0.7 + dArr * 0.3 : dArr;
      var inst = (m2.presentedFrames - st.frames) * 1000 / Math.max(1, wall - st.wall);
      if (isFinite(inst) && inst > 0 && inst <= 240) {
        st.ema = st.samples ? st.ema * (1 - CFG.stall.fpsEmaA) + inst * CFG.stall.fpsEmaA : inst;
        st.samples++;
      }
      var dropRatio = 0;
      if (video.getVideoPlaybackQuality) {
        var qv = video.getVideoPlaybackQuality();
        if (st.totalFrames != null) {
          var df = qv.droppedVideoFrames - st.dropped, tf = qv.totalVideoFrames - st.totalFrames;
          if (tf > 0) dropRatio = Math.max(0, df) / tf;
        }
        st.dropped = qv.droppedVideoFrames;
        st.totalFrames = qv.totalVideoFrames;
      }
      if (!video.paused && !video.seeking && st.samples >= 8) {
        var slowNow = st.ema < srcFps() * CFG.stall.degFpsRatio || dropRatio > CFG.stall.degDropRatio;
        if (slowNow) {
          if (!st.degSince) st.degSince = wall;
          else if (wall - st.degSince >= CFG.stall.degWindowMs) onDegraded();
        } else st.degSince = 0;
      }
      // 阶梯回退：距上次恢复动作 healthyMs 无事件 → 返还一次尝试数
      if (item._freezeTries > 0 && wall - st.lastEvent >= CFG.stall.healthyMs) {
        item._freezeTries--;
        stat('stall.decay');
        st.lastEvent = wall;
      }
    }
    st.frames = m2.presentedFrames;
    st.mediaT = m2.mediaTime;
    st.wall = wall;
    armTimeout();
  }

  // 后台→前台：rVFC 与计时器恢复顺序不确定，回前台重建基线再武装（0.9.1 误伤修复）。
  // 同时开保护期（visGraceMs）：Chromium 最小化往返后合成器/GPU 解码器唤醒慢，
  // 常见 1~2s 不出帧而时间轴照走——立刻武装必然误判冻结进阶梯（降档/重拉流的根源）
  var visHandler = function () {
    if (dead()) { stop(); return; }
    if (document.hidden) { disarm(); return; }
    st.mediaT = -1;
    st.samples = 0; st.ema = 0; st.degSince = 0;
    st.dropped = null; st.totalFrames = null;
    st.protectUntil = Date.now() + CFG.stall.visGraceMs;
    st.returnAt = Date.now(); // 回前台帧恢复耗时测量起点（首个 rVFC 帧结算 vis.framesBackMs）
    stat('vis.return');
    // 回前台 = 新故障域：上个可见期消耗的阶梯尝试/放弃标记清零，重新拿满预算——
    // _freezeGaveUp 原本跨后台周期永久生效，曾与锁档/到底档的末段构成
    // 「永久冻结只放音频」死局；单个可见期内自动降档不清计数的防走楼梯语义不变
    item._freezeTries = 0;
    item._freezeGaveUp = false;
    disarm();
    arm();
  };
  document.addEventListener('visibilitychange', visHandler);
  video.addEventListener('playing', arm);
  video.addEventListener('seeked', arm);
  video.requestVideoFrameCallback(onFrame);
  arm();
  return { stop: stop };
}

// debug 冻结/慢放模拟缝：__ACSV_TEST__.call('setStallSim','frozen'|'slow'|'off')。
// frozen=帧数据不再送达（currentTime 照走）；slow=帧计数伪装 1/4 速率（EMA 跌向慢放区）
var stallSim = 'off', slowFrames = 0, slowSkip = 0;
testHook('setStallSim', function (m) {
  stallSim = m || 'off';
  slowFrames = 0;
  slowSkip = 0;
});
