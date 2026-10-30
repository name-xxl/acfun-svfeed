# 卫生收口批6（IM/私信域 P2 杂批）—— 子代理交接件

基线 c61d2cc。本件 = README 合并片段 + CHANGELOG「0.9.307」小节草稿 + 遗留登记。
执行侧完成判据：`node --test test/unit/immsg.test.js test/unit/imsend.test.js` 60/60 绿、
域内 16 文件 eslint 0 告警、`npx tsc -p jsconfig.json` 0 错、check-direction 口径 A/B/C 0 条、
新旧令牌正则 12 串恒等验证绿。harness 场景（im-native / im-bubble / badge-delay / sharepanel 家族）
留主会话全场景验证；check-deps 现报本批 5 条新边待 README 合并（合并后应绿——其余红项
chipkit/followadmin→pickpop/input→timefmt/jingxuanview→pageloader/session→quality/sessionhooks→timefmt/
uppage→pageloader/zone→pageloader/ui 自环**非本批**，属并发代理/存量债）。

## 3) README 合并片段

### 3.1 mermaid 依赖图（5 条新边，均为 特性→零依赖叶 / 特性域内互调，check-direction 已绿）

```
- imdrawer --> comments & emoticon & imbadge & imcard & imbubble & imchat & imimage & imlist & imsendui & imsdk & sharepanel & inputbar & overlay & toastmsg
+ imdrawer --> comments & emoticon & imbadge & imcard & imbubble & imchat & imimage & imlist & immsg & imsendui & imsdk & sharepanel & inputbar & overlay & toastmsg

- imlist --> imgload & immsg & imsend & imsdk
+ imlist --> imgload & imbadge & immsg & imsend & imsdk

- imsendui --> imsend & imsdk & toastmsg
+ imsendui --> imsend & imsdk & immsg & toastmsg

- sharepanel --> imsend & imsdk & imgload
+ sharepanel --> imsend & imsdk & imgload & immsg & imbadge
```

（imnative 不再 import cfg.js——CFG 用量归零；cfg 系基础件本就不上精选图，图行无需动。）

### 3.2 模块表行增改

