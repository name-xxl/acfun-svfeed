// test/cases/ip.js —— harness 场景：评论 IP 属地（0.9.245，Web-IP 吸收批次①）
// 机制：跟随关注视图行内评论宿主（comment-fail 同款入口：hash=follow → 行「评论」键就地展开）；
// 定向桩两个——'comment/list'（三根评论 + 一楼中楼，四 uid）+ 'user/userInfo'（带计数：9001 有
// 属地「广东」/9002 空串/9003 rejected 造网络错/9004 楼中楼「北京」）。
//   ip-tags：**视口内回填门控**（0.9.247，广场同款：滚离视口不查询 → 滚回才发、四条串行）+ 标签
//     落地（**同一 DOM 节点**不变式：item 引用渲染期捕获，标签必须长在它里面）+ meta 末尾落位 +
//     三行 tooltip（Web-IP 文案）+ 空属地/失败不渲染 + 楼中楼同显 +
//     收起重开：命中同步上屏 + 四种缓存各自复用（计数不涨）
//   ip-tags-off：bundle 前预置 acsv.s.ipShow=false（harness.html 场景预处理）→ 零查询、零标签
// 新增场景记得同步 run-harness.mjs 的 HARNESS_CASES（test/check-cases.mjs 双向校验）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  function stubOf(calls) {
    return Object.assign({}, window.__ACSV_MY_MOCK__, {
      'user/userInfo': function (body, url) {
        var uid = (String(url).match(/userId=(\d+)/) || [])[1];
        if (uid) calls[uid] = (calls[uid] || 0) + 1;
        if (uid === '9001') return { result: 0, profile: { ipLocation: '广东', name: '甲' } };
        if (uid === '9002') return { result: 0, profile: { ipLocation: '' } };   // 无属地 → 负缓存
        if (uid === '9003') return Promise.reject(new Error('boom'));            // 网络错 → 瞬时负缓存
        if (uid === '9004') return { result: 0, profile: { ipLocation: '北京', name: '丁' } }; // 楼中楼
        return { result: 0, profile: {} };
      },
      'comment/list': function () {
        return { result: 0, commentCount: 3, curPage: 1, totalPage: 1, pcursor: 'no_more', hotComments: [],
          rootComments: [
            { commentId: 'ip1', userId: 9001, userName: '甲', headUrl: '', content: '有属地', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0 },
            { commentId: 'ip2', userId: 9002, userName: '乙', headUrl: '', content: '无属地', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0 },
            { commentId: 'ip3', userId: 9003, userName: '丙', headUrl: '', content: '查询失败', postDate: '1分钟前', likeCount: 0, isLike: false, subCommentCount: 0 }
          ],
          // 楼中楼（预览 ⑤：子评论 meta 同显属地——opts.ipTag 透传路径）
          subCommentsMap: { ip1: [{ commentId: 'ip1-1', userId: 9004, userName: '丁', headUrl: '', content: '楼中楼也显', postDate: '刚刚', likeCount: 0, subCommentCount: 0 }] } };
      }
    });
  }

  // 根评论节点（注释：楼中楼会嵌套 .acsv-citem，取直属子级才是根）
  function rootsOf(box) { return box.querySelectorAll('.acsv-frow-cmtlist > .acsv-citem'); }

  // 关注视图行内评论区打开（comment-fail 同款流程），返回 { row, box } 或 null。
  // scrollAway：点开评论后**同步把视图滚到底**——把评论区推离视口，用于验证视口内回填门控
  async function openRowInline(h, scrollAway) {
    var waitFor = h.waitFor, q = h.q;
    location.hash = 'svfeed/follow';
    var viewOk = await waitFor(function () {
      var v = q('.acsv-view');
      return v && v.offsetParent !== null;
    }, 10000);
    if (!viewOk) return null;
    var mRow = null;
    await waitFor(function () {
      var rows = document.querySelectorAll('.acsv-mewrap .acsv-frow');
      for (var i = 0; i < rows.length; i++) {
        if (/动态正文带 UBB/.test(rows[i].textContent)) { mRow = rows[i]; return true; }
      }
      return false;
    }, 8000);
    if (!mRow) return null;
    var acts = mRow.querySelectorAll('.acsv-fact');
    if (acts[1]) acts[1].click(); // 评论键 → 行内展开
    if (scrollAway) { var vb = q('.acsv-view-body'); if (vb) vb.scrollTop = vb.scrollHeight; }
    var box = await waitFor(function () {
      var b = mRow.querySelector('.acsv-frow-cmts');
      return b && rootsOf(b).length === 3 ? b : null;
    }, 8000);
    return box ? { row: mRow, box: box } : null;
  }

  C['ip-tags'] = async function (h) {
    var rec = h.rec, waitFor = h.waitFor, wait = h.wait;
    var calls = {};
    window.__ACSV_MOCK_FORM__ = stubOf(calls);
    delete window.__ACSV_MOCK__; // 走定向桩（comment-fail 同款处置）
    var hs = await openRowInline(h, true); // 打开即滚离视口（视口门控验证）
    rec('iph-open', !!hs);
    if (!hs) return;
    var items = rootsOf(hs.box);
    var item1 = items[0], item2 = items[1], item3 = items[2]; // 渲染期捕获：后面对「同一节点」断言
    // 视口门控（0.9.247，广场同款）：评论区已滚离视口 → **不得发起任何查询**（等一拍，计数全空）
    await wait(500);
    rec('iph-viewport-gate', !calls['9001'] && !calls['9002'] && !calls['9003'] && !calls['9004'],
      'calls=' + JSON.stringify(calls) + ' boxTop=' + Math.round(hs.box.getBoundingClientRect().top));
    // 滚回评论区 → 进视口才排队。两段滚动都是必需的：①居中整盒——前三件进**内层列表**的可见带
    //（`.acsv-frow-cmtlist` 是 max-height:420 的独立滚动区；IO 的相交按祖先裁剪盒算，件被内层
    // 列表裁掉就不算「在视口内」——本用例首跑正是栽在这 7px 裁切上，diag 实锤）；
    // ②再滚第三件进带（内层列表跟着滚）
    hs.box.scrollIntoView({ block: 'center' });
    await wait(250);
    item3.scrollIntoView({ block: 'nearest' });
    rec('iph-queried', !!(await waitFor(function () {
      return calls['9001'] >= 1 && calls['9002'] >= 1 && calls['9003'] >= 1 && calls['9004'] >= 1;
    }, 8000)), JSON.stringify(calls));
    // 有属地：回填标签落地，且长在**捕获的那个 item 节点**里面
    rec('iph-tag', !!(await waitFor(function () { return item1.querySelector('.acsv-cip'); }, 8000)));
    rec('iph-same-node', !!(item1.isConnected && item1.querySelector('.acsv-cip')
      && item1.querySelector('.acsv-cip').textContent === '广东'));
    // 落位：meta 行末尾（预览 ① 定稿——无设备件时排在转发之后）
    rec('iph-meta-last', (function () {
      var meta = item1.querySelector('.acsv-cmeta'), tag = meta && meta.querySelector('.acsv-cip');
      return !!(meta && tag && meta.lastElementChild === tag);
    })());
    // tooltip 三行（Web-IP 文案同款）
    rec('iph-tip', (function () {
      var t = (item1.querySelector('.acsv-cip') || {}).title || '';
      return t.indexOf('IP属地：广东') === 0
        && t.indexOf('（基于用户主页实时资料，不代表发布时的IP）') > 0
        && t.indexOf('查询于：') > 0;
    })());
    // 空属地 / 网络失败：铁律「没有属地就不上标签」（等三发回包 + 一拍再断言）
    await wait(300);
    rec('iph-empty-none', !item2.querySelector('.acsv-cip'));
    rec('iph-fail-none', !item3.querySelector('.acsv-cip'));
    // 楼中楼同显（预览 ⑤）：子评论标签随 opts.ipTag 透传路径落地
    rec('iph-sub-tag', !!(await waitFor(function () {
      var t = item1.querySelector('.acsv-csub .acsv-cip');
      return t && t.textContent === '北京';
    }, 8000)));
    // 复审①（0.9.254）：点**首次异步回填**的标签（后段缓存上屏标签之外的另一条路径）——
    // 资料卡必须带该 uid（病灶：armQuery 回填回调漏传第 4 参 ⇒ data-acsv-uid="undefined"）
    var asyncTag = item1.querySelector('.acsv-cmeta .acsv-cip');
    if (asyncTag) {
      asyncTag.click();
      var maskA = await waitFor(function () { return document.querySelector('.acsv-np-mask'); }, 3000);
      rec('iph-async-panel-open', !!(maskA && maskA.querySelector('.acsv-np.dark')));
      rec('iph-async-panel-card', (function () {
        var card = maskA && maskA.querySelector('.acsv-np-card');
        if (!card) return false;
        var t = card.textContent;
        return t.indexOf('甲') >= 0 && t.indexOf('9001') >= 0 && t.indexOf('广东') >= 0;
      })(), (maskA && maskA.querySelector('.acsv-np-card')) ? maskA.querySelector('.acsv-np-card').textContent : 'none');
      // Esc 只关面板：浮层栈 modal（natpanel 注册）单点关栈顶——底层 'view' 层与行内评论盒
      // 必须原样存活（0.9.254 复审连带修为：此前 Esc 会顺着栈把订阅视图一起关掉回竖刷）。
      // hash 钉法：closeView()（views.js:107）关视图即把 hash 改回裸 #svfeed——视图若被连带
      // 关闭，hash 同步已变（hashchange 事件虽延迟，赋值是同步的），此处当场判得出来
      h.key('Escape');
      rec('iph-esc-panel-only', !!(await waitFor(function () { return !document.querySelector('.acsv-np-mask'); }, 3000)
        && hs.box.isConnected && rootsOf(hs.box).length === 3
        && location.hash === '#svfeed/follow'), 'hash=' + location.hash + ' boxAlive=' + hs.box.isConnected);
    }
    // 收起 → 重开：新渲染走缓存——正面同步上屏、三种负面静默，计数不涨
    var acts = hs.row.querySelectorAll('.acsv-fact');
    acts[1].click(); // 收起
    await waitFor(function () { return !hs.row.querySelector('.acsv-frow-cmts'); }, 3000);
    acts[1].click(); // 重开
    var box2 = await waitFor(function () {
      var b = hs.row.querySelector('.acsv-frow-cmts');
      return b && rootsOf(b).length === 3 ? b : null;
    }, 8000);
    rec('iph-reopen', !!box2);
    if (box2) {
      var n1 = rootsOf(box2)[0];
      // 同步命中：根条目渲染完的当刻标签就已在（未等任何回填）
      rec('iph-cache-sync', !!(n1 && n1.querySelector('.acsv-cip')
        && n1.querySelector('.acsv-cip').textContent === '广东'));
      await wait(400); // 若有漏网重查，这一拍足够冒出来
      rec('iph-cache-noreq', calls['9001'] === 1 && calls['9002'] === 1 && calls['9003'] === 1
        && calls['9004'] === 1, JSON.stringify(calls));
      // ⑤ 脚本页 IP 点击接通（0.9.253）：点 .acsv-cip → 面板开（**深色主题**）+ 资料卡为该 uid + Esc 关
      var cip = n1 && n1.querySelector('.acsv-cip');
      rec('iph-cip-pointer', !!(cip && getComputedStyle(cip).cursor === 'pointer'),
        cip ? getComputedStyle(cip).cursor : 'none');
      if (cip) {
        cip.click();
        var maskP = await waitFor(function () { return document.querySelector('.acsv-np-mask'); }, 3000);
        rec('iph-panel-open', (function () {
          if (!maskP) return false;
          var r = maskP.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(maskP).display !== 'none';
        })());
        rec('iph-panel-dark', !!(maskP && maskP.querySelector('.acsv-np.dark')));
        rec('iph-panel-card', (function () {
          var card = maskP && maskP.querySelector('.acsv-np-card');
          if (!card) return false;
          var t = card.textContent;
          return t.indexOf('甲') >= 0 && t.indexOf('9001') >= 0 && t.indexOf('广东') >= 0;
        })(), (maskP && maskP.querySelector('.acsv-np-card')) ? maskP.querySelector('.acsv-np-card').textContent : 'none');
        h.key('Escape');
        rec('iph-panel-esc', !!(await waitFor(function () { return !document.querySelector('.acsv-np-mask'); }, 3000)));
      }
    }
  };

  C['ip-tags-off'] = async function (h) {
    var rec = h.rec, wait = h.wait;
    var calls = {};
    window.__ACSV_MOCK_FORM__ = stubOf(calls);
    delete window.__ACSV_MOCK__;
    var hs = await openRowInline(h);
    rec('ipoff-open', !!hs);
    if (!hs) return;
    await wait(700); // 排队窗口（200ms × 3）全过
    rec('ipoff-no-query', Object.keys(calls).length === 0, JSON.stringify(calls));
    rec('ipoff-no-tag', !hs.box.querySelector('.acsv-cip'));
  };
})();
