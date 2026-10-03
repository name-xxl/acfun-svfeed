import { CFG } from './cfg.js';
import { request } from './net.js';
import { selfUid } from './ui.js';
import { setDockBadge } from './sidebar.js';
import { testHook } from './dbg.js';

// ---------- 关注未读徽标 + 轮询（0.9.97，路线图 4.3） ----------
// 数据源：webPush 的 followUpers[].hasUnReadResource（布尔有假值，§2.1.1 实测；count=10 取
// 首屏关注列表足够——徽标语义是「有新内容的关注数」，不追求全量）。
// 轮询 = 广场 background.js 骨架的**吸收重写**（固定 tick + nextAt 闸门 + 重入门禁 + 代数
// 丢弃陈旧回包），退避按 roadmap 措辞做**真逐次翻倍**（广场实为 idle 分档阶梯，不照抄）：
// 60s 起步 ×2 封顶 10min，发现新内容即刻回落基准——序列钉单测（nextBadgeInterval 纯函数）。
// 生命周期：player.mount/unmount（dock 常驻先例——不挂视图 enter/exit，离开关注页徽标不死）；
// document.hidden 短路省请求（与 imdrawer 门禁哲学同构）；未登录静默（selfUid 判据）。
// 进关注视图不打扰：poll 应用徽标时读路由（无状态判断），用户正看着就不点亮，退出后自然恢复。

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
  return /#svfeed\/follow/.test(String(location.hash || ''));
}

function applyBadge(n) {
  if (inFollowView()) return; // 用户正看着：不打扰（退出关注视图后下一拍自然恢复）
  setDockBadge('follow', n);
}

function poll() {
  if (!selfUid()) return; // 未登录静默：followUpers 要登录态，不弹错不打扰
  var my = ++gen;
  request(CFG.api.webPush + '?count=10&pcursor=0', 'GET').then(function (j) {
    if (my !== gen || !mounted) return; // 陈旧回包/已卸载：丢弃
    var ups = (j && j.followUpers) || [];
    var n = 0;
    ups.forEach(function (u) { if (u && u.hasUnReadResource) n++; });
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

// debug 构建测试钩子：harness 直调 poll 驱动状态机（间隔/闸门为分钟级，场景不走真实定时器）
testHook('followbadge', function () {
  return { mounted: mounted, interval: interval, nextAt: nextAt, poll: poll };
});