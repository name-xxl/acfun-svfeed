import { CFG } from './cfg.js';
import { el } from './ui.js';
import { requestText } from './net.js';
import { parseSearchItems } from './data.js';
import { registerView, gridCardOf } from './views.js';
import { setSearchHandler, focusSearch } from './topbar.js';

// ---------- 搜索视图（0.9.72 抖音式）：顶栏搜索框 / 地址栏直达 → 结果网格卡 ----------
// 数据源实测（docs/api-research.md「站内搜索」，2026-10-02）：GET www.acfun.cn/search?keyword=
// 是 **SSR 整页 HTML**（非 JSON），条目由 data.parseSearchItems 区段收窄解析（播放/时长/UP/
// 日期全有）；?pageNo= 实测无效（1/2 页同一结果集）→ 只做首屏，底部给「去 A 站搜索页看全部」
// 出口（不做假的加载更多）。
// 关键词唯一真源 = 地址栏（#svfeed/search/<kw>，route.js 已放行视图关键词段）。0.9.73 起视图内
// 不再自建输入框：共享顶栏的搜索框就是它（syncTopbar 按 arg 回填；本视图挂载期经
// setSearchHandler 接管提交——同词再回车 hash 不变，必须就地重跑；teardown 还原默认提交）
var seq = 0; // 换词竞态令牌（旧响应丢弃；跨重建单调递增）

function runSearch(kw, ui) {
  kw = String(kw || '').trim();
  if (!kw) {
    ui.grid.innerHTML = '';
    ui.foot.innerHTML = '';
    ui.setState('输入关键词，搜索 A 站视频');
    return;
  }
  var my = ++seq;
  ui.grid.innerHTML = '';
  ui.foot.innerHTML = '';
  ui.setState('搜索中…');
  var url = CFG.api.search + '?keyword=' + encodeURIComponent(kw);
  requestText(url).then(function (html) {
    if (my !== seq) return; // 已换词：旧响应丢弃
    var items = parseSearchItems(html);
    if (!items.length) {
      ui.setState('没有找到相关视频');
      return;
    }
    ui.setState('');
    items.forEach(function (it) {
      // 契约 → 网格卡（kind='search' 触发抖音式角标/脚行；点击 playAc 回竖刷连播）
      ui.grid.appendChild(gridCardOf({
        acId: it.acId, title: it.title, cover: it.cover, kind: 'search',
        dur: it.dur, views: it.views, upName: it.upName, dateText: it.dateText
      }));
    });
    var a = el('a', 'acsv-smfoot', '去 A 站搜索页看全部 ›');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    ui.foot.appendChild(a);
  }, function () {
    if (my !== seq) return;
    ui.setState('搜索失败（网络不可达），回车可重试');
  });
}

function buildSearchView(body, arg) {
  var state = el('div', 'acsv-sstate');
  var grid = el('div', 'acsv-sgrid');
  var foot = el('div', 'acsv-sfoot');
  body.appendChild(state);
  body.appendChild(grid);
  body.appendChild(foot);

  var ui = {
    grid: grid,
    foot: foot,
    setState: function (txt) {
      state.textContent = txt || '';
      state.style.display = txt ? '' : 'none';
    }
  };

  // 顶栏输入框提交（setSearchHandler 接管期）
  function submit(kw) {
    var target = CFG.hash + '/search' + (kw ? '/' + encodeURIComponent(kw) : '');
    // 关键词唯一真源 = 地址栏（可分享/刷新回放）：换词走 hashchange → 视图按 arg 重建；
    // 同词再搜 hash 不变（不触发 hashchange），就地重跑一次
    if (location.hash === '#' + target) { runSearch(kw, ui); return; }
    location.hash = target;
  }

  setSearchHandler(submit);
  var kw0 = String(arg || '').trim();
  runSearch(kw0, ui); // 有词即自动搜（顶栏提交/深链直达）；空词出引导态
  if (!kw0) focusSearch();
}

// 退出/重建时还原默认提交（player.navSearch）——不还原则离开搜索视图后顶栏 Enter 仍打在本
// 视图的旧闭包上（写 hash 前先撞同词判定，表现为"点了没反应"）
function teardownSearchView() {
  setSearchHandler(null);
}

registerView({ id: 'search', build: buildSearchView, teardown: teardownSearchView });
