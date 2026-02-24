import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { Button } from '@/components/ui/button';
import { NotificationsSidebarItem } from '@/components/NotificationsSidebarItem';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderPlus, List, Settings, LogOut, User, ClipboardList, Users, Briefcase, ShoppingCart, Package, Heart, Wrench, ChevronDown, ChevronRight, AlertTriangle, Calendar, Bot, Boxes, Percent, Brain, BookOpen, FileText, Menu, X } from 'lucide-react';
import emiveLogo from '@/assets/emive-logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleNavClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  // Filter nav items based on database permissions
  const filteredNavItems = ALL_NAV_ITEMS.filter(item => {
    if (permsLoading) return item.menuKey === 'dashboard';
    return canAccess(item.menuKey);
  }).map(item => {
    if (item.subItems) {
      const filteredSubs = item.subItems.filter(sub => canAccess(sub.menuKey));
      if (filteredSubs.length === 0) {
        return { ...item, subItems: undefined };
      }
      return { ...item, subItems: filteredSubs };
    }
    return item;
  });

  const uniqueNavItems = filteredNavItems.filter(item => item.menuKey !== 'configuracoes/usuarios');

  const isPathActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  const sidebarContent = (
    <>
      <div className="flex flex-col items-center px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between w-full">
          <img src={emiveLogo} alt="EMIVE Portarias Digitais" className="h-auto w-full max-w-[180px] mb-2" />
          {isMobile && (
            <Button variant="ghost" size="icon" className="shrink-0 -mt-2" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
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
                      onClick={handleNavClick}
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
                            onClick={handleNavClick}
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
              onClick={handleNavClick}
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
        <Link to="/meu-perfil" onClick={handleNavClick} className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
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
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Mobile top bar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <img src={emiveLogo} alt="Emive" className="h-8" />
        </header>
      )}

      {/* Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-card transition-transform duration-200',
          isMobile && !sidebarOpen && '-translate-x-full',
          isMobile && sidebarOpen && 'translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>

      <main className={cn(
        'min-h-[100dvh]',
        isMobile ? 'pt-14' : 'ml-64'
      )}>
        {children}
      </main>
    </div>
  );
}
