// ── ChopperVerso · Congelações ───────────────────────────────────────────────

// ─ State ──────────────────────────────────────────────────────────────────────
let congPeriod  = 'month';
let _editCongId = null;

const CONG_PERIOD_LABELS = { week: 'Esta Semana', month: 'Este Mês', year: 'Este Ano', all: 'Total' };

// ─ Status helper ──────────────────────────────────────────────────────────────
function _isCongLiberada(c) {
  if (!c.fap) return false;
  return c.foraDoHorario || !!c.dataLiberacao;
}

// ─ Period filter ─────────────────────────────────────────────────────────────
function _filterCong(congelacoes, period) {
  const wb = weekBounds();
  if (period === 'week')  return congelacoes.filter(c => c.dataRealizacao >= wb.start && c.dataRealizacao <= wb.end);
  if (period === 'month') return congelacoes.filter(c => c.dataRealizacao >= monthStart());
  if (period === 'year')  return congelacoes.filter(c => c.dataRealizacao >= yearStart());
  return congelacoes;
}

// ─ Main render ────────────────────────────────────────────────────────────────
async function renderCongelacoes() {
  const all = await getCongelacoes();
  _renderCongStats(all);
  _renderCongList(all);
}

function _renderCongStats(all) {
  const f = _filterCong(all, congPeriod);
  document.getElementById('cong-stat-total').textContent  = f.length;
  document.getElementById('cong-stat-lam').textContent    = f.reduce((s, c) => s + (c.laminas || 0), 0);
  document.getElementById('cong-stat-inhor').textContent  = f.filter(c => !c.foraDoHorario).length;
  document.getElementById('cong-stat-fora').textContent   = f.filter(c =>  c.foraDoHorario).length;
  document.getElementById('cong-stat-aberto').textContent = f.filter(c => !_isCongLiberada(c)).length;
}

function _renderCongList(all) {
  const filtered  = _filterCong(all, congPeriod);
  const container = document.getElementById('cong-list');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">❄️</div><p>Nenhuma congelação neste período.</p></div>';
    return;
  }

  // Group by dataRealizacao
  const byDay = {};
  filtered.forEach(c => {
    const d = c.dataRealizacao || 'sem-data';
    (byDay[d] = byDay[d] || []).push(c);
  });

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  container.innerHTML = sortedDays.map(day => {
    const items    = byDay[day];
    const totalLam = items.reduce((s, c) => s + (c.laminas || 0), 0);
    const aberto   = items.filter(c => !_isCongLiberada(c)).length;
    const dayLabel = day === 'sem-data' ? 'Sem data' : formatDate(day);
    const frozenIcon = isFreezeDay(day) ? ' 🧊' : '';
    const abertoHtml = aberto > 0
      ? ` · <span class="cong-aberto-indicator">${aberto} em aberto</span>`
      : '';
    const plural = items.length !== 1 ? 'ções' : 'ção';

    const itemsHtml = [...items]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map(_renderCongItem)
      .join('');

    return `
      <div class="cong-day-group" id="cong-day-${day}">
        <div class="cong-day-header" onclick="_toggleCongDay('cong-day-${day}')">
          <div class="cong-day-info">
            <span class="cong-day-date">${dayLabel}${frozenIcon}</span>
            <span class="cong-day-meta">${items.length} congela${plural} · ${totalLam} lâm.${abertoHtml}</span>
          </div>
          <span class="cong-day-chevron">▾</span>
        </div>
        <div class="cong-day-body">${itemsHtml}</div>
      </div>`;
  }).join('');
}

function _renderCongItem(c) {
  const liberada    = _isCongLiberada(c);
  const statusBadge = liberada
    ? '<span class="cong-status cong-status-lib">✓ Liberada</span>'
    : '<span class="cong-status cong-status-ab">⏳ Em aberto</span>';
  const fhBadge = c.foraDoHorario
    ? '<span class="cong-fh-badge">🌙 Fora do horário</span>'
    : '';
  const fapHtml = c.fap
    ? `<span class="cong-fap">${c.fap}</span>`
    : '<span class="cong-fap cong-missing">FAP pendente</span>';
  let libHtml = '';
  if (!c.foraDoHorario) {
    libHtml = c.dataLiberacao
      ? `<span class="cong-lib-date">Lib. ${formatDate(c.dataLiberacao)}</span>`
      : '<span class="cong-lib-date cong-missing">Data lib. pendente</span>';
  }

  return `
    <div class="cong-item${liberada ? ' cong-liberada' : ' cong-em-aberto'}">
      <div class="cong-item-main">
        <div class="cong-item-nome">${c.nome}</div>
        <div class="cong-item-meta">
          ${statusBadge}${fhBadge}
          <span class="cong-lam-val">${c.laminas} lâm.</span>
          ${fapHtml}${libHtml}
        </div>
      </div>
      <div class="cong-item-actions">
        <button class="btn btn-edit" onclick="openCongEditModal('${c.id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteCongItem('${c.id}')">✕</button>
      </div>
    </div>`;
}

function _toggleCongDay(groupId) {
  const g = document.getElementById(groupId);
  if (g) g.classList.toggle('collapsed');
}

