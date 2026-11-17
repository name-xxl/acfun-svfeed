// ---------- 落点策略注册表（落点收口结构批·前置骨架件；本批只立表与配闸，四个消费方一行未动） ----------
// 形态：(ct × 宿主语义) → 出口 的表（DEST）+ 单一查询出口（destOf）。行/卡点击后「去哪」的
// 决策此前散布五处 if 链（rowkit.openRowDefault / openRowSource / rowBarOf 评论键、
// cards.quoteBlockOf 源卡点击、searchview.articleRowOf）——同一道缝反复出血即结构裁决
//（AGENTS 规矩 7），两起实证：
//   · 0.9.331：followview.rowDefault 本地副本漏收 0.9.326「文章→阅读浮层」分支，关注页文章行
//     按 href 兜底跳原址（同形副本漂移病灶，用户实报）；
//   · 我的页动态视频行走 openRowDefault：它无视频分支、契约层视频又无 href（panelitem 在册：
//     href 是「站外页落点」字段，视频走播放层故不赋）——点击无响应（死点击）；同条目在关注页
//     却正常（本地副本恰好带视频分支），同缝二出血。
// 收口法：表是落点唯一事实源——新落点 = 加一行表项 + 单测（panelitem 解析器表 0.9.78 同款
// 纪律），不再往消费点插分支；本模块出站只留 siteOut 一处 window.open（test/check-dest.mjs
// 白名单双向钉住：多/漏都红）。表内容按**当前现状**填默认格、每格注明来历，批 2 对格注点名的
// 分叉点裁决后调格——本批不替用户做行为裁决（0.9.314 siteOnly 的教训：落点语义变化必须走裁决）。
// 依赖方向：本件 → 三出口件（cards/momentdetail/articleread）是「落点知道出口」的正向边，
// 出口件不回头 import 本件；批 2 接线时消费方只 import destOf（文末接线食谱）。
import { CFG } from './cfg.js';
import { openPanelItem } from './cards.js'; // 播放层出口（setItemOpener 注入缝，0.9.74）
import { openMomentDetail } from './momentdetail.js'; // 动态详情面板（0.9.96；0.9.218 行落点单源）
import { openArticleReader } from './articleread.js'; // 文章阅读浮层（0.9.326 行落点）

// 站方原址 URL 单源（出站落点唯一拼装处；cards.js「出站 URL 只由 CFG 基址拼装、不另立
// 第二份手拼地址」同款纪律）：
//   href 优先——契约在册：动态/文章 pi 带 href（站外页落点字段），视频不带；
//   缺 href 按 ct 补 CFG 基址 + id；id 兼容三形状：acId（panelitem pi）/ momentId（动态 pi）/
//   id（quoteBlockOf 的 repost 载荷，0.9.102 起契约字段）。
// 未知 ct 或无 id → 空串＝无落点（不猜测性拼 URL；调用方按空串降级，不静默换路）。
export function sourceUrlOf(pi) {
  if (!pi) return '';
  if (pi.href) return String(pi.href);
  var base = pi.ct === 'video' ? CFG.api.videoBase
    : pi.ct === 'article' ? CFG.api.articleBase
      : pi.ct === 'moment' ? CFG.api.momentBase : '';
  var id = Number(pi.acId || pi.momentId || pi.id) || 0;
  return base && id ? base + id : '';
}

// native 三源共用出站单出口（0.9.314 用户裁决 siteOnly）：站方原址新标签、纯导航——不开
// 脚本面板、不关行内评论区（rowkit.openRowSource 现状语义，批 2 后它改为转调本出口）。
// 全模块唯一 window.open 在此：新出站落点不许另抄第二处——扩 dest 表或复用本出口
//（check-dest.mjs 白名单钉住 dest.js 恰 1 处）。
function siteOut(pi) {
  var url = sourceUrlOf(pi);
  if (url) window.open(url, '_blank');
}

// script×video 出口：固定 {kind:'single'} 会话语境进播放层（0.9.173 用户裁决「仅播放单条
// 就只剩动态里的视频卡片」——不出右栏箭头、↓ 无下一条；openPanelItem 第二参=来源会话语境，
// cards.js 在册）。现状只活在 followview.rowDefault 本地分支（0.9.331 收口时特意自留的那格）；
// 批 2 收编进 openRowDefault 即顺带修「我的页视频行死点击」。
function videoSingle(pi) {
  openPanelItem(pi, { kind: 'single' });
}

