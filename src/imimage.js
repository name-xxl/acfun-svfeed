// ---------- 私信图片管线（0.9.266 自 imsend.js 拆出） ----------
// 本模块 = 字节管线（midground 令牌 / blob LRU / 下载队列 / 在飞去重 / Cookie 鉴权）
// + URL 换链（ks:// → 官方 download 直链 / raw proto 手解 / 参数白名单）。
// 消费方 imdrawer.js；不 import imsend.js（与发送核心零回边）。纯搬迁零逻辑改动。
// ----------

import { CFG } from './cfg.js';
import { swallow } from './dbg.js';
import { gmRequest } from './net.js';
import { cookieVal, selfUid } from './ui.js';

// midground 服务令牌：IM 网关（message.acfun.cn）下载鉴权凭据。本页没有它的会话 Cookie
//（只有官方页访问过才有，浏览器重开即失——渲染 401 的根因），走 id.app.acfun.cn 的
// token/get 现换一枚（GM 带域 Cookie，未登录 -401）拼进下载 URL query（SDK 上传同款姿势）。
// 单飞 + 模块缓存；失败清缓存允许下次重取
var mgTokenP = null;
function midgroundToken(refresh) {
  if (!mgTokenP || refresh) {
    mgTokenP = gmRequest({
      method: 'POST',
      url: CFG.api.token, // 0.9.106 收口：此前内联硬编码与 cfg 重复一份（appapi 同端点）
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'sid=acfun.midground.api',
      timeout: CFG.time.gm
    }).then(function (j) {
      var t = j && j['acfun.midground.api_st'];
      if (!t) { mgTokenP = null; return ''; }
      return String(t);
    }, function () { mgTokenP = null; return ''; });
  }
  return mgTokenP;
}

// ---------- 图片字节：LRU 缓存 + 限流下载 ----------
// blob objectURL 的 LRU 缓存（key=资源本体：imgCacheKey 取 resourceId，缺则退整串 URL）：重开/来回切会话不再全量重下，命中直接秒显；
// 淘汰时 revoke，顺带修掉旧版 objectURL 永不回收的泄漏。查询在令牌之前——命中连 token/get
// 往返都省。已上屏的 blob 被 revoke 不影响显示（已解码位图仍在 img 里）
var imgBlobCache = new Map();
var IMG_BLOB_CACHE_MAX = 30;
function cacheBlobPut(url, blobUrl) {
  imgBlobCache.delete(url); // delete+set 搬队尾：命中即续命（LRU）
  imgBlobCache.set(url, blobUrl);
  while (imgBlobCache.size > IMG_BLOB_CACHE_MAX) {
    var k = imgBlobCache.keys().next().value;
    var u = imgBlobCache.get(k);
    imgBlobCache.delete(k);
    try { URL.revokeObjectURL(u); } catch (e0) { /* best-effort: cleanup */ }
  }
}

// 下载并发上限：快滚长历史时也只保持 3 个在途 GM 请求，互不挤占带宽（FIFO 配对队列）
var imgQ = [], imgActive = 0, IMG_Q_LIMIT = 3;
function runQueuedImg(it) {
  it[0]().then(function (v) { imgActive--; pumpImgQ(); it[1](v); },
    function (e) { imgActive--; pumpImgQ(); it[2](e); });
}
function pumpImgQ() {
  while (imgActive < IMG_Q_LIMIT && imgQ.length) runQueuedImg(imgQ.shift());
}
function enqueueImg(job) {
  return new Promise(function (resolve, reject) {
    imgQ.push([job, resolve, reject]);
    pumpImgQ();
  });
}

// 在飞去重：同 URL 的并发调用（气泡加载中又点开大图）共享同一次下载
var imgInflight = new Map();

// 缓存 key 取资源本体（resourceId）而非完整 URL：重开会话内核换链可用性不定（0.9.41
// 「零会话依赖三级兜底」的同款前提），同一张图在「内核形态」与「本地拼装」两条路下
// URL 参数不同（userId/did/imsdkver 有无），按整串 URL 做 key 两条路互不命中——真机
// 首验「非秒出」的根因。两类形态产物都必带 resourceId 参数
function imgCacheKey(url) {
  var m = /[?&]resourceId=([^&]+)/.exec(url);
  return m ? m[1] : url;
}

