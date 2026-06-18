import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserX, Plus, Search, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MOTIVOS = [
  'Concorrência',
  'Retrocedeu a tecnologia',
  'Insatisfação com serviço prestado',
  'Preço',
];

const FILIAIS = ['BHZ', 'VIX', 'RJ', 'SPO'];

interface ClienteInativo {
  id: string;
  contrato: string;
  cod_sp: string | null;
  razao_social: string;
  endereco: string | null;
  cidade: string | null;
  filial: string | null;
  data_entrada: string | null;
  data_cancelamento: string;
  data_termino: string | null;
  mensalidade: number | null;
  motivo: string;
  observacoes: string | null;
  created_by_name: string | null;
  created_at: string;
}

type SortKey =
  | 'contrato' | 'cod_sp' | 'razao_social' | 'cidade' | 'filial'
  | 'data_entrada' | 'data_termino' | 'data_cancelamento'
  | 'mensalidade' | 'valor_total' | 'motivo';
type SortDir = 'asc' | 'desc' | null;

const formatBRL = (v: number | null) =>
  v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const calcValorTotalPago = (mensalidade: number | null, entrada: string | null, cancelamento: string) => {
  if (!mensalidade || !entrada) return null;
  const d1 = parseISO(entrada);
  const d2 = parseISO(cancelamento);
  const meses = Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  return mensalidade * meses;
};

