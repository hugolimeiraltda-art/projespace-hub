import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useImplantacaoIntegration } from '@/hooks/useImplantacaoIntegration';
import { cn } from '@/lib/utils';
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
  
  const [projects, setProjects] = useState<StartupProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImplantacaoStatus | 'TODOS'>('TODOS');
  const [portfolioMap, setPortfolioMap] = useState<Record<string, { mensalidade: number | null; taxa_ativacao: number | null }>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const [projectsRes, portfolioRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, updated_at, implantacao_status, implantacao_started_at, implantacao_completed_at, prazo_entrega_projeto')
          .eq('sale_status', 'CONCLUIDO')
          .neq('implantacao_status', 'CONCLUIDO_IMPLANTACAO')
          .order('updated_at', { ascending: false }),
        supabase
          .from('customer_portfolio')
          .select('project_id, mensalidade, taxa_ativacao')
          .not('project_id', 'is', null),
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

      setProjects(projectsRes.data || []);
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
    
    return matchesSearch && matchesStatus;
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Implantação de Projetos</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie a implantação dos projetos vendidos
          </p>
        </div>

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

        {/* Projetos em Andamento Table */}
        {(() => {
          const emAndamento = projects.filter(p => p.implantacao_status === 'EM_EXECUCAO');
          if (emAndamento.length === 0) return null;
          return (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-blue-500" />
                  Projetos em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Projeto</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Condomínio</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Data Início</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Data Entrega</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Mensalidade</th>
                        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Taxa Ativação</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {emAndamento.map((project) => {
                        const portfolio = portfolioMap[project.id];
                        return (
                          <tr key={project.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}>
                            <td className="p-4 align-middle font-medium">#{project.numero_projeto}</td>
                            <td className="p-4 align-middle">{project.cliente_condominio_nome}</td>
                            <td className="p-4 align-middle">
                              {project.implantacao_started_at
                                ? format(parseISO(project.implantacao_started_at), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                            </td>
                            <td className="p-4 align-middle">
                              {project.prazo_entrega_projeto
                                ? format(parseISO(project.prazo_entrega_projeto), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                            </td>
                            <td className="p-4 align-middle text-right">
                              {portfolio?.mensalidade != null
                                ? `R$ ${portfolio.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td className="p-4 align-middle text-right">
                              {portfolio?.taxa_ativacao != null
                                ? `R$ ${portfolio.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(parseISO(project.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
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
                        {project.implantacao_status === 'EM_EXECUCAO' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => handleStatusChange(project.id, 'CONCLUIDO_IMPLANTACAO')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Concluir
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
                      </div>
                    </div>

                    {/* Timeline info */}
                    {(project.implantacao_started_at || project.implantacao_completed_at) && (
                      <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs text-muted-foreground">
                        {project.implantacao_started_at && (
                          <span>
                            Início: {format(parseISO(project.implantacao_started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {project.implantacao_completed_at && (
                          <span>
                            Conclusão: {format(parseISO(project.implantacao_completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
