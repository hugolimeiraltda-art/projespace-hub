import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  projectId: string | null;
}

const STEP_GROUPS: { title: string; steps: { key: string; label: string }[] }[] = [
  {
    title: '1. Onboarding',
    steps: [
      { key: 'contrato_assinado', label: 'Contrato Assinado' },
      { key: 'contrato_cadastrado', label: 'Contrato Cadastrado' },
      { key: 'ligacao_boas_vindas', label: 'Ligação Boas Vindas' },
      { key: 'ppe_boas_vindas', label: 'Boas Vindas PPE' },
      { key: 'ppe_validar_material', label: 'Validar Material' },
      { key: 'ppe_confirmar_endereco', label: 'Confirmar Endereço' },
      { key: 'ppe_confirmar_internet', label: 'Confirmar Internet' },
      { key: 'ppe_confirmar_ponto_eletrico', label: 'Confirmar Ponto Elétrico' },
    ],
  },
  {
    title: '2. Obra / Instalação',
    steps: [
      { key: 'laudo_visita_startup', label: 'Laudo Visita Startup' },
      { key: 'laudo_instalador', label: 'Laudo Instalador' },
    ],
  },
  {
    title: '3. Programação',
    steps: [
      { key: 'check_programacao', label: 'Check Programação' },
    ],
  },
  {
    title: '4. Financeiro',
    steps: [
      { key: 'confirmacao_ativacao_financeira', label: 'Confirmação Ativação Financeira' },
    ],
  },
];

const DATE_FIELDS: { key: string; label: string }[] = [
  { key: 'ppe_agendamento_base_data', label: '3.7 Agendamento da Base' },
  { key: 'ppe_execucao_base_data', label: '3.7 Execução da Base' },
  { key: 'agendamento_visita_startup_data', label: 'Totem (Ativação)' },
  { key: 'data_ativacao_realizada', label: 'Data Ativação Realizada' },
];

const NUM_FIELDS: { key: string; label: string }[] = [
  { key: 'ppe_totem_360_qtd', label: 'Totem 360 (qtd)' },
  { key: 'ppe_totem_360_cameras', label: 'Totem 360 (câmeras)' },
  { key: 'ppe_totem_parede_qtd', label: 'Totem Parede (qtd)' },
  { key: 'ppe_totem_parede_cameras', label: 'Totem Parede (câmeras)' },
  { key: 'ppe_totem_mini_qtd', label: 'Totem Mini (qtd)' },
  { key: 'ppe_totem_mini_cameras', label: 'Totem Mini (câmeras)' },
];

const fmtDate = (v: any) => {
  if (!v) return '—';
  try {
    return format(new Date(v), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return String(v);
  }
};
const fmtDateTime = (v: any) => {
  if (!v) return '—';
  try {
    return format(new Date(v), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return String(v);
  }
};

export function ImplantacaoHistoricoPPE({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [etapas, setEtapas] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('implantacao_etapas')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      setEtapas(data);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Este cliente não possui projeto de implantação vinculado.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!etapas) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nenhuma informação de implantação registrada para este cliente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
        Histórico da implantação (somente leitura). Dados preenchidos durante o processo de obra.
      </div>

      {/* Datas principais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {DATE_FIELDS.map(f => (
              <div key={f.key}>
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="font-medium">{fmtDate(etapas[f.key])}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totens */}
      <Card>
        <CardHeader><CardTitle className="text-base">Totens</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {NUM_FIELDS.map(f => (
              <div key={f.key}>
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="font-medium">{etapas[f.key] ?? '—'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      {STEP_GROUPS.map(group => (
        <Card key={group.title}>
          <CardHeader><CardTitle className="text-base">{group.title}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {group.steps.map(s => {
                const done = !!etapas[s.key];
                const at = etapas[`${s.key}_at`];
                return (
                  <div key={s.key} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center gap-2">
                      {done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      <span className={done ? 'font-medium' : 'text-muted-foreground'}>{s.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{done ? fmtDateTime(at) : '—'}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Observações */}
      {(etapas.ppe_observacao_onboarding || etapas.ppe_observacao_instalacao || etapas.observacoes_manutencao) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {etapas.ppe_observacao_onboarding && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Onboarding</div>
                <div className="whitespace-pre-wrap">{etapas.ppe_observacao_onboarding}</div>
              </div>
            )}
            {etapas.ppe_observacao_instalacao && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Instalação</div>
                <div className="whitespace-pre-wrap">{etapas.ppe_observacao_instalacao}</div>
              </div>
            )}
            {etapas.observacoes_manutencao && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Manutenção</div>
                <div className="whitespace-pre-wrap">{etapas.observacoes_manutencao}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
