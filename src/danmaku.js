import { CFG } from './cfg.js';
import { AppAPI } from './appapi.js';
import { DmCanvas } from './dmcanvas.js';
import { el, toast } from './ui.js';

// ---------- 弹幕编排：拉取/缓存/开关/发送/输入框 ----------
// 渲染在 dmcanvas（每 slide 一个 Canvas 图层）；数据走 PC 站弹幕接口（网页 Cookie）。
// 输入框参考抖音：内嵌在控制栏内，点「发弹」横向展开，点外部/Esc 收起。

var cache = {}; // videoId → Promise<规整弹幕列表>
var enabled = true;
try { enabled = localStorage.getItem(CFG.lsDm) !== '0'; } catch (e) { }

export function dmEnabled() { return enabled; }

export function setDmEnabled(on) {
  enabled = !!on;
  try { localStorage.setItem(CFG.lsDm, on ? '1' : '0'); } catch (e) { }
}

function fetchList(videoId) {
  if (!cache[videoId]) {
    cache[videoId] = AppAPI.danmakuList(videoId).then(null, function () { return []; });
  }
  return cache[videoId];
}

// video 开始播放时由 player 调：绑图层、拉列表
export function onPlaying(slide, item, video) {
  if (!slide || !item || item.kind !== 'home' || !item.videoId) return;
  if (!slide._dmLayer) slide._dmLayer = DmCanvas.create(slide, video);
  var layer = slide._dmLayer;
  if (!enabled) { layer.stop(); return; }
  layer.start();
  fetchList(item.videoId).then(function (list) { layer.setItems(list); });
}

// 清晰度切换/重挂后 video 元素换了：销毁旧图层重绑
export function rebind(slide, item, video) {
  if (slide._dmLayer) { slide._dmLayer.destroy(); slide._dmLayer = null; }
  onPlaying(slide, item, video);
}

export function stopAll() { DmCanvas.stopAll(); }

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
