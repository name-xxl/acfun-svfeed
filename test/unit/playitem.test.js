// playitem.js 播放条目契约单元测试（0.9.162 自 data.test.js 终解拆入，用例逐字保持）：
// 双 normalize（sv/home）+ 作者契约 upOf（0.9.82/0.9.157）+ playItemOf 桥 + homeItemOf +
// deepLinkOf（0.9.72 深链 id 空间判据）。字段值真实性由本文件钉；键白名单闸门在 contract.test.js。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
var { upOf, playItemOf, normalize, normalizeHome, homeItemOf, deepLinkOf } = await import('../../src/playitem.js');

// ---------- 作者契约（0.9.82）：两个 normalize 与面板→播放的桥 ----------
test('normalize/normalizeHome：作者落 up 三件套；user 缺失或无名无 id → up 为 null', () => {
  var sv = normalize({ meowId: 7, meowTitle: 't', user: { userId: 5, name: 'UP', headUrl: '//i/a.jpg' } });
  assert.deepEqual(sv.up, { id: 5, name: 'UP', img: 'https://i/a.jpg', isFollowing: false });
  assert.equal(sv.userName, undefined); // 扁平旧名已退役（禁回流见 contract.test.js）
  assert.equal(sv.head, undefined);

  var hm = normalizeHome({ href: '9', title: 't2', user: { userId: 6, name: 'UP2', headUrl: '//i/b.jpg', isFollowing: true } });
  assert.deepEqual(hm.up, { id: 6, name: 'UP2', img: 'https://i/b.jpg', isFollowing: true });
  assert.equal(hm.isFollowing, undefined); // 关注态随作者一起进 up

  // 作者未知：不再编造 '未知用户' 占位（本次缺陷的文案源头）
  assert.equal(normalize({ meowId: 8, user: {} }).up, null);
  assert.equal(normalizeHome({ href: '10', user: {} }).up, null);
  assert.equal(normalizeHome({ href: '11', user: { name: '   ' } }).up, null); // 空白名不当作作者
});

test('playItemOf：面板条目 → 播放条目，作者只做四件套归一（榜单作者卡扩展字段不带进层）', () => {
  var item = playItemOf({
    acId: 48820714, title: '标题', cover: 'https://i/c.jpg',
    up: { id: 700, name: '榜单UP', img: 'https://i/u.jpg', isFollowing: false, fans: 33235, sign: '签名' }
  });
  assert.equal(item.kind, 'home');
  assert.equal(item.id, 48820714);
  assert.equal(item.title, '标题');
  assert.deepEqual(item.up, { id: 700, name: '榜单UP', img: 'https://i/u.jpg', isFollowing: false });
  assert.equal(item.cap.lazyResolve, true);
  // 面板不带作者（历史）：up 留 null，等 resolve 回填——不再退化成 '未知用户'
  var h = playItemOf({ acId: 1, title: '历史条目', cover: '' });
  assert.equal(h.up, null);
  assert.equal(playItemOf({ acId: 2, title: 't', up: { name: '只有名字' } }).up.name, '只有名字');
});

// ---------- homeItemOf ----------
test('homeItemOf：产出懒解析 home 契约（id/cover 入位，urls 留空待 resolve）', () => {
  var it = homeItemOf(48820714, '标题', 'https://img.example/c.jpg');
  assert.equal(it.kind, 'home');
  assert.equal(it.stype, 3);
  assert.equal(it.id, 48820714);
  assert.equal(it.title, '标题');
  assert.equal(it.cover, 'https://img.example/c.jpg');
  assert.deepEqual(it.urls, []);
  assert.equal(it.cap.lazyResolve, true);
  assert.equal(it.resolving, false);
  assert.equal(it.up, null); // 面板条目建造时无作者（0.9.82：null 而非 '未知用户' 占位）
});

// ---------- deepLinkOf（0.9.72 深链 id 空间判据） ----------
test('deepLinkOf：meow 命中（有直链）→ sv 源，原样置顶', () => {
  var meow = { kind: 'sv', id: 48820714, urls: ['https://v.example/a.mp4'] };
  var hit = deepLinkOf(meow, null, '48820714');
  assert.equal(hit.source, 'sv');
  assert.equal(hit.item, meow); // 同一对象，不做拷贝（置顶即入缓冲）
});

test('deepLinkOf：meow 无直链不算命中（sv 直链随详情下发，空即不可播）', () => {
  assert.equal(deepLinkOf({ kind: 'sv', id: 1, urls: [] }, null, '1'), null);
});

test('deepLinkOf：meow 未命中 → 回落 ac（douga 详情）并造懒解析 home 条目', () => {
  var hit = deepLinkOf(null, { result: 0, videoList: [{ id: 'v1' }], title: '标题', coverUrl: 'https://i/c.jpg' }, '42455525');
  assert.equal(hit.source, 'home');
  assert.equal(hit.item.kind, 'home');
  assert.equal(hit.item.id, 42455525); // id 取请求用的 acId（resolve 要用它回查）
  assert.equal(hit.item.title, '标题');
  assert.equal(hit.item.cover, 'https://i/c.jpg');
  assert.deepEqual(hit.item.urls, []); // 直链留给懒解析链补
  assert.equal(hit.item.cap.lazyResolve, true);
});

test('deepLinkOf：meow 与 ac 双命中时 meow 优先（裸链接探测的优先级基准）', () => {
  var meow = { kind: 'sv', id: 7, urls: ['https://v.example/a.mp4'] };
  var douga = { result: 0, videoList: [{ id: 'v1' }], title: 'ac 标题' };
  assert.equal(deepLinkOf(meow, douga, '7').source, 'sv');
});

test('deepLinkOf：douga 形态不合格一律未命中（result≠0 / videoList 空 / 无回包）', () => {
  assert.equal(deepLinkOf(null, { result: 1, videoList: [{ id: 'v1' }] }, '1'), null);
  assert.equal(deepLinkOf(null, { result: 0, videoList: [] }, '1'), null);
  assert.equal(deepLinkOf(null, { result: 0 }, '1'), null);
  assert.equal(deepLinkOf(null, null, '1'), null);
  assert.equal(deepLinkOf(null, undefined, '1'), null);
});

// ---------- 名字三色体系（0.9.157）：upOf 第 5 参 + 各源透传 ----------
test('upOf：第 5 参才挂 nameColor（play 侧四处沿用 4 参调用——契约④四件套不受影响）', () => {
  var four = upOf(7, '李四', 'h.png', true);
  assert.equal('nameColor' in four, false, '4 参调用不得挂 nameColor');
  assert.equal(upOf(7, '李四', 'h.png', true, 2).nameColor, 2);
  assert.equal(upOf(7, '李四', 'h.png', true, undefined).nameColor, 0); // 显式传位（缺值）= 挂 0
  assert.equal(upOf(7, '李四', 'h.png', true, '1').nameColor, 1); // 字符串也认（真机数字/串并存）
  // 播放侧桥：始终重建四件套（等级色是面板/卡面语义，不进播放契约）
  var item = playItemOf({ acId: 1, title: 't', up: { id: 5, name: 'u', img: 'i', isFollowing: false, nameColor: 2 } });
  assert.deepEqual(Object.keys(item.up).sort(), ['id', 'img', 'isFollowing', 'name']);
});
