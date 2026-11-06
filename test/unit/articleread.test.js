// test/unit/articleread.test.js —— 文章阅读浮层（0.9.326）契约件的 node 直采单测。
// 契约（并行实现批照此开发，形态真源 docs/preview/article-reader-v3.html）：
//   src/articleread.js 导出 openArticleReader(pi) / closeArticleReader() / sanitizeArticleBody(html)→string
//   sanitizeArticleBody：标签白名单 p/br/img/h2/h3/ul/ol/li/blockquote/table/thead/tbody/tr/th/td/
//   pre/code/figcaption/figure/a；属性白名单 img 仅 src/alt、a 仅 href；img/a 的 URL 须过
//   src/imgurl.js 的 CDN_URL_OK（不过 ⇒ 摘除元素、留 alt/文本）；script/iframe/on* 内联事件/style 全摘；
//   [emot=zt,<id>/] ⇒ 占位 span（带 data 属性；zt 图源未实测 ⇒ 不回填）。
//
// 【两组用例的分工，为什么这样切】
//   A) 导出契约组：**必须跑**。模块不落地 ⇒ 本组红（并行批的显式待办，不许静默绿）。
//   B) sanitize 分支组：实现若走 DOMParser/innerHTML（浏览器件），node 20 没有 DOMParser ⇒
//      本组以 skip + 原因显式跳出，**同一分支矩阵在 harness 场景 test/cases/article.js 的
//      article-sanitize-* / article-emot-ph 上以真 DOM 钉住**（那边跑的是真浏览器，摘净化即红）；
//      实现若是纯字符串式（ubb.js 同族手法），本组自动全跑。判据不是猜的：开层前先探一发。
//   C) tallImg（自然高 >75vh 折算）：契约只钉语义未钉签名 ⇒ 形状自适配 + 只断「两种读法都同意」的
//      不变式（极高窄图 = tall、矮宽图 = not tall）；能区分「折算 vs 直读自然高」的那件样本
//      （3000×1000 @900vh）只回写读数不作断言（口径未在册，别拿测试替实现猜）。
//
// 【反跑登记】
//   · 摘掉任一标签的白名单放行 ⇒ 「白名单标签逐件保留」红；
//   · 放开非白名单标签（div/span/b）⇒「非白名单标签不活下来」红；
//   · 属性白名单放宽（img 收 class/loading、a 收 target/rel）⇒「属性白名单逐件摘除」红；
//   · URL 判定不再过 CDN_URL_OK（或换成手抄的第二份白名单）⇒「URL 白名单」/「单源不抄第二份网」红；
//   · 摘除元素时连 alt/文本一起删掉 ⇒「坏 URL 件摘除但留 alt/文本」红；
//   · script/iframe/on*/style 任一放行 ⇒「脏件全摘」红；
//   · emot 方言件不转占位、或占位不带 data 属性、或擅自回填 zt 图源 ⇒ 三条 emot 用例各红；
//   · 把 sanitize 改成会抛错（如未防 null/非串入参）⇒「任何输入不抛错」红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 依赖链 articleread→ui/cfg→dbg 在模块顶层读 window，且 dbg 顶层吃构建期 define
// __ACSV_DEBUG__ ⇒ Node 直采前先垫（purity/chipkit 同款最小集，非推测）
globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.addEventListener = function () { };
globalThis.removeEventListener = function () { };
globalThis.localStorage = {
  getItem: function () { return null; },
  setItem: function () { },
  removeItem: function () { }
};
// document 桩只保「模块 import 期不炸」；净化若真吃 DOM，桩不会伪装成能解析 HTML 的样子，
// 由下面的探针判出环境缺口（桩越像真 DOM，越容易把「跑不动」骗成「跑过了」）
function stubEl(tag) {
  var e = {
    tagName: String(tag).toUpperCase(), attributes: [], children: [], style: {},
    setAttribute: function (k, v) { e.attributes.push({ name: k, value: String(v) }); },
    getAttribute: function (k) { var f = e.attributes.find(function (a) { return a.name === k; }); return f ? f.value : null; },
    removeAttribute: function (k) { e.attributes = e.attributes.filter(function (a) { return a.name !== k; }); },
    appendChild: function (c) { e.children.push(c); return c; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    closest: function () { return null; },
    remove: function () { }
  };
  Object.defineProperty(e, 'innerHTML', {
    get: function () { return e.__html || ''; },
    set: function (v) { e.__html = String(v); },
    configurable: true
  });
  e.outerHTML = '';
  return e;
}
globalThis.document = {
  createElement: stubEl,
  createTextNode: function (t) { return { nodeValue: String(t) }; },
  addEventListener: function () { },
  removeEventListener: function () { },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  hidden: false
};
// XSS 哨兵属性名集合（净化后不得出现任何 on* / style 属性）
function dirtyAttrsOf(html) {
  var out = [];
  String(html).replace(/<([a-zA-Z][\w-]*)\b([^>]*)>/g, function (m, tag, attrs) {
    var re = /([a-zA-Z_:][-\w:.]*)\s*=/g, k;
    while ((k = re.exec(attrs))) {
      var nm = k[1].toLowerCase();
      if (/^on/.test(nm) || nm === 'style') out.push(tag.toLowerCase() + '.' + nm);
    }
    return m;
  });
  return out;
}
function tagAlive(html, tag) {
  return new RegExp('<' + tag + '(\\s|>|/)', 'i').test(String(html));
}
function attrOf(html, tag, attr) {
  var re = new RegExp('<' + tag + '\\b([^>]*)>', 'i');
  var m = re.exec(String(html));
  if (!m) return null;
  var a = new RegExp('\\b' + attr + '\\s*=\\s*"([^"]*)"', 'i').exec(m[1]);
  return a ? a[1] : null;
}

var MOD = null, LOAD_ERR = '';
try {
  MOD = await import('../../src/articleread.js');
} catch (e) {
  LOAD_ERR = String((e && e.message) || e);
}
var SRC = '';
try { SRC = readFileSync(new URL('../../src/articleread.js', import.meta.url), 'utf8'); } catch (e) { }

// ---------- A) 导出契约组（模块不落地即红） ----------
test('articleread 契约件：模块可 import，三个导出都是函数', () => {
  assert.equal(LOAD_ERR, '', 'src/articleread.js 未落地/不可 import（0.9.326 并行批待集成）：' + LOAD_ERR);
  assert.equal(typeof MOD.openArticleReader, 'function', 'openArticleReader 必须是函数');
  assert.equal(typeof MOD.closeArticleReader, 'function', 'closeArticleReader 必须是函数');
  assert.equal(typeof MOD.sanitizeArticleBody, 'function', 'sanitizeArticleBody 必须是函数');
});

test('单源不抄第二份网：URL 判定必须 import imgurl.CDN_URL_OK（正文里不得再现图床正则字面）', () => {
  assert.equal(LOAD_ERR, '', '模块未落地：' + LOAD_ERR);
  assert.ok(/from\s+'\.\/imgurl\.js'/.test(SRC),
    'URL 白名单唯一出口在 src/imgurl.js（0.9.302 收口），articleread 必须 import 它而不是手抄一份');
  assert.ok(/CDN_URL_OK/.test(SRC), 'CDN_URL_OK 未被引用 ⇒ 净化没走白名单出口');
  // imgurl.test.js 同款防复制回归：白名单第二份拷贝必漂
  var copies = SRC.match(/ndcsk|aixifan\\?\.com\|acfun/g) || [];
  assert.equal(copies.length, 0, '净化里出现第二份图床白名单字面（必漂移）：' + copies.join(','));
});

test('正文管线不吃评论渲染器（稿附节 7：renderCommentHtml 会把 <p>/<img> 转义）', () => {
  assert.equal(LOAD_ERR, '', '模块未落地：' + LOAD_ERR);
  assert.ok(!/renderCommentHtml/.test(SRC),
    'articleread 里出现 renderCommentHtml ⇒ 正文会被整段转义（稿附节 7 明令禁止）');
});

// ---------- B) sanitize 分支组（先探环境，探不动就显式跳出） ----------
var SAN = MOD && typeof MOD.sanitizeArticleBody === 'function' ? MOD.sanitizeArticleBody : null;
var SAN_ERR = '';
var SAN_OK = (function () {
  if (!SAN) { SAN_ERR = LOAD_ERR ? '模块未落地' : '未导出 sanitizeArticleBody'; return false; }
  try {
    var out = SAN('<p>甲</p>');
    if (typeof out !== 'string') { SAN_ERR = '返回值不是字符串：' + typeof out; return false; }
    if (!/<p/i.test(out)) { SAN_ERR = '白名单 <p> 未透传（实现可能整段转义？）：' + out.slice(0, 60); return false; }
    return true;
  } catch (e) {
    SAN_ERR = String((e && e.message) || e);
    return false;
  }
})();
const SKIP = SAN_OK ? false : 'node 无真 DOM（探针失败：' + SAN_ERR + '）⇒ 同一分支矩阵在 '
  + 'test/cases/article.js 的 article-sanitize-* / article-emot-ph 上以真浏览器 DOM 钉住';

const KEEP_TAGS = ['p', 'br', 'img', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'figcaption', 'figure'];
const KEEP_DOC = KEEP_TAGS.map(function (t) {
  if (t === 'img') return '<img src="https://imgs.aixifan.com/a.png" alt="图">';
  if (t === 'br') return '<br>';
  if (t === 'td' || t === 'th' || t === 'tr') return '';   // 表格三件由下面 table 整块给
  return '<' + t + '>' + t + '文</' + t + '>';
}).join('') + '<table><thead><tr><th>节点</th></tr><tbody><tr><td>值</td></tr></tbody></table>'
  + '<figure><figcaption>图注</figcaption></figure>';

test('白名单标签逐件保留（19 件）', { skip: SKIP }, () => {
  var out = SAN(KEEP_DOC);
  var miss = KEEP_TAGS.filter(function (t) { return !tagAlive(out, t); });
  assert.deepEqual(miss, [], '这些白名单标签没被保留：' + miss.join(','));
});

test('非白名单标签不活下来（div/span/b/font/section）', { skip: SKIP }, () => {
  var out = SAN('<div class=x><span>甲</span><b>乙</b><font color=red>丙</font>'
    + '<section>丁</section></div><p>戊</p>');
  ['div', 'span', 'b', 'font', 'section'].forEach(function (t) {
    assert.ok(!tagAlive(out, t), '非白名单标签仍在场：<' + t + '> ⇒ ' + out);
  });
  assert.ok(tagAlive(out, 'p'), '白名单 <p> 被连坐删掉 ⇒ ' + out);
});

test('属性白名单：img 仅 src/alt，a 仅 href，其余全摘', { skip: SKIP }, () => {
  var out = SAN('<img src="https://imgs.aixifan.com/a.png" alt="留" title="t" class="c" '
    + 'loading="lazy" width="100" data-x="1"><a href="https://www.acfun.cn/a/ac1" '
    + 'target="_blank" rel="noopener" class="k" id="z">链</a>');
  assert.equal(attrOf(out, 'img', 'src'), 'https://imgs.aixifan.com/a.png', 'img src 应保留 ⇒ ' + out);
  assert.equal(attrOf(out, 'img', 'alt'), '留', 'img alt 应保留 ⇒ ' + out);
  ['title', 'class', 'loading', 'width', 'data-x'].forEach(function (a) {
    assert.equal(attrOf(out, 'img', a), null, 'img.' + a + ' 应摘除 ⇒ ' + out);
  });
  assert.equal(attrOf(out, 'a', 'href'), 'https://www.acfun.cn/a/ac1', 'a href 应保留 ⇒ ' + out);
  ['target', 'rel', 'class', 'id'].forEach(function (a) {
    assert.equal(attrOf(out, 'a', a), null, 'a.' + a + ' 应摘除 ⇒ ' + out);
  });
});

test('URL 白名单：白名单域放行（imgs.aixifan.com / *.acfun.cn），其它域摘除', { skip: SKIP }, () => {
  var out = SAN('<img src="https://imgs.aixifan.com/a.png" alt="好图">'
    + '<img src="https://a.b.acfun.cn/b.png" alt="好图2">'
    + '<a href="https://www.acfun.cn/a/ac1">站内</a>');
  assert.ok(/imgs\.aixifan\.com\/a\.png/.test(out), '白名单 img 被摘了 ⇒ ' + out);
  assert.ok(/a\.b\.acfun\.cn\/b\.png/.test(out), 'acfun.cn 子域 img 被摘了 ⇒ ' + out);
  assert.ok(/href="https:\/\/www\.acfun\.cn\/a\/ac1"/.test(out), '白名单 a href 被摘了 ⇒ ' + out);
});

test('URL 不过白名单：img/a 元素摘除，但留 alt/文本', { skip: SKIP }, () => {
  var out = SAN('<p><img src="https://evil.example/x.png" alt="坏图源留字">'
    + '<a href="https://evil.example/go">坏链文字</a>'
    + '<a href="javascript:void(0)">JS链文字</a></p>');
  assert.ok(!/evil\.example/.test(out), '坏域 URL 活了下来 ⇒ ' + out);
  assert.ok(!/javascript:/i.test(out), 'javascript: 伪协议活了下来 ⇒ ' + out);
  assert.ok(out.indexOf('坏图源留字') >= 0, '坏图摘除时把 alt 文字一起删了（契约：留 alt/文本）⇒ ' + out);
  assert.ok(out.indexOf('坏链文字') >= 0, '坏链摘除时把锚文本一起删了 ⇒ ' + out);
  assert.ok(out.indexOf('JS链文字') >= 0, 'javascript: 链摘除时把锚文本一起删了 ⇒ ' + out);
});

test('脏件全摘：script/iframe/on* 内联事件/style 属性（含大小写与嵌套写法）', { skip: SKIP }, () => {
  var out = SAN('<div><scr' + 'ipt>alert(1)</scr' + 'ipt>'
    + '<IFRAME src="https://evil.example/f"></IFRAME>'
    + '<img src="https://imgs.aixifan.com/a.png" onerror="alert(2)" ONLOAD="alert(3)">'
    + '<p style="color:red" ONMOUSEOVER="alert(4)">文</p></div>');
  assert.ok(!/<script/i.test(out), 'script 未摘 ⇒ ' + out);
  assert.ok(!/alert\(/.test(out), '脚本体/事件体文本漏出 ⇒ ' + out);
  assert.ok(!/<iframe/i.test(out), 'iframe 未摘（大小写写法漏网）⇒ ' + out);
  assert.deepEqual(dirtyAttrsOf(out), [], 'on*/style 属性未摘净 ⇒ ' + out);
});

test('嵌套净化：白名单壳里的脏件被摘、壳与外层文字留住', { skip: SKIP }, () => {
  var out = SAN('<blockquote><p>引用段一<scr' + 'ipt>bad()</scr' + 'ipt>引用段二</p>'
    + '<ul><li onclick="bad()">项一</li><li>项二</li></ul></blockquote>'
    + '<table><tbody><tr><td><iframe src="https://evil.example/f"></iframe>格内文</td></tr></tbody></table>');
  assert.ok(/引用段一/.test(out) && /引用段二/.test(out), '壳内文字被连坐删 ⇒ ' + out);
  assert.ok(tagAlive(out, 'blockquote') && tagAlive(out, 'ul') && tagAlive(out, 'li') && tagAlive(out, 'table'),
    '白名单容器被整块删 ⇒ ' + out);
  assert.ok(!/bad\(\)/.test(out), '嵌套脏件未摘 ⇒ ' + out);
  assert.ok(!/<iframe/i.test(out), '表格格内 iframe 未摘 ⇒ ' + out);
  assert.deepEqual(dirtyAttrsOf(out), [], '嵌套 on* 未摘 ⇒ ' + out);
});

test('emot 方言件转占位 span（带 data 属性），且 zt 图源不回填', { skip: SKIP }, () => {
  var out = SAN('<p>月饼呀[emot=zt,23/]五仁党</p>');
  assert.ok(out.indexOf('[emot=zt') < 0, '方言原样漏在文本里 ⇒ ' + out);
  var m = /<span\b[^>]*>/.exec(out);
  assert.ok(m, '没产出占位 span ⇒ ' + out);
  assert.ok(/\bdata-[\w-]+\s*=/.test(m[0]), '占位 span 不带 data 属性（无法后续回填/样式挂咬）⇒ ' + m[0]);
  assert.ok(!/umeditor|emotion\/images|zt\/23\.gif/i.test(out),
    'zt 图源未实测却被回填成 img ⇒ ' + out);
});

test('emot 方言：acfun 包与 zt 包同走占位件（不分包漏件）', { skip: SKIP }, () => {
  var out = SAN('<p>甲[emot=acfun,1/]乙[emot=zt,7/]丙</p>');
  assert.ok(out.indexOf('[emot=') < 0, '仍有未转的方言件 ⇒ ' + out);
  assert.equal((out.match(/<span\b/g) || []).length, 2, '两件表情应各出一个占位 span ⇒ ' + out);
  assert.ok(out.indexOf('甲') >= 0 && out.indexOf('乙') >= 0 && out.indexOf('丙') >= 0,
    '占位转换吃掉了邻文本 ⇒ ' + out);
});

test('任何输入不抛错、返回恒为字符串（空/非串/破碎标签/深嵌套）', { skip: SKIP }, () => {
  [undefined, null, '', 0, {}, [], '<p>未闭合', '<p><b>深', '<<<>>>', '<img src=>',
    '<script</script>', '</div></div>', '<a href>裸</a>'].forEach(function (v) {
      var out;
      assert.doesNotThrow(function () { out = SAN(v); }, '抛错了，入参：' + JSON.stringify(String(v)));
      assert.equal(typeof out, 'string', '返回值不是字符串，入参：' + JSON.stringify(String(v)));
    });
});

test('净化不吞文本语义：中文/全角标点/空白原样（转义只作用在标签面）', { skip: SKIP }, () => {
  var src = '<p>又是一年团圆时节，AC娘在这里祝大家中秋快乐呀～今年 DD 歌回的主题就定为「唱团圆」。</p>';
  var out = SAN(src);
  assert.ok(out.indexOf('又是一年团圆时节，AC娘在这里祝大家中秋快乐呀～') >= 0, '正文文本被改动 ⇒ ' + out);
  assert.ok(out.indexOf('「唱团圆」') >= 0, '全角书名号被转义掉 ⇒ ' + out);
});

// ---------- C) tallImg（若导出；形状自适配，只断两种读法都同意的不变式） ----------
var TALL = null, TALL_SHAPE = '';
(function () {
  if (!MOD) return;
  // 契约名 isTallImg 直取（导出契约的一部分），未命中才退回形态自适配
  var key = typeof MOD.isTallImg === 'function' ? 'isTallImg'
    : Object.keys(MOD).filter(function (k) { return /tall/i.test(k); })[0];
  if (!key || typeof MOD[key] !== 'function') return;
  TALL = MOD[key];
  var shapes = [
    { name: '(w,h,vhPx)', call: function () { return TALL(300, 3000, 900); } },
    { name: '(h,vhPx)', call: function () { return TALL(3000, 900); } },
    { name: '({w,h},vhPx)', call: function () { return TALL({ width: 300, height: 3000 }, 900); } },
    { name: '(w,h,colW,vhPx)', call: function () { return TALL(300, 3000, 760, 900); } }
  ];
  for (var i = 0; i < shapes.length; i++) {
    try {
      if (typeof shapes[i].call() === 'boolean') { TALL_SHAPE = shapes[i].name; break; }
    } catch (e) { }
  }
})();

test('tallImg：极高窄图 = tall、矮宽图 = not tall（两种读法在此样本上同值）', {
  skip: TALL ? (TALL_SHAPE ? false : 'tallImg 已导出但候选签名都不返回布尔（' + Object.keys(MOD).join(',') + '）')
    : '未导出 tallImg 判定件（折算内联在渲染处）⇒ 由 harness 侧 .arimg--tall 钉'
}, () => {
  var tallOf = {
    '(w,h,vhPx)': function (w, h) { return TALL(w, h, 900); },
    '(h,vhPx)': function (w, h) { return TALL(h, 900); },
    '({w,h},vhPx)': function (w, h) { return TALL({ width: w, height: h }, 900); },
    '(w,h,colW,vhPx)': function (w, h) { return TALL(w, h, 760, 900); }
  }[TALL_SHAPE];
  assert.equal(tallOf(300, 3000), true, '300×3000 未判为长图 ⇒ 兜底不会生效');
  assert.equal(tallOf(400, 200), false, '400×200 被误判为长图 ⇒ 普通配图也被截');
  // 3000×1000 @760 版心：折算后 253px（≤75vh=675）→ false；直读自然高 1000>675 → true。
  // 两读法分歧 ⇒ 口径未在册，只回写读数作集成参考，不作断言。
  console.log('[tallImg 读数] 3000×1000@900vh = ' + tallOf(3000, 1000)
    + '（shape=' + TALL_SHAPE + '；折算读法应为 false，直读自然高应为 true）');
});
