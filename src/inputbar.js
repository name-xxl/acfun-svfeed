// ---------- 抽屉输入栏（0.9.41 收敛：评论/私信共用同一套 DOM/CSS/行为） ----------
// 此前两栏各自一份（.acsv-cinput* / .acsv-im-*），观感漂移：圆角不一致、发送键一药丸
// 一圆角、自动增高只有评论有。差异语义由 opts 注入：
//   img         {title, onFile} 图片按钮 + 隐藏 file input；IM 发图消息 / 评论插配图代码
//   placeholder / maxLength / onSend
// 行为统一：Enter 发送（Shift 换行）、Esc 失焦、栏内按键 stopPropagation、输入自动
// 增高 36→96（清空后由调用方调 fitHeight 收回，发送多为异步成功才清，不宜代劳）。
// 表情按钮只建不挂面板——面板锚定两栏不同，调用方拿 emotBtn 自行 mountEmotButton
import { el, elHtml } from './ui.js';
import { ICONS } from './styles.js';

export function buildInputBar(opts) {
  var box = el('div', 'acsv-cinput');
  var emotBtn = elHtml('button', 'acsv-cinput-emot', ICONS.smiley);
  emotBtn.title = '表情';
  box.appendChild(emotBtn);
  var imgBtn = null, fileInp = null;
  if (opts.img) {
    imgBtn = elHtml('button', 'acsv-cinput-img', ICONS.image);
    imgBtn.title = opts.img.title || '插入图片';
    fileInp = el('input');
    fileInp.type = 'file';
    fileInp.accept = 'image/*';
    fileInp.style.display = 'none';
    imgBtn.addEventListener('click', function (ev) { ev.stopPropagation(); fileInp.click(); });
    fileInp.addEventListener('change', function () {
      var f = fileInp.files && fileInp.files[0];
      fileInp.value = '';
      if (f) opts.img.onFile(f);
    });
    box.appendChild(imgBtn);
    box.appendChild(fileInp);
  }
  var input = el('textarea', 'acsv-cinput-text');
  input.rows = 1;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.maxLength) input.maxLength = opts.maxLength;
  box.appendChild(input);
  var send = el('button', 'acsv-cinput-send', '发送');
  box.appendChild(send);
  box.addEventListener('click', function (ev) { ev.stopPropagation(); });
  // 输入自动增高（1~4 行，超出滚动）
  function fitHeight() {
    input.style.height = 'auto';
    input.style.height = Math.min(Math.max(input.scrollHeight, 36), 96) + 'px';
  }
  input.addEventListener('input', fitHeight);
  input.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); opts.onSend(); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); input.blur(); }
  });
  send.addEventListener('click', function (ev) { ev.stopPropagation(); opts.onSend(); });
  return { box: box, emotBtn: emotBtn, input: input, send: send, imgBtn: imgBtn, fileInp: fileInp, fitHeight: fitHeight };
}

// 引用/回复 chip（0.9.47 收敛：私信引用与评论回复共用，置于输入条上方独立一行，原
// 评论的栏内红药丸 .acsv-creply 废弃）。label 文案与显隐由调用方按态驱动；× 只管取消
export function buildQuoteChip(onCancel, xTitle) {
  var box = el('div', 'acsv-quotechip');
  box.style.display = 'none';
  var label = el('span', 'acsv-quotechip-label');
  var x = el('button', 'acsv-quotechip-x', '✕');
  x.title = xTitle || '取消';
  x.addEventListener('click', function (ev) { ev.stopPropagation(); onCancel(); });
  box.appendChild(label);
  box.appendChild(x);
  return { box: box, label: label };
}
