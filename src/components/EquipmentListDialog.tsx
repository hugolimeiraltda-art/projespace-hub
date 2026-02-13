import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Package, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface EquipmentItem {
  categoria: string;
  item: string;
  quantidade: number;
  unidade: string;
  observacoes: string;
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

  const loadEquipmentList = async () => {
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
    if (isOpen && !hasLoaded && !isLoading) {
      loadEquipmentList();
    }
  };

  const exportToExcel = () => {
    if (equipments.length === 0) return;

    const wsData = [
      ['Categoria', 'Item', 'Quantidade', 'Unidade', 'Observações'],
      ...equipments.map(eq => [
        eq.categoria || '',
        eq.item || '',
        eq.quantidade || 0,
        eq.unidade || 'un',
        eq.observacoes || '',
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 20 },
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
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[80px] text-center">Qtd</TableHead>
                      <TableHead className="w-[80px] text-center">Unidade</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((eq, idx) => (
                      <TableRow key={idx}>
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
