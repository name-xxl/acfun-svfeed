// ---------- 内嵌压缩串解包（0.9.258／审计批② P0-1；单源助手） ----------
// deflateRaw+base64 → 原文：**三处内嵌串共用的唯一解包实现**（hls.light.min.js / devicetab /
// cssraw 模板，均由 build.js 构建期压缩注入）。hls.unpackHls 与 devname.unpackDeviceTab 都只剩
// 本助手的薄壳（各自补自己的失败打点）——AGENTS 规则 3：不许再造第二份"看着一样"的解包。
//
// len = 构建期同一处算出的**原始字节数**（__ACSV_HLS_LEN__ / DEVICE_TAB_LEN / __ACSV_CSS_LEN__），
// 是完整性双保险：fflate 对截断/损坏流快速抛错（实测「unexpected EOF」），length 不符再兜一道
// （选型实录见 hls.js 头注——tiny-inflate 对截断流死循环，曾被单测抓出）。
// 失败一律返回 null、绝不抛：调用方各自降级（hls 下沉 CDN 链 / devicetab 回落空表 / styles 空模板）。
// 串或 len 缺失视为"本来就没有内嵌串"，不算失败、也不触发 onFail（与压缩前的既有语义一致）。
//
// onFail(why, msg)：可选诊断钩子，why='len'（长度不符）| 'err'（解包抛错，msg=异常摘要）。
// 带钩子而不是在本件里打点，是为了保持打点键从调用方发出（hls.unpackLen / hls.unpackErr 的读数
// 沿革照旧）；本件也因此零依赖（不 import dbg）。
import { inflateSync } from 'fflate';

export function unpackText(packed, len, onFail) {
  try {
    if (!packed || !len) return null;
    var bin = atob(String(packed));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
    var out = inflateSync(bytes);
    if (!out || out.length !== len) { if (onFail) onFail('len'); return null; }
    return new TextDecoder('utf-8').decode(out);
  } catch (e) {
    if (onFail) onFail('err', String((e && e.message) || e));
    return null;
  }
}
