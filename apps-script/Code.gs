// Cổng dữ liệu công khai cho canholumi.com
// Lấy bảng hàng từ lumihanoi.pages.dev/api/listings, CHỈ trả các cột an toàn
// (không tên chủ nhà, SĐT, pass cửa, ghi chú, link Drive). Cache 30 giây.
var API = 'https://lumihanoi.pages.dev/api/listings';
var KEEP = ['id', 'transaction', 'type', 'tower', 'direction', 'area', 'price', 'interior', 'updatedDate', 'mediaStatus'];

function build_() {
  var r = UrlFetchApp.fetch(API + '?ts=' + Date.now(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var d = JSON.parse(r.getContentText());
  var out = (d.listings || []).map(function (x) {
    var o = {};
    KEEP.forEach(function (k) { o[k] = x[k]; });
    o.img = (x.images || []).map(function (u) {
      var m = /^https:\/\/drive\.google\.com\/thumbnail\?id=([\w-]+)/.exec(u); return m ? m[1] : null;
    }).filter(function (v) { return v; }).slice(0, 12);
    return o;
  });
  return JSON.stringify({ ok: true, generatedAt: d.generatedAt || new Date().toISOString(), listings: out });
}

function doGet() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('n') || 0), body = null;
  if (n) {
    var keys = []; for (var i = 0; i < n; i++) keys.push('p' + i);
    var parts = cache.getAll(keys);
    if (Object.keys(parts).length === n) body = keys.map(function (k) { return parts[k]; }).join('');
  }
  if (!body) {
    body = build_() || JSON.stringify({ ok: false });
    var chunks = {}, size = 90000, c = 0;
    for (var s = 0; s < body.length; s += size) chunks['p' + (c++)] = body.slice(s, s + size);
    chunks.n = String(c);
    cache.putAll(chunks, 30);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
