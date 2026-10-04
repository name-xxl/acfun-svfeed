// ---------- 通用「选择层」（0.9.142）：锚定小弹层壳 + 确认弹 ----------
// 两处消费（关注分组单选 / 收藏夹多选，0.9.143 接第二处）共用本轮壳：标题 + 选项列表
//（单选=点选、多选=勾选）+ 内联「新建」+ 底部动作键（确定/取消 + 可选附加动作）。
// 交互范式照 banpop（先例，勿另起一套）：
//   · **toggle 语义**——同一按钮再点=收起；✕/取消/外点关闭；
//   · 挂 **btn.parentNode**（缺相对定位则补 position:relative），随宿主 DOM 一起销毁，
//     不注册全局监听残留（文档级监听一次性、外点即卸）；
//   · 定位=rect 计算落宿主内容坐标系（滚动跟随），视口边缘收边、下方放不下自动翻上。
// 分工：本件**零业务**——数据/校验/提交全由 opts 注入（load/check/create/confirm/done），
// 关注分组语义在 grouppop.js、收藏夹在 favpop.js（0.9.143）。
import { el } from './ui.js';

// pop 相对宿主（wrap 内容坐标系）定位：默认按钮正下方，越界即收边/翻上
function place(pop, btn) {
  var wrap = pop.parentNode;
  if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
  var b = btn.getBoundingClientRect(), h = wrap.getBoundingClientRect();
  var sl = wrap.scrollLeft || 0, st = wrap.scrollTop || 0;
  var pw = pop.offsetWidth, ph = pop.offsetHeight;
  var left = b.left - h.left + sl;
  var minL = -h.left + sl + 4;
  var maxL = window.innerWidth - h.left + sl - pw - 4;
  if (maxL < minL) maxL = minL;
  if (left > maxL || left < minL) left = Math.max(minL, Math.min(maxL, left));
  var top = b.bottom - h.top + st + 6;
  var above = b.top - h.top + st - ph - 6;
  if (b.bottom + 6 + ph > window.innerHeight && above > st - h.top) top = above;
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
}

function guardOutside(pop, btn) {
  setTimeout(function () {
    document.addEventListener('click', function onDoc(ev) {
      document.removeEventListener('click', onDoc);
      if (!pop.isConnected) return;
      if (pop.contains(ev.target) || btn.contains(ev.target)) return;
      pop.remove();
    });
  }, 0);
}

// 选项行（mode='single' 点选高亮 / 'multi' 前置勾选标记）
function pickItem(item, mode, isOn, onToggle) {
  var b = el('button', 'acsv-pick-item' + (isOn ? ' on' : ''));
  b.type = 'button';
  if (mode === 'multi') b.appendChild(el('i', 'acsv-pick-tick', isOn ? '✓' : ''));
  b.appendChild(el('span', null, item.name + (item.count != null ? ' (' + item.count + ')' : '')));
  b.addEventListener('click', function () { onToggle(b); });
  return b;
}

