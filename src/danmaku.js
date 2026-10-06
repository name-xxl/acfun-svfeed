import { AppAPI } from './appapi.js';
import { DmCanvas } from './dmcanvas.js';
import { el, toast } from './ui.js';
import { getSetting, setSetting, onChange } from './settings.js';

// ---------- 弹幕编排：拉取/缓存/开关/发送/输入框 ----------
// 渲染在 dmcanvas（每 slide 一个 Canvas 图层）；数据走 PC 站弹幕接口（网页 Cookie）。
// 发送框常驻内嵌于控制栏，不折叠（用户明确不要折叠入口）：Enter 发送，Esc 失焦。

var DM_CACHE_MAX = 30; // 只留最近看过的 videoId：长会话不至于积攒几百份弹幕数组
var cache = new Map(); // videoId → Promise<规整弹幕列表>；失败不占缓存
// 弹幕默认开关（0.9.89 收编）：老键 acsv-dm-on 由 settings 首读收养；设置面板改动即时生效
var enabled = getSetting('dmDefault');
onChange('dmDefault', function (v) { enabled = v; });

export function dmEnabled() { return enabled; }

export function setDmEnabled(on) {
  enabled = !!on;
  setSetting('dmDefault', enabled);
}

function fetchList(videoId) {
  var hit = cache.get(videoId);
  if (hit) {
    cache.delete(videoId); // 触达挪到队尾：Map 迭代按插入序，等价 LRU
    cache.set(videoId, hit);
    return hit;
  }
  var p = AppAPI.danmakuList(videoId).then(null, function () {
    cache.delete(videoId); // 失败不缓存：下次进入重试，避免一次网络抖动该视频永远没弹幕
    return [];
  });
  cache.set(videoId, p);
  if (cache.size > DM_CACHE_MAX) cache.delete(cache.keys().next().value);
  return p;
}

// video 开始播放时由 player 调：绑图层、拉列表
export function onPlaying(slide, item, video) {
  if (!slide || !item || !item.cap || !item.cap.danmaku || !item.videoId) return;
  if (!slide._dmLayer) slide._dmLayer = DmCanvas.create(slide, video);
  var layer = slide._dmLayer;
  if (!enabled) { layer.stop(); stopAdvPump(layer); return; }
  layer.start();
  fetchList(item.videoId).then(function (list) { layer.setItems(list); });
  startAdvPump(layer, item, video);
}

// 清晰度切换/重挂后的图层重建不在此处：旧会话 dispose 销毁 _dmLayer，onPlaying 再建
export function stopAll() { DmCanvas.stopAll(); stopAdvPump(null); }

// ---------- 高级弹幕取池：跟播放头增量拉窗口（0.9.204） ----------
// 为什么不是"进页全量扫"：高级弹幕**只有** pollByPosition 能给（list 链路带 enableAdvanced 也一条不返回，
// §10.13），而真机样本稿 1912s ÷ 20s 窗口 = 96 段——全量扫等于进页连打上百发请求。
// 原生播放器就是增量拉：拉「播放头所在窗口」，播到窗口尾前再拉下一段；seek 由下一次 tick 自然补齐。
var ADV_WIN = 20000;      // 单窗口宽度（ms，与原生轮询节奏一致）
var ADV_PREFETCH = 5000;  // 距窗口尾这么多就预取下一段（播放不断档）
var ADV_MAX_WIN = 200;    // 单次会话窗口上限（防病态循环；32 分钟稿整片看完约 96 段）
var pumps = [];

function findPump(layer) {
  for (var i = 0; i < pumps.length; i++) if (pumps[i].layer === layer) return pumps[i];
  return null;
}
function stopAdvPump(layer) { // layer 传 null = 全部停
  pumps = pumps.filter(function (p) {
    if (layer && p.layer !== layer) return true;
    clearInterval(p.timer);
    return false;
  });
}
function startAdvPump(layer, item, video) {
  stopAdvPump(layer);
  var st = { layer: layer, timer: 0, start: -1, end: -1, inflight: false, wins: 0 };
  pumps.push(st);
  function pull(from) {
    if (st.inflight || st.wins >= ADV_MAX_WIN) return;
    st.inflight = true;
    st.wins++;
    AppAPI.danmakuAdvanced(item.videoId, from, from + ADV_WIN).then(function (list) {
      st.inflight = false;
      if (!findPump(st.layer)) return; // 图层已销毁（切条/dispose）：丢弃结果
      st.start = from;
      st.end = from + ADV_WIN;
      st.layer.addAdvanced(list);
    }, function () { st.inflight = false; });
  }
  st.timer = setInterval(function () {
    if (!findPump(st.layer)) { clearInterval(st.timer); return; } // 已被停：自清
    if (!st.layer.isRunning || !st.layer.isRunning()) return;      // 弹幕被关掉：不继续打请求
    if (video.paused || video.ended) return;                       // 暂停/播完不拉（恢复播放后下一 tick 接上）
    var t = video.currentTime * 1000;
    if (st.start < 0 || t < st.start || t >= st.end) {              // 首次进入 / seek 落到别的窗口
      pull(Math.floor(t / ADV_WIN) * ADV_WIN);
      return;
    }
    if (t >= st.end - ADV_PREFETCH) pull(st.end);                  // 快到窗口尾：预取下一段
  }, 1500);
}

// ---- 常驻发送框（内嵌控制栏，不折叠；Enter 发送，Esc 失焦） ----
export function createDmBox(item, videoOf) {
  var box = el('div', 'acsv-dmbox');
  var input = el('input', 'acsv-dm-input');
  input.type = 'text';
  input.maxLength = 100;
  input.placeholder = '发个弹幕呗，嗷嗷';
  var send = el('button', 'acsv-dm-send', '发送');
  box.appendChild(input);
  box.appendChild(send);
  box.addEventListener('click', function (ev) { ev.stopPropagation(); });

  var sending = false;
  function doSend() {
    var video = videoOf();
    var text = (input.value || '').trim();
    if (!text || !item.videoId || sending || !video) return;
    sending = true;
    var at = video.currentTime * 1000 + 200;
    AppAPI.danmakuAdd(item, text, at).then(function (r) {
      sending = false;
      if (!r || !r.ok) {
        toast('弹幕发送失败' + (r && r.msg ? '：' + r.msg : '（未登录？）'));
        return;
      }
      toast('弹幕已发送');
      input.value = '';
      var slide = video.closest && video.closest('.acsv-slide');
      if (slide && slide._dmLayer) {
        slide._dmLayer.addLocal({ text: text, at: at, mode: 1, color: '#ffffff', size: 25 });
      }
    });
  }
  input.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter') doSend();
    else if (ev.key === 'Escape') { ev.stopPropagation(); input.blur(); }
  });
  send.addEventListener('click', function (ev) { ev.stopPropagation(); doSend(); });
  return box;
}
