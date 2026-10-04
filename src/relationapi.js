// ---------- 关注域读写接口（0.9.142）：关注/取关/改分组 + 分组 CRUD + 组内成员读 ----------
// 端点/参数来自 docs/api-research.md §2.2/§2.5/§2.6（全生命周期真机实测），本模块=编排 + 落点；
// 规整一律走契约层 data.js 纯函数（groupListOf/followListPageOf/newGroupIdOf），本文件不手搓字段。
//
// **真机补验（2026-10-04 内置浏览器登录态，测试组建/移/改名/删全链闭环、终态复原）**：
//   ① 建组（action=4）响应**其实带回新 id**：`{result:0, groupId:"281985"}`——docs §2.6 记的
//      "响应不带新 groupId、须差集回查"是旧形状/旧读法，本实现优先取响应 id、**差集仅作兜底**
//      （两种形态都在：`newGroupIdOf` 纯函数仍保留，单测钉着）；
//   ② **action=1（关注）对已关注用户不改归属**（实测把已关注用户以 action=1+新组 id 提交，仍留在
//      原组）——改分组**必须** action=3（UI 侧据此分派，勿用"重新关注"当移组）；
//   ③ 「未分组」是**普通组 id="0"**（getGroups 首项），action=3 的 groupId=0 实测可把成员移回；
//      关注时的"未分组"沿用现行语义=**groupId 传空**（0.9.30 起在用的已验证形态，两者等价）；
//   ④ getFollows 翻页：`pcursor` 是**偏移量**（0/5/10…），终端值 `no_more`；`page` 也有它的口径
//      但**pcursor 优先**——本模块只发 page=1 + pcursor，游标不与 feed 域（毫秒时间戳）混用。
//
// 传输纪律：**写链一律 postForm**（appapi 的页面 fetch 通道——GM 桥接会被风控判为不可信设备，
// 见 appapi.postForm 注释）；只有 getGroups 是 GET（社区文档写 POST，实测为 GET）。
// URL 形态与实测逐字一致（harness mock 缝按 URL 子串命中，改字符即断夹具）。
import { CFG } from './cfg.js';
import { postForm } from './appapi.js';
import { request } from './net.js';
import { groupListOf, followListPageOf, newGroupIdOf } from './data.js';

function ok0(j) { return !!(j && j.result === 0); }

// 组列表（GET）：→ [{id, name, count}]，含「未分组」(id "0")
export function getGroups() {
  return request(CFG.api.relationGroups, 'GET').then(groupListOf);
}

// 关注成员分页：groupId 空/'-1' = 全部（action=7），组 id = 组内（action=9）；pcursor=偏移量
export function listFollows(groupId, pcursor) {
  var gid = groupId == null || groupId === '' ? '-1' : String(groupId);
  var act = gid === '-1' ? 7 : 9;
  return postForm(CFG.api.relationFollows,
    'action=' + act + '&page=1&count=' + CFG.view.pageSize + '&groupId=' + gid
    + (pcursor ? '&pcursor=' + encodeURIComponent(pcursor) : ''))
    .then(followListPageOf);
}

// 关注（action=1）：groupId 空 = 未分组；带组 id 直接入组。**对已关注用户不改归属**（真机②）
export function followUser(uid, groupId) {
  return postForm(CFG.api.follow,
    'toUserId=' + uid + '&action=1&groupId=' + (groupId || '')).then(ok0);
}

// 取关（action=2）
export function unfollowUser(uid) {
  return postForm(CFG.api.follow, 'toUserId=' + uid + '&action=2&groupId=').then(ok0);
}

// 改分组（action=3）：groupId="0" = 移回未分组（真机③ 实测）
export function regroup(uid, groupId) {
  return postForm(CFG.api.follow,
    'toUserId=' + uid + '&action=3&groupId=' + (groupId || '')).then(ok0);
}

// 建组（action=4）：**优先取响应 groupId**（真机①），拿不到才回查差集；→ 新 id 或 null（重名等）
export function createGroup(name) {
  var before = [];
  return getGroups().then(function (gs) {
    before = gs.map(function (g) { return g.id; });
    return postForm(CFG.api.relationGroup, 'action=4&groupName=' + encodeURIComponent(name));
  }).then(function (j) {
    if (!ok0(j)) return null;
    if (j.groupId != null && String(j.groupId) !== '') return String(j.groupId);
    return getGroups().then(function (after) { return newGroupIdOf(before, after, name) || null; });
  });
}

// 删组（action=5）：组内成员自动移至「未分组」（站点语义，UI 确认文案照此）
export function removeGroup(groupId) {
  return postForm(CFG.api.relationGroup, 'action=5&groupId=' + groupId).then(ok0);
}

// 改名（action=6）
export function renameGroup(groupId, name) {
  return postForm(CFG.api.relationGroup,
    'groupId=' + groupId + '&action=6&groupName=' + encodeURIComponent(name)).then(ok0);
}
