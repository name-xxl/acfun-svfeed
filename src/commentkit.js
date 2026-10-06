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
import { el, esc, fmt } from './ui.js';
import { GLYPHS } from './imicons.js';
import { imgInto } from './imgload.js';
import { renderCommentHtml } from './ubb.js';
import { nameColorCss, frameUrlOf } from './uplook.js'; // 观感纯函数（0.9.134；字段真机核对在册；0.9.160 叶子出库）

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

// 楼中楼回复前缀 HTML（0.9.134）：字段**双读**（真机双源不同名——动态侧 replyToUserName /
// 视频侧 replyToName；+replyTo 为目标 uid）；值不齐不加，@名链 /u/{replyTo}（plaza 同款结构）
function replyPrefixHtml(c) {
  var n = c.replyToUserName || c.replyToName;
  var id = Number(c.replyTo) || 0;
  if (!n || !id) return '';
  return '<span class="acsv-cpre">回复 <a class="acsv-creplyto" href="' + CFG.api.userBase + id
    + '" target="_blank" rel="noopener">@' + esc(n) + '</a> : </span>';
}

// 子评论 opts 派生（楼中楼上下文）：isSec 三处限定——回复前缀在、头像框/楼层不在
function subOptsOf(opts) {
  return { mode: opts.mode, sourceId: opts.sourceId, stype: opts.stype, isSec: true };
}

