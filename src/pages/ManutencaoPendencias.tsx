import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, AlertTriangle, Clock, CheckCircle, Wrench, Search, Eye, FileText, Download, Timer, CalendarClock, FileSpreadsheet, MessageSquare, Send, Trash2, Pencil, List } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PendenciasFullScreenTable } from '@/components/PendenciasFullScreenTable';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
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

interface Comentario {
  id: string;
  pendencia_id: string;
  comentario: string;
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

const SETOR_OPTIONS = [
  'Compras',
  'Fiscal',
  'Almoxarifado',
  'Faturamento',
  'Cadastro',
  'Contas a Receber',
  'Implantação',
  'Cliente',
];

export default function ManutencaoPendencias() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { exportPendenciasXLSX, exportPendenciasPDF } = useManutencaoExport();
  
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comentariosDialogOpen, setComentariosDialogOpen] = useState(false);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendenciaToDelete, setPendenciaToDelete] = useState<Pendencia | null>(null);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pendenciaToEdit, setPendenciaToEdit] = useState<Pendencia | null>(null);
  const [editFormData, setEditFormData] = useState({
    numero_os: '',
    numero_ticket: '',
    contrato: '',
    razao_social: '',
    setor: '',
    descricao: '',
  });

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: pendenciasData, error: pendenciasError } = await supabase
        .from('manutencao_pendencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (pendenciasError) throw pendenciasError;
      setPendencias(pendenciasData || []);

      const { data: customersData, error: customersError } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social')
        .order('razao_social');

      if (customersError) throw customersError;
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
      : addDays(dataAbertura, 30);

    try {
      const insertData = {
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
      };

      console.log('Inserting pendencia:', insertData);

      const { data, error } = await supabase
        .from('manutencao_pendencias')
        .insert(insertData)
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Pendência registrada com sucesso',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error('Error creating pendencia:', error);
      const errorMessage = error instanceof Error ? error.message : 
        (typeof error === 'object' && error !== null && 'message' in error) ? 
        String((error as { message: unknown }).message) : 'Erro ao registrar pendência';
      toast({
        title: 'Erro',
        description: errorMessage,
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
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePendencia = async () => {
    if (!pendenciaToDelete) return;

    try {
      // First delete related comments
      await supabase
        .from('manutencao_pendencias_comentarios')
        .delete()
        .eq('pendencia_id', pendenciaToDelete.id);

      // Then delete the pendencia
      const { error } = await supabase
        .from('manutencao_pendencias')
        .delete()
        .eq('id', pendenciaToDelete.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pendência excluída com sucesso',
      });
      
      setDeleteDialogOpen(false);
      setPendenciaToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting pendencia:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir pendência',
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (pendencia: Pendencia) => {
    setPendenciaToDelete(pendencia);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (pendencia: Pendencia) => {
    setPendenciaToEdit(pendencia);
    setEditFormData({
      numero_os: pendencia.numero_os,
      numero_ticket: pendencia.numero_ticket || '',
      contrato: pendencia.contrato,
      razao_social: pendencia.razao_social,
      setor: pendencia.setor,
      descricao: pendencia.descricao || '',
    });
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia);
    setDetailsDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendenciaToEdit) return;

    try {
      const { error } = await supabase
        .from('manutencao_pendencias')
        .update({
          numero_os: editFormData.numero_os,
          numero_ticket: editFormData.numero_ticket || null,
          contrato: editFormData.contrato,
          razao_social: editFormData.razao_social,
          setor: editFormData.setor,
          descricao: editFormData.descricao || null,
        })
        .eq('id', pendenciaToEdit.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pendência atualizada com sucesso',
      });
      setEditDialogOpen(false);
      setPendenciaToEdit(null);
      fetchData();
    } catch (error) {
      console.error('Error updating pendencia:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar pendência',
        variant: 'destructive',
      });
    }
  };

  const handleSetorChange = async (id: string, newSetor: string) => {
    try {
      const { error } = await supabase
        .from('manutencao_pendencias')
        .update({ setor: newSetor })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Setor atualizado',
      });
      fetchData();
    } catch (error) {
      console.error('Error updating setor:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar setor',
        variant: 'destructive',
      });
    }
  };

  const handleViewCustomer = (customerId: string | null) => {
    if (customerId) {
      window.open(`/sucesso-cliente/${customerId}`, '_blank');
    }
  };

  const openComentarios = async (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia);
    setComentariosDialogOpen(true);
    setLoadingComentarios(true);

    try {
      const { data, error } = await supabase
        .from('manutencao_pendencias_comentarios')
        .select('*')
        .eq('pendencia_id', pendencia.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
    } finally {
      setLoadingComentarios(false);
    }
  };

  const addComentario = async () => {
    if (!novoComentario.trim() || !selectedPendencia) return;

    try {
      const { error } = await supabase
        .from('manutencao_pendencias_comentarios')
        .insert({
          pendencia_id: selectedPendencia.id,
          comentario: novoComentario,
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Comentário adicionado',
      });

      setNovoComentario('');
      
      // Refresh comentarios
      const { data } = await supabase
        .from('manutencao_pendencias_comentarios')
        .select('*')
        .eq('pendencia_id', selectedPendencia.id)
        .order('created_at', { ascending: true });

      setComentarios(data || []);
    } catch (error) {
      console.error('Error adding comentario:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar comentário',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      numero_os: '',
      customer_id: '',
      contrato: '',
      razao_social: '',
      numero_ticket: '',
      tipo: '',
      descricao: '',
    });
  };

  // Dashboard metrics
  const abertas = pendencias.filter(p => p.status === 'ABERTO').length;
  const emAndamento = pendencias.filter(p => p.status === 'EM_ANDAMENTO').length;
  const concluidas = pendencias.filter(p => p.status === 'CONCLUIDO').length;
  const atrasadas = pendencias.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
    return new Date(p.data_prazo) < new Date();
  }).length;

  const tempoMedioConclusao = (() => {
    const finalizadas = pendencias.filter(p => p.status === 'CONCLUIDO' && p.data_conclusao);
    if (finalizadas.length === 0) return null;
    
    const totalDias = finalizadas.reduce((acc, p) => {
      const abertura = new Date(p.data_abertura);
      const conclusao = new Date(p.data_conclusao!);
      return acc + differenceInDays(conclusao, abertura);
    }, 0);
    
    return Math.round(totalDias / finalizadas.length);
  })();

  const agora = new Date();
  const em24h = addDays(agora, 1);
  const pendenciasCriticas = pendencias.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
    const prazo = new Date(p.data_prazo);
    return prazo <= em24h;
  }).length;

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
    if (tipo.startsWith('CLIENTE_')) return 'Pendência de Cliente';
    if (tipo.startsWith('DEPT_')) return 'Pendência de Departamento';
    return tipo;
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Controle de Pendências
            </h1>
            <p className="text-muted-foreground">
              Gerencie pendências de clientes e departamentos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setFullScreenOpen(true)}
            >
              <List className="h-4 w-4" />
              Exibir Tudo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPendenciasPDF(filteredPendencias, 'Pendencias')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPendenciasXLSX(filteredPendencias, 'Pendencias')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
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
                        <ScrollArea className="h-[200px]">
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.razao_social} - {customer.contrato}
                            </SelectItem>
                          ))}
                        </ScrollArea>
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
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
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

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pendências ({filteredPendencias.length})</CardTitle>
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
                    {filteredPendencias.map((pendencia) => (
                      <TableRow key={pendencia.id}>
                        <TableCell className="font-medium">{pendencia.numero_os}</TableCell>
                        <TableCell>{pendencia.numero_ticket || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={pendencia.razao_social}>
                          {pendencia.razao_social}
                        </TableCell>
                        <TableCell>{pendencia.contrato}</TableCell>
                        <TableCell>{getTipoLabel(pendencia.tipo)}</TableCell>
                        <TableCell>
                          {pendencia.status !== 'CONCLUIDO' && pendencia.status !== 'CANCELADO' ? (
                            <Select
                              value={pendencia.setor}
                              onValueChange={(value) => handleSetorChange(pendencia.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SETOR_OPTIONS.map((setor) => (
                                  <SelectItem key={setor} value={setor}>
                                    {setor}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            pendencia.setor
                          )}
                        </TableCell>
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
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailsDialog(pendencia)}
                              title="Ver Detalhes"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(pendencia)}
                              title="Editar"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openComentarios(pendencia)}
                              title="Comentários"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            {pendencia.status !== 'CONCLUIDO' && pendencia.status !== 'CANCELADO' && (
                              <Select
                                value={pendencia.status}
                                onValueChange={(value) => handleStatusChange(pendencia.id, value)}
                              >
                                <SelectTrigger className="w-[120px] h-8">
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
                            {user?.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(pendencia)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comentarios Dialog */}
        <Dialog open={comentariosDialogOpen} onOpenChange={setComentariosDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários - OS {selectedPendencia?.numero_os}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPendencia && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Cliente:</strong> {selectedPendencia.razao_social}</p>
                  <p><strong>Tipo:</strong> {getTipoLabel(selectedPendencia.tipo)}</p>
                  {selectedPendencia.descricao && (
                    <p><strong>Descrição:</strong> {selectedPendencia.descricao}</p>
                  )}
                </div>
              )}

              <Separator />

              <ScrollArea className="h-[300px] pr-4">
                {loadingComentarios ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : comentarios.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comentarios.map((comentario) => (
                      <div key={comentario.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comentario.created_by_name || 'Usuário'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comentario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{comentario.comentario}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="flex gap-2">
                <Textarea
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addComentario} disabled={!novoComentario.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Pendência</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a pendência <strong>OS {pendenciaToDelete?.numero_os}</strong> do cliente <strong>{pendenciaToDelete?.razao_social}</strong>? 
                Esta ação não pode ser desfeita e todos os comentários associados também serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePendencia}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Editar Pendência - OS {pendenciaToEdit?.numero_os}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_numero_os">Nº OS *</Label>
                  <Input
                    id="edit_numero_os"
                    value={editFormData.numero_os}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, numero_os: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_numero_ticket">Nº Ticket</Label>
                  <Input
                    id="edit_numero_ticket"
                    value={editFormData.numero_ticket}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, numero_ticket: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_contrato">Contrato *</Label>
                  <Input
                    id="edit_contrato"
                    value={editFormData.contrato}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, contrato: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_razao_social">Razão Social *</Label>
                  <Input
                    id="edit_razao_social"
                    value={editFormData.razao_social}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select 
                  value={editFormData.setor} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, setor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETOR_OPTIONS.map((setor) => (
                      <SelectItem key={setor} value={setor}>
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_descricao">Descrição</Label>
                <Textarea
                  id="edit_descricao"
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes da Pendência - OS {selectedPendencia?.numero_os}
              </DialogTitle>
            </DialogHeader>
            {selectedPendencia && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Nº OS</Label>
                    <p className="font-medium">{selectedPendencia.numero_os}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Nº Ticket</Label>
                    <p className="font-medium">{selectedPendencia.numero_ticket || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Cliente</Label>
                    <p className="font-medium">{selectedPendencia.razao_social}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Contrato</Label>
                    <p className="font-medium">{selectedPendencia.contrato}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Tipo</Label>
                    <p className="font-medium">{getTipoLabel(selectedPendencia.tipo)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Setor</Label>
                    <p className="font-medium">{selectedPendencia.setor}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div>{getStatusBadge(selectedPendencia.status)}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">SLA</Label>
                    <p className="font-medium">{selectedPendencia.sla_dias} dias</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Data de Abertura</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPendencia.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Prazo</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPendencia.data_prazo), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    {getPrazoBadge(selectedPendencia)}
                  </div>
                </div>

                {selectedPendencia.data_conclusao && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Data de Conclusão</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPendencia.data_conclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}

                {selectedPendencia.descricao && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Descrição</Label>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedPendencia.descricao}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Criado por</Label>
                  <p className="font-medium">{selectedPendencia.created_by_name || 'Não informado'}</p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => {
                    setDetailsDialogOpen(false);
                    openEditDialog(selectedPendencia);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Full Screen Table */}
        <PendenciasFullScreenTable
          pendencias={filteredPendencias}
          isOpen={fullScreenOpen}
          onClose={() => setFullScreenOpen(false)}
          onViewCustomer={handleViewCustomer}
          onStatusChange={handleStatusChange}
          onSetorChange={handleSetorChange}
          onEditPendencia={openEditDialog}
          onViewDetails={openDetailsDialog}
          onDeletePendencia={user?.role === 'admin' ? openDeleteDialog : undefined}
          getTipoLabel={getTipoLabel}
          statusOptions={STATUS_OPTIONS}
          setorOptions={SETOR_OPTIONS}
          userRole={user?.role}
        />
      </div>
    </Layout>
  );
}
