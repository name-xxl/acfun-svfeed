import { CFG } from './cfg.js';
import { API } from './api.js';
import { activeContext } from './feedctx.js';
import { dbg, stat, testHook } from './dbg.js';

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
          //（0.9.165 起 sv 置瘦条目同样以空 urls 在库、cap.lazyResolve 置真，划回重解析）
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

    // 水位置瘦（0.9.165）：cur 背后 slimBehindAt 条之外的已解析条目清掉媒体载荷
    //（urls/qualities/_qualitiesAll/urlIdx），cap.lazyResolve 置真——划回时
    // session.start → ensureResolved 走 refreshItem 重解析（sv=info 1 请求；home=resolve
    // 2 请求，档位按 quality.js 全局偏好重选）。元数据（id/videoId/up/title/cover/计数/
    // 日期）全保留：上报去重/评论键/侧栏渲染都靠它们。连刷长会话的条目内存从线性涨变
    // O(水位)（0.9.15x 评估核实轮实锤：items 只增不减、每条挂 9 档 urls）。renderWindow
    // 每拍调用；_resolveP 在途与已瘦（urls 空）幂等跳过
    slim: function (cur) {
      var lim = Math.min(cur - CFG.feed.slimBehindAt, this.items.length);
      for (var i = 0; i < lim; i++) {
        var it = this.items[i];
        if (!it || it._resolveP || !(it.urls && it.urls.length)) continue;
        it.urls = [];
        if (it.qualities) it.qualities = [];
        if ('_qualitiesAll' in it) it._qualitiesAll = null;
        it.urlIdx = 0;
        it.cap.lazyResolve = true;
        stat('feed.slim');
      }
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

// 当前列表上下文：判据收口在 feedctx 注册表（0.9.106 起「单活互斥」——activateContext
// 已清其余，优先序兜底不再需要；getListContext 与 views 的 dock 归属读同一处）
export function listContext() {
  return activeContext();
}

// 变更通知出口（0.9.115）：仓库数据变化 →「窗口重绘」由播放层注册（setChangeHandler；
// mount 注册 / unmount 注销，与挂载态同生共死）——本模块不 import 播放层，feedstore↔player
// 环就此断（原 env.onChange 的 `if (scroller) renderWindow()` 连同守卫整体搬到注册方闭包）。
// 转发保持**触发时刻读**：changed() 现读注册值；三条触发线（fetchMore / pumpListContext×2）
// 全部由 player 取流路径发起、晚于 mount 注册——注册前静默是死代码而非行为差异（已证）。
// 金丝雀（debug）：该状态按论证不可达——可达=新触发线违反「无 mount 不取流」假设，第一发即见
var changeHandler = null;
export function setChangeHandler(fn) { changeHandler = typeof fn === 'function' ? fn : null; }

export var FeedStore = createFeedStore({
  api: {
    feed: function () { return API.feed(); },
    info: function (id) { return API.info(id); },
    refreshItem: function (item) { return API.refreshItem(item); }
  },
  onChange: function () {
    if (changeHandler) changeHandler();
    else stat('feed-changed-no-listener'); // 金丝雀（0.9.115）：不可达态；可达即见 acsv-stats
  },
  // 列表上下文二选一（0.9.99 +关注流）：空间页 UP 主列表 / 关注视频流，命中即按列表泵入，
  // 都不活动回落随机流（判据单源=listContext 导出）
  getListContext: listContext
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
          lazy: !!it.cap.lazyResolve, // 水位场景断言用：置瘦即置真（0.9.165）
          resolving: !!it.resolving,
          qualities: it.qualities ? it.qualities.length : 0,
          qIdx: it.qIdx || 0, // 切档同步断言用：邻居条目是否跟随新偏好
          qLabel: it.qualities && it.qualities[it.qIdx] ? it.qualities[it.qIdx].label : null
        };
      })
  };
});
