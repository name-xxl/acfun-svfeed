// ---------- 评论图片上传（0.9.38 自 appapi.js 迁出：接口层不再背上传管线） ----------
// 四阶段：getToken → 分片（顺序逐一）→ complete → 换长期 URL。
// 需 GM_xmlhttpRequest（二进制分片）；各阶段独立成 Promise 小函数，任何一步失败
// 由 uploadImage 统一落为 null
import { CFG } from './cfg.js';
import { gmRequest } from './net.js';

// 上传用 GM 通道（POST + JSON 解析；无 GM/网络错/超时/解析失败一律 reject）
function gmPostJson(opts) {
  return gmRequest({
    method: 'POST', url: opts.url, headers: opts.headers,
    data: opts.data, timeout: opts.timeout
  });
}

function uploadGetToken(file) {
  return gmPostJson({
    url: CFG.upload.tokenUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

function uploadGetUrl(token) {
  return gmPostJson({
    url: CFG.upload.urlAfterUpload,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'token=' + encodeURIComponent(token) + '&bizFlag=web-comment-text',
    timeout: CFG.upload.urlT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.url)) throw new Error('no-url');
    return d.url.split('?')[0]; // 剥签名参数，存裸路径长期可访问
  });
}

// 发评论配图入口：成功返回可长期访问的裸路径 URL，失败一律 null（调用方 toast 提示）
export function uploadImage(file) {
  var chunks = Math.max(1, Math.ceil(file.size / CFG.upload.chunk));
  return uploadGetToken(file)
    .then(function (token) {
      return uploadChunks(token, file).then(function () { return token; });
    })
    .then(function (token) {
      return uploadComplete(token, chunks).then(function () { return token; });
    })
    .then(uploadGetUrl)
    .then(function (url) { return url || null; }, function () { return null; });
}
