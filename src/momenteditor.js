import { CFG } from './cfg.js';
import { el, toast, selfUid, a11y } from './ui.js';
import { buildInputBar } from './inputbar.js';
import { mountEmotButton } from './emoticon.js';
import { overlayOpen, overlayClose } from './overlay.js';
import { quoteBlockOf } from './cards.js';
import { imgInto } from './imgload.js';
import { addMoment, momentCharCount, MOMENT_MAX, dimsOf } from './momentpost.js';
import { uploadImage } from './upload.js';
import { listProfile } from './momentapi.js';
import { errNotLogin } from './toastmsg.js';
import { testHook } from './dbg.js';

// ---------- 发动态编辑器（0.9.222） ----------
// 三处入口共用**唯一出口** openMomentEditor(opts)；第一版＝图文 + 公开/仅粉丝 + 转发。
// 契约与通道见 momentpost.js（APP 域、只认 Cookie、不校验签名、body 单字段 params）。
//
// 形如预览稿 docs/preview/moment-editor.html：居中模态（overlay 栈、modal 吞键）、标题「发动态」/
// 转发时「转发动态」、转入时顶部带源引用块（复用行卡引用卡构件 quoteBlockOf，不新画）、输入条用
// inputbar（0.9.238 富文本：编辑期真节点、出口序列化 UBB；字数在工具栏右端 n/233）、
// 工具行「可见范围」、脚行「取消 / 发布(转发)」。
//
// **防误发**（发布是外向不可逆动作）：提交期锁（禁用输入与按钮，绝不自动重试——端点无幂等键，
// 重试可能重复发）；失败保留内容并给可读话术；**网络不明/超时**走「先查后补」——用 listProfile
// 看自己最近一条是否就是这条内容，是则当成功，避免用户重复发。
//
// 未实测项（docs §11.5，真机定论）：bizFlag 能否复用、转发 repost* 的必填组合、风控形态。

var host = null;  // 当前宿主（同一时刻只开一个）
var root = null;  // 根容器（overlay 挂载点；收尾一起删）

// 源 pi → 引用块/转发参数所需的 repost 形状（与 panelitem 的 pi.repost 同形，quoteBlockOf 直吃）
export function repostOf(pi) {
  if (!pi) return null;
  if (pi.ct === 'moment') {
    return { ct: 'moment', id: pi.momentId, text: pi.text || '', imgs: pi.imgs || [], cover: pi.cover || '', up: pi.up || null };
  }
  if (pi.ct === 'video') {
    return { ct: 'video', id: pi.acId, title: pi.title || '', cover: pi.cover || '', dur: pi.dur || '', views: pi.views || '', up: pi.up || null };
  }
  if (pi.ct === 'article') {
    return { ct: 'article', id: pi.acId, title: pi.title || '', cover: pi.cover || '', views: pi.views || '', up: pi.up || null };
  }
  return null; // 其余类型（直播等）不支持转发——宁可不出入口，也不试错
}

