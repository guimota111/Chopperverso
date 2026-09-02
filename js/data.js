// ── ChopperVerso – Data Layer (Firestore) ─────────────────────────────────────
// Persistência via Firebase Firestore. Estrutura: users/{uid}/entries  &  users/{uid}/meta

let TIPOS = [
  'bx gas', 'Bx esof', 'bx duod', 'bx colon',
  'vesícula não neoplásica', 'apêndice não neoplásico',
  'colectomia não neoplásica', 'colectomia neoplásica',
  'hemorroidas', 'pele lesão', 'gastrectomia não neoplásica',
  'congelação fora do horário', 'ihq', 'peritônio',
  'enterectomia não neoplásica', 'Congelação'
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
  'enterectomia não neoplásica': '#8B5CF6',
  'Congelação':                  '#0EA5E9'
};

// Ordem padrão dos tipos-base (snapshot antes de qualquer personalização do usuário)
const TIPOS_BASE_ORDER = [...TIPOS];

// ─ Seed data (exportado do Notion – Abril 2026) ──────────────────────────────
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

// ─ Firestore helpers ──────────────────────────────────────────────────────────
let _currentUid     = null;
let _entriesCache   = null;
let _congCache      = null;
let _entriesVersion = 0;
let _congVersion    = 0;
let _metaUnsub      = null;
const _CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // rede de segurança: força releitura completa mesmo se a versão não mudar (o controle de versão já cobre mudanças reais — isso é só um limite pra não confiar em cache "pra sempre")

function setCurrentUid(uid) {
  if (_metaUnsub) { _metaUnsub(); _metaUnsub = null; }
  _currentUid = uid; _entriesCache = null; _congCache = null; _observations = {}; _webhookToken = null; _displayName = ''; _changelogSeen = null;
  _entriesVersion = 0; _congVersion = 0; _directoryCache = null;
}

let _customTipos  = [];
let _freezeDays   = [];   // ISO date strings: ['2026-04-10', ...]
let _customFields = [];   // [{name, type}]
let _observations = {};   // keyed by ISO date: { '2026-05-07': { casosInicio, casosFim, texto } }
let _webhookToken = null;
let _displayName  = '';    // nome de exibição do usuário logado
let _changelogSeen = null; // versão do aviso de novidades que o usuário já dispensou

function _metaRef() {
  return db.collection('users').doc(_currentUid).collection('meta').doc('config');
}

async function loadCustomTipos() {
  try {
    const doc  = await _metaRef().get();
    const data = doc.exists ? doc.data() : {};
    _customTipos  = data.customTipos  || [];
    _freezeDays   = data.freezeDays   || [];
    _customFields = data.customFields || [];
    _observations = data.observations || {};
    _webhookToken = data.webhookToken || null;
    _displayName   = data.displayName   || '';
    _changelogSeen = data.changelogSeen || null;
    _entriesVersion = data.entriesVersion || 0;
    _congVersion    = data.congVersion    || 0;
    _customTipos.forEach(t => { TIPO_COLORS[t.name] = t.color; });

    // Monta a lista efetiva de tipos a partir da ordem salva pelo usuário.
    // Primeira vez (sem tiposOrder): usa base + customizados na ordem padrão.
    const known = [...TIPOS_BASE_ORDER, ..._customTipos.map(t => t.name)];
    let order   = Array.isArray(data.tiposOrder) ? data.tiposOrder.filter(n => known.includes(n)) : null;
    if (!order || order.length === 0) order = [...known];

    const seen = new Set();
    TIPOS.length = 0;
    order.forEach(n => { if (!seen.has(n)) { seen.add(n); TIPOS.push(n); } });
  } catch (_) { _customTipos = []; _freezeDays = []; _customFields = []; }
}

// ─ Gerenciar tipos (ordem / remoção / restauração) ─────────────────────────────
function getTipos() { return [...TIPOS]; }

