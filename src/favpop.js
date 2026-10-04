// ---------- 收藏夹选择层（0.9.143）：rail 收藏键 + 我的页收藏卡「移动」的共用语义件 ----------
// 官方口径（点收藏=弹选择层，A 站网页同款）：多选勾选 + 行内新建 + 确定，按**三分支**提交
//（真机写侧实测在册，docs §4.2）：
//   · 未收藏 → 勾选集非空 ⇒ resource/add（addFolderIds=勾选集）；**默认勾第一个夹**
//     （点开即确定 ≈ 原"快速收藏"的一步路径，不拖慢高频动作）；未勾任何夹时「确定」禁用
//     （requireSelection——不许提交空动作）
//   · 已收藏 → 有改动的差集 ⇒ resource/updateFolder（addFolderIds=新勾 / delFolderIds=取消）
//   · 已收藏且**全部取消** ⇒ resource/remove（移除收藏）
// 勾选态来自 folder/list 带 resourceId 的 inFolder（真机实测）；夹名/夹 id 一律字符串。
import { openPickPop } from './pickpop.js';
import { folderList, folderAdd, favAdd, favUpdate, favRemove } from './favapi.js';
import { folderNameError } from './data.js';
import { toast } from './ui.js';

// opts：{ acId, favorited, title?, done(res) }——done 回传 { favorited:bool }
export function openFavFolderPop(btn, opts) {
  var favorited = !!opts.favorited;
  var state = { on: favorited };
  return openPickPop(btn, {
    title: opts.title || (favorited ? '调整收藏夹' : '选择收藏夹'),
    multi: true,
    requireSelection: !favorited, // 未收藏不许提交空勾选；已收藏允许"全取消=移除收藏"
    emptyText: '还没有收藏夹',
    load: function () {
      return folderList(opts.acId).then(function (items) {
        var its = items.map(function (f) {
          return { id: f.id, name: f.name, count: f.count, on: !!f.inFolder };
        });
        if (!favorited && its.length && !its.some(function (it) { return it.on; })) its[0].on = true;
        return { items: its };
      });
    },
    canCreate: {
      label: '＋ 新建收藏夹', placeholder: '收藏夹名（1~40 字）', maxLen: 40,
      check: folderNameError,
      create: function (name) { return folderAdd(name); } // → 新夹 id（响应 data.folderId）
    },
    confirm: function (sel) {
      var req;
      if (!favorited) req = favAdd(opts.acId, sel.ids);
      else if (!sel.ids.length) req = favRemove(opts.acId, sel.removed);
      else req = favUpdate(opts.acId, sel.added, sel.removed);
      return req.then(function (ok) {
        if (ok) state.on = sel.ids.length > 0;
        return ok;
      });
    },
    done: function () {
      toast(state.on ? '已加入收藏' : '已取消收藏');
      if (opts.done) opts.done({ favorited: state.on });
    }
  });
}
