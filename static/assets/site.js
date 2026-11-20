(() => {
  const form = document.getElementById('loc');
  const grid = document.getElementById('ds');
  if (!form || !grid) return;
  const cards = [...grid.children];
  const dem = document.getElementById('dem');
  const rong = document.getElementById('rong');
  const params = new URLSearchParams(location.search);
  for (const [k, v] of params) {
    const el = form.elements[k];
    if (!el) continue;
    if (el instanceof RadioNodeList || el.length) { for (const r of el) if (r.value === v) r.checked = true; }
    else el.value = v;
  }
  function apply() {
    const f = new FormData(form);
    const type = f.get('type'), tower = f.get('tower'), int = f.get('int'), max = Number(f.get('max') || 0), sort = f.get('sort');
    let n = 0;
    for (const c of cards) {
      const d = c.dataset;
      const ok = (!type || d.type === type) && (!tower || d.tower === tower) && (!int || d.int === int) && (!max || (Number(d.price) && Number(d.price) <= max));
      c.hidden = !ok; if (ok) n++;
    }
    const by = { asc: (a, b) => (+a.dataset.price || 9e12) - (+b.dataset.price || 9e12), desc: (a, b) => +b.dataset.price - +a.dataset.price, area: (a, b) => +b.dataset.area - +a.dataset.area, new: (a, b) => (b.dataset.new || '').localeCompare(a.dataset.new || '') };
    [...cards].sort(by[sort] || by.new).forEach(c => grid.appendChild(c));
    dem.textContent = n; rong.hidden = n > 0;
    const q = new URLSearchParams();
    for (const [k, v] of f) if (v && !(k === 'sort' && v === 'new')) q.set(k, v);
    history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
  }
  form.addEventListener('change', apply);
  if (params.toString()) apply();
})();
