// ---------- slide/item 跨模块字段契约数据（0.9.297） ----------
// 跨模块挂在 slide 元素 / feed item 对象上的 _xxx 字段的**唯一登记处**。说明读/写方仍在
// attach.js 头注（元素级契约总表），但字段名单以本件为准：`test/check-contract.mjs` 扫描
// 源码里的 slide/sl/item/it 字面量字段，未登记即红——0.9.296 复核时发现 8 个字段只在代码
// 里用、没进 attach 注释，属于「注释即契约」的典型漏网（AGENTS 规矩 7：结构落工具）。
//
// 边界：dmcanvas 的 `it` 是弹幕项（_w/_px/_lane…），不是 feed item，由 check-contract 的
// NON_FEED_IT_FILES 显式豁免；其余 `it._` 按 feed item 字段处理（feedstore/prewarm）。
export var SLIDE_FIELDS = [
  '_session',      // 会话句柄（detachSession 单出口）
  '_resumeAt',     // 续播秒位
  '_userPaused',   // 用户暂停意图
  '_ctlTimer', '_ctlTime', '_ctlPlayBtn', '_ctlFill', '_ctlHandle', '_ctlTrack', '_qBtn',
  '_volOpen',      // 音量滑杆开着
  '_dmLayer',      // 弹幕图层
  '_likeSync', '_favSync', '_banSync', '_cmtSync', '_shareSync', '_followSync', // 计数回填钩子
  '_lastPct',      // 进度条同值缓存（sessionhooks）
  '_lastTimeTxt',  // 时间文案同值缓存（sessionhooks）
  '_descSync',     // 简介回包后重刷（slide）
  '_ctlDmBtn',     // 弹幕开关按钮引用（controls）
  '_dmVideoId'     // 弹幕图层装填标记（danmaku）
];

export var ITEM_FIELDS = [
  '_resolveP',     // 懒解析在途 Promise（api.ensureResolved）
  '_freezeTries',  // 卡帧恢复阶梯计数（session HealthMonitor）
  '_freezeGaveUp', // 阶梯放弃标记（session HealthMonitor）
  '_qManual',      // 用户手选清晰度（禁自动降档）
  '_sprite',       // spriteVtt 缩略图 cue 缓存（controls）
  '_spriteBusy',   // 缩略图拉取在途（controls）
  '_qualitiesAll'  // 编码过滤前的档位全集（quality）
];