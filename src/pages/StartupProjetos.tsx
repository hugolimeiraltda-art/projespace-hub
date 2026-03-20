import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useImplantacaoIntegration } from '@/hooks/useImplantacaoIntegration';
import { cn } from '@/lib/utils';
import { ImplantacaoTimeline, ImplantacaoEtapasData } from '@/components/ImplantacaoTimeline';
import {
  Search,
  Filter,
  Rocket,
  Clock,
  CheckCircle2,
  PlayCircle,
  Building,
  User,
  Calendar,
  Eye,
  RotateCcw,
  Sparkles,
  Headphones,
  Settings,
  Plus,
  Loader2,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ImplantacaoStatus = 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO';

interface StartupProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  vendedor_nome: string;
  created_at: string;
  updated_at: string;
  implantacao_status: ImplantacaoStatus | null;
  implantacao_started_at: string | null;
  implantacao_completed_at: string | null;
  prazo_entrega_projeto: string | null;
  tipo_obra: 'nova' | 'acrescimo';
}

const IMPLANTACAO_STATUS_LABELS: Record<ImplantacaoStatus, string> = {
  A_EXECUTAR: 'A Executar',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO_IMPLANTACAO: 'Concluído',
};

const IMPLANTACAO_STATUS_COLORS: Record<ImplantacaoStatus, string> = {
  A_EXECUTAR: 'bg-amber-100 text-amber-800 border-amber-300',
  EM_EXECUCAO: 'bg-blue-100 text-blue-800 border-blue-300',
  CONCLUIDO_IMPLANTACAO: 'bg-green-100 text-green-800 border-green-300',
};

const IMPLANTACAO_STATUS_ICONS: Record<ImplantacaoStatus, typeof Clock> = {
  A_EXECUTAR: Clock,
  EM_EXECUCAO: PlayCircle,
  CONCLUIDO_IMPLANTACAO: CheckCircle2,
};

