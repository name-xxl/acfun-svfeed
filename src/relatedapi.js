import { CFG } from './cfg.js';
import { request } from './net.js';
import { homeItemOf, upOf } from './playitem.js';
import { coverUrl } from './imgurl.js';
import { getSetting } from './settings.js';
import { stat, testHook } from './dbg.js';

// ---------- 相关推荐域（0.9.167）：传输 + 回包规整 + 随机游走泵 ----------
// 端点 feed/related/general（2026-10-05 内置浏览器 + curl 免登录双验，docs/api-research.md §5）：
// 表单 resourceType=2&resourceId={稿件id}；**无游标一发 10 条，重复调用换一批**（推荐流刷新
// 语义）；回包**不含当前视频自身**（锚位无需去重）；首条**非固定 UP 本人**视频；推荐分区亲和。
// 本模块是「related」内容源的域件：规整随域走（AGENTS.md 单源收口），泵是本域的取流行为——
// 不 import feedstore/player（环检测零豁免）：tip 由 fetchMore 调用方传入，防回头路靠自持 seen。
//
// 续播两态（设置 relSequential，见 settings.js SCHEMA）：
//   walk（默认）随机游走——本批只出 1 条（fetchMore 的节奏=每次滚动补 1 条），下一条再以它
//   为 tip 拉新池，严格逐级「A 的相关随机一条 → 它的相关随机一条」；
//   seq 按列表顺序——整批按展示顺序出（队列式），尽头由下一次 batch 换批续上。
// 换批/兜底：整批全见过（小众视频池小/长会话走远）→ 再拉换批上限 3 次；仍空则放宽允许
// 重播——「永远有下一条」优先于绝对不重复（断流比偶尔重播更伤）。

var FORM_TYPE = { 'Content-Type': 'application/x-www-form-urlencoded' };

// 回包 → dougaFeedView 原始卡列表（包裹层 {dougaFeedView, expTag, type} 拆包；缺 id 的扔）。
// 抽屉行渲染与泵条目映射共用这一层（原始卡字段更全：durationMillis/user.name/tagList…）
export function relatedPageOf(j) {
  if (!j || j.result !== 0) throw new Error('related-' + ((j && j.result) || 'null'));
  var out = [];
  var feeds = (j && j.feeds) || [];
  for (var i = 0; i < feeds.length; i++) {
    var dv = feeds[i] && feeds[i].dougaFeedView;
    if (dv && idOf(dv) != null) out.push(dv);
  }
  return out;
}

function idOf(dv) {
  return dv.dougaId != null ? dv.dougaId : (dv.contentId != null ? dv.contentId : null);
}

export function listRelated(rid) {
  return request(CFG.api.relatedGeneral, 'POST', FORM_TYPE,
    'resourceType=2&resourceId=' + encodeURIComponent(rid)).then(relatedPageOf);
}

// dougaFeedView → **面板条目**（openPanelItem/层内会话列表用的契约形状；0.9.173 抽——抽屉行
// 点击与「换成那份相关列表」的列表条目都从这里出；作者四件套与 relatedItemOf 同源字段）
export function panelItemOfDv(dv) {
  var u = dv.user || {};
  return {
    acId: Number(idOf(dv)) || 0,
    title: dv.title || dv.caption || '',
    cover: coverUrl(dv.coverUrl || ''),
    up: upOf(u.id, u.name, coverUrl(u.headUrl), u.isFollowing)
  };
}

// dougaFeedView → 播放契约条目。kind/stype/cap 全走 home 模板（homeItemOf）：相关推荐条目
// 与 selection/feed 同族——resolve 链（douga/info+playInfo）、prewarm、slim、评论/互动键、
// 深链回写全部零改动即工作；「新内容源」的差量只在取流（泵）与卡片富化（这里回填）。
// 导出：reldrawer 行点击要先把行卡转成契约条目再交起步器
export function relatedItemOf(dv) {
  var item = homeItemOf(Number(idOf(dv)) || 0, dv.title || dv.caption || '', dv.coverUrl || '');
  var u = dv.user || {};
  // user 主键是 id（douga/info 同款，§5 实测）；无名无 id 时 upOf 返回 null（不编造作者）
  item.up = upOf(u.id, u.name, coverUrl(u.headUrl), u.isFollowing);
  item.like = dv.likeCount || 0;
  item.banana = dv.bananaCount || 0;
  item.comment = dv.commentCount || 0;
  item.view = dv.viewCount || 0;
  item.fav = dv.stowCount || 0;
  item.share = dv.shareCount || 0;
  item.danmakuCount = dv.danmakuCount || 0;
  if (dv.shareUrl) item.shareUrl = dv.shareUrl;
  return item;
}

// ---------- 泵（纯逻辑抽纯：pickFresh 离线单测；网络触点只在 batch 里） ----------

var _seen = {}; // 会话内已出过池的稿件 id（含 seed 起点）——防回头路
var MAX_REFETCH = 3;

