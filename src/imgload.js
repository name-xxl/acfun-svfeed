// ---------- 图片加载执行层（0.9.76）：全项目 <img> 图面的唯一入口 ----------
// 懒加载 + 失败重试链（imgurl.coverAttempts）+ 终败降级（隐藏裂图 + 暗字占位/默认头像）+
// 淡入。各图面的差异集中在 IMG_POLICY 策略表——改策略只改这张表，新图面优先复用已有策略，
// 调用一行 imgInto 即可（散落的 referrerPolicy/loading 手动三元组不再新增）。
// URL 归一与重试链决策是纯函数（imgurl.js，离线单测钉住）；本模块只做 DOM 装配。
// 有意不并入：私信图片气泡的鉴权/blob 管线（imshare.fetchImImageBlob，0.9.41/0.9.49 真机
// 验收）——它只共用本模块的 lazyObserve 观察器，字节链保持原样。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { coverAttempts, coverUrl } from './imgurl.js';

// 策略表：图面差异的单一真源。
//   retry   是否走 imgurl.coverAttempts 的重试链（默认 true）
//   fade    加载成功加 ld 类（宿主 CSS 做透明淡入；.acsv-space-cell 既有约定）
//   ph      终败占位文案（挂 .acsv-gph 节点；缺省=只留宿主灰底静默降级）
//   fallback 终败前的兜底图 URL（头像用；与主 URL 相同则跳过）
export var IMG_POLICY = {
  // 网格封面（搜索/历史/收藏）：重试 + 终败暗字占位 + 淡入
  grid: { retry: true, fade: true, ph: '封面加载失败' },
  // 行缩略图（榜单/分区）：重试；尺寸小放不下字，终败静默留灰底
  thumb: { retry: true },
  // 头像（UP 卡/资料头）：失败回落默认头像；默认头像再失败则隐藏
  avatar: { retry: true, fallback: CFG.api.defaultAvatar },
  // 空间页投稿格：重试 + 淡入（.acsv-space-cell img 的 ld 约定；顺带修掉失败即
  // 永久 opacity:0 隐身空卡的旧缺陷——旧代码只有 load 会加 ld，error 无人管）
  space: { retry: true, fade: true }
};

// 终败备忘（会话级）：视图重建不重打同一死链（TTL 过期给一次重试机会，防长期把瞬时
// 故障记成永久）。Map 插入序即淘汰序
var MEMO_MAX = 200, MEMO_TTL = 10 * 60000;
var failMemo = new Map();
function memoDead(url) {
  var t = failMemo.get(url);
  if (t == null) return false;
  if (Date.now() - t < MEMO_TTL) return true;
  failMemo.delete(url);
  return false;
}
function memoPut(url) {
  failMemo.set(url, Date.now());
  while (failMemo.size > MEMO_MAX) failMemo.delete(failMemo.keys().next().value);
}

// 建 img 挂进宿主并驱动加载。policy 传策略名（IMG_POLICY 键）或内联对象；cls 给 img 类名
// （宿主 CSS 用）。返回 img；rawUrl 无有效 URL 时返回 null（调用方无需判空，与旧行为一致）
export function imgInto(host, rawUrl, policy, cls) {
  if (!host) return null;
  var pol = typeof policy === 'string' ? (IMG_POLICY[policy] || {}) : (policy || {});
  var plan = coverAttempts(rawUrl);
  if (!plan.length) return null;
  var img = el('img');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  if (cls) img.className = cls;
  host.appendChild(img);
  var primary = plan[0].url;
  var fb = pol.fallback && coverUrl(pol.fallback) !== primary ? coverUrl(pol.fallback) : '';
  var i = 0, timer = null, fbUsed = false;
  if (memoDead(primary)) return terminal();

  img.addEventListener('load', function () {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pol.fade) img.classList.add('ld');
  });
  img.addEventListener('error', function () {
    // 视图已拆（切换/重建）：不重试、不记死链——死链备忘只记真在屏上验过的
    if (!img.isConnected) return;
    if (pol.retry !== false && i + 1 < plan.length) { i++; fire(); return; }
    if (fb && !fbUsed) {
      fbUsed = true;
      plan = [{ url: fb, ref: 'no-referrer', delay: 0 }];
      i = 0;
      fire();
      return;
    }
    terminal();
  });
  fire();

  function fire() {
    var a = plan[i];
    img.referrerPolicy = a.ref;
    if (a.delay) {
      timer = setTimeout(function () {
        timer = null;
        if (img.isConnected) img.src = a.url; // 等待期被拆：不发这次重试
      }, a.delay);
    } else {
      img.src = a.url;
    }
  }
  function terminal() {
    memoPut(primary);
    img.classList.add('acsv-imgfail');
    img.style.display = 'none';
    if (pol.ph) host.appendChild(el('div', 'acsv-gph', pol.ph));
    return img;
  }
}

// 懒加载观察器（IntersectionObserver 单例，按 rootMargin 分桶）：root 缺省=viewport，
// 祖先滚动容器的裁剪自动计入；触发一次即 unobserve（回调挂元素属性，观察器零业务语义）。
// 私信图片气泡（imdrawer）与未来图面共用——全项目只留这一份观察器实现
var obsByMargin = {};
export function lazyObserve(el, fn, rootMargin) {
  var rm = rootMargin || '200px 0px';
  var ob = obsByMargin[rm];
  if (!ob) {
    ob = obsByMargin[rm] = new IntersectionObserver(function (entries, self) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        self.unobserve(en.target);
        var f = en.target.__acsvImgLoad;
        if (f) { en.target.__acsvImgLoad = null; f(); }
      });
    }, { rootMargin: rm });
  }
  el.__acsvImgLoad = fn;
  ob.observe(el);
}
