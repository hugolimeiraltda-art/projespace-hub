import { useState, useEffect } from 'react';
import { TapForm, PORTARIA_VIRTUAL_LABELS, CFTV_ELEVADOR_LABELS, MODALIDADE_PORTARIA_LABELS, CROQUI_ITEM_LABELS } from '@/types/project';
import { Building, Shield, Camera, DoorOpen, Car, AlertTriangle, CheckCircle2, Zap, Monitor, Loader2, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  tap: TapForm;
  projectName: string;
  projectCity?: string;
  projectState?: string;
  numeroUnidades?: number;
  sessaoId?: string | null;
}

interface AIChatSummary {
  modalidade?: string;
  blocos?: number;
  unidades?: number;
  portariaVirtual?: string;
  interfonia?: { tipo?: string; descricao?: string };
  acessoPedestre?: string;
  acessoVeicular?: string;
  cftv?: string;
  alarme?: string;
  infraestrutura?: string;
  observacoes?: string[];
}

function extractSummaryFromMessages(messages: { role: string; content: string }[]): AIChatSummary {
  const summary: AIChatSummary = { observacoes: [] };
  const allText = messages.map(m => m.content).join('\n');
  const userText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const assistantText = messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n');

  // Extract modalidade
  const modalidadeMatch = allText.match(/portaria\s+(digital|remota|assistida|expressa|presencial)/i);
  if (modalidadeMatch) summary.modalidade = modalidadeMatch[1].charAt(0).toUpperCase() + modalidadeMatch[1].slice(1).toLowerCase();

  // Extract blocos - look for user responses about blocks
  const blocosPatterns = [
    /(\d+)\s*blocos?/i,
    /blocos?[:\s]*(\d+)/i,
    /são\s+(\d+)\s+blocos?/i,
    /torres?[:\s]*(\d+)/i,
    /(\d+)\s*torres?/i,
  ];
  for (const pattern of blocosPatterns) {
    const match = userText.match(pattern);
    if (match) { summary.blocos = parseInt(match[1]); break; }
  }

  // Extract unidades
  const unidadesPatterns = [
    /(\d+)\s*(?:unidades|apartamentos|aptos?|casas)/i,
    /(?:unidades|apartamentos)[:\s]*(\d+)/i,
  ];
  for (const pattern of unidadesPatterns) {
    const match = userText.match(pattern);
    if (match) { summary.unidades = parseInt(match[1]); break; }
  }

  // Extract acesso pedestre from assistant messages
  const pedsPatterns = [
    /(?:porta|acesso)\s+(?:de\s+)?pedestr[e]?[s]?.*?(?:facial|leitor|botoeira|biometria)/i,
    /(?:facial|leitor).*?(?:porta|pedestre|bloco)/i,
    /kit\s+porta\s+pedestre/i,
  ];
  const pedDescriptions: string[] = [];
  for (const msg of messages.filter(m => m.role === 'assistant')) {
    for (const pattern of pedsPatterns) {
      if (pattern.test(msg.content)) {
        // Extract the relevant sentence
        const sentences = msg.content.split(/[.!]\s+/);
        for (const s of sentences) {
          if (pattern.test(s) && s.length < 200) {
            pedDescriptions.push(s.trim());
          }
        }
      }
    }
  }
  if (pedDescriptions.length > 0) {
    summary.acessoPedestre = [...new Set(pedDescriptions)].slice(0, 3).join('. ') + '.';
  }

  // Extract acesso veicular
  const veicPatterns = [
    /(?:portão|portao|portões|portoes).*?(?:deslizante|pivotante|basculante|guilhotina|tag|facial|controle)/i,
    /(?:tag|controle\s+remoto|facial).*?(?:portão|portao|veículo|veiculo)/i,
    /kit\s+port[aã]o/i,
    /cancela/i,
  ];
  const veicDescriptions: string[] = [];
  for (const msg of messages.filter(m => m.role === 'assistant')) {
    for (const pattern of veicPatterns) {
      if (pattern.test(msg.content)) {
        const sentences = msg.content.split(/[.!]\s+/);
        for (const s of sentences) {
          if (pattern.test(s) && s.length < 200) {
            veicDescriptions.push(s.trim());
          }
        }
      }
    }
  }
  if (veicDescriptions.length > 0) {
    summary.acessoVeicular = [...new Set(veicDescriptions)].slice(0, 3).join('. ') + '.';
  }

  // Extract CFTV info
  const cftvPatterns = [
    /(\d+)\s*(?:câmeras?|cameras?)/i,
    /dvr.*?(\d+)\s*(?:ch|canais)/i,
    /kit.*?(?:câmera|camera|cftv|dvr)/i,
  ];
  const cftvDescriptions: string[] = [];
  for (const msg of messages.filter(m => m.role === 'assistant')) {
    for (const pattern of cftvPatterns) {
      if (pattern.test(msg.content)) {
        const sentences = msg.content.split(/[.!]\s+/);
        for (const s of sentences) {
          if (pattern.test(s) && s.length < 200) {
            cftvDescriptions.push(s.trim());
          }
        }
      }
    }
  }
  if (cftvDescriptions.length > 0) {
    summary.cftv = [...new Set(cftvDescriptions)].slice(0, 3).join('. ') + '.';
  }

  // Extract alarme/perímetro
  const alarmeMatch = allText.match(/(?:cerca\s+elétrica|iva|infravermelho|perímetro|perimetro).*?(\d+)\s*(?:metros|zonas)/i);
  if (alarmeMatch) {
    summary.alarme = alarmeMatch[0].trim();
  }

  // Extract interfonia
  if (/interfonia\s+digital|tdmi\s*400/i.test(allText)) {
    summary.interfonia = { tipo: 'Digital', descricao: 'Interfonia digital com TDMI 400' };
  } else if (/interfonia\s+h[ií]brida|comunic|tdmi\s*300/i.test(allText)) {
    summary.interfonia = { tipo: 'Híbrida', descricao: 'Interfonia híbrida com central analógica + ATA' };
  }

  return summary;
}