// Tipos conhecidos (base + customizados) que o usuário removeu da sua lista
function getRemovedTipos() {
  const known = [...TIPOS_BASE_ORDER, ..._customTipos.map(t => t.name)];
  return known.filter(n => !TIPOS.includes(n));
}

async function _persistTipoOrder() {
  await _metaRef().set({ tiposOrder: [...TIPOS] }, { merge: true });
}

async function moveTipo(name, dir) {
  const i = TIPOS.indexOf(name);
  if (i === -1) return;
  const j = dir < 0 ? i - 1 : i + 1;
  if (j < 0 || j >= TIPOS.length) return;
  [TIPOS[i], TIPOS[j]] = [TIPOS[j], TIPOS[i]];
  await _persistTipoOrder();
}

async function removeTipoFromList(name) {
  const i = TIPOS.indexOf(name);
  if (i === -1) return;
  TIPOS.splice(i, 1);
  await _persistTipoOrder();
}

async function restoreTipo(name) {
  const known = [...TIPOS_BASE_ORDER, ..._customTipos.map(t => t.name)];
  if (TIPOS.includes(name) || !known.includes(name)) return;
  TIPOS.push(name);
  await _persistTipoOrder();
}

async function addCustomTipo(name, color) {
  const trimmed = name.trim();
  if (!trimmed || TIPOS.includes(trimmed)) return false;
  _customTipos.push({ name: trimmed, color });
  TIPOS.push(trimmed);
  TIPO_COLORS[trimmed] = color;
  await _metaRef().set({ customTipos: _customTipos, tiposOrder: [...TIPOS] }, { merge: true });
  return true;
}

// ─ Nome de exibição ────────────────────────────────────────────────────────────
function getDisplayName() { return _displayName; }
function hasDisplayName() { return !!(_displayName && _displayName.trim()); }

async function saveDisplayName(nome) {
  _displayName = String(nome || '').trim();
  await _metaRef().set({ displayName: _displayName }, { merge: true });
  await syncDirectoryEntry();
}

// ─ Diretório de usuários (pra montar a lista de colegas, sem digitar e-mail) ───
// Um único doc "directory/index" com um mapa {uid: {nome, email}} — só nome+e-mail,
// nada sensível. É de propósito um doc só (não um por usuário): ler o diretório
// inteiro pra montar a lista de colegas custa sempre 1 leitura, não 1 por usuário.
function _directoryRef() { return db.collection('directory').doc('index'); }

let _directoryCache = null; // em memória só — 1 leitura por sessão, reseta a cada login/reload

async function syncDirectoryEntry() {
  if (!_displayName || !auth.currentUser) return;
  await _directoryRef().set(
    { [_currentUid]: { nome: _displayName, email: auth.currentUser.email || '' } },
    { merge: true }
  );
  _directoryCache = null; // nome pode ter mudado — força reconferir na próxima leitura
}

async function getDirectory() {
  if (_directoryCache) return _directoryCache;
  const doc = await _directoryRef().get();
  if (!doc.exists) return (_directoryCache = []);
  _directoryCache = Object.entries(doc.data())
    .filter(([uid]) => uid !== _currentUid)
    .map(([uid, v]) => ({ uid, ...v }))
    .filter(u => u.nome && u.email)
    .sort((a, b) => a.nome.localeCompare(b.nome));
  return _directoryCache;
}

// ─ Aviso de novidades ──────────────────────────────────────────────────────────
function getChangelogSeen() { return _changelogSeen; }

async function markChangelogSeen(version) {
  _changelogSeen = version;
  await _metaRef().set({ changelogSeen: version }, { merge: true });
}

