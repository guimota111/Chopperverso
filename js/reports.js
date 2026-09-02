// ── ChopperVerso · Relatório PDF ────────────────────────────────────────────
// Depende de: getEntries/getAllObservations/getDisplayName/todayISO/_localISO (data.js),
// calcStats/groupByDate (data.js), _recIsoWeek (records.js), formatDate/toast (app.js).

const REL_WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Paleta do PDF — tema do app adaptado pra papel branco
const REL_COLORS = {
  primary:    [198, 40, 40],   // vermelho Chopper
  blue:       [21, 101, 192],
  amber:      [202, 138, 4],
  dark:       [30, 33, 48],
  gray:       [110, 116, 138],
  cardBg:     [246, 247, 250],
  cardBorder: [223, 226, 234],
  stripe:     [250, 245, 245],
  footBg:     [240, 234, 234],
};

function _relWeekdayShort(iso) {
  return REL_WEEKDAYS_SHORT[new Date(iso + 'T12:00:00').getDay()];
}

function _relBuildDayStats(entries) {
  const byDay = groupByDate(entries);
  return Object.keys(byDay).sort().map(date => ({ date, ...calcStats(byDay[date]) }));
}

function _relBuildAverages(entries, dayStats) {
  const totalPontos     = dayStats.reduce((s, d) => s + d.pontos, 0);
  const diasTrabalhados = dayStats.length;

  const byWeek = {};
  entries.forEach(e => {
    const d   = new Date(e.data + 'T12:00:00');
    const key = `${d.getFullYear()}-W${String(_recIsoWeek(d)).padStart(2, '0')}`;
    (byWeek[key] = byWeek[key] || []).push(e);
  });
  const semanasTrabalhadas = Object.keys(byWeek).length;

  const byMonth = {};
  entries.forEach(e => {
    const key = e.data.substring(0, 7);
    (byMonth[key] = byMonth[key] || []).push(e);
  });
  const mesesTrabalhados = Object.keys(byMonth).length;

  return {
    totalPontos,
    diasTrabalhados,
    mediaDia:    diasTrabalhados    ? totalPontos / diasTrabalhados    : 0,
    semanasTrabalhadas,
    mediaSemana: semanasTrabalhadas ? totalPontos / semanasTrabalhadas : 0,
    mesesTrabalhados,
    mediaMes:    mesesTrabalhados   ? totalPontos / mesesTrabalhados   : 0,
  };
}

function _relEnsureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 40) {
    doc.addPage();
    return 50;
  }
  return y;
}

function _relSectionTitle(doc, y, texto) {
  doc.setFillColor(...REL_COLORS.primary);
  doc.rect(40, y - 10, 4, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...REL_COLORS.dark);
  doc.text(texto, 50, y);
  doc.setFont('helvetica', 'normal');
}

function _relStatCard(doc, x, y, w, h, value, label, color) {
  doc.setFillColor(...REL_COLORS.cardBg);
  doc.setDrawColor(...REL_COLORS.cardBorder);
  doc.roundedRect(x, y, w, h, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...color);
  doc.text(String(value), x + w / 2, y + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...REL_COLORS.gray);
  const lines = doc.splitTextToSize(label, w - 10);
  doc.text(lines, x + w / 2, y + 37, { align: 'center' });
}

