import { el, elHtml } from './ui.js';

// ---------- 空间页内容标签栏注入件（0.9.218，自 uppage 抽出单源） ----------
// 背景：UP 空间页（/u/<uid>）的内容标签栏（视频/文章/合辑）是**站点原生**结构，脚本往其后追加
// 自建标签（0.9.36 起 uppage 的「小视频」；0.9.218 的「动态」）。两个自建标签共存需要一套
// **共享**的切换/互斥/排序逻辑——各自实现就是「两份看着一样」的代码，单源收口不允许。
//
// 本件负责四件事：
//   ① 标签卡 `li[data-index=<index>]` + 兄弟位一个 `.tag-content` 面板（与站点面板同组，靠
//      `.active` 类切换，`<cl> > .tag-content` 是站点的面板选择器）；
//   ② **确定性插入位**：一律排在原生三标签之后、按 `order` 升序（与两个模块谁先注入无关——
//      否则标签顺序会随注入时序漂移）；
//   ③ 点击=手动切换：`stopPropagation` 阻断站点委托（未知 data-index 可能引发站点代码异常）、
//      同步 `li.active` / `panel.active`、隐藏站点排序控件（`#ac-space-contribute-sort`，它
//      只对原生三标签生效）；
//   ④ 点原生标签时恢复排序控件显形（挂在 `tagsUl` 上，按 `data-acsv-order` 标识跳过自建标签；
//      多标签只挂一次，靠 `data-acsv-sortrestore` 幂等标记）。
//
// 依赖极薄（只用 ui.el/elHtml），无反向边。返回 `{ li, panel }`；宿主未就绪/已注入过 → null。
export function mountSpaceTab(opts) {
  var cl = opts.cl;
  var tagsUl = opts.tagsUl;
  var index = String(opts.index || '');
  if (!cl || !tagsUl || !index) return null;
  if (tagsUl.querySelector('li[data-index="' + index + '"]')) return null; // 幂等：已注入

  var order = Number(opts.order) || 0;
  var li = opts.html ? elHtml('li', null, opts.html) : el('li', null, opts.label || '');
  li.dataset.index = index;        // 站点语义（切面板/样式都认它）
  li.dataset.acsvOrder = String(order); // 自建标签标识 + 排序键
  li.title = opts.title || '';

  var panel = el('div', 'tag-content');
  panel.dataset.acsvTab = index; // 面板标识（与站点自有的 .tag-content 区分，幂等/断言都认它）
  if (opts.buildPanel) opts.buildPanel(panel);

  li.addEventListener('click', function (ev) {
    ev.stopPropagation(); // 阻断站点委托（见头注③）
    var siteSort = siteSortLi();
    if (siteSort) siteSort.style.display = 'none';
    var i, lis = tagsUl.children;
    for (i = 0; i < lis.length; i++) lis[i].classList.remove('active');
    li.classList.add('active');
    var panels = cl.querySelectorAll(':scope > .tag-content');
    for (i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    panel.classList.add('active');
    if (opts.onShow) opts.onShow(panel); // 首次显形（调用方可据此惰性建列表，避免白拉一次接口）
  });

  // ② 确定性插入位（见头注②）
  var anchorLi = tagsUl.querySelector('li[data-index="album"]');
  var ours = [].slice.call(tagsUl.querySelectorAll('li[data-acsv-order]'));
  var next = null;
  for (var i = 0; i < ours.length; i++) {
    if (Number(ours[i].dataset.acsvOrder) > order) { next = ours[i]; break; }
  }
  if (next) next.insertAdjacentElement('beforebegin', li);
  else if (ours.length) ours[ours.length - 1].insertAdjacentElement('afterend', li);
  else if (anchorLi) anchorLi.insertAdjacentElement('afterend', li);
  else tagsUl.appendChild(li);
  cl.appendChild(panel);

  armSortRestore(tagsUl);
  return { li: li, panel: panel };

  function siteSortLi() {
    var sp = tagsUl.querySelector('#ac-space-contribute-sort');
    return sp ? sp.closest('li') : null;
  }
  // ④ 点原生标签恢复排序控件显形（幂等挂一次）
  function armSortRestore(ul) {
    if (ul.dataset.acsvSortrestore) return;
    ul.dataset.acsvSortrestore = '1';
    ul.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('li[data-index]') : null;
      if (!t || t.hasAttribute('data-acsv-order')) return; // 自建标签：保持隐藏
      if (siteSortLi()) siteSortLi().style.display = '';
    });
  }
}

// ---------- 自愈（0.9.218） ----------
// 站点是 SPA：内容区重渲染会把注入的标签卡/面板一起冲掉。uppage 此前只有 20 拍轮询、**无
// MutationObserver**，被冲掉后不回补（既有缺陷）；本件用一个**共享**观察器驱动所有注册的自愈
// 回调（两个自建标签共用一条，避免各挂一个 body 级 MO）。childList/subtree + 300ms 去抖
//（memberplaza.guardHeal 同款节拍）；回调必须是**单次同步尝试**（不得再起定时器，否则
// 观察器被反复触发时会叠出多串重试）。
var healers = [];
var healPending = false;
var healObserved = false;
export function watchSpaceTabs(heal) {
  if (healers.indexOf(heal) < 0) healers.push(heal);
  if (healObserved || typeof MutationObserver !== 'function') return;
  healObserved = true;
  new MutationObserver(function () {
    if (healPending) return;
    healPending = true;
    setTimeout(function () {
      healPending = false;
      for (var i = 0; i < healers.length; i++) {
        try { healers[i](); } catch (e) { /* 自愈失败静默：下次变更再试 */ }
      }
    }, 300);
  }).observe(document.body, { childList: true, subtree: true });
}
