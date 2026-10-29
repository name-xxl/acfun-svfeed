// test/cases/relation.js —— harness 场景：关注列表全闭环（0.9.142 建，0.9.289 随对齐原生
// /member/feeds/following 重写我的页段；rail 段两形态不变故原样保留）
// 覆盖：我的页第五 tab「关注列表」（顶栏 select 过滤 + 编辑分组 / 成员行 data 三段+签名 /
// 行内关系钮菜单：特别关注 14 直发 / 取消特别关注 15·取消关注 2 套确认弹层 / 设置分组模态
// regroup 3 / 编辑分组模态：添加 4·校验警示条·保留字·改名 6·删除 5）
//      + rail 关注角标的分组选择层（未关注选组 / 已关注改分组 + 取关）。
// 夹具要点：组表**可变**（建/删/改名都改同一份，getGroups 每次现读）；成员按 groupId 分桶
//（action=9 按组过滤、action=7 全部）；relation/follow 与 relation/group 的 body 全部留档
//（window.__FOLLOW_BODY__/__GROUP_BODY__）——写链正确性只在 body 上可见（mock 不回语义，只回 0）。
// 真机语义口径（写死以防回归，§16）：特别关注=action=14 独立标记不动分组；取消类两键套
// pickpop 确认卡（0.9.292 换族；加特别关注不套——非对称确认）；组名校验=trim 后 /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,8}$/
// +保留名「未分组/特别关注」；「未分组」= id "0"；成员行钮文案 followingStatus 2→已关注/3→特别关注。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['follow-groups'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key,
      TEST = h.TEST, feed = h.feed, firstVideoReady = h.firstVideoReady;
    document.cookie = 'auth_key=42_deadbeef'; // ui.selfUid：auth_key 前缀=uid
    var AV = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    function member(id, name, gid, gname, st, friend) {
      return { userId: id, userName: name, userImg: AV, groupId: gid, groupName: gname,
        fanCountShow: '1.6万', contributeCountShow: '286', followingCountShow: '31',
        signature: '签名' + id, followingStatus: st, isFriend: !!friend };
    }
    var GROUPS = [
      { groupId: '0', groupName: '未分组', followingCount: 1 },
      { groupId: '273464', groupName: '舞', followingCount: 1 },
      { groupId: '281985', groupName: '新组', followingCount: 1 }
    ];
    var MEMBERS = {
      '-1': [member('1001', '甲', '0', '未分组', 2, false), member('1002', '乙', '273464', '舞', 3, true)],
      '0': [member('1001', '甲', '0', '未分组', 2, false)],
      '273464': [member('1002', '乙', '273464', '舞', 3, true)],
      '281985': [member('1003', '丙', '281985', '新组', 2, false)]
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
        window.__FOLLOWS_QUERY__ = String(body);
        var list = MEMBERS[gid] || [];
        return { result: 0, pcursor: 'no_more', totalCount: list.length, friendList: list };
      }
    });

    // ---------- 我的页 → 关注列表 tab ----------
    location.hash = 'svfeed/my';
    rec('fg-view-open', !!(await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null && TEST.call('view') === 'my';
    }, 10000)));
    var tabGroups = q('.acsv-metab[data-tab="groups"]');
    rec('fg-tab', /关注列表/.test(tabGroups ? tabGroups.textContent : ''), tabGroups ? tabGroups.textContent : 'n/a');
    if (tabGroups) tabGroups.click();
    var panel = function () { return q('.acsv-mepanel[data-tab="groups"]'); };
    // 可视断言帮手：取元素中心做命中测试，命中者必须是元素自身或其内部——固定层被更
    // 高层盖住时（DOM 在、看不见）此判据转红（elementFromPoint 对 fixed 层有效）
    var topmost = function (elm) {
      if (!elm) return false;
      var r = elm.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return false;
      var hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 14));
      return elm.contains(hit);
    };
    // 顶栏：select 默认「全部分组」+ 编辑分组钮
    rec('fg-topbar', !!(await waitFor(function () {
      var p = panel();
      return p && p.querySelector('.acsv-flselect') && /全部分组/.test(p.querySelector('.acsv-flselect').textContent)
        && !!p.querySelector('.acsv-fledit');
    }, 8000)));
    // 成员行：2 行；行甲=data 三段+签名+钮「已关注」；行乙（st3）钮「特别关注」
    rec('fg-rows', !!(await waitFor(function () {
      return panel() && panel().querySelectorAll('.acsv-flrow').length === 2;
    }, 8000)));
    rec('fg-row-anatomy', (function () {
      var r0 = panel().querySelectorAll('.acsv-flrow')[0];
      if (!r0) return false;
      var spans = r0.querySelectorAll('.acsv-fldata span');
      var btn = r0.querySelector('.acsv-relbtn');
      return spans.length === 3
        && /关注:31/.test(spans[0].textContent) && /粉丝:1\.6万/.test(spans[1].textContent)
        && /投稿:286/.test(spans[2].textContent)
        && !!r0.querySelector('.acsv-flsign')
        && /已关注/.test(btn.textContent) && !!btn.querySelector('.acsv-flico');
    })(), (panel().querySelector('.acsv-flrow') || {}).textContent);
    rec('fg-row-st3-label', (function () {
      var rows = panel().querySelectorAll('.acsv-flrow');
      return rows.length === 2 && /特别关注/.test(rows[1].querySelector('.acsv-relbtn').textContent);
    })());
    var relbtn = function (idx) {
      var rows = panel().querySelectorAll('.acsv-flrow');
      return rows[idx] ? rows[idx].querySelector('.acsv-relbtn') : null;
    };
    var lastBody = function () {
      var a = window.__FOLLOW_BODY__;
      return a.length ? a[a.length - 1] : '';
    };
    // 菜单（st2 行）：特别关注 / 取消关注 / 设置分组（三串同色无红字——warn 类不该存在）
    if (relbtn(0)) relbtn(0).click();
    rec('fg-menu', !!(await waitFor(function () {
      var mis = document.querySelectorAll('.acsv-relmenu .acsv-flmi');
      return mis.length === 3 && /特别关注/.test(mis[0].textContent)
        && /取消关注/.test(mis[1].textContent) && /设置分组/.test(mis[2].textContent);
    }, 8000)));
    // 特别关注：直发 action=14（无 groupId、无确认层），钮文案原地变「特别关注」
    var mi0 = document.querySelectorAll('.acsv-relmenu .acsv-flmi')[0];
    if (mi0) mi0.click();
    rec('fg-special-body', !!(await waitFor(function () {
      return /toUserId=1001&action=14$/.test(lastBody());
    }, 8000)), lastBody());
    rec('fg-special-label', !!(await waitFor(function () {
      return /特别关注/.test((relbtn(0) || {}).textContent || '');
    }, 8000)), (relbtn(0) || {}).textContent);
    // 取消特别关注：套确认弹层；「取消」纯关闭不发包
    if (relbtn(0)) relbtn(0).click();
    await waitFor(function () { return document.querySelectorAll('.acsv-relmenu .acsv-flmi').length === 3; }, 8000);
    var miUn = Array.from(document.querySelectorAll('.acsv-relmenu .acsv-flmi')).find(function (m) { return /取消特别关注/.test(m.textContent); });
    if (miUn) miUn.click();
    rec('fg-unsp-pcf', !!(await waitFor(function () {
      var pcf = q('.acsv-confirmpop');
      return !!pcf && /是否取消特别关注？/.test(pcf.textContent);
    }, 8000)), (q('.acsv-confirmpop') || {}).textContent);
    var bodies = window.__FOLLOW_BODY__.length;
    var pcfCc = q('.acsv-confirmpop .acsv-pick-cancel');
    if (pcfCc) pcfCc.click();
    rec('fg-unsp-cancel', !!(await waitFor(function () {
      return !q('.acsv-confirmpop') && window.__FOLLOW_BODY__.length === bodies;
    }, 8000)));
    // 「确定」→ action=15（也不带 groupId）→ 钮文案回「已关注」
    if (relbtn(0)) relbtn(0).click();
    await waitFor(function () { return document.querySelectorAll('.acsv-relmenu .acsv-flmi').length === 3; }, 8000);
    miUn = Array.from(document.querySelectorAll('.acsv-relmenu .acsv-flmi')).find(function (m) { return /取消特别关注/.test(m.textContent); });
    if (miUn) miUn.click();
    var pcfOk = q('.acsv-confirmpop .acsv-pick-ok');
    if (pcfOk) pcfOk.click();
    rec('fg-unsp-body', !!(await waitFor(function () {
      return /toUserId=1001&action=15$/.test(lastBody());
    }, 8000)), lastBody());
    rec('fg-unsp-label', !!(await waitFor(function () {
      return /已关注/.test((relbtn(0) || {}).textContent || '');
    }, 8000)), (relbtn(0) || {}).textContent);
    // 设置分组模态：radio 3 档、勾在成员现组（未分组）；选「舞」→ 确定 → action=3
    if (relbtn(0)) relbtn(0).click();
    await waitFor(function () { return document.querySelectorAll('.acsv-relmenu .acsv-flmi').length === 3; }, 8000);
    var miSet = Array.from(document.querySelectorAll('.acsv-relmenu .acsv-flmi')).find(function (m) { return /设置分组/.test(m.textContent); });
    if (miSet) miSet.click();
    rec('fg-group-modal', !!(await waitFor(function () {
      var m = q('.acsv-flm-main');
      if (!m) return false;
      var radios = m.querySelectorAll('.acsv-flm-gi[data-gid]');
      var on = m.querySelector('.acsv-flm-gi.on');
      return topmost(m) && /设置分组/.test(m.textContent) && radios.length === 3
        && !!on && on.getAttribute('data-gid') === '0'
        && !!m.querySelector('.acsv-flm-addin'); // 底部常驻添加行
    }, 8000)), (q('.acsv-flm-main') || {}).textContent);
    // 落位钉：视口垂直居中（0.9.290 报障「定位在顶部」——margin:auto 模式的结果不变式
    // =上距≈下距；容差 24px 吸收列表行数带来的高度差）
    rec('fg-group-center', (function () {
      var m = q('.acsv-flm-main');
      if (!m) return false;
      var r = m.getBoundingClientRect();
      var topGap = r.top, botGap = window.innerHeight - r.bottom;
      return r.height <= window.innerHeight && Math.abs(topGap - botGap) <= 24;
    })(), (function () {
      var r = q('.acsv-flm-main').getBoundingClientRect();
      return 'top=' + Math.round(r.top) + ' bottomGap=' + Math.round(window.innerHeight - r.bottom);
    })());
    var giWu = document.querySelector('.acsv-flm-gi[data-gid="273464"]');
    if (giWu) giWu.click();
    var gmOk = q('.acsv-flm-main .acsv-flm-ok');
    if (gmOk) gmOk.click();
    rec('fg-group-regroup', !!(await waitFor(function () {
      return !q('.acsv-flm-main') && /toUserId=1001&action=3&groupId=273464/.test(lastBody());
    }, 8000)), lastBody());
    // 取消关注：套确认弹层 → 确定 → action=2 → 行摘除
    var before = panel().querySelectorAll('.acsv-flrow').length;
    if (relbtn(1)) relbtn(1).click();
    await waitFor(function () { return document.querySelectorAll('.acsv-relmenu .acsv-flmi').length === 3; }, 8000);
    var miUnf = Array.from(document.querySelectorAll('.acsv-relmenu .acsv-flmi')).find(function (m) { return /取消关注/.test(m.textContent); });
    if (miUnf) miUnf.click();
    var pcfOk2 = q('.acsv-confirmpop .acsv-pick-ok');
    rec('fg-unfollow-pcf', !!pcfOk2 && /是否取消关注？/.test(q('.acsv-confirmpop').textContent));
    if (pcfOk2) pcfOk2.click();
    rec('fg-unfollow', !!(await waitFor(function () {
      return panel().querySelectorAll('.acsv-flrow').length === before - 1
        && /toUserId=1002&action=2(&groupId=)?$/.test(lastBody());
    }, 8000)), 'n=' + panel().querySelectorAll('.acsv-flrow').length + ' b=' + lastBody());
    // 编辑分组模态：未分组不进列表；舞/新组两杠带改名/删除
    var editBtn = panel().querySelector('.acsv-fledit');
    if (editBtn) editBtn.click();
    rec('fg-edit-modal', !!(await waitFor(function () {
      var m = q('.acsv-flm-main');
      if (!m) return false;
      var bars = m.querySelectorAll('.acsv-flm-erow[data-gid]');
      return topmost(m) && /编辑分组/.test(m.textContent) && bars.length === 2
        && bars[0].getAttribute('data-gid') === '273464'
        && !!bars[0].querySelector('.acsv-flm-gop');
    }, 8000)), (q('.acsv-flm-main') || {}).textContent);
    // 添加行：超长 → 顶部警示条（校验失败，不发请求）
    var addIn = q('.acsv-flm-main .acsv-flm-addin');
    if (addIn) {
      addIn.focus();
      addIn.value = '一二三四五六七八九';
    }
    var addOk = q('.acsv-flm-main .acsv-flm-addacts .acsv-flm-sbtn.primary');
    if (addOk) addOk.click();
    rec('fg-add-invalid', !!(await waitFor(function () {
      var w = q('.acsv-flwarn');
      return !!w && topmost(w) && /1~8 个字/.test(w.textContent);
    }, 8000)), (q('.acsv-flwarn') || {}).textContent);
    // 保留字：特别关注 → 警示条
    if (addIn) addIn.value = '特别关注';
    if (addOk) addOk.click();
    rec('fg-add-reserved', !!(await waitFor(function () {
      var w = q('.acsv-flwarn');
      return !!w && /保留名/.test(w.textContent);
    }, 8000)), (q('.acsv-flwarn') || {}).textContent);
    // 合法名：临时组 → action=4 → 新杠出现
    if (addIn) addIn.value = '临时组';
    if (addOk) addOk.click();
    rec('fg-add', !!(await waitFor(function () {
      var m = q('.acsv-flm-main');
      var bar = m && m.querySelector('.acsv-flm-erow[data-gid="281990"]');
      return !!bar && /临时组/.test(bar.textContent);
    }, 8000)), window.__GROUP_BODY__.join(' | '));
    rec('fg-add-body', /action=4&groupName=%E4%B8%B4%E6%97%B6%E7%BB%84/.test(window.__GROUP_BODY__.join('|')),
      window.__GROUP_BODY__.join(' | '));
    // 改名（内联输入条）：舞 → 舞2 → action=6
    var barWu = document.querySelector('.acsv-flm-main .acsv-flm-erow[data-gid="273464"]');
    var rnBtn = barWu && Array.from(barWu.querySelectorAll('.acsv-flm-gop')).find(function (b) { return /改名/.test(b.textContent); });
    if (rnBtn) rnBtn.click();
    var rnIn = q('.acsv-flm-main .acsv-flm-rninput');
    rec('fg-rename-open', !!rnIn && rnIn.value === '舞');
    if (rnIn) rnIn.value = '舞2';
    var rnOk = barWu && Array.from(barWu.querySelectorAll('.acsv-flm-gops .acsv-flm-sbtn.primary')).pop();
    if (rnOk) rnOk.click();
    rec('fg-rename', !!(await waitFor(function () {
      var b = q('.acsv-flm-main .acsv-flm-erow[data-gid="273464"]');
      return !!b && /舞2/.test(b.textContent);
    }, 8000)), window.__GROUP_BODY__.join(' | '));
    rec('fg-rename-body', /groupId=273464&action=6&groupName=%E8%88%9E2/.test(window.__GROUP_BODY__.join('|')),
      window.__GROUP_BODY__.join(' | '));
    // 删除（确认弹层文案含「移至未分组」）→ action=5 → 杠消失
    barWu = document.querySelector('.acsv-flm-main .acsv-flm-erow[data-gid="273464"]');
    var delBtn = barWu && Array.from(barWu.querySelectorAll('.acsv-flm-gop')).find(function (b) { return /删除/.test(b.textContent); });
    if (delBtn) delBtn.click();
    rec('fg-del-pcf', !!(await waitFor(function () {
      var pcf = q('.acsv-confirmpop');
      return !!pcf && /移至未分组/.test(pcf.textContent);
    }, 8000)), (q('.acsv-confirmpop') || {}).textContent);
    var delOk = q('.acsv-confirmpop .acsv-pick-ok');
    if (delOk) delOk.click();
    rec('fg-del', !!(await waitFor(function () {
      var m = q('.acsv-flm-main');
      return !!m && !m.querySelector('.acsv-flm-erow[data-gid="273464"]');
    }, 8000)), window.__GROUP_BODY__.join(' | '));
    rec('fg-del-body', /action=5&groupId=273464/.test(window.__GROUP_BODY__.join('|')),
      window.__GROUP_BODY__.join(' | '));
    // 关编辑模态（确定）；select 下拉含新组「临时组」；点「新组」过滤（action=9 带组 id）
    var editOk = q('.acsv-flm-main .acsv-flm-foot .acsv-flm-ok');
    if (editOk) editOk.click();
    rec('fg-edit-close', !!(await waitFor(function () { return !q('.acsv-flm-main'); }, 8000)));
    if (relbtn(0)) relbtn(0).click(); // 关掉可能开着的行菜单，保持场净
    await waitFor(function () { return !q('.acsv-relmenu'); }, 3000);
    var selBtn = panel().querySelector('.acsv-flselect');
    if (selBtn) selBtn.click();
    rec('fg-select-opts', !!(await waitFor(function () {
      var opts = document.querySelectorAll('.acsv-flmenu .acsv-flopt');
      // 全部分组 / 未分组 / 新组 / 临时组（舞2 已在上一步删除）
      return opts.length === 4 && /全部分组/.test(opts[0].textContent)
        && /未分组/.test(opts[1].textContent) && /临时组/.test(opts[3].textContent);
    }, 8000)), (function () {
      var opts = document.querySelectorAll('.acsv-flmenu .acsv-flopt');
      return [].map.call(opts, function (o) { return o.textContent; }).join('|');
    })());
    var optXin = Array.from(document.querySelectorAll('.acsv-flmenu .acsv-flopt')).find(function (o) { return /新组/.test(o.textContent); });
    if (optXin) optXin.click();
    rec('fg-select-filter', !!(await waitFor(function () {
      return panel().querySelectorAll('.acsv-flrow').length === 1
        && /groupId=281985/.test(window.__FOLLOWS_QUERY__ || '');
    }, 8000)), window.__FOLLOWS_QUERY__ || 'n/a');
    // 组内空态：新组（丙已离去？无——丙在）；切回全部分组恢复 2 行
    var selBtn2 = panel().querySelector('.acsv-flselect');
    if (selBtn2) selBtn2.click();
    await waitFor(function () { return document.querySelectorAll('.acsv-flmenu .acsv-flopt').length === 4; }, 8000);
    var optAll = Array.from(document.querySelectorAll('.acsv-flmenu .acsv-flopt')).find(function (o) { return /全部分组/.test(o.textContent); });
    if (optAll) optAll.click();
    rec('fg-select-all', !!(await waitFor(function () {
      return panel().querySelectorAll('.acsv-flrow').length === 2;
    }, 8000)), (function () {
      var p = panel();
      return 'n=' + p.querySelectorAll('.acsv-flrow').length
        + ' sel=' + ((p.querySelector('.acsv-flselect') || {}).textContent || '')
        + ' menu=' + document.querySelectorAll('.acsv-flmenu').length
        + ' empty=' + ((p.querySelector('.acsv-vempty') || {}).textContent || '')
        + ' q=' + (window.__FOLLOWS_QUERY__ || '');
    })());

    // ---------- rail 关注角标：分组选择层（未关注 → 选组关注；再点 → 改分组 + 取关） ----------
    // 组表复位：编辑模态段动过 GROUPS（删舞2/建临时组），rail 夹具假设干净 3 组（index 语义）
    GROUPS.length = 0;
    GROUPS.push({ groupId: '0', groupName: '未分组', followingCount: 0 },
      { groupId: '273464', groupName: '舞', followingCount: 0 },
      { groupId: '281985', groupName: '新组', followingCount: 0 });
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
    // 选择层定位（0.9.144/0.9.146 裁决在册）：组表堆到 31 项再开层——钉结果不变式：
    // ①弹层整体不越出视口；②垂直分支服从规则（下方可用 < 240 且上方更宽裕 → 必须翻上）；
    // ③高度 <= 所选方向可用空间；④水平整体让开操作栏列（右缘=宿主左缘−10px±2）
    for (var gi = 0; gi < 28; gi++) GROUPS.push({ groupId: '9' + (100 + gi), groupName: '长组' + gi, followingCount: gi });
    q('.acsv-followbtn').click();
    rec('fg-pop-tall', !!(await waitFor(function () {
      var pop = q('.acsv-avwrap .acsv-pickpop');
      return !!pop && pop.querySelectorAll('.acsv-pick-item').length === 31;
    }, 8000)), (function () {
      var pop = q('.acsv-avwrap .acsv-pickpop');
      return 'n=' + (pop ? pop.querySelectorAll('.acsv-pick-item').length : 'n/a');
    })());
    rec('fg-pop-geom', (function () {
      var pop = q('.acsv-avwrap .acsv-pickpop'), b = q('.acsv-followbtn');
      if (!pop || !b) return false;
      var r = pop.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (!(r.top >= 4 && r.left >= 4 && r.bottom <= window.innerHeight - 4 && r.right <= window.innerWidth - 4)) return false;
      var below = window.innerHeight - br.bottom - 6 - 8;
      var above = br.top - 6 - 8;
      var wantFlip = below < 240 && above > below;
      var flipped = r.bottom <= br.top + 1;
      if (wantFlip !== flipped) return false;
      if (!(r.height <= Math.max(wantFlip ? above : below, 120) + 1)) return false;
      var rail = q('.acsv-rail');
      var wrap = b.parentNode;
      var rr = rail ? rail.getBoundingClientRect() : null;
      var wr = wrap ? wrap.getBoundingClientRect() : null;
      if (!rr || !wr) return false;
      if (!(r.right <= rr.left + 0.5)) return false;
      return Math.abs(r.right - (wr.left - 10)) <= 2;
    })(), (function () {
      var pop = q('.acsv-avwrap .acsv-pickpop'), b = q('.acsv-followbtn');
      if (!pop || !b) return 'no-pop';
      var r = pop.getBoundingClientRect(), br = b.getBoundingClientRect();
      var rail2 = q('.acsv-rail');
      return 'pop(t=' + Math.round(r.top) + ',b=' + Math.round(r.bottom) + ',r=' + Math.round(r.right) + ',h=' + Math.round(r.height) + ')'
        + ' railL=' + (rail2 ? Math.round(rail2.getBoundingClientRect().left) : 'n/a')
        + ' wrapL=' + Math.round(br.left - (br.left - b.parentNode.getBoundingClientRect().left)) + '/' + Math.round(b.parentNode.getBoundingClientRect().left)
        + ' vp=' + window.innerWidth;
    })());
    var popX = q('.acsv-avwrap .acsv-pickpop .acsv-pick-x');
    if (popX) popX.click();
  };
})();
