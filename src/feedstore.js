import { CFG } from './cfg.js';
import { API } from './api.js';
import { scroller } from './state.js';
import { renderWindow } from './player.js';
import { UpVideos } from './uppage.js';
import { FollowVideos } from './followstream.js';
import { dbg, testHook } from './dbg.js';

// ===
// 5. 信息流数据仓库（纯数据 + 游标泵；UI 通过 env.onChange 得到通知）
// ===
function createFeedStore(env) {
  var store = {
    items: [],
    seen: {},
    loading: false,
    pumpBusy: false,
    current: 0,
    gen: 0, // 代际令牌：reset 自增；旧源在途请求的响应一律丢弃（防双源混流）

    changed: function () { if (env.onChange) env.onChange(); },

    fetchMore: function () {
      var self = this;
      if (self.loading) return Promise.resolve();
      self.loading = true;
      var gen = self.gen;
      return env.api.feed().then(function (list) {
        if (gen !== self.gen) return; // 期间已 reset：不得回填新源，也不得碰新请求的 loading
        self.loading = false;
        dbg('fetch:list=' + list.length);
        list.forEach(function (n) {
          // 懒解析源（home）urls 由进播放器时补齐，允许为空入库
          if (n.id && !self.seen[n.id] && (n.cap.lazyResolve || n.urls.length)) {
            self.seen[n.id] = 1;
            self.items.push(n);
          }
        });
        dbg('fetch:items=' + self.items.length);
        self.changed();
      }, function () {
        if (gen !== self.gen) return;
        self.loading = false;
      });
    },

    // 直链过期刷新：sv 换备用 CDN 或重取详情；home 重跑解析链
    refresh: function (item) {
      return env.api.refreshItem(item).then(function (ok) {
        if (ok && item.urls.length) { item.urlIdx = 0; return true; }
        return false;
      }, function () { return false; });
    },

    ensureMore: function () {
      var self = this;
      var ctx = env.getListContext();
      if (ctx) {
        // 空间页进入：按主页列表顺序泵入后续视频
        self.pumpListContext(ctx);
        return Promise.resolve();
      }
      if (self.items.length === 0 || self.current >= self.items.length - CFG.feed.bufferSize) {
        return self.fetchMore();
      }
      return Promise.resolve();
    },

    // 按列表上下文顺序泵入下一条（逐个取详情，保持列表顺序）
    pumpListContext: function (ctx) {
      var self = this;
      if (!ctx || self.pumpBusy) return;
      self.pumpBusy = true;
      (function step() {
        if (env.getListContext() !== ctx) { self.pumpBusy = false; return; }
        while (ctx.feedCursor < ctx.items.length
          && self.seen[ctx.items[ctx.feedCursor].id]) {
          ctx.feedCursor++;
        }
        if (ctx.feedCursor >= ctx.items.length) {
          // 已加载的列表耗尽：后台链还在加载则轮询等它，到底/失败后回落随机流
          self.pumpBusy = false;
          if (ctx.done || ctx.failed) self.fetchMore().then(function () { env.onChange(); });
          else setTimeout(function () { self.pumpListContext(ctx); }, CFG.time.chainGap);
          return;
        }
        var raw = ctx.items[ctx.feedCursor];
        var gen = self.gen;
        // 详情源按上下文分派（0.9.99 关注流）：ctx 自带 info（home 家族 resolve）则用它，
        // 否则回落本 store 的 meow info——泵代码单处，两种列表上下文各自声明详情源
        var infoFn = ctx.info || env.api.info;
        infoFn(raw.id).then(function (n) {
          if (gen !== self.gen) return; // 期间已 reset：旧列表的详情不得入新库
          if (n && n.id && n.urls.length && !self.seen[n.id]) {
            self.seen[n.id] = 1;
            self.items.push(n);
          }
          ctx.feedCursor++;
          self.pumpBusy = false;
          if (self.items.length - self.current < CFG.feed.bufferSize) self.pumpListContext(ctx);
          else env.onChange();
        }, function () {
          if (gen !== self.gen) return;
          ctx.feedCursor++;
          self.pumpBusy = false;
          self.pumpListContext(ctx);
        });
      })();
    },

    resetForList: function () {
      this.gen++; // 使所有在途请求的响应失效
      this.items = [];
      this.seen = {};
      this.current = 0;
      this.loading = false;
      this.pumpBusy = false;
    },

    // 内容源切换/进入竖刷页时的全量重置（resetForList 的别名，语义更明确）
    reset: function () {
      this.resetForList();
    }
  };
  return store;
}

// env 里引用的 scroller/renderWindow/UpVideos 都在调用期才解引用，
// 与 player/uppage 的模块循环是安全的（求值期互不触碰对方绑定）。FollowVideos 同款：
// followstream 运行期才触达 FeedStore（enterVideos），此处运行期才读它的 feedActive
export var FeedStore = createFeedStore({
  api: {
    feed: function () { return API.feed(); },
    info: function (id) { return API.info(id); },
    refreshItem: function (item) { return API.refreshItem(item); }
  },
  onChange: function () { if (scroller) renderWindow(); },
  // 列表上下文二选一（0.9.99 +关注流）：空间页 UP 主列表 / 关注视频流，命中即按列表泵入，
  // 都不活动回落随机流
  getListContext: function () {
    if (UpVideos.feedActive) return UpVideos;
    if (FollowVideos.feedActive) return FollowVideos;
    return null;
  }
});

// debug 构建测试钩子：harness 断言读列表快照（release 死码消除）
testHook('feed', function () {
  return {
    current: FeedStore.current,
    gen: FeedStore.gen,
      items: FeedStore.items.map(function (it) {
        return {
          id: it.id,
          kind: it.kind,
          hasUrls: !!(it.urls && it.urls.length),
          resolving: !!it.resolving,
          qualities: it.qualities ? it.qualities.length : 0,
          qIdx: it.qIdx || 0, // 切档同步断言用：邻居条目是否跟随新偏好
          qLabel: it.qualities && it.qualities[it.qIdx] ? it.qualities[it.qIdx].label : null
        };
      })
  };
});
