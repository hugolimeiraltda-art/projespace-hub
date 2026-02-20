import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationsSidebarItem } from '@/components/NotificationsSidebarItem';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderPlus, List, Settings, LogOut, User, ClipboardList, Users, Briefcase, ShoppingCart, Package, Heart, Wrench, ChevronDown, ChevronRight, AlertTriangle, Calendar, Bot, Boxes, Percent, Brain, BookOpen } from 'lucide-react';
import emiveLogo from '@/assets/emive-logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
  exact?: boolean;
  subItems?: { path: string; label: string; icon: typeof LayoutDashboard }[];
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/manutencao', '/projetos']);

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

  const navItems: NavItem[] = [
    // 1. Dashboard - todos
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    // 2. Projetos (agrupado) - para vendedores
    {
      path: '/projetos',
      label: 'Projetos',
      icon: List,
      roles: ['vendedor'],
      subItems: [
        { path: '/projetos/novo', label: 'Novo Projeto', icon: FolderPlus },
        { path: '/informar-venda', label: 'Informar Nova Venda', icon: ShoppingCart },
        { path: '/projetos', label: 'Meus Projetos', icon: List },
      ]
    },
    // Projetos (agrupado) - para admin e outros roles
    {
      path: '/projetos',
      label: 'Projetos',
      icon: List,
      roles: ['admin', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes'],
      subItems: [
        { path: '/projetos/novo', label: 'Novo Projeto', icon: FolderPlus },
        { path: '/informar-venda', label: 'Informar Nova Venda', icon: ShoppingCart },
        { path: '/projetos', label: 'Projetos', icon: List },
      ]
    },
    // Projetos (agrupado) - para projetos e gerente_comercial (sem novo projeto/venda)
    {
      path: '/projetos',
      label: 'Projetos',
      icon: List,
      roles: ['projetos', 'gerente_comercial'],
      exact: true
    },
    // 5. Implantação
    {
      path: '/startup-projetos',
      label: 'Implantação',
      icon: ClipboardList,
      roles: ['implantacao', 'admin', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
    },
    // 6. Controle de Estoque
    {
      path: '/controle-estoque',
      label: 'Controle de Estoque',
      icon: Package,
      roles: ['admin', 'administrativo', 'supervisor_operacoes']
    },
    // 7. Manutenção com submenus
    {
      path: '/manutencao',
      label: 'Manutenção',
      icon: Wrench,
      roles: ['admin', 'implantacao', 'administrativo', 'supervisor_operacoes'],
      subItems: [
        { path: '/manutencao/preventivas', label: 'Agendas Preventivas', icon: Calendar },
        { path: '/manutencao/chamados', label: 'Chamados', icon: Wrench },
        { path: '/manutencao/pendencias', label: 'Controle de Pendências', icon: AlertTriangle },
      ]
    },
    // 8. Carteira de Clientes
    {
      path: '/carteira-clientes',
      label: 'Carteira de Clientes',
      icon: Briefcase,
      roles: ['projetos', 'admin', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
    },
    // 9. Sucesso do Cliente
    {
      path: '/sucesso-cliente',
      label: 'Sucesso do Cliente',
      icon: Heart,
      roles: ['projetos', 'admin', 'implantacao', 'administrativo', 'sucesso_cliente']
    },
    // 10. Orçamentos por IA (admin com submenus, vendedores veem sessões próprias)
    {
      path: '/orcamentos',
      label: 'Orçamentos IA',
      icon: Bot,
      roles: ['admin', 'implantacao', 'supervisor_operacoes'],
      subItems: [
        { path: '/orcamentos', label: 'Sessões', icon: Bot },
        { path: '/orcamentos/produtos', label: 'Produtos e Kits', icon: Boxes },
        { path: '/orcamentos/regras', label: 'Regras de Preço', icon: Percent },
        { path: '/orcamentos/kit-regras', label: 'Regras de Kits (IA)', icon: BookOpen },
      ]
    },
    // Vendedores acessam suas sessões de visita
    {
      path: '/orcamentos',
      label: 'Visitas Técnicas',
      icon: Bot,
      roles: ['vendedor', 'gerente_comercial', 'supervisor_operacoes']
    },
    // 11. Painel de IA - acesso restrito por email
    ...(user?.email && ['hugo.santos@emive.com.br', 'stenio.santos@emive.com.br'].includes(user.email) ? [{
      path: '/painel-ia',
      label: 'Painel de IA',
      icon: Brain,
    }] : []),
    // 12. Configurações (inclui Gestão de Usuários)
    {
      path: '/configuracoes',
      label: 'Configurações',
      icon: Settings,
      roles: ['admin', 'administrativo']
    },
    {
      path: '/configuracoes/usuarios',
      label: 'Gestão de Usuários',
      icon: Users,
      roles: ['gerente_comercial', 'sucesso_cliente']
    }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  // Remove duplicates based on path for the same role
  const uniqueNavItems = filteredNavItems.reduce((acc, item) => {
    const existing = acc.find(i => i.path === item.path);
    if (!existing) {
      acc.push(item);
    }
    return acc;
  }, [] as typeof filteredNavItems);

  const isPathActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-card">
        {/* Logo */}
        <div className="flex flex-col items-center px-4 py-4 border-b border-border">
          <img src={emiveLogo} alt="EMIVE Portarias Digitais" className="h-auto w-full max-w-[180px] mb-2" />
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {uniqueNavItems.map(item => {
            const Icon = item.icon;
            
            // Item with submenu
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
                          {shouldBeExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
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
            
            // Regular item without submenu
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
          
          {/* Notifications in sidebar */}
          <NotificationsSidebarItem />
        </nav>

        {/* User */}
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

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
