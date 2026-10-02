// ---------- 更新提示（0.9.60：GitHub release 说明弹窗 + 每次打开竖刷页检查新版本） ----------
// 数据源 = 官方 releases.atom（与 @downloadURL 同域——分发通道可达则它可达；无 API 限流）。
// 正文直接用 GitHub 官方渲染 HTML（自家仓库发布物 + GitHub 管线消毒，信任契约与 linkify/
// UBB 产物同级）——不自研 md 渲染（ubb.js 只认 AcFun 方言，md 另起炉灶违背单源原则），
// 与「复用官方形态」路线一致（私信渲染走官方形态、图标只用站点原生资源）。
// 失败一律静默（GitHub 不可达 = 发布通道本身不可达，弹窗无意义），绝不打扰刷视频主流程。
// Esc 语义按 0.9.22 定稿、0.9.61 收口：模态键语义（吞键/Esc 关）统一由 overlay.js 承载，
// 本模块只负责把弹窗注册进浮层栈（modal:true），不赌监听器注册顺序。
// 状态存 localStorage（TM 两 world 共享同步读写，0.9.9 结论；不碰 unsafeWindow）。
// 模块顶层零副作用（message.acfun.cn 也执行 boot 的静态 import 链，顶层碰 DOM/网络会炸原生页）。
import { CFG } from './cfg.js';
import { gmRequest } from './net.js';
import { root } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { el, elHtml, toast } from './ui.js';
import { stat } from './dbg.js';

// ===================================================================
// 纯函数区（导出供单测；任何脏输入不许抛错，只许降级）
// ===================================================================

// 版本归一：剥 v 前缀与 -debug 后缀（debug 构建与正式版互不骚扰）
export function normVer(v) {
  var s = String(v == null ? '' : v).trim();
  if (/^v/i.test(s)) s = s.slice(1);
  var dash = s.indexOf('-');
  if (dash >= 0) s = s.slice(0, dash);
  return s;
}

