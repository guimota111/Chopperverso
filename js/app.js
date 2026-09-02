// ── ChopperVerso · App Logic ─────────────────────────────────────────────────

// ─ Chopper illustrations ──────────────────────────────────────────────────────

const SVG_CHOPPER_LAPTOP = `<img src="Choppers/trabalhando1.png" alt="Chopper Laptop" style="width:140px;height:auto;object-fit:contain;">`;

const SVG_CHOPPER_CLIPBOARD = `<img src="Choppers/sono.png" alt="Chopper Clipboard" style="width:140px;height:auto;object-fit:contain;">`;

// ─ State ──────────────────────────────────────────────────────────────────────
let selectedTipos = [];
let regPeriod     = 'week';
let regDateFrom   = '';
let regDateTo     = '';
let activeTab     = 'inserir';
let _editId       = null;

// ─ Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function _formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toast(msg, error = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (error ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2800);
}

// ─ Auth ───────────────────────────────────────────────────────────────────────
let loginMode = 'signin';

auth.onAuthStateChanged(async (user) => {
  if (user) {
    setCurrentUid(user.uid);
    await loadCustomTipos();
    buildTipoDropdown();
    renderExtraFieldsInputs();
    renderConjuntoColegas();
    renderFreezeDaysList();
    document.getElementById('f-freeze').checked = isFreezeDay(todayISO());
    _refreshFreezePickerBtn();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display    = '';
    _refreshUserPill(user.email);
    await refreshStats();
    await renderToday();
    if (!hasDisplayName())                            openNomeModal();
    else if (getChangelogSeen() !== CHANGELOG_VERSION) openNovidadesModal();
    if (hasDisplayName()) syncDirectoryEntry(); // backfill silencioso pra quem já tinha nome salvo antes do diretório existir

    watchForUpdates(async ({ entriesChanged, congChanged }) => {
      if (entriesChanged) {
        await refreshStats();
        if (activeTab === 'inserir')   await renderToday();
        if (activeTab === 'registros') await renderRecords();
        if (activeTab === 'graficos')  { destroyCharts(); await renderCharts(); }
        if (activeTab === 'records')   await renderRecordsPage();
      }
      if (congChanged && activeTab === 'congelacoes') await renderCongelacoes();
    });
  } else {
    setCurrentUid(null);
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app-shell').style.display    = 'none';
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email  = document.getElementById('l-email').value.trim();
  const pwd    = document.getElementById('l-password').value;
  const errEl  = document.getElementById('login-error');
  const btn    = document.getElementById('login-submit-btn');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = loginMode === 'signin' ? 'Entrando…' : 'Criando conta…';
  try {
    if (loginMode === 'signin') {
      await auth.signInWithEmailAndPassword(email, pwd);
    } else {
      await auth.createUserWithEmailAndPassword(email, pwd);
    }
  } catch (err) {
    errEl.textContent = _authError(err.code);
    btn.disabled = false;
    btn.textContent = loginMode === 'signin' ? 'Entrar' : 'Criar conta';
  }
});

document.getElementById('login-toggle-btn').addEventListener('click', () => {
  loginMode = loginMode === 'signin' ? 'signup' : 'signin';
  const isSignup = loginMode === 'signup';
  document.getElementById('login-mode-label').textContent   = isSignup ? 'Criar nova conta' : 'Entre na sua conta';
  document.getElementById('login-submit-btn').textContent   = isSignup ? 'Criar conta' : 'Entrar';
  document.getElementById('login-toggle-btn').textContent   = isSignup ? 'Já tem conta? Entrar' : 'Não tem conta? Criar';
  document.getElementById('login-error').textContent = '';
});

document.getElementById('btn-logout').addEventListener('click', () => {
  if (confirm('Sair da conta?')) auth.signOut();
});

function _authError(code) {
  const msgs = {
    'auth/user-not-found':       'Usuário não encontrado.',
    'auth/wrong-password':       'Senha incorreta.',
    'auth/invalid-credential':   'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/invalid-email':        'E-mail inválido.',
    'auth/weak-password':        'Senha fraca (mínimo 6 caracteres).',
    'auth/too-many-requests':    'Muitas tentativas. Tente novamente em alguns minutos.',
  };
  return msgs[code] || 'Erro ao autenticar. Tente novamente.';
}

// ─ Stats bar ──────────────────────────────────────────────────────────────────
async function refreshStats() {
  const all     = await getEntries();
  const periods = { today: 'today', week: 'week', month: 'month', year: 'year' };
  for (const [key, period] of Object.entries(periods)) {
    const s = calcStats(filterEntries(all, period));
    document.getElementById(`s-${key}-casos`).textContent = s.casos;
    document.getElementById(`s-${key}-lam`).textContent   = s.laminas;
    document.getElementById(`s-${key}-pts`).textContent   = s.pontos;
  }
}

// ─ Tab switching ──────────────────────────────────────────────────────────────
async function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  if (tab === 'inserir')     await renderToday();
  if (tab === 'registros')   await renderRecords();
  if (tab === 'graficos')    await renderCharts();
  if (tab === 'records')      await renderRecordsPage();
  if (tab === 'observacoes')  renderObsCalendar();
  if (tab === 'relatorio')    _defaultRelatorioDates();
  if (tab === 'congelacoes')  await renderCongelacoes();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─ Multi-select Tipos ─────────────────────────────────────────────────────────
function buildTipoDropdown() {
  const PALETTE = ['#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#7C3AED','#EC4899','#EF4444','#14B8A6','#F59E0B','#8B5CF6','#64748B'];
  const dd = document.getElementById('tipo-dropdown');
  dd.innerHTML = '';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'tipo-search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'tipo-search';
  searchInput.placeholder = 'Buscar tipo…';
  searchInput.addEventListener('click', e => e.stopPropagation());
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  searchInput.addEventListener('input', () => {
    const q = norm(searchInput.value.trim());
    dd.querySelectorAll('.tipo-option').forEach(opt => {
      opt.style.display = norm(opt.dataset.tipo).includes(q) ? '' : 'none';
    });
  });
  searchWrap.appendChild(searchInput);
  dd.appendChild(searchWrap);

  TIPOS.forEach(tipo => {
    const opt = document.createElement('label');
    opt.className = 'tipo-option';
    opt.dataset.tipo = tipo;
    const color = TIPO_COLORS[tipo] || '#888';
    opt.innerHTML = `<input type="checkbox" value="${tipo}">
      <span class="tipo-chip" style="--chip-color:${color}">${tipo}</span>`;
    opt.addEventListener('click', (e) => { e.preventDefault(); toggleTipo(tipo); });
    dd.appendChild(opt);
  });

  const sep = document.createElement('div');
  sep.className = 'tipo-separator';
  dd.appendChild(sep);

  const newBtn = document.createElement('button');
  newBtn.className = 'tipo-new-btn';
  newBtn.textContent = '+ Novo tipo';
  dd.appendChild(newBtn);

  const manageBtn = document.createElement('button');
  manageBtn.className = 'tipo-new-btn';
  manageBtn.textContent = '⚙️ Gerenciar tipos';
  manageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tipoSelect.classList.remove('open');
    openTiposModal();
  });
  dd.appendChild(manageBtn);

  const form = document.createElement('div');
  form.className = 'tipo-new-form';
  form.style.display = 'none';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Nome do tipo';
  nameInput.maxLength = 40;
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); } });
  form.appendChild(nameInput);

  const swatchRow = document.createElement('div');
  swatchRow.className = 'tipo-color-swatches';
  let _color = PALETTE[0];
  PALETTE.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (c === _color ? ' selected' : '');
    sw.style.background = c;
    sw.dataset.color = c;
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      _color = c;
      swatchRow.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === c));
    });
    swatchRow.appendChild(sw);
  });
  form.appendChild(swatchRow);

  const actions = document.createElement('div');
  actions.className = 'tipo-new-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); form.style.display = 'none'; nameInput.value = ''; });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Criar';
  saveBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = nameInput.value.trim();
    if (!name) { toast('Digite o nome do tipo.', true); return; }
    const ok = await addCustomTipo(name, _color);
    if (!ok) { toast('Tipo já existe.', true); return; }
    buildTipoDropdown();
    updateTipoDropdownState();
    toast(`Tipo "${name}" criado!`);
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  form.appendChild(actions);
  dd.appendChild(form);

  newBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : '';
    if (!isOpen) nameInput.focus();
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
  trigger.querySelectorAll('.tipo-tag').forEach(t => t.remove());
  if (selectedTipos.length === 0) {
    ph.style.display = '';
  } else {
    ph.style.display = 'none';
    selectedTipos.forEach(tipo => {
      const color = TIPO_COLORS[tipo] || '#888';
      const tag   = document.createElement('span');
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

const tipoSelect  = document.getElementById('tipo-select');
const tipoTrigger = document.getElementById('tipo-trigger');

tipoTrigger.addEventListener('click', () => {
  const opening = !tipoSelect.classList.contains('open');
  tipoSelect.classList.toggle('open');
  if (opening) {
    const s = tipoSelect.querySelector('.tipo-search');
    if (s) { s.value = ''; s.dispatchEvent(new Event('input')); s.focus(); }
  }
});
tipoTrigger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tipoSelect.classList.toggle('open'); }
  if (e.key === 'Escape') tipoSelect.classList.remove('open');
});
document.addEventListener('click', (e) => {
  if (!tipoSelect.contains(e.target)) tipoSelect.classList.remove('open');
});

