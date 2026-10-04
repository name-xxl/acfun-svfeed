// ---------- 动态行卡 kit（0.9.124 自 followview.js 拆出：行卡构建件 + 行内评论控制器） ----------
// 行卡（原生骨架四段 head/content/acts）+ 九宫格/媒体分派 + 互动栏接线 + 行内评论区宿主
// 控制器 + 列表级点击委托。消费方：followview（关注·全部）与 squareview（广场，0.9.126 起）。
// 拆出纪律（同 cards.js 0.9.109）：逐字搬运零逻辑改动——类名与挂法被 harness 大量
// .acsv-frow* 断言钉着；view 特有的落点策略（rowDefault）与列表壳/游标方言留在各视图。
// 依赖方向：本模块不 import 任何视图（详情/播放出口由各视图以 wireRowList 的 onOpen 注入）。
// 行内评论宿主是模块级单例（一次只有一个视图存活）；teardown 归属=各视图调 closeInlineComments。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { ubbTextOf, stripOf, momentCellOf, momentMediaOf } from './cards.js';
import { openSharePanel } from './sharepanel.js';
import { momentBarOf, momentShareItemOf } from './momentbar.js';
import { imgInto } from './imgload.js';
import { openImageViewer } from './imgview.js';
import { openCommentsHost, closeCommentsHost, commentListClick } from './comments.js';
import { releaseDrawer } from './state.js';

// ---------- 原位评论区（0.9.100）：行内开合的宿主状态（模块级——teardown 要能收拾它） ----------
// 开新行前必须**显式关旧行**：claimDrawer 同槽重入不互收（comments.js 注释在册），不关的话
// 旧容器还挂着管线 DOM、commentState 却已指向新行——列表更新串台。
// 0.9.101：视频行也原位展开（原生 member-feed 三类条目都是原地开评论；sv=5 是 meow，
// www 视频=3——data.js normalizeHome 同值）；文章评论 stype 未实测，仍外链官方页
var openCmt = null; // { pi, box, list }

export function closeInlineComments() {
  if (!openCmt) return;
  var c = openCmt;
  openCmt = null;
  c.box.remove();
  closeCommentsHost(); // 管线宿主复位（容器已拆，残留引用会读到死节点——momentdetail 同款）
  releaseDrawer('comments');
}

// cmt = { sourceId, stype, shareUrl }：按条目型给管线端点参数（动态=4/momentId，视频=3/acId）
export function toggleInlineComments(pi, btn, cmt) {
  if (openCmt && openCmt.pi === pi) { closeInlineComments(); return; } // 同条目再点=收起
  closeInlineComments();
  var row = btn.closest('.acsv-frow');
  var box = el('div', 'acsv-frow-cmts');
  var list = el('div', 'acsv-frow-cmtlist');
  list.addEventListener('click', commentListClick); // 行内点赞/回复/配图大图委托（经典抽屉同款委托；宿主各自挂，0.9.118 起抽屉侧自附）
  box.appendChild(list);
  var acts = btn.parentNode;
  if (acts.nextSibling) row.insertBefore(box, acts.nextSibling);
  else row.appendChild(box);
  openCmt = { pi: pi, box: box, list: list };
  // pin 不传：行内正文本就在上方，评论区只要列表+输入条（resetList 对缺 pin 有守卫）
  openCommentsHost({
    el: box,
    title: btn._n, // 评论计数 span 交给管线回写（momentdetail 同款）
    list: list,
    close: closeInlineComments
  }, cmt.sourceId, cmt.stype, cmt.shareUrl, 'home');
}

// ---------- 行渲染（feedRowOf）：原生骨架四段 head / content / acts（sep=行间灰带） ----------