// 通用选择层。opts：
//   title           标题
//   multi           true=多选（勾选、可多提交）/ false=单选
//   load()          → Promise<{items:[{id,name,count,on}]}>；on=初始选中/已勾选
//   emptyText       空态文案
//   requireSelection true 时未选中禁用「确定」（已关注改分组：不许默默移动）
//   canCreate       {label, maxLen, check(name)->'' | 错误文案, create(name)->Promise<idOrTrue|null>}
//   confirm(sel)    → Promise<bool>；sel={ids, added, removed}（added/removed 是相对初始勾选集）
//   extraAction     {label, run()->Promise<bool>}——附加动作键（如「取消关注」，成功即关层）
//   done()          成功后回调（不区分 confirm/extra，消费方只回写 UI）
//   errorText       失败提示（缺省「操作失败（未登录？）」）
export function openPickPop(btn, opts) {
  var host = btn.parentNode;
  if (!host) return;
  var existing = host.querySelector('.acsv-pickpop');
  if (existing) { existing.remove(); return; } // 再点=收起（toggle 语义）
  var multi = !!opts.multi;
  var pop = el('div', 'acsv-pickpop');
  var head = el('div', 'acsv-pick-head');
  head.appendChild(el('span', null, opts.title || '选择'));
  var x = el('button', 'acsv-pick-x', '✕');
  x.type = 'button';
  head.appendChild(x);
  pop.appendChild(head);
  var body = el('div', 'acsv-pick-body');
  pop.appendChild(body);
  var foot = el('div', 'acsv-pick-foot');
  var hint = el('span', 'acsv-pick-hint');
  var ok = el('button', 'acsv-pick-ok', '确定');
  ok.type = 'button';
  var cancel = el('button', 'acsv-pick-cancel', '取消');
  cancel.type = 'button';
  if (opts.extraAction) {
    var ex = el('button', 'acsv-pick-extra', opts.extraAction.label);
    ex.type = 'button';
    ex.addEventListener('click', function () {
      if (pop._busy) return;
      pop._busy = true;
      opts.extraAction.run().then(function (good) {
        pop._busy = false;
        if (!good) { hint.textContent = opts.errorText || '操作失败（未登录？）'; return; }
        pop.remove();
        if (opts.done) opts.done();
      }, function () { pop._busy = false; hint.textContent = opts.errorText || '操作失败（未登录？）'; });
    });
    foot.appendChild(ex);
  }
  foot.appendChild(hint);
  foot.appendChild(cancel);
  foot.appendChild(ok);
  pop.appendChild(foot);

  var init = {}; // 初始勾选集快照（多选差集用）
  var sel = {};  // 当前选中
  var itemEls = [];
  function renderItems(items) {
    body.textContent = '';
    itemEls = [];
    if (!items.length) body.appendChild(el('div', 'acsv-pick-empty', opts.emptyText || '暂无可选项'));
    items.forEach(function (it) {
      if (it.on) init[it.id] = 1;
      if (it.on) sel[it.id] = 1;
      var row = pickItem(it, multi ? 'multi' : 'single', !!it.on, function (b) {
        if (multi) {
          if (sel[it.id]) { delete sel[it.id]; b.classList.remove('on'); b.firstChild.textContent = ''; }
          else { sel[it.id] = 1; b.classList.add('on'); b.firstChild.textContent = '✓'; }
        } else {
          sel = {}; sel[it.id] = 1;
          itemEls.forEach(function (r) { r.classList.remove('on'); });
          b.classList.add('on');
        }
        syncOk();
      });
      row._id = it.id;
      itemEls.push(row);
      body.appendChild(row);
    });
    syncOk();
  }
  function selIds() { return Object.keys(sel); }
  function diff() {
    var ids = selIds(), added = [], removed = [];
    ids.forEach(function (id) { if (!init[id]) added.push(id); });
    Object.keys(init).forEach(function (id) { if (!sel[id]) removed.push(id); });
    return { ids: ids, added: added, removed: removed };
  }
  function syncOk() {
    ok.disabled = !!opts.requireSelection && !selIds().length;
  }

  // 内联新建（可选项）：输入 + 校验 + 提交 → 成功后刷新列表并选中新项
  function mountCreate() {
    var c = opts.canCreate;
    if (!c) return;
    var wrap = el('div', 'acsv-pick-new');
    var open = el('button', 'acsv-pick-newbtn', c.label);
    open.type = 'button';
    var input = el('input', 'acsv-pick-input');
    input.maxLength = c.maxLen || 16;
    input.placeholder = c.placeholder || c.label;
    var add = el('button', 'acsv-pick-add', '新建');
    add.type = 'button';
    var err = el('div', 'acsv-pick-err');
    function toggleEdit(on) {
      input.style.display = on ? '' : 'none';
      add.style.display = on ? '' : 'none';
      open.style.display = on ? 'none' : '';
      err.textContent = '';
      if (on) input.focus();
    }
    toggleEdit(false);
    open.addEventListener('click', function (ev) { ev.stopPropagation(); toggleEdit(true); });
    add.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (wrap._busy) return;
      var name = (input.value || '').trim();
      var msg = c.check ? c.check(name) : '';
      if (msg) { err.textContent = msg; return; }
      wrap._busy = true;
      add.textContent = '新建中…';
      c.create(name).then(function (made) {
        wrap._busy = false;
        add.textContent = '新建';
        if (!made) { err.textContent = '新建失败（重名或未登录？）'; return; }
        var newId = String(made === true ? '' : made);
        input.value = '';
        toggleEdit(false);
        refresh(newId); // 刷新列表并把新项选上
      }, function () {
        wrap._busy = false;
        add.textContent = '新建';
        err.textContent = '新建失败（未登录？）';
      });
    });
    ['click', 'mousedown'].forEach(function (t) {
      input.addEventListener(t, function (ev) { ev.stopPropagation(); });
    });
    wrap.appendChild(open);
    wrap.appendChild(input);
    wrap.appendChild(add);
    wrap.appendChild(err);
    body.appendChild(wrap);
  }

  var seq = 0;
  function refresh(pickId) {
    var my = ++seq;
    body.textContent = '';
    body.appendChild(el('div', 'acsv-pick-loading', '加载中…'));
    opts.load().then(function (res) {
      if (my !== seq || !pop.isConnected) return;
      body.textContent = '';
      if (pickId) { sel = {}; sel[String(pickId)] = 1; }
      var items = ((res && res.items) || []).map(function (it) {
        return pickId && String(it.id) === String(pickId)
          ? { id: it.id, name: it.name, count: it.count, on: true } : it;
      });
      renderItems(items);
      mountCreate();
    }, function () {
      if (my !== seq || !pop.isConnected) return;
      body.textContent = '';
      body.appendChild(el('div', 'acsv-pick-empty', '加载失败，点外面关掉重开'));
    });
  }

  ok.addEventListener('click', function () {
    if (pop._busy || ok.disabled) return;
    if (opts.requireSelection && !selIds().length) return;
    pop._busy = true;
    ok.textContent = '提交中…';
    opts.confirm(diff(), init).then(function (good) {
      pop._busy = false;
      ok.textContent = '确定';
      if (!good) { hint.textContent = opts.errorText || '操作失败（未登录？）'; return; }
      pop.remove();
      if (opts.done) opts.done();
    }, function () {
      pop._busy = false;
      ok.textContent = '确定';
      hint.textContent = opts.errorText || '操作失败（未登录？）';
    });
  });
  x.addEventListener('click', function () { pop.remove(); });
  cancel.addEventListener('click', function () { pop.remove(); });

  host.appendChild(pop);
  place(pop, btn);
  guardOutside(pop, btn);
  refresh('');
  return pop;
}

