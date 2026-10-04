import { el, toast, closeOnOutsideClick } from './ui.js';
import { VIDEO_ICONS } from './styles.js';

// ---------- 投蕉数量弹层（0.9.104 自 rail 抽出共享） ----------
// 视频页原生交互对齐：默认全灰，悬停第 N 根时 1~N 一起变亮，点第 N 根投 N，点外部关闭。
// 「已投过不可再展开」的守卫在**调用方点击入口**（语义各异：rail 看 item.thrown、关注行看
// pi.thrown），本件只管「选几根 → send(n) → 成功 applied(n)」——模块化归一：新消费面=新 opts。
// 消费面：竖刷右栏（rail，item 实体 + slide._banSync 回流）/ 关注行流的视频·文章行（0.9.104
// 用户口径「和视频机制一样」）。pop 是 toggle：同按钮再点=关；外点收起走
// ui.closeOnOutsideClick（0.9.147 收口：捕获相 + 常驻到拆除）。
export function toggleBananaPop(btn, opts) {
  var host = btn.parentNode;
  var existing = host && host.querySelector('.acsv-banpop');
  if (existing) { existing.remove(); return; } // 再点=收起（rail 同款 toggle 语义）
  if (!host) return;
  var pop = el('div', 'acsv-banpop');
  var opts5 = [];
  var sending = false; // 单击即撤弹层，正常不会重入；守住极端连发（原 rail withBusy 的等效）
  var build = function (n) {
    var ob = el('button');
    ob.title = '投 ' + n + ' 根香蕉';
    var img = el('img');
    img.alt = '';
    img.src = VIDEO_ICONS.banana; // 默认灰
    img.addEventListener('error', function () { ob.textContent = n; });
    ob.appendChild(img);
    ob._img = img;
    ob.addEventListener('mouseenter', function () {
      opts5.forEach(function (o, i) { o._img.src = i < n ? VIDEO_ICONS.bananaOn : VIDEO_ICONS.banana; });
    });
    ob.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (sending) return;
      sending = true;
      pop.remove();
      opts.send(n).then(function (ok) {
        if (ok) {
          if (opts.applied) opts.applied(n);
          toast('投出 ' + n + ' 根香蕉');
        } else {
          toast('投蕉失败（未登录或今日已投完？）');
        }
      }, function () {
        toast('投蕉失败（未登录或今日已投完？）');
      });
    });
    opts5.push(ob);
    pop.appendChild(ob);
  };
  for (var n = 1; n <= 5; n++) build(n);
  pop.addEventListener('mouseleave', function () {
    opts5.forEach(function (o) { o._img.src = VIDEO_ICONS.banana; });
  });
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; // 弹层锚定宿主
  host.appendChild(pop);
  // 外点收起（0.9.147 收口）：捕获相 + 常驻到拆除；面板内点击不算外点
  // （选数量本身会 pop.remove，旧实现"任意点击都关"已被合并）
  closeOnOutsideClick(pop, [btn], function () { pop.remove(); });
}
