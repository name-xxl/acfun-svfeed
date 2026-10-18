// 弹幕设置面板（0.9.267 自 controls.js 拆件；面板本体 0.9.202 起）
// 入口仍是控制栏齿轮（controls.buildControls 内 `var dmPanel = buildDmPanel(slide)`）；
// 本件只产面板 DOM/交互，不碰播放器/控制栏状态；消费方 controls.js。
import { el } from './ui.js';
import { getSetting, setSetting } from './settings.js';

// ---------- 弹幕设置面板（0.9.202，用户裁决：入口在底栏、展开面板——照 A 站原生两 tab） ----------
// 入口＝底栏「弹幕设置」键（原生 bfq_dmsz 齿轮气泡图标）；面板挂 **slide**（不像控制栏那样随闲置隐藏）。
// 两个 tab 照原生：**弹幕设置**（防挡字幕/合并重复 开关 + 显示区域/不透明度/字体大小/弹幕速度 滑杆 +
// 恢复默认设置）与 **屏蔽设置**（按类型屏蔽 + 关键词过滤）。
// 任一改动即时生效：写设置（防抖落盘）+ 让当前层 refresh()（dmcanvas 用最近入参重排，不等换条）。
export function buildDmPanel(slide) {
  var box = el('div', 'acsv-dmpanel');
  function apply() {
    if (slide && slide._dmLayer && slide._dmLayer.refresh) slide._dmLayer.refresh();
  }
  function swRow(label, key) {
    var r = el('div', 'acsv-dmprow');
    r.appendChild(el('label', null, label));
    var sw = el('span', 'acsv-dmpsw');
    var sync = function () { sw.classList.toggle('on', !!getSetting(key)); };
    sync();
    sw.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setSetting(key, !getSetting(key));
      sync(); apply();
    });
    r.appendChild(sw);
    return r;
  }
  function sliderRow(label, key, min, max, suffix, decode, encode) {
    var r = el('div', 'acsv-dmprow');
    r.appendChild(el('span', 'acsv-dmplb', label));
    var track = el('span', 'acsv-dmptrack');
    var fill = el('i'), hd = el('b');
    track.appendChild(fill); track.appendChild(hd);
    var val = el('span', 'acsv-dmpv');
    function dec() { var n = decode(getSetting(key)); return isNaN(n) ? min : n; }
    function paint(v) {
      var pct = (v - min) / (max - min) * 100;
      fill.style.width = pct + '%';
      hd.style.left = pct + '%';
      val.textContent = Math.round(v) + (suffix || '');
    }
    paint(dec());
    function ratioAt(ev) {
      var rect = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
    }
    function setTo(ev) {
      var v = Math.round(min + ratioAt(ev) * (max - min));
      setSetting(key, encode(v));
      paint(v); apply();
    }
    var dragging = false;
    track.addEventListener('pointerdown', function (ev) {
      dragging = true;
      try { track.setPointerCapture(ev.pointerId); } catch (e) { /* best-effort: cleanup */ }
      setTo(ev);
      ev.stopPropagation(); ev.preventDefault();
    });
    track.addEventListener('pointermove', function (ev) { if (dragging) setTo(ev); });
    track.addEventListener('pointerup', function () { dragging = false; });
    track.addEventListener('pointercancel', function () { dragging = false; });
    r.appendChild(track); r.appendChild(val);
    return r;
  }
  // 内容整体重建（原地重绘：替换节点会让外侧闭包指向游离面板，齿轮从此失效）
  function fill() {
    while (box.firstChild) box.removeChild(box.firstChild);
  var tabs = el('div', 'acsv-dmptabs');
  var tSet = el('span', 'on', '弹幕设置');
  var tBlk = el('span', null, '屏蔽设置');
  tabs.appendChild(tSet); tabs.appendChild(tBlk);
  box.appendChild(tabs);

  // tab1：弹幕设置
  var bodySet = el('div', 'acsv-dmpbody');
  bodySet.appendChild(swRow('防挡字幕', 'dmSubtitle'));
  bodySet.appendChild(swRow('合并重复弹幕', 'dmMerge'));
  bodySet.appendChild(sliderRow('显示区域', 'dmArea', 30, 100, '%',
    function (v) { return Number(v); }, function (v) { return String(v); }));
  bodySet.appendChild(sliderRow('不透明度', 'dmAlpha', 20, 100, '%',
    function (v) { return Number(v); }, function (v) { return String(v); }));
  bodySet.appendChild(sliderRow('字体大小', 'dmSize', 85, 140, '%',
    function (v) { return Math.round((Number(v) || 1) * 100); }, function (v) { return (v / 100).toFixed(2); }));
  bodySet.appendChild(sliderRow('弹幕速度', 'dmSpeed', 60, 160, '%',
    function (v) { return Math.round((Number(v) || 1) * 100); }, function (v) { return (v / 100).toFixed(2); }));
  var reset = el('button', 'acsv-dmpreset', '恢复默认设置');
  reset.addEventListener('click', function (ev) {
    ev.stopPropagation();
    ['dmSubtitle', 'dmMerge', 'dmArea', 'dmAlpha', 'dmSize', 'dmSpeed'].forEach(function (k) {
      setSetting(k, DM_DEFAULT[k]);
    });
    setSetting('dmBlock', '');
    setSetting('dmFilter', '');
    refreshDmPanel(box); // 面板自身重绘（滑杆/开关回到默认）
    apply();
  });
  bodySet.appendChild(reset);
  box.appendChild(bodySet);

  // tab2：屏蔽设置
  var bodyBlk = el('div', 'acsv-dmpbody');
  bodyBlk.style.display = 'none';
  bodyBlk.appendChild(el('div', 'acsv-dmpblk', '按类型屏蔽'));
  var tags = el('div', 'acsv-dmptags');
  function blockHas(k) { return new RegExp('\\b' + k + '\\b').test(String(getSetting('dmBlock') || '')); }
  function toggleBlock(k) {
    var parts = String(getSetting('dmBlock') || '').split(/\s+/).filter(Boolean);
    var i = parts.indexOf(k);
    if (i >= 0) parts.splice(i, 1); else parts.push(k);
    setSetting('dmBlock', parts.join(' '));
    apply();
  }
  // 六类与原生一致（§10.12）；判据字段：mode / color / roleId / adv（0.9.204 补齐后两类）
  [['top', '顶部弹幕'], ['bottom', '底部弹幕'], ['scroll', '滚动弹幕'], ['color', '彩色弹幕'],
    ['role', '角色弹幕'], ['advanced', '高级弹幕']].forEach(function (p) {
    var t = el('span', 'acsv-dmptag', p[1]);
    t.classList.toggle('on', blockHas(p[0]));
    t.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleBlock(p[0]);
      t.classList.toggle('on', blockHas(p[0]));
    });
    tags.appendChild(t);
  });
  bodyBlk.appendChild(tags);
  bodyBlk.appendChild(el('div', 'acsv-dmpblk', '过滤弹幕（关键词，逗号分隔）'));
  var fi = el('input', 'acsv-dmpfilter');
  fi.type = 'text';
  fi.placeholder = '如：剧透, 前排';
  fi.value = String(getSetting('dmFilter') || '');
  fi.addEventListener('click', function (ev) { ev.stopPropagation(); });
  fi.addEventListener('input', function () { setSetting('dmFilter', fi.value); apply(); });
  bodyBlk.appendChild(fi);
  box.appendChild(bodyBlk);

  // tab 切换
  function showTab(which) {
    var isSet = which === 'set';
    tSet.classList.toggle('on', isSet);
    tBlk.classList.toggle('on', !isSet);
    bodySet.style.display = isSet ? '' : 'none';
    bodyBlk.style.display = isSet ? 'none' : '';
  }
  tSet.addEventListener('click', function (ev) { ev.stopPropagation(); showTab('set'); });
  tBlk.addEventListener('click', function (ev) { ev.stopPropagation(); showTab('block'); });
  }
  box.__fill = fill;
  fill();
  return box;
}

// 面板内控件按当前设置重绘（恢复默认后调）——原地重绘，保住外层对 box 的引用
var DM_DEFAULT = { dmSubtitle: false, dmMerge: true, dmArea: '72', dmAlpha: '100', dmSize: '1', dmSpeed: '1' };
function refreshDmPanel(box) {
  if (box && box.__fill) box.__fill();
}
