// @ts-check
// ---------- 图片 URL 纯逻辑层（0.9.76）：归一与重试链决策 ----------
// 零 DOM、零依赖、零副作用（now 可注入）——全部可离线单测。契约层（playitem/panelitem）与加载
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
//   ③ 1200ms 后**再换一个 URL**（同款破缓存尾参，值不同）并把 referrer 改默认策略
//      （发 https://www.acfun.cn/ 原生同款 referer，兜住宿主防盗链把 no-referrer 拒掉的情况
//      ——原生页面能看说明白名单在）。0.9.76 第三跳只换 referrer 不换 URL，与该理由自相矛盾
//      （同一 URL 吃负缓存就连请求都发不出去），0.9.77 修
// 0.9.166 重试抖动：②③的 delay 各乘 (0.9+0.2×rnd()) 的 ±20% 随机——多图同时失败时固定
// 间隔会让重试齐发成同步请求尖峰，抖动把它们摊开。rnd 缺省恒 0.5（=×1.0，单测/夹具确定性
// 不变），生产唯一调用点 imgload 传 Math.random。首跳恒 0（立即发，不抖）。
// data:/blob:（测试夹具与本地 blob）只一跳：不重试也没意义，且 harness 断言要确定性。
// 空/空白输入 → []（调用方据此不挂 img，与旧行为一致）
export function coverAttempts(raw, now, rnd) {
  var u = coverUrl(raw);
  if (!u) return [];
  if (/^(data|blob):/i.test(u)) return [{ url: u, ref: 'no-referrer', delay: 0 }];
  var t = Number(now) || Date.now();
  var roll = typeof rnd === 'function' ? rnd : function () { return 0.5; };
  var out = [{ url: u, ref: 'no-referrer', delay: 0 }];
  var q = u.indexOf('?');
  var alt;
  if (CI_QUERY.test(u) && q > 0) alt = u.slice(0, q);
  else alt = u + (q > 0 ? '&' : '?') + 'acsv_r=' + t;
  out.push({ url: alt, ref: 'no-referrer', delay: Math.round(600 * (0.9 + 0.2 * roll())) });
  out.push({ url: alt + (alt.indexOf('?') >= 0 ? '&' : '?') + 'acsv_r3=' + t,
    ref: 'strict-origin-when-cross-origin', delay: Math.round(1200 * (0.9 + 0.2 * roll())) });
  return out;
}

// ---------- 死链备忘（会话级）纯判定（0.9.77） ----------
// 'fresh' 未记录 | 'dead' 记死且未过期 | 'expired' 已过期（旧记录即时清除，给一次复试机会）。
// 判定**只读不写不续期**——0.9.76 的终败路径每渲染一次就重写时间戳，反复进出的视图会让
// 死链永不过 TTL（与「过期给一次重试机会」的设计意图相反）。写入与容量裁剪分开：
//   memoMark(memo, url, now) 首次判死才调；命中 'dead' 的路径不得回写
export function memoState(memo, url, now, ttl) {
  var t = memo.get(url);
  if (t == null) return 'fresh';
  if (Number(now) - t < ttl) return 'dead';
  memo.delete(url);
  return 'expired';
}
// 容量裁剪：超限按插入序淘汰最旧（Map 迭代序即插入序）
export function memoTrim(memo, max) {
  while (memo.size > max) memo.delete(memo.keys().next().value);
}
