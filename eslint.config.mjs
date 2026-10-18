// ESLint flat config：最小规则集。0.9.32 全量评审的结论——项目拥有极好的教训实证
// 注释文化，但零静态检查网（msgText 未定义引用藏了 3 个版本才被人工发现）。
// 故意不做任何风格类约束，只守正确性底线：
//   no-undef                      —— 未定义标识符（msgText 类错误的直接防线）
//   no-unused-vars                —— 死变量/死参数（catch(e) 惯用空捕，显式豁免）
//   no-constant-binary-expression —— `a || b()` 短路掩盖、恒真恒假条件
//   no-restricted-syntax          —— 定向禁令（0.9.78 起）：把"注释即规格"的教训钉成工具规则
// 范围（0.9.257 扩面）：src/ + build.js + test（单测/场景/校验脚本）+ tools。此前 files 只列
// src、test/unit、build.js，命令行里的 `tools` 没有配置对象匹配 ⇒ 规则集为空、静默通过（实测：
// --print-config 对 tools/gen-device-data.js 与 test/cases/views.js 均 rules: 0；
// `eslint src build.js test/unit tools` 退出 0 且零输出——tools 等于从没被检查过）。
// test/cases/*.js 是 harness.html 用 <script src> 挂的经典脚本（IIFE 挂 window.__ACSV_CASES__），
// 其余 test/*.js 是数据桩；test/tmp-probe/（gitignored 的一次性探针）不纳入。
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'test/unit/**/*.js', 'test/cases/**/*.js', 'test/*.mjs', 'test/*.js',
      'tools/**/*.js', 'build.js'],
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
      // 空 catch 一律显式表态：注释说明意图，或走 dbg.swallow 计数/留因。
      // 0.9.264 清点 137 处空捕，按 cleanup/storage/sdk/media/parse/network 分级标注。
      'no-empty': ['error', { allowEmptyCatch: false }],
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
        },
        // 作者占位文案已禁（0.9.82 教训）：作者未知 = item.up 为 null，渲染层不挂作者行
        // ——旧实现把 '未知用户' 写死在 data.js 的两个 normalize 里，于是所有"卡面不带作者"
        // 的入口（搜索/收藏/历史进播放层）都顶着这个假名字，且解析回包后无人刷新 DOM。
        // 作者契约与来源映射见 playitem.js 的 upOf/ITEM_FIELDS，闸门在 test/unit/contract.test.js
        {
          selector: "Literal[value=/未知用户/]",
          message: '作者占位文案已禁（0.9.82）：作者未知就让 up 为 null，不要编造名字'
        }
      ]
    }
  },
  // 图片白名单例外（0.9.80）：下列文件的 <img> 是有意不并入 imgload 的图面——
  //   imgload.js  执行层本体
  //   imcard.js   私信卡片封面：装配层自带"load 才放出/error 隐藏"时序，且要同时喂
  //               Shadow DOM（原生页）与抽屉两套皮肤；并入 imgInto 需先统一时序语义（后续按需评估）
  //   imbubble.js 私信图片气泡（0.9.268 自 imdrawer 拆出）：鉴权 blob 管线（fetchImImageBlob，
  //               0.9.41/0.9.49 真机验收）；imsendui.js（0.9.269 发送 UI 拆出）只剩发送乐观占位的
  //               本地预览 img
  //   emoticon.js 表情图：接口直给 URL + 未命中回落 [表情] 文本，无"封面字段"语义
  //   imgview.js  大图查看器：转呈被点 <img> 的 src（blob/原图形态混杂），非字段加载
  //   rail.js     站点静态图标（SITE_ICONS/VIDEO_ICONS 的 mask/img 探测 + 香蕉弹层）
  //   banpop.js   投蕉数量层（0.9.104 自 rail 抽出共享）：站点静态图标两态切图（banana/bananaOn）
  //   sidebar.js  AcFun logo（站点静态 SVG）
  //   commentkit.js 评论头像框覆盖层（0.9.134）：装饰性 PNG，失败语义=整框摘除（imgInto 的
  //               defaultAvatar 兜底会误盖头像；框仅覆盖层无"封面字段"语义）
  //   inputbar.js 富文本输入条（0.9.238）：图在这是**内容/令牌节点**（表情 img、配图缩略块），
  //               不是封面/头像字段——要能进编辑区、随 execCommand('insertHTML') 进原生撤销栈，
  //               且无"失败降级兜底"语义（图挂了就是挂了，不做占位替换）
  // 注：new Image() 不受禁令（探测/读自然宽高不是页面图面）。新增图面若确有例外，加到这里并注明理由
  {
    files: ['src/imgload.js', 'src/imcard.js', 'src/imsendui.js', 'src/imbubble.js', 'src/emoticon.js',
      'src/imgview.js', 'src/rail.js', 'src/banpop.js', 'src/sidebar.js', 'src/commentkit.js',
      'src/inputbar.js'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name='split'][arguments.0.value='?']",
        message: 'URL 手剥 query 已禁（0.9.40 教训）：走 imgurl.coverUrl / coverAttempts'
      }]
    }
  },
  // 设置共享层单向依赖（0.9.89，D4「共享层禁止 import 皮肤」的机制化）：src/settings.js 是
  // schema+存储的零 UI 共享层，只许 import cfg.js（默认值单一来源）。任何 UI/皮肤/特性模块
  // 混进来都是架构反向（皮肤 → 共享层是唯一允许的方向）——白名单式封死，比黑名单更难绕。
  // 按要求重列基础选择器（flat config 逐文件替换整条规则，不合并）
  {
    files: ['src/settings.js'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "ImportDeclaration:not([source.value='./cfg.js'])",
          message: '设置共享层只许 import ./cfg.js（0.9.89 D4）：schema/存储零 UI，皮肤方向是 皮肤→本层'
        },
        {
          selector: "CallExpression[callee.property.name='split'][arguments.0.value='?']",
          message: 'URL 手剥 query 已禁（0.9.40 教训）：走 imgurl.coverUrl / coverAttempts'
        },
        {
          selector: "CallExpression[callee.name='el'][arguments.0.value='img']",
          message: '图片 DOM 手拼已禁：走 imgload.imgInto（例外见 eslint.config.mjs 白名单）'
        },
        {
          selector: "CallExpression[callee.property.name='createElement'][arguments.0.value='img']",
          message: '图片 DOM 手拼已禁：走 imgload.imgInto（例外见 eslint.config.mjs 白名单）'
        },
        {
          selector: "Literal[value=/未知用户/]",
          message: '作者占位文案已禁（0.9.82）：作者未知就让 up 为 null，不要编造名字'
        }
      ]
    }
  },
  // no-empty 门禁射程收口在 src（0.9.264）：目标是把 src 的 137 处空 catch 钉成显式意图。
  // 测试夹具/工具里另有一批空 catch 与 `else if (…) { }` 写法，属既有夹具形态，不在本轮
  // 收口范围（只改 src/*.js 与 eslint.config.mjs）；非 src 文件维持原规则集。
  {
    files: ['test/unit/**/*.js', 'test/cases/**/*.js', 'test/*.mjs', 'test/*.js',
      'tools/**/*.js', 'build.js'],
    rules: { 'no-empty': 'off' }
  },
  // harness 场景体豁免 no-unused-vars（0.9.257 扩面时发现）：test/cases/*.js 统一按「公共件
  // 参数前置」写——每个场景开头把 h 的全部公共件一次解出（rec/q/slide/cur/key/wait/waitFor/
  // firstVideoReady/…/TEST/CASE/RELEASE/finish），实际只用到其中一部分。这是 0.9.81 自
  // harness.html 原样搬迁时定下的形制（"场景体逐字未改"），不是遗漏；要它零告警就得逐场景删
  // 声明，反而让新增场景更易写错。故本组只关这一条，其余三条照旧生效（no-undef 正是 msgText
  // 类错误的那张网）。
  {
    files: ['test/cases/**/*.js'],
    rules: { 'no-unused-vars': 'off' }
  }
];
