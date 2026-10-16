// ---------- 样式与图标 ----------
import { CFG } from './cfg.js';
import { stat } from './dbg.js'; // 解包/回填失败打点（仅 debug；正式构建整段死码消除）
import { unpackText } from './pack.js'; // 内嵌压缩串解包单源（hls/devicetab 同款）

// RAW_CSS 里主题色一律写 #fd4c5d 占位，导出时统一替换为 CSS 变量（换肤只改 cfg.accent）
// 大图查看器样式（0.9.57 单源拆分）：RAW_CSS 拼接同段；原生页不注入全量 CSS（既定
// 设计），boot 仅补此段 + root=body，评论卡配图点击看大图即可用。fadein 动画随段提供
export var IMGVIEW_CSS = '.acsv-imgview{position:absolute;inset:0;z-index:63;background:rgba(0,0,0,.92);display:flex;' // z 63：浮于动态详情(61)与设置(62)之上（0.9.108 实报：详情面板从内部开大图被面板覆盖）
  + 'align-items:center;justify-content:center;cursor:zoom-out;animation:acsv-fadein .18s ease}'
  + '.acsv-imgview img{max-width:94%;max-height:94%;border-radius:6px;'
  + 'box-shadow:0 8px 48px rgba(0,0,0,.6);-webkit-user-select:none;user-select:none}'
  + '@keyframes acsv-fadein{from{opacity:0}to{opacity:1}}';

// 原生页 IP 标签段（0.9.248，Phase 6·6a）：**单独段导出**——原生页由 nativeip 自持注入（同
// IMGVIEW_CSS 先例，不进全量 CSS）。量值照 Web-IP `.acr-ip`：无底色、继承父级字色、间距 3px、
// hover 主题色（#fd4c5d 即站点主色）；**0.9.253 起 cursor:pointer**——点击弹 IP 面板（natpanel；
// 原注释「点击弹面板到位后改 pointer」的兑现）
export var NATIVE_IP_CSS = '.acsv-nip{margin-left:3px;cursor:pointer;transition:color .2s}'
  // 盖楼模式注入点在 .comment-item-footer-left（间距照 Web-IP floorMode 的 8px；0.9.251）
  + '.comment-item-footer-left .acsv-nip{margin-left:8px}'
  + '.acsv-nip:hover{color:#fd4c5d}';

