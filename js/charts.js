// ── ChopperVerso · Charts (Chart.js 4) ──────────────────────────────────────

// ─ Global defaults ────────────────────────────────────────────────────────────
Chart.defaults.color           = '#9fa8da';
Chart.defaults.borderColor     = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family     = 'Nunito, sans-serif';
Chart.defaults.font.size       = 12;
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 14;

// ─ State ─────────────────────────────────────────────────────────────────────
let chartPeriod    = 'week';
let showLaminas    = true;
let showPontos     = true;
let tipoMetric     = 'laminas'; // 'laminas' | 'pontos'

let dailyChart     = null;
let tiposChart     = null;
let tipoBarChart   = null;

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

// ─ Main render entry point ────────────────────────────────────────────────────
async function renderCharts() {
  const all     = await getEntries();
  const entries = filterEntries(all, chartPeriod);
  const s       = calcStats(entries);

  // Update summary cards
  document.getElementById('ch-casos').textContent = s.casos;
  document.getElementById('ch-lam').textContent   = s.laminas;
  document.getElementById('ch-pts').textContent   = s.pontos;

  buildDailyChart(entries);
  buildTiposChart(entries);
  buildTipoBarChart(entries);
}

// ─ Chart 1: Daily production bar chart ───────────────────────────────────────
function buildDailyChart(entries) {
  const grouped = groupByDate(entries);
  const labels  = Object.keys(grouped).sort();
  const lData   = labels.map(d => calcStats(grouped[d]).laminas);
  const pData   = labels.map(d => calcStats(grouped[d]).pontos);
  const fmtLabels = labels.map(d => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  });

  const datasets = [];
  if (showLaminas) datasets.push({
    label: 'Lâminas',
    data: lData,
    backgroundColor: LAM_COLOR,
    borderColor: LAM_BORDER,
    borderWidth: 1.5,
    borderRadius: 4,
  });
  if (showPontos) datasets.push({
    label: 'Pontos',
    data: pData,
    backgroundColor: PTS_COLOR,
    borderColor: PTS_BORDER,
    borderWidth: 1.5,
    borderRadius: 4,
  });

  const ctx = document.getElementById('chart-daily').getContext('2d');

  if (dailyChart) {
    dailyChart.data.labels   = fmtLabels;
    dailyChart.data.datasets = datasets;
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
            title: (items) => {
              const idx = items[0].dataIndex;
              return formatDate(labels[idx]);
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const day = labels[idx];
              const casos = grouped[day]?.length ?? 0;
              return [`Casos: ${casos}`];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, ticks: { maxRotation: 45 } },
        y: { grid: { color: GRID_COLOR }, beginAtZero: true, ticks: { stepSize: 5 } }
      }
    }
  });
}

