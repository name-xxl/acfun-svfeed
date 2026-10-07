import { el, fmt, toast } from './ui.js';
import { CFG } from './cfg.js';
import { GLYPHS } from './imicons.js';
import { likePi, throwBananaPi } from './interact.js';
import { toggleBananaPop } from './banpop.js';
import { ubbPlain } from './ubbtext.js';
import { commentShareWire } from './immsg.js';
import { momentExtraOf } from './panelitem.js';
import { errNotLogin } from './toastmsg.js'; // 话术单源（0.9.212 批⑧）

// ---------- 动态互动栏（0.9.105 自 followview/momentdetail 收口共享） ----------
// 两个消费面（行流卡 / 详情面板）此前各一套：键集不同（面板缺分享）、尺寸不同（48/42/12px
// vs 26 间距/13px）、乐观编排各抄一份。收口后：**键定义表 + 写链编排单源**，皮肤经 skin
// 参数分派（类名前缀/尺寸由 CSS 按根类作用域各自生效——类名沿用旧值，测试钉子不破）：
//   行流   skin='row'    → 根 .acsv-frow-acts，键带 .acsv-fact（行 CSS 已 scope 到该根）
//   面板   skin='detail' → 根 .acsv-mdetail-actions，键带 .acsv-mdl-* 旧类名（同挂 .acsv-fact）
// 键序统一为原生四件套：分享 / 评论 / 蕉 / 赞。图标码点=原生（0.9.101 采样在册）。
// 写链语义：点赞乐观+回滚（文章只读——写链未实测）；投蕉不可逆锁、已投 toast、动态单蕉直投、
// 视频/文章走数量层（banpop 共享件）；全部经 interact.likePi/throwBananaPi（pi 级写路径单源）。

// 分享 wire（0.9.105 自 followview.actShare 下沉）：标题=@作者：正文/标题明文（parseShare
// 两端出分享卡契约）；URL=视频官方页或条目 href
export function momentShareItemOf(pi) {
  var text = pi.ct === 'moment' ? ubbPlain(pi.text) : (pi.title || '');
  var url = pi.ct === 'video' ? CFG.api.videoBase + pi.acId : pi.href;
  var item = { title: commentShareWire(pi.up && pi.up.name, text), shareUrl: url };
  // 动态携 extra 载荷（0.9.122）：接收端脚本渲染真图动态卡；官方客户端只看 wire 文本
  if (pi.ct === 'moment') item.moment = momentExtraOf(pi);
  return item;
}

function syncLike(btn, pi) {
  btn.classList.toggle('on', !!pi.liked);
  btn.title = pi.liked ? '已赞' : '点赞';
  var g = btn.querySelector('.acsvg-glyph');
  if (g) g.textContent = pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike;
  if (btn._n) btn._n.textContent = fmt(pi.like);
}

function syncBanana(btn, pi) {
  btn.classList.toggle('thrown', !!pi.thrown); // 蕉黄态（#ffb323；.on 是赞的 accent）
  btn.title = pi.thrown ? '已投蕉' : '投蕉';
  var g = btn.querySelector('.acsvg-glyph');
  if (g) g.textContent = pi.thrown ? GLYPHS.feedBananaFill : GLYPHS.feedBanana;
  if (btn._n) btn._n.textContent = fmt(pi.banana);
}

// 互动栏外部同步（0.9.127）：行卡数据被后台回填（广场新鲜度刷新）后，按当前 pi 把赞/蕉/评论
// 三处刷到最新——按 _act 找键复用内部同步件；行已拆/找不到键静默（调用方无需判存活性）
export function syncRowBar(row, pi) {
  if (!row) return;
  [].forEach.call(row.querySelectorAll('.acsv-fact'), function (b) {
    if (b._act === 'like') syncLike(b, pi);
    else if (b._act === 'banana') syncBanana(b, pi);
    else if (b._act === 'comment' && b._n) b._n.textContent = fmt(pi.comment);
  });
}

