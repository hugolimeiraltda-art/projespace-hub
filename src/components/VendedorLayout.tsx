import emiveLogo from '@/assets/emive-logo.png';
import { LogOut, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface VendedorLayoutProps {
  children: React.ReactNode;
  vendedorNome?: string;
  onLogout?: () => void;
}

export function VendedorLayout({ children, vendedorNome, onLogout }: VendedorLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => {
            const token = localStorage.getItem('vendedor_token');
            if (token) navigate(`/vendedor/${token}`);
          }}
        >
          <img src={emiveLogo} alt="Emive" className="h-8" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Visita Técnica</h1>
            <p className="text-xs text-muted-foreground">Emive Portaria Digital</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {vendedorNome && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, <span className="font-medium text-foreground">{vendedorNome}</span>
            </span>
          )}
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-1" />Sair
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
