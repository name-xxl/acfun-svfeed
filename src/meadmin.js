// ---------- 我的页档头 + 管理模态共用件（0.9.293 自 followadmin 抽出单源）----------
// 由头（用户令「关注列表顶部选择栏 ui 抽离共用」+ 预览三裁决）：我的页三档顶栏原本三种
// 语言（收藏夹 chips / 历史孤 chip / 关注列表 select），收一个构件 mehead=[select?]+[动作区]，
// 参照稿=关注列表原生量值（确认稿 docs/preview/me-tabhead.html；裁决：收藏夹管理收进模态
// ——adminTab 壳退役、清空历史=danger 红字）。管理模态（0.9.292 设置面板族壳）同步出库：
// followadmin「编辑分组」与 fav「管理收藏夹」共用 openManageModal 一份构建器（erow 行 +
// 常驻添加行 + 确认卡 + 页脚确定），壳 openMmModal 另供 followadmin「设置分组」radio 模态。
//
// 边界登记：
// · 本件**零业务**——档位数据/写链/校验（nameval 单源由消费方传入）/文案全由 opts 注入；
//   类名族 mh*（档头）/ mm*（模态）/ mmwarn（顶部警示条）。
// · mehead 菜单自持弹层（overlay 'mehead-pop' + closeOnOutsideClick；菜单挂档头根、不挂
//   select 柄内——0.9.289 冒泡关层教训）；与消费方本页其它弹层的互斥走两根注入缝：
//   opts.onOpen（mehead 开菜单前回调，followadmin 传 closePop 关行内菜单）+ 返回句柄
//   closeMenu()（消费方开自己弹层前调，见 followadmin.openRowMenu）。
// · 确认卡走 pickpop.openConfirmPop 单源（0.9.292 口径）：全页单枚（开新摘旧）、不占
//   overlay 槽——与全脚本删除类确认同口径。
// · mountMm 模态挂载点=脚本根（state.root，0.9.290 教训：挂 body 的低 z 元素被根容器盖住）。
import { el, toast, closeOnOutsideClick } from './ui.js';
import { root } from './state.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { GLYPHS } from './imicons.js';
import { openConfirmPop } from './pickpop.js';

function mmHost() { return root || document.body; }

// ---- 顶部警示条（0.9.289 模仿原生 ac-toast-warn：金黄 icon + 文案，~3s 自消）----
var warnTimer = null;
export function mmWarn(msg) {
  var old = document.querySelector('.acsv-mmwarn');
  if (old) old.remove();
  var s = el('div', 'acsv-mmwarn');
  s.appendChild(el('i', 'acsv-flico', GLYPHS.toastWarn));
  s.appendChild(document.createTextNode(msg));
  mmHost().appendChild(s);
  clearTimeout(warnTimer);
  warnTimer = setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 3000);
}

// ---- 确认卡（pickpop.openConfirmPop 同族）：全页单枚，开新前摘旧 ----
export function openMmConfirm(anchor, opts) {
  var old = document.querySelector('.acsv-confirmpop');
  if (old) old.remove();
  return openConfirmPop(anchor, opts);
}

