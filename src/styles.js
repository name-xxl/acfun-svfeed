// ---------- 样式与图标 ----------
import { CFG } from './cfg.js';

// RAW_CSS 里主题色一律写 #fd4c5d 占位，导出时统一替换为 CSS 变量（换肤只改 cfg.accent）
// 大图查看器样式（0.9.57 单源拆分）：RAW_CSS 拼接同段；原生页不注入全量 CSS（既定
// 设计），boot 仅补此段 + root=body，评论卡配图点击看大图即可用。fadein 动画随段提供
export var IMGVIEW_CSS = '.acsv-imgview{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.92);display:flex;'
  + 'align-items:center;justify-content:center;cursor:zoom-out;animation:acsv-fadein .18s ease}'
  + '.acsv-imgview img{max-width:94%;max-height:94%;border-radius:6px;'
  + 'box-shadow:0 8px 48px rgba(0,0,0,.6);-webkit-user-select:none;user-select:none}'
  + '@keyframes acsv-fadein{from{opacity:0}to{opacity:1}}';

var RAW_CSS = ''
  // A 站原生 iconfont（acfun-frontend-next）：动态页等站内页面同款字体（src 取自
  // member/feeds 页面样式，0.9.55），小视频/推荐页不加载，抽屉内自注入；码点登记在
  // imicons.GLYPHS。同域 ali-imgs CDN，woff 失败走 ttf 兜底
  + '@font-face{font-family:acfun-frontend-next;'
  + 'src:url(//ali-imgs.acfun.cn/kos/nlav10360/static/img/acfun-frontend-next.90fc2dfc.woff) format("woff"),'
  + 'url(//ali-imgs.acfun.cn/kos/nlav10360/static/img/acfun-frontend-next.bdc44d05.ttf) format("truetype")}'
  + '#acsv-root{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;'
  + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;user-select:none}'
  + '.acsv-root *{box-sizing:border-box;margin:0;padding:0}'
  // 顶栏（0.9.72 抽离共享组件，0.9.73 四界面复用）：高度走 --acsv-top-h（72px，:root 单源——
  // toast 落位等派生值一律 calc 引用，勿再写死）；左缘让开左栏 dock，窄屏媒体查询还原满宽。
  // 左中右三区：搜索框居中常驻（抖音同款位置）+ 右侧按钮组（源切换/私信/更新/退出）
  + '.acsv-top{position:absolute;top:0;left:' + CFG.view.dockW + 'px;right:0;height:var(--acsv-top-h);'
  + 'display:flex;align-items:center;padding:0 24px;background:linear-gradient(rgba(0,0,0,.6),transparent);'
  + 'z-index:30;pointer-events:none;transition:right var(--acsv-dw-t) ease}' // right 过渡供抽屉避让收窄（见下）
  + '.acsv-top *{pointer-events:auto}'
  + '.acsv-top .acsv-sbox{position:absolute;left:50%;transform:translateX(-50%);width:min(480px,44%)}'
  + '.acsv-top-right{margin-left:auto;display:flex;gap:10px}'
  // 抽屉占槽时的顶栏让位（0.9.73）：顶栏整体收窄到抽屉左缘——右组随容器贴到抽屉边（不再吃
  // transform），绝对居中的搜索框随容器自动回到剩余区中心，并按「剩余宽 − 右组预留」收窄，
  // 绝不压到右组（0.9.72 遗留：右组 transform 左移后会与居中搜索框重叠）。预留 304 =
  // 2×(im/upd/✕ 共 128) + 2×间距 12 + 两侧 48；源切换隐藏（抽屉开着时切源会静默重置背后
  // 舞台）；视口窄到搜索框已不可用（<CFG.view.avoidTopW）时只留右组
  + '#acsv-root.acsv-with-comments .acsv-top{right:var(--acsv-dw,380px)}'
  + '#acsv-root.acsv-with-comments .acsv-seg{display:none}'
  + '#acsv-root.acsv-with-comments .acsv-top .acsv-sbox{width:min(480px,44%,calc(100% - 304px))}'
  + '@media (max-width:' + (CFG.view.avoidTopW - 1) + 'px){'
  + '#acsv-root.acsv-with-comments .acsv-top .acsv-sbox{display:none}}'
  // 视图态（0.9.73）：提到视图容器(55)/左栏(56)之上、抽屉(58)之下；实底+底边线对齐视图页底色
  // （渐变是视频上的设计，不透明页上会发暗）。border 由 border-box 消化，offsetHeight 仍=72
  // （harness topbar-72 精确断言依赖此点——不得加 padding/行高）
  + '.acsv-top--view{background:#16161b;border-bottom:1px solid rgba(255,255,255,.08);z-index:57}'
  // 视图态隐源切换：seg 只在竖刷有意义（0.9.73 前只是名义隐藏——视图里点它会静默重置背后
  // feed 且零界面反馈，现在由 CSS 真正隐藏）
  + '.acsv-top--view .acsv-seg{display:none}'
  + '.acsv-tbtn{width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.14);'
  + 'color:#fff;cursor:pointer;display:grid;place-items:center;font-size:16px;transition:transform .15s,background .15s}'
  + '.acsv-tbtn:hover{transform:scale(1.08);background:rgba(255,255,255,.25)}'
  + '.acsv-scroller{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}'
  + '.acsv-scroller::-webkit-scrollbar{display:none}'
  + '.acsv-slide{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;'
  + 'display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}'
  + '.acsv-video{display:block;width:100%;height:100%;object-fit:contain;cursor:pointer;z-index:5}'
  + '.acsv-ambient{position:absolute;inset:-60px;z-index:0;background-size:cover;background-position:center;'
  + 'filter:blur(60px) brightness(.35) saturate(1.2);transform:scale(1.15)}'
  + '.acsv-side{position:absolute;right:36px;bottom:96px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:14px}'
  + '.acsv-rail{width:56px;display:flex;flex-direction:column;'
  + 'align-items:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}'
  + '.acsv-avatar{width:48px;height:48px;border-radius:50%;border:2px solid #fff;object-fit:cover;display:block;transition:transform .15s}'
  + '.acsv-avwrap{position:relative;margin-bottom:18px}'
  + '.acsv-followbtn{position:absolute;right:-2px;bottom:-4px;width:20px;height:20px;border-radius:50%;'
  + 'background:#fd4c5d;color:#fff;border:2px solid #111;font-size:13px;line-height:17px;text-align:center;'
  + 'cursor:pointer;font-weight:700;user-select:none;transition:transform .15s,background .15s;z-index:2}'
  + '.acsv-followbtn:hover{transform:scale(1.15)}'
  + '.acsv-followbtn.on{background:#555}'
  + '.acsv-avatar:hover{transform:scale(1.08)}'
  + '.acsv-rail-btn{width:56px;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;'
  + 'align-items:center;margin-bottom:18px;'
  // 阴影统一挂在按钮上：mask 图标自己画阴影会被自身 mask 裁掉（渲染顺序 filter→mask），父级 filter 作用于裁切后的合成结果
  + 'filter:drop-shadow(0 1px 4px rgba(0,0,0,.55))}'
  + '.acsv-rail-btn svg{width:40px;height:40px;fill:#fff;transition:transform .15s,fill .15s}'
  + '.acsv-rail-btn:hover svg{transform:scale(1.12)}'
  + '.acsv-rail-btn.on svg{fill:var(--acsv-accent)}'
  + '.acsv-rail-btn.thrown svg{fill:#ffb323}' // 投过蕉：锁定蕉黄（A 站蕉色）
  + '.acsv-rail-btn.bump svg{animation:acsv-bump .4s ease}'
  + '@keyframes acsv-bump{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1)}}'
  + '.acsv-count{font-size:13px;font-weight:500;line-height:16px;margin-top:4px;margin-bottom:0;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}'
  // 左下 info 让位左栏 dock（CFG.view.dockW=168）：窄屏 dock 隐藏时媒体查询还原
  // info 挂 slide 内（slide 已随 scroller margin 让位 dock），left 恒 24——再加 dockW 是双重让位
  // （0.9.63 曾误改 184 致标题落到 352px，回归实锤）
  + '.acsv-info{position:absolute;left:24px;bottom:40px;z-index:15;max-width:min(56%,560px);color:#fff;'
  + 'text-shadow:0 1px 4px rgba(0,0,0,.7);transition:bottom .25s ease}'
  + '.acsv-slide[data-ctl="1"] .acsv-info,.acsv-slide[data-paused="1"] .acsv-info{bottom:96px}'
  + '.acsv-meta{font-size:15px;font-weight:600;line-height:21px;margin-bottom:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}'
  + '.acsv-meta .acsv-views{font-size:13px;font-weight:400;opacity:.85}'
  + '.acsv-meta a{color:#fff;text-decoration:none}'
  + '.acsv-meta a:hover{text-decoration:underline}'
  + '.acsv-title{font-size:16px;font-weight:400;line-height:22px;max-height:66px;overflow:hidden;cursor:default}'
  + '.acsv-arrows{display:flex;flex-direction:column;gap:10px}'
  + '.acsv-arrow{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.12);cursor:pointer;'
  + 'display:grid;place-items:center;backdrop-filter:blur(4px);transition:background .15s,transform .15s}'
  + '.acsv-arrow svg{width:22px;height:22px;fill:#fff}'
  + '.acsv-arrow:hover{background:rgba(255,255,255,.25);transform:scale(1.06)}'
  + '.acsv-arrow:disabled{opacity:.3;cursor:default;transform:none}'
  + '.acsv-controls{position:absolute;left:0;right:0;bottom:0;z-index:25;padding:26px 14px 8px;'
  + 'background:linear-gradient(transparent,rgba(0,0,0,.72));opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s,right var(--acsv-dw-t) ease}'
  + '.acsv-slide[data-ctl="1"] .acsv-controls,.acsv-slide[data-paused="1"] .acsv-controls{opacity:1;visibility:visible}'
  + '.acsv-track{position:relative;height:4px;margin:0 4px 6px;border-radius:2px;background:rgba(255,255,255,.32);cursor:pointer;transition:height .15s}'
  + '.acsv-track:hover,.acsv-track[data-drag="1"]{height:6px}'
  + '.acsv-track-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#fd4c5d;border-radius:2px}'
  + '.acsv-track-handle{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:#fff;'
  + 'transform:translate(-50%,-50%) scale(0);transition:transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.5)}'
  + '.acsv-track:hover .acsv-track-handle,.acsv-track[data-drag="1"] .acsv-track-handle{transform:translate(-50%,-50%) scale(1)}'
  + '.acsv-bubble{position:absolute;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.82);padding:3px 8px;'
  + 'border-radius:6px;font-size:12px;display:none;white-space:nowrap}'
  + '.acsv-bubble.show{display:block}'
  + '.acsv-ctl-row{display:flex;align-items:center;gap:6px}'
  + '.acsv-cbtn{border:none;background:none;color:#fff;cursor:pointer;height:32px;min-width:32px;padding:0 6px;'
  + 'border-radius:6px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;'
  + 'font-family:inherit;transition:background .15s;white-space:nowrap;flex:none}'
  + '.acsv-cbtn:hover{background:rgba(255,255,255,.16)}'
  + '.acsv-cbtn svg{width:20px;height:20px;fill:#fff}'
  + '.acsv-cbtn.on{color:#fd4c5d}'
  + '.acsv-cbtn.on svg{fill:#fd4c5d}'
  + '.acsv-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}'
  + '.acsv-cbtn.on .acsv-dot{background:#fd4c5d}'
  + '.acsv-time{font-size:12px;color:#ddd;font-variant-numeric:tabular-nums;margin-left:4px;white-space:nowrap;flex:none}'
  + '.acsv-icon-img{width:40px;height:40px;object-fit:contain;transition:transform .15s}'
  + '.acsv-rail-btn:hover .acsv-icon-img{transform:scale(1.12)}'
  + '.acsv-rail-btn.bump .acsv-icon-img{animation:acsv-bump .4s ease}'
  + '.acsvg-icon-mask{display:block;width:40px;height:40px;background-color:#fff;'
  + '-webkit-mask:var(--acsvg-icon) center/contain no-repeat;mask:var(--acsvg-icon) center/contain no-repeat;'
  + 'transition:transform .15s,background-color .15s}'
  + '.acsv-rail-btn:hover .acsvg-icon-mask{transform:scale(1.12)}'
  + '.acsv-rail-btn.on .acsvg-icon-mask{background-color:var(--acsv-accent)}'
  + '.acsv-rail-btn.thrown .acsvg-icon-mask{background-color:#ffb323}' // 投过蕉：锁定蕉黄（A 站蕉色）
  + '.acsv-rail-btn.bump .acsvg-icon-mask{animation:acsv-bump .4s ease}'
  + '.acsv-rail-btn.thrown{cursor:default}'
  // 抽屉 z 58（0.9.73 由 45 提到视图态顶栏(57)之上）：视图里开抽屉时抽屉须盖住视图(55)/dock(56)/
  // 顶栏(57)，顶栏右组靠避让平移贴到抽屉左缘保持可点；低于大图(60)/更新弹窗(65)。几何上
  // 抽屉贴右、dock 贴左，两者不重叠——层级反转只保证「后开的浮层在上」与 overlay 栈序一致
  // 抽屉滑入骨架（0.9.75 抽离）：评论/私信两抽屉共用同一条规则（此前逐字重复两份，只差
  // 宽度默认值与背景透明度 .96/.97）；各自的差异写在共享规则**之后**（同权重靠后生效）
  + '.acsv-drawer,.acsv-msgdrawer{position:absolute;top:0;right:0;bottom:0;z-index:58;display:flex;flex-direction:column;'
  + 'background:rgba(22,22,27,.96);backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.09);'
  + 'transform:translateX(100%);transition:transform var(--acsv-dw-t) ease}'
  + '.acsv-drawer.open,.acsv-msgdrawer.open{transform:translateX(0)}'
  + '.acsv-drawer{width:var(--acsv-dw,380px)}'
  + '.acsv-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:15px;font-weight:600;'
  + 'border-bottom:1px solid rgba(255,255,255,.09);flex:none}'
  + '.acsv-drawer-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;'
  + 'border-radius:50%;cursor:pointer;font-size:13px;line-height:1}'
  + '.acsv-drawer-close:hover{background:rgba(255,255,255,.22)}'
  + '.acsv-drawer-list{flex:1;overflow-y:auto;padding:6px 0 14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}'
  + '.acsv-drawer-list::-webkit-scrollbar{width:5px}'
  + '.acsv-drawer-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}'
  // 抽屉输入栏（0.9.41 起评论/私信共用，DOM 由 inputbar.buildInputBar 统一产出）与表情面板
  + '.acsv-cinput{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;'
  + 'border-top:1px solid rgba(255,255,255,.09);background:rgba(22,22,27,.98)}'
  + '.acsv-cinput-emot{border:none;background:none;font-size:18px;cursor:pointer;flex:none;padding:2px;line-height:1}'
  + '.acsv-cinput-emot:hover{transform:scale(1.12)}'
  + '.acsv-cinput-text{flex:1;min-width:0;height:36px;border:none;background:rgba(255,255,255,.1);border-radius:8px;'
  + 'color:#fff;font-size:13px;padding:9px 12px;outline:none;font-family:inherit;resize:none}'
  + '.acsv-cinput-text:focus{background:rgba(255,255,255,.16)}'
  + '.acsv-cinput-send{flex:none;border:none;background:#fd4c5d;color:#fff;font-size:13px;padding:8px 16px;'
  + 'border-radius:999px;cursor:pointer;font-family:inherit}'
  + '.acsv-cinput-send:hover{background:#ff6b7a}'
  + '.acsv-emotpanel{position:absolute;left:0;right:0;bottom:57px;z-index:6;display:none;flex-direction:column;'
  + 'max-height:300px;padding:10px 10px 6px;background:rgba(22,22,27,.98);border-top:1px solid rgba(255,255,255,.1)}'
  + '.acsv-emot-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;'
  + 'scrollbar-color:rgba(255,255,255,.2) transparent}'
  + '.acsv-emot-head{font-size:12px;color:#7a7f8a;padding:4px 2px 6px}'
  + '.acsv-emot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:2px}'
  + '.acsv-emot-item{border:none;background:none;padding:2px;cursor:pointer;line-height:0;border-radius:6px}'
  + '.acsv-emot-item:hover{background:rgba(255,255,255,.08)}'
  + '.acsv-emot-item img{width:100%;height:44px;object-fit:contain;pointer-events:none}'
  + '.acsv-emot-foot{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;'
  + 'background:rgba(255,255,255,.05);border-radius:8px}'
  + '.acsv-emot-strip{display:flex;align-items:center;gap:8px;overflow-x:auto;flex:1;min-width:0;'
  + 'padding:2px;scrollbar-width:none}'
  + '.acsv-emot-strip::-webkit-scrollbar{display:none}'
  + '.acsv-emot-thumb{flex:none;width:32px;height:32px;padding:0;border:2px solid transparent;'
  + 'border-radius:8px;background:none;cursor:pointer;line-height:0}'
  + '.acsv-emot-thumb img{width:100%;height:100%;object-fit:contain;pointer-events:none}'
  + '.acsv-emot-thumb.on{border-color:#fd4c5d}'
  + '.acsv-emot-page{flex:none;width:24px;height:24px;border:none;border-radius:50%;background:none;'
  + 'color:#999;cursor:pointer;font-size:14px;line-height:1}'
  + '.acsv-emot-page:hover{background:rgba(255,255,255,.1);color:#fff}'
  + '.acsv-cinput-emot svg{width:20px;height:20px;fill:#999;transition:fill .15s}'
  + '.acsv-cinput-emot:hover svg{fill:#fd4c5d}'
  + '.acsv-cinput-img{border:none;background:none;padding:2px;cursor:pointer;line-height:0}'
  + '.acsv-cinput-img svg{width:20px;height:20px;fill:#999;transition:fill .15s}'
  + '.acsv-cinput-img:hover svg{fill:#fd4c5d}'
  + '.acsv-creplybtn,.acsv-cfwdbtn{cursor:pointer;color:#7a7f8a;font-size:12px;display:inline-flex;align-items:center;gap:3px}'
  + '.acsv-creplybtn:hover,.acsv-cfwdbtn:hover{color:#9fd0ff}'
  + '.acsv-citem{padding:10px 14px;display:flex;gap:10px;border-radius:10px;transition:background .15s}'
  + '.acsv-citem:hover{background:rgba(255,255,255,.045)}'
  + '.acsv-avlink{flex:none;display:block}'
  + '.acsv-citem img.av{width:36px;height:36px;border-radius:50%;object-fit:cover;transition:transform .15s}'
  + '.acsv-avlink:hover img.av{transform:scale(1.08)}'
  + '.acsv-cbody{flex:1;min-width:0}'
  + '.acsv-cname{font-size:13px;color:#9aa0ab;margin-bottom:4px;display:flex;align-items:center;gap:6px}'
  + '.acsv-cname a{color:#9aa0ab;text-decoration:none}'
  + '.acsv-cname a:hover{color:#e8eaed;text-decoration:underline}'
  + '.acsv-cname .up{background:#fd4c5d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600}'
  // 评论正文开文字选择（root 全局 user-select:none 之上的例外）：划选后原生右键即可复制；
  // 只开正文，昵称/时间/按钮保持不可选，避免误选
  + '.acsv-ctext{font-size:14px;line-height:1.6;word-break:break-word;white-space:pre-wrap;color:#f0f1f3;'
  + 'user-select:text;-webkit-user-select:text}'
  + '.acsv-cmeta{font-size:12px;color:#7a7f8a;margin-top:6px;display:flex;gap:12px;align-items:center}'
  + '.acsv-clike{display:inline-flex;align-items:center;gap:3px;color:#7a7f8a}'
  // 原生形状走 mask（currentColor 染色），回退手绘 svg 走 fill:currentColor，状态色统一由容器 color 驱动
  // 评论操作三键图标统一 iconfont 字形（imicons.GLYPHS.feed*）：currentColor 跟随容器
  // 状态色。字形墨迹 ≈1.02em（canvas 实测），11px 字号墨迹 ≈11px 与 12px 定盒的 svg
  // 图标（墨迹约 10px）视觉等大；12×12 定盒与 mask/svg 图标盒子尺寸一致（0.9.56，
  // 0.9.55 的 13px 偏大）
  + '.acsvg-glyph{font-family:acfun-frontend-next,sans-serif;font-style:normal;font-size:11px;'
  + 'display:inline-block;width:12px;height:12px;line-height:12px;text-align:center;color:currentColor}'
  + '.acsv-csub{margin:8px 0 2px;padding:4px 12px;background:rgba(255,255,255,.05);border-radius:10px}'
  + '.acsv-csub .acsv-citem{padding:8px 0}'
  + '.acsv-csub .acsv-citem:hover{background:none}'
  + '.acsv-csub .acsv-citem img.av{width:26px;height:26px}'
  + '.acsv-cmore{font-size:12px;color:#9fd0ff;text-decoration:none;display:inline-block;background:none;'
  + 'border:none;cursor:pointer;padding:0;font-family:inherit}'
  + '.acsv-cmore:hover{text-decoration:underline}'
  + '.acsv-hot-head{padding:10px 14px 4px;font-size:12px;color:#fd4c5d;font-weight:700;'
  + 'display:flex;align-items:center;gap:5px}'
  + '.acsv-hot-divider{padding:12px 14px 4px;font-size:12px;color:#7a7f8a}'
  + '.acsv-drawer-more{display:block;margin:12px auto;padding:8px 24px;border:1px solid rgba(255,255,255,.22);'
  + 'background:none;color:#ddd;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}'
  + '.acsv-drawer-more:hover{background:rgba(255,255,255,.1)}'
  + '.acsv-drawer-tip{padding:46px 0;text-align:center;color:#888;font-size:13px}'
  + '.acsv-hint{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);z-index:40;display:flex;'
  + 'align-items:center;gap:10px;padding:8px 10px 8px 16px;background:rgba(0,0,0,.72);border-radius:999px;'
  + 'font-size:13px;white-space:nowrap;animation:acsv-fadein .3s ease}'
  + '.acsv-hint.hide{display:none}'
  + '.acsv-hint-btn{border:none;background:#fd4c5d;color:#fff;font-size:12px;font-family:inherit;'
  + 'padding:6px 14px;border-radius:999px;cursor:pointer}'
  + '.acsv-hint-btn:hover{background:#ff6b7a}'
  + '.acsv-hint-x{border:none;background:none;color:#aaa;font-size:14px;cursor:pointer;padding:4px 8px;line-height:1}'
  + '.acsv-hint-x:hover{color:#fff}'
  // fadein 动画随 IMGVIEW_CSS 段提供（原生页注入该段时同样需要）
  + '.acsv-spinner{position:absolute;top:50%;left:50%;margin:-16px 0 0 -16px;width:32px;height:32px;z-index:8;'
  + 'border:3px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite;pointer-events:none}'
  + '@keyframes acsv-spin{to{transform:rotate(360deg)}}'
  + '.acsv-slide[data-state="loading"] .acsv-spinner{display:block}'
  + '.acsv-spinner{display:none}'
  // 居中用负 margin（同 spinner）：transform 留给评论抽屉的舞台缩放，避免叠加错位
  + '.acsv-playicon{position:absolute;top:50%;left:50%;margin:-36px 0 0 -36px;z-index:9;width:72px;height:72px;'
  + 'border-radius:50%;background:rgba(0,0,0,.5);display:none;place-items:center;pointer-events:none}'
  + '.acsv-playicon svg{width:34px;height:34px;fill:#fff;margin-left:4px}'
  + '.acsv-slide[data-paused="1"] .acsv-playicon{display:grid}'
  + '.acsv-errbox{position:absolute;inset:0;display:none;place-items:center;z-index:12;flex-direction:column;gap:12px;color:#bbb}'
  + '.acsv-slide[data-state="error"] .acsv-errbox{display:grid}'
  + '.acsv-retry{padding:8px 22px;border:none;border-radius:999px;background:#fd4c5d;color:#fff;cursor:pointer;font-size:13px}'
  + '.acsv-toast{position:fixed;top:calc(var(--acsv-top-h) + 14px);left:50%;transform:translateX(-50%);z-index:2147483600;background:rgba(0,0,0,.78);'
  + 'color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .25s;pointer-events:none}'
  + '.acsv-toast.show{opacity:1}'
  + '.acsv-fab{position:fixed;right:18px;bottom:18px;z-index:2147482990;background:#fd4c5d;color:#fff;border:none;'
  + 'border-radius:999px;padding:10px 16px;font-size:13px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}'
  // UP 主空间页的小视频区块（空间页为浅色主题）
  + '.acsv-space{margin:18px auto 40px;max-width:1160px;font-family:inherit}'
  + '.acsv-space-head{display:flex;align-items:baseline;gap:8px;padding:0 4px 10px;'
  + 'border-bottom:2px solid #fd4c5d;margin-bottom:14px}'
  + '.acsv-space-head h2{font-size:18px;color:#333;margin:0;font-weight:700}'
  + '.acsv-space-head .n{color:#999;font-size:13px}'
  + '.acsv-space-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}'
  + '@media (max-width:1000px){.acsv-space-grid{grid-template-columns:repeat(3,1fr)}}'
  + '@media (max-width:640px){.acsv-space-grid{grid-template-columns:repeat(2,1fr)}}'
  + '.acsv-space-cell{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;'
  + 'aspect-ratio:3/4;background:#000;display:block}'
  + '.acsv-space-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s,opacity .2s;opacity:0}'
  + '.acsv-space-cell img.ld{opacity:1}'
  + '.acsv-space-cell:hover img{transform:scale(1.06)}'
  + '.acsv-space-more{display:block;margin:16px auto;padding:8px 28px;border:1px solid #ddd;background:#fff;'
  + 'color:#666;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}'
  + '.acsv-space-more:hover{color:#fd4c5d;border-color:#fd4c5d}'
  + '.acsv-space-tip{padding:30px 0;text-align:center;color:#999;font-size:13px}'
  // 评论抽屉避让（分层）：画面本体等比缩放+左移进剩余空间（几何与旧"整体缩放 scroller"一致——
  // 这些元素中心均=slide 中心，逐元素施加同一变换结果相同）；界面控件不缩放：
  // 底栏钉底只收窄宽度（基础规则自带 right 过渡），侧栏原尺寸左移；顶栏整体收窄到抽屉左缘
  // （右组随容器内移、搜索框随容器自动回剩余区中心——0.9.73 收口，见顶栏段规则）。
  // 弹幕画布不参与变换：dmcanvas.align() 本就按视频视觉矩形定位，再叠 transform 会二次变换错位，
  // 只给它补同曲线的 left/top/width/height 过渡，让 align() 的 250ms 重定位随视频平滑滑动。
  // --acsv-dw（抽屉实际宽）/ --acsv-cscale（缩放比）由 JS 按 CFG.comments 写入 root
  + '.acsv-video,.acsv-playicon,.acsv-errbox,.acsv-side{transition:transform var(--acsv-dw-t) ease}'
  + '#acsv-root.acsv-with-comments .acsv-video,#acsv-root.acsv-with-comments .acsv-playicon,'
  + '#acsv-root.acsv-with-comments .acsv-errbox{transform:translateX(calc(var(--acsv-dw,380px) / -2)) scale(var(--acsv-cscale,1))}'
  + '#acsv-root.acsv-with-comments .acsv-dmcanvas{transition:left var(--acsv-dw-t) ease,top var(--acsv-dw-t) ease,width var(--acsv-dw-t) ease,height var(--acsv-dw-t) ease}'
  + '#acsv-root.acsv-with-comments .acsv-controls{right:var(--acsv-dw,380px)}'
  + '#acsv-root.acsv-with-comments .acsv-side{transform:translateX(calc(var(--acsv-dw,380px) * -1))}'
  // 视图正文让位（0.9.73）：抽屉占槽时视图正文右缘收窄到抽屉左缘——视图内容是「舞台」，与
  // 竖刷同理念（卡片不缩放，只收窄可用宽，网格 auto-fill 自然重排）。正文 right 与抽屉
  // transform 与抽屉同用 var(--acsv-dw-t)（:root 单源）：线性插值下正文右缘恒等于抽屉左缘
  // （逐帧贴合，无先跳后盖）。
  // 中窄视口由 avoidW 护栏退化纯覆盖（视图不能像视频那样缩放，阈值只能比 avoidMin 更严）
  + '@media (min-width:' + CFG.view.avoidW + 'px){#acsv-root.acsv-with-comments .acsv-view-body{right:var(--acsv-dw,380px)}}'
  // 画幅满高可容（竖屏/方屏/4:3，判据见 player.js panFitOf）：只平移不缩放——
  // 宽度驱动的缩放对高度受限的画面是纯浪费，平移后画面保持原始大小、居中于剩余区域
  + '#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-video,'
  + '#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-playicon,'
  + '#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-errbox{transform:translateX(calc(var(--acsv-dw,380px) / -2))}'
  // spinner 不进上面的 transform 避让名单：它的旋转动画 acsv-spin 独占 transform
  // （CSS 动画优先级高于普通规则，translateX 会被覆盖而永不生效），改用 left 平移避让
  // （不随 cscale 缩放）；slide 级与首屏 scroller 级（包含块=root）都处理，随抽屉同步过渡
  + '.acsv-slide>.acsv-spinner,.acsv-scroller>.acsv-spinner{transition:left var(--acsv-dw-t) ease}'
  + '#acsv-root.acsv-with-comments .acsv-slide>.acsv-spinner,#acsv-root.acsv-with-comments .acsv-scroller>.acsv-spinner{left:calc(50% - var(--acsv-dw,380px)/2)}'
  // 评论内 UBB 渲染（表情/图片/@提及/作品引用）。带 .acsv-cbody 作用域：
  // 这是注入宿主页的全局样式表，不能留无前缀选择器（防与站点样式互染）
  + '.acsv-cbody .ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}'
  + '.acsv-cbody .ubb-imgc{display:block;max-width:min(240px,100%);max-height:220px;border-radius:8px;margin-top:6px;cursor:zoom-in}'
  + '.acsv-cbody .ubb-at,.acsv-cbody .ubb-res{color:#9fd0ff;text-decoration:none}'
  + '.acsv-cbody .ubb-at:hover,.acsv-cbody .ubb-res:hover{text-decoration:underline}'
  // 评论配图大图查看器：root 内全屏浮层，局部 z-index 盖过两抽屉(58，评论/私信共用同款规则)
  + IMGVIEW_CSS
  // 空间页小视频：工具栏（进度 + 排序）与分页条
  + '.acsv-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:0 0 10px;position:relative}'
  + '.acsv-progress-txt{font-size:12px;color:#999;margin-right:auto}'
  + '.acsv-sort{position:relative;cursor:pointer;font-size:13px;color:#666;user-select:none;'
  + 'padding:4px 10px;border:1px solid #e5e5e5;border-radius:4px;background:#fff}'
  + '.acsv-sort:hover{border-color:#fd4c5d;color:#fd4c5d}'
  + '.acsv-sort .arrow{font-size:10px;margin-left:4px}'
  + '.acsv-sort-menu{display:none;position:absolute;right:0;top:110%;z-index:30;min-width:100%;'
  + 'background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.12);overflow:hidden}'
  + '.acsv-sort.open .acsv-sort-menu{display:block}'
  + '.acsv-sort-menu li{list-style:none;padding:8px 18px;white-space:nowrap}'
  + '.acsv-sort-menu li:hover{background:#fdf0f1;color:#fd4c5d}'
  + '.acsv-sort-menu li.on{color:#fd4c5d;font-weight:700}'
  + '.acsv-pagebar{display:flex;justify-content:center;align-items:center;gap:6px;margin:18px 0 6px;flex-wrap:wrap}'
  + '.acsv-pagebtn{min-width:32px;height:32px;padding:0 8px;border:1px solid #e0e0e0;background:#fff;'
  + 'color:#555;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s}'
  + '.acsv-pagebtn:hover:not(:disabled):not(.cur){border-color:#fd4c5d;color:#fd4c5d}'
  + '.acsv-pagebtn.cur{background:#fd4c5d;border-color:#fd4c5d;color:#fff;cursor:default}'
  + '.acsv-pagebtn:disabled{color:#ccc;cursor:default;background:#f7f7f7}'
  + '.acsv-pagebtn.dots{border:none;background:none;cursor:default}'
  // ---- 推荐模式：内容源切换 / 弹幕画布 / 弹幕输入条 / 清晰度菜单 ----
  + '.acsv-dmcanvas{position:absolute;z-index:8;pointer-events:none}'
  + '.acsv-seg{display:flex;align-items:center;background:rgba(255,255,255,.14);border-radius:999px;padding:3px;gap:2px}'
  + '.acsv-seg-btn{border:none;background:none;color:#fff;opacity:.7;font-size:13px;font-family:inherit;'
  + 'padding:6px 16px;border-radius:999px;cursor:pointer;transition:background .15s,opacity .15s;white-space:nowrap}'
  + '.acsv-seg-btn:hover{opacity:.9}'
  + '.acsv-seg-btn.on{background:rgba(255,255,255,.24);opacity:1;font-weight:600}'
  + '.acsv-cbtxt{font-size:12px;color:#ddd;margin-left:2px}'
  + '.acsv-qwrap{position:relative;display:flex}'
  + '.acsv-qmenu{position:absolute;right:0;bottom:calc(100% + 12px);z-index:35;min-width:88px;'
  + 'background:rgba(18,18,22,.92);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);'
  + 'border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:2px;'
  + 'box-shadow:0 8px 28px rgba(0,0,0,.45)}'
  + '.acsv-qitem{border:none;background:none;color:#ccc;font-size:13px;font-family:inherit;'
  + 'padding:7px 16px;border-radius:8px;cursor:pointer;text-align:center;white-space:nowrap}'
  + '.acsv-qitem:hover{background:rgba(255,255,255,.12);color:#fff}'
  + '.acsv-qitem.on{color:#fd4c5d;font-weight:700}'
  + '.acsv-dmbox{display:flex;align-items:center;flex:1 1 auto;min-width:0;max-width:min(340px,38vw);'
  + 'height:32px;padding:0 4px 0 14px;overflow:hidden;background:rgba(255,255,255,.14);'
  + 'border-radius:999px;transition:background .15s}'
  + '.acsv-dmbox:focus-within{background:rgba(255,255,255,.2)}'
  + '.acsv-dm-input{flex:1;min-width:0;border:none;background:none;outline:none;color:#fff;'
  + 'font-size:13px;font-family:inherit}'
  + '.acsv-dm-input::placeholder{color:rgba(255,255,255,.4)}'
  + '.acsv-dm-send{flex:none;border:none;background:rgba(255,255,255,.22);color:#fff;font-size:12px;'
  + 'padding:5px 14px;border-radius:999px;cursor:pointer;font-family:inherit}'
  + '.acsv-dm-send:hover{background:#fd4c5d}'
  + '.acsv-clike{cursor:pointer}'
  + '.acsv-clike:hover{color:#b9bec7}'
  + '.acsv-clike.on{color:#fd4c5d}'
  + '.acsv-cdm:not(.on){opacity:.55}'
  // 投蕉数量选择弹层（对齐视频页"点第 N 根投 N"交互）
  + '.acsv-banpop{position:absolute;right:62px;top:-4px;z-index:30;display:flex;align-items:center;gap:2px;'
  + 'padding:7px 10px;background:rgba(22,22,27,.96);border:1px solid rgba(255,255,255,.12);border-radius:999px;}'
  + '.acsv-banpop button{border:none;background:none;padding:2px;cursor:pointer;line-height:0;opacity:.9;transition:transform .12s}'
  + '.acsv-banpop button:hover{opacity:1;transform:scale(1.18)}'
  + '.acsv-banpop button img{width:26px;height:26px;display:block}'
  // 私信分享面板（锚定分享按钮左侧的浮层，banpop 同款随 slide 销毁回收）
  + '.acsv-sharepop{position:absolute;right:66px;bottom:-6px;z-index:32;width:300px;'
  + 'max-height:min(430px,62vh);display:flex;flex-direction:column;'
  + 'background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);'
  + 'border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);animation:acsv-fadein .18s ease}'
  // 评论转发私信变体（0.9.50）：挂在抽屉根（滚动列表内挂载会被水平裁剪），锚输入条上方
  + '.acsv-sharepop-drawer{right:12px;bottom:57px}'
  + '.acsv-share-head{flex:none;display:flex;align-items:center;padding:12px 14px 8px;'
  + 'font-size:14px;font-weight:600;color:#fff}'
  + '.acsv-share-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;'
  + 'width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}'
  + '.acsv-share-close:hover{background:rgba(255,255,255,.22)}'
  + '.acsv-share-searchwrap{flex:none;padding:0 12px 8px}'
  + '.acsv-share-search{width:100%;height:32px;border:none;outline:none;'
  + 'background:rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:12px;'
  + 'padding:0 12px;font-family:inherit}'
  + '.acsv-share-search::placeholder{color:rgba(255,255,255,.4)}'
  + '.acsv-share-search:focus{background:rgba(255,255,255,.16)}'
  + '.acsv-share-list{flex:1 1 auto;min-height:120px;overflow-y:auto;padding:2px 6px 6px;'
  + 'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}'
  + '.acsv-share-list::-webkit-scrollbar{width:5px}'
  + '.acsv-share-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}'
  + '.acsv-share-row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px}'
  + '.acsv-share-row:hover{background:rgba(255,255,255,.05)}'
  + '.acsv-share-av{flex:none;width:38px;height:38px;border-radius:50%;object-fit:cover;display:block}'
  + '.acsv-share-name{flex:1;min-width:0;font-size:13px;color:#f0f1f3;'
  + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}'
  + '.acsv-share-unread{flex:none;min-width:16px;height:16px;padding:0 4px;border-radius:999px;'
  + 'background:var(--acsv-accent);color:#fff;font-size:10px;line-height:16px;text-align:center;font-weight:600}'
  + '.acsv-share-send{flex:none;border:none;background:var(--acsv-accent);color:#fff;font-size:12px;'
  + 'font-family:inherit;padding:5px 14px;border-radius:999px;cursor:pointer;transition:opacity .15s}'
  + '.acsv-share-send:hover{opacity:.88}'
  + '.acsv-share-send:disabled{opacity:.6;cursor:default}'
  + '.acsv-share-send.done{background:rgba(255,255,255,.16);color:#9fe3a1;cursor:default}'
  + '.acsv-share-send.chat{background:rgba(255,255,255,.14);color:#9fe3a1}' // 捎句话：已分享过，点击进聊天
  + '.acsv-share-send.chat:hover{background:rgba(255,255,255,.2)}'
  + '.acsv-share-tip{padding:30px 18px;text-align:center;color:#8b909a;font-size:12px;'
  + 'line-height:1.8;white-space:pre-line;display:flex;flex-direction:column;align-items:center;gap:8px}'
  + '.acsv-share-spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.25);'
  + 'border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite}'
  + '.acsv-share-foot{flex:none;display:flex;gap:8px;padding:8px 12px 12px}'
  + '.acsv-share-copy{flex:1;height:34px;border:none;border-radius:8px;cursor:pointer;'
  + 'background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-family:inherit}'
  + '.acsv-share-copy:hover{background:rgba(255,255,255,.2)}'
  + '.acsv-share-center{flex:none;display:grid;place-items:center;height:34px;padding:0 14px;'
  + 'border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:12px;text-decoration:none}'
  + '.acsv-share-center:hover{background:rgba(255,255,255,.2)}'
  // ---- 私信抽屉（列表 + 聊天两视图；滑入骨架见上共享规则，这里只写差异） ----
  + '.acsv-msgdrawer{width:var(--acsv-dw,min(380px,88vw));background:rgba(22,22,27,.97)}'
  + '.acsv-im-head{flex:none;display:flex;align-items:center;gap:8px;padding:14px 16px;font-size:15px;'
  + 'font-weight:600;color:#fff;border-bottom:1px solid rgba(255,255,255,.09)}'
  + '.acsv-im-back{border:none;background:rgba(255,255,255,.1);color:#fff;width:28px;height:28px;'
  + 'border-radius:50%;cursor:pointer;font-size:16px;line-height:1;display:none}'
  + '.acsv-msgdrawer.chat-on .acsv-im-back{display:block}' // 返回键只属会话页（0.9.75 收进 CSS）
  + '.acsv-im-back:hover{background:rgba(255,255,255,.22)}'
  + '.acsv-im-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;'
  + 'width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}'
  + '.acsv-im-close:hover{background:rgba(255,255,255,.22)}'
  // 列表↔会话「双向平移」（0.9.75，iOS/微信式下钻）：舞台负责裁剪——两面板要 translateX(±100%)，
  // 而 .acsv-msgdrawer / #acsv-root 都没有 overflow，不裁就会滑出视口/出横向滚动条；
  // 两面板绝对定位叠加，状态类挂在抽屉根（.chat-on）：列表左移退场、会话从右滑入，返回反向
  + '.acsv-im-stage{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}'
  + '.acsv-im-pane{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0;'
  + 'transition:transform var(--acsv-dw-t) ease}'
  + '.acsv-im-chatview{transform:translateX(100%)}'
  + '.acsv-msgdrawer.chat-on .acsv-im-listview{transform:translateX(-100%)}'
  + '.acsv-msgdrawer.chat-on .acsv-im-chatview{transform:translateX(0)}'
  + '.acsv-im-searchwrap{flex:none;padding:0 14px 10px}'
  + '.acsv-im-search{width:100%;height:34px;border:none;outline:none;background:rgba(255,255,255,.1);'
  + 'border-radius:8px;color:#fff;font-size:13px;padding:0 12px;font-family:inherit}'
  + '.acsv-im-search::placeholder{color:rgba(255,255,255,.4)}'
  + '.acsv-im-search:focus{background:rgba(255,255,255,.16)}'
  + '.acsv-im-list,.acsv-im-bubbles{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 8px 10px;'
  + 'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}'
  + '.acsv-im-bubbles{display:flex;flex-direction:column}' // 气泡容器必须是 flex 列：align-self 左右分侧才生效
  + '.acsv-im-list::-webkit-scrollbar,.acsv-im-bubbles::-webkit-scrollbar{width:5px}'
  + '.acsv-im-list::-webkit-scrollbar-thumb,.acsv-im-bubbles::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}'
  + '.acsv-im-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;cursor:pointer}'
  + '.acsv-im-row:hover{background:rgba(255,255,255,.05)}'
  + '.acsv-im-av{flex:none;width:42px;height:42px;border-radius:50%;object-fit:cover;display:block}'
  + '.acsv-im-mid{flex:1;min-width:0}'
  + '.acsv-im-name{font-size:13px;color:#f0f1f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
  + 'display:flex;align-items:center;gap:6px}'
  + '.acsv-im-preview{font-size:12px;color:#8b909a;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.acsv-im-time{flex:none;font-size:11px;color:#7a7f8a;align-self:flex-start;margin-top:4px}'
  + '.acsv-im-bubble{max-width:78%;margin:4px 10px;padding:8px 12px;border-radius:14px;'
  + 'font-size:13px;line-height:1.6;word-break:break-word;color:#f0f1f3;background:rgba(255,255,255,.1);align-self:flex-start;'
  + 'user-select:text;-webkit-user-select:text;cursor:text}' // 气泡开文字选择（root 全局 user-select:none 之上的例外，同评论正文）：划选后原生右键即可复制
  + '.acsv-im-bubble a{color:#9fd0ff}'
  + '.acsv-im-bubble.mine{align-self:flex-end;background:#3e4a5a;color:#fff}' // 自己气泡深蓝灰：主题红是动作/强调色，不铺大面积
  + '.acsv-im-bubble.mine a{color:#9fd0ff}'
  + '.acsv-im-bubble.pending{opacity:.55}'
  + '.acsv-im-bubble.failed{background:rgba(255,255,255,.08);color:#ff8a93;cursor:pointer}'
  // 消息引用：行包裹器（气泡+引用按钮同行；mine 行反序让按钮贴右缘）。气泡 margin 移交
  // 包裹器，卡片/附言等未包裹节点不受影响；气泡 max-width 以包裹器为基准轻微收窄
  + '.acsv-im-rowwrap{display:flex;align-items:center;gap:6px;align-self:flex-start;margin:4px 10px;max-width:96%}'
  + '.acsv-im-rowwrap.mine{flex-direction:row-reverse;align-self:flex-end}'
  + '.acsv-im-rowwrap .acsv-im-bubble{margin:0}'
  // 卡片行：宽度上收到包裹器定值（卡 264px+按钮 24px+gap），卡片满占剩余空间——
  // 卡片自身的 % 宽在内容尺寸包裹器里会循环解析，必须覆盖掉
  + '.acsv-im-rowwrap.cardrow{width:min(294px,96%)}'
  + '.acsv-im-rowwrap.cardrow .acsv-im-vcard{margin:0;align-self:auto;width:auto;flex:1 1 auto;min-width:0}'
  + '.acsv-im-quotebtn{flex:none;width:24px;height:24px;border:none;border-radius:50%;'
  + 'background:rgba(255,255,255,.08);color:#8b909a;font-size:13px;line-height:1;padding:0;'
  + 'cursor:pointer;opacity:0;transition:opacity .12s}' // 默认隐身：气泡正文开文字选择，hover 才现身的按钮不抢划选
  + '.acsv-im-rowwrap:hover .acsv-im-quotebtn,.acsv-im-quotebtn:focus{opacity:1}'
  + '.acsv-im-quotebtn:hover{background:rgba(255,255,255,.18);color:#fff}'
  // 气泡内引用摘要条：黑系内嵌+2px 主题红左边线——在对方浅灰气泡与自己的深蓝气泡上
  // 都呈「凹进」观感（白系浮块会发糊）；单行省略，有点击锚点才显手型
  + '.acsv-im-quote{margin:0 0 5px;padding:4px 8px;border-left:2px solid var(--acsv-accent);'
  + 'background:rgba(0,0,0,.16);border-radius:3px;font-size:12px;line-height:1.5;min-width:0}'
  + '.acsv-im-quote.link{cursor:pointer}'
  + '.acsv-im-quote.link:hover{background:rgba(0,0,0,.28)}'
  + '.acsv-im-quote-preview{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.72)}'
  // 输入条上方引用/回复 chip（0.9.47 起评论/私信共用，DOM 由 inputbar.buildQuoteChip 产出；
  // 命名沿 .acsv-cinput* 先例——共用侧保留一侧前缀，此处为 im 来源）
  + '.acsv-quotechip{flex:none;display:flex;align-items:center;gap:8px;margin:8px 12px 0;'
  + 'padding:5px 8px 5px 12px;background:rgba(255,255,255,.08);border-radius:8px;font-size:12px;color:#b8bdc7}'
  + '.acsv-quotechip-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.acsv-quotechip-x{flex:none;border:none;background:transparent;color:#8b909a;cursor:pointer;'
  + 'font-size:12px;padding:2px 4px;font-family:inherit}'
  + '.acsv-quotechip-x:hover{color:#fff}'
  // 引用定位高亮：主题红描边渐隐（加在被定位的消息主元素上，动画完移除类）
  + '@keyframes acsv-im-flash{0%{box-shadow:0 0 0 2px var(--acsv-accent)}100%{box-shadow:0 0 0 2px transparent}}'
  + '.acsv-im-flash{animation:acsv-im-flash 1.2s ease}'
  // 输入栏 DOM/样式收敛在 inputbar.buildInputBar（.acsv-cinput*，评论/私信共用），
  // IM 侧旧 .acsv-im-inputbar/-input/-send/-emot/-imgbtn 已退役（0.9.41）
  // 图片气泡：去文本气泡底色，窄边框衬暗底图片；行包裹器内 margin 归零（同文本气泡约定）。
  // position:relative 供加载中微光 ::after 定位（收图懒加载与发送侧乐观气泡共用 pending）
  + '.acsv-im-imgbubble{max-width:78%;margin:4px 10px;padding:4px;border-radius:14px;'
  + 'background:rgba(255,255,255,.06);align-self:flex-start;position:relative}'
  + '.acsv-im-imgbubble.mine{align-self:flex-end}'
  + '.acsv-im-rowwrap .acsv-im-imgbubble{margin:0}'
  + '.acsv-im-imgbubble .acsv-im-imgimg{display:block;max-width:180px;border-radius:10px;cursor:zoom-in}'
  + '.acsv-im-imgbubble.pending{opacity:.55}'
  + '.acsv-im-imgbubble.pending::after{content:"";position:absolute;inset:0;border-radius:14px;'
  + 'background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.08) 50%,transparent 65%);'
  + 'background-size:200% 100%;animation:acsv-im-shimmer 1.4s linear infinite;pointer-events:none}'
  + '@keyframes acsv-im-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}'
  + '.acsv-im-imgbubble.failed{background:rgba(255,255,255,.08);cursor:pointer}'
  // 气泡内表情图（正文/引用正文同款）：尺寸对齐评论正文 .ubb-emotion 的 34px 档
  + '.acsv-emotimg{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}'
  // 顶栏私信按钮（A 站原生 iconfont 字形 + 未读徽标）
  + '.acsv-im-btn{position:relative;font-style:normal}'
  + '.acsv-im-btn svg{width:20px;height:20px;fill:#fff;display:block}'
  + '.acsv-im-badge{position:absolute;top:-4px;right:-6px;min-width:16px;height:16px;padding:0 4px;'
  + 'border-radius:999px;background:var(--acsv-accent);color:#fff;font-size:10px;line-height:16px;'
  + 'text-align:center;font-weight:600}'
  // 聊天时间分割线（间隔超过 CFG.im.dayDivGap 的消息组之间）
  + '.acsv-im-daydiv{margin:10px 0 4px;text-align:center;font-size:11px;color:#7a7f8a}'
  // 作品分享卡（contentType 10001，对齐手机端：封面 + 计数条 + 时长 + 两行标题）
  + 'a.acsv-im-vcard,div.acsv-im-vcard{flex:none;display:block;width:min(260px,78%);margin:4px 10px;'
  + 'border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06);'
  + 'border:1px solid rgba(255,255,255,.08);cursor:pointer;text-decoration:none;transition:border-color .15s}'
  + '.acsv-im-vcard:hover{border-color:rgba(255,255,255,.22)}'
  + '.acsv-im-vcard.mine{align-self:flex-end}'
  // 评论转发卡（0.9.51，评论转发私信专属；容器语言与 vcard 一致，内容两段式）
  + 'a.acsv-im-cshare,div.acsv-im-cshare{flex:none;display:block;width:min(260px,78%);margin:4px 10px;'
  + 'border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);'
  + 'cursor:pointer;text-decoration:none;transition:border-color .15s}'
  + '.acsv-im-cshare:hover{border-color:rgba(255,255,255,.22)}'
  + '.acsv-im-cshare.mine{align-self:flex-end}'
  // 评论原文主视觉：accent 左条引用式；pre-wrap 保换行，超长钳 6 行截断（气泡内不滚动）
  + '.acsv-im-cshare-quote{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;'
  + 'padding:10px 12px 9px;border-left:3px solid var(--acsv-accent);margin:8px 0 2px 8px;'
  + 'font-size:13px;line-height:1.55;color:#f0f1f3;white-space:pre-wrap;word-break:break-word}'
  + '.acsv-im-cshare-src{display:flex;align-items:center;gap:8px;padding:8px 10px;'
  + 'border-top:1px solid rgba(255,255,255,.09);margin-top:6px}'
  + '.acsv-im-cshare-cover{flex:none;width:64px;height:40px;object-fit:cover;border-radius:4px;'
  + 'background:rgba(255,255,255,.05)}'
  + '.acsv-im-cshare-srctitle{flex:1;min-width:0;font-size:12px;color:#b8bdc7;'
  + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  // quote 富渲染（extra 载荷命中，renderCommentHtml 产出）的 UBB 元素：作用域收在
  // 评论卡内，样式对齐评论正文（.acsv-cbody 同款数值）
  + '.acsv-im-cshare-quote .ubb-emotion{display:inline-block;max-height:34px;max-width:68px;'
  + 'vertical-align:middle;margin:1px 2px}'
  + '.acsv-im-cshare-quote .ubb-imgc{display:block;max-width:min(200px,100%);max-height:150px;'
  + 'border-radius:8px;margin-top:6px;cursor:zoom-in}'
  + '.acsv-im-vcard-coverbox{position:relative}'
  // 原始比例展示；仅对超高封面（竖屏小视频 9:16）钳高居中裁剪，否则 300px 气泡宽下
  // 9:16 封面有 500px+ 高，整屏只剩一张卡（0.9.51）。object-fit 保比例不变形，
  // 横版 16:9 封面（≈169px）在钳制值以下不受任何影响
  + '.acsv-im-vcard-cover{display:block;width:100%;height:auto;max-height:190px;'
  + 'object-fit:cover;object-position:center;background:rgba(255,255,255,.05)}'
  + '.acsv-im-vcard-bar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:5px;'
  + 'padding:16px 8px 5px;font-size:11px;color:#fff;'
  + 'background:linear-gradient(transparent,rgba(0,0,0,.68));text-shadow:0 1px 2px rgba(0,0,0,.6)}'
  + '.acsvg-cicon{display:inline-block;width:13px;height:13px;flex:none;background:currentColor;'
  + '-webkit-mask:var(--acsvg-cicon) center/contain no-repeat;mask:var(--acsvg-cicon) center/contain no-repeat}'
  + '.acsv-im-vcard-dur{margin-left:auto;font-variant-numeric:tabular-nums}'
  + '.acsv-im-vcard-title{padding:7px 10px 9px;font-size:12px;line-height:1.5;color:#f0f1f3;'
  + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  // ---- 更新说明弹窗（0.9.60）：imgview 之上的最高模态。GitHub 渲染 HTML 的元素样式
  // 全部作用域收在 .acsv-upd-body 下（无前缀选择器红线，防与站点样式互染）
  + '.acsv-upd{position:absolute;inset:0;z-index:65;background:rgba(0,0,0,.62);'
  + 'display:flex;align-items:center;justify-content:center;animation:acsv-upd-in .18s ease}'
  // 自带 keyframes：acsv-fadein 只随 IMGVIEW_CSS 段提供（0.9.57 拆分），不跨段依赖
  + '@keyframes acsv-upd-in{from{opacity:0}to{opacity:1}}'
  + '.acsv-upd-panel{width:min(560px,92vw);max-height:min(76vh,640px);display:flex;flex-direction:column;'
  + 'background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);'
  + 'border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden}'
  + '.acsv-upd-head{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;'
  + 'border-bottom:1px solid rgba(255,255,255,.09)}'
  + '.acsv-upd-title{min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;'
  + 'font-size:15px;font-weight:600;color:#fff}'
  + '.acsv-upd-sub{font-size:12px;font-weight:400;color:#8b909a}'
  + '.acsv-upd-x{margin-left:auto;flex:none;border:none;background:rgba(255,255,255,.1);color:#fff;'
  + 'width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}'
  + '.acsv-upd-x:hover{background:rgba(255,255,255,.22)}'
  + '.acsv-upd-body{flex:1 1 auto;min-height:64px;overflow-y:auto;padding:12px 18px 16px;'
  // 正文可划选复制（评论正文先例：root 全局 user-select:none 之上的例外区，只开正文）
  + 'user-select:text;-webkit-user-select:text;'
  + 'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;'
  + 'font-size:13px;line-height:1.7;color:#d6d9de}'
  + '.acsv-upd-note{padding:28px 0;text-align:center;color:#8b909a;font-size:13px}'
  + '.acsv-upd-body h1,.acsv-upd-body h2,.acsv-upd-body h3,.acsv-upd-body h4{color:#fff;'
  + 'font-size:15px;line-height:1.45;margin:14px 0 6px}'
  + '.acsv-upd-body h1:first-child,.acsv-upd-body h2:first-child,.acsv-upd-body h3:first-child{margin-top:0}'
  + '.acsv-upd-body p{margin:6px 0}'
  + '.acsv-upd-body ul,.acsv-upd-body ol{margin:6px 0;padding-left:22px}'
  + '.acsv-upd-body li{margin:3px 0}'
  // 链接色对齐私信气泡（release.js 已统一加 target=_blank/rel/相对补全，点击不丢 #svfeed 路由）
  + '.acsv-upd-body a{color:#9fd0ff;text-decoration:none}'
  + '.acsv-upd-body a:hover{text-decoration:underline}'
  + '.acsv-upd-body code{background:rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;'
  + 'font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}'
  + '.acsv-upd-body pre{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);'
  + 'border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0}'
  + '.acsv-upd-body pre code{background:none;padding:0}'
  + '.acsv-upd-body hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin:12px 0}'
  + '.acsv-upd-body blockquote{margin:8px 0;padding:2px 10px;border-left:3px solid var(--acsv-accent);color:#b8bdc7}'
  + '.acsv-upd-body img{max-width:100%;border-radius:6px}'
  + '.acsv-upd-body table{border-collapse:collapse;margin:8px 0}'
  + '.acsv-upd-body th,.acsv-upd-body td{border:1px solid rgba(255,255,255,.14);padding:4px 8px;font-size:12px}'
  + '.acsv-upd-foot{flex:none;display:flex;gap:8px;justify-content:flex-end;padding:10px 16px 14px;'
  + 'border-top:1px solid rgba(255,255,255,.09)}'
  + '.acsv-upd-foot:empty{display:none}'
  + '.acsv-upd-act{border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-family:inherit;'
  + 'cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:background .15s,opacity .15s}'
  + '.acsv-upd-act:hover{background:rgba(255,255,255,.2)}'
  + '.acsv-upd-act.primary{background:var(--acsv-accent)}'
  + '.acsv-upd-act.primary:hover{background:var(--acsv-accent);opacity:.88}'
  // 顶栏「更新」按钮（imBtn 同款骨架）：内联 SVG + 新版本红点
  + '.acsv-upd-btn{position:relative}'
  + '.acsv-upd-btn svg{width:20px;height:20px;fill:#fff;display:block}'
  + '.acsv-upd-dot{position:absolute;top:-2px;right:-3px;width:9px;height:9px;border-radius:50%;'
  + 'background:var(--acsv-accent);box-shadow:0 0 0 2px rgba(22,22,27,.9)}'
  // ---- 左栏导航（0.9.63 抖音式）：全高贴左、图标+文字横排、当前项灰 pill ----
  // z56：盖视图容器(55)；低于视图态顶栏(57)/抽屉(58)/大图(60)/更新弹窗(65)——抽屉与 dock
  // 几何不重叠（dock 贴左/抽屉贴右），该次序只保证「后开的浮层在上」与 overlay 栈序一致。
  // 主区让位：scroller/视图内容 margin/padding-left=CFG.view.dockW（抖音同款，视频居中于剩余空间）；
  // 已知取舍：评论抽屉避让中心仍按全视口算（不随 dock 右移），视觉可接受不展开
  + '.acsv-dock{position:absolute;left:0;top:0;bottom:0;width:' + CFG.view.dockW + 'px;'
  + 'padding:10px 10px 20px;display:flex;flex-direction:column;gap:4px;z-index:56}'
  + '.acsv-dock-logo{padding:2px 8px 10px}'
  + '.acsv-dock-logo img{height:20px;display:block}'
  + '.acsv-dock-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border:none;'
  + 'background:transparent;border-radius:10px;color:#d5d8df;font-size:15px;font-family:inherit;'
  + 'cursor:pointer;text-align:left;transition:background .15s,color .15s}'
  + '.acsv-dock-item svg{width:20px;height:20px;fill:currentColor;display:block;flex:none}'
  + '.acsv-dock-item:hover{background:rgba(255,255,255,.08);color:#fff}'
  + '.acsv-dock-item.on{background:rgba(255,255,255,.14);color:#fff;font-weight:600}'
  + '.acsv-dock-sep{height:1px;background:rgba(255,255,255,.09);margin:8px 6px}'
  // 设置齿轮（0.9.89）：钉 dock 底部；条目样式复用 .acsv-dock-item，只补钉底与顶部留白
  + '.acsv-dock-gear{margin-top:auto}'
  // 设置面板 host（0.9.89）：光 DOM 侧只负责定位与层级，内里视觉全在影子根（settingspanel.js）。
  // z 62：压过 imgview(60)，低于更新弹窗(65)——系统级模态仍最高（z 档位表见 overlay.js 头注释）
  + '.acsv-set-host{position:absolute;inset:0;z-index:62}'
  // 主区让位：竖刷视频区居中于剩余空间；全屏沉浸还原满幅
  + '.acsv-scroller{margin-left:' + CFG.view.dockW + 'px}'
  + '#acsv-root:fullscreen .acsv-dock{display:none}'
  + '#acsv-root:fullscreen .acsv-scroller{margin-left:0}'
  + '.acsv-view{position:absolute;inset:0;z-index:55;display:none;background:#16161b;overflow:hidden}'
  // 来源视图保活（0.9.74）：被深界面盖住期间挂起。类名整只换掉——.acsv-view 是全项目与
  // harness 的「当前视图」定位锚，留两个同构节点会污染既有断言；用 visibility 不用
  // display:none——后者拆盒，.acsv-view-body 的滚动位会丢
  + '.acsv-view-held{position:absolute;inset:0;z-index:55;visibility:hidden;pointer-events:none;background:#16161b;overflow:hidden}'
  // 视图正文顶=顶栏高（0.9.73 视图头删除：共享顶栏接管视图头部；不再写死 52px）。
  // right 过渡供抽屉避让（收窄/还原与抽屉滑入滑出同曲线同时序）
  + '.acsv-view-body{position:absolute;top:var(--acsv-top-h);bottom:0;left:0;right:0;overflow-y:auto;'
  + 'padding:6px 24px 30px ' + (CFG.view.dockW + 14) + 'px;transition:right var(--acsv-dw-t) ease}'
  // 播放层正文（0.9.74）：满幅承载一条 slide——不滚动、无内边距、左缘让开 dock（与竖刷
  // scroller 同款）；抽屉避让交给 slide 自带规则（styles.js 上方 root 级那组），正文不能再
  // 收窄一次——双份收窄会把画面推两次
  + '.acsv-vbody-play{overflow:hidden;padding:0;left:' + CFG.view.dockW + 'px}'
  + '#acsv-root.acsv-with-comments .acsv-view-body.acsv-vbody-play{right:0}'
  + '#acsv-root:fullscreen .acsv-vbody-play{left:0}'
  + '.acsv-vsec{margin-bottom:26px}'
  + '.acsv-vsec-title{font-size:16px;font-weight:600;color:#fff;margin:18px 0 10px}'
  + '.acsv-vchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}'
  + '.acsv-vchip{border:none;border-radius:16px;padding:5px 14px;font-size:13px;font-family:inherit;'
  + 'cursor:pointer;background:rgba(255,255,255,.1);color:#cfd3da;transition:background .15s,color .15s}'
  + '.acsv-vchip.on{background:var(--acsv-accent);color:#fff}'
  + '.acsv-vchip.sm{padding:4px 10px;font-size:12px}'
  + '.acsv-vlist{min-height:60px}'
  + '.acsv-vrow{display:flex;gap:12px;align-items:center;padding:8px;border-radius:10px;cursor:pointer;'
  + 'transition:background .15s}'
  + '.acsv-vrow:hover{background:rgba(255,255,255,.07)}'
  + '.acsv-vrow-rank{width:24px;text-align:center;font-size:15px;font-weight:700;color:#8a90a0;flex:none}'
  + '.acsv-vrow-rank.top{color:var(--acsv-accent)}'
  + '.acsv-vrow-thumb{width:110px;height:66px;border-radius:8px;background:rgba(255,255,255,.06);'
  + 'flex:none;overflow:hidden;display:grid;place-items:center}'
  + '.acsv-vrow-thumb img{width:100%;height:100%;object-fit:cover;display:block}'
  + '.acsv-vrow-main{min-width:0;flex:1}'
  + '.acsv-vrow-title{font-size:14px;color:#fff;line-height:20px;max-height:40px;overflow:hidden}'
  + '.acsv-vrow-desc{font-size:12px;color:#aab0bc;line-height:17px;max-height:34px;overflow:hidden;margin-top:2px}'
  + '.acsv-vrow-meta{font-size:12px;color:#8a90a0;margin-top:3px}'
  // 榜单卡（0.9.69 全量对齐原生 rank/list；内容宽 0.9.70 定 1600）：行高 129+分隔线、封面
  // 160×90 直角、标题单行、简介 3 行 clamp、meta 贴封面底+原生三段图标、水印 48px 旋转 10°
  // （原生视觉锚点）、UP 卡扁平+左竖线（原生 up-card 同款）；内容宽 = 原生 1200 在 1920 下
  // 两侧各留 355px 太空（用户实看），提到 1600 与我的页 .acsv-mewrap 同宽同密度——卡内指标
  // （封面/行高/文字块构成）仍按原生
  + '.acsv-zone-wrap{max-width:1600px;margin:0 auto}'
  + '.acsv-vrow.big{position:relative;align-items:stretch;gap:16px;padding:16px;overflow:hidden}'
  + '.acsv-vrow.big .acsv-vrow-thumb{width:160px;height:90px;border-radius:0}'
  + '.acsv-vrow.big .acsv-vrow-main{display:flex;flex-direction:column}'
  + '.acsv-vrow.big .acsv-vrow-title{font-size:16px;font-weight:400;line-height:18px;max-height:none;'
  + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}'
  + '.acsv-vrow.big:hover .acsv-vrow-title{color:var(--acsv-accent)}'
  + '.acsv-vrow.big .acsv-vrow-desc{font-size:12px;line-height:16px;white-space:pre-line;'
  + 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;margin-top:0}'
  // meta 贴底机制（0.9.69）：main 拉伸高=封面 90（标题 18+6 / 简介峰值 48 / meta 12，合计 84
  // 恒低于封面），meta margin-top:auto 即贴封面底；封面尺寸/卡内边距是该机制的一部分——
  // 改动须同步 harness「meta 底-封面底 ≤6」断言
  + '.acsv-vrow.big .acsv-vrow-meta{display:flex;align-items:center;margin-top:auto;font-size:12px;line-height:12px}'
  + '.acsv-vmeta-i{display:inline-flex;align-items:center;gap:6px;margin-right:6px}'
  + '.acsv-vrow-meta .acsv-vmeta-i:first-child{margin-right:24px}' // 原生首位播放数后 24px
  + '.acsv-vmeta-i .acsvg-glyph{font-size:12px}'
  + '.acsv-rlist-num{position:absolute;right:0;bottom:-8px;font-size:48px;font-weight:700;line-height:48px;'
  + 'color:rgba(255,255,255,.07);transform:rotate(10deg);font-style:normal;pointer-events:none}'
  // UP 卡（原生 up-card 扁平款）：透明底+左 1px 竖线（列分隔线），头像 90、签名固定 3 行
  // （48px 恒占位）——行高基准=UP 卡 129，任何数据长度都不撑高行（0.9.68 波动源=签名行数）
  + '.acsv-upcard{padding:16px;box-sizing:border-box;border-left:1px solid rgba(255,255,255,.1)}'
  + '.acsv-upcard-link{display:flex;gap:16px;color:inherit;text-decoration:none;height:100%}'
  + '.acsv-upcard-info{min-width:0;display:flex;flex-direction:column;flex:1}'
  + '.acsv-upcard-avatar{width:90px;height:90px;border-radius:50%;display:block;object-fit:cover;flex:none;align-self:flex-start}'
  + '.acsv-upcard-name{font-size:14px;font-weight:600;color:var(--acsv-accent);line-height:21px;min-height:21px}'
  + '.acsv-upcard-sign{font-size:12px;color:#aab0bc;line-height:16px;height:48px;overflow:hidden;margin:6px 0;word-break:break-all}'
  + '.acsv-upcard-extra{display:flex;align-items:center;height:16px;line-height:16px;font-size:12px;color:#8a90a0;margin-top:auto}'
  + '.acsv-upcard-extra .acsv-vmeta-i{margin-right:24px}'
  // 图标盒与行高显式钉死（14px 字形配 14×14 盒 + 16px 行盒）：UP 卡 16+（21+60+16）+16=129
  // 是行高基准，任何一处行盒浮动都会让行高漂移（harness zone-upcard/zone-row-height 钉）
  + '.acsv-upcard-extra .acsvg-glyph{font-size:14px;width:14px;height:14px;line-height:14px}'
  // 行/列头同轨（0.9.67 教训：head 与 row 必须同一 grid 模板）；行分隔线在行上跨两栏（原生同款）
  + '.acsv-rlist-head,.acsv-rlist-row{display:grid;grid-template-columns:minmax(0,1fr) 338px;gap:0}'
  + '.acsv-rlist-head{padding:2px 16px 8px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:6px}'
  + '.acsv-rlist-hcell{font-size:18px;font-weight:600;color:#fff;display:flex;align-items:baseline;gap:6px;'
  + 'border-left:3px solid var(--acsv-accent);padding-left:8px}'
  + '.acsv-rlist-hen{font-size:10px;color:#8a90a0;font-weight:400}'
  + '.acsv-rlist-row{padding:0;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.08)}'
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-rlist-head,.acsv-rlist-row{grid-template-columns:minmax(0,1fr)}}'
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-upcard{border-left:none;margin-top:6px}}'
  + '.acsv-vempty{color:#8a90a0;font-size:13px;padding:14px 2px}'
  + '.acsv-vtip{color:#8a90a0;font-size:12px;margin:-4px 0 10px}'
  + '.acsv-vmore{display:block;margin:12px auto 0;border:none;border-radius:16px;padding:6px 20px;'
  + 'font-size:13px;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.1);color:#cfd3da;'
  + 'transition:background .15s}'
  + '.acsv-vmore:hover{background:rgba(255,255,255,.18)}'
  + '.acsv-vmore[disabled]{opacity:.5;cursor:default}'
  // 我的页（0.9.69 抖音式个人主页）：内容容器收口 + 资料头 + Tab + 3:4 封面网格卡。
  // 容器只挂在我页（不挂共享 .acsv-view-body——避免动榜单 0.9.67/68 的原生对齐）；
  // 卡片类名独立（acsv-g*，不复用 vrow*，防同构元素污染既有行数断言）
  + '.acsv-mewrap{max-width:1600px;margin:0 auto}'
  + '.acsv-mecard{display:flex;align-items:center;gap:20px;padding:22px 2px 18px}'
  + '.acsv-mecard-av{width:96px;height:96px;border-radius:50%;flex:none;object-fit:cover;display:block;'
  + 'background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.14)}'
  + '.acsv-mecard-info{min-width:0;flex:1}'
  + '.acsv-mecard-name{font-size:20px;font-weight:600;color:#fff;line-height:28px;overflow:hidden;'
  + 'text-overflow:ellipsis;white-space:nowrap}'
  + '.acsv-mecard-stats{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:10px}'
  + '.acsv-mecard-stat{font-size:13px;color:#aab0bc}'
  + '.acsv-mecard-stat b{font-size:15px;font-weight:600;color:#fff;margin-right:5px}'
  + '.acsv-mecard-id{font-size:12px;color:#8a90a0;margin-top:9px}'
  + '.acsv-mecard-sign{font-size:12px;color:#aab0bc;margin-top:4px;overflow:hidden;text-overflow:ellipsis;'
  + 'white-space:nowrap}'
  // Tab 行：选中项 accent 下划线（抖音同款）；面板常驻 DOM 只切 display——保住翻页游标与已加载列表
  + '.acsv-metabs{display:flex;gap:26px;padding:0 2px;border-bottom:1px solid rgba(255,255,255,.08)}'
  + '.acsv-metab{border:none;background:none;padding:10px 2px;font-size:15px;font-family:inherit;cursor:pointer;'
  + 'color:#cfd3da;border-bottom:2px solid transparent;transition:color .15s,border-color .15s}'
  + '.acsv-metab:hover{color:#fff}'
  + '.acsv-metab.on{color:#fff;font-weight:600;border-bottom-color:var(--acsv-accent)}'
  + '.acsv-mepanel{padding-top:16px}'
  + '.acsv-mepanel .acsv-vchips{margin-bottom:14px}'
  // 网格：列数随容器宽自适应（minmax 自动填充，无硬断点）
  + '.acsv-megrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(' + CFG.view.me.gridMin + 'px,1fr));'
  + 'gap:18px ' + CFG.view.me.gridGap + 'px}'
  // 网格卡 flex 列 + 脚行钉底（0.9.90）：网格行内所有卡等高（grid 默认 stretch），脚行
  // margin-top:auto 钉到卡底——否则单行标题的卡脚注悬在半空，与双行标题的邻居错位
  //（真机截图实证：同一行三张卡，单行标题那张的 @作者/时间 比邻居高约 28px）。
  // 封面/标题 flex:none：防 flex 收缩覆盖封面的 aspect-ratio 与标题 max-height 的钳高
  //（行高由内容最长者定，正常不触发收缩，这里是纪律性防御）。行卡/UP 卡的同类钉底是既有实现
  + '.acsv-gcell{cursor:pointer;min-width:0;display:flex;flex-direction:column}'
  + '.acsv-gcover{position:relative;width:100%;aspect-ratio:' + CFG.view.me.coverRatio + ';border-radius:10px;overflow:hidden;'
  + 'flex:none;background:rgba(255,255,255,.06)}'
  + '.acsv-gcover img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s,opacity .2s;opacity:0}'
  + '.acsv-gcover img.ld{opacity:1}'
  // 终败图（imgload 策略 grid 的降级形态）：隐藏与占位由脚本单源做（不再写同名 CSS 兜底——
  // 重复实现会掩盖脚本分支被改坏，harness 的降级断言必须钉在脚本行为上）；.acsv-imgfail 类
  // 是断言/钩子用的标记
  + '.acsv-gph{position:absolute;inset:0;display:grid;place-items:center;color:#8a90a0;font-size:12px;pointer-events:none}'
  + '.acsv-gcell:hover .acsv-gcover img{transform:scale(1.05)}'
  + '.acsv-gtag{position:absolute;left:8px;bottom:8px;max-width:calc(100% - 16px);padding:2px 8px;'
  + 'border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:18px;'
  + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.acsv-gtitle{margin-top:8px;font-size:14px;line-height:20px;color:#fff;max-height:40px;overflow:hidden;flex:none}'
  + '.acsv-gcell:hover .acsv-gtitle{color:var(--acsv-accent)}'
  // .acsv-gmeta 于 0.9.83 删除：卡面收口后作者只走脚行（.acsv-gfoot）、进度只留封面角标，
  // 该行没有生产者了（唯一消费者 views.gridCardOf 已移除）
  // 首屏骨架（独立类名：绝不与行/卡计数选择器同构；成功/失败/空三路径都移除）
  + '.acsv-gskel{aspect-ratio:' + CFG.view.me.coverRatio + ';border-radius:10px;background-color:rgba(255,255,255,.05);'
  + 'background-image:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.07) 50%,rgba(255,255,255,0) 60%);'
  + 'background-size:200% 100%;animation:acsv-skel 1.4s linear infinite}'
  + '@keyframes acsv-skel{0%{background-position:120% 0}100%{background-position:-20% 0}}'
  // 搜索视图（0.9.72 抖音式）：结果网格。0.9.73 起视图内的搜索胶囊（.acsv-vsrow）删除——
  // 共享顶栏的搜索框即本视图唯一输入框（syncTopbar 按地址关键词回填）；.acsv-sbox 基础
  // 胶囊样式保留为共享件（顶栏 .acsv-top .acsv-sbox 覆盖定位/宽度）。卡片复用我页
  // .acsv-g* 体系，搜索域只加 .acsv-sgrid/.acsv-scell 与三个新件（播放数角标/时长角标/脚行）；
  // 封面 16:9 为搜索页原始比例（我页是 4:3 普通视频封面）——.acsv-sgrid 作用域内覆盖
  + '.acsv-sbox{display:flex;align-items:center;width:min(560px,100%);height:40px;padding:0 6px 0 16px;'
  + 'background:rgba(255,255,255,.1);border-radius:20px;transition:background .15s}'
  + '.acsv-sbox:focus-within{background:rgba(255,255,255,.16)}'
  + '.acsv-sbox input{flex:1;min-width:0;background:none;border:none;outline:none;color:#fff;'
  + 'font-size:14px;font-family:inherit}'
  + '.acsv-sbox input::placeholder{color:rgba(255,255,255,.45)}'
  + '.acsv-sbox input::-webkit-search-cancel-button{filter:invert(1);opacity:.5;cursor:pointer}'
  + '.acsv-sbtn{width:30px;height:30px;flex:none;border:none;border-radius:50%;background:none;color:#fff;'
  + 'cursor:pointer;display:grid;place-items:center;transition:background .15s}'
  + '.acsv-sbtn:hover{background:rgba(255,255,255,.18)}'
  + '.acsv-sbtn .acsvg-glyph{font-size:16px}'
  + '.acsv-sstate{color:#8a90a0;font-size:13px;padding:8px 2px}'
  + '.acsv-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(' + CFG.view.search.gridMin + 'px,1fr));'
  + 'gap:18px ' + CFG.view.search.gridGap + 'px}'
  + '.acsv-sgrid .acsv-gcover{aspect-ratio:16 / 9}'
  + '.acsv-gviews{display:inline-flex;align-items:center;gap:4px}'
  + '.acsv-gviews .acsvg-glyph{font-size:12px}'
  + '.acsv-gdur{position:absolute;right:8px;bottom:8px;padding:2px 8px;border-radius:999px;'
  + 'background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:18px}'
  // 脚行钉卡底（0.9.90）：auto 吸走卡内富余（单行标题卡不再把脚注吊起来），padding-top 保底
  // 4px 间距——内容顶满的卡（双行标题）观感与 0.9.89 前完全一致。
  // 防「修」哨兵在册：撤掉 auto 即 view-my.card-foot-pinned 变红（maxGap=20 逐卡 gap 打印）
  + '.acsv-gfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;'
  + 'padding-top:4px;font-size:12px;color:#8a90a0}'
  + '.acsv-gup{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.acsv-gtime{flex:none}'
  + '.acsv-smfoot{display:inline-block;margin:18px 0 4px;color:#9fd0ff;font-size:13px;text-decoration:none}'
  + '.acsv-smfoot:hover{text-decoration:underline}'
  // ---- 关注视图（0.9.91，路线图 2.2） ----
  // 量取（0.9.69 纪律）：对象 = A 站关注动态页的动态卡（www.acfun.cn/member/feeds，
  // 2026-10-03，内置浏览器登录态）。站方是**浅色宽行卡**（870 宽、头像占 60px 左栏、
  // 计数行 48px 高 / 12px 次级灰 rgb(153,153,153) / 项间距 42px / 图标 13px、正文不钳高），
  // 我们是深色窄网格卡（280px+）——故只借**计数行的字号与次级灰**，其余按本方卡族取值，
  // 差异有据不硬抄（0.9.69 同款裁决）。计数行 42px 项距是宽行卡尺度，窄卡压到 14px。
  + '.acsv-ggroup{margin:18px 2px 10px;font-size:13px;font-weight:600;color:#cfd3da}'
  + '.acsv-ggroup:first-child{margin-top:2px}'
  // 计数行（动态三计数；12px 次级灰取自站方量取值）
  + '.acsv-gstats{display:flex;align-items:center;gap:14px;margin-top:6px;font-size:12px;color:#8a90a0}'
  + '.acsv-gstat{display:inline-flex;align-items:center;gap:4px}'
  + '.acsv-gstat .acsvg-glyph{font-size:12px}'
  // 内容类型角标（0.9.93 起只剩文章用；动态/转发改由专属宽卡的结构自身区分）：**左上**——
  // 左下是播放数、右下是时长，各占其位不打架（0.9.92 修掉了文章角标与播放数同占左下的叠字）
  + '.acsv-gkind{left:8px;top:8px;bottom:auto;background:rgba(253,76,92,.78);font-weight:600}'
  // ---- 关注视图卡面 v2（0.9.93）：**模仿原生信息层级、改进横向空间利用** ----
  // 用户裁决（0.9.92 后）：原生关注流是 870px 单列宽卡，桌面宽屏浪费大——保留它的层级
  //（头像行 / 正文 / 单图 / 计数行；引用块表达转发），但把布局改成**多列 + 按内容型定宽**：
  // 媒体向（视频卡）单格、文本向（动态/转发）跨两列，dense 填洞不留空档；窄屏回落单列。
  // 原生量取值（2026-10-03，/member/feeds 实测）→ 本卡族取值：头像行 50px→24px 头像、
  // 内容缩进 60px→0（宽卡自带内边距）、单图限高 299px→240px、计数行 48px/12px 次级灰→
  // 26px/12px 次级灰（宽行卡尺度压到卡尺度，差异有据）
  // **整行通栏**（1 / -1）而非固定跨 2 列：2 跨度在 3+ 列网格里必然在右侧留空洞
  //（首版实测：repost 占 1-2 列、第三列空两行；分组标题还被当成普通格塞进列里）。
  // 「文本向整行 + 媒体向多列 + dense 回填」是卡片流不破洞的通行解（知乎/掘金同款）；
  // 分组标题同样整行，视觉上就是分节线
  + '.acsv-follow{grid-auto-flow:dense}'
  + '.acsv-follow .acsv-gcell{grid-column:span 1}'
  + '.acsv-follow .acsv-gwide{grid-column:1 / -1}'
  + '.acsv-follow .acsv-ggroup{grid-column:1 / -1}'
  // 文章卡（文本向：薄条封面 + 标题 + 摘要 + 脚行）——形态与视频的 4:3 图卡明显不同，一眼可辨
  + '.acsv-gart{display:flex;flex-direction:column;padding:10px;border-radius:10px;background:rgba(255,255,255,.05)}'
  + '.acsv-gart-cover{position:relative;flex:none;height:120px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.06)}'
  + '.acsv-gart-cover img{width:100%;height:100%;object-fit:cover;display:block}'
  + '.acsv-gart-title{margin-top:10px;font-size:14px;line-height:20px;color:#fff;max-height:40px;overflow:hidden}'
  + '.acsv-gart-desc{margin-top:6px;font-size:12px;line-height:18px;color:#8a90a0;max-height:36px;overflow:hidden}'
  // 动态宽卡（头像行 + 正文 + 单图 + 计数行；转发再多一个引用块）
  + '.acsv-gmom{display:flex;flex-direction:column;padding:12px;border-radius:10px;background:rgba(255,255,255,.05)}'
  + '.acsv-gmom-head{display:flex;align-items:center;gap:8px;font-size:12px;color:#8a90a0}'
  + '.acsv-gmom-head img{width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;background:rgba(255,255,255,.08)}'
  + '.acsv-gmom-name{font-size:13px;color:#d5d8df}'
  + '.acsv-gmom-flag{flex:none;font-size:11px;line-height:15px;padding:0 5px;border-radius:3px;'
  + 'background:rgba(253,76,92,.78);color:#fff;font-weight:600}'
  + '.acsv-gmom-text{margin-top:8px;font-size:14px;line-height:21px;color:#e8eaee;max-height:84px;overflow:hidden;word-break:break-word}'
  + '.acsv-gmom-img{margin-top:10px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.06);'
  + 'max-height:260px;max-width:460px}'
  + '.acsv-gmom-img img{width:100%;max-height:260px;object-fit:cover;display:block}'
  // 转发引用块（左竖线 + 缩略图 + 源标题 + 源类型）：转发的结构性签名
  + '.acsv-gquote{margin-top:10px;padding:8px 10px;border-left:3px solid rgba(255,255,255,.18);'
  + 'border-radius:0 8px 8px 0;background:rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}'
  + '.acsv-gquote-thumb{flex:none;width:56px;height:56px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.08)}'
  + '.acsv-gquote-thumb img{width:100%;height:100%;object-fit:cover;display:block}'
  + '.acsv-gquote-body{min-width:0;flex:1 1 auto}'
  + '.acsv-gquote-title{font-size:13px;line-height:18px;color:#d5d8df;max-height:36px;overflow:hidden}'
  + '.acsv-gquote-kind{margin-top:4px;font-size:11px;color:#8a90a0}'
  // 外链卡（文章/动态）：根元素是 <a>，浏览器默认链接样式必须清掉（标题/脚行的显式色不受影响）
  + '.acsv-gcell{color:inherit;text-decoration:none}'
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-sgrid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));'
  + 'gap:14px 10px}'
  // 窄屏：关注流全部回落单列（文本向宽卡的 span 2 在单列网格里会溢出，必须复位）
  + '.acsv-follow .acsv-gwide{grid-column:1 / -1}}'
  // 深色滚动条：视图滚动区（我的/榜单共用 .acsv-view-body，默认浅色条在深色页上是刺眼白条）
  + '.acsv-view-body{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}'
  + '.acsv-view-body::-webkit-scrollbar{width:8px;height:8px}'
  + '.acsv-view-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:4px}'
  + '.acsv-view-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.3)}'
  + '.acsv-view-body::-webkit-scrollbar-track{background:transparent}'
  // 窄屏：dock 隐藏（CFG.view.narrow），主区/信息区/视图内容还原满宽
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-dock{display:none}.acsv-scroller{margin-left:0}'
  + '.acsv-info{left:24px}.acsv-view-body{padding-left:20px}.acsv-vbody-play{padding:0;left:0}}'
  // 窄屏顶栏（0.9.72）：dock 已隐藏 → 顶栏还原满宽；居中胶囊改流内自适应（不再绝对居中，
  // 否则会压到右侧按钮组上）
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-top{left:0;padding:0 16px}'
  + '.acsv-top .acsv-sbox{position:static;transform:none;width:auto;flex:1;min-width:0;margin:0 12px}}'
  // 窄屏我的页：资料头纵向堆叠、网格列宽下限收窄（沿用同一 CFG.view.narrow 断点）
  + '@media (max-width:' + (CFG.view.narrow - 1) + 'px){.acsv-mecard{flex-direction:column;align-items:flex-start;'
  + 'gap:12px;padding:16px 2px 14px}.acsv-mecard-av{width:72px;height:72px}'
  + '.acsv-megrid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px 10px}}';

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
  volOn: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  volOff: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  chevUp: '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.4 1.4L12 10.8l4.6 4.6L18 14z"/></svg>',
  chevDn: '<svg viewBox="0 0 24 24"><path d="M12 16l-6-6 1.4-1.4L12 13.2l4.6-4.6L18 10z"/></svg>',
  chevLt: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  banana: '<svg viewBox="0 0 24 24"><path d="M21 18.2c-6.9 0-12.6-5-13.7-11.6C7.1 5.2 6 4.2 4.8 4.5 3.7 4.7 3 5.8 3.2 7 4.6 15.4 12 21.5 20.6 21c1.1-.1 1.9-1 1.9-2.1 0-.4-.6-.7-1.5-.7z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  smiley: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>',
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
