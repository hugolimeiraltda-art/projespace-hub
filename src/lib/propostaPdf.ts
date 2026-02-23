import jsPDF from 'jspdf';
import type { PropostaData, PropostaItem } from '@/components/orcamento/PropostaView';

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
    doc.text(String(item.qtd), 17, y);
    const nome = item.nome.length > 50 ? item.nome.substring(0, 50) + '...' : item.nome;
    doc.text(nome, 35, y);
    doc.text(item.codigo || '-', 140, y);
    doc.text(`R$ ${(item.valor_locacao || 0).toFixed(2)}`, pageWidth - 55, y, { align: 'right' });
    doc.text(`R$ ${((item.valor_locacao || 0) * item.qtd).toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
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

export async function generatePropostaPDF(data: PropostaData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

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
  doc.text(data.sessao.nome_cliente || '', margin + 25, y);
  y += 6;
  if (data.sessao.endereco) {
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.sessao.endereco, margin + 30, y);
    y += 6;
  }
  if (data.sessao.vendedor) {
    doc.setFont('helvetica', 'bold');
    doc.text('Consultor:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.sessao.vendedor, margin + 30, y);
    y += 6;
  }
  y += 4;

  const cols = [
    { label: 'Qtd', x: 17 },
    { label: 'Descrição', x: 35 },
    { label: 'Código', x: 140 },
    { label: 'Locação (un)', x: pageWidth - 55, align: 'right' },
    { label: 'Total', x: pageWidth - 17, align: 'right' },
  ];

  const itens = data.itens;
  if (itens) {
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
      const servicoCols = [
        { label: 'Qtd', x: 17 },
        { label: 'Descrição', x: 35 },
        { label: 'Código', x: 140 },
        { label: 'Locação (un)', x: pageWidth - 55, align: 'right' },
        { label: 'Total', x: pageWidth - 17, align: 'right' },
      ];
      y = drawTableHeader(doc, y, servicoCols);
      doc.setFontSize(8);
      for (const item of itens.servicos) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(String(item.qtd), 17, y);
        doc.text(item.nome.length > 50 ? item.nome.substring(0, 50) + '...' : item.nome, 35, y);
        doc.text(item.codigo || '-', 140, y);
        doc.text(`R$ ${(item.valor_locacao || 0).toFixed(2)}`, pageWidth - 55, y, { align: 'right' });
        doc.text(`R$ ${((item.valor_locacao || 0) * item.qtd).toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
        doc.setDrawColor(230, 230, 230);
        doc.line(15, y + 2, pageWidth - 15, y + 2);
        y += 6;
      }
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

  // Photos
  if (data.fotos && data.fotos.length > 0) {
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(232, 107, 36);
    doc.text('FOTOS DA VISITA TÉCNICA', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    let col = 0;
    for (const foto of data.fotos) {
      try {
        const response = await fetch(foto.url);
        const blob = await response.blob();
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        const imgWidth = 80;
        const imgHeight = 60;
        const x = margin + col * (imgWidth + 10);
        
        if (y + imgHeight > 270) { doc.addPage(); y = 20; col = 0; }
        
        doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
        doc.setFontSize(7);
        doc.text(foto.nome.substring(0, 25), x, y + imgHeight + 4);
        
        col++;
        if (col >= 2) { col = 0; y += imgHeight + 10; }
      } catch (e) {
        console.error('Error loading photo for PDF:', e);
      }
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Emive - Outsourcing PCI | Proposta ${data.sessao.nome_cliente} | Página ${p}/${totalPages}`, pageWidth / 2, 290, { align: 'center' });
    doc.text('ESTA PROPOSTA TEM VALIDADE DE 5 DIAS ÚTEIS.', pageWidth / 2, 285, { align: 'center' });
  }

  doc.save(`proposta-emive-${data.sessao.nome_cliente?.replace(/\s+/g, '-').toLowerCase() || 'cliente'}.pdf`);
}
