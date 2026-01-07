import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Building, 
  Calendar, 
  User, 
  MapPin,
  Clock,
  CheckCircle2,
  ChevronDown,
  Hash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS, ENGINEERING_STATUS_LABELS, ProjectStatus, EngineeringStatus } from '@/types/project';

export default function MeusChamados() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
  const [selectedEngineeringStatuses, setSelectedEngineeringStatuses] = useState<EngineeringStatus[]>([]);

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
    
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
    const matchesEngineering = selectedEngineeringStatuses.length === 0 || 
      (p.engineering_status && selectedEngineeringStatuses.includes(p.engineering_status));

    return matchesSearch && matchesStatus && matchesEngineering;
  });

  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleEngineeringStatus = (status: EngineeringStatus) => {
    setSelectedEngineeringStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

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

  const availableStatuses = Object.entries(STATUS_LABELS).filter(([k]) => k !== 'RASCUNHO');
  const availableEngineeringStatuses = Object.entries(ENGINEERING_STATUS_LABELS);

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
              
              {/* Status Filter Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-56 justify-between">
                    <span>
                      {selectedStatuses.length === 0 
                        ? 'Todos os Status' 
                        : `${selectedStatuses.length} selecionado(s)`}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    {availableStatuses.map(([value, label]) => (
                      <label 
                        key={value} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded-md"
                      >
                        <Checkbox
                          checked={selectedStatuses.includes(value as ProjectStatus)}
                          onCheckedChange={() => toggleStatus(value as ProjectStatus)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                    {selectedStatuses.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedStatuses([])}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Engineering Status Filter Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-56 justify-between">
                    <span>
                      {selectedEngineeringStatuses.length === 0 
                        ? 'Todas as Etapas' 
                        : `${selectedEngineeringStatuses.length} selecionada(s)`}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    {availableEngineeringStatuses.map(([value, label]) => (
                      <label 
                        key={value} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded-md"
                      >
                        <Checkbox
                          checked={selectedEngineeringStatuses.includes(value as EngineeringStatus)}
                          onCheckedChange={() => toggleEngineeringStatus(value as EngineeringStatus)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                    {selectedEngineeringStatuses.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedEngineeringStatuses([])}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
                        {projeto.numero_projeto && (
                          <span className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            <Hash className="w-3 h-3" />
                            {projeto.numero_projeto}
                          </span>
                        )}
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