// Lança o caso na conta do autor e de cada colega via Cloud Function (Admin SDK).
// A lista de "com quem posso liberar em conjunto" vem direto do diretório
// (getDirectory) — não precisa mais de um cadastro de colegas separado.
async function addSharedEntry(entry, colegaEmails) {
  const idToken = await auth.currentUser.getIdToken();
  const resp = await fetch(
    'https://us-central1-chopperverso.cloudfunctions.net/addSharedEntry',
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, colegas: colegaEmails }),
    }
  );
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
  _entriesCache = null;   // a cópia do autor foi gravada pelo servidor; recarrega
  _clearCache('entriesHot'); // servidor já bumpou a versão; garante que não usamos cache antigo
  _clearCache('entriesCold');
  return data;            // { ok, inseridos, naoEncontrados }
}

// ─ Freeze days ────────────────────────────────────────────────────────────────
function getFreezeDays()   { return [..._freezeDays]; }
function isFreezeDay(date) { return _freezeDays.includes(date); }

async function toggleFreezeDay(date) {
  const idx = _freezeDays.indexOf(date);
  if (idx === -1) _freezeDays.push(date);
  else            _freezeDays.splice(idx, 1);
  await _metaRef().set({ freezeDays: _freezeDays }, { merge: true });
  return isFreezeDay(date);
}

// ─ Observations ──────────────────────────────────────────────────────────────
function getObservation(date)   { return _observations[date] || null; }
function getAllObservations()   { return { ..._observations }; }

async function saveObservation(date, { casosInicio, casosFim, texto }) {
  const obs = { texto: texto || '' };
  if (casosInicio !== null && casosInicio !== undefined && casosInicio !== '') obs.casosInicio = Number(casosInicio);
  if (casosFim    !== null && casosFim    !== undefined && casosFim    !== '') obs.casosFim    = Number(casosFim);
  _observations[date] = obs;
  await _metaRef().set({ observations: _observations }, { merge: true });
}

async function deleteObservation(date) {
  delete _observations[date];
  await _metaRef().set({ observations: _observations }, { merge: true });
}

// ─ Custom extra fields ────────────────────────────────────────────────────────
function getCustomFields() { return [..._customFields]; }

async function addCustomField(name, type) {
  const trimmed = name.trim();
  if (!trimmed || _customFields.some(f => f.name === trimmed)) return false;
  _customFields.push({ name: trimmed, type });
  await _metaRef().set({ customFields: _customFields }, { merge: true });
  return true;
}

async function removeCustomField(name) {
  _customFields = _customFields.filter(f => f.name !== name);
  await _metaRef().set({ customFields: _customFields }, { merge: true });
}

function _entriesRef() {
  return db.collection('users').doc(_currentUid).collection('entries');
}

function _congRef() {
  return db.collection('users').doc(_currentUid).collection('congelacoes');
}

// ─ Cache local (localStorage) com controle de versão ──────────────────────────
// Evita reler a coleção inteira a cada carregamento de página: só busca de novo
// no Firestore quando entriesVersion/congVersion (gravados em meta/config) mudam,
// ou quando o cache local passa de _CACHE_TTL_MS (rede de segurança).
function _cacheKey(kind) { return `cv_${kind}_${_currentUid}`; }

function _readCache(kind) {
  try {
    const raw = localStorage.getItem(_cacheKey(kind));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function _writeCache(kind, version, data, extra = {}) {
  try {
    localStorage.setItem(_cacheKey(kind), JSON.stringify({ version, cachedAt: Date.now(), ...extra, data }));
  } catch (_) { /* localStorage indisponível/cheio — segue sem cache persistente */ }
}

function _clearCache(kind) {
  try { localStorage.removeItem(_cacheKey(kind)); } catch (_) {}
}

async function _bumpEntriesVersion() {
  _entriesVersion++;
  await _metaRef().set({ entriesVersion: _entriesVersion }, { merge: true });
}

async function _bumpCongVersion() {
  _congVersion++;
  await _metaRef().set({ congVersion: _congVersion }, { merge: true });
}

// Escuta o doc meta/config (leve, 1 documento) e detecta quando entriesVersion/
// congVersion mudam por fora desta aba — outro dispositivo, colega, e-mail ou
// webhook — disparando o callback pra que a UI se atualize sozinha, sem F5.
function watchForUpdates(onChange) {
  if (_metaUnsub) _metaUnsub();
  _metaUnsub = _metaRef().onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    const newEntriesVersion = data.entriesVersion || 0;
    const newCongVersion    = data.congVersion    || 0;
    const entriesChanged = newEntriesVersion !== _entriesVersion;
    const congChanged    = newCongVersion    !== _congVersion;
    _entriesVersion = newEntriesVersion;
    _congVersion    = newCongVersion;
    if (entriesChanged) _entriesCache = null;
    if (congChanged)    _congCache    = null;
    if ((entriesChanged || congChanged) && typeof onChange === 'function') {
      onChange({ entriesChanged, congChanged });
    }
  });
}

