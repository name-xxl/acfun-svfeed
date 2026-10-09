// ---------- 广场视图（0.9.126，吸收动态广场；0.9.128 列表机械抽 squarefeed） ----------
// 数据源=feedSquare（免登录，§2.7 实测）——与关注·全部页的差异全在「方言」：游标首页不传
// （续翻用响应的 `时间戳:时间戳`）、**24h 窗口**（squarePageOf 收口，0.9.159 起在 momentapi：
// 只出发布 ≤24h 且超窗即终页——广场的原味）、互动态免登录恒 false（对 ≤3h 新鲜条目走 moment/detail 补偿）。
// 行卡/列表委托/行内评论全复用 rowkit（与 followview 同源零漂移）；列表机械（加载/五条不
// 变量/发现态轮询/新鲜度回填/回顶/骨架）收口 **squarefeed 工厂**（0.9.128）——本文件只留
// 视图外壳：dock 注册、行落点策略、unmount。内嵌宿主（memberplaza）与视图共用同一工厂。
import { el } from './ui.js';
import { momentPiOfRepost } from './panelitem.js';
import { setMomentOpener } from './cards.js';
import { registerView } from './viewreg.js';
import { openMomentDetail } from './momentdetail.js';
import { closeInlineComments, openRowDefault } from './rowkit.js';
import { createSquareFeed } from './squarefeed.js';
import { mountPubFab } from './pubfab.js'; // 发布常驻浮标（0.9.224）
import { testHook } from './dbg.js';

// 行落点：视图内默认策略已下沉 rowkit.openRowDefault（0.9.218 单源——与「我的」页动态共用同一份：
// 动态开详情面板、行内评论区先关防双宿主互踩；非动态条目走 href 新标签）

var feed = null; // 当前实例（视图单例存活：build 建 / teardown 停）
var pubFab = null; // 发布浮标（视图级，随视图摘）

function buildSquareView(body) {
  // 发布入口（0.9.224 用户裁决）：右下角**常驻浮标**（钉在回顶之上；0.9.222 的顶部工具条已撤）
  pubFab = mountPubFab(body, { editorOpts: { onDone: function () { if (feed) feed.refresh(); } } });
  var wrap = el('div', 'acsv-sqwrap');
  body.appendChild(wrap);
  feed = createSquareFeed({
    root: wrap,
    scrollEl: body,      // 视图体即滚动容器（与广场原版 window 滚动的差异收在工厂方言）
    backTopHost: body,
    onOpen: openRowDefault
  });
}

// 动态详情出口注册（0.9.126）：与 followview 注册同一闭包——setMomentOpener 是单槽注入，
// 两视图内容相同、覆盖无害（引用卡源动态落点在两视图一致）
setMomentOpener(function (rp) { openMomentDetail(momentPiOfRepost(rp)); });

// debug 构建测试钩子（0.9.127）：harness 直调一次发现态轮询并读基准
testHook('squarePoll', function () {
  if (!feed) return null;
  feed.probe.run();
  return { latest: feed.probe.latest() };
});

// 视图卸载（0.9.127/0.9.128）：停轮询+解绑滚动（工厂句柄）+ 行内评论区宿主复位（容器随
// DOM 拆，残留 host 引用会读到死节点——followview 同款处置）
function squareTeardown() {
  if (feed) { feed.stop(); feed = null; }
  if (pubFab) { pubFab.remove(); pubFab = null; }
  closeInlineComments();
}

// 左栏 dock 元数据随视图声明（0.9.78）：order 15 = 排「榜单（10）」下面、与推荐/榜单同段
registerView({
  id: 'square', build: buildSquareView,
  teardown: squareTeardown,
  dock: {
    label: '广场', order: 15, group: 0,
    svg: '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>'
  }
});
