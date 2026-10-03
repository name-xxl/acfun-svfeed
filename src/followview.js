// ---------- 关注视图（0.9.91，路线图 Phase 2 主体 + Phase 3 动态卡并入） ----------
// 形态（D1 锁定决策）：dock 卡片视图——混合内容源（视频/文章/动态）只有卡片能共存；
// 复用 panelItem 契约 + 播放层直达，**不动 FeedStore**（它是竖刷渲染管线的单例，子视图另有
// 先例：我的/榜单/搜索各自持数组与游标）。
// 数据源：followFeedV2（统一混合流；首屏实测 20 条里 12 条是动态，占位很大——动态卡不能缺席）。
// 端点与三类条目形状实测在册：docs/api-research.md §2.1.1（2026-10-03 内置浏览器登录态）。
// 分档标题：契约字段 createTimeGroup 是**数字枚举**（1=今天/2=昨天/10=更早，边界实测钉死）——
// 文案由我们定（站方该页实测不渲染分档标题），语义以枚举为准。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { request } from './net.js';
import { followPanelOf } from './data.js';
import { gridCardOf, moreBtn, ubbTextOf, statRowOf } from './views.js';
import { imgInto } from './imgload.js';
import { registerView } from './viewreg.js';

// createTimeGroup 枚举 → 分档标题文案（枚举值是契约，文案是我们的）
var GROUP_NAMES = { 1: '今天', 2: '昨天', 10: '更早' };

// ---------- 卡面 v2（0.9.93）：模仿原生信息层级、改进横向空间利用 ----------
// 用户裁决（0.9.92 后）：「站方原生展示没很好利用网页空间，可以模仿但要改进」——
// 媒体向（视频）走网格卡单格；文本向（动态/转发）走**专属宽卡跨两列**（`acsv-gwide`），
// 容器 dense 填洞（styles.js 关注流段有量取与取值来源）。

// 文章卡（文本向：薄条封面 + 标题 + 摘要 + 脚行）——形态与视频的 4:3 图卡明显不同，一眼可辨
function articleCardOf(pi) {
  var a = el('a', 'acsv-gcell acsv-gart');
  a.href = pi.href;
  a.target = '_blank';
  a.rel = 'noopener';
  var cov = el('div', 'acsv-gart-cover');
  imgInto(cov, pi.cover, 'grid');
  cov.appendChild(el('div', 'acsv-gtag acsv-gkind', '文章')); // 角标在封面左上（0.9.92 起）
  a.appendChild(cov);
  a.appendChild(el('div', 'acsv-gart-title', pi.title));
  if (pi.desc) a.appendChild(el('div', 'acsv-gart-desc', pi.desc)); // 摘要=beginParagraph（实测）
  footOf(pi, a);
  return a;
}