// 头像行（member-feed-user 等价）：头像 50 圆 + 名字链接 16px + 时间块级在其下
function headOf(pi) {
  var head = el('div', 'acsv-frow-head');
  var av = el('span', 'acsv-frow-av');
  imgInto(av, (pi.up && pi.up.img) || CFG.api.defaultAvatar, 'avatar');
  head.appendChild(av);
  var info = el('div', 'acsv-frow-info');
  var name = el('a', 'acsv-frow-name', pi.up && pi.up.name ? pi.up.name : '');
  if (pi.up && pi.up.id) {
    name.href = CFG.api.userBase + pi.up.id;
    name.target = '_blank';
    name.rel = 'noopener';
  }
  info.appendChild(name);
  info.appendChild(el('span', 'acsv-frow-time', pi.dateText || ''));
  head.appendChild(info);
  return head;
}

// 行流的两块媒体构建器（0.9.102 收口：strip 下沉 cards.stripOf、格子上挂 cards.momentCellOf，
// 本模块只留**行流特有的布局决策**——九宫格 n1/n24 容器类；dispatch 走 cards.momentMediaOf）
// 九宫格（member-feed-moment-image 等价）：容器 342、图 110 方 margin 0 4 4 0；1 图容器
// 299（图自适应 max299）；2/4 图容器 228。格上 cursor:pointer（原生同款），点击开大图
function rowGrid(pi) {
  var box = el('div', 'acsv-frow-imgs');
  var n = pi.imgs.length;
  if (n === 1) box.classList.add('n1');
  else if (n === 2 || n === 4) box.classList.add('n24');
  pi.imgs.forEach(function (im) { box.appendChild(momentCellOf('acsv-frow-img', im)); });
  return box;
}

// 单图兜底（imgInfos 缺失的老数据）；无图返 null——动态图像权威=imgs（0.9.105，cover 兜底
// 已退役：无图动态的顶层 coverUrl 是官方默认封面池/源封面，不是本条配图）
function rowSingle(pi, im0) {
  if (!im0) return null;
  var box = el('div', 'acsv-frow-imgs n1');
  box.appendChild(momentCellOf('acsv-frow-img', im0));
  return box;
}

// 动态媒体块分派（dispatcher 单源；行流 gridMin=1——单图也走宫格容器拿 299 自适应）
function momentMedia(pi) {
  return momentMediaOf(pi, { gridMin: 1, grid: rowGrid, single: rowSingle });
}

// 互动栏（0.9.105 收口共享件 momentbar）：键定义/写链编排单源，行流只提供两个出口——
// 分享（place=左贴行：右缘挨行左缘、底部对齐，0.9.105 裁决几何）与评论（动态/视频行内
// 原位展开、文章外链官方页）
function rowBarOf(pi, row) {
  return momentBarOf(pi, {
    skin: 'row',
    onShare: function (btn) {
      // 宿主=滚动视图体（absolute 坐标系含滚动偏移 → 弹层随列表滚动跟随）；内嵌广场
      //（memberplaza）无视图体：回落内嵌根 .acsv-mp（皮肤给了 position:relative）/ body
      openSharePanel(btn, momentShareItemOf(pi), {
        headText: '分享给朋友',
        host: row.closest('.acsv-view-body') || row.closest('.acsv-mp') || document.body,
        place: { mode: 'left-of', anchorEl: row }
      });
    },
    onComment: function (btn) {
      if (pi.ct === 'moment') {
        toggleInlineComments(pi, btn, { sourceId: pi.momentId, stype: 4, shareUrl: pi.href });
      } else if (pi.ct === 'video') {
        toggleInlineComments(pi, btn, { sourceId: pi.acId, stype: 3, shareUrl: CFG.api.videoBase + pi.acId });
      } else if (pi.href) {
        window.open(pi.href, '_blank'); // 文章评论 stype 未实测：外链官方页（宁可漏不错）
      }
    }
  });
}

