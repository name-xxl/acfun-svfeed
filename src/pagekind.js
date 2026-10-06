// @ts-check
// ---------- 页面类型分类器（0.9.88）：boot 运行分流的判据 ----------
// 病灶：@match 扩到全 www 后 boot 只有 host 判断——视频/文章/UP 空间页全走全量初始化，
// 分流实际藏在各模块内部守卫里（nav 白名单 / uppage 的 /u/ 匹配 / toggle 的路由检查），
// boot 层无显式契约，加页面级模块时无处可查。抽零依赖纯函数（收 {hostname,pathname}，
// Node 直测）：boot 按 kind 分支，总表见 boot.js 顶部注释。
//
// 判据与 uppage.tryInjectSpace 的 /^\/u\/(\d+)/ **逐字一致**——member 分类变了而注入
// 判据没变（或反之）就是静默丢功能，两处必须同源同改（单测钉一致性）。
// video/article 只按前缀（/v/、/a/）不强制 ac 号：误落 other 无行为代价（两者分支同形），
// 判据宁简勿碎。其余（/bangumi、/search、/list 等）一律 other。
export function pageKind(loc) {
  var host = String((loc && loc.hostname) || '');
  var path = String((loc && loc.pathname) || '');
  if (host === 'message.acfun.cn') return 'native';
  if (path === '/') return 'home';
  if (/^\/v\//.test(path)) return 'video';
  if (/^\/a\//.test(path)) return 'article';
  if (/^\/u\/\d+/.test(path)) return 'member';
  return 'other';
}
