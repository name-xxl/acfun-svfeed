// ---------- 我的页「关注列表」档（0.9.289 对齐原生 /member/feeds/following）----------
// 确认稿 docs/preview/follow-list-native.html（用户逐轮确认）；量取值与暗色换算、写链探针
// 全在 docs/api-research.md §16。**0.9.292 弹窗换族**：两张模态整体换设置面板家族（确认稿
// docs/preview/follow-modal-settings.html），确认弹层并入 pickpop.openConfirmPop 同族单源。
// **0.9.293 档头/管理模态出库**：顶部选择栏与编辑分组模态收进 meadmin 共用件
//（确认稿 docs/preview/me-tabhead.html——收藏夹/历史/关注列表三档同构），本件只留
// 关注列表本体（成员行/行内菜单/设置分组 radio 模态）与档位数据注入。
//
// 结构映射（对齐原生）：顶栏=mehead（「全部分组」select +「编辑分组」文字钮）；组头改名/删除 →
// 编辑分组模态（meadmin.openManageModal）；成员行「移组/取关」两 chip → 行内「☰ 已关注」
// 下拉钮（特别关注 action=14 / 取消特别关注 15 / 取消关注 2 / 设置分组=本模态）。
// **明确不跟**：数字分页（0.9.219 尾部统一 listtail）、行内归属标签（原生没有，归属由
// select 过滤档 + 设置分组表达）、名字行勋章/认证小图标（2026-10-29 用户裁决不加，资产已采
// §16 备用）。
//
// 边界登记：
// · 确认弹层（取消特别关注/取消关注/删除分组）= pickpop.openConfirmPop 单源（0.9.292 起）。
//   **不占 overlay 槽**——与全脚本删除类确认同口径（mytabs/评论区现行，Esc 随宿主视图）；
//   非对称确认照旧：加特别关注直发不套确认。
// · 分组选择在此是**页面内模态**（radio+确定，壳=meadmin.openMmModal）；rail 角标的
//   grouppop（锚定浮层语义件）不动，写链同走 relationapi.regroup(action=3)。
// · 组名校验单源 nameval.groupNameError（与原生 bundle 正则逐字符一致，§16 实锤）经 opts
//   注入 meadmin；校验失败/保留字反馈 = 顶部警示条（meadmin.mmWarn）。
// · 弹出层互斥：行内菜单走本件单槽（overlay 'fl-pop'），档头 select 菜单自持
//   （meadmin 'mehead-pop'）——两缝互关（mehead.onOpen→closePop；openRowMenu→head.closeMenu），
//   无 window 按键监听（0.9.254 抢关出栈教训）。
import { CFG } from './cfg.js';
import { el, selfUid, toast, closeOnOutsideClick } from './ui.js';
import { createListTail } from './listtail.js';       // 尾部单源（0.9.219 裁决，不跟数字分页）
import { createPageLoader } from './pageloader.js';   // 翻页骨架单源
import { skeletonRows } from './cards.js';
import { imgInto } from './imgload.js';
import { GLYPHS } from './imicons.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { createMeHead, openMmModal, openManageModal, openMmConfirm, mountMmAddRow, mmWarn } from './meadmin.js';
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

// ---- 弹出层单槽（行内菜单：同屏只留一个；档头 select 菜单在 meadmin 自持，两缝互关）----
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

