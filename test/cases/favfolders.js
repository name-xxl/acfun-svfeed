// test/cases/favfolders.js —— harness 场景：收藏夹全闭环（0.9.143）
// 覆盖：rail 收藏键的「选择收藏夹」层（多选勾选 / 已藏回显 / 层内新建 / **三分支提交**）
//      + 我的页收藏夹 tab 管理（建夹 / 改名 / 删夹 + 卡面「移动 / 移除收藏」）。
// 夹具：夹表与"该视频在哪些夹"都**可变**（folder/list 带 resourceId 现读 inFolder）；六个写端点
// body 全部留档（window.__FAV_BODY__）——三分支派发（add / updateFolder / remove）只在 body 上可见。
// 真机语义口径（写死防回归）：未收藏默认勾第一个夹（点开即确定≈原一步）；全取消=remove；
// 删夹连带移除仅存于该夹的收藏记录（2026-10-04 隔离实测）。
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};
  C['fav-folders'] = async function (h) {
    var rec = h.rec, q = h.q, wait = h.wait, waitFor = h.waitFor, key = h.key,
      TEST = h.TEST, feed = h.feed, firstVideoReady = h.firstVideoReady;
    document.cookie = 'auth_key=42_deadbeef'; // ui.selfUid：auth_key 前缀=uid
    var FOLDERS = [
      { folderId: '111', name: '默认收藏夹', resourceCount: 2 },
      { folderId: '222', name: '夹二', resourceCount: 1 }
    ];
    var IN = [];   // 目标视频当前所在的夹 id 集（勾选态真值）
    var GONE = []; // 已移除的收藏行 contentId（dougaList 基于它真少行）
    var SEQ = 333;
    window.__FAV_BODY__ = [];
    window.__FAV_NEW__ = []; // 建夹返回的新夹 id（断言用：不硬编码序列）
    window.__ACSV_MOCK_FORM__ = Object.assign({}, window.__ACSV_MY_MOCK__, {
      'favorite/folder/list': function (body) {
        var rid = (String(body).match(/resourceId=(\d+)/) || [])[1];
        return {
          result: 0,
          dataList: FOLDERS.map(function (f) {
            return { folderId: f.folderId, name: f.name, resourceCount: f.resourceCount,
              inFolder: rid ? IN.indexOf(f.folderId) >= 0 : false };
          })
        };
      },
      'favorite/folder/add': function (body) {
        window.__FAV_BODY__.push('addfolder:' + body);
        var name = decodeURIComponent((String(body).match(/name=([^&]*)/) || [])[1] || '');
        if (FOLDERS.some(function (f) { return f.name === name; })) return { result: 1 };
        SEQ++;
        var fid = String(SEQ);
        FOLDERS.push({ folderId: fid, name: name, resourceCount: 0 });
        window.__FAV_NEW__.push(fid);
        return { result: 0, data: { folderId: fid, name: name, resourceCount: 0, inFolder: false } };
      },
      'favorite/folder/update': function (body) {
        window.__FAV_BODY__.push('rename:' + body);
        var b = String(body);
        var fid = (b.match(/folderId=([^&]*)/) || [])[1];
        var name = decodeURIComponent((b.match(/name=([^&]*)/) || [])[1] || '');
        FOLDERS.forEach(function (f) { if (f.folderId === fid) f.name = name; });
        return { result: 0 };
      },
      'favorite/folder/delete': function (body) {
        window.__FAV_BODY__.push('delfolder:' + body);
        var fid = (String(body).match(/folderId=([^&]*)/) || [])[1];
        FOLDERS = FOLDERS.filter(function (f) { return f.folderId !== fid; });
        IN = IN.filter(function (x) { return x !== fid; }); // 连带移除（真机隔离实测语义）
        return { result: 0 };
      },
      'favorite/resource/add': function (body) {
        window.__FAV_BODY__.push('add:' + body);
        var ids = ((String(body).match(/addFolderIds=([^&]*)/) || [])[1] || '').split(',').filter(Boolean);
        ids.forEach(function (id) { if (IN.indexOf(id) < 0) IN.push(id); });
        return { result: 0, failFolderIdList: [] };
      },
      'favorite/resource/updateFolder': function (body) {
        window.__FAV_BODY__.push('update:' + body);
        var b = String(body);
        var add = ((b.match(/addFolderIds=([^&]*)/) || [])[1] || '').split(',').filter(Boolean);
        var del = ((b.match(/delFolderIds=([^&]*)/) || [])[1] || '').split(',').filter(Boolean);
        add.forEach(function (id) { if (IN.indexOf(id) < 0) IN.push(id); });
        IN = IN.filter(function (id) { return del.indexOf(id) < 0; });
        return { result: 0 };
      },
      'favorite/resource/remove': function (body) {
        window.__FAV_BODY__.push('remove:' + body);
        var b = String(body);
        var del = ((b.match(/delFolderIds=([^&]*)/) || [])[1] || '').split(',').filter(Boolean);
        IN = IN.filter(function (id) { return del.indexOf(id) < 0; });
        var rid = (b.match(/resourceId=(\d+)/) || [])[1];
        if (rid && IN.length === 0) { /* 下方 dougaList 按 GONE 真少行 */ }
        if (rid) GONE.push(Number(rid)); // 本场景只有一条目标视频（我的页行）会走这条
        return { result: 0 };
      },
      // 收藏行状态化（不再用 MY_MOCK 的固定行）：被移除的行真消失
      'favorite/resource/dougaList': function (body) {
        var fid = (String(body).match(/folderId=(\d+)/) || [])[1];
        var n = fid === '222' ? 1 : 2;
        var rows = [];
        for (var m = 0; m < n; m++) {
          var cid = 489100 + m;
          if (GONE.indexOf(cid) >= 0) continue;
          rows.push({ contentId: cid, contentTitle: '测试收藏视频' + m, contentImg: '',
            userPlayedSeconds: 65 + m, userName: '收藏UP', userId: 4321,
            contentCreateTime: 1790429958888 });
        }
        return { result: 0, total: rows.length, favoriteList: rows };
      }
    });
    function favBodies(re) {
      return window.__FAV_BODY__.filter(function (b) { return !re || re.test(b); });
    }
    function lastFav() {
      var a = window.__FAV_BODY__;
      return a.length ? a[a.length - 1] : '';
    }

    // ---------- rail 收藏键：选择收藏夹层（未收藏 → add；已收藏 → updateFolder / remove） ----------
    // 入口用**播放层**（play-deep 同款直挂缝）：竖刷默认源是 meow（sv，cap.favorite=false）
    // ——收藏键只在推荐条（home 契约）上才有
    window.__ACSV_MOCK_DIRECT__ = { '488900': 1 };
    location.hash = 'svfeed/play/a/488900';
    rec('ff-play', !!(await waitFor(function () {
      return !!q('.acsv-slide[data-ovl="1"]');
    }, 10000)), location.hash);
    var favBtn = function () {
      return q('.acsv-slide[data-ovl="1"] .acsv-rail-btn[title="收藏"]');
    };
    rec('ff-btn', !!favBtn());
    if (favBtn()) favBtn().click();
    // 未收藏：默认勾第一个夹（requireSelection 生效即"确定"可点），标题「选择收藏夹」
    rec('ff-pop-open', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      if (!pop || pop.querySelectorAll('.acsv-pick-item').length !== 2) return false;
      var its = pop.querySelectorAll('.acsv-pick-item');
      return /选择收藏夹/.test(pop.textContent) && its[0].classList.contains('on')
        && !its[1].classList.contains('on') && !pop.querySelector('.acsv-pick-ok').disabled;
    }, 8000)), (q('.acsv-pickpop') || {}).textContent);
    var ffItems = document.querySelectorAll('.acsv-pickpop .acsv-pick-item');
    if (ffItems[1]) ffItems[1].click(); // 再勾第二个夹（多选）
    var ffOk = q('.acsv-pickpop .acsv-pick-ok');
    if (ffOk) ffOk.click();
    rec('ff-add', !!(await waitFor(function () {
      return !q('.acsv-pickpop') && !!favBtn() && favBtn().classList.contains('on');
    }, 8000)));
    rec('ff-add-body', /^add:resourceId=\d+&resourceType=9&addFolderIds=111,222$/.test(lastFav()), lastFav());
    // 已收藏再点：回显勾选态（两个夹都在）→ 取消其一 = updateFolder 差集
    favBtn().click();
    rec('ff-pop-echo', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      if (!pop || pop.querySelectorAll('.acsv-pick-item').length !== 2) return false;
      var its = pop.querySelectorAll('.acsv-pick-item');
      return /调整收藏夹/.test(pop.textContent) && its[0].classList.contains('on') && its[1].classList.contains('on');
    }, 8000)), (q('.acsv-pickpop') || {}).textContent);
    var eItems = document.querySelectorAll('.acsv-pickpop .acsv-pick-item');
    if (eItems[1]) eItems[1].click();
    var eOk = q('.acsv-pickpop .acsv-pick-ok');
    if (eOk) eOk.click();
    rec('ff-update-done', !!(await waitFor(function () { return !q('.acsv-pickpop'); }, 8000)));
    rec('ff-update-body', /^update:resourceId=\d+&resourceType=9&addFolderIds=&delFolderIds=222$/.test(lastFav()), lastFav());
    rec('ff-still-on', favBtn().classList.contains('on'));
    // 全取消 → remove（移除收藏）
    favBtn().click();
    rec('ff-pop-again', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      return !!pop && pop.querySelectorAll('.acsv-pick-item').length === 2;
    }, 8000)));
    var gItems = document.querySelectorAll('.acsv-pickpop .acsv-pick-item');
    if (gItems[0]) gItems[0].click();
    var gOk = q('.acsv-pickpop .acsv-pick-ok');
    if (gOk) gOk.click();
    rec('ff-remove', !!(await waitFor(function () {
      return !q('.acsv-pickpop') && !!favBtn() && !favBtn().classList.contains('on');
    }, 8000)));
    rec('ff-remove-body', /^remove:resourceId=\d+&resourceType=9&delFolderIds=111$/.test(lastFav()), lastFav());
    // 层内新建夹：新建 → 新夹出现并自动勾选 → 确定 → add 带上新夹
    favBtn().click();
    rec('ff-pop-new', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      return !!pop && !!pop.querySelector('.acsv-pick-newbtn');
    }, 8000)));
    var newBtn = q('.acsv-pickpop .acsv-pick-newbtn');
    if (newBtn) newBtn.click();
    var fInput = q('.acsv-pickpop .acsv-pick-input');
    if (fInput) fInput.value = '临时夹';
    var fAdd = q('.acsv-pickpop .acsv-pick-add');
    if (fAdd) fAdd.click();
    rec('ff-pick-new', !!(await waitFor(function () {
      var pop = q('.acsv-pickpop');
      if (!pop || pop.querySelectorAll('.acsv-pick-item').length !== 3) return false;
      var its = pop.querySelectorAll('.acsv-pick-item');
      // 新建夹已自动勾选（首夹预选也在：未收藏默认勾第一个）
      return its[2].classList.contains('on') && /临时夹/.test(its[2].textContent);
    }, 8000)), (q('.acsv-pickpop') || {}).textContent);
    rec('ff-new-body', /^addfolder:name=%E4%B8%B4%E6%97%B6%E5%A4%B9$/.test(favBodies(/^addfolder:/)[0] || ''),
      window.__FAV_BODY__.join(' | '));
    var nOk = q('.acsv-pickpop .acsv-pick-ok');
    if (nOk) nOk.click();
    rec('ff-new-add', !!(await waitFor(function () {
      return !q('.acsv-pickpop') && favBtn().classList.contains('on');
    }, 8000)));
    rec('ff-new-add-body', (function () {
      var fid = window.__FAV_NEW__[0] || '?';
      // 正则用 RegExp 拼（id 来自夹具记录，不硬编码序列）——`\\d` 双反斜杠勿省
      return new RegExp('^add:resourceId=\\d+&resourceType=9&addFolderIds=111,' + fid + '$').test(lastFav());
    })(), lastFav() + ' new=' + window.__FAV_NEW__.join(','));

    // ---------- 我的页收藏夹 tab：建/改名/删夹 + 卡面 移动/移除收藏 ----------
    location.hash = 'svfeed/my';
    rec('ff-my-open', !!(await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null && TEST.call('view') === 'my';
    }, 10000)));
    var tabs = document.querySelectorAll('.acsv-metab');
    if (tabs[1]) tabs[1].click(); // 收藏夹 tab（顺序：观看历史/收藏夹/关注分组）
    var favPanel = function () { return q('.acsv-mepanel[data-tab="fav"]'); };
    var chipOf = function (txt) {
      var cs = favPanel() ? favPanel().querySelectorAll('.acsv-vchips .acsv-vchip') : [];
      for (var i = 0; i < cs.length; i++) if (cs[i].textContent.indexOf(txt) === 0) return cs[i];
      return null;
    };
    // chips = 默认收藏夹 2 / 夹二 1 / 临时夹 0 / ＋ 新建夹；默认选第一个 + 组头操作
    rec('ff-chips', !!(await waitFor(function () {
      var cs = favPanel() && favPanel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return cs && cs.length === 4 && /默认收藏夹 2/.test(cs[0].textContent) && cs[0].classList.contains('on');
    }, 8000)), (function () {
      var cs = favPanel() && favPanel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return cs ? [].map.call(cs, function (c) { return c.textContent; }).join('|') : 'n/a';
    })());
    rec('ff-ops', (function () {
      var ops = favPanel() && favPanel().querySelector('.acsv-gops');
      return !!ops && /改名/.test(ops.textContent) && /删除收藏夹/.test(ops.textContent);
    })(), (favPanel().querySelector('.acsv-gops') || {}).textContent);
    rec('ff-rows', !!(await waitFor(function () {
      return favPanel().querySelectorAll('.acsv-favcell').length === 2;
    }, 8000)));
    rec('ff-cell-acts', (function () {
      var c = favPanel().querySelector('.acsv-favcell');
      var acts = c && c.querySelector('.acsv-favacts');
      return !!acts && /移动/.test(acts.textContent) && /移除收藏/.test(acts.textContent);
    })());
    // 建夹（内联表单）→ 新 chip 出现且选中（列表切到新夹）
    if (chipOf('＋')) chipOf('＋').click();
    rec('ff-my-form', (function () {
      var f = favPanel().querySelector('.acsv-gform');
      return !!f && f.style.display !== 'none';
    })());
    var fIn2 = favPanel().querySelector('.acsv-ginput');
    if (fIn2) fIn2.value = '新夹子';
    var fOk2 = favPanel().querySelector('.acsv-gok');
    if (fOk2) fOk2.click();
    rec('ff-my-create', !!(await waitFor(function () {
      var c = chipOf('新夹子');
      return !!c && c.classList.contains('on');
    }, 8000)), (function () {
      var cs = favPanel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return [].map.call(cs, function (c) { return c.textContent; }).join('|');
    })());
    rec('ff-my-create-body', /^addfolder:name=%E6%96%B0%E5%A4%B9%E5%AD%90$/.test(favBodies(/^addfolder:/)[1] || ''),
      window.__FAV_BODY__.join(' | '));
    // 改名（内联表单预填旧名 → folder/update）
    var rn2 = favPanel().querySelector('.acsv-gops .acsv-vchip');
    if (rn2) rn2.click();
    var rIn2 = favPanel().querySelector('.acsv-ginput');
    rec('ff-rename-open', !!rIn2 && rIn2.value === '新夹子', rIn2 ? JSON.stringify(rIn2.value) : 'no-input');
    if (rIn2) rIn2.value = '新夹子2';
    var rOk2 = favPanel().querySelector('.acsv-gok');
    if (rOk2) rOk2.click();
    rec('ff-my-rename', !!(await waitFor(function () { return !!chipOf('新夹子2'); }, 8000)), (function () {
      var cs = favPanel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return [].map.call(cs, function (c) { return c.textContent; }).join('|');
    })());
    rec('ff-rename-body', (function () {
      var fid = window.__FAV_NEW__[1] || '?';
      return new RegExp('^rename:folderId=' + fid + '&name=%E6%96%B0%E5%A4%B9%E5%AD%902$')
        .test(favBodies(/^rename:/)[0] || '');
    })(), window.__FAV_BODY__.join(' | ') + ' new=' + window.__FAV_NEW__.join(','));
    // 卡面「移除收藏」：切回默认夹 → 二次确认 → 卡摘除 + remove
    if (chipOf('默认收藏夹')) chipOf('默认收藏夹').click();
    rec('ff-back-default', !!(await waitFor(function () {
      return favPanel().querySelectorAll('.acsv-favcell').length === 2;
    }, 8000)), 'n=' + favPanel().querySelectorAll('.acsv-favcell').length);
    var rmBtn = favPanel().querySelector('.acsv-favcell .acsv-favacts .acsv-vchip:nth-child(2)');
    if (rmBtn) rmBtn.click();
    rec('ff-rm-confirm', (function () {
      var pop = favPanel().querySelector('.acsv-confirmpop');
      return !!pop && /从所有收藏夹移除/.test(pop.textContent);
    })(), (favPanel().querySelector('.acsv-confirmpop') || {}).textContent);
    var rmOk = favPanel().querySelector('.acsv-confirmpop .acsv-pick-ok');
    if (rmOk) rmOk.click();
    rec('ff-rm-done', !!(await waitFor(function () {
      return !favPanel().querySelector('.acsv-confirmpop') && favPanel().querySelectorAll('.acsv-favcell').length === 1;
    }, 8000)), 'n=' + favPanel().querySelectorAll('.acsv-favcell').length);
    rec('ff-rm-body', /^remove:resourceId=\d+&resourceType=9&delFolderIds=111$/.test(lastFav()), lastFav());
    // 删夹（连带移除文案）→ chip 消失
    if (chipOf('新夹子2')) chipOf('新夹子2').click();
    await waitFor(function () { return !!(favPanel().querySelector('.acsv-gops .acsv-gdanger')); }, 8000);
    var delBtn = favPanel().querySelector('.acsv-gops .acsv-gdanger');
    if (delBtn) delBtn.click();
    rec('ff-del-confirm', (function () {
      var pop = favPanel().querySelector('.acsv-confirmpop');
      return !!pop && /一并移除/.test(pop.querySelector('.acsv-confirm-text').textContent);
    })(), (function () {
      var pop = favPanel().querySelector('.acsv-confirmpop');
      return pop ? pop.querySelector('.acsv-confirm-text').textContent : 'no-pop';
    })());
    var dOk = favPanel().querySelector('.acsv-confirmpop .acsv-pick-ok');
    if (dOk) dOk.click();
    rec('ff-del-done', !!(await waitFor(function () {
      return !chipOf('新夹子2') && !chipOf('新夹子');
    }, 8000)), (function () {
      var cs = favPanel().querySelectorAll('.acsv-vchips .acsv-vchip');
      return [].map.call(cs, function (c) { return c.textContent; }).join('|');
    })());
    rec('ff-del-body', (function () {
      var fid = window.__FAV_NEW__[1] || '?';
      return new RegExp('^delfolder:folderId=' + fid + '$').test(favBodies(/^delfolder:/)[0] || '');
    })(), window.__FAV_BODY__.join(' | '));
  };
})();
