import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';

export default function Form2Placeholder() {
  return (
    <Layout>
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-secondary rounded-full w-fit">
              <Construction className="w-12 h-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Formulário 2 - Venda Concluída</CardTitle>
            <CardDescription className="text-base">
              Este formulário será desenvolvido em uma próxima fase
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O Formulário 2 será utilizado após a conclusão da venda e irá reaproveitar automaticamente 
              os dados já preenchidos no TAP (Termo de Abertura de Projeto).
            </p>
            <p className="text-sm text-muted-foreground">
              Funcionalidades planejadas:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Importação automática dos dados do TAP</li>
              <li>• Campos adicionais para detalhes da venda</li>
              <li>• Integração com sistema financeiro</li>
              <li>• Geração de documentos de contrato</li>
            </ul>
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
