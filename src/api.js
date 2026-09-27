import { CFG } from './cfg.js';
import { request } from './net.js';
import { normalize, normalizeHome } from './data.js';
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
  // 小视频单条详情（深链置顶用，home 模式不走）
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
  // 直链过期/缺失时的补链：sv 重取详情，home 重跑解析
  refreshItem: function (item) {
    if (item.kind === 'home') {
      var mh = mockHome();
      if (mh) {
        // harness：从 mock 卡片取本地测试播放地址
        var raw = mh.filter(function (c) { return String(c.href) === String(item.id); })[0];
        var mu = raw && raw.mockUrl;
        item.urls = mu ? [mu] : [];
        item.qualities = mu ? [{ label: '示例', urls: [mu] }] : [];
        item.videoId = 'mock-' + item.id;
        item.resolved = true;
        item.fav = 12;
        item.share = 34;
        item.date = '2026-09-26';
        return Promise.resolve(!!mu);
      }
      return AppAPI.resolve(item);
    }
    return this.info(item.id).then(function (p) {
      return !!(p && p.urls.length && (item.urls = p.urls, item.urlIdx = 0, true));
    }, function () { return false; });
  }
};
