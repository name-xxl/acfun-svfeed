/*
 * harness 无头驱动：Playwright 逐场景加载 test/harness.html（仅 smoke/resolvefail 走 release
 * 构建，其余 debug——见下方「bundle 选择原则」）、test/dm-smoke.html 与 test/im-open.html，
 * 等页内断言写完（__HARNESS_RESULTS__/__DM_RESULTS__/__IM_RESULTS__.done），汇总失败项，
 * 非 0 退出码供 CI 拦截。场景体在 test/cases/*.js；ONLY 传未知名会报错退出。
 *
 *   node test/run-harness.mjs                 全部场景
 *   node test/run-harness.mjs smoke,fastswipe 只跑指定场景（调试用）
 *
 * 静态服务器以仓库根为 docroot（harness 以 ../acfun-svfeed.user.js 相对路径引产物，
 * 且 cdn-fallback 场景依赖 /nope-404.mp4 真实 404）。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);

// headless 下因环境差异（合成器/解码器）确认跑不了的场景放这里，须注明原因——
// 不允许静默跳过：加名时必须带理由字符串。
const HEADLESS_SKIP = [
  // { name: 'xxx', reason: '…' }
];

// 并行策略（0.9.81）：serial 标记的场景编组串行独占（时序判定对并发负载敏感：帧间隔/冻结
// 窗口/冻结计数在解码争抢下会假红），其余场景两两并发跑；夹具计数按 pid 隔离（见 serve）。
// bundle 选择原则：
//  - release：只跑不依赖 __ACSV_TEST__（或已做防御）的场景，覆盖正式产物；
//  - debug：用 TEST 模拟缝做断言的场景（stall-*/prewarm/quality-switch/watch-report 等）
//    本就是按 debug 构建写的——TEST 缺失时场景脚本会抛错，done 永不置位（表现为驱动超时）。
const HARNESS_CASES = [
  { name: 'smoke', serial: true, release: true },
  { name: 'homeswitch', serial: true  },
  { name: 'rel-drawer', serial: true  }, // 0.9.168 相关推荐 tab + 游走链（home 源）
  { name: 'rel-layer', serial: true  }, // 0.9.170/174 层内游走 + 相关行压列表播放器 + Esc 弹回原视频（home 源）
  { name: 'layer-list', serial: true  }, // 0.9.173 层内列表会话：榜单/搜索顺序步进 + 右栏 ▲▼ + 分区二选一
  { name: 'jingxuan', serial: true  }, // 0.9.169 分区页：分区网格+自持游标+按行补齐+进播放层
  { name: 'fastswipe', serial: true  },
  // 0.9.216 近跳落点不变式（issue #1「滚半屏停留」）：spinner 混入 scroller 的排序 sweep
  // 截断几何 + land.trunc 打点 + 键盘 repeat 守卫——serial（几何判定时序敏感）
  { name: 'land-near', serial: true  },
  { name: 'feed-slim', serial: true  }, // 0.9.165 水位：远端置瘦 + slide 占位壳 + 划回重解析（40 条夹具）
  { name: 'resolvefail', serial: true, release: true },
  { name: 'prewarm', serial: true  },
  { name: 'stall-frozen', serial: true  },
  { name: 'stall-slow', serial: true  },
  { name: 'stall-healthy', serial: true  },
  { name: 'cdn-fallback', serial: true  },
  { name: 'quality-switch', serial: true  },
  { name: 'dispose-mid-recovery', serial: true  },
  { name: 'stall-visibility', serial: true  },
  { name: 'spinner-recover', serial: true  },
  { name: 'watch-report', serial: true  },
  // 0.9.86 播放层 pagehide 兜底上报（watchTarget 重定向；home 源 + MY_MOCK 直挂缝，debug 构建）
  { name: 'watch-playlayer-pagehide', serial: true  },
  // 0.9.87 官方同款卸载形态：pagehide → sendBeacon 直发（嗅探缓存信封 + 续号；home 源，debug 构建）
  { name: 'watch-pagehide-beacon', serial: true  },
  // 0.9.87 崩溃补报对账：bundle 前预置账本（见 harness.html）→ init 对账补发 → 清账（debug 构建）
  { name: 'watch-ledger-replay', serial: true  },
  { name: 'upd-open', serial: true  }, // 0.9.60 更新提示冒烟（mock atom 注入，debug 构建）
  { name: 'view-my' }, // 0.9.62 我的视图冒烟（hash 子路由 + __ACSV_MOCK_FORM__ 缝，debug 构建）
  // 0.9.76 封面加载策略（URL 归一/失败重试/终败降级）：/flaky-cover.png 首拉 404 再拉 200
  // 走通重试链；/nope-404.png 死链走降级占位。依赖 debug 构建的 __ACSV_MOCK_FORM__ 缝
  { name: 'cover-fallback' },
  { name: 'view-zone' }, // 0.9.62 分区榜单视图冒烟（渠道/榜期切换 + 契约过滤，debug 构建）
  { name: 'view-search' }, // 0.9.72 搜索视图冒烟（搜索页 SSR HTML mock → 抖音式结果卡，debug 构建）
  { name: 'play-deep' }, // 0.9.74 播放层深链冒烟（直挂缝/坏形态/未命中错误盒/清晰度隔离，debug 构建）
  { name: 'play-cold' }, // 0.9.79 播放层直达不预热竖刷（冷启动 hash + MY_MOCK 桩，debug 构建）
  { name: 'hls-lazy' }, // 0.9.164 hls.js 懒 eval（加载后未定义 → ensureHls 编译内嵌串，debug 构建）
  { name: 'hls-sealed' }, // 0.9.180 封原生回落：hls.js 不可得 → error 态（video 不得落 m3u8 直链；debug 构建）
  { name: 'hls-probe' }, // 0.9.181 装载取数修 world/UMD 双坑：敌意 AMD/CJS 标识符下仍须取回类（debug 构建）
  { name: 'hls-blob' }, // 0.9.182 装载第三层：eval 秒拒 → Blob 脚本（页面 world）顶上且不下沉 CDN（debug 构建）
  { name: 'im-native' }, // 0.9.80 原生私信页增强装配（造站结构 + douga/info 桩，debug 构建）
  // 0.9.73 顶栏四界面复用 + 抽屉避让推广：抽屉×视图的避让几何/降级/Esc 链（imOpenSmoke 缝）
  { name: 'view-im' },        // 宽视口：正文右缘收窄到抽屉左缘 + 顶栏右组让位 + Esc 链
  { name: 'view-im-narrow', viewport: { width: 1000, height: 720 } }, // 中窄视口（<CFG.view.avoidW）：降级纯覆盖
  // 0.9.72 深链冒烟：hash 须在 bundle 前写好（冷启动深链路径）+ __ACSV_MOCK_FORM__ 的
  // douga/info 桩 + TEST.feed 断言，故全为 debug 构建
  { name: 'deeplink-sv' },      // v 标记形态置顶 + 挂载态就地跳转（不重置缓冲）
  { name: 'deeplink-bare' },    // 0.9.72 前的裸数字形态：靠探测出 meow
  { name: 'deeplink-ac' },      // a 标记形态（推荐 acId）经 douga 详情置顶
  { name: 'deeplink-switch' },  // 源记忆=推荐 时深链仍须落地（源随链接走）
  { name: 'deeplink-miss' },   // 两空间都查不到：错误盒，不许静默重随机
  // 0.9.88 boot 页面类型分流：pathname 在 bundle 前改写（harness.html 的 BOOT_PATH）+
  // 挂载前快照（__BOOT_SNAP__）断言样式注入差异与 dbg 埋点，故为 debug 构建
  { name: 'boot-home', serial: true },  // '/'：全量初始化（样式先就位）
  { name: 'boot-video', serial: true }, // '/v/…'：仅基础设施（全量 CSS 不得注入）+ 深链仍可挂载
  // 0.9.89 设置面板（Shadow DOM 断言走 host.shadowRoot）：开/关/持久化 + 老键收养，
  // settings-migrate 依赖 bundle 前预置老键（见 harness.html），故为 debug 构建
  { name: 'settings-open', serial: true },
  { name: 'settings-migrate', serial: true },
  // 0.9.91 关注视图（followFeedV2 混合流；0.9.99 重构为仿原生单列无限流：三类行判别位 +
  // 行内写链乐观两向 + 展开/收起 + 滚动触底翻页/状态行；mock 缝依赖 debug 构建，夹具在 my-sample.js）
  { name: 'view-follow', viewport: { width: 1600, height: 900 } },
  // 0.9.193 评论追加失败健壮性：追加失败**不清列表** + 末尾可点重试 + 到底尾行（rejected promise
  // 造请求失败；定向桩 comment/list，debug 构建）
  { name: 'comment-fail', viewport: { width: 1600, height: 900 } },
  // 0.9.126 广场视图（吸收动态广场）：feedSquare 免登录流——dock 高亮/行卡契约/行内评论/
  // 触底续翻/24h 窗口剔除即止/状态行；夹具在 my-sample.js（mock 缝依赖 debug 构建）
  { name: 'view-square', viewport: { width: 1600, height: 900 } },
  // 0.9.128 原生 /member 页内嵌广场：「动态广场」入口注入（真实轮询）+ 就地展开/收回 +
  // 浅色皮肤 + 无壳浮层（评论/大图）——BOOT_PATH 改写 pathname 至 /member/feeds，且本场景
  // 禁自动挂壳（harness.html NO_AUTOMOUNT：须在无 shell 前提下验证）；夹具在 cases/member.js
  { name: 'member-plaza', viewport: { width: 1600, height: 900 } },
  // 0.9.218 原生空间页 /u/<uid>「动态」标签注入：两个自建标签（动态/小视频）位次确定性、
  // 点击切换与站点排序控件互斥、**惰性**（不点不拉接口）、三合一渲染、行尾 am 锚、浅色第二皮肤
  //（0.9.218 补的视频/文章条规则）——BOOT_PATH 改写 pathname 至 /u/12345 + NO_AUTOMOUNT；
  // 夹具在 cases/space.js（原生标签栏由场景体自建）
  { name: 'space-moments', viewport: { width: 1600, height: 900 } },
  // 0.9.222 发动态编辑器：真实入口（我的页「✎ 发动态」）→ 壳/镜像层/字数/可见范围 → 提交，
  // mock 缝抓 params body 形状 + 成功关闭 + 失败话术与内容保留 + 转发形态（引用块 + repostMomentId）
  { name: 'moment-publish', viewport: { width: 1600, height: 900 } },
  // 0.9.96 动态详情面板（卡点击原地展开 + 评论区管线复用 stype=4 + 赞/评写链乐观回滚 + 表情面板落位）
  { name: 'detail-open', viewport: { width: 1600, height: 900 } },
  // 0.9.99 关注语境「视频」侧（顶栏 seg → FollowVideos 上下文 → 舞台深链接管 + 按列表泵入 + 全部回路）
  // 视口 1600×900：桌面几何（分享卡贴行左缘/贴面板右缘的裁决坐标需行侧留白 ≥310px）
  { name: 'follow-videos', viewport: { width: 1600, height: 900 } },
  // 0.9.97 关注未读徽标（followFeedV2 桩驱动 poll 状态机：计数/回落/翻倍/进视图不打扰；webPush 自 0.9.107 退役）
  { name: 'badge-poll' },
  // 0.9.142 关注分组全闭环（我的页第三 tab 建/改名/删/移组/取关 + rail 分组选择层两态）
  { name: 'follow-groups' },
  // 0.9.143 收藏夹全闭环（rail 选择层三分支 + 我的页建/改名/删夹与移动/移除）
  { name: 'fav-folders' }
];

