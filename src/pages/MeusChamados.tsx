import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Building, 
  Calendar, 
  User, 
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS, ENGINEERING_STATUS_LABELS, ProjectStatus } from '@/types/project';

export default function MeusChamados() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [engineeringFilter, setEngineeringFilter] = useState<string>('all');

  // Only admin and projetos can see this page
  if (user?.role !== 'projetos' && user?.role !== 'admin') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  // Get all projects that have been submitted (not drafts)
  const chamados = projects.filter(p => p.status !== 'RASCUNHO');

  const filteredChamados = chamados.filter(p => {
    const matchesSearch = 
      p.cliente_condominio_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vendedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_cidade.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesEngineering = engineeringFilter === 'all' || p.engineering_status === engineeringFilter;

    return matchesSearch && matchesStatus && matchesEngineering;
  });

  const getEngineeringStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors: Record<string, string> = {
      'EM_RECEBIMENTO': 'bg-status-sent-bg text-status-sent',
      'EM_PRODUCAO': 'bg-status-analysis-bg text-status-analysis',
      'CONCLUIDO': 'bg-status-approved-bg text-status-approved',
    };

    return (
      <Badge className={colors[status] || ''}>
        {ENGINEERING_STATUS_LABELS[status as keyof typeof ENGINEERING_STATUS_LABELS] || status}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Meus Chamados</h1>
          <p className="text-muted-foreground">
            Gerencie todos os projetos solicitados pelos vendedores
          </p>
        </div>

        {/* Filters */}
        <Card className="shadow-card mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por condomínio, vendedor ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status do Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'RASCUNHO').map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={engineeringFilter} onValueChange={setEngineeringFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status Engenharia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Etapas</SelectItem>
                  {Object.entries(ENGINEERING_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{chamados.length}</div>
              <div className="text-sm text-muted-foreground">Total de Chamados</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-status-sent">
                {chamados.filter(p => p.engineering_status === 'EM_RECEBIMENTO').length}
              </div>
              <div className="text-sm text-muted-foreground">Em Recebimento</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-status-analysis">
                {chamados.filter(p => p.engineering_status === 'EM_PRODUCAO').length}
              </div>
              <div className="text-sm text-muted-foreground">Em Produção</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-status-approved">
                {chamados.filter(p => p.engineering_status === 'CONCLUIDO').length}
              </div>
              <div className="text-sm text-muted-foreground">Concluídos</div>
            </CardContent>
          </Card>
        </div>

        {/* Chamados List */}
        <div className="space-y-4">
          {filteredChamados.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum chamado encontrado</p>
              </CardContent>
            </Card>
          ) : (
            filteredChamados.map(projeto => (
              <Card 
                key={projeto.id} 
                className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/projetos/${projeto.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground text-lg">
                          {projeto.cliente_condominio_nome}
                        </h3>
                        <StatusBadge status={projeto.status} />
                        {getEngineeringStatusBadge(projeto.engineering_status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{projeto.vendedor_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{projeto.cliente_cidade}, {projeto.cliente_estado}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Criado: {format(parseISO(projeto.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        {projeto.prazo_entrega_projeto && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Prazo: {format(parseISO(projeto.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                      {projeto.engineering_status === 'CONCLUIDO' && (
                        <div className="flex items-center gap-1 text-status-approved text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Projeto Concluído</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
