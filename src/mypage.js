import { CFG } from './cfg.js';
import { el, selfUid } from './ui.js';
import { fmtWan } from './timefmt.js';
import { postForm } from './appapi.js';
import { createSquareFeed } from './squarefeed.js'; // 列表机械（0.9.218 我的页动态复用广场工厂）
import { listProfile } from './momentapi.js';       // 个人主页动态流（三合一混排）
import { openRowDefault } from './rowkit.js';       // 行落点单源（动态→详情面板）
import { mountPubFab } from './pubfab.js'; // 发布常驻浮标（0.9.224）
import { coverUrl } from './imgurl.js'; // meCardOf 头像归一（0.9.160 就地收编随迁）
import { registerView } from './viewreg.js';
import { imgInto } from './imgload.js';
import { buildHistory, buildFav, buildFollowGroups, buildWatchLater } from './mytabs.js'; // 我的页管理档（0.9.265 拆件）
// 签到（0.9.277）：资料头右侧按钮（App「已签到」药丸同位）+ 黄历弹窗；数据/写链全在 signapi
import { signIn, getSignInInfos, fetchAlmanac } from './signapi.js';
import { openSignAlmanac } from './signpanel.js';
import { errSignLogin, errSignFail, errSignAlmanac } from './toastmsg.js';

// ---------- 我的视图（0.9.62 起；0.9.69 抖音式个人主页改造）----------
// 布局：资料头（头像/昵称/关注·粉丝·投稿/签名）→ Tab（**动态**｜观看历史｜稍后再看｜收藏夹｜关注分组；
// 0.9.218 动态最前默认落地，0.9.279 稍后再看插在历史与收藏之间）→ 动态是行流（广场同套行卡），
// 历史/稍后再看/收藏为 4:3 网格，分组为列表。
// 接口契约 docs/api-research.md §4.1/§4.2（2026-10-02 实测）：历史 body 双 resourceTypes
// 缺一即 result 21「参数格式错误」；dougaList 列表键是 favoriteList（无 list 别名）。
// 条目一律经 panelItem 规整（类型过滤在契约层），点击 gridCardOf 走播放层（playlayer.openPlayer 就地播放，0.9.74 起不再插竖刷队尾）；
// 资料头经 meCardOf（§4.4 getUserCardList）——两处缺省字段都不伪造，缺就不渲染对应块
// （无 auth_key=未登录 → 整块头部不渲染；卡片角标只用契约在册字段）。
// 缓存：资料头模块级缓存（CFG.view.me.cardTtl）——views.js 的**新建** enter 会重建 DOM
// （0.9.74 来源复原路径不重建），不缓存的话每次新建都打一次接口；失败不写缓存（下次重试）。
var meCache = null; // { at, card }

// ---------- 个人资料卡契约（0.9.69；0.9.160 自 data.js 就地收编：唯一消费方随域走） ----------
// getUserCardList 回包 → 我的页头部字段。字段全部来自实测登记端点（docs/api-research.md §4.4：
// headUrl/name/signature/contentCount/following/followed），**缺省一律 null**——渲染层判空隐藏，
// 不伪造未实测的数据。following/followed → 关注/粉丝 的语义待真机核对（站点口径若不同只改
// 这里的映射，渲染层零分支）；uid 过滤失败时退第一条（回包里只有一条时同款）。
// export 仅为单测直采（纯函数，不触 DOM）——消费面仍限本模块
export function meCardOf(j, uid) {
  var users = (j && j.result === 0 && j.users) || [];
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i] && users[i].id) === String(uid)) { u = users[i]; break; }
  }
  u = u || users[0];
  if (!u || !u.id) return null;
  return {
    uid: Number(u.id) || 0,
    name: u.name || '',
    avatar: coverUrl(u.headUrl),
    sign: String(u.signature || '').replace(/<br\s*\/?\s*>/gi, ' ').trim(),
    contrib: u.contentCount != null ? Number(u.contentCount) || 0 : null,
    follow: u.following != null ? Number(u.following) || 0 : null,
    fans: u.followed != null ? Number(u.followed) || 0 : null
  };
}

