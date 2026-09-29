import { dbgInit } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';
import { bootNativeIm } from './imnative.js';

// ---------- 启动（入口编排统一在这里：样式/路由响应/导航注入/空间页注入） ----------
// 原生私信页（message.acfun.cn）：只跑消息增强模块——不注入竖刷样式，不做导航/空间页注入
if (location.hostname === 'message.acfun.cn') {
  bootNativeIm();
} else {
  dbgInit();
  ensureStyle();
  toggle();
  window.addEventListener('hashchange', toggle);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchNav);
  } else {
    watchNav();
  }
  tryInjectSpace();
}
