import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectsProvider } from "@/contexts/ProjectsContext";

import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import ProjectsList from "./pages/ProjectsList";
import NewProject from "./pages/NewProject";
import EditProject from "./pages/EditProject";
import ProjectDetail from "./pages/ProjectDetail";
import SaleCompletedForm from "./pages/SaleCompletedForm";
import InformarNovaVenda from "./pages/InformarNovaVenda";
import MeusChamados from "./pages/MeusChamados";
import MeuPerfil from "./pages/MeuPerfil";
import Configuracoes from "./pages/Configuracoes";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import StartupProjetos from "./pages/StartupProjetos";
import ImplantacaoExecucao from "./pages/ImplantacaoExecucao";
import ImplantacaoChecklist from "./pages/ImplantacaoChecklist";
import CarteiraClientes from "./pages/CarteiraClientes";
import CustomerDetail from "./pages/CustomerDetail";
import ControleEstoque from "./pages/ControleEstoque";
import SucessoCliente from "./pages/SucessoCliente";
import SucessoClienteDetalhe from "./pages/SucessoClienteDetalhe";
import SucessoClienteChamados from "./pages/SucessoClienteChamados";
import SucessoClienteNPS from "./pages/SucessoClienteNPS";
import SucessoClienteDepoimentos from "./pages/SucessoClienteDepoimentos";
import SucessoClienteSatisfacao from "./pages/SucessoClienteSatisfacao";
import Manutencao from "./pages/Manutencao";
import ManutencaoPreventivas from "./pages/ManutencaoPreventivas";
import ManutencaoChamados from "./pages/ManutencaoChamados";
import ManutencaoPendencias from "./pages/ManutencaoPendencias";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowPasswordChange = false }: { children: React.ReactNode; allowPasswordChange?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force password change if required (unless we're already on the password change page)
  if (user?.must_change_password && !allowPasswordChange) {
    return <Navigate to="/alterar-senha" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/alterar-senha" 
        element={<ProtectedRoute allowPasswordChange><ChangePassword /></ProtectedRoute>} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
      <Route 
        path="/dashboard" 
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos" 
        element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/novo" 
        element={<ProtectedRoute><NewProject /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/:id" 
        element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/:id/editar" 
        element={<ProtectedRoute><EditProject /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/:id/form2" 
        element={<ProtectedRoute><SaleCompletedForm /></ProtectedRoute>} 
      />
      <Route 
        path="/informar-venda" 
        element={<ProtectedRoute><InformarNovaVenda /></ProtectedRoute>} 
      />
      <Route 
        path="/startup-projetos" 
        element={<ProtectedRoute><StartupProjetos /></ProtectedRoute>} 
      />
      <Route 
        path="/startup-projetos/:id/execucao" 
        element={<ProtectedRoute><ImplantacaoExecucao /></ProtectedRoute>} 
      />
      <Route 
        path="/startup-projetos/:id/checklist/:tipo" 
        element={<ProtectedRoute><ImplantacaoChecklist /></ProtectedRoute>} 
      />
      <Route 
        path="/carteira-clientes" 
        element={<ProtectedRoute><CarteiraClientes /></ProtectedRoute>} 
      />
      <Route 
        path="/carteira-clientes/:id" 
        element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} 
      />
      <Route 
        path="/chamados" 
        element={<ProtectedRoute><MeusChamados /></ProtectedRoute>}
      />
      <Route 
        path="/meu-perfil" 
        element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} 
      />
      <Route 
        path="/configuracoes" 
        element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} 
      />
      <Route 
        path="/configuracoes/usuarios" 
        element={<ProtectedRoute><GestaoUsuarios /></ProtectedRoute>} 
      />
      <Route 
        path="/controle-estoque" 
        element={<ProtectedRoute><ControleEstoque /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente" 
        element={<ProtectedRoute><SucessoCliente /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/chamados" 
        element={<ProtectedRoute><SucessoClienteChamados /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/nps" 
        element={<ProtectedRoute><SucessoClienteNPS /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/depoimentos" 
        element={<ProtectedRoute><SucessoClienteDepoimentos /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/satisfacao" 
        element={<ProtectedRoute><SucessoClienteSatisfacao /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/:id" 
        element={<ProtectedRoute><SucessoClienteDetalhe /></ProtectedRoute>} 
      />
      {/* Manutenção routes */}
      <Route 
        path="/manutencao" 
        element={<ProtectedRoute><Manutencao /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/preventivas" 
        element={<ProtectedRoute><ManutencaoPreventivas /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/chamados" 
        element={<ProtectedRoute><ManutencaoChamados /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/pendencias" 
        element={<ProtectedRoute><ManutencaoPendencias /></ProtectedRoute>} 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ProjectsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ProjectsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