// 动态卡（文本向宽卡）：头像行 + 正文（UBB 单源）+ 单图 + 计数行；转发再加引用块。
// 作者落在**头像行**而非脚行——0.9.83「作者唯一落点=脚行」是网格卡族的收口，本卡是文本向
// 卡型（原生关注流同款形制：头像行随内容一起读），信息仍只出现一次、不重复
function momentCardOf(pi) {
  var a = el('a', 'acsv-gcell acsv-gwide acsv-gmom');
  a.href = pi.href;
  a.target = '_blank';
  a.rel = 'noopener';
  var head = el('div', 'acsv-gmom-head');
  var av = el('span', 'acsv-gmom-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  head.appendChild(el('span', 'acsv-gmom-name', pi.up && pi.up.name ? '@' + pi.up.name : ''));
  if (pi.repost) head.appendChild(el('span', 'acsv-gmom-flag', '转发')); // 转发标识（0.9.92 需求在册）
  head.appendChild(el('span', 'acsv-gmom-time', pi.dateText || ''));
  a.appendChild(head);
  a.appendChild(ubbTextOf(pi.text, 'acsv-gmom-text'));
  if (pi.repost) {
    // 引用块 = 转发的结构性签名：左竖线 + 源缩略图 + 源标题 + 源类型字。
    // **不用源封面当主视觉**——实测转发的 coverUrl 恒等于源封面（9/9），照放会伪装成视频卡
    var q = el('div', 'acsv-gquote');
    var qt = el('div', 'acsv-gquote-thumb');
    imgInto(qt, pi.repost.cover, 'thumb');
    q.appendChild(qt);
    var qb = el('div', 'acsv-gquote-body');
    qb.appendChild(el('div', 'acsv-gquote-title', pi.repost.title || '（无标题）'));
    qb.appendChild(el('div', 'acsv-gquote-kind', (pi.repost.ct === 'video' ? '视频' : '文章')));
    q.appendChild(qb);
    a.appendChild(q);
  } else if (pi.cover) {
    // 原创动态：自己的图（实测 36/36 都有图）；纯文字形态未观察到，缺图自然不挂
    var im = el('div', 'acsv-gmom-img');
    imgInto(im, pi.cover, 'grid');
    a.appendChild(im);
  }
  if (pi.meta && pi.meta.length) a.appendChild(statRowOf(pi.meta));
  return a;
}

// 脚行（@作者 + 右槽时间）：网格卡族与文章卡共用（动态宽卡的作者在头像行，不走这里）
function footOf(pi, cell) {
  var upName = pi.up && pi.up.name ? pi.up.name : '';
  if (!upName && !pi.dateText) return;
  var foot = el('div', 'acsv-gfoot');
  foot.appendChild(el('span', 'acsv-gup', upName ? '@' + upName : ''));
  foot.appendChild(el('span', 'acsv-gtime', pi.dateText || ''));
  cell.appendChild(foot);
}

// 契约 ct → 卡型（0.9.93 起按内容型换卡；视频继续复用共享网格卡，点击走播放层直达）
function cardOf(pi) {
  if (pi.ct === 'article') return articleCardOf(pi);
  if (pi.ct === 'moment') return momentCardOf(pi);
  return gridCardOf(pi);
}

// 首屏骨架（复用我的页的独立类名 acsv-gskel：绝不与卡片计数选择器同构——0.9.66 教训）
function skeleton(listEl) {
  var nodes = [];
  for (var i = 0; i < CFG.view.follow.skel; i++) {
    var d = el('div', 'acsv-gskel');
    nodes.push(d);
    listEl.appendChild(d);
  }
  return function () {
    nodes.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
  };
}

function buildFollowView(body) {
  var wrap = el('div', 'acsv-mewrap');
  body.appendChild(wrap);
  var list = el('div', 'acsv-vlist acsv-megrid acsv-follow');
  wrap.appendChild(list);
  var btn = moreBtn(function () { load(); });
  wrap.appendChild(btn);

  var pcursor = '0';   // 首页游标：实测 feed 用字符串 '0'（毫秒时间戳游标由响应回填）
  var seq = 0;         // 换视图重入 / 重试令牌：旧回包丢弃（mypage 同款）
  var lastGroup = null; // 上一张渲染出的分档：跨页去重（翻页处不重复插头）

  function load() {
    var my = ++seq;
    var gone = skeleton(list);
    request(CFG.api.followFeed + '?useWebp=true&count=' + CFG.view.pageSize + '&pcursor=' + pcursor, 'GET')
      .then(function (j) {
        gone();
        if (my !== seq || !list.isConnected) return; // 过期/退出视图：在途回包丢弃
        btn.disabled = false;
        btn.textContent = '加载更多';
        var raws = (j && j.feedList) || [];
        var rendered = 0;
        raws.forEach(function (raw) {
          var pi = followPanelOf(raw);
          if (!pi) return; // 契约层过滤（未知类型/缺身份字段——宁可漏不错）
          // 分档标题：组变化处插一条（跨页按 lastGroup 去重）
          var g = raw.createTimeGroup;
          if (g !== lastGroup) {
            lastGroup = g;
            list.appendChild(el('div', 'acsv-ggroup', GROUP_NAMES[g] || '更早'));
          }
          list.appendChild(cardOf(pi));
          rendered++;
        });
        // 下一页游标：响应 pcursor 是毫秒时间戳；空/缺 → 到底
        var next = j && j.pcursor != null ? String(j.pcursor) : '';
        // 到底判定按**原始条数**（非筛除后条数）：契约层会滤掉未知类型条目，按有效数判到底
        // 会把还有下一页的列表误判成到底（0.9.77 我的页实锤）
        if (!next || !raws.length || raws.length < CFG.view.pageSize) btn.style.display = 'none';
        pcursor = next;
        if (!rendered && !list.querySelector('.acsv-gcell')) {
          list.appendChild(el('div', 'acsv-vempty', '关注的 UP 还没有新动态'));
        }
      }, function () {
        gone();
        if (my !== seq || !list.isConnected) return;
        btn.disabled = false;
        btn.textContent = '加载失败，点击重试';
      });
  }
  load();
}

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 从注册表派生，不再维护第二份清单）。
// 无 deep / 无 volatile——普通 dock 视图（我的/榜单同款语义：收旧 + 来源链作废）
registerView({
  id: 'follow', build: buildFollowView,
  dock: {
    label: '关注', order: 30, group: 1,
    svg: '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
  }
});
