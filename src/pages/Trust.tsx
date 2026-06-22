import { Shield, Lock, Database, Mail, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Segurança & Privacidade</h1>
          </div>
          <p className="text-muted-foreground">
            Esta página é mantida pela equipe Graber Alarmes para responder dúvidas comuns
            sobre segurança e privacidade da plataforma EixoPCI. As informações aqui são
            descritivas e não representam certificação independente.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" /> Acesso e Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>O acesso à plataforma exige autenticação por e-mail e senha.</p>
            <p>
              Senhas devem ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas,
              números e caracteres especiais.
            </p>
            <p>
              Permissões são aplicadas por papel (admin, vendedor, projetos, implantação,
              sucesso do cliente, entre outros), com regras de acesso a nível de linha no
              banco de dados.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" /> Plataforma e Hospedagem
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              A aplicação é executada em infraestrutura gerenciada na nuvem com criptografia
              em trânsito (HTTPS/TLS) e em repouso fornecidas pelo provedor.
            </p>
            <p>
              Backups automáticos do banco de dados são mantidos pelo provedor de
              infraestrutura.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Dados Coletados e Uso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Coletamos apenas os dados necessários para operar a plataforma: dados de
              colaboradores, clientes, projetos, manutenções e anexos relacionados.
            </p>
            <p>
              Esses dados são usados exclusivamente para fins operacionais internos da
              Graber Alarmes e dos clientes vinculados.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" /> Retenção e Exclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Os dados são mantidos enquanto necessários ao relacionamento contratual com
              o cliente. Solicitações de exclusão podem ser encaminhadas ao contato
              indicado abaixo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" /> Contato de Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Para reportar incidentes, vulnerabilidades ou exercer direitos sobre seus
              dados, entre em contato com a equipe responsável da Graber Alarmes pelos
              canais oficiais informados em contrato.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Esta página descreve práticas atuais e não constitui certificação independente,
          garantia legal ou declaração de conformidade regulatória.
        </p>
      </div>
    </div>
  );
}