// ─ Entries CRUD ───────────────────────────────────────────────────────────────
// Casos são lidos em duas fatias pra não reler o histórico inteiro a cada mudança:
//   • "quente" (últimos HOT_WINDOW_DAYS dias) — reconferida sempre que entriesVersion muda (barato).
//   • "fria" (tudo antes disso) — quase não muda, então só é relida a cada _COLD_CACHE_TTL_MS
//     ou quando o usuário força ("Atualizar agora" nas configurações).
// O corte da fatia fria fica fixo entre uma releitura completa e outra: a fatia quente sempre
// consulta a partir desse mesmo corte (não de "hoje − 7 dias"), pra nunca deixar um buraco de
// dias sem cobertura enquanto a fria envelhece.
const HOT_WINDOW_DAYS     = 7;
const _COLD_CACHE_TTL_MS  = 30 * 24 * 60 * 60 * 1000;

function _hotCutoffToday() {
  const d = new Date();
  d.setDate(d.getDate() - HOT_WINDOW_DAYS);
  return _localISO(d);
}

async function getEntries() {
  if (_entriesCache) return _entriesCache;

  const cold      = _readCache('entriesCold');
  const coldFresh = cold && (Date.now() - cold.cachedAt) < _COLD_CACHE_TTL_MS;

  if (!coldFresh) {
    // Releitura completa: refaz o corte quente/fria do zero.
    const cutoff = _hotCutoffToday();
    const snap   = await _entriesRef().get();
    const all    = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _writeCache('entriesCold', null, all.filter(e => e.data < cutoff), { cutoff });
    _writeCache('entriesHot', _entriesVersion, all.filter(e => e.data >= cutoff), { cutoff });
    _entriesCache = all;
    return _entriesCache;
  }

  // Fria está fresca: só precisa reconferir a fatia quente (poucos documentos).
  const cutoff    = cold.cutoff;
  const hotCached = _readCache('entriesHot');
  let hotData;
  if (hotCached && hotCached.version === _entriesVersion && hotCached.cutoff === cutoff
      && (Date.now() - hotCached.cachedAt) < _CACHE_TTL_MS) {
    hotData = hotCached.data;
  } else {
    const snap = await _entriesRef().where('data', '>=', cutoff).get();
    hotData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _writeCache('entriesHot', _entriesVersion, hotData, { cutoff });
  }
  _entriesCache = [...cold.data, ...hotData];
  return _entriesCache;
}

// Regrava as fatias quente/fria em localStorage a partir do _entriesCache já corrigido em
// memória — não custa leitura nenhuma no Firestore, só mantém o cache local coerente.
// Preserva o cachedAt original da fatia fria (senão toda edição "renovaria" a rede de
// segurança de 30 dias e ela nunca disparia).
function _persistEntriesSplit() {
  if (!_entriesCache) return;
  const cold = _readCache('entriesCold');
  if (!cold) return; // sem fria cacheada ainda — a próxima leitura refaz tudo do zero
  const cutoff = cold.cutoff;
  _writeCache('entriesHot',  _entriesVersion, _entriesCache.filter(e => e.data >= cutoff), { cutoff });
  _writeCache('entriesCold', null,            _entriesCache.filter(e => e.data <  cutoff), { cutoff, cachedAt: cold.cachedAt });
}

