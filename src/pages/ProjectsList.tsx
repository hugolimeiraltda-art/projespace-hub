import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Building, 
  Calendar,
  User,
  MapPin,
  FolderPlus,
  X,
  Rocket
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProjectStatus, STATUS_LABELS } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsList() {
  const { user } = useAuth();
  const { projects, getProjectsByUser } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>(
    (searchParams.get('status') as ProjectStatus) || 'ALL'
  );
  const [cidadeFilter, setCidadeFilter] = useState('');

  const baseProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Get unique cities for filter (filter out null/undefined/empty values)
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(baseProjects.map(p => p.cliente_cidade).filter(Boolean))];
    return uniqueCities.sort();
  }, [baseProjects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return baseProjects.filter(project => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          project.cliente_condominio_nome.toLowerCase().includes(searchLower) ||
          project.cliente_cidade.toLowerCase().includes(searchLower) ||
          project.vendedor_nome.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && project.status !== statusFilter) {
        return false;
      }

      // City filter
      if (cidadeFilter && project.cliente_cidade !== cidadeFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [baseProjects, search, statusFilter, cidadeFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCidadeFilter('');
    setSearchParams({});
  };

  const hasFilters = search || statusFilter !== 'ALL' || cidadeFilter;

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
            <p className="text-muted-foreground mt-1">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'projeto' : 'projetos'} encontrados
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

        {/* Filters */}
        <Card className="shadow-card mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por condomínio, cidade ou vendedor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'ALL')}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* City */}
              <Select value={cidadeFilter || "ALL"} onValueChange={(v) => setCidadeFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as cidades</SelectItem>
                  {cities.filter(city => city && city.trim() !== '').map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {hasFilters 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie seu primeiro projeto para começar'}
              </p>
              {(user?.role === 'vendedor' || user?.role === 'admin') && !hasFilters && (
                <Button asChild>
                  <Link to="/projetos/novo">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Criar Projeto
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projetos/${project.id}`}
                className="block"
              >
                <Card className="shadow-card hover:shadow-soft transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-secondary">
                          <Building className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            {project.numero_projeto && (
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{project.numero_projeto}</span>
                            )}
                            {project.cliente_condominio_nome}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {project.cliente_cidade}, {project.cliente_estado}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {project.vendedor_nome}
                            </span>
                            {project.prazo_entrega_projeto && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Prazo: {format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {project.sale_status === 'CONCLUIDO' && (
                          <Badge 
                            className="cursor-pointer bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/startup-projetos/${project.id}/execucao`);
                            }}
                          >
                            <Rocket className="w-3 h-3 mr-1" />
                            Em Implantação
                          </Badge>
                        )}
                        <StatusBadge status={project.status} />
                        <span className="text-sm text-muted-foreground">
                          Atualizado {format(parseISO(project.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
