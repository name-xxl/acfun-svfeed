// ---------- 卡族交互态（transition / hover / press）单源表 + 生成器（0.9.317） ----------
// 病灶（用户实报「分区页卡片和我的页卡片动画交互不统一啊」→ 确认稿
// docs/preview/card-hover-unified.html）：同一套「可点内容卡」的反馈语言在五个卡族里各写一套，
// 散在 cssraw 四段（分区 .acsv-jx-card / 网格 .acsv-gcell / 榜单行 .acsv-vrow / 搜索行
// .acsv-sarow / 行卡族 .acsv-frow 与浅皮 .acsv-mp 那三行）——改一档要动四处、四处必漂
//（0.9.314 只统一了行卡族一族，本批即该裁决当时留下的「后批」）。
//
// 修法（规矩 3 单源收口 + 规矩 7「同一道缝反复出血即结构裁决」）：三层——
//   ① 值层＝styles.js 的 :root 变量（现有 --acsv-accent / --acsv-accent-dim / --acsv-ban-new 等，
//      一档一个出口），定义-使用失配由 test/check-cssvar.mjs 钉（CSS 变量名写错是静默失效，
//      本仓此前无闸管这条）。**本表的值仍以字面书写**：统一批的口径是「同一**规则**（基色 +.04）
//      族族可比」，各族字面本就不同（分区基色 .04 ⇒ hover .08；行式基色 0 ⇒ hover .04），
//      故不立 --acsv-hv-* 一类 token（立了反而要把差异藏进变量名，更绕）；
//   ② 生成器层＝本件 hoverRules(rows)：**纯函数**（零 DOM、零依赖、不读环境），node 单测可直采
//      （test/unit/csshover.test.js＝族表闸，双向：表→产物每条落地、产物→表每行有出处）；
//   ③ 族表层＝下方 HOVER_ROWS，**一行＝一族**（卡根 cards / 提底 lift / 封面图元 img /
//      标题 title / 按压 press），加一族＝加一行，不再往四段里各写一遍。
//
// 拼接位由 row.slot 决定：cssraw.js 在该族**原规则所在的位置**插 `hoverSlot('<slot>')`，
//   块内顺序由生成器统一（trans → lift → img → title → press）——0.9.317 搬表批与改前逐条等价
//  （逐条 diff 见该版 CHANGELOG），0.9.318 统一批才在表里改值。
// 纪律：本件只许被 src/cssraw.js（构建期输入）与 test/ 直采 import；**随产物发布的模块一律
//   不得引它**（同 cssraw 的纪律——CSS 原文一旦进产物即违 check-release 的「产物零 CSS 原文」闸）。
// 表只写「选择器 + 值字面」，不写判断：浅皮/暗皮差异走 scope（浅皮行 scope 前缀 .acsv-mp），
//   不给同一族落两份规则。

