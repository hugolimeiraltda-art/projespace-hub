export type EstoqueTipo = 'INSTALACAO' | 'MANUTENCAO' | 'URGENCIA';

export type EstoqueStatus = 'OK' | 'CRITICO' | 'SEM_BASE';

export interface LocalEstoque {
  id: string;
  cidade: 'BH' | 'VIX' | 'RIO';
  tipo: EstoqueTipo;
  nome_local: string;
  created_at: string;
}

export interface EstoqueItem {
  id: string;
  codigo: string;
  modelo: string;
  created_at: string;
  updated_at: string;
}

export interface Estoque {
  id: string;
  item_id: string;
  local_estoque_id: string;
  estoque_minimo: number;
  estoque_atual: number;
  created_at: string;
  updated_at: string;
}

export interface EstoqueImportacao {
  id: string;
  arquivo_nome: string;
  itens_importados: number;
  importado_por: string;
  created_at: string;
}

// View type for displaying stock with calculated fields
export interface EstoqueView {
  id: string;
  codigo: string;
  modelo: string;
  cidade: string;
  tipo: EstoqueTipo;
  nome_local: string;
  estoque_minimo: number;
  estoque_atual: number;
  reposicao_sugerida: number;
  status: EstoqueStatus;
}

export const ESTOQUE_TIPO_LABELS: Record<EstoqueTipo, string> = {
  INSTALACAO: 'Instalação',
  MANUTENCAO: 'Manutenção',
  URGENCIA: 'Urgência',
};

export const ESTOQUE_STATUS_LABELS: Record<EstoqueStatus, string> = {
  OK: 'OK',
  CRITICO: 'Crítico',
  SEM_BASE: 'Sem Base',
};

export const ESTOQUE_STATUS_COLORS: Record<EstoqueStatus, { bg: string; text: string }> = {
  OK: { bg: 'bg-green-100', text: 'text-green-800' },
  CRITICO: { bg: 'bg-red-100', text: 'text-red-800' },
  SEM_BASE: { bg: 'bg-gray-100', text: 'text-gray-600' },
};