// ---- 资料头：auth_key 前缀=uid（ui.selfUid，与私信自有会话排除同源）→ getUserCardList ----
// 头部是锦上添花块：任何一步失败都静默（不 toast/不占位/无控制台噪音），页面照常可用
function buildMeCard(slot) {
  var uid = selfUid();
  if (!uid) return;
  if (meCache && Date.now() - meCache.at < CFG.view.me.cardTtl) { render(meCache.card); return; }
  postForm(CFG.api.userCard, 'ids=' + uid).then(function (j) {
    var card = meCardOf(j, uid);
    if (!card) return;
    meCache = { at: Date.now(), card: card };
    if (!slot.isConnected || slot.firstChild) return; // 视图已退出 / 已渲染过：只留缓存
    render(card);
  }, function () { });

  function render(card) {
    var box = el('div', 'acsv-mecard');
    if (card.avatar) {
      imgInto(box, card.avatar, 'avatar', 'acsv-mecard-av');
    } else {
      box.appendChild(el('div', 'acsv-mecard-av')); // 无头像保排版（底色圆）
    }
    var info = el('div', 'acsv-mecard-info');
    info.appendChild(el('div', 'acsv-mecard-name', card.name || ''));
    var stats = el('div', 'acsv-mecard-stats');
    addStat(stats, card.follow, '关注');
    addStat(stats, card.fans, '粉丝');
    addStat(stats, card.contrib, '投稿');
    if (stats.firstChild) info.appendChild(stats);
    info.appendChild(el('div', 'acsv-mecard-id', 'UID：' + card.uid));
    if (card.sign) info.appendChild(el('div', 'acsv-mecard-sign', card.sign));
    box.appendChild(info);
    mountSign(box);
    slot.appendChild(box);
  }
  // 缺省（契约层 null=该字段无来源）不显示 0：避免把「没这个数」说成 0
  function addStat(host, num, label) {
    if (num == null) return;
    var s = el('div', 'acsv-mecard-stat');
    s.appendChild(el('b', '', fmtWan(num)));
    s.appendChild(document.createTextNode(label));
    host.appendChild(s);
  }
}

// ---- 签到按钮（0.9.277，用户裁决：我的页资料头只留一枚按钮，不做签到栏）----
// 三态：签到（红可点）/ 签到中…（禁用防连点）/ 今日已签（灰药丸，可点→实时重拉黄历卡）。
// 初始态以 getSignInInfos 为准（失败静默保持「签到」——点击时服务端仍按真实态回 122）。
// 签到成功：回包带 almanac 直用（App 侧 SinginResult 设计），否则实时 fetchAlmanac；
// 弹窗本身即成功反馈（不另 toast）。黄历拉取失败只 toast，按钮仍进已签态（签到已成立）。
function mountSign(host) {
  var btn = el('button', 'acsv-signbtn go', '签到');
  btn.type = 'button';
  host.appendChild(btn);
  var state = null;   // 最近一次 getSignInInfos 规整结果（奖励行/已签判定）
  var busy = false;

  getSignInInfos().then(function (st) {
    if (!st) return;
    state = st;
    if (st.signedToday) paintSigned();
  }, function () { /* 初始态查询失败：保持「签到」，点击时服务端判定 */ });

  function paintSigned() {
    btn.className = 'acsv-signbtn signed';
    btn.textContent = '今日已签';
  }
  function paintGo() {
    btn.className = 'acsv-signbtn go';
    btn.textContent = '签到';
  }
  function paintBusy() {
    btn.className = 'acsv-signbtn busy';
    btn.textContent = '签到中…';
  }

  // 已签态点击：实时重拉黄历（用户 2026-10-18 裁决：不缓存）
  function reopen() {
    busy = true;
    paintBusy();
    Promise.all([
      getSignInInfos().then(function (st) { state = st; return st; }, function () { return null; }),
      fetchAlmanac()
    ]).then(function (arr) {
      busy = false;
      paintSigned();
      openSignAlmanac(arr[1], { banana: arr[0] ? arr[0].reward : null });
    }, function () {
      busy = false;
      paintSigned();
      errSignAlmanac();
    });
  }

  function doSign() {
    busy = true;
    paintBusy();
    signIn().then(function (r) {
      busy = false;
      paintSigned();
      if (r.almanac) { openSignAlmanac(r.almanac, { banana: r.banana }); return; }
      var banana = r.banana || (state && state.reward) || null;
      fetchAlmanac().then(function (a) {
        openSignAlmanac(a, { banana: banana });
      }, function () {
        errSignAlmanac();
      });
    }, function (e) {
      busy = false;
      paintGo();
      if (e && e.kind === 'notlogin') errSignLogin(); else errSignFail();
    });
  }

  btn.addEventListener('click', function () {
    if (busy) return;
    if (btn.classList.contains('signed')) reopen();
    else if (btn.classList.contains('go')) doSign();
  });
}

// ---- 动态：个人主页动态流（0.9.218）----
// 数据源=feed/profile?userId=<本人>（**三合一混排**：图文动态+视频+文章；docs §10.1 字段级核对），
// 与广场共用列表机械（squarefeed 工厂）与整套行卡/详情/评论管线；差异只在四处注入：
// 取数（profilePageOf——**无 24h 窗口**，个人主页是历史流，套广场窗口会把老动态全砍掉）、
// 空态文案、关发现态轮询、阈值组（CFG.view.moments）。落点走视图内默认（openRowDefault）。
// 面板常驻 DOM、首次激活才建（与历史/收藏同语义）；视图卸载时 stop（见 myTeardown）
var meFeed = null;
var pubFab = null; // 发布浮标（视图级，随视图摘）
function buildMoments(panel, scroller) {
  var uid = selfUid();
  if (!uid) { // 未登录：不弹错（与资料头同口径），给一句可读空态
    panel.appendChild(el('div', 'acsv-vempty', '登录后才能查看自己的动态'));
    return;
  }
  meFeed = createSquareFeed({
    root: panel,
    scrollEl: scroller || panel, // 视图体即滚动容器（元素方言；与广场视图同款）
    backTopHost: panel,
    onOpen: openRowDefault,
    fetchPage: function (pcursor) { return listProfile(uid, pcursor); },
    view: CFG.view.moments,
    emptyText: '你还没有发布过动态',
    poll: false // 自己的动态不需要「发现 N 条新动态」的定时 diff
  });
}

