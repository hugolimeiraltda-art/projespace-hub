import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, ClipboardList, Copy, FileText } from 'lucide-react';
import {
  SaleCompletedForm,
  ALARME_TIPO_LABELS,
  METODO_ACIONAMENTO_LABELS,
  AlarmeTipo,
  MetodoAcionamentoPortoes,
} from '@/types/project';
import ReactMarkdown from 'react-markdown';

interface SaleFormSummaryProps {
  saleForm: SaleCompletedForm;
  projectInfo?: {
    nome: string;
    cidade: string;
    estado: string;
    vendedor: string;
  };
  tapForm?: Record<string, unknown> | null;
  comments?: Array<{ user_name: string; content: string; created_at: string; is_internal: boolean }>;
  attachments?: Array<{ nome_arquivo: string; tipo: string; arquivo_url?: string }>;
  projectId?: string;
  summaryType?: 'projeto' | 'implantacao';
}

// Field label mapping for display
const FIELD_LABELS: Record<string, string> = {
  nome_condominio: 'Nome do Condomínio',
  filial: 'Filial',
  vendedor_nome: 'Vendedor',
  vendedor_email: 'Email do Vendedor',
  qtd_apartamentos: 'Qtd. Apartamentos',
  qtd_blocos: 'Qtd. Blocos',
  produto: 'Produto',
  acesso_local_central_portaria: 'Acesso ao Local da Central',
  cabo_metros_qdg_ate_central: 'Metros de Cabo QDG→Central',
  internet_exclusiva: 'Internet Exclusiva',
  obs_central_portaria_qdg: 'Obs. Central/QDG',
  transbordo_para_apartamentos: 'Transbordo para Apartamentos',
  local_central_interfonia_descricao: 'Local Central de Interfonia',
  qtd_portas_pedestre: 'Portas Pedestre',
  qtd_portas_bloco: 'Portas Bloco',
  qtd_saida_autenticada: 'Saídas Autenticadas',
  obs_portas: 'Obs. Portas',
  qtd_portoes_deslizantes: 'Portões Deslizantes',
  qtd_portoes_pivotantes: 'Portões Pivotantes',
  qtd_portoes_basculantes: 'Portões Basculantes',
  metodo_acionamento_portoes: 'Método de Acionamento',
  qtd_dvrs_aproveitados: 'DVRs Aproveitados',
  marca_modelo_dvr_aproveitado: 'Marca/Modelo DVR',
  qtd_cameras_aproveitadas: 'Câmeras Aproveitadas',
  cftv_novo_qtd_dvr_4ch: 'DVR Novo 4ch',
  cftv_novo_qtd_dvr_8ch: 'DVR Novo 8ch',
  cftv_novo_qtd_dvr_16ch: 'DVR Novo 16ch',
  cftv_novo_qtd_total_cameras: 'Total Câmeras Novas',
  qtd_cameras_elevador: 'Câmeras de Elevador',
  acessos_tem_camera_int_ext: 'Câmera Int/Ext nos Acessos',
  alarme_tipo: 'Tipo de Alarme',
  iva_central_alarme_tipo: 'Central Alarme (IVA)',
  iva_qtd_pares_existentes: 'Pares Existentes (IVA)',
  iva_qtd_novos: 'IVAs Novos',
  iva_qtd_cabo_blindado: 'Cabo Blindado (IVA)',
  cerca_central_alarme_tipo: 'Central Alarme (Cerca)',
  cerca_qtd_cabo_centenax: 'Cabo Centenax (Cerca)',
  cerca_local_central_choque: 'Local Central de Choque',
  cerca_metragem_linear_total: 'Metragem Linear Total',
  cerca_qtd_fios: 'Qtd. Fios (Cerca)',
  possui_cancela: 'Possui Cancela',
  cancela_qtd_sentido_unico: 'Cancelas Sentido Único',
  cancela_qtd_duplo_sentido: 'Cancelas Duplo Sentido',
  cancela_aproveitada_detalhes: 'Detalhes Cancela Aproveitada',
  cancela_autenticacao: 'Autenticação Cancela',
  possui_catraca: 'Possui Catraca',
  catraca_qtd_sentido_unico: 'Catracas Sentido Único',
  catraca_qtd_duplo_sentido: 'Catracas Duplo Sentido',
  catraca_aproveitada_detalhes: 'Detalhes Catraca Aproveitada',
  catraca_autenticacao: 'Autenticação Catraca',
  possui_totem: 'Possui Totem',
  totem_qtd_simples: 'Totens Simples',
  totem_qtd_duplo: 'Totens Duplos',
  obs_gerais: 'Observações Gerais',
};

