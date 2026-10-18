// signapi.js 单测（0.9.277）：签到回包/黄历回包/签到态规整——纯函数直采，零网络。
// 契约依据 docs/api-research.md §10.17（2026-10-18 真机实测回包为样本）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.location = { href: 'https://www.acfun.cn/', pathname: '/' };
var { signInResultOf, almanacOf, signStateOf, ymdOf } = await import('../../src/signapi.js');

// 实测样本（§10.17）：updateAlmanacFortune 回包
var ALM = {
  result: 0,
  almanac: {
    fortune: '大吉',
    suits: ['深夜看恐怖片', '一个人看电影', '在家抠脚'],
    avoids: ['开车太快', '裸奔', '同事婚礼喝醉'],
    guideMsg: '听说分享还会有惊喜...',
    todayRecoGuideMsg: '要对推荐的片有敬畏心',
    todayRecoResourceId: '48914497',
    todayRecoResourceType: 2
  }
};

// 实测样本（§10.17）：getSignInInfos 回包
var INFOS = {
  result: 0,
  cumulativeDays: 1145,
  bananaDelta: 6,
  continuousMsg: '已连续签到4天',
  infos: [
    { continuousDays: 1, showTitle: '第1天', bananaDelta: '6', signInDate: '20261015', hasSignIn: true },
    { continuousDays: 2, showTitle: '第2天', bananaDelta: '10', signInDate: '20261016', hasSignIn: true },
    { continuousDays: 3, showTitle: '第3天', bananaDelta: '12', signInDate: '20261017', hasSignIn: true },
    { continuousDays: 4, showTitle: '第4天', bananaDelta: '6', signInDate: '20261018', hasSignIn: true },
    { continuousDays: 5, showTitle: '第5天', bananaDelta: '6', signInDate: '20261019', hasSignIn: false },
    { continuousDays: 6, showTitle: '第6天', bananaDelta: '8', signInDate: '20261020', hasSignIn: false },
    { continuousDays: 7, showTitle: '7日大礼包', signInDate: '20261021', hasSignIn: false }
  ]
};

test('ymdOf：本地日期 YYYYMMDD（星期/时区不参与）', () => {
  assert.equal(ymdOf(new Date(2026, 9, 18)), '20261018');
  assert.equal(ymdOf(new Date(2026, 0, 5)), '20260105');
});

test('signInResultOf：0=成功（bananaDelta/continuousDays/almanac 带出）', () => {
  var r = signInResultOf({ result: 0, bananaDelta: 6, continuousDays: 4, msg: '', almanac: ALM.almanac });
  assert.equal(r.ok, true);
  assert.equal(r.repeat, false);
  assert.equal(r.banana, 6);
  assert.equal(r.continuousDays, 4);
  assert.equal(r.almanac.fortune, '大吉');
});

test('signInResultOf：122=今日已签到（App 侧按成功处理、bananaDelta=0）', () => {
  var r = signInResultOf({ result: 122, msg: '今日已签到', error_msg: '今日已签到' });
  assert.equal(r.ok, true);
  assert.equal(r.repeat, true);
  assert.equal(r.banana, 0);
  assert.equal(r.almanac, null);
});

test('signInResultOf：-401=未登录；21/708 等=普通失败', () => {
  assert.equal(signInResultOf({ result: -401, error_msg: 'user not login' }).kind, 'notlogin');
  assert.equal(signInResultOf({ result: 21, error_msg: '参数格式错误' }).kind, 'other');
  assert.equal(signInResultOf({ result: 708 }).ok, false);
  assert.equal(signInResultOf(null).ok, false);
});

test('almanacOf：实测样本全字段映射；缺 fortune/宜忌即 null（App 放卡判定同口径）', () => {
  var a = almanacOf(ALM);
  assert.deepEqual(a.suits, ['深夜看恐怖片', '一个人看电影', '在家抠脚']);
  assert.deepEqual(a.avoids, ['开车太快', '裸奔', '同事婚礼喝醉']);
  assert.equal(a.guide, '听说分享还会有惊喜...');
  assert.equal(a.recoId, 48914497);
  assert.equal(a.recoType, 2);
  assert.equal(almanacOf({ result: 0 }), null);
  assert.equal(almanacOf({ result: 0, almanac: { fortune: '大吉' } }), null);
  assert.equal(almanacOf({ result: 0, almanac: { fortune: '', suits: ['a'], avoids: ['b'] } }), null);
});

test('signStateOf：今日命中 → signedToday + 当日档位奖励；未来日为未签', () => {
  var st = signStateOf(INFOS, '20261018');
  assert.equal(st.signedToday, true);
  assert.equal(st.reward, 6);
  assert.equal(st.continuousDays, 4);
  assert.equal(st.cumulativeDays, 1145);
  assert.equal(st.items.length, 7);
  assert.equal(st.items[6].gift, true);
  // 次日（20261019）未签：不因「今天存在且 hasSignIn=false」误判已签
  var st2 = signStateOf(INFOS, '20261019');
  assert.equal(st2.signedToday, false);
  assert.equal(st2.reward, 6); // 该日档位（对照实签回包用）
});

test('signStateOf：非 0 / 空回包 → null（调用方保持原按钮态）', () => {
  assert.equal(signStateOf({ result: -401 }), null);
  assert.equal(signStateOf(null), null);
  var st = signStateOf({ result: 0 }, '20261018');
  assert.equal(st.signedToday, false);
  assert.equal(st.reward, null);
});
