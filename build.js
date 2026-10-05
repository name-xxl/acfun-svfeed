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

// 内嵌 hls.js（npm 依赖，构建时读取）：0.9.164 起以**字符串字面量**内嵌（window.__ACSV_HLS_SRC__），
// 运行时首个 m3u8 挂载前才由 ensureHls new Function 编译执行——页面加载不再编译整份 ~415KB
//（非竖刷页：原生页注入/动态/空间…这些用不到 hls 的会话照付全额编译，是低配机最大固定成本）。
// 0.9.14 的「运行时零网络依赖」目标不变：CDN 逐源兜底仍在，串缺失/损坏时自动接管。
// 缘起：jsdelivr/npmmirror 在部分用户网络均不可达（attach.cdnFail 实测），
// CDN 兜底永远拉不到 hls.js，推荐流被迫走浏览器原生 HLS 管线。
var hlsInline = '';
try {
  hlsInline = '\n// ==== vendored hls.js@' + (JSON.parse(fs.readFileSync('./node_modules/hls.js/package.json', 'utf8')).version)
    + '（构建时内嵌为字符串，首次 ensureHls 再编译——勿手改；npm i hls.js 后重新构建） ====\n'
    + 'window.__ACSV_HLS_SRC__ = ' + JSON.stringify(fs.readFileSync('node_modules/hls.js/dist/hls.min.js', 'utf8'))
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';\n';
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
    + '// @grant        GM_getValue\n'
    + '// @grant        GM_setValue\n'
    + '// @connect      m.acfun.cn\n'
    + '// @connect      www.acfun.cn\n'
    + '// @connect      api-new.app.acfun.cn\n'
    + '// @connect      upload.kuaishouzt.com\n'
    + '// @connect      message.acfun.cn\n'
    + '// @connect      id.app.acfun.cn\n'
    + '// @connect      static.yximgs.com\n'
    + '// @connect      registry.npmmirror.com\n'
    + '// @connect      cdn.jsdelivr.net\n'
    + '// @connect      github.com\n' // 更新检查拉 releases.atom（0.9.60；TM 首次请求会弹授权确认）
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
    define: { __ACSV_DEBUG__: debug ? 'true' : 'false', __ACSV_VERSION__: JSON.stringify(V) },
    // esbuild 的 IIFE 外再包一层，让 'use strict' 指令与拆分前的单文件保持一致；
    // 内嵌 hls.js 字符串放在头注释之后、src IIFE 之外（ensureHls 首调时 new Function 编译，挂 window.Hls）
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
