// ---------- 私信分享面板（0.9.123 自 imshare.js 拆出：协议核心 ↔ 面板 UI 分居） ----------
// openSharePanel 一族：锚定浮层（place 模式走 **popplace.rowPlaceOf**——锚行/面板、**底对齐**；
// 与选择层的 anchorPlaceOf 是同一模块里的两套模型，常数一处收口，0.9.149）/搜索过滤/联系人行/分享按钮
// （分享上报 0.9.145 经 report.reportShare；外点收起 0.9.147 走 ui.closeOnOutsideClick）
//（含「捎句话」注册缝 setChatOpener 与 im-open 页哨兵）。单向依赖 imsend 的出口
//（ensureIm/ensureConnected/getContacts/fetchCards/isLogined/sendCmtShare/sendMomentShare），
// 核心完全不知道面板。纯搬迁零逻辑改动。
import { CFG } from './cfg.js';
import { el, toast, copyText, closeOnOutsideClick } from './ui.js';
import { rowPlaceOf, applyPlace, watchPlace } from './popplace.js';
import { imgInto } from './imgload.js';
import { testHook } from './dbg.js';
import { ensureIm, ensureConnected, getContacts, fetchCards, isLogined, sendCmtShare, sendMomentShare, sendOnce } from './imsend.js';
import { openMomentEditor, repostOf } from './momenteditor.js'; // 转发到动态（0.9.222）
import { reportShare } from './report.js'; // 分享上报（0.9.145）

// 聊天打开出口（0.9.114）：分享发送后「捎句话」要进与好友的会话——由 imdrawer 模块求值期
// 注册（openChat），本模块不再 import imdrawer（imshare↔imdrawer 互 import 环的一半，
// 0.9.114 断；注册缝先例=views.setItemOpener）。未注册时（理论不会有：home 页
// player→imdrawer 链必载本模块）点击 no-op——im-open 页哨兵 testHook('chatOpener') 钉注册态
var chatOpener = null;
export function setChatOpener(fn) { chatOpener = typeof fn === 'function' ? fn : null; }

