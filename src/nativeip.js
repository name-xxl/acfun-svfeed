// @ts-check
// ---------- 原生页评论 IP + 设备（0.9.248，Web-IP 吸收 6a；路线图 Phase 6 · 任务卡 6.1） ----------
// 覆盖面（2026-10-15 真机逐面实测，docs/api-research.md §13）：评论区＝**两种显示模式**——
// 「默认模式」＝`[data-commentid]` 统一组件（视频 /v/、文章 /a/、动态详情 /moment/ 三面同款，
// 楼中楼子评论同带 `sec` 类）；「**盖楼模式**」＝用户可切换（评论区切换器 → 浏览器偏好键
// `ac_usp_commMode`：1=默认 / 2=盖楼），根＝`.main-comment-item`（精确类），楼层块＝
// `.fc-comment-item`（嵌在根的引用区，自带 footer），uid 在 `a.name[data-uid]`（无 data-userid），
// 回包走 `/comment/listByFloor`（顶层 `commentsMap`+`commentIds`，非 rootComments）。
// 专属挂点＝用户主页 /u/ 的 `#ac-space-info[data-uid]` 与个人中心 /member 动态条目的
// `.feed-time`（6b 批，closest 两跳爬链真机核过在册）。
//
// 与 Web-IP v5.8.5 的关系（吸收口径，每条差异有意为之）：
//  - 拦截层（fetch/XHR hook → commentId→userId 映射，**路径变清表**）+ DOM 兜底链
//    （a[data-userid] → a.name[data-uid] → /u/ 链接 → 头像 src）逐件 port；**只挂原生页**
//    （boot 的 video/article/member/个人中心分支），竖刷壳不吃
//  - 可见优先注入：IO 观察评论元素（rootMargin 200px、root=视口、入视口即 unobserve）→ uid →
//    `iploc.resolveFor`（查询/缓存/负缓存单源复用）→ 追加 span 到 `.area-comment-from`
//    （回退 `.comment-item-footer-left`）——浅色原生皮肤（NATIVE_IP_CSS），tooltip 文案与抽屉
//    同源（iploc.tagTitle）
//  - **修正 port（roadmap 6.1 在册）**：Web-IP 的 IO 回调**先 unobserve 再处理**、uid 提取失败
//    即**永久漏处理**；我们失败**不卸放弃**——卸观察后有界重观察重试（IO 只报状态变化，重新
//    observe 才会对仍在视口内的目标再触发；600ms 一拍、至多 8 拍）。今日三面 DOM 均自带
//    data-userid（§13），此路径是映射竞态窗口的保险丝
//  - 重画补注：MutationObserver 防抖 300ms 重扫——新节点挂观察；已见未注入且**缓存已有值** →
//    原地补注入（原脚本 injectFromCache 同义；只读缓存不再查询——屏外不打扰是本仓视口语义底线）
//  - SPA 路由：pushState/replaceState 包装 + popstate；路径变清映射（跨页无效且会无限累积；
//    同页 replaceState 改查询参数不算换页——Web-IP v5.8.1 修正同款）
//  - 设备美化：评论里 `.deviceModel` 锚 → `devname.devTag`（单源复用：四级查表/点击切换/手动
//    记忆）；已替换态跳过、手动态尊重——站点原地重渲染把文本改回代号时会重替换（Web-IP 同款）
//  - 盖楼模式（0.9.251 补配，用户质疑「盖楼模式没适配吗」后真机核实）：根 `.main-comment-item`
//    （精确类）+ 楼层块 `.fc-comment-item` 入 commentRoot（默认模式根是 `main-comment-item-<id>`
//    变体类，不重叠）；uid 走 `a.name[data-uid]`（无 data-userid）；回包 `/comment/listByFloor`
//    （顶层 commentsMap/commentIds）入拦截层；注入点 `.comment-item-footer-left`＋间距 8px
//    （NATIVE_IP_CSS，照 Web-IP floorMode）。**§13「盖楼零命中」系默认模式页面的单面读数——更正**
//  - 不 port：m 站（D2）、油猴菜单（D3）
import { resolveFor, peek, tagTitle } from './iploc.js';
import { devTag } from './devname.js';
import { stat, testHook } from './dbg.js';
import { NATIVE_IP_CSS } from './styles.js';
import { mountNatPanel } from './natpanel.js'; // 原生页设置面板（0.9.250，6c）：标签点击入口

// ---------- 选择器与阈值（照 Web-IP CONFIG.OBSERVER/注释；站点改版只改这里） ----------
var COMMENT_URL_PATTERNS = ['/comment/list', '/comment/sublist', '/comment/subComment', '/comment/reply',
  '/comment/listByFloor']; // 0.9.251：盖楼模式回包端点（Web-IP 未含，其盖楼映射全靠 DOM 兜底）
