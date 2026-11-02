/*
 * 方向诊断（0.9.117；0.9.187 由「永远 exit 0 的非门禁」升为**棘轮**）——看「方向卫生」有没有
 * 新增侵蚀：**未登记项 >0 即红**（在册项带理由放行）。它管的恰是 check-deps 规则⑤射程外的
 * **无环反向边**（"环"的门已由 check-deps 承担）。
 *
 * 为什么从"非门禁"改成"棘轮"：0.9.119 起在册清单已清零（KNOWN=[]）、两口径当前均 0 条——
 * 此刻开棘轮**零成本、纯防回归**：将来任何新反向边冒出来 = 需要一次裁决（修边 / 加设缝 /
 * 登记入册），不该默默放过。仍**不改判罚口径**（下面两条保守口径原样），只把"报警"升级为"红"。
 *
 * 口径（本文档最值钱的认知，原样留档）：
 *   「规则的上游是口径，口径不定，候选集就不定。」
 * —— v3（@family 声明 + check-taxonomy 方向规则）被关闭的原因不是规则难写，而是「层」没有
 * 唯一定义：同一张图按 README subgraph 分层与按「特性域」分层，候选集不同。故本诊断并列两条
 * 保守口径、人工看结果。棘轮只对**未登记**项判红，不重开"层定义"之争。
 *
 * 口径 A（正式分层）：README 基建层成员 → 基建层/接口层之外的 import 边。
 * 口径 B（特性域）：非特性模块 → 特性模块的边（特性集见下方清单，可增改；
 *                    boot/player 为组合根/编排层，对特性的装配属正常向下，不计）。
 * 口径 C（播放层，0.9.260）：播放/泵流核心 → 播放层/基建/接口/零依赖叶之外的 import 边。
 *                    存在的理由：播放层四件（session/feedstore/controls/dmcanvas）此前两个桶都
 *                    登不进去——归特性层会把「播放层→播放层」的入边误判成反向（口径 B 红），
 *                    归基建层又会被「→ 未登记件」判红（口径 A 红）；缺的其实就是一个**播放层
 *                    **桶。口径 C 让这个桶有牙：播放层只许依赖**同级 / 更下层**，不许回头依赖
 *                    特性层、组合根或未登记件（口径 B 顺带仍覆盖「→ 特性」，C 再补「→ 未登记 /
 *                    组合根」那一半）。
 * 口径 D（命名↔分类·零依赖叶纯度，2026-10-30 扩面）：README 依赖图 `class … leaf;` 行点名的
 *                    零依赖叶，必须 **0 条静态 import 边**——「零依赖」是 README 白纸黑字写的
 *                    命名承诺，命名对架构做的承诺必须兑现（依据=README 卫生审计判定口径 3
 *                    「注释即事实源者必须可核」）。清单**机器读自 README**（与 check-hygiene
 *                    pass ⑤ 同一事实源；读不到 fail loud 直接退出，不许静默跳过；--src 只换
 *                    扫描目录，事实源仍在本仓 README）。注意 LEAF_SHARED 桶不是纯度桶：
 *                    toastmsg/searchfmt 的依赖是有登记的裁决，不属本断言射程。
 * 口径 E（命名↔分类·接口族触面，2026-10-30 扩面）：文件名以 api.js 结尾的件（接口家族）
 *                    不得 import ui.js / styles.js / views.js——接口层不得有 DOM/UI 触面，
 *                    按静态 import 边判定（与既有口径同尺）。既有三口径只管 INFRA/PLAY 的
 *                    出边，API 桶的出边无主，本口径补这个缺口。
 *
 * 在册项（KNOWN，带理由）——新增项冒出来 = 需要一次裁决，别默默放过；
 * 处置记录见 docs/dependency-audit.md：
 *
 *   node test/check-direction.mjs [--src <dir>]  （--src 覆盖扫描目录，缺省 src/ 不变，供 fixture 自检）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// --src <dir>：覆盖扫描目录（缺省 src/ 不变；resolve 兼容绝对路径，供 fixture 自检）
const SRCI = process.argv.indexOf('--src');
const SRC = path.resolve(ROOT, SRCI > -1 && process.argv[SRCI + 1] ? process.argv[SRCI + 1] : 'src');

// 口径 A 用：README 基建层 + 接口层。**不再在注释里写死成员数**——0.9.297 起由运行时的
// 「分类覆盖」行输出实际计数；此前注释从 16 漂到 23 而实有 25，说明手写计数本身就是第二真源。
// 0.9.297 同时补了「每个 src 必须显式分类」的覆盖检查（未分类即红），并给 signapi/signpanel
// 落了正式桶位；cssraw（构建期输入）与 devicetab（生成物）显式豁免。
// 0.9.238：inputbar.js **移出基建层**（改入 FEATURE，见下）——富文本重载后它认识表情域
// （emotImgOf 出表情节点）与出口 UBB 方言（评论域的序列化/计数口径），不再满足"基建 = 零特性
// 知识"的口径；与 sharepanel/rail/slide（0.9.233）同款归类：地位是特性层共享 UI 件
const INFRA = new Set(['cfg.js', 'net.js', 'playitem.js', 'panelitem.js', 'state.js', 'route.js', 'imgview.js',
  'liststate.js', // 0.9.300：空态行单源（表格/列表共用；只 import ui/pageloader，基建→基建）
  'chipkit.js', // 0.9.305 卫生批⑤：chip 组协议单源（zone/精选/原生面板共用；只 import ui，基建→基建）
  'cssseg.js', // 0.9.309 影子样式缝化：影子根/文档级共用 CSS 段 token（零依赖纯常量；cssraw 构建期插值 + settingspanel/imnative 影子根运行时共用）
  'imgurl.js', 'pagekind.js', 'settings.js', 'viewreg.js', 'imgload.js', 'overlay.js', 'topbar.js',
  'ui.js', 'errbox.js', 'styles.js', 'dbg.js', 'timefmt.js', 'uplook.js', 'nameval.js',
  // 0.9.258 登记：pack（内嵌压缩串解包**单源**，hls/devname/styles 三处共用）。归基建件是因为
  // 消费方 styles 属基建层（不登记就会在口径 A 报「styles→pack 越层」）；pack 自身零内部依赖
  // （只 import fflate）。另：cssraw.js 是构建期输入（只被根目录 build.js import），src 内零入边，
  // 两口径都天然 0 条，不入表
  // 0.9.259（审计批④）登记：pageloader（翻页骨架**单源**，followview/squarefeed/mypage 历史档
  // 与管理档壳四处共用）。零依赖叶（不 import 任何东西）⇒ 无自有出边，登记只为让消费点（三家
  // 特性/视图件）的入边留在口径 A 射程外——与 pack 同款「共享基建件」定位
  'pack.js', 'pageloader.js',
  // 0.9.264 登记：lifecycle（监听器作用域，零依赖叶）与 contract（端点形状守卫，只依赖 dbg）。
  // 两者都是被播放/视图/域传输共用的基建件，消费方向均为特性/接口 → 基建
  'lifecycle.js', 'contract.js']);
// 接口层（0.9.261 扩面：+5 件域传输）。这五件与 api/appapi/quality 同性质——只做端点取数与
// 回包规整，不含视图/交互知识：channelapi（分区频道树）/ favapi（收藏夹与收藏列表）/
// relationapi（关注关系）/ momentapi（动态读域）/ upload（评论图片上传四段，GM 二进制通道）。
// 归 FEATURE 也全绿，但会把"传输"与"特性域"混为一谈；归 API 后它们**仍受口径 B 约束**
// （接口层 → 特性 = 红），不是"无检查的自由桶"。
const API = new Set(['api.js', 'appapi.js', 'quality.js',
  'channelapi.js', 'favapi.js', 'relationapi.js', 'momentapi.js', 'upload.js',
  'watchlaterapi.js', 'rankapi.js', 'historyapi.js',
  'signapi.js']); // 0.9.279 稍后再看/三榜/历史写链；0.9.297 补签到域（原未分类=零检查）
// 校准（0.9.117 首跑即立；0.9.119 扩一项）：README 明示的五件零依赖解耦点里，immsg/imicons
// 现居私信层 subgraph——那是出身 placement，不是专属域；它们被 topbar/cards/momentbar/comments
// 等广泛消费，视同基础件。ubbtext（0.9.119 下沉的纯投影族）同为零依赖叶子。不校准则口径 A
// 会持续误报「共享叶子被顶层消费」（同 report→watchledger 的误报自纠：错的是归类，不是依赖）。
// searchhist（0.9.158 共享化：读写站方 searchCache 的零依赖叶，topbar 聚焦面板与 searchview
// 两方消费——0.9.160 诊断复跑发现该边漏登记，同 immsg/imicons 校准：错的是归类，不是依赖）
// 0.9.260（播放层建桶同批）：advdm（高级弹幕模型核，**零依赖纯函数**：解析/缓动/插值/绘制，
// 无 DOM 无状态无网络）与 toastmsg（用户提示**话术单源**，只 import ui/cfg，零 DOM 依赖）——
// 两者都是"被广泛消费的共享叶子"，不归类的话播放层建口径 C 后会各自被「→ 未登记」卡住
// （dmcanvas→advdm、danmaku→toastmsg）；归零依赖叶即消解，且不放松任何既有边
// （无一基建件 import 它们，故口径 A 的射程零变化）
// 0.9.261：searchfmt（搜索卡投影——纯函数，只依赖 imgurl/playitem/timefmt）与 ubbtext 同族
// （纯投影族），消费方 searchview 属特性层 ⇒ 归零依赖叶
const LEAF_SHARED = new Set(['immsg.js', 'imicons.js', 'ubbtext.js', 'searchhist.js',
  'advdm.js', 'toastmsg.js', 'searchfmt.js',
  'domfields.js', // 0.9.297：slide/item 字段契约数据（零依赖叶，attach 与 check-contract 共同消费）
  'ubbattr.js']); // 0.9.309：UBB 出链/出图 HTML 属性段单源（零依赖叶；ubb/emoticon/imbubble/commentkit 四面消费）

// 口径 B 用：特性域清单（0.9.117 定版；新增特性模块时同步。0.9.124 加 rowkit.js——视图层
// 行卡 kit，与 followview/squareview 同层：它依赖 momentbar/comments 属特性层内互调，非反向；
// 0.9.128 加 squarefeed.js（广场列表机械工厂，视图家族共享件）与 memberplaza.js（原生页
// 入口/内嵌宿主）——同为特性层，与 rowkit/comments 的依赖属层内互调；0.9.133 加 commentkit.js
//——评论条目渲染 kit，与 comments.js 同层（管线→kit 单向））
const FEATURE = new Set(['followview.js', 'followstream.js', 'momentdetail.js', 'momentbar.js',
  'followbadge.js', 'imbadge.js', 'comments.js', 'imdrawer.js', 'imnative.js', 'mypage.js', 'zone.js',
  'searchview.js', 'playlayer.js', 'settingspanel.js', 'uppage.js', 'nav.js', 'rowkit.js',
  'squareview.js', 'squarefeed.js', 'memberplaza.js', 'commentkit.js', 'reldrawer.js',
  // 0.9.169 登记：reldrawer（抽屉 tab 特性件，comments 两 seam 单向）/ jingxuanview（分区页视图，
  // 消费 appapi/channelapi/cards/settings/imicons/relatedapi，无被依赖回边）。两者的方向复核
  // 与新增边清单见 docs/dependency-audit.md「0.9.168–0.178」节
  // 0.9.218 登记：spacetab（空间页标签栏注入共享件，两标签共用注入/切换/排序/自愈，只依赖 ui）/
  // spacemoments（空间页「动态」标签特性件，消费 spacetab/squarefeed/momentapi/rowkit/cfg/ui）。
  // 二者与 rowkit 同属特性层 shared kit + 视图件，与 uppage 的依赖属层内互调
  //（0.9.314：原生页落点改由 rowkit.openRowSource 单出口承载——spacemoments 不再 import
  //  memberplaza，memberplaza 的号锚导出 addAmAnchor 整件撤除；两处依赖仍属特性层内互调）
  // 0.9.221 登记：composermirror（输入框镜像层装饰器，消费 emoticon/tokenedit/ui）——把
  // 「输入条要渲染表情」这条边从基建层的 inputbar 挪到特性层（免得新增基建→特性反向边）
  //〔0.9.238 撤除：镜像层与令牌原子化两件随富文本载体退役，条目删除〕
  // 0.9.222 登记：momenteditor（发动态编辑器，三处入口共用出口；消费 inputbar/momentpost/
  // cards/overlay…）/ pubentry（原生 /member/feeds 入口注入，与 memberplaza 同页共存）
  'jingxuanview.js', 'spacetab.js', 'spacemoments.js',
  // 0.9.238 登记：inputbar（富文本输入条：contenteditable 编辑 + 出口序列化，消费 emoticon/
  // imicons/ui）——由基建层改入特性层（口径 A 的注释见上）；消费方 comments/imdrawer/momenteditor
  // 三件均在本表内，属层内互调，两口径 0 条（反跑证据见 docs/dependency-audit.md「0.9.238」节）
  'inputbar.js',
  // 分享面板的登记史（0.9.222 → 0.9.233）：0.9.222 它新增 → momenteditor 边，当批只把该边
  // 入 KNOWN 放行（sharepanel/rail/slide 三件分类债未定）；0.9.233 专项一次登记，见下
  // 0.9.224 登记：pubfab（发布常驻浮标共用件，消费 momenteditor/ui）——与 composermirror 同类的
  // 特性层 UI 件（此前 pubentry 也归在特性层）
  'momenteditor.js', 'momentpost.js', 'pubfab.js',
  // 0.9.233 分类债专项收敛：sharepanel（分享面板 UI 共用件，消费方只认 openSharePanel 等出口）/
  // rail（右侧操作栏）/ slide（slide/抽屉骨架）三件一次登记——它们是**特性层 UI 件**，与
  // followview/comments 同格；README 图中位于播放层 others/私信层 subgraph 是出身 placement、
  // 不是专属域（同 immsg/imicons/ubbtext 校准先例）。+3 后三条消费链（rail→sharepanel、
  // slide→rail 及三件的全部入边：comments/imdrawer/momentdetail/rowkit/playlayer）全成层内互调：
  // 两口径 0 条、KNOWN 清零（反跑证据见 docs/dependency-audit.md「0.9.233」节）
  'sharepanel.js', 'rail.js', 'slide.js',
  // momentpost 同批归类（0.9.223）：动态**发布域**（写链 + 编辑器宿主），与接口层的 momentapi
  // （读域）同属动态域但方向不同：本件被 momenteditor/memberplaza 消费，属特性层；
  // 0.9.238：tokenRanges 随令牌原子化件退役收进本件（出口文本的字数口径），依赖面反而变窄
  // 0.9.259（审计批④ P3-2）：本行原有的 'momentpost.js' **删去**——它已在上方
  // 'momenteditor.js', 'momentpost.js', 'pubfab.js' 那一组里登过（全表唯一重复登记，令
  // 注册数与 FEATURE 成员数各虚增 1）。归类理由留在本处，条目位置归位上组
  // 0.9.245 登记：iploc（评论 IP 属地查询层，Web-IP 吸收批次①）——与 comments/commentkit 同层，
  // 消费 cfg/net/ui/dbg/settings；消费方 comments 已在表内，属层内互调（两口径 0 条）
  'iploc.js',
  // 0.9.246 登记：devname（设备型号美化，Web-IP 吸收批次②）——消费 cfg/settings/devicetab（纯数据
  // 叶子，非特性）；消费方 comments 已在表内，同属层内互调
  'devname.js',
  // 0.9.248 登记：nativeip（原生页评论 IP+设备，Web-IP 吸收 6a）——消费 dbg/devname/iploc/styles；
  // 消费方 boot 是组合根（SKIP_B，装配向下不计）
  'nativeip.js',
  // 0.9.250 登记：natpanel（原生页设置面板皮肤，Web-IP 吸收 6c）——消费 dbg/devname/iploc/
  // settings/styles/ui；消费方 nativeip 同在表内（层内互调）
  'natpanel.js',
  // 0.9.259（审计批④ P3-2 覆盖扩面·bounded 第一轮）：cards（卡面 kit 单源——网格卡/行卡/横条/
  // 引用卡/UP 卡/计数行/骨架）。归特性层而非基建层：它 import 的 ubb（动态正文 UBB 单源）不在
  // 基建/接口/零依赖叶之列，当基建件会在口径 A 报「cards→ubb 越层」；而全部 11 个消费方
  //（followview/jingxuanview/momentdetail/momenteditor/mytabs/playlayer/rowkit/searchview/
  // squarefeed/squareview/zone）**都已在 FEATURE 表内** ⇒ 口径 B 也是层内互调，两口径 0 条
  'cards.js',
  // 0.9.259（同上批，覆盖扩面第一轮之二）：views（子视图框架/宿主——`#svfeed/<view>` 路由宿主 +
  // 来源链/挂起保活；卡面 kit 0.9.109 已拆出，本件只管编排）。与 squareview/squarefeed/rowkit
  // 同属视图家族；其唯一消费方是 player（SKIP_B 组合根，装配向下不计）⇒ 口径 B 0 条。另一可行
  // 桶是 SKIP_B（README:405 自述「只管编排」，与 boot/player 同格，同样绿）——取 FEATURE 是因为
  // 它更严：将来任何非特性件反向依赖本件照样翻红
  'views.js',
  // 0.9.259（同上批之三）：imsend（ImSdk 基建·私信域发送核心）。FEATURE 与 INFRA 两桶都绿，
  // 取特性层：消费方 imbadge/imdrawer/sharepanel 三件**均已在表内**（层内互调），自身只 import
  // 基建/接口/零依赖叶（cfg/dbg/net/ui + appapi + immsg）；README 私信层是出身 placement、非专属
  // 域（同 0.9.233 的 sharepanel/rail/slide 校准先例）
  'imsend.js',
  // 0.9.270 登记：imsdk（ImSdk 加载/注入/补丁 + 日志黑匣子 + 单例连接/重连 + 崩溃水位，
  // 自 imsend 拆件）。与 imsend 同属私信特性域：入边 imsend/imdrawer/imbadge/imlist/imchat/
  // imsendui/sharepanel 全部在表内（层内互调）；出边只到基建（cfg/dbg/net/ui）⇒ 两口径 0 条。
  // 单例槽 imPromise/世代 connGen/水位 tracerFixedTotal 整组随本件走，imsend 不持副本
  'imsdk.js',
  // 0.9.266 登记：imimage（私信图片管线：字节 midground 令牌/blob LRU/下载队列/在飞去重 + URL
  // 换链 ks://→官方直链，自 imsend 拆件）。与 imsend/imdrawer 同属私信特性域：唯一消费方 imdrawer
  // 在表内（层内互调）；自身只 import 基建（cfg/dbg/net/ui）⇒ 口径 A/B 均 0 条
  'imimage.js',
  // 0.9.268 登记：imbubble（私信气泡渲染簇，自 imdrawer 拆件）。与 imdrawer/imsend/imimage 同属
  // 私信特性域：唯一入边 imdrawer 在表内（层内互调）；自身只 import FEATURE（emoticon/imcard/
  // imimage/ubb）+ INFRA（cfg/ui/imgload/imgview）+ API（appapi）+ 零依赖叶（immsg/imicons）
  'imbubble.js',
  // 0.9.269 登记：imlist/imchat/imsendui（私信列表视图 / 聊天视图+引用 chip / 发送乐观 UI，自
  // imdrawer 三簇拆件）。与 imdrawer/imbubble 同属私信特性域：入边全部来自 imdrawer（层内互调），
  // 出边只到 FEATURE（imsend）/ INFRA（cfg/ui/timefmt/imgload）/ 零依赖叶（immsg/toastmsg）；
  // 三件均不 import imdrawer（无回边、无环）
  'imlist.js', 'imchat.js', 'imsendui.js',
  // 0.9.261（覆盖收尾=审计批④ P3-2 的剩余 18 件）：以下 12 件均为**特性层共享件**
  // （UI kit / 弹层 / 私信卡 / 视图尾件 / 沙盒宿主）。逐件核过入边：全部来自 FEATURE 或
  // SKIP_B 组合根，三口径 0 条。逐组说明：
  //   · 弹层族：banpop（投蕉数量层，momentbar/rail 消费）/ favpop（收藏夹弹层，mypage/rail）/
  //     grouppop（关注分组弹层，mypage/rail/searchview）/ pickpop（锚定弹层底座，
  //     favpop/grouppop/mypage）/ popplace（浮层定位单源，pickpop/sharepanel）
  //   · 内容 kit：emoticon（表情映射+渲染，comments/followview/imcard/imdrawer/imnative/
  //     inputbar/momentdetail/momenteditor/squarefeed）/ ubb（UBB 解析+渲染单源，
  //     cards/commentkit/imdrawer/imnative/squarefeed）/ imcard（私信卡片装配，两皮肤同源；
  //     imdrawer/imnative）
  //   · 视图件：listtail（三态状态行+回顶+触底，followview/jingxuanview/mypage/searchview/
  //     squarefeed/zone）/ sidebar（dock 左栏，followbadge/followstream/followview/player/views）/
  //     release（更新检查+弹窗单例，player 消费）/ followseen（关注已读水位，
  //     followbadge/followstream/followview）
  'banpop.js', 'favpop.js', 'grouppop.js', 'pickpop.js', 'popplace.js',
  'emoticon.js', 'ubb.js', 'imcard.js', 'listtail.js', 'sidebar.js', 'release.js',
  'followseen.js',
  // 0.9.293 登记：meadmin（我的页档头+管理模态共用件，自 followadmin 出库）。与 cards 同属
  // 特性层 shared kit：消费方 followadmin/mytabs 全在表内（层内互调）；自身只 import 基建
  //（ui/state/overlay）、零依赖叶（imicons）与弹层族 pickpop（确认卡单源）⇒ 口径 A/B 均 0 条
  'meadmin.js',
  // 0.9.265 登记：mytabs（我的页管理档：观看历史/收藏夹/关注分组 + 管理档壳，自 mypage 拆件）。
  // 与 mypage 同属视图特性层：唯一消费方 mypage 在表内（层内互调）；自身只 import 基建（cfg/
  // panelitem/ui/pageloader/nameval/imgload）、接口（appapi/favapi/relationapi）与特性层共享件
  //（cards/listtail/favpop/grouppop/pickpop/toastmsg）⇒ 口径 A/B 均 0 条
  'mytabs.js',
  // 0.9.289 登记：followadmin（我的页关注列表档，对齐原生 /member/feeds/following，自 mytabs
  // 移出）。与 mypage/mytabs 同属视图特性层：唯一消费方 mypage 在表内（层内互调）；自身只 import
  // 基建（cfg/ui/pageloader/imgload）、零依赖叶（imicons/nameval/toastmsg）、基建族 cards
  // （骨架行，0.9.259 已入表）/listtail（0.9.219 已入表）、特性层 overlay 与接口层 relationapi
  // ⇒ 口径 A/B 均 0 条
  'followadmin.js',
  // 0.9.297 登记：signpanel（签到黄历弹窗，0.9.277 建；此前未分类=零方向检查）。
  // 归 FEATURE：消费方 mypage 在表内，层内互调；自身只 import ui/overlay（基建）与
  // signapi 回包（由 mypage 传入，不反向 import 接口层）⇒ 口径 A/B 0 条。
  'signpanel.js',
  ]);
const SKIP_B = new Set(['boot.js', 'player.js', 'sessionhooks.js']);
// 0.9.271：sessionhooks（会话回接钩子）与 player 同属组合根/编排层——它 import rail/playlayer/
// views 等 FEATURE 属装配向下，归 PLAY 会触发口径 C、归 FEATURE 语义不准；SKIP_B 对口径 B 豁免。

// 口径 D 用：零依赖叶清单**机器读自 README** 依赖图 `class … leaf;` 行——与 check-hygiene
// pass ⑤ 同一事实源（「零依赖」的命名承诺写在 README 图上，注释即事实源者必须可核）。
// 读不到 fail loud 直接退出，不许静默跳过。受限本批只许改两个检查件，此处与 check-hygiene
// 的解析暂各留一份极小副本；第三处需要时收口成共享件。
const README_PATH = path.join(ROOT, 'README.md');
if (!fs.existsSync(README_PATH)) {
  console.error('[check-direction] ✗ README.md 读不到——零依赖叶清单失去事实源，口径 D 无法进行（fail loud）');
  process.exit(1);
}
const leafClass = fs.readFileSync(README_PATH, 'utf8')
  .match(/^\s*class\s+([^\s;]+)\s+leaf\s*;/m); // 不匹配 classDef（"class" 后须紧跟空白）
if (!leafClass) {
  console.error('[check-direction] ✗ README.md 依赖图中找不到 `class … leaf;` 行——零依赖叶清单失去机器可读事实源，fail loud（不许静默跳过）');
  process.exit(1);
}
const LEAVES = new Set(leafClass[1].split(',').map((s) => s.trim())
  .filter(Boolean).map((n) => n.endsWith('.js') ? n : n + '.js'));
if (!LEAVES.size) {
  console.error('[check-direction] ✗ README.md `class … leaf;` 行解析结果为空——事实源疑似损坏，fail loud');
  process.exit(1);
}

// 口径 C 用：播放层（0.9.260 建桶）。定位=**播放/泵流核心**：视频会话与源挂载（session/attach/
// playback/hls/prewarm）、控制栏与手势（controls/input）、弹幕渲染（dmcanvas/danmaku）、播放层
// 编排（playgest/playstate/levelstack/relatedapi）、写入链（interact）、观看上报（report/
// watchledger）、泵流仓库与列表上下文（feedstore/feedctx）。
// 为什么这批模块（20 件，计数见运行时「分类覆盖」行）**都不该**进 FEATURE：它们被特性层广泛依赖（feedstore 被 attach/controls/input/
// playback/prewarm/report/views/rail 消费；relatedapi 被 jingxuanview/playlayer 消费），归特性层
// 会把"播放层→播放层"的入边误判成"非特性→特性"（口径 B 红）；也不该进 INFRA（它们有领域知识：
// 播放态、弹幕窗口、泵游标）。口径 C 的方向：**播放层只许依赖同级/更下层**（基建/接口/零依赖叶/
// 播放层），不许依赖特性层（口径 B 也管这半）、组合根或未登记件（C 补这半）。
// 0.9.267 加 dmpanel（弹幕设置面板 UI 件，自 controls 拆出）：与 controls 同层；只 import
// ui/settings（基建）⇒ PLAY→INFRA 合法，不放开任何既有边。
// 复点：node -e "…"（同 INFRA 那条，把 INFRA 换成 PLAY）
const PLAY = new Set([
  'session.js', 'attach.js', 'playback.js', 'hls.js', 'prewarm.js',
  'controls.js', 'dmpanel.js', 'feedland.js', 'input.js',
  'dmcanvas.js', 'danmaku.js',
  'playgest.js', 'playstate.js', 'levelstack.js', 'relatedapi.js',
  'interact.js', 'report.js', 'watchledger.js',
  'feedstore.js', 'feedctx.js'
]);

// 在册项（0.9.119 起清空——data→ubb 随手下沉完成，方向卫生库存归零；0.9.222 曾破例入册 1 条
// sharepanel→momenteditor，0.9.233 专项分类纠正后复归清空；0.9.310 口径 E 首轮登记 2 条。
// 新增项=需要一次裁决，改动须同步 docs/dependency-audit.md）
const KNOWN = [
  // 口径 E 首轮登记（0.9.310）：singleFlight/selfUid 纯工具暂居 ui.js——并发/鉴权原语误居
  // UI 工具件的历史归置，接口族被迫触 ui；挂账 ui 拆件时迁出后撤行。在册=可见的债，不是赦免。
  { edge: 'appapi.js -> ui.js', note: 'singleFlight/selfUid 纯工具暂居 ui.js（历史归置）——ui 拆件迁出后撤行' },
  { edge: 'signapi.js -> ui.js', note: 'singleFlight/selfUid 纯工具暂居 ui.js（历史归置）——ui 拆件迁出后撤行' },
];
const knownSet = new Set(KNOWN.map((k) => k.edge));

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
// 0.9.297 分类覆盖（棘轮）：每个 src 必须落在恰好一个桶里；仅这两件显式豁免。
// 此前 signapi/signpanel 不在任何桶——不报错也不检查，等于「未分类=自由」。新增模块漏登记
// 从此是 CI 红，不是 review 漏网。
const EXEMPT = new Set([
  'cssraw.js',   // 构建期输入，只被根目录 build.js import（src 内零入边）
  'devicetab.js' // 生成物（tools/gen-device-data.js），数据件不参与方向判定
]);
const buckets = { INFRA, API, LEAF_SHARED, FEATURE, SKIP_B, PLAY };
const unclassified = files.filter((f) => !EXEMPT.has(f)
  && !Object.keys(buckets).some((k) => buckets[k].has(f)));
const multi = files.filter((f) => Object.keys(buckets).filter((k) => buckets[k].has(f)).length > 1);
const coverageBad = [];
if (unclassified.length) coverageBad.push('未分类：' + unclassified.join(', '));
if (multi.length) coverageBad.push('重复分类：' + multi.map((f) => f + '（'
  + Object.keys(buckets).filter((k) => buckets[k].has(f)).join('/') + '）').join(', '));
console.log('[check-direction] 分类覆盖：' + Object.keys(buckets)
  .map((k) => k + ' ' + buckets[k].size).join(' / ') + ' / 豁免 ' + EXEMPT.size
  + '（src ' + files.length + '）');
const edges = new Set();
for (const f of files) {
  const txt = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const m of txt.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)) edges.add(f + ' -> ' + m[1]);
  for (const m of txt.matchAll(/^import\s+'\.\/([\w.-]+\.js)';/gm)) edges.add(f + ' -> ' + m[1]);
}

const hitsA = [];
const hitsB = [];
const hitsC = [];
for (const e of edges) {
  const [a, b] = e.split(' -> ');
  if (INFRA.has(a) && !INFRA.has(b) && !API.has(b) && !LEAF_SHARED.has(b)) hitsA.push(e);
  if (!FEATURE.has(a) && FEATURE.has(b) && !SKIP_B.has(a)) hitsB.push(e);
  if (PLAY.has(a) && !PLAY.has(b) && !INFRA.has(b) && !API.has(b) && !LEAF_SHARED.has(b)) hitsC.push(e);
}
// 口径 D：零依赖叶的**任何**静态 import 出边都算失真（无目标白名单——承诺是「零依赖」本身；
// 既有 A/B/C 都不约束叶的出边，此为缺口所在）
const hitsD = [...edges].filter((e) => LEAVES.has(e.split(' -> ')[0]));
// 口径 E：接口家族（按文件名 *api.js 判，与桶位无关——relatedapi 虽居 PLAY 同样受管）
// 不得触 UI 三件；既有口径对 API 桶出边零约束，此为缺口所在
const UI_TOUCH = new Set(['ui.js', 'styles.js', 'views.js']);
const hitsE = [...edges].filter((e) => {
  const [a, b] = e.split(' -> ');
  return /api\.js$/.test(a) && UI_TOUCH.has(b);
});
hitsA.sort();
hitsB.sort();
hitsC.sort();
hitsD.sort();
hitsE.sort();

let unregistered = 0;
function report(hits) {
  for (const e of hits) {
    if (knownSet.has(e)) {
      const k = KNOWN.find((x) => x.edge === e);
      console.log('  [在册] ' + e + ' —— ' + k.note);
    } else {
      unregistered++;
      console.log('  [⚠ 未登记] ' + e + ' —— 新侵蚀候选：请裁决（修边 / 加设缝 / 登记入册）并同步 docs/dependency-audit.md');
    }
  }
}

console.log('[check-direction] 方向诊断（棘轮）');
console.log('口径 A · 基建层 → 基建/接口层之外：' + hitsA.length + ' 条');
report(hitsA);
console.log('口径 B · 非特性 → 特性模块：' + hitsB.length + ' 条');
report(hitsB);
console.log('口径 C · 播放层 → 播放层/基建/接口/零依赖叶之外：' + hitsC.length + ' 条');
report(hitsC);
console.log('口径 D · 命名承诺「零依赖叶」（README class … leaf; 清单）→ 0 条静态 import 边：' + hitsD.length + ' 条');
report(hitsD);
console.log('口径 E · 命名承诺「接口家族」（*api.js）→ 不得触 ui/styles/views：' + hitsE.length + ' 条');
report(hitsE);
if (coverageBad.length) {
  coverageBad.forEach((b) => console.log('  ✗ 分类覆盖：' + b + '——新增模块必须显式入桶（或加入 EXEMPT 并写理由）'));
}
if (unregistered) {
  console.log('[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 ' + unregistered
    + ' 条——请裁决（修边 / 加设缝 / 登记入册）并同步 docs/dependency-audit.md');
  process.exit(1); // 棘轮（0.9.187）：未登记即红；在册项带理由放行
}
if (coverageBad.length) process.exit(1);
console.log('[check-direction] 在册 ' + KNOWN.length + ' 条，未登记 0 条——方向卫生无新增侵蚀');