// 行字段（每族五个键都显式写全，缺项＝该组不产规则；0.9.318 起四新族补齐 trans/press，
// 与行卡族同一套口径）
//   key    族键（族表闸与反跑按它索引）
//   label  人读族名（单测/报告输出）
//   slot   cssraw.js 里的拼接位
//   scope  选择器前缀：''＝文档级；'.acsv-frow'＝行卡族可点面（详情面板/转发编辑器复用同批
//          类名却不吃反馈，靠这道 scope 挡住）；'.acsv-mp .acsv-frow'＝浅皮覆盖档
//   cards  可点卡根（transition 与 :active 挂这里；数组＝一族多个可点面）
//   trans  [{sels, v}]——sels 相对 scope，v＝transition 的值字面（基态规则，不是伪类）
//   lift   [{card, targets, v}]——targets 是卡根**之内**的目标（''＝卡根本体）
//   img    [{card, targets, v}]——封面图元 hover 的 transform 值
//   title  [{card, targets, v}]——标题 hover 的 color 值
//   press  [{cards, kind, v}]——kind='card' 卡面缩放 scale()、'row' 整行下沉 translateY()
//          （两档都是 0.9.314 行卡族已出货口径；方向纪律：缩放向内、位移向下，不许上浮）
export var HOVER_ROWS = [
  {
    key: 'jx', label: '分区卡', slot: 'jx', scope: '',
    cards: ['.acsv-jx-card'],
    // 0.9.318 统一批：提底 .04→.08（基色 +.04 一刀切）、**撤 accent 描边**（0.9.314 撤行卡族
    // 红环的同族动作）、补封面语言（图元 1.05 + 标题 accent，与网格卡同一条）＋按压＋过渡。
    // 封面盒 overflow:hidden 是**形态前提**（cssraw 的 .acsv-jx-cv 基态规则补，不进本表）
    trans: [{ sels: ['.acsv-jx-card'], v: 'transform .12s ease,background .12s ease' },
      { sels: ['.acsv-jx-cv img'], v: 'transform .12s ease' },
      { sels: ['.acsv-jx-ct'], v: 'color .12s ease' }],
    lift: [{ card: '.acsv-jx-card', targets: [''], v: 'rgba(255,255,255,.08)' }],
    img: [{ card: '.acsv-jx-card', targets: ['.acsv-jx-cv img'], v: 'scale(1.05)' }],
    title: [{ card: '.acsv-jx-card', targets: ['.acsv-jx-ct'], v: 'var(--acsv-accent)' }],
    press: [{ cards: ['.acsv-jx-card'], kind: 'card', v: 'scale(.985)' }]
  },
  {
    key: 'grid', label: '网格卡（我的页三档 · 搜索视频网格 · 关注流视频卡）',
    slot: 'grid', scope: '',
    cards: ['.acsv-gcell'],
    // 0.9.318 统一批：图元过渡自基态规则**拆出**（原「.2s 且与首帧淡入 opacity 同写一条」）——
    // transform 收 .12s ease、opacity 保留 .2s（它管 1271 的首帧淡入，不是交互反馈）；标题补
    // color 过渡；新增提底 .04（基色 0 +.04）与卡面按压缩放（挂卡根，不挂 .acsv-favcell
    // wrapper——管理键 absolute 在 wrapper 上，压缩放会让按钮跑掉，见确认稿裁决 ⑧）
    trans: [{ sels: ['.acsv-gcell'], v: 'transform .12s ease' },
      { sels: ['.acsv-gcover img'], v: 'transform .12s ease,opacity .2s' },
      { sels: ['.acsv-gtitle'], v: 'color .12s ease' }],
    lift: [{ card: '.acsv-gcell', targets: [''], v: 'rgba(255,255,255,.04)' }],
    img: [{ card: '.acsv-gcell', targets: ['.acsv-gcover img'], v: 'scale(1.05)' }],
    title: [{ card: '.acsv-gcell', targets: ['.acsv-gtitle'], v: 'var(--acsv-accent)' }],
    press: [{ cards: ['.acsv-gcell'], kind: 'card', v: 'scale(.985)' }]
  },
  {
    key: 'rank', label: '榜单行（含 .big 大卡档）', slot: 'rank', scope: '',
    cards: ['.acsv-vrow'],
    // 0.9.318 统一批：基态过渡自基态规则搬进本表并改口（原 background .15s）——行式卡要
    // background + transform 两段；标题补 color 过渡。提底按「基色 +.04」一刀切落到 .04
    //（基色 0），即原 .07 **下调**一档——属用户点名需复核的连带后果（CHANGELOG 0.9.318 有记）
    trans: [{ sels: ['.acsv-vrow'], v: 'background .12s ease,transform .12s ease' },
      { sels: ['.acsv-vrow-title'], v: 'color .12s ease' }],
    lift: [{ card: '.acsv-vrow', targets: [''], v: 'rgba(255,255,255,.04)' }],
    img: [],
    // 大卡档标题 accent 保留现状（cssraw 原 1124 那条，0.9.317 已并入本表行）；小行档按裁决 ⑩/⑬
    // 保持不补（行式形态不接封面语言）
    title: [{ card: '.acsv-vrow.big', targets: ['.acsv-vrow-title'], v: 'var(--acsv-accent)' }],
    press: [{ cards: ['.acsv-vrow'], kind: 'row', v: 'translateY(1px)' }]
  },
  {
    key: 'search', label: '搜索行（文章结果）', slot: 'search', scope: '',
    cards: ['.acsv-sarow'],
    // 0.9.318 统一批：补过渡（现状整条无 transition＝硬切）；提底按「基色 +.04」（基色 0）落到
    // .04，即原 .03 **上调**一档——同属需复核的连带后果；行式卡按压＝下沉档
    trans: [{ sels: ['.acsv-sarow'], v: 'background .12s ease,transform .12s ease' }],
    lift: [{ card: '.acsv-sarow', targets: [''], v: 'rgba(255,255,255,.04)' }],
    img: [], title: [], press: [{ cards: ['.acsv-sarow'], kind: 'row', v: 'translateY(1px)' }]
  },
  {
    key: 'frow', label: '行卡族可点面（条卡/引用卡/宫格 · 0.9.314 参照系）',
    slot: 'frow', scope: '.acsv-frow',
    cards: ['.acsv-frow-strip', '.acsv-gquote-on', '.acsv-frow-img'],
    trans: [{ sels: ['.acsv-frow-strip', '.acsv-gquote-on', '.acsv-frow-img'],
      v: 'transform .12s ease,background .12s ease' },
      { sels: ['.acsv-frow-img img'], v: 'transform .12s ease' }],
    lift: [{ card: '.acsv-frow-strip', targets: ['.acsv-frow-scover', '.acsv-frow-sbody'],
      v: 'rgba(255,255,255,.10)' },
      { card: '.acsv-gquote-on', targets: [''], v: 'rgba(255,255,255,.10)' }],
    img: [{ card: '.acsv-frow-img', targets: ['img'], v: 'scale(1.05)' }],
    title: [],
    press: [{ cards: ['.acsv-frow-strip', '.acsv-gquote-on', '.acsv-frow-img'],
      kind: 'card', v: 'scale(.985)' }]
  },
  {
    key: 'frow-line', label: '行卡族行根（整行下沉档）', slot: 'frow', scope: '',
    cards: ['.acsv-frow'],
    trans: [{ sels: ['.acsv-frow'], v: 'transform .12s ease' }],
    lift: [], img: [], title: [],
    press: [{ cards: ['.acsv-frow'], kind: 'row', v: 'translateY(1px)' }]
  },
  {
    key: 'frow-mp', label: '行卡族浅皮提底档（.acsv-mp 覆盖）', slot: 'mp', scope: '.acsv-mp .acsv-frow',
    cards: ['.acsv-frow-strip', '.acsv-gquote-on'],
    trans: [],
    // 浅皮是十六进制实底（不是暗皮的 rgba 提档），故按目标逐条给值；同特异度靠 scope 多一层
    // 压过深皮组（不靠源码顺序）
    lift: [{ card: '.acsv-frow-strip', targets: ['.acsv-frow-scover'], v: '#ececec' },
      { card: '.acsv-frow-strip', targets: ['.acsv-frow-sbody'], v: '#f0f0f0' },
      { card: '.acsv-gquote-on', targets: [''], v: '#ececec' }],
    img: [], title: [], press: []
  }
];