// 逐段数值比较：字典序会把 0.10.0 判小于 0.9.59（'10'<'9'），必须按段 parseInt
export function cmpVersion(a, b) {
  var A = normVer(a).split('.'), B = normVer(b).split('.');
  for (var i = 0; i < Math.max(A.length, B.length); i++) {
    var x = parseInt(A[i], 10) || 0, y = parseInt(B[i], 10) || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

// XML 层实体解码，还原出可注入的 HTML 串。&amp; 恒最后替（否则 &amp;lt; 会被
// 双重解码穿到 '<'——XML 转义里它就该落回字面 '&lt;' 交给 HTML 层消费）
export function xmlDec(s) {
  return String(s == null ? '' : s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// 解析官方 atom（稳定机器格式，惰性正则抽取；content 内部不会出现字面 </content>
// ——已被 XML 转义，惰性匹配安全）。返回 [{tag,title,html}]，html 解码后即可注入
export function parseRelAtom(text) {
  var out = [];
  var segs = String(text == null ? '' : text).split('<entry>');
  for (var i = 1; i < segs.length; i++) {
    var seg = segs[i];
    var tag = (seg.match(/releases\/tag\/([^<"\s]+)/) || [])[1];
    if (!tag) continue;
    var title = (seg.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
    var content = (seg.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1];
    out.push({ tag: tag, title: xmlDec(title || ''), html: content != null ? xmlDec(content) : '' });
  }
  return out;
}

// 最新版条目：按版本号取最大——atom 按 updated 排序，编辑旧 release 会把它顶到首位，
// 信顺序会把老版本误报成新版本
export function latestEntry(entries) {
  var best = null;
  for (var i = 0; entries && i < entries.length; i++) {
    var e = entries[i];
    if (!e || !normVer(e.tag)) continue;
    if (!best || cmpVersion(e.tag, best.tag) > 0) best = e;
  }
  return best;
}

// 当前版本条目（两侧归一后比较；未发布/装的非发布版返回 undefined）
export function findEntry(entries, ver) {
  for (var i = 0; entries && i < entries.length; i++) {
    if (entries[i] && cmpVersion(entries[i].tag, ver) === 0) return entries[i];
  }
  return undefined;
}

// 决策：'none' 不动 | 'updated' 展示当前版本说明 | 'popup' 新版本弹窗 | 'toast' 轻提醒。
// state 为脏容忍（null/残缺当空）；ignored/notified 都按版本号比对而非引用相等
export function decideUpd(state, curVer, latestVer) {
  var st = state && typeof state === 'object' ? state : {};
  if (latestVer && cmpVersion(latestVer, curVer) > 0) {
    if (st.ignored && cmpVersion(st.ignored, latestVer) === 0) return 'none';
    if (st.notified && cmpVersion(st.notified, latestVer) === 0) return 'toast';
    return 'popup';
  }
  if (!st.seen || cmpVersion(st.seen, curVer) !== 0) return 'updated';
  return 'none';
}

// ===================================================================
// 取数（mock 桩收口在此，api.js 同款惯例）与状态（localStorage）
// ===================================================================

function mockAtom() { return window.__ACSV_MOCK_RELEASE__ || null; }

function fetchAtom() {
  var mock = mockAtom();
  if (mock) return Promise.resolve(String(mock));
  return gmRequest({ url: CFG.api.ghRelAtom, timeout: CFG.time.upd, responseType: 'text', okStatus: true });
}

function curVersion() {
  return normVer(typeof __ACSV_VERSION__ !== 'undefined' ? __ACSV_VERSION__ : '');
}

// localStorage 写失败（隐私模式等）的内存兜底：seen 永不落盘 = 每次打开都弹「已更新」
// （骚扰 bug），故失败页会话内以内存态覆盖合并。仅在写失败时置位、写成功即清——
// 读侧不能无条件信内存（外部写入如场景种状态会被遮蔽，0.9.48「改形状漏消费点」同型教训）
var stateFallback = null;
function readState() {
  var st = null;
  try { st = JSON.parse(localStorage.getItem(CFG.lsUpd) || 'null'); } catch (e) { }
  st = st && typeof st === 'object' ? st : {};
  if (stateFallback) { for (var k in stateFallback) st[k] = stateFallback[k]; }
  return st;
}
function writeState(st) {
  try { localStorage.setItem(CFG.lsUpd, JSON.stringify(st)); stateFallback = null; }
  catch (e) { stateFallback = st; }
}

// ===================================================================
// 弹窗单例（imgview.js 骨架：挂 root、open 先 close、背景点击关；模态键语义在 overlay.js）
// ===================================================================

var modal = null;
var knownLatest = ''; // 本页会话内最近一次解析出的最新版本号（红点判定用）

export function closeReleaseModal() {
  if (!modal) return;
  var m = modal;
  modal = null;
  m.remove();
  overlayClose('release'); // 已出栈（Esc 路径）时空转；显式关闭路径（✕/按钮/背景）由此同步栈
}

// 正文注入：GitHub 渲染 HTML 走 elHtml 唯一通道；链接统一新标签 + 相对链接补全
// ——不做这步，点击正文链接会把竖刷页导航走（丢 #svfeed 路由 = 直接退出）
function buildRich(html) {
  var rich = elHtml('div', 'acsv-upd-md', html);
  Array.prototype.forEach.call(rich.querySelectorAll('a'), function (a) {
    a.target = '_blank';
    a.rel = 'noopener';
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '/') a.setAttribute('href', 'https://github.com' + href);
  });
  return rich;
}

function setModalContent(m, html, noteText) {
  var body = m.querySelector('.acsv-upd-body');
  if (!body) return;
  body.innerHTML = '';
  if (noteText) body.appendChild(el('p', 'acsv-upd-note', noteText));
  else if (html) body.appendChild(buildRich(html));
  else body.appendChild(el('p', 'acsv-upd-note', '该版本未填写更新说明'));
}

function setModalFoot(m, actions) {
  var foot = m.querySelector('.acsv-upd-foot');
  if (!foot) return;
  foot.innerHTML = '';
  Array.prototype.forEach.call(actions || [], function (act) {
    var b = el('button', 'acsv-upd-act' + (act.primary ? ' primary' : ''), act.label);
    b.addEventListener('click', function () {
      closeReleaseModal();
      if (act.fn) act.fn();
    });
    foot.appendChild(b);
  });
}

function openModal(opts) {
  closeReleaseModal();
  if (!root) return null;
  modal = el('div', 'acsv-upd');
  var panel = el('div', 'acsv-upd-panel');
  var head = el('div', 'acsv-upd-head');
  var title = el('div', 'acsv-upd-title');
  title.appendChild(el('span', 'acsv-upd-h1', opts.title));
  if (opts.sub) title.appendChild(el('span', 'acsv-upd-sub', opts.sub));
  head.appendChild(title);
  var x = el('button', 'acsv-upd-x', '✕');
  x.addEventListener('click', closeReleaseModal);
  head.appendChild(x);
  panel.appendChild(head);
  panel.appendChild(el('div', 'acsv-upd-body'));
  panel.appendChild(el('div', 'acsv-upd-foot'));
  modal.appendChild(panel);
  modal.addEventListener('click', function (ev) {
    if (ev.target === modal) closeReleaseModal();
  });
  setModalContent(modal, opts.html, opts.note || (opts.html ? '' : '该版本未填写更新说明'));
  setModalFoot(modal, opts.actions);
  root.appendChild(modal);
  overlayOpen({ id: 'release', modal: true, close: closeReleaseModal });
  return modal;
}

// 红点：有新版本且未忽略时亮；忽略/升级后自灭
function refreshDot() {
  if (!root) return;
  var dot = root.querySelector('.acsv-upd-dot');
  if (!dot) return;
  var st = readState();
  var on = !!knownLatest && cmpVersion(knownLatest, curVersion()) > 0
    && !(st.ignored && cmpVersion(st.ignored, knownLatest) === 0);
  dot.style.display = on ? '' : 'none';
}

// ===================================================================
// 对外入口（player.mount / 顶栏按钮 / player.unmount 消费）
// ===================================================================

// 每次打开竖刷页检查一次（mount 调）。最小间隔防 Esc 频繁进出刷请求（mock 注入时绕过，
// 供场景 remount 确定性复现）
export function releaseCheck() {
  if (!mockAtom()) {
    var st = readState();
    var now = Date.now();
    if (st.lastCheck && now - st.lastCheck < CFG.time.updGap) return;
    st.lastCheck = now;
    writeState(st);
  }
  stat('upd.check');
  fetchAtom().then(function (text) {
    var entries = parseRelAtom(text);
    var latest = latestEntry(entries);
    if (!latest) return;
    knownLatest = normVer(latest.tag);
    var curVer = curVersion();
    var act = decideUpd(readState(), curVer, knownLatest);
    if (act === 'none') { refreshDot(); return; }
    if (act === 'toast') {
      refreshDot();
      toast('发现新版本 v' + knownLatest + '，顶栏「更新」可查看说明');
      return;
    }
    // fetch 期间用户已退出竖刷（root 拆除）：丢弃本次结果且不写 seen/notified——
    // 弹窗没展示过不能记「已看」，否则下次打开被永久吞掉
    if (!root) return;
    if (act === 'popup') {
      var st2 = readState();
      st2.notified = knownLatest;
      writeState(st2);
      refreshDot();
      openModal({
        title: '发现新版本 v' + knownLatest,
        sub: '当前 v' + curVer,
        html: latest.html,
        actions: [
          { label: '前往更新', primary: true, fn: function () { window.open(CFG.api.releasePage, '_blank'); } },
          { label: '忽略此版本', fn: function () {
            var s3 = readState();
            s3.ignored = knownLatest;
            writeState(s3);
            refreshDot();
          } }
        ]
      });
    } else { // updated
      var cur = findEntry(entries, curVer);
      var s4 = readState();
      s4.seen = curVer;
      writeState(s4);
      if (!cur) return; // 装的非发布版/发布遗漏：静默记 seen，不弹空壳
      openModal({
        title: 'v' + curVer + ' 更新内容',
        sub: cur.title && cur.title !== curVer ? cur.title : '',
        html: cur.html,
        actions: [{ label: '知道了', primary: true }]
      });
    }
  }, function () {
    // 失败静默：仅埋点 + console 留痕（TM 首次请求 github.com 可能弹授权，没点允许
    // 就会一直走到这里——acsv-stats 的 upd.check/upd.err 可自诊）
    stat('upd.err');
    console.info('[acsv-upd] 检查失败（GitHub 不可达或未授权），本次跳过');
  });
}

// 顶栏「更新」按钮：当场拉最新说明（用户显式点击，不受检查间隔约束）
export function openReleaseNotes() {
  if (!root) return;
  var m = openModal({ title: '更新说明', note: '正在获取更新说明…' });
  stat('upd.check');
  fetchAtom().then(function (text) {
    if (modal !== m) return; // 等待期间用户已关闭
    var latest = latestEntry(parseRelAtom(text));
    if (!latest) return setModalContent(m, '', '没有获取到 release 信息');
    knownLatest = normVer(latest.tag);
    refreshDot();
    var newer = cmpVersion(knownLatest, curVersion()) > 0;
    var actions = [];
    if (newer) {
      actions.push({ label: '前往更新', primary: true, fn: function () { window.open(CFG.api.releasePage, '_blank'); } });
      actions.push({ label: '忽略此版本', fn: function () {
        var s = readState();
        s.ignored = knownLatest;
        writeState(s);
        refreshDot();
      } });
    }
    actions.push({ label: '关闭' });
    setModalContent(m, latest.html);
    setModalFoot(m, actions);
  }, function () {
    stat('upd.err');
    if (modal !== m) return;
    setModalContent(m, '', '获取失败（网络不可达或未授权），稍后重试');
  });
}

// 竖刷页拆除（player.unmount 调）：弹窗单例绝不过夜——root 已拆而闭包/监听残留
// 会吞掉普通站页的全局键盘（0.9.22 Esc 教训的另一半：显式拆，不赌事件顺序）。
// 栈成员身份由 overlayTeardown 统一兜底，这里只管把自家单例拆掉
export function teardownRelease() {
  closeReleaseModal();
}
