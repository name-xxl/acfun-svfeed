/*
 * 环境全局声明（0.9.233）：油猴/站点/构建期注入的全局，tsc 不认识——本文件**只声明、不运行**。
 * 全局作用域声明文件（无 import/export）：不参与打包（esbuild 只见 import 图）、不进依赖图
 * （check-deps 只扫 src/*.js）、eslint 不扫 types/。
 *
 * 约定例外说明：项目「不改造、不写 .ts——只用 tsc 读 JSDoc」（jsconfig.json 头注释），本文件
 * 是唯一例外——纯声明件的类型信息载体，不含任何实现。覆盖范围 = 契约面 10 件实测报错的精确
 * 清单（0.9.233 实测 17 条错误全为环境全局，0 条逻辑/类型错误）；后续扩面新增 @ts-check
 * 文件时按实测错误增补（不预写猜测项）。
 */

// —— 构建期 define 注入（build.js buildOptions.define） ——
declare const __ACSV_DEBUG__: boolean;
declare const __ACSV_VERSION__: string;

// —— 油猴 API（userscript 头 @grant：GM_xmlhttpRequest / GM_getValue / GM_setValue） ——
declare function GM_xmlhttpRequest(details: any): any;
declare function GM_getValue(key: any, def?: any): any;
declare function GM_setValue(key: any, value: any): void;

// —— 页面 world 注入 / 浏览器厂商扩展 ——
interface Window {
  // harness 测试缝（bundle 前预置或运行时挂）
  __ACSV_MOCK__?: any;
  __ACSV_MOCK_HOME__?: any;
  __ACSV_MOCK_FORM__?: any;
  __ACSV_MOCK_DIRECT__?: any;
  __ACSV_TEST_WEBM__?: any;
  // 旧内核 MediaSource 前缀实现（session.js 探测用）
  WebKitMediaSource?: any;
}
