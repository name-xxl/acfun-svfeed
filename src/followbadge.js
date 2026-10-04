import { CFG } from './cfg.js';
import { selfUid } from './ui.js';
import { setDockBadge } from './sidebar.js';
import { isFollowContext } from './followstream.js';
import { listMoments } from './momentapi.js';
import { seenAt, setSeen, ensureSeen } from './followseen.js';
import { testHook } from './dbg.js';

// ---------- 关注未读徽标 + 轮询（0.9.97；0.9.107 改时间水位线；0.9.139 水位抽件） ----------
// **语义修正（0.9.107 实报「总出现固定数量未读」）**：旧实现取 webPush 的
// followUpers[].hasUnReadResource 布尔计数做徽标——实测（2026-10-04）：该布尔是「UP 有新
// 内容」的**服务端长期标记**（只有 {hasUnReadResource,headUrl,userId,name} 四字段、无时间戳；
// 重载原生 /member/feeds 前后各查一次，同一批 UP 纹丝不动、页面期间也无任何清未读请求）
// ⇒ 本地"进视图清零"后，下一轮轮询把同一批布尔原样数回来 = 固定数字反复出现。
// 现改为**时间水位线**：以持久水位 lastSeenAt（GM `acsvFollowSeenAt`，无 GM 环境内存降级）为界，
// 轮询 followFeedV2（混合流**含动态**——webPush 只有视频/文章，水位源不用它）首屏，
// `新条数 = feedList 中 createTime > lastSeenAt 的条数` → 徽标=新条数（显示封顶 99，单页
// 20 为计数上界）。**水位读写 0.9.139 起抽到 followseen.js**（叶子件，与本模块同域的
// followview/followstream 两个入口也写它）；本模块 poll 的 in-view 分支退化为**兜底**——
// 正式推进点是"进语境且首屏到了"（实锤缺口：只靠本分支时，访问短于剩余闸门 ≤60s 会在
// 离开后原样复亮，见 followseen 头注）。
// 轮询骨架不变：固定 tick + nextAt 闸门 + 代数丢弃陈旧回包；退避真逐次翻倍（纯函数单测钉）；
// document.hidden 短路；未登录静默；生命周期 player.mount/unmount。

var timer = null;
var nextAt = 0;   // 下次轮询闸门（固定 tick 里先查它，不自调度 setTimeout）
var interval = 0; // 当前退避间隔（0=首查，用基准）
var gen = 0;      // 代数：在途回包在 stop/重启后一律丢弃
var mounted = false;

// 退避纯函数（单测直采）：found=发现新内容回落基准；否则自基准起逐次翻倍封顶。
// prev 传 0 表示首查/重启（首查未发现的第一档=基准本身，然后才翻倍）。start/max 显式
// 注入（脏输入回 CFG 默认）。
export function nextBadgeInterval(prev, found, start, max) {
  var s = start > 0 ? start : CFG.follow.pollStart;
  var m = max > 0 ? max : CFG.follow.pollMax;
  if (found) return s;
  if (prev <= 0) return s;
  return Math.min(prev * 2, m);
}

function inFollowView() {
  // 关注语境判据单源（0.9.99 起走 followstream.isFollowContext）：只看 hash 会在「舞台
  // 放关注视频流」时误判——那时地址是视频深链形态，不在 #svfeed/follow 下
  return isFollowContext();
}

function applyBadge(n) {
  if (inFollowView()) return; // 用户正看着：不打扰（退出后下一拍按水位自然恢复）
  setDockBadge('follow', n);
}

function poll() {
  if (!selfUid()) return; // 未登录静默：feed 要登录态，不弹错不打扰
  ensureSeen();
  // 关注语境中：水位推进**兜底**（正式推进点是各入口首屏到达时的 markSeen，见 followseen）——
  // 本分支吸收"停留期间新到的内容"（用户正在看，不该在离开后补亮）；同时保持基准节奏
  //（不退避），免得长时间停留时水位落后窗口拉大
  if (inFollowView()) {
    setSeen(Date.now());
    setDockBadge('follow', 0);
    interval = CFG.follow.pollStart;
    nextAt = Date.now() + interval;
    return Promise.resolve();
  }
  var my = ++gen;
  return listMoments('0').then(function (j) { // 传输收口 momentapi；水位计数在徽标域（展示口径）
    if (my !== gen || !mounted) return; // 陈旧回包/已卸载：丢弃
    var seen = seenAt();
    var raws = (j && j.feedList) || [];
    var n = 0;
    raws.forEach(function (r) { if (r && Number(r.createTime) > seen) n++; });
    applyBadge(n);
    interval = nextBadgeInterval(interval, n > 0);
    nextAt = Date.now() + interval;
  }, function () {
    if (my !== gen) return;
    interval = nextBadgeInterval(interval, false); // 失败按空手退避：别锤接口
    nextAt = Date.now() + interval;
  });
}

function tick() {
  if (!mounted || document.hidden) return;
  if (Date.now() < nextAt) return;
  poll();
}

export function startFollowBadge() {
  if (mounted) return;
  mounted = true;
  interval = 0;
  nextAt = 0;
  gen++;
  timer = setInterval(tick, CFG.follow.tick);
}

export function stopFollowBadge() {
  mounted = false;
  gen++;
  if (timer) { clearInterval(timer); timer = null; }
  nextAt = 0;
  interval = 0;
  setDockBadge('follow', 0); // 卸载清徽标（dock 随后拆，防御式复位）
}

// debug 构建测试钩子：harness 直调 poll 驱动状态机（间隔/闸门为分钟级，场景不走真实定时器）；
// setSeen/seen 供水位断言与控制（无 GM 环境走内存降级）
testHook('followbadge', function () {
  return {
    mounted: mounted, interval: interval, nextAt: nextAt, poll: poll,
    seen: seenAt, setSeen: setSeen
  };
});
