import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones } from 'lucide-react';

interface Props { projectId: string }

const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '-');

export function OperacaoAssistidaResumo({ projectId }: Props) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('implantacao_etapas')
      .select('operacao_assistida_inicio, operacao_assistida_fim, operacao_assistida_encerrada_at, operacao_assistida_encerrada_por')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => setData(data));
  }, [projectId]);

  if (!data || (!data.operacao_assistida_inicio && !data.operacao_assistida_encerrada_at)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Headphones className="w-4 h-4" /> Operação Assistida
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-muted-foreground">Início</p><p className="font-medium">{fmt(data.operacao_assistida_inicio)}</p></div>
        <div><p className="text-muted-foreground">Término previsto</p><p className="font-medium">{fmt(data.operacao_assistida_fim)}</p></div>
        <div><p className="text-muted-foreground">Encerrada em</p><p className="font-medium">{data.operacao_assistida_encerrada_at ? fmt(data.operacao_assistida_encerrada_at) : 'Em andamento'}</p></div>
        <div><p className="text-muted-foreground">Encerrada por</p><p className="font-medium">{data.operacao_assistida_encerrada_por || '-'}</p></div>
      </CardContent>
    </Card>
  );
}
