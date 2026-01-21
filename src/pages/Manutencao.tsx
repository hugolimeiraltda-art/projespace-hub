import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { ManutencaoChamados } from '@/components/ManutencaoChamados';
import { PendenciasFullScreenTable } from '@/components/PendenciasFullScreenTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useManutencaoExport } from '@/hooks/useManutencaoExport';
import { Plus, AlertTriangle, Clock, CheckCircle, Wrench, Search, Eye, FileText, Download, List, Timer, CalendarClock, FileSpreadsheet } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  endereco?: string | null;
  contato_nome?: string | null;
  contato_telefone?: string | null;
  filial?: string | null;
  sistema?: string | null;
  noc?: string | null;
  app?: string | null;
  unidades?: number | null;
  data_ativacao?: string | null;
  mensalidade?: number | null;
  transbordo?: boolean | null;
  gateway?: boolean | null;
  portoes?: number | null;
  portas?: number | null;
  cameras?: number | null;
  catracas?: number | null;
  cancelas?: number | null;
}

interface CustomerDocument {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_arquivo: string | null;
  tamanho: number | null;
  created_at: string;
}

interface Pendencia {
  id: string;
  numero_os: string;
  customer_id: string | null;
  contrato: string;
  razao_social: string;
  numero_ticket: string | null;
  tipo: string;
  setor: string;
  descricao: string | null;
  status: string;
  sla_dias: number;
  data_abertura: string;
  data_prazo: string;
  data_conclusao: string | null;
  created_by_name: string | null;
  created_at: string;
}

const TIPOS_CLIENTE = [
  { value: 'CLIENTE_OBRA', label: 'Obra', setor: 'Cliente', sla: 0 },
  { value: 'CLIENTE_AGENDA', label: 'Agenda do Cliente', setor: 'Cliente', sla: 0 },
  { value: 'CLIENTE_LIMPEZA_VEGETACAO', label: 'Limpeza de Vegetação', setor: 'Cliente', sla: 0 },
  { value: 'CLIENTE_CONTRATACAO_SERVICOS', label: 'Contratação de Serviços', setor: 'Cliente', sla: 0 },
];

const TIPOS_DEPARTAMENTO = [
  { value: 'DEPT_COMPRAS', label: 'Compras', setor: 'Compras', sla: 10 },
  { value: 'DEPT_CADASTRO', label: 'Cadastro', setor: 'Cadastro', sla: 2 },
  { value: 'DEPT_ALMOXARIFADO', label: 'Almoxarifado', setor: 'Almoxarifado', sla: 1 },
  { value: 'DEPT_FATURAMENTO', label: 'Faturamento', setor: 'Faturamento', sla: 1 },
  { value: 'DEPT_CONTAS_RECEBER', label: 'Contas a Receber', setor: 'Contas a Receber', sla: 4 },
  { value: 'DEPT_FISCAL', label: 'Fiscal', setor: 'Fiscal', sla: 2 },
  { value: 'DEPT_IMPLANTACAO', label: 'Implantação', setor: 'Implantação', sla: 4 },
];

const TODOS_TIPOS = [...TIPOS_CLIENTE, ...TIPOS_DEPARTAMENTO];

