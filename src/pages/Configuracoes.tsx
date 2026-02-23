import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Users, FileText, Bell, ChevronRight, Shield } from 'lucide-react';

export default function Configuracoes() {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/configuracoes/usuarios">
            <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Users className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Usuários</CardTitle>
                      <CardDescription>Gerenciar usuários e permissões</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Adicione, edite e remova usuários do sistema. Defina perfis e filiais.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/configuracoes/permissoes">
            <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Shield className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Perfis de Acesso</CardTitle>
                      <CardDescription>Gerenciar permissões de menu por perfil</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure quais menus e submenus cada perfil pode acessar, com exceções por usuário.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Templates de E-mail</CardTitle>
                  <CardDescription>Personalizar templates de comunicação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em desenvolvimento. Configure os templates de e-mail padrão do sistema.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Bell className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notificações</CardTitle>
                  <CardDescription>Configurar alertas e notificações</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em desenvolvimento. Defina quando e como receber notificações sobre projetos.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Settings className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Checklists</CardTitle>
                  <CardDescription>Gerenciar checklists padrão</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em desenvolvimento. Configure os checklists padrão para cada tipo de projeto.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