// Fields to exclude from display
const EXCLUDED_FIELDS = ['project_id', 'checklist_implantacao', 'resumo_tecnico_noc'];

// Section grouping
const SECTIONS: { title: string; fields: string[] }[] = [
  {
    title: 'Identificação',
    fields: ['nome_condominio', 'filial', 'vendedor_nome', 'vendedor_email', 'qtd_apartamentos', 'qtd_blocos', 'produto'],
  },
  {
    title: 'Infraestrutura / Central',
    fields: ['acesso_local_central_portaria', 'cabo_metros_qdg_ate_central', 'internet_exclusiva', 'obs_central_portaria_qdg'],
  },
  {
    title: 'Telefonia / Interfonia',
    fields: ['transbordo_para_apartamentos', 'local_central_interfonia_descricao'],
  },
  {
    title: 'Portas',
    fields: ['qtd_portas_pedestre', 'qtd_portas_bloco', 'qtd_saida_autenticada', 'obs_portas'],
  },
  {
    title: 'Portões',
    fields: ['qtd_portoes_deslizantes', 'qtd_portoes_pivotantes', 'qtd_portoes_basculantes', 'metodo_acionamento_portoes'],
  },
  {
    title: 'CFTV Aproveitado',
    fields: ['qtd_dvrs_aproveitados', 'marca_modelo_dvr_aproveitado', 'qtd_cameras_aproveitadas'],
  },
  {
    title: 'CFTV Novo',
    fields: ['cftv_novo_qtd_dvr_4ch', 'cftv_novo_qtd_dvr_8ch', 'cftv_novo_qtd_dvr_16ch', 'cftv_novo_qtd_total_cameras', 'qtd_cameras_elevador', 'acessos_tem_camera_int_ext'],
  },
  {
    title: 'Alarme',
    fields: ['alarme_tipo', 'iva_central_alarme_tipo', 'iva_qtd_pares_existentes', 'iva_qtd_novos', 'iva_qtd_cabo_blindado', 'cerca_central_alarme_tipo', 'cerca_qtd_cabo_centenax', 'cerca_local_central_choque', 'cerca_metragem_linear_total', 'cerca_qtd_fios'],
  },
  {
    title: 'Controle de Acesso',
    fields: ['possui_cancela', 'cancela_qtd_sentido_unico', 'cancela_qtd_duplo_sentido', 'cancela_aproveitada_detalhes', 'cancela_autenticacao', 'possui_catraca', 'catraca_qtd_sentido_unico', 'catraca_qtd_duplo_sentido', 'catraca_aproveitada_detalhes', 'catraca_autenticacao', 'possui_totem', 'totem_qtd_simples', 'totem_qtd_duplo'],
  },
  {
    title: 'Observações',
    fields: ['obs_gerais'],
  },
];

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (key === 'alarme_tipo' && typeof value === 'string') return ALARME_TIPO_LABELS[value as AlarmeTipo] || value;
  if (key === 'metodo_acionamento_portoes' && typeof value === 'string') return METODO_ACIONAMENTO_LABELS[value as MetodoAcionamentoPortoes] || value;
  if (key === 'internet_exclusiva') {
    const map: Record<string, string> = { SIM: 'Sim', NAO: 'Não', A_CONTRATAR: 'A Contratar' };
    return map[String(value)] || String(value);
  }
  if (key.includes('central_alarme_tipo')) {
    return value === 'NOVA' ? 'Nova' : value === 'APROVEITADA' ? 'Aproveitada' : String(value);
  }
  return String(value);
}

