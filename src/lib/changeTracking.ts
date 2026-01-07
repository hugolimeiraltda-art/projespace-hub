import { ProjectWithDetails } from '@/types/project';

interface OriginalTapData {
  portaria_virtual_atendimento_app?: string;
  numero_blocos?: number;
  interfonia?: boolean;
  controle_acessos_pedestre_descricao?: string;
  controle_acessos_veiculo_descricao?: string;
  alarme_descricao?: string;
  cftv_dvr_descricao?: string;
  cftv_elevador_possui?: string;
  marcacao_croqui_confirmada?: boolean;
  info_custo?: string;
  info_cronograma?: string;
  info_adicionais?: string;
}

interface OriginalData {
  cliente_condominio_nome?: string;
  cliente_cidade?: string;
  cliente_estado?: string;
  endereco_condominio?: string;
  prazo_entrega_projeto?: string;
  data_assembleia?: string;
  tap_form?: OriginalTapData | null;
}

export function getChangedFields(project: ProjectWithDetails): Set<string> {
  const changedFields = new Set<string>();
  
  if (!project.dados_originais_pre_reenvio) {
    return changedFields;
  }

  const original = project.dados_originais_pre_reenvio as OriginalData;

  // Check project fields
  if (original.cliente_condominio_nome !== undefined && original.cliente_condominio_nome !== project.cliente_condominio_nome) {
    changedFields.add('cliente_condominio_nome');
  }
  if (original.cliente_cidade !== undefined && original.cliente_cidade !== project.cliente_cidade) {
    changedFields.add('cliente_cidade');
  }
  if (original.cliente_estado !== undefined && original.cliente_estado !== project.cliente_estado) {
    changedFields.add('cliente_estado');
  }
  if (original.endereco_condominio !== undefined && original.endereco_condominio !== project.endereco_condominio) {
    changedFields.add('endereco_condominio');
  }
  if (original.prazo_entrega_projeto !== undefined && original.prazo_entrega_projeto !== project.prazo_entrega_projeto) {
    changedFields.add('prazo_entrega_projeto');
  }
  if (original.data_assembleia !== undefined && original.data_assembleia !== project.data_assembleia) {
    changedFields.add('data_assembleia');
  }

  // Check TAP form fields
  const originalTap = original.tap_form;
  const currentTap = project.tap_form;

  if (originalTap && currentTap) {
    if (originalTap.portaria_virtual_atendimento_app !== currentTap.portaria_virtual_atendimento_app) {
      changedFields.add('portaria_virtual_atendimento_app');
    }
    if (originalTap.numero_blocos !== currentTap.numero_blocos) {
      changedFields.add('numero_blocos');
    }
    if (originalTap.interfonia !== currentTap.interfonia) {
      changedFields.add('interfonia');
    }
    if (originalTap.controle_acessos_pedestre_descricao !== currentTap.controle_acessos_pedestre_descricao) {
      changedFields.add('controle_acessos_pedestre_descricao');
    }
    if (originalTap.controle_acessos_veiculo_descricao !== currentTap.controle_acessos_veiculo_descricao) {
      changedFields.add('controle_acessos_veiculo_descricao');
    }
    if (originalTap.alarme_descricao !== currentTap.alarme_descricao) {
      changedFields.add('alarme_descricao');
    }
    if (originalTap.cftv_dvr_descricao !== currentTap.cftv_dvr_descricao) {
      changedFields.add('cftv_dvr_descricao');
    }
    if (originalTap.cftv_elevador_possui !== currentTap.cftv_elevador_possui) {
      changedFields.add('cftv_elevador_possui');
    }
    if (originalTap.marcacao_croqui_confirmada !== currentTap.marcacao_croqui_confirmada) {
      changedFields.add('marcacao_croqui_confirmada');
    }
    if (originalTap.info_custo !== currentTap.info_custo) {
      changedFields.add('info_custo');
    }
    if (originalTap.info_cronograma !== currentTap.info_cronograma) {
      changedFields.add('info_cronograma');
    }
    if (originalTap.info_adicionais !== currentTap.info_adicionais) {
      changedFields.add('info_adicionais');
    }
  }

  return changedFields;
}

export function isFieldChanged(changedFields: Set<string>, fieldName: string): boolean {
  return changedFields.has(fieldName);
}
