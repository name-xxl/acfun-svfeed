// ---------- 网络层 ----------
// request(url, method, headers, body)：headers/body 可选（body 为 x-www-form-urlencoded 字符串）
// gmRequest(opts)：GM 通道参数化出口（responseType 'json'|'text'|'arraybuffer'、自定义超时/头/
//   二进制 data、okStatus 状态码门）——appapi 二进制上传、uppage/imshare 拉文本等 GM-only
//   场景统一走这里，勿再各自内联 GM_xmlhttpRequest 包装（0.9.35 收敛）
import { CFG } from './cfg.js';

export function gmRequest(opts) {
  return new Promise(function (resolve, reject) {
    if (typeof GM_xmlhttpRequest !== 'function') return reject(new Error('no-gm'));
    GM_xmlhttpRequest({
      method: opts.method || 'GET',
      url: opts.url,
      headers: opts.headers,
      data: opts.data,
      timeout: opts.timeout,
      responseType: opts.responseType === 'arraybuffer' ? 'arraybuffer' : undefined,
      onload: function (r) {
        if (opts.okStatus && (r.status < 200 || r.status >= 300))
          return reject(new Error('http-' + r.status));
        if (opts.responseType === 'arraybuffer') return resolve(r.response);
        if (opts.responseType === 'text') return resolve(r.responseText);
        try { resolve(JSON.parse(r.responseText)); }
        catch (e) { reject(new Error('bad json')); }
      },
      onerror: function () { reject(new Error('network')); },
      ontimeout: function () { reject(new Error('timeout')); }
    });
  });
}

export function request(url, method, headers, body) {
  method = method || 'POST';
  if (typeof GM_xmlhttpRequest === 'function') {
    return gmRequest({ method: method, url: url, headers: headers, data: body, timeout: CFG.time.gm });
  }
  // 站点可能重写 window.fetch（A 站页面包装器对部分 URL 会抛错），回退用 XHR
  return new Promise(function (resolve, reject) {
    var x = new XMLHttpRequest();
    x.open(method, url);
    x.withCredentials = true;
    x.timeout = CFG.time.xhr;
    if (headers) {
      for (var k in headers) {
        try { x.setRequestHeader(k, headers[k]); } catch (e) { }
      }
    }
    x.onload = function () {
      try { resolve(JSON.parse(x.responseText)); }
      catch (e) { reject(e); }
    };
    x.onerror = function () { reject(new Error('network')); };
    x.ontimeout = function () { reject(new Error('timeout')); };
    x.send(body || null);
  });
}
