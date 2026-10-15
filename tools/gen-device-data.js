// 生成 src/devicetab.js 的内置设备型号表（0.9.255，数据优化专项）
// 用法: node tools/gen-device-data.js <MobileModels 数据目录>
//   数据目录 = KHwang9883/MobileModels 内容（直接给仓库根亦可，自动下钻 brands/）；
//   目录内可带 Apple_mobile_device_types.txt（gist 下载件，与 apple_all.md 取并集补差）。
//
// 数据许可（与脚本代码的 MIT **分声明**，见 README「设备型号数据许可」段）:
//  - KHwang9883/MobileModels (CC BY-NC-SA 4.0) — 各品牌国行/全球型号
//  - adamawolf/Apple_mobile_device_types (gist) + MobileModels apple_all.md — Apple 识别符
//  ⚠ 数据段非 MIT：署名 + 非商业 + 相同方式共享；禁止把本数据当 MIT 内容再分发
//
// 管线（纯机械，零人工清单；干跑报告见 0.9.255 CHANGELOG）:
//  1. 多源解析（手机+平板章节；笔记本/电视/穿戴/学习机等显式剔除，Apple 全系保留）
//  2. 名称归一（channel/carrier/region/storage 等 14 组规则，见 RULES）
//  3. 同码多名裁决（CN 文件优先 → 最短名 → 字典序），全自动
//  4. 确定性输出（键排序）+ deflateRaw+b64 压缩内嵌（运行时 fflate 惰性解包）
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// ---------- 源清单 ----------

// [文件, 说明]；按报告口径收录（手机+平板）
const BRAND_SOURCES = [
  ['360shouji.md', '360'],
  ['blackshark.md', '黑鲨'],
  ['coolpad.md', '酷派'],
  ['honor_cn.md', '荣耀'],
  ['huawei_cn.md', '华为'],
  ['lenovo_cn.md', '联想'],
  ['letv.md', '乐视'],
  ['meizu.md', '魅族'],
  ['motorola_cn.md', '摩托罗拉'],
  ['nokia_cn.md', '诺基亚'],
  ['nubia.md', '努比亚/红魔'],
  ['oneplus.md', '一加'],
  ['oppo_cn.md', 'OPPO'],
  ['realme_cn.md', 'realme'],
  ['samsung_cn.md', '三星'],
  ['smartisan.md', '锤子/坚果'],
  ['sony_cn.md', '索尼（国行）'],
  ['sony.md', '索尼（全球，补 CN 短板）'],
  ['vivo_cn.md', 'vivo/iQOO'],
  ['xiaomi_cn.md', '小米/Redmi'],
  ['zhixuan.md', '华为智选'],
  ['zte_cn.md', '中兴'],
  ['google.md', 'Google Pixel'],
  ['nothing.md', 'Nothing/CMF'],
  ['asus_cn.md', '华硕/ROG'],
];

// CN 口径文件（裁决第一优先）；其余（sony.md/google/nothing 等）为全球口径
const CN_EXTRA = new Set(['meizu.md', 'oneplus.md', 'smartisan.md', 'nubia.md', 'letv.md', 'blackshark.md', 'coolpad.md', 'zhixuan.md']);
function isCNSource(src) {
  return /_cn\.md$/.test(src) || CN_EXTRA.has(src);
}

// 类别过滤：平板保留（含 Apple 全系），以下章节/型号名显式剔除
const KEEP_TABLET = /平板|Pad|Tab/i;
const DROP_SECTION = /穿戴|手表|手环|笔记本|智慧屏|电视|路由|音箱|耳机|学习机|眼镜|IoT|早期|成立前|Watch|Band|MagicBook|MateBook|TNT|云电脑/;
const DROP_NAME = /MateBook|MagicBook|MacBook|ThinkPad|笔记本|云电脑|TNT go/;

export function shouldKeep(section, name) {
  if (DROP_NAME.test(name)) return false;
  return KEEP_TABLET.test(section) || !DROP_SECTION.test(section);
}

// ---------- 归一规则（顺序即优先级；两轮收敛） ----------

