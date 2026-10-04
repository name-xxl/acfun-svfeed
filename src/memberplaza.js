// ---------- 原生 /member 页「动态广场」入口 + 内嵌广场（0.9.128） ----------
// 复刻 plaza navigation.js 的原生页形态：成员导航注入「动态广场」项 + /member/feeds 推广条，
// 点击**就地展开**（原生页导航/头部保留、浅色皮肤）——不跳 svfeed 全屏壳（用户裁决）。
// 这是对 0.9.47「其他页不注入」决策的**限定反转**：只有 /member 路径参与，其余页面维持不注入。
// auto_enter 沿用 plaza 语义：非 feeds 成员页点击 → GM 旗标 + 跳 /member/feeds 落地自动展开。
// 列表机械走 squarefeed 单源（与 dock 广场页同一份代码、两种宿主/两种皮肤）；并存保险=旧
// plaza 脚本已注入（.plaza-nav-item/.plaza-promotion）时跳过，不双入口。
import { CFG } from './cfg.js';
import { el, ensureStyle } from './ui.js';
import { testHook } from './dbg.js';
import { createSquareFeed } from './squarefeed.js';
import { closeInlineComments } from './rowkit.js';

var SEL_MAIN_FEEDS = '.ac-member-main .ac-member-feeds'; // plaza 原选择器（真机验证在册）
var AUTO_KEY = 'acsvMpAutoEnter'; // plaza moment_plaza_auto_enter 同款语义（键名换 svfeed 域）

var itemEl = null;     // 注入的导航项
var promoEl = null;    // 推广条
var mpRoot = null;     // 内嵌根（展开态；null=未展开）
var feed = null;       // squarefeed 实例
var hiddenNative = []; // 展开时隐藏的原生子节点 [{el, display}]（收回即复原）
var timer = null, tries = 0, pendingOpen = false;
var memAuto = false;   // 无 GM（harness/降级）时的内存旗标

function memberPath() { return /^\/member(\/|$)/.test(location.pathname); }
function feedsPath() { return /^\/member\/feeds(\/|$)/.test(location.pathname); }
function hostEl() { return document.querySelector(SEL_MAIN_FEEDS); }
function noop() { }

function autoFlag() {
  try { if (typeof GM_getValue === 'function') return !!GM_getValue(AUTO_KEY, false); } catch (e) { }
  return memAuto;
}
function setAutoFlag(v) {
  memAuto = v;
  try { if (typeof GM_setValue === 'function') GM_setValue(AUTO_KEY, v); } catch (e) { }
}

// 行右上 am 号锚（plaza 原物）：宿主侧后处理——rowkit 行卡本体不动，仅内嵌宿主消费
function addAmAnchor(row, pi) {
  if (!pi || pi.ct !== 'moment' || !pi.momentId) return;
  var a = el('a', 'acsv-mp-am', 'am' + pi.momentId);
  a.href = CFG.api.momentBase + pi.momentId;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'am' + pi.momentId;
  row.appendChild(a);
}

// ---------- 就地展开/收回 ----------
function openPlaza() {
  if (mpRoot) return true;
  var box = hostEl();
  if (!box) return false; // 宿主未就绪：调用方转轮询补开
  ensureStyle(); // 幂等（boot 已调无妨）
  mpRoot = el('div', 'acsv-mp');
  hiddenNative = [];
  [].forEach.call(box.children, function (n) {
    hiddenNative.push([n, n.style.display]);
    n.style.display = 'none';
  });
  box.appendChild(mpRoot);
  feed = createSquareFeed({
    root: mpRoot,
    scrollEl: window,   // 原生页整页滚动（plaza controller 同款 window 滚动语义）
    backTopHost: mpRoot,
    onOpen: noop,       // 原页语义（plaza 行点击无动作）：不穿越深色详情面板；互动/评论/配图照常
    onRow: addAmAnchor
  });
  if (itemEl) itemEl.classList.add('acsv-mnav-active');
  if (promoEl) promoEl.style.display = 'none';
  return true;
}

function closePlaza() {
  if (!mpRoot) return;
  var root = mpRoot;
  mpRoot = null;
  if (feed) { feed.stop(); feed = null; }
  closeInlineComments();
  root.remove();
  hiddenNative.forEach(function (p) { p[0].style.display = p[1]; });
  hiddenNative = [];
  if (itemEl) itemEl.classList.remove('acsv-mnav-active');
  if (promoEl) promoEl.style.display = '';
}

function refreshPlaza() { if (feed) feed.refresh(); }

function onEntry() {
  if (!feedsPath()) { // 非 feeds 成员页：plaza auto_enter 语义（旗标 + 跳转，落地自动展开）
    setAutoFlag(true);
    location.href = '/member/feeds';
    return;
  }
  if (mpRoot) { refreshPlaza(); return; } // 已展开再点=刷新（plaza refreshPlaza 语义）
  if (!openPlaza()) { pendingOpen = true; startTimer(); }
}

