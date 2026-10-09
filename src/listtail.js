import { el } from './ui.js';
import { ICONS } from './styles.js';

// ---------- 列表尾部件（0.9.219 抽出单源） ----------
// 背景：这三件事此前被各页各写一遍——**触底监听 5 份**（squarefeed/followview/jingxuanview/
// searchview/comments）、**回顶按钮 4 份**（squarefeed/followview/zone/searchview）、**三态状态行
// 2 份逐字重复**（squarefeed 与 followview）。判断标准是「同一件事被实现了几遍」，不是「看着像」。
//
// 本件只收**尾部呈现与触发件**三样，**不管翻页范式**（各页的游标/页码/IO 哨兵/自持游标各自保留）：
//   · 触底监听（元素 / window 两方言，含提前量）
//   · 三态状态行（`acsv-fstatus` + busy 类；点击=重试出口）
//   · 回顶按钮（`acsv-tbtn acsv-backtop` + chevUp 图标；超阈值显隐、点击平滑回顶）
//
// 消费方按需取用：`createListTail` 一次给三样；只要回顶的页传 `onBottom: null`（本件不挂触底监听）。
// `stop()` 解绑滚动监听（window 滚动必须显式解绑——视图拆了但 window 还活着）。
//
// 顺带修：followview 此前状态行**注释写「点击=手动重试」却没接线**（首屏失败列表为空时没有
// 可依的滚动，点击是唯一出口）——接入本件后自动接上，harness 有断言钉。

// 滚动位置（两方言取同一语义）
function scrollTopOf(scrollEl) {
  return scrollEl === window
    ? (window.pageYOffset || document.documentElement.scrollTop || 0)
    : scrollEl.scrollTop;
}

// 是否到触底提前量（两方言）
function atBottom(scrollEl, pad) {
  if (scrollEl === window) {
    return scrollTopOf(scrollEl) + window.innerHeight >= document.documentElement.scrollHeight - pad;
  }
  return scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - pad;
}

// opts：root（默认落点）/ statusHost（默认 root）/ backTopHost（默认 root）/
//       scrollEl（元素或 window，必填）/ pad / backTopAt / onBottom（触底回调，缺省=不挂触底监听）
//       / onRetry（状态行点击回调，缺省=状态行不可点）
//       / status:false（不要状态行——只借回顶件的页用它，免得平白多一个 34px 空行改变版式）
//       / backTopHost:false（不自动挂回顶元素，由调用方自己摆位——searchview 要在内容之后重挂）
// 返回 { status, backTop, setStatus, stop }
export function createListTail(opts) {
  var root = opts.root;
  var scrollEl = opts.scrollEl;
  var pad = opts.pad;
  var backTopAt = opts.backTopAt;

  var status = opts.status === false ? null : el('div', 'acsv-fstatus');
  if (status) (opts.statusHost || root).appendChild(status);
  var backTop = el('button', 'acsv-tbtn acsv-backtop');
  backTop.innerHTML = ICONS.chevUp;
  backTop.title = '回到顶部';
  if (opts.backTopHost !== false) (opts.backTopHost || root).appendChild(backTop);

  function onScroll() {
    if (opts.onBottom && atBottom(scrollEl, pad)) opts.onBottom();
    backTop.classList.toggle('on', scrollTopOf(scrollEl) > backTopAt);
  }
  // 滚动监听常挂：回顶显隐本来就靠它（只借回顶的页也要）；onBottom 缺省=只同步回顶
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  backTop.addEventListener('click', function () {
    if (scrollEl === window) window.scrollTo({ top: 0, behavior: 'smooth' });
    else scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (opts.onRetry && status) {
    status.addEventListener('click', function () { opts.onRetry(); });
  }

  return {
    status: status,
    backTop: backTop,
    // 三态状态行文案（'' 清空；busy=加载中态：降透明且不可点）；无状态行的宿主为 No-op
    setStatus: function (text, busy) {
      if (!status) return;
      status.textContent = text || '';
      status.classList.toggle('busy', !!busy);
    },
    stop: function () {
      scrollEl.removeEventListener('scroll', onScroll);
    }
  };
}
