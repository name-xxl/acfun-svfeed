// @ts-check
// ---------- 页面类型分类器（0.9.88）：boot 运行分流的判据 ----------
// 病灶：@match 扩到全 www 后 boot 只有 host 判断——视频/文章/UP 空间页全走全量初始化，
// 分流实际藏在各模块内部守卫里（nav 白名单 / uppage 的 /u/ 匹配 / toggle 的路由检查），
// boot 层无显式契约，加页面级模块时无处可查。抽零依赖纯函数（收 {hostname,pathname}，
// Node 直测）：boot 按 kind 分支，总表见 boot.js 顶部注释。
//
// 判据单源（0.9.303 由「宣称逐字一致+靠人肉同改」升级为导出件）：UP 空间页 `/u/<数字>` 用
// SPACE_UID_RE、个人中心 `/member` 用 memberCenterPath——boot/uppage/spacemoments/memberplaza
// 全消费本件导出，物理上不再各写正则（旧哨兵单测钉的是 pageKind 自己，钉不到消费点=假守卫）。
// video/article 只按前缀（/v/、/a/）不强制 ac 号：误落 other 无行为代价（两者分支同形），
// 判据宁简勿碎。其余（/bangumi、/search、/list 等）一律 other。

// UP 空间页判据（带捕获组，消费点直接取 uid）
export var SPACE_UID_RE = /^\/u\/(\d+)/;
// 个人中心 /member 及其子路径（0.9.47「其他页不注入」的限定反转区，见 boot 总表）
export function memberCenterPath(pathname) {
  return /^\/member(\/|$)/.test(String(pathname || ''));
}

export function pageKind(loc) {
  var host = String((loc && loc.hostname) || '');
  var path = String((loc && loc.pathname) || '');
  if (host === 'message.acfun.cn') return 'native';
  if (path === '/') return 'home';
  if (/^\/v\//.test(path)) return 'video';
  if (/^\/a\//.test(path)) return 'article';
  if (SPACE_UID_RE.test(path)) return 'member';
  if (memberCenterPath(path)) return 'memberCenter';
  return 'other';
}
