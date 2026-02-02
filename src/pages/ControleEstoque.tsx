import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Package,
  RefreshCw,
  Plus,
  Pencil,
  Bell,
  FileSpreadsheet,
  ShoppingCart,
  CheckCheck,
  Trash2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useEstoque } from '@/hooks/useEstoque';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import {
  ESTOQUE_TIPO_LABELS,
  ESTOQUE_STATUS_LABELS,
  ESTOQUE_STATUS_COLORS,
  type EstoqueTipo,
  type EstoqueStatus,
} from '@/types/estoque';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImportStatus {
  stage: 'idle' | 'reading' | 'processing' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
  details?: string;
  itemsProcessed?: number;
  totalItems?: number;
}

export default function ControleEstoque() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [newProductCodigo, setNewProductCodigo] = useState('');
  const [newProductModelo, setNewProductModelo] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const {
    isLoading,
    filteredData,
    criticalItems,
    itensParaCompra,
    alertas,
    alertasNaoLidos,
    locais,
    locaisFiltrados,
    cidades,
    tipos,
    stats,
    filterCidade,
    setFilterCidade,
    filterTipo,
    setFilterTipo,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    refresh,
    updateEstoqueAtual,
    updateEstoqueMinimo,
    createProduct,
    deleteProduct,
    marcarAlertaLido,
    marcarTodosAlertasLidos,
  } = useEstoque();

  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Mapeamento de códigos de local de estoque para cidade e tipo
  const LOCATION_CODE_MAP: Record<string, { cidade: string; tipo: string }> = {
    '135000': { cidade: 'BH', tipo: 'INSTALACAO' },
    '139000': { cidade: 'BH', tipo: 'MANUTENCAO' },
    '225104': { cidade: 'VIX', tipo: 'MANUTENCAO' },
    '2205900': { cidade: 'RIO', tipo: 'MANUTENCAO' },
    '2250800': { cidade: 'CD_SR', tipo: 'INSTALACAO' },
  };

  const resetImportStatus = () => {
    setImportStatus({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportStatus({
      stage: 'reading',
      progress: 10,
      message: 'Lendo arquivo Excel...',
      details: file.name,
    });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      setImportStatus({
        stage: 'processing',
        progress: 20,
        message: 'Processando planilha...',
        details: 'Buscando cabeçalhos e colunas',
      });

      // Pegar a primeira aba
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

      // Encontrar a linha de cabeçalho (procurar por "Código" ou "Produto")
      let headerRowIndex = -1;
      let codigoColIndex = -1;  // Coluna D - Código
      let produtoColIndex = -1; // Coluna E - Produto
      let localColIndex = -1;   // Coluna F - Local (código do local de estoque)
      let estoqueColIndex = -1; // Coluna J - Estoque

      // Função para normalizar texto (remover acentos e espaços extras)
      const normalizeText = (text: string): string => {
        return text
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      };

      console.log('Procurando cabeçalhos na planilha...');
      
      for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
          const cellValue = normalizeText(String(row[j] || ''));
          
          // Verificar variações do nome da coluna
          if (cellValue === 'codigo' || cellValue === 'cod' || cellValue === 'cod.') {
            codigoColIndex = j;
            headerRowIndex = i;
          }
          if (cellValue === 'produto' || cellValue === 'descricao' || cellValue === 'modelo') {
            produtoColIndex = j;
          }
          if (cellValue === 'local' || cellValue === 'loc' || cellValue === 'local est.' || cellValue === 'local estoque') {
            localColIndex = j;
          }
          if (cellValue === 'estoque' || cellValue === 'qtd' || cellValue === 'quantidade' || cellValue === 'saldo') {
            estoqueColIndex = j;
          }
        }

        if (headerRowIndex === i) {
          console.log(`Cabeçalho encontrado na linha ${i}:`, {
            codigoCol: codigoColIndex,
            produtoCol: produtoColIndex,
            localCol: localColIndex,
            estoqueCol: estoqueColIndex
          });
          break;
        }
      }

      if (headerRowIndex === -1 || codigoColIndex === -1 || localColIndex === -1 || estoqueColIndex === -1) {
        console.error('Colunas não encontradas:', { headerRowIndex, codigoColIndex, localColIndex, estoqueColIndex });
        console.log('Primeiras 5 linhas da planilha:', jsonData.slice(0, 5));
        setImportStatus({
          stage: 'error',
          progress: 100,
          message: 'Formato de planilha inválido',
          details: `Não foi possível encontrar as colunas necessárias. Encontrado: Código=${codigoColIndex >= 0 ? 'Sim' : 'Não'}, Local=${localColIndex >= 0 ? 'Sim' : 'Não'}, Estoque=${estoqueColIndex >= 0 ? 'Sim' : 'Não'}`,
        });
        setIsImporting(false);
        return;
      }

      setImportStatus({
        stage: 'processing',
        progress: 40,
        message: 'Filtrando dados válidos...',
        details: 'Verificando locais de estoque permitidos',
      });

      // Processar linhas de dados filtrando apenas os locais válidos
      const stockRows: { codigo: string; modelo: string; localCode: string; estoque: number }[] = [];
      let linhasProcessadas = 0;
      let linhasComLocalValido = 0;
      const totalLinhas = jsonData.length - headerRowIndex - 1;

      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;

        linhasProcessadas++;

        // Update progress every 1000 rows
        if (linhasProcessadas % 1000 === 0) {
          const progressPercent = 40 + Math.round((linhasProcessadas / totalLinhas) * 30);
          setImportStatus({
            stage: 'processing',
            progress: Math.min(progressPercent, 70),
            message: 'Processando dados...',
            details: `${linhasProcessadas.toLocaleString('pt-BR')} linhas processadas`,
            itemsProcessed: linhasProcessadas,
            totalItems: totalLinhas,
          });
        }

        const codigo = String(row[codigoColIndex] || '').trim();
        if (!codigo || codigo === 'undefined' || codigo === 'null' || codigo === '') continue;

        const localCode = String(row[localColIndex] || '').trim();
        
        // Verificar se é um local válido
        if (!LOCATION_CODE_MAP[localCode]) continue;

        linhasComLocalValido++;

        const modelo = String(row[produtoColIndex] || 'Sem modelo').trim();
        
        // Pegar estoque da coluna J - converter string com vírgula para número
        let estoqueValue = row[estoqueColIndex];
        let estoque = 0;
        
        if (typeof estoqueValue === 'number') {
          estoque = estoqueValue;
        } else if (typeof estoqueValue === 'string') {
          // Remover separadores de milhar (.) e converter vírgula para ponto
          const cleanValue = estoqueValue.replace(/\./g, '').replace(',', '.');
          estoque = parseFloat(cleanValue) || 0;
        }

        // Incluir mesmo itens com estoque 0 ou maior
        if (estoque >= 0) {
          stockRows.push({
            codigo,
            modelo,
            localCode,
            estoque,
          });
        }
      }

      console.log(`Linhas processadas: ${linhasProcessadas}, com local válido: ${linhasComLocalValido}, para importar: ${stockRows.length}`);

      if (stockRows.length === 0) {
        setImportStatus({
          stage: 'error',
          progress: 100,
          message: 'Nenhum dado encontrado',
          details: `Processadas ${linhasProcessadas.toLocaleString('pt-BR')} linhas, mas nenhuma com locais válidos (135000, 139000, 225104, 2205900, 2250800).`,
        });
        setIsImporting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setImportStatus({
          stage: 'error',
          progress: 100,
          message: 'Sessão expirada',
          details: 'Por favor, faça login novamente.',
        });
        setIsImporting(false);
        return;
      }

      // Process in batches to avoid timeout
      const BATCH_SIZE = 200;
      const batches = [];
      for (let i = 0; i < stockRows.length; i += BATCH_SIZE) {
        batches.push(stockRows.slice(i, i + BATCH_SIZE));
      }

      let totalItemsProcessed = 0;
      let totalStockRecords = 0;
      let hasError = false;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 75 + Math.round((batchIndex / batches.length) * 20);

        setImportStatus({
          stage: 'uploading',
          progress: progressPercent,
          message: `Enviando lote ${batchIndex + 1} de ${batches.length}...`,
          details: `${batch.length} registros neste lote`,
          itemsProcessed: totalItemsProcessed,
          totalItems: stockRows.length,
        });

        console.log(`Enviando lote ${batchIndex + 1}/${batches.length} com ${batch.length} registros`);

        try {
          const { data: result, error } = await supabase.functions.invoke('import-estoque', {
            body: { stockRows: batch, fileName: file.name },
          });

          if (error) {
            console.error('Import error on batch:', batchIndex + 1, error);
            let errorMessage = error.message || 'Ocorreu um erro ao importar os dados.';
            
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
              errorMessage = 'Timeout ou erro de conexão. Tente novamente em alguns instantes.';
            }
            
            setImportStatus({
              stage: 'error',
              progress: 100,
              message: `Erro no lote ${batchIndex + 1}`,
              details: errorMessage,
            });
            hasError = true;
            break;
          } else {
            totalItemsProcessed += result.itemsProcessed || 0;
            totalStockRecords += result.stockRecordsCreated || 0;
          }
        } catch (invokeError: any) {
          console.error('Edge function invoke error on batch:', batchIndex + 1, invokeError);
          let errorDetail = 'Falha ao comunicar com o servidor.';
          
          if (invokeError?.message?.includes('Failed to fetch')) {
            errorDetail = 'Timeout ou erro de conexão. Tente novamente em alguns instantes.';
          } else if (invokeError?.message) {
            errorDetail = invokeError.message;
          }
          
          setImportStatus({
            stage: 'error',
            progress: 100,
            message: `Erro no lote ${batchIndex + 1}`,
            details: errorDetail,
          });
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        setImportStatus({
          stage: 'success',
          progress: 100,
          message: 'Importação concluída com sucesso!',
          details: `${totalItemsProcessed} produtos processados, ${totalStockRecords} registros de estoque atualizados.`,
          itemsProcessed: totalItemsProcessed,
        });
        refresh();
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      setImportStatus({
        stage: 'error',
        progress: 100,
        message: 'Erro ao processar arquivo',
        details: error?.message || 'Ocorreu um erro ao ler o arquivo Excel.',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportCriticos = () => {
    if (criticalItems.length === 0) {
      toast({
        title: 'Nenhum item crítico',
        description: 'Não há itens críticos para exportar com os filtros atuais.',
        variant: 'destructive',
      });
      return;
    }

    const columnsToShow = locaisFiltrados.length > 0 ? locaisFiltrados : locais;

    const wb = XLSX.utils.book_new();
    const headers: (string | number)[] = ['Código', 'Modelo/Produto'];
    columnsToShow.forEach(local => {
      headers.push(`${local.nome_local} - Mín`);
      headers.push(`${local.nome_local} - Atual`);
    });
    headers.push('Status');

    const wsData: (string | number)[][] = [headers];
    criticalItems.forEach(item => {
      const row: (string | number)[] = [item.codigo, item.modelo];
      columnsToShow.forEach(local => {
        const est = item.estoques[local.id];
        row.push(est?.minimo ?? 0);
        row.push(est?.atual ?? 0);
      });
      row.push(item.statusGeral);
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Itens Críticos');

    const filterParts = [];
    if (filterCidade) filterParts.push(filterCidade);
    if (filterTipo) filterParts.push(ESTOQUE_TIPO_LABELS[filterTipo as EstoqueTipo] || filterTipo);
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';

    XLSX.writeFile(wb, `itens_criticos${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Exportação concluída',
      description: `${criticalItems.length} itens críticos exportados.`,
    });
  };

  // Export purchase report
  const handleExportRelatorioCompras = () => {
    if (itensParaCompra.length === 0) {
      toast({
        title: 'Nenhum item para compra',
        description: 'Não há itens que precisam ser comprados.',
        variant: 'destructive',
      });
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // Summary by product (aggregate all locations)
    const summaryMap = new Map<string, { codigo: string; modelo: string; totalComprar: number; detalhes: string[] }>();
    
    for (const item of itensParaCompra) {
      const key = item.codigo;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { 
          codigo: item.codigo, 
          modelo: item.modelo, 
          totalComprar: 0,
          detalhes: []
        });
      }
      const entry = summaryMap.get(key)!;
      entry.totalComprar += item.quantidade_comprar;
      entry.detalhes.push(`${item.local}: ${item.quantidade_comprar} un`);
    }

    // Sheet 1: Summary
    const summaryData: (string | number)[][] = [
      ['RELATÓRIO DE COMPRAS - RESUMO'],
      [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['Código', 'Modelo/Produto', 'Qtd Total a Comprar', 'Detalhes por Local'],
    ];
    
    const summaryArray = Array.from(summaryMap.values()).sort((a, b) => b.totalComprar - a.totalComprar);
    for (const item of summaryArray) {
      summaryData.push([item.codigo, item.modelo, item.totalComprar, item.detalhes.join('; ')]);
    }
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    // Sheet 2: Detailed by location
    const detailedData: (string | number)[][] = [
      ['RELATÓRIO DE COMPRAS - DETALHADO POR LOCAL'],
      [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['Código', 'Modelo/Produto', 'Local', 'Cidade', 'Tipo', 'Estoque Mínimo', 'Estoque Atual', 'Qtd a Comprar'],
    ];
    
    for (const item of itensParaCompra) {
      detailedData.push([
        item.codigo,
        item.modelo,
        item.local,
        item.cidade,
        ESTOQUE_TIPO_LABELS[item.tipo as EstoqueTipo] || item.tipo,
        item.estoque_minimo,
        item.estoque_atual,
        item.quantidade_comprar,
      ]);
    }
    
    const wsDetailed = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detalhado');

    // Sheet 3: By city
    const cities = [...new Set(itensParaCompra.map(i => i.cidade))];
    for (const cidade of cities) {
      const cityItems = itensParaCompra.filter(i => i.cidade === cidade);
      const cityData: (string | number)[][] = [
        [`COMPRAS - ${cidade}`],
        [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
        [],
        ['Código', 'Modelo/Produto', 'Local', 'Tipo', 'Mín', 'Atual', 'Comprar'],
      ];
      
      for (const item of cityItems) {
        cityData.push([
          item.codigo,
          item.modelo,
          item.local,
          ESTOQUE_TIPO_LABELS[item.tipo as EstoqueTipo] || item.tipo,
          item.estoque_minimo,
          item.estoque_atual,
          item.quantidade_comprar,
        ]);
      }
      
      const wsCity = XLSX.utils.aoa_to_sheet(cityData);
      XLSX.utils.book_append_sheet(wb, wsCity, cidade);
    }

    XLSX.writeFile(wb, `relatorio_compras_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Relatório de compras gerado',
      description: `${itensParaCompra.length} itens exportados para compra.`,
    });
  };

  const getStatusIcon = (status: EstoqueStatus) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CRITICO':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleCardClick = (status: EstoqueStatus | '') => {
    if (filterStatus === status) {
      setFilterStatus('');
    } else {
      setFilterStatus(status);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductCodigo.trim() || !newProductModelo.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o código e o modelo do produto.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingProduct(true);
    const success = await createProduct(newProductCodigo.trim(), newProductModelo.trim());
    setIsCreatingProduct(false);

    if (success) {
      setShowNewProductDialog(false);
      setNewProductCodigo('');
      setNewProductModelo('');
    }
  };

  const displayLocais = locaisFiltrados.length > 0 ? locaisFiltrados : locais;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6" />
              Controle de Estoque
            </h1>
            <p className="text-muted-foreground">
              Gerencie o estoque mínimo e atual por local
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Alerts Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Bell className="h-4 w-4 mr-2" />
                  Alertas
                  {alertasNaoLidos > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                      {alertasNaoLidos}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Alertas de Estoque
                    </SheetTitle>
                    {alertasNaoLidos > 0 && (
                      <Button variant="ghost" size="sm" onClick={marcarTodosAlertasLidos}>
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Marcar todos como lidos
                      </Button>
                    )}
                  </div>
                  <SheetDescription>
                    Itens com estoque abaixo do mínimo
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                  {alertas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                      <p className="text-muted-foreground">Nenhum alerta no momento</p>
                      <p className="text-sm text-muted-foreground">Todos os itens estão com estoque adequado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alertas.map(alerta => (
                        <div 
                          key={alerta.id} 
                          className={cn(
                            "p-3 rounded-lg border transition-colors cursor-pointer",
                            alerta.lido ? "bg-background" : "bg-red-50 border-red-200"
                          )}
                          onClick={() => !alerta.lido && marcarAlertaLido(alerta.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-sm">{alerta.item_codigo}</span>
                                {!alerta.lido && (
                                  <Badge variant="destructive" className="text-xs">Novo</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {alerta.item_modelo}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {alerta.local_nome}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">
                                Faltam {alerta.quantidade_faltante} un
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {alerta.estoque_atual}/{alerta.estoque_minimo}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(alerta.created_at), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Purchase Report Button */}
            <Button 
              variant="default" 
              onClick={handleExportRelatorioCompras}
              disabled={itensParaCompra.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Relatório de Compras ({itensParaCompra.length})
            </Button>

            <Button onClick={() => setShowNewProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar Excel'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCriticos}
              disabled={criticalItems.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Críticos ({criticalItems.length})
            </Button>
            <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Import Status Progress */}
        {importStatus.stage !== 'idle' && (
          <Alert
            variant={importStatus.stage === 'error' ? 'destructive' : 'default'}
            className={cn(
              'relative',
              importStatus.stage === 'success' && 'border-green-500 bg-green-50',
              (importStatus.stage === 'reading' || importStatus.stage === 'processing' || importStatus.stage === 'uploading') && 'border-blue-500 bg-blue-50'
            )}
          >
            <div className="flex items-start gap-3">
              {importStatus.stage === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
              {importStatus.stage === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {(importStatus.stage === 'reading' || importStatus.stage === 'processing' || importStatus.stage === 'uploading') && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              <div className="flex-1 space-y-2">
                <AlertTitle className={cn(
                  importStatus.stage === 'success' && 'text-green-800',
                  (importStatus.stage === 'reading' || importStatus.stage === 'processing' || importStatus.stage === 'uploading') && 'text-blue-800'
                )}>
                  {importStatus.message}
                </AlertTitle>
                {importStatus.details && (
                  <AlertDescription className={cn(
                    importStatus.stage === 'success' && 'text-green-700',
                    (importStatus.stage === 'reading' || importStatus.stage === 'processing' || importStatus.stage === 'uploading') && 'text-blue-700'
                  )}>
                    {importStatus.details}
                  </AlertDescription>
                )}
                {(importStatus.stage === 'reading' || importStatus.stage === 'processing' || importStatus.stage === 'uploading') && (
                  <Progress value={importStatus.progress} className="h-2 mt-2" />
                )}
                {importStatus.itemsProcessed !== undefined && importStatus.stage === 'success' && (
                  <p className="text-sm text-green-700 font-medium">
                    {importStatus.itemsProcessed.toLocaleString('pt-BR')} produtos processados
                  </p>
                )}
              </div>
              {(importStatus.stage === 'success' || importStatus.stage === 'error') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImportStatus}
                  className="shrink-0"
                >
                  Fechar
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filterStatus === '' && "ring-2 ring-primary"
            )}
            onClick={() => handleCardClick('')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filterStatus === 'OK' && "ring-2 ring-green-500"
            )}
            onClick={() => handleCardClick('OK')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
              <p className="text-sm text-muted-foreground">Estoque OK</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filterStatus === 'CRITICO' && "ring-2 ring-red-500"
            )}
            onClick={() => handleCardClick('CRITICO')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.critico}</div>
              <p className="text-sm text-muted-foreground">Crítico</p>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              filterStatus === 'SEM_BASE' && "ring-2 ring-gray-500"
            )}
            onClick={() => handleCardClick('SEM_BASE')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-500">{stats.semBase}</div>
              <p className="text-sm text-muted-foreground">Sem Base</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Cidade</Label>
                <Select value={filterCidade || 'all'} onValueChange={(v) => setFilterCidade(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cidades.map(cidade => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Estoque</Label>
                <Select value={filterTipo || 'all'} onValueChange={(v) => setFilterTipo(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tipos.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        {ESTOQUE_TIPO_LABELS[tipo as EstoqueTipo] || tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="CRITICO">Crítico</SelectItem>
                    <SelectItem value="SEM_BASE">Sem Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Código ou modelo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Nenhum item encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm || filterCidade || filterTipo || filterStatus
                    ? 'Tente ajustar os filtros'
                    : 'Importe uma planilha Excel ou adicione um novo produto'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Código</TableHead>
                      <TableHead className="sticky left-[80px] bg-background z-10 min-w-[200px]">Modelo/Produto</TableHead>
                      {displayLocais.map(local => (
                        <TableHead key={local.id} className="text-center min-w-[120px]" colSpan={2}>
                          {local.nome_local}
                        </TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]">Ações</TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky left-0 bg-muted/50 z-10"></TableHead>
                      <TableHead className="sticky left-[80px] bg-muted/50 z-10"></TableHead>
                      {displayLocais.map(local => (
                        <TableHead key={`${local.id}-header`} className="text-center" colSpan={2}>
                          <div className="flex justify-around text-xs font-normal">
                            <span>Mín</span>
                            <span>Atual</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedData = filteredData.slice(startIndex, endIndex);
                      
                      return paginatedData.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="sticky left-0 bg-background font-mono text-sm">{item.codigo}</TableCell>
                          <TableCell className="sticky left-[80px] bg-background max-w-[200px] truncate" title={item.modelo}>
                            {item.modelo}
                          </TableCell>
                          {displayLocais.map(local => {
                            const est = item.estoques[local.id];
                            const status = est?.status || 'SEM_BASE';
                            const bgColor = status === 'CRITICO' ? 'bg-red-50' : status === 'OK' ? 'bg-green-50' : '';
                            return (
                              <TableCell key={`${local.id}-${item.id}`} className={cn("p-0", bgColor)} colSpan={2}>
                                <div className="flex justify-around items-center">
                                  <div 
                                    className="text-center px-2 py-1 w-1/2 border-r border-border/50 cursor-pointer hover:bg-accent/50 transition-colors group flex items-center justify-center"
                                  >
                                    <EditableCellContent
                                      id={`edit-min-${item.id}-${local.id}`}
                                      value={est?.minimo ?? 0}
                                      itemId={item.id}
                                      localId={local.id}
                                      onSave={updateEstoqueMinimo}
                                    />
                                  </div>
                                  <div 
                                    className="text-center px-2 py-1 w-1/2 cursor-pointer hover:bg-accent/50 transition-colors group flex items-center justify-center"
                                  >
                                    <EditableCellContent
                                      id={`edit-atual-${item.id}-${local.id}`}
                                      value={est?.atual ?? 0}
                                      itemId={item.id}
                                      localId={local.id}
                                      onSave={updateEstoqueAtual}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <Badge className={`${ESTOQUE_STATUS_COLORS[item.statusGeral].bg} ${ESTOQUE_STATUS_COLORS[item.statusGeral].text} gap-1`}>
                              {getStatusIcon(item.statusGeral)}
                              {ESTOQUE_STATUS_LABELS[item.statusGeral]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o produto <strong>{item.codigo}</strong> - {item.modelo}?
                                    Esta ação não pode ser desfeita e todos os registros de estoque serão removidos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async () => {
                                      setDeletingProductId(item.id);
                                      await deleteProduct(item.id);
                                      setDeletingProductId(null);
                                    }}
                                    disabled={deletingProductId === item.id}
                                  >
                                    {deletingProductId === item.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredData.length > 0 && (
              <div className="p-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)} - {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} itens
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredData.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, arr) => {
                        const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                        return (
                          <span key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[36px]"
                            >
                              {page}
                            </Button>
                          </span>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Product Dialog */}
      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>
              Adicione um novo produto ao estoque. Depois de criado, você pode definir os valores de estoque mínimo e atual por local.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código (Sankhya)</Label>
              <Input
                id="codigo"
                value={newProductCodigo}
                onChange={(e) => setNewProductCodigo(e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo / Produto</Label>
              <Input
                id="modelo"
                value={newProductModelo}
                onChange={(e) => setNewProductModelo(e.target.value)}
                placeholder="Ex: CÂMERA BULLET HD 1080P"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProduct} disabled={isCreatingProduct}>
              {isCreatingProduct ? 'Criando...' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// Simple inline editable content
function EditableCellContent({
  id,
  value,
  itemId,
  localId,
  onSave,
}: {
  id: string;
  value: number;
  itemId: string;
  localId: string;
  onSave: (itemId: string, localId: string, newValue: number) => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditValue(value.toString());
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    const newValue = parseInt(editValue, 10);
    if (isNaN(newValue) || newValue < 0) {
      setEditValue(value.toString());
      setIsEditing(false);
      return;
    }

    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(itemId, localId, newValue);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
    } else {
      setEditValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min="0"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="w-14 h-6 text-center text-sm p-1"
        disabled={isSaving}
      />
    );
  }

  return (
    <span 
      id={id}
      className="inline-flex items-center gap-1 cursor-pointer"
      onClick={handleStartEdit}
    >
      {value}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}