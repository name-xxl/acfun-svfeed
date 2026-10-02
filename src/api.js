import { CFG } from './cfg.js';
import { request } from './net.js';
import { normalize, normalizeHome, deepLinkOf } from './data.js';
import { AppAPI } from './appapi.js';

// ---------- API：站点接口（mock 桩统一在 API 层收口） ----------
// 内容源：sv=小视频 meow（随机池重复拉+去重）；home=首页推荐 selection/feed（真 pcursor 游标）
function mockData() { return window.__ACSV_MOCK__ || null; }
function mockHome() { return window.__ACSV_MOCK_HOME__ || null; }

var curSource = 'sv';
try { curSource = localStorage.getItem(CFG.lsSource) === 'home' ? 'home' : 'sv'; } catch (e) { }

export function getSource() { return curSource; }

export function setSource(s) {
  curSource = s === 'home' ? 'home' : 'sv';
  if (curSource === 'home') AppAPI.resetPager();
  try { localStorage.setItem(CFG.lsSource, curSource); } catch (e) { }
}

// 进入竖刷页时推荐源重新拉首屏（退出再进不吃旧游标）
export function resetHomePager() {
  if (curSource === 'home') AppAPI.resetPager();
}

// 懒解析统一入口：resolving 互斥 + 在途 Promise 复用。setActive 预热与 attachVideo
// 挂载共用同一个 Promise——预热中途划到该条时，挂载侧直接等结果，不再出现
// 「挂载撞上预热中」导致 slide 永远停在 loading 的竞态。
// 走 refreshItem 分发：mock 拦截与真实解析（AppAPI.resolve）同路
export function ensureResolved(item) {
  if (!item.cap.lazyResolve) return Promise.resolve(true);
  if (item.urls.length) return Promise.resolve(true);
  if (item._resolveP) return item._resolveP;
  item.resolving = true;
  var p = API.refreshItem(item).then(function (ok) {
    if (item._resolveP === p) { item._resolveP = null; item.resolving = false; }
    return !!ok && item.urls.length > 0;
  }, function () {
    if (item._resolveP === p) { item._resolveP = null; item.resolving = false; }
    return false;
  });
  item._resolveP = p;
  return p;
}

export var API = {
  feed: function () {
    if (curSource === 'home') {
      var mh = mockHome();
      if (mh) return Promise.resolve(mh.map(normalizeHome));
      return AppAPI.homeFeed();
    }
    var mock = mockData();
    if (mock && mock.feed) {
      return Promise.resolve((mock.feed || [])
        .filter(function (r) { return r && r.playInfo && r.playInfo.videoUrls && r.playInfo.videoUrls.length; })
        .map(normalize));
    }
    return request(CFG.api.feed).then(function (json) {
      return ((json && json.meowFeed) || []).map(normalize);
    });
  },
  // 小视频单条详情（深链置顶/空间页泵入/最热统计共用，home 模式不走）
  info: function (mid) {
    var mock = mockData();
    if (mock && mock.feed) {
      var raw = mock.feed.filter(function (r) { return String(r.meowId) === String(mid); })[0];
      return Promise.resolve(raw ? normalize(raw) : null);
    }
    return request(CFG.api.info + mid).then(function (json) {
      return (json && json.meowFeed) ? normalize(json.meowFeed) : null;
    });
  },
  // 深链解析（0.9.72）：地址栏 id 跨两个 id 空间——meowId（小视频）与 acId（推荐），
  // 详情各自落在 normalize / normalizeHome 的 id 上，故解析要按空间选端点。标记形态（src
  // 由 route.parseHash 给出）只打对应的一个；历史裸数字链接并行打两个、由 deepLinkOf 定
  // 优先级（meow 先：脚本主源，且 README 的分享格式基准）。任一失败只当未命中并返回 null
  // ——**不**回落随机流，由调用方出错误盒（旧行为：链接失效时用户只看到一屏随机内容）
  deepLink: function (mid, src) {
    var self = this;
    var meowP = src === 'home' ? Promise.resolve(null)
      : self.info(mid).then(function (n) { return n || null; }, function () { return null; });
    var acP = src === 'sv' ? Promise.resolve(null)
      : AppAPI.dougaInfo(mid).then(function (d) { return d || null; }, function () { return null; });
    return Promise.all([meowP, acP]).then(function (r) { return deepLinkOf(r[0], r[1], mid); });
  },
  // 直链过期/缺失时的补链：sv 重取详情，home 重跑解析
  refreshItem: function (item) {
    if (item.kind === 'home') {
      var mh = mockHome();
      if (mh) {
        // harness：从 mock 卡片取本地测试播放地址。不在卡片池里的 id（如视图面板插入的
        // 任意 ac）放行走真实解析链——harness 下由 net.mockHit 缝接住，生产本就走到 resolve
        var raw = mh.filter(function (c) { return String(c.href) === String(item.id); })[0];
        if (raw) {
          var mu = raw.mockUrl;
          item.urls = mu ? [mu] : [];
          // 两档同址：清晰度菜单可切（switchQuality 链路 harness 可断言）
          item.qualities = mu ? [{ label: '示例', urls: [mu] }, { label: '示例·备线', urls: [mu] }] : [];
          // mock 直链不是 m3u8：绕开 hls.js 管线走 video.src 直挂（仅 harness mock 生效）
          if (mu) item.cap.hls = false;
          item.videoId = 'mock-' + item.id;
          item.fav = 12;
          item.share = 34;
          item.date = '2026-09-26';
          return Promise.resolve(!!mu);
        }
      }
      return AppAPI.resolve(item);
    }
    return this.info(item.id).then(function (p) {
      if (p && p.urls.length) {
        item.urls = p.urls;
        item.urlIdx = 0;
        return true;
      }
      return false;
    }, function () { return false; });
  }
};
