import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, ChevronDown, CheckCircle2, MessageSquare, ArrowRightLeft, Headphones, Radio, FileText, Image as ImageIcon, ClipboardCheck, Download } from 'lucide-react';
import { useAttachmentUrl } from '@/hooks/useAttachmentUrl';

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
  const [docsOpen, setDocsOpen] = useState(false);
  const [arquivos, setArquivos] = useState<Array<{ nome: string; url: string; grupo: string; data?: string }>>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const { openAttachment } = useAttachmentUrl();
  const isImg = (n: string) => /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(n);

  useEffect(() => {
    (async () => {
      const [etRes, stRes, cmRes, nocRes, paRes, sfRes, ckRes] = await Promise.all([
        supabase.from('implantacao_etapas').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('project_status_history').select('from_status, to_status, reason, changed_by_user_name, created_at').eq('project_id', projectId),
        supabase.from('project_comments').select('texto, user_name, created_at').eq('project_id', projectId),
        supabase.from('implantacao_noc_chamados').select('chamado_numero, transicao_noc, opened_by_name, created_at').eq('project_id', projectId),
        supabase.from('project_attachments').select('nome_arquivo, tipo, arquivo_url, created_at').eq('project_id', projectId),
        supabase.from('sale_form_attachments').select('nome_arquivo, secao, arquivo_url, created_at').eq('project_id', projectId),
        supabase.from('implantacao_checklists').select('id, tipo, dados, fotos, observacoes, created_by_name, external_submitted_at, external_submitted_by_name, created_at, updated_at').eq('project_id', projectId),
      ]);
      const arqs: Array<{ nome: string; url: string; grupo: string; data?: string }> = [];
      paRes.data?.forEach((a: any) => a.arquivo_url && arqs.push({ nome: a.nome_arquivo, url: a.arquivo_url, grupo: a.tipo || 'Projeto', data: a.created_at }));
      sfRes.data?.forEach((a: any) => a.arquivo_url && arqs.push({ nome: a.nome_arquivo, url: a.arquivo_url, grupo: a.secao || 'Venda', data: a.created_at }));
      arqs.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      setArquivos(arqs);
      setChecklists(ckRes.data || []);
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
      <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer border-t">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documentos, Checklists e Fotos ({arquivos.length + checklists.length})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${docsOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-semibold mb-2">Checklists</p>
              {checklists.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum checklist.</p> : (
                <div className="space-y-2">
                  {checklists.map((c) => {
                    const items: any[] = c.dados?.items || [];
                    return (
                      <details key={c.id} className="rounded-md border p-3">
                        <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-primary" />
                          Checklist {c.tipo} · {items.filter((i) => i.resposta || i.checked).length}/{items.length} itens
                          <span className="text-xs text-muted-foreground font-normal">
                            {c.external_submitted_at ? `enviado por ${c.external_submitted_by_name || 'técnico'} em ${fmt(c.external_submitted_at)}` : c.created_by_name ? `por ${c.created_by_name} · ${fmt(c.updated_at || c.created_at)}` : fmt(c.updated_at || c.created_at)}
                          </span>
                        </summary>
                        <ul className="mt-3 space-y-1 text-sm">
                          {items.map((it, idx) => {
                            const r = it.resposta ?? (it.checked ? 'sim' : null);
                            return (
                              <li key={it.id || idx} className="flex justify-between gap-3 border-b border-border/50 pb-1">
                                <span>{it.label}{it.observacao ? <span className="block text-xs text-muted-foreground">Obs.: {it.observacao}</span> : null}</span>
                                <span className={`shrink-0 text-xs font-semibold ${r === 'sim' ? 'text-primary' : r === 'nao' ? 'text-destructive' : 'text-muted-foreground'}`}>{r === 'sim' ? 'Sim' : r === 'nao' ? 'Não' : '—'}</span>
                              </li>
                            );
                          })}
                        </ul>
                        {c.observacoes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">Observações: {c.observacoes}</p>}
                        {c.fotos?.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {c.fotos.map((f: string, k: number) => (
                              <a key={k} href={f} target="_blank" rel="noreferrer"><img src={f} alt={`Foto ${k + 1}`} className="h-20 w-full object-cover rounded border" /></a>
                            ))}
                          </div>
                        )}
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Documentos e fotos</p>
              {arquivos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum arquivo.</p> : (
                <ul className="divide-y rounded-md border">
                  {arquivos.map((a, i) => {
                    const Ico = isImg(a.nome) ? ImageIcon : FileText;
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 p-2">
                        <span className="flex items-center gap-2 min-w-0 text-sm">
                          <Ico className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{a.nome}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{a.grupo}{a.data ? ' · ' + fmt(a.data) : ''}</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={(e) => openAttachment(a.url, e, a.nome)}><Download className="w-3 h-3 mr-1" />Abrir</Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