// ─ Gerenciar tipos (ordem / remover / restaurar) ───────────────────────────────
function openTiposModal() {
  renderTiposManage();
  document.getElementById('modal-tipos').classList.add('open');
}

function renderTiposManage() {
  const list = document.getElementById('tipos-manage-list');
  const tipos = getTipos();
  list.innerHTML = tipos.map((t, i) => {
    const color = TIPO_COLORS[t] || '#888';
    const safe  = t.replace(/'/g, "\\'");
    return `
    <div class="tipo-manage-row">
      <span class="tipo-badge" style="background:${color}">${t}</span>
      <div class="tipo-manage-actions">
        <button class="btn btn-ghost" title="Subir"  ${i === 0 ? 'disabled' : ''} onclick="moveTipoItem('${safe}', -1)">▲</button>
        <button class="btn btn-ghost" title="Descer" ${i === tipos.length - 1 ? 'disabled' : ''} onclick="moveTipoItem('${safe}', 1)">▼</button>
        <button class="btn btn-danger" title="Remover" onclick="removeTipoItem('${safe}')">✕</button>
      </div>
    </div>`;
  }).join('');

  const removed = getRemovedTipos();
  const wrap    = document.getElementById('tipos-removed-wrap');
  const remList = document.getElementById('tipos-removed-list');
  if (removed.length === 0) {
    wrap.style.display = 'none';
  } else {
    wrap.style.display = '';
    remList.innerHTML = removed.map(t => {
      const color = TIPO_COLORS[t] || '#888';
      const safe  = t.replace(/'/g, "\\'");
      return `<button class="tipo-restore-chip" style="--chip-color:${color}" onclick="restoreTipoItem('${safe}')">+ ${t}</button>`;
    }).join('');
  }
}

async function moveTipoItem(name, dir) {
  await moveTipo(name, dir);
  renderTiposManage();
  buildTipoDropdown();
  updateTipoDropdownState();
}

async function removeTipoItem(name) {
  if (selectedTipos.includes(name)) selectedTipos = selectedTipos.filter(t => t !== name);
  await removeTipoFromList(name);
  renderTiposManage();
  buildTipoDropdown();
  renderTipoTrigger();
  updateTipoDropdownState();
  toast(`Tipo "${name}" removido da sua lista.`);
}

async function restoreTipoItem(name) {
  await restoreTipo(name);
  renderTiposManage();
  buildTipoDropdown();
  updateTipoDropdownState();
  toast(`Tipo "${name}" restaurado.`);
}

document.getElementById('modal-tipos-close').addEventListener('click', () => {
  document.getElementById('modal-tipos').classList.remove('open');
});

document.getElementById('modal-tipos').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-tipos'))
    document.getElementById('modal-tipos').classList.remove('open');
});

