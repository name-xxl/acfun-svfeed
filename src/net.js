// @ts-check
// ---------- 网络层 ----------
// request(url, method, headers, body[, opts])：headers/body 可选（body 为 x-www-form-urlencoded
//   字符串）；opts.anon=true 走游客通道（GM anonymous / 跨域 XHR 无凭证），同源无 GM 时 fail closed。
// requestRead(...)：发现类读统一入口——按设置 guestRead 决定是否游客；写链/登录读继续用 request。
// requestText(url)：文本通道（GET，SSR HTML/纯文本端点——搜索页等非 JSON 源）；
//   mockHit 命中时取字符串（或 {html}），harness 才能回放真机 HTML 片段
// gmRequest(opts)：GM 通道参数化出口（responseType 'json'|'text'|'arraybuffer'、自定义超时/头/
//   二进制 data、okStatus 状态码门、anonymous 游客态）——upload.js 二进制分片上传、uppage/imsend
//   拉文本等 GM-only 场景统一走这里，勿再各自内联 GM_xmlhttpRequest 包装（0.9.35 收敛）
import { CFG } from './cfg.js';
import { stat, swallow } from './dbg.js';
import { getSetting } from './settings.js';

// 会话计数（0.9.166，debug 构建生效/正式死码消除）：领域通道 request/requestText 的
// 请求数与失败数（含 mock 命中——它对调用方就是一次请求）。gmRequest 直用方（upload/
// imsend）不计入，避免传输层与通道层双计

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
      anonymous: !!opts.anonymous,
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

// 失败计数统一出口（0.9.166）：成功直通，失败先 stat('net.fail') 再原样外抛
function countFail(p) {
  return new Promise(function (resolve, reject) {
    p.then(resolve, function (e) { stat('net.fail'); reject(e); });
  });
}

// 游客读传输决策（0.9.278，纯函数单测直采）：
// - anon=false：保持登录态（GM 默认带 Cookie / XHR withCredentials=true）。
// - anon=true：GM 用 anonymous 去 Cookie；无 GM 时跨域 XHR 可 withCredentials=false，
//   **同源 XHR 无法 omit Cookie**（规范如此）⇒ fail closed，绝不静默退回带 Cookie。
export function transportPlan(url, anon, hasGm, pageOrigin) {
  if (!anon) return hasGm ? { kind: 'gm', anonymous: false } : { kind: 'xhr', withCredentials: true };
  if (hasGm) return { kind: 'gm', anonymous: true };
  if (isCrossOrigin(url, pageOrigin)) return { kind: 'xhr', withCredentials: false };
  return { kind: 'reject', reason: 'guest-no-gm' };
}

function isCrossOrigin(url, pageOrigin) {
  var base = pageOrigin || 'https://www.acfun.cn';
  try { return new URL(url, base).origin !== base; }
  catch (e) { return true; }
}

// 发现类读统一入口：设置每次现读，天然「下次加载/翻页生效」。
// 只给推荐/小视频/相关推荐/分区/榜单/搜索/播放直链/弹幕列表用；评论/动态/我的页/写链勿用。
export function requestRead(url, method, headers, body) {
  return request(url, method, headers, body, { anon: getSetting('guestRead') === true });
}

export function requestText(url) {
  stat('net.req');
  var mocked = mockHit(url);
  var p;
  if (mocked) {
    p = mocked.then(function (v) {
      return typeof v === 'string' ? v : String((v && v.html) || '');
    });
  } else if (typeof GM_xmlhttpRequest === 'function') {
    p = gmRequest({ method: 'GET', url: url, timeout: CFG.time.gm, responseType: 'text', okStatus: true });
  } else {
    p = new Promise(function (resolve, reject) {
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
  return countFail(p);
}

export function request(url, method, headers, body, opts) {
  stat('net.req');
  var anon = !!(opts && opts.anon);
  var mocked = mockHit(url, body);
  var p;
  if (mocked) {
    p = mocked;
  } else {
    method = method || 'POST';
    var plan = transportPlan(url, anon, typeof GM_xmlhttpRequest === 'function',
      typeof location !== 'undefined' && location.origin ? location.origin : '');
    if (plan.kind === 'reject') {
      stat('net.guestNoGm');
      p = Promise.reject(new Error(plan.reason));
    } else if (plan.kind === 'gm') {
      if (anon) stat('net.guest');
      p = gmRequest({ method: method, url: url, headers: headers, data: body,
        timeout: CFG.time.gm, anonymous: plan.anonymous });
    } else {
      if (anon) stat('net.guest');
      // 站点可能重写 window.fetch（A 站页面包装器对部分 URL 会抛错），回退用 XHR
      p = new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest();
        x.open(method, url);
        x.withCredentials = plan.withCredentials;
        x.timeout = CFG.time.xhr;
        if (headers) {
          for (var k in headers) {
            try { x.setRequestHeader(k, headers[k]); } catch (e) { swallow(e, 'net'); }
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
  }
  return countFail(p);
}
