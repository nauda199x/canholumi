(() => {
  const ZALO = 'https://zalo.me/0977923284';
  const TYPES = { '1PN': ['1-phong-ngu', '1 phòng ngủ', 'căn hộ 1 phòng ngủ'], '2PN': ['2-phong-ngu', '2 phòng ngủ', 'căn hộ 2 phòng ngủ'], '3PN': ['3-phong-ngu', '3 phòng ngủ', 'căn hộ 3 phòng ngủ'], 'Duplex': ['duplex', 'Duplex', 'căn hộ Duplex'] };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const vnDate = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim()); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };

  // Chuẩn hoá 1 căn từ cổng dữ liệu (giống build.mjs)
  function norm(x) {
    const t = TYPES[x.type]; if (!t) return null;
    const isRent = x.transaction === 'rent'; if (!isRent && x.transaction !== 'sale') return null;
    const tower = String(x.tower || '').trim().toUpperCase() || 'Lumi';
    const price = Number(x.price) || 0;
    const priceText = !price ? 'Liên hệ' : isRent ? `${num(price / 1e6, 1)} triệu/tháng` : `${num(price / 1e9, 3)} tỷ`;
    const i = String(x.interior || '');
    const interior = /full/i.test(i) ? 'Full nội thất' : /cơ bản/i.test(i) ? 'Nội thất cơ bản' : '';
    const dir = String(x.direction || '').trim().split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
    const imgs = (x.img || []).filter(id => /^[\w-]{10,}$/.test(id)).map(id => `https://drive.google.com/thumbnail?id=${id}&sz=w1280`);
    const slug = `${isRent ? 'thue' : 'ban'}-${t[0]}-${tower.toLowerCase()}-${String(x.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    return { id: String(x.id), isRent, type: x.type, t, tower, price, priceText, interior, intKey: interior.startsWith('Full') ? 'full' : interior ? 'basic' : '', dir, area: Number(x.area) || 0, updated: vnDate(x.updatedDate), imgs, real: x.mediaStatus === 'verified', slug };
  }
  const score = u => (u.real ? 2 : 0) + (u.imgs.length ? 1 : 0);
  const title = u => `${u.isRent ? 'Cho thuê' : 'Bán'} ${u.t[2]} Lumi Hà Nội tòa ${u.tower}${u.area ? `, ${num(u.area, 1)}m²` : ''}`;

  function cardHtml(u, href) {
    const facts = [u.area ? `${num(u.area, 1)} m²` : '', `Tòa ${u.tower}`, u.dir ? `Hướng ${u.dir}` : ''].filter(Boolean).join(', ');
    const img = u.imgs[0];
    return `<article class="card is-new" data-id="${esc(u.id)}" data-rent="${u.isRent ? 1 : 0}" data-type="${u.type}" data-tower="${esc(u.tower)}" data-int="${u.intKey}" data-price="${u.price}" data-area="${u.area}" data-new="${score(u)}${u.updated}">
<a href="${href}" class="card-link"><div class="ph">${img ? `<img src="${img.replace('w1280', 'w640')}" alt="${esc(title(u))}" loading="lazy" width="640" height="480">` : '<div class="noimg"><span>Ảnh đang cập nhật</span></div>'}
${u.imgs.length && !u.real ? '<span class="badge">Ảnh minh hoạ</span>' : ''}${u.imgs.length > 1 ? `<span class="count">${u.imgs.length} ảnh</span>` : ''}<span class="newtag">Mới</span></div>
<div class="cb"><p class="price" data-f="price">${esc(u.priceText)}</p><h3>${esc(u.t[1])}${u.interior ? ` · ${esc(u.interior.toLowerCase())}` : ''}</h3><p class="facts">${esc(facts)}</p><p class="code">Mã căn ${esc(u.id)}</p></div></a></article>`;
  }

  // ---------- Bộ lọc ----------
  const form = document.getElementById('loc');
  const grid = document.getElementById('ds');
  function apply(updateUrl) {
    if (!form || !grid) return;
    const cards = [...grid.children];
    const f = new FormData(form);
    const type = f.get('type'), tower = f.get('tower'), int = f.get('int'), max = Number(f.get('max') || 0), sort = f.get('sort');
    let n = 0;
    for (const c of cards) {
      const d = c.dataset;
      const ok = !c.classList.contains('gone') && (!type || d.type === type) && (!tower || d.tower === tower) && (!int || d.int === int) && (!max || (Number(d.price) && Number(d.price) <= max));
      c.hidden = !ok; if (ok) n++;
    }
    const by = { asc: (a, b) => (+a.dataset.price || 9e12) - (+b.dataset.price || 9e12), desc: (a, b) => +b.dataset.price - +a.dataset.price, area: (a, b) => +b.dataset.area - +a.dataset.area, new: (a, b) => (b.dataset.new || '').localeCompare(a.dataset.new || '') };
    cards.sort(by[sort] || by.new).forEach(c => grid.appendChild(c));
    document.getElementById('dem').textContent = n;
    document.getElementById('rong').hidden = n > 0;
    if (updateUrl) {
      const q = new URLSearchParams();
      for (const [k, v] of f) if (v && !(k === 'sort' && v === 'new')) q.set(k, v);
      history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
    }
  }
  if (form && grid) {
    const params = new URLSearchParams(location.search);
    for (const [k, v] of params) {
      const el = form.elements[k];
      if (!el) continue;
      if (el.length !== undefined && !(el instanceof HTMLSelectElement)) { for (const r of el) if (r.value === v) r.checked = true; } else el.value = v;
    }
    form.addEventListener('change', () => apply(true));
    if (params.toString()) apply(false);
  }

  // ---------- Đồng bộ trực tiếp với bảng hàng ----------
  const LIVE = window.LIVE_URL;
  if (!LIVE) return;
  const scope = grid && grid.dataset.scope ? JSON.parse(grid.dataset.scope) : null;
  const unitEl = document.querySelector('[data-unit]');
  const dyn = document.getElementById('dyn-unit');
  const timeEls = document.querySelectorAll('[data-live="time"]');
  let busy = false;

  function inScope(u) {
    if (!scope) return false;
    if ('rent' in scope && (scope.rent ? !u.isRent : u.isRent)) return false;
    if (scope.tower && u.tower !== scope.tower) return false;
    if (scope.type && u.type !== scope.type) return false;
    if (scope.int && u.intKey !== scope.int) return false;
    return true;
  }
  function setPrice(root, u) {
    const p = root.querySelector('[data-f="price"]');
    if (p && p.textContent !== u.priceText) { p.textContent = u.priceText; p.classList.add('changed'); }
  }

  async function sync() {
    if (busy || document.hidden) return; busy = true;
    try {
      const r = await fetch(LIVE + (LIVE.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      const d = await r.json();
      if (!d.ok || !Array.isArray(d.listings) || d.listings.length < 20) return;
      const units = new Map();
      for (const x of d.listings) { const u = norm(x); if (u) units.set(u.id, u); }

      if (grid && scope) {
        const seen = new Set();
        for (const c of [...grid.children]) {
          const u = units.get(c.dataset.id);
          if (!u || !inScope(u)) { c.classList.add('gone'); continue; }
          c.classList.remove('gone'); seen.add(u.id);
          c.dataset.price = u.price; setPrice(c, u);
        }
        for (const u of units.values()) {
          if (seen.has(u.id) || !inScope(u) || grid.querySelector(`[data-id="${CSS.escape(u.id)}"]`)) continue;
          grid.insertAdjacentHTML('afterbegin', cardHtml(u, `/can-ho/xem/?id=${encodeURIComponent(u.id)}`));
        }
        apply(false);
      }
      const count = [...units.values()].filter(u => u.isRent).length;
      document.querySelectorAll('[data-count="rent"]').forEach(e => { e.textContent = `${count} căn`; });

      if (unitEl) {
        const u = units.get(unitEl.dataset.unit);
        unitEl.querySelector('.u-gone').hidden = !!u;
        if (u) setPrice(unitEl, u);
      }
      if (dyn && !dyn.dataset.done) renderDyn(units);

      const when = new Date(d.generatedAt || Date.now()).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
      timeEls.forEach(e => { e.textContent = when; });
    } catch (e) { /* giữ nguyên dữ liệu tĩnh nếu cổng dữ liệu lỗi */ }
    finally { busy = false; }
  }

  function renderDyn(units) {
    const id = new URLSearchParams(location.search).get('id');
    const u = id && units.get(id);
    dyn.dataset.done = 1;
    if (!u) { dyn.innerHTML = `<div class="u-info"><h1>Căn này không còn trên bảng hàng</h1><p>Có thể căn đã được cho thuê. <a href="/">Xem các căn đang trống</a> hoặc <a href="${ZALO}" rel="nofollow">nhắn Zalo</a> để được tìm căn tương tự.</p></div>`; return; }
    document.title = `${title(u)} – ${u.priceText} | Căn Hộ Lumi`;
    const rows = [['Loại căn', u.t[1]], ['Diện tích', u.area ? `${num(u.area, 1)} m²` : ''], ['Tòa', u.tower], ['Hướng ban công', u.dir], ['Nội thất', u.interior], ['Mã căn', u.id]].filter(r => r[1]);
    dyn.innerHTML = `<div class="gallery">${u.imgs.length ? `<div class="g-main" tabindex="0">${u.imgs.map((s, i) => `<img src="${s}" alt="${esc(title(u))} – ảnh ${i + 1}" width="1280" height="960">`).join('')}</div><p class="g-note">${u.real ? `${u.imgs.length} ảnh chụp thực tế – vuốt ngang để xem.` : 'Ảnh minh hoạ căn cùng loại, cùng kiểu nội thất.'}</p>` : '<div class="noimg big"><span>Ảnh căn này đang được cập nhật. Nhắn Zalo để nhận ảnh và video.</span></div>'}</div>
<div class="u-info"><h1>${esc(title(u))}</h1><p class="u-price">${esc(u.priceText)}</p><dl class="u-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<div class="u-cta"><a class="btn btn-zalo" href="${ZALO}" rel="nofollow">Nhắn Zalo hỏi căn ${esc(u.id)}</a><a class="btn btn-line" href="tel:0977923284">Gọi 0977923284</a></div>
<p class="u-hint">Căn vừa thêm vào bảng hàng. Gửi mã <b>${esc(u.id)}</b> khi nhắn để được hẹn xem nhà.</p></div>`;
  }

  sync();
  setInterval(sync, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
})();