// ─ Freeze day toggle ──────────────────────────────────────────────────────────
const freezeCheck = document.getElementById('f-freeze');
const dateInput   = document.getElementById('f-data');

dateInput.addEventListener('change', () => {
  freezeCheck.checked = isFreezeDay(dateInput.value);
  _updateFreezeLabel();
});

freezeCheck.addEventListener('change', async () => {
  const date = dateInput.value;
  if (!date) { freezeCheck.checked = false; return; }
  const isNow = await toggleFreezeDay(date);
  freezeCheck.checked = isNow;
  _updateFreezeLabel();
  renderFreezeDaysList();
  _syncFreezePicker(date);
  toast(isNow ? '🧊 Dia marcado como congelação' : 'Marcação de congelação removida');
  if (activeTab === 'graficos')  { destroyCharts(); await renderCharts(); }
  if (activeTab === 'registros') await renderRecords();
});

function _updateFreezeLabel() {
  const label = document.getElementById('freeze-toggle-label');
  if (label) label.classList.toggle('active', freezeCheck.checked);
}

// ─ Freeze days manager card ───────────────────────────────────────────────────
function renderFreezeDaysList() {
  const container = document.getElementById('freeze-days-list');
  if (!container) return;
  const days = getFreezeDays().sort((a, b) => b.localeCompare(a));
  if (days.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:0.8rem;margin:0">Nenhum dia marcado ainda.</p>';
    return;
  }
  container.innerHTML = `<div class="freeze-chips">` +
    days.map(d => `
      <span class="freeze-chip">
        🧊 ${formatDate(d)}
        <button onclick="removeFreezeDayItem('${d}')" title="Remover">×</button>
      </span>`).join('') +
    `</div>`;
}

async function removeFreezeDayItem(date) {
  await toggleFreezeDay(date);
  renderFreezeDaysList();
  _syncFreezePicker(date);
  if (dateInput.value === date) {
    freezeCheck.checked = false;
    _updateFreezeLabel();
  }
  if (activeTab === 'graficos')  { destroyCharts(); await renderCharts(); }
  if (activeTab === 'registros') await renderRecords();
  toast('Marcação de congelação removida.');
}

function _syncFreezePicker(changedDate) {
  const picker = document.getElementById('freeze-date-picker');
  const btn    = document.getElementById('btn-toggle-freeze-day');
  if (!picker || !btn) return;
  if (picker.value !== changedDate) return;
  const frozen = isFreezeDay(picker.value);
  btn.textContent = frozen ? '❄️ Desmarcar' : '🧊 Marcar';
  btn.className   = frozen
    ? 'btn btn-ghost'
    : 'btn btn-primary';
  btn.style.flexShrink = '0';
  btn.style.marginTop  = '0';
  btn.style.width      = 'auto';
}

function _refreshFreezePickerBtn() {
  const picker = document.getElementById('freeze-date-picker');
  if (picker) _syncFreezePicker(picker.value);
}

document.getElementById('freeze-date-picker').addEventListener('change', _refreshFreezePickerBtn);

document.getElementById('btn-toggle-freeze-day').addEventListener('click', async () => {
  const picker = document.getElementById('freeze-date-picker');
  const date   = picker.value;
  if (!date) { toast('Selecione uma data.', true); return; }
  const isNow = await toggleFreezeDay(date);
  renderFreezeDaysList();
  _refreshFreezePickerBtn();
  if (dateInput.value === date) {
    freezeCheck.checked = isNow;
    _updateFreezeLabel();
  }
  toast(isNow ? '🧊 Dia marcado como congelação' : 'Marcação de congelação removida');
  if (activeTab === 'graficos')  { destroyCharts(); await renderCharts(); }
  if (activeTab === 'registros') await renderRecords();
});

// ─ Extra fields form ──────────────────────────────────────────────────────────
function renderExtraFieldsInputs() {
  const container = document.getElementById('extra-fields-inputs');
  if (!container) return;
  const fields = getCustomFields();
  if (fields.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = fields.map((f, i) => `
    <div class="field">
      <label>${f.name}</label>
      <input type="${f.type}" id="extra-field-${i}"
             placeholder="${f.type === 'number' ? '0' : '–'}"
             ${f.type === 'number' ? 'min="0"' : ''}>
    </div>`).join('');
}

function _collectExtras() {
  const extras = {};
  getCustomFields().forEach((f, i) => {
    const el = document.getElementById(`extra-field-${i}`);
    if (!el) return;
    extras[f.name] = f.type === 'number' ? (parseFloat(el.value) || 0) : el.value.trim();
  });
  return extras;
}

function _clearExtras() {
  getCustomFields().forEach((_, i) => {
    const el = document.getElementById(`extra-field-${i}`);
    if (el) el.value = '';
  });
}

// ─ Custom fields modal ────────────────────────────────────────────────────────
function renderCamposList() {
  const container = document.getElementById('campos-list');
  const fields    = getCustomFields();
  if (fields.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:0.82rem;padding:0.25rem 0">Nenhum campo extra definido ainda.</p>';
    return;
  }
  container.innerHTML = fields.map(f => `
    <div class="campo-item">
      <div class="campo-item-info">
        <span class="campo-item-name">${f.name}</span>
        <span class="campo-item-type">${f.type === 'number' ? 'Número' : 'Texto'}</span>
      </div>
      <button class="btn btn-danger" onclick="deleteCampo('${f.name.replace(/'/g, "\\'")}')">✕</button>
    </div>`).join('');
}

async function deleteCampo(name) {
  if (!confirm(`Remover campo "${name}"?`)) return;
  await removeCustomField(name);
  renderCamposList();
  renderExtraFieldsInputs();
  toast(`Campo "${name}" removido.`);
}

document.getElementById('btn-campos').addEventListener('click', () => {
  renderCamposList();
  document.getElementById('modal-campos').classList.add('open');
});

document.getElementById('modal-campos-close').addEventListener('click', () => {
  document.getElementById('modal-campos').classList.remove('open');
});

document.getElementById('modal-campos').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-campos'))
    document.getElementById('modal-campos').classList.remove('open');
});

document.getElementById('new-campo-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-campo').click(); }
});

