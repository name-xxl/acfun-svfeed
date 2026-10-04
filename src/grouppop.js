// ---------- 关注分组选择层（0.9.142）：rail 关注角标 + 我的页成员行的共用语义件 ----------
// 本件 = 「关注分组」的产品语义层（pickpop 是零业务壳、relationapi 是 IO、data 是契约）：
//   · 未关注 → 「选择分组」单选，**默认勾未分组**（点开即确定 ≈ 原一键关注，不拖慢高频路径），
//     提交 action=1 带组（回复 0 即成功）；
//   · 已关注 → 「更改分组」单选，**不预选**（requireSelection——不许点开直接确定把用户默默移组），
//     提交 action=3；改分组**不能**用 action=1 重关注冒充（真机实测：action=1 对已关注用户
//     不改归属，见 relationapi 头注②）；
//   · 已关注态可带「取消关注」附加键（action=2）——rail 关注角标原「再点=取关」的能力不丢；
//     我的页成员行自带取关键，传 noExtra 关掉本附加键；
//   · **不做"当前组高亮"**：feed 条目的 groupId 是埋点串不是关注分组（2026-10-04 实测），
//     没有便宜端点反查"某用户在哪组"——管理页行上的归属标签来自 getFollows 自带的 groupName。
import { openPickPop } from './pickpop.js';
import { getGroups, createGroup, followUser, unfollowUser, regroup } from './relationapi.js';
import { groupNameError } from './data.js';
import { toast } from './ui.js';

// 关注/改分组选择层。opts：{ uid, name, following, noExtra, done(res) }
// done 的 res = { unfollowed:bool, groupId:string, groupName:string }（消费方据此回写 UI）
export function openFollowGroupPop(btn, opts) {
  var following = !!opts.following;
  var names = {}; // id → 组名（done 回传用）
  var state = { unfollowed: false, groupId: '', groupName: '' };
  return openPickPop(btn, {
    title: following ? '更改分组' : '选择分组',
    requireSelection: following,
    emptyText: '还没有分组',
    load: function () {
      return getGroups().then(function (gs) {
        names = {};
        var items = gs.map(function (g) {
          names[g.id] = g.name;
          return { id: g.id, name: g.name, count: g.count };
        });
        // 未关注：默认勾「未分组」（id "0" 是普通项，真机实测）
        if (!following) items.forEach(function (it) { if (it.id === '0') it.on = true; });
        return { items: items };
      });
    },
    canCreate: {
      label: '＋ 新建分组', placeholder: '分组名（1~8 字）', maxLen: 8,
      check: groupNameError,
      create: function (name) { return createGroup(name); } // → 新 id（响应带，缺则差集兜底）
    },
    confirm: function (sel) {
      var gid = sel.ids[0] || '';
      var req = following ? regroup(opts.uid, gid) : followUser(opts.uid, gid);
      return req.then(function (ok) {
        if (ok) { state.groupId = gid; state.groupName = names[gid] || ''; }
        return ok;
      });
    },
    extraAction: (following && !opts.noExtra) ? {
      label: '取消关注',
      run: function () { return unfollowUser(opts.uid).then(function (ok) { if (ok) state.unfollowed = true; return ok; }); }
    } : null,
    done: function () {
      if (state.unfollowed) toast('已取消关注 @' + (opts.name || ''));
      else if (following) toast('已更改分组' + (state.groupName ? '：' + state.groupName : ''));
      else toast('已关注 @' + (opts.name || ''));
      if (opts.done) opts.done(state);
    }
  });
}