function wireLike(btn, pi) {
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (pi.ct === 'article') return; // 文章点赞写链未实测：只读（动态/视频照常）
    if (pi.likeBusy) return;
    pi.likeBusy = true;
    var on = !pi.liked;
    pi.liked = on;
    pi.like += on ? 1 : -1;
    syncLike(btn, pi);
    likePi(pi, on).then(function (ok) {
      pi.likeBusy = false;
      if (ok) return;
      pi.liked = !on; // 失败回滚（乐观值全退，rail 同款）
      pi.like += on ? -1 : 1;
      syncLike(btn, pi);
      errNotLogin();
    });
  });
}

function wireBanana(btn, pi) {
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (pi.banBusy) return;
    if (pi.thrown) { toast('已投过蕉啦，明天再来~'); return; } // rail 同款语义
    if (pi.ct === 'moment') {
      // 动态：单蕉直投（官方机制=一蕉，resourceType=10）；不可逆——失败只 toast 不回滚
      pi.banBusy = true;
      throwBananaPi(pi).then(function (ok) {
        pi.banBusy = false;
        if (!ok) { toast('投蕉失败（今日已投过/未登录？）'); return; }
        pi.thrown = true;
        pi.banana += 1;
        syncBanana(btn, pi);
        toast('投蕉成功');
      });
      return;
    }
    // 视频/文章：视频页同款数量层（点第 N 根投 N；文章 resourceType=3 未实测标注在 interact）
    toggleBananaPop(btn, {
      anchorBtn: true, // 动作条横贯整卡 ⇒ 弹层必须按按钮矩形锚（0.9.207），否则飞到最右端
      send: function (n) { return throwBananaPi(pi, n); },
      applied: function (n) { pi.banana += n; pi.thrown = true; syncBanana(btn, pi); }
    });
  });
}

// 建互动栏。opts = { skin:'row'|'detail', onShare(btn)?, onComment(btn)? }
// 无 onShare/onComment 时对应键不建（面板无评论外链语境时也传回调——两消费面现全传）
export function momentBarOf(pi, opts) {
  opts = opts || {};
  var detail = opts.skin === 'detail';
  var bar = el('div', detail ? 'acsv-mdetail-actions' : 'acsv-frow-acts');
  function item(k, o) {
    var cls = 'acsv-fact' + (detail && o.detailCls ? ' ' + o.detailCls : '') + (o.cls ? ' ' + o.cls : '');
    var b = el('span', cls);
    b._act = k;
    b.title = o.title;
    b.appendChild(el('i', 'acsvg-glyph', o.glyph));
    if (o.text) b.appendChild(el('span', null, o.text)); // 分享=文字无计数（原生同款）
    if (o.n != null) {
      var n = el('span', null, fmt(o.n));
      b.appendChild(n);
      b._n = n;
    }
    bar.appendChild(b);
    return b;
  }
  if (opts.onShare) {
    var share = item('share', {
      glyph: GLYPHS.feedRepost, text: '分享', title: '分享',
      detailCls: 'acsv-mdl-fwd'
    });
    share.addEventListener('click', function (ev) { ev.stopPropagation(); opts.onShare(share); });
  }
  var cmt = item('comment', { glyph: GLYPHS.feedComment, n: pi.comment, title: '评论', detailCls: 'acsv-mdl-cmt' });
  if (opts.onComment) cmt.addEventListener('click', function (ev) { ev.stopPropagation(); opts.onComment(cmt); });
  var ban = item('banana', {
    glyph: pi.thrown ? GLYPHS.feedBananaFill : GLYPHS.feedBanana, n: pi.banana,
    title: pi.thrown ? '已投蕉' : '投蕉', cls: pi.thrown ? 'thrown' : '', detailCls: 'acsv-mdl-ban'
  });
  wireBanana(ban, pi);
  var like = item('like', {
    glyph: pi.liked ? GLYPHS.feedLikeFill : GLYPHS.feedLike, n: pi.like,
    title: pi.liked ? '已赞' : '点赞', cls: pi.liked ? 'on' : '', detailCls: 'acsv-mdl-like'
  });
  wireLike(like, pi);
  return bar;
}
