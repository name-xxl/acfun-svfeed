// ---------- 我的页「关注列表」档（0.9.289 对齐原生 /member/feeds/following）----------
// 确认稿 docs/preview/follow-list-native.html（用户逐轮确认）；量取值与暗色换算、写链探针
// 全在 docs/api-research.md §16。接替 mytabs.buildFollowGroups（旧 chips+两 chip 形态随批退役，
// adminTab 壳留收藏夹单消费方）。**0.9.292 弹窗换族**：两张模态从原生 ac-modal 模仿态整体
// 换到设置面板家族（壳/页头/页脚/输入/按钮量值 = settingspanel SET_CSS，确认稿
// docs/preview/follow-modal-settings.html），确认弹层并入 pickpop.openConfirmPop 同族单源
//（私有 .acsv-flpcf 退役）；列表页本体（成员行/select/菜单）维持原生对齐稿不动。
//
// 结构映射（对齐原生）：chips 行 →「全部分组」select +「编辑分组」文字钮；组头改名/删除 →
// 编辑分组模态；成员行「移组/取关」两 chip → 行内「☰ 已关注」下拉钮（特别关注 action=14 /
// 取消特别关注 15 / 取消关注 2 / 设置分组=本模态）+ 模态（radio 选组 + 常驻添加输入行）。
// **明确不跟**：数字分页（0.9.219 尾部统一 listtail）、行内归属标签（原生没有，归属由
// select 过滤档 + 设置分组表达）、名字行勋章/认证小图标（2026-10-29 用户裁决不加，资产已采
// §16 备用）。
//
// 边界登记：
// · 确认弹层（取消特别关注/取消关注/删除分组）= pickpop.openConfirmPop 单源（0.9.292 起；
//   原生模仿态退役）。**不占 overlay 槽**——与全脚本删除类确认同口径（mytabs/评论区现行，
//   Esc 随宿主视图）；与行内菜单互斥由 openRowMenu 开场清扫 + 全页单枚（开新摘旧）保证。
//   非对称确认照旧：加特别关注直发不套确认。
// · 分组选择在此是**页面内模态**（radio+确定）；rail 角标的 grouppop（锚定浮层语义件）不动，
//   写链同走 relationapi.regroup(action=3)。
// · 组名校验单源 nameval.groupNameError（与原生 bundle 正则逐字符一致，§16 实锤）；校验失败/
//   保留字反馈 = 顶部警示条（模仿原生 ac-toast-warn，icon GLYPHS.toastWarn）。
// · 弹出层（select 下拉/行内菜单）共用单槽：同屏一个，Esc 走 overlay 栈（'fl-pop'），
//   外点走 ui.closeOnOutsideClick——无自带 window 按键监听（0.9.254 抢关出栈教训）；
//   确认卡的外点收起走 pickpop 自带 guardOutside。
import { CFG } from './cfg.js';
import { el, selfUid, toast, closeOnOutsideClick } from './ui.js';
import { root } from './state.js';
import { createListTail } from './listtail.js';       // 尾部单源（0.9.219 裁决，不跟数字分页）
import { createPageLoader } from './pageloader.js';   // 翻页骨架单源
import { skeletonRows } from './cards.js';
import { imgInto } from './imgload.js';
import { GLYPHS } from './imicons.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { openConfirmPop } from './pickpop.js';        // 确认卡单源（0.9.292 换族）
import { groupNameError } from './nameval.js';
import { errNotLogin } from './toastmsg.js';
import { getGroups, listFollows, createGroup, renameGroup, removeGroup, regroup,
  specialFollow, unSpecialFollow, unfollowUser } from './relationapi.js';

// 组表缓存（promise 级；任何写链后置 null 强制重拉）——select 档表/设置分组 radio/编辑分组
// 三处同源，不各拉一份
var groupsP = null;
function loadGroups() {
  if (!groupsP) {
    groupsP = getGroups().then(function (gs) { return gs; }, function (e) {
      groupsP = null;
      throw e;
    });
  }
  return groupsP;
}

// 弹层挂载点：**必须挂脚本根**（#acsv-root）——根是 fixed inset:0 z 2147483000 的不透明容器，
// 挂 document.body 的低 z 元素会被它整个盖住（0.9.289 真机报「弹窗不出」实锤）；根内 z 63/64/66
// 即 cssraw 层档语义（视图 55…更新 65 之上）。root 未建时退 body（ui.toast 同款容错）
function mountHost() { return root || document.body; }

