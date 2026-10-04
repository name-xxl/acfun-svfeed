import { CFG } from './cfg.js';
import { ICONS, SITE_ICONS, VIDEO_ICONS } from './styles.js';
import { el, elHtml, fmt, toast } from './ui.js';
import { imgInto } from './imgload.js';
import { FeedStore } from './feedstore.js';
import { setRealLike, giveBanana } from './interact.js';
import { openFollowGroupPop } from './grouppop.js'; // 关注角标→分组选择层（0.9.142）
import { openFavFolderPop } from './favpop.js'; // 收藏键→收藏夹选择层（0.9.143）
import { openSharePanel } from './sharepanel.js';
import { toggleBananaPop } from './banpop.js';

// ---------- 右侧操作栏 + 上下翻页箭头 ----------
// 从 buildSlide 抽出：头像/关注、点赞、评论、投蕉、收藏、分享。
// 箭头翻页依赖上层导航（scrollToIndex 在 player.js），经 goTo 参数注入保持依赖单向。

// 评论键出口（0.9.116）：本组件不 import 评论域——「展开/收起评论」动作由 player 模块求值期
// 注册（setCommentsOpener；先例 cards.setItemOpener / sharepanel.setChatOpener）；未注册时点击 no-op
var commentsOpener = null;
export function setCommentsOpener(fn) { commentsOpener = typeof fn === 'function' ? fn : null; }

// busy 守卫三件套：请求期间挡重复点击，完成/拒绝都复位（interact 层正常不 reject，
// 这里兜住异常不让 busy 永久卡死）；done(ok) 收到布尔结果
function withBusy(item, key, send, done) {
  if (item[key]) return;
  item[key] = true;
  send().then(function (ok) { item[key] = false; done(ok === true); },
    function () { item[key] = false; done(false); });
}

// ---------- 作者面渲染与同步（0.9.82 统一条目模型） ----------
// 作者只有一个数据出口 item.up{id,name,img,isFollowing}|null（data.upOf 定型）。渲染面有两处，
// 都由 onHomeResolved 一处驱动刷新：
//   syncMetaUp  左下角 .acsv-meta 的 @名字 行（slide.buildSlide 建、resolve 回包后重刷）
//   syncRailUp  右侧栏头像 + 关注角标（buildSideRail 建、resolve 回包后重刷）
// 两个函数都幂等。0.9.82 之前的病灶是"回填只写数据、从不刷 DOM"：appapi.resolve 早把真名写回
// item，但 @名字 与头像块都是构建期一次性写死的，于是 '未知用户' 从此常驻屏幕。

// 左下作者行（快手式：作者行在最前，日期/播放数在后）。未知作者**不挂节点**——不渲染
// 伪造的占位文案（旧实现在 data.js 写死 '未知用户'）。有 uid 用链接、否则纯文本
export function syncMetaUp(meta, item) {
  if (!meta) return null;
  var node = meta.querySelector('.acsv-up');
  var up = item.up;
  var name = up && up.name ? up.name : '';
  if (!name) { if (node) node.remove(); return null; }
  var wantLink = !!up.id;
  if (node && (node.tagName === 'A') === wantLink) {
    node.textContent = '@' + name; // textContent：昵称含 &<> 也不破版（0.9.33 的 el() 新规）
    if (wantLink) node.href = CFG.api.userBase + up.id;
    return node;
  }
  if (node) node.remove();
  node = el(wantLink ? 'a' : 'span', 'acsv-up', '@' + name);
  if (wantLink) { node.href = CFG.api.userBase + up.id; node.target = '_blank'; }
  meta.insertBefore(node, meta.firstChild);
  return node;
}

// 关注角标状态投影（文本/类名/提示语一处收口，点击回调与回包刷新共用）
function followBtnState(fb, up) {
  fb.textContent = up.isFollowing ? '✓' : '+';
  fb.classList.toggle('on', !!up.isFollowing);
  fb.title = up.isFollowing ? '点击取消关注' : '关注 UP 主';
}