const ALL_CASES = HARNESS_CASES.map(function (c) {
  return {
    name: c.name,
    url: '/test/harness.html?case=' + c.name + (c.release ? '&bundle=release' : ''),
    key: '__HARNESS_RESULTS__',
    serial: !!c.serial,
    viewport: c.viewport // 少数场景需要特定视口（如 avoidW 护栏的窄态）；缺省用 Playwright 默认 1280×720
  };
}).concat([{
  // dm-smoke 固定加载 debug 构建（依赖 testHook 模拟缝），自身确定性泵帧
  name: 'dm-smoke',
  url: '/test/dm-smoke.html',
  key: '__DM_RESULTS__',
  serial: true
}, {
  // im-open 私信抽屉开启冒烟（debug 构建 testHook 模拟缝）：0.9.49 quoteChip 回归哨兵
  name: 'im-open',
  url: '/test/im-open.html',
  key: '__IM_RESULTS__',
  serial: true
}]);

// ONLY 拼错过去会静默「0 场景 0 失败」通过（0.9.81 实锤：run-harness.mjs views-check 白跑）——
// 先对全量名单校验，未知名直接报错退出（check-cases.mjs 管另一个方向：cases 侧漏登记）
const unknown = ONLY.filter(function (n) {
  return !ALL_CASES.some(function (c) { return c.name === n; });
});
if (unknown.length) {
  console.log('未知场景名：' + unknown.join(', '));
  console.log('可用：' + ALL_CASES.map(function (c) { return c.name; }).join(', '));
  process.exit(1);
}
const CASES = ALL_CASES.filter(function (c) {
  return !ONLY.length || ONLY.indexOf(c.name) >= 0;
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.json': 'application/json'
};

// cover-fallback 场景：/flaky-cover.png 首拉 404、再拉 200——封面重试链端到端（第二次请求
// 带 acsv_r 破缓存参数，此处按 pathname 匹配天然忽略 query）。1×1 PNG 用内联 base64 常量
// （node 生成并校验：1×1 RGBA），不为一个测试夹具往仓库塞二进制
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwcHD4DwADRAHA6ce2AgAAAABJRU5ErkJggg==',
  'base64');
