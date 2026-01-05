import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Users, FileText, Bell } from 'lucide-react';

export default function Configuracoes() {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Users className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Usuários</CardTitle>
                  <CardDescription>Gerenciar usuários e permissões</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em desenvolvimento. Aqui você poderá adicionar, editar e remover usuários do sistema.
              </p>
            </CardContent>
          </Card>

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
