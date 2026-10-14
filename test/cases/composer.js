// test/cases/composer.js —— harness 场景：富文本输入条（0.9.238 重写；评论/私信/动态编辑器三宿主共用件）
//
// 覆盖面（对照 docs/preview/composer-richtext.html 的裁决与 ⑧ 序列化对照表）：
//   ① 工具栏形态（5 格式键 + 表情/图片 + 字数；图标＝原生 iconfont 字形，码点/字体逐一对上）
//   ② 出口序列化 ⑧ 表逐条（composerUbb 钩子＝与编辑区**同一套实现**，非平行副本）
//   ③ 真·键盘输入 → 字数跟手；B/U/S 工具键 → 出口出 [b]/[u]/[s]（选中区上色同理）
//   ④ 表情插入（真面板→真节点）→ 出口令牌；删除/撤销走浏览器原生（execCommand 就是 Ctrl+Z/退格的机制）
//   ⑤ 粘贴清洗（最保守纯文本化：HTML 进不来）
//   ⑥ 超字数硬拒绝（红字 + 描红边 + 发送键禁用）
//   ⑦ 空态占位（:empty::before）与回复态占位文案
//   ⑧ 表情面板锚点几何（bottom:84 贴输入条上沿）
//   ⑨ 端到端发送：Enter → 出口 UBB 进 comment/add 的 body（写链契约面）
// 宿主选行内评论（follow 视图的行内展开，kind=home）——输入条落 .acsv-frow-cmts（与抽屉/面板同一实例）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  C['composer-rich'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, TEST = h.TEST;

    // 表情图必须走真实 CDN 形态：data: URI 含分号，过不了 emoticon 的 URL 字符集（会一路出占位节点）
    var EMOT_URL = 'https://imgs.aixifan.com/newUpload/emot-probe.gif';
    window.__ACSV_CMT_BODY__ = null;
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'comment/list': function () {
        return {
          result: 0, commentCount: 1, curPage: 1, totalPage: 1, pcursor: 'no_more', hotComments: [],
          rootComments: [{ commentId: 'k1', userId: 31, userName: '甲', headUrl: '', content: '行内第一条', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0 }],
          subCommentsMap: {}
        };
      },
      'comment/add': function (body) {
        window.__ACSV_CMT_BODY__ = String(body);
        var txt = '';
        try { txt = decodeURIComponent((String(body).match(/content=([^&]*)/) || [])[1] || ''); } catch (e) { }
        return { result: 0, commentId: 'k9', userId: 99, userName: 'name_xxl', headUrl: '', content: txt, postDate: '刚刚', likeCount: 0 };
      },
      // 表情面板夹具（与 publish.js 同形：包0 十二条）
      'emotion/getUserEmotion': function () {
        var emos = [];
        for (var i = 0; i < 12; i++) emos.push({ id: 'e0_' + i, name: 'e0_' + i, emotionImageSmallUrl: EMOT_URL, emotionImageBigUrl: EMOT_URL });
        return { result: 0, emotionPackageList: [{ name: '包0', emotions: emos }] };
      }
    });
    delete window.__ACSV_MOCK__; // 走定向桩（comment-fail 同款处置）
    location.hash = 'svfeed/follow';
    rec('cr-feed-open', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length === 19;
    }, 10000)));

    // ---- 打开行内评论区（评论宿主；输入条随之搬进 .acsv-frow-cmts） ----
    var row = null;
    await waitFor(function () {
      var rows = document.querySelectorAll('.acsv-mewrap .acsv-frow');
      for (var i = 0; i < rows.length; i++) {
        if (/动态正文带 UBB/.test(rows[i].textContent)) { row = rows[i]; return true; }
      }
      return false;
    }, 8000);
    var acts = row ? row.querySelectorAll('.acsv-fact') : [];
    if (acts[1]) acts[1].click(); // 评论键 → 行内展开
    rec('cr-input-in-row', !!(await waitFor(function () {
      return !!q('.acsv-frow-cmts .acsv-cinput-edit');
    }, 8000)));

    var box = q('.acsv-frow-cmts');
    var ed = q('.acsv-frow-cmts .acsv-cinput-edit');
    var cnt = q('.acsv-frow-cmts .acsv-cinput-count');
    var sendBtn = q('.acsv-frow-cmts .acsv-cinput-send');

    function caretEnd() {
      var sel = window.getSelection();
      var r = document.createRange();
      r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    }
    function selectAll() {
      var sel = window.getSelection();
      var r = document.createRange();
      r.selectNodeContents(ed);
      sel.removeAllRanges(); sel.addRange(r);
    }
    function wire() { return TEST.call('composerUbb', ed); }
    function bodyText() { return decodeURIComponent(String(window.__ACSV_CMT_BODY__ || '')).replace(/\+/g, ' '); }
    function clear() {
      ed.focus(); selectAll();
      document.execCommand('delete');
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function typeText(t) {
      ed.focus(); caretEnd();
      document.execCommand('insertText', false, t); // 真·浏览器输入路径（原生 input 事件随之发出）
    }

    // ---- ① 工具栏形态 + 图标＝原生字形（预览稿 ⑪ 裁决） ----
    // v2（0.9.239 官方对齐）：4 格式键 + split 颜色键（主键+箭头键）+ 两条竖分隔线 + 表情/图片 + 字数
    rec('cr-toolbar', (function () {
      var top = box.querySelector('.acsv-cinput-top');
      var key = top.querySelector('.acsv-cinput-colkey');
      var emot = top.querySelector('.acsv-cinput-emot');
      var img = top.querySelector('.acsv-cinput-img');
      var seps = top.querySelectorAll('.acsv-fmtsep');
      return !!top && !!key && !!emot && !!img && !!cnt
        && top.querySelectorAll('.acsv-cinput-fmt').length === 6   // B I U S + 主键 + 箭头键
        && key.querySelectorAll('button').length === 2
        && !!key.querySelector('.acsv-cinput-collabel')             // 主键内的当前色条
        && seps.length === 2                                        // 官方两条（S 后 / 颜色键后）
        && cnt.parentNode === top;                                  // 字数在工具栏行右端
    })());
    rec('cr-icons-native', (function () {
      if (!ed) return false;
      var glyphs = box.querySelectorAll('.acsv-cinput-top .acsv-ic');
      if (glyphs.length !== 8) return false; // B I U S + 颜色 + 箭头 + 表情 + 图片
      var ff = getComputedStyle(glyphs[0]).fontFamily;
      var codes = [];
      for (var i = 0; i < glyphs.length; i++) codes.push(glyphs[i].textContent);
      // imicons.GLYPHS.ed*（官方工具栏码点）：E18F/E19A/E1EA/E1E9 · E1EB 颜色 · E166 下拉箭头 · E18B 表情 · E18A 图片
      return ff.indexOf('acfun-frontend-next') >= 0
        && codes.join() === ['', '', '', '', '', '', '', ''].join();
    })(), (function () {
      var g = box.querySelectorAll('.acsv-cinput-top .acsv-ic');
      return g.length ? getComputedStyle(g[0]).fontFamily.slice(0, 40) : 'none';
    })());
    // v2 几何（官方实测）：键盒 18×18、相邻键右距 8、竖分隔线 1×18、split 包裹件 32（主 18 + 箭头 14）
    rec('cr-toolbar-geometry', (function () {
      var keys = box.querySelectorAll('.acsv-cinput-top .acsv-cinput-fmt');
      var k0 = keys[0].getBoundingClientRect(), k1 = keys[1].getBoundingClientRect();
      var sep = box.querySelector('.acsv-cinput-top .acsv-fmtsep').getBoundingClientRect();
      var key = box.querySelector('.acsv-cinput-colkey').getBoundingClientRect();
      var caret = box.querySelector('.acsv-cinput-colcaret').getBoundingClientRect();
      return Math.round(k0.width) === 18 && Math.round(k0.height) === 18
        && Math.round(k1.left - k0.right) === 8
        && Math.round(sep.width) === 1 && Math.round(sep.height) === 18
        && Math.round(key.width) === 32 && Math.round(caret.width) === 14;
    })(), (function () {
      var keys = box.querySelectorAll('.acsv-cinput-top .acsv-cinput-fmt');
      var k0 = keys[0].getBoundingClientRect(), k1 = keys[1].getBoundingClientRect();
      return 'key=' + Math.round(k0.width) + ' gap=' + Math.round(k1.left - k0.right);
    })());
    // ★ 色条居中于主键（官方 label 是主键的子元素 ⇒ left:50% 相对 18 宽主键）——2026-10-15 用户实拍抓过的
    // "偏右 7px"（挂到 32 宽包裹层上就是那个形态）
    rec('cr-collabel-center', (function () {
      var main = box.querySelector('.acsv-cinput-colkey .acsv-cinput-fmt');
      var lab = box.querySelector('.acsv-cinput-collabel');
      if (!main || !lab) return false;
      var m = main.getBoundingClientRect(), l = lab.getBoundingClientRect();
      return Math.abs((l.left + l.width / 2) - (m.left + m.width / 2)) <= 1
        && Math.round(l.width) === 16 && Math.round(l.height) === 2
        && lab.parentNode === main;
    })(), (function () {
      var main = box.querySelector('.acsv-cinput-colkey .acsv-cinput-fmt');
      var lab = box.querySelector('.acsv-cinput-collabel');
      if (!main || !lab) return 'n/a';
      var m = main.getBoundingClientRect(), l = lab.getBoundingClientRect();
      return 'dx=' + ((l.left + l.width / 2) - (m.left + m.width / 2)).toFixed(1) + ' bg=' + getComputedStyle(lab).backgroundColor;
    })());
    // 色条初值＝编辑区当前字色（暗色宿主 = #e8eaee）
    rec('cr-collabel-initial', (function () {
      var lab = box.querySelector('.acsv-cinput-collabel');
      return !!lab && getComputedStyle(lab).backgroundColor === 'rgb(232, 234, 238)';
    })(), (function () {
      var lab = box.querySelector('.acsv-cinput-collabel');
      return lab ? getComputedStyle(lab).backgroundColor : 'none';
    })());

    // ---- ② 出口序列化对照表（⑧ 表逐条；构造 DOM 直采钩子＝与编辑区同一实现） ----
    var probe = document.createElement('div');
    probe.innerHTML = 'AB<b>粗</b><strong>强</strong><i>斜</i><u>下</u><s>删</s>'
      + '<span style="text-decoration:underline">U</span><span style="color:#fd4c5d">红</span><br>'
      + '<img class="ubb-emotion" data-pkg="acfun" data-id="2797" src="https://i/e.gif">'
      + '<span class="ubb-emot-ph" data-pkg="acfun" data-id="888">[表情]</span>'
      + '<span class="acsv-cinput-imgblk" contenteditable="false" data-url="https://i/x.jpg" data-name="配图.jpg">'
      + '<img src="https://i/x.jpg" alt="配图.jpg"><span class="t">配图.jpg</span></span>'
      + '<div>块级</div><b></b>';
    var pq = TEST.call('composerUbb', probe);
    var want = 'AB[b]粗[/b][b]强[/b][i]斜[/i][u]下[/u][s]删[/s][u]U[/u][color=#fd4c5d]红[/color]'
      + '\r\n[emot=acfun,2797/][emot=acfun,888/][img=配图.jpg]https://i/x.jpg[/img]块级';
    rec('cr-serialize-table', !!(pq && pq.text === want), pq && ('t=' + JSON.stringify(pq.text)));
    // 字数＝文本 + 每个令牌块计 1（配图块的文件名、占位 span 的「[表情]」都不计）：
    // 文本 AB/粗/强/斜/下/删/U/红/块级 = 11，令牌 3（表情/占位/配图块）⇒ 14
    rec('cr-count-table', !!(pq && pq.count === 14), pq && ('n=' + pq.count));
    // 三连以上空行压两行、首尾空行去掉
    var probe2 = document.createElement('div');
    probe2.innerHTML = '<br><br>甲<br><br><br><br>乙<br><br>';
    var pq2 = TEST.call('composerUbb', probe2);
    rec('cr-newline-collapse', !!(pq2 && pq2.text === '甲\r\n\r\n乙'), pq2 && JSON.stringify(pq2.text));

    // ---- ③ 真输入 → 字数；工具键 B/U/S → 出口标签 ----
    typeText('测试中文输入');
    await wait(120);
    rec('cr-type-count', !!cnt && cnt.textContent === '6', cnt && cnt.textContent);
    rec('cr-type-ubb', (function () { var w = wire(); return !!w && w.text === '测试中文输入'; })(),
      (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    ed.focus(); selectAll();
    box.querySelector('.acsv-cinput-fmt').click(); // B
    rec('cr-bold', (function () { var w = wire(); return !!w && w.text === '[b]测试中文输入[/b]'; })(),
      (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    rec('cr-bold-btn-on', box.querySelector('.acsv-cinput-fmt').classList.contains('on'),
      box.querySelector('.acsv-cinput-fmt').className);
    box.querySelectorAll('.acsv-cinput-fmt')[2].click(); // U
    rec('cr-underline', (function () { var w = wire(); return !!w && /\[u\]/.test(w.text) && /\[\/u\]/.test(w.text); })(),
      (function () { var w = wire(); return w && JSON.stringify(w.text); })());

    // ---- ④ 颜色键（官方 split 三件 + 官方 70 色色板）：出口 [color=#hex]（rgb 归一进 hex 白名单） ----
    var colMain = box.querySelector('.acsv-cinput-colkey .acsv-cinput-fmt');
    var colCaretKey = box.querySelector('.acsv-cinput-colcaret');
    var pop = box.querySelector('.acsv-colpop');
    var lab = box.querySelector('.acsv-cinput-collabel');
    // 色板结构（官方实测）：70 格 = 主题 6×10 + 标准 1×10、两个行标题、格 14×14、列距 18、面板 216 宽
    rec('cr-palette-structure', (function () {
      var grids = pop.querySelectorAll('.acsv-colpop-g');
      var cells = pop.querySelectorAll('.acsv-colpop-g i');
      var titles = [].map.call(pop.querySelectorAll('.acsv-colpop-h'), function (x) { return x.textContent; });
      var per = [].map.call(grids, function (g) { return g.children.length; }).join(',');
      return grids.length === 7 && cells.length === 70 && per === '10,10,10,10,10,10,10'
        && titles.join('|') === '主题颜色|标准颜色';
    })(), (function () {
      var cells = pop.querySelectorAll('.acsv-colpop-g i');
      return 'cells=' + cells.length + ' titles=' + [].map.call(pop.querySelectorAll('.acsv-colpop-h'), function (x) { return x.textContent; }).join('/');
    })());
    // ★ 暗色格边不许"淡到看不出"（2026-10-15 用户实拍：.16 白时近黑格没轮廓）——钉 alpha ≥ 0.3
    rec('cr-palette-cellborder', (function () {
      var c = pop.querySelector('.acsv-colpop-g i');
      var m = /rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/.exec(getComputedStyle(c).borderTopColor);
      if (!m) return false;
      var alpha = m[4] === undefined ? 1 : Number(m[4]);
      return alpha >= 0.3;
    })(), getComputedStyle(pop.querySelector('.acsv-colpop-g i')).borderTopColor);
    // 主键 = 应用当前色（**不弹面板**）；箭头键 = 开/收面板
    ed.focus(); selectAll();
    var labBefore = lab.style.background;
    colMain.click();
    rec('cr-colmain-no-pop', !pop.classList.contains('on') && lab.style.background === labBefore,
      'open=' + pop.classList.contains('on') + ' lab=' + lab.style.background);
    colCaretKey.click();
    rec('cr-colorpop-open', (function () {
      return pop.classList.contains('on')
        && getComputedStyle(pop).display === 'block'
        && colCaretKey.classList.contains('on')                     // 官方开面板时 splitbutton 亮起
        && Math.abs(pop.getBoundingClientRect().top - colMain.getBoundingClientRect().bottom) >= 0; // 向上开（面板在键上方）
    })(), (function () {
      var pr = pop.getBoundingClientRect(), kr = colMain.getBoundingClientRect();
      return 'pop.bottom=' + Math.round(pr.bottom) + ' key.top=' + Math.round(kr.top);
    })());
    rec('cr-palette-geometry', (function () {
      var c = pop.querySelector('.acsv-colpop-g i');
      var cs = getComputedStyle(c);
      var box2 = c.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      var cs2 = pop.querySelectorAll('.acsv-colpop-g i')[1].getBoundingClientRect();
      return Math.round(box2.width) === 14 && Math.round(box2.height) === 14
        && Math.round(cs2.left - box2.right) === 4                 // 列距 18（14 + 2×2 外边距）
        && pr.width >= 210 && pr.width <= 226                      // 面板 216（官方实测同值）
        && cs.borderTopStyle === 'solid';
    })(), (function () {
      var c = pop.querySelector('.acsv-colpop-g i');
      var box2 = c.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      return 'cell=' + Math.round(box2.width) + ' panel=' + Math.round(pr.width) + ' border=' + getComputedStyle(c).borderTopColor;
    })());
    // 点官方主题红 #c0504d → 出口 [color=#c0504d]；色条跟着变；面板收起
    if (pop.querySelector('i[data-color="#c0504d"]')) pop.querySelector('i[data-color="#c0504d"]').click();
    rec('cr-color', (function () {
      var w = wire();
      return !!w && w.text.indexOf('[color=#c0504d]') >= 0 && w.text.indexOf('[/color]') >= 0;
    })(), (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    rec('cr-color-label-follows', lab.style.background === 'rgb(192, 80, 77)', lab.style.background);
    rec('cr-colorpop-closed', !pop.classList.contains('on') && !colCaretKey.classList.contains('on'),
      'pop=' + pop.className + ' caret=' + colCaretKey.className + ' disp=' + getComputedStyle(pop).display
      + ' inline=' + JSON.stringify(pop.style.display) + ' conn=' + pop.isConnected + ' parentHid=' + getComputedStyle(pop.parentNode).display);
    // 颜色键产物**没有** rgb() 残留（归一：渲染侧白名单只认 hex）
    rec('cr-color-hex-only', (function () {
      var spans = ed.querySelectorAll('[style*="color"]');
      for (var i = 0; i < spans.length; i++) {
        if (/rgb/i.test(spans[i].getAttribute('style') || '')) return false;
      }
      return spans.length > 0;
    })(), (function () { return [].map.call(ed.querySelectorAll('span[style]'), function (sp) { return sp.getAttribute('style'); }).join(' | '); })());

    clear();
    rec('cr-clear-placeholder', (function () {
      // 空态：DOM 真空 + :empty::before 出占位文案（contenteditable 无原生 placeholder）
      var cs = getComputedStyle(ed, '::before');
      return ed.childNodes.length === 0 && cs.content.indexOf('评论一时爽') >= 0;
    })(), (function () { return 'html=' + JSON.stringify(ed.innerHTML); })());
    rec('cr-clear-count', !!cnt && cnt.textContent === '', cnt && cnt.textContent);
    rec('cr-send-disabled-empty', !!sendBtn && sendBtn.disabled === true && sendBtn.classList.contains('disabled'));

    // ---- ⑤ 表情插入（真面板→真节点）+ 原生删除/撤销 ----
    box.querySelector('.acsv-cinput-emot').click();
    rec('cr-emot-items', !!(await waitFor(function () { return !!box.querySelector('.acsv-emot-item'); }, 6000)));
    // 面板锚点：贴输入条上沿（bottom:84 ⇒ |panel.bottom − bar.top| ≤ 2）
    rec('cr-emotpanel-anchor', (function () {
      var p = box.querySelector('.acsv-emotpanel'), b = box.querySelector('.acsv-cinput');
      if (!p || !b || getComputedStyle(p).display === 'none') return false;
      var pr = p.getBoundingClientRect(), br = b.getBoundingClientRect();
      return Math.abs(pr.bottom - br.top) <= 2 && pr.top >= box.getBoundingClientRect().top - 1;
    })(), (function () {
      var p = box.querySelector('.acsv-emotpanel'), b = box.querySelector('.acsv-cinput');
      return p && b ? (Math.round(p.getBoundingClientRect().bottom) + ' vs ' + Math.round(b.getBoundingClientRect().top)) : 'n/a';
    })());
    var item = box.querySelector('.acsv-emot-item');
    if (item) item.click();
    box.querySelector('.acsv-cinput-emot').click(); // 收起面板
    var emotImg = ed.querySelector('img.ubb-emotion, span.ubb-emot-ph');
    rec('cr-emot-node', !!emotImg, ed.innerHTML.slice(0, 90));
    rec('cr-emot-ubb', (function () {
      var w = wire();
      return !!w && /^\[emot=acfun,e0_\d+\/\]$/.test(w.text) && w.count === 1;
    })(), (function () { var w = wire(); return w && JSON.stringify(w.text) + ' n=' + w.count; })());
    // 原生撤销：insertHTML 进的撤销栈 ⇒ undo 能整个撤掉（预览稿 ⑤ 路径②定论；自建快照栈不做）
    ed.focus();
    document.execCommand('undo'); // 与 Ctrl+Z 同一机制
    rec('cr-undo-insert', (function () {
      var w = wire();
      return !!w && w.text === '' && !ed.querySelector('img.ubb-emotion');
    })(), (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    // 混合场景（预览稿 ⑤ 实拍的那条）：文字 + 表情 → 删表情 → 撤销 ⇒ 表情复原、**不重复**
    // （Range.insertNode 路径正是这里出两个 [emot=…]；走 execCommand 才有此性质）
    typeText('A');
    box.querySelector('.acsv-cinput-emot').click();
    await waitFor(function () { return !!box.querySelector('.acsv-emot-item'); }, 4000);
    if (box.querySelector('.acsv-emot-item')) box.querySelector('.acsv-emot-item').click();
    box.querySelector('.acsv-cinput-emot').click();
    rec('cr-mix-before', (function () { var w = wire(); return !!w && /^A\[emot=acfun,e0_\d+\/\]$/.test(w.text); })(),
      (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    var emNow = ed.querySelector('img.ubb-emotion, span.ubb-emot-ph');
    if (emNow) {
      ed.focus();
      var r1 = document.createRange();
      r1.selectNode(emNow);
      var sel1 = window.getSelection();
      sel1.removeAllRanges(); sel1.addRange(r1);
      document.execCommand('delete'); // 原生删除（整块走：img 是原子节点）
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }
    rec('cr-mix-deleted', (function () { var w = wire(); return !!w && w.text === 'A'; })(),
      (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    ed.focus();
    document.execCommand('undo');
    rec('cr-undo-mix', (function () {
      var w = wire();
      // 复原且**只有一个**令牌（重复 = 预览稿记录的错乱形态）
      return !!w && /^A\[emot=acfun,e0_\d+\/\]$/.test(w.text)
        && ed.querySelectorAll('img.ubb-emotion, span.ubb-emot-ph').length === 1;
    })(), (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    clear();
    rec('cr-emot-delete-clean', (function () {
      var w = wire();
      return !!w && w.text === '' && ed.textContent.indexOf('[emot=') < 0;
    })(), 'html=' + JSON.stringify(ed.innerHTML));

    // ---- ⑥ 粘贴清洗（最保守纯文本化：HTML 标签进不来） ----
    (function () {
      ed.focus(); caretEnd();
      var dt = new DataTransfer();
      dt.setData('text/plain', '<b>粗</b>第一行\n第二行');
      var ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      ed.dispatchEvent(ev);
    })();
    rec('cr-paste-plain', (function () {
      var w = wire();
      return !!w && w.text === '<b>粗</b>第一行\r\n第二行' && ed.querySelectorAll('b').length === 0;
    })(), (function () { var w = wire(); return w && JSON.stringify(w.text); })());
    clear();

    // ---- ⑦ 回复态占位（data-ph 随 chip 联动） ----
    var rb = box.querySelector('.acsv-creplybtn');
    if (rb) {
      rb.click();
      rec('cr-reply-placeholder', ed.getAttribute('data-ph').indexOf('回复 @') === 0,
        ed.getAttribute('data-ph'));
      var chip = box.querySelector('.acsv-quotechip');
      rec('cr-reply-chip', !!chip && chip.style.display === 'flex' && /回复：@/.test(chip.textContent),
        chip && chip.textContent);
      var cx = chip && chip.querySelector('.acsv-quotechip-x');
      if (cx) cx.click();
      rec('cr-reply-cancel', ed.getAttribute('data-ph').indexOf('回复') < 0, ed.getAttribute('data-ph'));
    } else {
      rec('cr-reply-placeholder', false, 'no-reply-btn');
    }

    // ---- ⑧ 超字数硬拒绝（1000 上限：超 1 字 ⇒ 红字 + 描红边 + 发送键禁用） ----
    typeText(new Array(1001).join('x')); // 1000 字
    await wait(80);
    rec('cr-limit-at', !!cnt && cnt.textContent === '1000' && !sendBtn.disabled, cnt && cnt.textContent);
    ed.focus(); caretEnd();
    document.execCommand('insertText', false, 'x');
    await wait(80);
    rec('cr-limit-over', !!cnt && cnt.textContent === '1001/1000' && cnt.classList.contains('over'),
      cnt && cnt.textContent);
    rec('cr-limit-over-ui', (function () {
      return sendBtn.disabled === true && sendBtn.classList.contains('disabled')
        && !!box.querySelector('.acsv-cinput-wrap.over');
    })());
    clear();

    // ---- ⑨ 端到端发送：Enter → 出口 UBB 进 comment/add 的 body，发完清空 ----
    typeText('行内富文本评论');
    await wait(80);
    ed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    rec('cr-enter-send', !!(await waitFor(function () {
      var w = TEST.call('composerUbb', ed);
      return w.text === '' && /行内富文本评论/.test(bodyText());
    }, 6000)), 'body=' + String(window.__ACSV_CMT_BODY__).slice(0, 90) + ' html=' + JSON.stringify(ed.innerHTML));
    rec('cr-send-body-ubb', /content=/.test(String(window.__ACSV_CMT_BODY__))
      && /行内富文本评论/.test(decodeURIComponent(String(window.__ACSV_CMT_BODY__)).replace(/\+/g, ' ')),
      String(window.__ACSV_CMT_BODY__).slice(0, 120));
    rec('cr-sent-count-reset', !!cnt && cnt.textContent === '', cnt && cnt.textContent);
  };
})();
