import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SaleFormSummary } from '@/components/SaleFormSummary';
import { TapSummaryDescription } from '@/components/TapSummaryDescription';
import {
  TapForm,
  SaleCompletedForm,
  PORTARIA_VIRTUAL_LABELS,
  CFTV_ELEVADOR_LABELS,
  MODALIDADE_PORTARIA_LABELS,
  PortariaVirtualApp,
  CFTVElevador,
  ModalidadePortaria,
} from '@/types/project';

interface TapVendaResumoProps {
  projectId: string;
}

export function TapVendaResumo({ projectId }: TapVendaResumoProps) {
  const [tapForm, setTapForm] = useState<Record<string, unknown> | null>(null);
  const [saleForm, setSaleForm] = useState<SaleCompletedForm | null>(null);
  const [project, setProject] = useState<{ cliente_condominio_nome: string; cliente_cidade: string | null; cliente_estado: string | null; vendedor_nome: string } | null>(null);
  const [comments, setComments] = useState<Array<{ user_name: string; content: string; created_at: string; is_internal: boolean }>>([]);
  const [attachments, setAttachments] = useState<Array<{ nome_arquivo: string; tipo: string; arquivo_url?: string }>>([]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;

    const load = async () => {
      const [tapRes, saleRes, projectRes, commentsRes, attachmentsRes] = await Promise.all([
        supabase.from('tap_forms').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('sale_forms').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('projects').select('cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome').eq('id', projectId).maybeSingle(),
        supabase.from('project_comments').select('user_name, texto, created_at, is_internal').eq('project_id', projectId).order('created_at', { ascending: true }),
        supabase.from('project_attachments').select('nome_arquivo, tipo, arquivo_url').eq('project_id', projectId),
      ]);

      if (!active) return;
      if (tapRes.data) setTapForm(tapRes.data as Record<string, unknown>);
      if (saleRes.data) setSaleForm(saleRes.data as unknown as SaleCompletedForm);
      if (projectRes.data) setProject(projectRes.data as any);
      if (commentsRes.data) {
        setComments(commentsRes.data.map((c) => ({
          user_name: c.user_name,
          content: c.texto,
          created_at: c.created_at,
          is_internal: c.is_internal,
        })));
      }
      if (attachmentsRes.data) setAttachments(attachmentsRes.data);
    };

    load();
    return () => { active = false; };
  }, [projectId]);

  if (!tapForm && !saleForm) return null;

  return (
    <Collapsible className="mb-6">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Resumo do Projeto (TAP + Venda)
              <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {tapForm && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">Resumo do TAP</h3>
                <div className="mb-4">
                  <TapSummaryDescription
                    tap={tapForm as unknown as TapForm}
                    projectName={project?.cliente_condominio_nome || ''}
                    projectCity={project?.cliente_cidade || undefined}
                    projectState={project?.cliente_estado || undefined}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tapForm.portaria_virtual_atendimento_app && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Portaria Virtual</p>
                      <p className="text-sm font-medium">{PORTARIA_VIRTUAL_LABELS[tapForm.portaria_virtual_atendimento_app as PortariaVirtualApp] || String(tapForm.portaria_virtual_atendimento_app)}</p>
                    </div>
                  )}
                  {tapForm.modalidade_portaria && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Modalidade</p>
                      <p className="text-sm font-medium">{MODALIDADE_PORTARIA_LABELS[tapForm.modalidade_portaria as ModalidadePortaria] || String(tapForm.modalidade_portaria)}</p>
                    </div>
                  )}
                  {tapForm.numero_blocos != null && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Nº Blocos</p>
                      <p className="text-sm font-medium">{String(tapForm.numero_blocos)}</p>
                    </div>
                  )}
                  {tapForm.numero_unidades != null && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Nº Unidades</p>
                      <p className="text-sm font-medium">{String(tapForm.numero_unidades)}</p>
                    </div>
                  )}
                  {tapForm.interfonia != null && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Interfonia</p>
                      <p className="text-sm font-medium">{tapForm.interfonia ? 'Sim' : 'Não'}</p>
                    </div>
                  )}
                  {tapForm.cftv_elevador_possui && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">CFTV Elevador</p>
                      <p className="text-sm font-medium">{CFTV_ELEVADOR_LABELS[tapForm.cftv_elevador_possui as CFTVElevador] || String(tapForm.cftv_elevador_possui)}</p>
                    </div>
                  )}
                </div>
                {[
                  { key: 'controle_acessos_pedestre_descricao', label: 'Controle Pedestre' },
                  { key: 'controle_acessos_veiculo_descricao', label: 'Controle Veículo' },
                  { key: 'alarme_descricao', label: 'Alarme' },
                  { key: 'cftv_dvr_descricao', label: 'CFTV/DVR' },
                  { key: 'info_adicionais', label: 'Informações Adicionais' },
                ].map(({ key, label }) => {
                  const val = tapForm[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="mt-3 bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm">{String(val)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {saleForm && (
              <SaleFormSummary
                saleForm={saleForm}
                projectInfo={project ? {
                  nome: project.cliente_condominio_nome,
                  cidade: project.cliente_cidade || '',
                  estado: project.cliente_estado || '',
                  vendedor: project.vendedor_nome,
                } : undefined}
                tapForm={tapForm}
                comments={comments}
                attachments={attachments}
                projectId={projectId}
                summaryType="projeto"
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
