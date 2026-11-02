// test/cases/_probe.js —— 「计算值探针」共享件（0.9.317，harness 脚本表里排在本文件之后的
// cases/* 都用 window.__ACSV_HPROBE__）。
//
// 为什么需要它：合成事件点不出真 :hover/:active（0.9.314 的行卡族交互钉只能扫 cssText 钉「规则
// 载量存在」）——载量钉抓不到两类真病灶：① **CSS 变量名写错**（`var(--acsv-hv-imge)` 这种串照
// 匹配得着、计算值却是空/初始值，静默失效）；② **同特异度被别处顶掉**（规则在册却不生效）。
// 本件把目标伪类规则**原地复制成同特异度的替身**：选择器里的 `:hover`/`:active` 换成标记类
// （伪类与类同为 0,1,0 ⇒ 特异度逐位相同），insertRule 进探针表（表序在文档样式表之后 ⇒ 同值时
// 后来者胜），给卡根挂上标记类，再读 `getComputedStyle` —— 读到的就是「真悬停时浏览器会算出什么」，
// 变量解析链（var → :root 值）一并走过。
//
// 探针标记类刻意用 `hvp-` 前缀而非 `acsv-`：check-cases 的「类名必须存在于 src」闸只管
// `.acsv-*` 字面，探针类是测试私有件、不进产品；量完立刻撤类删规则，不留残留。
//
// **两个实测踩过的坑**（0.9.317）：
//   ① 替身块必须同写 `transition:none`：目标属性若在过渡中，挂类后同步读 getComputedStyle 得到
//      的是**过渡起点**（t=0 旧值）而非规则声明的终值。实测 grid 封面图元（基态 transition
//      transform .2s）：不加 ⇒ `matrix(1,0,0,1,0,0)`（恒等＝起点），加了 ⇒ `matrix(1.05,...)`。
//      过渡本身另有 `trans()` 腿（读基态、不过替身表），关掉过渡不丢覆盖。
//   ② 读**颜色/背景**用 `cv({expect})` 逐字对：Chrome 会把 `rgba(253,76,93,.55)` 归一成
//      `rgba(253, 76, 93, 0.55)`、`#fff` 归一成 `rgb(255, 255, 255)`——expect 写归一化形态。
(function () {
  var MH = 'hvp-hv';
  var MA = 'hvp-act';
  var sheet = null;

  function ensureSheet() {
    if (sheet && sheet.ownerNode && sheet.ownerNode.isConnected) return sheet;
    var st = document.createElement('style');
    st.id = 'acsv-hprobe-sheet'; // id 不是 .acsv-* 类，不入类名闸
    document.head.appendChild(st);
    sheet = st.sheet;
    return sheet;
  }

  function eachStyle(fn) {
    var sheets = [].slice.call(document.styleSheets);
    for (var i = 0; i < sheets.length; i++) {
      var rs;
      try { rs = sheets[i].cssRules; } catch (e) { continue; } // 跨域表读不到 cssRules：跳过
      for (var j = 0; j < rs.length; j++) {
        if (rs[j].type === 1 && rs[j].selectorText) fn(rs[j]);
      }
    }
  }

  // opts: {host: 挂标记类的元素, read?: 读计算样的元素（默认 host）, sel: RegExp 定位伪类规则,
  //        pseudo?: ':hover'|':active'（默认 :hover）, prop: 驼峰属性名}
  function read(opts) {
    var pseudo = opts.pseudo || ':hover';
    var mark = pseudo === ':active' ? MA : MH;
    var found = null;
    eachStyle(function (r) {
      if (found) return;
      var st = r.selectorText;
      if (st.indexOf(pseudo) < 0) return;
      if (!opts.sel.test(st)) return;
      found = r;
    });
    if (!found) return { ok: false, info: 'rule-not-found ' + String(opts.sel) };
    // **必须同写 transition:none**（0.9.317 实锤的坑）：替身类一挂上，若目标属性在过渡中，
    // getComputedStyle 读到的是**过渡起点**（t=0 的旧值），不是规则声明的终值——
    // 实测 grid 图元：`.acsv-gcover img{transition:transform .2s}` ⇒ 替身挂类后读 transform 得
    // `matrix(1,0,0,1,0,0)`（起点＝恒等），加 inline transition:none 后同一读得
    // `matrix(1.05,0,0,1.05,0,0)`（终值）。声明写在替身块尾：同块后者胜，且不管基态规则有没有
    // transition 都盖得住（替身特异度 ≥ 基态）。**过渡本身另有 `trans()` 腿去读**（那条读基态、
    // 不过替身表），故此处关掉过渡不损失覆盖。
    var clone = found.selectorText.split(pseudo).join('.' + mark)
      + '{' + found.style.cssText + ';transition:none}';
    var sh = ensureSheet();
    var idx = sh.cssRules.length;
    try { sh.insertRule(clone, idx); } catch (e) {
      return { ok: false, info: 'insertRule 失败：' + e.message + ' ← ' + clone };
    }
    var target = opts.read || opts.host;
    opts.host.classList.add(mark);
    var val = '';
    var err = '';
    try {
      val = window.getComputedStyle(target)[opts.prop];
    } catch (e) { err = String((e && e.message) || e); }
    opts.host.classList.remove(mark);
    try { sh.deleteRule(idx); } catch (e) { /* 已随表移除 */ }
    return { ok: !err && val !== undefined && val !== '', value: val, err: err,
      sel: found.selectorText, clone: clone };
  }

  // 基态过渡（transition 不在伪类上，直接读计算值——同样过 var 解析链）
  function trans(el) {
    var cs = window.getComputedStyle(el);
    return { dur: cs.transitionDuration, prop: cs.transitionProperty, timing: cs.transitionTimingFunction };
  }

  // 「规则载量」腿（沿用 0.9.314 口径）：把全部样式表压成去空白文本后切「选择器{声明}」对，
  // 供负钉（不得再有描边环/outline）与 scope 检查使用——载量与计算值两条腿各抓各的病灶
  function flatRules() {
    var out = [];
    eachStyle(function (r) {
      out.push({ sel: r.selectorText.replace(/\s+/g, ''), blk: r.style.cssText.replace(/\s+/g, ''),
        raw: r.selectorText });
    });
    return out;
  }

  // 一条「计算值钉」：读一次即产出 { ok, info } —— ok=读回值逐字等于 expect（不传 expect 只判
  // 「读得到」），info=读到什么+规则选择器，供 rec(name, ok, info) 第二参（失败时人眼可判）
  function cv(opt) {
    var p = read(opt);
    var ok = p.ok && (opt.expect === undefined
      ? p.value !== '' : p.value === opt.expect);
    return { ok: ok, info: (p.ok ? p.value : '(' + p.info + ')') + ' ← '
      + (p.sel || String(opt.sel)) };
  }

  // 一条「规则载量钉」：selectorText 命中 selRe 的规则须**恰好** expect 条，patterns 每条至少被其中
  // 一条命中，且**不得**命中 mustNot 里任何一条（防回潮负钉，如「分区卡 hover 再出现 border-color」）
  // ——多一条（又添一份手写副本）也判红。expect 显式传：一族里几条规则是族的形状（多条各行一条 /
  // 单条多声明）之别，不该由 patterns.length 反推。
  // 值口径：flatRules 的块文本已去空白，且**浏览器归一化过**（`.10`→`0.1`、rgba 补空格）⇒
  // pattern 写归一化形态（同 0.9.314 space.js 的 `0?\.1` 手法）；pattern 可为字符串（子串）
  // 或正则（容归一化两形，如 `/background:rgba\(255,255,255,0?\.07\)/`）
  function load(selRe, expect, patterns, mustNot) {
    var rs = flatRules().filter(function (r) { return selRe.test(r.sel); });
    var hit = function (pat, rule) {
      return pat instanceof RegExp ? pat.test(rule.blk) : rule.blk.indexOf(pat) >= 0;
    };
    var ok = rs.length === expect
      && patterns.every(function (pat) { return rs.some(function (r) { return hit(pat, r); }); });
    (mustNot || []).forEach(function (pat) {
      if (rs.some(function (r) { return hit(pat, r); })) ok = false;
    });
    return { ok: ok, info: rs.map(function (r) { return r.sel + '{' + r.blk + '}'; }).join(' | ') };
  }

  window.__ACSV_HPROBE__ = { read: read, cv: cv, load: load, trans: trans, flatRules: flatRules,
    MH: MH, MA: MA };
})();