// 只读窥缓存（不触发下载/令牌）：渲染路径同步命中直接上屏，免 IntersectionObserver
// 一拍延迟也不闪微光
export function peekImImageBlob(url) {
  var key = imgCacheKey(url);
  var hit = imgBlobCache.get(key);
  if (hit) cacheBlobPut(key, hit);
  return hit || null;
}

// 图片字节拉取：下载端按 Cookie 里的 midground 令牌鉴权（直链跨站没这张 Cookie 必 401，
// query 里带实测不认）。流程：查缓存/在飞 → id.app.acfun.cn token/get 现换令牌 → 写进
// .acfun.cn 父域 Cookie（message.acfun.cn 无自己的 host 级同名 Cookie 时即采用；本页可写
// 父域）→ GM 带 Cookie 拉字节换 blob。首拉不带 buster 让浏览器 HTTP 缓存跨刷新生效；
// 令牌被拒则强刷一枚、带 buster 重试一次（防命中可能已中毒的缓存响应）。
// 失败统一 null（降级 [图片] 文本）
export function fetchImImageBlob(url) {
  var key = imgCacheKey(url);
  var hit = imgBlobCache.get(key);
  if (hit) { cacheBlobPut(key, hit); return Promise.resolve(hit); }
  var flying = imgInflight.get(key);
  if (flying) return flying;
  function setMgCookie(tk) {
    if (!tk) return;
    try {
      document.cookie = 'acfun.midground.api_st=' + tk
        + '; domain=.acfun.cn; path=/; max-age=86400; SameSite=None; Secure';
    } catch (e0) { /* best-effort: storage */ }
  }
  function once(bust) {
    var u = bust ? url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now() : url;
    return enqueueImg(function () {
      return gmRequest({ url: u, timeout: CFG.time.gm, responseType: 'arraybuffer', okStatus: true });
    });
  }
  function toBlob(buf) {
    try { return (buf && buf.byteLength) ? URL.createObjectURL(new Blob([buf])) : null; }
    catch (e) { return null; }
  }
  var p = midgroundToken(false).then(function (tk) {
    setMgCookie(tk);
    return once(false);
  }, function () { return once(false); }).then(toBlob, function () {
    // 401/网络错：令牌可能过期，强刷一枚重写 Cookie 再试一次
    return midgroundToken(true).then(function (tk) {
      setMgCookie(tk);
      return once(true);
    }, function () { return once(true); }).then(toBlob, function () { return null; });
  }).then(function (blobUrl) {
    imgInflight.delete(key); // 链路终态恒 resolve（失败也是 null），清在飞允许下次重试
    if (blobUrl) cacheBlobPut(key, blobUrl);
    return blobUrl;
  });
  imgInflight.set(key, p);
  return p;
}

// 令牌预热：开抽屉即单飞换好令牌并缓存；Cookie 由首次 fetchImImageBlob 的 setMgCookie 写入。
// 进会话首图因此免去 token/get 串行往返。midgroundToken 单飞缓存本身幂等，缓存命中时
// 此令牌用不上也无副作用。
export function prewarmIm() {
  midgroundToken(false);
}

