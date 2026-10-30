// ---------- chip 按钮组单源（0.9.305 卫生批⑤·任务①；AGENTS 规矩 3/7） ----------
// 病灶：「同项短路→摘 on→点亮→回调」这套点击协议此前在 zone.js 四组 chip 循环、
// jingxuanview.js mkChip、natpanel.js select 段钮共六处各抄一遍（同一道缝反复出血即
// 结构裁决——规矩 7：修法必须收口到结构层）。本件是协议唯一定义处：消费点只给**表项**
// （items）与**判据/回调**（isOn/onPick），初始高亮与点击短路都问同一个 isOn——DOM 的
// on 态永远与数据态同源，不再各写各的初始 on 参数（zone 子频道行旧写法「全部」无条件
// on 与实际 curSub 漂移的角由此消失）。
// 依赖纪律：只 import ui.js 的 el 工具，零业务零 cfg——表项数据与语义全由消费方注入。
// cls 默认 'acsv-vchip'（zone/精选药丸 chip 皮肤）；natpanel 段钮皮肤传 cls:''（钮上
// 只有选中态类 'on'）。选中类名 'on' 固定（全站样式 .acsv-vchip.on 与 np-seg .on 同词）。
// 返回本批挂载的按钮节点数组（消费点补 data-* 锚用，如 zone boardChips 的 data-board）。
// host 清空不归本件：重挂时机（如 fillSubChips 换分区重拉）由消费点自己 innerHTML=''。
// 皮肤类名归本件管辖（0.9.308 扫描批）：mountChipGroup 的 cls 参数与「借皮肤的单钮」
// （mytabs 卡面 删除/移动/移除收藏、zone 小档行）都引 CHIP_SM——皮肤类串曾五处散写。
import { el } from './ui.js';

export var CHIP_SM = 'acsv-vchip sm'; // 小档皮肤（对应 css .acsv-vchip.sm 规则）

/**
 * @param {{ host: HTMLElement, items: Array<{label:string, data?: any}>,
 *   isOn: (data:any, i:number)=>boolean,
 *   onPick: (data:any, i:number, node:HTMLElement)=>void,
 *   cls?: string }} o
 * @returns {HTMLElement[]}
 */
export function mountChipGroup(o) {
  var host = o.host;
  var cls = o.cls === undefined ? 'acsv-vchip' : o.cls;
  var nodes = [];
  (o.items || []).forEach(function (item, i) {
    var on = !!o.isOn(item.data, i);
    var c = el('button', (cls + (on ? ' on' : '')).trim() || null, item.label);
    c.addEventListener('click', function () {
      if (o.isOn(item.data, i)) return; // 同项短路：不摘不点不回话
      Array.prototype.forEach.call(host.children, function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      o.onPick(item.data, i, c);
    });
    host.appendChild(c);
    nodes.push(c);
  });
  return nodes;
}
