// ── ChopperVerso · Charts (Chart.js 4) ──────────────────────────────────────

// ─ Global defaults ────────────────────────────────────────────────────────────
Chart.defaults.color           = '#9fa8da';
Chart.defaults.borderColor     = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family     = 'Nunito, sans-serif';
Chart.defaults.font.size       = 12;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 14;

// ─ Constants ──────────────────────────────────────────────────────────────────
const MONTHS_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─ State ─────────────────────────────────────────────────────────────────────
let chartPeriod  = 'week';
let showLaminas  = false;
let showPontos   = true;
let tipoMetric   = 'laminas';
let dailyGroupBy    = 'day';   // 'day' | 'week' | 'month'
let dailyPeriod      = 'month'; // período próprio do gráfico "Produção por Dia"
let avgGroupBy        = 'month'; // 'week' | 'month' — gráfico "Média de Pontos"
let filterSegundaAss = false;

let dailyChart   = null;
let avgPtsChart  = null;
let tipoBarChart = null;

const CARD_BG = '#121728'; // = var(--card), canvas não resolve custom properties

// ─ Colour helpers ─────────────────────────────────────────────────────────────
const LAM_COLOR  = 'rgba(30,136,229,0.85)';
const LAM_BORDER = '#1e88e5';
const PTS_COLOR  = 'rgba(198,40,40,0.85)';
const PTS_BORDER = '#c62828';
const GRID_COLOR = 'rgba(255,255,255,0.06)';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─ Grouping helpers ───────────────────────────────────────────────────────────
function _isoWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

function _groupEntries(entries, groupBy) {
  if (groupBy === 'day') return groupByDate(entries);
  const map = {};
  entries.forEach(e => {
    let key;
    if (groupBy === 'week') {
      const d = new Date(e.data + 'T12:00:00');
      key = `${d.getFullYear()}-W${String(_isoWeek(d)).padStart(2,'0')}`;
    } else {
      key = e.data.substring(0, 7);
    }
    (map[key] = map[key] || []).push(e);
  });
  return map;
}

function _fmtGroupLabel(key, groupBy) {
  if (groupBy === 'day') {
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  }
  if (groupBy === 'week') {
    const [yr, wStr] = key.split('-W');
    const week = parseInt(wStr);
    const jan4 = new Date(parseInt(yr), 0, 4);
    const dow  = jan4.getDay() || 7;
    const mon  = new Date(jan4);
    mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
    return `${String(mon.getDate()).padStart(2,'0')}/${String(mon.getMonth()+1).padStart(2,'0')}`;
  }
  const [yr, m] = key.split('-');
  return `${MONTHS_SHORT[parseInt(m)-1]}/${yr.slice(2)}`;
}

function _fmtGroupTitle(key, groupBy, freezes) {
  if (groupBy === 'day')
    return freezes.includes(key) ? `${formatDate(key)} 🧊 Congelação` : formatDate(key);
  if (groupBy === 'week')
    return `Semana de ${_fmtGroupLabel(key, 'week')}`;
  const [yr, m] = key.split('-');
  return `${MONTHS_PT[parseInt(m)-1]} ${yr}`;
}