async function generateRelatorioPDF(dataInicio, dataFim, incluirCasos) {
  if (!dataInicio || !dataFim) { toast('Selecione as duas datas.', true); return; }
  if (dataInicio > dataFim)    { toast('A data inicial precisa ser antes (ou igual) da data final.', true); return; }

  const { jsPDF } = window.jspdf;
  const all     = await getEntries();
  const entries = all
    .filter(e => e.data >= dataInicio && e.data <= dataFim)
    .sort((a, b) => a.data.localeCompare(b.data) || (a.fap || '').localeCompare(b.fap || ''));

  if (entries.length === 0) {
    toast('Nenhum caso encontrado nesse período.', true);
    return;
  }

  const dayStats = _relBuildDayStats(entries);
  const avg      = _relBuildAverages(entries, dayStats);
  const obsRange = Object.entries(getAllObservations())
    .filter(([date]) => date >= dataInicio && date <= dataFim)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const totalCasos   = dayStats.reduce((s, d) => s + d.casos, 0);
  const totalLaminas = dayStats.reduce((s, d) => s + d.laminas, 0);

  const doc       = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin    = 40;

  // ── Cabeçalho (faixa vermelha) ────────────────────────────────────────────
  doc.setFillColor(...REL_COLORS.primary);
  doc.rect(0, 0, pageWidth, 92, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text('ChopperVerso', margin, 36);
  doc.setFontSize(12);
  doc.text('Relatório de Produção', margin, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 214, 214);
  const nome = getDisplayName();
  doc.text(
    `${nome ? nome + '  ·  ' : ''}Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
    margin, 74
  );

  let y = 116;

  // ── Cards-resumo (números principais) ─────────────────────────────────────
  const gap   = 10;
  const cardW = (pageWidth - margin * 2 - gap * 3) / 4;
  const cardH = 52;
  _relStatCard(doc, margin,                     y, cardW, cardH, avg.totalPontos,      'pontos no período', REL_COLORS.primary);
  _relStatCard(doc, margin + (cardW + gap),     y, cardW, cardH, totalCasos,           'casos liberados',   REL_COLORS.blue);
  _relStatCard(doc, margin + (cardW + gap) * 2, y, cardW, cardH, totalLaminas,         'lâminas',           REL_COLORS.amber);
  _relStatCard(doc, margin + (cardW + gap) * 3, y, cardW, cardH, avg.diasTrabalhados,  'dias trabalhados',  REL_COLORS.dark);
  y += cardH + 32;

  // ── 1. Pontuação por dia ──────────────────────────────────────────────────
  _relSectionTitle(doc, y, '1. Pontuação por dia');
  doc.autoTable({
    startY: y + 10,
    head: [['Data', 'Dia', 'Casos', 'Lâminas', 'Pontos']],
    body: dayStats.map(d => [
      formatDate(d.date), _relWeekdayShort(d.date),
      String(d.casos), String(d.laminas), String(d.pontos),
    ]),
    foot: [['Total', '', String(totalCasos), String(totalLaminas), String(avg.totalPontos)]],
    theme: 'striped',
    styles:     { fontSize: 9, cellPadding: 4.5, textColor: REL_COLORS.dark },
    headStyles: { fillColor: REL_COLORS.primary, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: REL_COLORS.footBg, textColor: REL_COLORS.dark, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: REL_COLORS.stripe },
    columnStyles: {
      1: { textColor: REL_COLORS.gray },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold', textColor: REL_COLORS.primary },
    },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index >= 2) data.cell.styles.halign = 'right';
      if (data.section === 'foot' && data.column.index === 4) data.cell.styles.textColor = REL_COLORS.primary;
    },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 32;

  // ── 2. Médias do período ──────────────────────────────────────────────────
  y = _relEnsureSpace(doc, y, 110);
  _relSectionTitle(doc, y, '2. Médias do período');
  y += 12;
  const mCardW = (pageWidth - margin * 2 - gap * 2) / 3;
  _relStatCard(doc, margin, y, mCardW, cardH,
    avg.mediaDia.toFixed(1),
    `pontos por dia trabalhado (${avg.diasTrabalhados} ${avg.diasTrabalhados === 1 ? 'dia' : 'dias'})`,
    REL_COLORS.primary);
  _relStatCard(doc, margin + mCardW + gap, y, mCardW, cardH,
    avg.mediaSemana.toFixed(1),
    `pontos por semana trabalhada (${avg.semanasTrabalhadas} ${avg.semanasTrabalhadas === 1 ? 'semana' : 'semanas'})`,
    REL_COLORS.blue);
  _relStatCard(doc, margin + (mCardW + gap) * 2, y, mCardW, cardH,
    avg.mediaMes.toFixed(1),
    `pontos por mês trabalhado (${avg.mesesTrabalhados} ${avg.mesesTrabalhados === 1 ? 'mês' : 'meses'})`,
    REL_COLORS.amber);
  y += cardH + 32;

  // ── 3. Observações do período ─────────────────────────────────────────────
  y = _relEnsureSpace(doc, y, 60);
  _relSectionTitle(doc, y, '3. Observações do período');
  y += 20;
  doc.setFontSize(10);

  if (obsRange.length === 0) {
    doc.setTextColor(...REL_COLORS.gray);
    doc.text('Nenhuma observação registrada nesse período.', margin, y);
    y += 20;
  } else {
    obsRange.forEach(([date, obs]) => {
      const casosInfo = [];
      if (obs.casosInicio !== undefined) casosInfo.push(`início: ${obs.casosInicio}`);
      if (obs.casosFim    !== undefined) casosInfo.push(`fim: ${obs.casosFim}`);
      const texto  = (obs.texto || '').trim();
      const linhas = texto ? doc.splitTextToSize(texto, pageWidth - margin * 2 - 10) : [];

      y = _relEnsureSpace(doc, y, 22 + linhas.length * 12);

      const dateStr = `${formatDate(date)} · ${_relWeekdayShort(date)}`;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...REL_COLORS.blue);
      doc.text(dateStr, margin, y);
      if (casosInfo.length) {
        const w1 = doc.getTextWidth(dateStr);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...REL_COLORS.gray);
        doc.text(`—  casos no monitor: ${casosInfo.join(', ')}`, margin + w1 + 8, y);
      }
      doc.setFont('helvetica', 'normal');
      y += 14;
      if (linhas.length) {
        doc.setTextColor(...REL_COLORS.dark);
        doc.text(linhas, margin, y);
        y += linhas.length * 12;
      }
      y += 8;
    });
  }
  y += 8;

  // ── 4. Casos liberados no período (opcional) ──────────────────────────────
  if (incluirCasos) {
    y = _relEnsureSpace(doc, y, 60);
    _relSectionTitle(doc, y, '4. Casos liberados no período');
    doc.autoTable({
      startY: y + 10,
      head: [['Data', 'Dia', 'FAP', 'Tipo(s)', 'Lâminas', 'Pontos']],
      body: entries.map(e => [
        formatDate(e.data), _relWeekdayShort(e.data), e.fap || '–',
        (e.tipos || []).join(', '), String(e.laminas || 0), String(e.pontos || 0),
      ]),
      theme: 'striped',
      styles:     { fontSize: 8, cellPadding: 3.5, textColor: REL_COLORS.dark },
      headStyles: { fillColor: REL_COLORS.primary, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: REL_COLORS.stripe },
      columnStyles: {
        1: { textColor: REL_COLORS.gray },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: REL_COLORS.primary },
      },
      margin: { left: margin, right: margin },
    });
  }

  doc.save(`chopperverso-relatorio_${dataInicio}_a_${dataFim}.pdf`);
}

// ─ UI wiring ──────────────────────────────────────────────────────────────────
// Chamado por switchTab() (app.js) ao entrar na aba "Relatório" — só preenche as
// datas na primeira vez, sem sobrescrever o que o usuário já tiver escolhido.
function _defaultRelatorioDates() {
  const inicioEl = document.getElementById('rel-data-inicio');
  const fimEl    = document.getElementById('rel-data-fim');
  if (!inicioEl.value || !fimEl.value) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    inicioEl.value = inicioEl.value || _localISO(d);
    fimEl.value    = fimEl.value    || todayISO();
  }
}

document.getElementById('rel-modal-gerar').addEventListener('click', async () => {
  const btn          = document.getElementById('rel-modal-gerar');
  const dataInicio   = document.getElementById('rel-data-inicio').value;
  const dataFim      = document.getElementById('rel-data-fim').value;
  const incluirCasos = document.getElementById('rel-incluir-casos').checked;

  btn.disabled    = true;
  btn.textContent = 'Gerando…';
  try {
    await generateRelatorioPDF(dataInicio, dataFim, incluirCasos);
  } catch (e) {
    console.error('[relatorio] erro ao gerar PDF:', e);
    toast('Erro ao gerar PDF: ' + (e.message || e), true);
  } finally {
    btn.disabled    = false;
    btn.textContent = '📥 Gerar PDF';
  }
});
