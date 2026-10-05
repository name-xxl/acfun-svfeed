import { dbgInit, dbg } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';
import { watchMemberNav } from './memberplaza.js';
import { bootNativeIm } from './imnative.js';
import { setRoot } from './state.js';
import { IMGVIEW_CSS } from './styles.js';
import { pageKind } from './pagekind.js';
import './mypage.js'; // 子视图自注册（registerView）：import 即入册，boot 链统一收口
import './zone.js';
import './searchview.js';
import './followview.js'; // 关注视图（0.9.91）：dock 卡片流，同款自注册
import './squareview.js'; // 广场视图（0.9.126，吸收动态广场）：feedSquare 全站动态流，dock order 15
import './jingxuanview.js'; // 分区页（0.9.169；展示名 0.9.171 由「精选」改口）：channel 家族+selection 自持游标，dock order 5
import './playlayer.js'; // 播放层（0.9.74）：注册 play 视图 + 注入条目点击出口（setItemOpener）

// ---------- 启动：按页面类型分流（0.9.88 总表；加页面级模块改这张表，不要往各模块塞路径判断） ----------
//   native（message.acfun.cn）：只跑消息增强模块——不注入竖刷样式，不做导航/空间页注入。
//     root 指到 body + 仅注入大图查看器样式段：评论卡配图点击看大图在原生页可用
//   home（/）：全量初始化（现状不动）。ensureStyle 在 boot 跑是有意的——导航兜底胶囊
//     可能在流未打开时出现，样式必须先就位（见 ui.ensureStyle 注释）
//   member（/u/<数字>）：+ tryInjectSpace（空间页小视频区块）；样式由注入点自持（uppage 内调 ensureStyle）
//   memberCenter（/member/*，0.9.128）：0.9.47「其他页不注入」的**限定反转**（只此一路径）——
//     ensureStyle + setRoot(document.body)（无壳浮层）+ watchMemberNav（原生页「动态广场」入口）
//   video / article / other：仅基础设施（dbgInit + 路由监听）。全量 CSS 不再无条件注入——
//     挂载时 player.mount 自持（ensureStyle）；设置存储 / 更新检查 / 原生页 IP·设备模块
//     将来在 video/article 分支入住（Phase 5/6），勿在此处塞临时判断
// 路由监听（toggle + hashchange）全 www 保留：任何页面粘 #svfeed 深链都能进竖刷（0.9.72 起
// 性质；route.js 的 /svfeed 路径别名同样依赖它），不挂载时零成本。
// 注意：上报链路（report.js 信封嗅探 / pagehide 监听 / 账本补报）是模块求值期行为，不经本表
var kind = pageKind(location);
if (kind === 'native') {
  setRoot(document.body);
  var ivSt = document.createElement('style');
  ivSt.textContent = IMGVIEW_CSS;
  document.head.appendChild(ivSt);
  bootNativeIm();
} else {
  dbgInit();
  dbg('boot:' + kind); // harness boot-home / boot-video 断言点（正式构建死码消除）
  if (kind === 'home') ensureStyle();
  toggle();
  window.addEventListener('hashchange', toggle);
  if (kind === 'home') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchNav);
    } else {
      watchNav();
    }
  } else if (kind === 'member') {
    tryInjectSpace();
  } else if (/^\/member(\/|$)/.test(location.pathname)) {
    // 个人中心 /member（0.9.128）：0.9.47 决策的限定反转（只此一路径参加，其余页维持不注入）。
    // 样式先就位（浅色皮肤 + 注入件），root 指到 body（无壳浮层：大图查看器等，native 分支同款先例）
    ensureStyle();
    setRoot(document.body);
    watchMemberNav();
  }
}
