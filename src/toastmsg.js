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

// 通用写链失败话术的**串本体**（0.9.307 卫生扫描批）：pickpop 选择层把失败写进层内 hint
// （非 toast 弹层），与 errNotLogin 同串共源——改话术仍只动本件
export var FAIL_NOTLOGIN_TEXT = '操作失败（未登录？）';

// 通用写链失败：未登录态的统一口径（comments/momentbar/mypage 同串三处）
export function errNotLogin() {
  toast(FAIL_NOTLOGIN_TEXT);
}

// 投蕉失败（momentbar / 数量层同口径）
export function errBanana() {
  toast('投蕉失败（未登录或今日已投完？）');
}

// 已投过蕉（rail 与 momentbar 同串两处；投蕉不可取消，点开只提示）。
// 0.9.288 原生取证（api-research §15.4）：isThrowBanana 是持久标记、弹层永久断——
// 旧尾缀「明天再来~」暗示按天重置，无实测依据，删
export function errBananaThrown() {
  toast('已经投过蕉啦');
}

// 私信域登录门槛（imdrawer 两处）
export function errImLogin() {
  toast('私信需要先登录 AcFun 账号');
}

// 私信连接失败（0.9.307 卫生扫描批：imchat/imlist/sharepanel 三处行内 tip 同串共源——
// tip 不是 toast，导串本体）
export var IM_CONN_TEXT = '私信连接失败，请稍后再试\n可先复制链接去站内分享';

// 发送失败前缀族（imsendui 两处 + sharepanel 一处拼装头；详情串各调用方自拼）
export var SEND_FAIL_PREFIX = '发送失败：';

// 关注写链回显（0.9.307 收口：grouppop/followadmin/searchview 五处同式）
export function okFollow(name) {
  toast('已关注 @' + (name || ''));
}
export function okUnfollow(name) {
  toast('已取消关注 @' + (name || ''));
}

// 改名成功（meadmin 管理模态家族：分组/收藏夹两域同话术，0.9.307 收口）
export function okRenamed(name) {
  toast('已改名：' + name);
}

// 稍后再看（controls 时钟钮与 mytabs 移除行同话术，0.9.307 收口）
export function okWaitingAdd() { toast('已加入稍后再看'); }
export function okWaitingRemove() { toast('已移出稍后再看'); }

// 竖刷/播放层错误盒主话术（slide 常驻结构件与 playlayer 运行盒同串，0.9.307 收口；
// playlayer 的「（网络不可达）」变体在本串上追加）
export var VIDEO_FAIL_TEXT = '视频加载失败';

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

// 签到域（0.9.277）：写链双通道均失败 / 未登录 / 黄历拉取失败。成功反馈=黄历弹窗本身，不出 toast
export function errSignLogin() {
  toast('登录后才能签到');
}

export function errSignFail() {
  toast('签到失败，请稍后重试');
}

export function errSignAlmanac() {
  toast('黄历拉取失败，请稍后再试');
}
