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
import ProjectDetail from "./pages/ProjectDetail";
import SaleCompletedForm from "./pages/SaleCompletedForm";
import MeusChamados from "./pages/MeusChamados";
import MeuPerfil from "./pages/MeuPerfil";
import Configuracoes from "./pages/Configuracoes";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
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
        element={isAuthenticated ? <ChangePassword /> : <Navigate to="/login" replace />} 
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
        path="/projetos/:id/form2" 
        element={<ProtectedRoute><SaleCompletedForm /></ProtectedRoute>} 
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
