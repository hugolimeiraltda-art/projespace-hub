import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";

import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import ProjectsList from "./pages/ProjectsList";
import NewProject from "./pages/NewProject";
import EditProject from "./pages/EditProject";
import ProjectDetail from "./pages/ProjectDetail";
import SaleCompletedForm from "./pages/SaleCompletedForm";
import SaleFormView from "./pages/SaleFormView";
import InformarNovaVenda from "./pages/InformarNovaVenda";
import RevisaoVenda from "./pages/RevisaoVenda";
import ValidacaoVendaEngenharia from "./pages/ValidacaoVendaEngenharia";
import MeusChamados from "./pages/MeusChamados";
import MeuPerfil from "./pages/MeuPerfil";
import Configuracoes from "./pages/Configuracoes";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import StartupProjetos from "./pages/StartupProjetos";
import ImplantacaoExecucao from "./pages/ImplantacaoExecucao";
import ImplantacaoChecklist from "./pages/ImplantacaoChecklist";
import ImplantacaoDashboard from "./pages/ImplantacaoDashboard";
import ImplantacaoAnalytics from "./pages/ImplantacaoAnalytics";
import ImplantacaoRelatorios from "./pages/ImplantacaoRelatorios";
import ImplantacaoPagamentoInstaladores from "./pages/ImplantacaoPagamentoInstaladores";
import ImplantacaoOrcamentoSetor from "./pages/ImplantacaoOrcamentoSetor";
import ImplantacaoBancoPrestadores from "./pages/ImplantacaoBancoPrestadores";
import CarteiraClientes from "./pages/CarteiraClientes";
import CustomerDetail from "./pages/CustomerDetail";
import ControleEstoque from "./pages/ControleEstoque";
import SucessoCliente from "./pages/SucessoCliente";
import SucessoClienteDetalhe from "./pages/SucessoClienteDetalhe";
import SucessoClienteChamados from "./pages/SucessoClienteChamados";
import SucessoClienteNPS from "./pages/SucessoClienteNPS";
import SucessoClienteDepoimentos from "./pages/SucessoClienteDepoimentos";
import SucessoClienteSatisfacao from "./pages/SucessoClienteSatisfacao";
import SucessoClienteInativos from "./pages/SucessoClienteInativos";
import SucessoClienteRelatorios from "./pages/SucessoClienteRelatorios";
import SucessoClienteAtivos from "./pages/SucessoClienteAtivos";
import SucessoClientePoliticaCS from "./pages/SucessoClientePoliticaCS";
import Manutencao from "./pages/Manutencao";
import ManutencaoPreventivas from "./pages/ManutencaoPreventivas";
import ManutencaoChamados from "./pages/ManutencaoChamados";
import ManutencaoPendencias from "./pages/ManutencaoPendencias";
import ManutencaoAlertasNOC from "./pages/ManutencaoAlertasNOC";
import ManutencaoTecnicos from "./pages/ManutencaoTecnicos";
import TecnicoCertificacoes from "./pages/TecnicoCertificacoes";
import ManutencaoRelatorios from "./pages/ManutencaoRelatorios";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoChat from "./pages/OrcamentoChat";
import OrcamentoProdutos from "./pages/OrcamentoProdutos";
import OrcamentoRegras from "./pages/OrcamentoRegras";
import OrcamentoKitRegras from "./pages/OrcamentoKitRegras";
import OrcamentoPropostas from "./pages/OrcamentoPropostas";
import VendedorHome from "./pages/VendedorHome";
import VendedorChat from "./pages/VendedorChat";
import PainelIA from "./pages/PainelIA";
import IARegrasEngenharia from "./pages/IARegrasEngenharia";
import IATreinamentoDocs from "./pages/IATreinamentoDocs";
import PermissoesAcesso from "./pages/PermissoesAcesso";
import ConfiguracoesEmail from "./pages/ConfiguracoesEmail";
import NotFound from "./pages/NotFound";
import ComparacaoPlanilhas from "./pages/ComparacaoPlanilhas";

const queryClient = new QueryClient();

const getRouteMenuKey = (pathname: string): string | null => {
  if (pathname.startsWith('/carteira-clientes-ppe')) return 'carteira-clientes-ppe';
  if (pathname.startsWith('/carteira-clientes')) return 'carteira-clientes';
  if (pathname.startsWith('/startup-projetos')) return 'implantacao';
  if (pathname.startsWith('/implantacao-analytics')) return 'implantacao/analytics';
  if (pathname.startsWith('/implantacao-relatorios')) return 'implantacao/analytics';
  if (pathname.startsWith('/implantacao-pagamento-instaladores')) return 'implantacao/pagamento-instaladores';
  if (pathname.startsWith('/implantacao-orcamento-setor')) return 'implantacao/orcamento-setor';
  if (pathname.startsWith('/implantacao-banco-prestadores')) return 'implantacao/banco-prestadores';
  if (pathname.startsWith('/projetos') || pathname.startsWith('/informar-venda')) return 'projetos';
  if (pathname.startsWith('/controle-estoque')) return 'controle-estoque';
  if (pathname.startsWith('/manutencao/pendencias')) return 'manutencao/pendencias';
  if (pathname.startsWith('/manutencao/preventivas')) return 'manutencao/preventivas';
  if (pathname.startsWith('/manutencao/chamados')) return 'manutencao/chamados';
  if (pathname.startsWith('/manutencao')) return 'manutencao';
  if (pathname.startsWith('/sucesso-cliente')) return 'sucesso-cliente';
  if (pathname.startsWith('/orcamentos') || pathname.startsWith('/orcamento')) return 'orcamentos';
  if (pathname.startsWith('/painel-ia')) return 'painel-ia';
  if (pathname.startsWith('/configuracoes/usuarios')) return 'configuracoes/usuarios';
  if (pathname.startsWith('/configuracoes')) return 'configuracoes';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return null;
};