document.getElementById('btn-add-campo').addEventListener('click', async () => {
  const name = document.getElementById('new-campo-name').value.trim();
  const type = document.getElementById('new-campo-type').value;
  if (!name) { toast('Digite o nome do campo.', true); return; }
  const ok = await addCustomField(name, type);
  if (!ok) { toast('Campo já existe.', true); return; }
  document.getElementById('new-campo-name').value = '';
  renderCamposList();
  renderExtraFieldsInputs();
  toast(`Campo "${name}" adicionado!`);
});

// ─ Entry Form ─────────────────────────────────────────────────────────────────
document.getElementById('entry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fap  = document.getElementById('f-fap').value.trim();
  const data = document.getElementById('f-data').value;
  const lam  = parseInt(document.getElementById('f-laminas').value)   || 0;
  const pts  = parseFloat(document.getElementById('f-pontos').value) || 0;

  if (!fap || !data)           { toast('Preencha FAP e Data.', true); return; }
  if (selectedTipos.length === 0) { toast('Selecione pelo menos um tipo.', true); return; }

  const extras            = _collectExtras();
  const segundaAssinatura = document.getElementById('f-segunda-assinatura').checked;
  const interessante      = document.getElementById('f-interessante').checked;
  const emConjunto        = document.getElementById('f-liberar-conjunto').checked;
  const colegasSelec      = _selectedColegaEmails();

  const entryData = { fap, data, tipos: [...selectedTipos], laminas: lam, pontos: pts, extras, segundaAssinatura, interessante };

  if (emConjunto) {
    if (colegasSelec.length === 0) { toast('Selecione ao menos um colega ou desmarque "em conjunto".', true); return; }
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      const r = await addSharedEntry(entryData, colegasSelec);
      const nomes = await _colegaNames(r.inseridos);
      toast(`👥 Caso lançado para: ${nomes.join(', ')}`);
      if (r.naoEncontrados && r.naoEncontrados.length) {
        toast(`⚠️ Sem conta (não lançado): ${r.naoEncontrados.join(', ')}`, true);
      }
    } catch (err) {
      toast('Erro ao liberar em conjunto: ' + err.message, true);
      if (btn) btn.disabled = false;
      return;
    }
    if (btn) btn.disabled = false;
  } else {
    await addEntry(entryData);
    toast('✅ Entrada inserida com sucesso!');
  }

  document.getElementById('f-fap').value     = '';
  document.getElementById('f-laminas').value = '';
  document.getElementById('f-pontos').value  = '';
  _clearExtras();
  document.getElementById('f-segunda-assinatura').checked = false;
  document.getElementById('f-segunda-ass-label').classList.remove('active-2ass');
  document.getElementById('f-interessante').checked = false;
  document.getElementById('f-interessante-label').classList.remove('active-interessante');
  document.getElementById('f-liberar-conjunto').checked = false;
  document.getElementById('f-conjunto-label').classList.remove('active-conjunto');
  document.getElementById('conjunto-panel').style.display = 'none';
  _clearColegaSelection();
  selectedTipos = [];
  renderTipoTrigger();
  updateTipoDropdownState();

  await refreshStats();
  await renderToday();
});

// ─ Today view ─────────────────────────────────────────────────────────────────
async function renderToday() {
  const all     = await getEntries();
  const entries = filterEntries(all, 'today')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const s = calcStats(entries);

  document.getElementById('td-casos').textContent = s.casos;
  document.getElementById('td-lam').textContent   = s.laminas;
  document.getElementById('td-pts').textContent   = s.pontos;

  const today    = todayISO();
  const isFreeze = isFreezeDay(today);
  document.getElementById('today-date-label').innerHTML =
    `${formatDate(today)}${isFreeze ? ' <span title="Dia de congelação" style="font-size:1em">🧊</span>' : ''}`;

  const container = document.getElementById('today-list');
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state chopper-empty">${SVG_CHOPPER_LAPTOP}<p>Nenhuma entrada hoje ainda.</p></div>`;
    return;
  }

  container.innerHTML = entries.map(e => {
    const extrasHtml = Object.entries(e.extras || {})
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `<span class="extra-tag">${k}: ${v}</span>`)
      .join('');
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;
                background:var(--card2);border:1px solid var(--border);border-radius:var(--radius-s);margin-bottom:5px;gap:8px">
      <div style="min-width:0">
        <div class="fap-code" style="font-size:0.78rem;color:var(--text-2);margin-bottom:2px">${e.fap}</div>
        <div class="tipos-cell">${renderTipoBadges(e.tipos)}${e.segundaAssinatura ? '<span class="segunda-ass-badge">2ª Ass.</span>' : ''}${_interessanteBadge(e)}${_conjuntoBadge(e)}</div>
        ${extrasHtml ? `<div class="extra-tags">${extrasHtml}</div>` : ''}
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
        <button class="btn-star${e.interessante ? ' active' : ''}" title="Marcar como interessante" onclick="toggleInteressante('${e.id}')">⭐</button>
        <button class="btn btn-danger" onclick="deleteRow('${e.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderTipoBadges(tipos = []) {
  return tipos.map(t => {
    const c = TIPO_COLORS[t] || '#888';
    return `<span class="tipo-badge" style="background:${c}">${t}</span>`;
  }).join('');
}

async function deleteRow(id) {
  if (!confirm('Remover esta entrada?')) return;
  await deleteEntry(id);
  toast('Entrada removida.');
  await refreshStats();
  await renderToday();
  if (activeTab === 'registros') await renderRecords();
  if (activeTab === 'graficos')  await renderCharts();
}

// ─ Records view ───────────────────────────────────────────────────────────────
let regTipoFilter        = [];    // vazio = todos os tipos
let regInteressanteOnly  = false;

function renderRegTipoChips() {
  const wrap = document.getElementById('reg-tipo-chips');
  if (!wrap) return;
  wrap.innerHTML = getTipos().map(t => {
    const active = regTipoFilter.includes(t);
    const color  = TIPO_COLORS[t] || '#888';
    return `<span class="reg-tipo-chip${active ? ' active' : ''}" style="background:${color}" onclick="toggleRegTipoFilter('${t.replace(/'/g, "\\'")}')">${t}</span>`;
  }).join('');
  document.getElementById('reg-tipo-clear').style.display = regTipoFilter.length ? '' : 'none';
}

