# A 类精读台账：播放核心（2026-10-17，0.9.272 基线）

范围：`session.js`、`feedstore.js`、`feedland.js`、`sessionhooks.js`、`player.js`、
`controls.js`、`dmcanvas.js`。只读精读 → 可证明问题 → 逐条反跑修复。

**结论**：未发现 P0；1 个 P1、2 个 P2 已修（0.9.273）；另有 1 个资源观察项未动。

## 已修

### A-P1-1 · 深链不清理关注视频流上下文

- **位置**：`src/player.js:275-280`（`loadDeepLink`）。
- **机制**：只对 `UpVideos.feedActive` 做归属判定；`FollowVideos.feedActive` 仍真时
  `FeedStore.ensureMore`（`feedstore.js:89-95`）会按旧关注列表的 `feedCursor` 泵入旧条目。
- **可达**：进入关注视频流 → 打开/粘贴非关注列表的深链 → 目标条之后出现旧关注条目。
- **修复**：镜像 UpVideos 的归属判定；上下文确实拥有 `mid`/`hit.item.id` 才延续，否则
  `FollowVideos.feedActive = false`。
- **反跑**：新增 `deeplink-followctx`。修复前 `dfc-old-list-not-pumped` /
  `dfc-second-from-stream` / `dfc-ctx-released` 三红（`second=11053531`）；修复后 9/9 绿。

### A-P2-1 · `feedland` 260ms 探测定时器不可撤

- **位置**：`src/feedland.js:92`；`stopSnapWatch` 在 `:123`。
- **机制**：`snapWatchTick` 的内层 `setTimeout` 无句柄，stop 只清 interval；卸载/停表后
  在途探针仍可能执行 `scrollTo`/`land.heal`。
- **修复**：保存 `probeTimer`，`stopSnapWatch` 里 `clearTimeout`；回调首行清句柄。
- **反跑**：`test/unit/feedland.test.js` 假时钟；摘 `clearTimeout` 即红，恢复即绿。

### A-P2-2 · `landAt` 8 帧 settle 不可作废

- **位置**：`src/feedland.js:57-65`。
- **机制**：settle 用 rAF 连续 8 帧按 `slideAt(idx)` 钉视口；近跳后 ~133ms 内切源/深链时，
  旧 settle 会按新流同下标继续改写 `scrollTop`。
- **修复**：`settleSeq` 代际令牌；`landAt` 取号，`scrollToIndex`/`stopSnapWatch` 递增作废。
- **反跑**：`test/unit/feedland.test.js` 假 rAF；摘 `my !== settleSeq` 即红，恢复即绿。

## 未修 / 观察项收口（0.9.276）

- **`dmcanvas` 无 rVFC 时暂停仍 60Hz 空转** → **已修**（0.9.276）：暂停即 `running=false`
  停排 rAF，`playing` 经 `layer.start()` 重启。
- **`dmcanvas.stopAll` 只 stop 不 destroy** → **已修**（0.9.276）：逐层 `destroy`（幂等），
  补触发 `onDestroy`、移除画布与图层闭包。
- **`session` 恢复链自动播放被拒**：仍需真机确认是否形成“恢复后暂停”；代码已保证
  CDN/重解析分支主动 `play`，看门狗只解锁是既有设计，不凭猜测改。
- **Chromium 对已拆元素不补发 `pointerleave`**：浏览器行为；代码侧靠 `isConnected` 守卫兜底，
  维持现状。

## 已复核无新增

- `session.js`：A1 转圈定时器上移、A2 两分支看门狗、A4 弹幕门控、dispose 清理路径。
- `controls.js`：`showControls` 的 `isConnected` 守卫仍截断 `_volOpen` 自续。
- `dmcanvas.js`：`start/stop/destroy` 与 `layers` 增删成对。
- `feedstore.js`：`gen` 守卫、`chainCapped` 收口、`pumpBusy/loading` 复位。
- `feedland.js`/`sessionhooks.js` 拆件缝：注入方向正确，未引入 PLAY→组合根回边。