// ---- 顶部警示条（模仿原生 ac-toast-warn：金黄 icon + 文案，~3s 自消；暗色下加 panel 底）----
var warnTimer = null;
function warnStrip(msg) {
  var old = document.querySelector('.acsv-flwarn');
  if (old) old.remove();
  var s = el('div', 'acsv-flwarn');
  s.appendChild(el('i', 'acsv-flico', GLYPHS.toastWarn));
  s.appendChild(document.createTextNode(msg));
  mountHost().appendChild(s);
  clearTimeout(warnTimer);
  warnTimer = setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 3000);
}

// ---- 弹出层单槽（select 下拉 / 行内菜单 / 确认弹层共用：同屏只留一个）----
// openPop(elm, keep, onClose)：elm 须已挂载；keep=外点豁免元素（toggle 钮本体，否则点钮收了
// 又被钮柄重开=永远收不掉）；onClose 在摘元素与出栈后调用（调用方清自己的标志位）。
var pop = null; // { close() }
function closePop() {
  if (!pop) return;
  var c = pop;
  pop = null;
  c.close();
}
function openPop(elm, keep, onClose) {
  closePop();
  var alive = true;
  function close() {
    if (!alive) return;
    alive = false;
    if (elm.parentNode) elm.parentNode.removeChild(elm);
    overlayClose('fl-pop'); // 已出栈时静默；重复调用安全
    if (onClose) onClose();
  }
  pop = { close: close };
  overlayOpen({ id: 'fl-pop', close: close });
  closeOnOutsideClick(elm, keep, function () { closePop(); });
  return close;
}

// 钮文案状态机（bundle buttonStatus 照搬，§16）：1=待回粉/2=已关注·互粉→已互粉/3=特别关注
function relLabel(item) {
  if (item.followingStatus === 3) return '特别关注';
  if (item.followingStatus === 1) return item.isFriend ? '回粉' : '关注';
  return item.isFriend ? '已互粉' : '已关注';
}

// ---- 确认卡（0.9.292 换族：pickpop.openConfirmPop 单源；title/text/okLabel/run/done 注入）----
// anchor=常驻锚元素（落位与外点豁免都认它）；host=挂载宿主（popplace 落位基准）。
// 全页同屏一枚：开新前摘旧（与弹出层单槽同口径）。busy/失败提示（层内 hint）由 pickpop 承担。
function openConfirmCard(anchor, opts) {
  var old = document.querySelector('.acsv-confirmpop');
  if (old) old.remove();
  return openConfirmPop(anchor, opts);
}

// ---- 模态壳（0.9.292 设置面板家族：页头左置标题+28 圆✕ / 滚动体 / 页脚右置 primary 确定）----
// overlayOpen(modal) 入栈：Esc 走浮层栈单点裁决；mask 区点击/右上叉两路同 close。
// buildBody(body, ok, close)：内容灌滚动体；确定键归属各模态（设置分组=发包，编辑分组=纯关）。
function openModal(id, title, buildBody) {
  closePop();
  var mask = el('div', 'acsv-flmask');
  var wrap = el('div', 'acsv-flm-wrap');
  var main = el('div', 'acsv-flm-main');
  var hd = el('div', 'acsv-flm-hd');
  hd.appendChild(el('div', 'acsv-flm-ttl', title));
  var x = el('button', 'acsv-flm-x', '✕');
  x.type = 'button';
  x.setAttribute('aria-label', '关闭');
  hd.appendChild(x);
  main.appendChild(hd);
  var body = el('div', 'acsv-flm-bd');
  main.appendChild(body);
  var foot = el('div', 'acsv-flm-foot');
  var ok = el('button', 'acsv-flm-ok', '确定');
  ok.type = 'button';
  foot.appendChild(ok);
  main.appendChild(foot);
  wrap.appendChild(main);
  mask.appendChild(wrap);
  mountHost().appendChild(mask);
  function close() {
    if (!mask.parentNode) return;
    mask.parentNode.removeChild(mask);
    overlayClose(id); // 已出栈时空转（Esc 路径先出栈再调 close）
  }
  x.addEventListener('click', close);
  wrap.addEventListener('click', function (ev) {
    if (ev.target === wrap || ev.target === mask) close(); // 面板外点击收（原生同款）
  });
  overlayOpen({ id: id, close: close, modal: true });
  buildBody(body, ok, close);
  return { close: close, body: body, ok: ok };
}

