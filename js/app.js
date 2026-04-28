// ── ChopperVerso · App Logic ────────────────────────────────────────────────

// ─ State ─────────────────────────────────────────────────────────────────────
let selectedTipos   = [];
let regPeriod       = 'week';
let activeTab       = 'inserir';

// ─ Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function toast(msg, error = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (error ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2800);
}

// ─ Stats bar ─────────────────────────────────────────────────────────────────
function refreshStats() {
  const all = getEntries();
  const periods = { today: 'today', week: 'week', month: 'month', year: 'year' };
  for (const [key, period] of Object.entries(periods)) {
    const s = calcStats(filterEntries(all, period));
    document.getElementById(`s-${key}-casos`).textContent = s.casos;
    document.getElementById(`s-${key}-lam`).textContent   = s.laminas;
    document.getElementById(`s-${key}-pts`).textContent   = s.pontos;
  }
}

// ─ Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  if (tab === 'inserir')    renderToday();
  if (tab === 'registros')  renderRecords();
  if (tab === 'graficos')   renderCharts();
  if (tab === 'congelacoes') renderCongelacoes();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─ Multi-select Tipos ────────────────────────────────────────────────────────
function buildTipoDropdown() {
  const dd = document.getElementById('tipo-dropdown');
  dd.innerHTML = '';
  TIPOS.forEach(tipo => {
    const opt = document.createElement('label');
    opt.className = 'tipo-option';
    opt.dataset.tipo = tipo;
    const color = TIPO_COLORS[tipo] || '#888';
    opt.innerHTML = `<input type="checkbox" value="${tipo}">
      <span class="tipo-chip" style="--chip-color:${color}">${tipo}</span>`;
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTipo(tipo);
    });
    dd.appendChild(opt);
  });
}

function toggleTipo(tipo) {
  const idx = selectedTipos.indexOf(tipo);
  if (idx === -1) selectedTipos.push(tipo);
  else selectedTipos.splice(idx, 1);
  renderTipoTrigger();
  updateTipoDropdownState();
}

function renderTipoTrigger() {
  const trigger = document.getElementById('tipo-trigger');
  const ph      = document.getElementById('tipo-placeholder');
  // Clear existing tags (keep placeholder and arrow)
  trigger.querySelectorAll('.tipo-tag').forEach(t => t.remove());
  if (selectedTipos.length === 0) {
    ph.style.display = '';
  } else {
    ph.style.display = 'none';
    selectedTipos.forEach(tipo => {
      const color = TIPO_COLORS[tipo] || '#888';
      const tag = document.createElement('span');
      tag.className = 'tipo-tag';
      tag.style.background = color;
      tag.innerHTML = `${tipo}<span class="remove" data-tipo="${tipo}">×</span>`;
      tag.querySelector('.remove').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTipo(tipo);
      });
      trigger.insertBefore(tag, trigger.querySelector('.tipo-trigger-arrow'));
    });
  }
}

function updateTipoDropdownState() {
  document.querySelectorAll('.tipo-option').forEach(opt => {
    const checked = selectedTipos.includes(opt.dataset.tipo);
    opt.classList.toggle('selected', checked);
    opt.querySelector('input').checked = checked;
  });
}

// Dropdown open/close
const tipoSelect  = document.getElementById('tipo-select');
const tipoTrigger = document.getElementById('tipo-trigger');

tipoTrigger.addEventListener('click', () => {
  tipoSelect.classList.toggle('open');
});

tipoTrigger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tipoSelect.classList.toggle('open'); }
  if (e.key === 'Escape') tipoSelect.classList.remove('open');
});

document.addEventListener('click', (e) => {
  if (!tipoSelect.contains(e.target)) tipoSelect.classList.remove('open');
});

// ─ Entry Form ─────────────────────────────────────────────────────────────────
// Set today's date as default
document.getElementById('f-data').value = todayISO();
document.getElementById('cong-data').value = todayISO();
document.getElementById('today-date-label').textContent = formatDate(todayISO());

document.getElementById('entry-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fap    = document.getElementById('f-fap').value.trim();
  const data   = document.getElementById('f-data').value;
  const lam    = parseInt(document.getElementById('f-laminas').value) || 0;
  const pts    = parseInt(document.getElementById('f-pontos').value)  || 0;

  if (!fap || !data) { toast('Preencha FAP e Data.', true); return; }
  if (selectedTipos.length === 0) { toast('Selecione pelo menos um tipo.', true); return; }

  addEntry({ fap, data, tipos: [...selectedTipos], laminas: lam, pontos: pts });

  // Reset form
  document.getElementById('f-fap').value     = '';
  document.getElementById('f-laminas').value = '';
  document.getElementById('f-pontos').value  = '';
  selectedTipos = [];
  renderTipoTrigger();
  updateTipoDropdownState();

  toast('✅ Entrada inserida com sucesso!');
  refreshStats();
  renderToday();
});

