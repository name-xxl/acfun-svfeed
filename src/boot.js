import { dbgInit, dbg } from './dbg.js';
import { ensureStyle } from './ui.js';
import { toggle } from './player.js';
import { watchNav } from './nav.js';
import { tryInjectSpace } from './uppage.js';
import { tryInjectSpaceMoments } from './spacemoments.js'; // 空间页「动态」标签（0.9.218）
import { watchMemberNav } from './memberplaza.js';
import { bootNativeIm } from './imnative.js';
import { mountNativeIp } from './nativeip.js'; // 原生页评论 IP+设备（0.9.248，Phase 6·6a）
import { mountNatPanel } from './natpanel.js'; // IP 标签点击面板（0.9.253：脚本页 .acsv-cip 入口）
import { tryAutoSign } from './signapi.js'; // 自动签到（0.9.277）：进脚本主页静默一次
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
//   member（/u/<数字>）：+ tryInjectSpaceMoments（空间页「动态」标签，0.9.218，order=1）+ tryInjectSpace
//     （空间页小视频区块）；两者的标签栏注入与自愈共用 spacetab（顺序由 order 定，与调用先后无关）；
//     样式由注入点自持（两件内调 ensureStyle）
//   memberCenter（/member/*，0.9.128）：0.9.47「其他页不注入」的**限定反转**（只此一路径）——
//     ensureStyle + setRoot(document.body)（无壳浮层）+ watchMemberNav（原生页「动态广场」入口）
//   video / article / other：基础设施（dbgInit + 路由监听）+ **原生页 IP·设备已入住（0.9.248）**。
//     全量 CSS 不再无条件注入——挂载时 player.mount 自持（ensureStyle）；原生页增强统一走表尾
//     的 mountNativeIp()（幂等；站点改版只改 nativeip 的选择器表），勿在此处散塞路径判断
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
  window.addEventListener('hashchange', toggle); // singleton-listener: SPA 路由入口，页面级
  if (kind === 'home') {
    mountNatPanel(); // 脚本页 IP 标签点击入口（0.9.253）：抽屉里点 .acsv-cip 弹 IP 面板（暗色主题）
    tryAutoSign();   // 自动签到（0.9.277）：首页进脚本即静默签一次；设置可关、已签跳过、失败静默
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchNav); // singleton-listener: 首屏导航注入，页面级
    } else {
      watchNav();
    }
  } else if (kind === 'member') {
    tryInjectSpaceMoments(); // 空间页「动态」标签（0.9.218，order=1 ⇒ 排在「小视频」之前）
    tryInjectSpace();        // 空间页「小视频」标签（0.9.36）
  } else if (/^\/member(\/|$)/.test(location.pathname)) {
    // 个人中心 /member（0.9.128）：0.9.47 决策的限定反转（只此一路径参加，其余页维持不注入）。
    // 样式先就位（浅色皮肤 + 注入件），root 指到 body（无壳浮层：大图查看器等，native 分支同款先例）
    ensureStyle();
    setRoot(document.body);
    watchMemberNav();
  }
  // 原生页评论 IP + 设备（0.9.248，Phase 6·6a）：video/article/other（含 /moment）/member/
  // 个人中心全入住；home 竖刷自己就是脚本页，不吃。幂等
  if (kind !== 'home') mountNativeIp();
}
