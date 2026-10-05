// ---------- 站内搜索三端点规整（0.9.151 落户 data.js；0.9.161 拆件出库） ----------
// /rest/pc-direct/search/{video,user,article} 回包 → 条目，纯函数单测直采。唯一消费方
// searchview；upOf（作者契约）在播放契约件 playitem.js。字段形状照真机样本裁剪（docs §4.10）。
import { upOf } from './playitem.js'; // 作者契约单源（0.9.162 data.js 终解）
import { coverUrl } from './imgurl.js';
import { fmtDate, fmtWan } from './timefmt.js';

// 0.9.72 的 SSR HTML 区段解析（parseSearchItems）退役：真机实测（2026-10-04，docs/api-research.md
// §4.10）PC 搜索其实有 JSON 端点，且 **pCursor 是页码游标**（page/pageNo 被忽略——原生 pager 抓包
// 坐实），每页固定 30、totalNum 总数、pageNum 是总页数。三个规整器共用一个「剥高亮」：
// emTitle 的 <em>…</em> 一律剥成纯文本（卡片不做局部高亮；关键字命中信息靠排位表达）。
// 字段形状照真机样本裁剪；坏条目跳过（宁可少不错），整体失败调用方出空态。
function stripEm(s) {
  return String(s == null ? '' : s).replace(/<\/?em>/g, '');
}

// 视频：{ items[{acId,title,cover,dur,views,up,dateText}], total }
export function searchVideoPageOf(j) {
  var items = [];
  (((j && j.videoList) || [])).forEach(function (raw) {
    var acId = Number((raw && (raw.contentId != null ? raw.contentId : raw.id)) || 0);
    if (!acId) return;
    items.push({
      acId: acId,
      title: stripEm(raw.title || raw.emTitle).trim(),
      cover: coverUrl(raw.coverUrl || ''), // 无 coverUrl 的条目给空串，imgInto 走兜底图
      dur: String(raw.playDuration || ''),
      // 播放数只取数字部分（原生文本「11.4万次播放」/「2037次播放」——后缀随分区变，统一剥掉）
      views: String(raw.viewCountInfo || raw.viewCount || '').replace(/(次播放|次观看|播放|阅读)$/, '').trim(),
      up: upOf(raw.userId || 0, raw.userName || '', raw.userImg ? coverUrl(raw.userImg) : '', false),
      dateText: fmtDate(raw.ctime)
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}

// UP主：{ items[{uid,name,avatar,fans,contrib,signature,following,recents}], total }
// recents = dougaFeedList（真机实测最多 3 条）——卡内直接可点播
export function searchUserPageOf(j) {
  var items = [];
  (((j && j.userList) || [])).forEach(function (raw) {
    var uid = Number((raw && (raw.userId != null ? raw.userId : raw.id)) || 0);
    if (!uid) return;
    var recents = [];
    (((raw && raw.dougaFeedList) || [])).forEach(function (d) {
      var acId = Number((d && d.contentId) || 0);
      if (!acId) return;
      recents.push({
        acId: acId,
        title: String((d && d.caption) || ''),
        cover: coverUrl(((d && d.coverUrls) || [])[0] || ''),
        dur: String((d && d.playDuration) || ''),
        dateText: String((d && d.contributeTime) || '')
      });
    });
    items.push({
      uid: uid,
      name: stripEm(raw.userName || raw.emTitle).trim(),
      avatar: coverUrl(raw.userImg || ''),
      // 计数优先用服务端已格式化串（fansCountStr「1.4万」/contentCountStr），缺则本地格式化
      fans: raw.fansCountStr || (raw.fansCount != null ? fmtWan(raw.fansCount) : ''),
      contrib: raw.contentCountStr || (raw.contentCount != null ? String(raw.contentCount) : ''),
      signature: String(raw.signature || ''),
      following: !!raw.isFollowing,
      recents: recents
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}

// 文章：{ items[{id,title,decr,name,uid,views,comments,channel,dateText}], total }
// 无封面字段（真机样本确认）——渲染走纯文本行卡
export function searchArticlePageOf(j) {
  var items = [];
  (((j && j.articleList) || [])).forEach(function (raw) {
    var id = Number((raw && (raw.contentId != null ? raw.contentId : raw.id)) || 0);
    if (!id) return;
    items.push({
      id: id,
      title: stripEm(raw.title || raw.emTitle).trim(),
      decr: String(raw.decr || ''),
      uid: Number(raw.userId || 0) || 0,
      name: String(raw.userName || ''),
      views: String(raw.viewCountInfo || '').trim(),
      comments: String(raw.commentCountInfo || '').trim(),
      channel: String(raw.channelName || ''),
      dateText: fmtDate(raw.ctime)
    });
  });
  return { items: items, total: Number((j && j.totalNum) || 0) || 0 };
}