const RULES = [
  ['multi', '多名合并取首段', /\s*\/.*$/],
  ['storage', '存储/内存括号', /\s*\((?:\d+\s*(?:GB|TB)(?:\s*\+\s*\d+\s*(?:GB|TB))?(?:\s*\/\s*\d+\s*(?:GB|TB)(?:\s*\+\s*\d+\s*(?:GB|TB))?)*|\d+\s*(?:GB|TB)\s*内存)\)\s*$/g],
  ['carrier', '运营商/渠道+SKU版', /(移动|联通|电信|运营商)(?:\s*(?:4G\+?|3G|5G|双卡|单卡|NFC|合约|定制|渠道|合作|优先|公开|国行|疾速|标配|高配|顶配|标准|尊享|旗舰|臻享|臻逸|优享|悦享|惊爆|超值))*\s*版/g],
  ['dual', '双网', /双\s*(?:4G\+?|3G|5G)\s*(?:标配|高配|顶配|标准)?\s*版/g],
  ['net', '全网通/双网通(+SKU)版', /(全网通|双网通)\s*(?:标配|高配|顶配|标准|尊享|旗舰|NFC|双卡|单卡)?\s*版?/g],
  ['operator', '裸运营商', /\s*运营商(?:\s*(?:定制|合约|合作|版))*/g],
  ['skuTail', '尾部裸SKU', /\s*(标配|高配|顶配|标准|尊享|旗舰)$/g],
  ['carrierTail', '尾部裸运营商', /\s*(移动|联通|电信)$/g],
  ['region', '区域版', /(国际|海外|欧洲|北美|印度|日本|韩国|澳洲|港|台|美|欧|日|韩|澳|公开|国行)\s*版/g],
  ['uscarrier', '美运营商版', /(T-Mobile|Verizon|Verzion|Sprint|Metro|Visible)\s*版/g],
  ['regionParen', '区域括号', /\s*\((?:North America|Rest of the world|Global|South Korea|US Carrier|India|Japan|Europe|China|Verizon|T-Mobile|Metro|Sprint|Visible)\)/gi],
  ['customParen', '渠道括号', /\s*\((?:公开|国行|电信|移动|联通|运营商)\s*(?:定制|版)?\)/g],
  ['regionTail', '区域尾词', /\s+(?:Global|South Korea|US Carrier|India|North America|Rest of the world)$/i],
  ['4gplus', '裸 4G+', /\s*4G\+/g],
  ['space', '空白收缩', /\s+/g],
];

export function normalizeName(name) {
  let out = String(name).trim();
  for (let pass = 0; pass < 2; pass++) {
    for (const [id, , re] of RULES) out = out.replace(re, id === 'multi' ? '' : (id === 'space' ? ' ' : ''));
    out = out.trim();
  }
  return out;
}

// 同码多名裁决：CN 文件优先 → 最短 → 字典序（确定性，无人工清单）
export function pickWinner(entries) {
  const sorted = entries.slice().sort((a, b) => {
    const ca = isCNSource(a.src) ? 0 : 1, cb = isCNSource(b.src) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name < b.name ? -1 : 1;
  });
  return sorted[0];
}

// ---------- 解析 ----------