// ─ Faixas de mês no gráfico de Produção por Dia (visual + legenda) ─────────────
function _monthKeyOf(key, groupBy) {
  if (groupBy === 'day') return key.substring(0, 7);
  const [yr, wStr] = key.split('-W');
  const week = parseInt(wStr);
  const jan4 = new Date(parseInt(yr), 0, 4);
  const dow  = jan4.getDay() || 7;
  const mon  = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}`;
}

function _monthBandLabel(monthKey) {
  const [yr, m] = monthKey.split('-');
  return `${MONTHS_SHORT[parseInt(m) - 1]}/${yr.slice(2)}`;
}

function _computeMonthBands(sortedKeys, groupBy) {
  if (groupBy === 'month' || sortedKeys.length === 0) return [];
  const bands = [];
  let curMonth = null, fromIndex = 0;
  sortedKeys.forEach((k, i) => {
    const mk = _monthKeyOf(k, groupBy);
    if (mk !== curMonth) {
      if (curMonth !== null) bands.push({ fromIndex, toIndex: i - 1, label: _monthBandLabel(curMonth) });
      curMonth = mk; fromIndex = i;
    }
  });
  bands.push({ fromIndex, toIndex: sortedKeys.length - 1, label: _monthBandLabel(curMonth) });
  return bands;
}

const MONTH_BAND_COLORS = [
  'rgba(30,136,229,0.08)', 'rgba(198,40,40,0.08)', 'rgba(76,175,80,0.08)',
  'rgba(255,213,79,0.08)', 'rgba(168,85,247,0.08)', 'rgba(45,212,191,0.08)',
];

// Desenha faixas de fundo alternadas por mês + rótulo (quando cabe) atrás das
// barras, pra facilitar ver onde cada mês começa/termina nos gráficos de dia/semana.
const monthBandsPlugin = {
  id: 'monthBands',
  beforeDatasetsDraw(chart) {
    const bands = chart.$monthBands;
    if (!bands || !bands.length) return;
    const { ctx, chartArea, scales: { x } } = chart;
    if (!chartArea) return;
    const half = Math.abs(x.getPixelForValue(1) - x.getPixelForValue(0)) / 2 || 0;
    ctx.save();
    bands.forEach((band, i) => {
      const x0 = x.getPixelForValue(band.fromIndex) - half;
      const x1 = x.getPixelForValue(band.toIndex)   + half;
      ctx.fillStyle = MONTH_BAND_COLORS[i % MONTH_BAND_COLORS.length];
      ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.bottom - chartArea.top);
    });
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const bands = chart.$monthBands;
    if (!bands || !bands.length) return;
    const { ctx, chartArea, scales: { x } } = chart;
    if (!chartArea) return;
    const half = Math.abs(x.getPixelForValue(1) - x.getPixelForValue(0)) / 2 || 0;
    ctx.save();
    ctx.font = '700 10px Nunito, sans-serif';
    ctx.fillStyle = '#5c6491';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    bands.forEach(band => {
      const x0 = x.getPixelForValue(band.fromIndex) - half;
      const x1 = x.getPixelForValue(band.toIndex)   + half;
      const w  = x1 - x0;
      if (w < 26) return; // faixa estreita demais pra legenda — a cor sozinha já ajuda
      ctx.fillText(band.label, (x0 + x1) / 2, chartArea.top + 4);
    });
    ctx.restore();
  }
};
Chart.register(monthBandsPlugin);

// ─ Group button state ─────────────────────────────────────────────────────────
function _updateGroupBtns() {
  const dayBtn   = document.getElementById('daily-group-day');
  const weekBtn  = document.getElementById('daily-group-week');
  const monthBtn = document.getElementById('daily-group-month');
  if (!dayBtn) return;

  const canWeek  = dailyPeriod !== 'week';
  const canMonth = dailyPeriod === 'year' || dailyPeriod === 'all';

  weekBtn.disabled  = !canWeek;
  monthBtn.disabled = !canMonth;
  weekBtn.style.opacity  = canWeek  ? '1' : '0.3';
  monthBtn.style.opacity = canMonth ? '1' : '0.3';

  if (!canWeek  && dailyGroupBy === 'week')  dailyGroupBy = 'day';
  if (!canMonth && dailyGroupBy === 'month') dailyGroupBy = 'day';

  [dayBtn, weekBtn, monthBtn].forEach(btn => {
    const g = btn.id.replace('daily-group-', '');
    btn.classList.toggle('active-group', g === dailyGroupBy);
  });
}

// ─ Filtered entries helper ────────────────────────────────────────────────────
async function _getFilteredEntries() {
  const all = await getEntries();
  let entries = filterEntries(all, chartPeriod);
  if (filterSegundaAss) entries = entries.filter(e => e.segundaAssinatura);
  return entries;
}

// Período independente do gráfico "Produção por Dia" (não segue o filtro global)
async function _getDailyFilteredEntries() {
  const all = await getEntries();
  let entries = filterEntries(all, dailyPeriod);
  if (filterSegundaAss) entries = entries.filter(e => e.segundaAssinatura);
  return entries;
}

function _updateDailyPeriodBtns() {
  document.querySelectorAll('#daily-period-bar .chart-toggle').forEach(btn => {
    btn.classList.toggle('active-group', btn.dataset.period === dailyPeriod);
  });
}

// ─ Main render entry point ────────────────────────────────────────────────────
async function renderCharts() {
  const all     = await getEntries();
  const entries = await _getFilteredEntries();
  const s       = calcStats(entries);

  document.getElementById('ch-casos').textContent = s.casos;
  document.getElementById('ch-lam').textContent   = s.laminas;
  document.getElementById('ch-pts').textContent   = s.pontos;

  const togBtn  = document.getElementById('tog-segunda-ass');
  const infoEl  = document.getElementById('segunda-ass-info');
  if (togBtn) togBtn.classList.toggle('active-2ass', filterSegundaAss);
  if (infoEl) {
    const total = filterEntries(all, chartPeriod).filter(e => e.segundaAssinatura).length;
    infoEl.textContent = total > 0 ? `${total} caso${total !== 1 ? 's' : ''} de 2ª ass. no período` : '';
  }

  _updateGroupBtns();
  _updateDailyPeriodBtns();
  buildDailyChart(await _getDailyFilteredEntries());
  buildAvgPointsChart(all);
  buildTipoTreemap(entries);
}

// ─ Chart 1: Daily production bar (with grouping) ──────────────────────────────
function buildDailyChart(entries) {
  const grouped    = _groupEntries(entries, dailyGroupBy);
  const sortedKeys = Object.keys(grouped).sort();
  const freezes    = getFreezeDays();
  const fmtLabels  = sortedKeys.map(k => _fmtGroupLabel(k, dailyGroupBy));
  const lData      = sortedKeys.map(k => calcStats(grouped[k]).laminas);
  const pData      = sortedKeys.map(k => calcStats(grouped[k]).pontos);
  const monthBands = _computeMonthBands(sortedKeys, dailyGroupBy);

  // Quanto mais barras, mais finas — e além de um certo ponto os rótulos do
  // eixo X somem, ficando visíveis só ao passar o mouse (via tooltip).
  const tooManyForLabels = sortedKeys.length > 25;

  const datasets = [];
  if (showLaminas) datasets.push({
    label: 'Lâminas', data: lData,
    backgroundColor: LAM_COLOR, borderColor: LAM_BORDER,
    borderWidth: 1.5, borderRadius: 4,
  });
  if (showPontos) datasets.push({
    label: 'Pontos', data: pData,
    backgroundColor: PTS_COLOR, borderColor: PTS_BORDER,
    borderWidth: 1.5, borderRadius: 4,
  });
  datasets.forEach(ds => { ds.categoryPercentage = 0.82; ds.barPercentage = 0.9; });

  const ctx = document.getElementById('chart-daily').getContext('2d');

  if (dailyChart) {
    dailyChart.data.labels   = fmtLabels;
    dailyChart.data.datasets = datasets;
    dailyChart.options.scales.x.ticks.display = !tooManyForLabels;
    dailyChart.$monthBands = monthBands;
    dailyChart.update('none');
    return;
  }

  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: fmtLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          callbacks: {
            title: (items) => _fmtGroupTitle(sortedKeys[items[0].dataIndex], dailyGroupBy, freezes),
            afterBody: (items) => {
              const key        = sortedKeys[items[0].dataIndex];
              const grp        = grouped[key] || [];
              const s          = calcStats(grp);
              const uniqueDays = new Set(grp.map(e => e.data)).size;
              const lines      = [`Casos: ${grp.length}`];
              if (dailyGroupBy !== 'day' && uniqueDays > 0) {
                lines.push(`Dias trabalhados: ${uniqueDays}`);
                const avgPts = (s.pontos / uniqueDays).toFixed(1);
                lines.push(`Média pontos/dia: ${avgPts}`);
              }
              return lines;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { maxRotation: 45, display: !tooManyForLabels } },
        y: { grid: { color: GRID_COLOR }, beginAtZero: true, ticks: { stepSize: 5 } }
      }
    }
  });
  dailyChart.$monthBands = monthBands;
}

// ─ Chart 2: Média de pontos por caso (semana ou mês) ───────────────────────────
function buildAvgPointsChart(allEntries) {
  const N = avgGroupBy === 'week' ? 12 : 12; // últimas 12 semanas ou 12 meses
  const grouped = _groupEntries(allEntries, avgGroupBy);
  let sortedKeys = Object.keys(grouped).sort();
  if (sortedKeys.length > N) sortedKeys = sortedKeys.slice(-N);

  const fmtLabels = sortedKeys.map(k => _fmtGroupLabel(k, avgGroupBy));
  const avgData   = sortedKeys.map(k => {
    const grp = grouped[k];
    if (!grp.length) return 0;
    const uniqueDays = new Set(grp.map(e => e.data)).size;
    return uniqueDays ? +(calcStats(grp).pontos / uniqueDays).toFixed(2) : 0;
  });

  const ctx = document.getElementById('chart-avgpts').getContext('2d');

  if (avgPtsChart) {
    avgPtsChart.data.labels           = fmtLabels;
    avgPtsChart.data.datasets[0].data = avgData;
    avgPtsChart.update('none');
    return;
  }

  avgPtsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: fmtLabels,
      datasets: [{
        label: 'Média de pontos/dia', data: avgData,
        backgroundColor: PTS_COLOR, borderColor: PTS_BORDER,
        borderWidth: 1.5, borderRadius: 4, categoryPercentage: 0.7, barPercentage: 0.9,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => _fmtGroupTitle(sortedKeys[items[0].dataIndex], avgGroupBy, []),
            label: (item) => ` Média: ${item.parsed.y} pts/dia trabalhado`,
          }
        }
      },
      scales: {
        x: { grid: { color: GRID_COLOR } },
        y: {
          grid: { color: GRID_COLOR }, beginAtZero: true,
          title: { display: true, text: 'Pontos por dia trabalhado', color: '#5c6491', font: { size: 11 } }
        }
      }
    }
  });
}

// ─ Chart 3: Treemap – tipos mais frequentes viram quadrados maiores ───────────
function buildTipoTreemap(entries) {
  const byTipo = groupByTipo(entries);
  const treeData = Object.entries(byTipo)
    .map(([tipo, v]) => ({ tipo, value: v[tipoMetric] }))
    .filter(d => d.value > 0);
  const metaLabel = tipoMetric === 'laminas' ? 'Lâminas' : 'Pontos';

  const ctx = document.getElementById('chart-tipo-bar').getContext('2d');

  if (tipoBarChart) {
    tipoBarChart.data.datasets[0].tree = treeData;
    tipoBarChart.update('none');
    return;
  }

  tipoBarChart = new Chart(ctx, {
    type: 'treemap',
    data: {
      datasets: [{
        tree: treeData,
        key: 'value',
        groups: ['tipo'],
        spacing: 1.5,
        borderWidth: 2,
        borderColor: CARD_BG,
        backgroundColor(c) {
          if (c.type !== 'data') return 'transparent';
          return hexToRgba(TIPO_COLORS[c.raw._data.tipo] || '#888', 0.85);
        },
        labels: {
          display: true,
          align: 'center',
          overflow: 'hidden', // some o texto (fica só a cor) quando não cabe no quadrado — nome/valor continuam no hover
          formatter(c) {
            if (c.type !== 'data') return '';
            return [c.raw._data.tipo, String(c.raw._data.value)];
          },
          color: '#fff',
          font: { size: 11, weight: '700' },
        },
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.raw?._data?.tipo || '',
            label: (item) => ` ${metaLabel}: ${item.raw._data.value}`,
          }
        }
      }
    }
  });
}

// ─ Destroy all charts ─────────────────────────────────────────────────────────
function destroyCharts() {
  if (dailyChart)  { dailyChart.destroy();  dailyChart  = null; }
  if (avgPtsChart) { avgPtsChart.destroy(); avgPtsChart = null; }
  if (tipoBarChart){ tipoBarChart.destroy(); tipoBarChart = null; }
}

// ─ Period buttons ─────────────────────────────────────────────────────────────
document.querySelectorAll('#chart-period-bar .period-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    chartPeriod = btn.dataset.period;
    document.querySelectorAll('#chart-period-bar .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    destroyCharts();
    await renderCharts();
  });
});

// ─ Daily group buttons ────────────────────────────────────────────────────────
['day', 'week', 'month'].forEach(g => {
  const btn = document.getElementById(`daily-group-${g}`);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    dailyGroupBy = g;
    _updateGroupBtns();
    if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
    buildDailyChart(await _getDailyFilteredEntries());
  });
});

// ─ Período próprio do gráfico "Produção por Dia" ───────────────────────────────
document.querySelectorAll('#daily-period-bar .chart-toggle').forEach(btn => {
  btn.addEventListener('click', async () => {
    dailyPeriod = btn.dataset.period;
    _updateDailyPeriodBtns();
    _updateGroupBtns();
    if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
    buildDailyChart(await _getDailyFilteredEntries());
  });
});

// ─ Toggle Lâminas / Pontos ────────────────────────────────────────────────────
document.getElementById('tog-lam').addEventListener('click', async function () {
  showLaminas = !showLaminas;
  this.classList.toggle('active-lam', showLaminas);
  this.style.opacity = showLaminas ? '1' : '0.45';
  if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
  buildDailyChart(await _getDailyFilteredEntries());
});

document.getElementById('tog-pts').addEventListener('click', async function () {
  showPontos = !showPontos;
  this.classList.toggle('active-pts', showPontos);
  this.style.opacity = showPontos ? '1' : '0.45';
  if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
  buildDailyChart(await _getDailyFilteredEntries());
});

// ─ Toggle tipo metric ─────────────────────────────────────────────────────────
document.getElementById('tipo-metric-lam').addEventListener('click', async function () {
  tipoMetric = 'laminas';
  this.style.background = 'var(--blue-l)'; this.style.borderColor = 'var(--blue-l)'; this.style.color = '#fff';
  const ptBtn = document.getElementById('tipo-metric-pts');
  ptBtn.style.background = ''; ptBtn.style.borderColor = ''; ptBtn.style.color = '';
  if (tipoBarChart) { tipoBarChart.destroy(); tipoBarChart = null; }
  buildTipoTreemap(await _getFilteredEntries());
});

document.getElementById('tipo-metric-pts').addEventListener('click', async function () {
  tipoMetric = 'pontos';
  this.style.background = 'var(--primary)'; this.style.borderColor = 'var(--primary)'; this.style.color = '#fff';
  const lamBtn = document.getElementById('tipo-metric-lam');
  lamBtn.style.background = ''; lamBtn.style.borderColor = ''; lamBtn.style.color = '';
  if (tipoBarChart) { tipoBarChart.destroy(); tipoBarChart = null; }
  buildTipoTreemap(await _getFilteredEntries());
});

// ─ Segunda Assinatura filter ──────────────────────────────────────────────────
document.getElementById('tog-segunda-ass').addEventListener('click', async () => {
  filterSegundaAss = !filterSegundaAss;
  destroyCharts();
  await renderCharts();
});

// ─ Média de Pontos: semana / mês ────────────────────────────────────────────────
['week', 'month'].forEach(g => {
  const btn = document.getElementById(`avg-group-${g}`);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    avgGroupBy = g;
    document.getElementById('avg-group-week').classList.toggle('active-group', g === 'week');
    document.getElementById('avg-group-month').classList.toggle('active-group', g === 'month');
    if (avgPtsChart) { avgPtsChart.destroy(); avgPtsChart = null; }
    buildAvgPointsChart(await getEntries());
  });
});