// ─ FH toggle state helper ────────────────────────────────────────────────────
function _updateCongFHState() {
  const checked  = document.getElementById('cong-fora-horario').checked;
  const libField = document.getElementById('cong-lib-field');
  document.getElementById('cong-fh-label').classList.toggle('active-fh', checked);
  if (libField) libField.style.display = checked ? 'none' : '';
}

function _updateCongEditFHState() {
  const checked  = document.getElementById('ce-fora-horario').checked;
  const libField = document.getElementById('ce-lib-field');
  document.getElementById('ce-fh-label').classList.toggle('active-fh', checked);
  if (libField) libField.style.display = checked ? 'none' : '';
}

// ─ Insert form ────────────────────────────────────────────────────────────────
document.getElementById('cong-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome           = document.getElementById('cong-nome').value.trim();
  const laminas        = parseInt(document.getElementById('cong-laminas').value) || 0;
  const foraDoHorario  = document.getElementById('cong-fora-horario').checked;
  const dataRealizacao = document.getElementById('cong-data-realizacao').value;
  const fap            = document.getElementById('cong-fap').value.trim();
  const dataLiberacao  = document.getElementById('cong-data-liberacao').value;

  if (!nome)           { toast('Informe o nome da congelação.', true); return; }
  if (!dataRealizacao) { toast('Informe a data de realização.', true); return; }

  await addCongelacao({
    nome, laminas, foraDoHorario, dataRealizacao,
    fap:          fap                                    || null,
    dataLiberacao: (!foraDoHorario && dataLiberacao)     ? dataLiberacao : null,
  });

  document.getElementById('cong-nome').value            = '';
  document.getElementById('cong-laminas').value         = '';
  document.getElementById('cong-fora-horario').checked  = false;
  document.getElementById('cong-data-realizacao').value = todayISO();
  document.getElementById('cong-fap').value             = '';
  document.getElementById('cong-data-liberacao').value  = '';
  _updateCongFHState();

  toast('❄️ Congelação registrada!');
  await renderCongelacoes();
});

document.getElementById('cong-fora-horario').addEventListener('change', _updateCongFHState);

// ─ Edit modal ─────────────────────────────────────────────────────────────────
async function openCongEditModal(id) {
  const all  = await getCongelacoes();
  const cong = all.find(c => c.id === id);
  if (!cong) return;
  _editCongId = id;

  document.getElementById('ce-nome').value            = cong.nome           || '';
  document.getElementById('ce-laminas').value         = cong.laminas        ?? 0;
  document.getElementById('ce-fora-horario').checked  = cong.foraDoHorario  || false;
  document.getElementById('ce-data-realizacao').value = cong.dataRealizacao || '';
  document.getElementById('ce-fap').value             = cong.fap            || '';
  document.getElementById('ce-data-liberacao').value  = cong.dataLiberacao  || '';
  _updateCongEditFHState();

  document.getElementById('modal-cong-edit').classList.add('open');
}

document.getElementById('ce-fora-horario').addEventListener('change', _updateCongEditFHState);

document.getElementById('modal-cong-edit-close').addEventListener('click', () => {
  document.getElementById('modal-cong-edit').classList.remove('open');
});
document.getElementById('btn-cong-edit-cancel').addEventListener('click', () => {
  document.getElementById('modal-cong-edit').classList.remove('open');
});
document.getElementById('modal-cong-edit').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-cong-edit'))
    document.getElementById('modal-cong-edit').classList.remove('open');
});

document.getElementById('cong-edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!_editCongId) return;

  const nome           = document.getElementById('ce-nome').value.trim();
  const laminas        = parseInt(document.getElementById('ce-laminas').value) || 0;
  const foraDoHorario  = document.getElementById('ce-fora-horario').checked;
  const dataRealizacao = document.getElementById('ce-data-realizacao').value;
  const fap            = document.getElementById('ce-fap').value.trim();
  const dataLiberacao  = document.getElementById('ce-data-liberacao').value;

  if (!nome)           { toast('Informe o nome da congelação.', true); return; }
  if (!dataRealizacao) { toast('Informe a data de realização.', true); return; }

  await updateCongelacao(_editCongId, {
    nome, laminas, foraDoHorario, dataRealizacao,
    fap:           fap                                  || null,
    dataLiberacao: (!foraDoHorario && dataLiberacao)    ? dataLiberacao : null,
  });

  document.getElementById('modal-cong-edit').classList.remove('open');
  toast('✅ Congelação atualizada!');
  await renderCongelacoes();
});

// ─ Delete ─────────────────────────────────────────────────────────────────────
async function deleteCongItem(id) {
  if (!confirm('Remover esta congelação?')) return;
  await deleteCongelacao(id);
  toast('Congelação removida.');
  await renderCongelacoes();
}

// ─ Period filter buttons ─────────────────────────────────────────────────────
document.querySelectorAll('#cong-period-bar .period-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    congPeriod = btn.dataset.period;
    document.querySelectorAll('#cong-period-bar .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const lbl = document.getElementById('cong-period-label');
    if (lbl) lbl.textContent = CONG_PERIOD_LABELS[congPeriod] || '';
    const all = await getCongelacoes();
    _renderCongStats(all);
    _renderCongList(all);
  });
});

// ─ Init ───────────────────────────────────────────────────────────────────────
document.getElementById('cong-data-realizacao').value = todayISO();
