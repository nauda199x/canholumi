(() => {
  const ZALO = 'https://zalo.me/0977923284';
  const TYPES = { '1PN': ['1pn', '1 phòng ngủ', 'căn hộ 1 phòng ngủ', '1-phong-ngu'], '2PN': ['2pn', '2 phòng ngủ', 'căn hộ 2 phòng ngủ', '2-phong-ngu'], '3PN': ['3pn', '3 phòng ngủ', 'căn hộ 3 phòng ngủ', '3-phong-ngu'], 'Duplex': ['duplex', 'Duplex', 'căn hộ Duplex', 'duplex'] };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const $ = (s, r = document) => r.querySelector(s);
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
    return `<article class="card" data-id="${esc(u.id)}" data-rent="${u.isRent ? 1 : 0}" data-type="${u.type}" data-tower="${esc(u.tower)}" data-int="${u.intKey}" data-price="${u.price}" data-area="${u.area}" data-img="${esc(u.img0 || '')}" data-new="${score(u)}${u.updated || ''}">
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

  // ---------- Bộ lọc + phân trang ----------
  const form = $('#loc'), grid = $('#ds');
  const PAGE = 24; let shown = PAGE; let pg = Math.max(1, +new URLSearchParams(location.search).get('trang') || 1);
  let archiveP = null; const getArchive = () => (archiveP ||= fetch('/data/archive.json').then(r => r.json()));
  const moreBtn = $('#more');
  let pagerEl = null, needAll = null;
  function renderPager(pages) {
    if (!pagerEl) { pagerEl = document.createElement('nav'); pagerEl.className = 'pager'; pagerEl.setAttribute('aria-label', 'Chuyển trang'); (moreBtn ? moreBtn.parentNode : grid).insertAdjacentElement(moreBtn ? 'beforebegin' : 'afterend', pagerEl);
      pagerEl.addEventListener('click', async e => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; pg = +b.dataset.p; if (needAll && grid.children.length < (+grid.dataset.total || 0)) { b.classList.add('wait'); await needAll(); } apply(true); grid.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
    pagerEl.hidden = pages <= 1; if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    const list = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - pg) <= 1) list.push(i); else if (list[list.length - 1] !== '…') list.push('…');
    pagerEl.innerHTML = `<button type="button" data-p="${pg - 1}" ${pg === 1 ? 'disabled' : ''} aria-label="Trang trước">‹</button>` + list.map(i => i === '…' ? '<span>…</span>' : `<button type="button" data-p="${i}"${i === pg ? ' aria-current="page"' : ''}>${i}</button>`).join('') + `<button type="button" data-p="${pg + 1}" ${pg === pages ? 'disabled' : ''} aria-label="Trang sau">›</button>`;
  }
  function apply(updateUrl) {
    if (!grid) return;
    const cards = [...grid.children];
    const f = form ? new FormData(form) : new FormData();
    const q = String(f.get('q') || '').trim().toLowerCase().replace(/\s+/g, '');
    const type = f.get('type'), tower = f.get('tower'), int = f.get('int'), max = Number(f.get('max') || 0), dt = String(f.get('dt') || ''), [dMin, dMax] = dt ? dt.split('-').map(Number) : [0, 0], sort = f.get('sort') || 'new';
    const by = { asc: (a, b) => (+a.dataset.price || 9e12) - (+b.dataset.price || 9e12), desc: (a, b) => +b.dataset.price - +a.dataset.price, area: (a, b) => +b.dataset.area - +a.dataset.area, new: (a, b) => (b.dataset.new || '').localeCompare(a.dataset.new || '') };
    cards.sort(by[sort] || by.new).forEach(c => grid.appendChild(c));
    let n = 0;
    for (const c of cards) {
      const d = c.dataset;
      const ok = !c.classList.contains('gone') && (!q || d.id.toLowerCase().includes(q)) && (!type || d.type === type) && (!tower || d.tower === tower) && (!int || d.int === int) && (!max || (Number(d.price) && Number(d.price) <= max)) && (!dt || (+d.area >= dMin && +d.area < dMax));
      c.hidden = !ok;
      c.classList.toggle('more-hidden', ok && (n < (pg - 1) * PAGE || n >= pg * PAGE));
      if (ok) n++;
    }
    const _tot = +grid.dataset.total || 0, _flt = form && [...f].some(([k, v]) => v && k !== 'sort');
    const dem = $('#dem'); if (dem) dem.textContent = !_flt && _tot > cards.length ? _tot : n;
    const rong = $('#rong'); if (rong) rong.hidden = n > 0;
    if (moreBtn) moreBtn.hidden = true;
    const totalAll = +grid.dataset.total || 0;
    const filtered = form && [...f].some(([k, v]) => v && k !== 'sort');
    const count = !filtered && totalAll > cards.length ? totalAll : n;
    const pages = Math.max(1, Math.ceil(count / PAGE));
    if (pg > pages) { pg = pages; return apply(updateUrl); }
    renderPager(pages);
    const active = form && [...f].some(([k, v]) => v && k !== 'sort');
    const rs = $('[data-reset]'); if (rs) rs.hidden = !active;
    const fn = form && form.querySelector('.f-n'); if (fn) { const k = [...f].filter(([k, v]) => v && !['q', 'sort'].includes(k)).length; fn.hidden = !k; fn.textContent = k; }
    if (updateUrl && form) {
      const p = new URLSearchParams();
      for (const [k, v] of f) if (v && !(k === 'sort' && v === 'new')) p.set(k, v);
      if (pg > 1) p.set('trang', pg);
      history.replaceState(null, '', (p.toString() ? '?' + p : location.pathname) + location.hash);
    }
  }
  if (grid) {
    if (form) {
      const params = new URLSearchParams(location.search);
      let any = false;
      for (const [k, v] of params) {
        const el = form.elements[k]; if (!el) continue; any = true;
        if (el instanceof RadioNodeList) { for (const r of el) r.checked = r.value === v; } else el.value = v;
      }
      form.addEventListener('change', () => { pg = 1; apply(true); });
      const tg = form.querySelector('.f-toggle'), setOpen = o => { form.classList.toggle('open', o); if (tg) tg.setAttribute('aria-expanded', o); };
      if (tg) tg.addEventListener('click', () => setOpen(!form.classList.contains('open')));
      form.querySelector('[data-close-f]')?.addEventListener('click', () => { setOpen(false); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      document.querySelectorAll('a[href$="#danh-sach"]').forEach(a => a.addEventListener('click', () => { if (location.pathname === '/' || a.pathname === location.pathname) setOpen(true); }));
      form.addEventListener('input', e => { if (e.target.name === 'q') { pg = 1; apply(true); } });
      const rs = $('[data-reset]'); if (rs) rs.addEventListener('click', () => { form.reset(); pg = 1; apply(true); });
      if (any && location.pathname === '/') setTimeout(() => $('#danh-sach')?.scrollIntoView(), 50);
    }
    apply(false);
    // trang chỉ tải sẵn 48 căn; phần còn lại nạp sau khi trang đã hiện
    const total = +grid.dataset.total || 0, sc = grid.dataset.scope ? JSON.parse(grid.dataset.scope) : null;
    if (sc && total > grid.children.length) {
      const loadRest = () => getArchive().then(d => {
        const have = new Set([...grid.children].map(c => c.dataset.id));
        const en = document.documentElement.lang === 'en';
        const html = (d.units || []).map(norm).filter(u => u && !u.goneAt && !have.has(u.id) && scopeOk(sc, u)).map(u => cardHtml(u)).join('');
        if (!en) grid.insertAdjacentHTML('beforeend', html);
        apply(false); paintSaved();
      }).catch(() => { });
      let loadP = null; const once = () => (loadP ||= loadRest()); needAll = once;
      form && form.addEventListener('change', once, { capture: true });
      form && form.addEventListener('input', once, { capture: true });
      if (location.search) once();
      const pgr = document.querySelector('.pager'); if ('IntersectionObserver' in window && pgr) new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); once(); } }, { rootMargin: '400px' }).observe(pgr);
    }
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
  function setPrice(root, u) { const p = root.querySelector('[data-f="price"]'); if (p && p.textContent !== u.priceText && !document.documentElement.lang.startsWith('en')) { p.textContent = u.priceText; p.classList.add('changed'); } }
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