async function toggleRegTipoFilter(tipo) {
  const i = regTipoFilter.indexOf(tipo);
  if (i === -1) regTipoFilter.push(tipo);
  else          regTipoFilter.splice(i, 1);
  renderRegTipoChips();
  await renderRecords();
}

document.getElementById('reg-tipo-clear').addEventListener('click', async () => {
  regTipoFilter = [];
  renderRegTipoChips();
  await renderRecords();
});

document.getElementById('reg-tog-interessante').addEventListener('click', async function () {
  regInteressanteOnly = !regInteressanteOnly;
  this.classList.toggle('active-interessante-filter', regInteressanteOnly);
  await renderRecords();
});

async function renderRecords() {
  renderRegTipoChips();
  const all = await getEntries();
  let entries;
  if (regPeriod === 'custom') {
    const from = regDateFrom;
    const to   = regDateTo || regDateFrom;
    entries = all.filter(e => e.data >= from && e.data <= to);
  } else {
    entries = filterEntries(all, regPeriod);
  }
  if (regTipoFilter.length)  entries = entries.filter(e => (e.tipos || []).some(t => regTipoFilter.includes(t)));
  if (regInteressanteOnly)   entries = entries.filter(e => e.interessante);
  entries = entries.sort((a, b) => b.data.localeCompare(a.data) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const s = calcStats(entries);

  document.getElementById('reg-casos').textContent = s.casos;
  document.getElementById('reg-lam').textContent   = s.laminas;
  document.getElementById('reg-pts').textContent   = s.pontos;

  const fields    = getCustomFields();
  const totalCols = 6 + fields.length;
  const extraHeaders = fields.map(f => `<th>${f.name}</th>`).join('');

  if (entries.length === 0) {
    document.getElementById('reg-table-wrap').innerHTML =
      `<div class="empty-state chopper-empty">${SVG_CHOPPER_CLIPBOARD}<p>Sem registros neste período.</p></div>`;
    return;
  }

  const rowsHtml = entries.map(e => {
        const freeze   = isFreezeDay(e.data) ? ' <span title="Dia de congelação" style="font-size:0.9em">🧊</span>' : '';
        const extraCells = fields.map(f => {
          const v = (e.extras || {})[f.name];
          return `<td style="color:var(--text-2)">${v !== undefined && v !== '' ? v : '–'}</td>`;
        }).join('');
        return `
        <tr>
          <td class="fap-code">${e.fap}</td>
          <td class="date-cell">${formatDate(e.data)}${freeze}${e.createdAt ? `<div class="entry-time">${_formatTime(e.createdAt)}</div>` : ''}</td>
          <td><div class="tipos-cell">${renderTipoBadges(e.tipos)}${e.segundaAssinatura ? '<span class="segunda-ass-badge">2ª Ass.</span>' : ''}${_interessanteBadge(e)}${_conjuntoBadge(e)}</div></td>
          <td class="num-cell laminas">${e.laminas}</td>
          <td class="num-cell pontos">${e.pontos}</td>
          ${extraCells}
          <td style="white-space:nowrap"><button class="btn-star${e.interessante ? ' active' : ''}" title="Marcar como interessante" onclick="toggleInteressante('${e.id}')">⭐</button> <button class="btn btn-edit" onclick="openEditModal('${e.id}')">✏️</button> <button class="btn btn-danger" onclick="deleteRow('${e.id}')">✕</button></td>
        </tr>`;
      }).join('');

  document.getElementById('reg-table-wrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>FAP</th>
          <th>Data</th>
          <th>Tipo(s)</th>
          <th style="text-align:right">Lâminas</th>
          <th style="text-align:right">Pontos</th>
          ${extraHeaders}
          <th></th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

document.querySelectorAll('#tab-registros .period-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    regPeriod = btn.dataset.period;
    document.querySelectorAll('#tab-registros .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filterEl = document.getElementById('reg-date-filter');
    if (regPeriod === 'custom') {
      filterEl.style.display = '';
    } else {
      filterEl.style.display = 'none';
      await renderRecords();
    }
  });
});

document.getElementById('btn-apply-date').addEventListener('click', async () => {
  regDateFrom = document.getElementById('reg-date-from').value;
  regDateTo   = document.getElementById('reg-date-to').value;
  if (!regDateFrom) { toast('Selecione ao menos a data inicial.', true); return; }
  await renderRecords();
});

// ─ Edit modal ─────────────────────────────────────────────────────────────────
async function openEditModal(id) {
  const all   = await getEntries();
  const entry = all.find(e => e.id === id);
  if (!entry) return;
  _editId = id;

  document.getElementById('e-fap').value     = entry.fap;
  document.getElementById('e-data').value    = entry.data;
  document.getElementById('e-laminas').value = entry.laminas;
  document.getElementById('e-pontos').value  = entry.pontos;
  const isSegunda = entry.segundaAssinatura || false;
  document.getElementById('e-segunda-assinatura').checked = isSegunda;
  document.getElementById('e-segunda-ass-label').classList.toggle('active-2ass', isSegunda);
  const isInteressante = entry.interessante || false;
  document.getElementById('e-interessante').checked = isInteressante;
  document.getElementById('e-interessante-label').classList.toggle('active-interessante', isInteressante);

  const wrap = document.getElementById('e-tipos-wrap');
  // Inclui tipos já usados neste caso mesmo que tenham sido removidos da lista,
  // para não perdê-los ao salvar a edição.
  const editTipos = [...TIPOS, ...(entry.tipos || []).filter(t => !TIPOS.includes(t))];
  wrap.innerHTML = editTipos.map(t => {
    const checked = (entry.tipos || []).includes(t);
    const color   = TIPO_COLORS[t] || '#888';
    return `<label class="edit-tipo-opt${checked ? ' selected' : ''}">
      <input type="checkbox" value="${t}"${checked ? ' checked' : ''}>
      <span class="tipo-badge" style="background:${color}">${t}</span>
    </label>`;
  }).join('');
  wrap.querySelectorAll('.edit-tipo-opt').forEach(lbl => {
    lbl.addEventListener('change', () => {
      lbl.classList.toggle('selected', lbl.querySelector('input').checked);
    });
  });

  const fields    = getCustomFields();
  const extrasCont = document.getElementById('e-extra-fields');
  extrasCont.innerHTML = fields.map((f, i) => {
    const v = (entry.extras || {})[f.name] ?? '';
    return `<div class="field">
      <label>${f.name}</label>
      <input type="${f.type}" id="e-extra-${i}" value="${v}"
             placeholder="${f.type === 'number' ? '0' : '–'}"
             ${f.type === 'number' ? 'min="0"' : ''}>
    </div>`;
  }).join('');

  document.getElementById('modal-edit').classList.add('open');
}

document.getElementById('modal-edit-close').addEventListener('click', () => {
  document.getElementById('modal-edit').classList.remove('open');
});
document.getElementById('btn-edit-cancel').addEventListener('click', () => {
  document.getElementById('modal-edit').classList.remove('open');
});
document.getElementById('modal-edit').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-edit'))
    document.getElementById('modal-edit').classList.remove('open');
});

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!_editId) return;
  const fap   = document.getElementById('e-fap').value.trim();
  const data  = document.getElementById('e-data').value;
  const lam   = parseInt(document.getElementById('e-laminas').value)   || 0;
  const pts   = parseFloat(document.getElementById('e-pontos').value) || 0;
  const tipos = [...document.querySelectorAll('#e-tipos-wrap input:checked')].map(cb => cb.value);

  if (!fap || !data)      { toast('Preencha FAP e Data.', true); return; }
  if (tipos.length === 0) { toast('Selecione pelo menos um tipo.', true); return; }

  const extras = {};
  getCustomFields().forEach((f, i) => {
    const el = document.getElementById(`e-extra-${i}`);
    if (!el) return;
    extras[f.name] = f.type === 'number' ? (parseFloat(el.value) || 0) : el.value.trim();
  });

  const segundaAssinatura = document.getElementById('e-segunda-assinatura').checked;
  const interessante      = document.getElementById('e-interessante').checked;
  await updateEntry(_editId, { fap, data, tipos, laminas: lam, pontos: pts, extras, segundaAssinatura, interessante });
  document.getElementById('modal-edit').classList.remove('open');
  toast('✅ Registro atualizado!');
  await refreshStats();
  await renderRecords();
  if (activeTab === 'graficos') { destroyCharts(); await renderCharts(); }
});

