// ---------- 播放质量策略（从 appapi.js 剥离的纯播放侧逻辑） ----------
// 只依赖 CFG + localStorage 偏好，不碰网络——APP 接口层负责取档位，这里负责选档位。
import { CFG } from './cfg.js';

// 按记忆清晰度（无记忆取最高档；档位已在 playInfo 显式按分辨率数字降序）。
// 先按编码偏好过滤档位：avc 滤掉 HEVC 档（cast 对部分设备/未来 4K 档可能下发
// HEVC，默认 avc 是防无硬解卡帧的保底）；hevc 反之只留 HEVC 档；auto 不干预。
// 过滤后无匹配（如强 HEVC 但视频纯 H.264）则保留全集回落。
// 编码过滤始终从 playInfo 全集出发并留档 _qualitiesAll（0.9.34）：直接在 qualities
// 上过滤是永久收窄，二次调用会把上一轮的结果再砍一刀，偏好切回时档位找不回来
export function applyQuality(item) {
  if (!item.qualities || !item.qualities.length) return;
  var all = item.qualities;
  item._qualitiesAll = all;
  var pref = null;
  try { pref = localStorage.getItem(CFG.lsCodec); } catch (e) { }
  if (pref !== 'auto' && pref !== 'hevc') pref = CFG.codec.def;
  if (pref !== 'auto') {
    var hit = all.filter(function (x) { return x.codec === pref; });
    item.qualities = hit.length ? hit : all;
  }
  // exp.q30（仅 debug）：滤掉 60fps 档模拟主站默认解码负载——归因实验用
  if (CFG.exp.q30) {
    var lo = item.qualities.filter(function (x) { return !(x.fps > 30); });
    if (lo.length) item.qualities = lo;
  }
  var label = null;
  try { label = localStorage.getItem(CFG.lsQuality); } catch (e) { }
  var idx = 0;
  if (label) {
    for (var i = 0; i < item.qualities.length; i++) {
      if (item.qualities[i].label === label) { idx = i; break; }
    }
  }
  item.qIdx = idx;
  item.urls = item.qualities[idx].urls;
  item.urlIdx = 0;
}
