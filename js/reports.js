// ── ChopperVerso · Relatório PDF ────────────────────────────────────────────
// Depende de: getEntries/getAllObservations/getDisplayName/todayISO/_localISO (data.js),
// calcStats/groupByDate (data.js), _recIsoWeek (records.js), formatDate/toast (app.js).

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

  const doc       = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin    = 40;
  let y = 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('ChopperVerso — Relatório de Produção', margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(90);
  const nome = getDisplayName();
  doc.text(`${nome ? nome + ' · ' : ''}Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, margin, y);
  y += 14;
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
  y += 24;
  doc.setTextColor(20);

  // ── 1. Pontuação por dia ──────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.text('1. Pontuação por dia', margin, y);

  const totalCasos   = dayStats.reduce((s, d) => s + d.casos, 0);
  const totalLaminas = dayStats.reduce((s, d) => s + d.laminas, 0);

  doc.autoTable({
    startY: y + 10,
    head: [['Data', 'Casos', 'Lâminas', 'Pontos']],
    body: dayStats.map(d => [formatDate(d.date), String(d.casos), String(d.laminas), String(d.pontos)]),
    foot: [['Total', String(totalCasos), String(totalLaminas), String(avg.totalPontos)]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [61, 90, 128] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 26;

  // ── 2. Médias do período ──────────────────────────────────────────────────
  y = _relEnsureSpace(doc, y, 100);
  doc.setFontSize(12);
  doc.text('2. Médias do período', margin, y);
  y += 18;
  doc.setFontSize(10);
  const medias = [
    `Total de pontos no período: ${avg.totalPontos}`,
    `Média por dia trabalhado: ${avg.mediaDia.toFixed(1)} pontos (${avg.diasTrabalhados} ${avg.diasTrabalhados === 1 ? 'dia' : 'dias'})`,
    `Média por semana trabalhada: ${avg.mediaSemana.toFixed(1)} pontos (${avg.semanasTrabalhadas} ${avg.semanasTrabalhadas === 1 ? 'semana' : 'semanas'})`,
    `Média por mês trabalhado: ${avg.mediaMes.toFixed(1)} pontos (${avg.mesesTrabalhados} ${avg.mesesTrabalhados === 1 ? 'mês' : 'meses'})`,
  ];
  medias.forEach(line => { y = _relEnsureSpace(doc, y, 16); doc.text(line, margin, y); y += 16; });
  y += 8;

  // ── 3. Observações do período ─────────────────────────────────────────────
  y = _relEnsureSpace(doc, y, 40);
  doc.setFontSize(12);
  doc.text('3. Observações do período', margin, y);
  y += 18;
  doc.setFontSize(10);

  if (obsRange.length === 0) {
    doc.setTextColor(120);
    doc.text('Nenhuma observação registrada nesse período.', margin, y);
    doc.setTextColor(20);
    y += 20;
  } else {
    obsRange.forEach(([date, obs]) => {
      const casosInfo = [];
      if (obs.casosInicio !== undefined) casosInfo.push(`início: ${obs.casosInicio}`);
      if (obs.casosFim    !== undefined) casosInfo.push(`fim: ${obs.casosFim}`);
      const texto  = (obs.texto || '').trim();
      const linhas = texto ? doc.splitTextToSize(texto, pageWidth - margin * 2 - 10) : [];

      y = _relEnsureSpace(doc, y, 22 + linhas.length * 12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatDate(date)}${casosInfo.length ? '  —  casos no monitor: ' + casosInfo.join(', ') : ''}`, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 14;
      if (linhas.length) {
        doc.text(linhas, margin, y);
        y += linhas.length * 12;
      }
      y += 8;
    });
  }
  y += 8;

  // ── 4. Casos liberados no período (opcional) ──────────────────────────────
  if (incluirCasos) {
    y = _relEnsureSpace(doc, y, 40);
    doc.setFontSize(12);
    doc.text('4. Casos liberados no período', margin, y);
    doc.autoTable({
      startY: y + 10,
      head: [['Data', 'FAP', 'Tipo(s)', 'Lâminas', 'Pontos']],
      body: entries.map(e => [
        formatDate(e.data), e.fap || '–', (e.tipos || []).join(', '),
        String(e.laminas || 0), String(e.pontos || 0),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [61, 90, 128] },
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
