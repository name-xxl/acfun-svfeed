// test/cases/dynemot.js —— harness 场景：官方主页动态表情映射（0.9.346，确认稿二修第六项；
// 真机判据 docs/api-research.md §22）
// 机制：BOOT_PATH '/u/51345'（kind=member）+ NO_AUTOMOUNT 无壳；表 tier-①（localStorage
// 'emoticonList'）与空间两标签关值在 harness.html **bundle 前**预置；官方结构 fixture 由
// 场景体自建（.ac-space-dynamic-list > article.ac-dynamic-card > .ac-dynamic-text，含码文本
// 节点 + 官方已渲染的 a.ubb-ac 元素——真机 innerHTML 同款形态）。
// 反跑口径（规矩 4）：
//   · boot 摘闸（无条件 mountDynEmot）→ dynemot-off 的「字面原样+零 img」双红；
//   · 模块摘首拍/MO（scanAll 调用删掉）→ dynemot 的 img 腿红；
//   · 模块若越权重排官方节点（如整 cell innerHTML 覆写）→ dynemot-node-same 同一性红
//     ——「官方元素不碰」不靠承诺靠引用比对。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  // 预置表内 id=1656（URL 过 imgurl.CDN_URL_OK 的 *.acfun.cn 锚定）；9999999 刻意不在表
  function cardHtml() {
    return '<article class="ac-dynamic-card"><div class="ac-dynamic-text">'
      + '早啊[emot=acfun,1656/]<a class="ubb-ac" href="https://www.acfun.cn/a/ac48877285">链接</a> 收工[emot=acfun,9999999/]'
      + '</div></article>';
  }

  function seedHost() {
    var box = document.createElement('div');
    box.className = 'ac-space-dynamic-list';
    box.innerHTML = cardHtml();
    document.body.appendChild(box);
    return box;
  }

  C['dynemot'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor;
    rec('dm-no-shell', !q('#acsv-root')); // 无壳前提（member 支不该挂竖刷）
    var box = seedHost();
    var cell = box.querySelector('.ac-dynamic-text');
    var ac = cell.querySelector('a.ubb-ac');
    // 1) 表内码→图：MO 补拍/预热 pass 到位后出现带内联样式的 img
    var img = await waitFor(function () { return cell.querySelector('img'); }, 5000);
    rec('dm-img-in', !!img);
    rec('dm-img-src', !!img && img.getAttribute('src').indexOf('e1656') >= 0, img ? img.getAttribute('src') : 'none');
    rec('dm-img-inline-style', !!img && img.getAttribute('style').indexOf('max-height:34px') >= 0
      && img.getAttribute('style').indexOf('max-width:68px') >= 0, img ? img.getAttribute('style') : 'none'); // 全家 34×68 统一档（0.9.347），数值钉死防平行标准
    rec('dm-img-title', !!img && img.getAttribute('title') === '[emot=acfun,1656/]'); // 悬停见原码
    // 2) 未知 id 字面保留（不销毁信息；表后续到位靠重扫补）
    rec('dm-unknown-kept', (cell.textContent || '').indexOf('[emot=acfun,9999999/]') >= 0);
    // 3) 表内码的文本字面已消失（只查文本，title 属性里的原码不算残留）
    rec('dm-mapped-gone', (cell.textContent || '').indexOf('1656') < 0, cell.textContent);
    // 4) **节点同一性**：官方 a.ubb-ac 引用未被重建（手术式替换的反证腿）
    rec('dm-node-same', !!(ac && cell.contains(ac)));
    // 5) 增量重扫：翻页/切 tab 追加的新卡同样被补（MO+300ms 防抖）
    box.insertAdjacentHTML('beforeend', '<article class="ac-dynamic-card"><div class="ac-dynamic-text">'
      + '三行[emot=acfun,1656/]打卡</div></article>');
    var img3 = await waitFor(function () {
      var cs = box.querySelectorAll('.ac-dynamic-text');
      var last = cs[cs.length - 1];
      return last && last.querySelector('img');
    }, 5000);
    rec('dm-rescan-append', !!img3);
  };

  C['dynemot-off'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait;
    rec('dm-off-no-shell', !q('#acsv-root'));
    var box = seedHost();
    var cell = box.querySelector('.ac-dynamic-text');
    var before = cell.textContent;
    // 闸关＝不注入不加载：不挂观察器、不预热表（bundle 前 acsv.s.injectPageDynEmot=false）
    await wait(1200); // > MO 防抖数倍：开闸形态这里必已被补拍
    rec('dm-off-no-img', box.querySelectorAll('img').length === 0);
    rec('dm-off-text-raw', cell.textContent === before
      && before.indexOf('[emot=acfun,1656/]') >= 0, cell.textContent);
  };
})();
