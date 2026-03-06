import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Package, AlertTriangle, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface EquipmentItem {
  categoria: string;
  codigo: string;
  item: string;
  quantidade: number;
  unidade: string;
  observacoes: string;
}

interface PricedEquipmentItem extends EquipmentItem {
  preco_venda_unitario: number;
  preco_venda_total: number;
  preco_locacao_unitario: number;
  preco_locacao_total: number;
  encontrado: boolean;
}

interface EquipmentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  engineeringStatus?: string | null;
}

export function EquipmentListDialog({ open, onOpenChange, projectId, projectName, engineeringStatus }: EquipmentListDialogProps) {
  const { toast } = useToast();
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadTriggered, setLoadTriggered] = useState(false);

  // Auto-load when dialog opens
  useEffect(() => {
    if (open && !hasLoaded && !loadTriggered) {
      setLoadTriggered(true);
      doLoadEquipmentList();
    }
    if (!open) {
      // Reset when closing so it re-loads next time
      setLoadTriggered(false);
      setHasLoaded(false);
      setEquipments([]);
      setError(null);
    }
  }, [open]);

  const doLoadEquipmentList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch LISTA_EQUIPAMENTOS attachments for this project
      const { data: attachments, error: attError } = await supabase
        .from('project_attachments')
        .select('arquivo_url, nome_arquivo')
        .eq('project_id', projectId)
        .eq('tipo', 'LISTA_EQUIPAMENTOS');

      if (attError) throw attError;

      if (!attachments || attachments.length === 0) {
        const passouPeloProjetista = engineeringStatus && engineeringStatus !== 'AGUARDANDO';
        if (!passouPeloProjetista) {
          setError('Este projeto não passou pela etapa de Engenharia/Projetista, por isso não possui a lista de equipamentos. A lista é gerada quando o projetista faz a devolução do projeto com os documentos técnicos.');
        } else {
          setError('Nenhum arquivo de "Lista de Equipamentos" foi encontrado na Devolução da Engenharia. Verifique se o projetista anexou o documento corretamente.');
        }
        setHasLoaded(true);
        setIsLoading(false);
        return;
      }

      // Generate signed URLs for the attachments
      const fileUrls: string[] = [];
      for (const att of attachments) {
        if (!att.arquivo_url || att.arquivo_url.startsWith('blob:') || att.arquivo_url.startsWith('data:')) continue;

        let storagePath: string | null = null;
        if (att.arquivo_url.includes('/storage/v1/object/sign/')) {
          const match = att.arquivo_url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
          if (match) {
            const fullPath = decodeURIComponent(match[1]);
            storagePath = fullPath.split('/').slice(1).join('/');
          }
        } else if (att.arquivo_url.includes('/storage/v1/object/public/')) {
          const match = att.arquivo_url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
          if (match) {
            const fullPath = decodeURIComponent(match[1]);
            storagePath = fullPath.split('/').slice(1).join('/');
          }
        }

        if (storagePath) {
          const { data: signedData } = await supabase.storage
            .from('project-attachments')
            .createSignedUrl(storagePath, 600);
          if (signedData?.signedUrl) {
            fileUrls.push(signedData.signedUrl);
          }
        }
      }

      if (fileUrls.length === 0) {
        setError('Não foi possível acessar os arquivos. Tente reenviar os documentos.');
        setHasLoaded(true);
        setIsLoading(false);
        return;
      }

      // Call edge function to extract equipment list
      const { data, error: fnError } = await supabase.functions.invoke('extract-equipment-list', {
        body: { fileUrls },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        setHasLoaded(true);
        setIsLoading(false);
        return;
      }

      const items = data?.equipamentos || [];
      setEquipments(items);
      setHasLoaded(true);

      if (items.length === 0) {
        setError('Nenhum equipamento encontrado nos documentos analisados.');
      }
    } catch (err) {
      console.error('Error extracting equipment list:', err);
      setError('Erro ao extrair lista de equipamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const exportToExcel = () => {
    if (equipments.length === 0) return;

    const wsData = [
      ['Categoria', 'Código', 'Item', 'Quantidade', 'Unidade', 'Observações'],
      ...equipments.map(eq => [
        eq.categoria || '',
        eq.codigo || '',
        eq.item || '',
        eq.quantidade || 0,
        eq.unidade || 'un',
        eq.observacoes || '',
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');
    XLSX.writeFile(wb, `equipamentos_${projectName.replace(/\s+/g, '_')}.xlsx`);

    toast({
      title: 'Excel exportado!',
      description: 'A lista de equipamentos foi baixada com sucesso.',
    });
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportPricingPdf = async () => {
    if (equipments.length === 0) return;
    setIsExportingPdf(true);

    try {
      // Collect all unique codes
      const codes = [...new Set(equipments.map(e => e.codigo).filter(Boolean))];

      // Fetch prices from orcamento_produtos by codigo
      let productsMap: Record<string, { preco_unitario: number; valor_locacao: number }> = {};
      if (codes.length > 0) {
        const { data: products } = await supabase
          .from('orcamento_produtos')
          .select('codigo, preco_unitario, valor_locacao')
          .in('codigo', codes)
          .eq('ativo', true);

        if (products) {
          for (const p of products) {
            if (p.codigo) {
              productsMap[p.codigo] = {
                preco_unitario: Number(p.preco_unitario) || 0,
                valor_locacao: Number(p.valor_locacao) || 0,
              };
            }
          }
        }
      }

      // Build priced items
      const pricedItems: PricedEquipmentItem[] = equipments.map(eq => {
        const prod = eq.codigo ? productsMap[eq.codigo] : undefined;
        const vendaUn = prod?.preco_unitario || 0;
        const locacaoUn = prod?.valor_locacao || 0;
        const qtd = eq.quantidade || 0;
        return {
          ...eq,
          preco_venda_unitario: vendaUn,
          preco_venda_total: vendaUn * qtd,
          preco_locacao_unitario: locacaoUn,
          preco_locacao_total: locacaoUn * qtd,
          encontrado: !!prod,
        };
      });

      const totalVenda = pricedItems.reduce((s, i) => s + i.preco_venda_total, 0);
      const totalLocacao = pricedItems.reduce((s, i) => s + i.preco_locacao_total, 0);
      const notFound = pricedItems.filter(i => !i.encontrado && i.codigo);

      // Generate PDF
      const doc = new jsPDF({ orientation: 'landscape' });
      const pw = doc.internal.pageSize.getWidth();
      const margin = 12;
      const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // Header
      doc.setFillColor(232, 107, 36);
      doc.rect(0, 0, pw, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTA DE EQUIPAMENTOS COM PREÇOS', margin, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(projectName, pw - margin, 10, { align: 'right' });
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pw - margin, 15, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      let y = 28;

      // Table header
      const colX = {
        cod: margin,
        desc: margin + 28,
        qtd: 135,
        vendaUn: 155,
        vendaTotal: 190,
        locUn: 225,
        locTotal: 260,
      };

      const drawHeader = (yPos: number) => {
        doc.setFillColor(51, 51, 51);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, yPos - 4, pw - margin * 2, 7, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Código', colX.cod + 1, yPos);
        doc.text('Descrição', colX.desc, yPos);
        doc.text('Qtd', colX.qtd, yPos, { align: 'center' });
        doc.text('Venda (un)', colX.vendaUn, yPos, { align: 'right' });
        doc.text('Venda Total', colX.vendaTotal, yPos, { align: 'right' });
        doc.text('Locação (un)', colX.locUn, yPos, { align: 'right' });
        doc.text('Locação Total', colX.locTotal, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        return yPos + 7;
      };

      y = drawHeader(y);
      const pageH = doc.internal.pageSize.getHeight();

      // Rows
      doc.setFontSize(7);
      for (const item of pricedItems) {
        if (y > pageH - 25) {
          doc.addPage();
          y = 15;
          y = drawHeader(y);
          doc.setFontSize(7);
        }

        if (!item.encontrado && item.codigo) {
          doc.setTextColor(180, 0, 0);
        } else {
          doc.setTextColor(0, 0, 0);
        }

        doc.text(item.codigo || '-', colX.cod + 1, y);
        // Truncate description
        let desc = item.item || '';
        const maxDescW = colX.qtd - colX.desc - 5;
        while (doc.getTextWidth(desc) > maxDescW && desc.length > 3) {
          desc = desc.substring(0, desc.length - 4) + '...';
        }
        doc.text(desc, colX.desc, y);
        doc.text(String(item.quantidade), colX.qtd, y, { align: 'center' });
        doc.text(fmt(item.preco_venda_unitario), colX.vendaUn, y, { align: 'right' });
        doc.text(fmt(item.preco_venda_total), colX.vendaTotal, y, { align: 'right' });
        doc.text(fmt(item.preco_locacao_unitario), colX.locUn, y, { align: 'right' });
        doc.text(fmt(item.preco_locacao_total), colX.locTotal, y, { align: 'right' });

        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y + 2, pw - margin, y + 2);
        y += 5.5;
      }

      doc.setTextColor(0, 0, 0);

      // Totals
      y += 3;
      if (y > pageH - 20) { doc.addPage(); y = 15; }
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 4, pw - margin * 2, 14, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL VENDA:', colX.vendaUn - 30, y + 2);
      doc.text(fmt(totalVenda), colX.vendaTotal, y + 2, { align: 'right' });
      doc.text('TOTAL LOCAÇÃO:', colX.locUn - 30, y + 2);
      doc.text(fmt(totalLocacao), colX.locTotal, y + 2, { align: 'right' });

      // Warning for missing codes
      if (notFound.length > 0) {
        y += 18;
        if (y > pageH - 15) { doc.addPage(); y = 15; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 0, 0);
        doc.text(`⚠ ${notFound.length} item(ns) não encontrado(s) no cadastro de produtos (código sem correspondência).`, margin, y);
        doc.setTextColor(0, 0, 0);
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Emive - Lista de Equipamentos | ${projectName} | Página ${p}/${totalPages}`, pw / 2, pageH - 5, { align: 'center' });
      }

      doc.save(`equipamentos-precos_${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      toast({
        title: 'PDF exportado!',
        description: notFound.length > 0
          ? `PDF gerado. ${notFound.length} código(s) não encontrado(s) no cadastro.`
          : 'Lista com preços exportada com sucesso.',
        variant: notFound.length > 0 ? 'destructive' : 'default',
      });
    } catch (err) {
      console.error('Error generating pricing PDF:', err);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Group by category
  const groupedEquipments = equipments.reduce<Record<string, EquipmentItem[]>>((acc, eq) => {
    const cat = eq.categoria || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(eq);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Lista de Equipamentos - {projectName}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Extraindo lista de equipamentos dos documentos...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadEquipmentList}>
              Tentar novamente
            </Button>
          </div>
        )}

        {hasLoaded && !isLoading && !error && equipments.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {equipments.length} equipamento(s) encontrado(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadEquipmentList}>
                  Reextrair
                </Button>
                <Button variant="outline" size="sm" onClick={exportPricingPdf} disabled={isExportingPdf}>
                  {isExportingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                  PDF com Preços
                </Button>
                <Button size="sm" onClick={exportToExcel}>
                  <Download className="w-4 h-4 mr-1" />
                  Exportar Excel
                </Button>
              </div>
            </div>

            {Object.entries(groupedEquipments).map(([category, items]) => (
              <div key={category}>
                {Object.keys(groupedEquipments).length > 1 && (
                  <h3 className="text-sm font-semibold text-primary mb-2">{category}</h3>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[80px] text-center">Qtd</TableHead>
                      <TableHead className="w-[80px] text-center">Unidade</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((eq, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground font-mono">{eq.codigo || '-'}</TableCell>
                        <TableCell className="font-medium">{eq.item}</TableCell>
                        <TableCell className="text-center">{eq.quantidade}</TableCell>
                        <TableCell className="text-center">{eq.unidade || 'un'}</TableCell>
                        <TableCell className="text-muted-foreground">{eq.observacoes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
