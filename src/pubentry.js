import { mountPubFab } from './pubfab.js';

// ---------- 原生 /member/feeds 的发布浮标（0.9.224 收窄改写） ----------
// 0.9.222 曾在这页注入「发动态」**导航项**（外加一个兜底浮标）；0.9.224 用户裁决改为**右下角常驻浮标**
// ——与脚本内两页（我的页 / 广场）**同一机制、同一位置**，导航项与兜底浮标一并退场（三处入口统一成一个）。
//
// 为什么不需要自愈观察器：常驻浮标挂在 **body** 上、`position:fixed`，而站点的 SPA 重渲染只重画自己的
// 子树（body 本身不被替换）⇒ 浮标不会被冲掉。0.9.222 那版要观察器是因为导航项活在站点子树里。

export function initNativePubFab() {
  mountPubFab(document.body, { light: true }); // light：原生页浅色语境（right:24 bottom:80）
}
