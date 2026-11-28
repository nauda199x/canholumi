(() => {
  const ZALO = 'https://zalo.me/0977923284';
  const TYPES = { '1PN': ['1pn', '1 phòng ngủ', 'căn hộ 1 phòng ngủ', '1-phong-ngu'], '2PN': ['2pn', '2 phòng ngủ', 'căn hộ 2 phòng ngủ', '2-phong-ngu'], '3PN': ['3pn', '3 phòng ngủ', 'căn hộ 3 phòng ngủ', '3-phong-ngu'], 'Duplex': ['duplex', 'Duplex', 'căn hộ Duplex', 'duplex'] };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- Dịch toàn bộ web (Google Dịch) ----------
  // Bấm ngôn ngữ trên trang tiếng Việt → lưu cookie googtrans=/vi/<mã> → mọi trang tiếng Việt tự dịch, giữ nguyên khi chuyển trang.
  // Vào trang ngoại ngữ (/en/ /ko/ /zh/ /ja/) cũng lưu lựa chọn đó. Bấm "Tiếng Việt" → xoá cookie, về tiếng Việt.
  const PAGE_LANG = document.documentElement.dataset.lang || 'vi';
  const GT = { en: 'en', ko: 'ko', zh: 'zh-CN', ja: 'ja' };
  const GT_BACK = Object.fromEntries(Object.entries(GT).map(([k, v]) => [v, k]));
  const trNow = () => { const m = /(?:^|;\s*)googtrans=\/vi\/([^;]+)/.exec(document.cookie); return m ? GT_BACK[decodeURIComponent(m[1])] || null : null; };
  const setTr = l => {
    const host = location.hostname.replace(/^www\./, '');
    const v = l && GT[l] ? `/vi/${GT[l]}` : '';
    const tail = v ? ';max-age=31536000' : ';expires=Thu, 01 Jan 1970 00:00:00 GMT';
    for (const d of ['', `;domain=${host}`, `;domain=.${host}`]) document.cookie = `googtrans=${v};path=/${d}${tail}`;
  };
  if (PAGE_LANG !== 'vi') { if (trNow() !== PAGE_LANG) setTr(PAGE_LANG); }
  else {
    const cur = trNow();
    if (cur) {
      document.documentElement.classList.add('is-tr');
      const box = document.createElement('div'); box.id = 'google_translate_element'; box.hidden = true; document.body.appendChild(box);
      window.googleTranslateElementInit = () => new google.translate.TranslateElement({ pageLanguage: 'vi', includedLanguages: Object.values(GT).join(','), autoDisplay: false }, 'google_translate_element');
      const sc = document.createElement('script'); sc.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; sc.async = true; document.head.appendChild(sc);
    }
    document.querySelectorAll('.langs .lg[data-tr]').forEach(a => { if (a.dataset.tr === (cur || 'vi')) a.setAttribute('aria-current', 'true'); });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.lg[data-tr]'); if (!a) return;
    const l = a.dataset.tr;
    if (l === 'vi') { setTr(null); if (PAGE_LANG === 'vi') { e.preventDefault(); location.reload(); } return; }
    if (PAGE_LANG === 'vi') { e.preventDefault(); setTr(l); location.reload(); }
  });
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
  const SVG = Object.fromEntries(['area', 'dir', 'sofa', 'heart'].map(k => [k, `<svg class="ic ic-${k}" aria-hidden="true"><use href="#i-${k}"/></svg>`]));


  // ---------- Bản đồ (chỉ tải khi bấm) ----------
  $$('[data-load-map]').forEach(b => b.addEventListener('click', () => { const m = b.closest('[data-map]'); m.innerHTML = `<iframe title="Bản đồ vị trí Lumi Hà Nội" src="${m.dataset.map}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:100%;border:0"></iframe>`; }));

  // ---------- Menu ----------
  const mb = $('.menu-btn'), nav = $('#nav');
  if (mb && nav) mb.addEventListener('click', () => { const o = mb.getAttribute('aria-expanded') !== 'true'; mb.setAttribute('aria-expanded', o); nav.classList.toggle('open', o); });

  // ---------- Chuẩn hoá căn (giống build.mjs) ----------
  function norm(x) {
    const t = TYPES[x.type]; if (!t) return null;
    const isRent = x.isRent ?? x.transaction === 'rent';
    if (x.transaction && !isRent && x.transaction !== 'sale') return null;
    const tower = String(x.tower || '').trim().toUpperCase() || 'Lumi';
    const price = Number(x.price) || 0;
    const i = String(x.interior ?? x.intKey ?? '');
    const intKey = x.intKey !== undefined ? x.intKey : /full/i.test(i) ? 'full' : /cơ bản/i.test(i) ? 'basic' : '';
    const dir = String(x.direction ?? x.dir ?? '').trim().split(/\s+/).map(cap).join(' ');
    const ids = (x.img || []).filter(id => /^[\w-]{10,}$/.test(id));
    const updated = x.updated || (/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(x.updatedDate || '')) || []).slice(1).reverse().map(v => v.padStart(2, '0')).join('-');
    const slug = String(x.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: String(x.id), isRent, type: x.type, t, tower, price, intKey, dir, area: Number(x.area) || 0, updated, real: (x.real ?? x.mediaStatus === 'verified') && ids.length > 0,
      imgs: ids.map(id => `https://drive.google.com/thumbnail?id=${id}&sz=w1280`), img0: ids[0] || '',
      priceText: !price ? 'Liên hệ' : isRent ? `${num(price / 1e6, 1)} triệu/tháng` : `${num(price / 1e9, 3)} tỷ`,
      url: `/can-ho/${isRent ? 'cho-thue' : 'ban'}-can-ho-lumi-${t[0]}-${tower.toLowerCase()}-${slug}/`, goneAt: x.goneAt,
    };
  }
  const score = u => (u.real ? 2 : 0) + (u.imgs.length ? 1 : 0);
  const FILL = ['ho-boi-cong-vien-lumi-ha-noi', 'ho-boi-bac-thang-lumi-ha-noi', 'san-tam-nang-ho-boi-lumi', 'cau-di-bo-canh-quan-lumi', 'sanh-lounge-lumi-ha-noi', 'phong-gym-lumi-ha-noi', 'san-co-golf-lumi-ha-noi', 'khu-bar-cong-dong-lumi'];
  const fillFor = id => FILL[[...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % FILL.length];
  function cardHtml(u, href, isNew) {
    const img = u.imgs[0];
    return `<article class="card" data-id="${esc(u.id)}" data-rent="${u.isRent ? 1 : 0}" data-type="${u.type}" data-tower="${esc(u.tower)}" data-int="${u.intKey}" data-dir="${esc(u.dir)}" data-price="${u.price}" data-area="${u.area}" data-img="${esc(u.img0 || '')}" data-new="${score(u)}${u.updated || ''}">
<a class="card-media" href="${href || u.url}" tabindex="-1" aria-hidden="true">${img ? `<img src="${img.replace('w1280', 'w600')}" alt="${esc(cap(u.t[2]))} tòa ${esc(u.tower)} Lumi Hà Nội" loading="lazy" width="600" height="450">` : `<img src="/img/lumi/${fillFor(u.id)}-480.webp" alt="" loading="lazy" width="480" height="360"><span class="fillnote">Ảnh căn đang cập nhật</span>`}
<span class="tags">${u.real ? '<span class="tag tag-real">Ảnh thật</span>' : u.imgs.length ? '<span class="tag">Ảnh minh hoạ</span>' : '<span class="tag">Ảnh tiện ích</span>'}${u.intKey === 'full' ? '<span class="tag tag-full">Full nội thất</span>' : ''}</span>${isNew ? '<span class="newtag">Mới</span>' : ''}</a>
<button class="save" type="button" data-save="${esc(u.id)}" aria-pressed="false" aria-label="Lưu căn ${esc(u.id)}">${SVG.heart}</button>
<div class="card-body"><p class="price" data-f="price">${esc(u.priceText)}</p><h3><a href="${href || u.url}">${esc(cap(u.t[1]))} · Tòa ${esc(u.tower)}</a></h3>
<ul class="facts">${u.area ? `<li>${SVG.area}${num(u.area, 1)} m²</li>` : ''}${u.dir ? `<li>${SVG.dir}${esc(u.dir)}</li>` : ''}</ul><p class="int">${SVG.sofa}${u.intKey === 'full' ? 'Full nội thất' : u.intKey ? 'Nội thất cơ bản' : 'Nội thất: hỏi qua Zalo'}</p>
<p class="code">Mã ${esc(u.id)}${u.goneAt ? ' · đã gỡ khỏi bảng hàng' : ''}</p></div></article>`;
  }

  const scopeOk = (sc, u) => !!sc && !('rent' in sc && (sc.rent ? !u.isRent : u.isRent)) && (!sc.tower || u.tower === sc.tower) && (!sc.type || u.type === sc.type) && (!sc.int || u.intKey === sc.int) && (!sc.pmax || (u.price >= sc.pmin && u.price <= sc.pmax));

  // ---------- Lưu căn ----------
  let saved = store.get('lumi-saved', []);
  function paintSaved() {
    $$('[data-save]').forEach(b => b.setAttribute('aria-pressed', saved.includes(b.dataset.save)));
    $$('[data-saved-count]').forEach(e => { e.textContent = saved.length; e.hidden = !saved.length; });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-save]'); if (!b) return;
    e.preventDefault();
    const id = b.dataset.save;
    saved = saved.includes(id) ? saved.filter(x => x !== id) : [id, ...saved].slice(0, 60);
    store.set('lumi-saved', saved); paintSaved();
  });
  paintSaved();

  // ---------- Chia sẻ ----------
  const sh = $('[data-share]');
  if (sh) sh.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); sh.querySelector('span').textContent = 'Đã chép link'; } } catch { }
  });

  // ---------- Thư viện ảnh ----------
  const lb = $('dialog.lb');
  if (lb) {
    const track = $('.lb-track', lb), figs = $$('figure', lb);
    const load = i => { const im = figs[i]?.querySelector('img'); if (im && !im.src) im.src = im.dataset.src; };
    const go = i => { i = Math.max(0, Math.min(figs.length - 1, i)); load(i); load(i + 1); load(i - 1); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); };
    const cur = () => Math.round(track.scrollLeft / track.clientWidth);
    $$('[data-open]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.open; lb.showModal(); load(i); track.scrollLeft = i * track.clientWidth; load(i + 1); }));
    $('.lb-x', lb).onclick = () => lb.close();
    $('.lb-p', lb).onclick = () => go(cur() - 1);
    $('.lb-n', lb).onclick = () => go(cur() + 1);
    track.addEventListener('scroll', () => { const i = cur(); load(i); load(i + 1); }, { passive: true });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(cur() + 1); if (e.key === 'ArrowLeft') go(cur() - 1); });
  }

  // ---------- Bộ lọc thông minh (1 bộ lọc duy nhất) + phân trang ----------
  const form = $('#loc'), grid = $('#ds');
  const PAGE = 24; let pg = Math.max(1, +new URLSearchParams(location.search).get('trang') || 1);
  let archiveP = null; const getArchive = () => (archiveP ||= fetch('/data/archive.json').then(r => r.json()));
  const moreBtn = $('#more');
  let pagerEl = null, needAll = null, allIn = !grid || (+grid.dataset.total || 0) <= grid.children.length;
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const rng = v => { if (!v) return null; const [a, b] = String(v).split('-').map(Number); return [a || 0, b || Infinity]; };
  const GROUPS = ['type', 'gia', 'tower', 'dt', 'int', 'dir'];
  const DIRMAP = { 'dong nam': 'Đông Nam', 'tay bac': 'Tây Bắc', 'dong bac': 'Đông Bắc', 'tay nam': 'Tây Nam' };
  const WORDN = { mot: 1, hai: 2, ba: 3, bon: 4 };
  const trTxt = v => v >= 1e9 ? `${num(v / 1e9, 2)} tỷ` : `${num(v / 1e6, 1)} triệu`;
  // Hiểu câu khách gõ: "2pn s3 full dưới 12tr", "3 phòng ngủ tầm 15 triệu hướng đông nam", "căn 74m2", hoặc mã "Thue2N.16"
  function parseQ(raw) {
    const o = {}; let s = ' ' + fold(raw).replace(/(\d),(\d)/g, '$1.$2') + ' ';
    if (!s.trim()) return o;
    if (/(thue|ban)\s*\d\s*[a-z]*\s*\.\s*\d/.test(s)) { o.code = s.replace(/\s+/g, ''); return o; }
    const take = (re, fn) => { s = s.replace(re, (...m) => fn(m) === false ? m[0] : ' '); };
    const mul = u => /^(ty|ti)$/.test(u) ? 1e9 : 1e6;
    take(/\b(\d{1,3}(?:\.\d{3}){2,})\s*(?:d|vnd|dong)?\b/g, m => { o.pmax = +m[1].replace(/\./g, ''); });
    take(/(?:tu\s*)?(\d+(?:\.\d+)?)\s*(?:tr|trieu|cu|ty|ti)?\s*(?:-|–|den|toi|~)\s*(\d+(?:\.\d+)?)\s*(tr|trieu|cu|ty|ti)(?![a-z0-9])/g, m => { const k = mul(m[3]); o.pmin = +m[1] * k; o.pmax = +m[2] * k; });
    take(/(duoi|tren|tu|tam|khoang|<|>|~)?\s*(\d{2,3}(?:\.\d)?)\s*(m2|m²|met vuong|met|m)(?![a-z0-9])/g, m => {
      const v = +m[2]; if (m[3] === 'm' && v < 30) return false;
      if (/duoi|</.test(m[1] || '')) o.amax = v; else if (/tren|tu|>/.test(m[1] || '')) o.amin = v; else { o.amin = v - 4; o.amax = v + 4; }
    });
    take(/(duoi|toi da|max|khong qua|<|tren|>|tu|tam|khoang|~)?\s*(\d+(?:\.\d+)?)\s*(tr|trieu|cu|m|ty|ti)(?![a-z0-9])/g, m => {
      const v = +m[2] * mul(m[3]), w = m[1] || '';
      if (/tren|>|^tu$/.test(w)) o.pmin = v; else if (/tam|khoang|~/.test(w)) { o.pmin = v * .85; o.pmax = v * 1.15; } else o.pmax = v;
    });
    take(/\b([1-4]|mot|hai|ba|bon)\s*(pn|p\.n|phong ngu|phong|ngu|br|bedrooms?|beds?|n)\b/g, m => { o.type = `${WORDN[m[1]] || m[1]}PN`; });
    take(/\bduplex\b/g, () => { o.type = 'Duplex'; });
    take(/\b(?:toa\s*)?([spe])\s?([1-9])\b/g, m => { o.tower = (m[1] + m[2]).toUpperCase(); });
    take(/\b(full(?: do| noi that)?|day du(?: noi that)?|du do|noi that day du|cao cap)\b/g, () => { o.int = 'full'; });
    take(/\b(co ban|nha trong|do co ban|chua co do|khong do)\b/g, () => { o.int = 'basic'; });
    take(/\b(dong nam|tay bac|dong bac|tay nam)\b/g, m => { o.dir = DIRMAP[m[1]]; });
    const rest = s.split(/\s+/).filter(w => /\d/.test(w) && w.length >= 3);
    if (rest.length) o.code = rest.join('');
    return o;
  }
  // Mỗi điều kiện khách gõ thành một nhãn riêng, bấm × bỏ được từng cái
  const PKEYS = [['type', p => p.type === 'Duplex' ? 'Duplex' : `${p.type[0]} phòng ngủ`], ['tower', p => `Tòa ${p.tower}`], ['int', p => p.int === 'full' ? 'Full nội thất' : 'Nội thất cơ bản'], ['dir', p => `Hướng ${p.dir}`],
    ['price', p => p.pmin && p.pmax ? `${trTxt(p.pmin)} – ${trTxt(p.pmax)}` : p.pmax ? `Tối đa ${trTxt(p.pmax)}` : `Từ ${trTxt(p.pmin)}`], ['area', p => p.amin && p.amax ? `${num(p.amin, 0)}–${num(p.amax, 0)} m²` : p.amax ? `Dưới ${num(p.amax, 0)} m²` : `Từ ${num(p.amin, 0)} m²`], ['code', p => `Mã ${p.code}`]];
  const has = (p, k) => k === 'price' ? !!(p.pmin || p.pmax) : k === 'area' ? !!(p.amin || p.amax) : !!p[k];
  const drop = (p, k) => { const o = { ...p }; if (k === 'price') { delete o.pmin; delete o.pmax; } else if (k === 'area') { delete o.amin; delete o.amax; } else delete o[k]; return o; };
  const hintTxt = p => PKEYS.filter(([k]) => has(p, k)).map(([, f]) => f(p));
  const nv = v => v >= 1e9 ? `${+(v / 1e9).toFixed(2)} tỷ` : `${+(v / 1e6).toFixed(1)}tr`;
  // Viết lại điều kiện thành câu mà parseQ hiểu được (dùng khi bỏ bớt 1 điều kiện)
  const toQ = p => [p.type && (p.type === 'Duplex' ? 'duplex' : p.type.toLowerCase()), p.tower && p.tower.toLowerCase(), p.int && (p.int === 'full' ? 'full' : 'cơ bản'), p.dir && `hướng ${p.dir.toLowerCase()}`,
    p.pmin && `từ ${nv(p.pmin)}`, p.pmax && `dưới ${nv(p.pmax)}`, p.amin && `từ ${Math.round(p.amin)}m2`, p.amax && `dưới ${Math.round(p.amax)}m2`, p.code].filter(Boolean).join(' ');
  function readState() {
    const f = form ? new FormData(form) : new FormData();
    const st = { q: String(f.get('q') || '').trim(), sort: f.get('sort') || 'new' };
    for (const g of GROUPS) { const v = f.get(g) || ''; st[g] = g === 'gia' || g === 'dt' ? rng(v) : v; }
    st.p = parseQ(st.q);
    if (st.p.code && grid && [...grid.children].some(c => fold(c.dataset.id) === st.p.code)) st.p.exact = 1;
    return st;
  }
  function match(d, st) {
    const price = +d.price || 0, area = +d.area || 0, p = st.p;
    if (st.type && d.type !== st.type) return false;
    if (st.tower && d.tower !== st.tower) return false;
    if (st.int && d.int !== st.int) return false;
    if (st.dir && d.dir !== st.dir) return false;
    if (st.gia && !(price > st.gia[0] && price <= st.gia[1])) return false;
    if (st.dt && !(area >= st.dt[0] && area < st.dt[1])) return false;
    if (p.type && d.type !== p.type) return false;
    if (p.tower && d.tower !== p.tower) return false;
    if (p.int && d.int !== p.int) return false;
    if (p.dir && d.dir !== p.dir) return false;
    if (p.pmax && !(price && price <= p.pmax)) return false;
    if (p.pmin && !(price && price >= p.pmin)) return false;
    if (p.amax && !(area && area <= p.amax)) return false;
    if (p.amin && !(area && area >= p.amin)) return false;
    if (p.code && (p.exact ? fold(d.id) !== p.code : !fold(d.id).replace(/\s+/g, '').includes(p.code))) return false;
    return true;
  }
  const live = () => grid ? [...grid.children].filter(c => !c.classList.contains('gone')).map(c => c.dataset) : [];
  const countWith = (ds, st) => { let n = 0; for (const d of ds) if (match(d, st)) n++; return n; };
  const chipLabel = (g, v) => { const i = form && [...form.querySelectorAll(`input[name="${g}"]`)].find(x => x.value === v); if (!i) return v; const sp = i.nextElementSibling; return (sp.querySelector('.lg') || sp.firstChild).textContent.trim(); };
  // Đếm số căn cho từng lựa chọn (theo các lọc khác đang chọn); lựa chọn 0 căn thì mờ đi
  function facets(ds, st) {
    if (!form || !allIn) return;
    for (const g of GROUPS) for (const i of form.querySelectorAll(`input[name="${g}"]`)) {
      if (!i.value) continue;
      const n = countWith(ds, { ...st, [g]: g === 'gia' || g === 'dt' ? rng(i.value) : i.value });
      const c = i.nextElementSibling.querySelector('.c'); if (c) c.textContent = n;
      const zero = n === 0 && !i.checked;
      i.disabled = zero; i.parentNode.classList.toggle('zero', zero);
    }
  }
  function paintPills(st) {
    const box = $('[data-pills]'); if (!box || !form) return;
    const pills = GROUPS.filter(g => form.elements[g] && (form.elements[g].value || '')).map(g => [g, chipLabel(g, form.elements[g].value)]);
    const pk = PKEYS.filter(([k]) => has(st.p, k));
    for (const [k, f] of pk) pills.push([`p:${k}`, f(st.p)]);
    if (st.q && !pk.length) pills.push(['q', `“${st.q}”`]);
    box.innerHTML = pills.map(([g, l]) => `<button type="button" data-clear="${g}" aria-label="Bỏ lọc ${esc(l)}">${esc(l)}<span aria-hidden="true">×</span></button>`).join('') + (pills.length > 1 ? '<button type="button" class="clr-all" data-clear="*">Xoá hết</button>' : '');
    const hint = $('[data-hint]'), h = hintTxt(st.p);
    if (hint) { hint.hidden = !h.length; hint.innerHTML = h.length ? `Hiểu là: <b>${h.map(esc).join(' · ')}</b>` : ''; }
    const fn = form.querySelector('.f-n'), k = ['tower', 'dt', 'int', 'dir'].filter(g => form.elements[g] && form.elements[g].value).length;
    if (fn) { fn.hidden = !k; fn.textContent = k; }
  }
  // Không có căn: gợi ý bỏ bớt điều kiện nào thì có căn
  function suggest(ds, st) {
    const box = $('[data-sugg]'); if (!box) return;
    const opts = [];
    for (const g of GROUPS) if (st[g]) { const n = countWith(ds, { ...st, [g]: g === 'gia' || g === 'dt' ? null : '' }); if (n) opts.push([g, `Bỏ “${chipLabel(g, form.elements[g].value)}”`, n]); }
    for (const [k, f] of PKEYS) if (has(st.p, k)) { const n = countWith(ds, { ...st, p: drop(st.p, k) }); if (n) opts.push([`p:${k}`, `Bỏ “${f(st.p)}”`, n]); }
    if (st.p.pmax) { const ok = ds.filter(d => +d.price && match(d, { ...st, p: drop(st.p, 'price') }) && (!st.p.pmin || +d.price >= st.p.pmin)).map(d => +d.price).sort((a, b) => a - b); if (ok.length) { const v = ok[0]; opts.push([`set:${toQ({ ...st.p, pmax: v })}`, `Nâng ngân sách lên ${trTxt(v)}`, ok.filter(x => x <= v).length, 1]); } }
    if (st.q && !PKEYS.some(([k]) => has(st.p, k))) { const n = countWith(ds, { ...st, p: {} }); if (n) opts.push(['q', `Bỏ “${st.q}”`, n]); }
    opts.sort((a, b) => (b[3] || 0) - (a[3] || 0) || b[2] - a[2]);
    box.innerHTML = opts.slice(0, 3).map(([g, l, n]) => `<button type="button" class="btn btn-soft" data-clear="${esc(g)}">${esc(l)} → ${n} căn</button>`).join('');
  }
  function clearG(g) {
    if (!form) return;
    if (g === '*') { for (const x of GROUPS) clearG(x); form.elements.q.value = ''; return; }
    if (g === 'q') { form.elements.q.value = ''; return; }
    if (g.startsWith('p:')) { form.elements.q.value = toQ(drop(parseQ(form.elements.q.value), g.slice(2))); return; }
    if (g.startsWith('set:')) { form.elements.q.value = g.slice(4); return; }
    const first = form.querySelector(`input[name="${g}"][value=""]`); if (first) first.checked = true;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-clear]'); if (!b) return; clearG(b.dataset.clear); pg = 1; apply(true); });
  function renderPager(pages) {
    if (!pagerEl) { pagerEl = document.createElement('nav'); pagerEl.className = 'pager'; pagerEl.setAttribute('aria-label', 'Chuyển trang'); (moreBtn ? moreBtn.parentNode : grid).insertAdjacentElement(moreBtn ? 'beforebegin' : 'afterend', pagerEl);
      pagerEl.addEventListener('click', async e => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; pg = +b.dataset.p; if (needAll && !allIn) { b.classList.add('wait'); await needAll(); } apply(true); grid.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
    pagerEl.hidden = pages <= 1; if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    const list = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - pg) <= 1) list.push(i); else if (list[list.length - 1] !== '…') list.push('…');
    pagerEl.innerHTML = `<button type="button" data-p="${pg - 1}" ${pg === 1 ? 'disabled' : ''} aria-label="Trang trước">‹</button>` + list.map(i => i === '…' ? '<span>…</span>' : `<button type="button" data-p="${i}"${i === pg ? ' aria-current="page"' : ''}>${i}</button>`).join('') + `<button type="button" data-p="${pg + 1}" ${pg === pages ? 'disabled' : ''} aria-label="Trang sau">›</button>`;
  }
  function apply(updateUrl) {
    if (!grid) return;
    const cards = [...grid.children];
    const st = readState();
    const by = { asc: (a, b) => (+a.dataset.price || 9e15) - (+b.dataset.price || 9e15), desc: (a, b) => +b.dataset.price - +a.dataset.price, area: (a, b) => +b.dataset.area - +a.dataset.area, new: (a, b) => (b.dataset.new || '').localeCompare(a.dataset.new || '') };
    cards.sort(by[st.sort] || by.new).forEach(c => grid.appendChild(c));
    let n = 0;
    for (const c of cards) {
      const ok = !c.classList.contains('gone') && match(c.dataset, st);
      c.hidden = !ok;
      c.classList.toggle('more-hidden', ok && (n < (pg - 1) * PAGE || n >= pg * PAGE));
      if (ok) n++;
    }
    const filtered = !!st.q || GROUPS.some(g => st[g]);
    const totalAll = +grid.dataset.total || 0;
    const count = !filtered && !allIn ? Math.max(totalAll, n) : n;
    const dem = $('#dem'); if (dem) dem.textContent = count;
    $$('[data-go]').forEach(e => { e.textContent = count; });
    const ds = live();
    const rong = $('#rong'); if (rong) { rong.hidden = n > 0; if (!n) suggest(ds, st); }
    if (moreBtn) moreBtn.hidden = true;
    const pages = Math.max(1, Math.ceil(count / PAGE));
    if (pg > pages) { pg = pages; return apply(updateUrl); }
    renderPager(pages);
    facets(ds, st); paintPills(st);
    if (updateUrl && form) {
      const p = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (v && !(k === 'sort' && v === 'new')) p.set(k, v);
      if (pg > 1) p.set('trang', pg);
      history.replaceState(null, '', (p.toString() ? '?' + p : location.pathname) + location.hash);
    }
  }
  if (grid) {
    const tg = form && form.querySelector('.f-toggle'), setOpen = o => { if (!form) return; form.classList.toggle('open', o); if (tg) tg.setAttribute('aria-expanded', o); };
    if (form) {
      const params = new URLSearchParams(location.search);
      let any = false;
      for (const [k, v] of params) {
        if (k === 'max' && +v) { form.elements.q.value = `dưới ${trTxt(+v)}`; any = true; continue; } // link cũ ?max=
        const el = form.elements[k]; if (!el) continue; any = true;
        if (el instanceof RadioNodeList) { for (const r of el) r.checked = r.value === v; } else el.value = v;
      }
      if (['tower', 'dt', 'int', 'dir'].some(g => params.get(g))) setOpen(true);
      document.addEventListener('change', e => { if (e.target.form === form || e.target.getAttribute('form') === 'loc') { pg = 1; apply(true); } });
      if (tg) tg.addEventListener('click', () => setOpen(!form.classList.contains('open')));
      // Bấm lại chip đang chọn để bỏ chọn (thay cho nút "Tất cả")
      let wasOn = null;
      form.addEventListener('pointerdown', e => { const l = e.target.closest('.chips label'); wasOn = l && l.querySelector('input').checked ? l : null; });
      form.addEventListener('click', e => { const l = e.target.closest('.chips label'); if (l && l === wasOn && l.querySelector('input').value) { e.preventDefault(); clearG(l.querySelector('input').name); pg = 1; apply(true); } wasOn = null; });
      let tq; form.addEventListener('input', e => { if (e.target.name === 'q') { clearTimeout(tq); tq = setTimeout(() => { pg = 1; apply(true); }, 180); } });
      form.addEventListener('submit', e => { e.preventDefault(); form.elements.q.blur(); pg = 1; apply(true); ($('.res-bar') || $('#danh-sach'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      document.querySelectorAll('a[href$="#loc"]').forEach(a => a.addEventListener('click', e => { if (a.pathname !== location.pathname) return; e.preventDefault(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
      if (any && location.pathname === '/') setTimeout(() => $('#danh-sach')?.scrollIntoView(), 50);
    }
    apply(false);
    // trang chỉ tải sẵn 48 căn; phần còn lại nạp ngay khi rảnh để bộ lọc đếm đúng
    const total = +grid.dataset.total || 0, sc = grid.dataset.scope ? JSON.parse(grid.dataset.scope) : null;
    if (sc && total > grid.children.length) {
      const loadRest = () => getArchive().then(d => {
        const have = new Set([...grid.children].map(c => c.dataset.id));
        const en = PAGE_LANG !== 'vi';
        const html = (d.units || []).map(norm).filter(u => u && !u.goneAt && !have.has(u.id) && scopeOk(sc, u)).map(u => cardHtml(u)).join('');
        if (!en) grid.insertAdjacentHTML('beforeend', html);
        allIn = true; apply(false); paintSaved();
      }).catch(() => { });
      let loadP = null; const once = () => (loadP ||= loadRest()); needAll = once;
      form && form.addEventListener('change', once, { capture: true });
      form && form.addEventListener('input', once, { capture: true });
      if (location.search) once();
      else (window.requestIdleCallback || (f => setTimeout(f, 1200)))(once);
    } else { allIn = true; apply(false); }
  }

  // ---------- Trang căn đã lưu ----------
  const sg = $('#saved-grid');
  async function renderSaved(units) {
    if (!sg) return;
    const list = saved.map(id => units.get(id)).filter(Boolean);
    sg.innerHTML = list.map(u => cardHtml(u)).join('');
    $('#saved-empty').hidden = list.length > 0;
    const cp = $('#saved-copy');
    if (cp) { cp.hidden = !list.length; cp.onclick = async () => { const txt = 'Em muốn xem các căn: ' + list.map(u => u.id).join(', '); try { await navigator.clipboard.writeText(txt); } catch { } location.href = ZALO; }; }
    paintSaved();
  }
  if (sg) fetch('/data/archive.json', { cache: 'no-store' }).then(r => r.json()).then(d => { const m = new Map(); for (const x of d.units || []) { const u = norm(x); if (u) m.set(u.id, u); } renderSaved(m); }).catch(() => { });

  // ---------- Đồng bộ trực tiếp với bảng hàng ----------
  const LIVE = window.LIVE_URL;
  if (!LIVE) return;
  const scope = grid && grid.dataset.scope ? JSON.parse(grid.dataset.scope) : null;
  const unitEl = $('[data-unit]'), dyn = $('#dyn-unit');
  let busy = false;
  const inScope = u => scopeOk(scope, u);
  const _unused = u => scope && !('rent' in scope && (scope.rent ? !u.isRent : u.isRent)) && (!scope.tower || u.tower === scope.tower) && (!scope.type || u.type === scope.type) && (!scope.int || u.intKey === scope.int) && (!scope.pmax || (u.price >= scope.pmin && u.price <= scope.pmax));
  function setPrice(root, u) { const p = root.querySelector('[data-f="price"]'); if (p && p.textContent !== u.priceText && PAGE_LANG === 'vi') { p.textContent = u.priceText; p.classList.add('changed'); } }
  async function sync() {
    if (busy || document.hidden) return; busy = true;
    try {
      const r = await fetch(LIVE + (LIVE.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      const d = await r.json();
      if (!d.ok || !Array.isArray(d.listings) || d.listings.length < 20) return;
      const units = new Map();
      for (const x of d.listings) { const u = norm(x); if (u) units.set(u.id, u); }
      if (grid && scope) {
        for (const c of [...grid.children]) {
          const u = units.get(c.dataset.id);
          if (!u || !inScope(u)) { c.classList.add('gone'); continue; }
          c.classList.remove('gone'); c.dataset.price = u.price; setPrice(c, u);
          if ('img' in c.dataset && c.dataset.img !== u.img0) { const a = c.querySelector('h3 a'); const t = document.createElement('div'); t.innerHTML = cardHtml(u, a && a.getAttribute('href')); const n = t.firstElementChild; n.className = c.className; c.replaceWith(n); }
        }
        const partial = (+grid.dataset.total || 0) > grid.children.length;
        const known = partial ? new Set(((await getArchive().catch(() => ({ units: [] }))).units || []).filter(x => !x.goneAt).map(x => String(x.id))) : new Set();
        if (!scope.noAdd) for (const u of units.values()) {
          if (!inScope(u) || known.has(u.id) || grid.querySelector(`[data-id="${CSS.escape(u.id)}"]`)) continue;
          grid.insertAdjacentHTML('afterbegin', cardHtml(u, `/can-ho/xem/?id=${encodeURIComponent(u.id)}`, true));
        }
        apply(false); paintSaved();
      }
      const cnt = [...units.values()].filter(u => u.isRent).length;
      $$('[data-count="rent"]').forEach(e => { e.textContent = `${cnt} căn`; });
      if (unitEl) { const u = units.get(unitEl.dataset.unit); const g = $('.u-gone', unitEl); if (g) g.hidden = !!u; if (u) unitEl.querySelectorAll('[data-f="price"]').forEach(p => { if (p.textContent !== u.priceText) { p.textContent = u.priceText; p.classList.add('changed'); } }); }
      if (dyn && !dyn.dataset.done) renderDyn(units);
      const when = new Date(d.generatedAt || Date.now()).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
      $$('[data-live="time"]').forEach(e => { e.textContent = when; });
    } catch { /* lỗi mạng: giữ nguyên dữ liệu tĩnh */ } finally { busy = false; }
  }
  function renderDyn(units) {
    const id = new URLSearchParams(location.search).get('id');
    const u = id && units.get(id);
    dyn.dataset.done = 1;
    if (!u) { dyn.innerHTML = `<div class="u-head"><div><h1>Căn này không còn trên bảng hàng</h1><p>Có thể căn đã được cho thuê. <a href="/#danh-sach">Xem các căn đang trống</a> hoặc <a href="${ZALO}" rel="nofollow">nhắn Zalo</a> để được tìm căn tương tự.</p></div></div>`; return; }
    const title = `${u.isRent ? 'Cho thuê' : 'Bán'} ${u.t[2]} Lumi Hà Nội tòa ${u.tower}${u.area ? `, ${num(u.area, 1)}m²` : ''}`;
    document.title = `${title} – ${u.priceText} | Căn Hộ Lumi`;
    const rows = [['Loại căn', cap(u.t[1])], ['Diện tích', u.area ? `${num(u.area, 1)} m²` : ''], ['Tòa', u.tower], ['Hướng ban công', u.dir], ['Nội thất', u.intKey === 'full' ? 'Full nội thất' : u.intKey ? 'Nội thất cơ bản' : '']].filter(r => r[1]);
    dyn.innerHTML = `<header class="u-head"><div><h1>${esc(title)}</h1><p class="u-sub">Mã căn <b>${esc(u.id)}</b> · căn vừa thêm vào bảng hàng</p></div></header>
${u.imgs.length ? `<div class="gal gal-${Math.min(u.imgs.length, 5)}">${u.imgs.slice(0, 5).map((s, i) => `<span class="gal-i"><img src="${s}" alt="${esc(title)} – ảnh ${i + 1}"></span>`).join('')}</div><p class="g-note">${u.real ? 'Ảnh chụp thực tế.' : 'Ảnh minh hoạ căn cùng loại, cùng kiểu nội thất.'}</p>` : ''}
<div class="u-grid"><div class="u-main"><section><h2>Thông tin căn</h2><dl class="u-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section></div>
<aside class="u-side"><div class="u-card"><p class="u-price">${esc(u.priceText)}</p><a class="btn btn-zalo wide" href="${ZALO}" rel="nofollow">Nhắn Zalo hỏi căn này</a><a class="btn btn-line wide" href="tel:0977923284">Gọi 0977 923 284</a><p class="u-hint">Gửi mã <b>${esc(u.id)}</b> khi nhắn để được hẹn xem nhà.</p></div></aside></div>`;
  }
  sync();
  setInterval(sync, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
})();

// Đo lượt liên hệ (GA4): nhắn Zalo, gọi điện, gửi ký gửi. Chỉ chạy khi trang có gtag.
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || typeof window.gtag !== 'function') return;
  const h = a.getAttribute('href');
  const ev = /zalo\.me/.test(h) ? 'lien_he_zalo' : /^tel:/.test(h) ? 'goi_dien' : '';
  if (!ev) return;
  const m = location.pathname.match(/-(thue|ban)[a-z0-9]*-\d+\/$/i);
  window.gtag('event', ev, { trang: location.pathname, ma_can: m ? m[0].slice(1, -1) : '' });
}, true);

// Giao diện v3 (bản dùng thử): hàng số liệu, nhãn bật/tắt, hiện dần khi cuộn
(() => {
  const H = document.documentElement;
  if (!H.classList.contains('v3')) return;
  const run = () => {
    const hero = document.querySelector('.hero');
    if (hero && !document.querySelector('.v3-stats')) {
      const cnt = (document.querySelector('[data-count="rent"]')?.textContent || '').replace(/\D/g, '');
      const mins = [...document.querySelectorAll('.prices .pr-v')].map(e => parseFloat((e.textContent.split(/[–-]/)[0] || '').replace(',', '.'))).filter(n => n > 0);
      const towers = Math.max(0, document.querySelectorAll('[data-g="tower"] input').length - 1);
      const items = [[cnt || '–', 'căn đang trống'], [mins.length ? `${String(Math.min(...mins)).replace('.', ',')} triệu` : '–', 'giá thuê thấp nhất / tháng'], [towers ? `${towers} tòa` : '–', 'đang có căn cho thuê'], ['Trực tiếp', 'đồng bộ từ bảng hàng']];
      const el = document.createElement('section'); el.className = 'wrap v3-stats'; el.setAttribute('aria-label', 'Tổng quan quỹ căn');
      el.innerHTML = items.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
      hero.insertAdjacentElement('afterend', el);
    }
    const bd = document.createElement('div'); bd.className = 'v3-badge'; bd.innerHTML = '<span>Bản dùng thử giao diện mới</span><a href="?v3=0">Về bản cũ</a>'; document.body.appendChild(bd);
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('v3-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.sec-head, .amen .bento, .steps li, .loc, .guides .g-card, .v3-stats div').forEach(el => { el.classList.add('v3-rv'); io.observe(el); });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