// IP 面板段（0.9.250 生，0.9.253 两主题重构+精简）：**单独段导出**——由 natpanel 自持注入（同
// NATIVE_IP_CSS 先例）。**结构单源、两主题只换 token**：浅色＝Web-IP 面板资产收敛版（原生页
// `.acsv-nip` 入口）；深色＝token 对齐齿轮面板家族（脚本页 `.acsv-cip` 入口——用户 2026-10-15
// 裁决「脚本页的 ip 弹出面板用深色」）。0.9.253 精简（用户裁决）：设置行单行式（原 hint 文案转入
// label 悬停 title，见 natpanel.renderSettings）、组标移除、页脚只留版本号；开关 34×18（与齿轮
// 面板同几何，配色随主题）
export var NATIVE_PANEL_CSS =
  '.acsv-np-mask{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2147483000;display:flex;align-items:center;justify-content:center}'
  + '.acsv-np{width:340px;max-width:92vw;max-height:86vh;overflow-y:auto;background:#fff;border-radius:6px;color:#666;'
  + 'font:12px/1.6 PingFangSC,-apple-system,Microsoft Yahei,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}'
  + '.acsv-np-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 4px}'
  + '.acsv-np-title{font-size:14px;font-weight:600;color:#333}'
  + '.acsv-np-close{cursor:pointer;font-size:20px;line-height:1;color:#999;transition:color .2s}'
  + '.acsv-np-close:hover{color:#fd4c5d}'
  + '.acsv-np-body{padding:4px 14px 8px}'
  + '.acsv-np-card{margin:8px 0 4px;padding:8px 12px;background:#fafafa;border:1px solid #e5e5e5;border-radius:4px;font-size:12px;color:#666}'
  + '.acsv-np-card div{display:flex;justify-content:space-between;padding:1px 0}'
  + '.acsv-np-card .acsv-np-ip{color:#fd4c5d;font-weight:600;font-size:13px}'
  + '.acsv-np-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0}'
  + '.acsv-np-row:last-child{border-bottom:none}'
  + '.acsv-np-label{font-size:14px;line-height:18px;color:#333}'
  + '.acsv-np-sw{position:relative;width:34px;height:18px;border-radius:22px;background:#ddd;cursor:pointer;transition:background .2s;flex:none}'
  + '.acsv-np-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}'
  + '.acsv-np-sw.on{background:#fd4c5d}'
  + '.acsv-np-sw.on::after{transform:translateX(16px)}'
  + '.acsv-np-seg{display:flex;border:1px solid #e5e5e5;border-radius:3px;overflow:hidden;flex:none}'
  + '.acsv-np-seg button{border:none;background:#fff;color:#666;font-size:12px;padding:3px 10px;cursor:pointer;'
  + 'border-right:1px solid #e5e5e5;transition:.15s;font-family:inherit;line-height:16px}'
  + '.acsv-np-seg button:last-child{border-right:none}'
  + '.acsv-np-seg button:hover{background:#f5f5f5}'
  + '.acsv-np-seg button.on{background:#fd4c5d;border-color:#fd4c5d;color:#fff}'
  + '.acsv-np-step{display:flex;align-items:center;gap:8px;flex:none}'
  + '.acsv-np-step button{width:22px;height:22px;border:1px solid #e5e5e5;background:#fff;color:#666;border-radius:3px;cursor:pointer;line-height:1;font-family:inherit}'
  + '.acsv-np-step button:hover{background:#f5f5f5}'
  + '.acsv-np-step b{min-width:24px;text-align:center;color:#333;font-weight:600}'
  + '.acsv-np-acts{display:flex;gap:6px;flex:none}'
  + '.acsv-np-acts button{border:1px solid #999;background:#f4f4f4;color:#666;font-size:12px;padding:3px 12px;'
  + 'border-radius:3px;cursor:pointer;transition:.15s;line-height:16px;font-family:inherit}'
  + '.acsv-np-acts button:hover{background:#e5e5e5}'
  + '.acsv-np-acts button.danger{background:#fff;border-color:#f5222d;color:#f5222d}'
  + '.acsv-np-acts button.danger:hover{background:#fff1f0}'
  + '.acsv-np-acts.right{justify-content:flex-end;margin-top:8px}'
  + '.acsv-np-acts button.primary{border:none;background:#fd4c5d;color:#fff}'
  + '.acsv-np-field{margin:8px 0 4px}'
  + '.acsv-np-field>span{display:block;font-size:13px;color:#333;margin-bottom:6px}'
  + '.acsv-np-ta{width:100%;height:100px;resize:vertical;border:1px solid #e5e5e5;border-radius:3px;padding:6px;'
  + 'font:12px/1.4 monospace;color:#333;box-sizing:border-box}'
  + '.acsv-np-file{width:100%;padding:6px;border:1px dashed #e5e5e5;border-radius:3px;font-size:12px;box-sizing:border-box}'
  + '.acsv-np-skip{display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer}'
  + '.acsv-np-skip span{font-size:12px}'
  + '.acsv-np-foot{padding:8px 14px;font-size:11px;color:#999;background:#fafafa;border-top:1px solid #f0f0f0}'
  // ---- 深色主题（脚本页 `.acsv-cip` 入口；token 对齐齿轮面板家族） ----
  + '.acsv-np.dark{background:rgba(22,22,27,.97);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#cfd3da;'
  + 'font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;backdrop-filter:blur(12px);'
  + 'box-shadow:0 10px 34px rgba(0,0,0,.5)}'
  + '.acsv-np.dark .acsv-np-title{font-size:15px;color:#fff}'
  + '.acsv-np.dark .acsv-np-close{color:#9aa0ab}'
  + '.acsv-np.dark .acsv-np-close:hover{color:var(--acsv-accent)}'
  + '.acsv-np.dark .acsv-np-card{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.09);color:#cfd3da}'
  + '.acsv-np.dark .acsv-np-card .acsv-np-ip{color:var(--acsv-accent)}'
  + '.acsv-np.dark .acsv-np-row{border-bottom-color:rgba(255,255,255,.07)}'
  + '.acsv-np.dark .acsv-np-label{color:#fff}'
  + '.acsv-np.dark .acsv-np-sw{background:rgb(158,158,158)}'
  + '.acsv-np.dark .acsv-np-sw.on{background:var(--acsv-accent)}'
  + '.acsv-np.dark .acsv-np-seg{border-color:rgba(255,255,255,.2);border-radius:8px}'
  + '.acsv-np.dark .acsv-np-seg button{background:transparent;color:#cfd3da;border-right-color:rgba(255,255,255,.2)}'
  + '.acsv-np.dark .acsv-np-seg button.on{background:var(--acsv-accent);border-color:var(--acsv-accent);color:#fff}'
  + '.acsv-np.dark .acsv-np-acts button{border:none;background:rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:7px 16px;font-size:13px}'
  + '.acsv-np.dark .acsv-np-acts button.danger{background:rgba(255,255,255,.12);color:#ff8a95}'
  + '.acsv-np.dark .acsv-np-acts button.primary{background:var(--acsv-accent)}'
  + '.acsv-np.dark .acsv-np-field>span{color:#fff}'
  + '.acsv-np.dark .acsv-np-ta{border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff}'
  + '.acsv-np.dark .acsv-np-file{border-color:rgba(255,255,255,.15);color:#cfd3da}'
  + '.acsv-np.dark .acsv-np-skip span{color:#cfd3da}'
  + '.acsv-np.dark .acsv-np-foot{background:rgba(255,255,255,.03);border-top-color:rgba(255,255,255,.09);color:#8b909a;font-size:12px;padding:10px 14px}'
  + '.acsv-np-toastbox{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;'
  + 'display:flex;flex-direction:column;gap:6px;pointer-events:none}'
  + '.acsv-np-toast{background:rgba(0,0,0,.75);color:#fff;font:13px/1.4 PingFangSC,-apple-system,Microsoft Yahei,sans-serif;'
  + 'padding:8px 20px;border-radius:4px;box-shadow:0 2px 12px rgba(0,0,0,.2);animation:acsv-np-in .2s ease-out;white-space:nowrap}'
  + '.acsv-np-toast.out{opacity:0;transition:opacity .3s}'
  + '@keyframes acsv-np-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';