export default function StartupProjetos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'em-implantacao';
  
  const [projects, setProjects] = useState<StartupProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImplantacaoStatus | 'TODOS'>('TODOS');
  const [portfolioMap, setPortfolioMap] = useState<Record<string, { mensalidade: number | null; taxa_ativacao: number | null }>>({});
  const [etapasMap, setEtapasMap] = useState<Record<string, ImplantacaoEtapasData>>({});

  // New obra dialog state
  const [showNewObra, setShowNewObra] = useState(false);
  const [newObraNome, setNewObraNome] = useState('');
  const [newObraCidade, setNewObraCidade] = useState('');
  const [newObraEstado, setNewObraEstado] = useState('');
  const [newObraEndereco, setNewObraEndereco] = useState('');
  const [newObraVendedor, setNewObraVendedor] = useState('');
  const [newObraTipo, setNewObraTipo] = useState<'nova' | 'acrescimo'>('nova');
  const [tipoObraFilter, setTipoObraFilter] = useState<'todas' | 'nova' | 'acrescimo'>('todas');
  const [sortField, setSortField] = useState<'created_at' | 'cliente_condominio_nome' | 'implantacao_started_at' | 'prazo_entrega_projeto'>('created_at');
  const [creatingObra, setCreatingObra] = useState(false);
  const [vendedoresList, setVendedoresList] = useState<{ id: string; nome: string; email: string }[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchVendedores();
  }, [activeTab]);

  const fetchVendedores = async () => {
    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['vendedor', 'admin', 'gerente_comercial', 'implantacao']);
      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(ur => ur.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', userIds)
          .order('nome');
        if (profiles) setVendedoresList(profiles);
      }
    } catch (e) {
      console.error('Error fetching vendedores:', e);
    }
  };

  const handleCreateObra = async () => {
    if (!newObraNome.trim()) {
      toast({ title: 'Informe o nome do condomínio', variant: 'destructive' });
      return;
    }
    if (!newObraVendedor) {
      toast({ title: 'Selecione o vendedor responsável', variant: 'destructive' });
      return;
    }
    setCreatingObra(true);
    try {
      const vendedor = vendedoresList.find(v => v.id === newObraVendedor);
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          created_by_user_id: user!.id,
          vendedor_nome: vendedor?.nome || user!.nome,
          vendedor_email: vendedor?.email || user!.email,
          cliente_condominio_nome: newObraNome.trim(),
          cliente_cidade: newObraCidade.trim() || null,
          cliente_estado: newObraEstado || null,
          endereco_condominio: newObraEndereco.trim() || null,
          status: 'APROVADO_PROJETO',
          sale_status: 'CONCLUIDO',
          implantacao_status: 'A_EXECUTAR',
          tipo_obra: newObraTipo,
        })
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Erro ao criar obra', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Obra cadastrada com sucesso!' });
      setShowNewObra(false);
      setNewObraNome(''); setNewObraCidade(''); setNewObraEstado(''); setNewObraEndereco(''); setNewObraVendedor(''); setNewObraTipo('nova');
      fetchProjects();
    } catch (e) {
      console.error('Error creating obra:', e);
      toast({ title: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setCreatingObra(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      // Delete related records first
      await Promise.all([
        supabase.from('implantacao_etapas').delete().eq('project_id', projectId),
        supabase.from('implantacao_checklists').delete().eq('project_id', projectId),
        supabase.from('sale_forms').delete().eq('project_id', projectId),
        supabase.from('tap_forms').delete().eq('project_id', projectId),
        supabase.from('sale_form_attachments').delete().eq('project_id', projectId),
        supabase.from('project_notifications').delete().eq('project_id', projectId),
        supabase.from('implantacao_noc_chamados').delete().eq('project_id', projectId),
        supabase.from('customer_portfolio').delete().eq('project_id', projectId),
      ]);

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        toast({ title: 'Erro ao excluir projeto', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Projeto excluído', description: `"${projectName}" foi removido com sucesso.` });
      fetchProjects();
    } catch (e) {
      console.error('Error deleting project:', e);
      toast({ title: 'Erro inesperado ao excluir', variant: 'destructive' });
    }
  };

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      
      let projectsQuery = supabase
        .from('projects')
        .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, updated_at, implantacao_status, implantacao_started_at, implantacao_completed_at, prazo_entrega_projeto, tipo_obra')
        .eq('sale_status', 'CONCLUIDO');
      
      if (activeTab === 'historico') {
        projectsQuery = projectsQuery.eq('implantacao_status', 'CONCLUIDO_IMPLANTACAO');
      } else {
        projectsQuery = projectsQuery.neq('implantacao_status', 'CONCLUIDO_IMPLANTACAO');
      }
      
      projectsQuery = projectsQuery.order('created_at', { ascending: false });

      const [projectsRes, portfolioRes, etapasRes] = await Promise.all([
        projectsQuery,
        supabase
          .from('customer_portfolio')
          .select('project_id, mensalidade, taxa_ativacao')
          .not('project_id', 'is', null),
        supabase
          .from('implantacao_etapas')
          .select('project_id, contrato_assinado_at, ligacao_boas_vindas_at, agendamento_visita_startup_at, laudo_visita_startup_at, check_programacao_at, confirmacao_ativacao_financeira_at, operacao_assistida_inicio, operacao_assistida_fim'),
      ]);

      if (projectsRes.error) {
        console.error('Error fetching projects:', projectsRes.error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os projetos.',
          variant: 'destructive',
        });
        return;
      }

      // Build portfolio map
      const pMap: Record<string, { mensalidade: number | null; taxa_ativacao: number | null }> = {};
      portfolioRes.data?.forEach((p) => {
        if (p.project_id) {
          pMap[p.project_id] = { mensalidade: p.mensalidade ? Number(p.mensalidade) : null, taxa_ativacao: p.taxa_ativacao ? Number(p.taxa_ativacao) : null };
        }
      });
      setPortfolioMap(pMap);

      // Build etapas map
      const eMap: Record<string, ImplantacaoEtapasData> = {};
      etapasRes.data?.forEach((e: any) => {
        if (e.project_id) {
          eMap[e.project_id] = {
            contrato_assinado_at: e.contrato_assinado_at,
            ligacao_boas_vindas_at: e.ligacao_boas_vindas_at,
            agendamento_visita_startup_at: e.agendamento_visita_startup_at,
            laudo_visita_startup_at: e.laudo_visita_startup_at,
            check_programacao_at: e.check_programacao_at,
            confirmacao_ativacao_financeira_at: e.confirmacao_ativacao_financeira_at,
            operacao_assistida_inicio: e.operacao_assistida_inicio,
            operacao_assistida_fim: e.operacao_assistida_fim,
          };
        }
      });
      setEtapasMap(eMap);

      setProjects((projectsRes.data || []) as StartupProject[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { createCustomerOnStart, updateCustomerOnComplete } = useImplantacaoIntegration();

  const handleStatusChange = async (projectId: string, newStatus: ImplantacaoStatus, project?: StartupProject) => {
    try {
      const updateData: Record<string, unknown> = {
        implantacao_status: newStatus,
      };

      if (newStatus === 'EM_EXECUCAO') {
        updateData.implantacao_started_at = new Date().toISOString();
        
        // Create customer in portfolio when starting
        if (project) {
          await createCustomerOnStart({
            id: project.id,
            numero_projeto: project.numero_projeto,
            cliente_condominio_nome: project.cliente_condominio_nome,
            cliente_cidade: project.cliente_cidade,
            cliente_estado: project.cliente_estado,
            vendedor_nome: project.vendedor_nome,
          });
        }
      } else if (newStatus === 'CONCLUIDO_IMPLANTACAO') {
        updateData.implantacao_completed_at = new Date().toISOString();
        
        // Update customer status to IMPLANTADO
        await updateCustomerOnComplete(projectId);
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar o status.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Status atualizado',
        description: `Status alterado para "${IMPLANTACAO_STATUS_LABELS[newStatus]}".`,
      });

      await fetchProjects();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.cliente_condominio_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.vendedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(project.numero_projeto).includes(searchTerm);
    
    // Treat null implantacao_status as 'A_EXECUTAR'
    const effectiveStatus = project.implantacao_status || 'A_EXECUTAR';
    const matchesStatus = statusFilter === 'TODOS' || effectiveStatus === statusFilter;
    
    const matchesTipoObra = tipoObraFilter === 'todas' || project.tipo_obra === tipoObraFilter;
    
    return matchesSearch && matchesStatus && matchesTipoObra;
  }).sort((a, b) => {
    if (sortField === 'cliente_condominio_nome') {
      return a.cliente_condominio_nome.localeCompare(b.cliente_condominio_nome);
    }
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    return valB.localeCompare(valA); // descending for dates
  });

  const statusCounts = {
    TODOS: projects.length,
    A_EXECUTAR: projects.filter(p => !p.implantacao_status || p.implantacao_status === 'A_EXECUTAR').length,
    EM_EXECUCAO: projects.filter(p => p.implantacao_status === 'EM_EXECUCAO').length,
    CONCLUIDO_IMPLANTACAO: projects.filter(p => p.implantacao_status === 'CONCLUIDO_IMPLANTACAO').length,
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando projetos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {activeTab === 'em-implantacao' && 'Implantação de Projetos'}
                {activeTab === 'operacao-assistida' && 'Operação Assistida'}
                {activeTab === 'pequenas-obras' && 'Pequenas Obras'}
                {activeTab === 'historico' && 'Histórico de Implantações'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {activeTab === 'em-implantacao' && 'Gerencie a implantação dos projetos vendidos'}
              {activeTab === 'operacao-assistida' && 'Acompanhe os projetos em fase de operação assistida'}
              {activeTab === 'pequenas-obras' && 'Gerencie as pequenas obras e serviços'}
              {activeTab === 'historico' && 'Obras concluídas com sucesso'}
            </p>
          </div>
          {activeTab === 'em-implantacao' && (
            <Dialog open={showNewObra} onOpenChange={setShowNewObra}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Cadastrar Nova Obra</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar Nova Obra</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Condomínio *</Label>
                    <Input value={newObraNome} onChange={e => setNewObraNome(e.target.value)} placeholder="Ex: Residencial Aurora" />
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input value={newObraEndereco} onChange={e => setNewObraEndereco(e.target.value)} placeholder="Rua, número, bairro" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cidade</Label>
                      <Input value={newObraCidade} onChange={e => setNewObraCidade(e.target.value)} placeholder="Cidade" />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select value={newObraEstado} onValueChange={setNewObraEstado}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                   <div>
                    <Label>Tipo de Obra *</Label>
                    <Select value={newObraTipo} onValueChange={(v) => setNewObraTipo(v as 'nova' | 'acrescimo')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nova">Novo Contrato</SelectItem>
                        <SelectItem value="acrescimo">Acréscimo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vendedor Responsável *</Label>
                    <Select value={newObraVendedor} onValueChange={setNewObraVendedor}>
                      <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                      <SelectContent>
                        {vendedoresList.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateObra} disabled={creatingObra} className="w-full">
                    {creatingObra ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Cadastrar Obra'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeTab === 'em-implantacao' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  statusFilter === 'TODOS' && "ring-2 ring-primary"
                )}
                onClick={() => setStatusFilter('TODOS')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{statusCounts.TODOS}</p>
                    </div>
                    <Filter className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  statusFilter === 'A_EXECUTAR' && "ring-2 ring-amber-500"
                )}
                onClick={() => setStatusFilter('A_EXECUTAR')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">A Executar</p>
                      <p className="text-2xl font-bold text-amber-600">{statusCounts.A_EXECUTAR}</p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  statusFilter === 'EM_EXECUCAO' && "ring-2 ring-blue-500"
                )}
                onClick={() => setStatusFilter('EM_EXECUCAO')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Em Execução</p>
                      <p className="text-2xl font-bold text-blue-600">{statusCounts.EM_EXECUCAO}</p>
                    </div>
                    <PlayCircle className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search, Filter and Tipo de Obra */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, vendedor ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ImplantacaoStatus | 'TODOS')}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="A_EXECUTAR">A Executar</SelectItem>
                  <SelectItem value="EM_EXECUCAO">Em Execução</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                {[
                  { value: 'todas' as const, label: 'Todas' },
                  { value: 'nova' as const, label: 'Obras Novas' },
                  { value: 'acrescimo' as const, label: 'Acréscimos' },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={tipoObraFilter === tab.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoObraFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <Select value={sortField} onValueChange={(v) => setSortField(v as typeof sortField)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Data de Entrada</SelectItem>
                  <SelectItem value="implantacao_started_at">Data de Início</SelectItem>
                  <SelectItem value="prazo_entrega_projeto">Previsão Ativação</SelectItem>
                  <SelectItem value="cliente_condominio_nome">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'TODOS' 
                      ? 'Tente ajustar os filtros de busca.' 
                      : 'Os projetos com venda concluída aparecerão aqui.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const StatusIcon = project.implantacao_status 
                    ? IMPLANTACAO_STATUS_ICONS[project.implantacao_status] 
                    : Clock;
                  
                  return (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Project Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-muted-foreground">#{project.numero_projeto}</span>
                              {project.implantacao_status && (
                                <Badge 
                                  className={cn(
                                    "border",
                                    IMPLANTACAO_STATUS_COLORS[project.implantacao_status]
                                  )}
                                >
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {IMPLANTACAO_STATUS_LABELS[project.implantacao_status]}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {project.tipo_obra === 'acrescimo' ? 'Acréscimo' : 'Novo Contrato'}
                              </Badge>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {project.cliente_condominio_nome}
                            </h3>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {project.cliente_cidade}, {project.cliente_estado}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {project.vendedor_nome}
                              </span>
                              {project.implantacao_started_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Início: {format(parseISO(project.implantacao_started_at), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                              {project.prazo_entrega_projeto && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Previsão: {format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                              {!project.implantacao_started_at && !project.prazo_entrega_projeto && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(parseISO(project.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {(!project.implantacao_status || project.implantacao_status === 'A_EXECUTAR') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  handleStatusChange(project.id, 'EM_EXECUCAO', project);
                                  navigate(`/startup-projetos/${project.id}/execucao`);
                                }}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {project.implantacao_status === 'EM_EXECUCAO' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Continuar
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/projetos/${project.id}/formulario-venda`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Formulário
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/projetos/${project.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>

                            {user?.role === 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o projeto <strong>"{project.cliente_condominio_nome}"</strong>? 
                                      Esta ação não pode ser desfeita. Todos os dados relacionados (etapas, checklists, formulários) serão removidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteProject(project.id, project.cliente_condominio_nome)}
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>

                        {/* Implantação Timeline */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <ImplantacaoTimeline etapas={etapasMap[project.id] || null} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'operacao-assistida' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Operação Assistida</h3>
              <p className="text-muted-foreground">
                Os projetos em fase de operação assistida aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'pequenas-obras' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Pequenas Obras</h3>
              <p className="text-muted-foreground">
                As pequenas obras e serviços aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'historico' && (
          <>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, vendedor ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma obra concluída</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Tente ajustar os filtros de busca.' : 'As obras concluídas aparecerão aqui.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{filteredProjects.length} obra(s) concluída(s)</p>
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">#{project.numero_projeto}</span>
                            <Badge className="border bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Concluído
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {project.cliente_condominio_nome}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building className="w-4 h-4" />
                              {project.cliente_cidade}, {project.cliente_estado}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {project.vendedor_nome}
                            </span>
                            {project.implantacao_completed_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Concluído em {format(parseISO(project.implantacao_completed_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Voltar p/ Implantação
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reabrir implantação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja mover <strong>"{project.cliente_condominio_nome}"</strong> de volta para Em Implantação (status "Em Execução")?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleStatusChange(project.id, 'EM_EXECUCAO')}>
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <ImplantacaoTimeline etapas={etapasMap[project.id] || null} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
