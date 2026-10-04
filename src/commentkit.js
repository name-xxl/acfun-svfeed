// ---------- 评论条目 kit（0.9.133 自 comments.js 拆出：条目构建件 + 楼中楼展开件） ----------
// 全项目评论条目构建**单源**：commentItemOf（头像/名字/正文/meta/点赞回复转发三键/楼中楼递归）
// + expandSubComments（「展开 N 条回复」按钮 + sublist 分页追加）。消费方：comments.js 管线——
// 评论抽屉、行内（关注/广场共走 rowkit）、详情面板三个宿主全经它渲染；发送后乐观插入同源。
// 拆出纪律（同 cards.js 0.9.109 / rowkit.js 0.9.124）：**逐字搬运零逻辑改动**——类名与 DOM 形状
// 被 harness 断言钉着（view-follow 68 / detail-open 38）。
// **无状态 kit**（0.9.133 去全局耦合）：原直读全局 commentState 的三处（交互态分叉 mode、sublist
// 的 sourceId/stype）一律改经 opts 注入 { mode:'home'|'sv', sourceId, stype }，由消费方从自己的
// 状态取值。点击行为归消费方委托（back-refs 契约 _c/_n/_target 原样保留，commentListClick 在
// comments.js）；本模块不 import 任何视图/管线（cfg/net/ui/imicons/imgload/ubb 皆基建件）。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { el, fmt } from './ui.js';
import { GLYPHS } from './imicons.js';
import { imgInto } from './imgload.js';
import { renderCommentHtml } from './ubb.js';

// 楼中楼数组规整（subCommentsMap 三形态：数组 / {subComments} / 缺）
function normalizeSubs(subMap, cid) {
  if (!subMap) return [];
  var v = subMap[String(cid)] || subMap[cid];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.subComments) return v.subComments;
  return [];
}

// 原生 iconfont 字形图标（imicons.GLYPHS 登记表消费；el() 即 textContent，码点直写）
function glyph(codepoint) {
  return el('i', 'acsvg-glyph', codepoint);
}

