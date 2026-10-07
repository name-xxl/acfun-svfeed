// ---------- 用户提示话术单源（0.9.212 批⑧，0.9.209 工程评估第⑧条） ----------
// 出口仍走 ui.toast（toast 原语与其样式不动）；这里收的是**重复话术与动态拼装**：
//   · 同串多处（未登录失败/投蕉失败/私信登录门槛/超限提示）改键名调用——改话术只动这里，
//     不再全仓 grep 字符串；
//   · 「XX发送失败：msg/（未登录？）」一族拼装（评论/弹幕同构两处）收一个构造器；
//   · 长驻时长口径 = CFG.time.toastLong（原 imdrawer 两处裸 8000）。
// 一次性、上下文强耦合的提示（「清晰度：1080P」「连播已开启」等状态回显）**有意不进来**
// ——映射表化是负价值；判定口径：同一话术出现 ≥2 处或同构拼装 ≥2 处才收编。
// 零 DOM 依赖（只经 ui.toast 出口 + cfg 常量），文案内容不改（0.9.212 纪律：只收出口）。
import { toast } from './ui.js';
import { CFG } from './cfg.js';

// 通用写链失败：未登录态的统一口径（comments/momentbar/mypage 同串三处）
export function errNotLogin() {
  toast('操作失败（未登录？）');
}

// 投蕉失败（banpop 同串两处）
export function errBanana() {
  toast('投蕉失败（未登录或今日已投完？）');
}

// 私信域登录门槛（imdrawer 两处）
export function errImLogin() {
  toast('私信需要先登录 AcFun 账号');
}

// 图片超限（comments/imdrawer 两处，上限值各自域不同——传计算好的 MB 数）
export function errImgTooBig(mb) {
  toast('图片不能超过 ' + mb + 'MB');
}

// 「XX发送失败：服务端 msg（缺省=未登录提示）」一族（comments 发评论/弹幕 发弹幕同构）
export function errSend(what, r) {
  toast(what + '发送失败' + (r && r.msg ? '：' + r.msg : '（未登录？）'));
}

// 长驻失败提示（带动态归因详情，用户要时间读——imdrawer 两处；时长口径收 CFG.time.toastLong）
export function errLong(msg) {
  toast(msg, CFG.time.toastLong);
}
