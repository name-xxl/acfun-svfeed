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
  { name: 'upd-open' } // 0.9.60 更新提示冒烟（mock atom 注入，debug 构建）
];

const CASES = HARNESS_CASES.map(function (c) {
  return {
    name: c.name,
    url: '/test/harness.html?case=' + c.name + (c.release ? '&bundle=release' : ''),
    key: '__HARNESS_RESULTS__'
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

function serve(req, res) {
  var urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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
await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
var port = server.address().port;
console.log('[info] 静态服务 http://127.0.0.1:' + port + '（docroot=' + ROOT + '）');

var browser = await launch();
var failed = 0, ran = 0;

for (var i = 0; i < CASES.length; i++) {
  var c = CASES[i];
  var skip = HEADLESS_SKIP.filter(function (s) { return s.name === c.name; })[0];
  if (skip) { console.log('SKIP ' + c.name + ' — ' + skip.reason); continue; }

  var page = await browser.newPage();
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
