import { CFG } from './cfg.js';
import { AppAPI, postForm, ensureApiSt } from './appapi.js';

// ---------- 真实互动（点赞 / 关注 / 收藏 / 投蕉） ----------
// 推荐模式互动统一走 web 通道；小视频仅有点赞（纯浏览模式无其余交互）。
// 点赞：A 站没有 pc-direct 点赞端点——官方网页版自己就调 kuaishouzt interact API。
//   objectType=2 对 meow 和普通视频同样有效：objectId 传 meowId（sv）或 ac号（home）。
//   home 对齐网页版参数追加 kpf=PC_WEB（acfunsdk/动态广场同款）；sv 维持原参数
// 收藏：www.acfun.cn PC 端收藏夹体系（resourceType=9 + 默认收藏夹，Cookie 即可）
// 投蕉：www.acfun.cn/rest/pc-direct/banana/throwBanana（PC 端，Cookie 即可）
// 关注：www.acfun.cn/rest/pc-direct/relation/follow（toUserId + action 1/2）
// 表单 POST 统一复用 appapi 的 postForm（fetch + Cookie + urlencoded），此处只留差异

function callInteract(st, item, add, webStyle) {
  // objectType 按条目派生（0.9.96 动态写链）：动态=10（api-research §4.7 实测 add/delete
  // 均 result 1），视频/meow 维持 2；动态条目以 {id: momentId, kind: 'moment'} 过链，
  // kpf 不带——实测非必需（广场版多带的 userId/kpf 都不是必要条件）
  var ot = item.kind === 'moment' ? 10 : 2;
  return postForm(CFG.api.interact + (add ? 'add' : 'delete'),
    'objectId=' + item.id + '&objectType=' + ot + '&interactType=1&subBiz=mainApp&kpn=ACFUN_APP'
      + (webStyle ? '&kpf=PC_WEB' : '') // 网页版身份标识：推荐模式点赞对齐官方网页参数
      + '&acfun.midground.api_st=' + encodeURIComponent(st)
  ).then(function (j) {
    return !!(j && j.result === 1); // kuaishouzt 家族成功码是 1
  });
}

export function setRealLike(item, on) {
  var webStyle = item.kind === 'home';
  return ensureApiSt().then(function (st) {
    return callInteract(st, item, on, webStyle);
  }, function () { return false; }).then(function (ok) {
    if (ok) return true;
    // 令牌可能过期：强制刷新重试一次
    return ensureApiSt(true).then(function (st2) {
      return callInteract(st2, item, on, webStyle);
    }).catch(function () { return false; });
  });
}

// （0.9.142 退役）setRealFollow(item, on)：原实现 = toUserId + action 1/2 + **groupId 传空**
//（关注全落"未分组"、无组选择）。关注/取关/改分组已收口到 relationapi.js + 分组选择层
//（grouppop.js：关注角标点开=「选择分组/更改分组」，官方口径）。退役登记，勿再加回。

// 收藏/取消收藏（home）
export function setRealFavorite(item, on) {
  return AppAPI.setFavorite(item.id, on);
}

// 投蕉（home）：count 1~5
export function giveBanana(item, count) {
  return AppAPI.throwBanana(item.id, count);
}

// ---------- pi 级写链（0.9.102 收口：关注行流与动态详情面板共用） ----------
// 两处（followview 行内互动行 / momentdetail 互动栏）此前各抄一份「kind 派生 + 端点调用」；
// 0.9.96「乐观更新不抽公共件」裁决的前提是「rail/comments/panel 三处语境各异」，对这两个
// **同 pi 契约、同字段、同端点**的消费面不再成立——按「写路径与渲染分离」理念下沉写路径，
// 乐观翻转/回滚/锁 仍留调用方（DOM 更新各异）。rail（slide DOM 同步）与 comments（列表
// 插入）维持不并入，各自语境边界不变
export function likePi(pi, on) {
  // objectType 派生单源：动态=10、其余=2（home 形状在 callInteract 里加 kpf=PC_WEB）
  var item = pi.ct === 'moment' ? { id: pi.momentId, kind: 'moment' } : { id: pi.acId, kind: 'home' };
  return setRealLike(item, on);
}

export function throwBananaPi(pi, count, resourceType) {
  // resourceType：动态=10（§4.7 实测）/ 视频=2 / **文章=3（enum 与 follow feed 一致，未实测
  // ——写链测试纪律不能对他人文章投蕉，失败态由 toast 兜底）**；count 1~5（0.9.104 视频/文章
  // 行接数量层，默认 1 同广场语义）
  var n = count > 0 ? count : 1;
  var rt = resourceType || (pi.ct === 'moment' ? 10 : pi.ct === 'article' ? 3 : 2);
  var id = pi.ct === 'moment' ? pi.momentId : pi.acId;
  return AppAPI.throwBanana(id, n, rt);
}