// 条目构建单源。opts 注入（0.9.133，去全局读）：{ mode, sourceId, stype }——mode 是原
// commentState.kind 的交互态分叉（'home' 才有赞/回复/转发三键），sourceId/stype 供楼中楼拉取。
// 版式自 0.9.138 全语境统一「原生形态」（真机量值：50px 头像/条目 18px 顶距/楼中楼 30+700/
// 「共 N 条回复, 点击查看」——几何在 styles 基础规则，皮肤只差颜色；0.9.135 的 form 分派已撤）
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
  var nameChild = null;
  if (homeUrl) {
    var na = el('a', null, c.userName || 'AcFun用户');
    na.href = homeUrl; na.target = '_blank';
    name.appendChild(na);
    nameChild = na;
  } else {
    nameChild = el('span', null, c.userName || 'AcFun用户');
    name.appendChild(nameChild);
  }
  // 名字等级色（0.9.134，真机 nameColor 0/1/2）：2=紫、1=红、0/缺失不加色（根+楼中楼同款）
  var ncss = nameColorCss(c.nameColor);
  if (ncss) nameChild.style.color = ncss;
  // （0.9.137 撤除）isUp →「UP」标：真机核对（2026-10-04，视频 /v/ac26640967 56 条 + 文章
  // /a/ac48885762 19 条 + feeds 动态展开区）——A站 pc 评论组件三域均**不渲染任何 UP 标识**
  //（标题行只有 名字/发表于/时间），此前自加的标与原生不符
  // 日期并入名字行「发表于 x」（0.9.136 两形态统一，native 版式）：工具行不再放日期——
  // 设备件上身后 meta 行过挤，窄容器（抽屉 412px；0.9.190 前 380）会逐字断行。0.9.140：两件裹进 .acsv-cdate
  // 作**不可拆单元**（实报「子评论的时间换行在中间断开」：名字行 flex-wrap 会在「发表于」与
  // 时间之间断行；包裹后要么整体留在名字行、要么整体换到下一行）
  var cdate = el('span', 'acsv-cdate');
  cdate.appendChild(el('span', 'acsv-cpostday', '发表于'));
  cdate.appendChild(el('span', 'acsv-cposttime', c.postDate || ''));
  name.appendChild(cdate);
  body.appendChild(name);
  var ctext = el('div', 'acsv-ctext');
  // 前缀仅子评论（0.9.134「回复 @名 :」；根不拼）——内容先 esc 再 UBB 渲染（renderCommentHtml 内）
  ctext.innerHTML = (opts.isSec ? replyPrefixHtml(c) : '') + renderCommentHtml(c.content);
  body.appendChild(ctext);
  var meta = el('div', 'acsv-cmeta');
  var like = null, replyBtn = null;
  // 点赞/回复/转发三键图标统一用动态页互动区同款 iconfont 字形（imicons.GLYPHS.feed*
  // 码点，字体抽屉内自注入）：点亮态切实心字形（feedLikeFill），颜色状态机由容器 color 驱动
  var likeGlyph = function (on) { return glyph(on ? GLYPHS.feedLikeFill : GLYPHS.feedLike); };
  if (opts.mode === 'home') {
    // 小视频模式纯浏览：点赞/回复仅推荐模式提供。
    // 点击统一委托在 drawer list 上（见 commentListClick），这里只挂数据引用，
    // 免得长列表每条评论两个监听器、innerHTML 重建时反复创建丢弃
    // 已赞态（0.9.134 实锤修复）：列表真机字段=isLiked（isLike 字段不存在）——三读兜底
    var on0 = !!(c.isLiked || c.isLike || c.localLike);
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
  // 设备「来自 x」（0.9.134）：deviceModel 真机双源在册，链官方 APP 落点（plaza 同款；根+子都显）
  if (c.deviceModel) {
    var from = el('span', 'acsv-cfrom');
    from.appendChild(el('span', null, '来自'));
    var fa = el('a', null, c.deviceModel);
    fa.href = '//www.acfun.cn/app/';
    fa.target = '_blank';
    fa.rel = 'noopener';
    from.appendChild(fa);
    meta.appendChild(from);
  }
  body.appendChild(meta);
  var subs = normalizeSubs(subMap, c.commentId);
  var subBox = null;
  if (subs.length) {
    subBox = el('div', 'acsv-csub');
    subs.forEach(function (s) { subBox.appendChild(commentItemOf(s, null, subOptsOf(opts))); });
    body.appendChild(subBox);
  }
  if ((c.subCommentCount || 0) > subs.length) {
    expandSubComments(body, c, subBox, opts);
  }
  // 头像框覆盖层（0.9.134）：**仅根评论**（native 同款，子评论不显）——36px 头像等比几何见 CSS；
  // 装饰图失败语义=整框摘除（imgload 的 defaultAvatar 兜底会误盖头像，故走 eslint 白名单手建）
  if (!opts.isSec) {
    var frameUrl = frameUrlOf(c);
    if (frameUrl) {
      var fr = el('img', 'acsv-cavframe');
      fr.src = frameUrl;
      fr.alt = '';
      fr.addEventListener('error', function () { fr.remove(); });
      avLink.appendChild(fr);
    }
  }
  // 楼层 #N（0.9.134）：**仅根评论**（子评论 floor 是线程内序号且会重复 1，native 不显）
  if (!opts.isSec && c.floor) {
    item.appendChild(el('span', 'acsv-cfloor', '#' + c.floor));
  }
  // 条目间分割线（0.9.136）：仅根评论（native 同款——楼中楼不画）；皮肤定色（深色白 7% /
  // 内嵌原生 #e6e6e6）；绝对定位贴条目底——item 是 flex 行，直接当子节点会成第三列
  if (!opts.isSec) item.appendChild(el('hr', 'acsv-chr'));
  item.appendChild(avLink);
  item.appendChild(body);
  return item;
}

// 楼中楼展开：comment/sublist 分页拉取，就地追加渲染（网页版交互）
// opts（0.9.133 注入）：{ mode, sourceId, stype }——sourceId/stype 原读全局 commentState 改注入
function expandSubComments(body, c, subBox, opts) {
  // 文案（0.9.138 全语境统一原生措辞）
  var more = el('button', 'acsv-cmore', '共 ' + c.subCommentCount + ' 条回复, 点击查看');
  var pcursor = '';
  var loaded = subBox ? subBox.querySelectorAll('.acsv-citem').length : 0;
  function appendSubs(arr) {
    if (!arr.length) return;
    if (!subBox) { subBox = el('div', 'acsv-csub'); body.insertBefore(subBox, more); }
    arr.forEach(function (s) { subBox.appendChild(commentItemOf(s, null, subOptsOf(opts))); });
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