// ---------- 分享面板 ----------
// 锚定在分享按钮左侧的浮层（banpop 同款挂载：随 slide 销毁自然回收，无全局监听残留）。
// opts（0.9.50，评论转发私信场景注入，rail 分享不传保持原状）：
//   host      弹层挂载点——缺省挂 btn.parentNode；评论场景必须换抽屉根：meta 行在
//             overflow-y:auto 的滚动列表里，浮层挂里面会被水平裁剪
//   popClass  位置修饰类（.acsv-sharepop-drawer：锚抽屉输入条上方）
//   headText  面板标题文案，缺省「分享给朋友」
// 分享卡锚定定位（0.9.105 用户裁决几何；0.9.149 几何收口 popplace.rowPlaceOf）：
// place={mode:'left-of'|'right-of', anchorEl, gap}——rect 计算落宿主的**内容坐标系**（+scroll 偏移）
// → 弹层随列表滚动天然跟随；**底部共用坐标**（弹层底=锚点底，XHS/需求原话）。默认无 place 时
// 保持 CSS right/bottom 偏移（rail/comments 调用零改动）
export function openSharePanel(btn, item, opts) {
  opts = opts || {};
  var existed = document.querySelector('.acsv-sharepop');
  if (existed) {
    var reuse = existed._anchor === btn;
    existed.remove();
    if (reuse) return; // 点同一个按钮：开→关
  }

  var pop = el('div', 'acsv-sharepop');
  pop._anchor = btn;
  if (opts.popClass) pop.classList.add(opts.popClass);

  var head = el('div', 'acsv-share-head');
  head.appendChild(el('span', null, opts.headText || '分享给朋友'));
  var closeBtn = el('button', 'acsv-share-close', '✕');
  closeBtn.addEventListener('click', function (ev) { ev.stopPropagation(); pop.remove(); });
  head.appendChild(closeBtn);
  pop.appendChild(head);

  // 搜索框：本地过滤联系人（Douyin 同款交互；不做全站用户搜索）
  var searchWrap = el('div', 'acsv-share-searchwrap');
  var search = el('input', 'acsv-share-search');
  search.placeholder = '搜索最近联系人';
  search.addEventListener('click', function (ev) { ev.stopPropagation(); });
  search.addEventListener('input', function () { filterRows(pop, search.value); });
  searchWrap.appendChild(search);
  pop.appendChild(searchWrap);

  var list = el('div', 'acsv-share-list');
  pop.appendChild(list);

  var foot = el('div', 'acsv-share-foot');
  var copyBtn = el('button', 'acsv-share-copy', '复制链接');
  copyBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    reportShare(item, 'COPY_LINK'); // 官方同形：选平台那一刻即记，与剪贴板成败无关
    copyText(item.shareUrl).then(function (ok) {
      toast(ok ? '已复制：' + item.shareUrl : '复制失败，请手动复制');
    });
  });
  // 转发到动态（0.9.222）：只在**拿得到源 pi** 时出（行卡/详情面板两处传 opts.pi）——
  // 引用块要源 UP/正文/配图，只有 pi 给得全；拿不到就不出这个键（宁缺勿编）
  var fwdPi = opts.pi;
  var fwdRepost = fwdPi ? repostOf(fwdPi) : null;
  if (fwdRepost) {
    var fwd = el('button', 'acsv-share-fwd', '转发到动态');
    fwd.addEventListener('click', function (ev) {
      ev.stopPropagation();
      pop.remove();
      openMomentEditor({ repost: fwdRepost, onDone: opts.onPosted });
    });
    foot.appendChild(fwd);
  }
  var centerLink = el('a', 'acsv-share-center', '消息中心');
  centerLink.href = 'https://message.acfun.cn/im';
  centerLink.target = '_blank';
  foot.appendChild(copyBtn);
  foot.appendChild(centerLink);
  pop.appendChild(foot);

  var wrap = opts.host || btn.parentNode;
  if (!opts.host) wrap.style.position = 'relative'; // host 自带定位（抽屉根是 absolute），不许覆写
  wrap.appendChild(pop);
  // 锚定模式（0.9.105 用户裁决几何；0.9.149 起几何收口 popplace.rowPlaceOf）：行流=右缘贴行左缘、
  // 面板=左缘贴面板右缘，**底对齐**；内容异步到达改高 → watchPlace 重算
  if (opts.place && opts.place.anchorEl) {
    pop.classList.add('acsv-sharepop-anch');
    watchPlace(pop, function () {
      if (!pop.isConnected || !opts.place.anchorEl.isConnected) return;
      var a = opts.place.anchorEl.getBoundingClientRect(), h = wrap.getBoundingClientRect();
      applyPlace(pop, rowPlaceOf(
        { left: a.left, top: a.top, right: a.right, bottom: a.bottom },
        { left: h.left, top: h.top, right: h.right, sl: wrap.scrollLeft || 0, st: wrap.scrollTop || 0 },
        { w: window.innerWidth, h: window.innerHeight },
        pop.offsetWidth, pop.offsetHeight, opts.place.mode, opts.place.gap
      ));
    });
  }

  // 外点收起（0.9.147 收口到 ui.closeOnOutsideClick：捕获相 + 常驻到拆除——
  // 旧内联实现点一下面板内部就把一次性监听吃掉，之后外点收不起来）
  closeOnOutsideClick(pop, [btn], function () { pop.remove(); });

  if (!isLogined()) {
    list.appendChild(el('div', 'acsv-share-tip', '私信需要先登录 AcFun 账号\n可先复制链接去站内分享'));
    return;
  }

  renderLoading(list, '正在连接私信…');
  ensureIm().then(function (inst) {
    return ensureConnected(inst).then(function () {
      return getContacts(inst).then(function (contacts) {
        if (!pop.isConnected) return;
        if (!contacts.length) {
          list.innerHTML = '';
          list.appendChild(el('div', 'acsv-share-tip', '还没有聊过天的朋友\n先在 A 站 APP / 网页和 TA 私聊一句\n再回来把这条分享给 TA'));
          return;
        }
        renderRows(pop, list, contacts, item, inst);
      });
    });
  }).catch(function () {
    if (!pop.isConnected) return;
    list.innerHTML = '';
    list.appendChild(el('div', 'acsv-share-tip', '私信连接失败，请稍后再试\n可先复制链接去站内分享'));
  });
}

