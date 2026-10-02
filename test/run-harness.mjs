/*
 * harness 无头驱动：Playwright 逐场景加载 test/harness.html（release 构建）与
 * test/dm-smoke.html，等页内断言写完（__HARNESS_RESULTS__/__DM_RESULTS__.done），
 * 汇总失败项，非 0 退出码供 CI 拦截。
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
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);

// headless 下因环境差异（合成器/解码器）确认跑不了的场景放这里，须注明原因——
// 不允许静默跳过：加名时必须带理由字符串。
const HEADLESS_SKIP = [
  // { name: 'xxx', reason: '…' }
];

// bundle 选择原则：
//  - release：只跑不依赖 __ACSV_TEST__（或已做防御）的场景，覆盖正式产物；
//  - debug：用 TEST 模拟缝做断言的场景（stall-*/prewarm/quality-switch/watch-report 等）
//    本就是按 debug 构建写的——TEST 缺失时场景脚本会抛错，done 永不置位（表现为驱动超时）。
const HARNESS_CASES = [
  { name: 'smoke', release: true },
  { name: 'homeswitch' },
  { name: 'fastswipe' },
  { name: 'resolvefail', release: true },
  { name: 'prewarm' },
  { name: 'stall-frozen' },
  { name: 'stall-slow' },
  { name: 'stall-healthy' },
  { name: 'cdn-fallback' },
  { name: 'quality-switch' },
  { name: 'dispose-mid-recovery' },
  { name: 'stall-visibility' },
  { name: 'spinner-recover' },
  { name: 'watch-report' },
  { name: 'upd-open' }, // 0.9.60 更新提示冒烟（mock atom 注入，debug 构建）
  { name: 'view-my' }, // 0.9.62 我的视图冒烟（hash 子路由 + __ACSV_MOCK_FORM__ 缝，debug 构建）
  // 0.9.76 封面加载策略（URL 归一/失败重试/终败降级）：/flaky-cover.png 首拉 404 再拉 200
  // 走通重试链；/nope-404.png 死链走降级占位。依赖 debug 构建的 __ACSV_MOCK_FORM__ 缝
  { name: 'cover-fallback' },
  { name: 'view-zone' }, // 0.9.62 分区榜单视图冒烟（渠道/榜期切换 + 契约过滤，debug 构建）
  { name: 'view-search' }, // 0.9.72 搜索视图冒烟（搜索页 SSR HTML mock → 抖音式结果卡，debug 构建）
  { name: 'play-deep' }, // 0.9.74 播放层深链冒烟（直挂缝/坏形态/未命中错误盒/清晰度隔离，debug 构建）
  // 0.9.73 顶栏四界面复用 + 抽屉避让推广：抽屉×视图的避让几何/降级/Esc 链（imOpenSmoke 缝）
  { name: 'view-im' },        // 宽视口：正文右缘收窄到抽屉左缘 + 顶栏右组让位 + Esc 链
  { name: 'view-im-narrow', viewport: { width: 1000, height: 720 } }, // 中窄视口（<CFG.view.avoidW）：降级纯覆盖
  // 0.9.72 深链冒烟：hash 须在 bundle 前写好（冷启动深链路径）+ __ACSV_MOCK_FORM__ 的
  // douga/info 桩 + TEST.feed 断言，故全为 debug 构建
  { name: 'deeplink-sv' },      // v 标记形态置顶 + 挂载态就地跳转（不重置缓冲）
  { name: 'deeplink-bare' },    // 0.9.72 前的裸数字形态：靠探测出 meow
  { name: 'deeplink-ac' },      // a 标记形态（推荐 acId）经 douga 详情置顶
  { name: 'deeplink-switch' },  // 源记忆=推荐 时深链仍须落地（源随链接走）
  { name: 'deeplink-miss' }     // 两空间都查不到：错误盒，不许静默重随机
];

const CASES = HARNESS_CASES.map(function (c) {
  return {
    name: c.name,
    url: '/test/harness.html?case=' + c.name + (c.release ? '&bundle=release' : ''),
    key: '__HARNESS_RESULTS__',
    viewport: c.viewport // 少数场景需要特定视口（如 avoidW 护栏的窄态）；缺省用 Playwright 默认 1280×720
  };
}).concat([{
  // dm-smoke 固定加载 debug 构建（依赖 testHook 模拟缝），自身确定性泵帧
  name: 'dm-smoke',
  url: '/test/dm-smoke.html',
  key: '__DM_RESULTS__'
}, {
  // im-open 私信抽屉开启冒烟（debug 构建 testHook 模拟缝）：0.9.49 quoteChip 回归哨兵
  name: 'im-open',
  url: '/test/im-open.html',
  key: '__IM_RESULTS__'
}]).filter(function (c) {
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
const pathHits = {};

function serve(req, res) {
  var urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/__hits') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(pathHits));
  }
  if (urlPath === '/flaky-cover.png' || urlPath === '/nope-404.png') {
    pathHits[urlPath] = (pathHits[urlPath] || 0) + 1;
  }
  if (urlPath === '/flaky-cover.png') {
    if (pathHits[urlPath] < 2) { res.writeHead(404); return res.end('not found'); }
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
var failed = 0, ran = 0;

for (var i = 0; i < CASES.length; i++) {
  var c = CASES[i];
  var skip = HEADLESS_SKIP.filter(function (s) { return s.name === c.name; })[0];
  if (skip) { console.log('SKIP ' + c.name + ' — ' + skip.reason); continue; }

  var page = await browser.newPage(c.viewport ? { viewport: c.viewport } : undefined);
  try {
    await page.goto('http://127.0.0.1:' + port + c.url, { waitUntil: 'load' });
    await page.waitForFunction(
      function (k) { return window[k] && window[k].done === true; },
      c.key,
      // 场景内部等窗均为有界等待，120s 足够；超时多半是场景脚本抛错（TEST 依赖与 bundle 不匹配）
      { timeout: 120000, polling: 500 }
    );
    var res = await page.evaluate(function (k) { return window[k]; }, c.key);
    ran++;
    var bad = res.results.filter(function (r) { return !r.pass; });
    if (bad.length) {
      failed++;
      console.log('FAIL ' + c.name + '  (' + (res.results.length - bad.length) + '/' + res.results.length + ' 断言通过)');
      bad.forEach(function (r) { console.log('     ✗ ' + r.name + (r.info ? '  (' + r.info + ')' : '')); });
    } else {
      console.log('PASS ' + c.name + '  (' + res.results.length + ' 断言)');
    }
  } catch (e) {
    failed++;
    ran++;
    console.log('FAIL ' + c.name + '  (驱动层：' + e.message.split('\n')[0] + ')');
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();
console.log('—— ' + ran + ' 个场景，失败 ' + failed + ' ——');
process.exit(failed ? 1 : 0);
