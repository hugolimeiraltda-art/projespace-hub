import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderPlus,
  List,
  Settings,
  LogOut,
  Building2,
  User,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projetos/novo', label: 'Novo Projeto', icon: FolderPlus, roles: ['vendedor', 'admin'] },
    { path: '/projetos', label: 'Projetos', icon: List },
    { path: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-card">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Projetos</h1>
            <p className="text-xs text-muted-foreground">Portaria Digital</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
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
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary">
              <User className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.nome}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
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