// ─ Today view ────────────────────────────────────────────────────────────────
function renderToday() {
  const entries = filterEntries(getEntries(), 'today')
    .sort((a, b) => b.createdAt?.localeCompare(a.createdAt));
  const s = calcStats(entries);

  document.getElementById('td-casos').textContent = s.casos;
  document.getElementById('td-lam').textContent   = s.laminas;
  document.getElementById('td-pts').textContent   = s.pontos;

  const container = document.getElementById('today-list');
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔬</div><p>Nenhuma entrada hoje ainda.</p></div>`;
    return;
  }

  const rows = entries.map(e => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;
                background:var(--card2);border:1px solid var(--border);border-radius:var(--radius-s);margin-bottom:5px;gap:8px">
      <div style="min-width:0">
        <div class="fap-code" style="font-size:0.78rem;color:var(--text-2);margin-bottom:2px">${e.fap}</div>
        <div class="tipos-cell">${renderTipoBadges(e.tipos)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="text-align:right">
          <div style="font-size:0.75rem;color:var(--text-3)">lâm</div>
          <div style="font-weight:800;color:var(--blue-l)">${e.laminas}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.75rem;color:var(--text-3)">pts</div>
          <div style="font-weight:800;color:var(--accent)">${e.pontos}</div>
        </div>
        <button class="btn btn-danger" data-id="${e.id}" onclick="deleteRow(this.dataset.id)">✕</button>
      </div>
    </div>`).join('');

  container.innerHTML = rows;
}

function renderTipoBadges(tipos = []) {
  return tipos.map(t => {
    const c = TIPO_COLORS[t] || '#888';
    return `<span class="tipo-badge" style="background:${c}">${t}</span>`;
  }).join('');
}

function deleteRow(id) {
  if (!confirm('Remover esta entrada?')) return;
  deleteEntry(id);
  toast('Entrada removida.');
  refreshStats();
  renderToday();
  if (activeTab === 'registros') renderRecords();
  if (activeTab === 'graficos')  renderCharts();
}

// ─ Records view ──────────────────────────────────────────────────────────────
function renderRecords() {
  const entries = filterEntries(getEntries(), regPeriod)
    .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt?.localeCompare(a.createdAt));
  const s = calcStats(entries);

  document.getElementById('reg-casos').textContent = s.casos;
  document.getElementById('reg-lam').textContent   = s.laminas;
  document.getElementById('reg-pts').textContent   = s.pontos;

  const tbody = document.getElementById('reg-tbody');
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-3)">Sem registros neste período.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td class="fap-code">${e.fap}</td>
      <td class="date-cell">${formatDate(e.data)}</td>
      <td><div class="tipos-cell">${renderTipoBadges(e.tipos)}</div></td>
      <td class="num-cell laminas">${e.laminas}</td>
      <td class="num-cell pontos">${e.pontos}</td>
      <td><button class="btn btn-danger" onclick="deleteRow('${e.id}')">✕</button></td>
    </tr>`).join('');
}

// Records period buttons
document.querySelectorAll('#tab-registros .period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    regPeriod = btn.dataset.period;
    document.querySelectorAll('#tab-registros .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRecords();
  });
});

// ─ Congelações view ──────────────────────────────────────────────────────────
document.getElementById('cong-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cong-name').value.trim();
  const data = document.getElementById('cong-data').value;
  if (!name || !data) { toast('Preencha todos os campos.', true); return; }
  addCongelacao({ name, data });
  document.getElementById('cong-name').value = '';
  toast('🧊 Congelação registrada!');
  renderCongelacoes();
});

function renderCongelacoes() {
  const list = getCongelacoes().sort((a, b) => b.data.localeCompare(a.data));
  document.getElementById('cong-total').textContent = list.length;
  const container = document.getElementById('cong-list');
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧊</div><p>Nenhuma congelação registrada.</p></div>`;
    return;
  }
  container.innerHTML = list.map(c => `
    <div class="cong-item">
      <div>
        <div class="cong-name">${c.name}</div>
        <div class="cong-date">${formatDate(c.data)}</div>
      </div>
      <button class="btn btn-danger" onclick="deleteCong('${c.id}')">✕</button>
    </div>`).join('');
}

function deleteCong(id) {
  if (!confirm('Remover esta congelação?')) return;
  deleteCongelacao(id);
  toast('Congelação removida.');
  renderCongelacoes();
}

// ─ Export / Import modal ──────────────────────────────────────────────────────
document.getElementById('btn-open-io').addEventListener('click', () => {
  document.getElementById('modal-io').classList.add('open');
});

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-io').classList.remove('open');
});

document.getElementById('modal-io').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-io'))
    document.getElementById('modal-io').classList.remove('open');
});

document.getElementById('btn-export').addEventListener('click', () => {
  const data = exportJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `chopperverso_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Dados exportados!');
});

document.getElementById('btn-import').addEventListener('click', () => {
  const json = document.getElementById('import-text').value.trim();
  if (!json) { toast('Cole o JSON antes de importar.', true); return; }
  if (importJSON(json)) {
    toast('✅ Dados importados com sucesso!');
    document.getElementById('modal-io').classList.remove('open');
    document.getElementById('import-text').value = '';
    refreshStats();
    switchTab(activeTab);
  } else {
    toast('❌ JSON inválido.', true);
  }
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Isso vai apagar todos os dados locais e restaurar os dados do Notion. Continuar?')) return;
  resetToSeed();
  toast('✅ Dados restaurados!');
  document.getElementById('modal-io').classList.remove('open');
  refreshStats();
  switchTab(activeTab);
});

// ─ Init ───────────────────────────────────────────────────────────────────────
buildTipoDropdown();
refreshStats();
renderToday();