- **immsg.js** 行末追加：`**0.9.307 批6协议/文案/原语单源**：CT 协议表 {TEXT:0,IMAGE:1,QUOTE:12,CARD:10001} 与 QUOTABLE_CT 可引能力表（成员=旧内联白名单）、decodeExtra/encodeExtra extra 编解码原语、findSession 会话查找（imsend/imchat/imnative 三端消费，零新边落点）、fallbackName「用户 <id>」/ IMG_PLACEHOLDER「[图片]」/ QUOTE_STRIP_FALLBACK「[原消息]」展示文案单源（消费点见 imsend/imbubble/imnative/imdrawer/imlist/sharepanel/imsendui）。仍为零依赖叶。`
- **imsend.js** 行末追加：`**0.9.307 批6**：sendCmtShare/sendMomentShare 逐行同构合并为私有 sendExtraShare(inst,targetId,extraKey,payload,text)（两导出改薄壳，第三种转发=加表项）；发送失败码导出单源 SEND_TIMEOUT/SEND_REJECTED（sharepanel indexOf 对账共用，改码即两端同批）；消息构造查表 map[0/1/12] 改引 immsg.CT.*`
- **imbadge.js** 行末追加：`**0.9.307 批6**：unreadBadge(n) 未读显示口径导出单源（>99 封顶「99+」/0 空串），三形态消费=本件顶栏徽标 + imlist 列表行 + sharepanel 面板行`
- **imlist.js** 行末追加：`0.9.307 批6：行名回落走 immsg.fallbackName、未读角标走 imbadge.unreadBadge（角标样式类 .acsv-share-unread 系借用分享面板规则——跨界事实已在位注释登记，CSS 未动）`
- **sharepanel.js** 行末追加：`0.9.307 批6：「消息中心」host 改引 CFG.api.imDownloadBase+'/im'（值恒等，host 单源）；fallbackName/unreadBadge/SEND_* 三处改引单源`
- **imdrawer.js** 行末追加：`0.9.307 批6：会话标题回落名改引 immsg.fallbackName（与 imlist/sharepanel 同口径）`
- **imsendui.js** 行末追加：`0.9.307 批6：图片乐观占位文案改引 immsg.IMG_PLACEHOLDER`
- **imbubble.js** 行末追加：`0.9.307 批6：图片 CT 判定/占位文案/引用条空预览占位改引 immsg 单源；10001 卡 href 拼装改引 imcard.videoHrefOf；quoteStrip 与 imnative.quoteStripEl 双形态豁免+「两套选择器无契约测试」登记注释`
- **imnative.js** 行末追加：`0.9.307 批6：CT/findSession/QUOTE_STRIP_FALLBACK/videoHrefOf 改引单源（CFG import 用量归零移除）；列表占位改写类型表与 QUOTABLE_CT 的集合差异已注释登记（有意并存勿并表）`
- **imchat.js** 行末追加：`0.9.307 批6：会话查找三处改引 immsg.findSession；dayLabel/chatTime 四档日期梯合一为文件内 dayTier（86400000/604800000/'日一二三四五六' 单写，文案差异留各消费点）`
- **imcard.js** 行末追加：`0.9.307 批6：videoHrefOf(r) 导出（RT==video2 判定+videoBase 拼装，与 imbubble/imnative 两份逐字收口；RT 数字用本件常数 RT_VIDEO=2，不 import contract）；quoteCardCore 私有件抽 cshareCard/mcard 同族前段（根类/href 块/引用块富渲染与 wire 降级/[img] 看大图委托），尾部小条与配图行差异留各卡`
- **imimage.js** 行末追加：`0.9.307 批6：KS_PREFIX='ks://' 一处派生（两写正则改 RE_KS、slice(5) 魔数改 KS_PREFIX.length）`
- **inputbar.js** 行末追加：`0.9.307 批6：emot/img 令牌正则字符类单源 CLS_PKG/CLS_ID/CLS_ALT/CLS_ANY，锚定式与全局扫描式 TOKEN_SCAN 均由其派生（匹配集恒等已对 12 串样本机械验证）；与 emoticon 渲染方言互指注释登记（不同契约，有意不并）`
- **emoticon.js** 行末追加：`0.9.307 批6：emotify 渲染方言与 inputbar 输入方言互指注释登记`
- **upload.js** 行末追加：`0.9.307 批6：FORM_URLENC='application/x-www-form-urlencoded' 本件常数收两处 header（cfg/net 不归本批——长期应进 net 供全项目引用）`
- **searchhist.js / cases/msg.js / contract.js 行**：无变化（⑨⑩为核实项，见 5 断言清单附注）。

## 4) CHANGELOG「0.9.307」小节草稿

