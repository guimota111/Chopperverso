// ── ChopperVerso ─ Data Layer ──────────────────────────────────────────────
// All persistence via localStorage. Key: 'chopperverso_v1'

const STORAGE_KEY = 'chopperverso_v1';

const TIPOS = [
  'bx gas', 'Bx esof', 'bx duod', 'bx colon',
  'vesícula não neoplásica', 'apêndice não neoplásico',
  'colectomia não neoplásica', 'colectomia neoplásica',
  'hemorroidas', 'pele lesão', 'gastrectomia não neoplásica',
  'congelação fora do horário', 'ihq', 'peritônio',
  'enterectomia não neoplásica'
];

const TIPO_COLORS = {
  'bx gas':                      '#F97316',
  'Bx esof':                     '#EAB308',
  'bx duod':                     '#94A3B8',
  'bx colon':                    '#EF4444',
  'vesícula não neoplásica':     '#3B82F6',
  'apêndice não neoplásico':     '#B45309',
  'colectomia não neoplásica':   '#6B7280',
  'colectomia neoplásica':       '#7C3AED',
  'hemorroidas':                 '#EC4899',
  'pele lesão':                  '#F472B6',
  'gastrectomia não neoplásica': '#22C55E',
  'congelação fora do horário':  '#9CA3AF',
  'ihq':                         '#A855F7',
  'peritônio':                   '#DC2626',
  'enterectomia não neoplásica': '#8B5CF6'
};