// ---- 添加输入行（两模态共用件）：返回 { li, acts }，由调用方挂载/重挂（render 清列表后
// 要把两件一起补回去）。placeholder 即原生校验文案——原生文案漏写「下划线」是它自己偏窄，
// 真实规则 /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,8}$/ 与 nameval.groupNameError 逐字符一致（§16）。
// 聚焦出「取消添加/添加分组」双小钮；校验失败/保留字 → 顶部警示条；成功 → toast + onCreated。
// opts：{ okLabel, onCreate(name)->Promise<id|true|null>（null=失败）, created(name), onCreated(made) }
function mountAddRow(opts) {
  var li = el('div', 'acsv-flm-addrow');
  var inp = el('input', 'acsv-flm-addin');
  inp.type = 'text';
  inp.placeholder = '+添加分组，分组名称应在1到8个字符之间，仅支持中文、英文、数字。';
  li.appendChild(inp);
  var acts = el('div', 'acsv-flm-addacts');
  acts.style.display = 'none';
  var cc = el('button', 'acsv-flm-sbtn', '取消添加');
  cc.type = 'button';
  var ok = el('button', 'acsv-flm-sbtn primary', opts.okLabel || '添加分组');
  ok.type = 'button';
  var okText = opts.okLabel || '添加分组';
  acts.appendChild(cc);
  acts.appendChild(ok);
  function stopEdit() {
    acts.style.display = 'none';
    inp.value = '';
  }
  inp.addEventListener('focus', function () { acts.style.display = ''; });
  cc.addEventListener('click', function () { stopEdit(); });
  function submit() {
    if (li._busy) return;
    var name = (inp.value || '').trim();
    var err = groupNameError(name); // 校验单源：正则+保留名，与原生 bundle 同形
    if (err) { warnStrip(err); return; }
    li._busy = true;
    ok.textContent = '…';
    opts.onCreate(name).then(function (made) {
      li._busy = false;
      ok.textContent = okText;
      if (!made) { warnStrip('添加分组失败（重名或未登录？）'); return; }
      stopEdit();
      toast(opts.created || '添加分组成功！');
      if (opts.onCreated) opts.onCreated(made);
    }, function () {
      li._busy = false;
      ok.textContent = okText;
      warnStrip('添加分组失败（未登录？）');
    });
  }
  ok.addEventListener('click', submit);
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
  });
  return { li: li, acts: acts };
}

// ---- 设置分组模态（radio 选组 + 底部添加行 + 红确定）----
// 写链 regroup(action=3)；选中未变时确定=空操作直接关（无变化不发废包）
function openGroupModal(item, ctx) {
  openModal('fl-group', '设置分组', function (body, ok, close) {
    body.appendChild(el('div', 'acsv-flm-grp', '请选择分组'));
    var listBox = el('div', 'acsv-flm-list');
    body.appendChild(listBox);
    var sel = item.groupId;
    var add = mountAddRow({
      onCreate: createGroup,
      onCreated: function () { groupsP = null; render(); } // 建组后组表置脏，radio 现拉
    });

    function pick(gid) {
      sel = String(gid);
      Array.prototype.forEach.call(listBox.querySelectorAll('.acsv-flm-gi'), function (gi) {
        gi.classList.toggle('on', gi.getAttribute('data-gid') === sel);
      });
    }
    function render() {
      return loadGroups().then(function (gs) {
        if (!listBox.isConnected) return;
        listBox.textContent = '';
        gs.forEach(function (g) {
          var gi = el('div', 'acsv-flm-gi' + (String(g.id) === sel ? ' on' : ''));
          gi.setAttribute('data-gid', String(g.id));
          gi.appendChild(el('span', 'acsv-flm-radio'));
          gi.appendChild(el('span', 'acsv-flm-gl', g.name || '未分组'));
          gi.addEventListener('click', function () { pick(g.id); });
          listBox.appendChild(gi);
        });
        listBox.appendChild(add.li);
        listBox.appendChild(add.acts);
      }, function () {
        if (listBox.isConnected && !listBox.children.length) {
          listBox.appendChild(el('div', 'acsv-vempty', '分组加载失败'));
        }
      });
    }
    render();
    ok.addEventListener('click', function () {
      if (ok._busy) return;
      if (sel === String(item.groupId)) { close(); return; } // 未变：空操作
      ok._busy = true;
      regroup(item.id, sel).then(function (good) {
        ok._busy = false;
        if (!good) { errNotLogin(); return; }
        var moved = sel;
        close();
        ctx.afterRegroup(item, moved);
      }, function () {
        ok._busy = false;
        errNotLogin();
      });
    });
  });
}