```markdown
## 0.9.307 —— 卫生收口批6：IM/私信域 P2 杂批（协议表/文案/编解码/会话查找/双写小项 十项收口）

病灶（六域审计 IM 域 P1#3/#5/#6/#9 + P2）与修法（行为零变化，协议数字/串值/渲染结构/双端观感全不动）：

1. **contentType 裸数字六文件散写**：协议号 0/1/12/10001 在 immsg/imsend/imbubble/imnative 各比较处
   裸写——站方扩类型即多点漂移。→ immsg 导出 `CT={TEXT:0,IMAGE:1,QUOTE:12,CARD:10001}` 单源，
   比较处/`messageConstructorMap` 查表处全改引；isQuotable 内联白名单表化为 `QUOTABLE_CT`
   能力表（成员集合逐字不变 {TEXT,IMAGE,CARD,QUOTE}，reference 通道禁 CARD 的第二判留原样）。
   imnative 列表占位改写清单 {CARD,QUOTE} 与 QUOTABLE_CT 的**集合差异是有意并存**，注释登记。
2. **未读徽标口径三写**（imbadge.badgeText/imlist 行/sharepanel 行各一份 `>99?'99+'`）→
   imbadge 导出 `unreadBadge(n)` 三处消费；imlist 角标借用 `.acsv-share-unread` 样式类的
   跨界事实注释登记（CSS 未动）。
3. **回落名/占位串散写**：`'用户 '+id` 三处 → immsg.fallbackName；`'[图片]'` 四处（预览/气泡
   降级×2/乐观占位）→ IMG_PLACEHOLDER；`'[原消息]'` 两处（双端引用条）→ QUOTE_STRIP_FALLBACK。
   wire 侧「原消息」（无括号，官方可读契约）与显示侧两形态有意并存，注释划界。
   imsend.fetchCards 行内缺省「A站用户」核实为**不同语义**（回包含行但 name 空 vs 拿不到联系人
   名按 id 兜底），保留字面+注释缘由。
4. **sendCmtShare/sendMomentShare 逐行同构** + extra 编解码样板三写/三写 → 私有
   `sendExtraShare(inst,targetId,extraKey,payload,text)` 合一（两导出改薄壳，未来第三种转发=
   加表项不复制管线）；immsg 导出 `decodeExtra(u8)`/`encodeExtra(obj)` 原语（三解码点+三编码点
   共用；encodeExtra 内部吞异常=旧「extra=null 继续发」语义，外层 try 保持原位）。
5. **按 targetId 找会话六处各写**（imsend×1/imchat×3/imnative×2）→ immsg.`findSession(sessions,
   targetId)`（String 全等口径不变；落点选 immsg 非 imsend：三消费方均已 import immsg，
   零新依赖边——imsdk 不许动前提下唯一零新边解；容错契约同 immsg 全体：脏输入不抛落 null）。
6. **ks:// 三份同实**（imimage 两写正则+slice(5) 魔数）→ 本件常数 `KS_PREFIX` 一处派生
   `RE_KS`。**发送码 'send-timeout'/'send-rejected' 生成端与 sharepanel indexOf 对账端各持
   字面** → imsend 导出 SEND_TIMEOUT/SEND_REJECTED，对账语义（前缀匹配非全等）注释保留。
   sharepanel「消息中心」`https://message.acfun.cn/im` 绕 CFG → cfg 既有 `api.imDownloadBase`
   同 host，改拼装引用（值恒等）；若日后页面/下载 host 分家需 cfg 专列 imChatHost（登记待命）。
7. **双写小项**：10001 卡 `Number(resourceType)===2 && resourceId ? videoBase+…` 两份逐字 →
   imcard.videoHrefOf（RT 数字用 imcard 本件常数 RT_VIDEO=2，注释指向 contract.RT.VIDEO，
   不 import contract）；imchat.dayLabel/chatTime 四档日期梯整套两写（86400000/604800000/
   星期表各两份）→ 文件内 dayTier 合一，文案差异（今天前缀/刚刚档/时分后缀）留各消费点；
   imcard.mcard vs cshareCard 骨架同族（头注自认）→ 抽 quoteCardCore 共前段，尾部差异留各卡；
   imnative.quoteStripEl vs imbubble.quoteStrip 属双端渲染豁免边缘 → 不抽，加「两套形态选择器
   无契约测试钉同步」互登注释（仅文案层 QUOTE_STRIP_FALLBACK 已单源）。
8. **inputbar emot/img 令牌正则双方言手写两遍**（锚定式 :57-58 vs 内联全局式 :208）→
   字符类常量 CLS_* 单源派生三式（全局式 img 体保持惰性=匹配集恒等，new RegExp 构造；
   模块级 g 式复用前显式归零 lastIndex）；与 emoticon 渲染方言加互指注释（不同契约有意不并；
   ubb 侧不归本批未碰）。upload.js 两处 'application/x-www-form-urlencoded' → 本件常数
   FORM_URLENC（cfg/net 不可动；长期应进 net，登记于本件）。
9. searchhist HIST_MAX=8 现场注释已写清「站方上限（splice(8) 实证）」——核实现场即止，
   README 10 词漂移归主会话处理。
10. cases/msg.js 场景体核实：harness 以 window.__ACSV_CASES__ 全局函数注入（无 ES import 面），
    10001 仅注释形态出现、夹具字面实际在 imdrawer testHook——按任务 fallback 保留字面并加
    「=immsg.CT.CARD 对账；引表则表漂移与装配漂移互相掩护」注释。