// 行格式: `CODE1` `CODE2`: 名称（多码展开）；非反引号开头行跳过
function parseEntries(text, src) {
  const out = [];
  let section = '(none)';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) { section = line.slice(3).trim(); continue; }
    const m = line.match(/^((?:`[^`]+`\s*)+):\s*(.+?)\s*$/);
    if (!m) continue;
    const name = m[2];
    if (!shouldKeep(section, name)) continue;
    for (const code of [...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1])) {
      if (code) out.push({ code, name, src });
    }
  }
  return out;
}

// apple_all.md 头部：** [`M68AP`] iPhone (`iPhone1,1`):** → 识别符（评论里显示的 iPhone3,1 一类）
function parseAppleAll(file) {
  const out = [];
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split('\n')) {
    const m = raw.trim().match(/^\*\*\[`([^`]+)`\]\s*(.+?)\s*\(`([^`]+)`\):\*\*$/);
    if (m) out.push({ code: m[3], name: m[2], src: 'apple_all.md' });
  }
  return out;
}

// gist：iPhone3,1 : iPhone 4（补差用；apple_all 缺的识别符如 iPad1,2）
function parseAppleGist(file) {
  const out = [];
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = raw.trim().match(/^([A-Za-z0-9_,.\-]+)\s*:\s*(.+?)\s*$/);
    if (m && !/^(i386|x86_64|arm64)$/.test(m[1])) out.push({ code: m[1], name: m[2], src: 'Apple_mobile_device_types.txt' });
  }
  return out;
}

// ---------- 主流程 ----------

function main() {
  const arg = process.argv[2];
  if (!arg || !fs.existsSync(arg)) {
    console.error('用法: node tools/gen-device-data.js <MobileModels 数据目录>');
    process.exit(1);
  }
  const dir = fs.existsSync(path.join(arg, 'brands')) ? path.join(arg, 'brands') : arg;

  const entries = [];
  for (const [file, label] of BRAND_SOURCES) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { console.log(`  跳过（缺文件）: ${file}`); continue; }
    const part = parseEntries(fs.readFileSync(p, 'utf8'), file);
    console.log(`  ${file.padEnd(22)} ${String(part.length).padStart(5)} 条 (${label})`);
    entries.push(...part);
  }

  // Apple：apple_all 头部优先，gist 补缺
  const appleAll = parseAppleAll(path.join(dir, 'apple_all.md'));
  const appleIds = new Set(appleAll.map((e) => e.code));
  const gistPath = path.join(dir, 'Apple_mobile_device_types.txt');
  const gistExtra = fs.existsSync(gistPath)
    ? parseAppleGist(gistPath).filter((e) => !appleIds.has(e.code))
    : [];
  const apple = appleAll.concat(gistExtra);
  console.log(`  Apple${' '.repeat(13)} ${String(apple.length).padStart(5)} 条 (apple_all ${appleAll.length} + gist 补 ${gistExtra.length})`);

  // 归一 + 汇总
  const byCode = new Map();
  for (const e of entries.concat(apple)) {
    const name = normalizeName(e.name);
    if (!name) continue;
    if (!byCode.has(e.code)) byCode.set(e.code, new Map());
    const m = byCode.get(e.code);
    if (!m.has(name)) m.set(name, { name, src: e.src });
  }

  // 裁决 + 确定性输出
  const final = {};
  let conflicts = 0;
  for (const code of [...byCode.keys()].sort()) {
    const cands = [...byCode.get(code).values()];
    if (cands.length > 1) conflicts++;
    final[code] = cands.length > 1 ? pickWinner(cands).name : cands[0].name;
  }

  const json = JSON.stringify(final);
  const jsonBytes = Buffer.byteLength(json); // 长度校验用**字节**（UTF-8；中文条目下 ≠ 字符数）
  const b64 = zlib.deflateRawSync(Buffer.from(json)).toString('base64');

  const out = `// ============================================================
//  设备型号内置表（压缩内嵌）— 由 tools/gen-device-data.js 生成，勿手改（0.9.255 数据优化专项）
//  数据来源与许可（与脚本代码的 MIT **分声明**，见 README「设备型号数据许可」段）:
//   - KHwang9883/MobileModels (CC BY-NC-SA 4.0) — 品牌型号文件（手机+平板，${BRAND_SOURCES.length} 源）
//   - adamawolf/Apple_mobile_device_types (gist) + MobileModels apple_all.md — Apple 识别符
//  ⚠ 数据段非 MIT：署名 + 非商业 + 相同方式共享；禁止把本数据当 MIT 内容再分发
//  形态：deflateRaw+base64 压缩串；运行时 devname.unpackDeviceTab 惰性解包（hls 同款纪律）
//  再生成: node tools/gen-device-data.js <MobileModels 数据目录>
//  条目 ${Object.keys(final).length} · 原始字节 ${jsonBytes} · 压缩串 ${b64.length} 字节
// ============================================================
export var DEVICE_TAB_PACKED = '${b64}';
export var DEVICE_TAB_LEN = ${jsonBytes};
export var DEVICE_TAB_COUNT = ${Object.keys(final).length};
`;
  const dst = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'devicetab.js');
  fs.writeFileSync(dst, out, 'utf8');

  console.log(`\n裁决: ${conflicts} 组同码多名（CN 优先 → 最短 → 字典序，全自动）`);
  console.log(`生成 ${dst}: 条目 ${Object.keys(final).length}, 原始 ${(jsonBytes / 1024).toFixed(1)}KB, b64 ${(b64.length / 1024).toFixed(1)}KB`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked && invoked.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();