// ---- 编辑分组模态（组条改名/删除 + 底部添加行 + 页脚确定=关）----
// 系统组口径沿用旧 adminTab：未分组（id "0"）不进列表；特别关注只给改名不给删
//（删除套 pickpop 确认卡「…会移至未分组」；改名走内联输入条）
function openEditModal(ctx) {
  openModal('fl-edit', '编辑分组', function (body, ok, close) {
    var listBox = el('div', 'acsv-flm-list');
    body.appendChild(listBox);
    var add = mountAddRow({
      onCreate: createGroup,
      onCreated: function () { groupsP = null; render(); } // 建组后组表置脏，编辑列表现拉
    });

    function bar(g) {
      var li = el('div', 'acsv-flm-erow');
      li.setAttribute('data-gid', String(g.id));
      var gl = el('span', 'acsv-flm-gl', g.name || '');
      li.appendChild(gl);
      var ops = el('span', 'acsv-flm-gops');
      var rn = el('button', 'acsv-flm-gop', '改名');
      rn.type = 'button';
      rn.addEventListener('click', function () { startRename(); });
      ops.appendChild(rn);
      if (g.name !== '特别关注') { // 系统保留组不给删（未分组根本不进列表）
        var del = el('button', 'acsv-flm-gop', '删除');
        del.type = 'button';
        del.addEventListener('click', function () {
          openConfirmCard(del, {
            host: li,
            title: '删除分组',
            text: '确定删除分组「' + (g.name || '') + '」？该分组下的人会移至未分组。',
            okLabel: '确定',
            run: function () { return removeGroup(g.id); },
            done: function () {
              toast('已删除分组：' + (g.name || ''));
              groupsP = null;
              li.remove();
              ctx.afterGroupsChanged(g.id);
            }
          });
        });
        ops.appendChild(del);
      }
      li.appendChild(ops);

      function startRename() {
        li.textContent = '';
        var input = el('input', 'acsv-flm-rninput');
        input.type = 'text';
        input.maxLength = 8;
        input.value = g.name || '';
        var cc = el('button', 'acsv-flm-sbtn', '取消');
        cc.type = 'button';
        var sv = el('button', 'acsv-flm-sbtn primary', '确认');
        sv.type = 'button';
        var tail = el('span', 'acsv-flm-gops');
        tail.appendChild(cc);
        tail.appendChild(sv);
        li.appendChild(input);
        li.appendChild(tail);
        input.focus();
        cc.addEventListener('click', function () { render(); });
        sv.addEventListener('click', function () {
          if (li._busy) return;
          var name = (input.value || '').trim();
          var err = groupNameError(name);
          if (err) { warnStrip(err); return; }
          li._busy = true;
          renameGroup(g.id, name).then(function (good) {
            li._busy = false;
            if (!good) { warnStrip('改名失败（重名或未登录？）'); return; }
            toast('已改名：' + name);
            groupsP = null;
            render();
            ctx.afterGroupsChanged(null);
          }, function () {
            li._busy = false;
            warnStrip('改名失败（未登录？）');
          });
        });
      }
      return li;
    }

    function render() {
      return loadGroups().then(function (gs) {
        if (!listBox.isConnected) return;
        listBox.textContent = '';
        gs.forEach(function (g) {
          if (String(g.id) === '0') return; // 未分组：系统档不进编辑列表
          listBox.appendChild(bar(g));
        });
        listBox.appendChild(add.li);
        listBox.appendChild(add.acts);
      }, function () {
        if (listBox.isConnected && !listBox.children.length) {
          listBox.appendChild(el('div', 'acsv-vempty', '分组加载失败'));
        }
      });
    }
    render();
    ok.addEventListener('click', close);
  });
}