function ColumnHeader({
  label, sortKey, currentSort, currentDir, onSort,
  filterValues, selectedFilters, onFilterChange, className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  filterValues: string[];
  selectedFilters: string[];
  onFilterChange: (key: SortKey, values: string[]) => void;
  className?: string;
}) {
  const [filterSearch, setFilterSearch] = useState('');
  const isActive = currentSort === sortKey;
  const hasFilter = selectedFilters.length > 0;
  const filteredValues = filterValues.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
  const toggleValue = (val: string) => {
    const next = selectedFilters.includes(val)
      ? selectedFilters.filter(v => v !== val)
      : [...selectedFilters, val];
    onFilterChange(sortKey, next);
  };
  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(sortKey)}
          className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-medium"
        >
          {label}
          {isActive && currentDir === 'asc' && <ArrowUp className="h-3 w-3" />}
          {isActive && currentDir === 'desc' && <ArrowDown className="h-3 w-3" />}
          {!isActive && <ArrowUpDown className="h-3 w-3 opacity-30" />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className={`p-0.5 rounded hover:bg-accent transition-colors ${hasFilter ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}>
              <Filter className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Buscar..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="h-7 text-xs"
              />
              {hasFilter && (
                <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => onFilterChange(sortKey, [])}>
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {filteredValues.map(val => (
                    <label key={val} className="flex items-center gap-2 text-xs py-0.5 px-1 hover:bg-accent rounded cursor-pointer">
                      <Checkbox
                        checked={selectedFilters.includes(val)}
                        onCheckedChange={() => toggleValue(val)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate">{val}</span>
                    </label>
                  ))}
                  {filteredValues.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum valor</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TableHead>
  );
}

export default function SucessoClienteInativos() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteInativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  // Form state
  const [contrato, setContrato] = useState('');
  const [codSp, setCodSp] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [filial, setFilial] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataCancelamento, setDataCancelamento] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [mensalidade, setMensalidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes_inativos' as any)
      .select('*')
      .order('data_cancelamento', { ascending: false });
    if (!error && data) setClientes(data as any as ClienteInativo[]);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const resetForm = () => {
    setContrato(''); setCodSp(''); setRazaoSocial(''); setEndereco(''); setCidade('');
    setFilial(''); setDataEntrada(''); setDataCancelamento(''); setDataTermino('');
    setMensalidade(''); setMotivo(''); setObservacoes('');
  };

  const handleSalvar = async () => {
    if (!contrato || !razaoSocial || !dataCancelamento || !motivo) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios: Contrato, Razão Social, Data de Cancelamento e Motivo.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes_inativos' as any)
        .insert({
          contrato, cod_sp: codSp || null, razao_social: razaoSocial,
          endereco: endereco || null, cidade: cidade || null, filial: filial || null,
          data_entrada: dataEntrada || null, data_cancelamento: dataCancelamento,
          data_termino: dataTermino || null,
          mensalidade: mensalidade ? Number(mensalidade.replace(',', '.')) : null,
          motivo, observacoes: observacoes || null,
          created_by: user?.id, created_by_name: user?.nome,
        } as any);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Cliente inativo cadastrado com sucesso.' });
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o cliente inativo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    const { error } = await supabase.from('clientes_inativos' as any).delete().eq('id', id);
    if (!error) {
      toast({ title: 'Excluído', description: 'Registro removido com sucesso.' });
      fetchClientes();
    } else {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const getMotivoBadge = (m: string) => {
    const colors: Record<string, string> = {
      'Concorrência': 'bg-orange-500',
      'Retrocedeu a tecnologia': 'bg-blue-500',
      'Insatisfação com serviço prestado': 'bg-red-500',
      'Preço': 'bg-yellow-600',
    };
    return <Badge className={`${colors[m] || 'bg-muted'} text-white`}>{m}</Badge>;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (key: SortKey, values: string[]) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (values.length === 0) delete next[key];
      else next[key] = values;
      return next;
    });
  };

  const fmtDate = (d: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy') : '');

  const getDisplayValue = (c: ClienteInativo, key: SortKey): string => {
    switch (key) {
      case 'contrato': return c.contrato;
      case 'cod_sp': return c.cod_sp || '';
      case 'razao_social': return c.razao_social;
      case 'cidade': return c.cidade || '';
      case 'filial': return c.filial || '';
      case 'data_entrada': return fmtDate(c.data_entrada);
      case 'data_termino': return fmtDate(c.data_termino);
      case 'data_cancelamento': return fmtDate(c.data_cancelamento);
      case 'mensalidade': return c.mensalidade != null ? formatBRL(c.mensalidade) : '';
      case 'valor_total': {
        const v = calcValorTotalPago(c.mensalidade, c.data_entrada, c.data_cancelamento);
        return v != null ? formatBRL(v) : '';
      }
      case 'motivo': return c.motivo;
      default: return '';
    }
  };

  const getSortValue = (c: ClienteInativo, key: SortKey): string | number => {
    switch (key) {
      case 'contrato': return c.contrato.toLowerCase();
      case 'cod_sp': return (c.cod_sp || '').toLowerCase();
      case 'razao_social': return c.razao_social.toLowerCase();
      case 'cidade': return (c.cidade || '').toLowerCase();
      case 'filial': return (c.filial || '').toLowerCase();
      case 'data_entrada': return c.data_entrada || '';
      case 'data_termino': return c.data_termino || '';
      case 'data_cancelamento': return c.data_cancelamento || '';
      case 'mensalidade': return c.mensalidade ?? -1;
      case 'valor_total': return calcValorTotalPago(c.mensalidade, c.data_entrada, c.data_cancelamento) ?? -1;
      case 'motivo': return c.motivo.toLowerCase();
      default: return '';
    }
  };

  const filterOptions = useMemo(() => {
    const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
    const keys: SortKey[] = ['contrato','cod_sp','razao_social','cidade','filial','data_entrada','data_termino','data_cancelamento','mensalidade','valor_total','motivo'];
    const out: Record<string, string[]> = {};
    for (const k of keys) out[k] = unique(clientes.map(c => getDisplayValue(c, k)));
    return out;
  }, [clientes]);

  const processed = useMemo(() => {
    let result = clientes.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!(
          c.razao_social.toLowerCase().includes(s) ||
          c.contrato.toLowerCase().includes(s) ||
          (c.cidade || '').toLowerCase().includes(s) ||
          (c.filial || '').toLowerCase().includes(s) ||
          (c.cod_sp || '').toLowerCase().includes(s)
        )) return false;
      }
      for (const [key, values] of Object.entries(columnFilters)) {
        if (values.length === 0) continue;
        if (!values.includes(getDisplayValue(c, key as SortKey))) return false;
      }
      return true;
    });
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        const cmp = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'pt-BR');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [clientes, search, sortKey, sortDir, columnFilters]);

  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes Inativos</h1>
            <p className="text-muted-foreground">Gestão de contratos cancelados e churn</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-sm text-muted-foreground">Total Inativos</p>
            </CardContent>
          </Card>
          {MOTIVOS.map(m => {
            const count = clientes.filter(c => c.motivo === m).length;
            return (
              <Card key={m}>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-sm text-muted-foreground">{m}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Contratos Cancelados
            </CardTitle>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setColumnFilters({})}>
                  <X className="h-3 w-3 mr-1" />
                  Limpar {activeFilterCount} filtro(s)
                </Button>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : processed.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum cliente inativo registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <ColumnHeader label="Contrato" sortKey="contrato" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.contrato} selectedFilters={columnFilters.contrato || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Cód SP" sortKey="cod_sp" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.cod_sp} selectedFilters={columnFilters.cod_sp || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Razão Social" sortKey="razao_social" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.razao_social} selectedFilters={columnFilters.razao_social || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Cidade" sortKey="cidade" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.cidade} selectedFilters={columnFilters.cidade || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Filial" sortKey="filial" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.filial} selectedFilters={columnFilters.filial || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Data Início" sortKey="data_entrada" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_entrada} selectedFilters={columnFilters.data_entrada || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Data Término" sortKey="data_termino" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_termino} selectedFilters={columnFilters.data_termino || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Data Cancelamento" sortKey="data_cancelamento" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_cancelamento} selectedFilters={columnFilters.data_cancelamento || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Mensalidade" sortKey="mensalidade" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.mensalidade} selectedFilters={columnFilters.mensalidade || []} onFilterChange={handleFilterChange} className="text-right" />
                      <ColumnHeader label="Valor Total Pago" sortKey="valor_total" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.valor_total} selectedFilters={columnFilters.valor_total || []} onFilterChange={handleFilterChange} className="text-right" />
                      <ColumnHeader label="Motivo" sortKey="motivo" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.motivo} selectedFilters={columnFilters.motivo || []} onFilterChange={handleFilterChange} />
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processed.map(c => {
                      const totalPago = calcValorTotalPago(c.mensalidade, c.data_entrada, c.data_cancelamento);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.contrato}</TableCell>
                          <TableCell>{c.cod_sp || '-'}</TableCell>
                          <TableCell>{c.razao_social}</TableCell>
                          <TableCell>{c.cidade || '-'}</TableCell>
                          <TableCell>
                            {c.filial ? <Badge variant="outline">{c.filial}</Badge> : '-'}
                          </TableCell>
                          <TableCell>{c.data_entrada ? format(parseISO(c.data_entrada), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>{c.data_termino ? format(parseISO(c.data_termino), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>{format(parseISO(c.data_cancelamento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right">{formatBRL(c.mensalidade)}</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(totalPago)}</TableCell>
                          <TableCell>{getMotivoBadge(c.motivo)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleExcluir(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Cadastrar Cliente Inativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contrato *</Label>
                <Input value={contrato} onChange={e => setContrato(e.target.value)} placeholder="Nº do contrato" />
              </div>
              <div>
                <Label>Cód SP</Label>
                <Input value={codSp} onChange={e => setCodSp(e.target.value)} placeholder="Ex.: SP91" />
              </div>
            </div>
            <div>
              <Label>Razão Social *</Label>
              <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Nome do condomínio" />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Endereço completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={filial} onValueChange={setFilial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILIAIS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input type="date" value={dataTermino} onChange={e => setDataTermino(e.target.value)} />
              </div>
              <div>
                <Label>Data de Cancelamento *</Label>
                <Input type="date" value={dataCancelamento} onChange={e => setDataCancelamento(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Mensalidade (R$)</Label>
              <Input
                inputMode="decimal"
                value={mensalidade}
                onChange={e => setMensalidade(e.target.value)}
                placeholder="Ex.: 1500,00"
              />
            </div>
            <div>
              <Label>Motivo do Cancelamento *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
