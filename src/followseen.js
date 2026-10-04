// ---------- 关注已读水位（0.9.139 抽为叶子件） ----------
// 徽标域与两个关注语境入口（全部侧视图 / 视频侧流）共用的**同一份**「看到哪里了」：GM 持久
// `acsvFollowSeenAt`（无 GM 环境内存降级——harness/降级）。语义沿 0.9.107：水位=毫秒时间戳，
// 徽标数 `createTime > 水位` 的条数。**"看到"的写入口有两类**：
//   ① 进关注语境且首屏真的到了（followview 首屏成功 / followstream 首屏有货）→ markSeen()；
//   ② 语境内的轮询兜底（followbadge in-view 分支）——覆盖停留期间新到的内容。
// 抽件动机（0.9.139 实锤缺口）：0.9.107 只有 ② 写水位 ⇒ 访问短于剩余轮询闸门（≤60s）时，
// 进视图只抹了徽标、水位没动，离开后下一拍把同一批内容原样数回来（间歇性"固定未读数复亮"）。
// 依赖纪律：零 import 叶子——followbadge 已依赖 followstream（isFollowContext），水位若留在
// 徽标域，两个入口引入它即成环。

var SEEN_KEY = 'acsvFollowSeenAt';
var memSeen = 0; // 无 GM（harness/降级）时的内存水位——真实环境 GM 持持久值

export function seenAt() {
  try {
    if (typeof GM_getValue === 'function') {
      var v = Number(GM_getValue(SEEN_KEY, '0')) || 0;
      if (v) return v;
    }
  } catch (e) { }
  return memSeen;
}

export function setSeen(ts) {
  memSeen = ts;
  try { if (typeof GM_setValue === 'function') GM_setValue(SEEN_KEY, String(ts)); } catch (e) { }
}

// 首装无水位 → 以当前时刻起算（防把存量内容全算成新）
export function ensureSeen() {
  if (!seenAt()) setSeen(Date.now());
}

// 已读推进的语义出口（消费方只说"看过了"，时刻由本域取——避免两处各写一份 Date.now()）
export function markSeen() {
  setSeen(Date.now());
}