// ─ Lançar por e-mail: cartão de ajuda ──────────────────────────────────────────
// ⚠️ Troque pelo endereço da caixa Gmail dedicada que você criar.
const LANCAR_EMAIL = 'lancar.chopperverso@gmail.com';

function _refreshEmailHelp() {
  const addr = document.getElementById('email-addr-box');
  const nome = document.getElementById('email-nome-box');
  const tips = document.getElementById('email-tipos-box');
  if (addr) addr.textContent = LANCAR_EMAIL;
  if (nome) nome.textContent = getDisplayName() || '⚠️ defina seu nome (clique no seu nome lá em cima)';
  if (tips) tips.value = TIPOS.join('\n');
}

document.getElementById('btn-copy-tipos').addEventListener('click', () => {
  navigator.clipboard.writeText(TIPOS.join('\n')).then(
    () => toast('Tipos copiados!'),
    () => toast('Não consegui copiar.', true)
  );
});

// ─ Webhook UI ─────────────────────────────────────────────────────────────────
const WEBHOOK_BASE = 'https://us-central1-chopperverso.cloudfunctions.net/webhook';

function _refreshWebhookUI() {
  const token   = getWebhookToken();
  const box     = document.getElementById('webhook-url-box');
  const copyBtn = document.getElementById('btn-copy-webhook');
  if (token) {
    box.textContent    = `${WEBHOOK_BASE}?token=${token}`;
    copyBtn.disabled   = false;
  } else {
    box.textContent    = 'Nenhum token gerado ainda.';
    copyBtn.disabled   = true;
  }
}

document.getElementById('btn-gen-webhook').addEventListener('click', async () => {
  const btn = document.getElementById('btn-gen-webhook');
  btn.disabled    = true;
  btn.textContent = 'Gerando…';
  try {
    await generateWebhookToken();
    _refreshWebhookUI();
    toast('Token gerado! Copie a URL abaixo.');
  } catch (e) {
    console.error('[webhook] erro ao gerar token:', e);
    toast('Erro: ' + (e.message || e.code || JSON.stringify(e)), true);
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔑 Gerar Token';
  }
});

document.getElementById('btn-copy-webhook').addEventListener('click', () => {
  const token = getWebhookToken();
  if (!token) return;
  navigator.clipboard.writeText(`${WEBHOOK_BASE}?token=${token}`);
  toast('URL copiada!');
});

document.getElementById('btn-export-tipos').addEventListener('click', () => {
  const snippet = exportTiposParaScript();
  const ta = document.getElementById('tipos-script-output');
  ta.value = snippet;
  ta.style.display = '';
  navigator.clipboard.writeText(snippet).catch(() => {});
  toast('Tipos copiados! Cole no seu script.');
});

// ─ Export / Import modal ──────────────────────────────────────────────────────
document.getElementById('btn-open-io').addEventListener('click', () => {
  _refreshWebhookUI();
  _refreshEmailHelp();
  switchIoTab('email');
  document.getElementById('modal-io').classList.add('open');
});

function switchIoTab(which) {
  document.querySelectorAll('.io-tab').forEach(t => t.classList.toggle('active', t.dataset.io === which));
  document.querySelectorAll('.io-panel').forEach(p => p.classList.toggle('active', p.id === `io-panel-${which}`));
}

document.querySelectorAll('.io-tab').forEach(tab => {
  tab.addEventListener('click', () => switchIoTab(tab.dataset.io));
});

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-io').classList.remove('open');
});

document.getElementById('modal-io').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-io'))
    document.getElementById('modal-io').classList.remove('open');
});

