import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Upload,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Package,
  RefreshCw,
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

export default function ControleEstoque() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const {
    isLoading,
    filteredData,
    criticalItems,
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
  } = useEstoque();

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

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Map sheet names to tipos
      const sheetTypeMap: Record<string, string> = {
        'Instalação': 'INSTALACAO',
        'Manutenção': 'MANUTENCAO',
        'Urgência': 'URGENCIA',
      };

      // Parse each sheet
      const stockData: {
        codigo: string;
        modelo: string;
        estoques: { cidade: string; tipo: string; minimo: number; atual: number }[];
      }[] = [];

      const itemMap = new Map<string, { modelo: string; estoques: { cidade: string; tipo: string; minimo: number; atual: number }[] }>();

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

        // Find the tipo for this sheet
        let tipo = '';
        
        // Check sheet name or content for tipo
        for (const [key, value] of Object.entries(sheetTypeMap)) {
          if (sheetName.toLowerCase().includes(key.toLowerCase())) {
            tipo = value;
            break;
          }
        }

        // If not found in sheet name, try first cell
        if (!tipo && jsonData[0] && jsonData[0][0]) {
          const firstCell = String(jsonData[0][0]).toLowerCase();
          if (firstCell.includes('instalação') || firstCell.includes('instalacao')) {
            tipo = 'INSTALACAO';
          } else if (firstCell.includes('manutenção') || firstCell.includes('manutencao')) {
            tipo = 'MANUTENCAO';
          } else if (firstCell.includes('urgência') || firstCell.includes('urgencia')) {
            tipo = 'URGENCIA';
          }
        }

        if (!tipo) {
          console.log(`Could not determine type for sheet: ${sheetName}`);
          continue;
        }

        // Find header row (contains "Cód Sankhya" or similar)
        let headerRowIndex = -1;
        let codigoColIndex = -1;
        let modeloColIndex = -1;
        const cidadeColIndexes: Record<string, number> = {};

        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row) continue;

          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || '').toLowerCase();
            
            if (cellValue.includes('sankhya') || cellValue === 'cód sankhya') {
              codigoColIndex = j;
              headerRowIndex = i;
            }
            if (cellValue.includes('modelo') || cellValue === 'modelo') {
              modeloColIndex = j;
            }
          }

          if (headerRowIndex === i) {
            // Find city columns (look for BH, VIX, RIO in the same row or previous row)
            for (let j = 0; j < row.length; j++) {
              const cellValue = String(row[j] || '').toUpperCase();
              const prevRowValue = i > 0 ? String(jsonData[i - 1]?.[j] || '').toUpperCase() : '';
              
              // Check current cell or header label
              if (cellValue.includes('BH') || prevRowValue.includes('BH')) {
                cidadeColIndexes['BH'] = j;
              }
              if (cellValue.includes('VIX') || prevRowValue.includes('VIX')) {
                cidadeColIndexes['VIX'] = j;
              }
              if (cellValue.includes('RIO') || prevRowValue.includes('RIO')) {
                cidadeColIndexes['RIO'] = j;
              }
            }
            break;
          }
        }

        if (headerRowIndex === -1 || codigoColIndex === -1) {
          console.log(`Could not find headers in sheet: ${sheetName}`);
          continue;
        }

        // If modelo column not found, use the column before codigo
        if (modeloColIndex === -1) {
          modeloColIndex = codigoColIndex - 1;
        }

        // Parse data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;

          const codigo = String(row[codigoColIndex] || '').trim();
          if (!codigo || codigo === 'undefined' || codigo === 'null' || codigo === '') continue;

          const modelo = String(row[modeloColIndex] || 'Sem modelo').trim();

          // Get or create item entry
          if (!itemMap.has(codigo)) {
            itemMap.set(codigo, { modelo, estoques: [] });
          }

          const item = itemMap.get(codigo)!;

          // Add stock for each city
          for (const [cidade, colIndex] of Object.entries(cidadeColIndexes)) {
            const minValue = row[colIndex];
            const minimo = typeof minValue === 'number' ? minValue : parseInt(String(minValue || '0'), 10) || 0;
            
            if (minimo > 0) {
              item.estoques.push({
                cidade,
                tipo,
                minimo,
                atual: 0, // Estoque atual starts at 0 or should come from another source
              });
            }
          }
        }
      }

      // Convert map to array
      for (const [codigo, data] of itemMap) {
        stockData.push({ codigo, ...data });
      }

      if (stockData.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'Não foi possível encontrar dados válidos na planilha.',
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      // Get auth session for the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      // Send to edge function
      const { data: result, error } = await supabase.functions.invoke('import-estoque', {
        body: { stockData, fileName: file.name },
      });

      if (error) {
        console.error('Import error:', error);
        toast({
          title: 'Erro na importação',
          description: error.message || 'Ocorreu um erro ao importar os dados.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Importação concluída',
          description: result.message,
        });
        refresh();
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Ocorreu um erro ao ler o arquivo Excel.',
        variant: 'destructive',
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

    // Create workbook
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Código', 'Modelo/Produto', 'Local', 'Mínimo', 'Atual', 'Reposição Sugerida', 'Status'],
      ...criticalItems.map(item => [
        item.codigo,
        item.modelo,
        item.nome_local,
        item.estoque_minimo,
        item.estoque_atual,
        item.reposicao_sugerida,
        ESTOQUE_STATUS_LABELS[item.status],
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Itens Críticos');

    // Generate filename with current filters
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

          <div className="flex items-center gap-2">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
              <p className="text-sm text-muted-foreground">Estoque OK</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.critico}</div>
              <p className="text-sm text-muted-foreground">Crítico</p>
            </CardContent>
          </Card>
          <Card>
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
                <Select value={filterCidade} onValueChange={setFilterCidade}>
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
                <Select value={filterTipo} onValueChange={setFilterTipo}>
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                    : 'Importe uma planilha Excel para começar'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Modelo/Produto</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Mín</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Reposição</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.slice(0, 100).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.modelo}>
                        {item.modelo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.nome_local}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.estoque_minimo}</TableCell>
                      <TableCell className="text-right">{item.estoque_atual}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.reposicao_sugerida > 0 ? item.reposicao_sugerida : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ESTOQUE_STATUS_COLORS[item.status].bg} ${ESTOQUE_STATUS_COLORS[item.status].text} gap-1`}>
                          {getStatusIcon(item.status)}
                          {ESTOQUE_STATUS_LABELS[item.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {filteredData.length > 100 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                Mostrando 100 de {filteredData.length} itens. Use os filtros para refinar a busca.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
