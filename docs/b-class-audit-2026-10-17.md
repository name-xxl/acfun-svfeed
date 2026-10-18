# B 类精读台账：私信域（2026-10-17，0.9.273 基线）

范围：`imsdk.js`、`imsend.js`、`imimage.js`、`imbubble.js`、`imlist.js`、`imchat.js`、
`imsendui.js`、`imdrawer.js`。只读精读 → 可证明问题 → 反跑修复。

**结论**：未发现 P0；1 个 P1、1 个 P2 已修（0.9.274）；其余为观察项。

## 已修

### B-P1-1 · 发送日志水位仍按数组下标（缓冲驱逐后错位）

- **位置**：`src/imsdk.js:101-114`（`imLogMark` / `imLogVerdict`）。
- **机制**：日志黑匣子 max 60，超出 `shift()` 时 `__acsvImLogDrop++`。`imLogMark` 只取
  `__acsvImLog.length`；发送期间若发生驱逐，数组下标整体前移，`imLogVerdict(mark)` 从旧下标
  起扫会越过新缓冲末尾 ⇒ 本次成功/失败日志扫不到 ⇒ `doSend` 等 `sendT` 超时 ⇒
  `withSendRecovery` 重试 ⇒ 原消息实际已发出时形成**重复私信**；反向也可能把上一笔日志
  误当本次结果。
- **可达**：发送期间 SDK 日志写入超过 60 行（图片上传/内核 API 打点密集、或页面其他私信
  活动并行时）。
- **修复**：`imLogMark` 返回累计写入数（`drop + length`，与 `tracerCrashAfter` 同口径）；
  `imLogVerdict` 扫 `drop + i >= mark` 的绝对序号。
- **反跑**：`test/unit/imsend.test.js` 新增「缓冲驱逐后仍能命中本次发送」：mark 时 2 行、
  发送中 drop=2，缓冲只剩 `['filler','信息发送成功']`。修复前从下标 2 起扫越界返回 null
  （红）；修复后 `{ok:true}`（绿）。失败行同测。

### B-P2-1 · SDK 构造器抛错永久毒化 `imPromise`

- **位置**：`src/imsdk.js:263-271`（`ensureIm`）、`:383-402`（`rebuildIm`）。
- **机制**：旧 `imPromise = loadImSdk().then(fulfill, reject)` 的 rejection 回调只处理
  `loadImSdk` 失败；`new Ctor({dev:false})` 在 fulfillment 内抛错时，返回的 promise 变成
  rejected，但 `imPromise` 仍指向它 ⇒ 后续 `ensureIm()` 永远返回 rejected，私信域整块
  不可用直到刷新页面。
- **可达**：SDK 构造器在异常环境（缺全局/版本不兼容/页面世界被限制）抛错时。
- **修复**：`p.then(null, function(){ if (imPromise === p) imPromise = null; })` 统一覆盖
  加载失败与构造失败；`rebuildIm` 同款。
- **测试边界**：loader 私有、依赖真实 SDK 源码与构造器，无自动化直测；本条以代码路径
  证明入账，正常路径由现有 harness/单测覆盖。

## 观察项（未改）

- **`imimage` 图片下载不随抽屉关闭取消**（`imgQ`/`imgInflight`）：关闭后仍在途/排队请求会
  跑完并进 LRU，属“缓存预热”而非泄漏；若未来要省流量，应加 generation/abort，而不是改
  LRU。当前不构成功能缺陷。
- **`prewarmIm` 注释与行为轻微漂移（已校准）**：注释说“换好令牌写好 Cookie”，实际只预热
  `midgroundToken` 缓存；Cookie 在首次 `fetchImImageBlob` 的 `setMgCookie` 写入。下载仍
  省掉 token 往返，行为无缺陷；0.9.274 已把注释改成“令牌缓存、Cookie 首次取图时写”。
- **`imlist`/`imchat`/`imsendui` 的异步回包**：`targetId`/`isConnected`/`chat`/`drawer`
  守卫齐备；未发现错误会话注入。`loadChat` 快速切会话时可能多跑一拍照，但拉的是当前
  `chat` 的消息缓存，最终态一致。
- **`imbubble` 分享卡 enrich**：`drawer.bubbles === bubbles` + `chat.targetId === tid` 双重
  守卫，切会话/重开抽屉后的迟到回包不会 patch 到新视图。
- **`imdrawer.teardownIm`**：`listKit.reset()` 已清 `listSig/lastListRows`；重开抽屉不会因
  旧签名跳过首绘。
- **`imsend.doSend`**：`sendSucceed` 监听在 `finish` 中 `off`，`logPoll`/超时定时器均清；
  未发现新增泄漏。

## 未定论 / 需真机

- 真实 SDK 的日志写入速率与 60 行缓冲的实际驱逐频率（本次以单元测试模拟驱逐路径）。
- SDK 构造器在哪些环境会抛错（需真机/TM 组合验证）；修复只保证“抛错后可重试”。
