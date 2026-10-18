// ---------- 私信发送 UI 簇（0.9.269 自 imdrawer.js 拆出，逐字搬迁） ----------
// 聊天气泡的**乐观占位与失败重试**（文本/引用/图片）+ 图片尺寸读取。SDK 连接/补丁在 imsdk.js，
// 发送确认与恢复链（doSend/sendQuote/sendImage/forceSync）仍在 imsend.js，本件只做
// 「上屏占位 → 调内核 → 成功摘占位补真身」的 UI 编排。
// 本件**不 import imdrawer**——抽屉/会话态、引用 chip、时间分割与轮询由工厂 env 注入，避免回边。
import { CFG } from './cfg.js';
import { el } from './ui.js';
import { ensureIm, ensureConnected, ensureTracer, linkOk } from './imsdk.js';
import { doSend, sendQuote, sendImage, forceSync } from './imsend.js';
import { errLong, errImgTooBig } from './toastmsg.js';

// env 契约：
//   getDrawer()      当前抽屉态（bubbles / setText / input）
//   getChat()        当前会话态（targetId / quote）
//   getBubble()      气泡 kit（quoteStrip / imTextHtml 两个渲染原件复用，防第二份实现）
//   maybeDayDiv(ts)  时间分割线（imchat.maybeDayDiv）
//   setQuote(q)      写引用 chip（imchat.setQuote）
//   chatPollOnce(inst, reset)  立即增量拉一拍上屏（imchat.chatPollOnce）
export function createSendKit(env) {
  var getDrawer = env.getDrawer, getChat = env.getChat, getBubble = env.getBubble;
  var maybeDayDiv = env.maybeDayDiv, setQuote = env.setQuote, chatPollOnce = env.chatPollOnce;

  // 图片即选即发（微信/抖音 IM 惯例，不插入文本框）：读自然宽高 → 乐观占位（本地预览）→
  // sendImage（SDK 内核自动传图床换 ks://，确认含上传故用 imgSendT）→ 成功摘占位补真身。
  // File 留在闭包，失败点击重试整条重走（ImageMsg 每次新建，File 可重复上传）
  function sendImageMsg(file) {
    var targetId = getChat() && getChat().targetId;
    if (!targetId) return;
    if (file.size > CFG.im.imgMax) {
      errImgTooBig(Math.round(CFG.im.imgMax / 1024 / 1024));
      return;
    }
    var localUrl = '';
    try { localUrl = URL.createObjectURL(file); } catch (e0) { /* best-effort: cleanup */ }
    readSize(localUrl, function (w, h) {
      maybeDayDiv(Date.now());
      var b = el('div', 'acsv-im-imgbubble mine pending');
      if (localUrl) {
        var ph = document.createElement('img');
        ph.className = 'acsv-im-imgimg';
        ph.alt = '';
        ph.src = localUrl;
        if (w > 0 && h > 0) {
          ph.style.width = Math.min(w, 180) + 'px';
          ph.style.aspectRatio = w + ' / ' + h;
        }
        b.appendChild(ph);
      } else {
        b.textContent = '[图片]';
      }
      var holder = el('div', 'acsv-im-rowwrap mine');
      holder.appendChild(b);
      getDrawer().bubbles.appendChild(holder);
      getDrawer().bubbles.scrollTop = getDrawer().bubbles.scrollHeight;
      function cleanup() { if (localUrl) { try { URL.revokeObjectURL(localUrl); } catch (e2) { /* best-effort: cleanup */ } } }
      function onFail(err) {
        var stale = !getChat() || getChat().targetId !== targetId;
        if (!stale && holder.isConnected) {
          b.classList.remove('pending');
          b.classList.add('failed');
          b.title = '发送失败，点击重试';
          b.addEventListener('click', function (ev) {
            ev.stopPropagation();
            holder.remove();
            cleanup();
            sendImageMsg(file);
          });
        }
        errLong('图片发送失败：' + String((err && err.message) || '').slice(0, 120));
      }
      ensureIm().then(function (inst) {
        return ensureConnected(inst).then(function () {
          ensureTracer(inst);
          return sendImage(inst, Number(targetId), file, w, h);
        }).then(function () {
          // 确认成功：内核缓存必有真身（ks:// 已回填），立即增量拉一拍渲染成图片气泡
          if (!getChat() || getChat().targetId !== targetId) { cleanup(); return; }
          if (holder.isConnected) holder.remove();
          cleanup();
          chatPollOnce(inst, false);
        }, onFail);
      }, onFail);
    });
  }
  function readSize(url, cb) {
    if (!url) return cb(0, 0);
    var img = new Image();
    img.onload = function () { cb(img.naturalWidth || 0, img.naturalHeight || 0); };
    img.onerror = function () { cb(0, 0); };
    img.src = url;
  }

  function sendChat(text) {
    var targetId = getChat() && getChat().targetId;
    if (!targetId) return;
    // 裁剪先行：占位/发送/失败回填共用同一串，所见即所发（超限官方静默拒发，只会白等超时）
    text = String(text).slice(0, CFG.im.maxLen);
    var quote = getChat().quote || null; // 发送即定格：发送期间改引用目标不影响本条
    // 乐观占位（引用回复同款：摘要条 + 正文）
    maybeDayDiv(Date.now());
    var b = el('div', 'acsv-im-bubble mine pending');
    if (quote) b.appendChild(getBubble().quoteStrip({ seqId: quote.seqId, preview: quote.preview }));
    var txt = el('div', 'acsv-im-msgtext');
    txt.innerHTML = getBubble().imTextHtml(text);
    b.appendChild(txt);
    var holder = el('div', 'acsv-im-rowwrap mine');
    holder.appendChild(b);
    getDrawer().bubbles.appendChild(holder);
    getDrawer().bubbles.scrollTop = getDrawer().bubbles.scrollHeight;
    function onFail(err) {
      var stale = !getChat() || getChat().targetId !== targetId;
      if (!stale && holder.isConnected) {
        b.classList.remove('pending');
        b.classList.add('failed');
        b.title = '发送失败，点击重试';
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          holder.remove();
          getDrawer().setText(text);
          if (quote && getChat() && !getChat().quote) setQuote(quote); // 重试恢复引用 chip（期间没换目标才回填）
          getDrawer().input.focus();
        });
      }
      // 消息确实没发出去：无论是否已切会话都提示（切会话场景不碰 DOM，只告知）
      errLong('发送失败：' + String((err && err.message) || '').slice(0, 120));
    }
    ensureIm().then(function (inst) {
      return ensureConnected(inst).then(function () {
        ensureTracer(inst);
        // 引用走 sendQuote（内核直发，恢复重试已内置）；文本维持 doSend+就地恢复的既有路径
        return quote
          ? sendQuote(inst, Number(targetId), quote, text)
          : doSend(inst, Number(targetId), text).catch(function (err) {
            // 失败自动恢复一次（链路坏→重连；否则强制同步），再试一发
            var pre = linkOk(inst) ? Promise.resolve() : ensureConnected(inst);
            return pre.then(function () { return forceSync(inst); })
              .then(function () { return doSend(inst, Number(targetId), text); });
          });
      }).then(function () {
        // 成功即摘占位并就地补真身：文本走 doSend 确认、引用走 clientSeqId 对账，两条
        // 确认途径都晚于内核 pushSentKwaiMessage 把消息写入缓存，此刻 getMessages 必有
        // 真身，立即增量拉一拍上屏，不等下一拍轮询。占位节点走闭包引用，不用
        // querySelector——连发多条时按选择器只能摸到第一条，会摘错
        if (!getChat() || getChat().targetId !== targetId) return;
        if (holder.isConnected) holder.remove();
        if (quote && getChat().quote === quote) setQuote(null);
        chatPollOnce(inst, false);
      }, onFail);
    }, onFail);
  }

  return { sendImageMsg: sendImageMsg, sendChat: sendChat };
}
