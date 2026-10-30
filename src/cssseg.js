// ---------- 影子根/文档级共用的 CSS 段 token（0.9.309 影子样式缝化） ----------
// 背景：settingspanel / imnative 的影子根吃不到文档级样式（Shadow 隔离，README 0.9.89 登记
// 两皮肤架构），面板同段样式不得不与 cssraw 全局模板逐字并存——此前是「改样式两处同碰」的
// 手工同步契约（imnative 段旁注「对齐抽屉数值」即其档案）。本件把同段沉成常量单源：
// cssraw（构建期模板，import 本件插值）与影子根（运行时 import 本件）都从这里取值，
// 改段值一处生效，漂移由 check-hygiene 网兜底。
// 纪律：本件只许存 token、禁止 import 任何模块（cssraw 的出边不入任何方向口径，干净全靠
// 本件零依赖保）；值含块尾 '}'——段以「属性串」为粒度，拼上选择器即成规则，前缀各消费点
// 自带（前缀是各自的选择器命名，不该单源）。

// 面板底（设置面板 .set-panel / 私信弹层 / 更新弹层同款面值）
export var SHEET_BG =
  'background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);';
// 全局面板基准字号（cssraw 更新弹层 / settingspanel 影子根）
export var BASE_FONT =
  'font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}';
// 分节线（弹层头/分组下缘）
export var SECT_LINE = 'border-bottom:1px solid rgba(255,255,255,.09)}';
// 圆形关闭钮（12px 版本；16px 变体不入——前缀各异非同段）
export var CLOSE_BTN =
  'width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}';
// 细滚动条尾（可独立成段，也可缀在 scrollbar-width:thin; 之后）
export var SCROLL_TAIL = 'scrollbar-color:rgba(255,255,255,.2) transparent}';
// 弹层投影（下拉菜单 / 浮卡）
export var POP_SHADOW = 'box-shadow:0 8px 28px rgba(0,0,0,.45)}';
// 弹层页脚条（上缘线 + 内边距）
export var FOOT_BAR = 'padding:10px 16px 14px;border-top:1px solid rgba(255,255,255,.09)}';
// 行内表情图尾（ubb-emotion / acsv-emotimg 同值段）
export var EMO_TAIL = 'vertical-align:middle;margin:1px 2px}';
// 评论配图看大图尾（.ubb-imgc 变体；max-width/max-height 各宿主自定不入）
export var IMG_ZOOM_TAIL = 'border-radius:8px;margin-top:6px;cursor:zoom-in}';
