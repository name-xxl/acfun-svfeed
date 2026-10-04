// test/cases/msg.js —— harness 场景：原生私信页装配
// 0.9.81 从 harness.html 原样搬迁（只加公共件参数前置，场景体逐字未改）——harness.html
// 只留公共件与分发器。改场景来本文件；新增场景记得同步 run-harness.mjs 的 HARNESS_CASES
//（test/check-cases.mjs 双向校验，漏登记/多登记直接失败）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  // ---- im-native ----
  C['im-native'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, cur = h.cur, key = h.key, wait = h.wait,
      waitFor = h.waitFor, firstVideoReady = h.firstVideoReady, topbarInView = h.topbarInView,
      feed = h.feed, TEST = h.TEST, CASE = h.CASE, RELEASE = h.RELEASE, finish = h.finish;
// 原生私信页增强（0.9.80；0.9.120 扩）：不加载 message.acfun.cn 也能覆盖"wire → 卡 DOM 装配"
// 与会话列表预览改写——造原生结构（.chat-content-item .message[data-text]、.chat-nav-item
// .content-last-message）+ douga/info 桩，驱动 enhance，断言 Shadow DOM 内的卡片结构
//（封面/计数/时长/标题）、附言、评论卡（引用块 + 来源条 + 锚点）、列表预览文案与选择器契约
// 清单全命中（TEST.call('nativeStructure')）。
// 覆盖边界：内核配对（占位替换/引用剥离）不在内（需页面 world 的 ImSdk，靠真机验收）
window.__ACSV_MOCK_FORM__ = {
  'douga/info': function () {
    return {
      result: 0, title: '原生卡标题',
      coverUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      durationMillis: 125000, viewCountShow: '2329', commentCountShow: '527',
      videoList: [{ id: 'mock-native-1' }]
    };
  }
};
document.body.insertAdjacentHTML('beforeend',
  '<div class="container-im"><div class="chat-content-item" data-id="0_9001">'
  + '<div class="message" data-id="51" data-seq-id="11"'
  + ' data-text="分享标题\nhttps://www.acfun.cn/v/ac488900 来看看">'
  + '<div class="content">分享标题\nhttps://www.acfun.cn/v/ac488900 来看看</div></div>'
  + '<div class="message" data-id="52" data-seq-id="12"'
  + ' data-text="@张三：小说真好看\nhttps://www.acfun.cn/v/ac488900#ncid=999">'
  + '<div class="content">@张三：小说真好看\nhttps://www.acfun.cn/v/ac488900#ncid=999</div></div>'
  + '<div class="message" data-id="53" data-seq-id="13"' // 0.9.122：动态分享（wire 降级链，harness 无内核 extra 不可达）
  + ' data-text="@李四：动态正文\nhttps://www.acfun.cn/moment/am5104999">'
  + '<div class="content">@李四：动态正文\nhttps://www.acfun.cn/moment/am5104999</div></div>'
  + '</div></div>'
  // 会话列表行（0.9.120）：enhanceList 预览改写分支的 fixture（分享/评论转发/动态三形态）
  + '<div class="chat-nav-item" data-user-id="9001">'
  + '<span class="content-last-message">分享标题\nhttps://www.acfun.cn/v/ac488900 来看看</span></div>'
  + '<div class="chat-nav-item" data-user-id="9002">'
  + '<span class="content-last-message">@张三：小说真好看\nhttps://www.acfun.cn/v/ac488900#ncid=999</span></div>'
  + '<div class="chat-nav-item" data-user-id="9003">'
  + '<span class="content-last-message">@李四：动态正文\nhttps://www.acfun.cn/moment/am5104999</span></div>');
function shadowRootOf(id) {
  var m = q('.message[data-id="' + id + '"]');
  var host = m && m.querySelector('.content').firstElementChild;
  return { m: m, root: host && host.shadowRoot };
}
TEST.call('nativeChatEnhance');
rec('native-share-card', !!(await waitFor(function () {
  var s = shadowRootOf('51');
  if (!s.m || s.m.getAttribute('data-acsv-share') !== '1' || !s.root) return false;
  var a = s.root.querySelector('a.item'), img = a && a.querySelector('img.cover');
  return !!a && a.getAttribute('href') === 'https://www.acfun.cn/v/ac488900'
    && !!img && img.naturalWidth > 0 // data: 封面已加载
    && /2329/.test(a.querySelector('.meta').textContent)
    && /527/.test(a.querySelector('.meta').textContent)
    && /2:05/.test(a.querySelector('.dur').textContent)
    && a.querySelector('.title').textContent === '原生卡标题'; // dougaCard enrich 覆盖
}, 8000)));
rec('native-share-note', (function () { // 视频分享：URL 后文本=附言留在 .content（卡外）
  var s = shadowRootOf('51');
  return !!s.m && s.m.querySelector('.content').textContent === '来看看';
})(), (function () {
  var s = shadowRootOf('51');
  return s.m ? JSON.stringify(s.m.querySelector('.content').textContent) : 'no-msg';
})());
rec('native-cshare-card', !!(await waitFor(function () {
  var s = shadowRootOf('52');
  if (!s.m || s.m.getAttribute('data-acsv-share') !== '1' || !s.root) return false;
  var a = s.root.querySelector('a.cshare');
  if (!a) return false;
  return /小说真好看/.test(a.querySelector('.quote').textContent)
    && a.querySelector('.srct').textContent === '原生卡标题'
    && /#ncid=999$/.test(a.getAttribute('href')); // 评论锚点随 URL 保留
}, 8000)));
rec('native-cshare-cover', !!(await waitFor(function () { // 封面 load 才放出（防空窗裂图占位）
  var s = shadowRootOf('52');
  var img = s.root && s.root.querySelector('img.srcimg');
  return !!img && img.naturalWidth > 0 && getComputedStyle(img).display !== 'none';
}, 8000)));
// ---- 0.9.120：会话列表预览改写（enhanceList 纯 DOM 分支，零内核）----
rec('native-list-share', (function () {
  var s = q('.chat-nav-item[data-user-id="9001"] .content-last-message');
  return !!s && s.textContent === '[分享] 分享标题';
})(), (function () {
  var s = q('.chat-nav-item[data-user-id="9001"] .content-last-message');
  return s ? JSON.stringify(s.textContent) : 'no-row';
})());
rec('native-list-cmt', (function () {
  var s = q('.chat-nav-item[data-user-id="9002"] .content-last-message');
  return !!s && s.textContent === '[评论] @张三：小说真好看';
})(), (function () {
  var s = q('.chat-nav-item[data-user-id="9002"] .content-last-message');
  return s ? JSON.stringify(s.textContent) : 'no-row';
})());
// ---- 0.9.120：官方 DOM 契约清单在 fixture 全命中（改选择器必须同步 fixture 与自检清单）----
rec('native-structure-contract', (function () {
  var inv = TEST.call('nativeStructure');
  return !!inv && inv.missing.length === 0;
})(), (function () {
  var inv = TEST.call('nativeStructure');
  return inv ? JSON.stringify(inv.missing) : 'no-hook';
})());
// ---- 0.9.122：动态分享（harness 无内核 → extra 不可达，验 wire 降级动态卡）----
rec('native-moment-card', !!(await waitFor(function () {
  var s = shadowRootOf('53');
  if (!s.m || s.m.getAttribute('data-acsv-share') !== '1' || !s.root) return false;
  var a = s.root.querySelector('a.cshare');
  return !!a && /动态正文/.test(a.querySelector('.quote').textContent)
    && a.querySelector('.srct').textContent === '查看动态'
    && /\/moment\/am5104999$/.test(a.getAttribute('href'));
}, 8000)));
rec('native-moment-note', (function () { // 无附言：.content 被清空（正文全由卡承载）
  var s = shadowRootOf('53');
  return !!s.m && s.m.querySelector('.content').textContent === '';
})(), (function () {
  var s = shadowRootOf('53');
  return s.m ? JSON.stringify(s.m.querySelector('.content').textContent) : 'no-msg';
})());
rec('native-list-moment', (function () { // 列表预览按 kind 分流，不误标 [评论]
  var s = q('.chat-nav-item[data-user-id="9003"] .content-last-message');
  return !!s && s.textContent === '[动态] @李四：动态正文';
})(), (function () {
  var s = q('.chat-nav-item[data-user-id="9003"] .content-last-message');
  return s ? JSON.stringify(s.textContent) : 'no-row';
})());
  };
})();