// ---------- 全量 CSS：压缩模板 + 接缝回填（0.9.258／审计批② P0-1） ----------
// 原文（~92KB 字面量链）已整体搬到 src/cssraw.js（**构建期输入，只被 build.js import**），
// 构建期 deflateRaw+base64 内嵌为 window.__ACSV_CSS_SRC__（同 hls.js / devicetab 先例）；
// 这里解包 → 回填接缝 → 换主色。单源保留：**接缝表与主色替换都只在本件一处**（换肤仍只改
// cfg.accent），且与压缩前同序（先回填、后 .replace，见下方 CSS）。
// 失败降级：串缺失/解包失败 → 空模板（CSS 仍带 :root 变量段与三小段独立导出，注入不炸），
// 打点 css.tplFail；缝名与表漂移 → 未登记标记原样留下，打点 css.seamLeft（两者仅 debug 有效）。
var SEAMS = {
  // 各缝在 cssraw.js 原文里的位置与份数：dockW 4 处（top/dock/scroller/vbody-play）、
  // dockWp14=dockW+14（正文左内边距）、3 条 @media 条件缝（媒体查询不吃 var()，故在此内联
  // 常量——这也是 CFG 值必须冻结在 CSS 文本里的原因）、我的页/搜索页网格 4 缝、主色 3 处、
  // 引用定位闪动 1 处。CFG 侧量取值来源见 cfg.js 对应注释
  dockW: CFG.view.dockW,
  dockWp14: CFG.view.dockW + 14,
  avoidTopW1: CFG.view.avoidTopW - 1,
  avoidW: CFG.view.avoidW,
  narrow1: CFG.view.narrow - 1,
  megridMin: CFG.view.me.gridMin,
  megridGap: CFG.view.me.gridGap,
  meCoverRatio: CFG.view.me.coverRatio,
  searchGridMin: CFG.view.search.gridMin,
  searchGridGap: CFG.view.search.gridGap,
  accent: CFG.accent,
  flashMs: CFG.im.flashMs,
  // 非 CFG 缝：原文里的 `+ IMGVIEW_CSS +` 拼接（0.9.57 拆分）。留作缝而非把这段 CSS 内联进
  // cssraw.js——同一段文本在仓里存两份迟早漂（单源收口）
  imgview: IMGVIEW_CSS
};
var tpl = unpackText(window.__ACSV_CSS_SRC__, Number(window.__ACSV_CSS_LEN__) || 0);
if (tpl === null) { tpl = ''; stat('css.tplFail'); }
var seamMiss = false;
var RAW_CSS = tpl.replace(/\{\{(\w+)\}\}/g, function (all, name) {
  if (Object.prototype.hasOwnProperty.call(SEAMS, name)) return String(SEAMS[name]);
  seamMiss = true;
  return all; // 未登记标记原样留下（真漏了会被 check-release 的「产物里零接缝标记」那条抓红）
});
if (seamMiss) stat('css.seamLeft');
// 注：下面这条注释属于原 RAW_CSS 链尾（动态广场选中态），随整段搬迁留在本件上下文里
// 「动态广场」入口选中态自绘样式于 0.9.131 撤除（真机实报「选中后字体样式和原生不一致」）：
// 改为镜像原生 active 类名（router-link-exact-active/ac-member-navigation-item-active），
// 样式由站点样式表原样接管——见 memberplaza.setActive

