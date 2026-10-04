// ---------- 收藏域读写接口（0.9.143）：夹列表（含勾选态）+ 夹 CRUD + 收藏三写 ----------
// 端点/参数来自 docs/api-research.md §4.2（读侧 + 写侧全生命周期真机实测）；本模块=编排 + 落点，
// 规整走契约层 data.js 纯函数（folderListOf/folderIdOf）；URL 形态与实测逐字一致（mock 缝）。
//
// **真机补验（2026-10-04 内置浏览器登录态，自建临时夹闭环、终态逐项复原）**：
//   ① 建夹响应带回新 id：`{result:0, data:{folderId:"77466978", name, resourceCount:0, inFolder:false}}`
//      ——data 即夹 meta（folderIdOf 两条形态都兜着）；
//   ② **删夹会连带移除仅存于该夹的收藏记录**（隔离实测：未收藏靶 → 建夹→加藏→删夹 ⇒ 该条收藏
//      记录整体消失、不落任何夹，夹表复原）——UI 的删除确认必须照此明示；
//   ③ 夹列表带 `resourceId` 时每项多带 `inFolder`（勾选态数据源）；不带时恒缺省 false；
//   ④ resource/add·updateFolder·remove 一律 `resourceType=9`（投稿视频），多夹用逗号拼接；
//      add 回包另带 `failFolderIdList`（失败夹列表，本实现不消费，超限时前端另有提示）。
//
// 传输纪律：写链一律 postForm（appapi 的页面 fetch 通道，风控友好，见 appapi.postForm 注释）。
// 迁出登记（0.9.143）：ensureFavFolder/默认夹缓存原在 appapi——收藏改「弹层选夹」（官方口径）
// 后不再需要"快速落第一个夹"，随之退役；appapi 的 setFavorite 同批迁出（interact.setRealFavorite
// 一并退役）。收藏写链唯一入口 = 本模块。
import { CFG } from './cfg.js';
import { postForm } from './appapi.js';
import { folderListOf, folderIdOf } from './data.js';

function ok0(j) { return !!(j && j.result === 0); }

// 夹列表：带 resourceId 时每项带 inFolder（收藏选择层的勾选态）；失败 throw（调用方出错误态）
export function folderList(resourceId) {
  return postForm(CFG.api.favFolderList, resourceId ? 'resourceId=' + resourceId : '')
    .then(function (j) {
      if (!j || j.result !== 0) throw new Error('folder-list-fail');
      return folderListOf(j);
    });
}

// 单夹收藏列表（dougaList，读）：0.9.148 收口——此前我的页自拼查询串（收藏域 IO 一分为二）。
// **URL/参数逐字保持**（harness mock 按子串命中，改字符即断夹具）；响应规整仍在视图（panelItem 属契约层）
export function favList(folderId, page) {
  return postForm(CFG.api.favDougaList,
    'folderId=' + folderId + '&page=' + page + '&perpage=' + CFG.view.pageSize);
}

// 建夹：→ 新夹 id（响应 data.folderId）；失败/拿不到 id 回 null（调用方可回查夹列表兜底）
export function folderAdd(name) {
  return postForm(CFG.api.favFolderAdd, 'name=' + encodeURIComponent(name)).then(function (j) {
    if (!ok0(j)) return null;
    return folderIdOf(j) || null;
  });
}

// 删夹：连带移除仅存于该夹的收藏记录（真机②）
export function folderDelete(folderId) {
  return postForm(CFG.api.favFolderDelete, 'folderId=' + folderId).then(ok0);
}

// 改名（0.9.143 探到并验证：`folderId&name`；站点收藏弹窗里没这入口，是"收藏夹管理页"的活）
export function folderRename(folderId, name) {
  return postForm(CFG.api.favFolderUpdate,
    'folderId=' + folderId + '&name=' + encodeURIComponent(name)).then(ok0);
}

// 加收藏（可多夹）：addFolderIds 逗号拼接
export function favAdd(acId, addIds) {
  return postForm(CFG.api.favoriteAdd,
    'resourceId=' + acId + '&resourceType=9&addFolderIds=' + addIds.join(',')).then(ok0);
}

// 改夹/移动（差集）：addFolderIds 新勾、delFolderIds 取消；两者都可空（各表单向）
export function favUpdate(acId, addIds, delIds) {
  return postForm(CFG.api.favResUpdate,
    'resourceId=' + acId + '&resourceType=9&addFolderIds=' + (addIds || []).join(',')
    + '&delFolderIds=' + (delIds || []).join(',')).then(ok0);
}

// 移除收藏（从这些夹里摘掉该记录）
export function favRemove(acId, delIds) {
  return postForm(CFG.api.favoriteRemove,
    'resourceId=' + acId + '&resourceType=9&delFolderIds=' + delIds.join(',')).then(ok0);
}
