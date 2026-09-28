import { CFG } from './cfg.js';
import { ICONS } from './styles.js';
import { el, esc, fmt } from './ui.js';
import { root, setCommentDrawer } from './state.js';
import { FeedStore } from './feedstore.js';
import { togglePlayGesture } from './playback.js';
import { attachVideo } from './attach.js';
import { buildControls, showControls } from './controls.js';
import { buildSideRail } from './rail.js';
import { closeComments, commentListClick } from './comments.js';

// ---------- 单条 slide 的构建 ----------
// buildSlide 把控制栏（controls.js）、右侧栏（rail.js）、信息区拼成一个 slide；
// 箭头翻页依赖上层导航，经 goTo 参数透传给 buildSideRail（renderWindow 注入）。

export function buildSlide(item, idx, goTo) {
  var slide = el('section', 'acsv-slide');
  slide.dataset.idx = idx;
  slide.dataset.state = 'loading';

  if (item.cover) {
    var amb = el('div', 'acsv-ambient');
    amb.style.backgroundImage = 'url("' + item.cover + '")';
    slide.appendChild(amb);
  }

  var spinner = el('div', 'acsv-spinner');
  var playicon = el('div', 'acsv-playicon', ICONS.play);
  var errbox = el('div', 'acsv-errbox');
  errbox.appendChild(el('p', null, '视频加载失败'));
  var retry = el('button', 'acsv-retry', '重试');
  retry.addEventListener('click', function (ev) {
    ev.stopPropagation();
    item.urlIdx = 0; item.refreshed = false;
    if (item.cap.lazyResolve) item.urls = []; // 懒解析源：清直链强制重跑解析链
    attachVideo(slide, item, idx);
  });
  errbox.appendChild(retry);
  slide.appendChild(spinner);
  slide.appendChild(playicon);
  slide.appendChild(errbox);

  slide.appendChild(buildControls(slide, idx, item));

  // 右侧操作栏 + 上下翻页箭头（点赞/评论/投蕉/收藏/分享/关注）
  buildSideRail(slide, item, goTo);

  // 左下角信息（快手式：作者行在上，标题在下；home 用投稿时间替代播放量）
  var info = el('div', 'acsv-info');
  var meta = el('div', 'acsv-meta');
  var up = item.userId
    ? '<a href="' + CFG.api.userBase + item.userId + '" target="_blank">@' + esc(item.userName) + '</a>'
    : '<span>@' + esc(item.userName) + '</span>';
  if (item.kind === 'home') {
    // 构建时直读已知日期：预热抢跑的条目解析已完成但 onResolved 钩子不会再触发，
    // 空占位会让这类卡片永远没日期；慢路径解析完成后 onHomeResolved 照旧覆盖
    meta.innerHTML = up + '<span class="acsv-date">' + esc(item.date || '') + '</span>';
  } else {
    meta.innerHTML = up
      + '<span>' + esc(item.date || '') + '</span>'
      + '<span class="acsv-views">' + fmt(item.view) + '次播放</span>';
  }
  info.appendChild(meta);
  info.appendChild(el('p', 'acsv-title', esc(item.title)));
  slide.appendChild(info);

  slide.addEventListener('mousemove', function () { showControls(slide); });
  slide.addEventListener('click', onSlideTap);
  // 氛围背景的 inset:-60px + scale(1.15) 溢出使 slide 成为可横向滚动的容器，
  // Ctrl+F 定位 / 焦点导航等程序化滚动会让整个画面横向错位，发生即归零
  slide.addEventListener('scroll', function () {
    if (slide.scrollLeft !== 0) slide.scrollLeft = 0;
  });
  return slide;
}

function onSlideTap(ev) {
  var slide = ev.currentTarget;
  var idx = Number(slide.dataset.idx);
  if (idx !== FeedStore.current) return;
  togglePlayGesture(slide.querySelector('video'));
}

// 评论抽屉骨架（挂载时构建一次；列表点击统一委托在 list 上）
export function buildDrawer() {
  var drawer = el('aside', 'acsv-drawer');
  var dhead = el('div', 'acsv-drawer-head');
  var dtitle = el('span', null, '评论');
  var dclose = el('button', 'acsv-drawer-close', '✕');
  dclose.title = '收起评论（Esc）';
  dclose.addEventListener('click', closeComments);
  dhead.appendChild(dtitle);
  dhead.appendChild(dclose);
  var dlist = el('div', 'acsv-drawer-list');
  dlist.addEventListener('click', commentListClick);
  drawer.appendChild(dhead);
  drawer.appendChild(dlist);
  root.appendChild(drawer);
  setCommentDrawer({ el: drawer, title: dtitle, list: dlist });
}