// ---- 档头（mehead）：[select 过滤档？] + [右侧动作区]；三档同构（关注列表/收藏夹/历史）----
// opts.select：{ load()→Promise<[{id,label}]>, current()→id, onPick(id,label), }（过滤档）
// opts.actions：[{ label, danger?, visible?()→bool, onClick(btn) }]（右置文字钮，btn=钮本体；
// visible 全假且
//   无 select 时整行不渲染=历史空态）。opts.onOpen：开菜单前回调（互斥缝）。
// **opts.before**：插入锚元素（档头插到它之前）。档头位置**不许依赖消费方建档头的先后**——
//   0.9.293 历史档先挂列表后建档头 ⇒ 档头被 append 到 18 张卡网格之后约 1600px（视口外），
//   真机表现「观看历史不显示顶栏」；0.9.294 起三档统一「先建列表 → 档头带 before:list」，
//   位置由锚点决定，并各钉一条 harness 几何断言（fav-head-above / hd-head-above）。
// 返回 { root, setLabel, refresh, closeMenu }。
export function createMeHead(panel, opts) {
  opts = opts || {};
  var rootEl = el('div', 'acsv-mhead');
  var selBtn = null, arw = null, menu = null, alive = true;
  function curId() { return opts.select && opts.select.current ? opts.select.current() : null; }
  function closeMenu() {
    if (!menu) return;
    var m = menu;
    menu = null;
    if (m.parentNode) m.parentNode.removeChild(m);
    overlayClose('mehead-pop'); // 已出栈（Esc 路径）时空转
    if (arw) arw.classList.remove('up');
  }
  if (opts.select) {
    selBtn = el('div', 'acsv-mhsel');
    selBtn.appendChild(document.createTextNode('')); // 标签文本节点（setLabel 只写它，不碰箭头）
    
    arw = el('span', 'acsv-mharw', GLYPHS.edCaret);
    selBtn.appendChild(arw);
    rootEl.appendChild(selBtn);
    selBtn.addEventListener('click', function () {
      if (menu) { closeMenu(); return; }
      if (opts.onOpen) opts.onOpen();
      opts.select.load().then(function (items) {
        if (!alive || menu) return;
        menu = el('div', 'acsv-mhmenu');
        (items || []).forEach(function (d) {
          var o = el('div', 'acsv-mhopt' + (String(d.id) === String(curId()) ? ' on' : ''), d.label);
          o.addEventListener('click', function () {
            var changed = String(d.id) !== String(curId());
            closeMenu();
            if (changed && opts.select.onPick) opts.select.onPick(d.id, d.label);
          });
          menu.appendChild(o);
        });
        rootEl.appendChild(menu); // 挂档头根不挂柄内：选项点击冒泡回柄=选完即关（0.9.289 实锤）
        arw.classList.add('up');
        overlayOpen({ id: 'mehead-pop', close: closeMenu });
        closeOnOutsideClick(menu, [selBtn], function () { closeMenu(); });
      }, function () { if (opts.onFail) opts.onFail(); });
    });
  }
  var acts = [];
  (opts.actions || []).forEach(function (a) {
    var b = el('button', 'acsv-mhact' + (a.danger ? ' danger' : ''), a.label);
    b.type = 'button';
    b.addEventListener('click', function () { a.onClick(b); }); // 实参=钮本体（确认卡锚点用）
    rootEl.appendChild(b);
    acts.push({ def: a, btn: b });
  });
  // 落位：before 给了就插到它前面（位置与调用先后解耦，见头注 0.9.294 教训）
  if (opts.before && opts.before.parentNode === panel) panel.insertBefore(rootEl, opts.before);
  else panel.appendChild(rootEl);
  function setLabel(t) { if (selBtn) selBtn.firstChild.nodeValue = t; }
  function refresh() {
    var any = false;
    acts.forEach(function (x) {
      var show = !x.def.visible || !!x.def.visible();
      x.btn.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    if (!opts.select) rootEl.style.display = any ? '' : 'none'; // 纯动作行：全隐=整行不渲染
  }
  refresh();
  return { root: rootEl, setLabel: setLabel, refresh: refresh, closeMenu: closeMenu };
}

// ---- 模态壳（0.9.292 设置面板族：页头左置标题+28 圆✕ / 滚动体 / 页脚右置 primary 确定）----
// overlayOpen(modal) 入栈：Esc 走浮层栈单点裁决；mask 区点击/右上叉两路同 close。
// buildBody(body, ok, close)：内容灌滚动体；确定键归属调用方（radio 模态=发包，管理模态=关）。
export function openMmModal(id, title, buildBody) {
  var mask = el('div', 'acsv-mmask');
  var wrap = el('div', 'acsv-mm-wrap');
  var main = el('div', 'acsv-mm-main');
  var hd = el('div', 'acsv-mm-hd');
  hd.appendChild(el('div', 'acsv-mm-ttl', title));
  var x = el('button', 'acsv-mm-x', '✕');
  x.type = 'button';
  x.setAttribute('aria-label', '关闭');
  hd.appendChild(x);
  main.appendChild(hd);
  var body = el('div', 'acsv-mm-bd');
  main.appendChild(body);
  var foot = el('div', 'acsv-mm-foot');
  var ok = el('button', 'acsv-mm-ok', '确定');
  ok.type = 'button';
  foot.appendChild(ok);
  main.appendChild(foot);
  wrap.appendChild(main);
  mask.appendChild(wrap);
  mmHost().appendChild(mask);
  function close() {
    if (!mask.parentNode) return;
    mask.parentNode.removeChild(mask);
    overlayClose(id); // 已出栈时空转（Esc 路径先出栈再调 close）
  }
  x.addEventListener('click', close);
  wrap.addEventListener('click', function (ev) {
    if (ev.target === wrap || ev.target === mask) close(); // 面板外点击收
  });
  overlayOpen({ id: id, close: close, modal: true });
  buildBody(body, ok, close);
  return { close: close, body: body, ok: ok };
}

// ---- 常驻添加行（管理模态底部）：placeholder 即校验文案；聚焦出「取消添加/添加」双小钮 ----
// opts：{ placeholder, okLabel, maxLen?, check(name)→''|文案, onCreate(name)→Promise<id|true|null>,
//         created(name|string), onCreated(made), onFail?(msg) }（校验失败走 mmWarn）
export function mountMmAddRow(opts) {
  var li = el('div', 'acsv-mm-addrow');
  var inp = el('input', 'acsv-mm-addin');
  inp.type = 'text';
  inp.placeholder = opts.placeholder;
  if (opts.maxLen) inp.maxLength = opts.maxLen;
  li.appendChild(inp);
  var acts = el('div', 'acsv-mm-addacts');
  acts.style.display = 'none';
  var cc = el('button', 'acsv-mm-sbtn', '取消添加');
  cc.type = 'button';
  var okText = opts.okLabel || '添加';
  var ok = el('button', 'acsv-mm-sbtn primary', okText);
  ok.type = 'button';
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
    var err = opts.check(name); // 校验单源（nameval）由消费方传入
    if (err) { mmWarn(err); return; }
    li._busy = true;
    ok.textContent = '…';
    opts.onCreate(name).then(function (made) {
      li._busy = false;
      ok.textContent = okText;
      if (!made) { mmWarn('添加失败（重名或未登录？）'); return; }
      stopEdit();
      toast(typeof opts.created === 'function' ? opts.created(name) : (opts.created || '添加成功！'));
      if (opts.onCreated) opts.onCreated(made);
    }, function () {
      li._busy = false;
      ok.textContent = okText;
      mmWarn('添加失败（未登录？）');
    });
  }
  ok.addEventListener('click', submit);
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
  });
  return { li: li, acts: acts };
}

