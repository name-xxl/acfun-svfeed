import { CFG } from './cfg.js';
import { request } from './net.js';
import { normalize, normalizeHome, deepLinkOf } from './playitem.js';
import { AppAPI } from './appapi.js';
import { getSetting, setSetting } from './settings.js';
import { batch as relatedBatch } from './relatedapi.js';

// ---------- API：站点接口（mock 桩统一在 API 层收口） ----------
// 内容源：sv=小视频 meow（随机池重复拉+去重）；home=首页推荐 selection/feed（真 pcursor 游标）；
// related=相关推荐随机游走（0.9.167，feed/related/general——**会话内覆盖态**，只由评论抽屉
// 「相关推荐」行点击起步，不持久化；任何「回随机流」入口经 ensureBaseSource 归位）
function mockData() { return window.__ACSV_MOCK__ || null; }
function mockHome() { return window.__ACSV_MOCK_HOME__ || null; }

// 源记忆（0.9.89 收编）：老键 acsv-source 由 settings 首读收养一次，此后读写 acsv.s.source
var curSource = getSetting('source');

export function getSource() { return curSource; }

export function setSource(s) {
  curSource = s === 'home' ? 'home' : (s === 'related' ? 'related' : 'sv');
  if (curSource === 'home') AppAPI.resetPager();
  // related 不落盘：持久化层只认 sv|home（设置 schema 的 source options 同口径），
  // 下次会话从持久化偏好起步；游走态的生命周期=本次竖刷会话
  if (curSource !== 'related') setSetting('source', curSource);
}

// 覆盖源归位（0.9.167）：游走态是暂态，任何「重置为普通随机流」的入口（mount 普通入口 /
// maybeStartFeed / goFeedHome 换流分支）先走这里——否则 curSource 停在 related、缓冲已清、
// tip 为空，随机流永远拉不出第一批。归位目标=持久化偏好（'related' 从未写盘，读到的是基源）
export function ensureBaseSource() {
  if (curSource === 'related') setSource(getSetting('source') === 'home' ? 'home' : 'sv');
}

// 进入竖刷页时推荐源重新拉首屏（退出再进不吃旧游标）
export function resetHomePager() {
  if (curSource === 'home') AppAPI.resetPager();
}

// 懒解析统一入口：resolving 互斥 + 在途 Promise 复用。三个消费方共用——setActive 预热
//（prewarm）、挂载链（session.start，共用同一个在途 Promise：预热中途划到该条时挂载侧
// 直接等结果，不再出现「挂载撞上预热中」导致 slide 永远停在 loading 的竞态）、以及
// 0.9.165 起置瘦条目划回的重解析（slim 置 cap.lazyResolve=true + 清 urls，本函数天然可重入）。
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
  // tipId（0.9.167）：仓库末条 id（feedstore.fetchMore 传入）——仅 related 源消费（游走锚：
  // 下一批从「链尾那条」的相关池里取），其余源忽略该参数
  feed: function (tipId) {
    if (curSource === 'related') return relatedBatch(tipId);
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
        // 点名直挂缝（harness）：面板/搜索结果条目 id 不在卡片池里，但测试要它真起播——走与
        // 卡片池同款的"本地 webm 直挂"（webm 不是 m3u8，套 hls.js 管线会死在解析上）。
        // 值可为 1 或对象 {id,name,head,date,delay}（0.9.82）：对象形态连带模拟 douga/info 回包
        // 的作者与发布日期——这条缝跳过 resolve，作者契约 item.up 的"回包覆写"与日期槽的
        // 口径（0.9.85 起 = 发布时刻，见 appapi.resolve）就没有别的注入点。date 让调用方
        // 显式给出该口径的值（不给则用历史默认），免得缝自己编一个语义不明的日期。
        // delay 模拟网络往返，让"面板首帧作者 → 回包后被详情覆写"这条状态转移真能被观测到
        // （否则整条链全是微任务，首帧态在测试里根本抓不住）。生产无 __ACSV_MOCK_DIRECT__，
        // 整段不生效
        var direct = window.__ACSV_MOCK_DIRECT__;
        var dv = direct && direct[String(item.id)];
        if (!raw && dv) {
          raw = {
            mockUrl: window.__ACSV_TEST_WEBM__ || '',
            up: typeof dv === 'object' ? dv : null,
            date: (dv && dv.date) || '',
            delay: (dv && dv.delay) || 0
          };
        }
        if (raw) {
          var apply = function () {
            var mu = raw.mockUrl;
            item.urls = mu ? [mu] : [];
            // 两档同址：清晰度菜单可切（switchQuality 链路 harness 可断言）
            item.qualities = mu ? [{ label: '示例', urls: [mu] }, { label: '示例·备线', urls: [mu] }] : [];
            // mock 直链不是 m3u8：绕开 hls.js 管线走 video.src 直挂（仅 harness mock 生效）
            if (mu) item.cap.hls = false;
            if (raw.up) { // 同 appapi.resolve 的回填写法：就地补建/补充 item.up
              item.up = item.up || { id: 0, name: '', img: '', isFollowing: false };
              if (raw.up.id) item.up.id = Number(raw.up.id) || item.up.id;
              if (raw.up.name) item.up.name = raw.up.name;
              if (raw.up.head) item.up.img = raw.up.head; // 真实回包走 user.headUrl
            }
            item.videoId = 'mock-' + item.id;
            item.fav = 12;
            item.share = 34;
            item.date = raw.date || '2026-09-26'; // 同上：日期也由调用方按目标口径给
            return !!mu;
          };
          if (raw.delay) {
            return new Promise(function (res) { setTimeout(function () { res(apply()); }, raw.delay); });
          }
          return Promise.resolve(apply());
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
