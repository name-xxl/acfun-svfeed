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
// 原生私信页增强（0.9.80）：不加载 message.acfun.cn 也能覆盖"wire → 卡 DOM 装配"——
// 造原生结构（.chat-content-item .message[data-text]）+ douga/info 桩，驱动 enhanceChat，
// 断言 Shadow DOM 内的卡片结构（封面/计数/时长/标题）、附言、评论卡（引用块 + 来源条 + 锚点）。
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
  + '</div></div>');
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
  };
})();