export function SaleFormSummary({ saleForm, projectInfo, tapForm, comments, attachments, projectId, summaryType = 'projeto' }: SaleFormSummaryProps) {
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);

  // Load existing summary on mount
  useEffect(() => {
    if (!projectId) return;
    const loadSummary = async () => {
      const { data } = await supabase
        .from('project_ai_summaries')
        .select('id, resumo_gerado')
        .eq('project_id', projectId)
        .eq('tipo', summaryType)
        .maybeSingle();
      if (data) {
        setAiSummary(data.resumo_gerado);
        setSummaryId(data.id);
      }
    };
    loadSummary();
  }, [projectId, summaryType]);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      // Build a clean object with only filled fields for AI
      const cleanData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(saleForm)) {
        if (EXCLUDED_FIELDS.includes(key)) continue;
        if (value === null || value === undefined || value === '' || value === 0 || value === false) continue;
        const label = FIELD_LABELS[key] || key;
        cleanData[label] = formatValue(key, value);
      }

      // Prepare TAP data with only filled fields
      let cleanTapData: Record<string, unknown> | undefined;
      if (tapForm) {
        cleanTapData = {};
        const TAP_LABELS: Record<string, string> = {
          solicitacao_origem: 'Origem da Solicitação',
          email_origem_texto: 'Texto Email Origem',
          modalidade_portaria: 'Modalidade de Portaria',
          portaria_virtual_atendimento_app: 'Portaria Virtual App',
          numero_blocos: 'Nº de Blocos',
          numero_unidades: 'Nº de Unidades',
          interfonia: 'Interfonia',
          interfonia_descricao: 'Descrição Interfonia',
          controle_acessos_pedestre_descricao: 'Controle Acesso Pedestre',
          controle_acessos_veiculo_descricao: 'Controle Acesso Veículo',
          alarme_descricao: 'Alarme',
          cftv_dvr_descricao: 'CFTV/DVR',
          cftv_elevador_possui: 'CFTV Elevador',
          observacao_nao_assumir_cameras: 'Obs. Não Assumir Câmeras',
          marcacao_croqui_confirmada: 'Croqui Confirmado',
          marcacao_croqui_itens: 'Itens do Croqui',
          info_custo: 'Info Custo',
          info_cronograma: 'Info Cronograma',
          info_adicionais: 'Informações Adicionais',
        };
        for (const [key, value] of Object.entries(tapForm)) {
          if (['id', 'project_id'].includes(key)) continue;
          if (value === null || value === undefined || value === '' || value === 0 || value === false) continue;
          const label = TAP_LABELS[key] || key;
          cleanTapData[label] = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value;
        }
        if (Object.keys(cleanTapData).length === 0) cleanTapData = undefined;
      }

      // Prepare comments (exclude internal ones)
      const publicComments = comments
        ?.filter(c => !c.is_internal)
        ?.map(c => `[${c.user_name}]: ${c.content}`) || [];

      // Prepare attachment list
      const attachmentList = attachments?.map(a => `${a.nome_arquivo} (${a.tipo})`) || [];

      // Generate signed URLs for attachments that have arquivo_url (for multimodal AI analysis)
      const attachmentSignedUrls: Array<{ url: string; nome: string; tipo: string }> = [];
      if (attachments) {
        for (const att of attachments) {
          if (!att.arquivo_url) continue;
          // Skip blob/data URLs
          if (att.arquivo_url.startsWith('blob:') || att.arquivo_url.startsWith('data:')) continue;
          
          // Extract storage path from signed URL or direct path
          let storagePath: string | null = null;
          if (att.arquivo_url.includes('/storage/v1/object/sign/')) {
            const match = att.arquivo_url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
            if (match) {
              const fullPath = decodeURIComponent(match[1]);
              const parts = fullPath.split('/');
              storagePath = parts.slice(1).join('/');
            }
          } else if (att.arquivo_url.includes('/storage/v1/object/public/')) {
            const match = att.arquivo_url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
            if (match) {
              const fullPath = decodeURIComponent(match[1]);
              const parts = fullPath.split('/');
              storagePath = parts.slice(1).join('/');
            }
          }

          if (storagePath) {
            const { data: signedData } = await supabase.storage
              .from('project-attachments')
              .createSignedUrl(storagePath, 600); // 10 min validity
            if (signedData?.signedUrl) {
              attachmentSignedUrls.push({
                url: signedData.signedUrl,
                nome: att.nome_arquivo,
                tipo: att.tipo,
              });
            }
          }
        }
      }

      // Also fetch sale_form_attachments for this project
      if (projectId) {
        const { data: saleAttachments } = await supabase
          .from('sale_form_attachments')
          .select('nome_arquivo, secao, arquivo_url')
          .eq('project_id', projectId);
        
        if (saleAttachments) {
          for (const sa of saleAttachments) {
            if (!sa.arquivo_url || sa.arquivo_url.startsWith('blob:') || sa.arquivo_url.startsWith('data:')) continue;
            
            let saPath: string | null = null;
            if (sa.arquivo_url.includes('/storage/v1/object/sign/')) {
              const match = sa.arquivo_url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
              if (match) {
                const fullPath = decodeURIComponent(match[1]);
                const parts = fullPath.split('/');
                saPath = parts.slice(1).join('/');
              }
            } else if (sa.arquivo_url.includes('/storage/v1/object/public/')) {
              const match = sa.arquivo_url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
              if (match) {
                const fullPath = decodeURIComponent(match[1]);
                const parts = fullPath.split('/');
                saPath = parts.slice(1).join('/');
              }
            }

            if (saPath) {
              const { data: signedData } = await supabase.storage
                .from('project-attachments')
                .createSignedUrl(saPath, 600);
              if (signedData?.signedUrl) {
                attachmentSignedUrls.push({
                  url: signedData.signedUrl,
                  nome: sa.nome_arquivo,
                  tipo: sa.secao,
                });
              }
            }
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-project-summary', {
        body: {
          saleFormData: cleanData,
          projectInfo,
          tapFormData: cleanTapData,
          comments: publicComments.length > 0 ? publicComments : undefined,
          attachments: attachmentList.length > 0 ? attachmentList : undefined,
          attachmentSignedUrls: attachmentSignedUrls.length > 0 ? attachmentSignedUrls : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        return;
      }

      const summary = data.summary;
      setAiSummary(summary);
      setShowReport(true);

      // Persist to database
      if (projectId) {
        if (summaryId) {
          await supabase
            .from('project_ai_summaries')
            .update({ resumo_gerado: summary })
            .eq('id', summaryId);
        } else {
          const { data: inserted } = await supabase
            .from('project_ai_summaries')
            .insert({ project_id: projectId, tipo: summaryType, resumo_gerado: summary })
            .select('id')
            .single();
          if (inserted) setSummaryId(inserted.id);
        }
      }

      toast({ title: 'Resumo gerado!', description: 'O resumo do escopo foi gerado e salvo com sucesso.' });
    } catch (err) {
      console.error('Error generating summary:', err);
      toast({ title: 'Erro', description: 'Não foi possível gerar o resumo. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      toast({ title: 'Copiado!', description: 'Resumo copiado para a área de transferência.' });
    }
  };

  // Filter sections to only show those with at least one filled field
  const filledSections = SECTIONS.map(section => {
    const filledFields = section.fields.filter(field => {
      const value = (saleForm as unknown as Record<string, unknown>)[field];
      return value !== null && value !== undefined && value !== '' && value !== 0;
    });
    return { ...section, filledFields };
  }).filter(section => section.filledFields.length > 0);

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Resumo do Escopo (IA)
          </CardTitle>
          <div className="flex items-center gap-2">
            {aiSummary && !showReport && (
              <Button variant="outline" size="sm" onClick={() => setShowReport(true)}>
                <FileText className="w-4 h-4 mr-1" />
                Ver Relatório IA
              </Button>
            )}
            {aiSummary && showReport && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopySummary}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}>
                  Ocultar
                </Button>
              </>
            )}
            <Button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              size="sm"
              variant={aiSummary ? 'outline' : 'default'}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  {aiSummary ? 'Regerar' : 'Gerar Resumo'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiSummary && showReport ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          ) : aiSummary && !showReport ? (
            <p className="text-muted-foreground text-center py-4">
              ✅ Relatório de IA disponível. Clique em "Ver Relatório IA" para visualizar.
            </p>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              Clique em "Gerar Resumo" para que a IA analise os dados do formulário e gere uma descrição do escopo do projeto.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filled Fields Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Dados do Formulário de Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {filledSections.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum campo preenchido no formulário.</p>
          ) : (
            filledSections.map((section, idx) => (
              <div key={section.title}>
                {idx > 0 && <Separator className="mb-4" />}
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{section.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.filledFields.map(field => {
                    const value = (saleForm as unknown as Record<string, unknown>)[field];
                    const formatted = formatValue(field, value);
                    if (!formatted) return null;
                    return (
                      <div key={field} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">{FIELD_LABELS[field] || field}</p>
                        <p className="text-sm font-medium text-foreground">{formatted}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
