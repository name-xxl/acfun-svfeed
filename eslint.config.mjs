// ESLint flat config：最小规则集。0.9.32 全量评审的结论——项目拥有极好的教训实证
// 注释文化，但零静态检查网（msgText 未定义引用藏了 3 个版本才被人工发现）。
// 故意不做任何风格类约束，只守正确性底线：
//   no-undef                      —— 未定义标识符（msgText 类错误的直接防线）
//   no-unused-vars                —— 死变量/死参数（catch(e) 惯用空捕，显式豁免）
//   no-constant-binary-expression —— `a || b()` 短路掩盖、恒真恒假条件
// 范围：src/ + build.js + 单测；test/ 下的浏览器夹具（harness.html 内联脚本与
// feed-sample 等数据桩）非模块代码，不纳入。
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'test/unit/**/*.js', 'build.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser, ...globals.node,
        __ACSV_DEBUG__: 'readonly',
        __ACSV_VERSION__: 'readonly',
        // Tampermonkey 沙箱注入（@grant 与跨 world 访问）
        GM_xmlhttpRequest: 'readonly', unsafeWindow: 'readonly',
        GM_getValue: 'readonly', GM_setValue: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-constant-binary-expression': 'error'
    }
  }
];