// ─ Chart 2: Donut by tipo ─────────────────────────────────────────────────────
function buildTiposChart(entries) {
  const byTipo = groupByTipo(entries);
  const labels = Object.keys(byTipo).sort((a, b) => byTipo[b].count - byTipo[a].count);
  const counts = labels.map(t => byTipo[t].count);
  const colors = labels.map(t => TIPO_COLORS[t] || '#888');
  const bgs    = colors.map(c => hexToRgba(c, 0.85));

  const ctx = document.getElementById('chart-tipos').getContext('2d');

  if (tiposChart) {
    tiposChart.data.labels             = labels;
    tiposChart.data.datasets[0].data   = counts;
    tiposChart.data.datasets[0].backgroundColor = bgs;
    tiposChart.data.datasets[0].borderColor     = colors;
    tiposChart.update('none');
    return;
  }

  tiposChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: bgs,
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11 },
            padding: 10,
            generateLabels(chart) {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((s, v) => s + v, 0);
              return data.labels.map((label, i) => ({
                text: `${label} (${data.datasets[0].data[i]})`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: data.datasets[0].borderColor[i],
                lineWidth: 1,
                index: i,
                hidden: false,
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed} casos (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ─ Chart 3: Horizontal bar – metric per tipo ──────────────────────────────────
function buildTipoBarChart(entries) {
  const byTipo = groupByTipo(entries);
  const sorted = Object.entries(byTipo)
    .sort((a, b) => b[1][tipoMetric] - a[1][tipoMetric]);
  const labels = sorted.map(([t]) => t);
  const values = sorted.map(([, v]) => v[tipoMetric]);
  const colors = labels.map(t => hexToRgba(TIPO_COLORS[t] || '#888', 0.8));
  const bords  = labels.map(t => TIPO_COLORS[t] || '#888');
  const metaLabel = tipoMetric === 'laminas' ? 'Lâminas' : 'Pontos';

  const ctx = document.getElementById('chart-tipo-bar').getContext('2d');

  if (tipoBarChart) {
    tipoBarChart.data.labels             = labels;
    tipoBarChart.data.datasets[0].data   = values;
    tipoBarChart.data.datasets[0].backgroundColor = colors;
    tipoBarChart.data.datasets[0].borderColor     = bords;
    tipoBarChart.data.datasets[0].label  = metaLabel;
    tipoBarChart.update('none');
    return;
  }

  tipoBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: metaLabel,
        data: values,
        backgroundColor: colors,
        borderColor: bords,
        borderWidth: 1.5,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) { return ` ${ctx.dataset.label}: ${ctx.parsed.x}`; }
          }
        }
      },
      scales: {
        x: { grid: { color: GRID_COLOR }, beginAtZero: true },
        y: { grid: { color: 'transparent' }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ─ Destroy all charts (needed when re-rendering after period change) ──────────
function destroyCharts() {
  if (dailyChart)  { dailyChart.destroy();  dailyChart   = null; }
  if (tiposChart)  { tiposChart.destroy();  tiposChart   = null; }
  if (tipoBarChart){ tipoBarChart.destroy(); tipoBarChart = null; }
}

// ─ Period buttons (charts tab) ────────────────────────────────────────────────
document.querySelectorAll('#chart-period-bar .period-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    chartPeriod = btn.dataset.period;
    document.querySelectorAll('#chart-period-bar .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    destroyCharts();
    await renderCharts();
  });
});

// ─ Toggle Lâminas / Pontos on daily chart ─────────────────────────────────────
document.getElementById('tog-lam').addEventListener('click', async function() {
  showLaminas = !showLaminas;
  this.classList.toggle('active-lam', showLaminas);
  this.style.opacity = showLaminas ? '1' : '0.45';
  if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
  await renderCharts();
});

document.getElementById('tog-pts').addEventListener('click', async function() {
  showPontos = !showPontos;
  this.classList.toggle('active-pts', showPontos);
  this.style.opacity = showPontos ? '1' : '0.45';
  if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
  await renderCharts();
});

// ─ Toggle tipo metric ─────────────────────────────────────────────────────────
document.getElementById('tipo-metric-lam').addEventListener('click', async function() {
  tipoMetric = 'laminas';
  this.style.background     = 'var(--blue-l)';
  this.style.borderColor    = 'var(--blue-l)';
  this.style.color          = '#fff';
  const ptBtn = document.getElementById('tipo-metric-pts');
  ptBtn.style.background    = '';
  ptBtn.style.borderColor   = '';
  ptBtn.style.color         = '';
  if (tipoBarChart) { tipoBarChart.destroy(); tipoBarChart = null; }
  await renderCharts();
});

document.getElementById('tipo-metric-pts').addEventListener('click', async function() {
  tipoMetric = 'pontos';
  this.style.background     = 'var(--primary)';
  this.style.borderColor    = 'var(--primary)';
  this.style.color          = '#fff';
  const lamBtn = document.getElementById('tipo-metric-lam');
  lamBtn.style.background   = '';
  lamBtn.style.borderColor  = '';
  lamBtn.style.color        = '';
  if (tipoBarChart) { tipoBarChart.destroy(); tipoBarChart = null; }
  await renderCharts();
});
