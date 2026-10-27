import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, ChevronDown, CheckCircle2, MessageSquare, ArrowRightLeft, Headphones, Radio } from 'lucide-react';

interface Props { projectId: string }

interface Evento { data: string; titulo: string; detalhe?: string; tipo: 'etapa' | 'status' | 'comentario' | 'noc' | 'op' }

// Labels for the implantation milestones recorded in implantacao_etapas
const ETAPAS: Record<string, string> = {
  created_at: 'Implantação iniciada',
  contrato_assinado_at: 'Contrato assinado',
  contrato_cadastrado_at: 'Contrato cadastrado',
  ligacao_boas_vindas_at: 'Ligação de boas-vindas',
  ppe_boas_vindas_at: 'Boas-vindas (PPE)',
  cadastro_gear_at: 'Cadastro no Gear',
  sindico_app_at: 'App do síndico',
  conferencia_tags_at: 'Conferência de tags',
  check_projeto_at: 'Check do projeto',
  ppe_validar_material_at: 'Material validado (PPE)',
  ppe_confirmar_internet_at: 'Internet confirmada (PPE)',
  ppe_confirmar_ponto_eletrico_at: 'Ponto elétrico confirmado (PPE)',
  ppe_confirmar_endereco_at: 'Endereço confirmado (PPE)',
  agendamento_visita_startup_at: 'Visita de startup agendada',
  laudo_visita_startup_at: 'Laudo da visita de startup',
  laudo_instalador_at: 'Laudo do instalador',
  laudo_vidraceiro_at: 'Laudo do vidraceiro',
  laudo_serralheiro_at: 'Laudo do serralheiro',
  laudo_conclusao_supervisor_at: 'Laudo de conclusão do supervisor',
  check_programacao_at: 'Check de programação',
  confirmacao_ativacao_financeira_at: 'Ativação financeira confirmada',
  agendamento_visita_comercial_at: 'Visita comercial agendada',
  laudo_visita_comercial_at: 'Laudo da visita comercial',
  pesquisa_satisfacao_realizada_at: 'Pesquisa de satisfação realizada',
  pagamento_instalacao_conferido_at: 'Pagamento da instalação conferido',
  operacao_assistida_inicio: 'Início da Operação Assistida',
  concluido_at: 'Implantação concluída',
};

const ICONS = { etapa: CheckCircle2, status: ArrowRightLeft, comentario: MessageSquare, noc: Radio, op: Headphones };

export function HistoricoImplantacao({ projectId }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [etRes, stRes, cmRes, nocRes] = await Promise.all([
        supabase.from('implantacao_etapas').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('project_status_history').select('from_status, to_status, reason, changed_by_user_name, created_at').eq('project_id', projectId),
        supabase.from('project_comments').select('texto, user_name, created_at').eq('project_id', projectId),
        supabase.from('implantacao_noc_chamados').select('chamado_numero, transicao_noc, opened_by_name, created_at').eq('project_id', projectId),
      ]);
      const list: Evento[] = [];
      const et: any = etRes.data;
      if (et) {
        Object.entries(ETAPAS).forEach(([k, label]) => {
          if (et[k]) list.push({ data: et[k], titulo: label, tipo: k === 'operacao_assistida_inicio' ? 'op' : 'etapa' });
        });
        if (et.operacao_assistida_encerrada_at) {
          list.push({ data: et.operacao_assistida_encerrada_at, titulo: 'Operação Assistida encerrada', detalhe: et.operacao_assistida_encerrada_por ? `por ${et.operacao_assistida_encerrada_por}` : undefined, tipo: 'op' });
        }
      }
      stRes.data?.forEach((s: any) => list.push({
        data: s.created_at, tipo: 'status',
        titulo: `Status: ${s.from_status ?? '-'} → ${s.to_status}`,
        detalhe: [s.changed_by_user_name, s.reason].filter(Boolean).join(' · ') || undefined,
      }));
      cmRes.data?.forEach((c: any) => list.push({ data: c.created_at, tipo: 'comentario', titulo: `Comentário de ${c.user_name || 'usuário'}`, detalhe: c.texto }));
      nocRes.data?.forEach((n: any) => list.push({
        data: n.created_at, tipo: 'noc',
        titulo: `Chamado NOC ${n.chamado_numero ? '#' + n.chamado_numero : ''} ${n.transicao_noc ? '(' + n.transicao_noc + ')' : ''}`.trim(),
        detalhe: n.opened_by_name ? `aberto por ${n.opened_by_name}` : undefined,
      }));
      list.sort((a, b) => b.data.localeCompare(a.data));
      setEventos(list);
    })();
  }, [projectId]);

  const fmt = (d: string) => {
    try { return format(parseISO(d), d.length > 10 ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Histórico da Implantação ({eventos.length})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {eventos.map((e, i) => {
                  const Icon = ICONS[e.tipo];
                  return (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border">
                        <Icon className="w-3 h-3 text-primary" />
                      </span>
                      <p className="text-xs text-muted-foreground">{fmt(e.data)}</p>
                      <p className="text-sm font-medium">{e.titulo}</p>
                      {e.detalhe && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.detalhe}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
