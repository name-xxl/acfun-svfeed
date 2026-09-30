import { CFG } from './cfg.js';
import { ICONS, SITE_ICONS, VIDEO_ICONS } from './styles.js';
import { el, fmt, toast } from './ui.js';
import { FeedStore } from './feedstore.js';
import { setRealLike, setRealFollow, setRealFavorite, giveBanana } from './interact.js';
import { toggleItemComments } from './comments.js';
import { openSharePanel } from './imshare.js';

// ---------- 右侧操作栏 + 上下翻页箭头 ----------
// 从 buildSlide 抽出：头像/关注、点赞、评论、投蕉、收藏、分享。
// 箭头翻页依赖上层导航（scrollToIndex 在 player.js），经 goTo 参数注入保持依赖单向。

// busy 守卫三件套：请求期间挡重复点击，完成/拒绝都复位（interact 层正常不 reject，
// 这里兜住异常不让 busy 永久卡死）；done(ok) 收到布尔结果
function withBusy(item, key, send, done) {
  if (item[key]) return;
  item[key] = true;
  send().then(function (ok) { item[key] = false; done(ok === true); },
    function () { item[key] = false; done(false); });
}

export function buildSideRail(slide, item, goTo) {
  var rail = el('div', 'acsv-rail');
  if (item.head) {
    var avWrap = el('div', 'acsv-avwrap');
    var a = el('a');
    a.href = item.userId ? CFG.api.userBase + item.userId : item.shareUrl;
    a.target = '_blank';
    var av = el('img', 'acsv-avatar');
    av.referrerPolicy = 'no-referrer';
    av.src = item.head.split('?')[0];
    av.title = item.userName;
    a.appendChild(av);
    avWrap.appendChild(a);
    if (item.userId) {
      var fb = el('div', 'acsv-followbtn' + (item.isFollowing ? ' on' : ''), item.isFollowing ? '✓' : '+');
      fb.title = item.isFollowing ? '点击取消关注' : '关注 UP 主';
      fb.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var turnOn = !item.isFollowing;
        withBusy(item, 'followBusy', function () {
          fb.textContent = '…';
          return setRealFollow(item, turnOn);
        }, function (ok) {
          if (ok) {
            item.isFollowing = turnOn;
            fb.textContent = turnOn ? '✓' : '+';
            fb.classList.toggle('on', turnOn);
            fb.title = turnOn ? '点击取消关注' : '关注 UP 主';
            toast(turnOn ? '已关注 @' + item.userName : '已取消关注 @' + item.userName);
          } else {
            fb.textContent = item.isFollowing ? '✓' : '+';
            toast('关注失败（未登录？）');
          }
        });
      });
      avWrap.appendChild(fb);
    }
    rail.appendChild(avWrap);
    // 关注状态刷新（推荐模式由 douga/info 的 user.isFollowing 回填后调用）
    slide._followSync = function () {
      if (!item.userId) return;
      fb.textContent = item.isFollowing ? '✓' : '+';
      fb.classList.toggle('on', item.isFollowing);
      fb.title = item.isFollowing ? '点击取消关注' : '关注 UP 主';
    };
  }
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
  // 评论（两模式都在右栏，sourceType 由 item.stype 分发）
  var cmtUI = railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), '展开/收起评论（C）', function () {
    toggleItemComments(item);
  });
  slide._cmtSync = function () { cmtUI.count.textContent = fmt(item.comment); };
  if (item.cap.banana) {
    // 投蕉：弹数量层（对齐视频页"点第 N 根投 N"）；已投过则不可再展开
    var banUI = railBtn({ mask: VIDEO_ICONS.banana, svg: ICONS.banana }, fmt(item.banana), '投蕉', function (b) {
      if (item.thrown) { toast('已投过蕉啦，明天再来~'); return; }
      toggleBanPop(slide, b, item);
    });
    slide._banSync = function () {
      banUI.count.textContent = fmt(item.banana);
      banUI.btn.classList.toggle('thrown', item.thrown); // 投过锁定蕉黄
      banUI.btn.title = item.thrown ? '今日已投过蕉啦' : '投蕉';
    };
  }
  if (item.cap.favorite) {
    // 收藏
    var favUI = railBtn({ mask: VIDEO_ICONS.favorite, svg: ICONS.star }, fmt(item.fav), '收藏', function (b) {
      var turnOn = !item.favorited;
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      withBusy(item, 'favBusy', function () {
        return setRealFavorite(item, turnOn);
      }, function (ok) {
        if (ok) {
          item.favorited = turnOn;
          toast(turnOn ? '已加入收藏' : '已取消收藏');
        } else {
          toast('收藏失败（未登录？）');
        }
        b.classList.toggle('on', item.favorited);
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
  // 右侧功能区与上下翻页共用一个定位容器（箭头永远在功能区上方，不遮挡）
  var side = el('div', 'acsv-side');
  var arrows = el('div', 'acsv-arrows');
  var upBtn = el('button', 'acsv-arrow acsv-arrow-up', ICONS.chevUp);
  upBtn.title = '上一个（↑）';
  upBtn.addEventListener('click', function () {
    goTo(FeedStore.current - 1);
  });
  var downBtn = el('button', 'acsv-arrow acsv-arrow-down', ICONS.chevDn);
  downBtn.title = '下一个（↓）';
  downBtn.addEventListener('click', function () {
    goTo(FeedStore.current + 1);
  });
  arrows.appendChild(upBtn);
  arrows.appendChild(downBtn);
  side.appendChild(arrows);
  side.appendChild(rail);
  slide.appendChild(side);
}

// 投蕉数量选择弹层：默认全灰，悬停第 N 根时 1~N 一起变亮，点第 N 根投 N，点外部关闭
function toggleBanPop(slide, btn, item) {
  var existing = slide.querySelector('.acsv-banpop');
  if (existing) { existing.remove(); return; }
  var pop = el('div', 'acsv-banpop');
  var opts = [];
  var build = function (n) {
    var ob = el('button');
    ob.title = '投 ' + n + ' 根香蕉';
    var img = el('img');
    img.alt = '';
    img.src = VIDEO_ICONS.banana; // 默认灰
    img.addEventListener('error', function () { ob.textContent = n; });
    ob.appendChild(img);
    ob._img = img;
    ob.addEventListener('mouseenter', function () {
      opts.forEach(function (o, i) { o._img.src = i < n ? VIDEO_ICONS.bananaOn : VIDEO_ICONS.banana; });
    });
    ob.addEventListener('click', function (ev) {
      ev.stopPropagation();
      pop.remove();
      withBusy(item, 'banBusy', function () {
        return giveBanana(item, n);
      }, function (ok) {
        if (ok) {
          item.banana += n;
          item.thrown = true; // 投蕉不可取消：投过即锁定
          if (slide._banSync) slide._banSync();
          toast('投出 ' + n + ' 根香蕉');
        } else {
          toast('投蕉失败（未登录或今日已投完？）');
        }
      });
    });
    opts.push(ob);
    pop.appendChild(ob);
  };
  for (var n = 1; n <= 5; n++) build(n);
  pop.addEventListener('mouseleave', function () {
    opts.forEach(function (o) { o._img.src = VIDEO_ICONS.banana; });
  });
  btn.parentNode.style.position = 'relative';
  btn.parentNode.appendChild(pop);
  setTimeout(function () {
    document.addEventListener('click', function onDoc() {
      document.removeEventListener('click', onDoc);
      if (!pop.isConnected) return; // slide 已销毁（切源/退出）时闭包自然释放，不留全局监听
      pop.remove();
    });
  }, 0);
}

// home 条目解析完成后，把右侧栏/控制栏的计数与初始状态回填
export function onHomeResolved(slide, item) {
  if (slide._likeSync) slide._likeSync();
  if (slide._favSync) slide._favSync();
  if (slide._banSync) slide._banSync();
  if (slide._cmtSync) slide._cmtSync();
  if (slide._shareSync) slide._shareSync();
  if (slide._followSync) slide._followSync();
  if (slide._qBtn) slide._qBtn.textContent = item.qualities ? item.qualities[item.qIdx].label : '自动';
  var ds = slide.querySelector('.acsv-meta .acsv-date');
  if (ds) ds.textContent = item.date || '';
}
