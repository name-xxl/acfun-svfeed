// test/cases/relation.js —— harness 场景：关注分组全闭环（0.9.142）
// （同域的收藏夹全闭环（0.9.143）在 cases/favfolders.js）
// 覆盖：我的页第三 tab「关注分组」（chips / 建组 / 改名 / 删组 / 成员列表 / 移组 / 取关）
//      + rail 关注角标的分组选择层（未关注选组 / 已关注改分组 + 取关）+ 两处「新建分组」入口。
// 夹具要点：组表**可变**（建/删/改名都改同一份，getGroups 每次现读）；成员按 groupId 分桶
//（action=9 按组过滤、action=7 全部）；relation/follow 与 relation/group 的 body 全部留档
//（window.__FOLLOW_BODY__/__GROUP_BODY__）——写链正确性只在 body 上可见（mock 不回语义，只回 0）。
// 真机语义口径（写死以防回归）：建组响应带 groupId（优先取它）；已关注改分组=action=3（action=1
// 对已关注用户不改归属）；「未分组」= id "0"；成员行自带 groupId/groupName。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['follow-groups'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key,
      TEST = h.TEST, feed = h.feed, firstVideoReady = h.firstVideoReady;
    document.cookie = 'auth_key=42_deadbeef'; // ui.selfUid：auth_key 前缀=uid
    var AV = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    function member(id, name, gid, gname) {
      return { userId: id, userName: name, userImg: AV, groupId: gid, groupName: gname,
        fanCountShow: '1.6万', contributeCountShow: '286', signature: '签名' + id };
    }
    var GROUPS = [
      { groupId: '0', groupName: '未分组', followingCount: 2 },
      { groupId: '273464', groupName: '舞', followingCount: 1 },
      { groupId: '281985', groupName: '新组', followingCount: 1 }
    ];
    var MEMBERS = {
      '-1': [member('1001', '甲', '0', '未分组'), member('1002', '乙', '273464', '舞')],
      '0': [member('1001', '甲', '0', '未分组')],
      '273464': [member('1002', '乙', '273464', '舞')],
      '281985': [member('1003', '丙', '281985', '新组')]
    };
    window.__FOLLOW_BODY__ = [];
    window.__GROUP_BODY__ = [];
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'relation/getGroups': function () { return { result: 0, groupList: GROUPS }; },
      'relation/group': function (body) {
        var b = String(body);
        window.__GROUP_BODY__.push(b);
        var name = decodeURIComponent((b.match(/groupName=([^&]*)/) || [])[1] || '');
        var gid = (b.match(/groupId=([^&]*)/) || [])[1] || '';
        if (/action=4/.test(b)) {
          if (GROUPS.some(function (g) { return g.groupName === name; })) return { result: 1 };
          GROUPS.push({ groupId: '281990', groupName: name, followingCount: 0 });
          return { result: 0, groupId: '281990' }; // 真机：响应带新 id
        }
        if (/action=5/.test(b)) { GROUPS = GROUPS.filter(function (g) { return g.groupId !== gid; }); return { result: 0 }; }
        if (/action=6/.test(b)) {
          GROUPS.forEach(function (g) { if (g.groupId === gid) g.groupName = name; });
          return { result: 0 };
        }
        return { result: 1 };
      },
      'relation/follow': function (body) {
        window.__FOLLOW_BODY__.push(String(body));
        return { result: 0 };
      },
      'relation/getFollows': function (body) {
        var gid = (String(body).match(/groupId=([^&]*)/) || [])[1] || '-1';
        var list = MEMBERS[gid] || [];
        return { result: 0, pcursor: 'no_more', totalCount: list.length, friendList: list };
      }
    });

    // ---------- 我的页 → 关注分组 tab ----------
    location.hash = 'svfeed/my';
    rec('fg-view-open', !!(await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null && TEST.call('view') === 'my';
    }, 10000)));
    var tabs = document.querySelectorAll('.acsv-metab');
    rec('fg-tab', tabs.length === 3 && /关注分组/.test(tabs[2].textContent),
      'n=' + tabs.length + ' t=' + (tabs[2] ? tabs[2].textContent : 'n/a'));
    if (tabs[2]) tabs[2].click();
    var panel = function () { return q('.acsv-mepanel[data-tab="groups"]'); };
    // 默认「全部」选中：chips = 全部 / 未分组 2 / 舞 1 / 新组 1 / ＋新建分组
    rec('fg-chips', !!(await waitFor(function () {
      var cs = panel() && panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return cs && cs.length === 5 && cs[0].classList.contains('on') && /未分组 2/.test(cs[1].textContent);
    }, 8000)), (function () {
      var cs = panel() && panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return cs ? [].map.call(cs, function (c) { return c.textContent; }).join('|') : 'n/a';
    })());
    // 成员列表（全部）：2 行；行显归属标签（组名来自 getFollows 自带字段）
    rec('fg-rows', !!(await waitFor(function () {
      return panel() && panel().querySelectorAll('.acsv-grow').length === 2;
    }, 8000)));
    rec('fg-row-tag', (function () {
      var rows = panel().querySelectorAll('.acsv-grow');
      return rows.length === 2 && /未分组/.test(rows[0].textContent) && /舞/.test(rows[1].textContent)
        && !!rows[0].querySelector('.acsv-grow-avatar');
    })(), 'r0=' + (panel().querySelector('.acsv-grow') || {}).textContent);
    // 切组：点「舞」→ 1 行；组头操作（改名/删除）出现
    var chipOf = function (txt) {
      var cs = panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      for (var i = 0; i < cs.length; i++) if (cs[i].textContent.indexOf(txt) === 0) return cs[i];
      return null;
    };
    if (chipOf('舞')) chipOf('舞').click();
    rec('fg-group-filter', !!(await waitFor(function () {
      var rows = panel().querySelectorAll('.acsv-grow');
      return rows.length === 1 && /乙/.test(rows[0].textContent);
    }, 8000)), 'n=' + panel().querySelectorAll('.acsv-grow').length);
    rec('fg-ops', (function () {
      var ops = panel().querySelector('.acsv-gops');
      return ops && /改名/.test(ops.textContent) && /删除分组/.test(ops.textContent);
    })(), (panel().querySelector('.acsv-gops') || {}).textContent);
    // 未分组是系统组：不给改名/删除
    if (chipOf('未分组')) chipOf('未分组').click();
    await waitFor(function () {
      return panel().querySelectorAll('.acsv-grow').length === 1;
    }, 8000);
    rec('fg-ops-sys-hidden', !panel().querySelector('.acsv-gops .acsv-vchip'),
      (panel().querySelector('.acsv-gops') || {}).textContent);
    // 建组（内联表单）：＋新建分组 → 输入 → 新建 → 新 chip 出现且自动选中
    if (chipOf('＋')) chipOf('＋').click();
    rec('fg-form-open', (function () {
      var f = panel().querySelector('.acsv-gform');
      return !!f && f.style.display !== 'none' && !!f.querySelector('.acsv-ginput');
    })());
    var ginput = panel().querySelector('.acsv-ginput');
    if (ginput) ginput.value = '临时组';
    var gok = panel().querySelector('.acsv-gok');
    if (gok) gok.click();
    rec('fg-create', !!(await waitFor(function () {
      return /临时组 0/.test((chipOf('临时组') || {}).textContent || '');
    }, 8000)), (function () {
      var cs = panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return [].map.call(cs, function (c) { return c.textContent; }).join('|');
    })());
    rec('fg-create-body', /action=4&groupName=%E4%B8%B4%E6%97%B6%E7%BB%84/.test(window.__GROUP_BODY__.join('|')),
      window.__GROUP_BODY__.join(' | '));
    // 改名：组头「改名」→ 预填旧名 → 提交 → chip 文案更新
    var rnBtn = panel().querySelector('.acsv-gops .acsv-vchip');
    if (rnBtn) rnBtn.click();
    rec('fg-rename-open', (function () {
      var f = panel().querySelector('.acsv-ginput');
      return !!f && f.value === '临时组';
    })(), (function () {
      var f = panel().querySelector('.acsv-ginput');
      return f ? JSON.stringify(f.value) : 'no-input';
    })());
    var rinput = panel().querySelector('.acsv-ginput');
    if (rinput) rinput.value = '临时组2';
    var rOk = panel().querySelector('.acsv-gok');
    if (rOk) rOk.click();
    rec('fg-rename', !!(await waitFor(function () {
      return !!chipOf('临时组2');
    }, 8000)), (function () {
      var cs = panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return [].map.call(cs, function (c) { return c.textContent; }).join('|');
    })());
    // 删组：确认弹（文案含"移到未分组"）→ 确认 → chip 消失、选择回落「全部」
    var del = panel().querySelector('.acsv-gops .acsv-gdanger');
    if (del) del.click();
    rec('fg-del-confirm', (function () {
      var pop = panel().querySelector('.acsv-confirmpop');
      return !!pop && /未分组/.test(pop.querySelector('.acsv-confirm-text').textContent);
    })(), (function () {
      var pop = panel().querySelector('.acsv-confirmpop');
      return pop ? pop.textContent : 'no-pop';
    })());
    var cok = panel().querySelector('.acsv-confirmpop .acsv-pick-ok');
    if (cok) cok.click();
    rec('fg-del', !!(await waitFor(function () {
      return !chipOf('临时组2') && !panel().querySelector('.acsv-confirmpop');
    }, 8000)));
    rec('fg-del-fallback', !!(await waitFor(function () {
      var cs = panel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return cs.length === 5 && cs[0].classList.contains('on');
    }, 8000)));
    // 移组（成员行）：弹「更改分组」——不预选（确定禁用）→ 选「舞」→ 确定 → action=3
    await waitFor(function () { return panel().querySelectorAll('.acsv-grow').length === 2; }, 8000);
    var rowMove = panel().querySelectorAll('.acsv-grow')[0].querySelector('.acsv-vchip');
    if (rowMove) rowMove.click();
    rec('fg-move-pop', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      return !!pop && pop.querySelectorAll('.acsv-pick-item').length === 3
        && /更改分组/.test(pop.textContent) && pop.querySelector('.acsv-pick-ok').disabled
        && !pop.querySelector('.acsv-pick-extra'); // 行内移组不带「取消关注」附加键
    }, 8000)), (q('.acsv-pickpop') || {}).textContent);
    var popItems = document.querySelectorAll('.acsv-pickpop .acsv-pick-item');
    if (popItems[1]) popItems[1].click(); // 舞（0=未分组 1=舞 2=新组）
    var popOk = q('.acsv-pickpop .acsv-pick-ok');
    if (popOk) popOk.click();
    rec('fg-move-done', !!(await waitFor(function () {
      return !q('.acsv-pickpop');
    }, 8000)));
    rec('fg-move-body', /action=3&groupId=273464/.test(window.__FOLLOW_BODY__.join('|')),
      window.__FOLLOW_BODY__.join(' | '));
    rec('fg-move-tag', !!(await waitFor(function () {
      return /舞/.test(panel().querySelectorAll('.acsv-grow')[0].textContent);
    }, 8000)), panel().querySelectorAll('.acsv-grow')[0].textContent);
    // 取关（成员行）：行摘除 + action=2（写链留档只在 body 上可见）
    var lastBody = function () {
      var a = window.__FOLLOW_BODY__;
      return a.length ? a[a.length - 1] : '';
    };
    var beforeUn = panel().querySelectorAll('.acsv-grow').length;
    var rowUn = panel().querySelectorAll('.acsv-grow')[0].querySelectorAll('.acsv-vchip')[1];
    if (rowUn) rowUn.click();
    rec('fg-unfollow', !!(await waitFor(function () {
      return panel().querySelectorAll('.acsv-grow').length === beforeUn - 1;
    }, 8000)), 'n=' + panel().querySelectorAll('.acsv-grow').length);
    rec('fg-unfollow-body', /action=2&groupId=$/.test(lastBody()), lastBody());

    // ---------- rail 关注角标：分组选择层（未关注 → 选组关注；再点 → 改分组 + 取关） ----------
    key('Escape');
    rec('fg-stage', !!(await waitFor(function () {
      return !q('.acsv-view') && !!q('.acsv-followbtn');
    }, 10000)));
    rec('fg-stage-ready', !!(await waitFor(function () { return firstVideoReady(h.cur()); }, 25000)));
    var fb = q('.acsv-followbtn');
    if (fb) fb.click();
    rec('fg-rail-pop', !!(await waitFor(function () {
      var pop = q('.acsv-avwrap .acsv-pickpop');
      if (!pop || pop.querySelectorAll('.acsv-pick-item').length !== 3) return false;
      var on = pop.querySelector('.acsv-pick-item.on');
      return /选择分组/.test(pop.textContent) && !!on && /未分组/.test(on.textContent)
        && !pop.querySelector('.acsv-pick-ok').disabled
        && !pop.querySelector('.acsv-pick-extra'); // 未关注态无「取消关注」键
    }, 8000)), (q('.acsv-avwrap .acsv-pickpop') || {}).textContent);
    var rItems = document.querySelectorAll('.acsv-avwrap .acsv-pickpop .acsv-pick-item');
    if (rItems[2]) rItems[2].click(); // 新组（0=未分组 1=舞 2=新组）
    var rOk = q('.acsv-avwrap .acsv-pickpop .acsv-pick-ok');
    if (rOk) rOk.click();
    rec('fg-rail-follow', !!(await waitFor(function () {
      return !q('.acsv-pickpop') && q('.acsv-followbtn').classList.contains('on');
    }, 8000)), 'class=' + q('.acsv-followbtn').className);
    rec('fg-rail-follow-body', /action=1&groupId=281985/.test(lastBody()), lastBody());
    // 已关注态再点：标题改「更改分组」、无预选（确定禁用）、带「取消关注」键
    q('.acsv-followbtn').click();
    rec('fg-rail-regroup', !!(await waitFor(function () {
      var pop = q('.acsv-avwrap .acsv-pickpop');
      return !!pop && pop.querySelectorAll('.acsv-pick-item').length === 3
        && /更改分组/.test(pop.textContent) && pop.querySelector('.acsv-pick-ok').disabled
        && !!pop.querySelector('.acsv-pick-extra');
    }, 8000)), (q('.acsv-avwrap .acsv-pickpop') || {}).textContent);
    var exBtn = q('.acsv-avwrap .acsv-pickpop .acsv-pick-extra');
    if (exBtn) exBtn.click();
    rec('fg-rail-unfollow', !!(await waitFor(function () {
      return !q('.acsv-pickpop') && !q('.acsv-followbtn').classList.contains('on');
    }, 8000)), 'class=' + q('.acsv-followbtn').className);
    rec('fg-rail-unfollow-body', /action=2&groupId=$/.test(lastBody()), lastBody());
  };
})();
