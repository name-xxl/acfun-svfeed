// ---------- 组名/夹名校验（0.9.160 自 data.js 叶子出库） ----------
// 零依赖纯函数：返回 '' = 通过，否则内联提示文案。消费方 grouppop/favpop/mypage。

// 组名/夹名校验（站点 chunk 实锤正则 + 保留名；返回 '' = 通过，否则内联提示文案）。
// 真机边界：组名 1~8 字、收藏夹名 1~40 字，均只许中英文/数字/下划线（**无空格连字符**）；
// 组名另禁保留名「未分组/特别关注」（chunk 校验正则，§2.6）
var GROUP_NAME_RE = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,8}$/;
var FOLDER_NAME_RE = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,40}$/;
export function groupNameError(name) {
  var s = String(name == null ? '' : name).trim();
  if (!s) return '请输入分组名';
  if (!GROUP_NAME_RE.test(s)) return '1~8 个字，仅限中英文、数字、下划线';
  if (s === '未分组' || s === '特别关注') return '「' + s + '」是保留名，换一个';
  return '';
}
export function folderNameError(name) {
  var s = String(name == null ? '' : name).trim();
  if (!s) return '请输入收藏夹名';
  if (!FOLDER_NAME_RE.test(s)) return '1~40 个字，仅限中英文、数字、下划线';
  return '';
}
