import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX } from 'lucide-react';

export default function SucessoClienteInativos() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes Inativos</h1>
          <p className="text-muted-foreground">Gestão de clientes inativos e churn</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-muted-foreground" />
              Clientes Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nenhum cliente inativo registrado.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