// 表本体：ct 在册键 = moment/video/article（panelitem 契约三型；其余 resourceType 一概不接
// ＝宁可漏不错，契约层口径）。宿主语义两键：
//   script = 脚本自绘页宿主（关注流 / 我的页动态 / 广场 / 搜索页语境）
//   native = 原生页宿主（memberplaza 内嵌广场 / spacemoments 空间动态；0.9.314 siteOnly）
// 出口调用约定：cell(pi, env)——pi 是 panelitem 契约条目（repost 载荷由消费方先映射成 pi 形状，
// 引用卡现有 {acId:Number(repost.id)} 映射同款）；env 可选行级包（{row, onDeleted…}），随格转发。
// 每格标「现状默认，批 2 裁决后调整」：格值 = 该 ct×宿主今天的真实落点，分叉残留在格注点名。
export var DEST = {
  moment: {
    script: openMomentDetail, // 现状默认，批 2 裁决后调整——详情面板（0.9.218 行落点单源；引用卡经 momentOpener 注入缝同落点，0.9.102）
    native: siteOut           // 现状默认，批 2 裁决后调整——站方原址新标签（0.9.314：原生页不开脚本面板）
  },
  video: {
    script: videoSingle, // 现状默认，批 2 裁决后调整——显式单条会话（0.9.173；现状只在 followview 本地分支，openRowDefault 缺此格＝我的页视频行死点击病灶本体）
    native: siteOut      // 现状默认，批 2 裁决后调整——同 0.9.314（契约层视频无 href，URL 由 sourceUrlOf 补 videoBase+acId，openRowSource 现状同款）
  },
  article: {
    script: openArticleReader, // 现状默认，批 2 裁决后调整——阅读浮层（0.9.326 行落点最新裁决；搜索文章行 / 引用卡现状仍各自外链＝散布残余，收编与否批 2 定）
    native: siteOut            // 现状默认，批 2 裁决后调整——站方原址（0.9.314：深色浮层不进原生页）
  }
};

// 单一查询出口：落点决策唯一入口（批 2 后 rowkit/cards/searchview 全走这里，见文末食谱）。
//   destOf(ct, siteOnly) → 出口函数 | null
// siteOnly 沿用 0.9.314 冻结接口的字段名（宿主选项包唯一认得的字段：真＝本宿主是原生页），
// 消费方把手中 opt 包原样 `opt && opt.siteOnly` 传入即可，不再各自写宿主判别。
// 未知 ct / 表缺格 → 返回 null＝**显式降级信号**：调用方按「无落点」处置（跳过/置灰/提示），
// **不得**静默改道外链兜底——0.9.331 的病灶正是「兜底跳原址」把漏分支掩盖成"能点"。
// 挂账（批 2）可观测：降级接 stat 打点（dbg.js 的 stat/testHook 是现成参考，形如
// stat('dest.miss.' + ct)）——本域 stat 基建未立，先留位不接（不先挖好坑，将来多半被写成静默）。
export function destOf(ct, siteOnly) {
  var row = DEST[ct];
  var cell = row && (siteOnly ? row.native : row.script);
  if (!cell) {
    // stat('dest.miss.' + String(ct || 'unknown'))  ← 预留打点位（见上挂账，批 2 接）
    return null;
  }
  return cell;
}

// ---------- 批 2 接线食谱（本批一行都不接——只登记改法：摘 if 链换 destOf，闸同步减注册） ----------
// · rowkit.openRowDefault（script 行落点，0.9.218 下沉 / 0.9.331 收编过的那处）：分支链换
//   `var d = destOf(pi.ct, false); if (d) d(pi);`。行级前置留在消费方：moment/article 调用前
//   closeInlineComments（openCmt 是 rowkit 私有单例，不进表）；onDeleted 摘行回调经
//   cell(pi, env) 的 env 带入（moment 格 = openMomentDetail，第二参收 opts，env 即转发）。
//   收编 script×video 格后，共用 openRowDefault 的我的页/广场行流自动获得视频落点＝顺带修死点击。
// · rowkit.openRowSource（native 行落点，0.9.314）：函数体换
//   `var d = destOf(pi.ct, true); if (d) d(pi);`——memberplaza/spacemoments 两宿主的
//   onOpen 注入与 squarefeed 契约零改动；rowBarOf 文章评论键的 siteOnly 外链（rowkit 现状
//   0.9.328 注在册）随本条一起收 native 格。
// · cards.quoteBlockOf 源卡点击：siteOnly 出站分支与缺省分支同换
//   `destOf(repost.ct, opt && opt.siteOnly)`——repost 是 id 形状：native 走 sourceUrlOf 的
//   id 兼容（已表内）；script×video 沿用现有 {acId:Number(repost.id)} 映射（0.9.102 在册）
//   再进格；momentOpener 注入缝未注册时的外链兜底即 native 格语义（现状写在缺省分支 else 里）。
// · searchview.articleRowOf（搜索文章行）：现状自拼 articleBase 外链（「文章落原生页」老口径，
//   与 0.9.326 行落点已分叉）。**不是机械替换**：收编 script×article 格＝搜索行也开阅读浮层，
//   是行为改口，批 2 裁决后才许动；闸（test/check-dest.mjs）只负责它不许再长出第二份决策。
// · release.js「前往更新」×2：非内容落点（脚本自身更新域，无 ct/宿主语义），永久表外——
//   只在 check-dest.mjs WHITE 登记，不进本表。
