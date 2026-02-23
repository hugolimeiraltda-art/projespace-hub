import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { Button } from '@/components/ui/button';
import { NotificationsSidebarItem } from '@/components/NotificationsSidebarItem';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderPlus, List, Settings, LogOut, User, ClipboardList, Users, Briefcase, ShoppingCart, Package, Heart, Wrench, ChevronDown, ChevronRight, AlertTriangle, Calendar, Bot, Boxes, Percent, Brain, BookOpen, FileText } from 'lucide-react';
import emiveLogo from '@/assets/emive-logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LayoutProps {
  children: ReactNode;
}

interface NavSubItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  menuKey: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  menuKey: string;
  exact?: boolean;
  subItems?: NavSubItem[];
}

// All possible nav items - access controlled by permissions
const ALL_NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    menuKey: 'dashboard',
  },
  {
    path: '/projetos',
    label: 'Projetos',
    icon: List,
    menuKey: 'projetos',
    subItems: [
      { path: '/projetos/novo', label: 'Novo Projeto', icon: FolderPlus, menuKey: 'projetos/novo' },
      { path: '/informar-venda', label: 'Informar Nova Venda', icon: ShoppingCart, menuKey: 'projetos/informar-venda' },
      { path: '/projetos', label: 'Projetos', icon: List, menuKey: 'projetos/lista' },
    ],
  },
  {
    path: '/startup-projetos',
    label: 'Implantação',
    icon: ClipboardList,
    menuKey: 'implantacao',
  },
  {
    path: '/controle-estoque',
    label: 'Controle de Estoque',
    icon: Package,
    menuKey: 'controle-estoque',
  },
  {
    path: '/manutencao',
    label: 'Manutenção',
    icon: Wrench,
    menuKey: 'manutencao',
    subItems: [
      { path: '/manutencao/preventivas', label: 'Agendas Preventivas', icon: Calendar, menuKey: 'manutencao/preventivas' },
      { path: '/manutencao/chamados', label: 'Chamados', icon: Wrench, menuKey: 'manutencao/chamados' },
      { path: '/manutencao/pendencias', label: 'Controle de Pendências', icon: AlertTriangle, menuKey: 'manutencao/pendencias' },
    ],
  },
  {
    path: '/carteira-clientes',
    label: 'Carteira de Clientes',
    icon: Briefcase,
    menuKey: 'carteira-clientes',
  },
  {
    path: '/sucesso-cliente',
    label: 'Sucesso do Cliente',
    icon: Heart,
    menuKey: 'sucesso-cliente',
  },
  {
    path: '/orcamentos',
    label: 'Orçamentos IA',
    icon: Bot,
    menuKey: 'orcamentos',
    subItems: [
      { path: '/orcamentos', label: 'Sessões', icon: Bot, menuKey: 'orcamentos/sessoes' },
      { path: '/orcamentos/propostas', label: 'Propostas Geradas', icon: FileText, menuKey: 'orcamentos/propostas' },
      { path: '/orcamentos/produtos', label: 'Produtos e Kits', icon: Boxes, menuKey: 'orcamentos/produtos' },
      { path: '/orcamentos/regras', label: 'Regras de Preço', icon: Percent, menuKey: 'orcamentos/regras' },
      { path: '/orcamentos/kit-regras', label: 'Regras de Kits (IA)', icon: BookOpen, menuKey: 'orcamentos/kit-regras' },
    ],
  },
  {
    path: '/painel-ia',
    label: 'Painel de IA',
    icon: Brain,
    menuKey: 'painel-ia',
  },
  {
    path: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    menuKey: 'configuracoes',
  },
  {
    path: '/configuracoes/usuarios',
    label: 'Gestão de Usuários',
    icon: Users,
    menuKey: 'configuracoes/usuarios',
  },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { canAccess, loading: permsLoading } = useMenuPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    const path = window.location.pathname;
    const initial: string[] = [];
    if (path.startsWith('/projetos') || path === '/informar-venda') initial.push('/projetos');
    if (path.startsWith('/manutencao')) initial.push('/manutencao');
    if (path.startsWith('/orcamentos') || path.startsWith('/orcamento')) initial.push('/orcamentos');
    return initial;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev =>
      prev.includes(menu)
        ? prev.filter(m => m !== menu)
        : [...prev, menu]
    );
  };

  // Filter nav items based on database permissions
  const filteredNavItems = ALL_NAV_ITEMS.filter(item => {
    // While loading, show nothing except dashboard
    if (permsLoading) return item.menuKey === 'dashboard';
    return canAccess(item.menuKey);
  }).map(item => {
    // Filter sub-items too
    if (item.subItems) {
      const filteredSubs = item.subItems.filter(sub => canAccess(sub.menuKey));
      if (filteredSubs.length === 0) {
        // Parent with no accessible subs -> show as simple link if parent is accessible
        return { ...item, subItems: undefined };
      }
      return { ...item, subItems: filteredSubs };
    }
    return item;
  });

  // Remove standalone configuracoes/usuarios if configuracoes parent is already showing
  const uniqueNavItems = filteredNavItems.reduce((acc, item) => {
    // Skip configuracoes/usuarios as standalone if configuracoes parent exists with subItems
    if (item.menuKey === 'configuracoes/usuarios') {
      const parent = acc.find(i => i.menuKey === 'configuracoes');
      if (parent) return acc; // skip, will be a sub-item
    }
    // For configuracoes, add usuarios as sub-item if both are accessible
    if (item.menuKey === 'configuracoes' && canAccess('configuracoes/usuarios')) {
      const existing = filteredNavItems.find(i => i.menuKey === 'configuracoes/usuarios');
      if (existing) {
        return [...acc, {
          ...item,
          subItems: [
            { path: '/configuracoes/usuarios', label: 'Gestão de Usuários', icon: Users, menuKey: 'configuracoes/usuarios' },
          ]
        }];
      }
    }
    acc.push(item);
    return acc;
  }, [] as typeof filteredNavItems);

  const isPathActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-card">
        <div className="flex flex-col items-center px-4 py-4 border-b border-border">
          <img src={emiveLogo} alt="EMIVE Portarias Digitais" className="h-auto w-full max-w-[180px] mb-2" />
        </div>

        <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {uniqueNavItems.map(item => {
            const Icon = item.icon;

            if (item.subItems && item.subItems.length > 0) {
              const isExpanded = expandedMenus.includes(item.path);
              const isAnySubActive = item.subItems.some(sub => location.pathname === sub.path);
              const isParentActive = location.pathname === item.path;
              const shouldBeExpanded = isExpanded;

              return (
                <div key={`${item.path}-${item.label}`}>
                  <Collapsible open={shouldBeExpanded} onOpenChange={() => toggleMenu(item.path)}>
                    <div className="flex items-center">
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center flex-1 gap-3 px-3 py-2.5 rounded-l-lg text-sm font-medium transition-colors',
                          isParentActive || isAnySubActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            'px-2 py-2.5 rounded-r-lg text-sm font-medium transition-colors',
                            isParentActive || isAnySubActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          {shouldBeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                        {item.subItems.map(subItem => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                isSubActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            }

            const isActive = isPathActive(item.path, item.exact);
            return (
              <Link
                key={`${item.path}-${item.label}`}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          <NotificationsSidebarItem />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <Link to="/meu-perfil" className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary overflow-hidden">
              {user?.foto ? (
                <img src={user.foto} alt="Foto do perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-secondary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.nome}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
