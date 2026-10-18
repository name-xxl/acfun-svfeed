# C 类精读台账：视图/数据（2026-10-17，0.9.274 基线）

范围：`comments.js` / `commentkit.js`、`appapi.js` / `api.js`、`settings.js`、
`iploc.js` / `nativeip.js`、`hls.js`、`overlay.js`。只读精读 → 可证明问题 → 守卫修复。

**结论**：未发现 P0/P1；4 个 P2 已修（0.9.275）；其余为观察项。

## 已修

### C-P2-1 · `cardsOf` 的 `bodyContents` 非数组会炸整条推荐流

- **位置**：`src/appapi.js:103-116`。
- **机制**：`(block.bodyContents || []).forEach` 只在 `null/undefined` 时安全；对象/字符串会
  直接抛 `TypeError`。`homeFeedFetch` 的 `.then` 回调抛错 → `failed:true` → 推荐源整屏失败。
- **修复**：缺失视为合法空块静默跳过；非数组走 `isArray('feed.block.contents')` 计数后跳过。
- **反跑**：`test/unit/feed-blocks.test.js` 新增 `bodyContents: {} / 'bad' / 42` 用例；
  摘守卫即红（TypeError），恢复即绿。

### C-P2-2 · `playInfo` 的 `playUrls` 非数组拖垮整条解析

- **位置**：`src/appapi.js:205-220`。
- **机制**：`(s.playUrls || []).map` 遇到非数组对象会抛错，整个 `playInfo` promise 拒绝，
  所有档位一起丢失；`s` 为 null 时访问 `s.qualityLabel` 也会抛。
- **修复**：`Array.isArray(playUrls)` 守卫；`s` 的字段读取加空值守卫；坏流项产出空 urls，
  随后被 `.filter(x => x.urls.length)` 丢弃。

### C-P2-3 · HLS 脚本标签分支不换源

- **位置**：`src/hls.js:133-136`。
- **机制**：无 GM 环境走 `<script>` 分支时，脚本 `onload` 后若 `window.Hls` 不存在或
  `isSupported` 为假，旧代码直接 `reject('hls-load-failed')`，不尝试后续 CDN；GM 分支
  则会逐源继续。
- **修复**：`ok()` 改为失败时 `next()`，与 GM 分支同口径。无自动化直测（需无 GM + 坏首源），
  以代码路径证明入账。

### C-P2-4 · 评论请求只按 sourceId 判旧

- **位置**：`src/comments.js:202-246`。
- **机制**：`reqId = sourceId`；换视频能丢弃旧回包，但**同源切宿主**（抽屉→详情面板）或
  同源重试时，旧追加回包会被误收，`commentState.page` 被旧页覆盖、旧页条目追加到新列表。
- **修复**：`commentState.reqSeq` 单调序号；每次 `loadComments` 自增，成功/失败回调按
  `reqId !== commentState.reqSeq` 丢弃。无 harness 直测，以代码路径证明入账。

## 观察项（未改）

- `settings.js`：`flushSettings`/`scheduleFlush`/pagehide 兜底成对；未发现遗留定时器。
- `iploc.js`：`qTail` 串行链每拍尾部 `catch` 后接 interval 延时，job 自身已消化网络失败；
  未发现队列卡死。`readStore` 对 Web-IP 老数据兼容。
- `nativeip.js`：`checkUrl` 每次路由变化排一个 `setTimeout(onDomChange)`，快速连续 pushState
  会叠几个扫描；扫描幂等，属性能观察项，不是功能缺陷。
- `overlay.js`：懒注册 capture 监听、栈顶 onEsc 单源、teardown 逐层收；未发现新增问题。
- `commentkit.js`：无状态渲染 kit；未发现状态耦合。

## 未定论 / 需真机

- HLS 脚本标签分支在真实无 GM/无 MSE 环境的落点（0.9.180 已封原生回落，走 error 态）。
- 站点若把 `bodyContents` 换成非数组形态，`isArray` 计数能在 debug 读数里看到，但 release
  只保证“不炸”；是否要在 UI 上提示需产品裁决。