// 夹具请求计数（0.9.77）：暴露成 /__hits 供场景页读取——让「重试链真的发了三发」「备忘命中的
// 二次进入零请求」变成可证断言（0.9.76 的 cover-retry-loads 只断终态，计数器从不被读）
const pathHits = {}; // key = `pid|path`：并行跑时各场景的夹具计数互不污染（0.9.81）
function hitsFor(pid) {
  var out = {};
  Object.keys(pathHits).forEach(function (k) {
    var i = k.indexOf('|');
    if (k.slice(0, i) === pid) out[k.slice(i + 1)] = pathHits[k];
  });
  return out;
}

function serve(req, res) {
  var u = new URL(req.url, 'http://x');
  var urlPath = decodeURIComponent(u.pathname);
  if (urlPath === '/__hits') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(hitsFor(u.searchParams.get('pid') || '')));
  }
  var fmKey = '';
  if (urlPath === '/flaky-cover.png' || urlPath === '/nope-404.png') {
    fmKey = (u.searchParams.get('pid') || '') + '|' + urlPath;
    pathHits[fmKey] = (pathHits[fmKey] || 0) + 1;
  }
  if (urlPath === '/flaky-cover.png') {
    if (pathHits[fmKey] < 2) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': PIXEL_PNG.length });
    return res.end(PIXEL_PNG);
  }
  var file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    var type = MIME[path.extname(file)] || 'application/octet-stream';
    // 必须支持 Range：Chromium 对无 Range 的媒体源按「不可 seek 的流」处理，
    // 所有 currentTime 赋值被钳回 0——进度续播（resumeAt）类断言会全灭
    var range = req.headers.range;
    if (range) {
      var m = /^bytes=(\d*)-(\d*)$/.exec(range);
      var start = m && m[1] ? parseInt(m[1], 10) : 0;
      var end = m && m[2] ? Math.min(parseInt(m[2], 10), st.size - 1) : st.size - 1;
      if (isNaN(start) || start > end || start >= st.size) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes'
      });
      return fs.createReadStream(file, { start: start, end: end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
}

async function launch() {
  var args = [
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio'
  ];
  try {
    return await chromium.launch({ headless: true, args: args });
  } catch (e) {
    // 本机没跑过 npx playwright install 时回退系统 Edge（Windows 自带）
    console.log('[info] 内置 chromium 不可用（' + e.message.split('\n')[0] + '），回退 msedge');
    return await chromium.launch({ headless: true, channel: 'msedge', args: args });
  }
}

var server = http.createServer(serve);
// Chrome 按「不安全端口」黑名单拒绝导航（0.9.61 复现：listen(0) 系统随机抽中 6665 直接
// ERR_UNSAFE_PORT 全场景报废）。取到黑名单端口就关掉重抽；名单 = Chromium net 基础设施
// 的 restricted ports 全表
var BLOCKED_PORTS = new Set([1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69,
  77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143,
  161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587,
  601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6697, 10080]);
var port = 0;
while (!port || BLOCKED_PORTS.has(port)) {
  if (port) server.close();
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  port = server.address().port;
}
console.log('[info] 静态服务 http://127.0.0.1:' + port + '（docroot=' + ROOT + '）');

var browser = await launch();
var failed = 0, ran = 0, retried = 0;

// 单次尝试的结局：'pass' | 'assert'（断言红，**不重试**）| 'driver'（驱动层失败，可重试一次）
async function runOnce(c) {
  var t0 = Date.now();
  var page = await browser.newPage(c.viewport ? { viewport: c.viewport } : undefined);
  try {
    // 导航超时 60s（Playwright 默认 30s）：给"页面子资源偶发卡住"留余量；再叠 runOne 的驱动层重试。
    // 两处都只放宽等待/重试驱动，**不放宽任何断言**。
    await page.goto('http://127.0.0.1:' + port + c.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(
      function (k) { return window[k] && window[k].done === true; },
      c.key,
      // 场景内部等窗均为有界等待，120s 足够；超时多半是场景脚本抛错（TEST 依赖与 bundle 不匹配）
      // 轮询 100ms（原 500ms）：done 置位后平均多等 250ms，56 个场景累计十几秒的纯空转
      { timeout: 120000, polling: 100 }
    );
    var res = await page.evaluate(function (k) { return window[k]; }, c.key);
    var bad = res.results.filter(function (r) { return !r.pass; });
    var dt = ((Date.now() - t0) / 1000).toFixed(1) + 's';
    if (bad.length) {
      console.log('FAIL ' + c.name + '  (' + (res.results.length - bad.length) + '/' + res.results.length + ' 断言通过, ' + dt + ')');
      bad.forEach(function (r) { console.log('     ✗ ' + r.name + (r.info ? '  (' + r.info + ')' : '')); });
      return 'assert';
    }
    console.log('PASS ' + c.name + '  (' + res.results.length + ' 断言, ' + dt + ')');
    return 'pass';
  } catch (e) {
    console.log('FAIL ' + c.name + '  (驱动层：' + e.message.split(/\r?\n/)[0] + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    return 'driver';
  } finally {
    await page.close();
  }
}

async function runOne(c) {
  var skip = HEADLESS_SKIP.filter(function (s) { return s.name === c.name; })[0];
  if (skip) { console.log('SKIP ' + c.name + ' — ' + skip.reason); return; }
  var r = await runOnce(c);
  if (r === 'driver') {
    // 驱动层失败＝环境级偶发（页面子资源卡住，见下方归因更正）——重试一次；
    // 断言失败（'assert'）绝不重试，不拿重试掩盖真回归
    retried++;
    console.log('RETRY ' + c.name + '（驱动层失败，重试一次）');
    r = await runOnce(c);
  }
  ran++;
  if (r === 'pass') return;
  failed++;
}

// 并发策略（0.9.203 改）：**全部场景一个池**跑，默认并发按 CPU 数取。
// 0.9.81 曾按 serial 标记把「时序敏感」场景编组串行独占（帧间隔/冻结窗口/冻结计数在解码争抢下会假红）——
// 0.9.203 实测该顾虑在本机（20 核）不成立：全场景同池并发 4 **连跑 8 次 56/56 全绿**（43s/轮），
// 并发 6 → 32s/轮亦绿。原串行组 33 个场景独自吃掉了 2m11s 的大头，而其中 watch-report(18s)/
// stall-healthy(11s)/upd-open(7s) 本就是在等墙钟窗口，串行独占只是白等。
// serial 标记**保留**（它记录了哪些场景曾被判定敏感）：`HARNESS_SERIAL=1` 恢复老口径独占分组，
// 怀疑某场景假红时用它做对照诊断。
// 并发度：`HARNESS_CONC` 覆盖；默认 min(6, max(2, 核数/4))——核少时自动退回 2，不吃满低配机。
// **归因更正（2026-10-06 晚，发布 v0.9.208 时）**：CI 连栽三次（play-cold / deeplink-sv / deeplink-bare
// 的 page.goto 超时，**断言零失败**），一度以为是同池并发所致并让 CI 回退独占分组——**已证伪**：
// ① 回退后那次 CI 照栽同一个 play-cold；② 翻历史，2026-10-05 那次失败的 CI（本批之前、并发改动之前）
// 栽的是**同样这三个场景、同样只有驱动层超时**，当时重跑即过。⇒ 这是**既有的环境级偶发**
// （现象：某个页面的子资源拉取偶发卡住），与并发度、与本批改动无关。
// 处置：不再按 CI 分流（全平台同池并发），改为**驱动层失败自动重试一次**（见 runOne）。
const ALL_PARALLEL = !process.env.HARNESS_SERIAL;
// CI 恒串行（0.9.209 实测）：GitHub 跑机上"某页子资源偶发拉不动"的根子是**争抢**——
// 现象是驱动层 page.goto 超时、断言零失败、重试常能救回（重试仍失败的并发窗口约 1 分钟），
// 且 2026-10-05 那次失败（本批之前）就是同一形态。核数少 + 每页 1.1MB 产物 + 视频解码叠在
// 2~4 核上，并发页越多越容易撞上。故 CI 一律 CONC=1（串行），本地保持同池并发的提速。
var CONC = Math.max(1, Number(process.env.HARNESS_CONC)
  || (process.env.CI ? 1 : Math.min(6, Math.max(2, Math.floor(os.cpus().length / 4)))));
var serialCases = ALL_PARALLEL ? [] : CASES.filter(function (c) { return c.serial; });
var parCases = ALL_PARALLEL ? CASES : CASES.filter(function (c) { return !c.serial; });
for (var i = 0; i < serialCases.length; i++) await runOne(serialCases[i]);
if (parCases.length) {
  console.log('[info] 并发 ' + CONC + '（' + (ALL_PARALLEL ? '全场景同池' : '时序敏感场景串行独占') + '）');
  var pIdx = 0;
  await Promise.all(Array.from({ length: CONC }, async function () {
    while (pIdx < parCases.length) {
      var c = parCases[pIdx++];
      await runOne(c);
    }
  }));
}

await browser.close();
server.close();
console.log('—— ' + ran + ' 个场景，失败 ' + failed + (retried ? ('（' + retried + ' 个驱动层偶发已重试）') : '') + ' ——');
process.exit(failed ? 1 : 0);
