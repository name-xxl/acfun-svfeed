import { dbgInit } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';

// ---------- 启动 ----------
dbgInit();
ensureStyle();
toggle();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', watchNav);
} else {
  watchNav();
}
tryInjectSpace();
