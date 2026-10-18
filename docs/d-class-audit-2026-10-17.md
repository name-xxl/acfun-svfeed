# D 类机械扫描：全仓高风险模式（2026-10-17，0.9.275 基线）

范围：`src/*.js`（123 件）。方法：全仓 grep 清点 + 命中点逐条读上下文；只列可证明问题。
**结论：未发现需要修的确定项；4 个观察项。**

## 扫描结果

| 模式 | 命中 | 判定 |
|---|---:|---|
| `innerHTML =` | 59 | 54 处为静态图标/`esc`/`renderCommentHtml`/`emotify(esc(...))`/`imTextHtml`；5 处为 `innerHTML=''` 清空。**未发现直接拼未转义用户文本的 sink** |
| `JSON.parse` | 32 | 全部在 `try/catch` 内，或对 `JSON.stringify` 自身产物（`dbg.getStats`/深拷贝）。无未捕获解析 |
| `setInterval` | 11 | 10 处有 `clearInterval`/自清（`danmaku` 泵自清）；仅 `dbg` 调试镜像常驻（见观察项 1） |
| `setTimeout` | 58 | 逐类核对：一次性/去抖/超时均有守卫或自终止；未发现新增无界自续链 |
| `parseInt(` | 8 | 全部带 radix（`parseInt(x, 10)`），无 `0x`/八进制歧义 |
| `new Function` | 2（1 注释 + 1 代码） | 仅 `hls.js` 内嵌串编译；既有设计，非注入 sink |
| `document.write` | 0 | — |
| `window/document.addEventListener` | 26 | `check-listeners` 静态棘轮 0 未登记 |
| 模块级 `var` | 269 | 多为视图/抽屉单例与注入缝；A/B/C 已精读高风险生命周期，未发现新增无主状态 |

## 观察项收口（0.9.276）

1. **`dbg.js` 调试镜像 `setInterval` 无 clear** → **已修**：加 `pagehide` 停表；仅 debug 构建。
2. **`nativeip` 每次路由都排一个 `onDomChange`** → **已修**：单 `urlTimer` 去抖，连续
   pushState 只留最后一拍。
3. **`release` 正文是 GitHub 官方渲染 HTML** → **明确接受**：信任边界在 GitHub（HTTPS +
   官方 sanitize），与自动更新同源；不是脚本自拼用户输入，不引入第二套 sanitizer。
4. **`report` 的 `watchSentAt`/`lastMarkAt` 会话内线性增长** → **已修**：500 上限、按插入序
   淘汰最旧键；只影响去重/节流表，不改上报语义。

## 已复核无新增

- `emoticon.js` 的 `outerHTML = hit.html`：URL 经 `EMOT_CDN_OK` + `EMOT_URL_OK` 双白名单
  （后者排除引号），且只用于表情图节点。
- `imcard.js` 的 `quote.innerHTML = spec.html`：来源是 `ubbQuoteHtml`（内部 `esc` + 
  `renderCommentHtml` 全文先 esc）。
- `ui.elHtml` 调用方：图标/静态标签/internal HTML；唯一的远端内容是观察项 3。
- `settings`/`iploc`/`overlay`/`hls` 的定时器与监听器：A/B/C 已逐条核对，本轮无新增。