const STATUS_OPTIONS = [
  { value: 'ABERTO', label: 'Aberto', color: 'bg-yellow-500' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-blue-500' },
  { value: 'CONCLUIDO', label: 'Concluído', color: 'bg-green-500' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-gray-500' },
];

export default function Manutencao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    exportPendenciasXLSX,
    exportPendenciasPDF,
    exportIndicadoresXLSX,
    exportRelatorioCompletoPDF,
  } = useManutencaoExport();
  
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [chamados, setChamados] = useState<{ id: string; contrato: string; razao_social: string; tipo: string; status: string; descricao: string | null; equipamentos: string | null; tecnico_responsavel: string | null; data_agendada: string; data_conclusao: string | null }[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDocuments, setCustomerDocuments] = useState<CustomerDocument[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showAllPendencias, setShowAllPendencias] = useState(false);
  
  const PENDENCIAS_DISPLAY_LIMIT = 3;

  // Form state
  const [formData, setFormData] = useState({
    numero_os: '',
    customer_id: '',
    contrato: '',
    razao_social: '',
    numero_ticket: '',
    tipo: '',
    descricao: '',
  });

  useEffect(() => {
    fetchPendencias();
    fetchCustomers();
    fetchChamados();
  }, []);

  const fetchPendencias = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencao_pendencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendencias(data || []);
    } catch (error) {
      console.error('Error fetching pendencias:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar pendências',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChamados = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencao_chamados')
        .select('id, contrato, razao_social, tipo, status, descricao, equipamentos, tecnico_responsavel, data_agendada, data_conclusao')
        .order('data_agendada', { ascending: true });

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error('Error fetching chamados:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    setLoadingCustomer(true);
    try {
      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customer_portfolio')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setSelectedCustomer(customerData);

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setCustomerDocuments(docsData || []);
      setCustomerDetailOpen(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar detalhes do cliente',
        variant: 'destructive',
      });
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleViewCustomer = (customerId: string | null) => {
    if (!customerId) {
      toast({
        title: 'Aviso',
        description: 'Esta pendência não está vinculada a um cliente da carteira',
        variant: 'destructive',
      });
      return;
    }
    fetchCustomerDetails(customerId);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        contrato: customer.contrato,
        razao_social: customer.razao_social,
      }));
    }
  };

  const handleTipoSelect = (tipo: string) => {
    setFormData(prev => ({ ...prev, tipo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tipoInfo = TODOS_TIPOS.find(t => t.value === formData.tipo);
    if (!tipoInfo) {
      toast({
        title: 'Erro',
        description: 'Selecione um tipo de pendência',
        variant: 'destructive',
      });
      return;
    }

    const dataAbertura = new Date();
    const dataPrazo = tipoInfo.sla > 0 
      ? addDays(dataAbertura, tipoInfo.sla) 
      : addDays(dataAbertura, 30); // 30 dias para pendências de cliente

    try {
      const { error } = await supabase
        .from('manutencao_pendencias')
        .insert({
          numero_os: formData.numero_os,
          customer_id: formData.customer_id || null,
          contrato: formData.contrato,
          razao_social: formData.razao_social,
          numero_ticket: formData.numero_ticket || null,
          tipo: formData.tipo as "CLIENTE_OBRA" | "CLIENTE_AGENDA" | "CLIENTE_LIMPEZA_VEGETACAO" | "CLIENTE_CONTRATACAO_SERVICOS" | "DEPT_COMPRAS" | "DEPT_CADASTRO" | "DEPT_ALMOXARIFADO" | "DEPT_FATURAMENTO" | "DEPT_CONTAS_RECEBER" | "DEPT_FISCAL" | "DEPT_IMPLANTACAO",
          setor: tipoInfo.setor,
          descricao: formData.descricao || null,
          sla_dias: tipoInfo.sla,
          data_abertura: dataAbertura.toISOString(),
          data_prazo: dataPrazo.toISOString(),
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pendência registrada com sucesso',
      });

      setDialogOpen(false);
      setFormData({
        numero_os: '',
        customer_id: '',
        contrato: '',
        razao_social: '',
        numero_ticket: '',
        tipo: '',
        descricao: '',
      });
      fetchPendencias();
    } catch (error) {
      console.error('Error creating pendencia:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar pendência',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'CONCLUIDO') {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('manutencao_pendencias')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
      });
      fetchPendencias();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  // Dashboard metrics
  const abertas = pendencias.filter(p => p.status === 'ABERTO').length;
  const emAndamento = pendencias.filter(p => p.status === 'EM_ANDAMENTO').length;
  const concluidas = pendencias.filter(p => p.status === 'CONCLUIDO').length;
  const atrasadas = pendencias.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
    return new Date(p.data_prazo) < new Date();
  }).length;

  // Tempo médio de conclusão (em dias)
  const tempoMedioConclusao = (() => {
    const concluidas = pendencias.filter(p => p.status === 'CONCLUIDO' && p.data_conclusao);
    if (concluidas.length === 0) return null;
    
    const totalDias = concluidas.reduce((acc, p) => {
      const abertura = new Date(p.data_abertura);
      const conclusao = new Date(p.data_conclusao!);
      return acc + differenceInDays(conclusao, abertura);
    }, 0);
    
    return Math.round(totalDias / concluidas.length);
  })();

  // Pendências críticas (vencidas ou a vencer em 24h)
  const agora = new Date();
  const em24h = addDays(agora, 1);
  const pendenciasCriticas = pendencias.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
    const prazo = new Date(p.data_prazo);
    return prazo <= em24h;
  }).length;

  // Separar pendências por tipo
  const pendenciasClientes = pendencias.filter(p => p.tipo.startsWith('CLIENTE_'));
  const pendenciasDepartamento = pendencias.filter(p => p.tipo.startsWith('DEPT_'));
  
  // Métricas de chamados
  const chamadosPreventivos = chamados.filter(c => c.tipo === 'PREVENTIVO').length;
  const chamadosEletivos = chamados.filter(c => c.tipo === 'ELETIVO').length;
  const chamadosCorretivos = chamados.filter(c => c.tipo === 'CORRETIVO').length;

  // Indicadores para exportação
  const indicadores = {
    abertas,
    emAndamento,
    concluidas: concluidas,
    atrasadas,
    tempoMedioConclusao,
    pendenciasCriticas,
    chamadosPreventivos,
    chamadosEletivos,
    chamadosCorretivos,
  };

  const handleExportPendenciasClientesPDF = () => {
    exportPendenciasPDF(pendenciasClientes, 'Pendencias_Clientes');
  };

  const handleExportPendenciasClientesXLSX = () => {
    exportPendenciasXLSX(pendenciasClientes, 'Pendencias_Clientes');
  };

  const handleExportPendenciasDeptPDF = () => {
    exportPendenciasPDF(pendenciasDepartamento, 'Pendencias_Departamento');
  };

  const handleExportPendenciasDeptXLSX = () => {
    exportPendenciasXLSX(pendenciasDepartamento, 'Pendencias_Departamento');
  };

  const handleExportRelatorioCompletoPDF = () => {
    exportRelatorioCompletoPDF(indicadores, pendenciasClientes, pendenciasDepartamento, chamados);
  };

  const handleExportRelatorioCompletoXLSX = () => {
    exportIndicadoresXLSX(indicadores, pendencias, chamados);
  };

  // Filter pendencias
  const filteredPendencias = pendencias.filter(p => {
    const matchesSearch = 
      p.numero_os.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.numero_ticket && p.numero_ticket.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSetor = filterSetor === 'all' || p.setor === filterSetor;

    return matchesSearch && matchesStatus && matchesSetor;
  });

  const getTipoLabel = (tipo: string) => {
    return TODOS_TIPOS.find(t => t.value === tipo)?.label || tipo;
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color} text-white`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const getPrazoBadge = (pendencia: Pendencia) => {
    if (pendencia.status === 'CONCLUIDO' || pendencia.status === 'CANCELADO') {
      return null;
    }

    const hoje = new Date();
    const prazo = new Date(pendencia.data_prazo);
    const diasRestantes = differenceInDays(prazo, hoje);

    if (diasRestantes < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Atrasado ({Math.abs(diasRestantes)} dias)
        </Badge>
      );
    } else if (diasRestantes === 0) {
      return (
        <Badge className="bg-orange-500 text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Vence hoje
        </Badge>
      );
    } else if (diasRestantes <= 2) {
      return (
        <Badge className="bg-yellow-500 text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {diasRestantes} dia(s)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {diasRestantes} dias
      </Badge>
    );
  };

  const setores = [...new Set(pendencias.map(p => p.setor))];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              Manutenção - Controle de Pendências
            </h1>
            <p className="text-muted-foreground">
              Gerencie pendências de clientes e departamentos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportRelatorioCompletoPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Relatório Completo (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportRelatorioCompletoXLSX}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Relatório Completo (Excel)
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem onClick={handleExportPendenciasClientesPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Pendências Clientes (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPendenciasClientesXLSX}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Pendências Clientes (Excel)
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem onClick={handleExportPendenciasDeptPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Pendências Departamento (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPendenciasDeptXLSX}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Pendências Departamento (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Pendência
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nova Pendência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_os">Nº OS *</Label>
                    <Input
                      id="numero_os"
                      value={formData.numero_os}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_os: e.target.value }))}
                      placeholder="Número da OS"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_ticket">Nº Ticket</Label>
                    <Input
                      id="numero_ticket"
                      value={formData.numero_ticket}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_ticket: e.target.value }))}
                      placeholder="Número do ticket"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente (Carteira)</Label>
                  <Select onValueChange={handleCustomerSelect} value={formData.customer_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente da carteira" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.razao_social} - {customer.contrato}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contrato">Contrato *</Label>
                    <Input
                      id="contrato"
                      value={formData.contrato}
                      onChange={(e) => setFormData(prev => ({ ...prev, contrato: e.target.value }))}
                      placeholder="Número do contrato"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                      placeholder="Razão social do cliente"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Pendência *</Label>
                  <Select onValueChange={handleTipoSelect} value={formData.tipo} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        Pendências de Cliente
                      </div>
                      {TIPOS_CLIENTE.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">
                        Pendências de Departamento (com SLA)
                      </div>
                      {TIPOS_DEPARTAMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label} (SLA: {tipo.sla} dias)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva a pendência..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar Pendência</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{abertas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{emAndamento}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{concluidas}</div>
            </CardContent>
          </Card>
          <Card className={atrasadas > 0 ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{atrasadas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Timer className="h-4 w-4 text-purple-500" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {tempoMedioConclusao !== null ? `${tempoMedioConclusao}d` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">dias para conclusão</p>
            </CardContent>
          </Card>
          <Card className={pendenciasCriticas > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                Críticas (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendenciasCriticas}</div>
              <p className="text-xs text-muted-foreground">vencidas ou a vencer</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por OS, cliente, contrato ou ticket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSetor} onValueChange={setFilterSetor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pendencias Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pendências ({filteredPendencias.length})</CardTitle>
            {filteredPendencias.length > PENDENCIAS_DISPLAY_LIMIT && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllPendencias(true)}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Ver todas
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPendencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma pendência encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº OS</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendencias.slice(0, PENDENCIAS_DISPLAY_LIMIT).map((pendencia) => (
                      <TableRow key={pendencia.id}>
                        <TableCell className="font-medium">{pendencia.numero_os}</TableCell>
                        <TableCell>{pendencia.numero_ticket || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={pendencia.razao_social}>
                          {pendencia.razao_social}
                        </TableCell>
                        <TableCell>{pendencia.contrato}</TableCell>
                        <TableCell>{getTipoLabel(pendencia.tipo)}</TableCell>
                        <TableCell>{pendencia.setor}</TableCell>
                        <TableCell>{getStatusBadge(pendencia.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(pendencia.data_prazo), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            {getPrazoBadge(pendencia)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(pendencia.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewCustomer(pendencia.customer_id)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Detalhes
                            </Button>
                            {pendencia.status !== 'CONCLUIDO' && pendencia.status !== 'CANCELADO' && (
                              <Select
                                value={pendencia.status}
                                onValueChange={(value) => handleStatusChange(pendencia.id, value)}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredPendencias.length > PENDENCIAS_DISPLAY_LIMIT && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAllPendencias(true)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      + {filteredPendencias.length - PENDENCIAS_DISPLAY_LIMIT} pendências restantes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full screen table para ver todas pendências */}
        <PendenciasFullScreenTable
          pendencias={filteredPendencias}
          isOpen={showAllPendencias}
          onClose={() => setShowAllPendencias(false)}
          onViewCustomer={handleViewCustomer}
          onStatusChange={handleStatusChange}
          getTipoLabel={getTipoLabel}
          statusOptions={STATUS_OPTIONS}
        />

        {/* Customer Details Dialog */}
        <Dialog open={customerDetailOpen} onOpenChange={setCustomerDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes do Cliente
              </DialogTitle>
            </DialogHeader>
            {loadingCustomer ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedCustomer && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-6 pr-4">
                  {/* Informações Gerais */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Informações Gerais
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Razão Social</Label>
                        <p className="font-medium">{selectedCustomer.razao_social}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Contrato</Label>
                        <p className="font-medium">{selectedCustomer.contrato}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Filial</Label>
                        <p className="font-medium">{selectedCustomer.filial || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Endereço</Label>
                        <p className="font-medium">{selectedCustomer.endereco || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Contato</Label>
                        <p className="font-medium">{selectedCustomer.contato_nome || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Telefone</Label>
                        <p className="font-medium">{selectedCustomer.contato_telefone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Informações Técnicas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Informações Técnicas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Sistema</Label>
                        <p className="font-medium">{selectedCustomer.sistema || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">NOC</Label>
                        <p className="font-medium">{selectedCustomer.noc || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">App</Label>
                        <p className="font-medium">{selectedCustomer.app || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Unidades</Label>
                        <p className="font-medium">{selectedCustomer.unidades || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Portões</Label>
                        <p className="font-medium">{selectedCustomer.portoes || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Portas</Label>
                        <p className="font-medium">{selectedCustomer.portas || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Câmeras</Label>
                        <p className="font-medium">{selectedCustomer.cameras || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Catracas</Label>
                        <p className="font-medium">{selectedCustomer.catracas || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Cancelas</Label>
                        <p className="font-medium">{selectedCustomer.cancelas || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Transbordo</Label>
                        <p className="font-medium">{selectedCustomer.transbordo ? 'Sim' : 'Não'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Gateway</Label>
                        <p className="font-medium">{selectedCustomer.gateway ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Informações Financeiras */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Informações Financeiras</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Mensalidade</Label>
                        <p className="font-medium">
                          {selectedCustomer.mensalidade 
                            ? `R$ ${selectedCustomer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Data de Ativação</Label>
                        <p className="font-medium">
                          {selectedCustomer.data_ativacao 
                            ? format(new Date(selectedCustomer.data_ativacao), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Documentos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documentos ({customerDocuments.length})
                    </h3>
                    {customerDocuments.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Nenhum documento cadastrado</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDocuments.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{doc.nome_arquivo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.tipo_arquivo || 'Documento'} • {formatFileSize(doc.tamanho)} • {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.arquivo_url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Seção de Chamados de Manutenção */}
        <Separator className="my-8" />
        <ManutencaoChamados customers={customers} />
      </div>
    </Layout>
  );
}