export function openMomentEditor(opts) {
  opts = opts || {};
  if (host) return; // 同一时刻只开一个
  var repost = opts.repost || null;

  host = el('div', 'acsv-me-host');
  // 浅色语境（0.9.226）：从**原生页**打开时（浅色皮肤），面板根加 `.acsv-mp` ⇒ 既有的浅色规则
  // 全套生效（输入框/镜像层/表情面板/图片块），只需再补模态外壳那几条（.acsv-me.acsv-mp）
  var panel = el('div', 'acsv-me' + (opts.light ? ' acsv-mp' : ''));
  var hd = el('div', 'acsv-me-hd');
  hd.appendChild(el('div', null, repost ? '转发动态' : '发动态'));
  var x = el('button', 'acsv-me-x', '✕');
  x.title = '关闭';
  x.type = 'button';
  x.addEventListener('click', close);
  hd.appendChild(x);
  panel.appendChild(hd);
  a11y(panel, { label: repost ? '转发动态' : '发动态', role: 'dialog' });

  var bd = el('div', 'acsv-me-bd');
  if (repost) bd.appendChild(quoteBlockOf(repost)); // 源引用块（行卡同构件）
  panel.appendChild(bd);

  // ---- 状态（**必须在 buildInputBar 之前**：输入条建好即会 refresh 一拍 ⇒ onState/
  // sendEnabled 立刻被调到，此处的 var 若还在下面声明就是 undefined ⇒ 开局即抛 ——
  // 0.9.238 harness 实锤的 `imgs.length of undefined`）----
  var visFans = false;
  var imgs = [];        // 已上传：{url,width,height}
  var pending = 0;      // 在传图片数
  var busy = false;     // 提交锁
  var overTip = false;  // 提示行当前显示的是不是"超字数"（只在它显示时才允许被清，免得盖掉上传/失败话术）

  // 脚行（取消 / 发布(转发) + 提示行）：**先建后挂**——onState（见下）在输入条建好的第一拍
  // 就会写 ok.disabled，脚行元素必须在那之前就位（0.9.238 harness 实锤：`ok.disabled of undefined`）
  var ft = el('div', 'acsv-me-ft');
  var tip = el('span', 'acsv-me-tip');
  ft.appendChild(tip);
  var cancel = el('button', 'acsv-me-cc', '取消');
  cancel.type = 'button';
  cancel.addEventListener('click', close);
  var ok = el('button', 'acsv-me-ok', repost ? '转发' : '发布');
  ok.type = 'button';
  ok.addEventListener('click', submit);
  ft.appendChild(cancel);
  ft.appendChild(ok);

  // 输入条（0.9.238 富文本：编辑期真节点 + 出口序列化；字数在工具栏右端＝n/233，
  // 与评论/私信同一件。发送键在模态内由 CSS 隐去，发布动作归脚行——见 styles .acsv-me-bd）
  var bar = buildInputBar({
    placeholder: '说点什么…（图片动态文字可留空）',
    maxLength: MOMENT_MAX,
    countMax: true,               // 动态字数恒显 n/233（预览稿 ② 形态；评论/私信是裸数）
    onSend: submit,
    img: { title: '插入图片', onFile: onFile },
    // 发送键启用谓词：文字为空但**有图/是转发**也可发（图片动态文字可留空）；
    // over/busy 由输入条自己兜（谓词只补"空文字也合法"这一条）
    sendEnabled: function (st) { return !busy && (st.count > 0 || imgs.length > 0 || !!repost); },
    onState: onState
  });
  bd.appendChild(bar.box);
  var thumbs = el('div', 'acsv-thumbs');
  thumbs.style.display = 'none';
  bd.appendChild(thumbs);

  // 表情面板（0.9.226）：**插在工具行与脚行之间、走文档流**（原先是 .acsv-emotpanel 的
  // absolute + bottom:57px——那是给抽屉输入条定的口径，在模态里会逃到浮层根 ⇒ 用户实报"面板跑到屏幕底部"）
  var emotPanel = el('div', 'acsv-emotpanel acsv-me-emot');
  emotPanel.style.display = 'none';
  panel.appendChild(emotPanel);
  mountEmotButton(bar.emotBtn, emotPanel, bar.insertCode);

  // 工具行：可见范围（字数已在输入条工具栏右端；发布动作在脚行）
  var tools = el('div', 'acsv-me-tools');
  var vis = el('span', 'acsv-me-vis');
  vis.appendChild(el('span', null, '可见范围'));
  var pPublic = el('button', 'acsv-me-pill on', '公开');
  var pFans = el('button', 'acsv-me-pill', '仅粉丝');
  pPublic.type = pFans.type = 'button';
  pPublic.addEventListener('click', function () { setVis(false); });
  pFans.addEventListener('click', function () { setVis(true); });
  vis.appendChild(pPublic);
  vis.appendChild(pFans);
  tools.appendChild(vis);
  panel.appendChild(tools);
  panel.appendChild(ft); // 脚行元素建在上面（输入条之前），此处才落位

  panel.addEventListener('click', function (ev) { if (ev.target === panel) close(); });
  host.appendChild(panel);
  root = el('div'); root.id = 'acsv-me-root'; // 挂在脚本根（无壳页也要能开：退化为 body）
  (document.getElementById('acsv-root') || document.body).appendChild(root);
  root.appendChild(host);
  overlayOpen({ id: 'momentedit', modal: true, close: close });

  // ---- 状态回调与工具 ----
  function setVis(fans) {
    visFans = !!fans;
    pPublic.classList.toggle('on', !visFans);
    pFans.classList.toggle('on', visFans);
  }

  // 输入条状态回调（每次刷新都到）：① 脚行发布键的启用态（硬拒绝——超限/空且无图无转发都不许发）；
  // ② 超限提示行（预览稿 ④：「已超出 N 字，请删减后再发布」）
  function onState(st) {
    ok.disabled = busy || st.over || !(st.count > 0 || imgs.length > 0 || !!repost);
    if (st.over) {
      overTip = true;
      tip.className = 'acsv-me-tip err';
      tip.textContent = '已超出 ' + (st.count - MOMENT_MAX) + ' 字，请删减后再发布';
    } else if (overTip) {
      overTip = false;
      tip.className = 'acsv-me-tip';
      tip.textContent = '';
    }
  }

  function renderThumbs() {
    thumbs.textContent = '';
    var full = imgs.length >= 9;
    thumbs.style.display = (imgs.length || pending) ? '' : 'none';
    imgs.forEach(function (im, i) {
      var t = el('div', 'acsv-thumb');
      imgInto(t, im.url, 'cover'); // 项目禁令：图片一律走 imgload.imgInto（归一+重试+降级）
      var dx = el('button', 'x', '✕');
      dx.title = '移除';
      dx.type = 'button';
      dx.addEventListener('click', function () {
        imgs.splice(i, 1);
        renderThumbs();
      });
      t.appendChild(dx);
      thumbs.appendChild(t);
    });
    for (var p = 0; p < pending; p++) {
      var pt = el('div', 'acsv-thumb');
      pt.style.opacity = '.5';
      thumbs.appendChild(pt);
    }
    if (!full) {
      var add = el('div', 'acsv-thumb add', '＋');
      add.addEventListener('click', function () { pick(); });
      thumbs.appendChild(add);
    }
  }

  function pick() {
    var f = el('input');
    f.type = 'file';
    f.accept = 'image/*';
    f.style.display = 'none';
    f.addEventListener('change', function () {
      var file = f.files && f.files[0];
      if (file) onFile(file);
      f.remove();
    });
    document.body.appendChild(f);
    f.click();
  }

  function onFile(file) {
    if (busy) return;
    if (imgs.length + pending >= 9) { tip.textContent = '最多 9 张图'; return; }
    if (file.size > CFG.comments.imgMax) { tip.textContent = '图片太大（上限 ' + Math.round(CFG.comments.imgMax / 1048576) + 'MB）'; return; }
    pending++;
    tip.textContent = '上传中…';
    renderThumbs();
    var failed = false; // 本次上传失败的提示不得被随后的收尾 then 抹掉（0.9.234 病灶）
    uploadImage(file /* bizFlag 用默认值；动态能否复用待真机（docs §11.5） */)
      .then(function (url) {
        pending--;
        if (!url) { failed = true; tip.textContent = '图片上传失败，请重试'; renderThumbs(); return; }
        return dimsOf(url).then(function (dim) { imgs.push(dim); });
      })
      .then(function () {
        if (!failed && pending === 0) tip.textContent = '';
        renderThumbs();
        bar.refresh(); // 图数变了 ⇒ 重算发布键启用态（纯图动态也允许发）
      }, function () { pending--; renderThumbs(); bar.refresh(); });
  }

  function teardown() {
    // （0.9.238 撤除）bar.tk.stop()：令牌原子化随 textarea 载体退役，编辑区不再有 document 级监听
    overlayClose('momentedit');
    if (root) root.remove();   // 连根容器一起删（只删 host 会残留空壳，反复开会累积）
    host = null;
    root = null;
  }

  function close() {
    if (busy) return; // 提交中不许关（结果未知）
    teardown();
  }

  // 提交：锁 → 组参 → 发布 → 成功/失败/未知三分支
  function submit() {
    if (busy) return;
    var content = bar.text().trim(); // 出口 UBB（富文本 → 序列化，0.9.238）
    if (!content && !imgs.length && !repost) { tip.textContent = '写点什么，或加张图'; return; }
    if (pending) { tip.textContent = '图片还在上传…'; return; }
    if (momentCharCount(content) > MOMENT_MAX) { tip.textContent = '内容太长了（限 ' + MOMENT_MAX + ' 字）'; return; }
    busy = true;
    tip.className = 'acsv-me-tip';
    tip.textContent = '发布中…（请勿关闭）';
    ok.disabled = true;
    ok.textContent = repost ? '转发中…' : '发布中…';
    cancel.disabled = true;
    bar.setBusy(true, '发布中…'); // 锁编辑区（原 readOnly 对 contenteditable 不生效）
    var payload = { imgs: imgs, visibleForFans: visFans, repost: repost ? { ct: repost.ct, id: repost.id } : null };
    addMoment(content, payload).then(function (r) {
      if (r.ok) { done(content); return; }
      if (r.kind === 'notlogin') { fail(errNotLogin()); return; }
      if (r.kind === 'content') { fail('内容太长了（限 ' + MOMENT_MAX + ' 字）'); return; }
      if (r.kind === 'param') { fail('发布失败：参数不被接受（可能被服务端风控拦下）'); return; }
      if (r.kind === 'ratelimit') { fail('发得太快了，稍等一会儿再试（服务端限流）'); return; }
      if (r.kind === 'gateway') { fail('请求被网关拒绝（无效的请求）——通常是请求头不全，请回报这一条'); return; }
      fail('发布失败：' + (r.msg || ('错误码 ' + r.code)));
    }, function (e) {
      // 网络/超时：**结果未知** ⇒ 先查后补（曾发出去就不让用户重发）
      var msg = String((e && e.message) || e);
      if (/timeout|network|http-5/.test(msg)) { verifyThen(content); return; }
      fail('发布失败：' + msg);
    });

    function fail(text) {
      busy = false;
      tip.className = 'acsv-me-tip err';
      tip.textContent = text;
      ok.disabled = false;
      ok.textContent = '重试发布';
      cancel.disabled = false;
      bar.setBusy(false); // 解锁编辑区（内容保留，可直接改后重试）
    }

    function done(text) {
      busy = false;
      toast(repost ? '已转发' : '已发布');
      if (opts.onDone) { try { opts.onDone(text); } catch (e) { } }
      teardown();
    }

    // 先查后补：拉自己最近一页动态，命中同内容即视为已发布（避免重复发）
    function verifyThen(text) {
      var uid = selfUid();
      if (!uid) { fail('发布结果未知（网络超时），请到「我的」动态里确认'); return; }
      listProfile(uid, '').then(function (page) {
        var hit = (page.items || []).some(function (pi) {
          return pi.ct === 'moment' && (pi.text || '').trim() === text;
        });
        if (hit) { done(text); return; }
        fail('发布结果未知（网络超时）；已核对最近动态，未发现该内容，可重试');
      }, function () {
        fail('发布结果未知（网络超时），请到「我的」动态里确认');
      });
    }
  }
}

// debug 测试钩子（harness 直采；正式构建死码消除）：转发映射与编辑器开口
testHook('momentRepostOf', repostOf);
testHook('momentEdit', function (opts) { openMomentEditor(opts || {}); });