var SEL = {
  // 0.9.251（盖楼模式适配）：默认模式根 [data-commentid] + 盖楼根/楼层块精确类（默认模式根是
  // `main-comment-item-<id>` 变体类，与 `.main-comment-item` 不重叠，无重复扫描）
  commentRoot: '[data-commentid], .main-comment-item, .fc-comment-item',
  from: '.area-comment-from',
  fromFallback: '.comment-item-footer-left', // 盖楼模式注入点（实测命中；默认模式为老布局保险）
  userAttr: 'a[data-userid]',
  nameAttr: 'a.name[data-uid]', // 盖楼模式 uid 正主（实测 data-uid，无 data-userid）
  profileLink: 'a[href*="/u/"]',
  avatar: 'img.avatar',
  avatarUidRe: /newUpload\/(\d+)_/,
  floorAvatar: 'img.fc-avatar',
  floorAvatarUidRe: /\/u\/(\d+)/,
  deviceModel: '.deviceModel' // 盖楼模式设备锚同款（实测：fc-device 包裹层内 <a.deviceModel>）
};
var OBS = { rootMargin: '200px', domDebounceMs: 300, urlChangeDelayMs: 500 };
var NIP = 'acsv-nip';
var DEV_MANUAL = 'data-acsv-dev-manual';

// ---------- 纯函数（单测直采；Web-IP 24 项等值迁移，test/unit/nativeip.test.js） ----------

export function isCommentUrl(url) {
  var u = String(url || '');
  for (var i = 0; i < COMMENT_URL_PATTERNS.length; i++) {
    if (u.indexOf(COMMENT_URL_PATTERNS[i]) !== -1) return true;
  }
  return false;
}

// 回包 → 评论数组（default 模式 rootComments + subComments|comments 兜底；非数组容错——Web-IP
// 直吃字段，形状意外时 .concat 抛错被其 catch 吞掉，本仓改显式容错。0.9.251 增盖楼分支：
// listByFloor 回包顶层是 commentsMap（cid→comment）+ commentIds，**不是** rootComments）
export function extractCommentList(data) {
  var roots = data && Array.isArray(data.rootComments) ? data.rootComments : [];
  var subs = data && Array.isArray(data.subComments) ? data.subComments
    : (data && Array.isArray(data.comments) ? data.comments : []);
  var list = roots.concat(subs);
  if (list.length) return list;
  var out = [];
  if (data && data.commentsMap && typeof data.commentsMap === 'object') {
    for (var k in data.commentsMap) {
      var v = data.commentsMap[k];
      if (v && typeof v === 'object') out.push(v);
    }
  }
  return out;
}

// href → uid（/u/ 与 /live/ 双空间，Web-IP parseUidFromHref 同款）
export function parseUidFromHref(href) {
  if (!href) return null;
  var m = String(href).match(/\/u\/(\d+)/) || String(href).match(/\/live\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// uid 提取（DOM 兜底链，顺序照 Web-IP extractUidFromComment）：data-userid → a.name[data-uid] →
// /u/ 链接 → 头像 src 模式。今日三面 DOM 首项即命中（§13），后三档是改版保险
export function extractUidFromComment(el) {
  var link = el.querySelector(SEL.userAttr);
  if (link && link.dataset && link.dataset.userid) return parseInt(link.dataset.userid, 10);
  var nlink = el.querySelector(SEL.nameAttr);
  if (nlink && nlink.dataset && nlink.dataset.uid) return parseInt(nlink.dataset.uid, 10);
  var prof = el.querySelector(SEL.profileLink);
  var uid = parseUidFromHref(prof && prof.href);
  if (uid) return uid;
  var av = el.querySelector(SEL.avatar);
  var m = av && av.src ? String(av.src).match(SEL.avatarUidRe) : null;
  if (m) return parseInt(m[1], 10);
  var fav = el.querySelector(SEL.floorAvatar);
  var m2 = fav && fav.src ? String(fav.src).match(SEL.floorAvatarUidRe) : null;
  return m2 ? parseInt(m2[1], 10) : null;
}

// ---------- 拦截层（原生页专有；评论接口回包 → commentId→userId 映射） ----------
var commentUserMap = new Map();

function onComments(list) {
  if (!list.length) return;
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    // commentId 为主名；盖楼模式对象沿用 cid（0.9.251，与 DOM 的 data-cid 对齐）
    var id = c && c.commentId != null ? c.commentId : (c ? c.cid : null);
    if (id != null && c.userId) commentUserMap.set(String(id), c.userId);
  }
  stat('nip.map');
}

function hookFetch() {
  if (typeof window.fetch !== 'function') return;
  var originalFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    var self = this;
    // 必须 await 拿到 Response 再 clone：clone 直接调在 Promise 上会抛 TypeError、拦截静默失效
    //（Web-IP v5.8.4 真机教训在册——此处用 promise.then 等价表达）
    return originalFetch.apply(self, args).then(function (response) {
      try {
        var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (isCommentUrl(url)) {
          response.clone().json().then(function (data) {
            onComments(extractCommentList(data));
          }).catch(function () { });
        }
      } catch (e) { /* 拦截异常绝不影响原 fetch 语义 */ }
      return response;
    });
  };
}