// ---- 档主体（mypage.panels.groups.build 入口）----
export function buildFollowAdmin(panel, scroller) {
  if (!selfUid()) { // 未登录：只出提示，不拉数据（与稍后再看同口径）
    panel.appendChild(el('div', 'acsv-vempty', '登录后可管理关注列表'));
    return;
  }
  var filterGid = '';       // '' = 全部分组（listFollows action=7）；组 id = 组内（action=9）
  var filterLabel = '全部分组';

  // 顶栏：select + 编辑分组
  var top = el('div', 'acsv-fltop');
  var selBtn = el('div', 'acsv-flselect', filterLabel);
  var arw = el('span', 'acsv-flarw', GLYPHS.edCaret);
  selBtn.appendChild(arw);
  var editBtn = el('button', 'acsv-fledit', '编辑分组');
  editBtn.type = 'button';
  top.appendChild(selBtn);
  top.appendChild(editBtn);
  panel.appendChild(top);

  var list = el('div', 'acsv-fllist');
  panel.appendChild(list);

  var rows = []; // { it, row, btn, paint } —— 行内原地改的句柄（写链后不整表重拉）

  var tail = null;
  var pg = createPageLoader({
    firstCursor: '', // 偏移量游标（首页空串；响应 pcursor 是偏移量，§2.3）
    host: function () { return list; },
    fetch: function (cursor) { return listFollows(filterGid, cursor); },
    skeleton: function () { return skeletonRows(list, CFG.view.me.skel, 'acsv-gskel'); }, // 每页都建，两路自动收（历史档同形）
    busyGate: function () { return rows.length > 0; }, // 首屏靠骨架，续拉用状态行
    setStatus: function (text, busy) { tail.setStatus(text, busy); },
    doneLabel: '已加载全部',
    failLabel: '加载失败，点击重试',
    onPage: function (p) {
      (p.items || []).forEach(function (it) { rows.push(addRow(it)); });
      if (!rows.length && !list.querySelector('.acsv-vempty')) {
        list.appendChild(el('div', 'acsv-vempty', filterGid === '' ? '还没有关注' : '这个分组还没有成员'));
      }
      return { cursor: p.nextCursor, noMore: !!p.noMore };
    }
  });
  tail = createListTail({
    root: panel, scrollEl: scroller || panel, pad: CFG.view.me.scrollPad,
    backTopAt: CFG.view.me.backTopAt, onBottom: pg.load, onRetry: pg.load
  });

  function emptyCheck() {
    if (!rows.length && !list.querySelector('.acsv-vempty')) {
      list.appendChild(el('div', 'acsv-vempty', filterGid === '' ? '还没有关注' : '这个分组还没有成员'));
    }
  }
  function removeEntry(it) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].it === it) { rows[i].row.remove(); rows.splice(i, 1); return; }
    }
  }

  // 写链善后：组数据置脏 + 过滤档是特定组且成员已离席 → 摘行；空则出空态
  function afterRegroup(it, moved) {
    it.groupId = String(moved);
    groupsP = null;
    if (filterGid !== '' && String(filterGid) !== String(moved)) removeEntry(it);
    emptyCheck();
  }

  // 成员行：头像 60 圆链接 + 名 16 + data 三段 + 签名 2 行钳 + 行内关系钮（菜单/确认弹层挂 acts）
  function addRow(it) {
    var row = el('div', 'acsv-flrow');
    var a = el('a', 'acsv-flrow-link');
    a.href = CFG.api.userBase + it.id;
    a.target = '_blank';
    a.rel = 'noopener';
    imgInto(a, it.head || CFG.api.defaultAvatar, 'avatar', 'acsv-flav');
    row.appendChild(a);
    var info = el('div', 'acsv-flinfo');
    var name = el('a', 'acsv-flname', it.name);
    name.href = a.href;
    name.target = '_blank';
    name.rel = 'noopener';
    info.appendChild(name);
    var data = el('div', 'acsv-fldata');
    if (it.followCount) data.appendChild(el('span', null, '关注:' + it.followCount));
    if (it.fans) data.appendChild(el('span', null, '粉丝:' + it.fans));
    if (it.contrib) data.appendChild(el('span', null, '投稿:' + it.contrib));
    info.appendChild(data);
    if (it.sign) info.appendChild(el('div', 'acsv-flsign', it.sign));
    row.appendChild(info);

    var acts = el('div', 'acsv-flacts');
    var btn = el('button', 'acsv-relbtn');
    btn.type = 'button';
    btn.appendChild(el('i', 'acsv-flico', GLYPHS.followList));
    var label = document.createTextNode(relLabel(it));
    btn.appendChild(label);
    acts.appendChild(btn);
    row.appendChild(acts);
    list.appendChild(row);

    function paint() { label.textContent = relLabel(it); }
    btn.addEventListener('click', function () {
      if (pop) { closePop(); return; } // 钮二连点=收（外点豁免里含 btn，收放都走这）
      openRowMenu(it, acts, btn, {
        paint: paint,
        removeRow: function () {
          removeEntry(it);
          toast('已取消关注 @' + it.name);
          groupsP = null;
          emptyCheck();
        },
        afterRegroup: afterRegroup
      });
    });
    return { it: it, row: row, btn: btn, paint: paint };
  }

  // 行内菜单：特别关注(14)/取消特别关注(15，确认卡)/取消关注(2，确认卡)/设置分组(模态)
  // 非对称确认照原生：加特别关注直接发，取消类两键套 pickpop 确认卡（菜单收、卡开；
  // 锚=☰ 钮、宿主=acts，落位/外点收起归 pickpop）。开场摘掉可能残存的确认卡（全页单枚）。
  function openRowMenu(it, acts, btn, ctx) {
    var stray = document.querySelector('.acsv-confirmpop');
    if (stray) stray.remove();
    var menu = el('div', 'acsv-relmenu');
    var defs = [];
    if (it.followingStatus === 3) {
      defs.push({
        label: '取消特别关注', title: '取消特别关注', confirm: '是否取消特别关注？',
        run: function () { return unSpecialFollow(it.id); },
        done: function () { it.followingStatus = 2; ctx.paint(); }
      });
    } else {
      defs.push({
        label: '特别关注',
        run: function () { return specialFollow(it.id); }, // 无确认（原生非对称确认）
        done: function () { it.followingStatus = 3; ctx.paint(); }
      });
    }
    defs.push({
      label: '取消关注', title: '取消关注', confirm: '是否取消关注？',
      run: function () { return unfollowUser(it.id); },
      done: function () { ctx.removeRow(); }
    });
    defs.push({ label: '设置分组' }); // 开模态
    defs.forEach(function (d) {
      var mi = el('button', 'acsv-flmi', d.label);
      mi.type = 'button';
      mi.addEventListener('click', function () {
        if (mi._busy) return;
        if (!d.run) { closePop(); openGroupModal(it, ctx); return; }
        if (d.confirm) {
          closePop();
          openConfirmCard(btn, {
            host: acts, title: d.title, text: d.confirm, okLabel: '确定',
            run: d.run, done: d.done
          });
        } else {
          mi._busy = true;
          d.run().then(function (good) {
            mi._busy = false;
            closePop();
            if (!good) { errNotLogin(); return; }
            d.done();
          }, function () {
            mi._busy = false;
            closePop();
            errNotLogin();
          });
        }
      });
      menu.appendChild(mi);
    });
    acts.appendChild(menu);
    openPop(menu, [btn]);
  }

  // 编辑分组
  editBtn.addEventListener('click', function () {
    openEditModal({
      afterGroupsChanged: function (deletedGid) {
        groupsP = null;
        if (deletedGid != null && filterGid !== '' && String(filterGid) === String(deletedGid)) {
          // 当前过滤档被删：回落「全部分组」重拉（游标回首屏）
          filterGid = '';
          filterLabel = '全部分组';
          selBtn.firstChild.nodeValue = filterLabel;
          reloadList();
        }
      }
    });
  });

  // 过滤档下拉（同走弹出层单槽；档表现拉，写链后 groupsP 已置脏）
  selBtn.addEventListener('click', function () {
    if (pop && pop.kind === 'sel') { closePop(); return; }
    if (pop) { closePop(); }
    loadGroups().then(function (gs) {
      var menuEl = el('div', 'acsv-flmenu');
      var defs = [{ id: '', label: '全部分组' }].concat(gs.map(function (g) {
        return { id: String(g.id), label: g.name || '未分组' };
      }));
      defs.forEach(function (d) {
        var opt = el('div', 'acsv-flopt' + (d.id === filterGid ? ' on' : ''), d.label);
        opt.addEventListener('click', function () {
          var changed = d.id !== filterGid;
          closePop();
          if (!changed) return;
          filterGid = d.id;
          filterLabel = d.label;
          selBtn.firstChild.nodeValue = filterLabel;
          reloadList();
        });
        menuEl.appendChild(opt);
      });
      // 菜单挂 top（不挂 selBtn）：选项点击若冒泡回 selBtn 的 toggle 柄会「选完即关」
      //（harness fg-select-all 实锤）；top 加 position:relative 后坐标与挂 selBtn 完全一致
      top.appendChild(menuEl);
      arw.classList.add('up');
      openPop(menuEl, [selBtn], function () { arw.classList.remove('up'); });
      pop.kind = 'sel';
    }, function () {
      warnStrip('分组加载失败');
    });
  });

  // 过滤档切换：清列表 → 回第一页（骨架由 pageloader 钩子每页自建自收；
  // pageloader.reset 作废在途回包）
  function reloadList() {
    pg.reset();
    rows.length = 0;
    list.textContent = '';
    pg.load();
  }

  pg.load();
}