// ---------- 入口注入（plaza navigation.js 逐行复刻） ----------
function tryInjectNav() {
  // 防重：自有哨兵；并存期保险=旧 plaza 脚本已注入时让位（不双入口）
  if (document.querySelector('[data-acsv-mnav]') || document.querySelector('.plaza-nav-item')) return true;
  var feedsNav = document.querySelector('.sub-nav-title a[href="/member/feeds"]')
    || document.querySelector('a[href="/member/feeds"]')
    || document.querySelector('.ac-member-navigation a[href*="/feeds"]');
  if (!feedsNav) return false;
  var link = feedsNav.tagName === 'A' ? feedsNav : feedsNav.querySelector('a[href="/member/feeds"]');
  itemEl = el('a', 'ac-member-navigation-item ac-member-navigation-sub-item acsv-mnav-item', '动态广场');
  itemEl.href = '#';
  itemEl.setAttribute('data-acsv-mnav', '1');
  itemEl.addEventListener('click', function (ev) { ev.preventDefault(); onEntry(); });
  var group = feedsNav.closest('.member-sub-nav');
  if (group) {
    var fans = group.querySelector('a[href="/member/feeds/fans"]');
    if (fans) fans.parentNode.insertBefore(itemEl, fans.nextSibling);
    else group.appendChild(itemEl);
  } else {
    var at = link || feedsNav;
    at.parentNode.insertBefore(itemEl, at.nextSibling);
  }
  // 展开期间点原生「动态」= 收回（不 reload——原生 DOM 从未被破坏，此处比 plaza 原版优）
  if (link) link.addEventListener('click', function (ev) { if (mpRoot) { ev.preventDefault(); closePlaza(); } });
  return true;
}

// ---------- /member/feeds 推广条（plaza addPlazaPromotion 的逐样式复刻） ----------
function tryBanner() {
  if (!feedsPath()) return true; // 仅 feeds 页（原版语义）
  if (document.querySelector('[data-acsv-mpromo]') || document.querySelector('.plaza-promotion')) return true;
  var header = document.querySelector('.ac-member-feeds-header');
  if (!header) return false;
  promoEl = document.createElement('div');
  promoEl.setAttribute('data-acsv-mpromo', '1');
  promoEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;'
    + 'background:#f5f5f5;margin:0 16px 16px;border-radius:4px;font-size:14px;color:#666';
  var txt = document.createElement('span');
  txt.textContent = '按am号查找动态，试试';
  var strong = document.createElement('strong');
  strong.style.color = '#ff4b76';
  strong.textContent = '动态广场';
  txt.appendChild(strong);
  var btn = document.createElement('button');
  btn.style.cssText = 'background:#ff4b76;color:#fff;border:none;padding:4px 16px;border-radius:4px;cursor:pointer';
  btn.textContent = '进入';
  btn.addEventListener('click', function () { onEntry(); });
  promoEl.appendChild(txt);
  promoEl.appendChild(btn);
  if (mpRoot) promoEl.style.display = 'none';
  header.parentNode.insertBefore(promoEl, header.nextSibling);
  return true;
}

// ---------- auto_enter（plaza setupFeedsPage 的旗标分支） ----------
function tryAutoEnter() {
  if (!autoFlag()) return true;
  if (!feedsPath()) return true; // 旗标留着，等落地 feeds 页再消费
  if (openPlaza()) { setAutoFlag(false); return true; }
  return false; // 宿主未就绪：继续轮询
}

// ---------- 轮询驱动（三件共用一拍：注入/推广条/自动展开） ----------
function attempt() {
  var navOk = tryInjectNav();
  var bannerOk = tryBanner();
  var autoOk = tryAutoEnter();
  if (pendingOpen && openPlaza()) pendingOpen = false;
  return navOk && bannerOk && autoOk && !pendingOpen;
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
function startTimer() {
  if (timer) return;
  tries = 0;
  timer = setInterval(function () {
    if (attempt() || ++tries >= CFG.nav.tries) stopTimer();
  }, CFG.nav.retryMs);
}

// boot 入口（仅 /member 路径调用；各件自身再按路径门控）
export function watchMemberNav() {
  if (!memberPath()) return; // 0.9.47 决策的限定反转：只有个人中心路径参与注入
  // 无壳环境（root=body）toast 元素自备：竖刷 toast 由 player.mount 建，这里是原生页
  if (!document.querySelector('.acsv-toast')) document.body.appendChild(el('div', 'acsv-toast'));
  if (attempt()) return; // 首拍即成（同步渲染的页面不走轮询）
  startTimer();
}

// debug 构建测试钩子（harness 直驱一次注入/开合；真实轮询 500ms×20 场景等得起，这组供确定性路径）
testHook('memberMp', function () {
  return {
    attempt: attempt,
    open: openPlaza,
    close: closePlaza,
    state: function () {
      return {
        nav: !!document.querySelector('[data-acsv-mnav]'),
        promo: !!document.querySelector('[data-acsv-mpromo]'),
        open: !!mpRoot
      };
    },
    poll: function () {
      if (!feed) return null;
      feed.probe.run();
      return { latest: feed.probe.latest() };
    }
  };
});