async function addEntry(entry) {
  const data = { ...entry, createdAt: new Date().toISOString() };
  const ref  = await _entriesRef().add(data);
  if (_entriesCache) _entriesCache.push({ id: ref.id, ...data });
  await _bumpEntriesVersion();
  _persistEntriesSplit();
}

async function deleteEntry(id) {
  await _entriesRef().doc(id).delete();
  if (_entriesCache) _entriesCache = _entriesCache.filter(e => e.id !== id);
  await _bumpEntriesVersion();
  _persistEntriesSplit();
}

async function updateEntry(id, fields) {
  await _entriesRef().doc(id).update(fields);
  if (_entriesCache) {
    const i = _entriesCache.findIndex(e => e.id === id);
    if (i !== -1) _entriesCache[i] = { ..._entriesCache[i], ...fields };
  }
  await _bumpEntriesVersion();
  _persistEntriesSplit();
}

// Força uma releitura completa (quente + fria + congelações), ignorando todos os caches —
// usado pelo botão "Atualizar agora" nas configurações, pra quando alguém edita/apaga um
// caso com mais de HOT_WINDOW_DAYS dias e quer ver o reflexo na hora, sem esperar a rede
// de segurança de 30 dias.
async function forceFullRefresh() {
  _entriesCache = null;
  _congCache    = null;
  _clearCache('entriesHot');
  _clearCache('entriesCold');
  _clearCache('cong');
  await Promise.all([getEntries(), getCongelacoes()]);
}

// ─ Congelações CRUD ───────────────────────────────────────────────────────────
async function getCongelacoes() {
  if (_congCache) return _congCache;

  const cached = _readCache('cong');
  if (cached && cached.version === _congVersion && (Date.now() - cached.cachedAt) < _CACHE_TTL_MS) {
    _congCache = cached.data;
    return _congCache;
  }

  const snap = await _congRef().get();
  _congCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  _writeCache('cong', _congVersion, _congCache);
  return _congCache;
}

async function addCongelacao(cong) {
  const data = { ...cong, createdAt: new Date().toISOString() };
  const ref  = await _congRef().add(data);
  if (_congCache) _congCache.push({ id: ref.id, ...data });
  await _bumpCongVersion();
  if (_congCache) _writeCache('cong', _congVersion, _congCache);
}

async function updateCongelacao(id, fields) {
  await _congRef().doc(id).update(fields);
  if (_congCache) {
    const i = _congCache.findIndex(c => c.id === id);
    if (i !== -1) _congCache[i] = { ..._congCache[i], ...fields };
  }
  await _bumpCongVersion();
  if (_congCache) _writeCache('cong', _congVersion, _congCache);
}

async function deleteCongelacao(id) {
  await _congRef().doc(id).delete();
  if (_congCache) _congCache = _congCache.filter(c => c.id !== id);
  await _bumpCongVersion();
  if (_congCache) _writeCache('cong', _congVersion, _congCache);
}

// ─ Webhook token ──────────────────────────────────────────────────────────────

// Mesma lógica da Cloud Function — converte nome do tipo → id para o script
function tipoToId(nome) {
  return String(nome)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function exportTiposParaScript() {
  const linhas = TIPOS.map(t => `    { id: '${tipoToId(t)}', label: '${t}' }`);
  return `TIPOS_DISPONIVEIS: [\n${linhas.join(',\n')}\n]`;
}

function getWebhookToken() { return _webhookToken; }

async function generateWebhookToken() {
  const idToken = await auth.currentUser.getIdToken();
  const resp = await fetch(
    'https://us-central1-chopperverso.cloudfunctions.net/generateWebhookToken',
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken, 'Content-Type': 'application/json' },
    }
  );
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  _webhookToken = data.token;
  return _webhookToken;
}