// 右侧栏头像 + 关注角标（角标挂在头像下沿，故两者同块）。挂块判据=有头像或有 uid（与原
// `if (item.head)` 的可见面一致并放宽到"回包后才拿到 uid"）；有 uid 但拿不到头像用站点默认
// 头像兜底（与 imgload 头像策略的 fallback 同一张图：语义是"这张图取不到"，不是"没有作者"）；
// 无 uid 时角标隐藏（无处可发关注，但仍照旧展示头像并链到分享页）
function syncRailUp(rail, item) {
  var up = item.up;
  var wrap = rail.querySelector('.acsv-avwrap');
  if (!up || (!up.img && !up.id)) { if (wrap) wrap.remove(); return; }
  if (!wrap) {
    wrap = el('div', 'acsv-avwrap');
    var a = el('a');
    a.target = '_blank';
    wrap._avLink = a;
    wrap._avUrl = null; // 已渲染的头像源（下面按需建/换）
    wrap.appendChild(a);
    var fbEl = el('div', 'acsv-followbtn');
    wrap._fb = fbEl;
    wrap.appendChild(fbEl);
    rail.insertBefore(wrap, rail.firstChild); // 头像块恒在操作按钮之上
    fbEl.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var u = item.up;
      if (!u || !u.id) return;
      // 0.9.142 官方口径：点关注角标=弹「选择分组 / 更改分组」层（含新建分组），提交走
      // relationapi（action=1 带组 / action=3 改分组 / 2 取关）——旧的"单击直接关注/取关"
      // toggle 退役（能力不减：已关注态层内给「取消关注」键）。失败/未登录提示在层内。
      openFollowGroupPop(fbEl, {
        uid: u.id,
        name: u.name || '',
        following: !!u.isFollowing,
        done: function (res) {
          var uu = item.up;
          if (!uu) return;
          uu.isFollowing = !res.unfollowed;
          if (fbEl.isConnected) followBtnState(fbEl, uu);
        }
      });
    });
  }
  // 头像源变了就重建 img 节点（0.9.82）：解析回包会把 up.img 从空/默认补成真实头像，
  // imgInto 只在建节点时读一次 URL——原地改 src 会绕过它的归一 + 重试 + 死链备忘链。
  // 头像走共享加载器（0.9.77）：归一 + 重试 + 默认头像兜底；query 绝不手剥
  //（旧代码 split('?')[0] 与 imgurl 的「query 一律保留」契约相悖，签名头像会裂）
  var imgUrl = up.img || CFG.api.defaultAvatar;
  if (wrap._avUrl !== imgUrl) {
    while (wrap._avLink.firstChild) wrap._avLink.removeChild(wrap._avLink.firstChild);
    wrap._av = imgInto(wrap._avLink, imgUrl, 'avatar', 'acsv-avatar');
    wrap._avUrl = imgUrl;
  }
  wrap._avLink.href = up.id ? CFG.api.userBase + up.id : item.shareUrl;
  if (wrap._av) wrap._av.title = up.name || '';
  wrap._fb.style.display = up.id ? '' : 'none';
  if (up.id) followBtnState(wrap._fb, up);
}

