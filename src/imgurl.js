// ---------- 图片 URL 纯逻辑层（0.9.76）：归一与重试链决策 ----------
// 零 DOM、零依赖、零副作用（now 可注入）——全部可离线单测。契约层（data.js）与加载
// 执行层（imgload.js）共用这一份：URL 正确性只在这里定义，别处不再手拼/改写。
// 立此模块的教训：封面裂图三来源（http 混合内容被拦 / CDN 处理参数失败 / 瞬时网络抖动），
// 前一版代码三处网格卡直取契约字段原样塞 img.src，无归一也无重试。

// HTML 实体解码表（SSR 片段里的 &amp; 等；JSON 通道理论上不带，带上无害——幂等）
var ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

// URL 归一：trim → 实体解码 → http:// 与协议相对 // 升 https（页面恒为 https，http 图必被
// 混合内容拦掉——播放直链早有同款先例 appapi.js，封面此前漏了）→ 其余 scheme（data:/blob:/
// 相对路径）原样。query 参数一律保留（0.9.40 教训：剥参数会把带签名的图整条清空）
export function coverUrl(raw) {
  var u = String(raw == null ? '' : raw)
    .replace(/&(amp|lt|gt|quot|#39);/g, function (m) { return ENT[m]; })
    .trim();
  if (!u) return '';
  if (u.indexOf('//') === 0) return 'https:' + u;
  if (/^http:\/\//i.test(u)) return 'https://' + u.slice(7);
  return u;
}

// 腾讯 CI / 阿里 OSS 的图片处理参数形态：带这类 query 的 URL 去掉 query 落到原图是
// **安全变体**（资源路径本身有效，只是处理链失败）；其它来源的 query 绝不剥（可能带签名）
var CI_QUERY = /[?&](imageMogr2|imageView2|x-oss-process)/i;

// 重试链决策（纯函数）：[{url, ref, delay}]，delay=发送前等待 ms。默认三跳——
//   ① 归一 URL + no-referrer（全项目图片基线策略）
//   ② 600ms 后换**不同** URL：CI 形态→去 query 回原图；否则追加 acsv_r 破缓存参数。
//      必须换 URL：浏览器对失败过的 URL 有负缓存，原样重发可能不打网络直接再报错
//   ③ 1200ms 后同 ② 的 URL、referrer 改默认策略（发 https://www.acfun.cn/ 原生同款
//      referer，兜住宿主防盗链把 no-referrer 拒掉的情况——原生页面能看说明白名单在）
// data:/blob:（测试夹具与本地 blob）只一跳：不重试也没意义，且 harness 断言要确定性。
// 空/空白输入 → []（调用方据此不挂 img，与旧行为一致）
export function coverAttempts(raw, now) {
  var u = coverUrl(raw);
  if (!u) return [];
  if (/^(data|blob):/i.test(u)) return [{ url: u, ref: 'no-referrer', delay: 0 }];
  var out = [{ url: u, ref: 'no-referrer', delay: 0 }];
  var q = u.indexOf('?');
  var alt;
  if (CI_QUERY.test(u) && q > 0) alt = u.slice(0, q);
  else alt = u + (q > 0 ? '&' : '?') + 'acsv_r=' + (Number(now) || Date.now());
  out.push({ url: alt, ref: 'no-referrer', delay: 600 });
  out.push({ url: alt, ref: 'strict-origin-when-cross-origin', delay: 1200 });
  return out;
}
