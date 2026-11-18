// ---------- 图片上传（0.9.38 自 appapi.js 迁出：接口层不再背上传管线） ----------
// 四阶段：getToken → 分片（顺序逐一）→ complete → 换 URL。需 GM_xmlhttpRequest（二进制分片）；
// 各阶段独立成 Promise 小函数，任何一步失败落为 null。
// **两条路一张表**（0.9.348，docs §11.11 全链真机实测）：评论路（缺省）pc-direct 端点 +
// web-comment-text，换出的 ksc2 签名 URL 由 comment/add 服务端改写成 newUpload 长期地址；
// 动态路（opts.moment）APP 域端点 + android-moment-text，URL 服务**换 URL 时即进 newUpload
// 长期库**——moment/add 不做改写，评论路的限时签名 URL 给它就是过期死图（用户实报 am5144898）。
// 分片/complete 两路共用同一图床；差异只在 token/换 URL 端点 + bizFlag + 网关通行证
// （APP 域要设备头集 + 识别查询串，GM 无 Referer——与 momentpost.publishRequest 同口径）。
// 路由决议是纯函数（uploadRouteOf，单测直采钉请求形状）；管线只消费决议结果，不认业务名。
import { CFG } from './cfg.js';
import { gmRequest } from './net.js';
import { appDeviceHeaders, appQuery } from './appapi.js'; // 头集/识别查询串单源（0.9.225/0.9.304）

// 表单 Content-Type 本件常数（0.9.305 批6：两处 header 同串收口）。cfg 不可动、net 不归本批——
// 长期应进 net 导出 FORM_URLENC 供全项目引用（登记于 docs/_batch-notes-C.md，imimage/appapi 等
// 域外出现处同批收）
var FORM_URLENC = 'application/x-www-form-urlencoded';

// 上传用 GM 通道（POST + JSON 解析；无 GM/网络错/超时/解析失败一律 reject）
function gmPostJson(opts) {
  return gmRequest({
    method: 'POST', url: opts.url, headers: opts.headers,
    data: opts.data, timeout: opts.timeout
  });
}

// 路由决议（纯函数，单测直采）：opts.moment=true → 动态路（APP 域端点 + 官方 bizFlag +
// 设备头集 + 识别查询串）；否则评论路（缺省零扰动，opts.bizFlag 仍可覆换——0.9.220 参数缝）。
// 端点/bizFlag 取值全在 CFG.upload 一张表，本函数只做决议，不存第二份字面量。
export function uploadRouteOf(opts) {
  if (opts && opts.moment) {
    var m = CFG.upload.moment;
    return {
      tokenUrl: m.tokenUrl + appQuery(),
      urlAfterUpload: m.urlAfterUpload + appQuery(),
      bizFlag: m.bizFlag,
      headers: appDeviceHeaders() // 内含 Content-Type: form（appapi 单源）
    };
  }
  return {
    tokenUrl: CFG.upload.tokenUrl,
    urlAfterUpload: CFG.upload.urlAfterUpload,
    bizFlag: (opts && opts.bizFlag) || CFG.upload.bizFlag,
    headers: { 'Content-Type': FORM_URLENC }
  };
}

function uploadGetToken(file, route) {
  return gmPostJson({
    url: route.tokenUrl,
    headers: route.headers,
    data: 'fileName=' + encodeURIComponent(file.name || 'image.png'),
    timeout: CFG.upload.tokenT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.info && d.info.token)) throw new Error('no-token');
    return d.info.token;
  });
}

function uploadChunks(token, file) {
  var endpoint = CFG.upload.endpoint;
  var total = file.size;
  function step(i) {
    if (i * CFG.upload.chunk >= total) return Promise.resolve();
    var start = i * CFG.upload.chunk;
    var end = Math.min(start + CFG.upload.chunk, total);
    return gmPostJson({
      url: endpoint + '/api/upload/fragment?upload_token=' + encodeURIComponent(token) + '&fragment_id=' + i,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + (end - 1) + '/' + total
      },
      data: file.slice(start, end),
      timeout: CFG.upload.chunkT
    }).then(function (d) {
      if (!d || d.result !== 1) throw new Error('chunk-' + i);
      return step(i + 1);
    });
  }
  return step(0);
}

function uploadComplete(token, chunks) {
  return gmPostJson({
    url: CFG.upload.endpoint + '/api/upload/complete?upload_token=' + encodeURIComponent(token)
      + '&fragment_count=' + chunks,
    timeout: CFG.upload.completeT
  }).then(function (d) {
    if (!d || d.result !== 1) throw new Error('complete');
  });
}

function uploadGetUrl(token, route) {
  return gmPostJson({
    url: route.urlAfterUpload,
    headers: route.headers,
    data: 'token=' + encodeURIComponent(token) + '&bizFlag=' + encodeURIComponent(route.bizFlag),
    timeout: CFG.upload.urlT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.url)) throw new Error('no-url');
    // URL 原样返回，管线不做任何改写：评论路＝完整签名 URL（ksc2 裸路径 + ?pkey&imgId），
    // comment/add 服务端靠这串参数解析图片并把 content 改写成 imgs.aixifan.com/newUpload
    // 长期地址；剥掉参数服务端解析不到图，会把整条 content 清空（2026-09-30 实证）。
    // 动态路＝newUpload 长期地址本身（APP 域 URL 服务已处理，docs §11.11）
    return d.url;
  });
}

// 单图入口：成功返回 getUrlAfterUpload 的 URL（评论路＝签名 URL / 动态路＝长期地址），
// 失败一律 null（调用方 toast 提示）。opts.moment=true 走动态路；opts.bizFlag 仅评论路可覆换
export function uploadImage(file, opts) {
  var route = uploadRouteOf(opts);
  var chunks = Math.max(1, Math.ceil(file.size / CFG.upload.chunk));
  return uploadGetToken(file, route)
    .then(function (token) {
      return uploadChunks(token, file).then(function () { return token; });
    })
    .then(function (token) {
      return uploadComplete(token, chunks).then(function () { return token; });
    })
    .then(function (token) { return uploadGetUrl(token, route); })
    .then(function (url) { return url || null; }, function () { return null; });
}