function ProtectedRoute({ children, allowPasswordChange = false, menuKey }: { children: React.ReactNode; allowPasswordChange?: boolean; menuKey?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { canAccess, loading: menuPermsLoading } = useMenuPermissions();
  const location = useLocation();
  
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

  const requiredMenuKey = menuKey ?? getRouteMenuKey(location.pathname);

  if (requiredMenuKey) {
    if (menuPermsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!canAccess(requiredMenuKey)) {
      return <Navigate to="/carteira-clientes-ppe" replace />;
    }
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
        path="/projetos/:id/formulario-venda" 
        element={<ProtectedRoute><SaleFormView /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/:id/revisao-venda" 
        element={<ProtectedRoute><RevisaoVenda /></ProtectedRoute>} 
      />
      <Route 
        path="/projetos/:id/validar-venda" 
        element={<ProtectedRoute><ValidacaoVendaEngenharia /></ProtectedRoute>} 
      />
      <Route 
        path="/informar-venda" 
        element={<ProtectedRoute><InformarNovaVenda /></ProtectedRoute>} 
      />
      <Route 
        path="/implantacao-analytics" 
        element={<ProtectedRoute><ImplantacaoAnalytics /></ProtectedRoute>} 
      />
      <Route 
        path="/implantacao-relatorios" 
        element={<ProtectedRoute><ImplantacaoRelatorios /></ProtectedRoute>} 
      />
      <Route 
        path="/implantacao-pagamento-instaladores" 
        element={<ProtectedRoute><ImplantacaoPagamentoInstaladores /></ProtectedRoute>} 
      />
      <Route 
        path="/implantacao-orcamento-setor" 
        element={<ProtectedRoute><ImplantacaoOrcamentoSetor /></ProtectedRoute>} 
      />
      <Route 
        path="/implantacao-banco-prestadores" 
        element={<ProtectedRoute><ImplantacaoBancoPrestadores /></ProtectedRoute>} 
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
        element={<ProtectedRoute><CarteiraClientes tipoCarteira="PCI" /></ProtectedRoute>} 
      />
      <Route 
        path="/carteira-clientes/:id" 
        element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} 
      />
      <Route 
        path="/carteira-clientes-ppe" 
        element={<ProtectedRoute><CarteiraClientes tipoCarteira="PPE" /></ProtectedRoute>} 
      />
      <Route 
        path="/carteira-clientes-ppe/:id" 
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
        path="/configuracoes/permissoes" 
        element={<ProtectedRoute><PermissoesAcesso /></ProtectedRoute>} 
      />
      <Route 
        path="/configuracoes/email" 
        element={<ProtectedRoute><ConfiguracoesEmail /></ProtectedRoute>} 
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
        path="/sucesso-cliente/ativos" 
        element={<ProtectedRoute><SucessoClienteAtivos /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/inativos" 
        element={<ProtectedRoute><SucessoClienteInativos /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/relatorios" 
        element={<ProtectedRoute><SucessoClienteRelatorios /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/politica-cs" 
        element={<ProtectedRoute><SucessoClientePoliticaCS /></ProtectedRoute>} 
      />
      <Route 
        path="/sucesso-cliente/cliente/:id" 
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
      <Route 
        path="/manutencao/alertas-noc" 
        element={<ProtectedRoute><ManutencaoAlertasNOC /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/tecnicos" 
        element={<ProtectedRoute><ManutencaoTecnicos /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/tecnicos/:tecnicoId/certificacoes" 
        element={<ProtectedRoute><TecnicoCertificacoes /></ProtectedRoute>} 
      />
      <Route 
        path="/manutencao/relatorios" 
        element={<ProtectedRoute><ManutencaoRelatorios /></ProtectedRoute>} 
      />
      <Route
        path="/orcamentos"
        element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamentos/produtos" 
        element={<ProtectedRoute><OrcamentoProdutos /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamentos/regras" 
        element={<ProtectedRoute><OrcamentoRegras /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamentos/kit-regras" 
        element={<ProtectedRoute><OrcamentoKitRegras /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamentos/propostas" 
        element={<ProtectedRoute><OrcamentoPropostas /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamento/:token" 
        element={<ProtectedRoute><OrcamentoChat /></ProtectedRoute>} 
      />
      <Route 
        path="/painel-ia" 
        element={<ProtectedRoute><PainelIA /></ProtectedRoute>} 
      />
      <Route 
        path="/painel-ia/regras-engenharia" 
        element={<ProtectedRoute><IARegrasEngenharia /></ProtectedRoute>} 
      />
      <Route 
        path="/painel-ia/treinamento" 
        element={<ProtectedRoute><IATreinamentoDocs /></ProtectedRoute>} 
      />
      <Route 
        path="/orcamento-visita" 
        element={<ProtectedRoute><OrcamentoChat /></ProtectedRoute>} 
      />
      {/* Vendor app - authenticated routes */}
      <Route path="/orcar" element={<ProtectedRoute><VendedorHome /></ProtectedRoute>} />
      <Route path="/orcar/chat/:sessaoId" element={<ProtectedRoute><VendedorChat /></ProtectedRoute>} />
      <Route 
        path="/comparacao-planilhas" 
        element={<ProtectedRoute><ComparacaoPlanilhas /></ProtectedRoute>} 
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
