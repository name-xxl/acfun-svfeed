// ---------- 签到黄历弹窗（0.9.277） ----------
// 形态真源 = docs/preview/signin-almanac.html（用户确认稿，按 App 截图逐像素还原）：
// 3:4 竖卡（290×398）、红框 + 四角回纹角饰、「十月/18/OCT」错位日期、AC·运势红幅、
// 竖排宜忌条幅（右→左读、超长照 App 裁切）、特粗宋体运势、「今日奖励：香蕉xN」+「签到规则 ›」。
// 点「签到规则」同卡翻面（App SignAlmanacDialogFragment 同款）：‹返回 + 标题 + 5 条规则原文。
// 关闭：点蒙层 / 「取消」/ Esc。App 二进制素材（吉祥物立绘）不入仓；无分享面板。
// 0.9.298：**入浮层栈**（overlayOpen modal）——此前自带 document keydown，与 0.9.254
// natpanel 同类病灶（叠层时 Esc 连关两层、视图 teardown 后单例 host 残留）。Esc 单点裁决
// 与整栈卸载交 overlay；本件只保留 DOM 构建与 close 清理。
import { el } from './ui.js';
import { overlayOpen, overlayClose } from './overlay.js';

var RULES = [
  '签到即可获得香蕉奖励；连续签到可获得随机香蕉礼包',
  '连续签到7天最高奖励666蕉',
  '如签到中断或连续签满7天，下次连签天数从第1天开始计算',
  '签到可随机显示AC运势，分享还有概率升级签运，祝好运',
  '签到显示AC运势可在设置中关闭'
];
var MONTH_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
var MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

var host = null;   // 单实例：同一时刻只开一个弹窗
var LAYER_ID = 'signalmanac';

function rulePage() {
  var page = el('div', 'acsv-salm-rules');
  var bk = el('span', 'acsv-salm-bk', '返回');
  bk.addEventListener('click', function () { host.querySelector('.acsv-salm').classList.remove('flip'); });
  var t = el('div', 'acsv-salm-rt', '签到规则');
  var ul = el('ul', 'acsv-salm-ul');
  RULES.forEach(function (s) { ul.appendChild(el('li', '', s)); });
  // 0.9.313 如实声明：上 5 条是 APP 侧规则原文（含「连签 7 天 666 蕉」），而脚本走网页端签到
  // （mobile-direct/pc-direct，§10.17），档位低于 APP——官方网页签到弹窗自认「APP 签到可得更多
  // 香蕉」，照此口径声明，避免把 APP 数额误示为网页端可得。视觉降级（li.note 小字灰无红点）。
  ul.appendChild(el('li', 'note', '※ 以上数额为 APP 侧规则；脚本经网页端签到，所得香蕉通常少于 APP，以签到回执为准'));
  page.appendChild(bk);
  page.appendChild(t);
  page.appendChild(ul);
  return page;
}

function almanacFace(alm, banana) {
  var face = el('div', 'acsv-salm-face');
  var d = new Date();

  var date = el('div', 'acsv-salm-date');
  date.appendChild(el('span', 'zh', MONTH_ZH[d.getMonth()] + '月'));
  date.appendChild(el('span', 'num', String(d.getDate())));
  date.appendChild(el('span', 'en', MONTH_EN[d.getMonth()]));
  face.appendChild(date);

  var ban = el('div', 'acsv-salm-ban', 'AC·运势');
  ['s1', 's2', 's3', 's4', 's5'].forEach(function (c) {
    ban.appendChild(el('i', 'st ' + c, '✦'));
  });
  face.appendChild(ban);

  var cols = el('div', 'acsv-salm-cols');
  function strip(cls, sealText, items) {
    var s = el('div', 'acsv-salm-strip ' + cls);
    s.appendChild(el('div', 'acsv-salm-seal', sealText));
    var its = el('div', 'acsv-salm-its');
    // App 竖排从右往左读：DOM 顺序 1..3 + row-reverse ⇒ 首项排最右
    items.forEach(function (t) { its.appendChild(el('span', '', t)); });
    s.appendChild(its);
    return s;
  }
  cols.appendChild(strip('yi', '宜', alm.suits));
  var f = el('div', 'acsv-salm-fortune');
  f.appendChild(el('span', 'fnum', alm.fortune.length > 1 ? alm.fortune.charAt(0) + '\n' + alm.fortune.slice(1) : alm.fortune));
  f.querySelector('.fnum').style.whiteSpace = 'pre-line';
  cols.appendChild(f);
  cols.appendChild(strip('ji', '忌', alm.avoids));
  face.appendChild(cols);

  var meta = el('div', 'acsv-salm-meta');
  if (banana != null && banana !== 0) meta.appendChild(el('span', 'reward', '今日奖励：香蕉x' + banana));
  else meta.appendChild(el('span', 'reward'));
  var rule = el('span', 'acsv-salm-rule', '签到规则');
  rule.addEventListener('click', function () { face.parentNode.classList.add('flip'); });
  meta.appendChild(rule);
  face.appendChild(meta);
  return face;
}

// 打开黄历卡。alm=signapi.almanacOf 产物；opts.banana=今日实拿香蕉（未知传 null）
export function openSignAlmanac(alm, opts) {
  if (!alm || host) return false;
  opts = opts || {};
  host = el('div', 'acsv-salm-host');
  var card = el('div', 'acsv-salm');
  ['tl', 'tr', 'bl', 'br'].forEach(function (c) { card.appendChild(el('i', 'acsv-salm-corner ' + c)); });
  card.appendChild(almanacFace(alm, opts.banana == null ? null : Number(opts.banana)));
  card.appendChild(rulePage());
  var cancel = el('button', 'acsv-salm-close', '取消');
  cancel.type = 'button';
  cancel.addEventListener('click', closeSignAlmanac);
  host.appendChild(card);
  host.appendChild(cancel);
  host.addEventListener('click', function (e) {
    if (e.target === host) closeSignAlmanac(); // 蒙层空白处关闭（卡内点击不冒泡到关闭）
  });
  (document.getElementById('acsv-root') || document.body).appendChild(host);
  overlayOpen({ id: LAYER_ID, modal: true, close: close });
  return true;
}

export function closeSignAlmanac() {
  overlayClose(LAYER_ID); // Esc 路径已出栈时空转；显式关闭路径由此同步栈
}

function close() {
  if (host) {
    if (host.parentNode) host.parentNode.removeChild(host);
    host = null;
  }
}