// 视图卸载：停列表机械（清轮询+解绑滚动）——与 squareview 同款处置
function myTeardown() {
  if (meFeed) { meFeed.stop(); meFeed = null; }
  if (pubFab) { pubFab.remove(); pubFab = null; }
}

function buildMyView(body) {
  var wrap = el('div', 'acsv-mewrap');
  body.appendChild(wrap);

  var cardSlot = el('div', 'acsv-mecard-slot');
  wrap.appendChild(cardSlot);
  buildMeCard(cardSlot);

  // Tab：面板常驻 DOM 只切 display——切回不重拉接口，翻页游标与已加载列表都保留；
  // 首次激活才 build（惰性），进入视图默认落「动态」（0.9.218 裁决：动态排第 1）
  var tabRow = el('div', 'acsv-metabs');
  wrap.appendChild(tabRow);
  // 发布入口（0.9.224 用户裁决）：**右下角常驻浮标**（钉在回顶之上），不再占 tab 行
  //（0.9.222 曾在 tab 行右侧放按钮——用户裁决"不要放顶部，放右下角回顶上面、本页常驻"）
  pubFab = mountPubFab(body, { editorOpts: { onDone: function () { if (meFeed) meFeed.refresh(); } } });
  var panelMom = el('div', 'acsv-mepanel');
  var panelHist = el('div', 'acsv-mepanel');
  var panelWait = el('div', 'acsv-mepanel');
  var panelFav = el('div', 'acsv-mepanel');
  var panelGroups = el('div', 'acsv-mepanel');
  panelMom.setAttribute('data-tab', 'moments');
  panelHist.setAttribute('data-tab', 'hist');
  panelWait.setAttribute('data-tab', 'wait');
  panelFav.setAttribute('data-tab', 'fav');
  panelGroups.setAttribute('data-tab', 'groups');
  panelHist.style.display = 'none';
  panelWait.style.display = 'none';
  panelFav.style.display = 'none';
  panelGroups.style.display = 'none';
  wrap.appendChild(panelMom);
  wrap.appendChild(panelHist);
  wrap.appendChild(panelWait);
  wrap.appendChild(panelFav);
  wrap.appendChild(panelGroups);

  // 键序=按钮序（下方 Object.keys 派生）：「动态」写在第一个键 ⇒ 排第 1（0.9.218 用户裁决）。
  // 闸门：harness view-my 的 moments-tab-first——把动态键挪到最后即转红（已反跑验证）
  var panels = {
    moments: { el: panelMom, build: buildMoments, inited: false, name: '动态' },
    hist: { el: panelHist, build: buildHistory, inited: false, name: '观看历史' },
    wait: { el: panelWait, build: buildWatchLater, inited: false, name: '稍后再看' },
    fav: { el: panelFav, build: buildFav, inited: false, name: '收藏夹' },
    groups: { el: panelGroups, build: buildFollowGroups, inited: false, name: '关注分组' }
  };
  Object.keys(panels).forEach(function (id) {
    var b = el('button', 'acsv-metab', panels[id].name);
    b.type = 'button';
    b.setAttribute('data-tab', id);
    b.addEventListener('click', function () { select(id); });
    tabRow.appendChild(b);
  });

  function select(id) {
    Object.keys(panels).forEach(function (k) {
      panels[k].el.style.display = k === id ? '' : 'none';
    });
    Array.prototype.forEach.call(tabRow.children, function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === id);
    });
    var p = panels[id];
    // build 第二参=视图体滚动容器（0.9.218：动态 tab 要它当列表滚动源；其余构建器忽略）
    if (!p.inited) { p.inited = true; p.build(p.el, body); }
  }
  select('moments');
}

// 左栏 dock 元数据随视图声明（0.9.78：sidebar 的条目从注册表派生，不再维护第二份清单）
registerView({
  id: 'my', build: buildMyView,
  teardown: myTeardown, // 0.9.218：动态 tab 起 list 实例，卸载必须 stop（清轮询+解绑滚动）
  dock: {
    label: '我的', order: 30, group: 1, // 0.9.155 用户裁决：与「关注」互换——放左栏最底
    svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
  }
});