export function feedRowOf(pi) {
  var row = el('div', 'acsv-frow');
  row._pi = pi; // 行级数据引用：列表级委托按它分派（comments.js commentListClick 同款挂法）
  row.appendChild(headOf(pi));
  var content = el('div', 'acsv-frow-content');
  if (pi.ct === 'moment') {
    // 正文 UBB 单源（表情/at/资源链）；clamp 是展开态开关的初始类（溢出才挂「展开」按钮）
    content.appendChild(ubbTextOf(pi.text, 'acsv-frow-text clamp'));
  }
  var media = null;
  if (pi.ct === 'moment') media = momentMedia(pi); // 内含 repost→引用卡 分派（dispatcher 单源）
  else media = stripOf(pi); // 视频/文章行：与引用卡内嵌源卡共用构建件（原生同款复用）
  if (media) content.appendChild(media);
  row.appendChild(content);
  row.appendChild(rowBarOf(pi, row));
  return row;
}

// 展开/收起的溢出探测：clamp 类先渲染，rAF 后量 scrollHeight——溢出才挂按钮（不溢出
// 的正文不出现假按钮）。批量一帧做一次，不做滚动监听（翻页时对新批再 arm 一次即可）
export function armExpanders(scope) {
  requestAnimationFrame(function () {
    if (!scope.isConnected) return;
    [].forEach.call(scope.querySelectorAll('.acsv-frow-text.clamp'), function (t) {
      if (t._armed) return; // 已判过（挂了按钮或确认不溢出）：不重复
      // 图未解码时量不准（ubb 产出的 img 无尺寸属性，0.9.105）——等齐了再判，一次 load 重测
      var imgs = t.querySelectorAll('img'), pending = 0;
      [].forEach.call(imgs, function (im) { if (!im.complete) pending++; });
      if (pending) {
        [].forEach.call(imgs, function (im) {
          if (im.complete) return;
          var once = function () {
            im.removeEventListener('load', once);
            im.removeEventListener('error', once);
            armExpanders(scope); // 重测这一批（_armed 防重复）
          };
          im.addEventListener('load', once);
          im.addEventListener('error', once);
        });
        return;
      }
      t._armed = true;
      if (t.scrollHeight <= t.clientHeight + 1) return;
      var more = el('span', 'acsv-fmore', '展开');
      t.parentNode.insertBefore(more, t.nextSibling);
    });
  });
}

// 列表级委托（commentListClick 同款挂法）：互动键 → 行为分派；展开 → 钳高切换；
// 正文配图/九宫格 → 大图；内链不劫持；其余落行默认动作。命中即 return，不双触发行默认
export function wireRowList(list, onOpen) {
  list.addEventListener('click', function (ev) {
    var row = ev.target.closest('.acsv-frow');
    if (!row || !row._pi) return;
    // 行内评论区内部（评论列表/输入条/表情面板/回复条）一律不参与行默认——**0.9.100 的病灶**：
    // 这些点击冒泡到本委托后落行默认动作（onOpen=各视图的 rowDefault），点一下表情按钮就把评论区关掉换成详情面板
    //（用户实报「表情面板打不开」）；评论区自己的委托（commentListClick）已各自处理
    if (ev.target.closest('.acsv-frow-cmts')) return;
    var pi = row._pi;
    // 互动键已自挂监听（momentbar 共享件）——委托不再接 act 分支
    var more = ev.target.closest('.acsv-fmore');
    if (more) {
      var t = row.querySelector('.acsv-frow-text');
      if (t) {
        var clamped = t.classList.toggle('clamp');
        more.textContent = clamped ? '展开' : '收起';
      }
      return;
    }
    // 宫格图的大图查看由格子自挂（cards.momentCellOf，含 stopPropagation）——委托不再接
    //（0.9.102 收口：此前两处各挂一份会双开）
    var pic = ev.target.closest('.ubb-imgc');
    if (pic) {
      // 划选文字收尾在图片上不弹大图（commentListClick 同款判据）
      var sel = window.getSelection ? window.getSelection() : null;
      if (!sel || sel.isCollapsed) {
        ev.stopPropagation();
        openImageViewer(pic.getAttribute('src') || '');
      }
      return;
    }
    if (ev.target.closest('a')) return; // 内链（@/资源/名字/文章条）自导航，不冒泡成行默认
    onOpen(pi);
  });
}
