// ---------- 签到结果的落地动作单源（0.9.324）----------
// 跨面两处：① 我的页资料头按钮的手动签到（mypage.doSign / reopen）② 进脚本主页的自动签到
//（boot home 分支；用户裁决「自动签到成功应该弹出黄历」）。各写一遍＝同形副本且必然漂。
// 依赖方向：本件只 import 视图件（signpanel）/ 域件（signapi）/ 话术件（toastmsg），不反向被它们 import。
import { fetchAlmanac } from './signapi.js';
import { openSignAlmanac } from './signpanel.js';
import { errSignAlmanac } from './toastmsg.js';

// r＝写链结果（可为 null＝「只重拉黄历」那一路，如已签态点按钮）；state＝最近一次 getSignInInfos
// 规整结果（当日档位 reward 作香蕉数兜底——repeat 回包 banana 为 0，此时按档位显示更准，与原实现同口径）。
// 返回 Promise<boolean>：true＝卡弹出来了；false＝没弹（黄历拉取失败走了 toast，或已有卡在位——
// 卡是单实例，见 signpanel；两条路都不抛，调用方的收尾语义由自己定）。
export function popSignAlmanac(r, state) {
  var banana = (r && r.banana) || (state && state.reward != null ? state.reward : null);
  if (r && r.almanac) return Promise.resolve(openSignAlmanac(r.almanac, { banana: banana }));
  return fetchAlmanac().then(function (a) {
    return openSignAlmanac(a, { banana: banana });
  }, function () {
    errSignAlmanac(); // 弹窗本身即成功反馈（不另 toast）；拉不到黄历才 toast
    return false;
  });
}