import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function SucessoClientePoliticaCS() {
  return (
    <Layout>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Política de CS</h1>
            <p className="text-muted-foreground">Diretrizes e políticas do Sucesso do Cliente</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Política de CS</h3>
            <p className="text-muted-foreground">
              As diretrizes e políticas do Sucesso do Cliente serão exibidas aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
