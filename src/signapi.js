// ---------- 签到域（0.9.277） ----------
// 实测真源 docs/api-research.md §10.17（2026-10-18，内置浏览器登录态 + 表单 POST 直调）：
//   · 写链：api-new 版要 App OAuth 令牌（web 造不出，8 组组合全灭）——走 mobile-direct 首选、
//     pc-direct 兜底，两链均网页 Cookie + 空表体，今日已签回 result=122（App 按成功处理）；
//   · 查询：getSignInInfos 网页 Cookie 免参数直通（7 天日历 infos[7]，网页回包无 almanac）；
//   · 黄历：updateAlmanacFortune 网页 Cookie + 空表体直通（App 侧是「改运」按钮，结果可能变化——
//     用户 2026-10-18 裁决：不做缓存，每次实时拉）。
// 状态不落本地：签到与否以服务端回包为准（autosign 只做单飞，不写签到标记）。
// 纯函数（signInResultOf/almanacOf/signStateOf）导出供单测直采。
import { CFG } from './cfg.js';
import { request } from './net.js';
import { postForm } from './appapi.js';
import { stat, swallow } from './dbg.js';
import { singleFlight, selfUid } from './ui.js';
import { getSetting } from './settings.js';
import { pad2 } from './timefmt.js';

var FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };

// 本地日期 YYYYMMDD（getSignInInfos 的 signInDate 同格式；与站点同在 +08 使用时区一致）
export function ymdOf(d) {
  d = d || new Date();
  return String(d.getFullYear()) + pad2(d.getMonth() + 1) + pad2(d.getDate());
}

// 签到回包 → 结果。0=成功；122=今日已签到（App 侧按成功处理、bananaDelta=0）；
// -401/401=未登录；其余=失败（21 参数格式错/708 网关等，话术统一）。
export function signInResultOf(j) {
  var r = j && j.result;
  if (r === 0) {
    return {
      ok: true, repeat: false, banana: Number(j.bananaDelta) || 0,
      continuousDays: Number(j.continuousDays) || 0,
      almanac: almanacOf(j), msg: String(j.msg || j.signInSuccessMsg || '')
    };
  }
  if (r === 122) {
    return {
      ok: true, repeat: true, banana: 0, continuousDays: 0,
      almanac: almanacOf(j), msg: String(j.msg || j.error_msg || '今日已签到')
    };
  }
  return {
    ok: false, code: Number(r) || 0,
    kind: (r === -401 || r === 401) ? 'notlogin' : 'other',
    msg: String((j && (j.error_msg || j.msg)) || '')
  };
}

function threeOf(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(function (s) { return typeof s === 'string' && s; }).slice(0, 3);
}

// 黄历回包（updateAlmanacFortune / 实签回包）→ 卡数据。App 判定同口径：fortune 与宜忌任一缺失
// 即不放卡（SignInCalendarHelper 要求 suits/avoids 各 3 项、fortune 非空）。
export function almanacOf(j) {
  var a = j && j.almanac;
  if (!a || typeof a.fortune !== 'string' || !a.fortune) return null;
  var suits = threeOf(a.suits), avoids = threeOf(a.avoids);
  if (!suits.length || !avoids.length) return null;
  return {
    fortune: a.fortune,
    suits: suits,
    avoids: avoids,
    guide: String(a.guideMsg || ''),
    recoGuide: String(a.todayRecoGuideMsg || ''),
    recoId: Number(a.todayRecoResourceId) || 0,
    recoType: Number(a.todayRecoResourceType) || 0
  };
}

// getSignInInfos 回包 → 签到态 + 7 天日历（按钮与 reopen 奖励行共用）。
// signedToday 判定：日历里 signInDate=今天且 hasSignIn=true；无日期命中但有 hasSignedIn 字段时以它为准。
export function signStateOf(j, ymd) {
  if (!j || j.result !== 0) return null;
  var today = ymd || ymdOf();
  var infos = Array.isArray(j.infos) ? j.infos : [];
  var items = [];
  var hit = null;
  for (var i = 0; i < infos.length; i++) {
    var it = infos[i] || {};
    var date = String(it.signInDate || '');
    var item = {
      title: String(it.showTitle || ('第' + (Number(it.continuousDays) || i + 1) + '天')),
      date: date,
      banana: Number(it.bananaDelta) || 0,
      continuousDays: Number(it.continuousDays) || 0,
      signed: it.hasSignIn === true,
      gift: String(it.showTitle || '') === '7日大礼包'
    };
    items.push(item);
    if (date && date === today) hit = item;
  }
  var signedToday = hit ? hit.signed : j.hasSignedIn === true;
  return {
    signedToday: signedToday,
    // 今日奖励：日历条目为 App 档位表（与实签 bananaDelta 对照即知档位是否对齐）
    reward: hit && hit.banana ? hit.banana : null,
    continuousDays: hit ? Number(hit.continuousDays) || 0 : 0,
    cumulativeDays: Number(j.cumulativeDays) || 0,
    items: items
  };
}

// 签到写链：mobile-direct 首选（GM 通道跨域带 Cookie）→ pc-direct 兜底（同源 fetch 写链体例）。
// 未登录(-401)不降级（两条链共用同一 Cookie 会话，降级无意义）；网络/其余错误降级一次。
function pcFallback(prev) {
  return postForm(CFG.api.signInPc, '').then(function (j) {
    var r = signInResultOf(j);
    if (!r.ok) throw r;
    return r;
  }, function (e) {
    if (prev) throw prev;
    throw { ok: false, code: 0, kind: 'other', msg: String((e && e.message) || '') };
  });
}

export function signIn() {
  return request(CFG.api.signInMobile, 'POST', FORM, '').then(function (j) {
    var r = signInResultOf(j);
    if (r.ok) return r;
    if (r.kind === 'notlogin') throw r;
    return pcFallback(r);
  }, function () {
    return pcFallback(null);
  });
}

// 签到查询（今日状态 + 日历）
export function getSignInInfos() {
  return request(CFG.api.signInInfos, 'GET', {}).then(function (j) {
    return signStateOf(j);
  });
}

// 黄历实时拉取（不缓存，用户裁决）
export function fetchAlmanac() {
  return request(CFG.api.almanac, 'POST', FORM, '').then(function (j) {
    var a = almanacOf(j);
    if (!a) {
      stat('sign.almanacFail');
      throw new Error('almanac-empty');
    }
    return a;
  });
}

// 自动签到：进脚本主页触发一次（singleFlight 会话内单飞，失败下一次进页重试）。
// 开关关闭/未登录直接跳过；已签（服务端判定）不发写请求。静默：不 toast、不弹窗。
var autoFlight = singleFlight(function () {
  if (!getSetting('autoSign') || !selfUid()) return Promise.resolve(null);
  return getSignInInfos().then(function (st) {
    if (!st || st.signedToday) return st;
    return signIn().then(function (r) {
      stat('sign.auto');
      if (r.repeat) stat('sign.repeat');
      return r;
    });
  }).catch(function (e) {
    stat('sign.fail');
    swallow(e, 'sign');
    return null;
  });
});

export function tryAutoSign() {
  return autoFlight.get();
}
