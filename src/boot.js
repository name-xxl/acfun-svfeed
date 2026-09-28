import { dbgInit } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';

// ---------- 启动（入口编排统一在这里：样式/路由响应/导航注入/空间页注入） ----------
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
