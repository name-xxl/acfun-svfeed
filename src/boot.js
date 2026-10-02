import { dbgInit } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';
import { bootNativeIm } from './imnative.js';
import { setRoot } from './state.js';
import { IMGVIEW_CSS } from './styles.js';
import './mypage.js'; // 子视图自注册（registerView）：import 即入册，boot 链统一收口
import './zone.js';
import './searchview.js';
import './playlayer.js'; // 播放层（0.9.74）：注册 play 视图 + 注入条目点击出口（setItemOpener）

// ---------- 启动（入口编排统一在这里：样式/路由响应/导航注入/空间页注入） ----------
// 原生私信页（message.acfun.cn）：只跑消息增强模块——不注入竖刷样式，不做导航/空间页注入。
// root 指到 body + 仅注入大图查看器样式段：评论卡配图点击看大图在原生页可用
if (location.hostname === 'message.acfun.cn') {
  setRoot(document.body);
  var ivSt = document.createElement('style');
  ivSt.textContent = IMGVIEW_CSS;
  document.head.appendChild(ivSt);
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