// ---------- 图片 URL 换链管线（0.9.163 自 imdrawer.js 迁入：纯 URL/协议规则，与上方图片字节管线同族） ----------
// ks:// 资源 → 官方 download 直链（message.acfun.cn，参数白名单官方形态，无 token）。
// 零会话依赖三级兜底（重开会话后内核 decodeContent/file 配置都不保证就绪，首次能渲染
// 重开挂车的前车之鉴）：uri 取 m.url → rawMsg.content 手解 proto 字段 1；URL 取内核换链
// → 本地拼装（resourceId 从 ks:// 尾段、userId/did 取本端 Cookie）
// inst=最近一次轮询的 IM 实例（抽屉侧 lastImInst 传入）——内核换链/config 读它，
// 不再依赖抽屉模块态（0.9.163 私有签名随迁调整，机器比对在案）
export function imageUrlOf(m, inst) {
  var ks = '';
  try { ks = (m && (m.url || (m.imageAttachment && m.imageAttachment.uri))) || ''; } catch (e0) { /* best-effort: parse */ }
  if (!ks) ks = imageUriFromRaw(m);
  if (!ks) { console.warn('[acsv-im] 图片消息无 uri（decode 与 raw 均未恢复）'); return ''; }
  if (!/^ks:\/\//.test(ks)) return officialize(ks);
  try {
    var k = inst && inst.kernel;
    if (k && k.file && k.file.resourceUrlToHttpUrl) {
      var u = officialize(k.file.resourceUrlToHttpUrl(ks, false, Number(m.width) || 0, Number(m.height) || 0));
      if (u) return u;
    }
  } catch (e) { swallow(e, 'imsend'); }
  try {
    // ks://<resourceId>[/<数字尾缀>]：官方页 DOM 实测形态（data-text="ks://xxx.jpg/1"），
    // resourceId = 去掉 ks:// 后再剥尾缀的主段（官方 widget 同款 /\/\w+$/ 尾缀语义）
    var rid = ks.slice(5).replace(/\/\w+$/, '');
    if (!rid) { console.warn('[acsv-im] ks 资源串形态不识别:', ks.slice(0, 60)); return ''; }
    var ver = '';
    try {
      var cfgk = inst && inst.kernel && inst.kernel.config;
      ver = (cfgk && (cfgk.imsdkver || cfgk.sdkVersion)) || '';
    } catch (e2) { /* best-effort: sdk */ }
    return CFG.api.imDownloadBase + '/rest/v2/app/download?resourceId=' + encodeURIComponent(rid)
      + '&userId=' + encodeURIComponent(selfUid())
      + '&did=' + encodeURIComponent(cookieVal('_did') || '')
      + '&kpn=ACFUN_APP&platform=H5' + (ver ? '&imsdkver=' + encodeURIComponent(ver) : '');
  } catch (e3) { return ''; }
}
// Image proto 字段 1（uri, string）手解：tag 0x0A + varint 长度 + 字节（uri 为 ASCII）。
// 内核 decodeContent 没跑（重开会话的缓存消息）时从这里恢复 uri
function imageUriFromRaw(m) { // （私有，仅 imageUrlOf 兜底用）
  try {
    var buf = m && m.rawMsg && m.rawMsg.content;
    if (!buf) return '';
    var u8 = new Uint8Array(buf), i = 0;
    if (u8[i++] !== 0x0a) return '';
    var len = 0, shift = 0, b;
    do { b = u8[i++]; len += (b & 0x7f) * Math.pow(2, shift); shift += 7; } while (b & 0x80);
    if (!len || i + len > u8.length) return '';
    var s = '';
    for (var j = 0; j < len; j++) s += String.fromCharCode(u8[i + j]);
    return (/^ks:\/\//.test(s) || /^https?:\/\//.test(s)) ? s : '';
  } catch (e) { return ''; }
}
// 把 /rest/v2/app/download 产物改写成 message.acfun.cn 官方参数形态：剥 token 与 w/h
//（sixinpic 域 401 的教训：acfun token 在该域不认，官方形态免 token），参数白名单对齐
// 官方页抓包（resourceId/userId/did/kpn/imsdkver/platform）
function officialize(httpUrl) {
  try {
    if (!httpUrl || !/^https?:\/\//.test(httpUrl)) return '';
    var u = new URL(httpUrl);
    var rid = u.searchParams.get('resourceId');
    if (!rid) return '';
    var q = ['resourceId', 'userId', 'did', 'kpn', 'imsdkver', 'platform']
      .map(function (k) {
        var v = u.searchParams.get(k);
        return v == null ? null : k + '=' + encodeURIComponent(v);
      })
      .filter(Boolean).join('&');
    return CFG.api.imDownloadBase + '/rest/v2/app/download?' + q;
  } catch (e) { return ''; }
}