export function buildSideRail(slide, item, goTo) {
  var rail = el('div', 'acsv-rail');
  syncRailUp(rail, item);
  // 作者面刷新（0.9.82）：douga/info 回包回填 item.up 后由 onHomeResolved 调用。此前头像块
  // 在构建期被 `if (item.head)` 门住、回包后无处补建，_followSync 也随之不注册——从搜索/
  // 收藏/历史进播放层就一直没有头像与关注按钮。现在无条件注册，且幂等（块在则只同步状态）
  slide._followSync = function () { syncRailUp(rail, item); };
  function railBtn(icon, count, title, onclick) {
    var wrap = el('div');
    wrap.style.marginBottom = '25px';
    var b = el('button', 'acsv-rail-btn');
    b.title = title;
    var imgEl = null, imgOn = null, imgOff = null;
    if (icon && icon.mask) {
      // 原生图标只借形状（CSS mask 遮罩），颜色由背景色控制：白 → .on A 站红 → .thrown 蕉黄
      var mk = el('span', 'acsvg-icon-mask');
      mk.style.setProperty('--acsvg-icon', 'url("' + icon.mask + '")');
      var probe = new Image();
      probe.onerror = function () { mk.remove(); b.innerHTML = icon.svg || ''; }; // CDN hash 变化时回退
      probe.src = icon.mask;
      b.appendChild(mk);
    } else if (icon && icon.img) {
      imgEl = el('img', 'acsv-icon-img');
      imgEl.alt = '';
      imgOff = icon.img;
      imgOn = icon.imgOn || null;
      imgEl.addEventListener('error', function () {
        b.innerHTML = icon.svg || '';
      });
      imgEl.src = icon.img;
      b.appendChild(imgEl);
    } else {
      b.innerHTML = icon;
    }
    b.addEventListener('click', function (ev) { ev.stopPropagation(); onclick(b); });
    var c = el('div', 'acsv-count', count);
    wrap.appendChild(b); wrap.appendChild(c);
    rail.appendChild(wrap);
    return { btn: b, count: c, imgEl: imgEl, imgOn: imgOn, imgOff: imgOff };
  }
  // 原生图标形状 + CSS 换色：home 用视频页原生点赞/收藏/投蕉图标，
  // sv 点赞用小视频站原生心形 PNG；svg 字段为 CDN 失效时的回退
  var likeUI = railBtn({ mask: item.kind === 'home' ? VIDEO_ICONS.like : SITE_ICONS.heart, svg: ICONS.heart }, fmt(item.like), '点赞', function (b) {
    var turnOn = !item.localLike;
    // 乐观更新
    item.localLike = turnOn;
    item.like += turnOn ? 1 : -1;
    likeUI.count.textContent = fmt(item.like);
    b.classList.toggle('on', turnOn);
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    withBusy(item, 'likeBusy', function () {
      return setRealLike(item, turnOn);
    }, function (ok) {
      if (ok) {
        item.liked = turnOn;
        toast(turnOn ? '已点赞' : '已取消点赞');
      } else {
        // 未登录或失败：回滚
        item.localLike = !turnOn;
        item.like += turnOn ? -1 : 1;
        likeUI.count.textContent = fmt(item.like);
        toast('点赞失败（未登录？）');
      }
      likeUI.btn.classList.toggle('on', item.liked || item.localLike);
    });
  });
  likeUI.btn.classList.toggle('on', item.liked || item.localLike);
  slide._likeSync = function () {
    var on = item.liked || item.localLike;
    likeUI.btn.classList.toggle('on', on);
    likeUI.count.textContent = fmt(item.like); // 解析后回填真实点赞数
  };
  // 评论（两模式都在右栏，sourceType 由 item.stype 分发；0.9.116 经注册缝）
  var cmtUI = railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), '展开/收起评论（C）', function () {
    if (commentsOpener) commentsOpener(item);
  });
  slide._cmtSync = function () { cmtUI.count.textContent = fmt(item.comment); };
  if (item.cap.banana) {
    // 投蕉：弹数量层（对齐视频页"点第 N 根投 N"）；已投过则不可再展开
    var banUI = railBtn({ mask: VIDEO_ICONS.banana, svg: ICONS.banana }, fmt(item.banana), '投蕉', function (b) {
      if (item.thrown) { toast('已投过蕉啦，明天再来~'); return; }
      toggleBananaPop(b, {
        send: function (n) { return giveBanana(item, n); },
        applied: function (n) {
          item.banana += n;
          item.thrown = true; // 投蕉不可取消：投过即锁定
          if (slide._banSync) slide._banSync();
        }
      });
    });
    slide._banSync = function () {
      banUI.count.textContent = fmt(item.banana);
      banUI.btn.classList.toggle('thrown', item.thrown); // 投过锁定蕉黄
      banUI.btn.title = item.thrown ? '今日已投过蕉啦' : '投蕉';
    };
  }
  if (item.cap.favorite) {
    // 收藏（0.9.143 官方口径）：点开=「选择收藏夹」层（多选勾选 + 行内新建 + 已藏回显；确定按
    // 三分支提交 add/updateFolder/remove，见 favpop）。旧的"单击直接落第一个夹"退役（0.9.30 起
    // 的 ensureFavFolder 默认夹体系随之退场）——未收藏默认勾第一个夹，点开即确定≈原一步路径。
    var favUI = railBtn({ mask: VIDEO_ICONS.favorite, svg: ICONS.star }, fmt(item.fav), '收藏', function (b) {
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      openFavFolderPop(b, {
        acId: item.id,
        favorited: !!item.favorited,
        done: function (res) {
          var was = !!item.favorited;
          item.favorited = !!res.favorited;
          // 收藏数是"被收藏总数"：态翻转才动 1（同一夹重复勾选不叠加）
          if (was !== item.favorited) item.fav = Math.max(0, (item.fav || 0) + (item.favorited ? 1 : -1));
          if (slide._favSync) slide._favSync();
        }
      });
    });
    favUI.btn.classList.toggle('on', item.favorited);
    slide._favSync = function () {
      favUI.count.textContent = fmt(item.fav);
      favUI.btn.classList.toggle('on', item.favorited);
    };
  }
  // 分享：打开私信分享面板（最近联系人一键发送；复制链接收纳在面板底部）。
  // home 带分享数（解析后 _shareSync 回填），sv 显示文字标签
  var shareUI = item.kind === 'home'
    ? railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, fmt(item.share), '私信分享给朋友', function (b) {
      openSharePanel(b, item);
    })
    : railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, '分享', '私信分享给朋友', function (b) {
      openSharePanel(b, item);
    });
  if (item.kind === 'home') slide._shareSync = function () { shareUI.count.textContent = fmt(item.share); };
  // 右侧功能区与上下翻页共用一个定位容器（箭头永远在功能区上方，不遮挡）。
  // 播放层（buildSlide 传 goTo=null，0.9.74）不建箭头：层内没有竖刷邻居，"上/下一个"无意义
  var side = el('div', 'acsv-side');
  if (goTo) {
    var arrows = el('div', 'acsv-arrows');
    var upBtn = elHtml('button', 'acsv-arrow acsv-arrow-up', ICONS.chevUp);
    upBtn.title = '上一个（↑）';
    upBtn.addEventListener('click', function () {
      goTo(FeedStore.current - 1);
    });
    var downBtn = elHtml('button', 'acsv-arrow acsv-arrow-down', ICONS.chevDn);
    downBtn.title = '下一个（↓）';
    downBtn.addEventListener('click', function () {
      goTo(FeedStore.current + 1);
    });
    arrows.appendChild(upBtn);
    arrows.appendChild(downBtn);
    side.appendChild(arrows);
  }
  side.appendChild(rail);
  slide.appendChild(side);
}

// 投蕉数量层：0.9.104 抽至 banpop.js（rail 与关注行流视频/文章行共享，同一「点第 N 根投 N」交互）

// home 条目解析完成后，把右侧栏/控制栏的计数与初始状态回填
export function onHomeResolved(slide, item) {
  if (slide._likeSync) slide._likeSync();
  if (slide._favSync) slide._favSync();
  if (slide._banSync) slide._banSync();
  if (slide._cmtSync) slide._cmtSync();
  if (slide._shareSync) slide._shareSync();
  if (slide._followSync) slide._followSync();
  if (slide._qBtn) slide._qBtn.textContent = item.qualities ? item.qualities[item.qIdx].label : '自动';
  // 作者面（0.9.82）：douga/info 回包已把真名/uid 写进 item.up——作者行在这里重刷，
  // 占位/空缺才可能被真实作者替换。此前只刷日期，写死的 @名字 永不更新（本批病灶）
  syncMetaUp(slide.querySelector('.acsv-meta'), item);
  var ds = slide.querySelector('.acsv-meta .acsv-date');
  if (ds) ds.textContent = item.date || '';
}
