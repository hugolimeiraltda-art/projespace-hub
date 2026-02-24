import jsPDF from 'jspdf';
import type { PropostaData, PropostaItem, AmbienteItem } from '@/components/orcamento/PropostaView';

function drawTableHeader(doc: jsPDF, y: number, cols: { label: string; x: number; align?: string }[]) {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(51, 51, 51);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, y - 4, doc.internal.pageSize.getWidth() - 30, 7, 'F');
  for (const col of cols) {
    if (col.align === 'right') {
      doc.text(col.label, col.x, y, { align: 'right' });
    } else {
      doc.text(col.label, col.x, y);
    }
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

function drawTableRows(doc: jsPDF, y: number, items: PropostaItem[], pageWidth: number): number {
  doc.setFontSize(8);
  for (const item of items) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(String(item.qtd ?? ''), 17, y);
    const maxNomeWidth = 90;
    let nome = String(item.nome || '');
    while (doc.getTextWidth(nome) > maxNomeWidth && nome.length > 3) {
      nome = nome.substring(0, nome.length - 4) + '...';
    }
    doc.text(nome, 35, y);
    doc.text(String(item.codigo || '-'), 130, y);
    doc.text(`R$ ${(item.valor_locacao || 0).toFixed(2)}`, pageWidth - 50, y, { align: 'right' });
    doc.text(`R$ ${((item.valor_locacao || 0) * (item.qtd || 0)).toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
    // Light row separator
    doc.setDrawColor(230, 230, 230);
    doc.line(15, y + 2, pageWidth - 15, y + 2);
    y += 6;
  }
  return y;
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) { doc.addPage(); return 20; }
  return y;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    return await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawAmbientes(doc: jsPDF, y: number, ambientes: AmbienteItem[], pageWidth: number, margin: number, fotoDataUrls?: Map<string, string>): number {
  y = checkPage(doc, y, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(232, 107, 36);
  doc.text('EAP — DETALHAMENTO POR AMBIENTE', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  for (const amb of ambientes) {
    y = checkPage(doc, y, 30);
    // Ambiente name with colored bar
    doc.setFillColor(232, 107, 36);
    doc.rect(margin, y - 4, 3, 14, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text((amb.nome || '').toUpperCase(), margin + 6, y);
    y += 6;

    // Equipamentos
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Equipamentos:', margin + 6, y);
    doc.setFont('helvetica', 'normal');
    const equipText = amb.equipamentos.join(' | ');
    const maxWidth = pageWidth - margin * 2 - 8;
    const equipLines = doc.splitTextToSize(equipText, maxWidth);
    y += 4;
    doc.setTextColor(0, 0, 0);
    for (const line of equipLines) {
      y = checkPage(doc, y, 6);
      doc.text(line, margin + 6, y);
      y += 4;
    }
    y += 2;

    // Funcionamento
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Funcionamento:', margin + 6, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += 4;
    const funcLines = doc.splitTextToSize(amb.descricao_funcionamento, maxWidth);
    for (const line of funcLines) {
      y = checkPage(doc, y, 6);
      doc.text(line, margin + 6, y);
      y += 4;
    }
    y += 2;

    // Photos for this ambiente
    if (amb.fotos && amb.fotos.length > 0 && fotoDataUrls) {
      const imgWidth = 55;
      const imgHeight = 40;
      let col = 0;
      y = checkPage(doc, y, imgHeight + 10);
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Fotos:', margin + 6, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      for (const fotoUrl of amb.fotos) {
        const dataUrl = fotoDataUrls.get(fotoUrl);
        if (!dataUrl) continue;
        const x = margin + 6 + col * (imgWidth + 6);
        if (y + imgHeight > 270) { doc.addPage(); y = 20; col = 0; }
        try {
          doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
        } catch { /* skip broken image */ }
        col++;
        if (col >= 3) { col = 0; y += imgHeight + 4; }
      }
      if (col > 0) y += imgHeight + 4;
    }

    y += 4;
  }
  return y;
}

export async function generatePropostaPDF(data: PropostaData) {
  // Safety: ensure sessao exists
  if (!data || !data.sessao) {
    throw new Error('Dados da proposta incompletos');
  }
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const safe = (v: any) => (v != null ? String(v) : '');

  // Header
  doc.setFillColor(232, 107, 36); // Orange brand color
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('OUTSOURCING PCI', pageWidth - margin, 10, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 16, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let y = 35;

  // Client info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(safe(data.sessao.nome_cliente), margin + 25, y);
  y += 6;
  if (data.sessao.endereco) {
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(safe(data.sessao.endereco), margin + 30, y);
    y += 6;
  }
  if (data.sessao.vendedor) {
    doc.setFont('helvetica', 'bold');
    doc.text('Consultor:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(safe(data.sessao.vendedor), margin + 30, y);
    y += 6;
  }
  y += 4;

  const cols = [
    { label: 'Qtd', x: 17 },
    { label: 'Descrição', x: 35 },
    { label: 'Código', x: 130 },
    { label: 'Locação (un)', x: pageWidth - 50, align: 'right' },
    { label: 'Total', x: pageWidth - 17, align: 'right' },
  ];

  const itens = data.itens;
  const hasStructuredItems = itens && (
    (itens.kits && itens.kits.length > 0) ||
    (itens.avulsos && itens.avulsos.length > 0) ||
    (itens.aproveitados && itens.aproveitados.length > 0) ||
    (itens.servicos && itens.servicos.length > 0)
  );

  if (hasStructuredItems && itens) {
    // Kits
    if (itens.kits && itens.kits.length > 0) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(232, 107, 36);
      doc.text('KITS', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
      y = drawTableHeader(doc, y, cols);
      y = drawTableRows(doc, y, itens.kits, pageWidth);
      y += 4;
    }

    // Avulsos
    if (itens.avulsos && itens.avulsos.length > 0) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(232, 107, 36);
      doc.text('ITENS AVULSOS', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
      y = drawTableHeader(doc, y, cols);
      y = drawTableRows(doc, y, itens.avulsos, pageWidth);
      y += 4;
    }

    // Aproveitados
    if (itens.aproveitados && itens.aproveitados.length > 0) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 120, 0);
      doc.text('ITENS APROVEITADOS (50% DO VALOR)', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
      y = drawTableHeader(doc, y, cols);
      y = drawTableRows(doc, y, itens.aproveitados, pageWidth);
      y += 4;
    }

    // Serviços
    if (itens.servicos && itens.servicos.length > 0) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(232, 107, 36);
      doc.text('SERVIÇOS', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
      y = drawTableHeader(doc, y, cols);
      y = drawTableRows(doc, y, itens.servicos, pageWidth);
      y += 4;
    }

    // Totals
    y = checkPage(doc, y, 20);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 18, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MENSALIDADE:', margin + 5, y + 2);
    doc.text(`R$ ${(itens.mensalidade_total || 0).toFixed(2)}/mês`, pageWidth - margin - 5, y + 2, { align: 'right' });
    doc.text('TAXA DE INSTALAÇÃO:', margin + 5, y + 10);
    doc.text(`R$ ${(itens.taxa_conexao_total || 0).toFixed(2)}`, pageWidth - margin - 5, y + 10, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`(parcela em até 10x de R$ ${((itens.taxa_conexao_total || 0) / 10).toFixed(2)})`, pageWidth - margin - 5, y + 16, { align: 'right' });
    y += 22;
  }

  // Pre-load ALL photo data URLs (both from fotos and from ambientes)
  const fotoDataUrls = new Map<string, string>();
  const allFotoUrls = new Set<string>();

  // Collect ambiente foto URLs
  const ambientes = itens?.ambientes;
  if (ambientes) {
    for (const amb of ambientes) {
      if (amb.fotos) amb.fotos.forEach(u => allFotoUrls.add(u));
    }
  }
  // Collect general foto URLs
  if (data.fotos) {
    for (const f of data.fotos) allFotoUrls.add(f.url);
  }

  // Load all in parallel
  await Promise.all(
    Array.from(allFotoUrls).map(async (url) => {
      const dataUrl = await loadImageAsDataUrl(url);
      if (dataUrl) fotoDataUrls.set(url, dataUrl);
    })
  );

  // Track which foto URLs are used by ambientes
  const usedFotoUrls = new Set<string>();

  // Ambientes / EAP — always render if available
  if (ambientes && ambientes.length > 0) {
    y += 4;
    // Mark ambiente fotos as used
    for (const amb of ambientes) {
      if (amb.fotos) amb.fotos.forEach(u => usedFotoUrls.add(u));
    }
    y = drawAmbientes(doc, y, ambientes, pageWidth, margin, fotoDataUrls);

    // If no structured tables above, build a consolidated table from ambientes
    if (!hasStructuredItems) {
      y = checkPage(doc, y, 20);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(232, 107, 36);
      doc.text('CONSOLIDAÇÃO DE EQUIPAMENTOS', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 8;

      const consolCols = [
        { label: 'Qtd', x: 17 },
        { label: 'Equipamento', x: 35 },
        { label: 'Ambiente', x: 140 },
      ];
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(51, 51, 51);
      doc.setTextColor(255, 255, 255);
      doc.rect(15, y - 4, pageWidth - 30, 7, 'F');
      for (const col of consolCols) {
        doc.text(col.label, col.x, y);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 8;

      doc.setFontSize(8);
      for (const amb of ambientes) {
        for (const eq of amb.equipamentos) {
          y = checkPage(doc, y, 6);
          const match = eq.match(/^([\d.]+)x?\s+(.+)$/i);
          const qtd = match ? match[1] : '1';
          const nome = match ? match[2] : eq;
          let truncNome = nome;
          while (doc.getTextWidth(truncNome) > 100 && truncNome.length > 3) {
            truncNome = truncNome.substring(0, truncNome.length - 4) + '...';
          }
          doc.text(qtd, 17, y);
          doc.text(truncNome, 35, y);
          doc.text(amb.nome || '', 140, y);
          doc.setDrawColor(230, 230, 230);
          doc.line(15, y + 2, pageWidth - 15, y + 2);
          y += 6;
        }
      }
      y += 4;
    }
  }

  // Remaining photos not assigned to any ambiente
  const remainingFotos = (data.fotos || []).filter(f => !usedFotoUrls.has(f.url));
  if (remainingFotos.length > 0) {
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(232, 107, 36);
    doc.text('FOTOS DA VISITA TÉCNICA', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    let col = 0;
    for (const foto of remainingFotos) {
      const dataUrl = fotoDataUrls.get(foto.url);
      if (!dataUrl) continue;

      const imgWidth = 80;
      const imgHeight = 60;
      const x = margin + col * (imgWidth + 10);

      if (y + imgHeight > 270) { doc.addPage(); y = 20; col = 0; }

      try {
        doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
        doc.setFontSize(7);
        doc.text(foto.nome.substring(0, 25), x, y + imgHeight + 4);
      } catch { /* skip */ }

      col++;
      if (col >= 2) { col = 0; y += imgHeight + 10; }
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Emive - Outsourcing PCI | Proposta ${data.sessao.nome_cliente || 'Cliente'} | Página ${p}/${totalPages}`, pageWidth / 2, 290, { align: 'center' });
    doc.text('ESTA PROPOSTA TEM VALIDADE DE 5 DIAS ÚTEIS.', pageWidth / 2, 285, { align: 'center' });
  }

  const clienteName = data.sessao.nome_cliente || 'cliente';
  const fileName = `proposta-emive-${clienteName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS && navigator.share && navigator.canShare) {
    // Best iOS approach: native share sheet with the actual file
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (e) {
        // User cancelled share — fall through to data URI
      }
    }
  }

  if (isIOS) {
    // Fallback: open as data URI — works reliably in Safari
    const dataUri = doc.output('dataurlstring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    doc.save(fileName);
  }
}
