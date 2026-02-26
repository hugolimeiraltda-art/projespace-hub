import { TapForm, PORTARIA_VIRTUAL_LABELS, CFTV_ELEVADOR_LABELS, MODALIDADE_PORTARIA_LABELS, CROQUI_ITEM_LABELS } from '@/types/project';
import { Building, Shield, Camera, DoorOpen, Car, Radio, AlertTriangle, CheckCircle2, Info, Zap, Monitor } from 'lucide-react';

interface Props {
  tap: TapForm;
  projectName: string;
  projectCity?: string;
  projectState?: string;
  numeroUnidades?: number;
}

export function TapSummaryDescription({ tap, projectName, projectCity, projectState, numeroUnidades }: Props) {
  const unidades = tap.numero_unidades || numeroUnidades;

  // Build product type
  const modalidade = tap.modalidade_portaria ? MODALIDADE_PORTARIA_LABELS[tap.modalidade_portaria] : null;
  const portariaVirtual = PORTARIA_VIRTUAL_LABELS[tap.portaria_virtual_atendimento_app];

  // Risk factors
  const riscos: string[] = [];
  const favoraveis: string[] = [];

  if (!tap.marcacao_croqui_confirmada) riscos.push('Croqui não confirmado pelo vendedor');
  if (tap.observacao_nao_assumir_cameras) riscos.push('Não vamos assumir as câmeras existentes do condomínio');
  if (tap.cftv_elevador_possui === 'NAO_INFORMADO') riscos.push('Informação sobre CFTV de elevador não fornecida');
  if (!tap.interfonia && tap.portaria_virtual_atendimento_app === 'SIM_COM_TRANSBORDO') riscos.push('Transbordo solicitado mas interfonia não marcada');

  if (tap.marcacao_croqui_confirmada) favoraveis.push('Croqui confirmado pelo vendedor');
  if (tap.interfonia) favoraveis.push('Interfonia contemplada no projeto');
  if (unidades && unidades > 0) favoraveis.push(`${unidades} unidades mapeadas`);
  if (tap.marcacao_croqui_itens?.length > 0) favoraveis.push(`Itens de croqui definidos: ${tap.marcacao_croqui_itens.map(i => CROQUI_ITEM_LABELS[i]).join(', ')}`);

  return (
    <div className="space-y-5">
      {/* Visão Geral */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Building className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Visão Geral do Projeto</h4>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Projeto para o condomínio <strong>{projectName}</strong>
          {projectCity && `, localizado em ${projectCity}${projectState ? `/${projectState}` : ''}`}.
          {' '}O empreendimento possui <strong>{tap.numero_blocos} bloco(s)</strong>
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
          <p>
            <strong>Portaria Virtual (App):</strong> {portariaVirtual}
            {tap.portaria_virtual_atendimento_app === 'SIM_COM_TRANSBORDO' && (
              <span className="text-muted-foreground"> — chamadas redirecionam para o apartamento caso não atendidas no App.</span>
            )}
            {tap.portaria_virtual_atendimento_app === 'SIM_SEM_TRANSBORDO' && (
              <span className="text-muted-foreground"> — chamadas seguem para até 3 números de telefone cadastrados.</span>
            )}
            {tap.portaria_virtual_atendimento_app === 'NAO' && (
              <span className="text-muted-foreground"> — atendimento será feito por central de portaria ou porteiro físico.</span>
            )}
          </p>
          {tap.interfonia && (
            <p>
              <strong>Interfonia:</strong> Sim
              {tap.interfonia_tipo && <> — Tipo: <strong>{tap.interfonia_tipo}</strong></>}
              {tap.interfonia_descricao && <> ({tap.interfonia_descricao})</>}
              {tap.interfonia_alternativa && <> | Alternativa: {tap.interfonia_alternativa}</>}
            </p>
          )}
          {!tap.interfonia && <p><strong>Interfonia:</strong> Não contemplada neste projeto.</p>}
        </div>
      </section>

      {/* Ambientes e Acessos */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <DoorOpen className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">Controle de Acesso</h4>
        </div>
        <div className="text-sm text-foreground leading-relaxed space-y-1">
          {tap.controle_acessos_pedestre_descricao ? (
            <p><strong>Pedestre:</strong> {tap.controle_acessos_pedestre_descricao}</p>
          ) : (
            <p className="text-muted-foreground">Controle de acesso de pedestres não descrito.</p>
          )}
          {tap.controle_acessos_veiculo_descricao ? (
            <p><strong>Veicular:</strong> {tap.controle_acessos_veiculo_descricao}</p>
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
          {tap.cftv_dvr_descricao ? (
            <p>{tap.cftv_dvr_descricao}</p>
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
          {tap.alarme_descricao ? (
            <p>{tap.alarme_descricao}</p>
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
