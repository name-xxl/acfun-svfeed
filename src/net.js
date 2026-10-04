// ---------- 网络层 ----------
// request(url, method, headers, body)：headers/body 可选（body 为 x-www-form-urlencoded 字符串）
// requestText(url)：文本通道（GET，SSR HTML/纯文本端点——搜索页等非 JSON 源）；
//   mockHit 命中时取字符串（或 {html}），harness 才能回放真机 HTML 片段
// gmRequest(opts)：GM 通道参数化出口（responseType 'json'|'text'|'arraybuffer'、自定义超时/头/
//   二进制 data、okStatus 状态码门）——upload.js 二进制分片上传、uppage/imsend 拉文本等 GM-only
//   场景统一走这里，勿再各自内联 GM_xmlhttpRequest 包装（0.9.35 收敛）
import { CFG } from './cfg.js';

// debug 测试缝（0.9.62）：视图面板请求在 harness 静态服务下真发必 404。__ACSV_MOCK_FORM__
// 按 url 子串命中即返回（值可为函数 (body,url)=>响应），仅 debug 构建生效（正式产物死码
// 消除）。postForm 与 request 的 GET 都先问它——命中前缀务必收窄到面板自己的端点，
// 防误伤其他 harness 场景（0.9.49「改形状漏消费点」同型的边界教训）
export function mockHit(url, body) {
  if (!__ACSV_DEBUG__) return null;
  var table = typeof window !== 'undefined' && window.__ACSV_MOCK_FORM__;
  if (!table) return null;
  for (var k in table) {
    if (String(url).indexOf(k) !== -1) {
      var v = table[k];
      return Promise.resolve(typeof v === 'function' ? v(body, url) : v);
    }
  }
  return null;
}

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

export function requestText(url) {
  var mocked = mockHit(url);
  if (mocked) return mocked.then(function (v) {
    return typeof v === 'string' ? v : String((v && v.html) || '');
  });
  if (typeof GM_xmlhttpRequest === 'function') {
    return gmRequest({ method: 'GET', url: url, timeout: CFG.time.gm, responseType: 'text', okStatus: true });
  }
  return new Promise(function (resolve, reject) {
    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.withCredentials = true;
    x.timeout = CFG.time.xhr;
    x.onload = function () {
      if (x.status < 200 || x.status >= 300) return reject(new Error('http-' + x.status));
      resolve(x.responseText || '');
    };
    x.onerror = function () { reject(new Error('network')); };
    x.ontimeout = function () { reject(new Error('timeout')); };
    x.send(null);
  });
}

export function request(url, method, headers, body) {
  var mocked = mockHit(url, body);
  if (mocked) return mocked;
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