// 主题色收敛：RAW_CSS 中的 #fd4c5d 全部替换为 CSS 变量，:root 上定义唯一来源
// --acsv-dw-t（0.9.75 单源）：抽屉滑入/滑出与所有"让位"过渡共用同一时长——
// 抽屉贴右、让位量按它插值，只有同曲线同时长才逐帧贴合（styles.js 让位组注释同契约）。
// 改这一处＝抽屉与让位同步改，禁止各自取值
export var CSS = ':root{--acsv-accent:' + CFG.accent + ';--acsv-top-h:72px;--acsv-dw-t:.28s}'
  + RAW_CSS.replace(/#fd4c5d/g, 'var(--acsv-accent)');



export var ICONS = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  // 两级全屏键（0.9.197）：网页全屏=方框（铺满窗口）；窗口全屏=四角外扩（铺满屏幕）
  webFs: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5z"/></svg>',
  winFs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 0h2v5h-5v-2h3v-3z"/></svg>',
  // 画中画（0.9.200）：外框 + 右下小窗
  pip: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5z"/><path d="M12.5 12.5h6v5h-6v-5z"/></svg>',
  volOn: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  volOff: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.4 1.4L12 10.8l4.6 4.6L18 14z"/></svg>',
  chevDn: '<svg viewBox="0 0 24 24"><path d="M12 16l-6-6 1.4-1.4L12 13.2l4.6-4.6L18 10z"/></svg>',
  chevLt: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  chevRt: '<svg viewBox="0 0 24 24"><path d="M8.6 7.4L10 6l6 6-6 6-1.4-1.4L13.2 12z"/></svg>', // 轮播右箭头（0.9.105 镜像 chevLt）
  star: '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  banana: '<svg viewBox="0 0 24 24"><path d="M21 18.2c-6.9 0-12.6-5-13.7-11.6C7.1 5.2 6 4.2 4.8 4.5 3.7 4.7 3 5.8 3.2 7 4.6 15.4 12 21.5 20.6 21c1.1-.1 1.9-1 1.9-2.1 0-.4-.6-.7-1.5-.7z"/></svg>',
  // 更新入口（0.9.60）：下载箭头入托盘（Material download）
  upd: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>'
};

// A 站小视频页面自带的操作图标（加载失败自动回退到手绘 SVG）
export var SITE_ICONS = {
  heart: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_zan@2x.3e69f4646decbd73fd17.png',
  comment: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_comment@2x.9d8f81ede8984dd9aa34.png',
  share: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_share@2x.f63773e510e6d3259acb.png'
};

