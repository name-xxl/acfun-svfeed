// ---------- 图片上传（0.9.38 自 appapi.js 迁出：接口层不再背上传管线） ----------
// 四阶段：getToken → 分片（顺序逐一）→ complete → 换签名 URL（长期地址由服务端改写）。
// 需 GM_xmlhttpRequest（二进制分片）；各阶段独立成 Promise 小函数，任何一步失败落为 null。
// 0.9.220：`bizFlag` **提为参数**（此前写死 web-comment-text）——动态发布要用同一个图床，但
// bizFlag 能否复用 web-comment-text **未实测**（docs §11.5：脚本走的是 rest/app 那条 getToken 路）；
// 默认值不变 ⇒ 评论链零扰动。另加**多图编排** uploadImages（九宫格：串行、逐张独立成败、不中断）
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

function uploadGetUrl(token, bizFlag) {
  return gmPostJson({
    url: CFG.upload.urlAfterUpload,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'token=' + encodeURIComponent(token) + '&bizFlag=' + encodeURIComponent(bizFlag || CFG.upload.bizFlag),
    timeout: CFG.upload.urlT
  }).then(function (d) {
    if (!(d && d.result === 0 && d.url)) throw new Error('no-url');
    // 完整签名 URL 原样返回（ksc2 裸路径 + ?pkey&imgId）。comment/add 的服务端靠这串
    // 参数解析图片并把 content 改写成 imgs.aixifan.com/newUpload 长期地址；剥掉参数
    // 服务端解析不到图，会把整条 content 清空（2026-09-30 实证：官方载荷 vs 回显对比）
    return d.url;
  });
}

// 单图入口：成功返回 getUrlAfterUpload 的完整签名 URL，失败一律 null（调用方 toast 提示）
// opts.bizFlag 缺省＝评论链原值（cfg.upload.bizFlag）
export function uploadImage(file, opts) {
  var bizFlag = (opts && opts.bizFlag) || CFG.upload.bizFlag;
  var chunks = Math.max(1, Math.ceil(file.size / CFG.upload.chunk));
  return uploadGetToken(file)
    .then(function (token) {
      return uploadChunks(token, file).then(function () { return token; });
    })
    .then(function (token) {
      return uploadComplete(token, chunks).then(function () { return token; });
    })
    .then(function (token) { return uploadGetUrl(token, bizFlag); })
    .then(function (url) { return url || null; }, function () { return null; });
}

// 多图编排（0.9.220，动态九宫格用）：**串行**上传（并发会撞图床限流/风控），逐张独立成败——
// 任一张失败不中断其余（返回数组里该项为 null，调用方据此提示"N 张上传失败"并允许重试单张）。
// 顺序保证与入参一致（append-only 的九宫格预览靠它）。
export function uploadImages(files, opts) {
  var out = [];
  var list = [].slice.call(files || []);
  return list.reduce(function (chain, f) {
    return chain.then(function () {
      return uploadImage(f, opts).then(function (url) { out.push(url); }, function () { out.push(null); });
    });
  }, Promise.resolve()).then(function () { return out; });
}