function hookXHR() {
  var proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if (!proto) return;
  var originalOpen = proto.open;
  var originalSend = proto.send;
  proto.open = function (method, url) {
    /** @type {any} */ (this)._acsvNipUrl = url;
    return originalOpen.apply(this, arguments);
  };
  proto.send = function () {
    var self = /** @type {any} */ (this);
    this.addEventListener('load', function () {
      try {
        if (isCommentUrl(self._acsvNipUrl || '')) {
          onComments(extractCommentList(JSON.parse(self.responseText)));
        }
      } catch (e) { }
    });
    return originalSend.apply(this, arguments);
  };
}

// ---------- 可见优先注入 ----------
var viewIO = null;

function uidOf(el) {
  var cid = el.getAttribute('data-commentid') || el.getAttribute('data-cid');
  var uid = cid != null ? commentUserMap.get(String(cid)) : null;
  return uid || extractUidFromComment(el);
}

function injectIntoComment(el, ip, t, uid) {
  if (!ip || el.querySelector('.' + NIP)) return;
  var from = el.querySelector(SEL.from) || el.querySelector(SEL.fromFallback);
  if (!from) return;
  var s = document.createElement('span');
  s.className = NIP;
  s.dataset.acsvUid = String(uid); // 点击入口（natpanel 捕获阶段委托读它）
  s.textContent = ip; // 原文直显（省级短名，§12.1）
  s.title = tagTitle(ip, t); // tooltip 文案与抽屉单源
  from.appendChild(s);
  stat('nip.inject');
}

// 进视口：uid 就绪 → 卸观察 + 解析注入；未就绪 → 有界重观察重试（修正 Web-IP 的永久漏处理）
function handleVisible(el) {
  if (el.querySelector('.' + NIP)) { viewIO.unobserve(el); return; }
  var uid = uidOf(el);
  if (!uid) {
    var tries = (el._acsvNipTries || 0) + 1;
    el._acsvNipTries = tries;
    viewIO.unobserve(el);
    if (tries <= 8) {
      setTimeout(function () {
        if (viewIO && el.isConnected && !el.querySelector('.' + NIP)) viewIO.observe(el);
      }, 600);
    } else {
      stat('nip.nouid');
    }
    return;
  }
  viewIO.unobserve(el);
  resolveFor(uid, function (ip, t) {
    if (el.isConnected) injectIntoComment(el, ip, t, uid);
  });
}

// ---------- 设备美化（原生页 .deviceModel 锚；devname.devTag 单源） ----------

function processDevices() {
  var els = document.querySelectorAll(SEL.deviceModel);
  for (var i = 0; i < els.length; i++) {
    var el = /** @type {any} */ (els[i]); // 自定义 dataset 键 _acsvFriendly 等不在 Element 契约面（cast 过 tsc）
    if (el.hasAttribute(DEV_MANUAL)) continue; // 用户手动切过：尊重（Web-IP manualAttr 同义）
    var text = (el.textContent || '').trim();
    if (!text) continue;
    if (el.dataset.acsvFriendly && text === el.dataset.acsvFriendly) continue; // 已是替换态
    devTag(el, text); // 命中映射才替换 + 挂点击切换（miss 保持原文）
  }
}

// ---------- 专属挂点（6b）：用户主页 /u/ 与个人中心 /member 动态条目 ----------

// 用户主页资料卡「IP属地：x」（Web-IP injectProfileIp 同款：文案带前缀、class common-info 复用
// 站内相对定位与私信/举报/分享同一水平线、12px/#999/margin-left 16 内联）
function injectProfileIp() {
  if (!/^\/u\/\d+/.test(location.pathname)) return;
  var info = document.querySelector('#ac-space-info[data-uid]');
  if (!info || info.querySelector('.' + NIP)) return;
  var uid = info.getAttribute('data-uid');
  if (!uid) return;
  resolveFor(uid, function (ip, t) {
    if (info.querySelector('.' + NIP)) return;
    var top = info.querySelector('.top');
    if (!top) return;
    var s = document.createElement('span');
    s.className = NIP + ' common-info';
    s.dataset.acsvUid = String(uid);
    s.style.cssText = 'font-size:12px;color:#999;margin-left:16px;';
    s.textContent = 'IP属地：' + ip;
    s.title = tagTitle(ip, t);
    top.appendChild(s);
    stat('nip.profile');
  });
}