// A 站视频页原生图标（取自站点样式表）：
// like/favorite/banana 用作操作栏 CSS mask 的形状来源（只借形状，颜色由 CSS 背景色控制）；
// bananaOn 供投蕉弹层悬停点亮（灰底→亮黄为既定交互）
export var VIDEO_ICONS = {
  like: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/like/keyFrames/frame1.3039ed46b4f6639fa576.svg',
  favorite: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_follow.67c57d40c135d9f5036d.svg',
  banana: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana.d21040881e9721eb1fc8.svg',
  bananaOn: 'https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana_hover.31b7f8940e072833fa9c.svg'
};
// A 站播放器控件图标（0.9.195）：真机取自 www 视频页播放器的**内联 SVG data URI**（§10.11/§10.12），
// 与右栏 SITE_ICONS/VIDEO_ICONS 同一套「CSS mask 借形状、颜色由背景色控」机制（svg 字段为回退）。
export var PLAYER_ICONS = {
  play: { mask: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMThweCIgaGVpZ2h0PSIxOHB4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjUgKDY3NDY5KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5iZnFfYmY8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iYmZxX2JmIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBmaWxsLXJ1bGU9Im5vbnplcm8iPgogICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlLTgiIHg9IjAiIHk9IjAiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCI+PC9yZWN0PgogICAgICAgICAgICA8cGF0aCBkPSJNMTAuMzA5MjgyOCwyLjE5MDEyMDM1IEwxNi43Nzg2MDE2LDEzLjc2ODM0MjQgQzE3LjE4MjY4NDksMTQuNDkxNTM1NSAxNi45MjM5OTU0LDE1LjQwNTM3MzUgMTYuMjAwODAyNCwxNS44MDk0NTY4IEMxNS45NzcxODY3LDE1LjkzNDQwMTkgMTUuNzI1Mjk5NSwxNiAxNS40NjkxNDQ4LDE2IEwyLjUzMDUwNzE2LDE2IEMxLjcwMjA4MDA0LDE2IDEuMDMwNTA3MTYsMTUuMzI4NDI3MSAxLjAzMDUwNzE2LDE0LjUgQzEuMDMwNTA3MTYsMTQuMjQzODQ1MyAxLjA5NjEwNTMxLDEzLjk5MTk1ODEgMS4yMjEwNTAzMywxMy43NjgzNDI0IEw3LjY5MDM2OTE0LDIuMTkwMTIwMzUgQzguMDk0NDUyNDUsMS40NjY5MjczIDkuMDA4MjkwNSwxLjIwODIzNzc2IDkuNzMxNDgzNTQsMS42MTIzMjEwNyBDOS45NzM4NDI3MiwxLjc0NzczOSAxMC4xNzM4NjQ5LDEuOTQ3NzYxMTYgMTAuMzA5MjgyOCwyLjE5MDEyMDM1IFoiIGlkPSJQb2x5Z29uIiBmaWxsPSIjRkZGRkZGIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5LjAwMDAwMCwgOS4wMDAwMDApIHJvdGF0ZSg5MC4wMDAwMDApIHRyYW5zbGF0ZSgtOS4wMDAwMDAsIC05LjAwMDAwMCkgIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=', svg: ICONS.play },
  pause: { mask: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMThweCIgaGVpZ2h0PSIxOHB4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjUgKDY3NDY5KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5iZnFfenQ8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iYmZxX3p0IiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHJlY3QgaWQ9IlJlY3RhbmdsZS04IiBmaWxsLXJ1bGU9Im5vbnplcm8iIHg9IjAiIHk9IjAiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCI+PC9yZWN0PgogICAgICAgICAgICA8cmVjdCBpZD0i55+p5b2iIiBmaWxsPSIjRUFFQUVBIiB4PSIzIiB5PSIxIiB3aWR0aD0iMyIgaGVpZ2h0PSIxNiIgcng9IjEuNSI+PC9yZWN0PgogICAgICAgICAgICA8cmVjdCBpZD0i55+p5b2iLWNvcHktMzYiIGZpbGw9IiNFQUVBRUEiIHg9IjEyIiB5PSIxIiB3aWR0aD0iMyIgaGVpZ2h0PSIxNiIgcng9IjEuNSI+PC9yZWN0PgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+', svg: ICONS.pause },
  danmaku: { mask: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTJweCIgaGVpZ2h0PSIxMnB4IiB2aWV3Qm94PSIwIDAgMTIgMTIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjUgKDY3NDY5KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT7lvLk8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0i5by5IiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8cGF0aCBkPSJNNS41MjgyODEyNSwwLjQ4MDQ2ODc1IEw2LjIzMTQwNjI1LDAgQzYuNjE0MjIwNjYsMC40Mjk2ODk2NDggNy4wMDg3NDc5NywwLjkzMzU5MDg1OSA3LjQxNSwxLjUxMTcxODc1IEw2LjcxNzczNDM3LDEuOTgwNDY4NzUgTDguNDIyODEyNSwxLjk4MDQ2ODc1IEM4Ljg0ODU5NTg4LDEuMzAwNzc3ODUgOS4yMzkyMTY5NywwLjY0MDYyODIwMyA5LjU5NDY4NzUsMCBMMTAuNDYxODc1LDAuNTAzOTA2MjUgQzEwLjE0MTU2MDksMC45NzI2NTg1OTQgOS43OTU4NjEyMywxLjQ2NDg0MTE3IDkuNDI0NzY1NjIsMS45ODA0Njg3NSBMMTEuMjU4NzUsMS45ODA0Njg3NSBMMTEuMjU4NzUsNy41NTg1OTM3NSBMMTAuNDM4NDM3NSw3LjU1ODU5Mzc1IEwxMC40Mzg0Mzc1LDcuMTQ4NDM3NSBMOC40NDYyNSw3LjE0ODQzNzUgTDguNDQ2MjUsOC41ODk4NDM3NSBMMTEuODQ0Njg3NSw4LjU4OTg0Mzc1IEwxMS44NDQ2ODc1LDkuMzc1IEw4LjQ0NjI1LDkuMzc1IEw4LjQ0NjI1LDExLjU3ODEyNSBMNy42MDI1LDExLjU3ODEyNSBMNy42MDI1LDkuMzc1IEw0LjE0NTQ2ODc1LDkuMzc1IEw0LjE0NTQ2ODc1LDguNTg5ODQzNzUgTDcuNjAyNSw4LjU4OTg0Mzc1IEw3LjYwMjUsNy4xNDg0Mzc1IEw1LjYxMDMxMjUsNy4xNDg0Mzc1IEw1LjYxMDMxMjUsNy41NTg1OTM3NSBMNC43OSw3LjU1ODU5Mzc1IEw0Ljc5LDEuOTgwNDY4NzUgTDYuNTc3MTA5MzcsMS45ODA0Njg3NSBDNi4yNzI0MjAzNSwxLjQ4MDQ2NjI1IDUuOTIyODE0NDcsMC45ODA0NzEyNSA1LjUyODI4MTI1LDAuNDgwNDY4NzUgWiBNMC4yOSwwLjY5MTQwNjI1IEwzLjY4ODQzNzUsMC42OTE0MDYyNSBMMy42ODg0Mzc1LDQuNjUyMzQzNzUgTDIuODY4MTI1LDQuNjUyMzQzNzUgTDIuODY4MTI1LDQuMjUzOTA2MjUgTDEuNTU1NjI1LDQuMjUzOTA2MjUgTDEuMzY4MTI1LDYuMjY5NTMxMjUgTDMuNjY1LDYuMjY5NTMxMjUgQzMuNjQ5Mzc0OTIsNy4zODY3MjQzNCAzLjYxODEyNTIzLDguNDg0MzY5NjEgMy41NzEyNSw5LjU2MjUgQzMuNTE2NTYyMjMsMTAuNzQyMTkzNCAyLjk4OTIyMzc1LDExLjMzMjAzMTIgMS45ODkyMTg3NSwxMS4zMzIwMzEyIEMxLjcxNTc3OTg4LDExLjMzMjAzMTIgMS4yMjc1MDM1MiwxMS4zMjQyMTg4IDAuNTI0Mzc1LDExLjMwODU5MzggQzAuNDc3NDk5NzY2LDExLjAxMTcxNzMgMC40MTEwOTQxOCwxMC43MDMxMjY2IDAuMzI1MTU2MjUsMTAuMzgyODEyNSBDMS4wNDM5MDk4NCwxMC40Mzc1MDAzIDEuNTQ3ODExMDUsMTAuNDY0ODQzOCAxLjgzNjg3NSwxMC40NjQ4NDM4IEMyLjM5MTU2NTI3LDEwLjQ2NDg0MzggMi42ODA2MjQ4OCwxMC4xNDQ1MzQ1IDIuNzA0MDYyNSw5LjUwMzkwNjI1IEMyLjc1MDkzNzczLDguNjM2NzE0NDEgMi43ODIxODc0Miw3LjgyNDIyMjU0IDIuNzk3ODEyNSw3LjA2NjQwNjI1IEwwLjQ2NTc4MTI1LDcuMDY2NDA2MjUgTDAuODA1NjI1LDMuNDU3MDMxMjUgTDIuODY4MTI1LDMuNDU3MDMxMjUgTDIuODY4MTI1LDEuNDg4MjgxMjUgTDAuMjksMS40ODgyODEyNSBMMC4yOSwwLjY5MTQwNjI1IFogTTguNDQ2MjUsNi4zNjMyODEyNSBMMTAuNDM4NDM3NSw2LjM2MzI4MTI1IEwxMC40Mzg0Mzc1LDQuOTQ1MzEyNSBMOC40NDYyNSw0Ljk0NTMxMjUgTDguNDQ2MjUsNi4zNjMyODEyNSBaIE01LjYxMDMxMjUsMi43NjU2MjUgTDUuNjEwMzEyNSw0LjE4MzU5Mzc1IEw3LjYwMjUsNC4xODM1OTM3NSBMNy42MDI1LDIuNzY1NjI1IEw1LjYxMDMxMjUsMi43NjU2MjUgWiBNMTAuNDM4NDM3NSwyLjc2NTYyNSBMOC40NDYyNSwyLjc2NTYyNSBMOC40NDYyNSw0LjE4MzU5Mzc1IEwxMC40Mzg0Mzc1LDQuMTgzNTkzNzUgTDEwLjQzODQzNzUsMi43NjU2MjUgWiBNNS42MTAzMTI1LDYuMzYzMjgxMjUgTDcuNjAyNSw2LjM2MzI4MTI1IEw3LjYwMjUsNC45NDUzMTI1IEw1LjYxMDMxMjUsNC45NDUzMTI1IEw1LjYxMDMxMjUsNi4zNjMyODEyNSBaIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+CiAgICA8L2c+Cjwvc3ZnPg==', svg: '弹' },
  dmset: { mask: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMThweCIgaGVpZ2h0PSIxOHB4IiB2aWV3Qm94PSIwIDAgMTggMTgiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjUgKDY3NDY5KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5iZnFfZG1zejwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxnIGlkPSJiZnFfZG1zeiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgZmlsbC1ydWxlPSJub256ZXJvIj4KICAgICAgICAgICAgPHJlY3QgaWQ9IlJlY3RhbmdsZS0zIiB4PSIwIiB5PSIwIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiPjwvcmVjdD4KICAgICAgICAgICAgPHBhdGggZD0iTTEyLDYgTDEzLDYgQzEzLjU1MjI4NDcsNiAxNCw2LjQ0NzcxNTI1IDE0LDcgQzE0LDcuNTUyMjg0NzUgMTMuNTUyMjg0Nyw4IDEzLDggTDEyLDggQzExLjQ0NzcxNTMsOCAxMSw3LjU1MjI4NDc1IDExLDcgQzExLDYuNDQ3NzE1MjUgMTEuNDQ3NzE1Myw2IDEyLDYgWiBNNSwxMCBMNywxMCBDNy41NTIyODQ3NSwxMCA4LDEwLjQ0NzcxNTMgOCwxMSBDOCwxMS41NTIyODQ3IDcuNTUyMjg0NzUsMTIgNywxMiBMNSwxMiBDNC40NDc3MTUyNSwxMiA0LDExLjU1MjI4NDcgNCwxMSBDNCwxMC40NDc3MTUzIDQuNDQ3NzE1MjUsMTAgNSwxMCBaIE01LDYgTDksNiBDOS41NTIyODQ3NSw2IDEwLDYuNDQ3NzE1MjUgMTAsNyBDMTAsNy41NTIyODQ3NSA5LjU1MjI4NDc1LDggOSw4IEw1LDggQzQuNDQ3NzE1MjUsOCA0LDcuNTUyMjg0NzUgNCw3IEM0LDYuNDQ3NzE1MjUgNC40NDc3MTUyNSw2IDUsNiBaIE03LDE1IEM3LjU1MjI4NDc1LDE1IDgsMTUuNDQ3NzE1MyA4LDE2IEM4LDE2LjU1MjI4NDcgNy41NTIyODQ3NSwxNyA3LDE3IEwzLDE3IEMxLjQ1MzYwMjcsMTcgMCwxNS41NDYzOTczIDAsMTQgTDAsNCBDMCwyLjQ1MzYwMjcgMS40NTM2MDI3LDEgMywxIEwxNSwxIEMxNi41NDYzOTczLDEgMTgsMi40NTM2MDI3IDE4LDQgTDE4LDggQzE4LDguNTUyMjg0NzUgMTcuNTUyMjg0Nyw5IDE3LDkgQzE2LjQ0NzcxNTMsOSAxNiw4LjU1MjI4NDc1IDE2LDggTDE2LDQgQzE2LDMuNTU4MTcyMiAxNS40NDE4Mjc4LDMgMTUsMyBMMywzIEMyLjU1ODE3MjIsMyAyLDMuNTU4MTcyMiAyLDQgTDIsMTQgQzIsMTQuNDQxODI3OCAyLjU1ODE3MjIsMTUgMywxNSBMNywxNSBaIE0xMC45NTY5MTkyLDE2LjQwNDc0NTIgQzEwLjU4NTA2NzgsMTYuMDExNjM5MyAxMC4zMDMzNzc2LDE1LjUzMjM2MDcgMTAuMTQ0OTM5MywxNSBMMTAsMTUgQzkuNDQ3NzE1MjUsMTUgOSwxNC41NTIyODQ3IDksMTQgQzksMTMuNDQ3NzE1MyA5LjQ0NzcxNTI1LDEzIDEwLDEzIEwxMC4xNDQ5MzkzLDEzIEMxMC4zMDMzNzc2LDEyLjQ2NzYzOTMgMTAuNTg1MDY3OCwxMS45ODgzNjA3IDEwLjk1NjkxOTIsMTEuNTk1MjU0OCBMMTAuODgzOTc0NiwxMS40Njg5MTExIEMxMC42MDc4MzIyLDEwLjk5MDYxODUgMTAuNzcxNzA3NCwxMC4zNzkwMjgxIDExLjI1LDEwLjEwMjg4NTcgQzExLjcyODI5MjYsOS44MjY3NDMzMSAxMi4zMzk4ODMsOS45OTA2MTg0NiAxMi42MTYwMjU0LDEwLjQ2ODkxMTEgTDEyLjY4ODU1OTIsMTAuNTk0NTQzMyBDMTIuOTQ4OTgwNiwxMC41MzI3MjI1IDEzLjIyMDY2ODksMTAuNSAxMy41LDEwLjUgQzEzLjc3OTMzMTEsMTAuNSAxNC4wNTEwMTk0LDEwLjUzMjcyMjUgMTQuMzExNDQwOCwxMC41OTQ1NDMzIEwxNC4zODM5NzQ2LDEwLjQ2ODkxMTEgQzE0LjY2MDExNyw5Ljk5MDYxODQ2IDE1LjI3MTcwNzQsOS44MjY3NDMzMSAxNS43NSwxMC4xMDI4ODU3IEMxNi4yMjgyOTI2LDEwLjM3OTAyODEgMTYuMzkyMTY3OCwxMC45OTA2MTg1IDE2LjExNjAyNTQsMTEuNDY4OTExMSBMMTYuMDQzMDgwOCwxMS41OTUyNTQ4IEMxNi40MTQ5MzIyLDExLjk4ODM2MDcgMTYuNjk2NjIyNCwxMi40Njc2MzkzIDE2Ljg1NTA2MDcsMTMgTDE3LDEzIEMxNy41NTIyODQ3LDEzIDE4LDEzLjQ0NzcxNTMgMTgsMTQgQzE4LDE0LjU1MjI4NDcgMTcuNTUyMjg0NywxNSAxNywxNSBMMTYuODU1MDYwNywxNSBDMTYuNjk2NjIyNCwxNS41MzIzNjA3IDE2LjQxNDkzMjIsMTYuMDExNjM5MyAxNi4wNDMwODA4LDE2LjQwNDc0NTIgTDE2LjExNjAyNTQsMTYuNTMxMDg4OSBDMTYuMzkyMTY3OCwxNy4wMDkzODE1IDE2LjIyODI5MjYsMTcuNjIwOTcxOSAxNS43NSwxNy44OTcxMTQzIEMxNS4yNzE3MDc0LDE4LjE3MzI1NjcgMTQuNjYwMTE3LDE4LjAwOTM4MTUgMTQuMzgzOTc0NiwxNy41MzEwODg5IEwxNC4zMTE0NDA4LDE3LjQwNTQ1NjcgQzE0LjA1MTAxOTQsMTcuNDY3Mjc3NSAxMy43NzkzMzExLDE3LjUgMTMuNSwxNy41IEMxMy4yMjA2Njg5LDE3LjUgMTIuOTQ4OTgwNiwxNy40NjcyNzc1IDEyLjY4ODU1OTIsMTcuNDA1NDU2NyBMMTIuNjE2MDI1NCwxNy41MzEwODg5IEMxMi4zMzk4ODMsMTguMDA5MzgxNSAxMS43MjgyOTI2LDE4LjE3MzI1NjcgMTEuMjUsMTcuODk3MTE0MyBDMTAuNzcxNzA3NCwxNy42MjA5NzE5IDEwLjYwNzgzMjIsMTcuMDA5MzgxNSAxMC44ODM5NzQ2LDE2LjUzMTA4ODkgTDEwLjk1NjkxOTIsMTYuNDA0NzQ1MiBaIE0xMy41LDE1LjUgQzE0LjMyODQyNzEsMTUuNSAxNSwxNC44Mjg0MjcxIDE1LDE0IEMxNSwxMy4xNzE1NzI5IDE0LjMyODQyNzEsMTIuNSAxMy41LDEyLjUgQzEyLjY3MTU3MjksMTIuNSAxMiwxMy4xNzE1NzI5IDEyLDE0IEMxMiwxNC44Mjg0MjcxIDEyLjY3MTU3MjksMTUuNSAxMy41LDE1LjUgWiIgaWQ9IuWQiOW5tuW9oueKtiIgZmlsbD0iIzk5OTk5OSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+', svg: ICONS.fs }
};

