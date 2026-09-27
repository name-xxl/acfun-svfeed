/*
 * 构建脚本：src/（ES 模块）→ 单文件油猴脚本
 *   node build.js          产出 acfun-svfeed.user.js（正式）+ acfun-svfeed.debug.user.js（调试）
 *   node build.js --watch  监听 src/ 变更自动重建
 *
 * 两个产物出自同一份源码，仅 __ACSV_DEBUG__ 注入值不同：
 * 正式构建里 dbg()/dbgInit() 被 define 成 false 后死码消除，运行行为与调试版完全一致。
 */
var esbuild = require('esbuild');
var pkg = require('./package.json');

var V = pkg.version;

function userscriptHeader(debug) {
  return '// ==UserScript==\n'
    + '// @name         AcFun 小视频 - PC 站抖音式竖滑页\n'
    + '// @namespace    https://github.com/name-xxl/acfun-svfeed\n'
    + '// @version      ' + (debug ? V + '-debug' : V) + '\n'
    + '// @description  在 www.acfun.cn 顶部导航加入「小视频」入口，打开全屏抖音式竖滑信息流；支持小视频(meow)与 APP 首页推荐(selection/feed)双内容源、弹幕、清晰度切换'
    + (debug ? '【调试构建：window.__dbg 记录启动埋点】' : '') + '\n'
    + '// @author       name-xxl\n'
    + '// @homepageURL  https://github.com/name-xxl/acfun-svfeed\n'
    + '// @supportURL   https://github.com/name-xxl/acfun-svfeed/issues\n'
    + '// @match        https://www.acfun.cn/*\n'
    + '// @grant        GM_xmlhttpRequest\n'
    + '// @connect      m.acfun.cn\n'
    + '// @connect      www.acfun.cn\n'
    + '// @connect      api-new.app.acfun.cn\n'
    + '// @connect      upload.kuaishouzt.com\n'
    + '// @connect      cdn.jsdelivr.net\n'
    + '// @run-at       document-end\n'
    + '// @noframes\n'
    + '// @license      MIT\n'
    + '// ==/UserScript==';
}

function buildOptions(debug) {
  return {
    entryPoints: ['src/boot.js'],
    bundle: true,
    format: 'iife',
    target: ['es2018'],
    charset: 'utf8', // 中文文案/CSS 保持原样，不做 \uXXXX 转义
    outfile: debug ? 'acfun-svfeed.debug.user.js' : 'acfun-svfeed.user.js',
    define: { __ACSV_DEBUG__: debug ? 'true' : 'false' },
    // esbuild 的 IIFE 外再包一层，让 'use strict' 指令与拆分前的单文件保持一致
    banner: { js: userscriptHeader(debug) + '\n(function () {\n\'use strict\';' },
    footer: { js: '\n})();' },
    logLevel: 'warning'
  };
}

async function main() {
  var watch = process.argv.includes('--watch');
  if (watch) {
    var ctxRelease = await esbuild.context(buildOptions(false));
    var ctxDebug = await esbuild.context(buildOptions(true));
    await Promise.all([ctxRelease.watch(), ctxDebug.watch()]);
    console.log('[watch] 监听 src/ 变更中，Ctrl+C 退出');
  } else {
    await esbuild.build(buildOptions(false));
    await esbuild.build(buildOptions(true));
    console.log('构建完成：acfun-svfeed.user.js + acfun-svfeed.debug.user.js');
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
