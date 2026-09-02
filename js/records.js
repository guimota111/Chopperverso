// ── ChopperVerso · Records Page ───────────────────────────────────────────────

const REC_MONTHS_PT      = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const REC_WEEKDAYS_PT    = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const REC_WEEKDAYS_PREP  = ['no','na','na','na','na','na','no']; // "no Domingo", "na Segunda", ...

// Quebra a diferença entre duas datas ISO em anos/meses/semanas/dias (estilo idade).
function _recElapsed(startISO, endISO) {
  const start = new Date(startISO + 'T00:00:00');
  const end   = new Date(endISO   + 'T00:00:00');
  let years  = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days   = end.getDate() - start.getDate();
  if (days < 0) {
    months--;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }
  const weeks = Math.floor(days / 7);
  days = days % 7;
  return { years, months, weeks, days };
}

// ─ Date helpers ───────────────────────────────────────────────────────────────
function _recIsoWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
}

function _recFmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function _recFmtWeek(key) {
  const [yr, wStr] = key.split('-W');
  const week = parseInt(wStr);
  const jan4 = new Date(parseInt(yr), 0, 4);
  const dow  = jan4.getDay() || 7;
  const mon  = new Date(jan4);
  mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const p = n => String(n).padStart(2, '0');
  return `${p(mon.getDate())}/${p(mon.getMonth()+1)} a ${p(sun.getDate())}/${p(sun.getMonth()+1)}`;
}

function _recFmtMonth(ym) {
  const [y, m] = ym.split('-');
  return `${REC_MONTHS_PT[parseInt(m)-1]} ${y}`;
}

function _plural(n, singular, plural) {
  return n === 1 ? singular : plural;
}

// ─ Records computation ────────────────────────────────────────────────────────
function _computeRecords(entries) {
  if (!entries.length) return null;

  // Group by day (uses existing data.js helper)
  const byDay = groupByDate(entries);

  // Group by ISO week
  const byWeek = {};
  entries.forEach(e => {
    const d = new Date(e.data + 'T12:00:00');
    const key = `${d.getFullYear()}-W${String(_recIsoWeek(d)).padStart(2, '0')}`;
    (byWeek[key] = byWeek[key] || []).push(e);
  });

  // Group by month
  const byMonth = {};
  entries.forEach(e => {
    const key = e.data.substring(0, 7);
    (byMonth[key] = byMonth[key] || []).push(e);
  });

  // Find the group with highest total or average for a metric
  function _best(map, metric, avg) {
    let bestKey = null, bestVal = -Infinity;
    Object.entries(map).forEach(([k, arr]) => {
      const s    = calcStats(arr);
      const days = avg ? new Set(arr.map(e => e.data)).size : 1;
      const val  = s[metric] / days;
      if (val > bestVal) { bestVal = val; bestKey = k; }
    });
    if (!bestKey) return null;
    const arr  = map[bestKey];
    const s    = calcStats(arr);
    const days = new Set(arr.map(e => e.data)).size;
    return { key: bestKey, stats: s, val: avg ? s[metric] / days : s[metric], days };
  }

  // ─ Consecutive streak ─────────────────────────────────────────────────────
  const allDates  = [...new Set(entries.map(e => e.data))].sort();
  let maxStreak   = 1, curStreak = 1;
  let streakStart = allDates[0], streakEnd = allDates[0], curStart = allDates[0];
  for (let i = 1; i < allDates.length; i++) {
    const diff = Math.round(
      (new Date(allDates[i] + 'T12:00:00') - new Date(allDates[i-1] + 'T12:00:00')) / 86400000
    );
    if (diff === 1) {
      curStreak++;
      if (curStreak > maxStreak) {
        maxStreak = curStreak;
        streakEnd = allDates[i];
        streakStart = curStart;
      }
    } else {
      curStreak = 1;
      curStart  = allDates[i];
    }
  }

  // ─ Best weekday by avg pontos ─────────────────────────────────────────────
  const wdGroups = [{},{},{},{},{},{},{}];
  entries.forEach(e => {
    const wd = new Date(e.data + 'T12:00:00').getDay();
    (wdGroups[wd][e.data] = wdGroups[wd][e.data] || []).push(e);
  });
  let bestWd = 0, bestWdAvg = -1, bestWdCount = 0;
  const wdAverages = wdGroups.map(() => null);
  wdGroups.forEach((dayMap, wd) => {
    const days = Object.keys(dayMap);
    if (!days.length) return;
    const total = days.reduce((s, d) => s + calcStats(dayMap[d]).pontos, 0);
    const avg   = total / days.length;
    wdAverages[wd] = avg;
    if (avg > bestWdAvg) { bestWdAvg = avg; bestWd = wd; bestWdCount = days.length; }
  });

  // ─ Most frequent tipo ─────────────────────────────────────────────────────
  const tipoMap = {};
  entries.forEach(e => (e.tipos || []).forEach(t => { tipoMap[t] = (tipoMap[t] || 0) + 1; }));
  const topTipo = Object.entries(tipoMap).sort((a, b) => b[1] - a[1])[0] || null;

  // ─ Best individual case by pontos ─────────────────────────────────────────
  const topCase = entries.reduce((best, e) => (!best || e.pontos > best.pontos) ? e : best, null);

  return {
    day:        { pts: _best(byDay, 'pontos', false), casos: _best(byDay, 'casos', false), lam: _best(byDay, 'laminas', false) },
    weekTotal:  { pts: _best(byWeek, 'pontos', false), casos: _best(byWeek, 'casos', false), lam: _best(byWeek, 'laminas', false) },
    weekAvg:    { pts: _best(byWeek, 'pontos', true),  casos: _best(byWeek, 'casos', true),  lam: _best(byWeek, 'laminas', true)  },
    monthTotal: { pts: _best(byMonth, 'pontos', false), casos: _best(byMonth, 'casos', false), lam: _best(byMonth, 'laminas', false) },
    monthAvg:   { pts: _best(byMonth, 'pontos', true),  casos: _best(byMonth, 'casos', true),  lam: _best(byMonth, 'laminas', true)  },
    streak:     { max: maxStreak, start: streakStart, end: streakEnd },
    bestWeekday:{ wd: bestWd, avg: bestWdAvg, count: bestWdCount },
    wdAverages,
    topTipo,
    topCase,
    totalDays:   allDates.length,
    totalMonths: Object.keys(byMonth).length,
    firstDate:   allDates[0],
  };
}

