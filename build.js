/*
 * 构建脚本：src/（ES 模块）→ 单文件油猴脚本（ESM，package.json type:module）
 *   node build.js          产出 acfun-svfeed.user.js（正式）+ acfun-svfeed.debug.user.js（调试）
 *   node build.js --watch  监听 src/ 变更自动重建
 *
 * 两个产物出自同一份源码，仅 __ACSV_DEBUG__ 注入值不同：
 * 正式构建里 dbg()/dbgInit() 被 define 成 false 后死码消除，运行行为与调试版完全一致。
 */
import esbuild from 'esbuild';
import fs from 'fs';

var V = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;

// 内嵌 hls.js（npm 依赖，构建时读取）：运行时零网络依赖。
// 缘起：jsdelivr/npmmirror 在部分用户网络均不可达（attach.cdnFail 实测），
// CDN 兜底永远拉不到 hls.js，推荐流被迫走浏览器原生 HLS 管线。
// UMD 产物在脚本 IIFE 内执行会挂到沙箱 globalThis → window.Hls，ensureHls 首检即命中
var hlsInline = '';
try {
  hlsInline = '\n// ==== vendored hls.js@' + (JSON.parse(fs.readFileSync('./node_modules/hls.js/package.json', 'utf8')).version)
    + '（构建时内嵌，勿手改；npm i hls.js 后重新构建） ====\n'
    + fs.readFileSync('node_modules/hls.js/dist/hls.min.js', 'utf8') + '\n';
} catch (e) {
  console.warn('[warn] 未找到 node_modules/hls.js/dist/hls.min.js，跳过内嵌（运行时走 CDN 兜底列表）');
}

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
    + '// @updateURL    https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed'
    + (debug ? '.debug' : '') + '.user.js\n'
    + '// @downloadURL  https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed'
    + (debug ? '.debug' : '') + '.user.js\n'
    + '// @match        https://www.acfun.cn/*\n'
    + '// @match        https://message.acfun.cn/*\n'
    + '// @grant        GM_xmlhttpRequest\n'
    + '// @connect      m.acfun.cn\n'
    + '// @connect      www.acfun.cn\n'
    + '// @connect      api-new.app.acfun.cn\n'
    + '// @connect      upload.kuaishouzt.com\n'
    + '// @connect      static.yximgs.com\n'
    + '// @connect      registry.npmmirror.com\n'
    + '// @connect      cdn.jsdelivr.net\n'
    + '// @run-at       document-end\n'
    + '// @noframes\n'
    + '// @license      MIT\n'
    + '// ==/UserScript==';
}

function buildOptions(debug, forWatch) {
  var plugins;
  if (forWatch) {
    // esbuild 0.18+ 移除了 watch 的 onRebuild 回调：用插件 onEnd 钩子拿每次构建（含重建）的结果，
    // 否则改了 src 终端毫无动静，报错也只有静默 warning
    var label = debug ? 'debug' : 'release';
    plugins = [{
      name: 'watch-log',
      setup: function (build) {
        build.onEnd(function (result) {
          if (result && result.errors.length)
            console.error('[' + now() + '] [' + label + '] 构建失败：' + result.errors.length + ' 个错误');
          else console.log('[' + now() + '] [' + label + '] 已构建');
        });
      }
    }];
  }
  return {
    entryPoints: ['src/boot.js'],
    bundle: true,
    format: 'iife',
    target: ['es2018'],
    charset: 'utf8', // 中文文案/CSS 保持原样，不做 \uXXXX 转义
    outfile: debug ? 'acfun-svfeed.debug.user.js' : 'acfun-svfeed.user.js',
    define: { __ACSV_DEBUG__: debug ? 'true' : 'false' },
    // esbuild 的 IIFE 外再包一层，让 'use strict' 指令与拆分前的单文件保持一致；
    // 内嵌 hls.js 放在头注释之后、src IIFE 之外（UMD 自带封装，挂 window.Hls 供 ensureHls 首检）
    banner: { js: userscriptHeader(debug) + hlsInline + '\n(function () {\n\'use strict\';' },
    footer: { js: '\n})();' },
    logLevel: 'warning',
    plugins: plugins
  };
}

function now() {
  return new Date().toLocaleTimeString();
}

async function main() {
  var watch = process.argv.includes('--watch');
  if (watch) {
    var ctxRelease = await esbuild.context(buildOptions(false, true));
    var ctxDebug = await esbuild.context(buildOptions(true, true));
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
