// test/cases/audit257.js —— 0.9.257「批①」六修的摘修复反跑钉子（+ 私信徽标监听 P2-4）
// 每例的病灶/修法见对应 src 注释；断言一律钉**外部可观测的不变式**，反跑（还原病灶）必须转红。
// 登记见 test/run-harness.mjs 的 HARNESS_CASES（check-cases.mjs 双向校验）。本文件 CRLF，勿手改行尾。
//
// 反跑实测（2026-10-16，逐条还原病灶 → 只跑该场景 → 恢复；每行的括号里是转红断言及其读数）：
//   A1 删 setState 早退前的 clearTimeout、挪回 ready/error 分支内 ⇒ ssr-ready-holds（state=loading）
//   A2 删 recover refresh 分支的 _armRecoverWatch() ⇒ rrw-watch-armed（watch=0）+
//      rrw-leaves-recovering / rrw-error-state（state=loading，会话永停 recovering）
//   A3 删 loadDeepLink 里的 UpVideos 所有权判据 ⇒ duc-old-list-not-pumped /
//      duc-second-from-stream（second=11053531，旧列表首条灌进新舞台）+ duc-ctx-released（feedActive=true）
//   A4 删 onPlaying 的两道门控 ⇒ dpg-no-extra-adv（adv 1->2）+ dpg-no-refill（setItems=1）
//   A5 删 showControls 定时器体首行的 isConnected 守卫 ⇒ cds-detach-stopped（k 1->2，拆壳后仍在自续）
//   A6 删 pumpListContext 终态的 chainCapped 判据 ⇒ pcm-pump-rearm-stopped（rearm 187->421，30ms 空转）+
//      pcm-fallback-engaged（items 停在 9、随机流 0 条）
//   A7 删 stopBadge 里的 off 调用 ⇒ bl-single-listener（live=3）+ bl-one-event-one-sum（invoked=3 sessions=3）
(function () {
  var C = window.__ACSV_CASES__ = window.__ACSV_CASES__ || {};

  // ---- state-seek-ready（A1 · src/session.js setState：清转圈定时器提到同值早退之前） ----
  // 病灶：平滑 seek 期间 state 仍是 ready（waiting 的 300ms 定时器未到点），seeked 的
  // setState('ready') 被同值守卫短路 ⇒ 定时器无人撤，300ms 后直写 loading 反盖已恢复的画面；
  // 而 spec 下 smooth seek 只发 seeking/seeked、**不发 playing** ⇒ 再没有任何归位事件。
  // 旧代码两处 clearTimeout 都在 ready/error 分支内（早退之后）⇒ 必然漏清。
  // 反跑：把 clearTimeout 挪回分支内（删掉早退前那行）⇒ ssr-ready-holds 读 loading 转红。
  C['state-seek-ready'] = async function (h) {
    var rec = h.rec, slide = h.slide, wait = h.wait, waitFor = h.waitFor;
    rec('ssr-first-playing', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    var s = slide(0), v = s && s.querySelector('video');
    if (!s || !v) { rec('ssr-premise', false, 'no-slide'); return; }
    v.dispatchEvent(new Event('waiting'));   // 转圈定时器起表（300ms）
    await wait(100);                         // 未到点：此时 dataset 必须还是 ready（前提）
    rec('ssr-premise-still-ready', s.dataset.state === 'ready', 'state=' + s.dataset.state);
    v.dispatchEvent(new Event('seeked'));    // 平滑 seek 归位：必须在**同一拍**撤掉在途定时器
    v.pause();                               // 冻结后续真实事件（5s 循环回绕会发真 seeked/playing，会掩盖病灶）
    rec('ssr-ready-immediate', s.dataset.state === 'ready', 'state=' + s.dataset.state);
    await wait(600);                         // 越过 300ms 定时器窗口
    rec('ssr-ready-holds', s.dataset.state === 'ready',
      'state=' + s.dataset.state + ' paused=' + v.paused);
  };

  // ---- recover-refresh-watch（A2 · src/session.js recover 的 refresh 分支补换线看门狗） ----
  // 病灶：_recovering 重入锁只由 playing 释放；refresh 分支挂新源后没 arm 看门狗，新源若立刻
  // error（404），该 error 被锁吞掉 ⇒ 会话永久停在 recovering（无错误盒、无重试）。
  // 造态：条目只剩一条死链且 urlIdx 到底（recover 直落 refresh 分支）+ 把 sv mock 里该条的直链
  // 也换成本地 404（refreshItem = API.info 现读 mock）⇒ 重解析出来的新源同样立刻失败。
  // 反跑：删掉 refresh 分支的 _armRecoverWatch() ⇒ 12s 内 watch 恒 0、dataset 停在 loading
  //（死源的 waiting 拍与 error 都已被重入锁吞掉，会话永远停在 recovering）。
  C['recover-refresh-watch'] = async function (h) {
    var rec = h.rec, slide = h.slide, waitFor = h.waitFor, TEST = h.TEST, finish = h.finish;
    rec('rrw-first-playing', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    var s = slide(0), v = s && s.querySelector('video');
    var it = s && s._session && s._session.item; // 真身（TEST.call('feed') 是快照映射，改拷贝无效）
    if (!it || !v) { rec('rrw-premise', false, 'no-item'); finish(); return; }
    var DEAD = location.origin + '/nope-404.mp4';
    var raw = ((window.__ACSV_MOCK__ || {}).feed || []).filter(function (r) {
      return String(r.meowId) === String(it.id);
    })[0];
    if (raw && raw.playInfo && (raw.playInfo.videoUrls || []).length) {
      // 只留一条直链（sv mock 每条本有两档 CDN）：否则重解析出的条目 urlIdx=0 < len-1 会先走
      // 换线分支再等第二拍看门狗——本用例要的是一拍看门狗后即升级到 error 态
      raw.playInfo.videoUrls.length = 1;
      raw.playInfo.videoUrls[0].url = DEAD;
    }
    rec('rrw-mock-deadlink', !!(raw && raw.playInfo && (raw.playInfo.videoUrls || []).length === 1
      && raw.playInfo.videoUrls[0].url === DEAD), 'id=' + it.id);
    it.urls = [DEAD]; it.urlIdx = 0; it.refreshed = false;   // 直落 refresh 分支（urlIdx 已到底）
    var w0 = TEST.getStats()['recover.watch'] || 0;
    v.dispatchEvent(new Event('error'));
    var ok = await waitFor(function () {
      var ds = slide(0) ? slide(0).dataset.state : '';
      return (TEST.getStats()['recover.watch'] || 0) > w0 || ds === 'error';
    }, 12000); // CFG.time.recoverStuck=8000 + 余量
    var st = TEST.getStats();
    var ds = slide(0) ? slide(0).dataset.state : 'no-slide';
    rec('rrw-leaves-recovering', !!ok, 'state=' + ds + ' watch=' + (st['recover.watch'] || 0)
      + '/' + w0 + ' resolve=' + (st['recover.resolve'] || 0));
    rec('rrw-watch-armed', (st['recover.watch'] || 0) > w0, 'watch=' + (st['recover.watch'] || 0));
    rec('rrw-error-state', ds === 'error', 'state=' + ds);
  };

  // ---- deeplink-upctx（A3 · src/player.js loadDeepLink 的上下文所有权判据） ----
  // 病灶：UpVideos.feedActive 是模块级常驻（空间页条目点击激活、unmount 不复位），深链从别处
  // 进来（分享链/前进后退）时若沿用，泵按上一集的 feedCursor 把旧空间页列表的剩余条目灌进新舞台。
  // 造态：upvideos 测试缝把上下文置成「已激活 + 持有两条已知 meow id」（真机路径要 GM 抓 m 站
  // HTML 才有条目，本地 harness 无 GM 通道）；深链目标取 home 空间 acId——不在旧列表里、也不在
  // sv 缓冲里 ⇒ 走 loadDeepLink 而非「已在缓冲」的原地跳。
  // 钉法：深链落地后第二条必须是**当前源随机流**的首条（fix），而不是旧列表首条（反跑）。
  C['deeplink-upctx'] = async function (h) {
    var rec = h.rec, wait = h.wait, waitFor = h.waitFor, feed = h.feed, TEST = h.TEST, finish = h.finish;
    window.__ACSV_MOCK_FORM__ = window.__ACSV_MY_MOCK__;  // douga/info 桩（a 深链解析）
    window.__ACSV_MOCK_DIRECT__ = { '48867212': 1 };      // 深链首条直挂本地 webm（免 hls 死在解析上）
    rec('duc-playing', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    var OLD = ['11053531', '11042989'];                   // 旧空间页列表（两条 sv meow id）
    TEST.call('upvideos', 'activate', OLD);
    rec('duc-armed', (TEST.call('upvideos') || {}).feedActive === true,
      JSON.stringify(TEST.call('upvideos')));
    var homeCards = window.__ACSV_MOCK_HOME__ || [];
    var homeFirst = String((homeCards[0] || {}).href || '');
    var homeSecond = String((homeCards[1] || {}).href || '');
    location.hash = 'svfeed/a/' + homeFirst;              // 从别处深链进同一 id 空间（非旧列表成员）
    rec('duc-deeplink', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && String(f.items[0].id) === homeFirst;
    }, 15000)), 'hash=' + location.hash);
    await wait(2000);                                     // 等泵/随机流把第二条落位
    var f2 = feed() || { items: [] };
    var second = f2.items[1] != null ? String(f2.items[1].id) : '';
    rec('duc-old-list-not-pumped', OLD.indexOf(second) === -1, 'second=' + second + ' old=' + OLD.join(','));
    rec('duc-second-from-stream', second === homeSecond, 'second=' + second + ' want=' + homeSecond);
    rec('duc-ctx-released', (TEST.call('upvideos') || {}).feedActive === false,
      JSON.stringify(TEST.call('upvideos')));
    finish();
  };

  // ---- dm-play-gated（A4 · src/danmaku.js onPlaying 的两道门控） ----
  // 病灶：每次暂停→恢复同一视频都重建弹幕状态（setItems 全量重排/重排轨）、重建高级弹幕泵
  //（wins 归零 ⇒ ADV_MAX_WIN 单会话上限失效）并对同窗多发一次 POST。
  // 计数：pollByPosition 桩（harness mock，测试侧）+ 包一层 layer.setItems（装填计次）。
  // 反跑：删掉两道门控 ⇒ dpg-no-extra-adv（+1500ms 内的第二发）与 dpg-no-refill 转红。
  // home 源（harness HOME_CASES）：只有 douga 条 cap.danmaku 为真、有弹幕框与 videoId。
  C['dm-play-gated'] = async function (h) {
    var rec = h.rec, slide = h.slide, wait = h.wait, waitFor = h.waitFor, TEST = h.TEST, finish = h.finish;
    var ADV = 0, LIST = 0;
    window.__ACSV_MOCK_FORM__ = Object.assign(window.__ACSV_MOCK_FORM__ || {}, {
      'pollByPosition': function () { ADV++; return { result: 0, danmakus: [] }; },
      'new-danmaku/list': function () { LIST++; return { result: 0, danmakus: [], pcursor: 'no_more' }; }
    });
    rec('dpg-playing', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    rec('dpg-list-fetched', !!(await waitFor(function () { return LIST >= 1; }, 8000)), 'list=' + LIST);
    rec('dpg-adv-first-pull', !!(await waitFor(function () { return ADV >= 1; }, 8000)), 'adv=' + ADV);
    var s = slide(0), v = s && s.querySelector('video');
    var layer = s && s._dmLayer;
    rec('dpg-layer', !!layer);
    if (!layer || !v) { finish(); return; }
    var nSet = 0, origSet = layer.setItems;
    layer.setItems = function (list) { nSet++; return origSet.apply(this, arguments); };
    await wait(300);            // 让首发列表的装填落地（免与"暂停→恢复"这一拍混在一起）
    nSet = 0;
    var a0 = ADV;
    v.pause();
    await wait(150);
    v.play();                   // 同一 slide、同一 videoId：playing 必然再触发一次 onPlaying
    await wait(1700);           // 越过高级弹幕泵的首拍（1500ms）
    rec('dpg-no-extra-adv', ADV === a0, 'adv ' + a0 + '->' + ADV);
    rec('dpg-no-refill', nSet === 0, 'setItems=' + nSet);
  };

  // ---- ctl-detach-stop（P1-3 · src/controls.js showControls 的 isConnected 守卫） ----
  // 病灶：指针停在音量区（_volOpen 真）时 slide 被拆走——Chromium 不给已拆节点补发 pointerleave
  // ⇒ volScheduleHide 不再排、_volOpen 卡真，闲置保活链以 ctlIdle(2500ms) 永续自续整棵 slide 子树。
  // 计数：showControls 里 _volOpen 分支的 stat('ctl.keepalive')（debug 埋点）。
  // 造态：悬停音量区 → 换源（真实路径：resetStream 把 slide 子树整批摘掉）。
  // 反跑：删掉那行 isConnected 守卫 ⇒ ctl-detach-stopped 的两拍计数继续爬升转红。
  C['ctl-detach-stop'] = async function (h) {
    var rec = h.rec, q = h.q, slide = h.slide, wait = h.wait, waitFor = h.waitFor, TEST = h.TEST, finish = h.finish;
    rec('cds-playing', !!(await waitFor(function () { return h.firstVideoReady(0); }, 25000)));
    var s = slide(0);
    var vol = s && s.querySelector('.acsv-volwrap');
    rec('cds-volwrap', !!vol);
    if (!vol) { finish(); return; }
    vol.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })); // volOpen：_volOpen=1 + 保活起表
    await wait(200);
    rec('cds-volopen', s._volOpen === true);
    var k1 = TEST.getStats()['ctl.keepalive'] || 0;
    await wait(3000); // > ctlIdle：保活链必须在架时自续一拍（前提）
    var k2 = TEST.getStats()['ctl.keepalive'] || 0;
    rec('cds-keepalive-while-hover', k2 > k1, 'k ' + k1 + '->' + k2);
    // 拆壳：点源 seg 切走（switchSource → resetStream → scroller.innerHTML='' 摘掉整批 slide）
    var segEl = q('.acsv-top .acsv-seg:not(.acsv-seg-follow)');
    var target = null;
    if (segEl) {
      Array.prototype.forEach.call(segEl.querySelectorAll('.acsv-seg-btn'), function (b) {
        if (!b.classList.contains('on')) target = b;
      });
    }
    rec('cds-seg-target', !!target);
    if (!target) { finish(); return; }
    target.click();
    rec('cds-detached', !!(await waitFor(function () { return !s.isConnected; }, 8000)));
    rec('cds-volopen-stuck', s._volOpen === true); // 病灶态确实造出来了（旧 slide 不会插回）
    await wait(400);  // 让在途那一拍落地
    var k3 = TEST.getStats()['ctl.keepalive'] || 0;
    await wait(3000); // 再越过一个 ctlIdle：拆壳后保活链必须已是终态
    var k4 = TEST.getStats()['ctl.keepalive'] || 0;
    rec('cds-detach-stopped', k4 === k3, 'k ' + k3 + '->' + k4 + ' connected=' + s.isConnected);
    finish();
  };

  // ---- pump-chaincapped（P1-4 · src/feedstore.js pumpListContext 的 chainCapped 终态） ----
  // 病灶：撞到自动加载上限的链只置 chainCapped、永远等不到 done（feedctx 只在列表尽头置 done）
  // ⇒ 泵以 chainGap(30ms) 永久空转，且 fetchMore 的随机流回落永不进入（ensureMore 有上下文时
  // 直接早退）——舞台饿死。
  // 造态：真实关注视频流（顶栏 seg「视频」）+ 定向桩 followDougaFeed 永不 no_more（每页 1 条，
  // maxChainPages=8 ⇒ 链必然打满上限）；再逐条 scrollTo 把列表泵到耗尽（feedCursor==items.length）。
  // 计数：feedstore 的 stat('feed.pumpRearm')（等待后台链的再入计次，debug 埋点）。
  // 反跑：删掉 chainCapped 判据 ⇒ pcm-pump-rearm-stopped 两拍计数继续爬升、pcm-fallback-engaged 转红。
  C['pump-chaincapped'] = async function (h) {
    var rec = h.rec, q = h.q, cur = h.cur, wait = h.wait, waitFor = h.waitFor,
      feed = h.feed, TEST = h.TEST, finish = h.finish;
    var MY = window.__ACSV_MY_MOCK__;
    var table = {};
    Object.keys(MY).forEach(function (k) { table[k] = MY[k]; });
    table['feed/followDougaFeed'] = function (body, url) {
      // 永不 no_more：游标持续给新值 ⇒ runChain 只能撞 maxPages 上限（chainCapped）
      var cur_ = (String(url).match(/pcursor=([^&]*)/) || [])[1] || '0';
      var n = cur_ === '0' ? 0 : Number(String(cur_).replace('p', '')) || 0;
      var id = 488911 + n;
      return {
        result: 0, pageSize: 10, pcursor: 'p' + (n + 1),
        feedList: [{
          resourceType: 2, resourceId: id, caption: '关注视频' + id, coverUrl: '',
          playDuration: '00:20', viewCount: 1, likeCount: 1, commentCount: 1, bananaCount: 1,
          createTime: Date.now() - n * 3600000,
          user: { userId: 2000, userName: '视频UP', userHead: '', isFollowing: true }
        }]
      };
    };
    window.__ACSV_MOCK_FORM__ = table;
    window.__ACSV_MOCK_DIRECT__ = { '488911': 1 };  // 深链首条直挂本地 webm
    location.hash = 'svfeed/follow';
    rec('pcm-view-open', !!(await waitFor(function () {
      return document.querySelectorAll('.acsv-mewrap .acsv-frow').length >= 1;
    }, 10000)));
    q('.acsv-seg-follow .acsv-seg-btn:nth-child(1)').click();   // 「视频」侧：列表上下文接管舞台
    rec('pcm-deeplink', !!(await waitFor(function () {
      return location.hash === '#svfeed/a/488911';
    }, 10000)), location.hash);
    rec('pcm-first-item', !!(await waitFor(function () {
      var f = feed();
      return f && f.items[0] && String(f.items[0].id) === '488911';
    }, 10000)));
    rec('pcm-chain-capped', !!(await waitFor(function () {
      var st = TEST.call('followstream');
      return st && st.capped === true && st.done === false;
    }, 12000)), JSON.stringify(TEST.call('followstream')));
    // 逐条下划把列表泵到耗尽（FeedStore 只保持 current+4 的余量，故要边走边泵）
    var exhausted = false;
    for (var i = 1; i <= 14 && !exhausted; i++) {
      TEST.call('scrollTo', i);
      var landed = await waitFor(function () { return cur() === i; }, 12000);
      if (!landed) break;
      var st2 = TEST.call('followstream') || {};
      exhausted = !!(st2.cursor >= st2.count);
    }
    rec('pcm-list-exhausted', exhausted, JSON.stringify(TEST.call('followstream')));
    // 耗尽后还要再走一条：泵在「余量够」时不自续，终态判定（fetchMore / 再等一拍）只在下一次
    // ensureMore（setActive 链）里发生——不补这一拍，链上限后的收口根本不被执行
    for (var j = 0; j < 2 && exhausted; j++) {
      TEST.call('scrollTo', cur() + 1);
      await wait(600);
    }
    var r1 = TEST.getStats()['feed.pumpRearm'] || 0;
    await wait(1200);   // > 40 个 chainGap：空转时此地必涨
    var r2 = TEST.getStats()['feed.pumpRearm'] || 0;
    rec('pcm-pump-rearm-stopped', r2 === r1, 'rearm ' + r1 + '->' + r2);
    // 回落必须真的送货：随机流条目（home 卡片池）入库——反跑时链上限后永远饿死
    var homeIds = (window.__ACSV_MOCK_HOME__ || []).map(function (c) { return String(c.href); });
    var st3 = feed() || { items: [] };
    var fromStream = st3.items.filter(function (x) { return homeIds.indexOf(String(x.id)) >= 0; });
    rec('pcm-fallback-engaged', fromStream.length >= 1,
      'n=' + st3.items.length + ' stream=' + fromStream.length
      + ' head=' + st3.items.slice(0, 3).map(function (x) { return x.id; }).join(','));
    finish();
  };

  // ---- badge-listener（P2-4 · src/imbadge.js 的 off 摘除 + mountBadge 先 stopBadge） ----
  // 病灶：SDK 实例是永不释放的单例（imsend.ensureIm 只 bump connGen），此前每次挂载都叠一层
  // unReadCountUpdate 监听且从不撤；回调里的 mounted 又是**共享模块标志** ⇒ 最新一次挂载置真后
  // 所有陈旧回调都能过守卫，一个 unReadCountUpdate 触发 N 次 getSessions 全量求和。
  // 造态：假 SDK 夹具（test/fake-imsdk.js，走 imsend 的 directLoad 注入链，语义照真件=构造即单例）
  // + imbade 测试钩子的 accelerate 把 badgeDelay(15s) 压到 150ms；挂载循环走**真实路径**
  //（hash 离开 → unmount/teardownIm→stopBadge；回 #svfeed → mount→mountBadge）。
  // 断言：跨 3 轮挂载后假 SDK 在册监听恒 1；一次推送事件只引起 1 次 getSessions。
  // 反跑：删掉 stopBadge 里的 off ⇒ live 累积到 3、事件触发 3 次求和，两断言转红。
  C['badge-listener'] = async function (h) {
    var rec = h.rec, wait = h.wait, waitFor = h.waitFor, TEST = h.TEST, finish = h.finish;
    window.globalConfig = { imsdkcdn: '/test/fake-imsdk.js' }; // directLoad 注入本仓假件
    document.cookie = 'auth_key=51737407_x; path=/';           // isLogined（tick 读 getSessions 的前置）
    var ib = TEST.call('imbadge');
    rec('bl-hook', !!(ib && ib.accelerate && ib.listenerArmed));
    if (!ib || !ib.accelerate) { finish(); return; }
    ib.accelerate(150);
    function fake() { return window.__ACSV_IM_FAKE__; }
    async function cycle() {  // 一轮「退出→重进竖刷页」＝一次 stopBadge + mountBadge
      await wait(400);        // 让 syncHash 尾节流落定（否则地址被回写、当场重挂）
      location.hash = 'audit-off';
      var off = await waitFor(function () { return !document.getElementById('acsv-root'); }, 12000);
      location.hash = 'svfeed';
      var on = await waitFor(function () { return !!document.getElementById('acsv-root'); }, 12000);
      var armed = await waitFor(function () { return TEST.call('imbadge').listenerArmed(); }, 12000);
      return !!(off && on && armed);
    }
    var c1 = await cycle();
    rec('bl-first-armed', !!(c1 && fake() && fake().live() === 1),
      'live=' + (fake() ? fake().live() : 'no-fake') + ' armed=' + ib.listenerArmed());
    var c2 = await cycle();
    var c3 = await cycle();
    rec('bl-cycles', !!(c2 && c3));
    rec('bl-single-listener', !!(fake() && fake().live() === 1),
      'live=' + (fake() ? fake().live() : 'no-fake'));
    rec('bl-listener-armed', ib.listenerArmed() === true);
    var s0 = fake() ? fake().sessions() : 0;
    var invoked = fake() ? fake().emit('unReadCountUpdate') : -1;
    await wait(250);   // 轮询拍间隔 5s：本窗内不可能混入轮询引起的求和
    var d = fake() ? fake().sessions() - s0 : -1;
    rec('bl-one-event-one-sum', invoked === 1 && d === 1, 'invoked=' + invoked + ' sessions=' + d);
    finish();
  };
})();
