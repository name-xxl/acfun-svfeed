// ---------- 网络层 ----------
// request(url, method, headers, body)：headers/body 可选（body 为 x-www-form-urlencoded 字符串）
export function request(url, method, headers, body) {
  method = method || 'POST';
  return new Promise(function (resolve, reject) {
    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: method,
        url: url,
        headers: headers || undefined,
        data: body || undefined,
        timeout: 15000,
        onload: function (r) {
          try { resolve(JSON.parse(r.responseText)); }
          catch (e) { reject(new Error('bad json')); }
        },
        onerror: function () { reject(new Error('network')); },
        ontimeout: function () { reject(new Error('timeout')); }
      });
    } else {
      // 站点可能重写 window.fetch（A 站页面包装器对部分 URL 会抛错），回退用 XHR
      var x = new XMLHttpRequest();
      x.open(method, url);
      x.withCredentials = true;
      x.timeout = 15000;
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
    }
  });
}
