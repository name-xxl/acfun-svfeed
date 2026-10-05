import { CFG } from './cfg.js';
import { request } from './net.js';

// ---------- 频道域（0.9.169 精选页分区流）：传输 + 回包规整 ----------
// 实测 docs/api-research.md §6.7（2026-10-05 内置浏览器 + curl 免登录双验）：
//   allChannels：免登录、无参 POST → 完整频道树 channels[]{channelId,name,channelType,children[]}；
//     文章(63, channelType=1)与 AC正义(177)非视频域 → channelTreeOf 剔除，出视频分区 chips。
//   channel/secondLevel/resourceList：**分区视频流正主**——channelId 主频道过滤实锤（杂质率
//     ~1/28 疑跨区投稿口径，条目自带 channel{id,name,parentId,parentName} 可本地复核再滤）；
//     count 无效钉死 ~30/块；pcursor 页码方言首页 "0"、续页回 "{n},{n}" 双值单调；**终页形态
//     未测**——规整按「pcursor 缺失/空 或 整页空 ⇒ 到底」收口，total 恒 10000 假封顶不可当总数。
// 不 import playitem/视图（域归域）；条目是视频卡家族（dougaId/caption/coverUrl/…），转播放
// 契约由消费方经 relatedItemOf（relatedapi）完成。

var FORM_TYPE = { 'Content-Type': 'application/x-www-form-urlencoded' };

// 非视频域剔除：文章（channelType=1）与 AC正义（频道树实测在册）。id 单源在此，
// 视图/单测同读本表（§6.7 频道树：13 主频道里唯二不可作视频墙的）
var NON_VIDEO = { 63: 1, 177: 1 };

// 频道树 → 视频 chips 数据 [{id, name}]（channelType 全 2 的才收；顺序=服务端树序，
// 实测：动画1/音乐58/舞蹈·偶像123/游戏59/娱乐60/生活201/科技70/影视68/体育69/番剧155/鱼塘125）
export function channelTreeOf(j) {
  var out = [];
  var channels = (j && j.channels) || [];
  for (var i = 0; i < channels.length; i++) {
    var c = channels[i] || {};
    var id = Number(c.channelId) || 0;
    if (!id || NON_VIDEO[id]) continue;
    if (c.channelType === 1) continue; // 文章域
    out.push({ id: id, name: String(c.name || '') });
  }
  return out;
}

export function listChannels() {
  return request(CFG.api.channelAll, 'POST', FORM_TYPE, '').then(channelTreeOf);
}

// 回包 → { items:[dougaFeedView 原始卡], nextCursor, noMore }。本地复核滤杂质：条目
// channel.parentId 与请求的 channelId 不符（跨区投稿口径）丢弃——宁漏不错，卡面频道标
// 与 chips 语义必须一致
export function channelPageOf(j, channelId) {
  if (!j || j.result !== 0) throw new Error('channel-' + ((j && j.result) || 'null'));
  var feed = j.feed || [];
  var out = [];
  for (var i = 0; i < feed.length; i++) {
    var dv = feed[i] || {};
    var id = dv.dougaId != null ? dv.dougaId : dv.contentId;
    if (id == null) continue;
    var ch = dv.channel || null;
    if (channelId != null && ch && ch.parentId != null && Number(ch.parentId) !== Number(channelId)) continue;
    out.push(dv);
  }
  var cur = j.pcursor;
  var noMore = !out.length || cur == null || cur === '' || cur === 'no_more';
  return { items: out, nextCursor: noMore ? null : String(cur), noMore: noMore };
}

export function listChannelFeed(channelId, pcursor) {
  return request(CFG.api.channelResourceList, 'POST', FORM_TYPE,
    'channelId=' + encodeURIComponent(channelId) + '&pcursor=' + encodeURIComponent(pcursor || '0'))
    .then(function (j) { return channelPageOf(j, channelId); });
}
