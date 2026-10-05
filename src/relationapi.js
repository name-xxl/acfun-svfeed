// ---------- 关注域读写接口（0.9.142）：关注/取关/改分组 + 分组 CRUD + 组内成员读 ----------
// 端点/参数来自 docs/api-research.md §2.2/§2.5/§2.6（全生命周期真机实测），本模块=编排 + 落点
// + 回包规整（groupListOf/followListPageOf/newGroupIdOf，0.9.159 自 data.js 域归域迁入——
// 域回包形状只有本域消费，规整随域走）。
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

function ok0(j) { return !!(j && j.result === 0); }

// ---------- 回包规整（0.9.159 自 data.js 域归域迁入；字段真机核对 2026-10-04，docs/api-research.md §2.2/§2.3/§2.6） ----------

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

// 组列表规整：getGroups → groupList[] {groupId, groupName, followingCount(Show)} → [{id, name, count}]。
// **真机要点**：id 一律字符串（接口回显即字符串，DOM dataset/比较同纪律）；**「未分组」是
// groupId="0" 的普通项**（实测 7 组含它、14 人）——不是"缺省值"，选它=移出所有分组
export function groupListOf(j) {
  var raws = (j && j.groupList) || [];
  var out = [];
  raws.forEach(function (g) {
    if (!g || g.groupId == null || g.groupId === '') return;
    out.push({
      id: String(g.groupId),
      name: String(g.groupName == null ? '' : g.groupName),
      count: g.followingCount != null ? Number(g.followingCount) || 0 : null
    });
  });
  return out;
}

// 关注成员分页规整：getFollows（action=9 组内 / 7 全部）→ {items, nextCursor, total, noMore}。
// **游标口径**：响应 pcursor 是**偏移量**（实测 "20"→"40"），与 followFeedV2 的毫秒时间戳不同源
// ——勿跨域复用游标（relationapi 内独立收口）。条目自带 groupId/groupName（成员归属，
// 管理页行上直接可显）；头像读序 userImg → userHeadImgInfo.thumbnailImageCdnUrl
export function followListPageOf(j) {
  var raws = (j && j.friendList) || [];
  var items = [];
  raws.forEach(function (u) {
    if (!u || u.userId == null || u.userId === '') return;
    items.push({
      id: String(u.userId),
      name: String(u.userName == null ? '' : u.userName),
      head: userHeadOf(u),
      sign: String(u.signature == null ? '' : u.signature),
      fans: u.fanCountShow != null ? String(u.fanCountShow) : '',
      contrib: u.contributeCountShow != null ? String(u.contributeCountShow) : '',
      groupId: u.groupId != null ? String(u.groupId) : '',
      groupName: String(u.groupName == null ? '' : u.groupName)
    });
  });
  // 终值 'no_more'（真机实测：最后一页回 pcursor:"no_more"）与空页同判到底；偏移量游标仅在上限内递交
  var next = j && j.pcursor != null ? String(j.pcursor) : '';
  var noMore = !items.length || !next || next === 'no_more';
  return {
    items: items,
    nextCursor: noMore ? '' : next,
    total: j && j.totalCount != null ? Number(j.totalCount) || 0 : null,
    noMore: noMore
  };
}

function userHeadOf(u) {
  if (u.userImg) return String(u.userImg);
  var t = u.userHeadImgInfo && u.userHeadImgInfo.thumbnailImageCdnUrl;
  return t ? String(t) : '';
}

// 建组后的新 id 定位（**兜底路径**：响应无 groupId 的旧形态）——拿 before 的 id 集与 after
// 的组列表做差集。**真机复验（2026-10-04）：现形态响应带 `{result:0, groupId}`，
// relationapi.createGroup 优先取响应 id、本函数仅作兜底**（旧记载"必须差集"已订正）。
// 同名组本就存在（after 里有两项同名且都不是新 id）时返回 ''，调用方按"重名"提示
export function newGroupIdOf(beforeIds, afterList, name) {
  var old = {};
  (beforeIds || []).forEach(function (id) { old[String(id)] = 1; });
  for (var i = 0; i < (afterList || []).length; i++) {
    var g = afterList[i];
    if (!old[g.id] && g.name === name) return g.id;
  }
  return '';
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
