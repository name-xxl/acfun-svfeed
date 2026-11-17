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
import { tryAutoSign, signedThisRun } from './signapi.js'; // 自动签到（0.9.277）：进脚本主页静默一次
import { popSignAlmanac } from './signpop.js'; // 签到落地动作单源（0.9.324）：本次真签上才弹黄历卡
import { setRoot } from './state.js';
import { IMGVIEW_CSS } from './styles.js';
import { pageKind } from './pagekind.js';
import { injectOn } from './injects.js'; // 官方页面增强总闸（0.9.341）：原生面注入的唯一判读口
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
// 注入闸门总注（0.9.341，确认稿 docs/preview/native-inject-switch.html）：下表各原生面
// 注入点统一判 injectOn(key)——关＝不注入不加载整链短路（含样式/观察器/定时器），观感恢复
// 原生；**只在此处判读一次**，当前页不做即时摘除（生效＝重新加载后，键清单 ↔ 本表配对由
// check-injects.mjs 钉）。竖刷世界（toggle/hashchange/mountNatPanel 等脚本自有界面）不在射程。
// **豁免（0.9.343 用户复审）**：首页顶导航入口（watchNav + 兜底胶囊）不判任何闸——它是进
// 脚本页、进而进开关面板的唯一进门键，闸吞入口＝自锁悖论；harness inject-off-home 腿反钉
// （总闸关态下入口必须照注，错接回闸即红）。0.9.47 页面白名单照旧管「往哪张页注入」。
var kind = pageKind(location);
if (kind === 'native') {
  // 私信页增强整支受 injectPageIm 管（0.9.341）：关时连 setRoot/IMGVIEW_CSS 都不落——
  // 该支的 root 与大图样式只为 imnative 服务，关掉后无消费者
  if (injectOn('injectPageIm')) {
    setRoot(document.body);
    var ivSt = document.createElement('style');
    ivSt.textContent = IMGVIEW_CSS;
    document.head.appendChild(ivSt);
    bootNativeIm();
  }
} else {
  dbgInit();
  dbg('boot:' + kind); // harness boot-home / boot-video 断言点（正式构建死码消除）
  // 闸判读每键恰一次（check-injects 配对钉 1:1）：injectPageIp 两分支共用——/member 样式
  // 前置与尾行 mountNativeIp；判两遍＝两个消费点，正是闸要灭的漂移源，故在此一次读、两处用
  var ipOn = injectOn('injectPageIp');
  var mpOn = injectOn('injectMemberPlaza');
  if (kind === 'home') ensureStyle();
  toggle();
  window.addEventListener('hashchange', toggle); // singleton-listener: SPA 路由入口，页面级
  if (kind === 'home') {
    mountNatPanel(); // 脚本页 IP 标签点击入口（0.9.253）：抽屉里点 .acsv-cip 弹 IP 面板（暗色主题）
    tryAutoSign().then(function (r) {
      // 自动签到（0.9.277）：首页进脚本即静默签一次；设置可关、已签跳过、失败静默。
      // 0.9.324 用户裁决：**只有本次真的签上**才弹黄历卡（已签跳过返回状态对象、失败返回 null，
      // 两者都不弹也不 toast）——判据 signedThisRun 与弹卡动作 popSignAlmanac 均各自单源。
      if (signedThisRun(r)) popSignAlmanac(r, null);
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchNav); // singleton-listener: 首屏导航注入，页面级
    } else {
      watchNav();
    }
  } else if (kind === 'member') {
    // 空间页两自建标签各有一闸（0.9.341）；全关＝watchSpaceTabs 共享观察器也不起（注入件不被调用）
    if (injectOn('injectSpaceMoments')) tryInjectSpaceMoments(); // 「动态」标签（0.9.218，order=1）
    if (injectOn('injectSpaceShortVideo')) tryInjectSpace();      // 「小视频」标签（0.9.36）
  } else if (kind === 'memberCenter') {
  // 判据 0.9.303 收编进 pageKind（旧此处裸正则与 memberplaza.memberPath 逐字两份）
    // 个人中心 /member（0.9.128）：0.9.47 决策的限定反转（只此一路径参加，其余页维持不注入）。
    // 样式先就位（浅色皮肤 + 注入件），root 指到 body（无壳浮层：大图查看器等，native 分支同款先例）
    // 0.9.341 双闸口径：广场接管链自有闸；样式/root 前置与 IP 面**共用**（成员页 .feed-time
    // 挂点吃 .acsv-cip 样式）——两闸全关时本支一行不跑。判读值取自表头一次性 ipOn/mpOn。
    // cssraw 大表按域分段另批挂账（确认稿口径钉死），本批混开仍走整表，与现状同口径
    if (mpOn || ipOn) {
      ensureStyle();
      setRoot(document.body);
    }
    if (mpOn) watchMemberNav();
  }
  // 原生页评论 IP + 设备（0.9.248，Phase 6·6a）：video/article/other（含 /moment）/member/
  // 个人中心全入住；home 竖刷自己就是脚本页，不吃。幂等。0.9.341：整支受 ipOn 闸管
  if (kind !== 'home' && ipOn) mountNativeIp();
}
