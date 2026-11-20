// Dựng web tĩnh canholumi.com từ API bảng hàng lumihanoi.pages.dev
// Chạy: node build.mjs [đường-dẫn-listings.json]   (không truyền → tải từ API)
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://canholumi.com';
const BRAND = 'Căn Hộ Lumi';
const PHONE = '0977923284';
const PHONE_INTL = '+84977923284';
const ZALO = `https://zalo.me/${PHONE}`;
const API = 'https://lumihanoi.pages.dev/api/listings';
const OUT = 'dist';

// ---------- Dữ liệu ----------
async function loadData() {
  const src = process.argv[2];
  if (src) return JSON.parse(fs.readFileSync(src, 'utf8'));
  const r = await fetch(`${API}?ts=${Date.now()}`, { headers: { 'user-agent': 'canholumi-build' } });
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}

const TYPE_INFO = {
  '1PN': { slug: '1-phong-ngu', name: 'căn hộ 1 phòng ngủ', short: '1 phòng ngủ' },
  '2PN': { slug: '2-phong-ngu', name: 'căn hộ 2 phòng ngủ', short: '2 phòng ngủ' },
  '3PN': { slug: '3-phong-ngu', name: 'căn hộ 3 phòng ngủ', short: '3 phòng ngủ' },
  'Duplex': { slug: 'duplex', name: 'căn hộ Duplex', short: 'Duplex' },
};
const TOWER_ORDER = ['S1', 'S2', 'S3', 'S5', 'S6', 'P1', 'P2', 'E1', 'E2'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugId = id => String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s || '').trim();
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