function renderLoading(list, text) {
  list.innerHTML = '';
  var tip = el('div', 'acsv-share-tip', text);
  tip.appendChild(el('div', 'acsv-share-spin'));
  list.appendChild(tip);
}

function renderRows(pop, list, contacts, item, inst) {
  list.innerHTML = '';
  fetchCards(contacts.map(function (c) { return c.targetId; })).then(function (cards) {
    if (!pop.isConnected) return;
    contacts.forEach(function (c) {
      var card = cards[c.targetId] || {};
      var row = el('div', 'acsv-share-row');
      row.dataset.name = (card.name || '').toLowerCase();
      row.dataset.tid = c.targetId;

      // 头像走共享加载器（0.9.77，与私信列表同一份）：归一 + 重试 + 默认头像兜底
      imgInto(row, card.headUrl || CFG.api.defaultAvatar, 'avatar', 'acsv-share-av');

      var name = el('div', 'acsv-share-name', card.name || '用户 ' + c.targetId);
      if (c.unread > 0) {
        var dot = el('span', 'acsv-share-unread', c.unread > 99 ? '99+' : String(c.unread));
        name.appendChild(dot);
      }
      row.appendChild(name);

      var send = el('button', 'acsv-share-send', '分享');
      var shareText = String(item.title || '').slice(0, 400) + '\n' + item.shareUrl;
      send.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (send.disabled) return;
        send.disabled = true;
        send.textContent = '…';
        ensureConnected(inst) // 发前校验真实链路，断线先重连（列表读缓存，感知不到断线）
          .then(function () {
            // 评论转发（item.cmt 携原始 UBB payload）走 extra 通道发真表情；动态转发
            //（item.moment，0.9.122）同走 extra 发真图；普通分享纯文本
            return item.cmt
              ? sendCmtShare(inst, c.targetId, item.cmt, shareText.slice(0, CFG.im.maxLen))
              : item.moment
                ? sendMomentShare(inst, c.targetId, item.moment, shareText.slice(0, CFG.im.maxLen))
                : sendOnce(inst, c.targetId, shareText.slice(0, CFG.im.maxLen));
          })
          .then(function () {
            // 分享即发已完成：整体替换按钮节点——旧节点连同发送监听器一起销毁，新节点
            // 唯一行为是进聊天（捎句话，纯导航、输入框留空），结构上不可能经此按钮重发
            var chatBtn = el('button', 'acsv-share-send chat', '捎句话');
            chatBtn.title = '打开与 ' + (card.name || '好友') + ' 的聊天，补充一句';
            chatBtn.addEventListener('click', function (ev) {
              ev.stopPropagation();
              if (chatOpener) chatOpener(c.targetId); // 0.9.114：经注册缝（imdrawer 注册）
            });
            send.replaceWith(chatBtn);
            reportShare(item, 'IM'); // 发送成功才记（失败不算分享）；'IM' 为自创枚举（见 report.js 头注）
            toast('已私信分享给 ' + (card.name || '好友'));
          }, function (err) {
            send.disabled = false;
            send.textContent = '分享';
            var why = (err && err.message) || '';
            console.warn('[acsv-im] 发送失败', why,
              'linkState=' + ((inst.kernel && (inst.kernel.linkState || inst.kernel.isConnected)) || 'unknown'));
            toast(why.indexOf('send-timeout') === 0 || why.indexOf('send-rejected') === 0
              ? '发送失败，请稍后再试'
              : '发送失败：' + why.slice(0, 200), 10000);
          });
      });
      row.appendChild(send);
      list.appendChild(row);
    });
  });
}

function filterRows(pop, kw) {
  kw = String(kw || '').trim().toLowerCase();
  var rows = pop.querySelectorAll('.acsv-share-row');
  for (var i = 0; i < rows.length; i++) {
    var hit = !kw || (rows[i].dataset.name || '').indexOf(kw) > -1;
    rows[i].style.display = hit ? '' : 'none';
  }
}

// debug 构建测试钩子：harness 哨兵——「捎句话」出口注册状态（im-open 页断言；防未来重构
// 悄悄丢掉 imdrawer 的注册行 ⇒ 点击静默 no-op，这类断线只有注册态断言能兜住）
testHook('chatOpener', function () { return !!chatOpener; });
