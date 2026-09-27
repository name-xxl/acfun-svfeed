import { CFG } from './cfg.js';
import { API } from './api.js';
import { scroller } from './state.js';
import { renderWindow } from './player.js';
import { UpVideos } from './uppage.js';
import { dbg } from './dbg.js';

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

    changed: function () { if (env.onChange) env.onChange(); },

    fetchMore: function () {
      var self = this;
      if (self.loading) return Promise.resolve();
      self.loading = true;
      return env.api.feed().then(function (list) {
        self.loading = false;
        dbg('fetch:list=' + list.length);
        list.forEach(function (n) {
          // home 条目 urls 由懒解析补齐，允许为空入库
          if (n.id && !self.seen[n.id] && (n.kind === 'home' || n.urls.length)) {
            self.seen[n.id] = 1;
            self.items.push(n);
          }
        });
        dbg('fetch:items=' + self.items.length);
        self.changed();
      }, function () { self.loading = false; });
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
        env.api.info(raw.id).then(function (n) {
          if (n && n.id && n.urls.length && !self.seen[n.id]) {
            self.seen[n.id] = 1;
            self.items.push(n);
          }
          ctx.feedCursor++;
          self.pumpBusy = false;
          if (self.items.length - self.current < CFG.feed.bufferSize) self.pumpListContext(ctx);
          else env.onChange();
        }, function () {
          ctx.feedCursor++;
          self.pumpBusy = false;
          self.pumpListContext(ctx);
        });
      })();
    },

    resetForList: function () {
      this.items = [];
      this.seen = {};
      this.current = 0;
      this.loading = false;
      this.pumpBusy = false;
    },

    // 内容源切换/进入竖刷页时的全量重置（resetForList 的别名，语义更明确）
    reset: function () {
      this.resetForList();
    },

    // 进入时带 meowId：缓冲为空则加载该条置顶；缓冲已有则跳到它
    loadFirst: function (mid) {
      var self = this;
      if (self.items.length) {
        for (var i = 0; i < self.items.length; i++) {
          if (String(self.items[i].id) === String(mid)) {
            self.current = i;
            return Promise.resolve();
          }
        }
        return Promise.resolve();
      }
      return env.api.info(mid).then(function (n) {
        if (n && n.id && n.urls.length) {
          self.seen[n.id] = 1;
          self.items.unshift(n);
          self.current = 0;
          return;
        }
        return self.fetchMore();
      }, function () { return self.fetchMore(); });
    }
  };
  return store;
}

// env 里引用的 scroller/renderWindow/UpVideos 都在调用期才解引用，
// 与 player/uppage 的模块循环是安全的（求值期互不触碰对方绑定）。
export var FeedStore = createFeedStore({
  api: {
    feed: function () { return API.feed(); },
    info: function (id) { return API.info(id); },
    refreshItem: function (item) { return API.refreshItem(item); }
  },
  onChange: function () { if (scroller) renderWindow(); },
  getListContext: function () { return UpVideos.feedActive ? UpVideos : null; }
});