document.getElementById('btn-export').addEventListener('click', async () => {
  const data = await exportJSON();
  const blob  = new Blob([data], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `chopperverso_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Dados exportados!');
});

document.getElementById('btn-import').addEventListener('click', async () => {
  const json = document.getElementById('import-text').value.trim();
  if (!json) { toast('Cole o JSON antes de importar.', true); return; }
  const ok = await importJSON(json);
  if (ok) {
    toast('✅ Dados importados com sucesso!');
    document.getElementById('modal-io').classList.remove('open');
    document.getElementById('import-text').value = '';
    renderExtraFieldsInputs();
    await refreshStats();
    await switchTab(activeTab);
  } else {
    toast('❌ JSON inválido.', true);
  }
});

document.getElementById('btn-force-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-force-refresh');
  btn.disabled = true;
  btn.textContent = 'Atualizando…';
  try {
    await forceFullRefresh();
    await refreshStats();
    await switchTab(activeTab);
    toast('✅ Dados atualizados!');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Atualizar agora';
  }
});

document.getElementById('btn-reset').addEventListener('click', async () => {
  if (!confirm('Isso vai apagar todos os dados e restaurar os dados do Notion. Continuar?')) return;
  await resetToSeed();
  toast('✅ Dados restaurados!');
  document.getElementById('modal-io').classList.remove('open');
  await refreshStats();
  await switchTab(activeTab);
});

// ─ Observations tab ───────────────────────────────────────────────────────────
const OBS_MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const OBS_WEEKDAYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

let _obsCurrentDate = new Date();
let _obsEditDate    = null;

function renderObsCalendar() {
  const year  = _obsCurrentDate.getFullYear();
  const month = _obsCurrentDate.getMonth();
  const today = todayISO();

  document.getElementById('obs-month-label').textContent = `${OBS_MONTHS_PT[month]} ${year}`;

  const cal = document.getElementById('obs-calendar');
  cal.innerHTML = '';

  OBS_WEEKDAYS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'obs-weekday';
    el.textContent = d;
    cal.appendChild(el);
  });

  const firstDOW      = new Date(year, month, 1).getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const prevDaysInMon = new Date(year, month, 0).getDate();

  for (let i = firstDOW - 1; i >= 0; i--) {
    const pDay  = prevDaysInMon - i;
    const pMon  = month === 0 ? 11 : month - 1;
    const pYear = month === 0 ? year - 1 : year;
    const ds    = `${pYear}-${String(pMon + 1).padStart(2,'0')}-${String(pDay).padStart(2,'0')}`;
    cal.appendChild(_obsCell(pDay, ds, today, true));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cal.appendChild(_obsCell(d, ds, today, false));
  }

  const totalCells = Math.ceil((firstDOW + daysInMonth) / 7) * 7;
  let nextDay = 1;
  for (let i = firstDOW + daysInMonth; i < totalCells; i++) {
    const nMon  = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    const ds    = `${nYear}-${String(nMon + 1).padStart(2,'0')}-${String(nextDay).padStart(2,'0')}`;
    cal.appendChild(_obsCell(nextDay++, ds, today, true));
  }
}

function _obsCell(dayNum, dateStr, today, otherMonth) {
  const el = document.createElement('div');
  el.className = 'obs-day';
  if (otherMonth)           el.classList.add('other-month');
  if (dateStr === today)    el.classList.add('today');
  if (isFreezeDay(dateStr)) el.classList.add('freeze-day');

  const numEl = document.createElement('div');
  numEl.className = 'obs-day-num';
  numEl.textContent = dayNum;
  el.appendChild(numEl);

  const obs = getObservation(dateStr);
  if (obs) {
    const dot = document.createElement('div');
    dot.className = 'obs-day-indicator';
    el.appendChild(dot);

    const parts = [];
    if (obs.casosInicio !== undefined) parts.push(`M: ${obs.casosInicio}`);
    if (obs.casosFim    !== undefined) parts.push(`F: ${obs.casosFim}`);
    if (parts.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'obs-day-meta';
      meta.textContent = parts.join('  ');
      el.appendChild(meta);
    }

    if (obs.texto) {
      const txt = document.createElement('div');
      txt.className = 'obs-day-text';
      txt.textContent = obs.texto;
      el.appendChild(txt);
    }
  }

  if (isFreezeDay(dateStr)) {
    const ice = document.createElement('span');
    ice.className = 'obs-freeze-icon';
    ice.textContent = '🧊';
    el.appendChild(ice);
  }

  if (!otherMonth) {
    el.addEventListener('click', () => openObsModal(dateStr));
  }
  return el;
}

function openObsModal(dateStr) {
  _obsEditDate = dateStr;
  const [y, m, d] = dateStr.split('-');
  document.getElementById('obs-modal-date-label').textContent = `${d}/${m}/${y}`;

  const obs = getObservation(dateStr) || {};
  document.getElementById('obs-casos-inicio').value = obs.casosInicio !== undefined ? obs.casosInicio : '';
  document.getElementById('obs-casos-fim').value    = obs.casosFim    !== undefined ? obs.casosFim    : '';
  document.getElementById('obs-texto').value        = obs.texto || '';

  document.getElementById('modal-obs').classList.add('open');
  setTimeout(() => document.getElementById('obs-texto').focus(), 80);
}

document.getElementById('modal-obs-close').addEventListener('click', () => {
  document.getElementById('modal-obs').classList.remove('open');
});

document.getElementById('modal-obs').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-obs'))
    document.getElementById('modal-obs').classList.remove('open');
});

document.getElementById('obs-modal-save').addEventListener('click', async () => {
  if (!_obsEditDate) return;
  const inicioRaw = document.getElementById('obs-casos-inicio').value;
  const fimRaw    = document.getElementById('obs-casos-fim').value;
  const texto     = document.getElementById('obs-texto').value.trim();

  const casosInicio = inicioRaw !== '' ? parseInt(inicioRaw) : null;
  const casosFim    = fimRaw    !== '' ? parseInt(fimRaw)    : null;

  if (casosInicio === null && casosFim === null && !texto) {
    await deleteObservation(_obsEditDate);
  } else {
    await saveObservation(_obsEditDate, { casosInicio, casosFim, texto });
  }

  document.getElementById('modal-obs').classList.remove('open');
  renderObsCalendar();
  toast('✅ Observação salva!');
});

document.getElementById('obs-modal-delete').addEventListener('click', async () => {
  if (!_obsEditDate) return;
  if (!confirm('Limpar as observações deste dia?')) return;
  await deleteObservation(_obsEditDate);
  document.getElementById('modal-obs').classList.remove('open');
  renderObsCalendar();
  toast('Observações removidas.');
});

document.getElementById('obs-prev-month').addEventListener('click', () => {
  const y = _obsCurrentDate.getFullYear();
  const m = _obsCurrentDate.getMonth();
  _obsCurrentDate = new Date(y, m - 1, 1);
  renderObsCalendar();
});

document.getElementById('obs-next-month').addEventListener('click', () => {
  const y = _obsCurrentDate.getFullYear();
  const m = _obsCurrentDate.getMonth();
  _obsCurrentDate = new Date(y, m + 1, 1);
  renderObsCalendar();
});

// ─ Segunda Assinatura toggles ─────────────────────────────────────────────────
document.getElementById('f-segunda-assinatura').addEventListener('change', function () {
  document.getElementById('f-segunda-ass-label').classList.toggle('active-2ass', this.checked);
});

document.getElementById('e-segunda-assinatura').addEventListener('change', function () {
  document.getElementById('e-segunda-ass-label').classList.toggle('active-2ass', this.checked);
});

// ─ Caso interessante toggles ────────────────────────────────────────────────────
document.getElementById('f-interessante').addEventListener('change', function () {
  document.getElementById('f-interessante-label').classList.toggle('active-interessante', this.checked);
});

document.getElementById('e-interessante').addEventListener('change', function () {
  document.getElementById('e-interessante-label').classList.toggle('active-interessante', this.checked);
});

// ─ Liberar em conjunto ─────────────────────────────────────────────────────────
function _conjuntoBadge(e) {
  if (!e.sharedWith || !e.sharedWith.length) return '';
  const nomes = e.sharedWith.join(', ').replace(/"/g, '&quot;');
  return `<span class="conjunto-badge" title="Liberado em conjunto: ${nomes}">👥 Conjunto</span>`;
}

function _interessanteBadge(e) {
  return e.interessante ? '<span class="interessante-badge">⭐ Interessante</span>' : '';
}

async function toggleInteressante(id) {
  const all   = await getEntries();
  const entry = all.find(e => e.id === id);
  if (!entry) return;
  await updateEntry(id, { interessante: !entry.interessante });
  if (activeTab === 'inserir')   await renderToday();
  if (activeTab === 'registros') await renderRecords();
}

async function renderConjuntoColegas() {
  const select = document.getElementById('conjunto-colegas-list');
  if (!select) return;
  const dir = await getDirectory();
  select.innerHTML = dir.length === 0
    ? '<option value="">Nenhum outro usuário do ChopperVerso ainda</option>'
    : '<option value="">Selecione…</option>' + dir.map(u => `<option value="${u.email}">${u.nome}</option>`).join('');
}

function _selectedColegaEmails() {
  const v = document.getElementById('conjunto-colegas-list').value;
  return v ? [v] : [];
}

function _clearColegaSelection() {
  document.getElementById('conjunto-colegas-list').value = '';
}

async function _colegaNames(emails) {
  const dir = await getDirectory();
  return (emails || []).map(em => {
    if (em === (auth.currentUser && auth.currentUser.email)) return getDisplayName() || 'você';
    const u = dir.find(u => u.email.toLowerCase() === String(em).toLowerCase());
    return u ? u.nome : em;
  });
}

document.getElementById('f-liberar-conjunto').addEventListener('change', function () {
  document.getElementById('f-conjunto-label').classList.toggle('active-conjunto', this.checked);
  document.getElementById('conjunto-panel').style.display = this.checked ? '' : 'none';
});

// ─ Nome de exibição ─────────────────────────────────────────────────────────────
function _refreshUserPill(email) {
  const pill = document.getElementById('user-email-pill');
  pill.textContent = getDisplayName() || email || '';
  pill.title = 'Clique para editar seu nome';
  pill.style.cursor = 'pointer';
}

function openNomeModal() {
  document.getElementById('nome-input').value = getDisplayName() || '';
  document.getElementById('modal-nome').classList.add('open');
  setTimeout(() => document.getElementById('nome-input').focus(), 80);
}

document.getElementById('user-email-pill').addEventListener('click', openNomeModal);

document.getElementById('modal-nome').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-nome'))
    document.getElementById('modal-nome').classList.remove('open');
});

// ─ Popup de novidades ───────────────────────────────────────────────────────────
// Troque a versão sempre que houver um novo aviso — quem já dispensou o anterior
// verá o novo automaticamente.
const CHANGELOG_VERSION = '2026-09-02';

function openNovidadesModal() {
  document.getElementById('modal-novidades').classList.add('open');
}

// "Ver depois": só fecha — aparece de novo no próximo acesso.
document.getElementById('btn-novidades-later').addEventListener('click', () => {
  document.getElementById('modal-novidades').classList.remove('open');
});

// "Não mostrar de novo": grava a versão vista — só volta a aparecer na próxima novidade.
document.getElementById('btn-novidades-dismiss').addEventListener('click', async () => {
  document.getElementById('modal-novidades').classList.remove('open');
  try { await markChangelogSeen(CHANGELOG_VERSION); } catch (_) {}
});

document.getElementById('nome-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-nome').click(); }
});

document.getElementById('btn-save-nome').addEventListener('click', async () => {
  const nome = document.getElementById('nome-input').value.trim();
  if (!nome) { toast('Digite seu nome.', true); return; }
  await saveDisplayName(nome);
  _refreshUserPill(auth.currentUser && auth.currentUser.email);
  document.getElementById('modal-nome').classList.remove('open');
  toast(`✅ Nome salvo: ${nome}`);
});

// ─ Init ───────────────────────────────────────────────────────────────────────
buildTipoDropdown();
document.getElementById('f-data').value               = todayISO();
document.getElementById('freeze-date-picker').value   = todayISO();
document.getElementById('today-date-label').textContent = formatDate(todayISO());
