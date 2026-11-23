// canholumi.com – dựng web tĩnh từ bảng hàng Lumi (lumihanoi.pages.dev/api/listings)
// Chạy: node build.mjs [listings.json] [archive.json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = 'https://canholumi.com';
const BRAND = 'Căn Hộ Lumi';
const PHONE = '0977923284';
const PHONE_FMT = '0977 923 284';
const PHONE_INTL = '+84977923284';
const ZALO = `https://zalo.me/${PHONE}`;
// Google Analytics 4: mã đo lưu trong ga-id.txt (G-XXXXXXX). Không có file → không gắn.
const GA_ID = (() => { try { const v = fs.readFileSync('ga-id.txt', 'utf8').trim(); return /^G-[A-Z0-9]+$/.test(v) ? v : ''; } catch { return ''; } })();
const GA_TAG = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>` : '';
const API = 'https://lumihanoi.pages.dev/api/listings';
const OUT = 'dist';
const LIVE_URL = fs.existsSync('live-endpoint.txt') ? fs.readFileSync('live-endpoint.txt', 'utf8').trim() : '';
const INDEXNOW_KEY = fs.existsSync('indexnow.key') ? fs.readFileSync('indexnow.key', 'utf8').trim() : '';
const PHOTOS = JSON.parse(fs.readFileSync('photos.json', 'utf8'));
const ARCHIVE_DAYS = 30;
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const VN_TIME = d => new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const VN_NOW = new Date(NOW.getTime() + 7 * 3600e3);
const MONTH_LABEL = `tháng ${VN_NOW.getUTCMonth() + 1}/${VN_NOW.getUTCFullYear()}`;
const DATE_LABEL = `${String(VN_NOW.getUTCDate()).padStart(2, '0')}/${String(VN_NOW.getUTCMonth() + 1).padStart(2, '0')}/${VN_NOW.getUTCFullYear()}`;

// ---------- Tiện ích ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const slugId = id => String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v, d = 1) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
const tr = v => num(v / 1e6, 1);
const kpm = v => num(Math.round(v / 1000), 0); // nghìn đồng/m²
const trEn = v => (Math.round(v / 1e5) / 10).toString();
const m2 = a => `${num(a, 1)} m²`;
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const uniq = a => [...new Set(a)];
const T = t => { t = t.replace(/ \| Căn Hộ Lumi$/, ''); return (t + ' | Căn Hộ Lumi').length <= 66 ? t + ' | Căn Hộ Lumi' : t; };
const D = d => { d = d.replace(/\s+/g, ' ').trim(); if (d.length <= 158) return d; const c = d.slice(0, 155); return c.slice(0, c.lastIndexOf(' ')) + '…'; };
const sha = s => crypto.createHash('sha1').update(s).digest('hex');

const TYPES = {
  '1PN': { slug: '1-phong-ngu', short: '1 phòng ngủ', name: 'căn hộ 1 phòng ngủ', code: '1pn', en: '1-bedroom' },
  '2PN': { slug: '2-phong-ngu', short: '2 phòng ngủ', name: 'căn hộ 2 phòng ngủ', code: '2pn', en: '2-bedroom' },
  '3PN': { slug: '3-phong-ngu', short: '3 phòng ngủ', name: 'căn hộ 3 phòng ngủ', code: '3pn', en: '3-bedroom' },
  'Duplex': { slug: 'duplex', short: 'Duplex', name: 'căn hộ Duplex', code: 'duplex', en: 'Duplex' },
};
const TOWER_ORDER = ['S1', 'S2', 'S3', 'S5', 'S6', 'P1', 'P2', 'E1', 'E2'];
const INTERIORS = { full: { slug: 'full-noi-that', label: 'Full nội thất', name: 'full nội thất', en: 'Furnished' }, basic: { slug: 'noi-that-co-ban', label: 'Nội thất cơ bản', name: 'nội thất cơ bản', en: 'Basic furniture' } };
const BANDS = [
  { slug: 'gia-duoi-8-trieu', label: 'dưới 8 triệu', min: 0, max: 7999999 },
  { slug: 'gia-8-10-trieu', label: 'từ 8 đến 10 triệu', min: 8e6, max: 10e6 },
  { slug: 'gia-10-15-trieu', label: 'từ 10 đến 15 triệu', min: 10000001, max: 15e6 },
  { slug: 'gia-tren-15-trieu', label: 'trên 15 triệu', min: 15000001, max: 1e12 },
];
const MIN_PAGE = 3; // tối thiểu 3 căn mới tạo trang danh sách (tránh trang mỏng)

// ---------- Dữ liệu ----------
async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'canholumi-build' } });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
async function loadData() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  // refresh=1: bắt hệ thống bảng hàng đọc lại Google Sheet ngay, không dùng bản nhớ 15 phút.
  try { const d = await fetchJson(`${API}?refresh=1&ts=${Date.now()}`); if (Array.isArray(d.listings) && d.listings.length >= 40) return d; } catch (e) { console.log('refresh=1 lỗi, dùng dữ liệu thường:', e.message); }
  return fetchJson(`${API}?ts=${Date.now()}`);
}
async function loadArchive() {
  try {
    if (process.argv[3]) return JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    if (process.argv[2]) return { units: [] };
    return await fetchJson(`${SITE}/data/archive.json?ts=${Date.now()}`);
  } catch { return { units: [] }; }
}
function parseVnDate(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim());
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
function prepare(raw) {
  const arr = Array.isArray(raw) ? raw : (raw.listings || []);
  return arr.filter(x => x && x.id && (x.transaction === 'rent' || x.transaction === 'sale') && TYPES[x.type]).map(x => {
    const i = String(x.interior || '');
    return {
      id: String(x.id), isRent: x.transaction === 'rent', type: x.type, tower: String(x.tower || '').trim().toUpperCase() || 'Lumi',
      area: Number(x.area) || null, dir: String(x.direction || '').trim().split(/\s+/).map(cap).join(' '),
      intKey: /full/i.test(i) ? 'full' : /cơ bản/i.test(i) ? 'basic' : '',
      price: Number(x.price) || 0, updated: parseVnDate(x.updatedDate),
      img: (x.images || []).map(u => (/^https:\/\/drive\.google\.com\/thumbnail\?id=([\w-]+)/.exec(u) || [])[1]).filter(Boolean).slice(0, 12),
      real: x.mediaStatus === 'verified' && (x.images || []).some(u => /^https:\/\/drive\.google\.com\/thumbnail\?id=/.test(u)),
    };
  });
}
function enrich(u) {
  const t = TYPES[u.type];
  const priceText = !u.price ? 'Liên hệ' : u.isRent ? `${tr(u.price)} triệu/tháng` : `${num(u.price / 1e9, 3)} tỷ`;
  return {
    ...u, t, priceText, interior: u.intKey ? INTERIORS[u.intKey].label : '',
    url: `/can-ho/${u.isRent ? 'cho-thue' : 'ban'}-can-ho-lumi-${t.code}-${u.tower.toLowerCase()}-${slugId(u.id)}/`,
    oldUrl: `/can-ho/${u.isRent ? 'thue' : 'ban'}-${t.slug}-${u.tower.toLowerCase()}-${slugId(u.id)}/`,
    imgs: u.img.map(id => `https://drive.google.com/thumbnail?id=${id}&sz=w1280`),
    title: `${u.isRent ? 'Cho thuê' : 'Bán'} ${t.name} Lumi Hà Nội tòa ${u.tower}${u.area ? `, ${m2(u.area).replace(' ', '')}` : ''}`,
  };
}
const score = u => (u.real ? 2 : 0) + (u.img.length ? 1 : 0);
const sortUnits = list => [...list].sort((a, b) => score(b) - score(a) || (b.updated || '').localeCompare(a.updated || '') || a.price - b.price);

