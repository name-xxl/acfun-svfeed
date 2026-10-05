// relationapi.js 回包规整单元测试（0.9.159 域归域自 data.test.js 迁入，用例逐字保持）：
// groupListOf / followListPageOf / newGroupIdOf（0.9.142，字段样本为 2026-10-04 真机抓包）
// ——纯函数直采，Node 内置 test 运行器，零网络。
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.__ACSV_DEBUG__ = false;
globalThis.addEventListener = function () { };
globalThis.removeEventListener = function () { };
globalThis.localStorage = {
  getItem: function () { return null; },
  setItem: function () { },
  removeItem: function () { }
};
globalThis.document = {
  addEventListener: function () { },
  removeEventListener: function () { },
  hidden: false,
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { style: {}, setAttribute: function () { }, appendChild: function () { } };
  }
};
var { groupListOf, followListPageOf, newGroupIdOf } = await import('../../src/relationapi.js');

// ---------- 关注分组契约（0.9.142；字段样本为 2026-10-04 真机抓包） ----------
test('groupListOf：真机形状 {groupId,groupName,followingCount} → {id,name,count}；id 字符串、「未分组」= id "0"', () => {
  var gs = groupListOf({
    result: 0,
    groupList: [
      { groupId: '0', groupName: '未分组', followingCount: 14, followingCountShow: '14' },
      { groupId: 273464, groupName: '舞', followingCount: 8, followingCountShow: '8' },
      { groupId: '', groupName: '脏项', followingCount: 1 }, // 无 id 丢弃
      { groupId: '9', groupName: '无计数', followingCount: null }
    ]
  });
  assert.equal(gs.length, 3);
  assert.deepEqual(gs[0], { id: '0', name: '未分组', count: 14 });
  assert.equal(gs[1].id, '273464'); // 数字回显也归一成字符串
  assert.equal(gs[2].count, null);  // 缺计数不编 0
  assert.deepEqual(groupListOf(null), []);
});

test('followListPageOf：成员字段落位（头像读序 userImg → userHeadImgInfo）+ 自带分组归属', () => {
  var p = followListPageOf({
    result: 0, pcursor: '20', totalCount: 91,
    friendList: [
      { userId: '12229455', userName: '一只芸喵喵', userImg: 'https://x/a.jpg',
        signature: '签名', fanCountShow: '1.6万', contributeCountShow: '286',
        groupId: '273464', groupName: '舞' },
      { userId: '2', userName: '乙', userHeadImgInfo: { thumbnailImageCdnUrl: 'https://x/b.jpg' } },
      { userName: '无 id 丢弃' }
    ]
  });
  assert.equal(p.items.length, 2);
  assert.equal(p.items[0].id, '12229455');
  assert.equal(p.items[0].head, 'https://x/a.jpg');
  assert.equal(p.items[0].fans, '1.6万');
  assert.equal(p.items[0].groupId, '273464');
  assert.equal(p.items[0].groupName, '舞');
  assert.equal(p.items[1].head, 'https://x/b.jpg'); // 回落对象形状
  assert.equal(p.nextCursor, '20');
  assert.equal(p.total, 91);
  assert.equal(p.noMore, false);
});

test('followListPageOf：终值 pcursor="no_more" 与空页判到底（真机末页形态）', () => {
  var last = followListPageOf({ result: 0, pcursor: 'no_more', totalCount: 14, friendList: [{ userId: '1' }] });
  assert.equal(last.noMore, true);
  assert.equal(last.nextCursor, ''); // 终值不递交（防把 no_more 当偏移量发回去）
  var empty = followListPageOf({ result: 0, pcursor: '40', friendList: [] });
  assert.equal(empty.noMore, true);
});

test('newGroupIdOf：差集定位新组；同名已存在则返回空（建组响应不带 id 时的兜底）', () => {
  var before = ['0', '273464'];
  var after = [{ id: '0', name: '未分组' }, { id: '281985', name: '临时验证组' }, { id: '273464', name: '舞' }];
  assert.equal(newGroupIdOf(before, after, '临时验证组'), '281985');
  assert.equal(newGroupIdOf(before, after, '不存在'), '');
  // 同名组本就存在（两项同名、都不是新 id）→ 空（调用方按重名提示）
  assert.equal(newGroupIdOf(['0', '5'], [{ id: '5', name: '同名' }], '同名'), '');
});
