// ---------- 播放层会话模型（0.9.209 自 playlayer.js 拆出） ----------
// 三态会话 + 层内历史，纯状态零 DOM 零环境依赖（node 单测直采）；会话语义与缺省见
// playlayer.js 头注（0.9.170–175 用户裁决：single 只由来源显式声明；walk=相关池=缺省；
// list=来源结果列表）。DOM/IO 全部经 levelstack.js/playlayer.js 注入，本模块不碰环境。

export function freshSession() {
  return { kind: 'single', list: [], rows: null, idx: -1, more: null };
}

// 会话装配（层开/跳轨时调；放 swap 之前——新 slide 按新会话决定建不建箭头）。
// **缺省=walk**（用户裁决「仅播放单条就只剩动态里的视频卡片」——深链/刷新这类无列表来源
// 仍给相关池续命；单条只能由来源显式声明 {kind:'single'}）
export function sessionFromCtx(ctx) {
  if (ctx && ctx.kind === 'single') return freshSession();
  if (ctx && ctx.kind === 'list' && ctx.items && ctx.items.length) {
    var s = {
      kind: 'list', list: ctx.items.slice(), rows: ctx.rows || null,
      idx: Number(ctx.idx) || 0, more: ctx.more || null
    };
    if (s.idx < 0 || s.idx >= s.list.length) s.idx = 0;
    return s;
  }
  return { kind: 'walk', list: [], rows: null, idx: -1, more: null };
}

// 会话快照（历史格随身存一份；list 数组共享引用、idx/more 值拷贝——列表增长不需回滚）
export function snapSession(s) {
  return { kind: s.kind, list: s.list, rows: s.rows, idx: s.idx, more: s.more };
}

export function sessionFromSnap(s) {
  return { kind: s.kind, list: s.list, rows: s.rows || null, idx: s.idx, more: s.more };
}

// 层内历史：**每格随身带会话快照** {item, sess}——↑ 回退时连列表下标一起还原（否则列表里
// ↓↓ 再 ↑ 会把 idx 落在错格：harness ll-zone-back 首轮抓到）
export function createHist() { return { hist: [], hIdx: -1 }; }

// 落点=入历史（回退后再前进会截断旧前向分支）——**级别内**换条（↓/列表内跳转都走这）
export function histJump(h, entry) {
  h.hist[h.hIdx + 1] = entry;
  h.hist.length = h.hIdx + 2;
  h.hIdx = h.hist.length - 1;
}

export function histReset(h, entry) {
  h.hist = entry ? [entry] : [];
  h.hIdx = entry ? 0 : -1;
}

// ↑ 一律历史回退（跨会话也成立：跳轨后 ↑ 能退回原列表原位）；已到入口返回 null（调用方
// 出「已经是第一条」）
export function histBack(h) {
  if (h.hIdx <= 0) return null;
  h.hIdx--;
  return h.hist[h.hIdx];
}
