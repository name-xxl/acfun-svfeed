import { ICONS } from './styles.js';
import { el, elHtml, fmt, a11y, spinner } from './ui.js';
import { root, setCommentDrawer, isOvlSlide } from './state.js';
import { FeedStore } from './feedstore.js';
import { togglePlayGesture } from './playback.js';
import { attachVideo } from './attach.js';
import { buildControls, showControls } from './controls.js';
import { buildSideRail, syncMetaUp } from './rail.js';

// ---------- 单条 slide 的构建 ----------
// buildSlide 把控制栏（controls.js）、右侧栏（rail.js）、信息区拼成一个 slide；
// 箭头翻页依赖上层导航，经 goTo 参数透传给 buildSideRail（renderWindow 注入）。

// ---------- 简介渲染（0.9.196 案 A）：标题下方内联，2 行 clamp + 「展开简介」 ----------
// 幂等：同文不重绘（保住展开态）；解析回包把 desc 从无到有时经 _descSync 重刷。
// 展开后限高可滚（竖刷是全屏单条，不能让简介吃掉画面）。
function syncDesc(box, item) {
  var txt = (item && item.desc) || '';
  if (!txt) { box.style.display = 'none'; box.textContent = ''; return; }
  box.style.display = '';
  if (box.dataset.txt === txt) return;
  box.dataset.txt = txt;
  box.textContent = '';
  box.classList.remove('open');
  box.appendChild(el('p', 'acsv-desc', txt));
  var more = el('a', 'acsv-descm', '展开简介 ▾');
  more.addEventListener('click', function (ev) {
    ev.stopPropagation(); // 别冒泡成 slide 点按（会切播放/暂停）
    var on = box.classList.toggle('open');
    more.textContent = on ? '收起简介 ▴' : '展开简介 ▾';
  });
  box.appendChild(more);
}

export function buildSlide(item, idx, goTo) {
  var slide = el('section', 'acsv-slide');
  slide.dataset.idx = idx;
  slide.dataset.state = 'loading';

  if (item.cover) {
    var amb = el('div', 'acsv-ambient');
    amb.style.backgroundImage = 'url("' + item.cover + '")';
    slide.appendChild(amb);
  }

  var sp = spinner();
  var playicon = elHtml('div', 'acsv-playicon', ICONS.play);
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
  slide.appendChild(sp);
  slide.appendChild(playicon);
  slide.appendChild(errbox);

  slide.appendChild(buildControls(slide, idx, item));

  // 右侧操作栏 + 上下翻页箭头（点赞/评论/投蕉/收藏/分享/关注）
  buildSideRail(slide, item, goTo);

  // 左下角信息（快手式：作者行在上，标题在下；home 用发布时间替代播放量——取数口径见
  // appapi.resolve：createTimeMillis = 站方 UP 空间页展示的那个时刻，本地时区格式化）。
  // 作者行走 syncMetaUp（0.9.82）：作者未知就不挂节点，解析回包后由 onHomeResolved 重刷
  var info = el('div', 'acsv-info');
  var meta = el('div', 'acsv-meta');
  syncMetaUp(meta, item);
  if (item.kind === 'home') {
    // 构建时直读已知日期：预热抢跑的条目解析已完成但 onResolved 钩子不会再触发，
    // 空占位会让这类卡片永远没日期；慢路径解析完成后 onHomeResolved 照旧覆盖
    meta.appendChild(el('span', 'acsv-date', item.date || ''));
  } else {
    meta.appendChild(el('span', null, item.date || ''));
    meta.appendChild(el('span', 'acsv-views', fmt(item.view) + '次播放'));
  }
  info.appendChild(meta);
  info.appendChild(el('p', 'acsv-title', item.title));
  // 简介（0.9.196，用户裁决「案 A」）：数据要等 douga/info 回包（appapi.resolve 写 item.desc），
  // 故容器先建、由 _descSync 在解析完成后填充（onHomeResolved 统一驱动）；无简介则整块不显示。
  var descWrap = el('div', 'acsv-descwrap');
  slide._descSync = function () { syncDesc(descWrap, item); };
  syncDesc(descWrap, item); // 构建期若已有（预热抢跑）先绘一次
  info.appendChild(descWrap);
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
  // 播放层 slide（isOvlSlide）不在竖刷流里：点按即手势，不做"当前条"判定
  if (!isOvlSlide(slide)) {
    var idx = Number(slide.dataset.idx);
    if (idx !== FeedStore.current) return;
  }
  togglePlayGesture(slide.querySelector('video'));
}

// 评论抽屉骨架（挂载时构建一次；**只建空壳 + 注册句柄**——关闭键/列表委托由 comments.js
// 首次打开时经 setCommentDrawer 句柄自附，0.9.118 接线自附；本模块不再 import 评论域）。
// 0.9.167：head 加「评论 | 相关推荐」双 tab；0.9.174 再加「列表」=三 tab（行为在 reldrawer.js，经句柄自附——同
// ensureDrawerWired 体例，本模块零评论域依赖）；dtitle 仍是评论管线的计数回写目标
//（comments.js titleText 写 textContent，语义不变），包进「评论」tab 键内展示；
// 相关推荐是**平级第二列表**（绝不复用 dlist——resetList 会清它、.acsv-citem DOM 被断言钉死）
export function buildDrawer() {
  var drawer = el('aside', 'acsv-drawer');
  // 无障碍（0.9.186）：抽屉=模态对话框语义（纯属性，不改形态/视觉）
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', '评论');
  var dhead = el('div', 'acsv-drawer-head');
  var dtabs = el('div', 'acsv-drawer-tabs');
  var tabC = el('button', 'acsv-dtab on');
  var dtitle = el('span', null, '评论');
  tabC.appendChild(dtitle);
  tabC.title = '评论';
  var tabR = el('button', 'acsv-dtab acsv-dtab-rel', '相关推荐');
  tabR.style.display = 'none'; // sv（小视频）条目无相关推荐；openComments 按 kind 显形
  // 「列表」tab（0.9.174）：列表播放器（相关推荐/合辑/分P 这类自带列表的视频）里显形，
  // 展示**当前正在播的那份列表**；由 playlayer 经 reldrawer 的 seam 控制显隐与内容
  var tabL = el('button', 'acsv-dtab acsv-dtab-list', '列表');
  tabL.style.display = 'none';
  dtabs.appendChild(tabC);
  dtabs.appendChild(tabR);
  dtabs.appendChild(tabL);
  var dclose = el('button', 'acsv-drawer-close', '✕');
  a11y(dclose, '收起评论（Esc）');
  dhead.appendChild(dtabs);
  dhead.appendChild(dclose);
  var dlist = el('div', 'acsv-drawer-list');
  var rlist = el('div', 'acsv-drawer-list acsv-rellist');
  rlist.style.display = 'none';
  var llist = el('div', 'acsv-drawer-list acsv-listlist'); // 第三平级容器（同 relList 不复用纪律）
  llist.style.display = 'none';
  drawer.appendChild(dhead);
  drawer.appendChild(dlist);
  drawer.appendChild(rlist);
  drawer.appendChild(llist);
  root.appendChild(drawer);
  setCommentDrawer({ el: drawer, title: dtitle, list: dlist, relList: rlist, listList: llist, tabC: tabC, tabR: tabR, tabL: tabL });
}
