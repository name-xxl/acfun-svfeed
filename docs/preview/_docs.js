/* ============================================================
   docs/preview/_docs.js —— 确认稿文档站共享导航（2026-11-23 文档站化批）
   职责：侧栏注册表（单源）→ 生成导航 → 当前页高亮 → 顶栏面包屑 → 右缘本页目录
        → 窄宽抽屉 → iframe 内嵌降级（embed）→ 页间无刷新跳转 + 滚动记忆。
   新增确认稿只改 NAV，别在各页另写一份导航（单源纪律）。
   file:// 双击直开可用：无 fetch 依赖（无刷新跳转自动禁用，退回普通跳转）。
   ============================================================ */
(function () {
  'use strict';

  // 注册表：['文件名', '短标签']；分组顺序 = 侧栏顺序
  var NAV = [
    { group: '播放与播放器', items: [
      ['player-bottombar.html', '播放器底栏'],
      ['danmaku-canvas-169.html', '弹幕画布 16:9'],
      ['views-count-format.html', '计数「万」口径'],
      ['ui-bugfix.html', 'UI/Bug 专项 Wave 2']
    ] },
    { group: '评论与互动', items: [
      ['comment-drawer-states.html', '评论抽屉三态'],
      ['comment-meta-polish.html', '评论三修'],
      ['comment-avatar-frame-clip.html', '头像框裁切修法'],
      ['content-actions.html', '内容操作接线'],
      ['native-interaction-states.html', '交互态对齐原生'],
      ['ip-device-tags.html', 'IP 属地+设备标签'],
      ['ip-panel-unified.html', 'IP 面板两主题']
    ] },
    { group: '动态与广场', items: [
      ['moment-strip-actions.html', '行卡交互态统一'],
      ['moment-detail-close.html', '详情关闭键收编'],
      ['moment-browse.html', '动态浏览双宿主'],
      ['moment-editor.html', '发动态编辑器'],
      ['moment-name-colors.html', '名字三色']
    ] },
    { group: '文章与阅读', items: [
      ['article-reader-v3.html', '文章阅读浮层 v3'],
      ['im-article-card.html', 'IM 文章卡'],
      ['composer-richtext.html', '富文本输入条']
    ] },
    { group: '关注 · 我的 · 收藏', items: [
      ['follow-list-native.html', '关注列表对齐原生'],
      ['follow-modal-settings.html', '关注弹窗对齐设置'],
      ['follow-groups.html', '关注分组'],
      ['fav-folders.html', '收藏夹'],
      ['me-tabhead.html', '我的页档头'],
      ['signin-almanac.html', '签到 + 黄历弹窗']
    ] },
    { group: '搜索 · 分区 · 卡片', items: [
      ['search-v2.html', '搜索 2.0'],
      ['search-dropdown.html', '搜索聚焦面板'],
      ['pickpop-align.html', '选择层横向对齐'],
      ['pickpop-position.html', '选择层定位'],
      ['card-hover-unified.html', '卡片悬停/按压统一'],
      ['jingxuan.html', '分区页 v6']
    ] },
    { group: '设置 · 入口 · 其他', items: [
      ['guest-read.html', '游客浏览开关'],
      ['native-inject-switch.html', '官方页增强开关'],
      ['toggle-unified.html', '开关控件单源'],
      ['loading-spinner.html', '加载转圈'],
      ['pubfab-backtop.html', '浮标 × 回顶协调']
    ] }
  ];

  var REPO = 'https://github.com/name-xxl/acfun-svfeed';
  var EMBED = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  var cur = (location.pathname.split('/').pop() || '').toLowerCase() || 'index.html';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function totalPages() {
    var n = 0;
    NAV.forEach(function (g) { n += g.items.length; });
    return n;
  }

  function findPage(filename) {
    var hit = { grp: null, label: null };
    NAV.forEach(function (g) {
      g.items.forEach(function (it) {
        if (it[0].toLowerCase() === filename) { hit.grp = g.group; hit.label = it[1]; }
      });
    });
    return hit;
  }

  function buildSide() {
    var side = document.getElementById('docsSide');
    if (!side) return;
    side.textContent = '';
    var brand = el('div', 'docs-brand');
    var logo = el('span', 'logo', 'A');
    var tt = el('div', 'tt');
    tt.appendChild(el('b', null, 'AcFun 小视频 · UI 确认稿'));
    tt.appendChild(el('span', null, 'docs/preview 设计文档'));
    brand.appendChild(logo); brand.appendChild(tt);
    side.appendChild(brand);

    var nav = el('nav', 'docs-nav');
    NAV.forEach(function (g) {
      var box = el('div', 'ng');
      box.appendChild(el('h3', null, g.group));
      g.items.forEach(function (it) {
        var a = el('a');
        a.href = it[0];
        a.appendChild(el('span', 'dot'));
        a.appendChild(document.createTextNode(it[1]));
        if (it[0].toLowerCase() === cur) a.className = 'on';
        box.appendChild(a);
      });
      nav.appendChild(box);
    });
    side.appendChild(nav);

    var ft = el('div', 'ft');
    var home = el('a', null, '← 项目首页');
    home.href = '../../index.html';
    ft.appendChild(home);
    ft.appendChild(document.createTextNode(' · '));
    var gh = el('a', null, 'GitHub');
    gh.href = REPO; gh.target = '_blank'; gh.rel = 'noopener';
    ft.appendChild(gh);
    ft.appendChild(el('div', null, '确认稿 ' + totalPages() + ' 页 · 暗色皮肤口径'));
    side.appendChild(ft);
  }

  function setCrumb() {
    var crumb = document.querySelector('.docs-top .crumb');
    if (!crumb) return;
    var hit = findPage(cur);
    crumb.textContent = '';
    crumb.appendChild(el('b', null, hit.grp || 'UI 确认稿'));
    crumb.appendChild(el('span', 'sep', '›'));
    crumb.appendChild(el('span', null, hit.label || document.title.replace(/^UI 预览( · | v\d+ · )?/, '')));
  }

  function buildTop() {
    var top = document.querySelector('.docs-top');
    if (!top) return;
    var menu = el('button', 'docs-menu');
    menu.type = 'button';
    menu.setAttribute('aria-label', '目录');
    menu.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>';
    top.insertBefore(menu, top.firstChild);
    if (!top.querySelector('.tag')) top.appendChild(el('span', 'tag', '确认稿 ' + totalPages() + ' 页'));
    if (!top.querySelector('.gh')) {
      var gh = el('a', 'gh');
      gh.href = REPO; gh.target = '_blank'; gh.rel = 'noopener';
      gh.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg>'
        + '<span>GitHub</span>';
      top.appendChild(gh);
    }
    setCrumb();
    var side = document.getElementById('docsSide');
    var mask = document.getElementById('docsMask');
    function close() { if (side) side.classList.remove('open'); if (mask) mask.classList.remove('show'); }
    if (mask) mask.addEventListener('click', close);
    menu.addEventListener('click', function () {
      if (!side) return;
      var open = side.classList.toggle('open');
      if (mask) mask.classList.toggle('show', open);
    });
    if (side) side.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  }

  function buildRail() {
    var doc = document.querySelector('main.doc');
    if (!doc) return;
    var old = document.querySelector('.doc-rail');
    if (old) old.remove();
    var items = [];
    Array.prototype.forEach.call(doc.children, function (n) {
      if (n.classList && (n.classList.contains('doc-sec') || n.classList.contains('doc-arch'))) items.push(n);
    });
    if (items.length < 3) return;
    var rail = el('nav', 'doc-rail');
    rail.setAttribute('aria-label', '本页目录');
    rail.appendChild(el('div', 'rt', '本页目录'));
    items.forEach(function (s) {
      if (s.classList.contains('doc-arch')) {
        var ttl = s.querySelector('summary .ttl');
        rail.appendChild(el('div', 'grp', ttl ? ttl.textContent : '决策档案'));
        Array.prototype.forEach.call(s.querySelectorAll(':scope > .doc-sec'), function (sub) {
          var h = sub.querySelector('h2');
          var a = el('a', 'lv2', h ? h.textContent : '(未命名)');
          if (sub.id) a.href = '#' + sub.id;
          rail.appendChild(a);
        });
      } else {
        var h2 = s.querySelector('h2');
        var a2 = el('a', null, h2 ? h2.textContent : '(未命名)');
        if (s.id) a2.href = '#' + s.id;
        rail.appendChild(a2);
      }
    });
    document.body.appendChild(rail);
  }

  // ---------- 页间无刷新跳转（http(s) 下启用；file:// / iframe 内退回普通跳转） ----------
  var SCROLL_KEY = 'acsv-docs-scroll';
  var pageStyles = Array.prototype.slice.call(document.querySelectorAll('head style'));

  function readScrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveScroll() {
    try {
      var m = readScrollMap();
      m[cur] = window.scrollY || 0;
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m));
    } catch (e) {}
  }

  function dirOf(p) { return p.replace(/\/[^/]*$/, ''); }

  function swap(docObj, filename, opts) {
    pageStyles.forEach(function (s) { s.remove(); });
    pageStyles = Array.prototype.slice.call(docObj.querySelectorAll('head style')).map(function (s) {
      var n = s.cloneNode(true);
      document.head.appendChild(n);
      return n;
    });
    var main = document.querySelector('main.doc');
    var newMain = docObj.querySelector('main.doc');
    if (!main || !newMain) throw new Error('no main.doc');
    main.innerHTML = newMain.innerHTML;
    document.title = docObj.title;
    // 新内容内联脚本需重建才会执行（demo 交互脚本）
    Array.prototype.forEach.call(main.querySelectorAll('script'), function (old) {
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
    cur = filename.toLowerCase();
    highlight(cur);
    buildRail();
    // 滚动：锚点 > 记忆 > 顶部（instant —— 页面全局 scroll-behavior:smooth 会让切页先漂一段）
    if (opts.hash) {
      var tgt = document.getElementById(opts.hash.slice(1));
      if (tgt) { tgt.scrollIntoView({ behavior: 'instant', block: 'start' }); return; }
    }
    if (opts.restore) {
      var y = readScrollMap()[cur];
      window.scrollTo({ top: y != null ? y : 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function spaGo(href, opts) {
    opts = opts || {};
    var u;
    try { u = new URL(href, location.href); } catch (e) { return false; }
    var filename = u.pathname.split('/').pop();
    if (!/\.html$/i.test(filename)) return false;
    if (opts.save !== false) saveScroll();
    fetch(u.pathname + u.search).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.text();
    }).then(function (html) {
      var docObj = new DOMParser().parseFromString(html, 'text/html');
      swap(docObj, filename, { hash: opts.hash || u.hash, restore: !!opts.restore });
      if (opts.push) history.pushState({ sv: 1 }, '', u.pathname + u.search + (u.hash || ''));
    }).catch(function () {
      location.href = href;
    });
    return true;
  }

  function highlight(filename) {
    cur = String(filename || '').toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll('.docs-nav a'), function (a) {
      a.classList.toggle('on', a.getAttribute('href').toLowerCase() === cur);
    });
    setCrumb();
  }

  function openFrame(file, hash) {
    var frame = document.getElementById('docsFrame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'docsFrame';
      frame.className = 'docs-frame';
      frame.title = '确认稿内容';
      document.body.appendChild(frame);
      document.body.classList.add('docs-shelling');
    }
    frame.src = file + (hash || '');
    highlight(file);
    var target = '#/' + file;
    try { history.replaceState(null, '', target); } catch (e) { try { location.hash = target; } catch (e2) {} }
  }

  function enableSpa() {
    var isHttp = /^https?:$/.test(location.protocol);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^[a-z]+:/i.test(href) && !/^https?:/i.test(href)) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (dirOf(u.pathname) !== dirOf(location.pathname)) return; // 只接管同目录页（首页等走普通跳转）
      if (!/\.html$/i.test(u.pathname)) return;
      e.preventDefault();
      var filename = u.pathname.split('/').pop();
      if (isHttp) {
        spaGo(u.pathname + u.search + u.hash, { push: true, hash: u.hash, restore: true });
      } else {
        openFrame(filename, u.hash);
      }
    });

    if (isHttp) {
      window.addEventListener('popstate', function () {
        spaGo(location.pathname + location.search + location.hash, { save: false, restore: true, hash: location.hash });
      });
      window.addEventListener('pagehide', saveScroll);
    } else {
      // file:// 常驻壳：内嵌页（embed 模式）上报当前文件名，壳侧同步高亮/面包屑
      window.addEventListener('message', function (ev) {
        var d = ev.data;
        if (d && d.t === 'acsv-embed-nav' && d.file) highlight(d.file);
      });
      // 刷新后按 #/xxx.html 还原
      var m = /^#\/([\w.\-]+\.html)$/.exec(location.hash || '');
      if (m) openFrame(m[1], '');
    }
  }

  function boot() {
    if (EMBED) {
      document.body.classList.add('docs-embed');
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ t: 'acsv-embed-nav', file: cur, title: document.title }, '*');
        }
      } catch (e) {}
      return;
    }
    buildSide();
    buildTop();
    buildRail();
    enableSpa();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();