测试证据：immsg.test 51 既有 + 5 新增（CT 值钉死/QUOTABLE_CT 成员集合钉死/展示文案三串钉死/
decodeExtra↔encodeExtra 往返+坏形 null/findSession 匹配与容错）node --test 60/60 绿；
imsend.test（imsdk 水位）5/5 绿不受波及；purity/inputbar-colors 绿；域内 eslint 0 告警；
tsc(jsconfig) 0 错；check-direction 口径 A/B/C 0 条；新旧令牌正则 12 样本串 matchAll 全等
（多 img 块/换行 URL/坏括号/空 alt/无逗号包名边界）。反跑口径：摘任一条 CT/文案/码常量替换
（把消费点改回错值）对应单测即红——CT 值→parseCard/quoteOf 整批夹具红；QUOTABLE_CT 成员→
isQuotable 用例红；占位串→previewOfMessage/新钉用例红；sendExtraShare/encodeExtra→extra 往返
用例红；findSession→新钉用例红。harness 全场景留主会话。
```

## 5) 断言清单（本批绿的全部机械证据）

1. `node --test test/unit/immsg.test.js` 56/56（51 既有零改动全绿 + 5 新增）。
2. `node --test test/unit/imsend.test.js` 4/4（实为 imsdk 水位件，import 面未碰）。
3. `node --test test/unit/purity.test.js test/unit/inputbar-colors.test.js` 全绿（inputbar 改形不改语义）。
4. `npx eslint` 域内 16 文件（immsg/imsend/imsendui/imdrawer/imlist/imchat/imcard/imbubble/imbadge/imnative/imimage/sharepanel/upload/inputbar/emoticon + immsg.test）0 error 0 warning。
5. `npx tsc -p jsconfig.json` exit 0（immsg 系 @ts-check 件，扩导出后契约面仍净）。
6. `node test/check-direction.mjs` 口径 A/B/C 均 0 条（5 新边全是 特性→零依赖叶/特性域内互调）。
7. 正则恒等验证（本批临时 node 脚本）：EMOT_CODE/IMG_CODE/TOKEN_SCAN 新旧对 12 组样本 matchAll
   输出（index+全文+捕获组）逐串相等——含双 [img] 块贪心边界、`[emot=a,b/c/]` 类非法形、空 alt。
8. 残留字面 grep 扫尾：`'用户 '`/`'[图片]'`/`'[原消息]'`/`>99?'99+'`/`'send-timeout'`/`'send-rejected'`/
   `slice(5)`/ks 正则/`86400000`/`604800000`/`日一二三四五六`/form-urlencoded 在域内 19 文件中
   仅存于单源定义处与注释（逐处行号见交接报告）。

## 遗留登记（转主会话/后续批）

- **check-deps 5 条新边**待 3.1 合并 README 后转绿；其余红项（chipkit 节点缺失、followadmin→pickpop、
  input→timefmt、jingxuanview→pageloader、session→quality、sessionhooks→timefmt、uppage→pageloader、
  zone→pageloader、ui→ui 自环）非本批文件，属并发代理/存量债。
- **README「HIST_MAX 10 词」漂移**（⑨）归主会话；searchhist 现场注释无需动。
- **net FORM_URLENC**：'application/x-www-form-urlencoded' 全 src 仍散 9 处（本批仅收 upload.js 2→1）；
  imimage.js:22 一份在域但未并（imimage→upload 反向边不成立），待 net 域增导出后一次收口。
- **cfg 可选 imChatHost**：sharepanel 现复用 api.imDownloadBase（同 host 值恒等）；若站方页面/下载
  host 分家，cfg 需专列 imChatHost 字段。
- **sidebar.js:79 注释陈旧**：仍称「imdrawer badgeText 同语义」——badgeText 0.9.163 已迁 imbadge、
  本批又更名 unreadBadge；sidebar 非本域文件，请主会话顺手校准该注释。
- **docs/api-research.md 无 IM contentType 专节**：CT 表注释按现状引「本文件头注真机在册 +
  api-research 本地留档语境」；如需精确节号锚点，建议主会话补 IM 域实测节。
- **chatTime 星期档测量口径微差**：合一后按 dayTier `now.getTime()-ts`（与 dayLabel 原口径一致），
  旧实现为更早一拍 `Date.now()-ts`——仅恰好跨 7 天毫秒边界时可差一档，两函数互一致优先于
  微秒级原样性，行为差异为零实际影响（如实登记）。
- **loadChat 找会话 poisoned-getter 理论差**：旧 `ss.some` 在 try 外（异常走连接失败 UI）；新
  findSession 恒不抛（异常落 openSession 兜底路径）。仅对「内核回毒对象」的病态形成立，
  与 immsg 全体「不抛只降级」契约一致（如实登记）。
