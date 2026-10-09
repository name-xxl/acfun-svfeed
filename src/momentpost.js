import { CFG } from './cfg.js';
import { request } from './net.js';

// ---------- 动态发布域（0.9.220） ----------
// 契约全链实测在 docs/api-research.md §11：端点 APP 域、**只认网页 Cookie**、服务端**不校验**
// KSecurity 签名、body 单字段 `params`(JSON)、content 1–233、错误码家族 0/21/-401/140000/140002。
//
// **通道**：走 `net.request`——真机里它内部就是 GM 通道（APP 域跨域唯一可行，页面 fetch/XHR 被站点
// 改写与 CORS 双重封死），同时**命中 harness 的 `__ACSV_MOCK_FORM__` 缝**（写链才可断言；直用
// `gmRequest` 的模块是漏缝的）。⚠ 与 `appapi` 头注「GM 写操作会被判不可信设备」的冲突：那条是
// pc-direct **同域**写的结论，APP 域没有页面通道可用——**真机 go/no-go 以实测为准**（docs §11.5）。

// 查询串（脚本原样 product/app_version）。实测不带也能过鉴权（门是 Cookie），带上更贴近官方客户端
function query() {
  return '?product=ACFUN_APP&app_version=' + CFG.home.appVer;
}

// params JSON 组装（纯函数，单测直采）。字段名取自反编译 `DynamicContributeData`（docs §11.6）：
// content / imgs / shareResourceType / visibleForFans + 转发族 repost*（本批做 动态/视频/文章 三种源）
export function momentParams(content, opts) {
  opts = opts || {};
  var p = {
    content: String(content == null ? '' : content),
    imgs: (opts.imgs || []).map(function (im) {
      return {
        url: String((im && im.url) || ''),
        width: Number(im && im.width) || 0,
        height: Number(im && im.height) || 0
      };
    }),
    shareResourceType: 0,
    visibleForFans: !!opts.visibleForFans
  };
  if (opts.repost) {
    var r = opts.repost;
    // 按源类型填族内字段。**必填组合待真机试错**：失败只回 21「参数格式错误」，不指出缺哪个字段
    if (r.ct === 'moment') p.repostMomentId = Number(r.id) || 0;
    else if (r.ct === 'video') { p.repostResourceType = 2; p.repostResourceId = Number(r.id) || 0; }
    else if (r.ct === 'article') { p.repostResourceType = 3; p.repostResourceId = Number(r.id) || 0; }
  }
  return JSON.stringify(p);
}

// 字数口径（**客户端预检**；真值以服务端 140000 为准）。当前取值＝**原始长度**（码元数，UBB 令牌
// 按原文长度计）。未定项（docs §11.5）：`[emot=acfun,123/]` 这类令牌服务端按 1 计还是按串长计，
// 两假设均未实测——先取**从严**的原始长度（宁可少打几个字，也不要服务端弹错）。真机定论后一行可换。
export function momentCharCount(text) {
  return String(text == null ? '' : text).length;
}

export var MOMENT_MAX = 233; // 服务端约束（实测 140000「内容长度必须为1-233」）

// 图片尺寸（**写侧必须自量**：upload.js 只回签名 URL，尺寸是服务端下发读侧的字段）。
// 非纯函数（DOM Image），单测不覆盖；失败给 0×0（服务端会拦，不虚标）
export function dimsOf(url) {
  return new Promise(function (resolve) {
    var im = new Image();
    im.onload = function () { resolve({ url: url, width: im.naturalWidth || 0, height: im.naturalHeight || 0 }); };
    im.onerror = function () { resolve({ url: url, width: 0, height: 0 }); };
    im.src = url;
  });
}

// 回包 → 结果（纯函数，单测直采）。错误码家族映射成**话术键**（具体文案在 toastmsg 单源）
export function postResultOf(j) {
  var r = j && j.result;
  if (r === 0) {
    var mid = (j && j.moment && j.moment.momentId) || (j && j.momentId) || 0;
    return { ok: true, momentId: Number(mid) || 0 };
  }
  var kind = r === -401 ? 'notlogin' : (r === 21 ? 'param' : (r === 140000 ? 'content' : 'other'));
  return { ok: false, code: r, kind: kind, msg: (j && (j.error_msg || j.errorMsg)) || '' };
}

// 发布（写链）。opts: { imgs, visibleForFans, repost }
export function addMoment(content, opts) {
  var body = 'params=' + encodeURIComponent(momentParams(content, opts));
  return request(CFG.api.momentAdd + query(), 'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' }, body).then(postResultOf);
}

// 删除（误发/试错后的兜底；同域同族，form 单字段 momentId）
export function deleteMoment(momentId) {
  return request(CFG.api.momentDelete + query(), 'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    'momentId=' + encodeURIComponent(momentId)).then(postResultOf);
}