function fmtPrice(x) {
  if (!x.price) return 'Liên hệ';
  if (x.transaction === 'sale') {
    const ty = x.price / 1e9;
    return `${ty.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} tỷ`;
  }
  const tr = x.price / 1e6;
  return `${tr.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu/tháng`;
}
function interiorLabel(x) {
  const i = norm(x.interior);
  if (/full/i.test(i)) return 'Full nội thất';
  if (/cơ bản/i.test(i)) return 'Nội thất cơ bản';
  return '';
}
function direction(x) {
  const d = norm(x.direction);
  return d ? d.split(' ').map(cap).join(' ').replace('Tây Bắc', 'Tây Bắc') : '';
}
function parseVnDate(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(norm(s));
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

const score = x => (x.realPhotos ? 2 : 0) + (x.images.length ? 1 : 0);
const m2 = a => `${Number(a).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`;
function prepare(raw) {
  const arr = Array.isArray(raw) ? raw : (raw.listings || []);
  return arr
    .filter(x => x && x.id && (x.transaction === 'rent' || x.transaction === 'sale') && TYPE_INFO[x.type])
    .map(x => {
      const t = TYPE_INFO[x.type];
      const isRent = x.transaction === 'rent';
      const tower = norm(x.tower).toUpperCase() || 'Lumi';
      const slug = `${isRent ? 'thue' : 'ban'}-${t.slug}-${tower.toLowerCase()}-${slugId(x.id)}`;
      const images = (x.images || []).filter(u => /^https:\/\/drive\.google\.com\/thumbnail\?id=[\w-]+/.test(u)).slice(0, 12);
      return {
        id: x.id, isRent, type: x.type, t, tower, area: Number(x.area) || null,
        dir: direction(x), interior: interiorLabel(x), price: Number(x.price) || 0, priceText: fmtPrice(x),
        updated: parseVnDate(x.updatedDate), images,
        realPhotos: x.mediaStatus === 'verified',
        url: `/can-ho/${slug}/`,
      };
    })
    .sort((a, b) => (a.isRent === b.isRent ? 0 : a.isRent ? -1 : 1) || score(b) - score(a) || (b.updated || '').localeCompare(a.updated || '') || a.price - b.price);
}

// ---------- Mẫu HTML ----------
const CSS_VER = Date.now().toString(36);
function layout({ title, desc, canonical, body, jsonld = [], ogImage, noindex = false, active = '' }) {
  const nav = [['/', 'Cho thuê'], ['/mua-ban/', 'Mua bán'], ['/toa/', 'Các tòa'], ['/chu-nha-ky-gui/', 'Chủ nhà ký gửi']];
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#12313a">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://drive.google.com">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=${CSS_VER}">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#noi-dung">Bỏ qua menu</a>
<header class="top">
  <a class="logo" href="/" aria-label="${BRAND} – trang chủ">${logoSvg()}<span>Căn Hộ <b>Lumi</b></span></a>
  <nav aria-label="Menu chính">${nav.map(([h, l]) => `<a href="${h}"${active === h ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <a class="btn btn-zalo top-cta" href="${ZALO}" rel="nofollow">Nhắn Zalo</a>
</header>
<main id="noi-dung">
${body}
</main>
<footer class="foot">
  <div class="foot-in">
    <div>
      <p class="foot-brand">${logoSvg()} Căn Hộ Lumi</p>
      <p>Cho thuê và mua bán căn hộ Lumi Hà Nội, Đại lộ Thăng Long. Danh sách căn lấy trực tiếp từ bảng hàng và cập nhật nhiều lần mỗi ngày.</p>
    </div>
    <div>
      <p class="foot-h">Liên hệ xem nhà</p>
      <p><a href="tel:${PHONE}">Gọi ${PHONE.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}</a><br><a href="${ZALO}" rel="nofollow">Zalo ${PHONE}</a></p>
    </div>
    <div>
      <p class="foot-h">Tìm nhanh</p>
      <p>${Object.values(TYPE_INFO).slice(0, 3).map(t => `<a href="/loai/${t.slug}/">Thuê ${t.short}</a>`).join('<br>')}<br><a href="/noi-that/full-noi-that/">Căn full nội thất</a></p>
    </div>
  </div>
  <p class="foot-note">Giá và tình trạng căn có thể thay đổi; vui lòng nhắn Zalo để xác nhận trước khi xem nhà. canholumi.com không phải website của chủ đầu tư.</p>
</footer>
<a class="float-zalo" href="${ZALO}" rel="nofollow" aria-label="Nhắn Zalo ${PHONE}">Zalo</a>
<script src="/assets/site.js?v=${CSS_VER}" defer></script>
</body>
</html>`;
}

function logoSvg() {
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="10" width="7" height="19" rx="1"/><rect x="12.5" y="3" width="7" height="26" rx="1"/><rect x="22" y="13" width="7" height="16" rx="1"/><rect class="lit" x="14.5" y="7" width="3" height="3"/><rect class="lit" x="5" y="17" width="3" height="3"/><rect class="lit" x="24" y="21" width="3" height="3"/></svg>`;
}

// Đường chân trời: mỗi tòa là một khối, mỗi ô sáng = 1 căn đang trống
function skyline(byTower, linkBase = '/toa/') {
  const towers = TOWER_ORDER.filter(t => byTower[t]?.length);
  const W = 120, gap = 22, maxN = Math.max(...towers.map(t => byTower[t].length));
  const cols = 6, cell = 14, pad = 12;
  const svgW = towers.length * (W + gap) - gap;
  const rowsMax = Math.ceil(maxN / cols);
  const H = pad * 2 + rowsMax * cell + 70;
  const parts = towers.map((t, i) => {
    const n = byTower[t].length;
    const rows = Math.max(Math.ceil(n / cols), 3);
    const h = rows * cell + pad * 2 + 18;
    const x = i * (W + gap), y = H - 40 - h;
    let wins = '';
    for (let k = 0; k < rows * cols; k++) {
      const r = Math.floor(k / cols), c = k % cols;
      const lit = k < n;
      wins += `<rect class="${lit ? 'w lit' : 'w'}" x="${x + pad + c * 16}" y="${y + pad + 18 + (rows - 1 - r) * cell}" width="10" height="8" rx="1"${lit ? ` style="--d:${(k * 23) % 900}ms"` : ''}/>`;
    }
    return `<a href="${linkBase}${t.toLowerCase()}/" class="tw" aria-label="Tòa ${t}: ${n} căn đang có">
<rect class="body" x="${x}" y="${y}" width="${W}" height="${h}" rx="3"/>${wins}
<text class="tn" x="${x + W / 2}" y="${H - 16}" text-anchor="middle">${t}</text>
<text class="tc" x="${x + W / 2}" y="${y - 8}" text-anchor="middle">${n} căn</text></a>`;
  }).join('');
  return `<svg class="skyline" viewBox="-4 0 ${svgW + 8} ${H}" role="img" aria-label="Số căn đang có theo từng tòa"><line class="ground" x1="-4" x2="${svgW + 4}" y1="${H - 40}" y2="${H - 40}"/>${parts}</svg>`;
}

function card(x, eager = false) {
  const img = x.images[0];
  const facts = [x.area ? m2(x.area) : '', `Tòa ${x.tower}`, x.dir ? `Hướng ${x.dir}` : ''].filter(Boolean);
  return `<article class="card" data-rent="${x.isRent ? 1 : 0}" data-type="${x.type}" data-tower="${x.tower}" data-int="${x.interior.startsWith('Full') ? 'full' : x.interior ? 'basic' : ''}" data-price="${x.price}" data-area="${x.area || 0}" data-new="${score(x)}${x.updated || ''}">
<a href="${x.url}" class="card-link">
<div class="ph">${img ? `<img src="${img.replace(/sz=w\d+/, 'sz=w640')}" alt="${esc(cap(x.t.name))} tòa ${x.tower} Lumi Hà Nội" loading="${eager ? 'eager' : 'lazy'}" decoding="async" width="640" height="480">` : `<div class="noimg">${logoSvg()}<span>Ảnh đang cập nhật</span></div>`}
${x.images.length && !x.realPhotos ? '<span class="badge">Ảnh minh hoạ</span>' : ''}${x.images.length > 1 ? `<span class="count">${x.images.length} ảnh</span>` : ''}</div>
<div class="cb">
<p class="price">${esc(x.priceText)}</p>
<h3>${esc(x.t.short)}${x.interior ? ` · ${esc(x.interior.toLowerCase())}` : ''}</h3>
<p class="facts">${facts.map(esc).join(', ')}</p>
<p class="code">Mã căn ${esc(x.id)}</p>
</div></a></article>`;
}

function filters(list) {
  const towers = TOWER_ORDER.filter(t => list.some(x => x.tower === t));
  const types = Object.keys(TYPE_INFO).filter(t => list.some(x => x.type === t));
  return `<form class="filters" id="loc" aria-label="Lọc căn hộ">
${types.length > 1 ? `<fieldset><legend>Loại căn</legend><div class="chips">
<label><input type="radio" name="type" value="" checked><span>Tất cả</span></label>
${types.map(t => `<label><input type="radio" name="type" value="${t}"><span>${TYPE_INFO[t].short}</span></label>`).join('')}</div></fieldset>` : ''}
${towers.length > 1 ? `<fieldset><legend>Tòa</legend><div class="chips">
<label><input type="radio" name="tower" value="" checked><span>Tất cả</span></label>
${towers.map(t => `<label><input type="radio" name="tower" value="${t}"><span>${t}</span></label>`).join('')}</div></fieldset>` : ''}
<fieldset><legend>Nội thất</legend><div class="chips">
<label><input type="radio" name="int" value="" checked><span>Tất cả</span></label>
<label><input type="radio" name="int" value="full"><span>Full nội thất</span></label>
<label><input type="radio" name="int" value="basic"><span>Cơ bản</span></label></div></fieldset>
<div class="row2">
<label class="sel">Giá tối đa<select name="max"><option value="">Không giới hạn</option>${[8, 10, 12, 14, 16, 20].map(v => `<option value="${v * 1e6}">${v} triệu</option>`).join('')}</select></label>
<label class="sel">Sắp xếp<select name="sort"><option value="new">Mới cập nhật</option><option value="asc">Giá thấp trước</option><option value="desc">Giá cao trước</option><option value="area">Diện tích lớn</option></select></label>
</div>
<p class="result" aria-live="polite"><b id="dem">${list.length}</b> căn phù hợp</p>
</form>`;
}

function breadcrumbs(items) {
  return {
    html: `<nav class="crumbs" aria-label="Đường dẫn"><ol>${items.map(([n, u], i) => i < items.length - 1 ? `<li><a href="${u}">${esc(n)}</a></li>` : `<li aria-current="page">${esc(n)}</li>`).join('')}</ol></nav>`,
    ld: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) },
  };
}

const ORG = {
  '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': SITE + '/#agent', name: BRAND, url: SITE + '/',
  telephone: PHONE_INTL, areaServed: 'Lumi Hà Nội, Đại lộ Thăng Long, Hà Nội',
  address: { '@type': 'PostalAddress', streetAddress: 'Dự án Lumi Hà Nội, Đại lộ Thăng Long', addressLocality: 'Hà Nội', addressCountry: 'VN' },
};
const itemList = (list, name) => ({
  '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: list.length,
  itemListElement: list.slice(0, 50).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + x.url, name: unitTitle(x) })),
});

function unitTitle(x) {
  return `${x.isRent ? 'Cho thuê' : 'Bán'} ${x.t.name} Lumi Hà Nội tòa ${x.tower}${x.area ? `, ${m2(x.area).replace(' ', '')}` : ''}`;
}

function stats(list) {
  const rent = list.filter(x => x.isRent && x.price);
  const by = {};
  for (const x of rent) (by[x.type] ||= []).push(x.price);
  return Object.fromEntries(Object.keys(TYPE_INFO).filter(k => by[k]).map(k => [k, by[k]]).map(([k, v]) => [k, { n: v.length, min: Math.min(...v), max: Math.max(...v) }]));
}
const tr = v => (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

function listPage({ list, h1, lead, crumbs, canonical, title, desc, extra = '', active = '' }) {
  const bc = breadcrumbs(crumbs);
  const body = `${bc.html}
<section class="page-head"><h1>${esc(h1)}</h1><p class="lead">${lead}</p></section>
<section class="listing">${filters(list)}<div class="grid" id="ds">${list.map((x, i) => card(x, i < 3)).join('')}</div>
<p class="empty" id="rong" hidden>Chưa có căn khớp bộ lọc. Nhắn Zalo ${PHONE} để được báo khi có căn phù hợp.</p></section>
${extra}`;
  return layout({ title, desc, canonical, body, active, ogImage: list.find(x => x.images[0])?.images[0], jsonld: [ORG, bc.ld, itemList(list, h1)] });
}

// ---------- Trang ----------
function homePage(all, meta) {
  const rent = all.filter(x => x.isRent);
  const byTower = {};
  for (const x of rent) (byTower[x.tower] ||= []).push(x);
  const st = stats(all);
  const upd = new Date(meta.generatedAt || Date.now());
  const updTxt = upd.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  const faq = [
    ['Giá thuê căn hộ Lumi Hà Nội bao nhiêu?', Object.entries(st).filter(([k]) => k !== 'Duplex').map(([k, v]) => `${TYPE_INFO[k].short}: từ ${tr(v.min)} đến ${tr(v.max)} triệu/tháng (${v.n} căn)`).join('; ') + '. Số liệu tính từ các căn đang có trên bảng hàng lúc ' + updTxt + '.'],
    ['Làm sao để đi xem căn hộ?', `Nhắn Zalo hoặc gọi ${PHONE}, gửi mã căn (ví dụ ${rent[0]?.id || 'Thue2N.1'}) và giờ muốn xem. Bên em hẹn lịch với chủ nhà và dẫn anh chị xem trực tiếp.`],
    ['Lumi Hà Nội nằm ở đâu?', 'Lumi Hà Nội (Lumi Hanoi) là dự án của CapitaLand Development, nằm sát Đại lộ Thăng Long và kết nối với Vành đai 3.5, phía Tây Hà Nội.'],
    ['Ảnh trên web có phải ảnh thật của căn không?', 'Căn có ảnh không gắn nhãn là ảnh chụp thực tế của căn đó. Căn gắn nhãn "Ảnh minh hoạ" dùng ảnh căn cùng loại, cùng kiểu nội thất để anh chị hình dung; khi đi xem sẽ là căn thực tế.'],
    ['Chủ nhà muốn cho thuê căn Lumi thì làm thế nào?', `Nhắn Zalo ${PHONE} mã căn, giá mong muốn và ảnh căn hộ. Căn sẽ được đưa lên bảng hàng và website sau khi xác nhận.`],
  ];
  const body = `
<section class="hero">
  <div class="hero-in">
    <h1>Cho thuê căn hộ Lumi Hà Nội</h1>
    <p class="hero-sub"><b>${rent.length} căn</b> đang trống ở các tòa Lumi, cập nhật từ bảng hàng lúc ${updTxt}. Mỗi ô sáng là một căn đang chờ người thuê — chọn tòa để xem.</p>
    <div class="hero-sky">${skyline(byTower)}</div>
    <div class="hero-cta"><a class="btn btn-lamp" href="#danh-sach">Xem ${rent.length} căn cho thuê</a><a class="btn btn-ghost" href="${ZALO}" rel="nofollow">Nhắn Zalo ${PHONE}</a></div>
  </div>
</section>
<section class="prices" aria-label="Giá thuê theo loại căn">
${Object.entries(st).filter(([k]) => k !== 'Duplex').map(([k, v]) => `<a class="pr" href="/loai/${TYPE_INFO[k].slug}/"><span class="pr-t">${TYPE_INFO[k].short}</span><span class="pr-v">${tr(v.min)}–${tr(v.max)} <small>triệu/tháng</small></span><span class="pr-n">${v.n} căn đang có</span></a>`).join('')}
</section>
<section class="listing" id="danh-sach"><h2>Danh sách căn đang cho thuê</h2>${filters(rent)}
<div class="grid" id="ds">${rent.map(card).join('')}</div>
<p class="empty" id="rong" hidden>Chưa có căn khớp bộ lọc. Nhắn Zalo ${PHONE} để được báo khi có căn phù hợp.</p></section>
<section class="about">
  <div class="about-in">
    <h2>Thuê nhà ở Lumi Hà Nội qua bảng hàng trực tiếp</h2>
    <p>Lumi Hanoi là dự án căn hộ của CapitaLand Development sát Đại lộ Thăng Long, kết nối Vành đai 3.5. Phân khu Lumi Signature bắt đầu bàn giao từ tháng 9/2026, nên phần lớn căn cho thuê hiện nay là căn mới nhận, nội thất cơ bản của chủ đầu tư hoặc chủ nhà vừa làm thêm nội thất.</p>
    <p>Danh sách trên trang này lấy thẳng từ bảng hàng mà đội ngũ dùng hằng ngày với chủ nhà, nên căn nào đã cho thuê sẽ tự biến mất khỏi web trong lần cập nhật kế tiếp. Mỗi căn có mã riêng — gửi mã qua Zalo là được hẹn lịch xem nhanh nhất.</p>
  </div>
  <div class="faq"><h2>Câu hỏi thường gặp</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</section>`;
  return layout({
    title: `Cho thuê căn hộ Lumi Hà Nội – ${rent.length} căn đang trống, giá từ ${tr(Math.min(...rent.filter(x => x.price).map(x => x.price)))} triệu | ${BRAND}`,
    desc: `${rent.length} căn hộ cho thuê tại Lumi Hà Nội (Lumi Hanoi, CapitaLand) – 1PN, 2PN, 3PN, ảnh thật, giá rõ ràng, cập nhật hằng ngày. Nhắn Zalo ${PHONE} để xem nhà.`,
    canonical: '/', body, active: '/', ogImage: rent.find(x => x.images[0])?.images[0],
    jsonld: [ORG,
      { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE + '/', inLanguage: 'vi' },
      itemList(rent, 'Căn hộ cho thuê Lumi Hà Nội'),
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  });
}

function unitPage(x, all) {
  const bc = breadcrumbs([['Trang chủ', '/'], [x.isRent ? 'Cho thuê' : 'Mua bán', x.isRent ? '/' : '/mua-ban/'], [`Tòa ${x.tower}`, `/toa/${x.tower.toLowerCase()}/`], [`Mã ${x.id}`, x.url]]);
  const similar = all.filter(y => y !== x && y.isRent === x.isRent && y.type === x.type).sort((a, b) => (a.tower === x.tower ? -1 : 0) - (b.tower === x.tower ? -1 : 0) || Math.abs(a.price - x.price) - Math.abs(b.price - x.price)).slice(0, 6);
  const rows = [['Loại căn', cap(x.t.short)], ['Diện tích', x.area ? m2(x.area) : ''], ['Tòa', x.tower], ['Hướng ban công', x.dir], ['Nội thất', x.interior], ['Mã căn', x.id], ['Cập nhật', x.updated ? x.updated.split('-').reverse().join('/') : '']].filter(r => r[1]);
  const title = `${unitTitle(x)} – ${x.priceText} | ${BRAND}`;
  const desc = `${unitTitle(x)}${x.dir ? `, hướng ${x.dir}` : ''}${x.interior ? `, ${x.interior.toLowerCase()}` : ''}. Giá ${x.priceText}. Mã căn ${x.id}. Nhắn Zalo ${PHONE} để xem nhà.`;
  const imgs = x.images.map(u => u.replace(/sz=w\d+/, 'sz=w1280'));
  const body = `${bc.html}
<article class="unit">
  <div class="gallery">${imgs.length ? `<div class="g-main" tabindex="0" aria-label="Ảnh căn hộ, vuốt ngang để xem thêm">${imgs.map((u, i) => `<img src="${u}" alt="${esc(unitTitle(x))} – ảnh ${i + 1}" loading="${i ? 'lazy' : 'eager'}" ${i ? '' : 'fetchpriority="high"'} width="1280" height="960">`).join('')}</div>
  ${!x.realPhotos ? '<p class="g-note">Ảnh minh hoạ căn cùng loại, cùng kiểu nội thất. Nhắn Zalo để nhận ảnh/video thực tế của căn này.</p>' : `<p class="g-note">${imgs.length} ảnh chụp thực tế căn ${esc(x.id)} – vuốt ngang để xem.</p>`}` : `<div class="noimg big">${logoSvg()}<span>Ảnh căn này đang được cập nhật. Nhắn Zalo để nhận ảnh và video.</span></div>`}</div>
  <div class="u-info">
    <h1>${esc(unitTitle(x))}</h1>
    <p class="u-price">${esc(x.priceText)}</p>
    <dl class="u-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="u-cta"><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">Nhắn Zalo hỏi căn ${esc(x.id)}</a><a class="btn btn-line" href="tel:${PHONE}">Gọi ${PHONE}</a></div>
    <p class="u-hint">Gửi mã <b>${esc(x.id)}</b> khi nhắn để được báo giá mới nhất và hẹn giờ xem nhà.</p>
  </div>
</article>
${similar.length ? `<section class="listing"><h2>Căn ${esc(x.t.short)} tương tự</h2><div class="grid">${similar.map(card).join('')}</div></section>` : ''}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: unitTitle(x), url: SITE + x.url, description: desc,
    ...(x.updated ? { datePosted: x.updated } : {}), ...(imgs.length ? { image: imgs.slice(0, 6) } : {}),
    offers: { '@type': 'Offer', price: x.price || undefined, priceCurrency: 'VND', businessFunction: x.isRent ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell', availability: 'https://schema.org/InStock', seller: { '@id': SITE + '/#agent' } },
    about: { '@type': 'Apartment', name: `${x.t.name} tòa ${x.tower} Lumi Hà Nội`, numberOfRooms: x.type === 'Duplex' ? undefined : Number(x.type[0]), ...(x.area ? { floorSize: { '@type': 'QuantitativeValue', value: x.area, unitCode: 'MTK' } } : {}), address: ORG.address },
  };
  return layout({ title, desc, canonical: x.url, body, ogImage: imgs[0], jsonld: [ORG, bc.ld, ld] });
}

function ownerPage() {
  const body = `<section class="page-head narrow"><h1>Chủ nhà Lumi ký gửi cho thuê, bán căn hộ</h1>
<p class="lead">Căn của anh chị sẽ có mặt trên bảng hàng cho đội cộng tác viên, trên website này và trong các bài đăng nhóm cư dân Lumi mỗi ngày.</p></section>
<section class="steps narrow"><ol>
<li><h3>Nhắn Zalo ${PHONE}</h3><p>Gửi mã căn (tòa, tầng, số căn), diện tích, giá mong muốn và tình trạng nội thất.</p></li>
<li><h3>Gửi ảnh hoặc video căn</h3><p>Ảnh thật giúp căn được hỏi nhiều hơn. Nếu chưa có, bên em có thể hẹn qua chụp.</p></li>
<li><h3>Căn lên bảng hàng và website</h3><p>Sau khi xác nhận, căn hiển thị trên canholumi.com với mã riêng. Khi cho thuê xong, anh chị báo để gỡ căn.</p></li>
</ol><p><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">Nhắn Zalo ký gửi căn</a></p></section>`;
  return layout({ title: `Chủ nhà Lumi Hà Nội ký gửi cho thuê căn hộ | ${BRAND}`, desc: `Chủ nhà Lumi Hà Nội muốn cho thuê hoặc bán căn hộ: nhắn Zalo ${PHONE} để đưa căn lên bảng hàng, website và nhóm cư dân.`, canonical: '/chu-nha-ky-gui/', body, active: '/chu-nha-ky-gui/', jsonld: [ORG] });
}

function towersIndex(all) {
  const rent = all.filter(x => x.isRent);
  const by = {}; for (const x of rent) (by[x.tower] ||= []).push(x);
  const towers = TOWER_ORDER.filter(t => by[t]);
  const body = `<section class="page-head"><h1>Căn hộ cho thuê theo từng tòa Lumi Hà Nội</h1><p class="lead">Mỗi ô sáng là một căn đang trống. Chọn tòa để xem danh sách.</p></section>
<section class="sky-wrap">${skyline(by)}</section>
<section class="tower-list">${towers.map(t => { const s = by[t].filter(x => x.price).map(x => x.price); return `<a href="/toa/${t.toLowerCase()}/"><b>Tòa ${t}</b><span>${by[t].length} căn · từ ${tr(Math.min(...s))} triệu/tháng</span></a>`; }).join('')}</section>`;
  return layout({ title: `Căn hộ cho thuê theo tòa ${towers.join(', ')} – Lumi Hà Nội | ${BRAND}`, desc: `Xem căn hộ cho thuê Lumi Hà Nội theo từng tòa ${towers.join(', ')}: số căn đang trống, giá thuê từ thấp nhất.`, canonical: '/toa/', body, active: '/toa/', jsonld: [ORG] });
}

// ---------- Ghi file ----------
function write(rel, html) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

const raw = await loadData();
const all = prepare(raw);
if (all.filter(x => x.isRent).length < 20) throw new Error('Quá ít căn (' + all.length + ') – dừng để không ghi đè web bằng dữ liệu lỗi');
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync('static', OUT, { recursive: true });

const urls = [];
const add = (u, lastmod, pri) => urls.push({ u, lastmod, pri });
const today = new Date().toISOString().slice(0, 10);

write('index.html', homePage(all, raw)); add('/', today, '1.0');

const rent = all.filter(x => x.isRent), sale = all.filter(x => !x.isRent);
if (sale.length) {
  write('mua-ban/index.html', listPage({ list: sale, h1: 'Mua bán căn hộ Lumi Hà Nội', lead: `${sale.length} căn đang chào bán, giá theo bảng hàng. Nhắn Zalo ${PHONE} để được tư vấn và xem nhà.`, crumbs: [['Trang chủ', '/'], ['Mua bán', '/mua-ban/']], canonical: '/mua-ban/', title: `Mua bán căn hộ Lumi Hà Nội – ${sale.length} căn chuyển nhượng | ${BRAND}`, desc: `${sale.length} căn hộ Lumi Hà Nội đang chuyển nhượng: 1PN, 2PN, 3PN các tòa. Giá rõ ràng, cập nhật hằng ngày.`, active: '/mua-ban/' }).replace(/Giá tối đa<select name="max">[\s\S]*?<\/select>/, 'Giá tối đa<select name="max"><option value="">Không giới hạn</option>' + [4, 5, 6, 8, 10].map(v => `<option value="${v * 1e9}">${v} tỷ</option>`).join('') + '</select>'));
  add('/mua-ban/', today, '0.7');
}

for (const t of TOWER_ORDER) {
  const l = rent.filter(x => x.tower === t);
  if (!l.length) continue;
  const p = l.filter(x => x.price).map(x => x.price);
  write(`toa/${t.toLowerCase()}/index.html`, listPage({ list: l, h1: `Cho thuê căn hộ tòa ${t} Lumi Hà Nội`, lead: `${l.length} căn đang trống ở tòa ${t}, giá từ ${tr(Math.min(...p))} đến ${tr(Math.max(...p))} triệu/tháng.`, crumbs: [['Trang chủ', '/'], ['Các tòa', '/toa/'], [`Tòa ${t}`, `/toa/${t.toLowerCase()}/`]], canonical: `/toa/${t.toLowerCase()}/`, title: `Cho thuê căn hộ tòa ${t} Lumi Hà Nội – ${l.length} căn, từ ${tr(Math.min(...p))} triệu | ${BRAND}`, desc: `${l.length} căn hộ cho thuê tòa ${t} Lumi Hà Nội: ${[...new Set(l.map(x => x.type))].join(', ')}. Giá từ ${tr(Math.min(...p))} triệu/tháng, ảnh và mã căn rõ ràng.`, active: '/toa/' }));
  add(`/toa/${t.toLowerCase()}/`, today, '0.8');
}
write('toa/index.html', towersIndex(all)); add('/toa/', today, '0.6');

for (const [k, ti] of Object.entries(TYPE_INFO)) {
  const l = rent.filter(x => x.type === k);
  if (!l.length) continue;
  const p = l.filter(x => x.price).map(x => x.price);
  write(`loai/${ti.slug}/index.html`, listPage({ list: l, h1: `Cho thuê ${ti.name} Lumi Hà Nội`, lead: `${l.length} ${ti.name} đang cho thuê, giá từ ${tr(Math.min(...p))} đến ${tr(Math.max(...p))} triệu/tháng. ${l.filter(x => x.interior.startsWith('Full')).length} căn full nội thất.`, crumbs: [['Trang chủ', '/'], [cap(ti.short), `/loai/${ti.slug}/`]], canonical: `/loai/${ti.slug}/`, title: `Cho thuê ${ti.name} Lumi Hà Nội – ${l.length} căn, từ ${tr(Math.min(...p))} triệu | ${BRAND}`, desc: `${l.length} ${ti.name} cho thuê tại Lumi Hà Nội, giá ${tr(Math.min(...p))}–${tr(Math.max(...p))} triệu/tháng. Ảnh căn, diện tích, hướng, nội thất. Zalo ${PHONE}.` }));
  add(`/loai/${ti.slug}/`, today, '0.9');
}

for (const [slug, key, name] of [['full-noi-that', 'Full', 'full nội thất'], ['noi-that-co-ban', 'Nội thất cơ bản', 'nội thất cơ bản']]) {
  const l = rent.filter(x => x.interior.startsWith(key));
  if (!l.length) continue;
  const p = l.filter(x => x.price).map(x => x.price);
  write(`noi-that/${slug}/index.html`, listPage({ list: l, h1: `Cho thuê căn hộ Lumi Hà Nội ${name}`, lead: `${l.length} căn ${name}, giá từ ${tr(Math.min(...p))} triệu/tháng.`, crumbs: [['Trang chủ', '/'], [cap(name), `/noi-that/${slug}/`]], canonical: `/noi-that/${slug}/`, title: `Cho thuê căn hộ Lumi Hà Nội ${name} – ${l.length} căn | ${BRAND}`, desc: `${l.length} căn hộ Lumi Hà Nội ${name} đang cho thuê, từ ${tr(Math.min(...p))} triệu/tháng. 1PN, 2PN, 3PN các tòa.` }));
  add(`/noi-that/${slug}/`, today, '0.8');
}

for (const x of all) { write(x.url.slice(1) + 'index.html', unitPage(x, all)); add(x.url, x.updated || today, x.isRent ? '0.7' : '0.5'); }
write('chu-nha-ky-gui/index.html', ownerPage()); add('/chu-nha-ky-gui/', today, '0.5');

write('404.html', layout({ title: `Căn này đã cho thuê hoặc không còn | ${BRAND}`, desc: 'Trang không tồn tại.', canonical: '/404.html', noindex: true, body: `<section class="page-head narrow"><h1>Căn này đã cho thuê hoặc không còn trên bảng hàng</h1><p class="lead">Danh sách được cập nhật nhiều lần mỗi ngày nên căn đã có người thuê sẽ được gỡ. Xem các căn đang trống hoặc nhắn Zalo để được tìm căn tương tự.</p><p><a class="btn btn-lamp" href="/">Xem căn đang trống</a> <a class="btn btn-line" href="${ZALO}" rel="nofollow">Nhắn Zalo ${PHONE}</a></p></section>` }));

write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ u, lastmod, pri }) => `<url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod><priority>${pri}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const st = stats(all);
write('llms.txt', `# ${BRAND} (canholumi.com)\n\n> Danh sách căn hộ cho thuê và mua bán tại dự án Lumi Hà Nội (Lumi Hanoi, CapitaLand Development), Đại lộ Thăng Long, Hà Nội. Dữ liệu lấy từ bảng hàng, cập nhật nhiều lần mỗi ngày. Liên hệ xem nhà: Zalo/điện thoại ${PHONE}.\n\n## Giá thuê hiện tại (${today})\n${Object.entries(st).map(([k, v]) => `- ${TYPE_INFO[k].short}: ${v.n} căn, ${tr(v.min)}–${tr(v.max)} triệu/tháng`).join('\n')}\n\n## Trang chính\n- [Căn hộ cho thuê](${SITE}/)\n${Object.values(TYPE_INFO).filter(t => fs.existsSync(path.join(OUT, 'loai', t.slug))).map(t => `- [Thuê ${t.short}](${SITE}/loai/${t.slug}/)`).join('\n')}\n- [Theo tòa](${SITE}/toa/)\n- [Mua bán](${SITE}/mua-ban/)\n- [Chủ nhà ký gửi](${SITE}/chu-nha-ky-gui/)\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'canholumi.com\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`OK: ${all.length} căn (${rent.length} thuê, ${sale.length} bán), ${urls.length} URL`);
