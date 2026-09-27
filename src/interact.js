import { CFG } from './cfg.js';
import { ensureApiSt, AppAPI } from './appapi.js';

// ---------- 真实互动（点赞 / 关注 / 收藏 / 投蕉） ----------
// 点赞：id.app.acfun.cn 换 api_st → api.kuaishouzt.com interact/add|delete
//   objectType=2 对 meow 和普通视频同样有效：objectId 传 meowId（sv）或 ac号（home）
// 收藏/投蕉：api-new.app.acfun.cn 写接口（AppAPI），域 Cookie + api_st 双保险
// 关注：www.acfun.cn/rest/pc-direct/relation/follow（toUserId + action 1/2）
// 均依赖登录；未登录时由调用方提示

export { ensureApiSt };

function callInteract(st, item, add) {
  return fetch(CFG.api.interact + (add ? 'add' : 'delete'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'objectId=' + item.id + '&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP'
      + '&acfun.midground.api_st=' + encodeURIComponent(st)
  }).then(function (r) { return r.json(); }).then(function (j) {
    return !!(j && j.result === 1);
  });
}

export function setRealLike(item, on) {
  return ensureApiSt().then(function (st) {
    return callInteract(st, item, on);
  }, function () { return false; }).then(function (ok) {
    if (ok) return true;
    // 令牌可能过期：强制刷新重试一次
    return ensureApiSt(true).then(function (st2) {
      return callInteract(st2, item, on);
    }).catch(function () { return false; });
  });
}

export function setRealFollow(item, on) {
  return fetch(CFG.api.follow, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'toUserId=' + item.userId + '&action=' + (on ? 1 : 2) + '&groupId='
  }).then(function (r) { return r.json(); }).then(function (j) {
    return !!(j && j.result === 0);
  }).catch(function () { return false; });
}

// 收藏/取消收藏（home）
export function setRealFavorite(item, on) {
  return AppAPI.setFavorite(item.id, on);
}

// 投蕉（home）：count 1~5
export function giveBanana(item, count) {
  return AppAPI.throwBanana(item.id, count);
}