// scope 前缀拼装：''＝文档级；有 scope 时**目标选择器不吃 scope**（它是卡根的后代）
function rootSel(scope, sel) { return scope ? scope + ' ' + sel : sel; }
function hoverSel(scope, card, target) {
  var head = rootSel(scope, card) + ':hover';
  return target ? head + ' ' + target : head;
}

// 一族 → CSS 文本（组序固定：trans → lift → img → title → press）
// **不许就地改表**：表是导出常量，就地改写会让第二次调用重复加 scope 前缀（纯函数钉见
// csshover.test.js——同表连调两次必须同文）
function rowCss(row) {
  var scope = row.scope || '';
  var out = [];
  var i, e;
  for (i = 0; i < row.trans.length; i++) {
    e = row.trans[i];
    out.push(e.sels.map(function (s) { return rootSel(scope, s); }).join(',')
      + '{transition:' + e.v + '}');
  }
  for (i = 0; i < row.lift.length; i++) {
    e = row.lift[i];
    out.push(e.targets.map(function (t) { return hoverSel(scope, e.card, t); }).join(',')
      + '{background:' + e.v + '}');
  }
  for (i = 0; i < row.img.length; i++) {
    e = row.img[i];
    out.push(e.targets.map(function (t) { return hoverSel(scope, e.card, t); }).join(',')
      + '{transform:' + e.v + '}');
  }
  for (i = 0; i < row.title.length; i++) {
    e = row.title[i];
    out.push(e.targets.map(function (t) { return hoverSel(scope, e.card, t); }).join(',')
      + '{color:' + e.v + '}');
  }
  for (i = 0; i < row.press.length; i++) {
    e = row.press[i];
    out.push(e.cards.map(function (c) { return rootSel(scope, c) + ':active'; }).join(',')
      + '{transform:' + e.v + '}');
  }
  return out.join('');
}

// 纯函数：表 → CSS 文本（单测直采这条；同表二次调用必须同文——见 csshover.test.js 的纯函数钉）
export function hoverRules(rows) {
  var out = '';
  for (var i = 0; i < rows.length; i++) out += rowCss(rows[i]);
  return out;
}

// cssraw.js 的拼接位入口：按 slot 取该位该插的文本。slot 拼错/族被删＝**构建期抛错**
//（静默少产一段 CSS 正是本批要灭的病灶，不能由它自己开门）
export function hoverSlot(slot) {
  var rows = HOVER_ROWS.filter(function (r) { return r.slot === slot; });
  if (!rows.length) {
    throw new Error('csshover: slot=' + slot + ' 无族登记（族表与 cssraw 拼接位漂移）');
  }
  return hoverRules(rows);
}