// ─ Seed data (exported from Notion – April 2026) ────────────────────────────
const SEED_ENTRIES = [
  // ── 10 Abr ──────────────────────────────────────────────────────────────
  {id:'n001',fap:'8035.0838.0347',data:'2026-04-10',tipos:['bx gas'],laminas:8,pontos:5},
  {id:'n002',fap:'8772.0040.0009',data:'2026-04-10',tipos:['bx colon'],laminas:3,pontos:3},
  {id:'n003',fap:'8772.0040.0016',data:'2026-04-10',tipos:['bx colon'],laminas:2,pontos:3},
  {id:'n004',fap:'803508369731',  data:'2026-04-10',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n005',fap:'9326.0026.4320',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n006',fap:'8054.0019.3018',data:'2026-04-10',tipos:['bx colon'],laminas:2,pontos:3},
  {id:'n007',fap:'9345.0023.5844',data:'2026-04-10',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n008',fap:'8041.0026.3007',data:'2026-04-10',tipos:['bx colon'],laminas:5,pontos:6},
  {id:'n009',fap:'8063.0073.4707',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n010',fap:'8035.0836.6013',data:'2026-04-10',tipos:['colectomia neoplásica'],laminas:41,pontos:15},
  {id:'n011',fap:'8010.0075.1856',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n012',fap:'8013.0025.8130',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n013',fap:'8013.0025.8147',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n014',fap:'8010.0075.1870',data:'2026-04-10',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n015',fap:'970303588251',  data:'2026-04-10',tipos:['pele lesão'],laminas:1,pontos:3},
  {id:'n016',fap:'8044.0629.1575',data:'2026-04-10',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n017',fap:'9151.0039.4759',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n018',fap:'9703.0359.8762',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:2},
  {id:'n019',fap:'8044.0628.7776',data:'2026-04-10',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n020',fap:'8049.0057.1944',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n021',fap:'9345.0023.5950',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n022',fap:'8036.0029.4696',data:'2026-04-10',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n023',fap:'8775.0056.6139',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n024',fap:'8044.0629.3111',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n025',fap:'9136.0026.3933',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n026',fap:'8042.0444.1462',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n027',fap:'9687.0022.8238',data:'2026-04-10',tipos:['bx gas'],laminas:1,pontos:2},
  {id:'n028',fap:'8008.0027.8877',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n029',fap:'2798.0033.5499',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n030',fap:'8043.0552.1391',data:'2026-04-10',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n031',fap:'8001.0040.5751',data:'2026-04-10',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n032',fap:'9136.0026.3858',data:'2026-04-10',tipos:['bx gas','bx colon'],laminas:11,pontos:8},
  // ── 24 Abr ──────────────────────────────────────────────────────────────
  {id:'n033',fap:'8829.0664.2073',data:'2026-04-24',tipos:['vesícula não neoplásica'],laminas:2,pontos:2},
  {id:'n034',fap:'8035.0842.2702',data:'2026-04-24',tipos:['vesícula não neoplásica'],laminas:2,pontos:2},
  {id:'n035',fap:'8012.0112.6125',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n036',fap:'8059.0032.6244',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n037',fap:'9114.0049.0696',data:'2026-04-24',tipos:['bx gas'],laminas:4,pontos:5},
  {id:'n038',fap:'8043.0557.2553',data:'2026-04-24',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n039',fap:'8043.0557.1600',data:'2026-04-24',tipos:['apêndice não neoplásico'],laminas:1,pontos:2},
  {id:'n040',fap:'8829.0663.8847',data:'2026-04-24',tipos:['vesícula não neoplásica'],laminas:1,pontos:2},
  {id:'n041',fap:'8043.0557.2485',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n042',fap:'9220.0032.9309',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n043',fap:'8058.0159.0591',data:'2026-04-24',tipos:['bx colon'],laminas:2,pontos:3},
  {id:'n044',fap:'8043.0557.9040',data:'2026-04-24',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n045',fap:'8001.0040.8745',data:'2026-04-24',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n046',fap:'8044.0635.6878',data:'2026-04-24',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n047',fap:'8077.0070.0224',data:'2026-04-24',tipos:['bx gas'],laminas:1,pontos:2},
  {id:'n048',fap:'9326.0026.6416',data:'2026-04-24',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n049',fap:'970.303.631.964',data:'2026-04-24',tipos:['enterectomia não neoplásica'],laminas:4,pontos:11},
  {id:'n050',fap:'970.303.631.933',data:'2026-04-24',tipos:['colectomia neoplásica'],laminas:32,pontos:15},
  {id:'n051',fap:'9703.0366.8786',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n052',fap:'970303484379',  data:'2026-04-24',tipos:['bx gas'],laminas:4,pontos:2},
  {id:'n053',fap:'8042.0448.0249',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n054',fap:'8005.0028.6882',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n055',fap:'8012.0112.5616',data:'2026-04-24',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n056',fap:'8049.0057.6161',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n057',fap:'8013.0026.0027',data:'2026-04-24',tipos:['bx gas'],laminas:3,pontos:3},
  {id:'n058',fap:'8058.0159.1239',data:'2026-04-24',tipos:['bx gas'],laminas:1,pontos:2},
  {id:'n059',fap:'9451.0037.6363',data:'2026-04-24',tipos:['vesícula não neoplásica'],laminas:1,pontos:2},
  {id:'n060',fap:'8043.0557.2812',data:'2026-04-24',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n061',fap:'8050.0053.7021',data:'2026-04-24',tipos:['apêndice não neoplásico'],laminas:1,pontos:2},
  {id:'n062',fap:'9703.0363.1971',data:'2026-04-24',tipos:['vesícula não neoplásica'],laminas:4,pontos:2},
  {id:'n063',fap:'8063.0074.1736',data:'2026-04-24',tipos:['bx colon'],laminas:2,pontos:3},
  {id:'n064',fap:'9114.0049.0498',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n065',fap:'8043.0556.7726',data:'2026-04-24',tipos:['bx gas'],laminas:2,pontos:2},
  // ── 27 Abr ──────────────────────────────────────────────────────────────
  {id:'n066',fap:'9703.0370.3425',data:'2026-04-27',tipos:['bx gas'],laminas:1,pontos:2},
  {id:'n067',fap:'9703.0371.0003',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n068',fap:'9700.0353.3780',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n069',fap:'9700.0353.4565',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n070',fap:'9703.0371.2229',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n071',fap:'9703.0371.2168',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n072',fap:'9703.0371.6357',data:'2026-04-27',tipos:['bx gas','bx duod'],laminas:3,pontos:3},
  {id:'n073',fap:'9703.0371.7668',data:'2026-04-27',tipos:['vesícula não neoplásica'],laminas:1,pontos:2},
  {id:'n074',fap:'9703.0371.2632',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n075',fap:'9700.0353.4862',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n076',fap:'9703.0367.4428',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n077',fap:'9703.0370.5337',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n078',fap:'9703.0371.7415',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n079',fap:'9703.0370.2305',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n080',fap:'9703.0369.9667',data:'2026-04-27',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n081',fap:'9703.0370.2237',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n082',fap:'9703.0369.9704',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n083',fap:'9703.0370.2244',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n084',fap:'9703.0368.9576',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n085',fap:'9703.0369.5171',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n086',fap:'9703.0369.5034',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n087',fap:'9703.0366.9110',data:'2026-04-27',tipos:['bx colon'],laminas:1,pontos:2},
  {id:'n088',fap:'9703.0370.3128',data:'2026-04-27',tipos:['bx gas'],laminas:4,pontos:3},
  {id:'n089',fap:'9703.0371.0973',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n090',fap:'9703.0370.3432',data:'2026-04-27',tipos:['bx gas'],laminas:2,pontos:2},
  {id:'n091',fap:'9703.0370.0301',data:'2026-04-27',tipos:['bx colon'],laminas:2,pontos:2},
  {id:'n092',fap:'9703.0371.0874',data:'2026-04-27',tipos:['bx colon'],laminas:2,pontos:3},
  {id:'n093',fap:'9703.0364.1673',data:'2026-04-27',tipos:['colectomia neoplásica'],laminas:19,pontos:13},
  {id:'n094',fap:'8829.0664.4015',data:'2026-04-27',tipos:['vesícula não neoplásica'],laminas:1,pontos:2},
  {id:'n095',fap:'8035.0841.7548',data:'2026-04-27',tipos:['colectomia não neoplásica'],laminas:15,pontos:7},
  {id:'n096',fap:'9703.0374.2509',data:'2026-04-27',tipos:['ihq'],laminas:5,pontos:5},
  {id:'n097',fap:'8047.0042.5096',data:'2026-04-27',tipos:['vesícula não neoplásica'],laminas:5,pontos:2},
  {id:'n098',fap:'9703.0366.8335',data:'2026-04-27',tipos:['vesícula não neoplásica'],laminas:4,pontos:2},
  {id:'n099',fap:'8013.0026.0034',data:'2026-04-27',tipos:['bx gas','Bx esof'],laminas:10,pontos:6},
];

// ─ Storage ─────────────────────────────────────────────────────────────────
function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function _save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function _init() {
  const data = _load();
  if (data) return data;
  const fresh = { version: 1, entries: SEED_ENTRIES.map(e => ({ ...e, createdAt: e.data + 'T08:00:00Z' })), congelacoes: [] };
  _save(fresh);
  return fresh;
}

function _uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─ Entries CRUD ─────────────────────────────────────────────────────────────
function getEntries() { return _init().entries; }

function addEntry(entry) {
  const data = _init();
  data.entries.unshift({ ...entry, id: _uid(), createdAt: new Date().toISOString() });
  _save(data);
}

function deleteEntry(id) {
  const data = _init();
  data.entries = data.entries.filter(e => e.id !== id);
  _save(data);
}

// ─ Congelações CRUD ─────────────────────────────────────────────────────────
function getCongelacoes() { return _init().congelacoes; }

function addCongelacao(cong) {
  const data = _init();
  data.congelacoes.unshift({ ...cong, id: _uid(), createdAt: new Date().toISOString() });
  _save(data);
}

function deleteCongelacao(id) {
  const data = _init();
  data.congelacoes = data.congelacoes.filter(c => c.id !== id);
  _save(data);
}

// ─ Date helpers ─────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekBounds() {
  const d = new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d); mon.setDate(d.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

// ─ Filters ──────────────────────────────────────────────────────────────────
function filterEntries(entries, period) {
  const today = todayISO();
  const wb    = weekBounds();
  if (period === 'today') return entries.filter(e => e.data === today);
  if (period === 'week')  return entries.filter(e => e.data >= wb.start && e.data <= wb.end);
  if (period === 'month') return entries.filter(e => e.data >= monthStart());
  if (period === 'year')  return entries.filter(e => e.data >= yearStart());
  return entries;
}

// ─ Aggregations ─────────────────────────────────────────────────────────────
function calcStats(entries) {
  return {
    casos:   entries.length,
    laminas: entries.reduce((s, e) => s + (e.laminas || 0), 0),
    pontos:  entries.reduce((s, e) => s + (e.pontos  || 0), 0),
  };
}

function groupByDate(entries) {
  const map = {};
  [...entries].sort((a, b) => a.data.localeCompare(b.data)).forEach(e => {
    (map[e.data] = map[e.data] || []).push(e);
  });
  return map;
}

function groupByTipo(entries) {
  const map = {};
  entries.forEach(e => {
    (e.tipos || []).forEach(t => {
      if (!map[t]) map[t] = { count: 0, laminas: 0, pontos: 0 };
      map[t].count++;
      map[t].laminas += e.laminas || 0;
      map[t].pontos  += e.pontos  || 0;
    });
  });
  return map;
}

// ─ Export / Import ───────────────────────────────────────────────────────────
function exportJSON() {
  return JSON.stringify(_init(), null, 2);
}

function importJSON(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.entries) throw new Error('invalid');
    _save(parsed);
    return true;
  } catch (_) {
    return false;
  }
}

function resetToSeed() {
  localStorage.removeItem(STORAGE_KEY);
  _init();
}