// ---- 设置分组模态（radio 选组 + 底部添加行 + 页脚确定；壳=meadmin.openMmModal）----
// 写链 regroup(action=3)；选中未变时确定=空操作直接关（无变化不发废包）
function openGroupModal(item, ctx) {
  openMmModal('fl-group', '设置分组', function (body, ok, close) {
    body.appendChild(el('div', 'acsv-mm-grp', '请选择分组'));
    var listBox = el('div', 'acsv-mm-list');
    body.appendChild(listBox);
    var sel = item.groupId;
    var add = mountMmAddRow({
      placeholder: '+添加分组，分组名称应在1到8个字符之间，仅支持中文、英文、数字。',
      okLabel: '添加分组',
      check: groupNameError,
      onCreate: createGroup,
      created: '添加分组成功！',
      onCreated: function () { groupsP = null; render(); } // 建组后组表置脏，radio 现拉
    });

    function pick(gid) {
      sel = String(gid);
      Array.prototype.forEach.call(listBox.querySelectorAll('.acsv-mm-gi'), function (gi) {
        gi.classList.toggle('on', gi.getAttribute('data-gid') === sel);
      });
    }
    function render() {
      return loadGroups().then(function (gs) {
        if (!listBox.isConnected) return;
        listBox.textContent = '';
        gs.forEach(function (g) {
          var gi = el('div', 'acsv-mm-gi' + (String(g.id) === sel ? ' on' : ''));
          gi.setAttribute('data-gid', String(g.id));
          gi.appendChild(el('span', 'acsv-mm-radio'));
          gi.appendChild(el('span', 'acsv-mm-gl', g.name || '未分组'));
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

// ---- 编辑分组模态（meadmin.openManageModal 共用构建器；0.9.293 出库）----
// 系统组口径沿用旧 adminTab：未分组（id "0"）不进列表；特别关注只给改名不给删
//（删除套确认卡「…会移至未分组」；改名走内联输入条）
function openEditModal(ctx) {
  openManageModal({
    id: 'fl-edit',
    title: '编辑分组',
    load: function () {
      return loadGroups().then(function (gs) {
        return gs.filter(function (g) { return String(g.id) !== '0'; }); // 未分组：系统档不进编辑列表
      });
    },
    renameMaxLen: 8,
    addPlaceholder: '+添加分组，分组名称应在1到8个字符之间，仅支持中文、英文、数字。',
    addOkLabel: '添加分组',
    check: groupNameError,
    onCreate: createGroup,
    onRename: renameGroup,
    onDelete: removeGroup,
    canDelete: function (g) { return g.name !== '特别关注'; }, // 系统保留组不给删
    deleteTitle: '删除分组',
    deleteOkLabel: '确定',
    deleteText: function (g) {
      return '确定删除分组「' + (g.name || '') + '」？该分组下的人会移至未分组。';
    },
    created: '添加分组成功！',
    renamed: function (n) { return '已改名：' + n; },
    deleted: function (n) { return '已删除分组：' + (n || ''); },
    onChanged: function (type, gid) {
      groupsP = null;
      ctx.afterGroupsChanged(type === 'deleted' ? gid : null);
    }
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

  // 顶栏（meadmin.createMeHead 共用件：select + 编辑分组；与收藏夹/历史同构，0.9.293）
  var head = createMeHead(panel, {
    select: {
      load: function () {
        return loadGroups().then(function (gs) {
          return [{ id: '', label: '全部分组' }].concat(gs.map(function (g) {
            return { id: String(g.id), label: g.name || '未分组' };
          }));
        });
      },
      current: function () { return filterGid; },
      onPick: function (id, label) {
        filterGid = id;
        filterLabel = label;
        head.setLabel(filterLabel);
        reloadList();
      }
    },
    actions: [{
      label: '编辑分组',
      onClick: function () {
        openEditModal({
          afterGroupsChanged: function (deletedGid) {
            groupsP = null;
            if (deletedGid != null && filterGid !== '' && String(filterGid) === String(deletedGid)) {
              // 当前过滤档被删：回落「全部分组」重拉（游标回首屏）
              filterGid = '';
              filterLabel = '全部分组';
              head.setLabel(filterLabel);
              reloadList();
            }
          }
        });
      }
    }],
    onOpen: closePop,                    // 开档头菜单前收行内菜单（互斥缝①）
    onFail: function () { mmWarn('分组加载失败'); }
  });
  head.setLabel(filterLabel); // 初始标签（mehead 只管写口，初值归消费方）

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
        if (!d.run) { closePop(); head.closeMenu(); openGroupModal(it, ctx); return; }
        if (d.confirm) {
          closePop();
          head.closeMenu(); // 互斥缝②：开确认卡前收档头菜单
          openMmConfirm(btn, {
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