function extractFromProposal(propostaText: string): AIChatSummary {
  const summary: AIChatSummary = {};
  
  // Extract blocos
  const blocosMatch = propostaText.match(/(\d+)\s*blocos?/i);
  if (blocosMatch) summary.blocos = parseInt(blocosMatch[1]);

  // Extract unidades
  const unidadesMatch = propostaText.match(/(\d+)\s*(?:unidades|apartamentos)/i);
  if (unidadesMatch) summary.unidades = parseInt(unidadesMatch[1]);

  // Extract modalidade
  const modalidadeMatch = propostaText.match(/portaria\s+(digital|remota|assistida|expressa)/i);
  if (modalidadeMatch) summary.modalidade = modalidadeMatch[1].charAt(0).toUpperCase() + modalidadeMatch[1].slice(1).toLowerCase();

  return summary;
}

export function TapSummaryDescription({ tap, projectName, projectCity, projectState, numeroUnidades, sessaoId }: Props) {
  const [aiSummary, setAiSummary] = useState<AIChatSummary | null>(null);
  const [loading, setLoading] = useState(!!sessaoId);

  useEffect(() => {
    if (!sessaoId) return;

    (async () => {
      try {
        const [{ data: msgs }, { data: sessao }] = await Promise.all([
          supabase.from('orcamento_mensagens').select('role, content')
            .eq('sessao_id', sessaoId).order('created_at', { ascending: true }),
          supabase.from('orcamento_sessoes').select('proposta_gerada')
            .eq('id', sessaoId).single(),
        ]);

        let summary: AIChatSummary = {};

        if (msgs && msgs.length > 0) {
          summary = extractSummaryFromMessages(msgs);
        }

        // Enrich with proposal data
        if (sessao?.proposta_gerada) {
          let propostaText = sessao.proposta_gerada;
          try {
            const parsed = JSON.parse(sessao.proposta_gerada);
            propostaText = parsed.proposta || sessao.proposta_gerada;
          } catch {}
          
          const propostaSummary = extractFromProposal(propostaText);
          // Merge - proposal data takes precedence for structured fields
          if (propostaSummary.blocos && !summary.blocos) summary.blocos = propostaSummary.blocos;
          if (propostaSummary.unidades && !summary.unidades) summary.unidades = propostaSummary.unidades;
          if (propostaSummary.modalidade && !summary.modalidade) summary.modalidade = propostaSummary.modalidade;
        }

        setAiSummary(summary);
      } catch (err) {
        console.error('Error fetching AI chat summary:', err);
      }
      setLoading(false);
    })();
  }, [sessaoId]);

  // Use AI data when available, fallback to TAP
  const blocos = aiSummary?.blocos || tap.numero_blocos;
  const unidades = aiSummary?.unidades || tap.numero_unidades || numeroUnidades;
  const modalidade = aiSummary?.modalidade 
    || (tap.modalidade_portaria ? MODALIDADE_PORTARIA_LABELS[tap.modalidade_portaria] : null);
  const portariaVirtual = PORTARIA_VIRTUAL_LABELS[tap.portaria_virtual_atendimento_app];

  const acessoPedestre = aiSummary?.acessoPedestre || tap.controle_acessos_pedestre_descricao;
  const acessoVeicular = aiSummary?.acessoVeicular || tap.controle_acessos_veiculo_descricao;
  const cftvInfo = aiSummary?.cftv || tap.cftv_dvr_descricao;
  const alarmeInfo = aiSummary?.alarme || tap.alarme_descricao;
  const interfoniaInfo = aiSummary?.interfonia;

  const isFromAI = !!sessaoId;

  // Risk factors
  const riscos: string[] = [];
  const favoraveis: string[] = [];

  if (!tap.marcacao_croqui_confirmada) riscos.push('Croqui não confirmado pelo vendedor');
  if (tap.observacao_nao_assumir_cameras) riscos.push('Não vamos assumir as câmeras existentes do condomínio');
  if (tap.cftv_elevador_possui === 'NAO_INFORMADO') riscos.push('Informação sobre CFTV de elevador não fornecida');
  if (!tap.interfonia && !interfoniaInfo && tap.portaria_virtual_atendimento_app === 'SIM_COM_TRANSBORDO') {
    riscos.push('Transbordo solicitado mas interfonia não marcada');
  }

  if (tap.marcacao_croqui_confirmada) favoraveis.push('Croqui confirmado pelo vendedor');
  if (tap.interfonia || interfoniaInfo) favoraveis.push('Interfonia contemplada no projeto');
  if (unidades && unidades > 0) favoraveis.push(`${unidades} unidades mapeadas`);
  if (modalidade) favoraveis.push(`Modalidade definida: ${modalidade}`);
  if (isFromAI && aiSummary) favoraveis.push('Projeto dimensionado com assistência da IA');
  if (tap.marcacao_croqui_itens?.length > 0) {
    favoraveis.push(`Itens de croqui definidos: ${tap.marcacao_croqui_itens.map(i => CROQUI_ITEM_LABELS[i]).join(', ')}`);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando dados do chat da IA...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isFromAI && aiSummary && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
          <Bot className="h-3.5 w-3.5" />
          <span>Dados complementados automaticamente a partir da conversa com a IA de orçamentos.</span>
        </div>
      )}

      {/* Visão Geral */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Building className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Visão Geral do Projeto</h4>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Projeto para o condomínio <strong>{projectName}</strong>
          {projectCity && `, localizado em ${projectCity}${projectState ? `/${projectState}` : ''}`}.
          {' '}O empreendimento possui <strong>{blocos} bloco(s)</strong>
          {unidades ? <> e <strong>{unidades} unidades</strong></> : null}.
          {modalidade && <> A modalidade escolhida é <strong>{modalidade}</strong>.</>}
        </p>
      </section>

      {/* Tipo de Produto e Telefonia */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Produto e Telefonia</h4>
        </div>
        <div className="text-sm text-foreground leading-relaxed space-y-1">
          {modalidade && (
            <p><strong>Tipo de Produto:</strong> Portaria {modalidade}</p>
          )}
          <p>
            <strong>Portaria Virtual (App):</strong> {portariaVirtual}
            {tap.portaria_virtual_atendimento_app === 'SIM_COM_TRANSBORDO' && (
              <span className="text-muted-foreground"> — chamadas redirecionam para o apartamento caso não atendidas no App.</span>
            )}
            {tap.portaria_virtual_atendimento_app === 'SIM_SEM_TRANSBORDO' && (
              <span className="text-muted-foreground"> — chamadas seguem para até 3 números de telefone cadastrados.</span>
            )}
            {tap.portaria_virtual_atendimento_app === 'NAO' && modalidade?.toLowerCase() === 'digital' && (
              <span className="text-muted-foreground"> — sistema digital com chamada de vídeo via App.</span>
            )}
            {tap.portaria_virtual_atendimento_app === 'NAO' && modalidade?.toLowerCase() !== 'digital' && (
              <span className="text-muted-foreground"> — atendimento será feito por central de portaria ou porteiro físico.</span>
            )}
          </p>
          {(tap.interfonia || interfoniaInfo) ? (
            <p>
              <strong>Interfonia:</strong> Sim
              {interfoniaInfo?.tipo && <> — Tipo: <strong>{interfoniaInfo.tipo}</strong></>}
              {interfoniaInfo?.descricao && <> ({interfoniaInfo.descricao})</>}
              {!interfoniaInfo && tap.interfonia_tipo && <> — Tipo: <strong>{tap.interfonia_tipo}</strong></>}
              {!interfoniaInfo && tap.interfonia_descricao && <> ({tap.interfonia_descricao})</>}
            </p>
          ) : (
            <p><strong>Interfonia:</strong> Não contemplada neste projeto.</p>
          )}
        </div>
      </section>

      {/* Ambientes e Acessos */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <DoorOpen className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Controle de Acesso</h4>
        </div>
        <div className="text-sm text-foreground leading-relaxed space-y-1">
          {acessoPedestre ? (
            <p><strong>Pedestre:</strong> {acessoPedestre}</p>
          ) : (
            <p className="text-muted-foreground">Controle de acesso de pedestres não descrito.</p>
          )}
          {acessoVeicular ? (
            <p><strong>Veicular:</strong> {acessoVeicular}</p>
          ) : (
            <p className="text-muted-foreground">Controle de acesso veicular não descrito.</p>
          )}
        </div>
      </section>

      {/* CFTV */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">CFTV (Câmeras)</h4>
        </div>
        <div className="text-sm text-foreground leading-relaxed space-y-1">
          {cftvInfo ? (
            <p>{cftvInfo}</p>
          ) : (
            <p className="text-muted-foreground">Sem descrição de CFTV/DVR.</p>
          )}
          <p>
            <strong>CFTV Elevador:</strong> {CFTV_ELEVADOR_LABELS[tap.cftv_elevador_possui]}
          </p>
          {tap.observacao_nao_assumir_cameras && (
            <p className="text-amber-700 dark:text-amber-400 font-medium">
              ⚠ Não vamos assumir as câmeras existentes do condomínio.
            </p>
          )}
        </div>
      </section>

      {/* Alarme / Perímetro */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Alarme e Perímetro</h4>
        </div>
        <div className="text-sm text-foreground leading-relaxed">
          {alarmeInfo ? (
            <p>{alarmeInfo}</p>
          ) : (
            <p className="text-muted-foreground">Sem informações de alarme perimetral.</p>
          )}
        </div>
      </section>

      {/* Infraestrutura */}
      {(tap.info_custo || tap.info_cronograma || tap.info_adicionais) && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Infraestrutura e Custos</h4>
          </div>
          <div className="text-sm text-foreground leading-relaxed space-y-1">
            {tap.info_custo && <p><strong>Custo:</strong> {tap.info_custo}</p>}
            {tap.info_cronograma && <p><strong>Cronograma:</strong> {tap.info_cronograma}</p>}
            {tap.info_adicionais && <p><strong>Informações adicionais:</strong> {tap.info_adicionais}</p>}
          </div>
        </section>
      )}

      {/* Fatores de Risco e Favoráveis */}
      {(riscos.length > 0 || favoraveis.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riscos.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-400">Fatores de Risco</h4>
              </div>
              <ul className="text-sm text-amber-900 dark:text-amber-300 space-y-1">
                {riscos.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}
          {favoraveis.length > 0 && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-sm text-green-800 dark:text-green-400">Fatores Favoráveis</h4>
              </div>
              <ul className="text-sm text-green-900 dark:text-green-300 space-y-1">
                {favoraveis.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
