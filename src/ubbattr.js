// ---------- UBB 出链/出图 HTML 属性段单源（0.9.309 自「3 处再抽 helper」触发转正） ----------
// ubb/emoticon/imbubble/commentkit 各自拼 <a>/<img> 骨架，target/rel/referrerpolicy 是**策略**
// 而非胶水：出链一律新标签 + noopener（断 opener 防站外反控）、外域图一律 no-referrer
//（不外泄引用页）。散写意味着任何一处漏带就是行为分叉——沉这里，改策略一处生效。
// 零依赖叶（ubb→emoticon 已有边，属性段不能落 ubb，独立叶子四面安全）。
// 值含开标签收口 '>'：与 href/src 的引号收尾拼合即成标签，消费点 `<a href="' + u + A_TAIL`。

// 锚点属性尾：rel="noopener" 收口
export var A_TAIL = '" target="_blank" rel="noopener">';
// 配图属性尾：referrerpolicy="no-referrer" 收口
export var IMG_TAIL = '" referrerpolicy="no-referrer">';
