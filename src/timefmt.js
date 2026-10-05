// ---------- 时间/计数文案（0.9.160 自 data.js 叶子出库；原 0.9.69/0.9.85 落户） ----------
// 零依赖纯函数：now 可注入 → 日历判定离线单测。被 data.js 各解析器、appapi（fmtDate）
// 共同消费。与 ui.js 的 fmt（计数千分位）分工：这里只管「时间文案与万格式」。

// 榜单 extra 的相对时间（0.9.69 对齐原生「发布于xx」四档，日历判定）：
// 今天 <1h「N分钟前」/ 今天「N小时前」/ 昨天「昨天H时MM分」/ 前天「前天H时MM分」/
// 更早「M月D日 H时MM分」（MM 补零、H 不补零——原生实测 0时10分 / 8时00分）。
// now 可注入：日历判定纯函数化，单测钉跨日/跨月/跨年边界（不注入则用当前时间）；
// 脏输入/未来时间降级空串。dayDiff 用本地零点差值 round（DST 23/25 小时日不误判）
export function relTime(ms, now) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var n = Number(now) || Date.now();
  var diff = n - t;
  if (diff < 0 || isNaN(diff)) return '';
  var dt = new Date(t), nd = new Date(n);
  var hm = dt.getHours() + '时' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes() + '分';
  var dayDiff = Math.round(
    (new Date(nd.getFullYear(), nd.getMonth(), nd.getDate())
      - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  if (dayDiff <= 0) {
    var min = Math.floor(diff / 60000);
    if (min < 60) return Math.max(1, min) + '分钟前';
    return Math.floor(diff / 3600000) + '小时前';
  }
  if (dayDiff === 1) return '昨天' + hm;
  if (dayDiff === 2) return '前天' + hm;
  return (dt.getMonth() + 1) + '月' + dt.getDate() + '日 ' + hm;
}

// 本地时区 YYYY-MM-DD（0.9.85）。**不要用 toISOString().slice(0,10)**：那是 UTC，
// 本地凌晨/晚上会整体差一天（既有 resolve 兜底分支就踩过）
export function fmtDate(ms) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var d = new Date(t);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// 卡片上的"时间"文案（0.9.85）：今天/昨天/前天走 relTime 的相对文案（今天8小时前 / 昨天20时36分 /
// 前天14时02分——不带年份也不会有歧义），更早则退回**带年份**的绝对日期。
// 为什么不直接用 relTime：它的"更早"档是「M月D日 H时MM分」（0.9.69 对齐直播/榜单原生卡片的
// 既定口径，榜单卡继续用它），但收藏/历史卡上一条三年前的投稿只写"9月26日 21时39分"根本
// 判断不出年份，必须点进去才看得到（用户实报）。dayDiff 用本地零点差值 round（同 relTime，
// DST 23/25 小时日不误判）；脏输入/未来时间降级空串
export function fmtAgo(ms, now) {
  var t = Number(ms) || 0;
  if (!t) return '';
  var n = Number(now) || Date.now();
  var diff = n - t;
  if (diff < 0 || isNaN(diff)) return '';
  var dt = new Date(t), nd = new Date(n);
  var dayDiff = Math.round(
    (new Date(nd.getFullYear(), nd.getMonth(), nd.getDate())
      - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  return dayDiff <= 2 ? relTime(t, n) : fmtDate(t);
}

// UP 数据位计数文案（0.9.69 对齐原生 up-card）：<10000 原样；≥10000 一位小数「N.N万」
// （原生实测 33235→3.3万 / 469000→46.9万 / 6062 原样）；脏输入按 0
export function fmtWan(n) {
  var v = Number(n) || 0;
  if (v < 10000) return String(v);
  return (Math.round(v / 1000) / 10) + '万';
}
