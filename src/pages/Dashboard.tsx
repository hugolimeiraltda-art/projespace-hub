import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  FolderPlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ArrowRight,
  Calendar,
  Building
} from 'lucide-react';
import { ProjectStatus, STATUS_LABELS } from '@/types/project';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, getProjectsByUser } = useProjects();

  const userProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Stats
  const stats = {
    total: userProjects.length,
    rascunho: userProjects.filter(p => p.status === 'RASCUNHO').length,
    emAnalise: userProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length,
    pendente: userProjects.filter(p => p.status === 'PENDENTE_INFO').length,
    aprovado: userProjects.filter(p => p.status === 'APROVADO_PROJETO').length,
  };

  const recentProjects = [...userProjects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const urgentProjects = userProjects.filter(p => {
    if (!p.prazo_entrega_projeto || p.status === 'APROVADO_PROJETO' || p.status === 'CANCELADO') return false;
    const prazo = parseISO(p.prazo_entrega_projeto);
    const now = new Date();
    const diffDays = Math.ceil((prazo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  });

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user?.role === 'vendedor' ? 'Meus Projetos' : 'Dashboard de Projetos'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, {user?.nome}
            </p>
          </div>
          {(user?.role === 'vendedor' || user?.role === 'admin') && (
            <Button asChild>
              <Link to="/projetos/novo">
                <FolderPlus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-status-draft-bg">
                  <FileText className="w-5 h-5 text-status-draft" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rascunho}</p>
                  <p className="text-sm text-muted-foreground">Retornados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-status-analysis-bg">
                  <Clock className="w-5 h-5 text-status-analysis" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.emAnalise}</p>
                  <p className="text-sm text-muted-foreground">Em Análise</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-status-pending-bg">
                  <AlertCircle className="w-5 h-5 text-status-pending" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pendente}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-status-approved-bg">
                  <CheckCircle2 className="w-5 h-5 text-status-approved" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.aprovado}</p>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Projetos Recentes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/projetos">
                    Ver todos
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum projeto encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/projetos/${project.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-secondary">
                            <Building className="w-4 h-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{project.cliente_condominio_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {project.cliente_cidade}, {project.cliente_estado}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={project.status} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(project.updated_at), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Urgent / Upcoming Deadlines */}
          <div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-warning" />
                  Prazos Próximos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {urgentProjects.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum prazo urgente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentProjects.map((project) => {
                      const prazo = parseISO(project.prazo_entrega_projeto!);
                      const diffDays = Math.ceil((prazo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Link
                          key={project.id}
                          to={`/projetos/${project.id}`}
                          className="block p-3 rounded-lg border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors"
                        >
                          <p className="font-medium text-foreground text-sm">
                            {project.cliente_condominio_nome}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`}
                            {' • '}
                            {format(prazo, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions for Projetos team */}
            {user?.role === 'projetos' && (
              <Card className="shadow-card mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/projetos?status=ENVIADO">
                      <FileText className="w-4 h-4 mr-2" />
                      Novos Envios ({userProjects.filter(p => p.status === 'ENVIADO').length})
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/projetos?status=PENDENTE_INFO">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Pendentes ({stats.pendente})
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