// ---------- Khung trang ----------
const ASSET_VER = sha(fs.readFileSync('static/assets/site.js', 'utf8')).slice(0, 8);
const minCss = c => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}');
const INLINE_CSS = minCss(fs.readFileSync('static/assets/fonts.css', 'utf8') + fs.readFileSync('static/assets/site.css', 'utf8'));
const FONT_PRELOAD = ['latin-400', 'vietnamese-400', 'latin-800'].map(f => `<link rel="preload" href="/fonts/bvp-${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n');
const photo = f => PHOTOS.find(p => p.f === f);
const HERO = photo('ho-boi-cong-vien-lumi-ha-noi');
// Ảnh tiện ích dùng cho thẻ căn chưa có ảnh (ghi rõ là ảnh tiện ích, không phải ảnh căn)
const FILL = ['ho-boi-cong-vien-lumi-ha-noi', 'ho-boi-bac-thang-lumi-ha-noi', 'san-tam-nang-ho-boi-lumi', 'cau-di-bo-canh-quan-lumi', 'sanh-lounge-lumi-ha-noi', 'phong-gym-lumi-ha-noi', 'san-co-golf-lumi-ha-noi', 'khu-bar-cong-dong-lumi'];
const fillFor = id => FILL[[...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % FILL.length];
function pic(p, { sizes = '(max-width: 700px) 100vw, 50vw', cls = '', eager = false, alt } = {}) {
  const set = [480, 960, 1600].map(s => `/img/lumi/${p.f}-${s}.webp ${s}w`).join(', ');
  return `<img${cls ? ` class="${cls}"` : ''} src="/img/lumi/${p.f}-960.webp" srcset="${set}" sizes="${sizes}" alt="${esc(alt ?? p.alt)}" width="960" height="${Math.round(960 * p.h / p.w)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const I = {
  area: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z"/></svg>',
  dir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9Z"/></svg>',
  sofa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2a2 2 0 0 1 2 2v6h-2v2h-2v-2H7v2H5v-2H3v-6a2 2 0 0 1 2-2Zm2 0a2 2 0 0 1 2 2v2h6v-2a2 2 0 0 1 2-2V7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2Z"/></svg>',
  tower: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20h-5v-4h-2v4H6V2Zm3 3v2h2V5H9Zm4 0v2h2V5h-2Zm-4 4v2h2V9H9Zm4 0v2h2V9h-2Zm-4 4v2h2v-2H9Zm4 0v2h2v-2h-2Z"/></svg>',
  bed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h2v8h6V8h7a3 3 0 0 1 3 3v8h-2v-3H5v3H3V5Zm5 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.6 3 5 6.5 5c2 0 3.4 1.1 4.2 2.3h2.6C14.1 6.1 15.5 5 17.5 5 21 5 23.1 8.6 21.6 11.8 19.5 16.4 12 21 12 21Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1Z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2Z"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2l-7 7v6l-4-2v-4L3 7V5Z"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2Zm3 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 16.2-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4Z"/></svg>',
};
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(I).map(([k, v]) => v.replace('<svg viewBox="0 0 24 24" aria-hidden="true">', `<symbol id="i-${k}" viewBox="0 0 24 24">`).replace('</svg>', '</symbol>')).join('')}</svg>`;
for (const k of Object.keys(I)) I[k] = `<svg class="ic ic-${k}" aria-hidden="true"><use href="#i-${k}"/></svg>`;
const logoSvg = () => `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="10" width="7" height="19" rx="1"/><rect x="12.5" y="3" width="7" height="26" rx="1"/><rect x="22" y="13" width="7" height="16" rx="1"/><rect class="lit" x="14.5" y="7" width="3" height="3"/><rect class="lit" x="5" y="17" width="3" height="3"/><rect class="lit" x="24" y="21" width="3" height="3"/></svg>`;
const NAV = [['/', 'Cho thuê'], ['/cac-toa/', 'Theo tòa'], ['/bang-gia-thue-lumi-ha-noi/', 'Bảng giá'], ['/tien-ich-lumi-ha-noi/', 'Tiện ích'], ['/kinh-nghiem-thue-can-ho-lumi/', 'Kinh nghiệm'], ['/mua-ban/', 'Mua bán'], ['/chu-nha-ky-gui/', 'Ký gửi']];

let FOOT_LINKS = '';
let QUICK = () => '';
function layout({ title: rawTitle, desc, canonical, body, jsonld = [], ogImage, noindex = false, active = '', lang = 'vi', alt = null, preload = '', modified }) {
  const title = T(rawTitle);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(D(desc))}">
<link rel="canonical" href="${SITE}${canonical}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}">
${alt ? alt.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${u}">`).join('\n') : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'vi_VN'}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(D(desc))}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${esc(ogImage || `${SITE}/img/og-canholumi.jpg`)}">
<meta name="twitter:card" content="summary_large_image">
${modified ? `<meta property="article:modified_time" content="${modified}">` : ''}
<meta name="theme-color" content="#0f2b33">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/img/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/img/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://drive.google.com">
<link rel="alternate" type="application/atom+xml" title="Căn hộ Lumi mới cập nhật" href="${SITE}/feed.xml">
${FONT_PRELOAD}
${preload}
<style>${INLINE_CSS}</style>
${GA_TAG}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
${SPRITE}
<a class="skip" href="#noi-dung">${lang === 'en' ? 'Skip to content' : 'Bỏ qua menu'}</a>
<header class="top">
  <a class="logo" href="${lang === 'en' ? '/en/' : '/'}" aria-label="${BRAND} – trang chủ"><img class="logo-img" src="/img/logo-lumi-trang.webp" alt="Lumi Hanoi – Căn Hộ Lumi" width="122" height="60"><span class="sr">Căn Hộ Lumi</span></a>
  <nav class="nav" id="nav" aria-label="Menu chính">${NAV.map(([h, l]) => `<a href="${h}"${active === h ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<a href="/en/" lang="en"${active === '/en/' ? ' aria-current="page"' : ''}>English</a></nav>
  <a class="saved-link" href="/da-luu/" aria-label="Căn đã lưu">${I.heart}<span class="saved-n" data-saved-count hidden>0</span></a>
  <a class="btn btn-zalo top-cta" href="${ZALO}" rel="nofollow" aria-label="Nhắn Zalo ${PHONE_FMT}">${I.chat}<span>Zalo ${PHONE_FMT}</span></a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Mở menu"><span></span><span></span><span></span></button>
</header>
<main id="noi-dung">
${body}
</main>
<footer class="foot">
  <div class="foot-in">
    <div class="foot-col foot-about">
      <p class="foot-brand"><img src="/img/logo-lumi-trang.webp" alt="Lumi Hanoi – Căn Hộ Lumi" width="122" height="60" loading="lazy"></p>
      <p>Cho thuê và mua bán căn hộ Lumi Hà Nội (Lumi Hanoi – CapitaLand), Đại lộ Thăng Long. Danh sách căn lấy trực tiếp từ bảng hàng và tự cập nhật.</p>
      <address>Lumi Hanoi, Đại lộ Thăng Long, phường Tây Mỗ, Hà Nội<br><a href="tel:${PHONE}">${PHONE_FMT}</a> · <a href="${ZALO}" rel="nofollow">Zalo</a></address>
    </div>
    ${FOOT_LINKS}
  </div>
  <p class="foot-note">Giá và tình trạng căn có thể thay đổi theo chủ nhà; nhắn Zalo để xác nhận trước khi xem nhà. canholumi.com là trang môi giới, không phải website của chủ đầu tư CapitaLand.</p>
</footer>
<nav class="mbar" aria-label="Liên hệ nhanh">
  <a href="tel:${PHONE}">${I.phone}<span>Gọi</span></a>
  <a class="mbar-zalo" href="${ZALO}" rel="nofollow">${I.chat}<span>Nhắn Zalo</span></a>
  <a href="/#danh-sach">${I.filter}<span>Tìm căn</span></a>
</nav>
<script>window.LIVE_URL=${JSON.stringify(LIVE_URL)};</script>
<script src="/assets/site.js?v=${ASSET_VER}" defer></script>
</body>
</html>`;
}

const LUMI_ADDR = { '@type': 'PostalAddress', streetAddress: 'Ô C3-CH01-1, Khu đô thị mới Tây Mỗ – Đại Mỗ, Đại lộ Thăng Long', addressLocality: 'Phường Tây Mỗ', addressRegion: 'Hà Nội', addressCountry: 'VN' };
const ORG = {
  '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': SITE + '/#agent', name: BRAND, url: SITE + '/',
  logo: SITE + '/img/icon-512.png', image: SITE + '/img/og-canholumi.jpg', telephone: PHONE_INTL,
  address: LUMI_ADDR, hasMap: 'https://www.google.com/maps/search/?api=1&query=Lumi+Hanoi+CapitaLand', knowsLanguage: ['vi', 'en'],
  areaServed: ['Lumi Hà Nội', 'Phường Tây Mỗ', 'Đại Mỗ', 'Nam Từ Liêm', 'Hà Nội'].map(n => ({ '@type': 'Place', name: n })),
  contactPoint: { '@type': 'ContactPoint', telephone: PHONE_INTL, contactType: 'customer service', areaServed: 'VN', availableLanguage: ['Vietnamese', 'English'] },
  sameAs: ['https://www.facebook.com/profile.php?id=61596073111809'],
};
const COMPLEX = {
  '@context': 'https://schema.org', '@type': 'ApartmentComplex', '@id': SITE + '/#lumi', name: 'Lumi Hà Nội (Lumi Hanoi)',
  description: 'Dự án căn hộ của CapitaLand Development sát Đại lộ Thăng Long, phía Tây Hà Nội.',
  address: LUMI_ADDR, hasMap: 'https://www.google.com/maps/search/?api=1&query=Lumi+Hanoi+CapitaLand', containedInPlace: { '@type': 'City', name: 'Hà Nội' },
  amenityFeature: ['Hồ bơi ngoài trời', 'Phòng gym', 'Sân tennis', 'Khu vui chơi trẻ em', 'Phòng sinh hoạt cộng đồng', 'Phòng bi-a'].map(n => ({ '@type': 'LocationFeatureSpecification', name: n, value: true })),
  image: ['ho-boi-cong-vien-lumi-ha-noi', 'bien-hieu-lumi-signature', 'phong-gym-lumi-ha-noi'].map(f => `${SITE}/img/lumi/${f}.jpg`),
};
function breadcrumbs(items) {
  return {
    html: `<nav class="crumbs" aria-label="Đường dẫn"><ol>${items.map(([n, u], i) => i < items.length - 1 ? `<li><a href="${u}">${esc(n)}</a></li>` : `<li aria-current="page">${esc(n)}</li>`).join('')}</ol></nav>`,
    ld: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) },
  };
}
const itemList = (list, name) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: list.length, itemListElement: list.slice(0, 60).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + x.url, name: x.title })) });
const faqLd = faq => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (faq, h = 'Câu hỏi thường gặp') => `<section class="faq wrap"><h2>${h}</h2><div class="faq-list">${faq.map(([q, a], i) => `<details${i ? '' : ' open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;

// ---------- Thẻ căn ----------
function card(x, i = 9) {
  const img = x.imgs[0];
  return `<article class="card" data-id="${esc(x.id)}" data-rent="${x.isRent ? 1 : 0}" data-type="${x.type}" data-tower="${x.tower}" data-int="${x.intKey}" data-price="${x.price}" data-area="${x.area || 0}" data-img="${esc((x.img || [])[0] || '')}" data-new="${score(x)}${x.updated || ''}">
<a class="card-media" href="${x.url}" tabindex="-1" aria-hidden="true">${img ? `<img src="${img.replace('w1280', 'w600')}" alt="${esc(x.title)}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" width="600" height="450">` : `<img src="/img/lumi/${fillFor(x.id)}-480.webp" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="fillnote">Ảnh căn đang cập nhật</span>`}
<span class="tags">${x.real ? '<span class="tag tag-real">Ảnh thật</span>' : x.imgs.length ? '<span class="tag">Ảnh minh hoạ</span>' : '<span class="tag">Ảnh tiện ích</span>'}${x.intKey === 'full' ? '<span class="tag tag-full">Full nội thất</span>' : ''}</span>${x.imgs.length > 1 ? `<span class="count">${I.camera}${x.imgs.length}</span>` : ''}</a>
<button class="save" type="button" data-save="${esc(x.id)}" aria-pressed="false" aria-label="Lưu căn ${esc(x.id)}">${I.heart}</button>
<div class="card-body">
<p class="price" data-f="price">${esc(x.priceText)}${!x.isRent && x.price && x.area ? `<small class="ppm"> · ≈ ${tr(x.price / x.area)} tr/m²</small>` : ''}</p>
<h3><a href="${x.url}">${esc(cap(x.t.short))} · Tòa ${x.tower}</a></h3>
<ul class="facts">${x.area ? `<li>${I.area}${m2(x.area)}</li>` : ''}${x.dir ? `<li>${I.dir}${esc(x.dir)}</li>` : ''}</ul>
<p class="int">${I.sofa}${x.intKey === 'full' ? 'Full nội thất' : x.interior ? 'Nội thất cơ bản' : 'Nội thất: hỏi qua Zalo'}</p>
<p class="code">Mã ${esc(x.id)}</p>
</div></article>`;
}
function filters(list, { noTower = false, noType = false, sale = false } = {}) {
  const towers = TOWER_ORDER.filter(t => list.some(x => x.tower === t));
  const types = Object.keys(TYPES).filter(t => list.some(x => x.type === t));
  const prices = sale ? [4, 5, 6, 8, 10].map(v => [v * 1e9, `${v} tỷ`]) : [8, 10, 12, 15, 20].map(v => [v * 1e6, `${v} triệu`]);
  const chips = (name, opts) => `<div class="chips">${[['', 'Tất cả'], ...opts].map(([v, l], i) => `<label><input type="radio" name="${name}" value="${v}"${i ? '' : ' checked'}><span>${l}</span></label>`).join('')}</div>`;
  return `<form class="filters" id="loc" aria-label="Lọc căn hộ" onsubmit="return false">
<div class="f-row f-top"><label class="f-q"><span class="sr">Tìm theo mã căn</span><input type="search" name="q" placeholder="Tìm mã căn, ví dụ ${esc(list[0]?.id || 'Thue2N.87')}" autocomplete="off"></label><button type="button" class="f-toggle" aria-expanded="false" aria-controls="f-more">${I.filter}<span>Bộ lọc</span><b class="f-n" hidden></b></button></div>
<div class="f-more" id="f-more"><div class="f-row f-sel">
<label class="sel"><span>Giá tối đa</span><select name="max"><option value="">Mọi mức giá</option>${prices.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
<label class="sel"><span>Diện tích</span><select name="dt"><option value="">Mọi diện tích</option>${areaOpts(list)}</select></label>
<label class="sel"><span>Sắp xếp</span><select name="sort"><option value="new">Ảnh thật trước</option><option value="asc">Giá thấp trước</option><option value="desc">Giá cao trước</option><option value="area">Diện tích lớn</option></select></label></div>
${!noType && types.length > 1 ? `<fieldset class="f-row"><legend class="f-label">Loại căn</legend>${chips('type', types.map(t => [t, TYPES[t].short]))}</fieldset>` : ''}
${!noTower && towers.length > 1 ? `<fieldset class="f-row"><legend class="f-label">Tòa</legend>${chips('tower', towers.map(t => [t, t]))}</fieldset>` : ''}
${uniq(list.map(x => x.intKey).filter(Boolean)).length > 1 ? `<fieldset class="f-row"><legend class="f-label">Nội thất</legend>${chips('int', [['full', 'Full nội thất'], ['basic', 'Cơ bản']])}</fieldset>` : ''}
<p class="f-done"><button type="button" class="btn btn-lamp" data-close-f>Xem kết quả</button></p></div>
<p class="result" aria-live="polite"><b id="dem">${list.length}</b> căn phù hợp <button type="button" class="reset" data-reset hidden>Xoá bộ lọc</button></p>
</form>`;
}
const AREA_BANDS = [[0, 50, 'Dưới 50 m²'], [50, 60, '50–60 m²'], [60, 70, '60–70 m²'], [70, 80, '70–80 m²'], [80, 100, '80–100 m²'], [100, 999, 'Từ 100 m²']];
const areaOpts = list => AREA_BANDS.filter(([a, b]) => list.some(x => x.area >= a && x.area < b)).map(([a, b, l]) => `<option value="${a}-${b}">${l}</option>`).join('');
const HTML_CAP = 48;
const grid = (list, scope) => `<h2 class="sr">Danh sách căn</h2><div class="grid" id="ds" data-scope="${esc(JSON.stringify(scope))}" data-total="${list.length}">${list.slice(0, HTML_CAP).map((x, i) => card(x, i)).join('')}</div>
<p class="empty" id="rong" hidden>Chưa có căn khớp bộ lọc. <a href="${ZALO}" rel="nofollow">Nhắn Zalo ${PHONE_FMT}</a> để được báo khi có căn phù hợp.</p>`;

// ---------- Thống kê ----------
function stat(list) {
  const p = list.filter(x => x.price).map(x => x.price);
  const a = list.filter(x => x.area).map(x => x.area);
  const ppm = list.filter(x => x.price && x.area).map(x => x.price / x.area);
  return { ppm: median(ppm), n: list.length, min: p.length ? Math.min(...p) : 0, max: p.length ? Math.max(...p) : 0, med: median(p), areaMin: a.length ? Math.min(...a) : 0, areaMax: a.length ? Math.max(...a) : 0, full: list.filter(x => x.intKey === 'full').length, real: list.filter(x => x.real).length };
}
function introText(list, what, sale = false) {
  const s = stat(list);
  if (!s.n) return '';
  const unit = v => sale ? `${num(v / 1e9, 2)} tỷ` : `${tr(v)} triệu`;
  const parts = [`Hiện có <b>${s.n}</b> ${what} trên bảng hàng, giá từ <b>${unit(s.min)}</b> đến <b>${unit(s.max)}${sale ? '' : '/tháng'}</b> (mức giữa ${unit(s.med)}).`];
  if (s.areaMin) parts.push(`Diện tích ${s.areaMin === s.areaMax ? m2(s.areaMin) : `từ ${m2(s.areaMin)} đến ${m2(s.areaMax)}`}.`);
  if (s.full && !sale) parts.push(`${s.full} căn full nội thất.`);
  if (s.real) parts.push(`${s.real} căn có ảnh chụp thực tế.`);
  return parts.join(' ');
}

// ---------- Trang danh sách ----------
function listPage({ list, scope, h1, crumbs, canonical, title, desc, what, related = [], faq = [], active = '', filterOpts = {}, heroPhoto, sale = false, extra = '' }) {
  const bc = breadcrumbs(crumbs);
  const sorted = sortUnits(list);
  const hp = photo(heroPhoto || 'ho-boi-ngoai-troi-lumi-signature');
  const body = `<section class="page-hero has-photo">${pic(hp, { sizes: '(max-width: 700px) 180px, 100vw', cls: 'ph-bg', eager: true, alt: '' })}
<div class="wrap">${bc.html}<h1>${esc(h1)}</h1><p class="lead">${introText(list, what, sale)}</p><p class="byline">Cập nhật ${DATE_LABEL} · tự đồng bộ với bảng hàng</p></div></section>
${related.length ? `<nav class="rel wrap" aria-label="Trang liên quan"><span>Xem thêm:</span>${related.map(([u, l]) => `<a href="${u}">${esc(l)}</a>`).join('')}</nav>` : ''}
<section class="listing wrap" id="danh-sach">${filters(list, filterOpts)}${grid(sorted, scope)}</section>
${extra}${faq.length ? faqHtml(faq) : ''}`;
  return layout({ title, desc, canonical, body, active, ogImage: sorted.find(x => x.imgs[0])?.imgs[0], jsonld: [ORG, bc.ld, itemList(sorted, h1), ...(faq.length ? [faqLd(faq)] : [])] });
}

function towerSummary(t, list) {
  const s = stat(list);
  const rows = Object.keys(TYPES).map(k => [k, list.filter(x => x.type === k)]).filter(([, l]) => l.length).map(([k, l]) => { const q = stat(l); return [cap(TYPES[k].short), q.n, `${tr(q.min)}–${tr(q.max)} tr`, `<b>${tr(q.med)} tr</b>`]; });
  const dirs = uniq(list.map(x => x.dir).filter(Boolean)).map(d => [d, list.filter(x => x.dir === d).length]).sort((a, b) => b[1] - a[1]);
  return `<section class="wrap seo-block"><h2>Tổng quan căn cho thuê tòa ${t}</h2>
<p>Tòa ${t} hiện có ${s.n} căn trên bảng hàng${s.n ? `, giá thuê mức giữa khoảng ${tr(s.med)} triệu/tháng` : ''}. ${dirs.length ? `Hướng ban công: ${dirs.map(([d, n]) => `${esc(d)} ${n} căn`).join(', ')}.` : ''} ${s.full ? `${s.full} căn cho thuê kèm đầy đủ nội thất.` : ''}</p>
${priceTable(rows, ['Loại căn', 'Số căn', 'Khoảng giá', 'Mức giữa'])}
<p class="muted">Mức giữa (trung vị): một nửa số căn rẻ hơn, một nửa đắt hơn. Số liệu tự cập nhật theo bảng hàng.</p></section>`;
}
// ---------- Đường chân trời (tòa) ----------
function skyline(byTower) {
  const towers = TOWER_ORDER.filter(t => byTower[t]?.length);
  const W = 120, gap = 22, cols = 6, cell = 14, pad = 12;
  const maxN = Math.max(...towers.map(t => byTower[t].length));
  const svgW = towers.length * (W + gap) - gap;
  const H = pad * 2 + Math.ceil(maxN / cols) * cell + 70;
  const parts = towers.map((t, i) => {
    const n = byTower[t].length, rows = Math.max(Math.ceil(n / cols), 3), h = rows * cell + pad * 2 + 18;
    const x = i * (W + gap), y = H - 40 - h;
    let wins = '';
    for (let k = 0; k < rows * cols; k++) {
      const r = Math.floor(k / cols), c = k % cols, lit = k < n;
      wins += `<rect class="${lit ? 'w lit' : 'w'}" x="${x + pad + c * 16}" y="${y + pad + 18 + (rows - 1 - r) * cell}" width="10" height="8" rx="1"${lit ? ` style="--d:${(k * 23) % 900}ms"` : ''}/>`;
    }
    return `<a href="/cho-thue/toa-${t.toLowerCase()}/"><rect class="body" x="${x}" y="${y}" width="${W}" height="${h}" rx="3"/>${wins}<text class="tn" x="${x + W / 2}" y="${H - 14}" text-anchor="middle">${t}</text><text class="tc" x="${x + W / 2}" y="${y - 8}" text-anchor="middle">${n} căn</text></a>`;
  }).join('');
  return `<svg class="skyline" viewBox="-4 0 ${svgW + 8} ${H}" role="img" aria-label="Số căn đang cho thuê theo từng tòa"><line class="ground" x1="-4" x2="${svgW + 4}" y1="${H - 40}" y2="${H - 40}"/>${parts}</svg>`;
}
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Lumi+Hanoi+CapitaLand';
function mapFacade() {
  return `<div class="map map-facade" data-map="https://www.google.com/maps?q=Lumi+Hanoi+CapitaLand&amp;output=embed">${pic(photo('thap-lumi-hanoi'), { sizes: '(max-width: 860px) 100vw, 50vw', alt: 'Tháp biểu tượng Lumi Hanoi' })}<div class="map-cta"><p>Lumi Hanoi · Phường Tây Mỗ, Hà Nội</p><button type="button" class="btn btn-lamp" data-load-map>Xem bản đồ</button><a class="btn btn-ghost" href="${MAPS_URL}" target="_blank" rel="noopener">Mở Google Maps</a></div></div>`;
}
function amenityBento() {
  const pick = ['ho-boi-ngoai-troi-lumi-signature', 'phong-gym-lumi-ha-noi', 'sanh-lounge-lumi-ha-noi', 'khu-vui-choi-tre-em-lumi', 'cau-di-bo-canh-quan-lumi', 'san-tennis-lumi-ha-noi'].map(photo);
  return `<div class="bento">${pick.map((p, i) => `<figure class="b${i}">${pic(p, { sizes: i ? '(max-width: 700px) 50vw, 25vw' : '(max-width: 700px) 100vw, 50vw' })}<figcaption>${esc(p.alt)}</figcaption></figure>`).join('')}</div>`;
}

// ---------- Trang chủ ----------
function homeFaq(rent, upd) {
  const parts = ['1PN', '2PN', '3PN'].map(k => [k, stat(rent.filter(x => x.type === k))]).filter(([, s]) => s.n);
  const full = stat(rent.filter(x => x.intKey === 'full')), basic = stat(rent.filter(x => x.intKey === 'basic'));
  return [
    ['Giá thuê căn hộ Lumi Hà Nội bao nhiêu?', parts.map(([k, s]) => `${cap(TYPES[k].short)}: ${tr(s.min)}–${tr(s.max)} triệu/tháng, mức giữa ${tr(s.med)} triệu (${s.n} căn)`).join('; ') + `. Số liệu tính từ bảng hàng lúc ${upd}.`],
    ['Căn full nội thất ở Lumi đắt hơn căn cơ bản bao nhiêu?', full.n && basic.n ? `Tính chung mọi loại căn đang cho thuê, mức giữa căn full nội thất là ${tr(full.med)} triệu/tháng, căn nội thất cơ bản là ${tr(basic.med)} triệu/tháng. Xem chênh lệch theo từng loại căn ở trang Bảng giá thuê.` : 'Tuỳ từng căn; nhắn Zalo để được so sánh cụ thể.'],
    ['Làm sao để đi xem căn hộ?', `Nhắn Zalo hoặc gọi ${PHONE_FMT}, gửi mã căn và giờ muốn xem. Bên em hẹn lịch với chủ nhà và dẫn anh chị xem trực tiếp.`],
    ['Lumi Hà Nội nằm ở đâu?', 'Lumi Hanoi là dự án của CapitaLand Development, nằm sát Đại lộ Thăng Long và kết nối Vành đai 3.5, phía Tây Hà Nội.'],
    ['Ảnh trên web có phải ảnh thật của căn không?', 'Căn gắn nhãn "Ảnh thật" là ảnh chụp thực tế của chính căn đó. Căn gắn nhãn "Ảnh minh hoạ" dùng ảnh căn cùng loại, cùng kiểu nội thất; khi đi xem sẽ là căn thực tế.'],
    ['Danh sách căn có được cập nhật liên tục không?', 'Có. Website đọc bảng hàng mỗi phút: căn đã cho thuê tự ẩn, giá thay đổi tự cập nhật, căn mới tự xuất hiện.'],
  ];
}
function homePage(all, meta) {
  const rent = sortUnits(all.filter(x => x.isRent));
  const byTower = {}; for (const x of rent) (byTower[x.tower] ||= []).push(x);
  const s = stat(rent);
  const upd = VN_TIME(meta.generatedAt || NOW);
  const types = ['1PN', '2PN', '3PN'].filter(k => rent.some(x => x.type === k));
  const towers = TOWER_ORDER.filter(t => byTower[t]);
  const faq = homeFaq(rent, upd);
  const heroSet = [640, 1080, 1600].map(z => `/img/lumi/hero-lumi-${z}.webp ${z}w`).join(', ');
  const body = `
<section class="hero">
  <img class="hero-bg" src="/img/lumi/hero-lumi-1080.webp" srcset="/img/lumi/hero-lumi-640.webp 640w, /img/lumi/hero-lumi-1080.webp 1080w, /img/lumi/hero-lumi-1600.webp 1600w" sizes="100vw" alt="" width="1600" height="1200" fetchpriority="high" decoding="async">
  <div class="hero-in wrap">
    <p class="hero-kicker"><span class="dot" aria-hidden="true"></span><b data-count="rent">${rent.length} căn</b> đang trống · cập nhật <span data-live="time">${upd}</span></p>
    <h1>Cho thuê căn hộ Lumi Hà Nội</h1>
    <p class="hero-sub">Quỹ căn hộ chung cư Lumi Hanoi đang cho thuê, lấy thẳng từ bảng hàng, mỗi căn có mã riêng và giá rõ ràng. Chọn căn ưng ý, gửi mã qua Zalo để hẹn xem nhà.</p>
    <form class="hero-search" action="/" method="get" role="search" aria-label="Tìm căn hộ">
      <label><span>Loại căn</span><select name="type"><option value="">Tất cả</option>${types.map(t => `<option value="${t}">${TYPES[t].short}</option>`).join('')}</select></label>
      <label><span>Tòa</span><select name="tower"><option value="">Tất cả</option>${towers.map(t => `<option value="${t}">${t}</option>`).join('')}</select></label>
      <label><span>Giá tối đa</span><select name="max"><option value="">Mọi mức giá</option>${[8, 10, 12, 15, 20].map(v => `<option value="${v * 1e6}">${v} triệu</option>`).join('')}</select></label>
      <label><span>Diện tích</span><select name="dt"><option value="">Mọi diện tích</option>${areaOpts(rent)}</select></label>
      <button class="btn btn-lamp" type="submit">Tìm căn</button>
    </form>
  </div>
</section>
<section class="wrap prices" aria-label="Giá thuê theo loại căn">
  ${types.map(t => { const st = stat(rent.filter(x => x.type === t)); return `<a class="pr" href="/cho-thue/${TYPES[t].slug}/"><span class="pr-t">${cap(TYPES[t].short)}</span><span class="pr-v">${tr(st.min)}–${tr(st.max)}<small> triệu/tháng</small></span><span class="pr-n">${st.n} căn · mức giữa ${tr(st.med)} triệu</span></a>`; }).join('')}
  <a class="pr pr-link" href="/bang-gia-thue-lumi-ha-noi/"><span class="pr-t">Bảng giá thuê ${MONTH_LABEL}</span><span class="pr-v sm">Chi tiết theo tòa, diện tích, nội thất</span><span class="pr-n">Xem bảng giá</span></a>
</section>
<nav class="wrap quick" aria-label="Tìm nhanh">${QUICK()}</nav>
<section class="listing wrap" id="danh-sach">
  <div class="sec-head"><h2>Căn hộ Lumi đang cho thuê</h2><p>${s.real} căn có ảnh chụp thực tế · ${s.full} căn full nội thất</p></div>
  ${filters(rent)}${grid(rent, { rent: 1 })}
</section>
<section class="amen">
  <div class="wrap">
    <div class="sec-head"><h2>Sống ở Lumi Hà Nội</h2><p>Theo CapitaLand Development, dự án có hơn 80 tiện ích nội khu, trong đó có ba hồ bơi ngoài trời. Người thuê căn hộ dùng chung tiện ích như cư dân.</p></div>
    ${amenityBento()}
    <p class="center"><a class="btn btn-ghost" href="/tien-ich-lumi-ha-noi/">Xem toàn bộ tiện ích</a></p>
  </div>
</section>
<section class="wrap steps">
  <h2>Thuê căn hộ Lumi trong 3 bước</h2>
  <ol>
    <li><h3>Chọn căn, ghi lại mã</h3><p>Lọc theo loại căn, tòa, giá. Mỗi căn có mã riêng, ví dụ ${esc(rent[0]?.id || 'Thue2N.1')}.</p></li>
    <li><h3>Nhắn Zalo ${PHONE_FMT}</h3><p>Gửi mã căn và giờ muốn xem. Bên em xác nhận giá mới nhất với chủ nhà và hẹn lịch.</p></li>
    <li><h3>Xem nhà và thoả thuận</h3><p>Đi xem trực tiếp cùng người dẫn. Ưng căn thì thoả thuận giá, thời hạn và cọc với chủ nhà.</p></li>
  </ol>
</section>
<section class="wrap loc">
  <div class="loc-txt">
    <h2>Vị trí Lumi Hà Nội</h2>
    <p>Lumi Hanoi là dự án căn hộ của CapitaLand Development nằm sát Đại lộ Thăng Long, kết nối Vành đai 3.5, phía Tây Hà Nội. Phân khu Lumi Signature bắt đầu bàn giao từ tháng 9/2026.</p>
    <ul class="ticks"><li>${I.check}Mặt Đại lộ Thăng Long, khoảng 20 phút tới trung tâm, 40 phút tới sân bay Nội Bài</li><li>${I.check}Chợ Miêu Nha khoảng 700 m, mầm non Tây Mỗ khoảng 1 km, tiểu học Lý Nam Đế khoảng 1,1 km</li><li>${I.check}Cách Vinhomes Smart City khoảng 3,1 km; kết nối Vành đai 3.5</li><li>${I.check}Nội khu với hồ bơi, công viên, sân thể thao</li></ul>
    <p class="muted">Thời gian di chuyển theo CapitaLand, khoảng cách theo CafeLand; thực tế tuỳ giờ và tuyến đường.</p>
    <p><a href="/xung-quanh-lumi-ha-noi/">Xung quanh Lumi có gì?</a> · <a href="/kinh-nghiem-thue-can-ho-lumi/">Kinh nghiệm thuê căn hộ Lumi</a> · <a href="/bang-gia-thue-lumi-ha-noi/">Bảng giá thuê ${MONTH_LABEL}</a></p>
  </div>
  ${mapFacade()}
</section>
${faqHtml(faq)}
<section class="wrap guides">
  <h2>Thông tin hữu ích</h2>
  <div class="g-grid">
    ${[['/bang-gia-thue-lumi-ha-noi/', `Bảng giá thuê Lumi ${MONTH_LABEL}`, 'Giá thấp nhất, mức giữa và cao nhất theo loại căn, tòa và nội thất.', 'ho-boi-bac-thang-lumi-ha-noi'], ['/kinh-nghiem-thue-can-ho-lumi/', 'Kinh nghiệm thuê căn hộ Lumi', 'Chọn loại căn, hướng ban công, nội thất và những điều cần hỏi trước khi cọc.', 'phong-khach-chung-lumi'], ['/so-sanh-can-1pn-2pn-3pn-lumi/', 'So sánh căn 1PN, 2PN, 3PN', 'Diện tích, giá thuê từng loại căn theo số liệu bảng hàng.', 'phong-sinh-hoat-cong-dong-lumi'], ['/xung-quanh-lumi-ha-noi/', 'Lumi Hà Nội ở đâu?', 'Địa chỉ, đi lại, chợ và trường học quanh dự án.', 'thap-lumi-hanoi'], ['/tien-ich-lumi-ha-noi/', 'Tiện ích Lumi Hà Nội', 'Hồ bơi, gym, sân tennis, khu trẻ em, phòng sinh hoạt cộng đồng.', 'phong-gym-lumi-ha-noi'], ['/chu-nha-ky-gui/', 'Chủ nhà ký gửi căn', 'Đưa căn lên bảng hàng, website và nhóm cư dân Lumi mỗi ngày.', 'bien-hieu-lumi-signature']].map(([u, h, d, ph]) => `<a class="g-card" href="${u}">${pic(photo(ph), { sizes: '(max-width: 700px) 100vw, 25vw', alt: '' })}<h3>${h}</h3><p>${d}</p></a>`).join('')}
  </div>
</section>`;
  return layout({
    title: `Cho thuê chung cư Lumi Hà Nội (Lumi Hanoi) – ${rent.length} căn, từ ${tr(s.min)} triệu`,
    desc: `Thuê chung cư Lumi Hanoi: ${rent.length} căn hộ 1PN, 2PN, 3PN đang trống, từ ${tr(s.min)} triệu/tháng, giá rõ ràng, tự cập nhật theo bảng hàng. Zalo ${PHONE_FMT}.`,
    canonical: '/', body, active: '/', alt: [['vi', '/'], ['en', '/en/'], ['x-default', '/']],
    preload: `<link rel="preload" as="image" imagesrcset="${heroSet}" imagesizes="100vw" fetchpriority="high">`,
    jsonld: [ORG, COMPLEX, { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE + '/', inLanguage: 'vi', potentialAction: { '@type': 'SearchAction', target: `${SITE}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, itemList(rent, 'Căn hộ cho thuê Lumi Hà Nội'), faqLd(faq)],
  });
}

// ---------- Trang căn ----------
function unitPage(x, all) {
  const gone = !!x.goneAt;
  const bc = breadcrumbs([['Trang chủ', '/'], [x.isRent ? 'Cho thuê' : 'Mua bán', x.isRent ? '/' : '/mua-ban/'], ...(x.isRent ? [[`Tòa ${x.tower}`, `/cho-thue/toa-${x.tower.toLowerCase()}/`]] : []), [`Mã ${x.id}`, x.url]]);
  const peers = all.filter(y => y.isRent === x.isRent && y.type === x.type && y.price);
  const ps = stat(peers);
  const similar = all.filter(y => y.id !== x.id && y.isRent === x.isRent && y.type === x.type).sort((a, b) => (b.tower === x.tower) - (a.tower === x.tower) || score(b) - score(a) || Math.abs(a.price - x.price) - Math.abs(b.price - x.price)).slice(0, 8);
  const dt = x.updated ? x.updated.split('-').reverse().join('/') : '';
  const rows = [['Loại căn', cap(x.t.short), I.bed], ['Diện tích', x.area ? m2(x.area) : '', I.area], ['Tòa', x.tower, I.tower], ['Hướng ban công', x.dir, I.dir], ['Nội thất', x.interior, I.sofa], ...(!x.isRent && x.price && x.area ? [['Giá/m²', `≈ ${tr(x.price / x.area)} triệu/m²`, I.area]] : []), ['Cập nhật', dt, I.check]].filter(r => r[1]);
  let cmp = '';
  if (x.price && ps.n >= 3 && x.isRent) {
    const diff = (x.price - ps.med) / ps.med;
    cmp = Math.abs(diff) < 0.03 ? `ngang mức giữa (${tr(ps.med)} triệu) của ${ps.n} căn ${x.t.short} đang cho thuê ở Lumi` : `${diff < 0 ? 'thấp' : 'cao'} hơn khoảng ${Math.round(Math.abs(diff) * 100)}% so với mức giữa (${tr(ps.med)} triệu) của ${ps.n} căn ${x.t.short} đang cho thuê ở Lumi`;
  }
  const descr = [
    `${cap(x.t.name)}${x.area ? ` diện tích ${m2(x.area)}` : ''} tại tòa ${x.tower}, dự án Lumi Hà Nội (Lumi Hanoi – CapitaLand)${x.dir ? `, ban công hướng ${x.dir}` : ''}.`,
    x.interior ? (x.isRent ? `Căn ${x.intKey === 'full' ? 'cho thuê kèm đầy đủ nội thất' : 'có nội thất cơ bản'}.` : `Hiện trạng: ${x.interior.toLowerCase()}.`) : '',
    x.price ? `Giá ${x.isRent ? 'thuê' : 'bán'} theo bảng hàng: ${x.priceText}${cmp ? `, ${cmp}` : ''}.` : '',
    `Gửi mã ${x.id} qua Zalo ${PHONE_FMT} để được báo giá mới nhất và hẹn giờ xem nhà.`,
  ].filter(Boolean).join(' ');
  // Bối cảnh trong tòa: số căn cùng loại cùng tòa, cùng hướng.
  let towerCtx = '';
  if (x.isRent && !gone) {
    const sameTT = all.filter(y => y.isRent && y.tower === x.tower && y.type === x.type && y.price);
    const sameDir = x.dir ? all.filter(y => y.isRent && y.dir === x.dir && y.price).length : 0;
    const parts = [];
    if (sameTT.length > 1) {
      const st = stat(sameTT);
      const link = sameTT.length >= MIN_PAGE ? `/cho-thue/toa-${x.tower.toLowerCase()}/${x.t.slug}/` : `/cho-thue/toa-${x.tower.toLowerCase()}/`;
      parts.push(`Tòa ${x.tower} hiện có <a href="${link}">${sameTT.length} căn ${esc(x.t.short)}</a> đang cho thuê, giá từ ${tr(st.min)} đến ${tr(st.max)} triệu/tháng.`);
    } else parts.push(`Đây là căn ${esc(x.t.short)} duy nhất của tòa ${x.tower} đang có trên bảng hàng. <a href="/cho-thue/toa-${x.tower.toLowerCase()}/">Xem các căn khác tòa ${x.tower}</a>.`);
    if (sameDir > 1) parts.push(`Toàn dự án có ${sameDir} căn cho thuê cùng hướng ban công ${esc(x.dir)}.`);
    towerCtx = `<section><h2>Căn này trong tòa ${x.tower}</h2><p>${parts.join(' ')}</p></section>`;
  }
  const pos = x.price && ps.n >= 3 && ps.max > ps.min ? Math.max(0, Math.min(100, (x.price - ps.min) / (ps.max - ps.min) * 100)) : null;
  const imgs = x.imgs;
  const gallery = imgs.length ? `<div class="gal gal-${Math.min(imgs.length, 5)}">${imgs.slice(0, 5).map((u, i) => `<button type="button" class="gal-i" data-open="${i}" aria-label="Xem ảnh ${i + 1} trên ${imgs.length}"><img src="${i ? u.replace('w1280', 'w800') : u}" alt="${esc(x.title)} – ảnh ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" width="1280" height="960">${i === 4 && imgs.length > 5 ? `<span class="gal-more">+${imgs.length - 5} ảnh</span>` : ''}</button>`).join('')}</div>
<p class="g-note">${x.real ? `${I.camera}${imgs.length} ảnh chụp thực tế căn ${esc(x.id)}. Bấm vào ảnh để xem cỡ lớn.` : `${I.camera}Ảnh minh hoạ căn cùng loại, cùng kiểu nội thất. Nhắn Zalo để nhận ảnh, video thực tế của căn này.`}</p>
<dialog class="lb" aria-label="Thư viện ảnh"><div class="lb-track">${imgs.map((u, i) => `<figure><img data-src="${u.replace('w1280', 'w1600')}" alt="${esc(x.title)} – ảnh ${i + 1}"><figcaption>${i + 1}/${imgs.length}</figcaption></figure>`).join('')}</div><button type="button" class="lb-x" aria-label="Đóng">×</button><button type="button" class="lb-p" aria-label="Ảnh trước">‹</button><button type="button" class="lb-n" aria-label="Ảnh sau">›</button></dialog>`
    : `<div class="gal gal-empty">${pic(HERO, { sizes: '(max-width: 900px) 100vw, 70vw', alt: 'Hồ bơi nội khu Lumi Hà Nội' })}<span class="noimg-note">Ảnh căn đang cập nhật – ảnh trên là tiện ích nội khu Lumi. Nhắn Zalo để nhận ảnh, video căn.</span></div>`;
  const body = `<div class="wrap">${bc.html}</div>
<article class="unit wrap" data-unit="${esc(x.id)}">
  <header class="u-head">
    <div><h1>${esc(x.title)}</h1><p class="u-sub">Mã căn <b>${esc(x.id)}</b>${dt ? ` · cập nhật ${dt}` : ''}${x.real ? ' · <span class="tag tag-real">Ảnh thật</span>' : ''}</p></div>
    <div class="u-actions"><button type="button" class="btn btn-soft" data-save="${esc(x.id)}" aria-pressed="false" aria-label="Lưu căn ${esc(x.id)}">${I.heart}<span>Lưu căn</span></button><button type="button" class="btn btn-soft" data-share aria-label="Chia sẻ căn này">${I.share}<span>Chia sẻ</span></button></div>
  </header>
  <p class="u-gone"${gone ? '' : ' hidden'}>Căn này đã được gỡ khỏi bảng hàng (có thể đã cho thuê). Xem các căn tương tự bên dưới hoặc nhắn Zalo để được tìm căn mới.</p>
  ${gallery}
  <div class="u-grid">
    <div class="u-main">
      <section><h2>Thông tin căn</h2><dl class="u-facts">${rows.map(([k, v, ic]) => `<div>${ic}<dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
      <section><h2>Mô tả</h2><p>${esc(descr)}</p></section>
      ${pos !== null ? `<section><h2>Giá so với các căn ${esc(x.t.short)} khác</h2><div class="pbar"><div class="pbar-track"><span class="pbar-med" style="left:${((ps.med - ps.min) / (ps.max - ps.min) * 100).toFixed(1)}%"></span><span class="pbar-me" style="left:${pos.toFixed(1)}%"><b>Căn này</b></span></div><div class="pbar-lbl"><span>${tr(ps.min)} tr</span><span>Mức giữa ${tr(ps.med)} tr</span><span>${tr(ps.max)} tr</span></div></div><p class="muted">So với ${ps.n} căn ${x.t.short} đang ${x.isRent ? 'cho thuê' : 'bán'} trên bảng hàng.</p></section>` : ''}
      ${towerCtx}
      <section><h2>Vị trí tòa ${x.tower}</h2><p>Tòa ${x.tower} thuộc dự án Lumi Hanoi, mặt Đại lộ Thăng Long, phường Tây Mỗ. <a href="/xung-quanh-lumi-ha-noi/">Xem đường đi, chợ, trường học quanh Lumi</a>.</p>${mapFacade()}</section>
      <section><h2>Tiện ích nội khu</h2><div class="u-amen">${[['ho-boi-ngoai-troi-lumi-signature', 'Hồ bơi ngoài trời'], ['phong-gym-lumi-ha-noi', 'Phòng gym'], ['khu-vui-choi-tre-em-lumi', 'Khu trẻ em'], ['sanh-lounge-lumi-ha-noi', 'Sảnh lounge']].map(([f, c]) => `<figure>${pic(photo(f), { sizes: '(max-width: 700px) 50vw, 15vw' })}<figcaption>${c}</figcaption></figure>`).join('')}</div><p><a href="/tien-ich-lumi-ha-noi/">Xem tất cả tiện ích Lumi Hà Nội</a></p></section>
    </div>
    <aside class="u-side"><div class="u-card">
      <p class="u-price" data-f="price">${esc(x.priceText)}</p>
      <p class="u-meta">${esc(cap(x.t.short))}${x.area ? ` · ${m2(x.area)}` : ''} · Tòa ${x.tower}</p>
      <a class="btn btn-zalo wide" href="${ZALO}" rel="nofollow">${I.chat}Nhắn Zalo hỏi căn này</a>
      <a class="btn btn-line wide" href="tel:${PHONE}">${I.phone}Gọi ${PHONE_FMT}</a>
      <p class="u-hint">Gửi mã <b>${esc(x.id)}</b> khi nhắn để được báo giá mới nhất và hẹn giờ xem nhà.</p>
    </div></aside>
  </div>
</article>
${similar.length ? `<section class="listing wrap"><h2>Căn ${esc(x.t.short)} tương tự</h2><div class="grid">${similar.map(c => card(c)).join('')}</div><p class="center"><a class="btn btn-line" href="${x.isRent ? `/cho-thue/${x.t.slug}/` : '/mua-ban/'}">Xem tất cả căn ${esc(x.t.short)}</a></p></section>` : ''}`;
  const desc = `${x.title}${x.dir ? `, hướng ${x.dir}` : ''}${x.interior ? `, ${x.interior.toLowerCase()}` : ''}. Giá ${x.priceText}. Mã ${x.id}${x.real ? ', ảnh thật' : ''}. Zalo ${PHONE_FMT}.`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: x.title, url: SITE + x.url, description: descr,
    ...(x.updated ? { datePosted: x.updated } : {}), ...(imgs.length ? { image: imgs.slice(0, 6) } : {}),
    offers: { '@type': 'Offer', ...(x.price ? { price: x.price } : {}), priceCurrency: 'VND', businessFunction: `http://purl.org/goodrelations/v1#${x.isRent ? 'LeaseOut' : 'Sell'}`, availability: gone ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', seller: { '@id': SITE + '/#agent' } },
    about: { '@type': 'Apartment', name: `${x.t.name} tòa ${x.tower} Lumi Hà Nội`, ...(x.type !== 'Duplex' ? { numberOfBedrooms: Number(x.type[0]), numberOfRooms: Number(x.type[0]) } : {}), ...(x.area ? { floorSize: { '@type': 'QuantitativeValue', value: x.area, unitCode: 'MTK' } } : {}), containedInPlace: { '@id': SITE + '/#lumi' }, address: COMPLEX.address },
  };
  return layout({ title: `${x.isRent ? 'Cho thuê' : 'Bán'} ${x.t.code.toUpperCase()} Lumi Hà Nội ${x.tower}${x.area ? ` ${m2(x.area).replace(' ', '')}` : ''} ${x.priceText} (${x.id})`, desc, canonical: x.url, body, noindex: gone, ogImage: imgs[0], jsonld: [ORG, bc.ld, ld] });
}

// ---------- Trang nội dung ----------
function article({ canonical, title, desc, h1, crumbs, lead, sections, heroPhoto, faq = [], active = '' }) {
  const bc = breadcrumbs(crumbs);
  const hp = photo(heroPhoto);
  const toc = sections.map((s, i) => s.h ? `<li><a href="#m${i}">${esc(s.h)}</a></li>` : '').join('');
  const body = `<section class="page-hero has-photo">${pic(hp, { sizes: '(max-width: 700px) 180px, 100vw', cls: 'ph-bg', eager: true, alt: '' })}<div class="wrap">${bc.html}<h1>${esc(h1)}</h1><p class="lead">${lead}</p><p class="byline">Cập nhật ${DATE_LABEL} · ${BRAND}</p></div></section>
<div class="wrap art">
  ${toc ? `<nav class="toc" aria-label="Mục lục"><p>Nội dung</p><ol>${toc}</ol></nav>` : '<div></div>'}
  <div class="art-body">${sections.map((s, i) => `<section${s.h ? ` id="m${i}"` : ''}>${s.h ? `<h2>${esc(s.h)}</h2>` : ''}${s.html}</section>`).join('')}
  <aside class="art-cta"><p><b>Tìm được căn ưng ý?</b> Gửi mã căn qua Zalo để được báo giá mới nhất và hẹn xem nhà.</p><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">${I.chat}Nhắn Zalo ${PHONE_FMT}</a></aside></div>
</div>${faq.length ? faqHtml(faq) : ''}`;
  return layout({ title, desc, canonical, body, active, modified: NOW.toISOString(), ogImage: `${SITE}/img/lumi/${hp.f}.jpg`, jsonld: [ORG, bc.ld, { '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: desc, dateModified: NOW.toISOString(), datePublished: '2026-11-20', inLanguage: 'vi', image: `${SITE}/img/lumi/${hp.f}.jpg`, author: { '@id': SITE + '/#agent' }, publisher: { '@id': SITE + '/#agent' }, mainEntityOfPage: SITE + canonical }, ...(faq.length ? [faqLd(faq)] : [])] });
}
const priceTable = (rows, head) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function bars(items) {
  const max = Math.max(...items.map(i => i[1]));
  return `<div class="bars">${items.map(([l, v, h]) => `<a class="bar" href="${h}"><span class="bar-l">${l}</span><span class="bar-t"><span style="width:${(v / max * 100).toFixed(1)}%"></span></span><span class="bar-v">${tr(v)} tr</span></a>`).join('')}</div>`;
}
function pricePage(all) {
  const rent = all.filter(x => x.isRent && x.price);
  const types = Object.keys(TYPES).filter(k => rent.some(x => x.type === k));
  const towers = TOWER_ORDER.filter(t => rent.some(x => x.tower === t));
  const row = (l, list, href) => { const s = stat(list); return [href ? `<a href="${href}">${l}</a>` : l, s.n, `${tr(s.min)} tr`, `<b>${tr(s.med)} tr</b>`, `${tr(s.max)} tr`]; };
  const head = ['', 'Số căn', 'Thấp nhất', 'Mức giữa', 'Cao nhất'];
  const areaB = [[0, 50], [50, 60], [60, 70], [70, 80], [80, 100], [100, 999]].map(([a, b]) => [a, b, rent.filter(x => x.area >= a && x.area < b)]).filter(r => r[2].length >= 2);
  const s = stat(rent);
  const sections = [
    { h: 'Giá thuê theo loại căn', html: `<p>Mức giữa (trung vị) là giá nằm chính giữa danh sách: một nửa số căn rẻ hơn, một nửa đắt hơn, nên phản ánh thị trường sát hơn giá trung bình.</p>${priceTable(types.map(t => row(cap(TYPES[t].short), rent.filter(x => x.type === t), `/cho-thue/${TYPES[t].slug}/`)), head)}` },
    { h: 'Giá thuê theo nội thất', html: priceTable(types.flatMap(t => ['full', 'basic'].map(k => [t, k, rent.filter(x => x.type === t && x.intKey === k)]).filter(r => r[2].length).map(([t, k, l]) => row(`${cap(TYPES[t].short)} – ${INTERIORS[k].name}`, l, l.length >= MIN_PAGE ? `/cho-thue/${TYPES[t].slug}/${INTERIORS[k].slug}/` : ''))), head) },
    { h: 'Giá thuê theo tòa', html: `${bars(towers.map(t => [`Tòa ${t}`, stat(rent.filter(x => x.tower === t)).med, `/cho-thue/toa-${t.toLowerCase()}/`]))}<p class="muted">Thanh thể hiện mức giữa giá thuê của các căn đang trống trong tòa. Mỗi tòa có tỉ lệ 1PN/2PN/3PN khác nhau, nên xem thêm bảng bên dưới.</p>${priceTable(towers.map(t => row(`Tòa ${t}`, rent.filter(x => x.tower === t), `/cho-thue/toa-${t.toLowerCase()}/`)), head)}` },
    { h: 'Giá thuê theo diện tích', html: priceTable(areaB.map(([a, b, l]) => row(b === 999 ? `Từ ${a} m²` : a === 0 ? `Dưới ${b} m²` : `${a}–${b} m²`, l)), head) },
    { h: 'Cách đọc bảng giá', html: `<ul><li>Giá lấy trực tiếp từ bảng hàng, là giá chủ nhà chào thuê; giá chốt có thể thương lượng.</li><li>Bảng tự cập nhật khi bảng hàng thay đổi. Căn đã cho thuê không còn được tính.</li><li>Muốn biết giá chính xác của một căn, gửi mã căn qua Zalo ${PHONE_FMT}.</li></ul>` },
  ];
  return article({ canonical: '/bang-gia-thue-lumi-ha-noi/', title: `Bảng giá thuê căn hộ Lumi Hà Nội ${MONTH_LABEL} (cập nhật hằng ngày) | ${BRAND}`, desc: `Giá thuê căn hộ Lumi Hà Nội ${MONTH_LABEL}: ${s.n} căn, từ ${tr(s.min)} đến ${tr(s.max)} triệu/tháng. Bảng giá 1PN, 2PN, 3PN theo tòa, diện tích, nội thất.`, h1: `Bảng giá thuê căn hộ Lumi Hà Nội ${MONTH_LABEL}`, crumbs: [['Trang chủ', '/'], ['Bảng giá thuê', '/bang-gia-thue-lumi-ha-noi/']], lead: `Tổng hợp từ <b>${s.n} căn</b> đang cho thuê trên bảng hàng. Giá từ ${tr(s.min)} đến ${tr(s.max)} triệu/tháng, mức giữa ${tr(s.med)} triệu.`, sections, heroPhoto: 'ho-boi-bac-thang-lumi-ha-noi', active: '/bang-gia-thue-lumi-ha-noi/' });
}
function guidePage(all) {
  const rent = all.filter(x => x.isRent && x.price);
  const ty = k => stat(rent.filter(x => x.type === k));
  const dirs = uniq(rent.map(x => x.dir).filter(Boolean)).map(d => [d, stat(rent.filter(x => x.dir === d))]).filter(([, s]) => s.n >= 5).sort((a, b) => b[1].n - a[1].n);
  const fb = Object.keys(TYPES).map(k => [k, stat(rent.filter(x => x.type === k && x.intKey === 'full')), stat(rent.filter(x => x.type === k && x.intKey === 'basic'))]).filter(([, f, b]) => f.n >= 2 && b.n >= 2);
  const sections = [
    { h: 'Chọn loại căn theo số người ở và ngân sách', html: `<ul>${['1PN', '2PN', '3PN'].filter(k => ty(k).n).map(k => { const s = ty(k); return `<li><b>${cap(TYPES[k].short)}</b>: ${s.n} căn, ${tr(s.min)}–${tr(s.max)} triệu/tháng, diện tích ${m2(s.areaMin)}–${m2(s.areaMax)}. <a href="/cho-thue/${TYPES[k].slug}/">Xem căn ${TYPES[k].short}</a></li>`; }).join('')}</ul><p>Người ở một mình hoặc cặp đôi thường chọn 1 phòng ngủ; gia đình nhỏ chọn 2 phòng ngủ; gia đình đông người hoặc cần phòng làm việc riêng nên xem 3 phòng ngủ.</p>` },
    { h: 'Full nội thất hay nội thất cơ bản?', html: `${fb.length ? `<p>Chênh lệch theo bảng hàng hiện tại (mức giữa):</p><ul>${fb.map(([k, f, b]) => `<li>${cap(TYPES[k].short)}: full nội thất ${tr(f.med)} triệu, cơ bản ${tr(b.med)} triệu – chênh khoảng ${tr(Math.abs(f.med - b.med))} triệu/tháng.</li>`).join('')}</ul>` : ''}<p>Căn cơ bản hợp với người đã có đồ hoặc thuê dài hạn; căn full nội thất tiện dọn vào ở ngay. Với căn cơ bản, hỏi rõ chủ nhà đã có những gì (rèm, đèn, điều hoà, bếp, giàn phơi…).</p>` },
    { h: 'Hướng ban công', html: `${dirs.length ? `<p>Phần lớn căn đang cho thuê ở Lumi có ban công hướng ${dirs.slice(0, 2).map(([d]) => d).join(' hoặc ')}:</p><ul>${dirs.map(([d, s]) => `<li>${esc(d)}: ${s.n} căn, mức giữa ${tr(s.med)} triệu/tháng.</li>`).join('')}</ul>` : ''}<p>Hướng ảnh hưởng tới nắng chiều và gió; nếu ngại nắng, nên đi xem nhà vào buổi chiều để cảm nhận thực tế.</p>` },
    { h: 'Khi đi xem nhà nên kiểm tra gì?', html: `<ul class="ticks">${['Chụp lại tình trạng tường, sàn, cửa, thiết bị vệ sinh trước khi nhận nhà', 'Bật thử điều hoà, bình nóng lạnh, bếp, máy giặt (nếu có)', 'Hỏi rõ chỗ để xe máy, ô tô và cách đăng ký thẻ cư dân', 'Hỏi ai trả phí quản lý, internet, truyền hình', 'Ghi chỉ số công tơ điện, nước lúc bàn giao'].map(t => `<li>${I.check}${t}</li>`).join('')}</ul>` },
    { h: 'Hợp đồng và đặt cọc', html: `<p>Những điểm nên thống nhất bằng văn bản với chủ nhà trước khi chuyển tiền cọc:</p><ul><li>Giá thuê, kỳ thanh toán và thời hạn hợp đồng.</li><li>Số tiền cọc và điều kiện hoàn cọc khi kết thúc hợp đồng.</li><li>Phí quản lý, gửi xe, điện nước do ai trả.</li><li>Danh sách nội thất bàn giao kèm ảnh.</li><li>Điều kiện chấm dứt hợp đồng trước hạn.</li></ul><p class="muted">Mức cọc và kỳ thanh toán do chủ nhà quyết định và khác nhau giữa các căn.</p>` },
    { h: 'Thuê qua Căn Hộ Lumi', html: `<p>Mọi căn trên website lấy từ bảng hàng đang làm việc với chủ nhà. Gửi mã căn qua <a href="${ZALO}" rel="nofollow">Zalo ${PHONE_FMT}</a> để được xác nhận giá mới nhất và hẹn lịch xem.</p>` },
  ];
  return article({ canonical: '/kinh-nghiem-thue-can-ho-lumi/', title: `Kinh nghiệm thuê căn hộ Lumi Hà Nội: chọn căn, giá, hợp đồng | ${BRAND}`, desc: `Kinh nghiệm thuê căn hộ Lumi Hà Nội: chọn 1PN, 2PN hay 3PN, full nội thất hay cơ bản, hướng ban công, kiểm tra khi xem nhà, hợp đồng và đặt cọc. Số liệu từ ${rent.length} căn đang cho thuê.`, h1: 'Kinh nghiệm thuê căn hộ Lumi Hà Nội', crumbs: [['Trang chủ', '/'], ['Kinh nghiệm thuê', '/kinh-nghiem-thue-can-ho-lumi/']], lead: `Hướng dẫn chọn căn kèm số liệu thật từ ${rent.length} căn đang cho thuê trên bảng hàng.`, sections, heroPhoto: 'phong-khach-chung-lumi', active: '/kinh-nghiem-thue-can-ho-lumi/' });
}
function amenityPage() {
  const CAT = [['ho-boi', 'Hồ bơi ngoài trời', 'Theo CapitaLand Development, Lumi Hanoi có ba hồ bơi ngoài trời, bao quanh bởi vườn cây và sân tắm nắng.'], ['the-thao', 'Thể thao', 'Phòng gym, sân tennis, thảm cỏ và khu tập golf trong nội khu.'], ['sinh-hoat', 'Sảnh và phòng sinh hoạt cộng đồng', 'Không gian chung để tiếp khách, làm việc, đọc sách.'], ['giai-tri', 'Phòng giải trí', 'Phòng bi-a, shuffleboard nhìn ra hồ bơi.'], ['tre-em', 'Khu vui chơi trẻ em', 'Khu chơi trong nhà cho các bé.'], ['canh-quan', 'Cảnh quan', 'Cầu đi bộ, lối dạo trong vườn cây.'], ['toan-canh', 'Lumi Signature', 'Lối vào và tháp biểu tượng của dự án.']];
  const sections = [{ h: '', html: `<p>Lumi Hanoi do CapitaLand Development phát triển. Theo thông tin chủ đầu tư công bố khi bàn giao phân khu Lumi Signature (tháng 9/2026), dự án có hơn 80 tiện ích nội khu, trong đó có ba hồ bơi ngoài trời. Người thuê căn hộ sử dụng tiện ích như cư dân theo quy định của ban quản lý.</p><p><a class="btn btn-lamp" href="/#danh-sach">Xem căn đang cho thuê</a></p>` },
    ...CAT.map(([c, h, d]) => ({ h, html: `<p>${d}</p><div class="pgrid">${PHOTOS.filter(p => p.cat === c).map(p => `<figure>${pic(p, { sizes: '(max-width: 700px) 100vw, 33vw' })}<figcaption>${esc(p.alt)}</figcaption></figure>`).join('')}</div>` }))];
  return article({ canonical: '/tien-ich-lumi-ha-noi/', title: `Tiện ích Lumi Hà Nội: hồ bơi, gym, tennis, khu trẻ em (ảnh thực tế) | ${BRAND}`, desc: 'Ảnh thực tế tiện ích Lumi Hà Nội: hồ bơi ngoài trời, phòng gym, sân tennis, sảnh lounge, phòng bi-a, khu vui chơi trẻ em, cầu đi bộ cảnh quan.', h1: 'Tiện ích Lumi Hà Nội', crumbs: [['Trang chủ', '/'], ['Tiện ích', '/tien-ich-lumi-ha-noi/']], lead: 'Ảnh thực tế các tiện ích nội khu dành cho cư dân và người thuê căn hộ Lumi.', sections, heroPhoto: 'ho-boi-ngoai-troi-lumi-signature', active: '/tien-ich-lumi-ha-noi/' });
}
const SRC = {
  capitaland: ['CapitaLand – Lumi Hanoi', 'https://www.capitaland.com/sites/lumihanoi/vn/index.html'],
  capitaland2: ['CapitaLand – thông tin dự án', 'https://www.capitaland.com/vn/vi/stay/residential-development-listing/lumi-hanoi.html'],
  cafeland: ['CafeLand – Lumi Hanoi', 'https://cafeland.vn/du-an/lumi-hanoi-du-an-chung-cu-cao-cap-tai-ha-noi-4269.html'],
};
const src = k => `<a href="${SRC[k][1]}" target="_blank" rel="noopener">${SRC[k][0]}</a>`;
function areaPage() {
  const sections = [
    { h: 'Địa chỉ Lumi Hà Nội', html: `<p>Theo ${src('capitaland')}, địa chỉ dự án là <b>Ô C3-CH01-1, khu đô thị mới Tây Mỗ – Đại Mỗ, phường Tây Mỗ, Hà Nội</b>, kết nối trực tiếp Đại lộ Thăng Long và đường Vành đai 3.5.</p>${mapFacade()}` },
    { h: 'Đi lại', html: `<ul><li>Theo ${src('capitaland2')}, từ dự án mất khoảng 20 phút lái xe đến quận trung tâm Hà Nội và khoảng 40 phút đến sân bay Nội Bài (thời gian thực tế phụ thuộc giờ cao điểm).</li><li>Chủ đầu tư giới thiệu khu vực có các tuyến metro số 5, 6, 7 đang được triển khai.</li></ul>` },
    { h: 'Chợ, trường học quanh dự án', html: `<p>Theo ${src('cafeland')}:</p><ul><li>Chợ Miêu Nha: khoảng 700 m</li><li>Trường mầm non Tây Mỗ: khoảng 1 km</li><li>Trường tiểu học Lý Nam Đế: khoảng 1,1 km</li><li>Khu đô thị Vinhomes Smart City: khoảng 3,1 km</li></ul>` },
    { h: 'Mua sắm, khách sạn lân cận', html: `<p>Bản đồ vị trí trên ${src('capitaland')} đánh dấu các điểm: Trung tâm thương mại The Manor, Đại siêu thị Big C Thăng Long, khách sạn Hyatt Regency West Hanoi, khách sạn JW Marriott Hanoi.</p>` },
    { h: 'Tiện ích trong nội khu', html: `<p>Người thuê căn hộ dùng chung hồ bơi, phòng gym, sân tennis, khu trẻ em và phòng sinh hoạt cộng đồng. <a href="/tien-ich-lumi-ha-noi/">Xem ảnh thực tế tiện ích</a>.</p>${amenityBento()}` },
  ];
  return article({ canonical: '/xung-quanh-lumi-ha-noi/', title: 'Lumi Hà Nội ở đâu? Địa chỉ, đi lại, chợ, trường học xung quanh', desc: 'Địa chỉ Lumi Hà Nội (phường Tây Mỗ, Đại lộ Thăng Long), thời gian đi trung tâm và Nội Bài, chợ Miêu Nha, trường mầm non Tây Mỗ, tiểu học Lý Nam Đế, Vinhomes Smart City.', h1: 'Lumi Hà Nội ở đâu? Địa chỉ và tiện ích xung quanh', crumbs: [['Trang chủ', '/'], ['Xung quanh Lumi', '/xung-quanh-lumi-ha-noi/']], lead: 'Thông tin vị trí, đi lại và các điểm thiết yếu quanh dự án Lumi Hanoi, có ghi rõ nguồn.', sections, heroPhoto: 'thap-lumi-hanoi' });
}
function comparePage(all) {
  const rent = all.filter(x => x.isRent && x.price);
  const types = ['1PN', '2PN', '3PN'].filter(k => rent.some(x => x.type === k));
  const st = Object.fromEntries(types.map(k => [k, stat(rent.filter(x => x.type === k))]));
  const ft = k => stat(rent.filter(x => x.type === k && x.intKey === 'full')), bt = k => stat(rent.filter(x => x.type === k && x.intKey === 'basic'));
  const rows = [['Số căn đang cho thuê', ...types.map(k => st[k].n)], ['Diện tích', ...types.map(k => `${m2(st[k].areaMin)}–${m2(st[k].areaMax)}`)], ['Giá thuê', ...types.map(k => `${tr(st[k].min)}–${tr(st[k].max)} tr`)], ['Mức giữa', ...types.map(k => `<b>${tr(st[k].med)} tr</b>`)], ['Mức giữa full nội thất', ...types.map(k => ft(k).n ? `${tr(ft(k).med)} tr` : '–')], ['Mức giữa nội thất cơ bản', ...types.map(k => bt(k).n ? `${tr(bt(k).med)} tr` : '–')]];
  const sections = [
    { h: 'Bảng so sánh nhanh', html: `${priceTable(rows, ['', ...types.map(k => `<a href="/cho-thue/${TYPES[k].slug}/">${cap(TYPES[k].short)}</a>`)])}<p class="muted">Số liệu tính từ ${rent.length} căn đang cho thuê trên bảng hàng ngày ${DATE_LABEL}, tự cập nhật.</p>` },
    ...types.map(k => ({ h: `Căn ${TYPES[k].short} phù hợp với ai?`, html: `<p>${{ '1PN': 'Người đi làm ở một mình hoặc cặp đôi, cần căn gọn, chi phí thấp nhất trong dự án.', '2PN': 'Gia đình trẻ có con nhỏ, hoặc hai người cần thêm phòng làm việc. Đây là loại căn có nhiều lựa chọn nhất.', '3PN': 'Gia đình đông người, ở cùng ông bà hoặc cần phòng riêng cho từng con.' }[k]}</p><p>${st[k].n} căn, diện tích ${m2(st[k].areaMin)}–${m2(st[k].areaMax)}, giá ${tr(st[k].min)}–${tr(st[k].max)} triệu/tháng. <a href="/cho-thue/${TYPES[k].slug}/">Xem tất cả căn ${TYPES[k].short}</a></p>` })),
  ];
  return article({ canonical: '/so-sanh-can-1pn-2pn-3pn-lumi/', title: `So sánh căn 1PN, 2PN, 3PN Lumi Hà Nội: diện tích, giá thuê, nội thất`, desc: `So sánh căn hộ 1 phòng ngủ, 2 phòng ngủ, 3 phòng ngủ tại Lumi Hà Nội: diện tích, giá thuê, chênh lệch full nội thất và cơ bản. Số liệu từ ${rent.length} căn đang cho thuê.`, h1: 'So sánh căn 1PN, 2PN, 3PN ở Lumi Hà Nội', crumbs: [['Trang chủ', '/'], ['So sánh loại căn', '/so-sanh-can-1pn-2pn-3pn-lumi/']], lead: 'Chọn loại căn hợp với số người ở và ngân sách, dựa trên số liệu thật từ bảng hàng.', sections, heroPhoto: 'phong-sinh-hoat-cong-dong-lumi' });
}
function contactPage() {
  const bc = breadcrumbs([['Trang chủ', '/'], ['Liên hệ', '/lien-he/']]);
  const body = `<section class="page-hero"><div class="wrap">${bc.html}<h1>Liên hệ Căn Hộ Lumi</h1><p class="lead">Xem nhà, hỏi giá, ký gửi căn hộ tại Lumi Hà Nội.</p></div></section>
<section class="wrap contact"><div class="nap">
<p class="nap-name">Căn Hộ Lumi – cho thuê căn hộ Lumi Hà Nội</p>
<p><b>Khu vực hoạt động:</b> Dự án Lumi Hanoi, Ô C3-CH01-1, khu đô thị mới Tây Mỗ – Đại Mỗ, Đại lộ Thăng Long, phường Tây Mỗ, Hà Nội</p>
<p><b>Điện thoại / Zalo:</b> <a href="tel:${PHONE}">${PHONE_FMT}</a></p>
<p><b>Website:</b> <a href="${SITE}/">canholumi.com</a></p>
<p class="cta-row"><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">${I.chat}Nhắn Zalo</a><a class="btn btn-line" href="tel:${PHONE}">${I.phone}Gọi ngay</a></p>
</div>${mapFacade()}</section>`;
  return layout({ title: `Liên hệ Căn Hộ Lumi – thuê căn hộ Lumi Hà Nội, Zalo ${PHONE_FMT}`, desc: `Liên hệ xem nhà, hỏi giá thuê căn hộ Lumi Hà Nội (phường Tây Mỗ, Đại lộ Thăng Long). Zalo/điện thoại ${PHONE_FMT}.`, canonical: '/lien-he/', body, jsonld: [ORG, bc.ld, { '@context': 'https://schema.org', '@type': 'ContactPage', url: SITE + '/lien-he/', about: { '@id': SITE + '/#agent' } }] });
}
function feed(all) {
  const list = [...all].filter(x => x.isRent).sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 50);
  return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Căn hộ Lumi Hà Nội cho thuê – mới cập nhật</title><link href="${SITE}/feed.xml" rel="self"/><link href="${SITE}/"/><id>${SITE}/</id><updated>${NOW.toISOString()}</updated><author><name>${BRAND}</name></author>\n${list.map(x => `<entry><title>${esc(x.title)} – ${esc(x.priceText)}</title><link href="${SITE}${x.url}"/><id>${SITE}${x.url}</id><updated>${(x.updated || TODAY)}T00:00:00Z</updated><summary>${esc(`${x.t.short}, ${x.area ? m2(x.area) + ', ' : ''}tòa ${x.tower}${x.dir ? `, hướng ${x.dir}` : ''}${x.interior ? `, ${x.interior.toLowerCase()}` : ''}. Mã ${x.id}.`)}</summary></entry>`).join('\n')}\n</feed>\n`;
}
function ownerPage() {
  const sections = [{ h: '', html: `<ol class="steps-ol"><li><h3>Nhắn Zalo ${PHONE_FMT}</h3><p>Gửi mã căn (tòa, tầng, số căn), diện tích, giá mong muốn và tình trạng nội thất.</p></li><li><h3>Gửi ảnh hoặc video căn</h3><p>Ảnh thật giúp căn được hỏi nhiều hơn. Nếu chưa có, bên em có thể hẹn qua chụp.</p></li><li><h3>Căn lên bảng hàng và website</h3><p>Sau khi xác nhận, căn hiển thị trên canholumi.com với mã riêng, kèm bài đăng nhóm cư dân. Khi cho thuê xong, căn tự gỡ khỏi web.</p></li></ol>` }];
  return article({ canonical: '/chu-nha-ky-gui/', title: `Chủ nhà Lumi Hà Nội ký gửi cho thuê, bán căn hộ | ${BRAND}`, desc: `Chủ nhà Lumi Hà Nội muốn cho thuê hoặc bán căn hộ: nhắn Zalo ${PHONE_FMT} để đưa căn lên bảng hàng, website và nhóm cư dân.`, h1: 'Chủ nhà Lumi ký gửi cho thuê, bán căn hộ', crumbs: [['Trang chủ', '/'], ['Ký gửi', '/chu-nha-ky-gui/']], lead: 'Căn của anh chị có mặt trên bảng hàng cho đội cộng tác viên, trên website này và trong các bài đăng nhóm cư dân Lumi mỗi ngày.', sections, heroPhoto: 'bien-hieu-lumi-signature', active: '/chu-nha-ky-gui/' });
}
function towersIndex(rent) {
  const by = {}; for (const x of rent) (by[x.tower] ||= []).push(x);
  const towers = TOWER_ORDER.filter(t => by[t]);
  const bc = breadcrumbs([['Trang chủ', '/'], ['Các tòa', '/cac-toa/']]);
  const body = `<section class="page-hero"><div class="wrap">${bc.html}<h1>Căn hộ cho thuê theo từng tòa Lumi Hà Nội</h1><p class="lead">Số căn trống và khoảng giá thuê của từng tòa. Chọn tòa để xem danh sách.</p></div></section>
<section class="wrap tower-list">${towers.map(t => { const s = stat(by[t]); return `<a href="/cho-thue/toa-${t.toLowerCase()}/"><b>Tòa ${t}</b><span>${s.n} căn · ${tr(s.min)}–${tr(s.max)} triệu/tháng</span><span class="tl-types">${Object.keys(TYPES).filter(k => by[t].some(x => x.type === k)).map(k => `${TYPES[k].code.toUpperCase()}: ${by[t].filter(x => x.type === k).length}`).join(' · ')}</span></a>`; }).join('')}</section>`;
  return layout({ title: `Cho thuê căn hộ Lumi Hà Nội theo tòa ${towers.join(', ')} | ${BRAND}`, desc: `Căn hộ cho thuê Lumi Hà Nội theo từng tòa ${towers.join(', ')}: số căn trống, giá thuê thấp nhất – cao nhất, loại căn.`, canonical: '/cac-toa/', body, active: '/cac-toa/', jsonld: [ORG, bc.ld] });
}
function savedPage() {
  const body = `<section class="page-hero"><div class="wrap"><h1>Căn hộ đã lưu</h1><p class="lead">Các căn anh chị bấm ♥ được lưu trên trình duyệt này. Gửi danh sách mã căn qua Zalo để xem nhiều căn trong một buổi.</p></div></section>
<section class="listing wrap"><div class="grid" id="saved-grid"></div><p class="empty" id="saved-empty">Chưa có căn nào được lưu. <a href="/#danh-sach">Xem căn đang cho thuê</a></p><p class="center"><button type="button" class="btn btn-zalo" id="saved-copy" hidden>${I.chat}Chép danh sách mã căn để gửi Zalo</button></p></section>`;
  return layout({ title: `Căn đã lưu | ${BRAND}`, desc: 'Danh sách căn hộ Lumi anh chị đã lưu.', canonical: '/da-luu/', noindex: true, body });
}
function enPage(all) {
  const rent = sortUnits(all.filter(x => x.isRent));
  const s = stat(rent);
  const types = ['1PN', '2PN', '3PN'].filter(k => rent.some(x => x.type === k));
  const enCard = x => `<article class="card" data-id="${esc(x.id)}" data-rent="1" data-type="${x.type}" data-tower="${x.tower}" data-int="${x.intKey}" data-price="${x.price}" data-area="${x.area || 0}" data-new="${score(x)}${x.updated || ''}"><a class="card-media" href="${x.url}" tabindex="-1" aria-hidden="true">${x.imgs[0] ? `<img src="${x.imgs[0].replace('w1280', 'w600')}" alt="" loading="lazy" width="600" height="450">` : `<span class="noimg">${logoSvg()}</span>`}<span class="tags">${x.real ? '<span class="tag tag-real">Real photos</span>' : ''}${x.intKey === 'full' ? '<span class="tag tag-full">Furnished</span>' : ''}</span></a><div class="card-body"><p class="price">${x.price ? `${trEn(x.price)}M VND/month` : 'Contact'}</p><h3><a href="${x.url}">${x.t.en} · Tower ${x.tower}</a></h3><ul class="facts">${x.area ? `<li>${I.area}${x.area} m²</li>` : ''}${x.intKey ? `<li>${I.sofa}${INTERIORS[x.intKey].en}</li>` : ''}</ul><p class="code">Code ${esc(x.id)}</p></div></article>`;
  const body = `<section class="page-hero has-photo">${pic(HERO, { sizes: '(max-width: 700px) 180px, 100vw', cls: 'ph-bg', eager: true, alt: '' })}<div class="wrap"><h1>Lumi Hanoi apartments for rent</h1><p class="lead"><b>${s.n} apartments</b> available now at Lumi Hanoi (CapitaLand), Thang Long Avenue, West Hanoi. Rents from ${trEn(s.min)}M to ${trEn(s.max)}M VND per month. Listings sync with our live inventory every minute.</p>
<p class="cta-row"><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">${I.chat}Message on Zalo</a> <a class="btn btn-ghost" href="tel:${PHONE_INTL}">${I.phone}Call ${PHONE_INTL}</a></p></div></section>
<section class="wrap en-sec"><h2>Rent by apartment type</h2>${priceTable(types.map(t => { const st = stat(rent.filter(x => x.type === t)); return [TYPES[t].en, st.n, `${trEn(st.min)}M`, `<b>${trEn(st.med)}M</b>`, `${trEn(st.max)}M`]; }), ['', 'Units', 'From', 'Median', 'Up to'])}<p class="muted">Monthly rent in million VND as listed by owners; final price is negotiable.</p></section>
<section class="listing wrap" id="danh-sach"><h2>Available apartments</h2><div class="grid" id="ds" data-scope="${esc(JSON.stringify({ rent: 1, noAdd: 1 }))}">${rent.map(enCard).join('')}</div><p class="more-wrap"><button type="button" class="btn btn-line" id="more" hidden>Show more</button></p></section>
<section class="amen"><div class="wrap"><div class="sec-head"><h2>Living at Lumi Hanoi</h2><p>According to CapitaLand Development, Lumi Hanoi offers more than 80 on-site amenities including three outdoor swimming pools. Tenants share the facilities with residents.</p></div>${amenityBento()}</div></section>
<section class="wrap steps"><h2>How to rent</h2><ol><li><h3>Pick an apartment</h3><p>Note its code, e.g. ${esc(rent[0]?.id || '')}.</p></li><li><h3>Message us on Zalo ${PHONE_FMT}</h3><p>Send the code and your preferred viewing time.</p></li><li><h3>View and agree terms</h3><p>We arrange the viewing; rent, term and deposit are agreed with the owner.</p></li></ol></section>`;
  return layout({ lang: 'en', title: `Lumi Hanoi Apartments for Rent – ${s.n} units from ${trEn(s.min)}M VND | ${BRAND}`, desc: `${s.n} apartments for rent at Lumi Hanoi (CapitaLand), Thang Long Avenue: 1, 2 and 3 bedrooms, furnished or basic, real photos, live availability. Zalo ${PHONE_FMT}.`, canonical: '/en/', body, active: '/en/', alt: [['vi', '/'], ['en', '/en/'], ['x-default', '/']], jsonld: [ORG, COMPLEX, itemList(rent, 'Lumi Hanoi apartments for rent')] });
}
const redirect = to => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Đã chuyển trang</title><link rel="canonical" href="${SITE}${to}"><meta name="robots" content="noindex, follow"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p>Trang đã chuyển tới <a href="${to}">${SITE}${to}</a>.</p><script>location.replace(${JSON.stringify(to)}+location.search+location.hash)</script></body></html>`;

// ---------- Chạy ----------
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

const raw = await loadData();
const cur = prepare(raw);
if (cur.filter(x => x.isRent).length < 20) throw new Error('Quá ít căn – dừng để không ghi đè web bằng dữ liệu lỗi');
const prevArch = await loadArchive();
const curIds = new Set(cur.map(x => x.id));
const gone = (prevArch.units || []).filter(u => u && u.id && !curIds.has(u.id) && TYPES[u.type]).map(u => ({ ...u, goneAt: u.goneAt || NOW.toISOString() })).filter(u => (NOW - new Date(u.goneAt)) / 864e5 <= ARCHIVE_DAYS);
const all = cur.map(enrich);
const goneUnits = gone.map(enrich).filter(g => !all.some(a => a.url === g.url));
const rent = all.filter(x => x.isRent), sale = all.filter(x => !x.isRent);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync('static', OUT, { recursive: true });

const urls = [];
const add = (u, lastmod = TODAY, pri = '0.6', images = []) => urls.push({ u, lastmod, pri, images });
const lastUpd = list => list.map(x => x.updated).filter(Boolean).sort().pop() || TODAY;

const pages = [];
const typeKeys = Object.keys(TYPES).filter(k => rent.filter(x => x.type === k).length >= MIN_PAGE);
const towerKeys = TOWER_ORDER.filter(t => rent.filter(x => x.tower === t).length >= MIN_PAGE);
for (const k of typeKeys) pages.push({ kind: 'type', k, url: `/cho-thue/${TYPES[k].slug}/`, label: `Thuê ${TYPES[k].short}`, list: rent.filter(x => x.type === k) });
for (const t of towerKeys) pages.push({ kind: 'tower', t, url: `/cho-thue/toa-${t.toLowerCase()}/`, label: `Tòa ${t}`, list: rent.filter(x => x.tower === t) });
for (const t of towerKeys) for (const k of typeKeys) { const l = rent.filter(x => x.tower === t && x.type === k); if (l.length >= MIN_PAGE) pages.push({ kind: 'tt', t, k, url: `/cho-thue/toa-${t.toLowerCase()}/${TYPES[k].slug}/`, label: `${TYPES[k].code.toUpperCase()} tòa ${t}`, list: l }); }
for (const [ik, inf] of Object.entries(INTERIORS)) { const l = rent.filter(x => x.intKey === ik); if (l.length >= MIN_PAGE) pages.push({ kind: 'int', ik, url: `/cho-thue/${inf.slug}/`, label: inf.label, list: l }); }
for (const k of typeKeys) for (const [ik, inf] of Object.entries(INTERIORS)) { const l = rent.filter(x => x.type === k && x.intKey === ik); if (l.length >= MIN_PAGE) pages.push({ kind: 'ti', k, ik, url: `/cho-thue/${TYPES[k].slug}/${inf.slug}/`, label: `${TYPES[k].code.toUpperCase()} ${inf.name}`, list: l }); }
for (const b of BANDS) { const l = rent.filter(x => x.price >= b.min && x.price <= b.max); if (l.length >= MIN_PAGE) pages.push({ kind: 'band', b, url: `/cho-thue/${b.slug}/`, label: `Giá ${b.label}`, list: l }); }

QUICK = () => `<span>Tìm nhanh:</span>${pages.filter(p => ['type', 'int', 'band'].includes(p.kind)).map(p => `<a href="${p.url}">${esc(p.label)}</a>`).join('')}`;
FOOT_LINKS = `<div class="foot-col"><p class="foot-h">Thuê theo loại căn</p>${pages.filter(p => ['type', 'int', 'band'].includes(p.kind)).map(p => `<a href="${p.url}">${esc(p.label)}</a>`).join('')}</div>
<div class="foot-col"><p class="foot-h">Thuê theo tòa</p>${pages.filter(p => p.kind === 'tower').map(p => `<a href="${p.url}">Căn hộ ${esc(p.label)}</a>`).join('')}<a href="/cac-toa/">So sánh các tòa</a></div>
<div class="foot-col"><p class="foot-h">Thông tin</p><a href="/bang-gia-thue-lumi-ha-noi/">Bảng giá thuê ${MONTH_LABEL}</a><a href="/kinh-nghiem-thue-can-ho-lumi/">Kinh nghiệm thuê</a><a href="/tien-ich-lumi-ha-noi/">Tiện ích Lumi</a><a href="/xung-quanh-lumi-ha-noi/">Vị trí, xung quanh Lumi</a><a href="/so-sanh-can-1pn-2pn-3pn-lumi/">So sánh 1PN, 2PN, 3PN</a><a href="/mua-ban/">Mua bán căn hộ</a><a href="/chu-nha-ky-gui/">Chủ nhà ký gửi</a><a href="/lien-he/">Liên hệ</a><a href="/en/" lang="en">Lumi Hanoi for rent (English)</a></div>`;

write('index.html', homePage(all, raw)); add('/', TODAY, '1.0', [`${SITE}/img/lumi/${HERO.f}.jpg`]);

const PAGE_PHOTO = { type: { '1PN': 'phong-sinh-hoat-cong-dong-lumi', '2PN': 'ho-boi-ngoai-troi-lumi-signature', '3PN': 'ho-boi-bac-thang-lumi-ha-noi' }, tower: 'thap-lumi-hanoi', band: 'san-tam-nang-ho-boi-lumi' };
for (const p of pages) {
  let h1, what, title, desc, crumbs, scope, related = [], filterOpts = {}, heroPhoto, faq = [], extra = '';
  const s = stat(p.list);
  const rng = `${tr(s.min)}–${tr(s.max)} triệu`;
  if (p.kind === 'type') {
    const T = TYPES[p.k]; h1 = `Cho thuê ${T.name} Lumi Hà Nội`; what = `${T.name} cho thuê`; heroPhoto = PAGE_PHOTO.type[p.k];
    title = `Cho thuê ${T.name} Lumi Hà Nội – ${s.n} căn, ${rng} | ${BRAND}`; desc = `${s.n} ${T.name} cho thuê Lumi Hà Nội, giá ${rng}/tháng, diện tích ${m2(s.areaMin)}–${m2(s.areaMax)}. ${s.full} căn full nội thất, ảnh thật, mã căn rõ ràng. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], [cap(T.short), p.url]]; scope = { rent: 1, type: p.k }; filterOpts = { noType: true };
    related = pages.filter(q => (q.kind === 'ti' || q.kind === 'tt') && q.k === p.k).map(q => [q.url, q.label]);
    faq = [[`Thuê ${T.name} ở Lumi Hà Nội giá bao nhiêu?`, `Theo bảng hàng hiện tại, ${s.n} căn ${T.short} có giá từ ${tr(s.min)} đến ${tr(s.max)} triệu/tháng, mức giữa ${tr(s.med)} triệu.`], [`Diện tích ${T.name} ở Lumi khoảng bao nhiêu?`, `Các căn ${T.short} đang cho thuê có diện tích từ ${m2(s.areaMin)} đến ${m2(s.areaMax)}.`], [`Có bao nhiêu căn ${T.short} full nội thất?`, `${s.full} trên ${s.n} căn ${T.short} đang cho thuê là căn full nội thất.`]];
  } else if (p.kind === 'tower') {
    h1 = `Cho thuê căn hộ tòa ${p.t} Lumi Hà Nội`; what = `căn hộ cho thuê ở tòa ${p.t}`; heroPhoto = PAGE_PHOTO.tower;
    title = `Cho thuê căn hộ tòa ${p.t} Lumi Hà Nội – ${s.n} căn, ${rng} | ${BRAND}`; desc = `${s.n} căn hộ cho thuê tòa ${p.t} Lumi Hà Nội: ${uniq(p.list.map(x => x.type)).join(', ')}. Giá ${rng}/tháng, ảnh và mã căn rõ ràng. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], ['Các tòa', '/cac-toa/'], [`Tòa ${p.t}`, p.url]]; scope = { rent: 1, tower: p.t }; filterOpts = { noTower: true };
    related = pages.filter(q => q.kind === 'tt' && q.t === p.t).map(q => [q.url, q.label]).concat(pages.filter(q => q.kind === 'tower' && q.t !== p.t).map(q => [q.url, q.label]));
    extra = towerSummary(p.t, p.list);
    faq = [[`Thuê căn hộ tòa ${p.t} Lumi giá bao nhiêu?`, `Theo bảng hàng hiện tại, ${s.n} căn ở tòa ${p.t} có giá từ ${tr(s.min)} đến ${tr(s.max)} triệu/tháng, mức giữa ${tr(s.med)} triệu.`], [`Tòa ${p.t} có những loại căn nào đang cho thuê?`, Object.keys(TYPES).filter(k => p.list.some(x => x.type === k)).map(k => `${TYPES[k].short}: ${p.list.filter(x => x.type === k).length} căn`).join('; ') + '.']];
  } else if (p.kind === 'tt') {
    const T = TYPES[p.k]; h1 = `Cho thuê ${T.name} tòa ${p.t} Lumi Hà Nội`; what = `${T.name} cho thuê ở tòa ${p.t}`; heroPhoto = PAGE_PHOTO.tower;
    title = `Thuê ${T.name} tòa ${p.t} Lumi – ${s.n} căn, ${rng} | ${BRAND}`; desc = `${s.n} ${T.name} cho thuê tòa ${p.t} Lumi Hà Nội, giá ${rng}/tháng. Ảnh, diện tích, hướng, nội thất từng căn. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], [`Tòa ${p.t}`, `/cho-thue/toa-${p.t.toLowerCase()}/`], [cap(T.short), p.url]]; scope = { rent: 1, tower: p.t, type: p.k }; filterOpts = { noTower: true, noType: true };
    related = [[`/cho-thue/toa-${p.t.toLowerCase()}/`, `Tất cả căn tòa ${p.t}`], [`/cho-thue/${T.slug}/`, `Tất cả căn ${T.short}`]].concat(pages.filter(q => q.kind === 'tt' && q.k === p.k && q.t !== p.t).map(q => [q.url, q.label]));
  } else if (p.kind === 'int') {
    const inf = INTERIORS[p.ik]; h1 = `Cho thuê căn hộ Lumi Hà Nội ${inf.name}`; what = `căn ${inf.name} cho thuê`; heroPhoto = p.ik === 'full' ? 'phong-khach-chung-lumi' : 'phong-sinh-hoat-cong-dong-lumi';
    title = `Cho thuê căn hộ Lumi Hà Nội ${inf.name} – ${s.n} căn | ${BRAND}`; desc = `${s.n} căn hộ Lumi Hà Nội ${inf.name} cho thuê, giá ${rng}/tháng. 1PN, 2PN, 3PN các tòa. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], [inf.label, p.url]]; scope = { rent: 1, int: p.ik }; related = pages.filter(q => q.kind === 'ti' && q.ik === p.ik).map(q => [q.url, q.label]);
  } else if (p.kind === 'ti') {
    const T = TYPES[p.k], inf = INTERIORS[p.ik]; h1 = `Cho thuê ${T.name} Lumi Hà Nội ${inf.name}`; what = `${T.name} ${inf.name} cho thuê`; heroPhoto = p.ik === 'full' ? 'phong-khach-chung-lumi' : PAGE_PHOTO.type[p.k];
    title = `Thuê ${T.name} Lumi ${inf.name} – ${s.n} căn, ${rng} | ${BRAND}`; desc = `${s.n} ${T.name} ${inf.name} cho thuê tại Lumi Hà Nội, giá ${rng}/tháng. Ảnh, diện tích, hướng từng căn. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], [cap(T.short), `/cho-thue/${T.slug}/`], [inf.label, p.url]]; scope = { rent: 1, type: p.k, int: p.ik }; filterOpts = { noType: true };
    related = [[`/cho-thue/${T.slug}/`, `Tất cả căn ${T.short}`], [`/cho-thue/${inf.slug}/`, `Tất cả căn ${inf.name}`]];
  } else if (p.kind === 'band') {
    h1 = `Căn hộ Lumi Hà Nội cho thuê giá ${p.b.label}/tháng`; what = `căn giá ${p.b.label}`; heroPhoto = PAGE_PHOTO.band;
    title = `Căn hộ Lumi Hà Nội cho thuê giá ${p.b.label} – ${s.n} căn | ${BRAND}`; desc = `${s.n} căn hộ cho thuê tại Lumi Hà Nội giá ${p.b.label}/tháng: ${uniq(p.list.map(x => x.type)).join(', ')}. Ảnh thật, mã căn rõ ràng. Zalo ${PHONE_FMT}.`;
    crumbs = [['Trang chủ', '/'], [`Giá ${p.b.label}`, p.url]]; scope = { rent: 1, pmin: p.b.min, pmax: p.b.max }; related = pages.filter(q => q.kind === 'band' && q !== p).map(q => [q.url, q.label]);
    faq = [[`Thuê căn hộ Lumi ${p.b.label} được loại căn nào?`, Object.keys(TYPES).filter(k => p.list.some(x => x.type === k)).map(k => `${TYPES[k].short}: ${p.list.filter(x => x.type === k).length} căn`).join('; ') + `, tính theo bảng hàng ngày ${DATE_LABEL}.`]];
  }
  write(p.url.slice(1) + 'index.html', listPage({ list: p.list, scope, h1, crumbs, canonical: p.url, title, desc, what, related, faq, filterOpts, heroPhoto, extra }));
  add(p.url, lastUpd(p.list), p.kind === 'type' || p.kind === 'tower' ? '0.9' : '0.8');
}

if (sale.length) {
  write('mua-ban/index.html', listPage({ list: sale, scope: { rent: 0 }, sale: true, h1: 'Mua bán căn hộ Lumi Hà Nội', what: 'căn đang chào bán', crumbs: [['Trang chủ', '/'], ['Mua bán', '/mua-ban/']], canonical: '/mua-ban/', title: `Mua bán căn hộ Lumi Hà Nội – ${sale.length} căn chuyển nhượng | ${BRAND}`, desc: `${sale.length} căn hộ Lumi Hà Nội đang chuyển nhượng: 1PN, 2PN, 3PN các tòa. Giá theo bảng hàng, cập nhật liên tục. Zalo ${PHONE_FMT}.`, active: '/mua-ban/', filterOpts: { sale: true }, heroPhoto: 'thap-lumi-hanoi' }));
  add('/mua-ban/', lastUpd(sale), '0.7');
}
write('cac-toa/index.html', towersIndex(rent)); add('/cac-toa/', TODAY, '0.7');
write('bang-gia-thue-lumi-ha-noi/index.html', pricePage(all)); add('/bang-gia-thue-lumi-ha-noi/', TODAY, '0.9');
write('kinh-nghiem-thue-can-ho-lumi/index.html', guidePage(all)); add('/kinh-nghiem-thue-can-ho-lumi/', TODAY, '0.7');
write('tien-ich-lumi-ha-noi/index.html', amenityPage()); add('/tien-ich-lumi-ha-noi/', TODAY, '0.7', PHOTOS.map(p => `${SITE}/img/lumi/${p.f}.jpg`));
write('chu-nha-ky-gui/index.html', ownerPage()); add('/chu-nha-ky-gui/', TODAY, '0.5');
write('xung-quanh-lumi-ha-noi/index.html', areaPage()); add('/xung-quanh-lumi-ha-noi/', TODAY, '0.7');
write('so-sanh-can-1pn-2pn-3pn-lumi/index.html', comparePage(all)); add('/so-sanh-can-1pn-2pn-3pn-lumi/', TODAY, '0.7');
write('lien-he/index.html', contactPage()); add('/lien-he/', TODAY, '0.5');
write('feed.xml', feed(all));
write('en/index.html', enPage(all)); add('/en/', TODAY, '0.8');
write('da-luu/index.html', savedPage());
write('can-ho/xem/index.html', layout({ title: `Căn hộ Lumi Hà Nội mới cập nhật | ${BRAND}`, desc: 'Căn hộ vừa thêm vào bảng hàng Lumi Hà Nội.', canonical: '/can-ho/xem/', noindex: true, body: `<article class="unit wrap" id="dyn-unit"><p class="u-hint">Đang tải thông tin căn…</p></article>` }));

for (const x of all) { write(x.url.slice(1) + 'index.html', unitPage(x, all)); add(x.url, x.updated || TODAY, x.isRent ? '0.7' : '0.5', x.imgs.slice(0, 5)); }
for (const x of goneUnits) write(x.url.slice(1) + 'index.html', unitPage(x, all));

// chuyển hướng URL của bản web đầu tiên
for (const x of [...all, ...goneUnits]) write(x.oldUrl.slice(1) + 'index.html', redirect(x.url));
for (const k of Object.keys(TYPES)) write(`loai/${TYPES[k].slug}/index.html`, redirect(typeKeys.includes(k) ? `/cho-thue/${TYPES[k].slug}/` : '/'));
for (const t of TOWER_ORDER) write(`toa/${t.toLowerCase()}/index.html`, redirect(towerKeys.includes(t) ? `/cho-thue/toa-${t.toLowerCase()}/` : '/cac-toa/'));
write('toa/index.html', redirect('/cac-toa/'));
for (const inf of Object.values(INTERIORS)) write(`noi-that/${inf.slug}/index.html`, redirect(`/cho-thue/${inf.slug}/`));

write('404.html', layout({ title: `Không tìm thấy trang | ${BRAND}`, desc: 'Trang không tồn tại.', canonical: '/404.html', noindex: true, body: `<section class="page-hero"><div class="wrap"><h1>Căn này đã cho thuê hoặc trang không còn</h1><p class="lead">Danh sách được cập nhật liên tục nên căn đã có người thuê sẽ được gỡ. Xem các căn đang trống hoặc nhắn Zalo để được tìm căn tương tự.</p><p class="cta-row"><a class="btn btn-lamp" href="/#danh-sach">Xem căn đang trống</a> <a class="btn btn-ghost" href="${ZALO}" rel="nofollow">Nhắn Zalo ${PHONE_FMT}</a></p></div></section>` }));

const smUrl = ({ u, lastmod, pri, images }) => `<url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod><priority>${pri}</priority>${images.map(i => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join('')}</url>`;
const SM_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
write('sitemap-trang.xml', SM_HEAD + urls.filter(x => !x.u.startsWith('/can-ho/')).map(smUrl).join('\n') + '\n</urlset>\n');
write('sitemap-can-ho.xml', SM_HEAD + urls.filter(x => x.u.startsWith('/can-ho/')).map(smUrl).join('\n') + '\n</urlset>\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${SITE}/sitemap-trang.xml</loc><lastmod>${TODAY}</lastmod></sitemap>\n<sitemap><loc>${SITE}/sitemap-can-ho.xml</loc><lastmod>${TODAY}</lastmod></sitemap>\n</sitemapindex>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /da-luu/\nDisallow: /can-ho/xem/\nDisallow: /data/\n\nSitemap: ${SITE}/sitemap.xml\n`);
const st = stat(rent);
write('llms.txt', `# ${BRAND} (canholumi.com)\n\n> Danh sách căn hộ cho thuê và mua bán tại dự án Lumi Hà Nội (Lumi Hanoi, CapitaLand Development), Đại lộ Thăng Long, Hà Nội. Dữ liệu lấy từ bảng hàng, tự cập nhật. Liên hệ xem nhà: Zalo/điện thoại ${PHONE}.\n\n## Giá thuê hiện tại (${TODAY})\n${Object.keys(TYPES).map(k => [k, stat(rent.filter(x => x.type === k))]).filter(([, s]) => s.n).map(([k, s]) => `- ${TYPES[k].short}: ${s.n} căn, ${tr(s.min)}–${tr(s.max)} triệu/tháng, trung vị ${tr(s.med)} triệu`).join('\n')}\n- Tổng: ${st.n} căn cho thuê, ${sale.length} căn bán\n\n## Trang chính\n- [Căn hộ cho thuê](${SITE}/)\n- [Bảng giá thuê ${MONTH_LABEL}](${SITE}/bang-gia-thue-lumi-ha-noi/)\n- [Kinh nghiệm thuê căn hộ Lumi](${SITE}/kinh-nghiem-thue-can-ho-lumi/)\n- [Tiện ích Lumi Hà Nội](${SITE}/tien-ich-lumi-ha-noi/)\n${pages.filter(p => p.kind === 'type' || p.kind === 'tower').map(p => `- [${p.label}](${SITE}${p.url})`).join('\n')}\n- [Mua bán](${SITE}/mua-ban/)\n- [English](${SITE}/en/)\n`);
write('manifest.webmanifest', JSON.stringify({ name: 'Căn Hộ Lumi – Cho thuê căn hộ Lumi Hà Nội', short_name: 'Căn Hộ Lumi', start_url: '/', display: 'standalone', background_color: '#0f2b33', theme_color: '#0f2b33', lang: 'vi', icons: [192, 512].map(s => ({ src: `/img/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })) }));
if (INDEXNOW_KEY) write(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
write('data/archive.json', JSON.stringify({ updatedAt: NOW.toISOString(), units: [...cur, ...gone] }));
write('data/id-url.json', JSON.stringify(Object.fromEntries(all.map(x => [String(x.id).toLowerCase(), x.url]))));
write('data/urls.txt', urls.map(x => SITE + x.u).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'CNAME'), 'canholumi.com\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'data-hash.txt'), sha(JSON.stringify(cur) + ASSET_VER + GA_ID + fs.readFileSync('build.mjs', 'utf8') + JSON.stringify(gone.map(g => g.id))) + '\n');
console.log(`OK: ${all.length} căn (${rent.length} thuê, ${sale.length} bán), ${goneUnits.length} căn đã gỡ lưu trữ, ${pages.length} trang danh sách, ${urls.length} URL trong sitemap`);
