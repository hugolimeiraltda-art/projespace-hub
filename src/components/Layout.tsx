import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationsSidebarItem } from '@/components/NotificationsSidebarItem';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderPlus, List, Settings, LogOut, User, ClipboardList, Users, Briefcase, ShoppingCart, Package, Heart, Wrench } from 'lucide-react';
import emiveLogo from '@/assets/emive-logo.png';
interface LayoutProps {
  children: ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  const {
    user,
    logout
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const navItems = [{
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  }, {
    path: '/projetos/novo',
    label: 'Novo Projeto',
    icon: FolderPlus,
    roles: ['vendedor', 'admin', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
  }, {
    path: '/informar-venda',
    label: 'Informar Nova Venda',
    icon: ShoppingCart,
    roles: ['vendedor', 'admin', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
  }, {
    path: '/projetos',
    label: 'Meus Projetos',
    icon: List,
    roles: ['vendedor']
  }, {
    path: '/projetos',
    label: 'Projetos',
    icon: List,
    roles: ['projetos', 'admin', 'gerente_comercial', 'administrativo'],
    exact: true
  }, {
    path: '/startup-projetos',
    label: 'Implantação',
    icon: ClipboardList,
    roles: ['implantacao', 'admin', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
  }, {
    path: '/carteira-clientes',
    label: 'Carteira de Clientes',
    icon: Briefcase,
    roles: ['projetos', 'admin', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes']
  }, {
    path: '/sucesso-cliente',
    label: 'Sucesso do Cliente',
    icon: Heart,
    roles: ['projetos', 'admin', 'implantacao', 'administrativo', 'sucesso_cliente']
  }, {
    path: '/chamados',
    label: 'Meus Chamados',
    icon: ClipboardList,
    roles: ['projetos', 'admin', 'administrativo']
  }, {
    path: '/controle-estoque',
    label: 'Controle de Estoque',
    icon: Package,
    roles: ['admin', 'administrativo', 'supervisor_operacoes']
  }, {
    path: '/manutencao',
    label: 'Manutenção',
    icon: Wrench,
    roles: ['admin', 'implantacao', 'administrativo', 'supervisor_operacoes']
  }, {
    path: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['admin', 'administrativo']
  }, {
    path: '/configuracoes/usuarios',
    label: 'Gestão de Usuários',
    icon: Users,
    roles: ['gerente_comercial', 'administrativo', 'sucesso_cliente']
  }];
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
  return <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-card">
        {/* Logo */}
        <div className="flex flex-col items-center px-4 py-4 border-b border-border">
          <img src={emiveLogo} alt="EMIVE Portarias Digitais" className="h-auto w-full max-w-[180px] mb-2" />
          <div className="text-center">
            
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {uniqueNavItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || item.path !== '/dashboard' && !item.exact && location.pathname.startsWith(item.path);
          return <Link key={`${item.path}-${item.label}`} to={item.path} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>;
        })}
          
          {/* Notifications in sidebar */}
          <NotificationsSidebarItem />
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <Link to="/meu-perfil" className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary overflow-hidden">
              {user?.foto ? <img src={user.foto} alt="Foto do perfil" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-secondary-foreground" />}
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
    </div>;
}