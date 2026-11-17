// ---------- 官方主页动态表情映射（0.9.346；真机取证 docs/api-research.md §22） ----------
// 背景：官方个人主页顶层「动态」区（li[data-index=dynamic] → .ac-space-dynamic-list）渲染器
// 吞了其余 UBB 包裹、唯独把 [emot=组,/] 表情码字面漏出（实测样本 8/9 命中，且是该区
// 唯一未映射方言）。本件补上官方缺的能力：**文本节点手术式替换**——只切含码的文本节点、
// 把码换成表情 <img>，**官方已有元素一律不碰**（ubb-icon、ubb-ac 链接、配图区、动作栏
// 全部原样）；查无此 id/表未就绪时字面保留（不销毁信息，表到位后重扫补上——与
// refillEmoticons 的「占位→真图」同一哲学，只是宿主是官方 DOM）。
// 纪律：
// · 选择器面照 nativeip 先例（0.9.248「站点改版只改这里」）：官方改版只动 SEL/CODE_RE，
//   不动逻辑；闸/生命周期归 boot（injectOn('injectPageDynEmot')，三保险规范）。
// · **零样式依赖**：/u 页脚本 CSS 未必在场（plaza/IP 关时 member 支不灌表）——出图自带
//   内联尺寸/垂直对齐属性，class 一个不挂（确认稿接线表钉死）。
// · innerHTML 只接 emotImgOf 的白名单出图（URL 过 CDN_URL_OK/EMOT_URL_OK 双校验，
//   emoticon.js:21-37）；用户文本段永远走 createTextNode，无 HTML 注入面——「表情/UBB
//   innerHTML 产物不并 imgload」的 imgload.js:12 例外清单同款口径。
// · 常驻重扫走 MO+防抖（动态 tab 惰性渲染、翻页 SPA 追加）；自然幂等：码变 img 后
//   不再是文本节点，重扫零空转，无需逐节点哨兵。observer 页面生命周期常驻（关＝不挂载即
//   不创建）——同 nativeip/imnative 先例登记 lifecycle 基线。
import { ensureEmotionMap, emotImgOf } from './emoticon.js';
import { stat, swallow } from './dbg.js';

var SEL_HOST = '.ac-space-dynamic-list';       // 官方动态列表容器（§22 实测）
var SEL_TEXT = '.ac-dynamic-text';             // 正文挂点（纯图卡无此节点，自然跳过）
var CODE_RE = /\[emot=(\w+),(\d+)\/\]/g;       // 唯一未映射方言（§22：括号老式 0 命中，不接）
var SCAN_DEBOUNCE_MS = 300;                    // 与 nativeip OBS.domDebounceMs 同档
// 出图尺寸=全家统一 34×68 档（cssraw.js:624 评论正文 .ubb-emotion 同串，834 注释「尺寸对齐
// 34px 档」先例=各面同码同尺寸的既立原则；0.9.347 用户点验「和以往统一了吗」纠正首版自造
// 1.15em 平行标准）。垂直/边距取 cssseg EMO_TAIL 值文（inline 形态无块尾}）。官方页吃不到
// cssraw 类规则，故同一数值以 style 属性随图落——字面第三处由 dynemot 场景腿钉住（改档必同批）。
var IMG_STYLE = 'max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px';

// 纯函数：文本 → 段表（text/emot 交替）；codes>0 才值得动 DOM。单测直采。
export function splitCodes(str) {
  var segs = [];
  var last = 0;
  var hits = 0;
  var m;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(str))) {
    if (m.index > last) segs.push({ t: 'text', v: str.slice(last, m.index) });
    segs.push({ t: 'emot', pkg: m[1], id: m[2], raw: m[0] });
    hits++;
    last = m.index + m[0].length;
  }
  if (last < str.length) segs.push({ t: 'text', v: str.slice(last) });
  return { segs: segs, codes: hits };
}

// 单文本节点手术：全部码都解析不了（表未就绪/查无 id）⇒ 返回 false 不动 DOM，
// 留待下一次重扫/补表 pass；任一命中即整节点换片段。
function replaceIn(node) {
  var split = splitCodes(node.nodeValue || '');
  if (!split.codes) return false;
  var frag = document.createDocumentFragment();
  var touched = false;
  for (var i = 0; i < split.segs.length; i++) {
    var s = split.segs[i];
    if (s.t === 'text') { frag.appendChild(document.createTextNode(s.v)); continue; }
    var hit = emotImgOf(s.pkg, s.id); // acfun 查表（未就绪 null）；非 acfun 走 umeditor 静态路径
    if (!hit) { frag.appendChild(document.createTextNode(s.raw)); continue; }
    var box = document.createElement('span');
    box.innerHTML = hit.html;
    var img = box.firstChild;
    if (!img) { frag.appendChild(document.createTextNode(s.raw)); continue; }
    img.setAttribute('style', IMG_STYLE);
    img.setAttribute('title', s.raw); // 悬停见原码（信息不销毁，也方便用户报「表情错位」定位）
    img.setAttribute('alt', '[表情]'); // 图挂掉的降级读法（官方 SDK 同口径兜底文本）
    frag.appendChild(img);
    touched = true;
  }
  if (!touched) return false;
  node.parentNode.replaceChild(frag, node);
  return true;
}

function scanAll() {
  var hosts = document.querySelectorAll(SEL_HOST);
  if (!hosts.length) return;
  var done = 0;
  Array.prototype.forEach.call(hosts, function (host) {
    Array.prototype.forEach.call(host.querySelectorAll(SEL_TEXT), function (cell) {
      // 先收集再替换：TreeWalker 活体遍历会被 replaceChild 打断
      var walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, function (tn) {
        return tn.nodeValue.indexOf('[emot=') >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      });
      var pending = [];
      while (walker.nextNode()) pending.push(walker.currentNode);
      for (var j = 0; j < pending.length; j++) {
        if (pending[j].parentNode && replaceIn(pending[j])) done++;
      }
    });
  });
  if (done) stat('dynemot.nodes.' + done); // 可观测：本批换图节点数（防「跑了没效果」哑链）
}

var mounted = false;
var timer = null;
var observer = null;

export function mountDynEmot() {
  if (mounted) return; // 幂等（boot 一次，防御重入）
  mounted = true;
  // 表预热三级（官方同源 localStorage emoticonList → GM 缓存 → 接口）：就绪后补一遍
  // acfun 主包码；**失败不打紧**——官方字面维持原样（不比现状坏），非 acfun 码走静态路径
  // 不等表（emotImgOf 分支），重扫兜后续到位。
  ensureEmotionMap().then(function () { scanAll(); }, function (e) { swallow(e, 'dynemot'); });
  scanAll(); // 首拍
  observer = new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; scanAll(); }, SCAN_DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