// 确认弹（删除类二次确认；项目内无 window.confirm 先例，沿用同一锚定范式）。
// opts：{ title, text, okLabel, run()->Promise<bool>, done() }
export function openConfirmPop(btn, opts) {
  var host = btn.parentNode;
  if (!host) return;
  var existing = host.querySelector('.acsv-confirmpop');
  if (existing) { existing.remove(); return; }
  var pop = el('div', 'acsv-confirmpop');
  pop.appendChild(el('div', 'acsv-pick-head', opts.title || '确认操作'));
  pop.appendChild(el('div', 'acsv-confirm-text', opts.text || ''));
  var hint = el('div', 'acsv-pick-err');
  pop.appendChild(hint);
  var foot = el('div', 'acsv-pick-foot');
  var cancel = el('button', 'acsv-pick-cancel', '取消');
  cancel.type = 'button';
  var ok = el('button', 'acsv-pick-ok acsv-pick-danger', opts.okLabel || '确定');
  ok.type = 'button';
  foot.appendChild(hint);
  foot.appendChild(cancel);
  foot.appendChild(ok);
  pop.appendChild(foot);
  ok.addEventListener('click', function () {
    if (pop._busy) return;
    pop._busy = true;
    ok.textContent = '处理中…';
    opts.run().then(function (good) {
      pop._busy = false;
      ok.textContent = opts.okLabel || '确定';
      if (!good) { hint.textContent = '操作失败（未登录？）'; return; }
      pop.remove();
      if (opts.done) opts.done();
    }, function () {
      pop._busy = false;
      ok.textContent = opts.okLabel || '确定';
      hint.textContent = '操作失败（未登录？）';
    });
  });
  cancel.addEventListener('click', function () { pop.remove(); });
  host.appendChild(pop);
  place(pop, btn);
  guardOutside(pop, btn);
  return pop;
}