// ─ Carta do Chopper ───────────────────────────────────────────────────────────
function _recLetterHtml(entries, r) {
  const total = calcStats(entries);

  const el = _recElapsed(r.firstDate, todayISO());
  const partes = [];
  if (el.years)  partes.push(`${el.years} ${_plural(el.years,'ano','anos')}`);
  if (el.months) partes.push(`${el.months} ${_plural(el.months,'mês','meses')}`);
  if (el.weeks)  partes.push(`${el.weeks} ${_plural(el.weeks,'semana','semanas')}`);
  partes.push(`${el.days} ${_plural(el.days,'dia','dias')}`);
  const tempoTexto = partes.length > 1
    ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]
    : partes[0];

  const globalAvgMes = total.pontos / r.totalMonths;
  const mesPct       = globalAvgMes > 0 ? Math.round(((r.monthTotal.pts.stats.pontos - globalAvgMes) / globalAvgMes) * 100) : 0;
  const [mesAno, mesMes] = r.monthTotal.pts.key.split('-');
  const mesNome      = REC_MONTHS_PT[parseInt(mesMes) - 1];

  const diaRec       = r.day.casos;
  const [diaAno, diaMes, diaDia] = diaRec.key.split('-');
  const diaMesNome   = REC_MONTHS_PT[parseInt(diaMes) - 1];

  const outrasMedias = r.wdAverages.filter((v, i) => v !== null && i !== r.bestWeekday.wd);
  const outrasMedia  = outrasMedias.length ? outrasMedias.reduce((a, b) => a + b, 0) / outrasMedias.length : 0;
  const wdPct        = outrasMedia > 0 ? Math.round(((r.bestWeekday.avg - outrasMedia) / outrasMedia) * 100) : 0;
  const wdNome       = REC_WEEKDAYS_PT[r.bestWeekday.wd];
  const wdPrep       = REC_WEEKDAYS_PREP[r.bestWeekday.wd];

  return `
    <div class="rec-letter">
      <img src="Choppers/estatisco2.png" alt="Chopper" class="rec-letter-chopper">
      <div class="rec-letter-text">
        <p>Olá Choppermigo.</p>
        <p>Muito obrigado por usar o ChopperVerso. Você está aqui há <b>${tempoTexto}</b>.</p>
        <p>Desde então você já adicionou <b>${total.casos} ${_plural(total.casos,'caso','casos')}</b> e <b>${total.laminas} ${_plural(total.laminas,'lâmina','lâminas')}</b>. Imagina quantos pacientes você já não ajudou?</p>
        <p>No mês de <b>${mesNome} de ${mesAno}</b> você realmente estava no monster point, liberando um recorde de <b>${r.monthTotal.pts.stats.pontos} pontos</b>, ${mesPct}% acima da sua média global.</p>
        <p>Mas fiquei chocado mesmo com o dia <b>${parseInt(diaDia)} de ${diaMesNome} de ${diaAno}</b>, quando você liberou <b>${diaRec.stats.casos} ${_plural(diaRec.stats.casos,'caso','casos')}</b>, foram <b>${diaRec.stats.laminas} ${_plural(diaRec.stats.laminas,'lâmina','lâminas')}</b>. Você não cansa de trabalhar?</p>
        <p>O dia da semana que você mais costuma produzir é ${wdPrep} <b>${wdNome}</b>, com uma média de <b>${r.bestWeekday.avg.toFixed(1)} pontos</b>, ${wdPct}% acima dos outros dias.</p>
        <p>Talvez um dia você seja capaz de curar todas as doenças do mundo como eu.</p>
        <p class="rec-letter-sign">Obrigado por usar o ChopperVerso e não precisa me agradecer, seu idiota, isso não me deixa feliz.</p>
      </div>
    </div>`;
}