export function seed(id) {
  _seen = {};
  if (id != null && id !== '') _seen[String(id)] = 1;
  stat('rel.seed');
}

export function resetPump() { _seen = {}; }

// 纯函数：从原始卡列表里挑本批要出池的卡。walk 抽 1 条（rand 注入=单测确定性）；seq 按展示
// 顺序全出。seen 命中的先滤掉——调用方（batch）保证「全滤空则换批重拉」
export function pickFresh(dvs, seen, mode, rand) {
  var fresh = [];
  for (var i = 0; i < dvs.length; i++) {
    if (!seen[String(idOf(dvs[i]))]) fresh.push(dvs[i]);
  }
  if (!fresh.length) return [];
  if (mode !== 'seq') {
    var r = typeof rand === 'function' ? rand : Math.random;
    var k = Math.floor(r() * fresh.length) % fresh.length;
    return [fresh[k]];
  }
  return fresh;
}

// 取一批播放条目。tipId=游走锚（fetchMore 传入的「仓库末条 id」）：游走链是预建路径——
// 每次取流都从链尾的池子里抽，用户沿链下滑即在图上游走。失败/空批静默回 []（fetchMore
// 的 loading 互斥与 gen 作废由仓库层管，本层不重试网络错误——下一拍 ensureMore 会再来）
export function batch(tipId) {
  var tip = tipId != null ? String(tipId) : '';
  if (!tip) return Promise.resolve([]);
  var tries = 0;
  var mode = getSetting('relSequential') ? 'seq' : 'walk';
  function attempt() {
    tries++;
    return listRelated(tip).then(function (dvs) {
      var picked = pickFresh(dvs, _seen, mode);
      if (!picked.length) {
        if (tries < MAX_REFETCH) return attempt(); // 换一批再试（同参内容轮换，实测在册）
        picked = pickFresh(dvs, {}, mode); // 兜底放宽：允许重播，不断流
        stat('rel.replay');
      }
      var out = [];
      for (var i = 0; i < picked.length; i++) {
        _seen[String(idOf(picked[i]))] = 1;
        out.push(relatedItemOf(picked[i]));
      }
      stat('rel.batch');
      return out;
    }, function () {
      stat('rel.fail');
      return [];
    });
  }
  return attempt();
}

// ---------- 起步缝（mediator，state.js 同款「读方零反向依赖」） ----------
// 链条起步要动播放器的舞台复位机器（resetStream/renderWindow/setActive）与源切换——这些都在
// player 域；本模块若 import player 即成环（player→comments→reldrawer→本模块）。故 player 在
// 求值期注册起步器，reldrawer/精选页经 startChain 调用（未注册时静默 false：播放器没开着，
// 行点击无从谈起）。**不走 hash→loadDeepLink** 的原因：那条链「源随链接走」会 setSource('home')
// 把游走态覆写掉（player.js loadDeepLink 语义在册）——起步器镜像它的复位序列但保住 related。
var chainStarter = null;
export function setChainStarter(fn) { chainStarter = typeof fn === 'function' ? fn : null; }
export function startChain(acId, firstItem) {
  if (!chainStarter || firstItem == null) return false;
  seed(acId);
  chainStarter(Number(acId) || 0, firstItem);
  return true;
}

// ---------- 播放层宿主缝（0.9.170，同款 mediator） ----------
// 层内换条与舞台起步是**两种落点**：播放层（playlayer，浮层单条）在场时，抽屉行点击 =
// 层内换条（不拆界面）；否则 = startChain 舞台游走。判定与动作都由 playlayer 注册进来
// （active 读它的在层状态、jump 走它的换条机器）——reldrawer 照样只 import 本模块。
var layerHost = null;
export function setLayerHost(h) { layerHost = h || null; }
export function layerActive() { return !!(layerHost && layerHost.active && layerHost.active()); }
export function layerJump(item, ctx) {
  if (!layerActive() || item == null) return false;
  layerHost.jump(item, ctx);
  return true;
}

// 开层缝（0.9.172，同款 mediator）：**层外**点相关推荐行的落点——把该视频交给播放层
// （openPlayer），舞台/视图原地保活（Esc 回当前视频）。0.9.167 以来这条路径走的是 startChain
// （重置整条流 + 拆视图），用户实报「原窗口直接没了」——改为开层后「点开即走、退出即回」。
// playlayer 注册（本模块仍不 import 它）；未注册（播放器没挂载）返回 false，调用方走遗留兜底。
var layerOpener = null;
export function setLayerOpener(fn) { layerOpener = typeof fn === 'function' ? fn : null; }
export function layerOpen(item, ctx) {
  if (!layerOpener || item == null) return false;
  return layerOpener(item, ctx) !== false;
}

// debug 构建测试钩子：harness 断言读泵态（release 死码消除）
testHook('rel', function () {
  return { seenCount: Object.keys(_seen).length, mode: getSetting('relSequential') ? 'seq' : 'walk' };
});
