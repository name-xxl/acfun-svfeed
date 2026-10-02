// ESLint flat config：最小规则集。0.9.32 全量评审的结论——项目拥有极好的教训实证
// 注释文化，但零静态检查网（msgText 未定义引用藏了 3 个版本才被人工发现）。
// 故意不做任何风格类约束，只守正确性底线：
//   no-undef                      —— 未定义标识符（msgText 类错误的直接防线）
//   no-unused-vars                —— 死变量/死参数（catch(e) 惯用空捕，显式豁免）
//   no-constant-binary-expression —— `a || b()` 短路掩盖、恒真恒假条件
//   no-restricted-syntax          —— 定向禁令（0.9.78 起）：把"注释即规格"的教训钉成工具规则
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
      'no-constant-binary-expression': 'error',
      'no-restricted-syntax': ['error',
        // URL 手剥 query 已禁：0.9.40 实锤（剥参数会把带签名的图整条清空）。
        // 归一与失败重试链在 imgurl.coverUrl/coverAttempts（query 一律保留）
        {
          selector: "CallExpression[callee.property.name='split'][arguments.0.value='?']",
          message: 'URL 手剥 query 已禁（0.9.40 教训）：走 imgurl.coverUrl / coverAttempts'
        },
        // 图片 DOM 手拼已禁（0.9.80）：项目图片字段（封面/头像）一律走 imgload.imgInto
        // （归一 + 重试 + 终败降级 + 死链备忘）。例外文件见下方覆盖块，各自带理由
        {
          selector: "CallExpression[callee.name='el'][arguments.0.value='img']",
          message: '图片 DOM 手拼已禁：走 imgload.imgInto（例外见 eslint.config.mjs 白名单）'
        },
        {
          selector: "CallExpression[callee.property.name='createElement'][arguments.0.value='img']",
          message: '图片 DOM 手拼已禁：走 imgload.imgInto（例外见 eslint.config.mjs 白名单）'
        }
      ]
    }
  },
  // 图片白名单例外（0.9.80）：下列文件的 <img> 是有意不并入 imgload 的图面——
  //   imgload.js  执行层本体
  //   imcard.js   私信卡片封面：装配层自带"load 才放出/error 隐藏"时序，且要同时喂
  //               Shadow DOM（原生页）与抽屉两套皮肤；并入 imgInto 需先统一时序语义（后续按需评估）
  //   imdrawer.js 私信图片气泡：鉴权 blob 管线（fetchImImageBlob，0.9.41/0.9.49 真机验收）
  //   emoticon.js 表情图：接口直给 URL + 未命中回落 [表情] 文本，无"封面字段"语义
  //   imgview.js  大图查看器：转呈被点 <img> 的 src（blob/原图形态混杂），非字段加载
  //   rail.js     站点静态图标（SITE_ICONS/VIDEO_ICONS 的 mask/img 探测 + 香蕉弹层）
  //   sidebar.js  AcFun logo（站点静态 SVG）
  // 注：new Image() 不受禁令（探测/读自然宽高不是页面图面）。新增图面若确有例外，加到这里并注明理由
  {
    files: ['src/imgload.js', 'src/imcard.js', 'src/imdrawer.js', 'src/emoticon.js',
      'src/imgview.js', 'src/rail.js', 'src/sidebar.js'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name='split'][arguments.0.value='?']",
        message: 'URL 手剥 query 已禁（0.9.40 教训）：走 imgurl.coverUrl / coverAttempts'
      }]
    }
  }
];