// ─ Render ─────────────────────────────────────────────────────────────────────
async function renderRecordsPage() {
  const entries   = await getEntries();
  const container = document.getElementById('records-container');

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:5rem 1rem">
        <div class="empty-icon">🏆</div>
        <p>Nenhum dado ainda para calcular records!</p>
      </div>`;
    return;
  }

  const rec = _computeRecords(entries);

  function _card(icon, title, value, sub, cls) {
    return `
      <div class="rec-card${cls ? ' ' + cls : ''}">
        <div class="rec-icon">${icon}</div>
        <div class="rec-body">
          <div class="rec-title">${title}</div>
          <div class="rec-value">${value}</div>
          ${sub ? `<div class="rec-sub">${sub}</div>` : ''}
        </div>
      </div>`;
  }

  function _section(emoji, title, cardsHtml) {
    return `
      <div class="rec-section">
        <div class="rec-section-header">
          <span class="rec-section-emoji">${emoji}</span>
          <span class="rec-section-title">${title}</span>
        </div>
        <div class="rec-grid">${cardsHtml}</div>
      </div>`;
  }

  const r = rec;

  container.innerHTML = [

    _recLetterHtml(entries, r),

    _section('📅', 'Recordes por Dia', [
      _card('🥇', 'Mais Pontos em um Dia',
        `${r.day.pts.stats.pontos} pts`,
        `${r.day.pts.stats.casos} ${_plural(r.day.pts.stats.casos,'caso','casos')} · ${_recFmtDate(r.day.pts.key)}`,
        'rec-gold'),
      _card('🥉', 'Mais Lâminas em um Dia',
        `${r.day.lam.stats.laminas} lâm`,
        `${r.day.lam.stats.casos} ${_plural(r.day.lam.stats.casos,'caso','casos')} · ${_recFmtDate(r.day.lam.key)}`,
        'rec-bronze'),
    ].join('')),

    _section('📆', 'Melhores Semanas — Total', [
      _card('🥇', 'Mais Pontos',
        `${r.weekTotal.pts.stats.pontos} pts`,
        `${_recFmtWeek(r.weekTotal.pts.key)} · ${r.weekTotal.pts.days} ${_plural(r.weekTotal.pts.days,'dia','dias')}`,
        'rec-gold'),
      _card('🥈', 'Mais Casos',
        `${r.weekTotal.casos.stats.casos} casos`,
        `${_recFmtWeek(r.weekTotal.casos.key)} · ${r.weekTotal.casos.days} ${_plural(r.weekTotal.casos.days,'dia','dias')}`,
        'rec-silver'),
      _card('🥉', 'Mais Lâminas',
        `${r.weekTotal.lam.stats.laminas} lâm`,
        `${_recFmtWeek(r.weekTotal.lam.key)} · ${r.weekTotal.lam.days} ${_plural(r.weekTotal.lam.days,'dia','dias')}`,
        'rec-bronze'),
    ].join('')),

    _section('⭐', 'Melhores Semanas — Média por Dia', [
      _card('🥇', 'Maior Média de Pontos',
        `${r.weekAvg.pts.val.toFixed(1)} pts/dia`,
        `${_recFmtWeek(r.weekAvg.pts.key)} · ${r.weekAvg.pts.days} ${_plural(r.weekAvg.pts.days,'dia','dias')}`,
        'rec-gold'),
      _card('🥈', 'Maior Média de Casos',
        `${r.weekAvg.casos.val.toFixed(1)} casos/dia`,
        `${_recFmtWeek(r.weekAvg.casos.key)} · ${r.weekAvg.casos.days} ${_plural(r.weekAvg.casos.days,'dia','dias')}`,
        'rec-silver'),
      _card('🥉', 'Maior Média de Lâminas',
        `${r.weekAvg.lam.val.toFixed(1)} lâm/dia`,
        `${_recFmtWeek(r.weekAvg.lam.key)} · ${r.weekAvg.lam.days} ${_plural(r.weekAvg.lam.days,'dia','dias')}`,
        'rec-bronze'),
    ].join('')),

    _section('🗓️', 'Melhores Meses — Total', [
      _card('🥈', 'Mais Casos',
        `${r.monthTotal.casos.stats.casos} casos`,
        `${_recFmtMonth(r.monthTotal.casos.key)} · ${r.monthTotal.casos.stats.pontos} pts`,
        'rec-silver'),
      _card('🥉', 'Mais Lâminas',
        `${r.monthTotal.lam.stats.laminas} lâm`,
        `${_recFmtMonth(r.monthTotal.lam.key)} · ${r.monthTotal.lam.stats.casos} ${_plural(r.monthTotal.lam.stats.casos,'caso','casos')}`,
        'rec-bronze'),
    ].join('')),

    _section('✨', 'Melhores Meses — Média por Dia', [
      _card('🥇', 'Maior Média de Pontos',
        `${r.monthAvg.pts.val.toFixed(1)} pts/dia`,
        `${_recFmtMonth(r.monthAvg.pts.key)} · ${r.monthAvg.pts.days} ${_plural(r.monthAvg.pts.days,'dia','dias')}`,
        'rec-gold'),
      _card('🥈', 'Maior Média de Casos',
        `${r.monthAvg.casos.val.toFixed(1)} casos/dia`,
        `${_recFmtMonth(r.monthAvg.casos.key)} · ${r.monthAvg.casos.days} ${_plural(r.monthAvg.casos.days,'dia','dias')}`,
        'rec-silver'),
      _card('🥉', 'Maior Média de Lâminas',
        `${r.monthAvg.lam.val.toFixed(1)} lâm/dia`,
        `${_recFmtMonth(r.monthAvg.lam.key)} · ${r.monthAvg.lam.days} ${_plural(r.monthAvg.lam.days,'dia','dias')}`,
        'rec-bronze'),
    ].join('')),

    _section('🎖️', 'Outros Destaques', [
      _card('🔥', 'Maior Sequência de Dias',
        `${r.streak.max} ${_plural(r.streak.max,'dia','dias')} seguidos`,
        r.streak.max > 1
          ? `${_recFmtDate(r.streak.start)} → ${_recFmtDate(r.streak.end)}`
          : `dia ${_recFmtDate(r.streak.end)}`,
        'rec-streak'),
      r.topTipo
        ? _card('🔬', 'Tipo Mais Liberado',
            r.topTipo[0],
            `${r.topTipo[1]} ${_plural(r.topTipo[1],'caso','casos')} ao total`,
            'rec-tipo')
        : '',
    ].join('')),

  ].join('');
}
