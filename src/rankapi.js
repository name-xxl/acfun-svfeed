// @ts-check
// ---------- 三榜域（0.9.279）：全站热榜 / 香蕉榜 / 新秀榜 ----------
// 端点与参数取自 jadx `AcFunApiService`（j2/Y3/B）+ docs §10.5 实测：
//   hot      = GET  count/pcursor/mkey
//   banana   = GET  rankPeriod
//   youngStar= POST form rankPeriod
// 回包 `rankList[]` 与 pc-direct `rank/channel` **同族**（contentType/dougaId/contentTitle/
// videoCover/contentDesc/contributeTime/channelName/viewCount/commentCount/user*）——条目规整
// 直接复用 panelitem 的 rank 解析器，不造第二份 rankApp（样本见 test/unit/rankapi.test.js）。
// 传输走 requestRead（发现类读，跟随「非个性化推荐」开关）。
import { CFG } from './cfg.js';
import { requestRead } from './net.js';
import { appDeviceHeaders } from './appapi.js';
import { panelItem } from './panelitem.js';

export function rankBoardPageOf(j) {
  var rows = [];
  var raws = (j && Array.isArray(j.rankList)) ? j.rankList : [];
  raws.forEach(function (raw, i) {
    if (!raw) return;
    var pi = panelItem('rank', raw);
    if (pi) rows.push({ pi: pi, rank: i + 1 });
  });
  return rows;
}

export function fetchRankBoard(kind, period) {
  var p = period || CFG.view.periods[0];
  var url, method, headers, body;
  if (kind === 'hot') {
    url = CFG.api.rankHot + '?count=' + CFG.view.rankLimit + '&pcursor=&mkey=' + CFG.home.mkey;
    method = 'GET'; headers = appDeviceHeaders(); body = null;
  } else if (kind === 'banana') {
    url = CFG.api.rankBanana + '?rankPeriod=' + p;
    method = 'GET'; headers = appDeviceHeaders(); body = null;
  } else if (kind === 'youngStar') {
    url = CFG.api.rankYoungStar;
    method = 'POST'; headers = appDeviceHeaders(); body = 'rankPeriod=' + p;
  } else {
    return Promise.reject(new Error('rank-unknown'));
  }
  return requestRead(url, method, headers, body).then(function (j) {
    if (!j || j.result !== 0) throw new Error('rank-' + kind + '-' + ((j && j.result) || 'null'));
    return rankBoardPageOf(j);
  });
}