// ─ Export / Import ────────────────────────────────────────────────────────────
async function exportJSON() {
  const [entries, congelacoes] = await Promise.all([getEntries(), getCongelacoes()]);
  return JSON.stringify({
    version: 4, entries, congelacoes,
    freezeDays: _freezeDays,
    customFields: _customFields,
    observations: _observations,
  }, null, 2);
}

async function importJSON(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.entries) throw new Error('invalid');

    const [eSnap, cSnap] = await Promise.all([_entriesRef().get(), _congRef().get()]);

    const ops = [];
    eSnap.docs.forEach(d => ops.push({ type: 'delete', ref: d.ref }));
    cSnap.docs.forEach(d => ops.push({ type: 'delete', ref: d.ref }));
    parsed.entries.forEach(e => {
      const { id: _, ...data } = e;
      ops.push({ type: 'set', ref: _entriesRef().doc(), data: { ...data, createdAt: data.createdAt || new Date().toISOString() } });
    });
    (parsed.congelacoes || []).forEach(c => {
      const { id: _, ...data } = c;
      ops.push({ type: 'set', ref: _congRef().doc(), data: { ...data, createdAt: data.createdAt || new Date().toISOString() } });
    });

    await _commitBatches(ops);
    _entriesCache = null;
    _congCache    = null;
    _clearCache('entriesHot');
    _clearCache('entriesCold');
    _clearCache('cong');
    await _bumpEntriesVersion();
    await _bumpCongVersion();

    if (Array.isArray(parsed.freezeDays)) {
      _freezeDays = parsed.freezeDays;
      await _metaRef().set({ freezeDays: _freezeDays }, { merge: true });
    }
    if (Array.isArray(parsed.customFields)) {
      _customFields = parsed.customFields;
      await _metaRef().set({ customFields: _customFields }, { merge: true });
    }
    if (parsed.observations && typeof parsed.observations === 'object') {
      _observations = parsed.observations;
      await _metaRef().set({ observations: _observations }, { merge: true });
    }

    return true;
  } catch (_) {
    return false;
  }
}

async function resetToSeed() {
  const snap = await _entriesRef().get();
  const ops  = [];
  snap.docs.forEach(d => ops.push({ type: 'delete', ref: d.ref }));
  SEED_ENTRIES.forEach(e => {
    const { id: _, ...data } = e;
    ops.push({ type: 'set', ref: _entriesRef().doc(), data: { ...data, createdAt: e.data + 'T08:00:00Z' } });
  });
  await _commitBatches(ops);
  _entriesCache = null;
  _clearCache('entriesHot');
  _clearCache('entriesCold');
  await _bumpEntriesVersion();
}

async function _commitBatches(ops) {
  for (let i = 0; i < ops.length; i += 490) {
    const batch = db.batch();
    ops.slice(i, i + 490).forEach(op => {
      if (op.type === 'delete') batch.delete(op.ref);
      else                      batch.set(op.ref, op.data);
    });
    await batch.commit();
  }
}

// ─ Date helpers ───────────────────────────────────────────────────────────────
function _localISO(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  return _localISO();
}

function weekBounds() {
  const d    = new Date();
  const dow  = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon  = new Date(d); mon.setDate(d.getDate() + diff);
  const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: _localISO(mon), end: _localISO(sun) };
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

// ─ Filters ────────────────────────────────────────────────────────────────────
function filterEntries(entries, period) {
  const today = todayISO();
  const wb    = weekBounds();
  if (period === 'today') return entries.filter(e => e.data === today);
  if (period === 'week')  return entries.filter(e => e.data >= wb.start && e.data <= wb.end);
  if (period === 'month') return entries.filter(e => e.data >= monthStart());
  if (period === 'year')  return entries.filter(e => e.data >= yearStart());
  return entries;
}

// ─ Aggregations ───────────────────────────────────────────────────────────────
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