// 个人中心动态条目：UP 的 IP 追加进 `.feed-time` 内（Web-IP injectUpIp 同款）
function injectUpFor(timeEl, uid) {
  resolveFor(uid, function (ip, t) {
    if (!timeEl.isConnected) return;
    if (timeEl.parentNode && timeEl.parentNode.querySelector('.' + NIP)) return;
    var s = document.createElement('span');
    s.className = NIP;
    s.dataset.acsvUid = String(uid);
    s.textContent = ip;
    s.title = tagTitle(ip, t);
    timeEl.appendChild(s);
    stat('nip.up');
  });
}

function injectUpIp() {
  if (!/^\/member(\/|$)/.test(location.pathname)) return;
  var times = document.querySelectorAll('.feed-time');
  for (var i = 0; i < times.length; i++) {
    var timeEl = /** @type {any} */ (times[i]); // _acsvNipUp 背引用不在 Element 契约面
    if (timeEl._acsvNipUp) continue;
    if (timeEl.parentNode && timeEl.parentNode.querySelector('.' + NIP)) continue;
    // closest 两跳取条目（真机链：.feed-time → .feed-up-info → .feed-up → ……，§13 核过在案）
    var info = timeEl.closest('.feed-up-info');
    var up = info && info.closest('.feed-up');
    var upLink = up && up.querySelector('a[href*="/u/"], a[href*="/live/"]');
    var uid = parseUidFromHref(upLink && upLink.getAttribute('href'));
    if (!uid) continue; // uid 未渲染出来时不标记，留待下次 DOM 变化重试（Web-IP 同款）
    timeEl._acsvNipUp = true;
    injectUpFor(timeEl, uid); // 按节点传参（不在循环里写共享闭包——广场 0.9.230 教训在案）
  }
}

// ---------- 重扫（DOM 变化防抖） ----------

function retrySeen(el) {
  // 已见未注入：缓存有值就地补（Web-IP injectFromCache 同义；**只读缓存不再查询**——视口语义
  // 归 IO，屏外的不打扰）
  if (el.querySelector('.' + NIP)) return;
  var uid = uidOf(el);
  if (!uid) return;
  var hit = peek(uid);
  if (hit) injectIntoComment(el, hit.ip, hit.t, uid);
}

function scanComments() {
  var els = document.querySelectorAll(SEL.commentRoot);
  for (var i = 0; i < els.length; i++) {
    var el = /** @type {any} */ (els[i]); // _acsvNipSeen 背引用（同 commentkit _c/_n 体例）
    if (el.querySelector('.' + NIP)) continue;
    if (el._acsvNipSeen) { retrySeen(el); continue; }
    el._acsvNipSeen = true;
    if (viewIO) viewIO.observe(el);
  }
  processDevices();
}

function onDomChange() {
  scanComments();
  injectProfileIp(); // 6b：用户主页资料卡
  injectUpIp();      // 6b：个人中心 /member 动态条目
}

// ---------- SPA 路由 ----------
var lastUrl = '';
var lastPath = '';

function checkUrl() {
  if (location.href === lastUrl) return;
  lastUrl = location.href;
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    commentUserMap.clear(); // 路径变了：旧页映射对新页无效且会无限累积（同页换参不清——Web-IP 同款）
  }
  setTimeout(onDomChange, OBS.urlChangeDelayMs);
}

function wrapHistory() {
  var ps = history.pushState;
  var rs = history.replaceState;
  history.pushState = function () {
    var r = ps.apply(this, arguments);
    checkUrl();
    return r;
  };
  history.replaceState = function () {
    var r = rs.apply(this, arguments);
    checkUrl();
    return r;
  };
  window.addEventListener('popstate', checkUrl);
}

// ---------- 挂载（boot 原生页分支调用；幂等） ----------
var mounted = false;

export function mountNativeIp() {
  if (mounted) return;
  mounted = true;
  stat('nip.mount');
  var st = document.createElement('style');
  st.id = 'acsv-nip-css';
  st.textContent = NATIVE_IP_CSS;
  (document.head || document.documentElement).appendChild(st);
  hookFetch();
  hookXHR();
  mountNatPanel(); // 面板事件接线（标签点击 → 原生皮肤面板；6c）
  if (typeof IntersectionObserver === 'function') {
    viewIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) handleVisible(entries[i].target);
      }
    }, { rootMargin: OBS.rootMargin });
  }
  var pending = null;
  var mo = new MutationObserver(function () {
    if (pending) clearTimeout(pending);
    pending = setTimeout(onDomChange, OBS.domDebounceMs);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  wrapHistory();
  checkUrl();    // 记初值（免得首扫把初始页面错当"路径变化"）
  onDomChange(); // 首扫（SSR 已就位的评论与后到的一视同仁）
}

testHook('nativeip', function () {
  return { map: commentUserMap.size, mounted: mounted };
});
