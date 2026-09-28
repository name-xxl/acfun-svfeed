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
  return postForm(CFG.api.interact + (add ? 'add' : 'delete'),
    'objectId=' + item.id + '&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP'
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

export function setRealFollow(item, on) {
  return postForm(CFG.api.follow,
    'toUserId=' + item.userId + '&action=' + (on ? 1 : 2) + '&groupId='
  ).then(function (j) {
    return !!(j && j.result === 0);
  }, function () { return false; });
}

// 收藏/取消收藏（home）
export function setRealFavorite(item, on) {
  return AppAPI.setFavorite(item.id, on);
}

// 投蕉（home）：count 1~5
export function giveBanana(item, count) {
  return AppAPI.throwBanana(item.id, count);
}