// ---- 管理模态（erow 行改名/删除 + 底部添加行 + 页脚确定=关）：followadmin 编辑分组 与
//      fav 管理收藏夹 共用同一份构建器（0.9.293）----
// opts：{
//   id, title
//   load() → Promise<[it]>              条目源（调用方先滤系统档，如未分组不进列表）
//   check(name) → ''|错误文案           名称校验（nameval 单源注入）
//   onCreate(name)/onRename(id,name)/onDelete(id) → Promise<id|true|null>（null=失败）
//   canDelete(it) → bool（缺省 true）
//   deleteTitle?（缺省「删除」）/ deleteOkLabel?（缺省「删除」）/ deleteText(it) → 确认卡正文
//   addPlaceholder / addOkLabel? / addMaxLen?
//   created/renamed/deleted             toast 文案（string 前缀或 fn(name)）
//   onChanged(type, id)                 写链成功后回调：type 'created'|'renamed'|'deleted'
//}
export function openManageModal(opts) {
  openMmModal(opts.id, opts.title, function (body, ok, close) {
    var listBox = el('div', 'acsv-mm-list');
    body.appendChild(listBox);

    function bar(it) {
      var li = el('div', 'acsv-mm-erow');
      li.setAttribute('data-id', it.id != null ? String(it.id) : '');
      li.appendChild(el('span', 'acsv-mm-gl', it.name || ''));
      var ops = el('span', 'acsv-mm-gops');
      var rn = el('button', 'acsv-mm-gop', '改名');
      rn.type = 'button';
      rn.addEventListener('click', function () { startRename(); });
      ops.appendChild(rn);
      var delOK = !opts.canDelete || opts.canDelete(it);
      if (delOK) {
        var del = el('button', 'acsv-mm-gop', '删除');
        del.type = 'button';
        del.addEventListener('click', function () {
          openMmConfirm(del, {
            host: li,
            title: opts.deleteTitle || '删除',
            text: opts.deleteText(it),
            okLabel: opts.deleteOkLabel || '删除',
            run: function () { return opts.onDelete(it.id); },
            done: function () {
              toast(typeof opts.deleted === 'function' ? opts.deleted(it.name) : (opts.deleted || '已删除'));
              if (opts.onChanged) opts.onChanged('deleted', it.id);
              render();
            }
          });
        });
        ops.appendChild(del);
      }
      li.appendChild(ops);

      function startRename() {
        li.textContent = '';
        var input = el('input', 'acsv-mm-rninput');
        input.type = 'text';
        if (opts.renameMaxLen) input.maxLength = opts.renameMaxLen;
        input.value = it.name || '';
        var cc = el('button', 'acsv-mm-sbtn', '取消');
        cc.type = 'button';
        var sv = el('button', 'acsv-mm-sbtn primary', '确认');
        sv.type = 'button';
        var tail = el('span', 'acsv-mm-gops');
        tail.appendChild(cc);
        tail.appendChild(sv);
        li.appendChild(input);
        li.appendChild(tail);
        input.focus();
        cc.addEventListener('click', function () { render(); });
        sv.addEventListener('click', function () {
          if (li._busy) return;
          var name = (input.value || '').trim();
          var err = opts.check(name);
          if (err) { mmWarn(err); return; }
          li._busy = true;
          opts.onRename(it.id, name).then(function (good) {
            li._busy = false;
            if (!good) { mmWarn('改名失败（重名或未登录？）'); return; }
            toast(typeof opts.renamed === 'function' ? opts.renamed(name) : (opts.renamed || '已改名：') + name);
            if (opts.onChanged) opts.onChanged('renamed', it.id);
            render();
          }, function () {
            li._busy = false;
            mmWarn('改名失败（未登录？）');
          });
        });
      }
      return li;
    }

    var add = mountMmAddRow({
      placeholder: opts.addPlaceholder,
      okLabel: opts.addOkLabel,
      maxLen: opts.addMaxLen,
      check: opts.check,
      onCreate: opts.onCreate,
      created: opts.created,
      onCreated: function (made) {
        if (opts.onChanged) opts.onChanged('created', made);
        render();
      }
    });

    function render() {
      return opts.load().then(function (items) {
        if (!listBox.isConnected) return;
        listBox.textContent = '';
        (items || []).forEach(function (it) { listBox.appendChild(bar(it)); });
        listBox.appendChild(add.li);
        listBox.appendChild(add.acts);
      }, function () {
        if (listBox.isConnected && !listBox.children.length) {
          listBox.appendChild(el('div', 'acsv-vempty', '加载失败'));
        }
      });
    }
    render();
    ok.addEventListener('click', close);
  });
}