// 条目构建单源。opts 注入（0.9.133，去全局读）：{ mode, sourceId, stype }——mode 是原
// commentState.kind 的交互态分叉（'home' 才有赞/回复/转发三键），sourceId/stype 供楼中楼拉取
export function commentItemOf(c, subMap, opts) {
  var item = el('div', 'acsv-citem');
  // 头像 + 昵称可点击进入用户主页
  var homeUrl = c.userId ? CFG.api.userBase + c.userId : null;
  var avLink = el('a', 'acsv-avlink');
  if (homeUrl) { avLink.href = homeUrl; avLink.target = '_blank'; avLink.title = '访问 ' + (c.userName || '') + ' 的空间'; }
  // headUrl 可能是字符串或 [{cdn,url}] 数组
  var hu = c.headUrl;
  if (Array.isArray(hu)) hu = (hu[0] && hu[0].url) || '';
  else if (hu && typeof hu === 'object') hu = hu.url || '';
  // 头像走共享加载器（0.9.77）：http 老头像归一 + 重试 + 默认头像兜底（此前直吃接口值且
  // split('?')[0]——混合内容裂图 / 签名 query 被剥，两坑同现）；类名 av 供既有尺寸规则消费
  imgInto(avLink, typeof hu === 'string' && hu ? hu : CFG.api.defaultAvatar, 'avatar', 'av');
  var body = el('div', 'acsv-cbody');
  var name = el('div', 'acsv-cname');
  if (homeUrl) {
    var na = el('a', null, c.userName || 'AcFun用户');
    na.href = homeUrl; na.target = '_blank';
    name.appendChild(na);
  } else {
    name.appendChild(el('span', null, c.userName || 'AcFun用户'));
  }
  if (c.isUp) name.appendChild(el('span', 'up', 'UP'));
  body.appendChild(name);
  var ctext = el('div', 'acsv-ctext');
  ctext.innerHTML = renderCommentHtml(c.content); // 内容先 esc 再 UBB 渲染（renderCommentHtml 内）
  body.appendChild(ctext);
  var meta = el('div', 'acsv-cmeta');
  meta.appendChild(el('span', null, c.postDate || ''));
  var like = null, replyBtn = null;
  // 点赞/回复/转发三键图标统一用动态页互动区同款 iconfont 字形（imicons.GLYPHS.feed*
  // 码点，字体抽屉内自注入）：点亮态切实心字形（feedLikeFill），颜色状态机由容器 color 驱动
  var likeGlyph = function (on) { return glyph(on ? GLYPHS.feedLikeFill : GLYPHS.feedLike); };
  if (opts.mode === 'home') {
    // 小视频模式纯浏览：点赞/回复仅推荐模式提供。
    // 点击统一委托在 drawer list 上（见 commentListClick），这里只挂数据引用，
    // 免得长列表每条评论两个监听器、innerHTML 重建时反复创建丢弃
    var on0 = !!(c.isLike || c.localLike);
    like = el('span', 'acsv-clike' + (on0 ? ' on' : ''));
    like._g = likeGlyph(on0);
    like.appendChild(like._g);
    var likeN = el('span', null, fmt((c.likeCount || 0) + (c.localLike ? 1 : 0)));
    like.appendChild(likeN);
    like.title = '点赞评论';
    like._c = c;
    like._n = likeN;
    meta.appendChild(like);
    replyBtn = el('span', 'acsv-creplybtn');
    replyBtn.appendChild(glyph(GLYPHS.feedComment));
    replyBtn.appendChild(document.createTextNode('回复'));
    replyBtn._target = { id: String(c.commentId), name: c.userName || 'AcFun用户' };
    meta.appendChild(replyBtn);
    // 转发到私信（0.9.50，官方无此入口）：按钮只挂数据引用，弹层与发送在 commentListClick 委托
    var fwdBtn = el('span', 'acsv-cfwdbtn');
    fwdBtn.appendChild(glyph(GLYPHS.feedRepost));
    fwdBtn.appendChild(document.createTextNode('转发'));
    fwdBtn.title = '转发这条评论到私信';
    fwdBtn._target = { id: String(c.commentId), name: c.userName || 'AcFun用户', content: c.content || '' };
    meta.appendChild(fwdBtn);
  } else {
    like = el('span', 'acsv-clike');
    like.appendChild(likeGlyph(false));
    like.appendChild(el('span', null, fmt(c.likeCount)));
    meta.appendChild(like);
  }
  body.appendChild(meta);
  var subs = normalizeSubs(subMap, c.commentId);
  var subBox = null;
  if (subs.length) {
    subBox = el('div', 'acsv-csub');
    subs.forEach(function (s) { subBox.appendChild(commentItemOf(s, null, opts)); });
    body.appendChild(subBox);
  }
  if ((c.subCommentCount || 0) > subs.length) {
    expandSubComments(body, c, subBox, opts);
  }
  item.appendChild(avLink);
  item.appendChild(body);
  return item;
}

// 楼中楼展开：comment/sublist 分页拉取，就地追加渲染（网页版交互）
// opts（0.9.133 注入）：{ mode, sourceId, stype }——sourceId/stype 原读全局 commentState 改注入
function expandSubComments(body, c, subBox, opts) {
  var more = el('button', 'acsv-cmore', '展开 ' + c.subCommentCount + ' 条回复');
  var pcursor = '';
  var loaded = subBox ? subBox.querySelectorAll('.acsv-citem').length : 0;
  function appendSubs(arr) {
    if (!arr.length) return;
    if (!subBox) { subBox = el('div', 'acsv-csub'); body.insertBefore(subBox, more); }
    arr.forEach(function (s) { subBox.appendChild(commentItemOf(s, null, opts)); });
  }
  more.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (more._busy) return;
    more._busy = true;
    more.textContent = '展开中…';
    request(CFG.api.commentSub + '?sourceId=' + opts.sourceId
      + '&sourceType=' + opts.stype
      + '&rootCommentId=' + c.commentId + '&pcursor=' + pcursor + '&count=' + CFG.comments.subCount, 'GET')
      .then(function (j) {
        more._busy = false;
        if (!j || j.result !== 0) { more.textContent = '展开失败，点击重试'; return; }
        appendSubs(j.subComments || []);
        loaded += (j.subComments || []).length;
        pcursor = j.pcursor;
        if (!pcursor || pcursor === 'no_more' || loaded >= (c.subCommentCount || 0)) more.remove();
        else more.textContent = '继续展开（剩 ' + ((c.subCommentCount || 0) - loaded) + ' 条）';
      }, function () {
        more._busy = false;
        more.textContent = '展开失败，点击重试';
      });
  });
  body.appendChild(more);
}
